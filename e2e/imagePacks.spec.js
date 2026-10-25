// =============================================================================
// The image packs, in a browser (Prompt 189)
// -----------------------------------------------------------------------------
// tests/imagePacks.test.js and tools/image-packs-validate.mjs hold the numbers
// (the frames' checksums, the contracts, the authentic-frame legs against
// photutils). This holds the page: each pack opened from the Observatory's list
// with its frames file fetched only then, the quantitative frame offered
// photometry and the three pictures refused it in the contract's words, the
// hostile-PNG leg's pixel stage (variants made from the authentic Galileo frame
// chosen in the real file box and refused in time with a stable code), a
// frames file that is not the one the pack records refused, both languages, and
// every control at least 24 px at 1280 and 390.
// =============================================================================

import { test, expect } from './fixtures.js';
import { readFileSync } from 'node:fs';
import { BOUNDS, REFUSAL_CODES } from '../tools/image-import-cases.mjs';
import { variants } from '../tools/image-packs-hostile.mjs';

const FACTOR = Number(
  process.env.GRAVITAS_IMAGE_TIMING_FACTOR ?? (process.env.CI ? 2 : 1)
);
const FAILED = JSON.parse(
  readFileSync(
    new URL('../tests/fixtures/imagePacks/failed-legs.json', import.meta.url),
    'utf8'
  )
).legs;

const PACKS = [
  { fixture: 'tess-frame', id: 'tess-hd209458-s56-frame', quantitative: true },
  { fixture: 'sdo-hmi-sun', id: 'sdo-hmi-continuum-20240510' },
  { fixture: 'galileo-moon', id: 'galileo-moon-19921207' },
  { fixture: 'hirise-cerberus-fossae', id: 'hirise-cerberus-fossae' },
];

async function openPage(page, lang = 'en') {
  await page.addInitScript(l => {
    try {
      localStorage.setItem('gravitas_locale', l);
    } catch {
      /* none */
    }
  }, lang);
  await page.goto('/observatory/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('html')).toHaveAttribute('data-ready', 'true', {
    timeout: 30_000,
  });
}
async function openFixture(page, id) {
  await page.locator('#obsFixture').selectOption(id);
  await page.locator('#obsOpen').click();
  await expect(page.locator('#obsWork')).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('#obsSource')).toContainText(/Credit|Crédito/);
}
const frameRequests = page => {
  const seen = [];
  page.on('request', r => {
    if (new URL(r.url()).pathname.startsWith('/frames/'))
      seen.push(new URL(r.url()).pathname);
  });
  return seen;
};

test.describe('the four packs', () => {
  for (const lang of ['en', 'es']) {
    test(`each opens with its frames file fetched only then, credited and licensed, ${lang}`, async ({
      page,
    }) => {
      const seen = frameRequests(page);
      await openPage(page, lang);
      expect(seen, 'nothing is fetched with the page').toEqual([]);
      for (const p of PACKS) {
        await openFixture(page, p.fixture);
        expect(seen.at(-1)).toBe(`/frames/${p.id}.json`);
        // the rights decision, with the date its terms were read, is on the page
        await expect(page.locator('#obsSource')).toContainText(
          /read 2026-10-24/
        );
      }
      expect(seen).toEqual(PACKS.map(p => `/frames/${p.id}.json`));
    });
  }

  test('a frames file that is not the one the pack records is refused, and the page says so', async ({
    page,
  }) => {
    await openPage(page);
    await page.route('**/frames/galileo-moon-19921207.json', async route => {
      const res = await route.fetch();
      const body = Buffer.from(await res.body());
      body[1000] ^= 1;
      await route.fulfill({ response: res, body });
    });
    await page.locator('#obsFixture').selectOption('galileo-moon');
    await page.locator('#obsOpen').click();
    await expect(page.locator('#obsStatus, #obsLive').first()).toContainText(
      /SHA-256/,
      { timeout: 30_000 }
    );
    await expect(page.locator('#obsWork')).toBeHidden();
  });
});

