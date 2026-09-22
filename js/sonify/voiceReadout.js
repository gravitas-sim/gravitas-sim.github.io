// =============================================================================
// What the sound is carrying, as numbers
// -----------------------------------------------------------------------------
// The non-audio path to the facts the sandbox's sonification is trying to
// convey. Not a description of the sound: a description of the thing the sound
// is about.
//
// That distinction is the whole design and it is worth being exact about. The
// audible signal is lossy on purpose - js/audio.js compresses orbital frequency
// through log2(1 + f*40) and quantizes the result onto a minor pentatonic, so
// two orbits several percent apart can arrive at the same note. A text
// "equivalent" that described what you hear would therefore have to be lossy in
// the same way, which would make it worthless. This describes what the audio is
// derived FROM, losslessly, so that a listener who cannot use the audio is not
// getting a degraded version of it but the quantity itself.
//
// Same source, and that is enforced rather than hoped for. The rows here are
// built from the very array js/audio.js hands to its oscillators - see
// getVoicedBodies() there - so there is no second derivation of the frequency
// that could drift away from the one being played. tests/voiceReadout.test.js
// holds js/ui.js to reading it only through that accessor.
//
// Nothing here formats anything. Periods come out in simulation time units and
// the feature layer converts them to days or years, because the conversion is
// presentation and the ratio between two periods - which is what the pitches
// actually encode - is the same number in every unit.
// =============================================================================

import { periodToCents } from './law.js';

/**
 * A voiced body reduced to the quantity its pitch stands for.
 *
 * @typedef {object} VoiceRow
 * @property {string} type - The body's type key, for the feature layer to translate
 * @property {number} period - Orbital period in simulation time units
 * @property {number} ratio - This period over the reference period, >= 1
 * @property {number} cents - The same ratio as an interval, >= 0
 * @property {boolean} isReference - True for the one the others are measured from
 */

/**
 * Turn what is being voiced into what it means.
 *
 * The reference is the shortest period in the set - the fastest body, the
 * highest voice - so every interval comes out positive and a reader does not
 * have to hold a sign convention in their head while also holding three
 * numbers. See the header of js/sonify/law.js for why the sign is a hazard.
 *
 * A target whose orbital frequency is zero or non-finite is dropped rather than
 * reported as an infinite period. That happens for a body at rest and for one
 * sitting exactly at the origin, both of which are ordinary sandbox states; the
 * audio gives them no pitch either, so a row for them would be describing
 * silence.
 *
 * @param {Array<{type?: string, orbitalFrequency?: number}>} targets - From getVoicedBodies()
 * @returns {{rows: Array<VoiceRow>, referencePeriod: number}} Empty rows when nothing is voiced
 */
export function describeVoices(targets) {
  const usable = (Array.isArray(targets) ? targets : [])
    .filter(
      t =>
        t &&
        typeof t.orbitalFrequency === 'number' &&
        Number.isFinite(t.orbitalFrequency) &&
        t.orbitalFrequency > 0
    )
    .map(t => ({
      // A key, not a name. Translating it here would put i18n in the
      // foundation layer and make this module untestable without a catalog.
      type: typeof t.type === 'string' && t.type ? t.type : 'Star',
      period: 1 / t.orbitalFrequency,
    }));

  if (!usable.length) return { rows: [], referencePeriod: 0 };

  const referencePeriod = Math.min(...usable.map(v => v.period));
  // Slowest last. The audio plays them together and has no order at all, so
  // this one is chosen for the reader: ascending period is descending pitch,
  // which is the order the intervals are quoted in.
  const sorted = [...usable].sort((a, b) => a.period - b.period);

  return {
    referencePeriod,
    rows: sorted.map(v => ({
      type: v.type,
      period: v.period,
      ratio: v.period / referencePeriod,
      cents: periodToCents(v.period, referencePeriod),
      isReference: v.period === referencePeriod,
    })),
  };
}
