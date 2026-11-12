// =============================================================================
// The baryon acoustic oscillation gate record (Roadmap III, Prompt 257 Part A)
// -----------------------------------------------------------------------------
// BAO_GATE.md and tests/fixtures/bao/ are a record, not a kernel: the prototype
// that produced results.json is on spike/bao-gate and is never merged. This holds
// that the record is consistent with itself and with the contract committed first:
//
//   - thresholds.json carries its two amendments, each moving no bound, and its
//     committed legs; results.json names the thresholds, the oracle and the
//     printed-numbers file it was run against;
//   - every row is a committed leg, in order, and the status of every pass/fail
//     row is recomputed here from its measured numbers and its committed bound;
//   - the verdict is the one the committed function gives from the rows;
//   - failed-legs.json holds every failing row and nothing else;
//   - the legs that need a file or a source text nobody supplied are NOT RUN;
//   - the printed numbers are the saved text's, line by line, and no fixture
//     holds a covariance entry, a fitting-formula coefficient or a home path;
//   - the document and the register state the counts and the verdict the files hold.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const DIR = 'tests/fixtures/bao';
const bytes = f => readFileSync(`${DIR}/${f}`);
const read = f => JSON.parse(bytes(f));
const sha = b => createHash('sha256').update(b).digest('hex');
const thresholds = read('thresholds.json');
const results = read('results.json');
const failedFile = read('failed-legs.json');
const oracle = read('oracle-results.json');
const planck = read('authentic/planck-table1.json');
const pack = JSON.parse(
  readFileSync('data-packs/sdss-dr18-redshift-slice.json', 'utf8')
);
const doc = readFileSync('BAO_GATE.md', 'utf8');
const register = readFileSync('DECISION_REGISTER.md', 'utf8');
const TOL = thresholds.tolerance;

const P = (v, t) => v <= t;
const inBand = (v, [lo, hi]) => v >= lo && v <= hi;
const band = p => {
  const n = thresholds.syntheticEnsemble.draws;
  const s = 3 * Math.sqrt((p * (1 - p)) / n);
  return [p - s, p + s];
};
// The committed bound of every pass/fail row, applied to its measured numbers.
const RULE = {
  'I1.pack': m =>
    m.rows === 2911 &&
    m.sha256 === pack.derived.sidecar.sha256 &&
    m.oracleSha256 === m.sha256,
  'I2.decode': m =>
    m.sane &&
    m.relativeDifferenceOfSums <= 1e-12 &&
    m.firstFiveDifference <= 1e-12,
  'G1.edsClosedForm': m => P(m.maxRelative, TOL.closedFormDistance),
  'G2.emptyClosedForm': m => P(m.maxRelative, TOL.closedFormDistance),
  'G3.astropy': m => P(m.maxRelative, TOL.distance),
  'G4.identityDV': m => P(m.maxRelative, TOL.identity),
  'G5.scaling': m => P(m.maxRelative, TOL.scaling),
  'G6.lowRedshift': m => P(m.maxDeviation, TOL.lowRedshift),
  'R1.radiation': m => P(m.maxRelative, TOL.radiation),
  'R2.closedForm': m => m.perSet.every(v => v <= TOL.soundHorizonVsClosedForm),
  'R3.quadrature': m => m.perWorld.every(v => v <= TOL.soundHorizonVsQuad),
  'R4.baryonFree': m => P(m.relative, TOL.baryonFree),
  'R5.monotone': m => m.every(s => s.decreasing === s.steps),
  'R6.errorCover': m => m.covered === m.of && m.of === 10,
  'P1b.plankRdragT2': m =>
    m.rdragPrinted >= m.interval[0] && m.rdragPrinted <= m.interval[1],
  'E1.coverage68': m =>
    inBand(m.prototype, band(0.6827)) && inBand(m.oracle, band(0.6827)),
  'E2.coverage95': m =>
    inBand(m.prototype, band(0.9545)) && inBand(m.oracle, band(0.9545)),
  'E3.pinned': m => m.worstOverBound <= 1,
  'E4.notConstrained': m =>
    m.prototypeOpen >= 0.95 &&
    m.oracleOpen >= 0.95 &&
    !m.violationPrototype &&
    !m.violationOracle,
  'E5.misspecified': m => m.prototypePoorFit >= 0.8 && m.oraclePoorFit >= 0.8,
  'K1.product': m =>
    m.sumDifference <= 1e-12 && m.atNodes <= TOL.chi2 && m.between,
  'Z1.refusalEnsemble': m => m.disagreements === 0 && m.worstRsRelative <= 1e-9,
  'Z2.inputRefusals': m =>
    m.agreeWithOracle === 6 && m.prototype.every(s => !s.endsWith(':null')),
  'D1.stream': m =>
    m.every(s => s.firstEqual && s.lastEqual && s.sumEqual && s.hashEqual),
  'D2.counts': m => m.worstOverTolerance <= 1,
  'D3.estimator': m => P(m.maxAbsolute, TOL.xi),
  'D4.jackknife': m => P(m.maxRelative, TOL.jackknifeSigma),
  'D5.nullEnsemble': m => m.prototypePassBins >= 11 && m.oraclePassBins >= 11,
  'D6.detectable': m =>
    !m.refused && m.prototypeMaxWindowSN >= 4 && m.oracleMaxWindowSN >= 4,
};
const NOT_RUN = [
  'P1.plankRdrag',
  'P2.plankZdrag',
  'F1.zdFormula',
  'F2.rdFormulaVsIntegral',
  'F3.rdFormulaVsPublished',
  'F4.formulaDomain',
  'F5.statedError',
  'O1.tableIntegrity',
  'O2.printedFit',
  'O3.fiducialRescale',
];
const REPORTED = [
  'X1.reportedRs',
  'X2.reportedBracket',
  'X3.reportedPairs',
  'X5.reportedExtent',
];

