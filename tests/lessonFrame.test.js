/**
 * Framing the lesson's scene in what its panels leave clear (js/lesson/frame.js)
 * and the saved sheet state. The pure parts only: the window and the panels are
 * measured in e2e/lessonLayout.spec.js.
 */
import { describe, test, expect } from '@jest/globals';
import { insetFromBoxes } from '../js/lesson/stage.js';
import { orbitPoints } from '../js/lessonFrame.js';
import { fitCamera } from '../js/lesson/stage.js';
import {
  readProgress,
  writeProgress,
} from '../js/investigations/progressSchema.js';

const phone = { width: 375, height: 812 };
const box = (left, top, right, bottom) => ({ left, top, right, bottom });

describe('the inset a stack of sheets leaves', () => {
  test('a header, a sheet and the transport bar leave the strip between them', () => {
    const inset = insetFromBoxes(
      [box(0, 0, 375, 48), box(8, 327, 367, 724), box(8, 740, 367, 804)],
      phone
    );
    expect(inset).toEqual({ left: 0, right: 0, top: 48, bottom: 485 });
  });

  test('a column down the left is cut from the left, not from the bottom', () => {
    const tablet = { width: 768, height: 1024 };
    const inset = insetFromBoxes(
      [box(0, 0, 768, 48), box(12, 60, 365, 950), box(44, 902, 724, 966)],
      tablet
    );
    expect(inset.left).toBe(365);
    expect(inset.bottom).toBe(1024 - 902);
  });

  test('a box outside what is already clear costs nothing', () => {
    const inset = insetFromBoxes(
      [box(0, 500, 375, 812), box(10, 600, 100, 700)],
      phone
    );
    expect(inset).toEqual({ left: 0, right: 0, top: 0, bottom: 312 });
  });

  test('no boxes, no inset', () => {
    expect(insetFromBoxes([], phone)).toEqual({
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
    });
  });
});

describe('what the camera is fitted to', () => {
  test('the world runs up: a stage above the origin lands above the middle', () => {
    const view = { width: 400, height: 400 };
    const up = fitCamera([{ x: 0, y: 100, radius: 1 }], view, { maxZoom: 1 });
    // Screen y = -(y) * zoom + pan.y + height / 2; a body at y = 100 has to
    // come out at the middle of the clear region, which is the window's.
    expect(-100 * up.zoom + up.pan.y + 200).toBeCloseTo(200, 6);
  });

  test('the stage lands in the middle of the clear region, both ways', () => {
    const view = { width: 400, height: 800 };
    const inset = { left: 0, right: 0, top: 100, bottom: 300 };
    const cam = fitCamera([{ x: 50, y: 20, radius: 1 }], view, {
      inset,
      maxZoom: 2,
    });
    const sx = 50 * cam.zoom + cam.pan.x + 200;
    const sy = -20 * cam.zoom + cam.pan.y + 400;
    expect(sx).toBeCloseTo(200, 6);
    expect(sy).toBeCloseTo(100 + (800 - 400) / 2, 6);
  });
});

describe('the extent of an orbit', () => {
  const star = {
    pos: { x: 0, y: 0 },
    vel: { x: 0, y: 0 },
    mass: 1000,
    radius: 5,
  };
  const G = 1;

  test('a circular orbit is framed as the circle it sweeps', () => {
    const r = 200;
    const v = Math.sqrt((G * (star.mass + 1)) / r);
    const planet = {
      pos: { x: r, y: 0 },
      vel: { x: 0, y: v },
      mass: 1,
      radius: 2,
    };
    const pts = orbitPoints(planet, star, G);
    const xs = pts.map(p => p.x);
    const ys = pts.map(p => p.y);
    expect(Math.min(...xs)).toBeCloseTo(-r, 3);
    expect(Math.max(...xs)).toBeCloseTo(r, 3);
    expect(Math.min(...ys)).toBeCloseTo(-r, 3);
    expect(Math.max(...ys)).toBeCloseTo(r, 3);
  });

  test('an eccentric orbit is framed to its apoapsis, on the far side', () => {
    const r = 100; // periapsis
    const e = 0.5;
    const a = r / (1 - e);
    const mu = G * (star.mass + 1);
    const v = Math.sqrt((mu * (1 + e)) / r);
    const planet = {
      pos: { x: r, y: 0 },
      vel: { x: 0, y: v },
      mass: 1,
      radius: 2,
    };
    const pts = orbitPoints(planet, star, G);
    const xs = pts.map(p => p.x);
    expect(Math.max(...xs)).toBeCloseTo(r, 3);
    expect(Math.min(...xs)).toBeCloseTo(-a * (1 + e), 3);
    const b = a * Math.sqrt(1 - e * e);
    const ys = pts.map(p => p.y);
    expect(Math.max(...ys)).toBeCloseTo(b, 3);
  });

  test('a body that is not bound is framed where it is', () => {
    const fast = {
      pos: { x: 100, y: 0 },
      vel: { x: 0, y: 10 },
      mass: 1,
      radius: 2,
    };
    expect(orbitPoints(fast, star, G)).toEqual([{ x: 100, y: 0, radius: 2 }]);
  });
});

describe('the sheet state in saved progress', () => {
  const lesson = { id: 'tides', steps: [{ sid: 'one' }] };
  const base = {
    lesson,
    responses: {},
    attempts: {},
    visited: [],
    stepSid: 'one',
  };

  test('a lowered sheet is read back', () => {
    const saved = { ...writeProgress(base), sheet: 'peek' };
    expect(readProgress(saved, lesson).sheet).toBe('peek');
  });

  test('a raised sheet writes nothing, and anything else reads as raised', () => {
    expect(writeProgress(base)).not.toHaveProperty('sheet');
    const saved = { ...writeProgress(base), sheet: 'sideways' };
    expect(readProgress(saved, lesson).sheet).toBeUndefined();
  });
});
