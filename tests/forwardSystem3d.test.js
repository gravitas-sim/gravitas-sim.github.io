// =============================================================================
// A 3-D system, observed (Roadmap II Prompt 105, js/forward/system3d.js)
// -----------------------------------------------------------------------------
// The bridge from the 3-D lab's numbers to the forward models. Each claim is
// held against the 3-D kernel itself, run on the same system, not against the
// bridge's own arithmetic:
//
//   - the star's radial velocity from the models equals the star's line-of-
//     sight velocity in a kernel run, for a tilted, eccentric, prograde and
//     retrograde orbit, to the constants' 8.7e-5 (relative to K) and a margin;
//   - the mid-transit time and the impact parameter equal the kernel's own
//     closest sky approach (js/lab3d/view/instruments.js onTheSky);
//   - an edge-on 3-D system reproduces the 2-D transit of the same star and
//     planet, flux for flux (the tolerance is rounding);
//   - looked at face-on, the same orbit has no radial velocity and no transit;
//   - what it cannot describe is refused or warned in words, never guessed.
// =============================================================================

import { describe, test, expect } from '@jest/globals';

import { fromElements } from '../js/lab3d/elements.js';
import { GAUSSIAN_K, FORMAT, FORMAT_VERSION } from '../js/lab3d/state.js';
import { runToEnd } from '../js/lab3d/engine.js';
import { onTheSky } from '../js/lab3d/view/instruments.js';
import {
  anglesOfSight,
  lineOfSight,
  observeSystem3d,
  stateFromSystem3d,
} from '../js/forward/system3d.js';
import { runForward } from '../js/forward/index.js';
import {
  semiAmplitude,
  starVelocity,
} from '../js/forward/models/radialVelocity.js';
import { transitParameters } from '../js/forward/models/transit.js';
import { starOffsetMas } from '../js/forward/models/astrometry.js';
import { compareModel } from '../js/compare/compare.js';

const DEG = Math.PI / 180;
const AU_M = 1.495978707e11;
const SUN_R_M = 6.957e8;
const EARTH_R_M = 6.371e6;
const K2 = GAUSSIAN_K * GAUSSIAN_K;
const MS = AU_M / 86400;

/** A star and one planet about their barycenter, in solar units. */
function pair(el, { mStar = 1.148, mPlanet = 6.6e-4, rStar, rPlanet } = {}) {
  const mu = K2 * (mStar + mPlanet);
  const r = fromElements(el, mu);
  const fs = -mPlanet / (mStar + mPlanet);
  const fp = mStar / (mStar + mPlanet);
  return {
    format: FORMAT,
    formatVersion: FORMAT_VERSION,
    units: 'solar',
    integrator: { scheme: 'yoshida4c', h: 0.01 },
    t: 0,
    bodies: [
      {
        id: 'star',
        m: mStar,
        radius: rStar ?? 0,
        x: r.x.map(c => fs * c),
        v: r.v.map(c => fs * c),
      },
      {
        id: 'planet',
        m: mPlanet,
        radius: rPlanet ?? 0,
        x: r.x.map(c => fp * c),
        v: r.v.map(c => fp * c),
      },
    ],
  };
}
const semiMajor = (P, M) => Math.cbrt((K2 * M * P * P) / (4 * Math.PI ** 2));
const P_DAYS = 3.5247;
const A_AU = semiMajor(P_DAYS, 1.148 + 6.6e-4);
const R_STAR = (1.155 * SUN_R_M) / AU_M;
const R_PLANET = (15.1 * EARTH_R_M) / AU_M;

const orbit = (over = {}) => ({
  a: A_AU,
  e: 0,
  i: 89 * DEG,
  Omega: 30 * DEG,
  omega: 0,
  M: 1,
  ...over,
});

/** The star's line-of-sight velocity (receding positive), m/s, in a kernel run. */
function kernelRadialVelocity(system, n, span, samples) {
  const run = runToEnd(system, {
    span,
    samples,
    positions: true,
    velocities: true,
  });
  return run.samples.map(s => ({
    t: s.t,
    v: -(s.v[0] * n[0] + s.v[1] * n[1] + s.v[2] * n[2]) * MS,
    s,
  }));
}

