// =============================================================================
// The 3-D kernel: properties, refusals, determinism, events, the protocol
// -----------------------------------------------------------------------------
// tools/validate-lab3d.mjs runs the reference corpus at full length in Node
// (npm run validate:lab3d). These are the fast checks Jest can afford:
//
//   - orbital elements round-trip for random orbits, elliptic and
//     hyperbolic, and the singular conventions hold;
//   - frames round-trip, and the barycentric frame has no net momentum;
//   - units convert with G carried exactly, and a wrong scale is refused;
//   - an invalid, ambiguous or hostile system is refused with a code, never
//     by throwing, for random corruptions of a valid one;
//   - the same numbers give the same bytes, a seeded nudge is the same every
//     time, and the step controls use no engine-dependent arithmetic;
//   - short versions of the corpus: bounded energy for the symplectic
//     schemes, growing energy for RK4, exact mergers, close approaches and
//     crossings found, escapes, limits and cancellation;
//   - the Worker protocol and the experiment integration, with a Worker
//     played in-process.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { webcrypto } from 'node:crypto';
import {
  SCHEMES,
  cubeRoot,
  makeState,
  run,
  stateHash,
  stepFactor,
} from '../js/lab3d/kernel.js';
import {
  fromElements,
  toElements,
  inFrame,
  corotating,
  elementsProblem,
  SINGULAR,
} from '../js/lab3d/elements.js';
import {
  FORMAT,
  SCHEME_NAMES,
  UNIT_SYSTEMS,
  convertUnits,
  migrateSystem,
  perturb,
  placeByElements,
  validateSystem,
} from '../js/lab3d/state.js';
import {
  STATUS,
  createRun,
  runProblems,
  runToEnd,
} from '../js/lab3d/engine.js';
import { LAB3D_API, createLab3d } from '../js/lab3d/api.js';
import { handle } from '../js/lab3d/workerCore.js';
import { solveKepler } from '../js/lab3d/elements.js';
import {
  planLab3dTrials,
  scheduleLab3d,
  trialOptions,
  trialResult,
  trialSystem,
  validateLab3dExperiment,
  isLab3dTrialResult,
} from '../js/lab3d/experiment.js';
import { REFERENCES, passes } from '../js/lab3d/references.js';
import { createScheduler } from '../js/experiments/scheduler.js';
import { mulberry32 } from '../js/rng.js';

// jsdom's crypto has no subtle digest; the kernel's hash is the platform's.
if (!globalThis.crypto?.subtle)
  Object.defineProperty(globalThis, 'crypto', {
    value: webcrypto,
    configurable: true,
  });

const TAU = 2 * Math.PI;
const rand = mulberry32(20260928);
const between = (a, b) => a + (b - a) * rand();
const angleDiff = (a, b) =>
  Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));

