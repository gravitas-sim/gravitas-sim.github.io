// =============================================================================
// Delta-v budgets, event timelines and the plan file
// -----------------------------------------------------------------------------
// What a solver's answer becomes on the page and in a file: every burn, with
// its time and size, summed into a budget; every event in time order; and
// gravitas.mission-plan/1, a file that keeps three things apart:
//
//   inputs          what the reader chose: the exact numbers the model was
//                   given, with their units
//   model           the constants the model took from ./bodies.js, and the
//                   approximations it makes, by id (APPROXIMATIONS)
//   derived         what was computed, with the solver's own report where
//                   there is one: its status, iterations and residuals
//
// The file has no clock in it, so the same plan makes the same bytes, and it
// says what it is not for: `notFor` is written into every file, because a
// number from an educational model looks exactly like one from a navigation
// team's.
// =============================================================================

import { BODIES } from './bodies.js';

export const PLAN_FORMAT = 'gravitas.mission-plan';
export const PLAN_VERSION = 1;
export const NOT_FOR = 'operational mission design or navigation';

/** The approximations a result can rest on, by id; MISSION.md explains each. */
export const APPROXIMATIONS = Object.freeze([
  'impulsive',
  'pointMass',
  'twoBody',
  'circularOrbits',
  'coplanarPlanets',
  'patchedConic',
  'zeroRevolution',
  'planarFlyby',
  'ephemerisPack',
  'namedPullers',
]);

/** Which approximations each kind of result rests on. */
export const RESTS_ON = Object.freeze({
  hohmann: ['impulsive', 'pointMass', 'twoBody', 'circularOrbits'],
  biElliptic: ['impulsive', 'pointMass', 'twoBody', 'circularOrbits'],
  planeChange: ['impulsive', 'pointMass', 'twoBody', 'circularOrbits'],
  rendezvous: ['impulsive', 'pointMass', 'twoBody', 'circularOrbits'],
  phasing: ['impulsive', 'pointMass', 'twoBody', 'circularOrbits'],
  lambert: ['impulsive', 'pointMass', 'twoBody', 'zeroRevolution'],
  interplanetary: [
    'impulsive',
    'pointMass',
    'circularOrbits',
    'coplanarPlanets',
    'patchedConic',
  ],
  window: [
    'impulsive',
    'pointMass',
    'circularOrbits',
    'coplanarPlanets',
    'patchedConic',
    'zeroRevolution',
  ],
  flyby: ['pointMass', 'patchedConic', 'planarFlyby'],
  missionLab: ['impulsive', 'pointMass', 'patchedConic', 'zeroRevolution', 'ephemerisPack', 'namedPullers'],
});

/**
 * The budget of a result with burns: one row per burn, in time order, and
 * the total. Times in s, sizes in km/s.
 */
export function budgetOf(result) {
  const rows = (result?.burns || [])
    .map((b, i) => ({ burn: i + 1, at: b.at, dv: b.dv, di: b.di || 0 }))
    .sort((a, b) => a.at - b.at);
  return { rows, total: rows.reduce((s, r) => s + r.dv, 0) };
}

/**
 * The events of a result in time order: {t (s), event, value?}. Event ids
 * are message ids' last parts (mission.event.*), so the page can name them.
 */
export function timelineOf(kind, result) {
  const out = [];
  if (kind === 'rendezvous' && result.wait > 0)
    out.push({ t: 0, event: 'wait' });
  (result.burns || []).forEach((b, i) =>
    out.push({ t: b.at, event: 'burn', value: b.dv, index: i + 1 })
  );
  if (kind === 'rendezvous') out.push({ t: result.arrival, event: 'meet' });
  if (kind === 'phasing') out.push({ t: result.tof, event: 'meet' });
  if (kind === 'hohmann' || kind === 'biElliptic' || kind === 'planeChange')
    out.push({ t: result.tof, event: 'arrive' });
  if (kind === 'interplanetary') {
    out.push({ t: 0, event: 'depart', value: result.departure.dv });
    out.push({ t: result.tof, event: 'capture', value: result.arrival.dv });
  }
  if (kind === 'lambert') {
    out.push({ t: 0, event: 'depart' });
    out.push({ t: result.tof, event: 'arrive' });
  }
  return out.sort((a, b) => a.t - b.t);
}

/** The bodies' constants a plan used, by id. */
const modelOf = ids =>
  Object.fromEntries(
    ids
      .filter(id => BODIES[id])
      .map(id => [
        id,
        {
          GM: BODIES[id].GM,
          radius: BODIES[id].radius,
          ...(BODIES[id].a ? { a: BODIES[id].a, L0: BODIES[id].L0 } : {}),
        },
      ])
  );

/** Numbers as the file keeps them: finite ones, and arrays of them. */
const clean = v =>
  typeof v === 'number'
    ? Number.isFinite(v)
      ? v
      : null
    : Array.isArray(v)
      ? v.map(clean)
      : v && typeof v === 'object' && !ArrayBuffer.isView(v)
        ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, clean(x)]))
        : v;

/**
 * The plan file for one result.
 * @param {string} kind - A key of RESTS_ON
 * @param {object} inputs - What was asked, with a `units` note
 * @param {object} result - The solver's answer
 * @param {{bodies?: string[], version?: string}} [o]
 */
export function planFile(
  kind,
  inputs,
  result,
  { bodies = [], version = '' } = {}
) {
  if (!RESTS_ON[kind]) throw new Error(`planFile: ${kind}`);
  const derived = { ...result };
  delete derived.ok;
  const plan = {
    format: PLAN_FORMAT,
    formatVersion: PLAN_VERSION,
    generator: `Gravitas mission core${version ? ` ${version}` : ''}`,
    notFor: NOT_FOR,
    kind,
    units: {
      length: 'km',
      time: 's',
      speed: 'km/s',
      angle: 'rad',
      date: 'days from J2000.0 (TT)',
    },
    inputs: clean(inputs),
    model: { bodies: modelOf(bodies), approximations: [...RESTS_ON[kind]] },
    derived: clean(derived),
  };
  if (result?.burns) plan.budget = clean(budgetOf(result));
  plan.timeline = clean(timelineOf(kind, result));
  return plan;
}

/** The file's bytes: stable key order is the object's own, two-space JSON. */
export const planBytes = plan => `${JSON.stringify(plan, null, 2)}\n`;
