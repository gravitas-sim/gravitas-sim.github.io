// The barycenter marker, the frame line and the statement of what pulls on
// what, walked as a reader would: the Tools control reached and changed from
// the keyboard and by touch, the marker's members, and the readout and the
// canvas summary saying the frame and the sources in words.
import { test, expect } from './fixtures.js';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('gravitas_orientation_seen_v1', '1');
    localStorage.setItem('gravitas_welcome_seen_v1', '1');
  });
});

const marker = page =>
  page.evaluate(async () => {
    const ui = await import('/js/ui.js');
    return { ...ui.state.barycenterMarker };
  });

const summary = page =>
  page.evaluate(async () =>
    (await import('/js/canvasSummary.js')).summaryText()
  );

test('the barycenter control is reached and changed from the keyboard', async ({
  page,
  app,
}) => {
  await app.boot();
  await app.loadScenario('binary-pair');
  await app.railControl('referenceFrameSelect');
  await page.locator('#referenceFrameSelect').focus();
  await page.keyboard.press('Tab');
  const select = page.locator('#barycenterMarkerSelect');
  await expect(select).toBeFocused();
  // Type-ahead on the focused select: the same on every platform, where an
  // arrow key opens the list on some and changes the value on others.
  await page.keyboard.press('w');
  await expect(select).toHaveValue('system');
  await app.waitForFrames(5);
  await expect.poll(async () => (await marker(page)).members.length).toBe(2);
  await expect
    .poll(() => summary(page))
    .toContain(
      'Barycenter marker: the mass-weighted mean position of the whole system, 2 bodies.'
    );
  // A second letter within a second extends the search ("wo"); wait it out.
  await expect(select).toBeFocused();
  await page.waitForTimeout(1100);
  await page.keyboard.press('o');
  await expect(select).toHaveValue('off');
  expect((await marker(page)).mode).toBe('off');
});

test.describe('by touch', () => {
  test.use({ hasTouch: true });

  test('one tap and a choice marks a selected star and its primary', async ({
    page,
    app,
  }) => {
    await app.boot();
    await app.loadScenario('binary-pair');
    await page.evaluate(async () => {
      const physics = await import('/js/physics.js');
      const gate = await import('/js/inspectorGate.js');
      gate.showObjectInspector(
        physics.stars[0],
        gate.inspectorTypeFor(physics.stars[0])
      );
    });
    await app.railControl('barycenterMarkerSelect');
    const select = page.locator('#barycenterMarkerSelect');
    await select.tap();
    await select.selectOption('pair');
    await app.waitForFrames(5);
    await expect
      .poll(async () => (await marker(page)).members.join(','))
      .toBe('Star A,Star B');
    await expect
      .poll(() => summary(page))
      .toContain('of Star A and its primary, Star B.');
  });
});

test('the readout and the summary name the frame and the sources', async ({
  page,
  app,
}) => {
  await app.boot();
  await app.loadScenario('circumbinary-planet-lab');
  await app.waitForFrames(5);
  const readout = page.locator('#overlayStats');
  await expect(readout).toContainText('Frame');
  await expect(readout).toContainText('World');
  // Mutual gravity is on here, so the planet pulls as well.
  await expect(readout).toContainText(
    'Pulling on others: stars (2), planets (1).'
  );
  await app.railControl('referenceFrameSelect');
  await page.locator('#referenceFrameSelect').selectOption('barycenter');
  await app.waitForFrames(5);
  await expect(readout).toContainText('Barycenter');
  await expect
    .poll(() => summary(page))
    .toContain('Frame: Barycenter. Trails drawn in this frame.');

  await app.loadScenario('binary-pair');
  await app.waitForFrames(5);
  // Star-only gravity: the stars pull, and nothing else is there.
  await expect(readout).toContainText('Pulling on others: stars (2).');
  await expect(readout).not.toContainText('Feeling gravity');
});
