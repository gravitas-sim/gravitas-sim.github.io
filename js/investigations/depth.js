// =============================================================================
// Progressive depth: one lesson, three levels of the same science
// -----------------------------------------------------------------------------
// Prompt 72. A lesson offers `depths` (core, quantitative, advanced) and a step
// declares the depth it belongs to. The core steps are the lesson as it always
// was; the deeper ones live in a file of their own,
// js/data/investigations/depth/<id>.js, and are laid into the lesson only when
// somebody reads at that depth. A student who stays at core downloads nothing
// extra, which is what keeps the lesson routes inside their ceilings.
//
// What a deeper step may do is fixed here and checked by js/authoring/rules.js
// (the rule set is in DEPTH.md):
//
//   - It reads the same world. A depth never opens another scenario, seed or
//     instrument model; it has no `setup` of its own, or one identical to the
//     one already in force.
//   - It reuses the numbers a student already measured, through a field's
//     `compute(values, earlier)`, whose second argument reads any earlier
//     step's field. Nothing is measured twice.
//   - It never changes an expected value. A deeper graded step that restates a
//     core one (`restates: <sid>`) carries the same answer within the core
//     step's tolerance, or the lesson fails author:check.
//   - Progress keys are step ids, so switching depth never loses an answer.
//
// This module is imported lazily by the lesson engine and eagerly by the
// answer-key build, the author checks and the tests. It imports only data.
// =============================================================================

import {
  DEPTHS,
  depthsOf,
  inDepth,
  layDepth,
  lessonAt,
  overlay,
  stepCounts,
} from './depthPure.js';
import { registerMessages, t } from '../i18n/index.js';

export { DEPTHS, inDepth, depthsOf, layDepth, lessonAt, stepCounts };

