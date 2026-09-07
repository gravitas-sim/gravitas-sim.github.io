// =============================================================================
// Planning a burn before making it
// -----------------------------------------------------------------------------
// The panel over js/maneuver.js. Its whole job is to make the consequence
// visible before the commitment: type a radial and a transverse delta-v, read
// what the orbit would become, and only then press Apply.
//
// Three things it is careful about.
//
// The preview is a two-body prediction. It says so, every time, in the readout
// and in the exported record - not once in a help panel somebody read in
// September. In a system with a third body of any consequence the actual
// trajectory will leave the predicted one, and a student who is not told that
// will conclude the engine is wrong rather than that the model is incomplete.
//
// Applying is deliberate. A burn is not undone by editing a number back: it
// changes the world, and the panel takes a full snapshot first so that Undo
// puts the world back rather than subtracting the impulse from wherever the
// body has since drifted to. Subtracting the impulse would be exact only if
// nothing had moved, and nothing having moved is the one case where undo
// hardly matters.
//
// Every burn is logged. Time, body, primary, frame, vector, units, and the
// orbit before and after, because a delta-v on its own does not identify a
// manoeuvre - the same push at a different point of the orbit is a different
// manoeuvre with a different result.
// =============================================================================

import {
  getSimulationTime,
  setSimulationTime,
  noteIntervention,
  stars,
  planets,
  gas_giants,
  asteroids,
  comets,
  bh_list,
  neutron_stars,
  white_dwarfs,
} from './physics.js';
import { dominantPrimary } from './orbital.js';
import { burnRecord, previewBurn } from './maneuver.js';
import { t, onLocaleChange } from './i18n/index.js';
import { formatNumber } from './format.js';
import {
  SIM_UNITS_PER_AU,
  timeUnitSeconds,
  velocityUnitToMs,
} from './units.js';

let host = null;
let root = null;
let selectedId = null;
/** Snapshots taken before each applied burn, newest last. */
const undoStack = [];
/** Every burn applied in this session, for the export. */
const log = [];

const MAX_UNDO = 20;

const esc = text =>
  String(text ?? '').replace(
    /[&<>"']/g,
    c =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        c
      ]
  );

const $ = id => root?.querySelector(`#${id}`);

/**
 * Hand the planner what it needs from the application.
 *
 * @param {object} api - captureShareState, applyShareState, getSettings, getScenario
 * @returns {void}
 */
export function initManeuver(api) {
  host = api;
}

/** Every body that could sensibly be given a burn. @returns {Array} Bodies */
export function maneuverableBodies() {
  return [...planets, ...gas_giants, ...asteroids, ...comets].filter(
    b => b && b.alive !== false
  );
}

/** Everything massive enough to be a primary. @returns {Array} Bodies */
function primaryCandidates() {
  return [
    ...bh_list,
    ...stars,
    ...neutron_stars,
    ...white_dwarfs,
    ...gas_giants,
  ].filter(b => b && b.alive !== false);
}

/** @returns {?object} The body the planner is aimed at */
function currentBody() {
  const all = maneuverableBodies();
  return all.find(b => b.id === selectedId) || all[0] || null;
}

/**
 * Open the planner, optionally on a particular body.
 *
 * @param {?number} bodyId - Which body to select
 * @returns {void}
 */
export function openManeuverPlanner(bodyId = null) {
  if (bodyId !== null) selectedId = bodyId;
  mount();
  render();
  root.hidden = false;
}

/** Close it. @returns {void} */
export function closeManeuverPlanner() {
  if (root) root.hidden = true;
}

/** @returns {boolean} Whether it is on screen */
export const isManeuverPlannerOpen = () => Boolean(root && !root.hidden);

/** @returns {Array<object>} Every burn applied this session */
export const burnLog = () => log.map(entry => ({ ...entry }));

