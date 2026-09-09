// =============================================================================
// Ring systems
// -----------------------------------------------------------------------------
// A quarter of generated gas giants are drawn with rings. Everything about a
// system - whether there is one, its position angle, how far from edge-on it
// is, its bands, its gaps, its colour - comes from the body's own visual seed,
// which comes from its id. That is what makes the sky the same after a reset, a
// reload, a share link, a screenshot and an A/B run, and it is the property
// that the previous implementation, which used Math.random in a constructor,
// did not have.
//
// And none of it is physics. The rings reach two and a half planetary radii;
// the planet's model radius, its gravity, its collisions, its Roche limit, its
// transit depth and its hit target are all exactly what they were.
// =============================================================================

import { describe, test, expect, beforeEach } from '@jest/globals';
import {
  RING_FRACTION,
  hasRingsForSeed,
  ringGeometryFor,
  visualSeed,
  clearVisualCaches,
  displayRadius,
  RING_INNER_MIN,
  RING_INNER_MAX,
  RING_OUTER_MIN,
  RING_OUTER_MAX,
  RING_FLATTEN_MIN,
  RING_FLATTEN_MAX,
} from '../js/bodyVisuals.js';
import { GasGiant, setStateReference } from '../js/physics.js';

beforeEach(() => {
  clearVisualCaches();
  setStateReference({
    zoom: 1,
    pan: { x: 0, y: 0 },
    paused: true,
    selectedObject: null,
    orbit_helper: { preview: null },
    mouse: { x: 0, y: 0 },
  });
});

describe('how many giants have them', () => {
  test('about a quarter, over a large sample', () => {
    let ringed = 0;
    const n = 4000;
    for (let seed = 0; seed < n; seed++) {
      if (hasRingsForSeed(seed)) ringed++;
    }
    const fraction = ringed / n;
    expect(fraction).toBeGreaterThan(RING_FRACTION - 0.03);
    expect(fraction).toBeLessThan(RING_FRACTION + 0.03);
  });

  test('and the same quarter every time it is asked', () => {
    for (let seed = 0; seed < 200; seed++) {
      expect(hasRingsForSeed(seed)).toBe(hasRingsForSeed(seed));
    }
  });

  test('the fraction is a stated choice, not an occurrence rate', () => {
    // Recorded here so that changing it is a deliberate edit to a documented
    // number rather than a drifting constant.
    expect(RING_FRACTION).toBe(0.25);
  });
});

