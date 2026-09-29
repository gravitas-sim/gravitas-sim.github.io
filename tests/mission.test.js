// =============================================================================
// The mission core: units, solvers, branches, refusals, determinism, speed
// -----------------------------------------------------------------------------
// tools/validate-mission.mjs prints the reference cases' table and writes it
// into MISSION.md (npm run validate:mission). These are the checks around it:
//
//   - units and coordinates: canonical units carry GM = 1, the model planets
//     are circles at their radii, dates round-trip, and a Lambert problem
//     rotated or rescaled has the rotated or rescaled answer;
//   - convergence: the Stumpff series meets its closed form, Kepler's
//     problem and Lambert's problem converge within their limits for random
//     problems, and every accepted Lambert answer reproduces its problem;
//   - branch selection: the branch asked for is the branch returned;
//   - failure: every refusal code, from each solver, for the case it names;
//   - determinism: the same problem gives the same bytes, a window is the
//     same however it is sliced, and the Worker's answer is the direct one;
//   - performance: Lambert solves and a window within fixed CPU budgets;
//   - the reference cases, every measure within its fixed tolerance;
//   - the Worker protocol, cancellation, the wall-clock limit, and the plan
//     file.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { Buffer } from 'node:buffer';
import process from 'node:process';
import { setTimeout } from 'node:timers';
import {
  AU,
  BODIES,
  DAY,
  canonical,
  circularOrbit,
  dateOf,
  daysOf,
  planetState,
  synodicDays,
} from '../js/mission/bodies.js';
import {
  cross,
  dot,
  norm,
  orbitOf,
  propagate,
  stumpffC,
  stumpffS,
  sub,
} from '../js/mission/twobody.js';
import { lambert, MAX_ITERATIONS, MAX_MISS } from '../js/mission/lambert.js';
import {
  biElliptic,
  hohmann,
  phasing,
  rendezvous,
} from '../js/mission/transfers.js';
import { flyby, sphereOfInfluence } from '../js/mission/patched.js';
import {
  CELL_STATUS,
  MAX_CELLS,
  computeWindow,
  createWindow,
  windowProblems,
} from '../js/mission/window.js';
import { CASES, passes, runCase } from '../js/mission/references.js';
import { handle, solve } from '../js/mission/workerCore.js';
import { MISSION_API, createMission } from '../js/mission/api.js';
import {
  NOT_FOR,
  PLAN_FORMAT,
  planBytes,
  planFile,
} from '../js/mission/plan.js';
import { fromElements } from '../js/lab3d/elements.js';
import { EN_MISSION } from '../js/i18n/en.mission.js';
import { ES_MISSION } from '../js/i18n/es.mission.js';

const MU = BODIES.earth.GM;
const { PI, cos, sin, sqrt } = Math;
const DEG = PI / 180;

/** A deterministic stream in [0, 1). */
function stream(seed) {
  let s = seed >>> 0 || 1;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}
/** A rotation matrix from three angles, and its action. */
const rotation = (a, b, c) => {
  const [ca, sa, cb, sb, cc, sc] = [
    cos(a),
    sin(a),
    cos(b),
    sin(b),
    cos(c),
    sin(c),
  ];
  return [
    [ca * cc - sa * cb * sc, -ca * sc - sa * cb * cc, sa * sb],
    [sa * cc + ca * cb * sc, -sa * sc + ca * cb * cc, -ca * sb],
    [sb * sc, sb * cc, cb],
  ];
};
const apply = (R, v) =>
  R.map(row => row[0] * v[0] + row[1] * v[1] + row[2] * v[2]);
/** Random Lambert problems about the Earth, from low orbit to the Moon's distance. */
function problems(n, seed, minTof = 600) {
  const rnd = stream(seed);
  const out = [];
  while (out.length < n) {
    const r1 = [(rnd() - 0.5) * 8e4, (rnd() - 0.5) * 8e4, (rnd() - 0.5) * 2e4];
    const r2 = [(rnd() - 0.5) * 8e4, (rnd() - 0.5) * 8e4, (rnd() - 0.5) * 2e4];
    if (norm(r1) < 6600 || norm(r2) < 6600) continue;
    const tof = 10 ** (Math.log10(minTof) + (6 - Math.log10(minTof)) * rnd());
    out.push({
      mu: MU,
      r1,
      r2,
      tof,
      direction: rnd() < 0.5 ? 'prograde' : 'retrograde',
    });
  }
  return out;
}
const cpu = () => {
  const u = process.cpuUsage();
  return (u.user + u.system) / 1000;
};

