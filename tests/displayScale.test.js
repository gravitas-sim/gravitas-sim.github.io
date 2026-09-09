// =============================================================================
// The displayed size of a body, and the three other radii it is not
// -----------------------------------------------------------------------------
// The model radii make a Sun-like star three times an Earth-like planet and
// under twice a Jupiter. The real ratios are 109 and 9.7. Neither number can be
// drawn: the first is a different claim about the world, the second puts the
// Earth below a pixel in any picture that also contains the Sun.
//
// So the drawing uses a compressed scale, and these are the properties that
// make the compression defensible rather than arbitrary: it hits its stated
// targets, it is monotonic, it never touches the model radius, and the three
// other sizes a body has - analytic, hit-target, marker floor - are unaffected
// by it.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import {
  DISPLAY_FACTOR,
  displayFactorFor,
  displayRadius,
  drawnRadius,
  drawnRadiusPx,
  markerFloorPx,
  hitRadius,
  HIT_MIN_PX,
  DISPLAY_MIN_PX,
  DISPLAY_MIN_PX_CROWDED,
  CROWD_SOFT_START,
  CROWD_SOFT_END,
} from '../js/bodyVisuals.js';

// The Solar System's own model radii, which is what the targets are set on.
const SOL = 15;
const JUPITER = 8;
const EARTH = 5;

const ratio = (a, b) => displayRadius(...a) / displayRadius(...b);

describe('the compressed hierarchy hits its targets', () => {
  test('a Sun-like star is 6 to 10 times an Earth-like planet', () => {
    const r = ratio([SOL, 'Star'], [EARTH, 'Planet']);
    expect(r).toBeGreaterThanOrEqual(6);
    expect(r).toBeLessThanOrEqual(10);
  });

  test('a Sun-like star is 3 to 5 times a Jupiter-like giant', () => {
    const r = ratio([SOL, 'Star'], [JUPITER, 'GasGiant']);
    expect(r).toBeGreaterThanOrEqual(3);
    expect(r).toBeLessThanOrEqual(5);
  });

  test('gas giants are drawn larger than rocky planets', () => {
    expect(ratio([JUPITER, 'GasGiant'], [EARTH, 'Planet'])).toBeGreaterThan(
      1.4
    );
    // And the same is true body for body at equal model radius, which is what
    // says it is the family and not the mass doing the work.
    expect(displayRadius(6, 'GasGiant')).toBeGreaterThan(
      displayRadius(6, 'Planet')
    );
  });

  test('white dwarfs are smaller than ordinary stars', () => {
    expect(DISPLAY_FACTOR.WhiteDwarf).toBeLessThan(DISPLAY_FACTOR.Star);
    expect(displayRadius(8, 'WhiteDwarf')).toBeLessThan(
      displayRadius(8, 'Star')
    );
  });

  test('the exaggeration is reduced, not reversed', () => {
    // The old drawing was the model radius itself: 3.0 and 1.9. The new one is
    // more compressed than reality and much less compressed than that.
    const sunEarth = ratio([SOL, 'Star'], [EARTH, 'Planet']);
    const sunJup = ratio([SOL, 'Star'], [JUPITER, 'GasGiant']);
    expect(sunEarth).toBeGreaterThan(SOL / EARTH);
    expect(sunEarth).toBeLessThan(109);
    expect(sunJup).toBeGreaterThan(SOL / JUPITER);
    expect(sunJup).toBeLessThan(9.7);
  });

  test('stars are drawn exactly as before, so nothing grew', () => {
    expect(DISPLAY_FACTOR.Star).toBe(1);
    for (const [type, factor] of Object.entries(DISPLAY_FACTOR)) {
      expect([type, factor <= 1]).toEqual([type, true]);
    }
  });

  test('a black hole keeps its own documented policy', () => {
    expect(displayFactorFor('BlackHole')).toBe(1);
    expect(displayRadius(8, 'BlackHole')).toBe(8);
  });
});

describe('within a family, bigger is bigger', () => {
  test.each(Object.keys(DISPLAY_FACTOR))('%s is monotonic', type => {
    let last = -Infinity;
    for (const modelRadius of [0.5, 1, 2, 5, 8, 12, 30]) {
      const r = displayRadius(modelRadius, type);
      expect(r).toBeGreaterThan(last);
      last = r;
    }
  });

  test('and proportional, so a doubling stays a doubling', () => {
    expect(displayRadius(10, 'Planet')).toBeCloseTo(
      2 * displayRadius(5, 'Planet'),
      10
    );
  });

  test('an unknown family is left alone rather than guessed at', () => {
    expect(displayRadius(7, 'Tardis')).toBe(7);
  });

  test('nonsense in, nothing out', () => {
    for (const bad of [0, -3, NaN, undefined, null]) {
      expect(displayRadius(bad, 'Planet')).toBe(0);
    }
  });
});

