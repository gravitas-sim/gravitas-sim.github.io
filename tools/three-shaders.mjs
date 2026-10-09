// =============================================================================
// three.js shaders in the bundle: pruned to what the 3-D view can reach, then
// written without spare whitespace
// -----------------------------------------------------------------------------
// vendor/three/three.module.js carries every shader chunk as a template
// literal of GLSL - about 130 KB of text in the 3-D view's chunk, which a
// JavaScript minifier cannot touch because it is a string. Two rewrites, both
// in the build only (the file on disk, the dev server and Pages' source mode
// serve what they always served):
//
//  1. pruneShaderChunks. The view draws with MeshStandardMaterial (three's
//     'physical' program) and LineBasicMaterial ('basic'), on a Color
//     background, and the renderer keeps its own depth, distance, background,
//     cube and equirect programs. The classes that would reach any other
//     program (Phong, Lambert, Toon, Matcap, Normal, Points, Sprite, Shadow,
//     Dashed, ShaderMaterial) are not exported by tools/vendor-deps.mjs, so
//     the chunks only they include can never be asked for. Those chunk bodies
//     become empty strings. The set kept is the closure of `#include <name>`
//     over the programs kept, read from the text itself.
//     tests/threeShaders.test.js fails if the vendored entry ever exports a
//     class this closure does not cover.
//
//  2. minifyGlsl. GLSL is free-form outside its preprocessor lines, so each
//     literal is rewritten with the same token sequence and no spare
//     whitespace: comments gone, blanks gone, a space only where two tokens
//     would otherwise lex as one, and a newline kept around every
//     preprocessor line (three reads `#include` and `#pragma unroll_loop_*`
//     line by line). tests/threeShaders.test.js re-lexes every literal both
//     ways and holds the token sequences and directive lines equal.
//
// A literal the rewrite cannot prove safe (a backslash, a ${ expression, a
// line continuation) is left alone.
// =============================================================================

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import * as acorn from 'acorn';

const TOKEN =
  /0[xX][0-9a-fA-F]+[uU]?|(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?[uUfF]*|[A-Za-z_]\w*|<<=|>>=|\+\+|--|<<|>>|<=|>=|==|!=|&&|\|\||\^\^|\+=|-=|\*=|\/=|%=|&=|\|=|\^=|[^\s]/gy;

/** The tokens of one line of GLSL that has no comments and no directive. */
export function lex(line) {
  const out = [];
  TOKEN.lastIndex = 0;
  let m;
  while (TOKEN.lastIndex < line.length) {
    const start = TOKEN.lastIndex;
    const ws = /\s/.exec(line[start]);
    if (ws) {
      TOKEN.lastIndex = start + 1;
      continue;
    }
    m = TOKEN.exec(line);
    if (!m) throw new Error('lex');
    out.push(m[0]);
  }
  return out;
}

const sameTokens = (a, b) =>
  a.length === b.length && a.every((t, i) => t === b[i]);

/** Tokens joined with a space only where leaving it out would change the lexing. */
export function joinTokens(tokens) {
  let out = '';
  let prev = null;
  for (const t of tokens) {
    if (
      prev !== null &&
      (!sameTokens(lex(prev + t), [prev, t]) ||
        (prev === '/' && (t[0] === '/' || t[0] === '*')) ||
        (prev === '*' && t[0] === '/'))
    )
      out += ' ';
    out += t;
    prev = t;
  }
  return out;
}

const stripComments = text =>
  text.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, '');

/**
 * One shader literal's text, minified, or null when it is not safe to touch.
 * Lines are kept apart wherever a preprocessor line is involved.
 */
