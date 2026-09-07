// =============================================================================
// The radial velocity analysis workspace
// -----------------------------------------------------------------------------
// What a student does with a recording once they have one. Three plots and four
// sliders: the measurements against time with the model over them, the same
// measurements folded on the trial period, and the residuals. Move a slider and
// all three redraw.
//
// Lazy-loaded, because most visitors never take a recording and this is the
// only part of the observing feature that draws its own charts. See
// js/rvWorkspaceBridge.js.
//
// The three things this panel is careful about
// -----------------------------------------------------------------------------
// It does not know the answer. The generating parameters are available - they
// are right there in the recording, in every point's `truth` field - and the
// panel deliberately does not look at them until somebody presses Reveal. A
// workspace that showed the truth beside the fit would turn the exercise into
// checking, and the entire skill being practised is deciding whether a fit is
// good without being told.
//
// It shows the whole periodogram, not its winner. The chi-square curve is
// drawn across the searched range with every trough marked, because on sparse
// data the lowest one is frequently an alias: on twelve measurements taken
// three days apart, a one-day period and the true three-day period fit equally
// well to four decimal places. A panel that printed the best period as an
// answer would be teaching students to trust exactly the wrong thing.
//
// It never says "detected". There is no significance number anywhere in here,
// because computing one honestly needs assumptions about the number of
// independent frequencies searched that this tool has no way to justify.
// =============================================================================

import { surface, palette, responsiveHeight, MONO } from './widgetCanvas.js';
import {
  evaluateModel,
  fitAtPeriod,
  foldOnPeriod,
  periodSearch,
  residualStructure,
  usablePoints,
  fitReport,
  WEIGHTING,
} from './rvFit.js';
import { formatNumber } from './format.js';
import { t } from './i18n/index.js';

/** The recording being analysed, and where it came from. */
let source = null;
/** The parameters the student is currently trying. */
let trial = { period: 3, K: 50, phase: 0, gamma: 0 };
/** The last completed period search, kept so its curve stays on screen. */
let search = null;
/** Whether the generating parameters have been asked for. */
let revealed = false;

/**
 * Hand the workspace a recording to work on.
 *
 * The metadata travels with it. An exported fit that did not say which run it
 * came from, on what schedule and with what noise seed, would not be
 * reproducible by the person it was handed to.
 *
 * @param {object} recording - points, config and provenance
 * @returns {void}
 */
export function loadRecording(recording) {
  source = recording || null;
  revealed = false;
  search = null;
  // An interval computed from a different observing run must not survive into
  // this one: it would be exported beside the new recording's provenance and
  // read as an interval on these points.
  onRecordingChanged?.();
  if (!source?.points?.length) return;

  // A starting guess that is honest about being a guess: the midpoint of the
  // searched range for the period, and the scatter of the data for the
  // amplitude. Deliberately not the truth, and deliberately not a fit - the
  // student's first act should be to move something.
  const { usable } = usablePoints(source.points);
  if (usable.length) {
    const values = usable.map(p => p.rv);
    const lo = Math.min(...values);
    const hi = Math.max(...values);
    const days = usable.map(p => p.day);
    const baseline = Math.max(...days) - Math.min(...days) || 1;
    trial = {
      period: Math.max(0.1, baseline / 4),
      K: (hi - lo) / 2,
      phase: 0,
      gamma: (hi + lo) / 2,
    };
  }
}

/** @returns {?object} The recording under analysis */
export const currentRecording = () => source;

/** @returns {object} The parameters currently on the sliders */
export const trialParameters = () => ({ ...trial });

/**
 * Change one trial parameter.
 *
 * @param {string} key - period, K, phase or gamma
 * @param {number} value - The new value
 * @returns {void}
 */
export function setTrial(key, value) {
  if (!(key in trial) || !Number.isFinite(value)) return;
  trial[key] = key === 'period' ? Math.max(1e-6, value) : value;
}

/**
 * Fit the three linear parameters at the period currently set.
 *
 * Offered as a separate action from the period search because it is a
 * different kind of help: it says "given that you have chosen this period,
 * here is the best amplitude, phase and offset", which leaves the judgement
 * that matters with the student.
 *
 * @returns {?object} The fit
 */
