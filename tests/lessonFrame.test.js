/**
 * Framing the lesson's scene in what its panels leave clear (js/lesson/frame.js)
 * and the saved sheet state. The pure parts only: the window and the panels are
 * measured in e2e/lessonLayout.spec.js.
 */
/* global document, window -- jsdom's */
import { describe, test, expect, beforeAll, beforeEach } from '@jest/globals';
import { insetFromBoxes } from '../js/lesson/stage.js';
import {
  chooseFrame,
  fitNow,
  fitWanted,
  lessonInset,
  orbitPoints,
  refit,
  requestFit,
  takeFit,
} from '../js/lessonFrame.js';
import { state } from '../js/appState.js';
import { fitCamera, placedOf } from '../js/lesson/stage.js';
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

describe('the size a staged star is fitted at', () => {
  test('is the radius it is drawn at when a lesson sets one', () => {
    const star = (radius, stageRadius) => ({
      star: { pos: { x: 1, y: 2 }, radius, stageRadius },
    });
    expect(placedOf([star(3, 40)])[0].radius).toBe(40);
    expect(placedOf([star(3, undefined)])[0].radius).toBe(3);
  });
});

describe('how far in a fit may go', () => {
  const view = { width: 600, height: 400 };
  const system = [
    { x: 0, y: 0, radius: 0.001 },
    { x: 0.02, y: 0.01, radius: 0.0005 },
  ];
  test('a shelf stops at the default cap of 3', () => {
    expect(fitCamera(system, view).zoom).toBe(3);
  });
  test('a scene of small extent fills its room when the cap is lifted', () => {
    const camera = fitCamera(system, view, { maxZoom: 100 });
    expect(camera.zoom).toBe(100);
    const wide = fitCamera(
      [
        { x: -4, y: 0, radius: 0.001 },
        { x: 4, y: 0, radius: 0.001 },
      ],
      view,
      { maxZoom: 100 }
    );
    expect(wide.zoom).toBeCloseTo((600 * 0.78) / 10, 3);
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

describe('what a scene is framed to, and how far in', () => {
  const pt = (x, y, radius = 0.001) => ({ x, y, radius });
  test('a lone body, or a probe beside its planet, stops at 3', () => {
    expect(
      chooseFrame({ stars: [], bound: [pt(0, 0)], roles: 1, world: [] }).maxZoom
    ).toBe(3);
    // two roles, but the points lie within a few radii of one another
    expect(
      chooseFrame({
        stars: [],
        bound: [pt(0, 0, 0.01), pt(0.02, 0, 0.001)],
        roles: 2,
        world: [],
      }).maxZoom
    ).toBe(3);
  });
  test('bodies spread over many radii fill their room, to the application limit', () => {
    const f = chooseFrame({
      stars: [],
      bound: [pt(0, 0), pt(1, 0.5)],
      roles: 2,
      world: [],
    });
    expect(f.maxZoom).toBe(100);
    expect(f.points).toHaveLength(2);
  });
  test('a shelf frames the drawn stars and stops at 3', () => {
    const star = { star: { pos: { x: 0, y: 0 }, radius: 1, stageRadius: 0.2 } };
    const f = chooseFrame({
      stars: [star],
      bound: [pt(5, 5)],
      roles: 2,
      world: [],
    });
    expect(f.maxZoom).toBe(3);
    expect(f.points).toEqual(placedOf([star]));
  });
  test('a step that binds nothing frames the world, less the far tenth of a crowd', () => {
    const near = Array.from({ length: 19 }, (_, i) =>
      pt(i % 5, Math.floor(i / 5))
    );
    const world = [...near, pt(5000, 5000)];
    const f = chooseFrame({ stars: [], bound: [], roles: 0, world });
    expect(f.maxZoom).toBe(100);
    expect(f.points).not.toContainEqual(pt(5000, 5000));
    expect(f.points.length).toBeGreaterThanOrEqual(18);
    // a handful of bodies is never trimmed
    const few = [pt(0, 0), pt(9000, 0)];
    expect(
      chooseFrame({ stars: [], bound: [], roles: 0, world: few }).points
    ).toEqual(few);
  });
});

describe('the fit is retaken as panels settle, and then left alone', () => {
  const observed = [];
  beforeAll(() => {
    window.ResizeObserver = class {
      observe(el) {
        observed.push(el);
      }
    };
    window.innerWidth = 1280;
    window.innerHeight = 800;
  });
  beforeEach(() => {
    state.cameraTouchedAt = 0;
    requestFit(false);
  });
  const here = [
    { x: 0, y: 0, radius: 0.001 },
    { x: 1, y: 0, radius: 0.001 },
  ];

  // Answer a wanted fit the way a tick that finds the reader's view would:
  // it is dropped, with the count of refits kept.
  const settle = () => {
    state.cameraTouchedAt = 1;
    takeFit();
    state.cameraTouchedAt = 0;
  };
  test('a layout change refits a few times in a step, then leaves the view', () => {
    fitNow(here);
    let taken = 0;
    for (let i = 0; i < 8; i++) {
      refit();
      if (fitWanted()) {
        taken++;
        settle();
      }
    }
    expect(taken).toBe(4);
  });
  test('the reader choosing the sheet height still refits after the count is spent', () => {
    fitNow(here);
    for (let i = 0; i < 6; i++) {
      refit();
      settle();
    }
    refit();
    expect(fitWanted()).toBe(false);
    refit(true);
    expect(fitWanted()).toBe(true);
  });
  test('a new step starts the count again', () => {
    fitNow(here);
    for (let i = 0; i < 6; i++) {
      refit();
      settle();
    }
    requestFit();
    settle();
    fitNow(here);
    refit();
    expect(fitWanted()).toBe(true);
  });
  test('a view the reader chose is not refitted', () => {
    fitNow(here);
    state.cameraTouchedAt = Date.now();
    refit();
    expect(fitWanted()).toBe(false);
    refit(true);
    expect(fitWanted()).toBe(false);
  });
  test('panels that open after the first fit are watched on later ticks', () => {
    fitNow(here);
    const late = document.createElement('div');
    late.className = 'experiment-panel';
    document.body.append(late);
    takeFit();
    expect(observed).toContain(late);
    late.remove();
  });
});

describe('the free region on a phone', () => {
  const rect = (el, r) => {
    el.getBoundingClientRect = () => ({
      ...r,
      width: r.right - r.left,
      height: r.bottom - r.top,
    });
  };
  const place = (id, r) => {
    const el = document.createElement('div');
    el.id = id;
    rect(el, r);
    document.body.append(el);
    return el;
  };
  test('the readout chip (#overlay) is furniture that is cut from the free region', () => {
    window.innerWidth = 375;
    window.innerHeight = 812;
    const sheet = place('investigationPanel', {
      left: 0,
      top: 500,
      right: 375,
      bottom: 812,
    });
    const without = lessonInset();
    const chip = place('overlay', {
      left: 0,
      top: 40,
      right: 375,
      bottom: 120,
    });
    const withChip = lessonInset();
    expect(withChip.top).toBeGreaterThanOrEqual(120);
    expect(withChip.top).toBeGreaterThan(without.top);
    expect(withChip.bottom).toBe(without.bottom);
    chip.remove();
    sheet.remove();
  });
});