describe('the committed contract', () => {
  test('has its two amendments, each moving no committed bound', () => {
    expect(thresholds.amendments.map(a => a.id)).toEqual(['AM1', 'AM2']);
    for (const a of thresholds.amendments) {
      expect(a.moves).toMatch(/no (committed )?bound/);
      expect(a.recorded).toMatch(/before/);
    }
    expect(thresholds.amendments[1].seen).toMatch(/NOT blind/);
    expect(thresholds.rule).toMatch(
      /Nothing is moved, re-read or re-defined after a result/
    );
  });

  test('has 44 checks, unique, with the groups the verdict function names', () => {
    const ids = thresholds.checks.map(c => c.id);
    expect(ids.length).toBe(44);
    expect(new Set(ids).size).toBe(44);
    const tally = {};
    for (const c of thresholds.checks)
      tally[c.group] = (tally[c.group] ?? 0) + 1;
    expect(tally).toEqual({
      integrity: 2,
      ruler: 12,
      published: 3,
      ensemble: 5,
      combination: 1,
      refusals: 2,
      formula: 5,
      observable: 3,
      demonstration: 6,
      reported: 5,
    });
  });

  test('commits the observable as a form and a request, never a release, and types nothing', () => {
    expect(thresholds.observable.commitment).toMatch(/NOT COMMITTED HERE/);
    expect(thresholds.committed).toMatch(/Nothing was fetched/);
    expect(thresholds.committed).toMatch(/typed from memory/);
    expect(Object.keys(thresholds.externalRequests)).toEqual([
      'O1',
      'F1',
      'P2',
      'X1',
    ]);
    for (const k of ['O1', 'F1', 'P2', 'X1'])
      expect(thresholds.externalRequests[k]).toMatch(/NOT RUN/);
    expect(thresholds.soundHorizon.definition).toMatch(/No fitting formula/);
  });

  test('omits the combination with 256 and says why', () => {
    expect(thresholds.combination.with256).toMatch(/OMITTED/);
    expect(thresholds.combination.with256).toMatch(/FC/);
    expect(thresholds.combination.with256).toMatch(/ever called a stand-in/);
  });

  test('keeps the consumers rule and declines Part B', () => {
    expect(thresholds.scope.consumersRule).toMatch(
      /no lesson, panel, viewer or contour/
    );
    expect(thresholds.scope.notBuilt).toMatch(/Part B is not begun/);
    expect(thresholds.verdict.partB).toMatch(/not begun/);
  });
});

