import { describe, test, expect } from '@jest/globals';
import { readFileSync } from 'node:fs';

// =============================================================================
// Atmospheres gate II (Prompt 201, ATMOSPHERES_GATE_II.md)
// -----------------------------------------------------------------------------
// The thresholds were committed before any prototype or oracle output existed
// (two amendments, AM1 and AM2, are recorded in the fixture and the document).
// This suite holds the recorded result to them: every check has a recorded
// status, each status follows from the recorded measurement and the committed
// bound, the failing legs are the ones failed-legs.json lists and are left
// failing, the verdict follows from the decision function, the data checks that
// need a table nobody was allowed to fetch say so, and the claim rule runs live
// over the atmosphere family's strings. The prototype, the independent oracle
// and the harness are the never-merged branch spike/atmospheres-gate-ii.
// =============================================================================

const DIR = 'tests/fixtures/atmospheres-gate-ii';
const thresholds = JSON.parse(readFileSync(`${DIR}/thresholds.json`, 'utf8'));
const record = JSON.parse(readFileSync(`${DIR}/record.json`, 'utf8'));
const failedLegs = JSON.parse(readFileSync(`${DIR}/failed-legs.json`, 'utf8'));
const oracle = JSON.parse(readFileSync(`${DIR}/oracle-results.json`, 'utf8'));
const doc = readFileSync('ATMOSPHERES_GATE_II.md', 'utf8');
const byId = Object.fromEntries(thresholds.checks.map(c => [c.id, c]));
const STATUSES = ['pass', 'pass-under-ruling', 'fail', 'not-measured'];
const isPass = s => s === 'pass' || s === 'pass-under-ruling';

/** The committed decision function: shared or ep not a pass is C; else tx not a pass is B; else A. The data group never enters. */
function decide(checks, ignore = []) {
  const notPass = g =>
    thresholds.checks
      .filter(c => c.group === g && !ignore.includes(c.id))
      .some(c => !isPass(checks[c.id]?.status));
  if (notPass('shared') || notPass('ep')) return 'C';
  return notPass('tx') ? 'B' : 'A';
}

/** Re-derive each numeric status from the recorded measurement and the committed bound. */
const judged = {
  'U1.constants': (m, l) => m.copies.length === 0 && m.worstRel <= l.relMax,
  'E1.planck': (m, l) =>
    m.relErrMax <= l.relErrMax &&
    m.fullBandRelMax <= l.fullBandRelMax &&
    m.rayleighJeansRel <= l.rayleighJeansRelMax &&
    m.monotone &&
    m.points >= l.points,
  'E2.eclipse': (m, l) =>
    m.relErrMax <= l.relErrMax &&
    m.equalTemperatureLimitRel <= 1e-12 &&
    m.monotone &&
    m.points >= l.points,
  'E3.slab': (m, l) =>
    m.relErrMax <= l.relErrMax &&
    m.tauZeroExact &&
    m.thickRel <= 1e-9 &&
    m.monotone &&
    m.points >= l.points,
  'E4.lambert': (m, l) =>
    m.absErrMax <= l.absErrMax &&
    m.endpointsAbs <= 1e-12 &&
    m.phaseIntegralAbs <= l.phaseIntegralAbsMax &&
    m.monotone &&
    m.angles === l.angles,
  'E5.albedo': (m, l) =>
    m.coverage >= l.coverageRange[0] && m.coverage <= l.coverageRange[1],
  'E6.btemp': (m, l) =>
    m.coverage >= l.coverageRange[0] &&
    m.coverage <= l.coverageRange[1] &&
    m.roundTripRelMax <= l.roundTripRelMax,
  'N1.misfit': (m, l) =>
    Object.values(m.power).every(p => p >= l.powerMin) &&
    m.falseFlag <= l.falseFlagMax,
  'N2.reflected': m => m.decidedAsTheRuleSays === m.of,
  'X1.analytic': (m, l) => m.relErrMax <= l.relErrMax && m.monotone,
  'X2.numerics': (m, l) =>
    m.singleRelMax <= l.singleRelMax && m.bandRelMax <= l.bandRelMax,
  'X3.regime': m => m.failures === 0 && m.pairsAccepted > 0,
  'X4.coverage': (m, l) =>
    m.coverage >= l.coverageRange[0] && m.coverage <= l.coverageRange[1],
  'X5.refusals': (m, l) =>
    m.refusedOutside === l.outsideCases &&
    m.refusedInside === 0 &&
    m.nullReturnedFraction <= l.nullReturnMax &&
    m.powerReturnedFraction >= l.powerMin,
  'X6.cloud': (m, l) => m.notConstrainedFraction >= l.notConstrainedMin,
  'R1.refusals': (m, l) =>
    m.hostileInputs >= l.hostileInputs && m.refusing === m.hostileInputs,
  'C1.claims': (m, l) =>
    m.badCaught === l.badControls &&
    m.permittedPass === l.permittedControls &&
    m.violations.length <= l.violationsMax,
  'P1.plot': (m, l) =>
    m.worstVertexPx <= l.vertexPxMax &&
    m.plots.length === l.plots &&
    m.noOwnDrawing,
  'T1.ep.deferred': (m, l) =>
    m.deferredAddedGzipB <= l.deferredGzipMax &&
    m.kernelAloneGzipB <= l.kernelGzipMax,
  'T1.whole.deferred': (m, l) =>
    m.deferredAddedGzipB <= l.deferredGzipMax &&
    m.kernelAloneGzipB <= l.kernelGzipMax,
  'T1.requests': (m, l) => m.chunksAddedWhole <= l.chunksMax,
  'T1.tier': (m, l) =>
    m.firstVisitAddedB <= l.firstVisitAddedMax &&
    m.firstVisitAddedEpB <= l.firstVisitAddedMax &&
    m.idleAddedB <= l.idleAddedMax,
  'T1.routes': (m, l) =>
    m.whole.routeRiseKbMax <= l.routeRiseKbMax &&
    m.whole.requestsAddedMax <= l.requestsAddedMax &&
    m.ep.routeRiseKbMax <= l.routeRiseKbMax,
};

