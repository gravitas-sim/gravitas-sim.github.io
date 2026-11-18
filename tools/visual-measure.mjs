#!/usr/bin/env node
// =============================================================================
// Measure the visual criteria on the pilot states and print the table
// -----------------------------------------------------------------------------
// The same measurements e2e/visualCriteria.criteria.js and e2e/canvasLegibility.spec.js
// judge, taken in one browser and written as data, so a prompt can put its
// "before" (this file's output at the 3.0 baseline, committed in
// tests/fixtures/visual-baseline.json under "criteria") beside its "after".
//
//   node tools/visual-measure.mjs --json out.json
//   node tools/visual-measure.mjs --compare tests/fixtures/visual-baseline.json
//
// Nothing here passes or fails: it reports numbers and, beside each, the
// verdict of the judge in tools/visual-criteria.mjs.
// =============================================================================

import { chromium } from 'playwright';
import { writeFileSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serveStatic } from './static-server.mjs';
import * as V from './visual-criteria.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const round = (n, d = 1) =>
  Number.isFinite(n) ? Math.round(n * 10 ** d) / 10 ** d : n;

async function withPage(browser, origin, view, state, fn, { dpr = 1 } = {}) {
  const ctx = await browser.newContext({
    viewport: view,
    deviceScaleFactor: dpr,
    reducedMotion: 'reduce',
  });
  const page = await ctx.newPage();
  await page.addInitScript(V.installCanvasTextRecorder);
  try {
    await V.openLessonStep(page, { origin, ...state });
    return await fn(page);
  } finally {
    await ctx.close();
  }
}

