import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MANIFEST } from '../js/data/investigations/manifest.js';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const read = f => readFileSync(path.join(ROOT, f), 'utf8');

// A bug that only exists in the built site is the worst kind to have: it works
// on every developer's machine and is broken for every visitor. This suite
// pins the one property of the build that physics.js silently depends on.
describe('the published surface carries nothing it did not mean to', () => {
  // GitHub Pages serves the repository root, so every file here is live at
  // gravitas-sim.online. Eight development harnesses shipped that way: seven
  // test_*.html pages and energy_chart_edge_case_test.js, none of them linked
  // from anything, none in the sitemap, and none caught by robots.txt - whose
  // Disallow list is headed "Development artifacts that should not be indexed"
  // and lists /coverage/, /tests/ and /dist/ but never these. They were
  // superseded by the jest suite long before anyone noticed.
  const root = new URL('../', import.meta.url);
  const rootFiles = readdirSync(root, { withFileTypes: true })
    .filter(e => e.isFile())
    .map(e => e.name);

  test('the only page served from the root is the application itself', () => {
    const pages = rootFiles.filter(f => f.endsWith('.html'));
    expect(pages).toEqual(['index.html']);
  });

  test('no stray script sits in the root beside the config files', () => {
    // The build, the linter, jest and playwright each keep a config here and
    // are meant to. Anything else is something that escaped a tools/ or tests/
    // directory, and it will be served to the public if it stays.
    //
    // sw.js and sw-manifest.js are the exception that has to be here: a service
    // worker's scope is the directory it is served from, and a worker under
    // tools/ could not control the application. They are published on purpose.
    const allowed = new Set([
      'build.js',
      'eslint.config.js',
      'jest.config.js',
      'playwright.config.js',
      'sw.js',
      'sw-manifest.js',
    ]);
    const stray = rootFiles.filter(
      f => /\.(js|mjs|cjs)$/.test(f) && !allowed.has(f)
    );
    expect(stray).toEqual([]);
  });
});

