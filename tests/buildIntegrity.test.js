import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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
  // Disallow list is headed "Development artefacts that should not be indexed"
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
  const physics = read('js/physics.js');
  const build = read('build.js');

  test('physics.js still branches on class names', () => {
    // If this ever reaches zero the keepNames requirement below is obsolete and
    // both this test and the build flag can go.
    const uses = physics.match(/\.constructor\.name/g) || [];
    expect(uses.length).toBeGreaterThan(0);
  });

  test('every esbuild call keeps class names', () => {
    // esbuild's minifier renames classes, after which constructor.name is a
    // single letter and all fifteen comparisons in physics.js are false. Star
    // merging, stellar collapse, tidal disruption and rocky collisions were all
    // dead on the deployed site because of this, and passed locally.
    const minify = (build.match(/minify:\s*true/g) || []).length;
    const keep = (build.match(/keepNames:\s*true/g) || []).length;
    expect(minify).toBeGreaterThan(0);
    expect(keep).toBe(minify);
  });

  test('obj_type is not substituted for the class name', () => {
    // Tempting, because every class sets obj_type to its own class name. They
    // are not interchangeable: a transformed body carries the obj_type of what
    // it became and the class of what it was.
    expect(physics).toContain('.constructor.name');
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
    expect(
      paths.filter(p => /^images\/scenarios\/.*\.webp$/.test(p))
    ).toHaveLength(53);

    // All twelve English lesson bodies. The reasoning is in the generator's
    // header; what matters here is that the decision cannot rot silently when a
    // thirteenth lesson is added.
    const lessons = paths.filter(p =>
      /^js\/data\/investigations\/[a-z0-9-]+\.js$/.test(p)
    );
    const bodies = lessons.filter(
      p => !/\/(manifest|manifest\.es|registry|i18n|catalogue)\.js$/.test(p)
    );
    expect(bodies.length).toBe(12);
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
    ).toBe(12);
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
