import {
  WORLD,
  BARYCENTER,
  OBJECT,
  setFrame,
  resetFrame,
  frameState,
  frameMode,
  frameObjectId,
  isWorldFrame,
  onFrameChange,
  systemBarycenter,
  recordBarycenter,
  clearFrameHistory,
  barycenterSamples,
  sampleAtTick,
  resolveFrameOrigin,
  frameShifts,
  frameOriginVelocity,
  resetFrameModule,
} from '../js/referenceFrame.js';

const body = (id, x, y, mass = 1, extra = {}) => ({
  id,
  name: `Body ${id}`,
  mass,
  alive: true,
  pos: { x, y },
  trail: [],
  ...extra,
});

/** A trail whose points were recorded on consecutive ticks. */
const trail = (points, firstTick = 0) =>
  points.map((p, i) => ({
    x: p[0],
    y: p[1],
    tick: firstTick + i,
    age: points.length - 1 - i,
    velocity: 1,
  }));

beforeEach(() => {
  resetFrameModule();
});

describe('choosing a frame', () => {
  test('starts in the world frame', () => {
    expect(isWorldFrame()).toBe(true);
    expect(frameState()).toEqual({ mode: WORLD, objectId: null });
  });

  test('an object frame remembers which body', () => {
    setFrame(OBJECT, 7);
    expect(frameMode()).toBe(OBJECT);
    expect(frameObjectId()).toBe(7);
    expect(isWorldFrame()).toBe(false);
  });

  test('asking for an object frame without a body falls back to world', () => {
    // A frame with no origin is not a frame. Better to say so than to leave
    // the view transformed by an undefined position.
    setFrame(OBJECT);
    expect(frameState()).toEqual({ mode: WORLD, objectId: null });
  });

  test('the barycenter frame carries no object id', () => {
    setFrame(OBJECT, 3);
    setFrame(BARYCENTER);
    expect(frameState()).toEqual({ mode: BARYCENTER, objectId: null });
  });

  test('an unrecognised mode is the world frame, not an error', () => {
    setFrame('sideways');
    expect(isWorldFrame()).toBe(true);
  });

  test('reset returns to the world frame', () => {
    setFrame(BARYCENTER);
    resetFrame();
    expect(isWorldFrame()).toBe(true);
  });

  test('listeners hear about changes and can unsubscribe', () => {
    const seen = [];
    const off = onFrameChange(f => seen.push(f.mode));
    setFrame(BARYCENTER);
    setFrame(OBJECT, 2);
    off();
    setFrame(WORLD);
    expect(seen).toEqual([BARYCENTER, OBJECT]);
  });

  test('setting the same frame again notifies nobody', () => {
    let calls = 0;
    onFrameChange(() => calls++);
    setFrame(OBJECT, 5);
    setFrame(OBJECT, 5);
    expect(calls).toBe(1);
  });

  test('a listener that throws does not stop the others', () => {
    const seen = [];
    onFrameChange(() => {
      throw new Error('panel exploded');
    });
    onFrameChange(f => seen.push(f.mode));
    const realWarn = console.warn;
    console.warn = () => {};
    setFrame(BARYCENTER);
    console.warn = realWarn;
    expect(seen).toEqual([BARYCENTER]);
  });
});

describe('systemBarycenter', () => {
  test('sits between two bodies, closer to the heavier one', () => {
    // The Sun-Jupiter case in miniature: mass ratio 10 puts the center a
    // tenth of the way along.
    const center = systemBarycenter([body(1, 0, 0, 10), body(2, 11, 0, 1)]);
    expect(center.x).toBeCloseTo(1, 12);
    expect(center.y).toBeCloseTo(0, 12);
  });

  test('ignores dead bodies and massless ones', () => {
    const center = systemBarycenter([
      body(1, 0, 0, 4),
      body(2, 100, 0, 4, { alive: false }),
      body(3, -100, 0, 0),
      body(4, 8, 0, 4),
    ]);
    expect(center.x).toBeCloseTo(4, 12);
  });

  test('no mass means no center, rather than a divide by zero', () => {
    expect(systemBarycenter([])).toBeNull();
    expect(systemBarycenter([body(1, 5, 5, 0)])).toBeNull();
  });
});

