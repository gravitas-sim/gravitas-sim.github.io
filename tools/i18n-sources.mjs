// =============================================================================
// Where the translations are, read as pairs of English and translated text
// -----------------------------------------------------------------------------
// The freshness ledger (tools/i18n-ledger.mjs) judges rows of {key, en, es}.
// This file reads every content type that carries a translation beside its
// English and says what the key of each pair is. Read only: nothing here writes
// a catalog, a lesson or a page, and nothing here is part of the published site.
//
//   catalog      js/i18n: every fragment, merged (tools/i18n-catalog.mjs), keyed
//                by message id. `lessonFn.*` is left out on purpose: those ids
//                are slugs of the English they translate (js/i18n/lesson.js), so
//                a reworded sentence gets a new id and loses its translation by
//                construction. That is already the freshness rule, applied by
//                the key.
//   lesson       js/data/investigations/<id>.js laid against es/<id>.js, keyed
//                by lesson id and the path to the string. Arrays line up by
//                index (js/data/investigations/i18n.js), so a step inserted in
//                the English slides every later string against the wrong
//                Spanish; here that shows as every later string going stale,
//                which is the loud failure that silent mistranslation needs.
//   depth        the deeper steps of a lesson, the same way (depth/<id>.js
//                against depth/es/<id>.js).
//   instructor   the instructor guide prose and expectations shadows. Both are
//                empty in Spanish today (the guides' Spanish is generated from
//                the lessons' own words); the rows exist the day they are not.
//   page         the document pages: every English span with the Spanish span
//                beside it. A pair is keyed by the digest of its Spanish, so an
//                insertion elsewhere on the page moves nothing, and the same
//                pair on seventeen pages (the stamped shell) is one entry.
//
// Packs are different and are not here: a pack text is {en, es, esOf} and
// carries its own digest (js/course/review.js translationState). packTexts()
// reads them so the same report can say how many are done, stale or undated.
// =============================================================================

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as parse5 from 'parse5';

import { completeCatalogs, registeredLocales } from './i18n-catalog.mjs';
import { assembledIndexHtml } from './index-fragments.mjs';
import { digest } from './i18n-ledger.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LESSONS = path.join(ROOT, 'js', 'data', 'investigations');
const href = file => pathToFileURL(file).href;

/** Ids the catalog keys on the English itself; see the header. */
const SELF_KEYED = /^lessonFn\./;

/**
 * A message as the text its digest is taken of.
 *
 * A message is a string, or a plural table {one, other}: that is written out
 * with its keys sorted, so the order a file lists them in is not a change.
 *
 * @param {*} value - A catalog value
 * @returns {?string} The text, or null when it is neither
 */
export function plain(value) {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && !Array.isArray(value))
    return JSON.stringify(
      Object.fromEntries(
        Object.entries(value).sort(([a], [b]) => (a < b ? -1 : 1))
      )
    );
  return null;
}

/**
 * Every translated message beside its English.
 *
 * @returns {Promise<{sources: Map<string, Array<{key: string, en: string, es: string}>>, missing: Object<string,string[]>}>}
 */
export async function catalogRows() {
  const locales = await registeredLocales();
  const { catalogs } = await completeCatalogs({ locales });
  const en = catalogs.get(locales[0]).merged;
  const sources = new Map();
  const missing = {};
  for (const locale of locales.slice(1)) {
    const other = catalogs.get(locale).merged;
    const rows = [];
    missing[locale] = [];
    for (const key of Object.keys(en).sort()) {
      if (SELF_KEYED.test(key)) continue;
      const from = plain(en[key]);
      const to = plain(other[key]);
      // An English entry that is empty has nothing to translate, and one whose
      // translation is absent is the audit's "not yet translated", not stale.
      if (from === null || !from.trim()) continue;
      if (to === null || !to.trim()) {
        missing[locale].push(key);
        continue;
      }
      rows.push({ key, en: from, es: to });
    }
    sources.set(`catalog:${locale}`, rows);
  }
  return { sources, missing };
}

