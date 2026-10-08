import { describe, test, expect, beforeAll } from '@jest/globals';

import { loadAuthoringInputs } from '../tools/authoring/inputs.mjs';
import {
  checkCatalog,
  leaksAnswer,
  scaffoldProblems,
} from '../js/authoring/rules.js';

// =============================================================================
// The scaffolding rules, one fault at a time (Roadmap II, Prompt 71)
// -----------------------------------------------------------------------------
// A hint ladder, outcome-class feedback and a reflection are only worth having
// if the checker refuses the ways they go wrong: a hint that hands over the
// answer, a fourth hint, a class that does not exist, a reflection that is
// secretly marked. Each fixture below breaks one thing in a copy of a real
// lesson and asserts the named rule fires.
// =============================================================================

let inputs;
beforeAll(async () => {
  inputs = await loadAuthoringInputs();
});

/** Rules raised after `mutate` is applied to the first numeric step found. */
function raised(mutate, kind = 'numeric') {
  const copy = { ...inputs };
  copy.investigations = inputs.investigations.map(inv => {
    if (inv.id !== 'keplers-laws') return inv;
    const draft = { ...inv, steps: inv.steps.map(s => ({ ...s })) };
    mutate(draft.steps.find(s => s.kind === kind));
    return draft;
  });
  return new Set(checkCatalog(copy).map(f => f.rule));
}

describe('a hint may not contain the expected value', () => {
  const step = { kind: 'numeric', answer: 8, tolerance: 0.4 };

  test('a number the step would accept is a leak, in either decimal convention', () => {
    expect(leaksAnswer('So the period is 8 years.', step)).toBe(true);
    expect(leaksAnswer('It comes to 7,8.', step)).toBe(true);
    expect(leaksAnswer('Square the 4 first.', step)).toBe(false);
    expect(leaksAnswer('Take the cube root of 512.', step)).toBe(false);
  });

  test('for a choice, the right option quoted back is a leak', () => {
    const choice = {
      kind: 'choice',
      options: ['the centre of the ellipse', 'one focus of the ellipse'],
      answer: 1,
    };
    expect(leaksAnswer('It is one focus of the ellipse.', choice)).toBe(true);
    expect(leaksAnswer('Think about where the foci are.', choice)).toBe(false);
  });

  test('the checker fires on a leaking hint, feedback or named mistake', () => {
    expect(
      raised(s => (s.hints = ['The answer is ' + s.answer + '.']))
    ).toContain('content/hint-leak');
    expect(
      raised(s => (s.feedback = { off: `Try ${s.answer} instead.` }))
    ).toContain('content/hint-leak');
    expect(
      raised(
        s => (s.misconceptions = [{ id: 'x', equals: 1, say: `${s.answer}` }])
      )
    ).toContain('content/hint-leak');
  });

  test('a hint that teaches a check passes', () => {
    expect(
      raised(s => (s.hints = ['Check which law relates period to size.']))
    ).not.toContain('content/hint-leak');
  });
});

describe('the ladder, the classes and the reflection are held to their shape', () => {
  test('four hints is one too many, and an empty hint is refused', () => {
    expect(raised(s => (s.hints = ['a', 'b', 'c', 'd']))).toContain(
      'content/hints'
    );
    expect(raised(s => (s.hints = ['a', '']))).toContain('content/hints');
  });

  test('feedback names real classes, with words, on a numeric step', () => {
    expect(raised(s => (s.feedback = { nonsense: 'x' }))).toContain(
      'content/feedback'
    );
    expect(raised(s => (s.feedback = { off: '' }))).toContain(
      'content/feedback'
    );
    expect(
      raised(s => (s.feedback = { off: 'Check the units.' }), 'choice')
    ).toContain('content/feedback');
    expect(
      raised(s => (s.feedback = { 'wrong-sign': 'Check the direction.' }))
    ).not.toContain('content/feedback');
  });

  test('an option-bound misconception needs a real wrong option and words', () => {
    const rules = problems => problems.map(p => p.rule);
    const base = { kind: 'choice', options: ['a', 'b', 'c'], answer: 1 };
    const bad = m => scaffoldProblems({ ...base, misconceptions: [m] });
    expect(rules(bad({ id: 'm', option: 9, say: 'x' }))).toContain(
      'content/feedback'
    );
    expect(rules(bad({ id: 'm', option: 1, say: 'x' }))).toContain(
      'content/feedback'
    );
    expect(rules(bad({ id: 'm', option: 0 }))).toContain('content/feedback');
    expect(bad({ id: 'm', option: 0, say: 'Think about foci.' })).toEqual([]);
  });

  test('a reflection is a short written step that nothing marks', () => {
    const fine = {
      kind: 'short',
      reflect: true,
      prompt: 'What surprised you?',
    };
    expect(scaffoldProblems(fine)).toEqual([]);
    expect(scaffoldProblems({ ...fine, rubric: 'x' })[0].rule).toBe(
      'content/reflect'
    );
    expect(scaffoldProblems({ ...fine, kind: 'choice' })[0].rule).toBe(
      'content/reflect'
    );
    expect(scaffoldProblems({ ...fine, answer: 3 })[0].rule).toBe(
      'content/reflect'
    );
  });
});