/** Which lessons have deeper steps, and where they are loaded from. */
const EXTENSIONS = {
  'keplers-laws': () => import('../data/investigations/depth/keplers-laws.js'),
  'transit-photometry': () =>
    import('../data/investigations/depth/transit-photometry.js'),
  'weighing-stars': () =>
    import('../data/investigations/depth/weighing-stars.js'),
  'missing-mass': () => import('../data/investigations/depth/missing-mass.js'),
  'color-and-temperature': () =>
    import('../data/investigations/depth/color-and-temperature.js'),
  'the-turning-sky': () =>
    import('../data/investigations/depth/the-turning-sky.js'),
  'the-sun-through-the-year': () =>
    import('../data/investigations/depth/the-sun-through-the-year.js'),
  'phases-and-eclipses': () =>
    import('../data/investigations/depth/phases-and-eclipses.js'),
  'wanderers-on-the-sky': () =>
    import('../data/investigations/depth/wanderers-on-the-sky.js'),
  'plan-a-night': () => import('../data/investigations/depth/plan-a-night.js'),
  'lines-and-motion': () =>
    import('../data/investigations/depth/lines-and-motion.js'),
  'what-a-spectrum-is-made-of': () =>
    import('../data/investigations/depth/what-a-spectrum-is-made-of.js'),
  'the-suns-motion': () =>
    import('../data/investigations/depth/the-suns-motion.js'),
  'the-rotating-disk': () =>
    import('../data/investigations/depth/the-rotating-disk.js'),
  'cluster-membership': () =>
    import('../data/investigations/depth/cluster-membership.js'),
  'inside-a-star': () =>
    import('../data/investigations/depth/inside-a-star.js'),
  'scaling-the-main-sequence': () =>
    import('../data/investigations/depth/scaling-the-main-sequence.js'),
  'the-limit': () => import('../data/investigations/depth/the-limit.js'),
  'the-expanding-universe': () =>
    import('../data/investigations/depth/the-expanding-universe.js'),
  'standard-candles': () =>
    import('../data/investigations/depth/standard-candles.js'),
  'the-shape-of-expansion': () =>
    import('../data/investigations/depth/the-shape-of-expansion.js'),
  'where-galaxies-live': () =>
    import('../data/investigations/depth/where-galaxies-live.js'),
  'what-a-ccd-records': () =>
    import('../data/investigations/depth/what-a-ccd-records.js'),
  'signal-noise-and-exposure': () =>
    import('../data/investigations/depth/signal-noise-and-exposure.js'),
  'a-variable-star-from-frames': () =>
    import('../data/investigations/depth/a-variable-star-from-frames.js'),
  'the-beat-of-a-star': () =>
    import('../data/investigations/depth/the-beat-of-a-star.js'),
  'leavitts-law': () => import('../data/investigations/depth/leavitts-law.js'),
  'the-first-rung': () =>
    import('../data/investigations/depth/the-first-rung.js'),
  'which-kind-of-variable': () =>
    import('../data/investigations/depth/which-kind-of-variable.js'),
  'bending-light': () =>
    import('../data/investigations/depth/bending-light.js'),
  'einstein-rings-and-arcs': () =>
    import('../data/investigations/depth/einstein-rings-and-arcs.js'),
  'a-lens-passing-by': () =>
    import('../data/investigations/depth/a-lens-passing-by.js'),
  'who-gets-counted': () =>
    import('../data/investigations/depth/who-gets-counted.js'),
  'why-the-bright-ones-win': () =>
    import('../data/investigations/depth/why-the-bright-ones-win.js'),
  'the-completeness-curve': () =>
    import('../data/investigations/depth/the-completeness-curve.js'),
  'what-is-a-measurement': () =>
    import('../data/investigations/depth/what-is-a-measurement.js'),
  'what-does-plus-minus-claim': () =>
    import('../data/investigations/depth/what-does-plus-minus-claim.js'),
  'when-the-method-must-refuse': () =>
    import('../data/investigations/depth/when-the-method-must-refuse.js'),
  'measuring-the-moon': () =>
    import('../data/investigations/depth/measuring-the-moon.js'),
  'how-far-is-that-star': () =>
    import('../data/investigations/depth/how-far-is-that-star.js'),
  'a-binary-stars-orbit': () =>
    import('../data/investigations/depth/a-binary-stars-orbit.js'),
  'weighing-jupiter': () =>
    import('../data/investigations/depth/weighing-jupiter.js'),
  'why-venus-is-hot': () =>
    import('../data/investigations/depth/why-venus-is-hot.js'),
  'two-greenhouse-models': () =>
    import('../data/investigations/depth/two-greenhouse-models.js'),
  'the-turning-sun': () =>
    import('../data/investigations/depth/the-turning-sun.js'),
  'the-suns-power': () =>
    import('../data/investigations/depth/the-suns-power.js'),
  'the-gaps-in-the-belt': () =>
    import('../data/investigations/depth/the-gaps-in-the-belt.js'),
  'how-fast-does-it-spin': () =>
    import('../data/investigations/depth/how-fast-does-it-spin.js'),
  'how-hot-is-the-day-side': () =>
    import('../data/investigations/depth/how-hot-is-the-day-side.js'),
  'phases-and-albedo': () =>
    import('../data/investigations/depth/phases-and-albedo.js'),
  'which-surface-is-older': () =>
    import('../data/investigations/depth/which-surface-is-older.js'),
  'craters-by-size': () =>
    import('../data/investigations/depth/craters-by-size.js'),
  'what-a-crater-diameter-is-worth': () =>
    import('../data/investigations/depth/what-a-crater-diameter-is-worth.js'),
  'why-rings': () => import('../data/investigations/depth/why-rings.js'),
  'tides-that-move-the-moon': () =>
    import('../data/investigations/depth/tides-that-move-the-moon.js'),
  'ios-fire': () => import('../data/investigations/depth/ios-fire.js'),
  'goldilocks-question': () =>
    import('../data/investigations/depth/goldilocks-question.js'),
  'what-a-telescope-resolves': () =>
    import('../data/investigations/depth/what-a-telescope-resolves.js'),
  'why-two-lines-become-one': () =>
    import('../data/investigations/depth/why-two-lines-become-one.js'),
  'why-the-period-is-wrong': () =>
    import('../data/investigations/depth/why-the-period-is-wrong.js'),
  'two-stars-eclipsing': () =>
    import('../data/investigations/depth/two-stars-eclipsing.js'),
  'two-clusters-two-ages': () =>
    import('../data/investigations/depth/two-clusters-two-ages.js'),
  'weighing-the-stars-for-real': () =>
    import('../data/investigations/depth/weighing-the-stars-for-real.js'),
  'how-fast-does-the-star-spin': () =>
    import('../data/investigations/depth/how-fast-does-the-star-spin.js'),
  flares: () => import('../data/investigations/depth/flares.js'),
  'how-old-is-this-white-dwarf': () =>
    import('../data/investigations/depth/how-old-is-this-white-dwarf.js'),
  'the-metallicity-term': () =>
    import('../data/investigations/depth/the-metallicity-term.js'),
  'reading-the-hr-diagram': () =>
    import('../data/investigations/depth/reading-the-hr-diagram.js'),
  'a-stars-life-in-numbers': () =>
    import('../data/investigations/depth/a-stars-life-in-numbers.js'),
  'when-a-star-explodes': () =>
    import('../data/investigations/depth/when-a-star-explodes.js'),
  'populations-i-and-ii': () =>
    import('../data/investigations/depth/populations-i-and-ii.js'),
  'spectra-tell-temperature-and-gravity': () =>
    import('../data/investigations/depth/spectra-tell-temperature-and-gravity.js'),
  'one-planet-every-method': () =>
    import('../data/investigations/depth/one-planet-every-method.js'),
  'what-kinds-of-planets-exist': () =>
    import('../data/investigations/depth/what-kinds-of-planets-exist.js'),
  'the-transit-that-was-a-star': () =>
    import('../data/investigations/depth/the-transit-that-was-a-star.js'),
  'planning-a-transit-campaign': () =>
    import('../data/investigations/depth/planning-a-transit-campaign.js'),
  'from-star-to-remnant': () =>
    import('../data/investigations/depth/from-star-to-remnant.js'),
  'planet-or-not': () =>
    import('../data/investigations/depth/planet-or-not.js'),
  'how-far-and-how-sure': () =>
    import('../data/investigations/depth/how-far-and-how-sure.js'),
  'what-gaia-does-not-see': () =>
    import('../data/investigations/depth/what-gaia-does-not-see.js'),
  'why-we-cannot-see-earth': () =>
    import('../data/investigations/depth/why-we-cannot-see-earth.js'),
  architectures: () => import('../data/investigations/depth/architectures.js'),
  'what-is-it-made-of': () =>
    import('../data/investigations/depth/what-is-it-made-of.js'),
  'how-many-earths': () =>
    import('../data/investigations/depth/how-many-earths.js'),
  'radial-velocity': () =>
    import('../data/investigations/depth/radial-velocity.js'),
  'the-clock-that-drifts': () =>
    import('../data/investigations/depth/the-clock-that-drifts.js'),
  'deep-or-wide': () => import('../data/investigations/depth/deep-or-wide.js'),
  'two-telescopes-one-question': () =>
    import('../data/investigations/depth/two-telescopes-one-question.js'),
  'propose-an-observation': () =>
    import('../data/investigations/depth/propose-an-observation.js'),
  'which-instrument-for-which-question': () =>
    import('../data/investigations/depth/which-instrument-for-which-question.js'),
  'the-sky-background': () =>
    import('../data/investigations/depth/the-sky-background.js'),
  'coordinates-and-time': () =>
    import('../data/investigations/depth/coordinates-and-time.js'),
  'a-night-at-the-telescope': () =>
    import('../data/investigations/depth/a-night-at-the-telescope.js'),
  'from-photons-to-a-number': () =>
    import('../data/investigations/depth/from-photons-to-a-number.js'),
  'design-the-schedule': () =>
    import('../data/investigations/depth/design-the-schedule.js'),
  'the-saturated-star': () =>
    import('../data/investigations/depth/the-saturated-star.js'),
  'counts-to-magnitudes': () =>
    import('../data/investigations/depth/counts-to-magnitudes.js'),
  'what-is-in-this-field': () =>
    import('../data/investigations/depth/what-is-in-this-field.js'),
};

