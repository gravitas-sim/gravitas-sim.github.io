// =============================================================================
// What a rubric criterion claims, and the marks that follow from it (Prompt 172)
// -----------------------------------------------------------------------------
// A criterion has a kind (completion, correctness, reasoning, uncertainty), a
// depth it is marked from and a weight. The marks file carries a row per
// criterion when a step has any; the file is /2 then and /1 otherwise, and a
// 2.0.0 reader refuses /2 by name instead of reading criterion rows as the
// answer's own mark.
//
// Everything here is fixed before it is run: the arithmetic of the rubric
// fraction is written out in the cases below, not derived from the code.
// =============================================================================

import { describe, expect, test, beforeAll, afterAll } from '@jest/globals';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import process from 'node:process';

import { fromCsv, toCsv } from '../js/csv.js';
import {
  CRITERION_KINDS,
  DEFAULT_CRITERION_KIND,
  MARK_COLUMNS,
  MARK_COLUMNS_RUBRIC,
  MARKS_SCHEMA,
  MARKS_SCHEMA_RUBRIC,
  criteriaPlan,
  criterionKey,
  marksCsv,
  marksIndex,
  markKey,
  readMarksCsv,
  rubricFraction,
  setCriterionMark,
  setMark,
} from '../js/gradebook/marks.js';
import { CRITERION_KINDS as PACK_KINDS } from '../js/platform/questionBank.js';
import { WRITTEN_SID, pile } from './gradebookFixtures.js';
import { archiveOld } from './compat/harness.js';

const level = (label, points) => ({ label, text: `${label} text`, points });
const STEP = {
  sid: WRITTEN_SID,
  rubricCriteria: [
    // 1: no semantics written: reasoning, weight 1, every depth, 2 possible
    { name: 'Gives a reason', levels: [level('Full', 2), level('Not yet', 0)] },
    // 2: correctness, weight 3, 4 possible
    {
      name: 'Gets the number',
      kind: 'correctness',
      weight: 3,
      levels: [level('Full', 4), level('Part', 2), level('No', 0)],
    },
    // 3: from quantitative depth, levels carry no points: 1 possible
    {
      name: 'Says how well it is known',
      kind: 'uncertainty',
      depth: 'quantitative',
      levels: [
        { label: 'Yes', text: 'Gives a range.' },
        { label: 'No', text: 'Gives none.' },
      ],
    },
  ],
};

describe('criteriaPlan', () => {
  test('fills in what the author left out', () => {
    expect(criteriaPlan(STEP)).toEqual([
      {
        n: 1,
        name: 'Gives a reason',
        kind: 'reasoning',
        weight: 1,
        depth: null,
        possible: 2,
      },
      {
        n: 2,
        name: 'Gets the number',
        kind: 'correctness',
        weight: 3,
        depth: null,
        possible: 4,
      },
      {
        n: 3,
        name: 'Says how well it is known',
        kind: 'uncertainty',
        weight: 1,
        depth: 'quantitative',
        possible: 1,
      },
    ]);
    expect(DEFAULT_CRITERION_KIND).toBe('reasoning');
  });

  test('a criterion with a depth is marked from that depth deeper, and keeps its place', () => {
    expect(criteriaPlan(STEP, 'core').map(c => c.n)).toEqual([1, 2]);
    expect(criteriaPlan(STEP, 'quantitative').map(c => c.n)).toEqual([1, 2, 3]);
    expect(criteriaPlan(STEP, 'advanced').map(c => c.n)).toEqual([1, 2, 3]);
  });

  test('a step with no criteria, and bad values, give defaults and no error', () => {
    expect(criteriaPlan({})).toEqual([]);
    expect(criteriaPlan(undefined)).toEqual([]);
    const [c] = criteriaPlan({
      rubricCriteria: [
        { name: 'x', kind: 'neatness', weight: -2, depth: 'expert' },
      ],
    });
    expect(c).toMatchObject({
      kind: 'reasoning',
      weight: 1,
      depth: null,
      possible: 1,
    });
  });

  test('the four kinds are the pack format’s four', () => {
    expect([...CRITERION_KINDS]).toEqual([...PACK_KINDS]);
    expect(CRITERION_KINDS).toEqual([
      'completion',
      'correctness',
      'reasoning',
      'uncertainty',
    ]);
  });
});

