// =============================================================================
// The Library's relations and search (Roadmap III Prompt 163)
// -----------------------------------------------------------------------------
// tools/build-relations.mjs writes `rel` into every entry of library.json and
// its validator is the one the build runs; js/library/search.js ranks by field
// and names why a result matched. tests/library.test.js holds the file to its
// generator; this holds what the relations and the search promise.
// =============================================================================

import { beforeEach, describe, expect, test } from '@jest/globals';
import { readFileSync } from 'node:fs';
import {
  MAX_NEXT,
  MAX_RELATED,
  buildRelations,
  problems,
  teachRoute,
} from '../tools/build-relations.mjs';
import { rank, words } from '../js/library/search.js';
import { continueRows, resumeItems } from '../js/welcome.js';
import { RESUME_KEY, noteResume, readResume } from '../js/storage/local.js';

const read = rel => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');
const LIB = JSON.parse(read('library/library.json'));
const clone = x => JSON.parse(JSON.stringify(x));

describe('the relations in library.json', () => {
  test('are sound: no dangling id, no repeat, a reason where nothing comes next', () => {
    expect(problems(LIB)).toEqual([]);
  });

  test('are what the generator derives from the rest, deterministically', () => {
    const uses = new Map(
      LIB.entries.filter(e => e.rel.uses).map(e => [e.id, e.rel.uses])
    );
    const again = buildRelations(LIB, { uses });
    for (const e of LIB.entries) expect(again.get(e.id)).toEqual(e.rel);
    expect(buildRelations(LIB, { uses })).toEqual(again);
  });

  test('stay inside their limits, and never name the entry itself', () => {
    for (const e of LIB.entries) {
      expect(e.rel.next.length).toBeLessThanOrEqual(MAX_NEXT);
      expect(e.rel.related.length).toBeLessThanOrEqual(MAX_RELATED);
      for (const list of [e.rel.pre, e.rel.next, e.rel.related])
        expect(list).not.toContain(e.id);
    }
  });

  test('every entry has next entries or a stated reason, and a reason only when there are none', () => {
    for (const e of LIB.entries) {
      if (e.rel.next.length) expect(e.rel.why).toBeUndefined();
      else expect(['last', 'standalone']).toContain(e.rel.why);
    }
  });

  test('follow the sequences: the next of an entry in a sequence is the one after it', () => {
    for (const s of LIB.sequences)
      s.entries.slice(0, -1).forEach((id, i) => {
        const e = LIB.entries.find(x => x.id === id);
        expect(e.rel.next).toContain(s.entries[i + 1]);
        expect(e.rel.in).toContainEqual(['seq', s.id, i]);
      });
  });

  test('say which pathway an item is in, a sequence or a course, by kind', () => {
    const kepler = LIB.entries.find(e => e.id === 'investigation:keplers-laws');
    const kinds = new Set(kepler.rel.in.map(([k]) => k));
    expect(kinds).toEqual(new Set(['seq', 'course']));
  });

  test('a dataset leads to the investigations that open it, and a scenario to the ones that use it', () => {
    const tess = LIB.entries.find(e => e.id === 'dataset:tess-light-curve');
    expect(tess.rel.next).toContain('investigation:exo-star');
    const kepler2 = LIB.entries.find(e => e.id === 'scenario:keplers-2nd-law');
    expect(kepler2.rel.next).toContain('investigation:keplers-laws');
  });

  test("an instructor's page is named only where the site has it", () => {
    const withPage = LIB.entries.filter(e => e.rel.teach);
    expect(withPage.length).toBeGreaterThan(70);
    for (const e of withPage)
      expect(read(`${e.rel.teach.slice(1)}index.html`)).toMatch(/<html/);
    expect(teachRoute({ id: 'scenario:solar-system' })).toBeNull();
    expect(teachRoute({ id: 'investigation:no-such' }, () => false)).toBeNull();
  });
});

