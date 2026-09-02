// =============================================================================
// Translating a lesson
// -----------------------------------------------------------------------------
// A lesson is a mixture of prose and machinery: a step carries a title and a
// body, and it also carries a probe closure, a widget id, a scenario name and a
// numeric answer with a tolerance. Only the first kind is translatable, and the
// second kind must come through a translation completely untouched - a lesson
// whose `setup.scenario` had been translated would fail to load a scenario, and
// one whose probe had been replaced by a string would fail to draw.
//
// So a translation is a *shadow* of a lesson rather than a copy of one: an
// object with the same shape, carrying only the fields that are words. This one
// function lays it over the English:
//
//   js/data/investigations/keplers-laws.js       the lesson, in English
//   js/data/investigations/es/keplers-laws.js    the Spanish words for it
//
// Everything absent from the shadow keeps its English, which means a
// translation can be incomplete and still be worth shipping: the lesson runs,
// and the parts nobody has reached yet are simply still in English rather than
// missing. It also means the shadow never has to be updated when the machinery
// changes - only when the words do.
//
// Arrays line up by index, because that is what an options list or a checklist
// is: the third Spanish option is the translation of the third English one, and
// a shadow whose array is shorter translates a prefix.
// =============================================================================

/**
 * Lay a translation over a lesson.
 *
 * Pure: neither argument is modified, and the result shares every untranslated
 * value - including every function - with the original by reference.
 *
 * @param {*} base - The English lesson, or any part of it
 * @param {*} overlay - The translation, or the matching part of it
 * @returns {*} The lesson in the translated language
 */
export function mergeTranslation(base, overlay) {
  // Nothing said about this branch: the English stands.
  if (overlay === undefined || overlay === null) return base;

  // A function is machinery and is never translated. Guarded explicitly rather
  // than left to the object branch below, because typeof null and typeof
  // function both need care and a silently replaced probe is a broken lesson.
  if (typeof base === 'function') return base;

  if (typeof base === 'string') {
    return typeof overlay === 'string' ? overlay : base;
  }

  if (Array.isArray(base)) {
    if (!Array.isArray(overlay)) return base;
    // Index by index, and never longer than the English: a shadow with extra
    // entries would add steps or options that the lesson's own logic - answer
    // indices, field ids, graded counts - knows nothing about.
    return base.map((item, i) => mergeTranslation(item, overlay[i]));
  }

  if (base && typeof base === 'object') {
    if (Array.isArray(overlay) || typeof overlay !== 'object') return base;
    const out = { ...base };
    for (const key of Object.keys(overlay)) {
      // Only keys the lesson already has. A shadow cannot introduce a field,
      // which is what keeps a typo in a translation from becoming a property
      // the engine then reads.
      if (!Object.hasOwn(base, key)) continue;
      out[key] = mergeTranslation(base[key], overlay[key]);
    }
    return out;
  }

  // Numbers, booleans: answers and tolerances. Never translated.
  return base;
}

/**
 * Which of a lesson's words a translation has supplied, and which it has not.
 *
 * Used by the audit and by the tests. Counts strings, since a string is the
 * unit a translator works in.
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
      b.forEach((item, i) =>
        walk(item, Array.isArray(o) ? o[i] : undefined, `${path}.${i}`, key)
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
 * Keys whose string values are machinery rather than words.
 *
 * A scenario name is looked up in the scenario registry; a seed reproduces a
 * world; a widget id selects a component; a field id keys the student's saved
 * answer; a path points at an image. Translating any of them breaks the lesson,
 * so they are excluded from the count of what there is to translate - and the
 * tests assert that no translation supplies one.
 */
export const STRUCTURAL = new Set([
  'id',
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
]);
