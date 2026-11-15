import { describe, test, expect, beforeAll } from '@jest/globals';
import { readFileSync } from 'node:fs';

import { loadAuthoringInputs } from '../tools/authoring/inputs.mjs';
import { DEPTH_LESSONS, depthSources } from '../js/investigations/depth.js';
import {
  completionFindings,
  makeView,
  openingAccepted,
  referencesIn,
  studentTexts,
  viewFindings,
  LEAK_RULES,
  REPORT_ONLY,
} from '../tools/authoring/standardRules.mjs';
import {
  ACCEPTANCE,
  DECISION_RULE,
  RECORD,
  STANDARD_RULES,
  compare,
  countFindings,
  decisionFindings,
  leakFreeFrom,
  leakFreeProblems,
  recordText,
  standardFindings,
  syncAcceptance,
} from '../tools/lesson-standard.mjs';

// =============================================================================
// The lesson standard as checks (tools/authoring/standardRules.mjs)
// -----------------------------------------------------------------------------
// Each rule is shown a lesson that passes and one that fails, so a rule that
// reports zero is known to be looking. Then the committed ratchet is held to
// the real catalog, and the ratchet itself is shown to fail on a rise and on a
// fall that was not recorded.
// =============================================================================

const ok = (message = 'ok') => ({ level: 'ok', message });
const err = (message = 'no') => ({ level: 'error', message });

/** A lesson of the given steps, laid as a lesson with no deeper steps. */
const lessonOf = (steps, extra = {}) => ({
  id: 'fixture',
  title: 'Fixture',
  steps: steps.map((s, i) => ({
    sid: `s${i + 1}`,
    title: 't',
    body: 'b',
    ...s,
  })),
  ...extra,
});

const rulesOf = (lesson, shadows) =>
  viewFindings(makeView(lesson, shadows)).map(f => f.rule);

describe('leak/instrument-at-answer', () => {
  const near = v => (Math.abs(v.x - 10.9) < 0.5 ? ok() : err());

  test('an instrument that opens at the accepted value is found', () => {
    const step = {
      type: 'measure',
      tool: { id: 'launch', values: { v: 10.9 } },
      fields: [{ id: 'x' }],
      validate: near,
    };
    expect(openingAccepted(step)).toEqual({ x: 10.9 });
    expect(rulesOf(lessonOf([step]))).toContain('leak/instrument-at-answer');
  });

  test('an instrument that opens elsewhere is not', () => {
    const step = {
      type: 'measure',
      tool: { id: 'launch', values: { v: 5 } },
      fields: [{ id: 'x' }],
      validate: near,
    };
    expect(openingAccepted(step)).toBeNull();
    expect(rulesOf(lessonOf([step]))).not.toContain(
      'leak/instrument-at-answer'
    );
  });

  test('a validator that accepts any number is not a leak', () => {
    const step = {
      type: 'measure',
      tool: { id: 'launch', values: { v: 10.9 } },
      fields: [{ id: 'x' }],
      validate: v => (Number.isFinite(v.x) ? ok() : err()),
    };
    expect(openingAccepted(step)).toBeNull();
  });

  test('a field filled from a control of another name, and a computed field', () => {
    const step = {
      type: 'measure',
      tool: { id: 'w', values: { d: 4 } },
      fields: [{ id: 'a' }, { id: 'twice', compute: r => r.a * 2 }],
      validate: v => (Math.abs(v.twice - 8) < 0.1 ? ok() : err()),
    };
    expect(openingAccepted(step)).toEqual({ a: 4 });
  });

  test('a step with no instrument values, or no validator, is not judged', () => {
    expect(
      openingAccepted({ fields: [{ id: 'x' }], validate: near })
    ).toBeNull();
    expect(
      openingAccepted({ tool: { values: { v: 10.9 } }, fields: [{ id: 'x' }] })
    ).toBeNull();
  });

  test('a validator that throws counts as not accepting', () => {
    const step = {
      tool: { values: { v: 1 } },
      fields: [{ id: 'x' }],
      validate: () => {
        throw new Error('needs the live scene');
      },
    };
    expect(openingAccepted(step)).toBeNull();
  });
});

