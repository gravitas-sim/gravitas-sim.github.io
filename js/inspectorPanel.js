// =============================================================================
// The object inspector's panel: its markup, its energy tab and the chart
// -----------------------------------------------------------------------------
// The inspector used to be built by string concatenation inside ui.js, and
// rebuilt ten times a second: every stat row had its innerHTML replaced on each
// tick, which threw away and recreated DOM for values that had not changed and
// closed any disclosure the user had opened.
//
// The markup half is handed a plain view model - already resolved by ui.js,
// which is the part that knows about state, units and the simulation - and
// returns HTML, or patches values into DOM that already exists. The energy half
// (Prompt 107, slice 6) is the tab and its chart, which are the only users of
// each other; ui.js starts it with setupEnergyTab() and tells it when the
// selection ends or its mass changes. No imports from ui.js, so no cycle.
//
// The two entry points of the markup are deliberately separate:
//
//   renderDetails(view)        build once, when the selection changes
//   patchDetails(root, view)   ten times a second, touching only text nodes
//
// The second one is why an open "About this object" stays open while the
// numbers beside it keep moving.
// =============================================================================

import { withUnit } from './format.js';
import { chartColor, chartTick, mountChart } from './observationChart.js';
import { debugLog } from './utils.js';
import { t } from './i18n/index.js';
import { toast } from './notify.js';
import { listeners } from './listeners.js';
import { state, SETTINGS } from './appState.js';
import { getObjectEnergyHistory, getObjectEnergyStats } from './physics.js';

/**
 * Escape text for safe interpolation into markup.
 *
 * Object names can come from scenario data and from a user renaming a body, so
 * they are not trusted to be markup-free.
 *
 * @param {*} value - Any value
 * @returns {string} HTML-safe text
 */
function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Split a display title into the emoji that leads it and the name that follows.
 *
 * The existing info functions return a title with the icon already glued to the
 * front. The redesigned header shows them as separate elements so the name can
 * truncate without taking the icon with it.
 *
 * @param {string} icon - Icon supplied by the info function
 * @param {string} title - Title supplied by the info function
 * @returns {{icon: string, name: string}} The two halves
 */
export function splitIdentity(icon, title) {
  const raw = String(title ?? '').trim();
  const lead = String(icon ?? '').trim();
  // Some info functions repeat the icon inside the title.
  const name =
    lead && raw.startsWith(lead) ? raw.slice(lead.length).trim() : raw;
  return { icon: lead, name: name || 'Object' };
}

/**
 * The mass control: label, slider and readout on one row.
 *
 * The old version was a centered "Object Mass" heading, a full-width slider, a
 * glowing value badge and a permanent line of text reading "Hover for mass
 * adjustment tips". That is four rows for one control. The explanation now
 * hangs off a help affordance instead of occupying the panel forever.
 *
 * @param {object} mass - View model for the control
 * @returns {string} HTML
 */
function renderMass(mass) {
  if (!mass) return '';
  const help =
    'Drag to change this object&#39;s mass. More mass means stronger gravity, and a large enough change can turn one kind of object into another.';
  return `
    <div class="insp-mass">
      <span class="insp-mass-label">
        <label for="massSlider">Mass</label>
        <button type="button" class="insp-help" aria-label="About the mass control" title="${help}">i</button>
      </span>
      <input
        type="range"
        id="massSlider"
        min="${mass.min}"
        max="${mass.max}"
        step="${mass.step}"
        value="${mass.value}"
        data-object-id="${escapeHtml(mass.objectId)}"
        aria-label="Object mass"
      />
      <output class="insp-mass-value" id="massValueDisplay" for="massSlider">${mass.display}</output>
    </div>`;
}

/**
 * The property table.
 *
 * A two-column grid rather than one row element per property: the label and the
 * value are separate grid children, which is what lets the value column align
 * on its own edge without a fixed label width.
 *
 * @param {Array} groups - Groups of rows
 * @returns {string} HTML
 */
function renderProps(groups) {
  const parts = ['<div class="insp-props">'];
  for (const group of groups) {
    if (group.title) {
      parts.push(`<div class="insp-group">${escapeHtml(group.title)}</div>`);
    }
    for (const row of group.rows) {
      const tip = row.tooltip ? ` title="${escapeHtml(row.tooltip)}"` : '';
      // One row element rather than two grid children: the separator then runs
      // the full width of the panel instead of stopping either side of the
      // column gap, which read as a stack of boxes rather than a table.
      parts.push(
        `<div class="insp-prop"${tip}>` +
          `<span class="insp-prop-label">${escapeHtml(row.label)}</span>` +
          `<span class="insp-prop-value" data-prop="${escapeHtml(row.key)}">${row.value}</span>` +
          `</div>`
      );
    }
  }
  parts.push('</div>');
  return parts.join('');
}

