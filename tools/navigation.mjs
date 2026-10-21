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

import { hasShell, WORDS, PLACES, shellPages, pathOf } from './shell.mjs';
import { pages } from './csp.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const INVENTORY_FILE = path.join(
  ROOT,
  'tools/navigation-inventory.json'
);
export const DOC = path.join(ROOT, 'NAVIGATION.md');
export const HOME = 'js/fragments/home.html';
const HOME_MARKS = [
  '<!-- destinations:home -->',
  '<!-- /destinations:home -->',
];
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
 * The global navigation of a stamped page, in order: one entry per destination
 * (Prompt 162; before it the shell stamped five groups of links). Each entry
 * carries its own link, so the shape is a group with one item.
 * @param {string} html - A page
 * @returns {null|Array<{key: string|null, en: string, es: string, dest: string, items: Array<{href: string, en: string, es: string}>}>}
 */
export function menuOf(html) {
  const nav = /<nav id="gs-nav"[^>]*>([\s\S]*?)<\/nav>/.exec(html);
  if (!nav) return null;
  return [
    ...nav[1].matchAll(
      /<li><a href="([^"]+)" data-dest="([^"]+)"(?: aria-current="(?:page|true)")?>([\s\S]*?)<\/a><\/li>/g
    ),
  ].map(m => {
    const label = labelOf(m[3]);
    return {
      key: keyOfLabel(label.en),
      ...label,
      dest: m[2],
      items: [{ href: m[1], ...label }],
    };
  });
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

  const homeFragment = read('js/fragments/home.html');
  const firstWeek =
    /<!-- first-week:home -->([\s\S]*?)<!-- \/first-week:home -->/.exec(
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
      doors: (homeFragment.match(/class="wel-door" data-dest=/g) ?? []).length,
      firstWeekLinks: (firstWeek.match(/<a |data-action="/g) ?? []).length,
      countedLinks: (
        homeFragment.match(
          /\(\d+\)|data-slot="scenario-count"|data-lesson-count/g
        ) ?? []
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

// --- Labels: one thing, one name ----------------------------------------------

const CATALOGS = {
  deferred: ['en.deferred.js', 'EN_DEFERRED', 'es.deferred.js', 'ES_DEFERRED'],
  library: ['en.library.js', 'EN_LIBRARY', 'es.library.js', 'ES_LIBRARY'],
  observatory: [
    'en.observatory.js',
    'EN_OBSERVATORY',
    'es.observatory.js',
    'ES_OBSERVATORY',
  ],
  teaching: ['en.teaching.js', 'EN_TEACHING', 'es.teaching.js', 'ES_TEACHING'],
};

/**
 * The English and Spanish a reference names: `shell:<key>`, `glossary:<id>` or
 * `<catalog>:<message id>`.
 * @param {string} ref - A reference from the inventory's label table
 * @returns {Promise<{en: string, es: string}>} The words
 */
export async function resolveLabel(ref) {
  const [kind, id] = ref.split(':');
  if (kind === 'shell') return { en: WORDS[id][0], es: WORDS[id][1] };
  if (kind === 'glossary') {
    const { LABELS } = await import('./glossary.mjs');
    const label = LABELS.find(l => l.id === id);
    return { en: label.en, es: label.es };
  }
  const [enFile, enName, esFile, esName] = CATALOGS[kind];
  const en = (await import(`../js/i18n/${enFile}`))[enName];
  const es = (await import(`../js/i18n/${esFile}`))[esName];
  return { en: en[id], es: es[id] };
}

/** A label without its article, case folded: "The 3-D lab" is "3-D lab". */
const bare = s =>
  String(s)
    .replace(/^(?:the|el|la|los|las) /i, '')
    .toLowerCase();

/**
 * The things the inventory says are named more than once and are not named
 * alike. The first reference is the standard; each other is held to it.
 * @param {object} inv - The inventory
 * @returns {Promise<Array<{id: string, problems: string[]}>>} Things that diverge
 */
export async function labelDivergences(inv) {
  const out = [];
  for (const thing of inv.labels.sameThing) {
    const [first, ...rest] = thing.refs;
    const standard = await resolveLabel(first);
    const problems = [];
    for (const ref of rest) {
      const got = await resolveLabel(ref);
      for (const lang of ['en', 'es'])
        if (bare(got[lang]) !== bare(standard[lang]))
          problems.push(
            `${ref} says ${JSON.stringify(got[lang])} in ${lang}, ${first} says ${JSON.stringify(standard[lang])}`
          );
    }
    if (problems.length) out.push({ id: thing.id, problems });
  }
  return out;
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
      `| ${s.en} | \`${s.path}\` | ${s.role} | ${dest(s.destination)} | ${cell(s.from)} | ${s.menu ? 'yes' : 'no'} |`
  );
  return [
    '| Surface | Path | Role | Destination | Reached from | In the menu |',
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

const attr = s =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
const both = ({ en, es }) =>
  `<span class="gs-en">${attr(en)}</span><span class="gs-es" lang="es">${attr(es)}</span>`;

/**
 * Home's five destinations, as static markup from the inventory: the name as
 * a link to the destination's own page, its one line, and (Explore only, whose
 * page is the sandbox itself) the places that used to be menu entries. Home
 * costs no JavaScript for it, and no word is written twice.
 * @param {object} inv - The inventory
 * @returns {string} The block between the destinations:home markers
 */
export function renderHomeDestinations(inv) {
  const cards = inv.destinations.map(d => {
    const href = d.first.path;
    const enter = d.id === 'explore' ? ' data-action="enter"' : '';
    // Only Explore carries its places here: its page is the sandbox, which has
    // no place for them; every other destination's page carries its own.
    const places =
      href === '/'
        ? (PLACES[href]?.[1] ?? []).flatMap(([, links]) => links)
        : [];
    const more = places.length
      ? `<ul class="wel-door-more">${places
          .map(
            ([key, to]) =>
              `<li><a href="${to}">${both({ en: WORDS[key][0], es: WORDS[key][1] })}</a></li>`
          )
          .join('')}</ul>`
      : '';
    return `<div class="wel-door" data-dest="${d.id}"><h3 class="wel-door-title"><a href="${href}"${enter}>${both(d)}</a></h3><p class="wel-door-text">${both(d.says)}</p>${more}</div>`;
  });
  return `<div class="wel-doors">\n${cards.join('\n')}\n</div>`;
}

/** Home's fragment with its destinations rewritten. */
export function withHomeDestinations(doc, inv) {
  const [open, close] = HOME_MARKS;
  const at = doc.indexOf(open);
  const end = doc.indexOf(close);
  if (at < 0 || end < at)
    throw new Error(`${HOME} lacks the destinations markers`);
  return `${doc.slice(0, at + open.length)}\n${renderHomeDestinations(inv)}\n${doc.slice(end)}`;
}

async function main(command) {
  const inv = readInventory();
  if (command === 'check' || command === 'write') {
    const text = read('NAVIGATION.md');
    const next = withParts(text, inv);
    const home = read(HOME);
    const nextHome = withHomeDestinations(home, inv);
    if (command === 'write') {
      writeFileSync(DOC, next);
      writeFileSync(path.join(ROOT, HOME), nextHome);
      console.log(
        "Wrote the generated parts of NAVIGATION.md and Home's destinations."
      );
    } else if (next !== text || nextHome !== home) {
      console.error(
        "NAVIGATION.md or Home's destinations are stale. Run node tools/navigation.mjs write"
      );
      process.exit(1);
    } else console.log('NAVIGATION.md and Home are current.');
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