describe('leak/prediction-stated-earlier', () => {
  const predict = extra => ({
    type: 'predict',
    prompt: 'Which?',
    options: [
      'the star sits at one focus of the ellipse',
      'the star sits at the centre',
    ],
    answer: 0,
    because: 'It is a focus.',
    ...extra,
  });

  test('the right option already in an earlier body is found', () => {
    const lesson = lessonOf([
      {
        type: 'read',
        body: 'Note that the star sits at one focus of the ellipse.',
      },
      predict(),
    ]);
    expect(rulesOf(lesson)).toContain('leak/prediction-stated-earlier');
  });

  test('a number of the explanation already in an earlier tip is found', () => {
    const lesson = lessonOf([
      { type: 'read', tip: 'The ratio is 3.5 for these two.' },
      predict({ because: 'The ratio comes out at 3.5.' }),
    ]);
    expect(rulesOf(lesson)).toContain('leak/prediction-stated-earlier');
  });

  test('a checklist counts as earlier text', () => {
    const lesson = lessonOf([
      {
        type: 'explore',
        checklist: ['Notice that the star sits at one focus of the ellipse'],
      },
      predict(),
    ]);
    expect(rulesOf(lesson)).toContain('leak/prediction-stated-earlier');
  });

  test('a prediction asked first, or only after unrelated text, is not', () => {
    expect(
      rulesOf(
        lessonOf([
          predict(),
          {
            type: 'read',
            body: 'Afterwards: it sits at one focus of the ellipse.',
          },
        ])
      )
    ).not.toContain('leak/prediction-stated-earlier');
    expect(
      rulesOf(
        lessonOf([
          { type: 'read', body: 'Orbits are closed curves.' },
          predict(),
        ])
      )
    ).not.toContain('leak/prediction-stated-earlier');
  });

  test('a later text, and a deeper step the student may not see, do not count', () => {
    const deeper = {
      type: 'read',
      depth: 'advanced',
      body: 'The star sits at one focus of the ellipse.',
    };
    const lesson = lessonOf([deeper, predict()]);
    expect(rulesOf(lesson)).not.toContain('leak/prediction-stated-earlier');
  });

  test('it is a report: a rise warns instead of failing', () => {
    expect(REPORT_ONLY.has('leak/prediction-stated-earlier')).toBe(true);
    const rise = compare(
      { 'leak/prediction-stated-earlier': { fixture: 2 } },
      { rules: { 'leak/prediction-stated-earlier': { fixture: 1 } } }
    );
    expect(rise.map(p => p.level)).toEqual(['warn']);
  });
});

describe('task/measure-all-computed', () => {
  const measure = fields => ({ type: 'measure', fields });

  test('a core measure step whose every field is computed is found', () => {
    const lesson = lessonOf([
      measure([
        { id: 'a', compute: () => 1 },
        { id: 'b', compute: () => 2 },
      ]),
    ]);
    expect(rulesOf(lesson)).toContain('task/measure-all-computed');
  });

  test('a step with one typed field is not', () => {
    const lesson = lessonOf([
      measure([{ id: 'a' }, { id: 'b', compute: r => r.a * 2 }]),
    ]);
    expect(rulesOf(lesson)).not.toContain('task/measure-all-computed');
  });

  test('only core depth is judged, and only measure steps', () => {
    const deep = {
      ...measure([{ id: 'a', compute: () => 1 }]),
      depth: 'quantitative',
    };
    expect(rulesOf(lessonOf([deep]))).not.toContain(
      'task/measure-all-computed'
    );
    expect(
      rulesOf(
        lessonOf([
          { type: 'question', fields: [{ id: 'a', compute: () => 1 }] },
        ])
      )
    ).not.toContain('task/measure-all-computed');
  });
});

