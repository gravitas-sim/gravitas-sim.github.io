// =============================================================================
// Classroom defects: a typed number that is kept, restart's count of answers
// -----------------------------------------------------------------------------
// A half-typed number is kept as a draft per step. It must come back when the
// step is shown again, and it must never be an answer: never in `responses`,
// never an attempt, never in a backup or the token that carry `responses`.
// Restart asks first, and what it says about the answers it will erase is a
// count of answers, not of every key under a step.
// =============================================================================

import { afterEach, beforeEach, describe, expect, test } from '@jest/globals';
import {
  bindPersistence,
  bindStepInputs,
  forgetDrafts,
  load,
  save,
  sessionProgress,
  stepMarkup,
} from '../js/investigations/stepView.js';
import { readProgress } from '../js/investigations/progressSchema.js';
import { answerCount } from '../js/investigations/finish.js';
import { BOUNDARY } from './compat/boundary.mjs';

const lesson = {
  id: 'tides',
  steps: [
    { sid: 'intro', type: 'read', title: 'Intro', body: 'Read.' },
    {
      sid: 'guess',
      type: 'question',
      kind: 'numeric',
      title: 'Guess',
      body: 'B',
      prompt: 'P',
      answer: 8,
      unit: 'years',
    },
  ],
};
const KEY = 'tides:guess';

let state;
let body;

/** The host the panel gives this module, over a state this test owns. */
function bind() {
  bindPersistence({
    state: () => ({
      active: lesson,
      stepIndex: 1,
      responses: state.responses,
      attempts: state.attempts,
      visited: new Set(['intro', 'guess']),
      startedAt: '2026-11-15T00:00:00.000Z',
      depthChoice: 'core',
      deepest: 'core',
      spent: 0,
      progressNotes: [],
    }),
    authoring: () => false,
    assigned: () => false,
    assignmentKey: () => 'unused',
    els: () => ({ body }),
    clock: () => {},
  });
}

/** Draw the step into the panel and wire its box, as renderStep does. */
function show() {
  body.innerHTML = stepMarkup(lesson.steps[1], {
    id: KEY,
    saved: state.responses[KEY],
    active: lesson,
    responses: state.responses,
    visited: new Set(),
    shown: () => lesson.steps,
    predictionAnsweredHere: () => false,
    recomputeFields: () => {},
  }).join('');
  bindStepInputs({
    els: () => ({ body }),
    responses: () => state.responses,
    attempts: () => state.attempts,
    stepId: () => KEY,
    currentStep: () => lesson.steps[1],
    steps: () => lesson.steps,
    save,
    renderStep: show,
    refreshMeasurements: () => {},
    importSelection: () => {},
  });
  return body.querySelector('[data-numeric]');
}

/** Type into the box the way a person does: one input event per edit. */
function type(box, text) {
  box.value = text;
  box.dispatchEvent(new window.Event('input', { bubbles: true }));
}

const stored = () => sessionProgress.get('gravitas_investigation_tides');

beforeEach(() => {
  state = { responses: {}, attempts: {} };
  body = document.createElement('div');
  document.body.append(body);
  localStorage.clear();
  sessionProgress.clear();
  forgetDrafts();
  bind();
});

afterEach(() => body.remove());

describe('a typed number is kept without being an answer', () => {
  test('it is saved as typed, beside the answers and never among them', () => {
    type(show(), '0,910');
    expect(stored().drafts).toEqual({ [KEY]: '0,910' });
    expect(stored().responses).toEqual({});
    expect(stored().attempts).toEqual({});
    expect(state.responses).toEqual({});
  });

  test('it comes back when the step is shown again', () => {
    type(show(), '7,5');
    expect(show().value).toBe('7,5');
  });

  test('and after the lesson is closed and opened again', () => {
    type(show(), '0,910');
    forgetDrafts();
    expect(show().value).toBe('');
    const read = load('tides', lesson);
    expect(read.responses).toEqual({});
    expect(show().value).toBe('0,910');
  });

  test('a draft shows no verdict, and a saved record without one is as it was', () => {
    type(show(), '8');
    expect(body.querySelector('.inv-feedback')).toBeNull();
    type(body.querySelector('[data-numeric]'), '');
    expect('drafts' in stored()).toBe(false);
  });

  test('Check makes it an answer, once, and the draft is gone', () => {
    const box = show();
    type(box, '8');
    body.querySelector('[data-check-numeric]').click();
    expect(state.responses[KEY]).toBe('8');
    expect(state.attempts[KEY]).toBe(1);
    expect('drafts' in stored()).toBe(false);
    expect(body.querySelector('[data-numeric]').value).toBe('8');
  });

  test('it belongs to the lesson it was typed in', () => {
    type(show(), '3');
    expect(load('other', { id: 'other', steps: [] }) ?? null).toBeNull();
    expect(show().value).toBe('3');
    forgetDrafts();
    expect(show().value).toBe('');
  });

  test('the progress reader of the schema ignores the field', () => {
    type(show(), '3');
    const read = readProgress(stored(), lesson);
    expect(read.responses).toEqual({});
    expect('drafts' in read).toBe(false);
  });

  test('the corpus row says what a 2.0.0 reader does with the field', () => {
    const row = BOUNDARY.find(b => b.id === 'numeric-draft');
    expect(row).toMatchObject({ kind: 'progress-store', expect: 'ignored' });
  });
});

describe('what Restart says it will erase', () => {
  test('an answer is a value under a step or in a measure field', () => {
    expect(
      answerCount({
        'tides:guess': '8',
        'tides:measure:d': '3',
        'tides:measure:p': '4',
      })
    ).toBe(3);
  });

  test('a slider position, a flag, the locale and a first try are not answers', () => {
    expect(
      answerCount({
        'tides:guess': '8',
        'tides:guess:locale': 'en',
        'tides:guess:first': '9',
        'tides:measure:tool:speed': '2',
        'tides:intro:shown': true,
        'tides:measure:help': 2,
        'tides:measure:d': '',
      })
    ).toBe(1);
    expect(answerCount({})).toBe(0);
  });

  test('a choice recorded as the first option counts', () => {
    expect(answerCount({ 'tides:guess': 0 })).toBe(1);
  });
});
