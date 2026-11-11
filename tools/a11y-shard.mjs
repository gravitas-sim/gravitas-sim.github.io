#!/usr/bin/env node
// =============================================================================
// The accessibility shard: its configuration, its coverage and its table
// -----------------------------------------------------------------------------
//   node tools/a11y-shard.mjs check     ACCESSIBILITY.md's table is current
//   node tools/a11y-shard.mjs write     write it
//   node tools/a11y-shard.mjs report    print the coverage table
//
// Prompt 281. tools/a11y-shard.json lists the specs and tests that hold the
// site's accessibility. This reads it, the navigation inventory, the walk
// inventory and the outline record, and says where one of them is missing from
// another: a page with no axe run, no walk or no outline; a spec named
// a11y* or accessibility* that the shard does not list; `npm run a11y` and the
// configuration disagreeing; a registered interaction surface whose test is
// outside the shard. tests/a11yNet.test.js asserts it, and
// e2e/accessibility.spec.js asks `uncoveredRoutes()` for the pages it must give
// a run of their own, so that adding a page to the inventory adds its run.
// =============================================================================

import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = f => readFileSync(path.join(ROOT, f), 'utf8');
const json = f => JSON.parse(read(f));

export const CONFIG_FILE = 'tools/a11y-shard.json';
export const DOC = 'ACCESSIBILITY.md';
const MARKS = ['<!-- a11y-shard:table -->', '<!-- /a11y-shard:table -->'];
const AXE_SPEC = 'e2e/accessibility.spec.js';

/** The surfaces the axe spec names itself: every `covers: 'id'` in SURFACES. */
export function namedCovers(specText) {
  const start = specText.indexOf('const SURFACES = [');
  if (start < 0) return new Set();
  const body = specText.slice(start, specText.indexOf('\n];', start));
  return new Set([...body.matchAll(/^ {4}covers: '([^']+)'/gm)].map(m => m[1]));
}

/** A page's concrete path: a wildcard takes the first page found under it. */
export function concretePath(p, root = ROOT) {
  if (!p.includes('*')) return p;
  const dir = p.slice(0, p.indexOf('*'));
  const first = readdirSync(path.join(root, dir), { withFileTypes: true })
    .filter(
      d =>
        d.isDirectory() &&
        existsSync(path.join(root, dir, d.name, 'index.html'))
    )
    .map(d => d.name)
    .sort()[0];
  return first ? `${dir}${first}/` : dir;
}

/** The inventory's surfaces that have a page of ours (the manual's PDF has none). */
export function pagesOf(nav, contract) {
  const exempt = new Set(Object.keys(contract.inventory.exempt));
  return nav.surfaces.filter(s => !exempt.has(s.id));
}

/** The pages with no named axe surface: the spec gives each its own run. */
export function uncoveredRoutes(root = ROOT) {
  const nav = json('tools/navigation-inventory.json');
  const contract = json('tools/interaction-contract.json');
  const named = namedCovers(read(AXE_SPEC));
  return pagesOf(nav, contract)
    .filter(s => !named.has(s.id))
    .map(s => ({ id: s.id, path: concretePath(s.path, root) }));
}

const factless = s =>
  s.replace(/(<!--fact:[^>]+-->).*?(<!--\/fact-->)/g, '$1#$2');

/** The table "What is checked, on every run". */
export function tableOf(config) {
  const rows = [
    ...config.specs.map(s => [`\`${s.file}\``, s.covers]),
    ...config.tests.map(t => [
      t.files.map(f => `\`${f}\``).join(', '),
      t.covers,
    ]),
  ];
  return [
    '| Check | Covers |',
    '| --- | --- |',
    ...rows.map(r => `| ${r[0]} | ${r[1]} |`),
  ].join('\n');
}

/**
 * Everything missing from something else, as sentences; [] when the net holds.
 *
 * @param {object} i - The inputs (the tree's, or a changed copy in a test)
 */
export function netProblems(i) {
  const out = [];
  const pages = pagesOf(i.nav, i.contract);
  const ids = new Set(i.nav.surfaces.map(s => s.id));
  const routes = new Set(i.routes);
  const named = i.named;
  for (const s of pages) {
    if (!named.has(s.id) && !routes.has(s.id))
      out.push(
        `${s.id}: the navigation inventory lists it and the axe spec gives it no run`
      );
    if (!i.contract.inventory.rows.some(r => r.surface === s.id))
      out.push(`${s.id}: no walk row in tools/interaction-contract.json`);
    if (!i.outlines.pages[s.id] && !i.outlines.exempt[s.id])
      out.push(`${s.id}: no outline in tools/page-outlines.json`);
  }
  for (const id of named)
    if (!ids.has(id))
      out.push(
        `${id}: the axe spec covers a surface the navigation inventory does not hold`
      );
  const themeIds = i.themes.join();
  if (i.specThemes.join() !== themeIds)
    out.push(
      `the axe spec's ALL_THEMES (${i.specThemes}) is not the shell's themes (${themeIds})`
    );
  if (i.perSurfaceThemes)
    out.push('a surface of the axe spec runs in fewer than every theme');
  for (const [id, x] of Object.entries(i.config.axeExempt || {})) {
    if (!ids.has(id))
      out.push(
        `${id}: an axe exemption for a page the navigation inventory does not hold`
      );
    if (!x.rules?.length || !x.reason)
      out.push(`${id}: an axe exemption must name its rules and say why`);
  }
  const listed = new Set(i.config.specs.map(s => s.file));
  for (const f of i.specFiles)
    if (/^e2e\/(a11y|accessibility)/.test(f) && !listed.has(f))
      out.push(`${f} is not in tools/a11y-shard.json`);
  for (const f of listed)
    if (!i.specFiles.includes(f)) out.push(`${f} is listed and does not exist`);
  const inAll = i.config.specs.filter(s => s.inAll).map(s => s.file);
  const scripted = i.scripts.a11y.match(/e2e\/\S+\.spec\.js/g) || [];
  if (inAll.join() !== scripted.join())
    out.push(
      `\`npm run a11y\` runs ${scripted.join(' ')} and the shard lists ${inAll.join(' ')}`
    );
  for (const s of i.config.specs)
    if (s.script && !i.scripts[s.script])
      out.push(`${s.file}: no npm script ${s.script}`);
  // A registered interaction surface keeps its walks: a keyboard test, in a
  // spec that exists (tests/interactionContract.test.js checks the titles).
  for (const surface of i.contract.surfaces) {
    if (!surface.tests?.keyboard)
      out.push(`${surface.id}: registered with no keyboard walk`);
    for (const [kind, t] of Object.entries(surface.tests || {}))
      if (!i.specFiles.includes(t.file))
        out.push(
          `${surface.id}: its ${kind} test names ${t.file}, which is not a spec`
        );
  }
  return out;
}

/** Rules switched off for one page of ours, with the reason. */
export const axeExempt = () => json(CONFIG_FILE).axeExempt || {};

/** The tree's own inputs. */
export function inputs() {
  const spec = read(AXE_SPEC);
  const themeBlock = spec.slice(
    spec.indexOf('const ALL_THEMES = ['),
    spec.indexOf('];', spec.indexOf('const ALL_THEMES = ['))
  );
  const base = spec.slice(
    spec.indexOf('const THEMES = ['),
    spec.indexOf('];', spec.indexOf('const THEMES = ['))
  );
  const ids = b => [...b.matchAll(/id: '([^']+)'/g)].map(m => m[1]);
  const shellThemes = [
    ...read('js/theme.js')
      .slice(read('js/theme.js').indexOf('export const THEMES'))
      .split('];')[0]
      .matchAll(/id: '([^']+)'/g),
  ].map(m => m[1]);
  const specFiles = readdirSync(path.join(ROOT, 'e2e'))
    .filter(f => f.endsWith('.spec.js'))
    .map(f => `e2e/${f}`);
  return {
    nav: json('tools/navigation-inventory.json'),
    contract: json('tools/interaction-contract.json'),
    outlines: json('tools/page-outlines.json'),
    config: json(CONFIG_FILE),
    named: namedCovers(spec),
    routes: uncoveredRoutes().map(r => r.id),
    themes: shellThemes.slice().sort(),
    specThemes: [...ids(base), ...ids(themeBlock)].sort(),
    perSurfaceThemes: /surface\.standalone \? ALL_THEMES : THEMES/.test(spec),
    specFiles,
    scripts: json('package.json').scripts,
  };
}

