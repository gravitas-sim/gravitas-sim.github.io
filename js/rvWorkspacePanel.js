// =============================================================================
// The radial velocity workspace panel
// -----------------------------------------------------------------------------
// The interface over js/rvWorkspace.js. Sliders, two canvases and a readout.
//
// Loaded lazily through js/rvWorkspaceBridge.js, so nothing in here is in the
// start-up path. That is why it imports the workspace directly rather than
// receiving it: by the time this module exists, the chunk is already resolved.
//
// The one piece of interface design worth defending: the Reveal button is a
// button and not a toggle, it is placed at the bottom rather than beside the
// parameters, and pressing it is recorded in the export. A student who wants
// the answer can have it. A student who is given it beside their own fit never
// practises the only skill the exercise teaches.
// =============================================================================

import {
  analysis,
  currentRecording,
  setUncertaintyReporter,
  draw,
  drawPeriodogram,
  exportReport,
  isRevealed,
  lastSearch,
  revealTruth,
  runSearch,
  setTrial,
  snapToBestAtPeriod,
  trialParameters,
} from './rvWorkspace.js';
import {
  layoutObservationPanels,
  noteObservationPanelUsed,
} from './observationLayout.js';
import { formatNumber } from './format.js';
import { surface, palette, responsiveHeight, MONO } from './widgetCanvas.js';
import { MC_LIMITS, runMonteCarlo } from './rvUncertainty.js';
import { t, onLocaleChange } from './i18n/index.js';
import { captureToNotebook, snapshot } from './notebookBridge.js';
import { ensureDeferredMessages } from './i18n/deferredMessages.js';

let enabled = false;
let els = null;

/** The parameters that get a slider, and how far each one may go. */
const SLIDERS = [
  { key: 'period', min: 0.05, max: 60, step: 0.001, decimals: 3, unit: 'd' },
  { key: 'K', min: 0, max: 400, step: 0.1, decimals: 1, unit: 'm/s' },
  { key: 'phase', min: 0, max: 6.2832, step: 0.01, decimals: 2, unit: 'rad' },
  { key: 'gamma', min: -400, max: 400, step: 0.1, decimals: 1, unit: 'm/s' },
];

/** Cache the DOM once. @returns {object} The elements */
function cacheElements() {
  if (els) return els;
  const id = s => document.getElementById(s);
  els = {
    container: id('rvFitContainer'),
    status: id('rvFitStatus'),
    canvas: id('rvFitCanvas'),
    periodogram: id('rvFitPeriodogram'),
    snap: id('rvFitSnap'),
    search: id('rvFitSearch'),
    minP: id('rvFitMinPeriod'),
    maxP: id('rvFitMaxPeriod'),
    reveal: id('rvFitReveal'),
    notebook: id('rvFitNotebook'),
    mcSection: id('rvMcSection'),
    mcTrials: id('rvMcTrials'),
    mcSeed: id('rvMcSeed'),
    mcRun: id('rvMcRun'),
    mcCancel: id('rvMcCancel'),
    mcStatus: id('rvMcStatus'),
    mcResult: id('rvMcResult'),
    mcPeriodHist: id('rvMcPeriodHist'),
    mcAmplitudeHist: id('rvMcAmplitudeHist'),
    mcAssumptions: id('rvMcAssumptions'),
    mcGuidance: id('rvMcGuidance'),
    truth: id('rvFitTruth'),
    stats: id('rvFitStats'),
    rivals: id('rvFitRivals'),
    structure: id('rvFitStructure'),
    close: id('rvFitClose'),
    sliders: Object.fromEntries(
      SLIDERS.map(s => [s.key, id(`rvFit_${s.key}`)])
    ),
    values: Object.fromEntries(
      SLIDERS.map(s => [s.key, id(`rvFitValue_${s.key}`)])
    ),
  };
  return els;
}

