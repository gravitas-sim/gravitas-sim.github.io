// =============================================================================
// The 3-D lab: the snapshot boundary, live runs, the camera and instruments
// -----------------------------------------------------------------------------
// Everything the lab (/3d/) computes, checked without a renderer:
//
//   - snapshots: Hermite interpolation is exact for cubic motion, clamps
//     outside its gap and jumps at a merger; a snapshot the page cannot read
//     is refused by name;
//   - live runs: k intervals are k intervals, playing faster changes no
//     number, an event is reported once, the session stops at its limit and
//     continues from its own numbers; the Worker and the client speak it;
//   - the camera: projection agrees with three.js's, the presets look where
//     they say, a framed sphere fits, the scale bar is a round length;
//   - instruments: distances, angles, the hierarchy and orbital elements on
//     cases worked by hand;
//   - frames: the barycentric frame has no net momentum, a pair stays on the
//     rotating frame's x axis, and a trail point is where the body is.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import * as THREE from '../vendor/three/lab3d.module.js';
import {
  SNAPSHOT_FORMAT,
  SNAPSHOT_VERSION,
  frameAt,
  interpolate,
  positionsAt,
  drawnAt,
  exactFrame,
  interpolateVelocity,
  snapshotProblem,
} from '../js/lab3d/snapshot.js';
import {
  MAX_INTERVALS_PER_ADVANCE,
  createLive,
  restartFrom,
} from '../js/lab3d/live.js';
import { handle } from '../js/lab3d/workerCore.js';
import { LAB3D_API } from '../js/lab3d/api.js';
import { createLiveSession } from '../js/lab3d/liveClient.js';
import { FORMAT, placeByElements } from '../js/lab3d/state.js';
import { fromElements } from '../js/lab3d/elements.js';
import { REFERENCES } from '../js/lab3d/references.js';
import {
  bounds,
  basis,
  lineOfNodes,
  niceLength,
  preset,
  project,
  scaleBar,
  vec,
  worldPerPixel,
} from '../js/lab3d/view/projection.js';
import {
  KM_S_PER_AU_DAY,
  angleAt,
  elementsAbout,
  hierarchy,
  mutualInclination,
  relative,
} from '../js/lab3d/view/instruments.js';
import { toFrame, trailToFrame } from '../js/lab3d/view/frames.js';
import { arcPoints } from '../js/lab3d/view/scene.js';

const TAU = 2 * Math.PI;

/** A star and an orbiting planet, in code units, placed by elements. */
function kepler(el, extra = []) {
  const system = {
    format: FORMAT,
    formatVersion: 1,
    units: 'code',
    integrator: { scheme: 'yoshida4c', h: TAU / 500 },
    t: 0,
    bodies: [{ id: 'star', m: 1, radius: 0, x: [0, 0, 0], v: [0, 0, 0] }],
  };
  system.bodies.push(
    placeByElements(system, {
      id: 'planet',
      m: 1e-3,
      about: 'star',
      elements: el,
    })
  );
  for (const b of extra) system.bodies.push(placeByElements(system, b));
  return system;
}

/** A frame {m, x, v, alive} from plain bodies. */
const frameOf = bodies => ({
  t: 0,
  m: Float64Array.from(bodies.map(b => b.m)),
  x: Float64Array.from(bodies.flatMap(b => b.x)),
  v: Float64Array.from(bodies.flatMap(b => b.v)),
  alive: new Uint8Array(bodies.length).fill(1),
});

/** A snapshot at time t of one body on the cubic x(t) = c0 + c1 t + c2 t^2 + c3 t^3. */
const cubicSnap = (c, t, extra = {}) => {
  const x = new Float64Array(3);
  const v = new Float64Array(3);
  for (let k = 0; k < 3; k++) {
    const [c0, c1, c2, c3] = c[k];
    x[k] = c0 + c1 * t + c2 * t * t + c3 * t * t * t;
    v[k] = c1 + 2 * c2 * t + 3 * c3 * t * t;
  }
  return {
    format: SNAPSHOT_FORMAT,
    formatVersion: SNAPSHOT_VERSION,
    seq: 0,
    t,
    ids: ['a'],
    m: Float64Array.of(1),
    radius: Float64Array.of(0),
    x,
    v,
    alive: Uint8Array.of(1),
    trail: new Float64Array(0),
    trailT: new Float64Array(0),
    ...extra,
  };
};

