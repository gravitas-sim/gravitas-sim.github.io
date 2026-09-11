// =============================================================================
// Curated orders through the catalogue
// -----------------------------------------------------------------------------
// Seventeen lessons is enough that "which one first?" is a real question, and
// the browser answers it badly on its own: a grid sorted by nothing in
// particular tells a reader what exists and not what to do with it.
//
// A sequence is an order and a reason. It carries no prose about the lessons
// themselves - that lives in the manifest, generated from the lessons - and no
// copy of their titles or durations, because a second list of those is a second
// list to go stale. What it adds is the edges: this before that, and why.
//
// How long each one takes is DERIVED, never written down here
// -----------------------------------------------------------------------------
// The brief for this was explicit that a long lesson must not be labelled as a
// short demonstration, and the way to guarantee that is to not let anybody type
// the label. `fitFor` reads the duration the lesson itself declares and buckets
// it. A lesson somebody lengthens moves out of the demonstration bucket the
// moment the manifest is regenerated, with nothing to remember.
//
// Where a reader wants a full-period lesson in a fifteen-minute slot, the
// answer is not to relabel it. It is to cut a short activity out of it with the
// assignment builder, which exists for exactly that, and the browser offers
// that link on any lesson too long for the slot.
// =============================================================================

import { BROWSE_META } from './browseData.js';

/** The longest a lesson can run and still fit inside a demonstration slot. */
export const DEMO_MINUTES = 25;

/** The longest a lesson can run and still fit one class period. */
export const PERIOD_MINUTES = 50;

/**
 * The longest number of minutes a duration string admits.
 *
 * Durations are written as ranges - '35-45 min', '20-25 min' - and the upper
 * bound is the honest one to plan a class around.
 *
 * @param {string} duration - As the lesson declares it
 * @returns {?number} Minutes, or null if it cannot be read
 */
export function durationMinutes(duration) {
  const numbers = String(duration || '').match(/\d+/g);
  if (!numbers?.length) return null;
  return Math.max(...numbers.map(Number));
}

/** How much of a class a lesson wants. */
export const LENGTH = Object.freeze({
  /** Short enough to run as a demonstration. */
  DEMO: 'demo',
  /** Fits one period, near enough. */
  PERIOD: 'period',
  /** Longer than a period: split it, or set part of it as homework. */
  LONG: 'long',
});

/** The order they are offered in, shortest first. */
export const LENGTHS = [LENGTH.DEMO, LENGTH.PERIOD, LENGTH.LONG];

/**
 * Which slot a lesson fits, read off the duration it declares.
 *
 * Nobody types this. That is the point: the one way a catalogue ends up
 * promising a fifteen-minute demonstration and delivering seventy minutes is
 * by carrying a label somebody wrote once and never revisited.
 *
 * @param {object} entry - A manifest entry
 * @returns {string} One of LENGTH
 */
export function lengthOf(entry) {
  const minutes = durationMinutes(entry?.duration);
  if (minutes === null) return LENGTH.LONG;
  if (minutes <= DEMO_MINUTES) return LENGTH.DEMO;
  if (minutes <= PERIOD_MINUTES) return LENGTH.PERIOD;
  return LENGTH.LONG;
}

/**
 * How much arithmetic a lesson asks for.
 *
 * Not difficulty. Every lesson in the catalogue declares the same level -
 * introductory - so a difficulty filter would offer one option and filter
 * nothing. What actually differs between them is whether a reader is asked to
 * work numbers out, and the manifest counts that from the steps themselves.
 *
 * @param {object} entry - A manifest entry
 * @returns {string} 'none', 'some' or 'lots'
 */
export function calculationOf(entry) {
  const n = BROWSE_META[entry?.id]?.numericCount || 0;
  if (!n) return 'none';
  return n >= 4 ? 'lots' : 'some';
}

/** The order they are offered in, least arithmetic first. */
export const CALCULATIONS = ['none', 'some', 'lots'];

/**
 * The sequences.
 *
 * `needs` names lessons earlier in the same sequence whose result this one
 * assumes. It is not a hard gate - a reader may open anything in any order, and
 * the catalogue has no locks - it is what the browser shows so somebody can
 * decide for themselves.
 *
 * Message ids rather than prose, because the browser is translated and these
 * lines are read by students. They live with the rest of the inv.* family in
 * the deferred catalogue.
 */
