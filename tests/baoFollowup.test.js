// =============================================================================
// The BAO gate follow-up record (Roadmap III, Prompt 257, the authentic legs)
// -----------------------------------------------------------------------------
// tests/fixtures/bao/thresholds-followup.json, oracle-followup.json, results-followup.json, failed-legs-followup.json
// and authentic/ are a record, not a kernel: the second oracle, the prototype additions and the validator are on
// spike/bao-authentic and are never merged. This holds that the record is consistent with itself, with the contract
// committed first and with the parent record (which it does not touch):
//
//   - the follow-up thresholds name the parent's sha256, carry AM3 to AM6 (none moving a bound) and one committed leg per
//     row; results-followup.json names the thresholds, the oracle and the parent's results it was run against;
//   - the status of every pass/fail row is recomputed here from its measured numbers and its committed bound;
//   - the verdict is the parent's function applied to the parent's rows with the follow-up's statuses: C;
//   - failed-legs-followup.json holds every failing row and nothing else;
//   - the authentic files have the sha256 and size SOURCES.json and the thresholds record, the covariance is a symmetric
//     6 x 6 and the transcribed coefficients are on the lines they name; no home path or paper text is in a fixture;
//   - the printed numbers of the formulas at the Planck row are recomputed here from the transcribed coefficients;
//   - the document and the register state the counts and the verdict the files hold.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const DIR = 'tests/fixtures/bao';
const bytes = f => readFileSync(`${DIR}/${f}`);
const read = f => JSON.parse(bytes(f));
const sha = b => createHash('sha256').update(b).digest('hex');
const FU = read('thresholds-followup.json');
const parent = read('thresholds.json');
const parentResults = read('results.json');
const oracle = read('oracle-followup.json');
const results = read('results-followup.json');
const failedFile = read('failed-legs-followup.json');
const sources = read('authentic/SOURCES.json');
const ff = read('authentic/fitting-formulas.json');
const release = read('authentic/published-release.json');
const planck = read('authentic/planck-table1.json');
const alam = read('authentic/alam-printed.json');
const doc = readFileSync('BAO_GATE.md', 'utf8');
const register = readFileSync('DECISION_REGISTER.md', 'utf8');
const integration = readFileSync('INTEGRATION.md', 'utf8');
const by = id => results.rows.find(r => r.id === id);
const m = id => by(id).measured;
const INSIDE = (v, [lo, hi]) => v >= lo && v <= hi;
const REL = (a, b) => Math.abs(a - b) / Math.abs(b);

