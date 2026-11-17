#!/usr/bin/env node
// =============================================================================
// The before-and-after matrix: the pilot scenes, photographed at matched states
// -----------------------------------------------------------------------------
// Visual work is judged on a pair of captures that differ only in what the
// change did (DESIGN_SYSTEM.md, "Visual direction"). This tool takes the pairs'
// first half, before any prompt changes what is drawn, and takes the second
// half again after one does:
//
//   node tools/visual-matrix.mjs --out <dir outside the repository>
//   node tools/visual-matrix.mjs --out <dir> --only orbital-system,keplers-2nd-law
//   node tools/visual-matrix.mjs --out <dir> --widths 375 --themes midnight --languages en
//   node tools/visual-matrix.mjs --out <dir> --repeat      capture each cell twice, compare
//   node tools/visual-matrix.mjs --out <dir> --baseline tests/fixtures/visual-baseline.json
//        write the table of what was captured (hashes, clocks, records), the
//        only file that goes in the repository
//   node tools/visual-matrix.mjs --out <dir> --compare tests/fixtures/visual-baseline.json
//        capture again and say which cells differ from that table
//
// The matrix is the nine pilot states (tools/visual-criteria.mjs: five lesson
// pilots, four sandbox pilots) at 375, 768 and 1366 CSS pixels wide, in the
// Midnight and Daylight themes and in English and Spanish, each with the focus
// ring drawn on one control (a keyboard-focus capture beside the plain one).
//
// Matched states.
//   Sandbox pilot  A scene record (tools/scene-record.mjs). The committed 1366
//                  record is the base; a cell's record is the base with the
//                  viewport, the theme and nothing else changed, and the same
//                  camera, seed and physics clock. It is captured by
//                  tools/scene-capture.mjs's own routine, which stops the clock
//                  at the record's time. The camera is the same at every width,
//                  as the committed records have it, so a narrower width shows
//                  less of the scene, and that is stated, not hidden.
//   Lesson pilot   A page record: the route (the lesson's link), the step's
//                  sid, the viewport, the theme, the language, the scroll
//                  position of the window and of the lesson panel, the quality
//                  tier and the pixel ratio. The scene is paused and rebuilt
//                  from its step's setup while paused, so the clock reads 0 and
//                  the bodies are where the step puts them; the record keeps
//                  the bodies' places and the camera so a later capture can be
//                  shown to be the same state.
//
// A comparison at different framing is labelled and goes beside the matched
// one, never in its place. The images are an output, never a fixture: --out
// must be outside this checkout.
// =============================================================================

/* global KeyboardEvent */
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { resolve, dirname, join, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serveStatic } from './static-server.mjs';
import { applyScene, comparePng } from './scene-capture.mjs';
import { loadRecord, RECORDS_DIR } from './scene-record.mjs';
import {
  SANDBOX_PILOTS,
  LESSON_PILOTS,
  MATRIX_WIDTHS,
  THEMES,
  LANGUAGES,
  openLessonStep,
} from './visual-criteria.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const HEIGHT_FOR = { 375: 812, 768: 1024, 1366: 800 };
export const SCHEMA = 'gravitas.visual-baseline/1';
/** The seed of the random stream a lesson capture draws its effects from. */
export const LESSON_SEED = 1036648069;

const sha = buf => createHash('sha256').update(buf).digest('hex').slice(0, 16);

function gitHead() {
  try {
    return execFileSync('git', ['rev-parse', '--short=8', 'HEAD'], {
      cwd: ROOT,
      encoding: 'utf8',
    }).trim();
  } catch {
    return 'unknown';
  }
}

/** The cells of the matrix, in a stable order, after the filters. */
export function cells({ only, widths, themes, languages } = {}) {
  const out = [];
  const keep = (list, v) => !list || list.includes(v);
  for (const pilot of [...LESSON_PILOTS, ...SANDBOX_PILOTS]) {
    if (!keep(only, pilot.id)) continue;
    for (const width of MATRIX_WIDTHS) {
      if (!keep(widths, width)) continue;
      for (const theme of THEMES) {
        if (!keep(themes, theme)) continue;
        for (const language of LANGUAGES) {
          if (!keep(languages, language)) continue;
          out.push({
            id: `${pilot.id}-${theme}-${width}-${language}`,
            kind: pilot.base ? 'sandbox' : 'lesson',
            pilot,
            width,
            height: HEIGHT_FOR[width],
            theme,
            language,
          });
        }
      }
    }
  }
  return out;
}

