// =============================================================================
// The visual criteria's judges: can they pass, and can they fail?
// -----------------------------------------------------------------------------
// tools/visual-criteria.mjs holds the measurements criteria I-8 and I-9 are
// judged by, and e2e/visualCriteria.criteria.js and e2e/canvasLegibility.spec.js
// run them on the pilot states. A judge that cannot fail proves nothing, so
// each is shown here on a known-good measurement and on a known-bad one, and
// the numbers it holds are checked against the roadmap's fixed criteria.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import {
  LABEL_FLOOR_CSS_PX,
  OPEN_HEIGHT_SHARE,
  PLOT_TICK_FLOOR_PX,
  PLOT_TITLE_FLOOR_PX,
  PHONE_SIZES,
  TABLET_SIZE,
  LESSON_PILOTS,
  SANDBOX_PILOTS,
  effectiveCssSize,
  overlappingPairs,
  isSymbolGlyph,
  longestOpenRun,
  judgeLabels,
  judgeLayout,
  judgeArrows,
  judgeTrailSpans,
  judgePlotType,
  judgeSeriesWithoutColour,
  judgeCue,
} from '../tools/visual-criteria.mjs';
import { loadAll } from '../tools/scene-record.mjs';

const box = (text, size, x0, y0, w = 60) => ({
  text,
  size,
  x0,
  x1: x0 + w,
  y0,
  y1: y0 + size * 1.05,
});

describe('the fixed numbers', () => {
  test('the criteria name 11 px labels, a third of the height, 11 and 12 px plot type', () => {
    expect(LABEL_FLOOR_CSS_PX).toBe(11);
    expect(OPEN_HEIGHT_SHARE).toBeCloseTo(1 / 3, 10);
    expect(PLOT_TICK_FLOOR_PX).toBe(11);
    expect(PLOT_TITLE_FLOOR_PX).toBe(12);
    expect(PHONE_SIZES).toEqual([
      { width: 375, height: 812 },
      { width: 412, height: 915 },
    ]);
    expect(TABLET_SIZE).toEqual({ width: 768, height: 1024 });
  });

  test('five lesson pilots and four sandbox pilots, the sandbox ones on committed records', () => {
    expect(LESSON_PILOTS).toHaveLength(5);
    expect(SANDBOX_PILOTS).toHaveLength(4);
    const ids = new Set(loadAll().map(r => r.record.id));
    for (const p of SANDBOX_PILOTS) expect(ids.has(p.base)).toBe(true);
  });
});

describe('label size is judged in CSS pixels', () => {
  test('a 10 px font is 10 CSS px at ratio 1 and about 5 at ratio 2', () => {
    expect(effectiveCssSize(10, 1, 1)).toBe(10);
    expect(effectiveCssSize(10, 1, 1.96)).toBeCloseTo(5.1, 1);
    // A context that scales for the display makes the same font read true.
    expect(effectiveCssSize(10, 2, 2)).toBe(10);
  });

  test('known good: 12 px labels, apart, pass; and a unit symbol is not judged alone', () => {
    const v = judgeLabels([
      box('Earth', 12, 10, 10),
      box('Mars', 12, 200, 10),
      box('⊕', 6.8, 70, 10, 6),
    ]);
    expect(v.pass).toBe(true);
    expect(v.count).toBe(2);
    expect(isSymbolGlyph('⊕')).toBe(true);
    expect(isSymbolGlyph('M')).toBe(false);
  });

  test('known bad: a 10 px label fails and so does a label on another', () => {
    const small = judgeLabels([box('Earth', 10, 10, 10)]);
    expect(small.pass).toBe(false);
    expect(small.small).toHaveLength(1);
    const lap = judgeLabels([
      box('Earth', 12, 10, 10),
      box('Mars', 12, 20, 12),
    ]);
    expect(lap.pass).toBe(false);
    expect(lap.overlaps).toHaveLength(1);
    expect(judgeLabels([]).pass).toBe(false);
  });

  test('a label drawn twice at one place (a halo) is not an overlap', () => {
    expect(
      overlappingPairs([box('Io', 12, 10, 10), box('Io', 12, 11, 10)])
    ).toHaveLength(0);
  });
});

