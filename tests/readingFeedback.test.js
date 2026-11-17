// =============================================================================
// Feedback for wrong readings, and the attempts record used
// -----------------------------------------------------------------------------
// A measure field's author names the slips a reading invites (`fields[].misconceptions`)
// through the one matcher of js/answerFeedback.js: by value against the field's expected
// value, or by how the reading was taken (the provenance of js/investigations/figures.js).
// A slip is announced politely only after a reading is taken or focus leaves the fields,
// once per distinct value set; it never states a value; the attempts count and the slip
// reach both writers of the report; the generated ladder stays asleep.
// =============================================================================

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  jest,
  test,
} from '@jest/globals';
import * as figures from '../js/investigations/figures.js';
import {
  bindStepInputs,
  fieldModule,
  slots,
  stepMarkup,
} from '../js/investigations/stepView.js';
import { matchMisconception } from '../js/answerFeedback.js';
import { hintLadder } from '../js/answerFeedback.js';
import { INVESTIGATIONS } from '../js/data/investigations.js';
import { withAllDepths } from '../js/investigations/depthAll.js';
import { generatedLadder } from '../js/investigations/recovery.js';
import { cueFindings } from '../tools/authoring/cueRules.mjs';
import { buildLabReport } from '../js/labReport.js';
import { createHtmlDocument } from '../js/htmlReport.js';
import { EN_REPORT } from '../js/i18n/en.report.js';
import { ES_REPORT } from '../js/i18n/es.report.js';
import { decodeEntities } from '../js/lessonMarkup.js';
import { registerMessages } from '../js/i18n/index.js';
import { EN_DEFERRED } from '../js/i18n/en.deferred.js';
import { ES_DEFERRED } from '../js/i18n/es.deferred.js';
import { answerKeyFor } from '../js/answerKey.js';

registerMessages('en', EN_DEFERRED);
registerMessages('es', ES_DEFERRED);

// --- The matcher ------------------------------------------------------------

describe('the matcher, extended to a measure field', () => {
  const field = (rules, answer = 10) => ({ misconceptions: rules, answer });

  test('a rule by value fires on a measure field exactly as it does on a question', () => {
    const rules = [
      { id: 'diameter', factor: 2, say: 'That is the full width.' },
    ];
    expect(matchMisconception(field(rules), 20, 0.5)?.id).toBe('diameter');
    expect(matchMisconception(field(rules), 21.5, 0.5)).toBeNull();
    // The same call without a candidate is what it always was.
    expect(
      matchMisconception({ ...field(rules) }, 20, 0.5, undefined)?.message
    ).toBe('That is the full width.');
  });

  test('existing results are unchanged: no answer, no value, no rules, a choice', () => {
    expect(
      matchMisconception(field([{ id: 'x', equals: 3 }], NaN), 3, 1)
    ).toBeNull();
    expect(
      matchMisconception(field([{ id: 'x', equals: 3 }]), NaN, 1)
    ).toBeNull();
    expect(matchMisconception(field([]), 20, 1)).toBeNull();
    expect(matchMisconception(null, 20, 1)).toBeNull();
    expect(
      matchMisconception(
        {
          options: ['a', 'b', 'c'],
          answer: 0,
          misconceptions: [{ id: 'b', option: 1, say: 'S' }],
        },
        1,
        0
      )
    ).toEqual({ id: 'b', message: 'S', factor: 1 });
    expect(
      matchMisconception(field([{ id: 'radiusForDiameter' }]), 5, 0.1)?.factor
    ).toBe(0.5);
  });

  const point = extra => ({
    k: 'c',
    r: 'row',
    x: '1',
    b: 'Mars',
    t: 100,
    ...extra,
  });
  const roles = { Mars: 'inner', Jove: 'outer' };
  const roleOf = n => roles[n] ?? null;
  const judged = (when, src) =>
    matchMisconception(field([{ id: 'w', when, say: 'S' }]), 7, 0.1, {
      src,
      roleOf,
    });

  test('a rule by provenance judges the role, the moment, the setting and the interval', () => {
    expect(judged({ role: 'inner' }, point())?.id).toBe('w');
    expect(judged({ role: ['outer', 'inner'] }, point())?.id).toBe('w');
    expect(judged({ role: 'outer' }, point())).toBeNull();
    expect(judged({ moment: { min: 90, max: 110 } }, point())?.id).toBe('w');
    expect(judged({ moment: { min: 101 } }, point())).toBeNull();
    expect(
      judged({ setting: { zoom: 2 } }, point({ s: { zoom: 2 } }))?.id
    ).toBe('w');
    expect(
      judged({ setting: { zoom: { max: 1 } } }, point({ s: { zoom: 2 } }))
    ).toBeNull();
    expect(
      judged({ setting: { mode: 'rate' } }, point({ s: { mode: 'rate' } }))?.id
    ).toBe('w');
    const span = { k: 's', r: 'flux', x: '5', a: 2, b: 9, n: 8 };
    expect(
      judged({ interval: { from: { max: 3 }, n: { min: 5 } } }, span)?.id
    ).toBe('w');
    expect(judged({ interval: { to: { max: 5 } } }, span)).toBeNull();
  });

  test('every key given must hold; a typed value or a missing record never matches', () => {
    expect(judged({ role: 'inner', moment: { max: 50 } }, point())).toBeNull();
    expect(judged({ role: 'inner' }, { k: 't', r: 'row' })).toBeNull();
    expect(judged({ role: 'inner' }, null)).toBeNull();
    // A role is a body; an interval is not one.
    expect(judged({ role: 'inner' }, { k: 's', n: 3 })).toBeNull();
    expect(judged({ colour: 'red' }, point())).toBeNull();
  });
});

