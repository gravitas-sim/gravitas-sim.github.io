// =============================================================================
// Getting an experiment out of the browser
// -----------------------------------------------------------------------------
// Two files, because two different people read them.
//
// The CSV is for the student and whoever marks them. One row per aligned
// sample, a `run` column saying whether it came from A or B, and a unit in
// every column name. It opens in a spreadsheet, it groups by run in pandas,
// and nothing about it needs a legend.
//
// The JSON manifest is for reproducing the experiment. It carries the
// definition and the provenance - scenario, seed, integrator, timestep, units,
// the hash of the initial state, which objects and metrics were chosen, what
// changed between the runs, and which build of Gravitas produced it - and
// deliberately not the recorded samples. A manifest small enough to paste into
// a lab report is worth more than one that carries a megabyte of numbers the
// CSV already has.
//
// The CSV field escaping comes from js/csv.js, the same leaf module the
// trajectory export uses: a spreadsheet that reads a leading `-` as a formula
// is a bug worth fixing once, in one place.
// =============================================================================

import { csvField } from '../csv.js';
import { METRIC_UNITS, SCALAR_METRICS } from './metrics.js';
import { canonicalJson } from './canonicalState.js';

/** The manifest format, versioned separately from the storage schema. */
export const MANIFEST_VERSION = 1;

/**
 * The combined CSV: both runs, aligned, one row per sample per run.
 *
 * Long format rather than one column per run. A wide file is easier to eyeball
 * and worse for everything else: it cannot carry two runs with different
 * sample counts without padding, and every plotting library wants the long
 * form anyway.
 *
 * @param {Object} experiment - The experiment record
 * @param {Object} [opts]
 * @param {number} [opts.maxRows] - Stop after this many data rows
 * @returns {{csv:string, rows:number, truncated:boolean}} The document
 */
export function experimentCsv(experiment, { maxRows = 200000 } = {}) {
  const metrics = experiment?.metrics || [];
  const seriesMetrics = metrics.filter(m => !SCALAR_METRICS.has(m));

  const header = ['experiment', 'run', 't_days'];
  for (const m of seriesMetrics) {
    header.push(`${m}_${unitSuffix(m)}`);
  }

  const rows = [header];
  let truncated = false;

  for (const label of ['A', 'B']) {
    const run = experiment?.runs?.[label];
    if (!run || !Array.isArray(run.samples)) continue;
    for (const sample of run.samples) {
      if (rows.length > maxRows) {
        truncated = true;
        break;
      }
      const line = [experiment.name || experiment.id, label, round(sample.t)];
      for (const m of seriesMetrics) {
        line.push(round(sample[m]));
      }
      rows.push(line);
    }
    if (truncated) break;
  }

  const csv = `${rows.map(r => r.map(csvField).join(',')).join('\r\n')}\r\n`;
  return { csv, rows: rows.length - 1, truncated };
}

/** Column-name suffix for a metric's unit. @param {string} m - Metric id @returns {string} Suffix */
function unitSuffix(m) {
  const unit = METRIC_UNITS[m] || '';
  return (
    {
      AU: 'au',
      'km/s': 'kms',
      days: 'days',
      '%': 'pct',
      sim: 'simunits',
    }[unit] || 'value'
  );
}

/** Six significant figures, or empty for a gap. @param {*} v - Value @returns {string|number} Rounded */
function round(v) {
  if (!Number.isFinite(v)) return '';
  return Number(v.toPrecision(6));
}

/**
 * The manifest: everything needed to say what this experiment was.
 *
 * Provenance is not decoration. An experiment exported without its seed, its
 * integrator and its timestep cannot be repeated, and one exported without a
 * build version cannot be explained when it stops repeating because the
 * physics changed underneath it.
 *
 * @param {Object} experiment - The experiment record
 * @param {Object} [opts]
 * @param {string} [opts.appVersion] - Build identifier
 * @returns {Object} The manifest, ready to stringify
 */
