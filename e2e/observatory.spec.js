// =============================================================================
// The observatory, in a browser
// -----------------------------------------------------------------------------
// tests/observatory.test.js holds the workspace's contracts without a page.
// This is the page, against the published sources and against dist/, where
// each observation is a chunk of its own:
//   - every built-in observation opens, and says what was done to it;
//   - a selection made in one view is the selection in the others, by
//     pointer and by keyboard, and a focused row is described in words;
//   - a change, undone and redone, is the same change;
//   - a save is the same bytes twice, and reads back with its changes;
//   - an import goes through its preview, refuses to guess a unit, and names
//     the line a malformed file breaks on;
//   - no accessibility violations, in English and in Spanish;
//   - with the service worker installed, it opens observations offline.
// =============================================================================

import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';
import { test, expect } from './fixtures.js';

const DIST = process.env.GRAVITAS_E2E_TARGET === 'dist';
const TAGS = [
  'wcag2a',
  'wcag2aa',
  'wcag21a',
  'wcag21aa',
  'wcag22aa',
  'best-practice',
];

async function openPage(page) {
  await page.goto('/observatory/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('html')).toHaveAttribute('data-ready', 'true', {
    timeout: 30_000,
  });
}

async function openFixture(page, id) {
  await page.locator('#obsFixture').selectOption(id);
  await page.locator('#obsOpen').click();
  await expect(page.locator('#obsWork')).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('#obsTable tbody tr').first()).toBeVisible();
}

const axe = async page =>
  (await new AxeBuilder({ page }).withTags(TAGS).analyze()).violations.map(
    v => `${v.id}: ${v.nodes.map(n => n.target).join(' ')}`
  );

const selectedRows = page =>
  page.locator('#obsTable tr[aria-selected="true"]').count();

