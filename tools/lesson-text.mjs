#!/usr/bin/env node
// =============================================================================
// Spanish lesson text, keyed by step: the source, and the files the app loads
// -----------------------------------------------------------------------------
// The app merges a Spanish shadow into its English lesson by array index
// (js/data/investigations/i18n.js), which is the smallest thing to ship. An
// insert or a move in the English therefore shifted every later Spanish step.
// So the text a person edits is keyed by each step's sid, under lesson-text/:
//
//   lesson-text/es/<id>.js           js/data/investigations/es/<id>.js
//   lesson-text/depth-es/<id>.js     js/data/investigations/depth/es/<id>.js
//   lesson-text/sequences/<x>.js     the `export const <NAME>_ES` statements of
//                                    js/data/investigations/<x>.js
//
// and this tool writes the index-aligned form the app loads: each `steps` map
// becomes a list in the English lesson's step order, with `null` for a step
// that has no Spanish yet (the merge keeps its English). Nothing else in a
// source file changes. The sources are never imported by the app, so they cost
// no byte of what is served, and a step added, moved or removed in the English
// moves no other Spanish: regenerate.
//
//   node tools/lesson-text.mjs --write     write the files the app loads
//   node tools/lesson-text.mjs --check     fail if any is stale, or if a source
//                                          step has no English sid or an
//                                          English step has no Spanish step
//
// Never edit the generated files or the generated statements by hand.
// =============================================================================

import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as acorn from 'acorn';
import * as prettierNamespace from 'prettier';

// Prettier's exports arrive in two shapes (Jest's ESM interop and Node's own loader).
const prettier = prettierNamespace.format
  ? prettierNamespace
  : prettierNamespace.default;

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const SOURCES = 'lesson-text';
export const RULE_ID = 'i18n/steps';
export const RULE_DESCRIPTION =
  'Spanish lesson text is keyed by step id: a Spanish step must name an English step, and every English step needs a Spanish step';
const INV = 'js/data/investigations';

/** The three kinds of source: its directory, the file it makes, and how. */
const KINDS = [
  { dir: 'es', out: `${INV}/es`, whole: true, depth: false },
  { dir: 'depth-es', out: `${INV}/depth/es`, whole: true, depth: true },
  { dir: 'sequences', out: INV, whole: false },
];

const keyName = k =>
  k.type === 'Identifier'
    ? k.name
    : k.type === 'Literal'
      ? String(k.value)
      : null;

/** A `steps` value written as a map: every property a key and an object of words. */
const isMap = n =>
  n?.type === 'ObjectExpression' &&
  n.properties.every(
    p =>
      p.type === 'Property' &&
      keyName(p.key) !== null &&
      p.value.type === 'ObjectExpression'
  );

/** Every `steps: {map}` directly under an object that is a top-level value. */
function stepMaps(node, out = []) {
  if (node?.type === 'ObjectExpression')
    for (const p of node.properties)
      if (p.type === 'Property' && keyName(p.key) === 'steps' && isMap(p.value))
        out.push(p.value);
  return out;
}

/**
 * Which English steps a map belongs to: the lesson of the right kind that has
 * the most of its keys as sids, unique.
 */
function lessonFor(map, lessons, hint) {
  const keys = map.properties.map(p => keyName(p.key));
  const pool = lessons.filter(
    l =>
      (hint.depth === undefined || l.depth === hint.depth) &&
      (!hint.id || l.id === hint.id)
  );
  const scored = pool
    .map(l => ({ l, n: keys.filter(k => l.sids.includes(k)).length }))
    .filter(x => x.n > 0)
    .sort((a, b) => b.n - a.n);
  // A map with no steps yet (a scaffold) belongs to its own file's lesson.
  if (!keys.length && hint.id && pool.length === 1) return { lesson: pool[0] };
  if (!scored.length) return { error: 'matches the steps of no lesson' };
  if (scored[1] && scored[1].n === scored[0].n)
    return { error: `matches ${scored[0].l.id} and ${scored[1].l.id} equally` };
  return { lesson: scored[0].l };
}

/**
 * The list text for one map, and what is wrong with it.
 * @returns {{edits: Array, findings: string[]}} Text edits (offsets in `src`)
 */
