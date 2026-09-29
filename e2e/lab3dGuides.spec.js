// =============================================================================
// The 3-D curriculum's guided investigations, in a browser
// -----------------------------------------------------------------------------
// tests/lab3dGuides.test.js checks the guides' rules, words, key and physics.
// This walks them in the lab (/3d/), against the sources and dist/:
//   - the chooser opens from the page, and a guide from its link;
//   - the orbit's plane, walked with the lab's own readings;
//   - an eclipse lost to half a degree, and a drawn size that lies;
//   - equal inclinations that are not one plane;
//   - a Kozai-Lidov peak kept by the reader, and the quantity that holds;
//   - the report is a file, the same file for the same answers;
//   - progress survives a reload, and every step works with no WebGL;
//   - with the service worker installed, a guide opens offline (sources);
//   - Spanish, no axe violations in either language, and a phone width.
// =============================================================================

import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';
import process from 'node:process';
import { test, expect } from './fixtures.js';

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'];
const DIST = process.env.GRAVITAS_E2E_TARGET === 'dist';

async function openGuide(page, guide, { path = 'intro', locale } = {}) {
  await page.addInitScript(l => {
    try {
      if (l) window.localStorage.setItem('gravitas_locale', l);
    } catch {
      /* storage unavailable */
    }
  }, locale ?? null);
  await page.goto(`/3d/?guide=${guide}&path=${path}`, {
    waitUntil: 'domcontentloaded',
  });
  await expect(page.locator('html')).toHaveAttribute('data-ready', 'true', {
    timeout: 30_000,
  });
  await expect(page.locator('#l3-guide h2')).toBeVisible();
}

const say = page => page.locator('#l3-guide-say');
const next = page => page.locator('#l3-guide-next').click();
const title = page => page.locator('#l3-guide h2');
const doIt = page => page.locator('#l3-guide-do').click();
const choose = async (page, option) => {
  await page
    .locator(`input[name="l3-guide-choice"][value="${option}"]`)
    .check();
  await page.locator('#l3-guide-choose').click();
};
const answer = async (page, text) => {
  await page.locator('#l3-guide-input').fill(String(text));
  await page.locator('#l3-guide-check').click();
};
const pause = async page => {
  if (await page.evaluate(() => window.gravitasLab3d.playing))
    await page.locator('#l3-play').click();
  await expect
    .poll(() => page.evaluate(() => window.gravitasLab3d.playing))
    .toBe(false);
};
/** A cell of the orbits table, by body and column index, as the page prints it. */
const orbitCell = async (page, body, col) => {
  await page.locator('#l3-refresh').click();
  const row = page.locator('#l3-elements tbody tr', {
    has: page.locator('th', { hasText: new RegExp(`^${body}$`) }),
  });
  return (await row.locator('td').nth(col).innerText())
    .replace(/[^\d.,−-]/g, '')
    .replace('−', '-');
};

