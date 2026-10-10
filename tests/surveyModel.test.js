// The selection-effects lab (Roadmap II, Prompt 93): analytic limits, seed
// statistics and the forward model. Every tolerance is fixed before the run:
// a complete survey recovers the input exactly; a limited one within four
// Poisson errors; the Malmquist offset within four standard errors of its
// closed form (-1.3816 sigma^2); a uniform-density count slope within 0.03 of
// the Euclidean 0.6.
import {
  makeUniverse,
  observe,
  edgesOf,
  trueLuminosityFunction,
  recoveredLuminosityFunction,
  recoveryRatios,
  malmquistBias,
  malmquistShells,
  malmquistAtMagnitude,
  malmquistFormula,
  parallaxSelectionBias,
  completenessCurve,
  completenessAt,
  countSlope,
  sweepLimit,
  bootstrapLuminosityFunction,
  effectiveVolume,
  limitDistance,
  readInstrument,
} from '../js/survey/model.js';
import { runForward, isSynthetic, validateSetup } from '../js/forward/index.js';

const EDGES = edgesOf(-2, 12, 2);
const QUIET = { mag: { floor: 1e-9, m0: 17, slope: 0 } };

describe('a complete survey recovers the luminosity function that went in', () => {
  const u = makeUniverse({ count: 3000, seed: 'complete', maxPc: 1000 });
  const obs = observe(u, { limit: 80, errors: QUIET });
  test('every star is counted, and each bin matches to rounding', () => {
    expect(obs.count).toBe(u.n);
    const r = recoveryRatios(
      trueLuminosityFunction(u, EDGES),
      recoveredLuminosityFunction(obs, EDGES)
    );
    for (const row of r.filter(x => x.all > 0))
      expect(row.ratio).toBeCloseTo(1, 9);
  });
  test('the volume is the closed form', () => {
    const inst = readInstrument({ limit: 15 });
    const M = 6;
    const d = limitDistance(M, 15);
    expect(effectiveVolume(M, inst, u.omega, 1e6)).toBeCloseTo(
      (u.omega * d ** 3) / 3,
      6
    );
    expect(effectiveVolume(M, inst, u.omega, 100)).toBeCloseTo(
      (u.omega * 100 ** 3) / 3,
      6
    );
  });
});

describe('a magnitude-limited survey: the effective-volume estimate is unbiased', () => {
  test('bins with many stars agree within four Poisson errors', () => {
    const u = makeUniverse({ count: 6000, seed: 'limited', maxPc: 1000 });
    const obs = observe(u, { limit: 17 });
    expect(obs.count).toBeLessThan(u.n * 0.9);
    const rows = recoveryRatios(
      trueLuminosityFunction(u, EDGES),
      recoveredLuminosityFunction(obs, EDGES),
      30
    ).filter(r => Number.isFinite(r.ratio));
    expect(rows.length).toBeGreaterThanOrEqual(3);
    for (const r of rows)
      expect(Math.abs(r.ratio - 1)).toBeLessThan(4 * r.error + 0.03);
  });
  test('averaged over twelve seeds, one bin is recovered within four standard errors of the mean', () => {
    const ratios = [];
    for (let k = 1; k <= 12; k++) {
      const u = makeUniverse({
        count: 3000,
        seed: `seedstat:${k}`,
        maxPc: 1000,
      });
      const obs = observe(u, { limit: 17 });
      const edges = [6, 8];
      ratios.push(
        recoveredLuminosityFunction(obs, edges).phi[0] /
          trueLuminosityFunction(u, edges).phi[0]
      );
    }
    const mean = ratios.reduce((a, b) => a + b, 0) / ratios.length;
    const sd = Math.sqrt(
      ratios.reduce((a, r) => a + (r - mean) ** 2, 0) / (ratios.length - 1)
    );
    expect(sd).toBeGreaterThan(0);
    expect(Math.abs(mean - 1)).toBeLessThan(
      (4 * sd) / Math.sqrt(ratios.length)
    );
  });
});

