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
import {
  DEMOS,
  QUICKSTART,
  EVALUATION,
  FEEDBACK_FIELDS,
} from '../js/data/teaching.js';
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

// =============================================================================
// The three short routes
// -----------------------------------------------------------------------------
// A route is an activity format: a lesson id and an ordered list of that
// lesson's own step ids, opened as an ordinary assignment. There is no second
// runner here and nothing on /teaching/ knows any physics.
//
// What is asserted is the part that was broken and that nothing noticed: a
// launch link that loads the sandbox and opens nothing looks exactly like a
// link that worked. It had two causes at once - the page percent-encoded the
// separator the fragment parser needs literal, and js/share.js stripped the
// fragment three hundred milliseconds in because its list of fragments to
// leave alone was one entry short - and every Start button on the page was
// dead the whole time.
// =============================================================================

/** The three short routes, by the ids the cards are built from. */
const ROUTES = [
  { activity: 'orbital-speed', lesson: 'keplers-laws' },
  { activity: 'binary-planets', lesson: 'binary-star-planets' },
  { activity: 'star-sizes', lesson: 'a-universe-of-stars' },
];

/** Open a route the way its Start button does, from cold. */
async function openRoute(page, app, activity, format = 'route') {
  await app.boot({
    url: `/?activity=${activity}&format=${format}#activity=${activity}/${format}`,
  });
  await expect(page.locator('#investigationPanel')).toBeVisible();
  await expect(page.locator('.inv-step-title')).not.toBeEmpty();
}

test.describe('the short routes', () => {
  test('each one has a card with a launch link the application will honour', async ({
    page,
  }) => {
    await openTeaching(page);
    const [{ activityInHash, parseActivityHash }] = await Promise.all([
      import('../js/activities/activityBridge.js'),
    ]);
    for (const { activity } of ROUTES) {
      const link = page.locator(
        `#teachActivities a[href*="activity=${activity}&format=route"]`
      );
      await expect(link).toHaveCount(1);
      const href = await link.getAttribute('href');
      const hash = href.slice(href.indexOf('#'));
      // Against the application's own parser, not a copy of its pattern.
      expect(activityInHash.call(null, hash) || /^#activity=/.test(hash)).toBe(
        true
      );
      expect(parseActivityHash(hash)).toEqual({
        activity,
        format: 'route',
      });
    }
  });

  for (const { activity, lesson } of ROUTES) {
    test(`${activity}: a cold link opens it with its prerequisites`, async ({
      page,
      app,
    }) => {
      test.slow();
      await openRoute(page, app, activity);

      // The assignment is the route's steps plus whatever the resolver had to
      // add - the setup a chosen step needs, or the run a later step refers
      // back to. What must not happen is landing mid-route with the world
      // unbuilt.
      const state = await page.evaluate(async id => {
        const reg = await import('/js/data/investigations/registry.js');
        const loaded = await reg.loadInvestigation(id);
        return { lessonSteps: loaded.steps.length };
      }, lesson);
      expect(state.lessonSteps).toBeGreaterThan(3);

      // The counter says how many steps this route actually runs, and it is
      // fewer than the whole investigation: a route is a cut of a lesson, not
      // the lesson.
      // textContent, not innerText: the counter is uppercased by CSS, so
      // innerText hands back "STEP 1 OF 3" and a lowercase pattern misses it.
      const counter = await page.evaluate(
        () => document.querySelector('.inv-step-count')?.textContent ?? ''
      );
      const total = Number(counter.match(/of\s+(\d+)/i)?.[1] ?? 0);
      expect(total).toBeGreaterThan(0);
      expect(total).toBeLessThan(state.lessonSteps);

      // And the fragment survives, so the link can be reloaded, bookmarked or
      // pasted into an LMS. This is the half js/share.js used to strip.
      expect(page.url()).toContain(`#activity=${activity}/route`);
    });
  }

  test('closing a route gives the sandbox back', async ({ page, app }) => {
    test.slow();
    // What the reader had before: an ordinary sandbox, with a scenario of
    // their own and a camera they had moved.
    await app.boot({ url: '/' });
    await app.loadScenario('Solar System');
    await page.evaluate(async () => {
      const { state } = await import('/js/appState.js');
      state.zoom = 2.5;
      state.pan = { x: 40, y: -25 };
    });
    const before = await page.evaluate(async () => {
      const { state, current_scenario_name } = await import('/js/appState.js');
      return {
        scenario: current_scenario_name,
        zoom: state.zoom,
        pan: { ...state.pan },
      };
    });

    await page.evaluate(() => {
      window.location.hash = 'activity=star-sizes/route';
    });
    await expect(page.locator('#investigationPanel')).toBeVisible();
    await page.locator('#investigationClose').click();
    await expect(page.locator('#investigationPanel')).toBeHidden();

    const after = await page.evaluate(async () => {
      const { state, current_scenario_name } = await import('/js/appState.js');
      return {
        scenario: current_scenario_name,
        zoom: state.zoom,
        pan: { ...state.pan },
      };
    });
    expect(after.scenario).toBe(before.scenario);
    expect(after.zoom).toBeCloseTo(before.zoom, 3);
    expect(after.pan.x).toBeCloseTo(before.pan.x, 3);
    expect(after.pan.y).toBeCloseTo(before.pan.y, 3);
  });

  test('the cards are complete in Spanish too', async ({ page }) => {
    await openTeaching(page, { locale: 'es' });
    for (const { activity } of ROUTES) {
      // The format card, not the activity card that contains it: both are
      // <article> and the link lives in the inner one.
      const card = page.locator('#teachActivities .teach-activity-format', {
        has: page.locator(`a[href*="activity=${activity}&format=route"]`),
      });
      await expect(card).toHaveCount(1);
      const text = await card.innerText();
      // Nothing on the card may be a raw message id, which is what an
      // untranslated string looks like.
      expect(text).not.toMatch(/teach\.activity\./);
      expect(text.length).toBeGreaterThan(120);
    }
  });

  test('the cards hold together on a small phone', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 700 });
    await openTeaching(page);
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth
    );
    expect(overflow).toBeLessThanOrEqual(1);
    for (const { activity } of ROUTES) {
      const link = page
        .locator(
          `#teachActivities a[href*="activity=${activity}&format=route"]`
        )
        .first();
      await link.scrollIntoViewIfNeeded();
      await expect(link).toBeVisible();
      const box = await link.boundingBox();
      expect(box.height).toBeGreaterThanOrEqual(32);
      expect(box.x + box.width).toBeLessThanOrEqual(321);
    }
  });
});

