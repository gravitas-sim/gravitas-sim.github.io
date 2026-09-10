// =============================================================================
// The showcase page: /teaching/
// -----------------------------------------------------------------------------
// The page a prospective adopter reads before deciding anything, so the
// failures worth catching here are the ones that would embarrass it in front of
// exactly that reader: a number that does not match the catalogue, a
// demonstration that does not open, a language switch that half works, a
// sideways scrollbar on a phone, a figure that starts moving on its own.
//
// The expected counts come from the manifest imported here in Node, not from a
// literal. A spec that hard-codes "18 investigations" is the same defect the
// page itself was built to avoid, moved one directory over.
// =============================================================================

import { test, expect } from './fixtures.js';
import { MANIFEST } from '../js/data/investigations/manifest.js';
import { MANIFEST as MANIFEST_ES } from '../js/data/investigations/manifest.es.js';
import { DEMOS } from '../js/data/teaching.js';
import { DEMO_LINKS, SCENARIO_COUNT } from '../js/data/teachingGenerated.js';

const totals = MANIFEST.reduce(
  (a, m) => ({
    steps: a.steps + m.stepCount,
    graded: a.graded + m.gradedCount,
  }),
  { steps: 0, graded: 0 }
);

/** Open the page and wait until its generated sections exist. */
async function openTeaching(page, { locale } = {}) {
  if (locale) {
    await page.addInitScript(l => {
      try {
        window.localStorage.setItem('gravitas_locale', l);
      } catch {
        /* storage unavailable; the page falls back to English */
      }
    }, locale);
  }
  await page.goto('/teaching/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#teachDemos article')).toHaveCount(DEMOS.length);
}

test.describe('the showcase page', () => {
  test('renders, and every count it prints comes from the catalogue', async ({
    page,
  }) => {
    await openTeaching(page);

    await expect(page.locator('h1')).toHaveText('Teaching with Gravitas');

    const glance = page.locator('#teachGlance');
    await expect(glance).toContainText(String(MANIFEST.length));
    await expect(glance).toContainText(`${totals.graded} of ${totals.steps}`);
    await expect(glance).toContainText(String(SCENARIO_COUNT));

    // The validation cell is fetched, so it arrives after the first paint.
    await expect(page.locator('#teachChecks')).toContainText(/checks passing/i);
  });

  test('every link on it resolves', async ({ page }) => {
    await openTeaching(page);

    const hrefs = await page.evaluate(() =>
      [...document.querySelectorAll('a[href]')]
        .map(a => a.getAttribute('href'))
        .filter(h => h && !h.startsWith('#') && !/^https?:/.test(h))
    );
    // Nav, footer, the evidence cards, the lesson links on every demonstration
    // and every slot list. If this collapses to a handful, something failed to
    // render and the rest of the assertion is checking nothing.
    expect(hrefs.length).toBeGreaterThan(15);

    const checked = new Set();
    for (const href of hrefs) {
      // A lesson link is `/#investigation=<id>`: the route is the application,
      // and the fragment is read by the application rather than by the server.
      const route = href.split('#')[0] || '/';
      if (checked.has(route)) continue;
      checked.add(route);
      const res = await page.request.get(route);
      expect(res.status(), `${route} (from ${href})`).toBe(200);
    }
  });

  test('the front door and the instructor area both point at it', async ({
    page,
    app,
  }) => {
    await app.boot({ firstVisit: true });
    await expect(
      page.locator('#welcomeScreen a[href="/teaching/"]')
    ).toHaveCount(1);

    await page.goto('/instructors/', { waitUntil: 'domcontentloaded' });
    // Once in the site navigation, once in the public-materials note beside
    // the passphrase form: an adopter who lands here without the passphrase
    // must still be offered the page that is addressed to them.
    expect(
      await page.locator('a[href="/teaching/"]').count()
    ).toBeGreaterThanOrEqual(2);
  });
});

