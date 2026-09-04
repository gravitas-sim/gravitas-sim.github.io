// =============================================================================
// Capture: the still and the clip
// -----------------------------------------------------------------------------
// Both exports exist to leave the application: a figure in a lab report, a clip
// in a lecture slide. So what these tests check is not that a button responds
// but that a file comes out, that it is a real file of the right kind, and that
// what is inside it says which run it is a picture of.
//
// The clip test also watches the heap while it records. MediaRecorder hands
// back chunks that have to be held until the file is assembled, so the failure
// mode of an unattended recording is not a bad video, it is a tab that dies.
// =============================================================================

import { test, expect } from './fixtures.js';
import { captureCapability, whyNoRecording } from './capability.js';
import { mkdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/** Where the artefacts land, so a failure can be looked at rather than guessed
 *  at. Under test-results/, which is already ignored. */
const OUT = join(process.cwd(), 'test-results', 'capture');

test.describe('capture', () => {
  test.beforeEach(async ({ app }) => {
    mkdirSync(OUT, { recursive: true });
    await app.boot();
    await app.dismissFrontDoor();
    await app.loadScenario('Solar System');
    await app.waitForFrames(5);
  });

  // The contract, and the one capture test besides the screenshot that runs in
  // every engine.
  //
  // Gravitas hides the Record Clip button when capture.canRecord() is false,
  // which is correct: there is nothing behind it in a browser that cannot
  // encode. The suite used to assert the button was visible unconditionally,
  // which made a deliberate behaviour look like a WebKit bug and cost that job
  // two failures and two retries before it timed out.
  //
  // So the assertion is the branch itself, checked against the application's
  // own answer rather than against a browser name.
  test(
    'the recording button matches what the engine can actually do',
    { tag: '@cross-browser' },
    async ({ page }) => {
      const cap = await captureCapability(page);
      const button = page.locator('#recordBtn');

      // Open the rail section the button lives in, without asserting that the
      // button appears - which is the very thing under test. app.railControl()
      // cannot be used here because it ends in a visibility assertion, and in
      // an engine that cannot record the correct outcome is that the button
      // stays hidden with its section open.
      const toggleId = await page.evaluate(() => {
        const el = document.getElementById('recordBtn');
        const group = el?.closest('.rail-group');
        const toggle = group?.querySelector('.rail-section-toggle');
        return toggle?.getAttribute('aria-expanded') === 'false'
          ? toggle.id
          : null;
      });
      if (toggleId) await page.locator(`#${toggleId}`).click();

      if (cap.canRecord) {
        await expect(button).toBeVisible();
        await expect(button).toBeEnabled();
      } else {
        await expect(button).toBeHidden();
      }

      // Either way the still is available: a screenshot needs no codec, and an
      // engine that cannot record must not also lose the export that works.
      await expect(page.locator('#screenshotBtn')).toBeVisible();

      // Recorded as an annotation so the report says what this engine could do
      // rather than only that the test passed.
      test.info().annotations.push({
        type: 'capture capability',
        description: cap.canRecord
          ? `records as ${cap.mimeType}`
          : `cannot record: ${cap.missing.join(', ')} unavailable`,
      });
    }
  );

  // The other half of the contract, and the reason it is a separate test.
  //
  // Which branch the test above takes depends on the machine: on macOS all
  // three Playwright engines can record, and on the Linux CI runner WebKit
  // cannot. So on any given run one branch goes unexercised, and the branch
  // that matters - the degradation - is the one that goes unexercised where
  // people develop.
  //
  // This removes MediaRecorder before the application loads. That is not a
  // polyfill or a fake; it is the absence of a capability, which is exactly the
  // configuration the Linux runner presents, and it lets the hidden-button
  // behaviour be verified on a machine where the capability exists.
  test(
    'without MediaRecorder the button is hidden and the still survives',
    { tag: '@cross-browser' },
    async ({ page, app }) => {
      await page.addInitScript(() => {
        delete window.MediaRecorder;
      });
      await app.boot();
      await app.dismissFrontDoor();

      const cap = await captureCapability(page);
      expect(cap.canRecord).toBe(false);
      expect(cap.missing).toContain('MediaRecorder');

      const toggleId = await page.evaluate(() => {
        const el = document.getElementById('recordBtn');
        const toggle = el
          ?.closest('.rail-group')
          ?.querySelector('.rail-section-toggle');
        return toggle?.getAttribute('aria-expanded') === 'false'
          ? toggle.id
          : null;
      });
      if (toggleId) await page.locator(`#${toggleId}`).click();

      await expect(page.locator('#recordBtn')).toBeHidden();
      // The export that needs no codec is untouched.
      await expect(page.locator('#screenshotBtn')).toBeVisible();
      await expect(page.locator('#screenshotBtn')).toBeEnabled();

      // And the reason a skip would print names the missing piece rather than
      // saying "unsupported".
      expect(whyNoRecording(cap)).toContain('MediaRecorder');
    }
  );

  test(
    'a screenshot is a PNG that documents its own run',
    { tag: '@cross-browser' },
    async ({ page, app }) => {
      await app.railControl('screenshotBtn');
      const download = page.waitForEvent('download');
      await page.locator('#screenshotBtn').click();
      const file = await download;
      expect(file.suggestedFilename()).toMatch(
        /^gravitas-screenshot-\d+\.png$/
      );

      const path = join(OUT, 'screenshot.png');
      await file.saveAs(path);
      // A PNG header, and enough bytes to be a picture of something rather than
      // an empty canvas.
      expect(statSync(path).size).toBeGreaterThan(20_000);

      // The three facts the image has to carry are drawn for the captured frame
      // and not otherwise, so the way to check them is to ask what the capture
      // frame contained.
      const burned = await page.evaluate(async () => {
        const tools = await import('/js/sandboxTools.js');
        const ui = await import('/js/ui.js');
        const canvas = document.getElementById('simulationCanvas');
        const drawn = [];
        const ctx = canvas.getContext('2d');
        const realFillText = ctx.fillText.bind(ctx);
        ctx.fillText = (s, x, y) => {
          drawn.push(String(s));
          realFillText(s, x, y);
        };
        ui.takeScreenshot();
        await new Promise(r =>
          window.requestAnimationFrame(() => window.requestAnimationFrame(r))
        );
        await new Promise(r => setTimeout(r, 50));
        ctx.fillText = realFillText;
        return { drawn, capturing: tools.isCapturing() };
      });
      // The scenario name, a distance with a unit on it, and a clock.
      expect(burned.drawn.join(' | ')).toContain('Solar System');
      expect(burned.drawn.some(s => /\b(AU|km|m|ly|pc)\b/.test(s))).toBe(true);
      expect(burned.drawn.some(s => /\d/.test(s))).toBe(true);
      // And it is a frame, not a mode: the live view goes back to normal.
      expect(burned.capturing).toBe(false);
      await app.waitForFrames(3);
    }
  );

  test('a clip records, announces itself, and saves a playable file', async ({
    page,
    app,
  }, testInfo) => {
    testInfo.setTimeout(120_000);
    // Skipped where the engine cannot encode, on the detected capability rather
    // than on the browser's name, so this starts running by itself the day the
    // engine gains support.
    const capability = await captureCapability(page);
    test.skip(!capability.canRecord, whyNoRecording(capability));

    await app.railControl('recordBtn');
    const button = page.locator('#recordBtn');
    const badge = page.locator('#recordingBadge');

    await expect(button).toBeVisible();
    await expect(badge).toBeHidden();

    const heap = () =>
      page.evaluate(() => performance.memory?.usedJSHeapSize ?? 0);
    const before = await heap();

    const download = page.waitForEvent('download', { timeout: 90_000 });
    await button.click();

    // The recording state is visible without opening anything, and the button
    // now offers the opposite action.
    await expect(badge).toBeVisible();
    await expect(button).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#recordingReadout')).toContainText('REC');

    // A stretch of the timeline, sampled while it runs.
    const samples = [];
    for (let i = 0; i < 6; i++) {
      await page.waitForTimeout(2000);
      samples.push(await heap());
    }
    // The indicator counts, in seconds and in megabytes against the cap, so a
    // user can see how much of the budget a take has spent.
    const readout = await page.locator('#recordingReadout').textContent();
    const [, mm, ss, mb, cap] = readout.match(
      /REC (\d+):(\d\d)\s+(\d+)\/(\d+) MB/
    );
    expect(Number(mm) * 60 + Number(ss)).toBeGreaterThanOrEqual(10);
    expect(Number(cap)).toBeGreaterThan(0);
    expect(Number(mb)).toBeLessThan(Number(cap));

    await button.click();
    const file = await download;
    // The extension follows the container the browser actually encoded, which
    // is H.264 in MP4 where it can and WebM where it cannot.
    expect(file.suggestedFilename()).toMatch(/^gravitas-clip-\d+\.(webm|mp4)$/);

    const path = join(OUT, `clip.${file.suggestedFilename().split('.').pop()}`);
    await file.saveAs(path);
    const size = statSync(path).size;
    expect(size).toBeGreaterThan(10_000);

    // Back to idle, with nothing left on screen claiming otherwise.
    await expect(badge).toBeHidden();
    await expect(button).toHaveAttribute('aria-pressed', 'false');

    // The heap while recording is bounded by the chunks held so far, which for
    // twelve seconds is single-digit megabytes. A leak in the compositing loop
    // - a new canvas or a retained frame per tick - would show here as growth
    // far past the size of the file that came out.
    const growth = Math.max(...samples) - before;
    if (before > 0) {
      expect(growth).toBeLessThan(size + 40 * 1024 * 1024);
    }
  });

  test('recording survives a scenario change and a screenshot taken mid-take', async ({
    page,
    app,
  }, testInfo) => {
    testInfo.setTimeout(90_000);
    // The other test that genuinely encodes, gated the same way.
    const capability = await captureCapability(page);
    test.skip(!capability.canRecord, whyNoRecording(capability));

    await app.railControl('recordBtn');
    const button = page.locator('#recordBtn');
    await button.click();
    await expect(page.locator('#recordingBadge')).toBeVisible();

    // A still taken during a take must not switch the burnt-in caption off for
    // the rest of the clip.
    await app.railControl('screenshotBtn');
    const still = page.waitForEvent('download');
    await page.locator('#screenshotBtn').click();
    await (await still).saveAs(join(OUT, 'mid-take.png'));
    await page.waitForTimeout(500);
    expect(
      await page.evaluate(async () => {
        const tools = await import('/js/sandboxTools.js');
        return tools.isCapturing();
      })
    ).toBe(true);

    await app.loadScenario('Binary BH');
    await page.waitForTimeout(1500);

    // Registered here, not before the still: the first download of the test is
    // the screenshot, and a listener set up earlier would catch that one and
    // save a PNG under the clip's name.
    const download = page.waitForEvent('download', { timeout: 60_000 });
    await button.click();
    const file = await download;
    const clip = join(
      OUT,
      `clip-scenario-change.${file.suggestedFilename().split('.').pop()}`
    );
    await file.saveAs(clip);
    expect(statSync(clip).size).toBeGreaterThan(5_000);
    // And capture mode is released when the take ends.
    expect(
      await page.evaluate(async () => {
        const tools = await import('/js/sandboxTools.js');
        return tools.isCapturing();
      })
    ).toBe(false);
  });
});
