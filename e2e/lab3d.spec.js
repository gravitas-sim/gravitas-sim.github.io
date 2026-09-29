// =============================================================================
// The 3-D dynamics diagnostics page (/lab3d/), in a browser
// -----------------------------------------------------------------------------
// tools/validate-lab3d.mjs holds the kernel to the reference corpus in Node,
// and tests/lab3d.test.js its properties. This is the page and its Worker,
// against the sources and dist/ (where the Worker is a bundle of its own):
//   - a reference problem runs in the Worker and passes every check, with
//     its residuals, events and four plots;
//   - a coarse fixed step through a close approach is warned about;
//   - a long run is canceled between slices;
//   - a 2-D Orbital System Builder file opens as a 3-D system and runs;
//   - the speed table is measured in the Worker;
//   - it reads in Spanish, passes axe and fits a phone.
// =============================================================================

import AxeBuilder from '@axe-core/playwright';
import { test, expect } from './fixtures.js';

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'];

async function openPage(page, locale) {
  await page.addInitScript(l => {
    try {
      if (l) window.localStorage.setItem('gravitas_locale', l);
    } catch {
      /* storage unavailable */
    }
  }, locale ?? null);
  await page.goto('/lab3d/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('html')).toHaveAttribute('data-ready', 'true', {
    timeout: 30_000,
  });
}

const run = async (page, timeout = 60_000) => {
  await page.locator('#lb-go').click();
  await expect(page.locator('#lb-status')).toHaveText(
    /^(Finished|Terminado|Canceled|Cancelado|Refused|Failed)/,
    { timeout }
  );
};

test.describe('the 3-D diagnostics page', () => {
  test('a reference problem runs in the Worker and passes every check @cross-browser', async ({
    page,
  }) => {
    await openPage(page);
    await page.locator('#lb-problem').selectOption('R5');
    await run(page);
    await expect(page.locator('#lb-status')).toHaveText(
      /^Finished: ok, in [\d.]+ s\.$/
    );
    const results = page.locator('#lb-checks tbody tr td:last-child');
    await expect(results).toHaveCount(2);
    await expect(results).toHaveText(['pass', 'pass']);
    await expect(page.locator('#lb-plots svg')).toHaveCount(4);
    await expect(page.locator('#lb-results')).toContainText(
      'Largest relative energy error'
    );
  });

  test('R8 merges twice, exactly, and R4 finds its particle leaving L1', async ({
    page,
  }) => {
    await openPage(page);
    await page.locator('#lb-problem').selectOption('R8');
    await run(page);
    await expect(page.locator('#lb-events tbody tr')).toHaveCount(1);
    await expect(page.locator('#lb-events')).toContainText('Merger');
    await expect(
      page.locator('#lb-checks tbody tr td:last-child')
    ).not.toContainText(['fail']);
    await page.locator('#lb-problem').selectOption('R4');
    await run(page);
    await expect(page.locator('#lb-checks')).toContainText(
      'largest distance from L1'
    );
    await expect(page.locator('#lb-checks tbody tr td:last-child')).toHaveText([
      'pass',
      'pass',
      'pass',
    ]);
  });

  test('a coarse fixed step through a close approach is warned about', async ({
    page,
  }) => {
    await openPage(page);
    await page.locator('#lb-problem').selectOption('R7');
    await page.locator('#lb-scheme').selectOption('leapfrog');
    await page.locator('#lb-step').fill('0.5');
    await run(page);
    await expect(page.locator('#lb-warnings')).toContainText(
      'The fixed step is too long for the encounter'
    );
    await expect(
      page.locator('#lb-checks tbody tr td:last-child').first()
    ).toHaveText('fail');
  });

  test('a long run is canceled between slices', async ({ page }) => {
    await openPage(page);
    await page.locator('#lb-problem').selectOption('R1');
    await page.locator('#lb-go').click();
    await expect(page.locator('#lb-status')).toHaveText(/^Running: \d+%\.$/, {
      timeout: 30_000,
    });
    await page.locator('#lb-cancel').click();
    await expect(page.locator('#lb-status')).toHaveText(
      /^(Canceled\.|Finished: canceled)/,
      { timeout: 30_000 }
    );
  });

  test('a 2-D Orbital System Builder file opens as a 3-D system and runs', async ({
    page,
  }) => {
    await openPage(page);
    await page.locator('#lb-problem').selectOption('file');
    const file = {
      format: 'gravitas.orbital-system',
      version: 1,
      bodies: [{ name: 'Sun' }, { name: 'Earth' }],
      initial: {
        G: 1,
        bodies: [
          { x: 0, y: 0, vx: 0, vy: 0, mass: 1 },
          { x: 1, y: 0, vx: 0, vy: 1, mass: 1e-6 },
        ],
      },
    };
    await page.locator('#lb-file').setInputFiles({
      name: 'system.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(file)),
    });
    await expect(page.locator('#lb-status')).toHaveText(
      /2-D Orbital System Builder file/
    );
    await page.locator('#lb-span').fill('20');
    await page.locator('#lb-samples').fill('100');
    await run(page);
    await expect(page.locator('#lb-status')).toHaveText(/^Finished: ok/);
    await expect(page.locator('#lb-checks')).toHaveText(
      'A system file has no reference to check against.'
    );
  });

  test('the speed table is measured in the Worker @cross-browser', async ({
    page,
  }) => {
    await openPage(page);
    await page.locator('#lb-bench-go').click();
    await expect(page.locator('#lb-bench tbody tr')).toHaveCount(4, {
      timeout: 60_000,
    });
    const bench = await page.evaluate(() => window.__lab3dBench);
    expect(bench['yoshida4c/10']).toBeGreaterThan(1000);
  });

  test('reads in Spanish, passes axe in both languages and fits a phone', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    for (const locale of ['en', 'es']) {
      await openPage(page, locale);
      await page.locator('#lb-problem').selectOption('R5');
      await run(page);
      if (locale === 'es')
        await expect(page.locator('#lb-title')).toHaveText(
          'Diagnóstico de dinámica en 3-D'
        );
      const wide = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth
      );
      expect(wide).toBeLessThanOrEqual(1);
      const r = await new AxeBuilder({ page }).withTags(TAGS).analyze();
      expect(r.violations.map(v => `${locale}: ${v.id}`)).toEqual([]);
    }
  });
});
