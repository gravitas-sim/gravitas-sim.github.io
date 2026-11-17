#!/usr/bin/env node
// =============================================================================
// The sandbox workspace walk: seven tasks, by mouse, by keyboard and by touch
// -----------------------------------------------------------------------------
// Development only, outside the gate (a browser run). For each task it records
// the route a student takes today: each control used, whether it was on the
// screen when the sandbox opened, where it sits, how many presses it took to
// reach it (opening a drawer or a rail section counts as one), and the tier of
// the workspace hierarchy the control belongs to (DESIGN_SYSTEM.md, "Workspace
// for doing"). A step with no route is recorded OPEN with the prompt that owns
// it; nothing is worked around and nothing here says the sandbox is easy to use.
//
//   node tools/workspace-walk.mjs [--mode mouse|keyboard|touch] [--lang en|es]
//                                 [--out file.json] [--print]
//   node tools/workspace-walk.mjs --merge <out.json> --before <dir> --after <dir>
//   node tools/workspace-walk.mjs --table <merged.json>
//
// A run writes one <mode>-<lang>.json; --merge joins the six runs of the tree
// before a change and the six after it into docs/workspace-walkthrough.json,
// and --table prints that file as the Markdown tables the pull request shows.
//
// mouse: 1366x800, real clicks. touch: 375x812 with a touch screen, real taps.
// keyboard: 1366x800, real Tab presses from the top of the page, counted to the
// control, then Enter. The record is a snapshot of one machine and one tree: it
// names the commit and what it did not do (a task's measured result is not
// waited for; the stopwatch is armed, not read).
// =============================================================================

import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serveStatic } from './static-server.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : fallback;
};
const MODE = arg('mode', 'mouse');
const LANG = arg('lang', 'en');
const OUT = arg('out', null);
const PRINT = process.argv.includes('--print');
const VIEWPORT =
  MODE === 'touch' ? { width: 375, height: 812 } : { width: 1366, height: 800 };

/** The tier of each control in the workspace hierarchy. */
export const TIERS = {
  timelinePlay: 'at hand',
  timelineStepFwd: 'at hand',
  timelineStepBack: 'at hand',
  slowDownBtn: 'at hand',
  speedUpBtn: 'at hand',
  resetViewBtn: 'at hand',
  undoBtn: 'at hand',
  simulationCanvas: 'at hand',
  loadScenarioBtn: 'one step away',
  toggleStopwatch: 'one step away',
  stopwatchLatch: 'one step away',
  refreshScenarioBtn: 'one step away',
  objectTypeBtn: 'one step away',
  settingsBtn: 'advanced',
  settingsFilter: 'advanced',
  settingsApply: 'advanced',
  followSelect: 'advanced',
};

/** What a task step needs that the sandbox does not yet give, and its owner. */
const OPEN_ITEMS = {
  keyboardSelect: {
    what: 'select a body from the keyboard',
    owner: 475,
  },
  followChosen: {
    what: 'follow the chosen body (Settings follows a type)',
    owner: 467,
  },
};

function commit() {
  try {
    return execFileSync('git', ['rev-parse', '--short=9', 'HEAD'], {
      cwd: ROOT,
      encoding: 'utf8',
    }).trim();
  } catch {
    return null;
  }
}

/** Is the control on the screen, uncovered, right now? And where is it. */
async function probe(page, selector) {
  return page.evaluate(sel => {
    const el = document.querySelector(sel);
    if (!el) return { exists: false };
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const inView =
      r.width > 0 &&
      r.height > 0 &&
      cx >= 0 &&
      cy >= 0 &&
      cx <= window.innerWidth &&
      cy <= window.innerHeight;
    const top = inView ? document.elementFromPoint(cx, cy) : null;
    const ready =
      inView &&
      cs.visibility !== 'hidden' &&
      !!top &&
      (top === el || el.contains(top) || top.contains(el));
    const group = el.closest('.rail-group');
    const toggle = group?.querySelector('.rail-section-toggle');
    const rail = document.getElementById('mainControls');
    return {
      exists: true,
      ready,
      y: r.width > 0 && r.height > 0 ? Math.round(r.top) : null,
      x: Math.round(r.left),
      offscreen:
        r.width > 0 && r.height > 0 && !inView && cs.visibility !== 'hidden',
      name:
        el.getAttribute('aria-label') ||
        el.textContent.trim().replace(/\s+/g, ' ').slice(0, 40) ||
        el.getAttribute('title') ||
        '',
      collapsedToggle:
        toggle && toggle.getAttribute('aria-expanded') === 'false'
          ? toggle.id
          : null,
      inRail: !!rail?.contains(el),
      railOpen:
        !!rail &&
        rail.getBoundingClientRect().right > 0 &&
        rail.getBoundingClientRect().left < window.innerWidth &&
        getComputedStyle(rail).visibility !== 'hidden' &&
        rail.getBoundingClientRect().width > 0,
    };
  }, selector);
}

