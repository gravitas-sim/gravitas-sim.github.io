// =============================================================================
// Scenarios and experiments in My work, handed in with a report (Prompt 74)
// -----------------------------------------------------------------------------
// A student opens a scenario from a link (it carries the identity of the
// scenario it was made from), changes nothing but its name, saves it from the
// Sandbox's share dialog, finds it in My work, attaches it to an evidence entry,
// exports it, and hands in a report whose submission token the instructor's
// review page reads: the table shows the scenario it was made from and the
// build, and the link opens the same world. A system from the builder and an
// experiment saved by the runner are covered by tests/madeWork.test.js; this is
// the page, the dialog and the review page.
// Sources only: it imports modules from the dev server.
// =============================================================================

import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';

import { test, expect } from './fixtures.js';

const PACK = { id: 'tides-demo', version: '1.2.0' };

test.describe('scenarios made, in My work', () => {
  test('save from the share dialog, attach, export, hand in and reopen on the review page', async ({
    page,
    app,
  }, info) => {
    await app.boot();
    const fragment = await page.evaluate(async pack => {
      const share = await import('/js/shareState.js');
      return share.encodePayload({
        v: 2,
        s: 'None',
        seed: '7',
        x: { v: 1, pack },
      });
    }, PACK);
    await app.boot({ url: `/#${fragment}` });
    await app.waitForFrames(10);

    await app.railControl('shareBtn');
    await page.locator('#shareBtn').click();
    await page.locator('#shareMineName').fill('My tides copy');
    await page.locator('#shareMineBtn').click();
    await expect(page.locator('#gravitasToast')).toContainText(
      'Saved to My work'
    );

    // An evidence entry to attach it to, written by the notebook's own modules.
    await page.evaluate(async () => {
      const e = await import('/js/notebook/entry.js');
      const store = await import('/js/notebook/store.js');
      const entry = e.buildEntry({
        source: 'sandbox',
        title: 'Period of the planet',
        quantities: [
          e.quantity({
            label: 'Period',
            value: 3.5,
            unit: 'd',
            uncertainty: 0.1,
          }),
        ],
        provenance: e.provenanceOf({ scenario: 'None', seed: '7' }),
      });
      store.save([entry]);
    });

    await page.goto('/my-work/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('html')).toHaveAttribute('data-ready', 'true', {
      timeout: 30_000,
    });
    // The link the dialog showed: the world with its settings, and the identity.
    const link = await page.evaluate(() => {
      const [key] = Object.keys(localStorage).filter(k =>
        k.startsWith('gravitas_made_')
      );
      return JSON.parse(localStorage.getItem(key)).scenario.link;
    });
    const item = page.locator('#mwMade .mw-item', {
      hasText: 'My tides copy',
    });
    await expect(item).toBeVisible();
    await expect(item).toContainText('seed 7');
    await expect(item).toContainText(
      'made from scenario tides-demo version 1.2.0'
    );
    await expect(
      item.getByRole('link', { name: /Open in the Sandbox/ })
    ).toHaveAttribute('href', `/#${link}`);

    await item.locator('summary').click();
    await item.getByRole('checkbox', { name: /Period of the planet/ }).check();
    await expect(item.locator('summary')).toContainText('1 attached');

    // One item exports as a backup file that holds it.
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      item.getByRole('button', { name: /^Export/ }).click(),
    ]);
    const path = info.outputPath('made.json');
    await download.saveAs(path);
    const saved = JSON.parse(readFileSync(path, 'utf8'));
    expect(saved.format).toBe('gravitas.student-data');
    expect(saved.collections.made).toHaveLength(1);
    expect(saved.collections.made[0].value.attachedTo).toHaveLength(1);

    // The report: the token carries the attached world.
    const token = await page.evaluate(async () => {
      const ledger = await (
        await import('/js/notebook/ledgerReport.js')
      ).ledgerForReport();
      const st = await import('/js/submission/submissionToken.js');
      const { buildBackup } =
        await import('/js/investigations/progressBackup.js');
      const lesson = (await import('/js/data/investigations/keplers-laws.js'))
        .default;
      const encoded = await st.encodeSubmission(
        st.buildSubmission({
          backup: buildBackup({
            lesson,
            responses: {},
            attempts: {},
            visited: [],
            stepSid: lesson.steps[0].sid,
            startedAt: '2026-10-01T10:00:00.000Z',
            studentName: 'Ada',
          }),
          record: ledger.record,
          digest: ledger.digest,
        })
      );
      return encoded.token;
    });

    await page.goto('/instructors/submissions/', {
      waitUntil: 'domcontentloaded',
    });
    await page.locator('#picker').setInputFiles({
      name: 'ada.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from(token),
    });
    await expect(page.locator('#count')).toHaveText('1 submission');
    const table = page.locator('#evidence table', { hasText: 'My tides copy' });
    await expect(table).toContainText('tides-demo 1.2.0');
    await expect(table).toContainText('scenario');
    const open = table.getByRole('link', { name: 'Open in the Sandbox' });
    await expect(open).toHaveAttribute('href', `/#${link}`);
    const axe = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag22aa'])
      .analyze();
    expect(axe.violations).toEqual([]);

    // The link opens the same world: its seed, and the identity it carries.
    await open.click();
    await expect(page).toHaveURL(new RegExp(`#${link.slice(0, 12)}`));
  });

  test('My work is clean at phone width and in Spanish with something saved', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      localStorage.setItem('gravitas_locale', 'es');
      localStorage.setItem('gravitas_welcome_seen_v1', '1');
      localStorage.setItem(
        'gravitas_made_m1abc',
        JSON.stringify({
          format: 'gravitas.made',
          formatVersion: 1,
          id: 'm1abc',
          kind: 'scenario',
          from: 'builder',
          name: 'Dos cuerpos',
          savedAt: '2026-10-08T10:00:00.000Z',
          app: 'abc1234',
          attachedTo: [],
          scenario: {
            id: 'None',
            seed: '7',
            settings: {},
            bodies: 2,
            link: '2zAAAA',
            derivedFrom: null,
          },
        })
      );
    });
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto('/my-work/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('html')).toHaveAttribute('data-ready', 'true', {
      timeout: 30_000,
    });
    const item = page.locator('#mwMade .mw-item');
    await expect(item).toContainText('Dos cuerpos');
    await expect(item).toContainText('semilla 7');
    await expect(
      item.getByRole('link', { name: /Abrir en la simulación libre/ })
    ).toBeVisible();
    const fits = await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth
    );
    expect(fits).toBe(true);
    const axe = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag22aa'])
      .analyze();
    expect(axe.violations).toEqual([]);
  });
});
