// =============================================================================
// Work nobody is watching
// -----------------------------------------------------------------------------
// A reading step holds the clock, a hidden document steps and draws nothing and
// is credited no time on its return, and a canvas that panels cover redraws at
// the idle rate. Each is a yes-or-no question about the frame loop, so each is
// counted: simulated time read from the physics clock, draw calls counted on
// the simulation canvas. Real frame times are `npm run perf`'s business.
// =============================================================================

import { test, expect } from './fixtures.js';

/** The physics clock, in simulation time units. */
const clock = page =>
  page.evaluate(async () =>
    (await import('/js/physics.js')).getSimulationTime()
  );

/** Whether the world is paused. */
const paused = page =>
  page.evaluate(async () => (await import('/js/ui.js')).state.paused);

/** Count draw calls that land on the simulation canvas from now on. */
const countDraws = page =>
  page.evaluate(() => {
    window.__draws = 0;
    if (window.__countingDraws) return;
    window.__countingDraws = true;
    for (const k of ['clearRect', 'fillRect', 'drawImage', 'arc']) {
      const original = CanvasRenderingContext2D.prototype[k];
      CanvasRenderingContext2D.prototype[k] = function (...args) {
        if (this.canvas?.id === 'simulationCanvas') window.__draws++;
        return original.apply(this, args);
      };
    }
  });

const draws = page => page.evaluate(() => window.__draws);

/** Let n animation frames go by: a wait on the page's own clock, not a timer. */
const frames = (page, n) =>
  page.evaluate(
    count =>
      new Promise(done => {
        let seen = 0;
        const tick = () =>
          ++seen >= count ? done() : window.requestAnimationFrame(tick);
        window.requestAnimationFrame(tick);
      }),
    n
  );

async function openKepler(page, app) {
  await app.boot({ url: '/#investigation=keplers-laws' });
  await page.waitForSelector('#investigationNext', { timeout: 25_000 });
  await expect(page.locator('.inv-step-title')).not.toBeEmpty();
}

const stepText = page => page.locator('.inv-step-count').innerText();

/** Press Next, or Back, and wait for the step counter to change. */
const go = async (page, id) => {
  const before = await stepText(page);
  await page.locator(id).click();
  await expect.poll(() => stepText(page)).not.toBe(before);
};
const next = page => go(page, '#investigationNext');
const back = page => go(page, '#investigationPrev');

test.describe('a reading step holds the clock', () => {
  test('step 1 stays where it started, the scene runs again where the motion is the point', async ({
    page,
    app,
  }) => {
    test.slow();
    await openKepler(page, app);

    // Step 1 is a reading step: held, and the clock stays where it began.
    expect(await paused(page)).toBe(true);
    const start = await clock(page);
    await frames(page, 60);
    expect(await clock(page)).toBe(start);

    // Step 2 declares the motion is the point ("watch them for a moment").
    await next(page);
    expect(await paused(page)).toBe(false);
    await expect
      .poll(() => clock(page), { timeout: 8000 })
      .toBeGreaterThan(start);

    // A question step runs the scene as it always did.
    await next(page);
    expect(await paused(page)).toBe(false);

    // Back to a reading step without motion: held again.
    await back(page);
    await page.evaluate(
      () => (document.getElementById('srStatus').textContent = '')
    );
    await back(page);
    expect(await paused(page)).toBe(true);
    // A screen reader is told: the Play control's label alone is silent.
    await expect(page.locator('#srStatus')).toHaveText(/paused/i);
  });

  test('a reader who pauses on a question step keeps their pause', async ({
    page,
    app,
  }) => {
    test.slow();
    await openKepler(page, app);
    await next(page);
    await next(page);
    // Step 3 is a prediction: the reader pauses, then moves to the next
    // reading step and on to a step that runs: the pause is theirs, and stays.
    await page.evaluate(async () => {
      (await import('/js/ui.js')).state.paused = true;
    });
    await next(page);
    await next(page);
    expect(await paused(page)).toBe(true);
  });
});

