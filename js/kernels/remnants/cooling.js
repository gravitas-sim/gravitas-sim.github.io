// =============================================================================
// White-dwarf cooling ages from a Mestel-type law, in a stated domain
// -----------------------------------------------------------------------------
// A white dwarf has no nuclear fuel; it shines with the heat of its ions,
// leaking out through a thin, radiative, non-degenerate envelope. Mestel
// (1952): the ion heat is U = (3/2) k T M / (A m_u), the envelope (Kramers
// opacity over an isothermal degenerate core) lets out L = C M T^(7/2), so
// dU/dt = -L gives t = (2/5) U / L, and with T proportional to (L / M)^(2/7)
//
//     t = tau (A_ref / A) (M / Msun)^(5/7) (L / Lsun)^(-5/7).
//
// The exponents and the 1/A are consequences of the assumptions and are tested
// analytically; the one coefficient tau is taken from the cited table (the
// Montreal sequences, calibrate() below) and the law's own error against that
// table, measured at the masses that did not set tau, is carried as a term of
// its own beside the observational one. The law holds where the ions' heat is
// the only reservoir and photons the only loss (COOLING_DOMAIN); outside it,
// or for a star the model does not describe, the answer is a refusal.
//
// Units: solar masses, solar luminosities (or log10 of them), kelvin, years.
// =============================================================================

import { TEFF_SUN_K, A_REF, COOLING_DOMAIN } from './constants.js';
import {
  chandrasekharMassSun,
  whiteDwarf,
  centralXForMass,
} from '../stellar/whiteDwarf.js';
import { TAU_YR, MODEL_DELTA_LN } from './calibration.js';

const EXP = 5 / 7;
const LN10 = Math.LN10;
const Z95 = 1.959963984540054;

/** The model's own luminosity-age law: years for a mass, a luminosity and an ion mass number. */
export const coolingAgeLaw = (massSun, lumSun, ionA = A_REF, tau = TAU_YR) =>
  tau * (A_REF / ionA) * massSun ** EXP * lumSun ** -EXP;

/** The luminosity (solar) at which a dwarf of that mass has that cooling age. */
export const luminosityAtAge = (massSun, ageYr, ionA = A_REF, tau = TAU_YR) =>
  ((tau * (A_REF / ionA) * massSun ** EXP) / ageYr) ** (1 / EXP);

/** The time a dwarf takes to cool between two luminosities (years, from L0 down to L1 < L0). */
export const coolingTimeBetween = (
  massSun,
  lum0Sun,
  lum1Sun,
  ionA = A_REF,
  tau = TAU_YR
) =>
  tau * (A_REF / ionA) * massSun ** EXP * (lum1Sun ** -EXP - lum0Sun ** -EXP);

/** Stefan-Boltzmann: L / Lsun from a radius (solar) and an effective temperature (kelvin). */
export const luminosityFromRadiusTeff = (radiusSun, teffK) =>
  radiusSun ** 2 * (teffK / TEFF_SUN_K) ** 4;

/** The effective temperature of a star with L and R (solar). */
export const teffFromLuminosityRadius = (lumSun, radiusSun) =>
  TEFF_SUN_K * (lumSun / radiusSun ** 2) ** 0.25;

const radiusCache = new Map();

/**
 * The radius (solar) the Teff entry assumes: the cold degenerate mass-radius
 * relation of js/kernels/stellar/whiteDwarf.js, about 3 per cent larger than
 * the best published radii at 0.6 solar masses. Cached by mass.
 */

/** The pin's key for a mass on the 0.1 grid: "0.5", "1.0" (no number formatting call). */
const massKey = m => {
  const tenths = Math.round(m * 10);
  return `${Math.floor(tenths / 10)}.${tenths % 10}`;
};

export function radiusSunOf(massSun) {
  const key = Math.round(massSun * 1e9) / 1e9;
  let r = radiusCache.get(key);
  if (r === undefined) {
    r = whiteDwarf(centralXForMass(massSun)).radiusSun;
    radiusCache.set(key, r);
  }
  return r;
}

const refuse = (reason, detail) => ({
  status: 'refused',
  reason,
  detail,
  domain: COOLING_DOMAIN,
});

const isNum = v => typeof v === 'number' && Number.isFinite(v);

