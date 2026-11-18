// =============================================================================
// Controlled runs inside a lesson (js/lesson/runs.js)
// -----------------------------------------------------------------------------
// The run lifecycle (pin, run, read, unpin, restore; cancel; leaving the step),
// the restoration oracle (bodies, clock, settings, camera and stage bookkeeping
// compared directly with the captured full state, never an evidence snapshot),
// determinism at two frame rates, and the analytic check on the first consumer:
// the period of a planet in a staged system goes as 1/sqrt(star mass).
//
// A frame is driven by hand the way render.js's gameLoop drives one: the
// integration step is the pinned one when something pinned it, the measured
// frame otherwise. The measured frame is what the pin exists to remove.
// =============================================================================

import { describe, test, expect, beforeAll, beforeEach } from '@jest/globals';

let world;
let physics;
let render;
let app;
let gate;
let runs;
let timestep;
let units;
let scene;
let problems;

beforeAll(async () => {
  // world.js pulls in the renderer, which wants its canvases at import time.
  const find = globalThis.document.getElementById.bind(globalThis.document);
  globalThis.document.getElementById = id => {
    let el = find(id);
    if (!el) {
      el = globalThis.document.createElement(
        /canvas/i.test(id) ? 'canvas' : 'div'
      );
      el.id = id;
      globalThis.document.body.appendChild(el);
    }
    return el;
  };
  const ctx = new Proxy(
    {},
    {
      get: (t, k) => (k in t ? t[k] : () => ({ addColorStop() {} })),
      set: (t, k, v) => ((t[k] = v), true),
    }
  );
  globalThis.HTMLCanvasElement.prototype.getContext = () => ctx;
  world = await import('../js/world.js');
  physics = await import('../js/physics.js');
  render = await import('../js/render.js');
  app = await import('../js/appState.js');
  // The interface registers these on the command bus; a test registers the two it needs.
  app.registerCommands({
    captureShareState: world.captureShareState,
    applyShareState: world.applyShareState,
  });
  timestep = await import('../js/timestep.js');
  units = await import('../js/units.js');
  scene = await import('../js/lessonScene.js');
  const i18n = await import('../js/i18n/index.js');
  i18n.registerMessages(
    'en',
    (await import('../js/i18n/en.deferred.js')).EN_DEFERRED
  );
  problems = (await import('../tools/authoring/variationRules.mjs'))
    .variationProblems;
  const held = await import('../js/lesson/held.js');
  runs = await import('../js/lesson/runs.js');
  // What stepView.js hands the module: its words and helpers.
  runs.setKit({
    announce: () => {},
    escape: x => String(x).replace(/&/g, '&amp;').replace(/</g, '&lt;'),
    formatNumber: (await import('../js/format.js')).formatNumber,
    lessonText: x => x,
    predictionState: held.predictionState,
    t: i18n.t,
  });
  gate = await import('../js/lesson/stageGate.js');
  await gate.loadStage({ system: {} });
});

/** Days of simulated time that are `frames` pinned frames. */
const daysFor = frames =>
  (frames *
    timestep.frameAdvance(
      timestep.STEP_SECONDS,
      app.SETTINGS.sim_speed,
      physics.DT
    ) *
    units.timeUnitSeconds()) /
  86400;

const SYSTEM = mass => ({
  system: {
    starName: 'Sun',
    ...(mass === undefined ? {} : { starMassSun: mass }),
    planets: [{ name: 'Earth', role: 'earth', aAU: 1, ecc: 0 }],
  },
});

/** A measure step that declares a variation of the star's mass. */
const stepFor = (frames = 400, values = [1, 4]) => ({
  sid: 'run-a',
  type: 'measure',
  stage: SYSTEM(1),
  probe: () => [
    {
      id: 'x',
      label: 'Planet x',
      value: (physics.planets[0]?.pos.x ?? 0).toFixed(3),
    },
    { id: 'clock', label: 'Clock', value: String(physics.getSimulationTime()) },
  ],
  variation: {
    param: 'starMassSun',
    values,
    runFor: daysFor(frames),
    read: ['x', 'clock'],
    label: 'Star mass',
  },
});