/** Build the panel once. */
function mount() {
  if (root) return;
  root = document.createElement('div');
  root.id = 'maneuverPanel';
  root.className = 'obs-panel maneuver-panel';
  root.setAttribute('role', 'region');
  root.setAttribute('aria-labelledby', 'maneuverTitle');
  root.innerHTML = `
    <div class="obs-panel-toolbar">
      <div class="obs-panel-meta">
        <span class="obs-panel-title" id="maneuverTitle">${esc(t('burn.title'))}</span>
      </div>
      <div class="obs-panel-actions">
        <button id="maneuverClose" class="obs-panel-btn" title="${esc(t('burn.close'))}">✕</button>
      </div>
    </div>
    <div class="maneuver-body">
      <label class="maneuver-field">
        <span>${esc(t('burn.body'))}</span>
        <select id="maneuverBody" class="experiment-input"></select>
      </label>
      <p id="maneuverPrimary" class="experiment-hint"></p>

      <label class="maneuver-field">
        <span id="maneuverRadialLabel">${esc(t('burn.radial'))}</span>
        <input id="maneuverRadial" class="experiment-input" type="number" step="any" value="0" />
      </label>
      <label class="maneuver-field">
        <span id="maneuverTransverseLabel">${esc(t('burn.transverse'))}</span>
        <input id="maneuverTransverse" class="experiment-input" type="number" step="any" value="0" />
      </label>
      <p class="experiment-hint">${esc(t('burn.frame'))}</p>

      <div id="maneuverPreview" class="maneuver-preview"></div>
      <p class="maneuver-caveat">${esc(t('burn.twoBody'))}</p>

      <div class="maneuver-actions">
        <button id="maneuverApply" class="ui-button">${esc(t('burn.apply'))}</button>
        <button id="maneuverUndo" class="ui-button" disabled>${esc(t('burn.undo'))}</button>
        <button id="maneuverExport" class="ui-button" disabled>${esc(t('burn.export'))}</button>
      </div>
      <div id="maneuverLog" class="maneuver-log"></div>
    </div>`;
  document.body.appendChild(root);

  $('maneuverClose').onclick = () => closeManeuverPlanner();
  $('maneuverBody').onchange = () => {
    selectedId = Number($('maneuverBody').value);
    render();
  };
  for (const id of ['maneuverRadial', 'maneuverTransverse']) {
    $(id).addEventListener('input', () => renderPreview());
  }
  $('maneuverApply').onclick = () => applyBurn();
  $('maneuverUndo').onclick = () => undoBurn();
  $('maneuverExport').onclick = () => exportLog();

  // The catalogue can arrive after this panel does; see the note on the same
  // subscription in js/binaryRunPanel.js.
  onLocaleChange(() => render());
}

/** The delta-v the fields currently ask for. @returns {{radial:number, transverse:number}} */
function requested() {
  return {
    radial: Number($('maneuverRadial')?.value) || 0,
    transverse: Number($('maneuverTransverse')?.value) || 0,
  };
}

/** Redraw everything. */
function render() {
  if (!root) return;
  const select = $('maneuverBody');
  const bodies = maneuverableBodies();
  const signature = bodies.map(b => `${b.id}:${b.name}`).join('|');
  if (select.dataset.signature !== signature) {
    select.dataset.signature = signature;
    select.innerHTML = '';
    for (const b of bodies) {
      const opt = document.createElement('option');
      opt.value = String(b.id);
      opt.textContent = b.name || `#${b.id}`;
      select.appendChild(opt);
    }
  }
  const body = currentBody();
  if (body) select.value = String(body.id);
  renderPreview();
  renderLog();
}

