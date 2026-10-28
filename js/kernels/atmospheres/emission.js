// Blackbody plus one band (Prompt 201 spike): band radiance, the isothermal-skin slab, the eclipse depth and the
// brightness temperature. Pure functions; ATMOSPHERES_GATE_II.md.
import { H_PLANCK, C_LIGHT, K_BOLTZMANN, refuse, isPos } from './constants.js';
import { composite } from './quadrature.js';

const MODEL = 'blackbody plus one band (emission)';
const ASSUMES = [
  'a uniform blackbody planet with no day-night structure',
  'one skin: a single isothermal layer at the one-layer temperature, so a band is only a dip',
  'a flat band response, no filter profile',
  'reflected light separate and not a temperature',
];
/** The reflected-light share of a depth above which it is not converted to a temperature, at this albedo. */
export const REFLECTED_MAX = 0.1;
export const REFLECTED_ALBEDO = 0.3;
const GAMMA = 0.5772156649015329;

/** Mean of the Planck function over [l1, l2] metres, W per m^2 per sr per m of wavelength. */
export function bandRadiance(l1, l2, T) {
  const f = u => {
    const l = Math.exp(u);
    const x = (H_PLANCK * C_LIGHT) / (l * K_BOLTZMANN * T);
    return (2 * H_PLANCK * C_LIGHT ** 2) / (l ** 4 * Math.expm1(x));
  };
  return composite(f, Math.log(l1), Math.log(l2), 0.25) / (l2 - l1);
}

/** E1(x) for x > 0: the series below 1, the continued fraction above. */
function e1(x) {
  if (x <= 1) {
    let sum = 0;
    let term = 1;
    for (let k = 1; k < 40; k++) {
      term *= -x / k;
      sum -= term / k;
    }
    return -GAMMA - Math.log(x) + sum;
  }
  let b = x + 1;
  let c = 1e300;
  let d = 1 / b;
  let h = d;
  for (let i = 1; i < 200; i++) {
    const a = -i * i;
    b += 2;
    d = 1 / (a * d + b);
    c = b + a / c;
    const del = c * d;
    h *= del;
    if (Math.abs(del - 1) < 1e-16) break;
  }
  return h * Math.exp(-x);
}

/** 2 E3(tau): the fraction of the deep blackbody that leaves a skin of optical depth tau (flux, not normal incidence). */
export function transmitFraction(tau) {
  if (tau <= 0) return 1;
  return Math.exp(-tau) * (1 - tau) + tau * tau * e1(tau);
}

/** Band flux over pi of a deep blackbody seen through an isothermal skin: B_d 2E3(tau) + B_s (1 - 2E3(tau)). */
export function slabFlux(Bd, Bs, tau) {
  const t = transmitFraction(tau);
  return Bd * t + Bs * (1 - t);
}

function check(p, planet = true) {
  const need = planet
    ? ['radiusRatio', 'tPlanet', 'tStar']
    : ['radiusRatio', 'tStar'];
  for (const k of need) if (!isPos(p[k])) return `${k} must be positive`;
  if (!Array.isArray(p.band) || !(p.band[0] > 0) || !(p.band[1] > p.band[0]))
    return 'the band edges must be positive and in increasing order';
  if (
    p.geometricAlbedo !== undefined &&
    !(p.geometricAlbedo >= 0 && p.geometricAlbedo <= 1)
  )
    return 'the geometric albedo must be in [0, 1]';
  if (p.semiMajorOverRp !== undefined && !(p.semiMajorOverRp > 1))
    return 'a / R_p must exceed 1';
  if (
    p.bandTau !== undefined &&
    !(p.bandTau >= 0 && Number.isFinite(p.bandTau))
  )
    return 'the band optical depth must be 0 or more';
  return null;
}

/** Eclipse depth: (R_p/R_s)^2 B(T_p)/B(T_*) + A_g (R_p/a)^2, with an optional absorbing skin of optical depth bandTau. */
export function eclipseDepth(p) {
  const bad = check(p);
  if (bad) return refuse(MODEL, bad);
  const [l1, l2] = p.band;
  const Bs = bandRadiance(l1, l2, p.tStar);
  const Bd = bandRadiance(l1, l2, p.tPlanet);
  const Bk = bandRadiance(l1, l2, p.tPlanet / 2 ** 0.25);
  const bp = p.bandTau ? slabFlux(Bd, Bk, p.bandTau) : Bd;
  const thermal = (p.radiusRatio ** 2 * bp) / Bs;
  const reflected = p.geometricAlbedo
    ? p.geometricAlbedo / (p.semiMajorOverRp ?? Infinity) ** 2
    : 0;
  return {
    model: MODEL,
    assumes: ASSUMES,
    thermal,
    reflected,
    depth: thermal + reflected,
  };
}

/** The planet's band radiance ratio -> temperature: solves B(T) = depth B(T_*) / (R_p/R_s)^2 by bisection (B is monotone in T). */
function invert(target, l1, l2) {
  let lo = 20;
  let hi = 30000;
  for (let i = 0; i < 200 && hi - lo > 1e-12 * hi; i++) {
    const mid = 0.5 * (lo + hi);
    if (bandRadiance(l1, l2, mid) < target) lo = mid;
    else hi = mid;
  }
  return 0.5 * (lo + hi);
}

/** A brightness temperature from a thermal eclipse depth, with a 95 percent interval from the depth's uncertainty; refused where reflected light could matter. */
export function brightnessTemperature(p) {
  const bad = check(p, false);
  if (bad) return refuse(MODEL, bad);
  if (!isPos(p.depth) || !(p.semiMajorOverRp > 1))
    return refuse(
      MODEL,
      'the eclipse depth must be positive and a / R_p known'
    );
  const reflected = REFLECTED_ALBEDO / p.semiMajorOverRp ** 2;
  if (reflected >= REFLECTED_MAX * p.depth)
    return refuse(
      MODEL,
      'reflected light could be a tenth of this depth or more: it is not a temperature without an albedo'
    );
  const [l1, l2] = p.band;
  const Bs = bandRadiance(l1, l2, p.tStar);
  const T = invert((p.depth * Bs) / p.radiusRatio ** 2, l1, l2);
  const out = { model: MODEL, assumes: ASSUMES, temperature: T };
  if (p.sigma !== undefined) {
    const e = 1e-5 * T;
    const dBdT =
      (bandRadiance(l1, l2, T + e) - bandRadiance(l1, l2, T - e)) / (2 * e);
    const dDdT = (p.radiusRatio ** 2 * dBdT) / Bs;
    out.sigma = p.sigma / dDdT;
    out.lo = T - 1.96 * out.sigma;
    out.hi = T + 1.96 * out.sigma;
  }
  return out;
}