/** The host a lesson hands the module, with a saved record of its own. */
const hostFor = (step, responses = {}) => ({
  currentStep: () => step,
  steps: () => [step],
  stepId: () => 'L:run-a',
  els: () => ({ body: globalThis.document.createElement('div') }),
  responses: () => responses,
  save() {},
  visited: () => new Set(),
  paint() {},
  runs: {
    probe: s => s.probe({}),
    payloadFromSetup: () => {
      throw new Error('a stage run builds no setup');
    },
    applyLocks() {},
    bind() {},
    stageUp: () => gate.stagedStars().length > 0,
    // The same names js/investigations.js hands over as `runWorld`.
    world: {
      SETTINGS: app.SETTINGS,
      STEP_SECONDS: timestep.STEP_SECONDS,
      adoptStage: gate.adoptStage,
      allBodies: scene.allBodies,
      applyShareState: world.applyShareState,
      applyStage: gate.applyStage,
      captureShareState: world.captureShareState,
      getSimulationTime: physics.getSimulationTime,
      selectBody: scene.selectBody,
      setFixedStep: render.setFixedStep,
      setSimulationTime: physics.setSimulationTime,
      stageMemo: gate.stageMemo,
      state: app.state,
      timeUnitSeconds: units.timeUnitSeconds,
      frameSeconds: () =>
        timestep.frameAdvance(
          timestep.STEP_SECONDS,
          app.SETTINGS.sim_speed,
          physics.DT
        ),
    },
  },
});

/**
 * Frames driven like the game loop: the pinned step when pinned, else the
 * measured frame at `fps`. `each` sees the world after every frame.
 */
function drive({ fps = 60, each = () => {}, after = Infinity, onAfter } = {}) {
  let fixed = 0;
  let frame = 0;
  runs.setEnv({
    pin: s => (fixed = s),
    raf: cb =>
      Promise.resolve().then(() => {
        frame++;
        if (!app.state.paused) {
          render.integrateFrame(
            timestep.frameAdvance(
              fixed || 1 / fps,
              app.SETTINGS.sim_speed,
              physics.DT
            )
          );
        }
        each(frame);
        if (frame === after) onAfter?.();
        cb();
      }),
  });
  return { pinned: () => fixed };
}

/** Everything a restore has to give back, in a form that compares. */
function snap() {
  const bodies = [
    ...physics.bh_list,
    ...physics.stars,
    ...physics.planets,
    ...physics.gas_giants,
    ...physics.asteroids,
    ...physics.comets,
    ...physics.neutron_stars,
    ...physics.white_dwarfs,
  ]
    .map(b => ({ id: b.id, ...JSON.parse(JSON.stringify(b.get_state())) }))
    .sort((a, b) => a.id - b.id);
  return {
    bodies,
    clock: physics.getSimulationTime(),
    settings: JSON.parse(JSON.stringify(app.SETTINGS)),
    camera: { zoom: app.state.zoom, pan: { ...app.state.pan } },
    paused: app.state.paused,
    stage: gate.stagedStars().map(e => [e.role, e.star.id]),
    key: gate.stageKey(),
  };
}

/** Deep equality with numbers compared to the share link's 12 significant digits. */
function expectSame(a, b, path = 'state') {
  if (typeof a === 'number' && typeof b === 'number') {
    const scale = Math.max(Math.abs(a), Math.abs(b), 1e-300);
    expect({ path, off: Math.abs(a - b) / scale }).toEqual({
      path,
      off: expect.any(Number),
    });
    expect(Math.abs(a - b) <= 1e-11 * scale || Math.abs(a - b) < 1e-12).toBe(
      true
    );
    return;
  }
  if (a && typeof a === 'object') {
    expect(Object.keys(a).sort()).toEqual(Object.keys(b).sort());
    for (const k of Object.keys(a)) expectSame(a[k], b[k], `${path}.${k}`);
    return;
  }
  expect({ path, v: a }).toEqual({ path, v: b });
}

