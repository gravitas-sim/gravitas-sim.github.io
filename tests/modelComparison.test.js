// =============================================================================
// The model-comparison kernel's behaviour (Prompt 261)
// -----------------------------------------------------------------------------
// The kernel's contract in small, fast cases: the class of a pair and the
// method valid for it, the refusals before any number, the add-one p value, the
// criteria's definitions and limits, deterministic leave-one-out, and the draws'
// indexing. The statistical legs (ensembles, the independent oracle, the
// authentic star) are tools/model-comparison-validate.mjs, held to their
// committed bounds by tests/modelComparisonResults.test.js.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { URL } from 'node:url';
import * as S0 from '../js/kernels/statistics/index.js';
import * as M from '../js/kernels/statistics/modelcompare.js';

const S = { ...S0, ...M };
import { stream } from '../js/random/streams.js';
import {
  NEVER_PRECACHED,
  buildManifest,
} from '../tools/build-service-worker.mjs';

const REGULAR = { nested: true, boundary: false, searched: false };

describe('the class of a pair', () => {
  test('is decided by three declared flags, and an undeclared flag is refused', () => {
    expect(S.classifyPair(REGULAR).class).toBe('nested-regular');
    expect(S.classifyPair({ ...REGULAR, searched: true }).class).toBe(
      'nested-nonregular'
    );
    expect(S.classifyPair({ ...REGULAR, boundary: true }).class).toBe(
      'nested-nonregular'
    );
    for (const f of [
      { nested: false, boundary: false, searched: false },
      { nested: false, boundary: true, searched: true },
    ])
      expect(S.classifyPair(f).class).toBe('non-nested');
    for (const bad of [
      undefined,
      {},
      { nested: true, boundary: false },
      { nested: 1, boundary: false, searched: false },
    ])
      expect(S.classifyPair(bad)).toMatchObject({
        status: 'refused',
        code: 'undeclared',
      });
  });

  test('names the F-test as refused with the code Prompt 154 uses, and the valid method', () => {
    const s = S.classifyPair({ ...REGULAR, searched: true, boundary: true });
    expect(s.refused[0]).toMatchObject({ method: 'f-test', code: 'searched' });
    expect(s.primary).toBe('simulation-calibrated');
    expect(s.notOffered.map(n => n.method)).toEqual(['information-criteria']);
    const b = S.classifyPair({ ...REGULAR, boundary: true });
    expect(b.refused[0].code).toBe('boundary');
    // the refusal is the same code the F-test itself gives for the same declaration
    expect(
      S.fTest({
        rssReduced: 10,
        pReduced: 1,
        rssFull: 5,
        pFull: 4,
        n: 30,
        boundary: true,
      }).code
    ).toBe(b.refused[0].code);
    const n = S.classifyPair({ ...REGULAR, nested: false });
    expect(n.refused[0].code).toBe('not-nested');
    expect(n.primary).toBe('information-criteria');
  });
});

