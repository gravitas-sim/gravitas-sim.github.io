// =============================================================================
// Three arguments a student makes, rather than reads
// -----------------------------------------------------------------------------
// A Universe of Stars is supposed to contain three complete predict-and-test
// loops: equal-temperature stars of different luminosities, hot-and-faint
// implying a small radius, and a brightness-limited sample misrepresenting the
// population it came from. "Complete" means four things in order - commit to an
// answer, do something to the actual scene, record what came out, and say why -
// and two of the three were missing their first step. A reader met the white
// dwarf by being told to measure it, and met the survey's cut by counting
// twice; in neither case had they staked anything first, which is the whole
// mechanism by which a surprising result changes somebody's mind.
//
// So this is a test about the shape of the lesson rather than about any one
// screen. It is here because that shape is easy to lose: inserting a step
// renumbers everything, and a loop can be broken by an edit three screens away.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import A_UNIVERSE_OF_STARS from '../js/data/investigations/a-universe-of-stars.js';

const steps = A_UNIVERSE_OF_STARS.steps;
const bySid = new Map(steps.map((s, i) => [s.sid, { ...s, index: i }]));
const at = sid => {
  const step = bySid.get(sid);
  if (!step) throw new Error(`no step "${sid}"`);
  return step;
};

/** Does this step put the reader in contact with real scene objects? */
const touchesScene = step =>
  Boolean(step.stage?.stars?.length || step.stage?.population || step.bind);

/** Does it record what came out, somewhere that outlives the screen? */
const records = step =>
  Boolean(step.fields?.length || step.tool?.capture || step.prompt);

const LOOPS = [
  {
    name: 'equal temperature, different luminosity',
    predict: 'predict-which-is-bigger',
    act: 'measure-the-radius-ratio',
    explainOn: 'measure-the-radius-ratio',
  },
  {
    name: 'hot and faint means small',
    predict: 'predict-hot-and-faint',
    act: 'hot-and-faint',
    explainOn: 'classify-from-position',
  },
  {
    name: 'a brightness-limited sample misrepresents its population',
    predict: 'predict-the-bright-subset',
    act: 'only-the-bright-ones',
    explainOn: 'what-a-survey-misses',
  },
];

describe.each(LOOPS)('$name', loop => {
  test('opens with a prediction the reader has to commit to', () => {
    const step = at(loop.predict);
    expect(step.type).toBe('predict');
    expect(step.prompt).toBeTruthy();
    expect(step.options?.length).toBeGreaterThanOrEqual(3);
    expect(Number.isInteger(step.answer)).toBe(true);
    // A prediction with no argument behind it is a quiz question. The reason
    // is what the reader is given back after committing, and in all three of
    // these the wrong options are the interesting part.
    expect(step.because.length).toBeGreaterThan(200);
  });

  test('the prediction is about the scene the test uses', () => {
    // Both screens have to be about the same stars, or the reader has
    // predicted one thing and measured another.
    const predict = at(loop.predict);
    const act = at(loop.act);
    expect(touchesScene(predict)).toBe(true);
    expect(touchesScene(act)).toBe(true);
    const names = s =>
      (s.stage?.stars ?? [])
        .map(x => x.name)
        .sort()
        .join('|');
    if (predict.stage?.stars && act.stage?.stars) {
      expect(names(predict)).toBe(names(act));
    } else {
      // A population loop: same seed, same count, same distance.
      expect(predict.stage.population.seed).toBe(act.stage.population.seed);
      expect(predict.stage.population.count).toBe(act.stage.population.count);
      expect(predict.stage.population.distancePc).toBe(
        act.stage.population.distancePc
      );
    }
  });

  test('the test records a result rather than only showing one', () => {
    const step = at(loop.act);
    expect(records(step)).toBe(true);
    expect(step.type).toBe('measure');
    expect(step.fields?.length).toBeGreaterThan(0);
    // And the numbers are checked, so a reader who read the wrong row is told.
    expect(typeof step.validate).toBe('function');
  });

  test('it ends with the reader saying why, in their own words', () => {
    const step = at(loop.explainOn);
    const written = step.prompt || step.fields?.some(f => f.kind === 'text');
    expect(Boolean(written)).toBe(true);
  });

  test('the four screens are in that order', () => {
    expect(at(loop.predict).index).toBeLessThan(at(loop.act).index);
    expect(at(loop.act).index).toBeLessThanOrEqual(at(loop.explainOn).index);
  });
});

describe('each loop leaves evidence behind', () => {
  test('every loop can be captured to the notebook', () => {
    for (const loop of LOOPS) {
      const act = at(loop.act);
      const capture =
        act.tool?.capture === true ||
        // The white-dwarf reading is captured on the lab, which the step
        // opens with capture on.
        act.tool?.id === 'stellar-lab';
      expect(`${loop.name}: ${capture}`).toContain('true');
    }
  });
});

describe('the argument at the end is the argument from the start', () => {
  test('the closing question puts the opening prediction back', () => {
    const open = at('three-stars-no-labels');
    const close = at('the-argument');
    expect(open.type).toBe('predict');
    expect(close.type).toBe('question');
    // The same three stars, so a reader is revising a judgement about
    // particular objects rather than answering a general question.
    const names = s => (s.stage?.stars ?? []).map(x => x.name).join('|');
    expect(names(close)).toBe(names(open));
    expect(close.index).toBe(steps.length - 1);
  });
});
