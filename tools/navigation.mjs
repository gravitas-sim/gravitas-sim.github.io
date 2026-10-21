#!/usr/bin/env node
// =============================================================================
// The navigation model, measured: the structural navigation checks' reader
// -----------------------------------------------------------------------------
//   node tools/navigation.mjs check     the generated parts of NAVIGATION.md are current
//   node tools/navigation.mjs write     write them
//   node tools/navigation.mjs report    print the measurements and the pending items
//
// Prompt 161. NAVIGATION.md says what a first-time visitor should find: five
// destinations, with everything else reached from within. This file reads what
// the tree has now (the stamped shell of every page, Home's data, the Library's
// catalogs and index) and compares it with tools/navigation-inventory.json,
// which holds the model, the surface-by-surface mapping, the ceilings the
// measurements are held to, and the checks the site fails today by design.
//
// The checks are structural. They prove counts, labels, where a link goes and
// that a first action is on the page it is promised on. They do not prove that
// a visitor understands any of it; only observed people can (NAVIGATION.md,
// "What these checks do not prove").
//
// Pure functions of the tree. tests/navigationChecks.test.js asserts and
// e2e/navigation.spec.js walks the same inventory in a browser.
// =============================================================================

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { hasShell, WORDS, shellPages, pathOf } from './shell.mjs';
import { pages } from './csp.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const INVENTORY_FILE = path.join(
  ROOT,
  'tools/navigation-inventory.json'
);
export const DOC = path.join(ROOT, 'NAVIGATION.md');
const read = f => readFileSync(path.join(ROOT, f), 'utf8');

export const readInventory = () =>
  JSON.parse(readFileSync(INVENTORY_FILE, 'utf8'));

// --- Reading the stamped shell -----------------------------------------------

