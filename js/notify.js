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

// --- Screen-reader announcements ---------------------------------------------
// The canvas is opaque to assistive technology, so anything that only shows up
// visually gets mirrored into a polite live region.
let lastAnnouncement = '';

/**
 * Announce a state change to screen readers.
 * @param {string} message - Text to announce
 */
export function announce(message) {
  if (message === lastAnnouncement) return;
  lastAnnouncement = message;
  const el = document.getElementById('srStatus');
  if (el) el.textContent = message;
}

// --- Toasts -------------------------------------------------------------------
let toastTimer = null;

/**
 * Show a brief status message.
 * @param {string} message - Text to display
 */
export function toast(message) {
  let el = document.getElementById('gravitasToast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'gravitasToast';
    el.className = 'toast';
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    document.body.appendChild(el);
  }
  el.textContent = message;
  el.classList.add('is-visible');
  announce(message);
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('is-visible'), 2200);
}