test.describe('the demonstrations', () => {
  test('each card states the question, the move, the prediction and the payoff', async ({
    page,
  }) => {
    await openTeaching(page);

    const cards = page.locator('#teachDemos article');
    for (let i = 0; i < DEMOS.length; i++) {
      const card = cards.nth(i);
      await expect(card.locator('.teach-demo-field')).toHaveCount(4);
      for (const label of [
        'The question, and the usual wrong answer',
        'What you do',
        'What the class predicts first',
        'What becomes visible',
      ]) {
        await expect(card.locator('dt', { hasText: label })).toHaveCount(1);
      }
      // Every field says something. An empty <dd> is what a missing message id
      // looks like once textContent has been assigned.
      const lengths = await card
        .locator('dd')
        .evaluateAll(nodes => nodes.map(n => n.textContent.trim().length));
      expect(Math.min(...lengths)).toBeGreaterThan(30);
    }
  });

  test("the duration and step count are the investigation's, and say so", async ({
    page,
  }) => {
    // These numbers come from the full investigation, not from the
    // demonstration. Under the card's title they read as the
    // demonstration's own - a duration this page has no way of knowing and no
    // business inventing - so they are labelled and sit with the link they
    // describe.
    await openTeaching(page);
    const card = page.locator('#teachDemos article').first();
    const meta = card.locator('.teach-demo-meta');
    await expect(meta).toHaveCount(1);
    await expect(meta).toContainText(/full investigation/i);

    // Not in the header, where it was; after the actions, beside the link.
    expect(await meta.evaluate(n => n.closest('header') !== null)).toBe(false);
    const order = await card.evaluate(article => {
      const kids = [...article.children];
      return {
        actions: kids.findIndex(n =>
          n.classList.contains('teach-demo-actions')
        ),
        meta: kids.findIndex(n => n.classList.contains('teach-demo-meta')),
      };
    });
    expect(order.meta).toBeGreaterThan(order.actions);
  });

  test('and it is labelled in Spanish too', async ({ page }) => {
    await openTeaching(page);
    // Through the page's own switch, which is what a reader uses.
    await page.locator('#teachLang button', { hasText: 'Español' }).click();
    const meta = page
      .locator('#teachDemos article')
      .first()
      .locator('.teach-demo-meta');
    await expect(meta).toContainText(/investigaci\u00f3n completa/i);
  });

  test('nothing is running until a reader asks for it', async ({ page }) => {
    await openTeaching(page);
    // Six iframes booting six simulations on load would be six canvases and
    // six animation loops on a page most readers scroll past - and all of them
    // moving, on a page whose whole argument is that the prediction comes
    // first.
    await expect(page.locator('#teachDemos iframe')).toHaveCount(0);
  });

  test('Run opens the real simulation, paused, in embed mode', async ({
    page,
  }) => {
    await openTeaching(page);

    const card = page.locator('#teachDemos article').first();
    const run = card.getByRole('button');
    await expect(run).toHaveAttribute('aria-expanded', 'false');
    await run.click();
    await expect(run).toHaveAttribute('aria-expanded', 'true');

    const frame = card.locator('iframe');
    await expect(frame).toHaveCount(1);
    const src = await frame.getAttribute('src');
    expect(src).toBe(`/?embed=1#${DEMO_LINKS[DEMOS[0].id]}`);

    // The figure is the application, in embed mode, showing the state the link
    // describes - not a picture of one.
    const inner = card.frameLocator('iframe');
    await expect(inner.locator('#simulationCanvas')).toBeVisible();
    await expect(inner.locator('body')).toHaveClass(/presentation-embed/);
    await expect(inner.locator('#embedOpenFull')).toHaveCount(1);

    // Read out of the embedded application's own modules. This spec runs
    // against the sources only - the dist run is production.spec.js, which
    // checks the same figure opens against the bundle - so the import resolves.
    const state = await frame.evaluate(async f => {
      const ui = await f.contentWindow.eval("import('/js/ui.js')");
      const rng = await f.contentWindow.eval("import('/js/rng.js')");
      return {
        scenario: ui.current_scenario_name,
        paused: ui.state.paused,
        seed: rng.formatSeed(rng.getWorldSeed()),
      };
    });
    expect(state.scenario).toBe(DEMOS[0].state.scenario);
    expect(state.seed).toBe(DEMOS[0].state.seed);
    // Paused, so the class can be asked before it is shown.
    expect(state.paused).toBe(true);
  });

  test('closing a figure removes it rather than hiding it', async ({
    page,
  }) => {
    await openTeaching(page);
    const card = page.locator('#teachDemos article').first();
    const run = card.getByRole('button');

    await run.click();
    await expect(card.locator('iframe')).toHaveCount(1);
    await run.click();
    // An iframe left in the document behind display:none keeps its simulation
    // running, its worker alive and its frames scheduled.
    await expect(card.locator('iframe')).toHaveCount(0);
    await expect(run).toHaveAttribute('aria-expanded', 'false');
  });

  test('the full-size and lesson links carry the same state', async ({
    page,
  }) => {
    await openTeaching(page);
    const card = page.locator('#teachDemos article').first();
    const links = await card
      .locator('a')
      .evaluateAll(nodes => nodes.map(n => n.getAttribute('href')));
    expect(links).toContain(`/#${DEMO_LINKS[DEMOS[0].id]}`);
    expect(links).toContain(`/#investigation=${DEMOS[0].lesson}`);
  });

  test('the six of them copy as a lecture sequence', async ({ page, app }) => {
    await app.captureClipboard();
    await openTeaching(page);

    await page.locator('#teachCopySequence').click();
    const copied = await app.clipboardText();
    const lines = copied.split('\n').filter(Boolean);
    expect(lines).toHaveLength(DEMOS.length);
    // The format Lecture Mode's own parser accepts: one link per line, each
    // with a share payload after the '#'. See parseSequence() in js/lecture.js.
    for (const line of lines) {
      expect(line).toMatch(/^https?:\/\/[^#]+#\d+[zr]./);
    }
    for (const demo of DEMOS) {
      expect(copied).toContain(`#${DEMO_LINKS[demo.id]}`);
    }
  });
});

test.describe('both languages', () => {
  test('the switch changes the prose, the lesson titles and the document language', async ({
    page,
  }) => {
    await openTeaching(page);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');

    const firstLesson = MANIFEST.find(m => m.id === DEMOS[0].lesson);
    const firstLessonEs = MANIFEST_ES.find(m => m.id === DEMOS[0].lesson);
    // The two manifests have to differ here or the assertion below proves
    // nothing about the language having changed.
    expect(firstLessonEs.title).not.toBe(firstLesson.title);

    await expect(page.locator('#teachDemos h3').first()).toHaveText(
      firstLesson.title
    );

    await page.locator('#teachLang button', { hasText: 'Español' }).click();

    await expect(page.locator('html')).toHaveAttribute('lang', 'es');
    await expect(page.locator('h1')).toHaveText('Enseñar con Gravitas');
    await expect(page.locator('#teachDemos h3').first()).toHaveText(
      firstLessonEs.title
    );
    // Counts are language-independent facts printed with translated labels.
    await expect(page.locator('#teachGlance')).toContainText(
      `${totals.graded} de ${totals.steps}`
    );
  });

  test('the choice is the same one the simulation uses, and it survives a reload', async ({
    page,
  }) => {
    await openTeaching(page);
    await page.locator('#teachLang button', { hasText: 'Español' }).click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'es');

    expect(
      await page.evaluate(() => localStorage.getItem('gravitas_locale'))
    ).toBe('es');

    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('h1')).toHaveText('Enseñar con Gravitas');
  });

  test('a reader who arrives already in Spanish gets Spanish', async ({
    page,
  }) => {
    await openTeaching(page, { locale: 'es' });
    await expect(page.locator('html')).toHaveAttribute('lang', 'es');
    await expect(
      page.locator('#teachDemos .teach-demo-field dt').first()
    ).toHaveText('La pregunta, y la respuesta equivocada de siempre');
  });
});

