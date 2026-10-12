// =============================================================================
// Course packs and the 3-D lab's investigations (Roadmap II Prompt 105)
// -----------------------------------------------------------------------------
//   - the table a pack is checked against is the lab's own guides;
//   - a `guide` item is valid, or refused on its own field, and opens the lab's
//     guide at the path its depth names;
//   - the celestial mechanics unit carries the four guides, with depths, on
//     paths a student may take.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { valid } from './jsonSchemaSubset.js';
import { GUIDES } from '../js/lab3d/guides/curriculum.js';
import { itemLink } from '../js/course/links.js';
import {
  GUIDES_3D,
  GUIDE_DEPTHS,
  validateCoursePack,
} from '../js/course/pack.js';
import { courseApi } from '../js/course/api.js';
import { UPPER_LEVEL_MODULES } from '../js/data/courses/upper-level-modules.js';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const schema = JSON.parse(
  readFileSync(path.join(REPO, 'sdk/schemas/course-pack-2.schema.json'))
);
const clone = o => JSON.parse(JSON.stringify(o));
const celestial = () =>
  UPPER_LEVEL_MODULES.units.find(u => u.id === 'celestial-mechanics');

describe('the table', () => {
  test('is the lab’s guides, with the minutes of each path', () => {
    expect(Object.keys(GUIDES_3D).sort()).toEqual(GUIDES.map(g => g.id).sort());
    for (const g of GUIDES) expect(GUIDES_3D[g.id]).toEqual(g.minutes);
    expect(GUIDE_DEPTHS).toEqual({ core: 'intro', advanced: 'advanced' });
  });
});

describe('a guide item', () => {
  const pack = () => {
    const p = clone(UPPER_LEVEL_MODULES);
    return p;
  };
  const errorsFor = p => validateCoursePack(p, courseApi());

  test('the upper-level pack is valid and the schema accepts it', () => {
    expect(errorsFor(pack())).toEqual([]);
    expect(valid(schema, pack())).toBe(true);
  });

  test('an unknown guide, or a depth the guide does not have, is refused on its field', () => {
    const p = pack();
    const item = p.units[0].items.find(i => i.kind === 'guide');
    item.guide = 'l3-nothing';
    expect(errorsFor(p).map(e => e.code ?? e.path)).toEqual(
      expect.arrayContaining([expect.stringMatching(/guide/)])
    );
    expect(valid(schema, p)).toBe(false);
    item.guide = 'l3-planes';
    item.depth = 'quantitative';
    expect(errorsFor(p).some(e => /depth/.test(e.path))).toBe(true);
  });

  test('opens the lab’s guide at the path its depth names', async () => {
    const root = 'https://example.test/';
    const planes = await itemLink(
      { kind: 'guide', guide: 'l3-planes', depth: 'core' },
      { root }
    );
    expect(planes).toEqual({
      href: 'https://example.test/3d/?guide=l3-planes&path=intro',
      kind: 'app',
    });
    const kozai = await itemLink(
      { kind: 'guide', guide: 'l3-kozai', depth: 'advanced' },
      { root }
    );
    expect(kozai.href).toBe(
      'https://example.test/3d/?guide=l3-kozai&path=advanced'
    );
  });

  test('the celestial mechanics unit carries the four, with depths, on paths a student may take', () => {
    const guides = celestial().items.filter(
      i => i.kind === 'guide' && i.guide in GUIDES_3D
    );
    expect(guides.map(g => g.guide).sort()).toEqual(
      Object.keys(GUIDES_3D).sort()
    );
    for (const g of guides) {
      expect(g.depth).toBe(g.path === 'advanced' ? 'advanced' : 'core');
      const minutes = GUIDES_3D[g.guide][GUIDE_DEPTHS[g.depth]];
      expect(g.minutes).toBe(minutes);
    }
  });
});
