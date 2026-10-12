// =============================================================================
// The mission lab's results, as evidence envelopes
// -----------------------------------------------------------------------------
// Roadmap II Prompt 106 (MISSION_LAB.md, "On the platform"). What the lab
// computes for a plan (the timeline of events, the maneuvers, the delta-v
// budget, and the patched-conic design held against the spacecraft flown
// directly) can be kept as a gravitas.artifact/1 (js/platform/artifact.js), so
// a report cites it as it cites a fit: what made it, from what, with which
// numbers, and nothing rendered for one reader in one language. This module
// makes the envelopes and nothing else. It never solves anything: it reads the
// result the lab's Worker returned (./solar.js computeMission) and the plan
// that was asked.
//
// What kind of number each is. Everything the plan chose (the departure date,
// the orbits, the vehicle) is `assumed`: the reader's. Everything computed
// from it by the model (an event's date, a burn's size, a propellant mass, a
// miss distance) is `derived`, by the model's stated relations. No number
// carries an uncertainty: the model has no navigation, so there is nothing to
// state. The envelope's warnings are two codes, `missionModel` (impulsive
// burns, patched conics, point masses) and `notOperational` (the sentence every
// plan file carries), and `made.mission.restsOn` lists the approximations by
// id (./plan.js RESTS_ON.missionLab). The planets' places are
// the ephemeris pack's, a few km (MISSION_LAB.md), and the envelope names the
// pack and its version.
//
// The source is the plan: `source.digest` is the digest of the plan and the
// pack, so every result of one plan shares it and a changed plan does not.
// Pure: no DOM, no storage.
// =============================================================================

import { artifact } from '../platform/artifact.js';
import { canonicalJsonExact, fnvHex8 } from '../hash.js';
import { MISSION_API } from './api.js';
import { jdOfDate } from './ephemeris.js';
import { NOT_FOR, RESTS_ON } from './plan.js';

/** The results an envelope can hold, in the order the panel lists them. */
export const KINDS = Object.freeze([
  'timeline',
  'maneuvers',
  'budget',
  'comparison',
]);

const NONE = { kind: 'none' };
const quantity = (id, value, unit, origin = 'derived') => ({
  id,
  value,
  unit,
  uncertainty: NONE,
  origin,
});
const assumed = (id, value, unit) => quantity(id, value, unit, 'assumed');
const KMS_TO_MS = 1000;

/** The pack's id and version the Worker named, or null when it did not. */
const packOf = result =>
  result?.pack?.id ? `${result.pack.id}@${result.pack.version}` : null;

/** The digest of a plan and the pack its planets came from: what every result of it cites. */
export function planDigest(plan, result) {
  return fnvHex8(canonicalJsonExact({ plan, pack: packOf(result) }));
}

/** What the plan chose that a kind of result depends on, as `assumed` numbers. */
function inputs(plan, kind) {
  const q = [assumed('depart.jd', jdOfDate(plan.depart.date), 'd')];
  q.push(assumed('depart.tof', plan.depart.tofDays, 'd'));
  if (plan.correct) q.push(assumed('correct.day', plan.correct.day, 'd'));
  if (kind === 'maneuvers' || kind === 'budget') {
    q.push(
      assumed('parking.altitude', plan.parking.altitude, 'km'),
      assumed('depot.altitude', plan.depot.altitude, 'km'),
      assumed('depot.phase', plan.depot.phaseDeg, 'deg'),
      assumed('arrive.periapsis', plan.arrive.periapsisAltitude, 'km'),
      assumed('arrive.apoapsis', plan.arrive.apoapsisAltitude, 'km')
    );
  }
  if (kind === 'budget') {
    q.push(
      assumed('vehicle.dry', plan.vehicle.dryKg, 'kg'),
      assumed('vehicle.isp', plan.vehicle.ispS, 's')
    );
  }
  if (kind === 'comparison') {
    q.push(
      assumed('direct.bodies', plan.direct.bodies.length, ''),
      assumed('direct.fromCenter', plan.direct.start === 'center' ? 1 : 0, '')
    );
  }
  return q;
}

/**
 * The patched design's heliocentric arc against the spacecraft flown directly,
 * at the days both were sampled: the arc has 61 points and the direct flight
 * 121, so the arc's k-th is the flight's 2k-th, on the same day.
 *
 * The patched arc ends at Mars's center, so its last residual is the direct
 * flight's miss (to the Lambert solver's own miss, under a kilometer). The
 * first is the offset of the parking orbit's periapsis from the Earth's
 * center, which the patched design takes as zero.
 *
 * @param {{views: {arc: {day: number, r: ?number[]}[],
 *   direct: {day: number, r: number[]}[]}}} result
 * @returns {{day: number, km: number}[]} Residuals in time order
 */
export function residualSeries(result) {
  const { arc, direct } = result.views;
  const out = [];
  arc.forEach((a, k) => {
    const d = direct[2 * k];
    if (!a.r || !d?.r) return;
    out.push({
      day: a.day,
      km: Math.hypot(d.r[0] - a.r[0], d.r[1] - a.r[1], d.r[2] - a.r[2]),
    });
  });
  return out;
}

/**
 * The patched design and the flown spacecraft against Mars, day by day: the
 * overlay the comparison draws, with the residual under it. At each of the
 * arc's 61 days: each spacecraft's distance from Mars (Mars's own samples are
 * 91 over the same days, read between by a straight line, as the lab's slider
 * reads them) and the residual, the distance between the two spacecraft.
 * @returns {{day: number, patched: number, direct: number, residual: number}[]}
 */