/** Their Spanish, loaded only for a Spanish reader. */
const WORDS = {
  es: {
    'keplers-laws': () =>
      import('../data/investigations/depth/es/keplers-laws.js'),
    'transit-photometry': () =>
      import('../data/investigations/depth/es/transit-photometry.js'),
    'weighing-stars': () =>
      import('../data/investigations/depth/es/weighing-stars.js'),
    'color-and-temperature': () =>
      import('../data/investigations/depth/es/color-and-temperature.js'),
    'lines-and-motion': () =>
      import('../data/investigations/depth/es/lines-and-motion.js'),
    'what-a-spectrum-is-made-of': () =>
      import('../data/investigations/depth/es/what-a-spectrum-is-made-of.js'),
    'the-suns-motion': () =>
      import('../data/investigations/depth/es/the-suns-motion.js'),
    'the-rotating-disk': () =>
      import('../data/investigations/depth/es/the-rotating-disk.js'),
    'cluster-membership': () =>
      import('../data/investigations/depth/es/cluster-membership.js'),
    'inside-a-star': () =>
      import('../data/investigations/depth/es/inside-a-star.js'),
    'scaling-the-main-sequence': () =>
      import('../data/investigations/depth/es/scaling-the-main-sequence.js'),
    'the-limit': () => import('../data/investigations/depth/es/the-limit.js'),
    'the-expanding-universe': () =>
      import('../data/investigations/depth/es/the-expanding-universe.js'),
    'standard-candles': () =>
      import('../data/investigations/depth/es/standard-candles.js'),
    'the-shape-of-expansion': () =>
      import('../data/investigations/depth/es/the-shape-of-expansion.js'),
    'where-galaxies-live': () =>
      import('../data/investigations/depth/es/where-galaxies-live.js'),
    'what-a-ccd-records': () =>
      import('../data/investigations/depth/es/what-a-ccd-records.js'),
    'signal-noise-and-exposure': () =>
      import('../data/investigations/depth/es/signal-noise-and-exposure.js'),
    'a-variable-star-from-frames': () =>
      import('../data/investigations/depth/es/a-variable-star-from-frames.js'),
    'the-beat-of-a-star': () =>
      import('../data/investigations/depth/es/the-beat-of-a-star.js'),
    'leavitts-law': () =>
      import('../data/investigations/depth/es/leavitts-law.js'),
    'the-first-rung': () =>
      import('../data/investigations/depth/es/the-first-rung.js'),
    'which-kind-of-variable': () =>
      import('../data/investigations/depth/es/which-kind-of-variable.js'),
    'bending-light': () =>
      import('../data/investigations/depth/es/bending-light.js'),
    'einstein-rings-and-arcs': () =>
      import('../data/investigations/depth/es/einstein-rings-and-arcs.js'),
    'a-lens-passing-by': () =>
      import('../data/investigations/depth/es/a-lens-passing-by.js'),
    'who-gets-counted': () =>
      import('../data/investigations/depth/es/who-gets-counted.js'),
    'why-the-bright-ones-win': () =>
      import('../data/investigations/depth/es/why-the-bright-ones-win.js'),
    'the-completeness-curve': () =>
      import('../data/investigations/depth/es/the-completeness-curve.js'),
    'what-is-a-measurement': () =>
      import('../data/investigations/depth/es/what-is-a-measurement.js'),
    'what-does-plus-minus-claim': () =>
      import('../data/investigations/depth/es/what-does-plus-minus-claim.js'),
    'when-the-method-must-refuse': () =>
      import('../data/investigations/depth/es/when-the-method-must-refuse.js'),
    'measuring-the-moon': () =>
      import('../data/investigations/depth/es/measuring-the-moon.js'),
    'how-far-is-that-star': () =>
      import('../data/investigations/depth/es/how-far-is-that-star.js'),
    'a-binary-stars-orbit': () =>
      import('../data/investigations/depth/es/a-binary-stars-orbit.js'),
    'weighing-jupiter': () =>
      import('../data/investigations/depth/es/weighing-jupiter.js'),
    'why-venus-is-hot': () =>
      import('../data/investigations/depth/es/why-venus-is-hot.js'),
    'two-greenhouse-models': () =>
      import('../data/investigations/depth/es/two-greenhouse-models.js'),
    'the-turning-sun': () =>
      import('../data/investigations/depth/es/the-turning-sun.js'),
    'the-suns-power': () =>
      import('../data/investigations/depth/es/the-suns-power.js'),
    'the-gaps-in-the-belt': () =>
      import('../data/investigations/depth/es/the-gaps-in-the-belt.js'),
    'how-fast-does-it-spin': () =>
      import('../data/investigations/depth/es/how-fast-does-it-spin.js'),
    'how-hot-is-the-day-side': () =>
      import('../data/investigations/depth/es/how-hot-is-the-day-side.js'),
    'phases-and-albedo': () =>
      import('../data/investigations/depth/es/phases-and-albedo.js'),
    'which-surface-is-older': () =>
      import('../data/investigations/depth/es/which-surface-is-older.js'),
    'craters-by-size': () =>
      import('../data/investigations/depth/es/craters-by-size.js'),
    'what-a-crater-diameter-is-worth': () =>
      import('../data/investigations/depth/es/what-a-crater-diameter-is-worth.js'),
    'why-rings': () => import('../data/investigations/depth/es/why-rings.js'),
    'tides-that-move-the-moon': () =>
      import('../data/investigations/depth/es/tides-that-move-the-moon.js'),
    'ios-fire': () => import('../data/investigations/depth/es/ios-fire.js'),
    'goldilocks-question': () =>
      import('../data/investigations/depth/es/goldilocks-question.js'),
    'what-a-telescope-resolves': () =>
      import('../data/investigations/depth/es/what-a-telescope-resolves.js'),
    'why-two-lines-become-one': () =>
      import('../data/investigations/depth/es/why-two-lines-become-one.js'),
    'why-the-period-is-wrong': () =>
      import('../data/investigations/depth/es/why-the-period-is-wrong.js'),
    'two-stars-eclipsing': () =>
      import('../data/investigations/depth/es/two-stars-eclipsing.js'),
    'two-clusters-two-ages': () =>
      import('../data/investigations/depth/es/two-clusters-two-ages.js'),
    'weighing-the-stars-for-real': () =>
      import('../data/investigations/depth/es/weighing-the-stars-for-real.js'),
    'how-fast-does-the-star-spin': () =>
      import('../data/investigations/depth/es/how-fast-does-the-star-spin.js'),
    flares: () => import('../data/investigations/depth/es/flares.js'),
    'how-old-is-this-white-dwarf': () =>
      import('../data/investigations/depth/es/how-old-is-this-white-dwarf.js'),
    'the-metallicity-term': () =>
      import('../data/investigations/depth/es/the-metallicity-term.js'),
    'reading-the-hr-diagram': () =>
      import('../data/investigations/depth/es/reading-the-hr-diagram.js'),
    'a-stars-life-in-numbers': () =>
      import('../data/investigations/depth/es/a-stars-life-in-numbers.js'),
    'when-a-star-explodes': () =>
      import('../data/investigations/depth/es/when-a-star-explodes.js'),
    'populations-i-and-ii': () =>
      import('../data/investigations/depth/es/populations-i-and-ii.js'),
    'spectra-tell-temperature-and-gravity': () =>
      import('../data/investigations/depth/es/spectra-tell-temperature-and-gravity.js'),
    'one-planet-every-method': () =>
      import('../data/investigations/depth/es/one-planet-every-method.js'),
    'what-kinds-of-planets-exist': () =>
      import('../data/investigations/depth/es/what-kinds-of-planets-exist.js'),
    'the-transit-that-was-a-star': () =>
      import('../data/investigations/depth/es/the-transit-that-was-a-star.js'),
    'planning-a-transit-campaign': () =>
      import('../data/investigations/depth/es/planning-a-transit-campaign.js'),
    'from-star-to-remnant': () =>
      import('../data/investigations/depth/es/from-star-to-remnant.js'),
    'planet-or-not': () =>
      import('../data/investigations/depth/es/planet-or-not.js'),
    'how-far-and-how-sure': () =>
      import('../data/investigations/depth/es/how-far-and-how-sure.js'),
    'what-gaia-does-not-see': () =>
      import('../data/investigations/depth/es/what-gaia-does-not-see.js'),
    'why-we-cannot-see-earth': () =>
      import('../data/investigations/depth/es/why-we-cannot-see-earth.js'),
    architectures: () =>
      import('../data/investigations/depth/es/architectures.js'),
    'what-is-it-made-of': () =>
      import('../data/investigations/depth/es/what-is-it-made-of.js'),
    'how-many-earths': () =>
      import('../data/investigations/depth/es/how-many-earths.js'),
    'radial-velocity': () =>
      import('../data/investigations/depth/es/radial-velocity.js'),
    'the-clock-that-drifts': () =>
      import('../data/investigations/depth/es/the-clock-that-drifts.js'),
    'deep-or-wide': () =>
      import('../data/investigations/depth/es/deep-or-wide.js'),
    'two-telescopes-one-question': () =>
      import('../data/investigations/depth/es/two-telescopes-one-question.js'),
    'propose-an-observation': () =>
      import('../data/investigations/depth/es/propose-an-observation.js'),
    'which-instrument-for-which-question': () =>
      import('../data/investigations/depth/es/which-instrument-for-which-question.js'),
    'the-sky-background': () =>
      import('../data/investigations/depth/es/the-sky-background.js'),
    'coordinates-and-time': () =>
      import('../data/investigations/depth/es/coordinates-and-time.js'),
    'a-night-at-the-telescope': () =>
      import('../data/investigations/depth/es/a-night-at-the-telescope.js'),
    'from-photons-to-a-number': () =>
      import('../data/investigations/depth/es/from-photons-to-a-number.js'),
    'design-the-schedule': () =>
      import('../data/investigations/depth/es/design-the-schedule.js'),
    'the-saturated-star': () =>
      import('../data/investigations/depth/es/the-saturated-star.js'),
    'counts-to-magnitudes': () =>
      import('../data/investigations/depth/es/counts-to-magnitudes.js'),
    'what-is-in-this-field': () =>
      import('../data/investigations/depth/es/what-is-in-this-field.js'),
    'missing-mass': () =>
      import('../data/investigations/depth/es/missing-mass.js'),
    'the-turning-sky': () =>
      import('../data/investigations/depth/es/the-turning-sky.js'),
    'the-sun-through-the-year': () =>
      import('../data/investigations/depth/es/the-sun-through-the-year.js'),
    'phases-and-eclipses': () =>
      import('../data/investigations/depth/es/phases-and-eclipses.js'),
    'wanderers-on-the-sky': () =>
      import('../data/investigations/depth/es/wanderers-on-the-sky.js'),
    'plan-a-night': () =>
      import('../data/investigations/depth/es/plan-a-night.js'),
  },
};

