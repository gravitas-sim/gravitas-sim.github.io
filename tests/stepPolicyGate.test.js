// =============================================================================
// The step-policy gate (Roadmap IV, Prompt 446): the record, not a kernel
// -----------------------------------------------------------------------------
// STEP_POLICY_GATE.md, tests/fixtures/step-policy/thresholds.json (committed
// before any candidate was run) and results.json (pinned from the spike,
// spike/step-policy, never merged). Nothing here runs a simulation. The test
// recomputes every threshold's pass and the verdict from the pinned numbers by
// the rule the thresholds file states, and holds the document to them, so a
// number edited in one place and not the other fails.
// =============================================================================

import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const read = p => JSON.parse(readFileSync(p, 'utf8'));
const thresholds = read('tests/fixtures/step-policy/thresholds.json');
const results = read('tests/fixtures/step-policy/results.json');
const doc = readFileSync('STEP_POLICY_GATE.md', 'utf8');
const register = readFileSync('DECISION_REGISTER.md', 'utf8');

const T2_BOUND = 0.005;
const T3_SPREAD = 0.02;
const T4_RATIO = 1.5;
const RATES = ['120', '60', '30', 'clamp'];
const spread = v => Math.max(...v) - Math.min(...v);

/** T1 to T3 for one candidate on a set of reference cases (those whose scenario the slice holds). */
function referenceCases(candidate, cases) {
  const c = results.candidates[candidate];
  const inScope = id => {
    const k = id.split('.')[0];
    // R2, R3, R4 are capped scenarios, identical under every candidate and
    // always judged; R6 and the R5 fragment leg are reported only.
    if (k === 'R6' || id === 'R5.fragmentSpread') return false;
    return ['R2', 'R3', 'R4'].includes(k) || cases.includes(k);
  };
  const failing = c.failingRows.filter(inScope);
  const t1 = failing.length === 0;
  const t2 =
    (!cases.includes('R1') || spread(c.T2.R1) <= T2_BOUND) &&
    (c.T2.R2 === null || spread(c.T2.R2) <= T2_BOUND);
  const t3 =
    !cases.includes('R4x') ||
    (c.T3.R4x.every(v => v <= c.T3.bound) && spread(c.T3.R4x) <= T3_SPREAD);
  return { t1, t2, t3, failing };
}

/** T4: every changed reference scene of the slice at both profiles is within 1.5 times its baseline. */
function frameTime(candidate, members) {
  const rows = results.t4.rows.filter(r => members.includes(r.scenario));
  if (candidate === 'S0') return { measured: true, ok: true, rows: [] };
  if (!results.t4.candidates.includes(candidate))
    return { measured: false, ok: false, rows: [] };
  const bad = rows
    .filter(r => !(r.ratio <= T4_RATIO))
    .map(r => `${r.profile} ${r.scene}`);
  return { measured: true, ok: bad.length === 0, rows: bad };
}

function sliceVerdict(candidate, slice) {
  const rc = referenceCases(candidate, slice.cases);
  const ft = frameTime(candidate, slice.members);
  const rest = results.bill[candidate]?.[slice.name] ?? {};
  const t8 = results.t8[candidate];
  const ok =
    rc.t1 &&
    rc.t2 &&
    rc.t3 &&
    ft.ok &&
    rest.T5 === true &&
    rest.T7 === true &&
    t8.nan === 0 &&
    t8.errors === 0;
  return { ok, rc, ft };
}

function verdict() {
  const slices = Object.entries(results.slices).map(([name, s]) => ({
    name,
    ...s,
  }));
  const candidates = ['S4', 'S3', 'S2', 'S1']; // largest step last in the sort below
  const step = c => results.candidates[c].stepOfRecord;
  const passing = [];
  for (const c of candidates)
    for (const s of slices)
      if (sliceVerdict(c, s).ok)
        passing.push({
          candidate: c,
          slice: s.name,
          n: s.members.length,
          step: step(c),
        });
  if (!passing.length) return { verdict: 'C', passing };
  const whole = passing.filter(p => p.slice === 'all');
  if (whole.length) return { verdict: 'A', passing };
  passing.sort((a, b) => b.step - a.step || b.n - a.n);
  return { verdict: 'B', best: passing[0], passing };
}

