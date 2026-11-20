// =============================================================================
// A prediction meets the student's own evidence
// -----------------------------------------------------------------------------
// An estimate (a value or a range) is held as a choice is: recorded, never
// marked. At the step where the result arrives a box sets it beside the
// student's own readings and says one authored sentence; the lab report prints
// the same rows through both document writers. Nothing here marks an estimate,
// and the readings themselves are never held back.
// =============================================================================

import { afterEach, beforeEach, describe, expect, test } from '@jest/globals';
import {
  estimateFor,
  estimateText,
  fellInside,
  isEstimate,
  readEstimate,
  readingsFor,
} from '../js/investigations/evidence.js';
import * as reveal from '../js/investigations/reveal.js';
import * as ev from '../js/investigations/evidence.js';
import {
  bindStepInputs,
  revealModule,
  slots,
  stepMarkup,
} from '../js/investigations/stepView.js';
import { holdsAnswer, predictionState } from '../js/lesson/held.js';
import { buildLabReport } from '../js/labReport.js';
import { createHtmlDocument } from '../js/htmlReport.js';
import { evidenceProblems } from '../js/authoring/rules.js';
import { entryFor } from '../js/answerKey.js';
import { describe as describeChart } from '../js/plot/describe.js';
import { registerMessages } from '../js/i18n/index.js';
import { EN_DEFERRED } from '../js/i18n/en.deferred.js';
import { EN_REPORT } from '../js/i18n/en.report.js';
import { ES_REPORT } from '../js/i18n/es.report.js';
import { EN_REVEAL } from '../js/i18n/en.reveal.js';
import { ES_REVEAL } from '../js/i18n/es.reveal.js';
import { decodeEntities } from '../js/lessonMarkup.js';
import { stepKey } from '../js/investigations/progressSchema.js';
import { readFileSync } from 'node:fs';

registerMessages('en', EN_DEFERRED);
// The engine hands the module its functions, as it does when a lesson opens.
revealModule(reveal);
slots.reveal = null;

const SENTENCE = 'Closer orbits are quicker, and your reading follows that.';
const LESSON = 'fixture-est';
const lesson = (over = {}) => ({
  id: LESSON,
  title: 'Orbit',
  subtitle: 'A fixture',
  steps: [
    {
      sid: 'guess',
      type: 'predict',
      kind: 'estimate',
      title: 'Estimate',
      body: 'b',
      prompt: 'About how long is the period?',
      unit: 'd',
      range: true,
      reveal: 'result',
      ...over.guess,
    },
    {
      sid: 'read',
      type: 'measure',
      title: 'Measure',
      body: 'm',
      fields: [{ id: 'p', label: 'Period', unit: 'd' }],
    },
    {
      sid: 'result',
      type: 'read',
      title: 'What you found',
      body: 'r',
      evidence: [{ step: 'read', field: 'p' }],
      compare: SENTENCE,
      ...over.result,
    },
  ],
});
const choiceLesson = () => {
  const l = lesson();
  l.steps[0] = {
    sid: 'guess',
    type: 'predict',
    title: 'Pick',
    body: 'b',
    prompt: 'Longer or shorter?',
    options: ['Longer', 'Shorter'],
    answer: 1,
    because: 'Closer means faster.',
    reveal: 'result',
  };
  return l;
};

const key = sid => stepKey(LESSON, sid);

