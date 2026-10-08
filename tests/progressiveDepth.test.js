// Progressive depth (Roadmap II, Prompt 72): one lesson at three depths, one
// science. The rules that hold the line, the numeric answer with an
// uncertainty, progress that survives a change of depth, and the keys, reports
// and assignments that state the depth.
import { describe, test, expect } from '@jest/globals';
import {
  INVESTIGATIONS,
  DEEPER,
  withAllDepths,
} from '../js/data/investigations.js';
import { mergeTranslation } from '../js/data/investigations/i18n.js';
import { checkDepth } from '../js/authoring/depthRules.js';
import {
  depthsOf,
  layDepth,
  lessonAt,
  stepCounts,
} from '../js/investigations/depthPure.js';
import {
  DEPTHS,
  inDepth,
  readProgress,
  writeProgress,
} from '../js/investigations/progressSchema.js';
import { stepFingerprint } from '../js/investigations/progressBackup.js';
import { asGiven, checkAnswer, gradeAnswer } from '../js/answerCheck.js';
import { answerKeyFor, verifyKey } from '../js/answerKey.js';
import {
  buildAssignment,
  resolveSelection,
  validateAssignment,
} from '../js/assignments/assignment.js';

const IDS = [
  'keplers-laws',
  'transit-photometry',
  'weighing-stars',
  'missing-mass',
];
const core = id => INVESTIGATIONS.find(i => i.id === id);
/** A deep copy that keeps functions. */
const clone = v =>
  Array.isArray(v)
    ? v.map(clone)
    : v && typeof v === 'object'
      ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, clone(x)]))
      : v;
const words = async id =>
  (await import(`../js/data/investigations/depth/es/${id}.js`)).default;

describe('the four proof lessons', () => {
  test.each(IDS)('%s offers all three depths with steps at each', id => {
    const laid = withAllDepths(core(id));
    expect(core(id).depths).toEqual(DEPTHS);
    expect(depthsOf(laid)).toEqual(DEPTHS);
    const n = stepCounts(laid);
    expect(n.core).toBe(core(id).steps.length);
    expect(n.quantitative).toBeGreaterThan(n.core);
    expect(n.advanced).toBeGreaterThan(n.quantitative);
  });

  test.each(IDS)('%s: the core steps and their order are untouched', id => {
    const laid = withAllDepths(core(id));
    expect(lessonAt(laid, 'core').steps.map(s => s.sid)).toEqual(
      core(id).steps.map(s => s.sid)
    );
  });

  test.each(IDS)('%s keeps every depth rule', async id => {
    const c = core(id);
    const found = checkDepth(
      c,
      layDepth(c, DEEPER[id]),
      DEEPER[id],
      await words(id)
    );
    expect(found).toEqual([]);
  });

  test.each(IDS)(
    '%s: every deeper step is translated in the same order',
    async id => {
      const es = await words(id);
      const merged = mergeTranslation({ steps: DEEPER[id] }, es);
      merged.steps.forEach((s, i) => {
        expect(s.title).not.toBe(DEEPER[id][i].title);
        expect(s.body).not.toBe(DEEPER[id][i].body);
        expect(s.sid).toBe(DEEPER[id][i].sid);
        expect(s.after).toBe(DEEPER[id][i].after);
      });
    }
  );

  test.each(IDS)(
    '%s: every graded deeper answer is accepted, and the key verifies',
    id => {
      const laid = withAllDepths(core(id));
      expect(verifyKey(laid)).toEqual([]);
      for (const s of DEEPER[id].filter(x => x.kind === 'numeric'))
        expect(checkAnswer(s, asGiven(s, s.answer))).toBe(true);
    }
  );
});