/** A staged scene the student has already let run a little, camera moved. */
function openScene(step) {
  world.applyShareState({ v: 1, s: 'None', seed: 'runs' });
  physics.setSimulationTime(0);
  app.state.paused = true;
  gate.applyStage(step.stage, { force: true });
  for (let i = 0; i < 150; i++) render.integrateFrame(0.05);
  app.state.zoom = 2.5;
  app.state.pan = { x: 12, y: -7 };
}

beforeEach(() => {
  runs.release();
  drive();
});

describe('the declaration', () => {
  test('a step that can run has no problems', () => {
    const step = stepFor();
    expect(problems(step, [step])).toEqual([]);
  });

  test.each([
    ['a second parameter', s => (s.variation.also = 'm2'), /one parameter/],
    ['one value', s => (s.variation.values = [1]), /2 to 4/],
    ['five values', s => (s.variation.values = [1, 2, 3, 4, 5]), /2 to 4/],
    ['a repeated value', s => (s.variation.values = [1, 1]), /distinct/],
    [
      'a parameter the scene lacks',
      s => (s.variation.param = 'bh_mass'),
      /not a numeric key/,
    ],
    ['no duration', s => (s.variation.runFor = 0), /runFor/],
    ['nothing to read', s => (s.variation.read = []), /read lists/],
    ['no label', s => (s.variation.label = ''), /label/],
  ])('refuses %s', (_, mutate, message) => {
    const step = stepFor();
    mutate(step);
    expect(problems(step, [step]).join(' ')).toMatch(message);
  });

  test('a row the probe does not have is named', () => {
    const step = stepFor();
    step.variation.read = ['x', 'nope'];
    expect(problems(step, [step]).join(' ')).toMatch(/no row "nope"/);
  });

  test('no shipped lesson declares a variation that cannot run', async () => {
    const { loadAuthoringInputs } =
      await import('../tools/authoring/inputs.mjs');
    const { variationFindings } =
      await import('../tools/authoring/variationRules.mjs');
    expect(variationFindings(await loadAuthoringInputs())).toEqual([]);
  });

  test('a deeper step names a key of the scene in force', () => {
    const base = stepFor();
    const deeper = {
      sid: 'deeper',
      probe: base.probe,
      variation: { ...base.variation },
    };
    const steps = [base, deeper];
    expect(problems(deeper, steps)).toEqual([]);
  });

  test('a setup setting is found, and a staged scene refuses it', () => {
    const setup = {
      sid: 's',
      probe: () => [{ id: 'x' }],
      setup: { scenario: 'Solar System', settings: { sim_speed: 2 } },
      variation: {
        param: 'sim_speed',
        values: [1, 2],
        runFor: 1,
        read: ['x'],
        label: 'Speed',
      },
    };
    expect(problems(setup, [setup])).toEqual([]);
    const both = { ...setup, stage: SYSTEM(1) };
    expect(problems(both, [both]).join(' ')).toMatch(/not a numeric key/);
  });
});

describe('the unchanged default (item 2)', () => {
  test('a system stage without starMassSun is the solar-mass stage it was', () => {
    world.applyShareState({ v: 1, s: 'None', seed: 'runs' });
    gate.applyStage(SYSTEM(), { force: true });
    const a = snap();
    gate.applyStage(SYSTEM(1), { force: true });
    const b = snap();
    // Ids are minted per build; everything else about the bodies is equal.
    const bare = list => list.map(x => ({ ...x, id: 0 }));
    expect(bare(a.bodies)).toEqual(bare(b.bodies));
    const [star] = physics.stars;
    expect(star.mass).toBe(physics.SOLAR_MASS_UNIT);
    expect(star.massInSuns).toBe(1);
    const [planet] = physics.planets;
    const G = physics.getPhysicsSetting('gravitational_constant');
    // Circular at 1 AU (100 units): v = sqrt(G M / r), as before.
    expect(Math.hypot(planet.vel.x, planet.vel.y)).toBeCloseTo(
      Math.sqrt((G * physics.SOLAR_MASS_UNIT) / 100),
      12
    );
  });

  test('a declared mass scales the star and the launch speed', () => {
    world.applyShareState({ v: 1, s: 'None', seed: 'runs' });
    gate.applyStage(SYSTEM(4), { force: true });
    expect(physics.stars[0].massInSuns).toBe(4);
    expect(physics.stars[0].mass).toBe(4 * physics.SOLAR_MASS_UNIT);
    const G = physics.getPhysicsSetting('gravitational_constant');
    expect(Math.hypot(...Object.values(physics.planets[0].vel))).toBeCloseTo(
      Math.sqrt((G * 4 * physics.SOLAR_MASS_UNIT) / 100),
      12
    );
  });
});

