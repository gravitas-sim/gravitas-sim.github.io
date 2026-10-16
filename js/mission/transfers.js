// =============================================================================
// Impulsive transfers between circular orbits, plane changes and phasing
// -----------------------------------------------------------------------------
// Closed forms, each with what it assumes stated in its answer: impulsive
// burns (instantaneous changes of velocity, no finite-burn losses), one point
// mass, circular start and end orbits. Speeds in km/s, radii in km, times in s.
//
//   hohmann             two tangent burns on the ellipse touching both circles
//   biElliptic          three burns, out to rb and back down
//   biEllipticLimit     rb -> infinity: the least three-burn cost, forever
//   planeChange         turning a velocity v through di at the same speed
//   combinedBurn        changing speed and plane in one burn
//   hohmannPlaneChange  a Hohmann transfer that also changes plane, the
//                       change split between its two burns; optimalSplit
//                       finds the split that costs least
//   rendezvous          a Hohmann transfer to a target on another circle:
//                       the lead angle, the synodic period and the wait
//   phasing             catching a target on the same circle by one lap, or
//                       k laps, on a phasing orbit
//
// A problem the closed form does not describe is refused with a code (radii
// that are not positive, rb inside an orbit, the same circle twice, a phasing
// orbit through the surface), never answered with a number that looks right.
// =============================================================================

import { circularSpeed, period, visViva } from './twobody.js';

const { sqrt, sin, cos, abs, PI, cbrt } = Math;
const TAU = 2 * PI;
const positive = (...xs) => xs.every(x => Number.isFinite(x) && x > 0);
const refuse = code => ({ ok: false, status: code });

/** The Hohmann transfer from a circle of radius r1 to one of radius r2. */
export function hohmann(mu, r1, r2) {
  if (!positive(mu, r1, r2)) return refuse('input');
  if (r1 === r2) return refuse('sameOrbit');
  const a = (r1 + r2) / 2;
  const v1 = circularSpeed(mu, r1);
  const v2 = circularSpeed(mu, r2);
  const vp = visViva(mu, r1, a);
  const va = visViva(mu, r2, a);
  const burns = [
    { at: 0, r: r1, from: v1, to: vp, dv: abs(vp - v1), di: 0 },
    {
      at: PI * sqrt((a * a * a) / mu),
      r: r2,
      from: va,
      to: v2,
      dv: abs(v2 - va),
      di: 0,
    },
  ];
  return {
    ok: true,
    status: 'ok',
    kind: 'hohmann',
    a,
    tof: burns[1].at,
    burns,
    total: burns[0].dv + burns[1].dv,
  };
}

/** The bi-elliptic transfer through an intermediate apoapsis rb >= both radii. */
export function biElliptic(mu, r1, r2, rb) {
  if (!positive(mu, r1, r2, rb)) return refuse('input');
  if (r1 === r2) return refuse('sameOrbit');
  if (rb < Math.max(r1, r2)) return refuse('intermediate');
  const a1 = (r1 + rb) / 2;
  const a2 = (r2 + rb) / 2;
  const v1 = circularSpeed(mu, r1);
  const v2 = circularSpeed(mu, r2);
  const p1 = visViva(mu, r1, a1);
  const b1 = visViva(mu, rb, a1);
  const b2 = visViva(mu, rb, a2);
  const p2 = visViva(mu, r2, a2);
  const t1 = PI * sqrt((a1 * a1 * a1) / mu);
  const t2 = PI * sqrt((a2 * a2 * a2) / mu);
  const burns = [
    { at: 0, r: r1, from: v1, to: p1, dv: abs(p1 - v1), di: 0 },
    { at: t1, r: rb, from: b1, to: b2, dv: abs(b2 - b1), di: 0 },
    { at: t1 + t2, r: r2, from: p2, to: v2, dv: abs(v2 - p2), di: 0 },
  ];
  return {
    ok: true,
    status: 'ok',
    kind: 'biElliptic',
    rb,
    tof: t1 + t2,
    burns,
    total: burns.reduce((s, b) => s + b.dv, 0),
  };
}

/**
 * The bi-elliptic transfer's limit as rb goes to infinity: out on a
 * parabola, a burn of nothing at infinity, back on a parabola. The least
 * cost any three-burn transfer approaches, in an unbounded time.
 */
export function biEllipticLimit(mu, r1, r2) {
  if (!positive(mu, r1, r2)) return refuse('input');
  const k = sqrt(2) - 1;
  const v1 = circularSpeed(mu, r1);
  const v2 = circularSpeed(mu, r2);
  return {
    ok: true,
    status: 'ok',
    kind: 'biEllipticLimit',
    tof: Infinity,
    total: k * (v1 + v2),
  };
}

/** Turning a velocity of speed v through di radians at constant speed. */
export const planeChange = (v, di) => 2 * v * sin(abs(di) / 2);

/** One burn from speed va to speed vb with a plane change di between them. */
export const combinedBurn = (va, vb, di) =>
  sqrt(Math.max(0, va * va + vb * vb - 2 * va * vb * cos(di)));

/**
 * A Hohmann transfer that also changes the orbit's plane by di radians:
 * `split` of it at the first burn, the rest at the second.
 */
