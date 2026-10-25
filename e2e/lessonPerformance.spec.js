// =============================================================================
// What a lesson leaves behind when it closes
// -----------------------------------------------------------------------------
// Three questions, none of which a functional test asks:
//
//   1. does opening and closing a lesson twenty times leave anything behind -
//      event listeners, animation loops, audio contexts
//   2. does an instrument that repaints every frame stop when the lesson does
//   3. is anything left playing after the lesson that started it has gone
//
// Frame time is deliberately NOT here. `npm run perf` already measures it, and
// measures it better: it wraps the renderer's own entry points so the numbers
// line up with the functions in render.js, it can pin the quality tier, and it
// runs rAF at full rate. A first draft of this file took its own frame-time
// samples through the Playwright page and produced medians quantised to
// multiples of 16.67 ms, which described the harness rather than the
// application. Two instruments measuring the same thing, one of them worse, is
// how a suite starts being ignored.
//
// What is left here is the half `npm run perf` cannot see, and it is the half
// that is a yes-or-no question: a leak does not depend on how busy the machine
// is.
// =============================================================================

import { test, expect } from './fixtures.js';

/**
 * Count what the page is holding on to.
 *
 * Listeners are counted by patching the two registration methods before any
 * application script runs; animation frames by patching rAF. Neither is a
 * perfect census - a listener added and removed inside one frame is invisible
 * to it - but both are exact about the thing that matters, which is the
 * difference across a cycle.
 */
const INSTRUMENT = () => {
  // Every registration is remembered weakly, with the target it was made on.
  // Counting adds minus removes does not work: the object list builds fresh
  // buttons on every render and throws the old ones away, so six listeners a
  // cycle are "never removed" and are also never retained - they are collected
  // with the detached buttons they were on. What matters is listeners still
  // attached to something the document is still holding.
  window.__entries = [];
  const target = EventTarget.prototype;
  const add = target.addEventListener;
  const remove = target.removeEventListener;
  target.addEventListener = function (...args) {
    // A listener added with a signal is gone when the signal aborts: that is
    // how a mounting module's helper removes everything it registered.
    const signal = typeof args[2] === 'object' ? args[2]?.signal : undefined;
    if (!signal?.aborted) {
      try {
        window.__entries.push({
          ref: new WeakRef(this),
          type: args[0],
          signal,
        });
      } catch {
        /* a target that cannot be weakly held is not a leak this can see */
      }
    }
    return add.apply(this, args);
  };
  target.removeEventListener = function (...args) {
    const at = window.__entries.findIndex(
      e => e.type === args[0] && e.ref.deref() === this
    );
    if (at >= 0) window.__entries.splice(at, 1);
    return remove.apply(this, args);
  };
  /**
   * Listeners still attached to something that is still in the document.
   *
   * window and document are always live; anything else counts only while it is
   * connected. A target that has been collected derefs to undefined and drops
   * out on its own.
   */
  window.__liveListeners = () =>
    window.__entries.filter(e => {
      if (e.signal?.aborted) return false;
      const node = e.ref.deref();
      if (!node) return false;
      if (node === window || node === document) return true;
      return node.isConnected === true;
    }).length;

  /**
   * Listener targets that have left the document and are still in memory.
   *
   * Meaningful only after a collection (the test forces one over CDP): a
   * detached node is garbage the moment nothing holds it, so one that is still
   * here is held by something, and that something is the leak.
   */
  window.__detachedHeld = () =>
    window.__entries.filter(e => {
      if (e.signal?.aborted) return false;
      const node = e.ref.deref();
      return Boolean(node) && node !== window && node !== document
        ? node.isConnected === false
        : false;
    }).length;

  const raf = window.requestAnimationFrame;
  const cancel = window.cancelAnimationFrame;
  window.__live = new Set();
  window.requestAnimationFrame = function (fn) {
    const id = raf.call(window, t => {
      window.__live.delete(id);
      return fn(t);
    });
    window.__live.add(id);
    return id;
  };
  window.cancelAnimationFrame = function (id) {
    window.__live.delete(id);
    return cancel.call(window, id);
  };
};

