// =============================================================================
// Classroom defects: a typed number that is kept
// -----------------------------------------------------------------------------
// A half-typed number is kept as a draft per step. It must come back when the
// step is shown again, and it must never be an answer: never in `responses`,
// never an attempt, never in a backup or the token that carry `responses`.
// =============================================================================

import { afterEach, beforeEach, describe, expect, test } from '@jest/globals';
import {
  bindPersistence,
  bindStepInputs,
  forgetKept,
  load,
  save,
  sessionProgress,
  stepMarkup,
} from '../js/investigations/stepView.js';
import { readProgress } from '../js/investigations/progressSchema.js';
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
  forgetKept();
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
    forgetKept();
    expect(show().value).toBe('');
    const read = load('tides', lesson);
    expect(read.responses).toEqual({});
    expect(show().value).toBe('0,910');
  });

  test('a draft shows no verdict, and a saved record without one is as it was', () => {
    type(show(), '8');
    expect(body.querySelector('.inv-feedback')).toBeNull();
    // A box the student emptied stays empty on return.
    type(body.querySelector('[data-numeric]'), '');
    expect(show().value).toBe('');
  });

  test('a record saved with nothing typed carries no drafts field', () => {
    save();
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
    // opening another lesson leaves this one's typed text behind
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

describe('the reset button names what it did, in both languages', () => {
  test('three messages each, answers not changed in every one', async () => {
    const { EN_RESET } = await import('../js/i18n/en.reset.js');
    const { ES_RESET } = await import('../js/i18n/es.reset.js');
    const kinds = ['scene', 'tool', 'both'].map(k => `reset.did.${k}`);
    for (const [c, said] of [
      [EN_RESET, /Your answers are not changed\.$/],
      [ES_RESET, /Tus respuestas no cambian\.$/],
    ])
      for (const k of kinds) expect(c[k]).toMatch(said);
    expect(EN_RESET['reset.did.scene']).toMatch(/^The scene is back/);
    expect(EN_RESET['reset.did.tool']).toMatch(/^The instrument is back/);
    expect(EN_RESET['reset.did.both']).toMatch(/^The scene and instrument/);
  });
});