export function experimentManifest(experiment, { appVersion = 'dev' } = {}) {
  const p = experiment?.provenance || {};
  const diff = experiment?.diff || { variables: [], incidental: [] };
  return {
    format: 'gravitas-experiment',
    version: MANIFEST_VERSION,
    exported: new Date().toISOString(),
    app: { version: appVersion },
    experiment: {
      id: experiment?.id || '',
      name: experiment?.name || '',
      created: experiment?.created || null,
      notes: experiment?.notes || '',
    },
    provenance: {
      scenario: p.scenario ?? null,
      seed: p.seed ?? null,
      integrator: p.integrator ?? null,
      timestep: p.timestep ?? null,
      simSpeed: p.simSpeed ?? null,
      units: p.units || { length: 'AU', speed: 'km/s', time: 'days' },
      initialStateHash: p.initialStateHash ?? null,
      referenceFrame: p.referenceFrame ?? null,
      observer: p.observer ?? null,
    },
    selection: {
      objects: experiment?.objects || [],
      primary: experiment?.primary ?? null,
      metrics: experiment?.metrics || [],
    },
    // The initial state itself, so the manifest reproduces the setup without
    // the CSV. It is the same payload a share link carries.
    initialState: experiment?.initialState ?? null,
    parameterChange: {
      variables: diff.variables || [],
      incidental: diff.incidental || [],
      context: diff.context || [],
      multivariable: Boolean(diff.multivariable),
      confirmed: Boolean(experiment?.multivariableConfirmed),
    },
    runs: ['A', 'B']
      .filter(label => experiment?.runs?.[label])
      .map(label => ({
        run: label,
        samples: experiment.runs[label].samples?.length || 0,
        recordedAt: experiment.runs[label].recordedAt || null,
        simulatedSeconds: runSpan(experiment.runs[label]),
        results: experiment.runs[label].results || null,
      })),
    comparison: experiment?.comparison || null,
  };
}

/** Simulated seconds a recorded run covers. @param {Object} run - A run @returns {number} Seconds */
function runSpan(run) {
  const s = run?.samples;
  if (!Array.isArray(s) || s.length < 2) return 0;
  return Number((s[s.length - 1].t - s[0].t).toPrecision(9));
}

/**
 * The manifest as text, with stable key order.
 *
 * Sorted keys so two exports of the same experiment diff cleanly, which is
 * what makes a manifest worth committing beside a lab report.
 *
 * @param {Object} experiment - The experiment record
 * @param {Object} [opts] - As experimentManifest
 * @returns {string} Pretty-printed JSON
 */
export function experimentManifestJson(experiment, opts) {
  const manifest = experimentManifest(experiment, opts);
  // Round-trip through the canonical serializer for key order, then re-indent
  // so a person can read it.
  return JSON.stringify(JSON.parse(canonicalJson(manifest)), null, 2) + '\n';
}

/**
 * A filesystem-safe stem for the two files.
 * @param {Object} experiment - The experiment record
 * @returns {string} Filename stem
 */
export function exportBasename(experiment) {
  const name = (experiment?.name || 'experiment')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  return `gravitas-${name || 'experiment'}`;
}

/**
 * Read an exported manifest back.
 *
 * Reopening locally means a student can hand an experiment to a partner as a
 * file. The recorded samples are not in the manifest, so what comes back is
 * the definition and the setup: enough to re-run it, not enough to fake having
 * run it.
 *
 * @param {string} text - File contents
 * @returns {{ok:boolean, experiment:Object|null, reason:string}} The import
 */
export function importManifest(text) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, experiment: null, reason: 'not-json' };
  }
  if (parsed?.format !== 'gravitas-experiment') {
    return { ok: false, experiment: null, reason: 'not-an-experiment' };
  }
  if (Number(parsed.version) > MANIFEST_VERSION) {
    return { ok: false, experiment: null, reason: 'from-a-newer-version' };
  }
  return {
    ok: true,
    reason: '',
    experiment: {
      name: parsed.experiment?.name || 'Imported experiment',
      notes: parsed.experiment?.notes || '',
      created: Date.now(),
      objects: parsed.selection?.objects || [],
      primary: parsed.selection?.primary ?? null,
      metrics: parsed.selection?.metrics || [],
      initialState: parsed.initialState ?? null,
      provenance: parsed.provenance || {},
      diff: parsed.parameterChange || { variables: [], incidental: [] },
      multivariableConfirmed: Boolean(parsed.parameterChange?.confirmed),
      runs: {},
    },
  };
}
