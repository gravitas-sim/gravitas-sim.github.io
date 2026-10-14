// =============================================================================
// Declarative scenario geometry (Roadmap II Prompt 108, slices 1 to 3)
// Slice 4 is held in tests/scenarioGeometrySlice4.test.js.
// -----------------------------------------------------------------------------
// Twenty-two built-in scenarios are no longer placed by code in js/world/build.js:
// SCENARIO_GEOMETRY (js/scenarios.js) declares their bodies, and this holds the
// declaration to the world the code made.
//
//   1. Every construct has a validator that accepts what it should and names
//      the field it refuses (validateGeometry, js/scenarioPack.js).
//   2. The arithmetic of each construct is the textbook's, checked against the
//      closed forms (circular speed, periapsis speed, the barycentric pair)
//      and not only against the code it replaced.
//   3. The world each converted scenario builds is the world the code built,
//      body for body and field for field, at seven seeds, with the generator in
//      the same place in its sequence afterwards.
//      tests/fixtures/scenarioGeometryGolden.json was made from the hand-built
//      blocks before they were deleted (tests/scenarioDigest.js); the
//      Playwright world golden (e2e/golden/world-construction.json) holds the
//      same scenarios in the browser at its own seed.
//   4. A pack can carry the geometry a pack may carry, and builds the same
//      bodies as the built-in does, every field but the ones listed.
// =============================================================================

import { readFileSync } from 'node:fs';
import {
  SCENARIO_GEOMETRY,
  SCENARIO_IDS,
  SCENARIO_PRESETS,
  expandGeometry,
} from '../js/scenarios.js';
import { DEFAULT_SETTINGS } from '../js/appState.js';
import { withSeed } from '../js/rng.js';
import { ENGINE_GEOMETRY } from '../js/world/build.js';

/** Every declaration: a pack may carry some, only the engine builds the rest. */
const ALL_GEOMETRY = { ...SCENARIO_GEOMETRY, ...ENGINE_GEOMETRY };
import { validateScenarioPack } from '../js/platform/scenario.js';
import {
  GEOMETRY_ENGINE_SET,
  GEOMETRY_REUSE_TYPES,
  GEOMETRY_RULES,
  GEOMETRY_SCENARIOS,
  GEOMETRY_SET,
  GEOMETRY_TYPES,
  scenarioApi,
  validateGeometry,
  blankPack,
  checkPack,
  compileScenarioPack,
  geometryFromScenario,
  packBodies,
  settingsWithGeometry,
} from '../js/scenarioPack.js';
import { migrateScenarioPack } from '../js/platform/scenario.js';
import * as physics from '../js/physics.js';
import { LISTS, bodyRecord, digest, fnv } from './scenarioDigest.js';
import { LAB_EDGE_IDS, LAB_SCENARIOS } from './scenarioLabCases.js';
import { SLICE4_SCENARIOS } from './scenarioSlice4Cases.js';
import { SLICE5_SCENARIOS } from './scenarioSlice5Cases.js';
import { SLICE6_SCENARIOS } from './scenarioSlice6Cases.js';

/** The data of one body, from a digest row. */
const fields = row => JSON.parse(row.split('|').slice(3).join('|'));
import { buildPackWorld, worldSnapshot } from '../js/scenarioPackWorld.js';

const GOLDEN = JSON.parse(
  readFileSync('tests/fixtures/scenarioGeometryGolden.json', 'utf8')
);

describe('the declared scenarios build the world the code built', () => {
  test('the fixture covers every declared scenario at seven seeds', () => {
    const keys = Object.keys(ALL_GEOMETRY).sort();
    expect(keys).toEqual(
      [
        'binary-pair',
        'binary-planet-lab',
        'black-hole-lab',
        'blended-binary',
        'broken-laplace-resonance',
        'circumbinary-planet-lab',
        'earth-moon-system',
        'exoplanet-characterization-lab',
        'galilean-resonance',
        'gravity-assist-heliocentric',
        'gravity-assist-lab',
        'habitable-zone-lab',
        'interstellar-visitor',
        'jupiter-trojans',
        'keplers-2nd-law',
        'lagrange-point-lab',
        'orbital-transfer-lab',
        'pluto-and-neptune',
        'retrograde-mars',
        'three-body-sensitivity-lab',
        'transit-lab',
        'trappist-1-system',
        // Slice 4's nine are held to their own fixture
        // (tests/scenarioGeometrySlice4.test.js).
        ...SLICE4_SCENARIOS,
        // Slice 5's five, to theirs (tests/scenarioGeometrySlice5.test.js).
        ...SLICE5_SCENARIOS,
        // Slice 6's one, to its (tests/scenarioGeometrySlice6.test.js).
        ...SLICE6_SCENARIOS,
      ].sort()
    );
    expect(Object.keys(GOLDEN).length).toBe(
      (keys.length -
        SLICE4_SCENARIOS.length -
        SLICE5_SCENARIOS.length -
        SLICE6_SCENARIOS.length) *
        7
    );
    for (const key of keys) expect(SCENARIO_IDS).toContain(key);
  });

  test.each(Object.keys(GOLDEN))(
    '%s: every field of every body, the settings, the camera and the generator',
    id => {
      const [key, seed] = id.split('@');
      expect(digest(key, Number(seed))).toEqual(GOLDEN[id]);
    }
  );
});