/** A sandbox cell's scene record: the base with the viewport and theme changed. */
export function deriveRecord(cell) {
  const base = loadRecord(join(ROOT, RECORDS_DIR, `${cell.pilot.base}.json`));
  const record = JSON.parse(JSON.stringify(base));
  record.id = cell.id;
  record.theme = cell.theme;
  record.viewport = { width: cell.width, height: cell.height };
  record.matrix = {
    derivedFrom: cell.pilot.base,
    changed: ['viewport', 'theme'],
    language: cell.language,
    note: "the camera, seed and physics clock are the base record's: a narrower width shows less of the scene",
  };
  return record;
}

/** Open the sandbox page for a record, in a language, on the fake clock. */
async function openSandbox(browser, origin, record, language) {
  const page = await browser.newPage({
    viewport: record.viewport,
    deviceScaleFactor: record.pixelRatio,
    reducedMotion: 'reduce',
  });
  page.on('pageerror', e => console.warn(`  ! ${e.message}`));
  await page.goto(`${origin}/`, { waitUntil: 'load' });
  await page.evaluate(lang => {
    try {
      localStorage.setItem('gravitas_welcome_seen_v1', '1');
      if (lang !== 'en') localStorage.setItem('gravitas_locale', lang);
    } catch {
      /* not required */
    }
  }, language);
  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction(() => window.splashScreenEnded === true, {
    timeout: 20000,
  });
  await page.clock.install({ time: 1.7e12 });
  await page.clock.pauseAt(1.7e12 + 1000);
  return page;
}

/**
 * The playback bar's box. Its label and thumb follow a recorder that samples on
 * the wall clock (js/timeline.js), the one layer a fake clock does not hold, so
 * a repeat that differs only inside this box is the same state.
 */
const barRect = page =>
  page.evaluate(() => {
    const b = document.getElementById('timelineBar')?.getBoundingClientRect();
    return b && b.width ? [b.left, b.top, b.right, b.bottom] : null;
  });

/** The control a keyboard user would be on, and a way to put the ring on it. */
async function focusRing(page, cell) {
  const selector =
    cell.kind === 'lesson'
      ? '#investigationNext'
      : cell.width < 800
        ? '#mobileMenuToggle'
        : '#loadScenarioBtn';
  const ok = await page.evaluate(sel => {
    const el = document.querySelector(sel);
    if (!el) return false;
    // A key press first, so the page is in keyboard modality and the ring (a
    // :focus-visible style) is drawn.
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Shift' }));
    el.focus({ focusVisible: true });
    return document.activeElement === el;
  }, selector);
  return { selector, focused: ok };
}

async function captureSandbox(browser, origin, cell) {
  const record = deriveRecord(cell);
  const page = await openSandbox(browser, origin, record, cell.language);
  try {
    const report = await applyScene(page, record, { driven: true });
    await page.clock.runFor(500);
    const canvas = await page.locator('#simulationCanvas').screenshot();
    const viewport = await page.screenshot();
    report.timelineBar = await barRect(page);
    const ring = await focusRing(page, cell);
    await page.clock.runFor(100);
    const focus = await page.screenshot();
    return { record, report, ring, shots: { canvas, viewport, focus } };
  } finally {
    await page.close();
  }
}

