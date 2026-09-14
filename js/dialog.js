// =============================================================================
// Opening and closing a modal panel, once, in one place
// -----------------------------------------------------------------------------
// The settings panel used to be opened and closed by four separate lines that
// each added or removed a class. The class dimmed the panel, moved it, blurred
// it and turned off pointer events - and left `display: flex` and
// `visibility: visible` alone. So a closed panel was still a panel: six
// tabbable controls in the tab order, the whole thing in the accessibility
// tree, announced to a screen reader as a dialog that was not there. A keyboard
// reader pressing Tab from the toolbar fell into a settings form they could not
// see.
//
// Opacity is a picture of being closed. `hidden` and `inert` are the thing
// itself, and this is where they get applied.
//
// What this module is for
// -----------------------------------------------------------------------------
// One open, one close, and the four behaviours that have to come with them:
//
//   - the closed panel is `hidden` (display: none) and `inert`, so it is in
//     neither the tab order nor the accessibility tree
//   - the open panel is `aria-modal="true"` and keeps focus inside itself,
//     because it covers the screen and pauses the simulation - it is modal in
//     every way except the attribute, and saying otherwise misleads the only
//     readers who depend on the attribute
//   - Escape closes it, and every close puts focus back on the control that
//     opened it. A reader who opens a dialog and closes it should be where
//     they were, not at the top of the document
//   - a reader who has asked for less motion does not wait on a transition
//     that is not going to run
//
// It knows nothing about settings, or about the simulation. It takes an
// element and a trigger, which is what makes it testable and what keeps it
// from acquiring an import back up to the coordinator.
// =============================================================================

/** Everything that can hold focus, in document order. */
const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

/** What the panel currently offers, skipping anything not rendered. */
function focusable(panel) {
  return [...panel.querySelectorAll(FOCUSABLE)].filter(
    el => el.offsetParent !== null || el === document.activeElement
  );
}

/** @returns {boolean} Whether the reader has asked for less motion */
const reducedMotion = () =>
  typeof matchMedia === 'function' &&
  matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Per-panel bookkeeping, so a second open does not install a second listener. */
const wired = new WeakMap();

/** @param {HTMLElement} panel - The dialog @returns {boolean} Whether it is open */
export const isOpen = panel => Boolean(panel) && panel.hidden === false;

/**
 * Open a panel as a modal dialog.
 *
 * @param {HTMLElement} panel - The dialog element
 * @param {object} [opts] - Options
 * @param {HTMLElement} [opts.trigger] - What to put focus back on when it closes
 * @param {string} [opts.initialFocus] - Selector for the first control to focus
 * @param {Function} [opts.onClose] - Called after every close, with the reason
 */
export function openDialog(panel, { trigger, initialFocus, onClose } = {}) {
  if (!panel || isOpen(panel)) return;

  const record = { trigger: trigger ?? document.activeElement, onClose };
  wired.set(panel, { ...(wired.get(panel) || {}), ...record });

  panel.hidden = false;
  panel.removeAttribute('inert');
  panel.setAttribute('aria-modal', 'true');
  panel.setAttribute('role', 'dialog');

  // The class is the animation; `hidden` above is the semantics. Removed on the
  // next frame so the browser has a chance to lay the panel out first and the
  // transition actually runs from its closed state.
  if (reducedMotion()) panel.classList.remove('hidden');
  else requestAnimationFrame(() => panel.classList.remove('hidden'));

  if (!wired.get(panel).keydown) {
    const keydown = event => {
      if (!isOpen(panel)) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        closeDialog(panel, 'escape');
        return;
      }
      if (event.key !== 'Tab') return;
      // The trap. A modal that covers the screen and pauses the world must not
      // let Tab wander out into a page the reader cannot see or reach.
      const items = focusable(panel);
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || !panel.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };
    panel.addEventListener('keydown', keydown);
    wired.set(panel, { ...wired.get(panel), keydown });
  }

  // Focus the first thing worth acting on. Named by the caller when the
  // sensible first control is not simply the first one in the markup.
  const wanted = initialFocus && panel.querySelector(initialFocus);
  const target = wanted || focusable(panel)[0] || panel;
  if (target === panel && !panel.hasAttribute('tabindex')) {
    panel.setAttribute('tabindex', '-1');
  }
  target.focus({ preventScroll: true });
}

/**
 * Close a panel, and put focus back where it came from.
 *
 * The `hidden` attribute is set after the closing transition rather than with
 * it, so the panel animates out instead of vanishing - but a reader who has
 * asked for less motion is not made to wait for a transition that will not
 * run, and neither is a test.
 *
 * @param {HTMLElement} panel - The dialog element
 * @param {string} [reason] - Passed to onClose: 'apply', 'cancel', 'escape', ...
 */
export function closeDialog(panel, reason = 'close') {
  if (!panel || !isOpen(panel)) return;
  const record = wired.get(panel) || {};

  panel.classList.add('hidden');
  // Inert immediately: the panel is on its way out and must stop being
  // reachable now, not when the animation finishes.
  panel.setAttribute('inert', '');
  panel.setAttribute('aria-modal', 'false');

  const finish = () => {
    if (!panel.classList.contains('hidden')) return; // reopened mid-transition
    panel.hidden = true;
  };
  if (reducedMotion()) finish();
  else {
    let done = false;
    const once = () => {
      if (done) return;
      done = true;
      panel.removeEventListener('transitionend', once);
      finish();
    };
    panel.addEventListener('transitionend', once);
    // A panel with no transition at all fires no transitionend, and a reader
    // must not be left with an invisible panel still in the tab order.
    setTimeout(once, 600);
  }

  // Focus goes back where it came from. If it cannot - the trigger has been
  // hidden behind a collapsed menu since the dialog opened, which happens at
  // phone widths - then anywhere is better than inside a panel that is on its
  // way to display:none, because focus left there is focus nowhere.
  const trigger = record.trigger;
  if (trigger && typeof trigger.focus === 'function' && trigger.isConnected) {
    trigger.focus({ preventScroll: true });
  }
  if (panel.contains(document.activeElement)) {
    document.activeElement?.blur?.();
    const body = document.body;
    if (body && !body.hasAttribute('tabindex'))
      body.setAttribute('tabindex', '-1');
    body?.focus?.({ preventScroll: true });
  }
  record.onClose?.(reason);
}
