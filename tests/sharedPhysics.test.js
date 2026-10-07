// =============================================================================
// One implementation of each piece of shared physics (Roadmap II, Prompt 66)
// -----------------------------------------------------------------------------
// Kepler's equation, quadratic limb darkening and the radial-velocity
// semi-amplitude each used to exist two to six times. They now live in
// js/orbital.js and js/limbDarkening.js. This file is the cross-implementation
// agreement test: the callers, which kept their own starting guess, tolerance
// and cap (tabulated in js/orbital.js), are held against an independent
// reference, with a stated tolerance and the reason for it.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import { keplerNewton, orbitalElements } from '../js/orbital.js';
import { eccentricAnomaly } from '../js/habitability.js';
import { solveKepler as solveKeplerRv } from '../js/inference/rv.js';
import {
  solveKepler as solveKeplerLab3d,
  fromElements,
} from '../js/lab3d/elements.js';
import { keplerState } from '../js/systemSpec.js';
import { stateFromElements } from '../js/resonance/systems.js';
import {
  limbDarkening,
  kippingQ,
  occultation,
} from '../js/inference/transit.js';
import { blockedFraction } from '../js/transitWidgets.js';
import {
  SOLAR_QUADRATIC,
  quadraticIntensity,
  diskAverage,
  kippingToQuadratic,
  quadraticToKipping,
} from '../js/limbDarkening.js';
import {
  radialVelocitySemiAmplitude,
  rvSemiAmplitudeFromAxis,
  rvSemiAmplitudeFromMasses,
} from '../js/exoplanetObservables.js';
import {
  G_SI,
  SOLAR_MASS_KG,
  JUPITER_MASS_KG,
  SECONDS_PER_DAY,
} from '../js/constants.js';

const TWO_PI = 2 * Math.PI;
const grid = (n, lo, hi) =>
  Array.from({ length: n + 1 }, (_, i) => lo + ((hi - lo) * i) / n);

