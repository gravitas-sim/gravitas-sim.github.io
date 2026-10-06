#!/usr/bin/env node
// =============================================================================
// Message-catalog audit
// -----------------------------------------------------------------------------
// Three questions a translation can only be trusted if somebody answers:
//
//   Does every id the code asks for exist in English?   (a missing id renders
//                                                        as the id itself)
//   Does every id in English get asked for?             (a dead entry is work
//                                                        a translator wasted)
//   Does every id in a locale exist in English?         (a typo'd override is
//                                                        silently ignored)
//
//   node tools/i18n-audit.mjs
//
// Static, so it sees ids written as literals. Ids built at runtime - the
// scenario and tag accessors, the settings option labels - are computed here
// from the same catalogs the application reads, so they are covered too.
// =============================================================================

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import * as parse5 from 'parse5';

import { completeCatalogs } from './i18n-catalog.mjs';
import { assembledIndexHtml } from './index-fragments.mjs';

const ROOT = new URL('..', import.meta.url).pathname;
const { LOCALES } = await import(`${ROOT}js/i18n/index.js`);

// Every locale's whole catalog: the base file and every fragment split off it,
// merged, because the catalog is split for code-splitting reasons and is one
// catalog as far as coverage is concerned.
//
// This used to be a function of its own that named `<id>.js` and
// `<id>.deferred.js`, so the activities, teaching and placement fragments were
// audited as though they did not exist. It was then taught to read the
// directory - and tools/docs-facts.mjs, which had its own list, went on
// counting two files. The rule now lives in one place, tools/i18n-catalog.mjs,
// driven by the LOCALES registry, and a layout that breaks it (a fragment in
// one language only, an id with two homes, a misnamed export) fails this audit
// rather than being audited around.
const {
  catalogs,
  problems: layoutProblems,
  layout,
} = await completeCatalogs({ locales: LOCALES.map(l => l.id) });
const EN = catalogs.get('en').merged;
/** Every non-English locale, in registry order. */
const TRANSLATIONS = new Map(
  LOCALES.filter(l => l.id !== 'en').map(l => [l.id, catalogs.get(l.id).merged])
);
const { SCENARIO_INFO } = await import(`${ROOT}js/data/scenarioInfo.js`);
const { TAG_ORDER } = await import(`${ROOT}js/data/scenarioTags.js`);

/** Every .js under js/; index.html and its fragments are read below. */
function sources(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) sources(p, out);
    else if (p.endsWith('.js')) out.push(p);
  }
  return out;
}

const used = new Set();
const files = sources(join(ROOT, 'js'));
/**
 * Whether a captured string could be a message id at all.
 *
 * The extractor below scans raw source with regexes, so it reads comments as
 * well as code, and a comment that quotes a call reads as a reference. One in
 * js/exoplanetWidgets.js narrating a past bug - `every t('exoW....') below` -
 * produced two phantom ids, and because a phantom can never be in the catalog
 * it reported as missing from English forever. That is why this tool has never
 * exited zero, and why it was never wired into CI.
 *
 * The test is deliberately only that no segment is empty. A first attempt
 * required word characters throughout and silently discarded 114 real ids -
 * every `scenario.Solar System.title`, whose middle segment was then a scenario
 * name with spaces and colons in it (scenarios are keyed by id since Prompt 63). Ids here are built by joining catalog keys, so
 * a segment can contain almost anything; what it can never be is nothing.
 * Stripping comments first would be the tidier fix and the more dangerous one,
 * since a regex removing `//` to end of line also truncates every `https://`
 * inside a string literal.
 *
 * @param {string} id - Captured string
 * @returns {boolean} Whether it could be a message id
 */
const looksLikeId = id =>
  id.length > 0 && id.split('.').every(part => part.length > 0);