test.describe('the observatory', () => {
  test('opens every observation it offers, and says what was done to each', async ({
    page,
  }) => {
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await openPage(page);
    const ids = await page
      .locator('#obsFixture option')
      .evaluateAll(os => os.map(o => o.value));
    expect(ids).toEqual([
      'tess-light-curve',
      'sdss-a',
      'sdss-g',
      'sdss-k',
      'sdss-m',
      'gwosc-events',
      'tess-aperture',
    ]);
    const expected = {
      'tess-light-curve': { rows: 1882, seeing: /20-minute bins/ },
      'sdss-g': { rows: 1271, seeing: /no uncertainty here/ },
      'gwosc-events': { rows: 5, seeing: /90% interval/ },
      'tess-aperture': { rows: 143, seeing: /as the archive has them/ },
    };
    for (const id of ids) {
      await openFixture(page, id);
      if (!expected[id]) continue;
      await expect(page.locator('#obsTable caption')).toContainText(
        `of ${expected[id].rows}.`
      );
      await expect(page.locator('#obsSeeing')).toContainText(
        expected[id].seeing
      );
      // Every observation credits its source.
      await expect(page.locator('#obsSource')).toContainText('Credit');
    }
    expect(errors).toEqual([]);
  });

  test('a selection in the plot is the selection in the table, and back', async ({
    page,
  }) => {
    await openPage(page);
    await openFixture(page, 'tess-light-curve');
    const plot = page.locator('#obsPlot');
    // Mouse coordinates are the viewport's, so the plot has to be in it.
    await plot.scrollIntoViewIfNeeded();
    const box = await plot.boundingBox();
    // A drag across the middle fifth of the plot.
    await page.mouse.move(box.x + box.width * 0.4, box.y + box.height * 0.5);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.5, {
      steps: 5,
    });
    await page.mouse.up();
    await expect(page.locator('#obsSelected')).not.toHaveText('0 selected');
    const n = Number(
      (await page.locator('#obsSelected').textContent()).match(/\d+/)[0]
    );
    expect(n).toBeGreaterThan(50);
    // The plot draws them selected, and the table turns to them.
    await expect(plot.locator('.ow-pt.is-selected').first()).toBeAttached();
    // The keyboard in the table: Escape clears, Shift+Down selects a run.
    const first = page.locator('#obsTable tbody tr[tabindex="0"]');
    await first.focus();
    await page.keyboard.press('Escape');
    await expect(page.locator('#obsSelected')).toHaveText('0 selected');
    await page.keyboard.press('Home');
    await page.keyboard.press('Shift+ArrowDown');
    await page.keyboard.press('Shift+ArrowDown');
    await expect(page.locator('#obsSelected')).toHaveText('3 selected');
    expect(await selectedRows(page)).toBe(3);
    await expect(plot.locator('.ow-pt.is-selected')).toHaveCount(3);
    // The focused row is described in words, for a reader who cannot see it.
    await expect(page.locator('#obsReadout')).toContainText(
      /Row 3 of 1882: time [\d.]+ d, flux [\d.]+ ± [\d.]+/
    );
  });

  test('a pixel chosen in the image is a row in the table, decoded', async ({
    page,
  }) => {
    await openPage(page);
    await openFixture(page, 'tess-aperture');
    await expect(page.locator('#obsLegend')).toContainText(
      'in the optimal aperture'
    );
    await expect(page.locator('#obsLegend')).toContainText('23 pixels');
    const canvas = page.locator('#obsImage');
    await canvas.focus();
    // From pixel (1, 1), five right and five up: into the aperture.
    for (let i = 0; i < 5; i++) await page.keyboard.press('ArrowRight');
    for (let i = 0; i < 5; i++) await page.keyboard.press('ArrowUp');
    await page.keyboard.press('Space');
    await expect(page.locator('#obsSelected')).toHaveText('1 selected');
    await expect(page.locator('#obsReadout')).toContainText(
      /Column 6, row 6: 267, collected by the spacecraft; in the optimal aperture/
    );
    await expect(page.locator('#obsReadout')).toContainText(
      /Right ascension 330\.\d+°, declination 18\.\d+°/
    );
    // Pixel (6, 6) is row 5 x 11 + 6 = 61.
    await expect(
      page.locator('#obsTable tr[data-row="60"][aria-selected="true"]')
    ).toHaveCount(1);
    // A rectangle by keyboard: Shift and two arrows is a 3 x 1 run.
    await page.keyboard.press('Shift+ArrowRight');
    await page.keyboard.press('Shift+ArrowRight');
    await expect(page.locator('#obsSelected')).toHaveText('3 selected');
  });

  test('changes undo and redo, and a save is the same bytes twice', async ({
    page,
  }) => {
    await openPage(page);
    await openFixture(page, 'tess-light-curve');
    // Mask three rows.
    await page.locator('#obsTable tbody tr[tabindex="0"]').focus();
    await page.keyboard.press('Home');
    await page.keyboard.press('Shift+ArrowDown');
    await page.keyboard.press('Shift+ArrowDown');
    await page.locator('#obsMaskLabel').fill('a test');
    await page.locator('#obsMask').click();
    await expect(page.locator('#obsSeeing')).toContainText('3 rows are masked');
    await expect(page.locator('#obsMaskList')).toContainText(
      'You masked 3 rows: a test'
    );
    // Fold on the published period, then bin: the rows become bins.
    await page.locator('.ow-panel summary', { hasText: 'Change' }).click();
    await page.locator('#obsFoldPeriod').fill('3.52474859');
    await page.locator('#obsFoldGo').click();
    await expect(page.locator('#obsSeeing')).toContainText(
      'Folded on a period'
    );
    await page.locator('#obsBinWidth').fill('0.01');
    await page.locator('#obsBinGo').click();
    await expect(page.locator('#obsSeeing')).toContainText(/into 100 bins/);
    await expect(page.locator('#obsTable caption')).toContainText('of 100.');
    // Undo the bin: 1,882 rows again, and the mask still there.
    await page.locator('#obsUndo').click();
    await expect(page.locator('#obsTable caption')).toContainText('of 1882.');
    await expect(page.locator('#obsSeeing')).toContainText('3 rows are masked');
    await page.locator('#obsRedo').click();
    await expect(page.locator('#obsTable caption')).toContainText('of 100.');

    const save = async () => {
      const [download] = await Promise.all([
        page.waitForEvent('download'),
        page.locator('#obsExportJson').click(),
      ]);
      return readFileSync(await download.path(), 'utf8');
    };
    const one = await save();
    const two = await save();
    expect(two).toBe(one);
    const doc = JSON.parse(one);
    expect(doc.workspace.changes.map(c => c.op)).toEqual([
      'mask',
      'fold',
      'bin',
    ]);
    // Read back: the same observation, the same changes, undoable.
    await page.locator('#obsFile').setInputFiles({
      name: 'saved.json',
      mimeType: 'application/json',
      buffer: Buffer.from(one),
    });
    await expect(page.locator('#obsStatus')).toContainText('read back whole', {
      timeout: 10_000,
    });
    await expect(page.locator('#obsTable caption')).toContainText('of 100.');
    await expect(page.locator('#obsUndo')).toBeEnabled();
    const csv = await (async () => {
      const [download] = await Promise.all([
        page.waitForEvent('download'),
        page.locator('#obsExportCsv').click(),
      ]);
      return readFileSync(await download.path(), 'utf8');
    })();
    expect(csv.split('\r\n')[0]).toBe(
      'phase,flux,flux error,points in bin,masked'
    );
  });

  test('an import is previewed, does not guess a unit, and names the line a bad file breaks on', async ({
    page,
  }) => {
    await openPage(page);
    const good = [
      '# my photometry',
      'time (d),flux (ppm),flux error (ppm)',
      '1.0,100,5',
      '2.0,,5',
      '3.0,110,5',
    ].join('\n');
    await page.locator('#obsFile').setInputFiles({
      name: 'mine.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(good),
    });
    await expect(page.locator('#obsImport')).toBeVisible();
    await expect(page.locator('#obsImportSummary')).toContainText(
      '3 rows and 3 columns, separated by commas'
    );
    await expect(page.locator('#obsImportComments')).toContainText(
      'my photometry'
    );
    // Nothing is decided for the reader: importing now is refused.
    await page.locator('#obsImportGo').click();
    await expect(page.locator('#obsImportProblems')).toContainText(
      'choose what kind of data this is'
    );
    await page.locator('#obsImportKind').selectOption('time-series');
    await page.locator('#obsImportGo').click();
    await expect(page.locator('#obsImportProblems')).toContainText(
      'choose a unit for "time (d)"'
    );
    // The header's unit is offered, and taken only when asked.
    await page.getByRole('button', { name: 'Use d, from the header' }).click();
    await page
      .getByRole('button', { name: 'Use ppm, from the header' })
      .first()
      .click();
    await page
      .getByRole('button', { name: 'Use ppm, from the header' })
      .last()
      .click();
    await page.locator('#obsUse2').selectOption('uncertainty');
    await page.locator('#obsOf2').selectOption('1');
    await page.locator('#obsTimeFormat').selectOption('relative');
    await page.locator('#obsTimeScale').selectOption('unknown');
    await page.locator('#obsImportGo').click();
    await expect(page.locator('#obsWork')).toBeVisible();
    await expect(page.locator('#obsSeeing')).toContainText('This is your file');
    await expect(page.locator('#obsSeeing')).toContainText('1 values missing');
    await expect(page.locator('#obsSeeing')).toContainText(
      'the time scale is unknown'
    );

    const bad = 'time,flux\n1,2\n3\n4,5\n';
    await page.locator('#obsFile').setInputFiles({
      name: 'broken.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(bad),
    });
    await expect(page.locator('#obsImportProblems')).toContainText(
      'Line 3: has 1 fields where the header has 2'
    );
    await expect(page.locator('#obsImportForm')).toBeHidden();
  });

  test('speaks Spanish, and has no accessibility violations in either language', async ({
    page,
  }) => {
    await openPage(page);
    expect(await axe(page)).toEqual([]);
    await openFixture(page, 'tess-light-curve');
    expect(await axe(page)).toEqual([]);
    await openFixture(page, 'tess-aperture');
    expect(await axe(page)).toEqual([]);
    await page.getByRole('button', { name: 'Español' }).click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'es');
    await expect(page.locator('h1')).toHaveText('Observatorio');
    await expect(page.locator('#obsSelected')).toContainText('seleccionadas');
    expect(await axe(page)).toEqual([]);
    await page.locator('#obsFile').setInputFiles({
      name: 'x.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from('a (d),b\n1,2\n2,3\n'),
    });
    await expect(page.locator('#obsImportSummary')).toContainText(
      'separadas por comas'
    );
    expect(await axe(page)).toEqual([]);
  });
});

