import { describe, test, expect } from '@jest/globals';

import * as physics from '../js/physics.js';
import { buildWorld } from '../js/world/build.js';
import { applyPreset } from '../js/scenarios.js';
import { DEFAULT_SETTINGS, setScenarioName } from '../js/appState.js';
import { withSeed, parseSeed } from '../js/rng.js';
import { SCENARIO_INFO } from '../js/data/scenarioInfo.js';
import {
  checkPack,
  compileScenarioPack,
  blankPack,
  settingsFromScenario,
  GENERATED_SCENARIOS,
} from '../js/scenarioPack.js';
import { readFileSync } from 'node:fs';
import { parse } from 'acorn';
import {
  FORMAT,
  SETTING_RULES,
  STARTING_PANELS,
  STARTING_TOOLS,
  migrateScenarioPack,
} from '../js/platform/scenario.js';
import {
  packFromOrbitalSystem,
  packBodies,
  scenarioApi,
} from '../js/scenarioPack.js';
import { hashState } from '../js/experiments/canonicalState.js';
import { encodePayload, decodePayload } from '../js/shareState.js';

// =============================================================================
// A scenario pack behaves like the built-in scenario it was made from
// -----------------------------------------------------------------------------
// The claim a pack makes is that it is a scenario like any other: the same
// settings through the same generator under the same seed make the same
// world. This builds every built-in scenario twice - once as the application
// builds it, by name, and once as a pack compiled from that scenario's preset,
// the way the application opens the pack's link - and compares every body.
//
// The two agree exactly for the scenarios whose world is generated from their
// settings, and differ for the ones whose bodies are placed by code in
// js/world/build.js. GENERATED_SCENARIOS is the list of the first kind, and
// this is what keeps it honest in both directions: a scenario on the list
// that stopped matching fails, and so does one off the list that matches.
// =============================================================================

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

const clone = o => JSON.parse(JSON.stringify(o));

/** Every body the engine now holds, as numbers. */
function snapshot() {
  const out = [];
  for (const list of LISTS) {
    for (const b of physics[list]) {
      out.push([
        list,
        b.constructor.name,
        b.pos.x,
        b.pos.y,
        b.vel.x,
        b.vel.y,
        b.mass,
      ]);
    }
  }
  return out;
}

/** Build a world the way initialize_simulation does, with a fixed seed. */
function build(settings, seed, pending) {
  const state = { zoom: 1, pan: { x: 0, y: 0 }, paused: true, frame_count: 0 };
  withSeed(seed, () =>
    buildWorld({
      settings,
      state,
      applyPreset: () => applyPreset(settings, DEFAULT_SETTINGS, state),
      takePendingSettings: () => pending,
      setScenarioName,
      hideObjectInspector: noop,
      showScenarioInfo: noop,
      updateObjectTypeButton: noop,
      computeAreaSweep: noop,
      isAreaSweepSuppressed: () => true,
      regenerateStarfield: noop,
    })
  );
  physics.bumpWorldGeneration();
  return { bodies: snapshot(), zoom: state.zoom };
}

/** The built-in scenario, by name. */
function builtIn(name, seed) {
  const settings = clone(DEFAULT_SETTINGS);
  settings.preset_scenario = name;
  return build(settings, seed, null);
}

/** The same scenario as a pack, opened the way its link is. */
function asPack(name, seed) {
  const pack = blankPack(seed);
  pack.title = { en: name, es: name };
  pack.summary = { en: `${name}, as a pack.`, es: `${name}, como paquete.` };
  pack.settings = settingsFromScenario(name).settings;
  const payload = compileScenarioPack(pack);
  // js/ui.js applyShareState for 'None': the defaults, then the delta.
  const settings = clone(DEFAULT_SETTINGS);
  settings.preset_scenario = 'None';
  setScenarioName('None');
  return {
    pack,
    world: build(settings, parseSeed(payload.seed), payload.d ?? null),
  };
}

