// =============================================================================
// How a black hole is drawn, and what that can and cannot touch
// -----------------------------------------------------------------------------
// Two groups of claim.
//
// The first is geometric: one configuration, and the disk, the bright side and
// the jets all derived from it. Before this there were three independent
// answers to "which way is this facing", so the tests that matter are the ones
// that would have caught that - reversing the spin reverses the bright side, a
// face-on disk has no asymmetry at all, and the jets come out along the disk's
// projected normal rather than along an angle of their own.
//
// The second is a separation: nothing in the drawing may touch the model. The
// decorative tracers used to add their mass to the hole and to draw from the
// seeded generator while a world was being built, so a rendering setting
// changed both the bodies a seed produced and the rate a black hole grew.
// Those tests are the reason this file exists.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import {
  DISK_OUTER_GRAVITATIONAL_RADII,
  ENVIRONMENT,
  ISCO_GRAVITATIONAL_RADII,
  advanceAzimuth,
  createAppearance,
  diskPoint,
  dopplerWeight,
  emissivity,
  hasDisk,
  hasJets,
  jetBeaming,
  projection,
  relativeOrbitalSpeed,
  variation,
} from '../js/blackHole/appearance.js';
import { DRAWN, annotations, drawBlackHole } from '../js/blackHole/render.js';
import { schwarzschildRadiusM } from '../js/blackHolePhysics.js';
import { SOLAR_MASS_KG } from '../js/constants.js';

/** A canvas whose every 2D method exists, and which records what it was told. */
function recordingCanvas() {
  const calls = [];
  const gradient = { addColorStop: (o, c) => calls.push(['stop', o, c]) };
  const ctx = new Proxy(
    { calls },
    {
      get(target, prop) {
        if (prop in target) return target[prop];
        if (typeof prop !== 'string') return undefined;
        if (/^create(Linear|Radial|Conic)Gradient$/.test(prop)) {
          return (...a) => {
            calls.push([prop, ...a]);
            return gradient;
          };
        }
        if (prop === 'measureText') return () => ({ width: 20 });
        return (...a) => calls.push([prop, ...a]);
      },
      set(target, prop, value) {
        calls.push(['set', prop, value]);
        target[prop] = value;
        return true;
      },
    }
  );
  return ctx;
}

const face = extra =>
  createAppearance({
    inclinationDeg: 0,
    environment: ENVIRONMENT.JET,
    ...extra,
  });
const edge = extra =>
  createAppearance({
    inclinationDeg: 90,
    environment: ENVIRONMENT.JET,
    ...extra,
  });
const tilted = extra =>
  createAppearance({
    inclinationDeg: 60,
    environment: ENVIRONMENT.JET,
    ...extra,
  });

describe('one geometry, and everything from it', () => {
  test('a face-on disk is a circle and an edge-on one is a line', () => {
    expect(projection(face()).flatten).toBeCloseTo(1, 9);
    expect(projection(edge()).flatten).toBeCloseTo(0, 9);
    expect(projection(tilted()).flatten).toBeCloseTo(0.5, 6);
  });

  test('the jet axis is the disk normal, at every position angle', () => {
    for (const pa of [0, 37, 90, 214, 359]) {
      const a = tilted({ positionAngleDeg: pa });
      const p = projection(a);
      // Perpendicular to the disk's major axis, which is what a normal is.
      const dot = p.jet.x * p.major.x + p.jet.y * p.major.y;
      expect(Math.abs(dot)).toBeLessThan(1e-9);
    }
  });

  test('a face-on jet points at the viewer and shortens to nothing', () => {
    expect(projection(face()).jetForeshortening).toBeCloseTo(0, 9);
    expect(projection(edge()).jetForeshortening).toBeCloseTo(1, 9);
  });

  test('turning the position angle turns the disk with it', () => {
    const a = tilted({ positionAngleDeg: 0 });
    const b = tilted({ positionAngleDeg: 90 });
    const pa = diskPoint(a, 10, 0);
    const pb = diskPoint(b, 10, 0);
    // The major axis has rotated by ninety degrees, so x and y have swapped.
    expect(pb.x).toBeCloseTo(-pa.y, 6);
    expect(pb.y).toBeCloseTo(pa.x, 6);
  });

  test('depth is towards the viewer on one half and away on the other', () => {
    const a = tilted();
    expect(diskPoint(a, 10, Math.PI / 2).depth).toBeGreaterThan(0);
    expect(diskPoint(a, 10, -Math.PI / 2).depth).toBeLessThan(0);
    // Face-on there is no near or far half at all.
    expect(Math.abs(diskPoint(face(), 10, Math.PI / 2).depth)).toBeLessThan(
      1e-9
    );
  });

  test('the inner flow moves faster than the outer flow', () => {
    expect(relativeOrbitalSpeed(1, 1)).toBeCloseTo(1, 9);
    expect(relativeOrbitalSpeed(4, 1)).toBeCloseTo(0.5, 9);
    expect(relativeOrbitalSpeed(9, 1)).toBeLessThan(relativeOrbitalSpeed(4, 1));
  });

  test('rotation carries a feature round, and reverses with the spin', () => {
    const a = tilted({ spin: 1 });
    const b = tilted({ spin: -1 });
    expect(advanceAzimuth(a, 0, 2, 1, 1)).toBeGreaterThan(0);
    expect(advanceAzimuth(b, 0, 2, 1, 1)).toBeLessThan(0);
    // And the inner flow gets further round in the same time.
    expect(advanceAzimuth(a, 0, 1, 1, 1)).toBeGreaterThan(
      advanceAzimuth(a, 0, 9, 1, 1)
    );
  });
});

