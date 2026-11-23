// =============================================================================
// Follow this body: the inspector's toggle for following one body by id
// -----------------------------------------------------------------------------
// Follow Mode (the settings panel) chooses a body by its type; this names one.
// The followed id lives beside the frame in js/referenceFrame.js, the engine
// puts the camera on it (applyFollow in js/engine/step.js, the same camera and
// offset rule as Follow Mode), and choosing it clears Follow Mode as choosing
// Follow Mode clears it. A merger moves the follow to the product (js/ui.js,
// beside transferFrame); a body that has gone ends it, and that is said once.
// Loaded with the inspector, which is the only place a follow by id starts.
// =============================================================================

import {
  followBody,
  followedBodyId,
  onFollowChange,
} from './referenceFrame.js';
import { barycenterBodies } from './physics.js';
import { state, SETTINGS, commitSettings } from './appState.js';
import { t, registerMessages } from './i18n/index.js';
import { announce } from './notify.js';
import { EN_FOLLOW } from './i18n/en.follow.js';
import { ES_FOLLOW } from './i18n/es.follow.js';

registerMessages('en', EN_FOLLOW, true);
registerMessages('es', ES_FOLLOW, true);

const ICON =
  '<svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true" focusable="false">' +
  '<g fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round">' +
  '<circle cx="8" cy="8" r="4.2"></circle><path d="M8 1v3M8 12v3M1 8h3M12 8h3"></path>' +
  '</g></svg>';

/** @returns {?HTMLElement} The toggle, made once beside the pin */
function button() {
  let btn = document.getElementById('inspectorFollow');
  if (btn) return btn;
  const pin = document.getElementById('inspectorPin');
  if (!pin) return null;
  btn = document.createElement('button');
  btn.id = 'inspectorFollow';
  btn.type = 'button';
  btn.className = 'inspector-pin inspector-follow';
  btn.innerHTML = ICON;
  btn.addEventListener('click', toggle);
  pin.before(btn);
  return btn;
}

/** Start or stop following the selected body. */
function toggle(event) {
  event?.preventDefault();
  event?.stopPropagation();
  const body = state.selectedObject?.object;
  if (!body) return;
  if (followedBodyId() === body.id) {
    followBody(null);
    return;
  }
  // Follow Mode and a follow by id are one camera: this clears the other.
  if (SETTINGS.follow_mode !== 'None')
    commitSettings('follow-body', { follow_mode: 'None' });
  followBody(body.id);
}

/** Bring the toggle in line with the selection and the follow. */
export function paintFollow() {
  const btn = button();
  if (!btn) return;
  const body = state.selectedObject?.object;
  const on = !!body && followedBodyId() === body.id;
  btn.setAttribute('aria-pressed', on ? 'true' : 'false');
  btn.setAttribute('aria-label', t('follow.label'));
  btn.title = t('follow.hint');
  btn.hidden = !body;
}

const nameOf = id => barycenterBodies().find(b => b && b.id === id)?.name || '';
let lastName = '';

onFollowChange(({ id, why, name }) => {
  paintFollow();
  if (why === 'reset') return;
  const now = id === null ? '' : nameOf(id);
  const said = {
    set: ['follow.on', now],
    merged: ['follow.merged', now],
    stop: ['follow.off', lastName],
    lost: ['follow.lost', name || lastName],
    mode: ['follow.mode', lastName],
  }[why];
  if (said) announce(t(said[0], { body: said[1] }));
  lastName = now;
});