describe('the validator, construct by construct', () => {
  const body = (extra = {}) => ({
    type: 'Star',
    name: 'Sun',
    mass: { suns: 1 },
    ...extra,
  });
  const geo = (...bodies) => ({ steps: bodies.map(b => ({ body: b })) });
  const planet = (extra = {}) => ({
    type: 'Planet',
    name: 'Earth',
    mass: { earths: 1 },
    orbit: { around: 'Sun', distance: { au: 1 } },
    ...extra,
  });
  const why = (g, opts) =>
    validateGeometry(g, opts).map(p => `${p.path}: ${p.why}`);

  test('every shipped declaration is valid', () => {
    for (const [key, g] of Object.entries(ALL_GEOMETRY)) {
      expect([key, validateGeometry(g)]).toEqual([key, []]);
    }
  });

  test('the constructs are the ones the schema and the validator name', () => {
    const schema = JSON.parse(
      readFileSync('sdk/schemas/scenario-pack-1.schema.json', 'utf8')
    );
    const b = schema.properties.geometry.properties.steps.items.properties.body;
    expect(b.properties.type.enum).toEqual(Object.keys(GEOMETRY_TYPES));
    expect(Object.keys(b.properties.set.properties).sort()).toEqual(
      Object.keys(GEOMETRY_SET).sort()
    );
    expect(Object.keys(GEOMETRY_RULES)).toEqual([
      'published-system',
      'restricted-three-body',
      'circular-transfer',
      'binary-lab',
      'equilateral-stars',
      'gravity-assist',
      'tracer-disc',
      'bound-cluster',
      'orbital-population',
      'inspiral-pair',
      'staggered-orbits',
      'tidal-infall',
      'circular-binary-stars',
      'pin-pair',
      'triangle-holes',
      'name-pair',
    ]);
  });

  test('body: a type, a name, a mass in the type’s own unit', () => {
    expect(why(geo(body()))).toEqual([]);
    expect(why(geo(body({ type: 'Comet' })))[0]).toMatch(
      /steps\[0\].body.type/
    );
    expect(why(geo(body({ name: '' })))[0]).toMatch(/name/);
    expect(why(geo(body({ name: '<b>' })))[0]).toMatch(/name/);
    expect(why(geo(body({ mass: { earths: 1 } })))[0]).toMatch(/mass/);
    expect(why(geo(body({ mass: { suns: 0 } })))[0]).toMatch(/mass/);
    expect(why(geo(body({ mass: { suns: 1, earths: 1 } })))[0]).toMatch(/mass/);
    expect(why(geo(body({ mass: { suns: NaN } })))[0]).toMatch(/mass/);
    expect(why(geo(body({ colour: 1 })))[0]).toMatch(/colour/);
    expect(why(geo(body(), body())).join()).toMatch(/names two bodies/);
  });

  test('body: a place and a velocity, or an orbit, never both', () => {
    expect(
      why(geo(body({ at: { x: 1, y: 2 }, velocity: { x: 0, y: 1 } })))
    ).toEqual([]);
    expect(why(geo(body({ at: { x: 1 } })))[0]).toMatch(/at.y/);
    expect(why(geo(body({ at: { x: 1e9, y: 0 } })))[0]).toMatch(/at.x/);
    expect(why(geo(body(), planet({ at: { x: 1, y: 1 } })))[0]).toMatch(
      /no `at`/
    );
  });

  test('orbit: an earlier body, a distance, an eccentricity below 1, an angle', () => {
    expect(why(geo(body(), planet()))).toEqual([]);
    expect(
      why(
        geo(
          body(),
          planet({
            orbit: {
              around: 'Sun',
              distance: { units: 320 },
              eccentricity: 0.65,
              angle: { pi: 0.6 },
            },
          })
        )
      )
    ).toEqual([]);
    expect(why(geo(planet(), body()))[0]).toMatch(/around/);
    expect(
      why(
        geo(
          body(),
          planet({ orbit: { around: 'Nobody', distance: { au: 1 } } })
        )
      )[0]
    ).toMatch(/around/);
    expect(
      why(
        geo(body(), planet({ orbit: { around: 'Sun', distance: { au: 0 } } }))
      )[0]
    ).toMatch(/distance/);
    expect(
      why(
        geo(
          body(),
          planet({ orbit: { around: 'Sun', distance: { parsecs: 1 } } })
        )
      )[0]
    ).toMatch(/distance/);
    expect(
      why(
        geo(
          body(),
          planet({
            orbit: { around: 'Sun', distance: { au: 1 }, eccentricity: 1 },
          })
        )
      )[0]
    ).toMatch(/eccentricity/);
    expect(
      why(
        geo(
          body(),
          planet({
            orbit: {
              around: 'Sun',
              distance: { au: 1 },
              angle: { deg: 1, rad: 1 },
            },
          })
        )
      )[0]
    ).toMatch(/angle/);
  });

  test('set: a drawn radius, a color and the cull flag, and nothing else', () => {
    expect(
      why(
        geo(
          body({ set: { radius: 9, baseColor: '#ffd86b', persistent: true } })
        )
      )
    ).toEqual([]);
    expect(why(geo(body({ set: { radius: 0 } })))[0]).toMatch(/radius/);
    expect(why(geo(body({ set: { baseColor: 'red' } })))[0]).toMatch(
      /baseColor/
    );
    expect(why(geo(body({ set: { persistent: 1 } })))[0]).toMatch(/persistent/);
    expect(why(geo(body({ set: { mass: 5 } })))[0]).toMatch(/set.mass/);
    // A key that is a way into an object's prototype is refused by name.
    const hostile = JSON.parse('{"__proto__": 1}');
    expect(why(geo(body({ set: hostile })))[0]).toMatch(/__proto__/);
  });

  test('rule: a named rule with parameters, built-ins only', () => {
    const rule = (params, name = 'published-system') => ({
      steps: [{ rule: { name, params } }],
    });
    expect(why(rule({ system: 'galilean' }))).toEqual([]);
    expect(why(rule({ system: 'galilean', detuned: true }))).toEqual([]);
    expect(why(rule({ system: 'galilean' }, 'nope'))[0]).toMatch(/name/);
    expect(why(rule({ system: 'saturn' }))[0]).toMatch(/system/);
    expect(why(rule({ system: 'pluto-neptune', detuned: true }))[0]).toMatch(
      /only the Galilean/
    );
    expect(why(rule({ system: 'galilean', extra: 1 }))[0]).toMatch(/extra/);
    expect(why(rule({ system: 'galilean' }), { rules: false })[0]).toMatch(
      /may not use a named rule/
    );
  });

  test('a geometry: steps, one construct each, a bounded number', () => {
    expect(why(null)[0]).toMatch(/steps/);
    expect(why({})[0]).toMatch(/steps/);
    expect(why({ steps: [] })[0]).toMatch(/steps/);
    expect(why({ steps: [{ body: body(), rule: {} }] })[0]).toMatch(
      /exactly one/
    );
    expect(why({ steps: [{ moon: {} }] })[0]).toMatch(/construct/);
    expect(why({ steps: [body()], extra: 1 }).join()).toMatch(/extra/);
    const many = {
      steps: Array.from({ length: 41 }, (_, i) => ({
        body: body({ name: `S${i}` }),
      })),
    };
    expect(why(many)[0]).toMatch(/at most 40/);
  });
});

describe('the arithmetic of the constructs', () => {
  const units = { AU: 100 };
  const make = () => {
    const made = [];
    return {
      made,
      create: ({ type, ctor, pos, vel, assign }) => {
        const mass = ctor * { Star: 1000, Planet: 3, GasGiant: 100 }[type];
        const b = { type, ctor, mass, pos, vel, assign };
        made.push(b);
        return b;
      },
    };
  };

  test('a circular orbit has the circular speed, perpendicular to the radius', () => {
    const { made, create } = make();
    expandGeometry(
      {
        steps: [
          { body: { type: 'Star', name: 'S', mass: { suns: 2 } } },
          {
            body: {
              type: 'Planet',
              name: 'P',
              mass: { earths: 1 },
              orbit: { around: 'S', distance: { au: 2 }, angle: { deg: 90 } },
            },
          },
        ],
      },
      { G: 3, units, create }
    );
    const [star, p] = made;
    expect(p.pos.x).toBeCloseTo(0, 10);
    expect(p.pos.y).toBeCloseTo(200, 10);
    const v = Math.hypot(p.vel.x, p.vel.y);
    expect(v).toBeCloseTo(Math.sqrt((3 * star.mass) / 200), 12);
    expect(p.vel.x).toBeCloseTo(-v, 12);
    expect(p.pos.x * p.vel.x + p.pos.y * p.vel.y).toBeCloseTo(0, 9);
  });

  test('an eccentric orbit starts at periapsis with the vis-viva speed', () => {
    const { made, create } = make();
    const e = 0.65;
    expandGeometry(
      {
        steps: [
          { body: { type: 'Star', name: 'S', mass: { suns: 1 } } },
          {
            body: {
              type: 'Planet',
              name: 'P',
              mass: { earths: 1 },
              orbit: {
                around: 'S',
                distance: { units: 50 },
                eccentricity: e,
                angle: { pi: 0.6 },
              },
            },
          },
        ],
      },
      { G: 1, units, create }
    );
    const [star, p] = made;
    const a = 50 / (1 - e);
    // vis-viva at r = 50: v^2 = GM (2/r - 1/a)
    const visViva = Math.sqrt(star.mass * (2 / 50 - 1 / a));
    expect(Math.hypot(p.vel.x, p.vel.y)).toBeCloseTo(visViva, 10);
    expect(Math.hypot(p.pos.x, p.pos.y)).toBeCloseTo(50, 10);
    expect(Math.atan2(p.pos.y, p.pos.x)).toBeCloseTo(Math.PI * 0.6, 12);
  });

  test('an orbit is round the body it names, wherever and however fast that is', () => {
    const { made, create } = make();
    expandGeometry(
      {
        steps: [
          {
            body: {
              type: 'Star',
              name: 'S',
              mass: { suns: 1 },
              at: { x: 10, y: -5 },
              velocity: { x: 1, y: 2 },
            },
          },
          {
            body: {
              type: 'Planet',
              name: 'P',
              mass: { earths: 1 },
              orbit: { around: 'S', distance: { units: 100 } },
            },
          },
        ],
      },
      { G: 1, units, create }
    );
    const [, p] = made;
    expect(p.pos).toEqual({ x: 110, y: -5 });
    expect(p.vel.x).toBe(1 + -0);
    expect(p.vel.y).toBeCloseTo(2 + Math.sqrt(1000 / 100), 12);
  });

  test('bodies are made in the order of the steps, so the generator is drawn in order', () => {
    const { made, create } = make();
    expandGeometry(SCENARIO_GEOMETRY['keplers-2nd-law'], {
      G: 1,
      units,
      create,
    });
    expect(made.map(b => b.assign.name)).toEqual([
      'Kepler Star',
      'Circular Orbiter',
      'Eccentric Orbiter',
    ]);
  });
});

