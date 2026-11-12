// =============================================================================
// The moving-cluster follow-up record (Roadmap III, Prompt 234 Part A follow-up)
// -----------------------------------------------------------------------------
// followup-thresholds.json was committed before any code or run (1d71cd33);
// followup-results.json is the stream that ran against it. The prototype is on
// spike/moving-cluster-followup and never merged. This holds that the record is
// consistent with itself and with Part A's:
//
//   - the contract has 30 legs in sets and groups, the amendments AM4 and AM5, the
//     gate seeds, and its bounds are the committed Part A bounds;
//   - the published-value fixtures state the identifiers, the sha256 of each PDF
//     and that the convergent point has no printed uncertainty;
//   - results.json names the files it was run against, its counts match the
//     document, every failing row is in the failed-legs file, and the follow-up
//     verdict is the committed function applied to the follow-up rows;
//   - nothing absolute about the moving-cluster estimate of the real sample is
//     written, and the oracle agreed with the production code;
//   - Part A's results are unchanged: the committed verdict C and its 18 failures.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const DIR = 'tests/fixtures/moving-cluster';
const text = f => readFileSync(`${DIR}/${f}`, 'utf8');
const read = f => JSON.parse(text(f));
const sha = f =>
  createHash('sha256')
    .update(readFileSync(`${DIR}/${f}`))
    .digest('hex');
const partA = read('thresholds.json');
const fu = read('followup-thresholds.json');
const results = read('followup-results.json');
const failedFile = read('followup-failed-legs.json');
const oracle = read('followup-oracle-results.json');
const ensembles = read('followup-ensembles.json');
const pubCp = read('published-cp.json');
const pubDist = read('published-distance.json');
const doc = readFileSync('MOVING_CLUSTER_GATE.md', 'utf8');
const register = readFileSync('DECISION_REGISTER.md', 'utf8');
const rowsOf = id => results.rows.find(r => r.id === id);

describe('the follow-up contract', () => {
  test('has 30 legs in sets and groups, three gate seeds and the two amendments', () => {
    expect(fu.checks.length).toBe(30);
    expect(new Set(fu.checks.map(c => c.id)).size).toBe(30);
    const sets = { S: 0, R: 0, none: 0 };
    for (const c of fu.checks) {
      sets[c.set ?? 'none']++;
      expect(['geo', 'dist']).toContain(c.group);
    }
    expect(sets).toEqual({ S: 13, R: 9, none: 8 });
    expect(fu.seeds.gate).toEqual([234101, 234102, 234103]);
    expect(fu.amendments.map(a => a.id)).toEqual(['AM4', 'AM5']);
    for (const a of fu.amendments) expect(a.binding).toMatch(/no bound/);
    expect(fu.design.findings.length).toBe(3);
  });

  test('takes the committed Part A bounds for the legs it re-tests', () => {
    const a = Object.fromEntries(partA.checks.map(c => [c.id, c.limits]));
    const f = Object.fromEntries(fu.checks.map(c => [c.id, c.limits]));
    expect(f['K5.coverage68']).toEqual(a['C3.coverage68']);
    expect(f['K6.coverage95']).toEqual(a['C4.coverage95']);
    expect(f['K7.recovery']).toEqual(a['C5.recovery']);
    expect(f['K9.useful']).toEqual(a['C7.useful']);
    expect(f['K4.cp'].maxMedianDeg).toBe(a['C2.cp'].maxMedianDeg);
    expect(f['K4.cp'].maxP95Deg).toBe(a['C2.cp'].maxP95Deg);
    expect(f['K4.cp'].maxRefusedFraction).toBe(a['C2.cp'].maxRefusedFraction);
    expect(f['RK3.useful']).toEqual(a['R3.useful']);
    for (const id of ['K11.dispersion1', 'K12.separation60']) {
      expect(f[id].coverage68).toEqual(a['C3.coverage68']);
      expect(f[id].coverage95).toEqual(a['C4.coverage95']);
      expect(f[id].maxAbsMedianZ).toBe(a['C5.recovery'].maxAbsMedianZ);
      expect(f[id].maxAbsMedianRel).toBe(a['C5.recovery'].maxAbsMedianRel);
    }
  });

  test('states the order, the rule and the published value with no uncertainty', () => {
    expect(fu.committed).toMatch(/before any code of the follow-up/);
    expect(fu.thresholdRule.disclosure).toMatch(
      /had seen before writing this file/
    );
    expect(fu.publishedComparisons.cpHasNoUncertainty).toMatch(
      /with no uncertainty/
    );
    expect(fu.consumersRule).toMatch(/no moving-cluster distance is written/);
    expect(fu.checks.find(c => c.id === 'RK9.isochrone').what).toMatch(
      /NOT RUN/
    );
  });
});