describe('the recorded barycenter history', () => {
  test('keeps one sample per tick, oldest first', () => {
    recordBarycenter(1, [body(1, 0, 0, 1), body(2, 2, 0, 1)], 10);
    recordBarycenter(2, [body(1, 0, 0, 1), body(2, 4, 0, 1)], 10);
    expect(barycenterSamples()).toEqual([
      { tick: 1, x: 1, y: 0 },
      { tick: 2, x: 2, y: 0 },
    ]);
  });

  test('is capped at the budget, dropping the oldest', () => {
    for (let t = 0; t < 20; t++) {
      recordBarycenter(t, [body(1, t, 0, 1)], 5);
    }
    const samples = barycenterSamples();
    expect(samples).toHaveLength(5);
    expect(samples[0].tick).toBe(15);
    expect(samples[4].tick).toBe(19);
  });

  test('records nothing when there is no mass to average', () => {
    recordBarycenter(1, [], 10);
    expect(barycenterSamples()).toHaveLength(0);
  });

  test('clearing drops it', () => {
    recordBarycenter(1, [body(1, 0, 0, 1)], 10);
    clearFrameHistory();
    expect(barycenterSamples()).toHaveLength(0);
  });
});

describe('sampleAtTick', () => {
  const samples = trail([
    [0, 0],
    [1, 0],
    [2, 0],
  ]).map(p => ({ tick: p.tick, x: p.x, y: p.y }));

  test('finds a sample by its tick', () => {
    expect(sampleAtTick(samples, 1)).toEqual({ tick: 1, x: 1, y: 0 });
  });

  test('returns null for a tick that was never recorded', () => {
    // Not the nearest sample. A trail point drawn against the wrong origin is
    // a picture of a frame that never existed.
    expect(sampleAtTick(samples, 9)).toBeNull();
    expect(sampleAtTick(samples, -3)).toBeNull();
  });

  test('still finds a sample when the ticks are not a clean offset', () => {
    // A body that was not alive for part of the window leaves a gap, so the
    // index shortcut misses and the search has to take over.
    const gapped = [{ tick: 0 }, { tick: 5 }, { tick: 6 }];
    expect(sampleAtTick(gapped, 5)).toEqual({ tick: 5 });
    expect(sampleAtTick(gapped, 3)).toBeNull();
  });

  test('an empty history finds nothing', () => {
    expect(sampleAtTick([], 0)).toBeNull();
    expect(sampleAtTick(null, 0)).toBeNull();
  });
});

describe('resolveFrameOrigin', () => {
  test('the world frame resolves to nothing at all', () => {
    // null is the signal for "draw exactly as before", so the world frame
    // costs nothing: no transform, no per-point work.
    expect(resolveFrameOrigin([body(1, 0, 0)])).toBeNull();
  });

  test('an object frame is that body, now and in the past', () => {
    const earth = body(3, 10, 0, 1, {
      trail: trail([
        [7, 0],
        [8, 0],
        [9, 0],
      ]),
    });
    setFrame(OBJECT, 3);
    const origin = resolveFrameOrigin([earth, body(4, 50, 0)]);
    expect(origin.now).toEqual({ x: 10, y: 0 });
    expect(origin.at(1).x).toBe(8);
    expect(origin.label).toBe('Body 3');
  });

  test('a frame whose body is gone resolves to nothing', () => {
    // The renderer takes this as its cue to fall back to the world frame,
    // rather than transforming by a stale position.
    setFrame(OBJECT, 3);
    expect(resolveFrameOrigin([body(4, 1, 1)])).toBeNull();
    expect(resolveFrameOrigin([body(3, 1, 1, 1, { alive: false })])).toBeNull();
  });

  test('the barycenter frame reads the recorded history, not the bodies', () => {
    // Masses change when things merge, so a past barycenter recomputed from
    // today's masses is a barycenter of nothing. It has to be the recording.
    recordBarycenter(0, [body(1, 0, 0, 1), body(2, 2, 0, 1)], 10);
    recordBarycenter(1, [body(1, 0, 0, 1), body(2, 6, 0, 1)], 10);
    setFrame(BARYCENTER);
    const origin = resolveFrameOrigin([body(1, 0, 0, 1), body(2, 8, 0, 1)]);
    expect(origin.now.x).toBe(4);
    expect(origin.at(0).x).toBe(1);
    expect(origin.at(1).x).toBe(3);
  });
});

describe('frameShifts', () => {
  test('the newest sample needs no correction', () => {
    const origin = {
      now: { x: 10, y: 4 },
      at: tick => ({ x: 10 - tick * 0, y: 4 }),
    };
    const { dx, dy, known } = frameShifts(origin, 5, 3);
    expect(known[0]).toBe(1);
    expect(dx[0]).toBe(0);
    expect(dy[0]).toBe(0);
  });

  test('older samples are corrected by how far the origin has moved since', () => {
    // The canvas has already been translated by where the origin is now, so
    // each point needs adding back the distance the origin covered after it.
    const positions = {
      5: { x: 10, y: 0 },
      4: { x: 8, y: 0 },
      3: { x: 6, y: 0 },
    };
    const origin = { now: { x: 10, y: 0 }, at: t => positions[t] || null };
    const { dx, known } = frameShifts(origin, 5, 3);
    expect([...known]).toEqual([1, 1, 1]);
    expect([...dx]).toEqual([0, 2, 4]);
  });

  test('ticks the origin has no sample for are marked unknown', () => {
    const origin = {
      now: { x: 0, y: 0 },
      at: t => (t >= 4 ? { x: 0, y: 0 } : null),
    };
    const { known } = frameShifts(origin, 5, 4);
    expect([...known]).toEqual([1, 1, 0, 0]);
  });
});

