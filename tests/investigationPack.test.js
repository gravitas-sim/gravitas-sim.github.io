import { describe, test, expect } from '@jest/globals';

import {
  validateInvestigationPack,
  migrateInvestigationPack,
  makeChecker,
  FORMAT,
} from '../js/platform/investigation.js';
import {
  validateQuestionBankWith,
  BANK_FORMAT,
} from '../js/platform/questionBank.js';
import {
  RELATIONS,
  RELATION_IDS,
  evaluateRelation,
} from '../js/platform/relations.js';
import { packApi } from '../js/composer/api.js';
import { EXAMPLE_INVESTIGATION } from '../js/composer/example.js';

// =============================================================================
// gravitas.investigation-pack/1 and gravitas.question-bank/1: the format
// -----------------------------------------------------------------------------
// What a pack may hold, what it may not, and - because a pack is a file anyone
// can hand a teacher - what a hostile one is refused for before any rule reads
// it. Each case mutates the example (js/composer/example.js), which is valid,
// and names the path and the code the complaint must carry: a page shows the
// complaint on that path's field, in the reader's language, by that code.
// =============================================================================

const api = packApi();
const clone = v => JSON.parse(JSON.stringify(v));
const good = () => clone(EXAMPLE_INVESTIGATION);
const problems = p => validateInvestigationPack(p, api);
const codesAt = p => problems(p).map(e => `${e.path} ${e.code}`);
const step = (p, sid) => p.steps.find(s => s.sid === sid);

describe('the example', () => {
  test('is a valid pack', () => {
    expect(problems(good())).toEqual([]);
  });

  test('reads through the migration unchanged', () => {
    const p = good();
    expect(migrateInvestigationPack(p)).toEqual({ ok: true, pack: p });
    expect(migrateInvestigationPack({ ...p, formatVersion: 2 })).toEqual({
      ok: false,
      code: 'newer',
      vars: { version: 2 },
    });
    expect(migrateInvestigationPack({ format: BANK_FORMAT }).ok).toBe(false);
    expect(migrateInvestigationPack(null).ok).toBe(false);
  });
});

describe('what a pack may hold', () => {
  const cases = [
    ['an id Gravitas already uses', p => (p.id = 'keplers-laws'), 'id idTaken'],
    [
      'a duration the card cannot print',
      p => (p.duration = 'soon'),
      'duration duration',
    ],
    ['an unknown field', p => (p.author = 'x'), 'author unknownField'],
    ['no objectives', p => (p.objectives = []), 'objectives objectives'],
    [
      'a prerequisite lesson that does not exist',
      p => (p.prerequisites = [{ lesson: 'nope' }]),
      'prerequisites[0].lesson lesson',
    ],
    [
      'a first step with no scenario',
      p => delete p.steps[0].setup,
      'steps[0].setup firstSetup',
    ],
    [
      'a scenario Gravitas lacks',
      p => (p.steps[0].setup.scenario = 'Nowhere'),
      'steps[0].setup.scenario scenario',
    ],
    [
      'a seed that is a number, not a word',
      p => (p.steps[0].setup.seed = 7),
      'steps[0].setup.seed setupSeed',
    ],
    [
      'an instrument Gravitas lacks',
      p => (p.steps[2].tool = { id: 'no-such-tool' }),
      'steps[2].tool.id widget',
    ],
    [
      'two steps with one id',
      p => (p.steps[2].sid = p.steps[1].sid),
      'steps[2].sid repeat',
    ],
    [
      'a step id with a colon',
      p => (p.steps[2].sid = 'a:b'),
      'steps[2].sid sid',
    ],
    [
      'a prediction marked at an earlier step',
      p => (step(p, 'guess').reveal = 'look'),
      'steps[1].reveal reveal',
    ],
    [
      'a choice with no right answer',
      p => (step(p, 'which').answer = 5),
      'steps[6].answer choiceAnswer',
    ],
    [
      'a question from a missing bank item',
      p => (step(p, 'period').from = 'nope'),
      'steps[4].from bankItem',
    ],
    [
      'the same bank item asked twice',
      p => (
        (step(p, 'which').from = 'kepler-period'),
        delete step(p, 'which').kind
      ),
      'steps[6].from bankRepeat',
    ],
    [
      'a closing step that asks something',
      p => p.steps.pop(),
      'steps[7].type closing',
    ],
    [
      'a measurement named twice',
      p =>
        step(p, 'time-it').fields.push({
          id: 'period',
          label: { en: 'Again' },
        }),
      'steps[3].fields[1].id fieldId',
    ],
    ['no English', p => delete p.title.en, 'title.en textMissing'],
    [
      'a language the pack does not declare',
      p => (p.title.fr = 'Lire'),
      'title.fr textLocale',
    ],
    [
      'an inline question with no scoring',
      p => delete step(p, 'which').scoring,
      'steps[6].scoring scoring',
    ],
    [
      'a short answer with no rubric',
      p => delete step(p, 'explain').rubric,
      'steps[7].rubric text',
    ],
  ];
  test.each(cases)('refuses %s', (_, mutate, expected) => {
    const p = good();
    mutate(p);
    expect(codesAt(p)).toContain(expected);
  });
});