test.describe('what each pack allows', () => {
  for (const p of PACKS) {
    test(`${p.fixture}: the photometry panel is ${p.quantitative ? 'offered' : 'refused in words'}`, async ({
      page,
    }) => {
      await openPage(page);
      await openFixture(page, p.fixture);
      const panel = page.locator('#obsPhotoPanel');
      await expect(panel).toBeVisible({ timeout: 30_000 });
      await panel.locator('> summary').click();
      const body = page.locator('#obsPhotoBody');
      if (p.quantitative) {
        await expect(body.locator('canvas.ph-pic')).toBeVisible({
          timeout: 30_000,
        });
        await expect(body).not.toContainText(/display-only/);
      } else {
        await expect(body).toContainText(/display-only|solo para visualizar/i, {
          timeout: 30_000,
        });
        for (const b of await body
          .getByRole('button', { name: /^(Measure|Medir)/ })
          .all())
          await expect(b).toBeDisabled();
      }
    });
  }
});

test.describe('controls', () => {
  for (const [w, h] of [
    [1280, 800],
    [390, 844],
  ])
    test(`every control of the opened TESS frame is at least 24 px at ${w}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: w, height: h });
      await openPage(page);
      await openFixture(page, 'tess-frame');
      await page.locator('#obsPhotoPanel > summary').click();
      await expect(page.locator('#obsPhotoBody canvas.ph-pic')).toBeVisible({
        timeout: 30_000,
      });
      const small = await page
        .locator('#obsWork')
        .locator('button, input, select, summary')
        .evaluateAll(els =>
          els
            .filter(e => e.offsetParent !== null)
            .map(e => [
              e.id || e.textContent.trim().slice(0, 20),
              e.getBoundingClientRect(),
            ])
            .filter(([, r]) => r.width > 0 && (r.width < 24 || r.height < 24))
            .map(
              ([n, r]) => `${n} ${Math.round(r.width)}x${Math.round(r.height)}`
            )
        );
      expect(small).toEqual([]);
    });
});

test.describe('the hostile PNG leg, pixel stage', () => {
  test('every variant made from the authentic Galileo frame is refused with a stable code in time, or read where the contract says so', async ({
    page,
  }) => {
    test.setTimeout(240_000);
    await openPage(page);
    const panel = page.locator('#obsImageImport');
    const slowest = { ms: 0, name: '' };
    const verdicts = [];
    for (const [name, expect_, stage, build] of variants()) {
      await panel.evaluate(n => n.replaceChildren());
      const t0 = Date.now();
      await page.locator('#obsFile').setInputFiles({
        name: 'moon.png',
        mimeType: 'application/octet-stream',
        buffer: Buffer.from(build()),
      });
      const alert = panel.locator('[data-code]');
      const opened = panel.locator('#obsImpFields, #obsImpUses');
      await expect(alert.or(opened).first(), name).toBeVisible({
        timeout: 20_000,
      });
      const ms = Date.now() - t0;
      if (ms > slowest.ms) Object.assign(slowest, { ms, name });
      const code = (await alert.count())
        ? await alert.getAttribute('data-code')
        : null;
      const id = `import.hostilePng.${name.replace(/[^A-Za-z0-9]+/g, '-').replace(/-$/, '')}`;
      // what the contract expects, unless the leg is recorded as failed
      // (a recorded failure is held to the outcome it was recorded with)
      const failed =
        FAILED[id] ?? FAILED[id.replace('hostilePng.', 'hostilePng.page.')];
      const wants = failed ? (expect_ === 'read' ? 'refuse' : 'read') : expect_;
      verdicts.push({ name, stage, wants, code });
      test.info().annotations.push({
        type: 'variant',
        description: `${name}: ${code ?? 'read'} (${ms} ms)`,
      });
    }
    // every variant, reported before any is judged
    for (const v of verdicts)
      expect
        .soft(
          {
            name: v.name,
            ok:
              v.wants === 'read'
                ? v.code === null
                : v.code !== null && REFUSAL_CODES.includes(v.code),
          },
          `${v.name}: ${v.code ?? 'read'}`
        )
        .toEqual({ name: v.name, ok: true });
    expect(slowest.ms, `slowest: ${slowest.name}`).toBeLessThan(
      BOUNDS.refusalMsPage * FACTOR
    );
  });
});