describe('a pack made from a built-in scenario', () => {
  const SEED = 0x5ca1ab1e;
  const results = Object.keys(SCENARIO_INFO).map(name => {
    const a = builtIn(name, SEED);
    const { pack, world: b } = asPack(name, SEED);
    return {
      name,
      pack,
      same:
        JSON.stringify(a.bodies) === JSON.stringify(b.bodies) &&
        a.zoom === b.zoom,
      count: a.bodies.length,
    };
  });

  test.each(results.map(r => [r.name, r]))(
    '%s: its pack is valid, and builds the same world exactly when the world is generated',
    (name, r) => {
      expect(checkPack(r.pack)).toEqual([]);
      expect([name, r.same]).toEqual([
        name,
        GENERATED_SCENARIOS.includes(name),
      ]);
    }
  );

  test('the generated scenarios are the ones with no hand-built bodies', () => {
    expect(GENERATED_SCENARIOS.length).toBeGreaterThan(10);
    for (const name of GENERATED_SCENARIOS) {
      expect(Object.keys(SCENARIO_INFO)).toContain(name);
    }
  });
});

// --- The format itself ---------------------------------------------------------
/** A small valid pack to break, one field at a time. */
function goodPack() {
  const p = blankPack(42);
  p.title = { en: 'A star and its planets', es: 'Una estrella y sus planetas' };
  p.summary = {
    en: 'Three planets on circular orbits.',
    es: 'Tres planetas en órbitas circulares.',
  };
  p.settings = { num_planets: 3, placement: 'Circular' };
  return p;
}
const codes = p => checkPack(p).map(e => `${e.path}:${e.code}`);

describe('what a pack may hold', () => {
  test('a small pack is valid', () => {
    expect(checkPack(goodPack())).toEqual([]);
  });

  test('no field it does not know, no code, no markup, no URL', () => {
    expect(codes({ ...goodPack(), script: 'alert(1)' })).toContain(
      'script:unknownField'
    );
    for (const text of [
      '<img src=x onerror=alert(1)>',
      'javascript:alert(1)',
      'see https://example.com',
      'data:text/html,hi',
    ]) {
      const p = goodPack();
      p.title.en = text;
      expect(codes(p)).toContain('title.en:textUnsafe');
    }
  });

  test('every declared locale needs every string', () => {
    const p = goodPack();
    delete p.summary.es;
    expect(codes(p)).toContain('summary.es:textMissing');
  });

  test('settings: only known keys, of the right type, inside their bounds', () => {
    const p = goodPack();
    p.settings = {
      __proto__: null,
      binary_lab_planet_a: 3,
      gravitational_constant: 'strong',
      num_planets: 2.5,
      placement: 'Spiral',
      trail_length: 1e6,
    };
    const c = codes(p);
    expect(c).toContain('settings.binary_lab_planet_a:settingUnknown');
    expect(c).toContain('settings.gravitational_constant:number');
    expect(c).toContain('settings.num_planets:int');
    expect(c).toContain('settings.placement:option');
    expect(c).toContain('settings.trail_length:range');
  });

  test('instruments by id, and only those the rail has', () => {
    const p = goodPack();
    p.open = ['lightCurve', 'spectrograph'];
    p.tools = ['ruler', 'ruler'];
    const c = codes(p);
    expect(c).toContain('open[1]:instrument');
    expect(c).toContain('tools:listRepeat');
  });

  test('a pack with its own bodies does not also generate a population', () => {
    const p = goodPack();
    p.bodies = [
      { type: 'Star', mass: 1, x: 0, y: 0, vx: 0, vy: 0 },
      { type: 'Planet', mass: 1, x: 100, y: 0, vx: 0, vy: 4.47 },
    ];
    expect(codes(p)).toContain('settings.num_planets:populationWithBodies');
    // The defaults generate a black hole, gas giants and asteroids too.
    expect(codes(p)).toContain('settings.num_black_holes:populationWithBodies');
  });

  test('typed bodies are held to the builder’s types and bounds', () => {
    const p = goodPack();
    p.settings = zeroPopulation();
    p.bodies = [
      { type: 'Comet', mass: 1, x: 0, y: 0, vx: 0, vy: 0 },
      { type: 'Star', mass: 50, x: 0, y: 0, vx: 0, vy: 0 },
      { type: 'Planet', mass: 1, x: 2e6, y: 0, vx: 0, vy: 0 },
    ];
    const c = codes(p);
    expect(c).toContain('bodies[0].type:builder.error.type');
    expect(c).toContain('bodies[1].mass:builder.error.massRange');
    expect(c).toContain('bodies[2].x:place.precise.error.range');
  });

  test('a newer version is refused, not guessed at', () => {
    expect(migrateScenarioPack({ format: FORMAT, formatVersion: 2 })).toEqual({
      ok: false,
      code: 'newer',
      vars: { version: 2 },
    });
    expect(migrateScenarioPack({ format: 'gravitas.course-pack' }).ok).toBe(
      false
    );
    expect(migrateScenarioPack(goodPack()).ok).toBe(true);
  });
});

