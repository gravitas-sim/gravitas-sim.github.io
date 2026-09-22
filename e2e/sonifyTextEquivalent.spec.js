// =============================================================================
// The non-audio path to what the sound is carrying
// -----------------------------------------------------------------------------
// The sandbox's sonification is lossy on purpose: orbital frequency is
// compressed and then quantized onto a five-note scale, so two orbits several
// percent apart can arrive at the same note. That is fine for a soundtrack and
// disqualifying as the only channel for a quantity, which is why the sound
// panel now prints what the tones are computed from.
//
// This spec checks the printed version against the audio itself, not against a
// fixture. The strongest form of that check needs the module registry, which
// only exists on the source target - against dist/ esbuild has bundled
// js/audio.js into a hashed chunk and there is nothing to import - so that
// describe block carries `test.skip(SOURCE_ONLY, …)`. The guard is dormant:
// this spec runs against the sources only. playwright.config.js matches nothing
// but production.spec.js and selfContained.spec.js on the dist/ target, and the
// checks above the guard are not DOM-only either. listenPaused() goes through
// app.setPaused(), which imports /js/ui.js, so put on dist/, every one of them
// but the muted-sandbox test fails on an import that cannot resolve.
//
// The simulation is paused before the panel is opened. The panel is a snapshot
// and the bodies move; comparing a snapshot taken at one moment against a fresh
// reading taken at another is a race that would fail a few percent of the time
// and be blamed on the wrong thing.
// =============================================================================

import { test, expect } from './fixtures.js';

const SOURCE_ONLY = process.env.GRAVITAS_E2E_TARGET === 'dist';

const speaker = page => page.locator('#sonificationToggle');
const items = page => page.locator('#soundPanelVoicesList li');

/** Open the sound panel with the sound actually on, on a still world. */
async function listenPaused(page, app) {
  await app.boot();
  await app.setPaused(true);
  await speaker(page).click();
  await page.locator('#soundPanelToggle').click();
  // The panel's prose is in the deferred catalog; the section stays hidden
  // until that lands rather than showing message ids.
  await expect(page.locator('#soundPanelVoices')).toBeVisible();
}

test.describe('what the tones stand for is available as text', () => {
  test('a muted sandbox says so rather than showing the last thing it played', async ({
    page,
    app,
  }) => {
    await app.boot();
    await speaker(page).click();
    await expect(page.locator('#soundPanelVoices')).toBeVisible();
    await expect(items(page)).toHaveCount(1);
    await expect(items(page).first()).toContainText(/nothing is being voiced/i);
  });

  test('the list names bodies and states a period for each', async ({
    page,
    app,
  }) => {
    await listenPaused(page, app);
    await expect.poll(async () => await items(page).count()).toBeGreaterThan(0);
    const rows = await items(page).allTextContents();
    for (const row of rows) {
      // Every row carries a period with a unit. formatTime picks the unit, so
      // the assertion is that one was chosen rather than which.
      expect(row).toMatch(
        /Period\s+[\d.,\u2212-]+(\u00a0|\s)?(t|h|d|yr|kyr|Myr)\b/
      );
    }
    // Exactly one reference, and it is the first.
    expect(
      rows.filter(r => /highest voice/i.test(r) && /measured from/i.test(r))
    ).toHaveLength(1);
    expect(rows[0]).toMatch(/measured from this one/i);
  });

  test('the three numbers in a row agree with each other', async ({
    page,
    app,
  }) => {
    // period, ratio and cents are three views of one fact, and this is the
    // check that catches the realistic mistake: quoting an interval taken from
    // the audible pitch, which has been rounded onto a pentatonic scale,
    // rather than from the period. A row formatted that way would still look
    // entirely reasonable.
    await listenPaused(page, app);
    const rows = await items(page).allTextContents();
    const measured = rows
      .map(r => r.match(/([\d.]+)\u00d7 the highest voice, ([\d.]+) cents/))
      .filter(Boolean);
    test.skip(
      measured.length === 0,
      'only one body is being voiced, so there is no interval to check'
    );
    for (const [, ratioText, cents] of measured) {
      const ratio = Number(ratioText);
      const expected = 1200 * Math.log2(ratio);
      // The tolerance is derived from the printed ratio rather than picked.
      // The ratio is shown to four significant figures, so the true value is
      // within half an ulp of the last digit, and how many cents that is
      // depends on the magnitude: at 1.234 a half-ulp is 4e-4 relative and
      // worth 0.7 cents, at 9.999 it is 5e-5 and worth 0.09. A fixed bound
      // would be either too loose at the bottom of a decade or wrong at the
      // top - the first draft used 3 cents and was failed by a legitimate
      // 2.72x row, which is how this arithmetic got done properly.
      const halfUlp = 0.5 * 10 ** (Math.floor(Math.log10(ratio)) - 3);
      const slack = 1200 * Math.log2(1 + halfUlp / ratio);
      expect(Math.abs(expected - Number(cents))).toBeLessThanOrEqual(
        slack + 0.05 // the cents are themselves printed to one decimal
      );
    }
  });

  test('the readout is text in the accessibility tree, not paint', async ({
    page,
    app,
  }) => {
    await listenPaused(page, app);
    // The whole point of the section: a reader who cannot use the canvas and
    // cannot use the audio still reaches the numbers. ariaSnapshot is the tree
    // as assistive technology sees it, so a section that rendered into a
    // canvas, or was hidden from the tree, fails here rather than looking fine
    // in a screenshot.
    const tree = await page.locator('#soundPanelVoices').ariaSnapshot();
    expect(tree).toMatch(/heading .*What the tones stand for/i);
    // A list, so a screen reader announces how many voices there are before
    // reading them, and a heading, so the section can be jumped to rather than
    // only scrolled past.
    expect(tree).toMatch(/- list:/);
    expect(tree).toMatch(/listitem/);
    expect(tree).toMatch(/Period/i);
  });

  test('the section does not interrupt a screen reader', async ({
    page,
    app,
  }) => {
    // The voices are re-chosen several times a second. A live region over them
    // would talk over everything else continuously. The section is plain
    // content that holds still while it is read, and refreshSoundPanel()
    // returns immediately while the panel is hidden.
    await listenPaused(page, app);
    const attrs = await page.locator('#soundPanelVoices').evaluate(el => ({
      live: el.getAttribute('aria-live'),
      role: el.getAttribute('role'),
      // Inherited from an ancestor is just as loud as declared here.
      inherited: el.closest('[aria-live]')?.getAttribute('aria-live') ?? null,
    }));
    expect(attrs.live).toBeNull();
    expect(attrs.role).toBeNull();
    expect(attrs.inherited).toBeNull();
  });
});

