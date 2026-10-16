// =============================================================================
// The public translator for an extension instrument's strings
// -----------------------------------------------------------------------------
// An instrument written outside the repository cannot reach the application's
// catalogs (js/i18n/, private). It declares its own instead: one JSON object
// per language, `{ key: "text with {name} placeholders" }`, named in its
// manifest as `provides.translations` entries with a `file`, and as assets
// with the role `translation`. This builds `t()` from them with the same
// rules the application's t() has: the chosen language, then English, then the
// key itself, so a missing string is visible and never blank.
//
// Imported as `gravitas:instrument/strings`; a maintainer rewrites that to
// this path when the instrument is vendored (sdk/README.md). Pure: no DOM.
// =============================================================================

const PLACEHOLDER = /\{(\w+)\}/g;

/**
 * Build a translator from declared catalogs.
 * @param {Object<string, Object<string, string>>} catalogs - By language; `en` is required
 * @param {string} [locale] - The language to speak
 * @returns {(key: string, vars?: Object) => string}
 */
export function translator(catalogs, locale = 'en') {
  const own = Object.hasOwn(catalogs, locale) ? catalogs[locale] : {};
  return (key, vars) => {
    const hit = Object.hasOwn(own, key)
      ? own[key]
      : Object.hasOwn(catalogs.en || {}, key)
        ? catalogs.en[key]
        : undefined;
    if (hit === undefined) return key;
    return vars
      ? hit.replace(PLACEHOLDER, (whole, name) =>
          Object.hasOwn(vars, name) ? String(vars[name]) : whole
        )
      : hit;
  };
}

/**
 * Everything wrong with a set of declared catalogs: English missing, a value
 * that is not text, a key a language has and English lacks, a key English has
 * that another declared language lacks, a different set of placeholders.
 * @param {Object<string, Object<string, string>>} catalogs
 * @returns {string[]}
 */
export function checkCatalogs(catalogs) {
  const problems = [];
  const en = catalogs?.en;
  if (!en || typeof en !== 'object') return ['an English catalog is required'];
  const names = s =>
    [...String(s).matchAll(PLACEHOLDER)]
      .map(m => m[1])
      .sort()
      .join(',');
  for (const [locale, cat] of Object.entries(catalogs)) {
    if (!cat || typeof cat !== 'object' || Array.isArray(cat)) {
      problems.push(`${locale}: a catalog is an object of keys and texts`);
      continue;
    }
    for (const [k, v] of Object.entries(cat))
      if (typeof v !== 'string') problems.push(`${locale}.${k}: not text`);
    if (locale === 'en') continue;
    for (const k of Object.keys(en))
      if (!Object.hasOwn(cat, k)) problems.push(`${locale}.${k}: missing`);
      else if (typeof cat[k] === 'string' && names(cat[k]) !== names(en[k]))
        problems.push(`${locale}.${k}: placeholders differ from English`);
    for (const k of Object.keys(cat))
      if (!Object.hasOwn(en, k))
        problems.push(`${locale}.${k}: English has no such key`);
  }
  return problems;
}
