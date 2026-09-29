// =============================================================================
// The mission lab's reference cases: the ephemeris, and the mission's steps
// -----------------------------------------------------------------------------
// The same form as ./references.js: each case runs and returns measures, a
// value, what it should be and a fixed tolerance argued in its `why`.
//
//   E   the ephemeris pack: its held-out error, its seams, and the planets'
//       orbits against their published mean elements
//   S   the mission's steps, each flown by the validated 3-D kernel: the
//       rendezvous, the departure hyperbola, the capture, Lambert on the
//       pack's positions, the rocket equation
//   D   the direct flight: what it measures, and that the integration is
//       not what makes it miss
//
// `npm run validate:mission` runs these after ./references.js, and writes
// both tables into their documents (MISSION.md, MISSION_LAB.md).
// =============================================================================

import { PACK, DATA } from '../data/ephemeris/solarSystem2025.js';
import { CHECK } from '../data/ephemeris/solarSystem2025Check.js';
import { toElements } from '../lab3d/elements.js';
import { BODIES } from './bodies.js';
import { checkRows, createEphemeris, jdOfDate } from './ephemeris.js';
import { lambert } from './lambert.js';
import {
  DEFAULT_PLAN,
  captureBurn,
  computeMission,
  departurePeriapsis,
  flyDirect,
  propellant,
  G0,
} from './solar.js';
import { rendezvous } from './transfers.js';
import { integrate } from './verify.js';
import { norm, sub } from './twobody.js';

const { abs, sqrt, cos, sin, exp, PI } = Math;
const DEG = PI / 180;
const AU = 149597870.7;
const measure = (name, value, expected, tolerance, unit = '') => ({
  name,
  value,
  expected,
  tolerance,
  unit,
});

let cached = null;
/** The pack, decoded once. */
export const ephemeris = () => (cached ??= createEphemeris(PACK, DATA));