describe('the dispatcher', () => {
  const models = [
    { name: 'constant', k: 1, rss: 30 },
    { name: 'line', k: 2, rss: 20 },
  ];
  test('runs the F-test for a nested regular pair, with its table', () => {
    const r = S.compareModels({ pair: REGULAR, n: 30, models });
    expect(r.status).toBe('ok');
    expect(r.class).toBe('nested-regular');
    expect(r.result.F).toBeCloseTo(((30 - 20) / 1 / (20 / 28)) * 1, 10);
    expect(r.table.map(t => t.quantity)).toEqual([
      'F',
      'degrees of freedom',
      'p',
    ]);
  });
  test('asks for a simulation, and never substitutes a number, for a searched pair', () => {
    const r = S.compareModels({
      pair: { ...REGULAR, searched: true },
      n: 30,
      models,
    });
    expect(r).toMatchObject({
      status: 'refused',
      code: 'needs-simulation',
      class: 'nested-nonregular',
    });
    expect(r.table).toEqual([]);
  });
  test('runs the calibrated test when it is given the simulation', () => {
    const r = S.compareModels({
      pair: { ...REGULAR, boundary: true },
      n: 30,
      models,
      calibration: {
        observed: 5,
        simulate: u => 4 * u(),
        seed: 'unit',
        draws: 99,
      },
    });
    expect(r.status).toBe('ok');
    expect(r.result.atFloor).toBe(true);
    expect(r.result.claim).toBe('p <= 0.01');
    expect(r.table.find(t => /p/.test(t.quantity)).note).toMatch(/at most/);
  });
  test('ranks a non-nested pair by the criteria and attaches leave-one-out when asked', () => {
    const y = Array.from({ length: 24 }, (_, i) => Math.cos(i / 3));
    const loo = {
      y,
      models: [
        {
          name: 'mean',
          fitPredict: tr => tr.reduce((s, j) => s + y[j], 0) / tr.length,
        },
      ],
    };
    const r = S.compareModels({
      pair: { ...REGULAR, nested: false },
      n: 40,
      models,
      loo,
    });
    expect(r.status).toBe('ok');
    expect(r.result.method).toBe('information-criteria');
    expect(r.result.evidence).toBeNull();
    expect(r.result.weights).toBeNull();
    expect(r.loo.method).toBe('leave-one-out');
  });
  test('takes exactly two models and refuses an undeclared pair', () => {
    expect(
      S.compareModels({ pair: REGULAR, n: 30, models: [models[0]] }).code
    ).toBe('models');
    expect(S.compareModels({ pair: {}, n: 30, models }).code).toBe(
      'undeclared'
    );
  });
});

describe('simulation-calibrated significance', () => {
  const sim = u => u();
  test('is the add-one p value and never zero', () => {
    const hi = S.calibratedSignificance({
      observed: 2,
      simulate: sim,
      seed: 'a',
      draws: 99,
    });
    expect(hi).toMatchObject({ p: 0.01, atFloor: true, exceed: 0 });
    expect(hi.sigmaIsBound).toBe(true);
    const lo = S.calibratedSignificance({
      observed: -1,
      simulate: sim,
      seed: 'a',
      draws: 99,
    });
    expect(lo.p).toBe(1);
    expect(lo.sigma).toBe(0);
  });
  test('counts a tie against the alternative, and can run the other way', () => {
    const t = S.pValueFromDraws({ observed: 3, draws: [1, 3, 3, 5] });
    expect(t.exceed).toBe(3);
    expect(t.p).toBe(4 / 5);
    const l = S.pValueFromDraws({
      observed: 3,
      draws: [1, 3, 3, 5],
      direction: 'lower',
    });
    expect(l.exceed).toBe(3);
  });
  test('refuses what it cannot calibrate, and throws what is a caller error', () => {
    const t = f => {
      try {
        f();
      } catch (e) {
        return e.code;
      }
      return null;
    };
    expect(
      t(() =>
        S.calibratedSignificance({ observed: 1, simulate: sim, draws: 9 })
      )
    ).toBe('seed');
    expect(
      t(() =>
        S.calibratedSignificance({
          observed: 1,
          simulate: sim,
          seed: 1,
          draws: S.CALIBRATION.maxDraws + 1,
        })
      )
    ).toBe('budget');
    expect(
      t(() =>
        S.calibratedSignificance({
          observed: 1,
          simulate: sim,
          seed: 1,
          draws: 0.5,
        })
      )
    ).toBe('draws');
    expect(
      S.calibratedSignificance({
        observed: 1,
        simulate: sim,
        seed: 1,
        draws: 99,
        level: 0.005,
      }).code
    ).toBe('too-few-draws');
    expect(S.pValueFromDraws({ observed: NaN, draws: [1] }).code).toBe('input');
    const nan = S.pValueFromDraws({ observed: 1, draws: [1, NaN, 2] });
    expect(nan).toMatchObject({ code: 'non-finite-draws', nonFinite: 1 });
    expect(nan.p).toBeUndefined();
  });
  test('uses 999 draws by default (the default budget less one) and the stream it names', () => {
    expect(S.CALIBRATION.defaultDraws).toBe(S.DRAW_BUDGET.default - 1);
    const r = S.calibratedSignificance({
      observed: 0.5,
      simulate: sim,
      seed: 'z',
      label: 'lab',
    });
    expect(r.draws).toBe(999);
    expect(r.stream).toEqual({
      id: 'noise',
      algorithm: 'mulberry32',
      version: 1,
      key: 'z:lab',
    });
  });
  test('draw i depends on its index only: chunks equal the serial run, and each draw is its own named stream', () => {
    const simulate = u => u() - u();
    const all = S.calibrationDraws({ simulate, seed: 's', to: 50 }).draws;
    const a = S.calibrationDraws({ simulate, seed: 's', from: 0, to: 20 });
    const b = S.calibrationDraws({ simulate, seed: 's', from: 20, to: 50 });
    expect([...a.draws, ...b.draws]).toEqual([...all]);
    const u = stream('noise', 's', 'calibrated', 7);
    expect(all[7]).toBe(simulate(u));
  });
});

