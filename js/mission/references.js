// =============================================================================
// The mission core's reference cases, and the tolerance each is held to
// -----------------------------------------------------------------------------
// Three kinds of reference, so that no solver is only checked against itself:
//
//   textbook     a worked example as printed, in the book's own constants,
//                to the digits it prints (half a unit in the last place)
//   analytic     a closed-form constant derived independently of the code
//                that should reproduce it, such as the root of a cubic
//   independent  the 3-D kernel integrating the solver's initial state
//                (./verify.js): forces added up, no conic in sight
//
// A case is data and a function: `run()` returns measures, each a value, what
// it should be and a fixed tolerance, and a case passes when every measure is
// within its tolerance. `npm run validate:mission` runs them all and writes
// the table into MISSION.md; tests/mission.test.js runs them too.
//
// Tolerances are fixed here and argued in each case's `why`; none was
// widened to make a case pass. A measured approximation (M1, the patched
// conic against three bodies) is a measure like the others: its bound is the
// size the approximation is expected to have, and the value is reported.
// =============================================================================

import { AU, BODIES, DAY, circularOrbit, planetState } from './bodies.js';
import { lambert } from './lambert.js';
import {
  biElliptic,
  biEllipticLimit,
  combinedBurn,
  hohmann,
  hohmannPlaneChange,
  optimalSplit,
  phasing,
  rendezvous,
} from './transfers.js';
import { flyby, hyperbolicBurn, interplanetaryHohmann } from './patched.js';
import { CELL_STATUS, computeWindow } from './window.js';
import { integrate, integrateTracked } from './verify.js';
import { dopri5, makeState } from '../lab3d/kernel.js';
import { fromElements } from '../lab3d/elements.js';
import { cross, dot, norm, propagate, sub } from './twobody.js';

const { sqrt, PI, cos, sin, abs, acos, sinh } = Math;
const DEG = PI / 180;
const measure = (name, value, expected, tolerance, unit = '') => ({
  name,
  value,
  expected,
  tolerance,
  unit,
});
const rotZ = (v, a) => [
  cos(a) * v[0] - sin(a) * v[1],
  sin(a) * v[0] + cos(a) * v[1],
  v[2],
];
/** A root of p on [a, b] by bisection: independent of every solver here. */
const root = (p, a, b) => {
  for (let k = 0; k < 200; k++) {
    const m = (a + b) / 2;
    if (p(a) * p(m) <= 0) b = m;
    else a = m;
  }
  return (a + b) / 2;
};
/** Kernel miss of a Lambert solution, relative to the arrival radius. */
const lambertMiss = (mu, r1, r2, s, tof) =>
  norm(sub(integrate(mu, [{ r: r1, v: s.v1 }], tof)[0].r, r2)) / norm(r2);

