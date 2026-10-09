// Part 4 of THRESHOLDS.md: the redshift-slice wedge through js/plot/plot.js.
// Output: results/wedge.json and derived-wedge.svg (a rendered example).
import { readFileSync, writeFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { JSDOM } from 'jsdom';
import { here, undelta, mean, rel, writeResult } from './lib.mjs';
import { createCosmology } from './flrw.mjs';

const dom = new JSDOM('<!doctype html><body><svg id="s"></svg></body>');
globalThis.document = dom.window.document;
const { createPlot } = await import('../../js/plot/plot.js');

const d = JSON.parse(readFileSync(`${here}derived/sdss-dr18-redshift-slice.json`, 'utf8'));
const ra = undelta(d.ra).map(v => v * d.units.ra);
const zs = d.z.map(v => v * d.units.z);
const cos = createCosmology({ H0: 70, Om: 0.3, OL: 0.7 });
const RA0 = 180;
const DEG = Math.PI / 180;
const wedge = (raDeg, z) => {
  const r = cos.comovingDistance(z);
  const th = (raDeg - RA0) * DEG;
  return { r, th, x: r * Math.sin(th), y: r * Math.cos(th) };
};
const invert = (x, y) => {
  const r = Math.hypot(x, y);
  const th = Math.atan2(x, y);
  let lo = 0, hi = 1;
  while (cos.comovingDistance(hi) < r) hi *= 2;
  for (let i = 0; i < 200; i++) { const m = (lo + hi) / 2; if (cos.comovingDistance(m) < r) lo = m; else hi = m; }
  return { ra: RA0 + th / DEG, z: (lo + hi) / 2 };
};
const pts = ra.map((a, i) => wedge(a, zs[i]));
let worstRa = 0, worstZ = 0;
for (let i = 0; i < pts.length; i += 1) {
  const b = invert(pts[i].x, pts[i].y);
  worstRa = Math.max(worstRa, Math.abs(b.ra - ra[i]) / Math.abs(ra[i]));
  worstZ = Math.max(worstZ, rel(b.z, zs[i]));
}

const col = (id, name, unit, role, values) => ({ id, name, unit, role, values: Float64Array.from(values) });
const o = {
  kind: 'table',
  axes: ['x', 'y'],
  columns: [col('x', 'Across the line of sight', 'Mpc', 'x', pts.map(p => p.x)), col('y', 'Distance along the line of sight', 'Mpc', 'value', pts.map(p => p.y))],
  masks: [],
};
const svg = dom.window.document.getElementById('s');
const plot = createPlot(svg, {
  number: v => String(Math.round(v)),
  labels: { notStated: 'unit not stated', row: 'Row', masked: '(masked)', missing: 'missing' },
});
const times = [];
for (let k = 0; k < 7; k++) {
  const t0 = performance.now();
  plot.draw(o, { xColumn: 'x', yColumn: 'y' });
  times.push(performance.now() - t0);
}
times.sort((a, b) => a - b);
const titles = [...svg.querySelectorAll('text.ow-label')].map(t => t.textContent);
writeFileSync(`${here}results/wedge.svg`, svg.outerHTML);

// Counts in cells: shells of 25 Mpc between 100 and 400 Mpc, 5-degree sectors.
const shells = [];
for (let r0 = 100; r0 < 400; r0 += 25) {
  const counts = new Array(24).fill(0);
  for (const p of pts) if (p.r >= r0 && p.r < r0 + 25) { const k = Math.floor((p.th / DEG + 60) / 5); if (k >= 0 && k < 24) counts[k]++; }
  const m = mean(counts);
  const v = counts.reduce((s, c) => s + (c - m) ** 2, 0) / (counts.length - 1);
  shells.push({ r0, mean: m, vmr: m ? v / m : null });
}
const vmr = mean(shells.filter(s => s.vmr !== null).map(s => s.vmr));
writeResult('wedge', {
  points: pts.length,
  drawn: plot.drawnCount(),
  drawMsMedian: times[3],
  drawMsMax: times[6],
  axisTitles: titles,
  roundTripWorstRelRa: worstRa,
  roundTripWorstRelZ: worstZ,
  shells,
  meanVmr: vmr,
  caption: `${plot.drawnCount()} of ${pts.length} galaxies drawn (one point kept in each plot cell); SDSS legacy main sample, r < 17.77, strip ${JSON.stringify(d.strip)}.`,
});
console.log({ points: pts.length, drawn: plot.drawnCount(), ms: times[3], titles, worstRa, worstZ, vmr });
