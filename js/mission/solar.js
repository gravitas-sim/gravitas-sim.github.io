// =============================================================================
// The mission lab's model: a mission on the ephemeris, and flown directly
// -----------------------------------------------------------------------------
// A mission here is a plan (MISSION_LAB.md):
//
//   parking   the circular orbit a launch leaves the spacecraft in
//   depot     a circular orbit with a depot to meet and refuel at: a
//             rendezvous by a Hohmann transfer (./transfers.js)
//   depart    a date and a time of flight to Mars: a Lambert transfer between
//             the planets' ephemeris positions (./ephemeris.js), and the
//             hyperbolic departure burn from the depot's orbit
//   arrive    capture at Mars into an orbit of a periapsis and an apoapsis
//             altitude (equal: circular)
//   correct   optionally, a correction burn on the way, some days out
//   vehicle   dry mass and specific impulse, for the propellant each burn costs
//
// Two answers come of it, and the lab puts them side by side:
//
//   patched   the patched-conic design: planet-centered hyperbolas at each
//             end, and the Sun's two-body ellipse between the planets'
//             centers
//   direct    the same spacecraft flown by the validated 3-D kernel from the
//             depot orbit's periapsis, under the Sun and the planets the
//             reader includes, started from their ephemeris states
//
// The direct flight misses Mars by a great deal, and the lab asks why: the
// patched conic starts the heliocentric leg at the Earth's center and lets
// the Earth's pull end at its sphere of influence. The planets' own pulls add
// a few percent. Pure arithmetic over the pack, the kernel and the core; the
// Worker runs it.
// =============================================================================

import { dopri5, makeState } from '../lab3d/kernel.js';
import { BODIES } from './bodies.js';
import { JD_J2000 } from './ephemeris.js';
import { lambert } from './lambert.js';
import { hyperbolicBurn, sphereOfInfluence } from './patched.js';
import { rendezvous } from './transfers.js';
import { add, cross, norm, propagate, scale, sub } from './twobody.js';

const { sqrt, exp, cos, sin, acos, PI } = Math;

export const AU_KM = 149597870.7;
/** Standard gravity, m/s^2, exact by definition (CGPM 1901): Isp in seconds. */
export const G0 = 9.80665;
/**
 * GM of the Jupiter system, planet and moons, km^3/s^2: the pack's Jupiter is
 * the system's barycenter (MISSION_LAB.md), which moves as the whole system's
 * mass pulls. JPL's value, rounded.
 */
export const JUPITER_SYSTEM_GM = 126712764.1;
/** Who may pull in a direct flight, and how hard. */
export const PULLERS = Object.freeze({
  venus: BODIES.venus.GM,
  earth: BODIES.earth.GM,
  mars: BODIES.mars.GM,
  jupiter: JUPITER_SYSTEM_GM,
});
export const DAY_S = 86400;
/** A correction aims again until the spacecraft arrives this close to Mars, km. */
export const AIM_KM = 100;
/** And gives up after this many aims. */
export const MAX_AIMS = 8;

export { DEFAULT_PLAN } from './lab/defaults.js';

/** The planets' states from the pack, by days from J2000.0, for ./window.js. */
export const statesFrom = eph => (id, days) => eph.stateAt(id, JD_J2000 + days);

/**
 * The periapsis state of a departure hyperbola whose outgoing asymptote is
 * along vinf (heliocentric minus the Earth's velocity), for a periapsis
 * radius rp: in the plane of the asymptote and the ecliptic direction
 * perpendicular to it, so a low-inclination parking orbit.
 * @returns {{r: number[], v: number[], e: number, vp: number}} Earth-relative
 */
export function departurePeriapsis(mu, rp, vinfV) {
  const vinf = norm(vinfV);
  const dep = hyperbolicBurn(mu, rp, vinf);
  const u = scale(vinfV, 1 / vinf);
  let p = cross([0, 0, 1], u);
  const pn = norm(p);
  // An asymptote along the ecliptic pole has no in-ecliptic perpendicular.
  p = pn > 1e-9 ? scale(p, 1 / pn) : [1, 0, 0];
  // The outgoing asymptote is true anomaly nu_inf from periapsis:
  // u = cos(nu) P + sin(nu) Q.
  const nu = acos(-1 / dep.e);
  const P = sub(scale(u, cos(nu)), scale(p, sin(nu)));
  const Q = add(scale(u, sin(nu)), scale(p, cos(nu)));
  return { r: scale(P, rp), v: scale(Q, dep.vp), e: dep.e, vp: dep.vp };
}

