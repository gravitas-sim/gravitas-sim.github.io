// =============================================================================
// The mass inside an Einstein radius, and the singular isothermal sphere's dispersion (Prompt 251)
// -----------------------------------------------------------------------------
// For an axially symmetric lens the Einstein radius theta_E is the radius inside which the mean
// convergence is one, so the projected mass inside it is exactly
//   M(<theta_E) = pi Sigma_cr (theta_E D_l)^2 = c^2 theta_E^2 D_l D_s / (4 G D_ls)        (R2)
// whatever the profile inside. It is the total mass in the cylinder, dark and luminous. The mass-sheet
// transformation preserves the critical curves, so this mass is unchanged by it (it is not the quantity
// the time delays lose). For a singular isothermal sphere of one-dimensional dispersion sigma,
//   theta_E = 4 pi (sigma / c)^2 D_ls / D_s   and   M(<R) = pi sigma^2 R / G            (R3)
// and the two forms of the mass agree at R = theta_E D_l. The velocity dispersion is the lens's mass
// dispersion; a stellar dispersion measured from a spectrum is not assumed to equal it.
// Metres, kilograms, radians, m/s. A real lens is not axially symmetric: the formula then gives the
// mass inside the circle of the same area as the critical curve only to the extent that the
// ellipticity and shear are small, a size this kernel states but does not price.
// =============================================================================

import { G_SI } from '../../../constants.js';
import { massFromEinstein, sisDispersion, sisEinsteinAngle } from '../lens.js';
import { sigmaCritical } from './distances.js';

/** M(<theta_E), kg, as pi Sigma_cr (theta_E D_l)^2 (a different path from lens.js massFromEinstein). */
export const enclosedMass = (thetaE, dl, ds, dls) =>
  Math.PI * sigmaCritical(dl, ds, dls) * (thetaE * dl) ** 2;

/** The same mass through lens.js (the point-mass form of the identical algebra). */
export const enclosedMassViaPointForm = massFromEinstein;

/** The projected mass of a singular isothermal sphere inside radius R (metres): pi sigma^2 R / G. */
export const sisProjectedMass = (sigmaMs, radiusM) =>
  (Math.PI * sigmaMs * sigmaMs * radiusM) / G_SI;

/**
 * The alternative input: a velocity dispersion instead of an arc. Returns theta_E, the radius at the
 * lens and the mass inside it, from sigma alone.
 */
export function massFromDispersion({ sigmaMs, dl, ds, dls }) {
  const thetaE = sisEinsteinAngle(sigmaMs, ds, dls);
  const radiusM = thetaE * dl;
  return { thetaE, radiusM, mass: sisProjectedMass(sigmaMs, radiusM) };
}

/** The dispersion of the singular isothermal sphere with Einstein angle thetaE: the inverse. */
export const dispersionFromEinstein = sisDispersion;
export { sisEinsteinAngle };
