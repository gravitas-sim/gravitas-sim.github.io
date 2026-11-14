/**
 * A Spanish step belongs to its English step by sid, not by position.
 *
 * The fixture lesson is small on purpose: what is under test is the matching,
 * not any real lesson's words. Real lessons are held to the same rule by the
 * authoring checks (tests/authoring.test.js) and by tests/investigationRegistry.test.js.
 */
import {
  alignShadow,
  isStepList,
  mergeTranslation,
  translationCoverage,
} from '../js/data/investigations/i18n.js';
import { overlay } from '../js/investigations/depthPure.js';

const probe = () => 'machinery';
const step = (sid, extra = {}) => ({
  sid,
  type: 'read',
  title: `English ${sid}`,
  body: `English body of ${sid}`,
  ...extra,
});

const lesson = () => ({
  id: 'fixture',
  title: 'Fixture',
  objectives: ['first', 'second'],
  steps: [
    step('one'),
    step('two', {
      type: 'question',
      kind: 'choice',
      options: ['yes', 'no'],
      answer: 1,
      probe,
    }),
    step('three'),
    step('four'),
  ],
});

const SHADOW = {
  title: 'Accesorio',
  objectives: ['primero', 'segundo'],
  steps: {
    one: { title: 'Uno', body: 'cuerpo uno' },
    two: { title: 'Dos', options: ['si', 'no'] },
    three: { title: 'Tres' },
    four: { title: 'Cuatro', body: 'cuerpo cuatro' },
  },
};

/** The same permutation every run: a property test that can be replayed. */
function shuffled(items, seed) {
  const out = items.slice();
  let s = seed >>> 0;
  const next = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

describe('a Spanish step is matched to its English step by sid', () => {
  test('each English step takes the words filed under its sid', () => {
    const es = mergeTranslation(lesson(), SHADOW);
    expect(es.title).toBe('Accesorio');
    expect(es.steps.map(s => s.title)).toEqual([
      'Uno',
      'Dos',
      'Tres',
      'Cuatro',
    ]);
    expect(es.steps[1].options).toEqual(['si', 'no']);
    // What the shadow does not say stays English.
    expect(es.steps[1].body).toBe('English body of two');
    // The machinery arrives untouched, functions by reference.
    expect(es.steps[1].answer).toBe(1);
    expect(es.steps[1].probe).toBe(probe);
    expect(es.steps.map(s => s.sid)).toEqual(['one', 'two', 'three', 'four']);
  });

  test('moving a step no longer moves its Spanish: any order, the same steps', () => {
    const english = lesson();
    const inOrder = mergeTranslation(english, SHADOW);
    const bySid = Object.fromEntries(inOrder.steps.map(s => [s.sid, s]));
    for (let seed = 1; seed <= 40; seed++) {
      const moved = { ...english, steps: shuffled(english.steps, seed) };
      const merged = mergeTranslation(moved, SHADOW);
      expect(merged.steps.map(s => s.sid)).toEqual(moved.steps.map(s => s.sid));
      for (const s of merged.steps) expect(s).toEqual(bySid[s.sid]);
    }
  });

  test('the same holds for the deeper steps, which are laid by their own overlay', () => {
    const base = lesson().steps;
    const inOrder = overlay(base, SHADOW.steps);
    const bySid = Object.fromEntries(inOrder.map(s => [s.sid, s]));
    for (let seed = 1; seed <= 20; seed++) {
      for (const s of overlay(shuffled(base, seed), SHADOW.steps))
        expect(s).toEqual(bySid[s.sid]);
    }
  });

  test('the deeper-step overlay matches steps the way mergeTranslation does', () => {
    const steps = lesson().steps;
    for (const words of [
      SHADOW.steps,
      [{ title: 'Uno' }, null, { title: 'Tres' }],
      'nonsense',
      { ghost: { title: 'Fantasma' } },
    ])
      expect(overlay(steps, words)).toEqual(
        mergeTranslation({ steps }, { steps: words }).steps
      );
  });

  test('a step inserted in the English has no Spanish yet and moves no other', () => {
    const english = lesson();
    english.steps.splice(1, 0, step('inserted'));
    const es = mergeTranslation(english, SHADOW);
    expect(es.steps.map(s => s.title)).toEqual([
      'Uno',
      'English inserted',
      'Dos',
      'Tres',
      'Cuatro',
    ]);
  });

  test('a step removed from the English leaves the others as they were', () => {
    const english = lesson();
    english.steps.splice(0, 1);
    const es = mergeTranslation(english, SHADOW);
    expect(es.steps.map(s => s.title)).toEqual(['Dos', 'Tres', 'Cuatro']);
  });

  test('a Spanish step whose sid the lesson lacks adds no step', () => {
    const es = mergeTranslation(lesson(), {
      steps: { ...SHADOW.steps, ghost: { title: 'Fantasma' } },
    });
    expect(es.steps).toHaveLength(4);
    expect(JSON.stringify(es)).not.toContain('Fantasma');
  });

  test('a sid that is the name of an Object method matches nothing it should not', () => {
    const english = {
      ...lesson(),
      steps: [step('constructor'), step('toString'), step('__proto__')],
    };
    const es = mergeTranslation(english, { steps: { one: { title: 'Uno' } } });
    expect(es.steps.map(s => s.title)).toEqual([
      'English constructor',
      'English toString',
      'English __proto__',
    ]);
  });

  test('a sid inside a Spanish step is machinery and is refused', () => {
    const es = mergeTranslation(lesson(), {
      steps: { one: { sid: 'translated', title: 'Uno' } },
    });
    expect(es.steps[0].sid).toBe('one');
  });
});

describe('arrays that carry no sid are still read by index', () => {
  test('options, objectives and any other list', () => {
    const es = mergeTranslation(lesson(), SHADOW);
    expect(es.objectives).toEqual(['primero', 'segundo']);
    expect(isStepList(lesson().objectives)).toBe(false);
    expect(isStepList(lesson().steps)).toBe(true);
    expect(isStepList([])).toBe(false);
  });

  test('a shadow that still lists its steps (a pack made before steps were keyed) is read by index', () => {
    const listed = mergeTranslation(lesson(), {
      steps: [{ title: 'Uno' }, { title: 'Dos' }],
    });
    expect(listed.steps.map(s => s.title)).toEqual([
      'Uno',
      'Dos',
      'English three',
      'English four',
    ]);
  });

  test('alignShadow lays a shadow against the English, one entry per step', () => {
    const aligned = alignShadow(lesson().steps, SHADOW.steps);
    expect(aligned.map(x => x.title)).toEqual(['Uno', 'Dos', 'Tres', 'Cuatro']);
    expect(alignShadow(lesson().steps, 'nonsense')).toBeNull();
    expect(alignShadow(lesson().objectives, { 0: 'x' })).toBeNull();
  });
});

describe('the coverage count follows the sid too', () => {
  test('a moved step is counted against its own Spanish, and the paths name the English position', () => {
    const english = lesson();
    const inOrder = translationCoverage(english, SHADOW);
    const moved = {
      ...english,
      steps: [english.steps[3], ...english.steps.slice(0, 3)],
    };
    const after = translationCoverage(moved, SHADOW);
    expect(after.translated).toBe(inOrder.translated);
    expect(after.total).toBe(inOrder.total);
    expect([...after.missing].sort()).toEqual(
      inOrder.missing
        .map(path =>
          path.replace(
            /^steps\.(\d)\./,
            (_, n) => `steps.${(Number(n) + 1) % 4}.`
          )
        )
        .sort()
    );
  });
});
