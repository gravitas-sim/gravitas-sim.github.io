// =============================================================================
// Period as pitch, and back again
// -----------------------------------------------------------------------------
// One map, in both directions, with nothing thrown away.
//
// js/audio.js is the sandbox's sound and it is deliberately not this. It takes
// an orbital frequency, compresses it through log2(1 + f*40), quantizes the
// result onto a minor pentatonic scale and drops whatever falls between the
// degrees. That is the right design for an ambient soundtrack and the wrong one
// for evidence: a listener cannot get a number back out of it, because the
// number is not in there any more. Two orbits whose periods differ by 6% can
// arrive at the same pentatonic degree and sound identical.
//
// This module is the other thing. A ratio of periods becomes an interval in
// cents, exactly, and the interval becomes the ratio back, to the last bit the
// hardware has. Nothing is quantized, nothing is clamped, nothing is rounded to
// a scale. A student who can hear an interval can recover a period ratio from
// it, which is the whole reason for the module existing.
//
// It is wired to nothing. There is no AudioWorklet here, no oscillator, no
// panel and no change to js/audio.js. What exists is the law and the check that
// it holds; sound comes later, if it comes at all, and it will be built on top
// of this rather than beside it.
//
// The sign convention, which is the one thing here that is easy to get wrong
// -----------------------------------------------------------------------------
// periodToCents returns cents of PERIOD ratio. A longer period gives a larger
// positive number. Pitch runs the other way: a slower orbit is a lower note, so
// anything that maps this onto a frequency has to negate it. Both conventions
// are defensible and mixing them silently inverts the listener's entire mental
// model of the system - the outer planet would sound higher than the inner one
// and nothing on screen would say so. The direction is stated here, once, and
// callers are expected to be explicit about which way they are going.
// =============================================================================

/** Cents in an octave. A definition, not a measurement. */
export const CENTS_PER_OCTAVE = 1200;

/**
 * The interval below which two periods should not be assumed distinguishable.
 *
 * A working threshold, deliberately conservative, and NOT a measured property
 * of this application or of any listener using it. The frequency difference
 * limen for a pure tone in the mid-range is a few tenths of a percent, which is
 * a few cents; real discrimination is worse than that for tones heard in
 * sequence rather than together, worse again for complex timbres, and varies
 * widely between people. Ten cents is set at roughly twice the pure-tone figure
 * so that a check passing here is a claim about the encoding rather than an
 * optimistic claim about hearing.
 *
 * What a check against this constant establishes: the map has not collapsed a
 * distinction. What it does not establish: that anyone heard it. Nothing in
 * this repository can establish the second thing.
 */
export const DISTINGUISHABLE_CENTS = 10;

/**
 * Reject an input that cannot be a period, loudly.
 *
 * A period of zero or less has no logarithm and a non-finite one poisons every
 * arithmetic step downstream. Returning NaN instead would put a silent NaN into
 * whatever eventually consumes this, where it becomes a voice that does not
 * sound and no error anywhere - the failure mode this module is a reaction to.
 * Nothing here runs inside an audio callback, so throwing is free.
 *
 * @param {number} value - The candidate period
 * @param {string} label - What to call it in the message
 * @returns {number} The value, when it is usable
 */
function requirePeriod(value, label) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    throw new RangeError(
      `${label} must be a finite period greater than zero, received ${value}`
    );
  }
  return value;
}

/**
 * How far a period sits from a reference period, as a musical interval.
 *
 * Positive when the period is longer than the reference. See the sign note in
 * the file header before mapping this onto a frequency.
 *
 * @param {number} period - The period to place
 * @param {number} referencePeriod - The period that sits at zero cents
 * @returns {number} Cents, unquantized and unclamped
 */
export function periodToCents(period, referencePeriod) {
  requirePeriod(period, 'period');
  requirePeriod(referencePeriod, 'referencePeriod');
  return CENTS_PER_OCTAVE * Math.log2(period / referencePeriod);
}

/**
 * The inverse. Cents back to the period that produced them.
 *
 * @param {number} cents - An interval from periodToCents
 * @param {number} referencePeriod - The same reference that produced the cents
 * @returns {number} The period
 */
export function centsToPeriod(cents, referencePeriod) {
  requirePeriod(referencePeriod, 'referencePeriod');
  if (typeof cents !== 'number' || !Number.isFinite(cents)) {
    throw new RangeError(`cents must be a finite number, received ${cents}`);
  }
  return referencePeriod * Math.pow(2, cents / CENTS_PER_OCTAVE);
}

/**
 * The property this module exists to have, measured rather than asserted.
 *
 * Round-tripping a period through cents and back must return it. Not
 * approximately, not to within a scale degree: to within the error of log2 and
 * pow, which is a bit or two. This is what "invertible" means operationally,
 * and stating it as a function rather than as a comment is what lets
 * tools/physics-checks.mjs put a number on it.
 *
 * @param {number} period - The period to round-trip
 * @param {number} referencePeriod - The reference to do it against
 * @returns {number} Relative error, |recovered - period| / period
 */
export function roundTripError(period, referencePeriod) {
  const recovered = centsToPeriod(
    periodToCents(period, referencePeriod),
    referencePeriod
  );
  return Math.abs(recovered - period) / period;
}

/**
 * The interval between two periods, which is the reference-free form.
 *
 * periodToCents(a, b) already computes this; the name exists because a ratio of
 * two orbits is the thing a student is usually being asked to hear, and reading
 * one of the two as a "reference" misdescribes what is going on.
 *
 * @param {number} periodA - The first period
 * @param {number} periodB - The second period
 * @returns {number} Cents from B to A, positive when A is the longer
 */
export function ratioToCents(periodA, periodB) {
  return periodToCents(periodA, periodB);
}
