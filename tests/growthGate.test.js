// =============================================================================
// The structure-growth gate record (Roadmap III, Prompt 259 Part A)
// -----------------------------------------------------------------------------
// GROWTH_GATE.md and tests/fixtures/growth/ are a record, not a kernel: the prototype
// that produced results.json is on spike/structure-growth-gate and is never merged.
// This holds that the record is consistent with itself and with the contract committed
// first:
//
//   - thresholds.json has no amendment and its committed legs; results.json names the
//     thresholds and the oracle it was run against;
//   - every row is a committed leg, and the status of every pass/fail row is recomputed
//     here from its measured numbers and its committed bound;
//   - the verdict is the one the committed function gives from the rows;
//   - failed-legs.json holds every failing row and nothing else;
//   - the legs that need a table, a code or a file nobody supplied are NOT RUN;
//   - the transcribed equations carry their lines, no fixture holds a home path, and
//     the claim rule (no sandbox run shown as structure formation) holds on the tree today;
//   - the document and the register state the counts and the verdict the files hold.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';

const DIR = 'tests/fixtures/growth';
const bytes = f => readFileSync(`${DIR}/${f}`);
const read = f => JSON.parse(bytes(f));
const sha = b => createHash('sha256').update(b).digest('hex');
const thresholds = read('thresholds.json');
const results = read('results.json');
const failedFile = read('failed-legs.json');
const oracle = read('oracle-results.json');
const eh98 = read('authentic/eh98-formulas.json');
const planck = read('authentic/planck-best-fit.json');
const sources = read('authentic/SOURCES.json');
const doc = readFileSync('GROWTH_GATE.md', 'utf8');
const register = readFileSync('DECISION_REGISTER.md', 'utf8');
const TOL = thresholds.tolerance;
const P = (v, t) => v <= t;

// The committed bound of every pass/fail row, applied to its measured numbers.
const RULE = {
  'I1.sources': m =>
    m.recordsAgree &&
    m.textPresent &&
    m.textSha256Equal &&
    m.checked > 0 &&
    m.checked === m.found,
  'I2.inputs': m => m.thresholdsSha256 === m.oracleRecorded,
  'G1.eds': m => P(m.maxRelD, TOL.closedForm) && P(m.maxAbsF, TOL.closedForm),
  'G2.openMatterOnly': m =>
    P(m.maxRelD, TOL.closedForm) && P(m.maxAbsF, TOL.closedForm),
  'G3.flatLambda': m =>
    P(m.maxRelD, TOL.closedForm) && P(m.maxAbsF, TOL.closedForm),
  'G4.heathCurved': m =>
    P(m.maxRelD, TOL.closedForm) && P(m.maxAbsF, TOL.closedForm),
  'O1.dop853': m => P(m.maxRelD, TOL.oracle) && P(m.maxAbsF, TOL.oracle),
  'O2.errorCoverage': m => m.covered === m.points,
  'C1.cptFit': m => P(m.maxRelativeDeviation, TOL.cptFit),
  'P1.zeroBaryon': m => P(m.maxRelative, TOL.transferZeroBaryon),
  'P2.effectiveShape': m => P(m.maxRelative, TOL.transferShape),
  'P3.sigmaPowerLaw': m => P(m.maxRelative, TOL.sigmaPowerLaw),
  'P4.sigmaOracle': m => P(m.maxRelative, TOL.sigmaOracle),
  'P5.normalisation': m =>
    P(m.normalisationRelative, TOL.normalisation) &&
    P(m.scalingRelative, TOL.scaling),
  'X1.planckSigma8': m => P(Math.abs(m.relativeDeviation), TOL.planckSigma8),
  'J1.jeansWavenumber': m => P(m.maxRelative, TOL.jeansAlgebra),
  'J2.pressureOde': m => P(m.maxRelativeToMax, TOL.jeansOde),
  'J3.zeroPressure': m => m.bitForBit === true,
  'J4.edsCrossing': m => P(m.maxRelative, TOL.crossing),
  'R1.growthRefusals': m => m.cases.every(c => c.expected === c.got),
  'R2.growthAccepted': m => m.refused === 0,
  'R3.shapeRefusals': m => m.cases.every(c => c.expected === c.got),
  'R4.jeansRefusals': m => m.cases.every(c => c.expected === c.got),
  'Q1.claimRule': m => m.matches === 0,
};
const NOT_RUN = ['C2.publishedTable', 'C3.citedCode', 'P6.numericalTransfer'];
const REPORTED = ['W1.growthIndex', 'W2.radiation', 'W3.cpu'];
const OMITTED = ['W4.imageryDecision'];

