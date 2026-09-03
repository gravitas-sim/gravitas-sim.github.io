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
import { chartColors } from '../observationChart.js';
import {
  requestObservationLayout,
  noteObservationPanelUsed,
} from '../observationLayout.js';
import * as bench from './bench.js';
import { OFFERED_METRICS } from './bench.js';
import { METRIC_ARITY, SCALAR_METRICS } from './metrics.js';
import { describeDiff } from './canonicalState.js';
import { describePerturbation, systemExtent } from './perturbation.js';

const PANEL_ID = 'experimentPanel';

let root = null;
let chart = null;
let chartCanvas = null;
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

      <div class="experiment-row experiment-actions">
        <button id="benchExportCsv" class="ui-button" disabled>${esc(t('bench.action.csv'))}</button>
        <button id="benchExportJson" class="ui-button" disabled>${esc(t('bench.action.json'))}</button>
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
  onLocaleChange(() => {
    // Rebuilding is simpler and less error-prone than re-translating in place,
    // and a language change is rare enough that redrawing one panel is free.
    const wasOpen = isOpen();
    root.remove();
    root = null;
    if (wasOpen) {
      ensurePanel();
      openPanel();
    }
  });
  return root;
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