describe('the information criteria', () => {
  const two = [
    { name: 'a', k: 2, rss: 100 },
    { name: 'b', k: 3, rss: 80 },
  ];
  test('are -2 lnL + 2K, the small-sample AICc and -2 lnL + K ln n, with K = k + 1', () => {
    const r = S.informationCriteria({ n: 40, models: two });
    const lnL = (rss, n) => -(n / 2) * (Math.log((2 * Math.PI * rss) / n) + 1);
    const a = r.rows[0];
    expect(a.K).toBe(3);
    expect(a.aic).toBeCloseTo(-2 * lnL(100, 40) + 6, 10);
    expect(a.aicc).toBeCloseTo(a.aic + (2 * 3 * 4) / (40 - 3 - 1), 10);
    expect(a.bic).toBeCloseTo(-2 * lnL(100, 40) + 3 * Math.log(40), 10);
    expect(r.rows[1].dAic).toBe(0);
    expect(r.preferred).toEqual({ aic: 'b', aicc: 'b', bic: 'b' });
  });
  test('claim no evidence and no weights, flag a disagreement and a searched parameter', () => {
    const r = S.informationCriteria({
      n: 40,
      models: [
        { name: 'a', k: 1, rss: 100 },
        { name: 'b', k: 4, rss: 70, searched: true },
      ],
    });
    expect(r.evidence).toBeNull();
    expect(r.weights).toBeNull();
    expect(r.cautions.join(' ')).toMatch(/not penalised/);
    expect(r.limits.join(' ')).toMatch(/not evidence/);
    // a gap in rss the two penalties read differently: AIC takes the larger model, BIC the smaller
    const d = S.informationCriteria({
      n: 60,
      models: [
        { name: 'small', k: 1, rss: 100 },
        { name: 'large', k: 3, rss: 100 * Math.exp(-(2 * 3) / 60) },
      ],
    });
    expect(d.preferred.aic).toBe('large');
    expect(d.preferred.bic).toBe('small');
    expect(d.disagree).toBe(true);
  });
  test('are refused below the committed sample size, at the boundary and for bad input', () => {
    expect(S.CRITERIA_LIMITS).toMatchObject({ minN: 20, perParameter: 5 });
    const m = k => [
      { k: 1, rss: 5 },
      { k, rss: 4 },
    ];
    expect(S.informationCriteria({ n: 19, models: m(2) }).code).toBe(
      'sample-size'
    );
    expect(S.informationCriteria({ n: 24, models: m(5) }).code).toBe(
      'sample-size'
    );
    expect(S.informationCriteria({ n: 20, models: m(3) }).status).toBe('ok');
    expect(
      S.informationCriteria({ n: 40, models: [{ k: 1, rss: 0 }, ...m(2)] }).code
    ).toBe('zero-rss');
    expect(
      S.informationCriteria({ n: 40, models: [{ K: 2, lnL: NaN }, ...m(2)] })
        .code
    ).toBe('input');
    expect(
      S.informationCriteria({ n: 40, models: [{ k: 1.5, rss: 1 }, ...m(2)] })
        .code
    ).toBe('counts');
  });
  test('accept a log-likelihood and its K as given', () => {
    const r = S.informationCriteria({
      n: 50,
      models: [
        { name: 'x', K: 3, lnL: -100 },
        { name: 'y', K: 4, lnL: -98.5 },
      ],
    });
    expect(r.rows[0].aic).toBe(206);
    expect(r.rows[1].aic).toBe(205);
    expect(r.preferred.aic).toBe('y');
  });
});

