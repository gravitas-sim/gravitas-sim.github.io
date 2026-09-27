// =============================================================================
// Studio round-trip spike: literal-only editing of the real sources
// -----------------------------------------------------------------------------
// Disposable prototype for STUDIO_ROUNDTRIP_GATE.md. Not production code.
//
// The architecture it tests: the Studio never converts a source into another
// form. It parses the repository's own file, finds the object it edits (a
// lesson, its Spanish shadow, an instructor entry, a scenario's settings, a
// catalog entry, a message catalog), and changes only literal values in place
// by splicing at the parser's source ranges. Everything else - functions,
// comments, helper constants, formatting - is carried byte for byte. The
// source file stays the one registry; the Studio's own state is an edit log
// bound to the sources' hashes.
//
// Pure: no DOM, no filesystem. Browser and Node alike.
// =============================================================================

import { parse } from 'acorn';

export const FORMAT = 'gravitas.studio-changes';
export const VERSION = 1;

export const LIMITS = Object.freeze({
  fileBytes: 512 * 1024,
  stringChars: 20000,
  depth: 12,
});

export class StudioError extends Error {
  constructor(code, message, detail = {}) {
    super(message);
    this.name = 'StudioError';
    this.code = code;
    this.detail = detail;
  }
}

export const parseSource = source =>
  parse(source, { ecmaVersion: 'latest', sourceType: 'module', ranges: true });

/** SHA-256 of a text, hex. */
export async function sha256(text) {
  const d = await globalThis.crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(text)
  );
  return Array.from(new Uint8Array(d), b =>
    b.toString(16).padStart(2, '0')
  ).join('');
}

// --- What counts as a literal ------------------------------------------------------

const isNumberNode = n =>
  (n.type === 'Literal' && typeof n.value === 'number') ||
  (n.type === 'UnaryExpression' &&
    n.operator === '-' &&
    n.argument.type === 'Literal' &&
    typeof n.argument.value === 'number');

/** A node whose whole meaning is one JSON value: editable in place. */
export const isLiteral = n =>
  (n.type === 'Literal' && !(n.value instanceof RegExp) && !n.bigint) ||
  isNumberNode(n) ||
  (n.type === 'TemplateLiteral' && n.expressions.length === 0);

/** A node made only of literals, objects and arrays: data, not code. */
export function isDataNode(n, depth = 0) {
  if (depth > LIMITS.depth) return false;
  if (isLiteral(n)) return true;
  if (n.type === 'ArrayExpression')
    return n.elements.every(e => e && isDataNode(e, depth + 1));
  if (n.type === 'ObjectExpression')
    return n.properties.every(
      p =>
        p.type === 'Property' &&
        p.kind === 'init' &&
        !p.computed &&
        !p.method &&
        !p.shorthand &&
        safeKey(keyOf(p)) &&
        isDataNode(p.value, depth + 1)
    );
  return false;
}

export const literalValue = n => {
  if (n.type === 'TemplateLiteral') return n.quasis[0].value.cooked;
  if (n.type === 'UnaryExpression') return -n.argument.value;
  return n.value;
};

const keyOf = p =>
  p.key.type === 'Identifier' ? p.key.name : String(p.key.value);

const UNSAFE_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
const safeKey = k => typeof k === 'string' && !UNSAFE_KEYS.has(k);

// --- Finding the object a file's edits are made in ------------------------------------

/**
 * How to find the edited object in each kind of file.
 *
 *   lesson      the const a lesson module default-exports
 *   shadow      the object a Spanish shadow default-exports
 *   entry       a property of an exported object: an instructor entry, a
 *               scenario catalog entry, a message
 *   preset      the object literal Object.assign(SETTINGS, ...) takes in the
 *               applyPreset branch whose test names the scenario
 */
