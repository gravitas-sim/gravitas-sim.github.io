/**
 * @jest-environment jsdom
 */
// =============================================================================
// The local class summary (Prompt 173), on the fixtures' own submissions
// -----------------------------------------------------------------------------
// The summary is a function of the graded records the review page holds, so
// these tests hand it the reports the gradebook tests grade (Kepler's Laws,
// built the way a student's browser stores them) and, for the criteria and the
// measured quantity, a written answer of Orbital Energy and evidence tables
// written row by row. Every figure is worked out in the case, not read back
// from the code.
//
// What they fix:
//   - counts: a duplicate is left out, a repeated attempt counts;
//   - per step: answered, right of those Gravitas can check, and the marks the
//     instructor entered (blank when nobody has marked);
//   - the criteria by kind, from the marks of Prompt 172;
//   - wrong answers by how often they were given, with the misconception the
//     author named and nothing else;
//   - the time a report records, and a report that records no time is left out
//     of it and counted;
//   - a measured quantity: its points ordered by value, an interval kept as an
//     interval, a limit left out of the plot and counted, a table that does not
//     match its digest left out of the distribution altogether;
//   - no name, roster id or file name in the summary, its markup or its CSV;
//   - the plot is the table's numbers, and every word exists in both languages.
// =============================================================================

import { describe, expect, test, beforeAll, afterAll } from '@jest/globals';

/* global document, URL -- jsdom's and node's, installed by the environment */
import { JSDOM } from 'jsdom';
import { readFileSync } from 'node:fs';
import { webcrypto } from 'node:crypto';

import {
  classSummary,
  classSummaryCsv,
  elapsedMinutes,
  quantile,
  SUMMARY_COLUMNS,
  SUMMARY_SCHEMA,
  TIME_BANDS,
} from '../js/instructorSummary.js';
import { drawMeasured, summaryHtml } from '../js/instructorSummaryView.js';
import { annotate, gradeSubmission } from '../js/submission/results.js';
import { checkEvidence, ledgerDigest } from '../js/submission/ledgerDigest.js';
import { buildSubmission } from '../js/submission/submissionToken.js';
import { buildBackup } from '../js/investigations/progressBackup.js';
import { stepKey } from '../js/investigations/progressSchema.js';
import {
  marksIndex,
  setCriterionMark,
  setMark,
} from '../js/gradebook/marks.js';
import { fromCsv } from '../js/csv.js';
import { EN_CLASSSUMMARY } from '../js/i18n/en.classSummary.js';
import { ES_CLASSSUMMARY } from '../js/i18n/es.classSummary.js';
import { EN_SUBMISSIONS } from '../js/i18n/en.submissions.js';
import { ES_SUBMISSIONS } from '../js/i18n/es.submissions.js';
import {
  WRITTEN_SID,
  kepler,
  pile,
  recordsOf,
  submission,
} from './gradebookFixtures.js';

if (!globalThis.crypto?.subtle)
  Object.defineProperty(globalThis, 'crypto', {
    value: webcrypto,
    configurable: true,
  });

const keplerStep = (r, sid) => kepler.steps.find(s => s.sid === sid) ?? null;
const keplerSummary = (records, options = {}) =>
  classSummary(records, { stepOf: keplerStep, ...options });
const step = (summary, sid) =>
  summary.lessons[0].steps.find(s => s.sid === sid);

// The words a page would have: the real catalogs, English or Spanish.
const wordsOf = (lang = 'en') => {
  const catalog =
    lang === 'en'
      ? { ...EN_SUBMISSIONS, ...EN_CLASSSUMMARY }
      : { ...ES_SUBMISSIONS, ...ES_CLASSSUMMARY };
  return {
    t: (id, vars) =>
      (catalog[id] ?? `?${id}`).replace(/\{(\w+)\}/g, (w, k) =>
        Object.hasOwn(vars ?? {}, k) ? String(vars[k]) : w
      ),
    number: v => String(v),
    date: '2026-10-21',
    uncertainty: row => `±${row.half ?? ''}`,
    origin: id => id,
  };
};

