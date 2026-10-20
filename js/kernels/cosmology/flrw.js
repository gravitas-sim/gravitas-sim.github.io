// =============================================================================
// FLRW distances and times: matter plus a cosmological constant
// -----------------------------------------------------------------------------
// The kernel of Roadmap II Prompt 91, as COSMOLOGY_GATE.md section 3 measured
// it (flat and open Lambda-CDM; the open matter-only family is the same code at
// Omega_L = 0). Pure and Worker-safe: no DOM, no clock; its one import is the quadrature rule.
//
//   E(z)^2 = Om (1+z)^3 + Ok (1+z)^2 + OL,   Ok = 1 - Om - OL >= 0
//   D_C = (c/H0) Int_0^z dz'/E(z')
//   D_M = D_C                                      (flat)
//       = (c/H0)/sqrt(Ok) sinh(sqrt(Ok) D_C H0/c)  (open)
//   D_L = (1+z) D_M,  D_A = D_M/(1+z),  mu = 5 log10(D_L / 10 pc)
//   t_lookback = (1/H0) Int_0^z dz'/((1+z') E(z'))
//
// Assumptions, all of them: a homogeneous and isotropic universe; dark energy
// with a fixed equation of state w = -1; radiation (light and neutrinos)
// neglected, which changes luminosity distances by less than 0.5% up to z = 5
// (0.54% at z = 10, measured against astropy with the CMB on); no peculiar
// velocities, clustering or growth of structure. Closed universes (Ok < 0) are
// refused. Units: distances in Mpc, times in Gyr, H0 in km/s/Mpc.
//
// The integrals are composite 16-point Gauss-Legendre (js/numeric/quadrature.js, the
// rule this file held until Prompt 152, bit for bit) in u = ln(1+z) with
// panels at most 0.25 wide. Against astropy the kernel is within 1.8e-12 and
// against quadrature within 9e-16 on the 900-point grid of the validation
// suite (tests/cosmologyKernel.test.js).
// =============================================================================

// Bound once, not read as globals: in Jest's vm context every free global read
// goes through the context, which made integration loops 10x slower than in Node.
import { gaussLegendre as gl } from '../../numeric/quadrature.js';

const { Math } = globalThis;

export const C_KMS = 299792.458;
const MPC_KM = 3.085677581491367e19;
const JULIAN_YEAR_S = 365.25 * 86400;
/** (1/H0) in Gyr for H0 = 1 km/s/Mpc. */
export const GYR_PER_INV_H0 = MPC_KM / JULIAN_YEAR_S / 1e9;

/** Thrown for a universe with Omega_k < 0, which this kernel does not model. */
export class ClosedModelError extends Error {
  constructor(message = 'closed models (Omega_k < 0) are not supported') {
    super(message);
    this.name = 'ClosedModelError';
  }
}

/**
 * A cosmology. All distances in Mpc, times in Gyr.
 * @param {{H0: number, Om: number, OL: number}} p - H0 in km/s/Mpc; Om and OL
 *   the matter and cosmological-constant densities over the critical density
 * @throws {RangeError} for H0 <= 0 or a negative density
 * @throws {ClosedModelError} for Om + OL > 1
 */