test.describe('the 3-D lab’s guided investigations', () => {
  test('the chooser opens from the page, and lists the four @cross-browser', async ({
    page,
  }) => {
    await page.goto('/3d/?system=R1', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('html')).toHaveAttribute('data-ready', 'true', {
      timeout: 30_000,
    });
    await page.locator('#l3-guides').click();
    await expect(page.locator('#l3-guide h2')).toHaveText(
      'Guided investigations'
    );
    await expect(
      page.locator('#l3-guide button[data-path="intro"]')
    ).toHaveCount(4);
    await page
      .locator('#l3-guide button[data-guide="l3-mutual"][data-path="advanced"]')
      .click();
    await expect(page.locator('#l3-guide')).toContainText(
      'step 1 of 15, advanced path'
    );
    expect(new URL(page.url()).searchParams.get('guide')).toBe('l3-mutual');
  });

  test('an orbit’s plane, walked with the lab’s own readings', async ({
    page,
  }) => {
    await openGuide(page, 'l3-planes');
    await next(page);
    await choose(page, 'same');
    await expect(say(page)).toContainText('Recorded');
    await next(page);
    await doIt(page);
    await expect(say(page)).toHaveText(
      'You are looking straight down onto the reference plane.'
    );
    await next(page);
    await doIt(page);
    await expect(say(page)).toContainText('One full orbit', {
      timeout: 30_000,
    });
    await next(page);
    await choose(page, 'same');
    await expect(say(page)).toContainText('Look again');
    await choose(page, 'narrower');
    await expect(say(page)).toContainText('Right.');
    await next(page);
    await doIt(page);
    await expect(say(page)).toContainText(
      'The orbit instrument is on the secondary.'
    );
    await pause(page);
    await next(page);
    await answer(page, await orbitCell(page, 'secondary', 3));
    await expect(say(page)).toContainText('Right: 40°');
    await next(page);
    await answer(page, '120');
    await expect(say(page)).toContainText('Not quite');
    await answer(page, await orbitCell(page, 'secondary', 4));
    await expect(say(page)).toContainText('Right: 30°');
    await next(page);
    await doIt(page);
    await expect(page.locator('#l3-preset')).toHaveValue('edgeOn');
    await next(page);
    await choose(page, 'line');
    await expect(say(page)).toContainText('Right');
    await next(page);
    await expect(title(page)).toHaveText('What a flat model keeps, and loses');
    // The progress list says which passed.
    await expect(page.locator('nav li[data-status="passed"]')).toHaveCount(8);
  });

  test('an eclipse lost to half a degree, and a drawn size that lies', async ({
    page,
  }) => {
    await openGuide(page, 'l3-eclipse', { path: 'advanced' });
    await next(page);
    await doIt(page);
    await expect(say(page)).toContainText('edge-on');
    await expect(page.locator('#l3-reading')).toContainText(
      'Seen from here, Planet is'
    );
    await next(page);
    await choose(page, 'yes');
    await next(page);
    await doIt(page);
    await expect(page.locator('#l3-system')).toHaveValue('tilt-05');
    await next(page);
    await answer(page, '1,745');
    await expect(say(page)).toContainText('impact parameter');
    await next(page);
    await choose(page, 'no');
    await expect(say(page)).toContainText('Half a degree was enough');
    await next(page);
    await doIt(page);
    await expect(page.locator('#l3-size')).toHaveValue('radius10');
    await expect(page.locator('#l3-legend')).toContainText(
      '10 times their radius'
    );
    await expect(say(page)).toContainText('gone round once', {
      timeout: 60_000,
    });
    await next(page);
    await choose(page, 'yes');
    await expect(say(page)).toContainText('and there is no eclipse');
    await next(page);
    await doIt(page);
    await next(page);
    await answer(page, '0.698');
    await expect(say(page)).toContainText('0.70');
    await next(page);
    await choose(page, 'yes');
    await next(page);
    await answer(page, '0.315');
    await expect(say(page)).toContainText('0.32°');
  });

  test('equal inclinations that are not one plane', async ({ page }) => {
    await openGuide(page, 'l3-mutual');
    await next(page);
    await doIt(page);
    await next(page);
    await answer(page, '10');
    await expect(say(page)).toContainText('Right');
    await next(page);
    await answer(page, '10');
    await next(page);
    await choose(page, 'same');
    await next(page);
    await doIt(page);
    const reading = page.locator('#l3-reading');
    await expect(reading).toContainText('are inclined to each other by');
    const angle = (await reading.innerText()).match(/by ([\d.]+)°/)[1];
    expect(Number(angle)).toBeCloseTo(14.11, 1);
    await next(page);
    await answer(page, angle);
    await expect(say(page)).toContainText('14.1°');
    await next(page);
    await choose(page, 'different');
    await expect(say(page)).toContainText('Right.');
    await next(page);
    await doIt(page);
    await expect(page.locator('#l3-system')).toHaveValue('R3');
    await expect(reading).toContainText(/by 1\.2\d+°/);
  });

  test('a Kozai-Lidov peak kept by the reader, and the quantity that holds', async ({
    page,
  }) => {
    test.setTimeout(180_000);
    await openGuide(page, 'l3-kozai');
    await next(page);
    await doIt(page);
    await expect(say(page)).toContainText('orbit instrument on the particle');
    await pause(page);
    await next(page);
    await page.locator('#l3-guide-keep').click();
    await expect(say(page)).toContainText('The starting moment is kept.');
    await next(page);
    await answer(page, await orbitCell(page, 'particle', 2));
    await expect(say(page)).toContainText('Right: 0.01');
    await next(page);
    await answer(page, await orbitCell(page, 'particle', 3));
    await expect(say(page)).toContainText('Right: 65°');
    await next(page);
    await choose(page, 'returns');
    await next(page);
    await doIt(page);
    // Play until the particle's eccentricity is large, then pause and keep.
    await expect
      .poll(
        () =>
          page.evaluate(() => {
            const f = window.gravitasLab3d.frame();
            const e = [0, 1, 2].map(k => f.x[6 + k] - f.x[k]);
            const u = [0, 1, 2].map(k => f.v[6 + k] - f.v[k]);
            const r = Math.hypot(...e);
            const h = [
              e[1] * u[2] - e[2] * u[1],
              e[2] * u[0] - e[0] * u[2],
              e[0] * u[1] - e[1] * u[0],
            ];
            const cross = [
              u[1] * h[2] - u[2] * h[1],
              u[2] * h[0] - u[0] * h[2],
              u[0] * h[1] - u[1] * h[0],
            ];
            return Math.hypot(...cross.map((c, k) => c - e[k] / r));
          }),
        { timeout: 120_000, intervals: [500] }
      )
      .toBeGreaterThan(0.75);
    await pause(page);
    await page.locator('#l3-guide-keep').click();
    await expect(say(page)).toContainText('e well above its start');
    await next(page);
    const e = await orbitCell(page, 'particle', 2);
    await answer(page, e);
    await expect(say(page)).toContainText('over 0.8');
    await next(page);
    const i = await orbitCell(page, 'particle', 3);
    await answer(page, i);
    await expect(say(page)).toContainText('traded tilt for eccentricity');
    await next(page);
    await choose(page, 'returns');
    await next(page);
    await answer(
      page,
      (Math.sqrt(1 - 0.01 ** 2) * Math.cos((65 * Math.PI) / 180)).toFixed(4)
    );
    await expect(say(page)).toContainText('0.423');
    await next(page);
    const eN = Number(e.replace(',', '.'));
    const iN = Number(i.replace(',', '.'));
    await answer(
      page,
      (Math.sqrt(1 - eN * eN) * Math.cos((iN * Math.PI) / 180)).toFixed(4)
    );
    await expect(say(page)).toHaveText('Right.');
    await next(page);
    await choose(page, 'same');
    await expect(say(page)).toContainText(
      'exchanged between the orbit’s direction and its shape'
    );
  });

  test('the report is a file, the same file for the same answers, and progress survives a reload', async ({
    page,
  }) => {
    await openGuide(page, 'l3-mutual');
    await next(page);
    await doIt(page);
    await next(page);
    await answer(page, '10');
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('#l3-guide')).toContainText('step 3 of 13');
    await expect(page.locator('#l3-guide-input')).toHaveValue('10');
    await page.locator('nav button[data-at="12"]').click();
    await page.locator('#l3-guide-finish').click();
    await expect(title(page)).toHaveText('Your report');
    await page.locator('#l3-guide-name').fill('A. Student');
    const save = async () => {
      const [d] = await Promise.all([
        page.waitForEvent('download'),
        page.locator('#l3-guide-save').click(),
      ]);
      expect(d.suggestedFilename()).toBe('l3-mutual-intro.report.json');
      return readFileSync(await d.path(), 'utf8');
    };
    const one = await save();
    const two = await save();
    expect(two).toBe(one);
    const r = JSON.parse(one);
    expect(r).toMatchObject({
      format: 'gravitas.lab3d-guide-report',
      guide: 'l3-mutual',
      path: 'intro',
      name: 'A. Student',
    });
    const b = r.steps.find(s => s.step === 'inclination-b');
    expect(b).toMatchObject({ typed: '10', passed: true });
    // The lab's own value: the two planets tug each other a little.
    expect(b.expected).toBeCloseTo(10, 4);
  });

  test('with no WebGL every step still works, from the tables @cross-browser', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      const real = window.HTMLCanvasElement.prototype.getContext;
      window.HTMLCanvasElement.prototype.getContext = function (kind, ...rest) {
        if (/webgl/.test(kind)) return null;
        return real.call(this, kind, ...rest);
      };
    });
    await openGuide(page, 'l3-planes');
    expect(await page.evaluate(() => window.gravitasLab3d.webgl)).toBe(false);
    for (let n = 0; n < 5; n++) await next(page);
    await doIt(page);
    await pause(page);
    await next(page);
    await answer(page, await orbitCell(page, 'secondary', 3));
    await expect(say(page)).toContainText('Right: 40°');
  });

  test('reads in Spanish, passes axe in both languages and fits a phone', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    for (const locale of ['en', 'es']) {
      await openGuide(page, 'l3-eclipse', { locale });
      await next(page);
      if (locale === 'es')
        await expect(title(page)).toHaveText(
          'Una órbita en el plano de referencia, vista a lo largo de él'
        );
      await pause(page);
      const wide = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth
      );
      expect(wide).toBeLessThanOrEqual(1);
      const r = await new AxeBuilder({ page }).withTags(TAGS).analyze();
      // The next language starts the guide afresh.
      await page.evaluate(() => {
        for (const k of Object.keys(window.localStorage))
          if (k.startsWith('gravitas_lab3d_guide_'))
            window.localStorage.removeItem(k);
      });
      expect(
        r.violations.map(
          v => `${locale}: ${v.id} ${v.nodes.map(n => n.target).join(' ')}`
        )
      ).toEqual([]);
    }
  });
});

test.describe('the 3-D lab’s guides offline', () => {
  test.use({ serviceWorkers: 'allow' });

  test('with the service worker installed, a guide opens offline', async ({
    page,
    context,
    app,
  }) => {
    test.skip(DIST, 'the service worker is the sources’; dist/ has its own');
    test.setTimeout(180_000);
    await app.boot();
    await expect
      .poll(
        () =>
          page.evaluate(async () => {
            const m = await import('/js/offline.js');
            const s = await m.cacheStatus(2000);
            return s && s.cachedCount >= s.precacheCount;
          }),
        { timeout: 120_000, intervals: [500] }
      )
      .toBe(true);
    await context.setOffline(true);
    await openGuide(page, 'l3-eclipse');
    await next(page);
    await doIt(page);
    await expect(say(page)).toContainText('edge-on');
  });
});
