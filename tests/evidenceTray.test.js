// =============================================================================
// The evidence tray beside a written answer
// -----------------------------------------------------------------------------
// A short-answer step shows the student's own readings and revealed predictions
// as a read-only disclosure: nothing is placed in the box, nothing is required,
// a prediction appears only after its reveal and the authored answer never
// does. The list of steps that carry a tray is generated from the lesson data
// (tools/evidence-tray-list.mjs, docs/evidence-tray.md) by the rule the screen
// runs, `citable` in js/investigations/evidence.js.
// =============================================================================

import { afterEach, beforeEach, describe, expect, test } from '@jest/globals';
import { execFileSync } from 'node:child_process';
import { INVESTIGATIONS } from '../js/data/investigations.js';
import { citable } from '../js/investigations/evidence.js';
import { CITES } from '../js/investigations/trayCites.js';
import * as reveal from '../js/investigations/reveal.js';
import {
  bindStepInputs,
  revealModule,
  slots,
  stepMarkup,
} from '../js/investigations/stepView.js';
import { registerMessages } from '../js/i18n/index.js';
import { EN_DEFERRED } from '../js/i18n/en.deferred.js';
import { EN_TRAY } from '../js/i18n/en.tray.js';
import { ES_TRAY } from '../js/i18n/es.tray.js';
import { stepKey } from '../js/investigations/progressSchema.js';
import { trayRows } from '../tools/evidence-tray-list.mjs';

registerMessages('en', EN_DEFERRED);

const LESSON = 'fixture-tray';
const KEY = 'The authored answer must never be printed.';
const lesson = () => ({
  id: LESSON,
  title: 'Orbit',
  subtitle: 'A fixture',
  steps: [
    {
      sid: 'guess',
      type: 'predict',
      title: 'Pick',
      body: 'b',
      prompt: 'Longer or shorter?',
      options: ['Longer', 'Shorter'],
      answer: 1,
      because: KEY,
      reveal: 'result',
    },
    {
      sid: 'guess-n',
      type: 'predict',
      kind: 'estimate',
      title: 'Estimate',
      body: 'b',
      prompt: 'How long?',
      unit: 'd',
      range: true,
      reveal: 'result',
    },
    {
      sid: 'read',
      type: 'measure',
      title: 'Measure',
      body: 'm',
      fields: [
        { id: 'p', label: 'Period', unit: 'd' },
        { id: 'q', label: 'Ratio' },
        { id: 'auto', label: 'Derived', compute: () => 1 },
        { id: 'name', label: 'Name', kind: 'text' },
      ],
    },
    {
      sid: 'result',
      type: 'read',
      title: 'What you found',
      body: 'r',
      evidence: [{ step: 'read', field: 'p' }],
      compare: 'The authored sentence.',
    },
    {
      sid: 'why',
      type: 'question',
      kind: 'short',
      title: 'Say why',
      body: 'w',
      prompt: 'Explain it.',
      because: 'A model answer.',
      rubric: 'Look for the cause, not the symptom.',
      rubricCriteria: [{ name: 'Cause', levels: ['Named', 'Not named'] }],
    },
    {
      sid: 'late',
      type: 'predict',
      title: 'Later',
      body: 'b',
      prompt: 'Again?',
      options: ['Yes', 'No'],
      answer: 0,
      reveal: 'end',
    },
    { sid: 'end', type: 'read', title: 'End', body: 'e' },
  ],
});
const key = sid => stepKey(LESSON, sid);

describe('what a written answer could cite', () => {
  const l = lesson();
  const why = l.steps[4];

  test('numbers the student reads or types, from the steps before it, by step and field', () => {
    expect(citable(l.steps, why)).toEqual({
      readings: [
        { step: 'read', field: 'p' },
        { step: 'read', field: 'q' },
      ],
      predictions: [
        { step: 'guess', reveal: 'result' },
        { step: 'guess-n', reveal: 'result' },
      ],
    });
  });

  test('a prediction whose reveal comes after the answer is not offered', () => {
    expect(citable(l.steps, why).predictions.map(p => p.step)).not.toContain(
      'late'
    );
  });

  test('a narrowed question offers only the steps listed', () => {
    expect(citable(l.steps, why, ['guess'])).toEqual({
      readings: [],
      predictions: [{ step: 'guess', reveal: 'result' }],
    });
  });

  test('a step that is not a short answer, or comes first, has nothing', () => {
    expect(citable(l.steps, l.steps[3])).toEqual({
      readings: [],
      predictions: [],
    });
    const first = { ...why };
    expect(citable([first], first)).toEqual({
      readings: [],
      predictions: [],
    });
  });
});