// -----------------------------------------------------------------------------
describe('Kepler: every solver agrees with the bracketed reference', () => {
  // Tolerance 1e-12 is the loosest stopping tolerance any caller uses
  // (habitability.js and binaryWidgets.js stop at |step| < 1e-12). Newton's
  // quadratic convergence means the last step bounds the remaining error, and
  // the observed disagreement is 1e-14 at e = 0.95 and 1e-15 below e = 0.5,
  // which is rounding in sin and cos: Node 20 (CI) and Node 24 (the Mac) round
  // those differently in the last place, so nothing tighter can be promised.
  const TOL = 1e-12;
  const residual = (E, M, e) => Math.abs(E - e * Math.sin(E) - M);

  test('the bracketed reference solves the equation to rounding, any turn', () => {
    for (const e of [0, 0.3, 0.8, 0.95, 0.999]) {
      for (const M of [...grid(60, -9, 9), 1e-9, -1e-9]) {
        const E = solveKeplerLab3d(M, e);
        expect(residual(E, M, e)).toBeLessThan(1e-14 * (1 + Math.abs(M)));
      }
    }
  });

  test('the Newton callers agree for M in [0, 2 pi], e up to 0.95', () => {
    const profiles = {
      'habitability (own copy)': (M, e) => eccentricAnomaly(M, e),
      'ui.js and binaryWidgets.js': (M, e) =>
        keplerNewton(M, e, e < 0.8 ? M : Math.PI, 1e-13, 40),
      'inference/rv.js (own copy)': (M, e) => solveKeplerRv(M, e),
      'systemSpec.js': (M, e) =>
        keplerNewton(
          M,
          e,
          e > 0.8 ? Math.PI * Math.sign(M || 1) : M,
          1e-15,
          60
        ),
    };
    for (const [name, solve] of Object.entries(profiles)) {
      let worst = 0;
      for (const e of [0, 0.01, 0.1, 0.3, 0.5, 0.7, 0.8, 0.9, 0.95]) {
        for (const M of grid(240, 0, TWO_PI)) {
          const ref = solveKeplerLab3d(M, e);
          worst = Math.max(worst, Math.abs(solve(M, e) - ref));
        }
      }
      expect({ name, ok: worst < TOL }).toEqual({ name, ok: true });
    }
  });

  test('resonance/systems.js (own copy): the domain it declares, e up to 0.6', () => {
    // Its comment claims e <= 0.25 (Pluto); started at M it converges well
    // beyond that, and is held here to 0.6 only.
    for (const e of [0, 0.05, 0.249, 0.4, 0.6]) {
      for (const lambdaDeg of grid(72, 0, 360)) {
        const M = (lambdaDeg * Math.PI) / 180;
        const s = stateFromElements({
          a: 10,
          e,
          varpiDeg: 0,
          lambdaDeg,
          mu: 3,
        });
        // The state's true anomaly gives back E, hence M.
        const f = Math.atan2(s.pos.y, s.pos.x);
        const E =
          2 *
          Math.atan2(
            Math.sqrt(1 - e) * Math.sin(f / 2),
            Math.sqrt(1 + e) * Math.cos(f / 2)
          );
        const Mback = E - e * Math.sin(E);
        const wrapped = Math.atan2(Math.sin(M), Math.cos(M));
        expect(Math.abs(Mback - wrapped)).toBeLessThan(1e-11);
      }
    }
  });

  test('systemSpec keplerState and the 3-D lab agree on the same orbit', () => {
    // Same a, e, omega = 0 and mean anomaly M; the lab uses radians and its
    // own frame (z up, i = 0), so the in-plane position must match. The 3-D lab
    // is bracketed (any e < 1); keplerState is Newton from pi above 0.8.
    for (const e of [0, 0.2, 0.6, 0.9, 0.95]) {
      for (const phaseDeg of grid(36, -180, 180)) {
        const M = (phaseDeg * Math.PI) / 180;
        const ks = keplerState({
          a: 2,
          e,
          omegaDeg: 0,
          phaseDeg,
          mu: 1.7,
        });
        const lab = fromElements({ a: 2, e, i: 0, Omega: 0, omega: 0, M }, 1.7);
        expect(Math.abs(ks.pos.x - lab.x[0])).toBeLessThan(1e-12);
        expect(Math.abs(ks.pos.y - lab.x[1])).toBeLessThan(1e-12);
        expect(Math.abs(ks.vel.x - lab.v[0])).toBeLessThan(1e-12);
        expect(Math.abs(ks.vel.y - lab.v[1])).toBeLessThan(1e-12);
      }
    }
  });

  test('the lab and the inference solver agree off the principal turn', () => {
    // inference/rv.js starts from M + e sin M, which holds for any M; the lab
    // wraps explicitly. Both must land on the root on M's own turn.
    for (const e of [0.1, 0.5, 0.9]) {
      for (const M of grid(80, -3 * TWO_PI, 3 * TWO_PI)) {
        const a = solveKeplerRv(M, e);
        const b = solveKeplerLab3d(M, e);
        expect(Math.abs(a - b)).toBeLessThan(TOL);
      }
    }
  });

  test('the 3-D lab hyperbolic branch returns a state with the right M', () => {
    // Independent of its solver: from the returned radius and radial speed
    // recover H (r = A (e cosh H - 1), sign from the radial speed), then
    // M = e sinh H - H. Tolerance 1e-9 relative: acosh amplifies the radius's
    // rounding near periapsis.
    const mu = 1.7;
    for (const e of [1.2, 2, 5.5]) {
      for (const M of [-20, -5, -1, -0.1, 0.1, 1, 5, 20]) {
        const A = 3;
        const s = fromElements({ a: -A, e, i: 0, Omega: 0, omega: 0, M }, mu);
        const r = Math.hypot(s.x[0], s.x[1]);
        const rdot = (s.x[0] * s.v[0] + s.x[1] * s.v[1]) / r;
        const H = Math.sign(rdot) * Math.acosh((r / A + 1) / e);
        const Mback = e * Math.sinh(H) - H;
        expect(Math.abs(Mback - M)).toBeLessThan(1e-9 * (1 + Math.abs(M)));
      }
    }
  });
});

