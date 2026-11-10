// =============================================================================
// The censoring and truncation gate record (Roadmap III, Prompt 262 Part A)
// -----------------------------------------------------------------------------
// CENSORING_TRUNCATION_GATE.md and tests/fixtures/censoring/ are a record, not a kernel: the
// prototype that produced results.json is on spike/censoring-truncation-gate and is never
// merged. This holds that the record is consistent with itself and with the contract committed
// first:
//
//   - thresholds.json carries its recorded amendments and its committed legs; the oracle's
//     output and results.json name the thresholds file they were run against;
//   - every row is a committed leg, the status of every pass/fail row is recomputed here from
//     its measured numbers and its committed bound, and the verdict is the one the committed
//     function gives;
//   - failed-legs.json holds every failing row and nothing else;
//   - the legs that need a source nobody supplied are NOT RUN and name a request that exists;
//   - no fixture holds a home path, and the document and the register state the counts and the
//     verdict the files hold.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const DIR = 'tests/fixtures/censoring';
const bytes = f => readFileSync(`${DIR}/${f}`);
const read = f => JSON.parse(bytes(f));
const sha = b => createHash('sha256').update(b).digest('hex');
const thresholds = read('thresholds.json');
const oracle = read('oracle-results.json');
const results = read('results.json');
const failedFile = read('failed-legs.json');
const doc = readFileSync('CENSORING_TRUNCATION_GATE.md', 'utf8');
const register = readFileSync('DECISION_REGISTER.md', 'utf8');
const TOL = thresholds.tolerance;
const row = id => results.rows.find(r => r.id === id);
const close = (a, b, tol = TOL.closedForm) =>
  Math.abs(a - b) <= tol * Math.max(1, Math.abs(b));
const range = (v, lo, hi) => v >= lo && v <= hi;

// The committed bound of every pass/fail row, applied to its measured numbers.
const RULE = {
  'I1.inputs': x => x.thresholdsSha256 === x.oracleRecorded,
  'O0.kmInternal': x => x.maxAbs <= TOL.oracleMass,
  'O1.cmInternal': x => x.maxAbs <= TOL.emAlgorithm,
  'O2.hand': x => x.agrees === true,
  'O3.logrankInternal': x => x.maxZRel <= TOL.logrank,
  'A1.kmUncensored': x =>
    x.status === 'complete' && close(x.mean, 3.7) && close(x.variance, 1.632),
  'A2.kmHand': x => {
    const e = thresholds.handExamples.A2.expected;
    return (
      x.status === 'complete' &&
      close(x.mean, e.mean) &&
      close(x.variance, e.variance) &&
      Object.keys(e.masses).every(k => close(x.masses[k], e.masses[k]))
    );
  },
  'A3.kmBounded': x => {
    const e = thresholds.handExamples.A3.expected;
    return (
      x.status === 'bounded' &&
      close(x.meanLow, e.meanLow) &&
      close(x.meanHigh, e.meanHigh) &&
      close(x.variance, e.variance) &&
      close(x.tailMass, e.tailMass) &&
      x.noFloor === 'unbounded-tail'
    );
  },
  'A4.cmHand': x => {
    const e = thresholds.handExamples.A4.expected;
    return (
      Object.keys(e.associatedSets).every(
        k => x.sets[k] === e.associatedSets[k]
      ) &&
      Object.keys(e.masses).every(k => close(x.masses[k], e.masses[k])) &&
      close(x.mean, e.mean) &&
      close(x.variance, e.variance)
    );
  },
  'A5.cmNoTruncation': x =>
    x.masses.length === 5 &&
    x.masses.every(v => close(v, 0.2)) &&
    close(x.mean, 3.7) &&
    close(x.variance, 1.632),
  'A6.vmaxHand': x => {
    const e = thresholds.handExamples.A6.expected;
    return (
      close(x.meanVOverVmax, e.meanVOverVmax) &&
      close(x.z, e.z) &&
      close(x.sumInverseVmax, e.sumInverseVmax) &&
      close(x.variance, e.variance)
    );
  },
  'A7.vmaxEffective': x => close(x.veff, 4.5) && close(x.inverseVeff, 1 / 4.5),
  'R1.kmReference': x =>
    x.notes.length === 0 &&
    x.worstMassAbs <= TOL.oracleMass &&
    x.worstRelative <= TOL.oracle,
  'R2.cmReference': x =>
    x.bad.length === 0 &&
    x.setsExact &&
    x.worstMassAbs <= TOL.oracleMass &&
    x.worstRelative <= TOL.oracle,
  'R3.logrankReference': x =>
    x.bad.length === 0 &&
    x.worstZRel <= TOL.logrank &&
    x.worstPRel <= TOL.logrank,
  'R4.veffReference': x => x.worstRelative <= TOL.quadrature,
  'L1.kmLarge': x => x.supDistance <= 0.04 && Math.abs(x.mean - 2) <= 0.06,
  'L2.cmLarge': x =>
    x.supDistance <= 0.05 && Math.abs(x.mean - x.truth) <= 0.05,
  'C1a.kmCoverageK1': x => range(x.coverage, 0.92, 0.98),
  'C1b.kmCoverageK2': x => range(x.coverage, 0.92, 0.98),
  'C1c.kmCoverageK3': x => range(x.coverage, 0.92, 0.98),
  'C1o.kmCoverageOracle': x =>
    [x.K1, x.K2, x.K3].every(v => range(v, 0.92, 0.98)),
  'C2a.cmCoverageT1': x => range(x.coverage, 0.92, 0.98),
  'C2b.cmCoverageT2': x => range(x.coverage, 0.92, 0.98),
  'C2o.cmCoverageOracle': x => [x.T1, x.T2].every(v => range(v, 0.92, 0.98)),
  'D1.dependenceFlag': x => x.fraction >= 0.9 && x.refused < 1e6,
  'D2.falseAlarm': x => x.fraction <= 0.02,
  'D3.kmRefusals': x => x.cases.length === 7 && x.cases.every(c => c.ok),
  'D4.cmRefusals': x => x.cases.length === 7 && x.cases.every(c => c.ok),
  'D6.vmaxRefusals': x => x.cases.length === 6 && x.cases.every(c => c.ok),
  'V1.vmaxNull': x => range(x.rejectionRate, 0.035, 0.065),
  'V1n.vmaxEvolution': x => x.rejectionRate >= 0.95,
  'C4.densityCoverage': x => range(x.coverage, 0.92, 0.98),
  'C4b.rampCoverage': x => range(x.coverage, 0.92, 0.98),
};