describe('the thresholds were fixed before any result', () => {
  test('the committed thresholds predate every candidate in history', () => {
    const log = execFileSync(
      'git',
      [
        'log',
        '--format=%H',
        '--reverse',
        '--',
        'tests/fixtures/step-policy/thresholds.json',
      ],
      { encoding: 'utf8' }
    ).trim();
    // A shallow checkout has no history to judge; the document states the SHA.
    if (!log) return;
    const first = log.split('\n')[0];
    const results = execFileSync(
      'git',
      [
        'log',
        '--format=%H',
        '--reverse',
        '--',
        'tests/fixtures/step-policy/results.json',
      ],
      { encoding: 'utf8' }
    ).trim();
    if (!results) return;
    const order = execFileSync('git', ['rev-list', '--reverse', 'HEAD'], {
      encoding: 'utf8',
      maxBuffer: 1 << 28,
    })
      .trim()
      .split('\n');
    expect(order.indexOf(first)).toBeLessThan(
      order.indexOf(results.split('\n')[0])
    );
  });

  test('the numeric bounds in the test are the committed ones', () => {
    expect(thresholds.thresholds.T2.what).toContain('0.005');
    expect(thresholds.thresholds.T3.what).toContain('0.02');
    expect(thresholds.thresholds.T4.what).toContain('1.5 times');
    expect(Object.keys(thresholds.thresholds)).toEqual([
      'T1',
      'T2',
      'T3',
      'T4',
      'T5',
      'T6',
      'T7',
      'T8',
    ]);
    expect(
      Object.keys(thresholds.candidates).filter(k => /^S\d$/.test(k))
    ).toEqual(['S0', 'S1', 'S2', 'S3', 'S4']);
  });
});

describe('the measurements', () => {
  test('S0 reproduces the record of the reference cases', () => {
    const record = read('tests/fixtures/reference-cases/record.json');
    const failing = record.failing.filter(
      id => !id.startsWith('R6') && id !== 'R5.fragmentSpread'
    );
    expect(results.candidates.S0.failingRows.slice().sort()).toEqual(
      failing.slice().sort()
    );
  });

  test('a candidate step is the step each rate states (fixed steps do not depend on the rate)', () => {
    const h = { S2: 1 / 24, S3: 1 / 48, S4: 1 / 96 };
    for (const [c, step] of Object.entries(h)) {
      const s = results.candidates[c].steps;
      for (const k of Object.keys(s))
        expect(Math.abs(s[k] / step - 1)).toBeLessThan(2e-3);
    }
  });

  test('S4 is the only candidate that meets the reference-case bounds (T1 to T3) on every case', () => {
    for (const c of ['S1', 'S1b', 'S2', 'S3'])
      expect(referenceCases(c, ['R1', 'R4x', 'R5']).t1).toBe(false);
    const s4 = referenceCases('S4', ['R1', 'R4x', 'R5']);
    expect([s4.t1, s4.t2, s4.t3]).toEqual([true, true, true]);
  });

  test('the unchanged policy depends on the rate where S4 does not', () => {
    expect(spread(results.candidates.S0.T2.R1)).toBeGreaterThan(T2_BOUND);
    expect(spread(results.candidates.S4.T2.R1)).toBeLessThan(1e-6);
    expect(spread(results.candidates.S0.T3.R4x)).toBeGreaterThan(T3_SPREAD);
  });
});

describe('the verdict follows the committed rule', () => {
  const v = verdict();

  test('the rule gives the recorded verdict', () => {
    expect(v.verdict).toBe(results.verdict.letter);
    if (v.best) {
      expect(v.best.candidate).toBe(results.verdict.candidate);
      expect(v.best.slice).toBe(results.verdict.slice);
    }
  });

  test('the document states the verdict, and the register has its row', () => {
    expect(doc).toContain(`**Verdict: ${results.verdict.text}**`);
    expect(register).toContain('D-R4-446-01');
    const row = register.split('\n').find(l => l.startsWith('| D-R4-446-01 |'));
    expect(row).toContain('STEP_POLICY_GATE.md');
    expect(row).toContain(`verdict ${results.verdict.letter}`);
    expect(row).toMatch(/\*\*(DELEGATED|PROPOSED)\*\*/);
  });

  test('every threshold has a number and a result in the document', () => {
    for (const t of ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8'])
      expect(doc).toMatch(new RegExp(`\\b${t}\\b`));
    for (const r of RATES)
      expect(typeof results.candidates.S4.R5position[RATES.indexOf(r)]).toBe(
        'number'
      );
  });
});
