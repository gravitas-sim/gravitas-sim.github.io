// =============================================================================
// Recognising a double tap, and refusing to recognise anything else
// -----------------------------------------------------------------------------
// The detector this replaces was four lines and one rule: any two `touchend`
// events less than 500 ms apart reset the zoom and the pan. Lifting two fingers
// off a pinch fires two touchend events milliseconds apart, so every pinch
// ended by snapping the view back to the origin - which is the "the view jumps"
// report, on a touchscreen, in whichever scenario the reader was pinching
// around. Two people tapping two different parts of the canvas did it too, and
// so did the finger that ends a placement drag followed by the next tap.
//
// A double tap is two *taps*: one finger each, short, still, close together in
// space as well as in time, with nothing else happening in between.
// =============================================================================

import { describe, test, expect, beforeEach } from '@jest/globals';
import {
  createDoubleTapRecognizer,
  DOUBLE_TAP_MS,
  DOUBLE_TAP_SLOP_PX,
  TAP_MAX_MS,
  TAP_MOVE_PX,
} from '../js/gestures.js';

/** A TouchEvent-shaped object: `touches` is what is still down. */
const ev = (down, changed) => ({
  touches: down,
  changedTouches: changed ?? down,
});
const finger = (id, x, y) => ({ identifier: id, clientX: x, clientY: y });

let clock;
let fired;
let tap;

beforeEach(() => {
  clock = 1000;
  fired = 0;
  tap = createDoubleTapRecognizer({
    onDoubleTap: () => fired++,
    now: () => clock,
  });
});

/** One complete single-finger tap at a point, taking `ms` and moving `drift`. */
function singleTap(x, y, { ms = 60, drift = 0 } = {}) {
  tap.start(ev([finger(1, x, y)]));
  clock += ms;
  if (drift) tap.move(ev([finger(1, x + drift, y)]));
  tap.end(ev([], [finger(1, x + drift, y)]));
}

describe('what counts as a double tap', () => {
  test('two quick taps in the same place', () => {
    singleTap(200, 200);
    clock += 120;
    singleTap(206, 197);
    expect(fired).toBe(1);
  });

  test('and it does not fire a third time on the next tap', () => {
    singleTap(200, 200);
    clock += 120;
    singleTap(200, 200);
    expect(fired).toBe(1);
    clock += 120;
    singleTap(200, 200);
    // The pair is consumed, so this is the first tap of a new pair.
    expect(fired).toBe(1);
  });
});

describe('what does not', () => {
  test('the two fingers that end a pinch', () => {
    // Both down, then both up within a few milliseconds - the exact sequence
    // that used to reset the view on every pinch.
    tap.start(ev([finger(1, 100, 100)]));
    tap.start(ev([finger(1, 100, 100), finger(2, 300, 300)]));
    tap.move(ev([finger(1, 90, 90), finger(2, 320, 320)]));
    clock += 400;
    tap.end(ev([finger(2, 320, 320)], [finger(1, 90, 90)]));
    clock += 8;
    tap.end(ev([], [finger(2, 320, 320)]));
    expect(fired).toBe(0);
  });

  test('two taps far apart on the canvas', () => {
    singleTap(120, 120);
    clock += 120;
    singleTap(120 + DOUBLE_TAP_SLOP_PX * 3, 120);
    expect(fired).toBe(0);
  });

  test('two taps too far apart in time', () => {
    singleTap(200, 200);
    clock += DOUBLE_TAP_MS + 50;
    singleTap(200, 200);
    expect(fired).toBe(0);
  });

  test('a tap that was really a drag', () => {
    singleTap(200, 200);
    clock += 120;
    singleTap(200, 200, { drift: TAP_MOVE_PX * 3 });
    expect(fired).toBe(0);
  });

  test('a press held long enough to be a long press', () => {
    singleTap(200, 200);
    clock += 120;
    singleTap(200, 200, { ms: TAP_MAX_MS + 50 });
    expect(fired).toBe(0);
  });

  test('a tap after a placement, which cancels the sequence', () => {
    singleTap(200, 200);
    // Arming placement, dropping an object, opening a panel: all of them mean
    // the reader was not tapping twice at the same thing.
    tap.cancel();
    clock += 120;
    singleTap(200, 200);
    expect(fired).toBe(0);
  });

  test('a second finger arriving between the two taps', () => {
    singleTap(200, 200);
    clock += 100;
    tap.start(ev([finger(1, 200, 200)]));
    tap.start(ev([finger(1, 200, 200), finger(2, 260, 260)]));
    clock += 40;
    tap.end(ev([finger(1, 200, 200)], [finger(2, 260, 260)]));
    tap.end(ev([], [finger(1, 200, 200)]));
    expect(fired).toBe(0);
  });
});

describe('the thresholds are sane', () => {
  test('a tap is shorter than the double-tap window', () => {
    expect(TAP_MAX_MS).toBeLessThan(DOUBLE_TAP_MS);
  });

  test('a tap may drift less than two taps may be apart', () => {
    expect(TAP_MOVE_PX).toBeLessThan(DOUBLE_TAP_SLOP_PX);
  });

  test('the window is shorter than the half-second that caused this', () => {
    expect(DOUBLE_TAP_MS).toBeLessThan(500);
  });
});