describe('a pack carries the geometry', () => {
  const asPack = name => {
    const pack = blankPack(0x5ca1ab1e);
    pack.id = name;
    pack.title = { en: name, es: name };
    pack.summary = { en: `${name}, declared.`, es: `${name}, declarada.` };
    pack.settings = settingsWithGeometry(name).settings;
    pack.geometry = geometryFromScenario(name);
    return pack;
  };

  test('the scenarios a pack can carry are the ones declared with plain bodies only', () => {
    expect([...GEOMETRY_SCENARIOS].sort()).toEqual([
      'keplers-2nd-law',
      'retrograde-mars',
    ]);
    // Declared with a rule, a body reused from the generator, or an engine
    // property: a pack names the built-in instead.
    for (const name of [
      'galilean-resonance',
      'broken-laplace-resonance',
      'pluto-and-neptune',
      'jupiter-trojans',
      'earth-moon-system',
      'interstellar-visitor',
      'binary-pair',
      'black-hole-lab',
      'habitable-zone-lab',
      'trappist-1-system',
    ]) {
      expect([name, geometryFromScenario(name)]).toEqual([name, null]);
    }
    expect(geometryFromScenario('solar-system')).toBeNull();
  });

  // What a pack's world does not share with the built-in's, and why. Every
  // other field of every body must be equal, whatever the engine adds to a
  // body later: slice 1's review found a branch that dropped two flags the
  // list of compared fields had never named.
  const NOT_SHARED = {
    // The built-in's world holds the generated population's ids first.
    id: 'ids start at 0 in a world that holds only the pack’s bodies',
    // The link restore names the class; built-ins leave it null.
    type: 'the restore names the class',
    // A star's render cache, filled on the first frame.
    _visual: 'a cache',
    // The inspector reads `planet.density || "rocky"`; a restored planet has
    // none, and the fallback is the same word.
    density: 'a restored planet carries no density; the inspector says rocky',
  };
  test.each(GEOMETRY_SCENARIOS)(
    '%s: valid, and the same bodies as the built-in, every field',
    name => {
      const pack = asPack(name);
      expect(checkPack(pack)).toEqual([]);
      const { bodies } = packBodies(pack);
      expect(bodies.length).toBe(ALL_GEOMETRY[name].steps.length);
      const built = digest(name, 1).rows.map(fields);
      expect(built.length).toBe(bodies.length);
      const world = buildPackWorld(pack);
      expect(world.bodies).toBe(bodies.length);
      const live = LISTS.flatMap(l =>
        physics[l].map((b, i) => fields(bodyRecord(l, i, b)))
      );
      expect(live.length).toBe(built.length);
      for (const b of live) {
        const a = built.find(o => o.name === b.name);
        expect(a).toBeDefined();
        const differ = [...new Set([...Object.keys(a), ...Object.keys(b)])]
          .filter(f => JSON.stringify(a[f]) !== JSON.stringify(b[f]))
          .filter(f => !(f in NOT_SHARED));
        expect([b.name, differ]).toEqual([b.name, []]);
      }
    }
  );

  test('it compiles to bodies and round-trips as a file', () => {
    const pack = asPack('retrograde-mars');
    expect(compileScenarioPack(pack).b.length).toBe(3);
    const again = migrateScenarioPack(JSON.parse(JSON.stringify(pack)));
    expect(again.ok).toBe(true);
    expect(again.pack).toEqual(pack);
    expect(checkPack(again.pack)).toEqual([]);
  });

  test('it replaces the population, and refuses what it replaces', () => {
    const base = () => asPack('retrograde-mars');
    const codes = p => checkPack(p).map(e => `${e.path}:${e.code}`);
    const withCount = base();
    withCount.settings.num_planets = 2;
    expect(codes(withCount)).toContain(
      'settings.num_planets:populationWithBodies'
    );
    const withBodies = base();
    withBodies.bodies = [{ type: 'Planet', mass: 1, x: 1, y: 1, vx: 0, vy: 0 }];
    expect(codes(withBodies)).toContain('geometry:geometryExclusive');
    const withScenario = base();
    withScenario.scenario = 'solar-system';
    expect(codes(withScenario)).toContain('geometry:geometryExclusive');
  });

  test('it refuses a named rule, naming the step', () => {
    const pack = asPack('retrograde-mars');
    pack.geometry = SCENARIO_GEOMETRY['galilean-resonance'];
    const errors = validateScenarioPack(pack, scenarioApi());
    const e = errors.find(x => x.code === 'geometry');
    expect(e.path).toBe('geometry.steps[0].rule');
    expect(e.message).toMatch(/may not use a named rule/);
  });

  test('a bad geometry says where', () => {
    const pack = asPack('keplers-2nd-law');
    pack.geometry.steps[1].body.orbit.eccentricity = 2;
    const e = checkPack(pack).find(x => x.code === 'geometry');
    expect(e.path).toBe('geometry.steps[1].body.orbit.eccentricity');
  });
});

// --- Slice 2: bodies the generator drew, a drawn phase, a barycentric pair ----