/** What each course level reads at (js/settingsSchema.js COURSE_LEVELS; a test holds them equal). */
const LEVEL_DEPTH = { majors: 'quantitative', advanced: 'advanced' };

/** The lessons that have deeper steps. */
export const DEPTH_LESSONS = Object.freeze(Object.keys(EXTENSIONS));

/**
 * The deeper steps of a lesson, in a language, ready to lay in.
 * @param {string} id - Lesson id
 * @param {string} [locale] - 'en' or another language the lesson has
 * @returns {Promise<Array<object>>} Steps, each with `after` and `depth`
 */
export async function loadDepthSteps(id, locale = 'en') {
  const load = EXTENSIONS[id];
  if (!load) return [];
  const base = (await load()).default;
  const words = WORDS[locale]?.[id]
    ? await WORDS[locale][id]().then(
        m => m.default,
        () => null
      )
    : null;
  return (words ? overlay(base, words) : base).steps;
}

/**
 * A lesson's deeper steps as written, with their Spanish shadow, for the
 * checks that judge them.
 * @param {string} id - Lesson id
 * @returns {Promise<{steps: object[], words: ?object}>}
 */
export async function depthSources(id) {
  const steps = (await EXTENSIONS[id]()).default.steps;
  const words = await WORDS.es[id]?.().then(m => m.default);
  return { steps, words: words ?? null };
}

