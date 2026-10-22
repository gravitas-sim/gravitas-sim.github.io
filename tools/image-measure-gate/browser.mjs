/* global console, window, document, performance, process, MutationObserver, requestAnimationFrame, KeyboardEvent, PointerEvent, Event, Worker, URL, location */
// =============================================================================
// The gate's browser measurements (Prompt 178 prototype; spike code)
// -----------------------------------------------------------------------------
// Chromium drives the real panel (panel.js) through harness.html, served as the
// published sources are. A walk uses only the keys, or only single pointers
// (touch taps and button presses, no drag), and counts the events of the other
// kind (zero allowed) and the live-region messages of every action.
//
//   T2.keyboard, T2.pointer   the precision trials, by each path
//   T3.keyboard, T3.pointer   place, nudge, read, edit, delete on every kind
//   T3.announce               one announcement per commit, focus, axe
//   T3.sequence               next frame keeps marks by tag, copy forward
//   T6.interaction, T6.sequence   the throttled profile, 1,024 px, 50 marks
//   T7.time, T7.memory        a 2,048-pixel frame
//
// Timings are in-page `performance.now()` around dispatched input (handler work,
// as tools/observatory-bench.mjs does), with the page's CPU slowed four times
// (Emulation.setCPUThrottlingRate) for the mobile profile.
// =============================================================================

import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import { loadavg } from 'node:os';

import { THRESHOLDS } from '../image-measure-gate.mjs';
import { serve } from './server.mjs';

const P = THRESHOLDS.precision;
const I = THRESHOLDS.interaction;
const DESKTOP = { viewport: { width: 1280, height: 800 } };
const MOBILE = {
  viewport: { width: I.viewport[0], height: I.viewport[1] },
  hasTouch: true,
  isMobile: true,
  deviceScaleFactor: 1,
};
const round = (v, d = 4) => (Number.isFinite(v) ? Number(v.toPrecision(d)) : v);
const percentile = (values, q) => {
  const s = [...values].sort((a, b) => a - b);
  return s[Math.max(0, Math.ceil(q * s.length) - 1)];
};

/** Counters installed before the page runs: live-region messages and events by kind. */
function installCounters() {
  window.__ann = [];
  window.__stray = { pointer: 0, key: 0 };
  document.addEventListener('DOMContentLoaded', () => {
    new MutationObserver(records => {
      for (const r of records)
        for (const n of r.addedNodes)
          if ((n.textContent || '').trim())
            window.__ann.push(n.textContent.trim());
    }).observe(document.getElementById('srStatus'), { childList: true });
  });
  for (const t of [
    'pointerdown',
    'pointerup',
    'mousedown',
    'mouseup',
    'touchstart',
    'touchend',
  ])
    document.addEventListener(t, () => window.__stray.pointer++, true);
  for (const t of ['keydown', 'keyup'])
    document.addEventListener(t, () => window.__stray.key++, true);
}

async function open(browser, profile, query) {
  const context = await browser.newContext(profile);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => m.type() === 'error' && errors.push(m.text()));
  await page.addInitScript(installCounters);
  await page.goto(
    `${globalThis.__origin}/tools/image-measure-gate/harness.html?${query}`
  );
  await page.waitForFunction(() => window.__ready === true, null, {
    timeout: 60000,
  });
  return { page, context, errors };
}

const state = page =>
  page.evaluate(() => JSON.parse(JSON.stringify(window.__im.state())));
const aim = page => page.evaluate(() => ({ ...window.__im.ui.aim }));

/** An action, its announcement count and whether focus survived it. */
function recorder(page) {
  const acts = [];
  return {
    acts,
    async act(label, kind, fn) {
      await page.evaluate(() => (window.__ann.length = 0));
      await fn();
      await page.waitForFunction(() => !window.__im.ui.waiting);
      const r = await page.evaluate(() => ({
        n: window.__ann.length,
        text: window.__ann.join(' | '),
        focus:
          document.activeElement &&
          document.activeElement !== document.body &&
          document.activeElement.isConnected,
      }));
      acts.push({ label, kind, count: r.n, text: r.text, focusOk: r.focus });
      return r;
    },
    verdict() {
      const bad = acts.filter(a =>
        a.kind === 'commit' ? a.count !== 1 : a.count > 1
      );
      const badFocus = acts.filter(a => !a.focusOk);
      return {
        actions: acts.length,
        commits: acts.filter(a => a.kind === 'commit').length,
        badCount: bad.map(a => `${a.label}: ${a.count}`),
        badFocus: badFocus.map(a => a.label),
      };
    },
  };
}

// ---- keyboard primitives ------------------------------------------------------

async function focusKbd(page, selector) {
  for (let i = 0; i < 220; i++) {
    if (
      await page.evaluate(sel => document.activeElement?.matches(sel), selector)
    )
      return;
    await page.keyboard.press('Tab');
  }
  throw new Error(`could not reach ${selector} by Tab`);
}

