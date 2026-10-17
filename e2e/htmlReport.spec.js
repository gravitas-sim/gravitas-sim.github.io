// =============================================================================
// The accessible HTML lab report (Prompt 127)
// -----------------------------------------------------------------------------
// Beside the PDF, the finish dialog offers the same report as a web page. This
// walks to the dialog, downloads it, and judges the file a reader gets: a real
// document in the language the student worked in, with its headings in order,
// and no axe violation when it is opened by itself.
// =============================================================================

import AxeBuilder from '@axe-core/playwright';
import { test, expect } from './fixtures.js';

const TAGS = [
  'wcag2a',
  'wcag2aa',
  'wcag21a',
  'wcag21aa',
  'wcag22aa',
  'best-practice',
];

async function openFinish(page, app, locale) {
  await app.boot({ url: '/?author=keplers-laws&step=1' });
  const total = await page.evaluate(async lang => {
    const data = await import('/js/data/investigations.js');
    const i18n = await import('/js/i18n/index.js');
    await i18n.setLocale(lang);
    return data.getInvestigation('keplers-laws').steps.length;
  }, locale);
  await app.boot({ url: `/?author=keplers-laws&step=${total}` });
  await expect(page.locator('#investigationPanel')).toBeVisible();
  await page.locator('#investigationNext').click();
  await expect(page.locator('#investigationFinishContent')).toBeVisible();
  await page.locator('#investigationName').fill('Ada Lovelace');
}

async function downloaded(page) {
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 45_000 }),
    page.locator('#investigationDownloadHtml').click(),
  ]);
  const chunks = [];
  for await (const chunk of await download.createReadStream())
    chunks.push(chunk);
  return {
    name: download.suggestedFilename(),
    html: Buffer.concat(chunks).toString('utf8'),
  };
}

for (const [locale, lang, word] of [
  ['en', 'en', 'Ada Lovelace'],
  ['es', 'es', 'Ada Lovelace'],
]) {
  test(`the finish dialog hands over the report as a web page, in ${locale}`, async ({
    page,
    app,
    context,
  }) => {
    await openFinish(page, app, locale);
    const { name, html } = await downloaded(page);
    expect(name).toMatch(/\.html$/);
    expect(html.startsWith('<!doctype html>')).toBe(true);
    expect(html).toContain(`<html lang="${lang}">`);
    expect(html).toContain(word);
    expect(html).not.toMatch(/<script/i);

    // Opened by itself, as a reader would open the file.
    const reader = await context.newPage();
    await reader.setContent(html);
    const levels = await reader.evaluate(() =>
      [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].map(
        h => +h.tagName[1]
      )
    );
    expect(levels.filter(l => l === 1)).toHaveLength(1);
    let deepest = 1;
    for (const l of levels) {
      expect(l).toBeLessThanOrEqual(deepest + 1);
      deepest = Math.max(deepest, l);
    }
    const results = await new AxeBuilder({ page: reader })
      .withTags(TAGS)
      .analyze();
    expect(results.violations.map(v => `${v.id}: ${v.nodes.length}`)).toEqual(
      []
    );
    await reader.close();
  });
}

test('the PDF download is unchanged beside it', async ({ page, app }) => {
  await openFinish(page, app, 'en');
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 45_000 }),
    page.locator('#investigationDownload').click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/\.pdf$/);
});
