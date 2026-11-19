/**
 * @jest-environment jsdom
 */
// =============================================================================
// Saved work under the steps Io's Fire and Tides That Move the Moon retired
// -----------------------------------------------------------------------------
// A progress record made when the two lessons asked for prescribed readings
// (answers under `heating-at-the-maximum`, `double-the-eccentricity`, `the-bound`
// and `the-moons-recession`) is read by the revised lessons: the answers under
// the retired steps are kept as answers from an earlier version, named with the
// step they went to, and never read as an answer to a live step; the prediction
// that was reworded and reordered keeps its answer; and saving after reading
// loses no key. The reader and the rule are js/investigations/progressSchema.js
// and tests/taskChangeContract.test.js.
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

describe('Io’s Fire', () => {
  const L = lessonOf('ios-fire');
  const SAVED = record('ios-fire', 'the-bound', {
    'ios-fire:double-predict': 1,
    'ios-fire:heating-at-the-maximum:power': '9.33',
    'ios-fire:heating-at-the-maximum:power:locale': 'en',
    'ios-fire:heating-at-the-maximum:orbit': '1.43',
    'ios-fire:double-the-eccentricity:power': '3.73',
    'ios-fire:the-bound:need': '0.0177',
  });
  const read = readProgress(SAVED, L);

  test('the answers under retired steps are set aside, and the reworded prediction keeps its own', () => {
    expect(read.responses['ios-fire:double-predict']).toBe(1);
    for (const key of Object.keys(SAVED.responses))
      if (!key.endsWith('double-predict'))
        expect(read.responses[key]).toBeUndefined();
    expect(Object.keys(read.earlier.responses).sort()).toEqual(
      Object.keys(SAVED.responses)
        .filter(k => !k.endsWith('double-predict'))
        .sort()
    );
  });

  test('each earlier answer names the step it went to and says in both languages what it asked', () => {
    const rows = earlierAnswers(L, read.earlier.responses);
    expect(rows.map(r => [r.id, r.r.to])).toEqual([
      ['heating-at-the-maximum', 'heating-at-two-eccentricities'],
      ['double-the-eccentricity', 'heating-at-two-eccentricities'],
      ['the-bound', 'find-the-interiors'],
    ]);
    const maximum = rows.find(r => r.id === 'heating-at-the-maximum');
    expect(maximum.text).toMatch(/9\.33/);
    expect(wasIn(maximum.r.was, 'en')).toMatch(/k2 to 1\.5/);
    expect(wasIn(maximum.r.was, 'es')).toMatch(/k2 en 1,5/);
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

describe('Tides That Move the Moon', () => {
  const L = lessonOf('tides-that-move-the-moon');
  const SAVED = record(
    'tides-that-move-the-moon',
    'forward-predict',
    {
      'tides-that-move-the-moon:the-moons-recession:rate': '3.75',
      'tides-that-move-the-moon:the-moons-recession:day': '2.05',
      'tides-that-move-the-moon:forward-predict': 1,
      'tides-that-move-the-moon:forward-one-billion:a': '414.6',
      'tides-that-move-the-moon:the-model-run-backward:gyr': '1.58',
    },
    { 'tides-that-move-the-moon:forward-predict': 1 }
  );
  const read = readProgress(SAVED, L);

  test('the readings the first step used to take are an earlier version; the steps that kept their task keep their answers', () => {
    expect(read.responses['tides-that-move-the-moon:forward-predict']).toBe(1);
    expect(
      read.responses['tides-that-move-the-moon:forward-one-billion:a']
    ).toBe('414.6');
    expect(
      read.responses['tides-that-move-the-moon:the-model-run-backward:gyr']
    ).toBe('1.58');
    expect(
      Object.keys(read.earlier.responses).map(k => k.split(':')[1])
    ).toEqual(['the-moons-recession', 'the-moons-recession']);
    const [row] = earlierAnswers(L, read.earlier.responses);
    expect(row).toMatchObject({ id: 'the-moons-recession' });
    expect(row.r.to).toBe('match-the-recession');
    expect(wasIn(row.r.was, 'es')).toMatch(/Q en 12/);
  });
});
