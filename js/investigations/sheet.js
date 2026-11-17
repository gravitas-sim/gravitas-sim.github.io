// The sheet handle (phone): lowers the lesson sheet to a strip (the stylesheet
// does it, through `body.lesson-peek`), says so, frames the scene again and
// keeps the state in the lesson's progress as `sheet: 'peek'`.

import { getLocale } from '../i18n/index.js';
import { refit } from '../lessonFrame.js';

let peek = false;
let button = null;
let hooks = { announce() {}, save() {} };

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

export function setPeek(on, said = true) {
  if (peek === on) return;
  peek = on;
  paint();
  refit();
  if (said) hooks.announce(words()[peek ? 2 : 3]);
  hooks.save();
}

export const isPeek = () => peek;

/** Wire the handle once; focusing an answer box raises the sheet. */
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

/** A lesson opens: the sheet as it was left, the readout folded to its chip. */
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

export function closeSheet() {
  peek = false;
  paint();
}
