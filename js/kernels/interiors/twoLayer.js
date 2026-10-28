// Two-layer constant-density interior (Prompt 203, INTERIORS_GATE.md). A core of
// uniform density inside a mantle of uniform density: the two densities are
// in-situ layer means from a published reference model, not the density of the
// material at the surface. Not a structure; it refuses what it has no table for.
import { refuse, isPos, isNum, isSigma } from './constants.js';

const { Math } = globalThis;
const MODEL = 'two-layer constant-density interior';
const ASSUMES = [
  'uniform density inside each layer (a mean over a layer whose density rises with depth)',
  'the layer densities are in-situ means from a published model, not uncompressed densities',
  'a sharp core-mantle boundary, no crust, no inner core',
  'a spherical body',
];
const FOUR_PI_3 = (4 * Math.PI) / 3;

/** Mean density of a sphere, kg/m^3. */
export const meanDensity = (mass, radius) => mass / (FOUR_PI_3 * radius ** 3);

/** Mass of the two-layer sphere, kg. */
export const twoLayerMass = ({ radius, coreRadius, rhoMantle, rhoCore }) =>
  FOUR_PI_3 *
  (rhoCore * coreRadius ** 3 + rhoMantle * (radius ** 3 - coreRadius ** 3));

/** The moment-of-inertia factor C / (M R^2) of the two-layer sphere. */
export function twoLayerMoment({ radius, coreRadius, rhoMantle, rhoCore }) {
  const x5 = (coreRadius / radius) ** 5;
  const x3 = (coreRadius / radius) ** 3;
  const rhoBar = rhoMantle + (rhoCore - rhoMantle) * x3;
  return (0.4 * (rhoMantle + (rhoCore - rhoMantle) * x5)) / rhoBar;
}

const checkSigma = s =>
  ['mass', 'radius', 'rhoMantle', 'rhoCore'].every(k => isSigma(s[k]));

/**
 * Invert the model: the core radius that reproduces the bulk density.
 * x^3 = (rhoBar - rhoMantle) / (rhoCore - rhoMantle). Uncertainties are first
 * order, uncorrelated. SI units (kg, m, kg/m^3).
 *
 * @param {{mass:number, radius:number, rhoMantle:number, rhoCore:number,
 *   sigma?:{mass?:number, radius?:number, rhoMantle?:number, rhoCore?:number}}} p
 */
export function twoLayerInvert({
  mass,
  radius,
  rhoMantle,
  rhoCore,
  sigma = {},
}) {
  if (![mass, radius, rhoMantle, rhoCore].every(isPos))
    return refuse(
      MODEL,
      'input',
      'mass, radius and both densities must be positive and finite'
    );
  if (!checkSigma(sigma))
    return refuse(
      MODEL,
      'sigma',
      'an uncertainty must be a finite number of at least 0'
    );
  if (rhoCore <= rhoMantle)
    return refuse(
      MODEL,
      'layer-order',
      'the core must be denser than the mantle'
    );
  const rhoBar = meanDensity(mass, radius);
  if (rhoBar < 3000)
    return refuse(
      MODEL,
      'volatile-rich',
      'a bulk density below 3000 kg/m3 is rock-ice or volatile rich: the rock and iron model does not apply'
    );
  if (rhoBar <= rhoMantle)
    return refuse(
      MODEL,
      'no-core',
      'the bulk density is at or below the mantle density: this model has no core'
    );
  if (rhoBar >= rhoCore)
    return refuse(
      MODEL,
      'core-fills',
      'the bulk density is at or above the core density: the core would fill the body'
    );
  const a = rhoCore - rhoMantle;
  const u = (rhoBar - rhoMantle) / a;
  const x = Math.cbrt(u);
  const coreRadius = x * radius;
  const F = rhoMantle + a * x ** 5;
  const moment = (0.4 * F) / rhoBar;
  // Partial derivatives (first order, uncorrelated).
  const dx = 1 / (3 * x * x);
  const xBar = dx / a;
  const xM = (dx * -(1 - u)) / a;
  const xC = (dx * -u) / a;
  const FBar = 5 * a * x ** 4 * xBar;
  const FM = 1 - x ** 5 + 5 * a * x ** 4 * xM;
  const FC = x ** 5 + 5 * a * x ** 4 * xC;
  const CBar = (0.4 * FBar) / rhoBar - moment / rhoBar;
  const sM = sigma.mass ?? 0;
  const sR = sigma.radius ?? 0;
  const sm = sigma.rhoMantle ?? 0;
  const sc = sigma.rhoCore ?? 0;
  const dRhoBarM = rhoBar / mass;
  const dRhoBarR = (-3 * rhoBar) / radius;
  const quad = (...t) => Math.sqrt(t.reduce((s, v) => s + v * v, 0));
  const sigmaCore = quad(
    radius * xBar * dRhoBarM * sM,
    (x + radius * xBar * dRhoBarR) * sR,
    radius * xM * sm,
    radius * xC * sc
  );
  const sigmaMoment = quad(
    CBar * dRhoBarM * sM,
    CBar * dRhoBarR * sR,
    ((0.4 * FM) / rhoBar) * sm,
    ((0.4 * FC) / rhoBar) * sc
  );
  return {
    model: MODEL,
    assumes: ASSUMES,
    kind: 'two-layer',
    coreRadius,
    coreFraction: x,
    coreMassFraction: (rhoCore * x ** 3) / rhoBar,
    momentFactor: moment,
    meanDensity: rhoBar,
    sigma: {
      coreRadius: sigmaCore,
      coreFraction: sigmaCore / radius,
      momentFactor: sigmaMoment,
    },
  };
}

/** The homogeneous-body factor, ruled out by any published factor below it. */
export const HOMOGENEOUS_MOMENT = 0.4;
export { isNum };
