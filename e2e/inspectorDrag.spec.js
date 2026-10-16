// =============================================================================
// Dragging the object inspector by its header
// -----------------------------------------------------------------------------
// The window code moved out of ui.js into inspectorWindow.js (Prompt 107,
// slice 8), and nothing covered the drag: a lost mousedown wire or a handler
// run in the wrong order would leave the panel fixed and every other
// inspector test green. These use real mouse down, move and up with steps,
// because the drag listens for mousemove on the document.
// =============================================================================

import { test, expect } from './fixtures.js';

/** Open the inspector on a star and return the header's grab point. */
async function openAndGrab(page, app) {
  await app.boot();
  await app.loadScenario('solar-system');
  await app.waitForFrames(10);
  await app.selectFirstObject('StarObject');
  const inspector = page.locator('#objectInspector');
  await expect(inspector).toBeVisible();
  const header = await page
    .locator('#objectInspector .inspector-header')
    .boundingBox();
  // Left of the header's buttons, on the title; the drag ignores a press on a
  // button, as it must.
  return { x: header.x + 40, y: header.y + header.height / 2 };
}

for (const size of [
  { name: 'a wide window', viewport: { width: 1440, height: 900 } },
  { name: 'a narrow window', viewport: { width: 820, height: 760 } },
]) {
  test(`the header drags the inspector on ${size.name}`, async ({
    page,
    app,
  }) => {
    await page.setViewportSize(size.viewport);
    const grab = await openAndGrab(page, app);
    const inspector = page.locator('#objectInspector');
    const before = await inspector.boundingBox();

    // The panel must be what is under the pointer, or the press never reaches
    // the header at all.
    const hit = await page.evaluate(
      ({ x, y }) =>
        !!document.elementFromPoint(x, y)?.closest('#objectInspector'),
      grab
    );
    expect(hit).toBe(true);

    await page.mouse.move(grab.x, grab.y);
    await page.mouse.down();
    await page.mouse.move(grab.x - 90, grab.y + 60, { steps: 8 });
    await page.mouse.up();

    const after = await inspector.boundingBox();
    expect(Math.round(after.x - before.x)).toBe(-90);
    expect(Math.round(after.y - before.y)).toBe(60);
    // Released, so a later move of the mouse does not carry it along.
    await page.mouse.move(grab.x + 200, grab.y + 200, { steps: 4 });
    const settled = await inspector.boundingBox();
    expect(settled.x).toBe(after.x);
    expect(settled.y).toBe(after.y);
  });
}
