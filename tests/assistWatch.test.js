import {
  startAssistWatch,
  stopAssistWatch,
  currentAssist,
  resetAssistWatch,
  PHASE,
} from '../js/assistWatch.js';

// A hand-driven encounter. The watcher takes its step source as a dependency so
// a test can be the integrator: every state below is placed exactly, which is
// what makes it possible to check the bookkeeping rather than somebody's idea
// of what a flyby looks like.
function harness({ gate = 1000, mu = 5, impactParameter = 40 } = {}) {
  const planet = {
    pos: { x: 0, y: 0 },
    vel: { x: 0.3, y: 0 },
    mass: 5,
    alive: true,
  };
  const probe = {
    pos: { x: -1200, y: 40 },
    vel: { x: 0.5, y: 0 },
    mass: 5e-6,
    alive: true,
  };
  let present = true;
  let probeSlot = probe;
  const listeners = new Set();
  const finished = [];
  const started = startAssistWatch(
    { gate, mu, impactParameter },
    {
      onStep: fn => {
        listeners.add(fn);
        return () => listeners.delete(fn);
      },
      bodies: () => (present ? { planet, probe: probeSlot } : null),
      onFinish: s => finished.push(s),
    }
  );
  return {
    planet,
    probe,
    started,
    finished,
    listeners,
    tick: (dt = 1, n = 1) => {
      for (let i = 0; i < n; i++) for (const fn of listeners) fn(dt);
    },
    remove: () => {
      present = false;
    },
    swap: () => {
      probeSlot = { ...probe, pos: { ...probe.pos }, vel: { ...probe.vel } };
    },
  };
}

/** Move the probe to a place and a velocity, then take a step. */
function place(h, x, y, vx, vy, dt = 1) {
  h.probe.pos.x = x;
  h.probe.pos.y = y;
  h.probe.vel.x = vx;
  h.probe.vel.y = vy;
  h.tick(dt);
}

afterEach(resetAssistWatch);

describe('arming', () => {
  test('the state at the gate becomes "before"', () => {
    const h = harness();
    expect(h.started.before).not.toBeNull();
    expect(h.started.before.distance).toBeCloseTo(Math.hypot(1200, 40), 9);
    expect(h.started.phase).toBe(PHASE.INBOUND);
  });

  test('the relative velocity is relative, not the probe’s own', () => {
    // 0.5 in the world frame minus the planet's 0.3.
    const h = harness();
    expect(h.started.before.rel.x).toBeCloseTo(0.2, 12);
    expect(h.started.before.inertial.x).toBeCloseTo(0.5, 12);
  });

  test('starting exactly at the gate still records a "before"', () => {
    // The world builder places the spacecraft at exactly the gate distance,
    // because that is where the reading is defined. Comparing with <= made
    // that count as "already inside", so whether a run had a before at all
    // came down to which side of 4000.0000000 the placement rounded to, and
    // half of them silently reported null instead of a speed.
    const r = Math.hypot(1200, 40);
    const h = harness({ gate: r });
    expect(h.started.startedInside).toBe(false);
    expect(h.started.before).not.toBeNull();
    expect(h.started.before.vInf).toBeGreaterThan(0);
  });

  test('starting inside the gate is refused a "before", and says so', () => {
    // Half an encounter has no before, and a speed read from partway down the
    // planet's potential well is not the speed the encounter started with.
    const h = harness({ gate: 5000 });
    expect(h.started.startedInside).toBe(true);
    expect(h.started.before).toBeNull();
  });

  test('it refuses to arm without both bodies', () => {
    expect(
      startAssistWatch(
        { gate: 100, mu: 5, impactParameter: 1 },
        { onStep: () => () => {}, bodies: () => null }
      )
    ).toBeNull();
    expect(currentAssist()).toBeNull();
  });
});

describe('the phases of an encounter', () => {
  test('it does not call the encounter over on the way in', () => {
    const h = harness({ gate: 1000 });
    place(h, -900, 40, 0.5, 0);
    place(h, -500, 40, 0.5, 0);
    expect(currentAssist().phase).toBe(PHASE.INBOUND);
    expect(h.finished).toHaveLength(0);
  });

  test('it turns outbound on the radial velocity, not on the distance', () => {
    // Near periapsis a coarse step can make the distance tick up for one step
    // while the encounter is still closing. The radial velocity does not lie.
    const h = harness();
    place(h, -200, 40, 0.5, 0);
    place(h, 0, 40, 0.5, 0); // periapsis
    expect(currentAssist().phase).toBe(PHASE.INBOUND);
    place(h, 200, 40, 0.5, 0); // now genuinely receding
    expect(currentAssist().phase).toBe(PHASE.OUTBOUND);
  });

  test('crossing the gate outbound ends it, once', () => {
    const h = harness({ gate: 1000 });
    place(h, -200, 40, 0.5, 0);
    place(h, 400, 40, 0.5, 0);
    place(h, 1400, 40, 0.42, 0.3);
    expect(h.finished).toHaveLength(1);
    expect(currentAssist().phase).toBe(PHASE.DONE);
    const steps = currentAssist().steps;
    h.tick(1, 5);
    expect(currentAssist().steps).toBe(steps);
  });
});