describe('snapshots', () => {
  const c = [
    [1, 0.5, -0.25, 0.125],
    [-2, 1, 0.3, -0.05],
    [0.5, -0.7, 0, 0.2],
  ];

  test('Hermite interpolation is exact for a cubic path, position and velocity', () => {
    const a = cubicSnap(c, 0.4);
    const b = cubicSnap(c, 1.9);
    for (const t of [0.4, 0.7, 1.15, 1.6, 1.9]) {
      const want = cubicSnap(c, t);
      const x = interpolate(a, b, t);
      const v = interpolateVelocity(a, b, t);
      for (let k = 0; k < 3; k++) {
        expect(x[k]).toBeCloseTo(want.x[k], 12);
        expect(v[k]).toBeCloseTo(want.v[k], 12);
      }
    }
  });

  test('outside its gap it clamps, and a merger in the gap jumps to the newer', () => {
    const a = cubicSnap(c, 0);
    const b = cubicSnap(c, 1);
    expect([...interpolate(a, b, -5)]).toEqual([...a.x]);
    expect([...interpolate(a, b, 9)]).toEqual([...b.x]);
    const merged = cubicSnap(c, 1, { m: Float64Array.of(2) });
    expect([...interpolate(a, merged, 0.5)]).toEqual([...merged.x]);
    const gone = cubicSnap(c, 1, { alive: Uint8Array.of(0) });
    expect([...interpolate(a, gone, 0.5)]).toEqual([...gone.x]);
    // No earlier snapshot: the frame is the snapshot.
    const f = frameAt(null, b, 0.2);
    expect(f.t).toBe(1);
    expect([...f.x]).toEqual([...b.x]);
  });

  test('a snapshot the page cannot read is refused by what is wrong', () => {
    const ok = cubicSnap(c, 0);
    expect(snapshotProblem(ok)).toBeNull();
    expect(snapshotProblem(null)).toBe('notObject');
    expect(snapshotProblem({ ...ok, format: 'x' })).toBe('format');
    expect(snapshotProblem({ ...ok, formatVersion: 2 })).toBe('version');
    expect(snapshotProblem({ ...ok, t: NaN })).toBe('time');
    expect(snapshotProblem({ ...ok, x: new Float64Array(2) })).toBe('arrays');
    expect(snapshotProblem({ ...ok, x: [0, 0, 0] })).toBe('arrays');
    expect(snapshotProblem({ ...ok, ids: [] })).toBe('ids');
    expect(
      snapshotProblem({
        ...ok,
        trail: new Float64Array(2),
        trailT: Float64Array.of(0),
      })
    ).toBe('trail');
  });
});

describe('drawing between snapshots', () => {
  test('a wide snapshot is drawn from its rows, to a tick, where Hermite across it is not', () => {
    // An eccentric orbit, and a snapshot that covers 256 ticks: most of it.
    const system = kepler({ a: 1, e: 0.6, i: 0.4, Omega: 0, omega: 0, M: 0 });
    const dt = TAU / 400;
    const coarse = createLive(system, { interval: dt }).session;
    const a = coarse.advance(10);
    const b = coarse.advance(256);
    // The rows are exact at their own times.
    const at = positionsAt(a, b, b.trailT[99]);
    expect([...at]).toEqual([...b.trail.subarray(99 * 6, 100 * 6)]);
    // Half-way through tick 100, against a run with half the tick.
    const fine = createLive(system, { interval: dt / 2 }).session;
    const truth = fine.advance(2 * (10 + 100) + 1);
    const t = truth.t;
    expect(t).toBeCloseTo((b.trailT[99] + b.trailT[100]) / 2, 12);
    const rows = positionsAt(a, b, t);
    const whole = interpolate(a, b, t);
    const err = x =>
      Math.hypot(x[3] - truth.x[3], x[4] - truth.x[4], x[5] - truth.x[5]);
    expect(err(rows)).toBeLessThan(1e-6);
    // What the first version drew: off the orbit by a visible amount.
    expect(err(whole)).toBeGreaterThan(1e-2);
    // A drawn frame has the newer snapshot's masses; an exact one is the snapshot.
    expect(drawnAt(a, b, t).m).toBe(b.m);
    expect(exactFrame(b).x).toBe(b.x);
  });
});