/** Move the aim to within `tol` pixels of (x, y) with the contract's keys only. */
async function aimKbd(page, x, y, tol = 1.0) {
  let presses = 0;
  for (let guard = 0; guard < 600; guard++) {
    const a = await aim(page);
    const dx = x - a.x;
    const dy = y - a.y;
    if (Math.hypot(dx, dy) <= tol) return presses;
    const ex = Math.abs(dx);
    const ey = Math.abs(dy);
    let key;
    if (ey >= ex && ey >= 50) key = dy > 0 ? 'PageUp' : 'PageDown';
    else {
      const [axis, e] = ey >= ex ? ['y', ey] : ['x', ex];
      const dir =
        (axis === 'x' ? dx : dy) > 0
          ? axis === 'x'
            ? 'ArrowRight'
            : 'ArrowUp'
          : axis === 'x'
            ? 'ArrowLeft'
            : 'ArrowDown';
      key = e >= 4 ? `Shift+${dir}` : dir;
    }
    await page.keyboard.press(key);
    presses++;
  }
  throw new Error('aim did not settle');
}

const DOM = { read: id => `tr[data-id="${id}"]` };

async function toolKbd(page, kind) {
  await focusKbd(page, `button[data-tool="${kind}"]`);
  await page.keyboard.press('Enter');
}
async function actionKbd(page, act) {
  await focusKbd(page, `button[data-act="${act}"]`);
  await page.keyboard.press('Enter');
}
async function selectKbd(page, id) {
  await focusKbd(page, `${DOM.read(id)} th button`);
  await page.keyboard.press('Enter');
}

const TARGETS = {
  point: [[200, 300]],
  segment: [
    [300, 400],
    [380, 430],
  ],
  circle: [
    [500, 520],
    [560, 520],
  ],
  polygon: [
    [700, 200],
    [760, 200],
    [730, 260],
  ],
  count: [[150, 700]],
  'reference-pair': [
    [200, 800],
    [420, 800],
  ],
};