/**
 * The overlay toggles, gathered into one section.
 *
 * Previously each of these was its own bordered block with a paragraph of
 * explanation underneath, which together came to most of a screen. The
 * explanation is still one click away.
 *
 * @param {Array} overlays - Toggle view models
 * @returns {string} HTML
 */
function renderOverlays(overlays) {
  if (!overlays.length) return '';
  const rows = overlays
    .map(
      o => `
      <div class="insp-toggle-row">
        <span id="${o.id}Label">${escapeHtml(o.label)}</span>
        <button type="button" class="insp-help" aria-label="About ${escapeHtml(o.label)}" title="${escapeHtml(o.help)}">i</button>
        <button
          type="button"
          id="${o.id}"
          class="toggle-button"
          data-state="${o.on ? 'on' : 'off'}"
          role="switch"
          aria-checked="${o.on ? 'true' : 'false'}"
          aria-labelledby="${o.id}Label"
        >${o.on ? 'On' : 'Off'}</button>
      </div>`
    )
    .join('');
  return `
    <div class="insp-overlays">
      <div class="insp-overlays-title">Overlays</div>
      ${rows}
    </div>`;
}

/**
 * The description, collapsed.
 *
 * This block was the single largest contributor to the panel's height, shown in
 * full for every object whether or not anyone was reading it.
 *
 * @param {string} description - HTML description
 * @returns {string} HTML
 */
function renderAbout(description) {
  if (!description) return '';
  return `
    <details class="insp-about">
      <summary>About this object</summary>
      <div class="insp-about-body">${description}</div>
    </details>`;
}

/**
 * Build the whole Details panel.
 *
 * @param {object} view - The view model
 * @returns {string} HTML
 */
export function renderDetails(view) {
  return (
    renderMass(view.mass) +
    renderProps(view.groups) +
    renderOverlays(view.overlays ?? []) +
    renderAppearance(view.appearance) +
    renderAbout(view.about)
  );
}

/**
 * "Appearance and environment", for a black hole.
 *
 * A disclosure rather than a row of controls, because it is not what most
 * people open the inspector for and because everything in it is a display
 * choice. That distinction is the point of the block: the numbers above it are
 * computed from the object's mass, and nothing in here can change one of them.
 *
 * @param {?object} a - From buildInspectorView, or null for anything else
 * @returns {string} HTML
 */
function renderAppearance(a) {
  if (!a) return '';
  const options = a.environments
    .map(
      e =>
        `<option value="${escapeHtml(e.value)}"${
          e.value === a.environment ? ' selected' : ''
        }>${escapeHtml(e.label)}</option>`
    )
    .join('');
  return `
    <details class="insp-appearance">
      <summary>${escapeHtml(a.title)}</summary>
      <p class="insp-appearance-note">${escapeHtml(a.note)}</p>
      <div class="insp-toggle-row">
        <label for="bhEnvironment">${escapeHtml(a.environmentLabel)}</label>
        <select id="bhEnvironment" class="ui-select">${options}</select>
      </div>
      <div class="insp-toggle-row">
        <label for="bhInclination">${escapeHtml(a.inclinationLabel)}</label>
        <input
          type="range"
          id="bhInclination"
          min="0"
          max="90"
          step="1"
          value="${a.inclinationDeg}"
          aria-describedby="bhInclinationOut"
        />
        <output id="bhInclinationOut">${a.inclinationDeg}&deg;</output>
      </div>
      <div class="insp-toggle-row">
        <span id="bhExplainLabel">${escapeHtml(a.explainLabel)}</span>
        <button
          type="button"
          id="bhExplain"
          class="toggle-button"
          data-state="${a.explain ? 'on' : 'off'}"
          role="switch"
          aria-checked="${a.explain ? 'true' : 'false'}"
          aria-labelledby="bhExplainLabel"
        >${a.explain ? 'On' : 'Off'}</button>
      </div>
      <p class="insp-appearance-note">${escapeHtml(a.scaleNote)}</p>
    </details>`;
}

