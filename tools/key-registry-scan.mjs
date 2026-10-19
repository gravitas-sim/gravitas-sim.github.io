#!/usr/bin/env node
// =============================================================================
// Which 'gravitas*' string literals are still loose in js/ (Prompt 107, step 2c)
// -----------------------------------------------------------------------------
// js/names.js is the one module that spells a storage key, an event name or a
// package id. This scan parses every module under js/ and reports each quoted
// string whose whole value starts with "gravitas" and is not in js/names.js:
// code only, never comments, import paths or object property names.
// tests/keyRegistry.test.js compares the result with tools/key-registry-
// allowlist.json, which may only shrink.
//
//   node tools/key-registry-scan.mjs            print the loose literals
//   node tools/key-registry-scan.mjs --record   rewrite the allowlist (never grows it)
// =============================================================================

import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'acorn';

const ROOT = resolve(fileURLToPath(import.meta.url), '..', '..');
export const REGISTRY = 'js/names.js';
export const ALLOWLIST = 'tools/key-registry-allowlist.json';

/**
 * Files the scan does not read, and why. Each is a place that cannot import
 * the registry, so its literals are not loose keys but the thing itself.
 */
export const EXEMPT = Object.freeze({
  'js/compute/frame/worker.js':
    "a classic Worker built from a Blob (an opaque-origin frame may not start a module Worker), so it imports nothing; its two literals are the Python names 'gravitas_input' and 'gravitas_params' in the notebook's namespace, part of the notebook language and not storage",
});

/**
 * What a key looks like: "gravitas" and then name characters. A sentence, a
 * file name (gravitas-code.svg) and a host name are not keys.
 */
const KEY_SHAPE = /^gravitas[\w.:-]*$/;
const NOT_A_KEY = /\.(json|csv|svg|txt|online)$|\.\.\./;

/** Every .js file under a directory, as repo-relative posix paths. */
function jsFiles(dir) {
  const out = [];
  for (const e of readdirSync(join(ROOT, dir), { withFileTypes: true })) {
    const rel = `${dir}/${e.name}`;
    if (e.isDirectory()) out.push(...jsFiles(rel));
    else if (e.name.endsWith('.js')) out.push(rel);
  }
  return out;
}

/** Visit every node of an acorn tree with its parent. */
function walk(node, parent, visit) {
  if (!node || typeof node.type !== 'string') return;
  visit(node, parent);
  for (const key of Object.keys(node)) {
    const v = node[key];
    if (Array.isArray(v)) for (const c of v) walk(c, node, visit);
    else if (v && typeof v.type === 'string') walk(v, node, visit);
  }
}

/**
 * The loose literals of one source: string literals (and template literals
 * with no substitution) beginning "gravitas" that are values in code.
 * @param {string} src - Module source
 * @returns {{value: string, start: number, end: number}[]} Sites
 */
export function looseLiterals(src) {
  const ast = parse(src, {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ranges: true,
  });
  const sites = [];
  walk(ast, null, (node, parent) => {
    let value = null;
    if (node.type === 'Literal' && typeof node.value === 'string') {
      value = node.value;
    } else if (
      node.type === 'TemplateLiteral' &&
      node.expressions.length === 0 &&
      node.quasis.length === 1
    ) {
      value = node.quasis[0].value.cooked;
    }
    if (value === null || !KEY_SHAPE.test(value) || NOT_A_KEY.test(value))
      return;
    if (parent) {
      // An import or export path is a module specifier, not a key.
      if (
        /^(Import|Export\w*)Declaration$/.test(parent.type) &&
        parent.source === node
      )
        return;
      // An object property name stays where it is written.
      if (parent.type === 'Property' && parent.key === node && !parent.computed)
        return;
    }
    sites.push({ value, start: node.range[0], end: node.range[1] });
  });
  return sites;
}

/** `{ file: { value: count } }` for every module but the registry. */
export function scanTree() {
  const found = {};
  for (const file of jsFiles('js').sort()) {
    if (file === REGISTRY || EXEMPT[file]) continue;
    const counts = {};
    for (const s of looseLiterals(readFileSync(join(ROOT, file), 'utf8')))
      counts[s.value] = (counts[s.value] || 0) + 1;
    if (Object.keys(counts).length) found[file] = counts;
  }
  return found;
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const found = scanTree();
  if (process.argv.includes('--record')) {
    const old = JSON.parse(readFileSync(join(ROOT, ALLOWLIST), 'utf8'));
    for (const [f, c] of Object.entries(found))
      for (const [v, n] of Object.entries(c))
        if (n > (old.loose[f]?.[v] ?? 0))
          throw new Error(
            `${f}: ${v} has ${n}, allowlist ${old.loose[f]?.[v] ?? 0}; it only shrinks`
          );
    old.loose = found;
    writeFileSync(join(ROOT, ALLOWLIST), JSON.stringify(old, null, 2) + '\n');
  } else {
    let files = 0;
    let sites = 0;
    let values = new Set();
    for (const [f, c] of Object.entries(found)) {
      files++;
      for (const [v, n] of Object.entries(c)) {
        sites += n;
        values.add(v);
        console.log(`${f}  ${v}  x${n}`);
      }
    }
    console.log(`${sites} sites, ${values.size} values, ${files} files`);
  }
}
