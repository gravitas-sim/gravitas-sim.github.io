// =============================================================================
// Lesson steps and the pinned integration step (docs/lesson-step-pins.md)
// -----------------------------------------------------------------------------
// The pin contract (js/timestep.js setFixedStep, js/lesson/stageGate.js
// pinLessonStep): each owner lifts only its own pin, a lesson pins the bench's
// 1/60 s for a running step on a scene the integrator moves, and closing the
// lesson lifts it. Then the lessons: the table is current, every setup step
// declares its speed and start state, every step that waits for an event gets
// it within 20 s at its declared speed, and for each lesson whose central
// reading comes from the engine, that reading's scene run at 60 and at 144
// frames per second under the lesson's pin is the same scene, and the same as
// the bench's run of as many frames.
//
// Frames are driven by the game loop's own arithmetic (js/render.js gameLoop):
// the pinned frame time when something pinned it, the measured frame otherwise.
// =============================================================================

import { describe, test, expect, beforeAll, afterEach } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { INVESTIGATIONS } from '../js/data/investigations.js';
import { canvasAt } from '../js/lesson/canvasKind.js';

let world, physics, render, app, timestep, scene, gate, orbital, watch, events;
let rng, pins;

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
  timestep = await import('../js/timestep.js');
  scene = await import('../js/lessonScene.js');
  orbital = await import('../js/orbital.js');
  watch = await import('../js/investigations/eventWatch.js');
  events = await import('../js/pauseAtEvent.js');
  rng = await import('../js/rng.js');
  pins = await import('../tools/lesson-step-pins.mjs');
  gate = await import('../js/lesson/stageGate.js');
  await gate.loadStage({ system: {} });
});

afterEach(() => {
  for (const owner of ['bench', 'runs', 'lesson'])
    timestep.setFixedStep(0, owner);
});

/** One frame as the game loop takes it, at a display of `fps`. */
const frame = fps =>
  render.integrateFrame(
    timestep.frameAdvance(
      timestep.pinnedStep() || 1 / fps,
      app.SETTINGS.sim_speed,
      physics.DT
    )
  );

/** The setup step in force at step `i`, as js/investigations.js finds it. */
function setupStepAt(inv, i) {
  if (canvasAt(inv, i)?.kind === 'quiet') return null;
  for (let j = i; j >= 0; j--) if (inv.steps[j].setup) return inv.steps[j];
  return null;
}

/**
 * Build a step's scene as the lesson does, at its declared speed.
 * @returns {{stage: ?object, setup: ?object, speed: number}} What was built
 */
async function build(inv, i) {
  const step = inv.steps[i];
  const stage = gate.stageOf(inv.steps, step);
  const at = stage ? null : setupStepAt(inv, i);
  if (stage) {
    world.applyShareState({ v: 1, s: 'None', seed: 'pins' });
    await gate.loadStage(stage);
    gate.applyStage(stage, { force: true });
  } else {
    const { setup } = at;
    world.applyShareState({
      v: 1,
      s: setup.scenario,
      seed: rng.formatSeed(rng.normalizeSeed(setup.seed ?? setup.scenario)),
      ...(setup.settings ? { d: { ...setup.settings } } : {}),
    });
  }
  const speed = step.time?.speed ?? at?.time?.speed ?? app.SETTINGS.sim_speed;
  app.SETTINGS.sim_speed = speed;
  physics.updatePhysicsSettings(app.SETTINGS);
  physics.setSimulationTime(0);
  return { stage, setup: at?.setup ?? null, speed };
}

/** Every body's state and the clock, in a form that compares exactly. */
const state = () => ({
  t: physics.getSimulationTime(),
  bodies: scene
    .allBodies()
    .map(b => [b.name, b.pos.x, b.pos.y, b.vel.x, b.vel.y, b.mass]),
});