for (const f of files) {
  const src = readFileSync(f, 'utf8');
  for (const m of src.matchAll(/\bt\(\s*'((?:[^'\\]|\\.)*)'/g)) used.add(m[1]);
  for (const m of src.matchAll(/\bt\(\s*"((?:[^"\\]|\\.)*)"/g)) used.add(m[1]);
  // hasMessage() and the coverage note read ids too.
  for (const m of src.matchAll(/hasMessage\(\s*'([^']+)'/g)) used.add(m[1]);
  // js/lightCurve.js imports the translator as `translate`: `t` is already the
  // chart palette in that module, and a translator called on a color object
  // would be a crash rather than a wrong word.
  for (const m of src.matchAll(/\btranslate\(\s*'([^']+)'/g)) used.add(m[1]);
}
// index.html, and every panel's markup that ships with its family instead -
// js/fragments/*.html and the start-up modules' templates - read as the page
// is once each has mounted (tools/index-fragments.mjs). Reading index.html
// alone would report every string those panels ask for as dead.
const html = assembledIndexHtml();
for (const m of html.matchAll(/data-i18n(?:-[a-z-]+)?="([^"]+)"/g))
  used.add(m[1]);

// Ids assembled at runtime from a catalog rather than written out.
for (const key of Object.keys(SCENARIO_INFO)) {
  used.add(`scenario.${key}.title`);
  used.add(`scenario.${key}.summary`);
}
for (const id of TAG_ORDER) {
  used.add(`tag.${id}.label`);
  used.add(`tag.${id}.description`);
}
// Settings labels and section headings are stored as `labelId:` on the item
// and read through t(item.labelId), so they never appear as a literal.
for (const m of readFileSync(join(ROOT, 'js/ui.js'), 'utf8').matchAll(
  /labelId:\s*'([^']+)'/g
)) {
  used.add(m[1]);
}
// The integrator menu's options come from the INTEGRATORS registry in
// js/physics.js rather than from a literal list in the settings item. Read as
// text rather than imported: physics.js reaches for a canvas at module scope
// and this tool has no DOM.
for (const m of readFileSync(join(ROOT, 'js/physics.js'), 'utf8').matchAll(
  /const INTEGRATORS = \[([^\]]*)\]/g
)) {
  for (const v of m[1].matchAll(/'([^']+)'/g)) {
    const slug = v[1]
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    used.add(`settings.option.integrator.${slug}`);
  }
}
// The stopwatch's status word is looked up as
// `instrument.stopwatch.state.<status>`, where the status comes from
// LatchStopwatch.status() rather than from a literal.
for (const state of ['idle', 'running', 'paused', 'stopped']) {
  used.add(`instrument.stopwatch.state.${state}`);
}
// The conservation caveats are pushed as ids by js/physics.js and translated
// where they are drawn, so neither end has them as a literal in a t() call.
for (const m of readFileSync(join(ROOT, 'js/physics.js'), 'utf8').matchAll(
  /out\.push\('(caveat\.[A-Za-z]+)'\)/g
)) {
  used.add(m[1]);
}
// The readout builds its object counts from a table of [id, count] pairs and
// its run state from `readout.status.${paused ? ...}`, so neither reaches t()
// as a literal.
for (const m of readFileSync(join(ROOT, 'js/render.js'), 'utf8').matchAll(
  /\[\s*'(readout\.count\.[A-Za-z]+)'\s*,/g
)) {
  used.add(m[1]);
}
for (const state of ['running', 'paused']) {
  used.add(`readout.status.${state}`);
}
// The front door stores message ids in js/data/welcome.js rather than words, so
// the id is the value of a data field and never appears inside a t() call.
for (const m of readFileSync(join(ROOT, 'js/data/welcome.js'), 'utf8').matchAll(
  /'(welcome(?:Card|Audience|Link)\.[A-Za-z.]+)'/g
)) {
  used.add(m[1]);
}
// A step's kind is looked up as `inv.step.kind.<type>` from the step data, and
// the object-type button stores its label as an id.
for (const kind of ['read', 'predict', 'explore', 'measure', 'question']) {
  used.add(`inv.step.kind.${kind}`);
}
for (const m of readFileSync(join(ROOT, 'js/ui.js'), 'utf8').matchAll(
  /label:\s*'(objectType\.[A-Za-z]+)'/g
)) {
  used.add(m[1]);
}
// Theme names and hints are read through themeLabel()/themeHint() off the
// THEMES registry, so the id never appears as a literal either.
for (const m of readFileSync(join(ROOT, 'js/theme.js'), 'utf8').matchAll(
  /id:\s*'([a-z]+)'/g
)) {
  used.add(`theme.${m[1]}.label`);
  used.add(`theme.${m[1]}.hint`);
}
// The coverage notes: the complete-locale one is looked up through t(), and
// the partial-locale sentence travels on the LOCALES registry so the picker can
// show it before that locale has been fetched. The catalog keeps a copy so a
// translator sees it alongside everything else.
used.add('locale.coverage.es');
used.add('locale.coverage.complete');
// Settings option labels are built from key + value.
for (const m of readFileSync(join(ROOT, 'js/ui.js'), 'utf8').matchAll(
  /key:\s*'([a-z0-9_]+)',\s*\n?\s*type:\s*'option',\s*\n?\s*options:\s*\[([^\]]*)\]/g
)) {
  const camel = m[1].replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase());
  for (const v of m[2].matchAll(/'((?:[^'\\]|\\.)*)'/g)) {
    const slug = v[1]
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    used.add(`settings.option.${camel}.${slug}`);
  }
}

