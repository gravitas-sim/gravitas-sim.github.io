// =============================================================================
// The first week (Roadmap III Prompt 277)
// -----------------------------------------------------------------------------
// A collection may be marked `firstWeek` and say how the panels' More sections
// start (js/course/pack.js); the course home resolves it into one record
// (js/library/firstWeek.js); Home reads that record, checks it, and shows the
// list alone (js/welcome.js); the gate opens Home on a plain visit while the
// record is kept (js/welcomeGate.js); and the lesson panel's More follows the
// collection where the reader and an activity have said nothing
// (js/settingsSchema.js). The browser walk is e2e/firstWeek.spec.js.
// =============================================================================

import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, test } from '@jest/globals';
import {
  MAX_FIRST_WEEK_ITEMS,
  MORE_STATES,
  packVersion,
  validateCoursePack,
} from '../js/course/pack.js';
import { courseApi } from '../js/course/api.js';
import {
  courseLink,
  itemLink,
  readCourseFragment,
} from '../js/course/links.js';
import { entryIdOfItem } from '../js/library/format.js';
import { FIRST_WEEK_VERSION, weekRecord } from '../js/library/firstWeek.js';
import { KEY_DISCLOSURE, KEY_FIRST_WEEK } from '../js/names.js';
import { collectionOf } from '../js/storage/index.js';
import { moreOpen } from '../js/settingsSchema.js';
import {
  firstWeekText,
  hasDeepLinkDestination,
  keep,
  readWeek,
  shouldShowWelcome,
  weekStates,
} from '../js/welcome.js';
import { EN_COURSE } from '../js/i18n/en.course.js';
import { ES_COURSE } from '../js/i18n/es.course.js';

beforeEach(() => {
  localStorage.clear();
  window.location.hash = '';
});

const read = f => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
const library = JSON.parse(read('library/library.json'));
const inventory = JSON.parse(read('tools/navigation-inventory.json'));
const api = courseApi();
const problems = p => validateCoursePack(p, api).map(e => e.code);

const collection = (items, extra = {}) => ({
  format: 'gravitas.course-pack',
  formatVersion: 3,
  id: 'week-one',
  version: '1.0.0',
  gravitas: '1.0.0',
  locales: ['en'],
  pinning: 'compatible',
  profile: 'collection',
  title: { en: 'Week one' },
  units: [{ id: 'set', title: { en: 'Set' }, items }],
  ...extra,
});
const lesson = (id, extra = {}) => ({
  id: `lesson-${id}`,
  kind: 'lesson',
  lesson: id,
  ...extra,
});
const scenario = id => ({
  id: `scenario-${id}`,
  kind: 'scenario',
  scenario: id,
  seed: 'start-1',
  minutes: 10,
});
const dataset = id => ({
  id: `dataset-${id}`,
  kind: 'dataset',
  dataset: id,
  minutes: 20,
});
const LESSONS = library.entries
  .filter(e => e.format === 'lesson')
  .map(e => e.id.split(':')[1]);

const ROOT = 'https://example.test/';
const linkOf = async item => {
  const link = await itemLink(item, { root: ROOT, locale: 'en' });
  return link && link.kind !== 'external'
    ? link.href.slice(ROOT.length - 1)
    : null;
};
const record = (pack, extra = {}) =>
  weekRecord(pack, {
    linkOf,
    entries: library.entries,
    nameOf: item => item.id,
    ...extra,
  });

