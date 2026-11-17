// =============================================================================
// Type, mathematics and numbers in the lesson panel
// -----------------------------------------------------------------------------
// Three promises, kept on the five pilot lessons (Kepler's Laws, Transit
// Photometry, Weighing Stars, Measuring the Moon, Io's fire and the tides),
// in both languages, by rendering their prose the way the panel does:
//
//   1. A number is never parted from the word after it at the end of a line,
//      a hyphen before a digit is a minus sign, and a formula follows one
//      convention (variables italic, operators kept with the term before them).
//   2. The first use of a glossary term carries the lesson mark, outside every
//      answer a step holds back, and the Spanish marks are the English ones.
//   3. The rule set itself does what it says (typeset).
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import { prose, typeset, unmark } from '../js/lessonMarkup.js';
import TERMS_EN from '../js/explain/terms.en.js';
import TERMS_ES from '../js/explain/terms.es.js';

const PILOTS = [
  'keplers-laws',
  'transit-photometry',
  'weighing-stars',
  'measuring-the-moon',
  'ios-fire',
  'tides-that-move-the-moon',
];

const NBSP = ' ';
const NNBSP = ' ';

async function lesson(lang, id) {
  const dir = lang === 'es' ? 'es/' : '';
  return (await import(`../js/data/investigations/${dir}${id}.js`)).default;
}

const LESSONS = {};
for (const lang of ['en', 'es'])
  for (const id of PILOTS) LESSONS[`${lang}:${id}`] = await lesson(lang, id);

