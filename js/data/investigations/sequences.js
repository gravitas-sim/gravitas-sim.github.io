// =============================================================================
// Curated orders through the catalog
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
// The brief for this was explicit that a long lesson must not be labeled as a
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
 * Nobody types this. That is the point: the one way a catalog ends up
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
 * Not difficulty. Every lesson in the catalog declares the same level -
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

/** The depths an investigation can be read at, shallowest first (DEPTH.md). */
export const SEQUENCE_DEPTHS = ['core', 'quantitative', 'advanced'];

/**
 * One sequence: the lessons are [id, depth, needs] rows, and the reason each
 * is here is the message `inv.seq.<key>.<id>`.
 *
 * `depth` is the depth the sequence assumes the lesson is read at (a lesson
 * that offers one depth is `core`); `after` names the sequences it is better
 * to have worked through first.
 */
const sequence = (id, key, after, rows) => ({
  id,
  titleId: `inv.seq.${key}.title`,
  blurbId: `inv.seq.${key}.blurb`,
  after,
  lessons: rows.map(([lesson, depth, needs]) => ({
    id: lesson,
    whyId: `inv.seq.${key}.${lesson}`,
    depth,
    ...(needs ? { needs } : {}),
  })),
});

/**
 * The sequences.
 *
 * `needs` names lessons earlier in the same sequence whose result this one
 * assumes. It is not a hard gate - a reader may open anything in any order, and
 * the catalog has no locks - it is what the browser shows so somebody can
 * decide for themselves.
 *
 * Message ids rather than prose, because the browser is translated and these
 * lines are read by students. They live with the rest of the inv.* family in
 * the deferred catalog. Six sequences (Roadmap II, Prompt 97), each ordered; a
 * lesson that belongs to two (Transit Photometry, Lines and Motion) is in
 * both, with its own reason in each. tests/investigationRegistry.test.js holds
 * every `needs` to an earlier item, every depth to what the lesson offers, and
 * every lesson to at least one sequence.
 */
