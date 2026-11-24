import { describe, test, expect, beforeAll } from '@jest/globals';
import { readFileSync } from 'node:fs';

// The picture, the timing and the number in every lesson scene whose task
// depends on how big a body is, each worked out here from first principles and
// set beside what the scene does.
//
// Four radii, which every sentence about size has to keep apart (js/engine/
// step.js, "The four radii"): the real radius a body stands for; the model
// radius `obj.radius`, which the contact test adds pairwise (js/engine/
// collisions.js) and which, times a factor for the kind of body falling in,
// sets where a black hole starts stripping it (js/engine/bodies.js,
// tidal_mass_loss); the drawn radius, the model radius times a family factor
// (js/bodyVisuals.js DISPLAY_FACTOR) or a lesson's stage radius; and the hit
// radius, which is none of these. The simulation computes no Roche limit.
//
// The scenes (lessons whose steps load them): Transit Lab and Blended Binary
// (transit photometry), Tidal Disruption Event and Earth-Moon System (tides),
// Roche Pass (why rings), Binary and Circumbinary Planet Lab (planets of
// binary stars and the two lessons that reuse them), Lagrange Point Lab.
// Ring Gap was measured and left out: over 340 time units no ring particle
// touches a moon, so no size enters what it shows.
//
// Tolerances, chosen from a measuring pass on this tree (v4 78e15afaf, Node
// 22) before any assertion was written:
//   RATIO   1e-6 relative: the transit scenes' model radii and orbit are the
//           published ones at the scene's scale, exactly (measured equal).
//   DEPTH   0.5 percent of the depth: measured 0.02 percent from k squared
//           times the limb-darkening factor of u1 = 0.4, u2 = 0.26, and 0.03
//           percent from the dilution half a magnitude implies.
//   TIMING  the flat bottom within 3 samples of 20,000 per orbit (measured
//           under one); contact to contact within 1 percent of its length
//           (measured 0.5 percent: 4 of 811 samples at the two contacts cover
//           too little of the disc to show beneath the planet's own light).
//   STRIP   the first step that loses mass is the first step inside the
//           threshold (measured: step 16, 390.76 against 391.17).
//   PASS    2 percent of the stated 1.3 planet radii (measured 1.3009).
//   CLEAR   20 times the summed model radii (measured 26.3 over 260 units).

const R_JUPITER_SOLAR = 0.102763; // scenarioGeometry.test.js uses the same figure
const SOLAR_RADIUS_AU = 0.00465047;
const LD = { u1: 0.4, u2: 0.26 }; // the transit lesson's own coefficients
const TOL = {
  ratio: 1e-6,
  depth: 0.005,
  samples: 3,
  contact: 0.01,
  pass: 0.02,
  clear: 20,
};

let physics;
let lightCurve;
let appState;
let visuals;
let constants;

beforeAll(async () => {
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
  await import('../js/world.js');
  physics = await import('../js/physics.js');
  await import('../js/bodyEffects.js');
  appState = await import('../js/appState.js');
  lightCurve = await import('../js/lightCurve.js');
  visuals = await import('../js/bodyVisuals.js');
  constants = await import('../js/constants.js');
});

/** Build a scenario the way the trace tools do, ready to step. */
async function build(key, seed) {
  const { buildWorld } = await import('../js/world/build.js');
  const { DEFAULT_SETTINGS, setScenarioName } =
    await import('../js/appState.js');
  const { applyPreset } = await import('../js/scenarios.js');
  const { withSeed } = await import('../js/rng.js');
  const settings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
  settings.preset_scenario = key;
  const state = { zoom: 1, pan: { x: 0, y: 0 }, paused: false, frame_count: 0 };
  physics.setStateReference(state);
  const noop = () => {};
  withSeed(seed, () =>
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
    })
  );
  return settings;
}

const dist = (a, b) => Math.hypot(a.pos.x - b.pos.x, a.pos.y - b.pos.y);
const close = (x, want, rel) => Math.abs(x - want) <= rel * Math.abs(want);
const EN = () => import('../js/i18n/en.js').then(m => m.EN);

