// =============================================================================
// The spectrograph kernel: the line-spread function, the pixel integral and sampling
// (Prompt 213, SPECTROGRAPH.md)
// -----------------------------------------------------------------------------
// A slit spectrograph spreads a monochromatic line into a profile, the line-spread
// function (LSF). Here it is a Gaussian of a stated FWHM that is the same at every
// wavelength (a slit-limited grating instrument), so the resolving power
// R = lambda / FWHM changes along the detector. A pixel does not sample the profile at
// its centre, it integrates it: the exact area of a Gaussian over a pixel is computed
// from erf and erfc, so flux is conserved at any sampling and an undersampled line is
// still the right number.
//
//   DEFINED     the FWHM, the sigma (FWHM / 2.35482), R, the sampling (FWHM in pixels)
//   DERIVED     the pixel area of a Gaussian, the sampling at a pixel, the criterion
//   ASSUMED     a Gaussian profile, constant width in wavelength (SPECTROGRAPH.md)
//
// Wavelengths are nm, pixel coordinates are in pixels with the pixel i spanning
// i - 1/2 to i + 1/2. Pure: no DOM, no clock; erf is evaluated here (no import) in
// double precision: a series below 2.5 and a continued fraction above.
// =============================================================================

const { Math, Number } = globalThis;

/** FWHM of a Gaussian over its sigma: 2 sqrt(2 ln 2). */
export const FWHM_PER_SIGMA = 2 * Math.sqrt(2 * Math.LN2);
/** The sampling criterion: at least this many pixels per FWHM (Nyquist). */
export const SAMPLING_CRITERION = 2;
/** Below this many pixels per FWHM a line's width and centre are not separately fixed. */
export const SAMPLING_FLOOR = 1;

const SQRT2 = Math.SQRT2;
const TWO_OVER_SQRT_PI = 2 / Math.sqrt(Math.PI);

/** The sigma of a Gaussian of a given FWHM. */
export const sigmaFromFwhm = fwhm => fwhm / FWHM_PER_SIGMA;
/** The FWHM of a Gaussian of a given sigma. */
export const fwhmFromSigma = sigma => sigma * FWHM_PER_SIGMA;
/** R = lambda / FWHM (the same units for both). */
export const resolvingPower = (lambdaNm, fwhmNm) => lambdaNm / fwhmNm;
/** The FWHM that gives a resolving power R at a wavelength. */
export const fwhmFromResolvingPower = (lambdaNm, R) => lambdaNm / R;

/** erf(x) for 0 <= x < 2.5 by the all-positive series 2/sqrt(pi) e^-x^2 sum 2^n x^(2n+1) / (2n+1)!!. */
function erfSeries(x) {
  let term = x;
  let sum = x;
  for (let n = 1; n < 200; n++) {
    term *= (2 * x * x) / (2 * n + 1);
    sum += term;
    if (term < 1e-17 * sum) break;
  }
  return TWO_OVER_SQRT_PI * Math.exp(-x * x) * sum;
}

/** erfc(x) for x >= 2.5 by the continued fraction (modified Lentz), relative error near 1e-15. */
function erfcTail(x) {
  // erfc(x) = exp(-x^2) / sqrt(pi) * 1 / (x + (1/2) / (x + 1 / (x + (3/2) / (x + 2 / (x + ...)))))
  const tiny = 1e-300;
  let f = x;
  let C = x;
  let D = 0;
  for (let n = 1; n < 500; n++) {
    const a = n / 2;
    D = x + a * D;
    D = D === 0 ? tiny : D;
    C = x + a / C;
    C = C === 0 ? tiny : C;
    D = 1 / D;
    const delta = C * D;
    f *= delta;
    if (Math.abs(delta - 1) < 1e-16) break;
  }
  return Math.exp(-x * x) / (Math.sqrt(Math.PI) * f);
}

/** erf, double precision. */
export function erf(x) {
  if (Number.isNaN(x)) return NaN;
  const a = Math.abs(x);
  const v = a < 2.5 ? erfSeries(a) : 1 - erfcTail(a);
  return x < 0 ? -v : v;
}

/** erfc, double precision, keeping its digits in the upper tail. */
export function erfc(x) {
  if (Number.isNaN(x)) return NaN;
  if (x >= 2.5) return erfcTail(x);
  if (x <= -2.5) return 2 - erfcTail(-x);
  return 1 - erf(x);
}

/**
 * The area of a unit-area Gaussian (centre mu, sigma) over [a, b]: erf in the bulk, erfc on either tail so the
 * difference of two tiny numbers keeps its digits. Zero for a non-positive sigma never occurs (a RangeError).
 */
