// The orbit geometry overlay's science checks (a), (b), (d) and (e), against
// the bounds committed in tests/fixtures/orbit-geometry-tolerances.json before
// the module existed. (c) is in tests/orbitGeometryEccentric.test.js.
import { describe, test, expect, beforeAll } from '@jest/globals';
import { readFileSync } from 'node:fs';
import {
  orbitGeometry,
  CURVE_POINTS,
  markerPoints,
  markerAt,
  toggleMarker,
  MARKERS,
} from '../js/orbitGeometry.js';
import { orbitalElements } from '../js/orbital.js';
import { twoBodyModel } from '../js/twoBodyModel.js';

const TOL = JSON.parse(
  readFileSync(
    new URL('./fixtures/orbit-geometry-tolerances.json', import.meta.url),
    'utf8'
  )
);

const ONE_WAY = {
  gravitational_constant: 1,
  mutual_gravity: false,
  star_only_gravity: false,
  bh_behavior: 'Orbiting',
  softening: 5,
  mondA0: 0,
  haloAt: null,
};

/**
 * A state on a known orbit, built from the eccentric anomaly: the independent
 * construction (a) compares against. Relative to a primary at `c`.
 */
function stateOn({ a, e, omega, sense, E0, mu, c, cv }) {
  const b = a * Math.sqrt(1 - e * e);
  const n = Math.sqrt(mu / (a * a * a));
  const Edot = n / (1 - e * Math.cos(E0));
  const px = a * (Math.cos(E0) - e);
  const py = sense * b * Math.sin(E0);
  const vx = -a * Math.sin(E0) * Edot;
  const vy = sense * b * Math.cos(E0) * Edot;
  const co = Math.cos(omega);
  const si = Math.sin(omega);
  return {
    pos: { x: c.x + px * co - py * si, y: c.y + px * si + py * co },
    vel: { x: cv.x + vx * co - vy * si, y: cv.y + vx * si + vy * co },
  };
}

/** The point at true anomaly nu, through the eccentric anomaly. */
function pointAtNu({ a, e, omega, sense, c }, nu) {
  const b = a * Math.sqrt(1 - e * e);
  const E =
    2 *
    Math.atan2(
      Math.sqrt(1 - e) * Math.sin(nu / 2),
      Math.sqrt(1 + e) * Math.cos(nu / 2)
    );
  const px = a * (Math.cos(E) - e);
  const py = sense * b * Math.sin(E);
  const co = Math.cos(omega);
  const si = Math.sin(omega);
  return { x: c.x + px * co - py * si, y: c.y + px * si + py * co };
}

const dist = (p, q) => Math.hypot(p.x - q.x, p.y - q.y);

function cases() {
  const out = [];
  for (const e of TOL.a.eccentricities)
    for (const deg of TOL.a.orientationsDeg)
      for (const sense of TOL.a.senses)
        for (const E0 of e === 0 ? [0] : [0.3, 2.1, 4.4])
          out.push({ e, omega: (deg * Math.PI) / 180, sense, E0 });
  return out;
}