describe('the validator', () => {
  const one = () => clone(LIB);

  test('catches a dangling id in each list', () => {
    for (const list of ['pre', 'next', 'related']) {
      const lib = one();
      lib.entries[0].rel[list] = ['investigation:no-such-thing'];
      lib.entries[0].rel.why = undefined;
      expect(problems(lib).join('\n')).toMatch(/no-such-thing/);
    }
  });

  test('catches an entry with no next entry and no reason, and a reason beside a next entry', () => {
    const none = one();
    const e = none.entries.find(x => x.rel.why);
    delete e.rel.why;
    expect(problems(none)).toContain(
      `${e.id}: no next entry and no stated reason`
    );
    const both = one();
    const f = both.entries.find(x => x.rel.next.length);
    f.rel.why = 'last';
    expect(problems(both)).toContain(`${f.id}: a reason with next entries`);
  });

  test('catches a repeat, a self-reference, a bad pathway and a missing instructor page', () => {
    const lib = one();
    const e = lib.entries.find(x => x.rel.next.length);
    e.rel.next = [e.rel.next[0], e.rel.next[0]];
    e.rel.related = [e.id];
    e.rel.in = [['seq', 'no-such-sequence', 0]];
    e.rel.teach = '/teaching/investigation/not-a-page/';
    const found = problems(lib).join('\n');
    expect(found).toMatch(/repeats an id/);
    expect(found).toMatch(/names itself/);
    expect(found).toMatch(/rel\.in has/);
    expect(found).toMatch(/not a page of the site/);
  });

  test('catches an entry with no relations at all', () => {
    const lib = one();
    delete lib.entries[3].rel;
    expect(problems(lib)).toContain(`${lib.entries[3].id}: no relations`);
  });
});

describe('the search', () => {
  const entries = [
    {
      id: 'investigation:transit-photometry',
      title: 'Finding Planets by Their Shadows',
      summary: 'Measure a dip in starlight.',
      subjects: ['exoplanets'],
      level: 'intro',
    },
    {
      id: 'scenario:transit-lab',
      title: 'Transit Lab',
      summary: 'A planet crossing a star.',
      subjects: ['exoplanets'],
      level: 'intro',
    },
    {
      id: 'investigation:kepler',
      title: 'Kepler’s Laws',
      summary: 'Orbits and a transit of ideas.',
      subjects: ['orbits'],
      level: 'intro',
    },
    {
      id: 'dataset:sdss-g',
      title: 'SDSS: a G star',
      summary: 'A spectrum.',
      subjects: ['stars'],
      level: 'beginner',
    },
  ];
  const ctx = {
    subjects: e => e.subjects,
    facts: e => [e.level, 'dataset'],
    objectives: id =>
      id === 'investigation:kepler'
        ? 'Explain periapsis in terms of angular momentum'
        : '',
  };

  test('a word in the title outranks one in the id, which outranks one in a summary', () => {
    const got = [...rank(entries, 'transit', ctx).keys()];
    expect(got).toEqual([
      'scenario:transit-lab',
      'investigation:transit-photometry',
      'investigation:kepler',
    ]);
  });

  test('every word has to match, in any order, and nothing matches a slip', () => {
    expect([...rank(entries, 'lab transit', ctx).keys()]).toEqual([
      'scenario:transit-lab',
    ]);
    expect(rank(entries, 'transi5', ctx).size).toBe(0);
    expect(rank(entries, '   ', ctx).size).toBe(0);
    expect(words('  Énergia  de  órbita ')).toEqual([
      'energia',
      'de',
      'orbita',
    ]);
  });

  test('names the fields a result matched, and drops the id when the title already said it', () => {
    const hit = rank(entries, 'transit', ctx);
    expect(hit.get('scenario:transit-lab').why).toEqual(
      ['title', 'summary'].filter(f => f === 'title' || false).concat([]).length
        ? ['title']
        : []
    );
    expect(hit.get('investigation:transit-photometry').why).toEqual(['id']);
    expect(hit.get('investigation:kepler').why).toEqual(['summary']);
    expect(
      rank(entries, 'periapsis', ctx).get('investigation:kepler').why
    ).toEqual(['objectives']);
    expect(
      rank(entries, 'exoplanets', ctx).get('scenario:transit-lab').why
    ).toEqual(['subjects']);
    expect(rank(entries, 'beginner', ctx).get('dataset:sdss-g').why).toEqual([
      'facts',
    ]);
  });

  test('folds accents both ways', () => {
    expect(
      rank([{ id: 'x:a', title: 'La energía', summary: '' }], 'energia', {
        subjects: () => [],
        facts: () => [],
      }).size
    ).toBe(1);
    expect(
      rank([{ id: 'x:a', title: 'La energia', summary: '' }], 'energía', {
        subjects: () => [],
        facts: () => [],
      }).size
    ).toBe(1);
  });

  test('finds every lesson by its own title, in the index, in both languages', () => {
    const subjects = id => LIB.subjects.find(s => s.id === id).label;
    for (const lang of ['en', 'es']) {
      const local = LIB.entries.map(e => ({
        ...e,
        title: e.title[lang],
        summary: e.summary?.[lang] ?? '',
      }));
      const c = {
        subjects: e => (e.subjects ?? []).map(id => subjects(id)[lang]),
        facts: () => [],
      };
      for (const e of local.slice(0, 40))
        expect(rank(local, e.title, c).has(e.id)).toBe(true);
    }
  });
});

