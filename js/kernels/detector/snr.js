// =============================================================================
// Signal-to-noise and the exposure-time calculator
// -----------------------------------------------------------------------------
// The CCD equation (Merline and Howell 1995; Howell, Handbook of CCD Astronomy,
// section 4.4) for photometry through an aperture of `npix` pixels, with the
// sky estimated from `nBackground` pixels:
//
//   noise^2 = S + npix (1 + npix / nBackground) (B + D + R^2)
//   SNR     = S / noise
//
// S is the star's electrons in the aperture, B the sky electrons per pixel,
// D the dark electrons per pixel, R the read noise in electrons. All in
// electrons, not counts. The (1 + npix/nBackground) factor is the price of
// measuring the sky from a finite annulus; it goes to 1 for a perfect sky.
//
// The exposure-time calculator solves SNR(t) = target with S = r t, B = b t,
// D = d t and R fixed: a quadratic in t. Its three limits are closed forms
// (source-limited, sky-limited, read-limited), the textbook cases the tests hold.
//
// The photon rate of a star from the radiation kernel's bandpasses is in
// ./bands.js, kept apart so a page that only does the arithmetic above does not
// load the radiation kernel.
//
// Prompt 210 adds, over the same equation: several exposures (the read noise is
// paid once per exposure), the point source's pixels and enclosed fraction for a
// circular aperture or for optimal photometry, extended sources by their surface
// brightness, the limiting magnitude of an exposure in closed form, atmospheric
// extinction, and `planExposure`, which refuses what the exposure limit or the
// full well forbids. EXPOSURE_PLANNING.md has the equations, the limits and the
// validation table. The calculation has no flat-field or sky-subtraction error,
// no crowding and no scintillation, and says so in every plan.
//
// Pure: no DOM.
// =============================================================================

// Free globals are slow under Jest's vm; the local names are not.
const { Math } = globalThis;

export const VERSION = '1.1.0';

/** The terms of the CCD equation, electrons (squared for the noise terms). `nExp` reads of the detector add `nExp` read variances. */
export function noiseTerms({
  signal,
  npix,
  sky,
  dark = 0,
  readNoise,
  nBackground = Infinity,
  extraVariance = 0,
  nExp = 1,
}) {
  const k = 1 + npix / nBackground;
  const source = signal;
  const skyTerm = npix * k * sky;
  const darkTerm = npix * k * dark;
  const readTerm = npix * k * (readNoise * readNoise * nExp + extraVariance);
  const variance = source + skyTerm + darkTerm + readTerm;
  return {
    source,
    sky: skyTerm,
    dark: darkTerm,
    read: readTerm,
    variance,
    noise: Math.sqrt(variance),
    snr: signal / Math.sqrt(variance),
  };
}

/** The total exposure, seconds, that reaches a target SNR in `nExp` exposures; Infinity when it cannot. */
export function exposureForSnr({
  rate,
  skyRate,
  darkRate = 0,
  readNoise,
  npix,
  nBackground = Infinity,
  snr,
  nExp = 1,
}) {
  if (!(rate > 0) || !(snr > 0)) return Infinity;
  const k = 1 + npix / nBackground;
  const a = (rate * rate) / (snr * snr);
  const q = rate + npix * k * (skyRate + darkRate);
  const c = npix * k * readNoise * readNoise * nExp;
  return (q + Math.sqrt(q * q + 4 * a * c)) / (2 * a);
}

/** The SNR after an exposure of t seconds. */
export function snrAt(p, t) {
  return noiseTerms({
    signal: p.rate * t,
    npix: p.npix,
    sky: p.skyRate * t,
    dark: (p.darkRate ?? 0) * t,
    readNoise: p.readNoise,
    nBackground: p.nBackground,
    nExp: p.nExp ?? 1,
  }).snr;
}

/** Which term of the noise dominates after t seconds. */
export function dominantTerm(p, t) {
  const n = noiseTerms({
    signal: p.rate * t,
    npix: p.npix,
    sky: p.skyRate * t,
    dark: (p.darkRate ?? 0) * t,
    readNoise: p.readNoise,
    nBackground: p.nBackground,
    nExp: p.nExp ?? 1,
  });
  const terms = { source: n.source, sky: n.sky, dark: n.dark, read: n.read };
  return Object.entries(terms).sort((a, b) => b[1] - a[1])[0][0];
}

