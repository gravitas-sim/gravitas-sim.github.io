// =============================================================================
// Follow mode does not fight the reader for the camera
// -----------------------------------------------------------------------------
// The follow block in js/physics.js assigned state.pan outright on every step,
// so a drag or a wheel zoom made while following was overwritten before the
// next frame. The behaviour chosen instead is documented in js/followCamera.js:
// manual input becomes an offset from the followed body and Follow keeps
// following.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import { followCamera, resetFollowCamera } from '../js/followCamera.js';

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
  test('centres it on the first step', () => {
    const view = freshView();
    step(view, { x: 50, y: -30 });
    expect(view.pan).toEqual({ x: -100, y: -60 });
  });

  test('keeps it centred as it moves', () => {
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
