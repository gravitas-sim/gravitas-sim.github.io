// =============================================================================
// The classroom evidence kit, as data
// -----------------------------------------------------------------------------
// One definition of every instrument, imported by three things that must not
// disagree: the page at /evaluation/, the Node summary tool, and the test that
// checks the printable HTML still matches.
//
// The printable forms are written out in the HTML rather than injected, because
// a form that needs JavaScript to appear is a form that cannot be printed from
// a locked-down school machine. The HTML is therefore a second copy of these
// items, and tests/evaluationKit.test.js is what stops the two drifting - the
// same arrangement the lesson-scene audit uses for its acceptance map.
//
// What this is not
// -----------------------------------------------------------------------------
// Not a validated instrument. Nothing here has been through item analysis,
// reliability testing or validation against an existing inventory, because
// none of that has been done. It is a project-developed pilot, it says so on
// every surface that shows it, and a score from it is a score on these twelve
// questions and not a measurement of astronomy learning.
//
// The teaching page has said for some time that "no study has been run on this
// software. There is no validated assessment, no measured learning gain." That
// is still true. This adds the paperwork somebody would need in order to change
// it, and changes nothing about what is currently known.
// =============================================================================

// The page reads only the shape (evaluationShape.js), so its ids, its fidelity
// choices, its schema and its columns are defined there, and held to these
// items by tests/evaluationKit.test.js.
import {
  CONCEPT_COLUMNS,
  CONCEPT_V2_COLUMNS,
  CONCEPT_V2_INSTRUMENT,
  EVALUATION_KIND,
  EVALUATION_SCHEMA,
  FIDELITY_CHOICES,
} from './evaluationShape.js';

export {
  CONCEPT_COLUMNS,
  CONCEPT_V2_COLUMNS,
  CONCEPT_V2_INSTRUMENT,
  EVALUATION_KIND,
  EVALUATION_SCHEMA,
};

/**
 * What the instructor records about how the session actually went.
 *
 * Fidelity, not opinion. An evaluation without this cannot tell a result from
 * a deviation: a class where the instructor worked three answers on the board
 * is a different intervention from one where they did not, and the difference
 * is invisible in the scores.
 *
 * `kind` drives the control the page renders. Nothing here identifies a person
 * or an institution, and that is checked by a test rather than by intention.
 */
export const FIDELITY_ITEMS = Object.freeze([
  {
    id: 'investigations',
    kind: 'text',
    label: 'Which investigations were used, in order',
    hint: 'Ids or titles. If you ran only part of one, say which steps.',
  },
  {
    id: 'setting',
    kind: 'choice',
    label: 'Instructional setting',
    options: FIDELITY_CHOICES.setting,
  },
  {
    id: 'minutes',
    kind: 'number',
    label: 'Approximate contact time on Gravitas, in minutes',
    hint: 'Total across all sessions. An estimate is fine; leave blank if unsure.',
  },
  {
    id: 'grouping',
    kind: 'choice',
    label: 'How students worked',
    options: FIDELITY_CHOICES.grouping,
  },
  {
    id: 'intervention',
    kind: 'choice',
    label: 'Did you demonstrate or work through answers?',
    options: FIDELITY_CHOICES.intervention,
    hint: 'This changes what the scores mean. It is not a failing to say yes.',
  },
  {
    id: 'deviations',
    kind: 'text',
    label: 'Major deviations from the intended procedure',
    hint: 'Skipped steps, technical failures, a fire drill, anything that would change how a reader reads the result.',
  },
]);

/**
 * The pilot pre/post items.
 *
 * Twelve, which is about ten minutes to administer, across four things the
 * chosen sequence actually teaches. Each item names the objective it came from
 * so that an item which turns out to measure nothing can be traced back rather
 * than quietly dropped.
 *
 * `answer` is the index of the intended response. It is a scoring key for a
 * pilot instrument, not a claim that the key is right: an item every student
 * gets wrong in both the pre and the post is more likely to be a bad item than
 * a universal misconception, and the summary tool prints the per-item numbers
 * that would show it.
 */
