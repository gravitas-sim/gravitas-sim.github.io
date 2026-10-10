// =============================================================================
// The model-versus-data comparison (Prompt 85), held to analytic cases
// -----------------------------------------------------------------------------
// A model laid over its own noise-free forward model leaves no residual (to
// rounding); the same model over noisy data of its own making has a reduced
// chi-square near 1, the tolerance from the chi-square distribution's width for
// the row count, not from the result; moving one element changes the overlay
// and nothing else; the instrument never fits; and a wrong model leaves a
// pattern the summary names.
// =============================================================================

import { describe, test, expect } from '@jest/globals';

import { runForward } from '../js/forward/index.js';
import {
  ELEMENTS,
  periodFromSemiMajor,
  semiMajorFromPeriod,
  stateFromBuilder,
  stateFromExoplanet,
  withElement,
} from '../js/compare/system.js';
import {
  CompareError,
  MAX_ROWS,
  compareModel,
  summariseResiduals,
} from '../js/compare/compare.js';
import { comparisonArtifact } from '../js/compare/artifact.js';
import { validateArtifact } from '../js/platform/artifact.js';
import {
  buildSystem,
  secondsPerTimeUnit,
  validateSystem,
} from '../js/systemSpec.js';
import { elementsFromBodies } from '../js/forward/index.js';
import { MODELS } from '../js/inference/models.js';

// structuredClone is not in the Jest VM's globals.
const clone = o => JSON.parse(JSON.stringify(o));
const cloneObs = o => ({
  ...o,
  columns: o.columns.map(c => ({ ...c, values: Float64Array.from(c.values) })),
});

const setupOf = (kind, extra = {}) => ({
  format: 'gravitas.observing-setup',
  formatVersion: 1,
  seed: 'compare-tests',
  epochs: { kind: 'regular', unit: 'd', start: 0, duration: 9, count: 300 },
  instrument: { kind },
  ...extra,
});
const noisy = sigma => ({ noise: { white: { sigma, unit: '' } } });

const hd = () => {
  const s = stateFromExoplanet('hd209458');
  s.planets[0].epochDays = 0;
  return s;
};
const transitSetup = extra => setupOf('photometer', extra);
const rvSetup = extra => setupOf('spectrograph', extra);

describe('a model over its own forward model', () => {
  test('transit: no residual, to rounding', () => {
    const state = hd();
    const obs = runForward('transit', state, transitSetup());
    const r = compareModel(obs, { kind: 'system', model: 'transit', state });
    expect(r.n).toBe(300);
    expect(r.maxAbs).toBeLessThan(1e-12);
    expect(r.objective.value).toBeLessThan(1e-20);
    // No uncertainty column: the objective is the sum of squares, and says so.
    expect(r.objective.name).toBe('sum of squares');
    expect(r.chi2).toBeNull();
  });
  test('radial velocity: no residual, to rounding, and in another unit of the data', () => {
    const state = hd();
    const obs = runForward('radial-velocity', state, rvSetup());
    const r = compareModel(obs, {
      kind: 'system',
      model: 'radial-velocity',
      state,
    });
    expect(r.maxAbs).toBeLessThan(1e-9);
    // The same data counted in km/s: the model's m/s is converted, not guessed.
    const km = cloneObs(obs);
    km.columns.find(c => c.id === 'value').unit = 'km/s';
    km.columns.find(c => c.id === 'value').values = Float64Array.from(
      obs.columns.find(c => c.id === 'value').values,
      v => v / 1000
    );
    const r2 = compareModel(km, {
      kind: 'system',
      model: 'radial-velocity',
      state,
    });
    expect(r2.maxAbs).toBeLessThan(1e-12);
  });
  test('a named analytic model with the truth manifest values: no residual', () => {
    const state = hd();
    const obs = runForward('radial-velocity', state, rvSetup());
    const values = {};
    for (const p of obs.synthetic.truth.parameters)
      if (p.fit) values[p.fit] = p.value;
    const r = compareModel(obs, {
      kind: 'analytic',
      model: 'rv-keplerian',
      parameters: values,
    });
    expect(r.maxAbs).toBeLessThan(1e-9);
    // Every parameter was given, none solved: each is assumed, and the zero
    // point is a stated 0, not a fitted one.
    expect(r.parameters.every(p => p.status === 'assumed')).toBe(true);
    expect(r.parameters.find(p => p.id === 'gamma').value).toBe(0);
  });
});

describe('noise at the stated sigma', () => {
  test('the truth gives a reduced chi-square near 1', () => {
    const state = hd();
    const sigma = 3;
    const obs = runForward(
      'radial-velocity',
      state,
      rvSetup({
        noise: { white: { sigma, unit: 'm/s' } },
      })
    );
    const r = compareModel(obs, {
      kind: 'system',
      model: 'radial-velocity',
      state,
    });
    // chi-square with 300 degrees of freedom has sd sqrt(2/300) = 0.082 in the
    // reduced form: five of them on either side is far outside the draw.
    expect(Math.abs(r.reducedChi2 - 1)).toBeLessThan(5 * Math.sqrt(2 / 300));
    expect(r.dof).toBe(300);
    expect(r.pattern.structured).toBe(false);
    expect(r.objective.m2lnL).toBeCloseTo(
      r.chi2 + 300 * Math.log(2 * Math.PI * sigma * sigma),
      6
    );
  });
});

