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
//   model         Home and the global navigation follow the model (Prompt 162
//                 activated these six; they are ordinary tests now)
//   pending       what the site still fails, reported by tools/pending-
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
  withHomeDestinations,
  withParts,
  HOME,
} from '../tools/navigation.mjs';
import { DESTINATIONS, WORDS, shellPages, hasShell } from '../tools/shell.mjs';
import { pages } from '../tools/csp.mjs';
import { NOUNS } from '../tools/glossary.mjs';
import { readRegistry, runPending } from '../tools/pending-acceptance.mjs';
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
const GROUPS = DESTINATIONS.map(([key]) => key);
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
    for (const [key] of DESTINATIONS) {
      const [en, es] = WORDS[key];
      expect(en, key).toMatch(/\S/);
      expect(es, key).toMatch(/\S/);
    }
    const label = labelOf(
      '<span class="gs-en">A &amp; B</span><span class="gs-es" lang="es">C</span>'
    );
    expect(label).toEqual({ en: 'A & B', es: 'C' });
  });

  test("Home's five destinations are the inventory's words, in both languages, and the fragment is current", () => {
    const home = read(HOME);
    expect(withHomeDestinations(home, inv)).toBe(home);
    for (const d of inv.destinations)
      for (const text of [d.en, d.es, d.says.en, d.says.es])
        expect(home, text).toContain(text);
  });

  test("the shell's words for the destinations are the inventory's", () => {
    for (const [key, href, id] of DESTINATIONS) {
      const d = inv.destinations.find(x => x.id === id);
      expect([WORDS[key][0], WORDS[key][1]], id).toEqual([d.en, d.es]);
      expect(href, id).toBe(d.first.path);
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
    expect(lost.map(urlOf)).toEqual([]);
    const farthest = Math.max(...clicks.values());
    expect(farthest).toBe(inv.ceilings.reach.maxClicksFromHome);
  });
});

describe('Home and the global navigation follow the model (activated by Prompt 162)', () => {
  const menu = menuOf(read('library/index.html'));
  const byHref = href => inv.surfaces.find(s => s.path === href);
  const SIX = [
    'navigation.global.five-destinations',
    'navigation.global.menu-follows-model',
    'navigation.labels.shell-matches-glossary',
    'navigation.home.entries-are-destinations',
    'navigation.home.no-count-walls',
    'navigation.reach.every-page-from-home',
  ];

  test('the six are activated by name, so a failure fails', () => {
    const registry = readRegistry();
    for (const id of SIX)
      expect(
        registry.find(c => c.id === id),
        id
      ).toMatchObject({
        prompt: '162',
        activated: true,
      });
  });

  test('navigation.global.five-destinations', async () => {
    const got = menu.map(g => g.en);
    expect(got).toEqual(inv.destinations.map(d => d.en));
    expect(menu.map(g => g.es)).toEqual(inv.destinations.map(d => d.es));
    const result = await runPending(SIX[0], () => {});
    expect(result.status).toBe('met');
  });

  test('navigation.global.menu-follows-model', () => {
    for (const g of menu)
      for (const i of g.items) {
        const row = byHref(i.href);
        const home = inv.destinations.find(d => d.id === row?.destination);
        expect(home?.en, `${i.en} is under ${g.en}`).toBe(g.en);
        // no tool, authoring surface, diagnostic or document is a menu entry
        expect(row.role, i.href).toBe('destination');
      }
    expect(menu.flatMap(g => g.items)).toHaveLength(5);
  });

  test('navigation.labels.shell-matches-glossary', async () => {
    expect(await labelDivergences(inv)).toEqual([]);
  });

  test('navigation.home.entries-are-destinations', () => {
    const home = read(HOME);
    const got = [
      ...home.matchAll(/class="wel-door" data-dest="([\w-]+)"/g),
    ].map(m => m[1]);
    expect(got).toEqual(ids);
  });

  test('navigation.home.no-count-walls', () => {
    expect(measured.home.countedLinks).toBe(0);
    expect(read(HOME)).not.toMatch(
      /data-slot="(scenario-count|lessons|scenarios)"/
    );
  });

  test('navigation.reach.every-page-from-home', () => {
    const lost = [...pages(), 'history/original/index.html'].filter(
      f => !clicksFromHome().has(urlOf(f))
    );
    expect(lost.map(urlOf)).toEqual([]);
  });

  test('every former menu entry has a path from Home, in two activations (three for what hangs below Teach)', () => {
    const clicks = clicksFromHome();
    const deeper = new Set(['submissions', 'course-packages']);
    for (const row of inv.surfaces.filter(
      s =>
        !s.path.endsWith('*') &&
        !s.path.endsWith('.pdf') &&
        s.id !== 'history-original'
    ))
      expect(
        clicks.get(row.path.replace(/#.*$/, '')) ?? Infinity,
        `${row.id} (${row.path})`
      ).toBeLessThanOrEqual(deeper.has(row.id) ? 3 : 2);
  });

  test("Home's first-week start is a committed list that names real Library entries", () => {
    const starts = inv.firstWeek.starts;
    expect(starts.map(s => s.id)).toEqual([
      'student',
      'observer',
      'sandbox',
      'instructor',
    ]);
    for (const s of starts) {
      expect(s.audience.en, s.id).toMatch(/\S/);
      expect(s.audience.es, s.id).toMatch(/\S/);
      if (s.entry)
        expect(
          library.entries.find(e => e.id === s.entry),
          `${s.id}: ${s.entry}`
        ).toBeTruthy();
      else expect(s.action, s.id).toBe('enter');
    }
    // an investigation, an observation (a dataset), a course, and the sandbox
    const kinds = starts.map(
      s => library.entries.find(e => e.id === s.entry)?.kind ?? 'action'
    );
    expect(kinds).toEqual(['investigation', 'dataset', 'action', 'course']);
    expect(measured.home.firstWeekLinks).toBe(starts.length);
  });
});

describe('what the site still fails, by design (pending until Prompt 166 activates it)', () => {
  const checks = {
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

  test('each of the three is registered under the prompt that activates it, and the e2e one is not here', () => {
    const registry = readRegistry().filter(c => c.id.startsWith('navigation.'));
    const listed = inv.futureAcceptance.map(f => f.id).sort();
    // the other six were activated by 162, and are ordinary tests above
    expect(
      registry
        .filter(c => c.activated === false)
        .map(c => c.id)
        .sort()
    ).toEqual(listed);
    expect(registry).toHaveLength(9);
    for (const f of inv.futureAcceptance) {
      const entry = registry.find(c => c.id === f.id);
      expect(entry.prompt, f.id).toBe(f.activatedBy);
      expect(f.workedBy, f.id).toMatch(/^16[3-7](, 16[3-7])*$/);
    }
    const here = Object.keys(checks);
    const browser = listed.filter(id => !here.includes(id));
    expect(browser).toEqual(['navigation.library.default-view-is-bounded']);
    expect(listed).toHaveLength(3);
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
