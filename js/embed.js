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

import { t } from './i18n/index.js';
import {
  setPresentationMode,
  embedRequested,
  withEmbedParam,
} from './presentation.js';

/**
 * The default aspect ratio an embed is offered at.
 *
 * 16:10 rather than 16:9. A gravitational simulation is as tall as it is wide -
 * an orbit is a closed loop, not a timeline - and 16:9 crops the top and bottom
 * of every eccentric orbit at the zoom levels the scenarios are built around.
 * 16:10 is also close to the shape of a Canvas content column at the widths
 * course pages actually use.
 */
export const EMBED_ASPECT = { w: 16, h: 10 };

/** Height an embed falls back to when a host cannot do aspect-ratio boxes. */
export const EMBED_FALLBACK_HEIGHT = 480;

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
  return true;
}

/**
 * Wire the embed shell's own controls.
 *
 * Called after the interface exists. Everything here is a no-op outside embed
 * mode, so main.js can call it unconditionally.
 */
export function initEmbedChrome() {
  const link = document.getElementById('embedOpenFull');
  if (!link) return;
  // The full-size link is this page without embed=1, so it carries the same
  // share payload and the same scenario. Built at wire time rather than
  // written into the markup, because the payload is only in the URL once a
  // share link has been opened.
  const href = withEmbedParam(location.href, { embed: false });
  link.setAttribute('href', href);
  link.setAttribute('target', '_blank');
  link.setAttribute('rel', 'noopener');
}

// --- The iframe snippet -------------------------------------------------------

/** Escape a value for an HTML attribute in generated markup. */
const attr = value =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/**
 * The iframe to paste into a course page.
 *
 * Written to survive the HTML editors an instructor will actually meet, which
 * is a stronger constraint than being correct HTML:
 *
 *   The aspect ratio is held by a padding-top wrapper rather than by the
 *   `aspect-ratio` property. Canvas and Blackboard both run pasted HTML through
 *   a sanitiser that keeps `style` but neither of them guarantees a modern
 *   layout engine in the mobile app's webview, and padding-top has worked
 *   everywhere since 2010.
 *
 *   `width` and `height` attributes are present as well as the CSS, because a
 *   sanitiser that strips `style` outright leaves an iframe with no size at all
 *   otherwise, and a 300x150 default iframe is a broken-looking figure rather
 *   than a small one.
 *
 *   No `sandbox` attribute. Adding one would require enumerating the
 *   permissions the simulation needs - scripts, same-origin for localStorage -
 *   and getting that list wrong produces a blank frame that the person pasting
 *   it cannot debug. The host page's own sandbox still applies.
 *
 *   `allowfullscreen` is included: the figure is a simulation an instructor may
 *   well want to project from inside the course page, and it is the one
 *   permission that is genuinely useful here. Camera, microphone and payment
 *   are not requested.
 *
 * @param {Object} opts
 * @param {string} opts.url - The share URL to embed; embed=1 is added here
 * @param {string} [opts.scenario] - Scenario name, for the accessible title
 * @param {number} [opts.height] - Fallback pixel height
 * @returns {string} An iframe snippet, ready to paste
 */
export function embedSnippet({
  url,
  scenario,
  height = EMBED_FALLBACK_HEIGHT,
}) {
  const src = withEmbedParam(url);
  const title = scenario
    ? t('embed.figure.title', { scenario })
    : t('embed.figure.titleGeneric');
  const pad = ((EMBED_ASPECT.h / EMBED_ASPECT.w) * 100).toFixed(4);

  return [
    `<div style="position:relative;width:100%;padding-top:${pad}%;">`,
    `  <iframe src="${attr(src)}"`,
    `    title="${attr(title)}"`,
    `    style="position:absolute;top:0;left:0;width:100%;height:100%;border:0;"`,
    `    width="800" height="${height}"`,
    `    loading="lazy" allowfullscreen></iframe>`,
    `</div>`,
  ].join('\n');
}
