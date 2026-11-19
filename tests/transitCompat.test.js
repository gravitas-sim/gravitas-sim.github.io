/**
 * @jest-environment jsdom
 */
// =============================================================================
// Saved work under the steps the transit lesson retired
// -----------------------------------------------------------------------------
// A progress record made when Finding Planets by Their Shadows copied the
// panel's own levels (answers under `what-will-the-brightness-do`,
// `measure-the-dip` and `recover-the-real-planet`) is read by the revised
// lesson: those answers are kept as answers from an earlier version, named with
// the step they went to, and never read as an answer to a live step; the steps
// that kept their task keep their answers (the correction, the timing); and
// saving after reading loses no key. The reader and the rule are
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

const L = withAllDepths(
  INVESTIGATIONS.find(l => l.id === 'transit-photometry')
);
const key = (sid, more = '') => `transit-photometry:${sid}${more}`;

const SAVED = {
  schema: 2,
  lesson: 'transit-photometry',
  stepSid: 'what-the-method-misses',
  responses: {
    [key('what-will-the-brightness-do')]: 1,
    [key('measure-the-dip', ':base')]: '1.000065',
    [key('measure-the-dip', ':bot')]: '0.981733',
    [key('measure-the-dip', ':depth')]: '0.01833',
    [key('measure-the-dip', ':k_naive')]: '0.1354',
    [key('correct-it-and-get-a', ':d2')]: '0.01833',
    [key('correct-it-and-get-a', ':rstar')]: '1.155',
    [key('time-two-transits', ':t1')]: '0.8802',
    [key('time-two-transits', ':n1')]: '1',
    [key('recover-the-real-planet', ':d_blend')]: '0.011241',
    [key('recover-the-real-planet', ':d_clean')]: '0.018333',
  },
  attempts: {},
  visited: ['what-the-method-misses'],
  startedAt: '2026-10-01T00:00:00.000Z',
};
const read = readProgress(SAVED, L);
const retired = [
  'what-will-the-brightness-do',
  'measure-the-dip',
  'recover-the-real-planet',
];

describe('a 3.0 record of the transit lesson', () => {
  test('answers under retired steps are set aside; the steps that kept their task keep theirs', () => {
    for (const sid of retired)
      for (const k of Object.keys(SAVED.responses).filter(x =>
        x.startsWith(key(sid))
      ))
        expect(read.responses[k]).toBeUndefined();
    expect(read.responses[key('correct-it-and-get-a', ':d2')]).toBe('0.01833');
    expect(read.responses[key('time-two-transits', ':t1')]).toBe('0.8802');
    expect(Object.keys(read.earlier.responses).length).toBe(
      Object.keys(SAVED.responses).filter(k =>
        retired.some(s => k.startsWith(key(s)))
      ).length
    );
  });

  test('each earlier answer names the step it went to and says in both languages what it asked', () => {
    const rows = earlierAnswers(L, read.earlier.responses);
    const to = Object.fromEntries(rows.map(r => [r.id, r.r.to]));
    expect(to).toEqual({
      'what-will-the-brightness-do': 'estimate-the-dip',
      'measure-the-dip': 'choose-the-two-stretches',
      'recover-the-real-planet': 'find-the-hidden-companion',
    });
    for (const r of rows) {
      expect(L.steps.map(s => s.sid)).toContain(r.r.to);
      expect(wasIn(r.r.was, 'en').length).toBeGreaterThan(20);
      expect(wasIn(r.r.was, 'es').length).toBeGreaterThan(20);
    }
    const dip = rows.find(r => r.id === 'measure-the-dip');
    expect(dip.text).toMatch(/1\.000065|0\.981733/);
  });

  test('a retired step is never a step of the live lesson, and a successor is', () => {
    const live = new Set(L.steps.map(s => s.sid));
    for (const sid of retired) expect(live.has(sid)).toBe(false);
    expect(live.has('now-measure-it')).toBe(false);
    for (const sid of Object.values(L.retired).map(r => r.to))
      expect(live.has(sid)).toBe(true);
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