/**
 * Decide where the inspector should rest, given what else is on screen.
 *
 * Kept pure and separate from the measuring so it can be checked at sizes that
 * are awkward to drive a real browser to. The caller passes rectangles; this
 * returns a point.
 *
 * The stylesheet used to own this as a fixed inset from the right edge, which
 * is correct on a wide screen and wrong on a narrow one: between roughly 620
 * and 760 pixels of width that inset puts the panel's left edge across the
 * readout overlay in the top left corner. Measuring finds that case; a
 * constant cannot.
 *
 * Dock right, against the rail if the rail is a right-hand column and against
 * the window edge otherwise. If that crosses the readout, drop below it.
 *
 * There is no third case where the panel tucks in beside the readout at the
 * same height: reaching it would mean the panel's left edge is inside the
 * readout and there is room to the readout's right for the whole panel, and
 * those two cannot both be true.
 *
 * @param {object} opts - Geometry
 * @param {number} opts.viewportWidth - Window width in px
 * @param {number} opts.viewportHeight - Window height in px
 * @param {number} opts.panelWidth - Panel width in px
 * @param {number} opts.panelHeight - Panel height in px
 * @param {?object} opts.hud - Readout rect, or null when hidden
 * @param {?object} opts.rail - Control rail rect, or null when hidden
 * @param {number} [opts.gap] - Breathing room in px
 * @param {number} [opts.preferredTop] - Resting top in px
 * @returns {{left: number, top: number, maxHeight: number}} Where to put it,
 *   and how tall it may be there
 */
const MIN_INSPECTOR_HEIGHT = 260;

export function computeDockPosition({
  viewportWidth,
  viewportHeight,
  panelWidth,
  panelHeight,
  hud,
  rail,
  gap = 12,
  preferredTop = 96,
}) {
  // Below about 1180px the rail stops being a right-hand column and becomes a
  // full-width sheet. Treating that as a blocker would leave nowhere to go.
  const railBlocks = rail && rail.left > viewportWidth * 0.5;
  const rightLimit = railBlocks ? rail.left - gap : viewportWidth - gap;

  let top = preferredTop;
  let left = rightLimit - panelWidth;

  const crossesHud =
    hud &&
    left < hud.right + gap &&
    top < hud.bottom &&
    top + panelHeight > hud.top;

  if (crossesHud) top = hud.bottom + gap;
  top = Math.max(gap, top);

  // Going below the readout on a short window would hang the panel's bottom
  // half off the screen, so the panel gets a height budget for where it landed
  // rather than a position it cannot use. It already scrolls internally.
  let maxHeight = viewportHeight - top - gap;
  if (maxHeight < MIN_INSPECTOR_HEIGHT) {
    maxHeight = MIN_INSPECTOR_HEIGHT;
    top = Math.max(gap, viewportHeight - gap - maxHeight);
  }

  return {
    left: Math.round(Math.max(gap, left)),
    top: Math.round(top),
    maxHeight: Math.round(maxHeight),
  };
}

/**
 * Build a pinned comparison card for one object.
 *
 * Deliberately read-only: identity and numbers, no mass slider and no overlay
 * toggles. Two reasons. The controls in the main inspector are addressed by id
 * - #massSlider, #hzToggleBtn - and a second copy would collide with the first,
 * so every lookup would find whichever came earlier in the document. And when
 * you pin a card it is to hold a set of numbers still beside another set; a
 * second slider is not what the comparison needs.
 *
 * @param {object} view - The view model
 * @returns {string} HTML for the card's inner content
 */
export function renderPinnedCard(view) {
  return (
    `<div class="insp-pin-header">
       <span class="inspector-icon" aria-hidden="true">${escapeHtml(view.icon)}</span>
       <span class="inspector-identity">
         <span class="inspector-title" title="${escapeHtml(view.name)}">${escapeHtml(view.name)}</span>
         <span class="inspector-kind">${escapeHtml(view.kind)}</span>
       </span>
       <button type="button" class="inspector-close" data-pin-close
               aria-label="Close the pinned card for ${escapeHtml(view.name)}"
               title="Unpin">&times;</button>
     </div>` + renderProps(view.groups)
  );
}

/**
 * Update an already-rendered Details panel in place.
 *
 * Only text content is touched, and only where it differs. Nothing is
 * recreated, so focus, an open disclosure and a slider mid-drag all survive the
 * ten-per-second refresh.
 *
 * @param {HTMLElement} root - The details container
 * @param {object} view - The view model
 * @returns {boolean} True if the panel matched and was patched
 */
