// The summary of an ensemble: what the trials that gave numbers say, through the
// statistics kernel (Prompt 154, STATISTICS.md), and what they cannot say.
//
//   mean       Student's t interval of the mean (studentInterval)
//   median     the median, with a case-bootstrap percentile interval on the named
//              stream stream('experiments', seed, 'bootstrap', metric) (caseBootstrap,
//              percentileInterval): the rule is draw d takes n uniforms in turn,
//              index = floor(u * n)
//   quantiles  0.05, 0.25, 0.5, 0.75, 0.95 by linear interpolation of the sorted
//              values
//   outcomes   the count and share of each outcome class
//   counts     every status; a trial without a number is counted and left out
//
// An interval the kernel refuses (fewer than two values, constant values, too few
// draws) is carried as its refusal and read as "not constrained": a width is never
// invented. Pure, deterministic, and a function of the record's trials alone.

import { stream } from '../../random/streams.js';
import {
  studentInterval,
  percentileInterval,
} from '../../kernels/statistics/intervals.js';
import { caseBootstrap } from '../../kernels/statistics/resample.js';
import { artifact } from '../../platform/artifact.js';
import { STATUS } from '../status.js';
import { usable } from './record.js';

export const QUANTILES = Object.freeze([0.05, 0.25, 0.5, 0.75, 0.95]);

/** The q-quantile of sorted values, linear interpolation (numpy's default). */
export function quantile(sorted, q) {
  const h = (sorted.length - 1) * q;
  const lo = Math.floor(h);
  return sorted[lo] + (h - lo) * ((sorted[lo + 1] ?? sorted[lo]) - sorted[lo]);
}

const medianOf = (values, idx) => {
  const v = Float64Array.from(idx, i => values[i]).sort();
  return quantile(v, 0.5);
};

const interval = r =>
  r.status === 'ok'
    ? {
        status: 'ok',
        method: r.method,
        level: r.level,
        lo: r.lo,
        hi: r.hi,
        value: r.value,
      }
    : { status: 'not-constrained', code: r.code, why: r.why };

/** One quantity across the usable trials. */
export function describe(values, { seed, metric, level, draws }) {
  const n = values.length;
  const out = { n };
  if (!n)
    return {
      ...out,
      interval: {
        status: 'not-constrained',
        code: 'samples',
        why: 'no trial gave a number',
      },
    };
  const mean = values.reduce((a, b) => a + b, 0) / n;
  const sd =
    n > 1
      ? Math.sqrt(values.reduce((a, b) => a + (b - mean) ** 2, 0) / (n - 1))
      : null;
  const sorted = Float64Array.from(values).sort();
  out.mean = mean;
  out.sd = sd;
  out.min = sorted[0];
  out.max = sorted[n - 1];
  out.quantiles = Object.fromEntries(
    QUANTILES.map(q => [String(q), quantile(sorted, q)])
  );
  out.interval = interval(studentInterval(values, { level }));
  out.median = quantile(sorted, 0.5);
  if (n < 2) {
    out.medianInterval = {
      status: 'not-constrained',
      code: 'rows',
      why: 'a bootstrap needs at least two values',
    };
  } else {
    const b = caseBootstrap({
      n,
      statistic: idx => medianOf(values, idx),
      draws,
      seed: stream('experiments', seed, 'bootstrap', metric),
    });
    out.medianInterval =
      b.status === 'ok'
        ? interval(
            percentileInterval(b.samples, { level, method: 'case-bootstrap' })
          )
        : interval(b);
  }
  return out;
}

/**
 * The summary of a record that has run.
 * @param {object} m - A gravitas.experiment/2 record with `ensemble.result.trials`
 */
export function summarize(m) {
  const e = m.ensemble;
  const rows = e.result?.trials ?? [];
  const rowsOk = usable(rows);
  const statusCounts = { total: rows.length };
  for (const r of rows)
    statusCounts[r.status] = (statusCounts[r.status] || 0) + 1;
  const ids = [...new Set(rowsOk.flatMap(r => Object.keys(r.values)))];
  const units = Object.assign({}, ...rowsOk.map(r => r.units));
  const metrics = {};
  for (const id of ids)
    metrics[id] = {
      unit: units[id] ?? null,
      ...describe(rowsOk.map(r => r.values[id]).filter(Number.isFinite), {
        seed: e.seed,
        metric: id,
        level: e.summary.level,
        draws: e.summary.draws,
      }),
    };
  const outcomes = {};
  for (const r of rowsOk)
    if (r.outcome !== undefined)
      outcomes[r.outcome] = (outcomes[r.outcome] || 0) + 1;
  const total = Object.values(outcomes).reduce((a, b) => a + b, 0);
  return {
    complete: e.result?.status === 'complete',
    statusCounts,
    used: rowsOk.length,
    left: rows.length - rowsOk.length,
    metrics,
    outcomes: Object.fromEntries(
      Object.entries(outcomes).map(([k, count]) => [
        k,
        { count, share: count / total },
      ])
    ),
  };
}

/** What the bench and the analysis lab read of a sweep (summarizeExperiment's shape), one cell. */
export function legacySummary(m, summary = summarize(m)) {
  const out = { statusCounts: { ...summary.statusCounts }, metrics: {} };
  for (const s of Object.values(STATUS)) out.statusCounts[s] ??= 0;
  for (const [id, d] of Object.entries(summary.metrics))
    out.metrics[id] = [
      {
        params: {},
        n: d.n,
        mean: d.mean ?? null,
        min: d.min ?? null,
        max: d.max ?? null,
        spread: d.sd ?? null,
        partial: 0,
        missing: summary.left,
      },
    ];
  return out;
}

/** The trials as the sweep's rows (params, seed, status, results), for readers of that shape. */
export function legacyRows(m) {
  const e = m.ensemble;
  return (e.result?.trials ?? []).map(r => ({
    index: r.index,
    params: {},
    seed: `${e.seed}:trial:${r.index}`,
    status: r.status,
    results: Object.fromEntries(
      (r.artifact?.quantities ?? []).map(q => [q.id, q.value])
    ),
  }));
}

/**
 * The summary as a gravitas.artifact envelope: each quantity's mean with its
 * interval, or 'not-constrained' where the kernel refused one.
 */
export function summaryArtifact(m, summary = summarize(m)) {
  const e = m.ensemble;
  const quantities = Object.entries(summary.metrics)
    .filter(([, d]) => Number.isFinite(d.mean))
    .map(([id, d]) => ({
      id: `${id}.mean`,
      value: d.mean,
      unit: d.unit,
      origin: 'derived',
      uncertainty:
        d.interval.status === 'ok'
          ? {
              kind: 'interval',
              lo: d.interval.lo,
              hi: d.interval.hi,
              level: d.interval.level,
              basis: 'data',
            }
          : { kind: 'not-constrained' },
    }));
  return artifact({
    id: 'ensemble-summary',
    source: {
      kind: 'experiment',
      id: `${e.kind}:${e.seed}`,
      ...(e.result?.digest ? { digest: e.result.digest } : {}),
    },
    quantities,
    warnings: [
      ...(summary.complete ? [] : [`partial:${e.result?.status ?? 'not-run'}`]),
      ...(summary.left ? [`left-out:${summary.left}`] : []),
    ],
  });
}
