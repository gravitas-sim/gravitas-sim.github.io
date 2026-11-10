// Prompt 273, the Part A addendum (RESONANCES_II.md section 9): the harmonic libration
// estimator, the step chosen from an error budget, and the pinned addendum record.
// The new legs and bounds are tests/fixtures/resonances-ii/addendum-thresholds.json; the
// record is addendum-results.json, written by `node tools/resonances-ii-addendum.mjs run`.
// The first gate's record (thresholds.json, results.json) must not move: the last block says so.
import { describe, test, expect } from '@jest/globals';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { HARMONIC, measureLibrationHarmonic } from '../js/lab3d/libration.js';
import { STEP_BUDGET, stepForBudget } from '../js/lab3d/stepBudget.js';
import { fromElements } from '../js/lab3d/elements.js';
import { energy, makeState, run } from '../js/lab3d/kernel.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const fx = f =>
  JSON.parse(
    fs.readFileSync(path.join(here, 'fixtures', 'resonances-ii', f), 'utf8')
  );
const thresholds = fx('addendum-thresholds.json');
const results = fx('addendum-results.json');
const sources = fx('addendum-sources.json');
const first = fx('results.json');
const firstThresholds = fx('thresholds.json');

const mulberry = seed => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
/** A line of amplitude 1 under ripple three times larger and noise, 801 samples. */
const series = ({ turns = 4, line = 1, slope = 0, seed = 7 } = {}) => {
  const rng = mulberry(seed);
  const W = 800;
  const times = Array.from({ length: W + 1 }, (_, i) => i);
  const phi = times.map(
    t =>
      180 +
      slope * t +
      line * Math.sin((2 * Math.PI * turns * t) / W + 0.7) +
      3 * Math.sin((2 * Math.PI * 37.3 * t) / W + 2) +
      2 * Math.sin((2 * Math.PI * 91.7 * t) / W + 1) +
      0.4 * (rng() - 0.5)
  );
  return { times, phi, referencePeriod: W / 91.7, truth: W / turns };
};

describe('measureLibrationHarmonic', () => {
  test('a line under ripple three times its size is measured, with an uncertainty', () => {
    const s = series();
    const m = measureLibrationHarmonic(s);
    expect(m.state).toBe('libration');
    expect(Math.abs(m.period - s.truth) / s.truth).toBeLessThan(0.02);
    expect(Math.abs(m.amplitude - 1)).toBeLessThan(0.1);
    expect(Math.abs(m.center - 180)).toBeLessThan(0.1);
    expect(m.periodSigma).toBeGreaterThan(0);
    expect(m.amplitudeSigma).toBeGreaterThan(0);
    expect(m.periodsObserved).toBeGreaterThanOrEqual(3);
  });
  test('windows that hold fewer than three periods return not-constrained and no number', () => {
    for (const turns of [0.5, 1, 2]) {
      const m = measureLibrationHarmonic(series({ turns }));
      expect(m.state).toBe('not-constrained');
      expect(m.period).toBeNull();
      expect(m.amplitude).toBeNull();
      expect(m.center).toBeNull();
    }
  });
  test('ripple and noise with no line are refused', () => {
    const m = measureLibrationHarmonic(series({ line: 0 }));
    expect(m.state).toBe('not-constrained');
    expect(m.period).toBeNull();
  });
  test('a centre that drifts by more than the swing is refused', () => {
    const m = measureLibrationHarmonic(series({ slope: 0.01 }));
    expect(m.state).toBe('not-constrained');
    expect(m.reason).toBe('drifting-center');
  });
  test('a circulating argument is circulation, never a libration period', () => {
    const times = Array.from({ length: 801 }, (_, i) => i);
    const m = measureLibrationHarmonic({
      times,
      phi: times.map(t => (t * 1.3) % 360),
      referencePeriod: 9,
    });
    expect(m.state).toBe('circulation');
    expect(m.amplitude).toBeNull();
  });
  test('the committed options are the ones the thresholds state', () => {
    expect(HARMONIC.maxPeriods).toBe(8);
    expect(HARMONIC.significance).toBe(5);
    expect(HARMONIC.subWindow).toBeCloseTo(2 / 3, 12);
    expect(thresholds.estimator.options).toMatch(/maxPeriods = 8/);
    expect(thresholds.estimator.options).toMatch(/significance = 5/);
  });
});

