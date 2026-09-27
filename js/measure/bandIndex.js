// =============================================================================
// A band index: the flux in a band against the flux beside it
// -----------------------------------------------------------------------------
// A molecular band, such as titanium oxide's in an M star, has no continuum on
// both sides to fit a line through, so the line tool (./spectrumLine.js), which
// needs one either side, cannot measure it. A band index is the other textbook
// measurement: the mean flux in a band divided by the mean flux in one or more
// reference windows. TiO5 (Reid, Hawley & Gizis 1995, AJ 110, 1838) is one,
// 7126-7135 over 7042-7046 Angstrom in air; it falls from about 1 in a star
// with no TiO to about 0.4 by M4.
//
//   index    mean flux in the band / mean flux in the reference windows
//            (MEASURED)
//   depth    1 - index: how far the band sits below the reference (MEASURED)
//
// A window's mean weights each sample by how much of its own bin the window
// covers, as js/stellar/spectrumIndex.js does for the spectra Gravitas ships,
// so the Observatory and the lesson that built those spectra agree on TiO5.
// Windows are quoted in a medium, air or vacuum, and converted to the
// spectrum's own before they are measured: TiO5's, as published, are air, and
// SDSS records vacuum wavelengths.
//
// The uncertainty: each window mean's is its samples' errors propagated where
// the spectrum carries them, and the scatter of its samples over the root of
// their number where it does not (which ASSUMES white noise, and says so);
// the index's is the two relative errors in quadrature.
// =============================================================================

import { airToVacuum } from '../stellar/spectrumIndex.js';

export const VERSION = '1.0.0';

export class BandError extends Error {
  constructor(code, message, detail = {}) {
    super(message);
    this.name = 'BandError';
    this.code = code;
    this.detail = detail;
  }
}

/** Published indices, with their windows and where they come from. */
export const BAND_PRESETS = Object.freeze({
  tio5: Object.freeze({
    band: [7126, 7135],
    reference: [[7042, 7046]],
    medium: 'air',
    cite: 'Reid, Hawley & Gizis 1995, AJ 110, 1838 (TiO5)',
  }),
  cah2: Object.freeze({
    band: [6814, 6846],
    reference: [[7042, 7046]],
    medium: 'air',
    cite: 'Reid, Hawley & Gizis 1995, AJ 110, 1838 (CaH2)',
  }),
});

/** Each sample's bin: from half way to the one before to half way to the next. */
function edges(x) {
  const n = x.length;
  const lo = new Float64Array(n);
  const hi = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    lo[i] = i > 0 ? (x[i - 1] + x[i]) / 2 : x[0] - (x[1] - x[0]) / 2;
    hi[i] = i < n - 1 ? (x[i] + x[i + 1]) / 2 : x[i] + (x[i] - x[i - 1]) / 2;
  }
  return { lo, hi };
}

/**
 * The coverage-weighted mean of one window, and its uncertainty.
 * @returns {{mean: number, error: number, n: number, fromScatter: boolean}}
 */
function windowMean(data, bins, [a, b]) {
  let w = 0;
  let wy = 0;
  let wv = 0;
  let n = 0;
  const ys = [];
  const ws = [];
  for (let i = 0; i < data.x.length; i++) {
    const overlap = Math.min(bins.hi[i], b) - Math.max(bins.lo[i], a);
    if (!(overlap > 0) || !Number.isFinite(data.y[i])) continue;
    w += overlap;
    wy += overlap * data.y[i];
    if (data.dy) wv += (overlap * data.dy[i]) ** 2;
    ys.push(data.y[i]);
    ws.push(overlap);
    n++;
  }
  if (!(w > 0) || n < 2)
    throw new BandError(
      'window',
      `the window ${a} to ${b} holds fewer than two samples`,
      { lo: a, hi: b, n }
    );
  const mean = wy / w;
  if (data.dy) return { mean, error: Math.sqrt(wv) / w, n, fromScatter: false };
  let ss = 0;
  ys.forEach((y, k) => (ss += ws[k] * (y - mean) ** 2));
  const sd = Math.sqrt((ss / w) * (n / (n - 1)));
  return { mean, error: sd / Math.sqrt(n), n, fromScatter: true };
}

/**
 * @param {{x: ArrayLike<number>, y: ArrayLike<number>,
 *   dy?: ArrayLike<number>|null}} data - Wavelength increasing, flux, error
 * @param {{band: [number, number], reference: Array<[number, number]>,
 *   medium: 'air'|'vacuum', spectrumMedium: 'air'|'vacuum'}} windows - In
 *   the spectrum's unit (Angstrom for the windows' medium conversion)
 * @returns {{index: number, error: number, depth: number, band: object,
 *   reference: object, windows: object, warnings: object[]}}
 */
export function measureBand(data, windows) {
  const {
    band,
    reference,
    medium = 'vacuum',
    spectrumMedium = 'vacuum',
  } = windows;
  const ok = w =>
    Array.isArray(w) &&
    Number.isFinite(w[0]) &&
    Number.isFinite(w[1]) &&
    w[0] < w[1];
  if (!ok(band) || !reference?.length || !reference.every(ok))
    throw new BandError(
      'windows',
      'a band and each reference window need a start and a later end'
    );
  if (data.x.length < 4)
    throw new BandError('tooFew', 'a spectrum of fewer than four samples');
  // Air windows on a vacuum spectrum move redward, and back again.
  const to =
    medium === spectrumMedium
      ? v => v
      : medium === 'air'
        ? airToVacuum
        : v => v / (airToVacuum(v) / v);
  const moved = w => [to(w[0]), to(w[1])];
  const bins = edges(data.x);
  const b = windowMean(data, bins, moved(band));
  const refs = reference.map(w => windowMean(data, bins, moved(w)));
  // Several reference windows: their mean, each weighted alike.
  const refMean = refs.reduce((s, r) => s + r.mean, 0) / refs.length;
  const refError =
    Math.sqrt(refs.reduce((s, r) => s + r.error ** 2, 0)) / refs.length;
  const index = b.mean / refMean;
  const error =
    Math.abs(index) * Math.hypot(b.error / b.mean, refError / refMean);
  const warnings = [];
  if (b.fromScatter) warnings.push({ code: 'errorsFromScatter' });
  if (!(refMean > 0)) warnings.push({ code: 'referenceNotPositive' });
  return {
    index,
    error,
    depth: 1 - index,
    band: { mean: b.mean, samples: b.n },
    reference: { mean: refMean, samples: refs.reduce((s, r) => s + r.n, 0) },
    windows: {
      band: moved(band),
      reference: reference.map(moved),
      medium: spectrumMedium,
    },
    warnings,
  };
}
