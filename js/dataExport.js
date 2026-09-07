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
  // How the value was arrived at: ok, degraded, or missed. A row is written for
  // a missed epoch too, with an empty velocity - omitting it would say the
  // programme was shorter than it was, and the gaps in a schedule are the thing
  // this file exists to preserve.
  'quality',
  'interp_err_ms',
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
/** Columns for an exported fit. One row per measurement, plus a header block. */
const RV_FIT_COLUMNS = [
  'day',
  'phase',
  'rv_ms',
  'sigma_ms',
  'model_ms',
  'residual_ms',
  'quality',
];

/**
 * A fit from the analysis workspace, as CSV with its assumptions on top.
 *
 * The parameter block is comment lines above the table rather than extra
 * columns repeated on every row. It carries the model, the assumptions behind
 * it, the search bounds if one was run, and the provenance of the recording -
 * because a fit that does not say which run it came from, on what schedule and
 * with what noise seed, is not reproducible by whoever receives it.
 *
 * Returns the same {csv, rows} pair as every other builder here, with `rows`
 * counting residual rows and excluding the header. It used to return a bare
 * string, or null with nothing to export, and neither reached a file: the
 * dialog's download() reads `built.rows`, so the string exported nothing and
 * reported "empty", and the null threw on property access and reported a
 * failure. The row was unusable in both directions.
 *
 * An empty result is {csv: '', rows: 0} rather than a header-only document,
 * matching what the dialog does with a zero count - it toasts and writes no
 * file, so there is no half-empty download to explain.
 *
 * Read through the bridge's own accessor so that asking does not pull the
 * chunk in.
 *
 * @returns {{csv:string, rows:number}} The document and its residual count
 */
/**
 * What every builder here returns when there is nothing to write: the dialog
 * checks `rows` and writes no file at zero.
 */
const EMPTY_CSV = Object.freeze({ csv: '', rows: 0 });

export function rvFitCsv() {
  const report = latestRvFitReport?.();
  if (!report) return EMPTY_CSV;

  const lines = [];
  const comment = text => lines.push(`# ${text}`);
  comment('Radial velocity fit');
  comment(`model: ${report.model ?? 'unknown'}`);
  for (const a of report.assumptions || []) comment(`assumption: ${a}`);
  comment(`period_days: ${report.parameters.period}`);
  comment(`K_ms: ${report.parameters.K}`);
  comment(`phase_rad: ${report.parameters.phase}`);
  comment(`gamma_ms: ${report.parameters.gamma}`);
  comment(`weighting: ${report.fit?.weighting ?? 'unknown'}`);
  // Null whenever the weights were invented, and the file says so rather than
  // leaving the field blank for a reader to fill in with an assumption.
  comment(
    `reduced_chi2: ${
      report.fit?.reducedChi2 === null
        ? 'not applicable - no usable uncertainties'
        : report.fit?.reducedChi2
    }`
  );
  comment(`residual_rms_ms: ${report.fit?.rms ?? ''}`);
  // The dof convention travels with the numbers, because a reduced chi-square
  // is not interpretable without it. See evaluateModel in rvFit.js.
  comment(`degrees_of_freedom: ${report.fit?.dof ?? ''}`);
  comment(
    `parameters_estimated_from_data: ${report.fit?.estimatedParameters ?? 0}` +
      (report.fit?.optimised
        ? ' (fitted)'
        : ' (model as supplied; sliders are not a fit)')
  );
  comment(`measurements_used: ${report.used} of ${report.planned} planned`);
  const ex = report.excluded || {};
  comment(
    `excluded: ${ex.missed ?? 0} missed, ${ex.notFinite ?? 0} unreadable, ${ex.badSigma ?? 0} bad uncertainty, ${ex.degraded ?? 0} degraded (held out of the fit)`
  );
  comment(
    `unverified_interpolation: ${ex.unverified ?? 0} fitted with an unknown interpolation error`
  );
  if (report.search) {
    comment(
      `search_bounds_days: ${report.search.bounds.minPeriod} to ${report.search.bounds.maxPeriod}`
    );
    comment(
      `other_minima_days: ${report.search.minima
        .map(m => `${m.period.toFixed(4)} (dchi2 ${m.deltaChi2.toFixed(3)})`)
        .join('; ')}`
    );
  }
  if (report.structure) {
    comment(
      `residual_sign_changes: ${report.structure.runs} against ${report.structure.expectedRuns.toFixed(1)} expected by chance`
    );
  }
  for (const [key, value] of Object.entries(report.recording || {})) {
    comment(`recording_${key}: ${value ?? ''}`);
  }
  comment(`truth_revealed: ${report.truthRevealed}`);
  if (report.truth) {
    comment(
      `truth_period_days: ${report.truth.period}, truth_K_ms: ${report.truth.K}`
    );
  }
  writeUncertaintyComments(comment, report);

  const residuals = Array.isArray(report.residuals) ? report.residuals : [];
  const rows = [RV_FIT_COLUMNS.slice()];
  for (const r of residuals) {
    rows.push([
      num(r.day),
      num(r.phase, 4),
      num(r.rv),
      r.sigma === null || r.sigma === undefined ? '' : num(r.sigma),
      num(r.model),
      num(r.residual),
      csvField(r.quality || 'ok'),
    ]);
  }

  // A fit with no residuals is a fit of nothing. Reporting rows: 0 keeps the
  // dialog from writing a file that is entirely commentary.
  if (!residuals.length) return EMPTY_CSV;

  return { csv: `${lines.join('\n')}\n${toCsv(rows)}`, rows: residuals.length };
}

