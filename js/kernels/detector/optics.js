// =============================================================================
// What a telescope's aperture and the air do to a point of light (TELESCOPES.md)
// -----------------------------------------------------------------------------
// The optics the detector kernel's frame model was missing: its point-spread
// function is one Gaussian of a stated width. Here the width comes from the
// telescope.
//
//   Airy        a circular aperture of diameter D, optionally with a central
//               obstruction of diameter e D, at wavelength lambda:
//                 I(x) = [2 J1(x)/x - e^2 2 J1(e x)/(e x)]^2 / (1 - e^2)^2,
//                 x = pi D theta / lambda, peak 1 (Born and Wolf, section 8.6)
//   Moffat      the seeing: M(r) = (b - 1)/(pi a^2) (1 + r^2/a^2)^-b with the
//               stated FWHM 2 a sqrt(2^(1/b) - 1) (Moffat 1969), b = 4.765 by
//               default (Trujillo et al. 2001)
//   combination the convolution of the two, as the product of their transfer
//               functions and an inverse Hankel transform. The Airy transfer
//               function is the autocorrelation of the (annular) pupil: circle
//               overlap areas. The Moffat one is
//               2/Gamma(b-1) (k a/2)^(b-1) K_(b-1)(k a), K by its integral.
//               The product is band-limited at D / lambda, so the Hankel
//               integral runs over a finite interval.
//
// And the plain arithmetic of a telescope: light-gathering power (collecting
// area), the plate scale from the focal length. The Rayleigh angle (the first
// dark ring of the pattern, a criterion for an ideal telescope) and the FWHM
// (the width of a profile) are different functions here on purpose: the
// panel shows both and the lesson is the difference.
//
// Angles are radians; ARCSEC_PER_RAD at the edges. Pure: no DOM. An input out of
// the domain throws OpticsError (a code and no number).
// =============================================================================

import { collectingArea } from './snr.js';

// Free globals are slow under Jest's vm; the local names are not.
const { Math, Float64Array, Number } = globalThis;

export const VERSION = '1.0.0';
export const ARCSEC_PER_RAD = 206264.80624709636;
/** The Moffat exponent of atmospheric turbulence (Trujillo et al. 2001), a stated teaching value. */
export const MOFFAT_BETA = 4.765;
/** The domain the validation holds (TELESCOPES.md); refusals are only for the impossible, not for outside this. */
export const DOMAIN = Object.freeze({
  apertureM: [0.02, 10],
  obstruction: [0, 0.9],
  wavelengthNm: [300, 2500],
  seeingArcsec: [0, 5],
  beta: [1.5, 10],
});

export class OpticsError extends Error {
  /** @param {string} code - input | obstruction | beta | seeing */
  constructor(code, message) {
    super(message);
    this.name = 'OpticsError';
    this.code = code;
  }
}

const pos = (v, name) => {
  if (typeof v !== 'number' || !Number.isFinite(v) || !(v > 0))
    throw new OpticsError('input', `${name} is a finite number above zero`);
  return v;
};
const obstructionOf = e => {
  if (typeof e !== 'number' || !Number.isFinite(e) || e < 0 || e >= 1)
    throw new OpticsError(
      'obstruction',
      'the obstruction is a fraction of the aperture’s diameter, from 0 to below 1'
    );
  return e;
};
const betaOf = b => {
  if (typeof b !== 'number' || !Number.isFinite(b) || !(b > 1))
    throw new OpticsError('beta', 'the Moffat exponent is above 1');
  return b;
};

// ---- Bessel functions -------------------------------------------------------------

/** J0 and J1: the power series below 12, Hankel's asymptotic series beyond (about 1e-13 absolute). */
function bessel(order, x) {
  const ax = Math.abs(x);
  if (ax < 12) {
    const q = -(ax * ax) / 4;
    let term = order === 0 ? 1 : ax / 2;
    let sum = term;
    for (let m = 1; m < 80; m++) {
      term *= q / (m * (m + order));
      sum += term;
      if (Math.abs(term) < 1e-18 * Math.abs(sum)) break;
    }
    return order === 1 && x < 0 ? -sum : sum;
  }
  const mu = 4 * order * order;
  let P = 1;
  let Q = 0;
  let term = 1;
  const e8 = 8 * ax;
  let prev = Infinity;
  for (let k = 1; k < 40; k++) {
    term *= (mu - (2 * k - 1) ** 2) / (k * e8);
    if (Math.abs(term) > prev) break;
    prev = Math.abs(term);
    const sign = Math.floor((k - 1) / 2) % 2 === 0 ? 1 : -1;
    if (k % 2) Q += sign * term;
    else P += (k % 4 === 0 ? 1 : -1) * term;
    if (prev < 1e-17) break;
  }
  const chi = ax - (order / 2 + 0.25) * Math.PI;
  const v =
    Math.sqrt(2 / (Math.PI * ax)) * (P * Math.cos(chi) - Q * Math.sin(chi));
  return order === 1 && x < 0 ? -v : v;
}
export const besselJ0 = x => bessel(0, x);
export const besselJ1 = x => bessel(1, x);

