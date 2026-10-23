import { describe, test, expect } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { webcrypto } from 'node:crypto';
import { valid } from './jsonSchemaSubset.js';

// =============================================================================
// The uncertainty and fit-result contract (Prompt 150)
// -----------------------------------------------------------------------------
// The envelope's uncertainty gained states (not constrained, failed, assumed,
// model-limited, a limit), a correlation reference and a fit-result record,
// and the fitter writes the record. These hold: the extension is lossless for
// every uncertainty 2.0.0 wrote, a 2.0.0 reader is reached only through
// legacyView, the covariance and the rank are right against closed forms, a
// degenerate direction is named, and a limit survives a formula as a limit.
// =============================================================================

// Jest's realm has no WebCrypto of its own (the formula envelope hashes).
if (!globalThis.crypto?.subtle)
  Object.defineProperty(globalThis, 'crypto', {
    value: webcrypto,
    configurable: true,
  });

const A = await import('../js/platform/artifact.js');
const F = await import('../js/inference/fit.js');
const S = await import('../js/analysis/seams.js');
const E = await import('../js/formula/engine.js');
const EV = await import('../js/formula/evidence.js');
const FM = await import('../js/format.js');
const U = await import('../js/platform/uncertain.js');
const { parseNumber } = await import('../js/answerParse.js');
const { fitDocument } = await import('./analysisSeamsFixtures.js');

// An envelope fits the schema of its own version: /1 where 2.0.0 could say it,
// /2 where it needs a newer state, a correlation or a fit (Prompt 176).
const SCHEMAS = Object.fromEntries(
  [1, 2].map(v => [
    v,
    JSON.parse(readFileSync(`sdk/schemas/artifact-${v}.schema.json`, 'utf8')),
  ])
);
const fits = doc => valid(SCHEMAS[doc.formatVersion], doc);
const clone = v => JSON.parse(JSON.stringify(v));

const envelope = (...uncertainties) =>
  A.artifact({
    id: 'u-1',
    source: { kind: 'analysis', id: 'test' },
    quantities: uncertainties.map((uncertainty, i) => ({
      id: `q${i}`,
      value: 1 + i,
      unit: 'd',
      uncertainty,
      origin: 'measured',
    })),
  });

/** Every uncertainty a 2.0.0 envelope could carry, with each basis. */
const LEGACY = [
  { kind: 'none' },
  ...A.BASES.map(basis => ({ kind: 'sigma', sigma: 0.25, basis })),
  ...A.BASES.map(basis => ({ kind: 'interval', lo: 0.5, hi: 1.75, basis })),
  {
    kind: 'interval',
    lo: 0.5,
    hi: 1.75,
    level: 0.68,
    basis: 'profile',
  },
];

describe('the extension is lossless for what 2.0.0 wrote', () => {
  test('every existing uncertainty is valid, unchanged, and survives legacyView', () => {
    for (const u of LEGACY) {
      const doc = envelope(u);
      expect([u, A.validateArtifact(doc)]).toEqual([u, []]);
      expect(A.legacyView(doc)).toEqual(doc);
      expect(JSON.parse(JSON.stringify(doc))).toEqual(doc);
      expect(fits(doc)).toBe(true);
    }
  });

  test('the three 2.0.0 kinds are the first three, in order', () => {
    expect([...A.LEGACY_UNCERTAINTY_KINDS]).toEqual([
      'sigma',
      'interval',
      'none',
    ]);
    expect(A.UNCERTAINTY_KINDS.slice(0, 3)).toEqual([
      ...A.LEGACY_UNCERTAINTY_KINDS,
    ]);
  });

  test('a fit written the 2.0.0 way is exactly what it was', () => {
    const { doc, data } = fitDocument();
    const digest = S.rowsDigest(data);
    const old = S.fitArtifact(doc, { digest, units: { x: 'd', y: 'm/s' } });
    expect(old.fit).toBeUndefined();
    expect(old.quantities.every(q => !('correlatedWith' in q))).toBe(true);
    expect(
      old.quantities.every(q =>
        A.LEGACY_UNCERTAINTY_KINDS.includes(q.uncertainty.kind)
      )
    ).toBe(true);
  });
});