describe('reading an estimate', () => {
  const range = { sid: 'guess', range: true, unit: 'd' };
  const value = { sid: 'guess', unit: 'd' };

  test('a value, a range and a reversed range', () => {
    expect(
      readEstimate(value, { [key('guess')]: '3.5' }, key('guess'))
    ).toMatchObject({
      low: 3.5,
      high: 3.5,
      range: false,
      text: ['3.5'],
    });
    expect(
      readEstimate(range, { [key('guess')]: '3;4' }, key('guess'))
    ).toMatchObject({
      low: 3,
      high: 4,
      text: ['3', '4'],
    });
    expect(
      readEstimate(range, { [key('guess')]: '4;3' }, key('guess'))
    ).toMatchObject({
      low: 3,
      high: 4,
      text: ['3', '4'],
    });
  });

  test('is read in the convention it was typed in', () => {
    const r = {
      [key('guess')]: '3,2;4,1',
      [`${key('guess')}:locale`]: 'es',
    };
    expect(readEstimate(range, r, key('guess'))).toMatchObject({
      low: 3.2,
      high: 4.1,
    });
  });

  test('refuses what is not an estimate', () => {
    for (const raw of ['', 'about 3', '3', '3;4;5', ';4', 7, undefined]) {
      expect(
        readEstimate(range, { [key('guess')]: raw }, key('guess'))
      ).toBeNull();
    }
    expect(
      readEstimate(value, { [key('guess')]: '3;4' }, key('guess'))
    ).toBeNull();
  });

  test('says an estimate in words, with its unit', () => {
    const r = readEstimate(range, { [key('guess')]: '4;3' }, key('guess'));
    expect(estimateText(r, 'd', '{low} to {high}')).toBe('3 to 4 d');
    expect(
      estimateText(
        readEstimate(value, { [key('guess')]: '3.5' }, key('guess')),
        'd',
        ''
      )
    ).toBe('3.5 d');
  });

  test('only a predict step of kind estimate is one', () => {
    expect(isEstimate({ type: 'predict', kind: 'estimate' })).toBe(true);
    expect(isEstimate({ type: 'predict' })).toBe(false);
    expect(isEstimate({ type: 'question', kind: 'estimate' })).toBe(false);
    expect(isEstimate(null)).toBe(false);
  });
});

describe('whether a reading fell inside', () => {
  const est = { range: true, low: 3, high: 4 };
  test('a fact for a range, edges included', () => {
    expect(fellInside(est, 3.25)).toBe(true);
    expect(fellInside(est, 3)).toBe(true);
    expect(fellInside(est, 4)).toBe(true);
    expect(fellInside(est, 4.01)).toBe(false);
    expect(fellInside(est, 2.99)).toBe(false);
  });
  test('nothing to say for a single value, a missing reading or no estimate', () => {
    expect(fellInside({ range: false, low: 3, high: 3 }, 3)).toBeNull();
    expect(fellInside(est, NaN)).toBeNull();
    expect(fellInside(est, undefined)).toBeNull();
    expect(fellInside(null, 3)).toBeNull();
  });
});

describe('the readings a reveal names', () => {
  test('are read from the step and field named, with how they were taken', () => {
    const l = lesson();
    const responses = {
      [`${key('read')}:p`]: '3,2504',
      [`${key('read')}:p:locale`]: 'es',
      [`${key('read')}:p:src`]:
        '{"k":"c","r":"period","x":"3,2504","l":"Period"}',
    };
    const [r] = readingsFor(l.steps[2], l.steps, responses, key);
    expect(r.text).toBe('3,2504');
    expect(r.value).toBeCloseTo(3.2504, 6);
    expect(r.how).toMatchObject({ k: 'c', l: 'Period' });
    expect(r.field.unit).toBe('d');
  });
  test('a reading never taken is an empty one; a field that does not exist is dropped', () => {
    const l = lesson();
    const [r] = readingsFor(l.steps[2], l.steps, {}, key);
    expect(r).toMatchObject({ text: '', how: null });
    expect(Number.isNaN(r.value)).toBe(true);
    const odd = {
      evidence: [
        { step: 'read', field: 'nope' },
        { step: 'gone', field: 'p' },
      ],
    };
    expect(readingsFor(odd, l.steps, {}, key)).toEqual([]);
  });
  test('the prediction that names a reveal step is found', () => {
    const l = lesson();
    expect(estimateFor(l.steps, l.steps[2])).toBe(l.steps[0]);
    expect(estimateFor(l.steps, l.steps[1])).toBeNull();
    expect(
      estimateFor(choiceLesson().steps, choiceLesson().steps[2])
    ).toBeNull();
  });
});

