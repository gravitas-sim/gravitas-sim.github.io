// =============================================================================
// The printable activity list and the outcome matrix (Roadmap III Prompt 174)
// -----------------------------------------------------------------------------
// js/instructorPlan.js, its words and its panel, against every built-in course
// in both languages:
//
//   - a plan comes out of every built-in course, in HTML and Markdown, with
//     every unit, every item, every link, a band for every item, the
//     investigation's own objectives, the textbook chapter and the label that
//     says the times are editorial estimates;
//   - a unit's time is the sum of its core items' bands, the course's the sum
//     of the units', and an optional item is kept out of both;
//   - what students hand in is a lab report for an investigation, an activity
//     cut from one and an investigation pack, and nothing for the rest;
//   - the instructor's outcomes are checked by the package's reader (an unknown
//     outcome, a duplicate, a mapping with no outcomes, a collection) and the
//     matrix is items by outcomes through the objectives, never claiming
//     attainment, and says which outcome nothing serves;
//   - a hostile text cannot put markup in the page, a link that is not http(s)
//     is not a link, and Markdown's own characters are escaped;
//   - the two tables of words have the same ids and the same slots;
//   - the panel draws, prints alone, saves and edits through the page's callback.
// =============================================================================

import './galacticFetch.js';
import { describe, test, expect, beforeAll, jest } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { URL } from 'node:url';

import { BUILTIN_COURSES } from '../js/data/courses/index.js';
import {
  LEVEL_DEPTH,
  MAX_OUTCOMES,
  itemsOf,
  lessonKeyOf,
  validateCoursePack,
} from '../js/course/pack.js';
import { estimate, shortHash, textsOf } from '../js/course/review.js';
import { LESSONS, courseApi, courseFacts } from '../js/course/api.js';
import { courseLink, itemLink } from '../js/course/links.js';
import { loadInvestigation } from '../js/data/investigations/registry.js';
import {
  BANDS,
  STATEMENT,
  bandOfMinutes,
} from '../js/data/instructorTimeBands.js';
import {
  buildPlan,
  fileName,
  keyOf,
  rangeText,
  toHtml,
  toMarkdown,
} from '../js/instructorPlan.js';
import { WORDS, tr } from '../js/instructorPlanText.js';
import { openPlanPanel, printHtml } from '../js/instructorPlanView.js';
import { itemTitle, linksOf, manifestLike } from '../js/instructorCartridge.js';

const { document } = globalThis;
const ROOT = 'https://gravitas-sim.online/';
const read = p => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const COURSES = Object.keys(BUILTIN_COURSES);
const LOCALES = ['en', 'es'];
const library = JSON.parse(read('library/library.json'));
const ENTRIES = new Map(library.entries.map(e => [e.id, e]));
const CARDS = new Map(LESSONS.map(c => [c.id, c]));

/** Everything a plan reads of a pack: facts, links, and the investigations' own objectives. */
async function context(pack, locale) {
  const facts = await courseFacts(pack, {
    load: id => loadInvestigation(id, 'en'),
  });
  const made = await linksOf(pack, {
    itemsOf,
    itemLink,
    courseLink,
    root: ROOT,
  });
  const links = manifestLike(pack, made, estimate(pack, facts), itemsOf);
  const own = new Map();
  for (const { item } of itemsOf(pack))
    if (item.lesson && !own.has(item.lesson))
      own.set(
        item.lesson,
        (await loadInvestigation(item.lesson, locale)).objectives || []
      );
  return {
    locale,
    lib: { itemsOf },
    facts,
    links,
    name: item => itemTitle(item, facts, locale),
    cards: CARDS,
    own,
    entries: ENTRIES,
  };
}

const packs = new Map();
const plans = new Map();
beforeAll(async () => {
  for (const id of COURSES) {
    const pack = await BUILTIN_COURSES[id]();
    packs.set(id, pack);
    for (const locale of LOCALES)
      plans.set(
        `${id}/${locale}`,
        buildPlan(pack, await context(pack, locale))
      );
  }
}, 180_000);