export function snapToBestAtPeriod() {
  const { usable } = usablePoints(source?.points || []);
  // Null when the normal equations are singular - every point at the same
  // phase, or fewer than three of them. The trial is left exactly as it was
  // rather than being overwritten with nothing.
  const fit = fitAtPeriod(usable, trial.period);
  if (fit) {
    trial = {
      period: fit.period,
      K: fit.K,
      phase: fit.phase,
      gamma: fit.gamma,
    };
  }
  return fit;
}

/**
 * Search a bounded range of periods.
 *
 * Bounded by the caller, always. An unbounded search is not a meaningful
 * request - the shortest period a dataset can constrain is set by its sampling
 * and the longest by its baseline - and silently choosing bounds for somebody
 * would hide the most consequential decision in the whole analysis.
 *
 * @param {object} bounds - minPeriod and maxPeriod, in days
 * @returns {?object} The search, also retained for drawing
 */
export function runSearch(bounds) {
  const { usable } = usablePoints(source?.points || []);
  search = periodSearch(usable, bounds);
  if (search?.best) {
    trial = {
      period: search.best.period,
      K: search.best.K,
      phase: search.best.phase,
      gamma: search.best.gamma,
    };
  }
  return search;
}

/** @returns {?object} The last search, for drawing and for export */
export const lastSearch = () => search;

/**
 * Ask for the parameters the simulation actually used.
 *
 * A deliberate, recorded action rather than a toggle that might have been left
 * on. Whether a student looked, and when, is part of what happened.
 *
 * @returns {?object} The generating parameters, or null if unknown
 */
export function revealTruth() {
  revealed = true;
  return truthParameters();
}

/** @returns {boolean} Whether the truth has been asked for */
export const isRevealed = () => revealed;

/**
 * The generating parameters, if the recording carries them.
 *
 * Read from the recording's own metadata rather than inferred from the
 * noiseless `truth` column, so a recording made against a real signal with no
 * known parameters simply has nothing to reveal, and says so.
 *
 * @returns {?object} period, K, gamma if known
 */
export function truthParameters() {
  const g = source?.truth;
  if (!g) return null;
  return {
    period: Number.isFinite(g.period) ? g.period : null,
    K: Number.isFinite(g.K) ? g.K : null,
    gamma: Number.isFinite(g.gamma) ? g.gamma : null,
    note: g.note || null,
  };
}

/**
 * Everything the workspace currently knows, for the screen and the export.
 *
 * @returns {?object} The analysis
 */
export function analysis() {
  if (!source?.points?.length) return null;
  const { usable, counts } = usablePoints(source.points);
  if (usable.length < 3) {
    return { tooFew: true, used: usable.length, excluded: counts };
  }
  // Scored exactly as dialled in. This used to call fitAtPeriod, which
  // silently re-derived the amplitude, phase and offset - so the number under
  // the plot described the best curve available at that period while the
  // residuals on the plot were of the student's curve, and a student could
  // drag the amplitude to zero without the goodness-of-fit moving.
  const scored = evaluateModel(usable, trial);
  const folded = foldOnPeriod(usable, trial);
  return {
    tooFew: false,
    trial: { ...trial },
    // Of the model on screen, always.
    atTrial: scored,
    folded,
    structure: residualStructure(folded),
    used: usable.length,
    excluded: counts,
    search,
    revealed,
    truth: revealed ? truthParameters() : null,
  };
}

/**
 * The exportable record: parameters, assumptions, residuals, provenance.
 *
 * @returns {?object} The report
 */
