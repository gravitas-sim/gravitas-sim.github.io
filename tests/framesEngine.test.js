// =============================================================================
// Frames and following, on the engine
// -----------------------------------------------------------------------------
// Leg 2 of the rotating frame (tests/fixtures/frame-tolerances.json): the
// Lagrange laboratory's pair with a tracer placed at L4 at rest in the
// rotating frame, stepped as the page steps it for five periods of the pair at
// 30, 60 and 120 frames a second; the tracer's displacement in the rotating
// frame, read through the frame module. And the follow criterion: a body
// followed by id stays on the canvas centre in every frame for 3600 frames,
// with the camera applied as js/render.js applies it before drawing.
// Leg 1 (geometry) is in tests/referenceFrame.test.js.
// =============================================================================

import { describe, test, expect, afterEach } from '@jest/globals';
import { readFileSync } from 'node:fs';
import * as physics from '../js/physics.js';
import { applyPreset, resetPresetMemory } from '../js/scenarios.js';
import { buildWorld } from '../js/world/build.js';
import { DEFAULT_SETTINGS, setScenarioName } from '../js/appState.js';
import { withSeed } from '../js/rng.js';
import {
  bumpWorldGeneration,
  physicsSettings,
  updatePhysicsSettings,
} from '../js/engine/state.js';
import { engine } from '../js/random/streams.js';
import { frameAdvance, substepPlan } from '../js/timestep.js';
import { worldToScreen } from '../js/utils.js';
import { orbitalElements } from '../js/orbital.js';
import {
  ROUTH_MU,
  MAX_TRACER_FRACTION,
  MAX_ECCENTRICITY,
  lagrangePoints,
} from '../js/cr3bp.js';
import {
  setFrame,
  resetFrame,
  resolveFrameOrigin,
  toFrameCoords,
  followBody,
  followedBodyId,
  onFollowChange,
  WORLD,
  OBJECT,
  BARYCENTER,
  PAIR,
  ROTATING,
} from '../js/referenceFrame.js';
import { resolveView, trailShifts, framedTrail } from '../js/frameView.js';
import { frameLine, frameName } from '../js/sceneStatement.js';
import { setLocale } from '../js/i18n/index.js';

const TOL = JSON.parse(
  readFileSync(
    new URL('./fixtures/frame-tolerances.json', import.meta.url),
    'utf8'
  )
);
const RATE = { 30: 1 / 30, 60: 1 / 60, 120: 1 / 120 };
const noop = () => {};

/** The page's view state, as much of it as the frame and the camera read. */
const viewState = () => ({
  zoom: 1,
  pan: { x: 0, y: 0 },
  frameOffset: { x: 0, y: 0 },
  frameRotation: null,
  followOffset: { x: 0, y: 0 },
  followPan: null,
  followTarget: null,
  paused: false,
  frame_count: 0,
});

/**
 * Build a scenario through the page's builder, with settings written after the
 * preset (the way the Lagrange panel writes the tracer's place).
 */
function build(key, seed, after = noop) {
  const settings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
  settings.preset_scenario = key;
  // A laboratory carries its own variables from one build to the next, as the
  // page does for a reader; each leg starts from the scenario as shipped.
  resetPresetMemory();
  const state = viewState();
  physics.setStateReference(state);
  withSeed(seed, () =>
    buildWorld({
      settings,
      state,
      applyPreset: () => {
        applyPreset(settings, DEFAULT_SETTINGS, state);
        after(settings);
      },
      takePendingSettings: () => null,
      setScenarioName,
      hideObjectInspector: noop,
      showScenarioInfo: noop,
      updateObjectTypeButton: noop,
      computeAreaSweep: noop,
      isAreaSweepSuppressed: () => true,
      regenerateStarfield: noop,
    })
  );
  bumpWorldGeneration();
  return { settings, state };
}

afterEach(() => {
  followBody(null);
  resetFrame();
});

