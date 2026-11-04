// The constants and the cited coefficients of the dynamics kernel (Prompt 237, DYNAMICS.md).
// G is never typed: it is derived from the IAU 2015 nominal GM of the Sun, the astronomical
// unit (IAU 2012) and the parsec as 648000 / pi astronomical units, so that the kernel and
// the independent oracle (tools/dynamics-oracle/oracle.py) share definitions and no number.
//
// Working units: parsecs, kilometres per second, solar masses, megayears.
const { Math } = globalThis;

export const GM_SUN_M3S2 = 1.3271244e20;
export const AU_M = 149597870700;
export const PC_M = (648000 / Math.PI) * AU_M;
export const JULIAN_YEAR_S = 31557600;
export const MYR_S = 1e6 * JULIAN_YEAR_S;

/** G in pc (km/s)^2 per solar mass. */
export const G_PC_KMS2_MSUN = GM_SUN_M3S2 / (PC_M * 1e6);
/** One parsec per (km/s), in megayears. */
export const PC_PER_KMS_MYR = PC_M / 1e3 / MYR_S;

/**
 * Coefficients of cited relations. Each is written from the cited text by the author of the
 * kernel; no agent fetched the source and none of these is a measured quantity. `verify` is true
 * until Carl has checked the value against the page (DYNAMICS_REFERENCE_GATE.md, "What to
 * fetch"), and every use states the coefficient it used.
 */
export const CITED = Object.freeze({
  spitzerRelaxation: {
    value: 0.138,
    what: 'the coefficient of the half-mass relaxation time, t_rh = c N^(1/2) r_h^(3/2) / (m^(1/2) G^(1/2) ln(gamma N))',
    source: 'Spitzer, L. 1987, Dynamical Evolution of Globular Clusters (Princeton University Press), chapter 2',
    verify: true,
  },
  gamma: {
    equalMass: {
      value: 0.11,
      source: 'Giersz, M. and Heggie, D. C. 1994, MNRAS 268, 257',
      verify: true,
    },
    massSpectrum: {
      value: 0.02,
      source: 'Giersz, M. and Heggie, D. C. 1996, MNRAS 279, 1037',
      verify: true,
    },
    spitzerHart: {
      value: 0.4,
      source: 'Spitzer, L. and Hart, M. H. 1971, ApJ 164, 399',
      verify: true,
    },
  },
  evaporation: {
    value: 300,
    what: 'the evaporation time of an isolated, tidally truncated cluster in units of its half-mass relaxation time',
    source: 'Spitzer, L. 1987, Dynamical Evolution of Globular Clusters (Princeton University Press)',
    verify: true,
  },
  segregation: {
    what: 'the time for a star above the mean mass to sink to the centre, (m_mean / m) t_rh, an order of magnitude',
    source: 'Spitzer, L. 1969, ApJ 158, L139',
    verify: true,
  },
  friction: {
    what: "Chandrasekhar's dynamical friction in a Maxwellian background, derived in DYNAMICS.md (no coefficient is cited)",
    source: 'Chandrasekhar, S. 1943, ApJ 97, 255',
    verify: false,
  },
  plummer: {
    what: 'eta = 32 / pi for the virial mass M = eta sigma_los^2 R_h / G of an isotropic Plummer sphere, derived in DYNAMICS.md (<v^2> = 3 pi G M / (32 a), R_h = a)',
    source: 'derived; the distribution function is Plummer, H. C. 1911, MNRAS 71, 460',
    verify: false,
  },
});

/** The convention of the collisionless-versus-collisional criterion: a stated rule, not a law. */
export const CRITERION = Object.freeze({
  collisionlessBelow: 0.1,
  collisionalAbove: 1,
});

/** The smallest count the virial estimator accepts, the structure term and the resolution rule. */
export const VIRIAL = Object.freeze({
  minimumMembers: 20,
  structureSigma: 0.15,
  resolvedSigmas: 4,
  eta: 32 / Math.PI,
});
