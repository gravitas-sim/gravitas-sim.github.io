// =============================================================================
// The scene in words: its frame, what pulls on what, and the barycenter marker
// -----------------------------------------------------------------------------
// Loaded on first use (js/canvasSummary.js, sceneWords), never at start-up. The
// source line reads the engine's own rule (js/engine/sources.js). The rail
// marker is the mass-weighted mean position of the whole system, or of the
// selected body and its primary (dominantPrimary), recomputed every frame.
// =============================================================================

import { state } from './appState.js';
import {
  barycenterBodies,
  gravitySourcesFor,
  world_to_screen,
  bh_list,
  stars,
  galaxies,
  gas_giants,
  neutron_stars,
  white_dwarfs,
  planets,
  asteroids,
  comets,
  debris,
} from './physics.js';
import { physicsSettings } from './engine/state.js';
import { sceneSources } from './engine/sources.js';
import { dominantPrimary } from './orbital.js';
import { barycenterOf, drawBarycenterCross } from './lesson/barycenter.js';
import { frameState, WORLD, BARYCENTER, OBJECT } from './referenceFrame.js';
import {
  t,
  getLocale,
  registerMessages,
  onLocaleChange,
} from './i18n/index.js';
import { announce } from './notify.js';
import { EN_SCENE } from './i18n/en.scene.js';
import { ES_SCENE } from './i18n/es.scene.js';

// Quiet: they arrive at idle and must not repaint a lesson step being typed in.
registerMessages('en', EN_SCENE, true);
registerMessages('es', ES_SCENE, true);

// The rail control's words live here, not in the start-up catalogs, so its
// markup carries English and data-scene-i18n keys that only this module
// applies: text set in place on the existing nodes, so a choice being made
// keeps its focus and type-ahead (and nothing shows a raw key before this
// module arrives).
function translateControl() {
  for (const el of document.querySelectorAll('[data-scene-i18n]')) {
    const text = t(el.getAttribute('data-scene-i18n'));
    if (el.textContent !== text) el.textContent = text;
  }
  for (const el of document.querySelectorAll('[data-scene-i18n-title]'))
    el.title = t(el.getAttribute('data-scene-i18n-title'));
}
if (typeof document !== 'undefined') {
  translateControl();
  onLocaleChange(translateControl);
}

// --- The frame --------------------------------------------------------------

/**
 * What the readout and the canvas call the frame the picture is drawn in.
 * @param {Array} [bodies] - Live bodies, for a body frame's name
 * @returns {string} World, Barycenter, or the body's name
 */
export function frameName(bodies = barycenterBodies()) {
  const f = frameState();
  if (f.mode === BARYCENTER) return t('frame.barycenter');
  if (f.mode === OBJECT) {
    const body = bodies.find(b => b && b.id === f.objectId);
    if (body && body.alive !== false) return body.name || t('frame.object');
  }
  return t('frame.world');
}

/**
 * The frame in one line, saying the trails follow it when it is not the world.
 * @param {Array} [bodies] - Live bodies
 * @returns {string} The line
 */
export function frameLine(bodies = barycenterBodies()) {
  const name = frameName(bodies);
  const world = frameState().mode === WORLD;
  return t(world ? 'frame.line' : 'frame.line.trails', { name });
}

/** @returns {Array<[string, string]>} The readout's Frame row */
export const frameMetric = () => [[t('readout.frame'), frameName()]];

// --- What pulls on what -----------------------------------------------------

// The readout's count word for each engine list.
const LIST_WORD = {
  bh_list: 'readout.count.blackHoles',
  stars: 'readout.count.stars',
  galaxies: 'readout.count.galaxies',
  gas_giants: 'readout.count.gasGiants',
  neutron_stars: 'readout.count.neutronStars',
  white_dwarfs: 'readout.count.whiteDwarfs',
  planets: 'readout.count.planets',
  asteroids: 'readout.count.asteroids',
  comets: 'readout.count.comets',
  debris: 'readout.count.debris',
};

let lastKey = '';
let lastLine = '';

/**
 * Which bodies pull on others and which only feel gravity, in one line.
 * @param {object} [settings] - mutual_gravity and star_only_gravity in force
 * @returns {string} The statement, or '' for an empty scene
 */
