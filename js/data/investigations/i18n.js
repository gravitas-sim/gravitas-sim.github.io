// =============================================================================
// Translating a lesson
// -----------------------------------------------------------------------------
// A lesson mixes prose with machinery (probes, widget ids, scenario names,
// numeric answers), and only the prose is translatable. So a translation is a
// *shadow*: an object of the same shape carrying only the words, laid over the
// English by one function (es/keplers-laws.js over keplers-laws.js). Whatever
// it omits keeps its English, so a translation may be incomplete and never
// changes when the machinery does.
//
// Arrays line up by index (the third Spanish option translates the third
// English one), except a lesson's steps: the shadow's `steps` is an object keyed
// by each step's `sid`, so a Spanish step belongs to its English step wherever
// either stands. An inserted, moved or removed step moves no other Spanish; an
// entry whose sid the lesson lacks is dropped (the authoring check says so). A
// shadow that still lists `steps` is read by index: a pack made before steps
// were keyed has no sids.
// =============================================================================

/** A list of steps: every entry carries a sid. Other arrays stay positional. */
export const isStepList = base =>
  Array.isArray(base) &&
  base.length > 0 &&
  base.every(item => typeof item?.sid === 'string');

/**
 * The shadow's entries laid against an English array, one per element (or
 * undefined): by sid for a list of steps, by index otherwise. The one rule for
 * which Spanish step is which, shared by the merge, the coverage count, the
 * checks and the audit. Null when the shadow has nothing usable for it.
 *
 * @param {Array} base - An array of the English lesson
 * @param {*} overlay - The shadow's value: an object keyed by sid, or an array
 * @returns {Array|null} Entries aligned with `base`
 */
export function alignShadow(base, overlay) {
  if (Array.isArray(overlay)) return base.map((_, i) => overlay[i]);
  if (!isStepList(base) || typeof overlay !== 'object' || !overlay) return null;
  return base.map(({ sid }) =>
    Object.hasOwn(overlay, sid) ? overlay[sid] : undefined
  );
}

/**
 * A translation's steps are an object keyed by sid: one entry for each step of
 * the lesson (core or deeper) and none for a step it does not have.
 * @param {Array<{sid: string}>} steps - The English steps
 * @param {*} shadow - The translation's `steps`
 * @param {(level: string, message: string, index: ?number) => void} report - Findings
 */
export function checkShadowSteps(steps, shadow, report) {
  if (!shadow || typeof shadow !== 'object' || Array.isArray(shadow))
    return report('error', 'steps must be an object keyed by step sid', null);
  for (const key of Object.keys(shadow))
    if (!steps.some(s => s.sid === key))
      report('error', `steps.${key} names no step of the lesson`, null);
  steps.forEach((s, i) => {
    if (!Object.hasOwn(shadow, s.sid))
      report('error', `step "${s.sid}" has no Spanish step`, i);
  });
}

/**
 * Lay a translation over a lesson. Pure: the result shares every untranslated
 * value, functions included, with the original by reference.
 *
 * @param {*} base - The English lesson, or any part of it
 * @param {*} overlay - The translation, or the matching part of it
 * @returns {*} The lesson in the translated language
 */
export function mergeTranslation(base, overlay) {
  // Nothing said about this branch: the English stands.
  if (overlay === undefined || overlay === null) return base;

  // A function is machinery, never translated: a replaced probe is a broken lesson.
  if (typeof base === 'function') return base;

  if (typeof base === 'string') {
    return typeof overlay === 'string' ? overlay : base;
  }

  if (Array.isArray(base)) {
    // Never longer than the English: extra entries would add steps or options
    // the lesson's logic (answer indices, field ids, graded counts) lacks.
    const aligned = alignShadow(base, overlay);
    if (!aligned) return base;
    return base.map((item, i) => mergeTranslation(item, aligned[i]));
  }

  if (base && typeof base === 'object') {
    if (Array.isArray(overlay) || typeof overlay !== 'object') return base;
    const out = { ...base };
    for (const key of Object.keys(overlay)) {
      // Only keys the lesson has, so a typo cannot become a property the engine
      // reads, and never machinery: a translated `role` or `track` breaks the
      // lesson's bindings silently, both sides being strings.
      if (!Object.hasOwn(base, key) || STRUCTURAL.has(key)) continue;
      out[key] = mergeTranslation(base[key], overlay[key]);
    }
    return out;
  }

  // Numbers, booleans: answers and tolerances. Never translated.
  return base;
}

/**
 * Which of a lesson's words a translation has supplied (counted in strings,
 * for the audit and the tests).
 *
 * @param {*} base - The English lesson
 * @param {*} overlay - The translation
 * @param {Set<string>} [skip] - Keys whose strings are machinery, not words
 * @returns {{translated: number, total: number, missing: Array<string>}} Tally
 */
export function translationCoverage(base, overlay, skip = STRUCTURAL) {
  const missing = [];
  let translated = 0;
  let total = 0;

  const walk = (b, o, path, key) => {
    if (typeof b === 'function') return;
    if (typeof b === 'string') {
      if (skip.has(key)) return;
      total++;
      if (typeof o === 'string' && o.length) translated++;
      else missing.push(path);
      return;
    }
    if (Array.isArray(b)) {
      const aligned = alignShadow(b, o);
      b.forEach((item, i) =>
        walk(item, aligned ? aligned[i] : undefined, `${path}.${i}`, key)
      );
      return;
    }
    if (b && typeof b === 'object') {
      for (const k of Object.keys(b)) {
        const child = o && typeof o === 'object' ? o[k] : undefined;
        walk(b[k], child, path ? `${path}.${k}` : k, k);
      }
    }
  };

  walk(base, overlay, '', '');
  return { translated, total, missing };
}

/**
 * Keys whose string values are machinery rather than words: a scenario name is
 * looked up, a seed reproduces a world, a widget or field id selects a
 * component or keys a saved answer, a path points at an image. Translating one
 * breaks the lesson, so they are not counted as words to translate, and the
 * tests assert that no translation supplies one.
 */
export const STRUCTURAL = new Set([
  'id',
  // A step's identity, never translated: progress is keyed by it.
  'sid',
  // The sid where a held prediction is marked, and a remediation step's
  // condition (the graded sid it follows; wrong or right).
  'reveal',
  'after',
  'depth',
  'depths',
  'restates',
  'when',
  'type',
  'kind',
  'scenario',
  'seed',
  'thumbnail',
  'src',
  'source',
  'licenseUrl',
  'license',
  'author',
  'session',
  'axis',
  'hide',
  'rows',
  'importGroups',
  'widget',
  // Where a lesson's stars stand and what the instrument does with them: each
  // an identifier the lesson's logic reads (`role` is what a binding resolves,
  // `track` and `at` a place on a MIST track). `name` is deliberately NOT here:
  // a star's name is read out on the canvas and the comparison card.
  'role',
  'track',
  'at',
  'pace',
  'mode',
  'bind',
  // Identifiers, not words: the phase of a track a step parks on, the view a
  // widget opens, the kinds a stage stands, the source mode, the audio control.
  'phase',
  'view',
  'kinds',
  'mode',
  'listen',
  // Which preset a step opens the instrument on, by id.
  'preset',
  'pinStaged',
  'tags',
  // Symbols (K, R(sun), L(sun), M(sun), the multiplication sign), the same in
  // every language: translated, a units bug.
  'unit',
]);
