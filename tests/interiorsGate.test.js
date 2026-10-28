import { describe, test, expect } from '@jest/globals';
import { readFileSync } from 'node:fs';

// =============================================================================
// Interiors gate (Prompt 203 Part B, INTERIORS_GATE.md)
// -----------------------------------------------------------------------------
// The thresholds were committed before any prototype existed (186ebf90). This
// suite holds the recorded result to them: every check has a recorded status,
// each status follows from the recorded measurement and the committed bound, the
// failing leg is the one failed-legs.json states, the verdict follows from the
// decision function, and the document says the same verdict. The prototype is
// the branch spike/interiors-gate, which is never merged.
// =============================================================================

const DIR = 'tests/fixtures/interiors-gate';
const read = f => JSON.parse(readFileSync(`${DIR}/${f}`, 'utf8'));
const thresholds = read('thresholds.json');
const record = read('record.json');
const failed = read('failed-legs.json');
const oracle = read('oracle-results.json');
const sources = read('sources.json');
const doc = readFileSync('INTERIORS_GATE.md', 'utf8');
const byId = Object.fromEntries(thresholds.checks.map(c => [c.id, c]));
const STATUSES = ['pass', 'pass-under-ruling', 'fail', 'not-measured'];
const isPass = s => s === 'pass' || s === 'pass-under-ruling';

/** The committed decision function (INTERIORS_GATE.md, section 5). */
function decide(checks) {
  const notPass = g =>
    thresholds.checks
      .filter(c => c.group === g)
      .some(c => !isPass(checks[c.id]?.status));
  if (notPass('common')) return 'C';
  if (notPass('oblateness')) return 'C';
  if (notPass('inversion')) return 'B';
  return 'A';
}

/** Each numeric check's status from its recorded measurement and committed bound. */
const judged = {
  'I1.closed': (m, l) =>
    m.massRelMax <= l.massRelMax &&
    m.coreVsBrentqRelMax <= l.coreRelMax &&
    m.coreVsTruthRelMax <= l.coreRelMax &&
    m.points >= l.points,
  'I2.moment': (m, l) =>
    m.relMax <= l.relMax &&
    m.homogeneous === l.homogeneous &&
    m.points >= l.points,
  'I3.earth': (m, l) => m.rel <= l.relMax,
  'I4.mars': (m, l) => m.rel <= l.relMax,
  'I5.coverage': (m, l) =>
    m.clusters.length === 2 &&
    m.clusters.every(
      c =>
        c.n >= l.perCluster &&
        c.oneSigma >= l.oneSigma[0] &&
        c.oneSigma <= l.oneSigma[1] &&
        c.twoSigma >= l.twoSigmaMin
    ),
  'I6.moment-published': (m, l) =>
    m.rows.length === 2 &&
    m.rows.every(r => r.rel <= l.relMax && r.ruledOutSigmas > l.ruledOutSigmas),
  'I7.refusals': (m, l) => m.refused >= l.count && m.refused === m.of,
  'O1.closed': (m, l) =>
    m.forwardRelMax <= l.relMax &&
    m.inverseRelMax <= l.relMax &&
    m.roundTripRelMax <= 1e-9 &&
    m.points >= l.points,
  'O2.radau-clairaut': (m, l) =>
    m.oracleSelfTest.pass &&
    m.worstProfileRel <= l.relMax &&
    m.polytropeRel <= l.relMax &&
    m.profiles >= l.profiles,
  'O3.earth': (m, l) => m.rel <= l.relMax,
  'O4.jupiter': (m, l) => m.rel <= l.relMax,
  'O5.chain': (m, l) => m.rel <= l.relMax,
  'O6.coverage': (m, l) =>
    m.n >= l.profiles &&
    m.oneSigma >= l.oneSigma[0] &&
    m.oneSigma <= l.oneSigma[1],
  'O7.refusals': (m, l) =>
    m.refused >= l.count && m.refused === m.of && m.saturnCode === 'q-range',
  'B1.lazy': (m, l) =>
    m.firstVisitAddedB <= l.firstVisitAddedMax &&
    m.idleAddedB <= l.idleAddedMax &&
    m.deferredAddedB <= l.deferredAddedMax &&
    m.closureFiles <= l.closureFiles,
};