function convertMap(src, map, lesson, label) {
  const findings = [];
  const props = map.properties;
  const keys = props.map(p => keyName(p.key));
  for (const k of keys)
    if (!lesson.sids.includes(k))
      findings.push({
        lesson: lesson.id,
        message: `${label}: steps.${k} names no step of the lesson, so this Spanish step is dropped`,
      });
  for (const sid of lesson.sids)
    if (!keys.includes(sid))
      findings.push({
        lesson: lesson.id,
        sid,
        message: `${label}: step "${sid}" has no Spanish step`,
      });
  const inOrder =
    keys.length === lesson.sids.length &&
    keys.every((k, i) => k === lesson.sids[i]);
  const edits = [];
  if (inOrder) {
    // The usual case: change the brackets and drop the keys; every comment
    // and every blank line stays where it was.
    edits.push({ at: map.start, del: 1, text: '[' });
    for (const p of props)
      edits.push({ at: p.start, del: p.value.start - p.start, text: '' });
    edits.push({ at: map.end - 1, del: 1, text: ']' });
  } else {
    const body = lesson.sids
      .map(sid => {
        const p = props.find(x => keyName(x.key) === sid);
        return p ? src.slice(p.value.start, p.value.end) : 'null';
      })
      .join(',\n');
    edits.push({
      at: map.start,
      del: map.end - map.start,
      text: `[\n${body}\n]`,
    });
  }
  return { edits, findings };
}

const apply = (src, edits) =>
  edits
    .slice()
    .sort((a, b) => b.at - a.at)
    .reduce((s, e) => s.slice(0, e.at) + e.text + s.slice(e.at + e.del), src);

const parse = (text, file) => {
  try {
    return acorn.parse(text, { ecmaVersion: 'latest', sourceType: 'module' });
  } catch (e) {
    throw new Error(`${file}: ${e.message}`);
  }
};

/** The top-level objects of a module that can hold steps, with their names. */
function holders(ast) {
  const out = [];
  for (const st of ast.body) {
    if (
      st.type === 'ExportDefaultDeclaration' &&
      st.declaration.type === 'ObjectExpression'
    )
      out.push({ name: 'default', node: st.declaration, st });
    if (
      st.type === 'ExportNamedDeclaration' &&
      st.declaration?.type === 'VariableDeclaration'
    ) {
      const d = st.declaration.declarations[0];
      if (d.init?.type === 'ObjectExpression')
        out.push({ name: d.id.name, node: d.init, st });
    }
  }
  return out;
}

/**
 * Convert one source file's text.
 * @param {string} text - The keyed source
 * @param {Array<{id: string, depth: boolean, sids: string[]}>} lessons - The English steps
 * @param {{file: string, id?: string, depth?: boolean}} hint - Where it came from
 * @returns {{text: string, findings: object[], names: string[], statements: Map<string, string>}}
 */
export function convertSource(text, lessons, hint) {
  const ast = parse(text, hint.file);
  const findings = [];
  const edits = [];
  const statements = new Map();
  const names = [];
  const covered = [];
  for (const h of holders(ast)) {
    const raw = h.node.properties.find(
      p => p.type === 'Property' && keyName(p.key) === 'steps'
    );
    const maps = stepMaps(h.node);
    if (
      raw &&
      !maps.length &&
      raw.value.type === 'ArrayExpression' &&
      raw.value.elements.length
    ) {
      findings.push({
        lesson: hint.id ?? null,
        message: `${hint.file}${h.name === 'default' ? '' : ` ${h.name}`}: steps is a list; write it as a map keyed by step id`,
      });
      continue;
    }
    if (!maps.length) continue;
    const depth = hint.depth ?? /_DEEPER/.test(h.name);
    const label = `${hint.file}${h.name === 'default' ? '' : ` ${h.name}`}`;
    const found = lessonFor(maps[0], lessons, { depth, id: hint.id });
    if (found.error) {
      findings.push({
        lesson: hint.id ?? null,
        message: `${label}: steps ${found.error}`,
      });
      continue;
    }
    const mine = [];
    for (const m of maps) {
      const r = convertMap(text, m, found.lesson, label);
      mine.push(...r.edits);
      findings.push(...r.findings);
    }
    edits.push(...mine);
    covered.push(`${found.lesson.id}${found.lesson.depth ? ':depth' : ''}`);
    names.push(h.name);
    statements.set(h.name, {
      start: h.st.start,
      end: h.st.end,
      text: apply(
        text.slice(h.st.start, h.st.end),
        mine.map(e => ({ ...e, at: e.at - h.st.start }))
      ),
    });
  }
  return { text: apply(text, edits), findings, names, statements, covered };
}

let formatOptions;
function format(text) {
  formatOptions ??= JSON.parse(
    readFileSync(path.join(ROOT, '.prettierrc.json'), 'utf8')
  );
  return prettier.format(text, { ...formatOptions, parser: 'babel' });
}