// ---- Gauss-Legendre nodes ------------------------------------------------------------

function gaussLegendre(n) {
  const x = new Float64Array(n);
  const w = new Float64Array(n);
  for (let i = 0; i < (n + 1) >> 1; i++) {
    let z = Math.cos((Math.PI * (i + 0.75)) / (n + 0.5));
    let pp = 1;
    for (let it = 0; it < 100; it++) {
      let p1 = 1;
      let p2 = 0;
      for (let j = 0; j < n; j++) {
        const p3 = p2;
        p2 = p1;
        p1 = ((2 * j + 1) * z * p2 - j * p3) / (j + 1);
      }
      pp = (n * (z * p1 - p2)) / (z * z - 1);
      const dz = p1 / pp;
      z -= dz;
      if (Math.abs(dz) < 1e-16) break;
    }
    x[i] = -z;
    x[n - 1 - i] = z;
    w[i] = w[n - 1 - i] = 2 / ((1 - z * z) * pp * pp);
  }
  return { x, w };
}
const GL = gaussLegendre(16);

/** The integral of f over [a, b] by composite 16-point Gauss-Legendre on panels no wider than `h`. */
function integrate(f, a, b, h) {
  const n = Math.max(1, Math.ceil((b - a) / h));
  const step = (b - a) / n;
  let s = 0;
  for (let p = 0; p < n; p++) {
    const lo = a + p * step;
    const mid = lo + step / 2;
    for (let i = 0; i < 16; i++) s += GL.w[i] * f(mid + (step / 2) * GL.x[i]);
  }
  return (s * step) / 2;
}

// ---- the Airy pattern ---------------------------------------------------------------------

/** Peak-1 intensity of the pattern at x = pi D theta / lambda, obstruction e. */
export function airyIntensity(x, e = 0) {
  const ax = Math.abs(x);
  if (ax < 1e-8) return 1;
  const a = (2 * besselJ1(ax)) / ax;
  const b = e > 0 ? (2 * besselJ1(e * ax)) / (e * ax) : 0;
  const amp = (a - e * e * b) / (1 - e * e);
  return amp * amp;
}

/** The root of g in [lo, hi] (a sign change) by bisection to 1e-15. */
function bisect(g, lo, hi) {
  let glo = g(lo);
  for (let i = 0; i < 200 && hi - lo > 1e-15 * Math.max(1, hi); i++) {
    const mid = 0.5 * (lo + hi);
    const gm = g(mid);
    if (glo * gm <= 0) hi = mid;
    else {
      lo = mid;
      glo = gm;
    }
  }
  return 0.5 * (lo + hi);
}

/** The nth dark ring (n = 1, 2, ...) in x: the nth positive root of J1(x) - e J1(e x). */
export function airyDarkRing(n = 1, e = 0) {
  obstructionOf(e);
  const g = x => besselJ1(x) - e * besselJ1(e * x);
  let found = 0;
  let x = 0.5;
  const dx = 0.02;
  let gx = g(x);
  while (x < 40 * n + 20) {
    const y = x + dx;
    const gy = g(y);
    if (gx * gy < 0 && ++found === n) return bisect(g, x, y);
    x = y;
    gx = gy;
  }
  throw new OpticsError('input', 'no dark ring found');
}

/** The x at which the pattern falls to half its peak (first crossing). */
export function airyHalfX(e = 0) {
  obstructionOf(e);
  return bisect(x => airyIntensity(x, e) - 0.5, 1e-6, airyDarkRing(1, e));
}

/** Encircled energy inside x: 1 - J0^2 - J1^2 for a clear aperture, else the integral of the intensity. */
export function airyEncircled(x, e = 0, { numeric = false } = {}) {
  obstructionOf(e);
  if (!(x > 0)) return 0;
  if (e === 0 && !numeric) {
    const j0 = besselJ0(x);
    const j1 = besselJ1(x);
    return 1 - j0 * j0 - j1 * j1;
  }
  return ((1 - e * e) / 2) * integrate(t => airyIntensity(t, e) * t, 0, x, 2);
}

// ---- the Moffat profile -----------------------------------------------------------------------