describe.each(COURSES)('the built-in course %s', id => {
  test.each(LOCALES)(
    '%s: every item is in the plan, in order, with its link and a band',
    locale => {
      const pack = packs.get(id);
      const plan = plans.get(`${id}/${locale}`);
      const items = plan.units.flatMap(u => u.items);
      expect(plan.units.map(u => u.id)).toEqual(pack.units.map(u => u.id));
      expect(items.map(i => i.id)).toEqual(itemsOf(pack).map(x => x.item.id));
      for (const i of items) {
        expect(i.link).toMatch(/^https:\/\//);
        expect(i.time).not.toBeNull();
        expect(i.time.lo).toBe(BANDS[i.time.band].lo);
        expect(i.time.hi).toBe(BANDS[i.time.band].hi);
        expect(i.timeText).toContain(`${i.time.lo}–${i.time.hi} min`);
      }
      // Every lesson item names the investigation's own objectives, in the language asked.
      for (const i of items.filter(x => x.kind === 'lesson')) {
        expect(i.own.length).toBeGreaterThan(0);
        expect(i.chapter).toMatch(/OpenStax Astronomy 2e/);
      }
    }
  );

  test.each(LOCALES)(
    '%s: a unit’s time is its core items’ bands summed, and optional items stay out',
    locale => {
      const plan = plans.get(`${id}/${locale}`);
      let lo = 0;
      let hi = 0;
      for (const u of plan.units) {
        const core = u.items.filter(i => i.path === 'core');
        const opt = u.items.filter(i => i.path !== 'core');
        expect(u.core).toEqual({
          lo: core.reduce((n, i) => n + i.time.lo, 0),
          hi: core.reduce((n, i) => n + i.time.hi, 0),
        });
        expect(u.optional).toEqual({
          lo: opt.reduce((n, i) => n + i.time.lo, 0),
          hi: opt.reduce((n, i) => n + i.time.hi, 0),
        });
        lo += u.core.lo;
        hi += u.core.hi;
      }
      expect(plan.total).toEqual({ lo, hi });
    }
  );

  test.each(LOCALES)(
    '%s: the HTML and the Markdown carry the label, every link and every unit',
    locale => {
      const plan = plans.get(`${id}/${locale}`);
      const html = toHtml(plan, { document: true });
      const md = toMarkdown(plan);
      // Markdown escapes its own characters: compare what it says unescaped.
      const unescaped = md.replace(/\\([\\*_[\]`|])/g, '$1');
      for (const text of [html.replace(/&amp;/g, '&'), unescaped]) {
        expect(text).toContain(STATEMENT[locale]);
        for (const u of plan.units) {
          expect(text).toContain(u.title);
          for (const i of u.items) expect(text).toContain(i.name);
        }
        expect(text).toContain(tr(locale, 'doc.handin'));
        expect(text).toContain(tr(locale, 'doc.out.none'));
      }
      // The page keeps long links whole in the attribute and says so.
      for (const i of plan.units.flatMap(u => u.items))
        expect(md).toContain(`<${i.link}>`);
      expect(html).toMatch(/^<!doctype html>\n<html lang="/);
      expect(html).toContain('@media print');
      expect(html).not.toMatch(/<script|onerror|javascript:/i);
      // The Markdown carries the same item count of headings as the plan has items.
      expect(md.match(/^#### /gm)).toHaveLength(
        plan.units.reduce((n, u) => n + u.items.length, 0)
      );
    }
  );

  test('what students hand in is a report for an investigation or an activity cut from one, and nothing else', () => {
    const plan = plans.get(`${id}/en`);
    const kinds = new Map(
      itemsOf(packs.get(id)).map(x => [x.item.id, x.item.kind])
    );
    const reports = new Set(plan.handIn.map(h => kinds.get(h.id)));
    for (const k of reports)
      expect(['lesson', 'assignment', 'pack']).toContain(k);
    const without = [...kinds].filter(
      ([, k]) => !['lesson', 'assignment', 'pack'].includes(k)
    );
    expect(plan.nothing).toHaveLength(without.length);
    expect(plan.handIn.length + plan.nothing.length).toBe(kinds.size);
  });
});

describe('the language of the plan', () => {
  test('a Spanish plan reads Spanish where the course has it', () => {
    const en = plans.get('intro-astronomy/en');
    const es = plans.get('intro-astronomy/es');
    expect(es.title).not.toBe(en.title);
    expect(es.units[0].title).not.toBe(en.units[0].title);
    expect(toMarkdown(es)).toContain('Lista de actividades');
    expect(toHtml(es)).toContain('lang="es"');
  });

  test('the file names say the course and the language', () => {
    const pack = packs.get('intro-astronomy');
    expect(fileName(pack, 'es', 'md')).toBe(
      'intro-astronomy.activity-list.es.md'
    );
  });

  test('the two tables of words have the same ids and the same slots', () => {
    expect(Object.keys(WORDS.es).sort()).toEqual(Object.keys(WORDS.en).sort());
    const slots = s => [...s.matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort();
    for (const id of Object.keys(WORDS.en))
      expect([id, slots(WORDS.es[id])]).toEqual([id, slots(WORDS.en[id])]);
    expect(tr('fr', 'p.h')).toBe(WORDS.en['p.h']);
    expect(tr('en', 'no.such')).toBe('no.such');
  });

  test('the words never claim a measurement or an attainment', () => {
    for (const locale of LOCALES)
      for (const [id, text] of Object.entries(WORDS[locale]))
        expect([id, text]).not.toEqual([
          id,
          expect.stringMatching(
            /\b(median|mediana|measured time|tiempo medido)\b/i
          ),
        ]);
    expect(WORDS.en['doc.out.lede']).toMatch(
      /not evidence that any student attained/
    );
    expect(WORDS.es['doc.out.lede']).toMatch(
      /No es evidencia de que ningún estudiante/
    );
  });

  test('the copies of the package reader’s tables are the reader’s', () => {
    for (const [level, depth] of Object.entries(LEVEL_DEPTH))
      expect(buildDepth(level)).toBe(depth);
    for (const { item } of itemsOf(packs.get('observing-lab')))
      expect(keyOf(item)).toBe(lessonKeyOf(item));
    expect(keyOf({ kind: 'pack', pack: 'my-pack', version: '1.2.0' })).toBe(
      lessonKeyOf({ kind: 'pack', pack: 'my-pack', version: '1.2.0' })
    );
  });
});

/** The depth an item of a course of that level reads at, as the plan has it. */
function buildDepth(courseLevel) {
  const pack = {
    courseLevel,
    units: [
      {
        id: 'u',
        title: { en: 'U' },
        items: [{ id: 'a', kind: 'lesson', lesson: 'keplers-laws' }],
      },
    ],
  };
  const facts = { lessons: new Map() };
  const links = { items: [{ id: 'a', links: { en: 'https://example.org/' } }] };
  return buildPlan(pack, {
    locale: 'en',
    lib: { itemsOf },
    facts,
    links,
    name: i => i.id,
  }).units[0].items[0].depth;
}

describe('the outcomes', () => {
  const api = courseApi();
  const course = () => {
    const c = JSON.parse(JSON.stringify(packs.get('intro-astronomy')));
    c.outcomes = [
      {
        id: 'orbits',
        text: {
          en: 'Explain how orbits work',
          es: 'Explicar cómo funcionan las órbitas',
          esOf: shortHash('Explain how orbits work'),
        },
      },
      {
        id: 'never',
        text: {
          en: 'Outcome nothing serves',
          es: 'Un resultado al que nada sirve',
          esOf: shortHash('Outcome nothing serves'),
        },
      },
    ];
    c.objectives[0].outcomes = ['orbits'];
    return c;
  };
  const problems = c =>
    validateCoursePack(c, api).map(p => `${p.path}:${p.code}`);

  test('a package with outcomes and a mapping is valid, and one without them still is', () => {
    expect(problems(course())).toEqual([]);
    expect(problems(packs.get('intro-astronomy'))).toEqual([]);
  });

  test.each([
    [
      'an outcome the course does not have',
      c => (c.objectives[0].outcomes = ['nope']),
      'objectives[0].outcomes[0]:outcome',
    ],
    [
      'an outcome twice in one mapping',
      c => (c.objectives[0].outcomes = ['orbits', 'orbits']),
      'objectives[0].outcomes:outcomes',
    ],
    [
      'an empty mapping',
      c => (c.objectives[0].outcomes = []),
      'objectives[0].outcomes:outcomes',
    ],
    [
      'a duplicate outcome id',
      c => (c.outcomes[1].id = 'orbits'),
      'outcomes[1].id:duplicate',
    ],
    [
      'an outcome with no words',
      c => (c.outcomes[0].text = {}),
      'outcomes[0].text.en:textMissing',
    ],
    [
      'markup in an outcome',
      c => (c.outcomes[0].text.en = '<b>x</b>'),
      'outcomes[0].text.en:plain',
    ],
    [
      'a field an outcome does not have',
      c => (c.outcomes[0].weight = 3),
      'outcomes[0].weight:field',
    ],
    [
      'more outcomes than the limit',
      c => {
        c.outcomes = Array.from({ length: MAX_OUTCOMES + 1 }, (_, i) => ({
          id: `o-${i}`,
          text: { en: `Outcome ${i}` },
        }));
        delete c.objectives[0].outcomes;
      },
      'outcomes:count',
    ],
    [
      'a mapping with no outcomes in the course',
      c => {
        delete c.outcomes;
      },
      'objectives[0].outcomes[0]:outcome',
    ],
  ])('refuses %s', (_name, mutate, expected) => {
    const c = course();
    mutate(c);
    expect(problems(c)).toContain(expected);
  });

  test('a collection has no outcomes', () => {
    const c = {
      ...course(),
      profile: 'collection',
      units: [course().units[0]],
    };
    expect(problems(c)).toContain('outcomes:collectionField');
  });

  test('the Spanish of an outcome is tracked with the rest of the texts', () => {
    expect(textsOf(course()).map(t => t.path)).toEqual(
      expect.arrayContaining(['outcomes[0].text', 'outcomes[1].text'])
    );
  });

  test('the matrix is items by outcomes through the objectives, and says what is not served', async () => {
    const pack = course();
    const plan = buildPlan(pack, await context(pack, 'en'));
    const m = plan.matrix;
    expect(m.outcomes.map(o => o.id)).toEqual(['orbits', 'never']);
    const served = new Set(
      itemsOf(pack)
        .filter(x => (x.item.objectives || []).includes(pack.objectives[0].id))
        .map(x => x.item.id)
    );
    expect(served.size).toBeGreaterThan(0);
    const names = new Map(
      plan.units.flatMap(u => u.items.map(i => [`${u.title}: ${i.name}`, i]))
    );
    for (const r of m.rows) {
      const i = names.get(`${r.unit}: ${r.item}`);
      expect(r.cells).toEqual([served.has(i.id), false]);
    }
    expect(m.rows.some(r => r.cells[0])).toBe(true);
    expect(m.unserved).toEqual(['Outcome nothing serves']);
    expect(m.mapping[0]).toMatchObject({ n: 1, outcomes: [1] });
    expect(m.mapping[1].outcomes).toEqual([]);
    // Items that name no objective are listed, not silently scored as zero.
    const bare = itemsOf(pack).filter(x => !(x.item.objectives || []).length);
    expect(m.unmapped).toHaveLength(bare.length);
    const md = toMarkdown(plan);
    expect(md).toMatch(/\| x \|/);
    expect(md).toContain(tr('en', 'doc.out.lede'));
    expect(md).toContain(
      tr('en', 'doc.out.unserved', { names: 'Outcome nothing serves' })
    );
    const html = toHtml(plan);
    expect(html).toContain('class="plan-yes"');
    expect(html).toContain(tr('en', 'doc.out.lede'));
    // Spanish: the outcome texts in Spanish.
    const es = buildPlan(pack, await context(pack, 'es'));
    expect(es.outcomes[0].text).toBe('Explicar cómo funcionan las órbitas');
    expect(es.matrix.unserved).toEqual(['Un resultado al que nada sirve']);
  });
});

describe('what the page is made of', () => {
  const pack = () => ({
    id: 'hostile',
    title: { en: '<img src=x onerror=alert(1)> & "quotes"' },
    summary: { en: 'a | b * c _d_ [e] `f`' },
    units: [
      {
        id: 'u',
        title: { en: 'Unit <b>one</b>' },
        items: [
          {
            id: 'a',
            kind: 'reading',
            minutes: 12,
            title: { en: 'R <i>x</i>' },
          },
        ],
      },
    ],
  });
  const make = href =>
    buildPlan(pack(), {
      locale: 'en',
      lib: { itemsOf },
      facts: { lessons: new Map() },
      links: {
        course: { home: href },
        items: [{ id: 'a', links: { en: href } }],
      },
      name: i => i.title.en,
    });

  test('markup in a text is text', () => {
    const html = toHtml(make('https://example.org/x'), { document: true });
    expect(html).not.toContain('<img');
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(html).toContain('&amp; &quot;quotes&quot;');
    expect(html).toContain('Unit &lt;b&gt;one&lt;/b&gt;');
  });

  test('only an http or https address is a link', () => {
    expect(toHtml(make('https://example.org/x'))).toContain(
      '<a href="https://example.org/x">'
    );
    const bad = toHtml(make('javascript:alert(1)'));
    expect(bad).not.toContain('<a href="javascript');
  });

  test('a link too long to print is a word on the page and whole in the Markdown', () => {
    const long = `https://example.org/${'a'.repeat(300)}`;
    const plan = make(long);
    const html = toHtml(plan);
    expect(html).toContain(`<a href="${long}">Open</a>`);
    expect(html).toContain(tr('en', 'doc.longlink'));
    expect(toMarkdown(plan)).toContain(`<${long}>`);
  });

  test('Markdown’s own characters are escaped', () => {
    const md = toMarkdown(make('https://example.org/x'));
    expect(md).toContain('a | b \\* c \\_d\\_ \\[e\\] \\`f\\`');
  });

  test('a time is a band, an item with no minutes says it is not estimated', () => {
    const plan = buildPlan(
      {
        ...pack(),
        units: [
          {
            id: 'u',
            title: { en: 'U' },
            items: [{ id: 'a', kind: 'dataset', dataset: 'x' }],
          },
        ],
      },
      {
        locale: 'en',
        lib: { itemsOf },
        facts: { lessons: new Map() },
        links: { items: [] },
        name: i => i.id,
      }
    );
    expect(plan.units[0].items[0].time).toBeNull();
    expect(plan.units[0].items[0].timeText).toBe(tr('en', 'b.none'));
    expect(plan.units[0].core).toEqual({ lo: 0, hi: 0 });
    expect(rangeText({ lo: 3, hi: 4 }, 'es')).toBe('3–4 min');
    expect(bandOfMinutes(12)).toBe('short');
  });
});

describe('the panel', () => {
  jest.setTimeout(30_000);
  async function open(extra = {}) {
    const pack = JSON.parse(JSON.stringify(packs.get('observing-lab')));
    const facts = await courseFacts(pack, {
      load: id => loadInvestigation(id, 'en'),
    });
    const made = await linksOf(pack, {
      itemsOf,
      itemLink,
      courseLink,
      root: ROOT,
    });
    const manifest = manifestLike(pack, made, estimate(pack, facts), itemsOf);
    document.body.innerHTML = '<section id="host" hidden></section>';
    const host = document.getElementById('host');
    let locale = 'en';
    const panel = openPlanPanel({
      host,
      source: () => pack,
      manifest: () => manifest,
      facts: async () => facts,
      lib: { itemsOf },
      nameOf: (p, id) =>
        itemTitle(itemsOf(p).find(x => x.item.id === id).item, facts, locale),
      load: (id, l) => loadInvestigation(id, l),
      entries: async () => ENTRIES,
      cards: CARDS,
      locale: () => locale,
      shortHash,
      ...extra,
    });
    const settle = async () => {
      for (
        let i = 0;
        i < 400 && !host.querySelector('#plan-preview article');
        i++
      )
        await new Promise(r => setTimeout(r, 25));
    };
    return { host, panel, pack, settle, setLocale: l => (locale = l) };
  }

  test('draws the heading, the label and the list, and offers four ways out', async () => {
    const { host, settle } = await open();
    await settle();
    expect(host.hidden).toBe(false);
    expect(host.querySelector('#plan-h').textContent).toBe(WORDS.en['p.h']);
    expect(host.querySelector('#plan-statement').textContent).toContain(
      STATEMENT.en
    );
    expect(host.querySelector('#plan-preview article')).not.toBeNull();
    for (const id of [
      'plan-print',
      'plan-html',
      'plan-md',
      'plan-copy',
      'plan-close',
    ])
      expect(host.querySelector(`#${id}`)).not.toBeNull();
    // The kit has no way to edit: no outcomes editor without the callback.
    expect(host.querySelector('#plan-outcomes')).toBeNull();
  });

  test('prints the list alone and puts the page back when printing ends', async () => {
    const { host, settle } = await open();
    await settle();
    window.print = jest.fn();
    host.querySelector('#plan-print').click();
    for (let i = 0; i < 200 && !window.print.mock.calls.length; i++)
      await new Promise(r => setTimeout(r, 25));
    expect(window.print).toHaveBeenCalledTimes(1);
    expect(document.getElementById('plan-print-root')).not.toBeNull();
    expect(document.getElementById('plan-print-style').textContent).toContain(
      '@media print'
    );
    window.dispatchEvent(new window.Event('afterprint'));
    expect(document.getElementById('plan-print-root')).toBeNull();
    expect(document.getElementById('plan-print-style')).toBeNull();
    // printHtml is the same path.
    printHtml('<p>x</p>');
    expect(window.print).toHaveBeenCalledTimes(2);
    window.dispatchEvent(new window.Event('afterprint'));
  });

  test('saves the Markdown, and copies it', async () => {
    const { host, settle } = await open();
    await settle();
    const saved = [];
    window.URL.createObjectURL = jest.fn(blob => {
      saved.push(blob);
      return 'blob:x';
    });
    window.URL.revokeObjectURL = jest.fn();
    const clicked = [];
    const click = window.HTMLAnchorElement.prototype.click;
    window.HTMLAnchorElement.prototype.click = function () {
      clicked.push(this.download);
    };
    host.querySelector('#plan-md').click();
    for (let i = 0; i < 200 && !clicked.length; i++)
      await new Promise(r => setTimeout(r, 25));
    window.HTMLAnchorElement.prototype.click = click;
    expect(clicked).toEqual(['observing-lab.activity-list.en.md']);
    expect(saved[0].type).toMatch(/markdown/);
    const written = [];
    Object.defineProperty(window.navigator, 'clipboard', {
      configurable: true,
      value: { writeText: async t => written.push(t) },
    });
    host.querySelector('#plan-copy').click();
    for (let i = 0; i < 200 && !written.length; i++)
      await new Promise(r => setTimeout(r, 25));
    expect(written[0]).toContain(STATEMENT.en);
    expect(host.querySelector('#plan-status').textContent).toMatch(
      /Copied the Markdown/
    );
  });

  test('a course with problems is not made into a list', async () => {
    const { host } = await open({ manifest: () => null });
    for (let i = 0; i < 100 && !host.querySelector('#plan-fix'); i++)
      await new Promise(r => setTimeout(r, 25));
    expect(host.querySelector('#plan-fix')).not.toBeNull();
    expect(host.querySelector('#plan-print').disabled).toBe(true);
  });

  test('the outcomes editor changes the course through the page’s callback, and maps objectives', async () => {
    const edits = [];
    let pack;
    const ctx = await open({
      edit: fn => {
        fn(pack);
        edits.push(JSON.parse(JSON.stringify(pack)));
        panel.refresh({ light: true });
      },
    });
    pack = ctx.pack;
    var { panel } = ctx;
    await ctx.settle();
    const { host } = ctx;
    host.querySelector('#plan-out-add').click();
    expect(pack.outcomes).toEqual([{ id: 'outcome-1', text: { en: '' } }]);
    // Language change redraws everything; a light refresh redraws what changed.
    panel.refresh();
    const input = host.querySelector('#plan-out-0-en');
    expect(input).not.toBeNull();
    input.value = 'Plan an observation';
    input.dispatchEvent(new window.Event('change'));
    expect(pack.outcomes[0].text.en).toBe('Plan an observation');
    panel.refresh();
    const first = host.querySelector('#plan-out-0-ob-0');
    first.checked = true;
    first.dispatchEvent(new window.Event('change'));
    expect(pack.objectives[0].outcomes).toEqual(['outcome-1']);
    first.checked = false;
    first.dispatchEvent(new window.Event('change'));
    expect(pack.objectives[0].outcomes).toBeUndefined();
    host.querySelector('#plan-out-0-remove').click();
    expect(pack.outcomes).toBeUndefined();
    expect(edits.length).toBeGreaterThanOrEqual(5);
  });
});
