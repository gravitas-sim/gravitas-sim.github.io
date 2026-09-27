// =============================================================================
// Stars and their populations: the guided investigations, in a browser
// -----------------------------------------------------------------------------
// tests/populationsGuides.test.js holds the guides as data and every answer
// on the real packs, and tests/stellarTools.test.js the primitives the suite
// added. This is the page, against the sources and dist/:
//   - ?guide= loads the second suite and its guide from the link alone;
//   - a color and a distance made in the change panel pass the steps waiting
//     for them, and the filter tool's count answers the next;
//   - the isochrone comparison runs in the measurement panel, draws its best
//     curve over the members, and passes its step;
//   - the column summary gives the members' median velocity, which answers
//     its step;
//   - a panel computed from all four spectra; Spanish, and no accessibility
//     violations in either language.
// =============================================================================

import AxeBuilder from '@axe-core/playwright';
import { test, expect } from './fixtures.js';

const TAGS = [
  'wcag2a',
  'wcag2aa',
  'wcag21a',
  'wcag21aa',
  'wcag22aa',
  'best-practice',
];

async function openGuide(page, query) {
  await page.goto(`/observatory/?${query}`, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('html')).toHaveAttribute('data-ready', 'true', {
    timeout: 30_000,
  });
  await expect(page.locator('#gdStepTitle')).toBeVisible({ timeout: 30_000 });
}
const title = page => page.locator('#gdStepTitle');
const feedback = page => page.locator('#gdFeedback');
const next = page => page.locator('#gdNext').click();
const opens = (page, n) =>
  expect(page.locator('html')).toHaveAttribute('data-opens', String(n), {
    timeout: 30_000,
  });
/** Jump to a step by its place in the progress list, 1-based. */
const jump = (page, n) =>
  page.locator(`#gdProgress li:nth-child(${n}) button`).click();
/** The panel of changes, which starts closed. */
const changes = page =>
  page
    .locator('#obsDeriveBox')
    .evaluate(el => (el.closest('details').open = true));
async function color(page) {
  await changes(page);
  await page.locator('#obsDeriveName').fill('g - r');
  await page.locator('#obsDeriveA').selectOption('g');
  await page.locator('#obsDeriveSign').selectOption('-1');
  await page.locator('#obsDeriveB').selectOption('r');
  await page.locator('#obsDeriveGo').click();
}
async function crop(page, min, max) {
  await changes(page);
  await page.locator('#obsCropMin').fill(String(min));
  await page.locator('#obsCropMax').fill(String(max));
  await page.locator('#obsCropGo').click();
}
async function measure(page, tool) {
  await page.locator('#obsMeasurePanel').evaluate(el => (el.open = true));
  await expect(page.locator('#msRun')).toBeVisible({ timeout: 30_000 });
  await page.locator('#msTool').selectOption(tool);
}

