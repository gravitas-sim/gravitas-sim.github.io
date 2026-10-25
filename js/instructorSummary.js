// =============================================================================
// The local class summary (Prompt 173)
// -----------------------------------------------------------------------------
// The review page grades one report at a time. This is the picture of the class
// they make together, computed from the graded records the page already holds
// and nothing else: no file is read, nothing is sent or stored, and the summary
// leaves the page only as the one CSV the instructor asks for (classSummaryCsv)
// or as the page printed.
//
// Per investigation handed in it says: how far each report got, and per step
// how many answered and how many were right of what Gravitas can check, with
// the instructor's marks for written answers (a step nobody marked says so);
// the rubric criteria of the written steps (Prompt 172's kinds); the wrong
// answers given most often, with the misconception only where the author named
// it (js/answerFeedback.js); the time a report records, first opening to last
// save, every hour away included; and each measured quantity the evidence
// tables carry, one value per report with its uncertainty (Prompt 150).
//
// What it does not say: who. A report is counted once, an exact duplicate not
// at all, and no name, roster id or file name appears in the summary or its
// CSV. It never changes a mark, a score or a gradebook row (criterion marks are
// never added to a step mark, js/instructorRubric.js), and it makes no claim
// about learning: it is what this class handed in, not a study of Gravitas.
//
// It is named js/instructor*.js so the service worker installs it with the
// instructor modules, in the idle tier (tools/build-service-worker.mjs), and
// not in the first visit's install: only the review page reads it. Pure: no
// DOM, no storage, no network.
// =============================================================================

import { gradeAnswer, toleranceFor } from './answerCheck.js';
import { matchMisconception } from './answerFeedback.js';
import { num, toCsv } from './csv.js';
import { criterionKey, isWrittenAnswer, markKey } from './gradebook/marks.js';
import { decodeEntities } from './lessonMarkup.js';
import { criteriaPlan, rubricFraction } from './instructorRubric.js';

/** What the summary CSV says it is, in its `schema` column. */
export const SUMMARY_SCHEMA = 'gravitas.class-summary/1';

/** The summary CSV's columns, in order. */
export const SUMMARY_COLUMNS = Object.freeze([
  'schema',
  'section',
  'lesson_id',
  'lesson_title',
  'item_id',
  'item_title',
  'item_kind',
  'measure',
  'value',
  'n',
  'unit',
  'note',
]);

/** The elapsed-time bands, in minutes: [from, to), the last unbounded. */
export const TIME_BANDS = Object.freeze([
  [0, 15],
  [15, 30],
  [30, 60],
  [60, 180],
  [180, 1440],
  [1440, Infinity],
]);

/** The most wrong answers the summary keeps for one step. */
const WRONG_PER_STEP = 3;

/** Lesson prose as one line of text: markup dropped, entities read. */
const plain = s =>
  decodeEntities(String(s ?? '').replace(/<[^>]*>/g, ''))
    .replace(/\s+/g, ' ')
    .trim();

const mean = xs =>
  xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;

/**
 * A quantile of numbers, by linear interpolation between the order statistics
 * (the usual "type 7" definition, so a spreadsheet agrees).
 * @param {number[]} xs - Numbers
 * @param {number} p - 0 to 1
 * @returns {?number} The quantile, null for no numbers
 */
export function quantile(xs, p) {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const at = (s.length - 1) * p;
  const lo = Math.floor(at);
  const hi = Math.ceil(at);
  return s[lo] + (s[hi] - s[lo]) * (at - lo);
}

/**
 * Minutes between the first opening and the last save a report records, or
 * null when it does not record both or they are the wrong way round.
 * @param {object} r - A graded record
 * @returns {?number}
 */
export function elapsedMinutes(r) {
  const a = r.startedAt ? Date.parse(r.startedAt) : NaN;
  const b = r.savedAt ? Date.parse(r.savedAt) : NaN;
  return Number.isFinite(a) && Number.isFinite(b) && b >= a
    ? (b - a) / 60000
    : null;
}

/**
 * One wrong answer, as a key to count by and the words to show.
 * @param {?object} step - The step as it was graded
 * @param {object} q - The question row
 * @returns {{key: string, kind: string, value: ?number, text: ?string,
 *   unit: ?string, misconception: ?string}}
 */