// --- The authoring rule -----------------------------------------------------

describe('the rule on what a slip may say', () => {
  const step = extra => ({
    type: 'measure',
    sid: 's',
    fields: [
      {
        id: 'p',
        label: 'Period',
        want: '4.8',
        source: { probe: 'period' },
        misconceptions: [
          { id: 'twice', factor: 2, say: 'You may have read the diameter.' },
        ],
        ...extra,
      },
    ],
  });
  const models = { p: 4.8 };
  const found = s => cueFindings(s, models, {});

  test('a slip that names itself and no value is clean', () => {
    expect(found(step())).toEqual([]);
  });

  test("fails the field's expected value, a number within tolerance of it, and the step's answer", () => {
    const say = text =>
      step({ misconceptions: [{ id: 'twice', factor: 2, say: text }] });
    for (const text of [
      'The period is 4.8 days.',
      'Closer to 4,9 than that.',
      'About 4.6, then.',
    ])
      expect(found(say(text)).map(f => f.rule)).toEqual(['content/hint-leak']);
    expect(found(say('Take the 7 AU one.'))).toEqual([]);
    const withAnswer = { ...say('The right answer is 12.'), answer: 12 };
    expect(found(withAnswer).map(f => f.rule)).toEqual(['content/hint-leak']);
  });

  test("fails feedback on a measure step that states a field's value", () => {
    const s = { ...step(), feedback: { off: 'Aim for 4.8.' } };
    expect(found(s).map(f => f.rule)).toEqual(['content/hint-leak']);
    expect(
      found({ ...step(), feedback: { off: 'Look again at the plot.' } })
    ).toEqual([]);
  });

  test('refuses a slip declared badly, in words', () => {
    const bad = m =>
      found(step({ misconceptions: [m] }))
        .map(f => f.message)
        .join('|');
    expect(bad({ say: 'x', factor: 2 })).toMatch(/no id/);
    expect(bad({ id: 'a', factor: 2 })).toMatch(/says nothing/);
    expect(bad({ id: 'a', say: 'x' })).toMatch(/no factor, equals or when/);
    expect(bad({ id: 'a', say: 'x', factor: 2, equals: 3 })).toMatch(
      /takes one/
    );
    expect(bad({ id: 'a', say: 'x', when: { colour: 1 } })).toMatch(
      /another key/
    );
    expect(
      bad({ id: 'a', say: 'x', when: { interval: { n: { min: 2 } } } })
    ).toMatch(/no span source/);
    expect(
      found({
        ...step({ source: undefined }),
        fields: [
          {
            id: 'p',
            want: '4.8',
            misconceptions: [{ id: 'a', say: 'x', when: { role: 'r' } }],
          },
        ],
      })
        .map(f => f.message)
        .join('|')
    ).toMatch(/no point source/);
    expect(
      found({
        type: 'measure',
        fields: [
          { id: 'q', misconceptions: [{ id: 'a', say: 'x', factor: 2 }] },
        ],
      })
        .map(f => f.message)
        .join('|')
    ).toMatch(/expected value/);
    const dup = found(
      step({
        misconceptions: [
          { id: 'a', say: 'x', factor: 2 },
          { id: 'a', say: 'y', factor: 3 },
        ],
      })
    );
    expect(dup.map(f => f.message).join('|')).toMatch(/repeats the id/);
  });

  test('a step with no slips is not touched', () => {
    expect(
      found({ type: 'measure', fields: [{ id: 'p', want: '4.8' }] })
    ).toEqual([]);
  });
});