/** Push the current trial parameters onto the sliders. */
function syncSliders() {
  const e = cacheElements();
  const trial = trialParameters();
  for (const s of SLIDERS) {
    const input = e.sliders[s.key];
    if (input) input.value = String(trial[s.key]);
    const label = e.values[s.key];
    if (label) {
      label.textContent = `${formatNumber(trial[s.key], {
        sig: s.decimals + 2,
      })} ${s.unit}`;
    }
  }
}

/** Repaint everything. */
function render() {
  const e = cacheElements();
  if (!e.container || !enabled) return;
  syncSliders();
  draw(e.canvas);
  drawPeriodogram(e.periodogram);

  // Ahead of the early returns below, deliberately. The uncertainty section is
  // *most* in need of repainting on the paths where there is nothing to fit:
  // its Run button has to be disabled when there is no fit to resample, and a
  // render that returned before reaching it left the button enabled on an
  // empty recording.
  renderUncertainty();

  const a = analysis();
  if (!a) {
    if (e.status) e.status.textContent = t('rvfit.status.none');
    if (e.stats) e.stats.textContent = '';
    return;
  }
  if (a.tooFew) {
    if (e.status) e.status.textContent = t('rvfit.status.tooFew');
    if (e.stats) {
      e.stats.textContent = t('rvfit.tooFew', { n: a.used });
    }
    return;
  }

  if (e.status) {
    const ex = a.excluded;
    // Degraded readings belong in this total now that they are dropped by
    // default: a student who sees "12 fitted, 0 excluded" while three epochs
    // were silently held back has been told the wrong thing.
    let status = t('rvfit.status.points', {
      used: a.used,
      dropped: ex.missed + ex.notFinite + ex.badSigma + ex.degraded,
    });
    if (ex.degraded) {
      status += ` ${t('rvfit.status.degraded', { n: ex.degraded })}`;
    }
    if (ex.unverified) {
      status += ` ${t('rvfit.status.unverified', { n: ex.unverified })}`;
    }
    e.status.textContent = status;
  }

  if (e.stats) {
    const f = a.atTrial;
    // Null when the model could not be scored at all - a non-finite residual,
    // or a period that is not a period. There is no statistic to print and
    // saying so beats throwing on the next property access.
    if (!f) {
      e.stats.textContent = t('rvfit.noStats');
      return;
    }
    // The reduced chi-square is null whenever the weights were invented, and
    // the readout says why rather than printing a number that would be read as
    // a goodness of fit.
    const quality =
      f.reducedChi2 === null
        ? t('rvfit.noChi2', { rms: formatNumber(f.rms, { sig: 3 }) })
        : t('rvfit.chi2', {
            reduced: formatNumber(f.reducedChi2, { sig: 3 }),
            rms: formatNumber(f.rms, { sig: 3 }),
          });
    e.stats.textContent = quality;
  }

  if (e.rivals) {
    const s = lastSearch();
    if (!s) {
      e.rivals.textContent = '';
    } else {
      // Every trough within one of the best, named. This is the panel's whole
      // position on periodograms: the deepest one is not an answer.
      const close = s.minima.filter(m => m.deltaChi2 <= 1).slice(0, 4);
      e.rivals.textContent =
        close.length > 1
          ? t('rvfit.rivalsList', {
              list: close
                .map(m => `${formatNumber(m.period, { sig: 4 })} d`)
                .join(', '),
            })
          : t('rvfit.oneMinimum');
    }
  }

  if (e.structure) {
    const st = a.structure;
    e.structure.textContent = !st
      ? ''
      : st.runsRatio < 0.6
        ? t('rvfit.structured', {
            runs: st.runs,
            expected: formatNumber(st.expectedRuns, { sig: 2 }),
          })
        : t('rvfit.unstructured', {
            runs: st.runs,
            expected: formatNumber(st.expectedRuns, { sig: 2 }),
          });
  }

  if (e.truth) {
    if (!isRevealed()) {
      e.truth.textContent = '';
    } else if (!a.truth) {
      e.truth.textContent = t('rvfit.noTruth');
    } else {
      e.truth.textContent = t('rvfit.truth', {
        period: formatNumber(a.truth.period, { sig: 5 }),
        K: formatNumber(a.truth.K, { sig: 4 }),
        gamma: formatNumber(a.truth.gamma, { sig: 4 }),
      });
    }
  }
  if (e.reveal) e.reveal.disabled = isRevealed();
  // Nothing to keep until there is a scoreable fit on screen.
  if (e.notebook) e.notebook.disabled = !a || a.tooFew || !a.atTrial;
}

