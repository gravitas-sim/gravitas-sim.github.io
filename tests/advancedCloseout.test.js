// =============================================================================
// The advanced closeout (Roadmap III Prompt 274, ADVANCED_CLOSEOUT.md)
// -----------------------------------------------------------------------------
// What the closeout placed, held to the sources: the sequence of the 3-D lab's
// and the mission lab's guides in the Library, the relations it gives them,
// the two reading steps of the upper-level package, and the facts the content
// acceptance audit states about the guides. Nothing here grades a guide; each
// curriculum's own suite does that.
// =============================================================================
import { describe, test, expect } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { curatedSequences } from '../tools/build-library.mjs';
import { GUIDES as LAB3D } from '../js/lab3d/guides/curriculum.js';
import { GUIDES as MISSION } from '../js/mission/lab/curriculum.js';
import { SEQUENCES } from '../js/data/investigations/sequences.js';
import { BUILTIN_COURSES } from '../js/data/courses/index.js';
import { translationState } from '../js/course/review.js';
import { RETIRED } from '../tools/glossary.mjs';

const library = JSON.parse(readFileSync('library/library.json', 'utf8'));
const byId = new Map(library.entries.map(e => [e.id, e]));
const ID = 'spaceflight-and-the-3d-sky';
const sequence = library.sequences.find(s => s.id === ID);
const guides = [...LAB3D, ...MISSION];

describe('the sequence of the 3-D and mission guides', () => {
  test('holds every guide of the two labs once, and nothing else', () => {
    expect(sequence).toBeDefined();
    expect([...sequence.entries].sort()).toEqual(
      guides.map(g => `investigation:${g.id}`).sort()
    );
    for (const id of sequence.entries)
      expect(['lab3d', 'mission']).toContain(byId.get(id).format);
  });

  test('places every prerequisite before the guide that names it', () => {
    const seen = new Set();
    for (const id of sequence.entries) {
      for (const p of byId.get(id).prerequisites ?? [])
        if (sequence.entries.includes(p)) expect(seen.has(p)).toBe(true);
      seen.add(id);
    }
  });

  test('is for majors and upper-level courses, after a curated sequence, in both languages', () => {
    for (const id of sequence.entries)
      expect(['majors', 'upper']).toContain(byId.get(id).courseLevel);
    expect(sequence.after).toEqual(['gravity-and-orbits']);
    expect(SEQUENCES.map(s => s.id)).toContain(sequence.after[0]);
    for (const words of [sequence.title, sequence.blurb]) {
      expect(words.en.trim()).not.toBe('');
      expect(words.es.trim()).not.toBe('');
      expect(words.es).not.toBe(words.en);
      // A student reads these: none of the retired words (D-TERM-01).
      for (const r of RETIRED)
        for (const lang of ['en', 'es'])
          expect(r[lang].test(words[lang])).toBe(false);
    }
  });

  test('gives every guide a place in a pathway and a next entry, or says it is the last', () => {
    sequence.entries.forEach((id, i) => {
      const rel = byId.get(id).rel;
      expect(rel.in).toContainEqual(['seq', ID, i]);
      if (i < sequence.entries.length - 1) {
        expect(rel.next.length).toBeGreaterThan(0);
        expect(rel.why).toBeUndefined();
      } else expect(rel.why).toBe('last');
    });
  });

  test('carries no compute link and no held consumer', () => {
    const text = JSON.stringify(sequence);
    expect(text).not.toMatch(/compute|notebook/i);
    for (const id of sequence.entries)
      expect(byId.get(id).route).toMatch(/^\/(3d|mission\/lab)\/\?guide=/);
  });
});

