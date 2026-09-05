import {
  startBinaryWatch,
  stopBinaryWatch,
  currentRun,
  resetBinaryWatch,
} from '../js/binaryWatch.js';
import { classifyRun, OUTCOME } from '../js/binaryStability.js';

// A hand-driven physics substitute. The watcher takes its step source as a
// dependency precisely so a test can be the integrator: every scenario below
// is an exact sequence of states, so what is being tested is the bookkeeping
// and not somebody's idea of what an orbit looks like.
function harness({
  mode = 'circumstellar',
  periods = 10,
  separation = 1000,
  planetPos = { x: 50, y: 0 },
  planetVel = { x: 0, y: 3 },
} = {}) {
  const star1 = {
    mass: 1000,
    pos: { x: -100, y: 0 },
    vel: { x: 0, y: -1 },
    alive: true,
  };
  const star2 = {
    mass: 500,
    pos: { x: 900, y: 0 },
    vel: { x: 0, y: 2 },
    alive: true,
  };
  const planet = {
    mass: 0.003,
    pos: { ...planetPos },
    vel: { ...planetVel },
    alive: true,
  };
  let present = true;
  let planetSlot = planet;
  const listeners = new Set();
  const summary = startBinaryWatch(
    {
      mode,
      periods,
      binaryPeriod: 100,
      separation,
      planetA: 0.15,
      mu: 1 / 3,
      eccentricity: 0.4,
    },
    {
      onStep: fn => {
        listeners.add(fn);
        return () => listeners.delete(fn);
      },
      bodies: () => (present ? { star1, star2, planet: planetSlot } : null),
      G: 1,
      onFinish: s => {
        finished.push(s);
      },
    }
  );
  const finished = [];
  const tick = (dt = 1, n = 1) => {
    for (let i = 0; i < n; i++) for (const fn of listeners) fn(dt);
  };
  return {
    star1,
    star2,
    planet,
    tick,
    summary,
    finished,
    remove: () => {
      present = false;
    },
    swap: () => {
      planetSlot = {
        mass: 0.003,
        pos: { x: 0, y: 0 },
        vel: { x: 0, y: 0 },
        alive: true,
      };
    },
    listeners,
  };
}

afterEach(resetBinaryWatch);

describe('starting a run', () => {
  test('it reports zero progress before any step', () => {
    const h = harness();
    expect(h.summary.periodsDone).toBe(0);
    expect(h.summary.steps).toBe(0);
    expect(h.summary.finished).toBe(false);
  });

  test('it refuses to start without all three bodies', () => {
    const started = startBinaryWatch(
      {
        mode: 'circumstellar',
        periods: 5,
        binaryPeriod: 100,
        separation: 1000,
      },
      { onStep: () => () => {}, bodies: () => null, G: 1 }
    );
    expect(started).toBeNull();
    expect(currentRun()).toBeNull();
  });

  test('starting a second run replaces the first and unsubscribes it', () => {
    const first = harness();
    const before = first.listeners.size;
    harness();
    expect(before).toBe(1);
    // The first watch's unsubscribe removed it from its own listener set.
    expect(first.listeners.size).toBe(0);
  });
});

describe('progress and stopping', () => {
  test('elapsed time is counted from the steps, not from a frame clock', () => {
    const h = harness({ periods: 10 }); // binaryPeriod 100, so 1000 time units
    h.tick(0.5, 400);
    const run = currentRun();
    expect(run.elapsed).toBeCloseTo(200, 9);
    expect(run.periodsDone).toBeCloseTo(2, 9);
    expect(run.steps).toBe(400);
  });

  test('it stops at the requested number of periods and finishes once', () => {
    const h = harness({ periods: 2 }); // 200 time units
    h.tick(1, 500);
    expect(h.finished).toHaveLength(1);
    expect(h.finished[0].periodsDone).toBeGreaterThanOrEqual(2);
    // Steps after the finish are ignored rather than counted.
    expect(currentRun().steps).toBe(200);
  });

  test('the actual step size is recorded, not the requested one', () => {
    // The reason this exists: render.js sizes substeps from the frame time, so
    // a machine under load integrates coarser than the scenario asked for and
    // nothing else would ever say so.
    const h = harness({ periods: 100 });
    h.tick(1, 10);
    h.tick(4, 10);
    const run = currentRun();
    expect(run.dtMin).toBe(1);
    expect(run.dtMax).toBe(4);
    expect(run.dtMean).toBeCloseTo(2.5, 9);
  });
});

describe('what it records about the planet', () => {
  test('distance is reported in binary separations', () => {
    const h = harness({ separation: 1000 });
    h.planet.pos.x = 2500;
    h.tick();
    expect(currentRun().maxDistance).toBeCloseTo(2.5, 9);
  });

  test('max distance is a maximum, not the current value', () => {
    const h = harness();
    h.planet.pos.x = 3000;
    h.tick();
    h.planet.pos.x = 50;
    h.tick();
    expect(currentRun().maxDistance).toBeCloseTo(3, 9);
  });

  test('a circumstellar planet near its own star is not an encounter', () => {
    // It is always near its own star. Counting that would report hundreds.
    const h = harness({ mode: 'circumstellar' });
    for (let i = 0; i < 20; i++) {
      h.planet.pos.x = h.star1.pos.x + 10 * (i % 2 ? 1 : -1);
      h.tick();
    }
    expect(currentRun().encounters).toBe(0);
  });

  test('a pass near the companion is an encounter, counted once per pass', () => {
    const h = harness({ mode: 'circumstellar', separation: 1000 });
    const far = () => {
      h.planet.pos.x = 0;
      h.tick();
    };
    const close = () => {
      h.planet.pos.x = h.star2.pos.x - 50; // 0.05 separations from star 2
      h.tick(1, 5); // several steps inside one pass
    };
    far();
    close();
    far();
    close();
    far();
    const run = currentRun();
    expect(run.encounters).toBe(2);
    expect(run.closestApproach).toBeCloseTo(0.05, 6);
  });

  test('a circumbinary planet counts a close pass to either star', () => {
    const h = harness({ mode: 'circumbinary', separation: 1000 });
    h.planet.pos.x = h.star1.pos.x + 20;
    h.tick();
    h.planet.pos.x = 0;
    h.tick();
    expect(currentRun().encounters).toBe(1);
  });
});

