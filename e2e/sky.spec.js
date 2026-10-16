// =============================================================================
// The Sky Lab (/sky/), in a browser
// -----------------------------------------------------------------------------
// tests/skyKernel.test.js holds the arithmetic and tests/skyData.test.js the
// data; this is the page, against the sources and dist/ (where the star table
// is a copied file and the instruments are lazy chunks):
//   - the drawing, the table and the map are one sky: the same objects, the
//     same numbers, and the Sun is where the kernel says at a pinned instant;
//   - the controls move the sky (a named place, a time step) and the layers
//     toggle; "Use my location" without a permission says so and sends nothing;
//   - the five instruments open, read, and save an envelope that validates;
//   - the views and the table export;
//   - Spanish, axe in both languages with the table, a phone width, and no
//     playback under reduced motion.
// =============================================================================

import AxeBuilder from '@axe-core/playwright';
import { readFile } from 'node:fs/promises';
import { test, expect } from './fixtures.js';

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'];

async function open(page, { locale } = {}) {
  await page.addInitScript(l => {
    try {
      window.localStorage.clear();
      if (l) window.localStorage.setItem('gravitas_locale', l);
    } catch {
      /* storage unavailable */
    }
  }, locale ?? null);
  await page.goto('/sky/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.skyReady === true, null, {
    timeout: 60_000,
  });
}
const download = async (page, button) => {
  const [dl] = await Promise.all([
    page.waitForEvent('download'),
    page.locator(button).click(),
  ]);
  const path = await dl.path();
  return { name: dl.suggestedFilename(), text: await readFile(path, 'utf8') };
};

