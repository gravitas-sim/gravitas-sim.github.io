// =============================================================================
// The structural navigation checks (Prompt 161)
// -----------------------------------------------------------------------------
// NAVIGATION.md says five destinations; tools/navigation-inventory.json holds
// the model, the mapping of every surface into it, the ceilings and the checks
// the site fails by design. This holds the tree to them:
//
//   inventory     every page and every menu entry is a row, and the rows agree
//                 with what the pages say
//   ceilings      the shell's menu, Home's data and the Library's facets are
//                 counted against committed ceilings (the browser spec counts
//                 the choices above the fold)
//   kinds         the Library's labels and badges exist in both languages, name
//                 no subsystem and are the glossary's nouns
//   labels        one thing is named alike on every surface that names it
//   reachability  a first action is on the page it is promised on, every link
//                 lands, and every page has a path from Home
//   pending       what the site fails today, reported by tools/pending-
//                 acceptance.mjs and not a failure until Prompt 166 activates it
//
// They are structural. They do not prove that anybody understands the
// navigation; NAVIGATION.md says what would.
// =============================================================================

import { describe, test, expect as jestExpect } from '@jest/globals';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import {
  clicksFromHome,
  covers,
  fileOf,
  footerOf,
  labelDivergences,
  labelOf,
  measure,
  menuOf,
  readInventory,
  surfacesOf,
  urlOf,
  withParts,
} from '../tools/navigation.mjs';
import { NAV, WORDS, shellPages, hasShell } from '../tools/shell.mjs';
import { pages } from '../tools/csp.mjs';
import { NOUNS } from '../tools/glossary.mjs';
import { readRegistry, runPending } from '../tools/pending-acceptance.mjs';
import { ENTRY_CARDS } from '../js/data/welcome.js';
import { EN_LIBRARY } from '../js/i18n/en.library.js';
import { ES_LIBRARY } from '../js/i18n/es.library.js';

/**
 * Jest's expect takes no message; a failure here names the page, the entry or
 * the label that failed, so this adds it to whatever the matcher throws.
 */
const wrap = (matchers, message) =>
  new Proxy(matchers, {
    get(target, key) {
      const member = target[key];
      if (typeof member === 'function')
        return (...args) => {
          try {
            return member.apply(target, args);
          } catch (error) {
            error.message = `${message}\n${error.message}`;
            throw error;
          }
        };
      return member && typeof member === 'object'
        ? wrap(member, message)
        : member;
    },
  });
const expect = (value, message) =>
  message ? wrap(jestExpect(value), message) : jestExpect(value);

const REPO = path.resolve(import.meta.dirname, '..');
const read = f => readFileSync(path.join(REPO, f), 'utf8');
const inv = readInventory();
const library = JSON.parse(read('library/library.json'));
const ROLES = new Set([
  'destination',
  'tool',
  'collection',
  'authoring',
  'document',
  'diagnostic',
  'instructor',
  'content',
]);
const ids = inv.destinations.map(d => d.id);
const GROUPS = NAV.map(([key]) => key);
const measured = await measure();

