/**
 * @jest-environment jsdom
 */
// =============================================================================
// Saved work under the steps the weighing lesson revised
// -----------------------------------------------------------------------------
// A progress record made when Weighing the Stars still asked for its arm
// lengths, its stopwatch reading, its mass ratio, its two masses and its last
// pair's a, P, a^3, P^2 and total under the ids `measurement-one-how-big-is`,
// `measurement-two-how-long-does`, `back-to-the-balance-point`,
// `now-weigh-each-one` and `one-on-your-own` is read by the revised lesson:
// those answers are kept as answers from an earlier version, named with the
// step they went to, and never read as an answer to a live step; the steps
// that kept their task keep their answers; and saving after reading loses no
// key. The reader and the rule are js/investigations/progressSchema.js and
// tests/taskChangeContract.test.js.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import { INVESTIGATIONS } from '../js/data/investigations.js';
import { withAllDepths } from '../js/investigations/depthAll.js';
import {
  readProgress,
  writeProgress,
} from '../js/investigations/progressSchema.js';
import { earlierAnswers, wasIn } from '../js/investigations/stepView.js';

const L = withAllDepths(INVESTIGATIONS.find(l => l.id === 'weighing-stars'));
const key = (sid, more = '') => `weighing-stars:${sid}${more}`;

// What the 3.0 lesson wrote: the five revised steps' fields (the first two
// steps had none beyond the visit), and the answers of steps that did not move.
const SAVED = {
  schema: 2,
  lesson: 'weighing-stars',
  stepSid: 'what-you-can-now-say',
  responses: {
    [key('which-pair-is-quicker')]: 1,
    [key('a-practice-run', ':a')]: '2',
    [key('a-practice-run', ':p')]: '2',
    [key('weigh-the-pair', ':a')]: '4',
    [key('weigh-the-pair', ':p')]: '4',
    [key('now-weigh-each-one', ':ma')]: '3',
    [key('now-weigh-each-one', ':mb')]: '1',
    [key('now-weigh-each-one', ':sum')]: '4',
    [key('splitting-them-up')]: 0,
    [key('one-on-your-own', ':a')]: '3',
    [key('one-on-your-own', ':p')]: '3',
    [key('one-on-your-own', ':a3')]: '27',
    [key('one-on-your-own', ':p2')]: '9',
    [key('one-on-your-own', ':total')]: '3',
    [key('and-which-one-is-heavier')]: 1,
  },
  attempts: {},
  visited: ['one-on-your-own', 'what-you-can-now-say'],
  startedAt: '2026-10-01T00:00:00.000Z',
};
const read = readProgress(SAVED, L);
const retired = {
  'measurement-one-how-big-is': 'take-the-orbit-readings',
  'measurement-two-how-long-does': 'time-the-laps',
  'back-to-the-balance-point': 'compare-the-two-arms',
  'now-weigh-each-one': 'share-the-total-out',
  'one-on-your-own': 'weigh-a-new-pair',
};
const under = sid =>
  Object.keys(SAVED.responses).filter(k => k.startsWith(key(sid) + ':'));

describe('a 3.0 record of the weighing lesson', () => {
  test('answers under a retired step are set aside, and no live step reads them', () => {
    for (const sid of Object.keys(retired))
      for (const k of under(sid)) {
        expect(read.responses[k]).toBeUndefined();
        expect(read.earlier.responses[k]).toBe(SAVED.responses[k]);
      }
    // The four a, p, a^3, p^2 answers of the last pair do not turn up as the
    // live step's total.
    expect(read.responses[key('weigh-a-new-pair', ':total')]).toBeUndefined();
    expect(read.responses[key('weigh-a-new-pair', ':a')]).toBeUndefined();
  });

  test('the steps that kept their task keep their answers', () => {
    for (const k of [
      key('which-pair-is-quicker'),
      key('a-practice-run', ':a'),
      key('weigh-the-pair', ':a'),
      key('weigh-the-pair', ':p'),
      key('splitting-them-up'),
      key('and-which-one-is-heavier'),
    ])
      expect(read.responses[k]).toBe(SAVED.responses[k]);
  });

  test('each earlier answer names the step it went to and says in both languages what it asked', () => {
    const rows = earlierAnswers(L, read.earlier.responses);
    const to = Object.fromEntries(rows.map(r => [r.id, r.r.to]));
    expect(to).toEqual({
      'now-weigh-each-one': retired['now-weigh-each-one'],
      'one-on-your-own': retired['one-on-your-own'],
    });
    for (const sid of Object.keys(retired)) {
      const r = L.retired[sid];
      expect(r.to).toBe(retired[sid]);
      expect(L.steps.map(s => s.sid)).toContain(r.to);
      expect(wasIn(r.was, 'en').length).toBeGreaterThan(20);
      expect(wasIn(r.was, 'es').length).toBeGreaterThan(20);
    }
    const last = rows.find(r => r.id === 'one-on-your-own');
    expect(last.text).toMatch(/27/);
  });

  test('a retired step is never a step of the live lesson, and a successor is', () => {
    const live = new Set(L.steps.map(s => s.sid));
    for (const [old, next] of Object.entries(retired)) {
      expect(live.has(old)).toBe(false);
      expect(live.has(next)).toBe(true);
    }
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
