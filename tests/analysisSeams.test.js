import { describe, test, expect } from '@jest/globals';

// =============================================================================
// The seams between the experiment runner, the Observatory, the inference core
// and the analysis lab (Roadmap II, Prompt 66, steps 1 and 2)
// -----------------------------------------------------------------------------
//   experiment result -> observation   one table, per-setting summaries, the
//                                      intervals as uncertainty columns
//   observation <-> envelope           the round trip
//   observation -> inference core      dataFrom reads its x, mean and error
//   observation -> analysis lab        the same table's numbers are the lab's
//   fit, analysis, result -> envelope  each cites the digest of what it read
//   analysis file -> analysis lab      what the lab writes, the lab reads
// js/analysis/seams.js is the module; js/notebook/artifactEntry.js (the
// notebook half) is held in tests/notebookSeams.test.js.
// =============================================================================

import { readFileSync } from 'node:fs';
import { valid } from './jsonSchemaSubset.js';

const S = await import('../js/analysis/seams.js');
const A = await import('../js/analysis/sweepAnalysis.js');
const { validateObservation, uncertaintyOf } =
  await import('../js/observatory/schema.js');
const { validateArtifact } = await import('../js/platform/artifact.js');
const { observationJson } = await import('../js/observatory/export.js');
const { dataFrom } = await import('../js/inference/infer.js');
const stats = await import('../js/analysis/stats.js');
const importer = await import('../js/observatory/import.js');
const { METRIC_UNITS } = await import('../js/experiments/metrics.js');
const { reproducibility } =
  await import('../js/experiments/experimentManifest.js');

const { result, fitDocument, clone } =
  await import('./analysisSeamsFixtures.js');
const opts = { metricUnits: METRIC_UNITS };
const col = (o, id) => o.columns.find(c => c.id === id);
const same = (a, b) => expect(Array.from(a)).toEqual(Array.from(b));

describe('an experiment result as an observation', () => {
  const r = result();
  const o = S.resultToObservation(r, opts);

  test('is a valid gravitas.observation table whose source is the experiment', () => {
    expect(validateObservation(o)).toEqual([]);
    expect(o).toMatchObject({
      kind: 'table',
      origin: 'model',
      source: {
        kind: 'experiment',
        id: '3f2a1c9b',
        digest: S.trialsDigest(r),
        engine: 'aaaa0000',
      },
    });
    // The digest is the one the analysis records for the trials it read.
    expect(o.source.digest).toBe(S.trialsDigest(r));
  });

  test('has one row per setting, with its interval as uncertainty columns', () => {
    same(col(o, 'param:a').values, [1, 2, 3, 4, 5]);
    expect(col(o, 'mean:orbital_period')).toMatchObject({
      role: 'value',
      unit: 'd',
    });
    const u = uncertaintyOf(o, 'mean:orbital_period');
    expect(u.sigma.id).toBe('se:orbital_period');
    expect([u.lower.level, u.upper.level]).toEqual([0.95, 0.95]);
    // The numbers are the lab's own: the same describe and Student t.
    const cells = A.designOf(r).axes[0].values;
    expect(cells).toEqual([1, 2, 3, 4, 5]);
    const { describe: summarize, meanInterval } = stats;
    const vals = r.trials
      .filter(t => t.params.a === 3)
      .map(t => t.results.orbital_period);
    const d = summarize(vals);
    const ci = meanInterval(d);
    expect(col(o, 'mean:orbital_period').values[2]).toBe(d.mean);
    expect(u.sigma.values[2]).toBe(d.se);
    expect(u.lower.values[2]).toBeCloseTo(ci.lo - d.mean, 12);
    expect(u.upper.values[2]).toBeCloseTo(ci.hi - d.mean, 12);
    expect(u.lower.values[2]).toBeLessThan(0);
    same(col(o, 'n:orbital_period').values, [5, 5, 5, 5, 5]);
  });

  test('counts a trial that did not finish and never averages it in', () => {
    const lost = S.resultToObservation(
      result({ fail: (x, s) => x === 2 && s < 3 }),
      opts
    );
    expect(col(lost, 'n:orbital_period').values[1]).toBe(2);
    expect(validateObservation(lost)).toEqual([]);
    const gone = S.resultToObservation(result({ fail: x => x === 4 }), opts);
    same(col(gone, 'param:a').values, [1, 2, 3, 5]);
    expect(gone.reductions.join(' ')).toMatch(
      /1 setting\(s\) with no finished/
    );
  });

  test('a two-setting grid has a column for each setting', () => {
    const g = S.resultToObservation(result({ two: true }), opts);
    expect(validateObservation(g)).toEqual([]);
    expect(g.columns.filter(c => c.id.startsWith('param:'))).toHaveLength(2);
    expect(g.columns[0].values).toHaveLength(10);
  });

  test('refuses what is not a sweep result, and a metric it does not have', () => {
    expect(() => S.resultToObservation({ format: 'x' })).toThrow(
      /not an experiment result/
    );
    expect(() => S.resultToObservation(r, { metrics: ['nope'] })).toThrow(
      /no such metric/
    );
  });

  test('saves as a file the Observatory reads back, and the schema accepts it', async () => {
    const json = observationJson(o, { source: o, changes: [] });
    const schema = JSON.parse(
      readFileSync('sdk/schemas/observation-1.schema.json', 'utf8')
    );
    expect(valid(schema, JSON.parse(json))).toBe(true);
    const back = importer.read(json, { name: 'result.json' });
    expect(back.ok).toBe(true);
    expect(back.observation.source).toMatchObject({
      kind: 'experiment',
      id: '3f2a1c9b',
    });
    same(
      col(back.observation, 'mean:orbital_period').values,
      col(o, 'mean:orbital_period').values
    );
  });
});

