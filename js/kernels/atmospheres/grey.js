// Grey radiative equilibrium, the Eddington solution. A demonstration of a
// temperature profile, not a climate model.
import { refuse, isPos } from './constants.js';

const MODEL = 'grey radiative equilibrium (Eddington)';
const ASSUMES = [
  'grey opacity',
  'no convection',
  'no clouds',
  'no shortwave absorption',
  'Eddington closure (about 4 percent in temperature at the top)',
];

/** T(tau) from the top: T^4 = (3/4) T_e^4 (tau + 2/3). */
export function greyTemperature({ emissionTemperature, tau }) {
  if (!isPos(emissionTemperature))
    return refuse(MODEL, 'the emission temperature must be positive');
  if (typeof tau !== 'number' || !(tau >= 0) || !Number.isFinite(tau))
    return refuse(MODEL, 'the optical depth must be zero or more');
  return {
    model: MODEL,
    assumes: ASSUMES,
    temperature: emissionTemperature * (0.75 * (tau + 2 / 3)) ** 0.25,
  };
}

/** The ground: T_g^4 = T_e^4 (1 + 3 tau_s / 4). */
export function greyGround({ emissionTemperature, tauSurface }) {
  if (!isPos(emissionTemperature))
    return refuse(MODEL, 'the emission temperature must be positive');
  if (
    typeof tauSurface !== 'number' ||
    !(tauSurface >= 0) ||
    !Number.isFinite(tauSurface)
  )
    return refuse(MODEL, 'the surface optical depth must be zero or more');
  return {
    model: MODEL,
    assumes: ASSUMES,
    ground: emissionTemperature * (1 + 0.75 * tauSurface) ** 0.25,
  };
}

/** The optical depth that gives a ground-to-emission ratio: tau_s = (4/3)(ratio^4 - 1). */
export function greyDepthFor(ratio) {
  if (!isPos(ratio) || ratio < 1)
    return refuse(MODEL, 'the ground-to-emission ratio must be at least 1');
  return {
    model: MODEL,
    assumes: ASSUMES,
    tauSurface: (4 / 3) * (ratio ** 4 - 1),
  };
}