export function patchDetails(root, view) {
  if (!root) return false;
  const values = root.querySelectorAll('.insp-prop-value');
  const rows = view.groups.flatMap(g => g.rows);
  // A different object, or a different set of properties, needs a rebuild.
  if (values.length !== rows.length) return false;

  rows.forEach((row, i) => {
    const el = values[i];
    if (el.dataset.prop !== row.key) return;
    const next = String(row.value);
    if (el.innerHTML !== next) el.innerHTML = next;
  });

  const massValue = root.querySelector('#massValueDisplay');
  if (massValue && view.mass && massValue.innerHTML !== view.mass.display) {
    massValue.innerHTML = view.mass.display;
  }

  for (const o of view.overlays ?? []) {
    const btn = root.querySelector(`#${o.id}`);
    if (!btn) continue;
    const on = btn.getAttribute('data-state') === 'on';
    if (on !== o.on) {
      btn.setAttribute('data-state', o.on ? 'on' : 'off');
      btn.setAttribute('aria-checked', o.on ? 'true' : 'false');
      btn.textContent = o.on ? 'On' : 'Off';
    }
  }
  return true;
}

/**
 * Build the Energy panel.
 *
 * Four large cards became four aligned rows, and the chart lost its hardcoded
 * 500x300 canvas in favour of a container the panel can size.
 *
 * @returns {string} HTML
 */
export function renderEnergy() {
  const row = (label, id, tip) => `
    <div class="insp-prop" title="${escapeHtml(tip)}">
      <span class="insp-prop-label">${label}</span>
      <span class="insp-prop-value" id="${id}">—</span>
    </div>`;
  return `
    <div class="insp-props">
      ${row('Kinetic', 'currentKineticEnergy', 'Energy of motion: rises with mass and with the square of speed.')}
      ${row('Potential', 'currentPotentialEnergy', 'Energy of position in the gravitational field. More negative means more deeply bound.')}
      ${row('Total', 'currentTotalEnergy', 'Kinetic plus potential. A flat total means a stable orbit; a rising one means the object is being unbound.')}
      ${row('Samples', 'currentDataPoints', 'How many measurements have been recorded for this object.')}
    </div>
    <div class="insp-energy-head" style="margin-top: var(--space-3)">
      <span class="insp-energy-title">Energy history</span>
      <span class="insp-energy-actions">
        <button type="button" class="insp-icon-btn" id="refreshEnergyChart" aria-label="Refresh the energy chart" title="Refresh the chart">↻</button>
        <button type="button" class="insp-icon-btn" id="exportEnergyChart" aria-label="Export the energy chart as an image" title="Export as PNG">⇩</button>
      </span>
    </div>
    <div class="insp-energy-chart">
      <div id="energyChart"></div>
    </div>`;
}

// =============================================================================
// The energy chart (formerly js/energyChartNew.js, folded in with the tab that
// is its only user)
// =============================================================================
// ===== ENERGY CHART MODULE =====
// The series chart of js/plot/chart.js (D-PLOT-02, stage 3b), which replaced the
// Chart.js line chart: three connected series on a numeric time axis, a legend
// that hides and shows them, a tooltip and a keyboard readout, and a PNG.

// The chart, once the component has arrived and been mounted on the tab.
let chart = null;
// The element it was mounted on, so a re-rendered tab does not keep a chart
// that is drawing into a detached copy.
let chartHost = null;
// The mount in flight, so two callers share one chart.
let building = null;

// Today's caps and rates (tests/fixtures/chart-limits.json).
const maxPoints = 200;
// A chart update waits for an idle moment, but not longer than this: while the
// simulation holds every frame the browser never calls an idle callback that
// has no deadline, and the chart stopped moving.
const IDLE_BY_MS = 250;

// The tabs' series, in the order the legend lists them. The colors are design
// tokens read again on every theme change; they were fixed dark-theme literals.
const energySpec = (x, ke, pe, total) => ({
  label: t('energyChart.label'),
  xTitle: 'Time (s)',
  yTitle: 'Energy (J)',
  series: [
    {
      id: 'ke',
      label: t('energyChart.kineticEnergy'),
      x,
      y: ke,
      color: () => chartColor('alt'),
      width: 2,
    },
    {
      id: 'pe',
      label: t('energyChart.potentialEnergy'),
      x,
      y: pe,
      color: () => chartColor('caution'),
      width: 2,
    },
    {
      id: 'total',
      label: t('energyChart.totalEnergy'),
      x,
      y: total,
      color: () => chartColor('accent'),
      width: 3,
    },
  ],
});