export function gaussianArea(mu, sigma, a, b) {
  if (!(sigma > 0)) throw new RangeError('sigma must be positive');
  const za = (a - mu) / sigma;
  const zb = (b - mu) / sigma;
  if (Math.min(za, zb) > 0) return 0.5 * (erfc(za / SQRT2) - erfc(zb / SQRT2));
  if (Math.max(za, zb) < 0)
    return 0.5 * (erfc(-zb / SQRT2) - erfc(-za / SQRT2));
  return 0.5 * (erf(zb / SQRT2) - erf(za / SQRT2));
}

/** The unit-area Gaussian density at u from its centre. */
export const gaussianDensity = (u, sigma) =>
  Math.exp((-0.5 * u * u) / (sigma * sigma)) / (sigma * Math.sqrt(2 * Math.PI));

/** Sampling per resolution element: the FWHM in pixels, FWHM / dispersion (nm per pixel, positive). */
export const samplingOf = (fwhmNm, dispersionNmPx) =>
  fwhmNm / Math.abs(dispersionNmPx);

/**
 * The verdict on a sampling: 'ok' at the criterion or above, 'undersampled' from the floor to the criterion,
 * 'severely-undersampled' below the floor.
 */
export function judgeSampling(s) {
  if (!(s >= SAMPLING_FLOOR)) return 'severely-undersampled';
  return s >= SAMPLING_CRITERION ? 'ok' : 'undersampled';
}

/**
 * Sampling on a logarithmic grid (the SDSS pixel is a fixed step of log10 lambda): the FWHM is lambda / R, a pixel
 * is lambda ln(10) step, so the FWHM in pixels is 1 / (R step ln 10), the same at every wavelength.
 */
export const samplingOnLogGrid = (R, log10Step) =>
  1 / (R * log10Step * Math.LN10);

/** How many independent resolution elements a wavelength range holds (its span over the FWHM), not its pixels. */
export const resolutionElements = (spanNm, fwhmNm) => spanNm / fwhmNm;

/** Quadrature: a measured sigma from an intrinsic one and the instrument's. */
export const observedSigma = (intrinsic, instrument) =>
  Math.hypot(intrinsic, instrument);

/**
 * The intrinsic sigma left when the instrument's is removed, or 0 with `resolved: false` when the measured width
 * does not exceed it (an unresolved line: its width says only that it is narrower than the instrument).
 */
export function intrinsicSigma(measured, instrument) {
  const d = measured * measured - instrument * instrument;
  return d > 0
    ? { sigma: Math.sqrt(d), resolved: true }
    : { sigma: 0, resolved: false };
}

/**
 * The profile of two equal Gaussian lines of FWHM 1 whose centres are `separationFwhm` apart, in units of the FWHM, at
 * a position x (in FWHM) from their midpoint, each line of unit peak.
 */
export function pairProfile(separationFwhm, x) {
  const s = 1 / FWHM_PER_SIGMA;
  const a = separationFwhm / 2;
  return (
    Math.exp((-0.5 * (x - a) ** 2) / (s * s)) +
    Math.exp((-0.5 * (x + a) ** 2) / (s * s))
  );
}

/**
 * The dip between two equal Gaussian lines: 1 - (the profile at the midpoint) / (its highest value). Zero until the
 * separation exceeds 2 sigma = 0.8493 FWHM, where the two peaks first separate (the Gaussian pair's own criterion; it is
 * not Rayleigh's, which belongs to Airy patterns).
 */
export function pairDip(separationFwhm) {
  const sigma = 1 / FWHM_PER_SIGMA;
  if (!(separationFwhm > 2 * sigma)) return 0;
  // the maximum lies between the midpoint and one centre: the root of the derivative, by bisection
  const a = separationFwhm / 2;
  const d = x =>
    -(x - a) * Math.exp((-0.5 * (x - a) ** 2) / (sigma * sigma)) -
    (x + a) * Math.exp((-0.5 * (x + a) ** 2) / (sigma * sigma));
  let lo = 1e-9;
  let hi = a + sigma;
  for (let i = 0; i < 200 && hi - lo > 1e-15; i++) {
    const m = 0.5 * (lo + hi);
    if (d(m) > 0) lo = m;
    else hi = m;
  }
  const top = pairProfile(separationFwhm, 0.5 * (lo + hi));
  return Math.max(0, 1 - pairProfile(separationFwhm, 0) / top);
}
