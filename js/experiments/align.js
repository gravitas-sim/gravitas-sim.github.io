// =============================================================================
// Putting two runs on one time axis
// -----------------------------------------------------------------------------
// Run A and Run B are sampled by the render loop, and the render loop does not
// tick evenly. A frame takes as long as it takes; a scenario that substeps
// integrates several times per frame; a laptop that thermally throttles
// halfway through Run B produces a sparser series than Run A. So two runs of
// "the same" length arrive with different sample counts at different simulated
// times, and the naive comparison - zip the two arrays index by index - silently
// compares t=4.1 in one run against t=5.8 in the other and reports the
// difference as physics.
//
// Everything here exists to make that impossible. Samples carry their own
// simulated time, alignment happens on that time and nothing else, and where
// the two runs do not overlap the answer is "no comparison" rather than an
// extrapolated number that looks like one.
//
// On interpolation
// -----------------------------------------------------------------------------
// Linear, between the two samples that bracket the requested time, and only
// ever *between* them. A student comparing an orbit is looking at a smooth
// function sampled ten times a second; a straight line across one sample gap
// is a far smaller error than the gap itself. Extrapolating past the end of a
// series would be inventing data, so the shared window stops at whichever run
// ended first, and the caller is told how much of each run went unused.
// =============================================================================

/**
 * Find where `t` sits in an ascending array of sample times.
 *
 * @param {Array<{t:number}>} samples - Ascending by t
 * @param {number} t - Simulated seconds
 * @returns {number} Index of the last sample at or before t, or -1
 */
export function indexAtOrBefore(samples, t) {
  let lo = 0;
  let hi = samples.length - 1;
  let best = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (samples[mid].t <= t) {
      best = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return best;
}

/**
 * The value of a series at a simulated time, or null outside its range.
 *
 * Null rather than a clamped endpoint: a chart that flat-lines past the end of
 * the shorter run looks like a physical result - "it stopped moving" - and is
 * not one.
 *
 * @param {Array<{t:number, v:number}>} samples - Ascending by t
 * @param {number} t - Simulated seconds
 * @returns {number|null} Interpolated value
 */
export function sampleAt(samples, t) {
  if (!samples || !samples.length) return null;
  if (t < samples[0].t || t > samples[samples.length - 1].t) return null;
  const i = indexAtOrBefore(samples, t);
  if (i < 0) return null;
  const a = samples[i];
  if (a.t === t || i === samples.length - 1) return a.v;
  const b = samples[i + 1];
  const span = b.t - a.t;
  if (!(span > 0)) return a.v;
  const f = (t - a.t) / span;
  return a.v + (b.v - a.v) * f;
}

/**
 * The simulated-time window both runs actually cover.
 *
 * @param {Array<{t:number}>} a - Run A samples
 * @param {Array<{t:number}>} b - Run B samples
 * @returns {{start:number, end:number, span:number, empty:boolean}} The overlap
 */
export function overlapWindow(a, b) {
  if (!a?.length || !b?.length) {
    return { start: 0, end: 0, span: 0, empty: true };
  }
  const start = Math.max(a[0].t, b[0].t);
  const end = Math.min(a[a.length - 1].t, b[b.length - 1].t);
  return { start, end, span: Math.max(0, end - start), empty: !(end > start) };
}

/**
 * Resample two series onto one grid of simulated times.
 *
 * The grid is built from the *sparser* run's own sample times inside the
 * overlap, not from a synthetic even spacing. Two reasons. A student who ran
 * Run B on a busier machine gets a comparison at the times Run B actually
 * measured, so every B value in the table is a measurement rather than an
 * interpolation. And the number of rows follows the data instead of a constant
 * somebody picked, so a ten-second experiment does not produce ten thousand
 * rows of a straight line.
 *
 * @param {Array<{t:number, v:number}>} a - Run A samples, ascending
 * @param {Array<{t:number, v:number}>} b - Run B samples, ascending
 * @param {Object} [opts]
 * @param {number} [opts.maxRows] - Cap on the returned rows
 * @returns {{rows: Array<{t:number, a:number, b:number, delta:number,
 *   fraction:number|null}>, window: Object, unusedA:number, unusedB:number,
 *   interpolated:string}} Aligned series and what was left over
 */
export function alignSeries(a, b, { maxRows = 4000 } = {}) {
  const window = overlapWindow(a, b);
  if (window.empty) {
    return {
      rows: [],
      window,
      unusedA: seriesSpan(a),
      unusedB: seriesSpan(b),
      interpolated: 'none',
    };
  }

  // Whichever run sampled less often inside the window supplies the grid; the
  // other is interpolated onto it.
  const inA = a.filter(s => s.t >= window.start && s.t <= window.end);
  const inB = b.filter(s => s.t >= window.start && s.t <= window.end);
  const gridFromA = inA.length <= inB.length;
  const grid = gridFromA ? inA : inB;

  const step = Math.max(1, Math.ceil(grid.length / maxRows));
  const rows = [];
  for (let i = 0; i < grid.length; i += step) {
    const t = grid[i].t;
    const va = gridFromA ? grid[i].v : sampleAt(a, t);
    const vb = gridFromA ? sampleAt(b, t) : grid[i].v;
    if (va === null || vb === null) continue;
    const delta = vb - va;
    rows.push({
      t,
      a: va,
      b: vb,
      delta,
      // A fractional difference against a baseline of zero is not a large
      // number, it is a meaningless one.
      fraction: va === 0 ? null : delta / Math.abs(va),
    });
  }

  return {
    rows,
    window,
    unusedA: Math.max(0, seriesSpan(a) - window.span),
    unusedB: Math.max(0, seriesSpan(b) - window.span),
    interpolated: gridFromA ? 'B' : 'A',
  };
}

/** Simulated seconds a series covers. @param {Array} s - Samples @returns {number} */
export function seriesSpan(s) {
  if (!s || s.length < 2) return 0;
  return s[s.length - 1].t - s[0].t;
}

/**
 * How evenly a run was sampled.
 *
 * Reported to the student rather than smoothed away. A run whose sample
 * interval varied by a factor of five was taken on a machine that was busy,
 * and that is worth knowing before reading a drift number off it.
 *
 * @param {Array<{t:number}>} samples - Ascending by t
 * @returns {{count:number, mean:number, min:number, max:number,
 *   ratio:number}} Interval statistics, in simulated seconds
 */
export function samplingStats(samples) {
  if (!samples || samples.length < 2) {
    return { count: samples?.length || 0, mean: 0, min: 0, max: 0, ratio: 1 };
  }
  let min = Infinity;
  let max = 0;
  let total = 0;
  for (let i = 1; i < samples.length; i++) {
    const dt = samples[i].t - samples[i - 1].t;
    if (!(dt > 0)) continue;
    total += dt;
    if (dt < min) min = dt;
    if (dt > max) max = dt;
  }
  const n = samples.length - 1;
  return {
    count: samples.length,
    mean: n > 0 ? total / n : 0,
    min: Number.isFinite(min) ? min : 0,
    max,
    ratio: min > 0 && Number.isFinite(min) ? max / min : 1,
  };
}
