// =============================================================================
// What a page says to a screen reader, in the order it says it
// -----------------------------------------------------------------------------
// Prompt 143 Part B moves the status lines that each page wrote for itself onto
// the one helper, announce() in js/notify.js. A status line is a live region, so
// what it says and when is the feature: this records every change to a status
// region (role="status", aria-live, #srStatus), words and order, on a short
// scripted visit to each page, and holds it to what v3 said. The helper's one
// intended difference, a trailing no-break space when the same words are said
// again, is not words and is folded away here; tests/notify.test.js holds it.
//
// The sequences below were recorded on v3 (c83e2040), before the pages moved.
// =============================================================================

import { test, expect } from './fixtures.js';

/** Installed before the page's own scripts: every change to a live region. */
const RECORDER = () => {
  window.__announced = [];
  const last = new WeakMap();
  const isRegion = n =>
    n.nodeType === 1 &&
    (n.getAttribute('role') === 'status' ||
      n.hasAttribute('aria-live') ||
      n.id === 'srStatus');
  const seen = el => {
    const text = (el.textContent || '').replace(/\u00a0/g, ' ').trim();
    if (!text || last.get(el) === text) return;
    last.set(el, text);
    window.__announced.push(`${el.id}: ${text}`);
  };
  const watch = () =>
    new window.MutationObserver(records => {
      for (const r of records) {
        let n = r.target;
        while (n && !isRegion(n)) n = n.parentNode;
        if (n) seen(n);
      }
    }).observe(document.documentElement, {
      subtree: true,
      childList: true,
      characterData: true,
    });
  document.addEventListener('DOMContentLoaded', watch);
};

const announced = page => page.evaluate(() => window.__announced);

/** Two frames, so what a click set off synchronously has been drawn. */
const nextFrames = page =>
  page.evaluate(
    () =>
      new Promise(done =>
        window.requestAnimationFrame(() => window.requestAnimationFrame(done))
      )
  );

/** Click each control that is there, in order, and let the page answer. */
async function press(page, ids) {
  for (const id of ids) {
    const control = page.locator(`#${id}`);
    await expect(control).toBeVisible();
    await expect(control).toBeEnabled();
    await control.click();
    await nextFrames(page);
  }
}

test.describe('every status line says the same words in the same order', () => {
  test.beforeEach(async ({ page, context }) => {
    await context
      .grantPermissions(['clipboard-read', 'clipboard-write'])
      .catch(() => {});
    page.on('dialog', d => d.accept().catch(() => {}));
    await page.addInitScript(RECORDER);
  });

  test('the scenario studio', async ({ page }) => {
    await page.goto('/studio/', { waitUntil: 'domcontentloaded' });
    await press(page, ['st-new', 'st-from-go']);
    await expect
      .poll(() => announced(page))
      .toEqual([
        'st-status: A new scenario. It is saved in this browser as you go.',
        'st-status: Started from Supermassive Core.',
      ]);
  });

  test('the investigation composer', async ({ page }) => {
    await page.goto('/studio/lesson/', { waitUntil: 'domcontentloaded' });
    await press(page, ['cp-new', 'cp-publish']);
    await expect
      .poll(() => announced(page))
      .toEqual([
        'cp-status: A new investigation. It is saved in this browser as you go.',
        'cp-status: Fix the checks first: a link is made only from a valid investigation.',
      ]);
  });

  test('the course builder', async ({ page }) => {
    await page.goto('/studio/course/', { waitUntil: 'domcontentloaded' });
    await press(page, ['cb-new', 'cb-example', 'cb-save', 'cb-manifest']);
    await expect
      .poll(() => announced(page))
      .toEqual([
        'cb-status: The example course: introductory astronomy.',
        'cb-status: A new course.',
        'cb-status: The example course: introductory astronomy.',
        'cb-status: Saved as intro-astronomy.course.json.',
        'cb-status: The manifest is saved as intro-astronomy.course-manifest.json.',
      ]);
  });

  test('the mission lab', async ({ page }) => {
    await page.goto('/mission/', { waitUntil: 'domcontentloaded' });
    await press(page, [
      'mn-transfer-go',
      'mn-meet-go',
      'mn-lambert-go',
      'mn-planets-go',
      'mn-flyby-go',
    ]);
    await expect
      .poll(() => announced(page))
      .toEqual([
        'mn-transfer-status: Working…',
        'mn-transfer-status: Done.',
        'mn-meet-status: Working…',
        'mn-meet-status: Done.',
        'mn-lambert-status: Working…',
        'mn-lambert-status: Done.',
        'mn-planets-status: Working…',
        'mn-planets-status: Done.',
        'mn-flyby-status: Working…',
        'mn-flyby-status: Done.',
      ]);
  });

  test('my work', async ({ page }) => {
    await page.goto('/my-work/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#mwSummary')).not.toBeEmpty();
    await expect
      .poll(() => announced(page))
      .toEqual(['mwSummary: Nothing is saved on this device yet.']);
  });

  test('the teaching page', async ({ page }) => {
    await page.goto('/teaching/', { waitUntil: 'domcontentloaded' });
    await press(page, [
      'teachCopySequence',
      'teachFeedbackExport',
      'teachFeedbackClear',
    ]);
    await expect
      .poll(() => announced(page))
      .toEqual([
        'teachLive: Six links copied. Paste them into Lecture Mode.',
        'teachFeedbackStatus: Nothing to save yet. Write in any field above; notes stay in this browser until you save them.',
        'teachFeedbackStatus: Cleared.',
      ]);
  });

  test('the observatory', async ({ page }) => {
    await page.goto('/observatory/', { waitUntil: 'domcontentloaded' });
    await press(page, ['obsOpen']);
    await expect
      .poll(() => announced(page))
      .toEqual([
        'obsStatus: Opening…',
        'obsStatus: Opened HD 209458: TESS sector 56 light curve.',
      ]);
  });

  test('the figure builder', async ({ page }) => {
    await page.goto('/figure/', { waitUntil: 'domcontentloaded' });
    await press(page, ['fbCopyMarkup', 'fbCopyLink']);
    await expect.poll(() => announced(page)).toEqual(['fbCopyStatus: Copied.']);
  });

  test('the orbital system builder', async ({ page, app }) => {
    await app.boot();
    if (await page.evaluate(() => window.innerWidth <= 1024)) {
      await page.locator('#mobileMenuToggle').click();
    }
    await app.railControl('systemBuilderBtn');
    await page.locator('#systemBuilderBtn').click();
    await expect(page.locator('#systemBuilderDialog')).toBeVisible();
    await page.locator('#systemBuilderTemplate').selectOption('kepler16');
    await page.locator('#systemBuilderTemplateApply').click();
    await expect(page.locator('#systemBuilderTableBody tr')).not.toHaveCount(0);
    // The main app announces a good deal else, with timings of its own.
    await expect
      .poll(async () =>
        (await announced(page)).filter(m =>
          m.startsWith('systemBuilderStatus:')
        )
      )
      .toEqual([
        'systemBuilderStatus: Started from A planet around a binary star (Kepler-16).',
      ]);
  });
});