describe('the rules refuse what would change the science', () => {
  const id = 'keplers-laws';
  const run = mutate => {
    const c = core(id);
    const deeper = clone(DEEPER[id]);
    mutate(deeper);
    return checkDepth(c, layDepth(c, deeper), deeper, null).map(f => f.rule);
  };

  test('a depth-specific expectation that disagrees with the core one', () => {
    expect(run(d => (d[2].answer = 9))).toContain('depth/expectation');
  });
  test('a deeper step that opens a scenario of its own', () => {
    expect(run(d => (d[0].setup = { scenario: 'Solar System' }))).toContain(
      'depth/world'
    );
  });
  test('a deeper step laid after a step that is not there', () => {
    expect(run(d => (d[0].after = 'no-such-step'))).toContain('depth/anchor');
  });
  test('a computed field that reads a later step', () => {
    expect(
      run(d => (d[0].fields[3].compute = (v, e) => e('what-newton-added', 'x')))
    ).toContain('depth/earlier');
  });
  test('a core step that depends on a deeper one', () => {
    const c = { ...core(id), steps: core(id).steps.map(s => ({ ...s })) };
    c.steps[0].requires = [DEEPER[id][0].sid];
    const found = checkDepth(c, layDepth(c, DEEPER[id]), DEEPER[id], null);
    expect(found.map(f => f.rule)).toContain('depth/refs');
  });
  test('an uncertainty answer needs a tolerance', () => {
    expect(run(d => (d[2].tolerance = 0))).toContain('depth/uncertainty');
  });
});

describe('a numeric answer with an uncertainty', () => {
  const step = {
    kind: 'numeric',
    uncertainty: true,
    answer: 8,
    tolerance: 0.4,
    unit: 'years',
  };
  test.each([
    ['8.0 ± 0.1', true],
    ['8.1 +/- 0.2', true],
    ['8.3 +- 0.2', true],
    ['7.7 ± 0.5', true],
    ['8', false],
    ['8.0 ± 0', false],
    ['8.0 ± 5', false],
    ['7 ± 0.1', false],
    ['', false],
  ])('%s is %s', (typed, ok) => {
    expect(checkAnswer(step, typed)).toBe(ok);
  });
  test('a value alone is unreadable, not wrong', () => {
    expect(gradeAnswer(step, '8')).toMatchObject({
      status: 'unreadable',
      reason: 'needsUncertainty',
    });
  });
  test('a Spanish decimal comma reads', () => {
    expect(checkAnswer(step, '8,0 ± 0,1', { locale: 'es' })).toBe(true);
  });
  test('a step without it grades exactly as before', () => {
    expect(
      checkAnswer({ kind: 'numeric', answer: 8, tolerance: 0.4 }, '8.2')
    ).toBe(true);
  });
});

describe('computed fields use the numbers already measured', () => {
  test('the weighted fit reads the four-planet table', () => {
    const t = {
      'measure-four-planets:p1_a': 1,
      'measure-four-planets:p1_P': 1,
      'measure-four-planets:p2_a': 5.204,
      'measure-four-planets:p2_P': 11.86,
      'repeat-the-timing:frac': 0.0003,
    };
    const e = (s, f) => Number(t[`${s}:${f}`]);
    const fit = DEEPER['keplers-laws'][1].fields;
    const by = id => fit.find(f => f.id === id).compute({}, e);
    expect(by('k_w')).toBeCloseTo(1, 2);
    expect(by('p4')).toBeCloseTo(8, 1);
    expect(by('s_k')).toBeGreaterThan(0);
  });
  test('the mass of the pair carries its uncertainty from the entered a and P', () => {
    const e = (s, f) => ({ a: 4, p: 4 })[f];
    const fields = DEEPER['weighing-stars'][0].fields;
    const m = fields.find(f => f.id === 'm_tot').compute({}, e);
    const s = fields
      .find(f => f.id === 's_tot')
      .compute({ sa: 0.1, sp: 0.2 }, e);
    expect(m).toBe(4);
    expect(s).toBeCloseTo(4 * Math.hypot(0.075, 0.1), 5);
  });
});

