import { describe, test, expect, jest } from '@jest/globals';
import {
  EVENT_KINDS,
  MIN_ECCENTRICITY,
  armEvent,
  armedEvent,
  annotateLastEvent,
  canArm,
  clearLastEvent,
  crossedZero,
  disarm,
  eventSignal,
  lastEvent,
  onEvent,
  refineCrossing,
  resetPauseAtEvent,
  separationState,
} from '../js/pauseAtEvent.js';

// =============================================================================
// Pause at event
// -----------------------------------------------------------------------------
// The thing worth testing hardest is the timing: an event found to a precision
// nobody stated is not a measurement. So most of what follows drives a Kepler
// orbit whose periapsis time is known in closed form, at several integration
// steps, and checks both that the answer is right and that the *stated*
// precision is honest about how right.
// =============================================================================

/** A body in the shape physics.js hands around. */
const body = (x, y, vx, vy, over = {}) => ({
  alive: true,
  mass: 0,
  pos: { x, y },
  vel: { x: vx, y: vy },
  ...over,
});

/**
 * An analytic two-body orbit, stepped exactly rather than integrated.
 *
 * Kepler's equation, solved per step, so the "simulation" has no integration
 * error of its own and any error in the detected time is the detector's. That
 * is the only way to test a detector's precision: against a truth that has none.
 */
