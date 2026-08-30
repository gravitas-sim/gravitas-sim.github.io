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
// says how many rows it holds and over how long, and greys out rather than
// disappearing when there is nothing to write. A download button that produces
// a two-line CSV without warning is worse than one that says why.
// =============================================================================

import {
  trajectoryCsv,
  lightCurveCsv,
  transitTableCsv,
  exportSummary,
  downloadCsv,
  csvFilename,
} from './dataExport.js';
import { state, SETTINGS, current_scenario_name } from './ui.js';
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
import { toast } from './controls.js';

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

/** A count with its noun, pluralized. */
const plural = (n, one, many = `${one}s`) =>
  `${n.toLocaleString('en-US')} ${n === 1 ? one : many}`;

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

/** Write one file out, and say what happened. */
function download(row) {
  try {
    const built = row.build();
    if (!built.rows) {
      toast('There is nothing recorded to export yet.');
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
        ? `Exported the first ${built.rows.toLocaleString('en-US')} rows: the recording was larger than one file.`
        : `Exported ${plural(built.rows, 'row')}.`
    );
  } catch (err) {
    console.warn('Export failed:', err);
    toast('Could not build that file.');
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
    const text = document.createElement('div');
    text.className = 'export-file-text';
    const title = document.createElement('span');
    title.className = 'export-file-name';
    title.textContent = row.name;
    const detail = document.createElement('span');
    detail.className = 'export-file-detail';
    detail.textContent = row.detail;
    text.append(title, detail);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'ui-button';
    btn.textContent = 'Download CSV';
    btn.disabled = !row.ready;
    btn.addEventListener('click', () => download(row));
    div.append(text, btn);
    els.files.append(div);
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
