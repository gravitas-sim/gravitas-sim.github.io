// The words of putting an investigation back (js/i18n/en.reset.js): the reset
// control beside the progress bar, its reason when it is off, and the sandbox's
// own rail controls while an investigation is open. The two actions are
// "Reset the scene" (answers untouched) and "Start this investigation over"
// (js/investigations/restart.js); nothing else here is a third.

import { onLocaleChange, registerMessages, t } from '../i18n/index.js';
import { EN_RESET } from '../i18n/en.reset.js';
import { ES_RESET } from '../i18n/es.reset.js';

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

/** The last step state handed to syncReset, for a change of language. */
let shown = null;

/**
 * Name the reset control for the step in force; off, with the reason as text,
 * where there is nothing to rebuild (no scene and no instrument).
 * @param {{scene: boolean, tool: boolean, kind?: string}} step - what the step has
 */
export function syncReset(step) {
  shown = step;
  const button = $('investigationResetScenario');
  const why = $('investigationResetWhy');
  if (!button) return;
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
  if (shown) syncReset(shown);
  if (leaving) railWords();
});