describe('the collection’s fields', () => {
  const items = [lesson('tides'), scenario('solar-system')];

  test('a first week is a collection marked true, and may say how More starts', () => {
    expect(problems(collection(items, { firstWeek: true }))).toEqual([]);
    for (const more of MORE_STATES)
      expect(problems(collection(items, { firstWeek: true, more }))).toEqual(
        []
      );
    expect(MORE_STATES).toEqual(['open', 'shut']);
  });

  test('the mark is `true` or absent, and only a collection carries it', () => {
    for (const firstWeek of [false, 1, 'yes', null])
      expect(problems(collection(items, { firstWeek }))).toContain('firstWeek');
    const { profile: _drop, ...course } = collection([lesson('tides')], {
      firstWeek: true,
    });
    expect(problems(course)).toContain('firstWeek');
  });

  test('`more` is 167’s two words, on a first week only', () => {
    expect(
      problems(collection(items, { firstWeek: true, more: 'ajar' }))
    ).toEqual(['more']);
    // Without the mark nothing would read it: refused, never ignored.
    expect(problems(collection(items, { more: 'shut' }))).toEqual(['more']);
  });

  test('a first week holds the committed number of items, and no reading', () => {
    expect(MAX_FIRST_WEEK_ITEMS).toBe(inventory.ceilings.home.firstWeekItems);
    const many = n => LESSONS.slice(0, n).map(id => lesson(id));
    expect(
      problems(collection(many(MAX_FIRST_WEEK_ITEMS), { firstWeek: true }))
    ).toEqual([]);
    expect(
      problems(collection(many(MAX_FIRST_WEEK_ITEMS + 1), { firstWeek: true }))
    ).toEqual(['firstWeekItems']);
    // A collection that is not a first week still holds as many as it did.
    expect(problems(collection(many(MAX_FIRST_WEEK_ITEMS + 1)))).toEqual([]);
    const reading = {
      id: 'reading-one',
      kind: 'reading',
      title: { en: 'A chapter' },
      minutes: 20,
      access: 'open',
      cite: {
        authors: 'A. Author',
        year: 2020,
        source: 'A book',
        url: 'https://example.org/chapter',
      },
    };
    expect(problems(collection([lesson('tides'), reading]))).toEqual([]);
    expect(
      problems(collection([lesson('tides'), reading], { firstWeek: true }))
    ).toEqual(['firstWeekItems']);
  });

  test('every refusal has its sentence in both languages', () => {
    for (const code of ['firstWeek', 'more', 'firstWeekItems']) {
      expect(EN_COURSE[`course.error.${code}`]).toEqual(expect.any(String));
      expect(ES_COURSE[`course.error.${code}`]).toEqual(expect.any(String));
    }
  });

  test('it is written as /3 and travels whole in the course home link', async () => {
    const pack = collection(items, { firstWeek: true, more: 'shut' });
    expect(packVersion(pack)).toBe(3);
    const link = await courseLink(pack, { root: ROOT });
    expect(link.url).toMatch(/\/course\/#c3z/);
    const back = await readCourseFragment(`#${link.url.split('#')[1]}`);
    expect(back).toMatchObject({ firstWeek: true, more: 'shut' });
    expect(problems(back)).toEqual([]);
  });

  test('the schema names both fields as the reader holds them', () => {
    const schema = JSON.parse(
      read('sdk/schemas/course-pack-3.schema.json')
    ).properties;
    expect(schema.firstWeek.const).toBe(true);
    expect(schema.more.enum).toEqual([...MORE_STATES]);
  });
});

describe('the record the course home leaves', () => {
  const pack = collection(
    [
      lesson('tides', { depth: 'quantitative' }),
      scenario('solar-system'),
      dataset('tess-light-curve'),
    ],
    { firstWeek: true, more: 'shut', title: { en: 'Week one', es: 'Semana' } }
  );

  test('is the list as Home needs it: titles, addresses from the root, steps', async () => {
    const r = await record(pack);
    const tides = library.entries.find(e => e.id === 'investigation:tides');
    expect(r).toEqual({
      v: FIRST_WEEK_VERSION,
      id: 'week-one',
      t: { en: 'Week one', es: 'Semana' },
      mo: 'shut',
      items: [
        {
          t: tides.title,
          h: '/#investigation=tides/quantitative',
          l: 'tides',
          d: 'quantitative',
          n: tides.steps,
        },
        {
          t: library.entries.find(e => e.id === 'scenario:solar-system').title,
          h: expect.stringMatching(/^\/#\d+[zr]/),
        },
        {
          t: library.entries.find(e => e.id === 'dataset:tess-light-curve')
            .title,
          h: '/observatory/?open=tess-light-curve',
        },
      ],
    });
    expect(tides.steps).toBeGreaterThan(0);
  });

  test('is what Home’s reader accepts, as it is', async () => {
    const r = await record(pack);
    expect(readWeek(JSON.stringify(r))).toEqual(r);
  });

  test('names an item the Library does not list by what the page calls it, and leaves out one with no address here', async () => {
    const r = await record(
      collection([lesson('not-a-lesson'), scenario('solar-system')], {
        firstWeek: true,
      }),
      {
        nameOf: () => 'Its name',
        linkOf: async item => (item.kind === 'scenario' ? null : '/#x'),
      }
    );
    expect(r.items).toEqual([
      { t: { en: 'Its name' }, h: '/#x', l: 'not-a-lesson', n: 0 },
    ]);
    expect('mo' in r).toBe(false);
    expect(
      await record(collection([scenario('solar-system')]), {
        linkOf: async () => null,
      })
    ).toBeNull();
  });

  test('keeps what was opened when the same collection’s link is followed again, and not another’s', async () => {
    const first = await record(pack);
    first.items[1].o = 1;
    const again = await record(pack, { had: first });
    expect(again.items.map(i => i.o)).toEqual([undefined, 1, undefined]);
    const other = await record(pack, { had: { ...first, id: 'another' } });
    expect(other.items.some(i => i.o)).toBe(false);
    // A damaged record is no record.
    expect((await record(pack, { had: { id: 'week-one' } })).items).toEqual(
      (await record(pack)).items
    );
  });

  test('its entry ids are the Library’s', () => {
    const source = read('js/library/firstWeek.js');
    for (const item of [
      lesson('tides'),
      scenario('solar-system'),
      dataset('tess-light-curve'),
      { id: 'guide-x', kind: 'guide', guide: 'x' },
    ]) {
      const id = entryIdOfItem(item);
      expect(source).toContain(`${item.kind}: '${id.split(':')[0]}'`);
    }
  });

  test('the module imports nothing, so the course home’s bundle is not split', () => {
    expect(read('js/library/firstWeek.js')).not.toMatch(/^import |\bimport\(/m);
  });

  test('is a preference of its own key, in a backup only when ticked', () => {
    expect(KEY_FIRST_WEEK).toBe('gravitas_first_week');
    expect(collectionOf(KEY_FIRST_WEEK)).toBe('preferences');
  });
});

describe('Home’s reader trusts nothing it is handed', () => {
  const good = {
    v: 1,
    id: 'w',
    t: { en: 'Week one' },
    items: [
      { t: { en: 'Tides' }, h: '/#investigation=tides', l: 'tides', n: 9 },
    ],
  };
  const withItem = change => ({
    ...good,
    items: [{ ...good.items[0], ...change }],
  });

  test('a good record reads; nothing, text that is not JSON and another version do not', () => {
    expect(readWeek(JSON.stringify(good))).toEqual(good);
    expect(readWeek(null)).toBeNull();
    expect(readWeek('{"v":1')).toBeNull();
    expect(readWeek(JSON.stringify({ ...good, v: 2 }))).toBeNull();
    expect(readWeek(JSON.stringify([good]))).toBeNull();
  });

  test('an address must be on this site', () => {
    for (const h of [
      '//elsewhere.example/',
      'https://elsewhere.example/',
      'javascript:alert(1)',
      '/\\elsewhere.example',
      '/a b',
      '',
      7,
      `/${'x'.repeat(4000)}`,
    ])
      expect({ h, read: readWeek(JSON.stringify(withItem({ h }))) }).toEqual({
        h,
        read: null,
      });
  });

  test('titles are short text, a lesson id is an id, and the list is one to seven', () => {
    expect(readWeek(JSON.stringify({ ...good, t: {} }))).toBeNull();
    expect(
      readWeek(JSON.stringify({ ...good, t: { en: 'x'.repeat(121) } }))
    ).toBeNull();
    expect(readWeek(JSON.stringify(withItem({ t: { en: '' } })))).toBeNull();
    expect(readWeek(JSON.stringify(withItem({ t: 'Tides' })))).toBeNull();
    expect(readWeek(JSON.stringify(withItem({ l: 'a/b' })))).toBeNull();
    expect(readWeek(JSON.stringify(withItem({ d: 'core/x' })))).toBeNull();
    expect(
      readWeek(JSON.stringify(withItem({ d: 'quantitative' })))
    ).not.toBeNull();
    expect(readWeek(JSON.stringify({ ...good, items: [] }))).toBeNull();
    expect(readWeek(JSON.stringify({ ...good, items: {} }))).toBeNull();
    const many = n => ({
      ...good,
      items: Array.from({ length: n }, () => good.items[0]),
    });
    expect(readWeek(JSON.stringify(many(MAX_FIRST_WEEK_ITEMS)))).not.toBeNull();
    expect(readWeek(JSON.stringify(many(MAX_FIRST_WEEK_ITEMS + 1)))).toBeNull();
  });

  test('Home writes no title as markup', () => {
    // Titles reach the page as text nodes; the module builds no HTML from them.
    const source = read('js/welcome.js');
    const week = source.slice(
      source.indexOf('// --- The first week'),
      source.indexOf('/** Put the sections in place')
    );
    expect(week.length).toBeGreaterThan(1000);
    expect(week).not.toMatch(/innerHTML|insertAdjacentHTML|outerHTML/);
  });
});

describe('where a first week stands', () => {
  const week = {
    v: 1,
    t: { en: 'W' },
    items: [
      { t: { en: 'A' }, h: '/#investigation=a', l: 'a', n: 5 },
      { t: { en: 'B' }, h: '/#2zabc' },
      { t: { en: 'C' }, h: '/#investigation=c', l: 'c', n: 3 },
    ],
  };
  const states = (saved, opened = []) =>
    weekStates(
      {
        ...week,
        items: week.items.map((i, n) =>
          opened.includes(n) ? { ...i, o: 1 } : i
        ),
      },
      id => saved[id]
    );

  test('nothing begun: the first item is the one to start', () => {
    expect(states({})).toEqual({ on: true, states: ['start', '', ''] });
  });

  test('a lesson begun and not finished is the one to continue', () => {
    expect(states({ a: { seen: 2 } })).toEqual({
      on: true,
      states: ['next', '', ''],
    });
  });

  test('a lesson is done when every step was seen; anything else once opened', () => {
    expect(states({ a: { seen: 5 } })).toEqual({
      on: true,
      states: ['done', 'next', ''],
    });
    expect(states({ a: { seen: 6 } }, [1])).toEqual({
      on: true,
      states: ['done', 'opened', 'next'],
    });
  });

  test('the place to continue is the first item not done, whatever was done after it', () => {
    expect(states({ c: { seen: 3 } }, [1])).toEqual({
      on: true,
      states: ['start', 'opened', 'done'],
    });
  });

  test('every item done: the mode is over', () => {
    expect(states({ a: { seen: 5 }, c: { seen: 3 } }, [1]).on).toBe(false);
  });

  test('a lesson with no step count is never called done', () => {
    const r = weekStates(
      { ...week, items: [{ t: { en: 'A' }, h: '/#x', l: 'a', n: 0 }] },
      () => ({ seen: 99 })
    );
    expect(r).toEqual({ on: true, states: ['next'] });
  });
});

describe('the gate', () => {
  test('Home opens on a plain visit while a first week is kept, and not otherwise', () => {
    expect(shouldShowWelcome({ hash: '', seen: true })).toBe(false);
    keep(KEY_FIRST_WEEK, '{"v":1}');
    expect(firstWeekText()).toBe('{"v":1}');
    expect(shouldShowWelcome({ hash: '', seen: true })).toBe(true);
    keep(KEY_FIRST_WEEK, null);
    expect(firstWeekText()).toBeNull();
    expect(shouldShowWelcome({ hash: '', seen: true })).toBe(false);
    expect(shouldShowWelcome({ hash: '', seen: true, week: true })).toBe(true);
  });

  test('an item of the list is a deep link, so Home never covers it', () => {
    for (const hash of [
      '#investigation=tides',
      '#investigation=tides/quantitative',
      '#2zabc',
    ]) {
      expect(hasDeepLinkDestination(hash)).toBe(true);
      expect(shouldShowWelcome({ hash, seen: true, week: true })).toBe(false);
    }
    expect(hasDeepLinkDestination('#investigation=tides/')).toBe(false);
    expect(hasDeepLinkDestination('#investigation=tides/a/b')).toBe(false);
  });

  test('storage that throws is no first week, and nothing breaks', () => {
    const real = Object.getOwnPropertyDescriptor(window, 'localStorage');
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get() {
        throw new DOMException('denied', 'SecurityError');
      },
    });
    try {
      expect(firstWeekText()).toBeNull();
      expect(() => keep(KEY_FIRST_WEEK, 'x')).not.toThrow();
      expect(readWeek()).toBeNull();
    } finally {
      Object.defineProperty(window, 'localStorage', real);
    }
  });
});

describe('the panels’ More, for a first week’s students', () => {
  const inWeek = mo =>
    localStorage.setItem(
      KEY_FIRST_WEEK,
      JSON.stringify({ v: 1, ...(mo ? { mo } : {}) })
    );

  test('follows the collection on the lesson and instrument panels', () => {
    for (const surface of ['lesson', 'tool']) {
      inWeek('open');
      expect(moreOpen(surface, 'core')).toBe(true);
      inWeek('shut');
      expect(moreOpen(surface, 'advanced')).toBe(false);
    }
  });

  test('a collection that says nothing leaves the depth’s default', () => {
    inWeek();
    expect(moreOpen('lesson', 'core')).toBe(false);
    expect(moreOpen('lesson', 'advanced')).toBe(true);
    localStorage.setItem(KEY_FIRST_WEEK, '{"v":1,"mo":"ajar"}');
    expect(moreOpen('lesson', 'core')).toBe(false);
    localStorage.setItem(KEY_FIRST_WEEK, '{"v":1');
    expect(moreOpen('lesson', 'advanced')).toBe(true);
  });

  test('never reaches Settings or a plot', () => {
    inWeek('open');
    expect(moreOpen('settings', 'core')).toBe(false);
    expect(moreOpen('plot', 'core')).toBe(false);
  });

  test('an activity’s own choice comes before the collection’s, and the reader’s before both', () => {
    inWeek('open');
    expect(moreOpen('lesson', 'core', 'shut')).toBe(false);
    inWeek('shut');
    expect(moreOpen('lesson', 'core', 'open')).toBe(true);
    localStorage.setItem(KEY_DISCLOSURE, JSON.stringify({ lesson: 1 }));
    expect(moreOpen('lesson', 'core')).toBe(true);
    inWeek('open');
    localStorage.setItem(KEY_DISCLOSURE, JSON.stringify({ lesson: 0 }));
    expect(moreOpen('lesson', 'core')).toBe(false);
  });
});

describe('Home’s markup for the mode', () => {
  const home = read('js/fragments/home.html');

  test('the five names are the inventory’s, each a link to its destination', () => {
    const block =
      /<!-- destinations:week -->([\s\S]*?)<!-- \/destinations:week -->/.exec(
        home
      )[1];
    const links = [...block.matchAll(/<a href="([^"]*)"/g)].map(m => m[1]);
    expect(links).toEqual(inventory.destinations.map(d => d.first.path));
    for (const d of inventory.destinations) {
      expect(block).toContain(`>${d.en}<`);
      expect(block).toContain(`>${d.es}<`);
    }
  });

  test('the introduction’s second screen says each destination’s line and its one action', () => {
    const block =
      /<!-- destinations:orient -->([\s\S]*?)<!-- \/destinations:orient -->/.exec(
        home
      )[1];
    expect(block.match(/<li>/g)).toHaveLength(inventory.destinations.length);
    const text = s => s.replace(/&amp;/g, '&');
    for (const d of inventory.destinations)
      for (const words of [
        d.en,
        d.es,
        d.says.en,
        d.says.es,
        d.first.en,
        d.first.es,
      ])
        expect(text(block)).toContain(words);
    // One action each, and no more.
    expect(block.match(/<a /g)).toHaveLength(inventory.destinations.length);
  });

  test('the introduction is three screens, each with a way on, and the skip is still there', () => {
    expect(home.match(/data-orient="\d"/g)).toHaveLength(3);
    expect(home).toContain('of 3');
    expect(home.match(/data-orient-act="skip"/g)).toHaveLength(2);
    expect(home.match(/data-orient-act="next"/g)).toHaveLength(2);
    expect(home.match(/data-orient-act="done"/g)).toHaveLength(1);
    expect(home).not.toContain('Three ways in');
  });

  test('the item template has every state the module names, in both languages', () => {
    const template = /<template>([\s\S]*?)<\/template>/.exec(home)[1];
    const whens = [...template.matchAll(/data-when="(\w+)"/g)].map(m => m[1]);
    expect(whens.sort()).toEqual(['done', 'first', 'next', 'opened', 'start']);
    expect(template.match(/class="gs-en"/g)).toHaveLength(5);
    expect(template.match(/class="gs-es" lang="es"/g)).toHaveLength(5);
  });

  test('leaving is one control, and the module implements it', () => {
    expect(home.match(/data-action="leave"/g)).toHaveLength(1);
    expect(read('js/welcome.js')).toContain("case 'leave'");
  });
});
