// What the canvas behind a lesson is for: the half that touches the page. The
// declaration and its rules are js/lesson/canvasKind.js. Fetched only by a
// lesson that declares a canvas, so every other lesson is exactly as it was.
//   portrait  the picture is held still and described as a picture
//   quiet     the world is emptied, the rail and the playback bar fold behind
//             one More, and nothing on the page asks for the scene

import { canvasAt } from './lesson/canvasKind.js';
import { command } from './appState.js';
import {
  getLocale,
  onLocaleChange,
  registerMessages,
  t,
} from './i18n/index.js';
import { announce } from './notify.js';
import { wireMore } from './settingsSchema.js';
import { EN_CANVAS } from './i18n/en.canvas.js';
import { ES_CANVAS } from './i18n/es.canvas.js';
import {
  accretion_disk_particles,
  asteroids,
  bh_list,
  bumpWorldGeneration,
  comets,
  galaxies,
  gas_giants,
  getWorldGeneration,
  gravity_ripples,
  neutron_stars,
  planets,
  resetPhysicsObjectCounter,
  stars,
  white_dwarfs,
} from './physics.js';

export { canvasAt };

registerMessages('en', EN_CANVAS);
registerMessages('es', ES_CANVAS);

const $ = id => document.getElementById(id);
const hideObjectInspector = command('hideObjectInspector');

let now = null;
let was = null;
let owns = false;
let more = null;
/** The rail and the bar while they are in the More: element to its place. */
const marks = new Map();
let dock = null;
let seen = 0;

/** A portrait is a picture, so its step holds the clock as a reading step does. */
export const clockStep = (step, kind) =>
  kind === 'portrait' ? { type: 'read' } : step;

/** Whether this module emptied the world, so closing the lesson restores the sandbox. */
export const ownsWorld = () => owns;

/** Every collection a world is made of; physics.js reassigns some, so read them afresh. */
const lists = () => [
  bh_list,
  stars,
  planets,
  gas_giants,
  asteroids,
  comets,
  neutron_stars,
  white_dwarfs,
  galaxies,
  accretion_disk_particles,
  gravity_ripples,
];

/**
 * Empty the canvas, as a stage does before it stands its own scene. The caller
 * has released any model-owned body first (js/lessonScene.js).
 */
function emptyWorld() {
  for (const list of lists()) list.length = 0;
  resetPhysicsObjectCounter();
  bumpWorldGeneration();
  seen = getWorldGeneration();
  hideObjectInspector();
  owns = true;
}

/**
 * Empty the canvas again if the application has built a world under a quiet
 * step (it does, on a cold load after the lesson has opened). A body the
 * reader placed does not rebuild a world, so it stays.
 */
export function keepQuiet() {
  if (now?.kind !== 'quiet' || getWorldGeneration() === seen) return;
  if (lists().some(list => list.length)) emptyWorld();
  else seen = getWorldGeneration();
}

/** Set an attribute, or remove it when the value is null. */
const put = (el, name, value) =>
  value == null ? el?.removeAttribute(name) : el?.setAttribute(name, value);

/** The canvas's text description for the kind in force (the reset control's words are js/investigations/vocabulary.js). */
function words() {
  const canvas = $('simulationCanvas');
  const kind = now?.kind;
  const said = kind === 'portrait' || kind === 'quiet';
  was ??= {
    label: canvas?.getAttribute('aria-label'),
    by: canvas?.getAttribute('aria-describedby'),
  };
  put(
    canvas,
    'aria-label',
    said ? t(`inv.canvas.${kind}`, { what: now.picture }) : was.label
  );
  put(canvas, 'aria-describedby', said ? null : was.by);
  const label = more?.firstChild;
  if (label) label.textContent = t('rail.mainControls.label');
}

/** Tuck the rail and playback bar behind one More, Settings and precise placement beside it (wireMore, surface 'stage'); put them back after. */
function chromeFold(on) {
  if (!on) {
    for (const [el, mark] of marks) mark.replaceWith(el);
    marks.clear();
    dock?.remove();
    dock = more = null;
    return;
  }
  if (more) return;
  dock = document.createElement('div');
  dock.id = 'stageDock';
  dock.className = 'stage-more';
  more = document.createElement('details');
  more.id = 'stageMore';
  more.className = 'more';
  more.append(document.createElement('summary'));
  const body = document.createElement('div');
  more.append(body);
  const held = document.activeElement;
  // Settings and precise placement stay beside the More, not behind it: the
  // keyboard route to placing a body and the way to the settings never wait
  // on a disclosure.
  for (const [id, to] of [
    ['settingsBtn', dock],
    ['precisePlaceBtn', dock],
    ['mainControls', body],
    ['timelineBar', body],
  ]) {
    const el = $(id);
    if (!el) continue;
    const mark = document.createComment(id);
    el.replaceWith(mark);
    marks.set(el, mark);
    to.append(el);
  }
  dock.append(more);
  document.body.append(dock);
  wireMore(more, 'stage', { say: announce, locale: getLocale });
  if (body.contains(held)) more.firstChild.focus();
  else if (dock.contains(held)) held.focus();
}

/**
 * Put the page in the state a step's canvas asks for.
 * @param {?{kind: string, picture: string}} c - canvasAt() for the step, or null
 * @param {boolean} [force] - Empty the world again on a quiet step
 */
export function enterCanvas(c, force = false) {
  const wasQuiet = now?.kind === 'quiet';
  now = c;
  const quiet = c?.kind === 'quiet';
  if (c) document.body.dataset.lessonCanvas = c.kind;
  else delete document.body.dataset.lessonCanvas;
  if (quiet && (force || !wasQuiet)) emptyWorld();
  chromeFold(quiet);
  words();
}

/** Hand the page back as the lesson found it. */
export function leaveCanvas() {
  enterCanvas(null);
  was = null;
  owns = false;
}

onLocaleChange(() => now && words());