export function locate(ast, locator) {
  const top = ast.body;
  const constInit = name => {
    for (const s of top) {
      const decl =
        s.type === 'VariableDeclaration'
          ? s
          : s.type === 'ExportNamedDeclaration' &&
              s.declaration?.type === 'VariableDeclaration'
            ? s.declaration
            : null;
      if (!decl || decl.kind !== 'const') continue;
      for (const d of decl.declarations)
        if (d.id.type === 'Identifier' && d.id.name === name) return d.init;
    }
    return null;
  };
  if (locator.kind === 'lesson' || locator.kind === 'shadow') {
    const exp = top.find(s => s.type === 'ExportDefaultDeclaration');
    if (!exp) throw new StudioError('shape', 'the file has no default export');
    const node =
      exp.declaration.type === 'Identifier'
        ? constInit(exp.declaration.name)
        : exp.declaration;
    if (node?.type !== 'ObjectExpression')
      throw new StudioError('shape', 'the default export is not an object');
    return { root: node, constInit };
  }
  if (locator.kind === 'entry') {
    const obj = constInit(locator.object);
    if (obj?.type !== 'ObjectExpression')
      throw new StudioError('shape', `no exported object ${locator.object}`);
    const prop = obj.properties.find(
      p => p.type === 'Property' && keyOf(p) === locator.key
    );
    if (!prop) throw new StudioError('shape', `no entry ${locator.key}`);
    return { root: prop.value, prop, constInit };
  }
  if (locator.kind === 'preset') {
    let found = null;
    const visit = n => {
      if (!n || typeof n.type !== 'string' || found) return;
      if (
        n.type === 'IfStatement' &&
        n.test.type === 'BinaryExpression' &&
        n.test.operator === '===' &&
        n.test.right.type === 'Literal' &&
        n.test.right.value === locator.name
      ) {
        const stmt = n.consequent.body?.[0];
        const call = stmt?.expression;
        if (
          call?.type === 'CallExpression' &&
          call.callee.type === 'MemberExpression' &&
          call.callee.object.name === 'Object' &&
          call.callee.property.name === 'assign' &&
          call.arguments[1]?.type === 'ObjectExpression'
        )
          found = call.arguments[1];
        return;
      }
      for (const v of Object.values(n)) {
        if (Array.isArray(v)) v.forEach(visit);
        else if (v && typeof v.type === 'string') visit(v);
      }
    };
    top.forEach(visit);
    if (!found)
      throw new StudioError(
        'shape',
        `no Object.assign branch for ${locator.name}`
      );
    return { root: found, constInit };
  }
  throw new StudioError('locator', `unknown locator ${locator.kind}`);
}

/**
 * The node at a path of property names and indices, following a value that
 * is a top-level const's name into the const (a shared constant, which the
 * result says it is).
 */
export function nodeAt(located, path) {
  let n = located.root;
  let shared = null;
  for (const step of path) {
    if (n.type === 'Identifier') {
      const target = located.constInit(n.name);
      if (!target) throw new StudioError('path', `${n.name} is not a const`);
      shared = shared ?? n.name;
      n = target;
    }
    if (n.type === 'ObjectExpression') {
      const p = n.properties.find(
        q => q.type === 'Property' && keyOf(q) === String(step)
      );
      if (!p) throw new StudioError('path', `no ${step} in ${path.join('.')}`);
      n = p.value;
    } else if (n.type === 'ArrayExpression') {
      if (!Number.isInteger(step) || !n.elements[step])
        throw new StudioError('path', `no index ${step} in ${path.join('.')}`);
      n = n.elements[step];
    } else
      throw new StudioError(
        'code',
        `${path.join('.')} passes through code (${n.type}), which is read-only`
      );
  }
  return { node: n, shared };
}

// --- What an edit may carry -----------------------------------------------------------

// Lesson prose carries these four inline tags and nothing else
// (js/investigations.js prose()); anything else that looks like markup, a
// script URL or an event handler is refused.
const ALLOWED_TAG = /^<\/?(strong|em|sub|sup)>$/i;

/** Refuse anything that is not plain data a lesson could already hold. */
export function checkValue(v, depth = 0) {
  if (depth > LIMITS.depth)
    throw new StudioError('depth', 'the value is nested too deeply');
  if (v === null || typeof v === 'boolean') return;
  if (typeof v === 'number') {
    if (!Number.isFinite(v))
      throw new StudioError('number', 'a number must be finite');
    return;
  }
  if (typeof v === 'string') {
    if (v.length > LIMITS.stringChars)
      throw new StudioError('size', `a string of ${v.length} characters`);
    for (const tag of v.match(/<[^>]*>?/g) || [])
      if (!ALLOWED_TAG.test(tag))
        throw new StudioError('markup', `markup that prose never carries: ${tag.slice(0, 40)}`);
    if (/javascript:|data:|vbscript:/i.test(v))
      throw new StudioError('url', 'a script or data URL');
    // eslint-disable-next-line no-control-regex
    if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(v))
      throw new StudioError('control', 'a control character');
    return;
  }
  if (Array.isArray(v)) {
    v.forEach(x => checkValue(x, depth + 1));
    return;
  }
  if (typeof v === 'object' && Object.getPrototypeOf(v) === Object.prototype) {
    for (const k of Object.keys(v)) {
      if (!safeKey(k)) throw new StudioError('key', `the key ${k}`);
      const d = Object.getOwnPropertyDescriptor(v, k);
      if (d.get || d.set) throw new StudioError('getter', `a getter on ${k}`);
      checkValue(v[k], depth + 1);
    }
    // A key that JSON.parse made own but Object.keys shows as __proto__ is
    // caught above; one set through the prototype is not own and not copied.
    return;
  }
  throw new StudioError(
    'type',
    `a ${typeof v} is not data: code is never edited in the Studio`
  );
}

