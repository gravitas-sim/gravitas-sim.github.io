// =============================================================================
// A realistic phone
// -----------------------------------------------------------------------------
// Workflow 16. Runs under the Pixel 7 device profile rather than a narrow
// desktop window, because the mobile layout branches on touch support and on the
// user agent as well as on width - a 400px desktop window exercises some of it
// and not all of it.
//
// What is checked is that the application is usable, not that it looks a
// particular way: the canvas fills the screen, the menu opens, a scenario can be
// loaded, a body can be inspected, and nothing overflows horizontally. A phone
// layout that scrolls sideways is the one bug in this area that users always
// report and screenshots never catch.
// =============================================================================

import { test, expect } from './fixtures.js';

test.describe('on a phone', () => {
  test('boots, fills the screen, and runs', async ({ page, app }) => {
    await app.boot();

    const canvas = page.locator('#simulationCanvas');
    await expect(canvas).toBeVisible();

    const viewport = page.viewportSize();
    const box = await canvas.boundingBox();
    // Within a few pixels: the canvas is the application on a phone.
    expect(box.width).toBeGreaterThan(viewport.width - 8);

    await app.waitForBodies(1);
    await app.waitForFrames(10);
  });

  test('nothing overflows sideways', async ({ page, app }) => {
    await app.boot();
    await app.loadScenario('Solar System');
    await app.waitForFrames(20);

    const overflow = await page.evaluate(() => ({
      body: document.body.scrollWidth,
      html: document.documentElement.scrollWidth,
      viewport: window.innerWidth,
    }));
    // A couple of pixels of rounding is fine; a scrollbar's worth is not.
    expect(overflow.body).toBeLessThanOrEqual(overflow.viewport + 2);
    expect(overflow.html).toBeLessThanOrEqual(overflow.viewport + 2);
  });

  test('the mobile menu opens and closes', async ({ page, app }) => {
    await app.boot();

    const toggle = page.locator('#mobileMenuToggle');
    await expect(toggle).toBeVisible();
    await toggle.click();

    // Whatever the menu reveals, the scenario button has to be reachable: it is
    // the one control a phone visitor needs.
    const load = page.locator('#loadScenarioBtn');
    await expect(load).toBeVisible();
  });

  test('a scenario loads from the gallery and fits the screen', async ({
    page,
    app,
  }) => {
    await app.boot();

    // The gallery is a full-screen sheet on a phone rather than a modal.
    await page.locator('#mobileMenuToggle').click();
    await app.railControl('loadScenarioBtn');
    await page.locator('#loadScenarioBtn').click();

    const modal = page.locator('#scenarioListModal');
    await expect(modal).toBeVisible();

    const box = await modal.boundingBox();
    const viewport = page.viewportSize();
    expect(box.width).toBeLessThanOrEqual(viewport.width + 2);

    const cards = page.locator('#scenarioListItems [data-scenario]');
    expect(await cards.count()).toBeGreaterThan(10);
    await cards.first().click();
    await expect(modal).toBeHidden();
    await app.waitForBodies(1);
  });

  test('the inspector opens and stays inside the screen', async ({
    page,
    app,
  }) => {
    await app.boot();
    await app.loadScenario('Binary Pair');
    await app.waitForFrames(10);
    await app.selectFirstObject('StarObject');

    const inspector = page.locator('#objectInspector');
    await expect(inspector).toBeVisible();

    const box = await inspector.boundingBox();
    const viewport = page.viewportSize();
    expect(box.x).toBeGreaterThanOrEqual(-2);
    expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 2);

    await expect(page.locator('#inspectorContent')).not.toBeEmpty();
  });

  test('the inspector closes from its own close button', async ({
    page,
    app,
  }) => {
    // KNOWN FAILING, deliberately left running rather than skipped.
    //
    // On an emulated phone a tap on #inspectorClose produces a click whose
    // target is BODY rather than the button, so the inspector does not close.
    // What has been established:
    //
    //   - the button is settled, on screen, and document.elementFromPoint at its
    //     own centre returns #inspectorClose
    //   - the page is not scrolled and there is no visual-viewport offset
    //   - a click dispatched directly at the element does close the inspector,
    //     so the handler itself is wired correctly
    //
    // One contributing cause has already been fixed: the header's touchstart
    // handler called preventDefault() unconditionally, which cancelled the
    // synthesised click outright and made every button in the inspector header
    // dead to touch. After that fix a click is produced - it is simply
    // hit-tested somewhere else. The remaining cause is not yet identified.
    //
    // test.fail() means this runs and CI requires it to fail. If someone fixes
    // the underlying problem this test starts passing and the run goes red,
    // which is the point: the marker has to be removed deliberately rather than
    // the fix going unnoticed.
    test.fail();

    await app.boot();
    await app.loadScenario('Binary Pair');
    await app.selectFirstObject('StarObject');
    await expect(page.locator('#objectInspector')).toBeVisible();

    // Let the panel finish dropping into place: it opens from off screen, and a
    // tap during the transition would be a different bug from the one above.
    await expect
      .poll(
        async () => {
          const first = await page.locator('#inspectorClose').boundingBox();
          await page.waitForTimeout(120);
          const second = await page.locator('#inspectorClose').boundingBox();
          return first && second && Math.abs(first.y - second.y) < 1;
        },
        { timeout: 10_000 }
      )
      .toBe(true);

    await page.locator('#inspectorClose').click();
    await expect(page.locator('#objectInspector')).toBeHidden();
  });

  test('a tap on a header button is not swallowed by the drag handler', async ({
    page,
    app,
  }) => {
    // The regression test for the half of the problem that is fixed. The header
    // is a drag handle, and its touchstart handler used to call preventDefault()
    // for every touch - including a touch on one of its own buttons - which
    // cancels the click the browser would otherwise synthesise. Every control in
    // the inspector header was dead on a phone as a result.
    await app.boot();
    await app.loadScenario('Binary Pair');
    await app.selectFirstObject('StarObject');
    await expect(page.locator('#objectInspector')).toBeVisible();

    const prevented = await page.evaluate(async () => {
      const btn = document.getElementById('inspectorClose');
      const rect = btn.getBoundingClientRect();
      const point = {
        identifier: 1,
        target: btn,
        clientX: rect.x + rect.width / 2,
        clientY: rect.y + rect.height / 2,
      };
      const event = new TouchEvent('touchstart', {
        bubbles: true,
        cancelable: true,
        touches: [new Touch(point)],
        targetTouches: [new Touch(point)],
        changedTouches: [new Touch(point)],
      });
      btn.dispatchEvent(event);
      return event.defaultPrevented;
    });

    // Not prevented means the browser is still free to turn this tap into a
    // click, which is the whole requirement.
    expect(prevented).toBe(false);
  });

  test('a lesson is usable on a phone', async ({ page, app }) => {
    // The lesson panel and its instrument share one narrow column here, and the
    // widget heights branch on viewport width. A lesson that renders its
    // instrument off screen is unusable and looks fine in a desktop test.
    await app.boot();
    // On a phone the rail is behind the menu toggle, so the lessons button is
    // not reachable until the menu is open.
    await page.locator('#mobileMenuToggle').click();
    await page.locator('#investigationsBtn').click();
    await expect(page.locator('#investigationBrowser')).toBeVisible();

    await page.locator('[data-investigation="missing-mass"]').click();
    await expect(page.locator('#investigationPanel')).toBeVisible();

    const panel = page.locator('#investigationPanel');
    const box = await panel.boundingBox();
    const viewport = page.viewportSize();
    expect(box.width).toBeLessThanOrEqual(viewport.width + 2);

    // Advance to the step with an instrument and check it is actually on screen.
    await page.locator('#investigationNext').click();
    const tool = page.locator('#investigationToolCanvas');
    await expect(tool).toBeVisible();
    const toolBox = await tool.boundingBox();
    expect(toolBox.width).toBeGreaterThan(120);
    expect(toolBox.x + toolBox.width).toBeLessThanOrEqual(viewport.width + 2);
  });
});