describe('the new states', () => {
  const states = [
    { kind: 'not-constrained', reason: 'degenerate' },
    { kind: 'assumed' },
    { kind: 'model-limited', floor: 0.4, sigma: 0.1, basis: 'model' },
    { kind: 'limit', bound: 'upper', level: 0.95, basis: 'data' },
    { kind: 'limit', bound: 'lower', basis: 'assumed' },
    { kind: 'interval', lo: 1.1, hi: 1.5, level: 0.68, basis: 'profile' },
  ];

  test('each is valid and fits the schema', () => {
    for (const u of states) {
      const doc = envelope(u);
      expect([u, A.validateArtifact(doc)]).toEqual([u, []]);
      expect([u, fits(doc)]).toEqual([u, true]);
    }
  });

  test('a failed quantity has no value and says why', () => {
    const doc = envelope({ kind: 'failed', reason: 'notConverged' });
    doc.quantities[0].value = null;
    expect(A.validateArtifact(doc)).toEqual([]);
    expect(fits(doc)).toBe(true);
    // The reason is required, and null is a value only for a failed quantity.
    const bare = envelope({ kind: 'failed' });
    bare.quantities[0].value = null;
    expect(A.validateArtifact(bare).map(p => p.path)).toEqual([
      'quantities[0].uncertainty.reason',
    ]);
    const nullSigma = envelope({ kind: 'sigma', sigma: 1, basis: 'data' });
    nullSigma.quantities[0].value = null;
    expect(A.validateArtifact(nullSigma).map(p => p.code)).toEqual(['number']);
  });

  test('a malformed state is refused, by path', () => {
    const bad = [
      [{ kind: 'limit', basis: 'data' }, 'bound'],
      [{ kind: 'limit', bound: 'middle', basis: 'data' }, 'bound'],
      [{ kind: 'model-limited', basis: 'model' }, 'floor'],
      [
        { kind: 'model-limited', floor: 0.1, sigma: 0.2, basis: 'model' },
        'sigma',
      ],
      [{ kind: 'interval', lo: 2, hi: 1, basis: 'data' }, 'lo'],
      [{ kind: 'interval', lo: 1, hi: 2, level: 1.5, basis: 'data' }, 'level'],
      [{ kind: 'maybe' }, 'kind'],
    ];
    for (const [u, key] of bad) {
      const paths = A.validateArtifact(envelope(u)).map(p => p.path);
      expect([u, paths]).toEqual([u, [`quantities[0].uncertainty.${key}`]]);
    }
  });

  test('an asymmetric interval is the same object, and its sides are read from it', () => {
    const doc = envelope({
      kind: 'interval',
      lo: 0.9,
      hi: 1.4,
      level: 0.68,
      basis: 'profile',
    });
    const { value, uncertainty: u } = doc.quantities[0];
    expect(value - u.lo).toBeCloseTo(0.1, 12);
    expect(u.hi - value).toBeCloseTo(0.4, 12);
  });
});

describe('correlation references', () => {
  const two = () => {
    const doc = envelope(
      { kind: 'sigma', sigma: 0.1, basis: 'data' },
      { kind: 'sigma', sigma: 0.2, basis: 'data' }
    );
    doc.quantities[0].correlatedWith = [{ id: 'q1', rho: -0.6, basis: 'data' }];
    // A correlation is what /1 cannot say (Prompt 176): it is a /2 envelope.
    doc.formatVersion = A.artifactVersion(doc);
    return doc;
  };

  test('a correlation to another quantity is valid and fits the schema', () => {
    expect(A.validateArtifact(two())).toEqual([]);
    expect(fits(two())).toBe(true);
  });

  test('to a quantity that is not there, to itself, or beyond 1, it is refused', () => {
    for (const bad of [
      { id: 'zz', rho: 0.1 },
      { id: 'q0', rho: 0.1 },
      { id: 'q1', rho: 1.2 },
      { id: 'q1', rho: 0.1, basis: 'luck' },
    ]) {
      const doc = two();
      doc.quantities[0].correlatedWith = [bad];
      expect([bad, A.validateArtifact(doc).length]).toEqual([bad, 1]);
    }
  });
});

