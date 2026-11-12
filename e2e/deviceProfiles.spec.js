// =============================================================================
// Automated device profiles (Prompt 285)
// -----------------------------------------------------------------------------
// Three committed profiles (tools/perf-thresholds.json, "deviceProfiles") run
// one committed set of workflows in headless Chromium: the start of the
// application, a lesson step, an image measurement, a fit and a 3-D run. Each
// profile is a CPU throttle on the main thread, a heap ceiling on the page and
// a network shape; each workflow is held to a time-to-usable and an
// interaction budget from the same file.
//
// These are PROXIES, and the file and OFFLINE_AND_LOW_END.md say so. Chromium's
// CPU throttle slows the page's main thread and nothing else (a Worker, the
// compositor and the GPU run at the host's speed); the heap ceiling bounds
// JavaScript memory and not decoded images, canvases or GPU memory; the network
// shape is a rate and a delay, not a radio. No row is a device: the real-device
// profiles in the file stay empty and the claim stays UNKNOWN in
// tools/evidence-status.json.
//
// The time budgets are the measured value times 3, rounded up to 100 ms and never under 4 s, because a
// shared CI runner has its own load and a budget a runner can fail by being
// busy would be a report on the runner. A budget is never loosened to pass; it
// is only ever set from a measurement, and the measurement is rerun with
//   GRAVITAS_PROFILE_RECORD=/path/to/measured.json npx playwright test deviceProfiles
// =============================================================================

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { chromium } from '@playwright/test';
import { test, expect } from './fixtures.js';
import { frameObservation, asFile } from './mobileFrames.js';

const FILE = JSON.parse(readFileSync('tools/perf-thresholds.json', 'utf8'));
const DEVICE = FILE.deviceProfiles;
const DATA = JSON.parse(readFileSync('tools/data-budget.json', 'utf8'));
const RECORD = process.env.GRAVITAS_PROFILE_RECORD;
const measured = existsSync(RECORD ?? '/nonexistent')
  ? JSON.parse(readFileSync(RECORD, 'utf8'))
  : {};

const MB = 1024 * 1024;
const ceiling = key => DATA.ceilings.find(c => c.key === key).ceiling;

/** Slow the page down as a profile says; before the first navigation. */
async function throttle(page, profile) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: profile.cpu });
  if (profile.network) {
    await cdp.send('Network.enable');
    await cdp.send('Network.emulateNetworkConditions', {
      offline: false,
      latency: profile.network.latencyMs,
      downloadThroughput: (profile.network.downKbps * 1000) / 8,
      uploadThroughput: (profile.network.upKbps * 1000) / 8,
    });
  }
  return cdp;
}

/** Record or check one workflow's two times against its budgets. */
function judge(profileId, workflowId, times) {
  measured[profileId] ??= {};
  measured[profileId][workflowId] = times;
  if (RECORD) {
    writeFileSync(RECORD, `${JSON.stringify(measured, null, 2)}\n`);
    return;
  }
  const budget = DEVICE.budgets[profileId]?.[workflowId];
  expect(
    budget,
    `${profileId}/${workflowId} has a committed budget`
  ).toBeTruthy();
  expect(
    times.timeToUsableMs,
    `${profileId}/${workflowId} time to usable`
  ).toBeLessThanOrEqual(budget.timeToUsableMs);
  expect(
    times.interactionMs,
    `${profileId}/${workflowId} interaction`
  ).toBeLessThanOrEqual(budget.interactionMs);
}

const quality = profile =>
  profile.quality === 'auto' ? '' : `quality=${profile.quality}`;
const withQuery = (path, profile) => {
  const q = quality(profile);
  if (!q) return path;
  return path.includes('?') ? `${path}&${q}` : `${path}?${q}`;
};

/** How long the current workflow may take before its own wait gives up: its budget and a margin. */
const LIMIT = { usable: 120_000, interact: 120_000 };

const WELCOME = ['gravitas_welcome_seen_v1', '1'];
const seed = async page =>
  page.addInitScript(([k, v]) => {
    try {
      window.localStorage.setItem(k, v);
      window.localStorage.setItem('gravitas_locale', 'en');
    } catch {
      /* storage unavailable */
    }
  }, WELCOME);