export function overlaySeries(result) {
  const { arc, direct, mars } = result.views;
  const res = residualSeries(result);
  const byDay = new Map(res.map(r => [r.day, r.km]));
  const out = [];
  arc.forEach((a, k) => {
    const d = direct[2 * k];
    if (!a.r || !d?.r || !byDay.has(a.day)) return;
    const x = (k / (arc.length - 1)) * (mars.length - 1);
    const i = Math.min(mars.length - 2, Math.floor(x));
    const m = mars[i].map((c, j) => c + (mars[i + 1][j] - c) * (x - i));
    const dist = r => Math.hypot(r[0] - m[0], r[1] - m[1], r[2] - m[2]);
    out.push({
      day: a.day,
      patched: dist(a.r),
      direct: dist(d.r),
      residual: byDay.get(a.day),
    });
  });
  return out;
}

/** The residuals' summary: first, last, and the largest with its day. */
export function residualSummary(series) {
  if (!series.length) return null;
  const peak = series.reduce((a, b) => (b.km > a.km ? b : a));
  return {
    first: series[0].km,
    last: series[series.length - 1].km,
    max: peak.km,
    maxDay: peak.day,
  };
}

/**
 * The quantities of one kind of result.
 * @param {string} kind - One of KINDS
 * @param {object} result - computeMission's answer (ok: true)
 * @returns {{quantities: object[], warnings: string[]}|null} null for an
 *   unknown kind, or a comparison with no samples
 */
export function missionQuantities(kind, result) {
  const plan = result.plan;
  const q = [...inputs(plan, kind)];
  switch (kind) {
    case 'timeline':
      for (const e of result.events)
        q.push(quantity(`event.${e.id}.jd`, e.jd, 'd'));
      break;
    case 'maneuvers':
      for (const b of result.burns)
        q.push(
          quantity(`burn.${b.id}.jd`, b.jd, 'd'),
          quantity(`burn.${b.id}.dv`, b.dv * KMS_TO_MS, 'm/s')
        );
      q.push(
        quantity('vinf.departure', result.patched.vinfDep, 'km/s'),
        quantity('vinf.arrival', result.patched.vinfArr, 'km/s'),
        quantity(
          'capture.period',
          result.patched.captureOrbitPeriod / 3600,
          'h'
        )
      );
      break;
    case 'budget': {
      const b = result.budget;
      q.push(quantity('dv.total', b.total * KMS_TO_MS, 'm/s'));
      for (const [id, part] of [
        ['earthOrbit', b.earthOrbit],
        ['interplanetary', b.interplanetary],
      ]) {
        q.push(
          quantity(`propellant.${id}`, part.propellantKg, 'kg'),
          quantity(`exhaust.${id}`, part.exhaustKmS, 'km/s')
        );
        for (const r of part.rows)
          q.push(
            quantity(`burn.${r.id}.dv`, r.dv * KMS_TO_MS, 'm/s'),
            quantity(`burn.${r.id}.propellant`, r.propellant, 'kg'),
            quantity(`burn.${r.id}.massBefore`, r.massBefore, 'kg')
          );
      }
      break;
    }
    case 'comparison': {
      const s = residualSummary(residualSeries(result));
      if (!s) return null;
      const d = result.direct;
      q.push(
        quantity('miss.arrival', d.missKm, 'km'),
        quantity('residual.first', s.first, 'km'),
        quantity('residual.max', s.max, 'km'),
        quantity('residual.max.day', s.maxDay, 'd'),
        quantity('residual.last', s.last, 'km')
      );
      if (d.closestKm !== null)
        q.push(
          quantity('closest.distance', d.closestKm, 'km'),
          quantity('closest.day', d.closestDay, 'd')
        );
      if (d.marsDriftKm !== null)
        q.push(quantity('mars.drift', d.marsDriftKm, 'km'));
      if (result.correction)
        q.push(
          quantity('correction.dv', result.correction.dv * KMS_TO_MS, 'm/s'),
          quantity('correction.miss', result.correction.missKm, 'km')
        );
      break;
    }
    default:
      return null;
  }
  return {
    quantities: q.filter(x => Number.isFinite(x.value)),
    warnings: ['missionModel', 'notOperational'],
  };
}

/**
 * One result of a mission as an envelope.
 * @param {string} kind - One of KINDS
 * @param {object} result - computeMission's answer, with the Worker's `pack`
 * @returns {object|null} The envelope, or null when it is not one (a result
 *   that is not ok, an unknown kind)
 */
export function missionEnvelope(kind, result) {
  if (!result?.ok || !KINDS.includes(kind)) return null;
  const got = missionQuantities(kind, result);
  if (!got) return null;
  const digest = planDigest(result.plan, result);
  const values = canonicalJsonExact(got.quantities.map(x => [x.id, x.value]));
  const pack = packOf(result);
  return artifact({
    id: `mission:${kind}:${digest}:${fnvHex8(values)}`,
    made: {
      mission: {
        api: MISSION_API,
        lab: 'mission-lab',
        kind,
        plan: result.plan,
        ...(pack ? { pack } : {}),
        restsOn: [...RESTS_ON.missionLab],
        notFor: NOT_FOR,
      },
    },
    source: {
      kind: 'simulation',
      id: 'mission-lab',
      version: MISSION_API,
      digest,
    },
    quantities: got.quantities,
    warnings: got.warnings,
  });
}
