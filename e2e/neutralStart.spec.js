// =============================================================================
// An instrument that opens apart from its answer, and the way back to it
// -----------------------------------------------------------------------------
// No shipped lesson declares `tool.start` yet, so the lesson module of Io's Fire
// is served with one added to the heating step (the route below rewrites only
// that step's tool). Checked: the sliders open at the start and not at the
// accepted values, a student's own control values are kept over it when the step
// is left and reopened, and the button returns the controls to the start by
// keyboard alone. The step without a start has no button.
// =============================================================================

import { test, expect } from './fixtures.js';
import {
  lessonPlan,
  openInvestigation,
  walkToSid,
} from './centralExperiment.js';

const START = { k2: 0.4, Q: 300, e: 0.002 };

test('a step that declares a start opens there, keeps saved values over it and can return to it', async ({
  page,
  app,
}) => {
  test.slow();
  await page.route(
    '**/js/data/investigations/satellite-sequence.js',
    async route => {
      const response = await route.fetch();
      const text = await response.text();
      const at = text.indexOf("sid: 'heating-at-the-maximum'");
      const tool = 'tool: TH({ k2: 1.5, Q: 100, e: 0.0041 })';
      const from = text.indexOf(tool, at);
      expect(at).toBeGreaterThan(0);
      expect(from).toBeGreaterThan(at);
      const patched = `${text.slice(0, from)}tool: { ...TH({ k2: 1.5, Q: 100, e: 0.0041 }), start: ${JSON.stringify(START)} }${text.slice(from + tool.length)}`;
      await route.fulfill({ response, body: patched });
    }
  );
  await openInvestigation(page, app, 'ios-fire');
  const plan = await lessonPlan(page, 'ios-fire');

  // A step with no start has no button.
  await expect(page.locator('[data-tool-start]')).toHaveCount(0);

  await walkToSid(page, plan, 'heating-at-the-maximum');
  const slider = id => page.locator(`#invTool-${id}`);
  const values = () =>
    Promise.all(
      Object.keys(START).map(async id => Number(await slider(id).inputValue()))
    );
  expect(await values()).toEqual(Object.values(START));

  const button = page.getByRole('button', {
    name: 'Return the instrument to its starting position',
  });
  await expect(button).toHaveCount(1);

  // A student moves a slider by keyboard; leaving and coming back keeps their value.
  await slider('k2').focus();
  await page.keyboard.press('End');
  const moved = Number(await slider('k2').inputValue());
  expect(moved).toBeGreaterThan(START.k2);
  await page.locator('#investigationNext').click();
  await expect(page.locator('.inv-step-title')).not.toHaveText(
    /The heat for k2/
  );
  await page.locator('#investigationPrev').click();
  await expect(slider('k2')).toHaveValue(String(moved));

  // The button, reached and pressed from the keyboard, returns every control to the start.
  await button.focus();
  await page.keyboard.press('Enter');
  expect(await values()).toEqual(Object.values(START));
  await expect(button).toBeFocused();
});
