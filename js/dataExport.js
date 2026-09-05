// =============================================================================
// Data export: the recorded simulation as CSV
// -----------------------------------------------------------------------------
// The point of this file is homework. A student who can only look at the
// simulation has watched a demonstration; a student who can export what it
// recorded and fit a period to it in Python has done astronomy. Everything
// here is a serializer over state that already exists: the timeline's ring
// buffer and the light curve's sample arrays.
//
// Two decisions worth stating, because they are what make the files usable
// rather than merely correct:
//
//   Physical units, always. The simulation runs in its own units and the app
//   can display either, but a file written for analysis has one job, and a
//   column called `x_au` needs no explanation in a lab handout. The unit is in
//   every column name; nothing is left to a legend.
//
//   Long format, one row per body per frame, with a `name` column. That is
//   what pandas groupby and every plotting library expect, and it means one
//   file answers "plot this orbit" and "fit the period of all of them".
// =============================================================================

import { forEachRecordedFrame, recordedExtent } from './timeline.js';
import { lightCurveSeries, transitAnalysis } from './lightCurve.js';
import { radialVelocitySurvey } from './radialVelocity.js';
import { timeUnitSeconds } from './units.js';
import { SOLAR_MASS_UNIT } from './physics.js';
import { G_SI, SOLAR_MASS_KG, AU_M } from './blackHolePhysics.js';
import { csvField, num, toCsv } from './csv.js';

/** Seconds in a Julian day. */
const SECONDS_PER_DAY = 86400;
/** One simulation length unit, in meters. 1 unit = 0.01 AU. */
const UNIT_M = AU_M / 100;
/** One simulation mass unit, in kilograms. */
const UNIT_KG = SOLAR_MASS_KG / SOLAR_MASS_UNIT;

/**
 * Bodies heavy enough to be called the thing something orbits.
 *
 * The same set the guided lessons use when they answer "what is this going
 * round", so a CSV and a lesson never disagree about which object is the
 * primary.
 */
const PRIMARY_KINDS = new Set([
  'BlackHole',
  'StarObject',
  'NeutronStar',
  'WhiteDwarf',
]);

/** Kind codes are internal; these are what a person calls them. */
const KIND_LABELS = {
  BlackHole: 'black hole',
  Planet: 'planet',
  StarObject: 'star',
  GasGiant: 'gas giant',
  Asteroid: 'asteroid',
  Comet: 'comet',
  NeutronStar: 'neutron star',
  WhiteDwarf: 'white dwarf',
};

// The CSV primitives live in js/csv.js, a leaf module with no imports, so the
// experiment bench can share them without pulling the timeline and the light
// curve in behind them. Re-exported here because this file has been their
// public home since before there was a second caller.
export { csvField, num, toCsv };

// --- Trajectories -------------------------------------------------------------

export const TRAJECTORY_COLUMNS = [
  't_days',
  'name',
  'type',
  'object_id',
  'mass_msun',
  'x_au',
  'y_au',
  'vx_kms',
  'vy_kms',
  'speed_kms',
  'primary',
  'r_au',
  'theta_deg',
  'E_kin_J',
  'E_pot_J',
  'E_tot_J',
];

/**
 * Decide, once, what each body is orbiting.
 *
 * Chosen from the most recent frame and then held fixed for the whole series.
 * Recomputing it per frame is more "correct" and much less useful: two planets
 * passing close would swap the primary for a few rows, and the r(t) a student
 * is about to fit a period to would jump. A column that changes meaning
 * halfway down is worse than one that is occasionally the wrong choice, and
 * the choice is named in the file either way.
 *
 * @param {Array} bodies - Decoded bodies from one frame
 * @returns {Map<number, Object>} Body id -> its primary
 */
export function choosePrimaries(bodies) {
  const candidates = bodies.filter(
    b => b.alive && b.mass > 0 && PRIMARY_KINDS.has(b.kind)
  );
  // Nothing massive on screen: fall back to everything, which is what makes a
  // moon-around-a-planet scenario export something useful rather than blanks.
  const pool = candidates.length ? candidates : bodies.filter(b => b.mass > 0);
  const out = new Map();
  for (const body of bodies) {
    let best = null;
    let bestPull = 0;
    for (const c of pool) {
      if (c.id === body.id || !c.alive || !(c.mass > 0)) continue;
      const d = Math.hypot(c.x - body.x, c.y - body.y);
      if (!(d > 0)) continue;
      const pull = c.mass / (d * d);
      if (pull > bestPull) {
        bestPull = pull;
        best = c;
      }
    }
    if (best) out.set(body.id, best);
  }
  return out;
}

