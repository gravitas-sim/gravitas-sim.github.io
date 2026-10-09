// =============================================================================
// Key groups: write a shared key prefix once, in the bundle only
// -----------------------------------------------------------------------------
// The message catalogs are flat objects whose keys run to twenty and thirty
// bytes of dotted path ('nb.assist.save.hint'), and a minifier cannot touch a
// property name. About a fifth of the deferred JavaScript is those prefixes,
// repeated on every line of a neighbourhood. This esbuild plugin finds each
// top-level object literal whose keys are all plain strings and rewrites it as
// keyGroups([...]) (js/i18n/keyGroups.js), writing each run of neighbours that
// share a prefix once. Only the keys are rewritten: every value keeps its
// source text, so a concatenation or a template stays exactly what it was.
//
// The result at run time is the same object, with the same keys in the same
// order. tests/keyGroups.test.js builds each transformed file both ways and
// compares them, key order included. The source files are untouched, so the
// dev server, the tests and the authoring tools see what they always saw.
//
// A file the rewrite cannot prove safe (a spread, a computed key, a getter, a
// duplicate key) is left alone.
// =============================================================================

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import * as acorn from 'acorn';

const HELPER = fileURLToPath(
  new URL('../js/i18n/keyGroups.js', import.meta.url)
);
const MIN_KEYS = 5;

// Where the helper lives is a request count. A module shared by the start-up
// graph and by a handful of lazy catalogs is a chunk of its own, and every
// lesson route that loads one of those catalogs would fetch one file more than
// its ceiling in tools/route-budgets.json allows. So the helper is bundled
// once, into the start-up chunk, by the catalog that is always evaluated
// before any other (the owner, js/i18n/en.js), which publishes it; every
// other catalog is loaded on demand, after it, and reads it from there.
const GLOBAL = '__gravitasKeyGroups';
const OWNER = path.join('js', 'i18n', 'en.js');
const PRELUDE = owner =>
  owner
    ? `import { keyGroups as __keyGroups } from ${JSON.stringify(HELPER)};\nglobalThis.${GLOBAL} = __keyGroups;`
    : `const __keyGroups = globalThis.${GLOBAL};`;
const IDENT = /^[A-Za-z_$][\w$]*$/;
const INTEGER_KEY = /^(0|[1-9]\d*)$/;

const SPREAD = Symbol('spread');

function keyOf(prop) {
  if (prop.type === 'SpreadElement') return SPREAD;
  if (
    prop.type !== 'Property' ||
    prop.computed ||
    prop.shorthand ||
    prop.method ||
    prop.kind !== 'init'
  )
    return null;
  if (prop.key.type === 'Literal' && typeof prop.key.value === 'string')
    return prop.key.value;
  if (prop.key.type === 'Identifier') return prop.key.name;
  return null;
}

/** Can `inner` stay in a group without changing the key order? */
function groupable(inner) {
  return inner !== '' && inner !== '__proto__' && !INTEGER_KEY.test(inner);
}

/** Choose the groups for one key list: [{ start, end, prefix }]. */
function plan(keys) {
  const groups = [];
  let i = 0;
  while (i < keys.length) {
    const key = keys[i];
    if (key === SPREAD) {
      i++;
      continue;
    }
    let best = null;
    for (let d = key.indexOf('.'); d !== -1; d = key.indexOf('.', d + 1)) {
      const prefix = key.slice(0, d + 1);
      let end = i;
      let gain = -(prefix.length + 8);
      while (
        end < keys.length &&
        keys[end] !== SPREAD &&
        keys[end].startsWith(prefix) &&
        groupable(keys[end].slice(prefix.length))
      ) {
        const inner = keys[end].slice(prefix.length);
        gain += prefix.length + (IDENT.test(inner) ? 2 : 0);
        end++;
      }
      if (end - i >= 2 && gain > 0 && (!best || gain > best.gain))
        best = { start: i, end, prefix, gain };
    }
    if (best) {
      groups.push(best);
      i = best.end;
    } else {
      i++;
    }
  }
  return groups;
}

/**
 * One group's entries as source text: a plain object of its members, or, when
 * its members themselves run in prefixed neighbourhoods, a list holding
 * further groups ({0: [key, entry, ...]}, read back by keyGroups). Whichever
 * writes fewer bytes.
 * @param {{key: string, text: string, isString: boolean}[]} members
 */