describe('remediation is one level deep', () => {
  const remediation = p => step(p, 'again');
  test.each([
    [
      'names a later step',
      p => (remediation(p).when.sid = 'which'),
      'steps[5].when.sid earlier',
    ],
    [
      'names a step with no grade',
      p => (remediation(p).when.sid = 'look'),
      'steps[5].when.sid whenGraded',
    ],
    [
      'names another remediation step',
      p => (step(p, 'which').when = { sid: 'again', is: 'incorrect' }),
      'steps[6].when.sid whenGraded',
    ],
    [
      'is neither wrong nor right',
      p => (remediation(p).when.is = 'maybe'),
      'steps[5].when.is whenIs',
    ],
  ])('refuses a when that %s', (_, mutate, expected) => {
    const p = good();
    mutate(p);
    expect(codesAt(p)).toContain(expected);
  });

  // `guess` is a held prediction, marked at `period` (step 5). Before then
  // Next showing or passing over a step on it would be the verdict itself.
  describe('on a held prediction', () => {
    const on = (p, sid, is = 'incorrect') =>
      (step(p, sid).when = { sid: 'guess', is });

    test.each([
      ['incorrect', 'watch', 2],
      ['correct', 'time-it', 3],
    ])('refuses one answered %s before it is marked (%s)', (is, sid, i) => {
      const p = good();
      on(p, sid, is);
      expect(problems(p)).toContainEqual(
        expect.objectContaining({
          path: `steps[${i}].when.sid`,
          code: 'whenHeld',
          vars: { n: 5 },
        })
      );
    });

    test('refuses one the prediction is moved past', () => {
      const p = good();
      on(p, 'again');
      step(p, 'guess').reveal = 'which';
      expect(codesAt(p)).toEqual(['steps[5].when.sid whenHeld']);
    });

    test('accepts one after the step where it is marked', () => {
      const p = good();
      on(p, 'again');
      expect(problems(p)).toEqual([]);
      on(p, 'again', 'correct');
      expect(problems(p)).toEqual([]);
    });

    test('says once, not twice, that the step it is marked at is for everyone', () => {
      const p = good();
      on(p, 'period');
      const codes = codesAt(p);
      expect(codes).toContain('steps[1].reveal revealConditional');
      expect(codes.filter(c => c.endsWith('whenHeld'))).toEqual([]);
    });
  });

  test('refuses to mark a held prediction at a step some students skip', () => {
    const p = good();
    step(p, 'guess').reveal = 'again';
    expect(codesAt(p)).toContain('steps[1].reveal revealConditional');
  });

  test('keeps the last step for everyone', () => {
    const p = good();
    p.steps.at(-1).when = { sid: 'period', is: 'incorrect' };
    expect(codesAt(p)).toContain('steps[8].when whenLast');
  });
});

describe('prose', () => {
  test('may use the renderer’s four tags and its entities', () => {
    const p = good();
    p.steps[0].body.en =
      'R<sub>p</sub> is <em>small</em>, &asymp; not <strong>zero</strong>&nbsp;<sup>2</sup>';
    const known = api.entities.includes('asymp');
    expect(codesAt(p).filter(c => c.startsWith('steps[0].body'))).toEqual(
      known ? [] : ['steps[0].body.en entity']
    );
  });

  test.each([
    ['a script', '<script>alert(1)</script>'],
    ['an image', '<img src=x onerror=alert(1)>'],
    ['a link', 'see https://example.com'],
    ['a script URL', 'javascript:alert(1)'],
    ['a data URL', 'data:text/html,hi'],
    ['a comment', '<!-- hidden -->'],
  ])('refuses %s', (_, text) => {
    const p = good();
    p.steps[0].body.en = text;
    expect(codesAt(p)).toContain('steps[0].body.en textUnsafe');
  });

  test('refuses an entity lessons do not use', () => {
    const p = good();
    p.steps[0].body.en = 'Look &nosuchthing; here';
    expect(codesAt(p)).toContain('steps[0].body.en entity');
  });
});

