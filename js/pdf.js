// =============================================================================
// A small PDF writer
// -----------------------------------------------------------------------------
// Lab reports have to leave the browser as something an instructor can open,
// annotate and keep, which in practice means PDF. Every library that does this
// would be a CDN dependency on a page that deliberately has none, so this
// writes the file directly. PDF's text model is simple enough that the whole
// generator is a few hundred lines, and the fourteen standard Type 1 fonts need
// no embedding: Helvetica is guaranteed present in every reader.
//
// Supports what a lab report needs and nothing more: headings, wrapped
// paragraphs, key/value rows, rules, page breaks and clickable links.
//
// Pure: it takes content in and returns bytes. No DOM, no simulation imports.
// =============================================================================

// The one import is js/format.js, which is itself pure: number typography has
// to match what the screen showed, and a second copy of those rules here is how
// a report ends up disagreeing with the app that produced it.
import { tickLabel } from './format.js';

// --- Font metrics -------------------------------------------------------------
// Character widths for Helvetica and Helvetica-Bold, in 1/1000 em, indexed from
// space (32) to tilde (126). Word wrapping needs real widths: estimating from
// an average produces lines that overshoot the margin on capitals and look
// ragged on lowercase, which is exactly the tell that a document was generated
// by something that did not care.
const W_REGULAR = [
  278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278,
  278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584,
  584, 556, 1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556,
  833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278,
  278, 278, 469, 556, 333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222,
  500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500,
  500, 334, 260, 334, 584,
];

const W_BOLD = [
  278, 333, 474, 556, 556, 889, 722, 238, 333, 333, 389, 584, 278, 333, 278,
  278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 333, 333, 584, 584,
  584, 611, 975, 722, 722, 722, 722, 667, 611, 778, 722, 278, 556, 722, 611,
  833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 333,
  278, 333, 584, 556, 333, 556, 611, 556, 611, 556, 333, 611, 611, 278, 278,
  556, 278, 889, 611, 611, 611, 611, 389, 556, 333, 611, 556, 778, 556, 556,
  500, 389, 280, 389, 584,
];

/**
 * Width of a string, in points.
 * @param {string} text - Text to measure
 * @param {number} size - Font size in points
 * @param {boolean} bold - Use the bold metrics
 * @returns {number} Width in points
 */
export function textWidth(text, size, bold = false) {
  const table = bold ? W_BOLD : W_REGULAR;
  let total = 0;
  for (const ch of String(text)) {
    // A non-breaking space is a space, and is measured as one. It reaches here
    // because a value and its unit are deliberately bound together, and
    // charging it the width of a letter makes every such row read as wider
    // than it prints.
    const code = ch === '\u00a0' ? 32 : ch.charCodeAt(0);
    // Anything outside the measured range is approximated by the width of a
    // lowercase n, which keeps accented characters and symbols from wrapping
    // wildly rather than pretending they are zero-width.
    total += code >= 32 && code <= 126 ? table[code - 32] : table[110 - 32];
  }
  return (total * size) / 1000;
}

/**
 * Break text into lines that fit a width.
 * @param {string} text - Text to wrap
 * @param {number} maxWidth - Available width in points
 * @param {number} size - Font size
 * @param {boolean} bold - Use bold metrics
 * @returns {Array<string>} Lines
 */
export function wrapText(text, maxWidth, size, bold = false) {
  const out = [];
  for (const paragraph of String(text).split('\n')) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    if (!words.length) {
      out.push('');
      continue;
    }
    let line = '';
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (textWidth(candidate, size, bold) <= maxWidth || !line) {
        line = candidate;
      } else {
        out.push(line);
        line = word;
      }
    }
    if (line) out.push(line);
  }
  return out;
}

// --- Encoding -----------------------------------------------------------------

/**
 * Escape a string for a PDF literal.
 *
 * Unescaped parentheses terminate the string early and corrupt every object
 * offset after it, which a reader reports as a damaged file rather than as the
 * one stray bracket it is.
 */