describe('what a Spanish reader sees is checked too', () => {
  test('a leak that exists only in the Spanish hints is found', () => {
    const [id] = inputs.investigations
      .filter(i => i.id === 'keplers-laws')
      .map(i => i.id);
    const es = inputs.translations.es?.[id];
    expect(es).toBeTruthy();
    const patched = { ...inputs, translations: { ...inputs.translations } };
    patched.translations.es = {
      ...inputs.translations.es,
      [id]: {
        ...es,
        data: {
          ...es.data,
          steps: es.data.steps.map((s, i) => {
            const en = inputs.investigations.find(x => x.id === id).steps[i];
            return s && s.hints && en.kind === 'numeric'
              ? {
                  ...s,
                  hints: {
                    concept: `Es ${String(en.answer).replace('.', ',')}, claro.`,
                  },
                }
              : s;
          }),
        },
      },
    };
    const found = checkCatalog(patched).filter(
      f => f.rule === 'content/hint-leak' && /^es:/.test(f.message)
    );
    expect(found.length).toBeGreaterThan(0);
  });
});

describe('the pack format and the engine agree', () => {
  test('the class list and the hint limit are the engine’s', async () => {
    const bank = await import('../js/platform/questionBank.js');
    const engine = await import('../js/answerFeedback.js');
    expect([...bank.FEEDBACK_CLASSES]).toEqual([...engine.FEEDBACK_CLASSES]);
    expect(bank.HINT_LIMIT).toBe(engine.HINT_LIMIT);
  });
});

describe('a pack carries a ladder, feedback and a reflection', () => {
  test('they validate, compile into the lesson, and a bad class is refused', async () => {
    const { checkInvestigationPack } = await import('../js/composer/api.js');
    const { EXAMPLE_INVESTIGATION } = await import('../js/composer/example.js');
    const { compileInvestigation } = await import('../js/composer/compile.js');
    const { SCENARIO_INFO } = await import('../js/data/scenarioInfo.js');
    const pack = JSON.parse(JSON.stringify(EXAMPLE_INVESTIGATION));
    const item = pack.bank.items.find(i => i.kind === 'numeric');
    const T = en => ({ en });
    item.hints = [T('Think about the law.'), T('Which quantity is cubed?')];
    item.feedback = { 'wrong-sign': T('Check the direction.') };
    const ok = await checkInvestigationPack(JSON.parse(JSON.stringify(pack)));
    expect(ok.errors.filter(e => /hints|feedback/.test(e.path))).toEqual([]);
    const { lesson } = compileInvestigation(pack, { scenarios: SCENARIO_INFO });
    const step = lesson.steps.find(s => Array.isArray(s.hints));
    expect(step.hints).toHaveLength(2);
    expect(step.feedback['wrong-sign']).toBe('Check the direction.');
    item.feedback = { nonsense: T('x') };
    const bad = await checkInvestigationPack(pack);
    expect(bad.errors.some(e => e.code === 'feedbackClass')).toBe(true);
  });
});

describe('the instructor key prints the scaffolding', () => {
  test('hints, feedback classes and named mistakes appear, in words', async () => {
    const { entryFor } = await import('../js/answerKey.js');
    const e = entryFor(
      {
        type: 'question',
        kind: 'numeric',
        title: 't',
        prompt: 'p',
        answer: 8,
        hints: ['<em>One</em>', 'Two'],
        worked: 'Eight.',
        feedback: { 'wrong-sign': 'Check the direction.', off: 'Re-read.' },
        misconceptions: [{ id: 'm', say: 'You cubed it.', factor: 2 }],
      },
      0
    );
    expect(e.help).toEqual({ hints: ['One', 'Two'], worked: 'Eight.' });
    expect(e.feedback).toEqual([
      { class: 'wrong-sign', text: 'Check the direction.' },
      { class: 'off', text: 'Re-read.' },
    ]);
    expect(e.mistakes[0]).toMatchObject({ id: 'm', text: 'You cubed it.' });
  });
});
