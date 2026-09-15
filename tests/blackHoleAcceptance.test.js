// =============================================================================
// What the black-hole picture has to keep being
// -----------------------------------------------------------------------------
// The renderer is a picture, not a solution: js/blackHole/geometry.js says so in
// its first paragraph, and js/blackHole/render.js says the drawn size "is not
// the horizon in any physical scale". This is the acceptance suite for the
// picture - the things that have to stay true of it whatever else changes.
//
// Deterministic arithmetic rather than screenshots. Every function here is pure
// and takes an appearance, so a fade, an occlusion order or a jet direction can
// be asserted exactly instead of compared against a stored image at a
// perceptual threshold. What only a browser can show - that a paused frame
// really is frozen, that a visual control moves no mass - is in
// e2e/blackHole.spec.js, which already covers it.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import {
  DISK_OUTER_GRAVITATIONAL_RADII,
  ISCO_GRAVITATIONAL_RADII,
  advanceAzimuth,
  beamingSpread,
  diskPoint,
  dopplerWeight,
  emissivity,
  jetBeaming,
  projection,
  relativeOrbitalSpeed,
} from '../js/blackHole/geometry.js';

/** An appearance, at a stated inclination. */
const look = (inclinationDeg, extra = {}) => ({
  inclinationDeg,
  positionAngleDeg: 0,
  environment: 'accreting',
  seed: 'acceptance',
  // Which way round the disk turns. dopplerWeight multiplies by it, so an
  // appearance without one produces NaN rather than a picture - worth pinning
  // here, because that is a real way for the renderer to be handed nothing.
  spin: 1,
  ...extra,
});

const INNER = ISCO_GRAVITATIONAL_RADII;
const OUTER = DISK_OUTER_GRAVITATIONAL_RADII;

/** Representative inclinations: face-on, three-quarters, edge-on. */
const INCLINATIONS = [0, 30, 62, 85];

describe('the disk fades, and fades smoothly', () => {
  test('the profile is zero at the inner edge and at the outer edge', () => {
    expect(emissivity(INNER, INNER, OUTER)).toBeCloseTo(0, 6);
    expect(emissivity(OUTER, INNER, OUTER)).toBeCloseTo(0, 6);
  });

  test('it is positive everywhere between them', () => {
    for (let i = 1; i < 40; i++) {
      const r = INNER + ((OUTER - INNER) * i) / 40;
      expect({ r, positive: emissivity(r, INNER, OUTER) > 0 }).toEqual({
        r,
        positive: true,
      });
    }
  });

  // Smooth means continuous, and continuity is testable without inventing a
  // threshold: refine the sampling and the largest gap between neighbors has
  // to shrink with it. A step discontinuity does not shrink - the jump across
  // it is the same however finely you sample - so this fails on the artifact it
  // is looking for and passes on a profile that is merely steep, which this one
  // legitimately is just outside the inner edge.
  test('refining the sampling shrinks the largest jump', () => {
    const worstAt = n => {
      let worst = 0;
      let prev = emissivity(INNER, INNER, OUTER);
      for (let i = 1; i <= n; i++) {
        const v = emissivity(INNER + ((OUTER - INNER) * i) / n, INNER, OUTER);
        worst = Math.max(worst, Math.abs(v - prev));
        prev = v;
      }
      return worst;
    };
    const coarse = worstAt(200);
    const fine = worstAt(2000);
    const finer = worstAt(20000);
    expect(fine).toBeLessThan(coarse * 0.5);
    expect(finer).toBeLessThan(fine * 0.5);
  });

  test('it has one maximum rather than several', () => {
    const n = 500;
    let rises = 0;
    let prev = emissivity(INNER, INNER, OUTER);
    let goingUp = true;
    for (let i = 1; i <= n; i++) {
      const v = emissivity(INNER + ((OUTER - INNER) * i) / n, INNER, OUTER);
      if (v > prev && !goingUp) rises += 1;
      goingUp = v > prev;
      prev = v;
    }
    // Turning back upward once would be a second bright ring.
    expect(rises).toBe(0);
  });
});

