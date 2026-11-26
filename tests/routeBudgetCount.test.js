import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import {
  mkdtempSync,
  mkdirSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  BOOT_WORLD_MODULES,
  ROUTES,
  countedScripts,
  isBootWorldScript,
} from '../tools/route-budget.mjs';

// What a lesson route is charged for must not depend on how fast the machine
// is (tools/route-budget.mjs, BOOT_WORLD_MODULES). The browser half of that is
// `node tools/route-budget.mjs --repeat=2 --throttle=4`; this holds the half
// that needs no browser: which fetched scripts a lesson does not count.
describe('the scripts a lesson route is not charged for', () => {
  let root;
  const map = (name, sources) => {
    writeFileSync(
      join(root, 'js', `${name}.map`),
      JSON.stringify({ version: 3, sources })
    );
  };

  beforeAll(() => {
    root = realpathSync(mkdtempSync(join(tmpdir(), 'gravitas-route-count-')));
    mkdirSync(join(root, 'js'));
    map('chunk-HOLE.js', [
      '../../js/blackHole/geometry.js',
      '../../js/blackHole/render.js',
    ]);
    map('chunk-MIXED.js', [
      '../../js/blackHole/render.js',
      '../../js/instrumentStartup.js',
    ]);
    map('chunk-STUB.js', []);
  });
  afterAll(() => rmSync(root, { recursive: true, force: true }));

  const built = name => `http://127.0.0.1:4461/js/${name}.js`;
  const where = () => ({ config: 'build', root });

  test('the black-hole renderer is not counted in either configuration', () => {
    expect([...BOOT_WORLD_MODULES].sort()).toEqual([
      'js/blackHole/geometry.js',
      'js/blackHole/render.js',
    ]);
    expect(
      isBootWorldScript('http://127.0.0.1:4461/js/blackHole/render.js', {
        config: 'sources',
      })
    ).toBe(true);
    expect(isBootWorldScript(built('chunk-HOLE'), where())).toBe(true);
  });

  test('a script that holds anything else, or that cannot be read, is counted', () => {
    expect(
      isBootWorldScript('http://127.0.0.1:4461/js/bodyDraw.js', {
        config: 'sources',
      })
    ).toBe(false);
    expect(isBootWorldScript(built('chunk-MIXED'), where())).toBe(false);
    // A chunk with no modules of its own (an entry stub), and one with no map.
    expect(isBootWorldScript(built('chunk-STUB'), where())).toBe(false);
    expect(isBootWorldScript(built('chunk-NOMAP'), where())).toBe(false);
  });

  test('only a lesson route leaves them out', () => {
    const scripts = [
      { url: built('chunk-HOLE'), bytes: 5937 },
      { url: built('chunk-MIXED'), bytes: 100 },
    ];
    expect(countedScripts(scripts, { lesson: true }, where())).toEqual([
      scripts[1],
    ]);
    // The sandbox starts in that world and pays for the renderer every time.
    expect(countedScripts(scripts, {}, where())).toEqual(scripts);
  });

  test('the sandbox and front door routes are not lessons', () => {
    const open = ROUTES.filter(r => !r.lesson && !r.page).map(r => r.id);
    expect(open).toEqual(['front-door', 'sandbox']);
    expect(ROUTES.filter(r => r.lesson).map(r => r.id)).toEqual([
      'kepler',
      'transit',
      'power-law',
      'largest-lesson',
    ]);
  });
});
