// Roche limits with stated densities. The coefficients and the density form are
// js/tidalPhysics.js's (the existing authority, used by the Tides investigation
// and its instruments); this wrapper adds the refusals and the exact fluid
// option, and repeats no formula.
import {
  ROCHE_RIGID_COEFF,
  ROCHE_FLUID_COEFF,
  rocheLimitFromDensities,
} from '../../tidalPhysics.js';
import { TidesError, params, positive } from './errors.js';

export { ROCHE_RIGID_COEFF, ROCHE_FLUID_COEFF };
/** The exact value for an incompressible fluid satellite on a synchronous orbit (Chandrasekhar 1969). */
export const CHANDRASEKHAR_FLUID_COEFF = 2.4553;

const COEFF = {
  rigid: ROCHE_RIGID_COEFF,
  fluid: ROCHE_FLUID_COEFF,
  'fluid-exact': CHANDRASEKHAR_FLUID_COEFF,
};

/**
 * The Roche limit of a satellite of the stated density about a primary of the
 * stated radius and density. `kind` is 'rigid' (no deformation), 'fluid' (2.44,
 * the value in most texts and in this app's lessons) or 'fluid-exact' (2.4553).
 *
 * @param {object} p
 * @param {number} p.primaryRadius - m
 * @param {number} p.primaryDensity - kg/m^3
 * @param {number} p.satelliteDensity - kg/m^3
 * @param {'rigid'|'fluid'|'fluid-exact'} [p.kind]
 * @returns {{distance:number, coefficient:number, kind:string, inPrimaryRadii:number, insidePrimary:boolean}}
 */
export function rocheLimit(p) {
  params(p);
  const radius = positive(p.primaryRadius, 'primaryRadius');
  const rhoP = positive(p.primaryDensity, 'primaryDensity');
  const rhoS = positive(p.satelliteDensity, 'satelliteDensity');
  const kind = p.kind === undefined ? 'fluid' : p.kind;
  if (!Object.prototype.hasOwnProperty.call(COEFF, kind)) {
    throw new TidesError('input', `kind must be rigid, fluid or fluid-exact`);
  }
  const coefficient = COEFF[kind];
  const distance = rocheLimitFromDensities(radius, rhoP, rhoS, coefficient);
  return {
    distance,
    coefficient,
    kind,
    inPrimaryRadii: distance / radius,
    // A satellite this dense holds together to below the primary's surface.
    insidePrimary: distance <= radius,
  };
}

/**
 * Where a distance sits against the rigid and the fluid limit: 'safe' outside
 * the fluid limit, 'deforming' between, 'disrupting' inside the rigid one.
 */
export function rocheRegimeAt(p) {
  params(p);
  const distance = positive(p.distance, 'distance');
  const rigid = rocheLimit({ ...p, kind: 'rigid' }).distance;
  const fluid = rocheLimit({ ...p, kind: 'fluid' }).distance;
  const regime =
    distance >= fluid ? 'safe' : distance >= rigid ? 'deforming' : 'disrupting';
  return { regime, rigid, fluid };
}
