import { describe, test, expect, beforeAll } from '@jest/globals';

// The light-curve recorder counts a transit only when a planet is on the
// star's disc. The Transit Lab's curve has no noise, so the planet passing
// behind the star (a dip of about 0.007 percent, a factor of 250 below the
// transit) used to pass the recorder's depth-against-scatter test and be
// counted as a transit before the first real one.

let physics;
let lightCurve;
let appState;
let star;
let planet;
let radius;
let step = 0;
const N = 600; // samples in one orbit, as tests/transitRadiusCheck.test.js

// Carry the planet round by hand and record the way the panel does: one sample
// a frame. The turn is measured from a quarter orbit before transit, so the
// transit is at N / 4 and the planet is behind the star at 3 N / 4.
function record(from, to) {
  for (let i = from; i < to; i++) {
    const turn = -Math.PI / 2 + (2 * Math.PI * i) / N;
    planet.pos = {
      x: star.pos.x + radius * Math.cos(turn),
      y: star.pos.y + radius * Math.sin(turn),
    };
    physics.setSimulationTime(step++ * 0.01);
    lightCurve.updateLightCurve();
  }
}

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
  const { digest } = await import('./scenarioDigest.js');

  digest('transit-lab', 1);
  star = physics.stars.find(s => s.name === 'HD 209458');
  planet = [...physics.gas_giants, ...physics.planets].find(
    p => p.name === 'HD 209458 b'
  );
  radius = Math.hypot(planet.pos.x - star.pos.x, planet.pos.y - star.pos.y);
  lightCurve.setLightCurveEnabled(true);
  appState.state.paused = false;
});

describe('the recorder and the secondary eclipse', () => {
  test('a recording that holds only the planet behind the star has no transit', () => {
    // A short window about the eclipse, as a recording started between transits
    // gives: it holds the eclipse and no transit, and its ripple is so small
    // that the eclipse is far more than 25 times the scatter.
    record(Math.round(N * 0.62), Math.round(N * 0.88));
    const seen = lightCurve.transitAnalysis();
    const { y } = seen.series();

    // The eclipse is in the curve: a dip of about 7e-5 below the median, far
    // below any transit (the transit is 1.8e-2), and with no noise to hide it.
    const baseline = seen.baseline;
    const dip = baseline - Math.min(...y);
    expect(dip).toBeGreaterThan(1e-5);
    expect(dip).toBeLessThan(2e-4);

    expect(seen.seen).toBe(0);
    expect(seen.last).toBeNull();
    expect(seen.transits).toEqual([]);
    expect(seen.log).toEqual([]);
  });

  test('the transit that follows is counted once, with its own depth', () => {
    record(Math.round(N * 0.88), Math.round(N * 1.6));
    const seen = lightCurve.transitAnalysis();
    expect(seen.seen).toBe(1);
    expect(seen.last.depth).toBeGreaterThan(0.0178);
    expect(seen.last.depth).toBeLessThan(0.0188);
  });

  test('the next secondary eclipse adds nothing to the count', () => {
    record(Math.round(N * 1.6), Math.round(N * 1.95));
    expect(lightCurve.transitAnalysis().seen).toBe(1);
  });
});
