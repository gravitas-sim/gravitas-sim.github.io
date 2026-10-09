// SPIKE (Prompt 87). T3: consistency, accessibility, low-end cost, phone. Serves the
// repository root and the (uncommitted) star file on a private port; Chromium only.
//   node browser-check.mjs <stars.json> [port]
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const [starsFile, portArg] = process.argv.slice(2);
const PORT = Number(portArg ?? 43187);
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.css': 'text/css' };
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]);
  const f = u === '/spike/sky/stars.json' ? starsFile : path.join(ROOT, u);
  if (!f.startsWith(ROOT) && f !== starsFile) { res.writeHead(403).end(); return; }
  fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { 'content-type': MIME[path.extname(f)] ?? 'application/octet-stream', 'cache-control': 'no-store' }).end(d); });
}).listen(PORT, '127.0.0.1');
const URL_ = `http://127.0.0.1:${PORT}/spike/sky/index.html`;
const NSTARS = process.env.NSTARS ? `?n=${process.env.NSTARS}` : '';
const results = [];
const rec = (id, what, value, unit, limit, pass, extra = {}) => { results.push({ id, what, value, unit, limit, pass, ...extra }); console.log(`${pass ? 'PASS' : 'FAIL'} ${id} ${what}: ${typeof value === 'number' ? +value.toPrecision(4) : value} ${unit} (limit ${limit})`); };
const info = (id, what, value, unit) => { results.push({ id, what, value, unit, limit: null, pass: null }); console.log(`INFO ${id} ${what}: ${typeof value === 'number' ? +value.toPrecision(4) : JSON.stringify(value)} ${unit}`); };