describe('the table feeds the inference core and agrees with the analysis lab', () => {
  const r = result();
  const o = S.resultToObservation(r, opts);

  test('dataFrom reads x, the mean and its standard error', () => {
    const d = dataFrom(o);
    expect(d.columns).toEqual({
      x: 'param:a',
      y: 'mean:orbital_period',
      sigma: 'se:orbital_period',
    });
    expect(d.counts).toMatchObject({
      total: 5,
      used: 5,
      withoutUncertainty: 0,
    });
    expect(d.units.y).toBe('d');
    // Kepler's third law: the means follow a^1.5 to the noise.
    for (let i = 0; i < 5; i++)
      expect(d.y[i]).toBeCloseTo(365.25 * (i + 1) ** 1.5, 0);
  });

  test('a setting with a single finished trial has no error and is counted, not used', () => {
    const lost = S.resultToObservation(
      result({ fail: (x, s) => x === 2 && s > 0 }),
      opts
    );
    const d = dataFrom(lost);
    expect(d.counts).toMatchObject({
      total: 5,
      used: 4,
      withoutUncertainty: 1,
    });
  });

  test("each setting's mean and interval are the analysis lab's", async () => {
    const a = await A.analyzeSweep(r, {
      metric: 'orbital_period',
      resamples: 200,
      permutations: 199,
    });
    const mean = col(o, 'mean:orbital_period').values;
    const u = uncertaintyOf(o, 'mean:orbital_period');
    a.cells.forEach((c, i) => {
      expect(mean[i]).toBe(c.mean);
      expect(mean[i] + u.lower.values[i]).toBeCloseTo(c.meanInterval.lo, 9);
      expect(mean[i] + u.upper.values[i]).toBeCloseTo(c.meanInterval.hi, 9);
    });
  });
});

describe('the envelope round trip', () => {
  const r = result({ fail: (x, s) => x === 2 && s < 4 });
  const o = S.resultToObservation(r, opts);
  const env = S.observationArtifact(o);

  test('is a valid gravitas.artifact/1 that names the experiment and its trials', () => {
    expect(validateArtifact(env)).toEqual([]);
    expect(env.source).toEqual({
      kind: 'experiment',
      id: '3f2a1c9b',
      digest: S.trialsDigest(r),
    });
    expect(env.made.engineFingerprint).toBe('aaaa0000');
    const q = env.quantities.find(x => x.id === 'orbital_period|a=3');
    expect(q).toMatchObject({
      unit: 'd',
      origin: 'synthetic',
      uncertainty: { kind: 'interval', level: 0.95, basis: 'data' },
    });
    expect(q.uncertainty.lo).toBeLessThan(q.value);
  });

  test('comes back as the same table, to the last bit or two of an offset', () => {
    const back = S.artifactObservation(env);
    expect(validateObservation(back)).toEqual([]);
    expect(back.source).toEqual(o.source);
    expect(
      back.columns.map(c => [c.id, c.role, c.unit, c.of, c.level])
    ).toEqual(o.columns.map(c => [c.id, c.role, c.unit, c.of, c.level]));
    for (const c of o.columns) {
      const b = col(back, c.id).values;
      c.values.forEach((v, i) => {
        if (Number.isNaN(v)) expect(b[i]).toBeNaN();
        else expect(b[i]).toBeCloseTo(v, 10);
      });
      if (!/^(lo|hi):/.test(c.id)) same(b, c.values);
    }
    // And once more: the envelope of the table that came back is the same.
    expect(S.observationArtifact(back).quantities).toEqual(
      env.quantities.map(q => ({
        ...q,
        uncertainty:
          q.uncertainty.kind === 'interval'
            ? {
                ...q.uncertainty,
                lo: expect.closeTo(q.uncertainty.lo, 9),
                hi: expect.closeTo(q.uncertainty.hi, 9),
              }
            : q.uncertainty,
      }))
    );
  });

  test('survives the JSON it is saved in', () => {
    const back = S.artifactObservation(clone(env));
    same(col(back, 'n:orbital_period').values, [5, 1, 5, 5, 5]);
  });

  test('names come back as ids until they are named again', () => {
    const back = S.artifactObservation(env, {
      names: { params: { a: 'Mass' }, metrics: { orbital_period: 'Period' } },
      title: 'Kepler check',
    });
    expect(col(back, 'param:a').name).toBe('Mass');
    expect(col(back, 'mean:orbital_period').name).toBe('Period');
    expect(back.title).toBe('Kepler check');
  });

  test('refuses an envelope that is not an experiment, or not an envelope', () => {
    expect(() => S.artifactObservation({ format: 'x' })).toThrow(/format/);
    expect(() =>
      S.artifactObservation({
        ...env,
        source: { ...env.source, kind: 'analysis' },
      })
    ).toThrow(/not an experiment/);
    expect(() => S.observationArtifact({ source: { kind: 'pack' } })).toThrow(
      /not an experiment/
    );
  });
});

