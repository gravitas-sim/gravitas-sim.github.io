// =============================================================================
// The interaction contract's runtime: step sizes, focus and settled announcements
// -----------------------------------------------------------------------------
// INTERACTION.md is the rule; tools/interaction-contract.json is the rule as
// data, and tests/interactionContract.test.js holds every registered surface to
// it. What a widget needs at run time is small, so it is here and nowhere else
// (the step sizes of a nudge are js/shortcuts.js's, which is on the start-up
// path and this module is not):
//
//   - moveFocus / returnFocus: the focus half of "an in-page change". A dialog
//     is js/dialog.js's; a panel, a disclosure and a part of the page that
//     changes under the reader use these, so focus is never left on an element
//     that has gone and a move is announced.
//   - settledAnnouncer: the announcement rule for a readout that a nudge
//     changes. Announce on commit, not on every press.
//
// Nothing here knows about a particular surface, and the only import is the
// announcer every other module already uses.
// =============================================================================

import { announce } from './notify.js';

/**
 * Put focus on something that has just appeared or changed, and say so.
 *
 * An element that is not a tab stop is made a programmatic target only, so
 * moving focus to a heading or a region does not add it to the tab order.
 *
 * @param {HTMLElement} target - Where focus goes
 * @param {string} [message] - Announced when focus has moved
 * @returns {boolean} Whether focus is now on the target
 */
export function moveFocus(target, message) {
  if (!target?.isConnected) return false;
  if (target.tabIndex < 0 && !target.hasAttribute('tabindex'))
    target.setAttribute('tabindex', '-1');
  target.focus();
  if (message) announce(message);
  return document.activeElement === target;
}

/**
 * Give focus back to what opened something, or to a place that still exists.
 *
 * @param {?HTMLElement} trigger - The control that opened it
 * @param {?HTMLElement} [fallback] - Used when the trigger is gone or hidden
 * @returns {boolean} Whether focus landed on either
 */
export function returnFocus(trigger, fallback = null) {
  for (const el of [trigger, fallback]) {
    if (el?.isConnected && !el.closest('[hidden], [inert]')) {
      el.focus();
      if (document.activeElement === el) return true;
    }
  }
  return false;
}

/**
 * The announcement rule for a readout a nudge changes.
 *
 * `nudge` remembers the latest words and says them only once the reader has
 * stopped pressing for `delay` ms; `commit` says them now and drops anything
 * waiting. A reader who holds an arrow key hears the place they stopped, not
 * forty intermediate values.
 *
 * @param {object} [options] - Options
 * @param {Function} [options.say] - The announcer; defaults to notify.announce
 * @param {number} [options.delay] - Quiet time before a nudge is announced
 * @returns {{nudge: Function, commit: Function, cancel: Function}} The three calls
 */
export function settledAnnouncer({ say = announce, delay = 700 } = {}) {
  let timer = null;
  const cancel = () => {
    clearTimeout(timer);
    timer = null;
  };
  return {
    nudge(message) {
      cancel();
      timer = setTimeout(() => {
        timer = null;
        say(message);
      }, delay);
    },
    commit(message) {
      cancel();
      say(message);
    },
    cancel,
  };
}
