// =============================================================================
// The seams between the three analysis systems
// -----------------------------------------------------------------------------
// The experiment runner writes a gravitas.experiment-result/1, the Observatory
// holds a gravitas.observation/1 and the inference core fits one, the analysis
// lab writes a gravitas.analysis/1, and the notebook keeps evidence. Each was
// complete alone and none could hand its result to another. This module is the
// adapters, and nothing else; every one is pure data in, data out:
//
//   resultToObservation   an experiment's result as an observation table, one
//                         row per setting, that opens in the Observatory and
//                         that the inference core reads (js/inference/infer.js
//                         dataFrom takes its x, its mean and its error)
//   observationArtifact   that table as a gravitas.artifact/1 envelope, and
//   artifactObservation   the envelope back as the table: the round trip
//   experimentArtifact    an experiment result, as an envelope
//   analysisArtifact      a sweep analysis, as an envelope
//   fitArtifact           a fit (a gravitas.inference/1 with its results), as
//                         an envelope
//   readAnalysis          a saved gravitas.analysis/1 sweep analysis, checked,
//                         for the analysis lab to open again
//
// Every envelope names the digest of what it was made from: the trials for an
// experiment and its analysis, the rows a fit read. The notebook cites an
// envelope by that digest (js/notebook/artifactEntry.js), so a report says
// which data a number came from and a reader can check it.
//
// What the observation holds, per setting and metric: the mean of the trials
// that finished, its standard error (the `uncertainty` column), the edges of
// the 95% Student-t interval for the mean (the `lower` and `upper` columns, as
// offsets from the mean, as GWOSC's catalog states its intervals), the spread
// of the trials, and how many finished. A trial that did not finish is
// counted, never averaged (the sweep's rule, js/experiments/sweep.js); a
// setting where no trial finished for any metric is left out and named in the
// observation's reductions. The simulation's output is origin `model`: this is
// not an observation of the sky, and the Observatory says so.
//
// What the envelope holds is what the observation holds without its display
// names: ids, units, values, intervals, the source and its digest. The round
// trip is exact in those, and `title` and the column names come back as ids
// unless the caller names them again.
//
// Pure: no DOM, no state. Browser, Worker and Node alike. A lazy module: the
// analysis lab and the Observatory's fit panel import it, nothing at start-up.
// =============================================================================

import { canonicalJson, fnvHex8 } from '../hash.js';
import { LEVEL, describe, meanInterval } from './stats.js';
import { artifact, validateArtifact } from '../platform/artifact.js';
import { readVersioned } from '../platform/common.js';
import { unitIdOf } from '../units/registry.js';

export const RESULT_FORMAT = 'gravitas.experiment-result';
export const ANALYSIS_FORMAT = 'gravitas.analysis';
export const OBSERVATION_FORMAT = 'gravitas.observation';

/** Statuses that finished with a number, in the result format's own word. */
const OK = 'ok';

/** The most quantities a notebook envelope holds (the notebook's own limit). */
export const NOTEBOOK_QUANTITIES = 40;

export class SeamError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'SeamError';
    this.code = code;
  }
}

const finite = v => (Number.isFinite(v) ? v : NaN);
const orNull = v => (Number.isFinite(v) ? v : null);

/** A unit as the registry spells it, or null when it does not know it. */
export function unitId(unit) {
  if (unit === null || unit === undefined) return null;
  if (unit === '') return '';
  return unitIdOf(unit) ?? null;
}

/** The digest of the trials a result holds: what an analysis consumed. */
export function trialsDigest(result) {
  return fnvHex8(canonicalJson(result?.trials ?? []));
}

/** The digest of the rows a fit read (./infer.js dataFrom). */
export function rowsDigest(data) {
  return fnvHex8(
    canonicalJson({
      x: Array.from(data?.x ?? []),
      y: Array.from(data?.y ?? []),
      sigma: data?.sigma ? Array.from(data.sigma) : null,
    })
  );
}

// --- Experiment result -> observation -------------------------------------------

/**
 * The summaries of an experiment result: for each setting and metric, how many
 * trials finished and what they gave.
 * @param {object} result - A gravitas.experiment-result/1
 * @param {string[]} [only] - Metrics to keep (default: all the result has)
 * @returns {{params: string[], metrics: string[], rows: object[],
 *   dropped: number}}
 */