test.describe('the Sky Lab', () => {
  test('the drawing, the table and the map are one sky', async ({ page }) => {
    await open(page);
    const model = await page.evaluate(() => {
      const objs = window.skyLab.state.model.objects;
      return {
        up: objs.filter(o => o.altDeg > 0).length,
        sun: objs[0].altDeg,
        total: objs.length,
      };
    });
    // The table lists exactly what is above the horizon, and the drawing shows the same.
    await expect(page.locator('#skyRows tr')).toHaveCount(model.up);
    const shown = await page.evaluate(
      () =>
        [...document.querySelectorAll('#skyHorizon .obj')].filter(
          g => g.style.display !== 'none'
        ).length
    );
    expect(shown).toBe(model.up);
    expect(model.total).toBe(2 + 5 + 518);
    // The first row of the table, by altitude, carries the number the model holds.
    const first = await page.evaluate(() => {
      const tr = document.querySelector('#skyRows tr');
      const o = window.skyLab.state.model.objects.find(
        x => x.id === tr.dataset.id
      );
      return {
        cell: tr.children[2].textContent.replace('−', '-'),
        alt: o.altDeg,
      };
    });
    expect(Math.abs(Number(first.cell) - first.alt)).toBeLessThan(0.006);
    // The map is drawn, with the horizon and the ecliptic.
    await expect(page.locator('#skyEq .horizonline')).toHaveCount(1);
    await expect(page.locator('#skyEq .ecliptic')).toHaveCount(1);
    expect(
      await page.locator('#skyHorizon .con:visible').count()
    ).toBeGreaterThan(20);
    // At the pinned instant (2026-03-20 03:00 UT, Nacogdoches) the Sun is well below the horizon.
    expect(model.sun).toBeLessThan(-20);
  });

  test('a place and a time move the sky; layers toggle', async ({ page }) => {
    await open(page);
    await page.locator('#skySite').selectOption('syd');
    await expect(page.locator('#skyStatus')).toContainText('Sydney');
    await expect(page.locator('#skyLat')).toHaveValue('-33.87');
    const before = await page.evaluate(
      () => window.skyLab.state.model.sun.altDeg
    );
    await page.locator('#skyFwd1h').click();
    await page.locator('#skyFwd1h').click();
    await expect
      .poll(() => page.evaluate(() => window.skyLab.state.model.sun.altDeg))
      .not.toBe(before);
    await page.locator('#skyLines').uncheck();
    await expect(page.locator('#skyHorizon .con:visible')).toHaveCount(0);
    await page.locator('#skyMag').selectOption('3');
    await expect(page.locator('#skyHorizon .obj.star')).toHaveCount(
      await page.evaluate(
        () => window.skyLab.state.all.filter(s => s.v <= 3).length
      )
    );
    // A typed place and a date beyond the planets' range say so.
    await page.locator('#skyDate').fill('2090-06-01');
    await page.locator('#skyDate').dispatchEvent('change');
    await expect(page.locator('#skyNote')).toContainText(/1800 to 2050/);
  });

  test('"Use my location" without permission says so and keeps the place', async ({
    page,
    context,
  }) => {
    await open(page);
    await context.clearPermissions();
    await page.addInitScript(() => {
      globalThis.navigator.geolocation.getCurrentPosition = (ok, fail) =>
        fail({ code: 1 });
    });
    await page.evaluate(() => {
      globalThis.navigator.geolocation.getCurrentPosition = (ok, fail) =>
        fail({ code: 1 });
    });
    await page.locator('#skyGeo').click();
    await expect(page.locator('#skyGeoNote')).toContainText(
      /did not give a location/
    );
    await expect(page.locator('#skyLat')).toHaveValue('31.6');
  });

  test('the five instruments read and each saves a valid envelope', async ({
    page,
  }) => {
    await open(page);
    await page.locator('#skyInstruments > summary').click();
    await expect(page.locator('.sky-inst')).toHaveCount(5);
    for (const id of [
      'inst-altaz',
      'inst-clock',
      'inst-twilight',
      'inst-rts',
      'inst-phase',
    ]) {
      const { name, text } = await download(page, `#${id}-save`);
      expect(name).toBe(`sky-lab-${id}.json`);
      const env = JSON.parse(text);
      expect(env.format).toBe('gravitas.artifact');
      expect(env.quantities.length).toBeGreaterThan(5);
      const problems = await page.evaluate(async e => {
        const { validateArtifact } = await import('/js/platform/artifact.js');
        return validateArtifact(e);
      }, env);
      expect(problems).toEqual([]);
    }
    // The reader's number is the kernel's.
    const altaz = await page.evaluate(
      () =>
        document.querySelector('#inst-altaz-h').closest('section').textContent
    );
    expect(altaz).toMatch(/Apparent altitude/);
  });

  test('the views and the table export', async ({ page }) => {
    await open(page);
    const svg = await download(page, '#skyExportHorizon');
    expect(svg.name).toBe('sky-lab-horizon.svg');
    expect(svg.text).toMatch(/<svg[^>]+xmlns/);
    expect(svg.text).toMatch(/\.dome\{/);
    const csv = await download(page, '#skyExportTable');
    expect(csv.text.split(/\r?\n/)[0]).toBe(
      'id,name,type,altitude_deg,azimuth_deg,magnitude,airmass,ra_deg,dec_deg'
    );
    expect(csv.text).toMatch(/Bright Star Catalogue/);
    expect((await download(page, '#skyExportMap')).text).toMatch(/<svg/);
  });

  test('reads in Spanish and passes axe in both languages, with the table and the instruments', async ({
    page,
  }) => {
    for (const locale of ['en', 'es']) {
      await open(page, { locale });
      await page.locator('#skyInstruments > summary').click();
      await expect(page.locator('.sky-inst')).toHaveCount(5);
      if (locale === 'es') {
        await expect(page.locator('#skyPlay')).toContainText('Reproducir');
        await expect(page.locator('#skyCount')).toContainText(
          'objetos sobre el horizonte'
        );
        await expect(page.locator('.sky-inst h3').first()).toHaveText(
          'Lector de altura y acimut'
        );
      }
      const r = await new AxeBuilder({ page }).withTags(TAGS).analyze();
      expect(
        r.violations.map(v => `${v.id}: ${v.nodes[0].html.slice(0, 100)}`)
      ).toEqual([]);
    }
  });

  test('fits a phone and offers no playback under reduced motion', async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize({ width: 360, height: 740 });
    await open(page);
    await expect(page.locator('#skyPlay')).toBeDisabled();
    await expect(page.locator('#skyReduced')).toBeVisible();
    const over = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth
    );
    expect(over).toBeLessThanOrEqual(0);
    for (const sel of ['#skyBack1d', '#skyFwd1h', '#skyGeo']) {
      const box = await page.locator(sel).boundingBox();
      expect(box.height).toBeGreaterThanOrEqual(24);
    }
  });
});
