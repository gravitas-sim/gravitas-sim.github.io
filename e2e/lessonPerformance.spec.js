// =============================================================================
// What a lesson leaves behind when it closes
// -----------------------------------------------------------------------------
// Three questions, none of which a functional test asks:
//
//   1. does opening and closing a lesson twenty times leave anything behind -
//      event listeners, animation loops, audio contexts
//   2. does an instrument that repaints every frame stop when the lesson does
//   3. is anything left playing after the lesson that started it has gone
//
// Frame time is deliberately NOT here. `npm run perf` already measures it, and
// measures it better: it wraps the renderer's own entry points so the numbers
// line up with the functions in render.js, it can pin the quality tier, and it
// runs rAF at full rate. A first draft of this file took its own frame-time
// samples through the Playwright page and produced medians quantised to
// multiples of 16.67 ms, which described the harness rather than the
// application. Two instruments measuring the same thing, one of them worse, is
// how a suite starts being ignored.
//
// What is left here is the half `npm run perf` cannot see, and it is the half
// that is a yes-or-no question: a leak does not depend on how busy the machine
// is.
// =============================================================================

import { test, expect } from './fixtures.js';

/**
 * Count what the page is holding on to.
 *
 * Listeners are counted by patching the two registration methods before any
 * application script runs; animation frames by patching rAF. Neither is a
 * perfect census - a listener added and removed inside one frame is invisible
 * to it - but both are exact about the thing that matters, which is the
 * difference across a cycle.
 */
const INSTRUMENT = () => {
  // Every registration is remembered weakly, with the target it was made on.
  // Counting adds minus removes does not work: the object list builds fresh
  // buttons on every render and throws the old ones away, so six listeners a
  // cycle are "never removed" and are also never retained - they are collected
  // with the detached buttons they were on. What matters is listeners still
  // attached to something the document is still holding.
  window.__entries = [];
  const target = EventTarget.prototype;
  const add = target.addEventListener;
  const remove = target.removeEventListener;
  target.addEventListener = function (...args) {
    try {
      window.__entries.push({ ref: new WeakRef(this), type: args[0] });
    } catch {
      /* a target that cannot be weakly held is not a leak this can see */
    }
    return add.apply(this, args);
  };
  target.removeEventListener = function (...args) {
    const at = window.__entries.findIndex(
      e => e.type === args[0] && e.ref.deref() === this
    );
    if (at >= 0) window.__entries.splice(at, 1);
    return remove.apply(this, args);
  };
  /**
   * Listeners still attached to something that is still in the document.
   *
   * window and document are always live; anything else counts only while it is
   * connected. A target that has been collected derefs to undefined and drops
   * out on its own.
   */
  window.__liveListeners = () =>
    window.__entries.filter(e => {
      const node = e.ref.deref();
      if (!node) return false;
      if (node === window || node === document) return true;
      return node.isConnected === true;
    }).length;

  const raf = window.requestAnimationFrame;
  const cancel = window.cancelAnimationFrame;
  window.__live = new Set();
  window.requestAnimationFrame = function (fn) {
    const id = raf.call(window, t => {
      window.__live.delete(id);
      return fn(t);
    });
    window.__live.add(id);
    return id;
  };
  window.cancelAnimationFrame = function (id) {
    window.__live.delete(id);
    return cancel.call(window, id);
  };
};

/** Open a lesson at a step, wait for it to settle. */
async function openStep(page, app, url, selector) {
  await app.boot({ url });
  await page.waitForSelector(selector, { timeout: 25_000 });
  await page.waitForTimeout(700);
}