describe('what it measures', () => {
  test('closest approach is a minimum over steps, not the last value', () => {
    const h = harness();
    place(h, -300, 40, 0.5, 0);
    place(h, 0, 25, 0.5, 0);
    place(h, 300, 40, 0.5, 0);
    expect(currentAssist().closest).toBeCloseTo(25, 9);
  });

  test('the side is read at closest approach, against the planet’s motion', () => {
    // The planet moves +x. Closest approach behind it (-x) is the trailing
    // side; the legs on either side are nearly along its track and would give
    // an arbitrary answer, which is why only periapsis is used.
    const h = harness();
    place(h, -400, 40, 0.5, 0);
    place(h, -30, 10, 0.5, 0.2);
    place(h, 400, 60, 0.5, 0.2);
    expect(currentAssist().side).toBe('trailing');
  });

  test('the speed at infinity is corrected for the potential at the gate', () => {
    const h = harness({ gate: 1000, mu: 5 });
    const b = currentAssist().before;
    // v = 0.2 relative at r = hypot(1200,40); vInf^2 = v^2 - 2mu/r.
    const r = Math.hypot(1200, 40);
    expect(b.vInf).toBeCloseTo(Math.sqrt(0.2 * 0.2 - 10 / r), 12);
    expect(b.vInf).toBeLessThan(b.relativeSpeed);
    expect(h.started.before.distance).toBeCloseTo(r, 9);
  });

  test('before and after are read at the same distance, so the correction cancels', () => {
    const h = harness({ gate: 1000 });
    place(h, -200, 40, 0.5, 0);
    place(h, 400, 40, 0.5, 0);
    // Out at the same distance the run started, with the relative speed
    // unchanged and the direction turned: an ideal flyby.
    place(h, 1200, -40, 0.3 + 0.2 * Math.cos(1), 0.2 * Math.sin(1));
    const r = currentAssist();
    expect(r.after).not.toBeNull();
    expect(r.vInfAfter).toBeCloseTo(r.vInfBefore, 6);
    expect(Math.abs(r.deflection)).toBeCloseTo(1, 6);
  });
});

describe('the planet pays for it', () => {
  test('its velocity change is recorded against where it started', () => {
    const h = harness();
    h.planet.vel.x = 0.3 - 4e-7;
    h.planet.vel.y = -2e-7;
    place(h, -100, 40, 0.5, 0);
    const r = currentAssist();
    expect(r.planetDeltaV.x).toBeCloseTo(-4e-7, 15);
    expect(r.planetDeltaVMagnitude).toBeCloseTo(Math.hypot(4e-7, 2e-7), 15);
  });

  test('the momentum change uses the mass it had at the start', () => {
    const h = harness();
    h.planet.vel.x = 0.3 - 4e-7;
    place(h, -100, 40, 0.5, 0);
    expect(currentAssist().planetDeltaP.x).toBeCloseTo(5 * -4e-7, 15);
  });
});

describe('endings that are not results', () => {
  test('a probe that leaves the simulation stops the recording', () => {
    const h = harness();
    place(h, -100, 40, 0.5, 0);
    h.remove();
    h.tick();
    expect(currentAssist().lost).toBe(true);
    expect(currentAssist().after).toBeNull();
  });

  test('a different body in the probe’s place is not the probe', () => {
    const h = harness();
    place(h, -100, 40, 0.5, 0);
    h.swap();
    h.tick();
    expect(currentAssist().lost).toBe(true);
  });

  test('an absorbed probe is not a flyby', () => {
    const h = harness();
    place(h, -100, 40, 0.5, 0);
    h.probe.alive = false;
    h.tick();
    expect(currentAssist().lost).toBe(true);
  });

  test('stopping unsubscribes and stepping afterwards throws nothing', () => {
    const h = harness();
    stopAssistWatch();
    expect(currentAssist()).toBeNull();
    expect(h.listeners.size).toBe(0);
    expect(() => h.tick()).not.toThrow();
  });
});