// -----------------------------------------------------------------------------
describe('Limb darkening: two parameterizations, one law', () => {
  test('the conversion is exact both ways', () => {
    // Tolerance 1e-14: one sqrt, a few multiplications; the loss is rounding.
    for (const [q1, q2] of [
      [0.4356, 0.30303],
      [0.01, 0.9],
      [1, 1],
      [0.5, 0],
      [0.3, 0.5],
    ]) {
      const { u1, u2 } = kippingToQuadratic(q1, q2);
      const back = quadraticToKipping(u1, u2);
      expect(Math.abs(back.q1 - q1)).toBeLessThan(1e-14);
      expect(Math.abs(back.q2 - q2)).toBeLessThan(1e-14);
    }
    // And the quadratic pair, round trip the other way.
    const q = quadraticToKipping(SOLAR_QUADRATIC.u1, SOLAR_QUADRATIC.u2);
    const u = kippingToQuadratic(q.q1, q.q2);
    expect(u.u1).toBeCloseTo(0.4, 14);
    expect(u.u2).toBeCloseTo(0.26, 14);
  });

  test('the unit square is exactly the physical stars', () => {
    // Kipping's claim, tested: I >= 0 everywhere, and non-increasing toward
    // the limb, iff u1 + u2 <= 1, u1 >= 0, u1 + 2 u2 >= 0. Over a grid of
    // (q1, q2) in [0, 1]^2 every image satisfies all three, and a point just
    // outside the square (q2 = 1.05) violates one.
    for (const q1 of grid(10, 0, 1)) {
      for (const q2 of grid(10, 0, 1)) {
        const { u1, u2 } = kippingToQuadratic(q1, q2);
        expect(u1 + u2).toBeLessThanOrEqual(1 + 1e-12);
        expect(u1).toBeGreaterThanOrEqual(0);
        expect(u1 + 2 * u2).toBeGreaterThanOrEqual(-1e-12);
      }
    }
    const out = kippingToQuadratic(0.5, 1.05);
    expect(out.u1 + 2 * out.u2).toBeLessThan(0);
  });

  test('the inference core and the lesson share the one module', () => {
    // inference/transit.js re-exports the module's functions, so the two are
    // the same function and not copies that could drift.
    expect(limbDarkening).toBe(kippingToQuadratic);
    expect(kippingQ).toBe(quadraticToKipping);
    expect(diskAverage(0.4, 0.26)).toBe(1 - 0.4 / 3 - 0.26 / 6);
    expect(quadraticIntensity(1, 0.4, 0.26)).toBe(1);
    expect(quadraticIntensity(0, 0.4, 0.26)).toBeCloseTo(1 - 0.4 - 0.26, 15);
  });

  test('the lesson instrument still holds the shared solar coefficients', () => {
    // transitWidgets.js keeps its own 0.4 / 0.26 (see js/limbDarkening.js); its
    // central depth must stay k^2 / diskAverage of the shared values.
    const k = 0.05;
    const depth = blockedFraction(0, k, 400);
    const { u1, u2 } = SOLAR_QUADRATIC;
    expect(Math.abs(depth - (k * k) / diskAverage(u1, u2))).toBeLessThan(
      3e-3 * k * k
    );
  });

  test('lesson quadrature (fixed Claret) matches the inference occultation (fitted q1, q2)', () => {
    // The same star through both routes: the lesson's fixed (0.4, 0.26) and the
    // inference core fed the equivalent Kipping pair. Tolerance 1e-3 of k^2
    // (observed 3.5e-4): the lesson integrates a 220-square grid over the
    // planet's disk and its truncation at the planet's edge is the whole
    // difference; the inference side uses 256 annuli, far finer.
    const q = quadraticToKipping(SOLAR_QUADRATIC.u1, SOLAR_QUADRATIC.u2);
    const { u1, u2 } = limbDarkening(q.q1, q.q2);
    for (const k of [0.03, 0.08, 0.12]) {
      for (const z of grid(60, 0, 1 + k + 0.02)) {
        const lesson = blockedFraction(z, k, 220);
        const core = occultation(z, k, u1, u2, 256);
        expect(Math.abs(lesson - core)).toBeLessThan(1e-3 * k * k);
      }
    }
  });
});