function wrongAnswer(step, q) {
  const response = String(q.response ?? '');
  if (!step)
    return {
      key: `t:${response}`,
      kind: 'text',
      value: null,
      text: response,
      unit: null,
      misconception: null,
    };
  if (Array.isArray(step.options) || step.type === 'predict') {
    const i = Number(response);
    const option = Array.isArray(step.options) ? step.options[i] : undefined;
    const named = matchMisconception(step, i, 0);
    return {
      key: `c:${response}`,
      kind: 'choice',
      value: Number.isInteger(i) ? i : null,
      text:
        option === undefined
          ? response
          : `${String.fromCharCode(65 + i)}: ${plain(option)}`,
      unit: null,
      misconception: named?.message ? plain(named.message) : null,
    };
  }
  const graded = gradeAnswer(step, response, { locale: q.locale || 'en' });
  if (graded.status === 'unreadable')
    return {
      key: `u:${graded.reason}`,
      kind: 'unreadable',
      value: null,
      text: null,
      unit: null,
      misconception: null,
    };
  const named = matchMisconception(step, graded.value, toleranceFor(step));
  return {
    key: `n:${graded.value}`,
    kind: 'number',
    value: graded.value,
    text: String(graded.value),
    unit: typeof step.unit === 'string' ? step.unit : null,
    misconception: named?.message ? plain(named.message) : null,
  };
}

/**
 * The bar an evidence row draws, from what its uncertainty says; nothing for a
 * row that states none, and a row that states a limit, a failure or "not
 * constrained" is not a value to plot at all.
 * @param {object} row - An evidence row (js/submission/results.js)
 * @returns {{left: ?string, bar: ?{sigma?: number, lo?: number, hi?: number},
 *   how: string}} `left` names why a row is left out of the plot
 */
function barOf(row) {
  const u = row.uncertainty;
  if (!u) {
    return Number.isFinite(row.half) && row.half > 0
      ? { left: null, bar: { sigma: row.half }, how: 'sigma' }
      : { left: null, bar: null, how: 'none' };
  }
  if (u.kind === 'limit') return { left: 'limit', bar: null, how: 'limit' };
  if (u.kind === 'failed') return { left: 'failed', bar: null, how: 'failed' };
  if (u.kind === 'not-constrained')
    return { left: 'notConstrained', bar: null, how: 'notConstrained' };
  if (u.kind === 'assumed') return { left: null, bar: null, how: 'exact' };
  if (u.kind === 'interval' && Number.isFinite(u.lo) && Number.isFinite(u.hi))
    return { left: null, bar: { lo: u.lo, hi: u.hi }, how: 'interval' };
  const half = u.kind === 'model-limited' ? (u.floor ?? row.half) : row.half;
  return Number.isFinite(half) && half > 0
    ? { left: null, bar: { sigma: half }, how: u.kind }
    : { left: null, bar: null, how: 'none' };
}

/**
 * The measured quantities the reports' evidence tables carry, a group per
 * investigation, quantity, unit and source, a value from each report. A table
 * whose digest does not match what the token states is left out and counted,
 * not plotted: the number in front of the instructor must be the one the
 * student's report printed.
 * @param {Array<object>} records - Distinct annotated records
 * @param {number} minimum - The fewest values a group needs to be a distribution
 * @returns {{groups: Array<object>, single: number, mismatched: number}}
 */
function measured(records, minimum) {
  const groups = new Map();
  let mismatched = 0;
  for (const r of records) {
    if (r.evidence?.state === 'mismatch') {
      mismatched++;
      continue;
    }
    for (const row of r.evidence?.rows ?? []) {
      const key = JSON.stringify([
        r.lessonId,
        row.quantity,
        row.unitId,
        row.sourceKind,
        row.sourceId,
      ]);
      if (!groups.has(key)) {
        groups.set(key, {
          key,
          lessonId: r.lessonId,
          lessonTitle: r.lessonTitle,
          quantity: row.quantity,
          unit: row.unit,
          unitId: row.unitId,
          source: `${row.sourceKind} ${row.sourceId}`.trim(),
          points: [],
          leftOut: { limit: 0, failed: 0, notConstrained: 0, noValue: 0 },
        });
      }
      const g = groups.get(key);
      const { left, bar, how } = barOf(row);
      if (left) g.leftOut[left]++;
      else if (!Number.isFinite(row.value)) g.leftOut.noValue++;
      else
        g.points.push({ value: row.value, bar, how, origin: row.origin, row });
    }
  }
  const out = [];
  let single = 0;
  for (const g of groups.values()) {
    if (g.points.length < minimum) {
      if (g.points.length) single++;
      continue;
    }
    g.points.sort((a, b) => a.value - b.value);
    g.points.forEach((p, i) => {
      p.rank = i + 1;
    });
    const values = g.points.map(p => p.value);
    const sigmas = g.points
      .map(p => p.bar?.sigma)
      .filter(s => Number.isFinite(s));
    g.n = values.length;
    g.median = quantile(values, 0.5);
    g.min = values[0];
    g.max = values.at(-1);
    g.withBars = g.points.filter(p => p.bar).length;
    g.meanSigma = mean(sigmas);
    out.push(g);
  }
  out.sort((a, b) => b.n - a.n || (a.quantity < b.quantity ? -1 : 1));
  return { groups: out, single, mismatched };
}

