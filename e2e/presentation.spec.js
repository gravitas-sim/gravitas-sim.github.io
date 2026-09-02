// =============================================================================
// Embed mode, Lecture Mode, and the language picker
// -----------------------------------------------------------------------------
// Three presentations of one simulation, and the thing they have in common: a
// presentation change must never touch the simulation underneath it, and a
// language change must never touch either.
//
// Most of what matters here cannot be reached without a browser. Whether the
// rail is gone is a question about CSS at a particular viewport width; whether
// arrow keys reach the lecture rather than the pan handler is a question about
// two listeners on `window`; whether Spanish overflows a 375px settings panel
// is a question about layout. All three are checked at real sizes.
// =============================================================================

/* global navigator */
import { test, expect } from './fixtures.js';

/** Sizes an embedded figure actually meets in a course page. */
const LMS_SIZES = [
  { name: 'Canvas content column', width: 750, height: 469 },
  { name: 'Canvas narrow module', width: 320, height: 200 },
  { name: 'Blackboard content frame', width: 700, height: 438 },
  { name: '4:3 iframe', width: 640, height: 480 },
  { name: '16:9 wide', width: 960, height: 540 },
];

/** Build a real share link through the codec the application itself uses. */
async function shareLinkFor(page, scenario, seed = 'e2e-presentation') {
  return page.evaluate(
    async ({ scenario, seed }) => {
      const ui = await import('/js/ui.js');
      const { encodePayload, shareUrl } = await import('/js/shareState.js');
      ui.SETTINGS.preset_scenario = scenario;
      ui.initialize_simulation({ seed });
      const payload = ui.captureShareState({
        kind: 'seeded',
        includeCamera: true,
        elapsed: 0,
      });
      return shareUrl(await encodePayload(payload));
    },
    { scenario, seed }
  );
}

/** The world, as something to compare across a presentation change. */
const worldState = page =>
  page.evaluate(async () => {
    const ui = await import('/js/ui.js');
    const P = await import('/js/physics.js');
    const { getWorldSeed } = await import('/js/rng.js');
    return {
      scenario: ui.current_scenario_name,
      seed: getWorldSeed(),
      planets: P.planets.length,
      asteroids: P.asteroids.length,
      stars: P.stars.length,
      zoom: Number(ui.state.zoom.toFixed(4)),
    };
  });

/** Whether anything visible sticks out past the viewport. */
/* global requestAnimationFrame */

/**
 * Wait for every running transition to finish before measuring geometry.
 *
 * Panels here slide in, and an element halfway through a slide is genuinely
 * outside the viewport - so a scan that lands mid-transition reports an
 * overflow that does not exist a frame later. Waiting on the animations
 * themselves rather than on a fixed delay is what makes the overflow scan
 * measure the settled layout under load as well as on an idle machine. The
 * cap is there because an indefinitely repeating animation never finishes.
 */
const settle = page =>
  page.evaluate(async () => {
    await Promise.race([
      Promise.allSettled(document.getAnimations().map(a => a.finished)),
      new Promise(resolve => setTimeout(resolve, 1500)),
    ]);
    await new Promise(resolve =>
      requestAnimationFrame(() => requestAnimationFrame(resolve))
    );
  });

const overflows = page =>
  page.evaluate(() => {
    const de = document.documentElement;
    const out = [];
    for (const el of document.querySelectorAll('body *')) {
      // checkVisibility rather than a hand-rolled display/opacity test: several
      // panels here are hidden by putting opacity to 0 on the panel while its
      // children keep their own opacity of 1, and a manual check sees only the
      // element it is standing on.
      if (
        typeof el.checkVisibility === 'function' &&
        !el.checkVisibility({
          opacityProperty: true,
          visibilityProperty: true,
          contentVisibilityAuto: true,
        })
      )
        continue;
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') continue;
      if (parseFloat(cs.opacity) === 0) continue;
      // Parked off-screen until focused, by design.
      if (el.closest('.skip-link') || el.closest('.visually-hidden')) continue;
      const b = el.getBoundingClientRect();
      if (b.width === 0 || b.height === 0) continue;
      // Horizontal only. Vertical overflow is how the control rail works: it is
      // taller than a laptop screen with every group open and scrolls inside
      // itself, so flagging what is below the fold would be reporting the
      // design. Whether the *page* scrolls, in either direction, is asserted
      // separately - and that is the property that matters in an embed.
      if (b.right > de.clientWidth + 2 || b.left < -2)
        out.push(el.tagName + (el.id ? '#' + el.id : ''));
    }
    return {
      elements: [...new Set(out)],
      scrollX: de.scrollWidth > de.clientWidth,
      scrollY: de.scrollHeight > de.clientHeight,
    };
  });

