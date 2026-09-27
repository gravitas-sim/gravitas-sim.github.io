// =============================================================================
// What the Exoplanet Observatory's guides compute from the data themselves
// -----------------------------------------------------------------------------
// Most numbers a guide asks about are the reader's own: a transit search in
// the measurement panel, a fit in the fit panel. These are the few the guides
// compute to set beside them, each from the light curve on screen and each
// with its uncertainty, so that every number a guide reports is produced from
// data by an algorithm stated here:
//
//   lightFraction   the share of two stars' light that is the brighter's,
//                   from their magnitude difference
//   boxDepth        a transit's depth: the mean flux in the central half of
//                   the transit against the mean well outside it
//   oddEven         the same for odd-numbered and even-numbered transits,
//                   and their difference in units of its error
//   secondary       the depth at phase one half, where an eclipsing binary's
//                   second star would be eclipsed
//   bestEpoch       where the deepest box falls, for a period taken as given
//
// Pure, and plain numbers in and out: tests/exoplanetGuides.test.js runs them
// on synthetic transits with known answers and on the real packs.
// =============================================================================

/**
 * The fraction of the light of two blended stars that is the first's, when
 * the second is `dm` magnitudes fainter: 1 / (1 + 10^(-0.4 dm)).
 */
export function lightFraction(dm) {
  return 1 / (1 + 10 ** (-0.4 * dm));
}

/** Phase in [-0.5, 0.5), zero at mid-transit. */
const phaseOf = (t, period, epoch) => {
  const p = (t - epoch) / period;
  return p - Math.floor(p + 0.5);
};

/**
 * The weighted mean flux and its error over the points a test keeps.
 * @returns {{mean: number, error: number, n: number}|null}
 */
function weightedMean(s, keep) {
  let w = 0;
  let wy = 0;
  let n = 0;
  const ys = [];
  for (let i = 0; i < s.t.length; i++) {
    if (!keep(i)) continue;
    const wi = s.dy ? 1 / s.dy[i] ** 2 : 1;
    w += wi;
    wy += wi * s.y[i];
    ys.push(s.y[i]);
    n++;
  }
  if (n < 2) return null;
  const mean = wy / w;
  // The stated errors where the data have them, else the scatter: and the
  // larger of the two, so red noise does not make a depth look sharper than
  // its points allow.
  let ss = 0;
  for (const y of ys) ss += (y - mean) ** 2;
  const scatter = Math.sqrt(ss / (n - 1) / n);
  const stated = s.dy ? Math.sqrt(1 / w) : 0;
  return { mean, error: Math.max(scatter, stated), n };
}

/**
 * How well the mean of a box of `width` is known, measured from the light
 * curve rather than assumed: the scatter of the means of boxes that width
 * laid end to end over the points `keep` keeps (Pont, Zucker and Queloz
 * 2006's "time-averaged" noise). It includes the correlated noise a
 * white-noise error leaves out.
 */
function boxNoise(s, keep, width) {
  const means = [];
  let start = null;
  let sum = 0;
  let n = 0;
  const flush = () => {
    if (n >= 3) means.push(sum / n);
    sum = 0;
    n = 0;
  };
  for (let i = 0; i < s.t.length; i++) {
    if (!keep(i)) continue;
    if (start === null || s.t[i] - start >= width) {
      flush();
      start = s.t[i];
    }
    sum += s.y[i];
    n++;
  }
  flush();
  if (means.length < 5) return null;
  const m = means.reduce((a, b) => a + b, 0) / means.length;
  let ss = 0;
  for (const v of means) ss += (v - m) ** 2;
  return Math.sqrt(ss / (means.length - 1));
}

/**
 * A transit's depth, the simplest honest way: the mean flux over the central
 * half of the transit (|phase| below a quarter of the duration) against the
 * mean more than one duration from mid-transit. The error of the box's mean
 * is the larger of the white-noise one and the correlated-noise one
 * (boxNoise, over the cycles the box holds); the two means' errors add in
 * quadrature.
 * @param {{t: ArrayLike<number>, y: ArrayLike<number>, dy?: ArrayLike<number>}} s
 * @param {{period: number, epoch: number, duration: number, phase?: number,
 *   select?: (cycle: number) => boolean}} o - durations in the time's unit;
 *   `phase` moves the box (0.5 for a secondary eclipse); `select` keeps only
 *   some cycles (odd, even)
 * @returns {{depth: number, error: number, inTransit: number, outside: number}|null}
 */
