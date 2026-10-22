/* global console, process, window, performance, document, createImageBitmap, fetch, Blob, btoa */
// =============================================================================
// The lunar leg of the image-measurement gate (Prompt 178, 2026-10-22)
// -----------------------------------------------------------------------------
// npm run image-gate:lunar. One real frame, the committed fixture
// tests/fixtures/lunar/PIA00302-clementine-nearside.jpg (NASA/JPL/USGS), measured
// by the procedure IMAGE_MEASUREMENT_GATE.md fixed before this file was run:
//   1. decode and draw on the mobile profile (CPU x4), no bound of its own;
//   2. repeatability of a circle mark with no truth, as supplied and padded;
//   3. a cross-check (half-maximum radius, kilometres per pixel), not truth.
// It reads the instrument (marks.js, panel.js) and changes neither, so the
// prototype digest and the 21 checks stand; it writes only `authentic.lunar` in
// tools/image-measure-gate.json. The verdict function never reads that block.
// =============================================================================

import { chromium } from 'playwright';
import { Buffer } from 'node:buffer';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { loadavg } from 'node:os';
import path from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

import { RESULTS_FILE, THRESHOLDS } from '../image-measure-gate.mjs';
import { refineCircle, frameNoise, CAPTURE } from './marks.js';
import { makeRandom } from './frames.mjs';
import { REPO, serve } from './server.mjs';

const FIXTURE = 'tests/fixtures/lunar/PIA00302-clementine-nearside.jpg';
const PAD = 160;
const ANGLES = [0, 45, 90, 135, 180, 225, 270, 315];
const TRIALS = 100;
const SEED = 2210;
const KNOWN_KM = 3474.8;
const I = THRESHOLDS.interaction;
const MOBILE = {
  viewport: { width: I.viewport[0], height: I.viewport[1] },
  hasTouch: true,
  isMobile: true,
  deviceScaleFactor: 1,
};
const round = (v, d = 4) => (Number.isFinite(v) ? Number(v.toPrecision(d)) : v);
const sorted = a => [...a].sort((x, y) => x - y);
const median = a => {
  const s = sorted(a);
  const n = s.length;
  return n % 2 ? s[(n - 1) / 2] : 0.5 * (s[n / 2 - 1] + s[n / 2]);
};
const p95 = a => sorted(a)[Math.max(0, Math.ceil(0.95 * a.length) - 1)];
const sd = a => {
  const m = a.reduce((s, v) => s + v, 0) / a.length;
  return Math.sqrt(a.reduce((s, v) => s + (v - m) ** 2, 0) / (a.length - 1));
};

async function quiet(limit = 6, waitMs = 10 * 60 * 1000) {
  const end = Date.now() + waitMs;
  while (loadavg()[0] > limit && Date.now() < end) await sleep(5000);
  return loadavg()[0];
}

// ---- the browser part: decode and draw -------------------------------------------------