/**
 * Enter Lecture Mode and wait until it is actually in force.
 *
 * The keypress can land before the shortcut registry is listening on a slow
 * boot, and every measurement after it would then be of the ordinary interface.
 * Polling the mode rather than sleeping is what makes these tests measure
 * Lecture Mode rather than a race with it.
 */
async function enterLecture(page) {
  // V *toggles*, so it is pressed once and then waited on rather than retried:
  // a second press inside a poll would turn Lecture Mode straight back off.
  await page.keyboard.press('v');
  await expect
    .poll(
      () =>
        page.evaluate(() => document.body.getAttribute('data-presentation')),
      { timeout: 15000 }
    )
    .toBe('lecture');
  // One more beat so the token changes have reached the layout.
  await page.waitForTimeout(250);
}

// =============================================================================
test.describe('embed mode', () => {
  test('?embed=1 alone opens a figure with no application chrome', async ({
    page,
    app,
  }) => {
    await app.boot({ url: '/?embed=1' });
    await app.waitForFrames(5);

    const shell = await page.evaluate(() => {
      const display = sel => {
        const el = document.querySelector(sel);
        return el ? getComputedStyle(el).display : 'missing';
      };
      return {
        mode: document.body.getAttribute('data-presentation'),
        rail: display('.ui-container'),
        footer: display('#attribution'),
        welcome: display('#welcomeScreen'),
        readout: display('#overlay'),
        tutorial: display('#tutorialBtn'),
        transport: display('#timelineBar'),
        openFull: display('#embedOpenFull'),
      };
    });

    expect(shell.mode).toBe('embed');
    // Gone: everything that is about the application rather than the figure.
    for (const part of ['rail', 'footer', 'welcome', 'readout', 'tutorial']) {
      expect(shell[part], part).toBe('none');
    }
    // Kept: the controls the figure needs to be a figure, and one way out.
    expect(shell.transport).not.toBe('none');
    expect(shell.openFull).not.toBe('none');
  });

  test('the front door never appears inside an embed', async ({
    page,
    app,
  }) => {
    // A first-time visitor to the *host page* has not visited Gravitas, so the
    // welcome layer would otherwise cover the whole figure.
    await app.boot({ firstVisit: true, url: '/?embed=1' });
    await app.waitForFrames(5);
    await expect(page.locator('#welcomeScreen')).toBeHidden();
  });

  test('embed=1 composes with a share link and restores its state', async ({
    page,
    app,
  }) => {
    await app.boot();
    const link = await shareLinkFor(page, 'Kuiper Belt');
    await page.evaluate(async () => {
      const ui = await import('/js/ui.js');
      ui.state.zoom = 2.25;
    });

    // Open the plain link, and the same link with the parameter added.
    await page.goto(link, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.splashScreenEnded === true);
    await page.waitForTimeout(700);
    const plain = await worldState(page);

    const embedded = await page.evaluate(async l => {
      const { withEmbedParam } = await import('/js/presentation.js');
      return withEmbedParam(l);
    }, link);
    expect(embedded).toContain('?embed=1#');

    await page.goto(embedded, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.splashScreenEnded === true);
    await page.waitForTimeout(700);
    const inEmbed = await worldState(page);

    // The presentation changed; the simulation did not.
    expect(inEmbed).toEqual(plain);
    expect(
      await page.evaluate(() => document.body.getAttribute('data-presentation'))
    ).toBe('embed');
  });

  test('Copy embed code produces an iframe that restores the same state', async ({
    page,
    context,
    app,
  }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await app.boot();
    await app.loadScenario('Kuiper Belt', 'embed-copy');
    await page.evaluate(async () => {
      const ui = await import('/js/ui.js');
      ui.state.zoom = 1.75;
    });
    await app.waitForFrames(5);
    const before = await worldState(page);

    await app.railControl('shareBtn');

    await page.locator('#shareBtn').click();
    await expect(page.locator('#shareEmbedBtn')).toBeVisible();
    await page.locator('#shareEmbedBtn').click();

    const snippet = await page.evaluate(() => navigator.clipboard.readText());
    expect(snippet).toContain('<iframe');
    expect(snippet).toContain('loading="lazy"');
    expect(snippet).toContain('allowfullscreen');
    expect(snippet).toMatch(/title="[^"]*Kuiper Belt[^"]*"/);

    const src = snippet
      .match(/src="([^"]+)"/)[1]
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"');
    expect(src).toContain('embed=1');

    // Requirement 10: pasting the generated URL restores exactly this world.
    await page.goto(src, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.splashScreenEnded === true);
    await page.waitForTimeout(800);
    expect(await worldState(page)).toEqual(before);
  });

  for (const size of LMS_SIZES) {
    test(`fills its frame with no scrolling at ${size.name} (${size.width}x${size.height})`, async ({
      page,
      app,
    }) => {
      await page.setViewportSize({ width: size.width, height: size.height });
      await app.boot({ url: '/?embed=1' });
      await app.waitForFrames(5);

      const r = await settle(page).then(() => overflows(page));
      expect(r.scrollX, 'horizontal scrolling').toBe(false);
      expect(r.scrollY, 'vertical scrolling').toBe(false);
      expect(r.elements).toEqual([]);

      // The canvas takes the whole frame: an embed with letterboxing is an
      // embed that has wasted the host's space.
      const canvas = await page.evaluate(() => {
        const c = document.getElementById('simulationCanvas');
        return { w: c.width, h: c.height };
      });
      expect(canvas.w).toBe(size.width);
      expect(canvas.h).toBe(size.height);
    });
  }
});