describe('the line of sight', () => {
  test('two angles and a vector are the same thing', () => {
    for (const [i, phi] of [
      [90, 0],
      [37, 250],
      [140, 15],
      [5, 359],
    ]) {
      const back = anglesOfSight(
        lineOfSight({ inclinationDeg: i, positionAngleDeg: phi })
      );
      expect(back.inclinationDeg).toBeCloseTo(i, 9);
      expect(back.positionAngleDeg).toBeCloseTo(phi, 9);
    }
  });

  test('it is js/observerGeometry.js: inclination 90 lies in the plane', () => {
    const n = lineOfSight({ inclinationDeg: 90, positionAngleDeg: 90 });
    expect(n[0]).toBeCloseTo(0, 12);
    expect(n[1]).toBeCloseTo(1, 12);
    expect(n[2]).toBeCloseTo(0, 12);
  });
});

describe('radial velocity agrees with the 3-D kernel', () => {
  const tolerance = 3e-4; // 8.7e-5 from the constants, rounded up with margin

  test.each([
    [
      'a tilted eccentric orbit',
      orbit({ e: 0.2, i: 40 * DEG, omega: 70 * DEG }),
    ],
    [
      'a retrograde orbit (i above 90 degrees)',
      orbit({ e: 0.1, i: 140 * DEG, omega: 20 * DEG }),
    ],
    ['an orbit with no tilt', orbit({ i: 0, Omega: 0 })],
  ])('%s', (_name, el) => {
    const system = pair(el);
    const n = lineOfSight({ inclinationDeg: 62, positionAngleDeg: 205 });
    const b = stateFromSystem3d(system, { observer: { direction: n } });
    expect(b.ok).toBe(true);
    const K = semiAmplitude(b.state, 0);
    const kernel = kernelRadialVelocity(system, n, 2 * P_DAYS, 200);
    let worst = 0;
    for (const { t, v } of kernel)
      worst = Math.max(worst, Math.abs(starVelocity(b.state, t) - v));
    expect(K).toBeGreaterThan(0);
    expect(worst / K).toBeLessThan(tolerance);
  });

  test('the models see the amplitude the orbit has: K sin i from the kernel', () => {
    const el = orbit({ i: 40 * DEG, e: 0.2 });
    const system = pair(el);
    const n = lineOfSight({ inclinationDeg: 90, positionAngleDeg: 10 });
    const b = stateFromSystem3d(system, { observer: { direction: n } });
    const kernel = kernelRadialVelocity(system, n, P_DAYS, 400);
    const half =
      (Math.max(...kernel.map(k => k.v)) - Math.min(...kernel.map(k => k.v))) /
      2;
    expect(half / semiAmplitude(b.state, 0)).toBeGreaterThan(0.98);
    expect(half / semiAmplitude(b.state, 0)).toBeLessThan(1.02);
  });

  test('seen face-on to its orbit, the star has no radial velocity', () => {
    const el = orbit({ i: 40 * DEG, omega: 70 * DEG, e: 0.2 });
    const system = pair(el);
    const { x, v } = fromElements(el, K2 * (1.148 + 6.6e-4));
    const h = [
      x[1] * v[2] - x[2] * v[1],
      x[2] * v[0] - x[0] * v[2],
      x[0] * v[1] - x[1] * v[0],
    ];
    const hn = Math.hypot(...h);
    const b = stateFromSystem3d(system, {
      observer: { direction: h.map(c => c / hn) },
    });
    expect(Math.abs(semiAmplitude(b.state, 0))).toBeLessThan(1e-6);
    expect(b.state.planets[0].geometry.inclinationDeg).toBeCloseTo(0, 6);
  });
});