/**
 * The cooling age of a white dwarf, or the reason there is none.
 *
 * Give the mass and either the luminosity (`logLSun` or `lumSun`) or the
 * effective temperature (`teffK`). The uncertainties are one-sigma and
 * optional: `sigmaMass` (solar masses), `sigmaLogL` (dex) or `sigmaTeff` (K).
 *
 * The result carries the observational term (first-order propagation through
 * the law), the model term (the law's error against the cited table) and their
 * quadrature total, all in ln t, and a 95 per cent interval for each.
 *
 * @returns {object} status 'ok' with the age, or status 'refused' with a reason
 */
export function coolingAge(input = {}) {
  const {
    massSun,
    logLSun,
    lumSun,
    teffK,
    sigmaMass = 0,
    sigmaLogL = 0,
    sigmaTeff = 0,
    ionA = A_REF,
  } = input;
  const given = [logLSun, lumSun, teffK].filter(v => v !== undefined);
  if (
    !isNum(massSun) ||
    massSun <= 0 ||
    given.length !== 1 ||
    !given.every(isNum) ||
    !isNum(sigmaMass) ||
    sigmaMass < 0 ||
    !isNum(sigmaLogL) ||
    sigmaLogL < 0 ||
    !isNum(sigmaTeff) ||
    sigmaTeff < 0 ||
    !isNum(ionA) ||
    ionA <= 0
  )
    return refuse(
      'invalid-input',
      'a mass and exactly one of logLSun, lumSun, teffK, finite, positive'
    );
  if (
    (lumSun !== undefined && lumSun <= 0) ||
    (teffK !== undefined && teffK <= 0)
  )
    return refuse(
      'invalid-input',
      'a luminosity or a temperature that is not positive'
    );
  if (massSun >= chandrasekharMassSun())
    return refuse(
      'above-chandrasekhar',
      'a mass at or above the Chandrasekhar mass of the model has no white dwarf'
    );
  const [m0, m1] = COOLING_DOMAIN.massSun;
  if (massSun < m0 || massSun > m1)
    return refuse(
      'mass-out-of-domain',
      `the law is validated from ${m0} to ${m1} solar masses`
    );

  let logL;
  let radiusSun = null;
  let dlnR = 0;
  if (teffK !== undefined) {
    radiusSun = radiusSunOf(massSun);
    const eps = 0.01;
    const r1 = radiusSunOf(massSun * (1 + eps));
    const r0 = radiusSunOf(massSun * (1 - eps));
    dlnR = Math.log(r1 / r0) / Math.log((1 + eps) / (1 - eps));
    logL = Math.log10(luminosityFromRadiusTeff(radiusSun, teffK));
  } else logL = logLSun !== undefined ? logLSun : Math.log10(lumSun);
  const [l0, l1] = COOLING_DOMAIN.logLSun;
  if (logL < l0 || logL > l1)
    return refuse(
      teffK !== undefined
        ? 'teff-luminosity-out-of-domain'
        : 'luminosity-out-of-domain',
      `log L/Lsun = ${Math.round(logL * 100) / 100} is outside ${l0} to ${l1}`
    );

  const lumNow = 10 ** logL;
  const ageYr = coolingAgeLaw(massSun, lumNow, ionA);
  // d ln t = (5/7) [ (1 - 2 dlnR/dlnM) dlnM - 4 dlnT ] for a Teff entry, and
  // (5/7) [ dlnM - ln10 dlogL ] for a luminosity entry.
  const sM = sigmaMass / massSun;
  const sObs =
    teffK !== undefined
      ? EXP * Math.hypot((1 - 2 * dlnR) * sM, (4 * sigmaTeff) / teffK)
      : EXP * Math.hypot(sM, LN10 * sigmaLogL);
  const sModel = MODEL_DELTA_LN / Z95;
  const sTotal = Math.hypot(sObs, sModel);
  const band = s => ({
    lo: ageYr * Math.exp(-Z95 * s),
    hi: ageYr * Math.exp(Z95 * s),
  });
  return {
    status: 'ok',
    massSun,
    logLSun: logL,
    lumSun: lumNow,
    teffK: teffK ?? teffFromLuminosityRadius(lumNow, radiusSunOf(massSun)),
    radiusSun: radiusSun ?? radiusSunOf(massSun),
    ageYr,
    sigmaObsLn: sObs,
    sigmaModelLn: sModel,
    sigmaTotalLn: sTotal,
    observational95: band(sObs),
    model95: band(sModel),
    interval95: band(sTotal),
    modelLimited: sModel >= sObs,
    domain: COOLING_DOMAIN,
  };
}

