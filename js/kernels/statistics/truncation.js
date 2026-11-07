// SPIKE (Roadmap III, Prompt 262 Part A): the prototype truncation estimator. Never merged.
// The Lynden-Bell product-limit estimator for a lower-truncated sample: rows (x, u) with u <= x.
import { refused } from './check.js';
import { normalQuantile } from './special.js';

const { Number, Math, Array, Float64Array } = globalThis;

/**
 * rows: [{ x, u }], options: { from, level, minRisk }.
 * Recovers the distribution of x conditional on x >= from.
 */
export function lyndenBell(rows, { from, level = 0.95, minRisk = 10 } = {}) {
  if (!Array.isArray(rows)) return refused('non-finite', 'rows is not a list');
  if (!(level > 0 && level < 1))
    return refused('level', 'the level must lie in (0, 1)');
  for (const r of rows)
    if (r && r.censored !== undefined && r.censored !== false)
      return refused(
        'censored-input',
        'a row is flagged censored: a censored sample is not a truncated one'
      );
  for (const r of rows)
    if (!('u' in r) || r.u === undefined || r.u === null || Number.isNaN(r.u))
      return refused('missing-truncation-bound', 'a row has no truncation bound u');
  for (const r of rows)
    if (!Number.isFinite(r.x) || !Number.isFinite(r.u))
      return refused('non-finite', 'a value or bound is not finite');
  for (const r of rows)
    if (r.u > r.x)
      return refused('bound-above-value', 'a row has its bound above its value');
  if (!Number.isFinite(from)) return refused('non-finite', 'from is not finite');
  const kept = rows.filter(r => r.x >= from);
  if (kept.length === 0)
    return refused('thin-risk-set', 'no row at or above from');
  const idx = Array.from({ length: kept.length }, (_, k) => k).sort(
    (a, b) => kept[a].x - kept[b].x
  );
  const xs = new Float64Array(kept.length);
  const us = new Float64Array(kept.length);
  for (let k = 0; k < idx.length; k++) {
    xs[k] = kept[idx[k]].x;
    us[k] = kept[idx[k]].u;
  }
  const m = xs.length;
  const ev = [];
  let S = 1;
  let i = 0;
  while (i < m) {
    const t = xs[i];
    let j = i;
    while (j < m && xs[j] === t) j++;
    const d = j - i;
    let n = 0;
    for (let k = 0; k < m; k++) if (us[k] <= t && xs[k] >= t) n++;
    const Snew = S * (1 - d / n);
    ev.push({ t, n, d, S: Snew, mass: S - Snew });
    S = Snew;
    i = j;
  }
  if (ev[0].n < minRisk)
    return refused(
      'thin-risk-set',
      `the associated set at from is ${ev[0].n}, at least ${minRisk} are needed`
    );
  const xmax = ev[ev.length - 1].t;
  const A = new Array(ev.length);
  let acc = 0;
  for (let k = ev.length - 1; k >= 0; k--) {
    const next = k + 1 < ev.length ? ev[k + 1].t : xmax;
    acc += ev[k].S * (next - ev[k].t);
    A[k] = acc;
  }
  let variance = 0;
  for (let k = 0; k < ev.length; k++)
    if (ev[k].n > ev[k].d)
      variance += (A[k] * A[k] * ev[k].d) / (ev[k].n * (ev[k].n - ev[k].d));
  let mean = 0;
  for (const e of ev) mean += e.t * e.mass;
  const se = Math.sqrt(variance);
  const z = normalQuantile((1 + level) / 2);
  return {
    status: 'ok',
    from,
    level,
    support: ev.map(e => ({ value: e.t, mass: e.mass })),
    associatedSets: ev.map(e => ({ value: e.t, n: e.n })),
    riskAtFrom: ev[0].n,
    mean,
    variance,
    se,
    interval: [mean - z * se, mean + z * se],
  };
}
