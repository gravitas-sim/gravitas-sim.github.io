#!/usr/bin/env node
// =============================================================================
// What a live update of the series chart costs (D-PLOT-02, stage 3a)
// -----------------------------------------------------------------------------
// Development only. The plot component has to redraw the application's three
// live charts at their caps and rates (PLOT_COMPONENT.md, "Stage 3a"):
//
//   energy chart       3 series x 200 points, 8 Hz
//   light curve        1 series x 2000 points, filled, 10 Hz
//   radial velocity    900 points and 60 measurements with error bars, 15 Hz
//
// This draws each one in headless Chromium with js/plot/chart.js and, for
// comparison, with the vendored Chart.js the charts use today, on the same
// data and the same update schedule, and reports what an update costs: the
// draw() (or update()) call, the call plus the style and layout the page owes
// for it, and the main thread's whole busy time per update (script, style,
// layout and the recording of paint; raster is on other threads and not here). The caps and rates are the ones tests/fixtures/chart-limits.json
// pins to the source.
//
//   node tools/plot-live-bench.mjs                  1x, 4x and 6x CPU
//   node tools/plot-live-bench.mjs --cpu 1,4        chosen rates
//   node tools/plot-live-bench.mjs --json out.json  the numbers, as data
//
// The bar is OFFLINE_AND_LOW_END.md's: work that recurs every frame gets 8 ms
// of script on the 4x proxy. These charts redraw at 8 to 15 Hz, a fraction of
// that, so a p95 under the bar at the stated rate is a pass with room. CPU
// throttling reaches the main thread only; paint and raster are on others.
// =============================================================================

import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serveStatic } from './static-server.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const BAR_MS = 8;

const args = process.argv.slice(2);
const flag = name => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : null;
};
const rates = flag('--cpu') ? flag('--cpu').split(',').map(Number) : [1, 4, 6];
const jsonOut = flag('--json');

/** Runs in the page: one chart kind, one engine, one schedule. */
async function bench({ kind, engine, hz, updates }) {
  const SHAPES = {
    energy: { cap: 200, series: 3, fill: false, points: 0 },
    light: { cap: 2000, series: 1, fill: true, points: 0 },
    rv: { cap: 900, series: 1, fill: false, points: 60 },
  };
  const shape = SHAPES[kind];
  const host = document.createElement('div');
  host.style.cssText = 'width:420px;height:240px';
  document.body.append(host);

  // Data: arrays that grow at the right and drop at the left, as the modules'.
  let t = 0;
  const xs = [];
  const lines = Array.from({ length: shape.series }, () => []);
  const tick = () => {
    t += 1;
    xs.push(t / 10);
    lines.forEach((ys, k) =>
      ys.push(Math.sin(t / (9 + k * 4)) * (k + 1) * 3 + Math.sin(t * 1.7) * 0.2)
    );
    if (xs.length > shape.cap) {
      xs.shift();
      lines.forEach(ys => ys.shift());
    }
  };
  while (xs.length < shape.cap) tick();
  const meas = { x: [], y: [], sigma: [] };
  for (let i = 0; i < shape.points; i++) {
    meas.x.push(xs[0] + (i / shape.points) * (xs.at(-1) - xs[0]));
    meas.y.push(Math.sin(i / 3) * 3);
    meas.sigma.push(0.4);
  }
  const colors = ['#00ff88', '#ff8800', '#0088ff'];

  let draw;
  let ready;
  if (engine === 'component') {
    const { createChart } = await import('/js/plot/chart.js');
    const chart = createChart(host, {
      height: 240,
      theme: false,
      maxPoints: shape.cap,
    });
    draw = () =>
      chart.draw({
        xTitle: 'Time',
        yTitle: 'Value',
        series: [
          ...lines.map((y, k) => ({
            id: `s${k}`,
            label: `Series ${k}`,
            x: xs,
            y,
            color: colors[k],
            width: 2,
            fill: shape.fill,
          })),
          ...(shape.points
            ? [
                {
                  id: 'm',
                  label: 'Measurements',
                  mode: 'points',
                  ...meas,
                  color: '#e2725b',
                },
              ]
            : []),
        ],
      });
    ready = Promise.resolve();
  } else {
    const { Chart } = await import('/vendor/chartjs/chart.js');
    const canvas = document.createElement('canvas');
    host.append(canvas);
    const sets = () => [
      ...lines.map((y, k) => ({
        label: `Series ${k}`,
        data: xs.map((x, i) => ({ x, y: y[i] })),
        borderColor: colors[k],
        borderWidth: 2,
        pointRadius: 0,
        fill: shape.fill,
        tension: 0.1,
      })),
      ...(shape.points
        ? [
            {
              label: 'Measurements',
              data: meas.x.map((x, i) => ({
                x,
                y: meas.y[i],
                sigma: meas.sigma[i],
              })),
              showLine: false,
              pointRadius: 3,
            },
          ]
        : []),
    ];
    const chart = new Chart(canvas.getContext('2d'), {
      type: 'line',
      data: { datasets: sets() },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        parsing: false,
        animation: false,
        scales: { x: { type: 'linear' } },
      },
    });
    draw = () => {
      // What the modules do: replace each dataset's data, then update.
      sets().forEach((s, i) => (chart.data.datasets[i].data = s.data));
      chart.update('none');
    };
    ready = Promise.resolve();
  }
  await ready;

  const t0 = performance.now();
  draw();
  void host.offsetHeight;
  const first = performance.now() - t0;

  const rows = [];
  const period = 1000 / hz;
  for (let i = 0; i < updates + 20; i++) {
    const start = performance.now();
    tick();
    const a = performance.now();
    draw();
    const b = performance.now();
    void host.offsetHeight;
    void host.getBoundingClientRect();
    const c = performance.now();
    if (i >= 20) rows.push({ draw: b - a, drawAndLayout: c - a });
    const wait = period - (performance.now() - start);
    await new Promise(r => window.setTimeout(r, Math.max(0, wait)));
  }
  const nodes = host.querySelectorAll('*').length;
  const pick = (key, q) => {
    const v = rows.map(r => r[key]).sort((x, y) => x - y);
    return v[Math.min(v.length - 1, Math.floor(q * v.length))];
  };
  host.remove();
  return {
    kind,
    engine,
    hz,
    first,
    drawMedian: pick('draw', 0.5),
    drawP95: pick('draw', 0.95),
    totalMedian: pick('drawAndLayout', 0.5),
    totalP95: pick('drawAndLayout', 0.95),
    nodes,
  };
}