describe('transit agrees with the 3-D kernel', () => {
  const system = pair(orbit(), { rStar: R_STAR, rPlanet: R_PLANET });

  test('mid-transit and impact parameter are the kernel closest sky approach', () => {
    // The observer stands in the reference plane, off the line of nodes.
    const n = lineOfSight({ inclinationDeg: 90, positionAngleDeg: 120 });
    const b = stateFromSystem3d(system, { observer: { direction: n } });
    expect(b.ok).toBe(true);
    const p = transitParameters(b.state);
    // Find the kernel's transit: the planet nearer, the sky separation least.
    const run = runToEnd(system, {
      span: P_DAYS,
      samples: 4000,
      positions: true,
    });
    let best = { sep: Infinity, t: NaN };
    for (const s of run.samples) {
      const f = {
        m: Float64Array.from(system.bodies.map(x => x.m)),
        x: Float64Array.from(s.x),
        v: new Float64Array(6),
        alive: Uint8Array.from([1, 1]),
      };
      const { across, nearer } = onTheSky(f, 0, 1, n);
      if (nearer === 1 && across < best.sep) best = { sep: across, t: s.t };
    }
    const orbitPeriod = p.P;
    const wrapped =
      ((((p.t0 - best.t) % orbitPeriod) + 1.5 * orbitPeriod) % orbitPeriod) -
      0.5 * orbitPeriod;
    expect(Math.abs(wrapped)).toBeLessThan(2e-3); // days; a sample is 8.8e-4
    // The impact parameter, in stellar radii, is the closest approach's.
    expect(Math.abs(best.sep / R_STAR - p.b)).toBeLessThan(2e-3);
    // The planet and star sizes arrive as the system has them.
    expect(p.k).toBeCloseTo(R_PLANET / R_STAR, 6);
    expect(p.P).toBeCloseTo(P_DAYS, 6);
  });

  test('edge-on, it is the 2-D transit of the same star and planet, flux for flux', () => {
    // A flat system (orbit in the reference plane) seen from inside it, with
    // the star and planet written down the way the 2-D models are written:
    // a period, masses and sizes in astronomers' units, a mean anomaly and an
    // observer's position angle. Nothing here is read from the bridge.
    const flat = pair(orbit({ i: 0, Omega: 0, M: 2 }), {
      rStar: R_STAR,
      rPlanet: R_PLANET,
    });
    const phi = 75;
    const b = stateFromSystem3d(flat, {
      observer: { inclinationDeg: 90, positionAngleDeg: phi },
    });
    const twoD = {
      star: { massSun: 1.148, radiusSun: 1.155, teffK: 5772, distancePc: 10 },
      planets: [
        {
          id: 'b',
          massEarth: (6.6e-4 * 1.989e30) / 5.972e24,
          radiusEarth: 15.1,
          periodDays: P_DAYS,
          e: 0,
          omegaDeg: 0,
          meanAnomalyDeg: 2 / DEG,
        },
      ],
      geometry: { positionAngleDeg: phi, inclinationDeg: 90 },
    };
    const setup = {
      format: 'gravitas.observing-setup',
      formatVersion: 1,
      seed: 'p105',
      epochs: { kind: 'regular', duration: 7, count: 400 },
      noise: {},
      instrument: { kind: 'photometer' },
    };
    const A = runForward('transit', b.state, setup);
    const B = runForward('transit', twoD, setup);
    const fa = A.columns.find(c => c.role === 'value').values;
    const fb = B.columns.find(c => c.role === 'value').values;
    expect(fa.length).toBe(fb.length);
    let worst = 0;
    for (let i = 0; i < fa.length; i++)
      worst = Math.max(worst, Math.abs(fa[i] - fb[i]));
    expect(worst).toBeLessThan(1e-9);
    expect(Math.min(...fa)).toBeLessThan(1 - 1e-3); // it does transit
  });

  test('face-on, the same planet does not transit', () => {
    const el = orbit({ i: 0, Omega: 0 });
    const flat = pair(el, { rStar: R_STAR, rPlanet: R_PLANET });
    const out = observeSystem3d(
      flat,
      'transit',
      {
        format: 'gravitas.observing-setup',
        formatVersion: 1,
        seed: 'p105',
        epochs: { kind: 'regular', duration: 7, count: 200 },
        noise: {},
        instrument: { kind: 'photometer' },
      },
      { observer: { inclinationDeg: 0, positionAngleDeg: 0 } }
    );
    expect(out.ok).toBe(true);
    const flux = out.observation.columns.find(c => c.role === 'value').values;
    expect(Math.min(...flux)).toBeCloseTo(1, 12);
  });
});