function pdfString(text) {
  return String(text)
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

// Characters outside WinAnsi have no glyph in the standard fonts. Rather than
// emit a blank or a corrupt byte, map the ones this project actually produces
// onto readable ASCII. Astronomy text is full of these.
const TRANSLITERATE = new Map(
  Object.entries({
    // Em dash, en dash, non-breaking hyphen and minus sign. Written as escapes
    // rather than as the characters themselves because they have twice been
    // flattened by an automated pass that replaced dashes across the project,
    // which silently turned this map into duplicate '-' keys and let every one
    // of them reach the PDF as a question mark.
    '\u2014': '-',
    '\u2013': '-',
    '\u2011': '-',
    '−': '-',
    '“': '"',
    '”': '"',
    '‘': "'",
    '’': "'",
    '…': '...',
    '×': 'x',
    // A multiplication dot, not a separator: rendering "m·v·r" as "m-v-r"
    // turns a product into a subtraction in a document about physics.
    '·': '*',
    '∝': ' proportional to ',
    '≫': ' >> ',
    '≪': ' << ',
    '√': 'sqrt',
    '∞': 'infinity',
    ʻ: "'",
    ʼ: "'",
    '≠': '!=',
    '⁰': '^0',
    '¹': '^1',
    '⁴': '^4',
    '∑': 'sum',
    '∫': 'integral',
    θ: 'theta',
    λ: 'lambda',
    σ: 'sigma',
    ω: 'omega',
    Ω: 'Omega',
    φ: 'phi',
    ρ: 'rho',
    γ: 'gamma',
    '≈': '~',
    '≤': '<=',
    '≥': '>=',
    '±': '+/-',
    '°': ' deg',
    '☉': '_sun',
    '⊕': '_earth',
    '½': '1/2',
    // Superscripts must not collapse into the preceding digits: rendering
    // "10²" as "102" turns a hundred into a hundred and two, silently, in a
    // document full of numbers a student is being graded on.
    '²': '^2',
    '³': '^3',
    '⁻': '^-',
    Δ: 'Delta ',
    π: 'pi',
    μ: 'mu',
    α: 'alpha',
    β: 'beta',
    '→': '->',
    '←': '<-',
    '•': '-',
    ' ': ' ',
    // Added for the transit lesson, where these turn up inside symbol names
    // rather than in prose. An unmapped character becomes a literal '?', so
    // "R_★" would reach an instructor as "R_?".
    '★': '_star',
    δ: 'delta',
    '⅓': '1/3',
    '¼': '1/4',
    '¾': '3/4',
    '₀': '_0',
    '₁': '_1',
    '₂': '_2',
    '₃': '_3',
    '₄': '_4',
    ₐ: '_a',
    ₑ: '_e',
    ᵢ: '_i',
    ₙ: '_n',
    ₚ: '_p',
    ₛ: '_s',
    ₓ: '_x',
    '⁵': '^5',
    '⁶': '^6',
    µ: 'mu',
    '\u2077': '^7',
    '\u2078': '^8',
    '\u2079': '^9',
    // Reduced Planck constant, which the black hole lesson names in passing.
    '\u210f': 'hbar',
    ħ: 'hbar',
    ν: 'nu',
    τ: 'tau',
    ε: 'epsilon',
  })
);

/**
 * Reduce text to characters the standard fonts can render.
 * @param {string} text - Source text
 * @returns {string} WinAnsi-safe text
 */
export function toWinAnsi(text) {
  // Microns before the general Greek pass: mu maps to "mu" because it is the
  // reduced-mass symbol, which would turn a wavelength of "1.4 um" into
  // "1.4 mum".
  let source = String(text ?? '').replace(/[\u03bc\u00b5]m\b/g, 'um');
  // Superscript runs, before the per-character pass. Mapping each character on
  // its own turns "10^-14" into "10^-^1^4", which is unreadable in a document
  // whose whole subject is how many zeros a number has.
  const SUP = '\u2070\u00b9\u00b2\u00b3\u2074\u2075\u2076\u2077\u2078\u2079';
  source = source.replace(
    /[\u2070\u00b9\u00b2\u00b3\u2074-\u2079\u207b]+/g,
    run =>
      `^${[...run]
        .map(ch => (ch === '\u207b' ? '-' : String(SUP.indexOf(ch))))
        .join('')}`
  );
  let out = '';
  for (const ch of source) {
    if (TRANSLITERATE.has(ch)) {
      out += TRANSLITERATE.get(ch);
      continue;
    }
    const code = ch.charCodeAt(0);
    // Newlines survive: callers transliterate before wrapping, so turning them
    // into '?' here would replace every deliberate paragraph break with a
    // question mark instead of breaking the line.
    if (ch === '\n') {
      out += ch;
      continue;
    }
    out += code >= 32 && code <= 255 ? ch : '?';
  }
  // "R<sub>*</sub>" reaches here as "R_" plus a star that maps to "_star",
  // which would print as "R__star". Runs of underscores are always the seam
  // between a subscript marker and a symbol name, never something a writer
  // meant.
  return out.replace(/_{2,}/g, '_');
}

/**
 * Short numeric label for an axis tick.
 *
 * Superscripts survive as far as toWinAnsi, which folds a run of them into
 * "^30" for the standard fonts. Every label path here runs that first.
 */
function sigText(v) {
  if (!Number.isFinite(v)) return '';
  return tickLabel(v);
}

// --- Document -----------------------------------------------------------------

const PAGE_W = 612; // US Letter, the format a US university prints on
const PAGE_H = 792;
const MARGIN = 56;
const CONTENT_W = PAGE_W - MARGIN * 2;

/**
 * Build a PDF document by appending content.
 *
 * Flows top to bottom and breaks pages by itself, so callers describe what the
 * report says rather than where it lands.
 */
export function createDocument({ title = 'Document', footer = '' } = {}) {
  const pages = [];
  let ops = [];
  let links = [];
  let y = PAGE_H - MARGIN;

  const startPage = () => {
    pages.push({ ops, links });
    ops = [];
    links = [];
    y = PAGE_H - MARGIN;
  };

  /** Reserve vertical space, starting a new page if it will not fit. */
  const need = height => {
    // Leave room for the footer rule so text never collides with it.
    if (y - height < MARGIN + 24) startPage();
  };

  const drawText = (text, size, bold, indent = 0, color = null) => {
    const safe = toWinAnsi(text);
    const font = bold ? '/F2' : '/F1';
    const fill = color ? `${color} rg\n` : '0 0 0 rg\n';
    ops.push(
      `BT\n${fill}${font} ${size} Tf\n1 0 0 1 ${MARGIN + indent} ${y} Tm\n(${pdfString(safe)}) Tj\nET`
    );
  };

  const api = {
    /** @returns {number} Remaining vertical space on the current page */
    remaining: () => y - MARGIN,

    /**
     * A heading.
     * @param {string} text - Heading text
     * @param {Object} [opts] - {size, spaceBefore}
     */
    heading(text, { size = 14, spaceBefore = 18, keepWith = 40 } = {}) {
      y -= spaceBefore;
      const lines = wrapText(toWinAnsi(text), CONTENT_W, size, true);
      // Reserve room for the first lines of whatever follows as well, so a
      // heading cannot be left stranded alone at the foot of a page.
      need(lines.length * (size + 3) + 6 + keepWith);
      for (const line of lines) {
        drawText(line, size, true);
        y -= size + 3;
      }
      y -= 4;
      return api;
    },

    /**
     * A paragraph of body text.
     * @param {string} text - Paragraph text
     * @param {Object} [opts] - {size, indent, gap, color}
     */
    paragraph(text, { size = 10, indent = 0, gap = 8, color = null } = {}) {
      const lines = wrapText(toWinAnsi(text), CONTENT_W - indent, size, false);
      const lead = size * 1.42;
      for (const line of lines) {
        need(lead);
        drawText(line, size, false, indent, color);
        y -= lead;
      }
      y -= gap;
      return api;
    },

    /**
     * A label above a block of student-written text.
     * @param {string} label - Field label
     * @param {string} value - Student's answer
     */
    field(label, value) {
      need(38);
      drawText(toWinAnsi(label), 9, true, 0, '0.35 0.35 0.4');
      y -= 13;
      const text = String(value ?? '').trim();
      api.paragraph(text || '(no answer given)', {
        size: 10.5,
        indent: 10,
        gap: 10,
        color: text ? null : '0.55 0.55 0.6',
      });
      return api;
    },

    /**
     * A two-column row, for measured values.
     * @param {string} label - Left column
     * @param {string} value - Right column
     */
    row(label, value) {
      const l = toWinAnsi(label);
      const v = toWinAnsi(String(value));
      const labelW = textWidth(l, 10, false);
      const valueW = textWidth(v, 10, true);
      // A value too long to sit beside its label used to be right-aligned from
      // the right margin regardless, which pushed it off the left edge of the
      // page. When it will not fit, it wraps underneath instead.
      if (labelW + 12 + valueW > CONTENT_W) {
        need(16);
        drawText(l, 10, false);
        y -= 14;
        for (const line of wrapText(v, CONTENT_W - 12, 10, true)) {
          need(14);
          drawText(line, 10, true, 12);
          y -= 14;
        }
        y -= 2;
        return api;
      }
      need(16);
      drawText(l, 10, false);
      ops.push(
        `BT\n0 0 0 rg\n/F2 10 Tf\n1 0 0 1 ${PAGE_W - MARGIN - valueW} ${y} Tm\n(${pdfString(v)}) Tj\nET`
      );
      y -= 16;
      return api;
    },

    /** A horizontal rule. */
    rule({ gap = 10, shade = 0.8 } = {}) {
      need(gap * 2);
      y -= gap;
      ops.push(
        `${shade} ${shade} ${shade} RG\n0.7 w\n${MARGIN} ${y} m\n${PAGE_W - MARGIN} ${y} l\nS`
      );
      y -= gap;
      return api;
    },

    /** Vertical space. */
    space(h = 10) {
      y -= h;
      return api;
    },

    /**
     * A clickable link.
     * @param {string} label - Visible text
     * @param {string} url - Target
     */
    link(label, url) {
      const size = 8.5;
      const lines = wrapText(toWinAnsi(label), CONTENT_W, size, false);
      for (const line of lines) {
        need(size * 1.5);
        drawText(line, size, false, 0, '0.13 0.35 0.6');
        const w = textWidth(line, size, false);
        // The annotation rectangle is in page space and must be recorded now,
        // because y moves on and a later page break would misplace it.
        links.push({
          rect: [MARGIN, y - 2, MARGIN + w, y + size],
          url,
          page: pages.length,
        });
        y -= size * 1.5;
      }
      y -= 6;
      return api;
    },

    /**
     * A scatter chart with a fitted line through the origin.
     *
     * The plot a student built by measuring is evidence, and evidence belongs
     * in the report rather than only on screen. PDF has no chart primitive, so
     * this draws it: paths and text, the same operators as everything else.
     *
     * @param {Object} spec
     * @param {Array} spec.points - [{x, y, label}]
     * @param {string} spec.xLabel - Horizontal axis caption
     * @param {string} spec.yLabel - Vertical axis caption
     * @param {number} [spec.slope] - Fitted slope to draw
     * @param {number} [spec.height] - Plot height in points
     */
    chart({
      points = [],
      xLabel = '',
      yLabel = '',
      slope = null,
      height = 190,
    }) {
      const pts = points.filter(
        p => Number.isFinite(p.x) && Number.isFinite(p.y)
      );
      if (!pts.length) return api;

      const padL = 52;
      const padB = 26;
      need(height + 16);
      const bottom = y - height + padB;
      const plotW = CONTENT_W - padL;
      const plotH = height - padB;

      const maxX = Math.max(...pts.map(p => p.x), 0) * 1.08 || 1;
      const maxY = Math.max(...pts.map(p => p.y), 0) * 1.08 || 1;
      const X = v => MARGIN + padL + (v / maxX) * plotW;
      const Y = v => bottom + (v / maxY) * plotH;

      const path = [];
      // Axes
      path.push(
        `0.55 0.55 0.6 RG`,
        `0.8 w`,
        `${MARGIN + padL} ${bottom} m`,
        `${MARGIN + padL + plotW} ${bottom} l`,
        `${MARGIN + padL} ${bottom} m`,
        `${MARGIN + padL} ${bottom + plotH} l`,
        `S`
      );
      // Fitted line through the origin
      if (Number.isFinite(slope) && slope > 0) {
        const xEnd = Math.min(maxX, maxY / slope);
        path.push(
          `0.13 0.45 0.7 RG`,
          `0.8 w`,
          `[3 2] 0 d`,
          `${X(0)} ${Y(0)} m`,
          `${X(xEnd)} ${Y(slope * xEnd)} l`,
          `S`,
          `[] 0 d`
        );
      }
      // Points
      path.push(`0.13 0.45 0.7 rg`);
      for (const p of pts) {
        const cxp = X(p.x);
        const cyp = Y(p.y);
        // A small square: circles need bezier curves and a dot this size reads
        // identically either way.
        path.push(
          `${(cxp - 2).toFixed(2)} ${(cyp - 2).toFixed(2)} 4 4 re`,
          `f`
        );
      }
      ops.push(path.join('\n'));

      // Labels
      const label = (text, lx, ly, size = 7.5, align = 'left') => {
        const t = toWinAnsi(text);
        const wpx = textWidth(t, size, false);
        const x0 =
          align === 'right' ? lx - wpx : align === 'center' ? lx - wpx / 2 : lx;
        ops.push(
          `BT\n0.35 0.35 0.42 rg\n/F1 ${size} Tf\n1 0 0 1 ${x0.toFixed(2)} ${ly.toFixed(2)} Tm\n(${pdfString(t)}) Tj\nET`
        );
      };
      label(`0`, MARGIN + padL - 4, bottom - 2, 7, 'right');
      label(sigText(maxX), MARGIN + padL + plotW, bottom - 10, 7, 'right');
      label(sigText(maxY), MARGIN + padL - 4, bottom + plotH - 3, 7, 'right');
      label(xLabel, MARGIN + padL + plotW / 2, bottom - 19, 8, 'center');
      label(yLabel, MARGIN, bottom + plotH + 6, 8, 'left');
      for (const p of pts) {
        if (p.label) label(String(p.label), X(p.x) + 4, Y(p.y) + 3, 6.5);
      }
      if (Number.isFinite(slope)) {
        label(
          `fitted slope ${slope.toFixed(3)}`,
          MARGIN + padL + 6,
          bottom + plotH - 3,
          7.5
        );
      }

      y = bottom - padB;
      return api;
    },

    /** Force a page break. */
    /**
     * A bulleted list. Wrapped lines hang under the text, not the bullet, so a
     * long item still reads as one item.
     * @param {Array<string>} items - List entries
     * @param {Object} [opts] - {size, indent, gap, marker}
     */
    bullets(
      items,
      { size = 10, indent = 12, gap = 4, marker = '\u2022' } = {}
    ) {
      const hang = indent + 12;
      for (const item of items) {
        if (!item) continue;
        const lines = wrapText(
          toWinAnsi(String(item)),
          CONTENT_W - hang,
          size,
          false
        );
        const lead = size * 1.42;
        lines.forEach((line, i) => {
          need(lead);
          if (i === 0) drawText(toWinAnsi(marker), size, false, indent);
          drawText(line, size, false, hang);
          y -= lead;
        });
        y -= gap;
      }
      y -= 4;
      return api;
    },

    /**
     * A table with a shaded header row and hairline separators.
     *
     * Column widths are fractions of the content width and are normalised, so
     * a caller cannot accidentally describe a table wider than the page: the
     * one failure mode that makes a printed table unreadable.
     *
     * @param {Object} spec
     * @param {Array<string>} spec.columns - Header labels
     * @param {Array<Array<string>>} spec.rows - Cell text
     * @param {Array<number>} [spec.widths] - Relative column widths
     * @param {number} [spec.size] - Body font size
     */
    table({ columns, rows, widths = null, size = 8.5 }) {
      const n = columns.length;
      const raw = widths && widths.length === n ? widths : columns.map(() => 1);
      const total = raw.reduce((t, v) => t + v, 0) || 1;
      const cols = raw.map(v => (v / total) * CONTENT_W);
      const xs = [];
      let acc = MARGIN;
      for (const w of cols) {
        xs.push(acc);
        acc += w;
      }
      const pad = 5;
      const lead = size * 1.35;

      const cellLines = cells =>
        cells.map((cell, i) =>
          wrapText(
            toWinAnsi(String(cell ?? '')),
            cols[i] - pad * 2,
            size,
            false
          )
        );

      const paint = (cells, bold, shade) => {
        const lines = cellLines(cells);
        const height = Math.max(...lines.map(l => l.length)) * lead + pad * 2;
        if (shade) {
          ops.push(
            `${shade} ${shade} ${shade} rg\n${MARGIN} ${y - height} ${CONTENT_W} ${height} re\nf`
          );
        }
        const top = y - pad;
        lines.forEach((col, i) => {
          col.forEach((line, j) => {
            const ty = top - (j + 1) * lead + lead * 0.25;
            ops.push(
              `BT\n0 0 0 rg\n/${bold ? 'F2' : 'F1'} ${size} Tf\n1 0 0 1 ${xs[i] + pad} ${ty} Tm\n(${pdfString(line)}) Tj\nET`
            );
          });
        });
        y -= height;
        ops.push(
          `0.82 0.82 0.85 RG\n0.5 w\n${MARGIN} ${y} m\n${MARGIN + CONTENT_W} ${y} l\nS`
        );
        return api;
      };

      const rowHeight = cells =>
        Math.max(...cellLines(cells).map(l => l.length)) * lead + pad * 2;

      // A table whose columns have no labels is a two-column layout, not a
      // table with a heading; drawing an empty shaded band above it looks
      // like a rendering fault.
      const hasHeader = columns.some(c => String(c ?? '').trim());

      const drawRow = (cells, bold, shade) => {
        const before = pages.length;
        need(rowHeight(cells) + 2);
        // A table that runs onto a second page loses the meaning of its
        // columns unless the header comes with it.
        if (pages.length !== before && hasHeader && !bold) {
          paint(columns, true, 0.93);
        }
        return paint(cells, bold, shade);
      };

      need(40 + (hasHeader ? rowHeight(columns) : 0));
      if (hasHeader) paint(columns, true, 0.93);
      for (const r of rows) drawRow(r, false, null);
      y -= 10;
      return api;
    },

    /**
     * The branded block at the top of an instructor document: a rule in the
     * Gravitas accent, the document kind, the title, and a subtitle.
     * @param {Object} spec - {kicker, title, subtitle}
     */
    titleBlock({ kicker = '', title = '', subtitle = '' } = {}) {
      // A thin accent bar rather than a filled banner: the same identity on
      // screen and on paper, without a page of toner behind it.
      ops.push(`0.13 0.55 0.75 rg\n${MARGIN} ${y - 4} 52 3 re\nf`);
      y -= 22;
      if (kicker) {
        drawText(
          toWinAnsi(kicker.toUpperCase()),
          8.5,
          true,
          0,
          '0.13 0.55 0.75'
        );
        y -= 16;
      }
      for (const line of wrapText(toWinAnsi(title), CONTENT_W, 20, true)) {
        drawText(line, 20, true);
        y -= 25;
      }
      if (subtitle) {
        y -= 2;
        api.paragraph(subtitle, { size: 10.5, gap: 4, color: '0.32 0.34 0.4' });
      }
      api.rule({ gap: 8, shade: 0.85 });
      return api;
    },

    pageBreak() {
      startPage();
      return api;
    },

    /**
     * Finish the document.
     * @returns {Uint8Array} PDF bytes
     */
    build() {
      startPage();
      return assemble(pages, { title, footer });
    },
  };

  return api;
}

/**
 * Turn the accumulated pages into a PDF file.
 *
 * Objects are written in order and their byte offsets recorded, because the
 * cross-reference table at the end is what a reader uses to find anything at
 * all: an offset that is wrong by one byte makes the whole file unopenable.
 */
function assemble(pages, { title, footer }) {
  const objects = [];
  const add = body => {
    objects.push(body);
    return objects.length; // 1-based object numbers
  };

  const fontRegular = add(
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>'
  );
  const fontBold = add(
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>'
  );

  // Reserved so each page can name its parent before the Pages object exists.
  const pagesId = add(null);

  const pageIds = [];
  pages.forEach((page, index) => {
    const footerText = footer
      ? `BT\n0.45 0.45 0.5 rg\n/F1 8 Tf\n1 0 0 1 ${MARGIN} ${MARGIN - 14} Tm\n(${pdfString(toWinAnsi(footer))}) Tj\nET`
      : '';
    const label = `Page ${index + 1} of ${pages.length}`;
    const labelW = textWidth(label, 8, false);
    const pageNum = `BT\n0.45 0.45 0.5 rg\n/F1 8 Tf\n1 0 0 1 ${PAGE_W - MARGIN - labelW} ${MARGIN - 14} Tm\n(${pdfString(label)}) Tj\nET`;

    const stream = [...page.ops, footerText, pageNum]
      .filter(Boolean)
      .join('\n');
    const contentId = add(
      `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`
    );

    const annotIds = page.links.map(l =>
      add(
        `<< /Type /Annot /Subtype /Link /Rect [${l.rect
          .map(n => n.toFixed(2))
          .join(
            ' '
          )}] /Border [0 0 0] /A << /S /URI /URI (${pdfString(l.url)}) >> >>`
      )
    );

    const annots = annotIds.length
      ? ` /Annots [${annotIds.map(i => `${i} 0 R`).join(' ')}]`
      : '';
    pageIds.push(
      add(
        `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] ` +
          `/Resources << /Font << /F1 ${fontRegular} 0 R /F2 ${fontBold} 0 R >> >> ` +
          `/Contents ${contentId} 0 R${annots} >>`
      )
    );
  });

  objects[pagesId - 1] =
    `<< /Type /Pages /Kids [${pageIds.map(i => `${i} 0 R`).join(' ')}] /Count ${pageIds.length} >>`;

  const infoId = add(
    `<< /Title (${pdfString(toWinAnsi(title))}) /Producer (Gravitas) /Creator (Gravitas) >>`
  );
  const catalogId = add(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);

  // --- Serialise -------------------------------------------------------------
  const chunks = [];
  let offset = 0;
  const push = text => {
    chunks.push(text);
    offset += byteLength(text);
  };

  push('%PDF-1.4\n');
  // A binary comment marks the file as containing binary data, which stops
  // tools from mangling line endings in transit.
  push('%\xE2\xE3\xCF\xD3\n');

  const offsets = [0];
  objects.forEach((body, i) => {
    offsets[i + 1] = offset;
    push(`${i + 1} 0 obj\n${body}\nendobj\n`);
  });

  const xrefStart = offset;
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i++) {
    xref += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  push(xref);
  push(
    `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R /Info ${infoId} 0 R >>\n` +
      `startxref\n${xrefStart}\n%%EOF\n`
  );

  return encodeLatin1(chunks.join(''));
}

/** Byte length of a string treated as Latin-1. */
function byteLength(text) {
  return text.length;
}

/**
 * Encode as Latin-1 bytes.
 *
 * Not UTF-8: PDF literal strings with WinAnsiEncoding are single-byte, so a
 * multi-byte encoding here would both corrupt the text and desynchronise every
 * offset in the cross-reference table.
 */
function encodeLatin1(text) {
  const out = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i++) out[i] = text.charCodeAt(i) & 0xff;
  return out;
}

export const PAGE_METRICS = { PAGE_W, PAGE_H, MARGIN, CONTENT_W };