describe('live runs', () => {
  const system = kepler({ a: 1, e: 0.3, i: 0.6, Omega: 0.4, omega: 1, M: 0 });

  test('k intervals are k intervals, with a trail row for each', () => {
    const { session } = createLive(system, { interval: 0.01 });
    const s0 = session.now();
    expect(snapshotProblem(s0)).toBeNull();
    expect(s0.trailT).toHaveLength(0);
    const s1 = session.advance(7);
    expect(snapshotProblem(s1)).toBeNull();
    expect(s1.seq).toBe(s0.seq + 1);
    expect(s1.trailT).toHaveLength(7);
    for (let j = 0; j < 7; j++)
      expect(s1.trailT[j]).toBeCloseTo(0.01 * (j + 1), 12);
    expect(s1.t).toBe(s1.trailT[6]);
    // The last trail row is where the bodies are.
    expect([...s1.trail.subarray(6 * 6)]).toEqual([...s1.x]);
    expect(s1.ids).toEqual(['star', 'planet']);
    expect(s1.errors.energy).toBeLessThan(1e-9);
  });

  test('playing faster changes no number', () => {
    const one = createLive(system, { interval: 0.02 }).session;
    const many = createLive(system, { interval: 0.02 }).session;
    let a;
    for (let i = 0; i < 60; i++) a = one.advance(1);
    const b = many.advance(60);
    expect(b.t).toBe(a.t);
    expect([...b.x]).toEqual([...a.x]);
    expect([...b.v]).toEqual([...a.v]);
  });

  test('an advance is at least 1 and at most the cap', () => {
    const { session } = createLive(system, { interval: 0.01 });
    expect(session.advance(0).trailT).toHaveLength(1);
    expect(session.advance(-3).trailT).toHaveLength(1);
    expect(session.advance(1e6).trailT).toHaveLength(MAX_INTERVALS_PER_ADVANCE);
  });

  test('a bad interval or system is refused, with problems', () => {
    expect(createLive(system, { interval: 0 }).problems[0].code).toBe(
      'interval'
    );
    expect(createLive(system, { interval: Infinity }).problems).toBeTruthy();
    expect(
      createLive({ ...system, units: 'x' }, { interval: 1 }).problems.length
    ).toBeGreaterThan(0);
  });

  test('an event is reported once, in the snapshot after it happened', () => {
    const ref = REFERENCES.find(r => r.id === 'R8').make();
    const { session } = createLive(ref.system, { interval: 0.01 });
    const events = [];
    let last;
    for (let i = 0; i < 400; i++) {
      last = session.advance(8);
      events.push(...last.events);
    }
    const mergers = events.filter(e => e.kind === 'merger');
    expect(mergers).toHaveLength(1);
    expect(last.alive.filter(a => a === 0)).toHaveLength(1);
    // What merged is gone from a continued system, and the survivor keeps
    // the merged radius and mass.
    const next = restartFrom(ref.system, last);
    expect(next.bodies).toHaveLength(ref.system.bodies.length - 1);
    expect(next.t).toBe(last.t);
    const survivor = last.alive.findIndex((a, i) => a && last.m[i] > 0);
    const kept = next.bodies.find(b => b.id === ref.system.bodies[survivor].id);
    expect(kept.m).toBe(last.m[survivor]);
    expect(kept.radius).toBe(last.radius[survivor]);
  });
});

