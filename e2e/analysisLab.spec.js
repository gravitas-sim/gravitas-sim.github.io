// =============================================================================
// The analysis laboratory on /experiments/, in a browser
// -----------------------------------------------------------------------------
// tests/analysis.test.js holds js/analysis/ to synthetic truth in Node. This is
// the panel on real results from real Workers: it loads only when opened, reads
// the page's run, says plainly that the laboratory scenarios ignore their seed,
// turns a second run at another step into the numerical uncertainty, analyzes
// a grid of two settings and a random sample of one, links its plot and table
// through one selection, cancels, saves the analysis with the experiment's
// manifest inside, and has no accessibility violations in either language.
// =============================================================================

import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';
import { test, expect } from './fixtures.js';

const TAGS = [
  'wcag2a',
  'wcag2aa',
  'wcag21a',
  'wcag21aa',
  'wcag22aa',
  'best-practice',
];

async function openRunner(page) {
  await page.goto('/experiments/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#xpEstimate')).toContainText(
    /trials of \d+ bodies/,
    { timeout: 30_000 }
  );
}

/** Run what the form describes, once its price says it is the form's. */
async function runExperiment(page, trials) {
  if (trials)
    await expect(page.locator('#xpEstimate')).toContainText(
      `${trials} trials of`,
      { timeout: 30_000 }
    );
  await expect(page.locator('#xpRun')).toBeEnabled({ timeout: 30_000 });
  await page.locator('#xpRun').click();
  await expect(page.locator('#xpStatus')).toContainText('Finished', {
    timeout: 90_000,
  });
}

async function openLab(page) {
  await page.locator('#xpAnalysis > summary').click();
  await expect(page.locator('#labRun')).toBeVisible({ timeout: 15_000 });
}

async function analyze(page) {
  await expect(page.locator('#labRun')).toBeEnabled();
  await page.locator('#labRun').click();
  await expect(page.locator('#labStatus')).toContainText('Analyzed', {
    timeout: 30_000,
  });
}

const codes = page =>
  page
    .locator('#labWarnings li')
    .evaluateAll(lis => lis.map(li => li.dataset.code));

