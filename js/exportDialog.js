// =============================================================================
// The export dialog
// -----------------------------------------------------------------------------
// The UI layer over dataExport.js, kept apart from it so the serializers stay
// free of the DOM and can be tested by reading their output rather than by
// clicking things.
//
// What the dialog is for: an assignment that says "export the data and fit a
// period in Python" only works if a student can see, before downloading, what
// is in the file and whether there is enough of it. So each row names the file,
// says how many rows it holds and over how long, and grays out rather than
// disappearing when there is nothing to write. A download button that produces
// a two-line CSV without warning is worse than one that says why.
// =============================================================================

import { plural } from './format.js';
import {
  trajectoryCsv,
  lightCurveCsv,
  transitTableCsv,
  radialVelocityCsv,
  rvFitCsv,
  rotationCurveCsv,
  exportSummary,
  downloadCsv,
  csvFilename,
} from './dataExport.js';
import { state, SETTINGS, current_scenario_name } from './appState.js';
import {
  bh_list,
  stars,
  planets,
  gas_giants,
  asteroids,
  comets,
  neutron_stars,
  white_dwarfs,
} from './physics.js';
import { toast, announce } from './notify.js';
import { t } from './i18n/index.js';

// This module's prose lives in the deferred half of the catalog - see the
// note in js/i18n/en.deferred.js. Registered from here rather than left to the
// caller, because nothing in the start-up path can reach this module and a
// reader who does reach it must not see message ids.
import { ensureDeferredMessages } from './i18n/deferredMessages.js';

ensureDeferredMessages().catch(() => {});

let els = {};
let scope = 'all';

/** Names for the ids the timeline recorded, taken from the live objects. */
function nameMap() {
  const out = new Map();
  const lists = [
    bh_list,
    stars,
    planets,
    gas_giants,
    asteroids,
    comets,
    neutron_stars,
    white_dwarfs,
  ];
  for (const list of lists) {
    for (const b of list) {
      if (b && b.id !== undefined && b.name) out.set(b.id, b.name);
    }
  }
  return out;
}

/** The object the export is restricted to, or null for everything. */
function selectedId() {
  const obj = state.selectedObject?.object;
  return obj && obj.id !== undefined ? obj.id : null;
}

/**
 * Build the three file rows from what is actually recorded.
 * @returns {Array} Row descriptors for render()
 */
function files() {
  const s = exportSummary();
  const id = selectedId();
  const one = scope === 'selected' && id !== null;
  const span =
    s.days >= 0.05
      ? `${s.days.toPrecision(3)} days`
      : `${(s.days * 24).toPrecision(2)} hours`;

  return [
    {
      key: 'trajectories',
      name: 'Trajectories',
      detail: s.frames
        ? `${plural(s.frames, 'frame')} over ${span}, ${
            one
              ? 'for the selected object'
              : plural(Math.round(s.bodies), 'object')
          }. Position, velocity, separation and energy.`
        : 'Nothing recorded yet. Let the simulation run for a few seconds.',
      ready: s.frames > 0,
      build: () =>
        trajectoryCsv({
          ids: one ? [id] : null,
          names: nameMap(),
        }),
    },
    {
      key: 'lightcurve',
      name: 'Light curve',
      detail: s.samples
        ? `${plural(s.samples, 'sample')}, with ${plural(s.transits, 'transit')} marked.`
        : 'Nothing recorded. Open the Light Curve tool and let it run.',
      ready: s.samples > 0,
      build: lightCurveCsv,
    },
    {
      key: 'radialvelocity',
      name: 'Radial velocity measurements',
      // Only offered when a run exists. The continuous curve the panel draws
      // when no schedule is set is not a set of measurements and exporting it
      // as one would teach the opposite of what the observing mode is for.
      detail: s.rvMeasurements
        ? `${plural(s.rvMeasurements, 'measurement')} of ${plural(s.rvPlanned, 'planned')}, with uncertainties and the observing schedule.` +
          (s.rvMissed || s.rvDegraded
            ? ` ${plural(s.rvUsable, 'usable reading')}; ${s.rvMissed} missed, ${s.rvDegraded} below the resolution tolerance. Every epoch is a row, flagged.`
            : '')
        : s.rvRunning
          ? 'The run has not taken a measurement yet. Let the simulation reach the first epoch.'
          : 'No observing run. Open the Radial Velocity tool and switch on the synthetic observing run.',
      ready: s.rvMeasurements > 0,
      build: radialVelocityCsv,
    },
    {
      key: 'rvfit',
      name: 'Radial velocity fit',
      // Offered only once a fit exists. Exporting an untouched default would
      // be exporting the opening guess, which is not an analysis of anything.
      detail: s.rvFit
        ? `The fitted period, amplitude, phase and systemic velocity, the assumptions behind them, every residual, and the recording they came from.`
        : 'No fit yet. Take a recording, press Analyze on the Radial Velocity panel, and adjust the model or search a range of periods.',
      ready: Boolean(s.rvFit),
      build: rvFitCsv,
    },
    {
      key: 'rotationcurve',
      name: 'Rotation curve',
      // The tracers the panel is plotting right now, not a recording: a
      // rotation curve is a snapshot of a disc rather than a time series, so
      // there is nothing to accumulate and nothing to wait for.
      detail: s.rotationPoints
        ? `${plural(s.rotationPoints, 'tracer')}: radius, orbital speed, tangential component and mass.`
        : 'No rotation curve. Open the Rotation Curve tool on a scenario with a disc.',
      ready: s.rotationPoints > 0,
      build: rotationCurveCsv,
    },
    {
      key: 'transits',
      name: 'Transit measurements',
      detail: s.transits
        ? `${plural(s.transits, 'transit')}: mid-time, depth and duration, one row each.`
        : 'No complete transits recorded yet.',
      ready: s.transits > 0,
      build: transitTableCsv,
    },
  ];
}