describe('stepForBudget', () => {
  const st = fromElements(
    { a: 1, e: 0.1, i: 0, Omega: 0, omega: 0, M: 0 },
    1.001
  );
  const k = 0.001 / 1.001;
  const bodies = [
    { m: 1, x: st.x.map(u => -u * k), v: st.v.map(u => -u * k) },
    { m: 0.001, x: st.x.map(u => u * (1 - k)), v: st.v.map(u => u * (1 - k)) },
  ];
  const P = (2 * Math.PI) / Math.sqrt(1.001);
  const common = {
    bodies,
    G: 1,
    innerPeriod: P,
    sampleInterval: P,
    window: 40 * P,
  };
  test('the chosen step keeps the energy inside the budget over the window', () => {
    const b = stepForBudget({ ...common, energyBudget: 1e-7 });
    expect(b.state).toBe('chosen');
    expect(Number.isInteger(b.stepsPerSample)).toBe(true);
    expect(b.h * b.stepsPerSample).toBeCloseTo(P, 12);
    expect(b.predicted.energy).toBeLessThanOrEqual(STEP_BUDGET.safety * 1e-7);
    const s = makeState(bodies, { G: 1 });
    const e0 = energy(s);
    let worst = 0;
    for (let i = 0; i < 40 * b.stepsPerSample; i++) {
      run(s, 'yoshida4', b.h, 1);
      worst = Math.max(worst, Math.abs((energy(s) - e0) / e0));
    }
    expect(worst).toBeLessThanOrEqual(1e-7);
  });
  test('a budget no step within the cap can meet is refused, with no step', () => {
    const b = stepForBudget({ ...common, energyBudget: 1e-20 });
    expect(b.state).toBe('not-attainable');
    expect(b.h).toBeNull();
    expect(b.stepsPerSample).toBeNull();
  });
});

describe('the pinned addendum record', () => {
  const status = Object.fromEntries(results.legs.map(l => [l.id, l.status]));
  const ids = thresholds.legs.map(l => l.id);
  test('every committed leg has a result, and no result is outside the committed set', () => {
    expect(Object.keys(status).sort()).toEqual([...ids].sort());
    for (const s of Object.values(status))
      expect(['PASS', 'FAIL', 'NOT RUN', 'REPORTED']).toContain(s);
  });
  test('the addendum verdict is the committed function of the pinned statuses', () => {
    const all = list => list.every(id => status[id] === 'PASS');
    const standing = ['R1', 'R2', 'R3'].every(
      id => first.legs.find(l => l.id === id).status === 'PASS'
    );
    const gated = ids.filter(
      id =>
        !thresholds.verdict.reported_not_gated.includes(id) &&
        !['X1L', 'X1P'].includes(id)
    );
    const a =
      standing && all(gated) && status.X1L !== 'FAIL' && status.X1P !== 'FAIL';
    const b =
      standing && all(['B0b', 'B2b', 'L4b', 'P3b', 'D1h', 'D2h', 'D3b']);
    expect(results.verdict).toBe(a ? 'A' : b ? 'B' : 'C');
    expect(gated).toHaveLength(21);
    for (const id of gated) expect(thresholds.verdict.function).toContain(id);
  });
  test('the source legs say what the sources record says, with digests and no path', () => {
    expect(status.X1L).toBe(sources.X1L.status);
    expect(status.X1P).toBe(sources.X1P.status);
    expect(status.K1).toBe('NOT RUN');
    expect(sources.K1.request.length).toBeGreaterThan(40);
    for (const f of Object.values(sources.files))
      expect(f.sha256).toMatch(/^[0-9a-f]{64}$/);
    for (const f of [thresholds, results, sources])
      expect(JSON.stringify(f)).not.toMatch(/\/Users\/|\/home\//);
  });
  test('a failing leg names its numbers, and a passing budget leg its step', () => {
    for (const l of results.legs)
      expect(l.values && typeof l.values === 'object').toBe(true);
    for (const id of ['L4b', 'P3b', 'S1b']) {
      const l = results.legs.find(x => x.id === id);
      expect(l.values.step.pilot.h0).toBeGreaterThan(0);
    }
  });
});

describe('the first gate is not re-judged', () => {
  const FAILED = ['L1', 'L3', 'L4', 'P3', 'S1', 'S2', 'C1', 'D3'];
  const FAILED_FOLLOW_UPS = ['L1s', 'L3f', 'S1f', 'S2f'];
  test('its verdict stays C and its eight failed legs stay failing', () => {
    expect(first.verdict).toBe('C');
    expect(results.firstVerdict).toBe('C');
    for (const id of [...FAILED, ...FAILED_FOLLOW_UPS])
      expect(first.legs.find(l => l.id === id).status).toBe('FAIL');
    expect(first.history.length).toBeGreaterThanOrEqual(1);
  });
  test('no addendum leg reuses an id of the first gate, except K1', () => {
    const old = new Set(firstThresholds.legs.map(l => l.id));
    for (const l of thresholds.legs)
      if (l.id !== 'K1') expect(old.has(l.id)).toBe(false);
    for (const l of thresholds.legs.filter(x => x.inherits)) {
      expect(old.has(l.inherits)).toBe(true);
      const from = firstThresholds.legs.find(x => x.id === l.inherits);
      // The inherited bound's numbers are the original's: every number of the
      // original bound appears in the new one.
      for (const n of from.bound.match(/\d+(?:[.,]\d+)?%?/g) ?? [])
        expect(l.bound).toContain(n);
    }
  });
});