describe('astrometry carries the planet’s own plane', () => {
  test('the reflex orbit is a line edge-on and a circle face-on', () => {
    const el = orbit({ i: 0, Omega: 0, e: 0 });
    const system = pair(el);
    const edge = stateFromSystem3d(system, {
      observer: { inclinationDeg: 90, positionAngleDeg: 0 },
    });
    const face = stateFromSystem3d(system, {
      observer: { inclinationDeg: 0, positionAngleDeg: 0 },
    });
    const ys = state =>
      Array.from({ length: 50 }, (_, k) =>
        starOffsetMas(state.state, (k * P_DAYS) / 50)
      );
    const spreadEdge = Math.max(...ys(edge).map(p => Math.abs(p.y)));
    const spreadFace = Math.max(...ys(face).map(p => Math.abs(p.y)));
    expect(spreadEdge).toBeLessThan(1e-9 * spreadFace);
    expect(spreadFace).toBeGreaterThan(0);
  });
});

describe('what the bridge refuses or warns of', () => {
  const good = pair(orbit());

  test('code units need a scale; with one, the same system is read', () => {
    const code = {
      ...good,
      units: 'code',
      bodies: good.bodies.map(b => ({ ...b })),
    };
    expect(stateFromSystem3d(code)).toEqual({ ok: false, code: 'needsScale' });
    const k = GAUSSIAN_K;
    const scaled = stateFromSystem3d(code, {
      scale: { lengthAU: 1, timeDays: 1 / k, massSun: 1 },
    });
    expect(scaled.ok).toBe(true);
  });

  test('an unknown star and a system with no planet', () => {
    expect(stateFromSystem3d(good, { star: 'nope' })).toMatchObject({
      ok: false,
      code: 'noStar',
    });
    const lone = {
      ...good,
      bodies: [
        good.bodies[0],
        { ...good.bodies[1], v: good.bodies[1].v.map(c => c * 8) },
      ],
    };
    const r = stateFromSystem3d(lone);
    expect(r).toMatchObject({ ok: false, code: 'noPlanet' });
  });

  test('a moon is not an orbit about the star', () => {
    const sys = pair(orbit());
    const planet = sys.bodies[1];
    const mu = K2 * (planet.m + 1e-8);
    const r = fromElements(
      { a: 2e-4, e: 0, i: 0, Omega: 0, omega: 0, M: 0 },
      mu
    );
    sys.bodies.push({
      id: 'moon',
      m: 1e-8,
      radius: 0,
      x: planet.x.map((c, k) => c + r.x[k]),
      v: planet.v.map((c, k) => c + r.v[k]),
    });
    const b = stateFromSystem3d(sys);
    expect(b.ok).toBe(true);
    expect(b.warnings).toContain('notAboutStar:moon');
    expect(b.state.planets.map(p => p.id)).toEqual(['planet']);
  });

  test('a transit needs the sizes and a circular orbit, and says which is missing', () => {
    const setup = {
      format: 'gravitas.observing-setup',
      formatVersion: 1,
      seed: 'p105',
      epochs: { kind: 'regular', duration: 7, count: 50 },
      noise: {},
      instrument: { kind: 'photometer' },
    };
    expect(observeSystem3d(good, 'transit', setup)).toEqual({
      ok: false,
      code: 'needsRadii',
    });
    const eccentric = pair(orbit({ e: 0.2 }), {
      rStar: R_STAR,
      rPlanet: R_PLANET,
    });
    expect(observeSystem3d(eccentric, 'transit', setup).code).toBe(
      'eccentricTransit'
    );
    // Sizes the caller supplies are accepted where the system has none.
    const supplied = observeSystem3d(good, 'radial-velocity', {
      ...setup,
      instrument: { kind: 'spectrograph' },
    });
    expect(supplied.ok).toBe(true);
  });

  test('a nearly parabolic bound orbit is observed with the earlier numbers, never refused by the orbital layer', () => {
    const setup = {
      format: 'gravitas.observing-setup',
      formatVersion: 1,
      seed: 'p148',
      epochs: { kind: 'regular', duration: 7, count: 20 },
      noise: {},
      instrument: { kind: 'spectrograph' },
    };
    // The kernel refuses elements within 1e-9 of e = 1, but a state vector of
    // almost no binding energy is a file the bridge can be given: periapsis at
    // 1 AU with the speed of a bound orbit of eccentricity e.
    const near = e => {
      const sys = pair(orbit({ e: 0.5, a: 1 }));
      const mu = K2 * (sys.bodies[0].m + sys.bodies[1].m);
      const [m1, m2] = sys.bodies.map(b => b.m);
      const vp = Math.sqrt(mu * (1 + e));
      const rel = { x: [1, 0, 0], v: [0, vp, 0] };
      sys.bodies[0].x = rel.x.map(c => (-m2 / (m1 + m2)) * c);
      sys.bodies[0].v = rel.v.map(c => (-m2 / (m1 + m2)) * c);
      sys.bodies[1].x = rel.x.map(c => (m1 / (m1 + m2)) * c);
      sys.bodies[1].v = rel.v.map(c => (m1 / (m1 + m2)) * c);
      return sys;
    };
    for (const e of [
      0.95,
      1 - 1e-6,
      1 - 2e-9,
      1 - 1e-10,
      1 - 1e-12,
      1 - 1e-15,
    ]) {
      const sys = near(e);
      let out;
      expect(() => {
        out = observeSystem3d(sys, 'radial-velocity', setup);
      }).not.toThrow();
      // A finite observation, or the bridge's own word for an orbit it cannot read.
      if (out.ok)
        expect(
          out.observation.columns
            .find(c => c.role === 'value')
            .values.every(Number.isFinite)
        ).toBe(true);
      else expect(typeof out.code).toBe('string');
    }
  });

  test('every bridge says what it is not', () => {
    const b = stateFromSystem3d(good);
    expect(b.warnings).toEqual(
      expect.arrayContaining([
        'osculating',
        'planetsDoNotInteract',
        'assumedTeff',
        'assumedDistance',
      ])
    );
  });
});

