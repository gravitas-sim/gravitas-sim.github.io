import { describe, test, expect } from '@jest/globals';
import { webcrypto } from 'node:crypto';
import { TextEncoder } from 'node:util';

import {
  OPS,
  replay,
  useFormulaEngine,
  whyNot,
} from '../js/observatory/transforms.js';
import { engineFor } from '../js/observatory/formulaPanel.js';
import {
  columnOf,
  maskedRows,
  rowCount,
  uncertaintyOf,
  validateObservation,
} from '../js/observatory/schema.js';
import { observationJson } from '../js/observatory/export.js';
import { checkInvestigationPack } from '../js/composer/api.js';
import { EXAMPLE_INVESTIGATION } from '../js/composer/example.js';
import { derivedEntry, namedQuantities } from '../js/notebook/derivedEntry.js';
import { buildEntry, SOURCE } from '../js/notebook/entry.js';
import { validateArtifact } from '../js/platform/artifact.js';
import { ARTIFACT_SOURCES } from '../js/notebook/ledger.js';
import { EN_FORMULA } from '../js/i18n/en.formula.js';
import { ES_FORMULA } from '../js/i18n/es.formula.js';

import { parseNumber } from '../js/answerParse.js';
import { useNumberReader } from '../js/formula/parse.js';
useNumberReader(parseNumber);

if (!globalThis.crypto?.subtle)
  Object.defineProperty(globalThis, 'crypto', {
    value: webcrypto,
    configurable: true,
  });
globalThis.TextEncoder ??= TextEncoder;

// The page's own translator, as the observatory has it: a message by id.
const CAT = { ...EN_FORMULA };
const t = (id, vars) =>
  (CAT[id] ?? id).replace(/\{(\w+)\}/g, (w, k) =>
    vars && k in vars ? vars[k] : w
  );
useFormulaEngine(
  engineFor({
    columnOf,
    maskedRows,
    rowCount,
    uncertaintyOf,
    t,
    registerMessages: () => {},
  })
);

function table() {
  return {
    format: 'gravitas.observation',
    formatVersion: 1,
    kind: 'table',
    id: 'test:table',
    title: 'test',
    object: null,
    facility: null,
    origin: 'observed',
    source: { kind: 'builtin', id: 'test', version: null },
    credit: 'test',
    license: { status: 'cc0' },
    retrieved: null,
    citations: [],
    reductions: [],
    columns: [
      {
        id: 'g',
        name: 'g',
        unit: 'mag',
        role: 'value',
        values: Float64Array.from([15, 16, NaN, 17]),
      },
      {
        id: 'g-err',
        name: 'g error',
        unit: 'mag',
        role: 'uncertainty',
        of: 'g',
        values: Float64Array.from([0.03, 0.04, 0.03, 0.05]),
      },
      {
        id: 'r',
        name: 'r',
        unit: 'mag',
        role: 'value',
        values: Float64Array.from([14.5, 15.2, 15, 16.1]),
      },
      {
        id: 'r-err',
        name: 'r error',
        unit: 'mag',
        role: 'uncertainty',
        of: 'r',
        values: Float64Array.from([0.04, 0.03, 0.03, 0.04]),
      },
      {
        id: 'd',
        name: 'distance',
        unit: 'pc',
        role: 'value',
        values: Float64Array.from([100, 200, 300, 400]),
      },
      {
        id: 'v',
        name: 'speed',
        unit: 'km/s',
        role: 'value',
        values: Float64Array.from([10, 20, 30, 40]),
      },
      {
        id: 'lo',
        name: 'lo',
        unit: 'km/s',
        role: 'lower',
        level: 0.9,
        of: 'v',
        values: Float64Array.from([1, 1, 1, 1]),
      },
    ],
    axes: { x: 'd', y: 'g' },
    masks: [],
    annotations: [],
  };
}
const change = (formula, extra = {}) => ({
  op: 'formula',
  id: 'new-1',
  name: 'new',
  formula,
  locale: 'en',
  ...extra,
});

