import { describe, test, expect } from '@jest/globals';
import { readFileSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { webcrypto } from 'node:crypto';
import { TextEncoder } from 'node:util';

import { compile, evaluate, FUNCTIONS, RULE } from '../js/formula/engine.js';
import { CODES, FormulaError, LIMITS, parse } from '../js/formula/parse.js';
import {
  CONSTANTS,
  DIMS,
  multOf,
  parseUnitText,
  showDim,
  unitFor,
} from '../js/formula/units.js';
import { UNITS } from '../js/units/registry.js';
import { derivationEnvelope } from '../js/formula/evidence.js';
import {
  bindFormulas,
  expectedValue,
  formulaProblem,
} from '../js/formula/grade.js';
import { validateArtifact } from '../js/platform/artifact.js';
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

const num = (v, unit, sigma) => ({ value: v, unit, sigma });
const code = (src, inputs = {}, opts) => {
  try {
    evaluate(src, inputs, opts);
  } catch (e) {
    if (e instanceof FormulaError) return e.code;
    throw e;
  }
  return null;
};
const V = (src, inputs = {}, opts) => evaluate(src, inputs, opts).value;

describe('the grammar', () => {
  test('arithmetic, precedence and associativity', () => {
    expect(V('1 + 2 * 3')).toBe(7);
    expect(V('(1 + 2) * 3')).toBe(9);
    expect(V('2^3^2')).toBe(512);
    expect(V('-2^2')).toBe(-4);
    expect(V('2^-1')).toBe(0.5);
    expect(V('10 / 4 / 5')).toBe(0.5);
    expect(V('1 - 2 - 3')).toBe(-4);
    expect(V('--3')).toBe(3);
    expect(V('+3')).toBe(3);
    expect(V('1e3 * 2E-1')).toBe(200);
    expect(V('.5 + 0.5')).toBe(1);
  });

  test('typographic operators and superscript squares read as their ASCII forms', () => {
    expect(V('6 ÷ 3 × 2 · 1 − 1')).toBe(3);
    const x = { x: num(3, '') };
    expect(V('x²', x)).toBe(9);
    expect(V('x³', x)).toBe(27);
  });

  test('numbers use the shared reader: a decimal comma in Spanish, a point in English', () => {
    expect(V('1,5 * 2', {}, { locale: 'es' })).toBe(3);
    expect(V('2,50e1', {}, { locale: 'es' })).toBe(25);
    expect(V('1.5 * 2', {}, { locale: 'en' })).toBe(3);
    // "1,234" is 1.234 in Spanish; in English the comma separates arguments.
    expect(V('1,234', {}, { locale: 'es' })).toBe(1.234);
    expect(code('2.5 * 2', {}, { locale: 'es' })).toBe('char');
    expect(code('1,5', {}, { locale: 'en' })).toBe('unexpected');
    // The same value written in each convention is the same value.
    const i = { a: num(4, 'm') };
    expect(V('2,5 * a', i, { locale: 'es' })).toBe(V('2.5 * a', i));
  });

  test('a unit follows its number in brackets; a braced name reads an id with hyphens', () => {
    expect(V('to(5[km/s], "m/s")')).toBe(5000);
    expect(V('{flux-err} * 2', { 'flux-err': num(3, 'Jy') })).toBe(6);
    expect(V('to(5 [ km ], "m")')).toBe(5000);
  });

  test('arguments separate with ; in both languages and , in English', () => {
    expect(code('to(5[km]; "m")', {}, { locale: 'es' })).toBe(null);
    expect(code('to(5[km], "m")')).toBe(null);
    expect(code('to(5[km], "m")', {}, { locale: 'es' })).not.toBe(null);
  });

  test('the syntax errors say what and where', () => {
    for (const [src, c] of [
      ['', 'empty'],
      ['   ', 'empty'],
      ['1 +', 'end'],
      ['(1 + 2', 'expected'],
      ['1 2', 'adjacent'],
      ['2 x', 'adjacent'],
      ['* 2', 'unexpected'],
      ['1 + )', 'unexpected'],
      ['3 $ 4', 'char'],
      ['1e999', 'number'],
      ['x = 3', 'char'],
      ['a.b', 'char'],
      ['5[]', 'char'],
    ])
      expect({
        src,
        code: code(src, { x: num(1, ''), a: num(1, 'm') }),
      }).toEqual({ src, code: c });
    try {
      parse('1 + * 2');
    } catch (e) {
      expect(e.at).toEqual([4, 5]);
    }
  });

  test('every code an error carries is listed, and has words in both languages', () => {
    const thrown = new Set();
    const src = readdirSync(new URL('../js/formula/', import.meta.url))
      .filter(f => f.endsWith('.js'))
      .map(f =>
        readFileSync(new URL(`../js/formula/${f}`, import.meta.url), 'utf8')
      )
      .join('\n');
    for (const m of src.matchAll(/fail\(\s*'([A-Za-z]+)'/g)) thrown.add(m[1]);
    for (const c of thrown) expect(CODES).toContain(c);
    for (const c of CODES) {
      expect(EN_FORMULA[`formula.err.${c}`]).toBeTruthy();
      expect(ES_FORMULA[`formula.err.${c}`]).toBeTruthy();
    }
    expect(Object.keys(ES_FORMULA).sort()).toEqual(
      Object.keys(EN_FORMULA).sort()
    );
  });
});

describe('hostile input', () => {
  test('is bounded, in text, tokens, depth, nodes and literals', () => {
    expect(code('1+'.repeat(LIMITS.chars) + '1')).toBe('length');
    expect(code('1+'.repeat(LIMITS.tokens / 2 + 1) + '1')).toBe('tokens');
    expect(
      code('('.repeat(LIMITS.depth + 2) + '1' + ')'.repeat(LIMITS.depth + 2))
    ).toBe('depth');
    expect(code('-'.repeat(60) + '1')).toBe('depth');
    expect(code('1+'.repeat(80) + '1')).toBe('nodes');
    expect(code('9'.repeat(60))).toBe('number');
    expect(code('1e400')).toBe('number');
    expect(code(`1${'0'.repeat(30)}`)).toBe(null);
  });

  test('refuses names it does not know, and never reaches the prototype chain', () => {
    for (const name of [
      'constructor',
      '__proto__',
      'toString',
      'hasOwnProperty',
      'process',
      'globalThis',
      'window',
      'require',
    ])
      expect(code(name, { x: num(1, '') })).toBe('unknownId');
    expect(code('constructor(1)')).toBe('unknownFn');
    expect(code('__proto__(1)')).toBe('unknownFn');
    expect(code('{__proto__}', { x: num(1, '') })).toBe('unknownId');
    expect(
      code('x', JSON.parse('{"__proto__": {"value": 1, "unit": ""}}'))
    ).toBe('unknownId');
  });

  test('is only ever read: injection attempts are syntax errors or unknown names', () => {
    globalThis.__formulaInjected = false;
    for (const src of [
      'eval("globalThis.__formulaInjected = true")',
      'Function("return 1")()',
      '(function(){})()',
      'x; globalThis.__formulaInjected = true',
      '`${globalThis.__formulaInjected = true}`',
      'x => x',
      'import("x")',
      'x["constructor"]',
      'x.constructor.constructor("return 1")()',
      '1 /* */ + 1',
      '1 // 2',
      'a ? b : c',
      'a && b',
      'while(1){}',
      'x++',
      'delete x',
      'new Date()',
      'alert(1)',
    ])
      expect([
        'unknownFn',
        'char',
        'unknownId',
        'unexpected',
        'adjacent',
        'string',
        'expected',
        'end',
      ]).toContain(code(src, { x: num(1, '') }));
    expect(globalThis.__formulaInjected).toBe(false);
    delete globalThis.__formulaInjected;
  });

  test('the module contains neither eval nor the Function constructor', () => {
    for (const f of [
      'parse.js',
      'engine.js',
      'units.js',
      'grade.js',
      'evidence.js',
    ]) {
      const text = readFileSync(
        new URL(`../js/formula/${f}`, import.meta.url),
        'utf8'
      )
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/^\s*\/\/.*$/gm, '');
      expect({ f, eval: /\beval\s*\(/.test(text) }).toEqual({ f, eval: false });
      expect({ f, fn: /\bFunction\b/.test(text) }).toEqual({ f, fn: false });
      expect({ f, dyn: /\bimport\s*\(/.test(text) }).toEqual({ f, dyn: false });
      expect({ f, w: /\bwith\s*\(/.test(text) }).toEqual({ f, w: false });
    }
  });

  test('a huge table is refused before it is read', () => {
    const { run } = compile('x * 2', { inputs: { x: { unit: '' } } });
    const values = new Float64Array(LIMITS.rows + 1);
    expect(() => run({ x: { values } })).toThrow(FormulaError);
  });
});

describe('functions and constants', () => {
  test('the fixed function set, and nothing else', () => {
    expect([...FUNCTIONS].sort()).toEqual(
      [
        'abs',
        'acos',
        'acosd',
        'asin',
        'asind',
        'atan',
        'atand',
        'cos',
        'cosd',
        'exp',
        'ln',
        'log10',
        'max',
        'mean',
        'min',
        'sin',
        'sind',
        'sqrt',
        'tan',
        'tand',
        'to',
      ].sort()
    );
  });

  test('values against Math', () => {
    expect(V('sqrt(2)')).toBeCloseTo(Math.SQRT2, 14);
    expect(V('log10(1000)')).toBeCloseTo(3, 14);
    expect(V('ln(exp(2))')).toBeCloseTo(2, 14);
    expect(V('abs(-3)')).toBe(3);
    expect(V('sin(0)')).toBe(0);
    expect(V('cos(0)')).toBe(1);
    expect(V('tan(0)')).toBe(0);
  });

  test('radians and degrees are told apart by the function, and an angle by its unit', () => {
    expect(V('sin(30[deg])')).toBeCloseTo(0.5, 14);
    expect(V('sind(30)')).toBeCloseTo(0.5, 14);
    expect(V('sind(30[deg])')).toBeCloseTo(0.5, 14);
    expect(V('sin(30)')).toBeCloseTo(Math.sin(30), 14);
    expect(V('cosd(60)')).toBeCloseTo(0.5, 14);
    expect(V('tand(45)')).toBeCloseTo(1, 14);
    expect(V('to(asin(1), "deg")')).toBeCloseTo(90, 12);
    const r = evaluate('asind(0.5)', {});
    expect(r.value).toBeCloseTo(30, 12);
    expect(r.info.unit).toBe('deg');
    expect(evaluate('acos(0)', {}).info.unit).toBe('rad');
    expect(V('atand(1)')).toBeCloseTo(45, 12);
    expect(code('1 + 30[deg]')).toBe('angleMix');
    expect(code('asin(30[deg])')).toBe('notAngle');
    expect(code('sin(1[m])')).toBe('dimensionless');
  });

  test('values outside a function’s domain have no value, and are counted', () => {
    const { run } = compile('sqrt(x)', { inputs: { x: { unit: '' } } });
    const out = run({ x: { values: Float64Array.from([4, -1, NaN, 9]) } });
    expect(
      Array.from(out.values).map(v => (Number.isNaN(v) ? 'nan' : v))
    ).toEqual([2, 'nan', 'nan', 3]);
    // The NaN row is a missing input; the -1 row is the formula's own gap.
    expect(out.domain).toBe(1);
    expect(V('1 / 0')).toBeNaN();
    expect(V('log10(0)')).toBeNaN();
    expect(V('exp(log10(0))')).toBeNaN();
  });

  test('min, max and mean take a column and give one number, skipping missing and masked rows', () => {
    const scope = { inputs: { x: { unit: 'm' } } };
    const values = Float64Array.from([1, 2, NaN, 9]);
    const data = { x: { values } };
    expect(Array.from(compile('mean(x)', scope).run(data).values)).toEqual([
      4, 4, 4, 4,
    ]);
    expect(compile('max(x)', scope).run(data).values[0]).toBe(9);
    expect(compile('min(x)', scope).run(data).values[0]).toBe(1);
    expect(
      compile('mean(x)', scope).run(data, { skip: new Set([3]) }).values[0]
    ).toBe(1.5);
    const rel = compile('x / mean(x)', scope);
    expect(rel.info.dimensionless).toBe(true);
    expect(rel.run(data).values[0]).toBe(0.25);
  });

  test('the pinned constants are CODATA 2018 and the registry’s own nominal values', () => {
    expect(CONSTANTS.G.value).toBe(6.6743e-11);
    expect(CONSTANTS.c.value).toBe(299792458);
    expect(CONSTANTS.k_B.value).toBe(1.380649e-23);
    expect(CONSTANTS.h.value).toBe(6.62607015e-34);
    expect(CONSTANTS.sigma_SB.value).toBe(5.670374419e-8);
    expect(CONSTANTS.M_sun.value).toBe(UNITS.Msun.factor);
    expect(CONSTANTS.R_sun.value).toBe(6.957e8);
    expect(CONSTANTS.AU.value).toBe(1.495978707e11);
    expect(CONSTANTS.pc.value).toBe(3.085677581491367e16);
    expect(CONSTANTS.day.value).toBe(86400);
    expect(CONSTANTS.year.value).toBe(31557600);
    // sigma = 2 pi^5 k^4 / (15 h^3 c^2), to the digits CODATA gives.
    const {
      k_B: k,
      h,
      c,
    } = Object.fromEntries(
      Object.entries(CONSTANTS).map(([n, v]) => [n, v.value])
    );
    expect((2 * Math.PI ** 5 * k ** 4) / (15 * h ** 3 * c ** 2)).toBeCloseTo(
      5.670374419e-8,
      16
    );
    // GM_sun from the constants is the IAU nominal value to 1e-9.
    expect(V('G * M_sun') / 1.3271244e20).toBeCloseTo(1, 9);
  });

  test('a constant is its own unit where it has one, and a column cannot shadow it', () => {
    expect(evaluate('M_sun', {}).info.unit).toBe('Msun');
    expect(evaluate('M_sun', {}).value).toBe(1);
    expect(evaluate('2 * AU', {}).value).toBe(2);
    expect(V('to(c, "km/s")')).toBeCloseTo(299792.458, 9);
    // A name that is a constant is the constant; the braces read the column.
    expect(V('G', { G: num(5, '') })).toBe(6.6743e-11);
    expect(V('{G}', { G: num(5, '') })).toBe(5);
  });
});

describe('dimensions and units', () => {
  const I = {
    a: num(1, 'AU', 0.01),
    P: num(1, 'yr', 0.002),
    d: num(100, 'pc', 5),
    t: num(3, 'd', 0.1),
    v: num(30, 'km/s', 1),
    m: num(2, 'Msun'),
  };

  test('every registry dimension has its exponents, and they agree with the registry’s conversions', () => {
    for (const u of Object.values(UNITS)) expect(DIMS[u.dim]).toBeDefined();
    // The same dimension in the registry has the same exponents: any two
    // units with one dimension convert by their factor ratio, as coherent SI does.
    expect(multOf('km') / multOf('m')).toBe(1000);
    expect(multOf('km/s') / multOf('m/s')).toBe(1000);
    // A jansky is 1e-26 W m^-2 Hz^-1; a W m^-2 nm^-1 is 1e9 W m^-3.
    expect(showDim(DIMS['flux-per-frequency'][0])).toBe('kg s^-2');
    expect(multOf('Jy')).toBe(1e-26);
    expect(multOf('W/m2/nm')).toBe(1e9);
    expect(multOf('erg/s/cm2/Angstrom')).toBe(1e7);
    // Conversions the registry itself defines come out the same here.
    for (const [x, y] of [
      ['AU', 'km'],
      ['yr', 'd'],
      ['AU/yr', 'km/s'],
      ['Msun', 'kg'],
    ]) {
      const here = V(`to(1[${x}], "${y}")`);
      const there = UNITS[x].factor / UNITS[y].factor;
      expect(here / there).toBeCloseTo(1, 12);
    }
  });

  test('a sum of different kinds is refused, naming the sub-expression and both dimensions', () => {
    try {
      evaluate('a + t', I);
      throw new Error('no refusal');
    } catch (e) {
      expect(e.code).toBe('dimension');
      expect(e.vars).toMatchObject({
        expr: 'a + t',
        left: 'a',
        right: 't',
        a: 'm',
        b: 's',
      });
      expect(e.at).toEqual([0, 5]);
    }
    try {
      evaluate('2 * (a - v)', I);
    } catch (e) {
      expect(e.vars.expr).toBe('(a - v)');
      expect(e.vars.b).toBe('m s^-1');
    }
    expect(code('a + 1', I)).toBe('dimension');
    expect(code('v * t + a', I)).toBe(null);
  });

  test('products, quotients and powers keep their dimensions', () => {
    const km = evaluate('to(v * t, "AU")', I);
    expect(km.value).toBeCloseTo((30e3 * 3 * 86400) / UNITS.AU.factor, 12);
    expect(code('to(v * t, "s")', I)).toBe('conversion');
    expect(evaluate('a^2', I).info.unitText).toBe('m^2');
    expect(evaluate('sqrt(a^2)', I).info.unit).toBe('m');
    expect(evaluate('sqrt(a)', I).info.dimension).toBe('m^0.5');
    expect(code('sqrt(sqrt(a))', I)).toBe('fractional');
    expect(code('a^0.3', I)).toBe('fractional');
    expect(code('a^v', I)).toBe('power');
    expect(code('a^a', I)).toBe('power');
    expect(evaluate('a / a', I).info.dimensionless).toBe(true);
  });

  test('a logarithm or exponential takes a ratio; a ratio of unlike units is one', () => {
    expect(code('log10(d)', I)).toBe('dimensionless');
    expect(code('exp(t)', I)).toBe('dimensionless');
    // The distance modulus.
    expect(V('5 * log10(d / 10[pc])', I)).toBeCloseTo(5, 14);
    expect(V('log10(d / 10[pc])', I)).toBeCloseTo(1, 14);
    // 1 km over 1 m is 1000, whatever the units were typed in.
    expect(V('1[km] / 1[m]')).toBeCloseTo(1000, 12);
  });

  test('the result carries a registry unit, is flagged dimensionless, or says it has none', () => {
    expect(evaluate('sqrt(G * M_sun / a)', I).info).toMatchObject({
      unit: 'm/s',
    });
    expect(evaluate('to(sqrt(G * M_sun / a), "km/s")', I).value).toBeCloseTo(
      29.7847,
      3
    );
    expect(evaluate('a / 1[AU]', I).info).toMatchObject({
      unit: '',
      dimensionless: true,
    });
    expect(evaluate('2 * a', I).info.unit).toBe('AU');
    expect(evaluate('a + 1[km]', I).info.unit).toBe('AU');
    expect(evaluate('abs(a)', I).info.unit).toBe('AU');
    const none = evaluate('P^2 / a^3', I);
    expect(none.info.unit).toBe(null);
    expect(none.info.unitText).toBe('m^-3 s^2');
    const kepler = evaluate("to(P^2 / a^3, 'yr^2/AU^3')", I);
    expect(kepler.value).toBeCloseTo(1, 12);
    expect(kepler.info.unit).toBe(null);
    expect(kepler.info.unitText).toBe('yr^2/AU^3');
    expect(V('(P / 1[yr])^2 / (a / 1[AU])^3', I)).toBeCloseTo(1, 12);
    expect(unitFor(DIMS.velocity[0])).toBe('m/s');
    expect(unitFor(DIMS.ratio[0])).toBe('');
    expect(parseUnitText('km/s').id).toBe('km/s');
    expect(parseUnitText('yr^2/AU^3').id).toBe(null);
    expect(parseUnitText('furlong')).toBe(null);
  });

  test('Kepler’s third law holds to the registry’s precision for the Earth and for Jupiter', () => {
    const earth = V('(1[yr] / 1[yr])^2 / (1[AU] / 1[AU])^3');
    expect(earth).toBe(1);
    const jupiter = V('(11.862[yr] / 1[yr])^2 / (5.2026[AU] / 1[AU])^3');
    expect(jupiter).toBeCloseTo(0.9993, 3);
    // Via the constants: a^3 / P^2 = G M / (4 pi^2).
    const m = V('to(1[AU]^3 / (1[yr])^2 * 4 * 9.8696044 / G, "Msun")');
    expect(m).toBeCloseTo(1, 4);
  });

  test('a magnitude, a logarithm and a simulation unit are not multiplicative', () => {
    const m = { g: num(15, 'mag'), r: num(14.2, 'mag') };
    expect(V('g - r', m)).toBeCloseTo(0.8, 12);
    expect(evaluate('g - r', m).info.unit).toBe('mag');
    expect(code('2 * g', m)).toBe(null);
    expect(evaluate('5[mag] * log10(100[pc] / 10[pc])', {}).value).toBeCloseTo(
      5,
      12
    );
    expect(code('g * r', m)).toBe('opaque');
    expect(code('1 / g', m)).toBe('opaque');
    expect(code('g * 1[m]', m)).toBe('opaque');
    expect(code('g ^ 2', m)).toBe('opaque');
    expect(code('g / r', m)).toBe('opaque');
    expect(code('g + 1', m)).toBe('dimension');
    expect(code('sqrt(g)', m)).toBe('opaque');
    expect(code('log10(g)', m)).toBe('dimensionless');
    expect(code('to(g, "dex")', m)).toBe('conversion');
  });

  test('a unit that is not stated is never guessed, and an unknown one is refused', () => {
    expect(code('x * 2', { x: { value: 1, unit: null } })).toBe('noUnit');
    expect(code('x * 2', { x: { value: 1, unit: 'furlong' } })).toBe('unit');
    expect(code('3[furlong]')).toBe('unit');
    expect(code('to(3, "furlong")')).toBe('unit');
    expect(code('to(3, 4)')).toBe('unit');
    expect(code('3 + "m"')).toBe('string');
    expect(code('sqrt("m")')).toBe('string');
    expect(code('to(3)')).toBe('arity');
    expect(code('sqrt(1, 2)')).toBe('arity');
  });

  test('a scaled data unit is the unit times its power of ten', () => {
    const f = { f: num(5, '1e-17 erg/s/cm2/Angstrom') };
    expect(V('to(f, "erg/s/cm2/Angstrom")', f)).toBeCloseTo(5e-17, 30);
    expect(V('f / 1e-17[erg/s/cm2/Angstrom]', f)).toBeCloseTo(5, 12);
  });

  test('a flux per wavelength does not become a flux per frequency', () => {
    expect(code('to(f, "Jy")', { f: num(1, 'W/m2/nm') })).toBe('conversion');
    expect(code('to(f, "W/m2/nm")', { f: num(1, 'erg/s/cm2/Angstrom') })).toBe(
      null
    );
    expect(
      V('to(f, "W/m2/nm")', { f: num(1, 'erg/s/cm2/Angstrom') })
    ).toBeCloseTo(0.01, 12);
  });
});

describe('uncertainty', () => {
  const sg = (value, sigma, unit = '') => ({ value, sigma, unit });
  const near = (a, b, rel = 1e-9) =>
    expect(Math.abs(a - b)).toBeLessThanOrEqual(rel * Math.abs(b));

  test('sums and differences add in quadrature, products and quotients their relative errors', () => {
    const i = { x: sg(10, 0.3), y: sg(4, 0.4) };
    near(evaluate('x + y', i).sigma, Math.hypot(0.3, 0.4));
    near(evaluate('x - y', i).sigma, 0.5);
    near(evaluate('x * y', i).sigma, 40 * Math.hypot(0.03, 0.1));
    near(evaluate('x / y', i).sigma, 2.5 * Math.hypot(0.03, 0.1));
    near(evaluate('3 * x', i).sigma, 0.9);
    near(evaluate('x^2', i).sigma, 2 * 10 * 0.3);
    near(evaluate('x^-1', i).sigma, 0.3 / 100);
    expect(evaluate('x + y', i).info.rule).toBe('first-order');
  });

  test('functions use their analytic derivatives', () => {
    const i = { x: sg(2, 0.1), y: sg(0.5, 0.01) };
    near(evaluate('sqrt(x)', i).sigma, 0.1 / (2 * Math.sqrt(2)));
    near(evaluate('ln(x)', i).sigma, 0.05);
    near(evaluate('log10(x)', i).sigma, 0.1 / (2 * Math.LN10));
    near(evaluate('exp(x)', i).sigma, Math.exp(2) * 0.1);
    near(evaluate('sin(y)', i).sigma, Math.cos(0.5) * 0.01);
    near(evaluate('cos(y)', i).sigma, Math.sin(0.5) * 0.01);
    near(evaluate('tan(y)', i).sigma, 0.01 / Math.cos(0.5) ** 2);
    near(evaluate('asin(y)', i).sigma, 0.01 / Math.sqrt(1 - 0.25));
    near(evaluate('acos(y)', i).sigma, 0.01 / Math.sqrt(1 - 0.25));
    near(evaluate('atan(y)', i).sigma, 0.01 / 1.25);
    near(evaluate('abs(-x)', i).sigma, 0.1);
    // In degrees the argument is rescaled, and the result's unit is read back.
    near(
      evaluate('sind(30 * y)', i).sigma,
      Math.cos((15 * Math.PI) / 180) * (Math.PI / 180) * 30 * 0.01
    );
  });

  test('a quantity used twice is differentiated once, not added as two inputs', () => {
    const i = { x: sg(10, 0.3, 'm') };
    expect(evaluate('x - x', i).sigma).toBe(0);
    expect(evaluate('x / x', i).sigma).toBe(0);
    near(evaluate('x * x', i).sigma, 2 * 10 * 0.3);
    near(evaluate('x + x', i).sigma, 0.6);
    near(evaluate('(x + 1[m]) / (x - 1[m])', i).sigma, (2 / 81) * 0.3);
  });

  test('Kepler’s third law from a period and an axis, against the analytic propagation', () => {
    const i = { P: sg(11.86, 0.02, 'yr'), a: sg(5.2, 0.01, 'AU') };
    const r = evaluate("to(P^2 / a^3, 'yr^2/AU^3')", i);
    const q = 11.86 ** 2 / 5.2 ** 3;
    near(r.value, q, 1e-12);
    near(r.sigma, q * Math.hypot((2 * 0.02) / 11.86, (3 * 0.01) / 5.2), 1e-9);
  });

  test('the basis and the rule are stated, and an uncertainty is withheld rather than invented', () => {
    expect(RULE).toBe('first-order-uncorrelated');
    const none = evaluate('x * y', {
      x: sg(1, 0.1, 'm'),
      y: { value: 2, unit: 'm', sigma: null },
    });
    expect(none.sigma).toBe(null);
    expect(none.info).toMatchObject({ rule: 'none', lacking: ['y'] });
    expect(evaluate('2 * M_sun', {}).info.rule).toBe('exact');
    expect(evaluate('x * 2', { x: sg(1, 0.1) }).info.rule).toBe('first-order');
  });

  test('an interval is refused, and the message points at the bootstrap', () => {
    try {
      evaluate('x * 2', { x: { value: 1, unit: '', uncertainty: 'interval' } });
      throw new Error('no refusal');
    } catch (e) {
      expect(e.code).toBe('interval');
      expect(EN_FORMULA['formula.err.interval']).toMatch(/bootstrap/i);
      expect(EN_FORMULA['formula.err.interval']).toMatch(/analysis lab/i);
    }
  });

  test('an aggregate over a column carries the mean’s error, and one that shares an input is not propagated', () => {
    const scope = { inputs: { x: { unit: 'm', uncertainty: 'sigma' } } };
    const data = {
      x: {
        values: Float64Array.from([1, 2, 3, 4]),
        sigma: Float64Array.from([0.1, 0.2, 0.3, 0.4]),
      },
    };
    const mean = compile('mean(x)', scope).run(data);
    near(mean.sigma[0], Math.sqrt(0.01 + 0.04 + 0.09 + 0.16) / 4);
    const max = compile('max(x)', scope).run(data);
    expect(max.sigma[0]).toBe(0.4);
    const shared = compile('x / mean(x)', scope);
    expect(shared.info.rule).toBe('shared');
    expect(shared.run({ x: { values: data.x.values } }).sigma).toBe(null);
    expect(compile('mean(x) - min(x)', scope).info.rule).toBe('shared');
    expect(compile('mean(x) * 2', scope).info.rule).toBe('first-order');
  });

  test('rows are independent: sigma is per row, and a missing row has none', () => {
    const scope = { inputs: { x: { unit: '', uncertainty: 'sigma' } } };
    const out = compile('x * 2', scope).run({
      x: {
        values: Float64Array.from([1, NaN, 3]),
        sigma: Float64Array.from([0.1, 0.1, 0.3]),
      },
    });
    expect(
      Array.from(out.sigma).map(v => (Number.isNaN(v) ? 'nan' : +v.toFixed(12)))
    ).toEqual([0.2, 'nan', 0.6]);
  });
});

describe('the envelope', () => {
  test('records the formula, the inputs with digests, the rule and the basis', async () => {
    const result = evaluate("to(P^2 / a^3, 'yr^2/AU^3') * 1", {
      P: { value: 11.86, unit: 'yr', sigma: 0.02 },
      a: { value: 5.2, unit: 'AU', sigma: 0.01 },
      z: { value: 1, unit: 'm' },
    });
    const env = await derivationEnvelope({
      id: 'derived:kepler',
      formula: 'P^2 / a^3',
      result,
      inputs: [
        { name: 'P', id: 'e1#0', value: 11.86, unit: 'yr', sigma: 0.02 },
        {
          name: 'a',
          id: 'e2#0',
          value: 5.2,
          unit: 'AU',
          sigma: 0.01,
          digest: 'abcdef0123456789',
        },
        { name: 'z', id: 'e3#0', value: 1, unit: 'm' },
      ],
    });
    expect(validateArtifact(env)).toEqual([]);
    const d = env.provenance.derivation;
    expect(d.formula).toBe('P^2 / a^3');
    expect(d.rule).toBe(RULE);
    // Only the inputs the formula read, each with a digest; one given is kept.
    expect(d.inputs.map(i => i.name)).toEqual(['P', 'a']);
    expect(d.inputs[1].digest).toBe('abcdef0123456789');
    expect(d.inputs[0].digest).toMatch(/^[0-9a-f]{64}$/);
    expect(env.source).toMatchObject({ kind: 'analysis', id: 'formula' });
    expect(env.source.digest).toMatch(/^[0-9a-f]{64}$/);
    const q = env.quantities[0];
    expect(q).toMatchObject({ origin: 'derived', unit: null });
    expect(q.uncertainty).toMatchObject({ kind: 'sigma', basis: 'derived' });
    // A different input is a different digest.
    const other = await derivationEnvelope({
      id: 'x',
      formula: 'P^2 / a^3',
      result,
      inputs: [
        { name: 'P', id: 'e1#0', value: 11.9, unit: 'yr', sigma: 0.02 },
        { name: 'a', id: 'e2#0', value: 5.2, unit: 'AU', sigma: 0.01 },
      ],
    });
    expect(other.provenance.derivation.inputs[0].digest).not.toBe(
      d.inputs[0].digest
    );
  });

  test('a result with no uncertainty says none, and a dimensionless one has the empty unit', async () => {
    const result = evaluate('x / 2', { x: { value: 4, unit: '' } });
    const env = await derivationEnvelope({
      id: 'd',
      formula: 'x / 2',
      result,
      inputs: [{ name: 'x', id: 'q', value: 4, unit: '' }],
    });
    expect(validateArtifact(env)).toEqual([]);
    expect(env.quantities[0].uncertainty).toEqual({ kind: 'none' });
    expect(env.quantities[0].unit).toBe('');
    expect(env.provenance.derivation.rule).toBe('none');
  });
});

describe('a question expected from the student’s own numbers', () => {
  const lesson = {
    id: 'kep',
    steps: [
      {
        sid: 'orbit',
        type: 'measure',
        fields: [
          { id: 'period', unit: 'yr' },
          { id: 'axis', unit: 'AU' },
        ],
      },
      {
        sid: 'ratio',
        type: 'question',
        kind: 'numeric',
        formula: {
          expr: "to(P^2 / a^3, 'yr^2/AU^3')",
          of: { P: 'orbit.period', a: 'orbit.axis' },
          tolerancePct: 2,
        },
      },
    ],
  };
  const mine = { 'orbit.period': 11.86, 'orbit.axis': 5.2 };
  const read = (sid, field) => mine[`${sid}.${field}`] ?? NaN;

  test('is computed from what each student measured, when it is graded', () => {
    const bound = bindFormulas(lesson, read);
    const step = bound.steps[1];
    expect(step.answer).toBeCloseTo(11.86 ** 2 / 5.2 ** 3, 12);
    expect(step.tolerance).toBeCloseTo((step.answer * 2) / 100, 12);
    expect(lesson.steps[1].answer).toBeUndefined();
    const before = step.answer;
    mine['orbit.axis'] = 4;
    expect(step.answer).not.toBe(before);
    mine['orbit.axis'] = 5.2;
    delete mine['orbit.period'];
    expect(step.answer).toBeNaN();
    mine['orbit.period'] = 11.86;
  });

  test('the shared grader reads it, and withholds a verdict until the numbers exist', async () => {
    const { checkAnswer, gradeAnswer } = await import('../js/answerCheck.js');
    const step = bindFormulas(lesson, read).steps[1];
    const ok = String(+(11.86 ** 2 / 5.2 ** 3).toPrecision(6));
    expect(checkAnswer(step, ok)).toBe(true);
    expect(checkAnswer(step, '0.5')).toBe(false);
    expect(gradeAnswer(step, ok).status).toBe('correct');
    delete mine['orbit.axis'];
    expect(checkAnswer(step, ok)).toBe(null);
    expect(gradeAnswer(step, ok).status).toBe('ungraded');
    mine['orbit.axis'] = 5.2;
  });

  test('a student’s Spanish decimals are read in the convention they typed', () => {
    const typed = { 'orbit.period': '11,86', 'orbit.axis': '5,2' };
    const reader = (sid, field) =>
      Number(typed[`${sid}.${field}`].replace(',', '.'));
    expect(bindFormulas(lesson, reader).steps[1].answer).toBeCloseTo(
      11.86 ** 2 / 5.2 ** 3,
      12
    );
  });

  test('is judged against the units of the fields it reads, and the question’s own', () => {
    const before = lesson.steps.slice(0, 1);
    const f = lesson.steps[1].formula;
    expect(formulaProblem(f, undefined, before)).toBe(null);
    expect(
      formulaProblem(
        { ...f, of: { P: 'orbit.nope', a: 'orbit.axis' } },
        undefined,
        before
      )
    ).toMatchObject({ code: 'of' });
    expect(
      formulaProblem(
        { ...f, of: { G: 'orbit.period', a: 'orbit.axis' } },
        undefined,
        before
      )
    ).toMatchObject({ code: 'of' });
    expect(
      formulaProblem({ ...f, expr: 'P + a' }, undefined, before)
    ).toMatchObject({ code: 'dimension' });
    expect(formulaProblem({ ...f, expr: 'a * 2' }, 'km', before)).toBe(null);
    expect(formulaProblem({ ...f, expr: 'a * 2' }, 'd', before)).toMatchObject({
      code: 'conversion',
    });
    expect(
      formulaProblem({ ...f, expr: 'a * 2' }, undefined, before)
    ).toMatchObject({ code: 'unitless' });
    expect(formulaProblem({ ...f, expr: 'a / 1[AU]' }, undefined, before)).toBe(
      null
    );
    const units = [
      {
        sid: 'orbit',
        type: 'measure',
        fields: [{ id: 'period' }, { id: 'axis', unit: 'AU' }],
      },
    ];
    expect(formulaProblem({ ...f, expr: 'a * 2' }, 'AU', units)).toBe(null);
    expect(formulaProblem({ ...f, expr: 'P * 2' }, 'yr', units)).toMatchObject({
      code: 'noUnit',
    });
    expect(
      expectedValue(
        { ...lesson.steps[1], formula: { ...f, expr: 'P +' } },
        lesson.steps,
        read
      )
    ).toBeNaN();
  });

  test('the unit the answer is typed in is applied to the result', () => {
    const q = {
      sid: 'q',
      type: 'question',
      kind: 'numeric',
      unit: 'km',
      formula: { expr: 'a * 2', of: { a: 'orbit.axis' } },
    };
    const bound = bindFormulas({ id: 'k', steps: [lesson.steps[0], q] }, read)
      .steps[1];
    expect(bound.answer / ((2 * 5.2 * UNITS.AU.factor) / 1000)).toBeCloseTo(
      1,
      12
    );
    expect(bound.tolerance).toBeCloseTo((bound.answer * 5) / 100, 6);
  });
});

describe('the byte cost', () => {
  const sizes = () =>
    JSON.parse(
      execFileSync('node', ['tools/formula-size.mjs'], {
        cwd: new URL('..', import.meta.url).pathname,
        encoding: 'utf8',
      })
    );

  // DELEGATED, D-FORMULA-01: the module's own ceiling, recorded when it
  // landed (5,808 bytes gzipped, minified, for the grammar, the dimension
  // table and the evaluator). Raising it is a decision in DECISION_REGISTER.md.
  test('the language is within 6144 bytes gzipped, and the question grader within 6656', () => {
    const s = sizes();
    expect(s.engine.gzip).toBeLessThanOrEqual(6144);
    expect(s.grade.gzip).toBeLessThanOrEqual(6656);
  });
});