describe('the production build preserves what the physics reads', () => {
  // esbuild's minifier renames classes, after which constructor.name is a
  // single letter. Star merging, stellar collapse, tidal disruption and rocky
  // collisions were all dead in a minified build because physics.js compared
  // those names; build.js kept every name to prevent it, at 63 KB of deferred
  // JavaScript. The comparisons are by class identity now, and these hold that.
  const code = f => read(f).replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
  const physics = read('js/physics.js');

  test('nothing in js/ reads a constructor by its name', () => {
    const readers = [];
    const walk = dir => {
      for (const e of readdirSync(path.join(ROOT, dir), {
        withFileTypes: true,
      })) {
        const rel = `${dir}/${e.name}`;
        if (e.isDirectory()) walk(rel);
        else if (
          /\.m?js$/.test(e.name) &&
          /\.constructor\.name\b/.test(code(rel))
        )
          readers.push(rel);
      }
    };
    walk('js');
    expect(readers).toEqual([]);
  });

  test('no object stands in for a class by carrying its name', () => {
    // asPhysicsObject() wrapped each black hole for the merge loop with
    // constructor: { name: 'BlackHole' }, which a name comparison accepted and
    // an identity one does not; the loop then merged two holes forever. A
    // wrapper carries the class itself.
    expect(code('js/physics.js')).not.toMatch(/constructor:\s*\{/);
  });

  test('every body class has its own name in CLASS_NAMES', () => {
    const bodies = [
      ...physics.matchAll(/^class (\w+) extends PhysicsObject\b/gm),
    ].map(m => m[1]);
    bodies.push('BlackHole');
    const map = physics.match(/const CLASS_NAMES = new Map\(\[([\s\S]*?)\]\);/);
    expect(map).not.toBeNull();
    const entries = [...map[1].matchAll(/\[(\w+), '(\w+)'\]/g)];
    for (const [, cls, name] of entries) expect(name).toBe(cls);
    expect(entries.map(e => e[1]).sort()).toEqual(bodies.sort());
    // By the constructor, never obj_type: a transformed body carries the
    // obj_type of what it became and the class of what it was.
    expect(physics).toMatch(
      /export const className = o => CLASS_NAMES\.get\(o\?\.constructor\)/
    );
  });

  test('the chunk mirror builds the application as build.js does', () => {
    const app = read('build.js').match(
      /entryPoints: \[\{ in: 'js\/main\.js', out: 'app' \}\][\s\S]*?keepNames: (\w+)/
    );
    const mirror = read('tools/instrument-families.mjs').match(
      /keepNames: (\w+)/
    );
    expect(app?.[1]).toBe(mirror?.[1]);
  });
});

// =============================================================================
// The offline cache
// -----------------------------------------------------------------------------
// The precache list and the cache version are generated from the tree by
// tools/build-service-worker.mjs. A checked-in manifest that is out of date is
// the worst kind of stale: a returning browser keeps serving last week's
// JavaScript from a cache whose name never changed, and no error appears
// anywhere. So the generator is the source of truth and this asserts the file
// on disk is what it would write today.
// =============================================================================
describe('the service worker manifest is current', () => {
  test('sw-manifest.js is what the generator would write', async () => {
    const { expectedFile } = await import('../tools/build-service-worker.mjs');
    const wanted = await expectedFile();
    const actual = read('sw-manifest.js');
    // Compared as text rather than by re-deriving the hash, so a change to the
    // rendering is caught as well as a change to the contents.
    expect(actual).toBe(wanted);
  });

  test('the version is a content hash, not a timestamp or a counter', async () => {
    const { buildManifest } = await import('../tools/build-service-worker.mjs');
    const a = await buildManifest();
    const b = await buildManifest();
    // Twice over an unchanged tree gives the same answer: a rebuild must not
    // evict a cache that is still correct.
    expect(a.version).toBe(b.version);
    expect(a.version).toMatch(/^[0-9a-f]{12}$/);
  });

  test('it precaches the shell, the thumbnails and the English lessons', async () => {
    const { buildManifest } = await import('../tools/build-service-worker.mjs');
    const { paths } = await buildManifest();

    expect(paths).toContain('index.html');
    expect(paths.filter(p => p.endsWith('.css')).length).toBeGreaterThanOrEqual(
      6
    );
    // Derived from the catalog rather than written down. A magic number here
    // says only "the count did not change", which is the wrong thing to check
    // and has to be edited every time a scenario is added; against
    // SCENARIO_INFO it says "every scenario's thumbnail is precached", which
    // also catches one that was added to the catalog and never captured.
    const { SCENARIO_INFO } = await import('../js/data/scenarioInfo.js');
    expect(
      paths.filter(p => /^images\/scenarios\/.*\.webp$/.test(p))
    ).toHaveLength(Object.keys(SCENARIO_INFO).length);

    // Every English lesson body. The reasoning is in the generator's header;
    // what matters here is that the decision cannot rot silently - a lesson
    // added to the catalog and left out of the precache would be a lesson
    // that could not be opened offline, which is exactly the failure the
    // count guards against. Compared against the manifest rather than a
    // literal, so adding a lesson does not require editing this file.
    const lessons = paths.filter(p =>
      /^js\/data\/investigations\/[a-z0-9-]+\.js$/.test(p)
    );
    // provenance.js is generated infrastructure, not a lesson body - it is in
    // this directory because the lesson engine imports it. So is discovery.js,
    // the course-planning metadata generated with the manifest.
    const bodies = lessons.filter(
      p =>
        !/\/(manifest|manifest\.es|registry|i18n|catalog|browse|browseData|discovery|sequences|provenance)\.js$/.test(
          p
        )
    );
    expect(bodies.length).toBe(MANIFEST.length);
  });

  test('it does not precache the Spanish shadows, which are warmed on demand', async () => {
    const { buildManifest } = await import('../tools/build-service-worker.mjs');
    const { paths } = await buildManifest();
    expect(paths.filter(p => p.includes('/investigations/es/'))).toEqual([]);

    // But the worker has to know about them, or switching to Spanish offline
    // would find nothing.
    const manifest = read('sw-manifest.js');
    expect(manifest).toContain('__GRAVITAS_LOCALE_WARM');
    expect(
      (manifest.match(/investigations\/es\/[a-z0-9-]+\.js/g) || []).length
    ).toBe(MANIFEST.length);
  });

  test('it leaves out the downloads and the document pages', async () => {
    const { buildManifest } = await import('../tools/build-service-worker.mjs');
    const { paths } = await buildManifest();
    for (const unwanted of [
      'Gravitas_User_Manual.pdf',
      'social-card.png',
      'model/index.html',
      'instructors/index.html',
    ]) {
      expect(paths).not.toContain(unwanted);
    }
  });
});

describe('the deploy sequence keeps its artifacts describing one candidate', () => {
  const workflow = () =>
    readFileSync(
      new URL('../.github/workflows/ci.yml', import.meta.url),
      'utf8'
    );

  const tool = () =>
    readFileSync(
      new URL('../tools/prepare-pages.mjs', import.meta.url),
      'utf8'
    );

  test('the revision is stamped before the manifest is re-sealed', () => {
    // The manifest's version is a sha256 over the CONTENTS of everything it
    // precaches, index.html included. Stamping the commit into that file
    // changes its bytes, so a manifest generated before the stamp stops
    // describing what is served: clients would cache assets under a version
    // computed from different ones.
    //
    // The order used to be a property of the YAML, which is why this read the
    // YAML. The sequence lives in tools/prepare-pages.mjs now - so that it can
    // be run outside Actions, which is how tests/deployRehearsal.test.js
    // exercises the whole thing including both guards - and the order is a
    // property of that file.
    const src = tool();
    const stamp = src.indexOf('for (const page of STAMPED_PAGES) stampPage');
    const reseal = src.indexOf('run(process.execPath, [builder]');
    const record = src.indexOf("'deployed-revision.json'),\n      `${JSON");
    const verify = src.indexOf('verifyRelease(out)');
    expect(stamp).toBeGreaterThan(0);
    expect(reseal).toBeGreaterThan(stamp);
    expect(record).toBeGreaterThan(reseal);
    expect(verify).toBeGreaterThan(record);
  });

  test('the re-seal both regenerates and re-checks', () => {
    // Regenerating without checking would let a failure pass silently, which
    // is the whole failure mode this step exists to close.
    const src = tool();
    expect(src).toContain('run(process.execPath, [builder], { cwd: out })');
    expect(src).toContain(
      "run(process.execPath, [builder, '--check'], { cwd: out })"
    );
  });

  test('the job publishes the staging directory, not the checkout', () => {
    // The defect this replaces: the job stamped three pages and regenerated
    // the manifest in the checkout, then ran `git status` and refused to
    // publish because the checkout had been modified - by those four edits.
    const yml = workflow();
    expect(yml).toContain('node tools/prepare-pages.mjs');
    expect(yml).toContain('path: _site');
    expect(yml).not.toMatch(/^\s+path: \.$/m);
    // And the guard is still there, now asking a question with one right
    // answer.
    expect(yml).toContain('Confirm the checkout is unmodified');
    expect(yml).toContain('git status --porcelain --untracked-files=no');
  });

  test('the stamp writes a meta tag the application actually reads', () => {
    // js/notebookBridge.js reads meta[name="gravitas-revision"]. If the
    // workflow ever stamped a different name the provenance would silently
    // fall back to "unknown" on a real deployment and nobody would notice.
    expect(workflow()).toContain('name="gravitas-revision"');
    const bridge = readFileSync(
      new URL('../js/notebookBridge.js', import.meta.url),
      'utf8'
    );
    expect(bridge).toContain("meta('gravitas-revision')");
  });
});
