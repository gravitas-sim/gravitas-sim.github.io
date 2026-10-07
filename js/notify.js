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
 * Show a brief status message; with an action, wait ten seconds for it.
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
    el.classList.remove('is-visible');
    document.removeEventListener('keydown', onKey);
  };
  const onKey = e => e.key === 'Escape' && hide();
  el.textContent = message;
  el.classList.add('is-visible');
  if (action) {
    el.append(
      ' ',
      Object.assign(document.createElement('button'), {
        type: 'button',
        className: 'ui-button',
        textContent: action.label,
        onclick: () => (hide(), action.run()),
      })
    );
    document.addEventListener('keydown', onKey);
  }
  announce(message);
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(hide, action ? 10000 : 2200);
}

let failedAt = 0;

/**
 * A load failed: offer it again. A browser keeps a failed module for the life of
 * the page, so a second failure within 15 s offers a reload instead.
 * @param {Function} retry - Does the request again
 * @param {Error} [err] - What the request threw; only a TypeError (the
 *   browser's failed fetch or import) is a load failure
 */
export function loadFailed(retry, err) {
  // A refusal (a draft the panel rejects) is not a network failure, and a
  // Retry could not succeed: say so plainly.
  if (err && !(err instanceof TypeError)) {
    toast(t('inv.load.failed'));
    return;
  }
  const now = Date.now();
  const again = now - failedAt > 15000;
  failedAt = now;
  toast(t(again ? 'failure.load' : 'failure.reload'), {
    label: t(again ? 'failure.retry' : 'update.apply'),
    run: again ? retry : () => location.reload(),
  });
}