test.describe('the stellar populations guides', () => {
  test('a color, a distance and a count: a cluster’s diagram and its missing core', async ({
    page,
  }) => {
    await openGuide(page, 'guide=pop-cmd');
    await expect(page.locator('#gdSuite')).toHaveValue('populations');
    await expect(title(page)).toHaveText(
      'Step 1 of 11: A cluster at one distance'
    );
    await next(page);
    await page.locator('#gdGo').click();
    await opens(page, 1);
    await expect(page.locator('#obsTitle')).toContainText('NGC 2420');
    await expect(feedback(page)).toContainText('Open.');

    await next(page);
    await expect(title(page)).toContainText('Make a color');
    await color(page);
    await expect(feedback(page)).toContainText('Your color is a new column', {
      timeout: 30_000,
    });

    await next(page);
    await page.locator('input[value="fewest"]').check();
    await page.locator('#gdCheck').click();
    await expect(feedback(page)).toContainText('Recorded.');

    await next(page);
    await changes(page);
    await page.locator('#obsSepName').fill('distance');
    await page.locator('#obsSepGo').click();
    await expect(feedback(page)).toContainText('its distance from the center', {
      timeout: 30_000,
    });

    await next(page);
    await expect(title(page)).toContainText('Count the core');
    await measure(page, 'filter');
    await page.locator('#msCol0').selectOption({ label: 'distance' });
    await page.locator('#msOp0').selectOption('<');
    await page.locator('#msVal0').fill('3');
    await page.locator('#msRun').click();
    const node = page.locator('#msNodes li[data-node="m1"]');
    await expect(node.locator('table')).toContainText('Rows kept', {
      timeout: 30_000,
    });
    const kept = await node
      .locator('tr', { hasText: 'Rows kept' })
      .locator('td')
      .first()
      .innerText();
    await page.locator('#gdAnswer').fill(kept.trim());
    await page.locator('#gdCheck').click();
    await expect(feedback(page)).toHaveAttribute('data-ok', 'true');
    await expect(feedback(page)).toContainText('3.2 arcminutes');
  });

  test('the isochrone comparison runs in the page and draws its curve over the members', async ({
    page,
  }) => {
    await openGuide(page, 'guide=pop-age');
    await jump(page, 4);
    await expect(title(page)).toContainText('Open the members again');
    await page.locator('#gdGo').click();
    await opens(page, 1);
    await next(page);
    await crop(page, 65, 85);
    await expect(feedback(page)).toContainText('Cropped to your members.', {
      timeout: 30_000,
    });
    await next(page);
    await color(page);
    await expect(feedback(page)).toContainText('color–magnitude diagram', {
      timeout: 30_000,
    });
    await page.locator('#obsAxisX').selectOption({ label: 'g - r' });
    await page.locator('#obsAxisY').selectOption('g');

    await next(page);
    await expect(title(page)).toContainText('Compare with the isochrones');
    await page.locator('#gdGo').click();
    await measure(page, 'curve');
    await page.locator('#msCurveFeh').selectOption('-0.25');
    await page.locator('#msRun').click();
    await expect(feedback(page)).toContainText(
      'The closest isochrone is log age 9.5',
      { timeout: 90_000 }
    );
    // The best curve is drawn over the points, and the plot says whose it is.
    await expect(page.locator('#obsPlot .ow-overlay').first()).toBeVisible();
    await expect(page.locator('#obsOverlayNote')).toContainText('log age 9.5');

    await next(page);
    await page.locator('#gdAnswer').fill('3.16');
    await page.locator('#gdCheck').click();
    await expect(feedback(page)).toHaveAttribute('data-ok', 'true');
  });

  test("the column summary gives the members' median velocity", async ({
    page,
  }) => {
    await openGuide(page, 'guide=pop-members');
    await next(page);
    await page.locator('#gdGo').click();
    await opens(page, 1);
    await jump(page, 4);
    await crop(page, 65, 85);
    await expect(feedback(page)).toContainText('Cropped.', {
      timeout: 30_000,
    });
    await next(page);
    await page.locator('#gdAnswer').fill('225');
    await page.locator('#gdCheck').click();
    await expect(feedback(page)).toHaveAttribute('data-ok', 'true');

    await next(page);
    await expect(title(page)).toContainText('Their velocity');
    await expect(page.locator('#gdShow')).toContainText('74.8 km/s');
    await measure(page, 'describe');
    await page.locator('#msDescribeCol').selectOption('rv');
    await page.locator('#msRun').click();
    const node = page.locator('#msNodes li[data-node="m1"]');
    await expect(node.locator('table')).toContainText('median', {
      timeout: 30_000,
    });
    await expect(node.locator('table')).toContainText('75.93');
    await page.locator('#gdAnswer').fill('75.93');
    await page.locator('#gdCheck').click();
    await expect(feedback(page)).toHaveAttribute('data-ok', 'true');
  });

  test('a panel from all four spectra, in Spanish, with no accessibility violations', async ({
    page,
    errors,
  }) => {
    // axe-core's icon-ligature check draws a character on a small canvas and
    // reads it back (axe.js, getImageData), and WebKit sometimes refuses the
    // read and logs this, as e2e/measure.spec.js found. It is the test tool's,
    // not the page's: nothing in js/ reads canvas pixels.
    const axeCanvas = /^Unable to get image data from canvas/;
    const push = errors.consoleErrors.push.bind(errors.consoleErrors);
    Object.defineProperty(errors.consoleErrors, 'push', {
      value: (...items) => push(...items.filter(e => !axeCanvas.test(e))),
      enumerable: false,
    });
    await openGuide(page, 'guide=pop-spectra');
    await jump(page, 6);
    await expect(title(page)).toHaveText('Step 6 of 11: The four side by side');
    await expect(page.locator('#gdShow dd')).toHaveCount(4, {
      timeout: 30_000,
    });
    await expect(page.locator('#gdShow')).toContainText('Å');
    const axe = async () =>
      (
        await new AxeBuilder({ page })
          .include('#obsGuidePanel')
          .withTags(TAGS)
          .analyze()
      ).violations.map(v => `${v.id}: ${v.nodes.length}`);
    expect(await axe()).toEqual([]);
    await page.locator('#langSwitch button[lang="es"]').click();
    await expect(title(page)).toHaveText('Paso 6 de 11: Las cuatro juntas');
    await expect(page.locator('#gdShow')).toContainText(
      'el espectro de la estrella A'
    );
    expect(await axe()).toEqual([]);
  });
});
