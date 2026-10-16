// =============================================================================
// The model-versus-data comparison (Roadmap II, Prompt 85)
// -----------------------------------------------------------------------------
// One observation, one model source, and what lies between them: the model's
// value at every row the data have, the residuals, chi-square, and a summary of
// where the model over- or under-predicts. COMPARE_INSTRUMENT.md is the
// reading guide; this module is the arithmetic.
//
// Three kinds of model source, one contract:
//
//   system    a star and planets (js/forward/system.js), observed through the
//             forward model of Prompt 84 at the data's own epochs
//   inference a gravitas.inference result: its model, its fitted and fixed
//             values and its settings, evaluated at the data's epochs
//   analytic  a named model of js/inference/models.js and the parameter values
//             written down for it
//
// What this module never does is fit. Nothing is searched, and no linear
// parameter (a baseline, a zero point) is solved for: each is a stated value,
// and says so. A parameter is reported as fitted only when the source says a
// fit made it (an inference result), fixed when a fit held it, derived when it
// follows from the others, and assumed when the model was given it. The one
// quantity a student moves by hand stays what it was, with `moved` beside it.
//
// The objective is the one the inference core fits (js/inference/fit.js):
// chi-square with the stated uncertainties, or, when the data have none, the
// sum of squared residuals in the data's own unit. `m2lnL` is -2 ln L for
// independent Gaussian errors with those uncertainties.
//
// Pure: no DOM. Browser, Worker and Node alike.
// =============================================================================

import { dataFrom } from '../inference/infer.js';
import { MODELS } from '../inference/models.js';
import { runForward } from '../forward/index.js';
import { conversionFactor, parseUnit } from '../observatory/units.js';
import { ELEMENTS } from './system.js';

export const COMPARISON_VERSION = '1.0.0';
export const SOURCE_TYPES = Object.freeze(['system', 'inference', 'analytic']);

/** The forward models a system source can be observed through. */
export const SYSTEM_MODELS = Object.freeze({
  transit: {
    instrument: 'photometer',
    unit: '',
    elements: [
      'periodDays',
      'epochDays',
      'e',
      'omegaDeg',
      'meanAnomalyDeg',
      'radiusEarth',
      'inclinationDeg',
      'starMassSun',
      'starRadiusSun',
      'baselineFlux',
    ],
  },
  'radial-velocity': {
    instrument: 'spectrograph',
    unit: 'm/s',
    elements: [
      'periodDays',
      'epochDays',
      'e',
      'omegaDeg',
      'meanAnomalyDeg',
      'massEarth',
      'inclinationDeg',
      'starMassSun',
      'systemicKmS',
    ],
  },
});

/** The most epochs one comparison evaluates through a forward model. */
export const MAX_ROWS = 100_000;

const QUANT = 1e6;
const quantise = v => Math.round(v * QUANT) / QUANT;
const interior = v => Number.isFinite(v);

/** Refuse in words; the page shows `message`. */
export class CompareError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'CompareError';
    this.code = code;
  }
}

/** The factor from a model's own unit to the data's, or a refusal. */
function unitFactor(fromText, dataUnit) {
  const from = parseUnit(fromText).unit;
  const to = parseUnit(dataUnit).unit;
  if (!to)
    throw new CompareError(
      'unit',
      'the data column states no unit, so a model in physical units cannot be laid over it'
    );
  try {
    return conversionFactor(from ?? { id: '', scale: 1 }, to);
  } catch (e) {
    throw new CompareError('unit', e.message);
  }
}

/**
 * A system source's values at the data's epochs, through its forward model.
 * @returns {{values: Float64Array, parameters: Array<object>}}
 */