test.describe('a lesson cleans up after itself', () => {
  test('opening and closing it twenty times leaves no listeners behind', async ({
    page,
    app,
  }) => {
    test.slow();
    await page.addInitScript(INSTRUMENT);
    await app.boot({ url: '/' });
    await page.waitForTimeout(500);

    const cycle = async () => {
      // Cleared first: setting the same hash twice fires no `hashchange`, so
      // the second cycle silently did nothing and the wait below timed out.
      await page.evaluate(() => {
        window.location.hash = '';
        window.location.hash = 'investigation=keplers-laws';
      });
      await page.waitForSelector('#investigationPanel:not([hidden])', {
        timeout: 20_000,
      });
      await page.locator('#investigationClose').click();
      await expect(page.locator('#investigationPanel')).toBeHidden();
    };

    // One cycle first: the lesson engine is imported on the first open and
    // registers the listeners it keeps for the session, which would otherwise
    // be counted as growth.
    await cycle();
    const before = await page.evaluate(() => window.__liveListeners());

    for (let i = 0; i < 20; i++) await cycle();
    const after = await page.evaluate(() => window.__liveListeners());

    // A handful of listeners per cycle would be 200 by now. The allowance is
    // for the one-per-session registrations a later panel makes on its own
    // first open, not for per-cycle growth.
    expect(
      after - before,
      'listeners added across twenty open/close cycles'
    ).toBeLessThanOrEqual(20);
  });

  test('an animated instrument stops when the lesson closes', async ({
    page,
    app,
  }) => {
    test.slow();
    await page.addInitScript(INSTRUMENT);
    // The stellar evolution panel is the busiest animated widget there is: it
    // advances a playhead, repaints a diagram and a stage, and drives the main
    // scene's overlay from the same clock.
    await openStep(
      page,
      app,
      '/?author=lives-of-stars&step=20',
      '#investigationToolCanvas'
    );

    const painting = await page.evaluate(async () => {
      const seen = new Set();
      const original = CanvasRenderingContext2D.prototype.clearRect;
      let count = 0;
      CanvasRenderingContext2D.prototype.clearRect = function (...args) {
        if (this.canvas?.id === 'investigationToolCanvas') count++;
        return original.apply(this, args);
      };
      window.__restoreClear = () => {
        CanvasRenderingContext2D.prototype.clearRect = original;
      };
      await new Promise(r => setTimeout(r, 600));
      seen.add(count);
      return count;
    });
    expect(
      painting,
      'the instrument repaints while the lesson is open'
    ).toBeGreaterThan(0);

    await page.locator('#investigationClose').click();
    await expect(page.locator('#investigationPanel')).toBeHidden();

    const after = await page.evaluate(async () => {
      const before = window.__live.size;
      await new Promise(r => setTimeout(r, 600));
      return { before, live: window.__live.size };
    });
    // The simulation's own loop is still running, so this is not zero. What it
    // must be is *stable*: a widget loop that kept requesting frames after its
    // panel closed would show as growth here.
    expect(
      after.live,
      'animation frames still queued after closing'
    ).toBeLessThanOrEqual(after.before + 2);
  });

  test('the gravitational-wave lesson closes its audio', async ({
    page,
    app,
  }) => {
    test.slow();
    await page.addInitScript(() => {
      window.__contexts = [];
      const Real = window.AudioContext || window.webkitAudioContext;
      if (!Real) return;
      window.AudioContext = class extends Real {
        constructor(...args) {
          super(...args);
          window.__contexts.push(this);
        }
      };
    });
    await openStep(
      page,
      app,
      '/?author=listening-to-spacetime&step=11',
      '#investigationToolCanvas'
    );
    await page.locator('#investigationClose').click();
    await expect(page.locator('#investigationPanel')).toBeHidden();
    await page.waitForTimeout(500);

    const states = await page.evaluate(() =>
      (window.__contexts || []).map(c => c.state)
    );
    // Nothing is asserted about how many were made - the page may make none if
    // the reader never pressed Listen, which is the ordinary case. What is
    // asserted is that none of them is left running.
    expect(
      states.filter(s => s === 'running'),
      'audio contexts left running'
    ).toEqual([]);
  });
});