/**
 * The Monte Carlo block, written into the fit's own file.
 *
 * The file omitted it entirely, so a student who ran an uncertainty analysis
 * and then exported their fit got a file with parameters and no statement of
 * how well they were determined - which is the half a reader most needs and
 * the half that takes longest to produce.
 *
 * Written as comments beside the fit rather than as a second file, because an
 * interval that travels separately from the fit it describes is an interval
 * that will be filed next to the wrong one.
 *
 * The staleness contract is enforced here as well as in the panel. A report
 * whose `inputsKey` no longer matches the fit being exported describes a
 * different recording or a different model, and the file says that instead of
 * printing its numbers: an interval attached to the wrong fit is worse than no
 * interval, and this is the last place it can be caught before a file leaves
 * the application.
 *
 * @param {Function} comment - Writes one `# ` line
 * @param {object} report - From rvWorkspace.exportReport()
 * @returns {void}
 */
function writeUncertaintyComments(comment, report) {
  const u = report.uncertainty;
  if (!u) {
    comment('uncertainty_analysis: not run');
    return;
  }

  if (!u.ok) {
    comment(`uncertainty_analysis: refused (${u.reason})`);
    for (const a of u.assumptions || [])
      comment(`uncertainty_assumption: ${a}`);
    return;
  }

  const key = uncertaintyKeyFor(report);
  if (key !== null && u.inputsKey !== null && u.inputsKey !== key) {
    comment(
      'uncertainty_analysis: stale - it was computed for a different ' +
        'recording, fit or search range, so its intervals are not reported here'
    );
    comment(`uncertainty_computed_for: ${u.inputsKey}`);
    comment(`uncertainty_this_fit: ${key}`);
    return;
  }

  const spec = u.spec || {};
  comment(
    'uncertainty_analysis: parametric Monte Carlo over the recorded epochs'
  );
  comment(`uncertainty_source: ${spec.resampledAbout ?? 'unknown'}`);
  comment(`uncertainty_model: ${spec.model ?? 'unknown'}`);
  comment(`uncertainty_error_model: ${spec.errors ?? 'unknown'}`);
  comment(`uncertainty_seed: ${spec.seed ?? ''}`);
  comment(`uncertainty_inputs_key: ${u.inputsKey ?? ''}`);
  comment(
    `uncertainty_search_bounds_days: ${spec.minPeriod ?? ''} to ${spec.maxPeriod ?? ''}`
  );
  comment(`uncertainty_grid_points_per_trial: ${spec.samples ?? ''}`);
  comment(`uncertainty_epochs: ${spec.epochs ?? ''}`);
  comment(
    `uncertainty_trials_requested: ${u.requested}, attempted: ${u.completed}, produced_a_fit: ${u.succeeded}, failed: ${u.failed}`
  );
  for (const [reason, n] of Object.entries(u.failures || {})) {
    if (n > 0) comment(`uncertainty_failed_${reason}: ${n}`);
  }
  comment(`uncertainty_outcome: ${u.outcome}`);
  comment(`uncertainty_cancelled: ${u.cancelled}`);
  comment(`uncertainty_complete: ${u.complete}`);
  if (u.gridLimited) {
    comment(
      'uncertainty_grid_limited: every trial returned the same period, so no ' +
        'interval is reported - it would describe the search grid, not the data'
    );
  }

  if (u.period && u.K) {
    comment(
      `uncertainty_period_days_p16_median_p84: ${u.period.p16}, ${u.period.median}, ${u.period.p84}`
    );
    comment(
      `uncertainty_K_ms_p16_median_p84: ${u.K.p16}, ${u.K.median}, ${u.K.p84}`
    );
  } else {
    comment(
      'uncertainty_single_interval: none - the refits split into separate ' +
        'alias families and one interval across them would describe nothing'
    );
  }

  comment(`uncertainty_alias_families: ${(u.families || []).length}`);
  (u.families || []).forEach((f, i) => {
    comment(
      `uncertainty_family_${i + 1}: share ${(100 * f.fraction).toFixed(1)}%, ` +
        `trials ${f.count}, period_days ${f.period.p16}..${f.period.median}..${f.period.p84}, ` +
        `K_ms ${f.K.p16}..${f.K.median}..${f.K.p84}`
    );
  });
  for (const a of u.assumptions || []) comment(`uncertainty_assumption: ${a}`);
}