// The committed bound of every pass/fail row, applied to its measured numbers.
const RULE = {
  'F1b.zdDesign': x => Math.abs(x.relative) <= 0.02,
  'F2.rdFormulaVsIntegral': x => x.refused === 0 && x.maxRelative <= 0.02,
  'F3.rdFormulaVsPublished': x =>
    x.relative <= x.bound && x.bound === 0.02 + 0.0005 / x.rdragPrinted,
  'F4.formulaDomain': x =>
    x.prototype.refusedAsExpected === 12 &&
    x.prototype.accepted === 3 &&
    x.oracle.refusedAsExpected === 12 &&
    x.oracle.accepted === 3,
  'F5.statedError': x =>
    x.oracleMaxRelative <= 0.02 &&
    x.s26Agreement <= 1e-12 &&
    x.integralAgreement <= 1e-9,
  'F6.eq6VsIntegral': x =>
    x.prototypeWorstOverU <= 1 &&
    x.oracleWorstOverU <= 1 &&
    x.s6Agreement <= 1e-12,
  'P1c.plankMassiveNu': x =>
    Math.abs(x.rdragPrinted - x.rP1c) <= x.u && x.agreement <= 1e-9,
  'E6.flagCalibration': x => {
    const band = p => [
      Math.max(0, p - 3 * Math.sqrt((p * (1 - p)) / x.draws)),
      p + 3 * Math.sqrt((p * (1 - p)) / x.draws),
    ];
    const mis = x.misfit;
    const nul = x.noMisfit;
    const a =
      INSIDE(mis.observedPrototype, band(mis.pPredPrototype)) &&
      INSIDE(mis.observedOracle, band(mis.pPredOracle));
    const b =
      INSIDE(nul.observedPrototype, band(0.0027)) &&
      INSIDE(nul.observedOracle, band(0.0027));
    const c =
      REL(mis.lambdaPrototype, mis.lambdaOracle) <= 1e-9 &&
      REL(mis.pPredPrototype, mis.pPredOracle) <= 1e-9 &&
      Math.abs(nul.lambdaPrototype - nul.lambdaOracle) <= 1e-9;
    return a && b && c;
  },
  'O1.tableIntegrity': x =>
    x.shaOk &&
    x.bytesOk &&
    x.asymmetry <= 1e-9 &&
    x.cholesky &&
    x.dimension === 6 &&
    x.ratios === 6 &&
    x.redshifts.length === 3 &&
    x.orderOk &&
    x.oracle.shaOk &&
    x.oracle.cholesky,
  'O1b.printedConsistency': x =>
    x.valuesMatchPrinted.every(Boolean) &&
    x.sigmaInRange.every(Boolean) &&
    x.oracle.valuesMatchPrinted.every(Boolean) &&
    x.oracle.sigmaInRange.every(Boolean),
  'O2b.bandConsistency': x =>
    x.dChi2At0309 <= 4 &&
    x.dChi2At0317 <= 4 &&
    x.p >= 0.0027 &&
    x.oracle.dChi2At0309 <= 4 &&
    x.oracle.dChi2At0317 <= 4 &&
    x.oracle.p >= 0.0027 &&
    x.agreement,
  'O3b.fiducialAlphas': x =>
    x.componentsWithin3.every(Boolean) &&
    x.p >= 0.0027 &&
    x.fiducialAgreementWithOracle <= 1e-9,
};
const DECIDED_FAIL = ['F1.zdFormula', 'P2.plankZdrag'];
const NOT_RUN = ['O2.printedFit', 'O3.fiducialRescale'];
const REPORTED = [
  'X6.reportedNonlinearProfile',
  'X7.reportedAlphaWithoutRadiation',
  'X8.reportedFormulaValues',
];

describe('the committed follow-up contract', () => {
  test('names the parent file by its sha256 and leaves the parent record untouched', () => {
    expect(FU.parent.sha256).toBe(sha(bytes('thresholds.json')));
    expect(parentResults.thresholdsSha256).toBe(sha(bytes('thresholds.json')));
    expect(FU.parent.note).toMatch(/NOT touched/);
  });

  test('has AM3 to AM6, each moving no bound, recorded before a run', () => {
    expect(FU.amendments.map(a => a.id)).toEqual(['AM3', 'AM4', 'AM5', 'AM6']);
    for (const a of FU.amendments) {
      expect(a.moves).toMatch(/no (committed )?bound/);
      expect(a.recorded).toMatch(/before/);
    }
    expect(FU.rule).toMatch(
      /nothing is moved, re-read or re-defined after a result/
    );
    expect(FU.committed).toMatch(/before any second-oracle script/);
    expect(FU.amendments[3].seen).toMatch(/No bound was changed/);
  });

  test('has 19 checks: the nine committed legs instantiated and ten new, each new one with a rule', () => {
    const ids = FU.checks.map(c => c.id);
    expect(ids.length).toBe(19);
    expect(new Set(ids).size).toBe(19);
    const committed = FU.checks.filter(c => c.committed).map(c => c.id);
    expect(committed).toEqual([
      'F1.zdFormula',
      'F2.rdFormulaVsIntegral',
      'F3.rdFormulaVsPublished',
      'F4.formulaDomain',
      'F5.statedError',
      'P2.plankZdrag',
      'O1.tableIntegrity',
      'O2.printedFit',
      'O3.fiducialRescale',
    ]);
    // every committed leg is a leg of the parent file, with the same group
    for (const c of FU.checks.filter(x => x.committed))
      expect(parent.checks.find(p => p.id === c.id)?.group).toBe(c.group);
    const fresh = FU.checks.filter(c => c.new);
    expect(fresh.length).toBe(10);
    for (const c of fresh.filter(x => x.group !== 'reported'))
      expect(c.rule).toBeTruthy();
    expect(
      FU.checks.filter(c => c.predetermined).map(c => [c.id, c.predetermined])
    ).toEqual([
      ['F1.zdFormula', 'fail'],
      ['P2.plankZdrag', 'fail'],
      ['O2.printedFit', 'not-run'],
      ['O3.fiducialRescale', 'not-run'],
    ]);
  });

  test('never lets a new leg change the verdict, and keeps the consumers rule', () => {
    expect(FU.verdict.newLegs).toMatch(/never enter the function/);
    expect(FU.verdict.consumersClause).toMatch(
      /no panel, lesson, viewer or contour/
    );
    expect(FU.decisions.map(d => d.id)).toEqual(['DEC5', 'DEC6', 'DEC7']);
  });

  test('states the source facts the legs rest on: 2 percent for equation (26) and none for equations (4) and (6)', () => {
    const s = FU.conventions.statedByTheSource;
    expect(s.accuracyOfEq4).toBe('NOT STATED');
    expect(s.accuracyOfEq6).toBe('NOT STATED');
    expect(s.accuracyOfEq26).toMatch(/about 2 percent/);
    expect(ff.coefficients['accuracy.percent'].value).toBe(2);
    expect(FU.conventions.formulaGrid.nodes).toBe(23);
  });
});

