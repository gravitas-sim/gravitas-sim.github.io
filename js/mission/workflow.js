// =============================================================================
// The window-and-budget workflow (Prompt 272, MISSION_LAB_II.md)
// -----------------------------------------------------------------------------
// One mission, planned end to end: the porkchop grid of departure dates by
// times of flight (js/mission/window.js, the Lambert solver with its refusals
// kept) and the delta-v budget of the date chosen, as a ledger:
//
//   launch       to the parking orbit (the launcher's, not the spacecraft's)
//   departure    the burn from the parking orbit onto the transfer
//   corrections  a stated allowance, never computed
//   arrival      the burn into the capture orbit
//   capture      the burn at its periapsis that makes the orbit circular
//
// and the propellant the spacecraft's burns need, by the rocket equation, from
// the dry mass it ends with. It is a patched conic on the ephemeris it is
// given: it says so in the record, and it is not for operational mission design
// or navigation. Nothing here reads a page, a clock or a random number.
//
// A refusal is a record with `ok: false`, a `status` and `problems` as
// {path, code}, and no number.
// =============================================================================

import { BODIES, DAY } from './bodies.js';
import { hyperbolicBurn } from './patched.js';
import { captureBurn, propellant, G0 } from './solar.js';
import { CELL_STATUS, axisAt, windowCell } from './window.js';

/** The records' kind: not a stored format (no schema, nothing saves it), so no `gravitas.` id. */
export const WORKFLOW_KIND = 'missionWorkflow';
export const WORKFLOW_VERSION = 1;
export const NOT_FOR = 'operational mission design or navigation';
/** The ledger's rows, in flight order. */
export const LEDGER_ROWS = Object.freeze([
  'launch',
  'departure',
  'corrections',
  'arrival',
  'capture',
]);

const { sqrt } = Math;
const finite = x => typeof x === 'number' && Number.isFinite(x);
const positive = x => finite(x) && x > 0;
const atLeast0 = x => finite(x) && x >= 0;

/** What each row assumes, in words for a record (not a student-facing string). */
const ASSUMES = Object.freeze({
  launch:
    'the circular speed of the parking orbit plus the stated losses; gravity, drag and steering losses are not modelled',
  departure:
    'an impulsive burn at the periapsis of a circular parking orbit onto the hyperbola with the transfer departure excess speed',
  corrections:
    'a stated allowance for trajectory corrections, an input and never a result',
  arrival:
    'an impulsive burn at the periapsis of the arrival hyperbola into the capture orbit',
  capture:
    'an impulsive burn at the capture orbit periapsis that circularises it; zero when the capture orbit is already circular',
});

/** Why a ledger cannot be made, as {path, code}; empty if it can. */
export function ledgerProblems(i) {
  const out = [];
  if (!i || typeof i !== 'object') return [{ path: '', code: 'input' }];
  for (const k of ['from', 'to'])
    if (!BODIES[i[k]]?.a) out.push({ path: k, code: 'planet' });
  if (!out.length && i.from === i.to)
    out.push({ path: 'to', code: 'samePlanet' });
  for (const k of ['vinfDeparture', 'vinfArrival'])
    if (i[k] !== undefined && !atLeast0(i[k]))
      out.push({ path: k, code: 'value' });
  for (const k of ['parkingAltitudeKm', 'launchLossesKmS', 'correctionsKmS'])
    if (!atLeast0(i[k])) out.push({ path: k, code: 'value' });
  for (const k of ['dryKg', 'ispS'])
    if (!positive(i[k])) out.push({ path: k, code: 'value' });
  const c = i.captureOrbit;
  if (
    !c ||
    !atLeast0(c.periapsisAltitudeKm) ||
    !(finite(c.apoapsisRadiusKm) && c.apoapsisRadiusKm > 0)
  )
    out.push({ path: 'captureOrbit', code: 'value' });
  else if (!out.length) {
    const rp = BODIES[i.to].radius + c.periapsisAltitudeKm;
    if (c.apoapsisRadiusKm < rp)
      out.push({ path: 'captureOrbit.apoapsisRadiusKm', code: 'apoapsis' });
  }
  return out;
}

/**
 * The budget of one transfer. `input`: from, to (planets of ./bodies.js),
 * vinfDeparture and vinfArrival (km/s), parkingAltitudeKm, captureOrbit
 * {periapsisAltitudeKm, apoapsisRadiusKm}, launchLossesKmS, correctionsKmS,
 * dryKg (the mass after the last burn) and ispS (one for every burn).
 */