test.describe('a reading step that needs the clock, and the transport', () => {
  const author = async (page, app, lesson, step) => {
    await app.boot({ url: `/?author=${lesson}&step=${step}` });
    await page.waitForSelector('#investigationNext', { timeout: 25_000 });
    await expect(page.locator('.inv-step-title')).not.toBeEmpty();
  };

  test('the dip step, which waits on a transit watch, runs; so does the barycenter step', async ({
    page,
    app,
  }) => {
    test.slow();
    await author(page, app, 'transit-photometry', 11);
    expect(await paused(page)).toBe(false);
    const a = await clock(page);
    await expect.poll(() => clock(page), { timeout: 8000 }).toBeGreaterThan(a);
    await author(page, app, 'weighing-stars', 6);
    expect(await paused(page)).toBe(false);
    const b = await clock(page);
    await expect.poll(() => clock(page), { timeout: 8000 }).toBeGreaterThan(b);
  });

  test('a reader who plays and then pauses a held step keeps the pause on the next one', async ({
    page,
    app,
  }) => {
    test.slow();
    await openKepler(page, app);
    expect(await paused(page)).toBe(true);
    await page.locator('#timelinePlay').click();
    expect(await paused(page)).toBe(false);
    await page.locator('#timelinePlay').click();
    expect(await paused(page)).toBe(true);
    await next(page); // a step that runs: the pause is the reader's
    expect(await paused(page)).toBe(true);
  });

  test('history opened on a held step does not leave the next step paused on return', async ({
    page,
    app,
  }) => {
    test.slow();
    await openKepler(page, app);
    expect(await paused(page)).toBe(true);
    await page.evaluate(async () => {
      const tl = await import('/js/timeline.js');
      tl.recordFrame();
      tl.recordFrame();
      tl.scrubTo(1);
    });
    await next(page); // meant to run
    expect(await paused(page)).toBe(false);
    await page.evaluate(async () =>
      (await import('/js/timeline.js')).returnToLive()
    );
    expect(await paused(page)).toBe(false);
    const a = await clock(page);
    await expect.poll(() => clock(page), { timeout: 8000 }).toBeGreaterThan(a);
  });
});

test.describe('a hidden document', () => {
  test('steps nothing, draws nothing and is credited no time on its return', async ({
    page,
    app,
  }) => {
    test.slow();
    await openKepler(page, app);
    await next(page); // a step that runs
    await countDraws(page);
    await frames(page, 30);

    // The rate before: simulated time per real second while visible.
    const a = await clock(page);
    await frames(page, 60);
    const rate = (await clock(page)) - a;
    expect(rate).toBeGreaterThan(0);

    // Hide the document the way a browser reports it, and watch.
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', {
        configurable: true,
        get: () => true,
      });
      Object.defineProperty(document, 'visibilityState', {
        configurable: true,
        get: () => 'hidden',
      });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await frames(page, 3);
    const before = await clock(page);
    await page.evaluate(() => (window.__draws = 0));
    await frames(page, 120);
    expect(await clock(page), 'simulated time while hidden').toBe(before);
    expect(await draws(page), 'draw calls while hidden').toBe(0);

    // The return: no catch-up. A second back is worth about a second of the
    // rate it ran at, not the two it was away.
    await page.evaluate(() => {
      delete document.hidden;
      delete document.visibilityState;
      document.dispatchEvent(new Event('visibilitychange'));
    });
    const back = await clock(page);
    await frames(page, 60);
    const gained = (await clock(page)) - back;
    expect(gained).toBeGreaterThan(0);
    expect(gained, 'time credited after the return').toBeLessThan(rate * 1.6);
  });
});

test.describe('a covered canvas', () => {
  test('redraws at the idle rate and returns to full rate when uncovered', async ({
    page,
    app,
  }) => {
    test.slow();
    await openKepler(page, app);
    await next(page); // running, so the paused idle rate is not what is measured
    await countDraws(page);
    await frames(page, 30);

    await page.evaluate(() => (window.__draws = 0));
    await frames(page, 60);
    const open = await draws(page);

    await page.evaluate(() => {
      const cover = document.createElement('div');
      cover.id = 'testCover';
      cover.style.cssText =
        'position:fixed;inset:0;z-index:2147483000;background:#000';
      document.body.append(cover);
    });
    await frames(page, 45);
    await page.evaluate(() => (window.__draws = 0));
    await frames(page, 60);
    const covered = await draws(page);
    // The scene itself still runs: only the picture is redrawn less often.
    expect(await paused(page)).toBe(false);
    expect(covered, 'draw calls a second while covered').toBeLessThan(open / 2);

    await page.evaluate(() => document.getElementById('testCover').remove());
    await frames(page, 45);
    await page.evaluate(() => (window.__draws = 0));
    await frames(page, 60);
    expect(await draws(page)).toBeGreaterThan(open / 2);
  });
});