describe('a run', () => {
  test('pins the step for the run only, reads the rows and records them', async () => {
    const step = stepFor(300);
    openScene(step);
    const d = drive();
    const responses = {};
    const record = await runs.start(hostFor(step, responses), 1);
    expect(d.pinned()).toBe(0);
    expect(record.v).toBe(4);
    expect(record.f).toBe(300);
    expect(record.r.map(x => x.r)).toEqual(['x', 'clock']);
    expect(record.r[0].l).toBe('Planet x');
  });

  test('pins the step while it runs', async () => {
    const step = stepFor(50);
    openScene(step);
    const d = drive({ each: f => f === 10 && seen.push(d.pinned()) });
    const seen = [];
    await runs.start(hostFor(step), 0);
    expect(seen).toEqual([timestep.STEP_SECONDS]);
  });

  test('refuses to start while one is under way, and with a bad declaration', async () => {
    const step = stepFor(50);
    openScene(step);
    const h = hostFor(step);
    const first = runs.start(h, 0);
    expect(await runs.start(h, 1)).toBeNull();
    expect(await first).not.toBeNull();
    step.variation.values = [1];
    expect(await runs.start(h, 0)).toBeNull();
  });

  test('refuses when the step’s scene is not on screen', async () => {
    const step = stepFor(50);
    world.applyShareState({ v: 1, s: 'None', seed: 'runs' });
    gate.applyStage({}, { force: true });
    expect(await runs.start(hostFor(step), 0)).toBeNull();
  });
});

describe('the scene is put back (restoration)', () => {
  test('after a completed run', async () => {
    const step = stepFor(300);
    openScene(step);
    const before = snap();
    await runs.start(hostFor(step), 1);
    expect(runs.running()).toBe(false);
    expectSame(snap(), before);
  });

  test('after a cancelled run', async () => {
    const step = stepFor(600);
    openScene(step);
    const before = snap();
    const h = hostFor(step);
    drive({ after: 40, onAfter: () => runs.release() });
    const result = await runs.start(h, 1);
    expect(result).toBeNull();
    expectSame(snap(), before);
  });

  test('on leaving the step mid-run, and the stage is the original one', async () => {
    const step = stepFor(600);
    openScene(step);
    const before = snap();
    drive({ after: 25, onAfter: () => runs.release() });
    await runs.start(hostFor(step), 1);
    const after = snap();
    expectSame(after, before);
    // The stage stands on the restored bodies, not on the varied ones.
    for (const [, id] of after.stage)
      expect(after.bodies.some(b => b.id === id)).toBe(true);
    expect(
      gate
        .stagedStars()
        .every(
          e =>
            physics.stars.includes(e.star) || physics.planets.includes(e.star)
        )
    ).toBe(true);
  });

  test('the selected body is selected again', async () => {
    const step = stepFor(100);
    openScene(step);
    const planet = physics.planets[0];
    const chosen = [];
    scene.setSelector(body => chosen.push(body.id));
    app.state.selectedObject = { object: planet, type: 'planet' };
    await runs.start(hostFor(step), 1);
    expect(chosen).toEqual([planet.id]);
  });

  test('a second run after a restore starts from the restored scene', async () => {
    const step = stepFor(300);
    openScene(step);
    const h = hostFor(step);
    const a = await runs.start(h, 1);
    const b = await runs.start(h, 1);
    expect(b).toEqual(a);
  });
});