describe('the committed thresholds', () => {
  test('ids are unique, every check has a known group, a bound and limits, the four groups are named', () => {
    const ids = thresholds.checks.map(c => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const c of thresholds.checks) {
      expect(['shared', 'ep', 'tx', 'data']).toContain(c.group);
      expect(c.bound.length).toBeGreaterThan(40);
      expect(c.limits).toBeTruthy();
    }
    expect(Object.keys(thresholds.groups).sort()).toEqual([
      'data',
      'ep',
      'shared',
      'tx',
    ]);
  });

  test('the document names every check by its id prefix and states the decision function and the slices as committed', () => {
    for (const c of thresholds.checks)
      expect(doc).toContain(c.id.split('.')[0]);
    for (const k of ['A', 'B', 'C'])
      expect(thresholds.slices[k].length).toBeGreaterThan(10);
    expect(doc).toContain('gives **C**; else a `tx` check');
    expect(thresholds.decision.order).toHaveLength(3);
  });

  test('the two amendments are recorded in the fixture and the document, AM1 before any measurement and AM2 after one', () => {
    expect(thresholds.amendments.map(a => a.id)).toEqual(['AM1', 'AM2', 'AM3']);
    expect(doc).toContain('Amendment AM1');
    expect(doc).toContain('Amendment AM2');
    expect(doc).toContain('Amendment AM3');
    expect(byId['E1.planck'].bound).toMatch(/amended/);
    expect(thresholds.amendments[1].why).toMatch(/11 of 12/);
    expect(thresholds.claimRule.flags).toBe('iu');
  });

  test('no download was made, and every data request says it was neither requested of Carl nor downloaded', () => {
    expect(thresholds.intake.downloadsMade).toBe(0);
    expect(thresholds.dataRequests.map(r => r.id)).toEqual([
      'Q1',
      'Q2',
      'Q3',
      'Q4',
      'Q5',
    ]);
    for (const r of thresholds.dataRequests) {
      expect(r.status).toMatch(/not downloaded/);
      expect(r.licence).toMatch(/not read/);
    }
  });
});