/** A two-body system from elements, in code units. */
function kepler(el, integrator = { scheme: 'yoshida4c', h: TAU / 500 }) {
  const system = {
    format: FORMAT,
    formatVersion: 1,
    units: 'code',
    integrator,
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
  return system;
}

describe('orbital elements', () => {
  test('round-trip for 500 random orbits, elliptic and hyperbolic', () => {
    for (let k = 0; k < 500; k++) {
      const hyperbolic = k % 4 === 0;
      const e = hyperbolic ? between(1.05, 4) : between(0.001, 0.97);
      const el = {
        a: hyperbolic ? -between(0.5, 10) : between(0.1, 50),
        e,
        i: between(0.01, Math.PI - 0.01),
        Omega: between(-3, 3),
        omega: between(-3, 3),
        M: hyperbolic ? between(-3, 3) : between(-3, 3),
      };
      const mu = between(0.1, 10);
      const s = fromElements(el, mu);
      const b = toElements(s.x, s.v, mu);
      expect(Math.abs(b.a - el.a) / Math.abs(el.a)).toBeLessThan(1e-9);
      expect(Math.abs(b.e - el.e)).toBeLessThan(1e-9);
      expect(Math.abs(b.i - el.i)).toBeLessThan(1e-9);
      expect(angleDiff(b.Omega, el.Omega)).toBeLessThan(1e-8);
      expect(angleDiff(b.omega, el.omega)).toBeLessThan(1e-6);
      expect(angleDiff(b.M, el.M)).toBeLessThan(1e-6);
    }
  });

  test("Kepler's equation is solved for 20,000 random orbits up to e = 0.999", () => {
    for (let k = 0; k < 20000; k++) {
      const e = 0.999 * rand();
      const M = 20 * (rand() - 0.5);
      const E = solveKepler(M, e);
      expect(Math.abs(E - e * Math.sin(E) - M)).toBeLessThan(1e-12);
    }
  });

  test('a circular orbit measures its phase from the node, and an orbit in the plane has node 0', () => {
    const c = fromElements(
      { a: 2, e: 0, i: 0.5, Omega: 1, omega: 0, M: 0.7 },
      1
    );
    const back = toElements(c.x, c.v, 1);
    expect(back.e).toBeLessThan(SINGULAR);
    expect(back.omega).toBe(0);
    expect(angleDiff(back.M, 0.7)).toBeLessThan(1e-9);
    const p = fromElements(
      { a: 2, e: 0.3, i: 0, Omega: 0, omega: 1.2, M: 0.4 },
      1
    );
    const q = toElements(p.x, p.v, 1);
    expect(q.Omega).toBe(0);
    expect(angleDiff(q.omega, 1.2)).toBeLessThan(1e-9);
  });

  test('a parabola, a negative eccentricity and an axis of the wrong sign are refused by name', () => {
    expect(
      elementsProblem({ a: 1, e: 1, i: 0, Omega: 0, omega: 0, M: 0 }, 1)
    ).toBe('parabolic');
    expect(
      elementsProblem({ a: 1, e: -0.1, i: 0, Omega: 0, omega: 0, M: 0 }, 1)
    ).toBe('eccentricity');
    expect(
      elementsProblem({ a: 1, e: 1.5, i: 0, Omega: 0, omega: 0, M: 0 }, 1)
    ).toBe('hyperbolaAxis');
    expect(
      elementsProblem({ a: -1, e: 0.5, i: 0, Omega: 0, omega: 0, M: 0 }, 1)
    ).toBe('ellipseAxis');
    expect(
      elementsProblem({ a: 1, e: 0.5, i: 4, Omega: 0, omega: 0, M: 0 }, 1)
    ).toBe('inclination');
    expect(() =>
      fromElements({ a: 1, e: 1, i: 0, Omega: 0, omega: 0, M: 0 }, 1)
    ).toThrow('parabolic');
  });
});

describe('frames', () => {
  test('the barycentric frame has no net momentum, and a body-centered frame puts that body at rest at the origin', () => {
    const s = makeState([
      { m: 1, x: [0.3, -0.2, 0.1], v: [0.05, 0.02, -0.01] },
      { m: 0.2, x: [2, 1, -0.5], v: [-0.1, 0.4, 0.2] },
      { m: 0.01, x: [-3, 0.5, 1], v: [0.2, -0.3, 0.1] },
    ]);
    const bary = inFrame(s, 'barycentric');
    let p = [0, 0, 0];
    for (let i = 0; i < 3; i++)
      for (let k = 0; k < 3; k++) p[k] += s.m[i] * bary.v[3 * i + k];
    expect(Math.hypot(...p)).toBeLessThan(1e-15);
    const body = inFrame(s, { primary: 1 });
    expect([...body.x.slice(3, 6), ...body.v.slice(3, 6)]).toEqual([
      0, 0, 0, 0, 0, 0,
    ]);
    // Back again: frame + origin is the inertial state.
    for (let k = 0; k < 9; k++)
      expect(bary.x[k] + bary.origin.x[k % 3]).toBeCloseTo(s.x[k], 14);
    expect(() => inFrame(s, { primary: 7 })).toThrow();
    expect(() => inFrame(s, 'sideways')).toThrow();
  });

  test("in a pair's corotating frame, a circular pair stands still on the x axis", () => {
    const r = fromElements(
      { a: 1, e: 0, i: 0.8, Omega: 0.4, omega: 0, M: 1.1 },
      2
    );
    const s = makeState([
      { m: 1, x: r.x.map(c => -c / 2), v: r.v.map(c => -c / 2) },
      { m: 1, x: r.x.map(c => c / 2), v: r.v.map(c => c / 2) },
    ]);
    const view = corotating(s, 0, 1);
    const a = view([...s.x.slice(0, 3)], [...s.v.slice(0, 3)]);
    const b = view([...s.x.slice(3, 6)], [...s.v.slice(3, 6)]);
    expect(a.x[0]).toBeCloseTo(-0.5, 12);
    expect(b.x[0]).toBeCloseTo(0.5, 12);
    for (const q of [a, b]) {
      expect(Math.abs(q.x[1]) + Math.abs(q.x[2])).toBeLessThan(1e-12);
      expect(Math.hypot(...q.v)).toBeLessThan(1e-12);
    }
  });
});

describe('units', () => {
  const system = kepler({ a: 1, e: 0.2, i: 0.3, Omega: 0, omega: 0, M: 0 });
  test('solar units carry G as the Gaussian constant squared', () => {
    expect(UNIT_SYSTEMS.solar.G).toBeCloseTo(2.959122082855911e-4, 18);
  });

  test('code units convert to solar with G carried, and a scale on the wrong quantity is refused', () => {
    // One code length = 1 AU, one code mass = 1 Msun: then the code time unit
    // is 1/k days, and G lands on k^2.
    const k = UNIT_SYSTEMS.solar.G ** 0.5;
    const solar = convertUnits(system, 'solar', {
      length: 1,
      time: 1 / k,
      mass: 1,
    });
    expect(validateSystem(solar)).toEqual([]);
    expect(solar.bodies[1].x).toEqual(system.bodies[1].x);
    expect(() =>
      convertUnits(system, 'solar', { length: 1, time: 1, mass: 1 })
    ).toThrow(/do not carry G/);
    expect(() => convertUnits(system, 'solar', {})).toThrow(/explicit/);
  });

  test('the same orbit in solar units takes the same number of periods', () => {
    const k = UNIT_SYSTEMS.solar.G ** 0.5;
    const solar = convertUnits(system, 'solar', {
      length: 1,
      time: 1 / k,
      mass: 1,
    });
    const P = TAU / Math.sqrt(1.001);
    const a = runToEnd(system, { span: 10 * P, samples: 10 });
    const b = runToEnd(solar, { span: (10 * P) / k, samples: 10 });
    const d = (r, i) =>
      Math.hypot(r.samples[i].x[3], r.samples[i].x[4], r.samples[i].x[5]);
    for (let i = 0; i <= 10; i++) expect(d(b, i)).toBeCloseTo(d(a, i), 9);
  });
});

describe('refusals', () => {
  const good = kepler({ a: 1, e: 0.1, i: 0.2, Omega: 0, omega: 0, M: 0 });
  const codes = s => validateSystem(s).map(e => e.code);

  test.each([
    [
      'an unknown format',
      s => (s.format = 'gravitas.orbital-system'),
      'format',
    ],
    ['an unknown unit system', s => (s.units = 'furlongs'), 'units'],
    ['an unknown scheme', s => (s.integrator.scheme = 'euler'), 'scheme'],
    ['a step of zero', s => (s.integrator.h = 0), 'step'],
    [
      'a tolerance on a fixed-step scheme',
      s => (s.integrator.tol = 1e-9),
      'ambiguous',
    ],
    [
      'a step on the adaptive scheme',
      s => (s.integrator = { scheme: 'dopri5', tol: 1e-10, h: 0.1 }),
      'ambiguous',
    ],
    [
      'a tolerance out of range',
      s => (s.integrator = { scheme: 'dopri5', tol: 1e-3 }),
      'tolerance',
    ],
    [
      'a body with elements',
      s => (s.bodies[1].elements = { a: 1 }),
      'ambiguous',
    ],
    ['a negative mass', s => (s.bodies[1].m = -1), 'mass'],
    ['a vector of two', s => (s.bodies[1].x = [1, 2]), 'vector'],
    ['two bodies in one place', s => (s.bodies[1].x = [0, 0, 0]), 'coincident'],
    [
      'bodies already touching',
      s => ((s.bodies[0].radius = 0.6), (s.bodies[1].radius = 0.6)),
      'overlap',
    ],
    ['a duplicate id', s => (s.bodies[1].id = 'star'), 'duplicate'],
    ['only test particles', s => s.bodies.forEach(b => (b.m = 0)), 'noMass'],
    ['one body', s => s.bodies.splice(1), 'bodyCount'],
    [
      'fifty-one bodies',
      s => {
        for (let i = 0; i < 49; i++)
          s.bodies.push({
            id: `extra-${i}`,
            m: 1e-9,
            radius: 0,
            x: [10 + i, 0, 0],
            v: [0, 0.3, 0],
          });
      },
      'bodyCount',
    ],
  ])('%s', (_, edit, code) => {
    const s = JSON.parse(JSON.stringify(good));
    edit(s);
    expect(codes(s)).toContain(code);
  });

  test('a hostile file is refused for that reason alone', () => {
    const s = JSON.parse(
      '{"format":"gravitas.system3d","formatVersion":1,"bodies":[{"__proto__":{"polluted":1}}]}'
    );
    expect(codes(s)).toEqual(['unsafeKey']);
    expect({}.polluted).toBeUndefined();
    const nan = JSON.parse(JSON.stringify(good));
    nan.bodies[1].v[0] = Infinity;
    expect(codes(nan)).toEqual(['number']);
  });

  test('random corruptions of a valid system are refused with a code, and never throw', () => {
    const paths = [
      ['units'],
      ['integrator', 'scheme'],
      ['integrator', 'h'],
      ['bodies', 1, 'm'],
      ['bodies', 1, 'x'],
      ['bodies', 1, 'x', 2],
      ['bodies', 0, 'id'],
      ['bodies'],
      ['formatVersion'],
    ];
    const junk = [null, -1, 'x', [], {}, true, 1e308, [1, 2, 3, 4], '<script>'];
    for (let k = 0; k < 300; k++) {
      const s = JSON.parse(JSON.stringify(good));
      const path = paths[Math.floor(rand() * paths.length)];
      let o = s;
      for (const key of path.slice(0, -1)) o = o[key];
      o[path.at(-1)] = junk[Math.floor(rand() * junk.length)];
      let errors;
      expect(() => (errors = validateSystem(s))).not.toThrow();
      for (const e of errors) expect(typeof e.code).toBe('string');
    }
  });

  test('a run of a refused system, or with a bad span or sample count, is refused before it starts', () => {
    expect(runProblems(good, { span: -1 }).map(p => p.code)).toEqual(['span']);
    expect(
      runProblems(good, { span: 1, samples: 6000 }).map(p => p.code)
    ).toEqual(['samples']);
    expect(
      runProblems(good, { span: 1, crossings: ['nobody'] }).map(p => p.code)
    ).toEqual(['body']);
    expect(() => createRun({ ...good, units: 'x' }, { span: 1 })).toThrow(
      'refused'
    );
  });
});

describe('migration', () => {
  test('a system of this version passes through, and a newer one is refused', () => {
    const s = kepler({ a: 1, e: 0.1, i: 0.2, Omega: 0, omega: 0, M: 0 });
    expect(migrateSystem(s)).toEqual({ ok: true, system: s, migrated: false });
    expect(migrateSystem({ ...s, formatVersion: 2 })).toEqual({
      ok: false,
      code: 'newer',
      vars: { version: 2 },
    });
    expect(migrateSystem({ format: 'something' }).code).toBe('notSystem');
  });

  test('a 2-D Orbital System Builder file becomes a 3-D system from its recorded numbers', () => {
    const file = {
      format: 'gravitas.orbital-system',
      version: 1,
      bodies: [{ name: 'Sun' }, { name: 'Earth' }],
      initial: {
        G: 2,
        bodies: [
          { x: 0, y: 0, vx: 0, vy: 0, mass: 1000 },
          { x: 100, y: 0, vx: 0, vy: 4.47, mass: 1 },
        ],
      },
    };
    const r = migrateSystem(file);
    expect(r.ok).toBe(true);
    expect(validateSystem(r.system)).toEqual([]);
    expect(r.system.bodies[1]).toEqual({
      id: 'body-2',
      name: 'Earth',
      m: 2,
      radius: 0,
      x: [100, 0, 0],
      v: [0, 4.47, 0],
    });
    expect(r.system.provenance.from).toBe('gravitas.orbital-system/1');
    expect(migrateSystem({ ...file, initial: undefined }).code).toBe(
      'noInitialState'
    );
    expect(migrateSystem({ ...file, version: 3 }).code).toBe('newer');
  });
});

describe('determinism', () => {
  test('the step controls and the merger radius use no engine-dependent arithmetic', () => {
    const src = readFileSync('js/lab3d/kernel.js', 'utf8').replace(
      /\/\/.*$|\/\*[\s\S]*?\*\//gm,
      ''
    );
    for (const banned of [
      'Math.pow',
      'Math.cbrt',
      'Math.exp',
      'Math.log',
      'Math.sin',
      'Math.cos',
      '**',
    ])
      expect([banned, src.includes(banned)]).toEqual([banned, false]);
    expect(stepFactor(1)).toBeCloseTo(0.9, 15);
    for (const err of [1e-6, 0.01, 0.5, 3, 900])
      expect(stepFactor(err)).toBeCloseTo(
        Math.min(5, Math.max(0.2, 0.9 * Math.pow(err, -0.2))),
        12
      );
    for (const c of [1e-9, 0.001, 2, 27, 1e6])
      expect(cubeRoot(c) ** 3).toBeCloseTo(c, 10 - Math.max(0, Math.log10(c)));
  });

  test('the same numbers give the same bytes, twice, for every scheme', async () => {
    const bodies = [
      { m: 1, x: [0, 0, 0], v: [0, 0, 0] },
      { m: 1e-3, x: [1, 0.1, 0.05], v: [0, 1, 0.1] },
      { m: 3e-4, x: [-2, 0.4, -0.1], v: [0.1, -0.7, 0.02] },
    ];
    for (const scheme of Object.keys(SCHEMES)) {
      const a = makeState(bodies);
      const b = makeState(bodies);
      run(a, scheme, 0.01, 2000);
      run(b, scheme, 0.01, 2000);
      expect(await stateHash(a)).toBe(await stateHash(b));
    }
  });

  test('a seeded nudge is the same every time and different for another seed', () => {
    const s = kepler({ a: 1, e: 0.1, i: 0.2, Omega: 0, omega: 0, M: 0 });
    const a = perturb(s, 7, { position: 1e-3, velocity: 1e-4 });
    expect(perturb(s, 7, { position: 1e-3, velocity: 1e-4 })).toEqual(a);
    expect(perturb(s, 8, { position: 1e-3, velocity: 1e-4 })).not.toEqual(a);
    const d = Math.hypot(...a.bodies[1].x.map((c, k) => c - s.bodies[1].x[k]));
    expect(d).toBeCloseTo(1e-3, 12);
  });

  test("the scheme names a system may use are the kernel's, and its adaptive one", () => {
    expect([...SCHEME_NAMES].sort()).toEqual(
      [...Object.keys(SCHEMES), 'dopri5'].sort()
    );
  });
});

describe('the engine, on short versions of the corpus', () => {
  const P = TAU / Math.sqrt(1.001);
  const el = { a: 1, e: 0.6, i: 0.7, Omega: 0.5, omega: 1, M: 0 };

  test("the symplectic schemes hold energy bounded; RK4's error grows", () => {
    const worst = (scheme, orbits) =>
      runToEnd(kepler(el, { scheme, h: P / 500 }), {
        span: orbits * P,
        samples: orbits * 25,
        positions: false,
      }).residuals.energy;
    for (const scheme of ['leapfrog', 'yoshida4', 'yoshida4c'])
      expect(worst(scheme, 40) / worst(scheme, 4)).toBeLessThan(1.5);
    expect(worst('rk4', 40) / worst('rk4', 4)).toBeGreaterThan(5);
  });

  test('compensated Yoshida holds the angular momentum vector to rounding', () => {
    const r = runToEnd(kepler(el, { scheme: 'yoshida4c', h: P / 1000 }), {
      span: 50 * P,
      samples: 50,
      positions: false,
    });
    expect(r.status).toBe(STATUS.OK);
    expect(r.residuals.angularMomentum).toBeLessThan(1e-14);
  });

  test('mergers keep mass and momentum exactly, and report the energy lost', () => {
    const [ref] = REFERENCES.filter(r => r.id === 'R8');
    const { system, options, context } = ref.make();
    const result = runToEnd(system, options);
    const checks = ref.check(result, context, runToEnd);
    expect(checks.filter(c => !passes(c))).toEqual([]);
  });

  test('a close approach, a plane crossing and an escape are found', () => {
    const [r7] = REFERENCES.filter(r => r.id === 'R7');
    const made = r7.make();
    const result = runToEnd(made.system, made.options);
    expect(result.events.filter(e => e.kind === 'closeApproach')).toHaveLength(
      1
    );
    expect(
      r7.check(result, made.context, runToEnd).filter(c => !passes(c))
    ).toEqual([]);
    const orbit = runToEnd(kepler(el), {
      span: 3 * P,
      samples: 30,
      crossings: ['planet'],
      positions: false,
    });
    expect(
      orbit.events.filter(e => e.kind === 'crossing').map(e => e.direction)
    ).toEqual([
      'descending',
      'ascending',
      'descending',
      'ascending',
      'descending',
      'ascending',
    ]);
    const flyby = runToEnd(
      {
        format: FORMAT,
        formatVersion: 1,
        units: 'code',
        integrator: { scheme: 'yoshida4c', h: 0.01 },
        t: 0,
        bodies: [
          { id: 'star', m: 1, radius: 0, x: [0, 0, 0], v: [0, 0, 0] },
          { id: 'comet', m: 0, radius: 0, x: [5, 0, 0], v: [0, 1, 0] },
        ],
      },
      { span: 200, samples: 100, escapeBeyond: 20, positions: false }
    );
    expect(
      flyby.events.filter(e => e.kind === 'escape').map(e => e.bodies[0])
    ).toEqual(['comet']);
  });

  test('a fixed step too coarse for an encounter says so, and a non-symplectic scheme is named', () => {
    const [r7] = REFERENCES.filter(r => r.id === 'R7');
    const made = r7.make();
    const coarse = runToEnd(
      { ...made.system, integrator: { scheme: 'yoshida4c', h: 0.5 } },
      { ...made.options, samples: 10 }
    );
    expect(coarse.warnings.map(w => w.code)).toContain('unresolvedEncounter');
    expect(
      runToEnd(made.system, made.options).warnings.map(w => w.code)
    ).toEqual(['nonSymplectic']);
  });

  test('the evaluation limit stops a run and says so; cancel stops it between slices', () => {
    const system = kepler(el, { scheme: 'yoshida4c', h: P / 1000 });
    const capped = runToEnd(system, {
      span: 100 * P,
      samples: 100,
      limits: { maxEvals: 60000 },
      positions: false,
    });
    expect(capped.status).toBe(STATUS.EVAL_LIMIT);
    const r = createRun(system, {
      span: 100 * P,
      samples: 100,
      positions: false,
    });
    r.advance(0);
    r.cancel();
    r.advance(1000);
    expect(r.result().status).toBe(STATUS.CANCELED);
    expect(r.fraction).toBeLessThan(1);
  });

  test('R2, R4 and R5 pass as the full validation runs them', () => {
    for (const id of ['R2', 'R4', 'R5']) {
      const ref = REFERENCES.find(r => r.id === id);
      const { system, options, context } = ref.make();
      const result = runToEnd(system, options);
      expect([
        id,
        ref.check(result, context, runToEnd).filter(c => !passes(c)),
      ]).toEqual([id, []]);
    }
  });
});

describe('the Worker protocol and the experiment integration', () => {
  /** A Worker played in-process: the real message handler (./workerCore.js). */
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

  test('a run answers with its result, and a refused system with its problems', async () => {
    const lab = createLab3d({ spawn: () => workers.shift() });
    const workers = [fakeWorker(), fakeWorker()];
    const system = kepler({ a: 1, e: 0.1, i: 0.2, Omega: 0, omega: 0, M: 0 });
    const r = await lab.run(system, {
      span: TAU,
      samples: 10,
      positions: false,
    }).done;
    expect(r.status).toBe('ok');
    expect(r.samples).toHaveLength(11);
    await expect(
      lab.run({ ...system, units: 'x' }, { span: 1 }).done
    ).rejects.toMatchObject({ code: 'refused' });
    expect(LAB3D_API).toMatch(/^1\.\d+\.\d+$/);
  });

  test('a 3-D experiment validates, plans its trials and runs them through the scheduler', async () => {
    const system = kepler({ a: 1, e: 0.2, i: 0.4, Omega: 0, omega: 0, M: 0 });
    const m = {
      format: 'gravitas.experiment',
      formatVersion: 1,
      id: 'inclined-orbit-steps',
      model: { kind: 'lab3d', api: '^1.0.0', system },
      seeds: [1, 2],
      perturb: { position: 1e-6 },
      vary: { parameter: 'integrator.h', values: [0.02, 0.01] },
      observables: {
        metrics: [
          { id: 'energyDrift' },
          { id: 'maxEccentricity', bodies: ['star', 'planet'] },
        ],
      },
      stop: { span: 5 * TAU, samples: 50 },
      limits: {
        concurrency: 2,
        trialTimeoutMs: 20000,
        totalTimeoutMs: 60000,
        maxResultBytes: 5e6,
      },
    };
    expect(validateLab3dExperiment(m)).toEqual([]);
    expect(
      validateLab3dExperiment({
        ...m,
        vary: { parameter: 'body:nobody.m', values: [1] },
      }).map(e => e.path)
    ).toContain('vary.parameter');
    const trials = planLab3dTrials(m);
    expect(trials.map(t => [t.params['integrator.h'], t.seed])).toEqual([
      [0.02, 1],
      [0.02, 2],
      [0.01, 1],
      [0.01, 2],
    ]);
    const direct = trialResult(
      m,
      trials[0],
      trialSystem(m, trials[0]),
      runToEnd(trialSystem(m, trials[0]), trialOptions(m))
    );
    expect(isLab3dTrialResult(direct, trials[0])).toBe(true);
    expect(direct.results['maxEccentricity:star,planet']).toBeCloseTo(0.2, 3);
    const pool = [];
    for (let i = 0; i < 4; i++) pool.push(fakeWorker());
    const results = [];
    const scheduler = scheduleLab3d(m, {
      createScheduler,
      spawn: () => pool.shift(),
      onTrial: r => results.push(r),
    });
    const done = await scheduler.run();
    expect(done.trials.map(r => r.status)).toEqual(['ok', 'ok', 'ok', 'ok']);
    // The finer step drifts less.
    expect(done.trials[2].results.energyDrift).toBeLessThan(
      done.trials[0].results.energyDrift
    );
  });
});