async function keyboardWalk(browser) {
  const { page, errors } = await open(
    browser,
    DESKTOP,
    'set=moon&frames=6&settle=120'
  );
  const rec = recorder(page);
  const failures = [];
  const check = (ok, what) => ok || failures.push(what);
  let n = 0;
  const done = {};
  for (const kind of THRESHOLDS.paths.kinds) {
    await toolKbd(page, kind);
    await focusKbd(page, 'canvas.im-over');
    const pts = TARGETS[kind];
    for (const [i, [x, y]] of pts.entries()) {
      await rec.act(`${kind}: aim ${i + 1}`, 'run', () => aimKbd(page, x, y));
      await rec.act(`${kind}: place ${i + 1}`, 'commit', () =>
        page.keyboard.press('Enter')
      );
    }
    if (kind === 'polygon')
      await rec.act('polygon: finish', 'commit', () =>
        actionKbd(page, 'finish')
      );
    const st = await state(page);
    const mark = st.marks[st.marks.length - 1];
    n++;
    check(mark?.kind === kind && mark.id === `m${n}`, `${kind} was not placed`);
    const id = mark.id;
    // select, which moves focus to the picture
    const sel = await rec.act(`${kind}: select`, 'commit', () =>
      selectKbd(page, id)
    );
    check(
      sel.text.includes(id),
      `${kind}: the selection was not announced (${sel.text})`
    );
    // nudge: three steps right, a coarse step up, a fine step left
    const before = (await state(page)).marks.find(m => m.id === id).pts[0];
    await rec.act(`${kind}: nudge`, 'run', async () => {
      for (const key of [
        'ArrowRight',
        'ArrowRight',
        'ArrowRight',
        'Shift+ArrowUp',
        'Alt+ArrowLeft',
      ])
        await page.keyboard.press(key);
    });
    const after = (await state(page)).marks.find(m => m.id === id).pts[0];
    check(
      Math.abs(after[0] - before[0] - 2.75) < 1e-9 &&
        Math.abs(after[1] - before[1] - 4) < 1e-9,
      `${kind}: nudge moved (${after[0] - before[0]}, ${after[1] - before[1]})`
    );
    // read: the row says what the state says
    const row = await page.evaluate(i => {
      const tr = document.querySelector(`tr[data-id="${i}"]`);
      const [x, y] = tr.querySelectorAll('input[type=number]');
      return {
        x: Number(x.value),
        y: Number(y.value),
        text: tr.cells[1].textContent,
      };
    }, id);
    check(
      Math.abs(row.x - after[0]) < 0.006 && Math.abs(row.y - after[1]) < 0.006,
      `${kind}: the table row does not read the state`
    );
    // edit: the tag, then x, from the table
    await rec.act(`${kind}: edit tag`, 'commit', async () => {
      await focusKbd(page, `${DOM.read(id)} input[aria-label$="Tag"]`);
      await page.keyboard.type('q');
      await page.keyboard.press('Enter');
    });
    await rec.act(`${kind}: edit x`, 'commit', async () => {
      await focusKbd(page, `${DOM.read(id)} input[data-axis="0"]`);
      await page.keyboard.press('ControlOrMeta+A');
      await page.keyboard.type('123.5');
      await page.keyboard.press('Enter');
    });
    const edited = (await state(page)).marks.find(m => m.id === id);
    check(
      edited.tag === 'q' && edited.pts[0][0] === 123.5,
      `${kind}: edit did not reach the state (${edited.tag}, ${edited.pts[0][0]})`
    );
    if (kind === 'reference-pair') {
      const sc = await page.evaluate(
        () => document.querySelector('.im-scale').textContent
      );
      check(/km\/pix/.test(sc), `reference pair: no scale (${sc})`);
    }
    // delete, from the picture
    await selectKbd(page, id);
    await rec.act(`${kind}: delete`, 'commit', () =>
      page.keyboard.press('Delete')
    );
    check(
      !(await state(page)).marks.some(m => m.id === id),
      `${kind}: not deleted`
    );
    done[kind] = failures.length === 0;
  }
  // refine and undo from the keyboard, on a real source
  const truth = await page.evaluate(() => window.__truth[0].features[0]);
  await toolKbd(page, 'point');
  await focusKbd(page, 'canvas.im-over');
  await aimKbd(page, truth.x, truth.y, 1.0);
  await page.keyboard.press('Enter');
  const pid = (await state(page)).marks.at(-1).id;
  await selectKbd(page, pid);
  await rec.act('refine', 'commit', () => actionKbd(page, 'refine'));
  const refined = (await state(page)).marks.find(m => m.id === pid);
  check(
    refined.refined &&
      Math.hypot(refined.pts[0][0] - truth.x, refined.pts[0][1] - truth.y) <=
        P.pathPoint,
    'keyboard refine'
  );
  await rec.act('undo', 'commit', () => actionKbd(page, 'undo'));
  check(
    !(await state(page)).marks.find(m => m.id === pid)?.refined,
    'undo of the refinement'
  );
  // the record round trip from the marks made by hand
  const rt = await page.evaluate(async () => {
    const r = await window.__im.keep();
    const back = await window.__im.reopen(JSON.parse(JSON.stringify(r)));
    return {
      identical: back.identical,
      marks: window.__im.state().marks.length,
    };
  });
  check(rt.identical, 'record replay in the page');
  const stray = await page.evaluate(() => window.__stray);
  check(
    stray.pointer === 0,
    `the keyboard walk used ${stray.pointer} pointer events`
  );
  // axe, with marks present
  await page.evaluate(() => window.__seed(0, 12));
  const axe = await new AxeBuilder({ page }).analyze();
  const serious = axe.violations.filter(v =>
    ['serious', 'critical'].includes(v.impact)
  );
  const v = rec.verdict();
  await page.context().close();
  return {
    failures,
    stray,
    errors,
    announce: v,
    axe: {
      violations: axe.violations.map(
        x => `${x.id} (${x.impact}, ${x.nodes.length})`
      ),
      seriousOrCritical: serious.map(x => x.id),
    },
    kindsDone: Object.keys(done),
  };
}

// ---- single-pointer primitives -----------------------------------------------------

async function tap(page, selector) {
  await page.locator(selector).first().tap();
}
async function tapImage(page, x, y) {
  const box = await page.evaluate(() => {
    const c = document.querySelector('canvas.im-over');
    c.scrollIntoView({ block: 'center' });
    const r = c.getBoundingClientRect();
    return {
      l: r.left,
      t: r.top,
      w: r.width,
      h: r.height,
      W: window.__im.frames[window.__im.ui.frame].width,
      H: window.__im.frames[window.__im.ui.frame].height,
    };
  });
  const cx = Math.round(box.l + ((x - 0.5) / box.W) * box.w);
  const cy = Math.round(box.t + ((box.H + 0.5 - y) / box.H) * box.h);
  await page.touchscreen.tap(cx, cy);
}
/** The on-screen pad moves the marker or mark to within `tol` of (x, y). */
async function padTo(page, x, y, tol = 1.0) {
  let taps = 0;
  for (let guard = 0; guard < 400; guard++) {
    const a = await aim(page);
    const dx = x - a.x;
    const dy = y - a.y;
    if (Math.hypot(dx, dy) <= tol) return taps;
    const ex = Math.abs(dx);
    const ey = Math.abs(dy);
    const axisX = ex > ey;
    const e = axisX ? ex : ey;
    const step = e >= 4 ? 'coarse' : 'normal';
    await page.locator('.im-pad select').first().selectOption(step);
    const name = axisX ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'up' : 'down';
    await tap(page, `button[data-act="${name}"]`);
    taps++;
  }
  throw new Error('pad did not settle');
}

