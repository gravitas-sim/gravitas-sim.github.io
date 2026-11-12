// =============================================================================
// The supernova likelihood gate record (Roadmap III, Prompt 256 Part A)
// -----------------------------------------------------------------------------
// SN_LIKELIHOOD_GATE.md and tests/fixtures/supernova-likelihood/ are a record,
// not a kernel: the prototype that produced results.json is on
// spike/supernova-likelihood-gate and is never merged. This holds that the
// record is consistent with itself and with the contract committed first:
//
//   - thresholds.json carries its three amendments and its 40 legs, each with a
//     treatment, and results.json names the thresholds it was run against;
//   - every row is a committed leg (a leg with two treatments gives two rows);
//   - the verdict is the one the committed function gives from the rows;
//   - failed-legs.json holds every failing row and nothing else;
//   - the legs that need a file nobody supplied are NOT RUN, with a request;
//   - the data are the pack's: no per-star value is committed, and the oracle
//     read the raw file whose checksum the pack records;
//   - the document and the register state the counts the files hold.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const DIR = 'tests/fixtures/supernova-likelihood';
const read = f => JSON.parse(readFileSync(`${DIR}/${f}`, 'utf8'));
const thresholds = read('thresholds.json');
const results = read('results.json');
const failedFile = read('failed-legs.json');
const oracle = read('oracle-results.json');
const pack = JSON.parse(
  readFileSync('data-packs/pantheon-plus-hd.json', 'utf8')
);
const doc = readFileSync('SN_LIKELIHOOD_GATE.md', 'utf8');
const register = readFileSync('DECISION_REGISTER.md', 'utf8');
const sha = readFileSync(`${DIR}/thresholds.json`);
const thresholdsSha = createHash('sha256').update(sha).digest('hex');

describe('the committed contract', () => {
  test('has its three amendments, each moving no bound', () => {
    expect(thresholds.amendments.map(a => a.id)).toEqual(['AM1', 'AM2', 'AM3']);
    for (const a of thresholds.amendments) {
      expect(a.moves).toMatch(/no bound/);
      expect(a.recorded).toMatch(/before|after/);
    }
  });

  test('has 40 legs, unique, each with a set and a treatment', () => {
    const ids = thresholds.checks.map(c => c.id);
    expect(ids.length).toBe(40);
    expect(new Set(ids).size).toBe(40);
    const tally = {};
    for (const c of thresholds.checks) {
      expect(['S', 'M', null]).toContain(c.set);
      expect(['both', 'diag', 'cov', 'none']).toContain(c.treat);
      expect(c.set === null).toBe(c.treat === 'none');
      const key = `${c.set}:${c.treat}`;
      tally[key] = (tally[key] ?? 0) + 1;
    }
    expect(tally).toEqual({
      'M:diag': 3,
      'S:diag': 4,
      'S:both': 12,
      'M:cov': 5,
      'S:cov': 2,
      'M:both': 6,
      'null:none': 8,
    });
  });

  test('decides T3 in the split form, with the stated size and no shipped matrix', () => {
    expect(thresholds.decision.decided).toMatch(/T3, split form/);
    expect(thresholds.decision.decided).toMatch(/tau = 0.02 mag/);
    expect(thresholds.decision.decided).toMatch(/not a published systematic/);
    expect(thresholds.decision.options.T1).toMatch(/NOT RUN/);
    expect(thresholds.decision.options.T2).toMatch(/NOT RUN/);
    expect(thresholds.size.rule).toMatch(/adds no byte of data/);
  });

  test('records that nothing was fetched or typed, and names the four requests', () => {
    expect(thresholds.committed).toMatch(/Nothing was fetched/);
    expect(thresholds.committed).toMatch(/typed from memory/);
    expect(Object.keys(thresholds.externalRequests)).toEqual([
      'X1',
      'X2',
      'X3',
      'X4',
    ]);
  });

  test('keeps the consumers rule and declines Part B', () => {
    expect(thresholds.scope.consumersRule).toMatch(/authorizes no panel/);
    expect(thresholds.scope.notBuilt).toMatch(/not begun/);
  });
});

