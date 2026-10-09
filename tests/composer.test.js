import { describe, test, expect } from '@jest/globals';
import {
  readFileSync,
  writeFileSync,
  mkdtempSync,
  realpathSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import {
  compileInvestigation,
  collectTexts,
  digest,
  estimate,
  outsideDuration,
  judge,
  lessonModule,
  realizeItem,
} from '../js/composer/compile.js';
import { checkInvestigationPack, packApi } from '../js/composer/api.js';
import { WIDGET_FAMILIES, WIDGET_IDS } from '../js/composer/widgetIds.js';
import { EXAMPLE_INVESTIGATION } from '../js/composer/example.js';
import { validateInvestigationPack } from '../js/platform/investigation.js';
import { SCENARIO_INFO } from '../js/data/scenarioInfo.js';
import { mergeTranslation } from '../js/data/investigations/i18n.js';
import { INVESTIGATIONS } from '../js/data/investigations.js';
import { checkAnswer } from '../js/answerCheck.js';
import { checkLesson } from '../js/authoring/rules.js';
import { DEFAULT_SETTINGS } from '../js/appState.js';
import { gradedSteps } from '../js/data/investigations/catalog.js';
import { DRAFT_KEY } from '../js/authoring/preview.js';
import { parse } from 'acorn';

// =============================================================================
// The composer's compiler: a pack becomes a lesson like any other
// -----------------------------------------------------------------------------
// tests/investigationPack.test.js holds the format. This holds what is made
// from it: the English lesson and the Spanish shadow the engine runs, judged by
// js/authoring/rules.js exactly as every lesson in the repository is; the
// variants a seed picks, reproducibly and with the right answers; the
// translation status; the estimate; the module a maintainer vendors; and the
// few places the composer keeps a copy of something so as not to load it.
// =============================================================================

const clone = v => JSON.parse(JSON.stringify(v));
const compile = p => compileInvestigation(p, { scenarios: SCENARIO_INFO });
const step = (lesson, sid) => lesson.steps.find(s => s.sid === sid);

describe('the example compiles to a lesson the lesson checker passes', () => {
  test('with no finding at all, English and Spanish', async () => {
    const r = await checkInvestigationPack(clone(EXAMPLE_INVESTIGATION));
    expect(r.errors).toEqual([]);
    expect(r.findings).toEqual([]);
    expect(r.compiled.shadow).not.toBeNull();
  });

  test('whose Spanish lines up with its English, step by step', () => {
    const { lesson, shadow } = compile(clone(EXAMPLE_INVESTIGATION));
    const merged = mergeTranslation(lesson, shadow);
    EXAMPLE_INVESTIGATION.steps.forEach((s, i) => {
      expect(merged.steps[i].sid).toBe(s.sid);
      expect(merged.steps[i].title).toBe(s.title.es);
      expect(lesson.steps[i].title).toBe(s.title.en);
    });
    const guess = EXAMPLE_INVESTIGATION.steps.find(s => s.sid === 'guess');
    expect(merged.steps[1].options).toEqual(guess.options.map(o => o.es));
    // Machinery is never in the shadow: the answer, the reveal, the condition.
    expect(shadow.steps[1].answer).toBeUndefined();
    expect(shadow.steps[1].reveal).toBeUndefined();
    expect(shadow.steps[5].when).toBeUndefined();
    expect(lesson.steps[5].when).toEqual({ sid: 'period', is: 'incorrect' });
  });

  test('with the scenario’s picture for its card', () => {
    const { lesson } = compile(clone(EXAMPLE_INVESTIGATION));
    expect(lesson.thumbnail).toBe(SCENARIO_INFO['solar-system'].thumbnail);
  });

  test('and no Spanish shadow when nothing is translated', () => {
    const p = clone(EXAMPLE_INVESTIGATION);
    const strip = v => {
      if (Array.isArray(v)) v.forEach(strip);
      else if (v && typeof v === 'object') {
        delete v.es;
        delete v.esOf;
        Object.values(v).forEach(strip);
      }
    };
    strip(p);
    expect(compile(p).shadow).toBeNull();
  });
});

describe('variants', () => {
  const item = () => clone(EXAMPLE_INVESTIGATION.bank.items[0]);

  test('the same seed builds the same lesson, and the seed is what moves it', () => {
    const p = clone(EXAMPLE_INVESTIGATION);
    expect(JSON.stringify(compile(p))).toBe(JSON.stringify(compile(clone(p))));
    const picked = new Set();
    for (let seed = 0; seed < 40; seed++) {
      p.seed = seed;
      picked.add(compile(p).variants.period.index);
    }
    expect([...picked].sort()).toEqual([0, 1, 2]);
  });

  test('every variant asks its own numbers and is graded on its own answer', () => {
    const it = item();
    const seen = new Map();
    for (let seed = 0; seed < 60 && seen.size < 3; seed++) {
      const { step: s, variant } = realizeItem(it, seed);
      seen.set(variant.index, s);
    }
    for (const [k, s] of seen) {
      const { a, M } = it.variants.values[k];
      expect(s.prompt).toContain(`${M} solar masses at ${a} AU`);
      expect(s.answer).toBeCloseTo(Math.sqrt(a ** 3 / M), 2);
      // Right inside the tolerance, wrong outside it, in the unit asked for.
      expect(checkAnswer(s, String(s.answer))).toBe(true);
      expect(checkAnswer(s, `${s.answer} yr`)).toBe(true);
      expect(checkAnswer(s, String(s.answer * 1.2))).toBe(false);
      expect(checkAnswer(s, String(s.answer * 0.8))).toBe(false);
      // And in days, which the item also accepts.
      expect(checkAnswer(s, `${s.answer * 365.25} days`)).toBe(true);
    }
    expect(seen.size).toBe(3);
  });

  test('a variant’s Spanish carries its numbers with a decimal comma', () => {
    const it = item();
    it.variants.values = [{ a: 2.5, M: 1 }];
    const { step: s, words } = realizeItem(it, 1);
    expect(s.prompt).toContain('at 2.5 AU');
    expect(words.prompt).toContain('a 2,5 UA');
  });

  test('a shuffled choice keeps its right answer on the right option', () => {
    const it = {
      id: 'which-is-farther',
      version: 1,
      kind: 'choice',
      prompt: { en: 'Which is farthest?' },
      options: [
        { en: 'Mercury' },
        { en: 'Earth' },
        { en: 'Mars' },
        { en: 'Jupiter' },
      ],
      answer: 3,
      because: { en: 'Jupiter is at 5.2 AU.' },
      scoring: { points: 1, attempts: 'first' },
      a11y: { textOnly: true },
      variants: { shuffle: true },
    };
    const orders = new Set();
    for (let seed = 0; seed < 50; seed++) {
      const { step: s, variant } = realizeItem(it, seed);
      expect(s.options[s.answer]).toBe('Jupiter');
      expect(checkAnswer(s, String(s.answer))).toBe(true);
      orders.add(variant.order.join(''));
    }
    expect(orders.size).toBeGreaterThan(5);
  });

  test('scoring is what the item or the question declares', () => {
    const { scoring, variants } = compile(clone(EXAMPLE_INVESTIGATION));
    expect(scoring).toEqual({
      period: { points: 2, attempts: 'first' },
      which: { points: 1, attempts: 'best' },
      explain: { points: 2, attempts: 'best' },
    });
    expect(variants.period).toMatchObject({
      item: 'kepler-period',
      version: 1,
      count: 3,
      relation: 'kepler3',
    });
  });
});

describe('translation status', () => {
  const statusOf = (p, where) =>
    collectTexts(p).find(t => t.path === where)?.status;

  test('is done, then stale when the English moves, then done again', () => {
    const p = clone(EXAMPLE_INVESTIGATION);
    expect(statusOf(p, 'title')).toBe('done');
    p.title.en = 'Reading an orbit, again';
    expect(statusOf(p, 'title')).toBe('stale');
    p.title.es = 'Leer una órbita, otra vez';
    p.title.esOf = digest(p.title.en);
    expect(statusOf(p, 'title')).toBe('done');
    delete p.title.es;
    delete p.title.esOf;
    expect(statusOf(p, 'title')).toBe('missing');
  });

  test('covers every text in the pack, the bank included', () => {
    const texts = collectTexts(clone(EXAMPLE_INVESTIGATION));
    expect(texts.every(t => t.status === 'done')).toBe(true);
    expect(texts.some(t => t.path.startsWith('bank.items[0].hints'))).toBe(
      true
    );
    expect(texts.some(t => t.path === 'steps[3].fields[0].label')).toBe(true);
  });
});

describe('the estimate', () => {
  test('is fitted to the built-in lessons: the median is the declared midpoint, and none is far out', () => {
    const ratios = INVESTIGATIONS.map(inv => {
      const [lo, hi = lo] = inv.duration.match(/\d+/g).map(Number);
      const e = estimate(inv);
      expect(outsideDuration(e.minutes, inv.duration)).toBe(false);
      return e.minutes / ((lo + hi) / 2);
    }).sort((a, b) => a - b);
    const median = ratios[Math.floor(ratios.length / 2)];
    expect(median).toBeGreaterThan(0.85);
    expect(median).toBeLessThan(1.2);
  });

  test('counts steps by what they are', () => {
    const e = estimate(compile(clone(EXAMPLE_INVESTIGATION)).lesson);
    expect(e.steps).toEqual({
      read: 3,
      predict: 1,
      explore: 1,
      measure: 1,
      'question:numeric': 1,
      'question:choice': 1,
      'question:short': 1,
    });
    expect(e.graded).toBe(3);
    expect(outsideDuration(1, '20-25 min')).toBe(true);
    expect(outsideDuration(80, '20-25 min')).toBe(true);
    expect(outsideDuration(22, '20-25 min')).toBe(false);
  });
});

describe('what a maintainer vendors', () => {
  test('a lesson module that imports to the same lesson, and passes as one', async () => {
    const { lesson, shadow } = compile(clone(EXAMPLE_INVESTIGATION));
    const dir = realpathSync(mkdtempSync(path.join(tmpdir(), 'composer-')));
    const file = path.join(dir, `${lesson.id}.js`);
    writeFileSync(file, lessonModule(lesson, { header: '// test' }));
    const mod = await import(pathToFileURL(file).href);
    expect(mod.default).toEqual(lesson);
    // A module with no imports, as tests/investigationRegistry.test.js asks.
    expect(readFileSync(file, 'utf8')).not.toMatch(/^\s*import\b/m);
    const esFile = path.join(dir, `${lesson.id}.es.js`);
    writeFileSync(esFile, lessonModule(shadow, { header: '// test' }));
    expect((await import(pathToFileURL(esFile).href)).default).toEqual(shadow);
  });
});

describe('the rules the engine’s remediation needs (js/authoring/rules.js)', () => {
  const refs = {
    widgets: [],
    scenarios: SCENARIO_INFO,
    settingKeys: new Set(Object.keys(DEFAULT_SETTINGS)),
    gradedSteps,
  };
  const lesson = () => clone(compile(clone(EXAMPLE_INVESTIGATION)).lesson);
  const whenFindings = inv =>
    checkLesson(inv, refs)
      .filter(f => f.rule === 'interaction/when')
      .map(f => `${f.step} ${f.message}`);

  test('pass a remediation step that follows a graded step', () => {
    expect(whenFindings(lesson())).toEqual([]);
  });

  test.each([
    [
      'names a later step',
      inv => (step(inv, 'again').when.sid = 'which'),
      /not an earlier step/,
    ],
    [
      'names a step with no grade',
      inv => (step(inv, 'again').when.sid = 'look'),
      /not a graded step/,
    ],
    [
      'names another remediation step',
      inv => (step(inv, 'which').when = { sid: 'again', is: 'incorrect' }),
      /not a graded step|itself remediation/,
    ],
    [
      'is the last step',
      inv => (inv.steps.at(-1).when = { sid: 'period', is: 'incorrect' }),
      /last step/,
    ],
    [
      'is where a prediction is marked',
      inv => (step(inv, 'guess').reveal = 'again'),
      /held prediction/,
    ],
    [
      'names a held prediction before it is marked',
      inv => (step(inv, 'watch').when = { sid: 'guess', is: 'incorrect' }),
      /^2 when names "guess", a held prediction not marked until "period"$/,
    ],
  ])('refuse one that %s', (_, mutate, expected) => {
    const inv = lesson();
    mutate(inv);
    expect(whenFindings(inv).join('\n')).toMatch(expected);
  });

  test('pass one on a held prediction once it is marked, in the whole verdict', async () => {
    const inv = lesson();
    step(inv, 'again').when = { sid: 'guess', is: 'incorrect' };
    expect(whenFindings(inv)).toEqual([]);
    const pack = clone(EXAMPLE_INVESTIGATION);
    step(pack, 'again').when = { sid: 'guess', is: 'correct' };
    const r = await checkInvestigationPack(pack);
    expect([r.errors, r.findings]).toEqual([[], []]);
  });

  test('find nothing to say about the lessons Gravitas ships', () => {
    for (const inv of INVESTIGATIONS) expect(whenFindings(inv)).toEqual([]);
  });
});

describe('what the composer keeps a copy of', () => {
  test('the instrument ids are the registry’s, family for family', async () => {
    const { LAZY_FAMILIES } = await import('../js/widgets.js');
    expect(WIDGET_FAMILIES).toEqual(
      Object.fromEntries(
        Object.entries(LAZY_FAMILIES).map(([k, f]) => [k, [...f.ids]])
      )
    );
    expect(packApi().widgets).toEqual([...WIDGET_IDS]);
  });

  test('the preview key is the one the engine reads', () => {
    expect(readFileSync('js/composerPage.js', 'utf8')).toContain(
      `const PREVIEW_KEY = '${DRAFT_KEY}';`
    );
  });

  test('the example is valid, and every part of the format is in it once', () => {
    expect(
      validateInvestigationPack(clone(EXAMPLE_INVESTIGATION), packApi())
    ).toEqual([]);
    const types = new Set(
      EXAMPLE_INVESTIGATION.steps.map(s =>
        s.type === 'question' ? `${s.type}:${s.kind ?? 'bank'}` : s.type
      )
    );
    expect([...types].sort()).toEqual(
      [
        'explore',
        'measure',
        'predict',
        'question:bank',
        'question:choice',
        'question:short',
        'read',
      ].sort()
    );
    expect(EXAMPLE_INVESTIGATION.steps.some(s => s.when)).toBe(true);
  });
});

describe('judge()', () => {
  test('reports what the lesson checker finds, on the step it finds it', () => {
    const c = compile(clone(EXAMPLE_INVESTIGATION));
    // A numeric tolerance of zero grades nothing: answer/tolerance, on step 5.
    step(c.lesson, 'period').tolerance = 0;
    const findings = judge(c, {
      checkCatalog: (inputs, opts) => {
        // The page passes the real one; this checks what reaches it.
        expect(opts.skip).toContain('instructor/present');
        expect(inputs.translations.es[c.lesson.id].data).toBe(c.shadow);
        return [];
      },
      scenarios: SCENARIO_INFO,
      widgets: [],
      settingKeys: new Set(),
      gradedSteps,
    });
    expect(findings).toEqual([]);
  });
});

// --- The words ----------------------------------------------------------------

describe('the composer’s words', () => {
  const read = async () => {
    const [
      { EN },
      { ES },
      { EN_STUDIO },
      { ES_STUDIO },
      { EN_COMPOSER },
      { ES_COMPOSER },
    ] = await Promise.all([
      import('../js/i18n/en.js'),
      import('../js/i18n/es.js'),
      import('../js/i18n/en.studio.js'),
      import('../js/i18n/es.studio.js'),
      import('../js/i18n/en.composer.js'),
      import('../js/i18n/es.composer.js'),
    ]);
    return {
      en: { ...EN, ...EN_STUDIO, ...EN_COMPOSER },
      es: { ...ES, ...ES_STUDIO, ...ES_COMPOSER },
      EN_COMPOSER,
      ES_COMPOSER,
      EN,
    };
  };
  const literalKeys = source => [
    ...new Set(
      [...source.matchAll(/\bt\(\s*'([a-zA-Z0-9_.]+)'/g)].map(m => m[1])
    ),
  ];
  const missing = (tables, keys) => ({
    en: keys.filter(k => !(k in tables.en)),
    es: keys.filter(k => !(k in tables.es)),
  });

  test('every key js/composerPage.js names is in both languages', async () => {
    const tables = await read();
    const keys = literalKeys(readFileSync('js/composerPage.js', 'utf8'));
    expect(keys.length).toBeGreaterThan(120);
    expect(missing(tables, keys)).toEqual({ en: [], es: [] });
  });

  test('the keys it builds exist in both languages', async () => {
    const tables = await read();
    const { STEP_TYPES } = await import('../js/platform/investigation.js');
    const { ITEM_KINDS, ATTEMPT_RULES } =
      await import('../js/platform/questionBank.js');
    const { RELATION_IDS } = await import('../js/platform/relations.js');
    const built = [
      ...STEP_TYPES.map(k => `composer.type.${k}`),
      ...ITEM_KINDS.map(k => `composer.kind.${k}`),
      ...ATTEMPT_RULES.map(k => `composer.attempts.${k}`),
      ...RELATION_IDS.map(k => `composer.relation.${k}`),
      ...['done', 'missing', 'stale'].map(k => `composer.state.${k}`),
      ...['added', 'removed', 'changed'].map(k => `studio.diff.${k}`),
    ];
    expect(missing(tables, built)).toEqual({ en: [], es: [] });
  });

  test('every complaint the formats make has words in both languages', async () => {
    const tables = await read();
    const codes = new Set();
    const visit = node => {
      if (!node || typeof node.type !== 'string') return;
      if (node.type === 'CallExpression' && node.callee.type === 'Identifier') {
        // need(ok, path, code, ...) and fail(path, code, ...)
        const at = { need: 2, fail: 1 }[node.callee.name];
        const a = at === undefined ? null : node.arguments[at];
        if (a?.type === 'Literal' && typeof a.value === 'string')
          codes.add(a.value);
      }
      if (
        node.type === 'Property' &&
        node.key?.name === 'code' &&
        node.value?.type === 'Literal'
      )
        codes.add(node.value.value);
      for (const v of Object.values(node)) {
        if (Array.isArray(v)) v.forEach(visit);
        else if (v && typeof v === 'object') visit(v);
      }
    };
    for (const file of [
      'js/platform/investigation.js',
      'js/platform/questionBank.js',
      'js/platform/relations.js',
      'js/platform/remix.js',
    ])
      visit(
        parse(readFileSync(file, 'utf8'), {
          ecmaVersion: 'latest',
          sourceType: 'module',
        })
      );
    expect(codes.size).toBeGreaterThan(40);
    const unsaid = locale =>
      [...codes].filter(
        c =>
          ![
            `composer.error.${c}`,
            `studio.error.${c}`,
            `composer.file.${c}`,
            `studio.file.${c}`,
          ].some(k => k in tables[locale])
      );
    expect({ en: unsaid('en'), es: unsaid('es') }).toEqual({ en: [], es: [] });
  });

  test('the two fragments have the same keys, and none repeats the base catalog', async () => {
    const { EN_COMPOSER, ES_COMPOSER, EN } = await read();
    expect(Object.keys(ES_COMPOSER).sort()).toEqual(
      Object.keys(EN_COMPOSER).sort()
    );
    expect(Object.keys(EN_COMPOSER).filter(k => k in EN)).toEqual([]);
  });
});
