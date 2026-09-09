// =============================================================================
// Touch gesture recognition
// -----------------------------------------------------------------------------
// One recognizer so far, and it exists because the thing it replaces was not a
// recognizer at all. js/main.js held a single timestamp and reset the camera
// whenever two `touchend` events arrived less than half a second apart:
//
//     if (currentTime - lastTap < 500) { state.zoom = 1; state.pan = {x:0,y:0}; }
//
// A pinch ends with two touchend events milliseconds apart, so every pinch
// finished by throwing the reader's view away. So did a drag followed by a tap,
// a placement followed by a tap, and two people touching the screen at once.
// The report was "the view sometimes jumps"; the surprising part is that it did
// not jump more often.
//
// A tap is one finger, briefly, without moving. A double tap is two of those,
// close together in time AND in space, with nothing in between. Everything
// else - a second finger at any point, a drag, a hold, a cancel from the
// application - ends the sequence.
//
// Pure and injectable: it takes its clock as a parameter and touches no DOM, so
// the whole state machine is testable without a browser. See
// tests/doubleTap.test.js.
// =============================================================================

/** Longest gap between two taps that still reads as one gesture, in ms. */
export const DOUBLE_TAP_MS = 320;

/** Furthest apart two taps may land and still be the same gesture, in CSS px. */
export const DOUBLE_TAP_SLOP_PX = 32;

/** Longest a finger may stay down and still count as a tap, in ms. */
export const TAP_MAX_MS = 250;

/** Furthest a finger may travel during a tap, in CSS px. */
export const TAP_MOVE_PX = 12;

/**
 * The first touch point of an event, in CSS pixels.
 *
 * CSS pixels on purpose: this compares one touch against another and never
 * against the canvas backing store, so converting would add a dependency on
 * the canvas for no gain. Anything that needs canvas pixels converts at its
 * own boundary - see canvasPoint() in js/ui.js.
 *
 * @param {{touches: Array, changedTouches: Array}} e - A touch event
 * @returns {?{x: number, y: number}} The point, or null if there is none
 */
function pointOf(e) {
  const list = e?.changedTouches?.length ? e.changedTouches : e?.touches;
  const touch = list && list[0];
  if (!touch) return null;
  return { x: touch.clientX, y: touch.clientY };
}

/**
 * A double-tap recognizer.
 *
 * @param {object} options
 * @param {Function} options.onDoubleTap - Called with the tap point
 * @param {Function} [options.now] - Clock, for tests
 * @returns {{start: Function, move: Function, end: Function, cancel: Function}}
 *   Feed it the three touch events; call cancel() when something else has
 *   claimed the interaction.
 */
export function createDoubleTapRecognizer({ onDoubleTap, now } = {}) {
  const clock =
    now ||
    (() =>
      typeof performance !== 'undefined' && performance.now
        ? performance.now()
        : Date.now());

  /** The press in progress, or null. */
  let press = null;
  /** The completed tap waiting for a partner, or null. */
  let pending = null;

  /** Forget everything. The sequence is over and did not qualify. */
  const cancel = () => {
    press = null;
    pending = null;
  };

  return {
    /**
     * A finger went down.
     * @param {object} e - touchstart
     */
    start(e) {
      // A second finger means a pinch, a two-finger pan, or a stray palm. None
      // of those is a tap, and none of them should leave a half-finished tap
      // behind to pair with the next one.
      if ((e?.touches?.length || 0) > 1) {
        cancel();
        return;
      }
      const at = pointOf(e);
      if (!at) {
        cancel();
        return;
      }
      press = { at, downAt: clock(), moved: false };
    },

    /**
     * A finger moved.
     * @param {object} e - touchmove
     */
    move(e) {
      if ((e?.touches?.length || 0) > 1) {
        cancel();
        return;
      }
      if (!press) return;
      const at = pointOf(e);
      if (!at) return;
      if (Math.hypot(at.x - press.at.x, at.y - press.at.y) > TAP_MOVE_PX) {
        press.moved = true;
      }
    },

    /**
     * A finger came up.
     * @param {object} e - touchend
     */
    end(e) {
      const current = press;
      press = null;

      // Fingers still down: this is one finger leaving a multi-touch gesture,
      // not a tap ending. The `start` guard has already cleared `press`, and
      // clearing `pending` here is what stops the *other* finger's touchend
      // from pairing with a legitimate tap that came before the pinch.
      if ((e?.touches?.length || 0) > 0) {
        pending = null;
        return;
      }

      if (!current || current.moved) {
        pending = null;
        return;
      }
      const at = pointOf(e) || current.at;
      const held = clock() - current.downAt;
      // A long press is how placement is armed; it is deliberately not a tap.
      if (held > TAP_MAX_MS) {
        pending = null;
        return;
      }
      // The finger may have drifted between the last move and the release.
      if (Math.hypot(at.x - current.at.x, at.y - current.at.y) > TAP_MOVE_PX) {
        pending = null;
        return;
      }

      const at_ms = clock();
      if (
        pending &&
        at_ms - pending.at_ms <= DOUBLE_TAP_MS &&
        Math.hypot(at.x - pending.x, at.y - pending.y) <= DOUBLE_TAP_SLOP_PX
      ) {
        pending = null;
        if (typeof onDoubleTap === 'function')
          onDoubleTap({ x: at.x, y: at.y });
        return;
      }
      pending = { x: at.x, y: at.y, at_ms };
    },

    cancel,
  };
}
