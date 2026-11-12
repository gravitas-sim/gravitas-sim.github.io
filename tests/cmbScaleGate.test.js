// =============================================================================
// The microwave background angular-scale gate record (Roadmap III, Prompt 258 Part A)
// -----------------------------------------------------------------------------
// CMB_SCALE_GATE.md and tests/fixtures/cmb-scale/ are a record, not a kernel: the
// prototype that produced results.json is on spike/cmb-scale-gate and is never
// merged. This holds that the record is consistent with itself and with the
// contract committed first:
//
//   - thresholds.json carries its five amendments, each moving no bound, and its
//     committed legs (three of them new, outside the verdict function);
//   - results.json names the thresholds, the oracle and the printed-numbers file
//     it was run against; every row is a committed leg and the status of every
//     pass/fail row is recomputed here from its measured numbers and its bound;
//   - the verdict is the one the committed function gives from the rows;
//   - failed-legs.json holds every failing row and nothing else;
//   - the legs that need a spectrum, a grid, a source text or a code run nobody
//     supplied are NOT RUN, and the rights decisions are NOT DECIDED;
//   - the printed numbers are the saved text's, line by line, and no fixture holds
//     a home path;
//   - the document and the register state the counts and the verdict the files hold.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const DIR = 'tests/fixtures/cmb-scale';
const bytes = f => readFileSync(`${DIR}/${f}`);
const read = f => JSON.parse(bytes(f));
const sha = b => createHash('sha256').update(b).digest('hex');
const thresholds = read('thresholds.json');
const results = read('results.json');
const failedFile = read('failed-legs.json');
const oracle = read('oracle-results.json');
const planck = read('authentic/planck-cmb.json');
const doc = readFileSync('CMB_SCALE_GATE.md', 'utf8');
const register = readFileSync('DECISION_REGISTER.md', 'utf8');
const TOL = thresholds.tolerance;
const P = (v, t) => v <= t;
const band = (p, n) => {
  const s = 3 * Math.sqrt((p * (1 - p)) / n);
  return [p - s, p + s];
};
const inBand = (v, [lo, hi]) => v >= lo && v <= hi;
const SP = thresholds.syntheticPeak;
const cover = (m, p, n) =>
  inBand(m.prototype.rate, band(p, n)) && inBand(m.oracle.rate, band(p, n));
const allSteps = s => Object.values(s).every(v => v === 20);