export function exportReport() {
  if (!source?.points?.length) return null;
  // Zero estimated parameters: these are the numbers on the sliders, however
  // they got there, and the export says so rather than implying a fit.
  const report = fitReport(source.points, trial, {
    search,
    estimatedParameters: 0,
  });
  if (!report) return null;
  return {
    ...report,
    // Where the numbers came from. A fit without this is not reproducible by
    // whoever receives it.
    recording: {
      target: source.target ?? null,
      scenario: source.scenario ?? null,
      seed: source.seed ?? null,
      cadenceDays: source.config?.cadenceDays ?? null,
      baselineDays: source.config?.baselineDays ?? null,
      sigma: source.config?.sigma ?? null,
      plannedEpochs: source.points.length,
      recordedAt: source.recordedAt ?? null,
      worldGeneration: source.worldGeneration ?? null,
      // When the telescope looked, as opposed to how precisely. Null for a
      // plain cadence run: it had no plan beyond its spacing, and naming a
      // shape it never had would be worse than saying nothing.
      scheduleKind: source.config?.scheduleKind ?? null,
      scheduleEpochs: source.config?.scheduleEpochs ?? null,
      scheduleFingerprint: source.scheduleFingerprint ?? null,
    },
    truthRevealed: revealed,
    truth: revealed ? truthParameters() : null,
    // The uncertainty analysis, when one has been run. Published from the
    // panel rather than computed here: the analysis is optional and its
    // report is already the reproducible block, seed and grid included, so
    // this carries it verbatim. Null when nobody ran one, which is honest -
    // an export with no interval says none was computed.
    uncertainty: uncertaintyFor ? uncertaintyFor() : null,
    /**
     * The inputs key THIS fit would produce right now.
     *
     * Carried so a consumer can tell a current interval from one computed
     * against a different recording, fit or search range. The panel already
     * withholds a stale report on screen; the export needs the same check,
     * because a file is where an interval outlives the session that made it.
     */
    uncertaintyKey: uncertaintyKeyFor ? uncertaintyKeyFor() : null,
  };
}

/**
 * Where the export gets the uncertainty report from.
 *
 * Published in rather than imported, for the same reason dataExport.js is
 * handed a reporter by the bridge: this module is the analysis and the panel
 * is the interface, and a module that reached up into its own panel to find
 * out what the reader had clicked would be the wrong way round.
 */
let uncertaintyFor = null;

/** Called when a new recording is loaded, so the panel can drop its report. */
let onRecordingChanged = null;

/**
 * Register the uncertainty reporter and its invalidation hook.
 *
 * @param {?Function} fn - Returns the last uncertainty report, or null
 * @param {?Function} [onChange] - Called when a new recording is loaded
 * @returns {void}
 */
export function setUncertaintyReporter(fn, onChange = null, keyFn = null) {
  uncertaintyFor = typeof fn === 'function' ? fn : null;
  onRecordingChanged = typeof onChange === 'function' ? onChange : null;
  uncertaintyKeyFor = typeof keyFn === 'function' ? keyFn : null;
}

/** Returns the key the current inputs would produce; see exportReport(). */
let uncertaintyKeyFor = null;

// --- Drawing -----------------------------------------------------------------

/**
 * One point with its error bar.
 *
 * @param {object} ctx - Canvas context
 * @param {number} x - Screen x
 * @param {number} y - Screen y
 * @param {number} half - Half the error bar, in pixels
 * @param {string} colour - Ink
 * @returns {void}
 */
function errorBar(ctx, x, y, half, colour) {
  ctx.strokeStyle = colour;
  ctx.lineWidth = 1;
  if (half > 0.5) {
    ctx.beginPath();
    ctx.moveTo(x, y - half);
    ctx.lineTo(x, y + half);
    ctx.moveTo(x - 2.5, y - half);
    ctx.lineTo(x + 2.5, y - half);
    ctx.moveTo(x - 2.5, y + half);
    ctx.lineTo(x + 2.5, y + half);
    ctx.stroke();
  }
  ctx.fillStyle = colour;
  ctx.beginPath();
  ctx.arc(x, y, 2.6, 0, 2 * Math.PI);
  ctx.fill();
}

/**
 * A plot frame with axes and labels.
 *
 * @param {object} ctx - Canvas context
 * @param {object} box - x, y, w, h
 * @param {object} p - Palette
 * @param {string} title - Heading
 * @returns {void}
 */
function frame(ctx, box, p, title) {
  ctx.strokeStyle = p.grid;
  ctx.lineWidth = 1;
  ctx.strokeRect(box.x, box.y, box.w, box.h);
  ctx.fillStyle = p.muted;
  ctx.font = `11px ${MONO}`;
  ctx.textAlign = 'left';
  ctx.fillText(title, box.x, box.y - 5);
}

