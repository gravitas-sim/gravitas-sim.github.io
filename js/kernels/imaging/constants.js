// =============================================================================
// The imaging kernel's committed numbers (Prompt 230, IMAGING.md)
// -----------------------------------------------------------------------------
// tests/fixtures/imaging/thresholds.json fixed the bounds these serve before the
// kernel existed. Constants are IAU 2015 B3 nominal values or exact definitions.
// =============================================================================

export const VERSION = '1.0.0';

/** IAU 2015 B3 nominal equatorial radii, metres (the repository's own values in js/constants.js and the unit registry). */
export const R_JUPITER_M = 7.1492e7;
export const R_EARTH_M = 6.3781e6;

export const DEFAULTS = Object.freeze({
  /** a stated planet temperature above this multiple of the irradiation equilibrium is self-luminous */
  selfLuminousFactor: 2,
  /** and within this multiple it is irradiation-powered */
  irradiatedFactor: 1.1,
  /** redistribution efficiency 1 is uniform redistribution, f = 1/4 */
  redistribution: 1,
  /** the integration grid of a band contrast */
  bandIntervals: 2000,
});

/** What the numbers assume, printed with every contrast. */
export const ASSUMES = Object.freeze([
  'both bodies radiate as blackbodies at one temperature each',
  'the planet reflects as a Lambert sphere with the stated geometric albedo',
  'a circular orbit',
  'the contrast is a flux ratio of the unresolved bodies, not what a coronagraph delivers',
]);

/** The sentence a planet that cannot be seen returns. */
export const NOT_OBSERVABLE = 'not observable with this instrument';

export class ImagingError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'ImagingError';
    this.code = code;
  }
}

export const posNum = (x, what) => {
  if (typeof x !== 'number' || !Number.isFinite(x) || !(x > 0))
    throw new ImagingError('input', `${what} must be a positive finite number`);
  return x;
};
export const unit = (x, what) => {
  if (typeof x !== 'number' || !Number.isFinite(x) || x < 0 || x > 1)
    throw new ImagingError('input', `${what} must lie in [0, 1]`);
  return x;
};
