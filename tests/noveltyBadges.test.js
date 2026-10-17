import { describe, test, expect } from '@jest/globals';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const { novelty } = JSON.parse(
  readFileSync('tools/evidence-status.json', 'utf8')
);
const register = readFileSync('DECISION_REGISTER.md', 'utf8');

function pagesCarryingBadge() {
  const out = [];
  const walk = dir => {
    for (const name of readdirSync(dir)) {
      if (
        name === 'node_modules' ||
        name.startsWith('.') ||
        name === 'worktrees'
      )
        continue;
      const p = path.join(dir, name);
      const st = statSync(p);
      if (st.isDirectory()) walk(p);
      else if (
        name === 'index.html' &&
        readFileSync(p, 'utf8').includes('ui-badge')
      ) {
        const html = readFileSync(p, 'utf8');
        if (html.includes(novelty.badge.en))
          out.push(p.split(path.sep).join('/'));
      }
    }
  };
  for (const d of [
    '3d',
    'catalog',
    'compute',
    'evaluation',
    'experiments',
    'mission',
    'observatory',
    'sky',
    'studio',
    'teaching',
    'library',
    'my-work',
    'course',
    'figure',
    'glossary',
    'instructors',
    'lab3d',
    'model',
    'validation',
    'history',
  ])
    walk(d);
  return out.sort();
}

describe('the "New in 2.0" badge', () => {
  test('D-R8-01 fixes the number at nine, and the record lists nine pages', () => {
    expect(register).toMatch(/"new in 2\.0" labels go on nine pages/);
    expect(novelty.pages).toHaveLength(9);
  });

  test('exactly the listed pages carry it', () => {
    expect(pagesCarryingBadge()).toEqual([...novelty.pages].sort());
  });

  test('each carries it in both languages, with the field-use note beside it', () => {
    for (const page of novelty.pages) {
      const html = readFileSync(page, 'utf8');
      expect([
        page,
        html.includes(`<span class="gs-en">${novelty.badge.en}</span>`),
      ]).toEqual([page, true]);
      expect([page, html.includes(`>${novelty.badge.es}</span>`)]).toEqual([
        page,
        true,
      ]);
      expect([page, html.includes(novelty.fieldUse.en)]).toEqual([page, true]);
      expect([page, html.includes(novelty.fieldUse.es)]).toEqual([page, true]);
    }
  });
});
