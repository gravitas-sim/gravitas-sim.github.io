// =============================================================================
// Routes published from the build, over the committed tree
// -----------------------------------------------------------------------------
// tools/route-overlay.mjs decides what a built page brings with it (its whole
// output closure), what it installs (the entry and its static imports) and
// which tree sources it replaces (those no other bundle was built from). The
// deploy (tools/prepare-pages.mjs) lays it over the staged tree, stamps it,
// checks its policy and lets exactly its files through the guard; the precache
// generator installs the start-up closure in the page's tier and drops the
// replaced sources. The browser half (publish A, B, A and the cache stays
// coherent) is tools/overlay-rehearsal.mjs, a development run.
// =============================================================================

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import process from 'node:process';
import {
  OVERLAY_ROUTES,
  planOverlay,
  relocatePage,
  withTreeStyles,
} from '../tools/route-overlay.mjs';
import { preparePages, stampedCommit } from '../tools/prepare-pages.mjs';

const BUILT = {
  entries: {
    'js/observatoryPage.js': [
      'js/observatory-A.js',
      'js/observatory-B.js',
      'js/observatoryPage.js',
    ],
    'js/main.js': ['js/app.js', 'js/chunk-1.js'],
  },
  outputs: {
    'js/observatoryPage.js': {
      inputs: ['js/observatoryPage.js'],
      static: ['js/observatory-A.js'],
    },
    'js/observatory-A.js': {
      inputs: ['js/observatory/sky.js', 'js/shared.js'],
      static: [],
    },
    // Loaded by a dynamic import: published, not installed.
    'js/observatory-B.js': { inputs: ['js/data/pack.js'], static: [] },
    'js/app.js': { inputs: ['js/main.js', 'js/shared.js'], static: [] },
    'js/chunk-1.js': { inputs: ['js/data/pack.js'], static: [] },
  },
};

describe('the plan', () => {
  test('the closure is published, its static part installed, and only its own sources replaced', () => {
    const [plan] = planOverlay(BUILT).routes;
    expect(plan.id).toBe('observatory');
    expect(plan.files.map(f => f.to)).toEqual([
      'observatory/js/observatory-A.js',
      'observatory/js/observatory-B.js',
      'observatory/js/observatoryPage.js',
    ]);
    expect(plan.startup).toEqual([
      'observatory/js/observatory-A.js',
      'observatory/js/observatoryPage.js',
    ]);
    // shared.js and the pack feed the application too, so they stay.
    expect(plan.replaced).toEqual([
      'js/observatory/sky.js',
      'js/observatoryPage.js',
    ]);
  });

  test('a route the build does not have, or an output it cannot move whole, is refused', () => {
    expect(() =>
      planOverlay(BUILT, [{ ...OVERLAY_ROUTES[0], entry: 'js/nowhere.js' }])
    ).toThrow(/not an entry/);
    const nested = JSON.parse(JSON.stringify(BUILT));
    nested.entries['js/observatoryPage.js'].push('js/deep/x.js');
    expect(() => planOverlay(nested)).toThrow(/outside js/);
  });

  test('the Observatory is the one route, its front door left alone', () => {
    expect(OVERLAY_ROUTES.map(r => r.id)).toEqual(['observatory']);
  });
});

describe('the page', () => {
  const [plan] = planOverlay(BUILT).routes;
  test('only the closure’s own references move', () => {
    const html =
      '<script type="module" src="/js/observatoryPage.js"></script>' +
      '<link rel="modulepreload" href="/js/observatory-A.js" />' +
      '<a href="/js/observatoryPage.js.map">map</a><img src="/images/x.png" />';
    expect(relocatePage(html, plan)).toBe(
      '<script type="module" src="/observatory/js/observatoryPage.js"></script>' +
        '<link rel="modulepreload" href="/observatory/js/observatory-A.js" />' +
        '<a href="/js/observatoryPage.js.map">map</a><img src="/images/x.png" />'
    );
  });

  test('the tree’s stylesheets replace the build’s joined one', () => {
    const built =
      '<head>\n    <link rel="stylesheet" href="/css/app.css" />\n    <link rel="stylesheet" href="/css/page.css" />\n</head>';
    const tree =
      '<head>\n    <link rel="stylesheet" href="/css/tokens.css" />\n    <link rel="stylesheet" href="/css/styles.css" />\n    <link rel="stylesheet" href="/css/page.css" />\n</head>';
    expect(withTreeStyles(built, tree)).toBe(
      '<head>\n    <link rel="stylesheet" href="/css/tokens.css" />\n    <link rel="stylesheet" href="/css/styles.css" />\n    <link rel="stylesheet" href="/css/page.css" />\n</head>'
    );
  });
});

describe('the deploy, with the overlay', () => {
  const REPO = path.resolve(process.cwd());
  let work;
  let result;
  let manifest;
  beforeAll(() => {
    work = mkdtempSync(path.join(tmpdir(), 'gravitas-overlay-'));
    // A stand-in build: the tree's own Observatory page (its entry is already
    // /js/observatoryPage.js), one output, and the record build.js writes.
    const dist = path.join(work, 'dist');
    mkdirSync(path.join(dist, 'observatory'), { recursive: true });
    mkdirSync(path.join(dist, 'js'), { recursive: true });
    writeFileSync(
      path.join(dist, 'observatory/index.html'),
      readFileSync(path.join(REPO, 'observatory/index.html'))
    );
    writeFileSync(path.join(dist, 'js/observatoryPage.js'), 'export {};\n');
    const inputs = path.join(dist, 'build-inputs.json');
    writeFileSync(
      inputs,
      JSON.stringify({
        entries: { 'js/observatoryPage.js': ['js/observatoryPage.js'] },
        outputs: {
          'js/observatoryPage.js': {
            inputs: ['js/observatoryPage.js'],
            static: [],
          },
        },
      })
    );
    result = preparePages({
      out: path.join(work, '_site'),
      overlay: dist,
      overlayInputs: inputs,
    });
    const sandbox = { self: {} };
    vm.runInNewContext(
      readFileSync(path.join(result.out, 'sw-manifest.js'), 'utf8'),
      sandbox
    );
    manifest = sandbox.self;
  }, 180_000);
  afterAll(() => {
    if (work) rmSync(work, { recursive: true, force: true });
  });

  test('the guard passes with exactly the overlay’s files changed or added', () => {
    expect(result.problems).toEqual([]);
    expect(result.ok).toBe(true);
    expect(result.changed).toContain('observatory/index.html');
  });

  test('the page names the moved entry and carries the commit, as the marker does', () => {
    const page = readFileSync(
      path.join(result.out, 'observatory/index.html'),
      'utf8'
    );
    expect(page).toContain('src="/observatory/js/observatoryPage.js"');
    expect(stampedCommit(path.join(result.out, 'observatory/index.html'))).toBe(
      result.commit
    );
    const rev = JSON.parse(
      readFileSync(path.join(result.out, 'deployed-revision.json'), 'utf8')
    );
    expect(rev.overlay).toEqual(['observatory']);
  });

  test('the precache installs the start-up file in the page’s tier and drops the source it replaces', () => {
    expect(manifest.__GRAVITAS_PRECACHE_OPTIONAL).toContain(
      './observatory/js/observatoryPage.js'
    );
    expect(manifest.__GRAVITAS_PRECACHE_OPTIONAL).toContain(
      './observatory/index.html'
    );
    expect(manifest.__GRAVITAS_PRECACHE).not.toContain(
      './js/observatoryPage.js'
    );
  });
});
