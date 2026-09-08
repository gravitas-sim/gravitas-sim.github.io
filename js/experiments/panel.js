// =============================================================================
// The bench's panel
// -----------------------------------------------------------------------------
// All the DOM for the A/B bench, built here rather than written into
// index.html. The panel is six different screens depending on how far through
// an experiment the student is - nothing captured, captured but nothing run,
// A recorded, both recorded - and markup for six states, five of them hidden,
// is markup nobody can read and every locale has to translate.
//
// It joins the instrument stack in the bottom-left corner with the observing
// panels, so opening it never covers the light curve, and it is loaded only
// when the rail button is pressed: this file plus the chart it draws is the
// heaviest thing in the feature and most visitors never open it.
// =============================================================================

import { t, onLocaleChange } from '../i18n/index.js';
import { ensureChartJs } from '../chartjs.js';
import { formatNumber } from '../format.js';
import { chartColors } from '../observationChart.js';
import {
  requestObservationLayout,
  noteObservationPanelUsed,
} from '../observationLayout.js';
import * as bench from './bench.js';
import { OFFERED_METRICS } from './bench.js';
import { METRIC_ARITY, SCALAR_METRICS } from './metrics.js';
import { SWEEPABLE, parameterFor, sweepableScenarios } from './sweep.js';
import { describeDiff } from './canonicalState.js';
import { describePerturbation, systemExtent } from './perturbation.js';
import * as CHAOS from './chaosPair.js';
import { SETTINGS } from '../appState.js';
import { state, onPhysicsStep, updatePhysicsSettings } from '../physics.js';
import { getSimClock } from '../timeline.js';
import { frameAdvance } from '../timestep.js';
import { DT } from '../physics.js';

const PANEL_ID = 'experimentPanel';

let root = null;
let chart = null;
let chartCanvas = null;
/** The sweep's own chart, kept apart so the two do not fight over one canvas. */
let sweepChart = null;
let statusTimer = 0;
let onShareRequest = null;

/** @param {Function} fn - Called when the student asks for a share link */
export function setShareHandler(fn) {
  onShareRequest = fn;
}

// --- Building -------------------------------------------------------------------

/**
 * Create the panel, once.
 * @returns {HTMLElement} The panel root
 */
export function ensurePanel() {
  if (root) return root;
  root = document.createElement('div');
  root.id = PANEL_ID;
  root.className = 'obs-panel experiment-panel';
  root.style.display = 'none';
  root.setAttribute('role', 'region');
  root.setAttribute('aria-label', t('bench.title'));
  root.innerHTML = `
    <div class="obs-panel-toolbar">
      <div class="obs-panel-meta">
        <span class="obs-panel-title">${esc(t('bench.title'))}</span>
        <span id="benchStatus" class="obs-panel-status">${esc(t('bench.status.idle'))}</span>
      </div>
      <div class="obs-panel-actions">
        <button id="benchSave" class="obs-panel-btn" title="${esc(t('bench.action.save.hint'))}">${esc(t('bench.action.save'))}</button>
        <button id="benchClose" class="obs-panel-btn" title="${esc(t('bench.action.close.hint'))}">✕</button>
      </div>
    </div>
    <div class="experiment-body">
      <div class="experiment-row">
        <label class="experiment-label" for="benchName">${esc(t('bench.field.name'))}</label>
        <input id="benchName" class="experiment-input" type="text"
               placeholder="${esc(t('bench.field.namePlaceholder'))}" />
      </div>
      <div class="experiment-row experiment-actions">
        <button id="benchCapture" class="ui-button">${esc(t('bench.action.capture'))}</button>
        <button id="benchRestore" class="ui-button" disabled>${esc(t('bench.action.restore'))}</button>
      </div>
      <p id="benchStart" class="experiment-note" hidden></p>

      <details id="benchSelection" class="experiment-section">
        <summary>${esc(t('bench.section.selection'))}</summary>
        <p class="experiment-hint">${esc(t('bench.hint.selection'))}</p>
        <div id="benchBodies" class="experiment-chips"></div>
        <div class="experiment-row">
          <label class="experiment-label" for="benchPrimary">${esc(t('bench.field.primary'))}</label>
          <select id="benchPrimary" class="experiment-input"></select>
        </div>
        <div id="benchMetrics" class="experiment-metrics"></div>
      </details>

      <details id="benchPerturbSection" class="experiment-section">
        <summary>${esc(t('bench.section.perturb'))}</summary>
        <p class="experiment-hint">${esc(t('bench.hint.perturb'))}</p>
        <div class="experiment-row">
          <select id="benchPerturbBody" class="experiment-input"></select>
          <select id="benchPerturbAxis" class="experiment-input">
            <option value="x">${esc(t('bench.axis.x'))}</option>
            <option value="y">${esc(t('bench.axis.y'))}</option>
            <option value="vx">${esc(t('bench.axis.vx'))}</option>
            <option value="vy">${esc(t('bench.axis.vy'))}</option>
          </select>
        </div>
        <div class="experiment-row">
          <label class="experiment-label" for="benchPerturbAmount">${esc(t('bench.field.amount'))}</label>
          <input id="benchPerturbAmount" class="experiment-input" type="number"
                 value="1500" step="any" />
          <button id="benchPerturbApply" class="ui-button">${esc(t('bench.action.perturb'))}</button>
        </div>
        <p id="benchPerturbState" class="experiment-note" hidden></p>
      </details>

      <div class="experiment-runs">
        <div class="experiment-run" data-run="A">
          <span class="experiment-run-label">${esc(t('bench.run.a'))}</span>
          <span id="benchRunA" class="experiment-run-state">${esc(t('bench.run.empty'))}</span>
          <button id="benchRecordA" class="ui-button" disabled>${esc(t('bench.action.record'))}</button>
        </div>
        <div class="experiment-run" data-run="B">
          <span class="experiment-run-label">${esc(t('bench.run.b'))}</span>
          <span id="benchRunB" class="experiment-run-state">${esc(t('bench.run.empty'))}</span>
          <button id="benchRecordB" class="ui-button" disabled>${esc(t('bench.action.record'))}</button>
        </div>
      </div>

      <div id="benchWarnings" class="experiment-warnings" role="status" aria-live="polite"></div>
      <div id="benchDiff" class="experiment-diff" hidden></div>

      <div id="benchChartWrap" class="experiment-chart" hidden>
        <div class="experiment-row">
          <label class="experiment-label" for="benchChartMetric">${esc(t('bench.field.chart'))}</label>
          <select id="benchChartMetric" class="experiment-input"></select>
        </div>
        <canvas id="benchChart" height="150" aria-label="${esc(t('bench.chart.label'))}"></canvas>
      </div>

      <div id="benchResults" class="experiment-results"></div>

      <div class="experiment-row experiment-actions">
        <button id="benchControl" class="ui-button" disabled>${esc(t('bench.action.asControl'))}</button>
      </div>
      <div id="benchControls" class="experiment-controls-list"></div>

      <details class="experiment-section" id="benchChaosSection" hidden>
        <summary>${esc(t('bench.chaos.title'))}</summary>
        <p class="experiment-hint">${esc(t('bench.chaos.hint'))}</p>
        <div class="experiment-row experiment-actions">
          <button id="benchChaosRun" class="ui-button">${esc(t('bench.chaos.run'))}</button>
          <button id="benchChaosSame" class="ui-button">${esc(t('bench.chaos.runSame'))}</button>
          <button id="benchChaosCancel" class="ui-button" hidden>${esc(t('bench.chaos.cancel'))}</button>
        </div>
        <div class="experiment-row">
          <label class="experiment-label" for="benchChaosControlPick">${esc(t('bench.chaos.control'))}</label>
          <select id="benchChaosControlPick" class="experiment-input">
            <option value="finerStep">${esc(t('bench.chaos.control.finerStep'))}</option>
            <option value="altIntegrator">${esc(t('bench.chaos.control.altIntegrator'))}</option>
          </select>
          <button id="benchChaosControl" class="ui-button" disabled>${esc(t('bench.chaos.runControl'))}</button>
        </div>
        <p id="benchChaosStatus" class="experiment-hint" role="status" aria-live="polite"></p>
        <div id="benchChaosReport" class="experiment-results"></div>
        <div class="experiment-row experiment-actions">
          <button id="benchChaosKeep" class="ui-button" disabled>${esc(t('nb.action.save'))}</button>
        </div>
      </details>

      <details class="experiment-section" id="benchSweepSection">
        <summary>${esc(t('sweep.title'))}</summary>
        <p class="experiment-hint">${esc(t('sweep.hint'))}</p>

        <div class="experiment-row">
          <label class="experiment-label" for="benchSweepScenario">${esc(t('sweep.scenario'))}</label>
          <select id="benchSweepScenario" class="experiment-input"></select>
        </div>
        <div class="experiment-row">
          <label class="experiment-label" for="benchSweepParam">${esc(t('sweep.parameter'))}</label>
          <select id="benchSweepParam" class="experiment-input"></select>
        </div>
        <div class="experiment-row">
          <label class="experiment-label" for="benchSweepFrom">${esc(t('sweep.from'))}</label>
          <input id="benchSweepFrom" class="experiment-input" type="number" step="any" />
          <label class="experiment-label" for="benchSweepTo">${esc(t('sweep.to'))}</label>
          <input id="benchSweepTo" class="experiment-input" type="number" step="any" />
        </div>
        <p id="benchSweepRange" class="experiment-hint"></p>
        <div class="experiment-row">
          <label class="experiment-label" for="benchSweepCount">${esc(t('sweep.count'))}</label>
          <input id="benchSweepCount" class="experiment-input" type="number" min="3" max="20" step="1" value="8" />
          <label class="experiment-label" for="benchSweepDuration">${esc(t('sweep.duration'))}</label>
          <input id="benchSweepDuration" class="experiment-input" type="number" step="any" value="10000" />
        </div>

        <div class="experiment-row experiment-actions">
          <button id="benchSweepRun" class="ui-button">${esc(t('sweep.run'))}</button>
          <button id="benchSweepCancel" class="ui-button" hidden>${esc(t('sweep.cancel'))}</button>
          <button id="benchSweepExport" class="ui-button" disabled>${esc(t('sweep.export'))}</button>
          <button id="benchSweepNotebook" class="ui-button" disabled>${esc(t('nb.action.save'))}</button>
        </div>
        <p id="benchSweepStatus" class="experiment-hint" role="status" aria-live="polite"></p>

        <div id="benchSweepChartWrap" class="experiment-chart" hidden>
          <div class="experiment-row">
            <label class="experiment-label" for="benchSweepMetric">${esc(t('bench.field.chart'))}</label>
            <select id="benchSweepMetric" class="experiment-input"></select>
          </div>
          <canvas id="benchSweepChart" height="150" aria-label="${esc(t('sweep.title'))}"></canvas>
        </div>
        <div id="benchSweepResults" class="experiment-results"></div>

        <details class="experiment-section" id="benchSweepGuide">
          <summary>${esc(t('sweep.guided'))}</summary>
          <p class="experiment-note"><strong>${esc(t('sweep.guide.title'))}</strong></p>
          <p class="experiment-hint">${esc(t('sweep.guide.body'))}</p>
          <div class="experiment-row experiment-actions">
            <button id="benchSweepGuided" class="ui-button">${esc(t('sweep.guide.run'))}</button>
          </div>
          <p class="experiment-hint">${esc(t('sweep.guide.after'))}</p>
        </details>
      </details>

      <details class="experiment-section" id="benchReliabilitySection">
        <summary>${esc(t('reliability.title'))}</summary>
        <p class="experiment-hint">${esc(t('reliability.hint'))}</p>
        <div class="experiment-row experiment-actions">
          <button id="benchReliabilityRun" class="ui-button" disabled>${esc(t('reliability.run'))}</button>
          <button id="benchReliabilityCancel" class="ui-button" hidden>${esc(t('reliability.cancel'))}</button>
          <button id="benchReliabilityExport" class="ui-button" disabled>${esc(t('reliability.export'))}</button>
          <button id="benchReliabilityNotebook" class="ui-button" disabled>${esc(t('nb.action.save'))}</button>
        </div>
        <p id="benchReliabilityStatus" class="experiment-hint" role="status" aria-live="polite"></p>
        <div id="benchReliabilityReport" class="experiment-results"></div>
      </details>

      <div class="experiment-row experiment-actions">
        <button id="benchExportCsv" class="ui-button" disabled>${esc(t('bench.action.csv'))}</button>
        <button id="benchExportJson" class="ui-button" disabled>${esc(t('bench.action.json'))}</button>
        <button id="benchNotebook" class="ui-button" disabled>${esc(t('nb.action.save'))}</button>
        <button id="benchShare" class="ui-button" disabled>${esc(t('bench.action.share'))}</button>
      </div>
      <div class="experiment-row experiment-actions">
        <button id="benchDuplicate" class="ui-button" disabled>${esc(t('bench.action.duplicate'))}</button>
        <label class="ui-button experiment-file">
          ${esc(t('bench.action.import'))}
          <input id="benchImport" type="file" accept="application/json,.json" hidden />
        </label>
      </div>

      <details class="experiment-section">
        <summary>${esc(t('bench.section.saved'))}</summary>
        <div id="benchSaved" class="experiment-saved"></div>
        <p id="benchQuota" class="experiment-hint"></p>
      </details>
    </div>
  `;
  document.body.appendChild(root);
  wire();
  // Registered once for the life of the module, not once per panel. This used
  // to live here and rebuild the panel, which called ensurePanel() again and
  // subscribed again - so every language change doubled the listener count,
  // and the rebuild happened inside the notification that triggered it.
  subscribeToLocaleOnce();
  return root;
}

