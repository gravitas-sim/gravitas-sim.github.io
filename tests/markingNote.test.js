// =============================================================================
// The marking note, the key's criteria and the review panel's kind (Prompt 172)
// -----------------------------------------------------------------------------
// F-8: the lab report prints a written answer's marking note only when the
// activity asks for it (`markingNote: true` -> `m: 1` on the assignment), and
// the answer key prints it whatever the activity says. The key also prints,
// per rubric criterion, what it claims (`kind`), its weight and the depth it is
// marked from, in English and Spanish, and a key for one depth leaves out the
// criteria marked from a deeper one. Nothing here changes a mark.
// =============================================================================

import { describe, expect, test, beforeAll, afterAll } from '@jest/globals';
import { Buffer } from 'node:buffer';
import { TextDecoder } from 'node:util';

import { buildLabReport } from '../js/labReport.js';
import { EN_REPORT } from '../js/i18n/en.report.js';
import { decodeEntities } from '../js/lessonMarkup.js';
import { checkAnswer } from '../js/answerCheck.js';
import { stepKey } from '../js/investigations/progressSchema.js';
import { INVESTIGATIONS } from '../js/data/investigations.js';
import {
  ASSIGNMENT_KIND,
  buildAssignment,
  validateAssignment,
} from '../js/assignments/assignment.js';
import { assignmentForFormat } from '../js/activities/activities.js';
import { stepFingerprint } from '../js/investigations/progressBackup.js';
import { assignmentLink } from '../js/assignments/assignmentLink.js';
import { answerKeyDocument } from '../js/instructorDocs.js';
import {
  CRITERION_DEPTHS,
  CRITERION_KINDS,
  DEFAULT_CRITERION_KIND,
  MAX_CRITERION_WEIGHT,
  appliesAt,
  criteriaOf,
  rubricProblems,
} from '../js/rubric.js';
import * as planModule from '../js/instructorRubric.js';
import { CRITERION_KINDS as PACK_KINDS } from '../js/platform/questionBank.js';
import { archiveOld, run } from './compat/harness.js';
import { EN_SUBMISSIONS } from '../js/i18n/en.submissions.js';
import { ES_SUBMISSIONS } from '../js/i18n/es.submissions.js';

const inv = INVESTIGATIONS.find(i => i.id === 'orbital-energy');
const WRITTEN = 'will-it-be-back';
const NOTE = inv.steps.find(s => s.sid === WRITTEN).rubric.slice(0, 40);

const translate = (id, vars) =>
  String(EN_REPORT[id] ?? id).replace(/\{(\w+)\}/g, (w, k) =>
    vars && k in vars ? String(vars[k]) : w
  );

const drawn = bytes =>
  [
    ...Buffer.from(bytes)
      .toString('latin1')
      .matchAll(/\(((?:\\.|[^\\)])*)\) Tj/g),
  ]
    .map(m => m[1].replace(/\\(.)/g, '$1'))
    .join(' ');

/** The student's report on Orbital Energy with the written answer given. */
const report = assignment =>
  buildLabReport({
    locale: 'en',
    t: translate,
    investigation: inv,
    plot: null,
    name: 'Ada',
    submissionToken: '',
    responses: {
      [stepKey(inv.id, WRITTEN)]: 'No, because its energy is above zero.',
    },
    attempts: {},
    visited: new Set(inv.steps.map(s => s.sid)),
    startedAt: '2026-09-01T10:00:00.000Z',
    links: [],
    stepIdFor: index => stepKey(inv.id, inv.steps[index]?.sid),
    assignment,
    binding: null,
    checkAnswer: (step, value) => checkAnswer(step, value, { locale: 'en' }),
    decodeEntities,
  });

const payload = extra => ({
  k: ASSIGNMENT_KIND,
  v: 1,
  i: 'p172note',
  l: inv.id,
  t: 'Energy',
  n: '',
  s: inv.steps.map(s => s.sid),
  c: '2026-10-21',
  ...extra,
});

describe('the marking note in the lab report (F-8)', () => {
  test('is off unless the assignment asks for it, with or without an assignment', () => {
    expect(drawn(report(null))).not.toContain('Marking note');
    expect(drawn(report(payload({})))).not.toContain('Marking note');
  });

  test('is printed when the assignment sets m, under the written answer only', () => {
    const text = drawn(report(payload({ m: 1 })));
    expect(text).toContain('Marking note: ');
    expect(text).toContain(NOTE.replace(/[()\\]/g, ''));
    // One written answer with a rubric in this lesson, so one note.
    expect(text.split('Marking note: ').length - 1).toBe(1);
  });
});

