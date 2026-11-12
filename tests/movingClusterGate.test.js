// =============================================================================
// The moving-cluster gate record (Roadmap III, Prompt 234 Part A)
// -----------------------------------------------------------------------------
// MOVING_CLUSTER_GATE.md and tests/fixtures/moving-cluster/ are a record, not a
// kernel: the prototype that produced results.json is on
// spike/moving-cluster-gate and is never merged. This holds that the record is
// consistent with itself and with the contract that was committed first:
//
//   - thresholds.json carries its three amendments, its seeds and 35 legs in
//     sets and groups, and results.json names the thresholds it was run against;
//   - every failing row of either form is in failed-legs.json, and nothing else;
//   - each form's verdict is the one the committed function gives from its rows;
//   - no per-star Gaia value, source id or distance below verdict A is committed;
//   - the document and the register state the counts the file holds.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const DIR = 'tests/fixtures/moving-cluster';
const read = f => JSON.parse(readFileSync(`${DIR}/${f}`, 'utf8'));
const thresholds = read('thresholds.json');
const results = read('results.json');
const failedFile = read('failed-legs.json');
const oracle = read('oracle-results.json');
const ensembles = read('ensembles.json');
const doc = readFileSync('MOVING_CLUSTER_GATE.md', 'utf8');
const register = readFileSync('DECISION_REGISTER.md', 'utf8');
const rowsOf = form => results.rows.filter(r => r.form === form);