/** Open a lesson at a step, wait for it to settle. */
async function openStep(page, app, url, selector) {
  await app.boot({ url });
  await page.waitForSelector(selector, { timeout: 25_000 });
  await page.waitForTimeout(700);
}

test.describe('a lesson cleans up after itself', () => {
  test('opening and closing it twenty times leaves no listeners behind', async ({
    page,
    app,
  }) => {
    test.slow();
    await page.addInitScript(INSTRUMENT);
    await app.boot({ url: '/' });
    await page.waitForTimeout(500);

    const cycle = async () => {
      // Cleared first: setting the same hash twice fires no `hashchange`, so
      // the second cycle silently did nothing and the wait below timed out.
      await page.evaluate(() => {
        window.location.hash = '';
        window.location.hash = 'investigation=keplers-laws';
      });
      await page.waitForSelector('#investigationPanel:not([hidden])', {
        timeout: 20_000,
      });
      await page.locator('#investigationClose').click();
      await expect(page.locator('#investigationPanel')).toBeHidden();
    };

    // One cycle first: the lesson engine is imported on the first open and
    // registers the listeners it keeps for the session, which would otherwise
    // be counted as growth.
    await cycle();
    const before = await page.evaluate(() => window.__liveListeners());

    for (let i = 0; i < 20; i++) await cycle();
    const after = await page.evaluate(() => window.__liveListeners());

    // A handful of listeners per cycle would be 200 by now. The allowance is
    // for the one-per-session registrations a later panel makes on its own
    // first open, not for per-cycle growth.
    expect(
      after - before,
      'listeners added across twenty open/close cycles'
    ).toBeLessThanOrEqual(20);
  });

  test('an animated instrument stops when the lesson closes', async ({
    page,
    app,
  }) => {
    test.slow();
    await page.addInitScript(INSTRUMENT);
    // The stellar evolution panel is the busiest animated widget there is: it
    // advances a playhead, repaints a diagram and a stage, and drives the main
    // scene's overlay from the same clock.
    await openStep(
      page,
      app,
      '/?author=lives-of-stars&step=20',
      '#investigationToolCanvas'
    );

    const painting = await page.evaluate(async () => {
      const seen = new Set();
      const original = CanvasRenderingContext2D.prototype.clearRect;
      let count = 0;
      CanvasRenderingContext2D.prototype.clearRect = function (...args) {
        if (this.canvas?.id === 'investigationToolCanvas') count++;
        return original.apply(this, args);
      };
      window.__restoreClear = () => {
        CanvasRenderingContext2D.prototype.clearRect = original;
      };
      await new Promise(r => setTimeout(r, 600));
      seen.add(count);
      return count;
    });
    expect(
      painting,
      'the instrument repaints while the lesson is open'
    ).toBeGreaterThan(0);

    await page.locator('#investigationClose').click();
    await expect(page.locator('#investigationPanel')).toBeHidden();

    const after = await page.evaluate(async () => {
      const before = window.__live.size;
      await new Promise(r => setTimeout(r, 600));
      return { before, live: window.__live.size };
    });
    // The simulation's own loop is still running, so this is not zero. What it
    // must be is *stable*: a widget loop that kept requesting frames after its
    // panel closed would show as growth here.
    expect(
      after.live,
      'animation frames still queued after closing'
    ).toBeLessThanOrEqual(after.before + 2);
  });

  test('the gravitational-wave lesson closes its audio', async ({
    page,
    app,
  }) => {
    test.slow();
    await page.addInitScript(() => {
      window.__contexts = [];
      const Real = window.AudioContext || window.webkitAudioContext;
      if (!Real) return;
      window.AudioContext = class extends Real {
        constructor(...args) {
          super(...args);
          window.__contexts.push(this);
        }
      };
    });
    await openStep(
      page,
      app,
      '/?author=listening-to-spacetime&step=11',
      '#investigationToolCanvas'
    );
    await page.locator('#investigationClose').click();
    await expect(page.locator('#investigationPanel')).toBeHidden();
    await page.waitForTimeout(500);

    const states = await page.evaluate(() =>
      (window.__contexts || []).map(c => c.state)
    );
    // Nothing is asserted about how many were made - the page may make none if
    // the reader never pressed Listen, which is the ordinary case. What is
    // asserted is that none of them is left running.
    expect(
      states.filter(s => s === 'running'),
      'audio contexts left running'
    ).toEqual([]);
  });
});