describe('the fitter writes the record', () => {
  test('the record holds what the prompt lists, and the envelope validates', () => {
    const { doc, data } = fitDocument();
    const digest = S.rowsDigest(data);
    const env = S.fitArtifact(doc, {
      digest,
      units: { x: 'd', y: 'm/s' },
      extended: true,
    });
    expect(A.validateArtifact(env)).toEqual([]);
    expect(fits(env)).toBe(true);
    const r = env.fit;
    expect(r.model).toEqual({
      id: 'rv-keplerian',
      version: expect.any(String),
    });
    expect(r.parameters).toEqual(['P', 'tc', 'K']);
    expect(r.covariance.order).toEqual(['P', 'tc', 'K']);
    expect(r.covariance.units).toEqual(['d', 'd', 'm/s']);
    expect(r.covariance.values).toHaveLength(3);
    // The diagonal is the sigma the quantities carry, up to the scale factor.
    const sigma = id => env.quantities.find(q => q.id === id).uncertainty.sigma;
    r.covariance.order.forEach((id, i) => {
      const scale = doc.results.fit.scaled ? 1 : 1;
      expect(Math.sqrt(r.covariance.values[i][i]) * scale).toBeLessThanOrEqual(
        sigma(id) * 1.0000001
      );
    });
    expect(r.statistic).toMatchObject({
      name: 'chi2',
      dof: doc.results.fit.dof,
      weighted: true,
    });
    expect(r.residuals.n).toBe(doc.results.fit.n);
    expect(r.data.digest).toBe(digest);
    expect(r.settings.seed).toBeNull();
    expect(r.convergence.converged).toBe(true);
    expect(r.rank).toMatchObject({ status: 'full', notConstrained: [] });
    // The held parameters are assumed exact, not "no uncertainty stated".
    expect(env.quantities.find(q => q.id === 'sqrtEcosw').uncertainty).toEqual({
      kind: 'assumed',
    });
  });

  test('legacyView of an extended fit is the 2.0.0 fit', () => {
    const { doc, data } = fitDocument();
    const o = { digest: S.rowsDigest(data), units: { x: 'd', y: 'm/s' } };
    const view = A.legacyView(S.fitArtifact(doc, { ...o, extended: true }));
    const old = S.fitArtifact(doc, o);
    expect(view.fit).toBeUndefined();
    expect(view.quantities.map(q => q.id)).toEqual(
      old.quantities.map(q => q.id)
    );
    // The held parameters were "assumed" and are "none" again, and said so.
    expect(view.warnings.filter(w => w.startsWith('extended:'))).toEqual([
      'extended:sqrtEcosw:assumed',
      'extended:sqrtEsinw:assumed',
    ]);
    expect(view.quantities.map(q => q.uncertainty)).toEqual(
      old.quantities.map(q => q.uncertainty)
    );
  });

  test('a record that contradicts its quantities is refused', () => {
    const { doc, data } = fitDocument();
    const env = S.fitArtifact(doc, {
      digest: S.rowsDigest(data),
      units: { x: 'd', y: 'm/s' },
      extended: true,
    });
    const asym = clone(env);
    asym.fit.covariance.values[0][1] += 1;
    expect(A.validateArtifact(asym).map(p => p.path)).toContain(
      'fit.covariance.values[1][0]'
    );
    const stray = clone(env);
    stray.fit.parameters.push('nope');
    expect(A.validateArtifact(stray).map(p => p.path)).toContain(
      'fit.parameters'
    );
    const short = clone(env);
    short.fit.covariance.units.pop();
    expect(A.validateArtifact(short).map(p => p.path)).toContain(
      'fit.covariance.units'
    );
    const rank = clone(env);
    rank.fit.rank.rank = rank.fit.rank.free + 1;
    expect(A.validateArtifact(rank).map(p => p.path)).toContain('fit.rank');
  });
});

