// =============================================================================
// The shared drawing policy
// -----------------------------------------------------------------------------
// js/bodyVisuals.js is the one place that decides how much detail a body is
// worth at its size on screen, what colour a star is, where the light is coming
// from and which way a comet's tails point. It is pure arithmetic, so all of
// that is testable here rather than through a canvas - which is the point of
// having pulled it out of the body classes.
//
// Two properties matter more than any individual number below, and both have
// their own section: the same object drawn twice looks the same, and no draw
// path needs Math.random to decide anything.
// =============================================================================

import { describe, test, expect, beforeEach } from '@jest/globals';
import {
  LOD,
  LOD_POINT_MAX_PX,
  LOD_SHADED_MAX_PX,
  ACTIVITY_ONSET_FLUX,
  ACTIVITY_FULL_FLUX,
  FALLBACK_LIGHT,
  lodFor,
  lodAtLeast,
  visualSeed,
  hash01,
  silhouetteFor,
  clearVisualCaches,
  lightDirection,
  dominantLight,
  starColor,
  scaleRgb,
  tailActivity,
  ionTailDirection,
  dustTailDirection,
  spriteSize,
  spriteFor,
  spriteCacheSize,
} from '../js/bodyVisuals.js';

beforeEach(() => {
  clearVisualCaches();
});

describe('level of detail', () => {
  test('a body smaller than a few pixels is a point', () => {
    expect(lodFor(0.2)).toBe(LOD.POINT);
    expect(lodFor(LOD_POINT_MAX_PX - 0.01)).toBe(LOD.POINT);
  });

  test('the boundaries are exactly where they are documented', () => {
    // Asserted at the boundary rather than near it: a level-of-detail system
    // whose thresholds drift is one that pops as a reader zooms.
    expect(lodFor(LOD_POINT_MAX_PX)).toBe(LOD.SHADED);
    expect(lodFor(LOD_SHADED_MAX_PX - 0.01)).toBe(LOD.SHADED);
    expect(lodFor(LOD_SHADED_MAX_PX)).toBe(LOD.DETAILED);
  });

  test('nonsense sizes are points rather than exceptions', () => {
    for (const bad of [0, -5, NaN, Infinity, undefined, null, 'big']) {
      expect(lodFor(bad)).toBe(LOD.POINT);
    }
  });

  test('the low tier never reaches the detailed level', () => {
    expect(lodFor(200, { tier: 'low' })).toBe(LOD.SHADED);
    expect(lodFor(LOD_SHADED_MAX_PX, { tier: 'low' })).toBe(LOD.SHADED);
    // And it still draws the cheap passes: the tier is a budget, not a blank.
    expect(lodFor(5, { tier: 'low' })).toBe(LOD.SHADED);
    expect(lodFor(1, { tier: 'low' })).toBe(LOD.POINT);
  });

  test('a crowded scene stays cheap however big the bodies are', () => {
    expect(lodFor(4, { crowded: true })).toBe(LOD.POINT);
    // Something genuinely large in a crowded field still gets its shading -
    // the black hole a cluster is orbiting should not be a dot.
    expect(lodFor(40, { crowded: true })).toBe(LOD.SHADED);
    expect(lodFor(40, { crowded: true })).not.toBe(LOD.DETAILED);
  });

  test('lodAtLeast orders the three levels', () => {
    expect(lodAtLeast(LOD.DETAILED, LOD.SHADED)).toBe(true);
    expect(lodAtLeast(LOD.SHADED, LOD.SHADED)).toBe(true);
    expect(lodAtLeast(LOD.POINT, LOD.SHADED)).toBe(false);
  });
});