// --- The panel --------------------------------------------------------------

describe('a measure step that names slips', () => {
  let LESSON = 'fx0';
  let counter = 0;
  let responses;
  let attempts;
  let body;
  let visited;
  let saved;
  const bodies = [{ name: 'Mars' }, { name: 'Jove' }];
  const ctx = () => ({
    selected: bodies[0],
    bodies,
    clock: () => 12.5,
    roleOf: b =>
      b?.name === 'Mars' ? 'inner' : b?.name === 'Jove' ? 'outer' : null,
  });
  const step = {
    sid: 'read',
    type: 'measure',
    title: 'Read it',
    body: 'Read the period.',
    probe: () => [{ id: 'period', label: 'Period', value: '3.2504 d' }],
    validate: v => (v.p > 0 ? { level: 'ok', message: 'Noted.' } : null),
    fields: [
      {
        id: 'p',
        label: 'Period',
        unit: 'd',
        want: '3.25',
        source: { probe: 'period' },
        misconceptions: [
          {
            id: 'twice',
            factor: 2,
            say: 'That looks like the time for two orbits.',
          },
          {
            id: 'wrong-planet',
            when: { role: 'outer' },
            say: 'That reading is of another planet.',
          },
        ],
      },
    ],
  };
  const predict = {
    sid: 'pred',
    type: 'predict',
    title: 'P',
    body: 'b',
    reveal: 'read',
  };
  const steps = [predict, step];
  const id = () => `${LESSON}:read`;

  function paint() {
    body.innerHTML = stepMarkup(step, {
      id: id(),
      saved: undefined,
      active: { id: LESSON, steps },
      responses,
      visited,
      shown: () => steps,
      predictionAnsweredHere: () => null,
      recomputeFields: () => {},
    }).join('');
    bindStepInputs(h);
  }
  const host = () => ({
    step,
    id: id(),
    responses,
    probeContext: ctx,
    body,
    save: () => saved++,
    renderStep: () => paint(),
    capture: () => Promise.resolve(true),
    tool: () => null,
  });
  const h = {
    els: () => ({ body }),
    responses: () => responses,
    attempts: () => attempts,
    stepId: id,
    currentStep: () => step,
    steps: () => steps,
    visited: () => visited,
    probeContext: ctx,
    save: () => saved++,
    renderStep: () => paint(),
    refreshMeasurements: () => {},
    importSelection: req => figures.take(host(), req),
  };
  const said = () => document.getElementById('srStatus').textContent.trim();
  const field = () => body.querySelector('[data-field]');
  const type = value => {
    field().value = value;
    field().dispatchEvent(new Event('input', { bubbles: true }));
  };
  const leave = () =>
    body.querySelector('.inv-fields').dispatchEvent(
      new FocusEvent('focusout', {
        bubbles: true,
        relatedTarget: document.body,
      })
    );
  const slip = () => body.querySelector('[data-slip]');

  beforeEach(() => {
    LESSON = `fx${++counter}`;
    document.body.innerHTML =
      '<div id="srStatus" aria-live="polite"></div><div id="body"></div>';
    body = document.getElementById('body');
    responses = { [`${LESSON}:pred`]: 1 };
    attempts = {};
    visited = new Set(['pred']);
    saved = 0;
    fieldModule(figures);
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    slots.field = null;
    jest.restoreAllMocks();
  });

  test('draws the slip line only for a step that declares slips, and hides it', () => {
    paint();
    expect(slip().hidden).toBe(true);
    expect(slip().textContent).toBe('');
    const plain = {
      ...step,
      fields: [{ ...step.fields[0], misconceptions: undefined }],
    };
    expect(
      stepMarkup(plain, {
        id: id(),
        active: { id: LESSON, steps },
        responses,
        visited,
        shown: () => steps,
        predictionAnsweredHere: () => null,
        recomputeFields: () => {},
      }).join('')
    ).not.toContain('data-slip');
  });

  test('typing counts and says nothing; leaving the fields counts once and names the slip', () => {
    paint();
    type('6');
    type('6.5');
    expect(attempts[id()]).toBeUndefined();
    expect(said()).toBe('');
    leave();
    expect(attempts[id()]).toBe(1);
    expect(said()).toBe(
      'That looks like the time for two orbits. You can try again.'
    );
    expect(said()).not.toMatch(/\d/);
    expect(slip().hidden).toBe(false);
    expect(slip().textContent).toBe(said());
    expect(responses[`${id()}:slip`]).toBe('twice');
    // The same set again is not another try.
    leave();
    expect(attempts[id()]).toBe(1);
  });

  test('a changed set is another try; a right one clears the slip and keeps the record', () => {
    paint();
    type('6.5');
    leave();
    type('3.25');
    expect(slip().hidden).toBe(true);
    leave();
    expect(attempts[id()]).toBe(2);
    expect(said()).toBe('');
    expect(slip().hidden).toBe(true);
    expect(responses[`${id()}:slip`]).toBe('twice');
    expect(responses[`${id()}:tries`]).toBeUndefined();
    expect(responses[`${id()}:gen`]).toBeUndefined();
  });

  test('focus moving inside the fields is not leaving them', () => {
    paint();
    type('6.5');
    body.querySelector('.inv-fields').dispatchEvent(
      new FocusEvent('focusout', {
        bubbles: true,
        relatedTarget: body.querySelector('[data-take]'),
      })
    );
    expect(attempts[id()]).toBeUndefined();
  });

  test('a reading taken is a try; a slip judged on provenance is announced with it', () => {
    ctx().bodies; // a role is a body the reading was taken from
    bodies[0] = { name: 'Jove' };
    paint();
    body.querySelector('[data-take="p"]').click();
    expect(responses[`${id()}:p`]).toBe('3.2504');
    expect(attempts[id()]).toBe(1);
    expect(said()).toMatch(/^Reading taken: Period, 3\.2504 d\./);
    expect(said()).toContain(
      'That reading is of another planet. You can try again.'
    );
    expect(slip().textContent).toContain('another planet');
    expect(responses[`${id()}:slip`]).toBe('wrong-planet');
    bodies[0] = { name: 'Mars' };
  });

  test('a value typed over a taken one has no provenance to judge', () => {
    bodies[0] = { name: 'Jove' };
    paint();
    body.querySelector('[data-take="p"]').click();
    type('3.25');
    leave();
    expect(slip().hidden).toBe(true);
    expect(attempts[id()]).toBe(2);
    bodies[0] = { name: 'Mars' };
  });

  test('nothing is counted or said before a governing prediction is committed', () => {
    delete responses[`${LESSON}:pred`];
    paint();
    type('6.5');
    leave();
    expect(attempts[id()]).toBeUndefined();
    expect(said()).toBe('');
    expect(responses[`${id()}:slip`]).toBeUndefined();
  });

  test('a step with no way to judge keeps no count', () => {
    const quiet = {
      ...step,
      validate: undefined,
      fields: [{ ...step.fields[0], misconceptions: undefined }],
    };
    const was = { ...step };
    Object.assign(step, quiet);
    paint();
    type('6.5');
    leave();
    expect(attempts[id()]).toBeUndefined();
    Object.assign(step, was);
  });
});

