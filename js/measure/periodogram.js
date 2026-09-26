// =============================================================================
// A period search for teaching-sized series: the generalized Lomb-Scargle
// -----------------------------------------------------------------------------
// Zechmeister & Kürster 2009, A&A 496, 577 (the "GLS"): a sinusoid plus a
// floating mean, fitted by weighted least squares at every trial frequency,
// its power the fraction of the weighted variance the sinusoid explains
// (0 to 1). With no uncertainties every point weighs the same, and the
// result says so.
//
// What it reports, and what kind of number each is:
//
//   period, power      MEASURED: the highest peak of the grid, refined
//   periodError        DERIVED, under ASSUMPTIONS: sigma_f = sqrt(6/N) *
//                      sigma / (pi T A), the least-squares error of a
//                      sinusoid's frequency in white noise (Montgomery &
//                      O'Donoghue 1999, DSSN 13, 28, eq. 9). A non-sinusoidal
//                      signal or red noise makes it too small, and it says so
//   falseAlarm         DERIVED: Baluev 2008 (MNRAS 385, 1279) for the
//                      standard GLS normalization, the probability that noise
//                      alone gives a peak this high somewhere in the band -
//                      an upper bound, good where it is small
//
// For a transit, whose signal is a short dip rather than a sinusoid, the box
// search does the same job (searchBox): box least squares, Kovacs, Zucker &
// Mazeh 2002 (A&A 391, 369), each trial period folded and binned, the power
// the box's signal residue. Its significance is the signal detection
// efficiency, (peak - mean) / standard deviation of the spectrum (DERIVED;
// KZM's SDE, no false-alarm probability claimed).
//
// Bounded: the grid is N x M cosine-sine pairs, and the product is capped
// (LIMITS.work) so the search stays teaching-sized on a low-end device. It
// yields to the page about every 12 ms of work, so the page keeps drawing and
// a Cancel is heard within a frame, reports progress, and stops when its
// signal aborts.
// =============================================================================

export const VERSION = '1.0.0';

export const LIMITS = Object.freeze({
  points: 20_000,
  frequencies: 50_000,
  work: 40_000_000, // points x frequencies
  oversample: 5,
});

export class PeriodSearchError extends Error {
  constructor(code, message, detail = {}) {
    super(message);
    this.name = 'PeriodSearchError';
    this.code = code;
    this.detail = detail;
  }
}

/** ln Γ(x), Lanczos (g = 7, n = 9): 15 digits for x > 0. */
export function lnGamma(x) {
  const g = 7;
  const c = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028,
    771.32342877765313, -176.61502916214059, 12.507343278686905,
    -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
  ];
  if (x < 0.5)
    return Math.log(Math.PI / Math.sin(Math.PI * x)) - lnGamma(1 - x);
  x -= 1;
  let a = c[0];
  const t = x + g + 0.5;
  for (let i = 1; i < g + 2; i++) a += c[i] / (x + i);
  return (
    0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a)
  );
}

/** Normalized weights, and the weighted mean and variance of the times. */
function prepare(t, y, dy) {
  const n = t.length;
  const w = new Float64Array(n);
  let W = 0;
  for (let i = 0; i < n; i++) {
    w[i] = dy ? 1 / (dy[i] * dy[i]) : 1;
    W += w[i];
  }
  let Y = 0;
  let tm = 0;
  for (let i = 0; i < n; i++) {
    w[i] /= W;
    Y += w[i] * y[i];
    tm += w[i] * t[i];
  }
  let YY = 0;
  let Dt = 0;
  for (let i = 0; i < n; i++) {
    YY += w[i] * (y[i] - Y) * (y[i] - Y);
    Dt += w[i] * (t[i] - tm) * (t[i] - tm);
  }
  return { w, Y, YY, Dt, tm };
}

/** The GLS power at one angular frequency, and the fit's coefficients. */
function power1(t, y, p, omega) {
  const { w, Y, YY, tm } = p;
  let C = 0;
  let S = 0;
  let YCh = 0;
  let YSh = 0;
  let CCh = 0;
  let SSh = 0;
  let CSh = 0;
  for (let i = 0; i < t.length; i++) {
    const x = omega * (t[i] - tm);
    const c = Math.cos(x);
    const s = Math.sin(x);
    const wi = w[i];
    C += wi * c;
    S += wi * s;
    YCh += wi * y[i] * c;
    YSh += wi * y[i] * s;
    CCh += wi * c * c;
    CSh += wi * c * s;
    SSh += wi * s * s;
  }
  const YC = YCh - Y * C;
  const YS = YSh - Y * S;
  const CC = CCh - C * C;
  const SS = SSh - S * S;
  const CS = CSh - C * S;
  const D = CC * SS - CS * CS;
  if (!(D > 0) || !(YY > 0)) return { power: 0, a: 0, b: 0 };
  const a = (YC * SS - YS * CS) / D;
  const b = (YS * CC - YC * CS) / D;
  const power = (SS * YC * YC + CC * YS * YS - 2 * CS * YC * YS) / (YY * D);
  return { power: Math.min(1, Math.max(0, power)), a, b };
}

