// =============================================================================
// Laying deeper steps into a lesson: the pure half of ./depth.js
// -----------------------------------------------------------------------------
// No imports but the depth names, so the answer-key build, the author checks and
// the tests can lay a lesson out synchronously. See DEPTH.md.
// =============================================================================

// Duplicates the two names of ./progressSchema.js on purpose: a module shared
// between the lesson panel and this lazy one is its own file, and a request on
// every lesson route (tests/progressiveDepth.test.js holds them equal).
export const DEPTHS = Object.freeze(['core', 'quantitative', 'advanced']);
export const inDepth = (step, depth = 'core') =>
  Math.max(0, DEPTHS.indexOf(step?.depth)) <=
  Math.max(0, DEPTHS.indexOf(depth));

/** The Spanish laid over a deeper step list: strings only, by index, never the machinery. */
const KEEP = new Set([
  'sid',
  'after',
  'depth',
  'restates',
  'unit',
  'id',
  'kind',
  'type',
  'at',
]);
export function overlay(base, over) {
  if (over === undefined || over === null) return base;
  if (typeof base === 'string') return typeof over === 'string' ? over : base;
  if (Array.isArray(base))
    return Array.isArray(over) ? base.map((b, i) => overlay(b, over[i])) : base;
  if (base && typeof base === 'object' && typeof over === 'object') {
    const out = { ...base };
    for (const k of Object.keys(over))
      if (Object.hasOwn(base, k) && !KEEP.has(k))
        out[k] = overlay(base[k], over[k]);
    return out;
  }
  return base;
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