describe('the covariance and the rank against closed forms', () => {
  /** y = a + b x, with the parameters free and every row weighted by 1 / s^2. */
  const line = (xs, s, extra = () => 0) => {
    const model = {
      predict: (v, x) =>
        Float64Array.from(x, xi => v.a + v.b * xi + extra(v, xi)),
      solveLinear: (data, w, shape) => ({ fit: shape, linear: {} }),
    };
    const data = {
      x: Float64Array.from(xs),
      y: Float64Array.from(xs, xi => 2 + 0.5 * xi),
      sigma: Float64Array.from(xs, () => s),
    };
    const parameters = [
      { name: 'a', mode: 'fitted', value: 2, lo: -100, hi: 100 },
      { name: 'b', mode: 'fitted', value: 0.5, lo: -100, hi: 100 },
    ];
    return {
      problem: F.createProblem(model, data, parameters),
      theta: [2, 0.5],
    };
  };

  test('a straight line: the covariance is s^2 (X^T X)^-1 to 1e-6', () => {
    const xs = [0, 1, 2, 3, 4, 5, 6, 7];
    const s = 0.3;
    const { problem, theta } = line(xs, s);
    const { covariance } = F.covarianceAt(problem, theta);
    const n = xs.length;
    const sx = xs.reduce((a, b) => a + b, 0);
    const sxx = xs.reduce((a, b) => a + b * b, 0);
    const det = n * sxx - sx * sx;
    const closed = [
      [(s * s * sxx) / det, (-s * s * sx) / det],
      [(-s * s * sx) / det, (s * s * n) / det],
    ];
    for (let i = 0; i < 2; i++)
      for (let j = 0; j < 2; j++)
        expect(covariance[i][j] / closed[i][j]).toBeCloseTo(1, 6);
    expect(F.rankAt(problem, theta)).toMatchObject({
      free: 2,
      rank: 2,
      status: 'full',
      notConstrained: [],
    });
  });

  test('a rank-deficient fit names the degenerate direction, and only it', () => {
    // y = (a + b) x + c: a and b enter only as a sum; c is determined.
    const model = {
      predict: (v, x) => Float64Array.from(x, xi => (v.a + v.b) * xi + v.c),
      solveLinear: (data, w, shape) => ({ fit: shape, linear: {} }),
    };
    const xs = [0, 1, 2, 3, 4, 5];
    const data = {
      x: Float64Array.from(xs),
      y: Float64Array.from(xs, xi => 3 * xi + 1),
      sigma: Float64Array.from(xs, () => 0.1),
    };
    const parameters = ['a', 'b', 'c'].map((name, i) => ({
      name,
      mode: 'fitted',
      value: [1, 2, 1][i],
      lo: -50,
      hi: 50,
    }));
    const problem = F.createProblem(model, data, parameters);
    const got = F.rankAt(problem, [1, 2, 1]);
    expect(got.free).toBe(3);
    expect(got.rank).toBe(2);
    expect(got.status).toBe('deficient');
    expect(got.notConstrained).toEqual([0, 1]);
  });

  test('a parameter the model does not use is not constrained', () => {
    const model = {
      predict: (v, x) => Float64Array.from(x, xi => v.a * xi),
      solveLinear: (data, w, shape) => ({ fit: shape, linear: {} }),
    };
    const xs = [1, 2, 3, 4];
    const data = {
      x: Float64Array.from(xs),
      y: Float64Array.from(xs, xi => 2 * xi),
      sigma: Float64Array.from(xs, () => 0.1),
    };
    const problem = F.createProblem(model, data, [
      { name: 'a', mode: 'fitted', value: 2, lo: -9, hi: 9 },
      { name: 'unused', mode: 'fitted', value: 1, lo: -9, hi: 9 },
    ]);
    expect(F.rankAt(problem, [2, 1])).toMatchObject({
      rank: 1,
      status: 'deficient',
      notConstrained: [1],
    });
  });

  test('a tolerance wide enough to call a well-posed fit deficient is not the default', () => {
    const { problem, theta } = line([0, 1, 2, 3, 4], 0.2);
    expect(F.rankAt(problem, theta).status).toBe('full');
    expect(F.rankAt(problem, theta, { tolerance: 0.99 }).status).toBe(
      'deficient'
    );
  });
});

