// =============================================================================
// Progressive depth (Roadmap II, Prompt 72)
// -----------------------------------------------------------------------------
// tests/progressiveDepth.test.js holds the rules. What only a browser shows: a
// reader at each depth counts the steps that depth has, Next walks into the
// deeper ones, "Go deeper" and "Fewer steps" move between depths without losing
// a number, and a link or an assignment can name the depth.
// =============================================================================

import { test, expect } from './fixtures.js';

const LESSONS = [
  'keplers-laws',
  'transit-photometry',
  'weighing-stars',
  'missing-mass',
];

/** What the lesson has at each depth, read from the lesson the page loads. */
const counts = (page, id) =>
  page.evaluate(async id => {
    const reg = await import('/js/data/investigations/registry.js');
    const depth = await import('/js/investigations/depth.js');
    const core = await reg.loadInvestigation(id);
    const laid = await depth.withDepth(core, 'en');
    return {
      core: depth.lessonAt(laid, 'core').steps.length,
      quantitative: depth.lessonAt(laid, 'quantitative').steps.length,
      advanced: depth.lessonAt(laid, 'advanced').steps.length,
      first: laid.steps.find(s => s.depth === 'quantitative').title,
      firstAdvanced: laid.steps.find(s => s.depth === 'advanced').title,
    };
  }, id);

const total = async page => {
  const text = await page
    .locator('.inv-step-count')
    .filter({ hasText: /\d/ })
    .first()
    .innerText();
  return Number(/of\s+(\d+)/i.exec(text)?.[1]);
};

async function open(page, app, hash) {
  await app.boot({ url: `/#investigation=${hash}` });
  await expect(page.locator('.inv-step-title')).toBeVisible({
    timeout: 30_000,
  });
}

/** Press Next until a step with this title is on screen. */
async function walkTo(page, title) {
  for (let i = 0; i < 80; i++) {
    if ((await page.locator('.inv-step-title').innerText()) === title) return;
    await page.locator('#investigationNext').click();
  }
  throw new Error(`never reached "${title}"`);
}

for (const id of LESSONS) {
  test.describe(`${id} at each depth`, () => {
    test('core is the lesson as it was, and offers to go deeper', async ({
      page,
      app,
    }) => {
      await open(page, app, id);
      const n = await counts(page, id);
      expect(await total(page)).toBe(n.core);
      await expect(page.locator('#investigationDeeper')).toBeVisible();
      await expect(page.locator('#investigationShallower')).toBeHidden();
    });

    test('a link at quantitative counts its steps and Next reaches the deeper ones', async ({
      page,
      app,
    }) => {
      await open(page, app, `${id}/quantitative`);
      const n = await counts(page, id);
      expect(await total(page)).toBe(n.quantitative);
      await expect(page.locator('#investigationDepthState')).toContainText(
        'Quantitative'
      );
      await walkTo(page, n.first);
      // Not the advanced ones.
      await expect(page.locator('#investigationShallower')).toBeVisible();
    });

    test('a link at advanced counts all of them and reaches the last deeper step', async ({
      page,
      app,
    }) => {
      await open(page, app, `${id}/advanced`);
      const n = await counts(page, id);
      expect(await total(page)).toBe(n.advanced);
      await expect(page.locator('#investigationDeeper')).toBeHidden();
      await walkTo(page, n.firstAdvanced);
    });

    test('Fewer steps and Go deeper move between depths and keep the answers', async ({
      page,
      app,
    }) => {
      await open(page, app, `${id}/quantitative`);
      const n = await counts(page, id);
      await walkTo(page, n.first);
      const field = page.locator('input[data-field]:not([readonly])').first();
      const typed = (await field.count()) > 0;
      if (typed) await field.fill('1.5');
      await page.locator('#investigationShallower').click();
      await expect.poll(() => total(page)).toBe(n.core);
      await expect(page.locator('.inv-step-title')).not.toHaveText(n.first);
      // The step before the deeper ones: Go deeper leads straight in.
      await page.locator('#investigationDeeper').click();
      await expect.poll(() => total(page)).toBe(n.quantitative);
      await expect(page.locator('.inv-step-title')).toHaveText(n.first);
      if (typed)
        await expect(
          page.locator('input[data-field]:not([readonly])').first()
        ).toHaveValue('1.5');
    });
  });
}

test('the course level sets the depth a lesson opens at', async ({
  page,
  app,
}) => {
  await app.boot({ url: '/' });
  const n = await counts(page, 'weighing-stars');
  await page.evaluate(() =>
    localStorage.setItem('gravitas_course_level', 'majors')
  );
  await open(page, app, 'weighing-stars');
  expect(await total(page)).toBe(n.quantitative);
});

test('a student can write a value with its uncertainty, and a bare value is asked for more', async ({
  page,
  app,
}) => {
  await open(page, app, 'keplers-laws/quantitative');
  await walkTo(page, 'Predict, with an error bar');
  const box = page.locator('.inv-answer-num');
  await box.fill('8.0');
  await page.keyboard.press('Enter');
  await expect(page.locator('#investigationPanel')).toContainText(
    /uncertainty/i
  );
});