describe('slice 2: the validator, construct by construct', () => {
  const star = (extra = {}) => ({
    type: 'Star',
    name: 'Sun',
    mass: { suns: 1 },
    ...extra,
  });
  const planet = (orbit, extra = {}) => ({
    type: 'Planet',
    name: 'Earth',
    mass: { earths: 1 },
    orbit: { around: 'Sun', distance: { au: 1 }, ...orbit },
    ...extra,
  });
  const geo = (...bodies) => ({ steps: bodies.map(b => ({ body: b })) });
  const why = (g, opts) =>
    validateGeometry(g, opts).map(p => `${p.path}: ${p.why}`);

  test('from: a generated body by index, a type that can be reused, optional if missing', () => {
    expect(why(geo(star({ from: { generated: 0 } })))).toEqual([]);
    expect(
      why(geo(star({ from: { generated: 1, ifMissing: 'make' } })))
    ).toEqual([]);
    expect(
      why(
        geo({
          type: 'BlackHole',
          name: 'Black Hole',
          from: { generated: 0 },
        })
      )
    ).toEqual([]);
    // Reused without a mass: it keeps the mass the generator drew.
    expect(
      why(geo({ type: 'Planet', name: 'P', from: { generated: 2 } }))
    ).toEqual([]);
    expect(why(geo(star({ from: { generated: -1 } })))[0]).toMatch(/generated/);
    expect(why(geo(star({ from: { generated: 0.5 } })))[0]).toMatch(
      /generated/
    );
    expect(why(geo(star({ from: {} })))[0]).toMatch(/generated/);
    expect(
      why(geo(star({ from: { generated: 0, ifMissing: 'guess' } })))[0]
    ).toMatch(/ifMissing/);
    expect(
      why(
        geo({
          type: 'Star',
          name: 'S',
          from: { generated: 0, ifMissing: 'make' },
        })
      ).join()
    ).toMatch(/needs a mass/);
    // A black hole cannot be made, or massed, here.
    expect(
      why(geo({ type: 'BlackHole', name: 'B', mass: { suns: 1 } })).join()
    ).toMatch(/type/);
    expect(
      why(
        geo({
          type: 'BlackHole',
          name: 'B',
          mass: { suns: 1 },
          from: { generated: 0 },
        })
      ).join()
    ).toMatch(/keeps the mass/);
    expect(why(geo(star({ from: { generated: 0, extra: 1 } })))[0]).toMatch(
      /extra/
    );
    expect([...GEOMETRY_REUSE_TYPES]).toEqual([
      'Star',
      'Planet',
      'GasGiant',
      'BlackHole',
    ]);
  });

  test('distance in radii: the central body’s drawn radius', () => {
    expect(why(geo(star(), planet({ distance: { radii: 4.2 } })))).toEqual([]);
    expect(why(geo(star(), planet({ distance: { radii: 0 } })))[0]).toMatch(
      /distance/
    );
    expect(
      why(geo(star(), planet({ distance: { radii: 1, au: 1 } })))[0]
    ).toMatch(/distance/);
  });

  test('angle: random is exactly {random: true}', () => {
    expect(why(geo(star(), planet({ angle: { random: true } })))).toEqual([]);
    expect(why(geo(star(), planet({ angle: { random: false } })))[0]).toMatch(
      /random: true/
    );
    expect(
      why(geo(star(), planet({ angle: { random: true, deg: 1 } })))[0]
    ).toMatch(/random: true/);
  });

  test('barycentric: a circular orbit about the pair’s common center', () => {
    expect(why(geo(star(), planet({ barycentric: true })))).toEqual([]);
    expect(why(geo(star(), planet({ barycentric: 1 })))[0]).toMatch(
      /barycentric/
    );
    expect(
      why(geo(star(), planet({ barycentric: true, eccentricity: 0.2 })))[0]
    ).toMatch(/circular/);
  });

  test('set: the engine’s own properties, by kind, and nothing else', () => {
    const ok = {
      radiusInSuns: 1.6,
      luminosityInSuns: 10,
      temperature: 8000,
      spectralType: 'A5V',
      showHabitableZone: true,
      isEarth: true,
      surface_pressure: 0,
      albedo: 0.306,
      atmosphere: 'N2/O2',
      diameter: 12742,
    };
    expect(why(geo(star({ set: ok })))).toEqual([]);
    expect(why(geo(star({ set: { temperature: 0 } })))[0]).toMatch(
      /temperature/
    );
    expect(why(geo(star({ set: { albedo: -1 } })))[0]).toMatch(/albedo/);
    expect(why(geo(star({ set: { spectralType: '<b>' } })))[0]).toMatch(
      /spectralType/
    );
    expect(why(geo(star({ set: { isMoon: 'yes' } })))[0]).toMatch(/isMoon/);
    expect(why(geo(star({ set: { mass: 5 } })))[0]).toMatch(/set.mass/);
    expect(why(geo(star({ set: { pos: 5 } })))[0]).toMatch(/set.pos/);
    // Every key the declarations use is on the list, and the list has a kind
    // the validator knows for each.
    for (const kind of Object.values(GEOMETRY_ENGINE_SET))
      expect(['positive', 'nonneg', 'text', 'bool']).toContain(kind);
  });

  test('keep: generated bodies of a type left in the world, built-ins only', () => {
    const g = keep => ({ ...geo(star()), keep });
    expect(why(g(['Star']))).toEqual([]);
    expect(why(g(['Star', 'BlackHole']))).toEqual([]);
    expect(why(g(['Star', 'Star']))[0]).toMatch(/keep/);
    expect(why(g(['Comet', 'Debris']))).toEqual([]);
    expect(why(g(['Galaxy']))[0]).toMatch(/keep/);
    expect(why(g('Star'))[0]).toMatch(/keep/);
    expect(why(g(['Star']), { rules: false })[0]).toMatch(/may not use/);
  });

  test('rule: TRAPPIST-1 is a published system', () => {
    expect(
      why({
        steps: [
          {
            rule: {
              name: 'published-system',
              params: { system: 'trappist-1' },
            },
          },
        ],
      })
    ).toEqual([]);
    expect(
      why({
        steps: [
          {
            rule: {
              name: 'published-system',
              params: { system: 'trappist-1', detuned: true },
            },
          },
        ],
      })[0]
    ).toMatch(/only the Galilean/);
  });

  test('a pack may use none of these, and the refusal names the step', () => {
    const refused = (g, re) =>
      expect(why(g, { rules: false }).join('\n')).toMatch(re);
    refused(geo(star({ from: { generated: 0 } })), /reused from the generator/);
    refused(geo(star(), planet({ distance: { radii: 2 } })), /drawn radii/);
    refused(geo(star(), planet({ angle: { random: true } })), /random angle/);
    refused(geo(star(), planet({ barycentric: true })), /barycentric/);
    refused(
      geo(star({ set: { temperature: 5772 } })),
      /engine property \(temperature\)/
    );
    // The same geometry without them is a pack's.
    expect(why(geo(star(), planet({})), { rules: false })).toEqual([]);
  });
});

