// =============================================================================
// Can a Worker build a real catalog scenario, with no engine changes?
// -----------------------------------------------------------------------------
// The cloud worker beside this one hand-instantiates three stars, which proves
// the integrator runs in a Worker but dodges the question of whether the world
// BUILDER does - and the builder is where the nine-to-fifteen-month estimate
// mostly lived.
//
// It turns out buildWorld() already takes its dependencies as an injected
// `ctx`: settings, state, applyPreset, and a handful of callbacks that exist to
// poke the interface. It imports js/ui.js not at all. So a Worker supplies a
// plain settings object, a plain state object, and no-op callbacks, and the
// same builder that runs on the page runs here.
// =============================================================================

self.onmessage = async e => {
  const { scenario, seed, steps = 0, dt = 0.002 } = e.data;
  try {
    const P = await import('/js/physics.js');
    const { buildWorld } = await import('/js/world/build.js');
    const { applyPreset } = await import('/js/scenarios.js');
    const { DEFAULT_SETTINGS } = await import('/js/appState.js');
    const { withSeed, normalizeSeed } = await import('/js/rng.js');

    const SETTINGS = { ...DEFAULT_SETTINGS, preset_scenario: scenario };
    // The shape js/ui.js keeps: camera and selection. Nothing here reads a DOM.
    const state = { zoom: 1, pan: { x: 0, y: 0 }, selectedObject: null };
    const noop = () => {};

    withSeed(normalizeSeed(seed), () =>
      buildWorld({
        settings: SETTINGS,
        state,
        applyPreset: () => applyPreset(SETTINGS, DEFAULT_SETTINGS, state),
        takePendingSettings: () => null,
        setScenarioName: noop,
        hideObjectInspector: noop,
        showScenarioInfo: noop,
        updateObjectTypeButton: noop,
        computeAreaSweep: noop,
        isAreaSweepSuppressed: () => true,
        regenerateStarfield: noop,
      })
    );

    const counts = {};
    let bodies = 0;
    for (const name of P.WORLD_LISTS) {
      const n = P[name].length;
      if (n) counts[name] = n;
      bodies += n;
    }

    let stepped = 0;
    const t0 = performance.now();
    for (let i = 0; i < steps; i++) {
      P.updatePhysics(dt);
      stepped++;
    }

    self.postMessage({
      ok: true,
      scenario,
      bodies,
      counts,
      idCounterAfter: P.captureWorld().idCounter,
      simulationTime: P.getSimulationTime(),
      stepped,
      ms: performance.now() - t0,
    });
  } catch (err) {
    self.postMessage({
      ok: false,
      scenario,
      name: err?.name,
      message: String(err?.message || err),
      stack: String(err?.stack || '').split('\n').slice(0, 4),
    });
  }
};
