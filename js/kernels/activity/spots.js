// =============================================================================
// A spotted rotating sphere (Prompt 220, STELLAR_ACTIVITY.md)
// -----------------------------------------------------------------------------
//   spotDeficit      DERIVED: the flux a circular spot of angular radius rho hides
//                    when its centre is an angle gamma from the line of sight, as a
//                    fraction of the disc's light, with the spot as dark as the
//                    photosphere's own intensity at that point (contrast 0)
//   spottedFlux      DERIVED: the normalised flux of a rotating star with spots
//   shearPeriods     DERIVED: the period of a spot at each latitude under a one-
//                    parameter differential rotation, P_eq / (1 - k sin^2 lat)
//
// ASSUMPTIONS, all stated because the period search inherits them:
//   - the surface is a sphere with quadratic limb darkening, one law for the band;
//   - a spot is a circular cap of fixed angular radius and a fixed contrast (its
//     intensity over the photosphere's at the same mu), without a penumbra, a
//     facular ring or any evolution;
//   - the star's rotation is rigid or one-parameter solar-like shear; the
//     period a light curve returns is then that of the latitudes the spots occupy
//     and not "the" rotation period (the Sun's 25 to 35 days across latitudes is
//     the example), which is why the shear is a stated limit and not a fitted one.
//
// The deficit is the integral of I(mu) mu over the visible part of the cap. In
// polar coordinates about the cap's centre (separation r, azimuth phi) the point's
// mu is a + b cos phi with a = cos(gamma) cos r and b = sin(gamma) sin r, so the
// azimuthal integral of the cubic I(mu) mu is a sum of closed-form integrals of
// cos^k phi over the visible arc, and only the radial integral is numerical: the
// arc changes form at three separations (where the ring touches or leaves the
// limb), the integral is split there and each piece is mapped so that the
// square-root behaviour at the ends disappears (r = r0 + (r1 - r0)(1 - cos pi s) / 2).
// Pure: no DOM, no clock, no random draws.
// =============================================================================

const { Math, Float64Array } = globalThis;

export const VERSION = '1.0.0';

// 16-point Gauss-Legendre on [-1, 1] (the eight positive nodes and weights); the radial integral is
// done in two panels of it. Kept here, not imported from js/numeric/quadrature.js, whose adopters are
// the ones proved digit for digit (NUMERICS.md, tests/numericRoutines.test.js).
const GL_X = [
  0.0950125098376374, 0.2816035507792589, 0.4580167776572274,
  0.6178762444026438, 0.755404408355003, 0.8656312023878318, 0.9445750230732326,
  0.9894009349916499,
];
const GL_W = [
  0.1894506104550685, 0.1826034150449236, 0.1691565193950025,
  0.1495959888165767, 0.1246289712555339, 0.0951585116824928,
  0.0622535239386479, 0.0271524594117541,
];
function gaussLegendre(f, a, b, panels = 1) {
  const h = (b - a) / panels;
  const half = h / 2;
  let sum = 0;
  for (let k = 0; k < panels; k++) {
    const mid = a + (k + 0.5) * h;
    let s = 0;
    for (let i = 0; i < 8; i++)
      s += GL_W[i] * (f(mid - half * GL_X[i]) + f(mid + half * GL_X[i]));
    sum += s * half;
  }
  return sum;
}
const DEG = Math.PI / 180;

/** Quadratic limb darkening I(mu) = 1 - u1 (1 - mu) - u2 (1 - mu)^2. */
export const limbIntensity = (mu, u1, u2) =>
  1 - u1 * (1 - mu) - u2 * (1 - mu) * (1 - mu);

/** The disc's total light in the same units as the deficit: pi (1 - u1/3 - u2/6). */
export const discLight = (u1, u2) => Math.PI * (1 - u1 / 3 - u2 / 6);

