// =============================================================================
// Five GWOSC mergers, in a browser
// -----------------------------------------------------------------------------
// The data, its provenance and every number the instrument reads off it are
// checked without a browser in tests/gwoscEvents.test.js; the whole lesson,
// these seven screens included, is walked with the sound off in
// gwLesson.spec.js.
//
// What is left needs a page. Three claims, each about what the network or the
// keyboard did:
//
//   the strain is a chunk of its own, fetched once and only by the lesson
//   engine, and nothing ever asks gwosc.org for anything - the archive is a
//   build-time source, never a runtime one;
//
//   the readout is a complete text equivalent of the map, under the four
//   headings that keep observed, measured, catalog and model apart, with the
//   catalog genuinely absent until it is asked for;
//
//   the event control works from the keyboard, and what it changes is said in
//   words rather than only drawn.
//
// Source target only, for the reason e2e/stellarSpectra.spec.js gives: the
// built site hashes the chunk's name.
// =============================================================================

import { test, expect } from './fixtures.js';

const LESSON = 'listening-to-spacetime';
/** The first of the seven GWOSC screens, and the catalog screen, one-based. */
const FIRST = 23;
const CATALOG = 26;

/** Open the lesson at a screen, through the author route. */
async function openAt(page, app, step) {
  await app.boot({ url: `/?author=${LESSON}&step=${step}` });
  await page.waitForSelector('#investigationToolCanvas', { timeout: 25_000 });
  const readout = page.locator('#investigationToolReadout');
  // The rows are drawn once the data has landed; before that the one row says
  // it is loading, which is not what any of these tests is about.
  await expect(readout).toContainText(/All five/, { timeout: 20_000 });
  return readout;
}

test.describe('the strain arrives from this site, once, and only when needed', () => {
  test('the sandbox fetches none of it; the lesson engine fetches the data and never the provenance', async ({
    page,
    app,
  }) => {
    const events = [];
    const archive = [];
    page.on('request', req => {
      const url = req.url();
      if (/gwoscEvents/.test(url)) events.push(url);
      if (/gwosc\.org/i.test(url)) archive.push(url);
    });

    await app.boot();
    await expect(page.locator('#investigationsBtn')).toBeVisible();
    expect(events).toEqual([]);

    await page.locator('#investigationsBtn').click();
    await expect(page.locator('#investigationBrowser')).toBeVisible();
    await expect
      .poll(() => events.length, { timeout: 15_000 })
      .toBeGreaterThan(0);

    await page.locator(`[data-investigation="${LESSON}"]`).click();
    await expect(page.locator('#investigationPanel')).toBeVisible();

    expect(events.filter(u => /Provenance/.test(u))).toEqual([]);
    expect(events).toHaveLength(1);
    // The archive is where the build got the strain. A page that asked it for
    // anything would stop working the day the archive moved.
    expect(archive).toEqual([]);
  });
});

test.describe('the readout says everything the map shows', () => {
  test('four headings, the comparison in numbers, and the catalog held', async ({
    page,
    app,
  }) => {
    const readout = await openAt(page, app, FIRST);
    await expect(readout).toContainText('Observed strain');
    await expect(readout).toContainText('Measured by Gravitas from the strain');
    await expect(readout).toContainText(
      'GWOSC catalog values (not measured here)'
    );
    // The comparison the lesson is built on, as text: every event, at the same
    // moment before its end, measured from the committed strain.
    await expect(readout).toContainText(
      'GW150914 58 Hz, GW170817 —, GW190412 69 Hz, GW190521 55 Hz, GW190814 104 Hz'
    );
    // Held means absent, not hidden: no catalog number is on the page.
    await expect(readout).toContainText(/held until you turn them on/i);
    await expect(readout).not.toContainText('Chirp mass');
    await expect(readout).not.toContainText('M☉');
    await expect(readout).not.toContainText('gwE.');

    const label = await page
      .locator('#investigationToolCanvas')
      .getAttribute('aria-label');
    expect(label).toBeTruthy();
    expect(label).toMatch(/below/i);
  });

  test('the catalog screen shows GWOSC’s numbers at the precision GWOSC gave them', async ({
    page,
    app,
  }) => {
    const readout = await openAt(page, app, CATALOG);
    await expect(readout).toContainText('Chirp mass, source frame');
    // GW190521, the screen's own setting.
    await expect(readout).toContainText('63.3 (+19.6 / −14.6) M☉');
    const control = page.locator(
      '#investigationToolControls [data-tool="event"]'
    );
    await control.focus();
    // Down to GW170817, the second in recording order.
    await page.keyboard.press('Home');
    await page.keyboard.press('ArrowRight');
    await expect(readout).toContainText('1.186 (+0.001 / −0.001) M☉');
  });
});

test.describe('the event control is a keyboard control', () => {
  test('arrow keys step through the events, and the readout says what changed', async ({
    page,
    app,
  }, testInfo) => {
    const readout = await openAt(page, app, FIRST);
    const control = page.locator(
      '#investigationToolControls [data-tool="event"]'
    );
    const shown = page.locator(
      '#investigationToolControls [data-tool-out="event"]'
    );
    await expect(shown).toHaveText('GW150914');
    await expect(readout).toContainText('+0.034 s from the catalog time');

    const canvas = page.locator('#investigationToolCanvas');
    await control.focus();
    for (const id of [
      'GW150914',
      'GW170817',
      'GW190412',
      'GW190521',
      'GW190814',
    ]) {
      await expect(shown).toHaveText(id);
      await expect(readout).toContainText(`${id}, `);
      // The picture, kept with the run: what a reviewer looks at to see that
      // the curves the lesson describes are the curves on the screen.
      await testInfo.attach(`map-${id}`, {
        body: await canvas.screenshot(),
        contentType: 'image/png',
      });
      if (id === 'GW170817') {
        await expect(readout).toContainText(/nothing clears the noise/i);
      }
      await page.keyboard.press('ArrowRight');
    }
  });
});
