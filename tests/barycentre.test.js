// =============================================================================
// The point two stars are both going round
// -----------------------------------------------------------------------------
// js/lesson/barycentre.js is pure, so this needs no simulation and no DOM: the
// arithmetic "Weighing the Stars" is built on, checked against cases whose
// answers can be written down by hand.
//
// The distinction the file draws is the one worth testing hardest.
// barycentreOf() is a definition and holds for anything; circularBinary() is a
// restricted model and must refuse inputs it cannot answer for rather than
// returning a number that looks like an answer.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import {
  barycentreOf,
  circularBinary,
  distancesFromBarycentre,
  splitByArms,
  totalMassFromOrbit,
} from '../js/lesson/barycentre.js';

const at = (x, y, mass) => ({ pos: { x, y }, mass });

describe('the balance point is a definition, not a model', () => {
  test('equal masses balance halfway between them', () => {
    const c = barycentreOf([at(-100, 0, 5), at(100, 0, 5)]);
    expect(c.x).toBeCloseTo(0, 12);
    expect(c.y).toBeCloseTo(0, 12);
    expect(c.mass).toBe(10);
  });

  test('three times the mass sits a third of the distance out', () => {
    const c = barycentreOf([at(0, 0, 3), at(400, 0, 1)]);
    expect(c.x).toBeCloseTo(100, 12);
  });

  test('it holds off-axis and away from the origin, because it is a mean', () => {
    const c = barycentreOf([at(10, 40, 2), at(30, 20, 2)]);
    expect(c).toMatchObject({ x: 20, y: 30 });
  });

  test('a body with no mass or no position is not averaged in', () => {
    const c = barycentreOf([
      at(0, 0, 4),
      at(100, 0, 0),
      { pos: { x: 999, y: 999 } },
      { mass: 5 },
      at(200, 0, 4),
    ]);
    expect(c.count).toBe(2);
    expect(c.x).toBeCloseTo(100, 12);
  });

  test('nothing to average over is null, not the origin', () => {
    // The origin is a real place. Returning it for "no answer" would draw a
    // balance point in the middle of an empty scene.
    expect(barycentreOf([])).toBeNull();
    expect(barycentreOf(null)).toBeNull();
    expect(barycentreOf([at(0, 0, -3)])).toBeNull();
  });

  test('the arm lengths are the inverse of the mass ratio', () => {
    const arms = distancesFromBarycentre([at(0, 0, 3), at(400, 0, 1)]);
    // This one relationship is the entire measurement method of the lesson.
    expect(arms[1].r / arms[0].r).toBeCloseTo(3, 12);
  });
});

describe('a circular pair is a restricted model and says so', () => {
  test('the heavier star gets the shorter arm and the slower speed', () => {
    const ic = circularBinary({ m1: 3, m2: 1, separation: 400, G: 1 });
    expect(ic.r1).toBeCloseTo(100, 12);
    expect(ic.r2).toBeCloseTo(300, 12);
    expect(Math.abs(ic.velocities[0].y)).toBeLessThan(
      Math.abs(ic.velocities[1].y)
    );
  });

  test('the net momentum is zero, so the balance point stays put', () => {
    const ic = circularBinary({ m1: 3, m2: 1, separation: 400, G: 1 });
    const px = 3 * ic.velocities[0].x + 1 * ic.velocities[1].x;
    const py = 3 * ic.velocities[0].y + 1 * ic.velocities[1].y;
    expect(px).toBeCloseTo(0, 12);
    expect(py).toBeCloseTo(0, 12);
  });

  test('the period is Newton’s form of Kepler’s third law', () => {
    const ic = circularBinary({ m1: 3, m2: 1, separation: 400, G: 1 });
    expect(ic.period).toBeCloseTo(2 * Math.PI * Math.sqrt(400 ** 3 / 4), 9);
    // And the round trip closes: a measured period and separation give the
    // total mass back, which is what the lesson actually asks a student to do.
    expect(totalMassFromOrbit(400, ic.period, 1)).toBeCloseTo(4, 9);
  });

  test('an impossible pair is null rather than a number', () => {
    for (const bad of [
      { m1: 0, m2: 1, separation: 400, G: 1 },
      { m1: 1, m2: -1, separation: 400, G: 1 },
      { m1: 1, m2: 1, separation: 0, G: 1 },
      { m1: 1, m2: 1, separation: 400, G: 0 },
      { m1: NaN, m2: 1, separation: 400, G: 1 },
    ]) {
      expect(circularBinary(bad)).toBeNull();
    }
  });
});

describe('splitting a measured total between the two', () => {
  test('the shorter arm takes the larger share', () => {
    const split = splitByArms(4, 100, 300);
    expect(split.m1).toBeCloseTo(3, 12);
    expect(split.m2).toBeCloseTo(1, 12);
  });

  test('equal arms split it evenly', () => {
    expect(splitByArms(4, 200, 200)).toEqual({ m1: 2, m2: 2 });
  });

  test('degenerate arms give no split rather than a guess', () => {
    expect(splitByArms(4, 0, 0)).toBeNull();
    expect(splitByArms(0, 100, 300)).toBeNull();
  });

  test('the split of a modelled pair returns the masses it was built from', () => {
    const ic = circularBinary({ m1: 3, m2: 1, separation: 400, G: 1 });
    const total = totalMassFromOrbit(400, ic.period, 1);
    const split = splitByArms(total, ic.r1, ic.r2);
    expect(split.m1).toBeCloseTo(3, 9);
    expect(split.m2).toBeCloseTo(1, 9);
  });
});
