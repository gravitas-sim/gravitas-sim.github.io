// =============================================================================
// The 3-D lab's evidence and observing panel, in a browser (Prompt 105)
// -----------------------------------------------------------------------------
// tests/lab3dEvidence.test.js and tests/forwardSystem3d.test.js hold the
// numbers. This walks the panel in the lab (/3d/), against the sources and
// dist/:
//   - a reading kept becomes an evidence notebook entry (an envelope), and a
//     run's event can be kept the same way;
//   - a system saved to My work reopens as the same numbers from ?open=;
//   - the system observed through a forward model: refused in words where it
//     must be, plotted with its table where it can, kept and downloadable;
//   - Spanish, and no axe violations in either language.
// =============================================================================

import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';
import { test, expect } from './fixtures.js';
import { REFERENCES } from '../js/lab3d/references.js';
import { GAUSSIAN_K, convertUnits } from '../js/lab3d/state.js';

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'];
const NOTEBOOK = 'gravitas_evidence_notebook';

/** R3 in solar units: the same orbits, with a length, a time and a mass. */
const solarR3 = () =>
  convertUnits(REFERENCES.find(r => r.id === 'R3').make().system, 'solar', {
    length: 1,
    time: 1 / GAUSSIAN_K,
    mass: 1,
  });

async function openLab(page, query = 'system=R3', locale) {
  await page.addInitScript(l => {
    try {
      if (l) window.localStorage.setItem('gravitas_locale', l);
    } catch {
      /* storage unavailable */
    }
  }, locale ?? null);
  await page.goto(`/3d/?${query}`, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('html')).toHaveAttribute('data-ready', 'true', {
    timeout: 30_000,
  });
}

const openPanel = async page => {
  await page.locator('#l3-evidence').click();
  await expect(page.locator('#l3-evidence-panel h2')).toBeVisible();
};

const notebook = page =>
  page.evaluate(
    key => JSON.parse(window.localStorage.getItem(key) ?? 'null'),
    NOTEBOOK
  );