describe('the published-value fixtures', () => {
  test('carry the identifiers and the sha256 of each PDF, as printed', () => {
    expect(pubCp.source.identifier).toBe('arXiv:astro-ph/9707253v1');
    expect(pubCp.source.sha256).toMatch(/^924ec0c8.*f670$/);
    expect(pubDist.sources[1].identifier).toBe('arXiv:1811.03845v1');
    expect(pubDist.sources[1].sha256).toMatch(/^64266b1d.*68d8$/);
    expect(pubCp.uncertainty).toBe(null);
    expect(pubCp.uncertaintyNote).toMatch(/NO printed uncertainty/);
    expect(pubDist.sources[1].role).toMatch(/SECOND-HAND/);
    expect(pubCp.values.map(v => v.stars)).toEqual([134, 180]);
  });
});

describe('the follow-up stream', () => {
  test('was run against these files on Node 22 from a clean spike', () => {
    expect(results.shas.thresholds).toBe(sha('thresholds.json'));
    expect(results.shas.followupThresholds).toBe(
      sha('followup-thresholds.json')
    );
    expect(results.shas.publishedCp).toBe(sha('published-cp.json'));
    expect(results.shas.publishedDistance).toBe(sha('published-distance.json'));
    expect(failedFile.shas).toEqual(results.shas);
    expect(ensembles.shas).toEqual(results.shas);
    expect(oracle.synthetic.followupSha256).toBe(
      results.shas.followupThresholds
    );
    expect(results.node).toMatch(/^v22\./);
    expect(results.spike.clean).toBe(true);
    expect(results.spike.commit).toMatch(/^c39f5752/);
  });

  test('has 30 rows, each a contract leg, with the counts the document states', () => {
    expect(results.rows.length).toBe(30);
    expect(new Set(results.rows.map(r => r.id)).size).toBe(30);
    const checks = Object.fromEntries(fu.checks.map(c => [c.id, c]));
    for (const r of results.rows) {
      expect([r.id, !!checks[r.id]]).toEqual([r.id, true]);
      if (r.status === 'reported' || r.status === 'not-run')
        expect([r.id, checks[r.id].set]).toEqual([r.id, null]);
    }
    const count = s => results.rows.filter(r => r.status === s).length;
    expect({
      pass: count('pass'),
      fail: count('fail'),
      reported: count('reported'),
      'not-run': count('not-run'),
    }).toEqual({ pass: 19, fail: 3, reported: 7, 'not-run': 1 });
    const { rows, ...counts } = results.counts;
    expect(rows).toBe(30);
    expect(counts).toEqual({ pass: 19, fail: 3, reported: 7, 'not-run': 1 });
    expect(doc).toMatch(/30 legs: 19 pass, 3 fail, 7 reported, 1 not run/);
  });

  test('every failing row is in the failed-legs file, labelled, and nothing else is', () => {
    const failing = results.rows
      .filter(r => r.status === 'fail')
      .map(r => r.id);
    expect(failing).toEqual(['K4.cp', 'K11.dispersion1', 'K12.separation60']);
    expect(failedFile.legs.map(l => l.id)).toEqual(failing);
    for (const l of failedFile.legs) expect(l.label).toMatch(/^FAILED/);
  });

  test('the verdict is the committed function applied to the follow-up rows', () => {
    const status = id => rowsOf(id).status;
    const bad = grp =>
      fu.checks
        .filter(
          c =>
            (c.set === 'S' || c.set === 'R') &&
            c.group === grp &&
            status(c.id) !== 'pass'
        )
        .map(c => c.id);
    const verdict = bad('geo').length ? 'C' : bad('dist').length ? 'B' : 'A';
    expect(results.verdict.verdict).toBe(verdict);
    expect(verdict).toBe('C');
    expect(results.verdict.geoFailing).toEqual(bad('geo'));
    expect(results.verdict.distFailing).toEqual(bad('dist'));
    expect(doc).toMatch(
      /Follow-up verdict by the committed function[^]*: C\*\*/
    );
  });

  test("the correction removed the plain estimator's bias on the same realizations", () => {
    const plain = rowsOf('K13.report.plain').measured;
    const ce = rowsOf('K7.recovery').measured;
    expect(Math.abs(plain.medianRelBias)).toBeGreaterThan(0.005);
    expect(Math.abs(ce.medianRelBias)).toBeLessThanOrEqual(0.005);
    expect(Math.abs(ce.medianZ)).toBeLessThanOrEqual(0.27);
  });

  test('the ensembles hold the stated realization counts and no per-star value', () => {
    const n = { E1: 200, E7: 200, E8: 200, E3: 50, E5: 100, E6: 100 };
    for (const [k, v] of Object.entries(n))
      expect(ensembles.ensembles[k].length).toBe(v);
    expect(JSON.stringify(ensembles)).not.toMatch(/source_id|perStar/);
  });
});