describe('the committed contract', () => {
  test('has no amendment, and says nothing moves after a result', () => {
    expect(thresholds.amendments).toEqual([]);
    expect(thresholds.rule).toMatch(
      /Nothing is moved, re-read or re-defined after a result/
    );
  });

  test('has 31 legs, unique, in the groups the verdict function names', () => {
    const ids = thresholds.checks.map(c => c.id);
    expect(ids.length).toBe(31);
    expect(new Set(ids).size).toBe(31);
    const tally = {};
    for (const c of thresholds.checks)
      tally[c.group] = (tally[c.group] ?? 0) + 1;
    expect(tally).toEqual({
      integrity: 2,
      closedForm: 4,
      oracle: 2,
      cited: 3,
      power: 6,
      authentic: 1,
      jeans: 4,
      refusals: 4,
      claimRule: 1,
      reported: 4,
    });
  });

  test('commits imagery as none, so verdict A is not attainable, and names its requests', () => {
    expect(thresholds.model.imagery).toMatch(/^NONE/);
    expect(thresholds.verdict.A).toMatch(/not attainable/);
    expect(Object.keys(thresholds.externalRequests)).toEqual([
      'C2',
      'C3',
      'P6',
      'S1',
    ]);
    for (const r of Object.values(thresholds.externalRequests))
      expect(r).toMatch(/^NOT (RUN|DECIDED)/);
  });

  test('declares the domain, the missing ODE routine and that Part B is not begun', () => {
    expect(thresholds.model.growthDomain).toMatch(/Or = 0/);
    expect(thresholds.model.numerics).toMatch(/no ODE routine/);
    expect(thresholds.scope.notBuilt).toMatch(/Part B is not begun/);
    expect(thresholds.verdict.consumersClause).toMatch(/Carl lifts/);
    expect(thresholds.oracle.ensemble).toMatch(/NOT APPLICABLE/);
  });
});

