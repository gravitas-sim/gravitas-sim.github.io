import { describe, expect, test } from '@jest/globals';
import {
  readProgress,
  writeProgress,
} from '../js/investigations/progressSchema.js';
import {
  earlierAnswers,
  earlierOf,
  liveSids,
  resolveIds,
  successorOf,
  wasIn,
} from '../js/investigations/revisions.js';
import {
  retiredInvestigation,
  RETIRED_INVESTIGATIONS,
} from '../js/data/retiredInvestigations.js';
import { EDITS, editedLesson, lesson } from './compat/kinds/_lesson.mjs';

// The task-change contract: a shipped step is reworded in place, or revised
// under a new id with the old id retired, and what a student saved under the
// old id stays readable as an answer from an earlier version and is never
// marked against the new step. Each reader has its own block below.

const SAVED = {
  schema: 2,
  lesson: 'tides',
  stepSid: 'guess',
  responses: {
    'tides:guess': 0,
    'tides:measure:d': '4.2',
    'tides:measure:d:locale': 'en',
    'tides:ask': 2,
  },
  attempts: { 'tides:guess': 1 },
  visited: ['intro', 'guess'],
  startedAt: '2026-10-01T00:00:00.000Z',
};

describe('the retired map', () => {
  const owner = {
    retired: {
      a: { to: 'b', release: '3.1', was: { en: 'A?', es: 'A?es' } },
      b: { to: 'c', release: '3.2', was: { en: 'B?' } },
      gone: { to: null, release: '3.1', was: 'Gone?' },
      loop1: { to: 'loop2', release: '3.1' },
      loop2: { to: 'loop1', release: '3.1' },
      lost: { to: 'nowhere', release: '3.1' },
    },
  };
  const live = new Set(['c', 'z']);

  test('follows a successor that was itself retired later', () => {
    expect(successorOf(owner, 'a', live)).toMatchObject({
      to: 'c',
      release: '3.1',
    });
  });

  test('says nothing for an id that was never retired', () => {
    expect(successorOf(owner, 'z', live)).toBeNull();
    expect(successorOf({}, 'a', live)).toBeNull();
    expect(successorOf(null, 'a')).toBeNull();
  });

  test('a removed step, a cycle and a successor that is not live end at no step', () => {
    expect(successorOf(owner, 'gone', live).to).toBeNull();
    expect(successorOf(owner, 'loop1', live).to).toBeNull();
    expect(successorOf(owner, 'lost', live).to).toBeNull();
  });

  test('what a step asked is read in the reader language, English as the fallback', () => {
    expect(wasIn(owner.retired.a.was, 'es')).toBe('A?es');
    expect(wasIn(owner.retired.b.was, 'es')).toBe('B?');
    expect(wasIn('Gone?', 'es')).toBe('Gone?');
    expect(wasIn(null)).toBe('');
  });

  test('saved answers under ids the owner lacks come back with where they went', () => {
    const rows = earlierOf(owner, live, [
      ['a', 1],
      ['z', 2],
      ['mystery', 3],
    ]);
    expect(rows.map(r => [r.id, r.to, r.known])).toEqual([
      ['a', 'c', true],
      ['mystery', null, false],
    ]);
  });

  test('ids named elsewhere resolve to the successor, or are left out with a note', () => {
    const r = resolveIds(owner, ['a', 'z', 'gone', 'a'], live);
    expect(r.ids).toEqual(['c', 'z']);
    expect(r.notes.map(n => [n.id, n.to])).toEqual([
      ['a', 'c'],
      ['gone', null],
      ['a', 'c'],
    ]);
  });
});

