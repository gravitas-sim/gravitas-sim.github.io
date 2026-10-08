// =============================================================================
// Prose whitespace: write a lesson's line wrapping once, in the source only
// -----------------------------------------------------------------------------
// Lesson prose is written in template literals that wrap across lines, and the
// minifier keeps every newline and every indent of them: a hundred KB of the
// deferred JavaScript is the indentation of paragraphs. Every reader of that
// prose folds whitespace first - prose() in js/lessonMarkup.js, the report's
// plain() in js/labReport.js, and the browser for text put in HTML - and reads
// a blank line as a paragraph break. This plugin writes the same whitespace in
// fewer bytes: a newline and its indent become one space, a blank line stays a
// blank line. Only template text with no tag, in js/data/investigations/. The
// source files are untouched, so no step fingerprint or pin can move, and
// tests/proseWhitespace.test.js holds prose() equal on every literal.
// =============================================================================

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import * as acorn from 'acorn';

/** The same text with its line wrapping folded; paragraph breaks kept. */
export const fold = raw =>
  raw
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, (m, at, all) => (all[at - 1] === '\n' ? '\n ' : ' '));

/**
 * The untagged template texts of a module, with their folded form.
 * @returns {{range: number[], raw: string}[]}
 */
export function templatesOf(source) {
  const ast = acorn.parse(source, {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ranges: true,
  });
  const out = [];
  const walk = (node, tagged) => {
    if (!node || typeof node.type !== 'string') return;
    if (node.type === 'TemplateLiteral' && !tagged) {
      for (const q of node.quasis)
        out.push({ range: q.range, raw: source.slice(q.range[0], q.range[1]) });
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

export function foldSource(source) {
  let parts;
  try {
    parts = templatesOf(source);
  } catch {
    return null;
  }
  let code = source;
  for (const p of parts.sort((a, b) => b.range[0] - a.range[0])) {
    const next = fold(p.raw);
    if (next !== p.raw)
      code = code.slice(0, p.range[0]) + next + code.slice(p.range[1]);
  }
  return code === source ? null : code;
}

export function proseWhitespacePlugin(root = process.cwd()) {
  const dir = path.resolve(root, 'js', 'data', 'investigations') + path.sep;
  return {
    name: 'prose-whitespace',
    setup(build) {
      build.onLoad({ filter: /\.js$/ }, async args => {
        if (!args.path.startsWith(dir)) return null;
        const code = foldSource(await readFile(args.path, 'utf8'));
        return code ? { contents: code, loader: 'js' } : null;
      });
    },
  };
}
