// =============================================================================
// The design-system ratchet (Roadmap II Prompt 51)
// -----------------------------------------------------------------------------
// tools/design-ratchet.mjs counts, per file, what the design system replaces:
// colour literals, !important, emoji used as icons and unstyled native
// controls on the tool pages. No file may gain one; a file that loses one has
// its count lowered.
// =============================================================================

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, test, expect } from '@jest/globals';

import {
  TOOL_PAGES,
  check,
  countBareControls,
  countColors,
  countEmoji,
  countImportant,
  measure,
  nativeControls,
} from '../tools/design-ratchet.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('no file has more than its record, and none has fewer unrecorded', () => {
  expect(check()).toEqual([]);
});

test('it finds what it is looking for, so it cannot pass by matching nothing', () => {
  const now = measure();
  const total = kind => Object.values(now[kind]).reduce((a, b) => a + b, 0);
  expect(total('colors')).toBeGreaterThan(50);
  // Every tool page's control has its class now, so the count of bare ones
  // is zero; what proves the scan is looking is the controls it sees.
  const seen = TOOL_PAGES.reduce(
    (n, rel) =>
      n + nativeControls(readFileSync(path.join(ROOT, rel), 'utf8')).length,
    0
  );
  expect(seen).toBeGreaterThan(200);
  expect(TOOL_PAGES).toHaveLength(14);
});

describe('what is counted', () => {
  test('a colour literal in a rule, not in a comment, and not a token name', () => {
    expect(countColors('a { color: #fff; background: rgba(0,0,0,.5) }')).toBe(
      2
    );
    expect(countColors('/* #fff */ a { color: var(--text-primary) }')).toBe(0);
    expect(countColors('a { color: hsl(200 50% 50%) } #id { top: 0 }')).toBe(1);
  });

  test('!important outside a comment', () => {
    expect(countImportant('a { top: 0 !important } /* !important */')).toBe(1);
  });

  test('an emoji, not a symbol of the interface', () => {
    expect(countEmoji("'toast.saved': '💾 Saved'")).toBe(1);
    expect(
      countEmoji("'unit.sun': 'M☉', 'arrow': '↗', 'x': '×', 'j': '♃', 'c': '©'")
    ).toBe(0);
    // Pictographs used as icons are emoji whatever their presentation.
    expect(countEmoji("'warn': '⚠ Careful', 'play': '▶'")).toBe(2);
    // A star is notation as a stellar subscript, and an icon anywhere else.
    expect(countEmoji("'a': 'a / R★', 'r': 'R<sub>★</sub>', 'm': 'M_★'")).toBe(
      0
    );
    expect(countEmoji("'fav': '★ Favourite', 'b': 'B★'")).toBe(2);
  });

  test('a control with no class, but not a checkbox, radio, range or hidden field, nor one in a comment or the shell', () => {
    expect(
      countBareControls(
        '<select id="a"></select><button class="ui-button">x</button>' +
          '<input type="checkbox"><input type="text" id="n"><textarea></textarea>' +
          '<!-- <select></select> -->' +
          '<!-- shell:header main=main --><select data-gs-lang></select><!-- /shell:header -->'
      )
    ).toBe(3);
  });

  test("a page's own class is not a component class", () => {
    expect(
      countBareControls(
        '<textarea class="fb-code"></textarea>' +
          '<input type="text" class="ui-input is-code">' +
          '<select class="x ui-select"></select>'
      )
    ).toBe(1);
  });

  test('a file over or under its record is reported, and which', () => {
    const record = { colors: { 'a.css': 2 } };
    expect(check({ colors: { 'a.css': 3 } }, record)).toEqual([
      expect.stringContaining('a.css: 3 colour literals, over its 2'),
    ]);
    expect(check({ colors: { 'a.css': 1 } }, record)).toEqual([
      expect.stringContaining('under its 2. Lower it'),
    ]);
  });
});
