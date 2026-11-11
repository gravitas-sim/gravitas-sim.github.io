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
  CONTRAST_PAIRS,
  THEMES,
  TOOL_PAGES,
  check,
  checkContrast,
  contrastRatio,
  countBareControls,
  countColors,
  countEmoji,
  countImportant,
  loadTokens,
  measure,
  measureContrast,
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
  expect(TOOL_PAGES).toHaveLength(16);
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

describe('contrast in every theme (Prompt 279)', () => {
  const grounds = CONTRAST_PAIRS.reduce((n, p) => n + p.grounds.length, 0);

  test('every pair is measured in every one of the four themes', () => {
    expect(THEMES).toEqual(['midnight', 'deep', 'observatory', 'daylight']);
    const now = measureContrast();
    for (const theme of THEMES)
      expect(Object.keys(now[theme])).toHaveLength(grounds);
    // The tokens are really read: the four themes are four sets of values.
    const blocks = loadTokens();
    expect(Object.keys(blocks).sort()).toEqual([...THEMES].sort());
    expect(blocks.daylight['--surface-1']).toBe('#ffffff');
    expect(now.midnight['--text-primary|--surface-0']).toBeGreaterThan(15);
  });

  test('no theme paints a pair under the minimum it is held to', () => {
    const now = measureContrast();
    for (const theme of THEMES)
      for (const [key, ratio] of Object.entries(now[theme])) {
        const min = CONTRAST_PAIRS.find(p => p.fg === key.split('|')[0]).min;
        expect([theme, key, ratio >= min]).toEqual([theme, key, true]);
      }
  });

  test("WCAG's ratio, to two places, floored", () => {
    expect(
      contrastRatio({ r: 255, g: 255, b: 255 }, { r: 0, g: 0, b: 0 })
    ).toBeCloseTo(21, 5);
    // The Midnight default's muted text on its raised surface.
    expect(measureContrast().midnight['--text-muted|--surface-2']).toBe(5.62);
  });

  test('a ratio under its minimum, one that fell and one that rose are reported', () => {
    const key = '--text-muted|--surface-0';
    const record = { midnight: { [key]: 6.23 } };
    expect(checkContrast({ midnight: { [key]: 4.4 } }, record)).toEqual([
      expect.stringContaining('under the 4.5:1'),
      expect.stringContaining('fell from 6.23:1 to 4.4:1'),
    ]);
    expect(checkContrast({ midnight: { [key]: 6.3 } }, record)).toEqual([
      expect.stringContaining('rose from 6.23:1 to 6.3:1'),
    ]);
    expect(checkContrast({ midnight: { [key]: 6.23 } }, record)).toEqual([]);
  });
});