describe('units and coordinates', () => {
  test('canonical units carry GM = 1 and convert back exactly', () => {
    const u = canonical(MU, 6678.137);
    expect(u.DU ** 3 / u.TU ** 2 / MU).toBeCloseTo(1, 14);
    expect(u.VU).toBeCloseTo(sqrt(MU / 6678.137), 12);
    expect(() => canonical(0, 1)).toThrow();
    expect(() => canonical(1, -1)).toThrow();
  });

  test('the model planets are circles at their mean radii, moving at the Kepler rate', () => {
    for (const id of ['venus', 'earth', 'mars', 'jupiter']) {
      for (const days of [-3000, 0, 1234.5, 9035]) {
        const s = planetState(id, days);
        expect(norm(s.r) / (BODIES[id].a * AU)).toBeCloseTo(1, 14);
        expect(dot(s.r, s.v) / (norm(s.r) * norm(s.v))).toBeCloseTo(0, 14);
        expect(norm(s.v) / sqrt(BODIES.sun.GM / norm(s.r))).toBeCloseTo(1, 13);
        expect(s.r[2]).toBe(0);
      }
    }
    // J2000: the Earth at its mean longitude.
    const e = planetState('earth', 0);
    expect(Math.atan2(e.r[1], e.r[0]) / DEG).toBeCloseTo(100.46457166, 10);
    expect(synodicDays('earth', 'mars')).toBeCloseTo(779.9, 1);
  });

  test('dates round-trip, and a date that is not one is refused', () => {
    expect(dateOf(0)).toBe('2000-01-01');
    expect(daysOf('2000-01-01')).toBe(-0.5);
    for (const d of ['1999-12-31', '2024-02-29', '2026-09-29', '2033-01-01'])
      expect(dateOf(daysOf(d) + 0.5)).toBe(d);
    for (const bad of ['2023-02-29', '2024-13-01', '24-01-01', '', 'x'])
      expect(daysOf(bad)).toBeNaN();
  });

  test('a rotated Lambert problem has the rotated answer', () => {
    const rnd = stream(11);
    for (const p of problems(40, 3)) {
      const R = rotation(rnd() * 6, rnd() * 3, rnd() * 6);
      const a = lambert(p);
      const b = lambert({
        ...p,
        r1: apply(R, p.r1),
        r2: apply(R, p.r2),
        normal: apply(R, [0, 0, 1]),
      });
      expect(b.status).toBe(a.status);
      if (!a.ok) continue;
      expect(norm(sub(b.v1, apply(R, a.v1))) / norm(a.v1)).toBeLessThan(1e-9);
      expect(norm(sub(b.v2, apply(R, a.v2))) / norm(a.v2)).toBeLessThan(1e-9);
    }
  });

  test('a Lambert problem in canonical units is the same problem', () => {
    for (const p of problems(30, 4)) {
      const u = canonical(MU, norm(p.r1));
      const a = lambert(p);
      const b = lambert({
        ...p,
        mu: 1,
        r1: p.r1.map(x => x / u.DU),
        r2: p.r2.map(x => x / u.DU),
        tof: p.tof / u.TU,
      });
      expect(b.status).toBe(a.status);
      if (a.ok)
        expect(
          norm(
            sub(
              b.v1.map(x => x * u.VU),
              a.v1
            )
          ) / norm(a.v1)
        ).toBeLessThan(1e-9);
    }
  });

  test("elements from the 3-D kernel's conversion give the orbit two-body motion says", () => {
    const st = fromElements(
      { a: 26560, e: 0.3, i: 0.9, Omega: 1.2, omega: -0.4, M: 2 },
      MU
    );
    expect(orbitOf(MU, st.x, st.v).a / 26560).toBeCloseTo(1, 12);
  });
});