// --- The report -------------------------------------------------------------

describe('the report reads the attempts record for a measure step', () => {
  const inv = {
    id: 'fxr',
    title: 'Fixture',
    subtitle: '',
    duration: '10 min',
    level: 'x',
    objectives: [],
    steps: [
      {
        sid: 'pred',
        type: 'predict',
        kind: 'choice',
        title: 'Predict',
        body: 'b',
        prompt: 'Which?',
        options: ['a', 'b'],
        answer: 0,
        reveal: 'result',
      },
      {
        sid: 'meas',
        type: 'measure',
        title: 'Measure',
        body: 'b',
        fields: [
          {
            id: 'p',
            label: 'Period',
            unit: 'd',
            want: '3.25',
            misconceptions: [
              { id: 'twice', factor: 2, say: 'That looks like two orbits.' },
            ],
          },
        ],
      },
      { sid: 'result', type: 'read', title: 'Result', body: 'b' },
    ],
  };
  const key = sid => `fxr:${sid}`;
  const build = ({ responses, attempts, visited, createDoc, locale = 'en' }) =>
    buildLabReport({
      ...(createDoc ? { createDoc } : {}),
      locale,
      t: (k, v) =>
        String((locale === 'es' ? ES_REPORT : EN_REPORT)[k] ?? k).replace(
          /\{(\w+)\}/g,
          (w, n) => (v && n in v ? String(v[n]) : w)
        ),
      investigation: inv,
      plot: null,
      name: 'Ada',
      submissionToken: '',
      responses,
      attempts,
      visited,
      startedAt: '2026-09-01T10:00:00.000Z',
      links: [],
      stepIdFor: i => key(inv.steps[i].sid),
      assignment: null,
      binding: null,
      checkAnswer: () => null,
      decodeEntities,
    });
  const worked = {
    responses: {
      [key('pred')]: 1,
      [key('meas:p')]: '3.25',
      [key('meas') + ':p']: '3.25',
      [`${key('meas')}:slip`]: 'twice',
    },
    attempts: { [key('meas')]: 3 },
  };
  const html = (o, locale) =>
    build({ ...o, createDoc: createHtmlDocument, locale });

  test('after the reveal: how many tries, and the slip by name, in the HTML report', () => {
    const out = html({
      ...worked,
      visited: new Set(['pred', 'meas', 'result']),
    });
    expect(out).toContain('answered on try 3');
    expect(out).toContain('That looks like two orbits.');
  });

  test('and in the PDF, as text the page draws', () => {
    const bytes = build({
      ...worked,
      visited: new Set(['pred', 'meas', 'result']),
    });
    const drawn = Buffer.from(bytes).toString('latin1');
    expect(drawn).toContain('answered on try 3');
    expect(drawn).toContain('That looks like two orbits.');
  });

  test('in Spanish the labels follow the language', () => {
    const out = html(
      { ...worked, visited: new Set(['pred', 'meas', 'result']) },
      'es'
    );
    expect(out).toContain('respondido en el intento 3');
  });

  test("a held prediction's steps keep them back until the reveal is reached", () => {
    const before = html({ ...worked, visited: new Set(['pred', 'meas']) });
    expect(before).not.toContain('answered on try');
    expect(before).not.toContain('That looks like two orbits.');
    const open = html({
      ...worked,
      responses: { ...worked.responses, [key('pred')]: undefined },
      visited: new Set(['pred', 'meas']),
    });
    expect(open).not.toContain('answered on try');
  });

  test('one attempt prints no tries row, and the report never prints an outcome class', () => {
    const one = html({
      responses: worked.responses,
      attempts: { [key('meas')]: 1 },
      visited: new Set(['pred', 'meas', 'result']),
    });
    expect(one).not.toContain('answered on try');
    expect(one).not.toMatch(/incorrect|correct,/);
  });

  test('a lesson with no slips and no extra tries prints exactly what it did', () => {
    const plain = html({
      responses: { [key('pred')]: 1 },
      attempts: {},
      visited: new Set(['pred', 'meas', 'result']),
    });
    expect(plain).not.toContain('Slip named');
    expect(plain).not.toContain('Tries');
  });
});