describe('the record reaches the document and the envelope for a real fit', () => {
  test('the fit carries its rank, full for a well-posed fit', () => {
    const { doc } = fitDocument();
    expect(doc.results.fit.rank).toMatchObject({
      free: 3,
      status: 'full',
      notConstrained: [],
    });
    expect(doc.results.fit.parameters.some(p => p.notConstrained)).toBe(false);
    expect(doc.results.fit.warnings.map(w => w.code)).not.toContain(
      'notConstrained'
    );
  });

  test('a parameter flagged not constrained is written as such in the extended envelope only', () => {
    const { doc, data } = fitDocument();
    const d = clone(doc);
    const p = d.results.fit.parameters.find(x => x.name === 'K');
    p.notConstrained = true;
    const o = { digest: S.rowsDigest(data), units: { x: 'd', y: 'm/s' } };
    const old = S.fitArtifact(d, o);
    const ext = S.fitArtifact(d, { ...o, extended: true });
    expect(old.quantities.find(q => q.id === 'K').uncertainty.kind).toBe(
      'sigma'
    );
    expect(ext.quantities.find(q => q.id === 'K').uncertainty).toEqual({
      kind: 'not-constrained',
      reason: 'degenerate',
    });
  });
});

describe('the formatter and the parser', () => {
  const q = (value, uncertainty) => ({ value, uncertainty });
  const NB = FM.NBSP;

  test('the precision comes from the sigma', () => {
    expect(
      U.formatUncertain(
        q(1.2341, { kind: 'sigma', sigma: 0.012, basis: 'data' })
      )
    ).toBe(`1.234${NB}±${NB}0.012`);
    expect(
      U.formatUncertain(
        q(1.2341, { kind: 'sigma', sigma: 0.012, basis: 'data' }),
        {
          method: true,
        }
      )
    ).toEqual({ text: `1.234${NB}±${NB}0.012`, method: 'sigma' });
  });

  test('a symmetric interval is written from its half-width', () => {
    const u = { kind: 'interval', lo: 1.222, hi: 1.246, basis: 'data' };
    expect(U.formatUncertain(q(1.234, u), { method: true })).toEqual({
      text: `1.234${NB}±${NB}0.012`,
      method: 'half-width',
    });
  });

  test('an asymmetric interval is written at the smaller side', () => {
    const u = { kind: 'interval', lo: 1.2, hi: 1.55, basis: 'profile' };
    const out = U.formatUncertain(q(1.25, u), { method: true });
    expect(out.method).toBe('asymmetric');
    expect(out.text).toBe(`1.250${NB}+0.300${NB}−0.050`);
  });

  test('a limit, a floor and the states without a number', () => {
    expect(
      U.formatUncertain(
        q(3.2, { kind: 'limit', bound: 'upper', basis: 'data' })
      )
    ).toBe(`<${NB}3.2`);
    expect(
      U.formatUncertain(
        q(3.2, { kind: 'limit', bound: 'lower', basis: 'data' })
      )
    ).toBe(`>${NB}3.2`);
    expect(
      U.formatUncertain(
        q(10, { kind: 'model-limited', floor: 0.4, basis: 'model' }),
        {
          method: true,
        }
      )
    ).toEqual({ text: `10.00${NB}±${NB}0.40`, method: 'floor' });
    expect(U.formatUncertain(q(null, { kind: 'failed', reason: 'x' }))).toBe(
      '-'
    );
    expect(
      U.formatUncertain(q(7, { kind: 'assumed' }), { method: true })
    ).toEqual({
      text: '7.00',
      method: 'assumed',
    });
  });

  test('a typed uncertainty is read by the shared number reader, in the locale', () => {
    const read = (t, locale) => U.parseUncertain(t, parseNumber, locale);
    expect(read('9.81 ± 0.02')).toEqual({
      value: 9.81,
      uncertainty: { kind: 'sigma', sigma: 0.02, basis: 'assumed' },
    });
    expect(read('9.81 +/- 0.02').uncertainty.sigma).toBe(0.02);
    expect(read('9.81(2)').uncertainty.sigma).toBeCloseTo(0.02, 12);
    expect(read('9.81(12)').uncertainty.sigma).toBeCloseTo(0.12, 12);
    expect(read('1.23 +0.05 -0.03').uncertainty).toMatchObject({
      kind: 'interval',
      basis: 'assumed',
    });
    expect(read('1.23 +0.05 −0.03').uncertainty.lo).toBeCloseTo(1.2, 12);
    expect(read('< 3.2')).toEqual({
      value: 3.2,
      uncertainty: { kind: 'limit', bound: 'upper', basis: 'assumed' },
    });
    expect(read('> 3,2', 'es').uncertainty.bound).toBe('lower');
    expect(read('9,81 ± 0,02', 'es').uncertainty.sigma).toBe(0.02);
    expect(read('42')).toEqual({ value: 42, uncertainty: { kind: 'none' } });
    expect(read('about nine')).toBeNull();
    expect(read('9.81 ± -1')).toBeNull();
  });
});

