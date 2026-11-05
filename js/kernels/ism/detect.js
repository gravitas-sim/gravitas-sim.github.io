// =============================================================================
// ISM kernel: finding lines and naming them (S10)
// -----------------------------------------------------------------------------
// detectFeatures    MEASURED   a matched filter on the residual of a running-median continuum
// identifyFeatures  DERIVED    each feature against the line pack at a trial redshift, in the
//                              spectrum's own medium: exactly one line within tolerance is
//                              'identified', more than one 'ambiguous', none 'unidentified'
// solveRedshift     DERIVED    the inverse-variance weighted redshift of the identified
//                              features, from the caller's trial or the best of a grid
//
// The diffuse interstellar bands are NAMED as unidentified (no line, no species, no
// carrier). Their centres are a caller input with a source string and no default: the
// pack holds none, and a typed one would be a published number from memory.
// =============================================================================

import { refused } from '../statistics/check.js';
import { FWHM_PER_SIGMA } from '../spectrograph/lsf.js';
import {
  checkSpectrum,
  median,
  robustSigma,
  dispersionAtIndex,
  lambdaAtIndex,
  lsfFwhmAt,
} from './spectrum.js';

const { Math, Number, Float64Array } = globalThis;

export const DETECTION_SNR = 5;
export const MEDIAN_WINDOW = 61;
export const DIFFUSE_BAND_LABEL = 'unidentified diffuse band';

/**
 * Features of a spectrum: local extrema of the matched-filter signal-to-noise at or above a threshold.
 * @param {object} spec
 * @param {{snrMin?: number, medianWindow?: number}} [o]
 * @returns {{status: 'ok', features: Array<{centreNm: number, sigmaCentreNm: number, snr: number, kind: string, index: number}>}|object}
 */
export function detectFeatures(
  spec,
  { snrMin = DETECTION_SNR, medianWindow = MEDIAN_WINDOW } = {}
) {
  const bad = checkSpectrum(spec, { needResolution: true });
  if (bad) return bad;
  const n = spec.lambdaNm.length;
  const half = medianWindow >> 1;
  const resid = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const lo = Math.max(0, i - half);
    const hi = Math.min(n - 1, i + half);
    resid[i] =
      spec.flux[i] -
      median(
        spec.flux.subarray
          ? spec.flux.subarray(lo, hi + 1)
          : spec.flux.slice(lo, hi + 1)
      );
  }
  const globalSigma = spec.sigma ? null : robustSigma(spec.flux);
  const sig = i => (spec.sigma ? spec.sigma[i] : globalSigma);
  const snr = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const lsfPx =
      lsfFwhmAt(spec, spec.lambdaNm[i]) / dispersionAtIndex(spec.lambdaNm, i);
    const s = Math.max(0.5, lsfPx / FWHM_PER_SIGMA);
    const h = Math.max(2, Math.ceil(3 * s));
    let num = 0;
    let den = 0;
    for (let j = Math.max(0, i - h); j <= Math.min(n - 1, i + h); j++) {
      const g = Math.exp((-0.5 * (j - i) ** 2) / (s * s));
      const v = sig(j) ** 2;
      num += (g * resid[j]) / v;
      den += (g * g) / v;
    }
    snr[i] = num / Math.sqrt(den);
  }
  let found = [];
  for (let i = 1; i < n - 1; i++) {
    const a = Math.abs(snr[i]);
    if (a >= snrMin && a >= Math.abs(snr[i - 1]) && a > Math.abs(snr[i + 1])) {
      // parabolic refinement of the extremum
      const y0 = Math.abs(snr[i - 1]);
      const y1 = a;
      const y2 = Math.abs(snr[i + 1]);
      const den = y0 - 2 * y1 + y2;
      const d = den !== 0 ? (0.5 * (y0 - y2)) / den : 0;
      const idx = i + Math.max(-0.5, Math.min(0.5, d));
      const lambda = lambdaAtIndex(spec.lambdaNm, idx);
      found.push({
        index: idx,
        centreNm: lambda,
        sigmaCentreNm: lsfFwhmAt(spec, lambda) / FWHM_PER_SIGMA / a,
        snr: snr[i],
        kind: snr[i] > 0 ? 'emission' : 'absorption',
        fwhmNm: lsfFwhmAt(spec, lambda),
      });
    }
  }
  // features nearer than one FWHM keep the stronger
  found.sort((p, q) => Math.abs(q.snr) - Math.abs(p.snr));
  const kept = [];
  for (const f of found)
    if (!kept.some(k => Math.abs(k.centreNm - f.centreNm) < k.fwhmNm))
      kept.push(f);
  kept.sort((p, q) => p.centreNm - q.centreNm);
  return {
    status: 'ok',
    features: kept,
    snrMin,
    continuum: 'running median, 61 samples',
  };
}

