// =============================================================================
// The minimal instructor path (Prompt 168)
// -----------------------------------------------------------------------------
// One built-in course, no authoring, in both languages: Teach, the course as it
// comes, the link for students, a student opening it, the review page reading
// their reports, the grade export; and next term from the file saved.
// =============================================================================

import { readFileSync } from 'node:fs';
import { test, expect } from './fixtures.js';

const quiet = (page, locale = 'en') =>
  page.addInitScript(l => {
    localStorage.setItem('gravitas_orientation_seen_v1', '1');
    localStorage.setItem('gravitas_welcome_seen_v1', '1');
    localStorage.setItem('gravitas_locale', l);
  }, locale);

test.describe('use a built-in course as it comes', () => {
  test('?use= opens the panel, and one press makes the link, the file and the report', async ({
    page,
  }) => {
    await quiet(page);
    await page.goto('/studio/course/?use=intro-astronomy');
    await expect(page.locator('body[data-ready="true"]')).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.locator('#cb-term-h')).toHaveText(
      'Use this course as it comes'
    );
    await expect(page.locator('#cb-term-input')).toHaveValue(
      /^(Spring|Summer|Fall) \d{4}$/
    );
    await page.locator('#cb-term-input').fill('Fall 2026');
    await page.locator('#cb-term-go').click();
    await expect(page.locator('#cb-term-ready')).toContainText('(Fall 2026)', {
      timeout: 60_000,
    });
    const link = await page.locator('#cb-term-link').inputValue();
    expect(link).toContain('/course/#c');
    await expect(page.locator('#cb-term-keys')).toContainText(
      '1 assignments have a new code and the term in their title'
    );
    await expect(page.locator('#cb-term-changes')).toContainText(
      'Nothing changed under the course'
    );
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('#cb-term-save').click(),
    ]);
    expect(download.suggestedFilename()).toBe(
      'intro-astronomy-fall-2026.course.json'
    );
    const pack = JSON.parse(readFileSync(await download.path(), 'utf8'));
    expect(pack.term).toBe('Fall 2026');
    expect(pack.id).toBe('intro-astronomy-fall-2026');
  });
});
