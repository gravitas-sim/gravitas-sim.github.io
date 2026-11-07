// SPIKE (Roadmap III, Prompt 262 Part A): the prototype censoring estimator. Never merged.
// A product-limit estimator for left-censored data (the flip), a Greenwood-type variance
// of the mean, bounds when the smallest observation is a limit, and a log-rank check of the
// independence of the censoring from the value. Definitions: tests/fixtures/censoring/thresholds.json.
import { refused } from './check.js';
import { normalQuantile, normalSf } from './special.js';

const { Number, Math, Array } = globalThis;
const isBool = b => b === true || b === false;

/** The two-sample log-rank check on the flipped data, groups by the median limit. */
export function independenceCheck(
  rows,
  { alpha = 0.01, minGroupDetections = 5 } = {}
) {
  for (const r of rows)
    if (!Number.isFinite(r.limit))
      return { checked: false, reason: 'no-limits' };
  const limits = rows.map(r => r.limit).sort((a, b) => a - b);
  const n = limits.length;
  const med =
    n % 2 ? limits[(n - 1) / 2] : 0.5 * (limits[n / 2 - 1] + limits[n / 2]);
  let M = -Infinity;
  for (const r of rows) if (r.value > M) M = r.value;
  const items = rows.map(r => ({
    y: M - r.value,
    event: !r.censored,
    g1: r.limit <= med,
  }));
  const n1 = items.filter(i => i.g1).length;
  const n2 = n - n1;
  const det1 = items.filter(i => i.g1 && i.event).length;
  const det2 = items.filter(i => !i.g1 && i.event).length;
  if (n1 === 0 || n2 === 0 || det1 < minGroupDetections || det2 < minGroupDetections)
    return { checked: false, reason: 'group-too-small', n1, n2, det1, det2 };
  const times = [...new Set(items.filter(i => i.event).map(i => i.y))].sort(
    (a, b) => a - b
  );
  let O1 = 0;
  let E1 = 0;
  let V = 0;
  for (const t of times) {
    let nAt = 0;
    let nAt1 = 0;
    let d = 0;
    let d1 = 0;
    for (const i of items) {
      if (i.y >= t) {
        nAt++;
        if (i.g1) nAt1++;
      }
      if (i.y === t && i.event) {
        d++;
        if (i.g1) d1++;
      }
    }
    const nAt2 = nAt - nAt1;
    O1 += d1;
    E1 += (d * nAt1) / nAt;
    if (nAt > 1) V += d * (nAt1 / nAt) * (nAt2 / nAt) * ((nAt - d) / (nAt - 1));
  }
  const z = (O1 - E1) / Math.sqrt(V);
  const p = 2 * normalSf(Math.abs(z));
  return { checked: true, reason: 'ok', n1, n2, det1, det2, z, p, flag: p < alpha };
}

/**
 * Product-limit estimate of the distribution and the mean of left-censored values.
 * rows: [{ value, censored, limit? }]. options: { floor, level, minDetections, alpha, check }.
 */
export function kmLeft(
  rows,
  { floor, level = 0.95, minDetections = 5, alpha = 0.01, check = true } = {}
) {
  if (!Array.isArray(rows)) return refused('non-finite', 'rows is not a list');
  if (!(level > 0 && level < 1))
    return refused('level', 'the level must lie in (0, 1)');
  for (const r of rows)
    if (r && ('u' in r || 'x' in r))
      return refused(
        'truncated-input',
        'a row carries a truncation bound: a truncated sample is not a censored one'
      );
  for (const r of rows) if (!isBool(r.censored)) return refused('bad-flag', 'censored must be true or false');
  for (const r of rows)
    if (!Number.isFinite(r.value)) return refused('non-finite', 'a value is not finite');
  const detections = rows.filter(r => !r.censored).length;
  if (detections < minDetections)
    return refused(
      'too-few-detections',
      `${detections} detections, at least ${minDetections} are needed`
    );
  let M = -Infinity;
  for (const r of rows) if (r.value > M) M = r.value;
  const items = rows
    .map(r => ({ y: M - r.value, event: !r.censored }))
    .sort((a, b) => a.y - b.y);
  const N = items.length;
  // walk the sorted y; at a tie, events before censorings, all at risk at that y
  const ev = []; // { t, n, d, S }
  let S = 1;
  let i = 0;
  while (i < N) {
    const t = items[i].y;
    let j = i;
    let d = 0;
    while (j < N && items[j].y === t) {
      if (items[j].event) d++;
      j++;
    }
    if (d > 0) {
      const n = N - i; // rows with y >= t
      const Snew = S * (1 - d / n);
      ev.push({ t, n, d, S: Snew, mass: S - Snew });
      S = Snew;
    }
    i = j;
  }
  const tau = items[N - 1].y;
  const tail = S;
  let area = 0;
  let prevT = 0;
  let prevS = 1;
  for (const e of ev) {
    area += prevS * (e.t - prevT);
    prevT = e.t;
    prevS = e.S;
  }
  area += prevS * (tau - prevT);
  // A_i: reverse cumulative sum of S times the gap to the next event (or to tau)
  const A = new Array(ev.length);
  let acc = 0;
  for (let k = ev.length - 1; k >= 0; k--) {
    const next = k + 1 < ev.length ? ev[k + 1].t : tau;
    acc += ev[k].S * (next - ev[k].t);
    A[k] = acc;
  }
  let variance = 0;
  for (let k = 0; k < ev.length; k++)
    if (ev[k].n > ev[k].d)
      variance += (A[k] * A[k] * ev[k].d) / (ev[k].n * (ev[k].n - ev[k].d));
  const se = Math.sqrt(variance);
  const z = normalQuantile((1 + level) / 2);
  const support = ev.map(e => ({ value: M - e.t, mass: e.mass }));
  const out = { level, support, tailMass: tail, variance, se, M };
  if (tail === 0) {
    out.status = 'complete';
    out.mean = M - area;
    out.meanLow = out.meanHigh = M - area;
  } else {
    if (!Number.isFinite(floor))
      return refused(
        'unbounded-tail',
        'the smallest observation is a limit: a floor is needed to bound the mean'
      );
    out.status = 'bounded';
    out.mean = null;
    out.meanHigh = M - area;
    out.meanLow = M - (area + tail * (M - floor - tau));
  }
  out.interval = [out.meanLow - z * se, out.meanHigh + z * se];
  if (check) {
    const ind = independenceCheck(rows, { alpha, minGroupDetections: 5 });
    out.independence = ind;
    if (ind.checked && ind.flag) {
      out.estimateStatus = out.status;
      out.status = 'dependent';
      out.interval = null;
    }
  }
  return out;
}