describe('the pin contract', () => {
  test('each owner lifts only its own pin', () => {
    expect(timestep.pinnedStep()).toBe(0);
    timestep.setFixedStep(1 / 60, 'lesson');
    timestep.setFixedStep(1 / 60); // the bench records
    timestep.setFixedStep(0); // and stops
    expect(timestep.pinnedStep()).toBe(1 / 60);
    timestep.setFixedStep(1 / 60, 'runs');
    timestep.setFixedStep(0, 'runs');
    expect(timestep.pinnedStep()).toBe(1 / 60);
    timestep.setFixedStep(0, 'lesson');
    expect(timestep.pinnedStep()).toBe(0);
  });

  test('render.js hands out the same setFixedStep: one path', () => {
    expect(render.setFixedStep).toBe(timestep.setFixedStep);
  });

  test('a lesson pins a running step on an integrated scene, and lifts it on close', () => {
    const setup = { scenario: 'Solar System' };
    gate.pinLessonStep({ type: 'measure' }, null, null, setup);
    expect(timestep.pinnedStep()).toBe(timestep.STEP_SECONDS);
    // A reading step holds the clock: nothing runs, nothing to pin.
    gate.pinLessonStep({ type: 'read' }, null, null, setup);
    expect(timestep.pinnedStep()).toBe(0);
    // ...and still does when its declared time starts paused (the next step
    // lets go); one whose time starts running needs the clock, and is pinned.
    const read = time => ({ type: 'read', time });
    gate.pinLessonStep(read({ speed: 5, paused: true }), null, null, setup);
    expect(timestep.pinnedStep()).toBe(0);
    gate.pinLessonStep(read({ speed: 5, paused: false }), null, null, setup);
    expect(timestep.pinnedStep()).toBe(timestep.STEP_SECONDS);
    gate.pinLessonStep(null);
    expect(timestep.pinnedStep()).toBe(0);
  });

  test('quiet canvases, portraits, display stages and prescribed binaries are not pinned', () => {
    const step = { type: 'measure' };
    const setup = { scenario: 'Solar System' };
    for (const [canvas, stage] of [
      ['quiet', null],
      ['portrait', null],
      [null, { stars: [] }],
      [null, { binary: {} }],
      [null, { gwSource: {} }],
    ]) {
      gate.pinLessonStep(step, canvas, stage, setup);
      expect(timestep.pinnedStep()).toBe(0);
    }
    for (const kind of ['starPair', 'hole', 'equalMass', 'system']) {
      gate.pinLessonStep(step, 'scene', { [kind]: {} }, null);
      expect(timestep.pinnedStep()).toBe(timestep.STEP_SECONDS);
    }
  });
});

describe('the lessons', () => {
  test('docs/lesson-step-pins.md is the table the rule gives today', () => {
    const have = readFileSync(
      new URL('../docs/lesson-step-pins.md', import.meta.url),
      'utf8'
    );
    expect(have).toBe(pins.render());
  });

  test('every setup step declares its speed (its setup’s) and whether it starts paused', () => {
    const wrong = [];
    for (const inv of INVESTIGATIONS)
      for (const step of inv.steps) {
        if (!step.setup) continue;
        const t = step.time;
        if (
          !(t?.speed > 0) ||
          typeof t.paused !== 'boolean' ||
          t.speed !== pins.setupSpeed(step.setup) ||
          (step.setup.paused && !t.paused)
        )
          wrong.push(`${inv.id}:${step.sid} ${JSON.stringify(t)}`);
      }
    expect(wrong).toEqual([]);
  });
});

// The wait from step start to the first event a step watches for, at its
// declared speed with the step pinned, so frames are 1/60 s of wall clock on a
// 60 Hz display. The scene is built fresh, as a student opening the step finds
// it. A separation event is found by the detector js/pauseAtEvent.js uses; a
// transit or a velocity extreme comes once an orbit, so its wait is bounded by
// one orbit of the watched planet. Hohmann's coast starts with the student's
// burn: half the transfer orbit from the spacecraft's radius to the station's.
const WAITS = {
  'keplers-laws:fast-and-slow-in-numbers': { kind: 'detector', s: 13.6 },
  'transit-photometry:your-first-transit': { kind: 'orbit', s: 12.8 },
  'transit-photometry:the-shape-of-the-dip': { kind: 'orbit', s: 12.8 },
  'orbital-energy:around-a-real-orbit': { kind: 'detector', s: 13.6 },
  'radial-velocity:measure-the-period': { kind: 'orbit', s: 12.8 },
  'goldilocks-question:crossing-the-edges': { kind: 'detector', s: 6.1 },
  'hohmann-transfer:watch-the-coast': { kind: 'transfer', s: 0.5 },
};
const LIMIT_S = 20;