describe('slice 2: the arithmetic of the constructs', () => {
  const units = { AU: 100 };
  const simMass = (type, ctor) =>
    ctor * { Star: 1000, Planet: 3, GasGiant: 100 }[type];
  const make = (generated = {}) => {
    const made = [];
    return {
      made,
      create: ({ type, ctor, pos, vel, assign, from }) => {
        let b;
        if (from) {
          b = generated[`${type}${from.generated}`];
          if (!b && from.ifMissing !== 'make') return null;
          if (b) {
            if (pos) b.pos = { ...pos };
            if (vel) b.vel = { ...vel };
          }
        }
        if (!b)
          b = {
            type,
            ctor,
            mass: ctor === undefined ? undefined : simMass(type, ctor),
            radius: 1,
            pos,
            vel,
          };
        Object.assign(b, assign);
        made.push(b);
        return b;
      },
    };
  };
  const star = (name = 'S', extra = {}) => ({
    body: {
      type: 'Star',
      name,
      mass: { suns: 1 },
      at: { x: 0, y: 0 },
      ...extra,
    },
  });

  test('a quarter turn is exact: no 6e-17 where a hand-written place has 0', () => {
    for (const [an, x, y, vx, vy] of [
      [{ pi: 0.5 }, 0, 10, -1, 0],
      [{ deg: 90 }, 0, 10, -1, 0],
      [{ pi: 1 }, -10, 0, 0, -1],
      [{ deg: 270 }, 0, -10, 1, 0],
      [{ deg: -90 }, 0, -10, 1, 0],
      [{ pi: 2 }, 10, 0, 0, 1],
    ]) {
      const { made, create } = make();
      expandGeometry(
        {
          steps: [
            star('S', { mass: { suns: 0.001 } }),
            {
              body: {
                type: 'Planet',
                name: 'P',
                mass: { earths: 1 },
                orbit: { around: 'S', distance: { units: 10 }, angle: an },
              },
            },
          ],
        },
        { G: 1, units, create, simMass }
      );
      const [, p] = made;
      const v = Math.sqrt(1 / 10);
      expect([an, p.pos.x, p.pos.y]).toEqual([an, x, y]);
      expect(p.vel.x).toBeCloseTo(vx * v, 14);
      expect(p.vel.y).toBeCloseTo(vy * v, 14);
    }
  });

  test('distance in radii is a multiple of the central body’s drawn radius', () => {
    const { made, create } = make({ BlackHole0: { radius: 7, mass: 50 } });
    expandGeometry(
      {
        steps: [
          {
            body: {
              type: 'BlackHole',
              name: 'BH',
              from: { generated: 0 },
              at: { x: 0, y: 0 },
              velocity: { x: 0, y: 0 },
            },
          },
          {
            body: {
              type: 'Planet',
              name: 'P',
              mass: { earths: 1 },
              orbit: { around: 'BH', distance: { radii: 4 } },
            },
          },
        ],
      },
      { G: 2, units, create, simMass }
    );
    const [, p] = made;
    expect(p.pos).toEqual({ x: 28, y: 0 });
    expect(p.vel.y).toBeCloseTo(Math.sqrt((2 * 50) / 28), 14);
  });

  test('a barycentric pair: the center stays put, the momentum is zero, the speed is the two-body speed', () => {
    const { made, create } = make();
    const G = 3;
    const d = 40;
    expandGeometry(
      {
        steps: [
          {
            body: {
              type: 'Planet',
              name: 'A',
              mass: { earths: 5 },
              at: { x: 7, y: -2 },
              velocity: { x: 1, y: 0.5 },
            },
          },
          {
            body: {
              type: 'Planet',
              name: 'B',
              mass: { earths: 1 },
              orbit: {
                around: 'A',
                distance: { units: d },
                barycentric: true,
                angle: { deg: 33 },
              },
            },
          },
        ],
      },
      { G, units, create, simMass }
    );
    const [a, b] = made;
    const ma = a.mass;
    const mb = b.mass;
    // The center of mass sits at the place the central body was given, and
    // moves at the velocity it was given.
    expect((ma * a.pos.x + mb * b.pos.x) / (ma + mb)).toBeCloseTo(7, 12);
    expect((ma * a.pos.y + mb * b.pos.y) / (ma + mb)).toBeCloseTo(-2, 12);
    expect((ma * a.vel.x + mb * b.vel.x) / (ma + mb)).toBeCloseTo(1, 12);
    expect((ma * a.vel.y + mb * b.vel.y) / (ma + mb)).toBeCloseTo(0.5, 12);
    // They are d apart, and their relative speed is that of the circular
    // two-body orbit of total mass ma + mb at that separation.
    expect(Math.hypot(b.pos.x - a.pos.x, b.pos.y - a.pos.y)).toBeCloseTo(d, 12);
    expect(Math.hypot(b.vel.x - a.vel.x, b.vel.y - a.vel.y)).toBeCloseTo(
      Math.sqrt((G * (ma + mb)) / d),
      12
    );
    // and the relative velocity is perpendicular to the separation.
    const rx = b.pos.x - a.pos.x;
    const ry = b.pos.y - a.pos.y;
    expect(rx * (b.vel.x - a.vel.x) + ry * (b.vel.y - a.vel.y)).toBeCloseTo(
      0,
      9
    );
  });

  test('a random angle is drawn at its step: after the bodies before it, before the body it places', () => {
    const draws = [];
    const create = rec => {
      draws.push(`make ${rec.assign.name}`);
      return { ...rec, mass: 1, radius: 1, pos: rec.pos, vel: rec.vel };
    };
    const geometry = {
      steps: [
        {
          body: {
            type: 'Planet',
            name: 'A',
            mass: { earths: 1 },
            at: { x: 0, y: 0 },
          },
        },
        {
          body: {
            type: 'Planet',
            name: 'B',
            mass: { earths: 1 },
            orbit: {
              around: 'A',
              distance: { units: 5 },
              angle: { random: true },
            },
          },
        },
      ],
    };
    const a = withSeed(11, () => {
      const out = [];
      const real = Math.random;
      Math.random = () => {
        draws.push('draw');
        return real();
      };
      try {
        out.push(expandGeometry(geometry, { G: 1, units, create, simMass }));
      } finally {
        Math.random = real;
      }
      return out[0];
    });
    expect(draws).toEqual(['make A', 'draw', 'make B']);
    // The phase is 2 pi times that draw, so it is on the circle.
    expect(Math.hypot(a[1].pos.x, a[1].pos.y)).toBeCloseTo(5, 12);
    const again = withSeed(11, () =>
      expandGeometry(geometry, {
        G: 1,
        units,
        create: r => ({ ...r, mass: 1, radius: 1 }),
        simMass,
      })
    );
    expect(again[1].pos).toEqual(a[1].pos);
  });

  test('from: a generated body is kept, placed only as the step says, massed in both units', () => {
    const gen = { id: 9, pos: { x: 1, y: 1 }, vel: { x: 2, y: 2 }, mass: 4 };
    const { made, create } = make({ Star0: gen });
    expandGeometry(
      {
        steps: [
          {
            body: {
              type: 'Star',
              name: 'Kept',
              mass: { suns: 2 },
              from: { generated: 0 },
              set: { radius: 9 },
            },
          },
        ],
      },
      { G: 1, units, create, simMass }
    );
    expect(made[0]).toBe(gen);
    // No place was given: the generator's stays.
    expect(gen.pos).toEqual({ x: 1, y: 1 });
    expect(gen).toMatchObject({
      id: 9,
      name: 'Kept',
      radius: 9,
      mass: 2000,
      massInSuns: 2,
    });
  });

  test('from: a missing body makes nothing, or is made, as the step says; an orbit round nothing makes nothing', () => {
    const { made, create } = make();
    expandGeometry(
      {
        steps: [
          {
            body: {
              type: 'Star',
              name: 'A',
              mass: { suns: 1 },
              from: { generated: 0 },
            },
          },
          {
            body: {
              type: 'Planet',
              name: 'Round A',
              mass: { earths: 1 },
              orbit: { around: 'A', distance: { au: 1 } },
            },
          },
          {
            body: {
              type: 'Star',
              name: 'B',
              mass: { suns: 1 },
              from: { generated: 1, ifMissing: 'make' },
              at: { x: 5, y: 5 },
            },
          },
        ],
      },
      { G: 1, units, create, simMass }
    );
    expect(made.map(b => b.name)).toEqual(['B']);
    expect(made[0].pos).toEqual({ x: 5, y: 5 });
  });
});