describe('the inventory', () => {
  test('names five destinations, each in both languages with one line and a first action', () => {
    expect(inv.format).toBe('gravitas.navigation-inventory/1');
    expect(ids).toEqual(['explore', 'learn', 'observe', 'my-work', 'teach']);
    for (const d of inv.destinations) {
      for (const lang of ['en', 'es']) {
        expect(d[lang], `${d.id} ${lang}`).toMatch(/\S/);
        expect(d.says[lang], `${d.id} says ${lang}`).toMatch(/^[^\n]+\.$/);
        expect(d.first[lang], `${d.id} first ${lang}`).toMatch(/\S/);
      }
      expect(d.en).not.toBe(d.es);
    }
    expect(new Set(inv.destinations.map(d => d.en)).size).toBe(5);
    expect(new Set(inv.destinations.map(d => d.es)).size).toBe(5);
  });

  test("each destination's first action is on the page it is promised on", () => {
    for (const d of inv.destinations) {
      const file = fileOf(d.first.path);
      expect(file, `${d.id}: ${d.first.path} is a page`).not.toBeNull();
      const html = read(file);
      const sel = d.first.selector;
      const id = /^#([\w-]+)$/.exec(sel);
      const anchor = /^a\[href="([^"]+)"\]$/.exec(sel);
      if (id) expect(html, `${d.id}: ${sel}`).toContain(`id="${id[1]}"`);
      else if (anchor)
        expect(html, `${d.id}: ${sel}`).toContain(`href="${anchor[1]}"`);
      else
        throw new Error(`${d.id}: ${sel} is a selector the check cannot read`);
      const own = inv.surfaces.find(
        s => s.destination === d.id && s.role === 'destination'
      );
      expect(own?.path, `${d.id} has its own page`).toBe(d.first.path);
    }
  });

  test('every page of the site is one surface, and every surface exists', () => {
    const files = [...pages(), 'history/original/index.html'];
    const rowIds = inv.surfaces.map(s => s.id);
    expect(new Set(rowIds).size).toBe(rowIds.length);
    for (const f of files) {
      const rows = surfacesOf(inv, urlOf(f));
      expect(
        rows.map(r => r.id),
        `${f} needs exactly one inventory row (tools/navigation-inventory.json)`
      ).toHaveLength(1);
    }
    for (const s of inv.surfaces) {
      expect(ROLES.has(s.role), `${s.id} role`).toBe(true);
      expect([...ids, null], `${s.id} destination`).toContain(s.destination);
      expect([...GROUPS, null], `${s.id} menu`).toContain(s.menu);
      expect(s.from, `${s.id} says where it is reached from`).toMatch(/\S/);
      if (!s.path.endsWith('*'))
        expect(fileOf(s.path), `${s.id}: ${s.path}`).not.toBeNull();
      else
        expect(
          files.some(f => covers(s, urlOf(f))),
          `${s.id} covers a page`
        ).toBe(true);
    }
  });

  test('the rows agree with the shell: each menu link is a row in the group it is in', () => {
    const menu = menuOf(read('library/index.html'));
    for (const group of menu)
      for (const item of group.items) {
        const row = inv.surfaces.find(s => s.path === item.href);
        expect(
          row,
          `${item.href} (${item.en}) is an inventory row`
        ).toBeTruthy();
        expect(row.menu, `${item.href} is in the ${group.key} group`).toBe(
          group.key
        );
      }
    const linked = new Set(menu.flatMap(g => g.items.map(i => i.href)));
    for (const s of inv.surfaces)
      expect(
        linked.has(s.path),
        `${s.id} says its menu entry is ${s.menu}`
      ).toBe(s.menu !== null);
  });

  test('the kinds students see are the library kinds, and every other kind maps to one', () => {
    const { students, internal, why } = inv.kinds;
    expect([...students, ...Object.keys(internal)].sort()).toEqual(
      [...library.kinds].sort()
    );
    for (const [kind, as] of Object.entries(internal)) {
      expect(students, `${kind} is seen as`).toContain(as);
      expect(why[kind], `${kind} says why`).toMatch(/\S/);
    }
  });
});

describe('the ceilings', () => {
  test('the shell is one menu everywhere, within its ceilings', () => {
    expect(measured.menu.sameEverywhere).toBe(true);
    for (const f of shellPages().filter(p => hasShell(read(p), p)))
      expect(menuOf(read(f)), f).not.toBeNull();
    for (const [k, ceiling] of Object.entries(inv.ceilings.menu))
      expect(measured.menu[k], `menu.${k}`).toBeLessThanOrEqual(ceiling);
    expect(measured.footer.links).toBeLessThanOrEqual(
      inv.ceilings.footer.links
    );
  });

  test('Home and the Library are within theirs', () => {
    for (const [k, ceiling] of Object.entries(inv.ceilings.home))
      expect(measured.home[k], `home.${k}`).toBeLessThanOrEqual(ceiling);
    for (const [k, ceiling] of Object.entries(inv.ceilings.library))
      expect(measured.library[k], `library.${k}`).toBeLessThanOrEqual(ceiling);
  });

  test('the static ceilings are a ratchet: each is exactly what is counted today', () => {
    // Static counts are exact: the ceiling is the count, and a prompt that
    // lowers the count lowers the ceiling in the same change.
    for (const [k, ceiling] of Object.entries(inv.ceilings.menu))
      expect(ceiling, `menu.${k}`).toBe(measured.menu[k]);
    for (const [k, ceiling] of Object.entries(inv.ceilings.home))
      expect(ceiling, `home.${k}`).toBe(measured.home[k]);
    for (const [k, ceiling] of Object.entries(inv.ceilings.library))
      expect(ceiling, `library.${k}`).toBe(measured.library[k]);
    expect(inv.ceilings.footer.links).toBe(measured.footer.links);
  });

  test('every default view has both widths, and a ceiling above zero', () => {
    const views = Object.keys(inv.ceilings.defaultView);
    expect(views.sort()).toEqual(
      [
        'home',
        'home-first-visit',
        'library',
        'my-work',
        'observatory',
        'teaching',
      ].sort()
    );
    for (const v of views)
      for (const w of ['desktop', 'phone'])
        expect(inv.ceilings.defaultView[v][w], `${v} ${w}`).toBeGreaterThan(0);
  });
});

