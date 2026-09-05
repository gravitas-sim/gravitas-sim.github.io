// =============================================================================
// Keeping focus inside a modal
// -----------------------------------------------------------------------------
// A dialog that declares aria-modal="true" is promising two things: that a
// screen reader will not read what is behind it, and that Tab will not leave
// it. Three of Gravitas's dialogs declared it and delivered neither - the
// gallery, the share dialog and the investigations browser all let Tab walk out
// into a control rail the reader cannot see, which is disorienting with a
// keyboard and completely lost with a screen reader.
//
// The front door already did this correctly, and this is that implementation
// lifted out of js/welcome.js so there is one of it rather than four.
//
// Two mechanisms, because they cover different readers:
//
//   the Tab cycle    keeps a sighted keyboard user inside the dialog
//   inert on the     stops a screen reader from browsing the page behind it,
//   background       which Tab containment alone does not prevent
//
// `inert` also removes the background from the tab order, so the two overlap -
// but inert is not in every browser Gravitas supports and the Tab cycle is the
// floor rather than the belt-and-braces.
// =============================================================================

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Everything inside a container that a reader can actually reach.
 *
 * offsetParent is null for anything display:none, which is how the panels hide
 * their own sections; the activeElement exception keeps a control that is
 * focused but positioned oddly - a fixed-position close button - in the list.
 *
 * @param {HTMLElement} container - The dialog
 * @returns {HTMLElement[]} Focusable descendants, in document order
 */
function focusableWithin(container) {
  return [...container.querySelectorAll(FOCUSABLE)].filter(
    el => el.offsetParent !== null || el === document.activeElement
  );
}

/**
 * Mark everything except one element's top-level ancestor as inert.
 *
 * Walks the body's children rather than the whole tree: marking the dialog's
 * own ancestor would hide the dialog too.
 *
 * @param {HTMLElement} keep - The top-level node to leave alone
 * @param {boolean} on - True to hide the rest, false to restore it
 */
function setBackgroundInert(keep, on) {
  for (const node of document.body.children) {
    if (node === keep || node.tagName === 'SCRIPT') continue;
    if (on) {
      node.setAttribute('inert', '');
      node.setAttribute('aria-hidden', 'true');
    } else {
      node.removeAttribute('inert');
      node.removeAttribute('aria-hidden');
    }
  }
}

/**
 * Trap focus inside a dialog until the returned function is called.
 *
 * @param {HTMLElement} container - The element carrying role="dialog"
 * @param {Object} [opts]
 * @param {HTMLElement} [opts.returnFocusTo] - Where to send focus on release.
 *   Defaults to whatever had it when the trap was applied, which is almost
 *   always the control that opened the dialog.
 * @param {HTMLElement} [opts.initialFocus] - What to focus on open. Defaults to
 *   the first focusable thing inside.
 * @returns {Function} Release the trap and restore focus. Safe to call twice.
 */
export function trapFocus(container, opts = {}) {
  if (!container) return () => {};

  const previous =
    opts.returnFocusTo ||
    (document.activeElement instanceof window.HTMLElement
      ? document.activeElement
      : null);

  // The top-level ancestor, because that is the granularity inert works at
  // here: a dialog nested three divs deep still lives under one child of body.
  let top = container;
  while (top.parentElement && top.parentElement !== document.body) {
    top = top.parentElement;
  }

  const onKeydown = e => {
    if (e.key !== 'Tab') return;
    const items = focusableWithin(container);
    if (!items.length) {
      // Nothing to move to, so Tab must not take focus out of the dialog.
      e.preventDefault();
      return;
    }
    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;

    if (!container.contains(active)) {
      // Focus has already escaped - a click behind the dialog, or a control
      // that removed itself. Pull it back rather than letting Tab continue
      // from wherever it is.
      e.preventDefault();
      first.focus();
      return;
    }
    if (e.shiftKey && active === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  };

  // Capture phase, so the dialog's own handlers cannot swallow Tab first.
  document.addEventListener('keydown', onKeydown, true);
  setBackgroundInert(top, true);

  const initial = opts.initialFocus || focusableWithin(container)[0];
  if (initial) {
    try {
      initial.focus();
    } catch {
      /* a control that cannot take focus is not worth an exception */
    }
  }

  let released = false;
  return function release() {
    if (released) return;
    released = true;
    document.removeEventListener('keydown', onKeydown, true);
    setBackgroundInert(top, false);
    if (previous && document.contains(previous)) {
      try {
        previous.focus();
      } catch {
        /* the opener may have gone with the dialog */
      }
    }
  };
}
