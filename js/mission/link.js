// =============================================================================
// A mission plan in a link
// -----------------------------------------------------------------------------
// Roadmap II Prompt 106 (EMBEDDING.md, "The mission figure"). The mission lab
// can be opened on a plan a link carries, in its fragment: `#plan1.` and the
// plan as base64url JSON. The figure builder writes one for an embedded
// figure, and the lab reads one when it opens. Nothing here solves a plan: it
// checks the shape of what a link or a saved file holds and keeps only the
// fields the lab's plan has, so a link cannot carry anything else into the
// page. Whether a plan is a mission at all (a date the pack holds, a transfer
// the Lambert solver can find) is the Worker's to say, and the page shows its
// refusal in words as it does for a plan typed in.
//
// Pure: no DOM, no storage. Small on purpose: the figure builder and the
// lab's lazy address module both import it.
// =============================================================================

import { PULLER_IDS } from './lab/defaults.js';

/** The fragment's marker, and the longest fragment read. */
export const PLAN_LINK = 'plan1';
export const MAX_LINK = 2000;

const finite = v => typeof v === 'number' && Number.isFinite(v);
const obj = v => v !== null && typeof v === 'object' && !Array.isArray(v);

/**
 * A plan as the lab holds it, from something a link or a file carried.
 * @param {*} v
 * @returns {object|null} A new plan with only the lab's fields, or null when
 *   a field is missing or of the wrong kind
 */
export function readPlan(v) {
  if (!obj(v)) return null;
  const { parking, depot, depart, arrive, correct, vehicle, direct } = v;
  if (
    !obj(parking) ||
    !obj(depot) ||
    !obj(depart) ||
    !obj(arrive) ||
    !obj(vehicle) ||
    !obj(direct)
  )
    return null;
  if (
    ![
      parking.altitude,
      depot.altitude,
      depot.phaseDeg,
      depart.tofDays,
      arrive.periapsisAltitude,
      arrive.apoapsisAltitude,
      vehicle.dryKg,
      vehicle.ispS,
    ].every(finite)
  )
    return null;
  if (
    typeof depart.date !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(depart.date)
  )
    return null;
  if (correct !== null && correct !== undefined)
    if (!obj(correct) || !finite(correct.day)) return null;
  if (
    !Array.isArray(direct.bodies) ||
    !direct.bodies.every(b => PULLER_IDS.includes(b)) ||
    !['periapsis', 'center'].includes(direct.start)
  )
    return null;
  return {
    parking: { altitude: parking.altitude },
    depot: { altitude: depot.altitude, phaseDeg: depot.phaseDeg },
    depart: { date: depart.date, tofDays: depart.tofDays },
    arrive: {
      periapsisAltitude: arrive.periapsisAltitude,
      apoapsisAltitude: arrive.apoapsisAltitude,
    },
    correct: correct ? { day: correct.day } : null,
    vehicle: { dryKg: vehicle.dryKg, ispS: vehicle.ispS },
    direct: {
      bodies: PULLER_IDS.filter(b => direct.bodies.includes(b)),
      start: direct.start,
    },
  };
}

const b64url = text =>
  btoa(text).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64url = s =>
  atob(
    s.replace(/-/g, '+').replace(/_/g, '/') +
      '='.repeat((4 - (s.length % 4)) % 4)
  );

/**
 * The fragment (without its '#') that opens the lab on a plan.
 * @param {object} plan - Anything readPlan accepts
 * @returns {string|null} null when it is not a plan, or too long to be a link
 */
export function planFragment(plan) {
  const p = readPlan(plan);
  if (!p) return null;
  const text = `${PLAN_LINK}.${b64url(JSON.stringify(p))}`;
  return text.length <= MAX_LINK ? text : null;
}

/**
 * The plan a fragment carries.
 * @param {string} fragment - With or without a leading '#'
 * @returns {{ok: true, plan: object}|{ok: false, code: string}} code is
 *   notLink, tooLong, unreadable or notPlan
 */
export function readPlanFragment(fragment) {
  const f = String(fragment ?? '').replace(/^#/, '');
  if (!f.startsWith(`${PLAN_LINK}.`)) return { ok: false, code: 'notLink' };
  if (f.length > MAX_LINK) return { ok: false, code: 'tooLong' };
  let parsed;
  try {
    parsed = JSON.parse(unb64url(f.slice(PLAN_LINK.length + 1)));
  } catch {
    return { ok: false, code: 'unreadable' };
  }
  const plan = readPlan(parsed);
  return plan ? { ok: true, plan } : { ok: false, code: 'notPlan' };
}