/** One tooltip row: a series' name and its energy, with the unit attached. */
export const energyReadout = ({ label, y }) => `${label}: ${withUnit(y, 'J')}`;

/** The chart as data (its axes, legend and series as drawn), for the tests. */
export const energyChartParts = () => chart?.parts() ?? null;

/**
 * Build the energy chart on its host
 * @param {HTMLElement} host - The element to draw into
 * @returns {Promise<boolean>} True if the chart was made
 */
export async function initChart(host) {
  if (!host) {
    console.error('A host element is required for chart initialization');
    return false;
  }
  try {
    const made = await mountChart(host, {
      height: 'fill',
      maxPoints,
      number: chartTick,
      tooltip: {
        mode: 'index',
        title: x => withUnit(x, 's'),
        format: energyReadout,
      },
    });
    // The tab was rendered again, or closed, while the component was on its
    // way: this chart would draw into a copy nobody sees.
    if (!host.isConnected) {
      made.destroy();
      return false;
    }
    chart?.destroy();
    chart = made;
    chartHost = host;
    chart.draw(energySpec([], [], [], []));
    debugLog('Energy chart initialized successfully');
    return true;
  } catch (error) {
    console.error('Failed to initialize energy chart:', error);
    chart = null; // Ensure chart is null on failure
    return false;
  }
}

/**
 * Update the chart with energy data
 * @param {Array} data - Array of energy objects with { timestamp, ke, pe, total }
 */
export function updateChart(data, updateHz) {
  // Decimate updates to requested Hz
  const desiredHz = updateHz > 0 ? updateHz : 8;
  if (!updateChart._last) updateChart._last = 0;
  const now = performance.now();
  if (now - updateChart._last < 1000 / desiredHz) return;
  updateChart._last = now;
  // Check if chart instance exists
  if (!chart) {
    console.warn('Chart not initialized - skipping update');
    return;
  }

  // Check if data is valid
  if (!data) {
    console.warn('Data is null or undefined - skipping chart update');
    return;
  }

  if (!Array.isArray(data)) {
    console.warn('Data is not an array - skipping chart update');
    return;
  }

  if (data.length === 0) {
    debugLog('No data provided to update chart');
    return;
  }

  try {
    // Validate first data point has required properties
    const firstPoint = data[0];
    if (!firstPoint || typeof firstPoint.timestamp !== 'number') {
      console.warn(
        'Invalid data format: missing or invalid timestamp in first data point'
      );
      return;
    }

    // Seconds since the first sample passed in, and the three energies, as the
    // component's arrays. The newest maxPoints are drawn; slicing first keeps
    // a full history passed repeatedly from being copied whole.
    const startTime = firstPoint.timestamp;
    const recent =
      data.length > maxPoints ? data.slice(data.length - maxPoints) : data;
    chart.draw(
      energySpec(
        recent.map(point => (point.timestamp - startTime) / 1000),
        recent.map(point => point.ke || 0),
        recent.map(point => point.pe || 0),
        recent.map(point => point.total || 0)
      )
    );
    debugLog('Chart updated with', data.length, 'data points');
  } catch (error) {
    console.error('Failed to update chart:', error);
  }
}

/**
 * Re-measure the chart against its container.
 *
 * The chart is built while the Energy tab is still hidden, so it measures a
 * host of zero size. Its own size observer redraws once the tab is on screen;
 * this is the explicit nudge the tab's click gives it as well.
 */
export function resizeChart() {
  if (chart) chart.resize();
}

/**
 * Clear all chart data
 */
export function clearChart() {
  if (!chart) {
    console.warn('Chart not initialized - cannot clear data');
    return;
  }

  try {
    chart.draw(energySpec([], [], [], []));
    debugLog('Chart data cleared');
  } catch (error) {
    console.error('Failed to clear chart:', error);
  }
}

/**
 * Export the chart as a PNG
 * @returns {Promise<Blob|null>} The image, or null if the chart is not ready
 */
export async function exportChart() {
  if (!chart) {
    console.warn('Chart not initialized - cannot export');
    return null;
  }

  try {
    const blob = await chart.toPNG();
    debugLog('Chart exported successfully');
    return blob;
  } catch (error) {
    console.error('Failed to export chart:', error);
    return null;
  }
}

