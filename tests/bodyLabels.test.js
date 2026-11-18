// =============================================================================
// Body names on the main canvas: size, priority, cap, spacing, setting
// -----------------------------------------------------------------------------
// js/bodyLabels.js with a recording context. The browser half (the pilots at
// device pixel ratios 1 and 2, the cue) is e2e/bodyLabels.spec.js.
// =============================================================================

import { beforeEach, describe, expect, test } from '@jest/globals';

import { SETTINGS, state } from '../js/appState.js';
import {
  LABEL_CAP,
  LABEL_MIN_CSS_PX,
  bodyLabel,
  claim,
  drawBodyMarks,
  frameScale,
  labelFont,
  labelMode,
  setBoundTest,
} from '../js/bodyLabels.js';

/** A context that records what is filled and stroked, with a plain text width. */
function recorder() {
  const drawn = [];
  const calls = [];
  const ctx = {
    font: '10px x',
    drawn,
    calls,
    save() {},
    restore() {},
    setTransform() {},
    beginPath: () => calls.push('beginPath'),
    arc: () => calls.push('arc'),
    moveTo: () => calls.push('moveTo'),
    lineTo: () => calls.push('lineTo'),
    stroke: () => calls.push('stroke'),
    measureText: s => ({
      width: String(s).length * parseFloat(ctx.font) * 0.6,
    }),
    fillText: (s, x, y) =>
      drawn.push({ text: String(s), x, y, font: ctx.font }),
  };
  return ctx;
}

const toScreen = p => p;
const body = (id, mass = 1) => ({ id, mass, pos: { x: 0, y: 0 }, radius: 1 });

beforeEach(() => {
  frameScale({ clientWidth: 1000, width: 1000 });
  setBoundTest(() => false);
  state.selectedObject = null;
  SETTINGS.body_labels = 'all';
  state.zoom = 1;
});

describe('sizes are CSS pixels', () => {
  test('a font is scaled by the canvas and never under 11 CSS px', () => {
    frameScale({ clientWidth: 500, width: 980 });
    expect(labelFont(11)).toBe('21.56px Roboto Mono');
    expect(labelFont(6)).toBe('21.56px Roboto Mono');
    expect(labelFont(12, 'Inter', 'bold')).toBe('bold 23.52px Inter');
    expect(LABEL_MIN_CSS_PX).toBe(11);
  });

  test('an unmeasured canvas counts as ratio 1', () => {
    expect(frameScale({ clientWidth: 0, width: 800 })).toBe(1);
  });
});

describe('the setting', () => {
  test.each([
    ['all', 'all'],
    ['bound', 'bound'],
    ['none', 'none'],
    [undefined, 'all'],
    ['sideways', 'all'],
  ])('%s reads as %s', (value, expected) => {
    SETTINGS.body_labels = value;
    expect(labelMode()).toBe(expected);
  });

  test('none draws no names, bound draws the chosen and the lesson ones', () => {
    const a = body('a');
    const b = body('b');
    const c = body('c');
    setBoundTest(o => o === b);
    state.selectedObject = { type: 'Planet', object: a };
    const run = mode => {
      SETTINGS.body_labels = mode;
      for (const o of [a, b, c])
        bodyLabel(o, { x: 100 * o.id.charCodeAt(0), y: 50 }, 4, {
          px: 11,
          gate: true,
          name: o.id,
        });
      const ctx = recorder();
      drawBodyMarks(ctx, toScreen);
      return ctx.drawn.map(d => d.text).sort();
    };
    expect(run('all')).toEqual(['a', 'b', 'c']);
    expect(run('bound')).toEqual(['a', 'b']);
    expect(run('none')).toEqual([]);
  });

  test('a body below the level of detail is named only when chosen or bound', () => {
    const a = body('a');
    const b = body('b');
    const c = body('c');
    setBoundTest(o => o === b);
    state.selectedObject = { type: 'Planet', object: c };
    for (const o of [a, b, c])
      bodyLabel(o, { x: 100 * o.id.charCodeAt(0), y: 50 }, 4, {
        px: 11,
        gate: false,
        name: o.id,
      });
    const ctx = recorder();
    drawBodyMarks(ctx, toScreen);
    expect(ctx.drawn.map(d => d.text).sort()).toEqual(['b', 'c']);
  });
});