/** The committed workflows. Each returns when it is usable, then does its interaction. */
const WORKFLOWS = {
  boot: {
    async usable(page, profile) {
      await page.goto(withQuery('/', profile), {
        waitUntil: 'domcontentloaded',
      });
      await page.waitForFunction(
        () =>
          window.splashScreenEnded === true &&
          document
            .querySelector('.ui-container')
            ?.classList.contains('showUI') === true,
        null,
        { timeout: LIMIT.usable }
      );
    },
    async interact(page) {
      const target = page.locator('#loadScenarioBtn');
      // On a phone the rail is behind the menu button.
      if (page.viewportSize().width < 600)
        await page.locator('#mobileMenuToggle').click();
      await target.click();
      await expect(page.locator('#scenarioListModal')).toBeVisible({
        timeout: LIMIT.interact,
      });
    },
  },
  lesson: {
    async usable(page, profile) {
      await page.goto(withQuery('/?author=tides&step=1', profile), {
        waitUntil: 'domcontentloaded',
      });
      await expect(page.locator('#investigationNext')).toBeVisible({
        timeout: LIMIT.usable,
      });
    },
    async interact(page) {
      const before = await page.locator('#investigationPanel').innerText();
      await page.locator('#investigationNext').click();
      await expect
        .poll(() => page.locator('#investigationPanel').innerText(), {
          timeout: LIMIT.interact,
        })
        .not.toBe(before);
    },
  },
  image: {
    async usable(page, profile) {
      await page.goto(withQuery('/observatory/', profile), {
        waitUntil: 'domcontentloaded',
      });
      await expect(page.locator('html')).toHaveAttribute('data-ready', 'true', {
        timeout: LIMIT.usable,
      });
      await page.locator('#obsFile').setInputFiles(asFile(frameObservation()));
      await expect(page.locator('#obsMarksPanel')).toBeVisible({
        timeout: LIMIT.usable,
      });
    },
    async interact(page) {
      await page.locator('#obsMarksPanel > summary').click();
      await page.locator('#obsMarksBody button[data-tool="point"]').click();
      const over = page.locator('#obsMarksBody .im-over');
      await over.scrollIntoViewIfNeeded();
      const box = await over.boundingBox();
      await page.mouse.click(box.x + box.width * 0.3, box.y + box.height * 0.3);
      await expect(page.locator('#obsMarksBody tbody tr')).toHaveCount(1, {
        timeout: LIMIT.interact,
      });
    },
  },
  fit: {
    async usable(page, profile) {
      await page.goto(withQuery('/observatory/', profile), {
        waitUntil: 'domcontentloaded',
      });
      await expect(page.locator('html')).toHaveAttribute('data-ready', 'true', {
        timeout: LIMIT.usable,
      });
      await page.locator('#obsFixture').selectOption('tess-light-curve');
      await page.locator('#obsOpen').click();
      await expect(page.locator('#obsTable tbody tr').first()).toBeVisible({
        timeout: LIMIT.usable,
      });
      await page.locator('#obsFitPanel summary').click();
      await expect(page.locator('#fitRun')).toBeVisible({
        timeout: LIMIT.usable,
      });
    },
    async interact(page) {
      await page.locator('#fitRun').click();
      await expect(page.locator('#fitStatus')).toContainText(/Fitted in/, {
        timeout: LIMIT.interact,
      });
    },
  },
  run3d: {
    async usable(page, profile) {
      await page.goto(withQuery('/lab3d/', profile), {
        waitUntil: 'domcontentloaded',
      });
      await expect(page.locator('html')).toHaveAttribute('data-ready', 'true', {
        timeout: LIMIT.usable,
      });
      await page.locator('#lb-problem').selectOption('R5');
    },
    async interact(page) {
      await page.locator('#lb-go').click();
      await expect(page.locator('#lb-status')).toHaveText(/^Finished/, {
        timeout: LIMIT.interact,
      });
    },
  },
};

/**
 * A browser of this profile's own. Chromium takes the heap ceiling as a launch
 * flag, so the profile cannot be a project option: each test launches its page
 * and closes it, which is also what keeps one profile's throttle off the next.
 */
async function inProfile(baseURL, profile, body) {
  const browser = await chromium.launch({
    args: [`--js-flags=--max-old-space-size=${profile.heapLimitMB}`],
  });
  try {
    const context = await browser.newContext({
      baseURL,
      viewport: { width: profile.width, height: profile.height },
      deviceScaleFactor: profile.dpr,
      ...(profile.touch ? { hasTouch: true, isMobile: true } : {}),
      serviceWorkers: 'block',
    });
    const page = await context.newPage();
    return await body(page);
  } finally {
    await browser.close();
  }
}

