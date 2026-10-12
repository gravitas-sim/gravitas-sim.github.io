// =============================================================================
// The 3-D lab as an embedded figure (Prompt 105), in a browser
// -----------------------------------------------------------------------------
// js/lab3d/embed.js under the gravitas-embed/1 contract. The parent here is the
// lab's own page, which frames the figure on the same origin; what is held:
//   - the figure is the view and its transport and nothing of the page around
//     it, at reduced quality and motion by default, and `quality=full` and
//     `controls=none` and `lang=es` do what they say;
//   - without a parent origin it announces readiness and listens to nobody;
//   - with one, ping, play, pause and reset are answered, `load` is refused as
//     an unknown request, and a message from anyone else is not answered;
//   - a system in the link's fragment is the system the figure runs;
//   - no axe violations inside the frame.
// =============================================================================

import AxeBuilder from '@axe-core/playwright';
import { test, expect } from './fixtures.js';
import { REFERENCES } from '../js/lab3d/references.js';

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'];

/** Frame the figure inside the lab's own page, and collect what it says. */
async function frameFigure(page, query) {
  await page.goto('/3d/?system=R1', { waitUntil: 'domcontentloaded' });
  await page.evaluate(q => {
    window.__heard = [];
    window.addEventListener('message', e => window.__heard.push(e.data));
    const f = document.createElement('iframe');
    f.id = 'figure';
    f.title = 'figure';
    f.style.cssText = 'width:640px;height:480px';
    f.src = `/3d/?embed=1&${q.replace('PARENT', location.origin)}`;
    document.body.append(f);
  }, query);
  const frame = page.frameLocator('#figure');
  await expect(frame.locator('#l3-canvas')).toBeVisible({ timeout: 30_000 });
  return frame;
}

const heard = page => page.evaluate(() => window.__heard);
const send = (page, data) =>
  page.evaluate(
    d => document.getElementById('figure').contentWindow.postMessage(d, '*'),
    { protocol: 'gravitas-embed', version: 1, ...data }
  );

test.describe('the 3-D lab as an embedded figure', () => {
  test('it is the view and its transport, at reduced quality and motion', async ({
    page,
  }) => {
    const frame = await frameFigure(page, 'ev=1&system=R3');
    await expect(frame.locator('#l3-play')).toBeVisible();
    await expect(frame.locator('#l3-guides')).toBeHidden();
    await expect(frame.locator('#l3-evidence')).toBeHidden();
    await expect(frame.locator('#l3-system')).toBeHidden();
    await expect(frame.locator('#l3-low')).toBeChecked({ checked: true });
    await expect(frame.locator('#l3-reduced')).toBeChecked();
    // Reduced motion: it waits for the reader to press Play.
    await expect(frame.locator('#l3-play')).toHaveText('Play');
  });

  test('quality=full, controls=none and lang=es do what they say', async ({
    page,
  }) => {
    const frame = await frameFigure(
      page,
      'ev=1&quality=full&controls=none&lang=es&system=R3'
    );
    await expect(frame.locator('#l3-low')).not.toBeChecked();
    await expect(frame.locator('#l3-play')).toBeHidden();
    await expect(frame.locator('html')).toHaveAttribute('lang', 'es');
  });

  test('without a parent origin it says it is ready and listens to nobody', async ({
    page,
  }) => {
    await frameFigure(page, 'ev=1&system=R3');
    await expect.poll(() => heard(page)).toHaveLength(1);
    const [ready] = await heard(page);
    expect(ready).toMatchObject({
      protocol: 'gravitas-embed',
      type: 'ready',
      requests: [],
    });
    await send(page, { type: 'ping' });
    // Two frames in the figure: a message it had meant to answer would have
    // been answered by then.
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
    await frameFigure(page, 'ev=1&parent=PARENT&system=R3');
    await expect.poll(() => heard(page)).not.toHaveLength(0);
    expect((await heard(page))[0]).toMatchObject({
      type: 'ready',
      requests: ['ping', 'play', 'pause', 'reset'],
      running: false,
    });
    await send(page, { type: 'play', id: 'p1' });
    await expect
      .poll(async () => (await heard(page)).find(m => m.type === 'ack'))
      .toMatchObject({ id: 'p1' });
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

  test('a system in the link runs, and the frame passes axe', async ({
    page,
  }) => {
    const r3 = REFERENCES.find(r => r.id === 'R3').make().system;
    const { systemFragment } = await import('../js/lab3d/link.js');
    const made = await systemFragment(r3);
    await page.goto('/3d/', { waitUntil: 'domcontentloaded' });
    await page.evaluate(src => {
      const f = document.createElement('iframe');
      f.id = 'figure';
      f.title = 'figure';
      f.style.cssText = 'width:640px;height:480px';
      f.src = src;
      document.body.append(f);
    }, `/3d/?embed=1&ev=1#${made.fragment}`);
    const frame = page.frameLocator('#figure');
    await expect(frame.locator('html')).toHaveAttribute('data-ready', 'true', {
      timeout: 30_000,
    });
    const handle = await page.locator('#figure').elementHandle();
    const inner = await handle.contentFrame();
    await inner.waitForFunction(() => window.gravitasLab3d?.frame());
    const m = await inner.evaluate(() => window.gravitasLab3d.frame().m);
    expect(m).toEqual(r3.bodies.map(b => b.m));
    const axe = await new AxeBuilder({ page })
      .include('#figure')
      .withTags(TAGS)
      .analyze();
    expect(axe.violations).toEqual([]);
  });

  test('the figure builder makes a 3-D figure from a lab link, and only from one', async ({
    page,
    baseURL,
  }) => {
    const r3 = REFERENCES.find(r => r.id === 'R3').make().system;
    const { systemFragment } = await import('../js/lab3d/link.js');
    const made = await systemFragment(r3);
    await page.goto('/figure/', { waitUntil: 'domcontentloaded' });
    const link = page.locator('#fbLink');
    // A reference system.
    await link.fill(`${baseURL}/3d/?system=R5`);
    await expect(page.locator('#fbLinkStatus')).toContainText(
      'reference system R5'
    );
    expect(await page.locator('#fbMarkup').inputValue()).toContain(
      `${baseURL}/3d/?embed=1&amp;ev=1&amp;reset=authored&amp;system=R5`
    );
    // A system carried in the link, at reduced quality by the options.
    await link.fill(`${baseURL}/3d/#${made.fragment}`);
    await expect(page.locator('#fbLinkStatus')).toContainText('3-D system');
    const markup = await page.locator('#fbMarkup').inputValue();
    expect(markup).toContain(
      `${baseURL}/3d/?embed=1&amp;ev=1&amp;reset=authored#sys1`
    );
    expect(markup).toContain('Gravitas 3-D lab');
    await expect(
      page.frameLocator('#fbPreview').locator('#l3-canvas')
    ).toBeVisible({ timeout: 30_000 });
    // A damaged system is refused, and so is any other address.
    await link.fill(`${baseURL}/3d/#sys1zabc`);
    await expect(page.locator('#fbLinkStatus')).toContainText(
      'could not be read'
    );
    await expect(page.locator('#fbMarkup')).toHaveValue('');
    await link.fill('https://evil.example/page');
    await expect(page.locator('#fbLinkStatus')).toHaveClass(/is-error/);
    await expect(page.locator('#fbMarkup')).toHaveValue('');
  });
});
