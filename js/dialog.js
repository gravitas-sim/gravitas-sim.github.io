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
// One open, one close, and the four behaviors that have to come with them:
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
// Every modal in the application opens here (tests/dialogInventory.test.js
// holds index.html to that). Most of them are a dialog inside a full-screen
// backdrop, and two options cover what those had each written for themselves:
//
//   - `backdrop` is the element that is shown and hidden around the dialog,
//     and a click on it, outside the dialog, closes it
//   - `isolate` makes the rest of the page inert while the dialog is open, so
//     a screen reader cannot browse what the backdrop covers. js/focusTrap.js
//     did this for three of them, and it is gone
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

/** What is shown and hidden: the backdrop around the panel, or the panel. */
const hostOf = panel => wired.get(panel)?.host || panel;

/** @param {HTMLElement} panel - The dialog @returns {boolean} Whether it is open */
export const isOpen = panel => Boolean(panel) && hostOf(panel).hidden === false;

/** Live regions are left alone: an announcement made over a dialog is heard. */
const LIVE = '[aria-live], [role="status"], [role="alert"], [role="log"]';

/**
 * Make everything outside the dialog inert, and say how to undo exactly that.
 *
 * Walks the body's children rather than the whole tree: the dialog lives under
 * one of them, and marking that one would hide the dialog too. A node that was
 * already inert - a closed dialog is - is left as it was and is not touched
 * on the way back, so closing one dialog never opens another's closed panel.
 *
 * @param {HTMLElement} host - The element that holds the dialog
 * @returns {Function} Put back what this changed
 */
function isolate(host) {
  let top = host;
  while (top.parentElement && top.parentElement !== document.body) {
    top = top.parentElement;
  }
  const changed = [];
  for (const node of document.body.children) {
    if (node === top || node.tagName === 'SCRIPT') continue;
    if (node.hasAttribute('inert') || node.matches(LIVE)) continue;
    const aria = !node.hasAttribute('aria-hidden');
    node.setAttribute('inert', '');
    if (aria) node.setAttribute('aria-hidden', 'true');
    changed.push([node, aria]);
  }
  return () => {
    for (const [node, aria] of changed) {
      node.removeAttribute('inert');
      if (aria) node.removeAttribute('aria-hidden');
    }
  };
}

/** The element initialFocus names: a selector, an element, or a function. */
const named = (panel, wanted) => {
  const el = typeof wanted === 'function' ? wanted() : wanted;
  return typeof el === 'string' ? panel.querySelector(el) : el || null;
};

/**
 * Open a panel as a modal dialog.
 *
 * @param {HTMLElement} panel - The dialog element
 * @param {object} [opts] - Options
 * @param {HTMLElement} [opts.trigger] - What to put focus back on when it closes
 * @param {string|HTMLElement|Function} [opts.initialFocus] - The first control
 *   to focus: a selector, an element, or a function returning either, asked
 *   after the panel is shown
 * @param {Function} [opts.onClose] - Called after every close, with the reason
 * @param {HTMLElement} [opts.backdrop] - The element shown and hidden around
 *   the panel, if it is not the panel itself; a click on it closes the dialog
 * @param {boolean} [opts.isolate] - Make the rest of the page inert while open
 */