/**
 * The lesson with its deeper steps, loaded and laid in.
 * @param {object} lesson - From loadInvestigation()
 * @param {string} [locale] - The language the lesson was loaded in
 * @returns {Promise<object>} The same lesson when it has nothing deeper
 */
export async function withDepth(lesson, locale = 'en') {
  if (!lesson?.depths || lesson.depthLaid || !EXTENSIONS[lesson.id])
    return lesson;
  return layDepth(lesson, await loadDepthSteps(lesson.id, locale));
}

let words = null;
/** The labels this module speaks, fetched the first time one is needed. */
export const messages = () =>
  (words ??= Promise.all([
    import('../i18n/en.depth.js'),
    import('../i18n/es.depth.js'),
  ]).then(([en, es]) => {
    registerMessages('en', en.EN_DEPTH);
    registerMessages('es', es.ES_DEPTH);
  }));

/**
 * Which depth a lesson opens at, and why. The order is DEPTH.md's: an
 * assignment (the instructor's), a link, the student's saved choice, the
 * course level. A depth the lesson does not offer is passed over for the next
 * source; an assignment that names none reads core. A link that differs from a
 * saved choice is read, but `choice`, what the progress record keeps, stays
 * the saved one: the link does not overwrite it until the student switches.
 * @param {object} o
 * @param {string[]} [o.offered] - The depths the lesson offers
 * @param {?{d?: string}} [o.assignment] - The assignment being opened
 * @param {?string} [o.link] - The depth the link names
 * @param {?string} [o.saved] - The saved choice (`depth` of the record)
 * @param {?string} [o.level] - The course level
 * @returns {{depth: string, source: string, choice: ?string, kept: ?string}}
 *   `source` is assignment, link, choice, level or core; `kept` the saved
 *   choice a different link opened over, else null
 */