export function boxDepth(s, { period, epoch, duration, phase = 0, select }) {
  const half = duration / period / 4;
  const away = duration / period;
  const cycleOf = t => Math.round((t - epoch) / period - phase);
  const inBox = i => {
    const p = phaseOf(s.t[i], period, epoch + phase * period);
    return Math.abs(p) < half && (!select || select(cycleOf(s.t[i])));
  };
  const outside = i => {
    // Away from the transit and from any secondary eclipse.
    const p0 = Math.abs(phaseOf(s.t[i], period, epoch));
    const p1 = Math.abs(phaseOf(s.t[i], period, epoch + period / 2));
    return p0 > away && p1 > away;
  };
  const a = weightedMean(s, inBox);
  const b = weightedMean(s, outside);
  if (!a || !b) return null;
  const cycles = new Set();
  for (let i = 0; i < s.t.length; i++)
    if (inBox(i)) cycles.add(cycleOf(s.t[i]));
  const red = boxNoise(s, outside, duration / 2);
  const inError = Math.max(a.error, red ? red / Math.sqrt(cycles.size) : 0);
  return {
    depth: (b.mean - a.mean) / b.mean,
    error: Math.hypot(inError, b.error) / b.mean,
    inTransit: a.n,
    outside: b.n,
    cycles: cycles.size,
    whiteError: Math.hypot(a.error, b.error) / b.mean,
  };
}

/**
 * Odd- and even-numbered transits' depths, and their difference in units of
 * its error. An eclipsing binary of two unequal stars, taken at twice its
 * period, alternates deep and shallow eclipses; a planet's transits do not.
 */
export function oddEven(s, { period, epoch, duration }) {
  const odd = boxDepth(s, {
    period,
    epoch,
    duration,
    select: c => Math.abs(c) % 2 === 1,
  });
  const even = boxDepth(s, {
    period,
    epoch,
    duration,
    select: c => c % 2 === 0,
  });
  if (!odd || !even) return null;
  const error = Math.hypot(odd.error, even.error);
  return {
    odd,
    even,
    difference: odd.depth - even.depth,
    error,
    sigmas: error > 0 ? Math.abs(odd.depth - even.depth) / error : null,
  };
}

/**
 * The depth at phase one half, where the second star of an eclipsing binary
 * would pass behind the first. A planet's is too small to see here (a hot
 * Jupiter's is tens of parts per million), a star's is not.
 */
export function secondary(s, { period, epoch, duration }) {
  return boxDepth(s, { period, epoch, duration, phase: 0.5 });
}

/**
 * The epoch that puts the deepest box at phase zero, for a period taken as
 * given: the box of boxDepth() slid across one cycle in steps of a
 * thirty-second of the duration, and the center of the one with the lowest
 * mean flux.
 * @returns {number|null} A time of mid-transit within the first cycle
 */
export function bestEpoch(s, { period, duration }) {
  if (!s.t.length) return null;
  const start = s.t[0];
  const step = duration / 32;
  const half = duration / period / 4;
  let best = null;
  for (let e = start; e < start + period; e += step) {
    let w = 0;
    let wy = 0;
    let n = 0;
    for (let i = 0; i < s.t.length; i++) {
      if (Math.abs(phaseOf(s.t[i], period, e)) >= half) continue;
      const wi = s.dy ? 1 / s.dy[i] ** 2 : 1;
      w += wi;
      wy += wi * s.y[i];
      n++;
    }
    if (n >= 3 && (!best || wy / w < best.mean)) best = { mean: wy / w, e };
  }
  return best ? best.e : null;
}

/**
 * The light curve a workspace view shows: its x column, its value column and
 * that column's uncertainty, where it has one, with rows that are not all
 * finite left out.
 * @param {object} view - A gravitas.observation/1 after its changes
 */
export function seriesOf(view) {
  const col = id => view.columns.find(c => c.id === id);
  const x = col(view.axes.x);
  const y = col(view.axes.y);
  const e = view.columns.find(c => c.role === 'uncertainty' && c.of === y?.id);
  const masked = new Set();
  for (const m of view.masks || []) for (const r of m.rows) masked.add(r);
  const t = [];
  const f = [];
  const dy = e ? [] : null;
  for (let i = 0; i < (x?.values.length ?? 0); i++) {
    if (masked.has(i)) continue;
    const a = x.values[i];
    const b = y.values[i];
    const c = e ? e.values[i] : 1;
    if (!Number.isFinite(a) || !Number.isFinite(b) || !(c > 0)) continue;
    t.push(a);
    f.push(b);
    if (dy) dy.push(c);
  }
  return { t, y: f, dy };
}
