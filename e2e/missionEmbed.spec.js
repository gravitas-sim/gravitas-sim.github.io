// =============================================================================
// The mission lab as an embedded figure (Prompt 106), in a browser
// -----------------------------------------------------------------------------
// js/mission/lab/address.js under the gravitas-embed/1 contract; the bridge is
// the 3-D lab's (js/lab3d/embed.js). The parent here is the lab's own page:
//   - the figure is the timeline slider and the views, and nothing of the page;
//   - without a parent origin it announces readiness and listens to nobody;
//   - with one, ping, play, pause and reset are answered, `load` is refused as
//     an unknown request;
//   - the figure builder makes a mission figure from a lab link, and only from
//     one;
//   - no axe violations inside the frame.
// =============================================================================

import AxeBuilder from '@axe-core/playwright';
import { test, expect } from './fixtures.js';

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'];

async function frameFigure(page, query) {
  await page.goto('/mission/lab/', { waitUntil: 'domcontentloaded' });
  await page.evaluate(q => {
    window.__heard = [];
    window.addEventListener('message', e => window.__heard.push(e.data));
    const f = document.createElement('iframe');
    f.id = 'figure';
    f.title = 'figure';
    f.style.cssText = 'width:720px;height:640px';
    f.src = `/mission/lab/?embed=1&${q.replace('PARENT', location.origin)}`;
    document.body.append(f);
  }, query);
  const frame = page.frameLocator('#figure');
  await expect(frame.locator('html')).toHaveAttribute('data-ready', 'true', {
    timeout: 60_000,
  });
  return frame;
}
const heard = page => page.evaluate(() => window.__heard);
const send = (page, data) =>
  page.evaluate(
    d => document.getElementById('figure').contentWindow.postMessage(d, '*'),
    { protocol: 'gravitas-embed', version: 1, ...data }
  );

test.describe('the mission lab as an embedded figure', () => {
  test('it is the slider and the views, and nothing of the page', async ({
    page,
  }) => {
    const frame = await frameFigure(page, 'ev=1');
    await expect(frame.locator('#ml-slider')).toBeVisible();
    await expect(frame.locator('#ml-views')).toBeVisible();
    await expect(frame.locator('#ml-evidence')).toBeHidden();
    await expect(frame.locator('#ml-go')).toBeHidden();
    await expect(frame.locator('.gs-shell')).toBeHidden();
  });

  test('controls=none and lang=es do what they say', async ({ page }) => {
    const frame = await frameFigure(page, 'ev=1&controls=none&lang=es');
    await expect(frame.locator('#ml-slider')).toBeHidden();
    await expect(frame.locator('html')).toHaveAttribute('lang', 'es');
  });

  test('without a parent origin it says it is ready and listens to nobody', async ({
    page,
  }) => {
    await frameFigure(page, 'ev=1');
    await expect.poll(() => heard(page)).toHaveLength(1);
    expect((await heard(page))[0]).toMatchObject({
      protocol: 'gravitas-embed',
      type: 'ready',
      requests: [],
    });
    await send(page, { type: 'ping' });
    await page
      .frameLocator('#figure')
      .locator('html')
      .evaluate(
        () =>
          new Promise(done =>
            window.requestAnimationFrame(() =>
              window.requestAnimationFrame(done)
            )
          )
      );
    expect(await heard(page)).toHaveLength(1);
  });

  test('with a parent origin it answers ping, play, pause and reset, and refuses load', async ({
    page,
  }) => {
    await frameFigure(page, 'ev=1&parent=PARENT');
    await expect.poll(() => heard(page)).not.toHaveLength(0);
    expect((await heard(page))[0]).toMatchObject({
      type: 'ready',
      requests: ['ping', 'play', 'pause', 'reset'],
      running: false,
    });
    await send(page, { type: 'play', id: 'p1' });
    await expect
      .poll(async () =>
        (await heard(page)).filter(m => m.type === 'status').at(-1)
      )
      .toMatchObject({ running: true });
    await send(page, { type: 'pause', id: 'p2' });
    await expect
      .poll(async () =>
        (await heard(page)).filter(m => m.type === 'status').at(-1)
      )
      .toMatchObject({ running: false });
    await send(page, { type: 'reset', id: 'p3' });
    await expect
      .poll(async () =>
        (await heard(page)).filter(m => m.type === 'ack').map(m => m.id)
      )
      .toContain('p3');
    await send(page, { type: 'load', id: 'p4', state: '1zabc' });
    await expect
      .poll(async () => (await heard(page)).find(m => m.type === 'error'))
      .toMatchObject({ id: 'p4', code: 'unknown-type' });
  });

  test('the frame passes axe', async ({ page }) => {
    await frameFigure(page, 'ev=1');
    const axe = await new AxeBuilder({ page })
      .include('#figure')
      .withTags(TAGS)
      .analyze();
    expect(axe.violations).toEqual([]);
  });

  test('the figure builder makes a mission figure from a lab link, and only from one', async ({
    page,
    baseURL,
  }) => {
    const { planFragment } = await import('../js/mission/link.js');
    const { DEFAULT_PLAN } = await import('../js/mission/solar.js');
    await page.goto('/figure/', { waitUntil: 'domcontentloaded' });
    const link = page.locator('#fbLink');
    await link.fill(`${baseURL}/mission/lab/`);
    await expect(page.locator('#fbLinkStatus')).toContainText('mission lab');
    await link.fill(`${baseURL}/mission/lab/#${planFragment(DEFAULT_PLAN)}`);
    await expect(page.locator('#fbLinkStatus')).toContainText('carried');
    expect(await page.locator('#fbMarkup').inputValue()).toContain(
      `${baseURL}/mission/lab/?embed=1&amp;ev=1`
    );
    await link.fill(`${baseURL}/mission/lab/#plan1.%%%`);
    await expect(page.locator('#fbLinkStatus')).toHaveClass(/is-error/);
    await expect(page.locator('#fbMarkup')).toHaveValue('');
  });
});