// ===== ENERGY TAB FUNCTIONALITY =====

// Chart state tracking
let chartInitialized = false;
let currentObjectId = null;
let autoRefreshInterval = null;
let autoRefreshEnabled = true;
const AUTO_REFRESH_INTERVAL = 2000; // 2 seconds

// The tabs and the document outlive the inspector's selection and the setup
// runs for every selection, so each run takes the previous run's registrations
// back before it makes its own.
let energyListen = listeners();

/**
 * Set up the energy tab with chart and controls
 */
export const setupEnergyTab = () => {
  const energyTab = document.querySelector('.inspector-tab[data-tab="energy"]');
  const detailsTab = document.querySelector(
    '.inspector-tab[data-tab="details"]'
  );
  const energyTabContent = document.getElementById('energyTab');
  const detailsTabContent = document.getElementById('detailsTab');

  if (!energyTab || !detailsTab || !energyTabContent || !detailsTabContent) {
    // Silently return instead of logging error - elements may not exist during initialization
    return;
  }

  energyListen.off();
  energyListen = listeners();
  const on = energyListen;

  debugLog('Setting up energy tab system');

  // Build energy tab HTML structure
  energyTabContent.innerHTML = renderEnergy();

  // Set up tab switching
  on(energyTab, 'click', () => {
    // The chart was built while this tab was hidden, so it measured a
    // zero-height parent. Now that it is visible, let it size itself.
    requestAnimationFrame(() => resizeChart());
    debugLog('Energy tab clicked');
    energyTab.classList.add('active');
    detailsTab.classList.remove('active');
    energyTabContent.classList.add('active');
    detailsTabContent.classList.remove('active');

    // Initialize chart if needed
    ensureChartReady();

    // Update current energy values immediately
    updateCurrentEnergyValues();

    // Update chart with current object data
    updateEnergyChart();

    // Start auto-refresh for this tab
    startAutoRefresh();

    // Force a chart update to ensure it's visible
    setTimeout(() => {
      if (state.selectedObject) {
        debugLog('Forcing chart update after tab activation');
        updateEnergyChart();
        updateCurrentEnergyValues();
      }
    }, 50);
  });

  on(detailsTab, 'click', () => {
    detailsTab.classList.add('active');
    energyTab.classList.remove('active');
    detailsTabContent.classList.add('active');
    energyTabContent.classList.remove('active');

    // Stop auto-refresh when switching away from energy tab
    stopAutoRefresh();
  });

  // Set up export button
  const exportButton = document.getElementById('exportEnergyChart');
  if (exportButton) {
    on(exportButton, 'click', handleExportChart);
  }

  // Set up refresh button
  const refreshButton = document.getElementById('refreshEnergyChart');
  if (refreshButton) {
    on(refreshButton, 'click', handleRefreshChart);
    debugLog('Refresh button event listener attached');
  } else {
    console.warn('Refresh button not found during setup');
  }

  debugLog('Energy tab setup complete');

  // Add a global click handler as a fallback for the refresh button
  // This ensures the refresh button works even if the event listener wasn't properly attached
  on(document, 'click', event => {
    if (event.target && event.target.id === 'refreshEnergyChart') {
      debugLog('Refresh button clicked via global handler');
      handleRefreshChart();
    }
  });
};

/**
 * Ensure chart is initialized and ready
 */
export const ensureChartReady = async () => {
  const host = document.getElementById('energyChart');
  if (!host) return;
  // A tab that was rendered again has a new host; the old chart draws into the
  // detached one, so it is let go and a new one is made.
  if (chart && chartHost !== host) {
    chart.destroy();
    chart = null;
    chartInitialized = false;
  }
  if (chartInitialized) return;

  // The component is fetched the first time a chart is actually wanted rather
  // than on every page load; callers in the same breath share one mount.
  building ??= initChart(host)
    .then(ok => {
      chartInitialized = ok && chart !== null;
      if (!chartInitialized) console.error('Failed to initialize energy chart');
    })
    .finally(() => {
      building = null;
    });
  await building;
};

/**
 * Update the current energy values display
 */
