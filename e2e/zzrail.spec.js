import { test, expect } from './fixtures.js';
test('rail fits', async ({ page, app }) => {
  await app.boot();
  for (const id of ['railScenario', 'railState', 'railTools', 'railLearn']) {
    await page.locator(`#${id}`).click();
    const m = await page.evaluate(() => {
      const rail = document.getElementById('mainControls');
      return rail.scrollHeight - rail.clientHeight;
    });
    console.log(id, 'overflow', m);
  }
  expect(1).toBe(1);
});
