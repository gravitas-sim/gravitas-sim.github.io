// =============================================================================
// The vetting kernel's committed numbers (Prompt 228, VETTING.md)
// -----------------------------------------------------------------------------
// tests/fixtures/vetting/thresholds.json fixed these before the kernel existed,
// and tests/vetting.test.js holds that they still equal it. A default may be
// overridden by a caller, and the verdict then carries the value it used.
// =============================================================================

export const VERSION = '1.0.0';

/** The verdicts of a test. Inconclusive is a state of its own, never a soft pass. */
export const VERDICTS = Object.freeze(['pass', 'fail', 'inconclusive']);

/** What the summary may say. It never says planet and never says validated. */
export const OVERALL = Object.freeze(['rejected', 'undecided', 'survives']);

export const DEFAULTS = Object.freeze({
  /** odd-even: fail at this many sigma of the depth difference */
  zFail: 3,
  /** odd-even and secondary: the share of the depth the test must be able to see to pass */
  detectFraction: 0.5,
  /** cycles of each parity (of the secondary) with at least three points in the box */
  minTransitsPerParity: 2,
  /** the mean depth must exceed this many of its sigma, or there is no signal to compare */
  minDepthSnr: 3,
  /** secondary: a depth this many sigma is a detection */
  zDetect: 3,
  /** secondary: deeper than this share of the primary is not a planet's own light */
  binaryRatio: 0.1,
  /** centroid: the Rayleigh tail exp(-r^2 / 2) = 0.0027 */
  rFail: 3.44,
  /** centroid: a source farther than this from the target must have been excluded for a pass */
  requiredExclusionPx: 1.0,
  /** centroid: the difference image's summed signal over its uncertainty */
  minDifferenceSnr: 5,
  /** centroid: frames in and out of transit */
  minFramesPerSide: 5,
});

/** The stamp the frame forward model draws (VETTING.md, "frames"). */
export const STAMP = Object.freeze({
  width: 17,
  height: 17,
  target: Object.freeze({ x: 8, y: 8 }),
  fwhm: 2.8,
  exposure: 60,
  sky: 3,
  /** centroid window half-width, pixels */
  half: 4,
  /** the aperture centroid's half-width, pixels */
  apertureHalf: 5,
});
