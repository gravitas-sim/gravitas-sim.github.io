import { describe, test, expect, beforeAll } from '@jest/globals';

// The depth the transit lesson's probe reports for the Transit Lab, set beside
// the depth that the scenario's own stated radii imply.
//
// The scenario text (scenario.transit-lab.summary) gives the star as 1.155 solar
// radii, the planet as 1.38 Jupiter radii, "the same 12% radius ratio the light
// curve reports" and a 1.7% dip. The lesson reads the recorded curve through
// transitAnalysis() (what ctx.photometry() hands a step): baseline is the
// median of the recording, the bottom is its lowest sample.
//
// Tolerances, committed before this file was first run (Roadmap IV, step 6 of
// the transit pilot):
//   RATIO      the planet/star radius ratio the world is built with agrees with
//              the radii the text states to 0.5 percent of itself, and rounds to
//              the stated 12 percent.
//   PROBE      the probe's depth agrees with k^2 times the lesson's own
//              limb-darkening factor (1.2146) to 2 percent of itself.
//   STATED     the stated 1.7 percent is judged at 5 percent of the probe's
//              depth. A miss is reported by the last test, not hidden: the test
//              holds that the miss is what it is, so a later correction of the
//              text, or of the model, moves it here.
// Included: the limb-darkened floor (quadratic law of js/lightCurve.js, the
// lesson's factor), the phase-curve ripple in the baseline. Not included:
// planet light, noise (the curve has none), sampling (the floor is sampled at
// the frame nearest the middle), impact parameter (this orbit is b = 0).

const R_JUPITER_SOLAR = 0.102763; // scenarioGeometry.test.js uses the same figure
const STATED = {
  starSolar: 1.155,
  planetJupiter: 1.38,
  ratio: 0.12,
  dip: 0.017,
};
const LD_FACTOR = 1.2146; // the lesson's own, from u1 = 0.4 and u2 = 0.26
const TOL = { ratio: 0.005, probe: 0.02, stated: 0.05 };

let physics;
let lightCurve;
let appState;
let digest;
let found;

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
  ({ digest } = await import('./scenarioDigest.js'));

  digest('transit-lab', 1);
  const star = physics.stars.find(s => s.name === 'HD 209458');
  const planet = [...physics.gas_giants, ...physics.planets].find(
    p => p.name === 'HD 209458 b'
  );
  const a = Math.hypot(planet.pos.x - star.pos.x, planet.pos.y - star.pos.y);
  // One orbit on a circle at the scenario's radius, recorded the way the panel
  // records it: one sample a frame, the planet carried round by hand so that no
  // integrator error is in the answer. A quarter turn before transit, as built.
  lightCurve.setLightCurveEnabled(true);
  appState.state.paused = false;
  const N = 600;
  for (let i = 0; i < N; i++) {
    const turn = -Math.PI / 2 + (2 * Math.PI * i) / N;
    planet.pos = {
      x: star.pos.x + a * Math.cos(turn),
      y: star.pos.y + a * Math.sin(turn),
    };
    physics.setSimulationTime(i * 0.01);
    lightCurve.updateLightCurve();
  }
  const seen = lightCurve.transitAnalysis();
  found = {
    star,
    planet,
    seen,
    ratio: planet.radius / star.radius,
  };
});

describe('the Transit Lab depth, from the probe and from the stated radii', () => {
  test('the world is built with the radius ratio the text states', () => {
    const stated = (STATED.planetJupiter * R_JUPITER_SOLAR) / STATED.starSolar;
    expect(Math.abs(found.ratio - stated) / stated).toBeLessThan(TOL.ratio);
    expect(Math.round(found.ratio * 100) / 100).toBe(STATED.ratio);
  });

  test('the probe finds one complete transit with a bottom below the baseline', () => {
    expect(found.seen.last).not.toBeNull();
    expect(found.seen.last.depth).toBeGreaterThan(0.01);
  });

  test('the probe depth is k squared times the lesson limb-darkening factor', () => {
    const k = (STATED.planetJupiter * R_JUPITER_SOLAR) / STATED.starSolar;
    const implied = k * k * LD_FACTOR;
    const probe = found.seen.last.depth;
    expect(Math.abs(probe - implied) / implied).toBeLessThan(TOL.probe);
  });

  test('the area ratio alone would not agree: limb darkening is the difference', () => {
    const k = (STATED.planetJupiter * R_JUPITER_SOLAR) / STATED.starSolar;
    const areaOnly = k * k;
    const probe = found.seen.last.depth;
    // About a fifth smaller, well outside the 2 percent that the full law meets.
    expect((probe - areaOnly) / probe).toBeGreaterThan(0.15);
    expect(probe / areaOnly).toBeCloseTo(LD_FACTOR, 1);
  });

  test('the stated 1.7 percent dip: judged at 5 percent, and the miss is reported', () => {
    const probe = found.seen.last.depth;
    const miss = Math.abs(probe - STATED.dip) / probe;
    // The scenario text understates the model's own dip (about 1.83 percent
    // with the lesson's factor, 1.51 percent without it). Held here so that a
    // correction of the text moves this test and not silently the lesson.
    expect(miss).toBeGreaterThan(TOL.stated);
    expect(probe).toBeGreaterThan(0.0178);
    expect(probe).toBeLessThan(0.0188);
  });
});
