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

/** The canvas's text description and the reset control's name, for the kind in force. */
function words() {
  const canvas = $('simulationCanvas');
  const reset = $('investigationResetScenario');
  const kind = now?.kind;
  const said = kind === 'portrait' || kind === 'quiet';
  was ??= {
    label: canvas?.getAttribute('aria-label'),
    by: canvas?.getAttribute('aria-describedby'),
    reset: reset?.getAttribute('aria-label'),
    title: reset?.getAttribute('title'),
  };
  put(
    canvas,
    'aria-label',
    said ? t(`inv.canvas.${kind}`, { what: now.picture }) : was.label
  );
  put(canvas, 'aria-describedby', said ? null : was.by);
  const name = said ? t(`inv.canvas.reset.${kind}`) : null;
  put(reset, 'aria-label', name ?? was.reset);
  put(reset, 'title', name ?? was.title);
  const label = more?.firstChild;
  if (label) label.textContent = t('rail.mainControls.label');
}

/**
 * Tuck the sandbox's rail and playback bar behind one More, the disclosure
 * every other fold in the lesson layout is (js/settingsSchema.js wireMore): a
 * native <details>, shut until the reader opens it, remembered under its own
 * surface in the one disclosure preference and announced through the live
 * region. The two elements are moved into it and put back where they were, so
 * a closed More takes them out of the Tab order as well as out of sight.
 */
function chromeFold(on) {
  if (!on) {
    for (const [el, mark] of marks) mark.replaceWith(el);
    marks.clear();
    more?.remove();
    more = null;
    return;
  }
  if (more) return;
  more = document.createElement('details');
  more.id = 'stageMore';
  more.className = 'more stage-more';
  more.append(document.createElement('summary'));
  const body = document.createElement('div');
  more.append(body);
  const held = document.activeElement;
  for (const id of ['mainControls', 'timelineBar']) {
    const el = $(id);
    if (!el) continue;
    const mark = document.createComment(id);
    el.replaceWith(mark);
    marks.set(el, mark);
    body.append(el);
  }
  document.body.append(more);
  wireMore(more, 'stage', { say: announce, locale: getLocale });
  if (body.contains(held)) more.firstChild.focus();
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