// =============================================================================
test.describe('lecture mode', () => {
  test.use({ viewport: { width: 1024, height: 768 } });

  test('hides the chrome and borrows the Daylight theme', async ({
    page,
    app,
  }) => {
    await app.boot();
    await page.evaluate(async () =>
      (await import('/js/theme.js')).setTheme('observatory')
    );
    await app.waitForFrames(3);

    await enterLecture(page);

    const state = await page.evaluate(async () => {
      const display = sel => {
        const el = document.querySelector(sel);
        return el ? getComputedStyle(el).display : 'missing';
      };
      return {
        mode: document.body.getAttribute('data-presentation'),
        theme: (await import('/js/theme.js')).getTheme(),
        rail: display('.ui-container'),
        footer: display('#attribution'),
        transport: display('#timelineBar'),
        bar: display('#lectureBar'),
      };
    });
    expect(state.mode).toBe('lecture');
    expect(state.theme).toBe('daylight');
    expect(state.rail).toBe('none');
    expect(state.footer).toBe('none');
    expect(state.transport).toBe('none');
    expect(state.bar).not.toBe('none');
  });

  test('is genuinely readable and operable at 1024x768', async ({
    page,
    app,
  }) => {
    await app.boot();
    await app.waitForFrames(3);
    await enterLecture(page);
    // Lecture mode moves the type scale, and the interface transitions into the
    // new sizes rather than snapping to them. Measuring a font-size mid
    // transition reads a value part way between the desktop size and the
    // projection size - which is why this waits for the transitions rather than
    // for the mode alone.
    await settle(page);

    const m = await page.evaluate(() => {
      const px = sel => {
        const el = document.querySelector(sel);
        return el ? parseFloat(getComputedStyle(el).fontSize) : 0;
      };
      const buttons = [...document.querySelectorAll('.lecture-btn')].map(b => {
        const r = b.getBoundingClientRect();
        return { w: Math.round(r.width), h: Math.round(r.height) };
      });
      const c = document.getElementById('simulationCanvas');
      const bar = document.getElementById('lectureBar').getBoundingClientRect();
      return {
        readout: px('#overlay'),
        cardTitle: px('#scenarioInfoTitle') || px('#scenarioInfoBox h2'),
        buttons,
        canvasArea: c.width * c.height,
        viewportArea: window.innerWidth * window.innerHeight,
        barRows: Math.round(bar.height / 48),
      };
    });

    // Type large enough to read from the back of a room. The desktop interface
    // runs at 12-14px; these are the projection sizes.
    expect(m.readout).toBeGreaterThanOrEqual(16);
    expect(m.cardTitle).toBeGreaterThanOrEqual(24);
    // Every control at least the 48px minimum target, which is what a lecturer
    // can hit while looking at the room rather than the screen.
    for (const b of m.buttons) {
      expect(b.h).toBeGreaterThanOrEqual(48);
      expect(b.w).toBeGreaterThanOrEqual(48);
    }
    // The bar fits on one row rather than stacking over the simulation.
    expect(m.barRows).toBe(1);
    // The canvas is still the page: chrome has not eaten the simulation.
    expect(m.canvasArea).toBe(m.viewportArea);

    const r = await settle(page).then(() => overflows(page));
    expect(r.scrollX).toBe(false);
    expect(r.elements).toEqual([]);
  });

  test('settings stay reachable during a lecture', async ({ page, app }) => {
    // A question from the room is often "what if gravity were stronger?".
    await app.boot();
    await enterLecture(page);
    await page.evaluate(() => document.getElementById('settingsBtn')?.click());
    await page.waitForTimeout(500);
    await expect(page.locator('#settingsPanel')).toBeVisible();
    const r = await settle(page).then(() => overflows(page));
    expect(r.scrollX).toBe(false);
  });

  test('the arrow keys step a prepared sequence and stay in lecture mode', async ({
    page,
    app,
  }) => {
    await app.boot();
    const links = [];
    for (const key of ['Solar System', 'Kuiper Belt', 'Binary Star System']) {
      links.push(await shareLinkFor(page, key, `seq-${key}`));
    }

    await enterLecture(page);
    await page.locator('#lectureSequenceBtn').click();
    await page
      .locator('#lectureSequenceText')
      .fill(links.join('\n') + '\nnot a gravitas link');
    await page.locator('#lectureSequenceLoad').click();
    await expect
      .poll(
        async () =>
          await page.evaluate(async () =>
            (await import('/js/lecture.js')).getPosition()
          )
      )
      .toBe(0);

    const read = () =>
      page.evaluate(async () => {
        const L = await import('/js/lecture.js');
        const ui = await import('/js/ui.js');
        return {
          position: L.getPosition(),
          length: L.getSequence().length,
          scenario: ui.current_scenario_name,
          mode: document.body.getAttribute('data-presentation'),
          theme: (await import('/js/theme.js')).getTheme(),
        };
      });

    // The non-link line was dropped rather than failing the whole paste.
    expect((await read()).length).toBe(3);
    expect((await read()).scenario).toBe('Solar System');

    await page.keyboard.press('ArrowRight');
    await expect.poll(async () => (await read()).position).toBe(1);
    expect((await read()).scenario).toBe('Kuiper Belt');

    await page.keyboard.press('ArrowRight');
    await expect.poll(async () => (await read()).position).toBe(2);
    expect((await read()).scenario).toBe('Binary Star System');

    await page.keyboard.press('ArrowLeft');
    await expect.poll(async () => (await read()).position).toBe(1);
    expect((await read()).scenario).toBe('Kuiper Belt');

    // Changing share state does not drop out of the presentation.
    const now = await read();
    expect(now.mode).toBe('lecture');
    expect(now.theme).toBe('daylight');
  });

  test('the arrow keys are left alone when a control has the keyboard', async ({
    page,
    app,
  }) => {
    await app.boot();
    const link = await shareLinkFor(page, 'Solar System');
    await enterLecture(page);
    await page.locator('#lectureSequenceBtn').click();
    await page.locator('#lectureSequenceText').fill(`${link}\n${link}`);
    await page.locator('#lectureSequenceLoad').click();
    await page.waitForTimeout(900);

    const at = () =>
      page.evaluate(async () => (await import('/js/lecture.js')).getPosition());
    const before = await at();

    // Typing in the sequence box must move the caret, not the lecture.
    await page.locator('#lectureSequenceBtn').click();
    await page.locator('#lectureSequenceText').focus();
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(300);
    expect(await at()).toBe(before);
  });

  test('the spotlight follows the pointer and never reaches the simulation', async ({
    page,
    app,
  }) => {
    await app.boot();
    await app.loadScenario('Binary Star System', 'spotlight');
    await enterLecture(page);
    const before = await worldState(page);

    await page.locator('#lectureSpotlightBtn').click();
    await page.mouse.move(320, 420);
    await page.waitForTimeout(200);

    const spot = await page.evaluate(async () => {
      const el = document.querySelector('.lecture-spotlight-layer');
      const cs = el ? getComputedStyle(el) : null;
      return {
        on: (await import('/js/lecture.js')).isSpotlightOn(),
        pointerEvents: cs?.pointerEvents,
        x: cs?.getPropertyValue('--spot-x').trim(),
        y: cs?.getPropertyValue('--spot-y').trim(),
        pressed: document
          .getElementById('lectureSpotlightBtn')
          .getAttribute('aria-pressed'),
        ariaHidden: el?.getAttribute('aria-hidden'),
      };
    });
    expect(spot.on).toBe(true);
    expect(spot.pressed).toBe('true');
    // It cannot be clicked, so a click still reaches the canvas underneath.
    expect(spot.pointerEvents).toBe('none');
    expect(spot.ariaHidden).toBe('true');
    expect(spot.x).toBe('320px');
    expect(spot.y).toBe('420px');

    // And the simulation is exactly as it was: a spotlight is a light.
    const after = await worldState(page);
    expect(after.scenario).toBe(before.scenario);
    expect(after.seed).toBe(before.seed);
    expect(after.planets).toBe(before.planets);

    // Turning it off removes the layer rather than hiding it.
    await page.locator('#lectureSpotlightBtn').click();
    await page.waitForTimeout(200);
    expect(await page.locator('.lecture-spotlight-layer').count()).toBe(0);
  });

  test('Escape leaves, and puts the theme back', async ({ page, app }) => {
    await app.boot();
    await page.evaluate(async () =>
      (await import('/js/theme.js')).setTheme('deep')
    );
    await app.waitForFrames(3);
    const before = await worldState(page);

    await enterLecture(page);
    expect(
      await page.evaluate(async () => (await import('/js/theme.js')).getTheme())
    ).toBe('daylight');

    await page.locator('#lectureSpotlightBtn').click();
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    const after = await page.evaluate(async () => ({
      mode: document.body.getAttribute('data-presentation'),
      theme: (await import('/js/theme.js')).getTheme(),
      spotlight: (await import('/js/lecture.js')).isSpotlightOn(),
      layer: document.querySelectorAll('.lecture-spotlight-layer').length,
    }));
    expect(after.mode).toBe('normal');
    // Borrowed, not taken: the lecturer's own preference comes back.
    expect(after.theme).toBe('deep');
    expect(after.spotlight).toBe(false);
    expect(after.layer).toBe(0);
    // And the simulation never noticed any of it.
    expect(await worldState(page)).toEqual(before);
  });
});