describe('the assignment that carries the choice', () => {
  const lesson = inv;
  const common = {
    lesson,
    chosen: [WRITTEN],
    title: 'Energy',
    id: 'p172fixed',
    now: new Date('2026-10-21T00:00:00Z'),
    fingerprint: stepFingerprint,
  };

  test('writes m only when set: every other payload is what it was', () => {
    expect('m' in buildAssignment(common)).toBe(false);
    expect('m' in buildAssignment({ ...common, markingNote: false })).toBe(
      false
    );
    expect(buildAssignment({ ...common, markingNote: true }).m).toBe(1);
    const { m, ...rest } = buildAssignment({ ...common, markingNote: true });
    expect(m).toBe(1);
    expect(rest).toEqual(buildAssignment(common));
  });

  test('is validated: 1 is a choice, anything else is refused by name', () => {
    expect(validateAssignment(payload({ m: 1 })).ok).toBe(true);
    for (const bad of [0, 2, true, 'yes', null])
      expect(validateAssignment(payload({ m: bad }))).toMatchObject({
        ok: false,
        reason: 'badMarkingNote',
      });
  });

  test('an activity that says markingNote: true builds one; one that does not, does not', () => {
    const format = { id: 'f', assignmentId: 'p172act', steps: [WRITTEN] };
    const act = extra => ({ id: 'x', ...extra });
    const on = assignmentForFormat(lesson, act({ markingNote: true }), format);
    const off = assignmentForFormat(lesson, act({}), format);
    const no = assignmentForFormat(lesson, act({ markingNote: false }), format);
    expect(on.assignment.m).toBe(1);
    expect('m' in off.assignment).toBe(false);
    expect('m' in no.assignment).toBe(false);
  });
});

describe('the 2.0.0 reader and a link that carries the choice', () => {
  let old;
  beforeAll(() => {
    old = archiveOld();
  });
  afterAll(() => old?.cleanup());

  test('opens it and keeps the steps: it prints the note as it always did', async () => {
    const a = payload({ m: 1 });
    const { fragment } = await assignmentLink(a, 'https://example.test/');
    const got = run(old.tree, 'assignment-link', 'read', { fragment }).value;
    expect(got.accepted).toBe(true);
    expect(got.value.s).toEqual(a.s);
  });
});

describe('what a criterion claims, as the key reads it', () => {
  test('criteriaOf fills in kind, weight and depth as the review page does', () => {
    const step = {
      rubricCriteria: [
        { name: 'a', levels: [] },
        {
          name: 'b',
          kind: 'uncertainty',
          weight: 3,
          depth: 'advanced',
          levels: [],
        },
        {
          name: 'c',
          kind: 'neatness',
          weight: -1,
          depth: 'expert',
          levels: [],
        },
      ],
    };
    expect(
      criteriaOf(step).map(({ kind, weight, depth }) => ({
        kind,
        weight,
        depth,
      }))
    ).toEqual([
      { kind: 'reasoning', weight: 1, depth: null },
      { kind: 'uncertainty', weight: 3, depth: 'advanced' },
      { kind: 'reasoning', weight: 1, depth: null },
    ]);
    // The same answers criteriaPlan gives, field for field.
    expect(
      planModule
        .criteriaPlan(step)
        .map(({ kind, weight, depth }) => ({ kind, weight, depth }))
    ).toEqual(
      criteriaOf(step).map(({ kind, weight, depth }) => ({
        kind,
        weight,
        depth,
      }))
    );
  });

  test('the lists are held equal in every file that keeps a copy', () => {
    expect([...CRITERION_KINDS]).toEqual([...planModule.CRITERION_KINDS]);
    expect([...CRITERION_KINDS]).toEqual([...PACK_KINDS]);
    expect(DEFAULT_CRITERION_KIND).toBe(planModule.DEFAULT_CRITERION_KIND);
    expect([...CRITERION_DEPTHS]).toEqual(['core', 'quantitative', 'advanced']);
    expect(MAX_CRITERION_WEIGHT).toBe(10);
  });

  test('rubricProblems names a kind, depth or weight that is not one', () => {
    const level = (label, points) => ({ label, text: 't', points });
    const step = extra => ({
      kind: 'short',
      rubricCriteria: [
        { name: 'n', ...extra, levels: [level('Full', 2), level('No', 0)] },
      ],
    });
    expect(rubricProblems(step({}))).toEqual([]);
    expect(
      rubricProblems(step({ kind: 'correctness', depth: 'core', weight: 10 }))
    ).toEqual([]);
    expect(rubricProblems(step({ kind: 'neatness' })).join()).toMatch(
      /rubricCriteria\[0\]\.kind must be one of completion, correctness/
    );
    expect(rubricProblems(step({ depth: 'expert' })).join()).toMatch(
      /\.depth must be one of core, quantitative, advanced/
    );
    for (const weight of [0, -1, 11, '2', NaN])
      expect(rubricProblems(step({ weight })).join()).toMatch(
        /\.weight must be/
      );
  });

  test('appliesAt: from the criterion’s depth deeper, every depth when it has none', () => {
    expect(appliesAt({}, 'core')).toBe(true);
    expect(appliesAt({ depth: 'advanced' }, undefined)).toBe(true);
    expect(appliesAt({ depth: 'quantitative' }, 'core')).toBe(false);
    expect(appliesAt({ depth: 'quantitative' }, 'quantitative')).toBe(true);
    expect(appliesAt({ depth: 'quantitative' }, 'advanced')).toBe(true);
    expect(appliesAt({ depth: 'core' }, 'core')).toBe(true);
  });

  test('every built-in rubric is sound with the kinds Orbital Energy now sets', () => {
    for (const i of INVESTIGATIONS)
      for (const s of i.steps) expect(rubricProblems(s)).toEqual([]);
    const kinds = criteriaOf(inv.steps.find(s => s.sid === WRITTEN)).map(
      c => c.kind
    );
    // "Reaches the right answer" is correctness; "Uses what was measured" is reasoning.
    expect(kinds).toEqual(['correctness', 'reasoning']);
  });
});