describe('the step on screen, held and revealed', () => {
  let body;
  let responses;
  let attempts;
  let visited;
  let l;
  let at;
  let saved;

  const ctx = step => ({
    id: key(step.sid),
    saved: responses[key(step.sid)],
    active: l,
    responses,
    visited,
    shown: () => l.steps,
    predictionAnsweredHere: s => {
      const from = l.steps.find(x => x.reveal === s.sid);
      if (!from || !Array.isArray(from.options)) return null;
      const chosen = responses[key(from.sid)];
      if (chosen === undefined) return null;
      return {
        chose: from.options[Number(chosen)],
        answer: from.options[from.answer],
        right: Number(chosen) === from.answer,
        because: from.because,
      };
    },
    recomputeFields: () => {},
  });
  const host = () => ({
    els: () => ({ body }),
    responses: () => responses,
    attempts: () => attempts,
    stepId: () => key(l.steps[at].sid),
    currentStep: () => l.steps[at],
    steps: () => l.steps,
    save: () => saved++,
    renderStep: () => paint(),
    refreshMeasurements: () => {},
  });
  function paint() {
    const step = l.steps[at];
    visited.add(step.sid);
    body.innerHTML = stepMarkup(step, ctx(step)).join('');
    bindStepInputs(host());
  }
  const go = sid => {
    at = l.steps.findIndex(s => s.sid === sid);
    paint();
  };
  const typeInto = (el, text) => {
    el.value = text;
    el.dispatchEvent(new Event('input', { bubbles: true }));
  };
  const enter = el =>
    el.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })
    );
  const said = () => document.getElementById('srStatus').textContent.trim();
  const state = () => predictionState(l.steps, l.steps[at], visited, responses);

  beforeEach(() => {
    document.body.innerHTML =
      '<div id="srStatus" aria-live="polite"></div><div id="body"></div>';
    body = document.getElementById('body');
    responses = {};
    attempts = {};
    visited = new Set();
    saved = 0;
    l = lesson();
    revealModule(reveal);
  });
  afterEach(() => {
    slots.reveal = null;
  });

  test('before it is committed the estimate says it is held and names nothing to compare with', () => {
    go('guess');
    expect(state()).toBe('uncommitted');
    const boxes = body.querySelectorAll('[data-est]');
    expect([...boxes].map(b => b.dataset.est)).toEqual(['low', 'high']);
    expect(body.querySelector('[data-est-commit]')).not.toBeNull();
    expect(body.textContent).toContain(
      'stays unmarked until you reach “What you found”'
    );
    expect(body.textContent).not.toMatch(
      /reading|inside|outside|period means/i
    );
    expect(body.textContent).not.toContain(SENTENCE);
    expect(body.querySelector('[data-verdict]')).toBeNull();
    expect(
      body.querySelector('[role="group"]').getAttribute('aria-labelledby')
    ).toBe('invChoicePrompt');
    expect(body.querySelector('#invChoicePrompt')).not.toBeNull();
  });

  test('until the box has arrived the step says so, and the box replaces the line when it does', () => {
    slots.reveal = null;
    go('guess');
    expect(body.querySelector('[data-est]')).toBeNull();
    expect(body.querySelector('[data-est-wait]').textContent).toContain(
      'estimate box is loading'
    );
    revealModule(reveal);
    paint();
    expect(body.querySelector('[data-est-wait]')).toBeNull();
    expect(body.querySelector('[data-est-commit]')).not.toBeNull();
    expect(body.textContent).toContain('Commit your estimate to go on.');
  });

  test('every box is a labelled text input and the commit is a button', () => {
    go('guess');
    for (const b of body.querySelectorAll('[data-est]')) {
      expect(b.tagName).toBe('INPUT');
      expect(b.closest('label')?.textContent).toMatch(
        /Lowest you expect|Highest you expect/
      );
      expect(b.closest('label').textContent).toContain('(d)');
    }
    expect(body.querySelector('[data-est-commit]').tagName).toBe('BUTTON');
  });

  test('a press with a box empty or not a number is refused in words and records nothing', () => {
    go('guess');
    const [low, high] = body.querySelectorAll('[data-est]');
    typeInto(low, '3');
    body.querySelector('[data-est-commit]').click();
    expect(responses[key('guess')]).toBeUndefined();
    expect(said()).toBe('Enter a number in each box.');
    expect(body.querySelector('[data-est-note]').textContent).toBe(
      'Enter a number in each box.'
    );
    expect(document.activeElement).toBe(high);
    typeInto(high, 'about 4');
    enter(high);
    expect(responses[key('guess')]).toBeUndefined();
    expect(state()).toBe('uncommitted');
  });

  test('the chain by keyboard: commit, measure, reveal', () => {
    go('guess');
    const [low, high] = body.querySelectorAll('[data-est]');
    typeInto(low, '3');
    typeInto(high, '4');
    enter(high);
    // Committed: recorded with its convention, held, the boxes locked.
    expect(responses[key('guess')]).toBe('3;4');
    expect(responses[`${key('guess')}:locale`]).toBe('en');
    expect(responses[`${key('guess')}:first`]).toBe('3;4');
    expect(attempts[key('guess')]).toBe(1);
    expect(state()).toBe('committed');
    expect(holdsAnswer(l.steps, l.steps[0], visited)).toBe(true);
    expect(
      [...body.querySelectorAll('[data-est]')].every(b => b.readOnly)
    ).toBe(true);
    expect(body.querySelector('[data-est-commit]')).toBeNull();
    expect(document.activeElement).toBe(
      body.querySelector('[data-est-change]')
    );
    expect(said()).toContain('Your estimate is recorded');
    expect(body.textContent).not.toContain(SENTENCE);
    expect(body.querySelector('[data-verdict]')).toBeNull();

    // The measure step: the student's own readings are open, and nothing says what they mean.
    go('read');
    expect(state()).toBe('committed');
    expect(holdsAnswer(l.steps, l.steps[1], visited)).toBe(true);
    const field = body.querySelector('[data-field]');
    expect(field.readOnly).toBe(false);
    typeInto(field, '3.2504');
    expect(
      responses[key('read:p'.replace(':', ':'))] ??
        responses[`${key('read')}:p`]
    ).toBe('3.2504');
    expect(body.textContent).not.toMatch(/estimate|inside|outside/i);
    expect(body.textContent).not.toContain(SENTENCE);

    // The reveal: a region with a heading, the estimate beside the reading, a fact, the sentence.
    go('result');
    expect(state()).toBe('revealed');
    const box = body.querySelector('[data-verdict]');
    expect(box.getAttribute('role')).toBe('region');
    const heading = body.querySelector(
      `#${box.getAttribute('aria-labelledby')}`
    );
    expect(heading.tagName).toBe('H4');
    expect(box.textContent).toContain('You estimated: 3 to 4 d');
    expect(box.textContent).toContain('Your reading, Period: 3.2504\u00a0d');
    expect(box.textContent).toContain(
      'Your reading is inside the range you gave.'
    );
    expect(box.textContent).toContain(SENTENCE);
    // It is not marked: no right or wrong anywhere.
    expect(box.className).not.toMatch(/is-right|is-wrong/);
    expect(box.textContent).not.toMatch(/correct|wrong|right/i);
    // Announced once on arrival, not on each redraw.
    expect(said()).toContain('You estimated: 3 to 4 d');
    document.getElementById('srStatus').textContent = '';
    paint();
    expect(said()).toBe('');
    // The committed estimate is locked once it is revealed: no way to change it after the fact.
    go('guess');
    expect(body.querySelector('[data-est-change]')).toBeNull();
    expect(body.querySelector('[data-est-commit]')).toBeNull();
  });

  test('a reading outside the range is a fact, not a grade; a single value has no inside', () => {
    visited = new Set(['guess', 'read']);
    responses[key('guess')] = '3;4';
    responses[`${key('read')}:p`] = '5.1';
    go('result');
    expect(body.querySelector('[data-verdict]').textContent).toContain(
      'outside the range you gave'
    );
    l = lesson({ guess: { range: false } });
    responses[key('guess')] = '3.5';
    go('result');
    const text = body.querySelector('[data-verdict]').textContent;
    expect(text).toContain('You estimated: 3.5 d');
    expect(text).not.toMatch(/inside|outside/);
  });

  test('a reading never taken is said so; an estimate never committed leaves its row out', () => {
    visited = new Set(['guess', 'read']);
    go('result');
    const text = body.querySelector('[data-verdict]').textContent;
    expect(text).toContain('Your reading, Period: none recorded');
    expect(text).not.toContain('You estimated');
    expect(text).not.toMatch(/inside|outside/);
  });

  test('a decimal comma is read and shown as typed', () => {
    visited = new Set(['guess', 'read']);
    responses[key('guess')] = '3,0;4,0';
    responses[`${key('guess')}:locale`] = 'es';
    responses[`${key('read')}:p`] = '3,2504';
    responses[`${key('read')}:p:locale`] = 'es';
    go('result');
    const text = body.querySelector('[data-verdict]').textContent;
    expect(text).toContain('3,0 to 4,0 d');
    expect(text).toContain('3,2504\u00a0d');
    expect(text).toContain('inside the range you gave');
  });

  test('how a reading was taken is shown beside it, where there is a record', () => {
    visited = new Set(['guess', 'read']);
    responses[`${key('read')}:p`] = '3.2504';
    responses[`${key('read')}:p:src`] =
      '{"k":"c","r":"period","x":"3.2504","l":"Period"}';
    go('result');
    expect(body.querySelector('[data-verdict]').textContent).toContain(
      'Taken from Period.'
    );
    responses[`${key('read')}:p:src`] = '{"k":"t","r":"period"}';
    paint();
    expect(body.querySelector('[data-verdict]').textContent).toContain(
      'Typed by you.'
    );
  });

  test('the estimate can be changed until its reveal, and the first is kept', () => {
    go('guess');
    const [low, high] = body.querySelectorAll('[data-est]');
    typeInto(low, '3');
    typeInto(high, '4');
    body.querySelector('[data-est-commit]').click();
    body.querySelector('[data-est-change]').click();
    expect(responses[key('guess')]).toBeUndefined();
    expect(state()).toBe('uncommitted');
    // The last numbers are left in the boxes to be edited.
    const boxes = [...body.querySelectorAll('[data-est]')];
    expect(boxes.map(b => b.value)).toEqual(['3', '4']);
    expect(document.activeElement).toBe(boxes[0]);
    typeInto(boxes[0], '2');
    body.querySelector('[data-est-commit]').click();
    expect(responses[key('guess')]).toBe('2;4');
    expect(responses[`${key('guess')}:first`]).toBe('3;4');
    expect(attempts[key('guess')]).toBe(2);
  });

  test('a choice prediction that names evidence shows its verdict, the readings and the sentence', () => {
    l = choiceLesson();
    responses[key('guess')] = 1;
    visited = new Set(['guess', 'read']);
    responses[`${key('read')}:p`] = '3.25';
    go('result');
    const box = body.querySelector('[data-verdict]');
    expect(box.getAttribute('role')).toBe('region');
    expect(box.className).toContain('is-right');
    expect(box.textContent).toContain('You predicted: Shorter');
    expect(box.textContent).toContain('That is what happened.');
    expect(box.textContent).toContain('Your reading, Period: 3.25\u00a0d');
    expect(box.textContent).toContain(SENTENCE);
    expect(box.textContent).not.toContain('You estimated');
  });

  test('a choice that names no evidence is drawn as it always was', () => {
    l = choiceLesson();
    delete l.steps[2].evidence;
    delete l.steps[2].compare;
    responses[key('guess')] = 0;
    visited = new Set(['guess', 'read']);
    go('result');
    expect(body.querySelector('[data-verdict]')).toBeNull();
    const old = body.querySelector('.inv-verdict');
    expect(old.className).toContain('is-wrong');
    expect(old.querySelector('.inv-verdict-head').tagName).toBe('P');
  });

  test('without the reveal module a step is drawn as before', () => {
    slots.reveal = null;
    visited = new Set(['guess', 'read']);
    go('result');
    expect(body.querySelector('[data-verdict]')).toBeNull();
    go('guess');
    expect(body.querySelector('[data-estimate]')).toBeNull();
  });
});