// =============================================================================
// What a page's panels leave behind when they open and close (Prompt 107, step 3)
// -----------------------------------------------------------------------------
// The same census, run on the three pages whose panels mount and rebuild: the
// Observatory (six disclosure panels, each mounted on its first opening and
// fed again on every later one), the Investigation Composer and the Scenario
// Studio (the whole editor is rebuilt for every New, every opened file and
// every starting point). The Observatory's cycle includes a language change,
// which rebuilds every mounted panel in place: the fit panel once put a
// listener on its host for each rebuild and never took it back. The allowance
// is four, for a panel's first-open registrations; growth per cycle would be
// twenty or more.
// =============================================================================

/** Wait until the count stops moving: lazy panels register a beat late. */
async function settled(page) {
  let last = -1;
  await expect
    .poll(
      async () => {
        const now = await page.evaluate(() => window.__liveListeners());
        const same = now === last;
        last = now;
        return same;
      },
      { intervals: [100, 100, 200, 300], timeout: 8_000 }
    )
    .toBe(true);
  return last;
}

/** Cycle `cycle` once, count, cycle twenty more times, count again. */
async function growth(page, cycle) {
  await cycle();
  const before = await settled(page);
  for (let i = 0; i < 20; i++) await cycle();
  const after = await settled(page);
  return { before, after, grew: after - before };
}