describe('leave-one-out cross-validation', () => {
  const y = [1.1, 2.2, 2.9, 4.2, 5.1, 5.8, 7.2, 8.1, 8.8, 10.1];
  const lineFit = (train, i) => {
    const n = train.length;
    let sx = 0;
    let sy = 0;
    let sxx = 0;
    let sxy = 0;
    for (const j of train) {
      sx += j;
      sy += y[j];
      sxx += j * j;
      sxy += j * y[j];
    }
    const b = (n * sxy - sx * sy) / (n * sxx - sx * sx);
    return (sy - b * sx) / n + b * i;
  };
  const meanFit = train => train.reduce((s, j) => s + y[j], 0) / train.length;
  test('is deterministic and prefers the model that predicts the held-out row', () => {
    const run = () =>
      S.leaveOneOut({
        y,
        models: [
          { name: 'mean', fitPredict: meanFit },
          { name: 'line', fitPredict: lineFit },
        ],
      });
    const a = run();
    const b = run();
    expect(a.best).toBe('line');
    expect([...a.models[1].residuals]).toEqual([...b.models[1].residuals]);
    const mean = a.against.find(x => x.name === 'mean');
    expect(mean.meanExtraError).toBeGreaterThan(0);
    expect(a.seKind).toBe('naive');
    expect(a.limits.join(' ')).toMatch(/too small/);
  });
  test('refuses what it cannot cross-validate', () => {
    const m = [{ name: 'm', fitPredict: meanFit }];
    expect(S.leaveOneOut({ y: y.slice(0, 4), models: m }).code).toBe(
      'sample-size'
    );
    expect(() =>
      S.leaveOneOut({ y: new Array(S.LOO_LIMITS.maxN + 1).fill(1), models: m })
    ).toThrow(/budget/);
    expect(
      S.leaveOneOut({ y, models: [{ name: 'n', fitPredict: () => NaN }] }).code
    ).toBe('non-finite');
  });
});

describe('the install', () => {
  test('the kernel is a pure module: no clock, no Math.random, only the allowed imports', () => {
    const src = readFileSync(
      new URL('../js/kernels/statistics/modelcompare.js', import.meta.url),
      'utf8'
    );
    expect(src).not.toMatch(/Math\.random|Date\.now|performance\.now|new Date/);
    expect(
      [...src.matchAll(/^import .* from '([^']+)'/gm)].map(m => m[1]).sort()
    ).toEqual([
      '../../random/streams.js',
      './check.js',
      './compare.js',
      './intervals.js',
      './resample.js',
    ]);
  });
  test('is never precached, and no shipped module imports it', async () => {
    expect(
      NEVER_PRECACHED.some(re =>
        re.test('js/kernels/statistics/modelcompare.js')
      )
    ).toBe(true);
    const { paths } = await buildManifest();
    expect(paths).not.toContain('js/kernels/statistics/modelcompare.js');
  });
});