async function press(page, selector) {
  if (MODE === 'touch') await page.locator(selector).tap();
  else await page.locator(selector).click();
}

/** Open whatever hides the control, counting each press; then report it. */
async function reach(page, id, steps) {
  const first = await probe(page, `#${id}`);
  const opened = [];
  let st = first;
  for (let guard = 0; guard < 4 && st.exists && !st.ready; guard++) {
    if (st.inRail && MODE === 'touch' && !st.railOpen) {
      await press(page, '#mobileMenuToggle');
      opened.push('mobileMenuToggle');
    } else if (st.collapsedToggle) {
      await press(page, `#${st.collapsedToggle}`);
      opened.push(st.collapsedToggle);
    } else if (st.inRail && MODE === 'touch' && !st.offscreen) {
      await press(page, '#mobileMenuToggle');
      opened.push('mobileMenuToggle');
    } else if (st.offscreen) {
      // The rail scrolls: one wheel gesture to bring the control up.
      await page
        .locator(`#${id}`)
        .evaluate(el => el.scrollIntoView({ block: 'center' }));
      opened.push('scroll');
    } else break;
    await page.waitForTimeout(450);
    st = await probe(page, `#${id}`);
  }
  steps.push({
    control: id,
    name: first.name,
    tier: TIERS[id] ?? null,
    visibleAtStart: first.ready === true,
    y: first.exists ? first.y : null,
    opened,
    reached: st.ready === true,
  });
  return st.ready;
}

/**
 * Tab presses from the top of the page until the control has focus. A control
 * inside a closed rail section costs the Tab presses to the section's button,
 * Enter, and the Tabs from there.
 */
async function tabsTo(page, id) {
  const start = async () =>
    page.evaluate(() => {
      document.getElementById('walkStart')?.remove();
      const b = document.createElement('button');
      b.id = 'walkStart';
      b.textContent = 'start';
      document.body.prepend(b);
      b.focus();
    });
  const walk = async target => {
    for (let n = 1; n <= 200; n++) {
      await page.keyboard.press('Tab');
      const at = await page.evaluate(
        () => document.activeElement?.id || document.activeElement?.tagName
      );
      if (at === target) return n;
    }
    return null;
  };
  await start();
  const st = await probe(page, `#${id}`);
  let keys = 0;
  if (st.exists && !st.ready && st.collapsedToggle) {
    const n = await walk(st.collapsedToggle);
    if (n === null) return null;
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);
    keys += n + 1;
    const m = await walk(id);
    await page.evaluate(() => document.getElementById('walkStart')?.remove());
    return m === null ? null : keys + m;
  }
  const n = await walk(id);
  await page.evaluate(() => document.getElementById('walkStart')?.remove());
  return n;
}

async function bodyScreenPoint(page, type) {
  return page.evaluate(async type => {
    const physics = await import('/js/physics.js');
    const ui = await import('/js/ui.js');
    const canvas = document.getElementById('simulationCanvas');
    const scale = canvas.width / canvas.clientWidth;
    const lists = {
      Planet: physics.planets,
      GasGiant: physics.gas_giants,
    };
    const b = (lists[type] || physics.planets).find(p => p.alive);
    if (!b) return null;
    const { state } = ui;
    const sx =
      (canvas.width / 2 +
        state.pan.x +
        (b.pos.x - state.frameOffset.x) * state.zoom) /
      scale;
    const sy =
      (canvas.height / 2 +
        state.pan.y -
        (b.pos.y - state.frameOffset.y) * state.zoom) /
      scale;
    return { x: sx, y: sy, name: b.name };
  }, type);
}

const MODES = ['mouse', 'keyboard', 'touch'];
const LANGS = ['en', 'es'];