describe('the contract and the files that answer it', () => {
  test('the thresholds file records its amendments and was committed with no result in it', () => {
    expect(thresholds.amendments.map(a => a.id)).toEqual([
      'AM1',
      'AM2',
      'AM3',
      'AM4',
    ]);
    for (const a of thresholds.amendments)
      expect(a.recordedBefore).toBe('the first validator run');
    expect(thresholds.checks).toHaveLength(41);
    expect(new Set(thresholds.checks.map(c => c.id)).size).toBe(41);
  });

  test('the oracle and the stream ran against this thresholds file', () => {
    const mine = sha(bytes('thresholds.json'));
    expect(oracle.thresholdsSha256).toBe(mine);
    expect(results.environment.thresholdsSha256).toBe(mine);
    expect(results.environment.oracleSha256).toBe(
      sha(bytes('oracle-results.json'))
    );
    expect(results.environment.runs).toMatch(/two complete runs agree/);
  });

  test('every row is a committed leg, once, with the committed group and estimator', () => {
    expect(results.rows.map(r => r.id).sort()).toEqual(
      thresholds.checks.map(c => c.id).sort()
    );
    for (const c of thresholds.checks) {
      const r = row(c.id);
      expect(r.group).toBe(c.group);
      expect(r.estimator).toBe(c.estimator);
      expect(r.bound).toBe(c.bound);
    }
  });

  test('every pass/fail status is recomputed from the measured numbers and the committed bound', () => {
    for (const r of results.rows) {
      if (r.status === 'not-run' || r.status === 'reported') continue;
      expect(RULE[r.id]).toBeDefined();
      expect([r.id, r.status]).toEqual([
        r.id,
        RULE[r.id](r.measured) ? 'pass' : 'fail',
      ]);
    }
  });

  test('reported and not-run rows are exactly the committed ones, and every request exists', () => {
    for (const c of thresholds.checks) {
      const s = row(c.id).status;
      if (c.group === 'reported') expect(s).toBe('reported');
      else if (c.expected === 'not-run') expect(s).toBe('not-run');
      else expect(['pass', 'fail']).toContain(s);
      if (c.expected === 'not-run')
        expect(thresholds.externalRequests.map(q => q.id)).toContain(c.request);
    }
    for (const q of thresholds.externalRequests)
      expect(doc).toContain(`**${q.id}`);
  });

  test('the counts, the failing legs and the verdict are the committed function applied to the rows', () => {
    const counts = {};
    for (const r of results.rows)
      counts[r.status] = (counts[r.status] || 0) + 1;
    expect(results.counts).toEqual(counts);
    expect(counts).toEqual({ pass: 33, fail: 1, reported: 3, 'not-run': 4 });
    const failing = results.rows.filter(r => r.status === 'fail');
    expect(failedFile.legs.map(l => l.id)).toEqual(failing.map(l => l.id));
    expect(failing.map(l => l.id)).toEqual(['C2o.cmCoverageOracle']);
    const JUDGED = new Set([
      'integrity',
      'oracle',
      'analytic',
      'reference',
      'accuracy',
      'coverage',
      'misspecified',
      'refusals',
    ]);
    const passAll = est =>
      results.rows
        .filter(
          r =>
            (r.estimator === est || r.estimator === 'all') &&
            JUDGED.has(r.group)
        )
        .every(r => r.status === 'pass');
    const km = passAll('km');
    const cm = passAll('cm');
    const vmax = results.rows
      .filter(r => r.estimator === 'vmax' && JUDGED.has(r.group))
      .every(r => r.status === 'pass');
    expect(results.verdict).toEqual({
      km,
      cm,
      vmaxAdmitted: vmax,
      letter: km && cm ? 'A' : km || cm ? 'B' : 'C',
      slice: km && cm ? null : km ? 'B-KM' : 'B-CM',
    });
    expect(results.verdict.letter).toBe('B');
    expect(results.verdict.slice).toBe('B-KM');
    expect(results.verdict.vmaxAdmitted).toBe(true);
  });

  test('the oracle agrees with its hand examples and the reference samples are the committed ones', () => {
    expect(oracle.hand.agrees).toBe(true);
    expect(oracle.censored.map(s => s.id)).toEqual(
      thresholds.referenceSamples.censored.map(s => s.id)
    );
    expect(oracle.truncated.map(s => s.id)).toEqual(
      thresholds.referenceSamples.truncated.map(s => s.id)
    );
    expect(oracle.veff).toHaveLength(20);
    const statuses = new Set(oracle.censored.map(s => s.km.status));
    expect([...statuses].sort()).toEqual(['bounded', 'complete']);
  });

  test('the hand examples are consistent with the formulas, independently of the files', () => {
    // The identity behind A1 and A5: with no censoring the product-limit mean is the arithmetic
    // mean and the variance sum is the plug-in variance of the mean.
    const xs = [3, 1, 4, 1.5, 9];
    const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
    const plugin = xs.reduce((a, b) => a + (b - mean) ** 2, 0) / xs.length ** 2;
    expect(mean).toBeCloseTo(3.7, 12);
    expect(plugin).toBeCloseTo(1.632, 12);
    expect(thresholds.handExamples.A4.expected.variance).toBeCloseTo(
      505 / 648,
      12
    );
    expect(thresholds.handExamples.A3.expected.variance).toBeCloseTo(
      107 / 64,
      12
    );
  });

  test('no fixture holds a home path, and nothing was typed from memory', () => {
    for (const f of [
      'thresholds.json',
      'oracle-results.json',
      'results.json',
      'failed-legs.json',
    ])
      expect(bytes(f).toString('utf8')).not.toMatch(
        /\/Users\/|\/home\/|C:\\\\Users/
      );
    expect(thresholds.committed).toMatch(/typed from memory/);
  });
});