test.describe('a page cleans up its panels', () => {
  test('the Observatory leaves nothing behind when its panels open and close', async ({
    page,
  }) => {
    test.slow();
    await page.addInitScript(INSTRUMENT);
    await page.goto('/observatory/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('html')).toHaveAttribute('data-ready', 'true', {
      timeout: 30_000,
    });
    await page.locator('#obsFixture').selectOption({ index: 0 });
    await page.locator('#obsOpen').click();
    await expect(page.locator('#obsTable tbody tr').first()).toBeVisible({
      timeout: 30_000,
    });
    const panels = [
      'obsArchivePanel',
      'obsGuidePanel',
      'obsMeasurePanel',
      'obsFitPanel',
      'obsComparePanel',
      'obsSkyPanel',
    ];
    const cycle = async () => {
      for (const id of panels) {
        const box = page.locator(`#${id}`);
        if (!(await box.isVisible())) continue;
        await box.locator('summary').first().click();
        await expect(box).toHaveJSProperty('open', true);
        // Mounted: its first control is in the page (the panel loads lazily).
        await expect(
          box.locator('button, select, input').first()
        ).toBeAttached();
        await box.locator('summary').first().click();
        await expect(box).toHaveJSProperty('open', false);
      }
      // A language change rebuilds every mounted panel in place: the mount
      // and unmount a panel does most often.
      for (const id of ['es', 'en']) {
        const label = await page.locator('#obsOpen').textContent();
        await page.locator('[data-gs-lang]').selectOption(id);
        await expect(page.locator('#obsOpen')).not.toHaveText(label);
      }
      // The observation is opened again too: every view is redrawn for it.
      await page.locator('#obsOpen').click();
      await expect(page.locator('#obsTable tbody tr').first()).toBeVisible();
    };
    const { grew } = await growth(page, cycle);
    expect(
      grew,
      'listeners added across twenty panel cycles'
    ).toBeLessThanOrEqual(4);
  });

  test('the Composer leaves nothing behind when its editor is rebuilt', async ({
    page,
  }) => {
    test.slow();
    await page.addInitScript(INSTRUMENT);
    await page.goto('/studio/lesson/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toHaveAttribute('data-ready', 'true', {
      timeout: 30_000,
    });
    const cycle = async () => {
      await page.locator('#cp-new').click();
    };
    const { grew } = await growth(page, cycle);
    expect(
      grew,
      'listeners added across twenty editor rebuilds'
    ).toBeLessThanOrEqual(4);
  });

  test('the Studio leaves nothing behind when its editor is rebuilt', async ({
    page,
  }) => {
    test.slow();
    await page.addInitScript(INSTRUMENT);
    await page.goto('/studio/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toHaveAttribute('data-ready', 'true', {
      timeout: 30_000,
    });
    const cycle = async () => {
      await page.locator('#st-new').click();
      await page.locator('#st-from-go').click();
    };
    const { grew } = await growth(page, cycle);
    expect(
      grew,
      'listeners added across twenty editor rebuilds'
    ).toBeLessThanOrEqual(4);
  });

  // The object inspector set up its energy tab and the readout's minimize
  // control on every selection and never took them back: four listeners a
  // selection (the two tabs, the readout and the document), eighty over
  // twenty. The setup now replaces its own registrations.
  test('the object inspector leaves nothing behind when bodies are selected and closed', async ({
    page,
    app,
  }) => {
    test.slow();
    await page.addInitScript(INSTRUMENT);
    await app.boot({ url: '/' });
    await app.loadScenario('solar-system');
    await app.waitForFrames(10);
    const cycle = async () => {
      await app.selectFirstObject('StarObject');
      await expect(page.locator('#objectInspector')).toBeVisible();
      // The energy chart is built a beat after the selection; closing before
      // it is built is a different (and unrelated) race.
      await expect
        .poll(() =>
          page.evaluate(() =>
            Boolean(document.querySelector('#energyChart svg'))
          )
        )
        .toBe(true);
      await page.locator('#inspectorClose').click();
      await expect(page.locator('#objectInspector')).toBeHidden();
    };
    const { grew } = await growth(page, cycle);
    expect(
      grew,
      'listeners added across twenty inspector selections'
    ).toBeLessThanOrEqual(4);
  });
});

// =============================================================================
// Every panel of the application, opened and closed (Prompt 112, part 4)
// -----------------------------------------------------------------------------
// The first suite above covers the lesson panel and the second the three
// pages that mount panels. This one cycles each other panel the application
// opens: the dialogs, the sound panel, the object picker, the lecture mode and
// the rail's sections, and the interface language, which rebuilds them all.
// Two numbers for each, after a forced collection: listeners still on
// something in the document (the census above), and listener targets that
// have left the document and are still in memory (what a leak is, seen from
// the memory side: a removed panel something still holds).
// =============================================================================

/**
 * Force collections so a detached node is gone if nothing holds it.
 *
 * Three passes, not one. A collection that finishes a marking cycle begun
 * earlier keeps everything allocated while that cycle ran (floating garbage),
 * and on a loaded machine the cycle runs long enough to take in the last panel
 * built and thrown away: that panel read as held, listeners and all, and one
 * pass later it was gone with nothing changed. What something really holds is
 * still there after every pass.
 *
 * A DevTools command, so Chromium only: the other engines return false and the
 * memory-side check is left to Chromium, while the listener census still runs.
 */
async function collect(page) {
  try {
    const cdp = await page.context().newCDPSession(page);
    for (let pass = 0; pass < 3; pass++)
      await cdp.send('HeapProfiler.collectGarbage');
    await cdp.detach();
    return true;
  } catch {
    return false;
  }
}

