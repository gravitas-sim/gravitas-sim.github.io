// The integrator against the constants a lesson would hand a figure, at the
// bounds committed in tests/fixtures/model-figure-tolerances.json before
// js/lesson/figures.js existed. If the engine misses a bound here, a figure
// drawn from the lesson's constants would disagree with the scene: that is an
// integrator finding, never a reason to widen a bound. The figures themselves
// are compared in tests/modelFigures.test.js, with the same derivations.
import { describe, test, expect } from '@jest/globals';
import {
  TOL,
  orbitScene,
  deriveOrbit,
  transitScene,
  deriveTransit,
  worldG,
} from './modelFigureScenes.js';

const dt = TOL.world.step;

describe('orbit: the integrator holds the lesson constants', () => {
  for (const { a, e } of TOL.orbit.fromConstants.cases)
    for (const fraction of TOL.orbit.fromConstants.periodFractions)
      test(`a = ${a}, e = ${e}, after ${fraction} of a period`, () => {
        const { state, wp } = orbitScene({ a, e, fraction, dt });
        const bound = 2 * (wp * dt) ** 2;
        const d = deriveOrbit(state);
        const rel = x => Math.abs(x) / a;
        const worst = Math.max(
          rel(d.a - a),
          Math.abs(d.e - e),
          rel(d.periapsis - a * (1 - e)),
          rel(d.apoapsis - a * (1 + e)),
          rel(d.focalSeparation - 2 * a * e),
          rel(d.periapsisAt.x - a * (1 - e)),
          rel(d.periapsisAt.y),
          rel(d.apoapsisAt.x + a * (1 + e)),
          rel(d.apoapsisAt.y),
          rel(d.emptyFocusAt.x + 2 * a * e),
          rel(d.emptyFocusAt.y)
        );
        console.log(
          `orbit reference a=${a} e=${e} f=${fraction}: worst ${worst.toExponential(3)}, bound ${bound.toExponential(3)}, ratio ${(worst / bound).toFixed(3)}`
        );
        expect(worst).toBeLessThanOrEqual(bound);
      });

  test('the world G is the world’s, not the integrator’s bare default', () => {
    expect(worldG()).toBeGreaterThan(0);
  });
});

describe('transit: the integrator holds the lesson constants', () => {
  for (const c of TOL.transit.fromConstants.cases)
    for (const phiDeg of TOL.transit.fromConstants.positionAnglesDeg)
      test(`b = ${c.b}, position angle ${phiDeg}`, () => {
        const { state, track } = transitScene({
          starRadius: c.starRadius,
          planetRadius: c.planetRadius,
          b: c.b,
          phiDeg,
          orbitRadius: TOL.transit.fromConstants.orbitRadius,
          dt,
        });
        const d = deriveTransit(state);
        const t = TOL.transit.fromConstants;
        const contact = 2 * Math.sqrt((1 + c.k) ** 2 - c.b ** 2);
        console.log(
          `transit reference b=${c.b} phi=${phiDeg}: k err ${Math.abs(d.k - c.k).toExponential(2)}, b err ${Math.abs(d.b - c.b).toExponential(2)}, contact err ${Math.abs(track.contactLength - contact).toExponential(2)}`
        );
        expect(Math.abs(d.k - c.k)).toBeLessThanOrEqual(t.k.absolute);
        expect(Math.abs(d.b - c.b)).toBeLessThanOrEqual(t.b.absolute);
        expect(Math.abs(track.contactLength - contact)).toBeLessThanOrEqual(
          t.contactLength.absolute
        );
      });
});
