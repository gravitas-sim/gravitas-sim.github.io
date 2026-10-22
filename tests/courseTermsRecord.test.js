// =============================================================================
// The course terms record (Roadmap III Prompt 168)
// -----------------------------------------------------------------------------
// js/instructorCourseTerms.js owns it: one key, newest first, a line per course
// and term, and nothing but an id, a title, the term and a time. My work reads
// it with its own few lines (js/myWork/model.js); the two must agree.
// =============================================================================

import { beforeEach, describe, expect, test } from '@jest/globals';
import {
  TERMS_KEY,
  TERMS_MAX,
  noteTerm,
  readTerms,
} from '../js/instructorCourseTerms.js';
import { KEYS, collectionOf } from '../js/storage/index.js';
import { describe as describeWork } from '../js/myWork/model.js';

beforeEach(() => localStorage.clear());

const course = (id, term, extra = {}) => ({
  id,
  term,
  title: { en: 'Introductory astronomy', es: 'Astronomía introductoria' },
  ...extra,
});

describe('the record', () => {
  test('is one key in the preferences collection, so a backup can carry it', () => {
    expect(TERMS_KEY).toBe('gravitas_terms');
    expect(KEYS.filter(([p]) => p === TERMS_KEY)).toHaveLength(1);
    expect(collectionOf(TERMS_KEY)).toBe('preferences');
  });

  test('is newest first, and a second term of a course is a second line', () => {
    noteTerm(course('intro-fall-2026', 'Fall 2026'));
    noteTerm(course('intro-spring-2027', 'Spring 2027'));
    noteTerm(course('intro-fall-2026', 'Fall 2026'));
    expect(readTerms().map(c => c.term)).toEqual(['Fall 2026', 'Spring 2027']);
  });

  test('is capped, dropping the oldest', () => {
    for (let n = 0; n < TERMS_MAX + 3; n++)
      noteTerm(course(`course-${n}`, `Term ${n}`));
    const rows = readTerms();
    expect(rows).toHaveLength(TERMS_MAX);
    expect(rows[0].id).toBe(`course-${TERMS_MAX + 2}`);
  });

  test('keeps no link, no answer and nothing outside its fields', () => {
    noteTerm({
      ...course('intro-fall-2026', 'Fall 2026'),
      href: 'https://evil.invalid/',
      responses: { a: 1 },
    });
    const raw = JSON.parse(localStorage.getItem(TERMS_KEY));
    expect(Object.keys(raw.courses[0]).sort()).toEqual([
      'at',
      'id',
      'term',
      'title',
    ]);
  });

  test('refuses an id that is not a course id and a term that is not a short label', () => {
    expect(noteTerm(course('Not An Id', 'Fall 2026'))).toBe(false);
    expect(noteTerm(course('ok-id', ''))).toBe(false);
    expect(noteTerm(course('ok-id', 'x'.repeat(41)))).toBe(false);
    expect(readTerms()).toEqual([]);
  });

  test('a damaged or foreign record reads as nothing, and the next write replaces it', () => {
    localStorage.setItem(
      TERMS_KEY,
      '{"v":2,"courses":[{"id":"a","term":"b"}]}'
    );
    expect(readTerms()).toEqual([]);
    localStorage.setItem(TERMS_KEY, 'not json');
    expect(readTerms()).toEqual([]);
    noteTerm(course('ok-id', 'Fall 2026'));
    expect(readTerms()).toHaveLength(1);
  });
});

describe('My work reads the same record', () => {
  test('and lists a line per course and term, newest first, with the title in either language', () => {
    noteTerm(course('intro-fall-2026', 'Fall 2026', { at: 1790000000000 }));
    noteTerm(course('intro-spring-2027', 'Spring 2027', { at: 1800000000000 }));
    const records = [
      { id: TERMS_KEY, value: JSON.parse(localStorage.getItem(TERMS_KEY)) },
    ];
    const d = describeWork(records);
    expect(d.terms.map(c => c.term)).toEqual(['Spring 2027', 'Fall 2026']);
    expect(d.terms[0].title).toEqual({
      en: 'Introductory astronomy',
      es: 'Astronomía introductoria',
    });
    expect(d.terms[0].when).toBe(new Date(1800000000000).toISOString());
    expect(d.terms).toHaveLength(readTerms().length);
  });

  test('and ignores a record that is not its own', () => {
    const d = describeWork([
      { id: TERMS_KEY, value: { v: 9, courses: [{ id: 'a', term: 'b' }] } },
    ]);
    expect(d.terms ?? []).toEqual([]);
  });
});
