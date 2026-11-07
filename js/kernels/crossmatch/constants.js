// =============================================================================
// Crossmatching: the stated constants (Prompt 263, CROSSMATCH.md)
// -----------------------------------------------------------------------------
// Every number the kernel decides with that is not data is here, with where it
// comes from. Committed in tests/fixtures/crossmatch/thresholds.json before the
// kernel existed.
// =============================================================================

export const VERSION = '1.0.0';
export const MODEL_ID = 'crossmatch-nearest-neighbour';

export const LIMITS = Object.freeze({
  /** The largest match radius, arcsec: beyond it a field is a crowd, not a catalog pair. */
  maxRadiusArcsec: 10,
  /** The largest proper-motion shift a propagation will make (one degree). */
  maxShiftArcsec: 3600,
  /** Rows in either catalog (the table tools' own limit). */
  rowLimit: 20000,
  /** A sample of fewer than this is not compared by its means. */
  minSample: 30,
  /** The largest cone-search radius, arcsec. */
  coneMaxRadiusArcsec: 3600,
  /** A catalog whose largest position rounding error exceeds this fraction of the radius is refused. */
  roundingFraction: 0.25,
  /** A shifted-match probability above this makes the false-match estimate unreliable. */
  maxChance: 0.2,
  /** The default shifted-match test: 8 bearings (degrees from north through east), at this many radii. */
  shiftBearings: Object.freeze([0, 45, 90, 135, 180, 225, 270, 315]),
  shiftRadii: 20,
});

/** A separation within this relative tolerance of the radius counts as within it (floating point). */
export const RADIUS_TOLERANCE = 1e-12;
export const ARCSEC = Math.PI / 648000;
export const MAS = ARCSEC / 1000;