/** The predicted orbit, and what it differs from. */
function renderPreview() {
  const out = $('maneuverPreview');
  if (!out) return;
  out.innerHTML = '';
  const body = currentBody();
  const primary = body ? dominantPrimary(body, primaryCandidates()) : null;
  $('maneuverPrimary').textContent = primary
    ? t('burn.about', { name: primary.name || `#${primary.id}` })
    : t('burn.noPrimary');
  $('maneuverApply').disabled = !primary;
  if (!primary) return;

  const G = host?.getSettings?.().gravitational_constant ?? 1;
  const { radial, transverse } = requested();
  const preview = previewBurn({ body, primary, G, radial, transverse });
  if (!preview) return;

  const row = (label, before, after) => {
    const tr = document.createElement('tr');
    for (const [text, cls] of [
      [label, 'l'],
      [before, 'b'],
      [after, 'a'],
    ]) {
      const cell = document.createElement(cls === 'l' ? 'th' : 'td');
      cell.textContent = text;
      tr.appendChild(cell);
    }
    return tr;
  };
  const n = v =>
    Number.isFinite(v) ? formatNumber(v, { sig: digitsFor(v) }) : '—';

  const table = document.createElement('table');
  table.className = 'experiment-table';
  table.appendChild(row(t('burn.quantity'), t('burn.before'), t('burn.after')));
  table.appendChild(
    row(
      t('burn.periapsis'),
      n(preview.before.periapsis),
      n(preview.after.periapsis)
    )
  );
  table.appendChild(
    row(
      t('burn.apoapsis'),
      n(preview.before.apoapsis),
      preview.after.bound ? n(preview.after.apoapsis) : t('burn.none')
    )
  );
  table.appendChild(
    row(t('burn.energy'), n(preview.before.energy), n(preview.after.energy))
  );
  table.appendChild(
    row(
      t('burn.angularMomentum'),
      n(preview.before.angularMomentum),
      n(preview.after.angularMomentum)
    )
  );
  table.appendChild(
    row(
      t('burn.period'),
      n(preview.before.period),
      preview.after.bound ? n(preview.after.period) : t('burn.none')
    )
  );
  out.appendChild(table);

  const note = document.createElement('p');
  note.className = preview.unbound ? 'maneuver-unbound' : 'experiment-hint';
  // Said in words rather than left to be read off an empty apoapsis cell.
  note.textContent = preview.becomesUnbound
    ? t('burn.becomesUnbound')
    : preview.unbound
      ? t('burn.staysUnbound')
      : preview.becomesBound
        ? t('burn.becomesBound')
        : t('burn.magnitude', {
            dv: formatNumber(preview.delta.magnitude, { sig: 4 }),
          });
  out.appendChild(note);
}

/** Significant figures that suit the size of the number. */
function digitsFor(v) {
  const m = Math.abs(v);
  return m !== 0 && (m < 1e-3 || m >= 1e5) ? 3 : 5;
}

/** Commit the burn, after taking a snapshot to come back to. */
function applyBurn() {
  const body = currentBody();
  const primary = body ? dominantPrimary(body, primaryCandidates()) : null;
  if (!body || !primary || !host) return;

  const G = host.getSettings().gravitational_constant;
  const { radial, transverse } = requested();
  const preview = previewBurn({ body, primary, G, radial, transverse });
  if (!preview) return;

  // The whole world, before anything changes. Undo restores this rather than
  // subtracting the impulse: by the time somebody presses Undo the body has
  // usually moved, and reversing the velocity there leaves it on a third orbit
  // that is neither the old one nor the new one.
  // forExperiment, so the capture carries the simulation clock and the open
  // tools as well as the bodies.
  //
  // Without it captureShareState() omits the clock deliberately - a seeded
  // share link means "the world as generated", not "the world at this moment"
  // - and applyShareState() then restored the clock to zero. An undo is the
  // other case: it is a return to a moment that happened, so it wants the
  // whole moment. Asking the existing contract for it beats keeping a private
  // clock beside the snapshot and setting it back by hand, which is a second
  // restoration path that can disagree with the first.
  undoStack.push({
    state: host.captureShareState({
      kind: 'full',
      includeCamera: false,
      forExperiment: true,
    }),
    simTime: getSimulationTime(),
  });
  if (undoStack.length > MAX_UNDO) undoStack.shift();

  body.vel.x += preview.delta.vector.x;
  body.vel.y += preview.delta.vector.y;

  // The recordings that were running measured an orbit this body is no longer
  // on. Nothing else in an observing session's identity can see that.
  noteIntervention();

  log.push(
    burnRecord({
      body,
      primary,
      preview,
      simTime: getSimulationTime(),
      scenario: host.getScenario?.() ?? null,
      index: log.length,
      units: {
        velocityUnitToMs: velocityUnitToMs(),
        timeUnitSeconds: timeUnitSeconds(),
        simUnitsPerAu: SIM_UNITS_PER_AU,
      },
    })
  );
  render();
}

