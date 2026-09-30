// =============================================================================
// The shared shell (Roadmap II Prompt 50)
// -----------------------------------------------------------------------------
// tools/shell.mjs stamps one header, navigation and footer into every page;
// this holds each page to carrying it, current, with the landmarks it needs,
// and holds the navigation to the pages that exist.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import { readFileSync, existsSync } from 'node:fs';
import { gzipSync } from 'node:zlib';

import {
  EXEMPT,
  NAV,
  THEMES,
  WORDS,
  hasShell,
  pathOf,
  shellPages,
  withShell,
} from '../tools/shell.mjs';

const read = f => readFileSync(f, 'utf8');

/**
 * Pages that do not carry the shell yet, each with where it stands. The list
 * only shrinks: a page taken off it must carry the shell, and a new page must
 * be put on it with a reason or carry the shell from the start.
 */
const PENDING = {
  'index.html': 'the application and Home: Part 3',
  'instructors/submissions/index.html': 'tool pages: Part 2',
  'lab3d/index.html': 'tool pages: Part 2',
  '3d/index.html': 'tool pages: Part 2',
  'mission/index.html': 'tool pages: Part 2',
  'mission/lab/index.html': 'tool pages: Part 2',
};

/**
 * Pages whose route cannot pay for js/shell.js yet (tools/route-budgets.json):
 * the markup is there and the navigation works, since it needs no script;
 * the theme and language switches stay hidden until the module is loaded.
 */
const STATIC_ONLY = {
  'evaluation/index.html': 'route has 0.2 KB of room; the module is 3.2 KB',
  'instructors/index.html': 'route has 1.3 KB of room; the module is 3.2 KB',
  'catalog/index.html':
    'keeps its own language switch until its route can pay: 0.6 KB of room (sources) and 0.4 KB (build); the module is 3.2 KB, 1.8 KB bundled',
  'studio/index.html':
    'route has 0.1 KB of room, the module 3.2 KB: keeps its own language switch until its route can pay',
  'studio/lesson/index.html':
    'route has no request of room, the module is one: keeps its own language switch until its route can pay',
  'course/index.html':
    'route has 0.6 KB of room, the module 3.2 KB: keeps its own language switch until its route can pay',
};

const carrying = shellPages().filter(p => !Object.hasOwn(PENDING, p));