describe('the kinds the Library exposes', () => {
  const catalogs = { en: EN_LIBRARY, es: ES_LIBRARY };
  const subsystem = (text, lang) =>
    inv.subsystemWords[lang].filter(w =>
      text.toLowerCase().includes(w.toLowerCase())
    );

  test('every kind has a facet label and a type label in both languages that name no subsystem', () => {
    for (const lang of ['en', 'es'])
      for (const kind of library.kinds)
        for (const id of [`lib.kind.${kind}`, `lib.badge.${kind}`]) {
          const text = catalogs[lang][id];
          expect(text, `${id} ${lang}`).toMatch(/\S/);
          expect(subsystem(text, lang), `${id} ${lang}: "${text}"`).toEqual([]);
        }
  });

  test("a kind's type label is the glossary's noun, in both languages", () => {
    for (const noun of NOUNS.filter(n => library.kinds.includes(n.id))) {
      expect(EN_LIBRARY[`lib.badge.${noun.id}`]).toBe(noun.en[0]);
      expect(ES_LIBRARY[`lib.badge.${noun.id}`]).toBe(noun.es[0]);
    }
  });

  test('every entry has a kind the page lists and a format label, in both languages', () => {
    for (const e of library.entries) {
      expect(library.kinds, e.id).toContain(e.kind);
      for (const lang of ['en', 'es'])
        expect(
          catalogs[lang][`lib.format.${e.format}`],
          `${e.id} ${lang}`
        ).toMatch(/\S/);
    }
  });

  test('every filter the page offers has a label in both languages', () => {
    const html = read('library/index.html');
    const labels = [...html.matchAll(/<span data-i18n="(lib\.[\w.]+)">/g)].map(
      m => m[1]
    );
    expect(labels.length).toBeGreaterThanOrEqual(measured.library.filters);
    for (const lang of ['en', 'es'])
      for (const id of labels)
        expect(catalogs[lang][id], `${id} ${lang}`).toMatch(/\S/);
  });
});

describe('one thing, one name', () => {
  test('a thing named on several surfaces is named alike, except the registered divergences', async () => {
    const divergent = (await labelDivergences(inv)).map(d => d.id);
    expect(divergent.sort()).toEqual([...inv.labels.knownDivergences].sort());
  });

  test('no two entries of the menu share a word, in either language', () => {
    const menu = menuOf(read('library/index.html'));
    const entries = menu.flatMap(g => g.items);
    for (const lang of ['en', 'es'])
      expect(new Set(entries.map(e => e[lang])).size, lang).toBe(
        entries.length
      );
  });

  test("the shell's navigation words each carry a Spanish word", () => {
    for (const [, links] of NAV)
      for (const [key] of links) {
        const [en, es] = WORDS[key];
        expect(en, key).toMatch(/\S/);
        expect(es, key).toMatch(/\S/);
      }
    const label = labelOf(
      '<span class="gs-en">A &amp; B</span><span class="gs-es" lang="es">C</span>'
    );
    expect(label).toEqual({ en: 'A & B', es: 'C' });
  });

  test("Home's doors carry text in both languages", async () => {
    const { EN_DEFERRED } = await import('../js/i18n/en.deferred.js');
    const { ES_DEFERRED } = await import('../js/i18n/es.deferred.js');
    for (const card of ENTRY_CARDS)
      for (const id of [card.eyebrow, card.title, card.text, card.cta]) {
        expect(EN_DEFERRED[id], id).toMatch(/\S/);
        expect(ES_DEFERRED[id], id).toMatch(/\S/);
      }
  });
});

describe('the reachability walk, from the pages', () => {
  const clicks = clicksFromHome();

  test('every link in the global navigation and the footer lands on a page that exists', () => {
    const menu = menuOf(read('library/index.html'));
    for (const g of menu)
      for (const i of g.items)
        expect(fileOf(i.href), `${i.en}: ${i.href}`).not.toBeNull();
    for (const f of footerOf(read('library/index.html')))
      if (f.href.startsWith('/')) expect(fileOf(f.href), f.href).not.toBeNull();
  });

  test("every destination is a click from Home through the shell's navigation, and none is further", () => {
    for (const d of inv.destinations)
      expect(clicks.get(d.first.path), d.id).toBeLessThanOrEqual(1);
  });

  test('the pages with no path from Home do not grow, and no page is further than its ceiling', () => {
    const files = [...pages(), 'history/original/index.html'];
    const lost = files.filter(f => !clicks.has(urlOf(f)));
    expect(
      lost,
      'a page nothing links to (add a link, and lower the ceiling)'
    ).toHaveLength(inv.ceilings.reach.pagesWithoutALinkFromHome);
    expect(lost.map(urlOf)).toEqual(['/compute/']);
    const farthest = Math.max(...clicks.values());
    expect(farthest).toBe(inv.ceilings.reach.maxClicksFromHome);
  });
});

