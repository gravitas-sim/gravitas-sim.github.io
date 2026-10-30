// =============================================================================
// A transit's depth in a box, with its uncertainty (Prompt 228, VETTING.md)
// -----------------------------------------------------------------------------
// The depth of an eclipse as the weighted mean flux in the local baseline minus
// the weighted mean flux in the central half of the eclipse, over the baseline.
// The box is |dt| < T14 / 4 about the eclipse's centre; the baseline is
// T14 < |dt| < 3 T14 about the same centre, pooled over the cycles chosen. The
// uncertainty is the white-noise one times beta >= 1, the red-noise factor of
// Pont, Zucker and Queloz (2006): the scatter of consecutive block means of the
// baseline residuals against what white noise gives.
//
// This is the estimator js/observatory/guides/science.js boxDepth() uses in
// form (the same box) with a local baseline in place of a global one, so that a
// phase curve does not become a depth. The guide's own function is untouched
// (its goldens stay), and tests/vetting.test.js holds that the two agree on a
// flat baseline.
//
// Pure: no DOM, no state.
// =============================================================================

const { Math, Float64Array, Map } = globalThis;

/** The cycle number, nearest to t, of an eclipse series centred at t0 + shift. */
export const cycleOf = (t, P, t0) => Math.round((t - t0) / P);

/**
 * What a call must be given: arrays of equal length, a positive period, a
 * duration shorter than half of it. Throws, naming the input.
 */
export function checkSeries(s, eph) {
  if (!s || !s.t || !s.y)
    throw new TypeError('the series needs t and y arrays');
  if (s.t.length !== s.y.length || (s.dy && s.dy.length !== s.t.length))
    throw new RangeError('the series t, y and dy arrays differ in length');
  if (!(s.t.length >= 3))
    throw new RangeError('the series has fewer than 3 points');
  checkEphemeris(eph);
}

export function checkEphemeris(eph) {
  if (!eph) throw new TypeError('the ephemeris is missing');
  const { P, t0, duration } = eph;
  if (!(Number.isFinite(P) && P > 0))
    throw new RangeError('the period must be a positive number');
  if (!Number.isFinite(t0))
    throw new RangeError('the epoch t0 must be a number');
  if (!(Number.isFinite(duration) && duration > 0 && duration < P / 2))
    throw new RangeError(
      'the duration must be positive and shorter than half the period'
    );
}

function robustSigma(values) {
  const n = values.length;
  if (n < 3) return NaN;
  const a = Float64Array.from(values).sort();
  const med = a[n >> 1];
  const dev = Float64Array.from(a, v => Math.abs(v - med)).sort();
  return 1.4826 * dev[n >> 1];
}

/**
 * The depth in the central half of an eclipse series.
 * @param {{t: ArrayLike<number>, y: ArrayLike<number>, dy?: ArrayLike<number>}} s
 * @param {{P: number, t0: number, duration: number}} eph
 * @param {{phase?: number, select?: (cycle: number) => boolean,
 *   sigmaPoint?: number}} [o] - `phase` places the eclipse at t0 + phase P
 *   (0 for the primary, 0.5 for a circular orbit's secondary); `select`
 *   keeps only some cycles
 * @returns {null | {depth: number, sigma: number, sigmaWhite: number, beta: number,
 *   cycles: number, nBox: number, nBase: number, base: number}}
 */
export function boxDepth(s, eph, o = {}) {
  const { P, t0, duration: D } = eph;
  const phase = o.phase ?? 0;
  const centre = t0 + phase * P;
  const other = phase === 0 ? t0 + 0.5 * P : t0;
  const n = s.t.length;
  const box = [];
  const base = [];
  for (let i = 0; i < n; i++) {
    const v = s.y[i];
    if (!Number.isFinite(v) || !Number.isFinite(s.t[i])) continue;
    const c = cycleOf(s.t[i], P, centre);
    if (o.select && !o.select(c)) continue;
    const dt = s.t[i] - centre - c * P;
    const adt = Math.abs(dt);
    if (adt < D / 4) box.push(i);
    else if (adt > D && adt < 3 * D) {
      // Not in the other eclipse's own box or its edges.
      const dto = s.t[i] - other - cycleOf(s.t[i], P, other) * P;
      if (Math.abs(dto) > 1.5 * D) base.push(i);
    }
  }
  if (box.length < 3 || base.length < 3) return null;
  // Per-point sigma: the supplied one, else the baseline's robust scatter.
  let fallback = NaN;
  if (!s.dy) {
    let m = 0;
    for (const i of base) m += s.y[i];
    m /= base.length;
    fallback = o.sigmaPoint ?? robustSigma(base.map(i => s.y[i] - m));
    if (!(fallback > 0)) return null;
  }
  const sig = i => (s.dy ? s.dy[i] : fallback);
  let wb = 0;
  let wyb = 0;
  for (const i of base) {
    const w = 1 / sig(i) ** 2;
    wb += w;
    wyb += w * s.y[i];
  }
  let wx = 0;
  let wyx = 0;
  const cycles = new Map();
  for (const i of box) {
    const w = 1 / sig(i) ** 2;
    wx += w;
    wyx += w * s.y[i];
    const c = cycleOf(s.t[i], P, centre);
    cycles.set(c, (cycles.get(c) ?? 0) + 1);
  }
  const mBase = wyb / wb;
  const mBox = wyx / wx;
  const nCycles = [...cycles.values()].filter(k => k >= 3).length;
  const perBox = Math.max(2, Math.round(box.length / Math.max(1, cycles.size)));
  const beta = redNoiseFactor(s, base, mBase, sig, perBox, P, centre);
  const sigmaWhite = Math.sqrt(1 / wx + 1 / wb) / mBase;
  return {
    depth: (mBase - mBox) / mBase,
    sigma: beta * sigmaWhite,
    sigmaWhite,
    beta,
    cycles: nCycles,
    nBox: box.length,
    nBase: base.length,
    base: mBase,
  };
}

/**
 * Pont, Zucker and Queloz (2006): the root mean square of the means of blocks
 * of `n` consecutive baseline points against the white-noise expectation
 * sigma / sqrt(n) sqrt(M / (M - 1)); at least 1; 1 with fewer than 10 blocks.
 * A block never spans two cycles' windows.
 */
function redNoiseFactor(s, base, mean, sig, n, P, centre) {
  const groups = new Map();
  for (const i of base) {
    const c = cycleOf(s.t[i], P, centre);
    const side = s.t[i] - centre - c * P < 0 ? 0 : 1;
    const key = c * 2 + side;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(i);
  }
  let ss = 0;
  let M = 0;
  let expected2 = 0;
  for (const idx of groups.values()) {
    idx.sort((a, b) => s.t[a] - s.t[b]);
    for (let j = 0; j + n <= idx.length; j += n) {
      let sum = 0;
      let v2 = 0;
      for (let k = j; k < j + n; k++) {
        sum += s.y[idx[k]] - mean;
        v2 += sig(idx[k]) ** 2;
      }
      ss += (sum / n) ** 2;
      expected2 += v2 / (n * n);
      M++;
    }
  }
  if (M < 10) return 1;
  const observed = Math.sqrt(ss / M);
  const expected = Math.sqrt(expected2 / M) * Math.sqrt(M / (M - 1));
  return Math.max(1, observed / expected);
}