describe('progress survives a change of depth', () => {
  const laid = withAllDepths(core('keplers-laws'));
  const deeperSid = DEEPER['keplers-laws'][0].sid;
  const state = {
    lesson: laid,
    responses: { [`keplers-laws:${deeperSid}:t1`]: '1.0000' },
    attempts: {},
    visited: new Set([deeperSid]),
    stepSid: deeperSid,
    startedAt: 'x',
  };
  test('a core reader writes the payload an older build wrote', () => {
    const p = writeProgress({ ...state, depth: null, deepest: 'core' });
    expect('depth' in p).toBe(false);
    expect('deepest' in p).toBe(false);
  });
  test('the choice and the deepest reached are recorded and read back', () => {
    const p = writeProgress({
      ...state,
      depth: 'core',
      deepest: 'quantitative',
    });
    const back = readProgress(JSON.parse(JSON.stringify(p)), laid);
    expect(back.depth).toBe('core');
    expect(back.deepest).toBe('quantitative');
    // Answers at the deeper step are still there after returning to core.
    expect(back.responses[`keplers-laws:${deeperSid}:t1`]).toBe('1.0000');
  });
  test('the same payload read against core alone is what drops deeper answers', () => {
    const p = writeProgress({
      ...state,
      depth: 'quantitative',
      deepest: 'quantitative',
    });
    const back = readProgress(
      JSON.parse(JSON.stringify(p)),
      core('keplers-laws')
    );
    expect(Object.keys(back.responses)).toHaveLength(0);
  });
  test('an unknown depth is ignored', () => {
    const p = {
      schema: 2,
      lesson: 'x',
      responses: {},
      depth: 'deepest',
      visited: [],
    };
    expect(readProgress(p, laid).depth).toBeNull();
  });
});

describe('what the student, the key and the pins see', () => {
  test('a step is shown at its depth and every deeper one', () => {
    const s = { depth: 'quantitative' };
    expect([
      inDepth(s, 'core'),
      inDepth(s, 'quantitative'),
      inDepth(s, 'advanced'),
    ]).toEqual([false, true, true]);
    expect(inDepth({}, 'core')).toBe(true);
    expect(inDepth({ depth: 'nonsense' }, 'core')).toBe(true);
  });
  test('the fingerprint ignores depth, so pins do not move', () => {
    const base = { sid: 'a', type: 'measure', fields: [{ id: 'x' }] };
    expect(stepFingerprint({ ...base, depth: 'advanced' })).toBe(
      stepFingerprint(base)
    );
  });
  test('an answer key per depth numbers the steps a student there sees', () => {
    const laid = withAllDepths(core('weighing-stars'));
    const n = stepCounts(laid);
    for (const d of DEPTHS) {
      const key = answerKeyFor(laid, d);
      expect(key.depth).toBe(d);
      expect(key.entries).toHaveLength(n[d]);
      expect(key.entries.map(e => e.step)).toEqual(
        key.entries.map((_, i) => i + 1)
      );
    }
    expect(answerKeyFor(laid).depth).toBeNull();
  });
});

describe('assignments and course items carry the depth', () => {
  const laid = withAllDepths(core('weighing-stars'));
  const chosen = laid.steps.map(s => s.sid);
  test('an assignment set at core holds no deeper step', () => {
    const r = resolveSelection(laid, chosen, 'core');
    expect(r.sids).toEqual(core('weighing-stars').steps.map(s => s.sid));
  });
  test('set at quantitative it holds that depth and not the advanced one', () => {
    const r = resolveSelection(laid, chosen, 'quantitative');
    const adv = DEEPER['weighing-stars'].filter(s => s.depth === 'advanced');
    for (const s of adv) expect(r.sids).not.toContain(s.sid);
    expect(r.sids).toContain(DEEPER['weighing-stars'][0].sid);
  });
  test('the payload names the depth and validates', () => {
    const a = buildAssignment({
      lesson: laid,
      chosen,
      title: 'Week 4',
      depth: 'quantitative',
      fingerprint: stepFingerprint,
    });
    expect(a.d).toBe('quantitative');
    expect(a.v).toBe(2);
    expect(validateAssignment(a).ok).toBe(true);
    expect(validateAssignment({ ...a, d: 'expert' })).toMatchObject({
      reason: 'badDepth',
    });
  });
  test('an assignment without a depth is the payload it always was', () => {
    const a = buildAssignment({
      lesson: laid,
      chosen: ['you-cannot-put-a-star'],
      fingerprint: stepFingerprint,
    });
    expect('d' in a).toBe(false);
    expect(a.v).toBe(1);
  });
});
