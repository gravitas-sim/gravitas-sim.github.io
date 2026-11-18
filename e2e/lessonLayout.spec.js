// =============================================================================
// The lesson layout on a phone and a tablet (criterion I-8)
// -----------------------------------------------------------------------------
// While a student works a step that uses the scene, the bound bodies stand
// outside every panel and a third of the height is canvas (a phone), or one
// announced action reaches that state; on a tablet the step and the scene read
// side by side. The judges are tools/visual-criteria.mjs's, the same ones
// e2e/visualCriteria.criteria.js states on demand; this is the part of that
// criterion the layout passes, run in the suite so a regression fails CI.
//
// The handle that lowers the sheet is held to what it promises: a name that
// says the state, a state that is announced, focus that stays on it, Back and
// Next within reach in both states, and the choice kept with the lesson.
// =============================================================================

/* global requestAnimationFrame */
import { test, expect } from './fixtures.js';
import {
  LESSON_PILOTS,
  PHONE_SIZES,
  TABLET_SIZE,
  SCENE_ACTION_NAME,
  openLessonStep,
  measureLayoutInPage,
  judgeLayout,
} from '../tools/visual-criteria.mjs';

const scenePilots = LESSON_PILOTS.filter(p => p.subject === 'scene');
const frames = page =>
  page.evaluate(
    () =>
      new Promise(r =>
        requestAnimationFrame(() =>
          requestAnimationFrame(() => setTimeout(r, 700))
        )
      )
  );

test.describe('I-8 on the scene pilots', () => {
  const sizes = [
    ...PHONE_SIZES.map(s => ({ ...s, kind: 'phone' })),
    { ...TABLET_SIZE, kind: 'tablet' },
  ];
  for (const pilot of scenePilots) {
    for (const size of sizes) {
      test(`${pilot.id} at ${size.width}x${size.height}`, async ({ page }) => {
        await page.setViewportSize({ width: size.width, height: size.height });
        await openLessonStep(page, pilot);
        let m = await page.evaluate(measureLayoutInPage);
        let verdict = judgeLayout(m, { kind: size.kind, subject: 'scene' });
        if (!verdict.pass) {
          const action = page
            .locator('#investigationPanel')
            .getByRole('button', { name: SCENE_ACTION_NAME });
          await expect(action, 'one announced action is there').toHaveCount(1);
          await action.click();
          await frames(page);
          m = await page.evaluate(measureLayoutInPage);
          verdict = judgeLayout(m, { kind: size.kind, subject: 'scene' });
        }
        expect(verdict.reasons, JSON.stringify(m.bodies)).toEqual([]);
      });
    }
  }
});

test.describe('the sheet handle', () => {
  const pilot = LESSON_PILOTS[0];
  const handle = page => page.locator('#investigationSheet');

  test('lowers and raises the sheet, says so and keeps the controls in reach', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await openLessonStep(page, pilot);
    const sheet = () =>
      page
        .locator('#investigationPanel')
        .evaluate(el => el.getBoundingClientRect().height);
    const reading = await sheet();
    await expect(handle(page)).toHaveAttribute('aria-expanded', 'true');
    await expect(handle(page)).toHaveAccessibleName(/lower the sheet/i);

    await handle(page).click();
    await expect(handle(page)).toHaveAttribute('aria-expanded', 'false');
    await expect(handle(page)).toHaveAccessibleName(/raise the sheet/i);
    await expect(handle(page), 'focus stays on the handle').toBeFocused();
    expect(await sheet()).toBeLessThan(reading * 0.7);
    for (const id of [
      'investigationNext',
      'investigationPrev',
      'investigationClose',
    ])
      await expect(
        page.locator(`#${id}`),
        `${id} in reach, lowered`
      ).toBeInViewport();

    await handle(page).click();
    await expect(handle(page)).toHaveAttribute('aria-expanded', 'true');
    expect(Math.abs((await sheet()) - reading)).toBeLessThan(2);
  });

  test('is a phone control, and says the state in Spanish', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1366, height: 800 });
    await openLessonStep(page, pilot);
    await expect(handle(page)).toBeHidden();
    await page.setViewportSize({ width: 375, height: 812 });
    await page.evaluate(() => localStorage.setItem('gravitas_locale', 'es'));
    await openLessonStep(page, { ...pilot, language: 'es' });
    await handle(page).click();
    await expect(handle(page)).toHaveAccessibleName(/subir la hoja/i);
  });

  test('is remembered with the lesson, and a raised sheet leaves no mark', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await openLessonStep(page, pilot);
    const saved = () =>
      page.evaluate(
        l =>
          JSON.parse(localStorage.getItem(`gravitas_investigation_${l}`))
            ?.sheet,
        pilot.lesson
      );
    expect(await saved()).toBeUndefined();
    await handle(page).click();
    expect(await saved()).toBe('peek');
    await page.reload({ waitUntil: 'load' });
    await expect(handle(page)).toHaveAttribute('aria-expanded', 'false', {
      timeout: 30_000,
    });
    await handle(page).click();
    expect(await saved()).toBeUndefined();
  });

  test('an answer box takes the sheet up', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await openLessonStep(page, pilot);
    await handle(page).click();
    await expect(handle(page)).toHaveAttribute('aria-expanded', 'false');
    await page.locator('#investigationBody input[type="text"]').first().focus();
    await expect(handle(page)).toHaveAttribute('aria-expanded', 'true');
  });
});

test.describe('the readout in a lesson', () => {
  test('folds to a tab on a phone and does not leave the row', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await openLessonStep(page, LESSON_PILOTS[0]);
    const box = await page.locator('#overlay').boundingBox();
    await expect(page.locator('#overlay')).toHaveClass(/minimized/);
    expect(box.width).toBeLessThan(150);
  });
});