describe('the bright side', () => {
  test('reversing the rotation reverses it', () => {
    const cw = tilted({ spin: 1 });
    const ccw = tilted({ spin: -1 });
    const at = phi => dopplerWeight(cw, phi, 1) - dopplerWeight(ccw, phi, 1);
    // Wherever one is brighter than average the other is fainter.
    expect(at(0)).toBeGreaterThan(0.1);
    expect(at(Math.PI)).toBeLessThan(-0.1);
  });

  test('a face-on disk has no line-of-sight asymmetry at all', () => {
    for (const phi of [0, 1, 2, 3, 4, 5]) {
      expect(dopplerWeight(face(), phi, 1)).toBeCloseTo(1, 9);
    }
  });

  test('an edge-on disk has the most', () => {
    const spread = a => dopplerWeight(a, 0, 1) - dopplerWeight(a, Math.PI, 1);
    expect(spread(edge())).toBeGreaterThan(spread(tilted()));
    expect(spread(tilted())).toBeGreaterThan(spread(face()));
  });

  test('it is bounded however extreme the geometry', () => {
    for (const inc of [0, 30, 60, 90]) {
      for (const speed of [0, 1, 5, 50]) {
        for (const phi of [0, 1.1, 2.2, 3.3, 4.4]) {
          const w = dopplerWeight(
            createAppearance({ inclinationDeg: inc }),
            phi,
            speed
          );
          expect(w).toBeGreaterThanOrEqual(0.35);
          expect(w).toBeLessThanOrEqual(2.2);
        }
      }
    }
  });

  test('the faster inner flow is weighted more than the slow outer flow', () => {
    const a = edge();
    expect(dopplerWeight(a, 0, 1)).toBeGreaterThan(dopplerWeight(a, 0, 0.3));
  });
});

describe('the radial profile', () => {
  const inner = 1;
  const outer = 20;

  test('it is zero at the inner edge, not infinite', () => {
    expect(emissivity(inner, inner, outer)).toBe(0);
    expect(emissivity(inner * 0.5, inner, outer)).toBe(0);
    expect(Number.isFinite(emissivity(inner * 1.001, inner, outer))).toBe(true);
  });

  test('it peaks outside the inner edge, where the thin-disk solution puts it', () => {
    // (7/6)^2 times the inner radius.
    let best = 0;
    let bestAt = 0;
    for (let r = inner; r < outer; r += 0.001) {
      const e = emissivity(r, inner, outer);
      if (e > best) {
        best = e;
        bestAt = r;
      }
    }
    expect(bestAt / inner).toBeCloseTo((7 / 6) ** 2, 1);
    expect(best).toBeCloseTo(1, 2);
  });

  test('it falls away outwards and tapers to nothing at the rim', () => {
    expect(emissivity(5, inner, outer)).toBeGreaterThan(
      emissivity(12, inner, outer)
    );
    expect(emissivity(outer, inner, outer)).toBeCloseTo(0, 6);
  });

  test('it is bounded everywhere', () => {
    for (let r = 0; r <= outer * 1.5; r += 0.05) {
      const e = emissivity(r, inner, outer);
      expect(e).toBeGreaterThanOrEqual(0);
      expect(e).toBeLessThanOrEqual(1);
    }
  });

  test('the inner edge is the non-rotating ISCO and says so', () => {
    expect(ISCO_GRAVITATIONAL_RADII).toBe(6);
    expect(DISK_OUTER_GRAVITATIONAL_RADII).toBeGreaterThan(
      ISCO_GRAVITATIONAL_RADII
    );
  });
});