export const LAB_CASES = [
  {
    id: 'E1',
    kind: 'independent',
    title: 'The pack against held-out Horizons states',
    source:
      'JPL Horizons (DE441) states at 12:00 TDB, which the fit never saw: the committed check set, every 73rd day of 2025 to 2045 for each body',
    why: 'The pack states its own bound for each body, the worst of the fitted and the held-out errors when it was built (tools/build-ephemeris.mjs); the check set must be inside it. The bounds are a few km and a hundredth of a m/s at most: a thousandth of the patched conic’s own error.',
    run() {
      const eph = ephemeris();
      const out = [];
      for (const b of PACK.bodies) {
        let pos = 0;
        let vel = 0;
        for (const r of checkRows(CHECK, b.id)) {
          const s = eph.stateAt(b.id, r[0]);
          pos = Math.max(pos, norm(sub(s.r, r.slice(1, 4))));
          vel = Math.max(vel, norm(sub(s.v, r.slice(4, 7))));
        }
        out.push(
          measure(`${b.id}: position`, pos, 0, b.maxError.positionKm, 'km')
        );
        out.push(
          measure(`${b.id}: velocity`, vel, 0, b.maxError.velocityKmS, 'km/s')
        );
      }
      return out;
    },
  },
  {
    id: 'E2',
    kind: 'independent',
    title: 'The pack is continuous where its segments meet',
    source:
      'Every seam between two Chebyshev segments, each side evaluated at the seam',
    why: 'Each segment is fitted on its own, so a seam could jump. The jump must be inside the body’s stated error, twice over (one error from each side).',
    run() {
      const out = [];
      for (const b of PACK.bodies) {
        let pos = 0;
        let vel = 0;
        const { startJd, stopJd } = PACK.range;
        for (let k = 1; k < b.segments - 1; k++) {
          const t = startJd + k * b.segmentDays;
          const before = ephemeris().stateAt(b.id, t - 1e-9);
          const after = ephemeris().stateAt(b.id, t + 1e-9);
          pos = Math.max(pos, norm(sub(before.r, after.r)));
          vel = Math.max(vel, norm(sub(before.v, after.v)));
          if (t > stopJd) break;
        }
        out.push(
          measure(
            `${b.id}: position jump`,
            pos,
            0,
            2 * b.maxError.positionKm,
            'km'
          )
        );
        out.push(
          measure(
            `${b.id}: velocity jump`,
            vel,
            0,
            2 * b.maxError.velocityKmS,
            'km/s'
          )
        );
      }
      return out;
    },
  },
  {
    id: 'E3',
    kind: 'textbook',
    title: 'The planets’ orbits against their published mean elements',
    source:
      'E. M. Standish, Keplerian Elements for Approximate Positions of the Major Planets (JPL): J2000 mean inclinations to the ecliptic, Venus 3.39468°, Mars 1.84969°, Jupiter 1.30440°; semi-major axes 0.72333566, 1.52371034 and 5.20288700 AU',
    why: 'The pack’s osculating orbit at 2025-01-01 is not the mean orbit: planets perturb each other by a few thousandths of a degree and a few parts in ten thousand of the axis. 0.02° and 0.2% are that with room, and would catch a wrong frame (the equator is 23.4° away) or a wrong unit at once. Jupiter’s axis is the system barycenter’s, perturbed by Saturn by about 0.5%, so its bound is 1%.',
    run() {
      const eph = ephemeris();
      const jd = PACK.range.startJd;
      const out = [];
      for (const [id, inc, a, tolA] of [
        ['venus', 3.39467605, 0.72333566, 0.002],
        ['mars', 1.84969142, 1.52371034, 0.002],
        ['jupiter', 1.30439695, 5.202887, 0.01],
      ]) {
        const s = eph.stateAt(id, jd);
        const el = toElements(s.r, s.v, BODIES.sun.GM);
        out.push(measure(`${id}: inclination`, el.i / DEG, inc, 0.02, 'deg'));
        out.push(
          measure(
            `${id}: semi-major axis / published - 1`,
            el.a / AU / a - 1,
            0,
            tolA
          )
        );
      }
      const e = eph.stateAt('earth', jd);
      out.push(
        measure(
          'earth: inclination',
          toElements(e.r, e.v, BODIES.sun.GM).i / DEG,
          0,
          0.02,
          'deg'
        )
      );
      return out;
    },
  },
  {
    id: 'S1',
    kind: 'independent',
    title: 'Lambert between the pack’s positions, flown by the kernel',
    source:
      'The lab’s default departure, 2026-11-01, 309 days to Mars: the Lambert solution from the Earth’s center, flown under the Sun alone',
    why: 'This is the patched conic’s heliocentric leg exactly, so the kernel must land on Mars’s ephemeris position to its own accuracy: 1e-12 of 2e8 km is a fraction of a meter, and the bound is 10 m.',
    run() {
      const eph = ephemeris();
      const jd = jdOfDate('2026-11-01');
      const A = eph.stateAt('earth', jd);
      const B = eph.stateAt('mars', jd + 309);
      const s = lambert({
        mu: BODIES.sun.GM,
        r1: A.r,
        r2: B.r,
        tof: 309 * 86400,
      });
      const f = flyDirect(eph, { r: A.r, v: s.v1 }, jd, 309, {
        bodies: [],
        samples: 4,
      });
      return [measure('miss at Mars', norm(sub(f.end.r, B.r)), 0, 0.01, 'km')];
    },
  },
  {
    id: 'S2',
    kind: 'independent',
    title: 'The rendezvous with the depot, flown by the kernel',
    source:
      'The default plan: a spacecraft at 300 km and the depot at 400 km, 17 degrees ahead; the wait, both burns and the depot, integrated',
    why: 'The spacecraft and the depot must meet: their separation at the arrival time is below 1e-8 of the radius, as in the core’s own case R1.',
    run() {
      const mu = BODIES.earth.GM;
      const r1 = BODIES.earth.radius + DEFAULT_PLAN.parking.altitude;
      const r2 = BODIES.earth.radius + DEFAULT_PLAN.depot.altitude;
      const phase = DEFAULT_PLAN.depot.phaseDeg * DEG;
      const p = rendezvous(mu, r1, r2, phase);
      const v1 = sqrt(mu / r1);
      const v2 = sqrt(mu / r2);
      const [a, b] = integrate(
        mu,
        [
          { r: [r1, 0, 0], v: [0, v1, 0] },
          {
            r: [r2 * cos(phase), r2 * sin(phase), 0],
            v: [-v2 * sin(phase), v2 * cos(phase), 0],
          },
        ],
        p.wait,
        r1
      );
      a.v = a.v.map(x => (x * p.burns[0].to) / p.burns[0].from);
      const [c, d] = integrate(mu, [a, b], p.tof, r1);
      return [
        measure('separation / depot radius', norm(sub(c.r, d.r)) / r2, 0, 1e-8),
      ];
    },
  },
  {
    id: 'S3',
    kind: 'independent',
    title: 'The departure hyperbola leaves along its asymptote',
    source:
      'The default departure’s periapsis state at 400 km, flown by the kernel about the Earth alone for 30 days',
    why: 'Far out, the velocity must point along the excess velocity the Lambert solution needs: after 30 days (5 million km) the direction is within 1e-3 rad of the asymptote, and the speed within 1e-4 of the vis-viva speed there.',
    run() {
      const eph = ephemeris();
      const jd = jdOfDate('2026-11-01');
      const A = eph.stateAt('earth', jd);
      const B = eph.stateAt('mars', jd + 309);
      const s = lambert({
        mu: BODIES.sun.GM,
        r1: A.r,
        r2: B.r,
        tof: 309 * 86400,
      });
      const vinfV = sub(s.v1, A.v);
      const vinf = norm(vinfV);
      const mu = BODIES.earth.GM;
      const peri = departurePeriapsis(mu, BODIES.earth.radius + 400, vinfV);
      const [end] = integrate(
        mu,
        [{ r: peri.r, v: peri.v }],
        30 * 86400,
        BODIES.earth.radius + 400
      );
      const cosAngle =
        end.v.reduce((q, x, k) => q + x * vinfV[k], 0) / (norm(end.v) * vinf);
      const expect = sqrt(vinf * vinf + (2 * mu) / norm(end.r));
      return [
        measure(
          'angle to the asymptote',
          Math.acos(Math.min(1, cosAngle)),
          0,
          1e-3,
          'rad'
        ),
        measure('speed / vis-viva - 1', norm(end.v) / expect - 1, 0, 1e-4),
      ];
    },
  },
  {
    id: 'S4',
    kind: 'independent',
    title: 'The capture burn, flown by the kernel',
    source:
      'Arriving at Mars at 2.57 km/s excess speed onto a 400 km periapsis: the hyperbola from 100 Mars radii, the capture burn at periapsis, then one orbit',
    why: 'After the burn the kernel’s orbit must have the periapsis and apoapsis asked for (circular at 400 km, then 400 by 33,000 km), each to 1e-9.',
    run() {
      const mu = BODIES.mars.GM;
      const R = BODIES.mars.radius;
      const rp = R + 400;
      const out = [];
      for (const ra of [rp, R + 33000]) {
        const c = captureBurn(mu, rp, ra, 2.57);
        // At periapsis, moving at the hyperbola's speed; then the burn.
        const after = { r: [rp, 0, 0], v: [0, c.vHyp - c.dv, 0] };
        const [end] = integrate(mu, [after], c.period * 0.37, rp);
        const el = toElements(end.r, end.v, mu);
        out.push(
          measure(
            `${ra === rp ? 'circular' : 'elliptical'}: periapsis / asked - 1`,
            (el.a * (1 - el.e)) / rp - 1,
            0,
            1e-9
          )
        );
        out.push(
          measure(
            `${ra === rp ? 'circular' : 'elliptical'}: apoapsis / asked - 1`,
            (el.a * (1 + el.e)) / ra - 1,
            0,
            1e-9
          )
        );
      }
      return out;
    },
  },
  {
    id: 'S5',
    kind: 'analytic',
    title: 'The rocket equation, burn by burn',
    source:
      'Three burns of 1, 2 and 0.5 km/s at Isp 320 s from a 2000 kg dry spacecraft',
    why: 'Splitting the burns must cost exactly what one burn of their sum costs: the rocket equation is multiplicative. Agreement to rounding, 1e-9 kg.',
    run() {
      const p = propellant([{ dv: 1 }, { dv: 2 }, { dv: 0.5 }], 2000, 320);
      const one = 2000 * (exp(3500 / (320 * G0)) - 1);
      return [
        measure('split - whole', abs(p.propellantKg - one), 0, 1e-9, 'kg'),
      ];
    },
  },
  {
    id: 'D1',
    kind: 'independent',
    title: 'What makes the direct flight miss',
    source:
      'The default mission flown directly five ways: from the Earth’s center with the Sun alone, with the other planets, and from the 400 km periapsis with the Earth’s pull, with everything, and corrected on day 30',
    why: 'The integration is not what misses: from the Earth’s center under the Sun alone it arrives within 10 m. The other planets move the arrival by under 2e5 km; the Earth’s pull on a departure from its real periapsis moves it by over 1e6 km. That is the measurement the lab’s diagnosis step is marked against. A correction on day 30 must bring the spacecraft within 100 km, in at most 8 aims.',
    run() {
      const eph = ephemeris();
      const fly = direct =>
        computeMission(eph, { ...DEFAULT_PLAN, direct }).direct.missKm;
      const corrected = computeMission(eph, {
        ...DEFAULT_PLAN,
        correct: { day: 30 },
      });
      return [
        measure(
          'Earth’s center, the Sun alone',
          fly({ bodies: [], start: 'center' }),
          0,
          0.01,
          'km'
        ),
        measure(
          'Earth’s center, the other planets: under 2e5 km',
          fly({ bodies: ['venus', 'mars', 'jupiter'], start: 'center' }) < 2e5,
          true,
          0
        ),
        measure(
          'periapsis, the Earth: over 1e6 km',
          fly({ bodies: ['earth'], start: 'periapsis' }) > 1e6,
          true,
          0
        ),
        measure(
          'periapsis, everything: over 1e6 km',
          fly({
            bodies: ['venus', 'earth', 'mars', 'jupiter'],
            start: 'periapsis',
          }) > 1e6,
          true,
          0
        ),
        measure(
          'corrected on day 30: the miss',
          corrected.direct.missKm,
          0,
          100,
          'km'
        ),
        measure(
          'corrected on day 30: aims',
          corrected.correction.aims <= 8,
          true,
          0
        ),
      ];
    },
  },
  {
    id: 'D2',
    kind: 'independent',
    title: 'Correcting early costs less',
    source: 'The default mission corrected on day 10, 30, 100 and 200',
    why: 'An error in velocity grows into an error in position with time, so the same miss costs less to remove early. The four corrections must cost more the later they come.',
    run() {
      const eph = ephemeris();
      const dv = day =>
        computeMission(eph, { ...DEFAULT_PLAN, correct: { day } }).correction
          .dv;
      const [a, b, c, d] = [10, 30, 100, 200].map(dv);
      return [
        measure(
          'day 10 < day 30 < day 100 < day 200',
          a < b && b < c && c < d,
          true,
          0
        ),
        measure('day 200 / day 10', d / a > 2, true, 0),
      ];
    },
  },
];