const ENTITIES = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
};
const decode = s => s.replace(/&(?:amp|lt|gt|quot|#39);/g, m => ENTITIES[m]);
const BOTH =
  /^<span class="gs-en">([\s\S]*?)<\/span><span class="gs-es" lang="es">([\s\S]*?)<\/span>$/;

/** A label as the shell writes it: one span per language, or one plain word. */
export function labelOf(inner) {
  const m = BOTH.exec(inner.trim());
  return m
    ? { en: decode(m[1]), es: decode(m[2]) }
    : { en: decode(inner.trim()), es: decode(inner.trim()) };
}

/** The shell key whose English is this label, or null. */
const keyOfLabel = en =>
  Object.keys(WORDS).find(k => WORDS[k][0] === en) ?? null;

/**
 * The global navigation of a stamped page: its groups in order, each with its
 * links in order.
 * @param {string} html - A page
 * @returns {null|Array<{key: string|null, en: string, es: string, items: Array<{href: string, en: string, es: string}>}>}
 */
export function menuOf(html) {
  const nav = /<nav id="gs-nav"[^>]*>([\s\S]*?)<\/nav>/.exec(html);
  if (!nav) return null;
  const groups = [];
  const group =
    /<details class="gs-group"[^>]*><summary>([\s\S]*?)<\/summary><ul>([\s\S]*?)<\/ul><\/details>/g;
  for (const g of nav[1].matchAll(group)) {
    const label = labelOf(g[1]);
    const items = [
      ...g[2].matchAll(/<li><a href="([^"]+)"[^>]*>([\s\S]*?)<\/a><\/li>/g),
    ].map(m => ({ href: m[1], ...labelOf(m[2]) }));
    groups.push({ key: keyOfLabel(label.en), ...label, items });
  }
  return groups;
}

/** The footer's links, in order. */
export function footerOf(html) {
  const foot = /<footer class="gs-foot">([\s\S]*?)<\/footer>/.exec(html);
  if (!foot) return [];
  return [...foot[1].matchAll(/<a href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)].map(
    m => ({ href: m[1], ...labelOf(m[2]) })
  );
}

// --- The surfaces ------------------------------------------------------------

/** The URL path of a page file. */
export const urlOf = file => pathOf(file);

/** Whether a surface row covers a path (`/x/*` covers everything below /x/). */
export const covers = (row, p) =>
  row.path.endsWith('*') ? p.startsWith(row.path.slice(0, -1)) : row.path === p;

/** The surface rows that cover a path (a sound inventory has exactly one). */
export const surfacesOf = (inventory, p) =>
  inventory.surfaces.filter(r => covers(r, p));

/** The file behind a URL path, or null. */
export function fileOf(p) {
  const bare = p.replace(/[#?].*$/, '');
  const f = bare.endsWith('/')
    ? path.posix.join(bare.slice(1), 'index.html')
    : bare.slice(1);
  return existsSync(path.join(ROOT, f)) ? f : null;
}

// --- Measurements ------------------------------------------------------------

/**
 * Every static count the structural checks hold to a ceiling, from the tree.
 * @returns {Promise<object>} The measurements, named as the inventory's ceilings are
 */
export async function measure() {
  const stamped = shellPages().filter(f => hasShell(read(f), f));
  const menus = stamped.map(f => [f, menuOf(read(f))]);
  const first = menus[0][1];
  const sameEverywhere = menus.every(
    ([, m]) => JSON.stringify(m) === JSON.stringify(first)
  );
  const links = first.flatMap(g => g.items);
  const footer = footerOf(read(stamped.find(f => f !== 'index.html')));

  const welcome = await import('../js/data/welcome.js');
  const homeFragment = read('js/fragments/home.html');
  const libraryBlock =
    /<!-- library:home -->([\s\S]*?)<!-- \/library:home -->/.exec(
      homeFragment
    )?.[1] ?? '';
  const library = JSON.parse(read('library/library.json'));
  const libraryHtml = read('library/index.html');

  return {
    menu: {
      pages: stamped.length,
      sameEverywhere,
      groups: first.length,
      entries: links.length,
      distinctPages: new Set(links.map(l => l.href)).size,
    },
    footer: { links: footer.length },
    home: {
      doors: welcome.ENTRY_CARDS.length,
      resourceLinks: Object.keys(welcome.RESOURCE_LINKS).length,
      featuredScenarios: welcome.FEATURED_SCENARIO_KEYS.length,
      audiences: welcome.AUDIENCES.length,
      libraryKindLinks: (libraryBlock.match(/class="wel-link"/g) ?? []).length,
      countedLinks: (
        libraryBlock.match(/<span class="gs-en">[^<]*\(\d+\)<\/span>/g) ?? []
      ).length,
    },
    library: {
      kinds: library.kinds.length,
      formats: new Set(library.entries.map(e => e.format)).size,
      filters: (
        libraryHtml.match(/<select class="ui-select" id="lib(?!Group)\w+"/g) ??
        []
      ).length,
      entries: library.entries.length,
    },
  };
}

// --- Reachability, from the page sources ---------------------------------------

/** The internal page paths a page's own markup links to (and Home's fragment). */
function linksFrom(p, byUrl) {
  const f = byUrl.get(p);
  if (!f) return [];
  let html = read(f);
  if (p === '/') html += read('js/fragments/home.html');
  return [...html.matchAll(/href="(\/[^"#?]*)(?:[#?][^"]*)?"/g)]
    .map(m => m[1])
    .filter(href => byUrl.has(href));
}

/**
 * How many activations from Home each page is, following only the links the
 * pages' own markup carries (a link a script writes is a browser check's).
 * @returns {Map<string, number>} URL path to clicks; a page with no path is absent
 */
export function clicksFromHome() {
  const files = [...pages(), 'history/original/index.html'];
  const byUrl = new Map(files.map(f => [urlOf(f), f]));
  const dist = new Map([['/', 0]]);
  const queue = ['/'];
  while (queue.length) {
    const here = queue.shift();
    for (const next of linksFrom(here, byUrl))
      if (!dist.has(next)) {
        dist.set(next, dist.get(here) + 1);
        queue.push(next);
      }
  }
  return dist;
}

// --- The generated parts of NAVIGATION.md ------------------------------------

export const MARKS = {
  destinations: [
    '<!-- navigation:destinations -->',
    '<!-- /navigation:destinations -->',
  ],
  surfaces: ['<!-- navigation:surfaces -->', '<!-- /navigation:surfaces -->'],
  kinds: ['<!-- navigation:kinds -->', '<!-- /navigation:kinds -->'],
  ceilings: ['<!-- navigation:ceilings -->', '<!-- /navigation:ceilings -->'],
  pending: ['<!-- navigation:pending -->', '<!-- /navigation:pending -->'],
};

const cell = s => String(s).replace(/\|/g, '\\|');

export function renderDestinations(inv) {
  const rows = inv.destinations.map(
    d =>
      `| ${d.en} / ${d.es} | ${cell(d.says.en)}<br>${cell(d.says.es)} | ${d.first.en} / ${d.first.es} (\`${d.first.path}\`, \`${d.first.selector}\`) |`
  );
  return [
    '| Destination | One line | First action |',
    '| --- | --- | --- |',
    ...rows,
  ].join('\n');
}

export function renderSurfaces(inv) {
  const dest = id =>
    id
      ? inv.destinations.find(d => d.id === id).en
      : 'none (reached from within)';
  const rows = inv.surfaces.map(
    s =>
      `| ${s.en} | \`${s.path}\` | ${s.role} | ${dest(s.destination)} | ${cell(s.from)} | ${s.menu ?? 'none'} |`
  );
  return [
    '| Surface | Path | Role | Destination | Reached from | Menu today |',
    '| --- | --- | --- | --- | --- | --- |',
    ...rows,
  ].join('\n');
}

export function renderKinds(inv) {
  const rows = [
    ...inv.kinds.students.map(
      k => `| \`${k}\` | seen as \`${k}\` | shown to students |`
    ),
    ...Object.entries(inv.kinds.internal).map(
      ([k, v]) =>
        `| \`${k}\` | seen as \`${v}\` | internal kind; ${inv.kinds.why[k]} |`
    ),
  ];
  return [
    '| Library kind | Students see | Why |',
    '| --- | --- | --- |',
    ...rows,
  ].join('\n');
}

const flat = (prefix, obj) =>
  Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === 'object'
      ? flat(`${prefix}.${k}`, v)
      : [[`${prefix}.${k}`, v]]
  );

export function renderCeilings(inv) {
  const rows = flat('', inv.ceilings).map(
    ([k, v]) => `| \`${k.slice(1)}\` | ${v} |`
  );
  return ['| Ceiling | Value |', '| --- | ---: |', ...rows].join('\n');
}

export function renderPending(inv) {
  const rows = inv.futureAcceptance.map(
    f => `| \`${f.id}\` | ${cell(f.says)} | ${f.workedBy} | ${f.activatedBy} |`
  );
  return [
    '| Check | What it holds the site to | Work of | Activated by |',
    '| --- | --- | --- | --- |',
    ...rows,
  ].join('\n');
}

/** NAVIGATION.md with its generated parts rewritten. */
export function withParts(text, inv) {
  const parts = {
    destinations: renderDestinations(inv),
    surfaces: renderSurfaces(inv),
    kinds: renderKinds(inv),
    ceilings: renderCeilings(inv),
    pending: renderPending(inv),
  };
  let out = text;
  for (const [name, [open, close]] of Object.entries(MARKS)) {
    const at = out.indexOf(open);
    const end = out.indexOf(close);
    if (at < 0 || end < at)
      throw new Error(`NAVIGATION.md lacks the ${name} markers`);
    out =
      out.slice(0, at + open.length) +
      '\n' +
      parts[name] +
      '\n' +
      out.slice(end);
  }
  return out;
}

async function main(command) {
  const inv = readInventory();
  if (command === 'check' || command === 'write') {
    const text = read('NAVIGATION.md');
    const next = withParts(text, inv);
    if (command === 'write') {
      writeFileSync(DOC, next);
      console.log('Wrote the generated parts of NAVIGATION.md.');
    } else if (next !== text) {
      console.error(
        'NAVIGATION.md is stale. Run node tools/navigation.mjs write'
      );
      process.exit(1);
    } else console.log('NAVIGATION.md is current.');
    return;
  }
  if (command === 'report') {
    console.log(JSON.stringify(await measure(), null, 2));
    console.log(
      `\nFuture acceptance (${inv.futureAcceptance.length}, none activated):`
    );
    for (const f of inv.futureAcceptance)
      console.log(
        `  ${f.id} (work of ${f.workedBy}, activated by ${f.activatedBy})`
      );
    return;
  }
  console.error('Usage: node tools/navigation.mjs check | write | report');
  process.exit(2);
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  await main(process.argv[2]);