function merge(out, beforeDir, afterDir) {
  const read = dir =>
    MODES.flatMap(m =>
      LANGS.map(l => JSON.parse(readFileSync(`${dir}/${m}-${l}.json`, 'utf8')))
    );
  const side = dir => {
    const runs = read(dir);
    return { commit: runs[0].commit, measuredAt: runs[0].measuredAt, runs };
  };
  const record = {
    format: 'gravitas.workspace-walk-set/1',
    note: 'Presses to reach and use each control, a drawer or rail section opened counting as one; Tab presses (and Enter) in the keyboard runs, counted from the top of the page for each control. A task result is not waited for: the stopwatch is armed, not read.',
    before: side(beforeDir),
    after: side(afterDir),
  };
  writeFileSync(out, JSON.stringify(record, null, 1) + '\n');
}

function table(file) {
  const set = JSON.parse(readFileSync(file, 'utf8'));
  const cell = (side, mode, lang, id) => {
    const run = set[side].runs.find(r => r.mode === mode && r.lang === lang);
    const t = run?.tasks.find(x => x.id === id);
    if (!t) return '-';
    const where = t.first
      ? `${t.first.control} ${t.first.visibleAtStart ? 'on screen' : 'hidden'}`
      : '-';
    return `${t.actions} (${where})`;
  };
  const ids = set.after.runs[0].tasks.map(t => [t.id, t.label]);
  const lines = [];
  for (const lang of LANGS) {
    lines.push(
      `Language: ${lang}. Each cell: presses (first control, on screen or hidden at first sight).`,
      ''
    );
    lines.push(
      '| Task | Mouse before | Mouse after | Keyboard before | Keyboard after | Touch before | Touch after |'
    );
    lines.push('|---|---|---|---|---|---|---|');
    for (const [id, label] of ids) {
      const cols = MODES.flatMap(m => [
        cell('before', m, lang, id),
        cell('after', m, lang, id),
      ]);
      lines.push(`| ${label} | ${cols.join(' | ')} |`);
    }
    lines.push('');
  }
  const open = new Map();
  for (const r of set.after.runs)
    for (const t of r.tasks) for (const o of t.open) open.set(o.what, o.owner);
  lines.push('OPEN items (no route today):', '');
  for (const [what, owner] of open) lines.push(`- ${what}: owner ${owner}`);
  console.log(lines.join('\n'));
}

