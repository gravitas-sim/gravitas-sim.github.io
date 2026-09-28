// =============================================================================
// Lesson markup
// -----------------------------------------------------------------------------
// Lesson prose is a little HTML: four inline tags and a few entities (&nbsp;,
// &rsquo;, &#8491;). The panel renders it with prose(), the PDFs flatten it
// (answerKey.js, labReport.js), and all of them decode entities with this one
// table, so screen and paper cannot disagree. tests/lessonMarkup.test.js says
// why that took two bugs. No imports: the answer keys also run in Node.
// =============================================================================

/**
 * The entities lessons use, as the characters HTML gives them. Short on
 * purpose: an unlisted one stays visible, and the test names its lesson.
 */
export const ENTITIES = Object.freeze({
  amp: '&',
  lt: '<',
  gt: '>',
  rsquo: '\u2019',
  ldquo: '\u201c',
  rdquo: '\u201d',
  ndash: '\u2013',
  mdash: '\u2014',
  hellip: '\u2026',
  nbsp: '\u00a0',
  times: '\u00d7',
  minus: '\u2212',
  plusmn: '\u00b1',
  deg: '\u00b0',
  beta: '\u03b2',
});

/**
 * Decode entities, in one pass: "&amp;lt;" reads as "&lt;", never as "<".
 *
 * @param {string} text - Text that may carry entities
 * @returns {string} The text with every known entity resolved
 */
export const decodeEntities = text =>
  String(text ?? '').replace(
    /&(?:([a-z][a-z\d]{1,31})|#(\d{1,7})|#x([\da-f]{1,6}));/gi,
    (whole, name, dec, hex) => {
      if (name) return Object.hasOwn(ENTITIES, name) ? ENTITIES[name] : whole;
      const code = dec ? Number(dec) : parseInt(hex, 16);
      return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : whole;
    }
  );

export const escapeHtml = text =>
  String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

/** Lesson prose carries a little inline markup, but never arbitrary HTML. */
export const prose = text =>
  escapeHtml(text)
    // [\s\S] rather than . : lesson prose is written in template literals that
    // wrap across lines, and a tag spanning a newline was left as raw markup on
    // screen.
    .replace(/&lt;strong&gt;([\s\S]*?)&lt;\/strong&gt;/g, '<strong>$1</strong>')
    .replace(/&lt;em&gt;([\s\S]*?)&lt;\/em&gt;/g, '<em>$1</em>')
    // Real subscripts and superscripts: R<sub>p</sub> rather than R_p, which a
    // student then has to translate back into the algebra they were taught.
    .replace(/&lt;sub&gt;([\s\S]*?)&lt;\/sub&gt;/g, '<sub>$1</sub>')
    .replace(/&lt;sup&gt;([\s\S]*?)&lt;\/sup&gt;/g, '<sup>$1</sup>')
    .replace(/\n\s*\n/g, '</p><p>')
    .replace(/\s+/g, ' ')
    // Entities last, found by their escaped "&amp;" and escaped again once
    // decoded, so "&lt;" is only ever text. After the \s pass, which would
    // fold &nbsp;'s U+00A0 into a plain space.
    .replace(/&amp;(#?[a-zA-Z0-9]{1,32};)/g, (whole, ref) => {
      const decoded = decodeEntities(`&${ref}`);
      return decoded === `&${ref}` ? whole : escapeHtml(decoded);
    });
