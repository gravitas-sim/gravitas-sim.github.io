// =============================================================================
// The seams between the runner, the Observatory and the notebook, in a browser
// -----------------------------------------------------------------------------
// tests/analysisSeams.test.js and tests/notebookSeams.test.js hold the
// adapters without a page (Roadmap II, Prompt 66, steps 1 and 2). This drives
// each new control once:
//   - an experiment run is saved as an observation, opens in the Observatory
//     as a table whose source is that experiment, and the measurement
//     pipeline describes its columns;
//   - the result and its analysis are kept in the evidence notebook as
//     envelopes naming the digest of the trials, and the evidence report
//     cites them;
//   - the lab opens the analysis it saved;
//   - a fit in the Observatory is kept in the notebook with the digest of the
//     rows it read;
//   - the new controls fit at 375 and 1024 px wide, and have no axe violations.
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
const KEY = 'gravitas_evidence_notebook';

async function runExperiment(page) {
  await page.goto('/experiments/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#xpEstimate')).toContainText(
    /trials of \d+ bodies/,
    {
      timeout: 30_000,
    }
  );
  await expect(page.locator('#xpRun')).toBeEnabled({ timeout: 30_000 });
  await page.locator('#xpRun').click();
  await expect(page.locator('#xpStatus')).toContainText('Finished', {
    timeout: 90_000,
  });
  await page.locator('#xpAnalysis > summary').click();
  await expect(page.locator('#labRun')).toBeVisible({ timeout: 15_000 });
}

const notebook = page =>
  page.evaluate(
    k => JSON.parse(localStorage.getItem(k) || '{"entries":[]}').entries,
    KEY
  );