describe('the document and the register state what the files hold', () => {
  test('the document names the verdict, the counts, the failing leg and the unmoved bound', () => {
    expect(doc).toContain(
      '**Verdict by the committed function: B, slice B-KM**'
    );
    expect(doc).toContain(
      '41 rows: **33 pass, 1 fail, 3 reported, 4 not run.**'
    );
    expect(doc).toContain('C2o.cmCoverageOracle');
    expect(doc).toContain('Part B is not begun');
    expect(doc).toContain('consumers rule');
    expect(doc).not.toMatch(/\/Users\//);
  });

  test('the register holds the five rows of this gate', () => {
    for (const n of ['01', '02', '03', '04', '05'])
      expect(register).toContain(`| D-R10-262-${n} |`);
    const rows = register
      .split('\n')
      .filter(l => /^\| D-R10-262-0[1-5] \|/.test(l));
    expect(rows).toHaveLength(5);
    for (const r of rows) expect(r).toContain('**DELEGATED**');
    expect(rows[1]).toContain('B-KM');
  });
});

// =============================================================================
// The follow-up (2026-11-10): C2c and the cross-feed, the two legs section 4 of the document
// names for the failing C2o. followup-thresholds.json was committed alone and first; the oracle's
// two stages were pinned before the prototype ran; the programs are on spike/censoring-c2c,
// never merged. This holds that the follow-up's record is consistent with itself, that its
// statuses and outcome are the committed function applied to the measured numbers, and that
// nothing of Part A moved: C2o stays failing.
// =============================================================================
const fThresholds = read('followup-thresholds.json');
const fOracle = read('followup-oracle-results.json');
const fResults = read('followup-results.json');
const fFailed = read('followup-failed-legs.json');
const fRow = id => fResults.rows.find(r => r.id === id);
const KEYS = ['orig-T1', 'orig-T2', 'c2c-T1', 'c2c-T2'];
const popcount = hex =>
  [...Buffer.from(hex, 'hex')].reduce(
    (a, b) => a + b.toString(2).replace(/0/g, '').length,
    0
  );
const agreed = e =>
  e.refusalDiffers +
    e.riskDiffers +
    e.supportDiffers +
    e.meanBeyond +
    e.varianceBeyond +
    e.flagDiffers ===
    0 && e.prototypeHits === e.oracleHits;
const allTrue = o => Object.values(o).every(v => v === true);
const partACoverage = {
  T1: row('C2a.cmCoverageT1').measured,
  T2: row('C2b.cmCoverageT2').measured,
};
const reproduces = (x, pinned) =>
  ['T1', 'T2'].every(
    k =>
      x[k].hits / 1000 === pinned[k].coverage &&
      x[k].pinnedCoverage === pinned[k].coverage &&
      x[k].refused === pinned[k].refused &&
      x[k].medianRiskAtFrom === pinned[k].medianRiskAtFrom
  );
const F_RULE = {
  'F1.inputs': x =>
    x.thresholdsSha256 === x.oracleRecordedThresholds &&
    allTrue(x.streamSamplesEqualTheFilesTheOracleRead) &&
    allTrue(x.numpySamplesReadEqualTheFilesTheOracleWrote) &&
    allTrue(x.tablesEqualThePinnedSha256) &&
    Object.keys(x.tablesEqualThePinnedSha256).length === 8 &&
    x.prototypeBlob === x.prototypeBlobAt4735488a &&
    x.oracleFunctionsVerbatim === true,
  'F2.oracleReproduces': x => reproduces(x, oracle.coverage),
  'F3.prototypeReproduces': x => reproduces(x, partACoverage),
  'XF1.numpySamplesToPrototype': x =>
    KEYS.every(k => agreed(x[k])) && Object.keys(x).length === 4,
  'XF2.streamSamplesToOracle': x =>
    KEYS.every(k => agreed(x[k])) && Object.keys(x).length === 4,
  'C2c.cmCoveragePrototype': x =>
    range(x.T1, 0.92, 0.98) && range(x.T2, 0.92, 0.98),
  'C2c.cmCoverageOracle': x =>
    range(x.T1, 0.92, 0.98) && range(x.T2, 0.92, 0.98),
};

describe('the follow-up: C2c and the cross-feed', () => {
  test('no fixture of Part A was edited, and C2o is still the one failing leg, unmoved', () => {
    expect(sha(bytes('thresholds.json'))).toBe(
      'd1c6d8d050a7de01166394ad4badf17a586b8a8f3a9d3439d4c0bb17678b4a6a'
    );
    expect(sha(bytes('oracle-results.json'))).toBe(
      'fb09403fb28c59cb78b0a9c05a5ffdeccabab89cde81cf0cfb9dac33d627a7bf'
    );
    expect(sha(bytes('results.json'))).toBe(
      '722b282c7e587269888405c5d47a0bc0ecd7afb8e3d89d4ead6a8cb30b682329'
    );
    expect(sha(bytes('failed-legs.json'))).toBe(
      'a1eebb65ee92f62f911732c724c5f8af3b7233e7f3e2e6616b8010366f5fb6c0'
    );
    expect(failedFile.legs.map(l => [l.id, l.status, l.bound])).toEqual([
      ['C2o.cmCoverageOracle', 'fail', 'each in [0.92, 0.98]'],
    ]);
    expect(fResults.carried).toEqual(fThresholds.carried);
    expect(fThresholds.carried['C2o.cmCoverageOracle']).toMatch(/^fail/);
    for (const id of Object.keys(fThresholds.carried).filter(k => k[0] === 'X'))
      expect(row(id).status).toBe('not-run');
  });

  test('the contract says what the follow-up is, and its seeds are not those of Part A', () => {
    expect(fThresholds.whatThisIs.c2c).toMatch(/5000 replicates/);
    expect(fThresholds.whatThisIs.approved).toMatch(/DECISIONS_2026-11-07/);
    expect(fThresholds.whatThisIs.consumersCondition).toMatch(
      /after 247.s line tools and after 251 Part A/
    );
    expect(fThresholds.amendments.map(a => a.id)).toEqual(['AM-F1']);
    expect(fThresholds.amendments[0].recordedBefore).toMatch(/first run/);
    for (const name of ['T1', 'T2']) {
      const d = fThresholds.ensembles.c2c[name];
      expect(d.replicates).toBe(5000);
      expect(d.baseSeed).toBeGreaterThan(264899);
      expect(d.N).toBe(thresholds.scenarios.truncationT[name].N);
      expect(d.from).toBe(thresholds.scenarios.truncationT[name].from);
      const o = fThresholds.ensembles.orig[name];
      expect(o.baseSeed).toBe(thresholds.scenarios.truncationT[name].baseSeed);
      expect(o.replicates).toBe(1000);
    }
    const a = fThresholds.ensembles.c2c;
    expect(a.T1.baseSeed + 5000).toBeLessThanOrEqual(a.T2.baseSeed);
    for (const id of ['C2c.cmCoveragePrototype', 'C2c.cmCoverageOracle'])
      expect(fThresholds.checks.find(c => c.id === id).bound).toBe(
        thresholds.checks.find(c => c.id === 'C2o.cmCoverageOracle').bound
      );
  });

  test('the oracle and the stream name the thresholds file they ran against', () => {
    const t = sha(bytes('followup-thresholds.json'));
    expect(fOracle.thresholdsSha256).toBe(t);
    expect(fResults.environment.thresholdsSha256).toBe(t);
    expect(fResults.environment.oracleSha256).toBe(
      sha(bytes('followup-oracle-results.json'))
    );
    expect(fOracle.environment.executable).toBe('/usr/bin/python3 -E');
    expect(fOracle.functionsVerbatimFromPartA).toBe(true);
    expect(fOracle.fedFunctionsVerbatimFromPartA).toBe(true);
  });

  test('every row is a committed leg, and every status is recomputed from its measured numbers', () => {
    expect(fResults.rows.map(r => r.id)).toEqual(
      fThresholds.checks.map(c => c.id)
    );
    for (const c of fThresholds.checks) {
      const r = fRow(c.id);
      expect([r.group, r.estimator, r.bound]).toEqual([
        c.group,
        c.estimator,
        c.bound,
      ]);
      if (c.group === 'reported') {
        expect(r.status).toBe('reported');
        continue;
      }
      expect(F_RULE[c.id]).toBeDefined();
      expect([c.id, r.status]).toEqual([
        c.id,
        F_RULE[c.id](r.measured) ? 'pass' : 'fail',
      ]);
    }
  });

  test('the cross-feed is exact: both implementations cover the same samples of every ensemble', () => {
    for (const k of KEYS) {
      const own = fOracle.own[k];
      const fed = fOracle.fed[k];
      const pn = fResults.prototype.numpy[k];
      const ps = fResults.prototype.stream[k];
      expect(pn.coveredHex).toBe(own.coveredHex);
      expect(ps.coveredHex).toBe(fed.coveredHex);
      expect(pn.refusedHex).toBe(own.refusedHex);
      expect(ps.refusedHex).toBe(fed.refusedHex);
      expect(pn.sampleSha256).toBe(own.sampleSha256);
      expect(ps.sampleSha256).toBe(fed.sampleSha256);
      for (const e of [own, fed, pn, ps]) {
        expect(popcount(e.coveredHex)).toBe(e.hits);
        expect(e.hits / e.replicates).toBe(e.coverage);
        expect(popcount(e.refusedHex)).toBe(e.refused);
      }
      expect(own.coveredHex).not.toBe(fed.coveredHex);
    }
    const p = fRow('C2c.cmCoveragePrototype').measured;
    const o = fRow('C2c.cmCoverageOracle').measured;
    expect([p.T1, p.T2]).toEqual([
      fResults.prototype.stream['c2c-T1'].coverage,
      fResults.prototype.stream['c2c-T2'].coverage,
    ]);
    expect([o.T1, o.T2]).toEqual([
      fOracle.own['c2c-T1'].coverage,
      fOracle.own['c2c-T2'].coverage,
    ]);
    expect([p.T1, p.T2, o.T1, o.T2]).toEqual([0.9442, 0.9388, 0.9428, 0.9428]);
  });

  test('the pooled coverage is recomputed from the hits, and it is below 0.95', () => {
    const g = fRow('G2.pooledCoverage').measured;
    for (const name of ['T1', 'T2']) {
      const hits = ['orig', 'c2c'].reduce(
        (a, grp) =>
          a +
          fOracle.own[`${grp}-${name}`].hits +
          fOracle.fed[`${grp}-${name}`].hits,
        0
      );
      expect(g[name].hits).toBe(hits);
      expect(g[name].replicates).toBe(12000);
      expect(g[name].coverage).toBeCloseTo(hits / 12000, 15);
      expect(g[name].wilson95[1]).toBeLessThan(0.95);
      expect(g[name].wilson95[0]).toBeGreaterThan(0.92);
    }
  });

  test('the counts, the failing legs and the outcome are the committed function applied to the rows', () => {
    const counts = {};
    for (const r of fResults.rows)
      counts[r.status] = (counts[r.status] || 0) + 1;
    expect(fResults.counts).toEqual(counts);
    expect(counts).toEqual({ pass: 7, reported: 2 });
    const failing = fResults.rows.filter(r => r.status === 'fail');
    expect(fFailed.legs.map(l => l.id)).toEqual(failing.map(l => l.id));
    const followUpPass = fResults.rows
      .filter(r => r.group !== 'reported')
      .every(r => r.status === 'pass');
    const JUDGED = [
      'integrity',
      'oracle',
      'analytic',
      'reference',
      'accuracy',
      'coverage',
      'misspecified',
      'refusals',
    ];
    const cmOther = results.rows
      .filter(
        r =>
          (r.estimator === 'cm' || r.estimator === 'all') &&
          JUDGED.includes(r.group) &&
          r.id !== 'C2o.cmCoverageOracle'
      )
      .every(r => r.status === 'pass');
    expect(fResults.verdict).toEqual({
      followUpPass,
      partA: {
        letter: results.verdict.letter,
        slice: results.verdict.slice,
        km: results.verdict.km,
        cmLegsOtherThanC2oPass: cmOther,
        C2o: row('C2o.cmCoverageOracle').status,
      },
      letter:
        followUpPass && results.verdict.km && cmOther
          ? 'A through C2c'
          : 'B-KM stands',
    });
    expect(fResults.verdict.letter).toBe('A through C2c');
    expect(fResults.verdict.partA.C2o).toBe('fail');
  });

  test('no follow-up fixture holds a home path', () => {
    for (const f of [
      'followup-thresholds.json',
      'followup-oracle-results.json',
      'followup-results.json',
      'followup-failed-legs.json',
    ])
      expect(bytes(f).toString('utf8')).not.toMatch(
        /\/Users\/|\/home\/|\/private\/|C:\\\\Users/
      );
  });

  test('the document and the register state the follow-up as the files hold it', () => {
    expect(doc).toContain('9 rows: **7 pass, 0 fail, 2 reported.**');
    expect(doc).toContain('**A through C2c**');
    expect(doc).toContain('**Consumers condition: not met.**');
    expect(doc).toContain('**C2o stays failing and its bound is not moved**');
    expect(doc).toContain('about 94 percent');
    for (const id of ['R1', 'R2', 'R3', 'R4']) expect(doc).toContain(`**${id}`);
    const rows = register
      .split('\n')
      .filter(l => /^\| D-R10-262-0[6-8] \|/.test(l));
    expect(rows).toHaveLength(3);
    for (const r of rows) expect(r).toContain('**DELEGATED**');
    expect(rows[1]).toContain('A through C2c');
    expect(rows[1]).toContain('C2o');
    expect(rows[2]).toContain('not met');
    expect(
      register.split('\n').filter(l => l.startsWith('| D-R10-262-'))
    ).toHaveLength(8);
  });
});
