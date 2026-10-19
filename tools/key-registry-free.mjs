// =============================================================================
// Which modules may import js/names.js without costing a route a request
// -----------------------------------------------------------------------------
// The published site is unbundled, so a module that newly imports the registry
// is one more request on every page that loads the module and did not already
// load the registry (and the registry's bytes with it). Request ceilings do not
// rise under the standing size approval (D-R7-02), so Prompt 141's storage and
// id parts convert only the modules for which that cost is zero, and list the
// rest for a decision.
//
// A module is free when every page that loads it already loads js/names.js.
// A page "loads" a module through the static import graph from its module
// script or a dynamic import() of a literal specifier, and "starts with" the
// registry only through the static graph (a lazy import may not fire before
// the page is usable). It is a screen, not a measurement:
// tools/route-budget.mjs is what judges the result.
//
//   node tools/key-registry-free.mjs      print the modules that are not free
// =============================================================================

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { posix, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(import.meta.url), '..', '..');
const REGISTRY = 'js/names.js';
const SKIP_DIRS = new Set([
  'node_modules',
  'dist',
  'worktrees',
  '.git',
  'tests',
  'e2e',
]);
const IMPORT =
  /(?:^|[\n;])\s*(?:import|export)\s+(?:[^'"()]*?\sfrom\s+)?['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)/g;

const deps = new Map();
function depsOf(file, dynamic) {
  const key = `${dynamic}:${file}`;
  if (deps.has(key)) return deps.get(key);
  const out = [];
  try {
    const src = readFileSync(join(ROOT, file), 'utf8');
    for (const m of src.matchAll(IMPORT)) {
      const spec = m[1] || (dynamic ? m[2] : null);
      if (spec?.startsWith('.'))
        out.push(posix.normalize(posix.join(posix.dirname(file), spec)));
    }
  } catch {
    // A specifier that is not a file here (a data URL, a generated name).
  }
  deps.set(key, out);
  return out;
}

/** The module scripts a page names, and the modules an inline one imports. */
function entriesOf(html) {
  const dir = posix.dirname(html);
  const at = src =>
    src.startsWith('/') ? src.slice(1) : posix.normalize(posix.join(dir, src));
  const out = [];
  const text = readFileSync(join(ROOT, html), 'utf8');
  for (const m of text.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)) {
    if (!/type="module"/.test(m[1])) continue;
    const src = /src="([^"]+)"/.exec(m[1]);
    if (src) out.push(at(src[1]));
    else
      for (const i of m[2].matchAll(
        /import\s+(?:[^'"]*?\sfrom\s+)?['"]([^'"]+)['"]/g
      ))
        out.push(at(i[1]));
  }
  return out;
}

function closure(entries, dynamic) {
  const seen = new Set();
  const stack = [...entries];
  while (stack.length) {
    const f = stack.pop();
    if (seen.has(f)) continue;
    seen.add(f);
    stack.push(...depsOf(f, dynamic));
  }
  return seen;
}

function pages() {
  const out = {};
  const walk = dir => {
    for (const e of readdirSync(join(ROOT, dir), { withFileTypes: true })) {
      if (SKIP_DIRS.has(e.name)) continue;
      const rel = dir ? `${dir}/${e.name}` : e.name;
      if (e.isDirectory()) walk(rel);
      else if (e.name === 'index.html') {
        const entries = entriesOf(rel);
        if (entries.length)
          out[rel] = {
            // What the page may fetch, and what it surely has at start-up: a
            // lazy import may never fire before the page is usable, so it
            // cannot be counted on to have brought the registry.
            loads: closure(entries, true),
            starts: closure(entries, false),
          };
      }
    }
  };
  walk('');
  return out;
}

/**
 * The pages that would gain the registry if this module imported it.
 * @param {string[]} files - Repo-relative module paths
 * @returns {Object<string, string[]>} Module -> pages that lack the registry
 */
export function costs(files) {
  if (!existsSync(join(ROOT, REGISTRY))) return {};
  const all = pages();
  const out = {};
  for (const f of files)
    out[f] = Object.entries(all)
      .filter(([, c]) => c.loads.has(f) && !c.starts.has(REGISTRY))
      .map(([page]) => page);
  return out;
}

/** The modules in `files` that cost no page anything. */
export const freeFiles = files => {
  const all = pages();
  // A module no page reaches by this screen (a worker's, a bundler entry) is
  // not shown to be free: it is left for a decision, not converted by default.
  return files.filter(f => {
    const loading = Object.values(all).filter(c => c.loads.has(f));
    return loading.length && loading.every(c => c.starts.has(REGISTRY));
  });
};

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const loose = JSON.parse(
    readFileSync(join(ROOT, 'tools/key-registry-allowlist.json'), 'utf8')
  ).loose;
  for (const [f, pages] of Object.entries(costs(Object.keys(loose))))
    if (pages.length)
      console.log(`${f}: ${pages.length} page(s) would gain the registry`);
}