describe('the counts', () => {
  const summary = keplerSummary(pile());

  test('six reports, two of them attempts by one student, none a duplicate', () => {
    expect(summary).toMatchObject({ reports: 6, duplicates: 0, repeated: 2 });
    expect(summary.lessons).toHaveLength(1);
    expect(summary.lessons[0]).toMatchObject({
      id: 'keplers-laws',
      reports: 6,
    });
  });

  test('an exact duplicate is left out and said so', () => {
    const sub = submission({ name: 'Ada', roster: 'S-1' });
    const twice = recordsOf([
      sub,
      sub,
      submission({ name: 'Ben', roster: 'S-2' }),
    ]);
    const s = keplerSummary(twice);
    expect(s).toMatchObject({ reports: 2, duplicates: 1 });
  });

  test('a step: who answered, and how many of the checked answers are right', () => {
    // where-is-the-star: Ada 1 (right), Ben 0 (wrong), Cleo's two reports
    // none, Cleo's second 1, Dev 1, Ada's wk4 none. Right is option 1.
    expect(step(summary, 'where-is-the-star')).toMatchObject({
      of: 6,
      answered: 4,
      correct: 3,
      incorrect: 1,
      incomplete: 2,
    });
    // use-the-law answers are 8, 8, 5, 8, 8, 8: five right, one wrong.
    expect(step(summary, 'use-the-law')).toMatchObject({
      answered: 6,
      correct: 5,
      incorrect: 1,
    });
  });

  test('the steps are in the order of the lesson', () => {
    const numbers = summary.lessons[0].steps.map(s => s.number);
    expect(numbers).toEqual([...numbers].sort((a, b) => a - b));
  });

  test('how far they got is the share of steps visited, the same for all six here', () => {
    // Six of the first twenty-three steps were visited in every fixture.
    const { median, min, max } = summary.lessons[0].reading;
    expect(median).toBeCloseTo(6 / kepler.steps.length, 12);
    expect(min).toBe(max);
  });
});

describe('the wrong answers', () => {
  test('counted by what was given, the choice in words, most frequent first', () => {
    const records = recordsOf([
      submission({ name: 'a', responses: { 'where-is-the-star': '0' } }),
      submission({ name: 'b', responses: { 'where-is-the-star': '0' } }),
      submission({ name: 'c', responses: { 'where-is-the-star': '2' } }),
      submission({ name: 'd', responses: { 'where-is-the-star': '1' } }),
    ]);
    const rows = keplerSummary(records).lessons[0].wrong.filter(
      w => w.sid === 'where-is-the-star'
    );
    expect(rows.map(w => w.count)).toEqual([2, 1]);
    expect(rows[0]).toMatchObject({ kind: 'choice', value: 0, wrongAtStep: 3 });
    expect(rows[0].share).toBeCloseTo(2 / 3, 12);
    expect(rows[0].text).toMatch(/^A: /);
  });

  test('a number the author named a misconception for says so, in plain text', () => {
    // use-the-law's right answer is 8; 64 is its cubed-not-rooted slip.
    const records = recordsOf([
      submission({ name: 'a', responses: { 'use-the-law': '64' } }),
      submission({ name: 'b', responses: { 'use-the-law': '64.0' } }),
      submission({ name: 'c', responses: { 'use-the-law': '5' } }),
    ]);
    const rows = keplerSummary(records).lessons[0].wrong.filter(
      w => w.sid === 'use-the-law'
    );
    expect(rows[0]).toMatchObject({ kind: 'number', value: 64, count: 2 });
    expect(rows[0].misconception).toMatch(/^That is a³\. The law says P² = a³/);
    expect(rows[0].misconception).not.toMatch(/<|\n/);
    // a wrong number nobody named is not explained
    expect(rows[1]).toMatchObject({ value: 5, count: 1, misconception: null });
  });

  test('a number that cannot be read is its own kind of answer', () => {
    const records = recordsOf([
      submission({ name: 'a', responses: { 'use-the-law': 'eight' } }),
      submission({ name: 'b', responses: { 'use-the-law': 'nine' } }),
    ]);
    const rows = keplerSummary(records).lessons[0].wrong.filter(
      w => w.sid === 'use-the-law'
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ kind: 'unreadable', count: 2 });
  });

  test('no more than three are kept for a step, and written answers are never listed', () => {
    const records = recordsOf(
      ['1', '2', '3', '4', '5', '6'].map(v =>
        submission({ name: v, responses: { 'use-the-law': v } })
      )
    );
    const wrong = keplerSummary(records).lessons[0].wrong.filter(
      w => w.sid === 'use-the-law'
    );
    expect(wrong).toHaveLength(3);
    const written = recordsOf([
      submission({ name: 'a', responses: { [WRITTEN_SID]: 'secret prose' } }),
    ]);
    const s = keplerSummary(written);
    expect(JSON.stringify(s)).not.toContain('secret prose');
    expect(classSummaryCsv(s)).not.toContain('secret prose');
  });
});