describe('the tray on screen', () => {
  let body;
  let responses;
  let visited;
  let l;
  let at;
  const ctx = step => ({
    id: key(step.sid),
    saved: responses[key(step.sid)],
    active: l,
    responses,
    visited,
    shown: () => l.steps,
    predictionAnsweredHere: () => null,
    recomputeFields: () => {},
  });
  const host = () => ({
    els: () => ({ body }),
    responses: () => responses,
    attempts: () => ({}),
    stepId: () => key(l.steps[at].sid),
    currentStep: () => l.steps[at],
    steps: () => l.steps,
    save: () => {},
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
  const said = () => document.getElementById('srStatus').textContent.trim();

  beforeEach(() => {
    document.body.innerHTML =
      '<div id="srStatus" aria-live="polite"></div><div id="body"></div>';
    body = document.getElementById('body');
    responses = {};
    visited = new Set();
    l = lesson();
    revealModule(reveal);
  });
  afterEach(() => {
    slots.reveal = null;
  });

  test('the tray module is fetched with the first short answer, and the step is drawn again with it', async () => {
    go('why');
    expect(body.querySelector('[data-tray]')).toBeNull();
    await new Promise(r => setTimeout(r, 100));
    expect(body.querySelector('[data-tray]')).not.toBeNull();
  });

  test('a lesson step with nothing before it offers no tray', () => {
    l = { ...lesson(), steps: [lesson().steps[4]] };
    go('why');
    expect(body.querySelector('[data-tray]')).toBeNull();
    expect(body.querySelector('[data-answer]')).not.toBeNull();
  });

  test('the step draws without it until its module has arrived', () => {
    slots.reveal = null;
    go('why');
    expect(body.querySelector('[data-tray]')).toBeNull();
    expect(body.querySelector('[data-answer]')).not.toBeNull();
  });

  test('lists only what the student produced, with where it came from and where it was taken', () => {
    responses[`${key('read')}:p`] = '3.2';
    responses[`${key('read')}:p:src`] = JSON.stringify({
      k: 'c',
      r: 'period',
      l: 'Period readout',
      b: 'Kepler Star',
      t: 86400 * 3,
    });
    responses[`${key('read')}:q`] = '1.5';
    responses[`${key('read')}:q:src`] = JSON.stringify({ k: 't', r: 'q' });
    responses[`${key('read')}:auto`] = '99';
    visited.add('read');
    go('why');
    const rows = [...body.querySelectorAll('.inv-tray-row')];
    expect(rows).toHaveLength(2);
    expect(rows[0].textContent).toMatch(/Your reading, Period: 3\.2\sd/);
    expect(rows[0].textContent).toContain('Taken from Period readout.');
    expect(rows[0].textContent).toContain('Body: Kepler Star.');
    expect(rows[0].textContent).toContain('Simulation clock:');
    expect(rows[0].textContent).toContain('In “Measure”.');
    expect(rows[1].textContent).toContain('Your reading, Ratio: 1.5');
    expect(rows[1].textContent).toContain('Typed by you.');
    expect(body.textContent).not.toContain('99');
    // The instructor's rubric stays the instructor's.
    expect(body.textContent).not.toContain('Look for the cause');
    expect(body.textContent).not.toContain('Cause');
    expect(body.querySelector('[data-tray] summary').textContent).toContain(
      '2'
    );
    expect(
      body.querySelector('[data-tray] .inv-verdict-head').textContent
    ).toMatch(/Saved on this device; the scene they came from is not/);
  });

  test('a field left empty is not listed, and an empty tray says what will appear', () => {
    go('why');
    expect(body.querySelectorAll('.inv-tray-row')).toHaveLength(0);
    expect(body.querySelector('[data-tray]').textContent).toContain(
      'Nothing to cite yet'
    );
  });

  test('a prediction is not shown until its reveal step has been reached, and never with the key', () => {
    responses[key('guess')] = 0;
    responses[key('guess-n')] = '3;5';
    responses[`${key('read')}:p`] = '4';
    go('why');
    expect(body.textContent).not.toContain('You predicted');
    expect(body.textContent).not.toContain('You estimated');
    visited.add('result');
    go('why');
    const text = body.querySelector('[data-tray]').textContent;
    expect(text).toContain('You predicted: Longer');
    expect(text).toContain('That is not what happened.');
    expect(text).toContain('You estimated: 3 to 5 d');
    expect(text).toContain('Your reading is inside the range you gave.');
    expect(text).not.toContain('Shorter');
    expect(text).not.toContain(KEY);
    expect(text).not.toContain('The authored sentence.');
  });

  test('a matching choice says so in the engine’s own words', () => {
    responses[key('guess')] = 1;
    visited.add('result');
    go('why');
    expect(body.querySelector('[data-tray]').textContent).toContain(
      'That is what happened.'
    );
  });

  test('Cite places nothing in the answer, moves to it and says so', () => {
    responses[`${key('read')}:p`] = '3.2';
    responses[key('why')] = 'my words';
    visited.add('read');
    go('why');
    const area = body.querySelector('[data-answer]');
    const before = area.value;
    const cite = body.querySelector('[data-cite]');
    cite.click();
    expect(area.value).toBe(before);
    expect(responses[key('why')]).toBe('my words');
    expect(document.activeElement).toBe(area);
    expect(said()).toContain('Nothing was added to your answer');
    expect(said()).toMatch(/Your reading, Period: 3\.2\sd/);
  });

  test('the disclosure and its buttons are native controls with names', () => {
    responses[`${key('read')}:p`] = '3.2';
    go('why');
    const tray = body.querySelector('[data-tray]');
    expect(tray.tagName).toBe('DETAILS');
    expect(tray.querySelector('summary').textContent.trim()).not.toBe('');
    const button = tray.querySelector('button[data-cite]');
    const ids = button.getAttribute('aria-labelledby').split(' ');
    expect(ids).toHaveLength(2);
    for (const id of ids) expect(document.getElementById(id)).not.toBeNull();
    // After the prompt, in reading order.
    const prompt = body.querySelector('.inv-prompt');
    expect(
      prompt.compareDocumentPosition(tray) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  test('it is shut on a phone and open elsewhere, until the student chooses', () => {
    responses[`${key('read')}:p`] = '3.2';
    const was = globalThis.matchMedia;
    globalThis.matchMedia = q => ({ matches: /max-width/.test(q) });
    go('why');
    expect(body.querySelector('[data-tray]').open).toBe(false);
    globalThis.matchMedia = () => ({ matches: false });
    go('why');
    expect(body.querySelector('[data-tray]').open).toBe(true);
    globalThis.matchMedia = was;
  });
});

describe('the list of steps with a tray', () => {
  test('every step a narrowed question names is a step of the same lesson, before it, and the question is a short answer', () => {
    for (const [id, questions] of Object.entries(CITES)) {
      const inv = INVESTIGATIONS.find(i => i.id === id);
      expect(inv).toBeDefined();
      for (const [sid, cites] of Object.entries(questions)) {
        const at = inv.steps.findIndex(s => s.sid === sid);
        expect(inv.steps[at].kind).toBe('short');
        for (const c of cites) {
          const i = inv.steps.findIndex(s => s.sid === c);
          expect(i).toBeGreaterThanOrEqual(0);
          expect(i).toBeLessThan(at);
        }
      }
    }
  });

  test('every narrowed question still has something to offer', () => {
    for (const r of trayRows().filter(r => r.cite))
      expect(r.readings.length + r.predictions.length).toBeGreaterThan(0);
  });

  test('it lists every short-answer step and the table is current', () => {
    const shorts = INVESTIGATIONS.flatMap(i =>
      i.steps.filter(s => s.kind === 'short')
    );
    expect(trayRows()).toHaveLength(shorts.length);
    expect(() =>
      execFileSync('node', ['tools/evidence-tray-list.mjs', '--check'], {
        stdio: 'pipe',
      })
    ).not.toThrow();
  });
});

describe('the words', () => {
  test('English and Spanish carry the same keys', () => {
    expect(Object.keys(ES_TRAY).sort()).toEqual(Object.keys(EN_TRAY).sort());
    for (const k of Object.keys(EN_TRAY)) expect(ES_TRAY[k]).toBeTruthy();
  });
});
