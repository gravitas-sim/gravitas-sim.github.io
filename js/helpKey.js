// =============================================================================
// H: explain the panel in front of you
// -----------------------------------------------------------------------------
// Every docked instrument panel and every plot has a "What am I looking at?"
// button (js/explainers.js). This is the same control by key: H presses the
// button of the panel the reader is in (the nearest enclosing one to where
// focus is) and leaves focus on it, so a second press closes the answer, and
// the answer is read where it opens. With no such panel on screen it says so.
//
// One listener for the page, armed by whatever creates an explain button
// (js/plot/plot.js) and by the application's shortcut list (js/controls.js);
// arming twice does nothing the second time.
// =============================================================================

/** The buttons that open an explainer. */
const BUTTONS =
  '#investigationToolExplain, #investigationPlotExplain, #investigationEllipseExplain, .plot-help';

/** The words said when no panel on screen has an explainer. */
const NONE = {
  en: 'There is nothing here to explain. Open an instrument or a plot first.',
  es: 'No hay nada que explicar aquí. Abre primero un instrumento o una gráfica.',
};

/** Whether the reader can reach and see a button. */
const shown = b => b.offsetParent !== null && !b.closest('[hidden], [inert]');

/**
 * The explain button of the panel focus is in: the first one under the nearest
 * enclosing element that has one on screen, else the first on the page.
 * @param {?Element} from - Where focus is
 * @returns {?HTMLElement} The button, or null
 */
export function explainButtonFor(from) {
  for (let node = from; node; node = node.parentElement) {
    const found = [...node.querySelectorAll(BUTTONS)].find(shown);
    if (found) return found;
  }
  return null;
}

let armed = false;

/** Start listening for the key. Safe to call again. */
export function armHelpKey() {
  if (armed) return;
  armed = true;
  document.addEventListener('keydown', e => {
    if (e.key !== 'h' || e.metaKey || e.ctrlKey || e.altKey || e.shiftKey)
      return;
    if (e.defaultPrevented || e.target.closest?.('input, textarea, select'))
      return;
    if (e.target.isContentEditable || e.target.closest?.('[aria-modal]'))
      return;
    e.preventDefault();
    const button = explainButtonFor(document.activeElement);
    if (!button) {
      import('./notify.js').then(m =>
        m.announce(NONE[document.documentElement.lang === 'es' ? 'es' : 'en'])
      );
      return;
    }
    button.focus();
    button.click();
  });
}
