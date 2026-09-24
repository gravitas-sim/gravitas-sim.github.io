// =============================================================================
// Embed mode: the simulation as a figure in somebody else's page
// -----------------------------------------------------------------------------
// `?embed=1` turns any Gravitas URL into an interactive figure suitable for an
// iframe in a course page. The whole feature is one line of routing and a
// stylesheet: the presentation shell (js/presentation.js) sets
// body.presentation-embed, and CSS takes the rail, the readout, the transport
// bar, the footer and the front door off the screen.
//
// Why the query string
// -----------------------------------------------------------------------------
// A share link carries its payload in the *fragment* - `#3z...`. Embedding asks
// a question about how to present that payload, not about what it contains, so
// it belongs in the query string, where it cannot collide with the payload and
// the payload cannot collide with it. The consequence is the composability the
// feature is for: any share link, however long and whatever it already carries,
// becomes embeddable by adding one parameter. No second encoding exists, and
// js/shareState.js is untouched.
//
// What stays on screen
// -----------------------------------------------------------------------------
// The canvas, and the controls the figure genuinely needs to be a figure rather
// than a picture: play/pause, speed, reset view, and the object inspector when
// somebody clicks a body. Everything that is about *the application* rather than
// about *this simulation* goes: navigation, the gallery, settings, sharing,
// lessons, the theme picker, the tutorial.
//
// One affordance is added rather than removed: a small "Open in Gravitas" link
// in a corner, which is how a student gets from a figure in their reading to
// the sandbox. It opens the same state, without embed=1, in a new tab.
// =============================================================================

import {
  setPresentationMode,
  embedRequested,
  withEmbedParam,
} from './presentation.js';
import { fixTheme, forgetThemes } from './theme.js';
import { reduceMotion } from './quality.js';

/**
 * Enter embed mode if the URL asked for it.
 *
 * Called before the simulation is built, so nothing that embed mode removes is
 * ever painted: a rail that appears for one frame and vanishes reads as a bug
 * in the host page.
 *
 * @returns {boolean} True if embed mode was entered
 */
export function initEmbedMode() {
  if (!embedRequested()) return false;
  setPresentationMode('embed');
  document.documentElement.classList.add('is-embed');
  // A gravitas-embed/1 figure remembers nothing, from the first moment: see
  // embedRequest() for the rest of what it asked for.
  if (new URLSearchParams(location.search).get('ev')) forgetThemes();
  return true;
}

let request = null;

/**
 * What this page's embed URL asked for, read once.
 *
 * Only a figure that opted into gravitas-embed/1 fetches js/embedOptions.js,
 * so nobody else downloads it: every other page, embed or not, gets
 * `{version: 0}` without a request. The figure's choices are applied as they
 * arrive, behind the splash, before anything is revealed - its theme, its
 * motion and its controls here, its language and quality tier by js/main.js,
 * which owns the settings they live in.
 *
 * @returns {Promise<{version: number, options: Object}>} As
 *   readEmbedOptions(); version 0 when this is not a gravitas-embed/1 figure
 */
export function embedRequest() {
  if (!request) {
    const optedIn =
      embedRequested() && new URLSearchParams(location.search).get('ev');
    request = optedIn
      ? import('./embedOptions.js').then(({ readEmbedOptions }) => {
          const read = readEmbedOptions();
          const { options } = read;
          if (read.version) {
            if (options.theme) fixTheme(options.theme);
            if (options.motion === 'reduced') reduceMotion();
            if (options.controls === 'none') {
              document.body.classList.add('embed-no-transport');
            }
          }
          return read;
        })
      : Promise.resolve({ version: 0, options: {} });
  }
  return request;
}

let worldReady;
const worldBuilt = new Promise(resolve => {
  worldReady = resolve;
});

/**
 * The first world is built. Called by js/main.js on every start-up path; the
 * figure tells its page it is ready only after this, so a page's first
 * message never lands on an empty canvas.
 */
export function embedWorldBuilt() {
  worldReady();
}

/**
 * Wire the embed shell's own controls.
 *
 * Called after the interface exists. Everything here is a no-op outside embed
 * mode, so main.js can call it unconditionally.
 */
export function initEmbedChrome({ authored = null, services = null } = {}) {
  const link = document.getElementById('embedOpenFull');
  if (!link) return;
  embedRequest().then(({ version, options }) => {
    if (!version) return;
    const reset = document.getElementById('embedReset');
    if (reset) {
      reset.hidden = false;
      reset.addEventListener('click', () => {
        import('./embedBridge.js')
          .then(m =>
            m.resetFigure({ reset: options.reset, authored, services })
          )
          .catch(err => console.warn('The figure could not be reset:', err));
      });
    }
    // The page's side of the contract, fetched only by a figure that opted
    // in, and started once there is a world for a message to act on.
    worldBuilt
      .then(() => import('./embedBridge.js'))
      .then(m => m.startEmbedBridge({ options, authored, services }))
      .catch(err => console.warn('The embed messages are unavailable:', err));
  });
  // The full-size link is this page without embed=1, so it carries the same
  // share payload and the same scenario. Built at wire time rather than
  // written into the markup, because the payload is only in the URL once a
  // share link has been opened.
  const href = withEmbedParam(location.href, { embed: false });
  link.setAttribute('href', href);
  link.setAttribute('target', '_blank');
  link.setAttribute('rel', 'noopener');
}