describe('a curated sequence is held to the Library', () => {
  const entries = [
    { id: 'investigation:a', kind: 'investigation', format: 'lab3d' },
    {
      id: 'investigation:b',
      kind: 'investigation',
      format: 'lab3d',
      prerequisites: ['investigation:a'],
    },
    { id: 'investigation:c', kind: 'investigation', format: 'lesson' },
  ];
  const good = {
    id: 'two-guides',
    formats: ['lab3d'],
    title: { en: 'Two', es: 'Dos' },
    blurb: { en: 'Two guides.', es: 'Dos guías.' },
    after: ['first'],
    entries: ['investigation:a', 'investigation:b'],
  };
  const run = change =>
    curatedSequences([{ ...good, ...change }], entries, ['first']);

  test('a sound one comes back in the Library’s form', () => {
    expect(run({})).toEqual([
      {
        id: 'two-guides',
        title: good.title,
        blurb: good.blurb,
        entries: good.entries,
        after: ['first'],
      },
    ]);
    expect(curatedSequences(undefined, entries, [])).toEqual([]);
  });

  test.each([
    ['an id that is taken', { id: 'first' }, /already a sequence/],
    ['an id that is not one', { id: 'Two Guides' }, /is not an id/],
    ['a missing Spanish title', { title: { en: 'Two' } }, /no title in "es"/],
    ['an unknown sequence before it', { after: ['nowhere'] }, /no sequence/],
    [
      'an entry that is a lesson',
      { entries: ['investigation:a', 'investigation:b', 'investigation:c'] },
      /not a guide of its labs/,
    ],
    [
      'an entry that does not exist',
      { entries: ['investigation:a', 'investigation:b', 'investigation:z'] },
      /not a guide of its labs/,
    ],
    [
      'a guide before the one it assumes',
      { entries: ['investigation:b', 'investigation:a'] },
      /before investigation:a, which it assumes/,
    ],
    [
      'a guide named twice',
      { entries: ['investigation:a', 'investigation:a', 'investigation:b'] },
      /twice/,
    ],
    ['a guide left out', { entries: ['investigation:a'] }, /leaves out/],
    ['no guide at all', { entries: [] }, /leaves out/],
  ])('refuses %s', (_, change, message) => {
    expect(() => run(change)).toThrow(message);
  });
});

describe('the upper-level package', () => {
  let pack;
  const unit = id => pack.units.find(u => u.id === id);
  const COMPUTE = [
    'integrators-in-practice',
    'extending-an-experiment',
    'refitting-a-transit',
    'two-periodograms',
    'sampling-a-posterior',
  ];

  test('loads', async () => {
    pack = await BUILTIN_COURSES['upper-level-modules']();
    expect(pack.units.map(u => u.id)).toEqual([
      'celestial-mechanics',
      'stellar-astrophysics',
      'galactic-dynamics',
      'exoplanet-science',
      'time-domain',
      'cosmology',
      'survey-statistics',
      'computation',
    ]);
  });

  test('lists every guide of the sequence in the celestial mechanics unit', () => {
    const listed = unit('celestial-mechanics')
      .items.filter(i => i.kind === 'guide')
      .map(i => `investigation:${i.guide}`);
    expect([...listed].sort()).toEqual([...sequence.entries].sort());
  });

  test.each([
    ['celestial-mechanics', 'not-yet-windows-budgets-and-libration'],
    ['computation', 'not-yet-numerical-methods'],
  ])(
    'the %s unit ends on a reading step for what has no investigation',
    (unitId, id) => {
      const items = unit(unitId).items;
      const item = items[items.length - 1];
      expect(item.id).toBe(id);
      expect(item.kind).toBe('reading');
      expect(item.objectives).toEqual([]);
      expect(item.access).toBe('open');
      expect(item.license).toBe('CC BY 4.0');
      expect(item.cite.url).toMatch(/^https:\/\//);
      expect(item.cite.url).not.toMatch(/compute/);
      for (const words of [item.title, item.studentNote, item.teacherNote])
        expect(translationState(words, 'es')).toBe('done');
      // What is missing is said in words: no count and no file path.
      for (const note of [item.studentNote, item.teacherNote])
        for (const lang of ['en', 'es'])
          expect(note[lang]).not.toMatch(/\.(js|json|md)\b|D-R10|\d{3,}/);
    }
  );

  test('leaves the computation unit’s investigations as they were', () => {
    const lessons = unit('computation').items.filter(i => i.kind === 'lesson');
    expect(lessons.map(i => i.lesson)).toEqual(COMPUTE);
    for (const i of lessons) {
      expect(i.depth).toBe('core');
      expect(i.objectives).toEqual(['compute']);
      expect(i.studentNote).toBeUndefined();
      expect(i.teacherNote).toBeUndefined();
    }
  });
});

describe('what the acceptance audit states about the guides', () => {
  test.each(guides.map(g => [g.id, g]))(
    '%s: a prediction, graded answers, two depths and a closing statement of limits',
    (_, g) => {
      const predictions = g.steps.filter(
        s => s.kind === 'choose' && s.correct === null
      );
      expect(predictions.length).toBeGreaterThan(0);
      expect(g.steps.filter(s => s.kind === 'answer').length).toBeGreaterThan(
        0
      );
      expect(g.depths).toEqual(['core', 'advanced']);
      const last = g.steps[g.steps.length - 1];
      expect([last.id, last.kind]).toEqual(['limits', 'read']);
    }
  );

  test('one guide asks for a written explanation; the audit says which', () => {
    expect(
      guides.filter(g => g.steps.some(s => s.kind === 'explain')).map(g => g.id)
    ).toEqual(['ml-cruise']);
  });
});
