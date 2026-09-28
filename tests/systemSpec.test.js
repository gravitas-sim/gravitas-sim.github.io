import { describe, test, expect } from '@jest/globals';

import * as P from '../js/physics.js';
import {
  BUILDER_TYPES,
  SYSTEM_TYPES,
  SYSTEM_FORMAT,
  SYSTEM_VERSION,
  keplerState,
  validateSystem,
  buildSystem,
  defaultRadius,
  constructorMass,
  simMass,
  secondsPerTimeUnit,
  systemSeed,
  systemToFile,
  systemFromFile,
  initialStateMatches,
  holmanWiegert,
} from '../js/systemSpec.js';
import {
  criticalSemiMajorSType,
  criticalSemiMajorPType,
} from '../js/binaryStability.js';
import { orbitalElements, createPeriodTimer } from '../js/orbital.js';
import { binaryLayout } from '../js/binaryOrbits.js';
import { setSimGravitationalConstant, timeUnitSeconds } from '../js/units.js';
import { withSeed } from '../js/rng.js';

// =============================================================================
// The Orbital System Builder's arithmetic
// -----------------------------------------------------------------------------
// js/systemSpec.js turns orbital elements into the positions and
// velocities the integrator starts from. Held here to four things: the
// analytic two-body orbit, its own inverse (every orbit read back out of the
// finished state, many systems over), the two ways the shipped scenarios
// build a binary, and the real engine - a built system has to go round with
// the period Kepler's third law gives it, not merely start with zero momentum,
// which is true of any velocities at all.
// =============================================================================

const G = 2;
const AU = 100;

/** A system from a compact description; the root is the first body. */
const system = bodies => {
  const verdict = validateSystem({ bodies });
  if (!verdict.ok) {
    throw new Error(JSON.stringify(verdict.errors));
  }
  return { verdict, built: buildSystem(verdict.bodies, { G }) };
};

const SUN = { name: 'Sun', type: 'Star', mass: 1 };

describe('one Keplerian orbit', () => {
  const mu = G * 1000;

  test('a circular orbit has the circular speed and turns prograde', () => {
    const s = keplerState({ a: 100, e: 0, omegaDeg: 0, phaseDeg: 0, mu });
    expect(Math.hypot(s.pos.x, s.pos.y)).toBeCloseTo(100, 12);
    expect(Math.hypot(s.vel.x, s.vel.y)).toBeCloseTo(Math.sqrt(mu / 100), 12);
    expect(s.pos.x * s.vel.y - s.pos.y * s.vel.x).toBeGreaterThan(0);
  });

  test('retrograde is the mirror image across the periapsis line', () => {
    const el = { a: 150, e: 0.4, omegaDeg: 30, phaseDeg: 70, mu };
    const pro = keplerState(el);
    const retro = keplerState({ ...el, retrograde: true });
    const h = s => s.pos.x * s.vel.y - s.pos.y * s.vel.x;
    expect(h(retro)).toBeCloseTo(-h(pro), 9);
    // Same distance and speed, because it is the same orbit reflected.
    expect(Math.hypot(retro.pos.x, retro.pos.y)).toBeCloseTo(
      Math.hypot(pro.pos.x, pro.pos.y),
      9
    );
  });

  test.each([0.1, 0.5, 0.9, 0.99])(
    'e = %p starts at periapsis along omega, and at apoapsis half a turn later',
    e => {
      const a = 200;
      const peri = keplerState({ a, e, omegaDeg: 40, phaseDeg: 0, mu });
      const r = Math.hypot(peri.pos.x, peri.pos.y);
      expect(r / (a * (1 - e))).toBeCloseTo(1, 12);
      expect(Math.atan2(peri.pos.y, peri.pos.x)).toBeCloseTo(
        (40 * Math.PI) / 180,
        12
      );
      // Vis-viva at periapsis.
      expect(Math.hypot(peri.vel.x, peri.vel.y)).toBeCloseTo(
        Math.sqrt((mu * (1 + e)) / (a * (1 - e))),
        9
      );
      const apo = keplerState({ a, e, omegaDeg: 40, phaseDeg: 180, mu });
      expect(Math.hypot(apo.pos.x, apo.pos.y) / (a * (1 + e))).toBeCloseTo(
        1,
        12
      );
    }
  );
});

