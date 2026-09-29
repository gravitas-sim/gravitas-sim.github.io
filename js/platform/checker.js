// The checker every declarative format shares: the structural guard and the
// text rules. Its own module, so checking one format downloads no other.

const MAX_TEXT = 4000;
const MAX_DEPTH = 12;
const MAX_NODES = 40000;
export const isObject = v =>
  v !== null && typeof v === 'object' && !Array.isArray(v);
/** Nothing a pack names may be a way into an object's prototype. */
const UNSAFE_KEY = new Set(['__proto__', 'constructor', 'prototype']);
/** The four tags lesson prose may carry (js/lessonMarkup.js prose()). */
const PROSE_TAG = /<\/?(strong|em|sub|sup)>/g;
/** Anything else that looks like markup, a script URL or a link. */
const UNSAFE = /<[a-z!/?]|javascript:|data:|vbscript:|https?:\/\/|www\./i;

/**
 * The rules both formats share: a problem list, the structural guard that
 * runs before anything reads a field, and the text rules.
 *
 * @param {unknown} input - The parsed file, walked once by guard()
 * @param {object} api - What Gravitas has
 * @param {string[]} api.locales - The interface's locales
 * @param {string[]} api.entities - The entity names lesson prose may use
 */
export function makeChecker(input, api) {
  const out = [];
  const need = (ok, path, code, message, vars = {}) =>
    ok || out.push({ path, code, vars, message });
  const locales =
    isObject(input) && Array.isArray(input.locales)
      ? input.locales.filter(l => typeof l === 'string')
      : ['en'];
  const entities = new Set(api.entities || []);

  /**
   * Refuse, before any rule reads it, what a hand-edited or hostile file could
   * carry into the page: another prototype, a cycle-free but enormous tree, a
   * value JSON cannot hold. Returns whether it is safe to go on.
   */
  const guard = () => {
    let nodes = 0;
    let ok = true;
    // The first thing refused ends the walk: a hostile file is refused for
    // one reason, not buried under the thousands it would earn after it.
    const fail = (path, code, message, vars) => {
      need(false, path, code, message, vars);
      ok = false;
    };
    const walk = (v, path, depth) => {
      if (!ok) return;
      if (++nodes > MAX_NODES)
        return fail('', 'tooLarge', 'is larger than any pack needs');
      if (depth > MAX_DEPTH)
        return fail(path, 'tooDeep', 'is nested deeper than any pack is');
      if (v === null || typeof v === 'boolean') return;
      if (typeof v === 'number') {
        if (!Number.isFinite(v)) fail(path, 'number', 'a number');
        return;
      }
      if (typeof v === 'string') {
        if (v.length > MAX_TEXT)
          fail(path, 'textLong', `longer than ${MAX_TEXT} characters`, {
            max: MAX_TEXT,
          });
        return;
      }
      if (Array.isArray(v)) {
        for (let i = 0; i < v.length && ok; i++)
          walk(v[i], `${path}[${i}]`, depth + 1);
        return;
      }
      if (
        typeof v === 'object' &&
        Object.getPrototypeOf(v) === Object.prototype
      ) {
        for (const k of Object.keys(v)) {
          const at = path ? `${path}.${k}` : k;
          if (UNSAFE_KEY.has(k))
            return fail(at, 'unsafeKey', `"${k}" may not be a key`, { key: k });
          walk(v[k], at, depth + 1);
          if (!ok) return;
        }
        return;
      }
      fail(path, 'notData', 'is not plain data');
    };
    if (!isObject(input)) {
      need(false, '', 'notObject', 'is not an object');
      return false;
    }
    walk(input, '', 0);
    return ok;
  };

  /** One prose string: the renderer's four tags and known entities, nothing else. */
  const prose = (t, path) => {
    const bare = t.replace(PROSE_TAG, '');
    need(
      !UNSAFE.test(bare),
      path,
      'textUnsafe',
      'markup other than strong, em, sub and sup, or a web address'
    );
    for (const m of bare.matchAll(/&([a-zA-Z]+);/g))
      need(
        entities.has(m[1]),
        path,
        'entity',
        `&${m[1]}; is not an entity lessons use`,
        {
          entity: m[1],
        }
      );
  };

  /** A text in every declared language, and an optional record of what the Spanish translates. */
  const text = (v, path, required) => {
    if (v === undefined && !required) return;
    if (!isObject(v)) {
      need(false, path, 'text', 'an object with a string per locale');
      return;
    }
    for (const l of Object.keys(v)) {
      if (l === 'esOf') {
        need(
          typeof v.esOf === 'string' && /^[0-9a-f]{8}$/.test(v.esOf),
          `${path}.esOf`,
          'esOf',
          'the digest of the English the Spanish translates'
        );
        continue;
      }
      need(
        locales.includes(l),
        `${path}.${l}`,
        'textLocale',
        `"${l}" is not one of the pack's locales`,
        {
          locale: l,
        }
      );
      if (typeof v[l] === 'string') prose(v[l], `${path}.${l}`);
      else need(false, `${path}.${l}`, 'text', 'a string');
    }
    // English is required; another language may be missing (the translation
    // view says so) but a text that exists is not blank.
    need(
      typeof v.en === 'string' && v.en.trim() !== '',
      `${path}.en`,
      'textMissing',
      'is missing: the English is required',
      {
        locale: 'en',
      }
    );
  };

  return { out, need, text, guard, locales };
}
