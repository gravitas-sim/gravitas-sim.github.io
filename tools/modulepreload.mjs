#!/usr/bin/env node
// =============================================================================
// Early module fetches, stamped into every page
// -----------------------------------------------------------------------------
//   node tools/modulepreload.mjs --write    write each page's links between its markers
//   node tools/modulepreload.mjs --check    fail when a page's links are not what the rule picks
//   node tools/modulepreload.mjs --report   the levels of each page's closure and what was chosen
//
// The site is published unbundled, so a browser finds the modules of a page one
// import level at a time: it fetches a script, reads its imports, fetches those,
// and so on. Each level is a round trip. A `<link rel="modulepreload">` in the
// page's head names a module the browser would fetch anyway and says so before
// it has read any import, so the levels collapse into one wave.
//
// The rule (one function, `preloadPlan`, picks the list; nothing else does)
// -----------------------------------------------------------------------------
//   1. A page's entries are the modules the parser meets: every
//      `<script type="module" src>` and every static import of an inline
//      `<script type="module">`. The browser starts these without help.
//   2. The closure is every module a static `import` or `export ... from` edge
//      reaches from the entries. A dynamic `import()` is not an edge: it is the
//      way a lazy family stays lazy, and a link would fetch it on every visit.
//   3. A module's level is the length of the shortest chain from an entry to it
//      (an entry is level 0). A module cannot be fetched earlier than its level
//      says unless it is linked.
//   4. The candidates are the modules of level 1 and deeper. They are taken a
//      whole level at a time, the deepest first, because a chain is only
//      shortened when every module on a level is linked: a link on part of a
//      level leaves the same number of round trips and costs the room.
//   5. A page with a served-size ceiling (PAGE_CEILINGS) takes levels while the
//      page, links and their markers included, stays under it; the first level
//      that does not fit ends the list. No ceiling is raised to fit one.
//   6. A page the service worker precaches (precachedTiers in shell.mjs) takes
//      no links. Its bytes count twice against ceilings that cannot be raised
//      here: as served HTML, and as gzip in a precache tier whose ceiling
//      tools/data-budget.json holds (first visit: 0 B of room when this rule
//      was written, idle: 440 B). A link costs about 8 gzip bytes measured
//      on the Studio and the Observatory, so the twelve precached pages would
//      have added 1.9 KB. The rule's answer for such a page is the empty list, and --report
//      says what was left out.
//
// What this does not do: preload a lesson engine. A `#investigation=<id>` link
// opens the application page, whose static closure is Home's; the engine
// is reached by a dynamic import() and is not on it. A 175-byte inline script
// that links the engine's root module when the address names a lesson fits the
// page's served-size room, and moves the engine's first request from 6.2 s to
// 1.2 s on the phone profile's link, but time to usable does not move and the
// page is precached, so the script is not written (PLATFORM_MODEL.md, "Early
// module fetches", has the figures).
//
// Why not the walker in tools/source-closure.mjs: it answers a set question for
// the instructor digest and sits inside that digest, so extending it would mark
// the instructor bundle stale. This walk keeps the level of each module, which
// is the thing the rule needs; tests/modulepreload.test.js holds the two to
// the same set of files for every page.
//
// The links sit in their own region after the shell's head region, so the
// shell and the policy stamp do not touch them. A page whose list is empty has
// no region at all, so it pays no bytes. build.js removes the region from the
// pages it copies into dist/, where the modules are bundled and the paths do
// not exist.
// =============================================================================

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { hasShell, precachedPages, shellPages } from './shell.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Served-size ceilings of pages, in bytes. The number is the one
 * tests/indexDecomposition.test.js holds index.html to; a test reads that file
 * and fails if the two differ, so there is one ceiling and this is its mirror.
 */
export const PAGE_CEILINGS = { 'index.html': Math.ceil(105.1 * 1024) };

export const BEGIN = '<!-- preload:head -->';
export const END = '<!-- /preload:head -->';
const REGION = /\n?<!-- preload:head -->[\s\S]*?<!-- \/preload:head -->/;
const AFTER_SHELL = '<!-- /shell:head -->';

/**
 * Static import and re-export forms with a relative or root-absolute specifier;
 * the same forms, anchored the same way, as tools/source-closure.mjs.
 */