export function createCosmology({ H0, Om, OL }) {
  if (!(H0 > 0) || !(Om >= 0) || !(OL >= 0))
    throw new RangeError('H0 > 0, Om >= 0 and OL >= 0 are required');
  const Ok = 1 - Om - OL;
  if (Ok < -1e-12) throw new ClosedModelError();
  const Ok0 = Math.max(Ok, 0);
  const dh = C_KMS / H0;
  const E = z => {
    const x = 1 + z;
    return Math.sqrt(Om * x * x * x + Ok0 * x * x + OL);
  };
  const panels = z => Math.max(1, Math.ceil(Math.log1p(z) / 0.25));
  const integ = (g, z) =>
    z > 0
      ? gl(u => g(Math.expm1(u)) * Math.exp(u), 0, Math.log1p(z), panels(z))
      : 0;
  const comoving = z => dh * integ(zp => 1 / E(zp), z);
  const transverse = z => {
    const dc = comoving(z);
    if (Ok0 < 1e-12) return dc;
    const s = Math.sqrt(Ok0);
    return (dh / s) * Math.sinh((s * dc) / dh);
  };
  return {
    H0,
    Om,
    OL,
    Ok: Ok0,
    /** H(z)/H0. */
    E,
    hubbleParameter: z => H0 * E(z),
    scaleFactor: z => 1 / (1 + z),
    comovingDistance: comoving,
    transverseComovingDistance: transverse,
    luminosityDistance: z => (1 + z) * transverse(z),
    angularDiameterDistance: z => transverse(z) / (1 + z),
    /** Gyr between then and now. */
    lookbackTime: z =>
      (GYR_PER_INV_H0 / H0) * integ(zp => 1 / ((1 + zp) * E(zp)), z),
    /** Gyr since the big bang, in a = s^2 where the integrand is smooth. Needs Om > 0. */
    age() {
      if (!(Om > 0)) throw new RangeError('the age needs Om > 0');
      return (
        (GYR_PER_INV_H0 / H0) *
        gl(
          s => (2 * s * s) / Math.sqrt(Om + Ok0 * s * s + OL * s ** 6),
          0,
          1,
          4
        )
      );
    },
    distanceModulus: z => 5 * Math.log10((1 + z) * transverse(z)) + 25,
  };
}

/**
 * Closed forms used as identities in the validation, never by the kernel.
 * mattigLuminosity is the textbook form; evaluated in double precision it
 * loses digits to cancellation at small Om z, so the suite restates it against
 * a 60-digit evaluation (tests/cosmologyKernel.test.js, D-COSMO-10).
 */
export const closedForms = {
  /** Einstein-de Sitter comoving distance, Mpc. */
  edsComoving: (H0, z) => ((2 * C_KMS) / H0) * (1 - 1 / Math.sqrt(1 + z)),
  /** Open matter-only luminosity distance (Mattig 1958), Mpc, 0 < Om < 1, OL = 0. */
  mattigLuminosity: (H0, Om, z) =>
    ((2 * C_KMS) / H0 / (Om * Om)) *
    (Om * z + (Om - 2) * (Math.sqrt(1 + Om * z) - 1)),
  /** Flat Lambda-CDM lookback time, Gyr. */
  flatLambdaLookback: (H0, Om, z) => {
    const OL = 1 - Om;
    return (
      (GYR_PER_INV_H0 / H0) *
      (2 / (3 * Math.sqrt(OL))) *
      (Math.asinh(Math.sqrt(OL / Om)) -
        Math.asinh(Math.sqrt(OL / Om) * Math.pow(1 + z, -1.5)))
    );
  },
  /** Flat Lambda-CDM age, Gyr. */
  flatLambdaAge: (H0, Om) => {
    const OL = 1 - Om;
    return (
      (GYR_PER_INV_H0 / H0) *
      (2 / (3 * Math.sqrt(OL))) *
      Math.asinh(Math.sqrt(OL / Om))
    );
  },
};

/**
 * Hubble's law at low redshift: the velocity cz of a galaxy at distance d.
 * The first term of the distance series; it is the model of the first rung.
 */
export const hubbleVelocity = (H0, d) => H0 * d;

// --- The sky as a wedge ------------------------------------------------------

const DEG = Math.PI / 180;

/**
 * A galaxy's place in a wedge diagram: across and along the line of sight, in
 * Mpc, from its right ascension and redshift, for a stated cosmology. The
 * wedge's centre line is ra0 (degrees).
 */
export function wedgePoint(cosmology, raDeg, z, ra0 = 180) {
  const r = cosmology.comovingDistance(z);
  const th = (raDeg - ra0) * DEG;
  return { r, x: r * Math.sin(th), y: r * Math.cos(th) };
}

/** The inverse of wedgePoint: the RA (degrees) and redshift of a point of the wedge. */
export function wedgeInverse(cosmology, x, y, ra0 = 180) {
  const r = Math.hypot(x, y);
  let lo = 0;
  let hi = 1;
  while (cosmology.comovingDistance(hi) < r) hi *= 2;
  for (let i = 0; i < 200; i++) {
    const m = (lo + hi) / 2;
    if (cosmology.comovingDistance(m) < r) lo = m;
    else hi = m;
  }
  return { ra: ra0 + Math.atan2(x, y) / DEG, z: (lo + hi) / 2 };
}