/** A Moffat profile of this FWHM (radians) and exponent. `intensity` integrates to 1 over the plane. */
export function moffat({ fwhm, beta = MOFFAT_BETA }) {
  betaOf(beta);
  if (typeof fwhm !== 'number' || !Number.isFinite(fwhm) || fwhm < 0)
    throw new OpticsError('seeing', 'the seeing FWHM is zero or more');
  const alpha = fwhm / (2 * Math.sqrt(2 ** (1 / beta) - 1));
  return {
    alpha,
    beta,
    fwhm,
    intensity: r =>
      ((beta - 1) / (Math.PI * alpha * alpha)) *
      (1 + (r * r) / (alpha * alpha)) ** -beta,
    encircled: r => 1 - (1 + (r * r) / (alpha * alpha)) ** (1 - beta),
  };
}
export const moffatFwhm = (alpha, beta) =>
  2 * alpha * Math.sqrt(2 ** (1 / beta) - 1);

const LANCZOS = [
  0.99999999999980993, 676.5203681218851, -1259.1392167224028,
  771.32342877765313, -176.61502916214059, 12.507343278686905,
  -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
];
/** The gamma function for x > 0 (Lanczos, about 1e-15 relative). */
function gamma(x) {
  if (x < 0.5) return Math.PI / (Math.sin(Math.PI * x) * gamma(1 - x));
  x -= 1;
  let a = LANCZOS[0];
  const t = x + 7.5;
  for (let i = 1; i < 9; i++) a += LANCZOS[i] / (x + i);
  return Math.sqrt(2 * Math.PI) * t ** (x + 0.5) * Math.exp(-t) * a;
}

/** K_nu(z) by the trapezoid rule on exp(-z cosh t) cosh(nu t) (exponentially convergent). */
function besselK(nu, z) {
  const h = 0.1;
  let sum = 0.5 * Math.exp(-z);
  for (let k = 1; k < 400; k++) {
    const t = k * h;
    const arg = -z * Math.cosh(t);
    if (arg + nu * t < -745) break;
    sum += Math.exp(arg) * Math.cosh(nu * t);
  }
  return sum * h;
}

/** The Moffat profile's transfer function at spatial frequency nu (cycles per radian). */
function moffatTransfer(nu, alpha, beta) {
  const z = 2 * Math.PI * nu * alpha;
  if (z < 1e-9) return 1;
  if (z > 700) return 0;
  const v = beta - 1;
  return (2 / gamma(v)) * (z / 2) ** v * besselK(v, z);
}

// ---- the Airy transfer function ---------------------------------------------------------------

/** The area of the overlap of two discs of radii r1 and r2 whose centres are d apart. */
function overlap(r1, r2, d) {
  if (d >= r1 + r2) return 0;
  if (d <= Math.abs(r1 - r2)) return Math.PI * Math.min(r1, r2) ** 2;
  const a1 = Math.acos((d * d + r1 * r1 - r2 * r2) / (2 * d * r1));
  const a2 = Math.acos((d * d + r2 * r2 - r1 * r1) / (2 * d * r2));
  const k = Math.sqrt(
    Math.max(0, (-d + r1 + r2) * (d + r1 - r2) * (d - r1 + r2) * (d + r1 + r2))
  );
  return r1 * r1 * a1 + r2 * r2 * a2 - 0.5 * k;
}
/** The pupil's autocorrelation at shift d in units of the pupil radius (0 to 2), obstruction e. */
function airyTransfer(d, e) {
  return (
    (overlap(1, 1, d) + overlap(e, e, d) - 2 * overlap(1, e, d)) /
    (Math.PI * (1 - e * e))
  );
}

// ---- the telescope's point-spread function ---------------------------------------------------

/** The optics of one telescope at one wavelength, with the seeing (a number of radians, or none). */
export function normalizeOptics(o = {}) {
  const apertureM = pos(o.apertureM, 'the aperture');
  const wavelengthM = pos(o.wavelengthM, 'the wavelength');
  const obstruction = obstructionOf(o.obstruction ?? 0);
  const seeingRad = o.seeingRad ?? 0;
  if (
    typeof seeingRad !== 'number' ||
    !Number.isFinite(seeingRad) ||
    seeingRad < 0
  )
    throw new OpticsError('seeing', 'the seeing FWHM is zero or more');
  const beta = betaOf(o.beta ?? MOFFAT_BETA);
  return { apertureM, wavelengthM, obstruction, seeingRad, beta };
}