export const CONCEPT_ITEMS = Object.freeze([
  // --- Orbital and gravitational reasoning ----------------------------------
  {
    id: 'q01',
    domain: 'orbital',
    from: 'keplers-laws: where the primary sits',
    stem: 'A planet moves on a noticeably elliptical orbit around a star. Where is the star?',
    options: [
      'At the centre of the ellipse',
      'At one focus of the ellipse, off centre',
      'At the point where the planet moves fastest',
      'At a point that shifts as the planet moves',
    ],
    answer: 1,
  },
  {
    id: 'q02',
    domain: 'orbital',
    from: 'keplers-laws: speed at periapsis',
    stem: 'The same planet moves fastest when it is closest to the star. The best reason is that',
    options: [
      'gravity is stronger there, so it is pushed along faster',
      'it is falling downhill and gravity has had longer to act',
      'the product of its distance and its sideways speed stays the same',
      'the star heats it and the extra energy speeds it up',
    ],
    answer: 2,
  },
  {
    id: 'q03',
    domain: 'orbital',
    from: 'orbital-energy: escaping does not stop gravity',
    stem: 'A probe is launched fast enough to escape a planet and never return. After it escapes,',
    options: [
      'the planet no longer pulls on it',
      'the planet still pulls on it, but never enough to bring it back',
      'the pull reverses and pushes it away',
      'the pull stops once the probe passes the escape distance',
    ],
    answer: 1,
  },
  // --- Measurement and inference --------------------------------------------
  {
    id: 'q04',
    domain: 'measurement',
    from: 'keplers-laws: P squared against a cubed',
    stem: 'You measure the period and the semi-major axis of four planets around one star and plot log P against log a. A straight line of slope 1.5 tells you',
    options: [
      'the orbits are circles',
      'the planets all have the same mass',
      'the period squared is proportional to the axis cubed',
      'the star is at the centre of each orbit',
    ],
    answer: 2,
  },
  {
    id: 'q05',
    domain: 'measurement',
    from: 'weighing-stars: total mass from size and period',
    stem: 'To find the total mass of a binary pair from a simulation, the two quantities you most need to measure are',
    options: [
      'the brightness of each star and their colours',
      'the size of the orbit and the time to go round once',
      'the temperature of each star and their separation',
      'the speed of the brighter star and its radius',
    ],
    answer: 1,
  },
  {
    id: 'q06',
    domain: 'measurement',
    from: 'weighing-stars: splitting the total mass',
    stem: 'In a binary, the heavier star sits closer to the barycenter. If one star is three times further from the barycenter than the other, then',
    options: [
      'the nearer star is three times heavier',
      'the further star is three times heavier',
      'the two stars have equal mass',
      'nothing can be said without knowing the period',
    ],
    answer: 0,
  },
  // --- Model interpretation --------------------------------------------------
  {
    id: 'q07',
    domain: 'model',
    from: 'model page: displayed sizes',
    stem: 'In Gravitas the bodies are drawn much larger than they would be to scale. The main consequence for a measurement is that',
    options: [
      'distances between bodies are also wrong',
      'the drawn size cannot be used to judge how big anything is',
      'the masses are wrong by the same factor',
      'orbital periods come out too short',
    ],
    answer: 1,
  },
  {
    id: 'q08',
    domain: 'model',
    from: 'model page: two dimensions',
    stem: 'The Gravitas engine is two-dimensional. Which conclusion does that make unsafe?',
    options: [
      'that a single planet orbits its star on an ellipse',
      'that a heavier star produces a shorter orbital period at fixed distance',
      'that two planets whose orbits appear to cross would actually collide',
      'that a body below zero total energy is bound',
    ],
    answer: 2,
  },
  {
    id: 'q09',
    domain: 'model',
    from: 'orbital-energy: bound means negative total energy',
    stem: 'A body has kinetic energy 5 units and gravitational potential energy -8 units. It is',
    options: [
      'unbound, because the kinetic energy is positive',
      'bound, because the total is negative',
      'exactly at escape',
      'impossible to classify without its mass',
    ],
    answer: 1,
  },
  // --- Illustration against measurement --------------------------------------
  {
    id: 'q10',
    domain: 'illustration',
    from: 'model page: what is simulated and what is drawn',
    stem: 'Some things on the Gravitas screen are computed from the physics and some are drawn to illustrate. Which of these is computed?',
    options: [
      'the glow around a star',
      'the jet drawn from a black hole',
      'the position of an orbiting body at each step',
      'the ripple animation after a merger',
    ],
    answer: 2,
  },
  {
    id: 'q11',
    domain: 'illustration',
    from: 'model page: the spacetime view',
    stem: 'The three-dimensional "spacetime" sheet dips beneath a massive body. A student says the depth of the dip is the curvature of spacetime near that body. The best response is',
    options: [
      'correct, that is what the view shows',
      'correct, though only for black holes',
      'it is a drawing of the Newtonian gravitational potential, not a curvature',
      'it is meaningless and should be ignored',
    ],
    answer: 2,
  },
  {
    id: 'q12',
    domain: 'illustration',
    from: 'model page: reading a number off a picture',
    stem: 'Which of these numbers would you trust to two significant figures from Gravitas?',
    options: [
      'the depth of the spacetime sheet under a star',
      'the width of a drawn accretion disk',
      'the orbital period measured with the on-screen timer',
      'the apparent size of a planet on screen',
    ],
    answer: 2,
  },
]);