async function browserLeg() {
  const { server, origin } = await serve(4417);
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext(MOBILE);
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(
      `${origin}/tools/image-measure-gate/harness.html?set=disc&seed=1&settle=60`
    );
    await page.waitForFunction(() => window.__ready === true, null, {
      timeout: 60000,
    });
    const cdp = await context.newCDPSession(page);
    await cdp.send('Performance.enable');
    const heap = async () => {
      const u = await cdp.send('Runtime.getHeapUsage');
      return u.usedSize + (u.backingStorageSize || 0);
    };
    // Decode: five runs, unthrottled (the browser decodes off the main thread).
    const decode = await page.evaluate(async url => {
      const blob = new Blob([await (await fetch(url)).arrayBuffer()], {
        type: 'image/jpeg',
      });
      const runs = [];
      let last;
      for (let i = 0; i < 5; i++) {
        const t0 = performance.now();
        const bmp = await createImageBitmap(blob);
        const cv = document.createElement('canvas');
        cv.width = bmp.width;
        cv.height = bmp.height;
        const cx = cv.getContext('2d', { willReadFrequently: true });
        cx.drawImage(bmp, 0, 0);
        last = cx.getImageData(0, 0, bmp.width, bmp.height);
        runs.push(performance.now() - t0);
        bmp.close();
      }
      window.__rgba = last;
      let mismatch = 0;
      const d = last.data;
      for (let i = 0; i < d.length; i += 4)
        if (d[i] !== d[i + 1] || d[i] !== d[i + 2]) mismatch++;
      return { runs, width: last.width, height: last.height, mismatch };
    }, `${origin}/${FIXTURE}`);
    await cdp.send('HeapProfiler.collectGarbage');
    const base = await heap();
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: I.cpuThrottle });
    const loadBefore = loadavg()[0];
    const sampling = { stop: false };
    const sampler = (async () => {
      let peak = 0;
      for (let i = 0; i < 600 && !sampling.stop; i++) {
        try {
          peak = Math.max(peak, await heap());
        } catch {
          break;
        }
      }
      return peak;
    })();
    const throttled = await page.evaluate(() => {
      const im = window.__im;
      const { width, height, data } = window.__rgba;
      const build = [];
      const draw = [];
      let plane;
      for (let i = 0; i < 5; i++) {
        const t0 = performance.now();
        plane = new Float64Array(width * height);
        for (let k = 0; k < plane.length; k++) plane[k] = data[4 * k];
        build.push(performance.now() - t0);
        im.frames[0] = { id: 'lunar', width, height, data: plane };
        const t1 = performance.now();
        im.drawFrame();
        draw.push(performance.now() - t1);
      }
      return {
        build,
        draw,
        factor: window.__lib.displayPlan(width, height),
      };
    });
    sampling.stop = true;
    const peak = await sampler;
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
    const loadAfter = loadavg()[0];
    // The plane back to Node, one byte a pixel (every pixel's three channels were equal).
    const b64 = await page.evaluate(() => {
      const d = window.__rgba.data;
      const n = d.length / 4;
      const out = new Uint8Array(n);
      for (let i = 0; i < n; i++) out[i] = d[4 * i];
      let s = '';
      for (let i = 0; i < n; i += 32768)
        s += String.fromCharCode.apply(null, out.subarray(i, i + 32768));
      return btoa(s);
    });
    const { decodedBytes, LIMITS } =
      await import('../../js/dataKinds/limits.js');
    await context.close();
    return {
      chromium: browser.version(),
      errors,
      pixels: Buffer.from(b64, 'base64'),
      width: decode.width,
      height: decode.height,
      decode,
      throttled,
      load: { before: loadBefore, after: loadAfter },
      peak: peak - base,
      counted:
        decodedBytes(decode.width, decode.height, { data: true }) +
        throttled.factor.rgbaBytes,
      maxDecodedBytes: LIMITS.maxDecodedBytes,
    };
  } finally {
    await browser.close();
    server.close();
  }
}

// ---- Node part: the circle mark, no truth ------------------------------------------------

const frameOf = (w, h, data) => ({ width: w, height: h, data });

function paddedFrame(f, pad, level) {
  const W = f.width + 2 * pad;
  const H = f.height + 2 * pad;
  const data = new Float64Array(W * H).fill(level);
  for (let y = 0; y < f.height; y++)
    data.set(
      f.data.subarray(y * f.width, (y + 1) * f.width),
      (y + pad) * W + pad
    );
  return frameOf(W, H, data);
}

/** The half-maximum mask: the disc's centroid and equivalent radius (pixels, 1-based), for clicks and the cross-check. */
function discOf(f, level) {
  const half = Math.floor(f.width / 2);
  const box = [];
  for (let y = half - 250; y < half + 250; y++)
    for (let x = half - 250; x < half + 250; x++)
      box.push(f.data[y * f.width + x]);
  const p1 = sorted(box)[Math.floor(0.01 * box.length)];
  const threshold = level + 0.5 * (p1 - level);
  let n = 0,
    sx = 0,
    sy = 0;
  for (let y = 0; y < f.height; y++)
    for (let x = 0; x < f.width; x++)
      if (f.data[y * f.width + x] > threshold) {
        n++;
        sx += x + 1;
        sy += y + 1;
      }
  return {
    threshold,
    cx: sx / n,
    cy: sy / n,
    r: Math.sqrt(n / Math.PI),
    area: n,
  };
}