export function resolveDepth({ offered = [], assignment, link, saved, level }) {
  const use = d => (offered.includes(d) ? d : null);
  const choice = DEPTHS.includes(saved) ? saved : null;
  if (assignment)
    return {
      depth: use(assignment.d) ?? 'core',
      source: 'assignment',
      choice: null,
      kept: null,
    };
  const linked = use(link);
  if (linked) {
    const kept = use(choice) && choice !== linked ? choice : null;
    return { depth: linked, source: 'link', choice: kept ?? linked, kept };
  }
  const own = use(choice);
  const lv = use(LEVEL_DEPTH[level]);
  return {
    depth: own ?? (choice ? null : lv) ?? 'core',
    source: own ? 'choice' : !choice && lv ? 'level' : 'core',
    choice,
    kept: null,
  };
}

/**
 * The depth a lesson opens at and the lesson to open, for the engine
 * (resolveDepth holds the precedence). Deeper steps are laid in when read at,
 * or ever read at, anything deeper than core, so their answers are read.
 * @param {object} lesson - The lesson from the registry
 * @param {object} mem - Saved progress (`depth`, `deepest`) and `level`
 * @param {?object} assignment - The assignment being opened, if any
 * @param {string} locale - The language the lesson is in
 * @param {object} [ui] - `link` (the depth a link named), `note` (the element
 *   that says where the depth came from) and `change(by)` (the engine's switch)
 * @returns {Promise<{inv: object, depth: string, depthChoice: ?string, deepest: string, depthName: string, said: string}>}
 */
