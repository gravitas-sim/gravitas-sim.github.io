// =============================================================================
// The message catalog, however many files it is split across
// -----------------------------------------------------------------------------
// A locale's catalog is one catalog to a reader and several files to the
// bundler. It began as `en.js`; `en.deferred.js` was split off so a panel most
// visitors never open would not cost them its prose at start-up, and since
// then `en.activities.js`, `en.teaching.js` and `en.placement.js` have followed
// for the same reason. Each split was a bundling decision.
//
// The tools that read the catalog did not follow. tools/i18n-audit.mjs named
// the first two files until 2026-09-21 and reported ids in the placement
// catalog as MISSING, because a catalog a reader cannot see is
// indistinguishable from a catalog with nothing in it. tools/docs-facts.mjs
// still named them after that, so README.md and the manual published a
// `uiStrings` of 3691 over a catalog of 4017, and two tests read hand-written
// lists that had each missed a different file. Five readers, five lists, and
// every split made each of them wrong in its own way.
//
// So there is one rule, it is structural, and this module is the only place
// that applies it:
//
//   js/i18n/<id>.js          the base catalog of a registered locale,
//                            exporting <ID>
//   js/i18n/<id>.<part>.js   a fragment of that catalog, exporting <ID>_<PART>
//
// A file whose name has a dot before `.js` is a fragment; the modules in the
// directory that are not catalogs - index.js, dom.js, lesson.js and the rest -
// have none. The next split is therefore picked up by being made, and the
// checks below fail it loudly if it is made for one language only.
//
// What is checked, and why each one is a bug rather than a style point
// -----------------------------------------------------------------------------
//   Fragment parity   Every registered locale has the same fragments. A
//                     fragment in one language only is a set of strings that
//                     the other language's loader never registers.
//   One home per id   No id is defined in two fragments of a locale. The
//                     runtime registers fragments at different moments, so a
//                     duplicate is shadowed by whichever arrived last - a
//                     string that changes when a panel opens.
//   Same home in all  A translated id lives in the same fragment as its
//                     English original. Anywhere else, it is loaded with the
//                     wrong panel and the reader sees English until then.
//   An export         A fragment exports its table under the conventional
//                     name. A file this module cannot read is a file that is
//                     not counted, audited or checked, which is the failure
//                     all of this exists to prevent.
//
// A fragment may re-export another: `en.teaching.js` spreads `EN_ACTIVITIES`
// into its own table so the /teaching/ page reads one object. Those ids belong
// to the fragment that defines them, not to every fragment that passes them
// on, so re-exports are read from the static import graph (the same walker the
// instructor digest trusts) and an id is inherited only when it arrives with
// the identical text. An import that changes the text is a second definition,
// and is reported as one.
//
// Merge order is fixed: locales in registry order, and within a locale the
// base catalog first and then fragments by file name. Nothing depends on the
// order for correctness - a duplicate is an error, not a tie-break - but a
// merged catalog that is built the same way every time diffs cleanly.
// =============================================================================

import { readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { importClosure } from './source-closure.mjs';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Where the catalogs live. */
export const I18N_DIR = path.join(REPO, 'js', 'i18n');

/**
 * The export name the convention gives a catalog file.
 *
 * @param {string} locale - Locale id, e.g. `en` or `pt-BR`
 * @param {string|null} part - Fragment name, or null for the base catalog
 * @returns {string} e.g. `EN`, `EN_DEFERRED`, `PT_BR_TEACHING`
 */
export function exportNameFor(locale, part) {
  const upper = s => s.toUpperCase().replace(/[-.]/g, '_');
  return part ? `${upper(locale)}_${upper(part)}` : upper(locale);
}

/**
 * The registered locale ids, in registry order.
 *
 * Read from js/i18n/index.js rather than from the file names, because a file
 * called `fr.teaching.js` beside no registered French is exactly the mistake
 * the layout check should report, not a locale it should discover.
 *
 * @returns {Promise<string[]>} Locale ids
 */
export async function registeredLocales() {
  const { LOCALES } = await import(
    pathToFileURL(path.join(I18N_DIR, 'index.js')).href
  );
  return LOCALES.map(l => l.id);
}

/**
 * Every catalog file in a directory, and everything wrong with the set.
 *
 * Synchronous and import-free: it reads file names only, so a tool that needs
 * the list at module load (docs-facts' document list) can have it.
 *
 * @param {object} options - What to read
 * @param {string[]} options.locales - Registered locale ids, in registry order
 * @param {string} [options.dir] - Catalog directory, absolute
 * @returns {{files: Array<{locale: string, part: string|null, file: string,
 *   exportName: string}>, parts: string[], problems: string[]}} The catalog
 *   files in merge order, the fragment names, and any layout problems
 */
export function catalogLayout({ locales, dir = I18N_DIR }) {
  const registered = new Map(locales.map((id, i) => [id, i]));
  const files = [];
  const problems = [];
  const partsOf = new Map(locales.map(id => [id, new Set()]));

  for (const name of readdirSync(dir).sort()) {
    if (!name.endsWith('.js')) continue;
    const stem = name.slice(0, -'.js'.length);
    const dot = stem.indexOf('.');
    if (dot < 0) {
      // index.js, dom.js and the other modules are not catalogs. A base
      // catalog is the one dotless file named after a registered locale.
      if (registered.has(stem)) {
        files.push({
          locale: stem,
          part: null,
          file: name,
          exportName: exportNameFor(stem, null),
        });
      }
      continue;
    }
    const locale = stem.slice(0, dot);
    const part = stem.slice(dot + 1);
    if (!registered.has(locale)) {
      problems.push(
        `${name} is named like a catalog fragment for "${locale}", which is ` +
          `not a registered locale (${locales.join(', ')}). Register the ` +
          'locale in js/i18n/index.js, or rename the file so it is not ' +
          'mistaken for a catalog.'
      );
      continue;
    }
    partsOf.get(locale).add(part);
    files.push({
      locale,
      part,
      file: name,
      exportName: exportNameFor(locale, part),
    });
  }

  for (const id of locales) {
    if (!files.some(f => f.locale === id && f.part === null)) {
      problems.push(
        `${id}.js is missing: every registered locale needs a base catalog.`
      );
    }
  }

  const parts = [
    ...new Set(locales.flatMap(id => [...partsOf.get(id)])),
  ].sort();
  for (const part of parts) {
    const lacking = locales.filter(id => !partsOf.get(id).has(part));
    if (!lacking.length) continue;
    const present = locales.filter(id => partsOf.get(id).has(part));
    problems.push(
      `${present.map(id => `${id}.${part}.js`).join(', ')} has no counterpart ` +
        `for ${lacking.join(', ')}. A fragment in one language only is a set ` +
        'of strings the other loader never registers; add ' +
        `${lacking.map(id => `${id}.${part}.js`).join(', ')}, even if it ` +
        'starts as a copy of the English.'
    );
  }

  files.sort(
    (a, b) =>
      registered.get(a.locale) - registered.get(b.locale) ||
      (a.part === null ? -1 : b.part === null ? 1 : a.part < b.part ? -1 : 1)
  );
  return { files, parts, problems };
}

/**
 * One locale's catalog, merged, with where each id is defined.
 *
 * @param {string} locale - Locale id
 * @param {object} options - Where to read
 * @param {ReturnType<typeof catalogLayout>} options.layout - From catalogLayout
 * @param {string} [options.dir] - Catalog directory, absolute
 * @returns {Promise<{merged: Object<string,string>, homeOf: Map<string,string>,
 *   fragments: Array<{file: string, part: string|null, own: number,
 *   inherited: number}>, problems: string[]}>} The catalog and its problems
 */
export async function loadCatalog(locale, { layout, dir = I18N_DIR }) {
  const mine = layout.files.filter(f => f.locale === locale);
  const names = new Set(mine.map(f => f.file));
  const tables = new Map();
  const problems = [];

  for (const f of mine) {
    const mod = await import(pathToFileURL(path.join(dir, f.file)).href);
    const table = mod[f.exportName];
    if (!table || typeof table !== 'object') {
      problems.push(
        `${f.file} does not export ${f.exportName}. Either the export is ` +
          'misnamed or this is not a catalog; a catalog file that cannot be ' +
          'read is a catalog that is not counted or audited.'
      );
      continue;
    }
    tables.set(f.file, table);
  }

  const merged = {};
  const homeOf = new Map();
  const fragments = [];
  for (const f of mine) {
    const table = tables.get(f.file);
    if (!table) continue;
    // The other catalogs this one passes on, from its static imports.
    const passedOn = importClosure({ root: dir, entries: [f.file] })
      .files.filter(other => other !== f.file && names.has(other))
      .map(other => tables.get(other))
      .filter(Boolean);
    let own = 0;
    let inherited = 0;
    for (const [id, text] of Object.entries(table)) {
      if (passedOn.some(t => Object.hasOwn(t, id) && t[id] === text)) {
        inherited++;
        continue;
      }
      own++;
      if (homeOf.has(id)) {
        problems.push(
          `"${id}" is defined in both ${homeOf.get(id)} and ${f.file}. The ` +
            'runtime registers them at different moments, so the text a ' +
            'reader sees would depend on which panel opened last.'
        );
        continue;
      }
      homeOf.set(id, f.file);
      merged[id] = text;
    }
    fragments.push({ file: f.file, part: f.part, own, inherited });
  }
  return { merged, homeOf, fragments, problems };
}

/**
 * Every locale's catalog, and every problem with any of them.
 *
 * The one entry point most callers want. `problems` is empty exactly when the
 * layout is in parity, every file exports its table, no id has two homes, and
 * every translated id lives where its English original does.
 *
 * @param {object} [options] - Where to read
 * @param {string[]} [options.locales] - Locale ids; the registry by default
 * @param {string} [options.dir] - Catalog directory, absolute
 * @returns {Promise<{layout: ReturnType<typeof catalogLayout>,
 *   catalogs: Map<string, Awaited<ReturnType<typeof loadCatalog>>>,
 *   problems: string[]}>} Everything
 */
export async function completeCatalogs({ locales, dir = I18N_DIR } = {}) {
  const ids = locales ?? (await registeredLocales());
  const layout = catalogLayout({ locales: ids, dir });
  const catalogs = new Map();
  for (const id of ids)
    catalogs.set(id, await loadCatalog(id, { layout, dir }));
  const problems = [
    ...layout.problems,
    ...[...catalogs.values()].flatMap(c => c.problems),
  ];

  // Same home in every language, measured against the first registered
  // locale, which is the one every other falls back to.
  const [source, ...others] = ids;
  const home = catalogs.get(source)?.homeOf ?? new Map();
  for (const id of others) {
    for (const [key, file] of catalogs.get(id).homeOf) {
      const original = home.get(key);
      if (!original) continue; // an id with no original is i18n:check's to report
      const expected = original.replace(new RegExp(`^${source}\\.`), `${id}.`);
      if (file !== expected) {
        problems.push(
          `"${key}" is in ${file}, but its original is in ${original}. It ` +
            `belongs in ${expected}, or it is registered with the wrong panel.`
        );
      }
    }
  }
  return { layout, catalogs, problems };
}