describe('the held test over the new comparison', () => {
  // The whole of what a description or the sound could leak is the comparison and the estimate:
  // nothing of either is in the held description, from the prediction to the step before the reveal.
  const l = lesson();
  const T = Array.from({ length: 200 }, (_, i) => i);
  const dips = T.map(x => 1 - 0.01 * Math.exp(-(((x % 50) - 25) ** 2) / 4));

  test('an estimate prediction holds from its step to the step before its reveal', () => {
    const visited = new Set(['guess']);
    expect(holdsAnswer(l.steps, l.steps[0], visited)).toBe(true);
    visited.add('read');
    expect(holdsAnswer(l.steps, l.steps[1], visited)).toBe(true);
    visited.add('result');
    expect(holdsAnswer(l.steps, l.steps[2], visited)).toBe(false);
    // And what a chart then says is the held description: points and range only, no period.
    const d = describeChart([{ x: T, y: dips }], { held: true });
    expect(d.held).toBe(true);
    expect(d.text).toMatch(/^200 points/);
    expect(d.text).not.toMatch(/repeat|dip|minimum|\d+(\.\d+)? days/i);
  });

  test('nothing drawn before the reveal contains the sentence, the estimate or a verdict', () => {
    const responses = { [key('guess')]: '3;4', [`${key('read')}:p`]: '3.2' };
    for (const [sid, seen] of [
      ['guess', ['guess']],
      ['read', ['guess', 'read']],
    ]) {
      const step = l.steps.find(s => s.sid === sid);
      revealModule(reveal);
      const html = stepMarkup(step, {
        id: key(sid),
        saved: responses[key(sid)],
        active: l,
        responses,
        visited: new Set(seen),
        shown: () => l.steps,
        predictionAnsweredHere: () => null,
        recomputeFields: () => {},
      }).join('');
      slots.reveal = null;
      expect(html).not.toContain(SENTENCE);
      expect(html).not.toContain('data-verdict');
      expect(html).not.toMatch(
        /inside the range|outside the range|You estimated/
      );
    }
  });

  test('the plot component draws its table without asking whether an answer is held', () => {
    const table = readFileSync(
      new URL('../js/plot/table.js', import.meta.url),
      'utf8'
    );
    expect(table).not.toMatch(
      /HELD_ATTRIBUTE|holdsAnswer|heldNow|data-answer-held/
    );
    const select = readFileSync(
      new URL('../js/plot/select.js', import.meta.url),
      'utf8'
    );
    expect(select).not.toMatch(
      /HELD_ATTRIBUTE|holdsAnswer|heldNow|data-answer-held/
    );
  });
});