/**
 * Baluev 2008's false-alarm probability for the standard normalization, as
 * astropy implements it (fap_baluev, dH = 1, dK = 3).
 * @param {number} z - The peak's power, 0 to 1
 * @param {number} n - Points
 * @param {number} fmax - Highest frequency searched, in 1/time
 * @param {number} Dt - Weighted variance of the times
 */
export function falseAlarm(z, n, fmax, Dt) {
  if (!(z > 0)) return 1;
  if (z >= 1) return 0;
  const NH = n - 1;
  const NK = n - 3;
  const single = Math.pow(1 - z, 0.5 * NK);
  const gammaNH =
    Math.sqrt(2 / NH) * Math.exp(lnGamma(NH / 2) - lnGamma((NH - 1) / 2));
  const W = fmax * Math.sqrt(4 * Math.PI * Dt);
  const tau =
    gammaNH * W * Math.pow(1 - z, 0.5 * (NK - 1)) * Math.sqrt(0.5 * NH * z);
  const fap = 1 - (1 - single) * Math.exp(-tau);
  return Math.min(1, Math.max(0, fap));
}

const tick = () => new Promise(r => setTimeout(r, 0));
const clock = () => globalThis.performance?.now() ?? Date.now();
/** A yield when about 12 ms of work have passed since the last one. */
function pacer() {
  let last = clock();
  return async () => {
    if (clock() - last < 12) return false;
    await tick();
    last = clock();
    return true;
  };
}

/**
 * @param {{t: ArrayLike<number>, y: ArrayLike<number>,
 *   dy?: ArrayLike<number>|null}} data - Finite values only, dy > 0 if given
 * @param {{minPeriod: number, maxPeriod: number, oversample?: number,
 *   signal?: AbortSignal, onProgress?: (f: number) => void}} opts - Periods
 *   in the time unit of t
 * @returns {Promise<{version: string, period: number, power: number,
 *   periodError: number, falseAlarm: number, amplitude: number,
 *   grid: {periods: Float64Array, power: Float64Array}, n: number,
 *   baseline: number, weighted: boolean, warnings: object[]}>}
 */
