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
    const allowed = new Set([
      'build.js',
      'eslint.config.js',
      'jest.config.js',
      'playwright.config.js',
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