export async function openDepth(lesson, mem, assignment, locale, ui = {}) {
  const r = resolveDepth({
    offered: lesson.depths || [],
    assignment,
    link: ui.link,
    saved: mem?.depth,
    level: mem?.level,
  });
  const { depth } = r;
  const deepest = [depth, mem?.deepest].reduce(
    (a, b) => (DEPTHS.indexOf(b) > DEPTHS.indexOf(a) ? b : a),
    'core'
  );
  const [inv] = await Promise.all([
    DEPTHS.indexOf(deepest) > 0 ? withDepth(lesson, locale) : lesson,
    messages(),
  ]);
  // Said once, in the panel and to a screen reader, never on every render.
  const said = noteDepth(ui.note, r, assignment, ui.change);
  return {
    inv,
    depth,
    depthChoice: assignment ? null : r.choice,
    deepest,
    depthName: t(`inv.depth.${depth}`),
    said,
  };
}

/**
 * Where the depth a student is reading came from, when it is not their own:
 * a link that opened a different one (with the one action that keeps theirs)
 * or the instructor's. Writes into `el` (the note's paragraph and button).
 * @returns {string} The sentence, for the announcement
 */
function noteDepth(el, r, assignment, change) {
  const adj = d => t(`inv.depth.adj.${d}`);
  const text = r.kept
    ? t('inv.depth.link', { depth: adj(r.depth), saved: adj(r.kept) })
    : assignment?.d
      ? t('inv.depth.set', { depth: adj(r.depth) })
      : '';
  if (!el) return text;
  const [p, keep] = el.querySelectorAll('p, button');
  el.hidden = !text;
  p.textContent = text;
  keep.hidden = !r.kept;
  if (r.kept) {
    keep.textContent = t('inv.depth.keep');
    keep.setAttribute(
      'aria-label',
      t('inv.depth.keepAll', { saved: adj(r.kept) })
    );
    keep.onclick = () =>
      change(DEPTHS.indexOf(r.kept) - DEPTHS.indexOf(r.depth));
  }
  return text;
}