test.describe('operating it without a mouse', () => {
  test('the language switch and a demonstration are reachable and work from the keyboard', async ({
    page,
  }) => {
    await openTeaching(page);

    const run = page.locator('#teachDemos article').first().getByRole('button');
    await run.focus();
    await expect(run).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(run).toHaveAttribute('aria-expanded', 'true');
    await page.keyboard.press('Enter');
    await expect(run).toHaveAttribute('aria-expanded', 'false');

    const spanish = page.locator('#teachLang button', { hasText: 'Español' });
    await spanish.focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('html')).toHaveAttribute('lang', 'es');
    await expect(spanish).toHaveAttribute('aria-pressed', 'true');
  });

  test('the skip link is the first thing Tab reaches, and it goes to the content', async ({
    page,
  }) => {
    await openTeaching(page);
    await page.keyboard.press('Tab');
    const first = await page.evaluate(() => {
      const a = document.activeElement;
      return { tag: a.tagName, href: a.getAttribute('href') };
    });
    expect(first).toEqual({ tag: 'A', href: '#main' });
    await expect(page.locator('#main')).toHaveCount(1);
  });

  test('what happens is announced', async ({ page }) => {
    await openTeaching(page);
    const live = page.locator('#teachLive');
    await expect(live).toHaveAttribute('aria-live', 'polite');

    await page
      .locator('#teachDemos article')
      .first()
      .getByRole('button')
      .click();
    await expect(live).toContainText(/loaded and paused/i);
  });
});