export function summaries(result, only) {
  const m = result?.manifest;
  if (
    result?.format !== RESULT_FORMAT ||
    !Array.isArray(m?.vary) ||
    !m.vary.length ||
    !Array.isArray(result.trials)
  )
    throw new SeamError('notAResult', 'this is not an experiment result');
  const params = m.vary.map(v => v.parameter);
  const have = m.observables?.metrics ?? [];
  const metrics = only?.length ? have.filter(x => only.includes(x)) : have;
  if (!metrics.length) throw new SeamError('noMetric', 'it has no such metric');
  const cells = new Map();
  for (const tr of result.trials) {
    const key = params.map(k => tr.params?.[k]).join('|');
    if (!cells.has(key))
      cells.set(key, {
        params: Object.fromEntries(params.map(k => [k, tr.params?.[k]])),
        values: Object.fromEntries(metrics.map(x => [x, []])),
      });
    for (const x of metrics) {
      const v = tr.results?.[x];
      if (tr.status === OK && Number.isFinite(v))
        cells.get(key).values[x].push(v);
    }
  }
  const rows = [];
  let dropped = 0;
  const order = [...cells.values()].sort((a, b) => {
    for (const k of params)
      if (a.params[k] !== b.params[k]) return a.params[k] - b.params[k];
    return 0;
  });
  for (const c of order) {
    const by = {};
    let any = false;
    for (const x of metrics) {
      const d = describe(c.values[x]);
      const ci = meanInterval(d);
      by[x] = {
        n: d.n,
        mean: finite(d.mean ?? NaN),
        sd: finite(d.sd ?? NaN),
        lo: finite(ci?.lo ?? NaN),
        hi: finite(ci?.hi ?? NaN),
      };
      if (d.n) any = true;
    }
    if (any) rows.push({ params: c.params, by });
    else dropped++;
  }
  return { params, metrics, rows, dropped };
}

/**
 * The table, from summaries and what names them. The one builder both
 * directions use, so a table that went through an envelope is the table that
 * went in.
 */
function tableFrom(spec) {
  const { params, metrics, rows, hash, digest, engine, names = {} } = spec;
  const nameOf = (group, id) => names[group]?.[id] ?? id;
  const columns = params.map(k => ({
    id: `param:${k}`,
    name: nameOf('params', k),
    unit: null,
    role: 'x',
    values: Float64Array.from(rows, r => r.params[k]),
  }));
  for (const x of metrics) {
    const unit = spec.units?.[x] ?? null;
    const name = nameOf('metrics', x);
    const col = (id, role, label, pick, extra = {}) => ({
      id: `${id}:${x}`,
      name: `${name}, ${label}`,
      unit,
      role,
      ...extra,
      values: Float64Array.from(rows, r => pick(r.by[x])),
    });
    const mean = `mean:${x}`;
    columns.push(
      { ...col('mean', 'value', 'mean', b => b.mean), name },
      col(
        'se',
        'uncertainty',
        'standard error',
        b => (b.n >= 2 ? b.sd / Math.sqrt(b.n) : NaN),
        { of: mean }
      ),
      col('lo', 'lower', 'lower', b => b.lo - b.mean, {
        of: mean,
        level: LEVEL,
      }),
      col('hi', 'upper', 'upper', b => b.hi - b.mean, {
        of: mean,
        level: LEVEL,
      }),
      col('sd', 'value', 'spread of the trials', b => b.sd),
      {
        id: `n:${x}`,
        name: `${name}, trials that finished`,
        unit: '',
        role: 'value',
        values: Float64Array.from(rows, r => r.by[x].n),
      }
    );
  }
  const reductions = [
    `Each row is one setting: the mean of the trials that finished, its standard error, and the 95% Student t interval for the mean as offsets from it. Gravitas computed every number from the experiment's recorded manifest.`,
    ...(spec.dropped
      ? [`${spec.dropped} setting(s) with no finished trial are not listed.`]
      : []),
  ];
  return {
    format: OBSERVATION_FORMAT,
    formatVersion: 1,
    kind: 'table',
    id: `experiment:${hash}`,
    title: spec.title || `Experiment ${hash}`,
    object: null,
    facility: 'Gravitas experiment runner',
    origin: 'model',
    source: {
      kind: 'experiment',
      id: hash,
      version: null,
      digest,
      engine: engine ?? null,
    },
    credit: 'Computed by Gravitas from the experiment manifest it records',
    license: {
      status: 'generated',
      statement:
        'Output of the Gravitas engine; the manifest in the source experiment is its method.',
    },
    retrieved: spec.retrieved ?? null,
    citations: [],
    reductions,
    columns,
    axes: { x: columns[0].id, y: `mean:${metrics[0]}` },
    masks: [],
    annotations: [],
  };
}