/** Whether the locale subscription below has been made. */
let localeSubscribed = false;

/**
 * Rebuild the panel when the language changes, once.
 *
 * Rebuilding is simpler and less error-prone than re-translating in place, and
 * a language change is rare enough that redrawing one panel is free. What is
 * not free is subscribing again while doing it.
 *
 * @returns {void}
 */
function subscribeToLocaleOnce() {
  if (localeSubscribed) return;
  localeSubscribed = true;
  onLocaleChange(() => {
    if (!root) return;
    const wasOpen = isOpen();
    root.remove();
    root = null;
    if (wasOpen) {
      ensurePanel();
      openPanel();
    }
  });
}

/** Escape text for the one place this file interpolates into HTML. */
function esc(s) {
  return String(s ?? '').replace(
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
}

const $ = id => root?.querySelector(`#${id}`);

// --- Open and close -----------------------------------------------------------

/** @returns {boolean} Whether the panel is showing */
export function isOpen() {
  return Boolean(root) && root.style.display !== 'none';
}

/** Show the panel and take a place in the instrument stack. */
export function openPanel() {
  ensurePanel();
  root.style.display = 'flex';
  // The lesson stylesheet needs to know the bench is up: during an
  // investigation it shares a column with the step's own tool panel, and the
  // two only fit if the one above gives up some height.
  document.body.classList.add('bench-open');
  noteObservationPanelUsed(PANEL_ID);
  requestObservationLayout();
  render();
}

/** Hide the panel. */
export function closePanel() {
  if (!root) return;
  root.style.display = 'none';
  document.body.classList.remove('bench-open');
  requestObservationLayout();
}

/** Toggle the panel. @returns {boolean} Whether it is now open */
export function togglePanel() {
  if (isOpen()) {
    closePanel();
    return false;
  }
  openPanel();
  return true;
}

// --- Rendering -------------------------------------------------------------------

/** Redraw every part of the panel from the experiment's state. */
export function render() {
  if (!root) return;
  const exp = bench.activeExperiment();
  const recording = bench.isRecording();

  $('benchName').value = exp?.name || '';
  $('benchCapture').disabled = recording;
  $('benchRestore').disabled = !exp || recording;
  $('benchSave').disabled = !exp || recording;
  $('benchDuplicate').disabled = !exp || recording;

  const start = $('benchStart');
  if (exp) {
    start.hidden = false;
    start.textContent = t('bench.start.captured', {
      scenario: exp.provenance.scenario,
      seed: exp.provenance.seed,
      hash: exp.provenance.initialStateHash,
    });
  } else {
    start.hidden = true;
  }

  renderBodies(exp);
  renderMetrics(exp);
  renderPerturbation(exp);
  renderControls(exp);
  renderChaosPair();
  renderSweepControls();
  renderSweepResults();
  renderReliability(exp, recording);
  renderRuns(exp, recording);
  renderComparison(exp);
  renderSaved();
  renderStatus(exp, recording);
}

function renderBodies(exp) {
  const wrap = $('benchBodies');
  if (!wrap) return;
  const bodies = exp ? bench.selectableBodies() : [];
  const chosen = new Set(exp?.objects || []);
  wrap.innerHTML = '';
  for (const b of bodies.slice(0, 60)) {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'experiment-chip';
    chip.dataset.id = String(b.id);
    chip.setAttribute('aria-pressed', chosen.has(b.id) ? 'true' : 'false');
    chip.textContent = b.name || `#${b.id}`;
    chip.onclick = () => {
      const set = new Set(exp.objects || []);
      if (set.has(b.id)) set.delete(b.id);
      else set.add(b.id);
      exp.objects = [...set];
      if (exp.primary === null && exp.objects.length) {
        exp.primary = heaviest(bodies)?.id ?? null;
      }
      render();
    };
    wrap.appendChild(chip);
  }
  if (!bodies.length) {
    wrap.textContent = t('bench.hint.noBodies');
  }

  const primary = $('benchPrimary');
  primary.innerHTML = `<option value="">${esc(t('bench.primary.none'))}</option>`;
  for (const b of bodies.slice(0, 60)) {
    const opt = document.createElement('option');
    opt.value = String(b.id);
    opt.textContent = b.name || `#${b.id}`;
    if (exp?.primary === b.id) opt.selected = true;
    primary.appendChild(opt);
  }
  primary.onchange = () => {
    if (!exp) return;
    exp.primary = primary.value === '' ? null : Number(primary.value);
  };
}

function heaviest(bodies) {
  return bodies.reduce((a, b) => (!a || b.mass > a.mass ? b : a), null);
}

function renderMetrics(exp) {
  const wrap = $('benchMetrics');
  if (!wrap) return;
  const chosen = new Set(exp?.metrics || []);
  const n = (exp?.objects || []).length;
  wrap.innerHTML = '';
  for (const id of OFFERED_METRICS) {
    const need = METRIC_ARITY[id] || 0;
    const label = document.createElement('label');
    label.className = 'experiment-metric';
    const box = document.createElement('input');
    box.type = 'checkbox';
    box.checked = chosen.has(id);
    box.disabled = !exp || need > n;
    box.onchange = () => {
      const set = new Set(exp.metrics || []);
      if (box.checked) set.add(id);
      else set.delete(id);
      exp.metrics = OFFERED_METRICS.filter(m => set.has(m));
      render();
    };
    label.appendChild(box);
    const text = document.createElement('span');
    text.textContent = `${bench.metricLabel(id)} (${bench.metricUnit(id)})`;
    label.appendChild(text);
    if (need > n) {
      label.title = t('bench.metric.needs', { n: need });
      label.classList.add('is-unavailable');
    }
    wrap.appendChild(label);
  }
}

/**
 * The perturbation controls.
 *
 * A perturbation is not a settings change, so the bench's parameter diff
 * cannot see it: it is one number inside the captured state. Applying it here
 * rewrites the captured start, so Run B is restored to a state that differs
 * from Run A's by exactly that number and by nothing else - which is what the
 * chaos investigation needs and what makes the change reportable afterwards.
 */
function renderPerturbation(exp) {
  const section = $('benchPerturbSection');
  if (!section) return;
  const bodySelect = $('benchPerturbBody');
  const stateLine = $('benchPerturbState');
  const bodies = exp?.initialState?.b || [];

  if (bodySelect.options.length !== bodies.length) {
    bodySelect.innerHTML = '';
    for (const b of bodies) {
      const opt = document.createElement('option');
      opt.value = String(b.id);
      opt.textContent = b.name || `#${b.id}`;
      bodySelect.appendChild(opt);
    }
  }
  $('benchPerturbApply').disabled = !exp || !bodies.length;

  if (exp?.perturbation) {
    const applied = exp.perturbation;
    const described = describePerturbation(
      applied,
      systemExtent(exp.initialState)
    );
    stateLine.hidden = false;
    stateLine.textContent = t('bench.perturb.applied', {
      body: applied.bodyName,
      axis: described.axisLabel,
      km: Math.abs(described.km).toPrecision(4),
      fraction: described.fraction ? described.fraction.toExponential(1) : '—',
    });
  } else {
    stateLine.hidden = true;
  }
}

/** The numerical controls recorded so far. */
function renderControls(exp) {
  const wrap = $('benchControls');
  const button = $('benchControl');
  if (!wrap || !button) return;
  const ready = Boolean(exp?.runs?.A && exp?.runs?.B);
  button.disabled = !ready;
  wrap.innerHTML = '';
  for (const c of exp?.numericalControls || []) {
    const row = document.createElement('div');
    row.className = 'experiment-note';
    row.textContent = t('bench.control.row', {
      label: c.label,
      tau: Number.isFinite(c.tau) ? c.tau.toFixed(1) : '—',
      behaviour: c.behaviour,
    });
    wrap.appendChild(row);
  }
}

/**
 * The sweep controls, and the results when there are some.
 *
 * The scenario and parameter pickers are populated from the allowlist rather
 * than from the settings object, so an unsweepable parameter is not offered
 * and then refused. The range hint under them is the parameter's own bounds,
 * shown before the reader types rather than after.
 *
 * @returns {void}
 */
// =============================================================================
// The chaos lesson's controlled pair
// -----------------------------------------------------------------------------
// Nine manual steps, replaced by two buttons and nothing else. What the lesson
// still asks a student to do is unchanged: predict first, press the button,
// read the divergence instrument, and say what the evidence supports. What it
// no longer asks them to do is assemble the apparatus, which taught nothing and
// which they could get subtly wrong - two runs of different lengths, or a Run A
// that began wherever the simulation had drifted to while they read the
// instructions.
//
// Everything here runs on the bench's own capture, restore, perturbation and
// recording. The two things it adds are the two the lesson needs and the bench
// cannot supply: both runs over the same simulated interval, and the step the
// engine actually took rather than the one the settings imply.
// =============================================================================

/** Set while the pair or a control is running. */
let chaosRunning = false;
/** Asked to stop. */
let chaosCancelled = false;
/** The last pair, as the lesson reports it. */
let chaosPairResult = null;
/**
 * Every numerical control recorded against the current pair.
 *
 * Kept here rather than only on the bench experiment, because a control is a
 * repeat and a repeat captures a fresh start - which gives the experiment a
 * fresh, empty list of controls. Holding them here is what makes the second
 * control the second control rather than the only one, and they are pushed
 * back onto each new capture so the export carries them too.
 */
let chaosControls = [];

/** @returns {boolean} Whether the chaos pair is running */
export const isChaosPairRunning = () => chaosRunning;

/** What the section is holding, for the lesson, the notebook and the tests. */
export function chaosPairReport() {
  return chaosPairResult ? JSON.parse(JSON.stringify(chaosPairResult)) : null;
}

/** For the lesson and the tests. @param {object} [opts] - `control` @returns {Promise<void>} */
export const startChaosPair = opts => runChaosPair(opts);

/** Ask a run in progress to stop after the arm it is on. */
export function cancelChaosPair() {
  if (chaosRunning) chaosCancelled = true;
}

/** @returns {?object} Which configuration this scenario is, if any */
function chaosConfigFor(scenario) {
  for (const [key, cfg] of Object.entries(CHAOS.CONFIGURATIONS)) {
    if (cfg.scenario === scenario) return { key, ...cfg };
  }
  return null;
}

/**
 * Record every step the engine takes, until told to stop.
 *
 * The whole point of the numerical control, and the one thing the settings
 * cannot be asked for: js/timestep.js splits a frame into at most MAX_SUBSTEPS
 * pieces no larger than max_timestep, so which knob binds depends on the
 * scenario and the frame rate. What actually happened is what the steps say.
 *
 * @returns {{stop: Function}} Call stop() to finish and get the statistics
 */
function watchSteps() {
  const dts = [];
  const off = onPhysicsStep(dt => dts.push(dt));
  return {
    stop() {
      off?.();
      return CHAOS.stepStatistics(dts);
    },
  };
}

/**
 * Run one arm for a fixed stretch of simulated time.
 *
 * @param {object} spec - label, span, and whether to perturb first
 * @returns {Promise<?object>} What the arm did
 */
async function runChaosArm({ label, span, perturb }) {
  bench.restoreInitialState({ keepSettings: true });
  if (perturb) {
    const applied = bench.applyPerturbation(perturb);
    if (!applied.ok) return null;
  }
  const startClock = getSimClock();
  const steps = watchSteps();
  if (!bench.startRun(label)) {
    steps.stop();
    return null;
  }
  await new Promise(resolve => {
    const tick = () => {
      if (chaosCancelled) return resolve();
      if (getSimClock() - startClock >= span) return resolve();
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  const stats = steps.stop();
  const run = bench.stopRun();
  return {
    label,
    // Simulated seconds the recorder saw, which is the axis the divergence
    // analysis is drawn on - not the same thing as the frames it took.
    span: run ? run.samples[run.samples.length - 1]?.t - run.samples[0]?.t : 0,
    asked: span,
    samples: run?.samples?.length ?? 0,
    ...stats,
    integrator: SETTINGS.integrator,
    maxTimestep: SETTINGS.max_timestep,
    simSpeed: SETTINGS.sim_speed,
  };
}

/**
 * Set the apparatus up and run both arms.
 *
 * @param {object} [opts] - `control`, the id of a numerical control to apply,
 *   and `nudge`, false for the reproducibility control that changes nothing
 * @returns {Promise<void>}
 */
async function runChaosPair(opts = {}) {
  if (chaosRunning) return;
  const scenario = bench.currentScenarioName();
  const cfg = chaosConfigFor(scenario);
  const status = $('benchChaosStatus');
  if (!cfg) {
    if (status) status.textContent = t('bench.chaos.wrongScenario');
    return;
  }

  // Somebody else's work stays where it is. The bench holds one experiment at
  // a time, so setting up here would discard whatever is in it; a reader with
  // recorded runs of their own is told rather than overwritten.
  const held = bench.activeExperiment();
  const ours = held?.name === t(`bench.chaos.name.${cfg.key}`);
  if (held && !ours && (held.runs?.A || held.runs?.B)) {
    if (status) {
      status.textContent = t('bench.chaos.benchBusy', { name: held.name });
    }
    return;
  }

  const control = opts.control
    ? CHAOS.CONTROLS.find(c => c.id === opts.control)
    : null;
  if (opts.control && !control) return;
  const nudge = opts.nudge !== false;

  chaosRunning = true;
  chaosCancelled = false;
  for (const id of [
    'benchChaosRun',
    'benchChaosSame',
    'benchChaosControl',
    'benchChaosKeep',
  ]) {
    if ($(id)) $(id).disabled = true;
  }
  if ($('benchChaosCancel')) $('benchChaosCancel').hidden = false;

  // Everything the run is about to change, put back whatever happens - a
  // throw, or a reader pressing Stop halfway through arm B.
  const savedSettings = { ...SETTINGS };
  const savedPaused = state.paused;
  let result = null;
  let hurried = null;

  try {
    if (control) applyChaosControl(control, chaosPairResult?.a ?? null);
    // Pin the step, then hurry the playback.
    //
    // The span is stated in simulated time, and how many animation frames that
    // takes is the reader's playback speed - which is not a property of the
    // experiment. Four orbits of the Binary Pair at its own speed is thirty
    // thousand frames and ten minutes of waiting.
    //
    // The fix must not change the arithmetic. The engine splits a frame's
    // advance into pieces no larger than max_timestep, up to a ceiling, so
    // pinning the cap to what the step is ALREADY and then advancing more per
    // frame gives more pieces of the same size: the same calculation, in
    // fewer frames. Where a smaller cap is already in force - a numerical
    // control has just halved one - it is kept.
    hurried = pinStepAndHurry();
    // A fresh pair is a fresh question: the controls recorded against the
    // previous one were about a measurement that no longer exists.
    if (!control) chaosControls = [];

    bench.captureExperiment(t(`bench.chaos.name.${cfg.key}`));
    bench.setRecordBodies(true);
    for (const c of chaosControls) bench.addNumericalControl(c);
    const exp = bench.activeExperiment();
    // The bodies the divergence measure is about, and the quantities the
    // lesson reads. Chosen here rather than by the student, because choosing
    // them is apparatus rather than physics.
    const bodies = bench.selectableBodies();
    exp.objects = bodies.map(b => b.id);
    exp.primary = bodies[0]?.id ?? null;
    exp.metrics = ['separation', 'total_energy'];

    const span = chaosSpanFor(cfg, bodies);
    if (!(span > 0)) throw new Error('no span');

    if (status) status.textContent = t('bench.chaos.running', { arm: 'A' });
    const a = await runChaosArm({ label: 'A', span, perturb: null });

    let b = null;
    if (!chaosCancelled) {
      if (status) status.textContent = t('bench.chaos.running', { arm: 'B' });
      // The reproducibility control changes nothing at all, which is the one
      // case where "what changed between the runs" should have nothing in it.
      const target =
        bodies.find(x => x.name === cfg.body) ?? bodies[bodies.length - 1];
      b = await runChaosArm({
        label: 'B',
        span,
        perturb:
          nudge && target
            ? { bodyId: target.id, axis: cfg.axis, km: cfg.km }
            : null,
      });
    }

    const { separationSeries, analyseDivergence } =
      await import('../chaos/divergence.js');
    const shape = run =>
      (run?.samples || [])
        .filter(sm => Array.isArray(sm.__bodies))
        .map(sm => ({ t: sm.t, bodies: sm.__bodies }));
    const runs = bench.activeExperiment()?.runs || {};
    const both = shape(runs.A).length && shape(runs.B).length;
    const verdict = both
      ? analyseDivergence(separationSeries(shape(runs.A), shape(runs.B)).series)
      : null;

    result = {
      configuration: cfg.key,
      scenario,
      nudged: nudge,
      hurried,
      a,
      b,
      interval: CHAOS.sameInterval(a, b),
      perturbation: bench.activeExperiment()?.perturbation ?? null,
      diff: bench.activeExperiment()?.diff ?? null,
      verdict,
      cancelled: chaosCancelled,
      ranAt: new Date().toISOString(),
      control: control?.id ?? null,
    };

    // A control is filed beside the main result rather than replacing it, and
    // it is labelled with the step the engine actually took.
    if (control && verdict && a) {
      const baseline = chaosPairResult?.a ?? null;
      const differs = CHAOS.controlDiffers(baseline, a);
      chaosControls = [
        ...chaosControls.filter(c => c.label !== CHAOS.controlLabel(a)),
        {
          label: CHAOS.controlLabel(a),
          tau: verdict.tau,
          behaviour: verdict.behaviour,
          differs: differs.differs,
          stepChange: differs.stepChange,
          schemeChanged: differs.schemeChanged,
        },
      ];
      for (const c of chaosControls) bench.addNumericalControl(c);
      result.controlDiff = differs;
      // A control repeats the measurement; it does not replace it. The pair
      // on screen stays the one the lesson measured, and the repeat is filed
      // beside it.
      result.a = baseline ?? a;
      result.b = chaosPairResult?.b ?? b;
      result.verdict = chaosPairResult?.verdict ?? verdict;
      result.perturbation =
        chaosPairResult?.perturbation ?? result.perturbation;
      result.interval = chaosPairResult?.interval ?? result.interval;
      result.series = chaosPairResult?.series ?? null;
    }
    result.controls = [...chaosControls];
    result.refinement = CHAOS.refinementReport(result.controls);
    // The separation itself, thinned, so the notebook can draw the curve the
    // instrument drew rather than a description of it.
    if (both && !control) {
      const full = separationSeries(shape(runs.A), shape(runs.B)).series;
      const stride = Math.max(1, Math.ceil(full.length / 300));
      result.series = full.filter((_, i) => i % stride === 0);
    }
  } catch (err) {
    console.warn('[bench] the chaos pair did not finish:', err);
  } finally {
    try {
      bench.restoreInitialState({ keepSettings: true });
    } catch (err) {
      console.warn('[bench] could not restore after the chaos pair:', err);
    }
    Object.assign(SETTINGS, savedSettings);
    updatePhysicsSettings(SETTINGS);
    state.paused = savedPaused;
    chaosRunning = false;
    for (const id of ['benchChaosRun', 'benchChaosSame', 'benchChaosControl']) {
      if ($(id)) $(id).disabled = false;
    }
    if ($('benchChaosCancel')) $('benchChaosCancel').hidden = true;
  }

  if (result) chaosPairResult = result;
  render();
}

/**
 * How long both arms run for, in simulated time.
 *
 * Stated in the units the configuration thinks in - orbits for the binary,
 * seconds for the triangle, which has no orbit to count once it comes apart -
 * and converted here so both arms are asked for one number.
 *
 * @param {object} cfg - From CONFIGURATIONS
 * @param {Array} bodies - The world's selectable bodies
 * @returns {number} Simulated time units
 */
function chaosSpanFor(cfg, bodies) {
  if (Number.isFinite(cfg.seconds)) return cfg.seconds;
  if (!Number.isFinite(cfg.orbits) || bodies.length < 2) return 0;
  const [p, q] = bodies;
  const a = Math.hypot(p.pos.x - q.pos.x, p.pos.y - q.pos.y);
  const n = Math.sqrt(
    (SETTINGS.gravitational_constant * (p.mass + q.mass)) / a ** 3
  );
  return n > 0 ? (cfg.orbits * 2 * Math.PI) / n : 0;
}

/**
 * How many times faster than the reader's own playback the arms are watched.
 *
 * Sixteen, and the ceiling is arithmetic rather than taste: js/timestep.js
 * splits a frame into at most 64 pieces, and a numerical control may have
 * already halved the piece size, so sixteen leaves a factor of two in hand.
 */
const HURRY = 16;

/**
 * Pin the integration step to what it already is, then advance faster.
 *
 * @returns {?object} What was pinned and by how much, for the record
 */
function pinStepAndHurry() {
  const natural = frameAdvance(1 / 60, SETTINGS.sim_speed, DT);
  if (!(natural > 0)) return null;
  const cap =
    SETTINGS.max_timestep > 0
      ? Math.min(SETTINGS.max_timestep, natural)
      : natural;
  const before = { step: SETTINGS.max_timestep, simSpeed: SETTINGS.sim_speed };
  SETTINGS.max_timestep = cap;
  SETTINGS.sim_speed = SETTINGS.sim_speed * HURRY;
  updatePhysicsSettings(SETTINGS);
  return { ...before, pinnedStep: cap, factor: HURRY };
}

/**
 * Apply one numerical control to the live settings.
 *
 * @param {object} control - From CONTROLS
 * @returns {void}
 */
function applyChaosControl(control, baseline) {
  const settings = SETTINGS;
  if (control.setting === 'max_timestep') {
    // Halve the step that was actually taken, not the setting.
    //
    // Two scenarios in this lesson, and the setting is the wrong lever in one
    // of them: the Three-Body Sensitivity Lab ships max_timestep = 0, which
    // means "do not cap", and half of nothing is nothing. Measured, the step
    // it takes is a twelfth of a second, so the cap goes there instead - and
    // where a real cap is already in force, halving it does what it says.
    const measured = baseline?.mean;
    const capped = settings.max_timestep > 0;
    const from =
      capped &&
      (!Number.isFinite(measured) || settings.max_timestep <= measured)
        ? settings.max_timestep
        : measured;
    if (Number.isFinite(from) && from > 0) {
      settings.max_timestep = from * control.factor;
    }
  } else if (control.setting === 'integrator') {
    const next = CHAOS.alternateIntegrator(settings.integrator);
    if (next) settings.integrator = next;
  }
  updatePhysicsSettings(settings);
}

/** Draw the chaos section: what ran, over what, and whether it is resolved. */
function renderChaosPair() {
  const section = $('benchChaosSection');
  if (!section) return;
  const cfg = chaosConfigFor(bench.currentScenarioName());
  section.hidden = !cfg;
  if (!cfg) return;

  const keep = $('benchChaosKeep');
  if (keep) keep.disabled = chaosRunning || !chaosPairResult;
  const control = $('benchChaosControl');
  if (control) control.disabled = chaosRunning || !chaosPairResult;

  const wrap = $('benchChaosReport');
  if (!wrap) return;
  wrap.innerHTML = '';
  const r = chaosPairResult;
  if (!r) return;

  const line = (text, cls = 'experiment-note') => {
    const el = document.createElement('p');
    el.className = cls;
    el.textContent = text;
    wrap.appendChild(el);
  };

  // What changed between the runs, said plainly and first. The bench's own
  // parameter diff cannot see a perturbation - it is a coordinate inside the
  // captured state, not a setting - so both are reported.
  if (r.perturbation) {
    line(
      t('bench.chaos.changed', {
        body: r.perturbation.bodyName || r.perturbation.bodyId,
        axis: r.perturbation.axis,
        km: num(r.perturbation.km),
      })
    );
  } else if (r.nudged === false) {
    line(t('bench.chaos.changedNothing'));
  }
  const settingsChanged = (r.diff?.variables || []).map(v => v.key).join(', ');
  line(
    settingsChanged
      ? t('bench.chaos.settingsChanged', { keys: settingsChanged })
      : t('bench.chaos.settingsSame')
  );

  // Both intervals, because the fit is over their overlap.
  if (r.a && r.b) {
    line(
      t('bench.chaos.intervals', {
        a: num(r.a.span),
        b: num(r.b.span),
        asked: num(r.a.asked),
      }),
      r.interval?.ok ? 'experiment-note' : 'experiment-warning'
    );
    // The step the engine took, measured. Not the setting, and not the
    // playback speed: what the integrator did.
    line(
      t('bench.chaos.steps', {
        mean: num(r.a.mean, 4),
        min: num(r.a.min, 4),
        max: num(r.a.max, 4),
        n: r.a.steps ?? 0,
        integrator: r.a.integrator,
      }),
      'experiment-hint'
    );
  }

  // The divergence itself. The lesson's evidence, and not a reliability score:
  // an e-folding time with the interval it was fitted over, or the reason
  // there is not one.
  if (r.verdict) {
    line(
      r.verdict.behaviour === 'exponential'
        ? t('bench.chaos.exponential', {
            tau: num(r.verdict.tau, 3),
            r2: num(r.verdict.r2, 3),
            from: num(r.verdict.window?.from),
            to: num(r.verdict.window?.to),
          })
        : r.verdict.behaviour === 'insufficient'
          ? t(`chaosW.reject.${r.verdict.reason || 'insufficient'}`)
          : t(`chaosW.verdict.${r.verdict.behaviour}`, {
              tau: num(r.verdict.tau, 3),
              r2: num(r.verdict.r2, 3),
            }),
      'experiment-note'
    );
  }

  // And whether it survived being computed differently.
  const report = CHAOS.refinementReport(r.controls || []);
  line(
    report.resolved
      ? t('bench.chaos.resolved', {
          n: report.effective,
          spread: num((report.spread ?? 0) * 100, 2),
        })
      : t(`bench.chaos.unresolved.${report.reason || 'need-two-estimates'}`, {
          n: report.effective,
          spread: num((report.spread ?? 0) * 100, 2),
        }),
    report.resolved ? 'experiment-note' : 'experiment-warning'
  );
  if (r.cancelled) line(t('bench.chaos.cancelled'), 'experiment-warning');
}

function renderSweepControls() {
  const scenarioSel = $('benchSweepScenario');
  const paramSel = $('benchSweepParam');
  if (!scenarioSel || !paramSel) return;

  if (!scenarioSel.options.length) {
    for (const name of sweepableScenarios()) {
      const opt = document.createElement('option');
      opt.value = name;
      opt.textContent = name;
      scenarioSel.appendChild(opt);
    }
    // Open on the scenario that is loaded, when it is one that can be swept.
    const live = bench.currentScenarioName?.();
    if (live && SWEEPABLE[live]) scenarioSel.value = live;
  }

  const entry = SWEEPABLE[scenarioSel.value];
  const wanted = entry ? entry.parameters.map(p => p.key).join('|') : '';
  if (paramSel.dataset.forScenario !== wanted) {
    paramSel.dataset.forScenario = wanted;
    paramSel.innerHTML = '';
    for (const p of entry?.parameters || []) {
      const opt = document.createElement('option');
      opt.value = p.key;
      opt.textContent = `${t(p.labelKey)} (${t(p.unitKey)})`;
      paramSel.appendChild(opt);
    }
    fillSweepRange();
  }

  const busy = bench.isSweeping();
  $('benchSweepRun').disabled = busy || bench.isRecording();
  $('benchSweepGuided').disabled = busy || bench.isRecording();
  $('benchSweepCancel').hidden = !busy;
  $('benchSweepExport').disabled = !bench.latestSweep()?.ok;
  $('benchSweepNotebook').disabled = !bench.latestSweep()?.ok;
}

/** Put the selected parameter's own bounds into the range fields and the hint. */
function fillSweepRange() {
  const def = parameterFor(
    $('benchSweepScenario')?.value,
    $('benchSweepParam')?.value
  );
  const hint = $('benchSweepRange');
  if (!def) {
    if (hint) hint.textContent = '';
    return;
  }
  if (hint) {
    hint.textContent = t('sweep.range', { min: def.min, max: def.max });
  }
  // Opened at the parameter's range, or at the positive half where zero is
  // excluded - a default that spans an excluded band would be refused the
  // moment the reader pressed Run.
  const from = def.exclude ? def.exclude.to : def.min;
  $('benchSweepFrom').value = String(from);
  $('benchSweepTo').value = String(def.max);
}

/** The results table, the plot and what the numbers add up to. */
function renderSweepResults() {
  const out = $('benchSweepResults');
  const sweep = bench.latestSweep();
  if (!out) return;
  out.innerHTML = '';
  const wrap = $('benchSweepChartWrap');
  if (wrap) wrap.hidden = !sweep?.ok;
  if (!sweep?.ok) return;

  const add = (text, cls = 'experiment-note') => {
    const el = document.createElement('p');
    el.className = cls;
    el.textContent = text;
    out.appendChild(el);
  };

  // What each measurement did across the range, in words. Modest on purpose:
  // it says the span and whether it turned over, and does not fit anything.
  for (const s of sweep.summaries) {
    const label = bench.metricLabel(s.metric);
    if (!s.changed) {
      add(t('sweep.summary.flat', { metric: label }));
      continue;
    }
    add(
      t('sweep.summary.changed', {
        metric: label,
        min: formatNumber(s.min, { sig: 4 }),
        max: formatNumber(s.max, { sig: 4 }),
      })
    );
    add(
      s.monotonic ? t('sweep.summary.monotonic') : t('sweep.summary.turned'),
      'experiment-hint'
    );
  }

  // A trial that did not measure is a row in the table, and the fact that some
  // did not is said here too: a summary of the values that ran is not a
  // summary of the range that was asked for.
  if (sweep.counts.failed || sweep.counts.cancelled) {
    add(t('sweep.partial'), 'experiment-hint');
  }

  // A trial that ran but covered less than it was asked to is neither a
  // failure nor a result of the experiment on the label. Its numbers are in
  // the table; this is what keeps them out of the summary above without
  // hiding them.
  if (sweep.counts.partial) {
    add(
      t('sweep.incomplete', { count: sweep.counts.partial }),
      'experiment-hint'
    );
  }

  const table = document.createElement('table');
  table.className = 'experiment-table';
  const head = document.createElement('tr');
  for (const label of [
    t('sweep.parameter'),
    ...sweep.metrics.map(m => bench.metricLabel(m)),
    '',
  ]) {
    const th = document.createElement('th');
    th.textContent = label;
    head.appendChild(th);
  }
  table.appendChild(head);

  for (const trial of sweep.trials) {
    const tr = document.createElement('tr');
    tr.dataset.status = trial.status;
    const first = document.createElement('th');
    first.scope = 'row';
    first.textContent = formatNumber(trial.value, { sig: 4 });
    tr.appendChild(first);
    for (const m of sweep.metrics) {
      const td = document.createElement('td');
      const v = trial.results?.[m];
      td.textContent = Number.isFinite(v) ? formatNumber(v, { sig: 4 }) : '—';
      tr.appendChild(td);
    }
    // The status in words on every row, so a dash is never ambiguous between
    // "did not run", "would not build" and "lost a body".
    const why = document.createElement('td');
    why.textContent =
      trial.status === 'ok' ? '' : t(`sweep.status.${trial.status}`);
    tr.appendChild(why);
    table.appendChild(tr);
  }
  out.appendChild(table);

  const n = sweep.numerics;
  add(
    t('sweep.done', {
      ok: sweep.counts.ok,
      total: sweep.counts.total,
      failed: sweep.counts.failed,
      cancelled: sweep.counts.cancelled,
      seconds: (sweep.wallMs / 1000).toFixed(1),
    }),
    'experiment-hint'
  );
  if (n) {
    add(
      t('sweep.settings', {
        seed: sweep.seed,
        integrator: n.integrator,
        substeps: n.substeps,
        step: formatNumber(n.step, { sig: 4 }),
      }),
      'experiment-hint'
    );
  }

  renderSweepChart(sweep);
}

/** The measurement against the parameter. */
async function renderSweepChart(sweep) {
  const picker = $('benchSweepMetric');
  if (!picker) return;
  const plottable = sweep.metrics.filter(m =>
    sweep.trials.some(tr => Number.isFinite(tr.results?.[m]))
  );
  if (!plottable.length) return;

  if (picker.dataset.forSweep !== plottable.join('|')) {
    picker.dataset.forSweep = plottable.join('|');
    picker.innerHTML = '';
    for (const m of plottable) {
      const opt = document.createElement('option');
      opt.value = m;
      opt.textContent = bench.metricLabel(m);
      picker.appendChild(opt);
    }
    picker.onchange = () => renderSweepChart(sweep);
  }
  const metric = picker.value || plottable[0];

  const Chart = await ensureChartJs();
  if (!Chart) return;
  const colors = chartColors();
  // Only the trials that measured. A failed trial is not a zero, and joining
  // the line across it would draw a value nobody observed.
  const points = sweep.trials
    .filter(tr => Number.isFinite(tr.results?.[metric]))
    .map(tr => ({ x: tr.value, y: tr.results[metric] }))
    .sort((a, b) => a.x - b.x);

  const data = {
    datasets: [
      {
        label: bench.metricLabel(metric),
        data: points,
        borderColor: colors.cool,
        backgroundColor: colors.cool,
        borderWidth: 2,
        pointRadius: 3,
        showLine: true,
      },
    ],
  };
  const def = parameterFor(sweep.scenario, sweep.parameter);
  const xTitle = def
    ? `${t(def.labelKey)} (${t(def.unitKey)})`
    : sweep.parameter;

  if (sweepChart) {
    sweepChart.data = data;
    sweepChart.options.scales.x.title.text = xTitle;
    sweepChart.options.scales.y.title.text = bench.metricLabel(metric);
    sweepChart.update('none');
    return;
  }
  sweepChart = new Chart($('benchSweepChart'), {
    type: 'scatter',
    data,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      plugins: { legend: { labels: { color: colors.label } } },
      scales: {
        x: {
          type: 'linear',
          title: { display: true, text: xTitle, color: colors.label },
          ticks: { color: colors.tick, maxTicksLimit: 8 },
          grid: { color: colors.grid },
        },
        y: {
          title: {
            display: true,
            text: bench.metricLabel(metric),
            color: colors.label,
          },
          ticks: { color: colors.tick },
          grid: { color: colors.grid },
        },
      },
    },
  });
}

/**
 * Start a sweep and keep the panel talking while it runs.
 *
 * @param {object} spec - What to sweep
 * @returns {Promise<void>}
 */
async function startSweep(spec) {
  const status = $('benchSweepStatus');
  render();
  const result = await bench.runSweep(spec, {
    onProgress: ({ trial, total, fraction }) => {
      status.textContent = t('sweep.progress', {
        trial: trial + 1,
        total,
        percent: Math.round(fraction * 100),
      });
    },
  });
  status.textContent = result.ok
    ? ''
    : t(`sweep.reason.${result.reason}`, result.detail || {});
  render();
}

/**
 * The reliability check: what it can be asked for, and what it found.
 *
 * The report is deliberately a table of conclusions rather than a badge. Some
 * of what a run measures survives refinement and some does not, and which is
 * which is the whole output; collapsing that to one word would throw away the
 * only thing a reader can act on.
 *
 * @param {?object} exp - The active experiment
 * @param {boolean} recording - Whether a run is being recorded
 * @returns {void}
 */
function renderReliability(exp, recording) {
  const run = $('benchReliabilityRun');
  const cancel = $('benchReliabilityCancel');
  const exportBtn = $('benchReliabilityExport');
  const out = $('benchReliabilityReport');
  if (!run || !out) return;

  const busy = bench.isCheckingReliability();
  run.disabled = !exp || recording || busy || !exp.metrics?.length;
  cancel.hidden = !busy;
  exportBtn.disabled = !exp?.reliability?.ok;
  $('benchReliabilityNotebook').disabled = !exp?.reliability?.ok;

  const report = exp?.reliability;
  out.innerHTML = '';
  if (!report) return;

  if (!report.ok) {
    const line = document.createElement('p');
    line.className = 'experiment-note';
    line.textContent = t(`reliability.reason.${report.reason}`, {
      n: report.substeps ?? '',
    });
    out.appendChild(line);
    return;
  }

  const add = (text, cls = 'experiment-note') => {
    const el = document.createElement('p');
    el.className = cls;
    el.textContent = text;
    out.appendChild(el);
  };

  add(t(report.explanation.headline), 'experiment-verdict');
  for (const note of report.explanation.notes) add(t(note));

  add(
    t('reliability.steps', {
      coarse: num(report.steps.coarse),
      fine: num(report.steps.fine),
    })
  );

  // Per conclusion, because that is the question a reader has. A row says
  // whether refinement moved that particular number, and by how much.
  const table = document.createElement('table');
  table.className = 'experiment-table';
  for (const m of report.metrics) {
    const tr = document.createElement('tr');
    const label = document.createElement('th');
    label.scope = 'row';
    label.textContent = bench.metricLabel(m.metric);
    const value = document.createElement('td');
    value.textContent =
      m.change === null
        ? t('reliability.noValue')
        : m.agrees
          ? t('reliability.agrees', {
              tolerance: `${(report.tolerance * 100).toFixed(1)}%`,
            })
          : t('reliability.moved', {
              change: `${(m.change * 100).toFixed(2)}%`,
            });
    // Marked in the DOM rather than only in the words, so the rows that moved
    // are findable without reading every one.
    tr.dataset.agrees = m.agrees === null ? 'unknown' : String(m.agrees);
    tr.append(label, value);
    table.appendChild(tr);
  }
  out.appendChild(table);

  // What it cost. A convergence check is two extra runs, and a reader deciding
  // whether to run one on a long experiment should be told that up front
  // rather than discovering it.
  add(
    t('reliability.cost', {
      duration: num(report.duration),
      seconds: ((report.cost.wallMs ?? 0) / 1000).toFixed(1),
      coarseSub: report.cost.substeps.coarse,
      fineSub: report.cost.substeps.fine,
    }),
    'experiment-hint'
  );
}

function renderRuns(exp, recording) {
  for (const label of ['A', 'B']) {
    const state = $(`benchRun${label}`);
    const button = $(`benchRecord${label}`);
    const run = exp?.runs?.[label];
    state.textContent = run
      ? t('bench.run.recorded', {
          n: run.samples.length,
          seconds: span(run).toFixed(1),
        })
      : t('bench.run.empty');
    const busy = recording;
    button.disabled = !exp || busy || !(exp.metrics || []).length;
    button.textContent = t('bench.action.record');
    if (busy) button.textContent = t('bench.action.recording');
  }
  const stopping = recording;
  for (const label of ['A', 'B']) {
    const button = $(`benchRecord${label}`);
    if (stopping) {
      button.disabled = false;
      button.textContent = t('bench.action.stop');
    }
  }
}

function span(run) {
  const s = run?.samples;
  if (!Array.isArray(s) || s.length < 2) return 0;
  return s[s.length - 1].t - s[0].t;
}

function renderComparison(exp) {
  const warnings = $('benchWarnings');
  const diffBox = $('benchDiff');
  const results = $('benchResults');
  const chartWrap = $('benchChartWrap');
  warnings.innerHTML = '';
  results.innerHTML = '';

  const ready = exp?.runs?.A && exp?.runs?.B;
  $('benchExportCsv').disabled = !ready;
  $('benchExportJson').disabled = !ready;
  $('benchNotebook').disabled = !ready;
  $('benchShare').disabled = !exp;

  if (!ready) {
    diffBox.hidden = true;
    chartWrap.hidden = true;
    return;
  }

  const comparison = bench.compare();
  if (!comparison) return;

  // What changed between the runs, always shown - a comparison whose
  // independent variable is not stated is not an experiment.
  diffBox.hidden = false;
  const vars = comparison.diff.variables;
  diffBox.innerHTML = '';
  const heading = document.createElement('strong');
  heading.textContent = t('bench.diff.heading');
  diffBox.appendChild(heading);
  const list = document.createElement('div');
  list.className = 'experiment-diff-list';
  list.textContent = vars.length ? describeDiff(vars) : t('bench.diff.none');
  diffBox.appendChild(list);
  if (comparison.diff.incidental.length) {
    const inc = document.createElement('div');
    inc.className = 'experiment-diff-incidental';
    inc.textContent = t('bench.diff.incidental', {
      list: comparison.diff.incidental.map(v => v.key).join(', '),
    });
    diffBox.appendChild(inc);
  }

  for (const w of comparison.warnings) {
    const el = document.createElement('p');
    el.className = `experiment-warning is-${w.level}`;
    el.textContent = w.message;
    warnings.appendChild(el);
  }
  if (comparison.diff.multivariable && !exp.multivariableConfirmed) {
    const confirm = document.createElement('button');
    confirm.type = 'button';
    confirm.className = 'ui-button';
    confirm.textContent = t('bench.action.confirmMultivariable');
    confirm.onclick = () => {
      exp.multivariableConfirmed = true;
      render();
    };
    warnings.appendChild(confirm);
  }

  results.appendChild(resultsTable(comparison));
  renderChart(exp, comparison);
}

function resultsTable(comparison) {
  const table = document.createElement('table');
  table.className = 'experiment-table';
  const head = document.createElement('thead');
  head.innerHTML = `<tr>
    <th scope="col">${esc(t('bench.table.metric'))}</th>
    <th scope="col">${esc(t('bench.run.a'))}</th>
    <th scope="col">${esc(t('bench.run.b'))}</th>
    <th scope="col">${esc(t('bench.table.delta'))}</th>
    <th scope="col">${esc(t('bench.table.fraction'))}</th>
  </tr>`;
  table.appendChild(head);
  const body = document.createElement('tbody');
  for (const row of comparison.rows) {
    const tr = document.createElement('tr');
    const cells = [
      `${bench.metricLabel(row.metric)} (${row.unit})`,
      num(row.a),
      num(row.b),
      num(row.delta),
      row.fraction === null ? '—' : `${(row.fraction * 100).toFixed(2)}%`,
    ];
    cells.forEach((text, i) => {
      const cell = document.createElement(i === 0 ? 'th' : 'td');
      if (i === 0) cell.scope = 'row';
      cell.textContent = text;
      tr.appendChild(cell);
    });
    body.appendChild(tr);
  }
  table.appendChild(body);
  return table;
}

function num(v) {
  if (v === null || v === undefined || !Number.isFinite(v)) return '—';
  const a = Math.abs(v);
  if (a !== 0 && (a < 1e-3 || a >= 1e6)) return v.toExponential(3);
  return String(Number(v.toPrecision(6)));
}

async function renderChart(exp, comparison) {
  const wrap = $('benchChartWrap');
  const picker = $('benchChartMetric');
  const plottable = (exp.metrics || []).filter(m => !SCALAR_METRICS.has(m));
  if (!plottable.length) {
    wrap.hidden = true;
    return;
  }
  wrap.hidden = false;

  if (picker.options.length !== plottable.length) {
    picker.innerHTML = '';
    for (const m of plottable) {
      const opt = document.createElement('option');
      opt.value = m;
      opt.textContent = bench.metricLabel(m);
      picker.appendChild(opt);
    }
    picker.onchange = () => renderChart(exp, comparison);
  }

  const metric = picker.value || plottable[0];
  const aligned = comparison.aligned[metric];
  if (!aligned || !aligned.rows.length) return;

  const Chart = await ensureChartJs();
  if (!Chart) return;
  chartCanvas = $('benchChart');
  const colors = chartColors();
  const data = {
    labels: aligned.rows.map(r => Number(r.t.toPrecision(6))),
    datasets: [
      {
        label: t('bench.run.a'),
        data: aligned.rows.map(r => r.a),
        borderColor: colors.cool,
        backgroundColor: 'transparent',
        borderWidth: 2,
        pointRadius: 0,
      },
      {
        label: t('bench.run.b'),
        data: aligned.rows.map(r => r.b),
        borderColor: colors.warm,
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderDash: [5, 3],
        pointRadius: 0,
      },
    ],
  };
  if (chart) {
    chart.data = data;
    chart.options.scales.y.title.text = `${bench.metricLabel(metric)} (${bench.metricUnit(metric)})`;
    chart.update('none');
    return;
  }
  chart = new Chart(chartCanvas, {
    type: 'line',
    data,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      interaction: { mode: 'nearest', intersect: false },
      plugins: { legend: { labels: { color: colors.label } } },
      scales: {
        x: {
          title: {
            display: true,
            text: t('bench.chart.time'),
            color: colors.label,
          },
          ticks: { color: colors.tick, maxTicksLimit: 8 },
          grid: { color: colors.grid },
        },
        y: {
          title: {
            display: true,
            text: `${bench.metricLabel(metric)} (${bench.metricUnit(metric)})`,
            color: colors.label,
          },
          ticks: { color: colors.tick },
          grid: { color: colors.grid },
        },
      },
    },
  });
}

function renderSaved() {
  const wrap = $('benchSaved');
  if (!wrap) return;
  wrap.innerHTML = '';
  const saved = bench.savedExperiments();
  if (!saved.length) {
    wrap.textContent = t('bench.saved.none');
  }
  for (const entry of saved) {
    const row = document.createElement('div');
    row.className = 'experiment-saved-row';
    const openBtn = document.createElement('button');
    openBtn.type = 'button';
    openBtn.className = 'experiment-saved-open';
    openBtn.textContent = entry.name;
    openBtn.onclick = () => {
      const result = bench.open(entry.id);
      bench.say(result.message);
      render();
    };
    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'experiment-saved-delete';
    del.setAttribute('aria-label', t('bench.action.delete'));
    del.textContent = '✕';
    del.onclick = () => {
      bench.remove(entry.id);
      render();
    };
    row.append(openBtn, del);
    wrap.appendChild(row);
  }
  const report = bench.storage();
  $('benchQuota').textContent = t('bench.quota', {
    used: Math.round(report.used / 1024),
    total: Math.round(report.total / 1024),
    count: report.count,
    max: report.max,
  });
}

function renderStatus(exp, recording) {
  const status = $('benchStatus');
  if (recording) {
    status.textContent = t('bench.status.recording', {
      n: bench.sampleCount(),
      seconds: bench.recordingSpan().toFixed(1),
    });
    return;
  }
  if (!exp) {
    status.textContent = t('bench.status.idle');
    return;
  }
  const runs = Object.keys(exp.runs || {}).length;
  status.textContent = t('bench.status.runs', { n: runs });
}

/** Flash a short message in the status line. @param {string} text - Message */
export function flash(text) {
  const status = $('benchStatus');
  if (!status) return;
  status.textContent = text;
  if (statusTimer) clearTimeout(statusTimer);
  statusTimer = setTimeout(render, 2500);
}

// --- Wiring ----------------------------------------------------------------------

function wire() {
  $('benchClose').onclick = closePanel;
  $('benchName').oninput = () => bench.rename($('benchName').value);

  $('benchCapture').onclick = () => {
    bench.captureExperiment($('benchName').value);
    render();
    flash(t('bench.flash.captured'));
  };

  $('benchChaosRun').onclick = () => {
    runChaosPair().catch(() => {});
  };
  $('benchChaosSame').onclick = () => {
    runChaosPair({ nudge: false }).catch(() => {});
  };
  $('benchChaosCancel').onclick = () => cancelChaosPair();
  $('benchChaosControl').onclick = () => {
    runChaosPair({ control: $('benchChaosControlPick').value }).catch(() => {});
  };
  $('benchChaosKeep').onclick = () => {
    const report = chaosPairReport();
    if (!report) return;
    keep((capture, provenance) =>
      capture.fromChaosPair({ report, provenance })
    );
  };

  $('benchRestore').onclick = () => {
    const result = bench.restoreInitialState();
    render();
    flash(
      result.matches
        ? t('bench.flash.restored')
        : t('bench.flash.restoredDrift')
    );
  };

  for (const label of ['A', 'B']) {
    $(`benchRecord${label}`).onclick = () => {
      if (bench.isRecording()) {
        bench.stopRun();
        render();
        flash(t('bench.flash.stopped'));
        return;
      }
      bench.startRun(label);
      render();
      tickStatus();
    };
  }

  $('benchSave').onclick = () => {
    const result = bench.persist();
    bench.say(result.message);
    render();
  };

  $('benchDuplicate').onclick = () => {
    const exp = bench.activeExperiment();
    bench.duplicate(t('bench.copyOf', { name: exp?.name || '' }));
    render();
  };

  $('benchPerturbApply').onclick = () => {
    const exp = bench.activeExperiment();
    if (!exp) return;
    const km = Number($('benchPerturbAmount').value);
    if (!Number.isFinite(km) || km === 0) {
      bench.say(t('bench.perturb.needAmount'));
      return;
    }
    const result = bench.applyPerturbation({
      bodyId: Number($('benchPerturbBody').value),
      axis: $('benchPerturbAxis').value,
      km,
    });
    bench.say(
      result.ok ? t('bench.perturb.done') : t(`bench.perturb.${result.reason}`)
    );
    render();
  };

  $('benchControl').onclick = async () => {
    const result = await bench.recordNumericalControl();
    bench.say(
      result.ok
        ? t('bench.control.recorded', { label: result.label })
        : t('bench.control.failed')
    );
    render();
  };

  $('benchSweepScenario').onchange = () => {
    renderSweepControls();
    fillSweepRange();
  };
  $('benchSweepParam').onchange = () => fillSweepRange();

  $('benchSweepRun').onclick = () =>
    startSweep({
      scenario: $('benchSweepScenario').value,
      parameter: $('benchSweepParam').value,
      from: Number($('benchSweepFrom').value),
      to: Number($('benchSweepTo').value),
      count: Number($('benchSweepCount').value),
      duration: Number($('benchSweepDuration').value),
      metrics: bench.activeExperiment()?.metrics?.length
        ? [...bench.activeExperiment().metrics]
        : ['distance_to_primary', 'speed'],
      seed: 'sweep',
    });

  $('benchSweepCancel').onclick = () => bench.cancelSweep();
  $('benchSweepExport').onclick = () => download('sweep');

  // The guided example. Fixed on purpose: a reader following it and a reader
  // reading about it should be looking at the same numbers, so nothing here is
  // taken from whatever the controls happen to say.
  $('benchSweepGuided').onclick = () => {
    $('benchSweepScenario').value = 'Binary Planet Lab';
    renderSweepControls();
    $('benchSweepParam').value = 'binary_lab_planet_a';
    $('benchSweepFrom').value = '0.05';
    $('benchSweepTo').value = '0.4';
    $('benchSweepCount').value = '12';
    $('benchSweepDuration').value = '10000';
    return startSweep({
      scenario: 'Binary Planet Lab',
      parameter: 'binary_lab_planet_a',
      from: 0.05,
      to: 0.4,
      count: 12,
      // About two binary periods. One period is roughly 5131 time units here
      // (a = 1000, total mass 1500, G = 1), and a trial shorter than an orbit
      // measures the planet's starting position rather than its orbit.
      duration: 10000,
      metrics: ['distance_to_primary', 'speed'],
      seed: 'guided',
    });
  };

  $('benchReliabilityRun').onclick = async () => {
    const status = $('benchReliabilityStatus');
    render();
    const result = await bench.runReliabilityCheck({
      onProgress: ({ phase, fraction }) => {
        status.textContent = t('reliability.running', {
          phase: phase + 1,
          percent: Math.round(fraction * 100),
        });
      },
    });
    status.textContent = result.ok
      ? ''
      : t(`reliability.reason.${result.reason}`, { n: result.substeps ?? '' });
    render();
  };

  $('benchReliabilityCancel').onclick = () => {
    bench.cancelReliabilityCheck();
  };

  $('benchReliabilityExport').onclick = () => download('reliability');

  // The three notebook buttons. Dynamic imports so the notebook, its PDF
  // writer and its prose stay out of the bench's chunk as well as out of the
  // start-up path: keeping a result is a separate decision from producing one.
  $('benchNotebook').onclick = () =>
    keep((capture, provenance) =>
      capture.fromBenchComparison({
        experiment: bench.activeExperiment(),
        comparison: bench.compare(),
        labelFor: bench.metricLabel,
        provenance,
      })
    );
  $('benchSweepNotebook').onclick = () =>
    keep((capture, provenance) =>
      capture.fromSweep({
        sweep: bench.latestSweep(),
        labelFor: bench.metricLabel,
        provenance,
      })
    );
  $('benchReliabilityNotebook').onclick = () =>
    keep((capture, provenance) =>
      capture.fromReliability({
        report: bench.activeExperiment()?.reliability,
        labelFor: bench.metricLabel,
        provenance: {
          ...provenance,
          scenario:
            bench.activeExperiment()?.provenance?.scenario ??
            provenance.scenario,
          seed: bench.activeExperiment()?.provenance?.seed ?? provenance.seed,
        },
      })
    );

  $('benchExportCsv').onclick = () => download('csv');
  $('benchExportJson').onclick = () => download('json');
  $('benchShare').onclick = () => onShareRequest?.();

  $('benchImport').onchange = async event => {
    const file = event.target.files?.[0];
    if (!file) return;
    const result = bench.importFrom(await file.text());
    bench.say(result.message);
    event.target.value = '';
    render();
  };
}

let statusTicker = 0;
function tickStatus() {
  if (statusTicker) clearInterval(statusTicker);
  statusTicker = setInterval(() => {
    if (!bench.isRecording()) {
      clearInterval(statusTicker);
      statusTicker = 0;
      return;
    }
    renderStatus(bench.activeExperiment(), true);
  }, 400);
}

/**
 * Hand a result to the evidence notebook.
 *
 * @param {Function} make - (capture, provenance) => entry|null
 * @returns {Promise<void>}
 */
async function keep(make) {
  const { captureToNotebook } = await import('../notebookBridge.js');
  const saved = await captureToNotebook(make);
  if (!saved) bench.say(t('nb.nothingToSave'));
}

function download(which) {
  const files = bench.exportFiles(appVersion());
  const file = files[which];
  const blob = new Blob([file.text], {
    type: which === 'csv' ? 'text/csv' : 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = file.name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

/**
 * A build identifier for the manifest's provenance.
 *
 * The production build stamps one onto the document; a development server has
 * none, and 'dev' is the honest answer rather than a fabricated version.
 *
 * @returns {string} Build identifier
 */
export function appVersion() {
  return (
    document.documentElement.dataset.build ||
    document.querySelector('meta[name="gravitas-build"]')?.content ||
    'dev'
  );
}