/** The capture burn into an orbit of periapsis rp and apoapsis ra (ra = rp: circular). */
export function captureBurn(mu, rp, ra, vinf) {
  if (!(rp > 0 && ra >= rp && vinf >= 0)) return { ok: false, status: 'input' };
  const vHyp = sqrt(vinf * vinf + (2 * mu) / rp);
  const a = (rp + ra) / 2;
  const vOrbit = sqrt(mu * (2 / rp - 1 / a));
  return {
    ok: true,
    status: 'ok',
    dv: vHyp - vOrbit,
    vHyp,
    vOrbit,
    period: 2 * PI * sqrt((a * a * a) / mu),
  };
}

/**
 * Propellant for a sequence of burns, by the rocket equation, from the dry
 * mass at the end back to the mass at the start: m_before = m_after
 * exp(dv / (Isp g0)). Burns in km/s; masses in kg.
 */
export function propellant(burns, dryKg, ispS) {
  const ve = (ispS * G0) / 1000;
  let after = dryKg;
  const rows = [];
  for (let k = burns.length - 1; k >= 0; k--) {
    const before = after * exp(burns[k].dv / ve);
    rows.unshift({
      ...burns[k],
      massBefore: before,
      massAfter: after,
      propellant: before - after,
    });
    after = before;
  }
  return { rows, startKg: after, propellantKg: after - dryKg, exhaustKmS: ve };
}

/**
 * Fly a spacecraft directly: the Sun and the planets named, from their
 * ephemeris states at jdStart, and a massless spacecraft from a heliocentric
 * state, integrated by the 3-D kernel for `days`. Run in the barycentric
 * frame of the bodies included, in AU and the Sun's canonical time, and read
 * back heliocentric.
 * @returns {{end, bodiesEnd, closest, track, steps}}
 */
export function flyDirect(
  eph,
  ship,
  jdStart,
  days,
  { bodies = [], samples = 120, tol = 1e-12, near = 'mars' } = {}
) {
  const muS = BODIES.sun.GM;
  const TU = sqrt((AU_KM * AU_KM * AU_KM) / muS);
  const list = [
    { id: 'sun', m: 1, r: [0, 0, 0], v: [0, 0, 0] },
    ...bodies.map(id => ({
      id,
      m: PULLERS[id] / muS,
      ...eph.stateAt(id, jdStart),
    })),
  ];
  const mt = list.reduce((q, b) => q + b.m, 0);
  const cr = [0, 1, 2].map(
    k => list.reduce((q, b) => q + b.m * b.r[k], 0) / mt
  );
  const cv = [0, 1, 2].map(
    k => list.reduce((q, b) => q + b.m * b.v[k], 0) / mt
  );
  const kernelBodies = [...list, { id: 'ship', m: 0, ...ship }].map(b => ({
    m: b.m,
    x: b.r.map((x, k) => (x - cr[k]) / AU_KM),
    v: b.v.map((x, k) => ((x - cv[k]) / AU_KM) * TU),
  }));
  const s = makeState(kernelBodies, { G: 1 });
  const n = kernelBodies.length;
  const ship3 = 3 * (n - 1);
  const nearIndex = list.findIndex(b => b.id === near);
  const helio = k => [0, 1, 2].map(a => (s.x[3 * k + a] - s.x[a]) * AU_KM);
  const helioV = k =>
    [0, 1, 2].map(a => ((s.v[3 * k + a] - s.v[a]) * AU_KM) / TU);
  let closest = { km: Infinity, day: 0 };
  const onStep = () => {
    if (nearIndex < 0) return;
    const d =
      Math.hypot(
        s.x[ship3] - s.x[3 * nearIndex],
        s.x[ship3 + 1] - s.x[3 * nearIndex + 1],
        s.x[ship3 + 2] - s.x[3 * nearIndex + 2]
      ) * AU_KM;
    if (d < closest.km) closest = { km: d, day: (s.t * TU) / DAY_S };
  };
  const track = [{ day: 0, r: helio(n - 1) }];
  let steps = 0;
  const span = (days * DAY_S) / TU;
  for (let k = 1; k <= samples; k++) {
    const res = dopri5(s, span / samples, { tol, h0: 1e-7, onStep });
    steps += res.accepted;
    track.push({ day: (days * k) / samples, r: helio(n - 1) });
  }
  const bodiesEnd = Object.fromEntries(
    list.map((b, i) => [b.id, { r: helio(i), v: helioV(i) }])
  );
  return {
    end: { r: helio(n - 1), v: helioV(n - 1) },
    bodiesEnd,
    closest,
    track,
    steps,
  };
}

