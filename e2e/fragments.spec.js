// =============================================================================
// Each family's markup is in the page only while the family is mounted
// -----------------------------------------------------------------------------
// Roadmap II Prompt 53 (INDEX_DECOMPOSITION.md). The panels whose code loads
// on demand ship their markup with that code, in js/fragments/, and go in at
// an empty <template data-host> in index.html when the family mounts.
//
// For every family, in the real page: before it is asked for, none of its
// markup is there; mounted by its own loader, all of it is, at its host, with
// no id twice in the document; unmounted, it is gone and so is every listener
// the family put outside it; and mounted again, it comes back once. The
// listener census is e2e/lessonPerformance.spec.js's, taught that a listener
// added with a signal is gone when the signal aborts: WeakRef targets, and
// only window, document and connected nodes count.
//
// The start-up panels (sound, scenario gallery, black-hole masses, inspector,
// tour) mount with the modules that bind them at load, and stay: they are
// checked to be at their hosts, once, from the first frame.
// =============================================================================

import { test, expect } from './fixtures.js';

/** Before any application script: the listener census. */
const CENSUS = () => {
  window.__entries = [];
  const proto = EventTarget.prototype;
  const add = proto.addEventListener;
  const remove = proto.removeEventListener;
  const captureOf = options =>
    typeof options === 'boolean' ? options : Boolean(options?.capture);
  proto.addEventListener = function (type, listener, options) {
    const signal = typeof options === 'object' ? options?.signal : undefined;
    if (!signal?.aborted) {
      try {
        window.__entries.push({
          ref: new WeakRef(this),
          type,
          listener,
          capture: captureOf(options),
          signal,
        });
      } catch {
        /* a target that cannot be held weakly is not a leak this can see */
      }
    }
    return add.call(this, type, listener, options);
  };
  proto.removeEventListener = function (type, listener, options) {
    const capture = captureOf(options);
    const at = window.__entries.findIndex(
      e =>
        e.type === type &&
        e.listener === listener &&
        e.capture === capture &&
        e.ref.deref() === this
    );
    if (at >= 0) window.__entries.splice(at, 1);
    return remove.call(this, type, listener, options);
  };
  window.__liveListeners = () =>
    window.__entries.filter(e => {
      if (e.signal?.aborted) return false;
      const node = e.ref.deref();
      if (!node) return false;
      if (node === window || node === document) return true;
      return node.isConnected === true;
    }).length;
};

/**
 * The families, each with its loader's mount and unmount, run in the page.
 * `ids` are the fragment's top-level elements (tools/index-fragments.mjs).
 */
const FAMILIES = [
  {
    name: '3-D view',
    host: 'view3d',
    ids: ['threeViewportContainer'],
    mount: async () => (await import('/js/view3dBridge.js')).ensureView3D(),
    unmount: async () => (await import('/js/view3dBridge.js')).unmountView3D(),
  },
  {
    name: 'pause at event',
    host: 'pause-event',
    ids: ['pauseEventContainer'],
    mount: async () =>
      (await import('/js/pauseAtEventBridge.js')).ensurePauseAtEvent(),
    unmount: async () =>
      (await import('/js/pauseAtEventBridge.js')).unmountPauseAtEvent(),
  },
  {
    name: 'RV workspace',
    host: 'rv-workspace',
    ids: ['rvFitContainer'],
    mount: async () =>
      (await import('/js/rvWorkspaceBridge.js')).ensureRvWorkspace(),
    unmount: async () =>
      (await import('/js/rvWorkspaceBridge.js')).unmountRvWorkspace(),
  },
  {
    name: 'gravity assist',
    host: 'assist',
    ids: ['assistContainer'],
    scenario: 'Gravity Assist Lab',
    unmount: async () =>
      (await import('/js/scenarioPanelBridge.js')).unmountScenarioPanel(
        'assist'
      ),
  },
  {
    name: 'precise placement',
    host: 'precise-placement',
    ids: ['precisePlaceDialog'],
    mount: async () =>
      (await import('/js/precisePlacement.js')).mountPrecisePlacement(),
    unmount: async () =>
      (await import('/js/precisePlacement.js')).unmountPrecisePlacement(),
  },
  {
    name: 'data export',
    host: 'export',
    ids: ['dataExport'],
    mount: async () => {
      const bridge = await import('/js/exportBridge.js');
      await bridge.openExport();
      (await import('/js/exportDialog.js')).closeExportDialog();
    },
    unmount: async () => (await import('/js/exportBridge.js')).unmountExport(),
  },
  {
    name: 'lecture mode',
    host: 'lecture',
    ids: ['lectureBar', 'lectureSequenceSheet'],
    mount: async () => {
      const lecture = await import('/js/lecture.js');
      await lecture.lectureReady;
      await lecture.mountLecture();
    },
    unmount: async () => (await import('/js/lecture.js')).unmountLecture(),
  },
  {
    name: 'lesson engine',
    host: 'lesson',
    ids: [
      'investigationPanel',
      'investigationPlot',
      'investigationEllipse',
      'investigationTool',
      'investigationFinish',
    ],
    mount: async () => {
      // Opened and closed, so the browser's dialog is wired and has to be let
      // go of on the way out.
      const loader = await import('/js/investigationsLoader.js');
      const engine = await loader.ensureInvestigations();
      await engine.openBrowser();
      engine.closeBrowser({ restoreFocus: false });
    },
    unmount: async () =>
      (await import('/js/investigationsLoader.js')).unmountInvestigations(),
  },
];