// =============================================================================
// The instructor quick-start, the evaluation template and the feedback form
// -----------------------------------------------------------------------------
// Three sections that make claims about themselves, which is why they are
// tested rather than eyeballed. The quick-start says what a class needs; the
// evaluation template says, at length, that no study has been run; and the
// feedback form says that what is typed into it never leaves the browser.
//
// The last of those is the one a test has to prove rather than repeat. A page
// that asks a teacher about their class and then posts it somewhere would be a
// serious breach of what this project says about itself, and "we did not write
// a fetch" is not evidence. The assertion is on the network.
// =============================================================================

test.describe('the instructor quick-start', () => {
  test('answers all six questions, with nothing left as a message id', async ({
    page,
  }) => {
    await openTeaching(page);
    const cards = page.locator('#teachQuickstart section');
    await expect(cards).toHaveCount(QUICKSTART.length);
    const text = await page.locator('#teachQuickstart').innerText();
    expect(text).not.toMatch(/teach\.quickstart\./);
    // Each card is an answer, not a heading with a promise under it.
    for (let i = 0; i < QUICKSTART.length; i++) {
      const body = await cards.nth(i).locator('p').first().innerText();
      expect(body.length).toBeGreaterThan(80);
    }
  });

  test('is honest that the durations have never been timed', async ({
    page,
  }) => {
    await openTeaching(page);
    const text = await page.locator('#teachQuickstart').innerText();
    expect(text).toMatch(/estimate/i);
    expect(text).not.toMatch(/proven|validated|measured learning/i);
  });
});

test.describe('the evaluation template', () => {
  test('is a template, and says no study has been run', async ({ page }) => {
    await openTeaching(page);
    await expect(page.locator('#teachEvaluate li')).toHaveCount(
      EVALUATION.length
    );
    const intro = await page.locator('#evaluate + p').innerText();
    // The claim this section exists to avoid making.
    expect(intro).toMatch(/no study|ning[úu]n estudio/i);
    const whole = await page.locator('#teachEvaluate').innerText();
    expect(whole).not.toMatch(/teach\.evaluate\./);
    // Institutional review is the item people skip, so it has to be there.
    expect(whole).toMatch(/review board|institutional review|comit[ée]/i);
  });
});

test.describe('the classroom feedback form', () => {
  test('keeps what is typed in the browser and sends nothing', async ({
    page,
  }) => {
    // Every request the page makes that does not go to the server this test
    // is running against. The form asks a teacher about their class, so a
    // request leaving here would be the one defect on this page that matters
    // more than all the others - and "we did not write a fetch" is not
    // evidence. A first draft of this returned early on exactly the URLs it
    // was supposed to be catching, and would have passed while the notes were
    // posted to anywhere at all.
    const offsite = [];
    page.on('request', request => {
      const url = request.url();
      if (/^https?:\/\/(127\.0\.0\.1|localhost)[:/]/.test(url)) return;
      if (url.startsWith('data:') || url.startsWith('blob:')) return;
      offsite.push(url);
    });
    await openTeaching(page);

    await expect(page.locator('#teachFeedbackForm textarea')).toHaveCount(
      FEEDBACK_FIELDS.length
    );
    // Nothing that identifies anybody is asked for.
    const labels = await page
      .locator('#teachFeedbackForm label')
      .allInnerTexts();
    expect(labels.join(' ')).not.toMatch(
      /name|e-?mail|correo|nombre|institution|instituci/i
    );

    await page.fill('#teachFeedback-route', 'Two stars, one temperature');
    await expect(page.locator('#teachFeedbackStatus')).not.toBeEmpty();

    const stored = await page.evaluate(() =>
      window.localStorage.getItem('gravitas_teaching_notes_v1')
    );
    expect(stored).toContain('Two stars');
    expect(offsite, 'requests to anywhere but this origin').toEqual([]);
  });

  test('exports a file and clears itself', async ({ page }) => {
    await openTeaching(page);
    await page.fill(
      '#teachFeedback-worked',
      'The prediction being held worked.'
    );

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('#teachFeedbackExport').click(),
    ]);
    expect(download.suggestedFilename()).toMatch(
      /^gravitas-classroom-notes-\d{4}-\d{2}-\d{2}\.md$/
    );

    await page.locator('#teachFeedbackClear').click();
    await expect(page.locator('#teachFeedback-worked')).toHaveValue('');
    const stored = await page.evaluate(() =>
      window.localStorage.getItem('gravitas_teaching_notes_v1')
    );
    expect(stored).toBeNull();
  });

  test('says nothing to save when there is nothing', async ({ page }) => {
    await openTeaching(page);
    await page.locator('#teachFeedbackExport').click();
    await expect(page.locator('#teachFeedbackStatus')).toContainText(
      /nothing to save|todav[íi]a no hay/i
    );
  });
});