test.describe('the analysis seams', () => {
  test('a run becomes an observation the Observatory opens and describes', async ({
    page,
  }, info) => {
    await runExperiment(page);
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('#labObservation').click(),
    ]);
    const path = info.outputPath('experiment.observation.json');
    await download.saveAs(path);
    const doc = JSON.parse(readFileSync(path, 'utf8'));
    expect(doc).toMatchObject({
      format: 'gravitas.observation',
      kind: 'table',
      origin: 'model',
      source: { kind: 'experiment' },
    });
    expect(doc.source.digest).toMatch(/^[0-9a-f]{8}$/);
    await expect(page.locator('#labStatus')).toContainText('Saved the result');

    await page.goto('/observatory/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('html')).toHaveAttribute('data-ready', 'true', {
      timeout: 30_000,
    });
    await page.locator('#obsFile').setInputFiles({
      name: 'experiment.observation.json',
      mimeType: 'application/json',
      buffer: readFileSync(path),
    });
    await expect(page.locator('#obsWork')).toBeVisible({ timeout: 30_000 });
    await expect(page.locator('#obsTable tbody tr').first()).toBeVisible();
    await expect(page.locator('#obsTable tbody tr')).toHaveCount(
      doc.columns[0].values.length
    );
    await page.locator('#obsMeasurePanel > summary').click();
    await expect(page.locator('#msRun')).toBeVisible({ timeout: 30_000 });
    await page.locator('#msTool').selectOption('describe');
    await page.locator('#msRun').click();
    await expect(page.locator('#msNodes li[data-node="m1"] table')).toBeVisible(
      { timeout: 60_000 }
    );
  });

  test('the result and its analysis are kept as envelopes, cited by the report, and the lab opens its own analysis', async ({
    page,
  }, info) => {
    await runExperiment(page);
    await page.locator('#labKeepResult').click();
    await expect(page.locator('#labStatus')).toContainText(
      'Kept in the evidence notebook'
    );
    await page.locator('#labRun').click();
    await expect(page.locator('#labStatus')).toContainText('Analyzed', {
      timeout: 30_000,
    });
    await page.locator('#labKeepAnalysis').click();
    await expect(page.locator('#labStatus')).toContainText(
      'Kept in the evidence notebook'
    );
    const entries = await notebook(page);
    expect(entries.map(e => e.source)).toEqual([
      'experiment-result',
      'sweep-analysis',
    ]);
    const digests = entries.map(e => e.snapshot.artifact.source.digest);
    expect(digests[0]).toMatch(/^[0-9a-f]{8}$/);
    expect(digests[1]).toBe(digests[0]);
    expect(entries[0].snapshot.artifact.source).toMatchObject({
      kind: 'experiment',
    });

    // The lab reads the analysis it wrote.
    const [saved] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('#labJson').click(),
    ]);
    const path = info.outputPath('analysis.json');
    await saved.saveAs(path);
    await page.goto('/experiments/', { waitUntil: 'domcontentloaded' });
    await page.locator('#xpAnalysis > summary').click();
    await expect(page.locator('#labRun')).toBeVisible({ timeout: 15_000 });
    await page.locator('#labFile').setInputFiles(path);
    await expect(page.locator('#labStatus')).toContainText(
      'Opened the analysis',
      {
        timeout: 15_000,
      }
    );
    await expect(page.locator('#labCells')).toBeVisible();
    await expect(page.locator('#labMethods')).toContainText(
      JSON.parse(readFileSync(path, 'utf8')).source.hash
    );

    // The report cites them by digest (the sources only: dist has no module paths).
    if (DIST) return;
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const text = await page.evaluate(async () => {
      const { ensureDeferredMessages } =
        await import('/js/i18n/deferredMessages.js');
      await ensureDeferredMessages();
      const { buildEvidenceReport } = await import('/js/notebook/report.js');
      const { load } = await import('/js/notebook/store.js');
      const { reviveEntry } = await import('/js/notebook/entry.js');
      const bytes = buildEvidenceReport({
        entries: load().entries.map(reviveEntry),
        revision: 'x',
      });
      return String.fromCharCode(...bytes);
    });
    for (const d of digests) expect(text).toContain(d);
  });

  test('a fit is kept in the notebook with the digest of its rows', async ({
    page,
  }) => {
    await page.goto('/observatory/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('html')).toHaveAttribute('data-ready', 'true', {
      timeout: 30_000,
    });
    await page.locator('#obsFixture').selectOption('tess-light-curve');
    await page.locator('#obsOpen').click();
    await expect(page.locator('#obsTable tbody tr').first()).toBeVisible({
      timeout: 30_000,
    });
    await page.locator('#obsFitPanel summary').click();
    await expect(page.locator('#fitRun')).toBeVisible({ timeout: 30_000 });
    await expect(page.locator('#fitKeep')).toBeHidden();
    await page.locator('#fitProfiles').uncheck();
    await page.locator('#fitRun').click();
    await expect(page.locator('#fitStatus')).toContainText(/Fitted in/, {
      timeout: 120_000,
    });
    await page.locator('#fitKeep').click();
    await expect(page.locator('#fitStatus')).toContainText(
      'Kept in the evidence notebook'
    );
    const [entry] = await notebook(page);
    expect(entry.source).toBe('inference-fit');
    expect(entry.snapshot.artifact.source).toMatchObject({ kind: 'inference' });
    expect(entry.snapshot.artifact.source.digest).toMatch(/^[0-9a-f]{8}$/);
  });

  /** An experiment's table, saved and opened in the Observatory. */
  async function openTable(page, info) {
    await runExperiment(page);
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('#labObservation').click(),
    ]);
    const path = info.outputPath('experiment.observation.json');
    await download.saveAs(path);
    await page.goto('/observatory/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('html')).toHaveAttribute('data-ready', 'true', {
      timeout: 30_000,
    });
    await page.locator('#obsFile').setInputFiles(path);
    await expect(page.locator('#obsWork')).toBeVisible({ timeout: 30_000 });
    return JSON.parse(readFileSync(path, 'utf8'));
  }

  test('an experiment table is fitted in the Observatory and the fit is kept with the digest of its rows and the experiment', async ({
    page,
  }, info) => {
    const doc = await openTable(page, info);
    await page.locator('#obsFitPanel summary').click();
    await expect(page.locator('#fitRun')).toBeVisible({ timeout: 30_000 });
    // A table is offered the models that claim nothing about its numbers.
    await expect(page.locator('#fitModel option')).toHaveText([
      /straight line/,
      /quadratic/,
      /power law/,
    ]);
    await page.locator('#fitModel').selectOption('poly-1');
    await expect(page.locator('#fitCenter')).toBeVisible();
    await page.locator('#fitProfiles').uncheck();
    await expect(page.locator('#fitRun')).toBeEnabled();
    await page.locator('#fitRun').click();
    await expect(page.locator('#fitStatus')).toContainText(/Fitted in/, {
      timeout: 120_000,
    });
    await expect(page.locator('#fitTable tbody tr')).toHaveCount(2);
    await page.locator('#fitKeep').click();
    await expect(page.locator('#fitStatus')).toContainText(
      'Kept in the evidence notebook'
    );
    const [entry] = await notebook(page);
    expect(entry.source).toBe('inference-fit');
    const env = entry.snapshot.artifact;
    expect(env.source).toMatchObject({ kind: 'inference', id: 'poly-1' });
    expect(env.source.digest).toMatch(/^[0-9a-f]{8}$/);
    // The rows' digest is the fit's; the experiment's own is beside it.
    expect(env.made.observation).toMatchObject({
      id: doc.id,
      source: { kind: 'experiment', digest: doc.source.digest },
    });
    expect(env.quantities.map(q => q.id)).toEqual(['c0', 'c1']);
  });

  for (const width of [375, 1024]) {
    test(`the table fit panel fits at ${width} px and has no axe violations`, async ({
      page,
    }, info) => {
      await page.setViewportSize({ width, height: 900 });
      await openTable(page, info);
      await page.locator('#obsFitPanel summary').click();
      await expect(page.locator('#fitRun')).toBeVisible({ timeout: 30_000 });
      await page.locator('#fitModel').selectOption('poly-2');
      await page.locator('#fitProfiles').uncheck();
      await page.locator('#fitRun').click();
      await expect(page.locator('#fitStatus')).toContainText(/Fitted in/, {
        timeout: 120_000,
      });
      const overflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth
      );
      expect(overflow).toBeLessThanOrEqual(0);
      const violations = (
        await new AxeBuilder({ page }).withTags(TAGS).analyze()
      ).violations.map(v => `${v.id}: ${v.nodes.map(n => n.target).join(' ')}`);
      expect(violations).toEqual([]);
    });
  }

  for (const width of [375, 1024]) {
    test(`the new controls fit at ${width} px and have no axe violations`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await runExperiment(page);
      await page.locator('#labRun').click();
      await expect(page.locator('#labStatus')).toContainText('Analyzed', {
        timeout: 30_000,
      });
      for (const id of [
        '#labObservation',
        '#labKeepResult',
        '#labKeepAnalysis',
      ]) {
        const box = await page.locator(id).boundingBox();
        expect(box.x).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width).toBeLessThanOrEqual(width);
      }
      const overflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth
      );
      expect(overflow).toBeLessThanOrEqual(0);
      const violations = (
        await new AxeBuilder({ page }).withTags(TAGS).analyze()
      ).violations.map(v => `${v.id}: ${v.nodes.map(n => n.target).join(' ')}`);
      expect(violations).toEqual([]);
    });
  }
});