describe('the gate stream', () => {
  test('was run against these thresholds, this oracle and this printed-numbers file on Node 22', () => {
    expect(results.thresholdsSha256).toBe(sha(bytes('thresholds.json')));
    expect(oracle.thresholdsSha256).toBe(sha(bytes('thresholds.json')));
    expect(results.oracleSha256).toBe(sha(bytes('oracle-results.json')));
    expect(results.planckExtractionSha256).toBe(
      sha(bytes('authentic/planck-table1.json'))
    );
    expect(results.node).toMatch(/^v22\./);
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
      pass: 27,
      fail: 2,
      reported: 4,
      'not-run': 10,
      omitted: 1,
    });
    expect(results.counts).toEqual({ rows: 44, ...counts });
    expect(doc).toMatch(
      /44 rows: \*\*27 pass, 2 fail, 4 reported, 10 not run, 1 omitted\*\*/
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
    expect(Object.keys(RULE).length).toBe(29);
  });

  test('the NOT RUN, reported and omitted rows are the committed ones and carry their reason', () => {
    expect(
      results.rows.filter(r => r.status === 'not-run').map(r => r.id)
    ).toEqual(NOT_RUN);
    for (const r of results.rows.filter(x => x.status === 'not-run')) {
      expect(r.measured).toBe(null);
      expect(r.note).toBeTruthy();
    }
    expect(
      results.rows.filter(r => r.status === 'reported').map(r => r.id)
    ).toEqual(REPORTED);
    expect(
      results.rows.filter(r => r.status === 'omitted').map(r => r.id)
    ).toEqual(['X4.reportedCombination']);
  });

  test('the verdict is the committed function applied to the rows: C (and NOT ESTABLISHED without E5)', () => {
    const by = id => results.rows.find(r => r.id === id);
    const grp = g =>
      thresholds.checks.filter(c => c.group === g).map(c => by(c.id));
    const kernelRows = [
      'integrity',
      'ruler',
      'ensemble',
      'combination',
      'refusals',
    ].flatMap(grp);
    const p1b = by('P1b.plankRdragT2');
    const detectable = by('D6.detectable').status === 'pass';
    const demo = [
      'D1.stream',
      'D2.counts',
      'D3.estimator',
      'D4.jackknife',
      'D5.nullEnsemble',
    ].map(by);
    const verdictOf = rows => {
      const kernel =
        rows.every(r => r.status === 'pass') &&
        ['pass', 'not-run'].includes(p1b.status) &&
        (!detectable || demo.every(r => r.status === 'pass'));
      const f = grp('formula');
      const o = grp('observable');
      if (!kernel) return 'C';
      if (f.some(r => r.status === 'fail')) return 'C';
      if (f.some(r => r.status === 'not-run')) return 'NOT ESTABLISHED';
      return o.every(r => r.status === 'pass') ? 'A' : 'B';
    };
    expect(verdictOf(kernelRows)).toBe('C');
    expect(results.verdict.product).toBe('C');
    expect(results.verdict.kernel).toBe('KERNEL FAIL');
    expect(results.verdict.consumersClause).toBe('unmet');
    // the only kernel row that fails is E5; with it passing the function gives NOT ESTABLISHED
    expect(kernelRows.filter(r => r.status !== 'pass').map(r => r.id)).toEqual([
      'E5.misspecified',
    ]);
    const patched = kernelRows.map(r =>
      r.id === 'E5.misspecified' ? { ...r, status: 'pass' } : r
    );
    expect(verdictOf(patched)).toBe('NOT ESTABLISHED');
    expect(results.verdict.combinationWith256).toMatch(/omitted/);
    expect(results.verdict.demonstration).toMatch(/not detectable/);
  });

  test('failed-legs.json holds every failing row and nothing else', () => {
    const failing = results.rows
      .filter(r => r.status === 'fail')
      .map(r => r.id);
    expect(failing).toEqual(['E5.misspecified', 'D6.detectable']);
    expect(failedFile.failed.map(f => f.id)).toEqual(failing);
    for (const f of failedFile.failed) expect(f.bound).toBeTruthy();
  });

  test('the measurements the document quotes are the ones in the rows', () => {
    const by = id => results.rows.find(r => r.id === id).measured;
    expect(by('E5.misspecified').prototypePoorFit).toBeCloseTo(0.288, 3);
    expect(by('E5.misspecified').oraclePoorFit).toBeCloseTo(0.314, 3);
    expect(by('D6.detectable').prototypeMaxWindowSN).toBeCloseTo(0.5386, 3);
    expect(by('X5.reportedExtent').prototypeMaxWindowSN).toBeCloseTo(0.4907, 3);
    const p = by('P1b.plankRdragT2');
    expect(p.rL).toBeCloseTo(147.059, 3);
    expect(p.rH).toBeCloseTo(152.2345, 3);
    expect(p.u).toBeCloseTo(0.0309, 3);
    expect(p.rdragPrinted - p.rL).toBeCloseTo(-0.01, 3);
    expect(by('E1.coverage68').prototype).toBeCloseTo(0.692, 3);
    expect(by('E2.coverage95').oracle).toBeCloseTo(0.9605, 4);
    for (const s of ['0.288', '0.314', '0.54', '147.049', '0.6920'])
      expect(doc).toContain(s);
  });
});