/**
 * An experiment result as a gravitas.observation/1 table.
 * @param {object} result - A gravitas.experiment-result/1
 * @param {{metrics?: string[], metricUnits?: Record<string, string>,
 *   names?: {params?: object, metrics?: object}, title?: string}} [o]
 *   `metricUnits` is js/experiments/metrics.js METRIC_UNITS, handed over so
 *   this module does not import the engine's metrics
 * @returns {object} The observation; validateObservation() judges it
 */
export function resultToObservation(result, o = {}) {
  const s = summaries(result, o.metrics);
  const hash = String(result.hash ?? fnvHex8(canonicalJson(result.manifest)));
  return tableFrom({
    ...s,
    hash,
    digest: trialsDigest(result),
    engine: result.engine?.fingerprint,
    units: Object.fromEntries(
      s.metrics.map(x => [x, unitId(o.metricUnits?.[x])])
    ),
    names: o.names,
    title: o.title ?? result.manifest?.title,
    retrieved: typeof result.finishedAt === 'string' ? result.finishedAt : null,
  });
}

/**
 * The table as the JSON file the Observatory opens: a gravitas.observation/1
 * with every number a number and a missing one null, which its reader reads
 * back as missing (js/observatory/import.js).
 * @param {object} obs - From resultToObservation
 * @returns {string} Two-space indented JSON with a final newline
 */
export function observationText(obs) {
  const plain = {
    ...obs,
    columns: obs.columns.map(c => ({
      ...c,
      values: Array.from(c.values, v => orNull(v)),
    })),
  };
  return `${JSON.stringify(plain, null, 2)}\n`;
}

// --- Observation <-> envelope ---------------------------------------------------

/**
 * A table made by resultToObservation as a gravitas.artifact/1 envelope: for
 * each setting and metric the mean with its interval, the spread and the
 * count. Values are the observation's own numbers; only what is not a finite
 * number (a spread of one trial) is absent.
 * @param {object} obs - From resultToObservation
 * @returns {object} The envelope; validateArtifact() judges it
 */
export function observationArtifact(obs) {
  if (obs?.source?.kind !== 'experiment')
    throw new SeamError('notAnExperiment', 'this table is not an experiment');
  const col = id => obs.columns.find(c => c.id === id);
  const paramCols = obs.columns.filter(c => c.id.startsWith('param:'));
  const params = paramCols.map(c => c.id.slice(6));
  const metrics = obs.columns
    .filter(c => c.id.startsWith('mean:'))
    .map(c => c.id.slice(5));
  const rowsN = obs.columns[0].values.length;
  const quantities = [];
  for (const x of metrics) {
    const mean = col(`mean:${x}`);
    const unit = mean.unit;
    for (let i = 0; i < rowsN; i++) {
      const at = params
        .map((k, j) => `${k}=${paramCols[j].values[i]}`)
        .join('|');
      const m = mean.values[i];
      const lo = m + col(`lo:${x}`).values[i];
      const hi = m + col(`hi:${x}`).values[i];
      const sd = col(`sd:${x}`).values[i];
      const n = col(`n:${x}`).values[i];
      if (Number.isFinite(m))
        quantities.push({
          id: `${x}|${at}`,
          value: m,
          unit,
          uncertainty:
            Number.isFinite(lo) && Number.isFinite(hi)
              ? { kind: 'interval', lo, hi, level: LEVEL, basis: 'data' }
              : { kind: 'none' },
          origin: 'synthetic',
        });
      if (Number.isFinite(sd))
        quantities.push({
          id: `${x}.sd|${at}`,
          value: sd,
          unit,
          uncertainty: { kind: 'none' },
          origin: 'derived',
        });
      quantities.push({
        id: `${x}.n|${at}`,
        value: n,
        unit: '',
        uncertainty: { kind: 'none' },
        origin: 'derived',
      });
    }
  }
  return artifact({
    id: obs.id,
    made: obs.source.engine ? { engineFingerprint: obs.source.engine } : {},
    source: {
      kind: 'experiment',
      id: obs.source.id,
      digest: obs.source.digest,
    },
    provenance: {
      ...(obs.retrieved ? { retrieved: obs.retrieved } : {}),
      reductions: obs.reductions,
    },
    quantities,
  });
}

/**
 * The table an experiment envelope describes: the inverse of
 * observationArtifact.
 * @param {object} env - A gravitas.artifact/1 whose source is an experiment
 * @param {{names?: object, title?: string}} [o]
 * @returns {object} The observation
 */