describe('convergence', () => {
  test('the Stumpff series meets the closed form at the switch', () => {
    for (const z of [0.1, -0.1]) {
      const e = 1e-9;
      expect(stumpffC(z + e) / stumpffC(z - e)).toBeCloseTo(1, 7);
      expect(stumpffS(z + e) / stumpffS(z - e)).toBeCloseTo(1, 7);
    }
    expect(stumpffC(0)).toBe(0.5);
    expect(stumpffS(0)).toBe(1 / 6);
  });

  test("Kepler's problem returns to its start forward and back, on ellipses and hyperbolas", () => {
    const rnd = stream(21);
    for (let k = 0; k < 200; k++) {
      const hyper = k % 2 === 1;
      const el = hyper
        ? {
            a: -(5000 + 3e4 * rnd()),
            e: 1.05 + 3 * rnd(),
            i: 3 * rnd(),
            Omega: 6 * rnd() - 3,
            omega: 6 * rnd() - 3,
            M: 4 * rnd() - 2,
          }
        : {
            a: 7000 + 5e4 * rnd(),
            e: 0.95 * rnd(),
            i: 3 * rnd(),
            Omega: 6 * rnd() - 3,
            omega: 6 * rnd() - 3,
            M: 6 * rnd() - 3,
          };
      const st = fromElements(el, MU);
      const dt = (hyper ? 1 : 5) * 86400 * rnd() + 60;
      const a = propagate(MU, st.x, st.v, dt);
      expect(a.ok).toBe(true);
      expect(a.iterations).toBeLessThan(60);
      const b = propagate(MU, a.r, a.v, -dt);
      // Rounding in the universal anomaly accumulates with every revolution,
      // and near periapsis it is magnified by about 1 / (1 - e): measured, the
      // worst of these is 1e-11 a revolution at e = 0.79. How accurate the
      // motion is, rather than how consistent, is the kernel's comparison
      // (reference case K1, to 1e-9 of the distance).
      const revolutions = hyper ? 0 : dt / (2 * PI * sqrt(el.a ** 3 / MU));
      const bound = hyper ? 1e-11 : (1e-11 * (1 + revolutions)) / (1 - el.e);
      expect(norm(sub(b.r, st.x)) / (norm(st.x) + norm(a.r))).toBeLessThan(
        bound
      );
      expect(
        orbitOf(MU, a.r, a.v).energy / orbitOf(MU, st.x, st.v).energy
      ).toBeCloseTo(1, 10);
    }
  });

  test('Lambert converges on random problems, and every answer it gives reproduces its problem', () => {
    const tally = {};
    for (const p of problems(3000, 5)) {
      const s = lambert(p);
      tally[s.status] = (tally[s.status] || 0) + 1;
      if (s.ok) {
        expect(s.iterations).toBeLessThanOrEqual(MAX_ITERATIONS);
        expect(s.residual).toBeLessThan(1e-11);
        expect(s.miss).toBeLessThanOrEqual(MAX_MISS);
      } else {
        // The only refusals in this domain are answers that could not be
        // confirmed: long ways within a few degrees of a full turn.
        expect(s.status).toBe('checkFailed');
        expect(s.branch).toBe('long');
      }
    }
    expect(tally.ok / 3000).toBeGreaterThan(0.999);
    expect(tally.noConvergence).toBeUndefined();
  });
});

