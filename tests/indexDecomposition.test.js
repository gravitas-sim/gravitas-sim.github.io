// =============================================================================
// index.html is the shell, and each panel's markup ships with its family
// -----------------------------------------------------------------------------
// Roadmap II Prompt 53 (INDEX_DECOMPOSITION.md, D-INDEX-01). index.html keeps
// the shell, the canvas, the transport bar, the rail, the live regions and the
// scene description, the four observation panels start-up binds, and the share
// and settings dialogs. Every other panel's markup lives beside the code that
// mounts it - js/fragments/<host>.html, or a template in the module that binds
// it at start-up - and goes in where an empty <template data-host> stands.
//
// This holds the page to that, statically: nothing but the allowed set at the
// top level of <body>; no panel markup left behind; every host with its
// fragment and every fragment with its host; one copy of every id in the page
// as a reader has it; and each fragment precached, built and mounted by the
// family that owns it. tests/fragmentMount.test.js holds the mounting itself,
// and e2e/fragments.spec.js each family in the real page.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';

import {
  FRAGMENTS,
  STATIC_SET,
  assembledIndexHtml,
  fragmentMarkup,
  indexHtml,
} from '../tools/index-fragments.mjs';

const require = createRequire(import.meta.url);
const parse5 = require('parse5');

const read = f => readFileSync(f, 'utf8');
const attr = (node, name) => node.attrs?.find(a => a.name === name)?.value;

/** The element children of <body>, as `tag#id` or `tag.class`. */
function bodyChildren(html) {
  const doc = parse5.parse(html);
  const htmlEl = doc.childNodes.find(n => n.nodeName === 'html');
  const body = htmlEl.childNodes.find(n => n.nodeName === 'body');
  return body.childNodes.filter(n => n.tagName);
}

const label = node => {
  const id = attr(node, 'id');
  if (id) return `${node.tagName}#${id}`;
  const cls = (attr(node, 'class') || '').split(/\s+/)[0];
  return cls ? `${node.tagName}.${cls}` : node.tagName;
};

/** Every id in a document, in order, repeats included. */
const idsIn = html => [...html.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]);

/**
 * index.html under this many bytes, as committed and so as served (the site
 * publishes the tree; RELEASE.md). Measured at 102.1 KB on the commit that
 * decomposed it, from 165.9 KB. The prompt's 40 KB is not met and is recorded
 * as not met (D-INDEX-01): it needs the observation panels, share and
 * settings to load on demand as well. This holds what was won.
 */
const INDEX_CEILING = 104 * 1024;

describe('index.html', () => {
  const html = indexHtml();
  const top = bodyChildren(html);

  test('carries only the allowed static set, the hosts and the scripts', () => {
    const elements = top
      .filter(n => n.tagName !== 'script' && n.tagName !== 'template')
      .map(label);
    expect(elements).toEqual(STATIC_SET);
  });

  test('holds no markup of a panel that ships with its family', () => {
    const left = FRAGMENTS.flatMap(f => idsIn(fragmentMarkup(f))).filter(id =>
      html.includes(`id="${id}"`)
    );
    expect(left).toEqual([]);
  });

  test('has one host per fragment, in the order the list gives', () => {
    const hosts = top
      .filter(n => n.tagName === 'template')
      .map(n => attr(n, 'data-host'));
    expect(hosts).toEqual(FRAGMENTS.map(f => f.host));
    for (const node of top.filter(n => n.tagName === 'template')) {
      // An empty host: anything inside it would be inert, unrendered markup.
      expect(node.content.childNodes).toEqual([]);
    }
  });

  test(`stays under ${INDEX_CEILING / 1024} KB as served`, () => {
    expect(Buffer.byteLength(html)).toBeLessThan(INDEX_CEILING);
  });

  test('keeps the scene description and the live regions static', () => {
    // Rule 3: a screen reader has them at load, before any family mounts.
    for (const id of ['canvasSummary', 'srStatus']) {
      expect(html).toContain(`id="${id}"`);
    }
    const live = [...html.matchAll(/<[a-z][^>]*\baria-live="[^"]+"[^>]*>/g)];
    expect(live.length).toBeGreaterThan(0);
  });
});

describe('the fragments', () => {
  const files = readdirSync('js/fragments').filter(f => f.endsWith('.html'));

  test('every file is one the list names, and every file the list names exists', () => {
    const named = FRAGMENTS.filter(f => f.kind === 'file').map(
      f => `${f.host}.html`
    );
    expect(files.sort()).toEqual([...named].sort());
  });

  test.each(FRAGMENTS.map(f => [f.host, f]))(
    '%s has the top-level elements the list names',
    (_host, entry) => {
      const markup = fragmentMarkup(entry);
      const frag = parse5.parseFragment(markup);
      const ids = frag.childNodes
        .filter(n => n.tagName)
        .map(n => attr(n, 'id'));
      expect(ids).toEqual(entry.ids);
      // No inline script and no handler attribute: the CSP allows neither,
      // and a fragment is inserted as markup, so a script would never run.
      expect(markup).not.toMatch(/<script|\son[a-z]+="/i);
    }
  );

  test.each(FRAGMENTS.map(f => [f.host, f]))(
    '%s is mounted by the code that owns it',
    (host, entry) => {
      // A file is fetched by name; a template is mounted by name. Either way
      // the host's name is written in the module that does it, or in its
      // loader.
      const loaders = {
        'js/view3d.js': 'js/view3dBridge.js',
        'js/pauseAtEventPanel.js': 'js/pauseAtEventBridge.js',
        'js/rvWorkspacePanel.js': 'js/rvWorkspaceBridge.js',
        'js/assistPanel.js': 'js/scenarioPanelBridge.js',
        'js/exportDialog.js': 'js/exportBridge.js',
        'js/investigations.js': 'js/investigationsLoader.js',
      };
      const src = read(loaders[entry.owner] ?? entry.owner);
      expect(src).toContain(`'${host}'`);
      expect(src).toMatch(/\bmountFragment\(/);
    }
  );

  test('is precached with its family, and built where the page asks for it', () => {
    const manifest = read('sw-manifest.js');
    for (const f of FRAGMENTS.filter(e => e.kind === 'file')) {
      expect(manifest).toContain(`'./js/fragments/${f.host}.html'`);
    }
    expect(read('build.js')).toMatch(/STATIC_DIRS = \[[^\]]*'js\/fragments'/);
    if (existsSync('dist/index.html')) {
      for (const f of FRAGMENTS.filter(e => e.kind === 'file')) {
        expect(existsSync(`dist/js/fragments/${f.host}.html`)).toBe(true);
      }
    }
  });
});

describe('the page as a reader has it', () => {
  const html = assembledIndexHtml();

  test('has every id once', () => {
    const ids = idsIn(html);
    const repeated = ids.filter((id, i) => ids.indexOf(id) !== i);
    expect(repeated).toEqual([]);
  });

  test('keeps every aria reference pointing at an id that is there', () => {
    const ids = new Set(idsIn(html));
    const refs = [
      ...html.matchAll(
        /\saria-(?:labelledby|describedby|controls|owns|errormessage)="([^"]+)"/g
      ),
    ].flatMap(m => m[1].split(/\s+/));
    // The one id the page names before a module writes it: Home's heading,
    // built by js/welcome.js when Home opens.
    const unresolved = [...new Set(refs)].filter(id => !ids.has(id));
    expect(unresolved).toEqual(['welcomeTitle']);
  });
});