describe('progress load: reword, revise, insert and remove', () => {
  const read = edit => readProgress(SAVED, editedLesson(edit));

  test('a reword changes nothing a reader sees', () => {
    const r = read('reword');
    expect(r.responses).toEqual(read('none').responses);
    expect(r.earlier).toBeNull();
    expect(r.notes).toEqual([]);
  });

  test('an insert leaves every answer on its own step', () => {
    const r = read('insert');
    expect(r.responses['tides:guess']).toBe(0);
    expect(r.responses['tides:measure:d']).toBe('4.2');
    expect(r.earlier).toBeNull();
  });

  test('a revised step opens blank; the old answer is kept as an earlier version', () => {
    const l = editedLesson('revise');
    const r = readProgress(SAVED, l);
    expect(r.responses['tides:guess']).toBeUndefined();
    expect(r.responses['tides:guess-2']).toBeUndefined();
    expect(r.earlier.responses['tides:guess']).toBe(0);
    expect(r.earlier.attempts['tides:guess']).toBe(1);
    const [e] = earlierAnswers(l, r.earlier.responses);
    expect(e).toMatchObject({
      id: 'guess',
      text: '0',
      to: 'guess-2',
      release: '3.1',
      known: true,
    });
    expect(wasIn(e.was, 'es')).toMatch(/mayor/);
  });

  test('a removed step is retired with no successor and its field answers stay readable', () => {
    const l = editedLesson('remove');
    const r = readProgress(SAVED, l);
    expect(r.responses['tides:measure:d']).toBeUndefined();
    const [e] = earlierAnswers(l, r.earlier.responses);
    expect(e).toMatchObject({ id: 'measure', text: 'd=4.2', to: null });
    expect(r.notes.find(n => n.code === 'removedSteps').dropped).toBe(2);
  });

  test.each(EDITS)('%s: saving after reading loses no saved key', edit => {
    const l = editedLesson(edit);
    const r = readProgress(SAVED, l);
    const back = writeProgress({ lesson: l, ...r, depth: 'core' });
    const keys = o => Object.keys(o).sort();
    expect(keys(back.responses)).toEqual(keys(SAVED.responses));
    expect(keys(back.attempts)).toEqual(keys(SAVED.attempts));
    // and the next read sets the same answers aside again
    expect(readProgress(back, l).earlier).toEqual(r.earlier);
  });

  test('an answer is never read against the successor step', () => {
    const l = editedLesson('revise');
    const r = readProgress(SAVED, l);
    for (const sid of liveSids(l)) {
      expect(r.responses[`tides:${sid}`]).toBe(sid === 'ask' ? 2 : undefined);
    }
  });

  test('a key that is not this lesson at all is left out', () => {
    const r = readProgress(
      { ...SAVED, responses: { ...SAVED.responses, 'other:x': 1 } },
      lesson()
    );
    expect(JSON.stringify(r)).not.toMatch(/other/);
  });
});

describe('the retired-investigation record', () => {
  const record = {
    old: { to: 'mid', release: '3.1', reason: 'merged' },
    mid: { to: 'new', release: '3.2', reason: 'merged again' },
    gone: { to: null, release: '3.1', reason: 'retired' },
    ring: { to: 'ring', release: '3.1', reason: 'broken' },
  };
  const live = new Set(['new']);

  test('resolves through a later retirement', () => {
    expect(retiredInvestigation('old', live, record)).toMatchObject({
      to: 'new',
      release: '3.1',
    });
  });

  test('a retirement with no successor, a cycle and an id never retired', () => {
    expect(retiredInvestigation('gone', live, record).to).toBeNull();
    expect(retiredInvestigation('ring', live, record).to).toBeNull();
    expect(retiredInvestigation('toString', live, record)).toBeNull();
    expect(retiredInvestigation('new', live, record)).toBeNull();
  });

  test('the shipped record holds only real successors', async () => {
    const { investigationIds } =
      await import('../js/data/investigations/registry.js');
    const live2 = new Set(investigationIds());
    for (const [id, e] of Object.entries(RETIRED_INVESTIGATIONS)) {
      expect(live2.has(id)).toBe(false);
      if (e.to) expect(live2.has(e.to)).toBe(true);
    }
  });
});
