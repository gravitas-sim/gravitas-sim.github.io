import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const read = f => readFileSync(path.join(ROOT, f), 'utf8');

// A bug that only exists in the built site is the worst kind to have: it works
// on every developer's machine and is broken for every visitor. This suite
// pins the one property of the build that physics.js silently depends on.
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