/** What the page holds of a family, and whether any id is there twice. */
const inspect = (page, ids) =>
  page.evaluate(wanted => {
    const all = [...document.querySelectorAll('[id]')].map(e => e.id);
    return {
      present: wanted.filter(id => document.getElementById(id)),
      repeated: [...new Set(all.filter((id, i) => all.indexOf(id) !== i))],
    };
  }, ids);

/** Run a family's mount or unmount in the page. */
async function run(page, family, which) {
  if (which === 'mount' && family.scenario) {
    // A scenario panel is mounted by loading its scenario, which is the only
    // way a reader reaches it.
    await page.evaluate(async key => {
      const ui = await import('/js/ui.js');
      ui.loadScenarioByKey(key);
    }, family.scenario);
    await page.waitForFunction(
      id => Boolean(document.getElementById(id)),
      family.ids[0],
      { timeout: 20_000 }
    );
    return;
  }
  await page.evaluate(`(${family[which].toString()})()`);
}

const settle = page =>
  page.evaluate(
    () =>
      new Promise(r =>
        window.requestAnimationFrame(() =>
          window.requestAnimationFrame(() => r())
        )
      )
  );

test.describe('a family mounts and unmounts its own markup', () => {
  for (const family of FAMILIES) {
    test(`${family.name}: present only while mounted, once, and leaving no listener`, async ({
      page,
      app,
    }) => {
      test.slow();
      await page.addInitScript(CENSUS);
      await app.boot();

      // Not there until it is asked for.
      expect((await inspect(page, family.ids)).present).toEqual([]);

      // Mounted: all of it, at its host, and nothing twice.
      await run(page, family, 'mount');
      await settle(page);
      expect(await inspect(page, family.ids)).toEqual({
        present: family.ids,
        repeated: [],
      });
      expect(
        await page.evaluate(
          host =>
            document.querySelector(`template[data-host="${host}"]`)
              ?.nextElementSibling?.id ?? null,
          family.host
        )
      ).toBe(family.ids[0]);

      // A first unmount, which can leave behind what a module registers once
      // per page when it is first imported; that is the baseline.
      await run(page, family, 'unmount');
      await settle(page);
      expect((await inspect(page, family.ids)).present).toEqual([]);
      const baseline = await page.evaluate(() => window.__liveListeners());

      // Round trips from here leave exactly that.
      for (let i = 0; i < 2; i++) {
        if (family.scenario) {
          // Reload the scenario's world from elsewhere first, so loading it
          // again is a rebuild the bridge sees.
          await page.evaluate(async () => {
            (await import('/js/ui.js')).loadScenarioByKey('Solar System');
          });
        }
        await run(page, family, 'mount');
        await settle(page);
        expect(await inspect(page, family.ids)).toEqual({
          present: family.ids,
          repeated: [],
        });
        const mounted = await page.evaluate(() => window.__liveListeners());
        await run(page, family, 'unmount');
        await settle(page);
        expect((await inspect(page, family.ids)).present).toEqual([]);
        const after = await page.evaluate(() => window.__liveListeners());
        expect(after, 'listeners left behind by one mount').toBe(baseline);
        expect(mounted).toBeGreaterThanOrEqual(after);
      }
    });
  }
});

test.describe('the start-up panels', () => {
  const STARTUP = [
    ['sound', 'soundPanel'],
    ['scenario-list', 'scenarioListModal'],
    ['bh-masses', 'bhMassesModal'],
    ['inspector', 'objectInspector'],
    ['tutorial', 'tutorialPopup'],
  ];

  test('are at their hosts from the first frame, once each', async ({
    page,
    app,
  }) => {
    await app.boot();
    const where = await page.evaluate(
      pairs =>
        pairs.map(([host, id]) => ({
          host,
          next:
            document.querySelector(`template[data-host="${host}"]`)
              ?.nextElementSibling?.id ?? null,
          copies: document.querySelectorAll(`#${id}`).length,
        })),
      STARTUP
    );
    expect(where).toEqual(
      STARTUP.map(([host, id]) => ({ host, next: id, copies: 1 }))
    );
    const repeated = await page.evaluate(() => {
      const all = [...document.querySelectorAll('[id]')].map(e => e.id);
      return [...new Set(all.filter((id, i) => all.indexOf(id) !== i))];
    });
    expect(repeated).toEqual([]);
  });

  test('the inspector is hidden before it is ever painted', async ({
    page,
    app,
  }) => {
    // The inline script that used to do this in index.html is gone; js/ui.js
    // does it as it mounts the markup.
    await app.boot();
    await expect(page.locator('#objectInspector')).toBeHidden();
  });

  test('speak the reader’s language as they go in', async ({ page, app }) => {
    await app.boot();
    await page.evaluate(async () => {
      (await import('/js/i18n/index.js')).setLocale('es', { persist: false });
    });
    const loader = () =>
      page.evaluate(async () => {
        await (
          await import('/js/investigationsLoader.js')
        ).ensureInvestigations();
        return document.getElementById('investigationPrev')?.textContent.trim();
      });
    const prev = await loader();
    const es = await page.evaluate(async () =>
      (await import('/js/i18n/index.js')).t('inv.action.back')
    );
    // A fragment mounted after the language changed is in that language.
    expect(prev).toBe(es);
  });
});
