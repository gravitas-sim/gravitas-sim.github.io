// =============================================================================
// My work on a phone (Prompt 284)
// -----------------------------------------------------------------------------
// The backup goes to the share sheet where the browser has one, a closed sheet
// makes no file, the file picker reads a backup, and the storage estimate is
// shown before an import (with a warning when there is too little room).
// Device profiles are Playwright's; the share sheet is a stub. A proxy: whether
// a real share sheet takes the file, or a real picker offers it, is UNKNOWN in
// tools/evidence-status.json (offline-phone-paths). Chromium only, by the
// project list in playwright.config.js (Firefox cannot emulate isMobile).
// Sources only: the page seeds progress through the lesson registry.
// =============================================================================

import { devices } from '@playwright/test';
import { test, expect } from './fixtures.js';

/* global navigator */

test.skip(
  process.env.GRAVITAS_E2E_TARGET === 'dist',
  'dist/ has no service worker'
);

const LESSON = 'keplers-laws';

const PHONES = {
  'Android (Pixel 7)': devices['Pixel 7'],
  'iOS (iPhone 14)': devices['iPhone 14'],
};

for (const [name, device] of Object.entries(PHONES)) {
  test.describe(`My work on ${name}`, () => {
    const { defaultBrowserType: _drop, ...profile } = device;
    void _drop;
    test.use({ ...profile, serviceWorkers: 'allow' });

    async function seed(page) {
      await page.goto('/model/', { waitUntil: 'domcontentloaded' });
      await page.evaluate(async lesson => {
        const reg = await import('/js/data/investigations/registry.js');
        const inv = await reg.loadInvestigation(lesson);
        const sid = inv.steps[Math.min(3, inv.steps.length - 1)].sid;
        localStorage.setItem(
          `gravitas_investigation_${lesson}`,
          JSON.stringify({
            schema: 2,
            lesson,
            stepSid: sid,
            visited: [sid],
            responses: {},
            attempts: {},
            startedAt: '2026-10-01T10:00:00.000Z',
          })
        );
        localStorage.setItem('gravitas_welcome_seen_v1', '1');
      }, LESSON);
    }
    async function open(page) {
      await page.goto('/my-work/', { waitUntil: 'domcontentloaded' });
      await expect(page.locator('html')).toHaveAttribute('data-ready', 'true', {
        timeout: 30_000,
      });
    }
    const stubShare = (page, behaviour) =>
      page.addInitScript(b => {
        window.__shared = [];
        Object.defineProperty(navigator, 'canShare', {
          value: d => Boolean(d?.files?.length),
          configurable: true,
        });
        Object.defineProperty(navigator, 'share', {
          value: async d => {
            if (b === 'close') {
              const e = new Error('closed');
              e.name = 'AbortError';
              throw e;
            }
            window.__shared.push({
              names: d.files.map(f => f.name),
              text: null,
              file: d.files[0],
            });
          },
          configurable: true,
        });
      }, behaviour);

    test('the backup goes to the share sheet, as a JSON file the app can read back', async ({
      page,
    }) => {
      await stubShare(page, 'accept');
      await seed(page);
      await open(page);
      await page.locator('#mwExport').tap();
      await expect(page.locator('#mwSummary')).toContainText(
        /backup file was made/i,
        { timeout: 15_000 }
      );
      const shared = await page.evaluate(async () => {
        const f = window.__shared[0]?.file;
        return f ? { name: f.name, type: f.type, text: await f.text() } : null;
      });
      expect(shared?.name).toMatch(/\.json$/);
      expect(shared?.type).toBe('application/json');
      expect(JSON.parse(shared.text).format).toBe('gravitas.student-data');
    });

    test('a closed share sheet makes no file, and is not counted as a backup', async ({
      page,
    }) => {
      await stubShare(page, 'close');
      await seed(page);
      await open(page);
      await page.locator('#mwExport').tap();
      await expect(page.locator('body')).toContainText(/No file was made/, {
        timeout: 15_000,
      });
      expect(
        await page.evaluate(() => localStorage.getItem('gravitas_last_export'))
      ).toBeNull();
    });

    test('the file picker takes a backup, and the estimate is shown before the import', async ({
      page,
    }, testInfo) => {
      // Make a backup file from a seeded page, then import it into an empty one.
      await seed(page);
      await open(page);
      const [download] = await Promise.all([
        page.waitForEvent('download'),
        page.locator('#mwExport').tap(),
      ]);
      const file = testInfo.outputPath('backup.json');
      await download.saveAs(file);
      await page.evaluate(() => localStorage.clear());
      await page.addInitScript(() => {
        localStorage.setItem('gravitas_welcome_seen_v1', '1');
      });
      await open(page);
      const [chooser] = await Promise.all([
        page.waitForEvent('filechooser'),
        page.locator('label[for="mwFile"]').tap(),
      ]);
      expect(chooser.isMultiple()).toBe(false);
      await chooser.setFiles(file);
      await expect(page.locator('#mwPreview')).toBeVisible();
      const room = page.locator('#mwRoom');
      await expect(room).toBeVisible();
      await expect(room).toContainText(/would store about \d/);
      await expect(room).toHaveAttribute('data-fits', 'true');
      await expect(page.locator('#mwApply')).toBeEnabled();
    });

    test('a browser with too little room is told so before the import', async ({
      page,
    }, testInfo) => {
      await seed(page);
      await open(page);
      const [download] = await Promise.all([
        page.waitForEvent('download'),
        page.locator('#mwExport').tap(),
      ]);
      const file = testInfo.outputPath('backup.json');
      await download.saveAs(file);
      await page.evaluate(() => localStorage.clear());
      await page.addInitScript(() => {
        localStorage.setItem('gravitas_welcome_seen_v1', '1');
        Object.defineProperty(navigator.storage, 'estimate', {
          value: async () => ({ quota: 5_000_000, usage: 4_900_000 }),
          configurable: true,
        });
      });
      await open(page);
      await page.locator('#mwFile').setInputFiles(file);
      const room = page.locator('#mwRoom');
      await expect(room).toContainText(/too little/);
      await expect(room).toHaveAttribute('data-fits', 'false');
    });
  });
}