describe('the committed contract', () => {
  test('has its three amendments, its seeds and 35 legs in sets and groups', () => {
    expect(thresholds.amendments.map(a => a.id)).toEqual(['AM1', 'AM2', 'AM3']);
    for (const a of thresholds.amendments)
      expect(a.binding).toMatch(/committed form's verdict binds/);
    expect(thresholds.seeds.synthetic).toEqual([
      234001, 234002, 234003, 234004,
    ]);
    expect(thresholds.checks.length).toBe(35);
    expect(new Set(thresholds.checks.map(c => c.id)).size).toBe(35);
    const sets = { S: 0, R: 0, none: 0 };
    for (const c of thresholds.checks) {
      sets[c.set ?? 'none']++;
      expect(['geo', 'dist']).toContain(c.group);
    }
    expect(sets).toEqual({ S: 21, R: 8, none: 6 });
  });

  test('keeps the data record: the committed checksum, no per-star rows, the licence', () => {
    expect(thresholds.data.sha256).toMatch(/^5e3c8ab9/);
    expect(thresholds.data.licence).toMatch(/CC BY-NC 3.0 IGO/);
    expect(thresholds.data.licence).toMatch(/no per-star row/);
    expect(thresholds.committed).toMatch(
      /No published Hyades value .* was fetched or typed from memory/
    );
  });

  test('the three NOT RUN legs have no set and name their fetch request', () => {
    for (const id of [
      'R7.published.cp',
      'R8.published.distance',
      'R9.isochrone',
    ]) {
      const c = thresholds.checks.find(x => x.id === id);
      expect(c.set).toBe(null);
      expect(c.what).toMatch(/NOT RUN/);
      for (const f of ['committed', 'amended'])
        expect(rowsOf(f).find(r => r.id === id).status).toBe('not-run');
    }
  });
});

describe('the gate stream', () => {
  test('was run against these thresholds on Node 22', () => {
    const sha = createHash('sha256')
      .update(readFileSync(`${DIR}/thresholds.json`))
      .digest('hex');
    expect(results.thresholdsSha256).toBe(sha);
    expect(failedFile.thresholdsSha256).toBe(sha);
    expect(ensembles.thresholdsSha256).toBe(sha);
    expect(oracle.synthetic.thresholdsSha256).toBe(sha);
    expect(results.node).toMatch(/^v22\./);
  });

  test('has 35 rows per form, with the counts the document states', () => {
    const want = {
      committed: { pass: 13, fail: 15, reported: 3, 'not-run': 4 },
      amended: { pass: 26, fail: 3, reported: 3, 'not-run': 3 },
    };
    for (const form of ['committed', 'amended']) {
      const rows = rowsOf(form);
      expect(rows.length).toBe(35);
      expect(new Set(rows.map(r => r.id)).size).toBe(35);
      for (const [s, n] of Object.entries(want[form]))
        expect([form, s, rows.filter(r => r.status === s).length]).toEqual([
          form,
          s,
          n,
        ]);
      const { rows: total, ...counts } = results.forms[form].counts;
      expect(total).toBe(35);
      expect(counts).toEqual(want[form]);
      expect(doc).toMatch(
        new RegExp(
          `${form} form 35 rows, ${want[form].pass} pass, ${want[form].fail} fail`
        )
      );
    }
  });

  test('every row is a committed leg, and a REPORTED row is one with no set', () => {
    const checks = Object.fromEntries(thresholds.checks.map(c => [c.id, c]));
    for (const r of results.rows) {
      expect([r.id, !!checks[r.id]]).toEqual([r.id, true]);
      if (r.status === 'reported') expect(checks[r.id].set).toBe(null);
    }
  });

  test('every failing row is in failed-legs.json, labelled, and nothing else is', () => {
    const failing = results.rows
      .filter(r => r.status === 'fail')
      .map(r => `${r.form}:${r.id}`);
    expect(failedFile.legs.map(l => `${l.form}:${l.id}`)).toEqual(failing);
    expect(failing.length).toBe(18);
    for (const l of failedFile.legs) expect(l.label).toMatch(/^FAILED/);
  });
});

describe('the verdicts', () => {
  test('are the committed function applied to each form', () => {
    for (const form of ['committed', 'amended']) {
      const status = id => rowsOf(form).find(r => r.id === id).status;
      const bad = grp =>
        thresholds.checks
          .filter(
            c =>
              (c.set === 'S' || c.set === 'R') &&
              c.group === grp &&
              status(c.id) !== 'pass'
          )
          .map(c => c.id);
      const verdict = bad('geo').length ? 'C' : bad('dist').length ? 'B' : 'A';
      expect(results.forms[form].verdict.verdict).toBe(verdict);
      expect(results.forms[form].verdict.geoFailing).toEqual(bad('geo'));
      expect(results.forms[form].verdict.distFailing).toEqual(bad('dist'));
    }
    expect(results.forms.committed.verdict.verdict).toBe('C');
    expect(results.forms.amended.verdict.verdict).toBe('B');
  });

  test('the amended form fails only the distance coverage and recovery legs', () => {
    expect(results.forms.amended.verdict.distFailing).toEqual([
      'C3.coverage68',
      'C4.coverage95',
      'C5.recovery',
    ]);
  });
});

describe('what is and is not published', () => {
  test('no source id, per-star list or real-sample distance is committed', () => {
    for (const f of ['results.json', 'failed-legs.json', 'ensembles.json']) {
      const text = readFileSync(`${DIR}/${f}`, 'utf8');
      expect(text).not.toMatch(/source_id|"perStar"|"piMC"/);
    }
    for (const form of Object.values(oracle.real.forms)) {
      expect(form.piMC).toBe(null);
      expect(form.sigmaMC).toBe(null);
      expect(
        form.perStarSha256 === null || /^[0-9a-f]{64}$/.test(form.perStarSha256)
      ).toBe(true);
    }
  });

  test('the real-sample record carries a ratio, a digest and no distance', () => {
    const real = results.forms.amended.real;
    expect(real.status).toBe('ok');
    expect(real.memberDigest).toMatch(/^[0-9a-f]{64}$/);
    expect(real.ratioMCoverPlx).toBeGreaterThan(0.9);
    expect(JSON.stringify(real)).not.toMatch(/"piMC"|distance/);
    expect(results.forms.committed.real.status).toBe('refused');
  });

  test('the oracle agreed with the production code on the members of every case', () => {
    const rows = id => results.rows.filter(r => r.id === id);
    for (const r of [
      ...rows('B1.oracle.members.synthetic'),
      ...rows('B4.oracle.members.real'),
    ])
      expect(r.status).toBe('pass');
    expect(oracle.versions.numpy).toBeTruthy();
    expect(oracle.script.sha256).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe('the document and the register', () => {
  test('state both verdicts and the questions', () => {
    expect(doc).toMatch(/Verdict by the committed function: C/);
    expect(doc).toMatch(/amended form[^.]*gives B/);
    expect(doc).toMatch(/## Questions for Carl/);
    expect(doc).toMatch(/## What to fetch/);
  });

  test('the register has the five rows, each DELEGATED or RATIFIED, with a source and sha', () => {
    for (const id of ['01', '02', '03', '04', '90']) {
      const line = register
        .split('\n')
        .find(l => l.startsWith(`| D-R10-234-${id} `));
      expect(line).toBeTruthy();
      expect(line).toMatch(/\*\*(DELEGATED|RATIFIED)\*\*/);
      expect(line).toMatch(/\(([0-9a-f]{8})\)/);
    }
  });
});