describe('the live protocol', () => {
  test('the Worker opens a session, advances it and forgets it', async () => {
    const system = kepler({ a: 1, e: 0.1, i: 0.2, Omega: 0, omega: 0, M: 0 });
    const posts = [];
    const post = (m, transfer) => posts.push({ m, transfer });
    await handle(
      { type: 'live', id: 'x', system, options: { interval: 0.01 } },
      post
    );
    expect(posts[0].m.type).toBe('snapshot');
    expect(snapshotProblem(posts[0].m.snapshot)).toBeNull();
    // Its arrays are handed over, not copied.
    expect(posts[0].transfer).toContain(posts[0].m.snapshot.x.buffer);
    await handle({ type: 'live-advance', id: 'x', intervals: 5 }, post);
    expect(posts[1].m.snapshot.trailT).toHaveLength(5);
    await handle({ type: 'live-stop', id: 'x' }, post);
    await handle({ type: 'live-advance', id: 'x', intervals: 5 }, post);
    expect(posts[2].m).toMatchObject({ type: 'error', id: 'x' });
    await handle(
      {
        type: 'live',
        id: 'y',
        system: { ...system, units: 'x' },
        options: { interval: 0.01 },
      },
      post
    );
    expect(posts[3].m.type).toBe('refused');
  });

  function fakeWorker() {
    const host = { onmessage: null, onerror: null, terminated: false };
    const post = data =>
      globalThis.setTimeout(
        () => !host.terminated && host.onmessage?.({ data }),
        0
      );
    host.postMessage = data =>
      globalThis.setTimeout(() => handle(data, post), 0);
    host.terminate = () => (host.terminated = true);
    return host;
  }

  test('the client plays a session, one advance at a time, and stops it', async () => {
    expect(LAB3D_API).toBe('1.1.0');
    const spawn = () => fakeWorker();
    const system = kepler({ a: 1, e: 0.1, i: 0.2, Omega: 0, omega: 0, M: 0 });
    const live = createLiveSession({ spawn }, system, { interval: 0.01 });
    const { snapshot } = await live.ready;
    expect(snapshot.t).toBe(0);
    const p1 = live.advance(3);
    // Asking again before it answers is the same request.
    expect(live.advance(9)).toBe(p1);
    expect((await p1).trailT).toHaveLength(3);
    live.stop();
    await expect(live.advance(1)).rejects.toMatchObject({ code: 'stopped' });
    const refused = createLiveSession(
      { spawn },
      { ...system, units: 'x' },
      { interval: 0.01 }
    );
    await expect(refused.ready).rejects.toMatchObject({ code: 'refused' });
  });
});

