/**
 * @jest-environment jsdom
 */
// =============================================================================
// Saved work under the steps Integrators in Practice and Extending an Experiment
// retired
// -----------------------------------------------------------------------------
// A progress record made when the two lessons asked for one fixed second run
// (answers under `halve-the-step`, `move-the-definition` and `what-moved-it`) is
// read by the revised lessons: the answers under the retired steps are kept as
// answers from an earlier version, named with the step they went to, and never
// read as an answer to a live step; the steps that kept their task keep their
// answers; and saving after reading loses no key. The reader and the rule are
// js/investigations/progressSchema.js and tests/taskChangeContract.test.js.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import { INVESTIGATIONS } from '../js/data/investigations.js';
import { withAllDepths } from '../js/investigations/depthAll.js';
import {
  readProgress,
  writeProgress,
} from '../js/investigations/progressSchema.js';
import { earlierAnswers, wasIn } from '../js/investigations/stepView.js';

const record = (lesson, stepSid, responses, attempts = {}) => ({
  schema: 2,
  lesson,
  stepSid,
  responses,
  attempts,
  visited: [stepSid],
  startedAt: '2026-10-01T00:00:00.000Z',
});

const lessonOf = id => withAllDepths(INVESTIGATIONS.find(l => l.id === id));

describe('Integrators in Practice', () => {
  const L = lessonOf('integrators-in-practice');
  const P = 'integrators-in-practice';
  const SAVED = record(P, 'the-engine', {
    [`${P}:which-loses-most`]: 0,
    [`${P}:four-drifts:euler`]: '49.75',
    [`${P}:four-drifts:verlet`]: '0.001768',
    [`${P}:halve-the-step:verlet`]: '0.000442',
    [`${P}:halve-the-step:rk4`]: '-2.44e-9',
    [`${P}:halve-the-step:ratioVerlet`]: '4.0',
    [`${P}:halve-the-step:ratioRk4`]: '26.5',
    [`${P}:the-engine:verlet`]: '0.002304',
    [`${P}:phase-luck`]: 0,
  });
  const read = readProgress(SAVED, L);

  test('the answers under the retired step are set aside; every other answer is kept', () => {
    for (const key of [
      `${P}:which-loses-most`,
      `${P}:four-drifts:euler`,
      `${P}:four-drifts:verlet`,
      `${P}:the-engine:verlet`,
      `${P}:phase-luck`,
    ])
      expect(read.responses[key]).toBe(SAVED.responses[key]);
    expect(Object.keys(read.earlier.responses).sort()).toEqual(
      Object.keys(SAVED.responses)
        .filter(k => k.includes(':halve-the-step:'))
        .sort()
    );
    // None of the old values is read as an answer to the step that replaced it.
    expect(
      Object.keys(read.responses).filter(k =>
        k.includes('choose-the-second-step')
      )
    ).toEqual([]);
  });

  test('the earlier answer names the step it went to and says in both languages what it asked', () => {
    const rows = earlierAnswers(L, read.earlier.responses);
    expect(rows.map(r => [r.id, r.r.to])).toEqual([
      ['halve-the-step', 'choose-the-second-step'],
    ]);
    expect(rows[0].text).toMatch(/0\.000442/);
    expect(wasIn(rows[0].r.was, 'en')).toMatch(/1000 steps/);
    expect(wasIn(rows[0].r.was, 'es')).toMatch(/1000 pasos/);
    expect(L.steps.map(s => s.sid)).toContain(rows[0].r.to);
  });

  test('saving after reading loses no saved key, and the next read sets the same answers aside', () => {
    const back = writeProgress({ lesson: L, ...read, depth: 'core' });
    expect(Object.keys(back.responses).sort()).toEqual(
      Object.keys(SAVED.responses).sort()
    );
    expect(Object.keys(readProgress(back, L).earlier.responses).sort()).toEqual(
      Object.keys(read.earlier.responses).sort()
    );
  });
});

describe('Extending an Experiment', () => {
  const L = lessonOf('extending-an-experiment');
  const P = 'extending-an-experiment';
  const SAVED = record(P, 'what-moved-it', {
    [`${P}:the-fit:edge`]: '0.255',
    [`${P}:a-uniform-population:extended`]: '0.451',
    [`${P}:why-the-sample-differs`]: 0,
    [`${P}:move-the-definition:edge`]: '0.289',
    [`${P}:move-the-definition:extended`]: '0.701',
    [`${P}:what-moved-it`]: 0,
  });
  const read = readProgress(SAVED, L);

  test('the cutoff-6 answers and the old "what moved it" choice are an earlier version; the rest stay', () => {
    for (const key of [
      `${P}:the-fit:edge`,
      `${P}:a-uniform-population:extended`,
      `${P}:why-the-sample-differs`,
    ])
      expect(read.responses[key]).toBe(SAVED.responses[key]);
    expect(
      Object.keys(read.earlier.responses)
        .map(k => k.split(':')[1])
        .sort()
    ).toEqual(['move-the-definition', 'move-the-definition', 'what-moved-it']);
    expect(read.responses[`${P}:what-moved-it`]).toBeUndefined();
  });

  test('each earlier answer names its successor, and both languages say what it asked', () => {
    const rows = earlierAnswers(L, read.earlier.responses);
    expect(rows.map(r => [r.id, r.r.to])).toEqual([
      ['move-the-definition', 'move-the-definition-yours'],
      ['what-moved-it', 'which-trial-moved'],
    ]);
    expect(wasIn(rows[0].r.was, 'en')).toMatch(/cutoff to 6/);
    expect(wasIn(rows[0].r.was, 'es')).toMatch(/umbral en 6/);
    for (const r of rows) expect(L.steps.map(s => s.sid)).toContain(r.r.to);
  });

  test('saving after reading loses no saved key', () => {
    const back = writeProgress({ lesson: L, ...read, depth: 'core' });
    expect(Object.keys(back.responses).sort()).toEqual(
      Object.keys(SAVED.responses).sort()
    );
  });
});