// --- Writing values back in the file's own style ---------------------------------------

const quoteSingle = s =>
  `'${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n')}'`;
const quoteTemplate = s =>
  `\`${s.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${')}\``;

function renderScalar(v, like) {
  if (typeof v === 'string')
    return like?.type === 'TemplateLiteral' ? quoteTemplate(v) : quoteSingle(v);
  return JSON.stringify(v);
}

/** A data value as source, indented to sit at `indent`. */
export function render(v, indent) {
  const inner = `${indent}  `;
  if (Array.isArray(v)) {
    if (!v.length) return '[]';
    return `[\n${v.map(x => `${inner}${render(x, inner)},`).join('\n')}\n${indent}]`;
  }
  if (v && typeof v === 'object') {
    const keys = Object.keys(v);
    if (!keys.length) return '{}';
    const key = k => (/^[A-Za-z_$][\w$]*$/.test(k) ? k : quoteSingle(k));
    return `{\n${keys.map(k => `${inner}${key(k)}: ${render(v[k], inner)},`).join('\n')}\n${indent}}`;
  }
  return renderScalar(v, null);
}

const lineStart = (src, at) => src.lastIndexOf('\n', at - 1) + 1;
const indentAt = (src, at) => {
  const ls = lineStart(src, at);
  return /^[ \t]*/.exec(src.slice(ls))[0];
};

// --- Edits ------------------------------------------------------------------------------

/**
 * One edit applied to a file's source, as a splice. Returns the new source
 * and the range of the source it replaced, for the byte check.
 *
 *   { op: 'set', path, value }            a literal replaced
 *   { op: 'insert', path, index, value }  a data element inserted in an array
 *   { op: 'remove', path, index }         an array element removed
 *   { op: 'rekey', path, key }            an object key (a literal) renamed
 */
export function applyEdit(source, locator, edit) {
  const ast = parseSource(source);
  const located = locate(ast, locator);
  if (edit.op === 'set') {
    checkValue(edit.value);
    const { node, shared } = nodeAt(located, edit.path);
    if (!isLiteral(node))
      throw new StudioError(
        'code',
        `${edit.path.join('.')} is ${node.type}, not a literal: read-only`
      );
    if (typeof edit.value === 'object' && edit.value !== null)
      throw new StudioError('type', 'set replaces a literal with a literal');
    const text = renderScalar(edit.value, node);
    return {
      source: source.slice(0, node.start) + text + source.slice(node.end),
      range: [node.start, node.end, text.length],
      shared,
    };
  }
  if (edit.op === 'insert' || edit.op === 'remove') {
    const { node: arr, shared } = nodeAt(located, edit.path);
    if (arr.type !== 'ArrayExpression')
      throw new StudioError('path', `${edit.path.join('.')} is not an array`);
    const els = arr.elements;
    if (edit.op === 'insert') {
      checkValue(edit.value);
      const at = Math.max(0, Math.min(edit.index, els.length));
      const anchor = els[at] ?? els[els.length - 1];
      const indent = anchor ? indentAt(source, anchor.start) : '  ';
      const text = render(edit.value, indent);
      if (els[at]) {
        // Before an element: "<value>,\n<indent>" at the element's start.
        const pos = els[at].start;
        const ins = `${text},\n${indent}`;
        return {
          source: source.slice(0, pos) + ins + source.slice(pos),
          range: [pos, pos, ins.length],
          shared,
        };
      }
      // After the last element, keeping its trailing comma style.
      const last = els[els.length - 1];
      let pos = last.end;
      const hasComma = source[pos] === ',';
      if (hasComma) pos += 1;
      const ins = `${hasComma ? '' : ','}\n${indent}${text}${hasComma ? ',' : ''}`;
      return {
        source: source.slice(0, pos) + ins + source.slice(pos),
        range: [pos, pos, ins.length],
        shared,
      };
    }
    const el = els[edit.index];
    if (!el) throw new StudioError('path', `no index ${edit.index}`);
    // From the element's line start to the next element's line start.
    const from = lineStart(source, el.start);
    const next = els[edit.index + 1];
    let to;
    if (next) to = lineStart(source, next.start);
    else {
      to = el.end;
      if (source[to] === ',') to += 1;
      while (source[to] === ' ' || source[to] === '\t') to += 1;
      if (source[to] === '\n') to += 1;
    }
    return {
      source: source.slice(0, from) + source.slice(to),
      range: [from, to, 0],
      shared,
    };
  }
  if (edit.op === 'rekey') {
    const parentPath = edit.path.slice(0, -1);
    const { node: obj } = nodeAt(located, parentPath);
    if (obj.type !== 'ObjectExpression')
      throw new StudioError('path', 'rekey needs an object');
    const prop = obj.properties.find(
      p => p.type === 'Property' && keyOf(p) === String(edit.path.at(-1))
    );
    if (!prop) throw new StudioError('path', `no key ${edit.path.at(-1)}`);
    if (!safeKey(String(edit.key)))
      throw new StudioError('key', `the key ${edit.key}`);
    const k = String(edit.key);
    const text =
      prop.key.type === 'Literal' && typeof prop.key.value === 'number'
        ? String(Number(k))
        : /^[A-Za-z_$][\w$]*$/.test(k)
          ? k
          : quoteSingle(k);
    return {
      source: source.slice(0, prop.key.start) + text + source.slice(prop.key.end),
      range: [prop.key.start, prop.key.end, text.length],
      shared: null,
    };
  }
  throw new StudioError('op', `unknown op ${edit.op}`);
}

