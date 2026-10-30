// =============================================================================
// Constants and cited tables of the remnants kernel (REMNANTS.md)
// -----------------------------------------------------------------------------
// Every number here is read from a paper or a table, and says which. The
// relations and ranges were read in the arXiv texts (Prompt 222 session,
// 2026-10-30); `checked: true` means the value was read there, not typed from
// memory. SI for the physics; solar masses, solar luminosities and years for
// the astronomers' quantities, as the papers give them.
// =============================================================================

import {
  G_SI,
  SOLAR_MASS_KG,
  SOLAR_RADIUS_M,
  SECONDS_PER_YEAR,
} from '../stellar/constants.js';
import { L_SUN_W, SIGMA_SB } from '../radiation/constants.js';

export { G_SI, SOLAR_MASS_KG, SOLAR_RADIUS_M, SECONDS_PER_YEAR, L_SUN_W };
export { SIGMA_SB };

/** The effective temperature of the nominal Sun, from the application's L and R. */
export const TEFF_SUN_K =
  (L_SUN_W / (4 * Math.PI * SOLAR_RADIUS_M ** 2 * SIGMA_SB)) ** 0.25;

/**
 * The mean mass number of the cooling table's C/O core, mass fractions 0.495
 * carbon and 0.495 oxygen (Bedard et al. 2020): 0.99 / (0.495/12 + 0.495/16).
 */
export const A_REF = 0.99 / (0.495 / 12 + 0.495 / 16);

/** Where the Mestel law is the leading effect, and where this kernel answers. */
export const COOLING_DOMAIN = Object.freeze({
  massSun: Object.freeze([0.5, 1.0]),
  logLSun: Object.freeze([-4.0, -1.5]),
});

/** What a cooling age's coefficients were calibrated on (cooling.js, REMNANTS.md). */
export const COOLING_CALIBRATION = Object.freeze({
  source:
    'Bedard, Bergeron, Brassard and Fontaine (2020, ApJ 901, 93), DA, thick hydrogen, C/O core; the Montreal group sequences, derived pin tests/fixtures/remnants/cooling-pin.json',
  tauMasses: Object.freeze([0.6]),
  modelTermMasses: Object.freeze([0.5, 0.6, 1.0]),
});

/**
 * The cited initial-final mass relations (Cummings et al. 2018, ApJ 866, 21):
 * Mf = slope * Mi + intercept on each piece, with the printed one-sigma
 * uncertainties of the two coefficients and the scatter of the data about the
 * relation (0.06 solar masses, the standard deviation excluding NGC 2099-WD33
 * and NGC 2168-LAWDS11).
 */
export const IFMR = Object.freeze({
  scatter: 0.06,
  domain: Object.freeze([0.83, 7.5]),
  relations: Object.freeze({
    mist: Object.freeze({
      id: 'mist',
      label: 'MIST-based (Cummings et al. 2018, equations 4 to 6)',
      pieces: Object.freeze([
        {
          lo: 0.83,
          hi: 2.85,
          slope: 0.08,
          sSlope: 0.016,
          intercept: 0.489,
          sIntercept: 0.03,
        },
        {
          lo: 2.85,
          hi: 3.6,
          slope: 0.187,
          sSlope: 0.061,
          intercept: 0.184,
          sIntercept: 0.199,
        },
        {
          lo: 3.6,
          hi: 7.2,
          slope: 0.107,
          sSlope: 0.016,
          intercept: 0.471,
          sIntercept: 0.077,
        },
      ]),
      checked: true,
    }),
    parsec: Object.freeze({
      id: 'parsec',
      label: 'PARSEC-based (Cummings et al. 2018, equations 1 to 3)',
      pieces: Object.freeze([
        {
          lo: 0.87,
          hi: 2.8,
          slope: 0.0873,
          sSlope: 0.019,
          intercept: 0.476,
          sIntercept: 0.033,
        },
        {
          lo: 2.8,
          hi: 3.65,
          slope: 0.181,
          sSlope: 0.041,
          intercept: 0.21,
          sIntercept: 0.131,
        },
        {
          lo: 3.65,
          hi: 8.2,
          slope: 0.0835,
          sSlope: 0.0144,
          intercept: 0.565,
          sIntercept: 0.073,
        },
      ]),
      checked: true,
    }),
  }),
});