/** The Rayleigh angle, radians: the first dark ring of the pattern, x1 lambda / (pi D). */
export function rayleighAngle(o) {
  const p = normalizeOptics(o);
  return (
    (airyDarkRing(1, p.obstruction) * p.wavelengthM) / (Math.PI * p.apertureM)
  );
}
/** The Airy pattern's own FWHM, radians (no seeing): a profile width, not a limit. */
export function airyFwhm(o) {
  const p = normalizeOptics(o);
  return (
    (2 * airyHalfX(p.obstruction) * p.wavelengthM) / (Math.PI * p.apertureM)
  );
}
/** lambda / D, radians. */
export const lambdaOverD = o => {
  const p = normalizeOptics(o);
  return p.wavelengthM / p.apertureM;
};

/**
 * The point-spread function of a telescope under seeing.
 *
 *   profile(theta)    intensity relative to the centre (peak 1)
 *   intensity(theta)  per steradian, integrating to 1 over the plane
 *   encircled(theta)  the fraction of the light inside theta
 *   fwhm              the FWHM of the combined profile, radians
 *   table(step, n)    intensity per steradian at theta = i step, i = 0..n
 */
export function opticsPsf(o) {
  const p = normalizeOptics(o);
  const { apertureM: D, wavelengthM: lam, obstruction: e, seeingRad, beta } = p;
  const lamD = lam / D;
  const nuC = D / lam;
  const airy = x => airyIntensity(x, e);
  const xOf = theta => (Math.PI * D * theta) / lam;
  const peakAiry = (Math.PI * D * D * (1 - e * e)) / (4 * lam * lam);
  const seeing = seeingRad > 0 ? moffat({ fwhm: seeingRad, beta }) : null;
  const airyHalf = airyHalfX(e);
  const out = {
    ...p,
    seeing,
    rayleigh: (airyDarkRing(1, e) * lam) / (Math.PI * D),
    airyFwhm: (2 * airyHalf * lam) / (Math.PI * D),
    lambdaOverD: lamD,
  };

  if (!seeing) {
    out.profile = theta => airy(xOf(theta));
    out.intensity = theta => peakAiry * airy(xOf(theta));
    out.encircled = theta => airyEncircled(xOf(theta), e);
    out.fwhm = out.airyFwhm;
    out.peak = peakAiry;
    out.table = (step, n) =>
      Float64Array.from(
        { length: n + 1 },
        (_, i) => peakAiry * airy(xOf(i * step))
      );
    return Object.freeze(out);
  }

  // Frequencies beyond which the Moffat transfer function has died (k alpha = 40): the band limit is the lesser.
  const nuMax = Math.min(nuC, 40 / (2 * Math.PI * seeing.alpha));
  const kinks = [
    (1 - e) * nuC * 0.5,
    2 * e * nuC * 0.5,
    (1 + e) * nuC * 0.5,
    nuC,
  ]
    .filter(v => v > 0 && v < nuMax)
    .sort((a, b) => a - b);
  const transfer = nu =>
    airyTransfer((2 * nu) / nuC, e) * moffatTransfer(nu, seeing.alpha, beta);
  /** Nodes and weights for reach theta_max: panels narrower than a quarter of the fastest oscillation. */
  const nodesCache = new Map();
  const nodesFor = reach => {
    const key = Math.max(1, Math.ceil(Math.log2(reach / lamD)));
    if (nodesCache.has(key)) return nodesCache.get(key);
    const R = lamD * 2 ** key;
    const panelWidth = 3 / R;
    const edges = [0, ...kinks, nuMax];
    const nu = [];
    const w = [];
    const t = [];
    for (let k = 0; k + 1 < edges.length; k++) {
      const a = edges[k];
      const b = edges[k + 1];
      if (!(b > a)) continue;
      const n = Math.max(1, Math.ceil((b - a) / panelWidth));
      const step = (b - a) / n;
      for (let q = 0; q < n; q++) {
        const mid = a + (q + 0.5) * step;
        for (let i = 0; i < 16; i++) {
          const v = mid + (step / 2) * GL.x[i];
          nu.push(v);
          w.push((GL.w[i] * step) / 2);
          t.push(transfer(v));
        }
      }
    }
    const r = {
      nu: Float64Array.from(nu),
      w: Float64Array.from(w),
      T: Float64Array.from(t),
    };
    nodesCache.set(key, r);
    return r;
  };
  const base = lamD * 4 + seeingRad * 4;
  /** Intensity per steradian at theta (inverse Hankel transform of the transfer function). */
  const intensity = theta => {
    const { nu, w, T } = nodesFor(Math.max(theta, base));
    let s = 0;
    for (let i = 0; i < nu.length; i++)
      s += w[i] * T[i] * nu[i] * besselJ0(2 * Math.PI * nu[i] * theta);
    return 2 * Math.PI * s;
  };
  const peak = intensity(0);
  out.peak = peak;
  out.intensity = intensity;
  out.profile = theta => intensity(theta) / peak;
  out.encircled = theta => {
    if (!(theta > 0)) return 0;
    const { nu, w, T } = nodesFor(Math.max(theta, base));
    let s = 0;
    for (let i = 0; i < nu.length; i++)
      s += w[i] * T[i] * besselJ1(2 * Math.PI * nu[i] * theta);
    return 2 * Math.PI * theta * s;
  };
  let hi = Math.max(out.airyFwhm, seeingRad) * 2;
  while (out.profile(hi) > 0.5) hi *= 2;
  out.fwhm = 2 * bisect(t => out.profile(t) - 0.5, 0, hi);
  out.table = (step, n) => {
    const { nu, w, T } = nodesFor(Math.max(step * n, base));
    const v = new Float64Array(n + 1);
    for (let k = 0; k <= n; k++) {
      let s = 0;
      const th = 2 * Math.PI * k * step;
      for (let i = 0; i < nu.length; i++)
        s += w[i] * T[i] * nu[i] * besselJ0(th * nu[i]);
      v[k] = 2 * Math.PI * s;
    }
    return v;
  };
  return Object.freeze(out);
}

