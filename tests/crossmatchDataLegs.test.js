// =============================================================================
// The data legs of the crossmatch and clustering gates (Prompt 263 follow-up)
// -----------------------------------------------------------------------------
// Reads tests/fixtures/crossmatch/ and holds the pinned runs of D5a to D5e,
// D4b, B8c, B10 and B9 to the thresholds that were committed before any
// computation on the downloaded data: every committed check has one row, the
// committed kind decides the status, the bounds are applied to the measured
// numbers, the oracle ran against the thresholds file that is in the tree, the
// sources are recorded with their sha256, and no home path is committed. The
// downloads themselves are outside every repository and are not read here
// (tools/crossmatch-data-validate.mjs and the spike's clustering-strip-dec.mjs
// read them).
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { URL } from 'node:url';

const read = name =>
  readFileSync(
    new URL(`./fixtures/crossmatch/${name}`, import.meta.url),
    'utf8'
  );
const json = name => JSON.parse(read(name));
const sha = name => createHash('sha256').update(read(name)).digest('hex');
const thr = json('data-legs-thresholds.json');
const xm = json('data-legs-results.json');
const cl = json('data-legs-clustering-results.json');
const oracle = json('data-legs-oracle.json');
const sources = json('SOURCES.json');
const rows = [...xm.rows, ...cl.rows];
const row = id => rows.find(r => r.id === id);
const L = id => thr.checks.find(c => c.id === id).limits;

describe('the data legs follow the committed thresholds', () => {
  test('every committed check has exactly one row, and no row is uncommitted', () => {
    expect(rows.map(r => r.id).sort()).toEqual(
      thr.checks.map(c => c.id).sort()
    );
  });

  test('the committed kind decides which statuses a row may have', () => {
    for (const c of thr.checks) {
      const r = row(c.id);
      if (c.kind === 'bound') expect(['pass', 'fail']).toContain(r.status);
      if (c.kind === 'reported') expect(r.status).toBe('reported');
      if (c.kind === 'notrun') expect(r.status).toBe('not run');
    }
  });

  test('the counts and failed lists are what the rows say', () => {
    for (const f of [xm, cl]) {
      expect(f.failed).toEqual(
        f.rows.filter(r => r.status === 'fail').map(r => r.id)
      );
      expect(f.counts).toEqual({
        pass: f.rows.filter(r => r.status === 'pass').length,
        fail: f.failed.length,
        reported: f.rows.filter(r => r.status === 'reported').length,
        'not run': f.rows.filter(r => r.status === 'not run').length,
      });
    }
  });

  test('the bounds applied to the measured numbers', () => {
    expect(row('D5a.rowIdentity').measured.maxStepFraction).toBeLessThanOrEqual(
      L('D5a.rowIdentity').maxStepFraction
    );
    expect(
      row('D5c.perObjectEpochPairs').measured.differing
    ).toBeLessThanOrEqual(L('D5c.perObjectEpochPairs').maxDifferences);
    const d5d = row('D5d.publishedBestNeighbour').measured;
    expect(d5d.kernelOnly / d5d.nK).toBeLessThanOrEqual(
      L('D5d.publishedBestNeighbour').maxKernelOnlyFraction
    );
    expect(d5d.publishedOnly1 / d5d.nK).toBeLessThanOrEqual(
      L('D5d.publishedBestNeighbour').maxPublishedOnlyFraction
    );
    expect(d5d.tolerance).toBe(thr.constants.tolerance.value);
    const id = row('B8c.sampleIdentity').measured;
    expect(id.selected).toBe(L('B8c.sampleIdentity').count);
    expect(id.maxStepFraction).toBeLessThanOrEqual(
      L('B8c.sampleIdentity').maxStepFraction
    );
    const b10 = row('B10.stripOracle').measured;
    for (const f of ['F1', 'F2']) {
      expect(b10[f].maxDDDifference).toBeLessThanOrEqual(
        L('B10.stripOracle').maxDDDifference
      );
      expect(Math.max(...b10[f].sigmaDifference)).toBeLessThanOrEqual(
        L('B10.stripOracle').maxCombinedSigma
      );
    }
    // the statuses agree with those bounds
    for (const c of thr.checks.filter(c => c.kind === 'bound'))
      expect(row(c.id).status).toBe('pass');
  });

  test('the kernel and the oracle agree on the pairs and the published comparison', () => {
    const k = row('D5c.perObjectEpochPairs').measured;
    expect(k.kernelPairs).toBe(oracle.D5c.nPairs);
    expect(k.oraclePairs).toBe(oracle.D5c.nPairs);
    const d = row('D5d.publishedBestNeighbour').measured;
    expect(d.nK).toBe(oracle.D5d.nK);
    expect(d.kernelOnly).toBe(oracle.D5d.kernelOnly);
    expect(d.publishedOnly1).toBe(oracle.D5d.publishedOnly1);
    expect(row('D4b.surveySpread').measured.differ).toBe(oracle.D4b.differ);
    // the strip's pair counts are those of the oracle (the counter is exact)
    const f = row('B8c.stripWithDeclination').measured;
    expect(f.F1.DD).toEqual(oracle.B10.F1.DD);
    expect(f.F2.DD).toEqual(oracle.B10.F2.DD);
  });

  test('the clustering verdict function still reads B8 and B9, and B9 stays NOT RUN', () => {
    const cr = json('clustering-results.json');
    expect(cr.verdict).toBe('B');
    expect(row('B9.authenticReference').status).toBe('not run');
    expect(thr.checks.find(c => c.id === 'B9.authenticReference').kind).toBe(
      'notrun'
    );
    // the new strip row is reported and never enters the committed function
    expect(row('B8c.stripWithDeclination').status).toBe('reported');
    expect(cr.rows.find(r => r.id === 'B8.strip').measured.detected).toBe(
      false
    );
  });

  test('the amendments move no bound', () => {
    expect(thr.amendments.length).toBeGreaterThan(0);
    expect(thr.amendments.every(a => a.movesNoBound === true)).toBe(true);
  });
});

