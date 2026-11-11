// =============================================================================
// A discrete Fourier periodogram for a small series
// -----------------------------------------------------------------------------
// NUMERICS_INSTRUMENTS.md, instrument I4. The Fourier idea written out: at
// each trial frequency, how much of the series lines up with a cosine and how
// much with a sine. With C = sum (y - mean) cos(2 pi f t) and S the same with
// the sine, the power is
//
//   P(f) = 2 (C^2 + S^2) / (N sum (y - mean)^2),
//
// which is 1 for a sinusoid sampled evenly over whole cycles. This is the
// classical (Schuster) periodogram: no weights, no floating mean, no
// false-alarm probability. The family's search (js/measure/periodogram.js, the
// generalized Lomb-Scargle) is the check on its answer, not the other way.
//
// It reports the peak, the resolution 1 / T that the series' length allows
// (a property of the sampling, not an uncertainty), the peak's full width at
// half its power, and the second peak. It refuses to name a period when a
// second peak is at least ALIAS of the first: an evenly sampled series cannot
// tell a frequency from its alias, and the tallest peak is then not the period.
//
// Pure, bounded (N * n at most WORK). Frequencies are cycles per unit of t.
// Imported by no shipped module.
// =============================================================================
const { Math, Number, Float64Array } = globalThis;

export const MIN_SERIES = 8;
export const WORK = 2e6;
export const ALIAS = 0.9;

/**
 * @param {ArrayLike<number>} t - Times, any order
 * @param {ArrayLike<number>} y - One value per time
 * @param {{fmin: number, fmax: number, n: number}} grid - Trial frequencies, evenly spaced, ends included
 * @returns {object} `{refused, ...}` or the periodogram
 */
export function fourierPeriodogram(t, y, { fmin, fmax, n } = {}) {
  const N = t?.length;
  if (!(N >= 0) || y?.length !== N)
    throw new RangeError('need one value for each time');
  if (!(
    Number.isFinite(fmin) &&
    fmin > 0 &&
    Number.isFinite(fmax) &&
    fmax > fmin
  ))
    throw new RangeError('need 0 < fmin < fmax');
  if (!(Number.isInteger(n) && n >= 3))
    throw new RangeError('need three or more trial frequencies');
  if (N * n > WORK)
    throw new RangeError(
      `${N} points at ${n} frequencies is more than ${WORK} terms`
    );
  let mean = 0;
  let tmin = Infinity;
  let tmax = -Infinity;
  for (let i = 0; i < N; i++) {
    if (!Number.isFinite(t[i]) || !Number.isFinite(y[i]))
      throw new RangeError('times and values must be finite');
    mean += y[i];
    if (t[i] < tmin) tmin = t[i];
    if (t[i] > tmax) tmax = t[i];
  }
  if (N < MIN_SERIES) return { refused: 'too-few', n: N };
  mean /= N;
  let total = 0;
  for (let i = 0; i < N; i++) total += (y[i] - mean) * (y[i] - mean);
  if (!(total > 0)) return { refused: 'no-variation', n: N };
  const T = tmax - tmin;
  const resolution = 1 / T;
  const step = (fmax - fmin) / (n - 1);
  const freqs = new Float64Array(n);
  const power = new Float64Array(n);
  const amp = new Float64Array(n);
  for (let j = 0; j < n; j++) {
    const f = j === n - 1 ? fmax : fmin + j * step;
    const w = 2 * Math.PI * f;
    let C = 0;
    let S = 0;
    for (let i = 0; i < N; i++) {
      const d = y[i] - mean;
      C += d * Math.cos(w * t[i]);
      S += d * Math.sin(w * t[i]);
    }
    freqs[j] = f;
    power[j] = (2 * (C * C + S * S)) / (N * total);
    amp[j] = (2 * Math.sqrt(C * C + S * S)) / N;
  }
  let jp = 0;
  for (let j = 1; j < n; j++) if (power[j] > power[jp]) jp = j;
  // The parabola through the grid maximum and its neighbours.
  let frequency = freqs[jp];
  if (jp > 0 && jp < n - 1) {
    const curve = power[jp - 1] - 2 * power[jp] + power[jp + 1];
    if (curve < 0)
      frequency += (0.5 * (power[jp - 1] - power[jp + 1]) * step) / curve;
  }
  // The full width at half the peak's power, by linear interpolation.
  const half = power[jp] / 2;
  const crossing = dir => {
    for (let j = jp; j + dir >= 0 && j + dir < n; j += dir) {
      const a = power[j];
      const b = power[j + dir];
      if (b <= half) return freqs[j] + (dir * step * (a - half)) / (a - b);
    }
    return null;
  };
  const left = crossing(-1);
  const right = crossing(1);
  // The largest local maximum more than one resolution from the peak.
  let js = -1;
  for (let j = 0; j < n; j++) {
    if (Math.abs(freqs[j] - freqs[jp]) <= resolution) continue;
    const up = j === 0 || power[j] >= power[j - 1];
    const down = j === n - 1 || power[j] >= power[j + 1];
    if (up && down && (js < 0 || power[j] > power[js])) js = j;
  }
  const second = js < 0 ? null : { frequency: freqs[js], power: power[js] };
  const out = {
    n: N,
    baseline: T,
    resolution,
    grid: { freqs, power },
    fwhm: left === null || right === null ? null : right - left,
    second,
    aliasRatio: second ? second.power / power[jp] : 0,
    warnings: step > resolution / 2 ? ['coarse-grid'] : [],
  };
  if (second && second.power >= ALIAS * power[jp])
    return {
      refused: 'alias',
      candidates: [
        { frequency, power: power[jp] },
        { frequency: second.frequency, power: second.power },
      ],
      ...out,
    };
  return {
    ...out,
    peak: {
      frequency,
      period: 1 / frequency,
      power: power[jp],
      amplitude: amp[jp],
    },
  };
}