async function pointerWalk(browser) {
  const { page, errors } = await open(
    browser,
    MOBILE,
    'set=moon&frames=6&settle=120'
  );
  const rec = recorder(page);
  const failures = [];
  const check = (ok, what) => ok || failures.push(what);
  let n = 0;
  for (const kind of THRESHOLDS.paths.kinds) {
    await tap(page, `button[data-tool="${kind}"]`);
    for (const [i, [x, y]] of TARGETS[kind].entries()) {
      await rec.act(`${kind}: tap ${i + 1}`, 'commit', () =>
        tapImage(page, x, y)
      );
      await rec.act(`${kind}: pad ${i + 1}`, 'run', () => padTo(page, x, y));
      await rec.act(`${kind}: place ${i + 1}`, 'commit', () =>
        tap(page, 'button[data-act="place"]')
      );
    }
    if (kind === 'polygon')
      await rec.act('polygon: finish', 'commit', () =>
        tap(page, 'button[data-act="finish"]')
      );
    const st = await state(page);
    const mark = st.marks.at(-1);
    n++;
    check(mark?.kind === kind && mark.id === `m${n}`, `${kind} was not placed`);
    const id = mark.id;
    const sel = await rec.act(`${kind}: select`, 'commit', () =>
      tap(page, `${DOM.read(id)} th button`)
    );
    check(sel.text.includes(id), `${kind}: selection not announced`);
    const before = (await state(page)).marks.find(m => m.id === id).pts[0];
    await rec.act(`${kind}: nudge`, 'run', async () => {
      await page.locator('.im-pad select').first().selectOption('normal');
      for (const a of ['right', 'right', 'right'])
        await tap(page, `button[data-act="${a}"]`);
      await page.locator('.im-pad select').first().selectOption('coarse');
      await tap(page, 'button[data-act="up"]');
      await page.locator('.im-pad select').first().selectOption('fine');
      await tap(page, 'button[data-act="left"]');
    });
    const after = (await state(page)).marks.find(m => m.id === id).pts[0];
    check(
      Math.abs(after[0] - before[0] - 2.75) < 1e-9 &&
        Math.abs(after[1] - before[1] - 4) < 1e-9,
      `${kind}: pad nudge moved (${after[0] - before[0]}, ${after[1] - before[1]})`
    );
    const row = await page.evaluate(i => {
      const tr = document.querySelector(`tr[data-id="${i}"]`);
      const [x, y] = tr.querySelectorAll('input[type=number]');
      return { x: Number(x.value), y: Number(y.value) };
    }, id);
    check(
      Math.abs(row.x - after[0]) < 0.006 && Math.abs(row.y - after[1]) < 0.006,
      `${kind}: the table row does not read the state`
    );
    await rec.act(`${kind}: edit tag`, 'commit', () =>
      page.locator('.im-pad label select').first().selectOption('k')
    );
    // handle 2 of a two-handle mark is edited by the pad as well: cycle, nudge, cycle back
    if (TARGETS[kind].length > 1) {
      await rec.act(`${kind}: next handle`, 'commit', () =>
        tap(page, 'button[data-act="handle"]')
      );
      const h2 = (await state(page)).marks.find(m => m.id === id).pts[1];
      await rec.act(`${kind}: edit handle 2`, 'run', () =>
        tap(page, 'button[data-act="right"]')
      );
      const h2b = (await state(page)).marks.find(m => m.id === id).pts[1];
      check(
        Math.abs(h2b[0] - h2[0]) > 0,
        `${kind}: the second handle did not move`
      );
    }
    const edited = (await state(page)).marks.find(m => m.id === id);
    check(edited.tag === 'k', `${kind}: tag edit did not reach the state`);
    await rec.act(`${kind}: delete`, 'commit', () =>
      tap(page, 'button[data-act="delete"]')
    );
    check(
      !(await state(page)).marks.some(m => m.id === id),
      `${kind}: not deleted`
    );
  }
  // refine and undo by single pointer
  const truth = await page.evaluate(() => window.__truth[0].features[0]);
  await tap(page, 'button[data-tool="point"]');
  await tapImage(page, truth.x, truth.y);
  await padTo(page, truth.x, truth.y, 1.0);
  await tap(page, 'button[data-act="place"]');
  const pid = (await state(page)).marks.at(-1).id;
  await tap(page, `${DOM.read(pid)} th button`);
  await rec.act('refine', 'commit', () =>
    tap(page, 'button[data-act="refine"]')
  );
  const refined = (await state(page)).marks.find(m => m.id === pid);
  check(
    refined.refined &&
      Math.hypot(refined.pts[0][0] - truth.x, refined.pts[0][1] - truth.y) <=
        P.pathPoint,
    'pointer refine'
  );
  await rec.act('undo', 'commit', () => tap(page, 'button[data-act="undo"]'));
  check(
    !(await state(page)).marks.find(m => m.id === pid)?.refined,
    'undo of the refinement'
  );
  const stray = await page.evaluate(() => window.__stray);
  check(stray.key === 0, `the pointer walk used ${stray.key} key events`);
  const v = rec.verdict();
  await page.context().close();
  return { failures, stray, errors, announce: v };
}