// --- Verifying that an edited file is still the same code -------------------------------

/**
 * A canonical form of a syntax tree with every literal's value masked: two
 * files with equal shapes differ only in their literals.
 */
export function shapeOf(node) {
  if (Array.isArray(node)) return node.map(shapeOf);
  if (!node || typeof node !== 'object') return node;
  if (isLiteral(node)) return 'LIT';
  // A property's key is part of the shape, not a value to mask.
  if (node.type === 'Property')
    return {
      t: 'Property',
      key: node.computed ? shapeOf(node.key) : keyOf(node),
      value: shapeOf(node.value),
      kind: node.kind,
      computed: node.computed,
      method: node.method,
      shorthand: node.shorthand,
    };
  const out = { t: node.type };
  for (const [k, v] of Object.entries(node)) {
    if (['start', 'end', 'range', 'loc', 'raw', 'type'].includes(k)) continue;
    if (v && typeof v === 'object') out[k] = shapeOf(v);
    else out[k] = v;
  }
  return out;
}

/**
 * The shape of a tree with its data set aside: a data-only subtree is 'DATA',
 * and a data-only element of an array is dropped, so data may be edited,
 * added or removed without changing it. Code is kept whole (codeOf compares
 * its text).
 */
export function looseShapeOf(node) {
  if (Array.isArray(node)) return node.map(looseShapeOf);
  if (!node || typeof node !== 'object') return node;
  if (typeof node.type === 'string' && isDataNode(node)) return 'DATA';
  if (/Function/.test(node.type ?? '')) return 'CODE';
  if (node.type === 'ArrayExpression')
    return {
      t: 'ArrayExpression',
      elements: node.elements.filter(e => !(e && isDataNode(e))).map(looseShapeOf),
    };
  if (node.type === 'Property')
    return {
      t: 'Property',
      key: node.computed ? looseShapeOf(node.key) : keyOf(node),
      value: looseShapeOf(node.value),
      kind: node.kind,
      computed: node.computed,
    };
  const out = { t: node.type };
  for (const [k, v] of Object.entries(node)) {
    if (['start', 'end', 'range', 'loc', 'raw', 'type', 'value'].includes(k)) continue;
    if (v && typeof v === 'object') out[k] = looseShapeOf(v);
    else out[k] = v;
  }
  return out;
}

/** The source text of every function in a file, in order. */
export function codeOf(source) {
  const out = [];
  const visit = n => {
    if (!n || typeof n.type !== 'string') return;
    if (
      n.type === 'FunctionExpression' ||
      n.type === 'ArrowFunctionExpression' ||
      n.type === 'FunctionDeclaration'
    ) {
      out.push(source.slice(n.start, n.end));
      return;
    }
    for (const v of Object.values(n)) {
      if (Array.isArray(v)) v.forEach(visit);
      else if (v && typeof v.type === 'string') visit(v);
    }
  };
  parseSource(source).body.forEach(visit);
  return out;
}

/**
 * Refuse a whole file offered to the Studio unless it is a literal-only
 * derivative of the repository's own: the same imports (none, for a lesson),
 * the same code byte for byte, and nothing but data where the base has data.
 */