describe('reproducibility', () => {
  const read = async () => {
    const step = stepFor(500);
    openScene(step);
    return runs.start(hostFor(step), 1);
  };

  test('the same run twice gives identical readings', async () => {
    expect(await read()).toEqual(await read());
  });

  test('a pinned run gives equal readings at 30 and at 144 frames per second', async () => {
    drive({ fps: 30 });
    const slow = await read();
    drive({ fps: 144 });
    const fast = await read();
    expect(fast).toEqual(slow);
  });

  test('without the pin the same scene would not (the measured frame leaks in)', async () => {
    const run = fps => {
      world.applyShareState({ v: 1, s: 'None', seed: 'runs' });
      gate.applyStage(stepFor().stage, { force: true });
      physics.setSimulationTime(0);
      let x;
      const frames = 300;
      for (let i = 0; i < frames; i++)
        render.integrateFrame(
          timestep.frameAdvance(1 / fps, app.SETTINGS.sim_speed, physics.DT)
        );
      x = physics.planets[0].pos.x;
      return x;
    };
    expect(run(30)).not.toBeCloseTo(run(144), 3);
  });
});

describe('the analytic check: period goes as 1/sqrt(star mass)', () => {
  /** The simulated time of the planet's first return to its starting ray. */
  async function period(mass) {
    const step = stepFor(5000, [1, 4]);
    step.stage = SYSTEM(1);
    world.applyShareState({ v: 1, s: 'None', seed: 'runs' });
    gate.applyStage(step.stage, { force: true });
    physics.setSimulationTime(0);
    app.state.paused = true;
    let last = null;
    let t = null;
    drive({
      each: () => {
        const p = physics.planets[0];
        if (!p || !app.state.paused === false) return;
        const now = physics.getSimulationTime();
        // Upward crossing of y = 0 on the +x side: one lap since the start,
        // which is at apoapsis on the +x axis moving +y.
        if (last && last.y < 0 && p.pos.y >= 0 && p.pos.x > 0 && t === null)
          t = last.t + ((now - last.t) * -last.y) / (p.pos.y - last.y);
        last = { y: p.pos.y, t: now };
      },
    });
    await runs.start(hostFor(step), mass === 1 ? 0 : 1);
    return t;
  }

  test('quadrupling the star mass halves the period', async () => {
    const t1 = await period(1);
    const t4 = await period(4);
    expect(t1).toBeGreaterThan(0);
    expect(t4).toBeGreaterThan(0);
    // The step's own tolerance for a period is a percent.
    expect(Math.abs(t1 / t4 - 2) / 2).toBeLessThan(0.01);
  });
});

describe('saved runs and the table', () => {
  const body = step => {
    const el = globalThis.document.createElement('div');
    const c = {
      id: 'L:run-a',
      responses: {},
      active: { steps: [step] },
      visited: new Set(),
    };
    return { el, c };
  };

  test('before a prediction is committed the buttons are disabled with a sentence', () => {
    const step = { ...stepFor(), reveal: 'later' };
    const { c } = body(step);
    c.active = { steps: [step, { sid: 'later' }] };
    const html = runs.markup(step, c);
    expect(html).toMatch(/data-run-go disabled/);
    expect(html).toMatch(/Make your prediction first/);
  });

  test('once committed the run is available, even while the answer is held', () => {
    const step = { ...stepFor(), sid: 'p', reveal: 'later' };
    step.variation = stepFor().variation;
    const { c } = body(step);
    c.id = 'L:p';
    c.active = { steps: [step, { sid: 'later' }] };
    c.responses['L:p'] = 1;
    const html = runs.markup(step, c);
    expect(html).not.toMatch(/data-run-go disabled/);
    expect(html).toMatch(/Run A/);
  });

  test('a saved run shows as a table row and the next run needs a change first', () => {
    const step = stepFor();
    const { c } = body(step);
    c.responses['L:run-a:run:1'] = JSON.stringify({
      v: 1,
      f: 400,
      r: [
        { r: 'x', l: 'Planet x', x: '100.000' },
        { r: 'clock', l: 'Clock', x: '33' },
      ],
    });
    const html = runs.markup(step, c);
    expect(html).toMatch(
      /<th scope="row"[^>]*>A<\/th><td>1.00<\/td><td>100.000<\/td>/
    );
    expect(html).toMatch(/data-run-go disabled/);
    expect(html).toMatch(/Change Star mass before the next run/);
    expect(html).toMatch(/Run B/);
  });

  test('a step with no variation carries nothing', () => {
    expect(runs.markup({ sid: 'x' }, { id: 'L:x', responses: {} })).toBe('');
  });

  test('runsOf reads only well-formed rows, in order', () => {
    const r = {
      'L:s:run:2': JSON.stringify({ v: 4, r: [] }),
      'L:s:run:1': JSON.stringify({ v: 1, r: [] }),
      'L:s:run:3': 'not json',
    };
    expect(runs.runsOf(r, 'L:s').map(x => x.v)).toEqual([1, 4]);
  });
});

