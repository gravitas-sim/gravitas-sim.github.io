// =============================================================================
// The barycenter marker: a lesson's pair, or the user's own choice
// -----------------------------------------------------------------------------
// One cross for the mass-weighted mean position of a set of bodies. A lesson
// names the set by ids (state.barycenterOverlay); the Tools control names it
// by mode (state.barycenterMarker): the whole system, as the barycentric frame
// averages it (barycenterBodies()), or the selected body and its primary, the
// source that pulls hardest on it (dominantPrimary, as the orbit geometry
// overlay chooses it). The point is recomputed from the bodies every frame, so
// a student watches it stay still while two stars swing round it. Drawn in
// screen-space widths as an instrument: nothing is there, so no disc.
// =============================================================================

import { state } from './appState.js';
import {
  barycenterBodies,
  gravitySourcesFor,
  world_to_screen,
} from './physics.js';
import { dominantPrimary } from './orbital.js';
import { barycenterOf } from './lesson/barycenter.js';
import { t, registerMessages } from './i18n/index.js';
import { EN_SCENE } from './i18n/en.scene.js';
import { ES_SCENE } from './i18n/es.scene.js';

// The scene's words (frame, sources, marker) are read on every frame.
registerMessages('en', EN_SCENE);
registerMessages('es', ES_SCENE);

/** Off, the whole system, or the selected body and its primary. */
export const MARKER_MODES = ['off', 'system', 'pair'];
// Beyond this many members the dashed arms are noise; the cross stays.
const MAX_ARMS = 8;

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

function drawCross(ctx, center, members) {
  const c = world_to_screen(center);
  ctx.save();
  ctx.lineWidth = 1.25;
  ctx.strokeStyle = 'rgba(255, 235, 150, 0.85)';
  ctx.setLineDash([4, 4]);
  if (members.length <= MAX_ARMS)
    for (const body of members) {
      const p2 = world_to_screen(body.pos);
      ctx.beginPath();
      ctx.moveTo(c.x, c.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    }
  ctx.setLineDash([]);
  // A cross, not a marker: an aiming point rather than a body.
  const ARM = 7;
  ctx.beginPath();
  ctx.moveTo(c.x - ARM, c.y);
  ctx.lineTo(c.x + ARM, c.y);
  ctx.moveTo(c.x, c.y - ARM);
  ctx.lineTo(c.x, c.y + ARM);
  ctx.stroke();
  ctx.restore();
}

/**
 * Draw the lesson's marker and the user's, writing back what a readout quotes.
 * @param {CanvasRenderingContext2D} ctx - The scene context, world transform off
 */
export function drawBarycentreMarkers(ctx) {
  const lesson = state.barycenterOverlay;
  if (lesson?.active) {
    const ids = lesson.ids || [];
    const members = barycenterBodies().filter(o => ids.includes(o.id));
    const center = members.length >= 2 ? barycenterOf(members) : null;
    if (center) {
      lesson.x = center.x;
      lesson.y = center.y;
      lesson.arms = members.map(o => ({
        id: o.id,
        name: o.name,
        r: Math.hypot(o.pos.x - center.x, o.pos.y - center.y),
      }));
      lesson.separation =
        members.length === 2
          ? Math.hypot(
              members[0].pos.x - members[1].pos.x,
              members[0].pos.y - members[1].pos.y
            )
          : 0;
      drawCross(ctx, center, members);
    }
  }
  const mine = state.barycenterMarker;
  if (!mine || mine.mode === 'off') return;
  const { center, members } = markerPoint(mine.mode);
  mine.members = center ? members.map(b => b.name || '') : [];
  if (center) drawCross(ctx, center, members);
}

/**
 * The marker in words, for the canvas summary, or '' when it is off.
 * @returns {string} One sentence
 */
export function markerSentence() {
  const mine = state.barycenterMarker;
  if (!mine || mine.mode === 'off') return '';
  const names = mine.members || [];
  if (names.length < 2) return t('summary.barycenter.none');
  return mine.mode === 'system'
    ? t('summary.barycenter.system', { n: names.length })
    : t('summary.barycenter.pair', { body: names[0], primary: names[1] });
}

/** Wire the Tools select; the choice lives in state and is never stored. */
export function setupBarycentreControl() {
  const select = document.getElementById('barycenterMarkerSelect');
  if (!select || select.dataset.wired) return;
  select.dataset.wired = '1';
  select.addEventListener('change', () => {
    const mode = MARKER_MODES.includes(select.value) ? select.value : 'off';
    state.barycenterMarker.mode = mode;
    state.barycenterMarker.members = [];
  });
}