function keplerOrbit({ a = 1, e = 0.5, mu = 1, t0 = 0 } = {}) {
  const n = Math.sqrt(mu / (a * a * a));
  const period = (2 * Math.PI) / n;
  return {
    period,
    /** Periapsis passages happen at t0, t0 + P, t0 + 2P... */
    periapsisAt: k => t0 + k * period,
    apoapsisAt: k => t0 + (k + 0.5) * period,
    /** Position and velocity at time t. */
    at(t) {
      const M = n * (t - t0);
      let E = M;
      for (let i = 0; i < 80; i++) {
        E = E - (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
      }
      const cosE = Math.cos(E);
      const sinE = Math.sin(E);
      const r = a * (1 - e * cosE);
      const x = a * (cosE - e);
      const y = a * Math.sqrt(1 - e * e) * sinE;
      const factor = (Math.sqrt(mu * a) / r) * 1;
      return {
        x,
        y,
        vx: -factor * sinE,
        vy: factor * Math.sqrt(1 - e * e) * cosE,
        r,
      };
    },
  };
}

/**
 * Run a watch against an analytic orbit at a fixed step.
 *
 * @param {object} spec - The watch
 * @param {object} orbit - From keplerOrbit
 * @param {number} dt - Integration step, in the same time unit
 * @param {number} until - How long to run for
 */
function runWatch(spec, orbit, dt, until, extra = {}) {
  const primary = body(0, 0, 0, 0, { mass: 1 });
  const moving = body(0, 0, 0, 0, { mass: 0 });
  let clock = 0;
  let paused = false;
  const steps = new Set();

  const place = t => {
    const s = orbit.at(t);
    moving.pos.x = s.x;
    moving.pos.y = s.y;
    moving.vel.x = s.vx;
    moving.vel.y = s.vy;
  };
  place(0);

  const deps = {
    resolveBody: id =>
      id === 'primary' ? primary : id === 'body' ? moving : null,
    pause: () => {
      paused = true;
    },
    clockDays: () => clock,
    onStep: fn => {
      steps.add(fn);
      return () => steps.delete(fn);
    },
    G: () => 1,
    ...extra,
  };

  const armed = armEvent(
    { bodyId: 'body', primaryId: 'primary', ...spec },
    deps
  );
  if (!armed.ok) return { armed, paused: false, event: null };

  for (let i = 1; i <= Math.ceil(until / dt) && !paused; i++) {
    clock = i * dt;
    place(clock);
    for (const fn of [...steps]) fn(dt, clock);
  }
  return { armed, paused, event: lastEvent(), clock };
}

afterEach(() => {
  resetPauseAtEvent();
});

describe('the arithmetic the detection rests on', () => {
  test('a crossing is bracketed in the direction asked for', () => {
    expect(crossedZero(-1, 1, true)).toBe(true);
    expect(crossedZero(-1, 1, false)).toBe(false);
    expect(crossedZero(1, -1, false)).toBe(true);
    expect(crossedZero(1, -1, true)).toBe(false);
    // A sample landing exactly on zero is the crossing, not a miss.
    expect(crossedZero(-1, 0, true)).toBe(true);
    expect(crossedZero(1, 0, false)).toBe(true);
    expect(crossedZero(NaN, 1, true)).toBe(false);
  });

  test('refinement lands where the signal actually crossed', () => {
    // Zero three quarters of the way through the bracket.
    const { time, bracket } = refineCrossing(
      { t: 10, value: -3 },
      { t: 12, value: 1 }
    );
    expect(time).toBeCloseTo(11.5, 9);
    expect(bracket).toBe(2);
  });

  test('a flat signal is reported at the middle of its bracket, not at an end', () => {
    const { time } = refineCrossing({ t: 4, value: 0 }, { t: 6, value: 0 });
    expect(time).toBe(5);
  });

  test('periapsis and apoapsis are the same crossing in opposite directions', () => {
    const state = { r: 2, rdot: -0.5 };
    expect(eventSignal(EVENT_KINDS.PERIAPSIS, state).rising).toBe(true);
    expect(eventSignal(EVENT_KINDS.APOAPSIS, state).rising).toBe(false);
    expect(eventSignal(EVENT_KINDS.PERIAPSIS, state).value).toBe(-0.5);
  });

  test('a separation watch measures against the radius it was given', () => {
    const state = { r: 5, rdot: -1 };
    expect(eventSignal(EVENT_KINDS.SEPARATION_INWARD, state, 3).value).toBe(2);
    expect(eventSignal(EVENT_KINDS.SEPARATION_INWARD, state, 3).rising).toBe(
      false
    );
    expect(eventSignal(EVENT_KINDS.SEPARATION_OUTWARD, state, 3).rising).toBe(
      true
    );
    // Without a radius there is nothing to cross.
    expect(eventSignal(EVENT_KINDS.SEPARATION_INWARD, state)).toBeNull();
  });

  test('the separation rate is the derivative of the separation', () => {
    // Moving directly outward at unit speed.
    const s = separationState(body(3, 4, 0.6, 0.8), body(0, 0, 0, 0));
    expect(s.r).toBeCloseTo(5, 9);
    expect(s.rdot).toBeCloseTo(1, 9);
    // ...and directly inward.
    const t = separationState(body(3, 4, -0.6, -0.8), body(0, 0, 0, 0));
    expect(t.rdot).toBeCloseTo(-1, 9);
    // Purely tangential motion does not change the separation.
    const u = separationState(body(5, 0, 0, 3), body(0, 0, 0, 0));
    expect(u.rdot).toBeCloseTo(0, 9);
  });

  test('a body with nothing to orbit has no separation at all', () => {
    expect(separationState(null, body(0, 0, 0, 0))).toBeNull();
    expect(separationState(body(1, 0, 0, 0), null)).toBeNull();
    const dead = body(1, 0, 0, 0, { alive: false });
    expect(separationState(dead, body(0, 0, 0, 0))).toBeNull();
    const one = body(1, 0, 0, 0);
    expect(separationState(one, one)).toBeNull();
  });
});

describe('what cannot be watched for, and why', () => {
  const elements = over => ({
    bound: true,
    e: 0.5,
    periapsis: 0.5,
    apoapsis: 1.5,
    ...over,
  });
  const pair = { body: body(1, 0, 0, 1), primary: body(0, 0, 0, 0) };

  test('a circular orbit has no periapsis to stop at', () => {
    // The refusal that matters most. On a circular orbit the radial rate is
    // zero everywhere and its sign is decided by integration error, so a watch
    // would fire on the first step and every step after it.
    const verdict = canArm(
      { kind: EVENT_KINDS.PERIAPSIS },
      { ...pair, elements: elements({ e: 0 }) }
    );
    expect(verdict).toEqual({
      ok: false,
      reason: 'circular',
      detail: { e: 0 },
    });

    // Just below the threshold is still refused; just above is allowed.
    expect(
      canArm(
        { kind: EVENT_KINDS.PERIAPSIS },
        { ...pair, elements: elements({ e: MIN_ECCENTRICITY / 2 }) }
      ).ok
    ).toBe(false);
    expect(
      canArm(
        { kind: EVENT_KINDS.PERIAPSIS },
        { ...pair, elements: elements({ e: MIN_ECCENTRICITY * 2 }) }
      ).ok
    ).toBe(true);
  });

  test('an unbound orbit has no apoapsis', () => {
    expect(
      canArm(
        { kind: EVENT_KINDS.APOAPSIS },
        { ...pair, elements: elements({ bound: false }) }
      ).reason
    ).toBe('unbound');
  });

  test('a separation the orbit never reaches is refused up front', () => {
    const tooClose = canArm(
      { kind: EVENT_KINDS.SEPARATION_INWARD, separation: 0.1 },
      { ...pair, elements: elements() }
    );
    expect(tooClose.reason).toBe('outsideOrbit');
    expect(tooClose.detail).toEqual({ periapsis: 0.5, apoapsis: 1.5 });

    const tooFar = canArm(
      { kind: EVENT_KINDS.SEPARATION_OUTWARD, separation: 9 },
      { ...pair, elements: elements() }
    );
    expect(tooFar.reason).toBe('outsideOrbit');

    // One that the orbit does cross is fine.
    expect(
      canArm(
        { kind: EVENT_KINDS.SEPARATION_INWARD, separation: 1 },
        { ...pair, elements: elements() }
      ).ok
    ).toBe(true);
  });

  test('a missing body or primary is named as such', () => {
    expect(
      canArm({ kind: EVENT_KINDS.PERIAPSIS }, { primary: pair.primary }).reason
    ).toBe('noBody');
    expect(
      canArm({ kind: EVENT_KINDS.PERIAPSIS }, { body: pair.body }).reason
    ).toBe('noPrimary');
    const one = body(1, 0, 0, 0);
    expect(
      canArm({ kind: EVENT_KINDS.PERIAPSIS }, { body: one, primary: one })
        .reason
    ).toBe('samePrimary');
  });

  test('a nonsensical separation is refused', () => {
    for (const separation of [0, -1, Number.NaN, undefined]) {
      expect(
        canArm(
          { kind: EVENT_KINDS.SEPARATION_INWARD, separation },
          { ...pair, elements: elements() }
        ).reason
      ).toBe('badSeparation');
    }
  });

  test('a transit watch needs no orbit of its own', () => {
    expect(canArm({ kind: EVENT_KINDS.TRANSIT }, {}).ok).toBe(true);
  });
});

describe('timing against an orbit whose answer is known', () => {
  // a = 1, mu = 1 gives a period of 2*pi. Periapsis is at t = 0, P, 2P...
  const orbit = keplerOrbit({ a: 1, e: 0.5, mu: 1 });

  test.each([0.05, 0.02, 0.01, 0.002])(
    'periapsis is found at the right time with a step of %p',
    dt => {
      const { paused, event } = runWatch(
        { kind: EVENT_KINDS.PERIAPSIS },
        orbit,
        dt,
        orbit.period * 1.2
      );
      expect(paused).toBe(true);
      expect(event.kind).toBe(EVENT_KINDS.PERIAPSIS);
      // The first periapsis after t = 0 is one whole period later.
      expect(event.timeDays).toBeCloseTo(orbit.period, 2);
    }
  );

  test('the stated precision is honest: the error is inside the bracket', () => {
    // The claim the readout makes. Whatever the step, the true time must lie
    // within the interval the detector says it localised the event to.
    for (const dt of [0.1, 0.05, 0.02, 0.01, 0.005]) {
      const { event } = runWatch(
        { kind: EVENT_KINDS.PERIAPSIS },
        orbit,
        dt,
        orbit.period * 1.2
      );
      expect(event.bracketDays).toBeCloseTo(dt, 9);
      expect(Math.abs(event.timeDays - orbit.period)).toBeLessThanOrEqual(
        event.bracketDays
      );
    }
  });

  test('a finer step gives a finer answer, which is the point of stating it', () => {
    const coarse = runWatch(
      { kind: EVENT_KINDS.PERIAPSIS },
      orbit,
      0.1,
      8
    ).event;
    const fine = runWatch(
      { kind: EVENT_KINDS.PERIAPSIS },
      orbit,
      0.002,
      8
    ).event;
    expect(fine.bracketDays).toBeLessThan(coarse.bracketDays);
    expect(Math.abs(fine.timeDays - orbit.period)).toBeLessThan(
      Math.abs(coarse.timeDays - orbit.period) + 1e-9
    );
  });

  test('apoapsis is found half a period away from periapsis', () => {
    const { event } = runWatch(
      { kind: EVENT_KINDS.APOAPSIS },
      orbit,
      0.005,
      orbit.period
    );
    expect(event.timeDays).toBeCloseTo(orbit.period / 2, 2);
  });

  test('the pause is after the event, and says by how much', () => {
    // Nothing is rewound, so the simulation is always a little past the event.
    // The overshoot is reported rather than hidden, and is less than one step.
    const dt = 0.01;
    const { event, clock } = runWatch(
      { kind: EVENT_KINDS.PERIAPSIS },
      orbit,
      dt,
      orbit.period * 1.2
    );
    expect(event.overshootDays).toBeGreaterThan(0);
    expect(event.overshootDays).toBeLessThanOrEqual(dt + 1e-9);
    expect(clock - event.timeDays).toBeCloseTo(event.overshootDays, 9);
  });

  test('a separation crossing is found where the orbit reaches that radius', () => {
    // r = a(1 - e cos E); with a = 1 and e = 0.5 the orbit runs from 0.5 to 1.5.
    const { event } = runWatch(
      { kind: EVENT_KINDS.SEPARATION_OUTWARD, separation: 1.2 },
      orbit,
      0.002,
      orbit.period
    );
    expect(event.kind).toBe(EVENT_KINDS.SEPARATION_OUTWARD);
    expect(event.detail.separation).toBeCloseTo(1.2, 2);
    // Outward means the separation really was increasing through it.
    expect(event.detail.radialRate).toBeGreaterThan(0);
  });

  test('an inward crossing is a different moment from an outward one', () => {
    const out = runWatch(
      { kind: EVENT_KINDS.SEPARATION_OUTWARD, separation: 1.2 },
      orbit,
      0.002,
      orbit.period
    ).event;
    const inward = runWatch(
      { kind: EVENT_KINDS.SEPARATION_INWARD, separation: 1.2 },
      orbit,
      0.002,
      orbit.period
    ).event;
    expect(inward.timeDays).toBeGreaterThan(out.timeDays);
    expect(inward.detail.radialRate).toBeLessThan(0);
  });
});

describe('the watch stops watching when it should', () => {
  const orbit = keplerOrbit({ a: 1, e: 0.5, mu: 1 });

  test('nothing is subscribed until something is armed', () => {
    expect(armedEvent()).toBeNull();
  });

  test('firing disarms, so the simulation is stopped once', () => {
    const pause = jest.fn();
    runWatch({ kind: EVENT_KINDS.PERIAPSIS }, orbit, 0.01, 8, { pause });
    expect(armedEvent()).toBeNull();
  });

  test('a body that disappears disarms the watch and says why', () => {
    const primary = body(0, 0, 0, 0, { mass: 1 });
    // Deliberately eccentric: at unit speed this orbit is a circle of radius 1,
    // and a watch for a crossing of 0.9 would be refused as unreachable - which
    // is the right answer to a different question than this test is asking.
    const moving = body(1, 0, 0, 0.8);
    let clock = 0;
    const steps = new Set();
    const seen = [];
    onEvent(e => seen.push(e));

    const armed = armEvent(
      {
        kind: EVENT_KINDS.SEPARATION_INWARD,
        bodyId: 'b',
        primaryId: 'p',
        separation: 0.9,
      },
      {
        resolveBody: id => (id === 'p' ? primary : moving),
        pause: () => {},
        clockDays: () => clock,
        onStep: fn => {
          steps.add(fn);
          return () => steps.delete(fn);
        },
        G: () => 1,
      }
    );
    expect(armed.ok).toBe(true);

    clock = 1;
    for (const fn of [...steps]) fn(1, 1);
    // The body merges into something else.
    moving.alive = false;
    clock = 2;
    for (const fn of [...steps]) fn(1, 2);

    expect(armedEvent()).toBeNull();
    expect(
      seen.some(e => e.type === 'disarmed' && e.reason === 'targetGone')
    ).toBe(true);
  });

  test('rebuilding the world clears the watch and the marker', () => {
    runWatch({ kind: EVENT_KINDS.PERIAPSIS }, orbit, 0.01, 8);
    expect(lastEvent()).not.toBeNull();
    resetPauseAtEvent();
    expect(lastEvent()).toBeNull();
    expect(armedEvent()).toBeNull();
  });

  test('a clock that goes backwards restarts the bracket rather than firing', () => {
    // Scrubbing replays states in an order the integrator never produced.
    // Reading a crossing out of two of them would invent an event.
    const primary = body(0, 0, 0, 0, { mass: 1 });
    const moving = body(1, 0, 0, 1);
    let clock = 0;
    const steps = new Set();
    const pause = jest.fn();

    armEvent(
      {
        kind: EVENT_KINDS.SEPARATION_INWARD,
        bodyId: 'b',
        primaryId: 'p',
        separation: 1,
      },
      {
        resolveBody: id => (id === 'p' ? primary : moving),
        pause,
        clockDays: () => clock,
        onStep: fn => {
          steps.add(fn);
          return () => steps.delete(fn);
        },
        G: () => 1,
      }
    );

    // Outside the radius.
    moving.pos.x = 1.5;
    clock = 1;
    for (const fn of [...steps]) fn(1, 1);
    // The timeline is scrubbed back, and the replayed state is inside it.
    moving.pos.x = 0.5;
    clock = 0.2;
    for (const fn of [...steps]) fn(1, 0.2);

    expect(pause).not.toHaveBeenCalled();
    expect(armedEvent()).not.toBeNull();
  });
});

describe('the transit watch reads the photometer', () => {
  const setup = log => {
    let clock = 0;
    const steps = new Set();
    const paused = { yes: false };
    const armed = armEvent(
      { kind: EVENT_KINDS.TRANSIT },
      {
        resolveBody: () => null,
        pause: () => {
          paused.yes = true;
        },
        clockDays: () => clock,
        onStep: fn => {
          steps.add(fn);
          return () => steps.delete(fn);
        },
        G: () => 1,
        transitLog: () => log.slice(),
      }
    );
    return {
      armed,
      paused,
      tick: t => {
        clock = t;
        for (const fn of [...steps]) fn(1, t);
      },
    };
  };

  test('only a transit logged after arming counts', () => {
    const log = [{ mid: 1, duration: 0.1, seq: 1 }];
    const run = setup(log);
    run.tick(5);
    expect(run.paused.yes).toBe(false);

    log.push({ mid: 6, duration: 0.12, seq: 2 });
    run.tick(6.1);
    expect(run.paused.yes).toBe(true);
    expect(lastEvent().timeDays).toBe(6);
    expect(lastEvent().detail.seq).toBe(2);
  });

  test('the precision quoted is the transit duration, and the pause is late', () => {
    const log = [];
    const run = setup(log);
    log.push({ mid: 10, duration: 0.2, seq: 1 });
    run.tick(10.1);
    const event = lastEvent();
    expect(event.bracketDays).toBe(0.2);
    // Because a mid-time is only known once the transit has finished.
    expect(event.overshootDays).toBeCloseTo(0.1, 9);
  });

  test('a logged transit with no mid-time is not something to stop on', () => {
    const log = [];
    const run = setup(log);
    log.push({ duration: 0.2, seq: 1 });
    run.tick(11);
    expect(run.paused.yes).toBe(false);
  });
});

describe("the student's note", () => {
  const orbit = keplerOrbit({ a: 1, e: 0.5, mu: 1 });

  test('attaches to the event that fired, and travels with it', () => {
    runWatch({ kind: EVENT_KINDS.PERIAPSIS }, orbit, 0.01, 8);
    annotateLastEvent('Closest approach - check the speed here');
    expect(lastEvent().note).toBe('Closest approach - check the speed here');
  });

  test('is bounded, so an export cannot be handed an essay', () => {
    runWatch({ kind: EVENT_KINDS.PERIAPSIS }, orbit, 0.01, 8);
    annotateLastEvent('x'.repeat(1000));
    expect(lastEvent().note).toHaveLength(280);
  });

  test('goes nowhere when no event has fired', () => {
    clearLastEvent();
    expect(() => annotateLastEvent('hello')).not.toThrow();
    expect(lastEvent()).toBeNull();
  });
});

// -----------------------------------------------------------------------------
// The radial-velocity turning points
// -----------------------------------------------------------------------------
// The one pair of kinds that is not about the separation. Where they fall
// depends on which way the observer is looking, which is exactly why a lesson
// wants to stop there: the star's motion and the sign of the reading are two
// different things and a student has to see them at the same instant.
describe('stopping at the peak and trough of an RV curve', () => {
  const state = { r: 10, rdot: 0.5, vlosDot: -2 };

  test('the trough is a rising crossing and the peak a falling one', () => {
    // The signal is d(v_los)/dt. It passes upward through zero at the most
    // negative velocity, and downward through zero at the most positive.
    expect(eventSignal(EVENT_KINDS.RV_MINIMUM, state).rising).toBe(true);
    expect(eventSignal(EVENT_KINDS.RV_MAXIMUM, state).rising).toBe(false);
    expect(eventSignal(EVENT_KINDS.RV_MINIMUM, state).value).toBe(-2);
  });

  test('they do not read the separation, so a watch needs no orbit', () => {
    // Deliberate: r and rdot are absent, and the signal is still answered.
    // A radial-velocity curve has turning points whatever the orbit is doing.
    const noOrbit = { vlosDot: 3 };
    expect(eventSignal(EVENT_KINDS.RV_MAXIMUM, noOrbit).value).toBe(3);
  });

  test('no line-of-sight rate means no signal rather than a wrong one', () => {
    // A host that cannot say which way the observer is looking must not be
    // able to arm these: firing on a signal that is not there would stop the
    // simulation at a moment with no meaning.
    expect(eventSignal(EVENT_KINDS.RV_MINIMUM, { r: 10, rdot: 0 })).toBeNull();
    expect(eventSignal(EVENT_KINDS.RV_MAXIMUM, { vlosDot: NaN })).toBeNull();
  });

  test('the separation kinds are unaffected by the new branch', () => {
    expect(eventSignal(EVENT_KINDS.PERIAPSIS, state).value).toBe(0.5);
    expect(eventSignal(EVENT_KINDS.APOAPSIS, state).rising).toBe(false);
  });
});