describe('a run through a setup setting', () => {
  const SETUP = {
    scenario: 'Solar System',
    seed: 'kepler-lab',
    settings: {
      enable_asteroids: false,
      num_asteroids: 0,
      num_comets: 0,
      gravitational_constant: 2,
    },
    paused: false,
  };
  const step = {
    sid: 'run-s',
    type: 'measure',
    setup: SETUP,
    probe: () => [
      {
        id: 'g',
        label: 'G',
        value: String(app.SETTINGS.gravitational_constant),
      },
    ],
    variation: {
      param: 'gravitational_constant',
      values: [2, 8],
      runFor: 1,
      read: ['g'],
      label: 'Gravity',
    },
  };

  test('the declaration finds a setup setting', () => {
    expect(problems(step, [step])).toEqual([]);
  });

  test('runs with the setting changed and puts the whole world back', async () => {
    const { formatSeed, normalizeSeed } = await import('../js/rng.js');
    world.applyShareState({
      v: 1,
      s: SETUP.scenario,
      seed: formatSeed(normalizeSeed(SETUP.seed)),
      d: { ...SETUP.settings },
    });
    for (let i = 0; i < 60; i++) render.integrateFrame(0.05);
    app.state.paused = true;
    app.state.zoom = 3.25;
    const before = snap();
    const bound = [];
    const h = hostFor(step);
    // js/investigations.js payloadFromSetup, which a test cannot import whole.
    h.runs.payloadFromSetup = s => ({
      v: 1,
      s: s.scenario,
      seed: formatSeed(normalizeSeed(s.seed ?? s.scenario)),
      d: { ...s.settings },
      ...(s.paused ? { p: 1 } : {}),
    });
    h.runs.bind = () => bound.push('bind');
    h.runs.stageUp = () => true;
    let seen = null;
    drive({ each: () => (seen ??= app.SETTINGS.gravitational_constant) });
    const record = await runs.start(h, 1);
    expect(seen).toBe(8);
    expect(record.v).toBe(8);
    expect(record.r[0].x).toBe('8');
    expectSame(snap(), before);
    expect(app.SETTINGS.gravitational_constant).toBe(2);
    // Roles are bound again on the restored world.
    expect(bound.length).toBeGreaterThanOrEqual(2);
  });
});

describe('the Spanish shadow of a step with a variation', () => {
  test('translates the label and leaves the parameter and the rows alone', async () => {
    const { mergeTranslation, translationCoverage } =
      await import('../js/data/investigations/i18n.js');
    const base = { variation: stepFor().variation };
    const shadow = {
      variation: {
        param: 'masa',
        read: ['x', 'y'],
        label: 'Masa de la estrella',
      },
    };
    const merged = mergeTranslation(base, shadow);
    expect(merged.variation.label).toBe('Masa de la estrella');
    expect(merged.variation.param).toBe('starMassSun');
    expect(merged.variation.read).toEqual(['x', 'clock']);
    expect(merged.variation.runFor).toBe(base.variation.runFor);
    // Only the label is a word a translator owes.
    expect(translationCoverage(base, {}).missing).toEqual(['variation.label']);
  });
});