export const CASES = [
  {
    id: 'L1',
    kind: 'textbook',
    title: 'Lambert: Curtis, example 5.2',
    source:
      'H. D. Curtis, Orbital Mechanics for Engineering Students, example 5.2: r1 = (5000, 10000, 2100) km, r2 = (-14600, 2500, 7000) km, one hour, mu = 398600 km^3/s^2',
    why: 'Printed to five figures: half a unit in the last place is 5e-5 km/s. The kernel carries v1 for the hour and must land on r2 to its own accuracy, 1e-9 of the radius.',
    run() {
      const mu = 398600;
      const r1 = [5000, 10000, 2100];
      const r2 = [-14600, 2500, 7000];
      const s = lambert({ mu, r1, r2, tof: 3600 });
      const v1 = [-5.9925, 1.9254, 3.2456];
      const v2 = [-3.3125, -4.1966, -0.38529];
      return [
        measure('solver status', s.status, 'ok', 0),
        measure(
          '|v1 - printed|',
          norm(sub(s.v1, v1)),
          0,
          5e-5 * sqrt(3),
          'km/s'
        ),
        measure(
          '|v2 - printed|',
          norm(sub(s.v2, v2)),
          0,
          5e-5 * sqrt(3),
          'km/s'
        ),
        measure('kernel miss at r2', lambertMiss(mu, r1, r2, s, 3600), 0, 1e-9),
      ];
    },
  },
  {
    id: 'L2',
    kind: 'textbook',
    title: 'Lambert: Vallado, example 7-5',
    source:
      'D. A. Vallado, Fundamentals of Astrodynamics and Applications, 4th ed., example 7-5: r0 = (15945.34, 0, 0) km, r = (12214.83899, 10249.46731, 0) km, 76 minutes, mu = 398600.4418 km^3/s^2',
    why: 'Printed to 1e-6 km/s; the book rounds its own intermediate values, so the comparison allows two units in that place. The kernel check is as in L1.',
    run() {
      const mu = 398600.4418;
      const r1 = [15945.34, 0, 0];
      const r2 = [12214.83899, 10249.46731, 0];
      const s = lambert({ mu, r1, r2, tof: 76 * 60 });
      return [
        measure('solver status', s.status, 'ok', 0),
        measure(
          '|v1 - printed|',
          norm(sub(s.v1, [2.058913, 2.915965, 0])),
          0,
          2e-6 * sqrt(2),
          'km/s'
        ),
        measure(
          '|v2 - printed|',
          norm(sub(s.v2, [-3.451565, 0.910315, 0])),
          0,
          2e-6 * sqrt(2),
          'km/s'
        ),
        measure(
          'kernel miss at r2',
          lambertMiss(mu, r1, r2, s, 76 * 60),
          0,
          1e-9
        ),
      ];
    },
  },
  {
    id: 'L3',
    kind: 'independent',
    title: 'Lambert: both branches, an ellipse and a hyperbola',
    source:
      'The geometry of L2 flown the long way round (retrograde), and in ten minutes (a hyperbola), each integrated by the 3-D kernel',
    why: 'The branch asked for must be the branch returned: the angular momentum along +z is negative on the retrograde branch, positive on the prograde. Each must reach r2 in the kernel to 1e-9.',
    run() {
      const mu = 398600.4418;
      const r1 = [15945.34, 0, 0];
      const r2 = [12214.83899, 10249.46731, 0];
      const retro = lambert({
        mu,
        r1,
        r2,
        tof: 76 * 60,
        direction: 'retrograde',
      });
      const fast = lambert({ mu, r1, r2, tof: 600 });
      return [
        measure('retrograde status', retro.status, 'ok', 0),
        measure(
          'retrograde h_z sign',
          Math.sign(cross(r1, retro.v1)[2]),
          -1,
          0
        ),
        measure(
          'retrograde kernel miss',
          lambertMiss(mu, r1, r2, retro, 76 * 60),
          0,
          1e-9
        ),
        measure('fast conic', fast.conic, 'hyperbola', 0),
        measure(
          'fast kernel miss',
          lambertMiss(mu, r1, r2, fast, 600),
          0,
          1e-9
        ),
      ];
    },
  },
  {
    id: 'L4',
    kind: 'analytic',
    title: 'Lambert approaches the Hohmann ellipse near 180 degrees',
    source:
      'Earth to Mars model circles (MISSION.md): the Lambert problem 0.1 degrees short of the antipodal line, in the Hohmann time, against the closed-form Hohmann perihelion speed',
    why: 'An offset of 0.1 degrees (1.7e-3 rad) can move the solution by no more than that order; the bound, 1e-3, would be missed by any wrong branch or conic by orders of magnitude. The kernel must confirm the solution to 1e-9, and 0.01 degrees, where the velocities lose digits as 1 / sin^2, must be refused, as must the antipodal case itself.',
    run() {
      const mu = BODIES.sun.GM;
      const r1 = circularOrbit('earth').r;
      const r2 = circularOrbit('mars').r;
      const h = hohmann(mu, r1, r2);
      const at = deg => [r2 * cos(PI - deg * DEG), r2 * sin(PI - deg * DEG), 0];
      const s = lambert({ mu, r1: [r1, 0, 0], r2: at(0.1), tof: h.tof });
      const closer = lambert({ mu, r1: [r1, 0, 0], r2: at(0.01), tof: h.tof });
      const exact = lambert({
        mu,
        r1: [r1, 0, 0],
        r2: [-r2, 0, 0],
        tof: h.tof,
      });
      return [
        measure('0.1 degrees: status', s.status, 'ok', 0),
        measure(
          '|v1| / Hohmann perihelion speed - 1',
          abs(norm(s.v1) / h.burns[0].to - 1),
          0,
          1e-3
        ),
        measure(
          'kernel miss at r2',
          lambertMiss(mu, [r1, 0, 0], at(0.1), s, h.tof),
          0,
          1e-9
        ),
        measure('0.01 degrees: status', closer.status, 'antipodal', 0),
        measure('180 degrees: status', exact.status, 'antipodal', 0),
      ];
    },
  },
  {
    id: 'K1',
    kind: 'independent',
    title: "Kepler's problem against the kernel",
    source:
      'An ellipse of e = 0.7 over 3.3 periods, and a hyperbola of e = 2.5 for 30 hours, about the Earth, each propagated in universal variables and integrated by the 3-D kernel',
    why: 'Two unrelated methods of the same motion: they must agree to the kernel accuracy, 1e-9 of the distance.',
    run() {
      const mu = BODIES.earth.GM;
      const ell = fromElements(
        { a: 20000, e: 0.7, i: 0.4, Omega: 1, omega: 2, M: 0.3 },
        mu
      );
      const T = 2 * PI * sqrt(20000 ** 3 / mu);
      const hyp = fromElements(
        { a: -8000, e: 2.5, i: 1.1, Omega: -0.5, omega: 0.7, M: -3 },
        mu
      );
      const out = [];
      for (const [name, st, dt] of [
        ['ellipse', ell, 3.3 * T],
        ['hyperbola', hyp, 30 * 3600],
      ]) {
        const p = propagate(mu, st.x, st.v, dt);
        const k = integrate(mu, [{ r: st.x, v: st.v }], dt)[0];
        out.push(
          measure(
            `${name}: propagator vs kernel`,
            norm(sub(p.r, k.r)) / norm(k.r),
            0,
            1e-9
          )
        );
      }
      return out;
    },
  },
  {
    id: 'H1',
    kind: 'independent',
    title: 'Hohmann, low Earth orbit to geostationary',
    source:
      'r1 = 6678.137 km (300 km up), r2 = 42164.137 km; the first burn integrated by the kernel for the transfer time',
    why: 'The ellipse must arrive at r2, at its apoapsis (radial speed zero), with the closed form apoapsis speed: each to 1e-9.',
    run() {
      const mu = BODIES.earth.GM;
      const r1 = 6678.137;
      const r2 = 42164.137;
      const h = hohmann(mu, r1, r2);
      const k = integrate(
        mu,
        [{ r: [r1, 0, 0], v: [0, h.burns[0].to, 0] }],
        h.tof
      )[0];
      return [
        measure('total', h.total, 3.8926, 5e-5, 'km/s'),
        measure('arrival radius / r2 - 1', abs(norm(k.r) / r2 - 1), 0, 1e-9),
        measure(
          'radial speed / speed',
          abs(dot(k.r, k.v)) / (norm(k.r) * norm(k.v)),
          0,
          1e-9
        ),
        measure(
          'arrival speed / closed form - 1',
          abs(norm(k.v) / h.burns[1].from - 1),
          0,
          1e-9
        ),
      ];
    },
  },
  {
    id: 'H2',
    kind: 'analytic',
    title: "Hohmann's cost peak and the bi-elliptic crossover",
    source:
      'The Hohmann cost in units of the first circular speed is greatest at the root of R^3 - 15 R^2 - 9 R - 1 = 0 (R = 15.582); the infinite bi-elliptic transfer is cheaper beyond the root of R^3 - (7 + 4 sqrt 2) R^2 + (3 + 4 sqrt 2) R - 1 = 0 (R = 11.939)',
    why: 'The cubics are derived by hand from the cost formulas and solved here by bisection; the code is searched numerically for the same ratios. Both searches resolve to 1e-6 of R.',
    run() {
      const peak = root(R => R ** 3 - 15 * R ** 2 - 9 * R - 1, 10, 20);
      const s2 = sqrt(2);
      const cross = root(
        R => R ** 3 - (7 + 4 * s2) * R ** 2 + (3 + 4 * s2) * R - 1,
        5,
        15
      );
      const cost = R => hohmann(1, 1, R).total;
      const slope = R => cost(R * (1 + 1e-7)) - cost(R * (1 - 1e-7));
      const foundPeak = root(slope, 10, 20);
      const foundCross = root(
        R => biEllipticLimit(1, 1, R).total - cost(R),
        5,
        15
      );
      return [
        measure('peak ratio', foundPeak, peak, 1e-5),
        measure('crossover ratio', foundCross, cross, 1e-5),
        measure(
          'bi-elliptic with rb = r2 minus Hohmann',
          abs(biElliptic(1, 1, 20, 20).total - cost(20)),
          0,
          1e-14
        ),
      ];
    },
  },
  {
    id: 'H3',
    kind: 'independent',
    title: 'Bi-elliptic transfer, flown by the kernel',
    source:
      'r1 = 7000 km to r2 = 105000 km through rb = 210000 km about the Earth: three burns applied to the kernel state at the closed-form times',
    why: 'The spacecraft must end on the circle r2 at the circular speed, each to 1e-9: every burn and both half-ellipse times are exercised.',
    run() {
      const mu = BODIES.earth.GM;
      const b = biElliptic(mu, 7000, 105000, 210000);
      let st = { r: [7000, 0, 0], v: [0, b.burns[0].to, 0] };
      st = integrate(mu, [st], b.burns[1].at)[0];
      st.v = st.v.map(x => (x * b.burns[1].to) / b.burns[1].from);
      st = integrate(mu, [st], b.burns[2].at - b.burns[1].at, 7000)[0];
      const rn = norm(st.r);
      return [
        measure('arrival radius / r2 - 1', abs(rn / 105000 - 1), 0, 1e-9),
        measure(
          'arrival speed / closed form - 1',
          abs(norm(st.v) / b.burns[2].from - 1),
          0,
          1e-9
        ),
      ];
    },
  },
  {
    id: 'P1',
    kind: 'analytic',
    title: 'Plane changes: the combined burn and its best split',
    source:
      'Low Earth orbit to geostationary with 28.5 degrees of inclination change (a launch from 28.5 degrees north): the combined burn by the law of cosines against the difference of the 3-D velocity vectors, and the best split',
    why: 'The two ways of computing one burn agree to rounding (1e-12 km/s). At the best split the total is stationary: its centred slope, over steps of 1e-4 in the split, is below 1e-6 km/s per unit of split (the search resolves the split to 1e-10, and the curvature is about 8 km/s per unit squared). The best total is below all-at-apoapsis, and the split is the textbook 2.2 degrees at the first burn.',
    run() {
      const mu = BODIES.earth.GM;
      const di = 28.5 * DEG;
      const h = hohmann(mu, 6678.137, 42164.137);
      const va = h.burns[1].from;
      const vc = h.burns[1].to;
      const vec = norm(sub([0, va, 0], [0, vc * cos(di), vc * sin(di)]));
      const o = optimalSplit(mu, 6678.137, 42164.137, di);
      const at = s => hohmannPlaneChange(mu, 6678.137, 42164.137, di, s).total;
      return [
        measure(
          'law of cosines - vectors',
          abs(combinedBurn(va, vc, di) - vec),
          0,
          1e-12,
          'km/s'
        ),
        measure(
          'slope at the split',
          abs(at(o.split + 1e-4) - at(o.split - 1e-4)) / 2e-4,
          0,
          1e-6,
          'km/s'
        ),
        measure('best below all at apoapsis', o.total < at(0), true, 0),
        measure(
          'split, degrees at the first burn',
          o.split * 28.5,
          2.2,
          0.05,
          'deg'
        ),
      ];
    },
  },
  {
    id: 'R1',
    kind: 'independent',
    title: 'Rendezvous by a Hohmann transfer, flown by the kernel',
    source:
      'A spacecraft at 6678 km and a target at 7078 km, 17 degrees ahead: the wait, the two burns and the target, all integrated',
    why: 'The spacecraft and the target must meet: their separation at the arrival time is below 1e-8 of the radius.',
    run() {
      const mu = BODIES.earth.GM;
      const r1 = 6678;
      const r2 = 7078;
      const phase = 17 * DEG;
      const p = rendezvous(mu, r1, r2, phase);
      const v1 = sqrt(mu / r1);
      const v2 = sqrt(mu / r2);
      const [ship0, target0] = [
        { r: [r1, 0, 0], v: [0, v1, 0] },
        {
          r: [r2 * cos(phase), r2 * sin(phase), 0],
          v: [-v2 * sin(phase), v2 * cos(phase), 0],
        },
      ];
      const [shipAtBurn, targetAtBurn] = integrate(
        mu,
        [ship0, target0],
        p.wait,
        r1
      );
      shipAtBurn.v = shipAtBurn.v.map(
        x => (x * p.burns[0].to) / p.burns[0].from
      );
      const [shipEnd, targetEnd] = integrate(
        mu,
        [shipAtBurn, targetAtBurn],
        p.tof,
        r1
      );
      return [
        measure(
          'separation / r2',
          norm(sub(shipEnd.r, targetEnd.r)) / r2,
          0,
          1e-8
        ),
      ];
    },
  },
  {
    id: 'R2',
    kind: 'independent',
    title: 'Phasing on one orbit, flown by the kernel',
    source:
      'A target 20 degrees ahead on a 400 km circular orbit, caught in two laps of a phasing orbit',
    why: 'After the phasing orbit the spacecraft is back at the burn point with the target, to 1e-8 of the radius.',
    run() {
      const mu = BODIES.earth.GM;
      const r = 6778.137;
      const ahead = 20 * DEG;
      const p = phasing(mu, r, ahead, 2, BODIES.earth.radius);
      const v = sqrt(mu / r);
      const ship = { r: [r, 0, 0], v: [0, p.burns[0].to, 0] };
      const target = {
        r: [r * cos(ahead), r * sin(ahead), 0],
        v: [-v * sin(ahead), v * cos(ahead), 0],
      };
      const [a, b] = integrate(mu, [ship, target], p.tof, r);
      return [
        measure('solver status', p.status, 'ok', 0),
        measure('separation / r', norm(sub(a.r, b.r)) / r, 0, 1e-8),
      ];
    },
  },
  {
    id: 'C1',
    kind: 'textbook',
    title: 'Patched conic: Earth to Mars, Curtis, example 8.3',
    source:
      'H. D. Curtis, example 8.3, in the book’s constants: Earth and Mars on circles of 149.6e6 and 227.9e6 km, mu_sun = 1.327e11, mu_earth = 398600 km^3/s^2, a 300 km parking orbit (Earth radius 6378 km)',
    why: 'The book prints the excess speed and the burn to four figures: half a unit in the last place, 5e-4 km/s.',
    run() {
      const h = hohmann(1.327e11, 149.6e6, 227.9e6);
      const vinf = h.burns[0].dv;
      const d = hyperbolicBurn(398600, 6678, vinf);
      return [
        measure('departure excess speed', vinf, 2.943, 5e-4, 'km/s'),
        measure('departure burn', d.dv, 3.59, 5e-4, 'km/s'),
      ];
    },
  },
  {
    id: 'C2',
    kind: 'independent',
    title:
      'A departure hyperbola, flown by the kernel to the sphere of influence',
    source:
      'The Earth to Mars departure from 300 km (the model constants), integrated from periapsis until the spacecraft is past the Earth’s sphere of influence',
    why: 'The speed at the sphere must be the vis-viva speed of the hyperbola there, and the periapsis the one asked for, each to 1e-9.',
    run() {
      const im = interplanetaryHohmann(
        { id: 'earth', altitude: 300 },
        { id: 'mars', altitude: 300 }
      );
      const mu = BODIES.earth.GM;
      const rp = BODIES.earth.radius + 300;
      const d = im.departure;
      const a = -mu / (d.vinf * d.vinf);
      // The time from periapsis to the sphere, from the hyperbolic anomaly.
      const rs = d.soi;
      const H = Math.acosh((1 - rs / a) / d.e);
      const t = sqrt((-a) ** 3 / mu) * (d.e * sinh(H) - H);
      const k = integrateTracked(mu, [rp, 0, 0], [0, d.vp, 0], t, rp);
      return [
        measure(
          'radius at the time / sphere - 1',
          abs(norm(k.r) / rs - 1),
          0,
          1e-9
        ),
        measure(
          'speed / vis-viva - 1',
          abs(norm(k.v) / sqrt(d.vinf ** 2 + (2 * mu) / norm(k.r)) - 1),
          0,
          1e-9
        ),
        measure(
          'periapsis / asked - 1',
          abs((k.elements.a * (1 - k.elements.e)) / rp - 1),
          0,
          1e-9
        ),
      ];
    },
  },
  {
    id: 'F1',
    kind: 'independent',
    title: 'A Jupiter flyby, flown by the kernel',
    source:
      'v_inf = 5.6 km/s passing Jupiter at six Jupiter radii: the hyperbola integrated from 400 radii inbound to 400 radii outbound',
    why: 'The turn angle from the integrated trajectory’s eccentricity must be the closed form’s, the closest approach the one asked for, and |v_inf| unchanged, each to 1e-9.',
    run() {
      const p = BODIES.jupiter;
      const rp = 6 * p.radius;
      const f = flyby({ id: 'jupiter', vinfIn: [5.6, 0, 0], rp });
      const a = -p.GM / (5.6 * 5.6);
      const R = 400 * p.radius;
      const H = Math.acosh((1 - R / a) / f.e);
      const M = f.e * sinh(H) - H;
      const start = fromElements(
        { a, e: f.e, i: 0, Omega: 0, omega: 0, M: -M },
        p.GM
      );
      const t = (2 * M) / sqrt(p.GM / (-a) ** 3);
      const k = integrateTracked(p.GM, start.x, start.v, t, rp, 50);
      const eK = k.elements.e;
      const vinfK = sqrt(norm(k.v) ** 2 - (2 * p.GM) / norm(k.r));
      return [
        measure(
          'turn from the kernel / closed form - 1',
          abs((2 * Math.asin(1 / eK)) / f.delta - 1),
          0,
          1e-9
        ),
        measure(
          'periapsis from the kernel / asked - 1',
          abs((k.elements.a * (1 - eK)) / rp - 1),
          0,
          1e-9
        ),
        measure(
          'closest sampled approach / asked - 1',
          k.closest / rp - 1,
          0,
          1e-3
        ),
        measure('v_inf after / before - 1', abs(vinfK / 5.6 - 1), 0, 1e-9),
      ];
    },
  },
  {
    id: 'W1',
    kind: 'analytic',
    title: 'The transfer window finds the Hohmann transfer',
    source:
      'Earth to Mars on the model circles, 300 km parking orbits at both ends: a 41 by 41 window, one day a cell, centred on the Hohmann departure date and time of flight',
    why: 'Between coplanar circles no two-burn transfer is cheaper than the Hohmann one (for radii within 11.9 of each other), so the window may not go below it. The Hohmann cell itself is on the antipodal line and is refused, so the best cell is a neighbour, at most one day away on each axis; a one-day offset in 259 changes the cost at second order, (1/259)^2 = 1.5e-5 times a factor of order one, and the bound, 1e-4, allows that factor to be six.',
    run() {
      const im = interplanetaryHohmann(
        { id: 'earth', altitude: 300 },
        { id: 'mars', altitude: 300 }
      );
      const nE = circularOrbit('earth').n;
      const nM = circularOrbit('mars').n;
      const lead = PI - nM * im.tof;
      const rate = (nM - nE) * DAY;
      const d0 = ((BODIES.mars.L0 - BODIES.earth.L0) * PI) / 180;
      const turn = 2 * PI;
      let t = (((((lead - d0) % turn) + turn) % turn) - turn) / rate;
      while (t < 9000) t += turn / abs(rate);
      const tof = im.tof / DAY;
      const w = computeWindow({
        from: 'earth',
        to: 'mars',
        departStart: t - 20,
        departSpan: 40,
        departSteps: 41,
        tofMin: tof - 20,
        tofMax: tof + 20,
        tofSteps: 41,
      });
      return [
        measure(
          'best total / Hohmann - 1',
          w.best.total / im.total - 1,
          0,
          1e-4
        ),
        measure(
          'best is not below Hohmann',
          w.best.total >= im.total * (1 - 1e-12),
          true,
          0
        ),
        measure(
          'best departure - Hohmann date',
          abs(w.best.depart - t),
          0,
          1 + 1e-9,
          'd'
        ),
        measure(
          'best time of flight - Hohmann',
          abs(w.best.tof - tof),
          0,
          1 + 1e-9,
          'd'
        ),
        measure(
          'Hohmann cell status',
          CELL_STATUS[w.cellStatus[20 * 41 + 20]],
          'antipodal',
          0
        ),
      ];
    },
  },
  {
    id: 'M1',
    kind: 'independent',
    title: 'The patched conic against three bodies (a measured approximation)',
    source:
      'The Earth to Mars Hohmann departure flown in the Sun, the Earth and the spacecraft together (the kernel), from the patched conic’s periapsis state, for the Hohmann time',
    why: 'The patched conic ignores the Earth’s pull outside its sphere and the Sun’s inside it. The spacecraft’s greatest distance from the Sun is measured against the conic’s aphelion, Mars’s orbit: the bound, 1%, is the size of that neglect expected from (m / M)^(2/5) = 0.6%, and the value is what MISSION.md reports.',
    run() {
      const im = interplanetaryHohmann(
        { id: 'earth', altitude: 300 },
        { id: 'mars', altitude: 300 }
      );
      const muS = BODIES.sun.GM;
      const muE = BODIES.earth.GM;
      const u = { DU: AU, TU: sqrt(AU ** 3 / muS) };
      const E = planetState('earth', 0);
      const d = im.departure;
      const rp = BODIES.earth.radius + 300;
      // The outgoing asymptote along the Earth's velocity; periapsis is the
      // asymptote's true anomaly behind it, and the velocity there is
      // perpendicular, counter-clockwise.
      const nuInf = acos(-1 / d.e);
      const along = Math.atan2(E.v[1], E.v[0]);
      const pDir = [cos(along - nuInf), sin(along - nuInf), 0];
      const vDir = rotZ(pDir, PI / 2);
      const ship = {
        r: E.r.map((x, k) => x + rp * pDir[k]),
        v: E.v.map((x, k) => x + d.vp * vDir[k]),
      };
      const q = muE / muS;
      const s = makeState(
        [
          {
            m: 1,
            x: E.r.map(x => (-q * x) / (1 + q) / u.DU),
            v: E.v.map(x => ((-q * x) / (1 + q) / u.DU) * u.TU),
          },
          {
            m: q,
            x: E.r.map(x => x / (1 + q) / u.DU),
            v: E.v.map(x => (x / (1 + q) / u.DU) * u.TU),
          },
          {
            m: 0,
            x: ship.r.map((x, k) => (x - (q * E.r[k]) / (1 + q)) / u.DU),
            v: ship.v.map(
              (x, k) => ((x - (q * E.v[k]) / (1 + q)) / u.DU) * u.TU
            ),
          },
        ],
        { G: 1 }
      );
      let far = 0;
      dopri5(s, im.tof / u.TU, {
        tol: 1e-13,
        h0: 1e-9,
        onStep: () => {
          const r = Math.hypot(
            s.x[6] - s.x[0],
            s.x[7] - s.x[1],
            s.x[8] - s.x[2]
          );
          if (r > far) far = r;
        },
      });
      const aphelion = circularOrbit('mars').r / AU;
      return [
        measure(
          'greatest distance / Mars orbit - 1',
          far / aphelion - 1,
          0,
          1e-2
        ),
      ];
    },
  },
];

/** Whether a measure is within its tolerance. */
export const passes = m =>
  typeof m.expected === 'number'
    ? Number.isFinite(m.value) && abs(m.value - m.expected) <= m.tolerance
    : m.value === m.expected;

/** Run one case: its measures, each marked. */
export function runCase(c) {
  try {
    return c.run().map(m => ({ ...m, ok: passes(m) }));
  } catch (err) {
    return [
      {
        name: 'error',
        value: String(err?.message || err),
        expected: 'no error',
        tolerance: 0,
        unit: '',
        ok: false,
      },
    ];
  }
}