const server = await serveStatic({ root: ROOT, port: 0 });
const port = server.address().port;
const browser = await chromium.launch();
const results = [];
try {
  for (const cpu of rates) {
    const page = await browser.newPage();
    await page.goto(`http://127.0.0.1:${port}/library/`);
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu });
    await cdp.send('Performance.enable');
    for (const [kind, hz] of [
      ['energy', 8],
      ['light', 10],
      ['rv', 15],
    ]) {
      for (const engine of ['component', 'chartjs']) {
        const busy = async () =>
          (await cdp.send('Performance.getMetrics')).metrics.find(
            m => m.name === 'TaskDuration'
          ).value;
        const before = await busy();
        const r = await page.evaluate(
          `(${bench.toString()})(${JSON.stringify({ kind, engine, hz, updates: 100 })})`
        );
        // Everything the main thread did for the run (script, style, layout
        // and the recording of paint), per update, warm-up and build included.
        r.busy = (((await busy()) - before) * 1000) / 121;
        results.push({ cpu, ...r });
      }
    }
    await page.close();
  }
} finally {
  await browser.close();
  server.close();
}

const f = v => v.toFixed(2).padStart(6);
console.log(
  'cpu  chart   engine     Hz  first   draw(med/p95)    +layout(med/p95)  nodes'
);
for (const r of results) {
  console.log(
    `${String(r.cpu).padStart(2)}x  ${r.kind.padEnd(7)}${r.engine.padEnd(10)} ${String(r.hz).padStart(2)}  ${f(r.first)}  ${f(r.drawMedian)} ${f(r.drawP95)}   ${f(r.totalMedian)} ${f(r.totalP95)}   ${f(r.busy)}      ${r.nodes}`
  );
}
const slow = results.filter(
  r => r.engine === 'component' && r.cpu === 4 && r.totalP95 > BAR_MS
);
console.log(
  slow.length
    ? `\nOver the ${BAR_MS} ms bar at 4x: ${slow.map(r => r.kind).join(', ')}`
    : `\nEvery chart's p95 is under the ${BAR_MS} ms bar at 4x.`
);
if (jsonOut) writeFileSync(jsonOut, JSON.stringify(results, null, 2) + '\n');
process.exitCode = slow.length ? 1 : 0;
