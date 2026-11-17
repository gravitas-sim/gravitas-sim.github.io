// =============================================================================
// The lesson sheet's handle
// -----------------------------------------------------------------------------
// On a phone the lesson is a sheet over the canvas, and the scene it is about
// sat behind it. The handle lowers the sheet to a strip (header, a short window
// of the step, Back and Next) and raises it again; the stylesheet does the
// lowering (`body.lesson-peek` sets the sheet's height, and every panel that
// stands on the sheet follows it). This keeps the state, says it, and frames the
// scene again in the room that was made. The state is saved with the lesson's
// progress (stepView.js) as `sheet: 'peek'`, and only then.
// =============================================================================

import { getLocale } from '../i18n/index.js';
import { refit } from '../lessonFrame.js';

let peek = false;
let button = null;
let hooks = { announce() {}, save() {} };

/** Lower label, raise label, said when lowered, said when raised. */
const words = () =>
  button.dataset[getLocale() === 'es' ? 'es' : 'en'].split('|');

function paint() {
  document.body.classList.toggle('lesson-peek', peek);
  if (!button) return;
  const label = words()[peek ? 1 : 0];
  button.setAttribute('aria-expanded', String(!peek));
  button.setAttribute('aria-label', label);
  button.title = label;
}

/**
 * Lower or raise the sheet.
 *
 * @param {boolean} on - True for the peek
 * @param {boolean} [said] - Whether to announce it
 */
export function setPeek(on, said = true) {
  if (peek === on) return;
  peek = on;
  paint();
  // The room the scene is framed in changed: frame it again unless the reader
  // has the camera.
  refit();
  if (said) hooks.announce(words()[peek ? 2 : 3]);
  hooks.save();
}

/** Whether the sheet is lowered. */
export const isPeek = () => peek;

/**
 * Wire the handle, once. Focusing an answer box raises the sheet: the box is
 * what the step asks for, and a one-line window is no place to type in.
 *
 * @param {object} host - {announce, save}
 * @param {AbortSignal} [signal] - Listeners go with it
 */
export function initSheet(host, signal) {
  button = document.getElementById('investigationSheet');
  hooks = host;
  button?.addEventListener('click', () => setPeek(!peek), { signal });
  document.getElementById('investigationPanel')?.addEventListener(
    'focusin',
    e => {
      if (
        peek &&
        e.target.closest?.('#investigationBody :is(input, textarea, select)')
      )
        setPeek(false);
    },
    { signal }
  );
}

/**
 * A lesson opens: the sheet as the student left it, and the readout, which a
 * lesson has no use for beside the scene, folded to its chip.
 *
 * @param {?string} saved - What the progress says
 */
export function openSheet(saved) {
  peek = saved === 'peek';
  paint();
  const readout = document.getElementById('overlay');
  if (
    window.innerWidth <= 900 &&
    readout &&
    !readout.classList.contains('minimized')
  )
    document.getElementById('overlayMinimize')?.click();
}

/** A lesson closes: the sheet goes back to its reading height. */
export function closeSheet() {
  peek = false;
  paint();
}
