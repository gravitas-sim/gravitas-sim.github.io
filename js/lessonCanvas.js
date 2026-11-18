// What the canvas behind a lesson is for: the half that touches the page. The
// declaration and its rules are js/lesson/canvasKind.js. Fetched only by a
// lesson that declares a canvas, so every other lesson is exactly as it was.
//   portrait  the picture is held still and described as a picture
//   quiet     the world is emptied, the rail and the playback bar fold behind
//             their toggles, and nothing on the page asks for the scene

import { canvasAt } from './lesson/canvasKind.js';
import { command } from './appState.js';
import { onLocaleChange, registerMessages, t } from './i18n/index.js';
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
const TOGGLES = '.rail-section-toggle[aria-expanded="true"]';

let now = null;
let was = null;
let owns = false;
let railWas = null;
let fold = null;
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
  if (fold) paintFold();
}

/** Close the open rail section the way a reader would; leaving opens it again. */
function railFold(on) {
  if (on) {
    const open = document.querySelector(TOGGLES);
    if (!open || railWas) return;
    railWas = open.id;
    open.click();
  } else if (railWas) {
    if (!document.querySelector(TOGGLES)) $(railWas)?.click();
    railWas = null;
  }
}

/** The playback toggle: its name, a triangle for the state, and the state. */
function paintFold() {
  const open = !$('timelineBar').classList.contains('is-folded');
  const mark = document.createElement('span');
  mark.setAttribute('aria-hidden', 'true');
  mark.textContent = open ? ' ▾' : ' ▸';
  fold.replaceChildren(t('inv.canvas.playback'), mark);
  fold.title = t('inv.canvas.playback.hint');
  fold.setAttribute('aria-expanded', String(open));
}

/** Tuck the playback bar behind a toggle of its own: it has none. */
function barFold(on) {
  const bar = $('timelineBar');
  if (!bar) return;
  if (!on) {
    fold?.remove();
    fold = null;
    bar.classList.remove('is-folded');
    return;
  }
  if (fold) return;
  fold = document.createElement('button');
  fold.type = 'button';
  fold.id = 'timelineFold';
  fold.className = 'timeline-btn timeline-fold';
  fold.addEventListener('click', () => {
    bar.classList.toggle('is-folded');
    paintFold();
  });
  bar.prepend(fold);
  if (bar.contains(document.activeElement)) fold.focus();
  bar.classList.add('is-folded');
  paintFold();
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
  railFold(quiet);
  barFold(quiet);
  words();
}

/** Hand the page back as the lesson found it. */
export function leaveCanvas() {
  enterCanvas(null);
  was = null;
  owns = false;
}

onLocaleChange(() => now && words());