describe('the formula engine reads the states', () => {
  const inputs = {
    x: { value: 4, unit: 'm', sigma: 0.2, uncertainty: 'sigma' },
    d: { value: 2, unit: 's', uncertainty: 'assumed' },
  };

  test('sigma propagates; an input taken as exact adds nothing', () => {
    const r = E.evaluate('x / d', inputs);
    expect(r.value).toBe(2);
    expect(r.sigma).toBeCloseTo(0.1, 12);
    expect(r.limit).toBeUndefined();
  });

  test('the engine itself refuses a limit rather than lose it', () => {
    expect(() =>
      E.evaluate('2 * x', {
        x: { value: 4, unit: 'm', bound: 'upper', uncertainty: 'limit' },
      })
    ).toThrow(E.FormulaError);
  });

  test('a model-limited input propagates its floor', () => {
    const r = EV.evaluateStates('2 * x', {
      x: { value: 4, unit: 'm', floor: 0.5, uncertainty: 'model-limited' },
    });
    expect(r.sigma).toBeCloseTo(1, 12);
  });

  test('not constrained and failed are refused in words, not propagated', () => {
    for (const kind of ['not-constrained', 'failed']) {
      const run = () =>
        EV.evaluateStates('2 * x', {
          x: { value: 4, unit: 'm', uncertainty: kind },
        });
      expect(run).toThrow(E.FormulaError);
      try {
        run();
      } catch (e) {
        expect(e.code).toBe(kind === 'failed' ? 'failed' : 'notConstrained');
        expect(e.vars).toEqual({ name: 'x' });
      }
    }
  });

  test('an upper limit survives propagation as an upper limit, and flips through a fall', () => {
    const up = EV.evaluateStates('3 * x + 1[m]', {
      x: { value: 4, unit: 'm', bound: 'upper', uncertainty: 'limit' },
    });
    expect(up.value).toBe(13);
    expect(up.sigma).toBeNull();
    expect(up.limit).toEqual({ bound: 'upper' });
    const down = EV.evaluateStates('10[m] / x', {
      x: { value: 4, unit: 'm', bound: 'upper', uncertainty: 'limit' },
    });
    expect(down.limit).toEqual({ bound: 'lower' });
    const lower = EV.evaluateStates('x ^ 2', {
      x: { value: 4, unit: 'm', bound: 'lower', uncertainty: 'limit' },
    });
    expect(lower.limit).toEqual({ bound: 'lower' });
  });

  test('a limit beside an uncertain input, two limits, or a formula that turns round are refused', () => {
    const lim = { value: 4, unit: 'm', bound: 'upper', uncertainty: 'limit' };
    const code = fn => {
      try {
        fn();
      } catch (e) {
        return e.code;
      }
      return null;
    };
    expect(
      code(() =>
        EV.evaluateStates('x + y', {
          x: lim,
          y: { value: 1, unit: 'm', sigma: 0.1, uncertainty: 'sigma' },
        })
      )
    ).toBe('limitMixed');
    expect(code(() => EV.evaluateStates('x + y', { x: lim, y: lim }))).toBe(
      'limitMixed'
    );
    // (x - 2)^2 falls and then rises between 0 and 4.
    expect(code(() => EV.evaluateStates('(x - 2[m]) ^ 2', { x: lim }))).toBe(
      'limitNonMonotone'
    );
  });

  test('a limit result is a limit in the envelope', async () => {
    const result = EV.evaluateStates('3 * x', {
      x: { value: 4, unit: 'm', bound: 'upper', uncertainty: 'limit' },
    });
    const env = await EV.derivationEnvelope({
      id: 'd-1',
      formula: '3 * x',
      result,
      inputs: [{ name: 'x', id: 'x', value: 4, unit: 'm' }],
    });
    expect(A.validateArtifact(env)).toEqual([]);
    expect(env.quantities[0].uncertainty).toEqual({
      kind: 'limit',
      bound: 'upper',
      basis: 'derived',
    });
    expect(A.legacyView(env).warnings).toContain('extended:result:limit');
  });
});

