// =============================================================================
// The instruments a link opens with
// -----------------------------------------------------------------------------
// A scenario pack (js/platform/scenario.js) can name the observing panels and
// measuring tools it starts with, and its link carries them in the extras as
// `open` and `tools`. Each is opened by pressing its own rail control, so it
// arrives exactly as a reader's click would bring it - its lazy module, its
// strings and its state - and a control that is already on is left alone.
//
// Loaded by js/share.js only when a link names one, so the start-up path
// carries none of this.
// =============================================================================

/** Each instrument id, and the rail control that opens it. */
const RAIL = Object.freeze({
  lightCurve: 'toggleLightCurve',
  radialVelocity: 'toggleRadialVelocity',
  rotationCurve: 'toggleRotationCurve',
  astrometry: 'toggleAstrometry',
  pauseAtEvent: 'togglePauseAtEvent',
  view3d: 'toggle3DView',
  ruler: 'toggleRuler',
  protractor: 'toggleProtractor',
  stopwatch: 'toggleStopwatch',
});

/**
 * Open what a link's extras name, and nothing it does not.
 * @param {{open?: string[], tools?: string[]}} x - The payload's extras
 * @returns {string[]} The ids that were opened
 */
export function openStartingPanels(x) {
  const opened = [];
  for (const id of [...(x?.open || []), ...(x?.tools || [])]) {
    if (!Object.hasOwn(RAIL, id)) continue;
    const control = document.getElementById(RAIL[id]);
    if (!control || control.getAttribute('aria-pressed') === 'true') continue;
    control.click();
    opened.push(id);
  }
  return opened;
}