test.describe('with reduced motion asked for', () => {
  test('the page is complete and nothing on it has started moving', async ({
    page,
  }) => {
    // emulateMedia rather than `test.use({ reducedMotion })`: the option is set
    // on the browser context, and the shared fixture in ./fixtures.js hands
    // every spec a page from a context this file does not create. Asserted
    // below rather than assumed, because a preference that silently failed to
    // apply would make the rest of this test pass for the wrong reason.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await openTeaching(page);
    expect(
      await page.evaluate(
        () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
      )
    ).toBe(true);

    // The one thing on this page that can move is a figure, and a figure only
    // exists once a reader presses Run. There is nothing else to reduce.
    await expect(page.locator('#teachDemos iframe')).toHaveCount(0);

    // css/tokens.css collapses the transition durations globally under the
    // preference, and css/teaching.css deliberately defines none of its own, so
    // the sheet inherits that rather than reimplementing it.
    const durations = await page.evaluate(() => {
      const s = getComputedStyle(document.documentElement);
      return ['--duration-fast', '--duration', '--duration-slow'].map(n =>
        s.getPropertyValue(n).trim()
      );
    });
    expect(durations).toEqual(['1ms', '1ms', '1ms']);

    // And it still works.
    const run = page.locator('#teachDemos article').first().getByRole('button');
    await run.click();
    await expect(page.locator('#teachDemos iframe')).toHaveCount(1);
  });
});

test.describe('narrow screens and print', () => {
  test('nothing scrolls sideways on a phone-width viewport', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 360, height: 720 });
    await openTeaching(page);

    // Measured with a figure open, because an iframe is the widest thing the
    // page can contain and a fixed-width one is how this breaks.
    await page
      .locator('#teachDemos article')
      .first()
      .getByRole('button')
      .click();
    await expect(page.locator('#teachDemos iframe')).toHaveCount(1);

    const overflow = await page.evaluate(() => ({
      doc: document.documentElement.scrollWidth,
      client: document.documentElement.clientWidth,
    }));
    expect(overflow.doc).toBeLessThanOrEqual(overflow.client + 1);

    // The figure clips what it contains, so a fixed-width frame inside it would
    // not widen the page - it would just be cropped, which the assertion above
    // cannot see. Measured against its container instead.
    const figure = await page.evaluate(() => {
      const box = document
        .querySelector('.teach-figure')
        .getBoundingClientRect();
      const frame = document
        .querySelector('.teach-frame')
        .getBoundingClientRect();
      return { boxWidth: box.width, frameWidth: frame.width, right: box.right };
    });
    // Within the figure's one-pixel border on each side.
    expect(Math.abs(figure.frameWidth - figure.boxWidth)).toBeLessThanOrEqual(
      3
    );
    expect(figure.right).toBeLessThanOrEqual(360);
  });

  test('the header stacks rather than colliding on a phone', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 360, height: 720 });
    await openTeaching(page);

    const boxes = await page.evaluate(() => {
      const nav = document.querySelector('.doc-nav').getBoundingClientRect();
      const lang = document
        .querySelector('.teach-lang')
        .getBoundingClientRect();
      return {
        navBottom: nav.bottom,
        langTop: lang.top,
        langRight: lang.right,
      };
    });
    expect(boxes.langTop).toBeGreaterThanOrEqual(boxes.navBottom - 1);
    expect(boxes.langRight).toBeLessThanOrEqual(360);
  });

  test('printing drops the figures and keeps the argument', async ({
    page,
  }) => {
    await openTeaching(page);
    await page
      .locator('#teachDemos article')
      .first()
      .getByRole('button')
      .click();
    await expect(page.locator('#teachDemos iframe')).toHaveCount(1);

    await page.emulateMedia({ media: 'print' });
    const printed = await page.evaluate(() => {
      const shown = sel =>
        getComputedStyle(document.querySelector(sel)).display !== 'none';
      return {
        figure: shown('.teach-figure'),
        actions: shown('.teach-demo-actions'),
        language: shown('.teach-lang'),
        question: shown('.teach-demo-field'),
        cycle: shown('.teach-step'),
      };
    });
    expect(printed).toEqual({
      figure: false,
      actions: false,
      language: false,
      question: true,
      cycle: true,
    });
    await page.emulateMedia({ media: 'screen' });
  });
});