describe('the recorded result', () => {
  test('there is exactly one recorded status per committed check, and it is a known one', () => {
    expect(Object.keys(record.checks).sort()).toEqual(
      thresholds.checks.map(c => c.id).sort()
    );
    for (const r of Object.values(record.checks))
      expect(STATUSES).toContain(r.status);
  });

  test('each numeric status follows from its recorded measurement and its committed bound', () => {
    for (const [id, f] of Object.entries(judged)) {
      const r = record.checks[id];
      const want = f(r.measured, byId[id].limits)
        ? byId[id].ruling
          ? 'pass-under-ruling'
          : 'pass'
        : 'fail';
      expect({ id, status: r.status }).toEqual({ id, status: want });
    }
  });

  test('the checks that need a table nobody was allowed to fetch are not measured, and nothing simulates them', () => {
    for (const id of [
      'XR.reference',
      'XT.table',
      'D1.transmission',
      'D2.eclipse',
      'D3.phase',
    ]) {
      expect(record.checks[id].status).toBe('not-measured');
      expect(record.checks[id].measured).toBeNull();
    }
    expect(byId['D1.transmission'].group).toBe('data');
    expect(failedLegs.notMeasured.sort()).toEqual(
      [
        'D1.transmission',
        'D2.eclipse',
        'D3.phase',
        'XR.reference',
        'XT.table',
      ].sort()
    );
  });

  test('the failing legs are left failing as committed and are the ones failed-legs.json lists, plus the one Carl ruled on, kept as measured', () => {
    const failing = Object.entries(record.checks)
      .filter(([, v]) => v.status === 'fail')
      .map(([id]) => id)
      .sort();
    expect(failing).toEqual(['T1.whole.deferred', 'X3.regime', 'X4.coverage']);
    expect(failedLegs.failed.map(f => f.id).sort()).toEqual(
      [...failing, 'T1.ep.deferred'].sort()
    );
    const ruled = failedLegs.failed.find(f => f.id === 'T1.ep.deferred');
    expect(ruled.ruledByCarl).toMatch(/R1/);
    expect(ruled.measured.kernelAloneGzipB).toBe(2282);
    expect(record.checks['T1.ep.deferred'].originalStatus).toBe('fail');
    expect(byId['X3.regime'].limits.factor).toBe(1.5);
    expect(byId['X4.coverage'].limits.coverageRange).toEqual([0.93, 0.99]);
    expect(byId['T1.whole.deferred'].limits.kernelGzipMax).toBe(4096);
    for (const c of thresholds.checks.filter(c => c.group === 'ep'))
      expect(isPass(record.checks[c.id].status)).toBe(true);
  });

  test('the transmission model passes its numerics and fails its stated error and coverage: what that means is in the record', () => {
    expect(record.checks['X1.analytic'].measured.relErrMax).toBeLessThan(1e-8);
    expect(record.checks['X2.numerics'].measured.bandRelMax).toBeLessThan(0.01);
    const x3 = record.checks['X3.regime'].measured;
    expect(x3.failures).toBeGreaterThan(0);
    expect(x3.pairsAccepted).toBeGreaterThan(5000);
    const x4 = record.checks['X4.coverage'].measured;
    expect(x4.coverage).toBeLessThan(0.93);
    expect(x4.biasMedian).toBeGreaterThan(0.05);
    // refusals and the cloud case hold
    expect(record.checks['X5.refusals'].status).toBe('pass');
    expect(record.checks['X6.cloud'].status).toBe('pass');
  });

  test('the reported-not-asserted biases are recorded for the four cases', () => {
    const z = record.checks['Z1.reported'].measured.relativeTemperatureBias;
    expect(Object.keys(z).sort()).toEqual(
      ['deckStrongOnly', 'gradient+10', 'gradient-10', 'xp0x3'].sort()
    );
    expect(z['gradient+10'].median).toBeGreaterThan(0);
    expect(z['gradient-10'].median).toBeLessThan(0);
    expect(Math.abs(z.deckStrongOnly.median)).toBeGreaterThan(0.3);
  });

  test("the verdict follows from the decision function (B under Carl's ruling), the committed bounds as measured gave C, and the document states both", () => {
    expect(decide(record.checks)).toBe(record.verdict);
    expect(record.verdict).toBe('B');
    expect(record.originalVerdict.verdict).toBe('C');
    const asCommitted = JSON.parse(JSON.stringify(record.checks));
    asCommitted['T1.ep.deferred'].status = 'fail';
    expect(decide(asCommitted)).toBe('C');
    // transmission still fails: a pass anywhere in tx would be needed for A
    expect(decide(record.checks, ['T1.ep.deferred'])).toBe('B');
    expect(doc).toContain('**Verdict: B**');
    expect(doc).toContain('(record `42af7e57`)');
  });

  test("Carl's two rulings are pinned: source, verbatim words, original and measured values, the one row that carries R1, AM2 standing", () => {
    const SOURCE =
      'Carl, in chat on 2026-10-27, relayed by the coordinator (not heard by this session directly)';
    expect(thresholds.rulings).toHaveLength(1);
    expect(thresholds.rulings[0].source).toBe(SOURCE);
    expect(thresholds.rulings[0].words).toBe('Reset to 2,282 (verdict B)');
    expect(thresholds.rulings[0].madeAfterMeasurement).toBe(true);
    expect(record.ruling).toEqual(thresholds.rulings[0]);
    expect(thresholds.checks.filter(c => c.ruling).map(c => c.id)).toEqual([
      'T1.ep.deferred',
    ]);
    const c = byId['T1.ep.deferred'];
    expect(c.ruling.originalLimits).toEqual({ kernelGzipMax: 2048 });
    expect(c.limits.kernelGzipMax).toBe(2282);
    expect(c.limits.deferredGzipMax).toBe(7168);
    expect(record.checks['T1.ep.deferred'].status).toBe('pass-under-ruling');
    expect(record.checks['T1.ep.deferred'].ruling).toBe('R1');
    expect(
      Object.values(record.checks).filter(x => x.status === 'pass-under-ruling')
    ).toHaveLength(1);
    const am2 = thresholds.amendments.find(a => a.id === 'AM2');
    expect(am2.ruling.words).toBe('Let AM2 stand (Recommended)');
    expect(thresholds.amendments.find(a => a.id === 'AM3').words).toBe(
      'Reset to 2,282 (verdict B)'
    );
    expect(doc).toContain('"Reset to 2,282 (verdict B)"');
    expect(doc).toContain('"Let AM2 stand (Recommended)"');
    expect(doc).toContain(
      "205's spectra items** need the transmission piece and **stay unauthorized"
    );
    expect(doc).toContain('202 needs a ruling on the first-visit precache');
  });

  test('the oracle was independent and checked itself: the Lommel-Seeliger sphere agrees with its closed form and the depth grid is converged', () => {
    expect(oracle.selfTest.lommelSeeligerClosedVsNumeric).toBeLessThan(1e-9);
    expect(oracle.selfTest.depthGridConvergence).toBeLessThan(1e-9);
    expect(Math.abs(oracle.selfTest.chordVsBessel)).toBeLessThan(1e-12);
    expect(oracle.fullResults.sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(oracle.counts.X3).toBe(2000);
    expect(oracle.syntheticAbsorber.strong.lines).toBe(360);
    expect(oracle.syntheticAbsorber.window.lines).toBe(0);
  });

  test('the prototype is a branch that is never merged: the record names its commit and no prototype file is here', () => {
    expect(record.spike.mergedNever).toBe(true);
    expect(record.spike.sha).toMatch(/^[0-9a-f]{40}$/);
    expect(record.base).toMatch(/^[0-9a-f]{40}$/);
    for (const f of [
      'js/kernels/atmospheres/emission.js',
      'js/kernels/atmospheres/phase.js',
      'js/kernels/atmospheres/transmission.js',
      'js/kernels/atmospheres/bands.js',
      'tools/atmospheres-gate-ii/oracle.py',
    ])
      expect(() => readFileSync(f)).toThrow();
  });
});

describe('the claim rule, live over the atmosphere family', () => {
  const flags = thresholds.claimRule.flags;
  const rx = [
    ...thresholds.claimRule.forbidden.en,
    ...thresholds.claimRule.forbidden.es,
  ].map(s => new RegExp(s, flags));
  const flagged = s => rx.some(r => r.test(s));
  const FILES = [
    'js/i18n/en.atmospheres.js',
    'js/i18n/es.atmospheres.js',
    ...['', 'es/', 'depth/', 'depth/es/'].flatMap(d =>
      ['atmosphere-sequence', 'why-venus-is-hot', 'two-greenhouse-models'].map(
        n => `js/data/investigations/${d}${n}.js`
      )
    ),
    'js/atmosphereWidgets.js',
  ];

  test('the scanner catches every committed bad string and passes every permitted one', () => {
    for (const s of thresholds.claimRule.badControls)
      expect({ s, caught: flagged(s) }).toEqual({ s, caught: true });
    for (const s of thresholds.claimRule.permittedControls)
      expect({ s, caught: flagged(s) }).toEqual({ s, caught: false });
  });

  test('no string of the atmosphere family says water was detected or that a planet keeps or loses its atmosphere (Prompt 202 extends this list to its strings)', () => {
    const hits = [];
    let scanned = 0;
    for (const f of FILES) {
      let text;
      try {
        text = readFileSync(f, 'utf8');
      } catch {
        continue;
      }
      scanned++;
      const flat = text.replace(/'\s*\+?\s*\n\s*'/g, '').replace(/\s+/g, ' ');
      for (const r of rx) {
        const m = flat.match(r);
        if (m) hits.push({ f, m: m[0] });
      }
    }
    expect(scanned).toBeGreaterThanOrEqual(9);
    expect(hits).toEqual([]);
  });
});