/**
 * Summarize a class's reports.
 *
 * @param {Array<object>} records - From annotate(); an exact duplicate is left
 *   out, every other report counts once, a repeated attempt included
 * @param {object} [options] - Options
 * @param {(record: object, sid: string) => ?object} [options.stepOf] - The
 *   step as that report was graded (its depth laid in, a pack's own steps), or
 *   null when the build does not know it
 * @param {Map<string, object>} [options.marks] - The instructor's marks as
 *   entered on the page (js/gradebook/marks.js); none if omitted
 * @param {number} [options.wrongPerStep] - How many wrong answers to keep per step
 * @returns {object} The summary: `reports`, `duplicates`, `repeated`,
 *   `lessons` (each with `steps`, `criteria`, `kinds`, `wrong`, `time`) and
 *   `measured`
 */
export function classSummary(
  records,
  { stepOf = () => null, marks = new Map(), wrongPerStep = WRONG_PER_STEP } = {}
) {
  const distinct = records.filter(r => r.duplicateOf === null);
  const lessons = new Map();
  for (const r of distinct) {
    if (!lessons.has(r.lessonId))
      lessons.set(r.lessonId, {
        id: r.lessonId,
        title: r.lessonTitle,
        records: [],
      });
    lessons.get(r.lessonId).records.push(r);
  }

  const out = [];
  for (const L of lessons.values()) {
    const steps = new Map();
    const criteria = new Map();
    const kinds = new Map();
    const wrong = new Map();
    let stale = 0;

    for (const r of L.records) {
      for (const q of r.questions) {
        if (q.verdict === 'stale') {
          stale++;
          continue;
        }
        if (!steps.has(q.sid))
          steps.set(q.sid, {
            sid: q.sid,
            number: q.stepNumber,
            title: plain(q.title),
            type: q.type,
            of: 0,
            correct: 0,
            incorrect: 0,
            unmarked: 0,
            incomplete: 0,
            written: 0,
            writtenMarked: 0,
            markShares: [],
            rubricShares: [],
            rubricOf: 0,
          });
        const row = steps.get(q.sid);
        row.of++;
        row[q.verdict]++;
        const step = stepOf(r, q.sid);

        if (q.verdict === 'incorrect' && q.response !== null) {
          const w = wrongAnswer(step, q);
          const key = JSON.stringify([q.sid, w.key]);
          if (!wrong.has(key)) wrong.set(key, { sid: q.sid, ...w, count: 0 });
          wrong.get(key).count++;
        }

        if (!isWrittenAnswer(q)) continue;
        row.written++;
        const m = marks.get(markKey(r.fingerprint, q.sid));
        if (m && m.points !== null && q.pointsPossible > 0) {
          row.writtenMarked++;
          row.markShares.push(
            Math.min(m.points, q.pointsPossible) / q.pointsPossible
          );
        }
        const plan = criteriaPlan(step, r.depth);
        if (!plan.length) continue;
        row.rubricOf++;
        const fraction = rubricFraction(marks, r.fingerprint, q.sid, plan);
        if (fraction.fraction !== null)
          row.rubricShares.push(fraction.fraction);
        for (const c of plan) {
          const key = `${q.sid}\u0000${c.n}`;
          if (!criteria.has(key))
            criteria.set(key, {
              sid: q.sid,
              stepTitle: row.title,
              n: c.n,
              name: plain(c.name),
              kind: c.kind,
              weight: c.weight,
              of: 0,
              shares: [],
            });
          const cr = criteria.get(key);
          cr.of++;
          const cm = marks.get(criterionKey(r.fingerprint, q.sid, c.n));
          if (cm && cm.points !== null) {
            const share = Math.min(cm.points, c.possible) / c.possible;
            cr.shares.push(share);
            if (!kinds.has(c.kind)) kinds.set(c.kind, []);
            kinds.get(c.kind).push(share);
          }
        }
      }
    }

    const stepRows = [...steps.values()].sort(
      (a, b) => (a.number ?? Infinity) - (b.number ?? Infinity)
    );
    const order = new Map(stepRows.map((s, i) => [s.sid, i]));
    const totals = new Map(stepRows.map(s => [s.sid, s.incorrect]));
    const wrongRows = [];
    for (const sid of order.keys()) {
      const list = [...wrong.values()]
        .filter(w => w.sid === sid)
        .sort((a, b) => {
          const x = a.text ?? a.key;
          const y = b.text ?? b.key;
          return b.count - a.count || (x < y ? -1 : x > y ? 1 : 0);
        })
        .slice(0, wrongPerStep);
      for (const w of list)
        wrongRows.push({
          ...w,
          stepTitle: stepRows[order.get(sid)].title,
          wrongAtStep: totals.get(sid),
          share: w.count / totals.get(sid),
        });
    }

    const minutes = L.records.map(elapsedMinutes).filter(m => m !== null);
    out.push({
      id: L.id,
      title: L.title,
      reports: L.records.length,
      depths: L.records.reduce((acc, r) => {
        if (r.depth) acc[r.depth] = (acc[r.depth] ?? 0) + 1;
        return acc;
      }, {}),
      reading: {
        median: quantile(
          L.records.map(r => r.completion),
          0.5
        ),
        min: Math.min(...L.records.map(r => r.completion)),
        max: Math.max(...L.records.map(r => r.completion)),
      },
      steps: stepRows.map(s => ({
        sid: s.sid,
        number: s.number,
        title: s.title,
        type: s.type,
        of: s.of,
        answered: s.of - s.incomplete,
        correct: s.correct,
        incorrect: s.incorrect,
        unmarked: s.unmarked,
        incomplete: s.incomplete,
        written: s.written,
        writtenMarked: s.writtenMarked,
        meanMark: mean(s.markShares),
        rubricOf: s.rubricOf,
        rubricComplete: s.rubricShares.length,
        meanRubric: mean(s.rubricShares),
      })),
      criteria: [...criteria.values()].map(c => ({
        sid: c.sid,
        stepTitle: c.stepTitle,
        n: c.n,
        name: c.name,
        kind: c.kind,
        weight: c.weight,
        of: c.of,
        marked: c.shares.length,
        mean: mean(c.shares),
      })),
      kinds: [...kinds].map(([kind, shares]) => ({
        kind,
        marked: shares.length,
        mean: mean(shares),
      })),
      wrong: wrongRows,
      stale,
      time: {
        n: minutes.length,
        missing: L.records.length - minutes.length,
        median: quantile(minutes, 0.5),
        q1: quantile(minutes, 0.25),
        q3: quantile(minutes, 0.75),
        min: minutes.length ? Math.min(...minutes) : null,
        max: minutes.length ? Math.max(...minutes) : null,
        bands: TIME_BANDS.map(([from, to]) => ({
          from,
          to,
          count: minutes.filter(m => m >= from && m < to).length,
        })),
      },
    });
  }

  return {
    reports: distinct.length,
    duplicates: records.length - distinct.length,
    repeated: distinct.filter(r => r.attemptGroup !== null).length,
    lessons: out,
    measured: measured(distinct, 2),
  };
}