/**
 * The cited threshold ranges of the remnant outcome, in initial solar masses
 * (solar metallicity). The papers give ranges and a caution, not
 * distributions; each is treated as uniform, which is this kernel's choice.
 */
export const THRESHOLDS = Object.freeze({
  whiteDwarfToNeutronStar: Object.freeze({
    lo: 7.0,
    hi: 9.5,
    sources: Object.freeze([
      'Smartt (2009, ARA&A 47, 63): the minimum initial mass that produces a supernova converged to 8 +- 1 solar masses (abstract); the maximum-likelihood minimum for type II-P progenitors 8.5 +1 -1.5, as the review quotes it from Smartt et al. (2009)',
      'Heger et al. (2003, ApJ 591, 288): stars below about 9 solar masses do not form massive enough cores to collapse and end as white dwarfs',
    ]),
    checked: true,
  }),
  neutronStarToBlackHole: Object.freeze({
    lo: 20,
    hi: 40,
    sources: Object.freeze([
      'Heger et al. (2003): lower mass limit for fallback black-hole formation 20 (low) or 25 (high) solar masses; "M-upper" 40, above which black holes form directly',
      'Sukhbold et al. (2016, ApJ 821, 38): no single mass below which every star explodes; islands of explodability in a sea of black-hole formation, so the outcome is not a monotonic map of the initial mass',
    ]),
    checked: true,
  }),
  /** The range of initial masses the outcome is defined for. */
  domain: Object.freeze([0.8, 120]),
  /** Above this a star is disrupted by the pair instability (Heger et al. 2003: a helium core above about 65, an initial mass of about 140). */
  pairInstability: 140,
});

/**
 * Neutron-star masses (Ozel and Freire 2016, ARA&A 54, 401). Table 1: the
 * double-neutron-star systems with well-measured component masses (pulsar,
 * then companion, solar masses, the last digit's uncertainty in the paper's
 * parentheses); and the three Gaussian populations of Section 2.3.
 */
export const NEUTRON_STARS = Object.freeze({
  source: 'Ozel and Freire (2016), arXiv:1603.02698, Table 1 and Section 2.3',
  checked: true,
  systems: Object.freeze([
    {
      id: 'J0453+1559',
      pulsar: 1.559,
      companion: 1.174,
      sigma: [0.005, 0.004],
    },
    {
      id: 'J0737-3039',
      pulsar: 1.3381,
      companion: 1.2489,
      sigma: [0.0007, 0.0007],
    },
    {
      id: 'B1534+12',
      pulsar: 1.333,
      companion: 1.3455,
      sigma: [0.0004, 0.0004],
    },
    { id: 'J1756-2251', pulsar: 1.341, companion: 1.23, sigma: [0.007, 0.007] },
    {
      id: 'J1906+0746',
      pulsar: 1.291,
      companion: 1.322,
      sigma: [0.011, 0.011],
    },
    {
      id: 'B1913+16',
      pulsar: 1.4398,
      companion: 1.3886,
      sigma: [0.0002, 0.0002],
    },
    { id: 'B2127+11C', pulsar: 1.358, companion: 1.354, sigma: [0.01, 0.01] },
  ]),
  populations: Object.freeze({
    doubleNeutronStars: Object.freeze({ mean: 1.33, sigma: 0.09 }),
    recycled: Object.freeze({ mean: 1.54, sigma: 0.23 }),
    slowPulsars: Object.freeze({ mean: 1.49, sigma: 0.19 }),
  }),
});