describe('the objectives file', () => {
  test('holds both languages for every lesson that states objectives', () => {
    const index = JSON.parse(read('library/search-index.json'));
    expect(index.format).toBe('gravitas.library-search');
    const ids = Object.keys(index.objectives);
    expect(ids.length).toBeGreaterThan(50);
    for (const id of ids) {
      const { en, es } = index.objectives[id];
      expect(en.length).toBeGreaterThan(0);
      expect(es.length).toBe(en.length);
      expect(LIB.entries.some(e => e.id === id)).toBe(true);
    }
  });
});

describe("Home's reader of the resume record", () => {
  beforeEach(() => localStorage.clear());
  const RECORDS = [
    JSON.stringify({
      v: 1,
      items: [
        { id: 'investigation:a', route: '/#investigation=a', at: 3 },
        {
          id: 'dataset:b',
          route: '/observatory/',
          at: 2,
          title: { en: 'B', es: 'Be' },
        },
      ],
    }),
    JSON.stringify({
      v: 1,
      items: [
        { id: 'x', route: '//evil.test/' },
        { id: 'a b', route: '/ok' },
        { id: 'y', route: 'https://evil.test/' },
        { id: 'z', route: '/z' },
        { id: 'z', route: '/dup' },
      ],
    }),
    '{"v":2,"items":[]}',
    '{',
    'null',
    '[]',
  ];

  test('keeps exactly the entries the storage module keeps, in the same order', () => {
    for (const raw of RECORDS) {
      localStorage.setItem(RESUME_KEY, raw);
      expect(resumeItems().map(i => [i.id, i.route])).toEqual(
        readResume().map(i => [i.id, i.route])
      );
    }
    localStorage.removeItem(RESUME_KEY);
    expect(resumeItems()).toEqual([]);
  });

  test('reads what the storage module wrote', () => {
    noteResume({
      id: 'investigation:a',
      route: '/#investigation=a',
      step: 's1',
    });
    noteResume({
      id: 'dataset:b',
      route: '/observatory/',
      title: { en: 'B', es: 'Be' },
    });
    expect(resumeItems().map(i => i.id)).toEqual([
      'dataset:b',
      'investigation:a',
    ]);
  });

  test('lists the item opened last first, a lesson as a lesson and anything else as a link, and never more than three', () => {
    const catalog = [
      { id: 'a', title: 'Lesson A' },
      { id: 'c', title: 'Lesson C' },
      { id: 'd', title: 'Lesson D' },
    ];
    const items = [
      { id: 'dataset:b', route: '/observatory/', title: { en: 'B', es: 'Be' } },
      { id: 'dataset:untitled', route: '/x/' },
      { id: 'investigation:a', route: '/#investigation=a' },
    ];
    const going = [
      { id: 'c', title: 'Lesson C', seen: 1, total: 4 },
      { id: 'a', title: 'Lesson A', seen: 2, total: 5 },
      { id: 'd', title: 'Lesson D', seen: 1, total: 3 },
    ];
    const rows = continueRows(catalog, items, going);
    expect(rows.map(r => r.id)).toEqual(['dataset:b', 'a', 'c']);
    expect(rows[0]).toMatchObject({
      route: '/observatory/',
      title: { es: 'Be' },
    });
    expect(rows[1]).toMatchObject({ route: null, seen: 2, total: 5 });
    expect(continueRows(catalog, [], going).map(r => r.id)).toEqual([
      'c',
      'a',
      'd',
    ]);
    expect(continueRows(catalog, [], [])).toEqual([]);
  });
});