function current() {
  const text = read(DOC);
  const [a, b] = MARKS.map(m => text.indexOf(m));
  if (a < 0 || b < a)
    throw new Error(`${DOC} has no ${MARKS[0]} ... ${MARKS[1]} region`);
  return { text, a, b, body: text.slice(a + MARKS[0].length, b).trim() };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const cmd = process.argv[2] || 'check';
  const want = tableOf(json(CONFIG_FILE));
  const cur = current();
  if (cmd === 'write') {
    // The fact markers keep the numbers docs:sync wrote.
    const keep = [
      ...cur.body.matchAll(/<!--fact:([^>]+)-->(.*?)<!--\/fact-->/g),
    ];
    let next = want;
    for (const [, key, value] of keep)
      next = next.replace(
        new RegExp(`(<!--fact:${key}-->).*?(<!--/fact-->)`),
        `$1${value}$2`
      );
    writeFileSync(
      path.join(ROOT, DOC),
      `${cur.text.slice(0, cur.a + MARKS[0].length)}\n${next}\n${cur.text.slice(cur.b)}`
    );
    console.log(`${DOC}: table written`);
  } else if (cmd === 'report') {
    const p = netProblems(inputs());
    console.log(p.length ? p.join('\n') : 'the net holds');
    console.log(
      `axe routes given a run of their own: ${uncoveredRoutes()
        .map(r => r.id)
        .join(', ')}`
    );
  } else {
    const ok = factless(cur.body) === factless(want);
    console.log(
      ok
        ? `${DOC}: table current`
        : `${DOC}: table stale; run node tools/a11y-shard.mjs write`
    );
    process.exit(ok ? 0 : 1);
  }
}