// The committed bound of every pass/fail row, applied to its measured numbers.
const RULE = {
  'I1.fixtures': m =>
    m.shaMatch && m.streamFirstFiveDiff === 0 && m.streamSumDiff <= 1e-12,
  'I2.surface': m =>
    JSON.stringify(m.exports) ===
    JSON.stringify([...thresholds.apiSurface.exports].sort()),
  'A1.edsDistance': m => P(m.maxRelative, TOL.closedFormDistance),
  'A2.soundHorizonClosedForm': m =>
    P(m.maxRelative, TOL.soundHorizonVsClosedForm),
  'A3.scaleInvariance': m => P(m.maxRelative, TOL.scaleInvariance),
  'A4.peakRelation': m => P(m.maxRelative, TOL.relationRoundTrip),
  'A5.curvature': m =>
    m.direction !== 'not monotone' &&
    P(m.continuityRelative, TOL.curvatureContinuity),
  'B1.distance': m => P(m.maxRelative, TOL.distance),
  'B2.soundHorizon': m =>
    P(m.maxRelativeOwnE, TOL.soundHorizonVsQuad) &&
    P(m.maxRelativeAstropyH, TOL.soundHorizonVsQuad),
  'B3.theta': m => P(m.maxRelative, TOL.theta),
  'B4.radiation': m => P(m.maxRelative, TOL.radiation),
  'B5.directions': m =>
    allSteps(m.stepsOf20) && Object.values(m.oracle).every(Boolean),
  'B5b.directionOfRsWithZstar': m =>
    m.prototypeStepsOf20 === 20 && m.oracle === true,
  'B6.errorCovers': m => m.covered === 10 && m.of === 10,
  'E1.coverage68': m => cover(m, 0.6827, SP.draws.E1),
  'E2.coverage95': m => cover(m, 0.9545, SP.draws.E2),
  'E3.pinned': m =>
    P(m.maxAbsoluteDifference, thresholds.pinnedVectors.tolerance),
  'E4.coarse': m =>
    m.prototypeCodes['too-few-bins'] === SP.draws.E4 &&
    m.oracleCodes['too-few-bins'] === SP.draws.E4 &&
    m.apexOrIntervalReported === 0,
  'E5.noPeak': m =>
    m.prototypeNotConstrained >= 0.95 && m.oracleNotConstrained >= 0.95,
  'E6a.coverage68Symmetric': m => cover(m, 0.6827, SP.symmetricTruth.draws.E6a),
  'E6b.coverage95Symmetric': m => cover(m, 0.9545, SP.symmetricTruth.draws.E6b),
  'Z1.refusals': m =>
    m.disagreements === 0 &&
    P(m.maxRelativeOfAccepted, TOL.refusalAcceptedQuantity),
  'Z2.peakInputs': m =>
    JSON.stringify(m.prototype) === JSON.stringify(m.committed) &&
    JSON.stringify(m.oracle) === JSON.stringify(m.committed),
  'K1.claimRule': m =>
    m.violatingFlagged === 12 &&
    m.cleanFlagged === 0 &&
    m.agreeWithOracleOn === 24,
  'K2.tree': m => m.violations === 0,
  'G2.linear': m =>
    P(m.maxRelative, TOL.gridLinear) &&
    m.outsideRefused === 6 &&
    m.pointsDifferFromOracleStream === 0,
  'G3.nearest': m =>
    m.sameNodeAsOracle === 200 &&
    JSON.stringify(m.tieNodes) === JSON.stringify(m.tiesExpected) &&
    m.outsideRefused === 6,
  'P1.thetaPlanck': m => P(m.relativeDifference, 5e-4),
  'P2.rstarPlanck': m => P(m.relativeDifference, 1e-3),
  'P3.oracleAtPlanck': m => P(m.maxRelative, 1e-9),
};
const NOT_RUN = [
  'C1.citedCode',
  'G1.provenance',
  'F1.zstarFormula',
  'F2.peakOffset',
  'S1.spectrumIntegrity',
  'S2.peakFromSpectrum',
  'S3.coarseRebin',
  'S4.rights',
];
const REPORTED = [
  'X2.reportedPlanckSensitivity',
  'X1.reportedWorlds',
  'X3.reportedApexBias',
  'X4.reportedCurvature',
];

describe('the committed contract', () => {
  test('has its five amendments, each moving no committed bound, the fourth after a result was read', () => {
    expect(thresholds.amendments.map(a => a.id)).toEqual([
      'AM1',
      'AM2',
      'AM3',
      'AM4',
      'AM5',
    ]);
    for (const a of thresholds.amendments) {
      expect(a.moves).toMatch(/no (committed )?bound/);
      expect(a.recorded).toMatch(/before/);
    }
    expect(thresholds.amendments[3].seenInTheFirstOracleRun).toMatch(/0\.1245/);
    expect(thresholds.amendments[3].what).toMatch(/wrong physics/);
    expect(thresholds.amendments[4].what).toMatch(/defect of the validator/);
    expect(thresholds.rule).toMatch(
      /Nothing is moved, re-read or re-defined after a result/
    );
  });

  test('has 42 checks, unique, three of them new and outside the function', () => {
    const ids = thresholds.checks.map(c => c.id);
    expect(ids.length).toBe(42);
    expect(new Set(ids).size).toBe(42);
    expect(thresholds.checks.filter(c => c.new).map(c => c.id)).toEqual([
      'B5b.directionOfRsWithZstar',
      'E6a.coverage68Symmetric',
      'E6b.coverage95Symmetric',
    ]);
    const tally = {};
    for (const c of thresholds.checks)
      tally[c.group] = (tally[c.group] ?? 0) + 1;
    expect(tally).toEqual({
      integrity: 2,
      relation: 5,
      oracle: 7,
      code: 1,
      ensemble: 7,
      refusals: 2,
      claim: 2,
      grid: 3,
      published: 3,
      formula: 2,
      spectrum: 4,
      reported: 4,
    });
  });

  test('commits conventions and requests, types no published number, and leaves the rights NOT DECIDED', () => {
    expect(thresholds.committed).toMatch(/Nothing was fetched/);
    expect(thresholds.committed).toMatch(/typed from memory/);
    expect(Object.keys(thresholds.externalRequests)).toEqual([
      'S1',
      'G1',
      'F1',
      'F2',
      'X1',
    ]);
    for (const k of ['S1', 'G1', 'F1', 'F2', 'X1'])
      expect(thresholds.externalRequests[k]).toMatch(/NOT RUN/);
    expect(thresholds.externalRequests.S1).toMatch(/NOT DECIDED/);
    expect(thresholds.externalRequests.G1).toMatch(/NOT DECIDED/);
    expect(thresholds.conventions.recombinationRedshift.definition).toMatch(
      /INPUT/
    );
    expect(thresholds.conventions.soundHorizon.whyTheIntegral).toMatch(
      /no fitting formula stands in/
    );
    expect(thresholds.seenBeforeCommitting.join(' ')).toMatch(/NOT BLIND/);
  });

  test('states the claim rule with 12 violating and 12 clean sentences', () => {
    expect(thresholds.claimRule.rule).toMatch(/NEVER reads a Hubble constant/);
    expect(thresholds.claimRule.violating.length).toBe(12);
    expect(thresholds.claimRule.clean.length).toBe(12);
    expect(thresholds.apiSurface.rule).toMatch(
      /no function that takes a spectrum and returns a cosmological parameter through a grid/
    );
  });

  test('keeps the consumers rule and declines Part B', () => {
    expect(thresholds.scope.notBuilt).toMatch(/consumers rule/);
    expect(thresholds.scope.notBuilt).toMatch(/Part B is not begun/);
    expect(thresholds.verdict.partB).toMatch(/not begun/);
    expect(thresholds.verdict.consumersClause).toMatch(
      /no panel, lesson, guide/
    );
  });
});

