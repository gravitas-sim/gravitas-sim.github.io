// =============================================================================
// Palette: perceptual ramps for encoding physical quantities as color
// -----------------------------------------------------------------------------
// Speed and energy are continuous scalars, so they get sequential ramps that
// increase monotonically in lightness. That keeps them readable in grayscale
// and for viewers with color vision deficiency, which a rainbow ramp does not.
// =============================================================================

// Viridis-like: dark blue → teal → green → yellow. Uniform in lightness, safe
// for every common form of color blindness.
const SPEED_STOPS = [
  [68, 1, 84],
  [59, 82, 139],
  [33, 145, 140],
  [94, 201, 98],
  [253, 231, 37],
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
 * @returns {{r:number,g:number,b:number}} RGB color
 */
export function speedTrailColor(speed) {
  const s = Math.max(SPEED_MIN, Math.abs(speed) || SPEED_MIN);
  return sample(SPEED_STOPS, (Math.log(s) - LOG_MIN) / LOG_SPAN);
}