/**
 * Open or close the panel.
 * @param {boolean} on - Whether to show it
 * @returns {void}
 */
export function setRvWorkspaceEnabled(on) {
  const e = cacheElements();
  enabled = Boolean(on);
  if (e.container) e.container.style.display = enabled ? '' : 'none';
  if (enabled) {
    noteObservationPanelUsed('rvFitContainer');
    render();
  }
  layoutObservationPanels();
}

/** @returns {boolean} Whether the panel is open */
export const isRvWorkspaceEnabled = () => enabled;

/** @returns {?object} The exportable report, for the export dialog */
export const currentReport = () => exportReport();

/** Wire the panel up. Called once, when the chunk loads. */
export function initRvWorkspacePanel() {
  // This panel's strings are not in the start-up catalogue, so it registers
  // them itself rather than trusting whoever opened it to have done so. The
  // bridge does register them first in the normal path; a lesson, a share link
  // or a test that drives the panel directly does not, and a panel that renders
  // message ids because of who called it is a panel with a bug.
  ensureDeferredMessages()
    .then(() => render())
    .catch(() => {});

  // The catalogue can arrive after this panel does; see the note on the same
  // subscription in js/binaryRunPanel.js.
  onLocaleChange(() => render());

  const e = cacheElements();
  if (!e.container) return;

  for (const s of SLIDERS) {
    const input = e.sliders[s.key];
    if (!input) continue;
    input.min = String(s.min);
    input.max = String(s.max);
    input.step = String(s.step);
    input.addEventListener('input', () => {
      setTrial(s.key, Number(input.value));
      render();
    });
  }

  e.snap?.addEventListener('click', () => {
    snapToBestAtPeriod();
    render();
  });

  e.search?.addEventListener('click', () => {
    // Bounded, always, and by the reader. An unbounded search is not a
    // meaningful request and choosing the bounds for somebody would hide the
    // most consequential decision in the analysis.
    const minPeriod = Number(e.minP?.value);
    const maxPeriod = Number(e.maxP?.value);
    const result = runSearch({ minPeriod, maxPeriod });
    if (!result && e.status) e.status.textContent = t('rvfit.badBounds');
    render();
  });

  e.reveal?.addEventListener('click', () => {
    revealTruth();
    render();
  });

  // The bridge is imported at the top of this module rather than here, and the
  // notebook itself is still not: the bridge is the two-kilobyte rail button
  // that is in the start-up graph anyway, and everything heavy - the panel, the
  // capture helpers, the PDF writer - stays behind its ensureNotebook().
  //
  // What the static import buys is that the reading below happens in the
  // click's own task, before anything is awaited. Between a press and a
  // dynamic import resolving, a reader can refit, reveal the truth, re-run the
  // Monte Carlo or start another recording, and every one of those rewrites
  // the objects these two calls return.
  e.notebook?.addEventListener('click', async () => {
    const kept = {
      analysis: snapshot(analysis()),
      report: snapshot(exportReport()),
    };
    const saved = await captureToNotebook((capture, provenance) =>
      capture.fromRvFit({ ...kept, provenance })
    );
    if (!saved && e.status) e.status.textContent = t('nb.nothingToSave');
  });

  // The export asks the panel what the reader computed, and the workspace
  // tells the panel when the recording underneath has changed.
  //
  // Wrapped rather than passed by name: this function is called from the
  // bottom of the module and the uncertainty section is declared below that
  // call, so naming the bindings directly reads them inside their temporal
  // dead zone and throws before the panel exists. The wrappers are evaluated
  // when the export asks, which is always after the module has finished.
  setUncertaintyReporter(
    () => uncertaintyReport(),
    () => clearUncertainty(),
    () => mcInputsKey()
  );

  if (e.mcTrials) {
    e.mcTrials.min = String(MC_LIMITS.minTrials);
    e.mcTrials.max = String(MC_LIMITS.maxTrials);
    e.mcTrials.step = '50';
    e.mcTrials.value = String(MC_LIMITS.defaultTrials);
  }
  e.mcRun?.addEventListener('click', () => runUncertainty());
  e.mcCancel?.addEventListener('click', () => cancelUncertainty());

  e.close?.addEventListener('click', () => setRvWorkspaceEnabled(false));

  window.addEventListener('resize', () => {
    if (enabled) render();
  });

  e.container.style.display = 'none';
}