const STATIC_IMPORT =
  /(?:^|\n)\s*(?:import\s*(?:[^;'"]*?\sfrom\s*)?|export\s*(?:\*(?:\s+as\s+\w+)?|\{[^}]*\})\s*from\s*)['"]([^'"]+)['"]/g;
const isFile = spec => spec.startsWith('.') || spec.startsWith('/');

/** The static specifiers of one source text, in order. */
const specifiers = src =>
  [...src.matchAll(STATIC_IMPORT)].map(m => m[1]).filter(isFile);

/** A specifier written in `from` (a repository path), as a repository path. */
const resolveSpec = (from, spec) =>
  spec.startsWith('/')
    ? path.posix.normalize(spec.slice(1))
    : path.posix.normalize(path.posix.join(path.posix.dirname(from), spec));

/** Repository-relative modules a page's parser starts on its own. */
export function pageEntries(page, html) {
  const entries = [];
  const add = f => {
    if (!entries.includes(f)) entries.push(f);
  };
  const dir = path.posix.dirname(page);
  for (const m of html.matchAll(/<script type="module" src="([^"]+)"/g)) {
    add(resolveSpec(path.posix.join(dir, 'x.html'), m[1]));
  }
  for (const m of html.matchAll(
    /<script type="module">([\s\S]*?)<\/script>/g
  )) {
    for (const spec of specifiers(m[1])) {
      add(resolveSpec(path.posix.join(dir, 'x.html'), spec));
    }
  }
  return entries;
}

/**
 * The static closure of `entries` by level: `levels[k]` holds the modules whose
 * shortest chain from an entry has k edges (level 0 is the entries themselves).
 * Throws on a specifier that does not name a file, as a hole in the list would
 * otherwise go unseen.
 */
export function closureLevels(entries, { root = ROOT, read } = {}) {
  const source = read ?? (f => readFileSync(path.join(root, f), 'utf8'));
  const level = new Map(entries.map(e => [e, 0]));
  const levels = [[...entries]];
  for (let frontier = [...entries]; frontier.length;) {
    const next = [];
    for (const file of frontier) {
      if (!read && !existsSync(path.join(root, file))) {
        throw new Error(`${file} is imported but is not a file`);
      }
      for (const spec of specifiers(source(file))) {
        const target = resolveSpec(file, spec);
        if (level.has(target)) continue;
        level.set(target, level.get(file) + 1);
        next.push(target);
      }
    }
    if (next.length) levels.push(next.slice().sort());
    frontier = next;
  }
  return levels;
}

/** The text of the region for these modules, or '' for none. */
export function regionFor(files) {
  if (!files.length) return '';
  const links = files.map(f => `<link rel="modulepreload" href="/${f}" />`);
  return `${BEGIN}\n${links.join('\n')}\n${END}`;
}

/** The page's HTML without its preload region. */
export const withoutPreload = html => html.replace(REGION, '');

/** A page's address as the service worker's lists spell it: `/` or `/dir/`. */
const addressOf = page => {
  const dir = path.posix.dirname(page);
  return dir === '.' ? '/' : `/${dir}/`;
};

/**
 * The modules to link for a page, and what was left out, by the rule above.
 * `html` is the page as written, with or without a region. `ceilings` and
 * `precached` are the rule's two inputs about a page, replaceable for tests.
 */
export function preloadPlan(
  page,
  html,
  { root = ROOT, ceilings = PAGE_CEILINGS, precached = precachedPages() } = {}
) {
  const bare = withoutPreload(html);
  const levels = closureLevels(pageEntries(page, bare), { root });
  const ceiling = ceilings[page];
  const fits = files =>
    ceiling === undefined ||
    Buffer.byteLength(stamp(bare, regionFor(files))) <= ceiling;
  const chosen = [];
  const held = precached.has(addressOf(page));
  // Deepest level first; a level that does not fit ends the list.
  for (let k = levels.length - 1; k >= 1 && !held; k--) {
    if (!fits([...chosen, ...levels[k]])) break;
    chosen.push(...levels[k]);
  }
  const candidates = levels.slice(1).flat();
  return {
    levels,
    files: chosen,
    precached: held,
    skipped: candidates.filter(f => !chosen.includes(f)),
    ceiling,
    room:
      ceiling === undefined ? null : ceiling - Buffer.byteLength(bare, 'utf8'),
  };
}

/** `bare` with `region` placed after the shell's head region. */
function stamp(bare, region) {
  if (!region) return bare;
  const at = bare.indexOf(AFTER_SHELL);
  if (at < 0) return bare;
  const end = at + AFTER_SHELL.length;
  return `${bare.slice(0, end)}\n${region}${bare.slice(end)}`;
}

/**
 * The page with its links written between its markers (and none when the rule
 * picks none). A page without the shell's head region is returned as it is.
 */
export function withPreload(page, html, options) {
  if (!html.includes(AFTER_SHELL)) return html;
  const bare = withoutPreload(html);
  const { files } = preloadPlan(page, bare, options);
  return stamp(bare, regionFor(files));
}

/** The pages that carry the shell, which are the ones that get links. */
export function stampedPages() {
  return shellPages().filter(p =>
    hasShell(readFileSync(path.join(ROOT, p), 'utf8'), p)
  );
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const write = process.argv.includes('--write');
  const report = process.argv.includes('--report');
  const stale = [];
  let linked = 0;
  let total = 0;
  for (const page of stampedPages()) {
    const file = path.join(ROOT, page);
    const html = readFileSync(file, 'utf8');
    const plan = preloadPlan(page, html);
    if (report) {
      console.log(
        `${page}: levels ${plan.levels.map(l => l.length).join('/')}, linked ${plan.files.length}, left out ${plan.skipped.length}` +
          (plan.precached ? ', precached' : '') +
          (plan.room === null ? '' : `, room ${plan.room} B`)
      );
    }
    total++;
    if (plan.files.length) linked++;
    const next = withPreload(page, html);
    if (next === html) continue;
    if (write) writeFileSync(file, next);
    else stale.push(page);
  }
  if (stale.length && !report) {
    console.error(
      `${stale.join('\n')}\nThese pages' preload links are not what the rule picks. Run node tools/modulepreload.mjs --write`
    );
    process.exit(1);
  }
  if (!report) {
    console.log(
      `${write ? 'Wrote' : 'Current:'} the preload links of ${linked} of ${total} stamped pages.`
    );
  }
}