describe('the thresholds were committed first and are complete', () => {
  test('the record names the commit that holds them, and the base', () => {
    expect(record.thresholdsCommit).toBe('186ebf90');
    expect(record.base).toMatch(/^[0-9a-f]{40}$/);
    expect(record.spike).toMatchObject({
      branch: 'spike/interiors-gate',
      mergedNever: true,
    });
  });

  test('every committed check has a recorded status from the known set', () => {
    for (const c of thresholds.checks) {
      expect(STATUSES).toContain(record.checks[c.id]?.status);
      expect(['common', 'inversion', 'oblateness']).toContain(c.group);
    }
    expect(Object.keys(record.checks).sort()).toEqual(Object.keys(byId).sort());
  });

  test('the decision function and the domain are the committed ones', () => {
    expect(thresholds.domain.inversion.bodies).toEqual(['earth', 'mars']);
    expect(thresholds.domain.oblateness.qMax).toBe(0.1);
    expect(thresholds.domain.oblateness.qConvention).toMatch(/equatorial/);
    expect(thresholds.decision.rule).toMatch(/inversion passes alone/);
  });
});

describe('each recorded status follows from its measurement and its bound', () => {
  for (const [id, fn] of Object.entries(judged))
    test(id, () => {
      const rec = record.checks[id];
      expect(rec.status === 'pass' || rec.status === 'fail').toBe(true);
      expect(fn(rec.measured, byId[id].limits)).toBe(rec.status === 'pass');
    });

  test('the typed pack equalled the committed sources when measured', () => {
    expect(record.packEqualsSources.pass).toBe(true);
  });
});

describe('the failing leg is the one stated, and the verdict follows', () => {
  test('failed-legs.json lists exactly the failing checks, with the committed bound', () => {
    const failing = Object.keys(record.checks).filter(
      id => record.checks[id].status === 'fail'
    );
    expect(Object.keys(failed.legs).sort()).toEqual(failing.sort());
    for (const id of failing) {
      expect(failed.legs[id].bound).toEqual(byId[id].limits.oneSigma);
      expect(failed.legs[id].measured).toBe(
        record.checks[id].measured.oneSigma
      );
    }
  });

  test('the verdict is C by the committed function, and the document says so', () => {
    expect(decide(record.checks)).toBe('C');
    expect(doc).toMatch(/\*\*Verdict: C\*\*/);
  });

  test('every other oblateness and inversion leg passes (the evidence for A, stated)', () => {
    const others = thresholds.checks.filter(c => c.id !== 'O6.coverage');
    for (const c of others) expect(record.checks[c.id].status).toBe('pass');
    // With O6 passing the function would give A: the verdict rests on one coverage band.
    const asIf = { ...record.checks, 'O6.coverage': { status: 'pass' } };
    expect(decide(asIf)).toBe('A');
  });
});

describe('the oracle and the typed inputs', () => {
  test('the oracle passed its self-tests before any comparison', () => {
    const s = oracle.selfTests;
    expect(Math.abs(s.homogeneousEta)).toBeLessThan(1e-10);
    expect(Math.abs(s.homogeneousMoment - 0.4)).toBeLessThan(1e-10);
    expect(Math.abs(s.homogeneousF_over_q - 1.25)).toBeLessThan(1e-10);
    expect(Math.abs(s.polytropeMoment / s.polytropeTarget - 1)).toBeLessThan(
      1e-8
    );
  });

  test('the pinned oracle has the committed counts', () => {
    expect(oracle.twoLayer).toHaveLength(
      thresholds.checks.find(c => c.id === 'I1.closed').limits.points
    );
    expect(oracle.clairaut).toHaveLength(200);
    expect(oracle.ensembleO6).toHaveLength(1000);
    expect(oracle.radau).toHaveLength(1000);
  });

  test('Darwin-Radau closure error measured below its committed margin (the reason O6 over-covers)', () => {
    expect(
      record.checks['O2.radau-clairaut'].measured.worstProfileRel
    ).toBeLessThan(0.01);
  });

  test('the sources are typed and unchecked, and say so', () => {
    expect(sources.provenance.checked).toBe(false);
    expect(sources.provenance.retrieved).toBeNull();
  });
});
