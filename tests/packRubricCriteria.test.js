import { describe, test, expect } from '@jest/globals';
import { checkInvestigationPack } from '../js/composer/api.js';
import { EXAMPLE_INVESTIGATION } from '../js/composer/example.js';
import { remixBuiltin } from '../js/composer/remixApi.js';
import { mergeTranslation } from '../js/data/investigations/i18n.js';
import { answerKeyFor } from '../js/answerKey.js';
import { INVESTIGATIONS } from '../js/data/investigations.js';

// =============================================================================
// Rubric criteria in investigation packs and remixes (Prompt 79)
// =============================================================================

const clone = v => JSON.parse(JSON.stringify(v));
const t = (en, es) => ({ en, ...(es ? { es } : {}) });
const CRITERIA = [
  {
    name: t('Names both effects', 'Nombra los dos efectos'),
    levels: [
      {
        label: t('Full', 'Completo'),
        points: 2,
        text: t('A longer path and a weaker pull.', 'Más camino y menos pull.'),
      },
      { label: t('Not yet'), points: 0, text: t('Names one, or neither.') },
    ],
  },
];
const withCriteria = criteria => {
  const pack = clone(EXAMPLE_INVESTIGATION);
  const step = pack.steps.find(s => s.rubric);
  step.rubricCriteria = criteria;
  return { pack, step };
};

describe('rubricCriteria in a pack', () => {
  test('a sound table compiles onto the lesson step and its Spanish shadow', async () => {
    const { pack, step } = withCriteria(clone(CRITERIA));
    const v = await checkInvestigationPack(pack);
    expect(v.errors).toEqual([]);
    const got = v.compiled.lesson.steps.find(s => s.sid === step.sid);
    expect(got.rubricCriteria).toEqual([
      {
        name: 'Names both effects',
        levels: [
          {
            label: 'Full',
            points: 2,
            text: 'A longer path and a weaker pull.',
          },
          { label: 'Not yet', points: 0, text: 'Names one, or neither.' },
        ],
      },
    ]);
    const es = mergeTranslation(
      v.compiled.lesson,
      v.compiled.shadow
    ).steps.find(s => s.sid === step.sid);
    expect(es.rubricCriteria[0].name).toBe('Nombra los dos efectos');
    expect(es.rubricCriteria[0].levels[0].label).toBe('Completo');
    // The English stands where the pack has no Spanish.
    expect(es.rubricCriteria[0].levels[1].label).toBe('Not yet');
    expect(es.rubricCriteria[0].levels[0].points).toBe(2);
  });

  test('the answer key reads it as it reads a lesson’s', async () => {
    const { pack, step } = withCriteria(clone(CRITERIA));
    const v = await checkInvestigationPack(pack);
    const entry = answerKeyFor(v.compiled.lesson).entries.find(
      e => e.sid === step.sid
    );
    expect(entry.criteria).toHaveLength(1);
  });

  test.each([
    ['no criteria', [], /rubricCriteria/],
    [
      'seven criteria',
      Array.from({ length: 7 }, () => clone(CRITERIA[0])),
      /rubricCriteria/,
    ],
    [
      'one level',
      [{ ...clone(CRITERIA[0]), levels: [clone(CRITERIA[0].levels[0])] }],
      /levels/,
    ],
    [
      'an unknown field',
      [{ ...clone(CRITERIA[0]), weight: 3 }],
      /rubricCriteria\[0\]\.weight/,
    ],
    [
      'a negative number of points',
      (() => {
        const c = clone(CRITERIA);
        c[0].levels[0].points = -1;
        return c;
      })(),
      /points/,
    ],
    [
      'a level with no words',
      (() => {
        const c = clone(CRITERIA);
        delete c[0].levels[1].text;
        return c;
      })(),
      /levels\[1\]\.text/,
    ],
    [
      'markup in a level',
      (() => {
        const c = clone(CRITERIA);
        c[0].levels[0].text.en = '<script>x</script>';
        return c;
      })(),
      /levels\[0\]\.text/,
    ],
  ])('refuses %s', async (_, criteria, where) => {
    const { pack } = withCriteria(criteria);
    const v = await checkInvestigationPack(pack);
    expect(v.errors.map(e => `${e.path}: ${e.message}`).join('\n')).toMatch(
      where
    );
  });

  test('is for a written answer only', async () => {
    const pack = clone(EXAMPLE_INVESTIGATION);
    const choice = pack.steps.find(
      s => s.type === 'question' && s.kind === 'choice'
    );
    choice.rubricCriteria = clone(CRITERIA);
    const v = await checkInvestigationPack(pack);
    expect(v.errors.length).toBeGreaterThan(0);
  });
});

describe('rubricCriteria in a remix', () => {
  test('a remix carries the original’s criteria, both languages, and compiles back', async () => {
    const { pack } = await remixBuiltin('orbital-energy', { id: 'my-oe' });
    const step = pack.steps.find(s => s.rubricCriteria);
    expect(step.rubricCriteria[0].name.en).toBe('Reaches the right answer');
    expect(step.rubricCriteria[0].name.es).toBe(
      'Llega a la respuesta correcta'
    );
    expect(step.rubricCriteria[0].levels[0].points).toBe(2);
    const v = await checkInvestigationPack(pack);
    expect(v.errors).toEqual([]);
    const original = INVESTIGATIONS.find(
      i => i.id === 'orbital-energy'
    ).steps.find(s => s.sid === step.sid);
    const got = v.compiled.lesson.steps.find(s => s.sid === step.sid);
    expect(got.rubricCriteria).toEqual(original.rubricCriteria);
  });

  test('editing a level’s words and points takes effect; removing the table removes it', async () => {
    const { pack } = await remixBuiltin('orbital-energy', { id: 'my-oe' });
    const edited = clone(pack);
    const step = edited.steps.find(s => s.rubricCriteria);
    step.rubricCriteria[0].levels[0].text = t('Says no, because E > 0.');
    step.rubricCriteria[0].levels[0].points = 3;
    const v = await checkInvestigationPack(edited);
    expect(v.errors).toEqual([]);
    const got = v.compiled.lesson.steps.find(s => s.sid === step.sid);
    expect(got.rubricCriteria[0].levels[0]).toMatchObject({
      text: 'Says no, because E > 0.',
      points: 3,
    });
    const dropped = clone(pack);
    delete dropped.steps.find(s => s.rubricCriteria).rubricCriteria;
    const w = await checkInvestigationPack(dropped);
    expect(w.errors).toEqual([]);
    expect(
      w.compiled.lesson.steps.find(s => s.sid === step.sid).rubricCriteria
    ).toBeUndefined();
  });
});