/**
 * What an uncertainty bar says, as a plain string for a file.
 * @param {object} p - A point of a measured group
 * @returns {string}
 */
const barText = p =>
  p.bar?.sigma !== undefined
    ? `+/-${num(p.bar.sigma, 6)}`
    : p.bar
      ? `${num(p.bar.lo, 6)} to ${num(p.bar.hi, 6)}`
      : p.how;

/**
 * The summary as one CSV: a long table, one measurement per row, the section
 * naming what it is a measurement of. No name, roster id or file name is in it.
 *
 * @param {object} summary - From classSummary()
 * @returns {string} CSV with CRLF line endings, header first
 */
export function classSummaryCsv(summary) {
  const rows = [SUMMARY_COLUMNS];
  const put = cells =>
    rows.push(
      SUMMARY_COLUMNS.map(c =>
        c === 'schema' ? SUMMARY_SCHEMA : (cells[c] ?? '')
      )
    );
  const share = v => (v === null ? '' : num(v, 4));
  put({
    section: 'overview',
    measure: 'reports',
    value: summary.reports,
    n: summary.reports,
  });
  put({
    section: 'overview',
    measure: 'exact_duplicates_left_out',
    value: summary.duplicates,
  });
  put({
    section: 'overview',
    measure: 'reports_in_repeated_attempts',
    value: summary.repeated,
    n: summary.reports,
  });
  for (const L of summary.lessons) {
    const base = { lesson_id: L.id, lesson_title: L.title };
    put({
      ...base,
      section: 'reading',
      measure: 'reports',
      value: L.reports,
      n: L.reports,
    });
    for (const k of ['median', 'min', 'max'])
      put({
        ...base,
        section: 'reading',
        measure: `visited_share_${k}`,
        value: share(L.reading[k]),
        n: L.reports,
      });
    for (const s of L.steps) {
      const step = {
        ...base,
        section: 'step',
        item_id: s.sid,
        item_title: s.title,
        item_kind: s.type ?? '',
      };
      put({
        ...step,
        measure: 'answered_share',
        value: share(s.of ? s.answered / s.of : null),
        n: s.of,
      });
      const checked = s.correct + s.incorrect;
      for (const k of ['correct', 'incorrect', 'unmarked', 'incomplete'])
        put({ ...step, measure: k, value: s[k], n: s.of });
      put({
        ...step,
        measure: 'correct_share_of_checked',
        value: share(checked ? s.correct / checked : null),
        n: checked,
      });
      if (s.written) {
        put({
          ...step,
          measure: 'instructor_mark_share',
          value: share(s.meanMark),
          n: s.writtenMarked,
          note: `of ${s.written} written answers`,
        });
      }
      if (s.rubricOf)
        put({
          ...step,
          measure: 'rubric_share_all_criteria_marked',
          value: share(s.meanRubric),
          n: s.rubricComplete,
          note: `of ${s.rubricOf} written answers with criteria`,
        });
    }
    for (const c of L.criteria)
      put({
        ...base,
        section: 'criterion',
        item_id: `${c.sid}:c${c.n}`,
        item_title: c.name,
        item_kind: c.kind,
        measure: 'mean_mark_share',
        value: share(c.mean),
        n: c.marked,
        note: `weight ${c.weight}; step ${c.stepTitle}; of ${c.of} answers`,
      });
    for (const k of L.kinds)
      put({
        ...base,
        section: 'criterion_kind',
        item_kind: k.kind,
        measure: 'mean_mark_share',
        value: share(k.mean),
        n: k.marked,
      });
    for (const w of L.wrong)
      put({
        ...base,
        section: 'wrong_answer',
        item_id: w.sid,
        item_title: w.stepTitle,
        item_kind: w.kind,
        measure: 'count',
        value: w.count,
        n: w.wrongAtStep,
        unit: w.unit ?? '',
        note: [
          w.kind === 'unreadable' ? 'not a readable answer' : w.text,
          w.misconception ? `misconception: ${w.misconception}` : '',
        ]
          .filter(Boolean)
          .join('; '),
      });
    const t = L.time;
    for (const [k, v] of [
      ['median', t.median],
      ['q1', t.q1],
      ['q3', t.q3],
      ['min', t.min],
      ['max', t.max],
    ])
      put({
        ...base,
        section: 'time',
        measure: `elapsed_minutes_${k}`,
        value: v === null ? '' : num(v, 4),
        n: t.n,
        unit: 'min',
        note: 'first opening to last save, not time on task',
      });
    for (const b of t.bands)
      put({
        ...base,
        section: 'time',
        item_id: `${b.from}-${b.to === Infinity ? '' : b.to}`,
        measure: 'reports_in_band_minutes',
        value: b.count,
        n: t.n,
        unit: 'min',
      });
  }
  for (const g of summary.measured.groups) {
    const base = {
      section: 'measured',
      lesson_id: g.lessonId,
      lesson_title: g.lessonTitle,
      item_id: g.quantity,
      item_title: g.quantity,
      item_kind: g.source,
      unit: g.unit,
    };
    for (const p of g.points) {
      put({
        ...base,
        measure: 'value',
        value: num(p.value, 8),
        n: p.rank,
        note: barText(p),
      });
    }
  }
  return toCsv(rows);
}