describe('analyses and fits as envelopes', () => {
  const r = result();

  test('an analysis cites the digest of the trials it consumed', async () => {
    const a = await A.analyzeSweep(r, {
      metric: 'orbital_period',
      resamples: 200,
      permutations: 199,
    });
    const env = S.analysisArtifact(a, opts);
    expect(validateArtifact(env)).toEqual([]);
    expect(env.source).toEqual({
      kind: 'analysis',
      id: 'sweep-analysis',
      version: '1.0.0',
      digest: S.trialsDigest(r),
    });
    expect(env.source.digest).toBe(a.consumed[0].digest);
    const ids = env.quantities.map(q => q.id);
    expect(ids).toEqual(
      expect.arrayContaining(['mean|a=1', 'median|a=5', 'slope', 'rho'])
    );
    expect(env.quantities.find(q => q.id === 'mean|a=2')).toMatchObject({
      unit: 'd',
      uncertainty: { kind: 'interval', level: 0.95 },
    });
    expect(env.made.engineFingerprint).toBe('aaaa0000');
    // It reproduces in the same words as the analysis it came from.
    expect(
      reproducibility(a, {
        engine: 'aaaa0000',
        digests: { '3f2a1c9b': S.trialsDigest(r) },
      }).reproducible
    ).toBe(true);
  });

  test('a fit cites the digest of the rows it read, and its parameters carry units and error', () => {
    const { doc, data } = fitDocument();
    const digest = S.rowsDigest(data);
    const env = S.fitArtifact(doc, { digest, units: { x: 'd', y: 'm/s' } });
    expect(validateArtifact(env)).toEqual([]);
    expect(env.source).toMatchObject({
      kind: 'inference',
      id: 'rv-keplerian',
      digest,
    });
    expect(env.source.digest).toBe(S.rowsDigest(data));
    const P = env.quantities.find(q => q.id === 'P');
    expect(P).toMatchObject({ unit: 'd', origin: 'fitted' });
    expect(P.value).toBeCloseTo(4.2308, 2);
    expect(['sigma']).toContain(P.uncertainty.kind);
    expect(env.quantities.find(q => q.id === 'sqrtEcosw')).toMatchObject({
      origin: 'fixed',
      uncertainty: { kind: 'none' },
    });
    // A different set of rows is a different digest.
    expect(S.rowsDigest({ ...data, y: data.y.map(v => v + 1) })).not.toBe(
      digest
    );
  });
});

describe('the analysis lab reads the analysis it writes', () => {
  test('a saved sweep analysis is accepted, anything else is refused with a reason', async () => {
    const a = await A.analyzeSweep(result(), {
      metric: 'orbital_period',
      resamples: 200,
      permutations: 199,
    });
    const saved = JSON.parse(JSON.stringify({ ...a, methods: 'x' }));
    const ok = S.readAnalysis(saved);
    expect(ok.ok).toBe(true);
    expect(ok.analysis.cells).toHaveLength(5);
    expect(S.readAnalysis({ ...saved, formatVersion: 2 })).toMatchObject({
      ok: false,
      reason: 'newer',
    });
    expect(S.readAnalysis({ ...saved, kind: 'models' })).toMatchObject({
      ok: false,
      reason: 'kind',
    });
    const broken = { ...saved };
    delete broken.cells;
    expect(S.readAnalysis(broken)).toMatchObject({
      ok: false,
      reason: 'shape',
    });
    expect(
      S.readAnalysis({ format: 'gravitas.experiment-result' })
    ).toMatchObject({
      ok: false,
      reason: 'format',
    });
    expect(S.readAnalysis('text')).toMatchObject({ ok: false });
  });
});