describe('text/internal-vocabulary', () => {
  const said = (text, where = 'body') =>
    rulesOf(lessonOf([{ type: 'read', [where]: text }]));

  test.each([
    'See Prompt 297 for the details.',
    'The gate verdict was B.',
    'The check was NOT RUN.',
    'Read GAIA_WORKFLOWS.md first.',
    'Leg A1 of the validation agrees.',
    'The distance (E1 NOT RUN) is open.',
  ])('is found in "%s"', text => {
    expect(said(text)).toContain('text/internal-vocabulary');
  });

  test.each([
    'Investigate the gap.',
    'Navigate to the next panel.',
    'Leg of a journey: the first stage.',
    'The documents are in markdown.',
    'Run the program.',
  ])('is not found in "%s"', text => {
    expect(said(text)).not.toContain('text/internal-vocabulary');
  });

  test('it reads a tip, an option, a hint and the Spanish text too', () => {
    expect(said('The gate fell.', 'tip')).toContain('text/internal-vocabulary');
    const lesson = lessonOf([{ type: 'read' }]);
    const es = makeView(lesson, { steps: [{ body: 'Véase Prompt 12.' }] });
    expect(viewFindings(es).map(f => `${f.rule}:${f.lang}`)).toContain(
      'text/internal-vocabulary:es'
    );
  });

  test('an instructor rubric is not student text', () => {
    expect(
      said('Credit a sentence that says NOT RUN.', 'rubric')
    ).not.toContain('text/internal-vocabulary');
    expect(studentTexts({ rubric: 'x', body: 'y' }).map(([w]) => w)).toEqual([
      'body',
    ]);
  });
});

describe('text/step-reference', () => {
  test('what is a reference', () => {
    expect(referencesIn('See step 7 and screen 12.')).toEqual([7, 12]);
    expect(referencesIn('Steps 3 and 5 agree.')).toEqual([3, 5]);
    expect(referencesIn('In step 4, step 4 again.')).toEqual([4]);
    expect(referencesIn('Véase el paso 3 y la pantalla 9.', 'es')).toEqual([
      3, 9,
    ]);
  });

  test('what is not: a time step, a numbered walk-through, a label', () => {
    expect(referencesIn('Run at step 1.0 and at step 0.25')).toEqual([]);
    expect(referencesIn('<strong>Step 1.</strong> Cube it.')).toEqual([]);
    expect(referencesIn('Intro.\n\nStep 2. Square it.')).toEqual([]);
    expect(referencesIn('Paso 1: eleva al cubo.', 'es')).toEqual([]);
    expect(referencesIn('the step 3 times')).toEqual([3]);
  });

  const body = text => ({ type: 'read', body: text });

  test('a reference past the end is found, one inside it is not', () => {
    const lesson = lessonOf([
      body('x'),
      body('Back in step 1.'),
      body('See step 9.'),
    ]);
    const found = viewFindings(makeView(lesson)).filter(
      f => f.rule === 'text/step-reference'
    );
    expect(found.map(f => f.sid)).toEqual(['s3']);
    expect(found[0].message).toMatch(/no step 9/);
  });

  test('a step that names itself is found', () => {
    const lesson = lessonOf([body('x'), body('As in step 2.')]);
    expect(rulesOf(lesson)).toContain('text/step-reference');
  });

  test('a core reference that a deeper step shifts is found', () => {
    const core = [
      body('Come back to step 3.'),
      body('x'),
      body('target'),
      body('end'),
    ];
    const laid = lessonOf([
      core[0],
      body('x'),
      { ...body('inserted'), depth: 'quantitative' },
      body('target'),
      body('end'),
    ]);
    laid.steps[0].body = 'Come back to step 3.';
    const hits = viewFindings(makeView(laid)).filter(
      f => f.rule === 'text/step-reference'
    );
    expect(hits).toHaveLength(1);
    expect(hits[0].message).toMatch(/quantitative/);
    // The same text in a lesson with nothing deeper is a valid reference.
    expect(
      rulesOf(lessonOf(core.slice(0, 1).concat(core.slice(1))))
    ).not.toContain('text/step-reference');
  });

  test('the Spanish text is read', () => {
    const lesson = lessonOf([body('x'), body('y')]);
    const hits = viewFindings(
      makeView(lesson, { steps: [{ body: 'Véase el paso 8.' }, null] })
    ).filter(f => f.rule === 'text/step-reference');
    expect(hits.map(f => f.lang)).toEqual(['es']);
  });
});

