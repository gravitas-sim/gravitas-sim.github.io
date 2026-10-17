import { describe, test, expect } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { TITLES_ES } from '../tools/shell.mjs';

describe('page titles follow the locale where the shell is mounted', () => {
  test('every listed page carries its Spanish title in a stamped script', () => {
    for (const [page, es] of Object.entries(TITLES_ES)) {
      const html = readFileSync(page, 'utf8');
      expect([page, html.includes(`es=${JSON.stringify(es)}`)]).toEqual([
        page,
        true,
      ]);
      expect(es).toMatch(/ \| Gravitas$/);
    }
  });

  test('a listed page does not also set its title from its own catalog', () => {
    // Both would fight over document.title on a language change.
    const own = ['library', 'observatory', 'experiments', 'figure', 'catalog'];
    for (const page of Object.keys(TITLES_ES))
      for (const dir of own) expect(page.startsWith(`${dir}/`)).toBe(false);
  });

  test('the swap costs no JavaScript: js/shell.js does not carry it', () => {
    expect(readFileSync('js/shell.js', 'utf8')).not.toContain('title');
  });
});