describe('what the site fails today, by design (pending until Prompt 166 activates it)', () => {
  const menu = menuOf(read('library/index.html'));
  const byHref = href => inv.surfaces.find(s => s.path === href);

  const checks = {
    'navigation.global.five-destinations': () => {
      const got = menu.map(g => g.en);
      const want = inv.destinations.map(d => d.en);
      if (JSON.stringify(got) !== JSON.stringify(want))
        throw new Error(
          `the menu's entries are ${got.join(', ')}; the model's are ${want.join(', ')}`
        );
    },
    'navigation.global.menu-follows-model': () => {
      const stray = [];
      for (const g of menu)
        for (const i of g.items) {
          const row = byHref(i.href);
          const home = inv.destinations.find(d => d.id === row?.destination);
          if (!home || home.en !== g.en)
            stray.push(`${i.en} (${g.en}, belongs to ${home?.en ?? 'none'})`);
        }
      if (stray.length)
        throw new Error(
          `${stray.length} of ${menu.flatMap(g => g.items).length} menu links are not under their destination: ${stray.slice(0, 3).join('; ')}...`
        );
    },
    'navigation.labels.shell-matches-glossary': async () => {
      const found = await labelDivergences(inv);
      if (found.length)
        throw new Error(
          `${found.length} things are named two ways: ${found.map(f => f.id).join(', ')}`
        );
    },
    'navigation.home.entries-are-destinations': () => {
      const got = ENTRY_CARDS.map(c => c.id);
      if (JSON.stringify(got) !== JSON.stringify(ids))
        throw new Error(
          `Home's entries are ${got.join(', ')}; the destinations are ${ids.join(', ')}`
        );
    },
    'navigation.home.no-count-walls': () => {
      if (measured.home.countedLinks)
        throw new Error(
          `Home shows ${measured.home.countedLinks} counts of Library content`
        );
    },
    'navigation.reach.every-page-from-home': () => {
      const lost = [...pages(), 'history/original/index.html'].filter(
        f => !clicksFromHome().has(urlOf(f))
      );
      if (lost.length)
        throw new Error(
          `no page links to ${lost.map(urlOf).join(', ')} from Home's pages`
        );
    },
    'navigation.library.student-kinds-only': () => {
      const shown = library.kinds.filter(k => !inv.kinds.students.includes(k));
      if (shown.length)
        throw new Error(
          `the Library shows kinds students are not meant to see: ${shown.join(', ')}`
        );
    },
    'navigation.library.no-where-it-runs': () => {
      if (read('library/index.html').includes('id="libFormat"'))
        throw new Error("the Library still offers a 'where it runs' facet");
    },
  };

  for (const [id, body] of Object.entries(checks))
    test(id, async () => {
      const result = await runPending(id, body);
      expect(['met', 'pending']).toContain(result.status);
    });

  test('each of the nine is registered under the prompt that activates it, and the e2e one is not here', () => {
    const registry = readRegistry().filter(c => c.id.startsWith('navigation.'));
    const listed = inv.futureAcceptance.map(f => f.id).sort();
    expect(registry.map(c => c.id).sort()).toEqual(listed);
    for (const f of inv.futureAcceptance) {
      const entry = registry.find(c => c.id === f.id);
      expect(entry.prompt, f.id).toBe(f.activatedBy);
      expect(f.workedBy, f.id).toMatch(/^16[2-7](, 16[2-7])*$/);
    }
    const here = Object.keys(checks);
    const browser = listed.filter(id => !here.includes(id));
    expect(browser).toEqual(['navigation.library.default-view-is-bounded']);
    expect(listed).toHaveLength(9);
  });
});

describe('NAVIGATION.md', () => {
  const text = read('NAVIGATION.md');

  test('its generated tables are current', () => {
    expect(withParts(text, inv)).toBe(text);
  });

  test('says what the model is, what it leaves out and what the checks do not prove', () => {
    for (const heading of [
      '## The model',
      '## Where every surface goes',
      '## What students see: kinds',
      '## Words',
      '## Acceptance criteria',
      '## The structural checks',
      '## What these checks do not prove',
      '## What the site fails today',
      '## The internal review protocol',
    ])
      expect(text, heading).toContain(heading);
    expect(text).toMatch(/Nothing here is a user study/);
    expect(text).toContain('D-R10-37');
  });

  test('names the two binding decisions it holds every expansion to', () => {
    expect(text).toMatch(/Cohesion is an acceptance criterion/);
    expect(text).toMatch(/Progressive disclosure is task-aware/);
  });

  test('every destination and every kind is in it, in both languages', () => {
    for (const d of inv.destinations)
      for (const s of [
        d.en,
        d.es,
        d.says.en,
        d.says.es,
        d.first.en,
        d.first.es,
      ])
        expect(text, s).toContain(s);
  });
});