export async function measureAll({ origin, browser }) {
  const out = {
    layout: [],
    labels: [],
    cue: [],
    arrows: {},
    trails: [],
    plots: {},
  };
  const sizes = [
    ...V.PHONE_SIZES.map(s => ({ ...s, kind: 'phone' })),
    { ...V.TABLET_SIZE, kind: 'tablet' },
    ...V.DESKTOP_SIZES.map(s => ({ ...s, kind: 'desktop' })),
  ];
  for (const pilot of V.LESSON_PILOTS)
    for (const size of sizes) {
      await withPage(browser, origin, size, pilot, async page => {
        const m = await page.evaluate(V.measureLayoutInPage);
        const v = V.judgeLayout(m, { kind: size.kind, subject: pilot.subject });
        out.layout.push({
          pilot: pilot.id,
          size: `${size.width}x${size.height}`,
          kind: size.kind,
          subject: pilot.subject,
          pass: v.pass,
          reasons: v.reasons,
          openHeightPx: m.openRunPx,
          openWidthPx: m.openColsPx,
          openAreaShare: round(m.openAreaShare, 2),
          lessonPanel: m.panel && {
            top: Math.round(m.panel.y),
            width: Math.round(m.panel.width),
            height: Math.round(m.panel.height),
          },
          bodies: m.bodies.map(b => ({
            role: b.role,
            x: b.x,
            y: b.y,
            state: !b.inside
              ? 'off screen'
              : b.visible
                ? 'in view'
                : `under ${b.coveredBy}`,
          })),
          instrument: m.instrument.visible ? 'in view' : m.instrument.reason,
        });
      });
    }

  const mainStates = [
    ...V.LESSON_PILOTS.filter(p => p.subject === 'scene'),
    V.LESSON_PILOTS[3],
    { id: 'keplers-wedges', ...V.DRAWING_STATES.wedges },
  ];
  const cueRole = {
    'keplers-2nd-law': 'eccentric',
    'keplers-wedges': 'eccentric',
    'transit-lab': 'planet',
    'weighing-stars-binary': 'a',
    'galilean-resonance': 'star',
  };
  for (const dpr of V.DEVICE_PIXEL_RATIOS)
    for (const state of mainStates)
      await withPage(
        browser,
        origin,
        { width: 1366, height: 800 },
        state,
        async page => {
          await page.waitForTimeout(400);
          const r = await page.evaluate(V.readMainCanvasLabels);
          const body = V.judgeLabels(r.bodyLabels);
          const other = V.judgeLabels(r.otherText);
          out.labels.push({
            state: state.id,
            dpr,
            canvasScale: round(r.canvasScale, 2),
            bodyLabels: {
              count: body.count,
              smallestCssPx: round(body.smallest),
              pass: body.pass,
              overlaps: body.overlaps.length,
            },
            otherText: {
              count: other.count,
              smallestCssPx: round(other.smallest),
              pass: other.pass,
              overlaps: other.overlaps.length,
              small: other.small,
            },
          });
          if (dpr === 1) {
            const m = await page.evaluate(V.measureSelectionCue, {
              role: cueRole[state.id],
              lumaStep: V.CUE_LUMA_STEP,
            });
            out.cue.push({
              state: state.id,
              changedPixels: m.changed,
              frameNoise: m.noise,
              pass: V.judgeCue(m).pass,
            });
          }
        },
        { dpr }
      );

  await withPage(
    browser,
    origin,
    { width: 1366, height: 800 },
    V.LESSON_PILOTS[0],
    async page => {
      const slow = await page.evaluate(V.measureVelocityArrow, {
        role: 'eccentric',
        factor: 1,
      });
      const fast = await page.evaluate(V.measureVelocityArrow, {
        role: 'eccentric',
        factor: V.ARROW_RATIO_FACTOR,
      });
      out.arrows = {
        state: 'keplers-2nd-law, the eccentric orbiter',
        shaftAtSpeed1CssPx: round(slow.shaftCssPx),
        shaftAtSpeed3CssPx: round(fast.shaftCssPx),
        legendText: slow.legend.replace(/\s+/g, ' ').trim(),
        pass: V.judgeArrows({ slow: slow.shaftCssPx, fast: fast.shaftCssPx })
          .pass,
      };
      for (const fps of V.TRAIL_FRAME_RATES)
        out.trails.push(await page.evaluate(V.measureTrailSpan, { fps }));
    }
  );

  await withPage(
    browser,
    origin,
    { width: 1366, height: 800 },
    V.DRAWING_STATES.keplerPlot,
    async page => {
      await page.locator('#investigationPlotCanvas').scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);
      const r = await page.evaluate(
        V.readSvgPlotText,
        '#investigationPlotCanvas'
      );
      out.plots.keplerPlot = { kind: 'svg', ...V.judgePlotType(r.texts) };
    }
  );
  await withPage(
    browser,
    origin,
    { width: 1366, height: 800 },
    V.DRAWING_STATES.transitCurve,
    async page => {
      await page.waitForSelector('#lightCurveChart svg', { timeout: 20000 });
      await page.waitForTimeout(1500);
      const r = await page.evaluate(V.readSvgPlotText, '#lightCurveChart svg');
      out.plots.transitCurve = {
        kind: 'svg',
        ...V.judgePlotType(r.texts),
        distinctColours: new Set(r.series.map(s => s.colour)).size,
      };
    }
  );
  return out;
}

async function main() {
  const argv = process.argv.slice(2);
  const get = n => (argv.includes(n) ? argv[argv.indexOf(n) + 1] : undefined);
  const server = await serveStatic({ root: ROOT, port: 0 });
  const origin = `http://localhost:${server.address().port}`;
  const browser = await chromium.launch();
  try {
    const result = await measureAll({ origin, browser });
    const json = get('--json');
    if (json) writeFileSync(json, `${JSON.stringify(result, null, 2)}\n`);
    const was = get('--compare');
    if (was) {
      const before = JSON.parse(readFileSync(was, 'utf8')).criteria;
      const flat = o => JSON.stringify(o);
      let moved = 0;
      for (const key of Object.keys(result)) {
        if (flat(result[key]) !== flat(before?.[key])) {
          moved++;
          console.log(`${key}: differs from the baseline`);
        }
      }
      console.log(`${moved} of ${Object.keys(result).length} groups differ`);
    }
    if (!json && !was) console.log(JSON.stringify(result, null, 2));
  } finally {
    await browser.close();
    server.close();
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1])
  main().catch(e => {
    console.error(e);
    process.exit(2);
  });