/** Settings with every generated population switched off. */
function zeroPopulation() {
  return {
    placement: 'Empty',
    num_black_holes: 0,
    num_planets: 0,
    num_gas_giants: 0,
    num_asteroids: 0,
    enable_asteroids: false,
  };
}

describe('the option lists are the Settings panel’s', () => {
  // js/ui.js's setting_items is the reader's list of controls. A pack may not
  // name an option the panel would not offer.
  const ast = parse(readFileSync('js/ui.js', 'utf8'), {
    ecmaVersion: 'latest',
    sourceType: 'module',
  });
  let items;
  for (const n of ast.body) {
    if (n.type !== 'VariableDeclaration') continue;
    for (const d of n.declarations) {
      if (d.id.name === 'setting_items') items = d.init.elements;
    }
  }
  const panel = {};
  for (const el of items) {
    const key = el.properties.find(p => p.key.name === 'key')?.value.value;
    const options = el.properties.find(p => p.key.name === 'options');
    if (key && options?.value.type === 'ArrayExpression') {
      panel[key] = options.value.elements.map(e => e.value);
    }
  }
  test.each(
    Object.entries(SETTING_RULES).filter(
      ([key, r]) =>
        r.kind === 'option' && Array.isArray(r.options) && panel[key]
    )
  )('%s', (key, rule) => {
    expect([...rule.options].sort()).toEqual([...panel[key]].sort());
  });

  test('the integrators are the engine’s', () => {
    expect(scenarioApi().integrators).toEqual([...physics.INTEGRATORS]);
  });

  test('every rule names a real setting', () => {
    for (const key of Object.keys(SETTING_RULES)) {
      expect([key, key in DEFAULT_SETTINGS]).toEqual([key, true]);
    }
  });
});

describe('compiling a pack into a link', () => {
  test('a generated pack is a seeded link, and the same pack the same link', async () => {
    const p = goodPack();
    p.open = ['lightCurve'];
    p.tools = ['stopwatch', 'ruler'];
    p.observer = { inclination: 60 };
    const payload = compileScenarioPack(p);
    expect(payload).toMatchObject({
      v: 1,
      s: 'None',
      d: { num_planets: 3, placement: 'Circular' },
      x: { v: 1, inc: 60, open: ['lightCurve'], tools: ['ruler', 'stopwatch'] },
    });
    expect(payload.b).toBeUndefined();
    expect(hashState(compileScenarioPack(p))).toBe(hashState(payload));
    // Through the codec and back, unchanged.
    const again = await decodePayload(await encodePayload(payload));
    expect(again).toEqual(payload);
  });

  test('the seed decides the generated world, and only the seed', () => {
    const world = seed => {
      const p = goodPack();
      p.seed = seed;
      const payload = compileScenarioPack(p);
      const settings = clone(DEFAULT_SETTINGS);
      settings.preset_scenario = 'None';
      return JSON.stringify(
        build(settings, parseSeed(payload.seed), payload.d).bodies
      );
    };
    expect(world(7)).toBe(world(7));
    expect(world(7)).not.toBe(world(8));
  });

  test('an orbital system becomes bodies with their barycenter at rest', () => {
    const file = {
      format: 'gravitas.orbital-system',
      version: 1,
      bodies: [
        { name: 'Sun', type: 'Star', mass: 1 },
        { name: 'Jupiter', type: 'GasGiant', mass: 1, primary: 0, a: 5.2 },
        { name: 'Saturn', type: 'GasGiant', mass: 0.3, primary: 0, a: 9.5 },
      ],
    };
    const r = packFromOrbitalSystem(file);
    expect(r.ok).toBe(true);
    const p = {
      ...r.pack,
      title: goodPack().title,
      summary: goodPack().summary,
    };
    expect(checkPack(p)).toEqual([]);
    const payload = compileScenarioPack(p);
    expect(payload.b.map(b => [b.type, b.name])).toEqual([
      ['StarObject', 'Sun'],
      ['GasGiant', 'Jupiter'],
      ['GasGiant', 'Saturn'],
    ]);
    let px = 0;
    let py = 0;
    let scale = 0;
    for (const b of payload.b) {
      px += b.mass * b.vel.x;
      py += b.mass * b.vel.y;
      scale += b.mass * Math.hypot(b.vel.x, b.vel.y);
    }
    expect(Math.hypot(px, py) / scale).toBeLessThan(1e-9);
    // Every body is kept by the distance cull, and a giant carries its kind.
    expect(payload.b.every(b => b.persistent === true)).toBe(true);
    expect(payload.b[1].giantType).toBeTruthy();
    expect(payload.d.mutual_gravity).toBe(true);
  });

  test('typed bodies keep what was typed, in the unit each class reports', () => {
    const p = goodPack();
    p.settings = zeroPopulation();
    p.bodies = [
      { name: 'A', type: 'Star', mass: 2, x: -50, y: 0, vx: 0, vy: -3 },
      {
        name: 'B',
        type: 'Planet',
        mass: 5,
        x: 80,
        y: 0,
        vx: 0,
        vy: 6,
        radius: 2,
      },
    ];
    expect(checkPack(p)).toEqual([]);
    const [a, b] = packBodies(p).bodies;
    expect(a).toMatchObject({ type: 'StarObject', mass: 2000, massInSuns: 2 });
    expect(a.pos).toEqual({ x: -50, y: 0 });
    expect(b).toMatchObject({ type: 'Planet', massInEarths: 5, radius: 2 });
  });
});