describe('the transit scenes: depth from the real radii, timing from the model radii', () => {
  const N = 20000;

  /** One orbit carried round by hand, one sample per step, as the panel records. */
  async function record(key) {
    await build(key, 'transit-lab');
    const star = physics.stars.find(s => s.name === 'HD 209458');
    const planet = physics.planets.find(p => p.name === 'HD 209458 b');
    const a = dist(planet, star);
    lightCurve.clearLightCurve();
    lightCurve.setLightCurveEnabled(true);
    appState.state.paused = false;
    const flux = [];
    const phase = [];
    for (let i = 0; i < N; i++) {
      const turn = -Math.PI / 2 + (2 * Math.PI * i) / N;
      planet.pos = {
        x: star.pos.x + a * Math.cos(turn),
        y: star.pos.y + a * Math.sin(turn),
      };
      physics.setSimulationTime(i * 0.0003);
      lightCurve.updateLightCurve();
      flux.push(lightCurve.currentBrightness());
      phase.push(lightCurve.transitGeometry(planet)?.phase);
    }
    // Contact to contact: the star alone is 1 and the planet only ever adds
    // light, so a sample below 1 is a sample with the disc covered. The first
    // and last few samples cover too little to beat the planet's own light,
    // which the tolerance allows for.
    const t14 = flux.filter(f => f < 1).length;
    const t23 = phase.filter(p => p === 'fully on the disc').length;
    // The depth against the light just outside the dip, as the panel reads it.
    const lo = flux.indexOf(Math.min(...flux));
    const w = Math.round(N * 0.06);
    const edge = Math.min(flux[lo - w], flux[lo + w]);
    return { star, planet, a, t14, t23, edge, bottom: flux[lo] };
  }

  const k = (1.38 * R_JUPITER_SOLAR) / 1.155;
  const ldFactor = 1 / (1 - LD.u1 / 3 - LD.u2 / 6);

  test.each(['transit-lab', 'blended-binary'])(
    '%s: the model is at the published scale, so k_sim is k',
    async key => {
      const { star, planet, a } = await record(key);
      const perAu = constants.SIM_UNITS_PER_AU;
      expect(
        close(star.radius, 1.155 * SOLAR_RADIUS_AU * perAu, TOL.ratio)
      ).toBe(true);
      expect(close(a, 0.04747 * perAu, TOL.ratio)).toBe(true);
      expect(close(planet.radius / star.radius, k, TOL.ratio)).toBe(true);
    }
  );

  test.each(['transit-lab', 'blended-binary'])(
    '%s: the picture is not to scale - the planet is drawn at 0.375 of k',
    async key => {
      const { star, planet } = await record(key);
      const drawn =
        visuals.displayRadius(planet.radius, 'Planet') /
        visuals.displayRadius(star.radius, 'Star');
      const factor =
        visuals.DISPLAY_FACTOR.Planet / visuals.DISPLAY_FACTOR.Star;
      expect(factor).toBe(0.375);
      expect(close(drawn, k * factor, TOL.ratio)).toBe(true);
      // At the lesson's camera (zoom 60) the planet is held at the marker
      // floor instead, so the silhouette there is neither ratio.
      const px = visuals.drawnRadiusPx(planet.radius, 'Planet', 60, 3);
      expect(px).toBe(visuals.DISPLAY_MIN_PX);
      // The Sizes statement says the same: the model at real size, the
      // planet drawn at three-eighths of it (the published radius, not the
      // generator's five units to an Earth radius).
      const { sizeFacts } = await import('../js/sizeFacts.js');
      const pf = sizeFacts(planet);
      expect(pf.modelOverReal).toBeCloseTo(1, 2);
      expect(pf.drawnOverReal).toBeCloseTo(0.375, 2);
      expect(sizeFacts(star).drawnOverReal).toBeCloseTo(1, 3);
    }
  );

  test('transit-lab: the depth is k squared, limb-darkened; the timing is the model geometry', async () => {
    const { star, planet, a, t14, t23, edge, bottom } =
      await record('transit-lab');
    expect(close((edge - bottom) / edge, k * k * ldFactor, TOL.depth)).toBe(
      true
    );
    const t14x = (N * Math.asin((star.radius + planet.radius) / a)) / Math.PI;
    const t23x = (N * Math.asin((star.radius - planet.radius) / a)) / Math.PI;
    expect(close(t14, t14x, TOL.contact)).toBe(true);
    expect(Math.abs(t23 - t23x)).toBeLessThanOrEqual(TOL.samples);
  });

  test('blended-binary: the dip is diluted by the half magnitude the text states', async () => {
    const { edge, bottom } = await record('blended-binary');
    const dilution = 1 / (1 + 10 ** (-0.4 * 0.5));
    expect(
      close((edge - bottom) / edge, k * k * ldFactor * dilution, TOL.depth)
    ).toBe(true);
    const en = await EN();
    expect(en['scenario.blended-binary.summary']).toMatch(
      /half a magnitude fainter/
    );
  });

  test('the scenario text and the lesson say what is drawn to scale and what is not', async () => {
    const en = await EN();
    const said = en['scenario.transit-lab.summary'];
    expect(said).not.toMatch(/true relative scale|silhouette on screen/);
    expect(said).toMatch(/12%/);
    const lesson = readFileSync(
      'js/data/investigations/transit-photometry.js',
      'utf8'
    );
    expect(lesson).not.toMatch(/drawn at their true relative sizes/);
  });
});

