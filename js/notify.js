// =============================================================================
// Notifications
// -----------------------------------------------------------------------------
// A toast and a screen-reader live region. Two functions with no dependency on
// anything in the application - they take a string and touch the DOM.
//
// They lived in js/controls.js, which is a large module full of button wiring,
// and js/share.js and js/exportDialog.js imported them from there. Since
// js/controls.js imports both of those modules back, a call to toast() was
// enough to close an import cycle. Nothing else about them has changed.
// =============================================================================

import { t } from './i18n/index.js';

// --- Screen-reader announcements ---------------------------------------------
// The canvas is opaque to assistive technology, so anything that only shows up
// visually gets mirrored into a polite live region.

/**
 * Announce a state change to screen readers.
 *
 * The same words again are not read, so a repeat gains or drops a trailing
 * no-break space. A caller that can fire unprompted passes `again` false.
 *
 * @param {string} message - Text to announce
 * @param {boolean} [again=true] - Say it even if it is what was said last
 */
export function announce(message, again = true) {
  const el = document.getElementById('srStatus');
  if (!el || (!again && el.textContent.trim() === message)) return;
  el.textContent = el.textContent === message ? `${message}\u00a0` : message;
}

// --- Toasts -------------------------------------------------------------------
let toastTimer = null;

/**
 * Show a brief status message.
 *
 * With an action - a failed load, say - the message waits for the reader: ten
 * seconds, a button that does the thing again, and Escape to dismiss it. The
 * message is announced once, by the same call, and the button is reachable
 * because the toast stays in the DOM until it hides.
 *
 * @param {string} message - Text to display
 * @param {{label: string, run: Function}} [action] - A button to offer
 */
export function toast(message, action) {
  let el = document.getElementById('gravitasToast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'gravitasToast';
    el.className = 'toast';
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    document.body.appendChild(el);
  }
  const hide = () => {
    el.classList.remove('is-visible', 'has-action');
    document.removeEventListener('keydown', onKey);
  };
  const onKey = e => e.key === 'Escape' && hide();
  el.textContent = message;
  el.classList.add('is-visible');
  el.classList.toggle('has-action', !!action);
  if (action) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'ui-button';
    b.textContent = action.label;
    b.onclick = () => {
      hide();
      action.run();
    };
    el.append(' ', b);
    document.addEventListener('keydown', onKey);
  }
  announce(message);
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(hide, action ? 10000 : 2200);
}

let failedAt = 0;

/**
 * Say that something the reader asked for could not be loaded, and offer the
 * request again. The one presentation a failed lazy chunk gets.
 *
 * A browser keeps a failed module fetch for the life of the page, so asking
 * again at once for the same module cannot work; a second failure within
 * fifteen seconds offers a reload instead of a button that would fail the same
 * way. Saved work is in storage and survives it.
 *
 * @param {Function} retry - Does the request again
 */
export function loadFailed(retry) {
  const again = Date.now() - failedAt > 15000;
  failedAt = Date.now();
  toast(t(again ? 'failure.load' : 'failure.reload'), {
    label: t(again ? 'failure.retry' : 'failure.reloadNow'),
    run: again ? retry : () => location.reload(),
  });
}