describe('the construction', () => {
  test('a star and a planet share a barycenter at rest at the origin', () => {
    const { built } = system([
      SUN,
      { name: 'Jupiter', type: 'GasGiant', mass: 1, primary: 0, a: 5.2 },
    ]);
    const [star, planet] = built.bodies;
    const m = star.simMass + planet.simMass;
    // Each at the other's share of the separation, on opposite sides.
    expect(star.pos.x).toBeCloseTo((-5.2 * AU * planet.simMass) / m, 10);
    expect(planet.pos.x).toBeCloseTo((5.2 * AU * star.simMass) / m, 10);
    const px = star.simMass * star.vel.x + planet.simMass * planet.vel.x;
    const py = star.simMass * star.vel.y + planet.simMass * planet.vel.y;
    expect(Math.hypot(px, py)).toBeLessThan(1e-12);
    expect(built.orbits[0].reflexA).toBeCloseTo(
      (5.2 * AU * planet.simMass) / m,
      10
    );
  });

  test('every orbit reads back out of the finished state, over many systems', () => {
    // A seeded spread of hierarchical systems: a root star, planets round it,
    // moons round some of the planets, with every element drawn at random.
    let worst = { a: 0, e: 0, omega: 0, momentum: 0, barycenter: 0 };
    withSeed(20260927, () => {
      for (let trial = 0; trial < 200; trial++) {
        const bodies = [{ ...SUN, mass: 0.2 + Math.random() }];
        const count = 1 + Math.floor(Math.random() * 5);
        for (let k = 0; k < count; k++) {
          bodies.push({
            type: Math.random() < 0.5 ? 'Planet' : 'GasGiant',
            mass: 0.5 + Math.random() * 5,
            primary: 0,
            a: 0.3 + Math.random() * 30,
            e: Math.random() * 0.95,
            omega: Math.random() * 360,
            phase: Math.random() * 360,
            retrograde: Math.random() < 0.2,
          });
        }
        const planetCount = bodies.length;
        for (let k = 1; k < planetCount; k++) {
          if (Math.random() < 0.4) {
            bodies.push({
              type: 'Planet',
              mass: 0.01 + Math.random() * 0.1,
              primary: k,
              a: 0.001 + Math.random() * 0.01,
              e: Math.random() * 0.5,
              omega: Math.random() * 360,
              phase: Math.random() * 360,
              retrograde: Math.random() < 0.5,
            });
          }
        }
        const verdict = validateSystem({ bodies: bodies.slice(0, 12) });
        expect(verdict.errors).toEqual([]);
        const { residuals } = buildSystem(verdict.bodies, { G });
        for (const k of Object.keys(worst)) {
          worst[k] = Math.max(worst[k], residuals[k]);
        }
      }
    });
    // The numbers the PR reports, as bounds with room over what was measured.
    expect(worst.a).toBeLessThan(1e-11);
    expect(worst.e).toBeLessThan(1e-11);
    expect(worst.omega).toBeLessThan(1e-6);
    expect(worst.momentum).toBeLessThan(1e-13);
    expect(worst.barycenter).toBeLessThan(1e-13);
  });

  test('companions of one primary are built innermost first, each round everything inside it', () => {
    const { built } = system([
      SUN,
      { name: 'Outer', type: 'GasGiant', mass: 1, primary: 0, a: 10 },
      { name: 'Inner', type: 'Planet', mass: 1, primary: 0, a: 1 },
      { name: 'Moon', type: 'Planet', mass: 0.0123, primary: 2, a: 0.01 },
    ]);
    const order = built.orbits.map(o => o.index);
    // The moon is placed with its planet, and the inner planet before the
    // outer one whatever order they were listed in.
    expect(order).toEqual([3, 2, 1]);
    const outer = built.orbits.find(o => o.index === 1);
    expect(outer.inner.sort()).toEqual([0, 2, 3]);
    const sun = built.bodies[0].simMass;
    const inner = built.bodies[2].simMass + built.bodies[3].simMass;
    expect(outer.innerMass).toBeCloseTo(sun + inner, 9);
  });

  test('the Earth-Moon pair reads back as the entered orbit, not one round the Sun', () => {
    const { built } = system([
      SUN,
      { name: 'Earth', type: 'Planet', mass: 1, primary: 0, a: 1, e: 0.0167 },
      {
        name: 'Moon',
        type: 'Planet',
        mass: 0.0123,
        primary: 1,
        a: 0.00257,
        e: 0.055,
        omega: 90,
      },
    ]);
    const [, earth, moon] = built.bodies;
    const el = orbitalElements(
      { pos: moon.pos, vel: moon.vel, mass: moon.simMass },
      { pos: earth.pos, vel: earth.vel, mass: earth.simMass },
      G
    );
    expect(el.a / (0.00257 * AU)).toBeCloseTo(1, 10);
    expect(el.e).toBeCloseTo(0.055, 10);
  });

  test('the same system is the same seed, and a different one is not', () => {
    const a = validateSystem({
      bodies: [SUN, { type: 'Planet', mass: 1, primary: 0, a: 1 }],
    }).bodies;
    const b = validateSystem({
      bodies: [SUN, { type: 'Planet', mass: 1, primary: 0, a: 1.0001 }],
    }).bodies;
    expect(systemSeed(a)).toBe(systemSeed(JSON.parse(JSON.stringify(a))));
    expect(systemSeed(a)).not.toBe(systemSeed(b));
    expect(Number.isInteger(systemSeed(a))).toBe(true);
  });
});

