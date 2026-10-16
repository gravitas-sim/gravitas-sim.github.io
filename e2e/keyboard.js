// =============================================================================
// Stepping through the page with the keyboard, in every engine
// -----------------------------------------------------------------------------
// Playwright's WebKit on macOS keeps Safari's default Tab, and it is not the
// Tab of the other two engines. On a bare page of button, button, range, text
// field, select, link and button, plain Tab went b1 -> text -> select -> <body>
// -> text: only text fields and pop-up menus are stops, and after the last
// one focus leaves the page for the browser's toolbar, which a headless
// WebKit reports as <body>. Option+Tab (Alt+Tab) visits every control. Firefox
// ignores Alt+Tab altogether. CI's WebKit runs on Linux, where plain Tab
// visits every control, so none of this shows up anywhere but a Mac.
//
// A keyboard test therefore has to say which claim it is making:
//
//   every control can be reached     step with stepKey(), the key that
//                                    reaches buttons and links here
//   focus cannot leave the dialog    press plain Tab, which in Safari is the
//                                    route that gets out if anything does, and
//                                    allow <body>: focus that has gone to the
//                                    browser's own toolbar, where a modal may
//                                    let it go. A control behind is never
//                                    allowed. strayStops() applies that rule
// =============================================================================

/**
 * The key a reader presses to step to the next control of any kind.
 *
 * Tab in Chromium and Firefox. WebKit on macOS keeps Safari's default: Tab
 * moves only between text fields and pop-up menus, and Option+Tab reaches
 * buttons and links as well. From #objectTypeBtn a plain Tab went straight to
 * <body>, because the rail is all buttons. Firefox ignores Alt+Tab
 * altogether, so it cannot be one key for every engine. WebKit on Linux, where
 * CI runs it, moves to every control with either key (e2e/historyOriginal.spec.js
 * relies on Alt+Tab there).
 *
 * @param {string} browserName - Playwright's engine name
 * @returns {string} The key to press
 */
export const stepKey = browserName =>
  browserName === 'webkit' ? 'Alt+Tab' : 'Tab';

/** What focusStop() reports for focus that has left the page. */
export const TOOLBAR = '<body>';

/**
 * Where focus is, relative to an open dialog.
 *
 * Runs in the page, so it is self-contained: pass it to `page.evaluate()` with
 * the dialog's selector.
 *
 * @param {string} selector - The element that has to keep focus
 * @returns {string} 'inside', '<body>', or the control behind the dialog
 */
export function focusStop(selector) {
  const el = document.activeElement;
  if (!el || el === document.body) return '<body>';
  if (document.querySelector(selector)?.contains(el)) return 'inside';
  return el.id || el.getAttribute('name') || el.tagName;
}

/**
 * The stops that left the dialog for the page behind it, numbered by press.
 *
 * @param {string[]} stops - focusStop() after each press, in order
 * @returns {string[]} e.g. ['12: investigationAuthorStep'], empty if none
 */
export const strayStops = stops =>
  stops.flatMap((stop, i) =>
    stop === 'inside' || stop === TOOLBAR ? [] : [`${i + 1}: ${stop}`]
  );