describe('the gate stream', () => {
  test('was run against these thresholds and this oracle on Node 22', () => {
    expect(results.thresholdsSha256).toBe(sha(bytes('thresholds.json')));
    expect(results.oracleSha256).toBe(sha(bytes('oracle-results.json')));
    expect(oracle.thresholdsSha256).toBe(results.thresholdsSha256);
    expect(results.environment.node).toMatch(/^v22\./);
    expect(JSON.stringify(results)).not.toMatch(/\/Users\//);
  });

  test('has one row per committed leg', () => {
    const ids = results.rows.map(r => r.id).sort();
    expect(ids).toEqual(thresholds.checks.map(c => c.id).sort());
    for (const r of results.rows)
      expect(r.group).toBe(thresholds.checks.find(c => c.id === r.id).group);
  });

  test('has the counts the document states', () => {
    const n = s => results.rows.filter(r => r.status === s).length;
    expect(results.counts).toEqual({
      rows: 31,
      pass: 22,
      fail: 2,
      reported: 3,
      notRun: 3,
      omitted: 1,
    });
    expect(n('pass')).toBe(22);
    expect(n('fail')).toBe(2);
    expect(n('reported')).toBe(3);
    expect(n('not-run')).toBe(3);
    expect(n('omitted')).toBe(1);
  });

  test('every pass/fail row has the status its committed bound gives', () => {
    for (const r of results.rows) {
      if (!(r.id in RULE)) continue;
      expect([r.id, r.status]).toEqual([
        r.id,
        RULE[r.id](r.measured) ? 'pass' : 'fail',
      ]);
    }
    expect(Object.keys(RULE).length).toBe(24);
  });

  test('the NOT RUN, reported and omitted rows are the committed ones and carry their reason', () => {
    for (const id of NOT_RUN) {
      const r = results.rows.find(x => x.id === id);
      expect(r.status).toBe('not-run');
      expect(thresholds.checks.find(c => c.id === id).expected).toBe('not-run');
      expect(r.measured.request).toBe(id.split('.')[0]);
      expect(thresholds.externalRequests[r.measured.request]).toMatch(
        /^NOT RUN/
      );
    }
    for (const id of REPORTED)
      expect(results.rows.find(x => x.id === id).status).toBe('reported');
    for (const id of OMITTED)
      expect(results.rows.find(x => x.id === id).status).toBe('omitted');
  });

  test('the verdict is the committed function applied to the rows: C (C1 and R2 fail)', () => {
    const failedKernel = results.rows
      .filter(r => r.status === 'fail' && r.id !== 'X1.planckSigma8')
      .map(r => r.id);
    const x1 = results.rows.find(r => r.id === 'X1.planckSigma8').status;
    const verdict = failedKernel.length ? 'C' : x1 === 'pass' ? 'B' : 'B2';
    expect(failedKernel).toEqual(['C1.cptFit', 'R2.growthAccepted']);
    expect(x1).toBe('pass');
    expect(verdict).toBe('C');
    expect(results.verdict).toBe(verdict);
    expect(results.kernel).toBe('KERNEL FAIL');
    expect(results.failedKernelLegs).toEqual(failedKernel);
  });

  test('failed-legs.json holds every failing row and nothing else', () => {
    const failing = results.rows.filter(r => r.status === 'fail');
    expect(failedFile.legs).toEqual(failing);
    expect(failedFile.legs.map(l => l.id)).toEqual([
      'C1.cptFit',
      'R2.growthAccepted',
    ]);
  });

  test('the two failures are as the document states them', () => {
    const c1 = results.rows.find(r => r.id === 'C1.cptFit').measured;
    expect(c1.maxRelativeDeviation).toBeGreaterThan(TOL.cptFit);
    expect(c1.maxRelativeDeviation).toBeLessThan(0.0202);
    expect(c1.perSet.S5).toBe(c1.maxRelativeDeviation);
    const r2 = results.rows.find(r => r.id === 'R2.growthAccepted').measured;
    expect(r2.sets).toBe(6875);
    expect(r2.refused).toBe(1);
    expect(r2.firstRefused).toEqual([
      { Om: 0.1, Ode: 1.2, w: -1.5, code: 'bounce' },
    ]);
  });

  test('the numerical legs agree with the oracle far inside their bounds', () => {
    const m = id => results.rows.find(r => r.id === id).measured;
    expect(m('G2.openMatterOnly').maxRelD).toBeLessThan(1e-10);
    expect(m('O1.dop853').maxRelD).toBeLessThan(1e-10);
    expect(m('O2.errorCoverage').fraction).toBe(1);
    expect(m('P4.sigmaOracle').maxRelative).toBeLessThan(1e-12);
    expect(m('J2.pressureOde').maxRelativeToMax).toBeLessThan(1e-8);
    expect(m('X1.planckSigma8').relativeDeviation).toBeGreaterThan(0.02);
    expect(m('X1.planckSigma8').relativeDeviation).toBeLessThan(0.025);
    expect(m('X1.planckSigma8').kernelVsOracleModel).toBeLessThan(1e-9);
  });
});

describe('the oracle and the data', () => {
  test('the oracle ran independently: python -E, scipy, decimal at 200 digits, closed forms agree with its own solve', () => {
    expect(oracle.environment.flags).toBe('python -E');
    expect(oracle.environment.decimalPrecision).toBe(200);
    expect(oracle.environment.scipy).toMatch(/^1\.13/);
    const c = oracle.closedFormSelfCheck;
    for (const k of ['open', 'flat', 'heath']) expect(c[k]).toBeLessThan(1e-11);
    expect(c.peeblesSmallXLimit).toBeCloseTo(0.4, 12);
    for (const v of Object.values(oracle.sigmaPowerLaw))
      expect(v.relativeDifference).toBeLessThan(1e-7);
  });

  test("the oracle's Einstein-de Sitter and Lambda-free solutions are D = a to 1e-10", () => {
    oracle.growth.S1.D.forEach((d, i) =>
      expect(Math.abs(d / oracle.grid.a[i] - 1)).toBeLessThan(1e-10)
    );
    expect(oracle.growth.S1.f.every(f => Math.abs(f - 1) < 1e-10)).toBe(true);
  });

  test('the radiation sensitivity and the Jeans crossing are what the doc quotes', () => {
    expect(oracle.radiationSensitivity.ratioWithRadiationAt0p01).toBeCloseTo(
      0.0185,
      3
    );
    expect(oracle.radiationSensitivity.ratioWithRadiationAt0p1).toBeCloseTo(
      0.00152,
      4
    );
    expect(oracle.jeansEdsCrossing['2.0']).toBe(0.375);
  });

  test('the transcribed equations carry their lines, and match the saved text when it is present', () => {
    expect(eh98.source.savedTextSha256).toBe(
      sources.sources[0].savedTextSha256
    );
    expect(planck.source.savedTextSha256).toBe(
      sources.sources[1].savedTextSha256
    );
    expect(Object.keys(eh98.equations).sort()).toEqual(
      [
        '26',
        '28',
        '29',
        '30',
        '31',
        'A4',
        'A5',
        'A6',
        'A7',
        'temperature',
      ].sort()
    );
    let tokens = 0;
    for (const e of Object.values(eh98.equations))
      for (const t of e.tokens) {
        tokens++;
        expect(Number.isInteger(t.line) && t.line > 0).toBe(true);
        expect(t.token.length).toBeGreaterThan(0);
      }
    expect(tokens).toBe(19);
    const saved = globalThis.process.env.GROWTH_EH98_TEXT;
    if (saved && existsSync(saved)) {
      const raw = readFileSync(saved);
      expect(sha(raw)).toBe(eh98.source.savedTextSha256);
      const lines = raw
        .toString('utf8')
        .split('\n')
        .map(l => l.normalize('NFKC'));
      for (const e of Object.values(eh98.equations))
        for (const t of e.tokens) expect(lines[t.line - 1]).toContain(t.token);
    }
  });

  test('the Planck extraction is by line, with every value and its line', () => {
    const keys = [
      'omegaBh2',
      'omegaCh2',
      'lnAs1e10',
      'ns',
      'omegaMh2',
      'H0',
      'Om',
      'sigma8',
      'k0PerMpc',
    ];
    expect(Object.keys(planck.values)).toEqual(keys);
    expect(planck.where.map(w => w.key).sort()).toEqual([...keys].sort());
    for (const w of planck.where) expect(w.line).toBeGreaterThan(0);
    expect(planck.note).toMatch(/nothing typed by hand/);
  });

  test('no fixture holds a home path', () => {
    const files = [
      'thresholds.json',
      'results.json',
      'failed-legs.json',
      'oracle-results.json',
      'authentic/eh98-formulas.json',
      'authentic/planck-best-fit.json',
      'authentic/SOURCES.json',
    ];
    for (const f of files) expect(bytes(f).toString()).not.toMatch(/\/Users\//);
  });
});

describe('the claim rule holds on the tree', () => {
  test('no student-facing string puts a sandbox, N-body or rescaled run beside structure formation, a cosmological simulation or the cosmic web', () => {
    const A = ['sandbox', 'n-body', 'rescaled'];
    const B = [
      'structure formation',
      'cosmological simulation',
      'cosmic web',
      'formacion de estructuras',
      'simulacion cosmologica',
    ];
    const fold = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    const files = [];
    const walk = d => {
      for (const e of readdirSync(d, { withFileTypes: true })) {
        const p = `${d}/${e.name}`;
        if (e.isDirectory()) walk(p);
        else if (p.endsWith('.js')) files.push(p);
      }
    };
    for (const f of readdirSync('js/i18n'))
      if (f.endsWith('.js')) files.push(`js/i18n/${f}`);
    walk('js/data');
    files.push('library/library.json');
    for (const f of readdirSync('.')) if (f.endsWith('.html')) files.push(f);
    expect(files.length).toBeGreaterThan(100);
    const hits = [];
    for (const f of files) {
      const t = fold(readFileSync(f, 'utf8'));
      for (const b of B) {
        let i = t.indexOf(b);
        while (i >= 0) {
          const win = t.slice(Math.max(0, i - 300), i + b.length + 300);
          if (A.some(a => win.includes(a))) hits.push(`${f}: ${b}`);
          i = t.indexOf(b, i + 1);
        }
      }
    }
    expect(hits).toEqual([]);
  });
});

describe('the document and the register', () => {
  test('the document states the verdict, the failing legs, the NOT RUN legs and that Part B is not begun', () => {
    expect(doc).toMatch(/Verdict by the committed function: C/);
    expect(doc).toMatch(/31 rows|31 legs/);
    expect(doc).toMatch(/22 pass, 2 fail, 3 reported, 3 not run, 1 omitted/);
    for (const id of ['C1.cptFit', 'R2.growthAccepted'])
      expect(doc).toContain(id);
    for (const id of NOT_RUN) expect(doc).toContain(id);
    expect(doc).toMatch(/Part B is not begun/);
    expect(doc).toMatch(/imagery/i);
  });

  test('the document names the requests C2, C3, P6 and S1 and the questions for Carl', () => {
    for (const r of ['C2', 'C3', 'P6', 'S1'])
      expect(doc).toMatch(new RegExp(`request ${r}`, 'i'));
    expect(doc).toMatch(/Questions for Carl/);
  });

  test('the register has D-R10-259-01 to -05, all DELEGATED or RATIFIED, sourced from this document', () => {
    for (const n of ['01', '02', '03', '04', '05']) {
      const row = register
        .split('\n')
        .find(l => l.startsWith(`| D-R10-259-${n} `));
      expect(row).toBeTruthy();
      expect(row).toContain('GROWTH_GATE.md');
      expect(row).toMatch(/\*\*(DELEGATED|RATIFIED)\*\*/);
    }
  });
});
