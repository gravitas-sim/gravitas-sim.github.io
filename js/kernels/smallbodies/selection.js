// =============================================================================
// What the survey finds (Prompt 198, SMALL_BODIES.md)
// -----------------------------------------------------------------------------
// The numbered asteroids are the objects found, not the objects there are. A
// magnitude-limited survey at opposition sees a body of absolute magnitude H at
// V = H + 5 log10(r Delta), Delta = r - 1 for a circular orbit at distance r; the
// brightest H it can reach falls by 5 log10(r (r - 1)) with distance, and with a
// cumulative H distribution N(<H) proportional to 10^(alpha H) the fraction it
// finds goes as (r (r - 1))^(-5 alpha). At alpha = 0.5 the inner belt is found
// forty times more completely than the outer one at the same limiting magnitude.
// A histogram of what was found is therefore skewed inward by the survey before
// any resonance acts on it.
//
// MODEL, and its limits: a circular orbit seen at opposition, no phase function
// or opposition surge, one H slope, the same albedo everywhere, discovery by one
// limiting magnitude (the real surveys have many, with fields, cadence and motion
// limits). It states the direction and the size of the bias; it does not
// correct a catalog.
// =============================================================================

const { Math, Number } = globalThis;

/** The brightest absolute magnitude a survey of limiting magnitude vLim reaches at distance a (AU). */
export const detectionLimitH = (a, vLim) => vLim - 5 * Math.log10(a * (a - 1));

/** The opposition magnitude of absolute magnitude H at distance a (AU). */
export const oppositionMagnitude = (H, a) => H + 5 * Math.log10(a * (a - 1));

/** The relative weight with which a body at a is found: 10^(alpha detectionLimitH). */
export const detectedWeight = (a, { alpha = 0.5, vLim = 21 } = {}) =>
  Math.pow(10, alpha * detectionLimitH(a, vLim));

/** The fraction found at a1 over the fraction found at a2, closed form. */
export const detectedFractionRatio = (a1, a2, alpha = 0.5) =>
  Math.pow((a2 * (a2 - 1)) / (a1 * (a1 - 1)), 5 * alpha);

/**
 * The mean semi-major axis of the objects found, from a population uniform in a
 * over `range`, by Simpson quadrature of the weight. Compare with the true mean,
 * (lo + hi) / 2.
 */
export function meanAxisDetected({
  range = [2.0, 3.5],
  alpha = 0.5,
  vLim = 21,
  points = 4001,
} = {}) {
  if (
    !(range[1] > range[0]) ||
    !(range[0] > 1) ||
    points < 3 ||
    points % 2 === 0
  )
    return NaN;
  const [lo, hi] = range;
  const h = (hi - lo) / (points - 1);
  let num = 0;
  let den = 0;
  for (let k = 0; k < points; k++) {
    const a = lo + k * h;
    const s = k === 0 || k === points - 1 ? 1 : k % 2 ? 4 : 2;
    const w = detectedWeight(a, { alpha, vLim });
    num += s * a * w;
    den += s * w;
  }
  return Number.isFinite(num / den) ? num / den : NaN;
}

/** The sentences a lesson must put beside a histogram of a numbered catalog. */
export const SELECTION_ASSUMES = Object.freeze([
  'the catalog holds the objects that were found, not the objects there are',
  'discovery favours the large and the near: an object at twice the distance must be about 2.5 magnitudes more luminous to be seen',
  'so the histogram is skewed inward, and the outer belt and the small bodies are under-counted by amounts this file can state only for a stated model',
  'a gap measured in a catalog is a gap in what was found; where the resonance also hides bodies from the survey the two cannot be told apart here',
]);