describe('slice 2: a share link that changes a population count', () => {
  // A link's settings land after the preset, so a count can differ from the
  // one a declaration was written for (a pack that names a built-in can say
  // num_stars: 3 over Binary Pair). The edge fixture holds the world the
  // hand-built blocks made then, one row per body hashed: extra stars and
  // black holes stay where the generator put them, a missing Sun is made, a
  // missing star leaves the pair with one, and a count the scenario does not
  // use changes nothing.
  const EDGE = JSON.parse(
    readFileSync('tests/fixtures/scenarioGeometryEdgeGolden.json', 'utf8')
  );

  test.each(Object.keys(EDGE))('%s is the world the code made', id => {
    const at = id.indexOf('@');
    const d = digest(id.slice(0, at), 1, JSON.parse(id.slice(at + 1)));
    expect({ ...d, rows: d.rows.map(fnv) }).toEqual(EDGE[id]);
  });

  // The one place the declarations narrow what the code did (D-GEOM-05): a
  // planet that orbits a body that is not there is not made. The code left
  // Black Hole Lab's generated planets where the generator put them, and put
  // Habitable Zone Lab's four planets on orbits about nothing.
  test('a body that orbits a body that is not there is not made', () => {
    const planets = d => d.rows.filter(r => r.startsWith('planets|')).length;
    expect(planets(digest('black-hole-lab', 1, { num_black_holes: 0 }))).toBe(
      0
    );
    expect(planets(digest('habitable-zone-lab', 1, { num_stars: 0 }))).toBe(0);
  });
});

describe('slice 3: the validator, construct by construct', () => {
  const star = (extra = {}) => ({
    type: 'Star',
    name: 'Sun',
    mass: { suns: 1 },
    ...extra,
  });
  const planet = (extra = {}, orbit = {}) => ({
    type: 'Planet',
    name: 'Earth',
    mass: { earths: 1 },
    orbit: { around: 'Sun', distance: { au: 1 }, ...orbit },
    ...extra,
  });
  const geo = (...bodies) => ({ steps: bodies.map(b => ({ body: b })) });
  const why = (g, opts) =>
    validateGeometry(g, opts).map(p => `${p.path}: ${p.why}`);

  test('born: the mass the constructor is handed, a built-in’s, in any unit', () => {
    expect(why(geo(star({ born: { suns: 1 } })))).toEqual([]);
    expect(why(geo(star({ born: { suns: 0 } })))).toEqual([]);
    expect(why(geo(star({ born: { earths: 1 } })))).toEqual([]);
    expect(why(geo(star({ born: { suns: -1 } })))[0]).toMatch(/born/);
    expect(why(geo(star({ born: { suns: 1, earths: 1 } })))[0]).toMatch(/born/);
    expect(why(geo(star({ born: 1 })))[0]).toMatch(/born/);
    expect(
      why(geo({ type: 'Star', name: 'A', born: { suns: 1 } }))
        .join()
        .includes('born')
    ).toBe(true);
    expect(why(geo(star({ born: { suns: 1 } })), { rules: false })[0]).toMatch(
      /a body built from another mass/
    );
  });

  test('mass: a body that is born from another mass may be massed in any unit', () => {
    const jup = { mass: { jupiters: 0.69 } };
    expect(why(geo(star(), planet({ ...jup, born: { earths: 1 } })))).toEqual(
      []
    );
    // Without `born` it is still the type's own unit, as before.
    expect(why(geo(star(), planet(jup)))[0]).toMatch(/mass/);
  });

  test('orbit: mutual and retrograde are booleans, a built-in’s, and mutual is not barycentric', () => {
    expect(
      why(geo(star(), planet({}, { mutual: true, retrograde: true })))
    ).toEqual([]);
    expect(why(geo(star(), planet({}, { mutual: 1 })))[0]).toMatch(/mutual/);
    expect(why(geo(star(), planet({}, { retrograde: 'no' })))[0]).toMatch(
      /retrograde/
    );
    expect(
      why(geo(star(), planet({}, { mutual: true, barycentric: true })))[0]
    ).toMatch(/barycentric/);
    // False is the default and a pack may say so; true is the engine's.
    expect(
      why(geo(star(), planet({}, { mutual: false, retrograde: false })), {
        rules: false,
      })
    ).toEqual([]);
    expect(
      why(geo(star(), planet({}, { mutual: true })), { rules: false })[0]
    ).toMatch(/mutual orbit/);
    expect(
      why(geo(star(), planet({}, { retrograde: true })), { rules: false })[0]
    ).toMatch(/retrograde orbit/);
  });

  test('set: a world’s radius in Jupiters and its mass in Earths are the engine’s', () => {
    expect(
      why(geo(star({ set: { radiusInJupiters: 1.38, massInEarths: 219 } })))
    ).toEqual([]);
    expect(why(geo(star({ set: { radiusInJupiters: 0 } })))[0]).toMatch(
      /radiusInJupiters/
    );
    expect(
      why(geo(star({ set: { massInEarths: 1 } })), { rules: false })[0]
    ).toMatch(/engine property \(massInEarths\)/);
  });

  test('recenter: a boolean, a built-in’s', () => {
    const g = recenter => ({ ...geo(star()), recenter });
    expect(why(g(true))).toEqual([]);
    expect(why(g(false))).toEqual([]);
    expect(why(g('yes'))[0]).toMatch(/recenter/);
    expect(why(g(true), { rules: false })[0]).toMatch(/may not recenter/);
  });

  test('rule: each laboratory rule needs every parameter, by kind, and nothing else', () => {
    for (const [name, spec] of Object.entries(GEOMETRY_RULES)) {
      const all = g => [...(g.steps ?? []), ...(g.place ?? [])];
      const found = Object.entries(ALL_GEOMETRY).find(([, g]) =>
        all(g).some(s => s.rule?.name === name)
      );
      expect(found).toBeTruthy();
      const params = all(found[1]).find(s => s.rule?.name === name).rule.params;
      const rule = p => ({ steps: [{ rule: { name, params: p } }] });
      expect(why(rule(params))).toEqual([]);
      // Every required parameter is required, by name.
      for (const k of Object.keys(spec)) {
        if (spec[k] === 'bool' || spec[k].optional) continue;
        const { [k]: _gone, ...rest } = params;
        expect(why(rule(rest)).join()).toMatch(new RegExp(`params.${k}\\b`));
      }
      expect(why(rule({ ...params, extra: 1 }))[0]).toMatch(/extra/);
    }
    const rule = (name, params) => ({ steps: [{ rule: { name, params } }] });
    const t = ENGINE_GEOMETRY['lagrange-point-lab'].steps[0].rule.params;
    expect(
      why(rule('restricted-three-body', { ...t, primaryColor: 'gold' }))[0]
    ).toMatch(/primaryColor.*color/);
    expect(
      why(rule('restricted-three-body', { ...t, tracerRadius: -1 }))[0]
    ).toMatch(/tracerRadius/);
    expect(
      why(rule('restricted-three-body', { ...t, primaryName: '<b>' }))[0]
    ).toMatch(/primaryName/);
    const eq =
      ENGINE_GEOMETRY['three-body-sensitivity-lab'].steps[0].rule.params;
    expect(
      why(rule('equilateral-stars', { ...eq, names: ['A', 'B'] }))[0]
    ).toMatch(/a list of 3/);
    expect(
      why(rule('equilateral-stars', { ...eq, colors: ['#fff', 'b', 'c'] }))[0]
    ).toMatch(/colors\[0\]/);
    const bl = ENGINE_GEOMETRY['binary-planet-lab'].steps[0].rule.params;
    expect(why(rule('binary-lab', { ...bl, mode: 'tight' }))[0]).toMatch(
      /one of circumstellar, circumbinary/
    );
    expect(why(rule('published-system', { system: 'hd209458' }))).toEqual([]);
    expect(why(rule('restricted-three-body', t), { rules: false })[0]).toMatch(
      /may not use a named rule/
    );
  });
});