/** The integral over the visible arc of a ring of I(mu) mu dphi. */
function ring(r, cosG, sinG, c0, c1, c2) {
  const a = cosG * Math.cos(r);
  const b = sinG * Math.sin(r);
  let phi0;
  if (b < 1e-14) {
    if (a <= 0) return 0;
    return 2 * Math.PI * (c0 * a + c1 * a * a + c2 * a * a * a);
  }
  if (a >= b) phi0 = Math.PI;
  else if (a <= -b) return 0;
  else phi0 = Math.acos(-a / b);
  const s = Math.sin(phi0);
  const cs = Math.cos(phi0);
  const m0 = 2 * phi0;
  const m1 = 2 * s;
  const m2 = phi0 + s * cs;
  const m3 = 2 * s - (2 / 3) * s * s * s;
  // mu = a + b c: the first, second and third powers integrated over the arc.
  const i1 = a * m0 + b * m1;
  const i2 = a * a * m0 + 2 * a * b * m1 + b * b * m2;
  const i3 =
    a * a * a * m0 + 3 * a * a * b * m1 + 3 * a * b * b * m2 + b * b * b * m3;
  return c0 * i1 + c1 * i2 + c2 * i3;
}

/**
 * The light a spot hides, over the disc's light, for a spot of contrast 0.
 * @param {number} gamma - angle of the spot's centre from the line of sight, radians
 * @param {number} rho - the spot's angular radius, radians
 * @returns {number} in [0, 1]
 */
export function spotDeficit(gamma, rho, u1 = 0.4, u2 = 0.22) {
  if (!(rho > 0)) return 0;
  const c0 = 1 - u1 - u2;
  const c1 = u1 + 2 * u2;
  const c2 = -u2;
  const cosG = Math.cos(gamma);
  const sinG = Math.sin(gamma);
  const cuts = [0, rho];
  for (const r of [
    Math.PI / 2 - gamma,
    gamma - Math.PI / 2,
    gamma + Math.PI / 2,
  ])
    if (r > 0 && r < rho) cuts.push(r);
  cuts.sort((x, y) => x - y);
  let total = 0;
  for (let k = 0; k + 1 < cuts.length; k++) {
    const r0 = cuts[k];
    const r1 = cuts[k + 1];
    if (!(r1 > r0)) continue;
    const span = r1 - r0;
    total += gaussLegendre(
      s => {
        const r = r0 + (span * (1 - Math.cos(Math.PI * s))) / 2;
        const dr = (span * Math.PI * Math.sin(Math.PI * s)) / 2;
        return Math.sin(r) * ring(r, cosG, sinG, c0, c1, c2) * dr;
      },
      0,
      1,
      2
    );
  }
  return total / discLight(u1, u2);
}

/**
 * The period of a spot at a latitude under P_eq / (1 - k sin^2 lat).
 * @param {number} periodEq - the equatorial period
 * @param {number} k - the shear (the Sun's is about 0.19)
 * @param {ArrayLike<number>} latitudes - degrees
 */
export function shearPeriods(periodEq, k, latitudes) {
  return Float64Array.from(latitudes, lat => {
    const s = Math.sin(lat * DEG);
    return periodEq / (1 - k * s * s);
  });
}

/**
 * The normalised flux of a rotating spotted star.
 * @param {ArrayLike<number>} t - times, days
 * @param {{period: number, inc: number, u?: number[], shear?: number, t0?: number,
 *   spots: Array<{lat: number, lon: number, radius: number, contrast: number}>}} spec
 *   - period the equatorial period (days); inc the spin axis's inclination to the
 *   line of sight (degrees); spots' lat, lon (at t0), radius in degrees; contrast
 *   the spot's intensity over the photosphere's at the same mu
 * @returns {Float64Array} flux, 1 for the unspotted star
 */
export function spottedFlux(t, spec) {
  const { period, inc, spots } = spec;
  const [u1, u2] = spec.u ?? [0.4, 0.22];
  const k = spec.shear ?? 0;
  const t0 = spec.t0 ?? 0;
  const si = Math.sin(inc * DEG);
  const ci = Math.cos(inc * DEG);
  const out = new Float64Array(t.length).fill(1);
  const prep = spots.map(s => {
    const lat = s.lat * DEG;
    return {
      cl: Math.cos(lat),
      sl: Math.sin(lat),
      Plat: period / (1 - k * Math.sin(lat) ** 2),
      lon: s.lon,
      rho: s.radius * DEG,
      w: 1 - s.contrast,
    };
  });
  for (let i = 0; i < t.length; i++) {
    let lost = 0;
    for (const p of prep) {
      const lam = (p.lon + (360 * (t[i] - t0)) / p.Plat) * DEG;
      const cg = Math.max(
        -1,
        Math.min(1, si * p.cl * Math.cos(lam) + ci * p.sl)
      );
      lost += p.w * spotDeficit(Math.acos(cg), p.rho, u1, u2);
    }
    out[i] = 1 - lost;
  }
  return out;
}