/** Collecting area of a circular aperture with a central obstruction, m^2. */
export const collectingArea = (diameterM, obstruction = 0) =>
  (Math.PI / 4) * diameterM * diameterM * (1 - obstruction * obstruction);

/**
 * The aperture that maximizes SNR for a Gaussian star in a given sky and read
 * noise is near 0.7 to 1.2 FWHM; this returns the SNR for each of several radii
 * so a lesson can show the optimum. `rate` is electrons per second in total.
 */
export function snrByRadius(p, t, radii, fwhm) {
  const sigma = fwhm / (2 * Math.sqrt(2 * Math.LN2));
  return radii.map(r => {
    const npix = Math.PI * r * r;
    const enclosed = 1 - Math.exp(-(r * r) / (2 * sigma * sigma));
    const q = { ...p, rate: p.rate * enclosed, npix };
    return { r, npix, enclosed, snr: snrAt(q, t) };
  });
}

// =============================================================================
// Prompt 210: geometry, magnitudes, the limit of an exposure and the plan
// =============================================================================

/** Full width at half maximum over sigma for a Gaussian. */
export const FWHM_PER_SIGMA = 2 * Math.sqrt(2 * Math.LN2);

/** A teaching value, not a measured one: flat fielding is good to about one percent. */
export const FLAT_FIELD_SNR_FLOOR = 100;

/** The airmass above which the extinction and the plane-parallel arithmetic are not trusted. */
export const AIRMASS_WARNING = 5;

/** erf by its Maclaurin series (|x| below 4; 1 beyond); good to 1e-12 where used. */
function erf(x) {
  const a = Math.abs(x);
  if (a >= 4) return Math.sign(x);
  let term = a;
  let sum = a;
  for (let n = 1; n < 80; n++) {
    term *= (-a * a) / n;
    const d = term / (2 * n + 1);
    sum += d;
    if (Math.abs(d) < 1e-17 * Math.abs(sum)) break;
  }
  return Math.sign(x) * (2 / Math.sqrt(Math.PI)) * sum;
}

/** Pixels and enclosed fraction for a Gaussian point source of FWHM `fwhm` (pixels). */
export function pointSourceGeometry({ fwhm, radius, mode = 'aperture' }) {
  const sigma = fwhm / FWHM_PER_SIGMA;
  if (mode === 'optimal')
    return { mode, sigma, npix: 4 * Math.PI * sigma * sigma, enclosed: 1 };
  return {
    mode: 'aperture',
    sigma,
    npix: Math.PI * radius * radius,
    enclosed: 1 - Math.exp(-(radius * radius) / (2 * sigma * sigma)),
  };
}

/** The fraction of a Gaussian's light in the pixel it is centred on. */
export const peakPixelFraction = fwhm =>
  erf(0.5 / ((fwhm / FWHM_PER_SIGMA) * Math.SQRT2)) ** 2;

/** Electrons per second from an object of magnitude m, for a zenith zero point (electrons per second at m = 0). */
export const rateOfMagnitude = (zeroPoint, m) => zeroPoint * 10 ** (-0.4 * m);

/** The magnitude of an object of this rate. */
export const magnitudeOfRate = (zeroPoint, rate) =>
  -2.5 * Math.log10(rate / zeroPoint);

/** Extinction beyond the zenith's, magnitudes: the zero point refers to X = 1. */
export const extinctionMag = (k, airmass) => k * (airmass - 1);

/** Sky electrons per second per pixel from a surface brightness (mag per square arcsec). */
export const skyRatePerPixel = (zeroPoint, muSky, pixelScale) =>
  rateOfMagnitude(zeroPoint, muSky) * pixelScale * pixelScale;

/** Electrons per second from an extended source of surface brightness mu over `areaArcsec2`. */
export const extendedSourceRate = (zeroPoint, mu, areaArcsec2) =>
  rateOfMagnitude(zeroPoint, mu) * areaArcsec2;