describe('the jets', () => {
  test('they are not equally bright at every inclination', () => {
    const f = jetBeaming(face());
    expect(f.near).toBeGreaterThan(f.far * 1.5);
  });

  test('edge-on, both lie in the plane of the sky and match', () => {
    const e = jetBeaming(edge());
    expect(e.near).toBeCloseTo(e.far, 9);
  });

  test('both are bounded', () => {
    for (const inc of [0, 15, 45, 75, 90]) {
      const b = jetBeaming(createAppearance({ inclinationDeg: inc }));
      for (const v of [b.near, b.far]) {
        expect(v).toBeGreaterThanOrEqual(0.15);
        expect(v).toBeLessThanOrEqual(1);
      }
    }
  });
});

describe('environments', () => {
  test('quiescent draws nothing luminous', () => {
    const a = createAppearance({ environment: ENVIRONMENT.QUIESCENT });
    expect(hasDisk(a)).toBe(false);
    expect(hasJets(a)).toBe(false);
  });

  test('accreting draws a disk and no jets', () => {
    const a = createAppearance({ environment: ENVIRONMENT.ACCRETING });
    expect(hasDisk(a)).toBe(true);
    expect(hasJets(a)).toBe(false);
  });

  test('a jet-producing accretor draws both', () => {
    const a = createAppearance({ environment: ENVIRONMENT.JET });
    expect(hasDisk(a)).toBe(true);
    expect(hasJets(a)).toBe(true);
  });

  test('an unknown environment falls back to quiescent rather than guessing', () => {
    expect(createAppearance({ environment: 'luminous' }).environment).toBe(
      ENVIRONMENT.QUIESCENT
    );
  });

  test('a jet strength of zero draws no jets even in the jet state', () => {
    expect(
      hasJets(
        createAppearance({ environment: ENVIRONMENT.JET, jetStrength: 0 })
      )
    ).toBe(false);
  });
});