// =============================================================================
test.describe('language', () => {
  const localeOf = page =>
    page.evaluate(async () => (await import('/js/i18n/index.js')).getLocale());

  test('English is the default and the picker offers Spanish', async ({
    page,
    app,
  }) => {
    await app.boot();
    expect(await localeOf(page)).toBe('en');
    await page.locator('#localeButton').click();
    await expect(page.locator('#localeMenu')).toBeVisible();
    await expect(page.locator('[data-locale-option="es"]')).toBeVisible();
  });

  test('the picker is a code and a language, and nothing else', async ({
    page,
    app,
  }) => {
    // It used to carry a sentence under each option saying what Spanish did and
    // did not cover, because the investigations were English-only. They are
    // translated now, so the sentence describes nothing and a menu of two
    // languages does not need three lines to say so.
    await app.boot();
    await page.locator('#localeButton').click();
    const option = page.locator('[data-locale-option="es"]');
    await expect(option).toBeVisible();
    await expect(option.locator('.locale-menu-code')).toHaveText('ES');
    // The endonym, not the English name: somebody looking for Spanish is
    // looking for the word they use for their own language.
    await expect(option.locator('.theme-menu-label')).toHaveText('Español');
    await expect(option.locator('.theme-menu-hint')).toHaveCount(0);
    // And the button itself says which language is on without opening anything.
    await expect(page.locator('#localeButtonCode')).toHaveText('EN');
  });

  test('choosing Spanish translates the chrome and survives a reload', async ({
    page,
    app,
  }) => {
    await app.boot();
    await page.locator('#localeButton').click();
    await page.locator('[data-locale-option="es"]').click();
    await page.waitForTimeout(300);

    await expect(page.locator('#loadScenarioBtn')).toContainText(
      'Cargar escenario'
    );
    await expect(page.locator('#settingsBtn')).toContainText('Ajustes');
    expect(await page.evaluate(() => document.documentElement.lang)).toBe('es');

    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.splashScreenEnded === true);
    await page.waitForTimeout(500);
    expect(await localeOf(page)).toBe('es');
    await expect(page.locator('#settingsBtn')).toContainText('Ajustes');
  });

  test('Settings, the gallery and the inspector are all translated', async ({
    page,
    app,
  }) => {
    await app.boot();
    await page.evaluate(async () =>
      (await import('/js/i18n/index.js')).setLocale('es')
    );
    await page.waitForTimeout(300);

    await page.evaluate(() => document.getElementById('settingsBtn').click());
    await expect(page.locator('#settingsPanel')).toBeVisible();
    await expect(page.locator('#settingsPanel')).toContainText(
      'Ajustes de la simulación'
    );
    await expect(page.locator('#settingsPanel')).toContainText(
      'Constante gravitatoria'
    );
    await page.locator('#settingsCancel').click();

    await app.railControl('loadScenarioBtn');

    await page.locator('#loadScenarioBtn').click();
    await expect(page.locator('#scenarioListModal')).toBeVisible();
    await expect(page.locator('#scenarioBrowserTitle')).toContainText(
      'Explorar escenarios'
    );
    await expect(page.locator('#scenarioListItems')).toContainText(
      'Sistema solar'
    );
    // The close button rather than Escape: the gallery focuses its search
    // field on open, and the global Escape shortcut correctly stands aside for
    // a focused text input.
    await page.locator('#closeScenarioList').click();
    await expect(page.locator('#scenarioListModal')).toBeHidden();

    // The inspector's row headings.
    await page.evaluate(async () => {
      const ui = await import('/js/ui.js');
      const P = await import('/js/physics.js');
      const body = P.stars[0] || P.planets[0] || P.bh_list[0];
      ui.showObjectInspector(body, body.obj_type || 'Star');
    });
    await page.waitForTimeout(400);
    await expect(page.locator('#inspectorContent')).toContainText('Masa');
  });

  test('the investigations stay English rather than half-translated', async ({
    page,
    app,
  }) => {
    await app.boot();
    await page.evaluate(async () =>
      (await import('/js/i18n/index.js')).setLocale('es')
    );
    await page.waitForTimeout(300);
    await page.locator('#investigationsBtn').click();
    await expect(page.locator('#investigationBrowser')).toBeVisible();
    await expect(page.locator('[data-investigation]').first()).toBeVisible();

    // Consistently English, which is what the picker promised. A lesson with a
    // Spanish heading over English steps would be the failure mode.
    const text = await page.locator('#investigationList').innerText();
    expect(text).toMatch(/Kepler/i);
    expect(text).not.toMatch(/investigación guiada|paso a paso/i);
  });

  test('Spanish does not overflow at any width this pass targets', async ({
    page,
    app,
  }) => {
    for (const size of [
      { width: 1440, height: 900 },
      { width: 1024, height: 768 },
      { width: 375, height: 812 },
    ]) {
      await page.setViewportSize(size);
      await app.boot();
      await page.evaluate(async () =>
        (await import('/js/i18n/index.js')).setLocale('es')
      );
      // Wait for the language to have landed in the markup, and for the
      // settings panel to have been rebuilt in it, rather than sleeping: three
      // boots in one test is enough work that a fixed delay becomes a race.
      await expect(page.locator('#settingsBtn')).toContainText('Ajustes');
      await page.evaluate(() => document.getElementById('settingsBtn').click());
      await expect(page.locator('#settingsPanel')).toBeVisible();
      await expect(page.locator('#settingsPanel')).toContainText(
        'Constante gravitatoria'
      );

      const r = await settle(page).then(() => overflows(page));
      expect(r.scrollX, `${size.width}x${size.height} scrolls sideways`).toBe(
        false
      );
      expect(r.elements, `${size.width}x${size.height}`).toEqual([]);
    }
  });

  test('Embed and Lecture Mode speak the chosen language too', async ({
    page,
    app,
  }) => {
    await app.boot({ url: '/?embed=1' });
    await page.evaluate(async () =>
      (await import('/js/i18n/index.js')).setLocale('es')
    );
    await page.waitForTimeout(300);
    await expect(page.locator('#embedOpenFull')).toContainText(
      'Abrir en Gravitas'
    );

    await app.boot();
    await page.evaluate(async () =>
      (await import('/js/i18n/index.js')).setLocale('es')
    );
    await page.waitForTimeout(300);
    await expect(page.locator('#lectureBtn')).toContainText(
      'Modo presentación'
    );
    await enterLecture(page);
    await expect(page.locator('#lectureExitBtn')).toContainText(
      'Salir del modo presentación'
    );
    await expect(page.locator('#lectureSpotlightBtn')).toContainText('Foco');
    await expect(page.locator('#lecturePosition')).toContainText(
      'No hay ninguna secuencia'
    );
  });

  test('a lecture in progress follows a language change', async ({
    page,
    app,
  }) => {
    // The step counter is rendered text rather than a data-i18n attribute, so
    // it has to be repainted rather than swept. It said "Paso 2 de 3" after a
    // switch back to English until it was.
    await app.boot();
    const link = await shareLinkFor(page, 'Solar System', 'locale-mid-lecture');
    await enterLecture(page);
    await page.locator('#lectureSequenceBtn').click();
    await page.locator('#lectureSequenceText').fill(`${link}\n${link}`);
    await page.locator('#lectureSequenceLoad').click();
    await expect(page.locator('#lecturePosition')).toContainText('Step 1 of 2');

    await page.evaluate(async () =>
      (await import('/js/i18n/index.js')).setLocale('es')
    );
    await expect(page.locator('#lecturePosition')).toContainText('Paso 1 de 2');

    await page.evaluate(async () =>
      (await import('/js/i18n/index.js')).setLocale('en')
    );
    await expect(page.locator('#lecturePosition')).toContainText('Step 1 of 2');
    // And the presentation survived both.
    expect(
      await page.evaluate(() => document.body.getAttribute('data-presentation'))
    ).toBe('lecture');
  });

  test('changing language leaves the simulation exactly as it was', async ({
    page,
    app,
  }) => {
    await app.boot();
    await app.loadScenario('Kuiper Belt', 'locale-stability');
    await app.waitForFrames(5);
    await app.setPaused(true);
    const before = await worldState(page);

    await page.evaluate(async () =>
      (await import('/js/i18n/index.js')).setLocale('es')
    );
    await page.waitForTimeout(400);
    expect(await worldState(page)).toEqual(before);

    await page.evaluate(async () =>
      (await import('/js/i18n/index.js')).setLocale('en')
    );
    await page.waitForTimeout(400);
    expect(await worldState(page)).toEqual(before);
  });
});