export async function searchPeriod(data, opts) {
  const { t, y, dy = null } = data;
  const n = t.length;
  const {
    minPeriod,
    maxPeriod,
    oversample = LIMITS.oversample,
    signal,
    onProgress,
  } = opts;
  if (n < 5)
    throw new PeriodSearchError(
      'tooFew',
      `${n} points; a period search needs at least 5`,
      { n }
    );
  if (n > LIMITS.points)
    throw new PeriodSearchError(
      'tooMany',
      `${n} points; the limit is ${LIMITS.points}`,
      { n, max: LIMITS.points }
    );
  if (!(minPeriod > 0 && maxPeriod > minPeriod))
    throw new PeriodSearchError('range', 'the period range is not a range', {
      minPeriod,
      maxPeriod,
    });
  let t0 = Infinity;
  let t1 = -Infinity;
  for (let i = 0; i < n; i++) {
    if (
      !Number.isFinite(t[i]) ||
      !Number.isFinite(y[i]) ||
      (dy && !(dy[i] > 0))
    )
      throw new PeriodSearchError(
        'notFinite',
        `row ${i + 1} is not a finite value with a positive error`,
        { row: i + 1 }
      );
    t0 = Math.min(t0, t[i]);
    t1 = Math.max(t1, t[i]);
  }
  const T = t1 - t0;
  if (!(T > 0))
    throw new PeriodSearchError('noBaseline', 'all the points are at one time');
  const fmin = 1 / maxPeriod;
  const fmax = 1 / minPeriod;
  const df = 1 / (oversample * T);
  const m = Math.floor((fmax - fmin) / df) + 1;
  if (m > LIMITS.frequencies || n * m > LIMITS.work)
    throw new PeriodSearchError(
      'tooLarge',
      `${m} trial frequencies for ${n} points is more than this search does`,
      {
        frequencies: m,
        max: Math.min(LIMITS.frequencies, Math.floor(LIMITS.work / n)),
      }
    );

  const p = prepare(t, y, dy);
  const periods = new Float64Array(m);
  const power = new Float64Array(m);
  const pace = pacer();
  let best = 0;
  for (let k = 0; k < m; k++) {
    const f = fmin + k * df;
    periods[k] = 1 / f;
    power[k] = power1(t, y, p, 2 * Math.PI * f).power;
    if (power[k] > power[best]) best = k;
    if ((k & 15) === 15 && (await pace())) {
      onProgress?.((k + 1) / m);
      if (signal?.aborted) throw new PeriodSearchError('canceled', 'canceled');
    }
  }
  onProgress?.(1);

  // Refine the peak by golden-section search within one grid step.
  let lo = fmin + Math.max(0, best - 1) * df;
  let hi = fmin + Math.min(m - 1, best + 1) * df;
  const at = f => power1(t, y, p, 2 * Math.PI * f).power;
  const gr = (Math.sqrt(5) - 1) / 2;
  let c = hi - gr * (hi - lo);
  let d = lo + gr * (hi - lo);
  for (let i = 0; i < 60; i++) {
    if (at(c) > at(d)) hi = d;
    else lo = c;
    c = hi - gr * (hi - lo);
    d = lo + gr * (hi - lo);
  }
  const f = (lo + hi) / 2;
  const fit = power1(t, y, p, 2 * Math.PI * f);
  const amplitude = Math.hypot(fit.a, fit.b);
  // The residual scatter about the fitted sinusoid, in y's unit.
  let ss = 0;
  let sw = 0;
  const omega = 2 * Math.PI * f;
  const yMean = p.Y;
  let off = 0;
  // Offset of the floating mean: y ~ off + a cos + b sin, with the weighted
  // means taken out; recover it from the weighted means.
  {
    let C = 0;
    let S = 0;
    for (let i = 0; i < n; i++) {
      C += p.w[i] * Math.cos(omega * (t[i] - p.tm));
      S += p.w[i] * Math.sin(omega * (t[i] - p.tm));
    }
    off = yMean - fit.a * C - fit.b * S;
  }
  for (let i = 0; i < n; i++) {
    const x = omega * (t[i] - p.tm);
    const r = y[i] - (off + fit.a * Math.cos(x) + fit.b * Math.sin(x));
    ss += p.w[i] * r * r;
    sw += p.w[i];
  }
  const sigma = Math.sqrt((ss / sw) * (n / Math.max(1, n - 3)));
  const sigmaF =
    amplitude > 0
      ? (Math.sqrt(6 / n) * sigma) / (Math.PI * T * amplitude)
      : Infinity;
  const periodError = sigmaF / (f * f);
  const fap = falseAlarm(fit.power, n, fmax, p.Dt);

  const warnings = [];
  if (!dy) warnings.push({ code: 'unweighted' });
  if (fap > 0.01) warnings.push({ code: 'notSignificant', falseAlarm: fap });
  if (best === 0 || best === m - 1) warnings.push({ code: 'atEdge' });
  if (1 / f > T / 2) warnings.push({ code: 'fewCycles', cycles: T * f });
  warnings.push({ code: 'errorAssumesSinusoid' });

  return {
    version: VERSION,
    method: 'gls',
    period: 1 / f,
    frequency: f,
    power: fit.power,
    periodError,
    falseAlarm: fap,
    amplitude,
    residualScatter: sigma,
    grid: { periods, power },
    n,
    baseline: T,
    frequencyStep: df,
    weighted: Boolean(dy),
    warnings,
  };
}

/**
 * Box least squares over a period range, for dips (transits, eclipses).
 * @param {{t: ArrayLike<number>, y: ArrayLike<number>,
 *   dy?: ArrayLike<number>|null}} data
 * @param {{minPeriod: number, maxPeriod: number, durations: number[],
 *   signal?: AbortSignal, onProgress?: (f: number) => void}} opts - Periods
 *   and durations in t's unit
 */
