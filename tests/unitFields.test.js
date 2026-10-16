import { describe, test, expect } from '@jest/globals';

import {
  validateInvestigationPack,
  makeChecker,
} from '../js/platform/investigation.js';
import {
  validateQuestionBankWith,
  BANK_FORMAT,
} from '../js/platform/questionBank.js';
import { RELATIONS } from '../js/platform/relations.js';
import { packApi, checkInvestigationPack } from '../js/composer/api.js';
import { EXAMPLE_INVESTIGATION } from '../js/composer/example.js';
import { UNITS as PARSER_UNITS } from '../js/answerParse.js';
import { paramProblem, TOOLS } from '../js/measure/pipeline.js';
import { isUnit } from '../js/units/registry.js';
import { EN_COMPOSER as en } from '../js/i18n/en.composer.js';
import { ES_COMPOSER as es } from '../js/i18n/es.composer.js';

// =============================================================================
// A unit field names a unit of the registry
// -----------------------------------------------------------------------------
// Roadmap II Prompt 59 step 3, finished by R-U: an investigation pack's
// measure field, a question-bank item and a pipeline filter condition each
// carried a unit as free text until now. Each refuses what js/units/registry.js
// does not know, with the field's path and one code (unitUnknown) a page says
// in both languages, and each keeps every unit that read before.
// =============================================================================

const api = { ...packApi(), isUnit };
const clone = v => JSON.parse(JSON.stringify(v));
const measure = p => p.steps.find(s => s.type === 'measure');

describe('an investigation pack measure field', () => {
  test('refuses a unit the registry does not know, on its path', () => {
    const p = clone(EXAMPLE_INVESTIGATION);
    measure(p).fields[0].unit = 'furlongs';
    const bad = validateInvestigationPack(p, api).filter(
      e => e.code === 'unitUnknown'
    );
    expect(bad).toHaveLength(1);
    expect(bad[0].path).toMatch(/fields\[0\]\.unit$/);
    expect(bad[0].vars).toEqual({ unit: 'furlongs' });
    expect(bad[0].message).toContain('furlongs');
  });

  test.each(['days', 'd', 'km/s', 'm/s', 'AU', 'yr', '', 'deg', '%', 'ppm'])(
    'accepts %p',
    unit => {
      const p = clone(EXAMPLE_INVESTIGATION);
      measure(p).fields[0].unit = unit;
      expect(validateInvestigationPack(p, api)).toEqual([]);
    }
  );

  test('a field with no unit is still allowed', () => {
    const p = clone(EXAMPLE_INVESTIGATION);
    delete measure(p).fields[0].unit;
    expect(validateInvestigationPack(p, api)).toEqual([]);
  });

  test('an api with no registry is not asked', () => {
    const p = clone(EXAMPLE_INVESTIGATION);
    measure(p).fields[0].unit = 'furlongs';
    expect(validateInvestigationPack(p, packApi())).toEqual([]);
  });

  test('the composer checks a whole pack the same way', async () => {
    const p = clone(EXAMPLE_INVESTIGATION);
    expect((await checkInvestigationPack(p)).errors).toEqual([]);
    measure(p).fields[0].unit = 'mag'; // a registry unit the parser lacks
    expect((await checkInvestigationPack(p)).errors).toEqual([]);
    measure(p).fields[0].unit = 'furlongs';
    const { errors } = await checkInvestigationPack(p);
    expect(errors.map(e => `${e.path} ${e.code}`)).toEqual([
      expect.stringMatching(/fields\[0\]\.unit unitUnknown$/),
    ]);
  });
});

describe('every unit that read before still reads', () => {
  test('each spelling the answer parser takes is a registry unit', () => {
    for (const [dim, table] of Object.entries(PARSER_UNITS))
      for (const name of Object.keys(table))
        expect([dim, name, isUnit(name)]).toEqual([dim, name, true]);
  });

  test('each unit a relation answers in is a registry unit', () => {
    for (const [id, r] of Object.entries(RELATIONS))
      expect([id, isUnit(r.output.unit)]).toEqual([id, true]);
  });
});

describe('a question-bank item', () => {
  const bank = () => ({
    format: BANK_FORMAT,
    formatVersion: 1,
    id: 'orbits-bank',
    version: '1.0.0',
    locales: ['en', 'es'],
    title: { en: 'Orbits' },
    items: clone(EXAMPLE_INVESTIGATION.bank.items),
  });
  const run = b => validateQuestionBankWith(b, api, makeChecker);

  test('names a unit the registry does not know, on its path', () => {
    const b = bank();
    b.items[0].unit = 'furlongs';
    const bad = run(b).filter(e => e.code === 'unitUnknown');
    expect(bad.map(e => e.path)).toEqual(['items[0].unit']);
  });

  test('keeps the units it had', () => {
    expect(run(bank())).toEqual([]);
  });
});

describe('a pipeline filter condition', () => {
  const spec = TOOLS.filter.params;
  const cond = unit => ({
    conditions: [{ column: 'x', op: '>', value: 1, unit }],
    join: 'and',
  });

  test('refuses an unknown unit with its path', () => {
    expect(paramProblem(spec, cond('furlongs'), 'params')).toBe(
      'params.conditions[0].unit: expected null or a unit of the registry'
    );
  });

  test.each([null, '', 'd', 'm/s', 'deg', 'mag'])('accepts %p', unit => {
    expect(paramProblem(spec, cond(unit), 'params')).toBeNull();
  });

  test('a number is not a unit', () => {
    expect(paramProblem(spec, cond(5), 'params')).toMatch(/unit/);
  });
});

describe('the message', () => {
  test('is in both catalogs and keeps its placeholder', () => {
    for (const cat of [en, es])
      expect(cat['composer.error.unitUnknown']).toContain('{unit}');
  });
});