export const SEQUENCES = [
  sequence(
    'the-sky',
    'sky',
    [],
    [
      ['the-turning-sky', 'core'],
      ['the-sun-through-the-year', 'core', ['the-turning-sky']],
      ['phases-and-eclipses', 'core', ['the-sun-through-the-year']],
      ['wanderers-on-the-sky', 'core', ['the-turning-sky']],
      [
        'plan-a-night',
        'quantitative',
        ['the-turning-sky', 'the-sun-through-the-year'],
      ],
    ]
  ),
  sequence(
    'gravity-and-orbits',
    'gravity',
    [],
    [
      ['keplers-laws', 'core'],
      ['retrograde-motion', 'core'],
      ['power-law-gravity', 'core'],
      ['orbital-energy', 'core', ['keplers-laws']],
      ['integrators-in-practice', 'core', ['orbital-energy']],
      ['tides', 'core'],
      ['hohmann-transfer', 'core', ['orbital-energy']],
      ['gravity-assist', 'core', ['orbital-energy']],
      ['when-orbits-lock', 'core'],
      ['lagrange-points', 'core', ['hohmann-transfer', 'when-orbits-lock']],
      ['butterfly-effect', 'core', ['lagrange-points']],
      ['black-holes', 'core'],
      ['what-is-a-gravitational-wave', 'core'],
      ['listening-to-spacetime', 'core', ['what-is-a-gravitational-wave']],
    ]
  ),
  sequence(
    'light-and-stars',
    'light',
    [],
    [
      ['color-and-temperature', 'core'],
      ['lines-and-motion', 'core', ['color-and-temperature']],
      ['what-a-spectrum-is-made-of', 'core', ['lines-and-motion']],
      ['a-universe-of-stars', 'core'],
      ['weighing-stars', 'quantitative'],
      ['lives-of-stars', 'core'],
      ['inside-a-star', 'core', ['lives-of-stars']],
      ['scaling-the-main-sequence', 'quantitative', ['inside-a-star']],
      ['the-limit', 'core', ['inside-a-star']],
      ['cluster-membership', 'quantitative', ['lives-of-stars']],
    ]
  ),
  sequence(
    'planets-and-exoplanets',
    'planets',
    ['gravity-and-orbits'],
    [
      ['transit-photometry', 'quantitative'],
      ['radial-velocity', 'core', ['transit-photometry']],
      ['detect-this-planet', 'core', ['transit-photometry', 'radial-velocity']],
      [
        'design-the-schedule',
        'core',
        ['radial-velocity', 'detect-this-planet'],
      ],
      ['goldilocks-question', 'core', ['transit-photometry']],
      ['why-venus-is-hot', 'core'],
      ['two-greenhouse-models', 'core', ['why-venus-is-hot']],
      ['the-turning-sun', 'core'],
      ['the-suns-power', 'core'],
      ['why-rings', 'core'],
      ['tides-that-move-the-moon', 'core'],
      ['ios-fire', 'core', ['tides-that-move-the-moon']],
      ['the-gaps-in-the-belt', 'core'],
      ['how-fast-does-it-spin', 'core'],
      ['binary-star-planets', 'core'],
      ['extending-an-experiment', 'core'],
      ['refitting-a-transit', 'core', ['transit-photometry']],
      ['two-periodograms', 'core', ['transit-photometry']],
      ['sampling-a-posterior', 'core', ['refitting-a-transit']],
    ]
  ),
  sequence(
    'galaxies-and-the-universe',
    'galaxies',
    ['gravity-and-orbits', 'light-and-stars'],
    [
      ['the-suns-motion', 'core'],
      ['the-rotating-disk', 'core', ['the-suns-motion']],
      ['missing-mass', 'quantitative'],
      ['bending-light', 'core'],
      ['einstein-rings-and-arcs', 'core', ['bending-light']],
      ['a-lens-passing-by', 'core', ['einstein-rings-and-arcs']],
      ['the-beat-of-a-star', 'core'],
      ['which-kind-of-variable', 'core', ['the-beat-of-a-star']],
      ['leavitts-law', 'core', ['the-beat-of-a-star']],
      ['the-first-rung', 'core', ['leavitts-law']],
      ['the-expanding-universe', 'core'],
      ['standard-candles', 'core', ['the-expanding-universe']],
      ['the-shape-of-expansion', 'quantitative', ['standard-candles']],
      ['where-galaxies-live', 'core', ['the-expanding-universe']],
    ]
  ),
  sequence(
    'observing-and-measuring',
    'observing',
    ['the-sky'],
    [
      ['what-is-a-measurement', 'core'],
      ['what-does-plus-minus-claim', 'quantitative', ['what-is-a-measurement']],
      [
        'when-the-method-must-refuse',
        'quantitative',
        ['what-does-plus-minus-claim'],
      ],
      ['plan-a-night', 'quantitative'],
      ['twelve-nights', 'core'],
      ['lines-and-motion', 'quantitative'],
      ['what-a-spectrum-is-made-of', 'quantitative', ['lines-and-motion']],
      ['what-a-ccd-records', 'core'],
      ['signal-noise-and-exposure', 'quantitative', ['what-a-ccd-records']],
      ['a-variable-star-from-frames', 'core', ['what-a-ccd-records']],
      ['measuring-the-moon', 'core', ['what-is-a-measurement']],
      ['how-far-is-that-star', 'quantitative', ['what-does-plus-minus-claim']],
      ['a-binary-stars-orbit', 'quantitative', ['how-far-is-that-star']],
      ['what-is-in-this-field', 'quantitative', ['signal-noise-and-exposure']],
      ['weighing-jupiter', 'quantitative', ['a-binary-stars-orbit']],
      ['which-surface-is-older', 'core'],
      ['craters-by-size', 'quantitative', ['which-surface-is-older']],
      [
        'what-a-crater-diameter-is-worth',
        'quantitative',
        ['which-surface-is-older'],
      ],
      ['transit-photometry', 'quantitative'],
      ['design-the-schedule', 'core'],
      ['who-gets-counted', 'core'],
      ['why-the-bright-ones-win', 'quantitative', ['who-gets-counted']],
      ['the-completeness-curve', 'quantitative', ['why-the-bright-ones-win']],
    ]
  ),
];

/**
 * Resolve a sequence against the manifest.
 *
 * Returns the entries in order with their derived fit, dropping any lesson the
 * catalog no longer has rather than rendering a dead card. A sequence that
 * loses a lesson is a shorter sequence, not a broken browser.
 *
 * @param {object} sequence - One of SEQUENCES
 * @param {Array<object>} manifest - The card catalog
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
