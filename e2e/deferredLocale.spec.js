// =============================================================================
// Deferred strings, and the language switch
// -----------------------------------------------------------------------------
// The bug these cover was silent and complete. ensureDeferredMessages registers
// BOTH locales, so a reader in English who opened any deferred panel created a
// Spanish catalogue containing that panel's strings and nothing else -
// whereupon loadLocale saw a truthy CATALOGUES.es, decided Spanish was already
// in memory, and never fetched es.js. Switching to Spanish then produced an
// English interface with a dozen Spanish labels in it. No error, no warning,
// and the Spanish that was present made it look intentional.
//
// So these assert actual translated text. Checking only for the absence of
// message ids would have passed throughout: English is not a message id.
// =============================================================================

import { test, expect } from './fixtures.js';

/** A string that lives only in the deferred half. */
const DEFERRED = {
  id: 'bench.action.capture',
  en: 'Capture start',
  es: 'Capturar inicio',
};
/** Open the A/B bench, which is lazy and whose prose is deferred. */
async function openBench(page, app) {
  await app.railControl('toggleExperiments');
  await page.locator('#toggleExperiments').click();
  await expect(page.locator('#experimentPanel')).toBeVisible({
    timeout: 30_000,
  });
}

/** Whatever the running application says for an id, right now. */
const say = (page, id) =>
  page.evaluate(async messageId => {
    const i18n = await import('/js/i18n/index.js');
    return i18n.t(messageId);
  }, id);

test.describe('English first, then Spanish', () => {
  test('opening a deferred panel does not poison the Spanish catalogue', async ({
    page,
    app,
  }) => {
    await app.boot();
    await openBench(page, app);
    expect(await say(page, DEFERRED.id)).toBe(DEFERRED.en);

    // The switch that used to produce an English interface.
    await page.evaluate(async () => {
      const i18n = await import('/js/i18n/index.js');
      await i18n.setLocale('es');
    });

    // A base string, which is the half that used to be lost.
    const baseText = await say(page, 'observing.session.newWorld');
    expect(baseText).toMatch(/simulación|grabación/);
    expect(baseText).not.toMatch(/simulation was rebuilt/);

    // And the deferred string that was registered before the switch.
    expect(await say(page, DEFERRED.id)).toBe(DEFERRED.es);
  });

  test('the panel already on screen is relabelled, not left in English', async ({
    page,
    app,
  }) => {
    await app.boot();
    await openBench(page, app);
    await expect(page.locator('#benchCapture')).toHaveText(DEFERRED.en);

    await page.evaluate(async () => {
      const i18n = await import('/js/i18n/index.js');
      await i18n.setLocale('es');
    });

    // Static markup that was translated at boot and again when the deferred
    // strings arrived; a language change has to reach it a third time.
    await expect(page.locator('#benchCapture')).toHaveText(DEFERRED.es);
  });
});

test.describe('Spanish first, then a deferred panel', () => {
  test('the panel opens already in Spanish', async ({ page, app }) => {
    await page.addInitScript(() => {
      localStorage.setItem('gravitas_locale', 'es');
    });
    await app.boot();
    // Base Spanish is in force before anything deferred has been asked for.
    expect(await say(page, 'observing.session.newWorld')).toMatch(
      /simulación|grabación/
    );

    await openBench(page, app);
    expect(await say(page, DEFERRED.id)).toBe(DEFERRED.es);
    await expect(page.locator('#benchCapture')).toHaveText(DEFERRED.es);
  });
});

test.describe('two panels asking at once', () => {
  test('concurrent callers share one load and all see the strings', async ({
    page,
    app,
  }) => {
    await app.boot();
    const out = await page.evaluate(async () => {
      const mod = await import('/js/i18n/deferredMessages.js');
      const i18n = await import('/js/i18n/index.js');
      // Three callers in the same tick, which is what a scenario that brings a
      // panel and a lesson that opens a tool actually do.
      const a = mod.ensureDeferredMessages();
      const b = mod.ensureDeferredMessages();
      const c = mod.ensureDeferredMessages();
      const shared = a === b && b === c;
      // Whichever resolves first must already see the strings: the old code
      // set its done flag before awaiting, so the second caller returned to a
      // catalogue that had not arrived.
      await Promise.race([a, b, c]);
      const early = i18n.t('bench.action.capture');
      await Promise.all([a, b, c]);
      return { shared, early, late: i18n.t('bench.action.capture') };
    });

    expect(out.shared).toBe(true);
    expect(out.early).toBe(DEFERRED.en);
    expect(out.late).toBe(DEFERRED.en);
  });
});