describe("the answer key names a field's slips", () => {
  test('a slip appears by name beside the step, a step without slips is as it was', () => {
    const inv = {
      id: 'fxk',
      title: 't',
      subtitle: '',
      duration: '',
      level: '',
      objectives: [],
      steps: [
        {
          sid: 'a',
          type: 'measure',
          title: 'M',
          body: 'b',
          fields: [
            {
              id: 'p',
              label: 'P',
              want: '3',
              misconceptions: [{ id: 'twice', factor: 2, say: 'Two orbits.' }],
            },
          ],
        },
        {
          sid: 'b',
          type: 'measure',
          title: 'N',
          body: 'b',
          fields: [{ id: 'q', label: 'Q', want: '4' }],
        },
      ],
    };
    const [a, b] = answerKeyFor(inv).entries;
    expect(a.mistakes).toEqual([
      { id: 'twice', option: null, text: 'Two orbits.' },
    ]);
    expect(b.mistakes).toBeUndefined();
  });
});

// --- The ladder stays asleep --------------------------------------------------

describe('the generated ladder', () => {
  test('returns nothing for every shipped measure step and all shipped numeric steps', () => {
    let measure = 0;
    let numeric = 0;
    const given = [];
    for (const inv of Object.values(INVESTIGATIONS)) {
      const all = withAllDepths(inv).steps;
      for (const step of all) {
        const isMeasure = step.type === 'measure';
        if (!isMeasure && step.kind !== 'numeric') continue;
        isMeasure ? measure++ : numeric++;
        if (generatedLadder(step, all, hintLadder(step).length).length)
          given.push(`${inv.id}:${step.sid}`);
      }
    }
    expect(given).toEqual([]);
    expect(measure).toBeGreaterThan(400);
    expect(numeric).toBeGreaterThan(200);
  });
});