export function openDialog(
  panel,
  { trigger, initialFocus, onClose, backdrop, isolate: alone } = {}
) {
  const host = backdrop || hostOf(panel || document.body);
  if (!panel || host.hidden === false) return;

  const record = {
    trigger: trigger ?? document.activeElement,
    onClose,
    host,
    closing: false,
  };
  wired.set(panel, { ...(wired.get(panel) || {}), ...record });

  host.hidden = false;
  host.removeAttribute('inert');
  panel.setAttribute('aria-modal', 'true');
  panel.setAttribute('role', 'dialog');
  if (alone) wired.get(panel).restore = isolate(host);

  // The class is the animation; `hidden` above is the semantics. Removed on the
  // next frame so the browser has a chance to lay the panel out first and the
  // transition actually runs from its closed state. Unless it has been closed
  // before that frame came - under load an Escape can beat it - because the
  // close has already put the class back, and taking it off again now would
  // leave the panel on screen and inert, and never hidden.
  //
  // Where the class is what hides it - display: none, as every backdrop here
  // is - there is no transition to wait a frame for, and the panel has to be
  // laid out now: the first control cannot take focus inside a box that is
  // not rendered.
  if (reducedMotion() || getComputedStyle(host).display === 'none')
    host.classList.remove('hidden');
  else
    requestAnimationFrame(
      () => wired.get(panel).closing || host.classList.remove('hidden')
    );

  if (!wired.get(panel).keydown) {
    // Where a Tab pressed inside the panel wraps to if the browser takes it
    // outside, from the keydown until the browser has acted on it. See the
    // last branch of keydown below.
    let wrapTo = null;
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
      if (
        event.shiftKey &&
        (active === first || active === panel || !panel.contains(active))
      ) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      } else {
        // Not an edge by this list, so the browser moves focus by its own -
        // and its list can be shorter. Safari's default, and WebKit's on
        // macOS, is to Tab only between text fields and pop-up menus, skipping
        // buttons and links unless Option is held. The precise-placement form
        // ends in two buttons, so a Safari reader never reached `last`, the
        // branch above never ran, and Tab from the mass field went straight
        // into the page behind: over a lesson, into its answer boxes. So note
        // the end this Tab would wrap to, and let focusin below send a move
        // that leaves the panel there instead. The browser still chooses the
        // stops; it just cannot choose one outside.
        wrapTo = event.shiftKey ? last : first;
        setTimeout(() => {
          // Unless the Tab took focus out of the page altogether, to the
          // browser's toolbar: that is where Safari goes after the last field
          // it stops on. The next focus to arrive is then the browser bringing
          // it back in at the top of the page, which over a lesson is the
          // lesson's answer boxes, behind Settings and the builder.
          if (document.activeElement !== document.body) wrapTo = null;
        });
      }
    };
    // Only a Tab from inside the panel is sent back. A click on the page is
    // left alone - the precise-placement form has no scrim on purpose, so the
    // world stays in reach behind it - and so is focus leaving for the
    // browser's own toolbar, which a modal is allowed to let go to. Where it
    // comes back to is sent back, by the timer above. A panel on
    // its way out is still `isOpen` until its transition ends, but it is inert
    // from the moment closeDialog runs, and focus is not sent back into it.
    const focusin = event => {
      const to = wrapTo;
      // The first move after the keydown is the Tab's own, wherever it went.
      // Disarmed here as well as by the timer, because under load a click can
      // arrive before the timer runs, and it is not the Tab's to send back.
      wrapTo = null;
      if (!to || !isOpen(panel) || wired.get(panel).closing) return;
      if (!panel.contains(event.target)) to.focus();
    };
    panel.addEventListener('keydown', keydown);
    // A press on the backdrop itself, not on anything inside the panel.
    if (host !== panel)
      host.addEventListener('click', event => {
        if (event.target === host && isOpen(panel))
          closeDialog(panel, 'backdrop');
      });
    document.addEventListener('focusin', focusin, true);
    // A click is never the Tab's, not even one after a trip to the toolbar.
    document.addEventListener('pointerdown', () => (wrapTo = null), true);
    wired.set(panel, { ...wired.get(panel), keydown });
  }

  // Focusable itself, so that a click inside it leaves focus inside it. A
  // click on its text, in any browser, or on one of its buttons in Safari,
  // which does not focus a clicked button, used to put focus on <body>. From
  // there Escape never reached the keydown listener above, and Shift+Tab
  // walked out into the page behind.
  if (!panel.hasAttribute('tabindex')) panel.setAttribute('tabindex', '-1');

  // Focus the first thing worth acting on. Named by the caller when the
  // sensible first control is not simply the first one in the markup.
  const wanted = initialFocus && named(panel, initialFocus);
  const target = wanted || focusable(panel)[0] || panel;
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
 * @param {object} [opts] - Options
 * @param {boolean} [opts.returnFocus] - False when the caller is about to put
 *   focus somewhere else itself, as opening a lesson from its card does
 */
export function closeDialog(
  panel,
  reason = 'close',
  { returnFocus = true } = {}
) {
  // Never opened here is never open here: a panel inside a backdrop is not
  // hidden itself, and closing it would hide it inside the next open.
  if (!panel || !wired.has(panel) || !isOpen(panel)) return;
  const record = wired.get(panel);
  // Already on its way out: a second close - Escape, and then the
  // application's Escape after it - must not report a second reason.
  if (record.closing) return;
  record.closing = true;
  const host = hostOf(panel);

  host.classList.add('hidden');
  // Inert immediately: the panel is on its way out and must stop being
  // reachable now, not when the animation finishes.
  host.setAttribute('inert', '');
  panel.setAttribute('aria-modal', 'false');
  // And the page behind it back before focus goes there.
  record.restore?.();
  record.restore = null;

  const finish = () => {
    if (!wired.get(panel)?.closing) return; // reopened mid-transition
    host.hidden = true;
  };
  // Nothing to wait for when the class hides it outright, or when nothing is
  // animating it at all: the lecture sheet and the shortcut list have no
  // closing transition, and would sit on screen, inert, until the timer.
  const still =
    getComputedStyle(host).display === 'none' ||
    (typeof host.getAnimations === 'function' && !host.getAnimations().length);
  if (reducedMotion() || still) finish();
  else {
    let done = false;
    const once = () => {
      if (done) return;
      done = true;
      host.removeEventListener('transitionend', once);
      finish();
    };
    host.addEventListener('transitionend', once);
    // A panel with no transition at all fires no transitionend, and a reader
    // must not be left with an invisible panel still in the tab order.
    setTimeout(once, 600);
  }

  // Focus goes back where it came from. If it cannot - the trigger has been
  // hidden behind a collapsed menu since the dialog opened, which happens at
  // phone widths - then anywhere is better than inside a panel that is on its
  // way to display:none, because focus left there is focus nowhere.
  const trigger = returnFocus && record.trigger;
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