export function minifyGlsl(raw) {
  if (/[\\]|\$\{|`/.test(raw)) return null;
  const text = stripComments(raw);
  if (/\/\*|\*\//.test(text)) return null;
  const lines = text.split('\n').map(l => l.trim());
  // A directive that continues on the next line is outside what is proven.
  if (lines.some(l => l.endsWith('\\'))) return null;
  const head = /^\s*/.exec(raw)[0];
  const tail = /\s*$/.exec(raw)[0];
  const out = [];
  let run = [];
  const flush = () => {
    if (run.length) out.push(joinTokens(run));
    run = [];
  };
  for (const line of lines) {
    if (!line) continue;
    if (line.startsWith('#')) {
      flush();
      out.push(line.replace(/\s+/g, ' '));
    } else run.push(...lex(line));
  }
  flush();
  let body = out.join('\n');
  // Where the literal began or ended in the middle of a line, or on one of
  // its own, say so the same way: a newline stays a newline, other
  // whitespace stays one space.
  const edge = s => (s.includes('\n') ? '\n' : s ? ' ' : '');
  if (!body) return raw;
  body = edge(head) + body + edge(tail);
  return body;
}

/** Programs the 3-D view and the renderer's own passes can reach. */
export const KEPT_PROGRAMS = [
  'basic',
  'standard',
  'depth',
  'distanceRGBA',
  'background',
  'backgroundCube',
  'cube',
  'equirect',
];

const keyName = p =>
  p.key.type === 'Identifier' ? p.key.name : String(p.key.value);

const walkAll = (node, fn) => {
  if (!node || typeof node.type !== 'string') return;
  fn(node);
  for (const key of Object.keys(node)) {
    const v = node[key];
    if (Array.isArray(v)) for (const c of v) walkAll(c, fn);
    else if (v && typeof v.type === 'string') walkAll(v, fn);
  }
};

const INCLUDE = /#include\s*<([\w./]+)>/g;

/**
 * Which shader chunks the kept programs can ask for, and which are dead.
 * @returns {{dropped: string[], ranges: number[][], bytes: number,
 *   texts: Map<string, string>, alias: Map<string, string>}|null}
 *   null when the file is not shaped the way this reads it.
 */
export function unreachableChunks(source, keep = KEPT_PROGRAMS) {
  const ast = acorn.parse(source, {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ranges: true,
  });
  const top = new Map();
  let chunkObj = null;
  let chunkName = null;
  let lib = null;
  walkAll(ast, n => {
    if (n.type !== 'VariableDeclarator' || n.id.type !== 'Identifier') return;
    if (n.init) top.set(n.id.name, n.init);
    if (n.init?.type !== 'ObjectExpression') return;
    const keys = n.init.properties
      .filter(p => p.type === 'Property' && !p.computed)
      .map(keyName);
    if (keys.includes('alphahash_fragment')) {
      chunkObj = n.init;
      chunkName = n.id.name;
    }
    if (keys.includes('basic') && keys.includes('lambert')) lib = n.init;
  });
  if (!chunkObj || !lib) return null;

  // chunk name -> the node whose text is its body
  const bodies = new Map();
  const identOf = new Map();
  for (const p of chunkObj.properties) {
    if (p.type !== 'Property') return null;
    const v = p.value;
    const node = v.type === 'Identifier' ? top.get(v.name) : v;
    const isText =
      node &&
      (node.type === 'TemplateLiteral' ||
        (node.type === 'Literal' && typeof node.value === 'string'));
    if (!isText) return null;
    bodies.set(keyName(p), node);
    identOf.set(keyName(p), v.type === 'Identifier' ? v.name : null);
  }
  const inBody = n =>
    [...bodies.values()].some(b => n.start >= b.start && n.end <= b.end);

  // Each use of the chunk table by name, and where it sits.
  const uses = [];
  walkAll(ast, n => {
    if (
      n.type === 'MemberExpression' &&
      n.object.type === 'Identifier' &&
      n.object.name === chunkName &&
      !n.computed
    )
      uses.push({ name: n.property.name, start: n.start });
  });
  const libEntry = at =>
    lib.properties.find(p => at >= p.start && at < p.end) || null;
  const roots = new Set();
  for (const u of uses) {
    const entry = libEntry(u.start);
    if (!entry || keep.includes(keyName(entry))) roots.add(u.name);
  }
  // Programs written out in the module itself (the equirect converter, the
  // WebGL program's prefixes) can include chunks as well.
  walkAll(ast, n => {
    if ((n.type !== 'TemplateLiteral' && n.type !== 'Literal') || inBody(n))
      return;
    if (n.type === 'Literal' && typeof n.value !== 'string') return;
    for (const m of source.slice(n.start, n.end).matchAll(INCLUDE))
      roots.add(m[1]);
  });
  // Renamed chunks: a table of [old, new] pairs lets an old name resolve.
  const alias = new Map();
  walkAll(ast, n => {
    if (
      n.type === 'ArrayExpression' &&
      n.elements.length === 2 &&
      n.elements.every(
        e => e?.type === 'Literal' && typeof e.value === 'string'
      ) &&
      bodies.has(n.elements[1].value) &&
      !bodies.has(n.elements[0].value)
    )
      alias.set(n.elements[0].value, n.elements[1].value);
  });

  const reach = new Set();
  const queue = [...roots];
  while (queue.length) {
    const name = queue.pop();
    const target = bodies.has(name) ? name : alias.get(name);
    if (!target || reach.has(target)) continue;
    reach.add(target);
    const b = bodies.get(target);
    for (const m of source.slice(b.start, b.end).matchAll(INCLUDE))
      queue.push(m[1]);
  }

  // A body two names share is dropped only when both are.
  const keepIdent = new Set(
    [...bodies.keys()].filter(k => reach.has(k)).map(k => identOf.get(k))
  );
  const dropped = [];
  const ranges = [];
  let bytes = 0;
  for (const [name, node] of bodies) {
    if (
      reach.has(name) ||
      (identOf.get(name) && keepIdent.has(identOf.get(name)))
    )
      continue;
    dropped.push(name);
    bytes += node.end - node.start;
    ranges.push([node.start, node.end]);
  }
  const texts = new Map(
    [...bodies].map(([name, node]) => [
      name,
      source.slice(node.start, node.end),
    ])
  );
  return { dropped, ranges, bytes, texts, alias };
}

/** The module with every unreachable chunk body emptied, or null. */
export function pruneShaderChunks(source, keep = KEPT_PROGRAMS) {
  let found;
  try {
    found = unreachableChunks(source, keep);
  } catch {
    return null;
  }
  if (!found || !found.ranges.length) return null;
  let code = source;
  for (const [a, b] of [...found.ranges].sort((x, y) => y[0] - x[0]))
    code = code.slice(0, a) + '``' + code.slice(b);
  return code;
}

/** The expression-free template texts of a module that have a line break. */
export function shaderLiterals(source) {
  const ast = acorn.parse(source, {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ranges: true,
  });
  const out = [];
  const walk = (node, tagged) => {
    if (!node || typeof node.type !== 'string') return;
    if (
      node.type === 'TemplateLiteral' &&
      !tagged &&
      node.expressions.length === 0
    ) {
      const q = node.quasis[0];
      const raw = source.slice(q.range[0], q.range[1]);
      if (raw.includes('\n')) out.push({ range: q.range, raw });
    }
    for (const key of Object.keys(node)) {
      const v = node[key];
      if (Array.isArray(v)) for (const c of v) walk(c, false);
      else if (v && typeof v.type === 'string')
        walk(v, node.type === 'TaggedTemplateExpression' && key === 'quasi');
    }
  };
  walk(ast, false);
  return out;
}

export function minifySource(source) {
  let parts;
  try {
    parts = shaderLiterals(source);
  } catch {
    return null;
  }
  let code = source;
  for (const p of parts.sort((a, b) => b.range[0] - a.range[0])) {
    let next = null;
    try {
      next = minifyGlsl(p.raw);
    } catch {
      next = null;
    }
    if (next !== null && next !== p.raw)
      code = code.slice(0, p.range[0]) + next + code.slice(p.range[1]);
  }
  return code === source ? null : code;
}

/** Prune, then minify: what the bundle gets in place of three.module.js. */
export function shadersForBundle(source) {
  const pruned = pruneShaderChunks(source) ?? source;
  return minifySource(pruned) ?? (pruned === source ? null : pruned);
}

export function threeShadersPlugin(root = process.cwd()) {
  const file = path.resolve(root, 'vendor', 'three', 'three.module.js');
  return {
    name: 'three-shaders',
    setup(build) {
      build.onLoad({ filter: /three\.module\.js$/ }, async args => {
        if (args.path !== file) return null;
        const code = shadersForBundle(await readFile(args.path, 'utf8'));
        return code ? { contents: code, loader: 'js' } : null;
      });
    },
  };
}