describe('what is and is not published', () => {
  test('no moving-cluster parallax or distance of the real sample is written', () => {
    for (const f of [
      'followup-results.json',
      'followup-failed-legs.json',
      'followup-ensembles.json',
    ]) {
      expect(text(f)).not.toMatch(/source_id|"perStar"|"piMC"/);
    }
    expect(JSON.stringify(results.real)).not.toMatch(/piMC|distance/);
    expect(oracle.real.ce.piMC).toBe(null);
    expect(oracle.real.ce.sigmaMC).toBe(null);
    expect(oracle.real.ce.perStarSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(results.real.memberDigest).toMatch(/^[0-9a-f]{64}$/);
  });

  test('the published comparisons are recorded as differences and sigma units', () => {
    const r7 = rowsOf('RK7.published.cp');
    const r8 = rowsOf('RK8.published.distance');
    expect(r7.note).toMatch(/no printed uncertainty/);
    expect(r7.measured.separationDeg).toBeLessThanOrEqual(
      r7.measured.toleranceDeg
    );
    expect(r7.measured.separationOverRadius).toBeGreaterThan(3);
    expect(Object.keys(r8.measured)).toEqual(
      expect.arrayContaining([
        'relDifference',
        'sigmasCombined',
        'toleranceOverPi',
      ])
    );
    expect(Math.abs(r8.measured.relDifference)).toBeLessThanOrEqual(0.03);
    expect(rowsOf('RK9.isochrone').status).toBe('not-run');
  });

  test('the oracle agreed with the production code', () => {
    for (const id of [
      'K3a.oracle.cp.synthetic',
      'K3b.oracle.dist.synthetic',
      'K16a.oracle.cp.real',
      'K16b.oracle.dist.real',
    ])
      expect(rowsOf(id).status).toBe('pass');
    expect(oracle.versions.numpy).toBeTruthy();
    expect(oracle.script.sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(oracle.cases.length).toBe(6);
  });
});

describe('Part A is unchanged', () => {
  test('the committed verdict C and its 18 failing legs are as recorded', () => {
    const a = read('results.json');
    expect(a.forms.committed.verdict.verdict).toBe('C');
    expect(a.forms.amended.verdict.verdict).toBe('B');
    expect(read('failed-legs.json').legs.length).toBe(18);
    expect(results.shas.thresholds).toBe(a.thresholdsSha256);
  });
});

describe('the document and the register', () => {
  test('state the follow-up verdict, what it does not do and the questions', () => {
    expect(doc).toMatch(/## Follow-up \(docs\/moving-cluster-followup\)/);
    expect(doc).toMatch(/## What the follow-up does not do/);
    expect(doc).toMatch(/## Questions for Carl \(follow-up\)/);
    expect(doc).toMatch(/## Still to fetch/);
    expect(doc).toMatch(/That pass rests on the floor/);
  });

  test('the register has the four follow-up rows, each DELEGATED or RATIFIED, with a source and sha', () => {
    for (const id of ['05', '06', '07', '91']) {
      const line = register
        .split('\n')
        .find(l => l.startsWith(`| D-R10-234-${id} `));
      expect(line).toBeTruthy();
      expect(line).toMatch(/\*\*(DELEGATED|RATIFIED)\*\*/);
      expect(line).toMatch(/\(([0-9a-f]{8})\)/);
    }
  });
});