describe('the gate stream', () => {
  test('was run against these thresholds, this oracle and this printed-numbers file on Node 22', () => {
    expect(results.thresholdsSha256).toBe(sha(bytes('thresholds.json')));
    expect(oracle.thresholdsSha256).toBe(sha(bytes('thresholds.json')));
    expect(results.oracleSha256).toBe(sha(bytes('oracle-results.json')));
    expect(results.planckExtractionSha256).toBe(
      sha(bytes('authentic/planck-cmb.json'))
    );
    expect(oracle.planckExtractionSha256).toBe(
      sha(bytes('authentic/planck-cmb.json'))
    );
    expect(results.node).toMatch(/^v22\./);
    expect(results.rowsNotInThresholds).toEqual([]);
    expect(results.thresholdLegsWithoutRow).toEqual([]);
  });

  test('has one row per committed check', () => {
    expect(results.rows.map(r => r.id).sort()).toEqual(
      thresholds.checks.map(c => c.id).sort()
    );
  });

  test('has the counts the document states', () => {
    const counts = {};
    for (const r of results.rows)
      counts[r.status] = (counts[r.status] ?? 0) + 1;
    expect(counts).toEqual({
      pass: 25,
      fail: 5,
      reported: 4,
      'not-run': 8,
    });
    expect(results.counts).toEqual({ rows: 42, ...counts });
    expect(doc).toMatch(
      /42 rows: \*\*25 pass, 5 fail, 4 reported, 8 not run\*\*/
    );
  });

  test('every pass/fail row has the status its committed bound gives', () => {
    for (const r of results.rows) {
      if (!(r.id in RULE)) continue;
      expect([r.id, r.status]).toEqual([
        r.id,
        RULE[r.id](r.measured) ? 'pass' : 'fail',
      ]);
    }
    expect(Object.keys(RULE).length).toBe(30);
  });

  test('the NOT RUN and reported rows are the committed ones and carry their reason', () => {
    expect(
      results.rows
        .filter(r => r.status === 'not-run')
        .map(r => r.id)
        .sort()
    ).toEqual([...NOT_RUN].sort());
    for (const r of results.rows.filter(x => x.status === 'not-run')) {
      expect(r.measured).toBe(null);
      expect(r.note).toBeTruthy();
    }
    expect(
      results.rows
        .filter(r => r.status === 'reported')
        .map(r => r.id)
        .sort()
    ).toEqual([...REPORTED].sort());
  });

  test('the verdict is the committed function applied to the rows: C, and C by absence even if the kernel passed', () => {
    const by = id => results.rows.find(r => r.id === id);
    const groups = new Set([
      'integrity',
      'relation',
      'oracle',
      'ensemble',
      'refusals',
      'claim',
    ]);
    const kernelIds = thresholds.checks
      .filter(
        c =>
          !c.new &&
          (groups.has(c.group) || ['G2.linear', 'G3.nearest'].includes(c.id))
      )
      .map(c => c.id);
    const p = ['P1.thetaPlanck', 'P2.rstarPlanck', 'P3.oracleAtPlanck'].map(by);
    const s = [
      'S1.spectrumIntegrity',
      'S2.peakFromSpectrum',
      'S3.coarseRebin',
      'S4.rights',
    ].map(by);
    const verdictOf = status => {
      const kernel =
        kernelIds.every(id => (status[id] ?? by(id).status) === 'pass') &&
        p.every(r => ['pass', 'not-run'].includes(r.status));
      if (!kernel) return 'C (kernel fail)';
      if (s.some(r => r.status === 'fail')) return 'C (an S leg failed)';
      if (s.some(r => r.status === 'not-run')) return 'C (by absence)';
      return 'A or B';
    };
    expect(verdictOf({})).toBe('C (kernel fail)');
    expect(kernelIds.filter(id => by(id).status !== 'pass')).toEqual([
      'B5.directions',
      'E1.coverage68',
      'E2.coverage95',
    ]);
    expect(
      verdictOf({
        'B5.directions': 'pass',
        'E1.coverage68': 'pass',
        'E2.coverage95': 'pass',
      })
    ).toBe('C (by absence)');
    expect(results.verdict.product).toBe('C');
    expect(results.verdict.kernel).toBe('KERNEL FAIL');
    expect(results.verdict.kernelFailingRows).toEqual([
      'B5.directions',
      'E1.coverage68',
      'E2.coverage95',
    ]);
    expect(results.verdict.consumersClause).toBe('unmet');
  });

  test('failed-legs.json holds every failing row and nothing else', () => {
    const failing = results.rows
      .filter(r => r.status === 'fail')
      .map(r => r.id);
    expect(failing).toEqual([
      'B5.directions',
      'E1.coverage68',
      'E2.coverage95',
      'E6a.coverage68Symmetric',
      'E6b.coverage95Symmetric',
    ]);
    expect(failedFile.failed.map(f => f.id)).toEqual(failing);
    for (const f of failedFile.failed) expect(f.bound).toBeTruthy();
  });

  test('the measurements the document quotes are the ones in the rows', () => {
    const by = id => results.rows.find(r => r.id === id).measured;
    expect(by('P1.thetaPlanck').theta100).toBeCloseTo(1.041087, 6);
    expect(by('P1.thetaPlanck').printed).toBe(1.041085);
    expect(by('P2.rstarPlanck').rs).toBeCloseTo(144.3935, 4);
    expect(by('E1.coverage68').prototype.rate).toBeCloseTo(0.1355, 4);
    expect(by('E1.coverage68').oracle.rate).toBeCloseTo(0.1245, 4);
    expect(by('E2.coverage95').prototype.rate).toBeCloseTo(0.2935, 4);
    expect(by('E6a.coverage68Symmetric').prototype.rate).toBeCloseTo(0.399, 3);
    expect(by('E6b.coverage95Symmetric').prototype.rate).toBeCloseTo(0.7425, 4);
    expect(
      by('X2.reportedPlanckSensitivity').massless255Style.theta100
    ).toBeCloseTo(1.03953, 5);
    expect(by('X4.reportedCurvature').dLnThetaDOk).toBeCloseTo(-1.3775, 4);
    expect(by('K2.tree').contextSentences).toBe(39);
    expect(by('Z1.refusals').accepted).toBe(7);
    for (const s of [
      '1.041087',
      '144.394',
      '0.1355',
      '0.2935',
      '1.03953',
      '-1.38',
      '0.1245',
    ])
      expect(doc).toContain(s);
  });
});