/**
 * The strings of a translation shadow laid against the English it shadows.
 *
 * The walk is mergeTranslation's (js/data/investigations/i18n.js): a shadow can
 * only reach keys the English has, arrays line up by index, `null` is "not
 * translated", functions and the structural keys are machinery.
 *
 * @param {*} base - The English, or a part of it
 * @param {*} overlay - The shadow, or the matching part of it
 * @param {Set<string>} skip - Keys whose strings are machinery
 * @param {Array<{key: string, en: string, es: string}>} out - Where pairs go
 * @param {string} prefix - Lesson id
 * @param {string} at - Path so far
 * @param {string} name - The key this value sits under
 */
export function shadowPairs(
  base,
  overlay,
  skip,
  out,
  prefix,
  at = '',
  name = ''
) {
  if (overlay === undefined || overlay === null || typeof base === 'function')
    return;
  if (typeof base === 'string') {
    if (skip.has(name) || typeof overlay !== 'string' || !overlay.trim())
      return;
    out.push({ key: `${prefix}/${at}`, en: base, es: overlay });
    return;
  }
  if (Array.isArray(base)) {
    if (!Array.isArray(overlay)) return;
    base.forEach((b, i) =>
      shadowPairs(b, overlay[i], skip, out, prefix, `${at}[${i}]`, name)
    );
    return;
  }
  if (base && typeof base === 'object') {
    if (typeof overlay !== 'object' || Array.isArray(overlay)) return;
    for (const k of Object.keys(overlay)) {
      if (!Object.hasOwn(base, k) || skip.has(k)) continue;
      shadowPairs(
        base[k],
        overlay[k],
        skip,
        out,
        prefix,
        at ? `${at}.${k}` : k,
        k
      );
    }
  }
}

/**
 * Lesson and depth shadows, for every non-English locale that has a directory.
 *
 * @returns {Promise<Map<string, Array<{key: string, en: string, es: string}>>>}
 */
export async function lessonRows() {
  const { STRUCTURAL } = await import(href(path.join(LESSONS, 'i18n.js')));
  const sources = new Map();
  for (const locale of (await registeredLocales()).slice(1)) {
    for (const [source, englishDir] of [
      ['lesson', LESSONS],
      ['depth', path.join(LESSONS, 'depth')],
    ]) {
      const shadowDir = path.join(englishDir, locale);
      if (!existsSync(shadowDir)) continue;
      const rows = [];
      for (const file of readdirSync(shadowDir)
        .filter(f => f.endsWith('.js'))
        .sort()) {
        const english = path.join(englishDir, file);
        if (!existsSync(english)) continue;
        const id = file.slice(0, -3);
        const base = (await import(href(english))).default;
        const shadow = (await import(href(path.join(shadowDir, file)))).default;
        shadowPairs(base, shadow, STRUCTURAL, rows, id);
      }
      sources.set(`${source}:${locale}`, rows);
    }
  }
  return sources;
}

/**
 * The instructor guides' prose and expectations, in the shadows that exist.
 *
 * The flow table's shadow is keyed by step id rather than by index and is
 * empty; it is not read until it holds something (TRANSLATION.md, waits).
 *
 * @returns {Promise<Map<string, Array<{key: string, en: string, es: string}>>>}
 */
export async function instructorRows() {
  const dir = path.join(ROOT, 'js', 'data');
  const content = await import(href(path.join(dir, 'instructorContent.js')));
  const contentEs = await import(
    href(path.join(dir, 'instructorContent.es.js'))
  );
  const expect = (
    await import(href(path.join(dir, 'instructorExpectations.js')))
  ).default;
  const expectEs = (
    await import(href(path.join(dir, 'instructorExpectations.es.js')))
  ).default;
  const rows = [];
  const none = new Set();
  for (const id of Object.keys(contentEs.INSTRUCTOR_CONTENT_ES ?? {}))
    shadowPairs(
      content.INSTRUCTOR_CONTENT[id],
      contentEs.INSTRUCTOR_CONTENT_ES[id],
      none,
      rows,
      `content/${id}`
    );
  for (const id of Object.keys(expectEs.lessons ?? {}))
    shadowPairs(
      expect.lessons?.[id],
      expectEs.lessons[id],
      none,
      rows,
      `expectations/${id}`
    );
  return new Map([['instructor:es', rows]]);
}

