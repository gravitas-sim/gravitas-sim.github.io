// =============================================================================
// The accessibility net (Prompt 281)
// -----------------------------------------------------------------------------
// Four lists have to say the same thing about the pages of the site: the
// navigation inventory (what pages there are), the axe spec (every one in every
// theme and both languages), the walk inventory (every one walked by keyboard)
// and the outline record (every one's headings). Left to themselves they drift:
// a page is added to the first and the other three never hear of it. This holds
// them together, and holds the shard (tools/a11y-shard.json: the specs that
// make up the accessibility work, the table in ACCESSIBILITY.md and
// `npm run a11y`) to the files that exist.
//
// The net is a function of the tree (tools/a11y-shard.mjs netProblems), tried
// here on the tree and on copies with one thing taken away, each of which it
// must name.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import {
  concretePath,
  inputs,
  namedCovers,
  netProblems,
  pagesOf,
  tableOf,
  uncoveredRoutes,
} from '../tools/a11y-shard.mjs';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = f => readFileSync(path.join(REPO, f), 'utf8');
const copy = x => JSON.parse(JSON.stringify(x));

describe('the net holds on the tree', () => {
  const tree = inputs();

  test('no page, spec or surface is missing from something that should list it', () => {
    expect(netProblems(tree)).toEqual([]);
  });

  test('every page of the navigation inventory has an axe run, in every theme and both languages', () => {
    const spec = read('e2e/accessibility.spec.js');
    const pages = pagesOf(tree.nav, tree.contract).map(s => s.id);
    expect(pages.length).toBeGreaterThan(30);
    const runs = new Set([...tree.named, ...tree.routes]);
    expect(pages.filter(id => !runs.has(id))).toEqual([]);
    // Every one runs in all four themes, English and Spanish.
    expect(spec).toMatch(/for \(const theme of ALL_THEMES\)/);
    expect(spec).not.toMatch(/surface\.standalone \? ALL_THEMES : THEMES/);
    expect(tree.specThemes).toEqual(tree.themes);
    expect(tree.themes.length).toBe(4);
    const locales = [
      ...spec
        .slice(spec.indexOf('const LOCALES = ['))
        .split('];')[0]
        .matchAll(/id: '([^']+)'/g),
    ].map(m => m[1]);
    expect(locales).toEqual(['en', 'es']);
  });

  test('the pages with no named surface are the ones the spec gives their own run', () => {
    const routes = uncoveredRoutes();
    expect(routes.map(r => r.id).sort()).toEqual([...tree.routes].sort());
    for (const r of routes) expect(r.path).toMatch(/^\/.*\/$/);
    // A wildcard becomes a page that exists.
    expect(concretePath('/teaching/activity/*')).toMatch(
      /^\/teaching\/activity\/[a-z0-9-]+\/$/
    );
  });

  test('every walk row and every outline names a page of the navigation inventory', () => {
    const ids = new Set(tree.nav.surfaces.map(s => s.id));
    for (const r of tree.contract.inventory.rows)
      expect(ids).toContain(r.surface);
    for (const id of Object.keys(tree.outlines.pages))
      expect(ids).toContain(id);
  });

  test('the tool-and-3-D registrations of this prompt are in the contract with their walks', () => {
    for (const id of ['lab3d.describe', 'mission.window.grid']) {
      const s = tree.contract.surfaces.find(x => x.id === id);
      expect(s).toBeTruthy();
      expect(s.tests.keyboard.file).toBe('e2e/a11y3dMission.spec.js');
      expect(s.tests.singlePointer).toBeTruthy();
    }
  });
});

