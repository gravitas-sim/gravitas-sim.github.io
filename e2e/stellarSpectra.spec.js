// =============================================================================
// Four observed spectra, in a browser
// -----------------------------------------------------------------------------
// The data, the provenance and the widget arithmetic are checked without a
// browser in tests/stellarSpectra.test.js, and all thirty-seven of the lesson's
// screens are walked in stellarLesson.spec.js, which is what says the six new
// ones render an instrument and a readout with no placeholders in them.
//
// What is left is the claim the whole architecture exists for, and it is a
// statement about what the network did, so nothing but a page can make it:
// thirteen kilobytes of flux is in a chunk of its own, and a visitor who opens
// the sandbox and never opens a lesson never fetches it.
//
// Where that claim stops, measured rather than assumed. The chunk is pulled
// when the lesson BROWSER opens, not when this particular lesson is picked:
// js/investigations.js is what the browser button loads, it imports the widget
// registry, and the registry imports this family, whose module scope starts the
// import. Deferring it to the widget's own first draw was considered and is not
// currently possible - a widget cannot ask the lesson engine to repaint, so a
// panel that mounted before the data landed would sit on its waiting state
// until the reader moved a control. The trade is 24 KB fetched alongside the
// lesson catalog rather than alongside a step, and it is 24 KB either way.
//
// Only the source target runs this, like every spec but two: the built site
// serves the module inside a content-hashed chunk that cannot be named from
// here. That is the project's existing split rather than a skip - see
// BOTH_TARGETS in playwright.config.js.
// =============================================================================

import { test, expect } from './fixtures.js';

const LESSON = 'a-universe-of-stars';
/** The first of the six spectra screens, one-based, as the counter shows it. */
const FIRST_SPECTRA_STEP = 30;

/** Open the lesson the way a student does. */
async function openLesson(page, app) {
  await app.boot();
  await expect(page.locator('#investigationsBtn')).toBeVisible();
  await page.locator('#investigationsBtn').click();
  await expect(page.locator('#investigationBrowser')).toBeVisible();
  await page.locator(`[data-investigation="${LESSON}"]`).click();
  await expect(page.locator('#investigationPanel')).toBeVisible();
  await expect(page.locator('.inv-step-title')).not.toBeEmpty();
}

/** The step showing, one-based. */
const stepNumber = async page => {
  const text = await page
    .locator('#investigationBody .inv-step-count')
    .innerText();
  return Number((text.match(/\d+/) || [0])[0]);
};

/** Press Next until the given screen is showing. */
async function advanceTo(page, target) {
  for (let guard = 0; guard < 60; guard++) {
    const now = await stepNumber(page);
    if (now >= target) return;
    await page.locator('#investigationNext').click();
    await expect
      .poll(() => stepNumber(page), { timeout: 20_000 })
      .toBeGreaterThan(now);
  }
  throw new Error(`could not reach screen ${target}`);
}

test.describe('the spectra arrive only when something needs them', () => {
  test('the sandbox boots without fetching them; the lesson engine fetches them once', async ({
    page,
    app,
  }) => {
    const hits = [];
    page.on('request', req => {
      if (/sdssSpectra/.test(req.url())) hits.push(req.url());
    });

    await app.boot();
    await expect(page.locator('#investigationsBtn')).toBeVisible();
    // A first visit to the sandbox reaches nothing in js/data/spectra/.
    expect(hits).toEqual([]);

    // The lesson engine is what reaches them, and opening the browser is what
    // loads the lesson engine. Asserted where it actually happens rather than
    // where it would be nicer: a test claiming the card click did this would
    // be describing an architecture this branch does not have.
    await page.locator('#investigationsBtn').click();
    await expect(page.locator('#investigationBrowser')).toBeVisible();
    await expect
      .poll(() => hits.length, { timeout: 15_000 })
      .toBeGreaterThan(0);

    await page.locator(`[data-investigation="${LESSON}"]`).click();
    await expect(page.locator('#investigationPanel')).toBeVisible();
    await expect(page.locator('.inv-step-title')).not.toBeEmpty();

    // Once, in total: not once per widget, not once per step, and not again
    // when the lesson that uses it opens. And only the data: the provenance
    // record beside it is imported by nothing in the application, which is
    // the reason it is a separate file.
    expect(hits.filter(u => /sdssSpectraProvenance/.test(u))).toEqual([]);
    expect(hits).toHaveLength(1);
  });
});

test.describe('the instrument can be worked from the readout alone', () => {
  test('the first spectra screen measures real features and says they are observations', async ({
    page,
    app,
  }) => {
    await openLesson(page, app);
    await advanceTo(page, FIRST_SPECTRA_STEP);

    const readout = page.locator('#investigationToolReadout');
    await expect(readout).toBeVisible();
    // It says what kind of thing it is showing, on this screen rather than in a
    // note somewhere: the lesson runs this beside an instrument that draws
    // models, and telling them apart is a thing the lesson is teaching.
    await expect(readout).toContainText(/Observations/i);
    // And it carries measured numbers, which is what says the module loaded
    // rather than that a promise has not settled.
    await expect(readout).toContainText(/Ca II K/);
    await expect(readout).toContainText(/\d+\.\d%/);
    // A message id here would mean the deferred catalog never arrived.
    await expect(readout).not.toContainText('specW.');
    // ...and the picture never becomes the only way to read any of it.
    const label = await page
      .locator('#investigationToolCanvas')
      .getAttribute('aria-label');
    expect(label).toMatch(/listed below/i);
  });

  test('the wavelength control moves from the keyboard and changes what is named', async ({
    page,
    app,
  }) => {
    await openLesson(page, app);
    await advanceTo(page, FIRST_SPECTRA_STEP);

    const control = page.locator(
      '#investigationToolControls [data-tool="window"]'
    );
    await expect(control).toBeVisible();
    const shown = page.locator(
      '#investigationToolControls [data-tool-out="window"]'
    );
    const before = await shown.innerText();
    await control.focus();
    await page.keyboard.press('ArrowRight');
    // The label beside the slider is a sentence about the setting, so a reader
    // who cannot see the plot still knows which stretch of spectrum is on it.
    await expect(shown).not.toHaveText(before);
    await expect(shown).toContainText(/Å/);
    await expect(page.locator('#investigationToolReadout')).toContainText(/Å/);
  });
});