/**
 * The result as a quantity of the artifact envelope (Prompt 150): a
 * model-limited uncertainty, the model's floor beside the observational sigma,
 * when the model term is the larger, else one sigma with their quadrature
 * total. Gigayears. Null for a refusal.
 */
export function coolingQuantity(result, id = 'cooling.age') {
  if (!result || result.status !== 'ok') return null;
  const age = result.ageYr / 1e9;
  const sObs = age * result.sigmaObsLn;
  const sModel = age * result.sigmaModelLn;
  return {
    id,
    label: 'Cooling age',
    value: age,
    unit: 'Gyr',
    origin: 'analytic',
    uncertainty:
      sObs <= sModel
        ? { kind: 'model-limited', basis: 'model', sigma: sObs, floor: sModel }
        : {
            kind: 'sigma',
            basis: 'derived',
            sigma: age * result.sigmaTotalLn,
          },
  };
}

// ---- calibration ----------------------------------------------------------

/** Trapezoid weights of rows ordered by log L (either way): the width each row stands for. */
export function trapezoidWeights(x) {
  const n = x.length;
  const w = new Array(n);
  for (let i = 0; i < n; i++) {
    if (i === 0) w[i] = Math.abs(x[1] - x[0]) / 2;
    else if (i === n - 1) w[i] = Math.abs(x[n - 1] - x[n - 2]) / 2;
    else w[i] = Math.abs(x[i - 1] - x[i + 1]) / 2;
  }
  return w;
}

/**
 * The weighted p-quantile of values: the smallest value whose cumulative
 * normalised weight reaches p, the values in increasing order.
 */
export function weightedQuantile(values, weights, p) {
  const order = values.map((v, i) => i).sort((a, b) => values[a] - values[b]);
  const total = weights.reduce((a, b) => a + b, 0);
  let acc = 0;
  for (const i of order) {
    acc += weights[i] / total;
    if (acc >= p - 1e-12) return values[i];
  }
  return values[order[order.length - 1]];
}

const inDomain = (rows, domain) =>
  rows.filter(r => r[1] >= domain.logLSun[0] && r[1] <= domain.logLSun[1]);

/**
 * The calibration of the law on the cited table's rows (the pin's rows of
 * [Teff, log L, R, age] by mass): tau from the masses in `tauMasses` and the
 * model term from the masses in `modelMasses`, both as the thresholds file
 * defines them.
 */
export function calibrate(rowsByMass, options = {}) {
  const {
    tauMasses = [0.6],
    modelMasses = [0.5, 0.6, 1.0],
    domain = COOLING_DOMAIN,
  } = options;
  let num = 0;
  let den = 0;
  for (const m of tauMasses) {
    const rows = inDomain(rowsByMass[massKey(m)], domain);
    const w = trapezoidWeights(rows.map(r => r[1]));
    rows.forEach((r, i) => {
      num += w[i] * Math.log((r[3] * (10 ** r[1]) ** EXP) / m ** EXP);
      den += w[i];
    });
  }
  const tau = Math.exp(num / den);
  const absR = [];
  const wts = [];
  for (const m of modelMasses) {
    const rows = inDomain(rowsByMass[massKey(m)], domain);
    const w = trapezoidWeights(rows.map(r => r[1]));
    const wsum = w.reduce((a, b) => a + b, 0);
    rows.forEach((r, i) => {
      absR.push(
        Math.abs(Math.log(coolingAgeLaw(m, 10 ** r[1], A_REF, tau) / r[3]))
      );
      wts.push(w[i] / wsum / modelMasses.length);
    });
  }
  return { tau, delta: weightedQuantile(absR, wts, 0.95) };
}

/** The domain's edge temperatures for a mass, from the model radius: [cool, hot] in kelvin. */
export function teffRange(massSun) {
  const r = radiusSunOf(massSun);
  const [l0, l1] = COOLING_DOMAIN.logLSun;
  return [
    teffFromLuminosityRadius(10 ** l0, r),
    teffFromLuminosityRadius(10 ** l1, r),
  ];
}