describe('a hostile file', () => {
  test('cannot reach an object’s prototype', () => {
    // JSON.parse makes __proto__ an own key, which is how it arrives.
    const p = JSON.parse(
      JSON.stringify(good()).replace(
        '"title":',
        '"__proto__":{"polluted":true},"title":'
      )
    );
    const out = problems(p);
    expect(out.map(e => e.code)).toEqual(['unsafeKey']);
    expect({}.polluted).toBeUndefined();
    for (const key of ['constructor', 'prototype']) {
      const q = good();
      q.steps[0][key] = {};
      expect(problems(q).map(e => e.code)).toEqual(['unsafeKey']);
    }
  });

  test('is refused before any rule reads it when it is enormous or deep', () => {
    const wide = good();
    wide.objectives = Array.from({ length: 50000 }, () => ({ en: 'x' }));
    expect(problems(wide).map(e => e.code)).toEqual(['tooLarge']);
    let deep = { en: 'x' };
    for (let i = 0; i < 30; i++) deep = { deeper: deep };
    const q = good();
    q.steps[0].body = deep;
    expect(problems(q).map(e => e.code)).toEqual(['tooDeep']);
  });

  test('carries only plain data', () => {
    const p = good();
    // A function is not data: refused by the guard, before any rule reads it.
    p.steps[0].title = { en: 'x', toString: () => 'y' };
    expect(problems(p).map(e => e.code)).toEqual(['notData']);
    const q = good();
    q.seed = Infinity;
    expect(problems(q).map(e => e.code)).toEqual(['number']);
    expect(problems([]).map(e => e.code)).toEqual(['notObject']);
    expect(problems('pack').map(e => e.code)).toEqual(['notObject']);
  });

  test('cannot smuggle a function in a field that names one', () => {
    const p = good();
    step(p, 'time-it').validate = 'v => ({ level: "ok" })';
    step(p, 'look').probe = 'ctx => []';
    expect(codesAt(p)).toEqual(
      expect.arrayContaining([
        'steps[3].validate unknownField',
        'steps[0].probe unknownField',
      ])
    );
  });

  test('cannot end an attribute with a step id', () => {
    // The lesson panel writes `<lesson>:<sid>` into attributes. Before sids
    // were held to a public id, this one closed data-field="..." on the measure
    // step's input and gave it an autofocus and a handler that ran.
    const p = good();
    step(p, 'time-it').sid = 'x" autofocus onfocus="window.__injected=1';
    expect(codesAt(p)).toContain('steps[3].sid sid');
    for (const sid of [
      'a<b',
      'a&amp;b',
      'two words',
      'Time-it',
      'a--b',
      '-a',
    ]) {
      const q = good();
      step(q, 'time-it').sid = sid;
      expect(codesAt(q)).toContain('steps[3].sid sid');
    }
  });

  test('cannot name another format’s file as its own', () => {
    expect(codesAt({ ...good(), format: 'gravitas.scenario-pack' })).toContain(
      'format format'
    );
    expect(good().format).toBe(FORMAT);
  });
});