/** Why a plan cannot be computed, as {path, code}; empty if it can be. */
export function planProblems(plan, eph) {
  const out = [];
  const num = (path, v, ok) => {
    if (!(Number.isFinite(v) && ok(v))) out.push({ path, code: 'value' });
  };
  num('parking.altitude', plan?.parking?.altitude, x => x >= 150 && x <= 2000);
  num('depot.altitude', plan?.depot?.altitude, x => x >= 150 && x <= 2000);
  num('depot.phaseDeg', plan?.depot?.phaseDeg, x => x >= 0 && x < 360);
  num('depart.tofDays', plan?.depart?.tofDays, x => x >= 60 && x <= 600);
  num(
    'arrive.periapsisAltitude',
    plan?.arrive?.periapsisAltitude,
    x => x >= 100 && x <= 100000
  );
  num(
    'arrive.apoapsisAltitude',
    plan?.arrive?.apoapsisAltitude,
    x => x >= (plan?.arrive?.periapsisAltitude ?? 0) && x <= 500000
  );
  num('vehicle.dryKg', plan?.vehicle?.dryKg, x => x > 0 && x <= 1e6);
  num('vehicle.ispS', plan?.vehicle?.ispS, x => x >= 50 && x <= 10000);
  if (plan?.parking?.altitude === plan?.depot?.altitude)
    out.push({ path: 'depot.altitude', code: 'sameOrbit' });
  const jd = jdOf(plan?.depart?.date);
  if (!Number.isFinite(jd)) out.push({ path: 'depart.date', code: 'date' });
  else if (
    eph &&
    !(
      jd >= eph.range.startJd &&
      jd + (plan.depart.tofDays || 0) <= eph.range.stopJd
    )
  )
    out.push({ path: 'depart.date', code: 'outOfRange' });
  if (plan?.correct)
    num(
      'correct.day',
      plan.correct.day,
      x => x >= 1 && x <= (plan.depart.tofDays || 0) - 10
    );
  const bodies = plan?.direct?.bodies;
  if (
    !Array.isArray(bodies) ||
    bodies.some(b => !(b in PULLERS)) ||
    new Set(bodies).size !== bodies.length
  )
    out.push({ path: 'direct.bodies', code: 'value' });
  if (!['periapsis', 'center'].includes(plan?.direct?.start))
    out.push({ path: 'direct.start', code: 'value' });
  return out;
}

/** YYYY-MM-DD at 00:00 as a Julian date (TDB, to within the 69 s from UTC). */
function jdOf(date) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(date));
  if (!m) return NaN;
  const ms = Date.UTC(+m[1], +m[2] - 1, +m[3]);
  if (new Date(ms).toISOString().slice(0, 10) !== date) return NaN;
  return ms / 86400000 + 2440587.5;
}

/**
 * Compute a whole mission. Refusals come back as {ok: false, status, problems?}.
 * @returns {object} The patched design, the direct flight, the budget and the timeline
 */