describe('the gate stream', () => {
  test('was run against these thresholds on Node 22, from the spike commit', () => {
    expect(results.thresholdsSha256).toBe(thresholdsSha);
    expect(results.oracleThresholdsSha256).toBe(thresholdsSha);
    expect(failedFile.thresholdsSha256).toBe(thresholdsSha);
    expect(oracle.thresholdsSha256).toBe(thresholdsSha);
    expect(results.node).toMatch(/^v22\./);
    expect(results.spikeCommit).toMatch(/^[0-9a-f]{8}$/);
    expect(results.oracleFileSha256).toBe(oracle.fullFileSha256);
  });

  test('has 58 rows, each a committed leg, a two-treatment leg giving two rows', () => {
    const checks = Object.fromEntries(thresholds.checks.map(c => [c.id, c]));
    expect(results.rows.length).toBe(58);
    expect(new Set(results.rows.map(r => r.id)).size).toBe(58);
    let expected = 0;
    for (const c of thresholds.checks) expected += c.treat === 'both' ? 2 : 1;
    expect(expected).toBe(58);
    for (const r of results.rows) {
      const c = checks[r.base];
      expect([r.id, !!c]).toEqual([r.id, true]);
      expect(r.set).toBe(c.set);
      if (c.treat === 'both') expect(['diag', 'cov']).toContain(r.group);
      else if (c.treat === 'none') expect(r.group).toBe(null);
      else expect(r.group).toBe(c.treat);
      expect(r.id).toBe(r.group ? `${r.base}.${r.group}` : r.base);
    }
  });

  test('has the counts the document states', () => {
    const counts = {};
    for (const r of results.rows)
      counts[r.status] = (counts[r.status] ?? 0) + 1;
    expect(counts).toEqual({ pass: 50, reported: 5, 'not-run': 3 });
    expect(results.counts).toEqual({
      rows: 58,
      pass: 50,
      reported: 5,
      'not-run': 3,
    });
    expect(doc).toMatch(
      /58 rows: \*\*50 pass, 0 fail, 5 reported, 3 not run\*\*/
    );
    const grouped = { diag: 0, cov: 0 };
    for (const r of results.rows) if (r.set) grouped[r.group]++;
    expect(grouped).toEqual({ diag: 25, cov: 25 });
  });

  test('the reported rows have no set, and the NOT RUN rows carry a request', () => {
    for (const r of results.rows)
      if (r.status === 'reported') expect(r.set).toBe(null);
    const notRun = results.rows.filter(r => r.status === 'not-run');
    expect(notRun.map(r => r.id)).toEqual([
      'B10.cited',
      'E3.published',
      'X3.fullCovariance',
    ]);
    for (const r of notRun) {
      expect(r.set).toBe(null);
      expect(r.measured.request).toMatch(/NOT RUN/);
    }
  });

  test('the verdict is the committed function applied to the rows: A', () => {
    const withSet = results.rows.filter(r => r.set);
    const diagFail = withSet.filter(
      r => r.group === 'diag' && r.status === 'fail'
    );
    const covFail = withSet.filter(
      r => r.group === 'cov' && r.status === 'fail'
    );
    const verdict = diagFail.length ? 'C' : covFail.length ? 'B' : 'A';
    expect(verdict).toBe(results.verdict);
    expect(results.verdict).toBe('A');
    expect(doc).toMatch(/Verdict by the committed function: A/);
  });

  test('every failing row is in failed-legs.json and nothing else is (none failed)', () => {
    const failing = results.rows
      .filter(r => r.status === 'fail')
      .map(r => r.id);
    expect(failedFile.legs.map(l => l.id)).toEqual(failing);
    expect(failing).toEqual([]);
  });

  test('the passes sit inside their committed bounds on the headline legs', () => {
    const row = id => results.rows.find(r => r.id === id).measured;
    expect(row('B2.nodes.diag').chiMax).toBeLessThan(1e-6);
    expect(row('B2.nodes.cov').chiMax).toBeLessThan(1e-6);
    expect(row('B2.nodes.cov').nodes).toBe(5329);
    expect(row('A10.condition.cov').oracle.cond).toBeLessThan(1e6);
    expect(row('A12.factor.cov').factorCpuSeconds).toBeLessThan(30);
    for (const t of ['diag', 'cov']) {
      const c = row(`C1.coverL1.${t}`);
      expect(c.coverage68).toBeGreaterThanOrEqual(0.58);
      expect(c.coverage68).toBeLessThanOrEqual(0.78);
      expect(c.coverage95).toBeGreaterThanOrEqual(0.9);
      expect(c.coverage95).toBeLessThanOrEqual(0.99);
    }
  });
});

describe('the data', () => {
  test('are the pack, whose raw checksum the oracle read; no per-star value is committed', () => {
    expect(oracle.data.rawSha256).toBe(pack.raw[0].sha256);
    expect(oracle.data.N).toBe(results.N);
    expect(oracle.sample.n).toBe(results.N);
    expect(oracle.sample.sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(oracle.sample.z).toBeUndefined();
    expect(oracle.sample.cid).toBeUndefined();
    expect(JSON.stringify(oracle)).not.toMatch(/\/Users\//);
  });

  test('the synthetic sets are labelled with their truths', () => {
    for (const name of ['SYN300a', 'SYN300b', 'SYN300c', 'SYN12'])
      expect(oracle.synthetic[name].truth.length).toBe(3);
    expect(oracle.synthetic.SYN12.rows.length).toBe(12);
    expect(oracle.synthetic.SYN300a.rows.length).toBe(300);
  });
});

describe('the document and the register', () => {
  test('state the decision, the consumers rule, Part B declined, the requests and the questions', () => {
    expect(doc).toMatch(/## 8\. Questions for Carl/);
    expect(doc).toMatch(/## 7\. Files requested from Carl/);
    expect(doc).toMatch(/consumers rule/);
    expect(doc).toMatch(/Part B is not\s+begun and is declined/);
    expect(doc).toMatch(/spike\/supernova-likelihood-gate/);
    expect(doc).toMatch(/Nothing was fetched and\s+no published number/);
  });

  test('the register has the five rows, each DELEGATED or RATIFIED, with a source and sha', () => {
    for (const id of ['01', '02', '03', '04', '05']) {
      const line = register
        .split('\n')
        .find(l => l.startsWith(`| D-R10-256-${id} `));
      expect(line).toBeTruthy();
      expect(line).toMatch(/\*\*(DELEGATED|RATIFIED)\*\*/);
      expect(line).toMatch(/\(([0-9a-f]{8})\)/);
    }
  });
});