const PANELS = {
  settings: {
    open: async page => {
      await page.evaluate(() => document.getElementById('settingsBtn').click());
      await expect(page.locator('#settingsPanel')).toBeVisible();
    },
    close: async page => {
      await page.keyboard.press('Escape');
      await expect(page.locator('#settingsPanel')).toBeHidden();
    },
  },
  'export dialog': {
    rail: 'exportDataBtn',
    open: async page => {
      await page.locator('#exportDataBtn').click();
      await expect(page.locator('#dataExport')).toBeVisible();
    },
    close: async page => {
      await page.locator('#dataExportClose').click();
      await expect(page.locator('#dataExport')).toBeHidden();
    },
  },
  'precise placement': {
    rail: 'precisePlaceBtn',
    open: async page => {
      await page.locator('#precisePlaceBtn').click();
      await expect(page.locator('#precisePlaceDialog')).toBeVisible();
    },
    close: async page => {
      await page.keyboard.press('Escape');
      await expect(page.locator('#precisePlaceDialog')).toBeHidden();
    },
  },
  'system builder': {
    rail: 'systemBuilderBtn',
    open: async page => {
      await page.locator('#systemBuilderBtn').click();
      await expect(page.locator('#systemBuilderDialog')).toBeVisible();
    },
    close: async page => {
      await page.keyboard.press('Escape');
      await expect(page.locator('#systemBuilderDialog')).toBeHidden();
    },
  },
  'sound panel': {
    open: async page => {
      await page.locator('#sonificationToggle').click();
      await expect(page.locator('#soundPanel')).toBeVisible();
    },
    close: async page => {
      await page.keyboard.press('Escape');
      await expect(page.locator('#soundPanel')).toBeHidden();
    },
  },
  'object picker': {
    rail: 'objectTypeBtn',
    open: async page => {
      await page.locator('#objectTypeBtn').click();
      await expect(page.locator('#objectTypePicker')).toBeVisible();
    },
    close: async page => {
      await page.keyboard.press('Escape');
      await expect(page.locator('#objectTypePicker')).toBeHidden();
    },
  },
  'lecture mode': {
    rail: 'lectureBtn',
    open: async page => {
      await page.locator('#lectureBtn').click();
      await expect(page.locator('body')).toHaveClass(/presentation-lecture/);
    },
    close: async page => {
      await page.locator('#lectureExitBtn').click();
      await expect(page.locator('body')).not.toHaveClass(
        /presentation-lecture/
      );
    },
  },
  'rail sections': {
    open: async page => {
      await page.locator('#railTools').click();
    },
    close: async page => {
      await page.locator('#railScenario').click();
    },
  },
  'interface language': {
    open: async page => {
      await page.locator('[data-gs-lang]').first().selectOption('es');
      await expect(page.locator('html')).toHaveAttribute('lang', 'es');
    },
    close: async page => {
      await page.locator('[data-gs-lang]').first().selectOption('en');
      await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    },
  },
};

/** The docked observing panels: opened from a toggle and closed from it. */
const docked = (toggle, container, scenario) => ({
  scenario,
  rail: toggle,
  open: async (page, app) => {
    await app.openPanel(toggle, container);
  },
  close: async page => {
    await page.locator(`#${toggle}`).click();
    await expect(page.locator(`#${container}`)).toBeHidden();
  },
});
Object.assign(PANELS, {
  // Opening and closing, for a world: every scenario change rebuilds the
  // readout, the object list and each docked panel that watches the bodies.
  'scenario change': {
    open: async (page, app) => {
      await app.loadScenario('solar-system');
    },
    close: async (page, app) => {
      await app.loadScenario('binary-pair');
    },
  },
  'radial velocity panel': docked(
    'toggleRadialVelocity',
    'rvContainer',
    'exoplanet-characterization-lab'
  ),
  'light curve panel': docked(
    'toggleLightCurve',
    'lightCurveContainer',
    'exoplanet-characterization-lab'
  ),
  'astrometry panel': docked(
    'toggleAstrometry',
    'astrometryContainer',
    'exoplanet-characterization-lab'
  ),
  'evidence notebook': docked(
    'toggleNotebook',
    'evidenceNotebook',
    'exoplanet-characterization-lab'
  ),
  'pause at event panel': docked(
    'togglePauseAtEvent',
    'pauseEventContainer',
    'solar-system'
  ),
});