/** Linear mapping from a data range onto a pixel range. */
const scaler = (lo, hi, a, b) => {
  const span = hi - lo || 1;
  return v => a + ((v - lo) / span) * (b - a);
};

/**
 * Draw the three plots.
 *
 * @param {HTMLCanvasElement} canvas - Where to draw
 * @returns {void}
 */
export function draw(canvas) {
  if (!canvas) return;
  // surface() sizes the canvas for the display's pixel ratio, clears it, and
  // hands back the context along with the CSS-pixel dimensions to draw in.
  const { ctx, w, h: height } = surface(canvas, responsiveHeight(430, 340));
  if (!ctx) return;
  const p = palette();
  const a = analysis();

  if (!a || a.tooFew) {
    ctx.fillStyle = p.muted;
    ctx.font = `12px ${MONO}`;
    ctx.textAlign = 'center';
    ctx.fillText(t('rvfit.noData'), w / 2, height / 2);
    return;
  }

  const pad = { l: 46, r: 12, t: 18, b: 18 };
  const plotW = w - pad.l - pad.r;
  const rowH = (height - pad.t * 3 - pad.b) / 3;

  const values = a.folded.flatMap(f => [f.rv, f.model]);
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const margin = (hi - lo) * 0.15 || 1;

  // --- 1. Time series, with the model over it ---
  {
    const box = { x: pad.l, y: pad.t, w: plotW, h: rowH };
    frame(ctx, box, p, t('rvfit.plot.time'));
    const days = a.folded.map(f => f.day);
    const sx = scaler(
      Math.min(...days),
      Math.max(...days),
      box.x + 4,
      box.x + box.w - 4
    );
    const sy = scaler(lo - margin, hi + margin, box.y + box.h - 4, box.y + 4);

    // The model, sampled finely so a short period does not alias on screen.
    ctx.strokeStyle = p.accent;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    const t0 = Math.min(...days);
    const t1 = Math.max(...days);
    for (let i = 0; i <= 400; i++) {
      const d = t0 + ((t1 - t0) * i) / 400;
      const v =
        a.trial.gamma +
        a.trial.K *
          Math.sin((2 * Math.PI * d) / a.trial.period + a.trial.phase);
      const X = sx(d);
      const Y = sy(v);
      if (i === 0) ctx.moveTo(X, Y);
      else ctx.lineTo(X, Y);
    }
    ctx.stroke();

    for (const f of a.folded) {
      const half = f.sigma > 0 ? Math.abs(sy(0) - sy(f.sigma)) : 0;
      errorBar(ctx, sx(f.day), sy(f.rv), half, p.ink);
    }
  }

  // --- 2. Folded on the trial period ---
  {
    const box = { x: pad.l, y: pad.t * 2 + rowH, w: plotW, h: rowH };
    frame(ctx, box, p, t('rvfit.plot.folded'));
    const sx = scaler(0, 1, box.x + 4, box.x + box.w - 4);
    const sy = scaler(lo - margin, hi + margin, box.y + box.h - 4, box.y + 4);

    ctx.strokeStyle = p.accent;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i <= 200; i++) {
      const ph = i / 200;
      const v =
        a.trial.gamma + a.trial.K * Math.sin(2 * Math.PI * ph + a.trial.phase);
      const X = sx(ph);
      const Y = sy(v);
      if (i === 0) ctx.moveTo(X, Y);
      else ctx.lineTo(X, Y);
    }
    ctx.stroke();

    for (const f of a.folded) {
      const half = f.sigma > 0 ? Math.abs(sy(0) - sy(f.sigma)) : 0;
      errorBar(ctx, sx(f.phase), sy(f.rv), half, p.ink);
    }
  }

  // --- 3. Residuals against phase ---
  {
    const box = { x: pad.l, y: pad.t * 3 + rowH * 2, w: plotW, h: rowH };
    frame(ctx, box, p, t('rvfit.plot.residuals'));
    const res = a.folded.map(f => f.residual);
    const rMax = Math.max(1e-9, ...res.map(Math.abs));
    const sx = scaler(0, 1, box.x + 4, box.x + box.w - 4);
    const sy = scaler(-rMax * 1.3, rMax * 1.3, box.y + box.h - 4, box.y + 4);

    ctx.strokeStyle = p.grid;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(box.x, sy(0));
    ctx.lineTo(box.x + box.w, sy(0));
    ctx.stroke();
    ctx.setLineDash([]);

    // Coloured by the structure diagnostic: when the residuals have a shape,
    // saying so on the plot is more useful than a number underneath it.
    const structured = a.structure && a.structure.runsRatio < 0.6;
    for (const f of a.folded) {
      const half = f.sigma > 0 ? Math.abs(sy(0) - sy(f.sigma)) : 0;
      errorBar(
        ctx,
        sx(f.phase),
        sy(f.residual),
        half,
        structured ? p.warn : p.ink
      );
    }
  }
}