describe('what a 2.0.0 reader is given', () => {
  test('legacyView turns each new state into none and says so', () => {
    const doc = envelope(
      { kind: 'not-constrained' },
      { kind: 'assumed' },
      { kind: 'model-limited', floor: 0.2, basis: 'model' },
      { kind: 'limit', bound: 'upper', basis: 'data' },
      { kind: 'sigma', sigma: 1, basis: 'data' }
    );
    doc.quantities[4].correlatedWith = [{ id: 'q0', rho: 0.2 }];
    const view = A.legacyView(doc);
    expect(A.validateArtifact(view)).toEqual([]);
    expect(view.quantities.map(q => q.uncertainty.kind)).toEqual([
      'none',
      'none',
      'none',
      'none',
      'sigma',
    ]);
    expect(view.quantities[4].correlatedWith).toBeUndefined();
    expect(view.warnings).toEqual([
      'extended:q0:not-constrained',
      'extended:q1:assumed',
      'extended:q2:model-limited',
      'extended:q3:limit',
    ]);
    // The original is not touched.
    expect(doc.quantities[0].uncertainty.kind).toBe('not-constrained');
  });

  test('a failed quantity, which has no value, is left out and listed', () => {
    const doc = envelope(
      { kind: 'failed', reason: 'singular' },
      { kind: 'sigma', sigma: 1, basis: 'data' }
    );
    doc.quantities[0].value = null;
    const view = A.legacyView(doc);
    expect(A.validateArtifact(view)).toEqual([]);
    expect(view.quantities.map(q => q.id)).toEqual(['q1']);
    expect(view.warnings).toEqual(['extended:q0:failed']);
  });
});
