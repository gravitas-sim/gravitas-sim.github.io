// =============================================================================
// A failing step's excerpt never cuts the list of what moved
// -----------------------------------------------------------------------------
// tools/archive-check.mjs used to print the last six lines of a failing step.
// The instructor freshness check sorts what moved and ends on three lines of
// advice, so the gate showed three stale inputs of eleven, and the three were
// quoted as the whole list.
// =============================================================================

import { describe, test, expect } from '@jest/globals';

import { excerpt } from '../tools/output-excerpt.mjs';

/** The shape `npm run instructors:check` printed on 2026-09-23. */
const STALE = [
  'The instructor bundle is stale.',
  '  recorded: a7c1a455e833',
  '  on disk:  ab969450310d  (50 source files)',
  '',
  'What moved:',
  '  changed     js/constants.js',
  '  changed     js/data/instructorContent.js',
  '  changed     js/data/investigations.js',
  '  changed     js/data/investigations/a-universe-of-stars.js',
  '  changed     js/data/investigations/listening-to-spacetime.js',
  '  changed     js/i18n/deferredNamespaces.js',
  '  changed     js/i18n/en.js',
  '  changed     js/i18n/en.teaching.js',
  '  changed     js/pdf.js',
  '  new input   js/data/investigations/power-law-gravity.js',
  '  new input   js/data/investigations/twelve-nights.js',
  '',
  'Instructional content changed after the bundle was built. Rebuild it',
  'with `npm run build:instructors` - which needs the real passphrase -',
  'and commit the bundle and the manifest together.',
].join('\n');

const kept = text => text.split('\n').map(l => l.slice(4));

describe('excerpt', () => {
  test('keeps every input that moved, however far above the tail', () => {
    const lines = kept(excerpt(STALE, 6));
    const drift = lines.filter(l => /^\s+(changed|new input)\s/.test(l));
    expect(drift).toHaveLength(11);
    expect(lines).toContain('  changed     js/constants.js');
  });

  test('keeps the tail, in the order it was printed, without repeating it', () => {
    const lines = kept(excerpt(STALE, 6));
    expect(lines.slice(-3)).toEqual([
      'Instructional content changed after the bundle was built. Rebuild it',
      'with `npm run build:instructors` - which needs the real passphrase -',
      'and commit the bundle and the manifest together.',
    ]);
    expect(new Set(lines).size).toBe(lines.length);
    expect(lines.indexOf('  changed     js/constants.js')).toBeLessThan(
      lines.indexOf('  new input   js/data/investigations/twelve-nights.js')
    );
  });

  test('is only the tail for output that names no inputs', () => {
    const log = Array.from({ length: 40 }, (_, i) => `step ${i}`).join('\n');
    expect(kept(excerpt(log, 8))).toEqual(
      Array.from({ length: 8 }, (_, i) => `step ${32 + i}`)
    );
  });

  test('indents each line for a problem list and drops blank ones', () => {
    expect(excerpt('a\n\nb\n', 8)).toBe('    a\n    b');
  });
});