export const SEQUENCES = [
  {
    id: 'orbital-mechanics',
    titleId: 'inv.seq.orbits.title',
    blurbId: 'inv.seq.orbits.blurb',
    lessons: [
      { id: 'keplers-laws', whyId: 'inv.seq.orbits.keplers-laws' },
      {
        id: 'orbital-energy',
        whyId: 'inv.seq.orbits.orbital-energy',
        needs: ['keplers-laws'],
      },
      {
        id: 'hohmann-transfer',
        whyId: 'inv.seq.orbits.hohmann-transfer',
        needs: ['orbital-energy'],
      },
      {
        id: 'gravity-assist',
        whyId: 'inv.seq.orbits.gravity-assist',
        needs: ['orbital-energy'],
      },
      {
        id: 'lagrange-points',
        whyId: 'inv.seq.orbits.lagrange-points',
        needs: ['hohmann-transfer'],
      },
    ],
  },
  {
    id: 'exoplanet-detection',
    titleId: 'inv.seq.exoplanets.title',
    blurbId: 'inv.seq.exoplanets.blurb',
    lessons: [
      {
        id: 'transit-photometry',
        whyId: 'inv.seq.exoplanets.transit-photometry',
      },
      {
        id: 'radial-velocity',
        whyId: 'inv.seq.exoplanets.radial-velocity',
        needs: ['transit-photometry'],
      },
      {
        id: 'detect-this-planet',
        whyId: 'inv.seq.exoplanets.detect-this-planet',
        needs: ['transit-photometry', 'radial-velocity'],
      },
      {
        id: 'design-the-schedule',
        whyId: 'inv.seq.exoplanets.design-the-schedule',
        needs: ['radial-velocity', 'detect-this-planet'],
      },
      {
        id: 'goldilocks-question',
        whyId: 'inv.seq.exoplanets.goldilocks-question',
        needs: ['transit-photometry'],
      },
    ],
  },
  {
    id: 'gravity-beyond-two-bodies',
    titleId: 'inv.seq.threebody.title',
    blurbId: 'inv.seq.threebody.blurb',
    lessons: [
      { id: 'when-orbits-lock', whyId: 'inv.seq.threebody.when-orbits-lock' },
      {
        id: 'lagrange-points',
        whyId: 'inv.seq.threebody.lagrange-points',
        needs: ['when-orbits-lock'],
      },
      {
        id: 'butterfly-effect',
        whyId: 'inv.seq.threebody.butterfly-effect',
        needs: ['lagrange-points'],
      },
      {
        id: 'binary-star-planets',
        whyId: 'inv.seq.threebody.binary-star-planets',
        needs: ['butterfly-effect'],
      },
    ],
  },
  {
    // Two lessons rather than five, and the shortest sequence here, because
    // the pair is the point: the advanced lesson assumes an answer to "what
    // is the thing arriving" that it never gives, and the beginner one is
    // that answer. `needs` is a recommendation the browser prints, not a
    // lock - see the note above - so a reader who already knows what a
    // gravitational wave is can open the second one directly.
    id: 'gravitational-waves',
    titleId: 'inv.seq.waves.title',
    blurbId: 'inv.seq.waves.blurb',
    lessons: [
      {
        id: 'what-is-a-gravitational-wave',
        whyId: 'inv.seq.waves.what-is-a-gravitational-wave',
      },
      {
        id: 'listening-to-spacetime',
        whyId: 'inv.seq.waves.listening-to-spacetime',
        needs: ['what-is-a-gravitational-wave'],
      },
    ],
  },
];

/**
 * Resolve a sequence against the manifest.
 *
 * Returns the entries in order with their derived fit, dropping any lesson the
 * catalogue no longer has rather than rendering a dead card. A sequence that
 * loses a lesson is a shorter sequence, not a broken browser.
 *
 * @param {object} sequence - One of SEQUENCES
 * @param {Array<object>} manifest - The card catalogue
 * @returns {Array<object>} Resolved steps
 */
export function resolveSequence(sequence, manifest) {
  const byId = new Map((manifest || []).map(entry => [entry.id, entry]));
  return (sequence?.lessons || [])
    .filter(step => byId.has(step.id))
    .map(step => ({
      ...step,
      entry: byId.get(step.id),
      fit: lengthOf(byId.get(step.id)),
      // Only the prerequisites that survived, so an explanation never names a
      // lesson the reader cannot open.
      needs: (step.needs || []).filter(id => byId.has(id)),
    }));
}
