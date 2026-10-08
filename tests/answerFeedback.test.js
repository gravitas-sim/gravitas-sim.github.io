import { describe, test, expect } from '@jest/globals';
import {
  FEEDBACK_CLASSES,
  HINT_STAGES,
  answerClass,
  feedbackFor,
  helpStages,
  hintLadder,
  STANDARD_MISCONCEPTIONS,
  helpTaken,
  hintsFor,
  matchMisconception,
  nextHintStage,
} from '../js/answerFeedback.js';

// =============================================================================
// Staged hints and named mistakes
// -----------------------------------------------------------------------------
// The property worth defending hardest is the *narrowness* of the misconception
// matcher. A wrong number can be wrong for any number of reasons, almost none of
// them knowable from the number; a matcher that fired on everything would be
// telling students stories about their own reasoning.
// =============================================================================

const step = over => ({ kind: 'numeric', answer: 10, tolerance: 0.5, ...over });

describe('hints are offered in order, and only when authored', () => {
  test('a step with no hints offers nothing', () => {
    expect(hintsFor(step())).toBeNull();
    expect(nextHintStage(step())).toBeNull();
  });

  test('the concept comes first, then the method, then the reveal', () => {
    const s = step({
      hints: { concept: 'What is K?', method: 'Half the range.' },
      worked: 'K = (max - min) / 2 = 84.',
    });
    expect(nextHintStage(s, [])).toBe('concept');
    expect(nextHintStage(s, ['concept'])).toBe('method');
    expect(nextHintStage(s, ['concept', 'method'])).toBe('reveal');
    expect(nextHintStage(s, ['concept', 'method', 'reveal'])).toBeNull();
  });

  test('a missing stage is skipped rather than blocking the next', () => {
    const s = step({ hints: { method: 'Half the range.' }, worked: 'K = 84.' });
    expect(nextHintStage(s, [])).toBe('method');
    expect(nextHintStage(s, ['method'])).toBe('reveal');
  });

  test('the reveal cannot be reached before the hints are offered', () => {
    // Not a lock - the student can take all three in a row - but the order is
    // fixed, so nobody lands on the worked answer without passing the hint that
    // might have made it unnecessary.
    const s = step({
      hints: { concept: 'c', method: 'm' },
      worked: 'w',
    });
    expect(nextHintStage(s, [])).not.toBe('reveal');
    expect(nextHintStage(s, ['concept'])).not.toBe('reveal');
  });

  test('a step with only a worked answer offers just the reveal', () => {
    const s = step({ worked: 'Because…' });
    expect(nextHintStage(s, [])).toBe('reveal');
  });
});

describe('only the mistakes an author named are named back', () => {
  test('a wrong number with no rules gets no story', () => {
    expect(matchMisconception(step(), 7.3, 0.5)).toBeNull();
    expect(matchMisconception(step(), 20, 0.5)).toBeNull();
  });

  test('twice the answer matches a doubling rule, and nothing else does', () => {
    const s = step({ misconceptions: [{ id: 'diameterForRadius' }] });
    expect(matchMisconception(s, 20, 0.5)?.id).toBe('diameterForRadius');
    // Half, three times, and merely wrong all match nothing.
    expect(matchMisconception(s, 5, 0.5)).toBeNull();
    expect(matchMisconception(s, 30, 0.5)).toBeNull();
    expect(matchMisconception(s, 13.7, 0.5)).toBeNull();
  });

  test('the rule is as forgiving about its value as the question is about the right one', () => {
    // A rule for twice the answer uses twice the tolerance, so a student who is
    // within tolerance of the doubled value is recognized.
    const s = step({ misconceptions: [{ id: 'peakToPeakForSemiAmplitude' }] });
    expect(matchMisconception(s, 20.9, 0.5)?.id).toBe(
      'peakToPeakForSemiAmplitude'
    );
    expect(matchMisconception(s, 21.5, 0.5)).toBeNull();
  });

  test('an author can name an exact wrong value', () => {
    const s = step({
      misconceptions: [{ id: 'readTheWrongRow', equals: 3.3 }],
    });
    expect(matchMisconception(s, 3.3, 0.5)?.id).toBe('readTheWrongRow');
    expect(matchMisconception(s, 9, 0.5)).toBeNull();
  });

  test('an author can supply their own factor and their own words', () => {
    const s = step({
      misconceptions: [{ id: 'custom', factor: 3, say: 'You tripled it.' }],
    });
    const hit = matchMisconception(s, 30, 0.5);
    expect(hit.id).toBe('custom');
    expect(hit.message).toBe('You tripled it.');
  });

  test('the first matching rule wins, so order is the authors', () => {
    const s = step({
      misconceptions: [
        { id: 'first', factor: 2 },
        { id: 'second', factor: 2 },
      ],
    });
    expect(matchMisconception(s, 20, 0.5).id).toBe('first');
  });

  test('the standard rules are the relationships they claim to be', () => {
    expect(STANDARD_MISCONCEPTIONS.diameterForRadius.factor).toBe(2);
    expect(STANDARD_MISCONCEPTIONS.radiusForDiameter.factor).toBe(0.5);
    expect(STANDARD_MISCONCEPTIONS.peakToPeakForSemiAmplitude.factor).toBe(2);
    expect(STANDARD_MISCONCEPTIONS.daysForYears.factor).toBeCloseTo(365.25, 6);
    expect(STANDARD_MISCONCEPTIONS.radiansForDegrees.factor).toBeCloseTo(
      Math.PI / 180,
      12
    );
  });

  test('nothing matches when there is no number to match', () => {
    const s = step({ misconceptions: [{ id: 'diameterForRadius' }] });
    expect(matchMisconception(s, Number.NaN, 0.5)).toBeNull();
    expect(matchMisconception({ ...s, answer: undefined }, 20, 0.5)).toBeNull();
  });
});