describe('leak/question-states-answer', () => {
  const numeric = body => ({
    type: 'question',
    kind: 'numeric',
    answer: 91,
    tolerance: 1,
    prompt: 'How many?',
    body,
  });

  test('a body that holds the answer is found, in either language', () => {
    expect(rulesOf(lessonOf([numeric('You will find 91 of them.')]))).toContain(
      'leak/question-states-answer'
    );
    const hits = viewFindings(
      makeView(lessonOf([numeric('x')]), {
        steps: [{ body: 'Encontrarás 91.' }],
      })
    ).filter(f => f.rule === 'leak/question-states-answer');
    expect(hits.map(f => f.lang)).toEqual(['es']);
  });

  test('a body with other numbers is not, and a choice question is not judged', () => {
    expect(rulesOf(lessonOf([numeric('Use 12 and 40.')]))).not.toContain(
      'leak/question-states-answer'
    );
    expect(
      rulesOf(
        lessonOf([
          {
            type: 'question',
            kind: 'choice',
            options: ['a', 'b'],
            answer: 1,
            body: 'It is 1.',
          },
        ])
      )
    ).not.toContain('leak/question-states-answer');
  });

  test('an entity is not a number', () => {
    expect(
      rulesOf(lessonOf([numeric('Mars&#8217;s moons &mdash; two.')]))
    ).not.toContain('leak/question-states-answer');
  });
});

describe('the ratchet', () => {
  const record = { rules: { 'leak/question-states-answer': { fixture: 2 } } };

  test('equal counts pass', () => {
    expect(
      compare({ 'leak/question-states-answer': { fixture: 2 } }, record)
    ).toEqual([]);
  });

  test('a rise fails', () => {
    const out = compare(
      { 'leak/question-states-answer': { fixture: 3 } },
      record
    );
    expect(out).toHaveLength(1);
    expect(out[0].level).toBe('error');
    expect(out[0].message).toMatch(/allows 2/);
  });

  test('a lesson that was not recorded starts at zero', () => {
    const out = compare(
      { 'leak/question-states-answer': { fixture: 2, other: 1 } },
      record
    );
    expect(out.map(p => p.lesson)).toEqual(['other']);
  });

  test('a fall that was not recorded fails until the record is lowered', () => {
    const out = compare(
      { 'leak/question-states-answer': { fixture: 1 } },
      record
    );
    expect(out).toHaveLength(1);
    expect(out[0].level).toBe('error');
    expect(out[0].message).toMatch(/Lower the record/);
    // The lowered record is what --record writes, and then it passes.
    const lowered = JSON.parse(
      recordText({ 'leak/question-states-answer': { fixture: 1 } })
    );
    expect(
      compare({ 'leak/question-states-answer': { fixture: 1 } }, lowered)
    ).toEqual([]);
  });

  test('a new rule with no record holds zero', () => {
    expect(
      compare({ 'text/step-reference': { fixture: 1 } }, { rules: {} })
    ).toHaveLength(1);
  });

  test('the record is written sorted and without zeros', () => {
    const text = recordText({ b: { z: 1, a: 2, q: 0 }, a: {} });
    const rules = JSON.parse(text).rules;
    expect(Object.keys(rules)).toEqual(['a', 'b']);
    expect(rules.b).toEqual({ a: 2, z: 1 });
  });
});

describe('the acceptance map', () => {
  const text = [
    '{',
    '  "lessons": {',
    '    "one": {',
    '      "test": "e.js",',
    '      "evidenceFrom": "engine"',
    '    },',
    '    "two": {',
    '      "evidenceFrom": "model",',
    '      "decision": "Which star to weigh.",',
    '      "leakFree": true',
    '    }',
    '  }',
    '}',
    '',
  ].join('\n');

  test('decision and leakFree are written once, in the file’s own format', () => {
    const out = syncAcceptance(
      text,
      { one: false, two: false },
      new Set(['one'])
    );
    const parsed = JSON.parse(out).lessons;
    expect(parsed.one).toMatchObject({
      decision: 'unreviewed',
      leakFree: false,
    });
    // A recorded decision is kept and only leakFree is refreshed.
    expect(parsed.two).toMatchObject({
      decision: 'Which star to weigh.',
      leakFree: false,
    });
    expect(
      syncAcceptance(out, { one: false, two: false }, new Set(['one']))
    ).toBe(out);
  });

  test('a lesson without a measure step is "none"', () => {
    const out = syncAcceptance(text, { one: true, two: true }, new Set());
    expect(JSON.parse(out).lessons.one.decision).toBe('none');
  });

  test('leakFree follows the leak rules and no other', () => {
    const counts = {
      'leak/question-states-answer': { a: 1 },
      'text/internal-vocabulary': { b: 1 },
    };
    expect(leakFreeFrom(counts, ['a', 'b', 'c'])).toEqual({
      a: false,
      b: true,
      c: true,
    });
    expect(LEAK_RULES.every(r => r in STANDARD_RULES)).toBe(true);
  });

  test('a recorded leakFree that disagrees with the counts is a problem', () => {
    const acceptance = {
      lessons: { a: { leakFree: true }, b: { leakFree: false } },
    };
    const counts = { 'leak/question-states-answer': { a: 1 } };
    expect(leakFreeProblems(acceptance, counts).map(p => p.lesson)).toEqual([
      'a',
      'b',
    ]);
  });

  test('an unreviewed decision is counted by lesson', () => {
    const f = decisionFindings({
      lessons: {
        a: { decision: 'unreviewed' },
        b: { decision: 'Which moment.' },
      },
    });
    expect(countFindings(f)[DECISION_RULE]).toEqual({ a: 1 });
  });
});

