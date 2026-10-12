// =============================================================================
// Course packs and the mission lab's investigations (Roadmap II Prompt 106)
// -----------------------------------------------------------------------------
//   - the table a pack is checked against includes the mission lab's guides;
//   - a mission guide item is valid, and opens the mission lab at the path its
//     depth names, not the 3-D lab;
//   - the celestial mechanics unit carries the three, with depths, in sequence;
//   - the schema and the types accept the ids.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { valid } from './jsonSchemaSubset.js';
import { GUIDES as LAB } from '../js/mission/lab/curriculum.js';
import { itemLink } from '../js/course/links.js';
import {
  GUIDES,
  GUIDES_3D,
  GUIDES_MISSION,
  GUIDE_DEPTHS,
  guideRoute,
  validateCoursePack,
} from '../js/course/pack.js';
import { courseApi } from '../js/course/api.js';
import { UPPER_LEVEL_MODULES } from '../js/data/courses/upper-level-modules.js';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const schema = JSON.parse(
  readFileSync(path.join(REPO, 'sdk/schemas/course-pack-2.schema.json'))
);
const types = readFileSync(path.join(REPO, 'sdk/types/index.d.ts'), 'utf8');
const clone = o => JSON.parse(JSON.stringify(o));
const celestial = () =>
  UPPER_LEVEL_MODULES.units.find(u => u.id === 'celestial-mechanics');

describe('the table', () => {
  test('is the lab’s guides, with the minutes of each path', () => {
    expect(Object.keys(GUIDES_MISSION).sort()).toEqual(
      LAB.map(g => g.id).sort()
    );
    for (const g of LAB) expect(GUIDES_MISSION[g.id]).toEqual(g.minutes);
    expect(Object.keys(GUIDES).length).toBe(
      Object.keys(GUIDES_3D).length + Object.keys(GUIDES_MISSION).length
    );
    for (const g of LAB) expect(g.depths).toEqual(['core', 'advanced']);
  });

  test('routes each guide to its own lab', () => {
    expect(guideRoute('ml-window')).toBe('mission/lab/');
    expect(guideRoute('l3-planes')).toBe('3d/');
  });

  test('the schema and the types name every guide', () => {
    for (const id of Object.keys(GUIDES)) {
      expect(JSON.stringify(schema)).toContain(`"${id}"`);
      expect(types).toContain(`'${id}'`);
    }
  });
});

describe('a mission guide item', () => {
  const errorsFor = p => validateCoursePack(p, courseApi());

  test('the upper-level pack is valid and the schema accepts it', () => {
    expect(errorsFor(clone(UPPER_LEVEL_MODULES))).toEqual([]);
    expect(valid(schema, clone(UPPER_LEVEL_MODULES))).toBe(true);
  });

  test('a depth the guide does not have is refused on its field', () => {
    const p = clone(UPPER_LEVEL_MODULES);
    const item = p.units
      .flatMap(u => u.items)
      .find(i => i.guide === 'ml-orbit');
    item.depth = 'quantitative';
    expect(errorsFor(p).some(e => /depth/.test(e.path))).toBe(true);
  });

  test('opens the mission lab at the path its depth names', async () => {
    const root = 'https://example.test/';
    expect(
      await itemLink(
        { kind: 'guide', guide: 'ml-window', depth: 'core' },
        { root }
      )
    ).toEqual({
      href: 'https://example.test/mission/lab/?guide=ml-window&path=intro',
      kind: 'app',
    });
    const adv = await itemLink(
      { kind: 'guide', guide: 'ml-cruise', depth: 'advanced' },
      { root }
    );
    expect(adv.href).toBe(
      'https://example.test/mission/lab/?guide=ml-cruise&path=advanced'
    );
  });

  test('the unit carries the three, in sequence, with the minutes of their path', () => {
    const items = celestial().items;
    const ml = items.filter(i => i.guide?.startsWith('ml-'));
    expect(ml.map(i => i.guide)).toEqual([
      'ml-orbit',
      'ml-window',
      'ml-cruise',
    ]);
    for (const g of ml) {
      expect(g.depth).toBe(g.path === 'advanced' ? 'advanced' : 'core');
      expect(g.minutes).toBe(GUIDES_MISSION[g.guide][GUIDE_DEPTHS[g.depth]]);
    }
    expect(ml[1].needs).toEqual(['ml-orbit']);
    // An advanced-path item may not need an intro-path one (needsPath).
    expect(ml[2].needs).toEqual(['hohmann-transfer']);
    const index = id => items.findIndex(i => i.id === id);
    expect(index('ml-orbit')).toBeGreaterThan(index('hohmann-transfer'));
  });
});