async function captureLesson(browser, origin, cell) {
  const page = await browser.newPage({
    viewport: { width: cell.width, height: cell.height },
    deviceScaleFactor: 1,
    reducedMotion: 'reduce',
  });
  page.on('pageerror', e => console.warn(`  ! ${e.message}`));
  try {
    await openLessonStep(page, {
      origin,
      lesson: cell.pilot.lesson,
      sid: cell.pilot.sid,
      language: cell.language,
      theme: cell.theme,
      subject: cell.pilot.subject,
    });
    // Freeze the page's clocks, rebuild the step's scene from its setup (the
    // reset beside the progress bar, pressed from the page because a pointer
    // click waits on animation frames the frozen clock never delivers), drive
    // frames of 16 ms with the scene held, and capture the step's start.
    await page.clock.install({ time: 1.7e12 });
    await page.clock.pauseAt(1.7e12 + 1000);
    // Draws after the build (a star's surface, a disk's particles) come from a
    // stream seeded the same way for every capture, as tools/scene-capture.mjs
    // does for a sandbox record.
    await page.evaluate(async seed => {
      const { mulberry32 } = await import('/js/rng.js');
      const st = await import('/js/engine/state.js');
      window.__generation = st.getWorldGeneration();
      Math.random = mulberry32(seed);
      document.getElementById('investigationResetScenario')?.click();
    }, LESSON_SEED);
    // The rebuild finishes after a number of frames that depends on how long
    // the stage's code took to arrive, so the frames are counted from the
    // moment the world is a new one, not from the click.
    let rebuilt = false;
    // Held while it waits: a reset that unpauses the scene advances nothing
    // before the capture, so the physics clock reads 0 and the bodies are where
    // the step puts them.
    for (let i = 0; i < 600 && !rebuilt; i++) {
      await page.evaluate(async () => {
        const ui = await import('/js/ui.js');
        ui.state.paused = true;
        ui.SETTINGS.paused = true;
      });
      await page.clock.runFor(16);
      rebuilt = await page.evaluate(async () => {
        const st = await import('/js/engine/state.js');
        return st.getWorldGeneration() !== window.__generation;
      });
    }
    await page.evaluate(async () => {
      const ui = await import('/js/ui.js');
      ui.state.paused = true;
      ui.SETTINGS.paused = true;
    });
    // The reset says what it did in a toast; let it go before the capture.
    await page.clock.runFor(8000);
    const state = await page.evaluate(async () => {
      const ui = await import('/js/ui.js');
      const physics = await import('/js/physics.js');
      const ls = await import('/js/lessonScene.js');
      const theme = await import('/js/theme.js');
      const canvas = document.getElementById('simulationCanvas');
      const panel = document.getElementById('investigationPanel');
      const body = document.getElementById('investigationBody');
      return {
        simTime: physics.getSimulationTime(),
        paused: ui.state.paused,
        zoom: ui.state.zoom,
        pan: { x: ui.state.pan.x, y: ui.state.pan.y },
        theme: theme.getTheme(),
        language: localStorage.getItem('gravitas_locale'),
        qualityTier: ui.SETTINGS.quality_tier,
        canvas: { width: canvas.width, height: canvas.height },
        bodies: ls.boundRoles().map(role => {
          const b = ls.roleBody(role);
          return b
            ? {
                role,
                x: +b.pos.x.toFixed(6),
                y: +b.pos.y.toFixed(6),
                kind: b.constructor?.name,
              }
            : { role, missing: true };
        }),
        scroll: {
          window: [window.scrollX, window.scrollY],
          panel: panel?.scrollTop ?? null,
          body: body?.scrollTop ?? null,
        },
        step: document.querySelector('.inv-step-count')?.textContent?.trim(),
      };
    });
    const canvas = await page.locator('#simulationCanvas').screenshot();
    const viewport = await page.screenshot();
    state.timelineBar = await barRect(page);
    const ring = await focusRing(page, cell);
    await page.waitForTimeout(150);
    const focus = await page.screenshot();
    const record = {
      format: 'gravitas.page-record/1',
      id: cell.id,
      route: `/#investigation=${cell.pilot.lesson}`,
      lesson: cell.pilot.lesson,
      stepSid: cell.pilot.sid,
      viewport: { width: cell.width, height: cell.height },
      pixelRatio: 1,
      theme: cell.theme,
      language: cell.language,
      qualityTier: 'full',
      scroll: state.scroll,
      how: "progress written with the step sid, link opened, clocks frozen, the step's scene reset and held until it is rebuilt, then photographed at the step's start (physics clock 0)",
      randomSeed: LESSON_SEED,
    };
    return { record, report: state, ring, shots: { canvas, viewport, focus } };
  } finally {
    await page.close();
  }
}

export async function captureCell(browser, origin, cell) {
  return cell.kind === 'sandbox'
    ? captureSandbox(browser, origin, cell)
    : captureLesson(browser, origin, cell);
}