describe('the instruments', () => {
  test('are the rail’s', () => {
    const html = readFileSync('index.html', 'utf8');
    const rail = {
      lightCurve: 'toggleLightCurve',
      radialVelocity: 'toggleRadialVelocity',
      rotationCurve: 'toggleRotationCurve',
      astrometry: 'toggleAstrometry',
      pauseAtEvent: 'togglePauseAtEvent',
      view3d: 'toggle3DView',
      ruler: 'toggleRuler',
      protractor: 'toggleProtractor',
      stopwatch: 'toggleStopwatch',
    };
    for (const id of [...STARTING_PANELS, ...STARTING_TOOLS]) {
      expect([id, html.includes(`id="${rail[id]}"`)]).toEqual([id, true]);
    }
  });
});

describe('a round trip through the SDK', () => {
  test('a Studio export, wrapped, validated, tested and packed, comes back byte for byte', async () => {
    const { run } = await import('../sdk/cli.mjs');
    const { read } = await import('../sdk/lib/archive.mjs');
    const { mkdtempSync, writeFileSync, readdirSync, realpathSync } =
      await import('node:fs');
    const { tmpdir } = await import('node:os');
    const path = (await import('node:path')).default;
    const dir = realpathSync(
      mkdtempSync(path.join(tmpdir(), 'gravitas-pack-'))
    );
    const lines = [];
    const sdk = (...argv) => run(argv, { log: s => lines.push(String(s)) });

    const pack = goodPack();
    pack.id = 'round-trip';
    pack.open = ['lightCurve'];
    // The Studio writes a pack as two-space JSON with a final newline.
    const exported = `${JSON.stringify(pack, null, 2)}\n`;
    const file = path.join(dir, 'round-trip.scenario.json');
    writeFileSync(file, exported);

    const ext = path.join(dir, 'ext');
    expect(
      await sdk(
        'init',
        'scenario-pack',
        'round-trip',
        '--dir',
        ext,
        '--from',
        file
      )
    ).toBe(0);
    expect(await sdk('validate', ext)).toBe(0);
    expect(await sdk('test', ext)).toBe(0);
    const out = path.join(dir, 'out');
    expect(await sdk('pack', ext, '--out', out)).toBe(0);
    const archive = readdirSync(out).find(f => f.endsWith('.gxp'));
    const files = read(readFileSync(path.join(out, archive))).files;
    expect(files.get('scenario.json').toString('utf8')).toBe(exported);
    expect(migrateScenarioPack(JSON.parse(exported)).pack).toEqual(pack);

    // --from is for a scenario pack only.
    expect(
      await sdk(
        'init',
        'course-pack',
        'nope',
        '--dir',
        path.join(dir, 'x'),
        '--from',
        file
      )
    ).toBe(2);
  });
});

describe('the JSON Schema', () => {
  test('names exactly the settings a pack may set', () => {
    const schema = JSON.parse(
      readFileSync('sdk/schemas/scenario-pack-1.schema.json', 'utf8')
    );
    expect(Object.keys(schema.properties.settings.properties).sort()).toEqual(
      Object.keys(SETTING_RULES).sort()
    );
    expect(schema.properties.open.items.enum).toEqual([...STARTING_PANELS]);
    expect(schema.properties.tools.items.enum).toEqual([...STARTING_TOOLS]);
  });
});
