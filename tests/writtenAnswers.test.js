// =============================================================================
// A written answer, and where its evidence came from
// -----------------------------------------------------------------------------
// Every investigation ends its central loop with a written step: the reader
// says what they measured and how it compares with what they predicted. Two
// things about that step were missing.
//
// A box holding a space, or a full stop, or "..." was recorded as an answer and
// reached the exported lab report as one. isWrittenAnswer() refuses those and
// nothing else - it is not marking, and a short wrong answer is an answer.
//
// And the step never said where the number came from. That distinction is the
// one this application is most often misread about: a Schwarzschild radius is a
// closed-form panel and a period is the integrator, and a reader who thinks the
// first was simulated has learned something false. Twelve of the twenty-two
// central experiments measure with the engine, eight with a model, two from
// published data - and the audit checks each label against the kinds it found
// in the lesson, which caught three of my first twenty-two as unsupported.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import { isWrittenAnswer } from '../js/investigations/writtenAnswer.js';
import {
  EVIDENCE_FROM,
  evidenceFrom,
} from '../js/data/investigations/provenance.js';
import { INVESTIGATIONS } from '../js/data/investigations.js';
import { EN_DEFERRED } from '../js/i18n/en.deferred.js';
import { ES_DEFERRED } from '../js/i18n/es.deferred.js';

describe('what counts as having written something', () => {
  test.each([
    ['', 'nothing at all'],
    ['   ', 'spaces'],
    ['\n\t ', 'whitespace'],
    ['.', 'a full stop'],
    ['...', 'an ellipsis'],
    ['?!', 'punctuation'],
    ['-', 'a dash'],
    ['   .   ', 'a full stop with room around it'],
  ])('%j is not an answer (%s)', value => {
    expect(isWrittenAnswer(value)).toBe(false);
  });

  test.each([
    ['It sped up near the star.', 'a sentence'],
    ['a = 1.5', 'a measurement'],
    ['no', 'two letters'],
    ['Se acercó más rápido.', 'Spanish, with accents'],
    ['λ es mayor', 'a Greek symbol in a sentence'],
    ['12 días', 'digits and a word'],
  ])('%j is an answer (%s)', value => {
    expect(isWrittenAnswer(value)).toBe(true);
  });

  // Deliberately weak. A reader who writes something short and wrong has
  // answered, and telling them their phrasing is unscientific is not this
  // function's job.
  test('a wrong answer is still an answer', () => {
    expect(isWrittenAnswer('the planet gets heavier')).toBe(true);
  });

  test('a single letter is not enough, two are', () => {
    expect(isWrittenAnswer('a')).toBe(false);
    expect(isWrittenAnswer('ab')).toBe(true);
  });
});

describe('where the evidence came from', () => {
  test('every investigation declares a source', () => {
    const missing = INVESTIGATIONS.filter(inv => !evidenceFrom(inv.id));
    expect(missing.map(i => i.id)).toEqual([]);
    expect(Object.keys(EVIDENCE_FROM)).toHaveLength(INVESTIGATIONS.length);
  });

  test('every source is one of the four the interface can name', () => {
    const allowed = ['engine', 'model', 'data', 'illustration'];
    for (const [id, from] of Object.entries(EVIDENCE_FROM)) {
      expect({ id, from, known: allowed.includes(from) }).toEqual({
        id,
        from,
        known: true,
      });
    }
  });

  test('each source has a sentence in both languages', () => {
    for (const from of new Set(Object.values(EVIDENCE_FROM))) {
      const key = `inv.evidenceFrom.${from}`;
      expect({ key, en: typeof EN_DEFERRED[key] }).toEqual({
        key,
        en: 'string',
      });
      expect({ key, es: typeof ES_DEFERRED[key] }).toEqual({
        key,
        es: 'string',
      });
      expect(EN_DEFERRED[key]).not.toBe(ES_DEFERRED[key]);
    }
  });

  // The distinction is the point. If every lesson said "engine" the label
  // would be decoration.
  test('the labels distinguish, rather than all saying the same thing', () => {
    const kinds = new Set(Object.values(EVIDENCE_FROM));
    expect(kinds.size).toBeGreaterThan(1);
    // The two stellar lessons read published MIST tracks; saying the engine
    // produced those numbers would be false.
    expect(evidenceFrom('a-universe-of-stars')).toBe('data');
    expect(evidenceFrom('lives-of-stars')).toBe('data');
    // And the black-hole lesson's central quantity is a closed-form panel,
    // which is what its own screens spend a page insisting on.
    expect(evidenceFrom('black-holes')).toBe('model');
    // While Kepler's laws are measured off orbits the integrator moved.
    expect(evidenceFrom('keplers-laws')).toBe('engine');
  });

  test('an unknown investigation has no source rather than a wrong one', () => {
    expect(evidenceFrom('not-a-lesson')).toBeNull();
  });
});