describe('provenance', () => {
  test('the oracle and both validators ran against the thresholds file in the tree', () => {
    expect(oracle.inputs.thresholdsSha256).toBe(
      sha('data-legs-thresholds.json')
    );
    expect(xm.thresholdsSha256).toBe(oracle.inputs.thresholdsSha256);
    expect(cl.thresholdsSha256).toBe(oracle.inputs.thresholdsSha256);
    expect(xm.oracleSha256).toBe(sha('data-legs-oracle.json'));
    expect(cl.oracleSha256).toBe(sha('data-legs-oracle.json'));
  });

  test('the downloads the runs read are the ones SOURCES.json records', () => {
    const bySuffix = suffix =>
      sources.files.find(f => f.file.endsWith(suffix)).sha256;
    expect(oracle.inputs.R1Sha256).toBe(bySuffix('sdss/R1-ngc2420-mjd.csv'));
    expect(oracle.inputs.R4Sha256).toBe(bySuffix('sdss/R4-slice-query.csv'));
    expect(oracle.inputs.R2BestNeighbourSha256).toBe(
      bySuffix('gaia/R2-bestneighbour.csv')
    );
    expect(xm.inputs.R1Sha256).toBe(oracle.inputs.R1Sha256);
    expect(xm.inputs.R2BestNeighbourSha256).toBe(
      oracle.inputs.R2BestNeighbourSha256
    );
    expect(cl.inputs.R4Sha256).toBe(oracle.inputs.R4Sha256);
    expect(oracle.inputs.gaiaCsvEqualsPackRawFile).toBe(true);
  });

  test('every source has a sha256, a rights basis and terms or a description, and none is a repository path', () => {
    for (const f of sources.files) {
      expect(f.sha256).toMatch(/^[0-9a-f]{64}$/);
      expect(f.bytes).toBeGreaterThan(0);
      expect(f.file.startsWith('scratch-data/crossmatch263/')).toBe(true);
      expect(f.description).toBeTruthy();
    }
    for (const f of sources.files.filter(f =>
      /\/R[124]-[^/]*\.csv$/.test(f.file)
    ))
      expect(f.rights ?? f.terms).toBeTruthy();
    expect(sources.notFetched.map(n => n.request)).toEqual([
      'R2 (CDS XMatch alternative)',
      'R4 footprint',
      'R5',
    ]);
  });

  test('no home path is committed, and the oracle imports no Gravitas code', () => {
    for (const name of [
      'SOURCES.json',
      'data-legs-thresholds.json',
      'data-legs-oracle.json',
      'data-legs-results.json',
      'data-legs-clustering-results.json',
    ])
      expect(read(name)).not.toMatch(/\/Users\/|\/home\//);
    const py = readFileSync(
      new URL('../tools/crossmatch-oracle/oracle_data.py', import.meta.url),
      'utf8'
    );
    expect(py).not.toMatch(
      /^\s*(from|import)\s+(js|tools|gravitas)\b|^\s*from\s+\.|subprocess|\.mjs/im
    );
  });
});