describe('the oracle and the data', () => {
  test('the oracle ran independently: tools, pinned constants, sane agreements of its own', () => {
    expect(oracle.tools.astropy).toBe('6.0.1');
    expect(oracle.constants.c_kms).toBe(299792.458);
    expect(oracle.constants.Tcmb0).toBe(2.7255);
    expect(oracle.worlds.length).toBe(10);
    for (const w of oracle.worlds) {
      expect(Math.abs(w.rsOwn / w.rsAstropyH - 1)).toBeLessThan(1e-12);
      expect(Math.abs(w.astropyOr / w.Or - 1)).toBeLessThan(1e-9);
    }
    for (const c of oracle.closedForms)
      expect(Math.abs(c.quad / c.closedForm - 1)).toBeLessThan(1e-13);
    expect(oracle.refusalEnsemble.draws.length).toBe(400);
    expect(oracle.inputRefusals.map(i => i.decision)).toEqual([
      'underdetermined',
      'underdetermined',
      'bad-covariance',
      'bad-covariance',
      'not-finite',
      'bad-argument',
    ]);
  });

  test("the oracle's own ensembles cover, and its pair counts and null ensemble hold the stated numbers", () => {
    expect(inBand(oracle.ensemble.cover68, band(0.6827))).toBe(true);
    expect(inBand(oracle.ensemble.cover95, band(0.9545))).toBe(true);
    expect(oracle.notConstrained.openFraction).toBeGreaterThanOrEqual(0.95);
    expect(oracle.misspecified.poorFitFraction).toBeLessThan(0.8);
    expect(oracle.pairs.Nd).toBe(2911);
    expect(oracle.pairs.Nr).toBe(29110);
    expect(oracle.pairs.detectable).toBe(false);
    expect(oracle.pairs.maxWindowSN).toBeLessThan(4);
    expect(oracle.nullEnsemble.passBins).toBeGreaterThanOrEqual(11);
  });

  test("the data are the pack's: the sidecar checksum, and no per-galaxy value is committed", () => {
    expect(oracle.data.sidecarSha256).toBe(pack.derived.sidecar.sha256);
    expect(oracle.data.n).toBe(2911);
    expect(pack.license.status).toBe('public-domain');
    expect(Object.keys(oracle.data)).not.toContain('ra');
    expect(oracle.pairs.DD.length).toBe(12);
  });

  test("the printed numbers are the saved text's, line by line, and nothing typed", () => {
    expect(planck.values).toEqual({
      omegaB: '0.022383',
      omegaC: '0.12011',
      H0: '67.32',
      rdrag: '147.049',
      zdrag: '1059.94',
      zdragSigma: '0.30',
      neutrinoMassEv: '0.06',
    });
    const text = planck.lines.map(l => l.text).join('\n');
    for (const v of [
      '0.022383',
      '0.12011',
      '67.32',
      '147.049',
      '1059.94 ± 0.30',
      '0.06 eV',
    ])
      expect(text).toContain(v);
    expect(planck.source.identifier).toBe('arXiv:1807.06209');
    expect(planck.source.savedTextSha256).toMatch(/^[0-9a-f]{64}$/);
  });

  test('no fixture holds a home path, a covariance entry or a fitting-formula coefficient', () => {
    for (const f of [
      'thresholds.json',
      'results.json',
      'failed-legs.json',
      'oracle-results.json',
      'authentic/planck-table1.json',
    ])
      expect(bytes(f).toString('utf8')).not.toMatch(/\/Users\/|\/home\//);
    expect(Object.keys(read('thresholds.json').externalRequests)).not.toContain(
      'coefficients'
    );
    expect(JSON.stringify(thresholds)).not.toMatch(
      /44\.5 ln|9\.83|1291 \(|0\.659/
    );
  });
});

describe('the document and the register', () => {
  test('the document states the verdict, the failing legs and that Part B is not begun', () => {
    expect(doc).toMatch(/Verdict by the committed function: C\*\*/);
    expect(doc).toMatch(/Part B is not begun/);
    expect(doc).toMatch(
      /Failing rows \(2\), left failing: \*\*E5\*\*, \*\*D6\*\*/
    );
    expect(doc).toMatch(/OMITTED/);
    expect(doc).toMatch(
      /neither the split form nor the pack's\s+diagonal is used here/
    );
    expect(doc).toMatch(/consumers rule/);
  });

  test('the document names the requests O1, F1 and X1 and the questions for Carl', () => {
    for (const k of ['**O1**', '**F1**', '**X1**']) expect(doc).toContain(k);
    expect(doc).toMatch(/## 8\. Questions for Carl/);
  });

  test('the register has D-R10-257-01 to -05, all DELEGATED or RATIFIED, sourced from this document', () => {
    for (const n of ['01', '02', '03', '04', '05']) {
      const row = register
        .split('\n')
        .find(l => l.startsWith(`| D-R10-257-${n} |`));
      expect(row).toBeTruthy();
      expect(row).toMatch(/BAO_GATE\.md/);
      expect(row).toMatch(/\*\*(DELEGATED|RATIFIED)\*\*/);
    }
    expect(register).toMatch(
      /D-R10-257-02 \| Prompt 257 Part A, the verdict[^|]*27 pass, 2 fail, 4 reported, 10 not run, 1 omitted/
    );
  });
});