describe('time', () => {
  test('quantile is the spreadsheet one', () => {
    expect(quantile([], 0.5)).toBeNull();
    expect(quantile([4, 1, 3, 2], 0.5)).toBe(2.5);
    expect(quantile([1, 2, 3, 4, 5], 0.25)).toBe(2);
  });

  test('elapsed minutes: first opening to last save, and nothing when a time is missing or backwards', () => {
    expect(
      elapsedMinutes({
        startedAt: '2026-09-01T10:00:00.000Z',
        savedAt: '2026-09-01T10:42:30.000Z',
      })
    ).toBe(42.5);
    expect(
      elapsedMinutes({ startedAt: null, savedAt: '2026-09-01T10:00Z' })
    ).toBeNull();
    expect(
      elapsedMinutes({
        startedAt: '2026-09-02T10:00:00Z',
        savedAt: '2026-09-01T10:00:00Z',
      })
    ).toBeNull();
  });

  test('the bands are the reports', () => {
    const at = (savedAt, name) => submission({ name, savedAt, roster: name });
    const records = recordsOf([
      at('2026-09-01T10:10:00.000Z', 'a'), // 10 min
      at('2026-09-01T10:40:00.000Z', 'b'), // 40 min
      at('2026-09-01T10:50:00.000Z', 'c'), // 50 min
      at('2026-09-01T12:00:00.000Z', 'd'), // 2 h
      at('2026-09-03T10:00:00.000Z', 'e'), // 2 days
    ]);
    const { time } = keplerSummary(records).lessons[0];
    expect(time).toMatchObject({ n: 5, missing: 0, median: 50, min: 10 });
    expect(time.bands.map(b => b.count)).toEqual([1, 0, 2, 1, 0, 1]);
    expect(time.bands).toHaveLength(TIME_BANDS.length);
    expect(time.max).toBe(2880);
  });

  test('a report with no recorded start is left out of the time and counted', () => {
    const records = recordsOf([
      submission({ name: 'a', savedAt: '2026-09-01T10:30:00.000Z' }),
    ]);
    const [r] = records;
    const none = classSummary([{ ...r, startedAt: null }], {});
    expect(none.lessons[0].time).toMatchObject({
      n: 0,
      missing: 1,
      median: null,
    });
  });
});