export function sourcesStatement(settings = physicsSettings) {
  const lists = {
    bh_list,
    stars,
    galaxies,
    gas_giants,
    neutron_stars,
    white_dwarfs,
    planets,
    asteroids,
    comets,
    debris,
  };
  const counts = {};
  for (const [k, v] of Object.entries(lists)) counts[k] = v.length;
  const locale = getLocale();
  // The readout is rewritten many times a second; the line changes only
  // with a count, a setting or the language.
  const key = `${Object.values(counts)}|${settings?.mutual_gravity}|${settings?.star_only_gravity}|${locale}`;
  if (key === lastKey) return lastLine;
  const { pulling, feeling } = sceneSources(counts, settings);
  const words = group =>
    group
      .map(({ list, n }) =>
        t('sources.item', {
          kind: t(LIST_WORD[list]).toLocaleLowerCase(locale),
          n,
        })
      )
      .join(t('summary.listSeparator'));
  const parts = [];
  if (pulling.length)
    parts.push(t('sources.pulling', { list: words(pulling) }));
  if (feeling.length)
    parts.push(t('sources.feeling', { list: words(feeling) }));
  lastKey = key;
  lastLine = parts.join(' ');
  return lastLine;
}

// --- The barycenter marker ----------------------------------------------------

/** Off, the whole system, or the selected body and its primary. */
export const MARKER_MODES = ['off', 'system', 'pair'];
const marker = { mode: 'off', members: [] };

/** @returns {{mode: string, members: string[]}} The marker's mode and names */
export const markerState = () => ({ ...marker, members: [...marker.members] });

/** @param {string} mode - One of MARKER_MODES; anything else is off */
export function setMarkerMode(mode) {
  marker.mode = MARKER_MODES.includes(mode) ? mode : 'off';
  marker.members = [];
  const note = document.getElementById('barycenterMarkerNote');
  if (note) note.hidden = marker.mode === 'off';
}

const alive = b => b && b.alive !== false;

/**
 * The bodies a marker mode averages over.
 * @param {string} mode - One of MARKER_MODES
 * @param {?object} selected - The selected body, for 'pair'
 * @returns {Array} Members (empty when there is nothing to average)
 */
export function markerMembers(mode, selected = state.selectedObject?.object) {
  // Refreshes the engine's lists, which gravitySourcesFor reads as they are.
  const bodies = barycenterBodies();
  if (mode === 'system') return bodies.filter(alive);
  if (mode === 'pair' && alive(selected)) {
    const primary = dominantPrimary(selected, gravitySourcesFor(selected));
    return alive(primary) ? [selected, primary] : [];
  }
  return [];
}

/**
 * Where a marker mode's cross goes, and over which bodies.
 * @param {string} mode - One of MARKER_MODES
 * @param {?object} selected - The selected body, for 'pair'
 * @returns {{center: ?{x: number, y: number}, members: Array}} The point
 *   (null with fewer than two members) and the bodies averaged
 */
export function markerPoint(mode, selected = state.selectedObject?.object) {
  const members = markerMembers(mode, selected);
  return {
    center: members.length >= 2 ? barycenterOf(members) : null,
    members,
  };
}

let noPrimary = false;
/**
 * Say under the control, and once aloud, when "Selected body and its primary"
 * has nothing to mark; put the description back when it has.
 * @param {boolean} none - Whether the pair mode has no pair
 */
function noteNoPrimary(none) {
  if (none === noPrimary) return;
  noPrimary = none;
  const note = document.getElementById('barycenterMarkerNote');
  const key = none
    ? 'rail.barycenterMarker.noPrimary'
    : 'rail.barycenterMarker.hint';
  if (note) {
    note.textContent = t(key);
    note.setAttribute('data-scene-i18n', key);
  }
  if (none) announce(t(key), false);
}

/**
 * Draw the rail marker, if on, and keep the names a summary quotes.
 * @param {CanvasRenderingContext2D} ctx - The scene context, world transform off
 */
export function drawMarker(ctx) {
  if (marker.mode === 'off') return noteNoPrimary(false);
  const { center, members } = markerPoint(marker.mode);
  marker.members = center ? members.map(b => b.name || '') : [];
  noteNoPrimary(marker.mode === 'pair' && !center);
  if (center)
    drawBarycenterCross(
      ctx,
      world_to_screen(center),
      members.map(b => world_to_screen(b.pos))
    );
}

/**
 * The marker in words, for the canvas summary, or '' when it is off.
 * @returns {string} One sentence
 */
export function markerSentence() {
  if (marker.mode === 'off') return '';
  const names = marker.members;
  if (names.length < 2) return t('summary.barycenter.none');
  return marker.mode === 'system'
    ? t('summary.barycenter.system', { n: names.length })
    : t('summary.barycenter.pair', { body: names[0], primary: names[1] });
}