test.describe('the 3-D lab keeps evidence and observes', () => {
  test('a reading under the view is kept as an envelope the report can cite', async ({
    page,
  }) => {
    await openLab(page);
    await page.locator('#l3-play').click(); // pause: the numbers hold still
    await openPanel(page);
    await expect(page.locator('#l3e-keep-reading')).toBeDisabled();
    await page.selectOption('#l3-tool', 'elements');
    await page.selectOption('#l3-a', '1');
    await expect(page.locator('#l3e-keep-reading')).toBeEnabled();
    await page.locator('#l3e-keep-reading').click();
    await expect(page.locator('#l3e-keep-status')).toContainText(
      'evidence notebook'
    );
    const kept = await notebook(page);
    expect(kept.entries).toHaveLength(1);
    const entry = kept.entries[0];
    expect(entry.source).toBe('lab3d');
    const env = entry.snapshot.artifact;
    expect(env.format).toBe('gravitas.artifact');
    expect(env.source.kind).toBe('simulation');
    expect(env.source.digest).toMatch(/^[0-9a-f]{8}$/);
    expect(env.quantities.map(q => q.id)).toEqual(
      expect.arrayContaining(['a', 'e', 'i', 'period'])
    );
    expect(env.provenance.context).toEqual({ page: 'lab3d' });
    // The notebook entry is plain evidence in My work as well.
    await page.goto('/my-work/');
    await expect(page.locator('#mwEvidence')).toContainText('3-D lab');
  });

  test('an event from the run can be kept too', async ({ page }) => {
    await openLab(page, 'system=R8');
    await openPanel(page);
    // The merger reference problem produces events within moments; wait for one.
    await expect
      .poll(
        () =>
          page.evaluate(
            () => document.querySelectorAll('#l3-events li').length
          ),
        { timeout: 60_000 }
      )
      .toBeGreaterThan(0);
    await page.selectOption('#l3-speed', '64');
    await expect(page.locator('#l3e-keep-event')).toBeEnabled({
      timeout: 60_000,
    });
    await page.locator('#l3e-keep-event').click();
    await expect
      .poll(async () => (await notebook(page))?.entries.length)
      .toBe(1);
  });

  test('a saved system comes back from My work as the same numbers', async ({
    page,
  }) => {
    await openLab(page, 'system=R1');
    await openPanel(page);
    await page.locator('#l3e-name').fill('A tilted Kepler orbit');
    await page.locator('#l3e-save').click();
    await expect(page.locator('#l3e-save-status')).toContainText(
      'Saved to My work'
    );
    const id = await page.evaluate(() => {
      const key = Object.keys(window.localStorage).find(k =>
        k.startsWith('gravitas_made_')
      );
      return key.slice('gravitas_made_'.length);
    });
    // My work lists it, and offers the lab's own file.
    await page.goto('/my-work/');
    await expect(page.locator('#mwMade')).toContainText(
      'A tilted Kepler orbit'
    );
    await expect(page.locator('#mwMade')).toContainText('3-D system');
    const download = page.waitForEvent('download');
    await page.locator('#mwMade button[data-made="file"]').click();
    const file = await download;
    expect(file.suggestedFilename()).toBe(
      'a-tilted-kepler-orbit.system3d.json'
    );
    const json = JSON.parse(readFileSync(await file.path(), 'utf8'));
    expect(json.format).toBe('gravitas.system3d');
    // Reopened from its record, it starts from the saved numbers: the masses
    // exactly, and the separation as the file has it (the picture's own frame
    // and the moment it is read are not the file's, but the separation of two
    // bodies is neither).
    await openLab(page, `open=${id}`);
    await page.locator('#l3-play').click();
    const after = await page.evaluate(() => window.gravitasLab3d.frame());
    expect(after.m).toEqual(json.bodies.map(b => b.m));
    const [a, b] = json.bodies.map(body => body.x);
    const gap = Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
    const seen = Math.hypot(
      after.x[0] - after.x[3],
      after.x[1] - after.x[4],
      after.x[2] - after.x[5]
    );
    expect(Math.abs(seen / gap - 1)).toBeLessThan(0.05);
  });

  test('a missing saved system is said so, and the lab still opens one', async ({
    page,
  }) => {
    await openLab(page, 'open=m0000000000');
    await expect(page.locator('#l3-notice')).toContainText('No saved system');
    await expect(page.locator('#l3-system')).toBeVisible();
  });

  test('observing: refused in words, then plotted, kept and downloadable', async ({
    page,
  }) => {
    await openLab(page, 'system=R3');
    await openPanel(page);
    // Code units name no length, time or mass.
    await page.locator('#l3e-go').click();
    await expect(page.locator('#l3e-obs-status')).toContainText('code units');
    // The same system in solar units can be observed.
    await page.selectOption('#l3-system', 'file');
    await page.setInputFiles('#l3-file', {
      name: 'r3-solar.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(solarR3())),
    });
    await expect(page.locator('html')).toHaveAttribute('data-ready', 'true');
    await page.waitForFunction(() => window.gravitasLab3d.seq >= 0);
    await page.locator('#l3-play').click();
    await page.selectOption('#l3e-model', 'radial-velocity');
    await page.locator('#l3e-go').click();
    await expect(page.locator('#l3e-plot svg')).toBeVisible();
    await expect(page.locator('#l3e-obs-status')).toContainText('200 points');
    await expect(page.locator('#l3e-truth')).toContainText('semi-amplitude');
    await page.locator('#l3e-keep-obs').click();
    await expect
      .poll(async () => (await notebook(page))?.entries.length)
      .toBe(1);
    const env = (await notebook(page)).entries[0].snapshot.artifact;
    expect(env.source.kind).toBe('forward-model');
    expect(env.quantities.find(q => q.id === 'inner.K').origin).toBe('truth');
    const download = page.waitForEvent('download');
    await page.locator('#l3e-download-obs').click();
    const file = await download;
    const obs = JSON.parse(readFileSync(await file.path(), 'utf8'));
    expect(obs.origin).toBe('synthetic');
    // A transit needs sizes, and the panel asks for them by name.
    await page.selectOption('#l3e-model', 'transit');
    await page.locator('#l3e-go').click();
    await expect(page.locator('#l3e-obs-status')).toContainText('size');
    await expect(page.locator('#l3e-size-star')).toBeVisible();
  });

  test('Spanish, and no axe violations in either language', async ({
    page,
  }) => {
    await openLab(page, 'system=R3');
    await openPanel(page);
    const en = await new AxeBuilder({ page }).withTags(TAGS).analyze();
    expect(en.violations).toEqual([]);
    await page.locator('#langSwitch button[data-lang="es"]').click();
    await expect(page.locator('#l3-evidence-panel h2')).toHaveText(
      'Evidencia y observación'
    );
    await page.locator('#l3-play').click();
    const es = await new AxeBuilder({ page }).withTags(TAGS).analyze();
    expect(es.violations).toEqual([]);
  });
});