/**
 * Draft version 2 of the concept items, `concept/2`.
 *
 * DRAFT. Written by the project to repair the three defects computed from
 * version 1 (LEARNING_STUDY.md 2.1): the key is three times each of a, b, c
 * and d; the correct option is the longest on no more than a quarter of the
 * items, and no distractor was padded to get there; and every one of the
 * sixteen stated objectives of the three investigations has exactly one item.
 * It has had no expert review, no think-aloud interview and no calibration,
 * and nothing about it has been fixed: the freeze conditions of D-STUDY-02
 * stand exactly as written. The five model-page items of version 1 (q07, q08,
 * q10, q11, q12) are not in it, because they assess no stated objective; that
 * costs RQ2 its items, which is recorded in LEARNING_STUDY.md 2.5.
 *
 * Ids are `r01` to `r16`, disjoint from version 1's `q01` to `q12`, and an
 * export names its version in the `instrument` column, so that a sheet from
 * one version cannot be scored, paired or pooled as the other
 * (tests/conceptV2.test.js).
 *
 * `objective` is the stated objective the item assesses, as "Investigation
 * number", numbered in the order each investigation lists them.
 * `misconceptions` says, for each distractor, where its misconception is
 * documented: see LEARNING_STUDY.md Appendix B for the evidence level of each
 * and for what could not be verified. `computed` marks an item whose key is a
 * number or a ratio, which tests/conceptV2.test.js recomputes.
 */
