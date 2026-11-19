// The lesson as a whole (js/lesson/opening.js): the opening rule on the five
// pilots in both languages, their stated media, and the ending's rows, which
// carry the student's own answers and readings and never a key.

import { describe, test, expect } from '@jest/globals';
import { mergeTranslation } from '../js/data/investigations/i18n.js';
import { endingRows, plain } from '../js/lesson/opening.js';
import {
  openingProblems,
  sentences,
  MEDIA,
} from '../tools/authoring/openingRule.mjs';
import { rowText } from '../js/investigations/ending.js';

const PILOTS = {
  'keplers-laws': 'scene',
  'transit-photometry': 'instrument',
  'measuring-the-moon': 'image',
  'ios-fire': 'instrument',
  'tides-that-move-the-moon': 'instrument',
  'weighing-stars': 'scene',
};

const load = async id => {
  const en = (await import(`../js/data/investigations/${id}.js`)).default;
  const es = (await import(`../js/data/investigations/es/${id}.js`)).default;
  return { en, es: mergeTranslation(en, es) };
};

describe('the opening of each pilot', () => {
  for (const [id, kind] of Object.entries(PILOTS)) {
    test(`${id}: question first, the action and the medium second, in both languages`, async () => {
      const { en, es } = await load(id);
      expect(openingProblems(en)).toEqual([]);
      expect(openingProblems(es)).toEqual([]);
      expect(en.medium.kind).toBe(kind);
      expect(es.medium.kind).toBe(kind);
      expect(es.question).not.toBe(en.question);
      expect(es.medium.name).not.toBe(en.medium.name);
      // Short enough for a first screen: the measured fit is the browser
      // spec's (e2e/lessonEnding.spec.js); this keeps a rewrite honest.
      for (const l of [en, es])
        expect(sentences(l.steps[0].body).join(' ').length).toBeLessThan(300);
    });
  }

  test('the rule names what is wrong', () => {
    const lesson = {
      question: 'Why?',
      medium: { kind: 'scene', name: 'the live view' },
      steps: [
        { sid: 'a', type: 'read', body: 'Something else. Then more.' },
        { sid: 'b', type: 'predict', canvas: 'quiet' },
      ],
    };
    const out = openingProblems(lesson);
    expect(out.join('\n')).toMatch(/first sentence of the first step/);
    expect(out.join('\n')).toMatch(/names the medium/);
    expect(out.join('\n')).toMatch(/scene medium needs the scene/);
    expect(openingProblems({ steps: [] })).toEqual([]);
    expect(
      openingProblems({ ...lesson, medium: { kind: 'poster', name: 'x' } })
    ).toContainEqual(expect.stringMatching(/not one of/));
    expect(MEDIA).toEqual(['scene', 'instrument', 'image', 'data']);
  });

  test('sentences split on a full stop and keep decimals and glossary words', () => {
    expect(
      sentences(
        'An orbit of 0.0041. The [[eccentricity|shape]] is <em>small</em>.'
      )
    ).toEqual(['An orbit of 0.0041.', 'The shape is small.']);
    expect(plain('Io&rsquo;s &plusmn;')).toBe('Io’s ±');
  });
});

describe('the ending: the student’s own work, never a key', () => {
  const steps = [
    { sid: 'r', type: 'read', title: 'Read' },
    {
      sid: 'p',
      type: 'predict',
      title: 'Where?',
      options: ['the centre', 'a <em>focus</em>'],
      answer: 1,
      reveal: 'm',
    },
    { sid: 'e', type: 'predict', kind: 'estimate', title: 'Guess', unit: 'yr' },
    {
      sid: 'm',
      type: 'measure',
      title: 'Measure',
      fields: [
        { id: 'a', label: 'Distance', unit: 'AU', want: '1.86' },
        { id: 'b', label: 'Speed', unit: 'km/s', want: '30' },
      ],
    },
    {
      sid: 'c',
      type: 'question',
      kind: 'choice',
      title: 'Check',
      options: ['x', 'y'],
      answer: 0,
    },
    {
      sid: 'n',
      type: 'question',
      kind: 'numeric',
      title: 'Number',
      unit: 'M☉',
      answer: 1.15,
    },
    { sid: 's', type: 'question', kind: 'short', title: 'Why' },
  ];
  const keyOf = s => `L:${s.sid}`;

  test('a seeded run gives one row per answer and reading, in lesson order', () => {
    const rows = endingRows(
      steps,
      {
        'L:p': 0,
        'L:e': '2;3',
        'L:m:a': '0.51',
        'L:m:a:src': JSON.stringify({ k: 'c', l: 'closest approach' }),
        'L:m:b': '',
        'L:c': 0,
        'L:n': '1.2',
        'L:s': 'It speeds up near the star.',
      },
      keyOf
    );
    expect(rows.map(r => [r.sid, r.kind, r.text])).toEqual([
      ['p', 'prediction', 'the centre'],
      ['e', 'estimate', '2–3'],
      ['m', 'reading', '0.51'],
      ['n', 'number', '1.2'],
      ['s', 'words', 'It speeds up near the star.'],
    ]);
    expect(rows[2].how).toEqual({ k: 'c', l: 'closest approach' });
    const all = JSON.stringify(rows);
    expect(all).not.toMatch(/focus|1\.86|"30"|1\.15/);
  });

  test('an empty run has no rows', () => {
    expect(endingRows(steps, {}, keyOf)).toEqual([]);
    expect(endingRows(steps, null, keyOf)).toEqual([]);
  });

  test('a row reads as words in the language of the dialog', () => {
    const words = kind =>
      ({
        reading: 'Your reading, {label}: {text}',
        prediction: 'You predicted: {text}',
      })[kind];
    const take = how =>
      how.k === 't' ? 'Typed by you.' : `Taken from ${how.l}.`;
    expect(
      rowText(
        {
          title: 'Measure',
          kind: 'reading',
          label: 'Distance',
          text: '0.51',
          unit: 'AU',
          how: { k: 'c', l: 'closest approach' },
        },
        words,
        take
      )
    ).toBe(
      'Measure — Your reading, Distance: 0.51 AU (Taken from closest approach)'
    );
    expect(
      rowText(
        { title: 'Where?', kind: 'prediction', text: 'the centre' },
        words,
        take
      )
    ).toBe('Where? — You predicted: the centre');
  });
});