export const updateCurrentEnergyValues = () => {
  if (!state.selectedObject) {
    // Clear all energy value displays
    const elements = [
      'currentKineticEnergy',
      'currentPotentialEnergy',
      'currentTotalEnergy',
      'currentDataPoints',
    ];
    elements.forEach(id => {
      const element = document.getElementById(id);
      if (element) {
        element.textContent = id === 'currentDataPoints' ? '0' : '0 J';
      }
    });
    return;
  }

  const objectId = state.selectedObject.object.id;
  const energyStats = getObjectEnergyStats(objectId);

  // Format energy values for display
  const formatEnergyValue = value => {
    if (value === 0) return '0 J';

    const absValue = Math.abs(value);
    if (absValue >= 1e6 || absValue < 1e-3) {
      return withUnit(value, 'J');
    } else if (absValue >= 1000) {
      return withUnit(value, 'J');
    } else if (absValue >= 1) {
      return withUnit(value, 'J');
    } else {
      return withUnit(value, 'J');
    }
  };

  // Update kinetic energy
  const kineticElement = document.getElementById('currentKineticEnergy');
  if (kineticElement && energyStats.latest) {
    kineticElement.textContent = formatEnergyValue(energyStats.latest.ke);
  }

  // Update potential energy
  const potentialElement = document.getElementById('currentPotentialEnergy');
  if (potentialElement && energyStats.latest) {
    potentialElement.textContent = formatEnergyValue(energyStats.latest.pe);
  }

  // Update total energy
  const totalElement = document.getElementById('currentTotalEnergy');
  if (totalElement && energyStats.latest) {
    totalElement.textContent = formatEnergyValue(energyStats.latest.total);
  }

  // Update data points count
  const dataPointsElement = document.getElementById('currentDataPoints');
  if (dataPointsElement) {
    dataPointsElement.textContent = energyStats.dataPoints.toString();
  }
};

/**
 * Update the energy chart with current object data
 */
export const updateEnergyChart = () => {
  debugLog('updateEnergyChart called');

  if (!state.selectedObject) {
    debugLog('No selected object, skipping chart update');
    return;
  }

  const objectId = state.selectedObject.object.id;
  debugLog('Updating chart for object ID:', objectId);

  // Clear chart if switching to a different object
  if (currentObjectId !== null && currentObjectId !== objectId) {
    debugLog('Switching objects, clearing chart');
    clearChart();
  }

  currentObjectId = objectId;

  // Get energy history for the selected object
  const energyHistory = getObjectEnergyHistory(objectId);
  debugLog('Energy history length:', energyHistory.length);

  if (energyHistory.length === 0) {
    debugLog('No energy data available for object:', objectId);
    // Clear chart and show collecting message
    clearChart();
    showCollectingMessage();
    // Start auto-refresh to check for new data
    startAutoRefresh();
    return;
  }

  debugLog(
    'Updating chart with',
    energyHistory.length,
    'data points for object:',
    objectId
  );

  // Ensure chart is ready before updating
  ensureChartReady();

  // Worker-decimated update
  try {
    if (window._chartWorker === false) throw new Error('failed');
    if (!window._chartWorker) {
      const workerUrl = new URL('./chartWorker.js', import.meta.url);
      window._chartWorker = new Worker(workerUrl, { type: 'module' });
      const desiredHz = SETTINGS.chart_update_hz || 8;
      window._chartWorker.postMessage({
        type: 'config',
        desiredHz,
        maxPoints: 200,
      });
      window._chartWorker.onerror = window._chartWorker.onmessageerror = () => {
        window._chartWorker.terminate();
        window._chartWorker = false; // and the direct update takes over
      };
      window._chartWorker.onmessage = evt => {
        if (evt.data && evt.data.type === 'update') {
          const payload = evt.data.data;
          // Schedule non-critical chart update in idle time to avoid jank
          const run = () => updateChart(payload, SETTINGS.chart_update_hz);
          if (typeof window.requestIdleCallback === 'function') {
            window.requestIdleCallback(() => run(), { timeout: IDLE_BY_MS });
          } else {
            setTimeout(run, 0);
          }
        }
      };
    }
    window._chartWorker.postMessage({ type: 'data', data: energyHistory });
  } catch {
    // Fallback: direct update if worker fails
    const run = () => updateChart(energyHistory, SETTINGS.chart_update_hz);
    if (typeof window.requestIdleCallback === 'function') {
      window.requestIdleCallback(() => run(), { timeout: IDLE_BY_MS });
    } else {
      setTimeout(run, 0);
    }
  }
  hideCollectingMessage();

  // Stop auto-refresh since we have data
  stopAutoRefresh();
};

/**
 * Show collecting data message in energy tab
 */