export function artifactObservation(env, o = {}) {
  const problems = validateArtifact(env);
  if (problems.length)
    throw new SeamError(
      'notAnEnvelope',
      `${problems[0].path} ${problems[0].message}`
    );
  if (env.source.kind !== 'experiment')
    throw new SeamError(
      'notAnExperiment',
      'this envelope is not an experiment'
    );
  const params = [];
  const metrics = [];
  const units = {};
  const rows = new Map();
  for (const q of env.quantities) {
    const [head, ...at] = q.id.split('|');
    const dot = head.lastIndexOf('.');
    const kind = dot > 0 ? head.slice(dot + 1) : 'mean';
    const metric = dot > 0 ? head.slice(0, dot) : head;
    if (!metrics.includes(metric)) metrics.push(metric);
    if (kind === 'mean') units[metric] = q.unit;
    const p = Object.fromEntries(
      at.map(pair => {
        const eq = pair.indexOf('=');
        const key = pair.slice(0, eq);
        if (!params.includes(key)) params.push(key);
        return [key, Number(pair.slice(eq + 1))];
      })
    );
    const key = at.join('|');
    if (!rows.has(key)) rows.set(key, { params: p, by: {} });
    const by = (rows.get(key).by[metric] ??= {
      n: 0,
      mean: NaN,
      sd: NaN,
      lo: NaN,
      hi: NaN,
    });
    if (kind === 'n') by.n = q.value;
    else if (kind === 'sd') by.sd = q.value;
    else {
      by.mean = q.value;
      if (q.uncertainty.kind === 'interval') {
        by.lo = q.uncertainty.lo;
        by.hi = q.uncertainty.hi;
      }
    }
  }
  const list = [...rows.values()];
  for (const r of list)
    for (const x of metrics)
      r.by[x] ??= { n: 0, mean: NaN, sd: NaN, lo: NaN, hi: NaN };
  if (!list.length || !metrics.length || !params.length)
    throw new SeamError('empty', 'the envelope holds no settings');
  return tableFrom({
    params,
    metrics,
    rows: list,
    dropped: 0,
    hash: env.source.id,
    digest: env.source.digest,
    engine: env.made?.engineFingerprint,
    units,
    names: o.names,
    title: o.title,
    retrieved: env.provenance?.retrieved ?? null,
  });
}

/**
 * An experiment result as an envelope: the table, then the envelope.
 * @param {object} result - A gravitas.experiment-result/1
 * @param {object} [o] - As resultToObservation
 */
export function experimentArtifact(result, o = {}) {
  return observationArtifact(resultToObservation(result, o));
}

// --- Analysis -> envelope -----------------------------------------------------

const interval = (v, ci, basis = 'data') =>
  ci && Number.isFinite(ci.lo) && Number.isFinite(ci.hi)
    ? { kind: 'interval', lo: ci.lo, hi: ci.hi, level: LEVEL, basis }
    : { kind: 'none' };

/**
 * A sweep analysis (js/analysis/sweepAnalysis.js) as an envelope: each
 * setting's mean and median with their intervals, the trend's slope, the rank
 * correlation and the share of the scatter the setting explains. Its warnings
 * are carried by their codes, as data; the reader's language is the report's.
 * @param {object} a - A gravitas.analysis/1 of kind sweep
 * @param {{metricUnits?: Record<string, string>}} [o]
 * @returns {object} The envelope
 */
export function analysisArtifact(a, o = {}) {
  if (a?.format !== ANALYSIS_FORMAT || a.kind !== 'sweep')
    throw new SeamError('notAnalysis', 'this is not a sweep analysis');
  const metric = a.options.metric;
  const unit = unitId(o.metricUnits?.[metric]);
  const keys = a.design.axes.map(x => x.parameter);
  const at = c => keys.map(k => `${k}=${c.params[k]}`).join('|');
  const quantities = [];
  const add = (id, value, u, uncertainty, origin = 'derived') => {
    if (Number.isFinite(value))
      quantities.push({ id, value, unit: u, uncertainty, origin });
  };
  for (const c of a.cells) {
    add(
      `mean|${at(c)}`,
      c.mean,
      unit,
      interval(c.mean, c.meanInterval),
      'synthetic'
    );
    add(
      `median|${at(c)}`,
      c.median,
      unit,
      interval(c.median, c.medianInterval)
    );
  }
  const tr = a.sensitivity?.trend;
  if (tr)
    add(
      'slope',
      tr.slope,
      null,
      Number.isFinite(tr.se)
        ? { kind: 'sigma', sigma: tr.se, basis: 'data' }
        : { kind: 'none' }
    );
  const rho = a.sensitivity?.spearman;
  if (rho) add('rho', rho.rho, '', interval(rho.rho, rho));
  add('eta2', a.shares?.eta2, '', { kind: 'none' });
  return artifact({
    id: `analysis:${a.source?.hash}:${metric}:${a.options.seed}`,
    made: a.engine?.fingerprint
      ? { engineFingerprint: a.engine.fingerprint }
      : {},
    source: {
      kind: 'analysis',
      id: a.tool.id,
      version: a.tool.version,
      digest: a.consumed?.[0]?.digest,
    },
    quantities,
    warnings: (a.warnings ?? []).map(w => w.code),
  });
}