function repeatability(f, disc, label) {
  const rnd = makeRandom(SEED);
  const noise = frameNoise(f);
  const per = [];
  const refused = {};
  const all = { x: [], y: [], r: [] };
  for (const deg of ANGLES) {
    const th = (deg * Math.PI) / 180;
    const rows = [];
    for (let t = 0; t < TRIALS; t++) {
      const [ax, ay] = rnd.disk(CAPTURE);
      const [bx, by] = rnd.disk(CAPTURE);
      const c0 = [disc.cx + ax, disc.cy + ay];
      const l0 = [
        disc.cx + disc.r * Math.cos(th) + bx,
        disc.cy + disc.r * Math.sin(th) + by,
      ];
      const r = refineCircle(f, c0, l0);
      if (r.ok) rows.push(r);
      else refused[r.reason] = (refused[r.reason] ?? 0) + 1;
    }
    per.push({
      angleDeg: deg,
      refined: rows.length,
      trials: TRIALS,
      medianX: rows.length ? round(median(rows.map(r => r.x)), 8) : null,
      medianY: rows.length ? round(median(rows.map(r => r.y)), 8) : null,
      medianR: rows.length ? round(median(rows.map(r => r.r)), 8) : null,
    });
    for (const r of rows) {
      all.x.push(r.x);
      all.y.push(r.y);
      all.r.push(r.r);
    }
  }
  const out = {
    condition: label,
    frame: `${f.width} x ${f.height}`,
    frameNoiseAdu: round(noise),
    trials: ANGLES.length * TRIALS,
    refined: all.r.length,
    refused,
    perAngle: per,
  };
  if (all.r.length >= 2) {
    const mx = median(all.x);
    const my = median(all.y);
    const mr = median(all.r);
    const medians = per.filter(p => p.medianR !== null);
    out.fit = {
      medianX: round(mx, 6),
      medianY: round(my, 6),
      medianR: round(mr, 6),
      sdX: round(sd(all.x)),
      sdY: round(sd(all.y)),
      sdR: round(sd(all.r)),
      radiusP95RelativeToMedian: round(
        p95(all.r.map(v => Math.abs(v - mr) / mr))
      ),
      centreP95OffsetPx: round(
        p95(all.x.map((v, i) => Math.hypot(v - mx, all.y[i] - my)))
      ),
      angleMedianRangeR: round(
        Math.max(...medians.map(p => p.medianR)) -
          Math.min(...medians.map(p => p.medianR))
      ),
      angleMedianRangeCentre: round(
        Math.max(
          ...medians.map(p => Math.hypot(p.medianX - mx, p.medianY - my))
        )
      ),
    };
  }
  return out;
}

