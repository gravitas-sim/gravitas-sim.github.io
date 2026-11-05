// =============================================================================
// AGN kernel: luminosity from flux and redshift, and the bolometric correction (L1, L2)
// -----------------------------------------------------------------------------
// bandLuminosity         DERIVED   nu L_nu at the rest wavelength lambda_obs / (1 + z) from nu F_nu at lambda_obs:
//                                  4 pi d_L^2 (lambda F_lambda), d_L from the cosmology kernel in the caller's cosmology.
//                                  NO K-correction: the rest wavelength changes with z, and the result says so.
// bolometricLuminosity   MODELLED  L_bol = BC L_band with the factor, its rest band, a tolerance, its scatter in dex and
//                                  its source supplied by the caller (no default); the scatter is a separate
//                                  model-limited term beside the statistical one.
//
// Pure: no DOM, no clock.
// =============================================================================

import { refused } from '../statistics/check.js';
import { covarianceInterval } from '../statistics/intervals.js';
import { C_LIGHT, PC_M } from '../radiation/constants.js';

const { Math, Number } = globalThis;
const MPC_M = PC_M * 1e6;

/** The relative margin by which the scatter must exceed the statistical term to call a result model-limited (AM5). */
export const MODEL_LIMITED_TOLERANCE = 1e-9;

/** The one-sided 95 percent normal multiplier. */
export const ONE_SIDED_95 = 1.6448536269514722;

/**
 * lambda F_lambda (= nu F_nu) in W m^-2 from a flux density per nm and its wavelength.
 * @param {number} lambdaNm
 * @param {number} fLambdaWM2Nm
 */
export const nuFnuFromFlambda = (lambdaNm, fLambdaWM2Nm) =>
  lambdaNm * fLambdaWM2Nm;

/**
 * nu F_nu in W m^-2 from F_nu in W m^-2 Hz^-1 and the wavelength: nu = c / lambda.
 * @param {number} lambdaNm
 * @param {number} fNuWM2Hz
 */
export const nuFnuFromFnu = (lambdaNm, fNuWM2Hz) =>
  (C_LIGHT / (lambdaNm * 1e-9)) * fNuWM2Hz;

/**
 * The luminosity at the observed band, nu L_nu at the rest wavelength lambda_obs / (1 + z).
 * @param {{observedNm: number, nuFnu: {value: number, sigma?: number}, z: number, cosmology: object}} o
 */
export function bandLuminosity({ observedNm, nuFnu, z, cosmology } = {}) {
  if (!(observedNm > 0) || !Number.isFinite(observedNm))
    return refused('bad-band', 'the observed wavelength must be positive');
  if (!nuFnu || !(nuFnu.value > 0) || !Number.isFinite(nuFnu.value))
    return refused('bad-flux', 'the flux nu F_nu must be positive and finite');
  const sigma = nuFnu.sigma ?? 0;
  if (!(sigma >= 0) || !Number.isFinite(sigma))
    return refused(
      'bad-flux-error',
      'the flux error must be finite and not negative'
    );
  if (!Number.isFinite(z) || z < 0)
    return refused(
      'bad-redshift',
      'the redshift must be finite and not negative'
    );
  if (!cosmology || typeof cosmology.luminosityDistance !== 'function')
    return refused(
      'no-cosmology',
      'a cosmology (the cosmology kernel’s createCosmology) is required; the distance is assumed, not measured'
    );
  const dLMpc = cosmology.luminosityDistance(z);
  const dLm = dLMpc * MPC_M;
  const L = 4 * Math.PI * dLm * dLm * nuFnu.value;
  return {
    status: 'ok',
    luminosityW: L,
    log10L: Math.log10(L),
    sigmaLog10: sigma / (nuFnu.value * Math.LN10),
    restNm: observedNm / (1 + z),
    observedNm,
    z,
    dLMpc,
    cosmology: { H0: cosmology.H0, Om: cosmology.Om, OL: cosmology.OL },
    kCorrection: 'none',
    quantity: 'nu L_nu at the rest wavelength observedNm / (1 + z)',
    statement:
      'no K-correction is applied: this is the luminosity at the rest wavelength lambda_obs / (1 + z), which changes with redshift, so two sources at different redshifts are compared at different rest wavelengths',
    assumes:
      'the stated cosmology, no distance uncertainty from it or from peculiar velocity; no extinction correction; isotropic emission; the flux is a band flux at one wavelength, not integrated',
  };
}

/**
 * The bolometric luminosity from a band luminosity and a caller-supplied correction.
 * @param {{band: object, bc: {value: number, scatterDex: number, restNm: number, toleranceFraction: number, source: string}, level?: number}} o
 */
export function bolometricLuminosity({ band, bc, level } = {}) {
  if (!band || band.status !== 'ok')
    return refused('no-band', 'a band luminosity (bandLuminosity) is required');
  if (!bc || typeof bc.source !== 'string' || !bc.source.trim())
    return refused(
      'no-source',
      'the bolometric correction needs a source string; there is no default and none is built in'
    );
  if (!(bc.value > 0) || !Number.isFinite(bc.value))
    return refused('bad-factor', 'the correction factor must be positive');
  if (!(bc.scatterDex >= 0) || !Number.isFinite(bc.scatterDex))
    return refused(
      'bad-scatter',
      'the correction’s scatter in dex is required and must not be negative'
    );
  if (!(bc.restNm > 0) || !(bc.toleranceFraction > 0))
    return refused(
      'no-band',
      'the correction’s rest band (restNm) and a tolerance fraction are required'
    );
  const off = Math.abs(band.restNm - bc.restNm) / bc.restNm;
  if (off > bc.toleranceFraction)
    return {
      ...refused(
        'band-mismatch',
        `the observed band maps to a rest wavelength of ${Math.round(band.restNm * 10) / 10} nm, ${Math.round(1000 * off) / 10} percent from the correction's band, more than its tolerance: no K-correction exists to move it`
      ),
      restNm: band.restNm,
      bcRestNm: bc.restNm,
    };
  const sigmaStat = band.sigmaLog10;
  const sigmaModel = bc.scatterDex;
  const sigmaTotal = Math.hypot(sigmaStat, sigmaModel);
  const log10L = band.log10L + Math.log10(bc.value);
  const at = (sig, lv) => {
    const iv = covarianceInterval(log10L, sig, lv ? { level: lv } : {});
    return { lo: 10 ** iv.lo, hi: 10 ** iv.hi, level: iv.level };
  };
  return {
    status: 'ok',
    luminosityW: band.luminosityW * bc.value,
    log10L,
    sigmaStat,
    sigmaModel,
    sigmaTotal,
    interval: at(sigmaTotal, level),
    intervalStatOnly: at(sigmaStat, level),
    lowerLimit95W: 10 ** (log10L - ONE_SIDED_95 * sigmaTotal),
    modelLimited: sigmaModel > sigmaStat * (1 + MODEL_LIMITED_TOLERANCE),
    restNm: band.restNm,
    z: band.z,
    kCorrection: band.kCorrection,
    bc: {
      value: bc.value,
      scatterDex: bc.scatterDex,
      restNm: bc.restNm,
      source: bc.source,
    },
    statement:
      'the model-limited term is the correction’s scatter and does not shrink with more data; the statistical term is the flux error alone; no distance uncertainty and no K-correction',
  };
}
