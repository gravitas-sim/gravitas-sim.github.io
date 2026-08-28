// =============================================================================
// Palette — perceptual ramps for encoding physical quantities as colour
// -----------------------------------------------------------------------------
// Speed and energy are continuous scalars, so they get sequential ramps that
// increase monotonically in lightness. That keeps them readable in greyscale
// and for viewers with colour vision deficiency, which a rainbow ramp does not.
// =============================================================================

// Viridis-like: dark blue → teal → green → yellow. Uniform in lightness, safe
// for every common form of colour blindness.
const SPEED_STOPS = [
  [68, 1, 84],
  [59, 82, 139],
  [33, 145, 140],
  [94, 201, 98],
  [253, 231, 37],
];

// Diverging: bound (blue) → marginal (grey) → unbound (red).
const ENERGY_STOPS = [
  [49, 104, 178],
  [138, 176, 219],
  [225, 225, 225],
  [232, 145, 118],
  [190, 46, 42],
];

function sample(stops, t) {
  const x = Math.max(0, Math.min(1, t)) * (stops.length - 1);
  const i = Math.min(stops.length - 2, Math.floor(x));
  const f = x - i;
  const a = stops[i];
  const b = stops[i + 1];
  return {
    r: Math.round(a[0] + (b[0] - a[0]) * f),
    g: Math.round(a[1] + (b[1] - a[1]) * f),
    b: Math.round(a[2] + (b[2] - a[2]) * f),
  };
}

// Speeds span orders of magnitude between a Kuiper-belt object and a body
// whipping past a black hole, so the ramp is logarithmic.
const SPEED_MIN = 2;
const SPEED_MAX = 260;
const LOG_MIN = Math.log(SPEED_MIN);
const LOG_SPAN = Math.log(SPEED_MAX) - LOG_MIN;

/**
 * Map an orbital speed onto the sequential ramp.
 * @param {number} speed - Speed in simulation units
 * @returns {{r:number,g:number,b:number}} RGB colour
 */
export function speedTrailColor(speed) {
  const s = Math.max(SPEED_MIN, Math.abs(speed) || SPEED_MIN);
  return sample(SPEED_STOPS, (Math.log(s) - LOG_MIN) / LOG_SPAN);
}

/**
 * Map a normalised total energy onto the diverging ramp.
 * @param {number} t - 0 = deeply bound, 0.5 = marginal, 1 = unbound
 * @returns {{r:number,g:number,b:number}} RGB colour
 */
export function energyColor(t) {
  return sample(ENERGY_STOPS, t);
}

/**
 * Colour ramp legend stops, for drawing a key.
 * @param {number} n - Number of samples
 * @returns {Array<{r:number,g:number,b:number}>} Ramp samples
 */
export function speedRamp(n = 8) {
  return Array.from({ length: n }, (_, i) => sample(SPEED_STOPS, i / (n - 1)));
}

/** @returns {{min:number,max:number}} The speed range the ramp covers */
export const speedRange = () => ({ min: SPEED_MIN, max: SPEED_MAX });