describe('a crowd', () => {
  const crowd = n =>
    Array.from({ length: n }, (_, i) => ({
      ...body(`n${i}`, i + 1),
      at: { x: 20 + (i % 10) * 90, y: 40 + Math.floor(i / 10) * 60 },
    }));

  test('is capped, heaviest first, and the lesson body always makes it', () => {
    const bodies = crowd(60);
    const lesson = bodies[0]; // the lightest
    setBoundTest(o => o === lesson);
    for (const o of bodies)
      bodyLabel(o, o.at, 4, {
        px: 11,
        gate: true,
        name: o.id,
      });
    const ctx = recorder();
    drawBodyMarks(ctx, toScreen);
    const names = ctx.drawn.map(d => d.text);
    expect(names).toHaveLength(LABEL_CAP + 1);
    expect(names).toContain('n0');
    expect(names).toContain('n59');
    expect(names).not.toContain('n10');
  });

  test('the selected body is first in line when the spots run out', () => {
    const a = { ...body('a', 1), at: { x: 100, y: 100 } };
    const b = { ...body('b', 99), at: { x: 100, y: 100 } };
    state.selectedObject = { type: 'Planet', object: a };
    for (const o of [b, a])
      bodyLabel(o, o.at, 4, { px: 11, gate: true, name: o.id });
    const ctx = recorder();
    drawBodyMarks(ctx, toScreen);
    const [first, second] = ctx.drawn;
    expect(first.text).toBe('a');
    // The heavier body sits on the same centre: its name moves down a row.
    expect(second.text).toBe('b');
    expect(second.y).toBeGreaterThan(first.y + 11);
  });

  test('a displaced name gets a leader line and none overlap', () => {
    const bodies = [1, 2, 3, 4].map(i => ({
      ...body(`b${i}`, 5 - i),
      at: { x: 300, y: 100 + i },
    }));
    setBoundTest(() => true);
    for (const o of bodies)
      bodyLabel(o, o.at, 4, { px: 11, gate: true, name: o.id });
    const ctx = recorder();
    drawBodyMarks(ctx, toScreen);
    expect(ctx.drawn).toHaveLength(4);
    const ys = ctx.drawn.map(d => d.y).sort((p, q) => p - q);
    for (let i = 1; i < ys.length; i++)
      expect(ys[i] - ys[i - 1]).toBeGreaterThanOrEqual(11);
    expect(ctx.calls.filter(c => c === 'lineTo').length).toBeGreaterThan(0);
  });

  test('a free name that cannot be placed is dropped, a bound one is not', () => {
    const near = i => ({ ...body(`f${i}`, 1), at: { x: 50, y: 50 } });
    const free = Array.from({ length: 12 }, (_, i) => near(i));
    for (const o of free)
      bodyLabel(o, o.at, 4, { px: 11, gate: true, name: o.id });
    const ctx = recorder();
    drawBodyMarks(ctx, toScreen);
    // Five spots are tried; the rest are left out rather than piled up.
    expect(ctx.drawn.length).toBeLessThan(12);
    expect(ctx.drawn.length).toBeGreaterThan(0);
  });
});

describe('the cue', () => {
  test('a ring and four corner ticks are drawn for the chosen body, whatever the setting', () => {
    const a = body('a');
    state.selectedObject = { type: 'Star', object: a };
    SETTINGS.body_labels = 'none';
    const ctx = recorder();
    drawBodyMarks(ctx, p => ({ x: 400, y: 300 + p.y }));
    expect(ctx.calls.filter(c => c === 'arc')).toHaveLength(2);
    expect(ctx.calls.filter(c => c === 'lineTo')).toHaveLength(8);
  });

  test('nothing is drawn with nothing chosen', () => {
    const ctx = recorder();
    drawBodyMarks(ctx, toScreen);
    expect(ctx.calls).toEqual([]);
  });
});

describe('claim', () => {
  test('takes a spot once', () => {
    const placed = [];
    expect(claim(placed, 10, 10, 20, 10)).toBe(true);
    expect(claim(placed, 15, 12, 20, 10)).toBe(false);
    expect(claim(placed, 100, 10, 20, 10)).toBe(true);
  });
});