describe('every page carries the shell', () => {
  test('and the pending list names only pages without it', () => {
    for (const page of shellPages()) {
      const html = read(page);
      expect({ page, shell: hasShell(html) }).toEqual({
        page,
        shell: !Object.hasOwn(PENDING, page),
      });
    }
    for (const page of Object.keys(PENDING)) {
      expect(existsSync(page)).toBe(true);
    }
    expect(carrying.length).toBeGreaterThanOrEqual(5);
  });

  test('stamped from the one source, current', () => {
    for (const page of carrying) {
      const html = read(page);
      expect({ page, current: withShell(page, html) === html }).toEqual({
        page,
        current: true,
      });
    }
  });

  test('once, with a skip link to content that exists, and no second banner or footer', () => {
    for (const page of carrying) {
      const html = read(page);
      const count = re => (html.match(re) || []).length;
      expect({ page, header: count(/<header class="gs-shell">/g) }).toEqual({
        page,
        header: 1,
      });
      expect({ page, nav: count(/<nav id="gs-nav"/g) }).toEqual({
        page,
        nav: 1,
      });
      expect({ page, footer: count(/<footer\b/g) }).toEqual({
        page,
        footer: 1,
      });
      expect({ page, banner: count(/<header\b/g) }).toEqual({
        page,
        banner: 1,
      });
      const target = /<a class="gs-skip" href="#([\w-]+)"/.exec(html)[1];
      expect({ page, target: html.includes(`id="${target}"`) }).toEqual({
        page,
        target: true,
      });
    }
  });

  test('its stylesheet and its theme are in the head', () => {
    for (const page of carrying) {
      const head = read(page).split('</head>')[0];
      expect(head).toContain('href="/css/shell.css"');
      expect(head).toContain("localStorage.getItem('gravitas_theme')");
    }
  });

  test('and loads the module, unless its route is recorded as unable to', () => {
    for (const page of carrying) {
      const html = read(page);
      // The page's entry modules, by src or imported from an inline module.
      const src = [
        ...html.matchAll(/<script type="module" src="([^"]+)"/g),
        ...html.matchAll(/from '(\/js\/[^']+)'/g),
      ]
        .map(m => read(m[1].replace(/^\//, '')))
        .join('\n');
      const mounts = /mountShell\(/.test(html + src);
      expect({ page, mounts }).toEqual({
        page,
        mounts: !Object.hasOwn(STATIC_ONLY, page),
      });
    }
  });

  test('its module and stylesheet are precached as core, so it works offline', () => {
    const manifest = read('sw-manifest.js');
    const core = manifest.slice(
      manifest.indexOf('__GRAVITAS_PRECACHE_CORE'),
      manifest.indexOf('__GRAVITAS_PRECACHE_OPTIONAL')
    );
    expect(core).toContain("'./js/shell.js'");
    expect(core).toContain("'./css/shell.css'");
  });

  test('the first Gravitas is exempt, and kept as it was', () => {
    expect([...EXEMPT]).toEqual(['history/original/index.html']);
    expect(hasShell(read('history/original/index.html'))).toBe(false);
  });
});

describe('the navigation', () => {
  const served = new Set(shellPages().map(pathOf));

  test('every link is a page that exists, and none appears twice', () => {
    const hrefs = NAV.flatMap(([, links]) => links.map(([, href]) => href));
    expect(new Set(hrefs).size).toBe(hrefs.length);
    for (const href of hrefs) {
      expect({ href, exists: served.has(href.split('#')[0]) }).toEqual({
        href,
        exists: true,
      });
    }
  });

  test('reaches every page but the first Gravitas', () => {
    const hrefs = new Set(
      NAV.flatMap(([, links]) => links.map(([, href]) => href.split('#')[0]))
    );
    expect([...served].filter(p => !hrefs.has(p))).toEqual([]);
  });

  test('marks the page it is on, and only that one', () => {
    for (const page of carrying) {
      const html = read(page);
      const nav = html.slice(html.indexOf('<nav id="gs-nav"'));
      const current = [...nav.matchAll(/href="([^"]+)" aria-current="page"/g)];
      const listed = NAV.some(([, links]) =>
        links.some(([, href]) => href === pathOf(page))
      );
      expect({ page, current: current.map(m => m[1]) }).toEqual({
        page,
        current: listed ? [pathOf(page)] : [],
      });
    }
  });

  test('every label is written in both languages', () => {
    for (const [key, words] of Object.entries(WORDS)) {
      expect({ key, n: words.length }).toEqual({ key, n: 2 });
      for (const w of words) expect(w.trim()).not.toBe('');
    }
    for (const [, en, es] of THEMES) {
      expect(en).not.toBe('');
      expect(es).not.toBe('');
    }
  });

  test('offers the themes js/theme.js knows, in its order', () => {
    const ids = [...read('js/theme.js').matchAll(/\{ id: '(\w+)' \}/g)].map(
      m => m[1]
    );
    expect(THEMES.map(([id]) => id)).toEqual(ids);
  });
});

describe('its weight', () => {
  const { shell } = JSON.parse(read('tools/route-budgets.json'));

  test('within its measured line, and C2 as served', () => {
    for (const [kind, file, served] of [
      ['js', 'js/shell.js', 6 * 1024],
      ['css', 'css/shell.css', 4 * 1024],
    ]) {
      const bytes = readFileSync(file);
      expect({ file, over: bytes.length > shell[kind].bytes }).toEqual({
        file,
        over: false,
      });
      expect(gzipSync(bytes, { level: 9 }).length).toBeLessThanOrEqual(served);
    }
  });
});