describe('slice 3: the arithmetic of the constructs', () => {
  const units = { AU: 100 };
  const simMass = (type, ctor, unit) =>
    ctor *
    { suns: 1000, earths: 3, jupiters: 100 }[
      unit ?? { Star: 'suns', Planet: 'earths', GasGiant: 'jupiters' }[type]
    ];
  const run = (steps, generated = {}) => {
    const made = [];
    const seen = [];
    expandGeometry(
      { steps },
      {
        G: 2,
        units,
        simMass,
        create: rec => {
          seen.push(rec);
          const b = {
            ctor: rec.ctor,
            mass: simMass(rec.type, rec.ctor ?? 1),
            radius: 1,
            pos: rec.pos,
            vel: rec.vel,
            ...(generated[rec.type] ?? {}),
          };
          Object.assign(b, rec.assign);
          made.push(b);
          return b;
        },
      }
    );
    return { made, seen };
  };
  const sun = {
    body: {
      type: 'Star',
      name: 'Sun',
      mass: { suns: 1 },
      at: { x: 0, y: 0 },
      velocity: { x: 0, y: 0 },
    },
  };
  const orbiter = orbit => ({
    body: {
      type: 'Planet',
      name: 'P',
      mass: { earths: 2 },
      orbit: { around: 'Sun', distance: { units: 10 }, ...orbit },
    },
  });

  test('a mutual orbit moves at the speed for the pair’s mass, a plain one at the central body’s', () => {
    const plain = run([sun, orbiter({})]).made[1];
    const mutual = run([sun, orbiter({ mutual: true })]).made[1];
    // G = 2, r = 10: sqrt(G M / r) with M the star's 1000, or the pair's 1006.
    expect(Math.hypot(plain.vel.x, plain.vel.y)).toBeCloseTo(
      Math.sqrt((2 * 1000) / 10),
      12
    );
    expect(Math.hypot(mutual.vel.x, mutual.vel.y)).toBeCloseTo(
      Math.sqrt((2 * 1006) / 10),
      12
    );
    // The star is not moved by it: the pair circles the star’s own place.
    expect(mutual.pos).toEqual({ x: 10, y: 0 });
  });

  test('a retrograde orbit is the same speed the other way round', () => {
    for (const angle of [{ rad: 0 }, { deg: 33 }]) {
      const a = run([sun, orbiter({ angle })]).made[1];
      const b = run([sun, orbiter({ angle, retrograde: true })]).made[1];
      expect(b.pos).toEqual(a.pos);
      expect(b.vel.x).toBeCloseTo(-a.vel.x, 14);
      expect(b.vel.y).toBeCloseTo(-a.vel.y, 14);
      // Angular momentum about the star changes sign.
      const l = p => p.pos.x * p.vel.y - p.pos.y * p.vel.x;
      expect(l(a)).toBeGreaterThan(0);
      expect(l(b)).toBeLessThan(0);
    }
  });

  test('born: the constructor is handed one mass and the body is given another', () => {
    const { seen, made } = run([
      {
        body: {
          type: 'Planet',
          name: 'Hot',
          mass: { jupiters: 0.5 },
          born: { earths: 1 },
          at: { x: 1, y: 2 },
        },
      },
    ]);
    // What the constructor draws from and derives its radius from.
    expect(seen[0].ctor).toBe(1);
    // The body's own mass in simulation units and in the unit it was given
    // in; the type's own figure is the step's `set`.
    expect(made[0].mass).toBe(50);
    expect(made[0].massInJupiters).toBe(0.5);
    expect(made[0].massInEarths).toBeUndefined();
  });

  test('born: a body without it is built from its mass, as before', () => {
    const { seen, made } = run([
      {
        body: {
          type: 'Star',
          name: 'S',
          mass: { suns: 2 },
          at: { x: 0, y: 0 },
        },
      },
    ]);
    expect(seen[0].ctor).toBe(2);
    expect(made[0].massInSuns).toBeUndefined();
  });
});