function evaluateSystem(source, data) {
  const spec = SYSTEM_MODELS[source.model];
  if (!spec)
    throw new CompareError(
      'model',
      `a system is observed through ${Object.keys(SYSTEM_MODELS).join(' or ')}, not "${source.model}"`
    );
  if (!(data.perDay > 0))
    throw new CompareError(
      'time',
      'the time column does not state a unit of time, so the model cannot be placed on it'
    );
  const days = Float64Array.from(data.x, t => t / data.perDay);
  if (days.length > MAX_ROWS)
    throw new CompareError(
      'size',
      `a system is evaluated at up to ${MAX_ROWS} epochs; this series has ${days.length}`
    );
  let start = Infinity;
  for (const d of days) start = Math.min(start, d);
  // The setup observes at the data's own epochs, listed from the first; a
  // listed setup is sorted and de-duplicated, so values are matched back by
  // their offsets rather than by position.
  const offsets = [...new Set(Array.from(days, d => quantise(d - start)))].sort(
    (a, b) => a - b
  );
  if (offsets.length < 2)
    throw new CompareError('size', 'the model needs at least two epochs');
  const setup = {
    format: 'gravitas.observing-setup',
    formatVersion: 1,
    seed: 'compare',
    epochs: { kind: 'listed', unit: 'd', start, list: offsets },
    exposure: { time: source.exposureDays ?? 0, supersample: 1 },
    instrument: { kind: spec.instrument },
  };
  const obs = runForward(source.model, source.state, setup);
  const time = obs.columns.find(c => c.id === 'time').values;
  const value = obs.columns.find(c => c.id === 'value').values;
  const byOffset = new Map();
  for (let k = 0; k < time.length; k++)
    byOffset.set(Math.round((time[k] - start) * QUANT), value[k]);
  const factor = unitFactor(spec.unit, data.units.y);
  const values = Float64Array.from(days, d => {
    const v = byOffset.get(Math.round(quantise(d - start) * QUANT));
    return v === undefined ? NaN : v * factor;
  });
  const status = source.status ?? {};
  const pl = source.planet ?? 0;
  const parameters = [];
  for (const id of spec.elements) {
    const el = ELEMENTS[id];
    parameters.push({
      id,
      name: id,
      value: el.get(source.state, pl),
      unit: el.unit,
      status: status[id] ?? 'assumed',
      moved: Boolean(source.moved?.includes(id)),
    });
  }
  for (const t of obs.synthetic.truth.parameters)
    if (!t.id.includes('.') || pl === 0)
      parameters.push({
        id: `derived:${t.id}`,
        name: t.name,
        value: t.value,
        unit: t.unit,
        status: 'derived',
        moved: false,
      });
  return {
    values,
    parameters,
    modelId: source.model,
    version: obs.synthetic.forwardModel.version,
  };
}

/** Evaluate a named analytic model with stated values. */
function evaluateNamed(model, values, linear, settings, data, status, modes) {
  const m = MODELS[model.id];
  const shape = m.predict(values, data.x, settings);
  let out = shape;
  const lin = { ...linear };
  if (m.id === 'transit-quadratic') {
    const f0 = lin.f0 ?? 1;
    out = shape.map(s => f0 * s);
    lin.f0 = f0;
  } else if (m.id === 'rv-keplerian') {
    const gamma =
      typeof lin.gamma === 'number' ? lin.gamma : (lin.gamma?.[0] ?? 0);
    out = shape.map(s => s + gamma);
    lin.gamma = gamma;
  }
  const parameters = m.parameters.map(p => ({
    id: p.name,
    name: p.label,
    value: values[p.name],
    unit: p.unit,
    status: modes?.[p.name] ?? status?.[p.name] ?? 'assumed',
    moved: false,
  }));
  for (const l of m.linear)
    parameters.push({
      id: l.name,
      name: l.label,
      value: lin[l.name],
      unit: l.unit,
      status: modes?.[l.name] ?? status?.[l.name] ?? 'assumed',
      moved: false,
    });
  return { values: out, parameters, modelId: m.id, version: m.version };
}

function evaluateAnalytic(source, data) {
  const m = MODELS[source.model];
  if (!m)
    throw new CompareError(
      'model',
      `no named model "${source.model}"; there are ${Object.keys(MODELS).join(', ')}`
    );
  const given = source.parameters ?? {};
  const missing = m.parameters.filter(p => !interior(given[p.name]));
  if (missing.length)
    throw new CompareError(
      'parameters',
      `the model needs a value for ${missing.map(p => p.name).join(', ')}`
    );
  return evaluateNamed(
    m,
    given,
    source.linear ?? {},
    source.settings ?? {},
    data,
    source.status
  );
}

function evaluateInference(source, data) {
  const doc = source.result;
  const fit = doc?.results?.fit ?? doc?.results;
  const m = MODELS[doc?.model?.id];
  if (!m || !fit?.parameters)
    throw new CompareError(
      'result',
      'this is not an inference result with a fit'
    );
  const values = {};
  const modes = {};
  for (const p of fit.parameters) {
    values[p.name] = p.value;
    modes[p.name] = p.mode === 'fixed' ? 'fixed' : 'fitted';
  }
  for (const l of m.linear) modes[l.name] = 'fitted';
  const out = evaluateNamed(
    m,
    values,
    fit.linear ?? {},
    doc.settings ?? {},
    data,
    null,
    modes
  );
  for (const p of out.parameters) {
    const f = fit.parameters.find(q => q.name === p.id);
    if (f && Number.isFinite(f.sigma)) p.sigma = f.sigma;
  }
  out.fitted =
    fit.parameters.filter(p => p.mode === 'fitted').length + m.linear.length;
  return out;
}