// The panel is only ever constructed inside the lazy chunk, so wiring it here
// is safe: by the time this module has been imported, its DOM is present.
initRvWorkspacePanel();

/** @returns {?object} The recording under analysis, for the export dialog */
export const analysedRecording = () => currentRecording();

// --- The optional uncertainty analysis ----------------------------------------
// The interface over js/rvUncertainty.js. Everything it prints comes from the
// report that module returns, including which numbers it is allowed to print:
// the report's `period` field is null whenever the refits split into families,
// so the single-interval line below simply has nothing to render and the family
// table takes over. That is deliberate - the refusal lives in the analysis, not
// in a decision this file could get wrong.

/** Escape for the small amount of markup this section writes. */
const esc = text =>
  String(text ?? '').replace(
    /[&<>"']/g,
    c =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[c]
  );

/** A plot frame with a title, matching the ones js/rvWorkspace.js draws. */
function frame(ctx, box, p, title) {
  ctx.strokeStyle = p.grid;
  ctx.lineWidth = 1;
  ctx.strokeRect(box.x, box.y, box.w, box.h);
  if (!title) return;
  ctx.fillStyle = p.muted;
  ctx.font = `11px ${MONO}`;
  ctx.textAlign = 'left';
  ctx.fillText(title, box.x, box.y - 5);
}

/**
 * The run the panel is currently waiting for, or null.
 *
 * This is OWNERSHIP and nothing else: it answers "is there a run whose result
 * this panel is still expecting", which is what disables the Run button and
 * shows Cancel. It is deliberately not the same question as "may this run
 * publish", which is what `mcGeneration` answers.
 *
 * Conflating the two locked the panel permanently. Supersession bumped the
 * generation and cancelled the token but left it here, and the superseded
 * run's own cleanup was conditional on still being current - which the
 * generation bump had just made impossible. So nothing ever released the
 * token, `runUncertainty()` returned at its first line for the rest of the
 * session, and the Run button stayed disabled with no error anywhere.
 */
let mcRun = null;
/**
 * Bumped by anything that makes an in-flight or finished run obsolete.
 *
 * Permission to publish. A run may write its report, its progress line and
 * its status only while the generation it captured is still the current one;
 * releasing its own ownership is separate, and is always allowed, because a
 * run that has finished is not running whatever else has changed.
 */
let mcGeneration = 0;
/** The last report, kept for redrawing on a resize or a language change. */
let mcReport = null;

/**
 * A key over everything an interval depends on.
 *
 * Derived from the inputs rather than maintained by notifications, and that is
 * deliberate: a hook that has to be called from every mutation path is a hook
 * some future mutation path will forget to call, and the failure mode is a
 * stale interval displayed beside a fit it does not describe. Reading the
 * inputs cannot go out of date.
 *
 * The recording is identified by its epochs and velocities rather than by an
 * id, because a second recording of the same star on the same schedule is a
 * different observing run and its interval is a different interval.
 *
 * @returns {?string} The key, or null when there is nothing to run on
 */
function mcInputsKey() {
  const e = cacheElements();
  const a = analysis();
  if (!a || a.tooFew || !a.atTrial) return null;
  const source = currentRecording();
  const points = source?.points || [];
  let h = 0x811c9dc5;
  const eat = text => {
    const str = String(text);
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
  };
  eat(source?.target ?? '');
  eat(source?.worldGeneration ?? '');
  eat(points.length);
  for (const p of points) {
    eat(p.day?.toPrecision?.(12) ?? p.day);
    eat(p.rv?.toPrecision?.(12) ?? p.rv);
    eat(p.sigma ?? '');
    eat(p.quality ?? '');
  }
  const bounds = lastSearch()?.bounds;
  return [
    (h >>> 0).toString(36),
    // The model the synthetic runs are drawn around. A slider move changes the
    // interval, so it changes the key.
    a.trial.period.toPrecision(12),
    a.trial.K.toPrecision(12),
    a.trial.phase.toPrecision(12),
    a.trial.gamma.toPrecision(12),
    bounds?.minPeriod ?? '',
    bounds?.maxPeriod ?? '',
    // The analysis settings, so changing either of them marks the report stale
    // rather than leaving a number computed from a different request on screen.
    e.mcTrials?.value ?? '',
    e.mcSeed?.value ?? '',
  ].join('/');
}

/** Whether the report on hand still describes what is on screen. */
const mcStale = () =>
  Boolean(mcReport?.ok) && mcReport.inputsKey !== mcInputsKey();

/** Four inks, so a family in the table matches its clump in the histogram. */
const FAMILY_INKS = ['#4facfe', '#e2725b', '#8de08a', '#c49bff', '#f2a65a'];

/** @returns {boolean} Whether an analysis is running */
export const isUncertaintyRunning = () => mcRun !== null;

/** The last report, for the export and for tests. @returns {?object} */
export const uncertaintyReport = () => mcReport;

/**
 * Forget the report and orphan any run in flight.
 *
 * Bumping the generation is what orphans it: the run keeps going to its own
 * `finally` - there is no way to abort a promise chain mid-await - but every
 * write it attempts is dropped, so it cannot resurrect an interval for a
 * recording that is no longer loaded.
 *
 * Ownership is released here rather than left to the orphan. Waiting for it
 * would mean the panel stayed locked until the batch it is in the middle of
 * finishes, and - before this was separated from permission to publish - it
 * meant the panel stayed locked for ever. The orphan's own cleanup checks
 * whether it is still the owner before touching anything, so releasing early
 * is safe: whatever runs next owns the token, and the orphan finds it gone.
 */
export function clearUncertainty() {
  mcGeneration++;
  mcReport = null;
  if (mcRun) {
    mcRun.cancelled = true;
    mcRun = null;
  }
  renderUncertainty();
}

/** For tests: which generation the panel is on. @returns {number} */
export const uncertaintyGeneration = () => mcGeneration;

/** For tests: whether the held report is stale. @returns {boolean} */
export const isUncertaintyStale = () => mcStale();

/** A number for reading, at a sensible number of figures. */
const fig = (v, sig = 5) =>
  v === null || v === undefined ? '—' : formatNumber(v, { sig });

/**
 * Draw one histogram, with the family clumps coloured to match the table.
 *
 * The bars are coloured by which family the bin falls in rather than by a
 * gradient, because the whole point of the picture is that the clumps are
 * separate things. A bin outside every family - which happens at the edges of
 * a sparse run - is drawn muted rather than assigned to its nearest family.
 */
function drawHistogram(canvas, hist, families, title, axisLabel) {
  if (!canvas) return;
  const { ctx, w, h } = surface(canvas, responsiveHeight(150, 120));
  if (!ctx) return;
  const p = palette();
  if (!hist) {
    ctx.fillStyle = p.muted;
    ctx.font = `12px ${MONO}`;
    ctx.textAlign = 'center';
    ctx.fillText(t('rvfit.mc.plot.none'), w / 2, h / 2);
    return;
  }

  const pad = { l: 34, r: 8, t: 16, b: 22 };
  const box = {
    x: pad.l,
    y: pad.t,
    w: w - pad.l - pad.r,
    h: h - pad.t - pad.b,
  };
  frame(ctx, box, p, title);

  const barW = box.w / hist.counts.length;
  hist.counts.forEach((count, i) => {
    if (!count) return;
    const centre = hist.lo + (i + 0.5) * hist.width;
    const family = families
      ? families.findIndex(f => centre >= f.range[0] && centre <= f.range[1])
      : -1;
    ctx.fillStyle =
      family >= 0 ? FAMILY_INKS[family % FAMILY_INKS.length] : p.grid;
    const barH = (count / hist.peak) * box.h;
    ctx.fillRect(
      box.x + i * barW,
      box.y + box.h - barH,
      Math.max(1, barW - 1),
      barH
    );
  });

  ctx.fillStyle = p.muted;
  ctx.font = `10px ${MONO}`;
  ctx.textAlign = 'left';
  ctx.fillText(fig(hist.lo, 4), box.x, box.y + box.h + 12);
  ctx.textAlign = 'right';
  ctx.fillText(fig(hist.hi, 4), box.x + box.w, box.y + box.h + 12);
  ctx.textAlign = 'center';
  ctx.fillText(axisLabel, box.x + box.w / 2, box.y + box.h + 12);
  ctx.textAlign = 'left';
  ctx.fillText(String(hist.peak), 2, box.y + 8);
}

/** Repaint the whole uncertainty section from the last report. */
function renderUncertainty() {
  const e = cacheElements();
  if (!e.mcResult) return;

  const a = analysis();
  const canRun =
    Boolean(a) && !a.tooFew && Boolean(a.atTrial) && mcRun === null;
  if (e.mcRun) e.mcRun.disabled = !canRun;
  if (e.mcCancel) e.mcCancel.hidden = mcRun === null;

  if (e.mcAssumptions) {
    // Printed whenever there is a report, above the numbers rather than in a
    // footnote: the assumptions are the reason the numbers mean anything, and
    // a reader who scrolls past them has been told nothing.
    e.mcAssumptions.innerHTML = mcReport
      ? `<p class="rvfit-mc-assume-head">${esc(t('rvfit.mc.assumptions'))}</p>
         <ul>${(mcReport.assumptions || [])
           .map(id => `<li>${esc(t(id))}</li>`)
           .join('')}</ul>`
      : '';
  }

  if (e.mcGuidance) {
    e.mcGuidance.innerHTML = mcReport
      ? `<h4>${esc(t('rvfit.mc.guidance.heading'))}</h4>
         ${['a', 'b', 'c']
           .map(k => `<p>${esc(t(`rvfit.mc.guidance.${k}`))}</p>`)
           .join('')}`
      : '';
  }

  if (!mcReport) {
    e.mcResult.innerHTML = '';
    if (e.mcStatus && mcRun === null) {
      e.mcStatus.textContent = t('rvfit.mc.idle');
    }
    drawHistogram(e.mcPeriodHist, null);
    drawHistogram(e.mcAmplitudeHist, null);
    return;
  }

  // The inputs moved after this report was computed. The numbers are not shown
  // at all rather than shown with a caveat: an interval beside a fit it does
  // not describe is worse than no interval, and the reader's next action is to
  // press the button again.
  if (mcStale()) {
    e.mcResult.innerHTML = `<p class="rvfit-mc-warn">${esc(
      t('rvfit.mc.stale')
    )}</p>`;
    drawHistogram(e.mcPeriodHist, null);
    drawHistogram(e.mcAmplitudeHist, null);
    return;
  }

  if (!mcReport.ok) {
    e.mcResult.innerHTML = `<p class="rvfit-mc-refused">${esc(
      t(`rvfit.mc.refused.${mcReport.reason}`, mcReport.detail || {})
    )}</p>`;
    drawHistogram(e.mcPeriodHist, null);
    drawHistogram(e.mcAmplitudeHist, null);
    return;
  }

  const r = mcReport;
  const lines = [];

  // What was actually run, first. An interval whose provenance a reader has to
  // hunt for is an interval they will quote without it.
  lines.push(
    `<p class="rvfit-mc-provenance">${esc(
      t('rvfit.mc.result.epochs', {
        n: r.spec.epochs,
        baseline: fig(r.spec.baseline, 4),
        samples: r.spec.samples,
        seed: r.spec.seed,
      })
    )}</p>`
  );

  if (r.cancelled) {
    lines.push(
      `<p class="rvfit-mc-warn">${esc(
        t('rvfit.mc.result.cancelled', {
          done: r.completed,
          total: r.requested,
        })
      )}</p>`
    );
  } else if (!r.complete) {
    lines.push(
      `<p class="rvfit-mc-warn">${esc(
        t('rvfit.mc.result.incomplete', {
          done: r.succeeded,
          total: r.requested,
        })
      )}</p>`
    );
  }

  if (r.failed) {
    const why = Object.entries(r.failures)
      .filter(([, n]) => n > 0)
      .map(([reason]) => t(`rvfit.mc.failed.${reason}`))
      .join('; ');
    lines.push(
      `<p class="rvfit-mc-warn">${esc(
        t('rvfit.mc.result.failures', { n: r.failed, why })
      )}</p>`
    );
  }

  if (r.gridLimited) {
    lines.push(
      `<p class="rvfit-mc-warn">${esc(t('rvfit.mc.result.gridLimited'))}</p>`
    );
  } else if (r.period && r.K) {
    lines.push(
      `<p class="rvfit-mc-interval">${esc(
        t('rvfit.mc.result.single', {
          median: fig(r.period.median),
          p16: fig(r.period.p16),
          p84: fig(r.period.p84),
          pct: 68,
          kMedian: fig(r.K.median, 4),
          kP16: fig(r.K.p16, 4),
          kP84: fig(r.K.p84, 4),
        })
      )}</p>`
    );
  }

  if (r.multimodal) {
    lines.push(
      `<p class="rvfit-mc-multimodal">${esc(
        t('rvfit.mc.result.multimodal', { n: r.families.length })
      )}</p>`
    );
  }

  // The families, largest first, with anything under one percent summarised
  // rather than listed: a noise draw produces a tail of one-trial families and
  // twenty rows of them would bury the four that matter.
  const shown = r.families.filter(f => f.fraction >= 0.01);
  const rest = r.families.length - shown.length;
  if (shown.length > 1 || (shown.length === 1 && r.multimodal)) {
    lines.push(
      `<h5 class="rvfit-mc-fam-head">${esc(t('rvfit.mc.families'))}</h5>
       <table class="rvfit-mc-table">
         <thead><tr>
           <th scope="col">${esc(t('rvfit.mc.col.share'))}</th>
           <th scope="col">${esc(t('rvfit.mc.col.period'))}</th>
           <th scope="col">${esc(t('rvfit.mc.col.amplitude'))}</th>
           <th scope="col">${esc(t('rvfit.mc.col.trials'))}</th>
         </tr></thead>
         <tbody>${shown
           .map(
             (f, i) => `<tr>
               <th scope="row">
                 <span class="rvfit-mc-swatch" aria-hidden="true"
                       style="background:${FAMILY_INKS[i % FAMILY_INKS.length]}"></span>
                 ${esc((100 * f.fraction).toFixed(1))}%
               </th>
               <td>${esc(
                 t('rvfit.mc.familyRow', {
                   median: fig(f.period.median),
                   p16: fig(f.period.p16),
                   p84: fig(f.period.p84),
                 })
               )}</td>
               <td>${esc(
                 t('rvfit.mc.familyRow', {
                   median: fig(f.K.median, 4),
                   p16: fig(f.K.p16, 4),
                   p84: fig(f.K.p84, 4),
                 })
               )}</td>
               <td>${esc(String(f.count))}</td>
             </tr>`
           )
           .join('')}</tbody>
       </table>`
    );
    if (rest > 0) {
      lines.push(
        `<p class="rvfit-mc-rest">${esc(
          t('rvfit.mc.otherFamilies', { n: rest })
        )}</p>`
      );
    }
  }

  e.mcResult.innerHTML = lines.join('');

  // Ranges the histogram colours bins against, in the same order as the table.
  const ranges = shown.map(f => ({ range: [f.period.min, f.period.max] }));
  const kRanges = shown.map(f => ({ range: [f.K.min, f.K.max] }));
  drawHistogram(
    e.mcPeriodHist,
    r.histograms.period,
    ranges,
    t('rvfit.mc.plot.period'),
    t('rvfit.mc.plot.periodAxis')
  );
  drawHistogram(
    e.mcAmplitudeHist,
    r.histograms.K,
    kRanges,
    t('rvfit.mc.plot.amplitude'),
    t('rvfit.mc.plot.amplitudeAxis')
  );
}

/**
 * Run the analysis on the fit currently on screen.
 *
 * Exclusive: a second press while one is running is ignored rather than
 * queued, because two runs would interleave their yields and neither would be
 * the run its seed describes.
 *
 * @returns {Promise<void>}
 */
export async function runUncertainty() {
  if (mcRun) return;
  const e = cacheElements();
  const a = analysis();
  if (!a || a.tooFew || !a.atTrial) return;

  const recording = currentRecording();
  const bounds = lastSearch()?.bounds;
  // This run's identity. A run whose generation is no longer current is
  // superseded and may not write anything back - see clearUncertainty().
  const generation = ++mcGeneration;
  const token = { cancelled: false, generation };
  const inputsKey = mcInputsKey();
  mcRun = token;
  mcReport = null;
  renderUncertainty();

  /** Whether the panel is still waiting for THIS run. */
  const owns = () => mcRun === token;
  /** Whether what this run produces is still wanted. */
  const mayPublish = () => owns() && generation === mcGeneration;

  let outcome = null;
  try {
    outcome = await runMonteCarlo(
      {
        points: recording?.points || [],
        params: a.trial,
        // The student's own search bounds where they ran one, and the slider
        // range either side of the trial period where they did not. Not a
        // fixed window: the bounds decide which aliases are reachable, and
        // choosing them for somebody would hide the most consequential
        // decision in the analysis.
        minPeriod: bounds?.minPeriod ?? Math.max(0.05, a.trial.period / 4),
        maxPeriod: bounds?.maxPeriod ?? a.trial.period * 4,
        trials: Number(e.mcTrials?.value) || MC_LIMITS.defaultTrials,
        seed: e.mcSeed?.value || 'mc-1',
        inputsKey,
      },
      {
        onProgress: ({ done, total }) => {
          // A superseded run's progress must not overwrite the line the
          // current one is writing, nor reappear after it finished.
          if (!mayPublish() || !e.mcStatus) return;
          e.mcStatus.textContent = t('rvfit.mc.running', { done, total });
        },
        shouldCancel: () => token.cancelled || generation !== mcGeneration,
      }
    );
  } catch (err) {
    console.warn('[rv] the uncertainty analysis did not finish:', err);
    outcome = null;
  } finally {
    // Two separate decisions, and running them together is what broke this.
    //
    // Publishing is conditional on the generation: a superseded run leaves no
    // trace, because nobody asked for it. Releasing the token is conditional
    // only on still holding it: a run that has finished is not running, and
    // the panel has to be told so whether or not anyone still wants the
    // answer. Anything that superseded this run has already taken the token,
    // in which case there is nothing here to release and nothing to redraw.
    const publish = mayPublish();
    const held = owns();
    if (held) {
      mcRun = null;
      if (publish) mcReport = outcome;
      if (e.mcStatus) e.mcStatus.textContent = '';
      renderUncertainty();
    }
  }
}

/**
 * Ask a running analysis to stop at the end of the current batch.
 *
 * Distinct from being superseded: a cancelled run still reports, with
 * `outcome: 'cancelled'` and the trials it managed, because the reader asked
 * for it to stop and the partial answer is theirs. A superseded run reports
 * nothing, because nobody asked for it at all.
 */
export function cancelUncertainty() {
  if (mcRun) mcRun.cancelled = true;
}