describe('boundness', () => {
  test('a planet deep in one star well is bound even though it is far from the barycenter', () => {
    // The bug this pins: measuring energy against a point mass at the origin
    // reports a perfectly ordinary circumstellar planet as unbound, which turns
    // every survivor into an ejection.
    const h = harness();
    h.planet.pos.x = h.star1.pos.x + 150;
    h.planet.pos.y = 0;
    // Circular about star 1 alone: sqrt(G m1 / r) = sqrt(1000/150) = 2.58
    h.planet.vel.x = 0;
    h.planet.vel.y = 2.58;
    h.tick();
    expect(currentRun().unbound).toBe(false);
  });

  test('a genuinely fast planet is unbound', () => {
    const h = harness();
    h.planet.pos.x = 5000;
    h.planet.vel.y = 50;
    h.tick();
    expect(currentRun().unbound).toBe(true);
  });
});

describe('endings', () => {
  test('an absorbed planet is a collision', () => {
    const h = harness({ periods: 100 });
    h.tick(1, 5);
    h.planet.alive = false;
    h.tick();
    const run = currentRun();
    expect(run.merged).toBe(true);
    expect(run.alive).toBe(true);
    expect(classifyRun(run).outcome).toBe(OUTCOME.COLLIDED);
  });

  test('a collision is still a collision when the engine also drops the body', () => {
    // What actually happens: js/physics.js sets alive = false and prunes the
    // dead body from `planets`, both inside one integration step. Checking the
    // array before the flag reported every collision in the real application
    // as an unexplained disappearance, while this suite passed - because the
    // test above sets the flag without removing the body, which the engine
    // never does.
    const h = harness({ periods: 100 });
    h.tick(1, 5);
    h.planet.alive = false;
    h.remove();
    h.tick();
    const run = currentRun();
    expect(run.merged).toBe(true);
    expect(classifyRun(run).outcome).toBe(OUTCOME.COLLIDED);
  });

  test('a different planet under the same index is not the one being watched', () => {
    // A scenario change mid-run leaves `planets[0]` populated by something
    // else entirely, and the watcher would happily go on recording it.
    const h = harness({ periods: 100 });
    h.tick(1, 5);
    h.swap();
    h.tick();
    expect(classifyRun(currentRun()).reason).toBe('vanished');
  });

  test('a planet that leaves the array is not a physical result', () => {
    const h = harness({ periods: 100 });
    h.tick(1, 5);
    h.remove();
    h.tick();
    const run = currentRun();
    expect(run.alive).toBe(false);
    expect(classifyRun(run).outcome).toBe(OUTCOME.UNRELIABLE);
    expect(classifyRun(run).reason).toBe('vanished');
  });

  test('an unambiguous escape ends the run early', () => {
    // Started already outbound rather than teleported there. A teleport is an
    // energy violation, and the classifier is right to refuse to call one an
    // ejection - which is the first thing this test taught, by failing.
    const h = harness({
      periods: 1000,
      separation: 1000,
      planetPos: { x: 20000, y: 0 },
      planetVel: { x: 1, y: 0 },
    });
    h.planet.pos.x = 40000; // 40 separations, and 1e-7 of the system's energy
    h.tick();
    expect(h.finished).toHaveLength(1);
    const run = currentRun();
    expect(run.unbound).toBe(true);
    expect(run.maxDistance).toBeCloseTo(40, 6);
    expect(run.energyDrift).toBeLessThan(1e-5);
    expect(classifyRun(run).outcome).toBe(OUTCOME.EJECTED);
  });

  test('a run still short of its target is running, not surviving', () => {
    const h = harness({ periods: 10 });
    h.tick(1, 100); // one period of ten
    expect(classifyRun(currentRun()).outcome).toBe(OUTCOME.RUNNING);
  });
});

describe('energy drift', () => {
  test('drift is the worst seen, not the last seen', () => {
    const h = harness({ periods: 1000 });
    const v0 = h.planet.vel.y;
    h.planet.vel.y = 40; // a large excursion
    h.tick();
    const worst = currentRun().energyDrift;
    h.planet.vel.y = v0;
    h.tick();
    expect(currentRun().energyDrift).toBeCloseTo(worst, 12);
    expect(worst).toBeGreaterThan(0);
  });

  test('a quiet run drifts by nothing', () => {
    const h = harness({ periods: 1000 });
    h.tick(1, 50);
    expect(currentRun().energyDrift).toBe(0);
  });
});

describe('stopping', () => {
  test('stopBinaryWatch unsubscribes and clears', () => {
    const h = harness();
    stopBinaryWatch();
    expect(currentRun()).toBeNull();
    expect(h.listeners.size).toBe(0);
    // And stepping afterwards throws nothing.
    expect(() => h.tick()).not.toThrow();
  });
});