export function checkImport(text, baseSource, locator) {
  if (typeof text !== 'string')
    throw new StudioError('type', 'an import is text');
  if (new TextEncoder().encode(text).length > LIMITS.fileBytes)
    throw new StudioError('size', 'the file is larger than 512 KB');
  let ast;
  try {
    ast = parseSource(text);
  } catch (e) {
    throw new StudioError('parse', `it does not parse: ${e.message}`);
  }
  const base = parseSource(baseSource);
  const imports = a =>
    a.body.filter(s => s.type === 'ImportDeclaration' || s.type === 'ImportExpression').length;
  if (imports(ast) !== imports(base))
    throw new StudioError('import', 'the file imports what the repository’s does not');
  locate(ast, locator);
  const code = codeOf(text);
  const baseCode = codeOf(baseSource);
  if (code.length !== baseCode.length || code.some((c, i) => c !== baseCode[i]))
    throw new StudioError(
      'code',
      'the file’s code is not the repository’s: only its literals may differ'
    );
  // Outside the code, the same shape as the repository's once every data-only
  // part is set aside: data may change, be added or be removed (a step, an
  // option), but no call, getter, template expression, spread or identifier
  // can appear where the base has none.
  if (JSON.stringify(looseShapeOf(ast)) !== JSON.stringify(looseShapeOf(base)))
    throw new StudioError(
      'data',
      'the file is not the repository’s with only its data changed'
    );
  // And every string the Studio would show is one prose may carry.
  const walkStrings = n => {
    if (isLiteral(n)) {
      const v = literalValue(n);
      if (typeof v === 'string') checkValue(v);
      return;
    }
    if (n.type === 'Property' && !n.computed && !safeKey(keyOf(n)))
      throw new StudioError('key', `the key ${keyOf(n)}`);
    for (const x of Object.values(n)) {
      if (Array.isArray(x)) x.forEach(y => y && typeof y.type === 'string' && walkStrings(y));
      else if (x && typeof x.type === 'string' && !/Function/.test(x.type)) walkStrings(x);
    }
  };
  walkStrings(locate(ast, locator).root);
  return true;
}

// --- The change set: the Studio's only state ---------------------------------------------

/**
 * Replay a change set on the sources it was recorded against.
 * @param {{format: string, version: number, bases: Record<string, string>,
 *   edits: Array<object>}} changes
 * @param {Record<string, {source: string, locator: object}>} files
 */
export async function replay(changes, files) {
  const c = migrate(changes);
  for (const [file, hash] of Object.entries(c.bases)) {
    if (!files[file]) throw new StudioError('base', `no source for ${file}`);
    if ((await sha256(files[file].source)) !== hash)
      throw new StudioError('base', `${file} is not the source this was recorded against`);
  }
  const out = Object.fromEntries(Object.entries(files).map(([f, v]) => [f, v.source]));
  const ranges = Object.fromEntries(Object.keys(files).map(f => [f, []]));
  for (const e of c.edits) {
    const r = applyEdit(out[e.file], files[e.file].locator, e);
    out[e.file] = r.source;
    ranges[e.file].push(r.range);
  }
  return { sources: out, ranges };
}

// Version 0 was the first sketch: one file, `set` only, dotted paths.
export const MIGRATIONS = {
  0: c => ({
    format: FORMAT,
    version: 1,
    bases: { [c.file]: c.base },
    edits: c.edits.map(e => ({
      file: c.file,
      op: 'set',
      path: e.path.split('.').map(k => (/^\d+$/.test(k) ? Number(k) : k)),
      value: e.value,
    })),
  }),
};

export function migrate(changes) {
  let c = changes;
  if (c?.format !== FORMAT && c?.v === 0) c = MIGRATIONS[0](c);
  if (c?.format !== FORMAT) throw new StudioError('format', 'not a Studio change set');
  if (c.version > VERSION)
    throw new StudioError('version', `version ${c.version} is newer than this Studio`);
  return c;
}

// --- A line diff, for review ---------------------------------------------------------------

/** A unified-style line diff (LCS), enough for review of a small file. */
export function lineDiff(a, b, name = 'file') {
  const x = a.split('\n');
  const y = b.split('\n');
  const n = x.length;
  const m = y.length;
  const L = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--)
      L[i][j] = x[i] === y[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const out = [`--- a/${name}`, `+++ b/${name}`];
  let i = 0;
  let j = 0;
  while (i < n || j < m) {
    if (i < n && j < m && x[i] === y[j]) {
      i++;
      j++;
    } else if (j < m && (i === n || L[i][j + 1] >= L[i + 1][j])) out.push(`+${y[j++]}`);
    else out.push(`-${x[i++]}`);
  }
  return out;
}