describe('(a) and (b): exact formulas against an eccentric-anomaly construction', () => {
  const c = { x: 123.4, y: -56.7 };
  const cv = { x: 0.013, y: -0.021 };
  const a = 143;
  const all = cases();
  let worst = { a: 0, curve: 0, foci: 0, apsides: 0, focal: 0, e: 0 };

  beforeAll(() => {
    for (const k of all) {
      const orbit = { a, ...k, c };
      const s = stateOn({ ...orbit, mu: 1, cv });
      const body = { kind: 'Planet', mass: 0.1, ...s };
      const primary = { kind: 'StarObject', mass: 1, pos: c, vel: cv };
      const g = orbitGeometry(body, [primary], ONE_WAY);
      expect(g.ok).toBe(true);
      worst.a = Math.max(worst.a, Math.abs(g.a - a) / a);
      worst.e = Math.max(worst.e, Math.abs(g.e - k.e));
      for (let i = 0; i < CURVE_POINTS; i++) {
        const nu = (2 * Math.PI * i) / CURVE_POINTS;
        worst.curve = Math.max(
          worst.curve,
          dist(g.points[i], pointAtNu(orbit, nu)) / a
        );
        const d1 = dist(g.points[i], g.foci['focus-primary']);
        const d2 = dist(g.points[i], g.foci['focus-empty']);
        worst.focal = Math.max(worst.focal, Math.abs(d1 + d2 - 2 * a) / a);
      }
      const u = { x: Math.cos(k.omega), y: Math.sin(k.omega) };
      worst.foci = Math.max(
        worst.foci,
        dist(g.foci['focus-primary'], c) / a,
        dist(g.foci['focus-empty'], {
          x: c.x - 2 * a * k.e * u.x,
          y: c.y - 2 * a * k.e * u.y,
        }) / a
      );
      worst.apsides = Math.max(
        worst.apsides,
        dist(g.apsides.periapsis, {
          x: c.x + a * (1 - k.e) * u.x,
          y: c.y + a * (1 - k.e) * u.y,
        }) / a,
        dist(g.apsides.apoapsis, {
          x: c.x - a * (1 + k.e) * u.x,
          y: c.y - a * (1 + k.e) * u.y,
        }) / a
      );
    }
    // The table the handoff quotes.
    console.log(
      `orbit geometry (a)/(b) over ${all.length} orbits: ` +
        Object.entries(worst)
          .map(([k, v]) => `${k} ${v.toExponential(2)}`)
          .join(', ')
    );
  });

  test('a, e, foci, apsides and every curve point agree to 1e-9 of a', () => {
    const tol = TOL.a.relativeToA;
    expect(worst.a).toBeLessThanOrEqual(tol);
    expect(worst.e).toBeLessThanOrEqual(tol);
    expect(worst.foci).toBeLessThanOrEqual(tol);
    expect(worst.apsides).toBeLessThanOrEqual(tol);
    expect(worst.curve).toBeLessThanOrEqual(tol);
  });

  test('(b) every curve point is 2a from the two foci together, to 1e-9 of a', () => {
    expect(worst.focal).toBeLessThanOrEqual(TOL.b.relativeToA);
  });

  test('the curve turns with the angular momentum', () => {
    const orbit = { a, e: 0.5, omega: 0.4, E0: 1, c };
    for (const sense of [1, -1]) {
      const s = stateOn({ ...orbit, sense, mu: 1, cv });
      const g = orbitGeometry(
        { kind: 'Planet', mass: 0.1, ...s },
        [{ kind: 'StarObject', mass: 1, pos: c, vel: cv }],
        ONE_WAY
      );
      const p0 = g.points[0];
      const p1 = g.points[1];
      const cross = (p0.x - c.x) * (p1.y - c.y) - (p0.y - c.y) * (p1.x - c.x);
      expect(Math.sign(cross)).toBe(sense);
    }
  });
});

describe('(d) the one-way circle, as the overlay reads it', () => {
  const star = {
    kind: 'StarObject',
    mass: 1,
    pos: { x: 0, y: 0 },
    vel: { x: 0, y: 0 },
  };
  const planet = {
    kind: 'Planet',
    mass: 0.1,
    pos: { x: 100, y: 0 },
    vel: { x: 0, y: 0.1 },
  };

  test('a = 100 and e = 0 to 1e-9; the default mu still gives 91.67 and 0.0909', () => {
    const g = orbitGeometry(planet, [star], ONE_WAY);
    expect(g.ok).toBe(true);
    expect(g.model.pairClass).toBe('one-way');
    expect(Math.abs(g.a - 100) / 100).toBeLessThanOrEqual(
      TOL.d.overlayRelativeToA
    );
    expect(g.e).toBeLessThanOrEqual(TOL.d.overlayRelativeToA);
    const old = orbitalElements(planet, star, 1);
    expect(
      Math.abs(old.a - TOL.d.defaultMuExpected.a) / old.a
    ).toBeLessThanOrEqual(TOL.d.defaultMuExpected.tolerance);
    expect(Math.abs(old.e - TOL.d.defaultMuExpected.e)).toBeLessThanOrEqual(
      TOL.d.defaultMuExpected.tolerance
    );
  });
});