describe('the visibility floor', () => {
  test('a body too small to see is drawn at the floor', () => {
    // An Earth at a whole-system zoom is a fifth of a pixel.
    const px = drawnRadiusPx(EARTH, 'Planet', 0.25);
    expect(px).toBeCloseTo(DISPLAY_MIN_PX, 6);
  });

  test('and grows out of it smoothly as the view zooms in', () => {
    let last = 0;
    for (let zoom = 0.1; zoom < 20; zoom *= 1.15) {
      const px = drawnRadiusPx(EARTH, 'Planet', zoom);
      // Never smaller than the floor, never a step, never going backwards.
      expect(px).toBeGreaterThanOrEqual(DISPLAY_MIN_PX - 1e-9);
      expect(px).toBeGreaterThanOrEqual(last - 1e-9);
      if (last > 0) expect(px / last).toBeLessThan(1.16);
      last = px;
    }
  });

  test('above the floor the ratios are the ones that were promised', () => {
    // Zoomed in far enough that nothing is floored, the hierarchy is exact.
    const zoom = 4;
    const sun = drawnRadiusPx(SOL, 'Star', zoom);
    const earth = drawnRadiusPx(EARTH, 'Planet', zoom);
    const jup = drawnRadiusPx(JUPITER, 'GasGiant', zoom);
    expect(earth).toBeGreaterThan(DISPLAY_MIN_PX);
    expect(sun / earth).toBeCloseTo(8, 1);
    expect(sun / jup).toBeCloseTo(4, 1);
  });

  test('a crowded field gets a smaller floor, so it stays a field', () => {
    expect(markerFloorPx(0)).toBe(DISPLAY_MIN_PX);
    expect(markerFloorPx(1000)).toBe(DISPLAY_MIN_PX_CROWDED);
    expect(DISPLAY_MIN_PX_CROWDED).toBeLessThan(DISPLAY_MIN_PX);
  });

  test('and it arrives gradually rather than at a threshold', () => {
    // A collision that takes a scene across the boundary used to double the
    // size of every body on screen between one frame and the next.
    // Measured one body at a time, because one body at a time is how a scene
    // crosses the boundary: a collision merges two into one, an asteroid is
    // absorbed. The floor may move, but not by an amount anybody can see.
    let last = markerFloorPx(0);
    let worst = 0;
    for (let n = 0; n <= 500; n++) {
      const floor = markerFloorPx(n);
      expect(floor).toBeLessThanOrEqual(last + 1e-9);
      worst = Math.max(worst, Math.abs(floor - last));
      last = floor;
    }
    // A fiftieth of a pixel. The step it replaced was 1.4 pixels, in one frame.
    expect(worst).toBeLessThan(0.02);
    expect(markerFloorPx(CROWD_SOFT_START)).toBe(DISPLAY_MIN_PX);
    expect(markerFloorPx(CROWD_SOFT_END)).toBe(DISPLAY_MIN_PX_CROWDED);
  });

  test('neutron stars, comets and asteroids live on the floor', () => {
    // Which is honest: a neutron star is twenty kilometres across.
    for (const [r, type] of [
      [3, 'NeutronStar'],
      [2, 'Asteroid'],
      [1.6, 'Comet'],
    ]) {
      expect(drawnRadiusPx(r, type, 1)).toBeCloseTo(DISPLAY_MIN_PX, 6);
    }
  });
});

describe('the hit target is a different number', () => {
  test('a shrunken planet is no harder to click', () => {
    const zoom = 1;
    const drawn = drawnRadius(EARTH, 'Planet', zoom);
    const hit = hitRadius(EARTH, 'Planet', zoom);
    expect(hit).toBeGreaterThan(drawn);
    // Exactly what it was before the display policy existed: the model radius
    // or the pixel floor, and nothing about the drawing.
    expect(hit).toBe(Math.max(EARTH, HIT_MIN_PX.Planet / zoom));
  });

  test('it does not move when the display factor does', () => {
    for (const type of Object.keys(HIT_MIN_PX)) {
      for (const zoom of [0.25, 1, 8]) {
        expect(hitRadius(6, type, zoom)).toBe(
          Math.max(6, HIT_MIN_PX[type] / zoom)
        );
      }
    }
  });

  test('zooming out makes the target bigger in world units, not smaller', () => {
    expect(hitRadius(1, 'Asteroid', 0.1)).toBeGreaterThan(
      hitRadius(1, 'Asteroid', 10)
    );
  });
});

describe('the display functions cannot change a body', () => {
  test('they take numbers, not objects', () => {
    // Stated as a test because it is the guarantee: there is no argument here
    // that could be mutated, so no draw path can write to a body through this
    // module however carelessly it is called.
    for (const fn of [displayRadius, drawnRadius, drawnRadiusPx, hitRadius]) {
      expect(typeof fn).toBe('function');
    }
    const body = Object.freeze({ radius: 5, id: 3 });
    // A frozen body would throw on assignment; passing its radius cannot.
    expect(() => displayRadius(body.radius, 'Planet')).not.toThrow();
    expect(() => drawnRadius(body.radius, 'Planet', 2, 10)).not.toThrow();
    expect(() => hitRadius(body.radius, 'Planet', 2)).not.toThrow();
    expect(body.radius).toBe(5);
  });

  test('the factor table is frozen', () => {
    expect(Object.isFrozen(DISPLAY_FACTOR)).toBe(true);
    expect(Object.isFrozen(HIT_MIN_PX)).toBe(true);
  });
});
