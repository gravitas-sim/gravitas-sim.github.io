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
// Pure: no DOM.
// =============================================================================

export const VERSION = '1.0.0';

/** The terms of the CCD equation, electrons. */
export function noiseTerms({
  signal,
  npix,
  sky,
  dark = 0,
  readNoise,
  nBackground = Infinity,
  extraVariance = 0,
}) {
  const k = 1 + npix / nBackground;
  const source = signal;
  const skyTerm = npix * k * sky;
  const darkTerm = npix * k * dark;
  const readTerm = npix * k * (readNoise * readNoise + extraVariance);
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

/** The exposure, seconds, that reaches a target SNR; Infinity when it cannot. */
export function exposureForSnr({
  rate,
  skyRate,
  darkRate = 0,
  readNoise,
  npix,
  nBackground = Infinity,
  snr,
}) {
  if (!(rate > 0) || !(snr > 0)) return Infinity;
  const k = 1 + npix / nBackground;
  const a = (rate * rate) / (snr * snr);
  const q = rate + npix * k * (skyRate + darkRate);
  const c = npix * k * readNoise * readNoise;
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
