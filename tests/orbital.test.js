import { describe, test, expect } from '@jest/globals';
import {
  orbitalElements,
  dominantPrimary,
  pairEnergy,
  createPeriodTimer,
} from '../js/orbital.js';

// A star heavy enough that the orbiter's own mass is negligible, so the
// textbook two-body results apply cleanly.
const star = (mass = 1000) => ({
  pos: { x: 0, y: 0 },
  vel: { x: 0, y: 0 },
  mass,
});

/** A body on an exactly circular orbit of radius r. */
const circular = (r, G, M, m = 0) => ({
  pos: { x: r, y: 0 },
  vel: { x: 0, y: Math.sqrt((G * (M + m)) / r) },
  mass: m,
});

describe('orbitalElements', () => {
  const G = 2;
  const M = 1000;

  test('a circular orbit has zero eccentricity and a = r', () => {
    const el = orbitalElements(circular(200, G, M), star(M), G);
    expect(el.e).toBeCloseTo(0, 6);
    expect(el.a).toBeCloseTo(200, 6);
    expect(el.periapsis).toBeCloseTo(200, 5);
    expect(el.apoapsis).toBeCloseTo(200, 5);
    expect(el.bound).toBe(true);
  });

  test('the period matches the textbook expression', () => {
    const r = 320;
    const el = orbitalElements(circular(r, G, M), star(M), G);
    const expected = 2 * Math.PI * Math.sqrt(r ** 3 / (G * M));
    expect(el.period).toBeCloseTo(expected, 6);
  });

  test("obeys Kepler's third law across a wide range of radii", () => {
    // The whole Kepler investigation rests on this ratio being constant.
    const ratios = [50, 120, 400, 1500, 6000].map(r => {
      const el = orbitalElements(circular(r, G, M), star(M), G);
      return el.period ** 2 / el.a ** 3;
    });
    for (const k of ratios) expect(k).toBeCloseTo(ratios[0], 9);
  });

  test('escape speed is sqrt(2) times circular speed', () => {
    // The numeric answer the energy investigation asks students to find.
    const el = orbitalElements(circular(250, G, M), star(M), G);
    expect(el.escapeSpeed / el.v).toBeCloseTo(Math.SQRT2, 6);
  });

  test('an elliptical orbit reports the right shape', () => {
    // Launch at periapsis with 1.2x circular speed.
    const rp = 100;
    const vc = Math.sqrt((G * M) / rp);
    const body = { pos: { x: rp, y: 0 }, vel: { x: 0, y: 1.2 * vc }, mass: 0 };
    const el = orbitalElements(body, star(M), G);
    // v = k*vc at periapsis gives e = k^2 - 1.
    expect(el.e).toBeCloseTo(1.2 ** 2 - 1, 6);
    expect(el.periapsis).toBeCloseTo(rp, 5);
    expect(el.apoapsis).toBeGreaterThan(el.periapsis);
    expect(el.bound).toBe(true);
  });

  test('marks a fast body as unbound', () => {
    const r = 100;
    const vEsc = Math.sqrt((2 * G * M) / r);
    const body = { pos: { x: r, y: 0 }, vel: { x: 0, y: vEsc * 1.1 }, mass: 0 };
    const el = orbitalElements(body, star(M), G);
    expect(el.bound).toBe(false);
    expect(el.e).toBeGreaterThan(1);
    expect(el.energy).toBeGreaterThan(0);
    expect(el.period).toBe(Infinity);
  });

  test('a body at exactly escape speed has zero energy', () => {
    const r = 100;
    const body = {
      pos: { x: r, y: 0 },
      vel: { x: 0, y: Math.sqrt((2 * G * M) / r) },
      mass: 0,
    };
    expect(orbitalElements(body, star(M), G).energy).toBeCloseTo(0, 9);
  });

  test('counts both masses, not just the primary', () => {
    // For an equal-mass pair, ignoring the secondary is a factor-of-2 error in
    // mu and so a 41% error in the period.
    const r = 200;
    const heavy = orbitalElements(circular(r, G, M, M), star(M), G);
    const light = orbitalElements(circular(r, G, M, 0), star(M), G);
    expect(heavy.mu).toBeCloseTo(2 * light.mu, 6);
  });

  test('is measured relative to a moving primary', () => {
    // A pair drifting together is still a circular orbit; measuring against a
    // stationary frame would report it as unbound.
    const drift = 40;
    const moving = { pos: { x: 0, y: 0 }, vel: { x: drift, y: 0 }, mass: M };
    const body = circular(200, G, M);
    body.vel.x += drift;
    const el = orbitalElements(body, moving, G);
    expect(el.e).toBeCloseTo(0, 6);
    expect(el.bound).toBe(true);
  });

  test('rejects unusable input rather than returning nonsense', () => {
    expect(orbitalElements(null, star(), 2)).toBeNull();
    expect(orbitalElements(circular(100, 2, 1000), null, 2)).toBeNull();
    expect(orbitalElements(circular(100, 2, 1000), star(), 0)).toBeNull();
    // Coincident bodies: separation zero, no orbit defined.
    const same = { pos: { x: 0, y: 0 }, vel: { x: 0, y: 0 }, mass: 1 };
    expect(orbitalElements(same, star(), 2)).toBeNull();
  });
});