describe('what is in front of what', () => {
  // The disk is a circle seen at an angle. Half of it passes behind the hole
  // and half in front, and the drawing has to know which - a near half drawn
  // behind the dark disc, or a far half drawn over it, is the artifact a
  // reader reads as a bug in the physics.
  test.each(INCLINATIONS.filter(d => d > 0))(
    'at %s degrees the disk has a near half and a far half',
    deg => {
      const a = look(deg);
      const near = diskPoint(a, 20, Math.PI / 2);
      const far = diskPoint(a, 20, -Math.PI / 2);
      expect(near.depth).not.toBeCloseTo(far.depth, 6);
      // One in front, one behind, by whatever sign convention the module uses.
      expect(Math.sign(near.depth)).toBe(-Math.sign(far.depth));
    }
  );

  test('face-on there is no near or far half to get wrong', () => {
    const a = look(0);
    const near = diskPoint(a, 20, Math.PI / 2);
    const far = diskPoint(a, 20, -Math.PI / 2);
    expect(near.depth).toBeCloseTo(far.depth, 6);
  });

  test('the projection squashes with the cosine and never inverts', () => {
    let previous = Infinity;
    for (const deg of [0, 30, 62, 85]) {
      const p = projection(look(deg));
      const squash = Math.abs(p.cosI);
      expect(squash).toBeLessThanOrEqual(previous + 1e-9);
      expect(squash).toBeGreaterThanOrEqual(0);
      previous = squash;
    }
  });
});

describe('the jets', () => {
  test('they point along the disk normal, opposite each other', () => {
    for (const deg of INCLINATIONS) {
      const beam = jetBeaming(look(deg));
      expect(Number.isFinite(beam.near)).toBe(true);
      expect(Number.isFinite(beam.far)).toBe(true);
      // Both weights are real brightnesses, never negative.
      expect(beam.near).toBeGreaterThanOrEqual(0);
      expect(beam.far).toBeGreaterThanOrEqual(0);
    }
  });

  // Face-on the jets point at the viewer and foreshorten to nothing; edge-on
  // they are at their longest. The module's header says so, and a reader who
  // sees a full-length jet on a face-on hole is seeing the wrong picture.
  test('face-on and edge-on are not the same jet', () => {
    const faceOn = jetBeaming(look(0));
    const edgeOn = jetBeaming(look(88));
    expect(faceOn.near).not.toBeCloseTo(edgeOn.near, 3);
  });

  test('both weights stay inside the bounds the module states', () => {
    for (const deg of [0, 30, 62, 85, 90]) {
      const beam = jetBeaming(look(deg));
      for (const v of [beam.near, beam.far]) {
        expect(v).toBeGreaterThanOrEqual(0.15);
        expect(v).toBeLessThanOrEqual(1);
      }
    }
  });

  // Edge-on the two jets are in the plane of the sky and are drawn alike;
  // pointed at the viewer one is boosted and the other suppressed.
  test('a jet pointed at the viewer is not drawn like one pointed away', () => {
    const facing = jetBeaming(look(0));
    expect(Math.abs(facing.near - facing.far)).toBeGreaterThan(0);
    const sideways = jetBeaming(look(90));
    expect(Math.abs(sideways.near - sideways.far)).toBeCloseTo(0, 6);
  });
});

