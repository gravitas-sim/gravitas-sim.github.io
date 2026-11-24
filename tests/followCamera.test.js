// =============================================================================
// Follow mode does not fight the reader for the camera
// -----------------------------------------------------------------------------
// The follow block in js/physics.js assigned state.pan outright on every step,
// so a drag or a wheel zoom made while following was overwritten before the
// next frame. The behavior chosen instead is documented in js/followCamera.js:
// manual input becomes an offset from the followed body and Follow keeps
// following.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import { followCamera, resetFollowCamera } from '../js/followCamera.js';
import { worldToScreen, screenToWorld } from '../js/utils.js';

const ORIGIN = { x: 0, y: 0 };

/** One follow step over a view object, the way js/physics.js drives it. */
function step(view, targetPos) {
  const out = followCamera({
    targetPos,
    frameOffset: view.frameOffset || ORIGIN,
    zoom: view.zoom,
    pan: view.pan,
    lastApplied: view.followPan,
    offset: view.followOffset,
  });
  view.pan = out.pan;
  view.followOffset = out.offset;
  view.followPan = { ...out.pan };
  return view;
}

const freshView = () => ({
  zoom: 2,
  pan: { x: 0, y: 0 },
  frameOffset: { x: 0, y: 0 },
  followOffset: { x: 0, y: 0 },
  followPan: null,
});

describe('following a body', () => {
  test('centers it on the first step', () => {
    const view = freshView();
    step(view, { x: 50, y: -30 });
    expect(view.pan).toEqual({ x: -100, y: -60 });
  });

  test('keeps it centered as it moves', () => {
    const view = freshView();
    step(view, { x: 50, y: -30 });
    step(view, { x: 60, y: -20 });
    expect(view.pan).toEqual({ x: -120, y: -40 });
  });

  test('whatever the view was showing before does not become an offset', () => {
    const view = freshView();
    view.pan = { x: 999, y: -999 };
    step(view, { x: 50, y: -30 });
    expect(view.pan).toEqual({ x: -100, y: -60 });
    expect(view.followOffset).toEqual({ x: 0, y: 0 });
  });
});

describe('a reader who moves the camera while following', () => {
  test('keeps the move, and keeps following', () => {
    const view = freshView();
    step(view, { x: 50, y: -30 });

    // A drag: something outside this module changed the pan.
    view.pan = { x: view.pan.x + 40, y: view.pan.y - 25 };

    step(view, { x: 50, y: -30 });
    // The drag survived the step, which is the defect this closes.
    expect(view.pan).toEqual({ x: -60, y: -85 });
    expect(view.followOffset).toEqual({ x: 40, y: -25 });

    // And the body is still followed: it moves, the camera moves with it, and
    // the reader's offset is preserved rather than reapplied or lost.
    step(view, { x: 70, y: -30 });
    expect(view.pan).toEqual({ x: -100, y: -85 });
    expect(view.followOffset).toEqual({ x: 40, y: -25 });
  });

  test('the offset survives many steps with no input', () => {
    const view = freshView();
    step(view, { x: 0, y: 0 });
    view.pan = { x: 17, y: -11 };
    for (let i = 0; i < 240; i++) step(view, { x: 0, y: 0 });
    expect(view.pan).toEqual({ x: 17, y: -11 });
    expect(view.followOffset).toEqual({ x: 17, y: -11 });
  });

  test('resetting the camera clears the offset instead of re-absorbing it', () => {
    const view = freshView();
    step(view, { x: 50, y: 0 });
    view.pan = { x: view.pan.x + 40, y: view.pan.y };
    step(view, { x: 50, y: 0 });
    expect(view.followOffset.x).toBe(40);

    // Reset view: a deliberate command, not a drag.
    resetFollowCamera(view);
    view.pan = { x: 0, y: 0 };
    step(view, { x: 50, y: 0 });
    expect(view.pan).toEqual({ x: -100, y: 0 });
    expect(view.followOffset).toEqual({ x: 0, y: 0 });
  });
});

describe('following inside a reference frame', () => {
  test('the pan is measured in the frame the body is drawn in', () => {
    const view = freshView();
    view.frameOffset = { x: 50, y: -30 };
    step(view, { x: 50, y: -30 });
    // The body sits at the frame's origin, so the camera needs no pan at all.
    expect(view.pan.x).toBe(0);
    expect(view.pan.y).toBe(0);
  });
});

describe('the shared mapping in a rotating frame', () => {
  const canvas = { width: 1366, height: 800 };
  const th = 0.9;
  const view = () => ({
    zoom: 2.5,
    pan: { x: 40, y: -15 },
    frameOffset: { x: 120, y: -80 },
    frameRotation: { cos: Math.cos(th), sin: Math.sin(th) },
  });

  test('screen to world undoes world to screen, so the pointer finds what is drawn', () => {
    const v = view();
    for (const p of [
      { x: 0, y: 0 },
      { x: 120, y: -80 },
      { x: -3e4, y: 7e3 },
    ]) {
      const back = screenToWorld(worldToScreen(p, v, canvas), v, canvas);
      expect(Math.hypot(back.x - p.x, back.y - p.y)).toBeLessThan(
        1e-9 * (1 + Math.hypot(p.x, p.y))
      );
    }
  });

  test('the frame’s +x axis is the screen’s rightward, so labels drawn there stay upright', () => {
    const v = view();
    const o = worldToScreen(v.frameOffset, v, canvas);
    const ax = worldToScreen(
      { x: v.frameOffset.x + Math.cos(th), y: v.frameOffset.y + Math.sin(th) },
      v,
      canvas
    );
    expect(ax.x - o.x).toBeCloseTo(v.zoom, 9);
    expect(ax.y - o.y).toBeCloseTo(0, 9);
  });

  test('the camera, handed the target in frame coordinates, centres it', () => {
    const v = { ...view(), followOffset: { x: 0, y: 0 }, followPan: null };
    const target = { x: 500, y: 260 };
    const dx = target.x - v.frameOffset.x;
    const dy = target.y - v.frameOffset.y;
    const r = v.frameRotation;
    const out = followCamera({
      targetPos: { x: r.cos * dx + r.sin * dy, y: -r.sin * dx + r.cos * dy },
      frameOffset: null,
      zoom: v.zoom,
      pan: v.pan,
      lastApplied: v.followPan,
      offset: v.followOffset,
    });
    v.pan = out.pan;
    const s = worldToScreen(target, v, canvas);
    expect(s.x).toBeCloseTo(canvas.width / 2, 9);
    expect(s.y).toBeCloseTo(canvas.height / 2, 9);
  });

  test('with no rotation the mapping is the old one, bit for bit', () => {
    const v = { ...view(), frameRotation: null };
    const p = { x: 1234.5678, y: -98.7654 };
    const s = worldToScreen(p, v, canvas);
    expect(s.x).toBe(
      (p.x - v.frameOffset.x) * v.zoom + v.pan.x + canvas.width / 2
    );
    expect(s.y).toBe(
      -(p.y - v.frameOffset.y) * v.zoom + v.pan.y + canvas.height / 2
    );
  });
});