describe('the shard is what ACCESSIBILITY.md and npm say it is', () => {
  test('the table "What is checked" is written from the configuration', () => {
    const doc = read('ACCESSIBILITY.md');
    const a = doc.indexOf('<!-- a11y-shard:table -->');
    const b = doc.indexOf('<!-- /a11y-shard:table -->');
    expect(a).toBeGreaterThan(-1);
    const strip = s =>
      s.replace(/(<!--fact:[^>]+-->).*?(<!--\/fact-->)/g, '$1#$2').trim();
    expect(strip(doc.slice(a + 25, b))).toBe(strip(tableOf(inputs().config)));
  });

  test('every rule switched off for a page is named, with its reason, in the document', () => {
    const doc = read('ACCESSIBILITY.md').replace(/\s+/g, ' ');
    const exempt = inputs().config.axeExempt;
    expect(Object.keys(exempt)).toEqual(['history-original']);
    for (const [id, x] of Object.entries(exempt)) {
      expect(doc).toContain(id);
      for (const rule of x.rules) expect(doc).toContain(rule);
      expect(x.reason.length).toBeGreaterThan(40);
    }
    // And the spec switches off nothing else.
    expect(read('e2e/accessibility.spec.js')).toMatch(/const OFF = \{\};/);
  });

  test('every test file the configuration names exists', () => {
    const { config } = inputs();
    for (const t of config.tests)
      for (const f of t.files) expect(() => read(f)).not.toThrow();
  });
});

describe('the net names what is missing', () => {
  const tree = inputs();
  const with_ = f => {
    const t = {
      ...tree,
      nav: copy(tree.nav),
      contract: copy(tree.contract),
      outlines: copy(tree.outlines),
      config: copy(tree.config),
      named: new Set(tree.named),
      routes: [...tree.routes],
    };
    f(t);
    return netProblems(t);
  };

  test('a page added to the inventory with no axe run, walk or outline', () => {
    const p = with_(t =>
      t.nav.surfaces.push({ id: 'a-new-page', path: '/new/', role: 'tool' })
    );
    expect(p.join('\n')).toMatch(
      /a-new-page: the navigation inventory lists it and the axe spec gives it no run/
    );
    expect(p.join('\n')).toMatch(/a-new-page: no walk row/);
    expect(p.join('\n')).toMatch(/a-new-page: no outline/);
  });

  test('a surface the axe spec covers that the inventory does not hold', () => {
    const p = with_(t => t.named.add('ghost'));
    expect(p.join('\n')).toMatch(/ghost: the axe spec covers a surface/);
  });

  test('a page dropped from the walk inventory', () => {
    const p = with_(t => {
      t.contract.inventory.rows = t.contract.inventory.rows.filter(
        r => r.surface !== 'glossary'
      );
    });
    expect(p).toContain(
      'glossary: no walk row in tools/interaction-contract.json'
    );
  });

  test('a spec named a11y* or accessibility* that the shard does not list', () => {
    const p = with_(t => t.specFiles.push('e2e/a11yNew.spec.js'));
    expect(p).toContain('e2e/a11yNew.spec.js is not in tools/a11y-shard.json');
  });

  test('npm run a11y and the shard disagreeing', () => {
    const p = with_(
      t =>
        (t.scripts = {
          ...t.scripts,
          a11y: 'playwright test e2e/accessibility.spec.js',
        })
    );
    expect(p.join('\n')).toMatch(/`npm run a11y` runs/);
  });

  test('a surface in fewer themes than the shell offers', () => {
    const p = with_(t => (t.specThemes = ['midnight', 'daylight']));
    expect(p.join('\n')).toMatch(/not the shell's themes/);
    const q = with_(t => (t.perSurfaceThemes = true));
    expect(q.join('\n')).toMatch(/fewer than every theme/);
  });

  test('a registered interaction surface with no keyboard walk, or a walk in no spec', () => {
    const p = with_(t => {
      delete t.contract.surfaces[0].tests.keyboard;
      t.contract.surfaces[1].tests.keyboard.file = 'e2e/nothing.spec.js';
    });
    expect(p.join('\n')).toMatch(/registered with no keyboard walk/);
    expect(p.join('\n')).toMatch(/e2e\/nothing\.spec\.js, which is not a spec/);
  });

  test('namedCovers reads the array and nothing else', () => {
    expect(
      namedCovers(
        "const SURFACES = [\n  {\n    name: 'x',\n    covers: 'y',\n  },\n];\ncovers: 'z'"
      )
    ).toEqual(new Set(['y']));
  });
});