/**
 * The total electrons per second of a source that is just detected at `snr`
 * after t seconds in `p.nExp` exposures: the positive root of
 * S^2 - snr^2 S - snr^2 V0 = 0, V0 the variance without the source, divided by
 * t and by the fraction of the light the aperture holds (`p.enclosed`, default 1).
 */
export function limitingRate(p, t, snr = 5) {
  const k = 1 + p.npix / (p.nBackground ?? Infinity);
  const v0 =
    p.npix * k * ((p.skyRate + (p.darkRate ?? 0)) * t) +
    p.npix * k * p.readNoise * p.readNoise * (p.nExp ?? 1);
  const s2 = snr * snr;
  return (s2 + Math.sqrt(s2 * s2 + 4 * s2 * v0)) / 2 / t / (p.enclosed ?? 1);
}

/** The faintest magnitude (zenith, p.zeroPoint) a source can have and reach `snr` in t seconds. */
export const limitingMagnitude = (p, t, snr = 5) =>
  magnitudeOfRate(p.zeroPoint, limitingRate(p, t, snr)) - (p.extinction ?? 0);

/** The four variances of a plan, with their shares of the total. */
export function noiseBudget(terms) {
  const total = terms.variance;
  return ['source', 'sky', 'dark', 'read'].map(term => ({
    term,
    variance: terms[term],
    share: terms[term] / total,
  }));
}

const refuse = (reason, extra = {}) => ({
  ok: false,
  status: reason === 'exposure-limit' ? 'not-reachable' : 'refused',
  reason,
  ...extra,
});

/**
 * Plan an exposure: the total time that reaches a target SNR, or why it cannot
 * be reached. A prediction under stated assumptions, never a guarantee.
 *
 * @param {object} a
 * @param {number} a.zeroPoint electrons per second of a magnitude-0 object at the zenith
 * @param {{kind:'point', mag:number}|{kind:'extended', mu:number, areaArcsec2:number}} a.source
 * @param {number} a.pixelScale arcsec per pixel
 * @param {number} a.fwhm seeing FWHM, arcsec (a point source's point-spread function)
 * @param {{mode:'aperture', radiusArcsec:number}|{mode:'optimal'}} [a.aperture] default: optimal for a point source
 * @param {number} a.skyMag sky surface brightness, mag per square arcsec
 * @param {number} a.readNoise electrons
 * @param {number} [a.darkRate] electrons per second per pixel (default 0: the caller states it)
 * @param {number} [a.fullWell] electrons a pixel holds
 * @param {number} [a.nBackground] pixels of the sky estimate (default Infinity: a perfect sky)
 * @param {number} [a.nExp=1] exposures
 * @param {number} a.targetSnr
 * @param {number} [a.maxTotal=Infinity] total seconds allowed
 * @param {number} [a.maxExposure=Infinity] seconds allowed per exposure
 * @param {number} [a.airmass=1]
 * @param {number} [a.extinction=0] magnitudes per airmass
 * @param {number} [a.limitSnr=5] the SNR of the limiting magnitude reported
 */
