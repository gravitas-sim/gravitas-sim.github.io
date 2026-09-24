// =============================================================================
// One potential, and a guard that it stays one
// -----------------------------------------------------------------------------
// Gravitas drew the gravitational potential twice and the two disagreed.
// js/vectorOverlay.js evaluated the real Newtonian sum with the engine's own
// softening floor. js/view3d.js - the view labelled "spacetime" - invented one
// from per-type WELL_STRENGTH and WELL_FALLOFF tables, log10(1 + mass) and a
// Gaussian falloff, with a separate power-law branch for black holes.
//
// The two are unified onto js/potential.js. This file is the reason they stay
// unified, and it guards the property rather than the implementation: not "the
// tables are gone" alone, but "depth is a function of phi and of nothing else",
// which is the thing the tables broke.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import {
  DRAW_SOFTENING_FLOOR,
  POTENTIAL_SOURCE_CAP,
  decadesBelow,
  potentialAt,
  potentialSources,
  sheetDepth,
} from '../js/potential.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const read = f => readFileSync(path.join(here, '..', f), 'utf8');

const body = (mass, x, y, type = 'StarObject') => ({
  mass,
  pos: { x, y },
  alive: true,
  obj_type: type,
  id: `${type}-${mass}-${x}-${y}`,
});

describe('neither view carries its own potential', () => {
  const view3d = read('js/view3d.js');
  const overlay = read('js/vectorOverlay.js');

  test('the invented well and its tuning tables are gone', () => {
    for (const ghost of [
      'WELL_STRENGTH',
      'WELL_FALLOFF',
      'computeWellDepth',
      'OBJECT_ALTITUDE_SPREAD',
      'BLACK_HOLE_ALTITUDE_OFFSET',
    ]) {
      expect(view3d).not.toContain(ghost);
    }
  });

  test('both views import the field rather than computing one', () => {
    expect(view3d).toContain("from './potential.js'");
    expect(overlay).toContain("from './potential.js'");
    // The 2-D underlay keeps an unrolled inner loop for its own hot path, and
    // says so; what neither file may have is a second definition.
    expect(view3d).not.toMatch(/function\s+potentialAt\s*\(/);
    expect(overlay).not.toMatch(/function\s+potentialAt\s*\(/);
  });

  test('the sheet is deformed through the shared depth mapping', () => {
    expect(view3d).toMatch(/sheetDepth\(\s*\n?\s*potentialAt\(/);
  });

  test('both views are built from the same bodies', () => {
    // Sharing the equation is not enough if the two sum different lists. The
    // 3-D view used to leave the galaxies out.
    for (const kind of [
      'bh_list',
      'stars',
      'neutron_stars',
      'white_dwarfs',
      'galaxies',
      'gas_giants',
      'planets',
    ]) {
      expect(view3d).toContain(kind);
    }
    expect(view3d).toContain('potentialSources(');
  });
});

describe('depth is a function of the potential and of nothing else', () => {
  test('equal masses make equal wells whatever they are called', () => {
    // The defect the tables encoded: a one-solar-mass star and a one-solar-mass
    // black hole produced different wells. WELL_STRENGTH gave the hole 80 and
    // the star 25, and the hole took a different branch entirely.
    const star = body(1000, 0, 0, 'StarObject');
    const hole = body(1000, 0, 0, 'BlackHole');
    const at = { x: 140, y: -90 };
    const phiStar = potentialAt(at, 2, 0, [star]);
    const phiHole = potentialAt(at, 2, 0, [hole]);
    expect(phiHole).toBe(phiStar);
    expect(sheetDepth(phiHole, 1, 300, 2000)).toBe(
      sheetDepth(phiStar, 1, 300, 2000)
    );
  });

  test('the field falls as 1/r and keeps falling', () => {
    // The Gaussian this replaced had no tail: exp(-d^2 / 2*90^2) is 1e-12 by
    // 600 units, so the invented well simply stopped a few hundred units out
    // while the real one goes on forever.
    const s = [body(1000, 0, 0)];
    const phiAt = r => potentialAt({ x: r, y: 0 }, 2, 0, s);
    expect(phiAt(200) / phiAt(100)).toBeCloseTo(0.5, 12);
    expect(phiAt(2000) / phiAt(1000)).toBeCloseTo(0.5, 12);
    expect(phiAt(60000)).toBeLessThan(0);
  });

  test('depth is monotone in the potential', () => {
    const s = [body(1000, 0, 0)];
    let previous = -Infinity;
    for (let r = 20; r < 3000; r += 20) {
      const d = sheetDepth(
        potentialAt({ x: r, y: 0 }, 2, 0, s),
        0.1,
        300,
        2000
      );
      expect(d).toBeLessThanOrEqual(0);
      expect(d).toBeGreaterThanOrEqual(previous - 1e-9);
      previous = d;
    }
  });

  test('superposition holds: two bodies add, they do not blend', () => {
    const a = body(500, -200, 0);
    const b = body(300, 250, 60);
    const at = { x: 10, y: -30 };
    expect(potentialAt(at, 2, 0, [a, b])).toBeCloseTo(
      potentialAt(at, 2, 0, [a]) + potentialAt(at, 2, 0, [b]),
      12
    );
  });
});

describe('the softening floor is honest', () => {
  test('the drawn floor is the engine floor when the engine has one', () => {
    const s = [body(1000, 0, 0)];
    // Inside a softening of 50, the potential is constant at its value on the
    // softening radius - which is what the force law does too.
    const inside = potentialAt({ x: 5, y: 0 }, 2, 50, s);
    const onFloor = potentialAt({ x: 50, y: 0 }, 2, 50, s);
    expect(inside).toBe(onFloor);
  });

  test('with softening off the drawn field still returns a number', () => {
    // The shipped default is no softening, so 1/r has no value at a body's own
    // position and the drawing needs one anyway.
    const s = [body(1000, 0, 0)];
    const atBody = potentialAt({ x: 0, y: 0 }, 2, 0, s);
    expect(Number.isFinite(atBody)).toBe(true);
    expect(atBody).toBe(-(2 * 1000) / DRAW_SOFTENING_FLOOR);
  });

  test('the sheet bottoms out rather than running to infinity', () => {
    const s = [body(1000, 0, 0)];
    const atBody = potentialAt({ x: 0, y: 0 }, 2, 0, s);
    expect(sheetDepth(atBody, 1, 300, 2000)).toBe(-2000);
  });

  test('the floor depth is a stated number of decades', () => {
    // 2000 world units at 300 per decade: the sheet flattens 6.67 factors of
    // ten below its rim, which is the number the caption quotes.
    expect(2000 / 300).toBeCloseTo(6.667, 3);
    expect(sheetDepth(-1e7, 1, 300, 2000)).toBe(-2000);
    expect(sheetDepth(-100, 1, 300, 2000)).toBeCloseTo(-600, 9);
  });

  test('the caption quotes the constants the code uses', () => {
    const view3d = read('js/view3d.js');
    const perDecade = Number(
      /SHEET_DEPTH_PER_DECADE = (\d+)/.exec(view3d)?.[1]
    );
    const maxWell = Number(/SPACETIME_MAX_WELL = (\d+)/.exec(view3d)?.[1]);
    expect(perDecade).toBeGreaterThan(0);
    expect(maxWell).toBeGreaterThan(0);
    // The caption interpolates SHEET_FLOOR_DECADES, so the two cannot drift.
    expect(view3d).toContain('SHEET_FLOOR_DECADES');
    expect(view3d).toContain('view3d.sheetDisclosure');
    const en = read('js/i18n/en.js');
    expect(en).toContain("'view3d.sheetDisclosure'");
    expect(en).toContain('{decades}');
    const es = read('js/i18n/es.js');
    expect(es).toContain("'view3d.sheetDisclosure'");
    expect(es).toContain('{decades}');
  });
});

describe('the shared measure behaves', () => {
  test('decades below the reference is zero at the reference', () => {
    expect(decadesBelow(-5, -5)).toBe(0);
    expect(decadesBelow(-50, -5)).toBeCloseTo(1, 12);
    expect(decadesBelow(-500, -5)).toBeCloseTo(2, 12);
  });

  test('shallower than the reference clamps to zero rather than rising', () => {
    // A sheet vertex outside the reference corner must not arch upward.
    expect(decadesBelow(-1, -5)).toBe(0);
    expect(sheetDepth(-1, -5, 300, 2000)).toBe(-0);
  });

  test('an empty scene is a flat sheet, not a NaN one', () => {
    expect(potentialAt({ x: 1, y: 2 }, 2, 0, [])).toBe(0);
    expect(decadesBelow(0, 0)).toBe(0);
    expect(sheetDepth(0, 0, 300, 2000)).toBe(-0);
  });

  test('the source cap keeps both views to the same bodies', () => {
    const many = Array.from({ length: 200 }, (_, i) => body(i + 1, i * 10, 0));
    const picked = potentialSources(many);
    expect(picked).toHaveLength(POTENTIAL_SOURCE_CAP);
    expect(picked[0].mass).toBe(200);
    expect(picked.every(s => s.mass > 0)).toBe(true);
  });

  test('dead and massless bodies do not deform anything', () => {
    const live = body(1000, 0, 0);
    const dead = { ...body(1e9, 5, 5), alive: false };
    expect(potentialSources([live, dead])).toEqual([live]);
  });
});
