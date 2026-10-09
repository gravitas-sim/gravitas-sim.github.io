// =============================================================================
// The markup the kit hands out: an embed or link snippet, and the handout
// -----------------------------------------------------------------------------
// Pure. Text is escaped, and the QR SVG is the encoder's own (js/kit/qr.js).
// The handout is built as a string of markup from escaped parts, once per
// language, so the kit page, the printed page and the tests see one thing.
// =============================================================================

import { tr } from './kitText.js';

export const esc = v =>
  String(v ?? '').replace(
    /[&<>"']/g,
    c =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        c
      ]
  );

/** A link snippet that survives a platform's editor. */
export const linkMarkup = (url, title) =>
  `<p><a href="${esc(url)}" target="_blank" rel="noopener">${esc(title)}</a></p>`;

/** The frame for a page that allows one, with its link beneath it. */
export const frameMarkup = (url, title) =>
  `<figure style="margin:0;"><div style="position:relative;width:100%;padding-top:75%;"><iframe src="${esc(url)}" title="${esc(title)}" style="position:absolute;top:0;left:0;width:100%;height:100%;border:0;" width="800" height="600" loading="lazy" allowfullscreen></iframe></div><figcaption><a href="${esc(url)}" target="_blank" rel="noopener">${esc(title)}</a></figcaption></figure>`;

/**
 * The text an instructor pastes into a course platform.
 * @param {string} locale - 'en' or 'es'
 * @param {{kind: string, link: string, hint: string}} what - What is shared
 * @returns {string} Plain text
 */
export function pasteText(locale, { kind, link, hint }) {
  const name = hint
    ? tr(locale, 'paste.name', { hint })
    : tr(locale, 'paste.name.free');
  return tr(locale, kind === 'course' ? 'paste.course' : 'paste.activity', {
    link,
    name,
  });
}

/**
 * The one-page handout.
 *
 * @param {string} locale - 'en' or 'es'
 * @param {object} what - title, intro, rows (a list of strings), link, svg,
 *   roster, hint, kind, minutes
 * @returns {string} A section of markup
 */
export function handoutMarkup(locale, what) {
  const { title, intro, rows, link, svg, roster, hint, kind, steps, minutes } =
    what;
  return `<section class="kit-handout" lang="${locale}">
<h1>${esc(title)}</h1>
${minutes ? `<p class="kit-sub">${esc(tr(locale, 'handout.minutes', { n: minutes }))}</p>` : ''}
${intro ? `<p>${esc(intro)}</p>` : ''}
<h2>${esc(tr(locale, 'handout.open'))}</h2>
<div class="kit-start">${svg || ''}<p>${esc(tr(locale, 'handout.scan'))}<br><code>${esc(link)}</code></p></div>
<h2>${esc(kind === 'course' ? tr(locale, 'handout.do.course') : tr(locale, 'handout.do.activity', { steps }))}</h2>
<ol>${rows.map(r => `<li>${esc(r)}</li>`).join('')}</ol>
<p>${esc(hint ? tr(locale, 'handout.name', { hint }) : tr(locale, 'handout.name.free'))}${roster ? ` ${esc(tr(locale, 'handout.class', { code: roster }))}` : ''}</p>
<h2>${esc(tr(locale, 'handout.finish'))}</h2>
<p>${esc(tr(locale, 'handout.finish.text'))}</p>
</section>`;
}