// ---- the sequence navigator ------------------------------------------------------------

async function sequenceWalk(browser, mode) {
  const profile = mode === 'keyboard' ? DESKTOP : MOBILE;
  const { page } = await open(browser, profile, 'set=moon&frames=6&settle=120');
  const rec = recorder(page);
  const failures = [];
  const check = (ok, what) => ok || failures.push(what);
  const truth = await page.evaluate(() => window.__truth);
  const kbd = mode === 'keyboard';
  const f = truth[0].features[0];
  // frame 1: a point on crater a, tagged
  if (kbd) {
    await toolKbd(page, 'point');
    await focusKbd(page, 'canvas.im-over');
    await aimKbd(page, f.x, f.y);
    await rec.act('place', 'commit', () => page.keyboard.press('Enter'));
    await rec.act('tag', 'commit', async () => {
      await focusKbd(page, `${DOM.read('m1')} input[aria-label$="Tag"]`);
      await page.keyboard.type('a');
      await page.keyboard.press('Enter');
    });
    await selectKbd(page, 'm1');
  } else {
    await tap(page, 'button[data-tool="point"]');
    await tapImage(page, f.x, f.y);
    await padTo(page, f.x, f.y);
    await rec.act('place', 'commit', () =>
      tap(page, 'button[data-act="place"]')
    );
    await tap(page, `${DOM.read('m1')} th button`);
    await rec.act('tag', 'commit', () =>
      page.locator('.im-pad label select').first().selectOption('a')
    );
  }
  const go = async act =>
    kbd ? actionKbd(page, act) : tap(page, `button[data-act="${act}"]`);
  await rec.act('copy forward', 'commit', () => go('copy'));
  const afterCopy = await state(page);
  check(
    afterCopy.marks.length === 2 &&
      afterCopy.marks[1].frame === 1 &&
      afterCopy.marks[1].tag === 'a',
    'the copy is not on frame 2 with its tag'
  );
  const frame1Before = JSON.stringify(afterCopy.marks[0]);
  await rec.act('next frame', 'commit', () => go('next'));
  const status = await page.evaluate(
    () => document.querySelector('.im-status').textContent
  );
  check(/Frame 2 of 6, 1 marks/.test(status), `frame 2 status: ${status}`);
  // tracked feature: nudge the copy to the crater's place in frame 2 (selected through the table)
  const f2 = truth[1].features[0];
  if (kbd) {
    await selectKbd(page, 'm2');
    await rec.act('move copy', 'run', () => aimKbd(page, f2.x, f2.y));
  } else {
    await tap(page, `${DOM.read('m2')} th button`);
    await rec.act('move copy', 'run', () => padTo(page, f2.x, f2.y));
  }
  const m2 = (await state(page)).marks[1];
  check(
    Math.hypot(m2.pts[0][0] - f2.x, m2.pts[0][1] - f2.y) <= 1.0,
    'the copy was not moved onto the feature'
  );
  check(
    JSON.stringify((await state(page)).marks[0]) === frame1Before,
    'the previous frame changed'
  );
  await rec.act('next', 'commit', () => go('next'));
  const status3 = await page.evaluate(
    () => document.querySelector('.im-status').textContent
  );
  check(
    /not yet marked here: a/.test(status3),
    `a tag with no mark here was not reported (${status3})`
  );
  await rec.act('previous', 'commit', () => go('prev'));
  await rec.act('previous again', 'commit', () => go('prev'));
  const back = (await state(page)).marks[0];
  check(JSON.stringify(back) === frame1Before, 'frame 1 was not kept');
  const v = rec.verdict();
  await page.context().close();
  return { failures, announce: v };
}

// ---- precision by each path ----------------------------------------------------------------