/**
 * Draw the chi-square curve across the searched range.
 *
 * A separate canvas because it is a separate question. Every trough is marked,
 * not only the lowest: the whole reason this is on screen is that the lowest
 * one is often not the right one.
 *
 * @param {HTMLCanvasElement} canvas - Where to draw
 * @returns {void}
 */
export function drawPeriodogram(canvas) {
  if (!canvas) return;
  const { ctx, w, h: height } = surface(canvas, responsiveHeight(150, 110));
  if (!ctx) return;
  const p = palette();

  if (!search?.grid?.length) {
    ctx.fillStyle = p.muted;
    ctx.font = `12px ${MONO}`;
    ctx.textAlign = 'center';
    ctx.fillText(t('rvfit.noSearch'), w / 2, height / 2);
    return;
  }

  const box = { x: 46, y: 16, w: w - 58, h: height - 34 };
  frame(ctx, box, p, t('rvfit.plot.periodogram'));

  const chis = search.grid.map(g => g.chi2);
  const lo = Math.min(...chis);
  const hi = Math.max(...chis);
  const sx = scaler(
    Math.log10(search.bounds.minPeriod),
    Math.log10(search.bounds.maxPeriod),
    box.x + 3,
    box.x + box.w - 3
  );
  const sy = scaler(lo, hi, box.y + box.h - 3, box.y + 3);

  ctx.strokeStyle = p.accent;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  search.grid.forEach((g, i) => {
    const X = sx(Math.log10(g.period));
    const Y = sy(g.chi2);
    if (i === 0) ctx.moveTo(X, Y);
    else ctx.lineTo(X, Y);
  });
  ctx.stroke();

  // Every trough within a whisker of the best, marked the same way as the
  // best. Drawing the winner differently would be the visual version of the
  // claim this panel refuses to make.
  const near = search.minima.filter(
    m => m.deltaChi2 <= Math.max(1, (hi - lo) * 0.02)
  );
  ctx.strokeStyle = p.warn;
  ctx.setLineDash([2, 3]);
  for (const m of near) {
    ctx.beginPath();
    ctx.moveTo(sx(Math.log10(m.period)), box.y);
    ctx.lineTo(sx(Math.log10(m.period)), box.y + box.h);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  ctx.fillStyle = p.muted;
  ctx.font = `10px ${MONO}`;
  ctx.textAlign = 'left';
  ctx.fillText(
    `${formatNumber(search.bounds.minPeriod, { sig: 2 })} d`,
    box.x,
    box.y + box.h + 12
  );
  ctx.textAlign = 'right';
  ctx.fillText(
    `${formatNumber(search.bounds.maxPeriod, { sig: 2 })} d`,
    box.x + box.w,
    box.y + box.h + 12
  );
  if (near.length > 1) {
    ctx.textAlign = 'center';
    ctx.fillStyle = p.warn;
    ctx.fillText(
      t('rvfit.rivals', { n: near.length }),
      box.x + box.w / 2,
      box.y + box.h + 12
    );
  }
}

/** Forget everything. Used by the scenario loader and by tests. */
export function resetWorkspace() {
  source = null;
  search = null;
  revealed = false;
  trial = { period: 3, K: 50, phase: 0, gamma: 0 };
}

/** Weighting constants re-exported so the panel need not import two modules. */
export { WEIGHTING };
