import { describe, test, expect } from '@jest/globals';
import { resolveByName, WATCH } from '../js/investigations/eventWatch.js';

describe('finding the body a lesson named', () => {
  const bodies = [
    { name: 'Star', alive: true },
    { name: 'Star B', alive: true },
    { name: 'Eccentric planet', alive: true },
    { name: 'Dead one', alive: false },
  ];

  test('an exact name wins', () => {
    expect(resolveByName(bodies, 'Star').name).toBe('Star');
    expect(resolveByName(bodies, 'Star B').name).toBe('Star B');
  });

  test('case is forgiven', () => {
    expect(resolveByName(bodies, 'eccentric PLANET').name).toBe(
      'Eccentric planet'
    );
  });

  test('a prefix is not a match', () => {
    // The failure this prevents: "Star" prefix-matching "Star B" and pointing
    // the watch at the wrong body, which would produce a real event time for
    // the wrong orbit - a wrong answer that looks entirely plausible.
    expect(resolveByName(bodies, 'Sta')).toBe(null);
    expect(resolveByName(bodies, 'Star')).not.toBe(
      resolveByName(bodies, 'Star B')
    );
  });

  test('a dead body is not a target', () => {
    expect(resolveByName(bodies, 'Dead one')).toBe(null);
  });

  test('nothing to look for, or nothing to look in', () => {
    expect(resolveByName(bodies, '')).toBe(null);
    expect(resolveByName(bodies, null)).toBe(null);
    expect(resolveByName([], 'Star')).toBe(null);
    expect(resolveByName(undefined, 'Star')).toBe(null);
  });
});

describe('the states a lesson watch can be in are named', () => {
  test('every one of them, so a step can say which', () => {
    expect(Object.values(WATCH).sort()).toEqual([
      'armed',
      'fired',
      'foreign',
      'idle',
      'refused',
    ]);
  });
});