/** The residual pattern: where the model sits above or below the data. */
export function summariseResiduals(data, residual, bins = 5) {
  const n = residual.length;
  const order = Array.from({ length: n }, (_, i) => i).sort(
    (a, b) => data.x[a] - data.x[b] || a - b
  );
  const k = Math.min(bins, Math.max(1, Math.floor(n / 3)));
  const out = [];
  for (let b = 0; b < k; b++) {
    const rows = order.slice(
      Math.floor((b * n) / k),
      Math.floor(((b + 1) * n) / k)
    );
    if (!rows.length) continue;
    let sum = 0;
    let sig = 0;
    let sq = 0;
    for (const i of rows) {
      sum += residual[i];
      sq += residual[i] * residual[i];
      sig += data.sigma ? data.sigma[i] : 0;
    }
    const mean = sum / rows.length;
    const scale = data.sigma ? sig / rows.length : Math.sqrt(sq / rows.length);
    const se = scale / Math.sqrt(rows.length);
    // The data minus the model: negative where the model is above the data.
    const sense = Math.abs(mean) <= 2 * se ? 'ok' : mean < 0 ? 'over' : 'under';
    out.push({
      from: data.x[rows[0]],
      to: data.x[rows[rows.length - 1]],
      n: rows.length,
      mean,
      se,
      sense,
    });
  }
  let longest = 0;
  let run = 0;
  let prev = 0;
  for (const i of order) {
    const s = Math.sign(residual[i]);
    run = s !== 0 && s === prev ? run + 1 : 1;
    prev = s;
    longest = Math.max(longest, run);
  }
  return {
    bins: out,
    longestRun: longest,
    structured: out.some(b => b.sense !== 'ok'),
  };
}

/**
 * Lay a model over an observation.
 * @param {object} observation - gravitas.observation/1
 * @param {object} source - { kind: 'system' | 'inference' | 'analytic', ... }
 * @param {{x?: string, y?: string, sigma?: string|null}} [columns]
 * @returns {object} The comparison; see the fields below
 * @throws {CompareError} In words, when the pair cannot be compared
 */
export function compareModel(observation, source, columns = {}) {
  if (!source || !SOURCE_TYPES.includes(source.kind))
    throw new CompareError(
      'source',
      `a model source is one of ${SOURCE_TYPES.join(', ')}`
    );
  if (observation?.kind !== 'time-series' && observation?.kind !== 'table')
    throw new CompareError('kind', 'only a series or a table can be compared');
  const data = dataFrom(observation, columns);
  if (!data.x.length)
    throw new CompareError('empty', 'the data have no usable row');
  const ev =
    source.kind === 'system'
      ? evaluateSystem(source, data)
      : source.kind === 'inference'
        ? evaluateInference(source, data)
        : evaluateAnalytic(source, data);
  const n = data.x.length;
  const model = ev.values;
  const residual = new Float64Array(n);
  const normalised = data.sigma ? new Float64Array(n) : null;
  let objective = 0;
  let logTerm = 0;
  let sum = 0;
  let maxAbs = 0;
  let skipped = 0;
  for (let i = 0; i < n; i++) {
    if (!interior(model[i])) {
      residual[i] = NaN;
      if (normalised) normalised[i] = NaN;
      skipped++;
      continue;
    }
    residual[i] = data.y[i] - model[i];
    sum += residual[i];
    maxAbs = Math.max(maxAbs, Math.abs(residual[i]));
    if (data.sigma) {
      normalised[i] = residual[i] / data.sigma[i];
      objective += normalised[i] * normalised[i];
      logTerm += Math.log(2 * Math.PI * data.sigma[i] * data.sigma[i]);
    } else objective += residual[i] * residual[i];
  }
  const used = n - skipped;
  const kept = [...residual]
    .map((v, i) => (interior(v) ? i : -1))
    .filter(i => i >= 0);
  const fitted =
    ev.fitted ?? ev.parameters.filter(p => p.status === 'fitted').length;
  const dof = Math.max(1, used - fitted);
  const weighted = Boolean(data.sigma);
  const rms = Math.sqrt(
    kept.reduce((a, i) => a + residual[i] * residual[i], 0) / Math.max(1, used)
  );
  const pattern = summariseResiduals(
    {
      x: Float64Array.from(kept, i => data.x[i]),
      sigma: data.sigma ? Float64Array.from(kept, i => data.sigma[i]) : null,
    },
    Float64Array.from(kept, i => residual[i])
  );
  return {
    version: COMPARISON_VERSION,
    source: { kind: source.kind, id: ev.modelId, version: ev.version },
    data: {
      rows: data.rows,
      counts: data.counts,
      columns: data.columns,
      units: data.units,
      weighted,
    },
    x: data.x,
    y: data.y,
    sigma: data.sigma,
    model,
    residual,
    normalised,
    parameters: ev.parameters,
    objective: {
      name: weighted ? 'chi-square' : 'sum of squares',
      value: objective,
      m2lnL: weighted ? objective + logTerm : null,
    },
    chi2: weighted ? objective : null,
    n: used,
    skipped,
    fitted,
    dof,
    reducedChi2: weighted ? objective / dof : null,
    mean: used ? sum / used : NaN,
    rms,
    maxAbs,
    pattern,
  };
}
