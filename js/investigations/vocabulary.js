// The words of putting an investigation back (js/i18n/en.reset.js): the reset
// control beside the progress bar, its reason when it is off, and the sandbox's
// own rail controls while an investigation is open. The two actions are
// "Reset the scene" (answers untouched) and "Start this investigation over"
// (js/investigations/restart.js); nothing else here is a third. It also says
// where the scene is not kept: the record holds answers, readings, slider
// settings and hints, and a scene is rebuilt from the start of its step. The
// note shows when the student has paused the run or added, removed or merged a
// body on a step that has a scene, and on coming back to one.

import { onLocaleChange, registerMessages, t } from '../i18n/index.js';
import { EN_RESET } from '../i18n/en.reset.js';
import { ES_RESET } from '../i18n/es.reset.js';
import { state } from '../appState.js';
import { EV_OBJECT_PLACED } from '../names.js';
import {
  asteroids,
  bh_list,
  comets,
  gas_giants,
  neutron_stars,
  planets,
  stars,
  white_dwarfs,
} from '../physics.js';
import { sceneContext } from './stepView.js';

registerMessages('en', EN_RESET);
registerMessages('es', ES_RESET);

const $ = id => document.getElementById(id);

/** The rail controls an open investigation does not own, by element id and message key. */
const RAIL = {
  refreshScenarioBtn: 'rail.refreshScenario',
  resetAllBtn: 'rail.resetAll',
  cleanSimBtn: 'rail.cleanSim',
};

/** What each rail control was bound to, so closing hands it back exactly. */
const bound = new Map();
let leaving = false;

function railWords() {
  for (const [id, key] of Object.entries(RAIL)) {
    const el = $(id);
    if (!el) continue;
    if (!bound.has(id)) bound.set(id, { ...el.dataset });
    delete el.dataset.i18n;
    delete el.dataset.i18nTitle;
    el.textContent = t('reset.leave', { what: t(key) });
    el.title = t('reset.leave.hint', { what: t(`${key}.hint`) });
  }
}

/**
 * The rail's sandbox controls, named for what they do to an open investigation:
 * they leave its scene. Outside an investigation they are as they always were.
 * @param {boolean} on - An investigation is open
 */
export function railLeavesScene(on) {
  leaving = on;
  if (on) return railWords();
  for (const [id, key] of Object.entries(RAIL)) {
    const el = $(id);
    const was = bound.get(id);
    if (!el || !was) continue;
    Object.assign(el.dataset, { i18n: was.i18n, i18nTitle: was.i18nTitle });
    el.textContent = t(key);
    el.title = t(`${key}.hint`);
  }
  bound.clear();
}

/** How many bodies are in the world. */
const bodies = () =>
  [
    stars,
    planets,
    gas_giants,
    asteroids,
    comets,
    bh_list,
    neutron_stars,
    white_dwarfs,
  ].reduce((n, l) => n + l.length, 0);

/** The scene as a step drew it: the run paused or not, how many bodies, whether the student placed one. */
let start = { paused: false, count: 0, at: 0, placed: false };
/** An instrument settling in puts bodies in the scene for a moment: only later changes are the student's. */
const SETTLE_MS = 3000;
window.addEventListener(EV_OBJECT_PLACED, () => (start.placed = true));
const changed = () =>
  state.paused !== start.paused ||
  start.placed ||
  (Date.now() - start.at > SETTLE_MS && bodies() !== start.count);
const rebase = () =>
  (start = {
    paused: state.paused,
    count: bodies(),
    at: Date.now(),
    placed: false,
  });

let timer = 0;
let open = null;
let at = -1;
let has = false;
let said = '';
let el = null;

const draw = () => {
  if (!el) return;
  el.textContent = said && t(said);
  el.hidden = !said;
};

const say = key => {
  said = key;
  if (!el?.isConnected)
    el = document
      .getElementById('investigationSaveStatus')
      ?.insertAdjacentElement(
        'afterend',
        Object.assign(document.createElement('p'), {
          className: 'inv-save-status',
          hidden: true,
        })
      );
  el?.setAttribute('role', 'status');
  el?.setAttribute('data-state', 'scene');
  draw();
};

function tick() {
  if (!sceneContext().id) {
    clearInterval(timer);
    timer = open = 0;
    say('');
  } else if (has && !said && changed()) say('saved.scene.leave');
  // The scene is back as it was drawn (a reset): nothing left to warn of.
  else if (said === 'saved.scene.leave' && !changed()) say('');
  if (Date.now() - start.at <= SETTLE_MS) start.count = bodies();
}

/**
 * A step was drawn: take its scene as the one to compare against, and say so
 * if this is a return to a step that has one. Drawn again (an instrument
 * arriving, a language) it is the same step: what was said stands.
 * @param {{scene: boolean}} step - What the step has
 */
function noteScene({ scene }) {
  const { id, n, i } = sceneContext();
  const again = id === open && i === at;
  const back = id !== open && (i > 0 || n > 1);
  open = id;
  at = i;
  has = scene;
  if (!again || !said) rebase();
  if (!again) say(scene && back ? 'saved.scene.back' : '');
  timer ||= setInterval(tick, 1000);
}

/** The last step state handed to syncReset, for a change of language. */
let shown = null;

/**
 * Name the reset control for the step in force; off, with the reason as text,
 * where there is nothing to rebuild (no scene and no instrument).
 * @param {{scene: boolean, tool: boolean, kind?: string}} step - what the step has
 */
export function syncReset(step) {
  shown = step;
  noteScene(step);
  paintReset(step);
}

function paintReset(step) {
  const button = $('investigationResetScenario');
  const why = $('investigationResetWhy');
  if (!button) return;
  // Resetting the scene puts it back as drawn: nothing left to warn of.
  if (!button.dataset.noted) {
    button.dataset.noted = 1;
    button.addEventListener('click', () => (rebase(), say('')));
  }
  const off = !step.scene && !step.tool;
  button.disabled = off;
  const kind = step.kind === 'portrait' || step.kind === 'quiet';
  button.title = t(kind ? `inv.canvas.reset.${step.kind}` : 'reset.scene.hint');
  button.querySelector('[data-i18n]').textContent = t('reset.scene');
  if (off) button.setAttribute('aria-describedby', 'investigationResetWhy');
  else button.removeAttribute('aria-describedby');
  if (why) {
    why.textContent = off ? t('reset.scene.none') : '';
    why.hidden = !off;
  }
}

/** The toast that says what a scene reset did: the scene, the instrument or both. */
export const resetSaid = step =>
  t(`reset.did.${step.scene ? (step.tool ? 'both' : 'scene') : 'tool'}`);

onLocaleChange(() => {
  draw();
  if (shown) paintReset(shown);
  if (leaving) railWords();
});