export const CONCEPT_ITEMS_V2 = Object.freeze([
  {
    id: 'r01',
    domain: 'kepler',
    objective: 'Kepler 1',
    stem: 'A planet moves on a noticeably elliptical orbit around a star. Where is the star?',
    options: [
      'At the center of the ellipse',
      'At the point where the planet moves fastest',
      'At one focus of the ellipse, off center',
      'At one focus, with a second star at the other focus',
    ],
    answer: 2,
  },
  {
    id: 'r02',
    domain: 'kepler',
    objective: 'Kepler 2',
    stem: "Measurements show that a planet's speed varies around its elliptical orbit. Which statement is correct?",
    options: [
      'It is fastest when closest to the star, because distance times sideways speed stays the same',
      'It is fastest when closest to the star, because gravity is stronger there and speed follows the force',
      'The speed is constant; the planet only looks faster when nearer because it sweeps a bigger angle',
      "It is fastest when farthest away, where the star's pull is weakest and holds it back least",
    ],
    answer: 0,
  },
  {
    id: 'r03',
    domain: 'kepler',
    objective: 'Kepler 3',
    stem: 'You measure the period and the semi-major axis of four planets around one star and plot log P against log a. A straight line of slope 1.5 tells you',
    options: [
      'the period is proportional to the axis, so a planet twice as far out takes twice as long',
      'the planets all have the same mass',
      'the orbits are circles',
      'the period squared is proportional to the axis cubed',
    ],
    answer: 3,
  },
  {
    id: 'r04',
    domain: 'kepler',
    objective: 'Kepler 4',
    stem: 'A star has four times the Sun’s mass. A planet orbits it at 1 AU. Its period is',
    options: [
      '1 year, because 1 AU is where Earth orbits',
      'half a year',
      '2 years, because a heavier star pulls it round more slowly',
      '4 years',
    ],
    answer: 1,
    computed: true,
  },
  {
    id: 'r05',
    domain: 'energy',
    objective: 'Energy 1',
    stem: 'A cannonball is fired sideways from a very tall mountain, a little faster each time. When the speed rises from just below the escape speed to just above it, what changes about the path?',
    options: [
      'The closed orbit turns into an open path that never comes back',
      'The orbit stays closed but becomes much larger, so it takes far longer to come back',
      'The path straightens out, because gravity has stopped acting',
      'The ball settles into a circular orbit at a larger radius',
    ],
    answer: 0,
  },
  {
    id: 'r06',
    domain: 'energy',
    objective: 'Energy 2',
    stem: 'A body has kinetic energy 6 units and gravitational potential energy −4 units. It is',
    options: [
      'bound, because gravity is always pulling on it',
      'bound, because its potential energy is negative',
      'unbound, because its total energy is above zero',
      'impossible to classify without knowing its mass',
    ],
    answer: 2,
    computed: true,
  },
  {
    id: 'r07',
    domain: 'energy',
    objective: 'Energy 3',
    stem: 'Ignoring the air, roughly how fast must a rocket be moving, relative to Earth, to leave Earth and never come back?',
    options: [
      'About 1 km/s, a little faster than a rifle bullet',
      'About 8 km/s, the speed of a low orbit',
      'No minimum: any speed will do if the engine keeps pushing',
      'About 11 km/s, over 25,000 miles per hour',
    ],
    answer: 3,
    computed: true,
  },
  {
    id: 'r08',
    domain: 'energy',
    objective: 'Energy 4',
    stem: 'A probe is launched fast enough to escape a planet and never return. Once it is very far away,',
    options: [
      'the planet has no pull on it at all',
      'the planet still pulls on it, but never enough to bring it back',
      'the pull has become a push away from the planet',
      'the pull switches off once the probe is beyond some critical distance',
    ],
    answer: 1,
  },
  {
    id: 'r09',
    domain: 'energy',
    objective: 'Energy 5',
    stem: "Compare escape from a point four Earth radii from Earth's center with escape from the surface. The escape speed at the farther point is",
    options: [
      'the same: it is a property of Earth, not of where you start',
      'half as large: it varies as one over the root of the distance',
      'a quarter as large: it varies as one over the distance',
      'one sixteenth as large: it varies as one over the distance squared',
    ],
    answer: 1,
    computed: true,
  },
  {
    id: 'r10',
    domain: 'energy',
    objective: 'Energy 6',
    stem: 'A comet comes in from far away, swings past the Sun and heads out again. The path astronomers fit to its motion is a hyperbola. The comet is',
    options: [
      'bound, because the Sun bent its path',
      'bound, because it came close to the Sun',
      'bound, with a period too long to see',
      'unbound, because its total energy is above zero',
    ],
    answer: 3,
  },
  {
    id: 'r11',
    domain: 'stars',
    objective: 'Stars 1',
    stem: 'A diagram shows the bigger star of a binary staying still while the smaller star circles it. A student says this is because the bigger star pulls on the smaller one but is not pulled back. The best response is',
    options: [
      'the pulls are equal and opposite, so both stars accelerate',
      'right: the heavier star pulls harder, so only the lighter star is moved',
      'right: the big star is held in place by its own gravity',
      'wrong: the heavier star feels more force, so it moves more than the lighter one',
    ],
    answer: 0,
  },
  {
    id: 'r12',
    domain: 'stars',
    objective: 'Stars 2',
    stem: 'Two stars of 3 and 1 solar masses are 4 AU apart. How far from the heavier star is their balance point, the barycenter?',
    options: [
      '2 AU, halfway between the two stars',
      '3 AU, nearer the lighter star',
      '1 AU, which is nearer the heavier star',
      '0 AU: it sits at the center of the heavier star',
    ],
    answer: 2,
    computed: true,
  },
  {
    id: 'r13',
    domain: 'stars',
    objective: 'Stars 3',
    stem: 'In a binary, star P is three times further from the barycenter than star Q. Then',
    options: [
      'P is three times heavier than Q',
      'P and Q have equal mass, because they share one period',
      'Q is three times heavier than P',
      'the masses cannot be compared without knowing the period',
    ],
    answer: 2,
    computed: true,
  },
  {
    id: 'r14',
    domain: 'stars',
    objective: 'Stars 4',
    stem: 'Two stars are 2 AU apart and take 2 years to go round each other. Their total mass is',
    options: [
      '2 solar masses',
      '0.25 solar mass',
      '4 solar masses',
      '1 solar mass',
    ],
    answer: 0,
    computed: true,
  },
  {
    id: 'r15',
    domain: 'stars',
    objective: 'Stars 5',
    stem: 'The total mass of a binary is 4 solar masses. Star A is three times further from the barycenter than star B. The masses of A and B are',
    options: [
      'A 3, B 1 (solar masses)',
      'A 1, B 3 (solar masses)',
      'A 2, B 2 (solar masses)',
      'A 0.4, B 3.6 (solar masses)',
    ],
    answer: 1,
    computed: true,
  },
  {
    id: 'r16',
    domain: 'stars',
    objective: 'Stars 6',
    stem: 'Why do astronomers rely on binary stars to find the masses of stars?',
    options: [
      "A star's mass can be read from how bright it looks, and binaries are the brightest stars",
      "A star's color gives its mass, and binary stars show their colors best",
      'Binary stars are heavier than single stars, so they are easier to weigh',
      'The orbit of a pair reveals the masses directly, through the pull between them',
    ],
    answer: 3,
  },
]);