describe('rubricFraction', () => {
  const plan = criteriaPlan(STEP, 'core');
  const put = (m, n, points) =>
    setCriterionMark(m, 'fp', WRITTEN_SID, n, { points }, 100);

  test('is the weighted mean of mark over possible, written out', () => {
    const m = marksIndex();
    put(m, 1, 1); // 1 of 2 = 0.5, weight 1
    put(m, 2, 3); // 3 of 4 = 0.75, weight 3
    // (1 x 0.5 + 3 x 0.75) / (1 + 3) = 2.75 / 4 = 0.6875
    const r = rubricFraction(m, 'fp', WRITTEN_SID, plan);
    expect(r.fraction).toBeCloseTo(0.6875, 12);
    expect(r).toMatchObject({ marked: 2, of: 2 });
    expect(r.byKind.reasoning).toBeCloseTo(0.5, 12);
    expect(r.byKind.correctness).toBeCloseTo(0.75, 12);
  });

  test('is null while any criterion is unmarked, and says how many are', () => {
    const m = marksIndex();
    put(m, 1, 2);
    const r = rubricFraction(m, 'fp', WRITTEN_SID, plan);
    expect(r.fraction).toBeNull();
    expect(r).toMatchObject({ marked: 1, of: 2 });
    expect(r.byKind).toEqual({ reasoning: 1, correctness: null });
  });

  test('a mark above the criterion’s points counts as full, a step with no criteria is null', () => {
    const m = marksIndex();
    for (const n of [1, 2])
      m.set(criterionKey('fp', WRITTEN_SID, n), {
        points: 99,
        comment: '',
      });
    expect(rubricFraction(m, 'fp', WRITTEN_SID, plan).fraction).toBe(1);
    expect(rubricFraction(m, 'fp', WRITTEN_SID, []).fraction).toBeNull();
  });

  test('criterion marks are not the answer’s own mark', () => {
    const m = marksIndex();
    put(m, 1, 2);
    expect(m.get(markKey('fp', WRITTEN_SID))).toBeUndefined();
    expect(criterionKey('fp', WRITTEN_SID, 1)).not.toBe(
      markKey('fp', WRITTEN_SID)
    );
  });
});