describe('the lab report prints the same rows through both writers', () => {
  const t = catalog => (id, vars) =>
    String(catalog[id] ?? id).replace(/\{(\w+)\}/g, (w, k) =>
      vars && k in vars ? String(vars[k]) : w
    );
  const run = (inv, responses, { createDoc, locale = 'en', visited } = {}) =>
    buildLabReport({
      investigation: inv,
      name: 'Ada',
      responses,
      attempts: {},
      visited: visited ?? new Set(inv.steps.map(s => s.sid)),
      startedAt: '2026-09-01T10:00:00.000Z',
      stepIdFor: i => stepKey(inv.id, inv.steps[i]?.sid),
      checkAnswer: () => null,
      decodeEntities,
      t: t(locale === 'es' ? ES_REPORT : EN_REPORT),
      locale,
      createDoc,
      ev,
    });
  const recorder = () => {
    const calls = [];
    const make = name =>
      function (...args) {
        calls.push([name, ...args]);
        return this;
      };
    const doc = {};
    for (const n of [
      'heading',
      'paragraph',
      'rule',
      'row',
      'field',
      'bullets',
      'chart',
      'table',
      'pageBreak',
      'space',
    ])
      doc[n] = make(n);
    doc.build = () => calls;
    return { doc, calls };
  };

  const answers = {
    [key('guess')]: '3;4',
    [`${key('guess')}:locale`]: 'en',
    [`${key('read')}:p`]: '3.2504',
  };

  test('only the builder’s own calls, an estimate and its unit, the reading and the sentence', () => {
    const { doc, calls } = recorder();
    run(lesson(), answers, { createDoc: () => doc });
    const names = new Set(calls.map(c => c[0]));
    // Only calls the builders share: the accessible writer has every one of them.
    const real = createHtmlDocument({ title: 't', footer: 'f', lang: 'en' });
    for (const n of names) expect(typeof real[n]).toBe('function');
    const text = calls
      .map(c =>
        c
          .slice(1)
          .filter(a => typeof a === 'string')
          .join(' | ')
      )
      .join('\n');
    expect(text).toContain(
      'Prediction: About how long is the period? | 3 to 4 d'
    );
    expect(text).toContain('Your reading: Period | 3.2504 d');
    expect(text).toContain('The reading is inside the range given.');
    expect(text).toContain(SENTENCE);
  });

  test('the accessible HTML report carries them too', () => {
    const html = run(lesson(), answers, { createDoc: createHtmlDocument });
    expect(html).toContain('3 to 4 d');
    expect(html).toContain('Your reading: Period');
    expect(html).toContain('3.2504 d');
    expect(html).toContain('inside the range given');
    expect(html).toContain(SENTENCE);
  });

  test('and so does the PDF', () => {
    const bytes = run(lesson(), answers);
    expect(Buffer.from(bytes.slice(0, 5)).toString()).toBe('%PDF-');
  });

  test('the sentence waits for the reveal, in the report as on screen', () => {
    const { doc, calls } = recorder();
    run(lesson(), answers, {
      createDoc: () => doc,
      visited: new Set(['guess', 'read']),
    });
    const text = JSON.stringify(calls);
    expect(text).not.toContain(SENTENCE);
    expect(text).not.toContain('inside the range given');
    expect(text).toContain('not reached');
  });

  test('a prediction that was never committed reads as none, and an old choice prediction is as it was', () => {
    const { doc, calls } = recorder();
    run(lesson(), {}, { createDoc: () => doc });
    expect(JSON.stringify(calls)).toContain('(no prediction)');
    const c = recorder();
    const inv = choiceLesson();
    run(
      inv,
      { [key('guess')]: 1, [`${key('read')}:p`]: '3.2' },
      { createDoc: () => c.doc }
    );
    const text = JSON.stringify(c.calls);
    expect(text).toContain('Shorter');
    expect(text).toContain('Your reading: Period');
    // No evidence declared: not a row more than before.
    delete inv.steps[2].evidence;
    delete inv.steps[2].compare;
    const d = recorder();
    run(
      inv,
      { [key('guess')]: 1, [`${key('read')}:p`]: '3.2' },
      { createDoc: () => d.doc }
    );
    expect(JSON.stringify(d.calls)).not.toContain('Your reading');
  });

  test('the completion code reads the estimate as the text typed, and the choice lines are as they were', () => {
    const a = run(lesson(), answers, { createDoc: createHtmlDocument });
    const b = run(
      lesson(),
      { ...answers, [key('guess')]: '3;5' },
      { createDoc: createHtmlDocument }
    );
    expect(a).not.toBe(b);
    const inv = choiceLesson();
    const noEvidence = JSON.parse(JSON.stringify(inv));
    delete noEvidence.steps[2].evidence;
    delete noEvidence.steps[2].compare;
    const sub = r => r.match(/[A-Z0-9]{4,}-[A-Z0-9-]+/g);
    const withE = run(
      inv,
      { [key('guess')]: 1 },
      { createDoc: createHtmlDocument }
    );
    const without = run(
      noEvidence,
      { [key('guess')]: 1 },
      { createDoc: createHtmlDocument }
    );
    expect(sub(withE)).toEqual(sub(without));
  });

  test('the Spanish report has every new key', () => {
    for (const k of ['rp.range', 'rp.reading', 'rp.inside', 'rp.outside']) {
      expect(ES_REPORT[k]).toBeTruthy();
      expect(ES_REPORT[k]).not.toBe(EN_REPORT[k]);
    }
    const { doc, calls } = recorder();
    run(lesson(), answers, { createDoc: () => doc, locale: 'es' });
    expect(JSON.stringify(calls)).toContain('3 a 4 d');
  });
});

