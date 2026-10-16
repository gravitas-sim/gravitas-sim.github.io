// The build folds the line wrapping of lesson prose (tools/prose-whitespace.mjs).
// It must change nothing a reader sees: every reader folds whitespace and keeps
// blank lines as paragraph breaks, so both must give the same text.
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fold, foldSource, templatesOf } from '../tools/prose-whitespace.mjs';
import { prose } from '../js/lessonMarkup.js';

const DIR = path.resolve('js/data/investigations');
const files = [];
const walk = d => {
  for (const e of readdirSync(d, { withFileTypes: true })) {
    if (e.isDirectory()) walk(path.join(d, e.name));
    else if (e.name.endsWith('.js')) files.push(path.join(d, e.name));
  }
};
walk(DIR);

describe('prose whitespace', () => {
  test('keeps paragraphs, folds wrapping', () => {
    expect(fold('a\n      b')).toBe('a b');
    expect(fold('a\n\n      b')).toBe('a\n\n b');
    expect(fold('a  \n   \n   b')).toBe('a\n\n b');
  });

  test('a tagged template is left alone', () => {
    expect(foldSource('const x = String.raw`a\n   b`;')).toBeNull();
    expect(foldSource('const x = `a\n   b ${1}\n   c`;')).toBe(
      'const x = `a b ${1} c`;'
    );
  });

  test('every template literal in every lesson reads the same', () => {
    let checked = 0;
    for (const f of files) {
      for (const { raw } of templatesOf(readFileSync(f, 'utf8'))) {
        const folded = fold(raw);
        if (folded === raw) continue;
        checked++;
        if (prose(folded) !== prose(raw))
          throw new Error(`${path.relative('.', f)}: ${raw.slice(0, 60)}`);
      }
    }
    expect(checked).toBeGreaterThan(500);
  });
});