describe('branch selection', () => {
  const r1 = [15945.34, 0, 0];
  const r2 = [12214.83899, 10249.46731, 0];

  test('prograde and retrograde are the two senses about the pole, short and long ways', () => {
    const pro = lambert({ mu: MU, r1, r2, tof: 4560 });
    const retro = lambert({
      mu: MU,
      r1,
      r2,
      tof: 4560,
      direction: 'retrograde',
    });
    expect([pro.branch, retro.branch]).toEqual(['short', 'long']);
    expect(cross(r1, pro.v1)[2]).toBeGreaterThan(0);
    expect(cross(r1, retro.v1)[2]).toBeLessThan(0);
    expect(pro.transferAngle / DEG).toBeCloseTo(40, 0);
    expect(retro.transferAngle / DEG).toBeCloseTo(320, 0);
  });

  test('the pole decides the sense: -z swaps the branches', () => {
    const a = lambert({ mu: MU, r1, r2, tof: 4560 });
    const b = lambert({
      mu: MU,
      r1,
      r2,
      tof: 4560,
      direction: 'retrograde',
      normal: [0, 0, -1],
    });
    expect(b.v1).toEqual(a.v1);
    expect(b.branch).toBe('short');
  });

  test('a transfer plane containing the pole is refused as ambiguous', () => {
    const s = lambert({
      mu: MU,
      r1: [7000, 0, 0],
      r2: [0, 0, 7000],
      tof: 1500,
    });
    expect(s.status).toBe('branchAmbiguous');
  });
});

describe('failure: every refusal has its case', () => {
  const ok = { mu: MU, r1: [7000, 0, 0], r2: [0, 8000, 0], tof: 2000 };
  test.each([
    ['input', { ...ok, mu: 0 }],
    ['input', { ...ok, r1: [0, 0, 0] }],
    ['input', { ...ok, r2: [1, 2] }],
    ['input', { ...ok, tof: -5 }],
    ['input', { ...ok, tof: NaN }],
    ['input', { ...ok, direction: 'sideways' }],
    ['revolutions', { ...ok, revolutions: 1 }],
    ['collinear', { ...ok, r2: [9000, 0, 0] }],
    ['antipodal', { ...ok, r2: [-8000, 0, 0] }],
    [
      'antipodal',
      { ...ok, r2: [-8000 * cos(0.03 * DEG), 8000 * sin(0.03 * DEG), 0] },
    ],
    ['tooFast', { ...ok, r2: [0, -8000, 0], tof: 1 }],
    [
      'checkFailed',
      {
        mu: MU,
        r1: [20000, 0, 0],
        r2: [20000 * cos(358 * DEG), 20000 * sin(358 * DEG), 0],
        tof: 4 * 86400,
      },
    ],
  ])('Lambert refuses %s', (code, p) => {
    const s = lambert(p);
    expect(s.ok).toBe(false);
    expect(s.status).toBe(code);
    expect(s.v1 === undefined || code === 'checkFailed').toBe(true);
  });

  test('the transfers refuse what their closed forms do not describe', () => {
    expect(hohmann(MU, 7000, 7000).status).toBe('sameOrbit');
    expect(hohmann(MU, -1, 7000).status).toBe('input');
    expect(biElliptic(MU, 7000, 42000, 20000).status).toBe('intermediate');
    expect(rendezvous(MU, 7000, 7000, 0.2).status).toBe('sameOrbit');
    // A target 300 degrees behind in one lap needs an orbit through the Earth.
    expect(phasing(MU, 6778, -300 * DEG, 1, BODIES.earth.radius).status).toBe(
      'belowSurface'
    );
    expect(phasing(MU, 6778, 0.2, 0).status).toBe('input');
    expect(flyby({ id: 'mars', vinfIn: [3, 0, 0], rp: 3000 }).status).toBe(
      'belowSurface'
    );
    expect(flyby({ id: 'mars', vinfIn: [3, 0, 1], rp: 5000 }).status).toBe(
      'outOfPlane'
    );
  });

  test('a window names what is wrong with it before computing a cell', () => {
    const w = {
      from: 'earth',
      to: 'mars',
      departStart: 9000,
      departSpan: 100,
      departSteps: 10,
      tofMin: 100,
      tofMax: 300,
      tofSteps: 10,
    };
    expect(windowProblems(w)).toEqual([]);
    const codes = o => windowProblems({ ...w, ...o }).map(p => p.code);
    expect(codes({ from: 'pluto' })).toEqual(['planet']);
    expect(codes({ to: 'earth' })).toEqual(['samePlanet']);
    expect(codes({ tofMin: 0 })).toContain('value');
    expect(codes({ departSteps: 401 })).toEqual(['steps']);
    expect(codes({ departSteps: 400, tofSteps: 101 })).toEqual(['cells']);
    expect(() => createWindow({ ...w, tofSteps: 0 })).toThrow('refused');
    expect(MAX_CELLS).toBe(40000);
  });
});