test.describe('when the chunk will not load', () => {
  test('a failed load is contained, and a reload recovers it', async ({
    page,
    app,
    errors,
  }) => {
    await app.boot();
    await page.route('**/i18n/en.deferred.js', route => route.abort());

    const failed = await page.evaluate(async () => {
      const mod = await import('/js/i18n/deferredMessages.js');
      try {
        await mod.ensureDeferredMessages();
        return 'resolved';
      } catch {
        return 'rejected';
      }
    });
    expect(failed).toBe('rejected');

    // What in-page retry can and cannot do. A module whose fetch failed is
    // recorded as failed in the browser's module map, and re-importing the same
    // specifier is rejected from that record without another request - so the
    // attempt is forgotten, but the chunk itself cannot come back until the
    // page does. Asserted rather than assumed, because the code comments claim
    // it and a claim in a comment is not a test.
    await page.unroute('**/i18n/en.deferred.js');
    const stillFails = await page.evaluate(async () => {
      const mod = await import('/js/i18n/deferredMessages.js');
      try {
        await mod.ensureDeferredMessages();
        return 'resolved';
      } catch {
        return 'rejected';
      }
    });
    expect(stillFails).toBe('rejected');

    // The recovery a reader actually has, and it works.
    await app.boot();
    const afterReload = await page.evaluate(async () => {
      const mod = await import('/js/i18n/deferredMessages.js');
      const i18n = await import('/js/i18n/index.js');
      await mod.ensureDeferredMessages();
      return i18n.t('bench.action.capture');
    });
    expect(afterReload).toBe(DEFERRED.en);

    errors.consoleErrors.length = 0;
  });

  test('a panel still opens when its prose cannot be fetched', async ({
    page,
    app,
    errors,
  }) => {
    // Degrading to message ids is recoverable and visible. Refusing to open is
    // neither, so a translation failure must not be able to cause it.
    await app.boot();
    await page.route('**/i18n/es.deferred.js', route => route.abort());
    await page.route('**/i18n/en.deferred.js', route => route.abort());
    await openBench(page, app);
    await expect(page.locator('#experimentPanel')).toBeVisible();
    errors.consoleErrors.length = 0;
  });
});

test.describe('changing language with a panel open', () => {
  test('does not lock the tab', async ({ page, app }) => {
    // A regression test for a hang, which is why it asserts that anything at
    // all happens afterwards. The bench subscribed to locale changes from
    // inside the function that builds it, and its handler rebuilt the panel -
    // so the rebuild subscribed again, into the very Set the notification was
    // iterating, and the loop never ended. Switching language with the bench
    // open froze the browser.
    await app.boot();
    await openBench(page, app);

    const out = await page.evaluate(async () => {
      const i18n = await import('/js/i18n/index.js');
      const started = Date.now();
      await i18n.setLocale('es', { persist: false });
      return {
        ms: Date.now() - started,
        label: i18n.t('bench.action.capture'),
      };
    });

    expect(out.ms).toBeLessThan(5000);
    expect(out.label).toBe(DEFERRED.es);
    // The panel is still there, and in Spanish.
    await expect(page.locator('#benchCapture')).toHaveText(DEFERRED.es);
  });

  test('switching twice does not accumulate listeners', async ({
    page,
    app,
  }) => {
    // The other half of the same defect: each rebuild used to add a listener,
    // so the cost of a language change grew every time somebody made one.
    await app.boot();
    await openBench(page, app);
    const timings = await page.evaluate(async () => {
      const i18n = await import('/js/i18n/index.js');
      const out = [];
      for (const locale of ['es', 'en', 'es', 'en']) {
        const t0 = Date.now();
        await i18n.setLocale(locale, { persist: false });
        out.push(Date.now() - t0);
      }
      return out;
    });
    for (const ms of timings) expect(ms).toBeLessThan(5000);
  });
});
