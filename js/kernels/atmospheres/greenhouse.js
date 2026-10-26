// One-layer greenhouse: one isothermal layer, transparent to sunlight.
import { refuse, isPos, isUnit } from './constants.js';

const MODEL = 'one-layer greenhouse';
const ASSUMES = [
  'one isothermal layer',
  'no convection',
  'no clouds',
  'transparent to sunlight',
  'surface temperature cannot exceed 2^(1/4) times the emission temperature',
];
export const ONE_LAYER_MAX_RATIO = 2 ** 0.25;

/** T_s = T_e (2 / (2 - eps))^(1/4) and the layer's T_s / 2^(1/4). */
export function oneLayer({ emissionTemperature, emissivity }) {
  if (!isPos(emissionTemperature))
    return refuse(MODEL, 'the emission temperature must be positive');
  if (!isUnit(emissivity))
    return refuse(MODEL, 'the emissivity must lie in [0, 1]');
  const surface = emissionTemperature * (2 / (2 - emissivity)) ** 0.25;
  return {
    model: MODEL,
    assumes: ASSUMES,
    surface,
    layer: surface / 2 ** 0.25,
  };
}

/** The emissivity that gives a surface-to-emission ratio, or a refusal above the model's maximum. */
export function oneLayerEmissivityFor(ratio) {
  if (!isPos(ratio) || ratio < 1)
    return refuse(MODEL, 'the surface-to-emission ratio must be at least 1');
  if (ratio > ONE_LAYER_MAX_RATIO)
    return refuse(
      MODEL,
      'no emissivity in [0, 1] reaches this ratio: one layer is at most 2^(1/4)'
    );
  return { model: MODEL, assumes: ASSUMES, emissivity: 2 - 2 / ratio ** 4 };
}
