// =============================================================================
// The lab report, built the way the lesson engine builds it
// -----------------------------------------------------------------------------
// js/labReport.js had no tests of its own, and that is how a whole class of
// steps fell out of every report unnoticed. When steps gained permanent sids
// the engine started keeping `visited` as a Set of sids, and the report went on
// asking it for indices - so a step the student reached but did not answer was
// left out, and an explore checklist was never listed at all.
//
// So everything here is handed over as js/investigations.js hands it: responses
// keyed by stepKey(), visited as a Set of sids, and the same per-answer grader,
// which reads each answer's own `:locale` sub-key. What is asserted is the text
// the PDF draws, read back out of its content streams.
// =============================================================================

import { describe, test, expect } from '@jest/globals';

import { buildLabReport } from '../js/labReport.js';
import { decodeEntities } from '../js/lessonMarkup.js';
import { checkAnswer } from '../js/answerCheck.js';
import {
  LOCALE_SUFFIX,
  localeOfAnswer,
  recordAnswer,
} from '../js/answerParse.js';
import { stepKey } from '../js/investigations/progressSchema.js';

const kepler = await import('../js/data/investigations/keplers-laws.js').then(
  m => m.default || Object.values(m)[0]
);

const key = sid => stepKey(kepler.id, sid);

/**
 * A report, from the arguments the engine passes. `locale` stands in for
 * getLocale() at the moment the student presses Download.
 */
function report({ responses = {}, attempts = {}, visited, locale = 'en' }) {
  return buildLabReport({
    investigation: kepler,
    plot: null,
    name: 'Ada',
    submissionToken: '',
    responses,
    attempts,
    visited,
    startedAt: '2026-09-01T10:00:00.000Z',
    links: [],
    stepIdFor: index => stepKey(kepler.id, kepler.steps[index]?.sid),
    assignment: null,
    binding: null,
    checkAnswer: (step, value, id) =>
      checkAnswer(step, value, {
        locale: localeOfAnswer(responses, id, locale),
      }),
    decodeEntities,
  });
}

/** Every string the PDF draws, in the order it draws them. */
const drawn = bytes =>
  [
    ...Buffer.from(bytes)
      .toString('latin1')
      .matchAll(/\(((?:\\.|[^\\)])*)\) Tj/g),
  ].map(m => m[1].replace(/\\(.)/g, '$1'));

/**
 * What the report draws under one step, or null if the step is not in it.
 * A step's heading is its number and title; its section runs to the next one,
 * so a page break inside it brings the footer along.
 */
function section(bytes, sid) {
  const lines = drawn(bytes);
  const n = kepler.steps.findIndex(s => s.sid === sid) + 1;
  const start = lines.findIndex(l => l.startsWith(`${n}. `));
  if (start < 0) return null;
  const next = lines.findIndex((l, i) => i > start && /^\d+\. /.test(l));
  return lines.slice(start, next < 0 ? undefined : next);
}

/** The same, as one string to match against. */
const text = (bytes, sid) => section(bytes, sid)?.join(' ') ?? null;

/** The first nine steps, reached in order. */
const reachedNine = () => new Set(kepler.steps.slice(0, 9).map(s => s.sid));

describe('the steps a student reached', () => {
  test('are listed even when they were left unanswered', () => {
    const bytes = report({
      responses: { [key('where-is-the-star')]: 1 },
      visited: reachedNine(),
    });
    expect(text(bytes, 'what-sits-at-the-other')).toMatch(/not answered/);
    // A measurement reached and left blank shows its empty fields.
    const blank = section(bytes, 'measure-the-two-orbits');
    expect(blank).not.toBeNull();
    expect(blank.filter(l => l === '-')).toHaveLength(
      kepler.steps.find(st => st.sid === 'measure-the-two-orbits').fields.length
    );
    // And a step never reached, and never answered, is still left out.
    expect(section(bytes, 'use-the-law')).toBeNull();
    // As is one reached that asks for nothing, like the ellipse: a heading
    // with nothing under it says nothing the step count does not.
    expect(section(bytes, 'change-the-shape')).toBeNull();
    expect(drawn(bytes)).toContain(`9 of ${kepler.steps.length}`);
  });

  test('include an explore checklist, with how much of it was done', () => {
    const responses = {};
    for (const i of [0, 1, 2]) {
      responses[`${key('watch-it-happen')}:check:${i}`] = true;
    }
    const says = text(
      report({ responses, visited: reachedNine() }),
      'watch-it-happen'
    );
    expect(says).toMatch(/Exploration checklist/);
    expect(says).toMatch(/3 of 4 completed/);
  });

  test('are covered by the completion code, checklist included', () => {
    const code = bytes => {
      const lines = drawn(bytes);
      return lines[lines.indexOf('Completion code') + 1];
    };
    const tick = n => {
      const responses = {};
      for (let i = 0; i < n; i++) {
        responses[`${key('watch-it-happen')}:check:${i}`] = true;
      }
      return code(report({ responses, visited: reachedNine() }));
    };
    expect(tick(3)).toMatch(/^[0-9A-Z]{4}-[0-9A-Z]+$/);
    expect(tick(3)).not.toBe(tick(4));
  });
});

describe('a number typed under another convention', () => {
  // "0,910" is the case that tells the two apart: 0.910 in Spanish, and
  // nine hundred and ten in English, where the comma groups thousands.
  const typed = () => {
    const responses = {};
    recordAnswer(responses, key('weighing-another-star'), '0,910', 'es');
    return responses;
  };
  const visited = new Set(kepler.steps.map(s => s.sid));

  test('is graded under the locale it was typed in, not the one in force', () => {
    const responses = typed();
    expect(responses[`${key('weighing-another-star')}${LOCALE_SUFFIX}`]).toBe(
      'es'
    );
    const says = text(
      report({ responses, visited, locale: 'en' }),
      'weighing-another-star'
    );
    expect(says).toMatch(/0,910/);
    expect(says).toMatch(/correct - expected 0\.91/);
    expect(says).not.toMatch(/incorrect/);
  });

  test('without its recorded locale, falls back to the one in force', () => {
    // The control: what the report does when it cannot know. This is what
    // every Spanish answer would get if the report stopped passing each
    // answer's key to the grader.
    const responses = typed();
    delete responses[`${key('weighing-another-star')}${LOCALE_SUFFIX}`];
    const says = text(
      report({ responses, visited, locale: 'en' }),
      'weighing-another-star'
    );
    expect(says).toMatch(/incorrect - expected 0\.91/);
  });
});