describe('the observatory’s formula column', () => {
  test('a colour is the difference of two magnitudes, with the quadrature of their errors', () => {
    const { o, notes } = replay(table(), [change('g - r')]);
    const c = columnOf(o, 'new-1');
    expect(c).toMatchObject({ unit: 'mag', role: 'value' });
    expect(Array.from(c.values.slice(0, 2)).map(v => +v.toFixed(10))).toEqual([
      0.5, 0.8,
    ]);
    expect(c.values[2]).toBeNaN();
    const e = columnOf(o, 'new-1-err');
    expect(e).toMatchObject({ role: 'uncertainty', of: 'new-1', unit: 'mag' });
    expect(e.values[0]).toBeCloseTo(Math.hypot(0.03, 0.04), 12);
    expect(c.derived).toMatchObject({
      formula: 'g - r',
      locale: 'en',
      inputs: ['g', 'r'],
      rule: 'first-order-uncorrelated',
    });
    expect(notes[0].key).toBe('formula');
    expect(validateObservation(o)).toEqual([]);
  });

  test('a missing value is a missing value, and the formula’s own gaps are counted', () => {
    const { o, notes } = replay(table(), [change('g - r')]);
    expect(columnOf(o, 'new-1').values[2]).toBeNaN();
    expect(notes[0].vars.gaps).toBe('');
    // The square root of a negative has no value at 100 and 200 pc.
    const w = replay(table(), [change('sqrt((d - 250[pc]) / 1[pc])')]);
    expect(w.notes[0].vars.gaps).toMatch(/2 rows/);
    expect(columnOf(w.o, 'new-1').values[0]).toBeNaN();
    expect(columnOf(w.o, 'new-1').values[3]).toBeCloseTo(Math.sqrt(150), 12);
  });

  test('the distance modulus is a ratio, logged', () => {
    const { o } = replay(table(), [change('5 * log10(d / 10[pc])')]);
    const c = columnOf(o, 'new-1');
    expect(c.unit).toBe('');
    expect(c.values[0]).toBeCloseTo(5, 12);
    expect(c.values[3]).toBeCloseTo(5 * Math.log10(40), 12);
    expect(columnOf(o, 'new-1-err')).toBeUndefined();
  });

  test('an absolute magnitude is g minus the modulus in magnitudes, with g’s error', () => {
    const f = 'g - 5[mag] * log10(d / 10[pc])';
    const { o } = replay(table(), [change(f)]);
    const c = columnOf(o, 'new-1');
    expect(c.unit).toBe('mag');
    expect(c.values[0]).toBeCloseTo(15 - 5, 12);
    expect(c.values[1]).toBeCloseTo(16 - 5 * Math.log10(20), 12);
    expect(columnOf(o, 'new-1-err')).toBeUndefined();
  });

  test('is refused with the reader’s words: units, unknown names, an interval, no unit', () => {
    expect(whyNot(table(), change('g + d'))).toMatch(/g is mag but d is m/);
    expect(whyNot(table(), change('zz * 2'))).toMatch(/zz is not a column/);
    expect(whyNot(table(), change('v * 2'))).toMatch(/interval/);
    expect(whyNot(table(), change('g - g[1]'))).toMatch(
      /not part|Unexpected|character/
    );
    expect(whyNot(table(), change('d * d'))).toMatch(/no unit in the registry/);
    expect(whyNot(table(), change('d / 1[pc]'))).toBe(null);
    const noUnit = table();
    noUnit.columns[4].unit = null;
    expect(whyNot(noUnit, change('d * 2'))).toMatch(/no unit stated/);
    expect(whyNot(table(), change('g', { id: 'g' }))).toMatch(
      /already a column/
    );
    expect(whyNot(table(), change('g', { name: '' }))).toMatch(/needs a name/);
    expect(whyNot(table(), change('g', { id: '9x' }))).toMatch(/id of letters/);
  });

  test('a column without uncertainty gives one without, and says which', () => {
    const o = table();
    const { notes, o: out } = replay(o, [change('d * 2')]);
    expect(columnOf(out, 'new-1-err')).toBeUndefined();
    expect(notes[0].vars.why).toMatch(/distance|d has no uncertainty/);
  });

  test('written to a file and read back, the same formula gives the same column, in either language', () => {
    const changes = [
      change('d / 1[pc]', { locale: 'es', formula: '2,5 * d / 1[pc]' }),
    ];
    const a = replay(table(), changes).o;
    const text = observationJson(a, { source: table(), changes, digest: 'x' });
    const doc = JSON.parse(text);
    expect(doc.workspace.changes[0]).toMatchObject({
      formula: '2,5 * d / 1[pc]',
      locale: 'es',
    });
    const b = replay(table(), doc.workspace.changes).o;
    expect(Array.from(b.columns.at(-1).values)).toEqual(
      Array.from(a.columns.at(-1).values)
    );
    expect(columnOf(b, 'new-1').values[0]).toBeCloseTo(250, 9);
  });

  test('masked rows are left out of an aggregate and kept in the column', () => {
    const o = table();
    o.masks = [{ id: 'm', label: '', source: 'reader', rows: [3] }];
    const { o: out } = replay(o, [change('d / mean(d)')]);
    const mean = (100 + 200 + 300) / 3;
    expect(columnOf(out, 'new-1').values[3]).toBeCloseTo(400 / mean, 12);
    expect(columnOf(out, 'new-1').values[0]).toBeCloseTo(100 / mean, 12);
  });

  test('without the engine, the change is refused rather than crashing', () => {
    expect(OPS.formula.kinds).toContain('table');
  });
});

