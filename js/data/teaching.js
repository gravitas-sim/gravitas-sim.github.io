// =============================================================================
// The showcase page's content, as structure rather than prose
// -----------------------------------------------------------------------------
// /teaching/ is a public page addressed to instructors, prospective adopters
// and search committees. This file is what it is made of: which sections, in
// what order, and what goes in each card.
//
// Two rules hold it together, and both are the same rule the front door's data
// file follows (js/data/welcome.js).
//
//   No prose. Every string here is a message id, resolved through
//   js/i18n/en.teaching.js and its Spanish shadow. That keeps this file free of
//   imports - a test can read it without a DOM, a locale or a bundler - and
//   keeps the page translated.
//
//   No numbers. Nothing here says how many lessons there are, how many steps
//   they contain or how many physics checks pass. Those are read at render time
//   from the manifest, the browse metadata and validation/data.json, which are
//   the things that would have to change for the number to change. A count
//   typed here is a count that goes stale, and a showcase page that overstates
//   the catalogue is worse than one that stays quiet.
//
// The demonstrations
// -----------------------------------------------------------------------------
// A demonstration is NOT a simulation this page knows how to run. It is a
// seeded share payload - scenario, seed, and the handful of settings that
// differ - encoded by the same codec js/shareState.js uses for every link the
// application makes, and opened through embed mode in an iframe or through the
// ordinary application in a new tab. There is no second pathway into the
// simulation and this page contains no physics.
//
// The fragments themselves are generated: `npm run teaching:data` writes
// js/data/teachingGenerated.js from the `state` blocks below, and
// tests/teaching.test.js decodes every one of them and checks it says what the
// spec says. See tools/build-teaching-demos.mjs.
//
// Every demonstration opens PAUSED. That is not a performance decision. The
// page is about a prediction that comes before the evidence, and a figure that
// is already running has answered the question before the class was asked it.
// It also means nothing on this page moves until a reader asks it to, which is
// what `prefers-reduced-motion` wants anyway.
// =============================================================================

/**
 * The instructional cycle the page is built around.
 *
 * Five phases, each with what the student does and what the software puts in
 * front of them. The ids resolve to `.verb`, `.student` and `.tool`.
 */
export const CYCLE = Object.freeze([
  'predict',
  'test',
  'measure',
  'revise',
  'explain',
]);

/**
 * How a piece of work travels from a guess to something an instructor marks.
 *
 * Deliberately concrete: these are the five things that actually happen in the
 * interface, in the order they happen, and each names the part of the product
 * that does it. Ids resolve to `.title` and `.text`.
 */
export const JOURNEY = Object.freeze([
  'open',
  'predict',
  'evidence',
  'notebook',
  'submit',
]);

/**
 * The instruments, and what each one is for pedagogically.
 *
 * `id` resolves to `.name` and `.text`. `anchor` is the section of the model
 * page or the manual that documents it, where one exists; null means the
 * feature is described here and nowhere else worth linking.
 */
export const INSTRUMENTS = Object.freeze([
  { id: 'investigations', href: null },
  { id: 'notebook', href: null },
  { id: 'experiments', href: null },
  { id: 'sweeps', href: null },
  { id: 'pause', href: null },
  { id: 'reliability', href: '/model/#gravity' },
  { id: 'uncertainty', href: null },
  { id: 'stellarLab', href: '/model/#stars' },
]);

/**
 * The six demonstrations.
 *
 * Each one is a question a class can be asked before anything runs, a state
 * that answers it, and the lesson that does the same thing properly.
 *
 *   id        message-id stem; resolves to .question, .instructor, .predict
 *             and .visible
 *   lesson    an id in the investigation manifest. The title, duration and
 *             step count on the card are read from there, never typed here.
 *   state     the share payload. `scenario` must exist in SCENARIO_INFO and
 *             every key of `settings` must exist in DEFAULT_SETTINGS; the
 *             generator refuses the file otherwise.
 *
 * `seed` is the same for all six on purpose: it is the seed a reader will see
 * in the address bar, and one memorable value across the page is one less thing
 * that looks arbitrary. The four laboratory scenarios do not use it at all -
 * their geometry is specified rather than generated - and the two that do are
 * reproducible under it forever.
 */
export const DEMOS = Object.freeze([
  {
    id: 'retrograde',
    lesson: 'retrograde-motion',
    state: {
      scenario: 'Retrograde Mars',
      seed: 'teach',
      settings: { show_trails: true, trail_length: 400 },
    },
  },
  {
    id: 'assist',
    lesson: 'gravity-assist',
    state: {
      scenario: 'Gravity Assist Lab',
      seed: 'teach',
      settings: { show_velocity_vectors: true, show_trails: true },
    },
  },
  {
    id: 'chaos',
    lesson: 'butterfly-effect',
    state: {
      scenario: 'Three-Body Sensitivity Lab',
      seed: 'teach',
      settings: { show_trails: true, trail_length: 600 },
    },
  },
  {
    id: 'rotation',
    lesson: 'missing-mass',
    state: {
      scenario: 'Milky Way Rotation',
      seed: 'teach',
      settings: { show_velocity_vectors: true },
    },
  },
  {
    id: 'tides',
    lesson: 'tides',
    state: {
      scenario: 'Earth-Moon System',
      seed: 'teach',
      settings: { show_trails: true },
    },
  },
  {
    id: 'transit',
    lesson: 'transit-photometry',
    state: {
      scenario: 'Transit Lab',
      seed: 'teach',
      settings: { show_elapsed_time: true },
    },
  },
]);

/**
 * The five ways the thing actually gets used in a course.
 *
 * `fit` is not prose either: it names a bucket in
 * js/data/investigations/sequences.js, and the page fills the card with the
 * lessons that currently fall in it. A lesson somebody lengthens leaves the
 * demonstration column by itself.
 *
 * Ids resolve to `.title`, `.text`, `.prep` and `.hand-in`.
 */
export const PATTERNS = Object.freeze([
  // A lecture demonstration is a prepared list of states on a projector, not a
  // lesson somebody works through, so it has no slot list. Giving it one made
  // it and the activity below print the identical two lessons.
  { id: 'lecture', fit: null },
  { id: 'activity', fit: 'demo' },
  { id: 'homework', fit: 'period' },
  { id: 'laboratory', fit: 'long' },
  { id: 'inquiry', fit: null },
]);

/**
 * What a reader who is evaluating the thing rather than teaching from it wants
 * to check, and where it is.
 *
 * Every href is a route in this repository. The rule the front door's data file
 * states applies here with more force: this page is read by people deciding
 * whether to trust the project, and a dead link is the worst possible answer.
 */
export const EVIDENCE = Object.freeze([
  { id: 'validation', href: '/validation/' },
  { id: 'model', href: '/model/' },
  { id: 'instructors', href: '/instructors/' },
  {
    id: 'source',
    href: 'https://github.com/gravitas-sim/gravitas-sim.github.io',
  },
]);

/** Sections, in page order, for the table of contents. */
export const SECTIONS = Object.freeze([
  'cycle',
  'journey',
  'instruments',
  'demos',
  'patterns',
  'access',
  'evidence',
]);