describe('the tidal disruption: stripping starts at five of the hole’s model radii', () => {
  test('the first step that loses mass is the first step inside the threshold', async () => {
    await build('tidal-disruption-event', 'tides-lab');
    const hole = physics.bh_list[0];
    const star = physics.stars[0];
    const m0 = star.mass;
    const threshold = 5 * hole.radius; // a star; a planet is 3, a comet 2
    let prev = dist(star, hole);
    expect(prev).toBeGreaterThan(threshold);
    let first = null;
    let inside = null;
    for (let step = 0; step < 4000 && !first; step++) {
      physics.updatePhysics(0.01);
      const s = physics.stars[0];
      const d = dist(s, physics.bh_list[0]);
      if (inside === null && d < threshold) inside = { step, d, prev };
      if (s.mass < m0 || physics.debris.length > 0) first = { step, d };
      prev = d;
    }
    expect(first).not.toBeNull();
    expect(first.step).toBe(inside.step);
    expect(inside.prev).toBeGreaterThan(threshold);
    expect(first.d).toBeLessThan(threshold);
    // The scene's own tidal radius, R (M / m)^(1/3) on its model sizes, is
    // about a third of the engine's: the engine's radius is a rule, not this
    // balance, which is why the lesson calls it "a disruption radius" and
    // computes the tidal radius in its panel.
    const ownTidal = star.radius * Math.cbrt(hole.mass / m0);
    expect(threshold / ownTidal).toBeGreaterThan(2.5);
    expect(threshold / ownTidal).toBeLessThan(3.5);
  });

  test('no sentence says the simulation computes a Roche limit', async () => {
    const en = await EN();
    const { EN_SIZES } = await import('../js/i18n/en.sizes.js');
    for (const text of [
      en['inspector.tip.radius'],
      EN_SIZES['sizes.collision'],
    ])
      expect(text).toMatch(/computes no Roche limit/);
    const page = readFileSync('model/index.html', 'utf8');
    expect(page).not.toMatch(/tidal disruption and\s+Roche-limit thresholds/);
  });
});

describe('the Roche pass: the clump passes 1.3 of the planet’s model radii', () => {
  test('the closest pass of the clump’s center is the stated one', async () => {
    await build('roche-pass', 'roche-pass');
    const planet = physics.gas_giants[0];
    const R = planet.radius;
    let best = Infinity;
    for (let step = 0; step < 1200; step++) {
      physics.updatePhysics(0.01);
      const live = physics.asteroids.filter(b => b.alive);
      const cx = live.reduce((s, b) => s + b.pos.x, 0) / live.length;
      const cy = live.reduce((s, b) => s + b.pos.y, 0) / live.length;
      best = Math.min(best, Math.hypot(cx - planet.pos.x, cy - planet.pos.y));
    }
    expect(close(best / R, 1.3, TOL.pass)).toBe(true);
    const lesson = readFileSync(
      'js/data/investigations/satellite-sequence.js',
      'utf8'
    );
    expect(lesson).toMatch(/passes 1\.3 planet radii/);
    // On screen the planet is a gas giant drawn at 0.469 of that radius, so
    // the same pass sits nearly three drawn radii out.
    expect(visuals.DISPLAY_FACTOR.GasGiant).toBe(0.469);
    expect(1.3 / visuals.DISPLAY_FACTOR.GasGiant).toBeGreaterThan(2.7);
  });
});