describe('the shifts actually re-express a path', () => {
  test('a body co-moving with the origin collapses to a point', () => {
    // Two bodies moving together have no relative motion, so in either one's
    // frame the other does not move at all. This is the whole premise: the
    // drawing changes, the physics does not.
    const originTrail = trail([
      [0, 0],
      [1, 0],
      [2, 0],
      [3, 0],
    ]);
    const other = trail([
      [0, 5],
      [1, 5],
      [2, 5],
      [3, 5],
    ]);
    const origin = {
      now: { x: 3, y: 0 },
      at: t => originTrail.find(p => p.tick === t) || null,
    };
    const { dx, dy } = frameShifts(origin, 3, 4);

    const framed = other.map(p => {
      const k = 3 - p.tick;
      return { x: p.x + dx[k], y: p.y + dy[k] };
    });
    // Every point lands on the same place: 3 units ahead in x, 5 across.
    for (const p of framed) {
      expect(p.x).toBeCloseTo(3, 12);
      expect(p.y).toBeCloseTo(5, 12);
    }
  });

  test('a straight world path becomes a loop that doubles back', () => {
    // Retrograde motion, reduced to its arithmetic. The origin overtakes the
    // other body partway along, and the re-expressed path reverses direction
    // at exactly that point without anything in the physics changing.
    const originTrail = trail([
      [0, 0],
      [3, 0],
      [6, 0],
      [9, 0],
      [12, 0],
    ]);
    const other = trail([
      [0, 4],
      [1, 4],
      [2, 4],
      [3, 4],
      [4, 4],
    ]);
    const origin = {
      now: { x: 12, y: 0 },
      at: t => originTrail.find(p => p.tick === t) || null,
    };
    const { dx } = frameShifts(origin, 4, 5);
    const xs = other.map(p => p.x + dx[4 - p.tick]);

    // In the world frame the body only ever moves forwards.
    expect(other.map(p => p.x)).toEqual([0, 1, 2, 3, 4]);
    // Re-expressed, it moves backwards throughout: the origin is faster.
    expect(xs).toEqual([12, 10, 8, 6, 4]);
    for (let i = 1; i < xs.length; i++) {
      expect(xs[i]).toBeLessThan(xs[i - 1]);
    }
  });
});

describe('frameOriginVelocity', () => {
  const moving = (id, vx, vy, mass = 1) => ({
    id,
    name: `Body ${id}`,
    mass,
    alive: true,
    pos: { x: 0, y: 0 },
    vel: { x: vx, y: vy },
    trail: [],
  });

  test('the world frame has no origin velocity', () => {
    expect(frameOriginVelocity([moving(1, 5, 0)])).toBeNull();
  });

  test('an object frame reports that body’s velocity', () => {
    setFrame(OBJECT, 2);
    expect(frameOriginVelocity([moving(1, 5, 0), moving(2, -3, 4)])).toEqual({
      x: -3,
      y: 4,
    });
  });

  test('the barycenter frame reports the mass-weighted mean', () => {
    // A closed system's barycenter velocity is what momentum conservation
    // says it is, so this is the number that makes an object frame and the
    // barycenter frame agree about who is moving.
    setFrame(BARYCENTER);
    const v = frameOriginVelocity([moving(1, 10, 0, 3), moving(2, -10, 0, 1)]);
    expect(v.x).toBeCloseTo(5, 12);
    expect(v.y).toBeCloseTo(0, 12);
  });

  test('a body with no velocity of its own is skipped, not counted as zero', () => {
    setFrame(BARYCENTER);
    const v = frameOriginVelocity([
      moving(1, 8, 0, 1),
      { id: 2, mass: 1, alive: true, pos: { x: 0, y: 0 }, trail: [] },
    ]);
    expect(v.x).toBeCloseTo(8, 12);
  });

  test('a frame whose body is gone reports nothing', () => {
    setFrame(OBJECT, 9);
    expect(frameOriginVelocity([moving(1, 1, 1)])).toBeNull();
  });
});
