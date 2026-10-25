/* global console, process */
// P1.plot (Prompt 199 spike): the family's three plots through js/plot/chart.js, in jsdom.
// usage: node p1.mjs out.json
import { writeFileSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><body></body>', { pretendToBeVisual: true, url: 'http://localhost/' });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.getComputedStyle = dom.window.getComputedStyle;
globalThis.CSS = { escape: s => s };

const { ATMOSPHERE_WIDGETS } = await import('../../js/atmosphereWidgets.js');
const { t } = await import('../../js/i18n/index.js');
const out = { plots: [] };
let ok = true;
const num = Number;

for (const w of ATMOSPHERE_WIDGETS) {
  const canvas = document.createElement('canvas');
  const mount = document.createElement('div');
  mount.append(canvas);
  document.body.append(mount);
  const values = Object.fromEntries(w.controls.map(c => [c.id, c.value]));
  const spec = w.draw(canvas, values);
  const svg = mount.querySelector('svg[role=group]');
  const host = canvas.nextElementSibling;
  const rows = w.readout(values);
  const paths = [...svg.querySelectorAll('path')].filter(p => p.getAttribute('d'));
  // vertices: the x axis from its tick labels (exact), the y axis from its tick labels' slope with one constant label offset
  const tn = x => parseFloat(x.textContent.replace(/[,\u202f\u00a0 ]/g, ''));
  const tt = [...svg.querySelectorAll('text')].filter(x => Number.isFinite(tn(x)) && /^[-\d.,\u202f\u00a0 ]+$/.test(x.textContent));
  const xt = tt.filter(x => x.getAttribute('text-anchor') === 'middle').map(x => [tn(x), +x.getAttribute('x')]);
  const yt = tt.filter(x => x.getAttribute('text-anchor') === 'end').map(x => [tn(x), +x.getAttribute('y')]);
  const slope = pts => (pts[pts.length - 1][1] - pts[0][1]) / (pts[pts.length - 1][0] - pts[0][0]);
  const sx = slope(xt);
  const bx = xt[0][1] - sx * xt[0][0];
  const sy = slope(yt);
  const lineSeries = spec.series.filter(q => (q.mode ?? 'line') === 'line');
  let worstX = 0;
  let worstY = 0;
  const offs = [];
  lineSeries.forEach((q, k) => {
    const v = [...paths[k].getAttribute('d').matchAll(/[ML]([-\d.]+),([-\d.]+)/g)].map(m => [+m[1], +m[2]]);
    if (v.length !== q.x.length) {
      worstX = Infinity;
      return;
    }
    v.forEach((p, i) => {
      worstX = Math.max(worstX, Math.abs(p[0] - (sx * q.x[i] + bx)));
      offs.push(p[1] - sy * q.y[i]);
    });
  });
  const medOff = offs.slice().sort((a, b) => a - b)[Math.floor(offs.length / 2)];
  offs.forEach(o => (worstY = Math.max(worstY, Math.abs(o - medOff))));
  const tickOffset = medOff - (yt[0][1] - sy * yt[0][0]);
  const vertexOk = worstX <= 0.1 && worstY <= 0.1 && Math.abs(tickOffset) <= 8;
  const dots = [...svg.querySelectorAll('circle')];
  const legend = host.querySelector('ul');
  const buttons = legend ? [...legend.querySelectorAll('button')] : [];
  const texts = [...svg.querySelectorAll('text')].map(x => x.textContent);
  const status = host.querySelector('[role=status]');
  // keyboard: focus the svg, press Right, the polite status says the values in words
  svg.focus();
  svg.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
  const spoken = status.textContent;
  // legend toggle from the keyboard: Enter/click on the first button hides a series
  let toggled = false;
  if (buttons.length) {
    const was = buttons[0].getAttribute('aria-pressed');
    buttons[0].dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    buttons[0].click();
    toggled = was === 'true' && buttons[0].getAttribute('aria-pressed') === 'false';
  }
  // the vertices: read the first line path back against the geometry the chart drew (tick label positions are the chart's own; compare the path's point count with the data)
  const first = paths[0];
  const verts = first ? first.getAttribute('d').split(/[ML]/).filter(Boolean).length : 0;
  const hasUnits = texts.some(x => /\(.+\)/.test(x)) ;
  out.plots.push({
    vertexWorstXPx: worstX,
    vertexWorstYPx: worstY,
    yLabelOffsetPx: tickOffset,
    widget: w.id,
    paths: paths.length,
    dots: dots.length,
    legendButtons: buttons.length,
    firstPathVertices: verts,
    axisTitles: texts.filter(x => /\(/.test(x) || /Jeans parameter/.test(x)),
    spoken,
    toggled,
    readoutRows: rows.length,
  });
  if (!vertexOk || !paths.length || !spoken || (buttons.length && !toggled) || !hasUnits && w.id !== 'atmosphere-escape') ok = false;
  document.body.innerHTML = '';
}

// no module under js/ outside js/plot draws an axis: the family's files contain no canvas context calls
const files = ['js/atmosphereWidgets.js', 'js/atmosphereEscape.js', 'js/kernels/atmospheres/index.js'];
const src = files.map(f => readFileSync(path.join(process.cwd(), f), 'utf8')).join('\n');
out.noOwnDrawing = !/getContext|strokeText|fillText|moveTo|lineTo|createElementNS/.test(src);
out.title = t('atmW.b.title');
ok = ok && out.noOwnDrawing;
out.ok = ok;
writeFileSync(process.argv[2], JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 1));