async function main() {
  const server = await serveStatic({ root: ROOT, port: 0 });
  const origin = `http://localhost:${server.address().port}`;
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: VIEWPORT,
    hasTouch: MODE === 'touch',
    isMobile: MODE === 'touch',
    reducedMotion: 'reduce',
  });
  const page = await ctx.newPage();
  await page.addInitScript(() => {
    try {
      localStorage.setItem('gravitas_welcome_seen_v1', '1');
    } catch {
      /* not required */
    }
  });
  await page.goto(`${origin}/`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.splashScreenEnded === true, null, {
    timeout: 30000,
  });
  await page.waitForFunction(
    () => document.querySelector('.ui-container')?.classList.contains('showUI'),
    null,
    { timeout: 30000 }
  );
  if (LANG !== 'en') {
    await page.evaluate(async lang => {
      const i18n = await import('/js/i18n/index.js');
      await i18n.setLocale(lang, { persist: false });
    }, LANG);
  }
  await page.waitForTimeout(800);

  const tasks = [];
  /** Each task starts from the sandbox as a student first sees it. */
  const fresh = async ({ load = false } = {}) => {
    await page.evaluate(() => {
      try {
        localStorage.clear();
        window.sessionStorage.clear();
      } catch {
        /* not required */
      }
    });
    await page.reload({ waitUntil: 'load' });
    await page.waitForFunction(() => window.splashScreenEnded === true, null, {
      timeout: 30000,
    });
    await page.waitForFunction(
      () =>
        document.querySelector('.ui-container')?.classList.contains('showUI'),
      null,
      { timeout: 30000 }
    );
    if (LANG !== 'en') {
      await page.evaluate(async lang => {
        const i18n = await import('/js/i18n/index.js');
        await i18n.setLocale(lang, { persist: false });
      }, LANG);
    }
    if (load) {
      await page.evaluate(async () => {
        const ui = await import('/js/ui.js');
        ui.SETTINGS.preset_scenario = 'solar-system';
        ui.initialize_simulation({ seed: 'walk' });
      });
    }
    await page.waitForTimeout(1200);
  };
  const task = async (id, label, fn, opts = {}) => {
    await fresh(opts);
    const steps = [];
    const open = [];
    let result = 'done';
    try {
      result = (await fn(steps, open)) || 'done';
    } catch (e) {
      result = `error: ${e.message.split('\n')[0]}`;
    }
    const pressed = steps.reduce(
      (n, s) => n + (s.tabs != null ? s.tabs + 1 : 1 + s.opened.length),
      0
    );
    tasks.push({
      id,
      label,
      result,
      actions: pressed,
      first: steps[0]
        ? {
            control: steps[0].control,
            visibleAtStart: steps[0].visibleAtStart,
            y: steps[0].y,
          }
        : null,
      steps,
      open,
    });
  };

  // Keyboard mode: Tab presses from the top of the page, then the key.
  const act = async (steps, id, extra = {}) => {
    if (MODE === 'keyboard') {
      const n = await tabsTo(page, id);
      steps.push({
        control: id,
        name: (await probe(page, `#${id}`)).name,
        tier: TIERS[id] ?? null,
        tabs: n,
        opened: [],
        visibleAtStart: null,
        y: null,
        reached: n !== null,
        ...extra,
      });
      if (n !== null) await page.keyboard.press('Enter');
      return n !== null;
    }
    if (!(await reach(page, id, steps))) return false;
    Object.assign(steps[steps.length - 1], extra);
    await press(page, `#${id}`);
    return true;
  };

  // 1. Load a scenario.
  await task('load', 'Load a scenario', async steps => {
    if (!(await act(steps, 'loadScenarioBtn'))) return 'control not reachable';
    await page.waitForSelector('button.sc-card[data-scenario="solar-system"]');
    steps.push({
      control: 'sc-card:solar-system',
      name: 'Solar System card',
      tier: 'one step away',
      opened: [],
      visibleAtStart: false,
      y: null,
      reached: true,
    });
    if (MODE === 'keyboard') {
      await page
        .locator('button.sc-card[data-scenario="solar-system"]')
        .focus();
      await page.keyboard.press('Enter');
    } else {
      await press(page, 'button.sc-card[data-scenario="solar-system"]');
    }
    await page.waitForTimeout(2500);
  });

  // 2. Find a planet.
  await task(
    'find',
    'Find a planet',
    async (steps, open) => {
      if (MODE === 'keyboard') {
        open.push(OPEN_ITEMS.keyboardSelect);
        steps.push({
          control: 'simulationCanvas',
          name: 'canvas',
          tier: 'at hand',
          tabs: null,
          opened: [],
          visibleAtStart: null,
          y: null,
          reached: false,
        });
        return 'OPEN';
      }
      const pt = await bodyScreenPoint(page, 'Planet');
      if (!pt) return 'no planet in the scene';
      const covered = await page.evaluate(
        ({ x, y }) => document.elementFromPoint(x, y)?.id || null,
        pt
      );
      steps.push({
        control: 'simulationCanvas',
        name: pt.name,
        tier: 'at hand',
        opened: [],
        visibleAtStart: covered === 'simulationCanvas',
        y: Math.round(pt.y),
        reached: covered === 'simulationCanvas',
      });
      if (MODE === 'touch') await page.touchscreen.tap(pt.x, pt.y);
      else await page.mouse.click(pt.x, pt.y);
      await page.waitForTimeout(400);
      return covered === 'simulationCanvas' ? 'done' : `covered by #${covered}`;
    },
    { load: true }
  );

  // 3. Follow it.
  await task(
    'follow',
    'Follow the planet',
    async (steps, open) => {
      open.push(OPEN_ITEMS.followChosen);
      if (!(await act(steps, 'settingsBtn'))) return 'control not reachable';
      await page.waitForTimeout(700);
      // Follow mode sits in the dialog's grid, in a closed "Advanced" fold.
      const fold = await page.evaluate(() => {
        const sel = [...document.querySelectorAll('#settingsGrid select')].find(
          s => [...s.options].some(o => o.value === 'BlackHole')
        );
        if (!sel) return null;
        sel.setAttribute('data-walk', 'follow');
        const det = sel.closest('details');
        return { fold: !!det && !det.open, inGrid: true };
      });
      if (fold?.fold) {
        await page.locator('#settingsGrid details > summary').first().click();
        await page.waitForTimeout(300);
      }
      steps.push({
        control: 'followSelect',
        name: 'Follow mode',
        tier: 'advanced',
        opened: fold?.fold ? ['advancedFold'] : [],
        visibleAtStart: false,
        y: null,
        reached: !!fold,
        note: 'a type (Planet), not the chosen body',
      });
      if (fold) {
        await page.locator('[data-walk="follow"]').selectOption('Planet');
      }
      if (MODE !== 'keyboard') {
        if (await reach(page, 'settingsApply', steps)) {
          await press(page, '#settingsApply');
        }
      } else {
        await page.keyboard.press('Escape');
      }
      await page.waitForTimeout(500);
      return MODE === 'keyboard'
        ? 'PARTIAL: a type, not the chosen body; the dialog fields were not walked by Tab'
        : 'PARTIAL: follows a type, not the chosen body';
    },
    { load: true }
  );

  // 4. Measure its period: arm the stopwatch on its periapsis.
  await task(
    'period',
    'Measure its period (stopwatch on periapsis)',
    async (steps, open) => {
      const pt = await bodyScreenPoint(page, 'Planet');
      if (MODE === 'keyboard') {
        open.push(OPEN_ITEMS.keyboardSelect);
        return 'OPEN: the latch needs a selected body';
      }
      steps.push({
        control: 'simulationCanvas',
        name: pt?.name,
        tier: 'at hand',
        opened: [],
        visibleAtStart: true,
        y: pt ? Math.round(pt.y) : null,
        reached: !!pt,
      });
      if (MODE === 'touch') await page.touchscreen.tap(pt.x, pt.y);
      else await page.mouse.click(pt.x, pt.y);
      await page.waitForTimeout(400);
      if (!(await act(steps, 'toggleStopwatch')))
        return 'control not reachable';
      await page.waitForTimeout(300);
      if (!(await act(steps, 'stopwatchLatch'))) return 'latch not reachable';
      const armed = await page.evaluate(() =>
        document.getElementById('stopwatchLatch')?.getAttribute('aria-pressed')
      );
      return armed === 'true'
        ? 'armed (the lap was not waited for)'
        : `latch aria-pressed=${armed}`;
    },
    { load: true }
  );

  // 5. Reset: the camera, then the scenario.
  await task(
    'reset',
    'Reset: fit the view, then start the scenario again',
    async steps => {
      if (!(await act(steps, 'resetViewBtn'))) return 'fit not reachable';
      if (!(await act(steps, 'refreshScenarioBtn')))
        return 'refresh not reachable';
      await page.waitForTimeout(600);
    },
    { load: true }
  );

  // 6. Change the speed.
  await task(
    'speed',
    'Slow the simulation down',
    async steps => {
      if (!(await act(steps, 'slowDownBtn'))) return 'control not reachable';
    },
    { load: true }
  );

  // 7. Pause and step.
  await task(
    'step',
    'Pause, then step once',
    async steps => {
      if (!(await act(steps, 'timelinePlay'))) return 'play not reachable';
      if (!(await act(steps, 'timelineStepFwd'))) return 'step not reachable';
    },
    { load: true }
  );

  const record = {
    format: 'gravitas.workspace-walk/1',
    commit: commit(),
    mode: MODE,
    lang: LANG,
    viewport: VIEWPORT,
    measuredAt: new Date().toISOString().slice(0, 10),
    note: 'Actions count presses to reach and use each control, opening a drawer or a rail section as one. A task result is not waited for.',
    tasks,
  };
  await browser.close();
  server.close();
  const text = JSON.stringify(record, null, 1);
  if (OUT) writeFileSync(OUT, text + '\n');
  if (PRINT || !OUT) {
    for (const t of tasks)
      console.log(
        `${t.id.padEnd(7)} actions ${String(t.actions).padStart(2)}  first ${t.first?.control ?? '-'} ` +
          `(${t.first?.visibleAtStart ? 'on screen' : 'hidden'}, y ${t.first?.y})  ${t.result}`
      );
  }
}

const mergeAt = process.argv.indexOf('--merge');
if (mergeAt > 0) {
  merge(arg('merge'), arg('before'), arg('after'));
} else if (process.argv.includes('--table')) {
  table(arg('table'));
} else
  main().catch(e => {
    console.error(e);
    process.exit(1);
  });
