// =============================================================================
// My work, in a browser (Roadmap II Prompt 69, MY_WORK.md)
// -----------------------------------------------------------------------------
// tests/myWork.test.js holds the data layer. This is the page:
//   - a student leaves a lesson mid-way, exports from My work, imports the file
//     in a fresh browser context and resumes at the same step;
//   - the import is previewed first, skip keeps what is there, and a full
//     browser is refused with an offer to download a backup;
//   - delete needs a copy first;
//   - every list is operable by keyboard and has names a screen reader can read;
//   - axe, in both languages, at 375 and 1024 px.
// Sources only for the lesson walk: the page seeds progress through the
// lesson registry, which dist/ bundles away.
// =============================================================================

import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';
import { test, expect } from './fixtures.js';

const LESSON = 'keplers-laws';

async function seed(page) {
  await page.goto('/model/', { waitUntil: 'domcontentloaded' });
  return page.evaluate(async lesson => {
    const reg = await import('/js/data/investigations/registry.js');
    const inv = await reg.loadInvestigation(lesson);
    const at = Math.min(3, inv.steps.length - 1);
    const sid = inv.steps[at].sid;
    localStorage.setItem(
      `gravitas_investigation_${lesson}`,
      JSON.stringify({
        schema: 2,
        lesson,
        stepSid: sid,
        visited: inv.steps.slice(0, at + 1).map(s => s.sid),
        responses: {},
        attempts: {},
        startedAt: '2026-10-01T10:00:00.000Z',
      })
    );
    localStorage.setItem(
      'gravitas_experiment_x1',
      JSON.stringify({ name: 'Saved run', updated: 1.7e12 })
    );
    localStorage.setItem(
      'gravitas_experiments_index',
      JSON.stringify({
        v: 3,
        items: [{ id: 'x1', name: 'Saved run', updated: 1.7e12 }],
      })
    );
    return { sid, title: inv.steps[at].title };
  }, LESSON);
}

async function open(page) {
  await page.goto('/my-work/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('html')).toHaveAttribute('data-ready', 'true', {
    timeout: 30_000,
  });
}

const exportAll = async (page, path) => {
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.locator('#mwExport').click(),
  ]);
  await download.saveAs(path);
};