export function planExposure(a) {
  const nExp = a.nExp ?? 1;
  const airmass = a.airmass ?? 1;
  const k = a.extinction ?? 0;
  const maxTotal = a.maxTotal ?? Infinity;
  const maxExposure = a.maxExposure ?? Infinity;
  const need = [a.zeroPoint, a.pixelScale, a.readNoise, a.targetSnr, a.skyMag];
  if (
    !need.every(Number.isFinite) ||
    !(a.zeroPoint > 0 && a.pixelScale > 0 && a.targetSnr > 0) ||
    !(a.readNoise >= 0) ||
    !(Number.isInteger(nExp) && nExp >= 1) ||
    !a.source
  )
    return refuse('bad-input');
  if (!(airmass < Infinity)) return refuse('below-horizon');
  if (!(airmass >= 1)) return refuse('bad-input');
  const ext = extinctionMag(k, airmass);
  const darkRate = a.darkRate ?? 0;
  const skyRate = skyRatePerPixel(a.zeroPoint, a.skyMag, a.pixelScale);
  const point = a.source.kind === 'point';
  const sourceMag = point ? a.source.mag : a.source.mu;
  if (!Number.isFinite(sourceMag)) return refuse('no-signal');
  let geometry;
  let peak;
  if (point) {
    const fwhmPix = a.fwhm / a.pixelScale;
    if (!(fwhmPix > 0)) return refuse('bad-input');
    const ap = a.aperture ?? { mode: 'optimal' };
    geometry = pointSourceGeometry({
      fwhm: fwhmPix,
      radius: ap.mode === 'aperture' ? ap.radiusArcsec / a.pixelScale : 0,
      mode: ap.mode,
    });
    peak = peakPixelFraction(fwhmPix);
  } else {
    if (!(a.source.areaArcsec2 > 0)) return refuse('bad-input');
    const npix = a.source.areaArcsec2 / (a.pixelScale * a.pixelScale);
    geometry = { mode: 'extended', npix, enclosed: 1 };
    peak = 1 / npix;
  }
  const total = point
    ? rateOfMagnitude(a.zeroPoint, sourceMag + ext)
    : extendedSourceRate(a.zeroPoint, sourceMag + ext, a.source.areaArcsec2);
  if (!(total > 0)) return refuse('no-signal');
  const p = {
    zeroPoint: a.zeroPoint,
    rate: total * geometry.enclosed,
    enclosed: geometry.enclosed,
    skyRate,
    darkRate,
    readNoise: a.readNoise,
    npix: geometry.npix,
    nBackground: a.nBackground ?? Infinity,
    nExp,
    extinction: ext,
  };
  const rates = {
    total,
    source: p.rate,
    sky: skyRate,
    dark: darkRate,
    peak,
  };
  const base = { geometry, rates, airmass, extinctionMag: ext };
  const seconds = exposureForSnr({ ...p, snr: a.targetSnr });
  const limitSnr = a.limitSnr ?? 5;
  if (seconds > maxTotal)
    return refuse('exposure-limit', {
      ...base,
      needed: seconds,
      reachedSnr: snrAt(p, maxTotal),
      limitingMagnitude: limitingMagnitude(p, maxTotal, limitSnr),
      maxTotal,
    });
  // Per exposure: the brightest pixel and the frame limit.
  const peakRate = total * peak + skyRate + darkRate;
  const satLimit = a.fullWell > 0 ? a.fullWell / peakRate : Infinity;
  const frameLimit = Math.min(maxExposure, satLimit);
  const perExposure = seconds / nExp;
  if (perExposure > frameLimit) {
    let suggestion = null;
    for (let n = nExp + 1; n <= 2000; n++) {
      const t = exposureForSnr({ ...p, nExp: n, snr: a.targetSnr });
      if (t / n <= frameLimit) {
        suggestion = { exposures: n, seconds: t, perExposure: t / n };
        break;
      }
    }
    return refuse(satLimit <= maxExposure ? 'saturated' : 'frame-limit', {
      ...base,
      needed: seconds,
      perExposure,
      maxPerExposure: frameLimit,
      peakElectrons: peakRate * perExposure,
      suggestion,
    });
  }
  const terms = noiseTerms({
    signal: p.rate * seconds,
    npix: p.npix,
    sky: skyRate * seconds,
    dark: darkRate * seconds,
    readNoise: a.readNoise,
    nBackground: p.nBackground,
    nExp,
  });
  const warnings = [];
  if (a.targetSnr > FLAT_FIELD_SNR_FLOOR)
    warnings.push({ code: 'beyond-flat-field-accuracy' });
  if (airmass > AIRMASS_WARNING) warnings.push({ code: 'low-altitude' });
  if (!Number.isFinite(p.nBackground))
    warnings.push({ code: 'perfect-sky-estimate' });
  return {
    ok: true,
    status: 'ok',
    ...base,
    seconds,
    exposures: nExp,
    perExposure,
    peakElectrons: peakRate * perExposure,
    snr: terms.snr,
    terms,
    budget: noiseBudget(terms),
    dominant: dominantTerm(p, seconds),
    limitingMagnitude: limitingMagnitude(p, seconds, limitSnr),
    limitSnr,
    warnings,
    assumptions: ['no-flat-field-error', 'no-crowding', 'sky-as-given'],
  };
}