const tolerance = (f, pixelNm) => Math.max(3 * f.sigmaCentreNm, pixelNm);

/**
 * Identify features against the pack lines at a trial redshift.
 * @param {Array<object>} features - from detectFeatures, or {centreNm, sigmaCentreNm}
 * @param {Array<object>} lines - the line pack's LINES
 * @param {{medium: 'air'|'vacuum', z?: number, pixelNm?: number, bands?: Array<{id: string, centreNm: number, widthNm: number}>, bandsSource?: string}} o
 */
export function identifyFeatures(
  features,
  lines,
  { medium, z = 0, pixelNm = 0, bands, bandsSource } = {}
) {
  if (medium !== 'air' && medium !== 'vacuum')
    return refused(
      'medium-missing',
      "the medium ('air' or 'vacuum') is required"
    );
  if (bands && (typeof bandsSource !== 'string' || !bandsSource.trim()))
    return refused(
      'missing-source',
      'a band table needs a source string; there is no default'
    );
  const out = features.map(f => {
    const tol = tolerance(f, pixelNm);
    const cand = [];
    for (const line of lines) {
      const rest = line[medium];
      if (!Number.isFinite(rest)) continue;
      const off = f.centreNm - rest * (1 + z);
      if (Math.abs(off) <= tol)
        cand.push({ id: line.id, restNm: rest, offsetNm: off });
    }
    cand.sort((p, q) => Math.abs(p.offsetNm) - Math.abs(q.offsetNm));
    const band = bands?.find(
      b => Math.abs(f.centreNm - b.centreNm) <= b.widthNm / 2
    );
    let label;
    if (cand.length === 1 && !band) label = 'identified';
    else if (cand.length > 1 || (cand.length === 1 && band))
      label = 'ambiguous';
    else if (band) label = DIFFUSE_BAND_LABEL;
    else label = 'unidentified';
    return {
      ...f,
      label,
      candidates: cand,
      line: label === 'identified' ? cand[0] : null,
      band: band ?? null,
      toleranceNm: tol,
    };
  });
  return { status: 'ok', features: out, medium, z };
}

/**
 * The redshift from the identified features, weighted by their centre errors.
 * @param {Array<object>} features
 * @param {Array<object>} lines
 * @param {{medium: string, z0?: number, zRange?: {min: number, max: number, step: number}, pixelNm?: number}} o
 *   the trial redshift z0, or a grid to search
 */
export function solveRedshift(
  features,
  lines,
  { medium, z0, zRange, pixelNm = 0 } = {}
) {
  if (medium !== 'air' && medium !== 'vacuum')
    return refused(
      'medium-missing',
      "the medium ('air' or 'vacuum') is required"
    );
  const score = z => {
    const r = identifyFeatures(features, lines, { medium, z, pixelNm });
    return r.features.filter(f => f.label === 'identified').length;
  };
  let zTrial = z0;
  if (!Number.isFinite(zTrial)) {
    if (!zRange)
      return refused(
        'no-trial',
        'a trial redshift or a redshift grid is required'
      );
    let best = -1;
    let plateaus = [];
    const steps = Math.round((zRange.max - zRange.min) / zRange.step);
    for (let k = 0; k <= steps; k++) {
      const z = zRange.min + k * zRange.step;
      const s = score(z);
      if (s > best) {
        best = s;
        plateaus = [[z]];
      } else if (s === best && s > 0) {
        const last = plateaus[plateaus.length - 1];
        if (z - last[last.length - 1] <= 1.5 * zRange.step) last.push(z);
        else plateaus.push([z]);
      }
    }
    if (best < 1)
      return refused(
        'no-match',
        'no redshift in the grid identifies a feature'
      );
    const centres = plateaus.map(p => p[(p.length - 1) >> 1]);
    if (centres.length > 1) {
      // a tie: two separated redshifts match the same number of lines
      return {
        ...refused(
          'redshift-tie',
          'two redshifts that differ by more than the matching tolerance identify the same number of features'
        ),
        candidates: centres,
        matched: best,
      };
    }
    zTrial = centres[0];
  }
  const id = identifyFeatures(features, lines, { medium, z: zTrial, pixelNm });
  const used = id.features.filter(f => f.label === 'identified');
  if (!used.length)
    return refused(
      'no-match',
      'no feature is identified at the trial redshift'
    );
  let sw = 0;
  let sz = 0;
  for (const f of used) {
    const zi = f.centreNm / f.line.restNm - 1;
    const si = Math.max(f.sigmaCentreNm, 1e-12) / f.line.restNm;
    const w = 1 / (si * si);
    sw += w;
    sz += w * zi;
  }
  return {
    status: 'ok',
    z: sz / sw,
    sigmaZ: Math.sqrt(1 / sw),
    matched: used.length,
    medium,
    trial: zTrial,
    features: id.features,
  };
}