describe('every event a step waits for arrives within 20 s', () => {
  const steps = () =>
    INVESTIGATIONS.flatMap(inv =>
      inv.steps.flatMap((s, i) => (s.pauseAt ? [[inv, i]] : []))
    );

  test('the table names every step that waits for an event', () => {
    expect(steps().map(([inv, i]) => `${inv.id}:${inv.steps[i].sid}`)).toEqual(
      Object.keys(WAITS)
    );
  });

  test.each(Object.entries(WAITS))('%s', async (key, want) => {
    const [id, sid] = key.split(':');
    const inv = INVESTIGATIONS.find(x => x.id === id);
    const i = inv.steps.findIndex(s => s.sid === sid);
    const spec = inv.steps[i].pauseAt;
    const { stage, setup } = await build(inv, i);
    gate.pinLessonStep(inv.steps[i], 'scene', stage, setup);
    const perFrame = timestep.frameAdvance(
      timestep.pinnedStep(),
      app.SETTINGS.sim_speed,
      physics.DT
    );
    const G = physics.getPhysicsSetting('gravitational_constant');
    const bodies = scene.allBodies();
    const named = n => watch.resolveByName(bodies, n);
    let wait;
    if (want.kind === 'detector') {
      const body = named(spec.body);
      const primary = named(spec.primary);
      let before = null;
      for (let f = 1; f <= 60 * LIMIT_S * 2 && wait === undefined; f++) {
        frame(60);
        const signal = events.eventSignal(
          spec.kind,
          events.separationState(body, primary)
        );
        if (
          before !== null &&
          events.crossedZero(before, signal.value, signal.rising)
        )
          wait = f / 60;
        before = signal.value;
      }
    } else if (want.kind === 'orbit') {
      // A transit watch names no bodies: the star and its one planet.
      const star = bodies.reduce((m, b) => (b.mass > m.mass ? b : m));
      const [a, b] = spec.body
        ? [named(spec.body), named(spec.primary)]
        : [bodies.find(x => x !== star), star];
      wait = orbital.orbitalElements(a, b, G).period / perFrame / 60;
    } else {
      const sol = named('Sol');
      const r = n =>
        Math.hypot(named(n).pos.x - sol.pos.x, named(n).pos.y - sol.pos.y);
      const a = (r('Spacecraft') + r('Target Station')) / 2;
      wait = (Math.PI * Math.sqrt(a ** 3 / (G * sol.mass))) / perFrame / 60;
    }
    expect(wait).toBeLessThanOrEqual(LIMIT_S);
    expect(wait).toBeCloseTo(want.s, 1);
  });
});

// The central reading of each lesson whose evidence comes from the engine
// (docs/lesson-acceptance.json): the first measuring step of its loop.
const centralSteps = () => {
  const { lessons } = JSON.parse(
    readFileSync(
      new URL('../docs/lesson-acceptance.json', import.meta.url),
      'utf8'
    )
  );
  return Object.entries(lessons)
    .filter(([, v]) => v.evidenceFrom === 'engine')
    .map(([id, v]) => {
      const inv = INVESTIGATIONS.find(x => x.id === id);
      const loop = v.loop.map(sid => inv.steps.findIndex(s => s.sid === sid));
      const i =
        loop.find(k => inv.steps[k].type === 'measure') ??
        loop.find(k => inv.steps[k].probe);
      return [id, inv.steps[i].sid, inv, i];
    });
};
const FRAMES = 120;

describe('a central reading is the same at 60 and 144 frames per second', () => {
  test('fourteen lessons take their central reading from the engine', () => {
    expect(centralSteps()).toHaveLength(14);
  });

  test.each(centralSteps().map(c => [c[0], c[1], c[2], c[3]]))(
    '%s: %s',
    async (id, sid, inv, i) => {
      const step = inv.steps[i];
      const canvas = canvasAt(inv, i)?.kind ?? null;
      const run = async (fps, pinned) => {
        const { stage, setup } = await build(inv, i);
        if (pinned) gate.pinLessonStep(step, canvas, stage, setup);
        for (let f = 0; f < FRAMES; f++) frame(fps);
        gate.pinLessonStep(null);
        return state();
      };
      const { stage, setup } = await build(inv, i);
      // The reading's scene runs under the lesson's pin.
      gate.pinLessonStep(step, canvas, stage, setup);
      expect(timestep.pinnedStep()).toBe(timestep.STEP_SECONDS);
      gate.pinLessonStep(null);
      const at60 = await run(60, true);
      const at144 = await run(144, true);
      // Identical: any reading taken from it, at any tolerance, agrees.
      expect(at144).toEqual(at60);
      // The bench's run of as many frames (1/60 s each) is the same calculation.
      await build(inv, i);
      for (let f = 0; f < FRAMES; f++)
        render.integrateFrame(
          timestep.frameAdvance(1 / 60, app.SETTINGS.sim_speed, physics.DT)
        );
      expect(state()).toEqual(at60);
    }
  );
});
