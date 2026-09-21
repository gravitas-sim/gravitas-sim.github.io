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

/** Bumped when the shape of an exported record changes. */
export const EVALUATION_SCHEMA = 1;

/** The kind marker every export carries, so an importer can refuse a stranger. */
export const EVALUATION_KIND = 'gravitas.evaluation';

/**
 * The sequence these items are written against.
 *
 * Three introductory investigations, 35-45 minutes each, which is two or three
 * class meetings. The items below are tied to the objectives these three state
 * on their own cards; run a different sequence and the items stop matching what
 * was taught, which is the most common way an instrument of this kind ends up
 * measuring nothing.
 */
export const SEQUENCE = Object.freeze([
  'keplers-laws',
  'orbital-energy',
  'weighing-stars',
]);

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
    options: ['lecture', 'lab', 'recitation', 'homework', 'mixed', 'other'],
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
    options: ['alone', 'pairs', 'small groups', 'mixed'],
  },
  {
    id: 'intervention',
    kind: 'choice',
    label: 'Did you demonstrate or work through answers?',
    options: [
      'no',
      'demonstrated the interface only',
      'worked some answers',
      'worked most answers',
    ],
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
 * The columns a concept-assessment CSV carries, in order.
 *
 * `participant` is the anonymous code and may be blank. There is deliberately
 * no column for a name, an email address, a student number or an institution:
 * a column that exists gets filled in, and a spreadsheet with a name column is
 * a spreadsheet that cannot be handed to anybody.
 */
export const CONCEPT_COLUMNS = Object.freeze([
  'schema',
  'instrument',
  'occasion',
  'participant',
  ...CONCEPT_ITEMS.map(i => i.id),
]);

/** Score one response sheet against the key. @returns {object} counts */
export function scoreConcept(responses) {
  let correct = 0;
  let answered = 0;
  const perItem = {};
  for (const item of CONCEPT_ITEMS) {
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
  return { correct, answered, total: CONCEPT_ITEMS.length, perItem };
}