// Phantoms from comments are dropped here rather than at each capture site,
// so every extractor above stays a one-liner.
for (const id of [...used]) if (!looksLikeId(id)) used.delete(id);

const enIds = new Set(Object.keys(EN));

// The lessonFn.* namespace is deliberately outside this accounting. Those ids
// are computed from what a lesson function says, at the moment it says it, and
// an id with no entry simply renders the English - see js/i18n/lesson.js. So a
// missing one is not a defect and an unused one is not dead weight. English
// has none at all: an English entry could only repeat the sentence it is keyed
// on, which lessonText() already returns, so all 139 were removed. A
// translation's id therefore has no English twin by design, and is not an
// orphan.
const LOOKED_UP = /^lessonFn\./;

const missingInEn = [...used].filter(id => !enIds.has(id)).sort();
const unused = [...enIds]
  .filter(id => !used.has(id) && !LOOKED_UP.test(id))
  .sort();
/** Per locale: ids it has that English does not, and English ids it lacks. */
const perLocale = [...TRANSLATIONS.entries()].map(([id, catalog]) => {
  const ids = new Set(Object.keys(catalog));
  return {
    id,
    size: ids.size,
    orphaned: [...ids].filter(k => !enIds.has(k) && !LOOKED_UP.test(k)).sort(),
    untranslated: [...enIds].filter(k => !ids.has(k)).sort(),
  };
});

const show = (title, list, limit = 40) => {
  console.log(`\n${title}: ${list.length}`);
  for (const id of list.slice(0, limit)) console.log('   ', id);
  if (list.length > limit) console.log(`    … and ${list.length - limit} more`);
};

const labelFor = id => LOCALES.find(l => l.id === id)?.label || id;

console.log(
  `Catalog files:     ${layout.files.length} ` +
    `(${layout.parts.length} fragments per locale besides the base)`
);
console.log(`English catalog: ${enIds.size} messages`);
for (const { id, size } of perLocale) {
  console.log(
    `${labelFor(id)} catalog: ${size} messages ` +
      `(${Math.round((size / enIds.size) * 100)}% of English)`
  );
}
console.log(`Ids referenced:    ${used.size}`);

// First, because every list after it is only as good as the catalog it read.
if (layoutProblems.length)
  show('CATALOG LAYOUT (the catalog is not one catalog)', layoutProblems);
if (missingInEn.length)
  show('MISSING from English (renders as the id)', missingInEn);
for (const { id, orphaned } of perLocale) {
  if (orphaned.length)
    show(`ORPHANED in ${labelFor(id)} (no English id: a typo)`, orphaned);
}
if (unused.length) show('Unused English entries', unused, 20);
for (const { id, untranslated } of perLocale) {
  show(`Not yet translated into ${labelFor(id)}`, untranslated, 15);
}