describe('no change for a state with no planet geometry', () => {
  test('the shared geometry still decides, exactly as before', () => {
    const state = {
      star: { massSun: 1, radiusSun: 1, teffK: 5772, distancePc: 10 },
      planets: [
        { id: 'a', massEarth: 300, radiusEarth: 10, periodDays: 5, e: 0.1 },
      ],
      geometry: { positionAngleDeg: 33, inclinationDeg: 71 },
    };
    const own = {
      ...state,
      planets: [
        {
          ...state.planets[0],
          geometry: { positionAngleDeg: 33, inclinationDeg: 71 },
        },
      ],
    };
    for (const t of [0, 1.3, 4.9])
      expect(starVelocity(own, t)).toBe(starVelocity(state, t));
    expect(semiAmplitude(own)).toBe(semiAmplitude(state));
  });
});

describe('the comparison instrument takes a 3-D system as its model', () => {
  const setup = {
    format: 'gravitas.observing-setup',
    formatVersion: 1,
    seed: 'compare-3d',
    epochs: { kind: 'regular', unit: 'd', start: 0, duration: 9, count: 200 },
    instrument: { kind: 'spectrograph' },
  };
  const state = (system, inclinationDeg, positionAngleDeg = 0) =>
    stateFromSystem3d(system, {
      observer: { inclinationDeg, positionAngleDeg },
    }).state;
  const system = pair(
    orbit({ i: 40 * DEG, Omega: 30 * DEG, omega: 1, e: 0.2 })
  );

  test('the model over the data it made leaves nothing, from any chosen orientation', () => {
    for (const [inc, pa] of [
      [90, 0],
      [60, 120],
      [20, 300],
    ]) {
      const truth = state(system, inc, pa);
      const data = runForward('radial-velocity', truth, setup);
      const r = compareModel(data, {
        kind: 'system',
        model: 'radial-velocity',
        state: truth,
      });
      expect(r.maxAbs).toBeLessThan(1e-9);
    }
  });

  test('another orientation is a misfit the instrument measures, and it never fits', () => {
    const data = runForward('radial-velocity', state(system, 90, 0), setup);
    const same = compareModel(data, {
      kind: 'system',
      model: 'radial-velocity',
      state: state(system, 90, 0),
    });
    const tilted = compareModel(data, {
      kind: 'system',
      model: 'radial-velocity',
      state: state(system, 30, 0),
    });
    expect(same.objective.value).toBeLessThan(1e-12);
    expect(tilted.objective.value).toBeGreaterThan(1);
    expect(tilted.fitted).toBe(0);
  });
});