function parseArgs(argv) {
  const get = name => {
    const i = argv.indexOf(name);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  const list = (name, num) =>
    get(name)
      ?.split(',')
      .map(x => (num ? Number(x) : x));
  return {
    out: get('--out'),
    only: list('--only'),
    widths: list('--widths', true),
    themes: list('--themes'),
    languages: list('--languages'),
    repeat: argv.includes('--repeat'),
    baseline: get('--baseline'),
    compare: get('--compare'),
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.out)
    throw new Error('--out <directory outside the repository> is required');
  const out = resolve(args.out);
  if (out === ROOT || out.startsWith(ROOT + sep))
    throw new Error(
      'captures are an output: --out must be outside this checkout'
    );
  mkdirSync(out, { recursive: true });
  const list = cells(args);
  if (!list.length) throw new Error('no cell matches the filters');

  const server = await serveStatic({ root: ROOT, port: 0 });
  const origin = `http://localhost:${server.address().port}`;
  const browser = await chromium.launch();
  const table = [];
  const compareWith = args.compare
    ? JSON.parse(readFileSync(args.compare, 'utf8')).cells
    : null;
  let changed = 0;
  try {
    for (const cell of list) {
      const t0 = Date.now();
      const first = await captureCell(browser, origin, cell);
      const names = {
        canvas: `${cell.id}-canvas.png`,
        viewport: `${cell.id}-viewport.png`,
        focus: `${cell.id}-focus.png`,
      };
      for (const k of Object.keys(names))
        writeFileSync(join(out, names[k]), first.shots[k]);
      writeFileSync(
        join(out, `${cell.id}.record.json`),
        `${JSON.stringify(first.record, null, 2)}\n`
      );
      const row = {
        id: cell.id,
        kind: cell.kind,
        pilot: cell.pilot.id,
        width: cell.width,
        height: cell.height,
        theme: cell.theme,
        language: cell.language,
        record:
          cell.kind === 'sandbox'
            ? { scene: cell.pilot.base, simTime: first.report.simTime }
            : {
                route: first.record.route,
                stepSid: first.record.stepSid,
                simTime: first.report.simTime,
                bodies: first.report.bodies,
              },
        canvasSha: sha(first.shots.canvas),
        viewportSha: sha(first.shots.viewport),
        focusSha: sha(first.shots.focus),
        focus: first.ring,
      };
      if (args.repeat) {
        const second = await captureCell(browser, origin, cell);
        row.repeat = {
          canvas: sha(second.shots.canvas) === row.canvasSha,
          viewport: sha(second.shots.viewport) === row.viewportSha,
          focus: sha(second.shots.focus) === row.focusSha,
        };
        if (!row.repeat.viewport) {
          writeFileSync(
            join(out, `${cell.id}-repeat-viewport.png`),
            second.shots.viewport
          );
          const d = await comparePng(
            browser,
            first.shots.viewport,
            second.shots.viewport
          );
          row.repeat.differing = d.differing;
          row.repeat.box = d.box;
          const r = first.report.timelineBar;
          row.repeat.confinedToTimelineBar =
            !!r &&
            !!d.box &&
            d.box[0] >= r[0] &&
            d.box[1] >= r[1] &&
            d.box[2] <= r[2] &&
            d.box[3] <= r[3];
        }
      }
      if (compareWith) {
        const was = compareWith.find(c => c.id === cell.id);
        row.sameAsBaseline = !!was && was.viewportSha === row.viewportSha;
        // A cell that did not repeat at the baseline differs between two
        // captures of the same tree, so a difference there is not evidence.
        row.baselineRepeated =
          !!was?.repeat?.viewport ||
          !!was?.repeat?.confinedToTimelineBar ||
          (was?.repeat?.differing ?? 99) <= 5;
        if (!row.sameAsBaseline) changed++;
      }
      table.push(row);
      console.log(
        `${cell.id} ${((Date.now() - t0) / 1000).toFixed(1)}s ` +
          `sim ${first.report.simTime}` +
          (row.repeat ? ` repeat ${JSON.stringify(row.repeat)}` : '') +
          (compareWith ? (row.sameAsBaseline ? ' same' : ' DIFFERS') : '')
      );
    }
  } finally {
    await browser.close();
    server.close();
  }
  if (args.baseline) {
    writeFileSync(
      args.baseline,
      `${JSON.stringify(
        {
          format: SCHEMA,
          tree: gitHead(),
          machine:
            'headless Chromium (Playwright), device pixel ratio 1, reduced motion, English or Spanish, one worker',
          images: 'outside the repository; the table holds their hashes',
          cells: table,
        },
        null,
        2
      )}\n`
    );
    console.log(`baseline table written: ${args.baseline}`);
  }
  if (compareWith) {
    console.log(`${changed} of ${table.length} cells differ from the baseline`);
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1])
  main().catch(e => {
    console.error(e);
    process.exit(2);
  });