/**
 * The tables that carry a Spanish twin beside the English, each in its own
 * module: the lesson cards' summaries, the "what am I looking at" explainers,
 * the distribution kit's words, the instructor guides' labels, and the SDK
 * example's extension strings. They have no message ids, so each is walked as
 * a shadow (arrays by index, keys by name) and keyed by what that walk says.
 */
const TWINS = [
  {
    name: 'summary',
    load: async () => [
      (await import(href(path.join(LESSONS, 'summaries.js')))).SUMMARIES,
      (await import(href(path.join(LESSONS, 'summaries.es.js')))).SUMMARIES_ES,
    ],
  },
  {
    name: 'explain',
    load: async () => [
      (await import(href(path.join(ROOT, 'js', 'explain', 'en.js')))).default,
      (await import(href(path.join(ROOT, 'js', 'explain', 'es.js')))).default,
    ],
  },
  {
    name: 'kit',
    load: async () => {
      const { WORDS } = await import(
        href(path.join(ROOT, 'js', 'teach', 'kitText.js'))
      );
      return [WORDS.en, WORDS.es];
    },
  },
  {
    name: 'instructor-labels',
    load: async () => {
      const { LABELS } = await import(
        href(path.join(ROOT, 'js', 'data', 'instructorLabels.js'))
      );
      return [LABELS.en, LABELS.es];
    },
  },
  {
    name: 'sdk-strings',
    load: async () => {
      const dir = path.join(ROOT, 'sdk', 'examples', 'kepler-third-law');
      const read = f => JSON.parse(readFileSync(path.join(dir, f), 'utf8'));
      return [read('strings.en.json'), read('strings.es.json')];
    },
  },
];

/**
 * Every twin table, as rows.
 *
 * @returns {Promise<Map<string, Array<{key: string, en: string, es: string}>>>}
 */
export async function twinRows() {
  const sources = new Map();
  for (const twin of TWINS) {
    const [base, overlay] = await twin.load();
    const rows = [];
    shadowPairs(base, overlay, new Set(), rows, twin.name);
    sources.set(`${twin.name}:es`, rows);
  }
  return sources;
}

/**
 * Documents that exist twice, whole: DATA_PROTECTION.md and its Spanish. A
 * change anywhere in the English makes the twin stale, which is as fine as a
 * document twin can be judged without a person reading it.
 *
 * @returns {Map<string, Array<{key: string, en: string, es: string}>>}
 */
export function documentRows() {
  const rows = [];
  for (const f of readdirSync(ROOT)
    .filter(f => f.endsWith('.es.md'))
    .sort()) {
    const english = f.replace(/\.es\.md$/, '.md');
    if (existsSync(path.join(ROOT, english)))
      rows.push({
        key: english,
        en: readFileSync(path.join(ROOT, english), 'utf8'),
        es: readFileSync(path.join(ROOT, f), 'utf8'),
      });
  }
  return new Map([['document:es', rows]]);
}

const cls = n => n.attrs?.find(a => a.name === 'class')?.value ?? '';
const text = n => parse5.serialize(n).replace(/\s+/g, ' ').trim();

/** The pages: every directory's index.html and the front door's assembled page. */
export function pageFiles() {
  const dirs = readdirSync(ROOT).filter(d => {
    try {
      return statSync(path.join(ROOT, d, 'index.html')).isFile();
    } catch {
      return false;
    }
  });
  return ['index.html', ...dirs.sort().map(d => `${d}/index.html`)];
}

/** The source of a page as a reader has it (fragments mounted, fact blocks out). */
export function pageHtml(file) {
  const html =
    file === 'index.html'
      ? assembledIndexHtml()
      : readFileSync(path.join(ROOT, file), 'utf8');
  return html.replace(
    /<!--fact-block:[^>]*-->[\s\S]*?<!--\/fact-block-->/g,
    ''
  );
}

