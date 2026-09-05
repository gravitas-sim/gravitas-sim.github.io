import { describe, test, expect } from '@jest/globals';
import {
  decideSampling,
  dropInvalidatedSamples,
  sameSession,
  sessionChange,
  sessionKey,
} from '../js/observingSession.js';

// =============================================================================
// One recording, one observing session
// -----------------------------------------------------------------------------
// A radial-velocity curve and an astrometric path each record one star, watched
// from one direction, over advancing time. These are the four ways that used to
// break, each of which produced a plausible-looking curve that was not a
// measurement of anything:
//
//   switching stars in a binary   appended the second star's velocities to the
//                                 first star's curve
//   pausing                       was handled, but only by a check on
//                                 state.paused, which is not the same question
//                                 as "has the clock moved"
//   moving the observer while     went unnoticed, because the subscription that
//   the panel was closed          would have caught it is released on close
//   rewinding and resuming        appended new samples behind existing ones and
//                                 left a future in the series that no longer
//                                 happens
// =============================================================================

const geometry = (positionAngleDeg = 0, inclinationDeg = 90) => ({
  positionAngleDeg,
  inclinationDeg,
});

const session = (starId, pa = 0, inc = 90) =>
  sessionKey({ starId, geometry: geometry(pa, inc) });

describe('what makes two recordings the same session', () => {
  test('the same star from the same direction', () => {
    expect(sameSession(session(7), session(7))).toBe(true);
    expect(sessionChange(session(7), session(7))).toBeNull();
  });

  test('a different star is a different session', () => {
    expect(sameSession(session(7), session(8))).toBe(false);
    expect(sessionChange(session(7), session(8))).toBe('target');
  });

  test('a different direction is a different session', () => {
    expect(sessionChange(session(7, 0, 90), session(7, 30, 90))).toBe(
      'geometry'
    );
    expect(sessionChange(session(7, 0, 90), session(7, 0, 45))).toBe(
      'geometry'
    );
  });

  test('the target is reported first when both moved', () => {
    // "A different star" is the more useful thing to say.
    expect(sessionChange(session(7, 0, 90), session(8, 30, 45))).toBe('target');
  });

  test('a float that differs in its last bit is not a new direction', () => {
    // The geometry comes from sliders and is compared for equality. Losing a
    // recording to a rounding difference would be its own kind of wrong.
    const a = sessionKey({ starId: 1, geometry: geometry(30.0000001, 90) });
    const b = sessionKey({ starId: 1, geometry: geometry(30, 90) });
    expect(sameSession(a, b)).toBe(true);
  });

  test('no star is a session too, and differs from having one', () => {
    expect(sameSession(session(null), session(null))).toBe(true);
    expect(sessionChange(session(null), session(3))).toBe('target');
  });
});

describe('switching stars in a binary', () => {
  test('restarts the recording rather than continuing it', () => {
    // The defect this exists for: both panels take their target from
    // observedStar(), which follows the selection. Selecting the companion
    // moved the instrument and nothing noticed.
    const decision = decideSampling({
      recordedSession: session(1),
      currentSession: session(2),
      lastSampleTime: 4.2,
      simTime: 4.3,
    });
    expect(decision.action).toBe('restart');
    expect(decision.reason).toBe('target');
  });

  test('restarting wins over every other consideration', () => {
    // Even paused, even scrubbing, even with the clock apparently rewound: the
    // samples are of a different star and must not be added to.
    for (const extra of [
      { paused: true },
      { scrubbing: true },
      { simTime: 0.1 },
    ]) {
      const decision = decideSampling({
        recordedSession: session(1),
        currentSession: session(2),
        lastSampleTime: 4.2,
        simTime: 4.3,
        ...extra,
      });
      expect(decision.action).toBe('restart');
    }
  });
});

