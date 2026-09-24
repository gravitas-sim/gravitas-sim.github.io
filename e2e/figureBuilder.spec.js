// =============================================================================
// The figure builder (/figure/)
// -----------------------------------------------------------------------------
// An author brings a Gravitas state, chooses how the figure opens and looks,
// sees it live and copies the markup. What is held here is what the author
// relies on: the preview is the figure the markup describes, every choice
// reaches the embed URL and nothing typed becomes markup, a bad link or origin
// says so, the page works from the keyboard and in Spanish, and Gravitas's
// Share dialog hands its state over.
//
// Runs against the sources and dist/ (playwright.config.js, BOTH_TARGETS).
// =============================================================================

import { test, expect } from './fixtures.js';
import { decodePayload, encodePayload } from '../js/shareState.js';

test.use({ permissions: ['clipboard-read', 'clipboard-write'] });

let fragment;
test.beforeAll(async () => {
  fragment = await encodePayload({ v: 1, s: 'Binary Pair', seed: 'e2e' });
});

async function openBuilder(page, hash = '') {
  await page.addInitScript(() => {
    try {
      localStorage.setItem('gravitas_locale', 'en');
    } catch {
      /* English is the default anyway */
    }
  });
  await page.goto(`/figure/${hash}`);
  await expect(page.locator('#fbMarkup')).not.toHaveValue('', {
    timeout: 30_000,
  });
}

const markup = page => page.locator('#fbMarkup').inputValue();
const srcOf = html =>
  /<iframe src="([^"]+)"/.exec(html)?.[1].replace(/&amp;/g, '&');

test('a pasted Share link becomes a preview, markup and a plain link', async ({
  page,
  baseURL,
}) => {
  await openBuilder(page);
  await page.locator('#fbLink').fill(`${baseURL}/#${fragment}`);
  await expect(page.locator('#fbLinkStatus')).toContainText('Binary Pair');
  // The builder encodes the state again, and may choose a different encoding
  // for the same payload, so what is compared is what the fragment decodes to.
  const described = async () => {
    const src = srcOf(await markup(page));
    return src ? decodePayload(new URL(src).hash) : null;
  };
  await expect.poll(described).toEqual({ v: 1, s: 'Binary Pair', seed: 'e2e' });

  const html = await markup(page);
  const src = srcOf(html);
  const origin = new URL(baseURL).origin;
  expect(src.startsWith(`${origin}/?embed=1&ev=1`)).toBe(true);
  const plain = await page.locator('#fbUrl').inputValue();
  expect(plain).toBe(`${origin}/${new URL(src).hash}`);

  // The preview is the figure the markup describes.
  const frameEl = page.locator('#fbPreview');
  await expect(frameEl).toHaveAttribute('src', src);
  const frame = await (await frameEl.elementHandle()).contentFrame();
  await frame.waitForFunction(() => window.splashScreenEnded === true, null, {
    timeout: 60_000,
  });
  await expect(frame.locator('#simulationCanvas')).toBeVisible();
});

test('every choice reaches the embed URL, and nothing typed becomes markup', async ({
  page,
}) => {
  await openBuilder(page);
  await page.locator('#fbLang').selectOption('es');
  await page.locator('#fbTheme').selectOption('daylight');
  await page.locator('#fbAspect').selectOption('4:3');
  await page.locator('#fbReset').selectOption('scenario');
  await page.locator('#fbControls').uncheck();
  await page.locator('#fbMotion').check();
  await page.locator('#fbQuality').check();
  await page.locator('input[name="fbStart"][value="paused"]').check();
  await page.locator('#fbOrigin').fill('https://course.example.edu');
  await page.locator('#fbTitle').fill('Orbits <script>alert(1)</script>');
  await page
    .locator('#fbCaption')
    .fill('Two stars & a planet <img src=x onerror=alert(1)>');

  await expect
    .poll(async () => srcOf(await markup(page)))
    .toContain('parent=https%3A%2F%2Fcourse.example.edu');
  const html = await markup(page);
  const url = new URL(srcOf(html));
  expect([...url.searchParams]).toEqual([
    ['embed', '1'],
    ['ev', '1'],
    ['lang', 'es'],
    ['theme', 'daylight'],
    ['controls', 'none'],
    ['motion', 'reduced'],
    ['quality', 'low'],
    // reset=scenario is the contract's default, so it is left out.
    ['parent', 'https://course.example.edu'],
  ]);
  // Paused is the share state's to say, not the query string's.
  expect((await decodePayload(url.hash)).p).toBe(1);
  expect(html).not.toMatch(/<script|<img/);
  expect(html).toContain('Orbits &lt;script&gt;alert(1)&lt;/script&gt;');
  expect(html).toContain('&amp; a planet &lt;img src=x onerror=alert(1)&gt;');
  expect(html).toMatch(/padding-top:75\.0000%/);
});