describe('the camera', () => {
  const rand = (() => {
    let s = 7;
    return () => ((s = (s * 16807) % 2147483647) / 2147483647) * 2 - 1;
  })();

  test.each(['perspective', 'orthographic'])(
    'a %s projection agrees with three.js',
    mode => {
      const cam = {
        mode,
        eye: [3, -4, 2.5],
        target: [0.2, 0.1, -0.3],
        up: [0, 0, 1],
        fov: 50,
        height: 6,
      };
      const w = 640;
      const h = 480;
      const three =
        mode === 'perspective'
          ? new THREE.PerspectiveCamera(cam.fov, w / h, 0.01, 1000)
          : new THREE.OrthographicCamera(
              (-cam.height / 2) * (w / h),
              (cam.height / 2) * (w / h),
              cam.height / 2,
              -cam.height / 2,
              -1000,
              1000
            );
      three.up.set(...cam.up);
      three.position.set(...cam.eye);
      three.lookAt(...cam.target);
      three.updateMatrixWorld();
      three.updateProjectionMatrix();
      for (let n = 0; n < 50; n++) {
        const p = [rand() * 2, rand() * 2, rand() * 2];
        const ours = project(p, cam, w, h);
        const v = new THREE.Vector3(...p).project(three);
        expect(ours.x).toBeCloseTo(((v.x + 1) / 2) * w, 6);
        expect(ours.y).toBeCloseTo(((1 - v.y) / 2) * h, 6);
      }
    }
  );

  test('each preset looks from where it says', () => {
    const target = [1, 2, 3];
    const n = vec.unit([0.3, -0.5, 0.8]);
    const top = preset('top', { target, radius: 2 });
    expect(vec.unit(vec.sub(top.eye, target))).toEqual([0, 0, 1]);
    const side = preset('side', { target, radius: 2 });
    expect(vec.unit(vec.sub(side.eye, target))).toEqual([0, -1, 0]);
    const face = preset('faceOn', { target, radius: 2, normal: n });
    const f = vec.unit(vec.sub(face.eye, target));
    for (let k = 0; k < 3; k++) expect(f[k]).toBeCloseTo(n[k], 12);
    const edge = preset('edgeOn', { target, radius: 2, normal: n });
    // Edge-on: the line of sight lies in the orbit's plane, and up is its normal.
    expect(vec.dot(vec.unit(vec.sub(edge.eye, target)), n)).toBeCloseTo(0, 12);
    expect(basis(edge).up.map(x => +x.toFixed(9))).toEqual(
      n.map(x => +x.toFixed(9))
    );
    // The node line of the reference plane itself is +x.
    expect(lineOfNodes([0, 0, 1])).toEqual([1, 0, 0]);
  });

  test('a framed sphere fits the view, in both projections', () => {
    const target = [0, 0, 0];
    for (const mode of ['perspective', 'orthographic']) {
      const cam = preset('oblique', { target, radius: 5, base: { mode } });
      for (let n = 0; n < 200; n++) {
        const p = vec.scale(vec.unit([rand(), rand(), rand()]), 5);
        expect(project(p, cam, 400, 400).visible).toBe(true);
      }
    }
  });

  test('the scale bar is a round length that fits', () => {
    expect([
      niceLength(9.99),
      niceLength(20),
      niceLength(0.031),
      niceLength(0),
    ]).toEqual([5, 20, 0.02, 0]);
    const cam = preset('top', { target: [0, 0, 0], radius: 3 });
    const bar = scaleBar(cam, 500, 160);
    expect(bar.px).toBeLessThanOrEqual(160);
    expect(bar.px).toBeGreaterThan(160 / 2.5 - 1e-9);
    expect(bar.exact).toBe(false);
    const ortho = scaleBar({ ...cam, mode: 'orthographic' }, 500, 160);
    expect(ortho.exact).toBe(true);
    expect(worldPerPixel({ ...cam, mode: 'orthographic' }, 500)).toBeCloseTo(
      cam.height / 500,
      12
    );
    expect(
      bounds(Float64Array.of(1, 0, 0, -1, 0, 0), Uint8Array.of(1, 1))
    ).toEqual({ center: [0, 0, 0], radius: 1 });
  });

  test('an angle arc runs from one side to the other at the vertex', () => {
    const pts = arcPoints([2, 0, 0], [0, 0, 0], [0, 3, 0], 8);
    expect(pts[1]).toBeCloseTo(0, 6);
    expect(pts[3 * 8]).toBeCloseTo(0, 6);
    expect(pts[3 * 8 + 1]).toBeCloseTo(0.6, 6);
  });
});