describe('help taken is recorded, not charged for', () => {
  test('it counts hints and notices a reveal', () => {
    expect(helpTaken([])).toEqual({ hints: 0, revealed: false, stages: [] });
    expect(helpTaken(['concept'])).toMatchObject({ hints: 1, revealed: false });
    expect(helpTaken(['concept', 'method', 'reveal'])).toMatchObject({
      hints: 2,
      revealed: true,
    });
  });

  test('the stages are the ones the module offers', () => {
    expect(HINT_STAGES).toEqual(['concept', 'method']);
  });

  test('garbage in the record does not become a count', () => {
    expect(helpTaken(['concept', null, 'nonsense'])).toMatchObject({
      hints: 1,
      revealed: false,
    });
    expect(helpTaken(null).hints).toBe(0);
  });
});

describe('a ladder of up to three hints, one at a time', () => {
  const ladder = step({ hints: ['one', 'two', 'three', 'four'], worked: 'w' });

  test('the array form is a ladder of at most three, in order', () => {
    expect(hintLadder(ladder).map(h => h.id)).toEqual(['h1', 'h2', 'h3']);
    expect(nextHintStage(ladder, [])).toBe('h1');
    expect(nextHintStage(ladder, ['h1'])).toBe('h2');
    expect(nextHintStage(ladder, ['h1', 'h2'])).toBe('h3');
    expect(nextHintStage(ladder, ['h1', 'h2', 'h3'])).toBe('reveal');
    expect(nextHintStage(ladder, ['h1', 'h2', 'h3', 'reveal'])).toBeNull();
  });

  test('the object form reads as a ladder of two and keeps its stage names', () => {
    const s = step({ hints: { concept: 'c', method: 'm' } });
    expect(hintLadder(s).map(h => h.id)).toEqual(['concept', 'method']);
  });

  test('hints taken are a count of facts, not a penalty', () => {
    expect(helpTaken(helpStages('h1,h2,reveal'))).toMatchObject({
      hints: 2,
      revealed: true,
    });
    expect(helpTaken(helpStages('h1,h1')).hints).toBe(1);
    expect(helpStages(undefined)).toEqual([]);
  });
});

describe('feedback by outcome class', () => {
  const s = step({ answer: 8, tolerance: 0.4 });
  const cls = value => answerClass(s, { status: 'incorrect', value }, 0.4);

  test('the classes are the six the prompt names', () => {
    expect(FEEDBACK_CLASSES).toEqual([
      'correct',
      'close',
      'wrong-sign',
      'wrong-unit',
      'wrong-order-of-magnitude',
      'off',
    ]);
  });

  test('each class is a relationship between the two numbers', () => {
    expect(answerClass(s, { status: 'correct', value: 8 }, 0.4)).toBe(
      'correct'
    );
    expect(cls(-8)).toBe('wrong-sign');
    expect(cls(8 * 365.25)).toBe('wrong-unit');
    expect(cls(8 / 365.25)).toBe('wrong-unit');
    expect(cls(8.9)).toBe('close');
    expect(cls(80)).toBe('wrong-order-of-magnitude');
    expect(cls(0.8)).toBe('wrong-order-of-magnitude');
    expect(cls(13)).toBe('off');
  });

  test('a unit the parser refuses is a wrong unit; other refusals are not classed', () => {
    expect(
      answerClass(s, { status: 'unreadable', reason: 'incompatibleUnit' }, 0.4)
    ).toBe('wrong-unit');
    expect(
      answerClass(s, { status: 'unreadable', reason: 'blank' }, 0.4)
    ).toBeNull();
    expect(answerClass(s, { status: 'ungraded' }, 0.4)).toBeNull();
  });

  test('only authored text is returned, never one made up', () => {
    const f = step({ feedback: { 'wrong-sign': 'Check the direction.' } });
    expect(feedbackFor(f, 'wrong-sign')).toBe('Check the direction.');
    expect(feedbackFor(f, 'close')).toBeNull();
    expect(feedbackFor(step(), 'off')).toBeNull();
  });
});

describe('a wrong option can name its misconception', () => {
  const c = {
    kind: 'choice',
    options: ['a', 'b', 'c'],
    answer: 1,
    misconceptions: [
      { id: 'centre', option: 0, say: 'The star is not central.' },
    ],
  };
  test('the bound option names it, the right one and others do not', () => {
    expect(matchMisconception(c, 0, 0)?.message).toBe(
      'The star is not central.'
    );
    expect(matchMisconception(c, 1, 0)).toBeNull();
    expect(matchMisconception(c, 2, 0)).toBeNull();
  });
});