// =============================================================================
// The chrome rework
// -----------------------------------------------------------------------------
// The readout, the control rail and the bottom dock. What is worth holding onto
// is the property each change was made for, not the pixels: the readout shows
// only what is there, the rail fits on a screen, and the scrubber cannot reach
// the footer in any language at any width.
// =============================================================================

test.describe('the readout', () => {
  test('reports only the kinds of body that are present', async ({
    page,
    app,
  }) => {
    await app.boot();
    await app.waitForFrames(3);
    const counts = await page.evaluate(() =>
      [...document.querySelectorAll('#overlayStats .readout-count')].map(
        li => ({
          n: Number(li.querySelector('b').textContent),
          label: li.querySelector('span').textContent,
        })
      )
    );
    expect(counts.length).toBeGreaterThan(0);
    // The whole point of the rewrite: no rows of zeros.
    expect(counts.filter(c => c.n === 0)).toEqual([]);
  });

  test('carries the live measurements and not a keyboard crib', async ({
    page,
    app,
  }) => {
    await app.boot();
    await app.waitForFrames(3);
    const text = await page.locator('#overlay').innerText();
    // Elapsed time moved in from the canvas panel that used to sit bottom-left.
    await expect(page.locator('#overlayStats')).toContainText(/Elapsed/i);
    await expect(page.locator('#overlayStats')).toContainText(/Zoom/i);
    // The crib went to the Shortcuts dialog.
    expect(text).not.toMatch(/Arrow Keys/i);
    expect(text).not.toMatch(/Scroll = Zoom/i);
  });

  test('says whether the simulation is running, in the header', async ({
    page,
    app,
  }) => {
    await app.boot();
    const status = page.locator('#overlayStatus');
    await expect(status).toHaveAttribute('data-state', 'running');
    // A colour is not the only signal: the word is there too.
    await expect(status).toContainText(/running/i);
    // Through the transport bar rather than the Space shortcut: the shortcut
    // needs the page to have focus, and what is being tested here is the
    // readout following the state, not how the state was reached.
    await page.locator('#timelinePlay').click();
    await expect(status).toHaveAttribute('data-state', 'paused');
    await expect(status).toContainText(/paused/i);
  });
});