export function computeMission(eph, plan) {
  const problems = planProblems(plan, eph);
  if (problems.length) return { ok: false, status: 'input', problems };
  const E = BODIES.earth;
  const Mars = BODIES.mars;
  const muS = BODIES.sun.GM;
  // In Earth orbit: meet the depot.
  const meet = rendezvous(
    E.GM,
    E.radius + plan.parking.altitude,
    E.radius + plan.depot.altitude,
    (plan.depot.phaseDeg * PI) / 180
  );
  if (!meet.ok) return { ok: false, status: meet.status };
  // Between the planets: Lambert on the ephemeris.
  const jd0 = jdOf(plan.depart.date);
  const tof = plan.depart.tofDays;
  const A = eph.stateAt('earth', jd0);
  const B = eph.stateAt('mars', jd0 + tof);
  const transfer = lambert({ mu: muS, r1: A.r, r2: B.r, tof: tof * DAY_S });
  if (!transfer.ok)
    return {
      ok: false,
      status: transfer.status,
      transfer: { iterations: transfer.iterations ?? 0 },
    };
  const vinfDepV = sub(transfer.v1, A.v);
  const vinfArrV = sub(transfer.v2, B.v);
  const vinfDep = norm(vinfDepV);
  const vinfArr = norm(vinfArrV);
  const rpDepart = E.radius + plan.depot.altitude;
  const depart = hyperbolicBurn(E.GM, rpDepart, vinfDep);
  const capture = captureBurn(
    Mars.GM,
    Mars.radius + plan.arrive.periapsisAltitude,
    Mars.radius + plan.arrive.apoapsisAltitude,
    vinfArr
  );
  // The same spacecraft, flown directly.
  const peri = departurePeriapsis(E.GM, rpDepart, vinfDepV);
  const shipStart =
    plan.direct.start === 'center'
      ? { r: [...A.r], v: [...transfer.v1] }
      : { r: add(A.r, peri.r), v: add(A.v, peri.v) };
  const opts = { bodies: plan.direct.bodies };
  let direct;
  let correction = null;
  if (plan.correct) {
    const d = plan.correct.day;
    const first = flyDirect(eph, shipStart, jd0, d, {
      ...opts,
      samples: Math.max(4, Math.round((120 * d) / tof)),
    });
    // Retarget Mars's ephemeris position at the planned arrival. A Lambert
    // solve about the Sun alone leaves out the pulls that made the miss, so
    // the aim point is moved by the miss and the leg flown again, until the
    // spacecraft arrives within AIM_KM of Mars (a navigation team's
    // differential correction, in its simplest form). The aiming leg leaves
    // Mars's own pull out, as the patched conic's heliocentric leg does:
    // aimed at the planet's center with the planet pulling, the spacecraft
    // falls into it, and there is no aim point to converge on. Arrival
    // belongs to Mars's own hyperbola, and B-plane targeting is not supported.
    const aimOpts = { bodies: plan.direct.bodies.filter(b => b !== 'mars') };
    let aim = [...B.r];
    let re = null;
    let second = null;
    let iterations = 0;
    let missKm = Infinity;
    for (; iterations < MAX_AIMS; iterations++) {
      re = lambert({
        mu: muS,
        r1: first.end.r,
        r2: aim,
        tof: (tof - d) * DAY_S,
      });
      if (!re.ok) return { ok: false, status: re.status };
      second = flyDirect(eph, { r: first.end.r, v: re.v1 }, jd0 + d, tof - d, {
        ...aimOpts,
        samples: Math.max(4, 120 - first.track.length + 1),
      });
      const miss = sub(second.end.r, B.r);
      missKm = norm(miss);
      if (missKm <= AIM_KM) break;
      aim = sub(aim, miss);
    }
    if (!(missKm <= AIM_KM)) return { ok: false, status: 'noConvergence' };
    const dv = norm(sub(re.v1, first.end.v));
    const offset = t => ({ ...t, day: t.day + d });
    direct = {
      end: second.end,
      bodiesEnd: second.bodiesEnd,
      // Mars does not pull on the aimed leg, so a closest approach to it
      // would say nothing: a corrected flight reports its miss instead.
      closest: { km: null, day: null },
      track: [...first.track, ...second.track.slice(1).map(offset)],
      steps: first.steps + second.steps,
    };
    correction = {
      day: d,
      dv,
      aims: iterations + 1,
      missKm,
      lambert: {
        iterations: re.iterations,
        residual: re.residual,
        miss: re.miss,
      },
    };
  } else {
    direct = flyDirect(eph, shipStart, jd0, tof, opts);
    if (!plan.direct.bodies.includes('mars'))
      direct.closest = { km: null, day: null };
  }
  const marsDirect = direct.bodiesEnd.mars?.r ?? null;
  const missEphemeris = norm(sub(direct.end.r, B.r));
  // The patched design's heliocentric arc, sampled for the views.
  const arc = [];
  for (let k = 0; k <= 60; k++) {
    const t = (tof * DAY_S * k) / 60;
    const p = propagate(muS, A.r, transfer.v1, t);
    arc.push({ day: (tof * k) / 60, r: p.ok ? p.r : null });
  }
  const orbitOf = (id, from, to, n = 90) =>
    Array.from(
      { length: n + 1 },
      (_, k) => eph.stateAt(id, from + ((to - from) * k) / n).r
    );
  // Budget, in time order.
  const depotDays = 7;
  const tRendezvous = jd0 - depotDays - (meet.arrival + 0) / DAY_S;
  const burns = [
    {
      id: 'meet1',
      jd: tRendezvous + meet.burns[0].at / DAY_S,
      dv: meet.burns[0].dv,
      phase: 'earthOrbit',
    },
    {
      id: 'meet2',
      jd: tRendezvous + meet.burns[1].at / DAY_S,
      dv: meet.burns[1].dv,
      phase: 'earthOrbit',
    },
    { id: 'depart', jd: jd0, dv: depart.dv, phase: 'interplanetary' },
    ...(correction
      ? [
          {
            id: 'correct',
            jd: jd0 + correction.day,
            dv: correction.dv,
            phase: 'interplanetary',
          },
        ]
      : []),
    { id: 'capture', jd: jd0 + tof, dv: capture.dv, phase: 'interplanetary' },
  ];
  // The depot refuels the spacecraft: the burns after it are paid from the
  // depot's propellant, those before from what the launch left in the tanks.
  const after = propellant(
    burns.filter(b => b.phase === 'interplanetary'),
    plan.vehicle.dryKg,
    plan.vehicle.ispS
  );
  const before = propellant(
    burns.filter(b => b.phase === 'earthOrbit'),
    plan.vehicle.dryKg,
    plan.vehicle.ispS
  );
  const events = [
    { id: 'parking', jd: tRendezvous },
    { id: 'meet1', jd: burns[0].jd },
    { id: 'meet2', jd: burns[1].jd },
    { id: 'docked', jd: burns[1].jd },
    { id: 'depart', jd: jd0 },
    {
      id: 'soi',
      jd: jd0 + soiDays(E.GM, rpDepart, vinfDep, sphereOfInfluence('earth')),
    },
    ...(correction ? [{ id: 'correct', jd: jd0 + correction.day }] : []),
    ...(direct.closest.km !== null && Number.isFinite(direct.closest.km)
      ? [{ id: 'closest', jd: jd0 + direct.closest.day }]
      : []),
    { id: 'arrive', jd: jd0 + tof },
  ].sort((a, b) => a.jd - b.jd);
  return {
    ok: true,
    status: 'ok',
    plan,
    rendezvous: {
      lead: meet.lead,
      wait: meet.wait,
      synodic: meet.synodic,
      tof: meet.tof,
      total: meet.total,
    },
    patched: {
      departJd: jd0,
      arriveJd: jd0 + tof,
      c3: vinfDep * vinfDep,
      vinfDep,
      vinfArr,
      declination: Math.asin(vinfDepV[2] / vinfDep),
      departDv: depart.dv,
      captureDv: capture.dv,
      captureOrbitPeriod: capture.period,
      transferAngle: transfer.transferAngle,
      a: transfer.a,
      solver: {
        status: transfer.status,
        iterations: transfer.iterations,
        residual: transfer.residual,
        miss: transfer.miss,
      },
    },
    direct: {
      bodies: [...plan.direct.bodies],
      start: plan.direct.start,
      missKm: missEphemeris,
      missVsIntegratedMarsKm: marsDirect
        ? norm(sub(direct.end.r, marsDirect))
        : null,
      closestKm: Number.isFinite(direct.closest.km) ? direct.closest.km : null,
      closestDay: Number.isFinite(direct.closest.km)
        ? direct.closest.day
        : null,
      marsDriftKm: marsDirect ? norm(sub(marsDirect, B.r)) : null,
      steps: direct.steps,
    },
    correction,
    burns,
    budget: {
      total: burns.reduce((s, b) => s + b.dv, 0),
      earthOrbit: before,
      interplanetary: after,
    },
    events,
    views: {
      earth: orbitOf('earth', jd0, jd0 + tof),
      mars: orbitOf('mars', jd0, jd0 + tof),
      arc,
      direct: direct.track,
      departure: departureView(E.GM, rpDepart, peri),
      at: {
        earth0: A.r,
        mars0: eph.stateAt('mars', jd0).r,
        earth1: eph.stateAt('earth', jd0 + tof).r,
        mars1: B.r,
      },
    },
  };
}

/** Time from periapsis to the sphere of influence on the departure hyperbola, days. */
function soiDays(mu, rp, vinf, soi) {
  const a = -mu / (vinf * vinf);
  const e = 1 - rp / a;
  const H = Math.acosh((1 - soi / a) / e);
  return (sqrt((-a) ** 3 / mu) * (e * Math.sinh(H) - H)) / DAY_S;
}

/** The parking orbit and the departure hyperbola, Earth-centered, for the view. */
function departureView(mu, rp, peri) {
  const vc = sqrt(mu / rp);
  const P = scale(peri.r, 1 / rp);
  const Q = scale(peri.v, 1 / peri.vp);
  const circle = Array.from({ length: 73 }, (_, k) => {
    const t = (2 * PI * k) / 72;
    return add(scale(P, rp * cos(t)), scale(Q, rp * sin(t)));
  });
  const hyperbola = [];
  for (let k = 0; k <= 60; k++) {
    const p = propagate(mu, peri.r, peri.v, (k / 60) * 20 * 3600);
    if (p.ok) hyperbola.push(p.r);
  }
  return { circle, hyperbola, rp, vc };
}