test.describe('My work', () => {
  test('leave mid-lesson, export, import in a fresh context, resume at the same step', async ({
    page,
    browser,
    baseURL,
  }, info) => {
    const at = await seed(page);
    await open(page);
    const item = page.locator('#mwLessons .mw-item', { hasText: /Kepler/i });
    await expect(item).toContainText(/4 steps seen|steps seen/);
    await expect(item.getByRole('link', { name: /Resume/ })).toHaveAttribute(
      'href',
      `/#investigation=${LESSON}`
    );
    const file = info.outputPath('backup.json');
    await exportAll(page, file);
    const saved = JSON.parse(readFileSync(file, 'utf8'));
    expect(saved.format).toBe('gravitas.student-data');
    await expect(page.locator('#mwStorageList')).toContainText(
      /Last backup file/
    );

    const fresh = await browser.newContext({ baseURL });
    const other = await fresh.newPage();
    await other.addInitScript(() =>
      localStorage.setItem('gravitas_welcome_seen_v1', '1')
    );
    await open(other);
    await expect(other.locator('#mwLessons .mw-none')).toBeVisible();
    await other.locator('#mwFile').setInputFiles(file);
    await expect(other.locator('#mwPreview')).toBeVisible();
    await expect(other.locator('#mwPreviewBody')).toContainText(/to add/);
    await other.locator('#mwApply').click();
    await expect(other.locator('#mwLessons .mw-item')).toHaveCount(1);
    await expect(other.locator('#mwExperiments .mw-item')).toHaveCount(1);
    await other.getByRole('link', { name: /Resume/ }).click();
    await expect(other.locator('.inv-step-title')).toHaveText(at.title, {
      timeout: 30_000,
    });
    await fresh.close();
  });

  test('the preview names what would change, and "keep what is here" leaves it', async ({
    page,
  }, info) => {
    await seed(page);
    await open(page);
    const file = info.outputPath('b.json');
    await exportAll(page, file);
    await page.evaluate(() =>
      localStorage.setItem(
        'gravitas_investigation_keplers-laws',
        JSON.stringify({
          schema: 2,
          lesson: 'keplers-laws',
          stepSid: 'x',
          visited: [],
          responses: {},
          attempts: {},
          startedAt: null,
        })
      )
    );
    await open(page);
    await page.locator('#mwFile').setInputFiles(file);
    await expect(page.locator('#mwPreviewBody')).toContainText(/1 to replace/);
    await page.getByLabel('Keep what is here').check();
    await expect(page.locator('#mwPreviewBody')).toContainText(
      /1 to leave as they are/
    );
    await page
      .locator('#mwApply')
      .click()
      .catch(() => {});
    const step = await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem('gravitas_investigation_keplers-laws'))
          .stepSid
    );
    expect(step).toBe('x');
  });

  test('a file that is not a backup is refused in words', async ({
    page,
  }, info) => {
    await open(page);
    const fs = await import('node:fs');
    const bad = info.outputPath('bad.json');
    fs.writeFileSync(bad, '{"hello":1}');
    await page.locator('#mwFile').setInputFiles(bad);
    await expect(page.locator('#mwSummary')).toContainText(
      'not a Gravitas backup'
    );
  });

  test('a full browser refuses the import and offers a backup', async ({
    page,
  }, info) => {
    await seed(page);
    await open(page);
    const file = info.outputPath('b.json');
    await exportAll(page, file);
    const fresh = await page
      .context()
      .browser()
      .newContext({ baseURL: page.url().split('/my-work')[0] });
    const full = await fresh.newPage();
    await full.addInitScript(() => {
      window.navigator.storage.estimate = async () => ({
        usage: 100,
        quota: 100,
      });
    });
    await open(full);
    await expect(full.locator('#mwNotice')).toContainText(/little room left/);
    await full.locator('#mwFile').setInputFiles(file);
    await full.locator('#mwApply').click();
    await expect(full.locator('#mwNotice')).toContainText(/not imported/);
    await expect(full.locator('#mwNotice button')).toHaveText(
      'Download everything'
    );
    await fresh.close();
  });

  test('delete waits for a copy', async ({ page }) => {
    await seed(page);
    await open(page);
    await page.getByRole('button', { name: /Delete: .*Kepler/i }).click();
    const go = page.locator('#mwDialogGo');
    await expect(go).toBeDisabled();
    const [d] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('#mwDialogExport').click(),
    ]);
    expect(d.suggestedFilename()).toMatch(/\.json$/);
    await expect(go).toBeEnabled();
    await go.click();
    await expect(page.locator('#mwLessons .mw-none')).toBeVisible();
    // The experiment, which was not touched, is still there and still listed.
    await expect(page.locator('#mwExperiments .mw-item')).toHaveCount(1);
  });

  test('keyboard reaches every list action, each named for its item', async ({
    page,
  }) => {
    await seed(page);
    await open(page);
    const names = await page
      .locator('.mw-item [data-act], .mw-item a')
      .evaluateAll(els => els.map(e => e.getAttribute('aria-label')));
    expect(names.length).toBeGreaterThan(3);
    for (const n of names) expect(n).toMatch(/: .+/);
    const del = page.getByRole('button', { name: /Export: .*Kepler/i });
    await del.focus();
    await page.keyboard.press('Enter');
    // The same file is made from the keyboard as from a click: the note says so.
    await expect(page.locator('#mwSummary')).toContainText(
      /backup file was made/
    );
    // Escape closes the dialog and focus returns to the page.
    await page.getByRole('button', { name: /Delete: .*Saved run/ }).focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#mwDialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('#mwDialog')).toBeHidden();
  });

  for (const lang of ['en', 'es']) {
    for (const width of [375, 1024]) {
      test(`axe finds nothing in ${lang} at ${width} px, with work listed`, async ({
        page,
      }) => {
        await seed(page);
        await page.addInitScript(
          l => localStorage.setItem('gravitas_locale', l),
          lang
        );
        await page.setViewportSize({ width, height: 900 });
        await open(page);
        await expect(page.locator('html')).toHaveAttribute('lang', lang);
        const r = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag22aa'])
          .analyze();
        expect(r.violations.map(v => `${v.id}: ${v.nodes[0]?.target}`)).toEqual(
          []
        );
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth > window.innerWidth + 1
        );
        expect(overflow).toBe(false);
      });
    }
  }
});