describe('leg 2: a tracer at L4 stays put in the rotating frame', () => {
  const leg = TOL.leg2;

  test.each(leg.rates)('at %s frames a second', rate => {
    let mu = null;
    const { settings } = build(leg.scenario, leg.seed, s => {
      mu =
        s.lagrange_secondary_mass /
        (s.lagrange_primary_mass + s.lagrange_secondary_mass);
      const L4 = lagrangePoints(mu).find(p => p.name === 'L4');
      s.lagrange_tracer_x = L4.x;
      s.lagrange_tracer_y = L4.y;
      s.lagrange_tracer_vx = 0;
      s.lagrange_tracer_vy = 0;
    });
    const [a, b] = [...physics.stars].sort((p, q) => q.mass - p.mass);
    const tracer = physics.planets[0];
    const G = physicsSettings.gravitational_constant;

    // The conditions the panel's own checks name, before anything is judged.
    expect(mu).toBeLessThan(ROUTH_MU);
    expect(tracer.mass / (a.mass + b.mass)).toBeLessThan(MAX_TRACER_FRACTION);
    const e = orbitalElements(b, a, G).e;
    expect(e).toBeLessThanOrEqual(MAX_ECCENTRICITY);

    setFrame(ROTATING, [a.id, b.id]);
    const bodies = () => physics.barycenterBodies();
    const d0 = Math.hypot(b.pos.x - a.pos.x, b.pos.y - a.pos.y);
    const start = toFrameCoords(tracer.pos, resolveFrameOrigin(bodies()));
    const n = Math.sqrt((G * (a.mass + b.mass)) / d0 ** 3);
    const horizon = (leg.periods * 2 * Math.PI) / n;

    const dtSim = frameAdvance(RATE[rate], settings.sim_speed, physics.DT);
    const plan = substepPlan(dtSim, settings.max_timestep);
    let frames = 0;
    let worst = 0;
    // The clock is not restarted by a headless build: measure from here.
    const t0 = physics.getSimulationTime();
    engine(leg.seed, () => {
      while (physics.getSimulationTime() - t0 < horizon) {
        for (let i = 0; i < plan.substeps; i++)
          physics.updatePhysics(plan.step);
        frames++;
        const r = toFrameCoords(tracer.pos, resolveFrameOrigin(bodies()));
        worst = Math.max(worst, Math.hypot(r.x - start.x, r.y - start.y));
      }
    });
    const end = toFrameCoords(tracer.pos, resolveFrameOrigin(bodies()));
    const moved = Math.hypot(end.x - start.x, end.y - start.y) / d0;
    console.log(
      `leg 2 at ${rate} fps: mu ${mu.toFixed(5)}, e ${e.toExponential(2)}, ` +
        `${frames} frames x ${plan.substeps} steps of ${plan.step.toPrecision(4)}, ` +
        `${leg.periods} periods (t = ${(physics.getSimulationTime() - t0).toPrecision(6)}): ` +
        `displacement ${moved.toExponential(3)} of the separation ` +
        `(largest on the way ${(worst / d0).toExponential(3)}; bound ${leg.relativeToSeparation})`
    );
    expect(moved).toBeLessThanOrEqual(leg.relativeToSeparation);

    // The history the engine recorded while the frame was chosen redraws the
    // tracer's whole recorded trail where the frame saw it: at L4.
    const origin = resolveFrameOrigin(bodies());
    const newest = physics.getTrailTick();
    const drawn = framedTrail(
      tracer.trail,
      trailShifts(origin, newest, physics.trailBudget() + 2),
      newest
    );
    expect(drawn.length).toBeGreaterThan(1);
    let far = 0;
    for (const q of drawn) {
      const r = toFrameCoords(q, origin);
      far = Math.max(far, Math.hypot(r.x - start.x, r.y - start.y) / d0);
    }
    console.log(
      `leg 2 at ${rate} fps: ${drawn.length} trail points redrawn, farthest ${far.toExponential(3)} of the separation`
    );
    expect(far).toBeLessThanOrEqual(leg.relativeToSeparation);
  });
});