/**
 * Set while an undo is restoring, so the rebuild it causes is not mistaken for
 * somebody loading a different world.
 *
 * The bug this closes: applyShareState() rebuilds the world, the rebuild
 * dispatches gravitasSimulationReset, and the bridge's listener called
 * resetManeuverPlanner() - which empties the undo stack. So the FIRST undo
 * wiped the history for every burn before it. Two burns then two undos left
 * the second undo with nothing to pop and the world stranded one burn in.
 */
let restoring = false;

/** @returns {boolean} Whether an undo is in progress */
export const isRestoringManeuver = () => restoring;

/** @returns {number} How many burns can still be undone */
export const undoDepth = () => undoStack.length;

/**
 * Put the world back to just before the last burn.
 *
 * Restores through the application's own share-state contract rather than a
 * private snapshot format, so everything a world carries comes back the way it
 * does for a share link - and then puts the simulation clock back too, which
 * the contract does not cover. Without that the bodies returned to their
 * pre-burn positions while the clock kept the time they reached after it, so
 * the burn log's timestamps, the timeline and every recording indexed by the
 * clock described a moment the world was no longer in.
 */
function undoBurn() {
  const snapshot = undoStack.pop();
  if (!snapshot || !host) return;

  restoring = true;
  try {
    // Restoring re-initialises the world, which resets the timeline and bumps
    // the world generation - so the recordings taken after the burn are
    // discarded by the machinery that already exists for a rebuild.
    host.applyShareState(JSON.parse(JSON.stringify(snapshot.state)));
    // The clock rides in the payload, restored by applyShareState() itself.
    // This is the belt to that contract's braces: if a future capture stops
    // asking for the clock, the recorded time still comes back rather than
    // silently reverting to zero, and the two agree by construction because
    // both came from the same getSimulationTime() call.
    if (
      Number.isFinite(snapshot.simTime) &&
      getSimulationTime() !== snapshot.simTime
    ) {
      setSimulationTime(snapshot.simTime);
    }
  } finally {
    restoring = false;
  }

  noteIntervention();
  log.pop();
  render();
}

/** The burn log, as rows. */
function renderLog() {
  const out = $('maneuverLog');
  if (!out) return;
  out.innerHTML = '';
  $('maneuverUndo').disabled = !undoStack.length;
  $('maneuverExport').disabled = !log.length;
  for (const entry of log) {
    const line = document.createElement('p');
    line.className = 'experiment-note';
    line.textContent = t('burn.logRow', {
      n: entry.index + 1,
      body: entry.body.name || '?',
      time: formatNumber(entry.simTime, { sig: 5 }),
      radial: formatNumber(entry.delta.radial, { sig: 3 }),
      transverse: formatNumber(entry.delta.transverse, { sig: 3 }),
    });
    out.appendChild(line);
  }
}

/** Write the log out as JSON. */
function exportLog() {
  if (!log.length) return;
  const doc = {
    kind: 'gravitas-maneuver-log',
    scenario: host?.getScenario?.() ?? null,
    exportedAt: new Date().toISOString(),
    frame: log[0].frame,
    // Restated at the top as well as on every burn: a reader who skims the
    // header should not have to reach a row to learn what the numbers assume.
    assumption: log[0].assumption,
    burns: log,
  };
  const blob = new Blob([`${JSON.stringify(doc, null, 2)}\n`], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'gravitas-maneuvers.json';
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

/**
 * Forget everything. Called when the world is rebuilt under the planner.
 *
 * Ignored while an undo is restoring. An undo rebuilds the world by design and
 * that rebuild is not somebody loading a different system, so treating it as
 * one destroyed the very history the undo is walking back through.
 */
export function resetManeuverPlanner() {
  if (restoring) return;
  undoStack.length = 0;
  log.length = 0;
  render();
}