describe('the oracle and the printed numbers', () => {
  test('the oracle ran independently: tools, pinned constants, sane agreements of its own', () => {
    expect(oracle.tools.astropy).toBe('6.0.1');
    expect(oracle.constants.c_kms).toBe(299792.458);
    expect(oracle.constants.Tcmb0).toBe(2.7255);
    expect(oracle.worlds.length).toBe(10);
    for (const w of oracle.worlds) {
      expect(Math.abs(w.rs_own / w.rs_astropyH - 1)).toBeLessThan(1e-12);
      expect(Math.abs(w.DM_own / w.DM_astropy - 1)).toBeLessThan(1e-10);
    }
    expect(oracle.closedForm.length).toBe(5);
    expect(oracle.refusals.draws.length).toBe(400);
    expect(oracle.refusals.accepted).toBe(7);
    expect(oracle.Z2).toEqual(thresholds.refusals.peakFitInputs);
    expect(oracle.claimRule.violating.every(Boolean)).toBe(true);
    expect(oracle.claimRule.clean.some(Boolean)).toBe(false);
    expect(oracle.directions.rs_vs_zstar).toBe(false);
    expect(oracle.directions.rs_decreases_with_zstar).toBe(true);
    expect(oracle.grid.points.length).toBe(200);
  });

  test("the oracle's own ensembles say what the rows say", () => {
    expect(oracle.E1.codes).toEqual({ ok: 2000 });
    expect(oracle.E1.rate).toBeLessThan(band(0.6827, 2000)[0]);
    expect(oracle.E4.codes).toEqual({ 'too-few-bins': 500 });
    expect(oracle.E5.codes.ok ?? 0).toBe(0);
    expect(oracle.E6a.meanApexError).toBeLessThan(0.1);
  });

  test("the printed numbers are the saved text's, line by line, and nothing typed", () => {
    expect(planck.values).toEqual({
      omegaB: '0.022383',
      omegaC: '0.12011',
      H0: '67.32',
      theta100Table1Best: '1.041085',
      zstar: '1089.92',
      zstarSigma: '0.25',
      rstar: '144.43',
      rstarSigma: '0.26',
      theta100Table2: '1.04110',
      theta100Table2Sigma: '0.00031',
      neutrinoMassEv: '0.06',
    });
    const text = planck.lines.map(l => l.text).join('\n');
    for (const v of [
      '0.022383',
      '0.12011',
      '67.32',
      '1.041085',
      '1089.92 ± 0.25',
      '144.43 ± 0.26',
      '0.06 eV',
    ])
      expect(text).toContain(v);
    expect(planck.source.identifier).toBe('arXiv:1807.06209');
    expect(planck.source.savedTextSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(planck.assumptions.join(' ')).toMatch(/Neff = 3\.046 is ASSUMED/);
  });

  test('no fixture holds a home path', () => {
    for (const f of [
      'thresholds.json',
      'results.json',
      'failed-legs.json',
      'oracle-results.json',
      'authentic/planck-cmb.json',
    ])
      expect(bytes(f).toString('utf8')).not.toMatch(/\/Users\/|\/home\//);
  });
});

describe('the document and the register', () => {
  test('the document states the verdict, the failing legs and that Part B is not begun', () => {
    expect(doc).toMatch(/Verdict by the committed function: C\*\*/);
    expect(doc).toMatch(/Part B is not begun/);
    expect(doc).toMatch(
      /Failing rows \(5\), left failing: \*\*B5\*\*, \*\*E1\*\*, \*\*E2\*\*/
    );
    expect(doc).toMatch(/consumers rule/);
    expect(doc).toMatch(/NOT DECIDED/);
    expect(doc).toMatch(/C by absence/);
  });

  test('the document names the requests S1, G1, F1, F2 and X1 and the questions for Carl', () => {
    for (const k of ['**S1**', '**G1**', '**F1**', '**F2**', '**X1**'])
      expect(doc).toContain(k);
    expect(doc).toMatch(/## 8\. Questions for Carl/);
  });

  test('the register has D-R10-258-01 to -05, all DELEGATED or RATIFIED, sourced from this document', () => {
    for (const n of ['01', '02', '03', '04', '05']) {
      const row = register
        .split('\n')
        .find(l => l.startsWith(`| D-R10-258-${n} |`));
      expect(row).toBeTruthy();
      expect(row).toMatch(/CMB_SCALE_GATE\.md|thresholds\.json/);
      expect(row).toMatch(/\*\*(DELEGATED|RATIFIED)\*\*/);
    }
    expect(register).toMatch(
      /D-R10-258-02 \| Prompt 258 Part A, the verdict[^|]*42 rows, 25 pass, 5 fail, 4 reported, 8 not run/
    );
    expect(register).toMatch(/D-R10-258-03 \|[^|]*NOT DECIDED/);
  });
});