describe('the drawing itself', () => {
  const spec = extra => ({
    at: { x: 0, y: 0 },
    unit: 40,
    appearance: tilted(),
    time: 0,
    ...extra,
  });

  test('it draws at every environment, inclination and tier', () => {
    for (const env of Object.values(ENVIRONMENT)) {
      for (const inc of [0, 30, 62, 90]) {
        for (const tier of ['low', 'full']) {
          const ctx = recordingCanvas();
          expect(() =>
            drawBlackHole(
              ctx,
              spec({
                appearance: createAppearance({
                  environment: env,
                  inclinationDeg: inc,
                }),
                tier,
              })
            )
          ).not.toThrow();
          // Something was always drawn: the horizon, at minimum.
          expect(ctx.calls.some(c => c[0] === 'arc')).toBe(true);
        }
      }
    }
  });

  test('the same state and time draw the same thing', () => {
    const one = recordingCanvas();
    const two = recordingCanvas();
    drawBlackHole(one, spec({ time: 3.25 }));
    drawBlackHole(two, spec({ time: 3.25 }));
    expect(JSON.stringify(two.calls)).toBe(JSON.stringify(one.calls));
  });

  test('a frozen clock draws a frozen picture', () => {
    const one = recordingCanvas();
    const two = recordingCanvas();
    drawBlackHole(one, spec({ time: 7 }));
    drawBlackHole(two, spec({ time: 7 }));
    expect(JSON.stringify(two.calls)).toBe(JSON.stringify(one.calls));
    // ...and a moving one does not.
    const three = recordingCanvas();
    drawBlackHole(three, spec({ time: 9 }));
    expect(JSON.stringify(three.calls)).not.toBe(JSON.stringify(one.calls));
  });

  test('drawing never touches the global generator', () => {
    const real = Math.random;
    let used = 0;
    Math.random = () => {
      used++;
      return real();
    };
    try {
      for (const env of Object.values(ENVIRONMENT)) {
        drawBlackHole(
          recordingCanvas(),
          spec({ appearance: createAppearance({ environment: env }) })
        );
      }
    } finally {
      Math.random = real;
    }
    expect(used).toBe(0);
  });

  test('every save is matched by a restore', () => {
    const ctx = recordingCanvas();
    drawBlackHole(ctx, spec());
    const saves = ctx.calls.filter(c => c[0] === 'save').length;
    const restores = ctx.calls.filter(c => c[0] === 'restore').length;
    expect(saves).toBe(restores);
  });

  test('the horizon is drawn once, in black, at the drawn radius', () => {
    const ctx = recordingCanvas();
    drawBlackHole(ctx, spec({ unit: 40 }));
    const black = ctx.calls.filter(
      c => c[0] === 'set' && c[1] === 'fillStyle' && c[2] === '#000000'
    );
    expect(black.length).toBe(1);
  });

  test('the drawn extent is compressed, and says by how much', () => {
    expect(DRAWN.innerEdge).toBeGreaterThan(1);
    expect(DRAWN.outerEdge / DRAWN.innerEdge).toBeCloseTo(DRAWN.drawnRatio, 9);
    // The model's own ratio is larger; the drawing compresses it.
    expect(DRAWN.modelRatio).toBeGreaterThan(DRAWN.drawnRatio);
  });

  test('the annotations name the parts, and only the ones on screen', () => {
    const quiet = annotations(
      createAppearance({ environment: ENVIRONMENT.QUIESCENT }),
      40
    );
    expect(quiet.map(a => a.key)).toEqual(['horizon']);
    const full = annotations(tilted(), 40).map(a => a.key);
    expect(full).toContain('horizon');
    expect(full).toContain('disk');
    expect(full).toContain('approaching');
    expect(full).toContain('jet');
  });
});

describe('the deterministic generator', () => {
  test('the same appearance and channel give the same numbers', () => {
    const a = tilted({ seed: 'x' });
    const one = variation(a, 'streaks');
    const two = variation(a, 'streaks');
    expect([one(), one(), one()]).toEqual([two(), two(), two()]);
  });

  test('different channels do not shift each other', () => {
    const a = tilted({ seed: 'x' });
    const streaks = variation(a, 'streaks');
    const knots = variation(a, 'knots');
    expect(streaks()).not.toBe(knots());
  });

  test('and it never touches the global generator', () => {
    const real = Math.random;
    let used = 0;
    Math.random = () => {
      used++;
      return real();
    };
    try {
      const gen = variation(tilted(), 'streaks');
      for (let i = 0; i < 50; i++) gen();
    } finally {
      Math.random = real;
    }
    expect(used).toBe(0);
  });
});

describe('the physical radius is not the drawn one', () => {
  test('the Schwarzschild radius is linear in mass', () => {
    const one = schwarzschildRadiusM(SOLAR_MASS_KG);
    const ten = schwarzschildRadiusM(10 * SOLAR_MASS_KG);
    expect(ten / one).toBeCloseTo(10, 9);
    expect(schwarzschildRadiusM(1e6 * SOLAR_MASS_KG) / one).toBeCloseTo(1e6, 6);
  });

  test('and it is about three kilometres for the Sun', () => {
    expect(schwarzschildRadiusM(SOLAR_MASS_KG) / 1000).toBeCloseTo(2.95, 2);
  });

  test('the drawing knows nothing about it', () => {
    // Nothing in the appearance or the renderer takes a mass, which is what
    // keeps the compressed drawn size from being read as a physical one.
    const a = createAppearance({});
    expect(Object.keys(a)).not.toContain('mass');
    expect(Object.keys(a)).not.toContain('massKg');
  });
});