describe('the catalog as it stands', () => {
  let inputs;
  let result;

  beforeAll(async () => {
    inputs = await loadAuthoringInputs();
    result = await standardFindings(inputs, {
      depthSources,
      depthLessons: DEPTH_LESSONS,
    });
  }, 120_000);

  const acceptance = () => JSON.parse(readFileSync(ACCEPTANCE, 'utf8'));
  const record = () => JSON.parse(readFileSync(RECORD, 'utf8'));
  const counts = () =>
    countFindings([...result.findings, ...decisionFindings(acceptance())]);

  test('no lesson has more than its recorded count, and none has fewer unrecorded', () => {
    expect(compare(counts(), record())).toEqual([]);
  });

  test('every recorded rule is a rule that exists', () => {
    for (const rule of Object.keys(record().rules))
      expect(rule in STANDARD_RULES).toBe(true);
  });

  test('a new violation is caught against the seeded record', () => {
    const lesson = inputs.investigations.find(l =>
      l.steps.some(s => s.type === 'read')
    );
    const copy = {
      ...lesson,
      steps: lesson.steps.map((s, i) =>
        i === 0
          ? { ...s, body: `${s.body} Read Prompt 307 and the gate verdict.` }
          : s
      ),
    };
    const extra = viewFindings(makeView(copy)).filter(
      f => f.rule === 'text/internal-vocabulary'
    );
    const next = countFindings([
      ...result.findings,
      ...decisionFindings(acceptance()),
      ...extra,
    ]);
    const problems = compare(next, record());
    expect(
      problems.some(p => p.lesson === lesson.id && p.level === 'error')
    ).toBe(true);
  });

  test('no layout of any lesson ends on a graded step, at core, quantitative or advanced depth', () => {
    expect(result.layouts).toBe(inputs.investigations.length * 3);
    expect(result.layouts).toBe(372);
    expect(
      result.findings.filter(f => f.rule === 'content/completion')
    ).toEqual([]);
    expect(record().rules['content/completion']).toEqual({});
  });

  test('a lesson that ends on a graded step is found at every depth', async () => {
    const lesson = inputs.investigations.find(l => !l.depths);
    const last = lesson.steps.at(-1);
    const bad = {
      ...lesson,
      steps: [...lesson.steps.slice(0, -1), { ...last, type: 'question' }],
    };
    const hits = completionFindings(inputs, bad);
    expect(hits.map(h => h.message.split(' ')[1])).toEqual([
      'core',
      'quantitative',
      'advanced',
    ]);
  });

  test('every lesson has a decision and a leakFree, and one with a measure step does not say none', () => {
    const lessons = acceptance().lessons;
    for (const l of inputs.investigations) {
      const e = lessons[l.id];
      expect(typeof e.decision).toBe('string');
      expect(e.decision.trim()).not.toBe('');
      expect(typeof e.leakFree).toBe('boolean');
      if (l.steps.some(s => s.type === 'measure'))
        expect(e.decision).not.toBe('none');
    }
  });

  test('leakFree agrees with the leak counts', () => {
    expect(leakFreeProblems(acceptance(), counts())).toEqual([]);
  });
});