/**
 * Two equal point sources `separation` radians apart, on a line: the summed profile's value midway between
 * them over its largest value along the line (1 when it has no dip), and the dip 1 - that.
 * At the Rayleigh angle of a clear aperture the midpoint is 0.7350 of the peak.
 */
export function pairDip(psf, separation) {
  if (
    typeof separation !== 'number' ||
    !Number.isFinite(separation) ||
    separation < 0
  )
    throw new OpticsError('input', 'the separation is zero or more');
  const a = separation / 2;
  const S = s => psf.profile(Math.abs(s - a)) + psf.profile(Math.abs(s + a));
  const mid = S(0);
  // The largest value on s >= 0: scan, then refine by golden section around the best sample.
  const top = a + Math.max(psf.fwhm, 1e-12);
  const n = 160;
  let best = 0;
  let bestS = mid;
  for (let i = 1; i <= n; i++) {
    const s = (top * i) / n;
    const v = S(s);
    if (v > bestS) {
      bestS = v;
      best = s;
    }
  }
  if (best > 0) {
    let lo = Math.max(0, best - top / n);
    let hiS = Math.min(top, best + top / n);
    const g = (Math.sqrt(5) - 1) / 2;
    let c = hiS - g * (hiS - lo);
    let d = lo + g * (hiS - lo);
    for (let i = 0; i < 60; i++) {
      if (S(c) > S(d)) hiS = d;
      else lo = c;
      c = hiS - g * (hiS - lo);
      d = lo + g * (hiS - lo);
    }
    bestS = Math.max(bestS, S(0.5 * (lo + hiS)));
  }
  const ratio = mid / bestS;
  return { midpoint: mid, peak: bestS, ratio, dip: 1 - ratio };
}

// ---- the plain arithmetic of a telescope -------------------------------------------------------

/** Collecting area, square metres, of an aperture of diameter D with a central obstruction e D (snr.js's, checked). */
export const collectingAreaM2 = (apertureM, obstruction = 0) =>
  collectingArea(pos(apertureM, 'the aperture'), obstructionOf(obstruction));

/** Light-gathering power of a telescope relative to a reference aperture: the ratio of collecting areas. */
export function lightGathering(
  { apertureM, obstruction = 0 },
  { apertureM: refM, obstruction: refE = 0 }
) {
  return (
    collectingAreaM2(apertureM, obstruction) / collectingAreaM2(refM, refE)
  );
}
/** The dark-adapted eye's pupil, metres: the reference the lesson's "times the eye" uses (a stated round value). */
export const EYE_PUPIL_M = 0.007;

/** The focal length, metres, from the focal ratio. */
export const focalLengthM = (apertureM, focalRatio) =>
  pos(apertureM, 'the aperture') * pos(focalRatio, 'the focal ratio');
/** The plate scale: arcseconds on the sky per metre in the focal plane. */
export const plateScaleArcsecPerM = focalLength =>
  ARCSEC_PER_RAD / pos(focalLength, 'the focal length');
/** Arcseconds of sky per pixel of this pitch (metres) at this focal length (metres). */
export const pixelScaleArcsec = (focalLength, pixelM) =>
  plateScaleArcsecPerM(focalLength) * pos(pixelM, 'the pixel pitch');

export const toArcsec = rad => rad * ARCSEC_PER_RAD;
export const toRad = arcsec => arcsec / ARCSEC_PER_RAD;