describe('written answers, marks and criteria', () => {
  let orbital;
  beforeAll(async () => {
    orbital = await import('../js/data/investigations/orbital-energy.js').then(
      m => m.default || Object.values(m)[0]
    );
  });

  const report = (name, text) => {
    const backup = buildBackup({
      lesson: orbital,
      responses: {
        [stepKey(orbital.id, 'will-it-be-back')]: text,
      },
      attempts: {},
      visited: orbital.steps.slice(0, 5).map(s => s.sid),
      stepSid: orbital.steps[4].sid,
      startedAt: '2026-09-01T10:00:00.000Z',
      studentName: name,
    });
    backup.savedAt = '2026-09-01T11:00:00.000Z';
    return buildSubmission({ backup, rosterId: name });
  };
  const stepOf = (r, sid) => orbital.steps.find(s => s.sid === sid) ?? null;

  test('criteria by kind, as marked; a rubric is whole only when every criterion is marked', () => {
    const records = annotate(
      ['a', 'b', 'c'].map(n =>
        gradeSubmission(report(n, `answer ${n}`), orbital, {
          kind: 'token',
          label: n,
        })
      )
    );
    const marks = marksIndex();
    // a: correctness 2 of 2, reasoning 1 of 1. b: correctness 1 of 2 only.
    // c: nothing. Mark of the whole answer: a 3, b 1.
    const set = (rec, n, points, possible) =>
      setCriterionMark(
        marks,
        rec.fingerprint,
        'will-it-be-back',
        n,
        { points },
        possible
      );
    set(records[0], 1, 2, 2);
    set(records[0], 2, 1, 1);
    set(records[1], 1, 1, 2);
    setMark(marks, records[0].fingerprint, 'will-it-be-back', { points: 1 }, 1);
    const s = classSummary(records, { stepOf, marks });
    const row = s.lessons[0].steps.find(x => x.sid === 'will-it-be-back');
    expect(row).toMatchObject({
      written: 3,
      writtenMarked: 1,
      meanMark: 1,
      rubricOf: 3,
      rubricComplete: 1,
      meanRubric: 1,
    });
    const crit = s.lessons[0].criteria;
    expect(crit.map(c => [c.name, c.kind, c.of, c.marked, c.mean])).toEqual([
      ['Reaches the right answer', 'correctness', 3, 2, 0.75],
      ['Uses what was measured', 'reasoning', 3, 1, 1],
    ]);
    expect(s.lessons[0].kinds).toEqual([
      { kind: 'correctness', marked: 2, mean: 0.75 },
      { kind: 'reasoning', marked: 1, mean: 1 },
    ]);
  });

  test('nothing marked says so: no mean is invented', () => {
    const records = annotate([
      gradeSubmission(report('a', 'x'), orbital, { kind: 'token', label: 'a' }),
    ]);
    const s = classSummary(records, { stepOf });
    const row = s.lessons[0].steps.find(x => x.sid === 'will-it-be-back');
    expect(row).toMatchObject({
      writtenMarked: 0,
      meanMark: null,
      meanRubric: null,
    });
    expect(s.lessons[0].kinds).toEqual([]);
  });

  test('summarizing never changes a mark', () => {
    const records = annotate([
      gradeSubmission(report('a', 'x'), orbital, { kind: 'token', label: 'a' }),
    ]);
    const marks = marksIndex();
    setMark(
      marks,
      records[0].fingerprint,
      'will-it-be-back',
      { points: 1, comment: 'c' },
      1
    );
    const before = JSON.stringify([...marks]);
    classSummary(records, { stepOf, marks });
    expect(JSON.stringify([...marks])).toBe(before);
    expect(records[0].points).toBe(
      annotate([
        gradeSubmission(report('a', 'x'), orbital, {
          kind: 'token',
          label: 'a',
        }),
      ])[0].points
    );
  });
});

// A ledger row: [envelope, quantity, value, unit id, half, origin, source kind,
// source id, digest, code?] (js/notebook/ledger.js ledgerRecord)
const row = (env, quantity, value, half, code) => [
  env,
  quantity,
  value,
  'm',
  half,
  'measured',
  'measure',
  'orbit',
  'abc',
  ...(code ? [code] : []),
];

async function reportWith(name, rows, { tamper = false } = {}) {
  const ids = [...new Set(rows.map(r => r[0]))];
  const ev = {
    d: await ledgerDigest({ ids, rows }),
    i: ids,
    n: rows.length,
    r: rows,
  };
  if (tamper) ev.r = rows.map(r => [...r.slice(0, 2), r[2] + 1, ...r.slice(3)]);
  return gradeSubmission(submission({ name, roster: name }), kepler, {
    kind: 'token',
    label: name,
    evidence: await checkEvidence(ev),
  });
}

