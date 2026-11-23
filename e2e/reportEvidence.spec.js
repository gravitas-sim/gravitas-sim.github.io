// =============================================================================
// The report and the hand-in, with the evidence a student gathered
// -----------------------------------------------------------------------------
// Kepler's Laws is entered at its last step from saved progress that holds a
// reading taken from the live probe (with how it was taken), a prediction whose
// result has been reached, and an answer to a step the lesson has since
// replaced. The finish dialog says what the file is called, from the keyboard
// alone the web page is made, and it carries the readings table with where each
// came from, the prediction as a class and never the key, and the earlier
// answer under its own heading, in both languages. The same flow is run with
// the network gone. The file handed in has the one name the dialog said.
// =============================================================================

import AxeBuilder from '@axe-core/playwright';
import { test, expect, saveLanguage, storeProgress } from './workflow.js';

const LESSON = 'keplers-laws';
const KEYED = 'one focus of the ellipse, off-center';
const RESPONSES = {
  'keplers-laws:where-is-the-star': 0,
  'keplers-laws:find-the-foci:f_peri': '0.98',
  'keplers-laws:find-the-foci:f_peri:src': JSON.stringify({
    k: 'c',
    r: 'periapsis',
    x: '0.98',
    l: 'Closest (periapsis)',
    b: 'Kepler Star',
    t: 2.5e6,
  }),
  'keplers-laws:find-the-foci:f_sep': '0,5',
  // An answer to a step this lesson no longer has, as an earlier release left it.
  'keplers-laws:a-step-since-replaced': 'Twelve months',
};
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

async function openFinish(page, app, locale) {
  await app.boot();
  if (locale) {
    await saveLanguage(page, locale);
    await app.boot();
  }
  await storeProgress(page, LESSON, {
    responses: RESPONSES,
    attempts: {},
    startedAt: new Date().toISOString(),
  });
  const menu = page.locator('#mobileMenuToggle');
  if (await menu.isVisible()) await menu.click();
  await page.locator('#investigationsBtn').click();
  await page.locator(`[data-investigation="${LESSON}"]`).click();
  await expect(page.locator('#investigationPanel')).toBeVisible();
  await page.locator('#investigationNext').click();
  await expect(page.locator('#investigationFinishContent')).toBeVisible();
}

/** Type the name and press the web page button, from the keyboard only. */
async function keyboardHtml(page) {
  await page.locator('#investigationName').fill('');
  await page.locator('#investigationName').focus();
  await page.keyboard.type('Ángela Núñez');
  for (let i = 0; i < 8; i++) {
    await page.keyboard.press('Tab');
    const id = await page.evaluate(() => document.activeElement?.id);
    if (id === 'investigationDownloadHtml') break;
  }
  expect(await page.evaluate(() => document.activeElement?.id)).toBe(
    'investigationDownloadHtml'
  );
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 45_000 }),
    page.keyboard.press('Enter'),
  ]);
  const chunks = [];
  for await (const chunk of await download.createReadStream())
    chunks.push(chunk);
  return {
    name: download.suggestedFilename(),
    html: Buffer.concat(chunks).toString('utf8'),
  };
}

const EN = {
  heading: 'Your readings, and how each was taken',
  earlier: 'Answered in an earlier version',
  from: 'Taken from Closest (periapsis)',
  differs: 'What happened differs from your prediction.',
  sentence: 'Hand in that PDF',
};
const ES = {
  heading: 'Tus lecturas y cómo se tomó cada una',
  earlier: 'Respondido en una versión anterior',
  from: 'Tomada de Closest (periapsis)',
  differs: 'Lo que ocurrió difiere de tu predicción.',
  sentence: 'Entrega ese PDF',
};

