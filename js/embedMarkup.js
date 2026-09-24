// =============================================================================
// The markup a course page pastes to show a figure
// -----------------------------------------------------------------------------
// Shared by the share dialog's Copy embed code and the figure builder
// (/figure/). Fetched by the dialog when it opens, not at start-up: nobody who
// never copies an embed needs any of it.
//
// Written to survive the HTML editors an instructor will actually meet, which
// is a stronger constraint than being correct HTML:
//
//   The aspect ratio is held by a padding-top wrapper rather than by the
//   `aspect-ratio` property. Canvas and Blackboard both run pasted HTML through
//   a sanitiser that keeps `style` but neither of them guarantees a modern
//   layout engine in the mobile app's webview, and padding-top has worked
//   everywhere since 2010.
//
//   `width` and `height` attributes are present as well as the CSS, because a
//   sanitiser that strips `style` outright leaves an iframe with no size at all
//   otherwise, and a 300x150 default iframe is a broken-looking figure rather
//   than a small one.
//
//   No `sandbox` attribute. Adding one would require enumerating the
//   permissions the simulation needs - scripts, same-origin for localStorage -
//   and getting that list wrong produces a blank frame that the person pasting
//   it cannot debug. The host page's own sandbox still applies, and the figure
//   obeys no page it was not told to (EMBEDDING.md).
//
//   `allowfullscreen` is included: the figure is a simulation an instructor may
//   well want to project from inside the course page, and it is the one
//   permission that is genuinely useful here. Camera, microphone and payment
//   are not requested.
//
// Every piece of text a person typed - a title, a caption, a link's words - is
// escaped, as an attribute or as text. None of it can become markup: there is
// no field here for HTML, a script or a style.
// =============================================================================

import { t } from './i18n/index.js';
import { withEmbedParam } from './presentation.js';

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

/** Escape a value for an HTML attribute. */
export const attr = value =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/** Escape a value for HTML text. */
const text = value =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

/**
 * An iframe, and optionally the figure and caption around it.
 *
 * With no caption and no fallback link it is exactly the snippet the share
 * dialog has always copied, so a figure pasted before this existed and one
 * pasted after are the same markup.
 *
 * @param {Object} opts
 * @param {string} opts.src - The embed URL
 * @param {string} opts.title - The iframe's accessible name
 * @param {{w: number, h: number}} opts.aspect - Width and height ratio
 * @param {number} [opts.height] - Pixel height for a sanitiser that drops CSS
 * @param {string} [opts.caption] - Text under the figure
 * @param {{href: string, text: string}} [opts.fallback] - A link to the same
 *   figure, for a reader whose platform will not show the frame
 * @returns {string} Markup, ready to paste
 */
export function figureMarkup({
  src,
  title,
  aspect,
  height = 480,
  caption = '',
  fallback = null,
}) {
  const pad = ((aspect.h / aspect.w) * 100).toFixed(4);
  const frame = [
    `<div style="position:relative;width:100%;padding-top:${pad}%;">`,
    `  <iframe src="${attr(src)}"`,
    `    title="${attr(title)}"`,
    `    style="position:absolute;top:0;left:0;width:100%;height:100%;border:0;"`,
    `    width="800" height="${Math.round(height)}"`,
    `    loading="lazy" allowfullscreen></iframe>`,
    `</div>`,
  ];
  const words = String(caption || '').trim();
  if (!words && !fallback) return frame.join('\n');
  const parts = [];
  if (words) parts.push(text(words));
  if (fallback?.href) {
    parts.push(
      `<a href="${attr(fallback.href)}" target="_blank" rel="noopener">${text(fallback.text)}</a>`
    );
  }
  return [
    '<figure style="margin:0;">',
    ...frame.map(line => `  ${line}`),
    `  <figcaption>${parts.join(' ')}</figcaption>`,
    '</figure>',
  ].join('\n');
}

/**
 * The iframe for the share dialog's one button: the plainest figure, and what
 * every snippet copied before the builder existed looks like.
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
  return figureMarkup({
    src: withEmbedParam(url),
    title: scenario
      ? t('embed.figure.title', { scenario })
      : t('embed.figure.titleGeneric'),
    aspect: EMBED_ASPECT,
    height,
  });
}
