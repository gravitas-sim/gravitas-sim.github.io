// =============================================================================
// Laying deeper steps into a lesson: the pure half of ./depth.js
// -----------------------------------------------------------------------------
// No imports, so the answer-key build, the author checks and the tests can lay
// a lesson out synchronously. See DEPTH.md.
// =============================================================================

// Duplicates alignShadow (data/investigations/i18n.js) on purpose: importing it
// would split a shared chunk, a request on every lesson route. A test holds
// the two equal.
const alignShadow = (base, over) =>
  Array.isArray(over)
    ? base.map((_, i) => over[i])
    : over &&
        typeof over === 'object' &&
        base.length &&
        base.every(s => typeof s?.sid === 'string')
      ? base.map(({ sid }) =>
          Object.hasOwn(over, sid) ? over[sid] : undefined
        )
      : null;

// Duplicates ./progressSchema.js's names on purpose: a shared module would be a
// request on every lesson route (tests/progressiveDepth.test.js holds them equal).
export const DEPTHS = Object.freeze(['core', 'quantitative', 'advanced']);
export const inDepth = (step, depth = 'core') =>
  Math.max(0, DEPTHS.indexOf(step?.depth)) <=
  Math.max(0, DEPTHS.indexOf(depth));

/** The Spanish laid over a deeper step list: strings only, steps by sid, never the machinery. */
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
  if (Array.isArray(base)) {
    const aligned = alignShadow(base, over);
    return aligned ? base.map((b, i) => overlay(b, aligned[i])) : base;
  }
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
 * A lesson with its deeper steps laid in, each right after the step it names
 * (`after`), in the order given; core steps keep their order and ids. Pure. A
 * step whose anchor is missing goes before the closing step (author:check
 * refuses it).
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
 * A lesson at one depth: only the steps at or above none deeper (what the
 * numbering, the answer key and the report follow).
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
 * The depths a lesson has steps at, shallowest first (always with core).
 * @param {object} lesson - A lesson with its deeper steps laid in
 * @returns {string[]} A subset of DEPTHS
 */
export const depthsOf = lesson =>
  DEPTHS.filter(
    d => d === 'core' || lesson.steps.some(s => (s.depth || 'core') === d)
  );

/**
 * Steps a reader sees at each depth.
 * @param {object} lesson - A lesson with its deeper steps laid in
 * @returns {Record<string, number>} depth -> step count
 */
export const stepCounts = lesson =>
  Object.fromEntries(
    depthsOf(lesson).map(d => [d, lessonAt(lesson, d).steps.length])
  );
