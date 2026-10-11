// =============================================================================
// A sinusoid through a differential light curve
// -----------------------------------------------------------------------------
// y(t) = c + a sin(2 pi t / P) + b cos(2 pi t / P), weighted least squares for
// c, a and b at a trial period P; the amplitude is sqrt(a^2 + b^2) and its error
// follows from the covariance of the fit (propagated through a and b). The
// period is found by scanning trial periods for the smallest chi-square and
// refining with a golden-section search. A sinusoid is a model: a real
// variable's curve has harmonics, and the chi-square per degree of freedom says
// when this one is not enough.
//
// Pure: no DOM.
// =============================================================================

// Free globals are slow under Jest's vm; the local names are not.
const { Math, Float64Array } = globalThis;

export const VERSION = '1.0.0';

/** Weighted fit at one period. @returns {{c, a, b, amplitude, sigmaAmplitude, sigmaC, chi2, dof, phase}} */
export function fitSinusoid(t, y, sigma, period) {
  const n = t.length;
  // Normal equations for [c, a, b].
  const A = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];
  const v = [0, 0, 0];
  const w = Float64Array.from(sigma, s => 1 / (s * s));
  const basis = new Float64Array(3);
  for (let i = 0; i < n; i++) {
    const arg = (2 * Math.PI * t[i]) / period;
    basis[0] = 1;
    basis[1] = Math.sin(arg);
    basis[2] = Math.cos(arg);
    for (let r = 0; r < 3; r++) {
      v[r] += w[i] * basis[r] * y[i];
      for (let c = 0; c < 3; c++) A[r][c] += w[i] * basis[r] * basis[c];
    }
  }
  const inv = invert3(A);
  const [c, a, b] = [0, 1, 2].map(
    r => inv[r][0] * v[0] + inv[r][1] * v[1] + inv[r][2] * v[2]
  );
  let chi2 = 0;
  for (let i = 0; i < n; i++) {
    const arg = (2 * Math.PI * t[i]) / period;
    const r = (y[i] - (c + a * Math.sin(arg) + b * Math.cos(arg))) / sigma[i];
    chi2 += r * r;
  }
  const amplitude = Math.hypot(a, b);
  // d amp = (a da + b db) / amp: variance by the 2 x 2 block of the covariance.
  const va = inv[1][1];
  const vb = inv[2][2];
  const vab = inv[1][2];
  const sigmaAmplitude =
    amplitude > 0
      ? Math.sqrt(
          (a * a * va + b * b * vb + 2 * a * b * vab) / (amplitude * amplitude)
        )
      : Math.sqrt(Math.max(va, vb));
  return {
    c,
    a,
    b,
    amplitude,
    sigmaAmplitude,
    sigmaC: Math.sqrt(inv[0][0]),
    chi2,
    dof: n - 3,
    // Time of the first maximum after t = 0, in days.
    phase: (((Math.atan2(a, b) / (2 * Math.PI)) % 1) + 1) % 1,
  };
}

function invert3(m) {
  const [[a, b, c], [d, e, f], [g, h, i]] = m;
  const A = e * i - f * h;
  const B = -(d * i - f * g);
  const C = d * h - e * g;
  const det = a * A + b * B + c * C;
  return [
    [A / det, -(b * i - c * h) / det, (b * f - c * e) / det],
    [B / det, (a * i - c * g) / det, -(a * f - c * d) / det],
    [C / det, -(a * h - b * g) / det, (a * e - b * d) / det],
  ];
}

/**
 * The period of the smallest chi-square between two limits, by a grid in
 * frequency (finer than 1 / (4 baseline)) and a golden-section refinement.
 */
export function scanPeriod(t, y, sigma, { minPeriod, maxPeriod }) {
  const baseline = t[t.length - 1] - t[0];
  const df = 1 / (8 * baseline);
  const f0 = 1 / maxPeriod;
  const f1 = 1 / minPeriod;
  let best = { f: f0, chi2: Infinity };
  for (let f = f0; f <= f1; f += df) {
    const r = fitSinusoid(t, y, sigma, 1 / f);
    if (r.chi2 < best.chi2) best = { f, chi2: r.chi2 };
  }
  let lo = Math.max(f0, best.f - df);
  let hi = Math.min(f1, best.f + df);
  const g = (Math.sqrt(5) - 1) / 2;
  const chi = f => fitSinusoid(t, y, sigma, 1 / f).chi2;
  let x1 = hi - g * (hi - lo);
  let x2 = lo + g * (hi - lo);
  let f1v = chi(x1);
  let f2v = chi(x2);
  for (let k = 0; k < 40; k++) {
    if (f1v < f2v) {
      hi = x2;
      x2 = x1;
      f2v = f1v;
      x1 = hi - g * (hi - lo);
      f1v = chi(x1);
    } else {
      lo = x1;
      x1 = x2;
      f1v = f2v;
      x2 = lo + g * (hi - lo);
      f2v = chi(x2);
    }
  }
  const period = 1 / ((lo + hi) / 2);
  return { period, ...fitSinusoid(t, y, sigma, period) };
}

/** The standard deviation of a list. */
export function scatter(a) {
  let m = 0;
  for (const v of a) m += v;
  m /= a.length;
  let s = 0;
  for (const v of a) s += (v - m) * (v - m);
  return Math.sqrt(s / (a.length - 1));
}