test('a bad link, seed or origin says so, and writes nothing from it', async ({
  page,
}) => {
  await openBuilder(page);
  await page.locator('#fbLink').fill('https://evil.example/page');
  await expect(page.locator('#fbLinkStatus')).toContainText('not a Gravitas');
  await expect(page.locator('#fbMarkup')).toHaveValue('');

  await page
    .locator('#fbLink')
    .fill('https://gravitas-sim.github.io/#1zNotAState');
  await expect(page.locator('#fbLinkStatus')).toContainText(
    'could not be read'
  );
  await expect(page.locator('#fbMarkup')).toHaveValue('');

  await page.locator('#fbLink').fill('');
  await page.locator('#fbSeed').fill('no spaces allowed');
  await expect(page.locator('#fbLinkStatus')).toContainText(
    'letters and digits'
  );
  await page.locator('#fbSeed').fill('lab-7');
  await expect(page.locator('#fbMarkup')).not.toHaveValue('');

  await page.locator('#fbOrigin').fill('http://course.example.edu/page');
  await expect(page.locator('#fbOriginStatus')).toContainText('An origin is');
  expect(srcOf(await markup(page))).not.toContain('parent=');
});

test('works from the keyboard alone, and copies what it made', async ({
  page,
}) => {
  await openBuilder(page);
  await page.locator('#fbLink').focus();
  // Forward through the form to the scenario and seed, then to the start
  // choice, changing things only with keys.
  await page.keyboard.press('Tab'); // scenario
  await expect(page.locator('#fbScenario')).toBeFocused();
  await page.keyboard.press('Tab'); // seed
  await page.keyboard.press('Control+A');
  await page.keyboard.type('kbd1');
  await page.keyboard.press('Tab'); // the running/paused group
  await page.keyboard.press('ArrowRight');
  await expect(
    page.locator('input[name="fbStart"][value="paused"]')
  ).toBeChecked();
  await expect(page.locator('#fbLinkStatus')).toContainText('kbd1');

  await page.locator('#fbCopyMarkup').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#fbCopyStatus')).toHaveText('Copied.');
  expect(await page.evaluate(() => window.navigator.clipboard.readText())).toBe(
    await markup(page)
  );
});

test('in Spanish, the page and the figure it writes', async ({ page }) => {
  await openBuilder(page);
  await page.getByRole('button', { name: 'Español' }).click();
  await expect(page.locator('h1')).toHaveText('Crea una figura interactiva');
  await expect(page.locator('html')).toHaveAttribute('lang', 'es');
  await page.locator('#fbTitle').fill('');
  await expect
    .poll(() => markup(page))
    .toContain('title="Simulación de Gravitas: ');
  await expect(page.locator('#fbLinkStatus')).toContainText('semilla');
});

test('the Share dialog hands its state to the builder', async ({
  page,
  app,
}) => {
  await app.boot();
  await app.railControl('shareBtn');
  await page.locator('#shareBtn').click();
  const link = page.locator('#shareFigureLink');
  await expect(link).toBeVisible();
  await expect(link).toHaveAttribute('href', /\/figure\/#\d+[zr]/);
  const href = await link.getAttribute('href');
  await page.goto(href);
  await expect(page.locator('#fbLink')).toHaveValue(/#\d+[zr]/);
  await expect(page.locator('#fbLinkStatus')).not.toHaveClass(/is-error/);
  await expect(page.locator('#fbMarkup')).toHaveValue(/<iframe src=/, {
    timeout: 30_000,
  });
});