test.describe('the application cleans up its panels', () => {
  for (const [name, panel] of Object.entries(PANELS)) {
    test(`${name}: twenty open/close cycles add no listeners and strand no panel`, async ({
      page,
      app,
    }) => {
      test.slow();
      await page.addInitScript(INSTRUMENT);
      await app.boot({ url: '/' });
      if (panel.scenario) await app.loadScenario(panel.scenario);
      await settled(page);
      const cycle = async () => {
        if (panel.rail) await app.railControl(panel.rail);
        await panel.open(page, app);
        await panel.close(page, app);
      };
      const { before, after, grew } = await growth(page, cycle);
      expect(
        grew,
        `${name}: listeners added across twenty cycles`
      ).toBeLessThanOrEqual(4);

      // Memory side: what is still in memory after a collection and has left
      // the document. The first cycle's and the last cycle's counts are
      // compared, so what the page holds for its own lifetime is not growth.
      const early = (await collect(page))
        ? await page.evaluate(() => window.__detachedHeld())
        : 0;
      for (let i = 0; i < 10; i++) await cycle();
      const late = (await collect(page))
        ? await page.evaluate(() => window.__detachedHeld())
        : 0;
      expect(
        late - early,
        `${name}: detached listener targets held after ten more cycles`
      ).toBeLessThanOrEqual(4);
      test.info().annotations.push({
        type: 'census',
        description: `listeners ${before} to ${after}; detached held ${early} to ${late}`,
      });
    });
  }

  // A callback waiting on a lazy file holds whatever scope it was made in until
  // the file arrives. Settings makes one per build for its Motion row, and the
  // first visit fetches the two files that row needs: on a loaded machine they
  // can arrive after several panels have been built and thrown away, and every
  // one of those was held, Advanced section and listeners included. The files
  // are held back here, by the test and not by a timer, so the case does not
  // depend on how slow a machine is.
  test('settings: panels built while the Motion row waits for its files are not held', async ({
    page,
    app,
  }) => {
    test.slow();
    await page.addInitScript(INSTRUMENT);
    let release;
    const gate = new Promise(resolve => {
      release = resolve;
    });
    await page.route(/\/(motionControl|en\.interaction)\.js$/, async route => {
      await gate;
      await route.continue();
    });
    try {
      await app.boot({ url: '/' });
      await settled(page);
      for (let i = 0; i < 6; i++) {
        await PANELS.settings.open(page, app);
        await PANELS.settings.close(page, app);
      }
      const held = (await collect(page))
        ? await page.evaluate(() => window.__detachedHeld())
        : 0;
      expect(
        held,
        'detached listener targets held while the Motion row waits'
      ).toBeLessThanOrEqual(4);
    } finally {
      release();
    }
    // Released, the row still fills in the panel that is open by then.
    await PANELS.settings.open(page, app);
    await expect(page.locator('#settingsMotion')).toBeVisible();
    await PANELS.settings.close(page, app);
  });

  test('the check sees a removed panel that something still holds, and lets go of one that nothing does', async ({
    page,
    app,
  }) => {
    await page.addInitScript(INSTRUMENT);
    await app.boot({ url: '/' });
    await page.evaluate(() => {
      const mount = held => {
        const panel = document.createElement('div');
        panel.addEventListener('click', () => {});
        document.body.append(panel);
        panel.remove();
        if (held) window.__strand = panel;
      };
      mount(true);
      mount(false);
    });
    await collect(page);
    const held = await page.evaluate(() => window.__detachedHeld());
    expect(
      held,
      'one removed panel is still referenced'
    ).toBeGreaterThanOrEqual(1);
    await page.evaluate(() => {
      window.__strand = null;
    });
    await collect(page);
    const released = await page.evaluate(() => window.__detachedHeld());
    expect(released, 'the same panel after the reference is dropped').toBe(
      held - 1
    );
  });
});