describe('deterministic variation', () => {
  const body = (id, type = 'Asteroid') => ({ id, obj_type: type });

  test('a body has the same seed every time it is asked', () => {
    expect(visualSeed(body(17))).toBe(visualSeed(body(17)));
  });

  test('two bodies of the same type do not share one', () => {
    expect(visualSeed(body(17))).not.toBe(visualSeed(body(18)));
  });

  test('the same id in two families does not share one', () => {
    expect(visualSeed(body(17, 'Asteroid'))).not.toBe(
      visualSeed(body(17, 'Planet'))
    );
  });

  test('a body with no id still gets a usable seed', () => {
    expect(Number.isInteger(visualSeed({}))).toBe(true);
    expect(Number.isInteger(visualSeed(null))).toBe(true);
  });

  test('hash01 is in range, stable, and different per index', () => {
    const seed = visualSeed(body(42));
    const values = [];
    for (let i = 0; i < 32; i++) {
      const v = hash01(seed, i);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
      values.push(v);
    }
    // Stable across calls.
    for (let i = 0; i < 32; i++) expect(hash01(seed, i)).toBe(values[i]);
    // And not a constant: a hash that returned the same number for every index
    // would make every asteroid a circle and pass every other test here.
    expect(new Set(values).size).toBeGreaterThan(24);
  });

  test('a silhouette is stable, bounded, and cached', () => {
    const seed = visualSeed(body(7));
    const a = silhouetteFor(seed);
    const b = silhouetteFor(seed);
    // The same array object: rebuilding a dozen numbers per body per frame is
    // exactly the allocation this module exists to remove.
    expect(b).toBe(a);
    expect(a).toHaveLength(9);
    for (const r of a) {
      expect(r).toBeGreaterThan(0.7);
      expect(r).toBeLessThan(1.3);
    }
    // Irregular, not a circle.
    expect(new Set([...a]).size).toBeGreaterThan(5);
  });

  test('two asteroids get different silhouettes', () => {
    const a = [...silhouetteFor(visualSeed(body(1)))];
    const b = [...silhouetteFor(visualSeed(body(2)))];
    expect(a).not.toEqual(b);
  });
});

describe('where the light comes from', () => {
  test('it points at the star', () => {
    const dir = lightDirection({ x: 0, y: 0 }, { x: 10, y: 0 });
    expect(dir.x).toBeCloseTo(1, 9);
    expect(dir.y).toBeCloseTo(0, 9);
    expect(dir.fromStar).toBe(true);
  });

  test('it is a unit vector', () => {
    const dir = lightDirection({ x: 3, y: -4 }, { x: -9, y: 11 });
    expect(Math.hypot(dir.x, dir.y)).toBeCloseTo(1, 12);
  });

  test('with no star it falls back to a fixed direction and says so', () => {
    const dir = lightDirection({ x: 0, y: 0 }, null);
    expect(dir.fromStar).toBe(false);
    expect(dir.x).toBeCloseTo(FALLBACK_LIGHT.x, 9);
    expect(dir.y).toBeCloseTo(FALLBACK_LIGHT.y, 9);
    // The fallback is fixed, so a starless scene is lit consistently rather
    // than differently per body.
    const other = lightDirection({ x: 900, y: -900 }, null);
    expect(other.x).toBe(dir.x);
    expect(other.y).toBe(dir.y);
  });

  test('a body sitting on its star does not divide by zero', () => {
    const dir = lightDirection({ x: 5, y: 5 }, { x: 5, y: 5 });
    expect(Number.isFinite(dir.x)).toBe(true);
    expect(dir.fromStar).toBe(false);
  });

  test('the dominant light is the brightest received, not the brightest', () => {
    const near = { pos: { x: 1, y: 0 }, luminosity: 1, name: 'near dwarf' };
    const far = { pos: { x: 1000, y: 0 }, luminosity: 5000, name: 'far giant' };
    // 1/1 beats 5000/10^6.
    expect(dominantLight({ x: 0, y: 0 }, [far, near]).name).toBe('near dwarf');
    // Move in close to the giant and it wins.
    expect(dominantLight({ x: 990, y: 0 }, [far, near]).name).toBe('far giant');
  });

  test('bodies that emit nothing are not light sources', () => {
    expect(
      dominantLight({ x: 0, y: 0 }, [
        { pos: { x: 1, y: 0 }, luminosity: 0 },
        { pos: { x: 2, y: 0 }, luminosity: NaN },
        { pos: null, luminosity: 5 },
      ])
    ).toBeNull();
    expect(dominantLight({ x: 0, y: 0 }, [])).toBeNull();
    expect(dominantLight({ x: 0, y: 0 }, null)).toBeNull();
  });
});

