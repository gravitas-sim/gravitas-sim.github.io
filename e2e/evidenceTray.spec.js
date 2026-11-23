// =============================================================================
// The evidence tray beside a written answer, in a browser
// -----------------------------------------------------------------------------
// A short-answer step shows the student's own readings and their revealed
// predictions as a closed-or-open disclosure, read-only: nothing is placed in
// the box, a prediction is absent until its reveal step has been reached, and
// the author's answer never appears. Each lesson is entered mid-way in the
// panel's own saved format, as a student who left and came back would be.
// =============================================================================

import { test, expect, saveLanguage, storeProgress } from './workflow.js';

const KEPLER = {
  id: 'keplers-laws',
  at: 'why-the-speed-changes',
  // `where-is-the-star` is a choice prediction revealed at `the-first-law-and-the`.
  responses: {
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
  },
  revealed: 'the-first-law-and-the',
};
const TRANSIT = {
  id: 'transit-photometry',
  at: 'what-the-method-misses',
  // `estimate-the-dip` is an estimate (a value, in percent) revealed at `why-that-radius-came-out`.
  responses: {
    'transit-photometry:estimate-the-dip': '1.2',
    'transit-photometry:choose-the-two-stretches:base': '1.0000',
    'transit-photometry:choose-the-two-stretches:bot': '0.9860',
  },
  revealed: 'why-that-radius-came-out',
};

async function open(page, app, lesson, { revealed = true, locale } = {}) {
  await app.boot();
  if (locale) {
    await saveLanguage(page, locale);
    await app.boot();
  }
  await storeProgress(page, lesson.id, {
    responses: lesson.responses,
    attempts: {},
    visited: revealed ? [lesson.revealed] : [],
    stepSid: lesson.at,
    startedAt: new Date().toISOString(),
  });
  const menu = page.locator('#mobileMenuToggle');
  if (await menu.isVisible()) await menu.click();
  await page.locator('#investigationsBtn').click();
  await page.locator(`[data-investigation="${lesson.id}"]`).click();
  await expect(page.locator('#investigationPanel')).toBeVisible();
  await expect(page.locator('#investigationBody [data-answer]')).toBeVisible();
}

const tray = page => page.locator('#investigationBody [data-tray]');

for (const lesson of [KEPLER, TRANSIT]) {
  test.describe(`${lesson.id}: the tray beside the explanation`, () => {
    test('lists the student’s own readings and a revealed prediction, and nothing else', async ({
      page,
      app,
    }) => {
      await open(page, app, lesson);
      await expect(tray(page)).toBeVisible();
      const rows = tray(page).locator('.inv-tray-row');
      await expect(
        rows.filter({ hasText: 'Your reading' }).first()
      ).toBeVisible();
      const text = await tray(page).innerText();
      expect(text).toMatch(/You (predicted|estimated)/);
      expect(text).toMatch(
        /Saved on this device; the scene they came from is not/
      );
      // Only what was typed or taken: a derived field's value is not here.
      expect(text).not.toMatch(/NaN|undefined/);
    });

    test('a prediction is not in the tray before its result has been reached', async ({
      page,
      app,
    }) => {
      await open(page, app, lesson, { revealed: false });
      await expect(tray(page)).toBeVisible();
      await expect(tray(page)).not.toContainText(/You (predicted|estimated)/);
    });

    test('Cite adds nothing to the answer and the box keeps what was typed', async ({
      page,
      app,
    }) => {
      await open(page, app, lesson);
      const area = page.locator('#investigationBody [data-answer]');
      await area.fill('It speeds up near the star.');
      await tray(page).locator('[data-cite]').first().click();
      await expect(area).toBeFocused();
      await expect(area).toHaveValue('It speeds up near the star.');
      await expect(page.locator('#srStatus')).toContainText(
        'Nothing was added to your answer'
      );
    });

    test('the disclosure works from the keyboard and sits after the prompt', async ({
      page,
      app,
    }) => {
      await open(page, app, lesson);
      const summary = tray(page).locator('summary');
      await summary.focus();
      const before = await tray(page).evaluate(el => el.open);
      await page.keyboard.press('Enter');
      expect(await tray(page).evaluate(el => el.open)).toBe(!before);
      await page.keyboard.press('Space');
      expect(await tray(page).evaluate(el => el.open)).toBe(before);
      const order = await page.evaluate(() => {
        const prompt = document.querySelector('#investigationBody .inv-prompt');
        const t = document.querySelector('#investigationBody [data-tray]');
        return Boolean(prompt.compareDocumentPosition(t) & 4);
      });
      expect(order).toBe(true);
    });

    test('Spanish: the tray, its note and its buttons are in Spanish', async ({
      page,
      app,
    }) => {
      await open(page, app, lesson, { locale: 'es' });
      await expect(tray(page)).toContainText('Tu evidencia para citar');
      await expect(tray(page)).toContainText('Tu lectura');
      await expect(tray(page).locator('[data-cite]').first()).toHaveText(
        'Citar'
      );
    });
  });
}

test.describe('on a phone', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('the tray is shut until the student opens it, and stays within the panel', async ({
    page,
    app,
  }) => {
    await open(page, app, KEPLER);
    await expect(tray(page)).toBeVisible();
    expect(await tray(page).evaluate(el => el.open)).toBe(false);
    await tray(page).locator('summary').click();
    expect(await tray(page).evaluate(el => el.open)).toBe(true);
    const fits = await tray(page).evaluate(
      el => el.scrollWidth <= el.clientWidth + 1
    );
    expect(fits).toBe(true);
  });
});