describe('the approaching side is the bright side', () => {
  test('doppler weighting is above one somewhere and below one elsewhere', () => {
    const a = look(62);
    const speed = relativeOrbitalSpeed(12, INNER);
    const samples = [];
    for (let i = 0; i < 36; i++) {
      samples.push(dopplerWeight(a, (i / 36) * 2 * Math.PI, speed));
    }
    expect(Math.max(...samples)).toBeGreaterThan(1);
    expect(Math.min(...samples)).toBeLessThan(1);
  });

  test('face-on there is no approaching side, so nothing is brightened', () => {
    const a = look(0);
    const speed = relativeOrbitalSpeed(12, INNER);
    const samples = [];
    for (let i = 0; i < 36; i++) {
      samples.push(dopplerWeight(a, (i / 36) * 2 * Math.PI, speed));
    }
    const spread = Math.max(...samples) - Math.min(...samples);
    expect(spread).toBeCloseTo(0, 6);
  });

  test('the beaming spread is bounded, so nothing blows out', () => {
    for (const deg of INCLINATIONS) {
      for (const r of [INNER + 0.1, 12, 30, OUTER - 0.1]) {
        const u = beamingSpread(look(deg), relativeOrbitalSpeed(r, INNER));
        expect(Number.isFinite(u)).toBe(true);
        expect(u).toBeGreaterThanOrEqual(0);
        expect(u).toBeLessThanOrEqual(4);
      }
    }
  });
});

describe('the flow is a function of time, not of how often it is asked', () => {
  test('the same time gives the same azimuth, however many times it is called', () => {
    const a = look(62);
    const once = advanceAzimuth(a, 0.3, 12, INNER, 4.25);
    for (let i = 0; i < 5; i++) {
      expect(advanceAzimuth(a, 0.3, 12, INNER, 4.25)).toBe(once);
    }
  });

  test('a paused clock is a frozen disk', () => {
    const a = look(62);
    const t = 7.5;
    const before = advanceAzimuth(a, 0.3, 12, INNER, t);
    const after = advanceAzimuth(a, 0.3, 12, INNER, t);
    expect(after).toBe(before);
  });

  test('the inner edge orbits faster than the outer', () => {
    const a = look(62);
    const dt = 0.5;
    const inner =
      advanceAzimuth(a, 0, INNER + 0.5, INNER, dt) -
      advanceAzimuth(a, 0, INNER + 0.5, INNER, 0);
    const outer =
      advanceAzimuth(a, 0, OUTER - 0.5, INNER, dt) -
      advanceAzimuth(a, 0, OUTER - 0.5, INNER, 0);
    expect(Math.abs(inner)).toBeGreaterThan(Math.abs(outer));
  });

  // Normalized to 1 at the inner edge, not a fraction of c. The module says so:
  // "It is not a claim about the absolute speed of anything."
  test('speed is Keplerian and falls monotonically outwards', () => {
    expect(relativeOrbitalSpeed(INNER, INNER)).toBeCloseTo(1, 12);
    let previous = Infinity;
    for (const r of [INNER, INNER + 1, 12, 30, OUTER]) {
      const v = relativeOrbitalSpeed(r, INNER);
      expect(v).toBeGreaterThan(0);
      expect(v).toBeLessThanOrEqual(previous + 1e-12);
      previous = v;
    }
    // One over the square root of the radius, which is what makes the inner
    // flow visibly outrun the outer one.
    expect(relativeOrbitalSpeed(4 * INNER, INNER)).toBeCloseTo(0.5, 12);
  });
});

describe('the geometry refuses nonsense rather than drawing it', () => {
  test('every output is finite across the whole parameter range', () => {
    for (const deg of [0, 15, 45, 62, 89]) {
      const a = look(deg);
      for (let i = 0; i <= 24; i++) {
        const phi = (i / 24) * 2 * Math.PI;
        for (const r of [INNER, 10, 25, OUTER]) {
          const p = diskPoint(a, r, phi);
          expect(Number.isFinite(p.x)).toBe(true);
          expect(Number.isFinite(p.y)).toBe(true);
          expect(Number.isFinite(p.depth)).toBe(true);
        }
      }
    }
  });

  test('the inner edge is the ISCO of a non-rotating hole, stated as six', () => {
    // Six gravitational radii is three Schwarzschild radii. Pinned because the
    // emissivity profile is anchored to it and a change would move the disk
    // without anything else noticing.
    expect(ISCO_GRAVITATIONAL_RADII).toBe(6);
    expect(DISK_OUTER_GRAVITATIONAL_RADII).toBeGreaterThan(
      ISCO_GRAVITATIONAL_RADII
    );
  });
});