describe('the gate stream', () => {
  test('was run against these thresholds, this oracle and the parent results on Node 22', () => {
    expect(results.thresholdsFollowupSha256).toBe(
      sha(bytes('thresholds-followup.json'))
    );
    expect(oracle.thresholdsFollowupSha256).toBe(
      sha(bytes('thresholds-followup.json'))
    );
    expect(results.oracleSha256).toBe(sha(bytes('oracle-followup.json')));
    expect(results.parentThresholdsSha256).toBe(sha(bytes('thresholds.json')));
    expect(results.parentResultsSha256).toBe(sha(bytes('results.json')));
    expect(results.node).toMatch(/^v22\./);
    for (const [k, v] of Object.entries(FU.inputs.dataFiles)) {
      const path = v.path.replace('tests/fixtures/bao/', '');
      expect([k, sha(bytes(path))]).toEqual([k, v.sha256]);
    }
  });

  test('has one row per committed check, in order', () => {
    expect(results.rows.map(r => r.id)).toEqual(FU.checks.map(c => c.id));
  });

  test('has the counts the document states', () => {
    const counts = {};
    for (const r of results.rows)
      counts[r.status] = (counts[r.status] ?? 0) + 1;
    expect(counts).toEqual({ pass: 9, fail: 5, 'not-run': 2, reported: 3 });
    expect(results.counts).toEqual({ rows: 19, ...counts });
    expect(doc).toMatch(
      /19 rows: \*\*9 pass, 5 fail, 2 not run, 3 reported\*\*/
    );
  });

  test('every pass/fail row has the status its committed bound gives', () => {
    for (const [id, rule] of Object.entries(RULE))
      expect([id, by(id).status]).toEqual([
        id,
        rule(by(id).measured) ? 'pass' : 'fail',
      ]);
    expect(Object.keys(RULE).length).toBe(12);
  });

  test('the legs decided before any run, the NOT RUN legs and the reported rows are the committed ones', () => {
    for (const id of DECIDED_FAIL) {
      expect(by(id).status).toBe('fail');
      expect(by(id).note).toMatch(/AM3/);
      expect(m(id).statedAccuracy).toBe(null);
    }
    for (const id of NOT_RUN) {
      expect(by(id).status).toBe('not-run');
      expect(by(id).measured).toBe(null);
      expect(by(id).note).toMatch(/AM4/);
    }
    expect(
      results.rows.filter(r => r.status === 'reported').map(r => r.id)
    ).toEqual(REPORTED);
  });

  test('the verdict is the parent function applied to the parent rows with these statuses: C, with or without E5', () => {
    const rows = Object.fromEntries(
      parentResults.rows.map(r => [r.id, { ...r }])
    );
    for (const id of [
      'F1.zdFormula',
      'F2.rdFormulaVsIntegral',
      'F3.rdFormulaVsPublished',
      'F4.formulaDomain',
      'F5.statedError',
      'P2.plankZdrag',
      'O1.tableIntegrity',
      'O2.printedFit',
      'O3.fiducialRescale',
    ])
      rows[id].status = by(id).status;
    const grp = g =>
      parent.checks.filter(c => c.group === g).map(c => rows[c.id]);
    const verdictOf = kernelRows => {
      const kernel =
        kernelRows.every(r => r.status === 'pass') &&
        ['pass', 'not-run'].includes(rows['P1b.plankRdragT2'].status) &&
        (rows['D6.detectable'].status !== 'pass' ||
          [
            'D1.stream',
            'D2.counts',
            'D3.estimator',
            'D4.jackknife',
            'D5.nullEnsemble',
          ].every(id => rows[id].status === 'pass'));
      if (!kernel) return 'C';
      if (grp('formula').some(r => r.status === 'fail')) return 'C';
      if (grp('formula').some(r => r.status === 'not-run'))
        return 'NOT ESTABLISHED';
      return grp('observable').every(r => r.status === 'pass') ? 'A' : 'B';
    };
    const kernelRows = [
      'integrity',
      'ruler',
      'ensemble',
      'combination',
      'refusals',
    ].flatMap(grp);
    expect(verdictOf(kernelRows)).toBe('C');
    expect(results.verdict.product).toBe('C');
    expect(results.verdict.kernel).toBe('KERNEL FAIL');
    expect(results.verdict.failingKernelRows).toEqual(['E5.misspecified']);
    expect(results.verdict.consumersClause).toBe('unmet');
    const reset = kernelRows.map(r =>
      r.id === 'E5.misspecified' ? { ...r, status: 'pass' } : r
    );
    expect(verdictOf(reset)).toBe('C');
    expect(results.verdict.conditionalIfE5Reset).toBe('C');
    // the parent record itself is unchanged: E5 and D6 still fail there
    expect(
      parentResults.rows.filter(r => r.status === 'fail').map(r => r.id)
    ).toEqual(['E5.misspecified', 'D6.detectable']);
  });

  test('failed-legs-followup.json holds every failing row and nothing else', () => {
    const failing = results.rows
      .filter(r => r.status === 'fail')
      .map(r => r.id);
    expect(failing).toEqual([
      'F1.zdFormula',
      'F2.rdFormulaVsIntegral',
      'F5.statedError',
      'P2.plankZdrag',
      'F1b.zdDesign',
    ]);
    expect(failedFile.failed.map(f => f.id)).toEqual(failing);
    for (const f of failedFile.failed) expect(f.bound).toBeTruthy();
    expect(doc).toMatch(
      /Failing rows, left failing: \*\*F1, F2, F5, P2, F1b\*\*/
    );
  });

  test('the measurements the document quotes are the ones in the rows', () => {
    expect(m('F1.zdFormula').zdEq4).toBeCloseTo(1020.7, 1);
    expect(m('F1.zdFormula').relative).toBeCloseTo(-0.037, 3);
    expect(m('F2.rdFormulaVsIntegral').maxRelative).toBeCloseTo(0.031, 3);
    expect(m('F2.rdFormulaVsIntegral').nodesOver2Percent).toBe(4);
    expect(m('F3.rdFormulaVsPublished').relative).toBeCloseTo(0.0197, 4);
    expect(m('F6.eq6VsIntegral').maxRelativeError).toBeLessThan(0.0011);
    expect(m('P1c.plankMassiveNu').rP1c).toBeCloseTo(147.0523, 4);
    expect(m('P1c.plankMassiveNu').u).toBeCloseTo(0.0303, 4);
    expect(m('E6.flagCalibration').misfit.pPredPrototype).toBeCloseTo(
      0.3183,
      4
    );
    expect(m('O2b.bandConsistency').bestOm).toBeCloseTo(0.366, 3);
    expect(m('O2b.bandConsistency').chi2min).toBeCloseTo(1.993, 3);
    expect(m('O3b.fiducialAlphas').chi2).toBeCloseTo(3.871, 3);
    for (const s of [
      '1020.70',
      '149.95',
      '147.0523',
      '0.3183',
      '1.9745',
      '3.10 percent',
    ])
      expect(doc).toContain(s);
  });
});