export function hohmannPlaneChange(mu, r1, r2, di, split = 0) {
  const h = hohmann(mu, r1, r2);
  if (!h.ok) return h;
  if (!(Number.isFinite(di) && abs(di) <= PI)) return refuse('input');
  if (!(split >= 0 && split <= 1)) return refuse('input');
  const [b1, b2] = h.burns;
  const d1 = split * di;
  const d2 = (1 - split) * di;
  const burns = [
    { ...b1, dv: combinedBurn(b1.from, b1.to, d1), di: d1 },
    { ...b2, dv: combinedBurn(b2.from, b2.to, d2), di: d2 },
  ];
  return {
    ...h,
    kind: 'hohmannPlaneChange',
    di,
    split,
    burns,
    total: burns[0].dv + burns[1].dv,
  };
}

/**
 * The split of the plane change that costs least, by golden-section search
 * on [0, 1]: the total is convex in the split (each burn's cost is), so the
 * search converges to its one minimum. Returns the transfer, and how it was
 * found.
 */
export function optimalSplit(mu, r1, r2, di) {
  const first = hohmannPlaneChange(mu, r1, r2, di, 0);
  if (!first.ok) return first;
  const cost = s => hohmannPlaneChange(mu, r1, r2, di, s).total;
  const g = (sqrt(5) - 1) / 2;
  let a = 0;
  let b = 1;
  let c = b - g * (b - a);
  let d = a + g * (b - a);
  let fc = cost(c);
  let fd = cost(d);
  let iterations = 0;
  while (b - a > 1e-10 && iterations < 100) {
    if (fc < fd) {
      b = d;
      d = c;
      fd = fc;
      c = b - g * (b - a);
      fc = cost(c);
    } else {
      a = c;
      c = d;
      fc = fd;
      d = a + g * (b - a);
      fd = cost(d);
    }
    iterations++;
  }
  const split = (a + b) / 2;
  return {
    ...hohmannPlaneChange(mu, r1, r2, di, split),
    search: { iterations, converged: b - a <= 1e-10 },
  };
}

/** An angle in (-pi, pi]. */
const wrap = x => {
  const y = x - TAU * Math.floor((x + PI) / TAU);
  return y === -PI ? PI : y;
};
/** An angle in [0, 2 pi). */
const wrap0 = x => ((x % TAU) + TAU) % TAU;

/**
 * A Hohmann transfer from a circle of radius r1 to a target on a coplanar
 * circle of radius r2, moving the same way. `phase` is how far the target is
 * ahead of the spacecraft now, in radians.
 *
 * The target must be `lead` ahead at the first burn, so that it arrives at
 * the far apse with the spacecraft. The relative angle changes at the
 * difference of the mean motions, so the wait is the time for it to come
 * round from `phase` to `lead`, and a missed window comes back every
 * synodic period.
 */
export function rendezvous(mu, r1, r2, phase = 0) {
  const h = hohmann(mu, r1, r2);
  if (!h.ok) return h;
  if (!Number.isFinite(phase)) return refuse('input');
  const n1 = sqrt(mu / (r1 * r1 * r1));
  const n2 = sqrt(mu / (r2 * r2 * r2));
  const lead = wrap(PI - n2 * h.tof);
  const rate = n2 - n1; // the rate at which the target's lead grows
  const synodic = TAU / abs(rate);
  // Time until phase + rate t = lead (mod 2 pi), the first t >= 0.
  const gap = rate > 0 ? wrap0(lead - phase) : wrap0(phase - lead);
  const wait = gap / abs(rate);
  return {
    ...h,
    kind: 'rendezvous',
    phase,
    lead,
    synodic,
    wait,
    burns: h.burns.map(b => ({ ...b, at: b.at + wait })),
    arrival: wait + h.tof,
  };
}

/**
 * Catching a target `ahead` radians further along the same circle of radius
 * r (negative: behind), in `laps` laps of a phasing orbit that leaves from
 * and returns to the burn point. Refused when the phasing orbit would pass
 * below `surface`, or cannot close (it would have to be unbound).
 */
export function phasing(mu, r, ahead, laps = 1, surface = 0) {
  if (!positive(mu, r) || !Number.isFinite(ahead) || !Number.isFinite(surface))
    return refuse('input');
  if (!(Number.isInteger(laps) && laps >= 1 && laps <= 20))
    return refuse('input');
  const T = period(mu, r);
  const d = wrap(ahead);
  // The spacecraft is back at the burn point after `laps` laps, when the
  // target has gone laps turns less the lead it had: T_ph = T (1 - d / (2 pi laps)).
  const Tph = T * (1 - d / (TAU * laps));
  if (!(Tph > 0)) return refuse('input');
  const a = cbrt(mu * (Tph / TAU) * (Tph / TAU));
  const other = 2 * a - r;
  if (other <= 0 || Math.min(other, r) < surface) return refuse('belowSurface');
  if (!Number.isFinite(other)) return refuse('input');
  const vc = circularSpeed(mu, r);
  const v = visViva(mu, r, a);
  const dv = abs(v - vc);
  return {
    ok: true,
    status: 'ok',
    kind: 'phasing',
    a,
    otherApse: other,
    laps,
    tof: laps * Tph,
    burns: [
      { at: 0, r, from: vc, to: v, dv, di: 0 },
      { at: laps * Tph, r, from: v, to: vc, dv, di: 0 },
    ],
    total: 2 * dv,
  };
}
