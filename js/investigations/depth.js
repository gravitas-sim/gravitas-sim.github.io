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
import { mergeTranslation } from '../data/investigations/i18n.js';

export { DEPTHS, inDepth };

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
 * A lesson with its deeper steps laid in. Each goes right after the step it
 * names (`after`), in the order given, so the core steps keep their order and
 * their ids; nothing is renumbered, since a step is known by its id.
 *
 * Pure: the lesson is not modified. A step whose anchor is not there is put
 * last before the closing step, which author:check refuses anyway.
 *
 * @param {object} lesson - The lesson as the registry returns it
 * @param {Array<object>} steps - From loadDepthSteps()
 * @returns {object} The lesson with every depth's steps in
 */
export function layDepth(lesson, steps) {
  const out = lesson.steps.slice();
  const placed = new Set();
  for (const step of steps) {
    let at = out.findIndex(s => s.sid === step.after);
    if (at < 0) at = out.length - 2;
    // After the anchor and after anything already laid there.
    while (out[at + 1] && placed.has(out[at + 1].sid)) at++;
    out.splice(at + 1, 0, step);
    placed.add(step.sid);
  }
  return { ...lesson, steps: out, depthLaid: true };
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

/**
 * What a lesson is at one depth: its steps at or above none deeper. The
 * numbering a student sees, the answer key and the report all follow it.
 * @param {object} lesson - A lesson with its deeper steps laid in
 * @param {string} depth - A depth
 * @returns {object} The lesson, with `depth` and only the steps that belong
 */
export const lessonAt = (lesson, depth) => ({
  ...lesson,
  depth,
  steps: lesson.steps.filter(s => inDepth(s, depth)),
});

/**
 * Which depths a lesson really has steps at, shallowest first.
 * @param {object} lesson - A lesson with its deeper steps laid in
 * @returns {string[]} A subset of DEPTHS, always starting with core
 */
export const depthsOf = lesson =>
  DEPTHS.filter(
    d => d === 'core' || lesson.steps.some(s => (s.depth || 'core') === d)
  );

/**
 * How many steps a reader sees at each depth.
 * @param {object} lesson - A lesson with its deeper steps laid in
 * @returns {Record<string, number>} depth -> step count
 */
export const stepCounts = lesson =>
  Object.fromEntries(
    depthsOf(lesson).map(d => [d, lessonAt(lesson, d).steps.length])
  );