// -----------------------------------------------------------------------------
// Document pages carry their Spanish in their own markup (D-TERM-02): every
// run of prose is an English span and a Spanish span side by side. Two things
// can go wrong there, and neither is visible in a catalog: a run with only one
// of the pair, and a Spanish copy whose tags or links have drifted from the
// English. Pages in REQUIRED_BILINGUAL must also have no prose outside a pair.
// -----------------------------------------------------------------------------
const REQUIRED_BILINGUAL = [
  'glossary',
  'validation',
  'instructors',
  'evaluation',
  'model',
];
const pageProblems = [];
const SKIP_TAGS = new Set([
  'script',
  'style',
  'pre',
  'code',
  'svg',
  'kbd',
  'option',
  'select',
  'textarea',
]);
const shape = n => {
  const tags = [];
  const walk = x => {
    for (const k of x.childNodes ?? []) {
      if (k.tagName) {
        tags.push(
          k.tagName +
            (k.tagName === 'a'
              ? `[${k.attrs.find(a => a.name === 'href')?.value}]`
              : '')
        );
        walk(k);
      }
    }
  };
  walk(n);
  return tags.join(',');
};
const cls = n => n.attrs?.find(a => a.name === 'class')?.value ?? '';
for (const page of readdirSync(ROOT)
  .filter(d => statSync(join(ROOT, d)).isDirectory())
  .map(d => `${d}/index.html`)
  .filter(f => {
    try {
      return statSync(join(ROOT, f)).isFile();
    } catch {
      return false;
    }
  })) {
  const doc = parse5.parse(readFileSync(join(ROOT, page), 'utf8'));
  const required = REQUIRED_BILINGUAL.includes(page.split('/')[0]);
  let main;
  (function find(n) {
    if (n.tagName === 'main') main = n;
    else (n.childNodes ?? []).forEach(find);
  })(doc);
  if (!main) continue;
  const walk = (n, inPair) => {
    const kids = n.childNodes ?? [];
    kids.forEach((k, i) => {
      if (k.tagName && SKIP_TAGS.has(k.tagName)) return;
      if (/\bdoc-eq-block\b/.test(cls(k))) return;
      if (/^val[A-Z]/.test(k.attrs?.find(a => a.name === 'id')?.value ?? ''))
        return;
      if (/\bgs-en\b/.test(cls(k))) {
        const next = kids.slice(i + 1).find(x => x.tagName || x.value?.trim());
        if (!next || !/\bgs-es\b/.test(cls(next)))
          pageProblems.push(`${page}: a gs-en with no gs-es after it`);
        else if (shape(k) !== shape(next))
          pageProblems.push(
            `${page}: tags or links differ between en and es near "${k.childNodes?.[0]?.value?.slice(0, 40) ?? ''}"`
          );
        return;
      }
      if (/\bgs-es\b/.test(cls(k))) {
        const prev = kids
          .slice(0, i)
          .reverse()
          .find(x => x.tagName || x.value?.trim());
        if (!prev || !/\bgs-en\b/.test(cls(prev)))
          pageProblems.push(`${page}: a gs-es with no gs-en before it`);
        return;
      }
      if (
        k.nodeName === '#text' &&
        required &&
        /[A-Za-z]{4,}/.test(k.value) &&
        !/\b(19|20)\d\d\b/.test(k.value) &&
        !/_|^\s*(worlds \(|[a-z]+[A-Z]\w*\b)/.test(k.value) &&
        !inPair
      )
        pageProblems.push(
          `${page}: English prose outside a pair: "${k.value.trim().slice(0, 50)}"`
        );
      if (k.tagName) walk(k, inPair);
    });
  };
  walk(main, false);
}
if (pageProblems.length)
  show(
    'DOCUMENT PAGES (en/es markup out of step)',
    [...new Set(pageProblems)],
    30
  );
else console.log('Document pages:    every en/es pair matches');

void relative;
// An orphan is a typo and fails; an untranslated id is honest work in progress
// and does not. That asymmetry is the same one the Spanish-only version had.
// A broken layout fails too: a fragment one loader never registers is not
// work in progress, it is strings a reader can never see.
const orphanTotal = perLocale.reduce((n, l) => n + l.orphaned.length, 0);
process.exit(
  layoutProblems.length ||
    missingInEn.length ||
    orphanTotal ||
    pageProblems.length
    ? 1
    : 0
);