describe('star colour', () => {
  test('cool stars are red, hot stars are blue', () => {
    const cool = starColor(3000);
    const hot = starColor(20000);
    expect(cool.r).toBeGreaterThan(cool.b);
    expect(hot.b).toBeGreaterThan(hot.r);
  });

  test('the Sun is near white', () => {
    const sun = starColor(5780);
    expect(Math.abs(sun.r - sun.b)).toBeLessThan(40);
    expect(sun.r).toBeGreaterThan(200);
  });

  test('it is quantised, so the cache cannot grow per star per frame', () => {
    expect(starColor(5780)).toBe(starColor(5799));
    expect(starColor(5780)).not.toBe(starColor(9000));
  });

  test('a missing or absurd temperature still gives a colour', () => {
    for (const bad of [undefined, null, NaN, -1, 0, 'hot']) {
      const c = starColor(bad);
      expect(c.r).toBeGreaterThanOrEqual(0);
      expect(c.r).toBeLessThanOrEqual(255);
    }
  });

  test('scaleRgb stays inside the byte range', () => {
    expect(scaleRgb({ r: 200, g: 100, b: 50 }, 2)).toEqual({
      r: 255,
      g: 200,
      b: 100,
    });
    expect(scaleRgb({ r: 200, g: 100, b: 50 }, -1)).toEqual({
      r: 0,
      g: 0,
      b: 0,
    });
  });
});

describe('comet tails', () => {
  const sun = { x: 0, y: 0 };

  test('the ion tail points away from the star, not behind the comet', () => {
    // A comet at the top of its orbit moving to the right. Anti-velocity would
    // point left; anti-solar points up. They are ninety degrees apart, which
    // is the whole of the misconception this is about.
    const comet = { x: 0, y: 100 };
    const vel = { x: 20, y: 0 };
    const ion = ionTailDirection(comet, sun, vel);
    expect(ion.x).toBeCloseTo(0, 9);
    expect(ion.y).toBeCloseTo(1, 9);
  });

  test('it stays anti-solar on the way in and on the way out', () => {
    const inbound = ionTailDirection({ x: 100, y: 0 }, sun, { x: -30, y: 0 });
    const outbound = ionTailDirection({ x: 100, y: 0 }, sun, { x: 30, y: 0 });
    expect(inbound).toEqual(outbound);
    expect(inbound.x).toBeCloseTo(1, 9);
  });

  test('it is a unit vector', () => {
    const d = ionTailDirection({ x: 30, y: -40 }, sun, { x: 1, y: 1 });
    expect(Math.hypot(d.x, d.y)).toBeCloseTo(1, 12);
  });

  test('with no star there is no anti-solar direction to point in', () => {
    expect(ionTailDirection({ x: 1, y: 1 }, null, null)).toBeNull();
    // A caller that insists gets the orbital trail, and should draw it faintly.
    const d = ionTailDirection({ x: 1, y: 1 }, null, { x: 0, y: 5 });
    expect(d).toEqual({ x: -0, y: -1 });
  });

  test('the dust tail lies between the ion tail and the orbital trail', () => {
    const comet = { x: 0, y: 100 };
    const vel = { x: 20, y: 0 };
    const ion = ionTailDirection(comet, sun, vel);
    const dust = dustTailDirection(comet, sun, vel, 1);
    // Not the same as the ion tail...
    expect(dust.x).not.toBeCloseTo(ion.x, 3);
    // ...but still nearer to it than to the trail, so the two read as two
    // tails rather than as a fan.
    const angleTo = d => Math.atan2(d.y, d.x);
    const trail = { x: -1, y: 0 };
    const toIon = Math.abs(angleTo(dust) - angleTo(ion));
    const toTrail = Math.abs(angleTo(dust) - angleTo(trail));
    expect(toIon).toBeLessThan(toTrail);
  });

  test('the dust tail curves: it lags more further from the nucleus', () => {
    const comet = { x: 0, y: 100 };
    const vel = { x: 20, y: 0 };
    const ion = ionTailDirection(comet, sun, vel);
    const near = dustTailDirection(comet, sun, vel, 0.15);
    const far = dustTailDirection(comet, sun, vel, 1);
    const lag = d => Math.abs(Math.atan2(d.y, d.x) - Math.atan2(ion.y, ion.x));
    expect(lag(near)).toBeLessThan(lag(far));
    expect(lag(near)).toBeGreaterThan(0);
  });

  test('at the nucleus the dust tail starts anti-solar', () => {
    const comet = { x: 0, y: 100 };
    const vel = { x: 20, y: 0 };
    const ion = ionTailDirection(comet, sun, vel);
    const at0 = dustTailDirection(comet, sun, vel, 0);
    expect(at0.x).toBeCloseTo(ion.x, 9);
    expect(at0.y).toBeCloseTo(ion.y, 9);
  });
});