describe('the words', () => {
  test('both languages carry the same keys and the same placeholders', () => {
    expect(Object.keys(ES_REVEAL).sort()).toEqual(
      Object.keys(EN_REVEAL).sort()
    );
    const holes = s => (String(s).match(/\{\w+\}/g) || []).sort();
    for (const k of Object.keys(EN_REVEAL))
      expect(holes(ES_REVEAL[k])).toEqual(holes(EN_REVEAL[k]));
  });
});

describe('the authoring rule', () => {
  const problems = (over = {}) => {
    const l = lesson(over);
    return l.steps.flatMap((s, i) => evidenceProblems(s, l.steps, i));
  };
  test('a well-formed estimate and reveal pass', () => {
    expect(problems()).toEqual([]);
    expect(
      evidenceProblems(choiceLesson().steps[0], choiceLesson().steps, 0)
    ).toEqual([]);
  });
  test('an estimate has a unit and no key, and is held for a reveal that names evidence', () => {
    expect(problems({ guess: { unit: undefined } })).toEqual([
      'an estimate names its unit',
    ]);
    expect(problems({ guess: { options: ['a', 'b'] } })[0]).toMatch(
      /never marked/
    );
    expect(problems({ guess: { reveal: undefined } })[0]).toMatch(
      /names its reveal/
    );
    expect(
      problems({ result: { evidence: undefined, compare: undefined } })[0]
    ).toMatch(/names no evidence/);
    expect(problems({ guess: { unit: 'AU' } })[0]).toMatch(
      /estimate is in AU, the first reading in d/
    );
  });
  test('evidence names an earlier field of a measure step, taken after the prediction', () => {
    expect(
      problems({ result: { evidence: [{ step: 'gone', field: 'p' }] } })[0]
    ).toMatch(/not an earlier step/);
    expect(
      problems({ result: { evidence: [{ step: 'read', field: 'q' }] } })[0]
    ).toMatch(/not a field of a measure step/);
    expect(
      problems({ result: { evidence: [{ step: 'guess', field: 'p' }] } })[0]
    ).toMatch(/not a field of a measure step/);
    expect(problems({ result: { evidence: [] } }).join()).toMatch(
      /lists the fields/
    );
    // Evidence on a step no prediction names, or a reading taken before the prediction.
    const l = lesson();
    l.steps[2].evidence = [{ step: 'read', field: 'p' }];
    l.steps[0].reveal = undefined;
    expect(evidenceProblems(l.steps[2], l.steps, 2)[0]).toMatch(
      /belongs to a prediction's reveal step/
    );
    const early = lesson();
    [early.steps[0], early.steps[1]] = [early.steps[1], early.steps[0]];
    expect(evidenceProblems(early.steps[2], early.steps, 2).join()).toMatch(
      /before the prediction/
    );
  });
  test('compare without evidence, and an estimate that is not a prediction', () => {
    expect(
      evidenceProblems({ sid: 'x', type: 'read', compare: 'hm' }, [], 0)[0]
    ).toMatch(/goes with evidence/);
    expect(
      evidenceProblems(
        { sid: 'x', type: 'question', kind: 'estimate' },
        [],
        0
      )[0]
    ).toMatch(/is a prediction/);
  });
});

describe('the instructor’s key', () => {
  test('says an estimate is held and never marked, and what the reveal is set beside', () => {
    const l = lesson();
    const est = entryFor(l.steps[0], 0);
    expect(est.category).toBe('prediction');
    expect(est.estimate).toEqual({ unit: 'd', range: true });
    expect(est.options).toBeUndefined();
    const rev = entryFor(l.steps[2], 2);
    expect(rev.evidence).toEqual({ readings: ['read.p'], compare: SENTENCE });
    // A step that declares neither gains nothing.
    expect(entryFor(l.steps[1], 1).estimate).toBeUndefined();
    expect(entryFor(l.steps[1], 1).evidence).toBeUndefined();
  });
});
