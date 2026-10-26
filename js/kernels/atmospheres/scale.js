// The isothermal scale height.
import { K_BOLTZMANN, ATOMIC_MASS, refuse, isPos } from './constants.js';

const MODEL = 'isothermal scale height';
const ASSUMES = [
  'isothermal',
  'hydrostatic',
  'constant gravity (heights well below the radius)',
  'a well-mixed layer below the homopause',
];

/** H = k T / (mu m_u g), metres. mu is the mean molecular weight in atomic mass units. */
export function scaleHeight({ temperature, meanMolecularWeight, gravity }) {
  if (!isPos(temperature))
    return refuse(MODEL, 'the temperature must be positive');
  if (!isPos(meanMolecularWeight))
    return refuse(MODEL, 'the mean molecular weight must be positive');
  if (!isPos(gravity)) return refuse(MODEL, 'the gravity must be positive');
  return {
    model: MODEL,
    assumes: ASSUMES,
    height:
      (K_BOLTZMANN * temperature) /
      (meanMolecularWeight * ATOMIC_MASS * gravity),
  };
}