/** The English step ids of every lesson, core and deeper. */
export async function englishLessons(root = ROOT) {
  const href = f => pathToFileURL(path.join(root, f)).href;
  const reg = await import(href(`${INV}/registry.js`));
  const depth = await import(href('js/investigations/depth.js'));
  const out = [];
  for (const id of reg.investigationIds()) {
    const lesson = await reg.loadInvestigation(id, 'en');
    out.push({ id, depth: false, sids: lesson.steps.map(s => s.sid) });
    if (depth.DEPTH_LESSONS.includes(id)) {
      const { steps } = await depth.depthSources(id);
      out.push({ id, depth: true, sids: steps.map(s => s.sid) });
    }
  }
  return out;
}

/**
 * What every source says the generated files should be.
 * `fmt` is Prettier by default; a test, where Prettier is its browser build, passes its own.
 * @returns {Promise<{files: Map<string, string>, findings: object[]}>} Path -> text
 */
export async function generate(root = ROOT, lessons, fmt = format) {
  lessons ??= await englishLessons(root);
  const files = new Map();
  const findings = [];
  const covered = new Set();
  for (const kind of KINDS) {
    const dir = path.join(root, SOURCES, kind.dir);
    if (!existsSync(dir)) continue;
    for (const f of readdirSync(dir)
      .filter(x => x.endsWith('.js'))
      .sort()) {
      const text = readFileSync(path.join(dir, f), 'utf8');
      const rel = `${SOURCES}/${kind.dir}/${f}`;
      const target = `${kind.out}/${f}`;
      const hint = {
        file: rel,
        id: kind.whole ? f.slice(0, -3) : undefined,
        depth: kind.depth,
      };
      let r = convertSource(text, lessons, hint);
      findings.push(...r.findings);
      if (kind.whole) {
        // A shared file holds several lessons; the id hint only fits a lesson's own file.
        const shared =
          r.names.length > 1 ||
          r.findings.some(x => /no lesson|equally/.test(x.message));
        const again = shared
          ? convertSource(text, lessons, { ...hint, id: undefined })
          : r;
        if (shared)
          findings.splice(
            findings.length - r.findings.length,
            r.findings.length,
            ...again.findings
          );
        again.covered.forEach(c => covered.add(c));
        files.set(target, await fmt(again.text));
      } else {
        const runtime = readFileSync(path.join(root, target), 'utf8');
        const ast = parse(runtime, target);
        const edits = [];
        const seen = new Set();
        r.covered.forEach(c => covered.add(c));
        for (const st of ast.body) {
          if (
            st.type !== 'ExportNamedDeclaration' ||
            st.declaration?.type !== 'VariableDeclaration'
          )
            continue;
          const name = st.declaration.declarations[0].id.name;
          const s = r.statements.get(name);
          if (!s) continue;
          seen.add(name);
          edits.push({ at: st.start, del: st.end - st.start, text: s.text });
        }
        for (const name of r.statements.keys())
          if (!seen.has(name))
            findings.push({
              lesson: null,
              message: `${rel}: ${name} is not in ${target}`,
            });
        files.set(target, await fmt(apply(runtime, edits)));
      }
    }
  }
  for (const l of lessons)
    if (!covered.has(`${l.id}${l.depth ? ':depth' : ''}`) && l.sids.length)
      findings.push({
        lesson: l.id,
        message: `${l.id}${l.depth ? ' (deeper steps)' : ''}: no Spanish steps under ${SOURCES}/ for its ${l.sids.length} English steps`,
      });
  return { files, findings };
}

/** Compare to disk. */
export async function stale(root = ROOT, made) {
  made ??= await generate(root);
  const out = [];
  for (const [file, text] of made.files)
    if (
      !existsSync(path.join(root, file)) ||
      readFileSync(path.join(root, file), 'utf8') !== text
    )
      out.push(file);
  return out;
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const write = process.argv.includes('--write');
  const check = process.argv.includes('--check');
  if (!write && !check) {
    console.error('usage: node tools/lesson-text.mjs --write | --check');
    process.exit(2);
  }
  const made = await generate();
  const old = await stale(ROOT, made);
  if (write) {
    for (const f of old) writeFileSync(path.join(ROOT, f), made.files.get(f));
    console.log(`lesson-text: ${made.files.size} files, ${old.length} written`);
  }
  for (const f of made.findings) console.error(`  ${f.message}`);
  if (check && old.length) {
    console.error(
      `lesson-text: ${old.length} generated file(s) are stale (first: ${old[0]}): run npm run lesson-text and commit the result`
    );
  }
  if (check && (old.length || made.findings.length)) process.exit(1);
  if (check) console.log(`lesson-text: ${made.files.size} files are current`);
}