describe('determinism', () => {
  const W = {
    from: 'earth',
    to: 'mars',
    departStart: 9000,
    departSpan: 80,
    departSteps: 17,
    tofMin: 180,
    tofMax: 320,
    tofSteps: 15,
  };

  test('the same problem gives the same bytes', () => {
    for (const p of problems(50, 8))
      expect(JSON.stringify(lambert(p))).toBe(JSON.stringify(lambert(p)));
  });

  test('a window is the same however it is sliced', () => {
    const whole = computeWindow(W);
    const w = createWindow(W, { now: () => 0 });
    let slices = 0;
    // A clock that has always run out computes one row a slice.
    const sliced = createWindow(W, {
      now: (() => {
        let t = 0;
        return () => (t += 100);
      })(),
    });
    while (!sliced.advance(1)) slices++;
    expect(slices).toBe(W.departSteps - 1);
    const b = sliced.result();
    for (const k of ['c3', 'vinf', 'total', 'cellStatus'])
      expect(
        Buffer.from(b[k].buffer).equals(Buffer.from(whole[k].buffer))
      ).toBe(true);
    expect(b.best).toEqual(whole.best);
    expect(w).toBeTruthy();
  });

  test("the Worker's answer is the direct one", async () => {
    const out = [];
    await handle({ type: 'window', id: 'w', options: W }, m => out.push(m));
    const r = out.find(m => m.type === 'result').result;
    const direct = computeWindow(W);
    expect(Array.from(r.total)).toEqual(Array.from(direct.total));
    const msgs = [];
    const problem = {
      kind: 'lambert',
      body: 'earth',
      r1: [7000, 0, 0],
      r2: [0, 8000, 0],
      tof: 2000,
    };
    await handle({ type: 'solve', id: 1, problem }, m => msgs.push(m));
    expect(msgs[0].result).toEqual(solve(problem));
  });
});

describe('performance', () => {
  test('a Lambert solve costs under 2 ms of CPU, here in Jest', () => {
    const list = problems(1000, 9, 3600);
    const t0 = cpu();
    for (const p of list) lambert(p);
    expect((cpu() - t0) / list.length).toBeLessThan(2);
  });

  test('a 40 by 40 window costs under 8 s of CPU, here in Jest', () => {
    const t0 = cpu();
    const r = computeWindow({
      from: 'earth',
      to: 'mars',
      departStart: 9000,
      departSpan: 780,
      departSteps: 40,
      tofMin: 100,
      tofMax: 500,
      tofSteps: 40,
    });
    expect(cpu() - t0).toBeLessThan(8000);
    expect(r.counts.ok).toBeGreaterThan(1500);
    expect(r.maxIterations).toBeLessThanOrEqual(MAX_ITERATIONS);
  });
});

describe('the reference cases', () => {
  test('every case has a source, a reason and a kind', () => {
    for (const c of CASES) {
      expect(['textbook', 'analytic', 'independent']).toContain(c.kind);
      expect(c.source.length).toBeGreaterThan(40);
      expect(c.why.length).toBeGreaterThan(40);
    }
    expect(new Set(CASES.map(c => c.id)).size).toBe(CASES.length);
  });

  test.each(CASES.map(c => [c.id, c]))(
    '%s is within every tolerance',
    (_id, c) => {
      const measures = runCase(c);
      expect(measures.filter(m => !m.ok)).toEqual([]);
      expect(measures.length).toBeGreaterThan(0);
    }
  );

  test('a measure outside its tolerance fails', () => {
    expect(passes({ value: 1.1, expected: 1, tolerance: 0.05 })).toBe(false);
    expect(passes({ value: NaN, expected: 0, tolerance: 1 })).toBe(false);
    expect(passes({ value: 'ok', expected: 'ok', tolerance: 0 })).toBe(true);
  });
});