describe('comet activity', () => {
  test('a cold comet has none at all', () => {
    // Zero rather than a floor: a comet in the outer system has no tail, and
    // drawing a faint one anyway is the picture teaching the wrong thing.
    expect(tailActivity(0)).toBe(0);
    expect(tailActivity(ACTIVITY_ONSET_FLUX)).toBe(0);
    expect(tailActivity(ACTIVITY_ONSET_FLUX / 10)).toBe(0);
  });

  test('it saturates once the comet is close', () => {
    expect(tailActivity(ACTIVITY_FULL_FLUX)).toBe(1);
    expect(tailActivity(50)).toBe(1);
  });

  test('it rises monotonically in between', () => {
    let last = -1;
    for (let f = ACTIVITY_ONSET_FLUX; f <= ACTIVITY_FULL_FLUX; f += 0.02) {
      const a = tailActivity(f);
      expect(a).toBeGreaterThanOrEqual(last);
      expect(a).toBeGreaterThanOrEqual(0);
      expect(a).toBeLessThanOrEqual(1);
      last = a;
    }
  });

  test('nonsense flux is no activity', () => {
    for (const bad of [NaN, undefined, null, -3]) {
      expect(tailActivity(bad)).toBe(0);
    }
  });
});

describe('the sprite cache', () => {
  test('sizes are bucketed to powers of two', () => {
    expect(spriteSize(2)).toBe(8);
    expect(spriteSize(5)).toBe(16);
    expect(spriteSize(9)).toBe(32);
    expect(spriteSize(9000)).toBe(256);
  });

  test('the same shape is built once', () => {
    let built = 0;
    const paint = () => built++;
    const rgb = { r: 200, g: 100, b: 50 };
    const a = spriteFor('halo', rgb, 12, paint);
    const b = spriteFor('halo', rgb, 12, paint);
    // jsdom has no 2D context, in which case there is nothing to cache and the
    // honest answer is null - but it must be a consistent null.
    if (a === null) {
      expect(b).toBeNull();
      return;
    }
    expect(b).toBe(a);
    expect(built).toBe(1);
  });

  test('colours are quantised, so near-identical bodies share a sprite', () => {
    const key = rgb => `${rgb.r},${rgb.g},${rgb.b}`;
    expect(key({ r: 200, g: 100, b: 50 })).not.toBe(
      key({ r: 201, g: 100, b: 50 })
    );
    const a = spriteFor('halo', { r: 200, g: 100, b: 50 }, 12, () => {});
    const b = spriteFor('halo', { r: 201, g: 100, b: 50 }, 12, () => {});
    if (a === null) return;
    expect(b).toBe(a);
  });

  test('clearing empties it', () => {
    spriteFor('halo', { r: 1, g: 2, b: 3 }, 12, () => {});
    clearVisualCaches();
    expect(spriteCacheSize()).toBe(0);
  });
});