async function pathPrecision(browser, mode) {
  const kbd = mode === 'keyboard';
  const profile = kbd ? DESKTOP : MOBILE;
  const points = [];
  const circles = [];
  const refusals = [];
  {
    const { page } = await open(browser, profile, 'set=points&n=300&settle=40');
    const truth = await page.evaluate(() => window.__truth);
    const picks = truth.filter((_, i) => i % 25 === 3).slice(0, 12);
    if (kbd) {
      await toolKbd(page, 'point');
      await focusKbd(page, 'canvas.im-over');
    } else await tap(page, 'button[data-tool="point"]');
    for (const s of picks) {
      if (kbd) {
        await focusKbd(page, 'canvas.im-over');
        await page.keyboard.press('Escape');
        await aimKbd(page, s.x, s.y, 1.0);
        await page.keyboard.press('Enter');
      } else {
        await tapImage(page, s.x, s.y);
        await padTo(page, s.x, s.y, 1.0);
        await tap(page, 'button[data-act="place"]');
      }
      const st = await state(page);
      const id = st.marks.at(-1).id;
      const placedError = Math.hypot(
        st.marks.at(-1).pts[0][0] - s.x,
        st.marks.at(-1).pts[0][1] - s.y
      );
      if (kbd) {
        await selectKbd(page, id);
        await actionKbd(page, 'refine');
      } else {
        await tap(page, `${DOM.read(id)} th button`);
        await tap(page, 'button[data-act="refine"]');
      }
      await page.waitForFunction(() => !window.__im.ui.waiting);
      const m = (await state(page)).marks.find(k => k.id === id);
      if (!m.refined) refusals.push(`point ${id}`);
      points.push({
        placedError: round(placedError),
        error: m.refined
          ? round(Math.hypot(m.pts[0][0] - s.x, m.pts[0][1] - s.y))
          : Infinity,
      });
    }
    await page.context().close();
  }
  for (let i = 0; i < 6; i++) {
    const { page } = await open(
      browser,
      profile,
      `set=disc&seed=${1000 + 7 * i}&bright=${i < 4 ? 1 : 0}&settle=40`
    );
    const t = await page.evaluate(() => window.__truth);
    const limb = { x: t.x + t.r, y: t.y };
    if (kbd) {
      await toolKbd(page, 'circle');
      await focusKbd(page, 'canvas.im-over');
      await aimKbd(page, t.x, t.y, 1.0);
      await page.keyboard.press('Enter');
      await aimKbd(page, limb.x, limb.y, 1.0);
      await page.keyboard.press('Enter');
    } else {
      await tap(page, 'button[data-tool="circle"]');
      for (const p of [{ x: t.x, y: t.y }, limb]) {
        await tapImage(page, p.x, p.y);
        await padTo(page, p.x, p.y, 1.0);
        await tap(page, 'button[data-act="place"]');
      }
    }
    const id = (await state(page)).marks.at(-1).id;
    if (kbd) {
      await selectKbd(page, id);
      await actionKbd(page, 'refine');
    } else {
      await tap(page, `${DOM.read(id)} th button`);
      await tap(page, 'button[data-act="refine"]');
    }
    await page.waitForFunction(() => !window.__im.ui.waiting);
    const m = (await state(page)).marks.find(k => k.id === id);
    const r = Math.hypot(m.pts[1][0] - m.pts[0][0], m.pts[1][1] - m.pts[0][1]);
    if (!m.refined) refusals.push(`circle ${id} (${t.r.toFixed(1)} px)`);
    circles.push({
      radius: round(t.r),
      relError: m.refined ? round(Math.abs(r - t.r) / t.r) : Infinity,
    });
    await page.context().close();
  }
  const worstPoint = Math.max(...points.map(p => p.error));
  const worstCircle = Math.max(...circles.map(c => c.relError));
  return {
    status:
      worstPoint <= P.pathPoint &&
      worstCircle <= P.pathCircle &&
      refusals.length === 0
        ? 'pass'
        : 'fail',
    bound: { point: P.pathPoint, circle: P.pathCircle },
    trials: { points: points.length, circles: circles.length },
    worstPointPx: round(worstPoint),
    worstCircleRel: round(worstCircle),
    placedErrorPx: { max: round(Math.max(...points.map(p => p.placedError))) },
    refusals,
    points,
    circles,
  };
}

// ---- the throttled profile -------------------------------------------------------------------

/** In-page timing of a synchronous action, then the second frame after it. */
function timed(page, name, reps) {
  return page.evaluate(
    async ({ name, reps }) => {
      const out = [];
      const frame = () =>
        new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
      for (let i = 0; i < reps; i++) {
        await window.__t.setup[name](i);
        await frame();
        const t0 = performance.now();
        window.__t.action[name](i);
        const handler = performance.now() - t0;
        await frame();
        out.push({ handler, paint: performance.now() - t0 });
        await window.__t.cleanup[name]?.(i);
        await frame();
      }
      return out;
    },
    { name, reps }
  );
}