function encodeGroup(members) {
  const flat = `{${members
    .map(m => `${IDENT.test(m.key) ? m.key : JSON.stringify(m.key)}:${m.text}`)
    .join(',')}}`;
  const subs = plan(members.map(m => m.key));
  if (!subs.length) return flat;
  const parts = [];
  const single = m =>
    parts.push(JSON.stringify(m.key), m.isString ? m.text : `[${m.text}]`);
  let at = 0;
  for (const g of subs) {
    for (; at < g.start; at++) single(members[at]);
    parts.push(
      JSON.stringify(g.prefix),
      encodeGroup(
        members
          .slice(g.start, g.end)
          .map(m => ({ ...m, key: m.key.slice(g.prefix.length) }))
      )
    );
    at = g.end;
  }
  for (; at < members.length; at++) single(members[at]);
  const nested = `{0:[${parts.join(',')}]}`;
  return nested.length < flat.length ? nested : flat;
}

/**
 * Rewrite the object literals in one module. Returns null when nothing changed.
 * @param {string} source
 * @returns {{code: string, objects: number} | null}
 */
export function factorSource(source, owner = false) {
  let ast;
  try {
    ast = acorn.parse(source, {
      ecmaVersion: 'latest',
      sourceType: 'module',
      ranges: true,
    });
  } catch {
    return null;
  }
  const edits = [];
  for (const node of ast.body) {
    let decls = [];
    if (node.type === 'VariableDeclaration') decls = node.declarations;
    else if (
      node.type === 'ExportNamedDeclaration' &&
      node.declaration?.type === 'VariableDeclaration'
    ) {
      decls = node.declaration.declarations;
    }
    for (const decl of decls) {
      const obj = decl.init;
      if (
        !obj ||
        obj.type !== 'ObjectExpression' ||
        obj.properties.length < MIN_KEYS
      )
        continue;
      const keys = obj.properties.map(keyOf);
      const named = keys.filter(k => k !== SPREAD);
      if (keys.some(k => k === null) || new Set(named).size !== named.length)
        continue;
      if (!named.every(k => k.includes('.'))) continue; // a dotted-key catalog only
      const groups = plan(keys);
      if (!groups.length) continue;
      const src = p => source.slice(p.value.range[0], p.value.range[1]);
      const parts = [];
      let at = 0;
      const single = idx => {
        const p = obj.properties[idx];
        if (keys[idx] === SPREAD) {
          parts.push(
            '0',
            source.slice(p.argument.range[0], p.argument.range[1])
          );
          return;
        }
        const v = src(p);
        const isString =
          p.value.type === 'Literal' && typeof p.value.value === 'string';
        parts.push(JSON.stringify(keys[idx]), isString ? v : `[${v}]`);
      };
      for (const g of groups) {
        for (; at < g.start; at++) single(at);
        const members = [];
        for (let t = g.start; t < g.end; t++)
          members.push({
            key: keys[t].slice(g.prefix.length),
            text: src(obj.properties[t]),
            isString:
              obj.properties[t].value.type === 'Literal' &&
              typeof obj.properties[t].value.value === 'string',
          });
        parts.push(JSON.stringify(g.prefix), encodeGroup(members));
        at = g.end;
      }
      for (; at < keys.length; at++) single(at);
      edits.push({
        range: obj.range,
        text: `__keyGroups([${parts.join(',')}])`,
      });
    }
  }
  if (!edits.length) return null;
  let code = source;
  for (const e of edits.sort((a, b) => b.range[0] - a.range[0])) {
    code = code.slice(0, e.range[0]) + e.text + code.slice(e.range[1]);
  }
  return { code: `${PRELUDE(owner)}\n${code}`, objects: edits.length };
}

/** esbuild plugin: apply factorSource to the catalogs under js/i18n/. */
export function keyGroupsPlugin(root = process.cwd(), seen = null) {
  const dir = path.resolve(root, 'js', 'i18n') + path.sep;
  return {
    name: 'key-groups',
    setup(build) {
      build.onLoad({ filter: /\.js$/ }, async args => {
        if (!args.path.startsWith(dir) || args.path === HELPER) return null;
        const source = await readFile(args.path, 'utf8');
        const out = factorSource(source, args.path.endsWith(OWNER));
        if (!out) return null;
        if (seen) seen.add(args.path);
        return { contents: out.code, loader: 'js' };
      });
    },
  };
}
