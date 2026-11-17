// =============================================================================
// Shared-state links
// -----------------------------------------------------------------------------
// Workflow 14. A share link is how an instructor hands a class one identical
// system, so a break here is a break in an assignment that has already been
// distributed. The encoding is compressed and base64'd into a URL fragment, and
// there is no server involved, which means a change to the codec silently
// invalidates every link anyone has ever handed out.
//
// The test is a round trip through the interface: build a state, take the link
// from the share dialog, open it in a fresh load, and check the world that
// comes back is the world that went in. The link's contents are decoded in this
// process, with the codec of the tree, so the build is judged on what it wrote
// and what it reads. That the same seed builds the same world is in
// sharingDeterminism.spec.js (the bodies at generation are not on the page).
// =============================================================================

import { test, expect, readoutBodies } from './workflow.js';
import { decodePayload, payloadSeed } from '../js/shareState.js';

/**
 * Open the share dialog, choose a kind of link, read the link and close it.
 *
 * @returns {Promise<{url: string, fragment: string, seed: string}>}
 */
async function shareLink(page, app, kind) {
  await app.railControl('shareBtn');
  await page.locator('#shareBtn').click();
  await expect(page.locator('#shareModal')).toBeVisible();
  const choose = page.locator(
    kind === 'full' ? '#shareKindFull' : '#shareKindSeeded'
  );
  await choose.click();
  await expect(choose).toHaveAttribute('aria-checked', 'true');
  const field = page.locator('#shareUrl');
  await expect
    .poll(async () => (await field.inputValue()).length, { timeout: 15_000 })
    .toBeGreaterThan(20);
  const url = await field.inputValue();
  const seed = await page.locator('#shareSeed').inputValue();
  await page.locator('#shareCloseBtn').click();
  await expect(page.locator('#shareModal')).toBeHidden();
  return { url, fragment: url.slice(url.indexOf('#') + 1), seed };
}

/** The mass a full link carries, summed over its bodies. */
const massOf = payload =>
  (payload.b ?? []).reduce((sum, body) => sum + (body.mass ?? 0), 0);

test.describe('a shared link', () => {
  test(
    'round-trips a scenario through the URL',
    { tag: '@cross-browser' },
    async ({ page, app }) => {
      await app.boot();
      await app.loadScenario('trappist-1-system');
      await app.waitForFrames(20);

      // Stopped first: a running world loses a body to a merge a few steps
      // later, and the count the link carries is the count at capture.
      await app.setPaused(true);
      const count = await readoutBodies(page);
      expect(count).toBeGreaterThan(5);
      const sent = await shareLink(page, app, 'full');
      expect(sent.fragment.length).toBeGreaterThan(10);
      const sentPayload = await decodePayload(`#${sent.fragment}`);
      expect(sentPayload.b.length).toBeGreaterThan(5);

      // Open it as a fresh load of the link.
      await app.boot({ url: `/#${sent.fragment}` });
      await app.waitForBodies(count);
      const built = await app.bodySnapshot();
      expect(built.nonFinite).toBe(0);
      // The same system, not merely some system.
      expect(built.count).toBe(count);
      await expect(page.locator('#scenarioInfoTitle')).toContainText(
        /TRAPPIST/i
      );

      // And it runs, and carries the same mass when shared again.
      await app.advanceFrames(20);
      expect((await app.bodySnapshot()).nonFinite).toBe(0);
      await app.setPaused(true);
      const again = await shareLink(page, app, 'full');
      const againPayload = await decodePayload(`#${again.fragment}`);
      expect(againPayload.b.length).toBe(sentPayload.b.length);
      expect(massOf(againPayload) / massOf(sentPayload)).toBeCloseTo(1, 6);
    }
  );

  test('a seeded link carries its seed and scenario intact', async ({
    page,
    app,
  }) => {
    // The seeded kind is the small link: it stores a seed rather than every body,
    // so everything about it depends on the seed surviving the round trip.
    await app.boot();
    await app.loadScenario('star-cluster');
    await app.waitForFrames(10);

    const sent = await shareLink(page, app, 'seeded');
    const sentPayload = await decodePayload(`#${sent.fragment}`);
    expect(sentPayload.b).toBeUndefined();
    expect(sentPayload.s).toBeTruthy();
    // The point of the seeded kind is that it is short.
    expect(sent.fragment.length).toBeLessThan(2000);

    // Opened in a fresh load, the link builds the same scenario under the same
    // seed: the dialog on that page shows the seed it was given.
    await app.boot({ url: `/#${sent.fragment}` });
    await app.waitForBodies(2);
    const got = await shareLink(page, app, 'seeded');
    const gotPayload = await decodePayload(`#${got.fragment}`);
    expect(payloadSeed(gotPayload)).toEqual(payloadSeed(sentPayload));
    expect(gotPayload.s).toEqual(sentPayload.s);
    expect(got.seed).toBe(sent.seed);
  });

  test('the share dialog produces a usable link', async ({ page, app }) => {
    await app.boot();
    await app.loadScenario('binary-pair');
    await app.waitForFrames(10);

    await app.railControl('shareBtn');

    await page.locator('#shareBtn').click();
    await expect(page.locator('#shareModal')).toBeVisible();

    const field = page.locator('#shareUrl');
    await expect
      .poll(async () => (await field.inputValue()).length, { timeout: 15_000 })
      .toBeGreaterThan(20);

    const value = await field.inputValue();
    expect(value).toContain('#');
    // A link longer than a browser will carry is a link that does not work.
    expect(value.length).toBeLessThan(16_000);

    await page.locator('#shareCloseBtn').click();
    await expect(page.locator('#shareModal')).toBeHidden();
  });

  test('a corrupt link fails safely rather than breaking the app', async ({
    page,
    app,
  }) => {
    // Links get truncated by chat clients and email. The application has to end
    // up somewhere usable rather than half-built or blank.
    await app.boot({ url: '/#s=not-a-real-payload-at-all' });
    await app.waitForFrames(10);

    // Still running, still has a world, no NaNs.
    const snap = await app.bodySnapshot();
    expect(snap.nonFinite).toBe(0);

    // And the interface is still operable.
    await app.railControl('loadScenarioBtn');
    await page.locator('#loadScenarioBtn').click();
    await expect(page.locator('#scenarioListModal')).toBeVisible();
  });
});