describe('the binary planet labs: a collision is the two model radii', () => {
  test.each(['binary-planet-lab', 'circumbinary-planet-lab'])(
    '%s: ten times life size and about 0.06 AU, as the message says',
    async key => {
      await build(key, 'binary');
      const perAu = constants.SIM_UNITS_PER_AU;
      const a = physics.stars.find(s => s.name === 'Star A');
      const planet = physics.planets[0];
      const real = a.radiusInSuns * SOLAR_RADIUS_AU * perAu;
      expect(a.radius / real).toBeCloseTo(10, 6);
      const contactAu = (a.radius + planet.radius) / perAu;
      expect(Math.round(contactAu * 100) / 100).toBe(0.06);
      // A star is drawn at its model radius; the planet adds its own.
      expect(visuals.displayRadius(a.radius, 'Star')).toBe(a.radius);
      const { EN_DEFERRED } = await import('../js/i18n/en.deferred.js');
      const message = Object.values(EN_DEFERRED).find(v =>
        /The planet hit a star after/.test(v)
      );
      expect(message).toMatch(/about ten times life size/);
      expect(message).toMatch(/0\.06 AU/);
      expect(message).not.toMatch(/collision distance is the drawn size/);
    }
  );
});

describe('the Lagrange lab: nothing comes within twenty times the two model radii', () => {
  test('the closest any two bodies come, over the lesson’s run', async () => {
    await build('lagrange-point-lab', 'lagrange');
    const all = () => [...physics.stars, ...physics.planets];
    let worst = Infinity;
    for (let step = 0; step < 20000; step++) {
      physics.updatePhysics(0.01);
      const b = all();
      for (let i = 0; i < b.length; i++)
        for (let j = i + 1; j < b.length; j++)
          worst = Math.min(
            worst,
            dist(b[i], b[j]) / (b[i].radius + b[j].radius)
          );
    }
    expect(all()).toHaveLength(3);
    expect(worst).toBeGreaterThan(TOL.clear);
  });
});

describe('the Earth-Moon scene: the tide probe measures across the model radius', () => {
  test('the model radius, the drawn radius and the real one are three numbers', async () => {
    await build('earth-moon-system', 'tides-lab');
    const earth = physics.planets.find(p => p.name === 'Earth');
    const moon = physics.planets.find(p => p.name === 'Luna');
    const d = dist(earth, moon);
    const model = earth.radius / d;
    const drawn = visuals.displayRadius(earth.radius, 'Planet') / d;
    expect(model).toBeCloseTo(12 / 35, 2);
    expect(drawn / model).toBe(0.375);
    // Real: 6,371 km against 384,400 km, about one sixtieth.
    expect(model / (6371 / 384400)).toBeGreaterThan(20);
    const lesson = readFileSync('js/data/investigations/tides.js', 'utf8');
    expect(lesson).not.toMatch(/Measured across the body as drawn/);
    expect(lesson).toMatch(/Measured across the model radius/);
  });
});

describe('the Sizes statement is beside the task in every lesson that loads one of these scenes', () => {
  const SIZE_SCENES = new Set([
    'Transit Lab',
    'Blended Binary',
    'Tidal Disruption Event',
    'Earth-Moon System',
    'Roche Pass',
    'Binary Planet Lab',
    'Circumbinary Planet Lab',
    'Lagrange Point Lab',
  ]);

  test('the flagged lessons are exactly the ones that load a size-dependent scene', async () => {
    const { INVESTIGATIONS } = await import('../js/data/investigations.js');
    const loads = l =>
      [l.scenario, ...(l.steps || []).map(s => s.setup?.scenario)].some(name =>
        SIZE_SCENES.has(name)
      );
    const want = INVESTIGATIONS.filter(loads)
      .map(l => l.id)
      .sort();
    const have = INVESTIGATIONS.filter(l => l.sizes)
      .map(l => l.id)
      .sort();
    expect(have).toEqual(want);
    expect(want.length).toBeGreaterThanOrEqual(5);
  });

  test('the step carries the canvas line as the button that opens the statement', async () => {
    const { INVESTIGATIONS } = await import('../js/data/investigations.js');
    const { stepMarkup } = await import('../js/investigations/stepView.js');
    const { t } = await import('../js/i18n/index.js');
    const markup = l =>
      stepMarkup(l.steps[0], {
        id: 'x',
        saved: undefined,
        active: l,
        responses: {},
        visited: new Set(),
        shown: () => l.steps,
        predictionAnsweredHere: () => false,
        recomputeFields: () => {},
      }).join('');
    const transit = INVESTIGATIONS.find(l => l.id === 'transit-photometry');
    const kepler = INVESTIGATIONS.find(l => l.id === 'keplers-laws');
    expect(markup(transit)).toContain('data-open-sizes');
    expect(markup(transit)).toContain(t('canvas.sizeDisclosure'));
    expect(markup(kepler)).not.toContain('data-open-sizes');
  });
});