describe('slice 3: the laboratory worlds against their closed forms', () => {
  // The constant the scenario runs under: its own, or the application's.
  let G = 1;
  const world = (key, pending = null, seed = 1) => {
    G =
      pending?.gravitational_constant ??
      SCENARIO_PRESETS[key].gravitational_constant ??
      DEFAULT_SETTINGS.gravitational_constant;
    digest(key, seed, pending);
    const byName = {};
    for (const list of ['stars', 'planets', 'gas_giants'])
      for (const b of physics[list]) byName[b.name] = b;
    return byName;
  };
  const speed = b => Math.hypot(b.vel.x, b.vel.y);

  test('Lagrange: the pair circles its barycenter at the angular speed Kepler gives', () => {
    const w = world('lagrange-point-lab');
    const { Primary: a, Secondary: b } = w;
    const sep = b.pos.x - a.pos.x;
    expect(sep).toBeCloseTo(8 * 100, 9);
    // The barycenter is the origin and does not move.
    expect(
      (a.mass * a.pos.x + b.mass * b.pos.x) / (a.mass + b.mass)
    ).toBeCloseTo(0, 9);
    expect(a.mass * a.vel.y + b.mass * b.vel.y).toBeCloseTo(0, 9);
    // n^2 a^3 = G (M1 + M2), and both move at n times their distance.
    const n = a.vel.y / a.pos.x;
    expect(n * n * sep ** 3).toBeCloseTo(G * (a.mass + b.mass), 6);
    expect(b.vel.y / b.pos.x).toBeCloseTo(n, 12);
    // The tracer is at rest in the rotating frame: its inertial velocity is
    // omega x r.
    const t = w.Tracer;
    expect(t.vel.x).toBeCloseTo(-n * t.pos.y, 12);
    expect(t.vel.y).toBeCloseTo(n * t.pos.x, 12);
    expect(t.pos.x).toBeCloseTo(0.6 * sep, 9);
  });

  test('Orbital Transfer: circular orbits, the spacecraft’s mass in the pull', () => {
    const w = world('orbital-transfer-lab');
    const sol = w.Sol;
    for (const [name, r] of [
      ['Spacecraft', 100],
      ['Target Station', 250],
    ]) {
      const b = w[name];
      expect(Math.hypot(b.pos.x, b.pos.y)).toBeCloseTo(r, 9);
      // To the net-momentum balance the build ends with, which moves every
      // body by the barycenter's own speed (about 1e-9 of the circular speed).
      expect(speed(b)).toBeCloseTo(Math.sqrt((G * (sol.mass + b.mass)) / r), 6);
      expect(b.pos.x * b.vel.x + b.pos.y * b.vel.y).toBeCloseTo(0, 6);
    }
    const turned = world('orbital-transfer-lab', {
      transfer_target_phase_deg: 90,
    });
    expect(turned['Target Station'].pos.x).toBeCloseTo(0, 9);
    expect(turned['Target Station'].pos.y).toBeCloseTo(250, 9);
  });

  test('the Binary Planet Lab: a planet round one star, the stars about a fixed barycenter', () => {
    const w = world('binary-planet-lab');
    const a = w['Star A'];
    const b = w['Star B'];
    // The system was recentered: no net momentum.
    const px =
      a.mass * a.vel.x + b.mass * b.vel.x + w.Planet.mass * w.Planet.vel.x;
    const py =
      a.mass * a.vel.y + b.mass * b.vel.y + w.Planet.mass * w.Planet.vel.y;
    expect(px).toBeCloseTo(0, 9);
    expect(py).toBeCloseTo(0, 9);
    // The stars start at periapsis of an e = 0.4 orbit, 10 AU semi-major axis.
    expect(Math.hypot(b.pos.x - a.pos.x, b.pos.y - a.pos.y)).toBeCloseTo(
      10 * 100 * (1 - 0.4),
      6
    );
  });

  test('Exoplanet Characterization: HD 209458 and its planet about their center of mass', () => {
    const w = world('exoplanet-characterization-lab');
    const s = w['HD 209458'];
    const p = w['HD 209458 b'];
    const a = 0.04747 * 100;
    expect(p.pos.x - s.pos.x).toBeCloseTo(a, 12);
    expect(
      (s.mass * s.pos.x + p.mass * p.pos.x) / (s.mass + p.mass)
    ).toBeCloseTo(0, 12);
    expect(Math.hypot(p.vel.x - s.vel.x, p.vel.y - s.vel.y)).toBeCloseTo(
      Math.sqrt((G * (s.mass + p.mass)) / a),
      12
    );
    expect(s.mass * s.vel.y + p.mass * p.vel.y).toBeCloseTo(0, 12);
  });

  test('Transit Lab: a circular orbit about the star from a quarter turn before transit', () => {
    const w = world('transit-lab');
    const s = w['HD 209458'];
    const p = w['HD 209458 b'];
    const a = 0.04747 * 100;
    expect(p.pos.y).toBeCloseTo(-a, 12);
    expect(speed(p)).toBeCloseTo(Math.sqrt((G * s.mass) / a), 12);
    expect(p.vel.x).toBeGreaterThan(0);
    expect(p.massInJupiters).toBe(0.69);
    expect(p.radius / s.radius).toBeCloseTo((1.38 * 0.102763) / 1.155, 12);
  });

  test('Blended Binary: the companion circles the primary retrograde, 300 AU out', () => {
    const w = world('blended-binary');
    const s = w['HD 209458'];
    const c = w['HD 209458 B (companion)'];
    expect(c.pos.x).toBeCloseTo(300 * 100, 9);
    expect(c.vel.y).toBeCloseTo(
      -Math.sqrt((G * (s.mass + c.mass)) / (300 * 100)),
      12
    );
    expect(c.mass).toBe(1000);
    expect(physics.stars.length).toBe(2);
  });

  test('Three-Body Sensitivity: three equal stars on a rigidly rotating triangle', () => {
    const w = world('three-body-sensitivity-lab');
    const [a, b, c] = [w.Alpha, w.Beta, w.Gamma];
    const side = x =>
      Math.hypot(x[0].pos.x - x[1].pos.x, x[0].pos.y - x[1].pos.y);
    expect(side([a, b])).toBeCloseTo(50 * Math.sqrt(3), 12);
    expect(side([b, c])).toBeCloseTo(50 * Math.sqrt(3), 12);
    expect(side([c, a])).toBeCloseTo(50 * Math.sqrt(3), 12);
    // omega^2 L^3 = G * 3m; each star moves at omega times its radius.
    const omega = speed(a) / 50;
    expect(omega * omega * (50 * Math.sqrt(3)) ** 3).toBeCloseTo(
      G * 3 * a.mass,
      6
    );
    expect(a.vel.x + b.vel.x + c.vel.x).toBeCloseTo(0, 9);
    expect(a.mass).toBe(6000);
  });

  test('Gravity Assist: the spacecraft is on the hyperbola the settings ask for', () => {
    for (const key of ['gravity-assist-lab', 'gravity-assist-heliocentric']) {
      const w = world(key);
      const planet = w.Planet;
      const craft = w.Spacecraft;
      const mu = G * planet.mass;
      const rx = craft.pos.x - planet.pos.x;
      const ry = craft.pos.y - planet.pos.y;
      const vx = craft.vel.x - planet.vel.x;
      const vy = craft.vel.y - planet.vel.y;
      const dist = Math.hypot(rx, ry);
      const vInf = key === 'gravity-assist-lab' ? 0.461 : 0.9;
      const b = key === 'gravity-assist-lab' ? 40 : 18;
      expect(dist).toBeCloseTo(key === 'gravity-assist-lab' ? 4000 : 45, 6);
      // Energy and angular momentum of the encounter: v^2/2 - mu/r = vInf^2/2,
      // and |r x v| = b * vInf.
      expect(0.5 * (vx * vx + vy * vy) - mu / dist).toBeCloseTo(
        0.5 * vInf * vInf,
        9
      );
      expect(Math.abs(rx * vy - ry * vx)).toBeCloseTo(b * vInf, 6);
    }
    // With a star the planet circles it; without one it drifts.
    const helio = world('gravity-assist-heliocentric');
    expect(speed(helio.Planet)).toBeCloseTo(
      Math.sqrt((G * (helio.Star.mass + helio.Planet.mass)) / 500),
      12
    );
    expect(world('gravity-assist-lab').Star).toBeUndefined();
  });
});

describe('slice 3: the laboratories under a share link', () => {
  // A link's settings land after the preset, so a lab can be asked for other
  // masses, separations or phases, a gate closer than periapsis (no spacecraft
  // is made), or a population count the scenario does not use. The fixture
  // holds the world the hand-built blocks made then, one row per body hashed.
  const EDGE = JSON.parse(
    readFileSync('tests/fixtures/scenarioGeometryLabGolden.json', 'utf8')
  );

  test('the cases cover every laboratory, each population count at 0 and 3', () => {
    expect(Object.keys(EDGE).sort()).toEqual([...LAB_EDGE_IDS].sort());
    for (const key of LAB_SCENARIOS)
      expect(
        LAB_EDGE_IDS.filter(id => id.startsWith(`${key}@`)).length
      ).toBeGreaterThanOrEqual(16);
  });

  test.each(LAB_EDGE_IDS)('%s is the world the code made', id => {
    const at = id.indexOf('@');
    const d = digest(id.slice(0, at), 1, JSON.parse(id.slice(at + 1)));
    expect({ ...d, rows: d.rows.map(fnv) }).toEqual(EDGE[id]);
  });

  test('a gate closer than periapsis makes no spacecraft', () => {
    const d = digest('gravity-assist-lab', 1, { assist_gate: 1 });
    expect(d.rows.filter(r => r.startsWith('planets|')).length).toBe(0);
    expect(d.rows.filter(r => r.startsWith('gas_giants|')).length).toBe(1);
  });
});
