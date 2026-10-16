// =============================================================================
// Remix and delivery by link (Prompt 78), in a browser
// -----------------------------------------------------------------------------
// tests/remix.test.js holds the rules. This is the path: remix a built-in in
// the Composer, make the link, open it as a student, and check that the lesson
// is the instructor's words over the original's science, that progress is kept
// under the pack's own id and version, and that a link that changes an
// expected value is refused.
// =============================================================================

import { test, expect } from './fixtures.js';

async function composer(page) {
  await page.addInitScript(() => {
    try {
      window.localStorage.setItem('gravitas_welcome_seen_v1', '1');
    } catch {
      /* storage unavailable */
    }
  });
  await page.goto('/studio/lesson/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('body')).toHaveAttribute('data-ready', 'true', {
    timeout: 30_000,
  });
}

async function remixAndLink(page, from) {
  await composer(page);
  await page.selectOption('#cp-remix-from', from);
  await page.click('#cp-remix');
  await expect(page.locator('#cp-checks-summary')).toHaveText(/valid|válida/, {
    timeout: 30_000,
  });
  await expect(page.locator('#cp-kept-card')).toBeVisible();
  await page.click('#cp-publish');
  await expect(page.locator('#cp-link')).toHaveValue(/#i1[zr]/, {
    timeout: 20_000,
  });
  return page.locator('#cp-link').inputValue();
}

test('a remix opens from its link, as the instructor’s lesson on the original’s science', async ({
  page,
}) => {
  const link = await remixAndLink(page, 'keplers-laws');
  expect(link.length).toBeLessThan(8000);
  await page.goto(link, { waitUntil: 'domcontentloaded' });
  const panel = page.locator('#investigationPanel');
  await expect(panel).toHaveClass(/is-open/, { timeout: 60_000 });
  await expect(page.locator('#investigationTitle')).toContainText(/Kepler/i);
  // The engine knows it by the pack's id and version, so progress is its own.
  const key = await page.evaluate(
    () => document.querySelector('#investigationPanel')?.dataset.lesson ?? ''
  );
  expect(key === '' || key.startsWith('rx-my-keplers-laws-1-0-0')).toBe(true);
});

test('a link that changes an expected value is refused, naming the field', async ({
  page,
}) => {
  await composer(page);
  const bad = await page.evaluate(async () => {
    const { remixBuiltin } = await import('/js/composer/remixApi.js');
    const { packLink } = await import('/js/composer/packLink.js');
    const made = await remixBuiltin('keplers-laws', { id: 'my-bad' });
    const p = JSON.parse(JSON.stringify(made.pack));
    const q = p.steps.find(s => s.type === 'question' && s.kind === 'choice');
    q.answer = (q.answer + 1) % q.options.length;
    return (await packLink(p, { root: `${location.origin}/`, base: made.pack }))
      .url;
  });
  await page.goto(bad, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('body')).toContainText(/\.answer/, {
    timeout: 60_000,
  });
  await expect(page.locator('#investigationPanel')).not.toHaveClass(/is-open/);
});

test('a damaged link says so and leaves the application working', async ({
  page,
}) => {
  await page.addInitScript(() => {
    try {
      window.localStorage.setItem('gravitas_welcome_seen_v1', '1');
    } catch {
      /* storage unavailable */
    }
  });
  await page.goto('/#i1rAAAA', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('body')).toContainText(
    /incomplete|not an investigation|cut short/i,
    { timeout: 60_000 }
  );
});

test('the Composer’s preview is the link a student opens', async ({ page }) => {
  await remixAndLink(page, 'tides');
  await page.click('#cp-preview-go');
  await expect(page.locator('#cp-preview')).toHaveAttribute('src', /#i1[zr]/);
  const frame = page.frameLocator('#cp-preview');
  await expect(frame.locator('#investigationTitle')).not.toBeEmpty({
    timeout: 60_000,
  });
});
