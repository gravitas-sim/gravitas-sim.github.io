import { describe, test, expect, beforeAll } from '@jest/globals';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  COVERAGE_FILE,
  FLAG,
  committed,
  coverageOf,
  serialize,
} from '../tools/label-golden.mjs';
import {
  LOCALES,
  hashText,
  num,
  precisionFindings,
  recordAll,
  recordStep,
  seeded,
  spanishOnly,
  syntheticContexts,
  valueVectors,
} from './labelGolden/record.mjs';

// =============================================================================
// The label golden (Roadmap III, Prompt 144)
// -----------------------------------------------------------------------------
// Every number and unit string the lesson data under js/data/investigations/
// prints, in English and Spanish, recorded before any of it is moved onto
// js/format.js and js/units/registry.js. A migration that changes what a
// lesson prints fails here with the lesson and the step.
//
// To accept a change on purpose: npm run label:golden -- --regenerate-label-golden
// (in its own commit, with the diff read). What is recorded and how is in
// tests/labelGolden/record.mjs and docs/LABEL_GOLDEN.md.
// =============================================================================

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readJson = rel => JSON.parse(readFileSync(path.join(ROOT, rel), 'utf8'));

let all;
let files;
beforeAll(async () => {
  all = await recordAll();
  files = committed();
}, 120000);

describe('the recording', () => {
  test('has a fixture for every lesson and none for a lesson that is gone', () => {
    expect(Object.keys(files).sort()).toEqual(Object.keys(all.lessons).sort());
    expect(Object.keys(all.lessons).length).toBeGreaterThan(50);
  });

  test('matches every lesson as it prints now', () => {
    const wrong = Object.entries(all.lessons)
      .filter(([id, rec]) => files[id] !== serialize(rec))
      .map(([id]) => id);
    expect({ wrong, how: `npm run label:golden -- ${FLAG}` }).toEqual({
      wrong: [],
      how: `npm run label:golden -- ${FLAG}`,
    });
  });

  test('records both locales for every lesson', () => {
    for (const rec of Object.values(all.lessons)) {
      expect(Object.keys(rec.static)).toEqual([...LOCALES]);
      // Spanish is either the same functions' output or its own record.
      expect(rec.steps.es === 'same' || typeof rec.steps.es === 'object').toBe(
        true
      );
    }
  });

  test('is not hollow: units, labels, probes, checks and answers are all there', () => {
    const lessons = Object.values(all.lessons);
    const count = pick => lessons.reduce((n, l) => n + pick(l), 0);
    expect(count(l => l.static.en.units.length)).toBeGreaterThan(800);
    expect(count(l => l.static.en.numbered.length)).toBeGreaterThan(500);
    // Spanish numbered labels that differ from the English are recorded too.
    expect(count(l => l.static.es.numbered.length)).toBeGreaterThan(150);
    expect(
      count(l => Object.values(l.steps.en).filter(s => s.probe).length)
    ).toBeGreaterThan(70);
    expect(
      count(l => Object.values(l.steps.en).filter(s => s.validate).length)
    ).toBeGreaterThan(150);
    expect(count(l => l.numeric.answers.length)).toBeGreaterThan(150);
  });

  test('is deterministic: the values come from a seed and the world from literals', () => {
    const step = { sid: 'a-step', fields: [{ id: 'x' }, { id: 'y' }] };
    expect(valueVectors(step, [1, 2, 3])).toEqual(
      valueVectors(step, [1, 2, 3])
    );
    const rand = seeded(hashText('a-step#0'));
    const first = [rand(), rand(), rand()];
    expect(first.every(x => x >= 0 && x < 1)).toBe(true);
    expect(first).toEqual(
      (() => {
        const again = seeded(hashText('a-step#0'));
        return [again(), again(), again()];
      })()
    );
    expect(num(1 / 3)).toBe('0.333333333333');
    expect(num(NaN)).toBe('NaN');
  });
});

describe('the call-site coverage', () => {
  test('every toFixed and toPrecision call in the family ran', () => {
    expect(coverageOf(all)).toEqual(readJson(COVERAGE_FILE));
    expect(coverageOf(all).unreached).toEqual([]);
    expect(coverageOf(all).calls).toBe(101);
  });

  test('is counted the way the ratchet counts the family', () => {
    const ratchet = readJson('tools/number-ratchet.json').formatting;
    const family = Object.entries(ratchet)
      .filter(([f]) => f.startsWith('js/data/investigations/'))
      .reduce((n, [, c]) => n + c, 0);
    expect(all.sites.length).toBe(family);
  });
});

