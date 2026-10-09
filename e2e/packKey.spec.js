// =============================================================================
// An answer key made in the browser from a pack (Prompt 79), in a browser
// -----------------------------------------------------------------------------
// tests/packKey.test.js holds the format. This is the path: the Composer's
// Publish card gives the author the key of the investigation in both languages
// as PDF downloads, and so does the course page that opens an investigation's
// link; nothing is sent anywhere.
// =============================================================================

import { readFileSync } from 'node:fs';
import { test, expect } from './fixtures.js';
import { remixBuiltin } from '../js/composer/remixApi.js';
import { packLink } from '../js/composer/packLink.js';
import { loadInvestigation } from '../js/data/investigations/registry.js';

const seen = page =>
  page.addInitScript(() => {
    try {
      window.localStorage.setItem('gravitas_welcome_seen_v1', '1');
    } catch {
      /* storage unavailable */
    }
  });

const pdfOf = async download => {
  const bytes = readFileSync(await download.path());
  expect(bytes.subarray(0, 5).toString('latin1')).toBe('%PDF-');
  return bytes.toString('latin1');
};

test('the Composer makes the key of a remix, English and Spanish', async ({
  page,
}) => {
  test.setTimeout(120_000);
  await seen(page);
  const requests = [];
  page.on('request', r => requests.push(r.url()));
  await page.goto('/studio/lesson/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('body')).toHaveAttribute('data-ready', 'true', {
    timeout: 30_000,
  });
  await page.selectOption('#cp-remix-from', 'orbital-energy');
  await page.click('#cp-remix');
  await expect(page.locator('#cp-checks-summary')).toHaveText(/valid|válida/, {
    timeout: 30_000,
  });
  // The module is not fetched until a key is asked for.
  expect(requests.filter(u => /packKey|answerKeyDocument/.test(u))).toEqual([]);

  const [en] = await Promise.all([
    page.waitForEvent('download', { timeout: 60_000 }),
    page.click('#cp-pdf-key'),
  ]);
  expect(en.suggestedFilename()).toMatch(/-key-en\.pdf$/);
  await pdfOf(en);
  const [es] = await Promise.all([
    page.waitForEvent('download', { timeout: 60_000 }),
    page.click('#cp-pdf-key-es'),
  ]);
  expect(es.suggestedFilename()).toMatch(/-key-es\.pdf$/);
  await pdfOf(es);
});

test('the course page makes the key of an investigation link', async ({
  page,
}) => {
  test.setTimeout(120_000);
  await seen(page);
  await loadInvestigation('tides', 'en');
  await loadInvestigation('tides', 'es');
  const made = await remixBuiltin('tides', { id: 'my-tides-key' });
  const base = JSON.parse(JSON.stringify(made.pack));
  made.pack.steps[1].title = { en: 'Reworded', es: 'Reformulado' };
  const link = (await packLink(made.pack, { root: 'https://x.test/', base }))
    .fragment;
  await page.goto('/studio/course/packs/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('body')).toHaveAttribute('data-ready', 'true', {
    timeout: 30_000,
  });
  await page.fill('#pkLink', `https://gravitas-sim.online/#${link}`);
  await page.click('#pkMake');
  await expect(page.locator('#pkItem')).toHaveValue(/"pin"/, {
    timeout: 90_000,
  });
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 60_000 }),
    page.click('#pkKeyEs'),
  ]);
  expect(download.suggestedFilename()).toBe('my-tides-key-key-es.pdf');
  await pdfOf(download);
});