describe('the geometry is stable and in range', () => {
  const seeds = [1, 7, 42, 1234, 99999, 0xbeef];

  test.each(seeds)('seed %i gives the same geometry twice', seed => {
    const a = ringGeometryFor(seed);
    clearVisualCaches();
    const b = ringGeometryFor(seed);
    expect(b).toEqual(a);
  });

  test('different seeds give different systems', () => {
    const angles = new Set(seeds.map(s => ringGeometryFor(s).angle));
    expect(angles.size).toBeGreaterThan(1);
  });

  test.each(seeds)('seed %i sits inside the illustrative bounds', seed => {
    const g = ringGeometryFor(seed);
    expect(g.inner).toBeGreaterThanOrEqual(RING_INNER_MIN);
    expect(g.inner).toBeLessThanOrEqual(RING_INNER_MAX);
    expect(g.outer).toBeGreaterThanOrEqual(RING_OUTER_MIN);
    expect(g.outer).toBeLessThanOrEqual(RING_OUTER_MAX);
    expect(g.inner).toBeLessThan(g.outer);
  });

  test('never collapses to an unreadable line, never quite face on', () => {
    for (let seed = 0; seed < 500; seed++) {
      const g = ringGeometryFor(seed);
      expect(g.flatten).toBeGreaterThanOrEqual(RING_FLATTEN_MIN);
      expect(g.flatten).toBeLessThanOrEqual(RING_FLATTEN_MAX);
    }
  });

  test('but some systems really are nearly edge on', () => {
    const flattens = [];
    for (let seed = 0; seed < 500; seed++) {
      flattens.push(ringGeometryFor(seed).flatten);
    }
    expect(Math.min(...flattens)).toBeLessThan(0.2);
    expect(Math.max(...flattens)).toBeGreaterThan(0.45);
  });

  test('the position angle covers the sky, not one favourite tilt', () => {
    const angles = [];
    for (let seed = 0; seed < 500; seed++) {
      angles.push(ringGeometryFor(seed).angle);
    }
    expect(Math.min(...angles)).toBeLessThan(0.2);
    expect(Math.max(...angles)).toBeGreaterThan(Math.PI - 0.2);
  });

  test('the bands are concentric, separated and inside the system', () => {
    for (let seed = 0; seed < 200; seed++) {
      const g = ringGeometryFor(seed);
      expect(g.bands.length).toBeGreaterThanOrEqual(3);
      let prevOuter = 0;
      for (const band of g.bands) {
        expect(band.r0).toBeGreaterThanOrEqual(g.inner - 1e-9);
        expect(band.r1).toBeLessThanOrEqual(g.outer + 1e-9);
        expect(band.r1).toBeGreaterThan(band.r0);
        // A real gap between this band and the last, not a shared edge.
        if (prevOuter) expect(band.r0).toBeGreaterThan(prevOuter);
        prevOuter = band.r1;
        expect(band.alpha).toBeGreaterThan(0);
        expect(band.alpha).toBeLessThanOrEqual(1);
      }
    }
  });

  test('most systems carry a Cassini-like division, inside the rings', () => {
    let withDivision = 0;
    for (let seed = 0; seed < 300; seed++) {
      const g = ringGeometryFor(seed);
      if (!g.cassini) continue;
      withDivision++;
      expect(g.cassini.r0).toBeGreaterThan(g.inner);
      expect(g.cassini.r1).toBeLessThan(g.outer);
      expect(g.cassini.r1).toBeGreaterThan(g.cassini.r0);
    }
    expect(withDivision).toBeGreaterThan(150);
    expect(withDivision).toBeLessThan(300);
  });

  test('the colour is restrained rather than decorative', () => {
    for (let seed = 0; seed < 200; seed++) {
      const { tint } = ringGeometryFor(seed);
      for (const channel of [tint.r, tint.g, tint.b]) {
        expect(channel).toBeGreaterThan(150);
        expect(channel).toBeLessThanOrEqual(255);
      }
      // Icy grey through warm tan: never a saturated hue.
      const spread =
        Math.max(tint.r, tint.g, tint.b) - Math.min(tint.r, tint.g, tint.b);
      expect(spread).toBeLessThan(80);
    }
  });

  test('everything it returns is frozen, so a draw cannot edit it', () => {
    const g = ringGeometryFor(11);
    expect(Object.isFrozen(g)).toBe(true);
    expect(Object.isFrozen(g.bands)).toBe(true);
    expect(Object.isFrozen(g.bands[0])).toBe(true);
    expect(Object.isFrozen(g.tint)).toBe(true);
  });
});

