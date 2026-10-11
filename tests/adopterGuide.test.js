// =============================================================================
// The adopter's guide (Roadmap II Prompt 114, ADOPTER_GUIDE.md)
// -----------------------------------------------------------------------------
// teaching/guide/index.html is written by tools/build-adoption-pages.mjs and
// held to it by adoptionPages.test.js. This holds what the generator cannot:
// that the words keep the project's vocabulary, that both languages say the
// same things, that every claim a reader could act on is a claim the tree
// still backs, and that the counts are the Library's.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = f => readFileSync(path.join(REPO, f), 'utf8');
const page = read('teaching/guide/index.html');
const main = page.slice(page.indexOf('<main'), page.indexOf('</main>'));
const library = JSON.parse(read('library/library.json'));

const spans = lang =>
  [
    ...main.matchAll(
      new RegExp(`<span class="gs-${lang}"[^>]*>(.*?)</span>`, 'gs')
    ),
  ].map(m => m[1]);
const strip = s =>
  s
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

describe('the guide says what the project says', () => {
  test('both languages, one for one', () => {
    expect(spans('en').length).toBeGreaterThan(40);
    expect(spans('es').length).toBe(spans('en').length);
    // A Spanish span that is the English one is an untranslated string.
    const en = spans('en').map(strip);
    const es = spans('es').map(strip);
    const same = en.filter((t, i) => t === es[i] && t.length > 20);
    expect(same).toEqual([]);
  });

  test('no markup leaks into the text', () => {
    // A bilingual span inside an attribute once printed `On this page">`.
    expect(strip(main)).not.toMatch(/["'=]>|<[a-z]|&lt;|&amp;[a-z]/);
  });

  test('the English prose uses the project’s words', () => {
    const prose = spans('en').map(strip).join('\n');
    // "Investigation", not "lesson"; US spelling.
    expect(prose).not.toMatch(/\blessons?\b/i);
    for (const british of ['labelled', 'colour', 'behaviour', 'centre', 'grey'])
      expect(prose).not.toContain(british);
    // No account of who wrote it, and no local path.
    expect(page).not.toMatch(/Claude|Anthropic|\/Users\/|C:\\\\/);
  });

  test('every claim of what it does not do is one the tree backs', () => {
    // No analytics, no accounts, no LTI: the pages the claims rest on exist.
    for (const f of [
      'ACCESSIBILITY.md',
      'SUPPORT.md',
      'SECURITY.md',
      'CITATION.cff',
      'INSTRUCTOR_FLOW.md',
    ])
      expect({ f, there: existsSync(path.join(REPO, f)) }).toEqual({
        f,
        there: true,
      });
    // The repository links point at files that exist.
    for (const [, file] of page.matchAll(/blob\/main\/([A-Za-z_.]+)"/g))
      expect({ file, there: existsSync(path.join(REPO, file)) }).toEqual({
        file,
        there: true,
      });
    // Where it says the roster is not held, the source says the same.
    expect(read('INSTRUCTOR_FLOW.md')).toMatch(/no LTI claim/);
  });

  test('the counts are the Library’s', () => {
    const inv = library.entries.filter(e => e.kind === 'investigation');
    const lessons = inv.filter(e => e.format === 'lesson').length;
    const first = strip(
      spans('en').find(t => t.includes('guided investigations'))
    );
    expect(first).toContain(`${inv.length} guided investigations`);
    expect(first).toContain(`${lessons} that run in the simulation`);
    expect(first).toContain(
      `${library.entries.filter(e => e.kind === 'scenario').length} ready-made scenarios`
    );
  });

  test('it claims no learning gain and says no study was run', () => {
    const prose = spans('en').map(strip).join('\n');
    expect(prose).toMatch(
      /No classroom evaluation of Gravitas has been published/
    );
    expect(prose).not.toMatch(
      /students learn more|improves? learning|learning gains? of/i
    );
  });

  test('the first week is six steps, in the order the instructor flow draws', () => {
    const week = main.slice(
      main.indexOf('id="week-h"'),
      main.indexOf('id="semester-h"')
    );
    expect((week.match(/<li>/g) || []).length).toBe(6);
    const order = [
      '/teaching/find/',
      'Preview as a student',
      'Make an activity from it',
      '/teaching/kit/',
      'Collect the reports',
      '/instructors/submissions/',
    ].map(s => week.indexOf(s));
    expect(order.every(i => i >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });
});
