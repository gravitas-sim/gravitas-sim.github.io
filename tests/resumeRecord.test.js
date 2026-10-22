// =============================================================================
// The one resume record (Roadmap III Prompt 163)
// -----------------------------------------------------------------------------
// js/storage/local.js owns it: one key, newest first, at most six items, a step
// and a pathway per item, and nothing a damaged or hostile value can turn into
// a link that leaves the site.
// =============================================================================

import { beforeEach, describe, expect, test } from '@jest/globals';
import {
  RESUME_KEY,
  RESUME_MAX,
  noteResume,
  readResume,
} from '../js/storage/local.js';
import { KEYS, collectionOf } from '../js/storage/index.js';

beforeEach(() => localStorage.clear());

const item = (id, extra = {}) => ({
  id,
  route: `/#investigation=${id.split(':')[1]}`,
  ...extra,
});

describe('the record', () => {
  test('is one key in the preferences collection, so a backup can carry it', () => {
    expect(RESUME_KEY).toBe('gravitas_resume');
    expect(KEYS.filter(([p]) => p === RESUME_KEY)).toHaveLength(1);
    expect(collectionOf(RESUME_KEY)).toBe('preferences');
  });

  test('is newest first and holds one entry per item', () => {
    noteResume(item('investigation:a'));
    noteResume(item('investigation:b'));
    noteResume(item('investigation:a'));
    expect(readResume().map(i => i.id)).toEqual([
      'investigation:a',
      'investigation:b',
    ]);
  });

  test('is capped, dropping the oldest', () => {
    for (let n = 0; n < RESUME_MAX + 3; n++)
      noteResume(item(`investigation:i${n}`));
    const ids = readResume().map(i => i.id);
    expect(ids).toHaveLength(RESUME_MAX);
    expect(ids[0]).toBe(`investigation:i${RESUME_MAX + 2}`);
  });

  test('the lesson writes the step and the Library the pathway, and each keeps the other', () => {
    noteResume(item('investigation:a', { path: { k: 'seq', id: 'the-sky' } }));
    noteResume(item('investigation:a', { step: 'guess' }));
    const [a] = readResume();
    expect(a.step).toBe('guess');
    expect(a.path).toEqual({ k: 'seq', id: 'the-sky' });
  });
});

describe('what it refuses', () => {
  test('a route that leaves the site, or is not a route', () => {
    for (const route of [
      'https://evil.test/',
      '//evil.test/',
      'javascript:1',
      '',
    ])
      expect(noteResume({ id: 'investigation:a', route })).toBe(false);
    expect(readResume()).toEqual([]);
  });

  test('an id with characters a link should not carry', () => {
    expect(noteResume({ id: 'a b"<', route: '/x' })).toBe(false);
  });

  test('a damaged or foreign record reads as nothing, and the next write replaces it', () => {
    for (const bad of [
      '{',
      '[]',
      '{"v":2,"items":[]}',
      '{"v":1,"items":"x"}',
      'null',
    ]) {
      localStorage.setItem(RESUME_KEY, bad);
      expect(readResume()).toEqual([]);
    }
    expect(noteResume(item('investigation:a'))).toBe(true);
    expect(readResume()).toHaveLength(1);
  });

  test('entries that do not validate are dropped, the rest stay', () => {
    localStorage.setItem(
      RESUME_KEY,
      JSON.stringify({
        v: 1,
        items: [
          { id: 'investigation:a', route: '//x.test/' },
          {
            id: 'investigation:b',
            route: '/ok',
            at: 1,
            path: { k: 'nope', id: 'z' },
          },
          { id: 'investigation:b', route: '/dup', at: 1 },
        ],
      })
    );
    expect(readResume()).toEqual([
      { id: 'investigation:b', route: '/ok', at: 1 },
    ]);
  });

  test('a storage that throws is a failed write, not an error', () => {
    const store = {
      getItem: () => null,
      setItem: () => {
        throw new Error('full');
      },
    };
    expect(noteResume(item('investigation:a'), store)).toBe(false);
  });
});