/**
 * Move one level deeper or shallower. Going deeper lays the deeper steps in
 * the first time and moves on to the deeper step that follows this one;
 * going shallower leaves a deeper step for the nearest one still shown.
 * Nothing is cleared: answers are keyed by step id.
 * @param {object} s - `active`, `depth`, `deepest`, `stepIndex`, `by` (1 or
 *   -1) and `locale`
 * @returns {Promise<?object>} The new `lesson`, `depth`, `deepest`, `at`,
 *   `depthName` and the sentence to announce; null when there is no such level
 */
export async function change({
  active,
  depth,
  deepest,
  stepIndex,
  by,
  locale,
}) {
  const to = DEPTHS[DEPTHS.indexOf(depth) + by];
  if (!to || !active.depths.includes(to)) return null;
  const here = active.steps[stepIndex]?.sid;
  const [lesson] = await Promise.all([
    by > 0 ? withDepth(active, locale) : active,
    messages(),
  ]);
  const i = Math.max(
    0,
    lesson.steps.findIndex(x => x.sid === here)
  );
  let at = i;
  if (by > 0) {
    const after = lesson.steps[i + 1];
    if (after && !inDepth(after, depth)) at = i + 1;
  } else {
    while (at > 0 && !inDepth(lesson.steps[at], to)) at--;
  }
  const name = t(`inv.depth.${to}`);
  return {
    lesson,
    depth: to,
    deepest: DEPTHS.indexOf(to) > DEPTHS.indexOf(deepest) ? to : deepest,
    at,
    depthName: name,
    said: t('inv.depth.changed', { depth: t(`inv.depth.adj.${to}`) }),
  };
}
