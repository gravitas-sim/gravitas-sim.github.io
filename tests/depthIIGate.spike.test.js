// =============================================================================
// Depth II gate, criteria 2 (restoration part) and 5, on the spike only
// -----------------------------------------------------------------------------
// The prototype step of DEPTH_II_GATE.md, laid into Weighing the Stars at the
// quantitative depth, run through js/lesson/runs.js with the harness of
// tests/controlledRuns.test.js (copied below). Never merged.
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
  await gate.loadStage({ starPair: {} });
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

const TOL = JSON.parse(
  (await import('node:fs')).readFileSync(
    new URL('./fixtures/depth-ii/thresholds.json', import.meta.url),
    'utf8'
  )
);

async function laidLesson(depth = 'quantitative') {
  const { layDepth, lessonAt } =
    await import('../js/investigations/depthPure.js');
  const core = Object.values(
    await import('../js/data/investigations/weighing-stars.js')
  ).find(x => x && x.steps);
  const deep = (
    await import('../js/data/investigations/depth/weighing-stars.js')
  ).default;
  return lessonAt(layDepth(core, deep.steps), depth);
}

function hostForLaid(lesson, step, responses = {}) {
  const h = hostFor(step, responses);
  h.steps = () => lesson.steps;
  h.stepId = () => `${lesson.id}:${step.sid}`;
  h.runs.probe = s => s.probe({ barycenter: gate.stagedBarycenter });
  h.runs.stageUp = () => gate.stagedStars().length >= 2;
  return h;
}

function openPair(stage) {
  world.applyShareState({ v: 1, s: 'None', seed: 'depth-ii' });
  physics.setSimulationTime(0);
  app.state.paused = true;
  gate.applyStage(stage, { force: true });
  for (let i = 0; i < 150; i++) render.integrateFrame(0.05);
  app.state.zoom = 1.7;
  app.state.pan = { x: 5, y: -3 };
}

describe('Depth II prototype', () => {
  test('criterion 5: each run reads the arm ratio m1 / m2', async () => {
    const lesson = await laidLesson();
    const step = lesson.steps.find(s => s.sid === 'make-star-a-lighter');
    const { sceneIn } = await import('../js/lesson/runs.js');
    const sc = sceneIn(lesson.steps, step);
    expect(sc.stage.starPair).toMatchObject({ m1: 3, m2: 1 });
    openPair(sc.stage);
    const out = [];
    for (const [i, m1] of step.variation.values.entries()) {
      const rec = await runs.start(hostForLaid(lesson, step), i);
      const ratio = Number(rec.r.find(r => r.r === 'ratio').x);
      const want = m1 / sc.stage.starPair.m2;
      out.push({ m1, ratio, want, off: Math.abs(ratio - want) / want });
    }
    console.log('C5', JSON.stringify(out));
    for (const o of out)
      expect(o.off).toBeLessThanOrEqual(TOL.prototype.toleranceRelative);
  });

  test('criterion 2, restoration part: the pair is put back after each run', async () => {
    const lesson = await laidLesson();
    const step = lesson.steps.find(s => s.sid === 'make-star-a-lighter');
    const { sceneIn } = await import('../js/lesson/runs.js');
    openPair(sceneIn(lesson.steps, step).stage);
    const before = snap();
    for (const i of [0, 1]) {
      await runs.start(hostForLaid(lesson, step), i);
      expectSame(snap(), before);
    }
  });
});
