// =============================================================================
// The sound starts where the playhead is
// -----------------------------------------------------------------------------
// The gravitational-wave lab has a playhead and a Listen button, and they used
// to run on unrelated clocks. renderAudio takes a t0 and defaults it to the
// timeline's start; nothing passed anything else, so pressing Listen with the
// playhead two thirds of the way through a chirp played the chirp from the
// beginning - a different moment of the signal from the one on screen.
//
// The arithmetic that fixes it is here, away from the Web Audio API, so it can
// be tested exactly. What a browser does with the resulting buffer is tested in
// e2e/gwAudio.spec.js, where it can only be tested approximately - see
// ALIGNMENT_TOLERANCE_S for why, and for where that number comes from.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import {
  ALIGNMENT_TOLERANCE_S,
  aligned,
  audioOffsetFor,
  playFromCursor,
  signalTimeAt,
} from '../js/gw/transport.js';

/** A timeline's worth of the fields the transport reads. */
const span = (tStart, tEnd) => ({ tStart, tEnd, duration: tEnd - tStart });

describe('mapping between audio seconds and signal seconds', () => {
  test('a buffer rendered from t0 is at t0 when it starts', () => {
    expect(signalTimeAt(-4, 0, 10)).toBe(-4);
  });

  test('one second of audio is `speed` seconds of signal', () => {
    expect(signalTimeAt(-4, 1, 10)).toBe(6);
    expect(signalTimeAt(-4, 0.5, 10)).toBe(1);
  });

  test('the offset is the inverse of the position', () => {
    const t0 = -4;
    const speed = 7;
    for (const elapsed of [0, 0.25, 1, 2.5]) {
      const t = signalTimeAt(t0, elapsed, speed);
      expect(audioOffsetFor(t0, t, speed)).toBeCloseTo(elapsed, 12);
    }
  });

  test('a time before the buffer starts is a negative offset, not zero', () => {
    // Clamping here would hide a caller that asked for a moment the buffer does
    // not contain.
    expect(audioOffsetFor(0, -2, 1)).toBe(-2);
  });

  test('a nonsense speed falls back to real time rather than dividing by zero', () => {
    expect(signalTimeAt(0, 2, 0)).toBe(2);
    expect(signalTimeAt(0, 2, NaN)).toBe(2);
    expect(audioOffsetFor(0, 2, -1)).toBe(2);
  });

  test('a nonsense time is not a number rather than a plausible wrong one', () => {
    expect(signalTimeAt(NaN, 1, 1)).toBeNaN();
    expect(audioOffsetFor(0, NaN, 1)).toBeNaN();
  });
});

describe('playing from the playhead', () => {
  const timeline = span(-8, 0);
  const plan = { speed: 4 };

  test('starts at the playhead, not at the beginning of the signal', () => {
    expect(playFromCursor(timeline, -3, plan).t0).toBe(-3);
  });

  test('lasts as long as what is left, at the plan speed', () => {
    // Five seconds of signal left, played at four seconds of signal per second.
    expect(playFromCursor(timeline, -5, plan).seconds).toBeCloseTo(1.25, 12);
  });

  test('from the start it is the whole span', () => {
    const whole = playFromCursor(timeline, timeline.tStart, plan);
    expect(whole.t0).toBe(-8);
    expect(whole.seconds).toBeCloseTo(2, 12);
    expect(whole.atEnd).toBe(false);
  });

  test('at the end there is nothing to play, and it says so', () => {
    const end = playFromCursor(timeline, 0, plan);
    expect(end.seconds).toBe(0);
    expect(end.atEnd).toBe(true);
  });

  test('a playhead outside the span is pulled to the nearest end', () => {
    expect(playFromCursor(timeline, -99, plan).t0).toBe(-8);
    expect(playFromCursor(timeline, 99, plan).t0).toBe(0);
  });

  test('a missing playhead is the start of the signal', () => {
    expect(playFromCursor(timeline, undefined, plan).t0).toBe(-8);
    expect(playFromCursor(timeline, NaN, plan).t0).toBe(-8);
  });

  // The invariant that keeps the lab's comparison honest. Two distances have to
  // be comparable by ear, and speed is what sets the pitch - so moving the
  // playhead must change where the sound starts and how long it lasts, and not
  // what it sounds like.
  test('the speed does not depend on where the playhead is', () => {
    const early = playFromCursor(timeline, -8, plan);
    const late = playFromCursor(timeline, -1, plan);
    // Same plan in, so the only thing that moved is the origin and the length.
    expect(late.t0).toBeGreaterThan(early.t0);
    expect(late.seconds).toBeLessThan(early.seconds);
    expect(
      playFromCursor(timeline, -8, plan).seconds /
        (timeline.duration / plan.speed)
    ).toBeCloseTo(1, 12);
  });
});

describe('what counts as aligned', () => {
  test('the tolerance is one frame plus output latency, not a round number', () => {
    // 16.7 ms of frame granularity plus 50 ms of typical output latency.
    expect(ALIGNMENT_TOLERANCE_S).toBeGreaterThanOrEqual(0.0167 + 0.05);
    // And small enough that half a second of drift is still a failure.
    expect(ALIGNMENT_TOLERANCE_S).toBeLessThan(0.1);
  });

  test('a difference under the tolerance is aligned, measured in audio seconds', () => {
    const speed = 10;
    // Half the tolerance, expressed as signal time.
    expect(aligned(0, (ALIGNMENT_TOLERANCE_S / 2) * speed, speed)).toBe(true);
  });

  test('a difference over the tolerance is not', () => {
    const speed = 10;
    expect(aligned(0, ALIGNMENT_TOLERANCE_S * speed * 1.5, speed)).toBe(false);
  });

  // The tolerance is a statement about the audio clock, so the same signal-time
  // gap is aligned at one speed and not at another.
  test('the same gap in signal time can be aligned at one speed and not another', () => {
    const gap = 0.5;
    expect(aligned(0, gap, 100)).toBe(true);
    expect(aligned(0, gap, 1)).toBe(false);
  });

  test('a missing measurement is never aligned', () => {
    expect(aligned(NaN, 0, 1)).toBe(false);
    expect(aligned(0, NaN, 1)).toBe(false);
  });
});