async function interactionBudget(browser) {
  const { page, context } = await open(
    browser,
    MOBILE,
    'set=moon&frames=6&settle=60'
  );
  await page.evaluate(() => {
    window.__seed(0, 50);
    const im = window.__im;
    const over = document.querySelector('canvas.im-over');
    const key = (k, extra = {}) =>
      over.dispatchEvent(
        new KeyboardEvent('keydown', { key: k, bubbles: true, ...extra })
      );
    const click = sel => document.querySelector(sel).click();
    const first = () =>
      im.state().marks.find(m => m.kind === 'point' && m.frame === 0).id;
    window.__t = {
      setup: {
        key: () => {
          im.select(first(), 0, true);
        },
        place: () => {
          im.setTool('point');
          im.setAim(333.5, 444.5);
        },
        edit: () => {
          im.select(first(), 0, false);
        },
        del: () => {
          im.select(
            im
              .state()
              .marks.filter(m => m.frame === 0)
              .at(-1).id,
            0,
            false
          );
        },
        undo: () => {
          im.select(first(), 0, true);
          key('ArrowRight');
          im.store.seal();
        },
      },
      action: {
        key: () => key('ArrowRight'),
        place: () =>
          over.dispatchEvent(
            new PointerEvent('pointerup', {
              clientX: over.getBoundingClientRect().left + 120,
              clientY: over.getBoundingClientRect().top + 100,
              pointerType: 'mouse',
              bubbles: true,
            })
          ),
        edit: () => {
          const i = document.querySelector(
            `tr[data-id="${first()}"] input[data-axis="0"]`
          );
          i.value = String(Number(i.value) + 2);
          i.dispatchEvent(new Event('change', { bubbles: true }));
        },
        del: () => click('button[data-act="delete"]'),
        undo: () => click('button[data-act="undo"]'),
      },
      cleanup: {
        key: () => im.store.seal(),
        place: () => {
          im.doUndo();
        },
        edit: () => {
          im.doUndo();
        },
        del: () => {
          im.doUndo();
        },
        undo: () => {
          im.doRedo();
        },
      },
    };
  });
  const cdp = await context.newCDPSession(page);
  const loadBefore = loadavg()[0];
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: I.cpuThrottle });
  const results = {};
  const names = {
    key: 'keyMs',
    place: 'placeMs',
    edit: 'changeMs',
    del: 'changeMs',
    undo: 'undoMs',
  };
  for (const [name, budget] of Object.entries(names)) {
    const cold = await timed(page, name, 3);
    const runs = await timed(page, name, I.repeats);
    const h = runs.map(r => r.handler);
    const p = runs.map(r => r.paint);
    results[name] = {
      budgetMs: I[budget],
      handlerP95: round(percentile(h, 0.95)),
      handlerMedian: round(percentile(h, 0.5)),
      handlerMax: round(Math.max(...h)),
      paintP95: round(percentile(p, 0.95)),
      paintBudgetMs: I.paintMs,
      coldFirstMs: round(cold[0].handler),
      pass:
        percentile(h, 0.95) <= I[budget] && percentile(p, 0.95) <= I.paintMs,
    };
  }
  const frameRuns = [];
  for (let i = 0; i < I.repeats; i++) {
    const r = await page.evaluate(async () => {
      const im = window.__im;
      im.goto(0);
      await new Promise(r =>
        requestAnimationFrame(() => requestAnimationFrame(r))
      );
      const t0 = performance.now();
      im.goto(1);
      const handler = performance.now() - t0;
      await new Promise(r =>
        requestAnimationFrame(() => requestAnimationFrame(r))
      );
      return { handler, paint: performance.now() - t0 };
    });
    frameRuns.push(r);
  }
  const loadAfter = loadavg()[0];
  const fh = frameRuns.map(r => r.handler);
  const sequence = {
    budgetMs: I.frameMs,
    handlerP95: round(percentile(fh, 0.95)),
    handlerMedian: round(percentile(fh, 0.5)),
    handlerMax: round(Math.max(...fh)),
    paintP95: round(
      percentile(
        frameRuns.map(r => r.paint),
        0.95
      )
    ),
    // The committed text: opening the next frame at most 500 ms (the handler's
    // work, as the Observatory's openMs is); the paint is reported beside it.
    pass: percentile(fh, 0.95) <= I.frameMs,
  };
  const marks = await page.evaluate(() => window.__im.state().marks.length);
  await context.close();
  return {
    throttle: I.cpuThrottle,
    viewport: I.viewport,
    frame: I.frameSide,
    marks,
    repeats: I.repeats,
    loadBefore: round(loadBefore, 3),
    loadAfter: round(loadAfter, 3),
    valid: loadBefore <= 6 && loadAfter <= 6,
    interactions: results,
    sequence,
  };
}

// ---- the 2,048-pixel frame --------------------------------------------------------------------