describe('moving an element', () => {
  const sigma = 4;
  const mk = () => {
    const state = hd();
    const obs = runForward(
      'radial-velocity',
      state,
      rvSetup({
        noise: { white: { sigma, unit: 'm/s' } },
      })
    );
    return { state, obs };
  };
  test('changes the overlay, deterministically, and nothing else', () => {
    const { state, obs } = mk();
    const before = clone(state);
    const moved = withElement(
      state,
      'massEarth',
      state.planets[0].massEarth * 2
    );
    expect(state).toEqual(before); // the input is never modified
    const a = compareModel(obs, {
      kind: 'system',
      model: 'radial-velocity',
      state: moved,
      moved: ['massEarth'],
    });
    const b = compareModel(obs, {
      kind: 'system',
      model: 'radial-velocity',
      state: moved,
      moved: ['massEarth'],
    });
    expect([...a.model]).toEqual([...b.model]);
    const base = compareModel(obs, {
      kind: 'system',
      model: 'radial-velocity',
      state,
    });
    // Twice the mass is about twice K: the overlay's amplitude doubles (the
    // planet's mass is small beside the star's, so to a part in 1e3).
    const range = m => Math.max(...m) - Math.min(...m);
    expect(range(a.model) / range(base.model)).toBeCloseTo(2, 2);
    expect(a.reducedChi2).toBeGreaterThan(10 * base.reducedChi2);
    // Nothing was refitted: the other elements are as they were, and the moved
    // one is reported as moved and still only assumed.
    const el = id => a.parameters.find(p => p.id === id);
    expect(el('periodDays').value).toBe(state.planets[0].periodDays);
    expect(el('massEarth').moved).toBe(true);
    expect(el('massEarth').status).toBe('assumed');
    expect(a.fitted).toBe(0);
  });
  test('too much mass leaves a residual pattern the summary names', () => {
    const { state, obs } = mk();
    const big = withElement(
      state,
      'massEarth',
      state.planets[0].massEarth * 1.5
    );
    const r = compareModel(obs, {
      kind: 'system',
      model: 'radial-velocity',
      state: big,
    });
    expect(r.pattern.structured).toBe(true);
    const senses = new Set(r.pattern.bins.map(b => b.sense));
    expect(senses.has('over') && senses.has('under')).toBe(true);
    // A bin where the model is above the data has a negative mean residual.
    for (const b of r.pattern.bins)
      if (b.sense === 'over') expect(b.mean).toBeLessThan(0);
  });
  test('the period slider and the semi-major-axis slider are one number', () => {
    const state = hd();
    const a = ELEMENTS.aAU.get(state, 0);
    expect(a).toBeCloseTo(0.0475, 3);
    const back = periodFromSemiMajor(state.star, state.planets[0], a);
    expect(Math.abs(back / state.planets[0].periodDays - 1)).toBeLessThan(
      1e-12
    );
    const viaA = withElement(state, 'aAU', a * 1.1);
    expect(
      Math.abs(
        viaA.planets[0].periodDays / state.planets[0].periodDays - 1.1 ** 1.5
      )
    ).toBeLessThan(1e-3);
    expect(
      semiMajorFromPeriod(
        state.star,
        state.planets[0],
        viaA.planets[0].periodDays
      )
    ).toBeCloseTo(a * 1.1, 10);
  });
});

describe('the Orbital System Builder', () => {
  test("its elements and the elements read back from the integrator's state agree", () => {
    const G = 2;
    const verdict = validateSystem({
      bodies: [
        { name: 'Star', type: 'Star', mass: 1 },
        {
          name: 'b',
          type: 'Planet',
          mass: 300,
          primary: 0,
          a: 0.5,
          e: 0.2,
          omega: 40,
          phase: 70,
        },
      ],
    });
    expect(verdict.ok).toBe(true);
    const built = buildSystem(verdict.bodies, { G });
    const r = stateFromBuilder(verdict.bodies);
    expect(r.ok).toBe(true);
    const [s, p] = built.bodies;
    const total = s.simMass + p.simMass;
    const el = elementsFromBodies({
      G,
      mass: total,
      rel: {
        x: p.pos.x - s.pos.x,
        y: p.pos.y - s.pos.y,
        vx: p.vel.x - s.vel.x,
        vy: p.vel.y - s.vel.y,
      },
      timeUnitDays: secondsPerTimeUnit(G) / 86400,
    });
    // The integrator's mass units carry 332946.0487 Earth masses to the Sun
    // where the SI masses give 333054.25 (3.2e-4 apart, constants.js); the
    // planet is 9e-4 of the total, so the periods differ by 0.5 * 9e-4 * 3.2e-4
    // = 1.5e-7, measured 1.46e-7. 3e-7 holds the agreement to that and no looser.
    expect(
      Math.abs(el.periodDays / r.state.planets[0].periodDays - 1)
    ).toBeLessThan(3e-7);
    expect(Math.abs(el.e - 0.2)).toBeLessThan(1e-9);
    expect(r.state.planets[0].meanAnomalyDeg).toBe(70);
  });
  test('a planet of a planet, and a retrograde orbit, are refused in words', () => {
    const bodies = [
      { name: 'S', type: 'Star', mass: 1, index: 0 },
      {
        name: 'p',
        type: 'Planet',
        mass: 1,
        primary: 0,
        a: 1,
        e: 0,
        omega: 0,
        phase: 0,
      },
      {
        name: 'm',
        type: 'Planet',
        mass: 0.01,
        primary: 1,
        a: 0.01,
        e: 0,
        omega: 0,
        phase: 0,
      },
    ];
    expect(stateFromBuilder(bodies).reason).toMatch(/orbits another planet/);
    bodies[2].primary = 0;
    bodies[2].retrograde = true;
    expect(stateFromBuilder(bodies).reason).toMatch(/retrograde/);
  });
});