describe('dominantPrimary', () => {
  test('picks the strongest attractor, not the nearest or heaviest', () => {
    const body = { pos: { x: 100, y: 0 }, vel: { x: 0, y: 0 }, mass: 1 };
    // A moon belonging to its planet: the star is 1000x heavier but 100x
    // further, and pull goes as m/d^2, so 500/1^2 beats 1e6/100^2.
    const star_ = { pos: { x: 0, y: 0 }, mass: 1e6, alive: true };
    const planet = { pos: { x: 101, y: 0 }, mass: 500, alive: true };
    expect(dominantPrimary(body, [star_, planet])).toBe(planet);

    // Move the moon far from the planet and the star takes over.
    const distant = { pos: { x: 40, y: 0 }, vel: { x: 0, y: 0 }, mass: 1 };
    expect(dominantPrimary(distant, [star_, planet])).toBe(star_);
  });

  test('ignores the body itself and dead bodies', () => {
    const body = { pos: { x: 0, y: 0 }, mass: 5 };
    const dead = { pos: { x: 1, y: 0 }, mass: 1e9, alive: false };
    const real = { pos: { x: 100, y: 0 }, mass: 1000, alive: true };
    expect(dominantPrimary(body, [body, dead, real])).toBe(real);
  });

  test('returns null when there is nothing to orbit', () => {
    expect(dominantPrimary({ pos: { x: 0, y: 0 } }, [])).toBeNull();
    expect(dominantPrimary(null, [star()])).toBeNull();
  });
});

describe('pairEnergy', () => {
  const G = 2;
  const M = 1000;

  test('a bound orbit has negative total energy', () => {
    const body = circular(200, G, M, 3);
    const e = pairEnergy(body, star(M), G);
    expect(e.kinetic).toBeGreaterThan(0);
    expect(e.potential).toBeLessThan(0);
    expect(e.total).toBeLessThan(0);
  });

  test('total energy is half the potential on a circular orbit', () => {
    // The virial result, which holds in the limit where the orbiting mass is
    // negligible: pairEnergy takes the potential from the primary alone, while
    // a circular speed uses G(M+m), so a heavy orbiter departs from it by m/M.
    const light = pairEnergy(circular(200, G, M, 1e-9), star(M), G);
    expect(light.total).toBeCloseTo(light.potential / 2, 6);

    // A 0.3% orbiter shows a 0.3% departure, and not more.
    const heavy = pairEnergy(circular(200, G, M, 3), star(M), G);
    const departure = Math.abs(
      (heavy.total - heavy.potential / 2) / (heavy.potential / 2)
    );
    expect(departure).toBeCloseTo(3 / M, 4);
  });

  test('an escaping body has non-negative total energy', () => {
    const r = 150;
    const body = {
      pos: { x: r, y: 0 },
      vel: { x: 0, y: Math.sqrt((2 * G * M) / r) },
      mass: 2,
    };
    expect(pairEnergy(body, star(M), G).total).toBeCloseTo(0, 6);
  });
});

describe('createPeriodTimer', () => {
  test('times a full period between periapsis passages', () => {
    const timer = createPeriodTimer();
    // Separation oscillating with period 10.
    let closed = null;
    for (let t = 0; t <= 40; t += 0.5) {
      const r = 100 + 50 * Math.cos((2 * Math.PI * t) / 10);
      const p = timer.sample(r, t);
      if (p !== null) closed = p;
    }
    expect(closed).toBeCloseTo(10, 0);
    expect(timer.count()).toBeGreaterThanOrEqual(2);
    expect(timer.mean()).toBeCloseTo(10, 0);
  });

  test('reports nothing before a full orbit has closed', () => {
    const timer = createPeriodTimer();
    expect(timer.sample(100, 0)).toBeNull();
    expect(timer.sample(90, 1)).toBeNull();
    expect(timer.mean()).toBeNull();
    expect(timer.count()).toBe(0);
  });

  test('ignores non-finite samples', () => {
    const timer = createPeriodTimer();
    expect(timer.sample(NaN, 1)).toBeNull();
    expect(timer.sample(100, Infinity)).toBeNull();
  });

  test('reset clears the history', () => {
    const timer = createPeriodTimer();
    for (let t = 0; t <= 30; t += 0.5) {
      timer.sample(100 + 50 * Math.cos((2 * Math.PI * t) / 10), t);
    }
    expect(timer.count()).toBeGreaterThan(0);
    timer.reset();
    expect(timer.count()).toBe(0);
    expect(timer.mean()).toBeNull();
  });
});