async function main() {
  const fixture = readFileSync(path.join(REPO, FIXTURE));
  const prov = JSON.parse(
    readFileSync(
      path.join(REPO, 'tests/fixtures/lunar/provenance.json'),
      'utf8'
    )
  );
  const sha = createHash('sha256').update(fixture).digest('hex');
  if (sha !== prov.sha256 || fixture.length !== prov.bytes)
    throw new Error('the fixture is not the file provenance.json describes');
  console.log('waiting for a quiet machine');
  const load = await quiet();
  console.log(`one-minute load ${load}; decode and draw`);
  const b = await browserLeg();
  if (b.decode.mismatch !== 0)
    throw new Error(`${b.decode.mismatch} pixels differ between channels`);
  const f = frameOf(b.width, b.height, Float64Array.from(b.pixels));
  const corner = [];
  for (const [x0, y0] of [
    [0, 0],
    [f.width - 40, 0],
    [0, f.height - 40],
    [f.width - 40, f.height - 40],
  ])
    for (let y = 0; y < 40; y++)
      for (let x = 0; x < 40; x++)
        corner.push(f.data[(y0 + y) * f.width + x0 + x]);
  const level = median(corner);
  const disc = discOf(f, level);
  console.log('repeatability, as supplied');
  const supplied = repeatability(f, disc, 'frame as supplied');
  const padded = paddedFrame(f, PAD, level);
  const discPadded = {
    ...disc,
    cx: disc.cx + PAD,
    cy: disc.cy + PAD,
  };
  console.log('repeatability, padded');
  const pad = repeatability(
    padded,
    discPadded,
    `frame padded with a ${PAD}-pixel border at the background level ${level}`
  );
  const decodeMed = median(b.decode.runs);
  const total =
    I.cpuThrottle * decodeMed +
    median(b.throttled.build) +
    median(b.throttled.draw);
  const fitted = pad.fit ?? supplied.fit ?? null;
  const lunar = {
    status: 'measured',
    measuredOn: new Date().toISOString().slice(0, 10),
    fixture: {
      path: FIXTURE,
      bytes: fixture.length,
      sha256: sha,
      width: b.width,
      height: b.height,
      what: prov.what,
    },
    environment: {
      node: process.version,
      chromium: b.chromium,
      platform: `${process.platform} ${process.arch}`,
      loadAtStart: round(load, 3),
      loadBeforeThrottled: round(b.load.before, 3),
      loadAfterThrottled: round(b.load.after, 3),
      commit: execFileSync('git', ['rev-parse', 'HEAD'], {
        cwd: REPO,
        encoding: 'utf8',
      }).trim(),
    },
    decodeAndDraw: {
      throttle: I.cpuThrottle,
      decodeMsRuns: b.decode.runs.map(v => round(v)),
      decodeMsMedian: round(decodeMed),
      planeBuildMsThrottled: b.throttled.build.map(v => round(v)),
      drawMsThrottled: b.throttled.draw.map(v => round(v)),
      displayFactor: b.throttled.factor.factor,
      totalMs: round(total),
      totalFormula:
        'throttle x median decode + median plane build + median draw',
      referenceBoundMs: THRESHOLDS.tier2048.totalMs,
      countedBytes: b.counted,
      pageHeapPeakDeltaBytes: b.peak,
      maxDecodedBytes: b.maxDecodedBytes,
      note: 'the 2,048-pixel tier bounds are quoted for reference only; no bound was committed for this leg, so it is reported, not judged',
    },
    disc: {
      backgroundLevel: level,
      halfMaxThreshold: round(disc.threshold),
      centroidX: round(disc.cx, 6),
      centroidY: round(disc.cy, 6),
      equivalentRadiusPx: round(disc.r, 6),
    },
    repeatability: {
      trialsPerAngle: TRIALS,
      angles: ANGLES,
      seed: SEED,
      capturePx: CAPTURE,
      asSupplied: supplied,
      padded: pad,
    },
    scale: fitted
      ? {
          knownLengthKm: KNOWN_KM,
          fittedDiameterPx: round(2 * fitted.medianR, 6),
          kmPerPixel: round(KNOWN_KM / (2 * fitted.medianR), 6),
          kmPerPixelHalfMaxCrossCheck: round(KNOWN_KM / (2 * disc.r), 6),
          relativeDifferenceFitVsHalfMax: round(
            Math.abs(fitted.medianR - disc.r) / disc.r
          ),
          note: 'the half-maximum radius is an independent cross-check, not truth: a mosaic limb is not an exact circle',
        }
      : null,
    readByVerdict: false,
  };
  const rec = JSON.parse(readFileSync(RESULTS_FILE, 'utf8'));
  rec.authentic = { lunar };
  writeFileSync(RESULTS_FILE, `${JSON.stringify(rec, null, 2)}\n`);
  execFileSync('npx', ['prettier', '--write', RESULTS_FILE], {
    cwd: REPO,
    stdio: 'ignore',
  });
  console.log(JSON.stringify(lunar, null, 1).slice(0, 6000));
}

if (import.meta.url === `file://${process.argv[1]}`) await main();