test.describe('the analysis laboratory', () => {
  test('nothing of it loads until it is opened', async ({ page }) => {
    const urls = [];
    page.on('request', r => urls.push(r.url()));
    await openRunner(page);
    await runExperiment(page);
    expect(
      urls.some(u =>
        /analysisPanel|sweepAnalysis|analysis\/stats|en\.analysis/.test(u)
      )
    ).toBe(false);
    await openLab(page);
    await expect(page.locator('#labSource')).toContainText('The last run');
  });

  test('says the seeds changed nothing, and puts no interval on nothing', async ({
    page,
  }) => {
    await openRunner(page);
    await runExperiment(page);
    await openLab(page);
    await analyze(page);
    expect(await codes(page)).toContain('deterministic');
    // Eight orbit sizes, two seeds each, every pair identical.
    await expect(page.locator('#labCells tbody tr')).toHaveCount(8);
    const intervals = await page
      .locator('#labCells tbody tr td:nth-child(5)')
      .allTextContents();
    expect(intervals.every(x => x === '—')).toBe(true);
    await expect(page.locator('#labShares, #labSummary')).toContainText([
      'all of the variation',
    ]);
    await expect(page.locator('#labMethods')).toContainText(
      'sweep-analysis 1.0.0'
    );
  });

  test('its plot and table are one selection, and the summary follows it', async ({
    page,
  }) => {
    await openRunner(page);
    await runExperiment(page);
    await openLab(page);
    await analyze(page);
    await expect(page.locator('#labTrials tbody tr')).toHaveCount(16);
    await expect(page.locator('#labSelected')).toContainText(
      'No trials selected'
    );
    const plot = page.locator('#labPlot');
    await plot.focus();
    await page.keyboard.press('Home');
    for (let i = 0; i < 3; i++) await page.keyboard.press('Shift+ArrowRight');
    await expect(page.locator('#labSelected')).toContainText(
      '4 trials selected'
    );
    await expect(
      page.locator('#labTrials tbody tr[aria-selected="true"]')
    ).toHaveCount(4);
    await expect(page.locator('#labPlot .is-selected')).toHaveCount(4);
    await page.keyboard.press('Escape');
    await expect(page.locator('#labSelected')).toContainText(
      'No trials selected'
    );
    // A drag across the whole plot, from left of its first points, selects
    // every trial.
    const box = await plot.boundingBox();
    await page.mouse.move(box.x + box.width * 0.02, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.99, box.y + box.height / 2, {
      steps: 5,
    });
    await page.mouse.up();
    await expect(page.locator('#labSelected')).toContainText(
      '16 trials selected'
    );
  });

  test('a second run at another step becomes the numerical uncertainty', async ({
    page,
  }) => {
    await openRunner(page);
    await runExperiment(page);
    await openLab(page);
    const before = await page.locator('#xpEstimate').textContent();
    await page.locator('#xpStep').selectOption('120');
    // Priced again for the new step before it runs.
    await expect(page.locator('#xpEstimate')).not.toHaveText(before, {
      timeout: 30_000,
    });
    await expect(page.locator('#xpEstimate')).toContainText('16 trials of', {
      timeout: 30_000,
    });
    await runExperiment(page);
    // The earlier run is offered, and chosen.
    await expect(page.locator('#labReference')).toHaveValue(/.+/);
    await expect(page.locator('#labReference option:checked')).toContainText(
      '1/60 s'
    );
    await analyze(page);
    expect(await codes(page)).toContain('deterministicStepped');
    await expect(page.locator('#labStep')).toContainText(
      'Compared with the same experiment at 1/60 s'
    );
    await expect(page.locator('#labStepTable tbody tr')).toHaveCount(8);
    const errors = await page
      .locator('#labSensitivity tbody tr td:nth-child(4)')
      .allTextContents();
    expect(errors.some(x => x !== '—')).toBe(true);
    const resolved = await page
      .locator('#labSensitivity tbody tr td:nth-child(6)')
      .allTextContents();
    expect(resolved.every(x => ['yes', 'no'].includes(x))).toBe(true);
  });

  test('a grid of two settings splits its variation between them', async ({
    page,
  }) => {
    await openRunner(page);
    await page.locator('#xpScenario').selectOption('Gravity Assist Lab');
    await page.locator('#xpParam2').selectOption({ index: 1 });
    await page.locator('#xpCount').fill('3');
    await page.locator('#xpCount2').fill('3');
    await page.locator('#xpSeeds').fill('1');
    await page.locator('#xpDuration').fill('2000');
    await runExperiment(page, 9);
    await expect(page.locator('#xpSummaryBody tr')).toHaveCount(9);
    await openLab(page);
    await analyze(page);
    await expect(page.locator('#labShares tbody tr')).toHaveCount(4);
    await expect(page.locator('#labAxis option')).toHaveCount(2);
    await expect(page.locator('#labSummary')).toContainText(
      'Over a grid of 9 settings'
    );
  });

  test('a random sample of a setting reads its trend by rank', async ({
    page,
  }) => {
    await openRunner(page);
    await page.locator('#xpSpacing').selectOption('random');
    await expect(page.locator('#xpSecond')).toBeHidden();
    await page.locator('#xpCount').fill('12');
    await page.locator('#xpSeeds').fill('1');
    await runExperiment(page, 12);
    await openLab(page);
    await analyze(page);
    await expect(page.locator('#labSummary')).toContainText(
      'randomly drawn values'
    );
    await expect(page.locator('#labRho')).toContainText('Rank correlation');
    await expect(page.locator('#labHistTable tbody tr').first()).toBeVisible();
    // The histogram (PLOT_COMPONENT.md, D7) is its table: a bar per row, each
    // as tall against the tallest as its count is against the largest.
    const counts = (
      await page
        .locator('#labHistTable tbody tr td:last-child')
        .allTextContents()
    ).map(Number);
    const heights = await page
      .locator('#labHist .ow-bin')
      .evaluateAll(rs => rs.map(r => Number(r.getAttribute('height'))));
    expect(heights).toHaveLength(counts.length);
    const top = Math.max(...counts);
    const tallest = Math.max(...heights);
    heights.forEach((h, i) =>
      expect(Math.abs(h - (tallest * counts[i]) / top)).toBeLessThan(0.1)
    );
  });

  test('saves the analysis with the experiment inside, and reads a saved result back', async ({
    page,
  }, info) => {
    await openRunner(page);
    await runExperiment(page);
    const [resultFile] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('#xpDownloadJson').click(),
    ]);
    const resultPath = info.outputPath('result.json');
    await resultFile.saveAs(resultPath);
    const result = JSON.parse(readFileSync(resultPath, 'utf8'));
    await openLab(page);
    await analyze(page);
    const [saved] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('#labJson').click(),
    ]);
    const path = info.outputPath('analysis.json');
    await saved.saveAs(path);
    const doc = JSON.parse(readFileSync(path, 'utf8'));
    expect(doc.format).toBe('gravitas.analysis');
    expect(doc.source.hash).toBe(result.hash);
    expect(doc.source.manifest).toEqual(result.manifest);
    expect(doc.methods).toContain(result.hash);
    const [csv] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('#labCsv').click(),
    ]);
    const csvPath = info.outputPath('analysis.csv');
    await csv.saveAs(csvPath);
    const text = readFileSync(csvPath, 'utf8');
    expect(text.split('\n')[0]).toMatch(
      /^# gravitas\.analysis\/1 sweep-analysis 1\.0\.0/
    );
    expect(text).toContain(result.hash);

    // The saved result, opened in a fresh page, gives the same analysis.
    await page.goto('/experiments/', { waitUntil: 'domcontentloaded' });
    await openLab(page);
    await expect(page.locator('#labSource')).toContainText('No result yet');
    await page.locator('#labFile').setInputFiles(resultPath);
    await expect(page.locator('#labSource')).toContainText(
      'Opened result.json'
    );
    await analyze(page);
    const [again] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('#labJson').click(),
    ]);
    const againPath = info.outputPath('again.json');
    await again.saveAs(againPath);
    const second = JSON.parse(readFileSync(againPath, 'utf8'));
    expect(second.cells).toEqual(doc.cells);
    expect(second.sensitivity).toEqual(doc.sensitivity);
  });

  test('an analysis can be canceled, and leaves nothing', async ({ page }) => {
    await openRunner(page);
    await runExperiment(page);
    await openLab(page);
    // A clock that runs fast, so the analysis yields at its first step, and
    // Cancel pressed in the same turn as Analyze.
    await page.evaluate(() => {
      const real = performance.now.bind(performance);
      let skew = 0;
      performance.now = () => real() + (skew += 100);
      document.getElementById('labRun').click();
      document.getElementById('labCancel').click();
    });
    await expect(page.locator('#labStatus')).toContainText('Analysis canceled');
    await expect(page.locator('#labOut')).toBeHidden();
    await expect(page.locator('#labRun')).toBeEnabled();
  });

  test('no accessibility violations, in English and Spanish', async ({
    page,
  }) => {
    await openRunner(page);
    await runExperiment(page);
    await openLab(page);
    await analyze(page);
    const scan = () =>
      new AxeBuilder({ page }).withTags(TAGS).include('#xpAnalysis').analyze();
    expect((await scan()).violations).toEqual([]);
    await page.locator('[data-gs-lang]').selectOption('es');
    await expect(page.locator('#labRun')).toHaveText('Analizar');
    await expect(page.locator('#labOut h3').first()).toHaveText('Qué dice');
    expect((await scan()).violations).toEqual([]);
  });
});
