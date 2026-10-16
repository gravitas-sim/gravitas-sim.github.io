#!/usr/bin/env node
// =============================================================================
// The measurement tools' recovery and residual tables
// -----------------------------------------------------------------------------
//   npm run measure:validate                 print both tables as Markdown
//   npm run measure:validate -- --json out   and write them
//
// What MEASUREMENT_PIPELINE.md quotes. Two tables:
//
//   recovery    each tool on synthetic data with a known answer and seeded
//               noise, many times: the mean and spread of the pulls,
//               (estimate - truth) / stated error. A tool whose errors are
//               right has pulls of mean 0 and spread 1.
//   residuals   each tool on the curated data the Observatory ships, against
//               a cited value: the difference, and the difference in units of
//               the stated error where the tool states one.
//
// Deterministic: every seed is fixed, so a run on any machine prints the same
// numbers. tests/measure.test.js holds the same cases to tolerances.
// =============================================================================

import { readFileSync, writeFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const { DOMParser } = new JSDOM('').window;
globalThis.DOMParser = DOMParser;

const P = await import('../js/measure/periodogram.js');
const L = await import('../js/measure/spectrumLine.js');
const A = await import('../js/measure/aperture.js');
const pipe = await import('../js/measure/pipeline.js');
const { openFixture } = await import('../js/observatory/fixtures.js');
const W = await import('../js/observatory/wcs.js');

function uniform(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function normal(seed) {
  const u = uniform(seed);
  return () =>
    Math.sqrt(-2 * Math.log(u() || 1e-300)) * Math.cos(2 * Math.PI * u());
}
const meanSd = xs => {
  const m = xs.reduce((a, b) => a + b, 0) / xs.length;
  return [m, Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / xs.length)];
};

// --- Recovery ---------------------------------------------------------------------

const recovery = [];

{
  const truth = 0.66042;
  const pulls = [];
  for (let s = 1; s <= 200; s++) {
    const u = uniform(s);
    const g = normal(1000 + s);
    const t = Array.from({ length: 60 }, () => u() * 900).sort((a, b) => a - b);
    const y = t.map(
      x => 10 + 0.4 * Math.sin((2 * Math.PI * x) / truth + 1) + 0.05 * g()
    );
    const r = await P.searchPeriod(
      { t, y, dy: t.map(() => 0.05) },
      { minPeriod: 0.3, maxPeriod: 1.2 }
    );
    pulls.push((r.period - truth) / r.periodError);
  }
  const [m, sd] = meanSd(pulls);
  recovery.push({
    tool: 'period (GLS)',
    quantity: 'period',
    case: 'sinusoid, 60 random epochs over 900 d, S/N 8 a point',
    trials: 200,
    pullMean: m,
    pullSd: sd,
  });
}
{
  const faps = [];
  for (let s = 1; s <= 300; s++) {
    const u = uniform(5000 + s);
    const g = normal(9000 + s);
    const t = Array.from({ length: 50 }, () => u() * 100).sort((a, b) => a - b);
    faps.push(
      (
        await P.searchPeriod(
          { t, y: t.map(() => g()) },
          { minPeriod: 0.5, maxPeriod: 50 }
        )
      ).falseAlarm
    );
  }
  for (const level of [0.05, 0.1, 0.2, 0.5])
    recovery.push({
      tool: 'period (GLS)',
      quantity: `false-alarm rate at FAP <= ${level}`,
      case: 'noise only, 50 epochs over 100 d',
      trials: 300,
      rate: faps.filter(f => f <= level).length / faps.length,
      nominal: level,
    });
}
{
  const lam0 = 6564.61;
  const center = lam0 * (1 + 5e-4);
  const truthEw = 0.4 * 4 * Math.sqrt(2 * Math.PI);
  for (const withErrors of [true, false]) {
    const pe = [];
    const pc = [];
    for (let s = 1; s <= 200; s++) {
      const g = normal(s);
      const x = [];
      const y = [];
      for (let l = 6450; l <= 6680; l += 1.5) {
        x.push(l);
        y.push(
          (100 + 0.05 * (l - 6564)) *
            (1 - 0.4 * Math.exp(-0.5 * ((l - center) / 4) ** 2)) +
            g()
        );
      }
      const r = L.measureLine(
        { x, y, dy: withErrors ? x.map(() => 1) : null },
        {
          blue: [6470, 6520],
          line: [center - 25, center + 25],
          red: [6610, 6660],
          rest: lam0,
        }
      );
      pe.push((r.ew - truthEw) / r.ewError);
      pc.push((r.center - center) / r.centerError);
    }
    const label = withErrors
      ? 'errors given'
      : 'errors from the continuum scatter';
    recovery.push({
      tool: 'line',
      quantity: 'equivalent width',
      case: `Gaussian line, depth 0.4, S/N 100, ${label}`,
      trials: 200,
      pullMean: meanSd(pe)[0],
      pullSd: meanSd(pe)[1],
    });
    recovery.push({
      tool: 'line',
      quantity: 'center',
      case: `Gaussian line, depth 0.4, S/N 100, ${label}`,
      trials: 200,
      pullMean: meanSd(pc)[0],
      pullSd: meanSd(pc)[1],
    });
  }
}
{
  const size = 41;
  const F = 5000;
  const sig = 1.5;
  const pn = [];
  const px = [];
  for (let k = 1; k <= 200; k++) {
    const g = normal(k);
    const u = uniform(777 + k);
    const x0 = 20 + u() - 0.5;
    const y0 = 20 + u() - 0.5;
    const values = new Float64Array(size * size);
    for (let j = 0; j < size; j++)
      for (let i = 0; i < size; i++) {
        let v = 0;
        for (let a = 0; a < 4; a++)
          for (let b = 0; b < 4; b++)
            v +=
              Math.exp(
                -(
                  (i - 0.5 + (a + 0.5) / 4 - x0) ** 2 +
                  (j - 0.5 + (b + 0.5) / 4 - y0) ** 2
                ) /
                  (2 * sig * sig)
              ) / 16;
        values[j * size + i] =
          200 + (F * v) / (2 * Math.PI * sig * sig) + 10 * g();
      }
    const r = A.measureFlux(
      { width: size, height: size, values },
      { x: x0, y: y0, r: 6, rIn: 9, rOut: 15 }
    );
    pn.push((r.net - F * (1 - Math.exp(-36 / (2 * sig * sig)))) / r.netError);
    px.push((r.centroid.x - x0) / r.centroid.xError);
  }
  recovery.push({
    tool: 'aperture',
    quantity: 'net flux',
    case: 'Gaussian star, 5000 counts on 200 +- 10 a pixel, r = 6 px',
    trials: 200,
    pullMean: meanSd(pn)[0],
    pullSd: meanSd(pn)[1],
  });
  recovery.push({
    tool: 'aperture',
    quantity: 'centroid x',
    case: 'the same',
    trials: 200,
    pullMean: meanSd(px)[0],
    pullSd: meanSd(px)[1],
  });
}

// --- Residuals against cited values ---------------------------------------------------

const residuals = [];
{
  const cds = await import('../js/archive/cds.js');
  const { toObservation } = await import('../js/archive/gaiaEpochs.js');
  const bytes = new Uint8Array(
    readFileSync(
      new URL(
        '../tests/fixtures/archive/gaia-epphot-su-dra.vot',
        import.meta.url
      )
    )
  );
  const answer = await cds.readAnswer(
    { bytes, url: 'u' },
    { url: 'u', retrieved: '2026-09-26T04:40:20.000Z' }
  );
  const o = toObservation(answer, { source: '1058066262817534336' });
  const n = await pipe.runNode(o, {
    id: 'm1',
    tool: 'period',
    params: { minPeriod: 0.3, maxPeriod: 1.2, oversample: 10 },
    at: 0,
  });
  const q = n.quantities[0];
  residuals.push({
    case: 'SU Dra, 47 Gaia DR3 G epochs: period (GLS)',
    measured: q.value,
    error: q.error,
    unit: 'd',
    reference: 0.66042001,
    cite: 'Monson et al. 2017, AJ 153, 96',
  });
}
{
  const o = await openFixture('tess-light-curve');
  const n = await pipe.runNode(o, {
    id: 'm1',
    tool: 'box',
    params: { minPeriod: 1, maxPeriod: 10, durations: [0.08, 0.12, 0.16] },
    at: 0,
  });
  residuals.push({
    case: 'HD 209458 b, TESS sector 56: period (BLS)',
    measured: n.quantities[0].value,
    error: null,
    unit: 'd',
    reference: 3.52474859,
    cite: 'Knutson et al. 2007, ApJ 655, 564',
  });
}
for (const [id, rest, half, gap, side, name] of [
  ['sdss-a', 6564.61, 20, 25, 40, 'A0 star, H-alpha'],
  ['sdss-a', 4862.68, 15, 20, 30, 'A0 star, H-beta'],
  ['sdss-g', 6564.61, 20, 25, 40, 'G2 star, H-alpha'],
]) {
  const o = await openFixture(id);
  const z = o.spectral.redshift;
  const c = rest * (1 + z);
  const n = await pipe.runNode(o, {
    id: 'm1',
    tool: 'line',
    params: {
      line: [c - half, c + half],
      blue: [c - gap - side, c - gap],
      red: [c + gap, c + gap + side],
      rest,
      restMedium: 'vacuum',
    },
    at: 0,
  });
  const v = n.quantities.find(x => x.id === 'velocity');
  residuals.push({
    case: `SDSS ${name}: velocity`,
    measured: v.value,
    error: v.error,
    unit: 'km/s',
    reference: 299792.458 * z,
    cite: "SDSS DR18's own redshift (the data pack)",
  });
}
{
  const o = await openFixture('tess-aperture');
  const n = await pipe.runNode(
    o,
    { id: 'm1', tool: 'aperture', params: { mode: 'bits', bit: 2 }, at: 0 },
    { skyOf: W.skyOf, pixelScale: W.pixelScale }
  );
  const q = k => n.quantities.find(x => x.id === k).value;
  residuals.push({
    case: 'TESS optimal aperture: pixels',
    measured: q('count'),
    error: null,
    unit: 'pix',
    reference: 23,
    cite: 'NPIXSAP, the APERTURE header',
  });
  const sep = W.separation({ ra: q('ra'), dec: q('dec') }, o.object) * 3600;
  residuals.push({
    case: 'TESS optimal aperture: centroid to HD 209458',
    measured: sep,
    error: null,
    unit: 'arcsec',
    reference: 0,
    cite: 'the star’s ICRS position (the pack)',
  });
}

// --- Out ------------------------------------------------------------------------------

const f = (x, d = 3) =>
  x === null || x === undefined
    ? ''
    : Math.abs(x) >= 1e4 || (Math.abs(x) < 1e-3 && x !== 0)
      ? x.toExponential(2)
      : x.toFixed(d);
const lines = [];
lines.push(
  '| Tool | Quantity | Case | Trials | Pull mean | Pull spread | Rate (nominal) |'
);
lines.push('|---|---|---|---:|---:|---:|---:|');
for (const r of recovery)
  lines.push(
    `| ${r.tool} | ${r.quantity} | ${r.case} | ${r.trials} | ${f(r.pullMean, 2)} | ${f(r.pullSd, 2)} | ${r.rate === undefined ? '' : `${f(r.rate, 3)} (${r.nominal})`} |`
  );
lines.push('');
lines.push(
  '| Case | Measured | Reference | Residual | Residual / error | Reference from |'
);
lines.push('|---|---:|---:|---:|---:|---|');
for (const r of residuals) {
  const res = r.measured - r.reference;
  lines.push(
    `| ${r.case} | ${f(r.measured, 6)}${r.error ? ` ± ${f(r.error, 6)}` : ''} ${r.unit} | ${f(r.reference, 6)} | ${f(res, 6)} | ${r.error ? f(res / r.error, 2) : ''} | ${r.cite} |`
  );
}
console.log(lines.join('\n'));
const i = process.argv.indexOf('--json');
if (i > 0)
  writeFileSync(
    process.argv[i + 1],
    `${JSON.stringify({ recovery, residuals }, null, 2)}\n`
  );