export function budgetLedger(input) {
  const problems = ledgerProblems(input);
  if (!finite(input?.vinfDeparture) || !finite(input?.vinfArrival))
    if (!problems.some(p => p.path.startsWith('vinf')))
      problems.push({ path: 'vinfDeparture', code: 'value' });
  if (problems.length) return { ok: false, status: 'refused', problems };
  const P = BODIES[input.from];
  const Q = BODIES[input.to];
  const rParking = P.radius + input.parkingAltitudeKm;
  const rp = Q.radius + input.captureOrbit.periapsisAltitudeKm;
  const dep = hyperbolicBurn(P.GM, rParking, input.vinfDeparture);
  const arr = captureBurn(
    Q.GM,
    rp,
    input.captureOrbit.apoapsisRadiusKm,
    input.vinfArrival
  );
  if (!dep.ok || !arr.ok) return { ok: false, status: 'refused', problems: [] };
  const dv = {
    launch: sqrt(P.GM / rParking) + input.launchLossesKmS,
    departure: dep.dv,
    corrections: input.correctionsKmS,
    arrival: arr.dv,
    capture: arr.vOrbit - sqrt(Q.GM / rp),
  };
  const spacecraft = LEDGER_ROWS.filter(id => id !== 'launch').map(id => ({
    id,
    dv: dv[id],
  }));
  const fuel = propellant(spacecraft, input.dryKg, input.ispS);
  const byId = Object.fromEntries(fuel.rows.map(r => [r.id, r]));
  const rows = LEDGER_ROWS.map(id => ({
    id,
    dvKmS: dv[id],
    unit: 'km/s',
    carriedBy: id === 'launch' ? 'launcher' : 'spacecraft',
    assumes: ASSUMES[id],
    ...(byId[id]
      ? {
          massBeforeKg: byId[id].massBefore,
          massAfterKg: byId[id].massAfter,
          propellantKg: byId[id].propellant,
        }
      : {}),
  }));
  return {
    ok: true,
    status: 'ok',
    kind: `${WORKFLOW_KIND}Ledger`,
    version: WORKFLOW_VERSION,
    notFor: NOT_FOR,
    rows,
    totalKmS: LEDGER_ROWS.reduce((s, id) => s + dv[id], 0),
    spacecraftKmS: spacecraft.reduce((s, r) => s + r.dv, 0),
    startKg: fuel.startKg,
    dryKg: input.dryKg,
    propellantKg: fuel.propellantKg,
    exhaustKmS: (input.ispS * G0) / 1000,
    inputs: { ...input, captureOrbit: { ...input.captureOrbit } },
  };
}

/**
 * One mission end to end: the transfer for a chosen departure day and time of
 * flight (the cell the porkchop shows), and its ledger. `states(id, days)` is
 * the ephemeris (days from J2000.0); `span` {startDay, stopDay}, when given,
 * is the ephemeris' range, and an arrival outside it is refused, never
 * extrapolated.
 */
export function missionWorkflow({ states, span, departDay, tofDays, ...rest }) {
  const o = {
    from: rest.from,
    to: rest.to,
    fromAltitude: rest.parkingAltitudeKm,
    toAltitude: rest.captureOrbit?.periapsisAltitudeKm,
    direction: rest.direction,
  };
  const problems = ledgerProblems({
    ...rest,
    vinfDeparture: 0,
    vinfArrival: 0,
  });
  if (!finite(departDay)) problems.push({ path: 'departDay', code: 'value' });
  if (!positive(tofDays)) problems.push({ path: 'tofDays', code: 'value' });
  if (typeof states !== 'function')
    problems.push({ path: 'states', code: 'input' });
  if (
    !problems.length &&
    span &&
    !(departDay >= span.startDay && departDay + tofDays <= span.stopDay)
  )
    problems.push({ path: 'departDay', code: 'outOfRange' });
  if (problems.length) return { ok: false, status: 'refused', problems };
  const cell = windowCell(
    { ...o, direction: o.direction || 'prograde' },
    departDay,
    tofDays,
    states
  );
  if (cell.status !== 'ok')
    return { ok: false, status: cell.status, problems: [] };
  const ledger = budgetLedger({
    ...rest,
    vinfDeparture: Math.sqrt(cell.c3),
    vinfArrival: cell.vinf,
  });
  if (!ledger.ok) return ledger;
  return {
    ok: true,
    status: 'ok',
    kind: WORKFLOW_KIND,
    version: WORKFLOW_VERSION,
    notFor: NOT_FOR,
    transfer: {
      departDay,
      tofDays,
      tofSeconds: tofDays * DAY,
      c3: cell.c3,
      vinfDepartureKmS: Math.sqrt(cell.c3),
      vinfArrivalKmS: cell.vinf,
      v1: cell.v1,
      v2: cell.v2,
      r1: cell.r1,
      r2: cell.r2,
      transferAngle: cell.transferAngle,
      residualKm: cell.residual,
      missKm: cell.miss,
    },
    ledger,
  };
}

/** The cheapest cell of a computed window and whether it is inside it. */
export function windowMinimum(w) {
  if (!w?.best) return null;
  const nt = w.options.tofSteps;
  const row = Math.floor(w.best.index / nt);
  const col = w.best.index % nt;
  return {
    row,
    col,
    departDay: w.best.depart,
    tofDays: w.best.tof,
    totalKmS: w.best.total,
    interior:
      row > 0 && row < w.options.departSteps - 1 && col > 0 && col < nt - 1,
  };
}

/**
 * One departure row of a window into `out` ({c3, vinf, total, status} typed
 * arrays), the cell for column j at (row - base) * tofSteps + j, so a window can
 * be filled whole (base 0) or in row ranges whose results are joined, each a
 * job that needs nothing from another (the Worker pool's contract). The same
 * cells as createWindow's loop in ./window.js: that file is installed for every
 * reader and has no room for the shared helper, so the loop is repeated here
 * and a test holds the two to identical bytes (D-R10-272-04).
 * @returns {{iterations: number, max: number}}
 */
export function fillRow(o, row, states, out, base = 0) {
  const nt = o.tofSteps;
  const t = axisAt(o.departStart, o.departSpan, o.departSteps, row);
  let iterations = 0;
  let max = 0;
  for (let j = 0; j < nt; j++) {
    const tof = axisAt(o.tofMin, o.tofMax - o.tofMin, nt, j);
    const cell = windowCell(o, t, tof, states);
    const k = (row - base) * nt + j;
    out.c3[k] = cell.c3;
    out.vinf[k] = cell.vinf;
    out.total[k] = cell.total;
    out.status[k] = CELL_STATUS.indexOf(cell.status);
    iterations += cell.iterations;
    max = Math.max(max, cell.iterations);
  }
  return { iterations, max };
}