export async function searchBox(data, opts) {
  const { t, y, dy = null } = data;
  const n = t.length;
  const { minPeriod, maxPeriod, durations, signal, onProgress } = opts;
  if (n < 10)
    throw new PeriodSearchError(
      'tooFew',
      `${n} points; a box search needs at least 10`,
      { n }
    );
  if (n > LIMITS.points)
    throw new PeriodSearchError(
      'tooMany',
      `${n} points; the limit is ${LIMITS.points}`,
      { n, max: LIMITS.points }
    );
  if (!(minPeriod > 0 && maxPeriod > minPeriod))
    throw new PeriodSearchError('range', 'the period range is not a range', {
      minPeriod,
      maxPeriod,
    });
  if (!(durations?.length && durations.every(d => d > 0 && d < minPeriod)))
    throw new PeriodSearchError(
      'durations',
      'each trial duration must be positive and shorter than the shortest period'
    );
  let t0 = Infinity;
  let t1 = -Infinity;
  for (let i = 0; i < n; i++) {
    if (
      !Number.isFinite(t[i]) ||
      !Number.isFinite(y[i]) ||
      (dy && !(dy[i] > 0))
    )
      throw new PeriodSearchError(
        'notFinite',
        `row ${i + 1} is not a finite value with a positive error`,
        { row: i + 1 }
      );
    t0 = Math.min(t0, t[i]);
    t1 = Math.max(t1, t[i]);
  }
  const T = t1 - t0;
  const dmin = Math.min(...durations);
  // A step that moves a transit at the far end of the series by a quarter of
  // the shortest duration.
  const dP = (dmin / 4) * (minPeriod / T);
  const m = Math.floor((maxPeriod - minPeriod) / dP) + 1;
  const binsAt = P => Math.max(8, Math.ceil(P / (dmin / 4)));
  if (m > LIMITS.frequencies || n * m > LIMITS.work)
    throw new PeriodSearchError(
      'tooLarge',
      `${m} trial periods for ${n} points is more than this search does`,
      {
        frequencies: m,
        max: Math.min(LIMITS.frequencies, Math.floor(LIMITS.work / n)),
      }
    );
  const w = Float64Array.from({ length: n }, (_, i) =>
    dy ? 1 / (dy[i] * dy[i]) : 1
  );
  let W = 0;
  let Wy = 0;
  for (let i = 0; i < n; i++) {
    W += w[i];
    Wy += w[i] * y[i];
  }
  const mean = Wy / W;
  /** The strongest box at one period: its signal residue and where it is. */
  const atPeriod = P => {
    const nb = binsAt(P);
    const sw = new Float64Array(nb);
    const swy = new Float64Array(nb);
    for (let i = 0; i < n; i++) {
      const ph = ((((t[i] - t0) / P) % 1) + 1) % 1;
      const b = Math.min(nb - 1, Math.floor(ph * nb));
      sw[b] += w[i];
      swy[b] += w[i] * (y[i] - mean);
    }
    let top = null;
    for (const D of durations) {
      const q = Math.max(1, Math.round((D / P) * nb));
      let a = 0;
      let c = 0;
      for (let b = 0; b < q; b++) {
        a += sw[b];
        c += swy[b];
      }
      for (let b = 0; b < nb; b++) {
        if (a > 0 && a < W && c < 0) {
          // Signal residue (KZM eq. 5), in the weighted form.
          const sr = (c * c) / (a * (1 - a / W));
          if (!top || sr > top.sr)
            top = {
              sr,
              P,
              D,
              epoch: t0 + ((b + q / 2) / nb) * P,
              depth: -c / a / (1 - a / W),
            };
        }
        a += sw[(b + q) % nb] - sw[b];
        c += swy[(b + q) % nb] - swy[b];
      }
    }
    return top;
  };
  const periods = new Float64Array(m);
  const power = new Float64Array(m);
  let best = null;
  const pace = pacer();
  for (let k = 0; k < m; k++) {
    const P = minPeriod + k * dP;
    periods[k] = P;
    const top = atPeriod(P);
    power[k] = top?.sr ?? 0;
    if (top && (!best || top.sr > best.sr)) best = top;
    if ((k & 15) === 15 && (await pace())) {
      onProgress?.((k + 1) / m);
      if (signal?.aborted) throw new PeriodSearchError('canceled', 'canceled');
    }
  }
  // Refine: the grid step limits the period; a twentieth of it around the
  // peak does not change the spectrum's statistics, only where its top is.
  if (best) {
    for (let k = -40; k <= 40; k++) {
      const P = best.P + (k * dP) / 20;
      if (P < minPeriod || P > maxPeriod) continue;
      const top = atPeriod(P);
      if (top && top.sr > best.sr) best = top;
    }
  }
  onProgress?.(1);
  let sum = 0;
  let sum2 = 0;
  for (let k = 0; k < m; k++) {
    sum += power[k];
    sum2 += power[k] * power[k];
  }
  const mu = sum / m;
  const sd = Math.sqrt(Math.max(0, sum2 / m - mu * mu));
  const sde = best && sd > 0 ? (best.sr - mu) / sd : 0;
  const warnings = [];
  if (!dy) warnings.push({ code: 'unweighted' });
  if (sde < 7) warnings.push({ code: 'weakDetection', sde });
  warnings.push({ code: 'noPeriodError' });
  if (best && best.P > T / 2)
    warnings.push({ code: 'fewCycles', cycles: T / best.P });
  return {
    version: VERSION,
    method: 'bls',
    period: best?.P ?? null,
    epoch: best?.epoch ?? null,
    duration: best?.D ?? null,
    depth: best?.depth ?? null,
    sde,
    grid: { periods, power },
    n,
    baseline: T,
    periodStep: dP,
    weighted: Boolean(dy),
    warnings,
  };
}