describe('pausing', () => {
  test('preserves the recording and adds nothing', () => {
    const decision = decideSampling({
      recordedSession: session(1),
      currentSession: session(1),
      lastSampleTime: 4.2,
      simTime: 4.2,
      paused: true,
    });
    expect(decision.action).toBe('hold');
  });

  test('a frame that renders without the clock moving adds nothing', () => {
    // Not the same question as "is it paused". A stepped frame, or a scrub that
    // landed on the frame already displayed, renders with the clock unchanged,
    // and a sample then is a duplicate rather than a measurement. On a bounded
    // buffer, duplicates evict real history to make room for themselves.
    const decision = decideSampling({
      recordedSession: session(1),
      currentSession: session(1),
      lastSampleTime: 4.2,
      simTime: 4.2,
      paused: false,
    });
    expect(decision.action).toBe('hold');
  });

  test('and resuming appends again', () => {
    const decision = decideSampling({
      recordedSession: session(1),
      currentSession: session(1),
      lastSampleTime: 4.2,
      simTime: 4.26,
    });
    expect(decision.action).toBe('append');
  });
});

describe('the observer moving while the panel was closed', () => {
  test('is caught by comparing the session on reopen', () => {
    // The panel releases its observer subscription when it closes, so nothing
    // fires while it is shut. Comparing the stored session against the current
    // one on open is what notices, and it is the only thing that can.
    const whenRecorded = session(1, 0, 90);
    const whenReopened = session(1, 120, 30);
    expect(sessionChange(whenRecorded, whenReopened)).toBe('geometry');
  });

  test('an unchanged geometry keeps the recording across a close and open', () => {
    const whenRecorded = session(1, 45, 60);
    expect(sessionChange(whenRecorded, session(1, 45, 60))).toBeNull();
  });
});

describe('rewinding the timeline and resuming', () => {
  test('a clock that has gone backwards truncates rather than appends', () => {
    const decision = decideSampling({
      recordedSession: session(1),
      currentSession: session(1),
      lastSampleTime: 9.5,
      simTime: 4.0,
    });
    expect(decision.action).toBe('truncate');
    expect(decision.reason).toBe('rewound');
  });

  test('scrubbing itself records nothing', () => {
    // Parked on a recorded frame, the view is a replay. Sampling it would write
    // the same instant into the series over and over.
    const decision = decideSampling({
      recordedSession: session(1),
      currentSession: session(1),
      lastSampleTime: 9.5,
      simTime: 4.0,
      scrubbing: true,
    });
    expect(decision.action).toBe('hold');
  });

  test('truncation keeps the past and drops the invalidated future', () => {
    const samples = [
      { x: 1, y: 10 },
      { x: 2, y: 20 },
      { x: 3, y: 30 },
      { x: 4, y: 40 },
      { x: 5, y: 50 },
    ];
    const kept = dropInvalidatedSamples(samples, 3, s => s.x);
    expect(kept.map(s => s.x)).toEqual([1, 2]);
  });

  test('a sample exactly at the rewind point goes too', () => {
    // The next appended sample will carry that timestamp, and two points at one
    // instant is the duplicate the whole mechanism exists to avoid.
    const kept = dropInvalidatedSamples([{ t: 3 }], 3, s => s.t);
    expect(kept).toEqual([]);
  });

  test('it works on astrometric samples, which now carry a timestamp', () => {
    // Astrometric samples used to be {x, y} with no time at all, which made a
    // rewind impossible to clean up: there was no way to tell which points were
    // recorded after the moment being returned to.
    const path = [
      { x: 0.1, y: 0.0, t: 1 },
      { x: 0.0, y: 0.1, t: 2 },
      { x: -0.1, y: 0.0, t: 3 },
    ];
    expect(dropInvalidatedSamples(path, 2, p => p.t).map(p => p.t)).toEqual([
      1,
    ]);
  });

  test('a sample with no usable timestamp is dropped rather than kept', () => {
    const kept = dropInvalidatedSamples(
      [{ t: 1 }, { t: undefined }, { t: NaN }],
      5,
      s => s.t
    );
    expect(kept).toEqual([{ t: 1 }]);
  });
});

describe('starting from nothing', () => {
  test('the first sample of a run appends', () => {
    expect(
      decideSampling({
        recordedSession: null,
        currentSession: session(1),
        lastSampleTime: null,
        simTime: 0,
      }).action
    ).toBe('append');
  });

  test('but not while paused or scrubbing', () => {
    for (const extra of [{ paused: true }, { scrubbing: true }]) {
      expect(
        decideSampling({
          recordedSession: null,
          currentSession: session(1),
          lastSampleTime: null,
          simTime: 0,
          ...extra,
        }).action
      ).toBe('hold');
    }
  });
});