describe('the vetted relations', () => {
  test('compute the physics they name', () => {
    const at = (id, v) => evaluateRelation(id, v).answer;
    // Kepler's third law: a planet at 4 AU from the Sun has an 8-year orbit.
    expect(at('kepler3', { a: 4, M: 1 })).toBe(8);
    expect(at('kepler3', { a: 2, M: 2 })).toBe(2);
    // The Earth's orbital speed, 29.78 km/s, and escape from 1 AU, x sqrt(2).
    expect(at('circularSpeed', { a: 1, M: 1 })).toBe(29.8);
    expect(at('escapeSpeed', { a: 1, M: 1 })).toBe(42.1);
    expect(at('inverseSquare', { r1: 1, r2: 3 })).toBe(9);
    // A Jupiter-sized planet (11.2 Earth radii) across the Sun: about 1%.
    expect(at('transitDepth', { Rp: 11.2, Rs: 1 })).toBe(1.05);
  });

  test('refuse inputs outside the range they make sense in', () => {
    expect(evaluateRelation('kepler3', { a: 4 })).toEqual({
      ok: false,
      problems: [{ input: 'M', code: 'inputNumber', vars: { input: 'M' } }],
    });
    expect(evaluateRelation('kepler3', { a: -1, M: 1 }).problems[0].code).toBe(
      'inputRange'
    );
    expect(
      evaluateRelation('kepler3', { a: 1, M: 1, x: 2 }).problems[0].code
    ).toBe('inputUnknown');
    expect(evaluateRelation('nope', {}).problems[0].code).toBe('relation');
    expect(evaluateRelation('toString', {}).problems[0].code).toBe('relation');
  });

  test('answer in units the answer parser reads', () => {
    for (const id of RELATION_IDS) {
      const { unit, dimension } = RELATIONS[id].output;
      if (dimension) expect(api.units[dimension]).toContain(unit.toLowerCase());
      else expect(['', '%']).toContain(unit);
    }
  });
});

describe('a bank item', () => {
  const item = p => p.bank.items[0];
  test.each([
    [
      'with no version',
      p => delete item(p).version,
      'bank.items[0].version itemVersion',
    ],
    [
      'with no points',
      p => (item(p).scoring.points = 0),
      'bank.items[0].scoring.points points',
    ],
    [
      'counting an attempt that does not exist',
      p => (item(p).scoring.attempts = 'last'),
      'bank.items[0].scoring.attempts attempts',
    ],
    [
      'with no accessibility metadata',
      p => delete item(p).a11y,
      'bank.items[0].a11y a11y',
    ],
    [
      'not answerable from its text, with no note why',
      p => (item(p).a11y.textOnly = false),
      'bank.items[0].a11y.note text',
    ],
    [
      'whose question does not say an input',
      p => (item(p).prompt.en = 'How long is the year at {a} AU?'),
      'bank.items[0].prompt.en placeholder',
    ],
    [
      'whose question names an input the relation lacks',
      p => (item(p).prompt.en += ' {e}'),
      'bank.items[0].prompt.en placeholderUnknown',
    ],
    [
      'with a typed answer beside the relation',
      p => (item(p).answer = 2),
      'bank.items[0].answer notHere',
    ],
    [
      'with two variants a copied answer would pass',
      p => item(p).variants.values.push({ a: 4.05, M: 1 }),
      'bank.items[0].variants.values[3] variantsClose',
    ],
    [
      'with inputs out of the relation’s range',
      p => (item(p).variants.values[0].a = 5000),
      'bank.items[0].variants.values[0].a inputRange',
    ],
    [
      'in a unit the relation does not answer in',
      p => (item(p).unit = 'days'),
      'bank.items[0].unit relationUnit',
    ],
    [
      'accepting a unit the parser cannot read',
      p => (item(p).expect.accept = ['fortnights']),
      'bank.items[0].expect.accept[0] expectUnit',
    ],
    [
      'accepting units but not the one it is graded in',
      p => (item(p).expect.accept = ['d', 'days']),
      'bank.items[0].expect.accept acceptUnit',
    ],
    [
      'with a method hint and no idea hint',
      p => delete item(p).hints.concept,
      'bank.items[0].hints hintsOrder',
    ],
  ])('is refused %s', (_, mutate, expected) => {
    const p = good();
    mutate(p);
    expect(codesAt(p)).toContain(expected);
  });

  test('shares its rules with a bank file', () => {
    const bank = {
      format: BANK_FORMAT,
      formatVersion: 1,
      id: 'orbits-bank',
      version: '1.0.0',
      locales: ['en', 'es'],
      title: { en: 'Orbits' },
      items: clone(EXAMPLE_INVESTIGATION.bank.items),
    };
    expect(validateQuestionBankWith(bank, api, makeChecker)).toEqual([]);
    bank.items.push(clone(bank.items[0]));
    expect(
      validateQuestionBankWith(bank, api, makeChecker).map(
        e => `${e.path} ${e.code}`
      )
    ).toEqual(['items[1].id repeat']);
  });
});
