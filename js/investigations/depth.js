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

import { DEPTHS, inDepth } from './progressSchema.js';
import { depthsOf, layDepth, lessonAt, stepCounts } from './depthPure.js';
import { mergeTranslation } from '../data/investigations/i18n.js';
import { COURSE_LEVELS } from '../settingsSchema.js';
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
    'missing-mass': () =>
      import('../data/investigations/depth/es/missing-mass.js'),
  },
};

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
  return (words ? mergeTranslation(base, words) : base).steps;
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
 * The depth a lesson opens at and the lesson to open, for the engine.
 * Precedence: the instructor's (assignment), the student's own choice, the
 * course level's. Deeper steps are laid in when read at, or ever read at,
 * anything deeper than core, so their answers are read.
 * @param {object} lesson - The lesson from the registry
 * @param {object} mem - Saved progress (`depth`, `deepest`) and `level`
 * @param {?object} assignment - The assignment being opened, if any
 * @param {string} locale - The language the lesson is in
 * @returns {Promise<{inv: object, depth: string, depthChoice: ?string, deepest: string, depthName: string}>}
 */
export async function openDepth(lesson, mem, assignment, locale) {
  const offered = lesson.depths || [];
  const choice = DEPTHS.includes(mem?.depth) ? mem.depth : null;
  const want = assignment
    ? assignment.d
    : (choice ?? COURSE_LEVELS[mem?.level]?.depth);
  const depth = offered.includes(want) ? want : 'core';
  const deepest = [depth, mem?.deepest].reduce(
    (a, b) => (DEPTHS.indexOf(b) > DEPTHS.indexOf(a) ? b : a),
    'core'
  );
  const [inv] = await Promise.all([
    DEPTHS.indexOf(deepest) > 0 ? withDepth(lesson, locale) : lesson,
    messages(),
  ]);
  return {
    inv,
    depth,
    depthChoice: assignment ? null : choice,
    deepest,
    depthName:
      depth === 'core' && !assignment
        ? ''
        : t('inv.depth.state', { depth: t(`inv.depth.${depth}`) }),
  };
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
    depthName: t('inv.depth.state', { depth: name }),
    said: t('inv.depth.changed', { depth: name }),
  };
}