test.describe('the control rail', () => {
  test('shows one section at a time and fits the screen', async ({
    page,
    app,
  }) => {
    await app.boot();
    const open = () =>
      page.evaluate(() =>
        [...document.querySelectorAll('.rail-section-toggle')]
          .filter(t => t.getAttribute('aria-expanded') === 'true')
          .map(t => t.id)
      );
    expect(await open()).toEqual(['railScenario']);

    await page.locator('#railTools').click();
    expect(await open()).toEqual(['railTools']);

    // Every group is one click away, and the rail never needs scrolling to
    // reach the end of the one that is open.
    const fits = await page.evaluate(() => {
      const rail = document.getElementById('mainControls');
      return rail.scrollHeight <= rail.clientHeight + 1;
    });
    expect(fits).toBe(true);
  });

  test('a click on the open section shuts it', async ({ page, app }) => {
    await app.boot();
    await page.locator('#railScenario').click();
    const open = await page.evaluate(
      () =>
        [...document.querySelectorAll('.rail-section-toggle')].filter(
          t => t.getAttribute('aria-expanded') === 'true'
        ).length
    );
    expect(open).toBe(0);
  });

  test('the analysis panels are chips that show their own state', async ({
    page,
    app,
  }) => {
    await app.boot();
    await app.railControl('toggleLightCurve');
    const chip = page.locator('#toggleLightCurve');
    await expect(chip).toHaveClass(/rail-chip/);
    await expect(chip).toHaveAttribute('aria-pressed', 'false');
    await chip.click();
    await expect(chip).toHaveAttribute('aria-pressed', 'true');
  });
});