/**
 * The concept versions, by the name an export carries in its `instrument`
 * column. Version 1 is the pilot as first written and stays readable and
 * scorable; version 2 is the draft above. Nothing ever combines the two: see
 * `scoreConcept`, and `versionOfInstrument`.
 */
export const CONCEPT_VERSIONS = Object.freeze({
  concept: { name: 'concept/1', items: CONCEPT_ITEMS, status: 'pilot' },
  [CONCEPT_V2_INSTRUMENT]: {
    name: CONCEPT_V2_INSTRUMENT,
    items: CONCEPT_ITEMS_V2,
    status: 'DRAFT',
  },
});

/** Which version an `instrument` column value names, or null if none. */
export function versionOfInstrument(instrument) {
  const key =
    instrument === undefined || instrument === '' ? 'concept' : instrument;
  return Object.hasOwn(CONCEPT_VERSIONS, key) ? CONCEPT_VERSIONS[key] : null;
}

/**
 * The usability and adoption questionnaire.
 *
 * Project-developed. There are established instruments for this - SUS is the
 * obvious one - and none is used here, because SUS is ten specific items with
 * a specific scoring procedure and quoting a SUS score from anything else is
 * the most common misuse of it. If a SUS score is wanted, administer SUS.
 *
 * Five-point agreement unless `kind` says otherwise. The last two are free
 * text, because the teaching page is right that ten minutes of watching beats
 * a hundred ratings and the least a rating sheet can do is leave room to say
 * what actually happened.
 */
export const USABILITY_ITEMS = Object.freeze([
  {
    id: 'u1',
    audience: 'student',
    kind: 'agree',
    stem: 'I could tell what the investigation was asking me to do.',
  },
  {
    id: 'u2',
    audience: 'student',
    kind: 'agree',
    stem: 'I could find the control or reading each step referred to.',
  },
  {
    id: 'u3',
    audience: 'student',
    kind: 'agree',
    stem: 'When I got something wrong, the feedback helped me work out why.',
  },
  {
    id: 'u4',
    audience: 'student',
    kind: 'agree',
    stem: 'The simulation ran smoothly enough on the machine I used.',
  },
  {
    id: 'u5',
    audience: 'student',
    kind: 'agree',
    stem: 'I would be willing to use this again for another topic.',
  },
  {
    id: 'u6',
    audience: 'instructor',
    kind: 'agree',
    stem: 'Preparing this for a class took an amount of time I could repeat.',
  },
  {
    id: 'u7',
    audience: 'instructor',
    kind: 'agree',
    stem: 'The documentation told me what the model does and does not do.',
  },
  {
    id: 'u8',
    audience: 'both',
    kind: 'text',
    stem: 'Where did you get stuck, if anywhere?',
  },
  {
    id: 'u9',
    audience: 'both',
    kind: 'text',
    stem: 'What would you change first?',
  },
]);

/** The agreement scale, low to high. Stored as 1-5 in an export. */
export const AGREE_SCALE = Object.freeze([
  'strongly disagree',
  'disagree',
  'neither',
  'agree',
  'strongly agree',
]);

/** Which instruments exist, for the exporter and the summary tool. */
export const INSTRUMENTS = Object.freeze({
  fidelity: { items: FIDELITY_ITEMS, respondent: 'instructor' },
  concept: { items: CONCEPT_ITEMS, respondent: 'student' },
  usability: { items: USABILITY_ITEMS, respondent: 'either' },
});

/**
 * Score one response sheet against the key of one version.
 *
 * A sheet is only ever scored against the version it was written for: the
 * ids of the two versions are disjoint, so a version 1 sheet scored as version
 * 2 answers nothing and a pooled score cannot arise by accident.
 *
 * @param {object} responses - Answers by item id
 * @param {string} [instrument] - `concept` (version 1, the default) or `concept/2`
 * @returns {object} counts
 */
export function scoreConcept(responses, instrument = 'concept') {
  const items = versionOfInstrument(instrument)?.items;
  if (!items) throw new Error(`unknown concept version: ${instrument}`);
  let correct = 0;
  let answered = 0;
  const perItem = {};
  for (const item of items) {
    const raw = responses?.[item.id];
    if (raw === undefined || raw === null || raw === '') {
      perItem[item.id] = null;
      continue;
    }
    answered++;
    const ok = Number(raw) === item.answer;
    perItem[item.id] = ok;
    if (ok) correct++;
  }
  return { correct, answered, total: items.length, perItem };
}