// --- Fit -> envelope --------------------------------------------------------------

/**
 * A fit as an envelope: each fitted and fixed parameter and each derived
 * quantity, with its standard error (the one scaled by the reduced chi-square
 * when the fit says it is too small, and its basis says so).
 * @param {object} doc - A gravitas.inference/1 with `results.fit`
 * @param {{digest: string, units?: {x?: string, y?: string}}} o - The digest
 *   of the rows it read (rowsDigest), and the data columns' units, which the
 *   model's `d` and `m/s` take
 * @returns {object} The envelope
 */
export function fitArtifact(doc, o = {}) {
  const fit = doc?.results?.fit;
  if (!fit) throw new SeamError('notAFit', 'this document holds no fit');
  const unitFor = p =>
    p.unit === 'd'
      ? (o.units?.x ?? null)
      : p.unit === 'm/s'
        ? (o.units?.y ?? null)
        : p.unit;
  const quantities = [];
  const warnings = [];
  for (const p of [...fit.parameters, ...(fit.derived ?? [])]) {
    if (!Number.isFinite(p.value)) continue;
    const u = unitId(unitFor(p));
    if (u === null && unitFor(p) !== null) warnings.push(`unit:${p.name}`);
    const scaled = Number.isFinite(p.sigmaScaled);
    const sigma = scaled ? p.sigmaScaled : p.sigma;
    quantities.push({
      id: p.name,
      value: p.value,
      unit: u,
      uncertainty:
        p.mode !== 'fixed' && Number.isFinite(sigma) && sigma >= 0
          ? { kind: 'sigma', sigma, basis: scaled ? 'scaled' : 'data' }
          : { kind: 'none' },
      origin:
        p.mode === 'derived'
          ? 'derived'
          : p.mode === 'fixed'
            ? 'fixed'
            : 'fitted',
    });
  }
  const values = canonicalJson(quantities.map(q => [q.id, q.value]));
  return artifact({
    id: `fit:${doc.model.id}:${fnvHex8(values)}`,
    made: doc.engine?.fingerprint
      ? { engineFingerprint: doc.engine.fingerprint }
      : {},
    source: {
      kind: 'inference',
      id: doc.model.id,
      version: doc.model.version,
      digest: o.digest,
    },
    quantities,
    warnings: [...warnings, ...(fit.warnings ?? []).map(w => w.code)],
  });
}

// --- Reading an analysis the lab wrote ----------------------------------------------

/**
 * A saved sweep analysis, checked: the format and version through the one
 * reader rule, the kind, and the parts the lab draws from.
 * @param {unknown} doc - Parsed JSON
 * @returns {{ok: true, analysis: object, notes: string[]} |
 *   {ok: false, reason: string, message: string}}
 */
export function readAnalysis(doc) {
  const r = readVersioned(doc, { format: ANALYSIS_FORMAT, current: 1 });
  if (!r.ok) return r;
  const a = r.doc;
  if (a.kind !== 'sweep')
    return {
      ok: false,
      reason: 'kind',
      message: `it is a ${a.kind ?? 'unnamed'} analysis, and the lab opens sweep analyses`,
    };
  const has = (v, t) =>
    t === 'array' ? Array.isArray(v) : v && typeof v === 'object';
  const missing = [
    ['options', 'object'],
    ['design', 'object'],
    ['source', 'object'],
    ['cells', 'array'],
    ['pooled', 'object'],
    ['sensitivity', 'object'],
    ['shares', 'object'],
    ['warnings', 'array'],
  ].find(([k, t]) => !has(a[k], t));
  if (missing || !Array.isArray(a.design.axes) || !a.options.metric)
    return {
      ok: false,
      reason: 'shape',
      message: `it has no usable ${missing?.[0] ?? 'design'}`,
    };
  return { ok: true, analysis: a, notes: r.notes };
}
