// =============================================================================
// js/plot/: a chart as a PNG
// -----------------------------------------------------------------------------
// Fetched by ./chart.js when an export is asked for, so a chart that never
// exports never pays for it. The picture is the chart's own <svg>, copied with
// the styles the page gives it written into the copy (a standalone image has
// no page: a color that is a CSS variable on the page is nothing in it), a
// background behind it, and the legend drawn above it, since the legend is
// buttons in the page and not part of the svg.
// =============================================================================

const NS = 'http://www.w3.org/2000/svg';
/** What the page's CSS decides about a mark, to be written onto it. */
const PROPS = [
  'fill',
  'fill-opacity',
  'stroke',
  'stroke-width',
  'stroke-dasharray',
  'font-size',
  'font-family',
  'font-weight',
  'text-anchor',
  'visibility',
];
const ROW = 18;

const node = (name, attrs = {}) => {
  const n = document.createElementNS(NS, name);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, String(v));
  return n;
};

/** The first background that is not clear, from the chart outward. */
function backdrop(from) {
  for (let n = from; n; n = n.parentElement) {
    const c = getComputedStyle(n).backgroundColor;
    if (c && c !== 'transparent' && c !== 'rgba(0, 0, 0, 0)') return c;
  }
  return '#ffffff';
}

/**
 * The chart as standalone SVG text.
 * @param {{svg: SVGSVGElement, width: number, height: number,
 *   series: Array<object>}} parts - From chart.parts()
 * @param {{legend?: boolean, background?: string}} [opts]
 * @returns {{text: string, width: number, height: number}}
 */
export function exportSvg(parts, { legend = true, background } = {}) {
  const { svg, width, height } = parts;
  const copy = svg.cloneNode(true);
  const from = [svg, ...svg.querySelectorAll('*')];
  const to = [copy, ...copy.querySelectorAll('*')];
  from.forEach((n, i) => {
    const style = getComputedStyle(n);
    for (const p of PROPS) {
      const v = style.getPropertyValue(p);
      if (v) to[i].setAttribute(p, v);
    }
  });
  for (const a of [
    'tabindex',
    'style',
    'role',
    'aria-label',
    'aria-roledescription',
  ]) {
    copy.removeAttribute(a);
  }

  // The legend, wrapped to the chart's width.
  const ink = getComputedStyle(svg).color || '#999999';
  const marks = [];
  let rows = 0;
  if (legend) {
    const shown = parts.series.filter(s => !s.hidden);
    let x = 8;
    rows = shown.length ? 1 : 0;
    for (const s of shown) {
      const span = 26 + 6 + s.label.length * 6.4 + 16;
      if (x + span > width && x > 8) {
        x = 8;
        rows++;
      }
      const y = (rows - 1) * ROW + 10;
      if (s.mode !== 'points') {
        marks.push(
          node('line', {
            x1: x,
            y1: y,
            x2: x + 24,
            y2: y,
            stroke: s.color,
            'stroke-width': Math.min(3, s.width),
            'stroke-dasharray': s.dash.length ? s.dash.join(' ') : 'none',
          })
        );
      }
      if (s.mode !== 'line') {
        marks.push(node('circle', { cx: x + 12, cy: y, r: 3, fill: s.color }));
      }
      const t = node('text', {
        x: x + 32,
        y: y + 4,
        fill: ink,
        'font-size': 12,
      });
      t.textContent = s.label;
      marks.push(t);
      x += span;
    }
  }
  const top = rows ? rows * ROW + 6 : 0;
  const bg = node('rect', {
    x: 0,
    y: -top,
    width,
    height: height + top,
    fill: background ?? backdrop(svg),
  });
  const bar = node('g', { transform: `translate(0 ${-top})` });
  bar.append(...marks);
  copy.insertBefore(bg, copy.firstChild);
  copy.append(bar);
  copy.setAttribute('viewBox', `0 ${-top} ${width} ${height + top}`);
  copy.setAttribute('width', width);
  copy.setAttribute('height', height + top);
  return {
    text: new window.XMLSerializer().serializeToString(copy),
    width,
    height: height + top,
  };
}

/**
 * The chart as a PNG.
 * @param {object} parts - From chart.parts()
 * @param {{scale?: number, legend?: boolean, background?: string}} [opts] -
 *   scale is device pixels per chart pixel (2 by default)
 * @returns {Promise<Blob>} image/png
 */
export async function toPNG(parts, { scale = 2, ...rest } = {}) {
  const { text, width, height } = exportSvg(parts, rest);
  const url = URL.createObjectURL(
    new Blob([text], { type: 'image/svg+xml;charset=utf-8' })
  );
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
    return await new Promise((resolve, reject) =>
      canvas.toBlob(
        b => (b ? resolve(b) : reject(new Error('The PNG could not be made.'))),
        'image/png'
      )
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}