describe('measured quantities', () => {
  test('one value from each report, ordered, with the uncertainty it states', async () => {
    const records = annotate([
      await reportWith('a', [row('e1', 'period', 3.1, 0.2, ['s', 'd'])]),
      await reportWith('b', [row('e2', 'period', 2.9, 0.1, ['s', 'd'])]),
      await reportWith('c', [
        row('e3', 'period', 3.4, 0.2, ['i', 'p', 3.1, 3.9, 0.9]),
      ]),
      await reportWith('d', [row('e4', 'period', 3.0, null)]),
      await reportWith('e', [row('e5', 'period', 5, null, ['l', 'd', 'u'])]),
      await reportWith('f', [row('e6', 'period', null, null, ['f'])]),
    ]);
    const { measured } = keplerSummary(records);
    expect(measured.groups).toHaveLength(1);
    const g = measured.groups[0];
    expect(g).toMatchObject({
      quantity: 'period',
      unit: 'm',
      n: 4,
      withBars: 3,
    });
    expect(g.points.map(p => [p.rank, p.value])).toEqual([
      [1, 2.9],
      [2, 3.0],
      [3, 3.1],
      [4, 3.4],
    ]);
    expect(g.points[0].bar).toEqual({ sigma: 0.1 });
    expect(g.points[1].bar).toBeNull();
    expect(g.points[3].bar).toEqual({ lo: 3.1, hi: 3.9 });
    expect(g.leftOut).toMatchObject({ limit: 1, failed: 1, notConstrained: 0 });
    expect(g.median).toBeCloseTo(3.05, 12);
    expect(g.meanSigma).toBeCloseTo((0.2 + 0.1) / 2, 12);
  });

  test('a table that does not match its digest is left out and counted', async () => {
    const records = annotate([
      await reportWith('a', [row('e1', 'mass', 1.0, 0.1, ['s', 'd'])]),
      await reportWith('b', [row('e2', 'mass', 1.2, 0.1, ['s', 'd'])]),
      await reportWith('c', [row('e3', 'mass', 9.9, 0.1, ['s', 'd'])], {
        tamper: true,
      }),
    ]);
    const { measured } = keplerSummary(records);
    expect(measured.mismatched).toBe(1);
    expect(measured.groups[0].points.map(p => p.value)).toEqual([1.0, 1.2]);
  });

  test('a quantity with one value is not a distribution, and says so', async () => {
    const records = annotate([
      await reportWith('a', [row('e1', 'lonely', 1, 0.1, ['s', 'd'])]),
      await reportWith('b', [row('e2', 'shared', 1, 0.1, ['s', 'd'])]),
      await reportWith('c', [row('e3', 'shared', 2, 0.1, ['s', 'd'])]),
    ]);
    const { measured } = keplerSummary(records);
    expect(measured.groups.map(g => g.quantity)).toEqual(['shared']);
    expect(measured.single).toBe(1);
  });

  test('the CSV carries each value with its bar and no identity', async () => {
    const records = annotate([
      await reportWith('Ada Lovelace', [
        row('e1', 'period', 3.1, 0.2, ['s', 'd']),
      ]),
      await reportWith('Ben', [row('e2', 'period', 2.9, 0.1, ['s', 'd'])]),
    ]);
    const rows = fromCsv(classSummaryCsv(keplerSummary(records)));
    const at = Object.fromEntries(rows[0].map((c, i) => [c, i]));
    const values = rows.filter(r => r[at.section] === 'measured');
    expect(
      values.map(r => [r[at.n], r[at.value], r[at.note], r[at.unit]])
    ).toEqual([
      ['1', '2.9', '+/-0.1', 'm'],
      ['2', '3.1', '+/-0.2', 'm'],
    ]);
  });
});

describe('the CSV', () => {
  const summary = keplerSummary(pile());
  const csv = classSummaryCsv(summary);
  const rows = fromCsv(csv);

  test('one file, the columns named, the schema on every row', () => {
    expect(rows[0]).toEqual([...SUMMARY_COLUMNS]);
    expect(rows.slice(1).every(r => r[0] === SUMMARY_SCHEMA)).toBe(true);
    expect(rows.every(r => r.length === SUMMARY_COLUMNS.length)).toBe(true);
    expect(csv.endsWith('\r\n')).toBe(true);
  });

  test('holds the counts the summary has', () => {
    const at = Object.fromEntries(rows[0].map((c, i) => [c, i]));
    const find = (section, measure, item = '') =>
      rows.find(
        r =>
          r[at.section] === section &&
          r[at.measure] === measure &&
          (item === '' || r[at.item_id] === item)
      );
    expect(find('overview', 'reports')[at.value]).toBe('6');
    expect(find('step', 'correct', 'use-the-law')[at.value]).toBe('5');
    expect(find('step', 'answered_share', 'where-is-the-star')[at.value]).toBe(
      String(Math.round((4 / 6) * 10000) / 10000)
    );
  });

  test('names, roster ids, labels and typed text are nowhere in it', () => {
    for (const secret of [
      'Ada',
      'Lovelace',
      'Cleo',
      'Dev',
      'HYPERLINK',
      'S-1',
      'S-2',
      'S-3',
      'wk3',
      'report-1',
    ])
      expect(csv).not.toContain(secret);
    for (const r of pile()) expect(csv).not.toContain(r.fingerprint);
  });
});