describe('Malmquist bias', () => {
  test('a Gaussian luminosity function at a fixed magnitude: -1.3816 sigma^2', () => {
    const sigma = 0.7;
    const u = makeUniverse({
      kind: 'gaussian',
      count: 300000,
      seed: 'malm',
      maxPc: 2000,
      meanM: 5,
      sigmaM: sigma,
    });
    const r = malmquistAtMagnitude(u, 13.9, 14.0);
    const se = sigma / Math.sqrt(r.stars);
    expect(r.stars).toBeGreaterThan(1000);
    expect(Math.abs(r.bias - malmquistFormula(sigma))).toBeLessThan(4 * se);
  });
  test('a magnitude-limited survey counts brighter stars than there are, more so farther out', () => {
    const u = makeUniverse({ count: 4000, seed: 'shells', maxPc: 1000 });
    const obs = observe(u, { limit: 16 });
    expect(malmquistBias(obs).bias).toBeLessThan(-0.5);
    const shells = malmquistShells(obs, [0, 250, 500, 750, 1000]).filter(
      s => s.counted > 20
    );
    expect(shells.length).toBeGreaterThanOrEqual(3);
    for (let i = 1; i < shells.length; i++)
      expect(shells[i].bias).toBeLessThan(shells[i - 1].bias);
    expect(shells.at(-1).fraction).toBeLessThan(shells[0].fraction);
  });
  test('a complete survey has none', () => {
    const u = makeUniverse({ count: 2000, seed: 'none' });
    expect(malmquistBias(observe(u, { limit: 80 })).bias).toBeCloseTo(0, 12);
  });
});

describe('Lutz-Kelker style selection on the measured parallax', () => {
  const u = makeUniverse({ count: 6000, seed: 'lk', maxPc: 1000 });
  const obs = observe(u, {
    limit: 18,
    errors: { parallax: { floor: 0.1, m0: 12, slope: 0.2 } },
  });
  test('measured parallaxes in the sample are too large, and more so for lower signal to noise', () => {
    const lo = parallaxSelectionBias(obs, 3);
    const hi = parallaxSelectionBias(obs, 10);
    expect(lo.meanFractionalError).toBeGreaterThan(0.03);
    expect(hi.meanFractionalError).toBeLessThan(lo.meanFractionalError);
    expect(lo.meanDeltaM).toBeGreaterThan(0);
  });
  test('with a perfect parallax there is nothing to select on', () => {
    const exact = observe(u, {
      limit: 18,
      errors: { parallax: { floor: 1e-9, m0: 30, slope: 0 } },
    });
    expect(
      Math.abs(parallaxSelectionBias(exact, 3).meanFractionalError)
    ).toBeLessThan(1e-6);
  });
});

describe('completeness and counts', () => {
  test('the fraction counted follows the completeness function (binomial, four sigma)', () => {
    const c = { m50: 16, width: 0.4 };
    const u = makeUniverse({ count: 20000, seed: 'curve', maxPc: 1000 });
    const obs = observe(u, { limit: 40, completeness: c });
    const rows = completenessCurve(obs, edgesOf(12, 19, 1)).filter(
      r => r.stars >= 100
    );
    expect(rows.length).toBeGreaterThanOrEqual(4);
    for (const r of rows) {
      const p = completenessAt(c, r.m);
      // the bin mean differs from the centre value: allow the curve's slope
      const sd = Math.sqrt((p * (1 - p)) / r.stars);
      expect(Math.abs(r.fraction - p)).toBeLessThan(4 * sd + 0.06);
    }
  });
  test('a uniform field of standard candles has the Euclidean count slope 0.6', () => {
    const u = makeUniverse({
      kind: 'gaussian',
      count: 200000,
      seed: 'euclid',
      maxPc: 2500,
      meanM: 5,
      sigmaM: 0.2,
    });
    const s = countSlope(Array.from(u.m), 11, 15);
    expect(Math.abs(s.slope - 0.6)).toBeLessThan(0.03);
  });
  test('a boundary bends the count: the deepest magnitudes fall below 0.6', () => {
    const u = makeUniverse({
      kind: 'gaussian',
      count: 100000,
      seed: 'edge',
      maxPc: 400,
      meanM: 5,
      sigmaM: 0.2,
    });
    expect(countSlope(Array.from(u.m), 12, 16).slope).toBeLessThan(0.4);
  });
});