for (const [locale, W] of [
  ['en', EN],
  ['es', ES],
]) {
  test(`the dialog names the file, and the web page carries the evidence, in ${locale}`, async ({
    page,
    app,
    context,
  }) => {
    await openFinish(page, app, locale);
    const file = 'angela-nunez-keplers-laws';
    await page.locator('#investigationName').fill('Ángela Núñez');
    // The one sentence says the same name the files get.
    const line = page.locator('#investigationFinishFile');
    await expect(line).toContainText(`${file}.pdf`);
    await expect(line).toContainText(`${file}.html`);
    await expect(line).toContainText(W.sentence);

    const { name, html } = await keyboardHtml(page);
    expect(name).toBe(`${file}.html`);
    expect(html).toContain(W.heading);
    expect(html).toContain(W.from);
    expect(html).toContain('Kepler Star');
    expect(html).toContain('0.98');
    // A reading typed from the start has no record of how it was taken, and is not in the table.
    expect(html).toContain(W.earlier);
    expect(html).toContain('Twelve months');
    // A prediction is a class; the keyed option and its reason are not in the file.
    expect(html).toContain(W.differs);
    expect(html).not.toContain(KEYED);
    expect(html).not.toMatch(/Newton proved/);
    // The one sentence the author wrote for the reveal step is the lesson's, not the key, and is printed.
    if (locale === 'en') expect(html).toContain('mirror each other');

    const reader = await context.newPage();
    await reader.setContent(html);
    const table = reader.locator('table', { hasText: 'Closest (periapsis)' });
    await expect(table.locator('thead th[scope="col"]').first()).toBeVisible();
    expect(await table.locator('thead th').count()).toBe(7);
    const results = await new AxeBuilder({ page: reader })
      .withTags(TAGS)
      .analyze();
    expect(results.violations.map(v => `${v.id}: ${v.nodes.length}`)).toEqual(
      []
    );

    // Walked by keyboard: every tab stop in the page is a link, in document order, with a name.
    const stops = await reader.evaluate(() =>
      [...document.querySelectorAll('a[href], summary, [tabindex="0"]')].map(
        e => (e.textContent || '').trim()
      )
    );
    expect(stops.every(Boolean)).toBe(true);
    const visited = [];
    for (let i = 0; i < stops.length; i++) {
      await reader.keyboard.press('Tab');
      visited.push(
        await reader.evaluate(() =>
          (document.activeElement?.textContent || '').trim()
        )
      );
    }
    expect(visited).toEqual(stops);
    await reader.close();
  });
}

test('the PDF has the name the dialog said', async ({ page, app }) => {
  await openFinish(page, app, 'en');
  await page.locator('#investigationName').fill('Ada Lovelace');
  await expect(page.locator('#investigationFinishFile')).toContainText(
    'ada-lovelace-keplers-laws.pdf'
  );
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 45_000 }),
    page.locator('#investigationDownload').click(),
  ]);
  expect(download.suggestedFilename()).toBe('ada-lovelace-keplers-laws.pdf');
  const chunks = [];
  for await (const chunk of await download.createReadStream())
    chunks.push(chunk);
  const text = Buffer.concat(chunks).toString('latin1');
  expect(text.startsWith('%PDF-')).toBe(true);
  expect(text).toContain('Answered in an earlier version');
  expect(text).not.toContain(KEYED);
});

test.describe('with the network gone', () => {
  test.use({ serviceWorkers: 'allow' });

  test('the report is generated offline, from the keyboard, with the same rows', async ({
    page,
    app,
    context,
  }, testInfo) => {
    testInfo.setTimeout(180_000);
    await app.boot();
    const deadline = Date.now() + 90_000;
    let status = null;
    while (Date.now() < deadline) {
      status = await page.evaluate(async () => {
        const m = await import('/js/offline.js');
        return m.cacheStatus(2000);
      });
      if (status && status.cachedCount >= status.precacheCount) break;
      await page.waitForTimeout(500);
    }
    expect(status.cachedCount).toBeGreaterThanOrEqual(status.precacheCount);
    await context.setOffline(true);
    await openFinish(page, app, null);
    const { name, html } = await keyboardHtml(page);
    expect(name).toBe('angela-nunez-keplers-laws.html');
    expect(html).toContain(EN.heading);
    expect(html).toContain('Twelve months');
    await context.setOffline(false);
  });
});
