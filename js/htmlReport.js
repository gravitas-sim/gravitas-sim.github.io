// =============================================================================
// The accessible HTML report
// -----------------------------------------------------------------------------
// The same report the PDF is, as one self-contained HTML document: headings in
// order, lists and tables as lists and tables, every figure with its alternative
// text and the numbers it draws as a table, and nothing a reader has to see to
// use (no script, no remote font, no image file). It prints, and it adapts to
// the reader's light or dark setting.
//
// createHtmlDocument() has the document builder of js/pdf.js as its interface,
// so the lab report and the evidence report are written once: they take a
// builder as an option and this is the other one. What a PDF has and a page
// does not (page breaks, vertical space, the room left on a page) is accepted
// and ignored or kept as a print hint.
// =============================================================================

import { formatNumber } from './format.js';

const esc = s =>
  String(s ?? '').replace(
    /[&<>"']/g,
    c =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        c
      ]
  );

const CSS = `
:root{color-scheme:light dark;--fg:#16181d;--bg:#fff;--muted:#4a4f5a;--rule:#c9ced8;--accent:#0b6b8a;--shade:#eef1f6}
@media (prefers-color-scheme:dark){:root{--fg:#e8eaf0;--bg:#14161b;--muted:#b3b8c4;--rule:#3a3f4b;--accent:#6cc4e0;--shade:#1f232b}}
body{margin:0 auto;max-width:46rem;padding:1.5rem 1rem 3rem;background:var(--bg);color:var(--fg);font:1rem/1.55 system-ui,-apple-system,"Segoe UI",sans-serif}
h1{font-size:1.7rem;line-height:1.25;margin:0 0 .25rem}
h2{font-size:1.3rem;margin:2rem 0 .5rem}
h3{font-size:1.05rem;margin:1.5rem 0 .4rem}
.kicker{margin:0;color:var(--accent);font-size:.8rem;letter-spacing:.08em;text-transform:uppercase;font-weight:700}
.subtitle,.muted{color:var(--muted)}
hr{border:0;border-top:1px solid var(--rule);margin:1.25rem 0}
dl{margin:.5rem 0;display:grid;grid-template-columns:minmax(8rem,max-content) 1fr;gap:.2rem 1rem}
dt{color:var(--muted)}
dd{margin:0;font-weight:600;overflow-wrap:anywhere}
.field{margin:.6rem 0}
.field strong{display:block;color:var(--muted);font-size:.9rem}
.field p{margin:.15rem 0 0 .75rem}
table{border-collapse:collapse;width:100%;margin:.75rem 0;font-size:.92rem}
caption{text-align:left;color:var(--muted);padding:.25rem 0}
th,td{border-bottom:1px solid var(--rule);padding:.3rem .5rem;text-align:left;vertical-align:top;overflow-wrap:anywhere}
thead th{background:var(--shade)}
figure{margin:1rem 0}
figcaption{color:var(--muted);font-size:.9rem}
svg{max-width:100%;height:auto;background:var(--bg);border:1px solid var(--rule)}
details{margin:.25rem 0 1rem}
summary{cursor:pointer}
a{color:var(--accent)}
.blank{border-bottom:1px solid var(--rule);height:1.8rem}
@media print{body{max-width:none;padding:0}.pb{break-after:page}details{display:block}summary{display:none}details>*{display:block}}
`;

const num = (v, locale) => formatNumber(v, { sig: 6, locale });
/** A drawing coordinate: one decimal, always a dot (it is an attribute, not text). */
const px = v => Math.round(v * 10) / 10;

/**
 * A small scatter or line drawing of numeric series, with its own title and
 * description so it reads as an image with text; the numbers are in the table
 * beside it, which is what a reader who cannot see it is given.
 */
