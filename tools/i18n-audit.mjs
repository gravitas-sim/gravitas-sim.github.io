#!/usr/bin/env node
// =============================================================================
// Message-catalogue audit
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

const ROOT = new URL('..', import.meta.url).pathname;
const { EN } = await import(`${ROOT}js/i18n/en.js`);
const { ES } = await import(`${ROOT}js/i18n/es.js`);
const { SCENARIO_INFO } = await import(`${ROOT}js/data/scenarioInfo.js`);
const { TAG_ORDER } = await import(`${ROOT}js/data/scenarioTags.js`);

/** Every .js under js/, and index.html. */
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
for (const f of files) {
  const src = readFileSync(f, 'utf8');
  for (const m of src.matchAll(/\bt\(\s*'((?:[^'\\]|\\.)*)'/g)) used.add(m[1]);
  for (const m of src.matchAll(/\bt\(\s*"((?:[^"\\]|\\.)*)"/g)) used.add(m[1]);
  // hasMessage() and the coverage note read ids too.
  for (const m of src.matchAll(/hasMessage\(\s*'([^']+)'/g)) used.add(m[1]);
  // js/lightCurve.js imports the translator as `translate`: `t` is already the
  // chart palette in that module, and a translator called on a colour object
  // would be a crash rather than a wrong word.
  for (const m of src.matchAll(/\btranslate\(\s*'([^']+)'/g)) used.add(m[1]);
}
const html = readFileSync(join(ROOT, 'index.html'), 'utf8');
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
// show it before that locale has been fetched. The catalogue keeps a copy so a
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

const enIds = new Set(Object.keys(EN));
const esIds = new Set(Object.keys(ES));

// The lessonFn.* namespace is deliberately outside this accounting. Those ids
// are computed from what a lesson function says, at the moment it says it, and
// an id with no entry simply renders the English - see js/i18n/lesson.js. So a
// missing one is not a defect and an unused one is not dead weight; what
// matters for them is only that English and Spanish agree, which the last two
// lists check for every id regardless of namespace.
const LOOKED_UP = /^lessonFn\./;

const missingInEn = [...used].filter(id => !enIds.has(id)).sort();
const unused = [...enIds]
  .filter(id => !used.has(id) && !LOOKED_UP.test(id))
  .sort();
const orphanEs = [...esIds].filter(id => !enIds.has(id)).sort();
const untranslated = [...enIds].filter(id => !esIds.has(id)).sort();

const show = (title, list, limit = 40) => {
  console.log(`\n${title}: ${list.length}`);
  for (const id of list.slice(0, limit)) console.log('   ', id);
  if (list.length > limit) console.log(`    … and ${list.length - limit} more`);
};

console.log(`English catalogue: ${enIds.size} messages`);
console.log(
  `Spanish catalogue: ${esIds.size} messages ` +
    `(${Math.round((esIds.size / enIds.size) * 100)}% of English)`
);
console.log(`Ids referenced:    ${used.size}`);

if (missingInEn.length)
  show('MISSING from English (renders as the id)', missingInEn);
if (orphanEs.length)
  show('ORPHANED in Spanish (no English id: a typo)', orphanEs);
if (unused.length) show('Unused English entries', unused, 20);
show('Not yet translated into Spanish', untranslated, 15);

void relative;
process.exit(missingInEn.length || orphanEs.length ? 1 : 0);
