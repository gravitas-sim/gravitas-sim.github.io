// =============================================================================
// Declarative scenario geometry (Roadmap II Prompt 108, slice 1)
// -----------------------------------------------------------------------------
// Six built-in scenarios are no longer placed by code in js/world/build.js:
// SCENARIO_GEOMETRY (js/scenarios.js) declares their bodies, and this holds the
// declaration to the world the code made.
//
//   1. Every construct has a validator that accepts what it should and names
//      the field it refuses (validateGeometry, js/platform/scenario.js).
//   2. The arithmetic of each construct is the textbook's, checked against the
//      closed forms (circular speed, periapsis speed) and not only against the
//      code it replaced.
//   3. The world each converted scenario builds is the world the code built,
//      body for body, at seven seeds, with the generator in the same place in
//      its sequence afterwards. tests/fixtures/scenarioGeometryGolden.json was
//      made from the hand-built blocks before they were deleted; the
//      Playwright world golden (e2e/golden/world-construction.json) holds the
//      same scenarios in the browser at its own seed.
//   4. A pack can carry the geometry, and builds the same bodies as the
//      built-in does (to the twelve figures a written world keeps).
// =============================================================================

import { readFileSync } from 'node:fs';
import {
  SCENARIO_GEOMETRY,
  SCENARIO_IDS,
  expandGeometry,
  applyPreset,
} from '../js/scenarios.js';
import { validateScenarioPack } from '../js/platform/scenario.js';
import {
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
import { buildWorld } from '../js/world/build.js';
import { DEFAULT_SETTINGS, setScenarioName } from '../js/appState.js';
import { withSeed } from '../js/rng.js';
import { buildPackWorld, worldSnapshot } from '../js/scenarioPackWorld.js';

const clone = o => JSON.parse(JSON.stringify(o));
const noop = () => {};
const LISTS = [
  'bh_list',
  'stars',
  'planets',
  'gas_giants',
  'asteroids',
  'comets',
  'neutron_stars',
  'white_dwarfs',
  'galaxies',
  'debris',
];
const num = v =>
  typeof v === 'number' && Number.isFinite(v)
    ? Number(v.toPrecision(12))
    : String(v);
const fnv = str => {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
};

/** Build a scenario under a seed, and digest it the way the fixture was. */
function digest(key, seed) {
  const settings = clone(DEFAULT_SETTINGS);
  settings.preset_scenario = key;
  const state = { zoom: 1, pan: { x: 0, y: 0 }, paused: true, frame_count: 0 };
  let tail;
  withSeed(seed, () => {
    buildWorld({
      settings,
      state,
      applyPreset: () => applyPreset(settings, DEFAULT_SETTINGS, state),
      takePendingSettings: () => null,
      setScenarioName,
      hideObjectInspector: noop,
      showScenarioInfo: noop,
      updateObjectTypeButton: noop,
      computeAreaSweep: noop,
      isAreaSweepSuppressed: () => true,
      regenerateStarfield: noop,
    });
    tail = Math.random();
  });
  const rows = [];
  for (const l of LISTS) {
    physics[l].forEach((b, i) =>
      rows.push(
        [
          l,
          i,
          b.constructor.name,
          b.id,
          b.name,
          num(b.mass),
          num(b.radius),
          num(b.pos.x),
          num(b.pos.y),
          num(b.vel.x),
          num(b.vel.y),
          b.persistent ? 'P' : '',
          b.baseColor ?? '',
          num(b.massInSuns),
          num(b.massInEarths),
          num(b.massInJupiters),
          b.intact,
          b.alive,
        ].join('|')
      )
    );
  }
  const sset = Object.keys(settings)
    .filter(k => k !== 'quality_tier')
    .sort()
    .map(k => `${k}=${JSON.stringify(settings[k])}`)
    .join('\n');
  return {
    rows,
    settings: fnv(sset),
    zoom: num(state.zoom),
    pan: [num(state.pan.x), num(state.pan.y)],
    tail,
  };
}

const GOLDEN = JSON.parse(
  readFileSync('tests/fixtures/scenarioGeometryGolden.json', 'utf8')
);

describe('the declared scenarios build the world the code built', () => {
  test('the fixture covers every declared scenario at seven seeds', () => {
    const keys = Object.keys(SCENARIO_GEOMETRY).sort();
    expect(keys).toEqual([
      'broken-laplace-resonance',
      'galilean-resonance',
      'jupiter-trojans',
      'keplers-2nd-law',
      'pluto-and-neptune',
      'retrograde-mars',
    ]);
    expect(Object.keys(GOLDEN).length).toBe(keys.length * 7);
    for (const key of keys) expect(SCENARIO_IDS).toContain(key);
  });

  test.each(Object.keys(GOLDEN))(
    '%s: bodies, ids, names, settings, camera and the generator',
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
    for (const [key, g] of Object.entries(SCENARIO_GEOMETRY)) {
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
    expect(Object.keys(GEOMETRY_RULES)).toEqual(['published-system']);
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

  test('the scenarios a pack can carry are the ones declared without a rule', () => {
    expect([...GEOMETRY_SCENARIOS].sort()).toEqual([
      'keplers-2nd-law',
      'retrograde-mars',
    ]);
    for (const name of [
      'galilean-resonance',
      'broken-laplace-resonance',
      'pluto-and-neptune',
      'jupiter-trojans',
    ]) {
      expect(geometryFromScenario(name)).toBeNull();
    }
    expect(geometryFromScenario('solar-system')).toBeNull();
  });

  test.each(GEOMETRY_SCENARIOS)(
    '%s: valid, and the same bodies as the built-in',
    name => {
      const pack = asPack(name);
      expect(checkPack(pack)).toEqual([]);
      const { bodies } = packBodies(pack);
      expect(bodies.length).toBe(SCENARIO_GEOMETRY[name].steps.length);
      const built = digest(name, 1);
      // Built-in rows: list|i|class|id|name|mass|radius|x|y|vx|vy|...
      const rows = built.rows.map(r => r.split('|'));
      expect(rows.length).toBe(bodies.length);
      const world = buildPackWorld(pack);
      expect(world.bodies).toBe(bodies.length);
      // Every field the built-in's rows carry, by body name: class, name,
      // contact radius, color, persistence, mass, position and velocity.
      const near = (a, b) =>
        Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b));
      const live = LISTS.flatMap(l => physics[l]);
      expect(live.length).toBe(rows.length);
      for (const r of rows) {
        const [, , cls, , name, mass, radius, x, y, vx, vy, flag, color] = r;
        const b = live.find(o => o.name === name);
        expect([name, b?.constructor.name]).toEqual([name, cls]);
        expect([name, near(b.radius, Number(radius))]).toEqual([name, true]);
        expect([name, b.baseColor ?? '']).toEqual([name, color]);
        expect([name, b.persistent ? 'P' : '']).toEqual([name, flag]);
        expect([name, near(b.mass, Number(mass))]).toEqual([name, true]);
        expect([
          name,
          near(b.pos.x, Number(x)),
          near(b.pos.y, Number(y)),
        ]).toEqual([name, true, true]);
        expect([
          name,
          near(b.vel.x, Number(vx)),
          near(b.vel.y, Number(vy)),
        ]).toEqual([name, true, true]);
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