for (const [profileId, profile] of Object.entries(DEVICE.profiles)) {
  test.describe(`profile ${profileId}`, () => {
    test.setTimeout(300_000);

    for (const workflowId of DEVICE.workflows) {
      test(`${workflowId}`, async ({ baseURL }) => {
        const b = DEVICE.budgets[profileId]?.[workflowId];
        LIMIT.usable = (b?.timeToUsableMs ?? 120_000) + 30_000;
        LIMIT.interact = (b?.interactionMs ?? 120_000) + 30_000;
        test.setTimeout(LIMIT.usable + LIMIT.interact + 60_000);
        await inProfile(baseURL, profile, async page => {
          await seed(page);
          await throttle(page, profile);
          const w = WORKFLOWS[workflowId];
          const t0 = Date.now();
          await w.usable(page, profile);
          const timeToUsableMs = Date.now() - t0;
          const t1 = Date.now();
          await w.interact(page);
          const interactionMs = Date.now() - t1;
          judge(profileId, workflowId, { timeToUsableMs, interactionMs });
        });
      });
    }

    test('the classifier reaches a verdict on the heaviest scene', async ({
      baseURL,
    }) => {
      await inProfile(baseURL, profile, async page => {
        // The tier is not pinned: on 'auto' the sampler is the measurement.
        await seed(page);
        await throttle(page, profile);
        await page.goto('/', { waitUntil: 'domcontentloaded' });
        await page.waitForFunction(
          () =>
            window.splashScreenEnded === true &&
            document
              .querySelector('.ui-container')
              ?.classList.contains('showUI') === true,
          null,
          { timeout: 120_000 }
        );
        await page.evaluate(async () => {
          const ui = await import('/js/ui.js');
          ui.SETTINGS.preset_scenario = 'star-cluster';
          ui.initialize_simulation({ seed: 'profile' });
          ui.state.paused = false;
        });
        const report = await page.evaluate(async () => {
          const q = await import('/js/quality.js');
          const until = Date.now() + 60_000;
          while (Date.now() < until) {
            const r = q.qualityReport();
            if (r.decided && r.tier === 'low') return r;
            await new Promise(r => setTimeout(r, 500));
          }
          return q.qualityReport();
        });
        measured[profileId] ??= {};
        measured[profileId].classifier = {
          tier: report.tier,
          fps: report.fps,
          decided: report.decided,
        };
        if (RECORD) {
          writeFileSync(RECORD, `${JSON.stringify(measured, null, 2)}\n`);
          return;
        }
        expect(report.decided).toBe(true);
        expect(report.tier).toBe('low');
      });
    });

    test('the Observatory with its largest pack open holds to the memory budget', async ({
      baseURL,
    }) => {
      await inProfile(baseURL, profile, async page => {
        const cdp = await throttle(page, profile);
        await seed(page);
        await page.goto(withQuery('/observatory/', profile), {
          waitUntil: 'domcontentloaded',
        });
        await expect(page.locator('html')).toHaveAttribute(
          'data-ready',
          'true',
          { timeout: 120_000 }
        );
        const open = async id => {
          await page.locator('#obsFixture').selectOption(id);
          await page.locator('#obsOpen').click();
          await expect(page.locator('#obsTitle')).not.toBeEmpty({
            timeout: 120_000,
          });
        };
        // The largest table, then the largest picture, then something that is
        // not a picture: the image panel must let go of its planes.
        await open('ngc2420-photometry');
        await expect(page.locator('#obsTable tbody tr').first()).toBeVisible({
          timeout: 120_000,
        });
        await open('hirise-cerberus-fossae');
        await expect(page.locator('#obsMarksPanel')).toBeVisible({
          timeout: 120_000,
        });
        await page.locator('#obsMarksPanel > summary').click();
        await expect(page.locator('#obsMarksBody .im-over')).toBeVisible();
        await open('ngc2420-photometry');
        await expect
          .poll(
            () =>
              page.evaluate(
                () => document.querySelector('#obsMarksBody .im-over')?.width
              ),
            { message: 'the image panel releases its canvases off screen' }
          )
          .toBe(0);
        await cdp.send('Performance.enable');
        await cdp.send('HeapProfiler.enable');
        await cdp.send('HeapProfiler.collectGarbage');
        const { metrics } = await cdp.send('Performance.getMetrics');
        const heap = metrics.find(m => m.name === 'JSHeapUsedSize').value;
        const ledger = await page.evaluate(async () => {
          const m = await import('/js/observatory/imageImport.js');
          return m.ledgerSnapshot();
        });
        measured[profileId] ??= {};
        measured[profileId].memory = {
          heapMB: Math.round((heap / MB) * 10) / 10,
          ledgerBytes: ledger.bytes,
        };
        if (RECORD) {
          writeFileSync(RECORD, `${JSON.stringify(measured, null, 2)}\n`);
          return;
        }
        const budget = DEVICE.memory[profileId];
        expect(heap / MB).toBeLessThanOrEqual(budget.heapMB);
        // What the page holds in Workers is inside the data budget's two caps.
        expect(ledger.bytes).toBeLessThanOrEqual(
          ceiling('decodedImageBytesPerPage') + 33_647_040
        );
        expect(ledger.bytes).toBeLessThanOrEqual(
          profile.quality === 'low'
            ? ceiling('workerMemoryBytesLowEnd')
            : FILE.computation.tiers.full.workerMemoryBytes
        );
      });
    });
  });
}
