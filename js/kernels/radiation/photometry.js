// =============================================================================
// Radiation kernel: bandpasses and synthetic photometry
// -----------------------------------------------------------------------------
// A bandpass is a photon-counting relative response S(lambda) (the form a CCD
// or a Johnson-Cousins photon-counting passband takes; Bessell & Murphy 2012,
// PASP 124, 140, section 2 and Appendix A). Every band in the data packs is
// stored in that form, and the packs say so band by band.
//
// For a source with energy flux density f_lambda the mean flux density per unit
// frequency, weighted the way photons are counted, is
//
//      <f_nu> = Int f_lambda S lambda dlambda / ( c Int S dlambda / lambda )
//
// (the integrals are the trapezoid rule on the band's own wavelength grid, the
// way Bessell & Murphy 2012 eq. A11 and Willmer 2018 eq. 1 are evaluated), and
//
//      AB magnitude    m_AB   = -2.5 log10( <f_nu> / 3631 Jy )      Oke & Gunn 1983
//      Vega magnitude  m_Vega = m_AB - (AB - Vega)_band
//
// where (AB - Vega) of a band is data: the pack that holds the band states the
// number, where it comes from, and the convention it assumes for Vega's own
// magnitude. A band with no stated offset has no Vega magnitude here and
// vegaMag() says so rather than guessing.
//
// Units: wavelengths in nanometres; f_lambda in W m^-2 nm^-1 (the registry unit
// 'W/m2/nm'); flux per frequency in Jy.
// =============================================================================

import { AB_ZERO_JY, C_LIGHT, JY } from './constants.js';
import { planckLambda } from './planck.js';

const C_NM_PER_S = C_LIGHT * 1e9;

/**
 * A band as the packs store it, decoded: wavelengths (nm) and the response
 * normalised to a peak of 1. The pack gives either `lambdaNm` (a list) or
 * `startNm` and `stepNm` with the response list; responses are integers in
 * units of 1/`scale` of the peak.
 * @param {object} raw - One band of a pack
 * @returns {{id: string, lambdaNm: Float64Array, s: Float64Array, abMinusVega: ?number}}
 */
export function decodeBand(raw) {
  const n = raw.response.length;
  const lam = new Float64Array(n);
  for (let i = 0; i < n; i++)
    lam[i] = raw.lambdaNm ? raw.lambdaNm[i] : raw.startNm + i * raw.stepNm;
  const s = Float64Array.from(raw.response, v => v / raw.scale);
  return {
    id: raw.id,
    lambdaNm: lam,
    s,
    abMinusVega: Number.isFinite(raw.abMinusVega) ? raw.abMinusVega : null,
  };
}

/** Trapezoid integral of g(i) over the band's grid. */
function integrate(band, g) {
  const { lambdaNm: l } = band;
  let acc = 0;
  let prev = g(0);
  for (let i = 1; i < l.length; i++) {
    const cur = g(i);
    acc += 0.5 * (prev + cur) * (l[i] - l[i - 1]);
    prev = cur;
  }
  return acc;
}

/** Pivot wavelength sqrt(Int S lambda / Int S / lambda), nm (BM12 appendix). */
export function pivotWavelength(band) {
  const { lambdaNm: l, s } = band;
  return Math.sqrt(
    integrate(band, i => s[i] * l[i]) / integrate(band, i => s[i] / l[i])
  );
}

/** Mean photon wavelength Int S lambda dlambda / Int S dlambda, nm. */
export function meanPhotonWavelength(band) {
  const { lambdaNm: l, s } = band;
  return integrate(band, i => s[i] * l[i]) / integrate(band, i => s[i]);
}

/**
 * Mean f_nu of a source through a band, Jy.
 * @param {object} band - From decodeBand
 * @param {(lambdaNm: number) => number} sed - f_lambda in W m^-2 nm^-1
 */
export function meanFluxJy(band, sed) {
  const { lambdaNm: l, s } = band;
  const num = integrate(band, i => sed(l[i]) * s[i] * l[i]);
  const den = integrate(band, i => s[i] / l[i]);
  return num / (C_NM_PER_S * den) / JY;
}

/** AB magnitude of a source through a band. */
export function abMag(band, sed) {
  return -2.5 * Math.log10(meanFluxJy(band, sed) / AB_ZERO_JY);
}

/** Vega-system magnitude; NaN when the band states no AB-Vega offset. */
export function vegaMag(band, sed) {
  return band.abMinusVega === null
    ? NaN
    : abMag(band, sed) - band.abMinusVega;
}

/** A source given as samples (nm, W m^-2 nm^-1), linearly interpolated. */
export function sedFromSamples(lambdaNm, fLambda) {
  const n = lambdaNm.length;
  return x => {
    if (x < lambdaNm[0] || x > lambdaNm[n - 1]) return 0;
    let lo = 0;
    let hi = n - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (lambdaNm[mid] <= x) lo = mid;
      else hi = mid;
    }
    const t = (x - lambdaNm[lo]) / (lambdaNm[hi] - lambdaNm[lo]);
    return fLambda[lo] + t * (fLambda[hi] - fLambda[lo]);
  };
}

/** A blackbody's f_lambda at unit solid-angle scale: pi B_lambda per nm. */
export function blackbodySed(T, scale = 1) {
  return lam => scale * Math.PI * planckLambda(lam * 1e-9, T) * 1e-9;
}

/** A source that is flat in f_nu (AB = 0 in every band by definition). */
export function flatFnuSed(jy = AB_ZERO_JY) {
  return lam => (jy * JY * C_NM_PER_S) / (lam * lam);
}

/**
 * Colour of a blackbody, mag, between two decoded bands in a system.
 * Independent of the source's size and distance.
 */
export function blackbodyColor(T, bandA, bandB, system = 'ab') {
  const sed = blackbodySed(T);
  const f = system === 'vega' ? vegaMag : abMag;
  return f(bandA, sed) - f(bandB, sed);
}