describe('the Worker protocol', () => {
  test('hello, a solve, a refusal and an unknown message', async () => {
    const out = [];
    const post = m => out.push(m);
    await handle({ type: 'hello' }, post);
    await handle(
      {
        type: 'solve',
        id: 1,
        problem: {
          kind: 'hohmann',
          body: 'earth',
          r1: 6678.137,
          r2: 42164.137,
        },
      },
      post
    );
    await handle(
      {
        type: 'solve',
        id: 2,
        problem: { kind: 'hohmann', body: 'pluto', r1: 1, r2: 2 },
      },
      post
    );
    await handle({ type: 'solve', id: 3, problem: { kind: 'warp' } }, post);
    await handle({ type: 'launch', id: 4 }, post);
    expect(out[0]).toEqual({ type: 'hello', api: MISSION_API });
    expect(out[1].result.total).toBeCloseTo(3.8926, 4);
    expect(out[2]).toMatchObject({
      type: 'refused',
      problems: [{ code: 'body' }],
    });
    expect(out[3]).toMatchObject({
      type: 'refused',
      problems: [{ code: 'kind' }],
    });
    expect(out[4].type).toBe('error');
  });

  test('a window is canceled between slices, and stops at its wall-clock limit', async () => {
    const big = {
      from: 'earth',
      to: 'mars',
      departStart: 9000,
      departSpan: 700,
      departSteps: 200,
      tofMin: 100,
      tofMax: 500,
      tofSteps: 200,
    };
    const out = [];
    const running = handle({ type: 'window', id: 'c', options: big }, m =>
      out.push(m)
    );
    await new Promise(ok => setTimeout(ok, 50));
    await handle({ type: 'cancel', id: 'c' }, () => {});
    await running;
    const canceled = out.find(m => m.type === 'result').result;
    expect(canceled.status).toBe('canceled');
    expect(canceled.rows).toBeLessThan(200);
    const out2 = [];
    let t = 0;
    await handle(
      { type: 'window', id: 't', options: big, limits: { maxWallMs: 100 } },
      m => out2.push(m),
      () => (t += 40)
    );
    expect(out2.find(m => m.type === 'result').result.status).toBe('timeLimit');
    const out3 = [];
    await handle(
      { type: 'window', id: 'x', options: { ...big, tofSteps: 201 } },
      m => out3.push(m)
    );
    expect(out3[0]).toMatchObject({
      type: 'refused',
      problems: [{ code: 'cells' }],
    });
  });

  test('the client refuses another major version, and terminate ends the Worker', async () => {
    const fake = api => () => {
      const w = {
        terminated: false,
        terminate() {
          w.terminated = true;
        },
        postMessage(m) {
          if (m.type === 'hello')
            Promise.resolve().then(() =>
              w.onmessage({ data: { type: 'hello', api } })
            );
        },
      };
      return w;
    };
    await expect(
      createMission({ spawn: fake('2.0.0') }).solve({}).done
    ).rejects.toMatchObject({ code: 'api' });
    const r = createMission({ spawn: fake('1.0.0') }).solve({});
    r.terminate();
    await expect(r.done).rejects.toMatchObject({ code: 'terminated' });
  });
});