function plotSvg({ series, xLabel, yLabel, title, slope = null, locale }) {
  const W = 560;
  const H = 300;
  const L = 56;
  const B = 36;
  const T = 12;
  const R = 12;
  const xs = series.flatMap(s => s.points.map(p => p[0]));
  const ys = series.flatMap(s => s.points.map(p => p[1]));
  let x0 = Math.min(...xs);
  let x1 = Math.max(...xs);
  let y0 = Math.min(...ys);
  let y1 = Math.max(...ys);
  if (!(x1 > x0)) [x0, x1] = [x0 - 0.5, x1 + 0.5];
  if (!(y1 > y0)) [y0, y1] = [y0 - 0.5, y1 + 0.5];
  const X = v => L + ((v - x0) / (x1 - x0)) * (W - L - R);
  const Y = v => H - B - ((v - y0) / (y1 - y0)) * (H - B - T);
  const ink = ['#0b6b8a', '#b4501b', '#5a4fb0', '#2d7d46'];
  const parts = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="t d">`,
    `<title id="t">${esc(title)}</title>`,
    `<desc id="d">${esc(`${yLabel} against ${xLabel}: ${series.map(s => `${s.label || 'series'}, ${s.points.length} points`).join('; ')}. The numbers are in the table below.`)}</desc>`,
    `<g stroke="currentColor" fill="none" stroke-width="1" opacity=".6"><path d="M${L} ${T}V${H - B}H${W - R}"/></g>`,
    `<g fill="currentColor" font-size="11" font-family="system-ui,sans-serif">`,
    `<text x="${L}" y="${H - B + 14}">${esc(num(x0, locale))}</text>`,
    `<text x="${W - R}" y="${H - B + 14}" text-anchor="end">${esc(num(x1, locale))}</text>`,
    `<text x="${L - 6}" y="${H - B}" text-anchor="end">${esc(num(y0, locale))}</text>`,
    `<text x="${L - 6}" y="${T + 8}" text-anchor="end">${esc(num(y1, locale))}</text>`,
    `<text x="${(L + W - R) / 2}" y="${H - 6}" text-anchor="middle">${esc(xLabel)}</text>`,
    `<text transform="translate(12 ${(T + H - B) / 2}) rotate(-90)" text-anchor="middle">${esc(yLabel)}</text>`,
    `</g>`,
  ];
  series.forEach((s, k) => {
    const color = ink[k % ink.length];
    const pts = s.points.map(p => `${px(X(p[0]))},${px(Y(p[1]))}`);
    if (s.style === 'dashed' || s.line)
      parts.push(
        `<polyline points="${pts.join(' ')}" fill="none" stroke="${color}" stroke-width="1.5"${s.style === 'dashed' ? ' stroke-dasharray="6 4"' : ''}/>`
      );
    else
      for (const p of s.points)
        parts.push(
          `<circle cx="${px(X(p[0]))}" cy="${px(Y(p[1]))}" r="3" fill="${color}"/>`
        );
  });
  if (Number.isFinite(slope))
    parts.push(
      `<line x1="${X(Math.max(0, x0))}" y1="${Y(slope * Math.max(0, x0))}" x2="${X(x1)}" y2="${Y(slope * x1)}" stroke="#b4501b" stroke-width="1.5" stroke-dasharray="6 4"/>`
    );
  parts.push('</svg>');
  return parts.join('');
}

/**
 * The builder.
 * @param {object} [o]
 * @param {string} [o.title] - The document's title
 * @param {string} [o.footer] - Printed as the closing line
 * @param {string} [o.lang] - BCP 47 tag, 'en-US' or 'es-ES'
 * @param {string} [o.keywords] - The machine-readable submission token, as the
 *   PDF carries it in /Keywords
 * @param {string} [o.subject] - Ignored beside the title; kept for the interface
 * @returns {object} The builder, with the interface of js/pdf.js createDocument
 */
export function createHtmlDocument({
  title = 'Document',
  footer = '',
  lang = 'en-US',
  keywords = '',
} = {}) {
  const locale = lang.slice(0, 2);
  const out = [];
  let rows = [];
  let level = 0; // the deepest heading level used so far
  let figures = 0;
  const flush = () => {
    if (!rows.length) return;
    out.push(`<dl>${rows.join('')}</dl>`);
    rows = [];
  };
  const add = html => {
    flush();
    out.push(html);
  };
  const api = {
    remaining: () => Infinity,
    heading(text, { size = 14 } = {}) {
      // One h1 for the document, then h2 and h3 in order; a size is a hint, and
      // a heading level is never skipped.
      let n = size >= 18 ? 1 : size >= 14 ? 2 : 3;
      if (n === 1 && level >= 1) n = 2;
      if (n > level + 1) n = level + 1;
      level = Math.max(level, n);
      add(`<h${n}>${esc(text)}</h${n}>`);
      return api;
    },
    paragraph(text, { color = null } = {}) {
      add(`<p${color ? ' class="muted"' : ''}>${esc(text)}</p>`);
      return api;
    },
    writingSpace(label, { lines = 3 } = {}) {
      add(
        `<div class="field"><strong>${esc(label)}</strong>${'<div class="blank"></div>'.repeat(lines)}</div>`
      );
      return api;
    },
    field(label, value) {
      const v = String(value ?? '').trim();
      add(
        `<div class="field"><strong>${esc(label)}</strong><p${v ? '' : ' class="muted"'}>${esc(v || '(no answer given)')}</p></div>`
      );
      return api;
    },
    row(label, value) {
      rows.push(`<dt>${esc(label)}</dt><dd>${esc(value)}</dd>`);
      return api;
    },
    rule() {
      add('<hr>');
      return api;
    },
    space() {
      return api;
    },
    link(label, url) {
      const safe = /^https?:\/\//i.test(url) ? url : '#';
      add(`<p><a href="${esc(safe)}">${esc(label)}</a></p>`);
      return api;
    },
    bullets(items) {
      const li = items.filter(Boolean).map(i => `<li>${esc(i)}</li>`);
      if (li.length) add(`<ul>${li.join('')}</ul>`);
      return api;
    },
    table({ columns, rows: body, caption = '' }) {
      add(
        `<table>${caption ? `<caption>${esc(caption)}</caption>` : ''}<thead><tr>${columns
          .map(c => `<th scope="col">${esc(c)}</th>`)
          .join('')}</tr></thead><tbody>${body
          .map(r => `<tr>${r.map(c => `<td>${esc(c)}</td>`).join('')}</tr>`)
          .join('')}</tbody></table>`
      );
      return api;
    },
    /** The lesson plot: points {x, y, label} and a fitted slope through zero. */
    chart({ points = [], xLabel = '', yLabel = '', slope = null }) {
      const pts = points.filter(
        p => Number.isFinite(p.x) && Number.isFinite(p.y)
      );
      if (!pts.length) return api;
      return api.figure({
        series: [{ label: yLabel, points: pts.map(p => [p.x, p.y]) }],
        xLabel,
        yLabel,
        slope,
        labels: pts.map(p => p.label || ''),
      });
    },
    figure({
      series = [],
      xLabel = '',
      yLabel = '',
      slope = null,
      labels = null,
    }) {
      const kept = series.filter(s => s?.points?.length);
      if (!kept.length) return api;
      figures += 1;
      const name = `${yLabel} against ${xLabel}`;
      const tables = kept
        .map(s => {
          const hasErr = Array.isArray(s.errors);
          const head = [xLabel, yLabel, ...(hasErr ? ['Uncertainty'] : [])];
          const label = labels ? ['Point'] : [];
          const body = s.points.map((p, i) => [
            ...(labels ? [labels[i] || String(i + 1)] : []),
            num(p[0], locale),
            num(p[1], locale),
            ...(hasErr ? [num(s.errors[i], locale)] : []),
          ]);
          return `<table><caption>${esc(s.label || name)}${s.kind ? ` (${esc(s.kind)})` : ''}</caption><thead><tr>${[
            ...label,
            ...head,
          ]
            .map(c => `<th scope="col">${esc(c)}</th>`)
            .join('')}</tr></thead><tbody>${body
            .map(r => `<tr>${r.map(c => `<td>${esc(c)}</td>`).join('')}</tr>`)
            .join('')}</tbody></table>`;
        })
        .join('');
      add(
        `<figure>${plotSvg({ series: kept, xLabel, yLabel, title: name, slope, locale })}<figcaption>${esc(name)}. The data it draws:</figcaption>${tables}</figure>`
      );
      return api;
    },
    titleBlock({ kicker = '', title: t = '', subtitle = '' } = {}) {
      level = Math.max(level, 1);
      add(
        `${kicker ? `<p class="kicker">${esc(kicker)}</p>` : ''}<h1>${esc(t)}</h1>${subtitle ? `<p class="subtitle">${esc(subtitle)}</p>` : ''}<hr>`
      );
      return api;
    },
    pageBreak() {
      add('<div class="pb"></div>');
      return api;
    },
    /** @returns {string} The finished document */
    build() {
      flush();
      return `<!doctype html>
<html lang="${esc(locale)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
${keywords ? `<meta name="keywords" content="${esc(keywords)}">\n` : ''}<style>${CSS}</style>
</head>
<body>
<main>
${out.join('\n')}
</main>
${footer ? `<footer><hr><p class="muted">${esc(footer)}</p></footer>` : ''}
</body>
</html>
`;
    },
  };
  api.figureCount = () => figures;
  return api;
}

/**
 * Hand the finished HTML to the browser as a download.
 * @param {string} html - The document
 * @param {string} filename - Suggested filename
 */
export function downloadHtml(html, filename) {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