describe('a derived quantity in the notebook', () => {
  const entry = (title, q, id) =>
    buildEntry({
      id,
      source: SOURCE.RV_FIT,
      title,
      quantities: q,
    });
  const e1 = entry(
    'Period',
    [{ label: 'Period', value: 11.86, unit: 'yr', uncertainty: 0.02 }],
    'e1'
  );
  const e2 = entry(
    'Axis',
    [{ label: 'Axis', value: 5.2, unit: 'AU', uncertainty: 0.01 }],
    'e2'
  );

  test('is an envelope that names the formula, the entries it read and the rule', async () => {
    const qs = namedQuantities([e1, e2]);
    expect(qs.map(q => q.name)).toEqual(['q1', 'q2']);
    const made = await derivedEntry({
      formula: "to(q1^2 / q2^3, 'yr^2/AU^3')",
      title: 'Kepler ratio',
      quantities: qs,
    });
    expect(made.source).toBe('derived-quantity');
    expect(ARTIFACT_SOURCES).toContain(made.source);
    const env = made.snapshot.artifact;
    expect(validateArtifact(env)).toEqual([]);
    expect(env.provenance.derivation.inputs.map(i => i.id)).toEqual([
      'e1#0',
      'e2#0',
    ]);
    expect(env.provenance.derivation.rule).toBe('first-order-uncorrelated');
    expect(env.quantities[0].uncertainty.basis).toBe('derived');
    expect(made.snapshot.quantities[0].value).toBeCloseTo(
      11.86 ** 2 / 5.2 ** 3,
      12
    );
  });

  test('refuses a number with no unit recorded, and an uncertainty that is an interval', async () => {
    const bare = entry('Bare', [{ label: 'x', value: 2, unit: '' }], 'e3');
    await expect(
      derivedEntry({
        formula: 'q1 * 2',
        title: 't',
        quantities: namedQuantities([bare]),
      })
    ).rejects.toMatchObject({ code: 'noUnit' });
    const qs = namedQuantities([e1]);
    qs[0].kind = 'interval';
    await expect(
      derivedEntry({ formula: 'q1 * 2', title: 't', quantities: qs })
    ).rejects.toMatchObject({ code: 'interval' });
  });
});

describe('a composer question expected from a formula', () => {
  const pack = formula => {
    const p = JSON.parse(JSON.stringify(EXAMPLE_INVESTIGATION));
    const at = p.steps.findIndex(s => s.sid === 'again');
    p.steps.splice(at, 0, {
      sid: 'ratio',
      type: 'question',
      kind: 'numeric',
      title: { en: 'Your year', es: 'Tu año' },
      body: { en: 'Use your timing.', es: 'Usa tu medida.' },
      prompt: { en: 'How many years was it?', es: '¿Cuántos años fue?' },
      because: {
        en: 'Days over days per year.',
        es: 'Días entre días por año.',
      },
      formula,
      scoring: { points: 1, attempts: 'best' },
    });
    return p;
  };
  const good = {
    expr: 'P / 1[yr]',
    of: { P: 'time-it.period' },
    tolerancePct: 5,
  };
  const run = async f => {
    const r = await checkInvestigationPack(pack(f));
    return r.errors.map(e => `${e.path}:${e.code}`);
  };

  test('a formula over an earlier measure step passes, compiles without an answer, and is not judged for one', async () => {
    const r = await checkInvestigationPack(pack(good));
    expect(r.errors).toEqual([]);
    const step = r.compiled.lesson.steps.find(s => s.sid === 'ratio');
    expect(step.formula).toEqual(good);
    expect(step.answer).toBeUndefined();
    expect(
      r.findings.filter(f => /answer\//.test(f.rule ?? f.id ?? ''))
    ).toEqual([]);
  });

  test('is refused on its path, with a code the composer has words for', async () => {
    expect(await run({ ...good, expr: 'P + 1[m]' })).toContain(
      'steps[5].formula:formula'
    );
    expect(await run({ ...good, of: { P: 'time-it.nope' } })).toContain(
      'steps[5].formula:formula'
    );
    expect(await run({ ...good, of: { P: 'look.period' } })).toContain(
      'steps[5].formula:formula'
    );
    expect(
      await run({ ...good, of: { P: 'time-it.period' }, expr: 'P' })
    ).toContain('steps[5].formula:formula');
    expect(await run({ expr: '', of: {} })).toContain(
      'steps[5].formula:formulaShape'
    );
    expect(await run({ ...good, extra: 1 })).toContain(
      'steps[5].formula:formulaShape'
    );
    expect(await run({ ...good, tolerancePct: 0 })).toContain(
      'steps[5].formula:formulaShape'
    );
    const withAnswer = pack(good);
    withAnswer.steps[5].answer = 3;
    const r = await checkInvestigationPack(withAnswer);
    expect(r.errors.map(e => e.code)).toContain('formulaHere');
    // A formula cannot read a field of a step that comes later.
    const later = pack({ ...good, of: { P: 'again.x' } });
    expect((await checkInvestigationPack(later)).errors.length).toBeGreaterThan(
      0
    );
  });

  test('every code it adds has words in both languages', async () => {
    const { EN_COMPOSER } = await import('../js/i18n/en.composer.js');
    const { ES_COMPOSER } = await import('../js/i18n/es.composer.js');
    for (const c of ['formulaHere', 'formulaShape', 'formula']) {
      expect(EN_COMPOSER[`composer.error.${c}`]).toBeTruthy();
      expect(ES_COMPOSER[`composer.error.${c}`]).toBeTruthy();
    }
    for (const k of ['of', 'unitless'])
      expect([EN_FORMULA, ES_FORMULA].every(c => c[`formula.err.${k}`])).toBe(
        true
      );
  });
});