describe('what the recording can tell apart', () => {
  const fake = {
    sid: 'fake',
    fields: [{ id: 'x' }],
    probe: ctx => [{ label: 'v', value: `${ctx.days().toFixed(2)} d` }],
    validate: v => ({ level: 'ok', message: `x is ${v.x.toFixed(2)}` }),
  };
  let contexts;
  beforeAll(async () => {
    contexts = await syntheticContexts();
  });

  test('a changed number of decimals is a changed recording', () => {
    const now = recordStep(fake, contexts);
    const more = recordStep(
      {
        ...fake,
        validate: v => ({ level: 'ok', message: `x is ${v.x.toFixed(3)}` }),
      },
      contexts
    );
    expect(more.validate.digest).not.toBe(now.validate.digest);
    expect(more.probe).toEqual(now.probe);
  });

  test('a true minus sign where the hyphen was is a changed recording', () => {
    const hyphen = recordStep(fake, contexts);
    const minus = recordStep(
      {
        ...fake,
        validate: v => ({
          level: 'ok',
          message: `x is ${v.x.toFixed(2).replace('-', '−')}`,
        }),
      },
      contexts
    );
    expect(hyphen.validate.samples.some(s => /-1\.50/.test(s.message))).toBe(
      true
    );
    expect(minus.validate.digest).not.toBe(hyphen.validate.digest);
  });

  test('a function that throws is recorded as having thrown, not skipped', () => {
    const rec = recordStep(
      {
        ...fake,
        probe: () => {
          throw new TypeError('no luck');
        },
      },
      contexts
    );
    expect(rec.probe).toEqual([{ threw: 'TypeError: no luck' }]);
  });

  test('a naive swap of toFixed for format.fixed is not identity, and a wrapper is', async () => {
    const { fixed } = await import('../js/format.js');
    const original = Number.prototype.toFixed;
    function naive(digits) {
      Number.prototype.toFixed = original;
      try {
        return fixed(Number(this), digits);
      } finally {
        Number.prototype.toFixed = naive;
      }
    }
    const swapped = await recordAll({ coverage: false, toFixed: naive });
    const control = await recordAll({
      coverage: false,
      toFixed(digits) {
        return original.call(this, digits);
      },
    });
    const differing = Object.keys(all.lessons).filter(
      id =>
        JSON.stringify(swapped.lessons[id]) !== JSON.stringify(all.lessons[id])
    );
    // fixed() writes a true minus and "" for a number it cannot write, where
    // toFixed writes a hyphen and "NaN": lessons that print a negative or a
    // missing value change, so each site needs its own decision.
    expect(differing.length).toBeGreaterThan(0);
    expect(Number.prototype.toFixed).toBe(original);
    expect(JSON.stringify(control.lessons)).toBe(JSON.stringify(all.lessons));
  }, 120000);
});

describe('precision against the stated uncertainty (listed, not fixed)', () => {
  test('the findings are the ones recorded', () => {
    const found = Object.values(all.lessons).flatMap(l =>
      l.precision.map(p => ({ lesson: l.id, ...p }))
    );
    expect(found).toEqual(
      Object.values(all.lessons).flatMap(l =>
        JSON.parse(files[l.id]).precision.map(p => ({ lesson: l.id, ...p }))
      )
    );
    // Six numeric answers are written to more places than their tolerance
    // resolves; they are proposed corrections for Carl, not changed here.
    expect(found.map(f => `${f.lesson}:${f.at}`).sort()).toEqual([
      'binary-star-planets:circumbinary-boundary',
      'color-and-temperature:peak-of-4000',
      'gravity-assist:the-ceiling',
      'hohmann-transfer:first-burn-size',
      'hohmann-transfer:second-burn-size',
      'hohmann-transfer:transfer-time',
    ]);
  });

  test('the rule: one place below the leading digit of the tolerance', () => {
    const numeric = answers => ({ answers, decimals: [] });
    const row = (answer, tolerance) => ({
      sid: 's',
      answer,
      tolerance,
      unit: 'AU',
    });
    expect(precisionFindings(numeric([row('4.07', '0.06')]), [])).toEqual([]);
    expect(precisionFindings(numeric([row('3.605', '0.12')]), [])).toHaveLength(
      1
    );
    expect(precisionFindings(numeric([row('422.7', '12')]), [])).toHaveLength(
      1
    );
    expect(precisionFindings(numeric([row('420', '12')]), [])).toEqual([]);
    expect(precisionFindings(numeric([row('1.5', null)]), [])).toEqual([]);
  });

  test('the rule: a value is not written finer than its "±"', () => {
    const none = { answers: [], decimals: [] };
    const find = text => precisionFindings(none, [text]);
    expect(find('1.234 ± 0.05')).toHaveLength(1);
    expect(find('1.23 ± 0.05')).toEqual([]);
    expect(find('66.33 ± 0.245')).toEqual([]);
    expect(find('10,000 ± 100')).toEqual([]);
    expect(find('10.90 km/s, give or take 0.4')).toHaveLength(1);
  });
});

describe('the Spanish record', () => {
  test('lists a label that gains or loses a digit, and nothing that matches', () => {
    const en = {
      units: [['a', 'x']],
      numbered: [
        ['b', 'Planet 1'],
        ['c', 'Q'],
      ],
    };
    const es = {
      units: [['a', 'x']],
      numbered: [
        ['b', 'Planeta 1'],
        ['d', 'R2'],
      ],
    };
    expect(spanishOnly(en, es)).toEqual({
      units: [],
      numbered: [
        ['b', 'Planeta 1'],
        ['d', 'R2'],
        ['c', null],
      ],
    });
  });

  test('a unit is never replaced by a shadow: the Spanish units are the English ones', () => {
    // `unit` is one of the keys js/data/investigations/i18n.js will not
    // translate, so a Spanish shadow's `unit:` strings are dead data and the
    // recording says so by listing no difference.
    for (const rec of Object.values(all.lessons))
      expect(rec.static.es.units).toEqual([]);
  });
});