/**
 * The series behind a plot, as a table, fetched the first time one is asked for.
 *
 * js/seriesTable.js is loaded on demand: a reader who only ever downloads files
 * should not pay for the renderer, and the deferred bundle has little room to
 * spare. It renders row.build().csv - the very string the download button
 * writes - so the table cannot disagree with the file or with the plot they
 * both come from.
 *
 * @param {object} row - An entry from files()
 * @param {HTMLButtonElement} button - The control, whose aria-expanded follows
 * @param {HTMLElement} host - Where the table goes
 */
let seriesTableModule = null;
async function toggleTable(row, button, host) {
  const open = button.getAttribute('aria-expanded') === 'true';
  if (open) {
    host.hidden = true;
    host.textContent = '';
    button.setAttribute('aria-expanded', 'false');
    button.textContent = t('export.viewTable');
    return;
  }

  seriesTableModule ??= await import('./seriesTable.js');
  // The column names and the caption live with the placement strings, out of
  // the deferred catalog and behind this same lazy load. See
  // ensurePlacementMessages() for why.
  await seriesTableModule.ensurePlacementMessages().catch(() => {});

  // Opening a table needs a dynamic import and a catalog fetch, and a
  // simulation reset during either of those re-renders the dialog - which
  // replaces this `host` with a fresh one. Writing the table into the old node
  // would put it nowhere, so stop instead: a row the reader can press again
  // beats a silent no-op against a node that left the document.
  if (!host.isConnected) return;
  const { buildSeriesTable, describeTable } = seriesTableModule;
  let built;
  try {
    built = buildSeriesTable(row.build().csv);
  } catch (error) {
    console.error('Could not build the table for', row.key, error);
    return;
  }

  host.textContent = '';
  const caption = document.createElement('p');
  caption.className = 'export-table-caption';
  caption.textContent = describeTable(row.name, built);
  host.append(caption);

  if (built.table) {
    // A labelled, scrollable region: a wide table needs to scroll sideways, and
    // a scrollable box that cannot be focused cannot be scrolled from a
    // keyboard. tabindex and a role are what make it reachable.
    const scroller = document.createElement('div');
    scroller.className = 'export-table-scroll';
    scroller.tabIndex = 0;
    scroller.setAttribute('role', 'region');
    scroller.setAttribute('aria-label', caption.textContent);
    built.table.setAttribute('aria-label', caption.textContent);
    scroller.append(built.table);
    host.append(scroller);
  }

  host.hidden = false;
  button.setAttribute('aria-expanded', 'true');
  button.textContent = t('export.hideTable');
  announce(caption.textContent);
}

/** Write one file out, and say what happened. */
function download(row) {
  try {
    const built = row.build();
    if (!built.rows) {
      toast(t('export.empty'));
      return;
    }
    // applyPreset resets preset_scenario to the 'None' sentinel once it has
    // run, so reading it here named every file "gravitas-none-...". The live
    // binding holds what is actually loaded.
    const scenario =
      current_scenario_name ||
      (SETTINGS.preset_scenario !== 'None' ? SETTINGS.preset_scenario : '');
    downloadCsv(built.csv, csvFilename(row.key, scenario));
    toast(
      built.truncated
        ? t('export.truncated', { n: built.rows })
        : t('export.done', { n: built.rows })
    );
  } catch (err) {
    console.warn('Export failed:', err);
    toast(t('export.failed'));
  }
}