describe('the key prints the kind, the weight and the depth', () => {
  const decode = bytes => new TextDecoder('latin1').decode(bytes);
  const pdfText = pdf =>
    [...decode(pdf).matchAll(/\(((?:\\.|[^()\\])*)\)\s*Tj/g)]
      .map(m => m[1].replace(/\\([()\\])/g, '$1'))
      .join(' ');

  /** Orbital Energy with a second criterion marked from a deeper depth. */
  const withDepths = () => ({
    ...inv,
    steps: inv.steps.map(s =>
      s.sid === WRITTEN
        ? {
            ...s,
            rubricCriteria: [
              { ...s.rubricCriteria[0], weight: 2 },
              { ...s.rubricCriteria[1], depth: 'advanced' },
            ],
          }
        : s
    ),
  });

  test('English: kind, weight and, where set, the depth, with the note on what the kinds mean', () => {
    const text = pdfText(answerKeyDocument(withDepths(), { version: 'T' }));
    expect(text).toMatch(/Reaches the right answer/);
    expect(text).toMatch(/correctness, weight 2/);
    expect(text).toMatch(/reasoning, weight 1, from Advanced depth/);
    expect(text).toMatch(/Each criterion says what it claims/);
    // The marking note is in the key whatever any activity says.
    expect(text).toContain('What to look for');
  });

  test('Spanish: the same, in Spanish', () => {
    const text = pdfText(
      answerKeyDocument(withDepths(), { version: 'T', locale: 'es' })
    );
    expect(text).toMatch(/corrección, peso 2/);
    expect(text).toMatch(/razonamiento, peso 1, desde la profundidad avanzada/);
    expect(text).toMatch(/Cada criterio dice qué afirma/);
  });

  test('a key for one depth leaves out a criterion marked from a deeper one', () => {
    const deep = withDepths();
    const core = pdfText(
      answerKeyDocument(deep, { version: 'T', depth: 'core' })
    );
    expect(core).toMatch(/Reaches the right answer/);
    expect(core).not.toMatch(/Uses what was measured/);
    const adv = pdfText(
      answerKeyDocument(deep, { version: 'T', depth: 'advanced' })
    );
    expect(adv).toMatch(/Uses what was measured/);
  });
});

describe('the review panel says the kind as a word, in both languages', () => {
  test.each(CRITERION_KINDS)('sub.judge.kind.%s', kind => {
    const id = `sub.judge.kind.${kind}`;
    expect(typeof EN_SUBMISSIONS[id]).toBe('string');
    expect(typeof ES_SUBMISSIONS[id]).toBe('string');
    expect(ES_SUBMISSIONS[id]).not.toBe('');
  });
});