/** Where a string sits in a step, and whether the step holds it back. */
const HELD =
  /(^|\.)(options|because|hints|worked|misconceptions|feedback|rubric|reveal)(\.|\[|$)/;

/** Every string of the steps that the panel renders as prose, with its path. */
function* proseStrings(steps) {
  const KEYS =
    /(^|\.)(body|tip|prompt|because|options|hints|worked|say|feedback|label|note|caption|text|checklist|message)/;
  function* walk(value, path) {
    if (typeof value === 'string') yield [path, value];
    else if (Array.isArray(value))
      for (const [i, v] of value.entries()) yield* walk(v, `${path}[${i}]`);
    else if (value && typeof value === 'object')
      for (const [k, v] of Object.entries(value)) {
        if (k === 'tool' || k === 'plot' || k === 'setup' || k === 'bind')
          continue;
        yield* walk(v, path ? `${path}.${k}` : k);
      }
  }
  for (const [i, step] of steps.entries())
    for (const [path, text] of walk(step, `steps[${i}]`))
      if (KEYS.test(path.replace(/^steps\[\d+\]\.?/, ''))) yield [path, text];
}

describe('typeset: the rule set', () => {
  const sp = text => typeset(text).replaceAll(NBSP, '~').replaceAll(NNBSP, '_');

  test('a number keeps its unit, in either language', () => {
    expect(sp('at 5.204 AU and 11.87 years')).toBe(
      'at 5.204~AU and 11.87~years'
    );
    expect(sp('a 4,1 m telescope; 3 días')).toBe('a 4,1~m telescope; 3~días');
    expect(sp('1.155 R<sub>☉</sub>')).toBe('1.155~R<sub>☉</sub>');
    expect(sp('10<sup>13</sup> W')).toBe('10<sup>13</sup>~W');
    expect(sp('9.33 × 10¹³ W')).toBe('9.33_×_10¹³~W');
  });

  test('a scale word keeps the unit after it', () => {
    expect(sp('about 5 million km')).toBe('about 5~million~km');
    expect(sp('unos 5 millones de km')).toBe('unos 5~millones~de km');
  });

  test('a hyphen before a digit is a minus, and a range keeps its hyphen', () => {
    expect(sp('from -3.5 to (-2)')).toBe('from −3.5~to (−2)');
    expect(typeset('Kepler-10, 3-5, COVID-19')).toBe(
      'Kepler-10, 3-5, COVID-19'
    );
  });

  test('an operator stays with the term before it', () => {
    expect(sp('P = 8 m and P ≈ 8')).toBe('P~= 8~m and P~≈ 8');
    expect(sp('2 × 3')).toBe('2_×_3');
  });

  test('an authored non-breaking space is left alone', () => {
    const html = prose('HD&nbsp;209458 b');
    expect(html).toContain(`HD${NBSP}209458`);
  });
});

describe('numbers and formulas in the pilots', () => {
  const cases = Object.entries(LESSONS).flatMap(([key, l]) =>
    [...proseStrings(l.steps)].map(([path, text]) => [key, path, text])
  );

  test('the scan sees the prose of every pilot', () => {
    expect(cases.length).toBeGreaterThan(900);
  });

  test('no number is parted from the word after it by a breaking space', () => {
    const loose = [];
    for (const [key, path, text] of cases) {
      const html = prose(unmark(text));
      if (/[\d²³¹⁰-⁹] (?=[\p{L}%°])/u.test(html)) loose.push(`${key} ${path}`);
    }
    expect(loose).toEqual([]);
  });

  test('no hyphen stands for a minus', () => {
    const bad = [];
    for (const [key, path, text] of cases)
      if (/(^|[\s(=])-\d/.test(prose(text))) bad.push(`${key} ${path}`);
    expect(bad).toEqual([]);
  });

  test('formulas are written with the real signs and no spelled-out operators', () => {
    const spelled =
      /\b[a-zA-Z0-9] x [a-zA-Z0-9]\b|sqrt\(|ra\u00edz\(|\^|(cubed|squared|al cubo|al cuadrado) ?\//;
    const bad = [];
    for (const [key, path, text] of cases) {
      const t = unmark(text);
      if (spelled.test(t)) bad.push(`${key} ${path}: ${t.slice(0, 80)}`);
    }
    expect(bad).toEqual([]);
  });

  test('a variable read aloud ("P squared") is italic too', () => {
    const loose =
      /(?<![\p{L}\p{N}<>/])[aPeMbR] (squared|cubed|al cubo|al cuadrado)\b/u;
    const bad = [];
    for (const [key, path, text] of cases)
      if (loose.test(prose(unmark(text)).replace(/\s/g, ' ')))
        bad.push(`${key} ${path}`);
    expect(bad).toEqual([]);
  });

  test('a variable beside an operator is italic', () => {
    // An upright single letter before a bound operator, or one after the
    // operator, is a variable that missed its <em>.
    const before = new RegExp(
      `(?<![\\p{L}\\p{N}>/])[A-Za-zδ](?:<sup>\\d</sup>|<sub>[^<]*</sub>|[²³¹⁰⁴-⁹₀-₉])*${NBSP}[=≈∝÷]`,
      'u'
    );
    const bad = [];
    for (const [key, path, text] of cases) {
      const html = prose(unmark(text));
      if (before.test(html)) bad.push(`${key} ${path}: ${html.slice(0, 90)}`);
    }
    expect(bad).toEqual([]);
  });
});

describe('glossary marks in the pilots', () => {
  const MARK = /\[\[([a-z0-9-]+)\|([^\]]*)\]\]/g;
  const marksOf = l => {
    const out = [];
    for (const [path, text] of proseStrings(l.steps))
      for (const m of text.matchAll(MARK)) out.push({ path, id: m[1] });
    return out;
  };

  test('every mark names a glossary term in both languages', () => {
    for (const l of Object.values(LESSONS))
      for (const { id } of marksOf(l)) {
        expect(TERMS_EN[id]).toBeDefined();
        expect(TERMS_ES[id]).toBeDefined();
      }
  });

  test('no mark sits in an answer a step holds back, in a prediction or in a control', () => {
    const bad = [];
    for (const [key, l] of Object.entries(LESSONS))
      for (const { path, id } of marksOf(l)) {
        const step = l.steps[Number(/steps\[(\d+)\]/.exec(path)[1])];
        const inner = path.replace(/^steps\[\d+\]\.?/, '');
        if (
          HELD.test(inner) ||
          !/^(body)$/.test(inner) ||
          step.type === 'predict'
        )
          bad.push(`${key} ${path} ${id}`);
      }
    expect(bad).toEqual([]);
  });

  test('each term is marked once per lesson, at its first use', () => {
    for (const l of Object.values(LESSONS)) {
      const ids = marksOf(l).map(m => m.id);
      expect(ids.length).toBeGreaterThan(0);
      expect([...new Set(ids)]).toEqual(ids);
    }
  });

  test.each(PILOTS)(
    'the Spanish marks of %s are the English ones, step for step',
    id => {
      const key = x => marksOf(LESSONS[x]).map(m => `${m.path}=${m.id}`);
      expect(key(`es:${id}`)).toEqual(key(`en:${id}`));
    }
  );

  test('a mark carries its words, so paper and a copied note read the same', () => {
    const l = LESSONS['en:keplers-laws'];
    const body = l.steps.find(s => /\[\[semi-major-axis\|/.test(s.body)).body;
    expect(unmark(body)).toMatch(/semi-major\s+axis/);
    expect(unmark(body)).not.toContain('[[');
  });
});

describe('first use of each glossary term in the pilots', () => {
  // Terms whose first plain mention is not a first use of the glossary's sense,
  // or sits where a mark may not go (a held answer, a control, a panel name).
  const EXEMPT = new Set([
    'transit-photometry:parameter', // "parameter space", not a fitted number
    'transit-photometry:noise', // first used in a tip, then only in an option
    'transit-photometry:light-curve', // step 3 names the Light Curve panel; marked at its first prose use
    'transit-photometry:magnitude', // "magnitude" before step 23 is not the scale
    'ios-fire:magnitude', // "orders of magnitude"
  ]);
  const names = lang =>
    Object.entries(lang === 'es' ? TERMS_ES : TERMS_EN).map(([id, row]) => [
      id,
      row[0].toLowerCase(),
    ]);
  const fold = text =>
    unmark(text)
      .replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' ')
      .toLowerCase();

  test.each(PILOTS)('%s: the first visible use of a term is marked', id => {
    const l = LESSONS[`en:${id}`];
    const missed = [];
    for (const [term, name] of names('en')) {
      const re = new RegExp(
        `(?<![\\p{L}-])${name.replace(/[-]/g, '[- ]')}s?(?![\\p{L}-])`,
        'u'
      );
      const step = l.steps.find(
        s => s.type !== 'predict' && s.body && re.test(fold(s.body))
      );
      if (!step || EXEMPT.has(`${id}:${term}`)) continue;
      if (!new RegExp(`\\[\\[${term}\\|`).test(step.body))
        missed.push(`${term} first appears unmarked in ${step.sid}`);
    }
    expect(missed).toEqual([]);
  });
});