describe('an inference result as the source', () => {
  test('its fitted and fixed parameters keep their modes; degrees of freedom count the fitted ones', () => {
    const state = hd();
    const obs = runForward(
      'radial-velocity',
      state,
      rvSetup({
        noise: { white: { sigma: 3, unit: 'm/s' } },
      })
    );
    const truth = Object.fromEntries(
      obs.synthetic.truth.parameters
        .filter(p => p.fit)
        .map(p => [p.fit, p.value])
    );
    const doc = {
      model: { id: 'rv-keplerian', version: MODELS['rv-keplerian'].version },
      settings: {},
      results: {
        fit: {
          parameters: MODELS['rv-keplerian'].parameters.map(p => ({
            name: p.name,
            value: truth[p.name],
            mode: p.name.startsWith('sqrt') ? 'fixed' : 'fitted',
            sigma: p.name === 'K' ? 0.5 : null,
          })),
          linear: { gamma: { 0: 0 } },
        },
      },
    };
    const r = compareModel(obs, { kind: 'inference', result: doc });
    const mode = id => r.parameters.find(p => p.id === id).status;
    expect(mode('K')).toBe('fitted');
    expect(mode('sqrtEcosw')).toBe('fixed');
    expect(mode('gamma')).toBe('fitted');
    // P, tc, K and the zero point were fitted: four numbers the data paid for.
    expect(r.dof).toBe(300 - 4);
    expect(r.parameters.find(p => p.id === 'K').sigma).toBe(0.5);
    expect(Math.abs(r.reducedChi2 - 1)).toBeLessThan(0.5);
  });
});

describe('the evidence envelope', () => {
  test('is a valid artifact that cites the data and the model, with the kinds of number', () => {
    const state = hd();
    const obs = runForward('transit', state, transitSetup(noisy(0.0004)));
    const r = compareModel(obs, { kind: 'system', model: 'transit', state });
    const env = comparisonArtifact(r, { observation: obs });
    expect(validateArtifact(env)).toEqual([]);
    expect(env.source.kind).toBe('comparison');
    expect(env.source.id).toBe(obs.id);
    expect(env.source.digest).toMatch(/^[0-9a-f]{8}$/);
    expect(env.made.comparison.model).toEqual({
      kind: 'system',
      id: 'transit',
      version: r.source.version,
    });
    const origins = new Set(env.quantities.map(q => q.origin));
    expect(origins.has('assumed') && origins.has('derived')).toBe(true);
    expect(
      env.quantities.find(q => q.id === 'objective:chi-square').value
    ).toBe(r.chi2);
    // The same comparison, the same envelope.
    expect(comparisonArtifact(r, { observation: obs })).toEqual(env);
  });
});

describe('refusals and limits', () => {
  test('a data column with no stated unit, a long series and an unknown source are refused in words', () => {
    const state = hd();
    const obs = runForward('radial-velocity', state, rvSetup());
    const bare = cloneObs(obs);
    bare.columns.find(c => c.id === 'value').unit = null;
    expect(() =>
      compareModel(bare, { kind: 'system', model: 'radial-velocity', state })
    ).toThrow(/states no unit/);
    expect(() => compareModel(obs, { kind: 'oracle' })).toThrow(CompareError);
    expect(() =>
      compareModel(obs, { kind: 'system', model: 'periodic', state })
    ).toThrow(/observed through/);
    expect(MAX_ROWS).toBe(100000);
    expect(() =>
      compareModel(obs, {
        kind: 'analytic',
        model: 'rv-keplerian',
        parameters: { P: 1 },
      })
    ).toThrow(/needs a value for/);
  });
  test('the residual summary on a plain trend names the over- and under-predicting ends', () => {
    const x = Float64Array.from({ length: 30 }, (_, i) => i);
    const residual = Float64Array.from(x, v => (v - 14.5) * 0.5);
    const s = summariseResiduals(
      { x, sigma: new Float64Array(30).fill(1) },
      residual
    );
    expect(s.bins[0].sense).toBe('over');
    expect(s.bins.at(-1).sense).toBe('under');
    expect(s.longestRun).toBe(15);
  });
});