describe('the plan file', () => {
  const inputs = {
    body: 'earth',
    altitude1: 300,
    altitude2: 35786,
    units: 'km',
  };
  const result = solve({
    kind: 'hohmann',
    body: 'earth',
    r1: 6678.137,
    r2: 42164.137,
  });

  test('keeps inputs, model and derived apart, and says what it is not for', () => {
    const plan = planFile('hohmann', inputs, result, {
      bodies: ['earth'],
      version: MISSION_API,
    });
    expect(plan.format).toBe(PLAN_FORMAT);
    expect(plan.notFor).toBe(NOT_FOR);
    expect(plan.inputs).toEqual(inputs);
    expect(plan.model.bodies.earth.GM).toBe(BODIES.earth.GM);
    expect(plan.model.approximations).toContain('impulsive');
    expect(plan.derived.total).toBe(result.total);
    expect(plan.budget.rows.map(r => r.burn)).toEqual([1, 2]);
    expect(plan.budget.total).toBeCloseTo(result.total, 14);
    expect(plan.timeline.map(e => e.event)).toEqual(['burn', 'burn', 'arrive']);
  });

  test('the same plan is the same bytes, and has no clock in it', () => {
    const a = planBytes(planFile('hohmann', inputs, result));
    expect(planBytes(planFile('hohmann', inputs, result))).toBe(a);
    expect(a).not.toMatch(/20\d\d-\d\d-\d\dT/);
    expect(JSON.parse(a).generator).toBe('Gravitas mission core');
  });

  test('non-finite numbers are written as null, never as a number', () => {
    const plan = planFile(
      'lambert',
      { tof: 1 },
      { z: NaN, a: Infinity, v1: [1, NaN, 2], burns: [] }
    );
    expect(plan.derived).toEqual({
      z: null,
      a: null,
      v1: [1, null, 2],
      burns: [],
    });
  });
});

describe('what the core does not claim', () => {
  test('MISSION.md lists the supported and unsupported transfer classes', () => {
    const doc = readFileSync('MISSION.md', 'utf8');
    for (const heading of [
      '## Supported transfer classes',
      '## Not supported',
      '## Reference residuals',
    ])
      expect(doc).toContain(heading);
    expect(doc).toContain('not operational mission design or navigation');
  });

  test('a sphere of influence is Laplace’s', () => {
    expect(sphereOfInfluence('earth') / 924649).toBeCloseTo(1, 5);
    expect(circularOrbit('earth').r).toBeCloseTo(BODIES.earth.a * AU, 3);
    expect(DAY).toBe(86400);
    expect(CELL_STATUS[0]).toBe('ok');
  });
});

describe('the page\u2019s words', () => {
  const page = readFileSync('js/missionPage.js', 'utf8');
  const html = readFileSync('mission/index.html', 'utf8');
  const holes = s => [...s.matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort();

  test('English and Spanish have the same ids, and the same placeholders in each', () => {
    expect(Object.keys(ES_MISSION).sort()).toEqual(
      Object.keys(EN_MISSION).sort()
    );
    for (const id of Object.keys(EN_MISSION))
      expect([id, holes(ES_MISSION[id])]).toEqual([id, holes(EN_MISSION[id])]);
  });

  test('every id the page names is in the catalog, including the ones it builds', () => {
    const ids = new Set([
      ...[...page.matchAll(/\bt\(\s*'([^']+)'/g)].map(m => m[1]),
      ...[...html.matchAll(/data-i18n(?:-[a-z-]+)?="([^"]+)"/g)].map(m => m[1]),
    ]);
    // Built from a value: every value it can have.
    const built = {
      'mission.refused': [
        'input',
        'sameOrbit',
        'intermediate',
        'belowSurface',
        'outOfPlane',
        'revolutions',
        ...CELL_STATUS.slice(1),
      ],
      'mission.cell': CELL_STATUS,
      'mission.problem': [
        'input',
        'kind',
        'body',
        'planet',
        'samePlanet',
        'value',
        'steps',
        'cells',
      ],
      'mission.bodyName': Object.keys(BODIES),
      'mission.event': ['wait', 'burn', 'meet', 'arrive', 'depart', 'capture'],
      'mission.kind': ['textbook', 'analytic', 'independent'],
      'mission.conic': ['ellipse', 'hyperbola', 'parabola'],
      'mission.branch': ['short', 'long'],
      'mission.direction': ['prograde', 'retrograde'],
      'mission.window': ['ok', 'canceled', 'timeLimit'],
    };
    for (const [prefix, values] of Object.entries(built))
      for (const v of values) ids.add(`${prefix}.${v}`);
    for (const id of ids) expect([id, id in EN_MISSION]).toEqual([id, true]);
    // What the Worker can refuse with, and the solvers' codes, are all worded.
    for (const c of CASES)
      expect(`mission.kind.${c.kind}` in EN_MISSION).toBe(true);
  });
});