describe('a scenario still gets the last word', () => {
  test('an authored angle, opacity and extent override the seed', () => {
    const seeded = ringGeometryFor(5);
    const authored = ringGeometryFor(5, {
      inner: 1.3,
      outer: 2.2,
      angle: 0.25,
      opacity: 0.65,
    });
    expect(authored.inner).toBe(1.3);
    expect(authored.outer).toBe(2.2);
    expect(authored.angle).toBe(0.25);
    expect(authored.opacity).toBe(0.65);
    // And what was not authored is still the body's own.
    expect(authored.flatten).toBe(seeded.flatten);
  });

  test('Saturn keeps the proportions its scenario asked for', () => {
    // js/world/build.js writes ringInnerRadius = radius * 1.3 in model units.
    // The geometry works in multiples of the *displayed* radius, so the author's
    // 1.3 planetary radii has to survive the translation.
    const saturn = new GasGiant({ x: 0, y: 0 }, { x: 0, y: 0 }, 0.3);
    saturn.hasRings = true;
    saturn.ringInnerRadius = saturn.radius * 1.3;
    saturn.ringOuterRadius = saturn.radius * 2.2;
    saturn.ringAngle = 0.25;
    saturn.ringOpacity = 0.65;
    const g = saturn.ringGeometry();
    expect(g.inner).toBeCloseTo(1.3, 10);
    expect(g.outer).toBeCloseTo(2.2, 10);
    expect(g.angle).toBe(0.25);
  });

  test('a scenario can force rings off on a giant whose seed wanted them', () => {
    // Which is what the Solar System does to Jupiter, Uranus and Neptune.
    let ringedBySeed = null;
    for (let i = 0; i < 60 && !ringedBySeed; i++) {
      const g = new GasGiant({ x: i, y: 0 }, { x: 0, y: 0 }, 1);
      if (g.hasRings) ringedBySeed = g;
    }
    expect(ringedBySeed).not.toBeNull();
    ringedBySeed.hasRings = false;
    expect(ringedBySeed.hasRings).toBe(false);
  });

  test('and force them on for a giant whose seed did not', () => {
    let plain = null;
    for (let i = 0; i < 60 && !plain; i++) {
      const g = new GasGiant({ x: i, y: 0 }, { x: 0, y: 0 }, 1);
      if (!g.hasRings) plain = g;
    }
    expect(plain).not.toBeNull();
    plain.hasRings = true;
    expect(plain.ringGeometry()).toBeTruthy();
  });
});

describe('a body decides its own rings, once', () => {
  test('from its id, so a reload gets the same system', () => {
    const a = new GasGiant({ x: 0, y: 0 }, { x: 0, y: 0 }, 2);
    const restored = new GasGiant({ x: 99, y: 4 }, { x: 1, y: 1 }, 2);
    // What a save and a restore preserve is the id.
    restored.id = a.id;
    clearVisualCaches();
    expect(hasRingsForSeed(visualSeed(restored))).toBe(
      hasRingsForSeed(visualSeed(a))
    );
    expect(ringGeometryFor(visualSeed(restored))).toEqual(
      ringGeometryFor(visualSeed(a))
    );
  });

  test('and memoised, so a frame does not rebuild it', () => {
    const g = new GasGiant({ x: 0, y: 0 }, { x: 0, y: 0 }, 2);
    g.hasRings = true;
    expect(g.ringGeometry()).toBe(g.ringGeometry());
  });
});

describe('rings are drawing and nothing else', () => {
  test('they do not change the model radius or anything built on it', () => {
    const plain = new GasGiant({ x: 0, y: 0 }, { x: 0, y: 0 }, 2);
    const ringed = new GasGiant({ x: 0, y: 0 }, { x: 0, y: 0 }, 2);
    plain.hasRings = false;
    ringed.hasRings = true;
    ringed.ringGeometry();
    expect(ringed.radius).toBe(plain.radius);
    expect(ringed.mass).toBe(plain.mass);
    expect(ringed.massInJupiters).toBe(plain.massInJupiters);
  });

  test('the rings reach well beyond a radius that did not move', () => {
    const g = new GasGiant({ x: 0, y: 0 }, { x: 0, y: 0 }, 2);
    g.hasRings = true;
    const before = g.radius;
    const geo = g.ringGeometry();
    const reach = geo.outer * displayRadius(g.radius, 'GasGiant');
    expect(reach).toBeGreaterThan(displayRadius(g.radius, 'GasGiant'));
    expect(g.radius).toBe(before);
  });

  test('a saved state carries no ring geometry to go stale', () => {
    const g = new GasGiant({ x: 3, y: 4 }, { x: 0, y: 1 }, 2);
    g.hasRings = true;
    g.ringGeometry();
    const state = g.get_state();
    for (const key of Object.keys(state)) {
      expect(key).not.toMatch(/ring/i);
    }
  });
});