// -----------------------------------------------------------------------------
describe('RV semi-amplitude K: one definition, two forms, one dynamical check', () => {
  test('the axis form and the mass form agree in SI', () => {
    // Tolerance 1e-12 relative (observed 3e-15): the two differ by Kepler's
    // third law, which costs a cbrt and a pow.
    for (const e of [0, 0.3, 0.7, 0.95]) {
      for (const inc of [10, 60, 90]) {
        for (const [ms, mp, days] of [
          [1, 1, 3.5],
          [1.1, 0.7, 365],
          [0.5, 20, 4000],
        ]) {
          const P = days * SECONDS_PER_DAY;
          const M = ms * SOLAR_MASS_KG;
          const m = mp * JUPITER_MASS_KG;
          const sinI = Math.sin((inc * Math.PI) / 180);
          const aRel = Math.cbrt((G_SI * (M + m) * P * P) / (TWO_PI * TWO_PI));
          const aStar = (aRel * m) / (M + m);
          const fromAxis = rvSemiAmplitudeFromAxis(aStar, P, sinI, e);
          const fromCatalogue = radialVelocitySemiAmplitude({
            starMassSolar: ms,
            planetMassJupiter: mp,
            periodDays: days,
            inclinationDeg: inc,
            eccentricity: e,
          });
          expect(
            Math.abs(fromAxis - fromCatalogue) / fromCatalogue
          ).toBeLessThan(1e-12);
        }
      }
    }
  });

  test('the sandbox form (orbital elements, G = 2) agrees with the mass form', () => {
    // radialVelocity.js builds K from the star's own orbit about the barycenter
    // using orbitalElements(); tolerance 1e-12 relative (observed 6e-16).
    const G = 2;
    for (const e of [0, 0.2, 0.5, 0.9]) {
      for (const [Ms, m] of [
        [1000, 1],
        [1000, 300],
        [500, 500],
      ]) {
        const mu = G * (Ms + m);
        const st = keplerState({ a: 4, e, omegaDeg: 37, phaseDeg: 20, mu });
        const el = orbitalElements(
          { pos: st.pos, vel: st.vel, mass: m },
          { pos: { x: 0, y: 0 }, vel: { x: 0, y: 0 }, mass: Ms },
          G
        );
        const sinI = Math.sin(0.9);
        const a = rvSemiAmplitudeFromAxis(
          (el.a * m) / (Ms + m),
          el.period,
          sinI,
          el.e
        );
        const b = rvSemiAmplitudeFromMasses(G, el.period, Ms, m, sinI, el.e);
        expect(Math.abs(a - b) / b).toBeLessThan(1e-12);
      }
    }
  });

  test('half the peak-to-peak of the simulated star velocity is K', () => {
    // The definition itself, against dynamics: the star's line-of-sight speed
    // from keplerState over one orbit. (max - min) / 2 is K at every e and
    // omega, and the only error is sampling the sharp extreme: 40 000 phases,
    // observed 2e-8 at e = 0.9; tolerance 2e-6 relative. This is the lesson's
    // half-peak-to-peak reading, and it is exact only for a complete orbit and
    // noise-free samples.
    const G = 2;
    const Ms = 1000;
    const m = 300;
    const mu = G * (Ms + m);
    const sinI = Math.sin((50 * Math.PI) / 180);
    const N = 40000;
    for (const e of [0, 0.5, 0.9]) {
      for (const omegaDeg of [0, 37, 200]) {
        let lo = Infinity;
        let hi = -Infinity;
        for (let i = 0; i < N; i++) {
          const s = keplerState({
            a: 4,
            e,
            omegaDeg,
            phaseDeg: (360 * i) / N,
            mu,
          });
          const v = ((s.vel.y * m) / (Ms + m)) * sinI;
          lo = Math.min(lo, v);
          hi = Math.max(hi, v);
        }
        const period = TWO_PI * Math.sqrt(4 ** 3 / mu);
        const K = rvSemiAmplitudeFromAxis((4 * m) / (Ms + m), period, sinI, e);
        expect(Math.abs((hi - lo) / 2 - K) / K).toBeLessThan(2e-6);
      }
    }
  });
});