/** Redraw the dialog's contents against the current recording. */
function render() {
  if (!els.files) return;
  const id = selectedId();
  const name = state.selectedObject?.object?.name;

  // The scope control is only meaningful when something is selected, and a
  // radio you cannot choose is better disabled than hidden: it tells a student
  // that selecting an object is a thing they could have done.
  const selectedRadio = els.scope?.querySelector('[value="selected"]');
  if (selectedRadio) {
    selectedRadio.disabled = id === null;
    if (id === null && scope === 'selected') scope = 'all';
    selectedRadio.checked = scope === 'selected';
  }
  const allRadio = els.scope?.querySelector('[value="all"]');
  if (allRadio) allRadio.checked = scope !== 'selected';
  if (els.selectedLabel) {
    els.selectedLabel.textContent =
      id === null
        ? 'Selected object only (nothing selected)'
        : `${name || 'Selected object'} only`;
  }

  els.files.innerHTML = '';
  for (const row of files()) {
    const div = document.createElement('div');
    div.className = `export-file${row.ready ? '' : ' is-empty'}`;
    // Named, so a test can address one file row without matching on prose.
    div.dataset.export = row.key;
    const text = document.createElement('div');
    text.className = 'export-file-text';
    const title = document.createElement('span');
    title.className = 'export-file-name';
    title.textContent = row.name;
    const detail = document.createElement('span');
    detail.className = 'export-file-detail';
    detail.textContent = row.detail;
    text.append(title, detail);
    const actions = document.createElement('div');
    actions.className = 'export-file-actions';
    // The table first. For a reader who cannot see the plot this is the way in
    // to the data, and a download is a file they then have to open in
    // something else; putting it second is not a detail.
    const tableBtn = document.createElement('button');
    tableBtn.type = 'button';
    tableBtn.className = 'ui-button';
    // Named, because there are two buttons in this row now and both of them
    // are `.ui-button` with translated labels. A test that reaches for "the
    // button in the radial-velocity row" was unambiguous until the table
    // arrived beside the download, and a label-based locator would pass in
    // English and fail in Spanish.
    tableBtn.dataset.action = 'table';
    tableBtn.textContent = t('export.viewTable');
    tableBtn.disabled = !row.ready;
    tableBtn.setAttribute('aria-expanded', 'false');
    tableBtn.setAttribute('aria-controls', `export-table-${row.key}`);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'ui-button';
    btn.dataset.action = 'download';
    btn.textContent = t('export.downloadCsv');
    btn.disabled = !row.ready;
    btn.addEventListener('click', () => download(row));
    actions.append(tableBtn, btn);

    // The table lands after the row rather than inside it, so a reader who
    // opens one does not have to tab back out through the buttons to read it.
    const host = document.createElement('div');
    host.id = `export-table-${row.key}`;
    host.className = 'export-table-host';
    host.hidden = true;
    tableBtn.addEventListener('click', () => toggleTable(row, tableBtn, host));

    div.append(text, actions);
    els.files.append(div, host);
  }
}

/** Show the dialog. */
export function openExportDialog() {
  if (!els.modal) return;
  els.modal.classList.remove('hidden');
  render();
  els.close?.focus();
}

/** Hide the dialog. */
export function closeExportDialog() {
  if (!els.modal) return;
  els.modal.classList.add('hidden');
  document.getElementById('exportDataBtn')?.focus();
}

/** @returns {boolean} True while the dialog is showing */
export const isExportDialogOpen = () =>
  Boolean(els.modal) && !els.modal.classList.contains('hidden');

/** Wire up the dialog. Safe to call once, from init. */
export function initExportDialog() {
  els = {
    modal: document.getElementById('dataExport'),
    files: document.getElementById('dataExportFiles'),
    scope: document.getElementById('dataExportScope'),
    selectedLabel: document.getElementById('dataExportSelectedLabel'),
    close: document.getElementById('dataExportClose'),
  };
  if (!els.modal || !els.files) return;

  document.getElementById('exportDataBtn')?.addEventListener('click', () => {
    isExportDialogOpen() ? closeExportDialog() : openExportDialog();
  });
  els.close?.addEventListener('click', closeExportDialog);
  els.scope?.addEventListener('change', e => {
    if (e.target.name !== 'exportScope') return;
    scope = e.target.value;
    render();
  });
  els.modal.addEventListener('click', e => {
    if (e.target === els.modal) closeExportDialog();
  });
  window.addEventListener('gravitasEscape', () => {
    if (isExportDialogOpen()) closeExportDialog();
  });
  // A rebuild throws the ring buffer away, so a dialog left open would be
  // offering to export a recording that no longer exists.
  window.addEventListener('gravitasSimulationReset', () => {
    if (isExportDialogOpen()) render();
  });
}