describe('seeds', () => {
  test('the same seed gives the same survey; the limit never changes the noise of a star that stays', () => {
    const u = makeUniverse({ count: 1500, seed: 'det' });
    const a = observe(u, { limit: 16 });
    const b = observe(u, { limit: 14 });
    const again = observe(makeUniverse({ count: 1500, seed: 'det' }), {
      limit: 16,
    });
    expect(Array.from(again.index)).toEqual(Array.from(a.index));
    expect(again.mObs[a.index[0]]).toBe(a.mObs[a.index[0]]);
    expect(b.count).toBeLessThan(a.count);
    for (const i of b.index) {
      expect(b.mObs[i]).toBe(a.mObs[i]);
      expect(b.plxObs[i]).toBe(a.plxObs[i]);
      expect(a.detected[i]).toBe(1);
    }
  });
  test('the sweep: the fraction counted rises with the limit, the bias shrinks, and quantiles are ordered', () => {
    const out = sweepLimit({
      universe: { count: 1500, seed: 'sweep', maxPc: 1000 },
      instrument: {},
      limits: [14, 16, 18, 22],
      seeds: [1, 2, 3, 4, 5],
    });
    for (let i = 1; i < out.length; i++) {
      expect(out[i].fraction.median).toBeGreaterThan(
        out[i - 1].fraction.median
      );
      expect(Math.abs(out[i].bias.median)).toBeLessThan(
        Math.abs(out[i - 1].bias.median)
      );
    }
    for (const r of out) {
      expect(r.fraction.lo).toBeLessThanOrEqual(r.fraction.median);
      expect(r.fraction.median).toBeLessThanOrEqual(r.fraction.hi);
    }
  });
  test('the bootstrap interval brackets its estimate', () => {
    const u = makeUniverse({ count: 3000, seed: 'boot' });
    const obs = observe(u, { limit: 17 });
    const b = bootstrapLuminosityFunction(obs, edgesOf(4, 10, 2), {
      resamples: 200,
    });
    for (const r of b.filter(Boolean)) {
      expect(r.lo).toBeLessThanOrEqual(r.estimate);
      expect(r.estimate).toBeLessThanOrEqual(r.hi);
    }
  });
});

describe('the survey forward model', () => {
  const setup = {
    format: 'gravitas.observing-setup',
    formatVersion: 1,
    seed: 'fwd',
    instrument: {
      kind: 'catalogue',
      limitingMagnitude: 16,
      survey: { skyAreaDeg2: 50, completeness: { m50: 15.5, width: 0.3 } },
    },
  };
  test('returns a synthetic table with a truth manifest that accounts for every star', () => {
    expect(validateSetup(setup)).toEqual([]);
    const o = runForward(
      'survey',
      { universe: { count: 1200, maxPc: 800 } },
      setup
    );
    expect(isSynthetic(o)).toBe(true);
    const t = o.synthetic.truth;
    const get = id => t.parameters.find(p => p.id === id).value;
    expect(get('detected') + t.missing.length).toBe(get('count'));
    expect(o.columns.find(c => c.id === 'mag').values.length).toBe(
      get('detected')
    );
    expect(t.columns.absoluteMagnitude.length).toBe(get('detected'));
    expect(get('malmquist')).toBeLessThan(0);
    // the survey's own sky area wins over the universe's default
    expect(o.synthetic.setup.instrument.survey.skyAreaDeg2).toBe(50);
    const fainter = o.columns.find(c => c.id === 'mag').values;
    expect(Math.max(...fainter)).toBeLessThanOrEqual(16);
  });
  test('refuses what it cannot run, in words', () => {
    expect(() => runForward('survey', {}, setup)).toThrow(/state.universe/);
    expect(() =>
      runForward(
        'survey',
        { universe: { count: 100 } },
        {
          ...setup,
          instrument: { kind: 'catalogue' },
        }
      )
    ).toThrow(/limitingMagnitude/);
    expect(() =>
      readInstrument({ limit: 15, completeness: { m50: 15, width: 0 } })
    ).toThrow(/completeness/);
  });
});