test.describe('the observatory offline', () => {
  test.use({ serviceWorkers: 'allow' });
  test.skip(DIST, 'the service worker is the sources’; dist/ has its own');

  test('opens observations with no network once Gravitas has been opened', async ({
    page,
    context,
    app,
  }, testInfo) => {
    testInfo.setTimeout(180_000);
    await app.boot();
    const deadline = Date.now() + 120_000;
    let status = null;
    while (Date.now() < deadline) {
      status = await page.evaluate(async () => {
        const m = await import('/js/offline.js');
        return m.cacheStatus(2000);
      });
      if (status && status.cachedCount >= status.precacheCount) break;
      await page.waitForTimeout(500);
    }
    expect(status?.cachedCount).toBeGreaterThanOrEqual(status?.precacheCount);
    await context.setOffline(true);
    await page.goto('/observatory/', { waitUntil: 'domcontentloaded' });
    // The observatory, not the simulator the shell would have been.
    await expect(page.locator('h1')).toHaveText('Observatory');
    await expect(page.locator('#simulationCanvas')).toHaveCount(0);
    await expect(page.locator('html')).toHaveAttribute('data-ready', 'true');
    await openFixture(page, 'tess-light-curve');
    await expect(page.locator('#obsTable caption')).toContainText('of 1882.');
    await openFixture(page, 'tess-aperture');
    await expect(page.locator('#obsLegend')).toContainText('23 pixels');
  });
});