describe('the page markup', () => {
  const summary = keplerSummary(pile());

  test('nothing to show says what to do', () => {
    const html = summaryHtml(keplerSummary([]), wordsOf());
    expect(html).toContain('Read at least one report');
    expect(html).not.toContain('<table');
  });

  test('tables with captions and header cells, no name anywhere', () => {
    const html = summaryHtml(summary, wordsOf());
    expect(html).toContain(
      '<caption class="visually-hidden">Steps, in order</caption>'
    );
    expect(html).toContain('id="sumCsv"');
    expect(html).toContain('id="sumPrint"');
    expect(html).toContain('6 reports counted on 2026-10-21');
    for (const secret of ['Ada', 'Lovelace', 'Cleo', 'HYPERLINK', 'S-1'])
      expect(html).not.toContain(secret);
    // every data table has column headers
    for (const t of html.match(/<table[\s\S]*?<\/table>/g))
      expect(t).toMatch(/<th scope="col">/);
  });

  test('says in Spanish what it says in English', () => {
    const html = summaryHtml(summary, wordsOf('es'));
    expect(html).toContain('Resumen de la clase');
    expect(html).not.toMatch(/\?sub\./);
    expect(html).toContain('6 informes contados el 2026-10-21');
  });
});

describe('the words', () => {
  const placeholders = s =>
    [...String(s).matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort();

  test('every id exists in both languages with the same placeholders', () => {
    expect(Object.keys(ES_CLASSSUMMARY).sort()).toEqual(
      Object.keys(EN_CLASSSUMMARY).sort()
    );
    for (const [id, en] of Object.entries(EN_CLASSSUMMARY))
      expect(placeholders(ES_CLASSSUMMARY[id])).toEqual(placeholders(en));
  });

  test('no id is defined in this file and in the page catalog too', () => {
    for (const id of Object.keys(EN_CLASSSUMMARY))
      expect(Object.hasOwn(EN_SUBMISSIONS, id)).toBe(false);
  });

  test('every id the view and the page ask for is there', () => {
    const merged = { ...EN_SUBMISSIONS, ...EN_CLASSSUMMARY };
    for (const file of [
      'js/instructorSummaryView.js',
      'js/instructorSummaryPlot.js',
    ]) {
      const text = readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
      for (const [, id] of text.matchAll(/\bt\(\s*'([\w.]+)'/g))
        expect(merged[id]).toBeTruthy();
    }
  });
});

describe('the plot', () => {
  let saved;
  beforeAll(() => {
    saved = globalThis.document;
    globalThis.document = new JSDOM(
      '<!doctype html><body></body>'
    ).window.document;
  });
  afterAll(() => {
    globalThis.document = saved;
  });

  test('draws every value, one bar for each stated uncertainty, from the same numbers as the table', async () => {
    const records = annotate([
      await reportWith('a', [row('e1', 'period', 3.1, 0.2, ['s', 'd'])]),
      await reportWith('b', [row('e2', 'period', 2.9, 0.1, ['s', 'd'])]),
      await reportWith('c', [
        row('e3', 'period', 3.4, 0.2, ['i', 'p', 3.1, 3.9, 0.9]),
      ]),
      await reportWith('d', [row('e4', 'period', 3.0, null)]),
    ]);
    const summary = keplerSummary(records);
    const host = document.createElement('section');
    const words = wordsOf();
    host.innerHTML = summaryHtml(summary, words);
    document.body.append(host);
    expect(await drawMeasured(host, summary, words)).toBe(1);
    const svg = host.querySelector('svg[data-sum-plot]');
    expect(svg.querySelectorAll('.ow-pt')).toHaveLength(4);
    // three of the four state an uncertainty: three bars
    expect(svg.querySelectorAll('.ow-bars line')).toHaveLength(3);
    // the table beside it lists the same four values, in the plot's order
    const cells = [...host.querySelectorAll('figure table tbody tr')].map(tr =>
      [...tr.children].map(c => c.textContent)
    );
    expect(cells.map(c => c[1])).toEqual(['2.9', '3', '3.1', '3.4']);
    expect(svg.getAttribute('aria-label')).toMatch(/^period: 4 values/);
  });

  test('a slot that has left the page is skipped', async () => {
    const records = annotate([
      await reportWith('a', [row('e1', 'q', 1, 0.1, ['s', 'd'])]),
      await reportWith('b', [row('e2', 'q', 2, 0.1, ['s', 'd'])]),
    ]);
    const summary = keplerSummary(records);
    const host = document.createElement('section');
    host.innerHTML = summaryHtml(summary, wordsOf());
    // never attached to the document: the slot is not connected
    expect(await drawMeasured(host, summary, wordsOf())).toBe(0);
  });
});