describe('the authentic files', () => {
  test('have the sha256 and size SOURCES.json records, and the covariance is a symmetric 6 x 6', () => {
    for (const [f, v] of Object.entries(sources.files)) {
      const b = bytes(`authentic/${f}`);
      expect([f, sha(b), b.length]).toEqual([f, v.sha256, v.bytes]);
    }
    expect(sources.files['BAO_consensus_covtot_dM_Hz.txt'].bytes).toBe(288);
    const C = bytes('authentic/BAO_consensus_covtot_dM_Hz.txt')
      .toString('utf8')
      .split('\n')
      .filter(l => l.trim())
      .map(l => l.trim().split(/\s+/).map(Number));
    expect(C.length).toBe(6);
    for (let i = 0; i < 6; i++) {
      expect(C[i].length).toBe(6);
      for (let j = 0; j < 6; j++) expect(C[i][j]).toBe(C[j][i]);
    }
    // the covariance and the results file are the ones published-release.json names
    const rel = release.data.files.sha256;
    expect(
      rel[
        'cons/COMBINEDDR12_BAO_consensus_dM_Hz/BAO_consensus_covtot_dM_Hz.txt'
      ]
    ).toBe(sources.files['BAO_consensus_covtot_dM_Hz.txt'].sha256);
    expect(
      rel[
        'cons/COMBINEDDR12_BAO_consensus_dM_Hz/BAO_consensus_results_dM_Hz.txt'
      ]
    ).toBe(sources.files['BAO_consensus_results_dM_Hz.txt'].sha256);
    const vals = bytes('authentic/BAO_consensus_results_dM_Hz.txt')
      .toString('utf8')
      .split('\n')
      .filter(l => l.trim() && !l.startsWith('#'))
      .map(l => Number(l.trim().split(/\s+/)[2]));
    const r = release.measurements_BAO_only_consensus;
    expect(vals).toEqual(
      ['0.38', '0.51', '0.61'].flatMap(z => [
        r.DM_rd_fid_over_rd_Mpc[z],
        r.H_rd_over_rd_fid_km_s_Mpc[z],
      ])
    );
    expect(release.fiducial.rd_fid_Mpc).toBe(
      alam.entries['rdFid.fiducialSentence'].value
    );
  });

  test("the transcribed coefficients are on the lines they name, and the paper's statements are as stated", () => {
    expect(ff.source.pdfSha256).toBe(
      '1d283b1a416be45c684eb18adf78983ced73b449e80ec3caed2897842e20fa59'
    );
    expect(sources.sources.find(s => s.id === 'EH98').pdfSha256).toBe(
      ff.source.pdfSha256
    );
    for (const [k, c] of Object.entries(ff.coefficients)) {
      const probe = c.token.replace('−', '').replace(/^10(.+)$/, '$1');
      expect([k, c.lineText.replace(/−/g, '').includes(probe)]).toEqual([
        k,
        true,
      ]);
      expect(c.line).toBeGreaterThan(0);
      expect(c.pdfPage).toBeGreaterThan(0);
    }
    expect(Object.keys(ff.coefficients).length).toBe(27);
    expect(ff.coefficients['domain.omega0h2.upper'].value).toBe(0.5);
    expect(ff.coefficients['T.cobe'].value).toBe(2.728);
    expect(alam.fiducialNeutrinoSector.statedInThisPaper).toBe(false);
    expect(alam.entries['table10.planckPlusBao.omegaM'].value).toBe(0.309);
    expect(alam.entries['table10.planck.omegaM'].value).toBe(0.317);
  });

  test('equations (4), (6) and (26) recomputed here from the coefficients give the numbers of the Planck row', () => {
    const V = k => ff.coefficients[k].value;
    const w0 = Number(planck.values.omegaB) + Number(planck.values.omegaC);
    const wb = Number(planck.values.omegaB);
    const b1 =
      V('b1.a') *
      w0 ** V('b1.exponentOfOmega0h2') *
      (1 + V('b1.bracketCoefficient') * w0 ** V('b1.bracketExponent'));
    const b2 = V('b2.a') * w0 ** V('b2.exponentOfOmega0h2');
    const zd =
      ((V('zd.a') * w0 ** V('zd.exponentOfOmega0h2')) /
        (1 +
          V('zd.denominatorCoefficient') * w0 ** V('zd.denominatorExponent'))) *
      (1 + b1 * wb ** b2);
    const s26 =
      (V('s26.a') * Math.log(V('s26.lnArgument') / w0)) /
      Math.sqrt(
        1 + V('s26.denominatorCoefficient') * wb ** V('s26.denominatorExponent')
      );
    const th = V('T.cobe') / 2.7;
    const zeq =
      V('zeq.mantissa') *
      10 ** ff.coefficients['zeq.power10'].exponent *
      w0 *
      th ** -4;
    const keq =
      V('keq.mantissa') *
      10 ** ff.coefficients['keq.power10'].exponent *
      w0 *
      th ** -2;
    const R = z =>
      (V('R.a') * wb * th ** -4) /
      (z / 10 ** ff.coefficients['R.zScale.power10'].exponent);
    const s6 =
      (2 / (3 * keq)) *
      Math.sqrt(6 / R(zeq)) *
      Math.log(
        (Math.sqrt(1 + R(zd)) + Math.sqrt(R(zd) + R(zeq))) /
          (1 + Math.sqrt(R(zeq)))
      );
    const x8 = m('X8.reportedFormulaValues');
    expect(REL(zd, x8.zdEq4)).toBeLessThan(1e-12);
    expect(REL(s26, x8.s26)).toBeLessThan(1e-12);
    expect(REL(s6, x8.s6)).toBeLessThan(1e-12);
    // the stated accuracy is 2 percent and the Planck row lies inside the stated range
    expect(Math.abs(s26 / Number(planck.values.rdrag) - 1)).toBeLessThan(0.02);
    expect(w0).toBeGreaterThan(V('domain.omega0h2.lower'));
    expect(w0).toBeLessThan(V('domain.omega0h2.upper'));
  });

  test('no fixture holds a home path, and no paper text beyond short equation lines and numbers', () => {
    for (const f of [
      'thresholds-followup.json',
      'oracle-followup.json',
      'results-followup.json',
      'failed-legs-followup.json',
      'authentic/SOURCES.json',
      'authentic/fitting-formulas.json',
      'authentic/alam-printed.json',
      'authentic/published-release.json',
    ])
      expect(bytes(f).toString('utf8')).not.toMatch(/\/Users\/|\/home\//);
    for (const c of Object.values(ff.coefficients))
      expect(c.lineText.length).toBeLessThan(160);
    for (const c of Object.values(alam.entries))
      expect(c.lineText.length).toBeLessThanOrEqual(160);
    expect(sources.sources.find(s => s.id === 'EH98').termsAsRead).toMatch(
      /NOT READ/
    );
  });
});

describe('the second oracle and the document and the register', () => {
  test('the oracle ran independently of the prototype and agrees with the numbers in the rows', () => {
    expect(oracle.tools.astropyConstants).toBe('6.0.1');
    expect(oracle.constants.G_SI).toBe(FU.conventions.constants.G_SI);
    expect(oracle.grid.length).toBe(23);
    expect(oracle.e6.draws).toBe(2000);
    expect(oracle.p1c.within).toBe(true);
    expect(oracle.o1.shaOk).toBe(true);
    expect(Object.keys(oracle.inputSha256)).toEqual(
      Object.keys(FU.inputs.dataFiles)
    );
  });

  test('the document states the verdict, the failing rows, the questions and that Part B waits', () => {
    expect(doc).toMatch(/## 10\. Follow-up: the authentic legs/);
    expect(doc).toMatch(
      /product verdict by the committed function\s+\*\*stays C\*\*/
    );
    expect(doc).toMatch(/### 10\.5 Questions for Carl/);
    expect(doc).toMatch(/\*\*Part B\*\* waits/);
    expect(doc).toMatch(/E5 still fails and stays failing/);
    expect(doc).toMatch(
      /arXiv licence page of the Eisenstein and Hu paper was not read/
    );
  });

  test('the register has D-R10-257-06 to -10, all DELEGATED or RATIFIED, each citing one file and a commit, and the missing D-R10-254-01', () => {
    for (const n of ['06', '07', '08', '09', '10']) {
      const row = register
        .split('\n')
        .find(l => l.startsWith(`| D-R10-257-${n} |`));
      expect(row).toBeTruthy();
      expect(row).toMatch(/\*\*(DELEGATED|RATIFIED)\*\*/);
      expect(row).toMatch(/\| `[^`]+` \([0-9a-f]{8}\) \|/);
    }
    expect(register).toMatch(
      /D-R10-257-07 \| Prompt 257 Part A follow-up, the verdict[^|]*19 rows, 9 pass, 5 fail, 2 not run, 3 reported/
    );
    const r254 = register
      .split('\n')
      .find(l => l.startsWith('| D-R10-254-01 |'));
    expect(r254).toBeTruthy();
    expect(r254).toMatch(/CONTINUE AS PLANNED/);
    expect(r254).toMatch(/\*\*(DELEGATED|RATIFIED)\*\*/);
    expect(integration).toMatch(
      /Recorded outcome of continuation checkpoint V \(Prompt 254, 2026-11-06, register row D-R10-254-01/
    );
  });
});
