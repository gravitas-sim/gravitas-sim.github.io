// FLRW distance kernel (prototype). Matter plus a cosmological constant,
// radiation neglected, w = -1. Flat and open only; Omega_k < 0 is refused.
//
//   E(z)^2 = Om (1+z)^3 + Ok (1+z)^2 + OL,   Ok = 1 - Om - OL >= 0
//   D_C = (c/H0) Int_0^z dz'/E(z')
//   D_M = D_C                          (flat)
//       = (c/H0)/sqrt(Ok) sinh(sqrt(Ok) D_C H0/c)   (open)
//   D_L = (1+z) D_M,  D_A = D_M/(1+z)
//   t_lb = (1/H0) Int_0^z dz'/((1+z') E(z'))
//
// The integrals use composite Gauss-Legendre: panels of width at most 0.25
// in ln(1+z), 16 nodes each. No dependencies, no DOM. Units: Mpc, Gyr, km/s.
export const C_KMS = 299792.458;
const MPC_KM = 3.0856775814913673e19;
const JULIAN_YEAR_S = 365.25 * 86400;
export const GYR_PER_INV_H0 = MPC_KM / JULIAN_YEAR_S / 1e9; // (1/H0) in Gyr for H0 = 1 km/s/Mpc

// 16-point Gauss-Legendre nodes and weights on [-1, 1].
const GL_X = [
  0.0950125098376374, 0.2816035507792589, 0.4580167776572274, 0.6178762444026438,
  0.7554044083550030, 0.8656312023878318, 0.9445750230732326, 0.9894009349916499,
];
const GL_W = [
  0.1894506104550685, 0.1826034150449236, 0.1691565193950025, 0.1495959888165767,
  0.1246289712555339, 0.0951585116824928, 0.0622535239386479, 0.0271524594117541,
];

/** Integral of f over [a, b], composite 16-point Gauss-Legendre, n panels. */
function gl(f, a, b, n) {
  const h = (b - a) / n;
  let sum = 0;
  for (let k = 0; k < n; k++) {
    const mid = a + (k + 0.5) * h;
    const half = h / 2;
    let s = 0;
    for (let i = 0; i < 8; i++) {
      s += GL_W[i] * (f(mid - half * GL_X[i]) + f(mid + half * GL_X[i]));
    }
    sum += s * half;
  }
  return sum;
}

export class ClosedModelError extends Error {}

export function createCosmology({ H0, Om, OL }) {
  if (!(H0 > 0) || !(Om >= 0) || !(OL >= 0)) throw new RangeError('H0 > 0, Om >= 0, OL >= 0');
  const Ok = 1 - Om - OL;
  if (Ok < -1e-12) throw new ClosedModelError('closed models (Omega_k < 0) are not supported');
  const Ok0 = Math.max(Ok, 0);
  const dh = C_KMS / H0; // Hubble distance, Mpc
  const E = z => {
    const x = 1 + z;
    return Math.sqrt(Om * x * x * x + Ok0 * x * x + OL);
  };
  // Integrate in u = ln(1+z): dz = (1+z) du.
  const panels = z => Math.max(1, Math.ceil(Math.log1p(z) / 0.25));
  const integ = (g, z) => gl(u => g(Math.expm1(u)) * Math.exp(u), 0, Math.log1p(z), panels(z));
  const comoving = z => dh * integ(zp => 1 / E(zp), z);
  const transverse = z => {
    const dc = comoving(z);
    if (Ok0 < 1e-12) return dc;
    const s = Math.sqrt(Ok0);
    return (dh / s) * Math.sinh((s * dc) / dh);
  };
  return {
    H0, Om, OL, Ok: Ok0,
    E,
    scaleFactor: z => 1 / (1 + z),
    comovingDistance: comoving,
    transverseComovingDistance: transverse,
    luminosityDistance: z => (1 + z) * transverse(z),
    angularDiameterDistance: z => transverse(z) / (1 + z),
    lookbackTime: z => (GYR_PER_INV_H0 / H0) * integ(zp => 1 / ((1 + zp) * E(zp)), z),
    distanceModulus: z => 5 * Math.log10((1 + z) * transverse(z)) + 25,
  };
}

/** Closed forms used as identities in the gate, not by the kernel itself. */
export const closedForms = {
  /** Einstein-de Sitter comoving distance. */
  edsComoving: (H0, z) => (2 * C_KMS / H0) * (1 - 1 / Math.sqrt(1 + z)),
  /** Open matter-only luminosity distance (Mattig), Om < 1, OL = 0. */
  mattigLuminosity: (H0, Om, z) =>
    ((C_KMS / H0) / (Om * Om)) * (Om * z + (Om - 2) * (Math.sqrt(1 + Om * z) - 1)),
  /** Flat LCDM lookback time, Gyr. */
  flatLambdaLookback: (H0, Om, z) => {
    const OL = 1 - Om;
    return (GYR_PER_INV_H0 / H0) * (2 / (3 * Math.sqrt(OL))) *
      (Math.asinh(Math.sqrt(OL / Om)) - Math.asinh(Math.sqrt(OL / Om) * Math.pow(1 + z, -1.5)));
  },
};