describe('instruments', () => {
  const f = frameOf([
    { m: 1, x: [0, 0, 0], v: [0, 0, 0] },
    { m: 0.001, x: [3, 4, 0], v: [0, 0, 1] },
    { m: 0, x: [0, 0, 2], v: [1, 0, 0] },
  ]);

  test('distance, relative speed and radial rate', () => {
    const r = relative(f, 0, 1);
    expect(r.distance).toBe(5);
    expect(r.speed).toBe(1);
    expect(r.radialRate).toBe(0);
    const q = relative(f, 2, 1);
    expect(q.distance).toBeCloseTo(Math.sqrt(9 + 16 + 4), 12);
  });

  test('angles, including the straight and the undefined', () => {
    expect(angleAt(f, 1, 0, 2)).toBeCloseTo(Math.PI / 2, 14);
    const line = frameOf([
      { m: 1, x: [-1, 0, 0], v: [0, 0, 0] },
      { m: 1, x: [0, 0, 0], v: [0, 0, 0] },
      { m: 1, x: [2, 0, 0], v: [0, 0, 0] },
    ]);
    expect(angleAt(line, 0, 1, 2)).toBe(Math.PI);
    expect(angleAt(line, 1, 1, 2)).toBeNaN();
  });

  test('the hierarchy: a moon orbits its planet, the planet its star', () => {
    const system = kepler({ a: 1, e: 0, i: 0, Omega: 0, omega: 0, M: 0 });
    const planet = system.bodies[1];
    // A moon 0.01 from the planet: the planet pulls on it 10 times harder than the star.
    const moon = {
      id: 'moon',
      m: 1e-8,
      radius: 0,
      x: [planet.x[0] + 0.01, planet.x[1], planet.x[2]],
      v: [planet.v[0], planet.v[1] + Math.sqrt(1e-3 / 0.01), planet.v[2]],
    };
    const h = hierarchy(frameOf([...system.bodies, moon]));
    expect(h.primary).toEqual([-1, 0, 1]);
    expect(h.roots).toEqual([0]);
    expect(h.depth).toEqual([0, 1, 2]);
    // Equal masses: the lower index is the root, not a coin toss.
    const pair = hierarchy(
      frameOf([
        { m: 1, x: [0, 0, 0], v: [0, 0, 0] },
        { m: 1, x: [1, 0, 0], v: [0, 0, 0] },
      ])
    );
    expect(pair.primary).toEqual([-1, 0]);
    // A test particle orbits whoever pulls hardest.
    expect(hierarchy(f).primary[2]).toBe(0);
  });

  test('elements about a primary come back as they were put in', () => {
    const el = { a: 2, e: 0.3, i: 0.5, Omega: 1.1, omega: 0.7, M: 0.4 };
    const mu = 1 + 1e-3;
    const r = fromElements(el, mu);
    const fr = frameOf([
      { m: 1, x: [0, 0, 0], v: [0, 0, 0] },
      { m: 1e-3, x: r.x, v: r.v },
    ]);
    const got = elementsAbout(fr, 1, 0, 1);
    for (const k of ['a', 'e', 'i', 'Omega', 'omega', 'M'])
      expect(got[k]).toBeCloseTo(el[k], 10);
    expect(got.bound).toBe(true);
    expect(got.period).toBeCloseTo(TAU * Math.sqrt(8 / mu), 10);
    expect(mutualInclination(got.normal, [0, 0, 1])).toBeCloseTo(0.5, 10);
    expect(KM_S_PER_AU_DAY).toBeCloseTo(1731.4568368, 6);
  });
});

describe('frames', () => {
  const ref = REFERENCES.find(r => r.id === 'R3').make();
  const bodies = ref.system.bodies;
  const f = frameOf(bodies);

  test('the barycentric frame has its center of mass at rest at the origin', () => {
    const d = toFrame(f, 'barycentric');
    for (let k = 0; k < 3; k++) {
      let x = 0;
      let v = 0;
      bodies.forEach((b, i) => {
        x += b.m * d.x[3 * i + k];
        v += b.m * d.v[3 * i + k];
      });
      expect(x).toBeCloseTo(0, 12);
      expect(v).toBeCloseTo(0, 12);
    }
    const body = toFrame(f, { primary: 1 });
    expect([...body.x.subarray(3, 6)]).toEqual([0, 0, 0]);
  });

  test('a rotating pair sits on its x axis, at rest there on a circular orbit', () => {
    const system = kepler({ a: 1, e: 0, i: 0.7, Omega: 0.3, omega: 0, M: 1 });
    const fr = frameOf(system.bodies);
    const d = toFrame(fr, { corotating: [0, 1] });
    for (const i of [0, 1]) {
      expect(d.x[3 * i + 1]).toBeCloseTo(0, 12);
      expect(d.x[3 * i + 2]).toBeCloseTo(0, 12);
      for (let k = 0; k < 3; k++) expect(d.v[3 * i + k]).toBeCloseTo(0, 10);
    }
  });

  test.each([
    ['barycentric'],
    ['inertial'],
    [{ primary: 0 }],
    [{ corotating: [0, 1] }],
  ])('a trail point in %p is where the body is at that time', frame => {
    const row = Float64Array.from(bodies.flatMap(b => b.x));
    const got = trailToFrame(row, 1, f, frame);
    const want = toFrame(f, frame).x;
    for (let k = 0; k < want.length; k++)
      expect(got[k]).toBeCloseTo(want[k], 12);
  });
});
