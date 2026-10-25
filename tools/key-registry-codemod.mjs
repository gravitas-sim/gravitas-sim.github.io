#!/usr/bin/env node
// =============================================================================
// Move allowlisted 'gravitas*' literals into js/names.js (Prompt 141)
// -----------------------------------------------------------------------------
// Rewrites each loose literal of one kind to the registry's export and adds
// the import, so the allowlist (tools/key-registry-allowlist.json) shrinks and
// never grows. It refuses a literal the registry does not know: the name is
// added to js/names.js by hand first, with the same value. It never touches a
// module in the instructor bundle's closure (a changed source there makes the
// bundle stale, and rebuilding it needs the passphrase), and it never changes
// what a literal means: an event name is only moved where it is passed to the
// event API, so an element id that happens to be camel-cased stays.
//
//   node tools/key-registry-codemod.mjs events            report what would move
//   node tools/key-registry-codemod.mjs events --write    rewrite, then record
//   node tools/key-registry-codemod.mjs storage --free    only modules that cost no page a request
//
// Kinds: events (gravitasCamelCase, used as an event name), storage (gravitas_x, gravitas-x), ids (gravitas.x).
// =============================================================================

import { readFileSync, writeFileSync } from 'node:fs';
import { join, relative, dirname, posix, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'acorn';
import * as names from '../js/names.js';
import { sourcePathsFor } from './instructor-freshness.mjs';
import { freeFiles } from './key-registry-free.mjs';
import {
  ALLOWLIST,
  REGISTRY,
  looseLiterals,
  scanTree,
} from './key-registry-scan.mjs';

const ROOT = resolve(fileURLToPath(import.meta.url), '..', '..');

const KINDS = {
  events: { prefix: 'EV_', shape: /^gravitas[A-Z]/ },
  storage: { prefix: 'KEY_', shape: /^gravitas[_-][\w.:-]*$/ },
  ids: { prefix: 'ID_', shape: /^gravitas\.[\w.:-]+$/ },
};

// Modules left as they are, and why. Only one cannot import anything: the
// pools that once made the shell and js/presentation.js unable to take the
// registry moved to js/data/objectNames.js (Prompt 141).
const KEEP = {
  'js/offline.js':
    'copied alone into e2e/serviceWorkerUpdate.spec.js: it can import nothing',
};

// camelCase gravitas* literals that are not event names: an element id and a
// storage property. They stay where they are, and the scan's allowlist keeps
// them until they get names of their own (an ID_ or KEY_ group, a later part).
const NOT_EVENTS = new Set(['gravitasToast', 'gravitasDebug']);

/**
 * Is this literal an event name? It is the argument of a call or a
 * constructor (addEventListener, dispatchSimulationEvent, new CustomEvent), an
 * operand of a comparison (`e.type === ...`), an element of a list of names
 * or a `case`.
 */
function inEventApi(node, parent) {
  if (!parent) return false;
  const value =
    node.type === 'Literal' ? node.value : node.quasis[0].value.cooked;
  if (NOT_EVENTS.has(value)) return false;
  switch (parent.type) {
    case 'CallExpression':
    case 'NewExpression':
      return parent.arguments.includes(node);
    case 'BinaryExpression':
      return ['===', '!==', '==', '!='].includes(parent.operator);
    case 'ArrayExpression':
    case 'SwitchCase':
      return true;
    default:
      return false;
  }
}

/** The registry's name for each value. */
const byValue = new Map(
  Object.entries(names)
    .filter(([k]) => /^(KEY|EV|ID|DOM)_[A-Z0-9_]+$/.test(k))
    .map(([k, v]) => [v, k])
);

/** Every Identifier-or-Literal site of a module with its parent. */
function sitesWithParents(src) {
  const ast = parse(src, {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ranges: true,
  });
  const loose = new Set(looseLiterals(src).map(s => s.start));
  const out = [];
  const walk = (node, parent) => {
    if (!node || typeof node.type !== 'string') return;
    if (loose.has(node.range[0])) out.push({ node, parent });
    for (const key of Object.keys(node)) {
      const v = node[key];
      if (Array.isArray(v)) for (const c of v) walk(c, node);
      else if (v && typeof v.type === 'string') walk(v, node);
    }
  };
  walk(ast, null);
  return { ast, sites: out };
}

/** The source with the import added or extended. */
function withImport(src, ast, file, used) {
  const spec = posix.relative(dirname(file), REGISTRY);
  const path = spec.startsWith('.') ? spec : `./${spec}`;
  const existing = ast.body.find(
    n =>
      n.type === 'ImportDeclaration' &&
      n.source.value === path &&
      n.specifiers.every(s => s.type === 'ImportSpecifier')
  );
  if (existing) {
    const have = new Set(existing.specifiers.map(s => s.imported.name));
    const all = [...new Set([...have, ...used])].sort();
    return (
      src.slice(0, existing.range[0]) +
      `import { ${all.join(', ')} } from '${path}';` +
      src.slice(existing.range[1])
    );
  }
  const imports = ast.body.filter(n => n.type === 'ImportDeclaration');
  const at = imports.length ? imports[imports.length - 1].range[1] : 0;
  const line = `import { ${[...used].sort().join(', ')} } from '${path}';`;
  return imports.length
    ? `${src.slice(0, at)}\n${line}${src.slice(at)}`
    : `${line}\n${src.slice(0)}`;
}

/**
 * Rewrite one module.
 * @param {string} file - Repo-relative path
 * @param {string} kind - A key of KINDS
 * @returns {{src: string, moved: number, left: string[], unknown: string[]}}
 */
export function rewrite(file, kind) {
  return rewriteSource(readFileSync(join(ROOT, file), 'utf8'), file, kind);
}

/**
 * Rewrite a module's source (the pure part of rewrite).
 * @param {string} src - Module source
 * @param {string} file - Repo-relative path, for the import's specifier
 * @param {string} kind - A key of KINDS
 * @returns {{src: string, moved: number, left: string[], unknown: string[]}}
 */
export function rewriteSource(src, file, kind) {
  const { prefix, shape } = KINDS[kind];
  const { sites } = sitesWithParents(src);
  const edits = [];
  const left = [];
  const unknown = [];
  const used = new Set();
  for (const { node, parent } of sites) {
    const value =
      node.type === 'Literal' ? node.value : node.quasis[0].value.cooked;
    if (!shape.test(value)) continue;
    if (kind === 'events' && !inEventApi(node, parent)) {
      left.push(value);
      continue;
    }
    const name = byValue.get(value);
    if (!name || !name.startsWith(prefix)) {
      unknown.push(value);
      continue;
    }
    used.add(name);
    edits.push({ start: node.range[0], end: node.range[1], name });
  }
  if (!edits.length) return { src, moved: 0, left, unknown };
  let out = src;
  for (const e of edits.sort((a, b) => b.start - a.start))
    out = out.slice(0, e.start) + e.name + out.slice(e.end);
  const re = parse(out, {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ranges: true,
  });
  return {
    src: withImport(out, re, file, used),
    moved: edits.length,
    left,
    unknown,
  };
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const kind = process.argv[2];
  if (!KINDS[kind]) {
    console.error(`kind: ${Object.keys(KINDS).join(' | ')}`);
    process.exit(2);
  }
  const { format, resolveConfig } = await import('prettier');
  const write = process.argv.includes('--write');
  const closure = new Set(sourcePathsFor('.').map(p => relative('.', p)));
  const loose = JSON.parse(readFileSync(join(ROOT, ALLOWLIST), 'utf8')).loose;
  // --free: only the modules whose pages already load the registry, so no
  // route gains a request (tools/key-registry-free.mjs).
  const free = process.argv.includes('--free')
    ? new Set(freeFiles(Object.keys(loose)))
    : null;
  const costly = [];
  let moved = 0;
  const skipped = [];
  const over = [];
  const kept = [];
  const ceilings = JSON.parse(
    readFileSync(join(ROOT, 'tools/module-size-ceilings.json'), 'utf8')
  ).ceilings;
  const unknown = new Set();
  const left = [];
  for (const file of Object.keys(loose).sort()) {
    if (KEEP[file]) {
      kept.push(`${file}: ${KEEP[file]}`);
      continue;
    }
    if (closure.has(file)) {
      skipped.push(file);
      continue;
    }
    if (free && !free.has(file)) {
      costly.push(file);
      continue;
    }
    const r = rewrite(file, kind);
    if (r.moved)
      r.src = await format(r.src, {
        ...(await resolveConfig(join(ROOT, file))),
        filepath: join(ROOT, file),
      });
    // A module may not cross 1,500 lines, or its recorded ceiling, by an import:
    // it is left as it is and listed, for a decision.
    const lines = r.src.trimEnd().split('\n').length;
    const ceiling = ceilings[file] ?? 1500;
    if (r.moved && lines > ceiling) {
      over.push(`${file}: ${lines} lines, ceiling ${ceiling}`);
      continue;
    }
    r.unknown.forEach(v => unknown.add(v));
    r.left.forEach(v => left.push(`${file}: ${v}`));
    if (r.moved && write) writeFileSync(join(ROOT, file), r.src);
    moved += r.moved;
  }
  console.log(`${moved} literal(s) ${write ? 'moved' : 'would move'}`);
  if (skipped.length)
    console.log(
      `in the instructor bundle's closure, untouched: ${skipped.length} file(s)`
    );
  if (costly.length)
    console.log(
      `would add a request on a page, untouched: ${costly.length} file(s) (tools/key-registry-free.mjs)`
    );
  if (kept.length) console.log(`kept by decision:\n  ${kept.join('\n  ')}`);
  if (over.length)
    console.log(
      `stopped by a line ceiling, untouched:\n  ${over.join('\n  ')}`
    );
  if (left.length)
    console.log(`kept (not passed to the event API):\n  ${left.join('\n  ')}`);
  if (unknown.size)
    console.log(
      `not in js/names.js (add by hand, same value, then rerun): ${[...unknown].join(', ')}`
    );
  if (write) {
    const found = scanTree();
    const old = JSON.parse(readFileSync(join(ROOT, ALLOWLIST), 'utf8'));
    for (const [f, c] of Object.entries(found))
      for (const [v, n] of Object.entries(c))
        if (n > (old.loose[f]?.[v] ?? 0))
          throw new Error(`${f}: ${v} grew; the allowlist only shrinks`);
    old.loose = found;
    writeFileSync(join(ROOT, ALLOWLIST), JSON.stringify(old, null, 2) + '\n');
  }
}