const browser = await chromium.launch();
try {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(URL_ + NSTARS);
  await page.waitForFunction(() => window.skyReady === true);

  // ---- T3.1 consistency over 500 random instants and sites
  const t31 = await page.evaluate(() => {
    let seed = 87; const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
    let worstPos = 0, mismatches = 0, setMismatch = 0, checked = 0;
    for (let k = 0; k < 500; k++) {
      const jd = 2415020.5 + rnd() * (2488069.5 - 2415020.5);
      window.skyLab.setSite(Math.asin(rnd() * 1.8 - 0.9) * 180 / Math.PI, rnd() * 360 - 180);
      window.skyLab.setTime(jd);
      const circles = [...document.querySelectorAll('#horizon g.obj')].filter(c => c.style.display !== 'none');
      const rows = new Map([...document.querySelectorAll('#rows tr')].map(tr => [tr.dataset.id, tr]));
      if (rows.size !== circles.length) setMismatch++;
      for (const c of circles) {
        checked++;
        const id = c.dataset.id, alt = +c.dataset.alt, az = +c.dataset.az;
        const mt = /translate\(([-\d.]+) ([-\d.]+)\)/.exec(c.getAttribute('transform'));
        const u = window.skyLab.unproject(+mt[1], +mt[2]);
        const D = Math.PI / 180;
        const cs = Math.sin(alt * D) * Math.sin(u.altDeg * D) + Math.cos(alt * D) * Math.cos(u.altDeg * D) * Math.cos((az - u.azDeg) * D);
        worstPos = Math.max(worstPos, Math.acos(Math.min(1, cs)) / D);
        const tr = rows.get(id);
        if (!tr) { mismatches++; continue; }
        const cells = tr.children;
        if (cells[2].textContent !== c.dataset.alt || cells[3].textContent !== c.dataset.az) mismatches++;
      }
    }
    return { worstPos, mismatches, setMismatch, checked };
  });
  rec('T3.1a', `drawn values vs table cells, 500 instants (${t31.checked} objects)`, t31.mismatches, 'mismatches', 0, t31.mismatches === 0);
  rec('T3.1b', 'drawn objects vs table rows, set equality', t31.setMismatch, 'instants differing', 0, t31.setMismatch === 0);
  rec('T3.1c', 'drawn position (x, y) vs its altitude/azimuth, angular, max', t31.worstPos, 'deg', 0.01, t31.worstPos <= 0.01);

  // ---- T3.2 axe at two widths, keyboard sort
  const AX = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
  for (const w of [1440, 360]) {
    await page.setViewportSize({ width: w, height: w === 360 ? 780 : 900 });
    await page.evaluate(() => window.skyLab.setTime(2461120.625));
    const a = await new AxeBuilder({ page }).withTags(AX).analyze();
    rec(`T3.2-axe-${w}`, `axe violations at ${w}px (${a.passes.length} rules passed)`, a.violations.length, 'violations', 0, a.violations.length === 0, { ids: a.violations.map(v => v.id + ':' + v.nodes.length) });
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  const firstBefore = await page.locator('#rows tr:first-child th').textContent();
  await page.focus('#head th:nth-child(1) button');
  await page.keyboard.press('Enter');
  const ariaSort = await page.getAttribute('#head th:nth-child(1)', 'aria-sort');
  const firstAfter = await page.locator('#rows tr:first-child th').textContent();
  const names = await page.$$eval('#rows tr th', ths => ths.map(t => t.textContent));
  const sortedOk = names.every((n, i) => i === 0 || names[i - 1].localeCompare(n) <= 0);
  rec('T3.2b', 'keyboard sort by name: aria-sort and order', `${ariaSort}, first ${firstAfter}, sorted=${sortedOk}`, '', 'ascending + sorted', ariaSort === 'ascending' && sortedOk);
  const semantics = await page.evaluate(() => ({ caption: !!document.querySelector('table caption'), colHeads: document.querySelectorAll('thead th[scope=col]').length, rowHeads: document.querySelectorAll('tbody th[scope=row]').length === document.querySelectorAll('tbody tr').length, imgName: !!document.getElementById('horizon').getAttribute('aria-label') }));
  rec('T3.2c', 'table semantics (caption, 6 col heads, row heads) and named figure', JSON.stringify(semantics), '', 'all true', semantics.caption && semantics.colHeads === 6 && semantics.rowHeads && semantics.imgName);

  // ---- T3.3 cost at 4x CPU throttle
  const cdp = await ctx.newCDPSession(page);
  const measure = async rate => {
    await cdp.send('Emulation.setCPUThrottlingRate', { rate });
    const r = await page.evaluate(() => {
      const draw = [], tab = [], full = [], comp = [], dom = [];
      const s = window.skyLab;
      s.setSite(33.6, -94.7); s.setTime(2461120.625);
      for (let i = 0; i < 100; i++) {
        s.state.jdUt += 0.013;
        const t0 = performance.now();
        s.update();                                   // compute + attribute updates
        document.getElementById('horizon').getBoundingClientRect(); document.body.offsetHeight; // style + layout
        draw.push(performance.now() - t0); comp.push(s.state.profile.compute); dom.push(s.state.profile.dom);
        const t1 = performance.now();
        s.updateAll();                                // + table + equatorial map
        document.body.offsetHeight;
        full.push(performance.now() - t1);
      }
      const med = a => [...a].sort((x, y) => x - y)[a.length >> 1], p95 = a => [...a].sort((x, y) => x - y)[Math.floor(a.length * 0.95)];
      return { compMed: med(comp), domMed: med(dom), drawMed: med(draw), drawP95: p95(draw), fullMed: med(full), fullP95: p95(full), stars: s.state.stars.length };
    });
    return r;
  };
  const m1 = await measure(1);
  const m4 = await measure(4);
  rec('T3.3a', `horizon redraw (1,000 stars + Sun, Moon, 5 planets), median, 4x CPU throttle (n=${m4.stars} stars)`, m4.drawMed, 'ms', 16, m4.drawMed <= 16, { p95: m4.drawP95 });
  info('T3.3b', 'same, 95th percentile at 4x', m4.drawP95, 'ms');
  info('T3.3b2', 'median split at 4x: compute / attribute writes (the rest is style and layout)', `${m4.compMed.toFixed(2)} / ${m4.domMed.toFixed(2)}`, 'ms');
  info('T3.3c', 'same, median unthrottled', m1.drawMed, 'ms');
  info('T3.3d', 'full update including 500-row table and equatorial map, median at 4x', m4.fullMed, 'ms');
  info('T3.3e', 'full update, 95th percentile at 4x', m4.fullP95, 'ms');
  // time-lapse: 60 steps through the real play loop, one redraw per frame
  const lapse = await page.evaluate(async () => {
    const s = window.skyLab; const frames = []; let redraws = 0;
    document.getElementById('play').click();
    const r0 = s.state.loopRedraws || 0; // the click itself draws once, synchronously; the rest are one per animation frame
    await new Promise(r => { let n = 0, last = performance.now(); const f = now => { frames.push(now - last); last = now; if (++n < 60) requestAnimationFrame(f); else r(); }; requestAnimationFrame(f); });
    document.getElementById('play').click();
    redraws = (s.state.loopRedraws || 0) - r0;
    const sorted = [...frames.slice(1)].sort((a, b) => a - b);
    return { median: sorted[sorted.length >> 1], max: sorted[sorted.length - 1], over20: sorted.filter(x => x > 20).length, redraws, frames: frames.length };
  });
  rec('T3.3f', `time-lapse, 60 frames through the play loop at 4x: redraws per frame (${lapse.redraws} redraws, ${lapse.frames} frames)`, lapse.redraws / lapse.frames, 'per frame', 1, lapse.redraws <= lapse.frames);
  info('T3.3g', 'time-lapse median / max frame interval at 4x', `${lapse.median.toFixed(1)} / ${lapse.max.toFixed(1)}`, 'ms');
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });

  // ---- T3.4 phone
  await page.setViewportSize({ width: 360, height: 780 });
  await page.evaluate(() => window.dispatchEvent(new Event('resize')));
  const ph = await page.evaluate(() => {
    const doc = document.documentElement;
    const small = [];
    for (const e of document.querySelectorAll('button, input, a[href], select, [tabindex]')) { const r = e.getBoundingClientRect(); if (r.width === 0) continue; if (r.width < 24 || r.height < 24) small.push(e.tagName + '#' + (e.id || e.textContent.slice(0, 12)) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height)); }
    const svg = document.getElementById('horizon'); const scale = svg.getBoundingClientRect().width / 1000;
    const sizes = [...document.querySelectorAll('#horizon text')].filter(t => t.style.display !== 'none').map(t => parseFloat(getComputedStyle(t).fontSize) * scale);
    return { scrollW: doc.scrollWidth, clientW: doc.clientWidth, small, minLabelPx: Math.min(...sizes), svgW: svg.getBoundingClientRect().width };
  });
  rec('T3.4a', 'horizontal page scroll at 360 px (scrollWidth - 360)', ph.scrollW - 360, 'px', 0, ph.scrollW <= 360);
  rec('T3.4b', 'interactive controls smaller than 24 x 24 CSS px', ph.small.length, 'controls', 0, ph.small.length === 0, { small: ph.small.slice(0, 5) });
  rec('T3.4c', 'smallest drawing label as rendered at 360 px', ph.minLabelPx, 'px', '>= 11', ph.minLabelPx >= 11 - 0.01);
  rec('T3.4d', 'drawing fits the width (svg width <= 360)', ph.svgW, 'px', 360, ph.svgW <= 360);
  await page.screenshot({ path: process.env.SHOT_PHONE ?? '/tmp/sky-phone.png' });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.screenshot({ path: process.env.SHOT_DESKTOP ?? '/tmp/sky-desktop.png', fullPage: false });
  // ---- Spanish
  await page.goto(URL_ + (NSTARS ? NSTARS + '&' : '?') + 'lang=es'); await page.waitForFunction(() => window.skyReady === true);
  const esTitle = await page.title();
  info('T7.3', 'Spanish page title', esTitle, '');
  rec('T3.5', 'page errors in the console', errors.length, 'errors', 0, errors.length === 0, { errors: errors.slice(0, 3) });
} finally {
  await browser.close(); server.close();
  fs.writeFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), 'results-browser.json'), JSON.stringify(results, null, 1));
}
const f = results.filter(r => r.pass === false);
console.log(`\n${results.filter(r => r.pass).length} pass, ${f.length} fail`);