describe('(e) no curve where the force is not inverse-square', () => {
  const pair = (r, v) => ({
    body: {
      kind: 'StarObject',
      mass: 0.1,
      pos: { x: r, y: 0 },
      vel: { x: 0, y: v },
    },
    primary: {
      kind: 'StarObject',
      mass: 1,
      pos: { x: 0, y: 0 },
      vel: { x: 0, y: 0 },
    },
  });

  test('reciprocal stars at r = 1 inside a softening length of 5', () => {
    const { body, primary } = pair(1, 1);
    const m = twoBodyModel(body, primary, ONE_WAY);
    expect(m.pairClass).toBe('mutual');
    const g = orbitGeometry(body, [primary], ONE_WAY);
    expect(g.ok).toBe(false);
    expect(g.reason).toBe('softened');
    expect(g.softening).toBe(5);
  });

  test('the same pair at r = 10 whose point-mass periapsis is 1.111', () => {
    const { body, primary } = pair(10, Math.sqrt(2.2) / 10);
    const el = orbitalElements(body, primary, 1, 1.1);
    expect(el.periapsis).toBeCloseTo(10 / 9, 9);
    expect(el.r).toBe(10);
    const g = orbitGeometry(body, [primary], ONE_WAY);
    expect(g.ok).toBe(false);
    expect(g.reason).toBe('softened');
  });

  test('a MOND world draws no curve', () => {
    const { body, primary } = pair(100, 0.1);
    const g = orbitGeometry(body, [primary], { ...ONE_WAY, mondA0: 1e-9 });
    expect(g.ok).toBe(false);
    expect(g.reason).toBe('mond');
  });

  test('an unbound body and a primary that does not pull draw no curve', () => {
    const { body, primary } = pair(100, 1);
    expect(orbitGeometry(body, [primary], ONE_WAY).reason).toBe('unbound');
    const comet = { ...primary, kind: 'Comet' };
    expect(orbitGeometry(body, [comet], ONE_WAY).reason).toBe('none');
  });
});

describe('markers', () => {
  test('a hidden part takes its markers with it', () => {
    const g = orbitGeometry(
      {
        kind: 'Planet',
        mass: 0,
        pos: { x: 100, y: 0 },
        vel: { x: 0, y: 0.12 },
      },
      [
        {
          kind: 'StarObject',
          mass: 1,
          pos: { x: 0, y: 0 },
          vel: { x: 0, y: 0 },
        },
      ],
      ONE_WAY
    );
    expect(Object.keys(markerPoints(g, { foci: true, apsides: true }))).toEqual(
      MARKERS
    );
    expect(
      Object.keys(markerPoints(g, { foci: false, apsides: true }))
    ).toEqual(['periapsis', 'apoapsis']);
  });

  test('a press within half the target size hits, nearest first', () => {
    const m = { periapsis: { x: 0, y: 0 }, apoapsis: { x: 30, y: 0 } };
    expect(markerAt(m, { x: 11, y: 0 }, 24)).toBe('periapsis');
    expect(markerAt(m, { x: 13, y: 0 }, 24)).toBe(null);
    expect(markerAt(m, { x: 21, y: 0 }, 44)).toBe('apoapsis');
  });

  test('two selected at most; a third replaces the oldest', () => {
    let s = toggleMarker([], 'periapsis');
    s = toggleMarker(s, 'apoapsis');
    expect(s).toEqual(['periapsis', 'apoapsis']);
    expect(toggleMarker(s, 'focus-empty')).toEqual(['apoapsis', 'focus-empty']);
    expect(toggleMarker(s, 'periapsis')).toEqual(['apoapsis']);
  });
});