/**
 * The recorded trajectories, as CSV.
 *
 * Energies are computed in SI from the converted positions and masses rather
 * than by scaling a simulation-unit energy, so the numbers in the file are
 * joules in the ordinary sense and can be checked against a textbook.
 *
 * @param {Object} [opts]
 * @param {Array<number>} [opts.ids] - Only these object ids; omit for all
 * @param {Map<number,string>} [opts.names] - Object id -> display name
 * @param {number} [opts.maxRows] - Stop after this many data rows
 * @returns {{csv:string, rows:number, truncated:boolean, objects:number}} The document and what went into it
 */
export function trajectoryCsv({
  ids = null,
  names = null,
  maxRows = 250000,
} = {}) {
  const wanted = ids ? new Set(ids.map(Number)) : null;
  const rows = [TRAJECTORY_COLUMNS.slice()];
  const secondsPerUnit = timeUnitSeconds();
  const msPerUnit = UNIT_M / secondsPerUnit;

  let primaries = null;
  let truncated = false;
  const seen = new Set();

  forEachRecordedFrame((tSim, bodies) => {
    // The newest frame arrives last, so the primary map is built from the
    // first frame seen and then reused: chronological order means that is the
    // oldest one. Either end is a fixed choice; the oldest is the one every
    // body in the file is guaranteed to exist in.
    if (!primaries) primaries = choosePrimaries(bodies);
    if (truncated) return;

    const byId = new Map(bodies.map(b => [b.id, b]));
    const tDays = (tSim * secondsPerUnit) / SECONDS_PER_DAY;

    for (const b of bodies) {
      if (!b.alive) continue;
      if (wanted && !wanted.has(b.id)) continue;
      if (rows.length > maxRows) {
        truncated = true;
        return;
      }
      seen.add(b.id);

      const massKg = b.mass * UNIT_KG;
      const vx = b.vx * msPerUnit;
      const vy = b.vy * msPerUnit;
      const speed = Math.hypot(vx, vy);

      // The primary is identified by id and then looked up in this frame, so a
      // primary that has moved, or died, is handled rather than assumed.
      const chosen = primaries.get(b.id);
      const primary = chosen ? byId.get(chosen.id) : null;
      let rAu = NaN;
      let theta = NaN;
      let ePot = NaN;
      let eKin = NaN;
      if (primary && primary.alive) {
        const dx = b.x - primary.x;
        const dy = b.y - primary.y;
        const rM = Math.hypot(dx, dy) * UNIT_M;
        rAu = rM / AU_M;
        // The angle round the primary. Without it, working out a period means
        // knowing to take atan2 of the position *relative to the primary*,
        // which means first joining the file to itself. It is one more column
        // here and one less thing to get wrong there.
        theta = (Math.atan2(dy, dx) * 180) / Math.PI;
        // Relative to the primary, which is the frame an orbit lives in.
        const rvx = (b.vx - primary.vx) * msPerUnit;
        const rvy = (b.vy - primary.vy) * msPerUnit;
        eKin = 0.5 * massKg * (rvx * rvx + rvy * rvy);
        ePot = rM > 0 ? (-G_SI * primary.mass * UNIT_KG * massKg) / rM : NaN;
      }

      rows.push([
        num(tDays),
        names?.get(b.id) ?? `${KIND_LABELS[b.kind] ?? b.kind} ${b.id}`,
        KIND_LABELS[b.kind] ?? b.kind,
        String(b.id),
        num(b.mass / SOLAR_MASS_UNIT),
        num((b.x * UNIT_M) / AU_M),
        num((b.y * UNIT_M) / AU_M),
        num(vx / 1000),
        num(vy / 1000),
        num(speed / 1000),
        primary
          ? (names?.get(primary.id) ??
            `${KIND_LABELS[primary.kind] ?? primary.kind} ${primary.id}`)
          : '',
        num(rAu),
        num(theta, 7),
        num(eKin, 6),
        num(ePot, 6),
        num(eKin + ePot, 6),
      ]);
    }
  });

  return {
    csv: toCsv(rows),
    rows: rows.length - 1,
    objects: seen.size,
    truncated,
  };
}

// --- Light curve --------------------------------------------------------------

export const LIGHT_CURVE_COLUMNS = [
  't_days',
  'flux_relative',
  'in_transit',
  'transit_number',
];

/**
 * The recorded light curve, as CSV.
 *
 * `in_transit` and `transit_number` come from the same detector the on-screen
 * readout uses, so a student who counts dips by eye and a student who filters
 * the column in pandas get the same answer.
 *
 * @returns {{csv:string, rows:number, transits:number}} The document and what went into it
 */
