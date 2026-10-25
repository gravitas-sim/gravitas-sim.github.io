import { describe, test, expect } from '@jest/globals';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { durationText } from '../js/library/card.js';
import { minutesOf } from '../tools/build-adoption-pages.mjs';

describe('durations print one way', () => {
  test('equal bounds print one number, unequal bounds a range', () => {
    expect(minutesOf({ min: 5, max: 5 })).toBe('5');
    expect(minutesOf({ min: 5, max: 50 })).toBe('5–50');
    expect(minutesOf(null)).toBe('');
  });

  test('the Library card agrees in both languages', () => {
    const t = (key, v) =>
      ({
        'lib.card.minutes': `${v.n} min`,
        'lib.card.range': `${v.min}–${v.max} min`,
      })[key];
    expect(durationText({ min: 5, max: 5 }, t)).toBe('5 min');
    expect(durationText({ min: 5, max: 9 }, t)).toBe('5–9 min');
  });

  test('no generated page prints a range whose bounds are equal', () => {
    const pages = [];
    const walk = dir => {
      for (const name of readdirSync(dir)) {
        const p = path.join(dir, name);
        if (statSync(p).isDirectory()) walk(p);
        else if (name === 'index.html') pages.push(p);
      }
    };
    walk('teaching');
    expect(pages.length).toBeGreaterThan(20);
    const bad = pages.filter(p =>
      /(?<![\d.])(\d+)–\1(?!\d)\s*(<span[^>]*>)?\s*(minutes|min)/.test(
        readFileSync(p, 'utf8')
      )
    );
    expect(bad).toEqual([]);
  });
});