/**
 * Every English span and the Spanish span beside it, on every page.
 *
 * @returns {Map<string, Array<{key: string, en: string, es: string, where: string}>>}
 */
export function pageRows() {
  const seen = new Set();
  const rows = [];
  for (const file of pageFiles()) {
    const walk = n => {
      const kids = n.childNodes ?? [];
      kids.forEach((k, i) => {
        if (k.tagName && /\bgs-en\b/.test(cls(k))) {
          const next = kids
            .slice(i + 1)
            .find(x => x.tagName || x.value?.trim());
          if (next && /\bgs-es\b/.test(cls(next))) {
            const en = text(k);
            const es = text(next);
            const id = `${en}\u0000${es}`;
            if (en && es && !seen.has(id)) {
              seen.add(id);
              rows.push({ key: `es-${digest(es)}`, en, es, where: file });
            }
          }
          return;
        }
        if (k.childNodes) walk(k);
      });
    };
    walk(parse5.parse(pageHtml(file)));
  }
  return new Map([['page:es', rows]]);
}

/**
 * Every pack text this repository ships, with its translation state.
 *
 * A text is any object with a string `en` and a string `es` or `esOf`. State is
 * js/course/review.js translationState's, with the one case it calls done made
 * visible: `undated`, a Spanish text whose pack never recorded what English it
 * was written from.
 *
 * @returns {Promise<Array<{file: string, at: string, state: string}>>}
 */
export async function packTexts() {
  const out = [];
  const visit = (file, v, at, noField = false) => {
    if (Array.isArray(v))
      return v.forEach((x, i) => visit(file, x, `${at}[${i}]`, noField));
    if (!v || typeof v !== 'object') return;
    if (typeof v.en === 'string' && ('es' in v || 'esOf' in v)) {
      const hasEs = typeof v.es === 'string' && v.es.trim() !== '';
      const state = !hasEs
        ? 'missing'
        : typeof v.esOf !== 'string'
          ? noField
            ? 'no-field'
            : 'undated'
          : v.esOf !== digest(v.en)
            ? 'stale'
            : 'fresh';
      out.push({ file, at, state });
      return;
    }
    for (const [k, x] of Object.entries(v))
      visit(file, x, at ? `${at}.${k}` : k, noField);
  };
  const courses = path.join(ROOT, 'js', 'data', 'courses');
  for (const f of readdirSync(courses)
    .filter(f => f.endsWith('.js') && f !== 'index.js')
    .sort()) {
    const mod = await import(href(path.join(courses, f)));
    for (const [name, value] of Object.entries(mod))
      visit(`js/data/courses/${f}`, value, name);
  }
  const example = await import(
    href(path.join(ROOT, 'js', 'composer', 'example.js'))
  );
  for (const [name, value] of Object.entries(example))
    visit('js/composer/example.js', value, name);
  const sdk = path.join(ROOT, 'sdk', 'examples');
  for (const d of readdirSync(sdk).sort()) {
    const dir = path.join(sdk, d);
    if (!statSync(dir).isDirectory()) continue;
    for (const f of readdirSync(dir).filter(f =>
      /^(pack|course|investigation)\.json$/.test(f)
    )) {
      const pack = JSON.parse(readFileSync(path.join(dir, f), 'utf8'));
      // A /1 course pack has no esOf field to carry the digest (its schema
      // has none); migrating it to /2 (js/course/pack.js) is what adds it.
      const noField =
        pack.format === 'gravitas.course-pack' && pack.formatVersion === 1;
      visit(`sdk/examples/${d}/${f}`, pack, '', noField);
    }
  }
  return out;
}

/** Every ledger source, current. */
export async function allRows() {
  const sources = new Map();
  const { sources: cat, missing } = await catalogRows();
  for (const [k, v] of cat) sources.set(k, v);
  for (const [k, v] of await lessonRows()) sources.set(k, v);
  for (const [k, v] of await instructorRows()) sources.set(k, v);
  for (const [k, v] of await twinRows()) sources.set(k, v);
  for (const [k, v] of documentRows()) sources.set(k, v);
  for (const [k, v] of pageRows()) sources.set(k, v);
  return { sources, missing };
}