async function largeFrame(browser) {
  const { page, context } = await open(
    browser,
    MOBILE,
    'set=disc&seed=1&settle=60'
  );
  const cdp = await context.newCDPSession(page);
  await cdp.send('Performance.enable');
  /** Heap and ArrayBuffer backing stores, as tools/decoded-memory-probe.mjs holds it. */
  const heap = async () => {
    const u = await cdp.send('Runtime.getHeapUsage');
    return u.usedSize + (u.backingStorageSize || 0);
  };
  // The frame and the file's bytes are made before the throttle: setup is not timed.
  await page.evaluate(async () => {
    const { largeFrame } = window.__lib;
    const f = largeFrame({ size: 2048 });
    const bytes = new Uint8Array(f.width * f.height * 2);
    const dv = new DataView(bytes.buffer);
    for (let i = 0; i < f.data.length; i++)
      dv.setUint16(
        2 * i,
        Math.max(0, Math.min(65535, Math.round(f.data[i] * 20))),
        true
      );
    window.__file = { bytes, width: f.width, height: f.height };
    window.__worker = new Worker(new URL('./decodeWorker.js', location.href), {
      type: 'module',
    });
  });
  await cdp.send('HeapProfiler.collectGarbage');
  const base = await heap();
  const workerMs = [];
  let plane;
  for (let i = 0; i < 5; i++) {
    const r = await page.evaluate(
      () =>
        new Promise(resolve => {
          const { bytes, width, height } = window.__file;
          window.__worker.onmessage = e => {
            window.__plane = e.data.plane;
            resolve({ ms: e.data.ms, bytes: e.data.plane.byteLength });
          };
          window.__worker.postMessage({ bytes: bytes.slice(), width, height });
        })
    );
    workerMs.push(r.ms);
    plane = r;
  }
  await cdp.send('HeapProfiler.collectGarbage');
  const afterDecode = await heap();
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: I.cpuThrottle });
  const loadBefore = loadavg()[0];
  const sampling = { stop: false };
  const sampler = (async () => {
    let peak = 0;
    for (let i = 0; i < 400 && !sampling.stop; i++) {
      try {
        peak = Math.max(peak, await heap());
      } catch {
        break;
      }
    }
    return peak;
  })();
  const draw = await page.evaluate(() => {
    const im = window.__im;
    im.frames[0] = {
      id: 'large',
      width: 2048,
      height: 2048,
      data: window.__plane ? new Float64Array(window.__plane) : null,
    };
    const t0 = performance.now();
    im.drawFrame();
    return {
      ms: performance.now() - t0,
      factor: window.__lib.displayPlan(2048, 2048),
    };
  });
  sampling.stop = true;
  const peak = await sampler;
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  const loadAfter = loadavg()[0];
  const { decodedBytes, LIMITS } = await import('../../js/dataKinds/limits.js');
  const counted =
    decodedBytes(2048, 2048, { data: true }) + draw.factor.rgbaBytes;
  await context.close();
  const worstWorker = Math.max(...workerMs);
  const total = I.cpuThrottle * percentile(workerMs, 0.5) + draw.ms;
  return {
    workerDecodeMs: {
      runs: workerMs.map(v => round(v)),
      median: round(percentile(workerMs, 0.5)),
      max: round(worstWorker),
    },
    drawMsThrottled: round(draw.ms),
    displayFactor: draw.factor.factor,
    totalMs: round(total),
    bound: THRESHOLDS.tier2048.totalMs,
    load: { before: round(loadBefore, 3), after: round(loadAfter, 3) },
    countedBytes: counted,
    planeBytes: plane.bytes,
    maxDecodedBytes: LIMITS.maxDecodedBytes,
    pageHeapDeltaBytes: {
      afterDecode: afterDecode - base,
      peakDuringDraw: peak - base,
    },
  };
}

export async function runBrowser({ only } = {}) {
  const { server, origin } = await serve(4417);
  globalThis.__origin = origin;
  const browser = await chromium.launch();
  const out = { chromium: browser.version() };
  try {
    const want = name => !only || only.includes(name);
    if (want('keyboard')) out.keyboard = await keyboardWalk(browser);
    if (want('pointer')) out.pointer = await pointerWalk(browser);
    if (want('sequence'))
      out.sequence = {
        keyboard: await sequenceWalk(browser, 'keyboard'),
        pointer: await sequenceWalk(browser, 'pointer'),
      };
    if (want('precision'))
      out.precision = {
        keyboard: await pathPrecision(browser, 'keyboard'),
        pointer: await pathPrecision(browser, 'pointer'),
      };
    if (want('interaction')) out.interaction = await interactionBudget(browser);
    if (want('large')) out.large = await largeFrame(browser);
  } finally {
    await browser.close();
    server.close();
  }
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const only = process.argv[2] ? process.argv[2].split(',') : undefined;
  console.log(JSON.stringify(await runBrowser({ only }), null, 1));
}