export function lightCurveCsv() {
  const { days, flux } = lightCurveSeries();
  const { log } = transitAnalysis();
  const rows = [LIGHT_CURVE_COLUMNS.slice()];

  // Sorted so the lookup below can stop early; the detector emits them in
  // order already, but nothing in the file format depends on trusting that.
  const transits = log
    .filter(t => Number.isFinite(t.mid) && Number.isFinite(t.duration))
    .sort((a, b) => a.mid - b.mid);

  for (let i = 0; i < days.length; i++) {
    const t = days[i];
    let inside = null;
    for (const tr of transits) {
      if (t < tr.mid - tr.duration / 2) break;
      if (t <= tr.mid + tr.duration / 2) {
        inside = tr;
        break;
      }
    }
    rows.push([
      num(t),
      num(flux[i]),
      inside ? '1' : '0',
      inside && Number.isFinite(inside.seq) ? String(inside.seq) : '',
    ]);
  }

  return { csv: toCsv(rows), rows: rows.length - 1, transits: transits.length };
}

export const TRANSIT_COLUMNS = [
  'transit_number',
  'mid_days',
  'depth_relative',
  'depth_percent',
  'duration_days',
  'bottom_flux',
];

/**
 * One row per measured transit: the table a student would otherwise build by
 * hand from the light curve, and the one that makes "fit a period" a two-line
 * exercise rather than a peak-finding project.
 * @returns {{csv:string, rows:number}} The document and its row count
 */
export function transitTableCsv() {
  const { log } = transitAnalysis();
  const rows = [TRANSIT_COLUMNS.slice()];
  for (const t of log) {
    rows.push([
      Number.isFinite(t.seq) ? String(t.seq) : '',
      num(t.mid),
      num(t.depth),
      num(t.depth * 100, 4),
      num(t.duration),
      num(t.bottom),
    ]);
  }
  return { csv: toCsv(rows), rows: rows.length - 1 };
}

// --- Radial velocity ----------------------------------------------------------

export const RADIAL_VELOCITY_COLUMNS = [
  't_days',
  'rv_ms',
  'rv_err_ms',
  'target',
  'target_id',
  'inclination_deg',
  'cadence_days',
  'baseline_days',
  'sigma_ms',
  'noise_seed',
];

/**
 * A synthetic observing run, as CSV.
 *
 * One row per measurement and nothing between them, which is the property that
 * makes the file worth exporting: a student who plots it in Python sees the
 * same gaps the panel showed, and a student who fits it has to decide what to
 * do about them.
 *
 * The observing configuration is repeated on every row rather than written into
 * a header. A comment header is the tidier document and the worse data file -
 * `pandas.read_csv` needs an argument to skip it, and half a class will not
 * pass that argument - whereas a constant column is understood by everything
 * and disappears into a `groupby` when it is not wanted. The cost is a few
 * hundred duplicated bytes across a dozen rows.
 *
 * The uncertainty travels beside the value it belongs to for the same reason:
 * an exported velocity with the error bar left behind in a note is a number
 * that will be plotted without one.
 *
 * @returns {{csv: string, rows: number, target: ?string}} The document and what went into it
 */
export function radialVelocityCsv() {
  const run = radialVelocitySurvey();
  const rows = [RADIAL_VELOCITY_COLUMNS.slice()];
  const cfg = run.config;
  const name = run.target?.name || '';
  const id = run.target?.id;

  for (const m of run.measurements) {
    rows.push([
      num(m.day),
      num(m.rv),
      num(m.sigma),
      csvField(name),
      id === undefined || id === null ? '' : String(id),
      num(run.inclinationDeg, 4),
      num(cfg.cadenceDays),
      num(cfg.baselineDays),
      num(cfg.sigmaMs),
      csvField(cfg.seed),
    ]);
  }

  return { csv: toCsv(rows), rows: rows.length - 1, target: name || null };
}

// --- What there is to export --------------------------------------------------

/**
 * How much data is available right now, for the export dialog to describe.
 * @returns {Object} Counts for each of the three files
 */
export function exportSummary() {
  const extent = recordedExtent();
  const curve = lightCurveSeries();
  const { log } = transitAnalysis();
  const run = radialVelocitySurvey();
  return {
    frames: extent.frames,
    bodies: extent.bodies,
    days: (extent.simTime * timeUnitSeconds()) / SECONDS_PER_DAY,
    samples: curve.days.length,
    transits: log.length,
    rvMeasurements: run.measurements.length,
    rvPlanned: run.planned,
    rvRunning: run.running,
  };
}

/**
 * Hand a CSV to the browser as a download.
 * @param {string} text - File contents
 * @param {string} filename - Suggested name
 */
export function downloadCsv(text, filename) {
  // The BOM is what makes Excel open a UTF-8 CSV without mangling it, and a
  // file a student cannot open in Excel is a file that did not get exported.
  const blob = new Blob([`\uFEFF${text}`], {
    type: 'text/csv;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

/**
 * A filename that sorts and does not collide.
 * @param {string} kind - What the file holds
 * @param {string} [scenario] - Scenario name, if there is one
 * @returns {string} e.g. 'gravitas-solar-system-trajectories.csv'
 */
export function csvFilename(kind, scenario) {
  const slug = String(scenario || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `gravitas${slug ? `-${slug}` : ''}-${kind}.csv`;
}