describe('against the shipped binaries', () => {
  test('the Binary Star System scenario is 1.2 and 0.8 suns, 1.2 AU apart, retrograde', () => {
    // js/world/build.js builds this pair by hand at the scenario's G of 1.2.
    const G_SCENARIO = 1.2;
    const verdict = validateSystem({
      bodies: [
        { type: 'Star', mass: 1.2 },
        { type: 'Star', mass: 0.8, primary: 0, a: 1.2, retrograde: true },
      ],
    });
    const built = buildSystem(verdict.bodies, { G: G_SCENARIO });
    const SEP = 120;
    const M1 = 1200;
    const M2 = 800;
    const vRel = Math.sqrt((G_SCENARIO * (M1 + M2)) / SEP);
    const [s1, s2] = built.bodies;
    expect(s1.pos.x).toBeCloseTo((-SEP * M2) / (M1 + M2), 10);
    expect(s2.pos.x).toBeCloseTo((SEP * M1) / (M1 + M2), 10);
    expect(s1.vel.y).toBeCloseTo((vRel * M2) / (M1 + M2), 10);
    expect(s2.vel.y).toBeCloseTo((-vRel * M1) / (M1 + M2), 10);
    expect(Math.abs(s1.vel.x) + Math.abs(s2.vel.x)).toBeLessThan(1e-12);
  });

  test.each([0, 180, 63])(
    'the binary labs (js/binaryOrbits.js), eccentric, at mean anomaly %p',
    meanDeg => {
      // binaryLayout takes a true anomaly; the builder takes a mean one.
      const e = 0.4;
      const M = (meanDeg * Math.PI) / 180;
      let E = M;
      for (let i = 0; i < 50; i++)
        E -= (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
      const nu =
        2 *
        Math.atan2(
          Math.sqrt(1 + e) * Math.sin(E / 2),
          Math.sqrt(1 - e) * Math.cos(E / 2)
        );
      const lab = binaryLayout({
        m1: 1000,
        m2: 500,
        separation: 80,
        eccentricity: e,
        phaseDeg: (nu * 180) / Math.PI,
        G,
      });
      const { built } = system([
        { type: 'Star', mass: 1 },
        { type: 'Star', mass: 0.5, primary: 0, a: 0.8, e, phase: meanDeg },
      ]);
      const [s1, s2] = built.bodies;
      for (const [ours, theirs] of [
        [s1, lab.star1],
        [s2, lab.star2],
      ]) {
        expect(ours.pos.x).toBeCloseTo(theirs.pos.x, 9);
        expect(ours.pos.y).toBeCloseTo(theirs.pos.y, 9);
        expect(ours.vel.x).toBeCloseTo(theirs.vel.x, 9);
        expect(ours.vel.y).toBeCloseTo(theirs.vel.y, 9);
      }
    }
  );
});

describe('periods', () => {
  test('a year at one AU round one sun, at any gravitational constant', () => {
    for (const g of [1, 2, 9000]) {
      const verdict = validateSystem({
        bodies: [SUN, { type: 'Planet', mass: 1e-3, primary: 0, a: 1 }],
      });
      const built = buildSystem(verdict.bodies, { G: g });
      // Sidereal year, to the precision of the constants the app carries.
      expect(built.orbits[0].periodDays / 365.256).toBeCloseTo(1, 2);
    }
  });

  test('the time unit is the one js/units.js uses for the same constant', () => {
    for (const g of [1, 2, 9000]) {
      setSimGravitationalConstant(g);
      expect(secondsPerTimeUnit(g) / timeUnitSeconds()).toBeCloseTo(1, 12);
    }
    setSimGravitationalConstant(2);
  });
});

describe('what is refused', () => {
  const errorKeys = bodies => validateSystem({ bodies }).errors.map(e => e.key);

  test('an unbound orbit is named as one', () => {
    expect(
      errorKeys([SUN, { type: 'Planet', mass: 1, primary: 0, a: 1, e: 1 }])
    ).toContain('builder.error.unbound');
  });

  test('a primary that comes later, or does not exist', () => {
    expect(
      errorKeys([SUN, { type: 'Planet', mass: 1, primary: 1, a: 1 }])
    ).toContain('builder.error.primary');
    expect(
      errorKeys([SUN, { type: 'Planet', mass: 1, primary: 7, a: 1 }])
    ).toContain('builder.error.primary');
  });

  test('a star heavy enough to collapse on the first step', () => {
    const errors = validateSystem({
      bodies: [{ type: 'Star', mass: 25 }, SUN],
    }).errors;
    expect(errors.find(e => e.key === 'builder.error.massRange')).toBeTruthy();
    expect(BUILDER_TYPES.Star.max).toBe(P.MAX_STAR_MASS_BEFORE_BH);
  });

  test('a black hole among stars, which the engine cannot integrate', () => {
    expect(
      errorKeys([
        { type: 'BlackHole', mass: 10 },
        { type: 'Star', mass: 1, primary: 0, a: 1 },
      ])
    ).toContain('builder.error.mixedBlackHoles');
    // Black holes on their own are fine.
    expect(
      errorKeys([
        { type: 'BlackHole', mass: 10 },
        { type: 'BlackHole', mass: 5, primary: 0, a: 1 },
      ])
    ).toEqual([]);
  });

  test('a typed radius on a black hole, which a restore would recompute', () => {
    expect(
      errorKeys([
        { type: 'BlackHole', mass: 10, radius: 3 },
        { type: 'BlackHole', mass: 5, primary: 0, a: 1 },
      ])
    ).toContain('builder.error.blackHoleRadius');
  });

  test('no asteroid and no comet', () => {
    expect(SYSTEM_TYPES).not.toContain('Asteroid');
    expect(SYSTEM_TYPES).not.toContain('Comet');
    expect(
      errorKeys([SUN, { type: 'Comet', mass: 1, primary: 0, a: 1 }])
    ).toContain('builder.error.type');
  });

  test('bodies touching at the start stop the build', () => {
    const { built } = system([
      SUN,
      { type: 'Planet', mass: 1, primary: 0, a: 0.05 },
    ]);
    expect(built.checks.map(c => [c.level, c.key])).toContainEqual([
      'error',
      'builder.check.overlap',
    ]);
  });
});

describe('the cautions', () => {
  test('carry the same Holman-Wiegert fits as js/binaryStability.js', () => {
    for (let mu = 0.05; mu <= 0.95; mu += 0.05) {
      for (let e = 0; e <= 0.85; e += 0.05) {
        for (const [ours, theirs] of [
          [holmanWiegert.sType(mu, e), criticalSemiMajorSType(mu, e)],
          [holmanWiegert.pType(mu, e), criticalSemiMajorPType(mu, e)],
        ]) {
          expect(ours.a).toBe(theirs.a);
          expect(ours.inRange).toBe(theirs.inRange);
        }
      }
    }
  });

  const keys = bodies => system(bodies).built.checks.map(c => c.key);

  test('a periapsis inside touching distance', () => {
    expect(
      keys([SUN, { type: 'Planet', mass: 1, primary: 0, a: 0.5, e: 0.9 }])
    ).toContain('builder.check.contact');
  });

  test("a moon outside its planet's Hill sphere, and one far inside it", () => {
    const planet = { type: 'Planet', mass: 1, primary: 0, a: 1 };
    const moon = a => ({
      type: 'Planet',
      mass: 0.01,
      primary: 1,
      a,
      radius: 0.01,
    });
    expect(keys([SUN, { ...planet, radius: 0.01 }, moon(0.02)])).toContain(
      'builder.check.hillOutside'
    );
    const quiet = keys([SUN, { ...planet, radius: 0.01 }, moon(0.001)]);
    expect(quiet).not.toContain('builder.check.hillOutside');
    expect(quiet).not.toContain('builder.check.hillWide');
  });

  test('two orbits that cross', () => {
    expect(
      keys([
        SUN,
        { type: 'Planet', mass: 1, primary: 0, a: 1, e: 0.6 },
        { type: 'Planet', mass: 1, primary: 0, a: 1.5 },
      ])
    ).toContain('builder.check.crossing');
  });

  test('a planet inside a binary’s unstable zone (Holman and Wiegert, P-type)', () => {
    const binary = [
      { type: 'Star', mass: 1 },
      { type: 'Star', mass: 0.5, primary: 0, a: 1, e: 0.2 },
    ];
    expect(
      keys([...binary, { type: 'Planet', mass: 1, primary: 0, a: 2 }])
    ).toContain('builder.check.circumbinary');
    expect(
      keys([...binary, { type: 'Planet', mass: 1, primary: 0, a: 6 }])
    ).not.toContain('builder.check.circumbinary');
  });

  test('a planet too far from its star with a companion star outside it (S-type)', () => {
    const withPlanet = a => [
      { type: 'Star', mass: 1 },
      { type: 'Planet', mass: 1, primary: 0, a },
      { type: 'Star', mass: 0.5, primary: 0, a: 20, e: 0.3 },
    ];
    expect(keys(withPlanet(6))).toContain('builder.check.circumstellar');
    expect(keys(withPlanet(1))).not.toContain('builder.check.circumstellar');
  });

  test('a stellar triple too compact to be hierarchical (Mardling and Aarseth)', () => {
    const triple = a => [
      { type: 'Star', mass: 1 },
      { type: 'Star', mass: 0.8, primary: 0, a: 1 },
      { type: 'Star', mass: 0.6, primary: 0, a },
    ];
    expect(keys(triple(2))).toContain('builder.check.triple');
    expect(keys(triple(10))).not.toContain('builder.check.triple');
  });

  test('two giant planets closer than Gladman’s spacing', () => {
    const pair = a => [
      SUN,
      { type: 'GasGiant', mass: 5, primary: 0, a: 5 },
      { type: 'GasGiant', mass: 5, primary: 0, a },
    ];
    expect(keys(pair(5.5))).toContain('builder.check.spacing');
    expect(keys(pair(9))).not.toContain('builder.check.spacing');
  });

  test('a quiet system has nothing to say', () => {
    expect(
      keys([
        SUN,
        { type: 'Planet', mass: 1, primary: 0, a: 1 },
        { type: 'GasGiant', mass: 1, primary: 0, a: 5.2, e: 0.05 },
      ])
    ).toEqual([]);
  });
});

describe('the file', () => {
  const bodies = [
    SUN,
    {
      name: 'Earth',
      type: 'Planet',
      mass: 1,
      primary: 0,
      a: 1,
      e: 0.0167,
      omega: 102.9,
      phase: 40,
    },
  ];

  test('round-trips through JSON and rebuilds the same initial state', () => {
    const { verdict, built } = system(bodies);
    const file = JSON.parse(
      JSON.stringify(systemToFile(verdict.bodies, built))
    );
    expect(file.format).toBe(SYSTEM_FORMAT);
    expect(file.version).toBe(SYSTEM_VERSION);
    const read = systemFromFile(file);
    expect(read.ok).toBe(true);
    const again = validateSystem(read.system);
    expect(again.ok).toBe(true);
    const rebuilt = buildSystem(again.bodies, { G });
    expect(initialStateMatches(file, rebuilt)).toBe(true);
    expect(systemSeed(again.bodies)).toBe(systemSeed(verdict.bodies));
  });

  test('a changed number in the recorded state is noticed', () => {
    const { verdict, built } = system(bodies);
    const file = systemToFile(verdict.bodies, built);
    file.initial.bodies[1].vx *= 1.001;
    expect(initialStateMatches(file, built)).toBe(false);
  });

  test('a newer version, or another kind of file, is refused', () => {
    expect(
      systemFromFile({ format: SYSTEM_FORMAT, version: 2, bodies: [] })
    ).toEqual({
      ok: false,
      key: 'builder.file.newer',
      vars: { version: 2 },
    });
    expect(
      systemFromFile({ format: 'gravitas.experiment', version: 1 }).ok
    ).toBe(false);
    expect(systemFromFile(null).ok).toBe(false);
  });
});

describe('the classes', () => {
  test.each(SYSTEM_TYPES)(
    '%s is built with the radius and mass the builder expects',
    type => {
      const mass = BUILDER_TYPES[type].placeholder;
      const at = { x: 0, y: 0 };
      const v = { x: 0, y: 0 };
      const Ctor = {
        Star: P.StarObject,
        WhiteDwarf: P.WhiteDwarf,
        NeutronStar: P.NeutronStar,
        GasGiant: P.GasGiant,
        Planet: P.Planet,
      }[type];
      const body =
        type === 'BlackHole'
          ? new P.BlackHole(at, constructorMass(type, mass), v, true)
          : type === 'NeutronStar'
            ? new Ctor(at, v, constructorMass(type, mass), null)
            : new Ctor(at, v, constructorMass(type, mass));
      expect(body.mass / simMass(type, mass)).toBeCloseTo(1, 12);
      expect(body.radius / defaultRadius(type, mass)).toBeCloseTo(1, 12);
    }
  );
});

describe('in the engine', () => {
  const LISTS = [
    'bh_list',
    'planets',
    'stars',
    'gas_giants',
    'asteroids',
    'comets',
    'debris',
    'particles',
    'neutron_stars',
    'white_dwarfs',
    'galaxies',
  ];

  /** Put a built system into the real engine, as js/ui.js does. */
  function install(built) {
    for (const key of LISTS) if (Array.isArray(P[key])) P[key].length = 0;
    P.resetPhysicsObjectCounter();
    P.updatePhysicsSettings({
      ...built.settings,
      enable_star_merging: false,
      use_barnes_hut: false,
      galaxy_gravity: 'newtonian',
      dark_matter_halo: false,
    });
    P.setStateReference({
      frame_count: 0,
      zoom: 1,
      pan: { x: 0, y: 0 },
      paused: false,
    });
    const made = built.bodies.map(b => {
      const pos = { ...b.pos };
      const vel = { ...b.vel };
      const m = b.constructorMass;
      const obj =
        b.type === 'Star'
          ? new P.StarObject(pos, vel, m)
          : b.type === 'Planet'
            ? new P.Planet(pos, vel, m)
            : new P.GasGiant(pos, vel, m);
      obj.persistent = true;
      obj.radius = b.radius;
      ({ Star: P.stars, Planet: P.planets, GasGiant: P.gas_giants })[
        b.type
      ].push(obj);
      return obj;
    });
    P.bumpWorldGeneration();
    return made;
  }

  test('an eccentric planet goes round in the period Kepler gives it', () => {
    const { built } = system([
      SUN,
      {
        type: 'Planet',
        mass: 1,
        primary: 0,
        a: 1,
        e: 0.3,
        omega: 25,
        radius: 0.5,
      },
    ]);
    const [star, planet] = install(built);
    const orbit = built.orbits[0];
    const dt = built.settings.max_timestep;
    const timer = createPeriodTimer();
    const periods = [];
    let q = Infinity;
    let Q = 0;
    for (let t = 0; t < 3.2 * orbit.period; t += dt) {
      P.updatePhysics(dt);
      const r = Math.hypot(
        planet.pos.x - star.pos.x,
        planet.pos.y - star.pos.y
      );
      q = Math.min(q, r);
      Q = Math.max(Q, r);
      const closed = timer.sample(r, t + dt);
      if (closed) periods.push(closed);
    }
    expect(periods.length).toBeGreaterThanOrEqual(2);
    for (const p of periods) expect(p / orbit.period).toBeCloseTo(1, 2);
    // Both turning points, which a wrong speed would move.
    expect(q / orbit.periapsis).toBeCloseTo(1, 2);
    expect(Q / orbit.apoapsis).toBeCloseTo(1, 2);
  });

  test('a hierarchical system keeps its barycenter where it was built', () => {
    const { built } = system([
      SUN,
      { type: 'GasGiant', mass: 1, primary: 0, a: 1, radius: 1 },
      { type: 'Planet', mass: 0.1, primary: 1, a: 0.02, radius: 0.05 },
      { type: 'GasGiant', mass: 0.3, primary: 0, a: 2.5, e: 0.1, radius: 1 },
    ]);
    expect(built.checks.filter(c => c.level === 'error')).toEqual([]);
    const bodies = install(built);
    const total = bodies.reduce((m, b) => m + b.mass, 0);
    const dt = built.settings.max_timestep;
    const steps = Math.ceil(built.orbits.at(-1).period / dt);
    P.updatePhysics(dt);
    for (let i = 0; i < steps; i++) P.updatePhysics(dt);
    const cx = bodies.reduce((s, b) => s + b.mass * b.pos.x, 0) / total;
    const cy = bodies.reduce((s, b) => s + b.mass * b.pos.y, 0) / total;
    // A few per cent of a unit across 250 AU of orbit: the integrator's
    // momentum error, not a barycenter that was moving from the start.
    expect(Math.hypot(cx, cy)).toBeLessThan(1e-6 * 250);
    expect(bodies.every(b => b.alive !== false)).toBe(true);
  });
});
