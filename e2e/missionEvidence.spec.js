// =============================================================================
// The mission lab's evidence panel, in a browser (Prompt 106)
// -----------------------------------------------------------------------------
// tests/missionEvidence.test.js holds the numbers. This walks the panel in the
// lab (/mission/lab/):
//   - a result kept becomes an evidence notebook entry (an envelope);
//   - the patched conic is drawn against the propagated flight, with a table;
//   - a mission saved to My work is listed there and reopens from ?open=;
//   - a plan link opens the plan, and an unreadable one is said so in words;
//   - the Sky Lab names where each planet's place came from;
//   - Spanish, and no axe violations in either language.
// =============================================================================

import AxeBuilder from '@axe-core/playwright';
import { test, expect } from './fixtures.js';

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'];
const NOTEBOOK = 'gravitas_evidence_notebook';

async function openLab(page, { query = '', hash = '', locale } = {}) {
  await page.addInitScript(l => {
    try {
      if (!window.sessionStorage.getItem('seen')) {
        window.localStorage.clear();
        window.sessionStorage.setItem('seen', '1');
      }
      if (l) window.localStorage.setItem('gravitas_locale', l);
    } catch {
      /* storage unavailable */
    }
  }, locale ?? null);
  await page.goto(`/mission/lab/${query}${hash}`, {
    waitUntil: 'domcontentloaded',
  });
  await expect(page.locator('html')).toHaveAttribute('data-ready', 'true', {
    timeout: 60_000,
  });
}
const openPanel = async page => {
  await expect(page.locator('#ml-evidence')).toBeEnabled({ timeout: 60_000 });
  await page.locator('#ml-evidence').click();
  await expect(page.locator('#mle-h')).toBeVisible();
};
const notebook = page =>
  page.evaluate(
    key => JSON.parse(window.localStorage.getItem(key) ?? 'null'),
    NOTEBOOK
  );

test.describe('the mission lab keeps evidence', () => {
  test('a result is kept as an envelope the report can cite', async ({
    page,
  }) => {
    await openLab(page);
    await openPanel(page);
    await page.selectOption('#mle-kind', 'budget');
    await page.locator('#mle-keep').click();
    await expect(page.locator('#mle-keep-status')).toContainText(
      'evidence notebook'
    );
    const kept = await notebook(page);
    expect(kept.entries).toHaveLength(1);
    expect(kept.entries[0].source).toBe('mission-lab');
    const env = kept.entries[0].snapshot.artifact;
    expect(env.format).toBe('gravitas.artifact');
    expect(env.source.id).toBe('mission-lab');
    expect(env.quantities.map(q => q.id)).toEqual(
      expect.arrayContaining(['dv.total', 'propellant.interplanetary'])
    );
    expect(env.warnings).toEqual(['missionModel', 'notOperational']);
    await page.goto('/my-work/');
    await expect(page.locator('#mwEvidence')).toContainText('Mission lab');
  });

  test('the patched conic is drawn against the propagated flight', async ({
    page,
  }) => {
    await openLab(page);
    await openPanel(page);
    await expect(page.locator('#mle-h ~ * svg').first()).toBeVisible();
    await expect(
      page.locator('#ml-evidence-panel table').first()
    ).toBeAttached();
  });

  test('a saved mission is listed in My work and reopens as the same plan', async ({
    page,
  }) => {
    await openLab(page);
    await openPanel(page);
    await page.locator('#mle-name').fill('Mission to Mars');
    await page.locator('#mle-save').click();
    await expect(page.locator('#mle-save-status')).toContainText('Saved');
    const id = await page.evaluate(() =>
      Object.keys(window.localStorage)
        .find(k => k.startsWith('gravitas_made_'))
        .slice('gravitas_made_'.length)
    );
    await page.goto('/my-work/');
    await expect(page.locator('#mwMade')).toContainText('Mission to Mars');
    await openLab(page, { query: `?open=${id}` });
    await expect(page.locator('#ml-status')).toHaveText(/^Done/, {
      timeout: 60_000,
    });
    await openLab(page, { query: '?open=nothere' });
    await expect(page.locator('#ml-status')).toContainText(
      'not in this browser'
    );
  });

  test('a plan link opens the plan, and a damaged one is said so', async ({
    page,
  }) => {
    const { planFragment } = await import('../js/mission/link.js');
    const { DEFAULT_PLAN } = await import('../js/mission/solar.js');
    const plan = JSON.parse(JSON.stringify(DEFAULT_PLAN));
    plan.depart.tofDays = 300;
    await openLab(page, { hash: `#${planFragment(plan)}` });
    await expect(page.locator('#ml-slider')).toHaveAttribute('max', '300');
    await page.goto('about:blank');
    await openLab(page, { hash: '#plan1.%%%' });
    await expect(page.locator('#ml-status')).toContainText('could not be read');
  });

  test('Spanish, and no axe violations in either language', async ({
    page,
  }) => {
    for (const locale of ['en', 'es']) {
      await openLab(page, { locale });
      await openPanel(page);
      const axe = await new AxeBuilder({ page }).withTags(TAGS).analyze();
      expect(axe.violations).toEqual([]);
    }
    await expect(page.locator('#mle-h')).toHaveText(/Evidencia/);
  });
});

test.describe('the Sky Lab says where a planet’s place came from', () => {
  test('the pack where it covers the date, the elements when asked', async ({
    page,
  }) => {
    await page.goto('/sky/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#skyPlanetNote')).not.toBeEmpty({
      timeout: 60_000,
    });
    await expect(page.locator('#skyPlanetNote')).toContainText(/ephemeris/i);
    await page.selectOption('#skyPlanetSource', 'elements');
    await expect(page.locator('#skyPlanetNote')).toContainText(/0\.2/);
  });
});