test.describe('the bottom dock', () => {
  const read = page =>
    page.evaluate(() => {
      const b = document.querySelector('.timeline-bar').getBoundingClientRect();
      const f = document.querySelector('#attribution').getBoundingClientRect();
      const r = document
        .querySelector('#mainControls')
        ?.getBoundingClientRect();
      return {
        offCentre: Math.round((b.left + b.right) / 2 - window.innerWidth / 2),
        barWidth: Math.round(b.width),
        footerInset: Math.round(window.innerWidth - f.right),
        gap: Math.round(f.left - b.right),
        railOverFooter: r ? r.bottom > f.top && r.left < f.right : false,
        banded: document.body.classList.contains('dock-banded'),
      };
    });

  for (const size of [
    { width: 2560, height: 900 },
    { width: 1999, height: 900 },
    { width: 1700, height: 900 },
    { width: 1600, height: 900 },
    { width: 1440, height: 900 },
    { width: 1300, height: 900 },
    { width: 1200, height: 900 },
    { width: 1100, height: 900 },
    { width: 1025, height: 900 },
  ]) {
    for (const locale of ['en', 'es']) {
      test(`the scrubber clears the footer at ${size.width}px in ${locale}`, async ({
        page,
        app,
      }) => {
        // The bug this replaces: the transport bar centred itself in the band
        // left of the rail and the footer sat in the corner, and neither knew
        // about the other. On a wide window the scrubber ran across the
        // copyright line - and Spanish, being longer, made it worse.
        await page.setViewportSize(size);
        await app.boot();
        if (locale !== 'en') {
          await page.evaluate(async () =>
            (await import('/js/i18n/index.js')).setLocale('es')
          );
          await expect(page.locator('#localeButtonCode')).toHaveText('ES');
        }
        await expect(page.locator('.timeline-bar')).toBeVisible();
        await expect(page.locator('#attribution')).toBeVisible();

        const m = await read(page);
        // A clear gap, not merely no overlap: the two must not look joined.
        expect(`${size.width}/${locale} gap=${m.gap}`).toBe(
          m.gap >= 12
            ? `${size.width}/${locale} gap=${m.gap}`
            : `${size.width}/${locale} TOO TIGHT`
        );
        // And the footer keeps its corner.
        expect(m.footerInset).toBeLessThanOrEqual(16);
      });
    }
  }

  test('the scrubber is centred on the window when there is room', async ({
    page,
    app,
  }) => {
    await page.setViewportSize({ width: 1999, height: 900 });
    await app.boot();
    const m = await read(page);
    expect(m.banded).toBe(false);
    expect(Math.abs(m.offCentre)).toBeLessThanOrEqual(1);
    expect(m.barWidth).toBe(680);
  });

  test('it narrows rather than shifting, until narrowing stops paying', async ({
    page,
    app,
  }) => {
    // Between the width where the full bar no longer fits and the width where
    // the slider would be too short to use, the bar gives up width and keeps
    // the centre. Below that it keeps its width and gives up the centre.
    await page.setViewportSize({ width: 1600, height: 900 });
    await app.boot();
    const narrowed = await read(page);
    expect(narrowed.banded).toBe(false);
    expect(Math.abs(narrowed.offCentre)).toBeLessThanOrEqual(1);
    expect(narrowed.barWidth).toBeLessThan(680);
    expect(narrowed.barWidth).toBeGreaterThanOrEqual(420);

    await page.setViewportSize({ width: 1100, height: 900 });
    await expect
      .poll(() =>
        page.evaluate(() => document.body.classList.contains('dock-banded'))
      )
      .toBe(true);
    const banded = await read(page);
    expect(Math.abs(banded.offCentre)).toBeGreaterThan(1);
    expect(banded.gap).toBeGreaterThanOrEqual(12);
  });

  test('the footer keeps the corner unless the rail comes down into it', async ({
    page,
    app,
  }) => {
    // The inset that used to be here reserved the rail's full width on every
    // screen, to avoid a rail that on most of them stops nowhere near the
    // corner. It is now reserved only when the rail actually arrives.
    await page.setViewportSize({ width: 1500, height: 1000 });
    await app.boot();
    await page.locator('#railTools').click();
    await expect(page.locator('#railToolsBody')).toBeVisible();

    const tall = await read(page);
    expect(tall.footerInset).toBeLessThanOrEqual(16);
    expect(tall.railOverFooter).toBe(false);

    // Short enough that the open section brings the rail's foot to the corner.
    await page.setViewportSize({ width: 1500, height: 620 });
    await expect
      .poll(() =>
        page.evaluate(() =>
          Math.round(
            window.innerWidth -
              document.querySelector('#attribution').getBoundingClientRect()
                .right
          )
        )
      )
      .toBeGreaterThan(100);
    const short = await read(page);
    expect(short.railOverFooter).toBe(false);
    expect(short.gap).toBeGreaterThanOrEqual(12);
  });
});
