import { describe, test, expect } from '@jest/globals';
import { readFileSync } from 'node:fs';

// =============================================================================
// Atmospheres gate I (Prompt 199, ATMOSPHERES_GATE_I.md)
// -----------------------------------------------------------------------------
// The thresholds were committed before any prototype existed. This suite holds
// the recorded result to them: every check has a recorded status, each status
// follows from the recorded measurement and the committed bound, the verdict
// follows from the decision function, and the document says the same verdict.
// The prototype is the branch spike/atmospheres-gate-i, which is never merged.
// =============================================================================

const DIR = 'tests/fixtures/atmospheres-gate-i';
const thresholds = JSON.parse(readFileSync(`${DIR}/thresholds.json`, 'utf8'));
const record = JSON.parse(readFileSync(`${DIR}/record.json`, 'utf8'));
const doc = readFileSync('ATMOSPHERES_GATE_I.md', 'utf8');
const byId = Object.fromEntries(thresholds.checks.map(c => [c.id, c]));
const STATUSES = ['pass', 'fail', 'not-measured'];

/** The committed decision function: a core check that is not a pass is C; else an escape one is B; else A. */
function decide(checks) {
  const notPass = group =>
    thresholds.checks
      .filter(c => c.group === group)
      .some(c => checks[c.id]?.status !== 'pass');
  if (notPass('core')) return 'C';
  if (notPass('escape')) return 'B';
  return 'A';
}

/** Re-derive each numeric check's status from its recorded measurement and its committed bound. */
const judged = {
  'A1.equilibrium': (m, l) =>
    m.relErrMax <= l.relErrMax && m.points >= l.points,
  'A3.onelayer': (m, l) => m.relErrMax <= l.relErrMax && m.monotone === true,
  'A4.grey': (m, l) =>
    m.closedRelErrMax <= l.closedRelErrMax && m.odeRelErrMax <= l.odeRelErrMax,
  'A5.eddington': (m, l) => m.oracleSelfTestPass && m.worstRelT <= l.tRelMax,
  'S1.scale': (m, l) =>
    m.relErrMax <= l.relErrMax && m.efoldRelErrMax <= l.efoldRelMax,
  'J1.arith': (m, l) => m.relErrMax <= l.relErrMax && m.points >= l.points,
  'P1.plot': (m, l) =>
    m.worstVertexPx <= l.vertexPxMax &&
    m.plots.length === l.plots &&
    m.noOwnDrawing,
  'T1.noescape.deferred': (m, l) =>
    m.deferredAddedGzipB <= l.deferredGzipMax &&
    m.kernelAloneGzipB <= l.kernelGzipMax,
  'T1.requests': (m, l) => m.chunksAddedWhole <= l.chunksMax,
  'T1.tier': (m, l) =>
    m.firstVisitAddedB <= l.firstVisitAddedMax &&
    m.idleAddedB <= l.idleAddedMax,
  'T1.routes': (m, l) =>
    m.buildRiseKbMax <= l.routeRiseKbMax &&
    m.requestsAdded <= l.requestsAddedMax,
  'T1.whole.deferred': (m, l) => m.deferredAddedGzipB <= l.deferredGzipMax,
};