describe('a body followed by id stays on the centre in every frame', () => {
  const f = TOL.follow;
  const canvas = { width: 1366, height: 800 };

  test.each([WORLD, OBJECT, BARYCENTER, PAIR, ROTATING])(
    'in the %s frame',
    mode => {
      const { settings, state } = build('binary-pair', 1);
      state.zoom = 1.5;
      const [a, b] = [...physics.stars].sort((p, q) => q.mass - p.mass);
      // Follow the lighter star; frame on the heavier (OBJECT) or the pair.
      if (mode === OBJECT) setFrame(OBJECT, a.id);
      else if (mode === PAIR || mode === ROTATING) setFrame(mode, [a.id, b.id]);
      else setFrame(mode);
      followBody(b.id);

      const dtSim = frameAdvance(RATE[f.rate], settings.sim_speed, physics.DT);
      const plan = substepPlan(dtSim, settings.max_timestep);
      let worst = 0;
      engine(1, () => {
        for (let frame = 0; frame < f.frames; frame++) {
          for (let i = 0; i < plan.substeps; i++)
            physics.updatePhysics(plan.step);
          // As drawScene does: resolve the frame, then the camera, then draw.
          resolveView(state, physics.barycenterBodies());
          physics.applyFollow();
          const s = worldToScreen(b.pos, state, canvas);
          worst = Math.max(
            worst,
            Math.hypot(s.x - canvas.width / 2, s.y - canvas.height / 2)
          );
        }
      });
      console.log(
        `follow in the ${mode} frame: worst ${worst.toExponential(3)} px over ${f.frames} frames (bound ${f.boundPx})`
      );
      expect(worst).toBeLessThanOrEqual(f.boundPx);
      expect(b.alive).not.toBe(false);
    }
  );

  test('a body that has gone ends the follow, once, by name', () => {
    const { state } = build('binary-pair', 1);
    const b = physics.stars[1];
    followBody(b.id);
    physics.applyFollow();
    expect(state.followTarget).toBe(`id:${b.id}`);
    const heard = [];
    const off = onFollowChange(e => heard.push(e));
    b.alive = false;
    physics.applyFollow();
    physics.applyFollow();
    off();
    expect(state.followTarget).toBeNull();
    expect(heard).toEqual([{ id: null, why: 'lost', name: b.name }]);
  });

  test('Follow Mode chosen afterwards ends the follow by id', () => {
    build('binary-pair', 1);
    followBody(physics.stars[1].id);
    updatePhysicsSettings({ follow_mode: 'Star' });
    physics.applyFollow();
    expect(followedBodyId()).toBeNull();
    updatePhysicsSettings({ follow_mode: 'None' });
  });
});

describe('the frame is named on the canvas, in both languages', () => {
  test.each([
    [
      'en',
      [
        'Frame: World',
        'Frame: Centered on Star A. Trails drawn in this frame',
        'Frame: Barycenter of the system. Trails drawn in this frame',
        'Frame: Barycenter of Star A and Star B. Trails drawn in this frame',
        'Frame: Rotating with Star A and Star B. Trails drawn in this frame',
      ],
    ],
    [
      'es',
      [
        'Sistema de referencia: Mundo',
        'Sistema de referencia: Centrado en Star A. Estelas dibujadas en este sistema',
        'Sistema de referencia: Baricentro del sistema. Estelas dibujadas en este sistema',
        'Sistema de referencia: Baricentro de Star A y Star B. Estelas dibujadas en este sistema',
        'Sistema de referencia: Girando con Star A y Star B. Estelas dibujadas en este sistema',
      ],
    ],
  ])('%s', async (locale, lines) => {
    await setLocale(locale, { persist: false });
    try {
      build('binary-pair', 1);
      const [a, b] = physics.stars;
      const seen = [];
      for (const [mode, id] of [
        [WORLD],
        [OBJECT, a.id],
        [BARYCENTER],
        [PAIR, [a.id, b.id]],
        [ROTATING, [a.id, b.id]],
      ]) {
        setFrame(mode, id);
        seen.push(frameLine(physics.barycenterBodies()));
      }
      expect(seen).toEqual(lines);
      // A pair whose body has gone is named as the world it falls back to.
      setFrame(PAIR, [a.id, 999]);
      expect(frameName(physics.barycenterBodies())).toBe(
        locale === 'en' ? 'World' : 'Mundo'
      );
    } finally {
      await setLocale('en', { persist: false });
    }
  });
});