/**
 * The inputs key this fit would produce, for the staleness check above.
 *
 * Recomputed from the report rather than read off it, because the point is to
 * compare what the analysis was run against with what is being exported now.
 * Returns null when the report does not carry enough to compare, and a null
 * comparison is treated as "cannot tell" rather than as "stale".
 *
 * @param {object} report - From rvWorkspace.exportReport()
 * @returns {?string} The key, or null
 */
function uncertaintyKeyFor(report) {
  return report?.uncertaintyKey ?? null;
}

/**
 * Where the export dialog reads a fit from.
 *
 * Injected rather than imported so that dataExport.js, which is in the
 * start-up path, never reaches into the lazily loaded workspace chunk. The
 * bridge installs this the first time somebody opens the workspace; until then
 * it is undefined and rvFitCsv() returns null.
 *
 * @type {?Function}
 */
let latestRvFitReport = null;

/**
 * Let the workspace publish its current fit to the export dialog.
 *
 * @param {?Function} fn - Returns the report, or null
 * @returns {void}
 */
export function setRvFitReporter(fn) {
  latestRvFitReport = typeof fn === 'function' ? fn : null;
}

export function radialVelocityCsv() {
  const run = radialVelocitySurvey();
  const rows = [RADIAL_VELOCITY_COLUMNS.slice()];
  const cfg = run.config;
  const name = run.target?.name || '';
  const id = run.target?.id;

  for (const m of run.measurements) {
    rows.push([
      num(m.day),
      // Empty rather than zero: a missed epoch has no velocity, and a zero
      // would be averaged in by anything that read the column naively.
      m.rv === null || m.rv === undefined ? '' : num(m.rv),
      m.sigma === null || m.sigma === undefined ? '' : num(m.sigma),
      csvField(m.quality || 'ok'),
      // Empty, not zero, where the estimate could not be made at all: an
      // unverified epoch is not an epoch verified to be exact.
      Number.isFinite(m.interpolationError) ? num(m.interpolationError, 4) : '',
      csvField(name),
      id === undefined || id === null ? '' : String(id),
      num(run.inclinationDeg, 4),
      num(cfg.cadenceDays),
      num(cfg.baselineDays),
      num(cfg.sigmaMs),
      csvField(cfg.seed),
    ]);
  }

  const missed = run.measurements.filter(m => m.missed).length;
  const degraded = run.measurements.filter(
    m => m.quality === 'degraded'
  ).length;
  return {
    csv: toCsv(rows),
    rows: rows.length - 1,
    target: name || null,
    missed,
    degraded,
  };
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
    // Whether the analysis workspace has a fit to export. Undefined until
    // somebody opens it, which is exactly when the row should appear.
    rvFit: Boolean(latestRvFitReport?.()),
    rvUsable: run.measurements.filter(
      m => !m.missed && m.quality !== 'degraded'
    ).length,
    rvMissed: run.measurements.filter(m => m.missed).length,
    rvDegraded: run.measurements.filter(m => m.quality === 'degraded').length,
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