test.describe('the text and the audio are the same numbers', () => {
  test.skip(
    SOURCE_ONLY,
    'needs the module registry; dist/ has bundled js/audio.js into a hashed chunk'
  );

  test('every printed interval is the one the oscillators are following', async ({
    page,
    app,
  }) => {
    await listenPaused(page, app);

    const { expected, printed } = await page.evaluate(async () => {
      const audio = await import('/js/audio.js');
      const units = await import('/js/units.js');
      const { describeVoices } = await import('/js/sonify/voiceReadout.js');
      return {
        // Straight from the array updateVoices() consumed.
        expected: describeVoices(audio.getVoicedBodies()).rows.map(r => ({
          period: units.formatTime(r.period),
          cents: r.cents.toFixed(1),
        })),
        printed: [...document.querySelectorAll('#soundPanelVoicesList li')].map(
          li => li.textContent
        ),
      };
    });

    expect(expected.length).toBeGreaterThan(0);
    expect(printed).toHaveLength(expected.length);
    expected.forEach((row, i) => {
      // The period, and not only the interval. Cents are reference-relative,
      // so a uniform error in the frequencies cancels out of every one of them
      // exactly - the first version of this test compared cents alone and
      // passed happily with every frequency scaled by 1.02. The absolute
      // period is the part that cannot hide in a ratio.
      expect(printed[i]).toContain(row.period);
      // The reference row quotes no interval, by design: it is the thing the
      // others are measured from.
      if (i === 0) return;
      // Not the name - the panel translates the type key and this side of the
      // comparison deliberately does not know the catalog. That the name comes
      // from typeName(row.type) is held by tests/voiceReadout.test.js.
      expect(printed[i]).toContain(`${row.cents} cents`);
    });
  });

  test('turning the sound off empties the list rather than freezing it', async ({
    page,
    app,
  }) => {
    await listenPaused(page, app);
    await expect.poll(async () => await items(page).count()).toBeGreaterThan(0);
    await page.locator('#soundPanelToggle').click();
    await expect(items(page)).toHaveCount(1);
    await expect(items(page).first()).toContainText(/nothing is being voiced/i);
    // And the accessor agrees, which is what makes the list empty rather than
    // the list having been cleared by something else.
    const voiced = await page.evaluate(async () => {
      const audio = await import('/js/audio.js');
      return audio.getVoicedBodies().length;
    });
    expect(voiced).toBe(0);
  });
});