describe('the marks file with criteria', () => {
  const records = pile();
  const criteriaOf = (r, q) =>
    q.sid === WRITTEN_SID
      ? criteriaPlan(STEP, 'quantitative').map(c => ({ ...c }))
      : [];

  test('a file with no criteria rows is the /1 file, column for column', () => {
    const text = marksCsv(records, marksIndex(), { criteriaOf: () => [] });
    expect(text).toBe(marksCsv(records, marksIndex()));
    const rows = fromCsv(text);
    expect(rows[0]).toEqual([...MARK_COLUMNS]);
    expect(rows.slice(1).every(r => r[0] === MARKS_SCHEMA)).toBe(true);
  });

  test('a file with criteria is /2, every row says so, and the kind is in the row', () => {
    const rows = fromCsv(marksCsv(records, marksIndex(), { criteriaOf }));
    expect(rows[0]).toEqual([...MARK_COLUMNS_RUBRIC]);
    const at = Object.fromEntries(rows[0].map((c, i) => [c, i]));
    expect(rows.slice(1).every(r => r[at.schema] === MARKS_SCHEMA_RUBRIC)).toBe(
      true
    );
    const criterion = rows.slice(1).filter(r => r[at.criterion]);
    // Two reports with a written answer, three criteria each at this depth.
    expect(criterion).toHaveLength(6);
    expect(
      criterion
        .slice(0, 3)
        .map(r => [
          r[at.criterion],
          r[at.criterion_kind],
          r[at.criterion_weight],
          r[at.points_possible],
        ])
    ).toEqual([
      ['c1', 'reasoning', '1', '2'],
      ['c2', 'correctness', '3', '4'],
      ['c3', 'uncertainty', '1', '1'],
    ]);
    // The row before the first criterion is the answer's own.
    const own = rows.findIndex((r, i) => i && r[at.criterion]) - 1;
    expect(rows[own][at.criterion]).toBe('');
    expect(rows[own][at.step_id]).toBe(WRITTEN_SID);
  });

  test('marks and comments round-trip, per criterion and for the answer', () => {
    const m = marksIndex();
    const fp = records.find(r =>
      r.questions.some(q => q.sid === WRITTEN_SID)
    ).fingerprint;
    setMark(m, fp, WRITTEN_SID, { points: 1, comment: 'Names the speed-up.' });
    setCriterionMark(
      m,
      fp,
      WRITTEN_SID,
      2,
      { points: 3, comment: 'Close.' },
      4
    );
    setCriterionMark(m, fp, WRITTEN_SID, 3, { points: 1, comment: '' }, 1);
    const back = readMarksCsv(marksCsv(records, m, { criteriaOf }));
    expect(back).toMatchObject({ ok: true, skipped: 0 });
    expect(back.marks.get(markKey(fp, WRITTEN_SID))).toEqual({
      points: 1,
      comment: 'Names the speed-up.',
    });
    expect(back.marks.get(criterionKey(fp, WRITTEN_SID, 2))).toEqual({
      points: 3,
      comment: 'Close.',
    });
    expect(back.marks.get(criterionKey(fp, WRITTEN_SID, 3)).points).toBe(1);
    expect(back.marks.has(criterionKey(fp, WRITTEN_SID, 1))).toBe(false);
  });

  test('a criterion mark above its points possible is skipped, as an answer’s is', () => {
    const rows = fromCsv(marksCsv(records, marksIndex(), { criteriaOf }));
    const at = Object.fromEntries(rows[0].map((c, i) => [c, i]));
    rows.find(r => r[at.criterion] === 'c2')[at.mark] = '9';
    const bad = toCsv(rows);
    const back = readMarksCsv(bad);
    expect(back.skipped).toBe(1);
    expect(back.marks.size).toBe(0);
  });

  test('a /1 file written before this change still reads', () => {
    const m = marksIndex();
    const fp = records[0].fingerprint;
    setMark(m, fp, WRITTEN_SID, { points: 0.5, comment: 'ok' });
    const old = marksCsv(records, m);
    expect(old.split('\r\n')[1]).toContain(MARKS_SCHEMA);
    expect(readMarksCsv(old).marks.get(markKey(fp, WRITTEN_SID)).points).toBe(
      0.5
    );
  });
});

describe('the 2.0.0 marks reader and a /2 file', () => {
  let old;
  beforeAll(() => {
    old = archiveOld();
  });
  afterAll(() => old?.cleanup());

  /** Run the 2.0.0 reader on `text` in its own process: its JSON result. */
  const oldReads = text =>
    JSON.parse(
      execFileSync(
        process.execPath,
        [
          '--input-type=module',
          '-e',
          `import { readMarksCsv } from ${JSON.stringify(
            pathToFileURL(path.join(old.tree, 'js/gradebook/marks.js')).href
          )};
           let s = ''; for await (const c of process.stdin) s += c;
           const r = readMarksCsv(s);
           console.log(JSON.stringify({ ok: r.ok, reason: r.reason, read: r.read, size: r.marks.size }));`,
        ],
        { input: text, encoding: 'utf8' }
      )
    );

  test('refuses it by name and reads nothing', () => {
    const records = pile();
    const m = marksIndex();
    setMark(m, records[0].fingerprint, WRITTEN_SID, { points: 1, comment: '' });
    const text = marksCsv(records, m, {
      criteriaOf: (r, q) => (q.sid === WRITTEN_SID ? criteriaPlan(STEP) : []),
    });
    expect(oldReads(text)).toEqual({
      ok: false,
      reason: 'wrongSchema',
      read: 0,
      size: 0,
    });
  });

  test('reads a /1 file the new writer wrote when no step has criteria', () => {
    const records = pile();
    const m = marksIndex();
    setMark(m, records[0].fingerprint, WRITTEN_SID, { points: 1, comment: '' });
    const got = oldReads(marksCsv(records, m));
    expect(got).toMatchObject({ ok: true, size: 1 });
  });
});