const showCollectingMessage = () => {
  const energyTabContent = document.getElementById('energyTab');
  if (!energyTabContent) return;

  // Find or create the collecting message element
  let collectingMessage = energyTabContent.querySelector('.collecting-message');
  if (!collectingMessage) {
    collectingMessage = document.createElement('div');
    collectingMessage.className = 'collecting-message';
    collectingMessage.innerHTML = `
            <div class="collecting-content">
                <div class="collecting-spinner"></div>
                <div class="collecting-text">Collecting data...</div>
            </div>
        `;

    // Insert after the chart container
    const chartContainer = energyTabContent.querySelector(
      '.energy-chart-container'
    );
    if (chartContainer) {
      chartContainer.parentNode.insertBefore(
        collectingMessage,
        chartContainer.nextSibling
      );
    } else {
      energyTabContent.appendChild(collectingMessage);
    }
  }

  collectingMessage.style.display = 'block';
};

/**
 * Hide collecting data message in energy tab
 */
const hideCollectingMessage = () => {
  const energyTabContent = document.getElementById('energyTab');
  if (!energyTabContent) return;

  const collectingMessage = energyTabContent.querySelector(
    '.collecting-message'
  );
  if (collectingMessage) {
    collectingMessage.style.display = 'none';
  }
};

/**
 * Start auto-refresh for energy chart
 */
const startAutoRefresh = () => {
  if (autoRefreshInterval) {
    clearInterval(autoRefreshInterval);
  }

  autoRefreshInterval = setInterval(() => {
    if (autoRefreshEnabled && state.selectedObject) {
      const energyTab = document.querySelector(
        '.inspector-tab[data-tab="energy"]'
      );
      if (energyTab && energyTab.classList.contains('active')) {
        updateEnergyChart();
        updateCurrentEnergyValues();
      }
    }
  }, AUTO_REFRESH_INTERVAL);

  // Update refresh button to show auto-refresh is active
  const refreshButton = document.getElementById('refreshEnergyChart');
  if (refreshButton) {
    refreshButton.title = t('chart.autoRefresh');
    refreshButton.classList.add('auto-refresh-active');
  }

  debugLog('Auto-refresh started for energy chart');
};

/**
 * Stop auto-refresh for energy chart
 */
export const stopAutoRefresh = () => {
  if (autoRefreshInterval) {
    clearInterval(autoRefreshInterval);
    autoRefreshInterval = null;

    // Update refresh button to show auto-refresh is inactive
    const refreshButton = document.getElementById('refreshEnergyChart');
    if (refreshButton) {
      refreshButton.title = t('chart.refresh');
      refreshButton.classList.remove('auto-refresh-active');
    }

    debugLog('Auto-refresh stopped for energy chart');
  }
};

/**
 * Handle chart refresh
 */
const handleRefreshChart = () => {
  debugLog('Manual chart refresh requested');

  // Ensure chart is ready before updating
  ensureChartReady();

  // Update the chart
  updateEnergyChart();

  // Update current energy values
  updateCurrentEnergyValues();

  // Provide visual feedback
  const refreshButton = document.getElementById('refreshEnergyChart');
  if (refreshButton) {
    // Add a brief visual feedback
    refreshButton.style.transform = 'scale(0.95)';
    setTimeout(() => {
      refreshButton.style.transform = '';
    }, 150);
  }
};

/**
 * Handle chart export
 */
const handleExportChart = async () => {
  const blob = await exportChart();
  if (!blob) {
    toast(t('chart.notReady'));
    return;
  }

  try {
    const link = document.createElement('a');
    const objectId = state.selectedObject
      ? state.selectedObject.object.id
      : 'unknown';
    link.download = `energy-chart-${objectId}-${Date.now()}.png`;
    link.href = URL.createObjectURL(blob);
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    debugLog('Energy chart exported successfully');
  } catch (error) {
    console.error('Failed to export energy chart:', error);
    toast(t('chart.exportFailed'));
  }
};

/** Whether the energy chart has been built for the current selection. */
export const energyChartReady = () => chartInitialized;

/** Empty the chart and say that data is being collected (mass or kind changed). */
export const clearEnergyChart = () => {
  clearChart();
  showCollectingMessage();
};

/** The inspector closed: stop refreshing and forget the chart and the body. */
export const releaseEnergyChart = () => {
  stopAutoRefresh();
  chart?.destroy();
  chart = null;
  chartHost = null;
  chartInitialized = false;
  currentObjectId = null;
};