describe('I-8: the layout judge', () => {
  const base = {
    vw: 375,
    vh: 812,
    openRunPx: 400,
    openColsPx: 375,
    panel: { x: 8, y: 500, width: 359, height: 220 },
    panelOverlapsTool: false,
    instrument: { visible: true },
    bodies: [
      { role: 'star', inside: true, visible: true },
      { role: 'planet', inside: true, visible: true },
    ],
  };

  test('known good: bodies in view and a third of the height open', () => {
    expect(judgeLayout(base, { kind: 'phone', subject: 'scene' }).pass).toBe(
      true
    );
  });

  test('known bad: a body under the sheet, one off screen, too little canvas', () => {
    const v = judgeLayout(
      {
        ...base,
        openRunPx: 200,
        bodies: [
          { role: 'star', inside: true, visible: false, coveredBy: 'sheet' },
          { role: 'planet', inside: false, visible: false },
        ],
      },
      { kind: 'phone', subject: 'scene' }
    );
    expect(v.pass).toBe(false);
    expect(v.reasons).toHaveLength(3);
  });

  test('exactly a third of the height passes and a pixel under it does not', () => {
    const third = 812 / 3;
    expect(
      judgeLayout(
        { ...base, openRunPx: third },
        { kind: 'phone', subject: 'scene' }
      ).pass
    ).toBe(true);
    expect(
      judgeLayout(
        { ...base, openRunPx: third - 1 },
        { kind: 'phone', subject: 'scene' }
      ).pass
    ).toBe(false);
  });

  test('tablet: side by side needs a panel of 300 px and a third of the width', () => {
    const tablet = { ...base, vw: 768, vh: 1024, panel: { width: 372 } };
    expect(
      judgeLayout(
        { ...tablet, openColsPx: 390 },
        { kind: 'tablet', subject: 'scene' }
      ).pass
    ).toBe(true);
    expect(
      judgeLayout(
        { ...tablet, openColsPx: 8 },
        { kind: 'tablet', subject: 'scene' }
      ).pass
    ).toBe(false);
    expect(
      judgeLayout(
        { ...tablet, panel: { width: 280 }, openColsPx: 390 },
        { kind: 'tablet', subject: 'scene' }
      ).pass
    ).toBe(false);
  });

  test('an instrument pilot is judged on the instrument, not on a staged star', () => {
    const m = {
      ...base,
      bodies: [{ role: 'star', inside: false, visible: false }],
    };
    expect(judgeLayout(m, { kind: 'phone', subject: 'instrument' }).pass).toBe(
      true
    );
    expect(
      judgeLayout(
        {
          ...m,
          instrument: { visible: false, reason: 'outside the viewport' },
        },
        { kind: 'phone', subject: 'instrument' }
      ).pass
    ).toBe(false);
  });

  test('the longest open run is measured in pixels of the grid', () => {
    expect(longestOpenRun([0, 0.7, 0.9, 0.2, 0.8], 8)).toBe(16);
    expect(longestOpenRun([0.1, 0.2], 8)).toBe(0);
  });
});

describe('I-9: arrows, trails, plots and the selection cue', () => {
  test('an arrow three times the speed must be clearly longer', () => {
    expect(judgeArrows({ slow: 40, fast: 118 }).pass).toBe(true);
    expect(judgeArrows({ slow: 70.2, fast: 70.2 }).pass).toBe(false);
    expect(judgeArrows({ slow: null, fast: 10 }).pass).toBe(false);
  });

  test('a trail span must not follow the frame rate', () => {
    const same = [30, 60, 144].map(fps => ({ fps, span: 1.9 }));
    expect(judgeTrailSpans(same).pass).toBe(true);
    const drifting = [
      { fps: 30, span: 1.96 },
      { fps: 60, span: 1.85 },
      { fps: 144, span: 1.74 },
    ];
    expect(judgeTrailSpans(drifting).pass).toBe(false);
    expect(
      judgeTrailSpans([
        { fps: 30, span: NaN },
        { fps: 60, span: 1 },
      ]).pass
    ).toBe(false);
  });

  test('plot ticks are 11 px and labels 12 px', () => {
    const good = [
      { role: 'tick', size: 11 },
      { role: 'label', size: 12 },
    ];
    expect(judgePlotType(good).pass).toBe(true);
    expect(
      judgePlotType([
        { role: 'tick', size: 10 },
        { role: 'label', size: 12 },
      ]).pass
    ).toBe(false);
    expect(
      judgePlotType([
        { role: 'tick', size: 11 },
        { role: 'label', size: 11 },
      ]).pass
    ).toBe(false);
    expect(judgePlotType([]).pass).toBe(false);
  });

  test('several series differ by marker shape, not by colour or dash', () => {
    const colourOnly = [
      { colour: '#f00', marker: 'circle', dash: '' },
      { colour: '#00f', marker: 'circle', dash: '4 3' },
    ];
    expect(judgeSeriesWithoutColour(colourOnly).pass).toBe(false);
    const shapes = [
      { colour: '#f00', marker: 'circle', dash: '' },
      { colour: '#00f', marker: 'square', dash: '' },
    ];
    expect(judgeSeriesWithoutColour(shapes).pass).toBe(true);
    expect(judgeSeriesWithoutColour([colourOnly[0]]).pass).toBe(true);
  });

  test('the selection cue needs a ring of changed pixels', () => {
    expect(judgeCue({ changed: 0 }).pass).toBe(false);
    expect(judgeCue({ changed: 180 }).pass).toBe(true);
  });
});