describe('the committed thresholds', () => {
  test('ids are unique, every check has a group and a bound, the groups are the two named', () => {
    const ids = thresholds.checks.map(c => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const c of thresholds.checks) {
      expect(['core', 'escape']).toContain(c.group);
      expect(c.bound.length).toBeGreaterThan(40);
      expect(c.limits).toBeTruthy();
    }
    expect(Object.keys(thresholds.groups).sort()).toEqual(['core', 'escape']);
  });

  test('the document names every check by its id prefix and the slices as committed', () => {
    for (const c of thresholds.checks) {
      expect(doc).toContain(c.id.split('.')[0]);
    }
    for (const k of ['A', 'B', 'C'])
      expect(thresholds.slices[k].length).toBeGreaterThan(20);
    expect(doc).toContain('a `core` check that is not a pass gives **C**');
  });

  test('the Jeans table and the exobase sources are escape checks, and nothing measured them', () => {
    expect(byId['J3.published'].group).toBe('escape');
    expect(byId['J4.sources'].group).toBe('escape');
    expect(record.checks['J3.published'].status).toBe('not-measured');
    expect(record.checks['J4.sources'].status).toBe('not-measured');
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
      expect({ id, status: r.status }).toEqual({
        id,
        status: f(r.measured, byId[id].limits) ? 'pass' : 'fail',
      });
    }
  });

  test('the published anchors say they were typed and not re-read', () => {
    expect(record.checks['A2.anchors'].note).toMatch(/checked: false/);
    expect(record.checks['S2.anchors'].note).toMatch(/checked: false/);
  });

  test('every anchor stays inside its committed tolerance', () => {
    const rows = record.checks['A2.anchors'].measured.rows;
    const l = byId['A2.anchors'].limits;
    for (const r of rows) {
      if (r.tol !== undefined) expect(r.rel).toBeLessThanOrEqual(r.tol);
    }
    expect(rows.find(r => r.tol === 0.02).tol).toBe(l.terrestrialRelMax);
    expect(rows.filter(r => r.tol === 0.01)).toHaveLength(3);
    const hj = rows.find(r => r.body === 'HD 209458 b');
    expect(hj.model).toBeGreaterThanOrEqual(l.hotJupiterBandK[0]);
    expect(hj.model).toBeLessThanOrEqual(l.hotJupiterBandK[1]);
    expect(hj.relToLesson).toBeLessThanOrEqual(l.lessonFormulaRelMax);
  });

  test('the Eddington profile is at worst 4 percent from the exact grey solution, at the top, and the oracle passed its self-test', () => {
    const m = record.checks['A5.eddington'].measured;
    expect(m.atTau).toBe(0);
    expect(m.worstRelT).toBeGreaterThan(0.03);
    expect(m.oracleQ0).toBeCloseTo(0.5774, 2);
    expect(m.oracleQinfAtTau20).toBeCloseTo(0.7104, 2);
  });

  test('the one-layer model refuses for Venus and the two models disagree away from one optical depth', () => {
    const { report, differ } = record.checks['A6.report'].measured;
    const venus = report.find(r => r.body === 'Venus');
    expect(venus.oneLayerEmissivity).toBeNull();
    expect(venus.oneLayerRefusal).toMatch(/2\^\(1\/4\)/);
    expect(
      report.find(r => r.body === 'Earth').oneLayerEmissivity
    ).toBeGreaterThan(0);
    for (const d of differ) expect(d.grey).toBeGreaterThan(d.oneLayer);
  });

  test('the verdict follows from the decision function and the document states it', () => {
    expect(decide(record.checks)).toBe(record.verdict);
    expect(doc).toContain(`**Verdict: ${record.verdict}**`);
  });

  test('a counterfactual is labelled as one and never replaces the verdict', () => {
    expect(record.counterfactual.if).toMatch(/reset by Carl/);
    const reset = JSON.parse(JSON.stringify(record.checks));
    reset['T1.tier'].status = 'pass';
    reset['T1.routes'].status = 'pass';
    expect(decide(reset)).toBe(record.counterfactual.verdict);
  });

  test('the prototype is a branch that is never merged: the record names its commit and no js/ file of it is here', () => {
    expect(record.spike.mergedNever).toBe(true);
    expect(record.spike.sha).toMatch(/^[0-9a-f]{40}$/);
    expect(record.base).toMatch(/^[0-9a-f]{40}$/);
    expect(() => readFileSync('js/kernels/atmospheres/index.js')).toThrow();
    expect(() => readFileSync('js/atmosphereWidgets.js')).toThrow();
  });
});
