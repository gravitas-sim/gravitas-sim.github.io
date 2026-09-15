// =============================================================================
// A clean start-up says nothing it should not
// -----------------------------------------------------------------------------
// Opening the application in a fresh Chromium printed dozens of
// `[i18n] no message for ...` warnings for ids that exist. The start-up sweep
// in js/i18n/dom.js translates index.html on the first paint; forty-odd of
// those data-i18n attributes belong to panels whose strings live in
// js/i18n/en.deferred.js; and that chunk is not fetched until a panel asks for
// it. Every one of them was reported missing and none of them was.
//
// Why no existing test saw it
// -----------------------------------------------------------------------------
// The localization tests all wait for the deferred catalog before asserting
// anything, which is the right thing for them to do and is exactly why they
// cannot see this: by the time they look, the ids resolve. The noisy path is
// the one nobody waits on - the first second of a cold load - so this file does
// not wait. It watches the console from before the first navigation and reads
// what a reader's own devtools would have shown them.
//
// What counts as a failure
// -----------------------------------------------------------------------------
// Application-origin warnings only. A browser extension writing to the console
// is not the product's problem, and neither is Playwright's own service-worker
// notice, so both are filtered - by origin and by an explicit list, not by
// pattern-matching away anything inconvenient.
//
// And the check is proved non-vacuous in the same run: an id that really is
// unknown is asked for, and has to warn.
// =============================================================================

import { test, expect } from './fixtures.js';

/** Messages that are not the application talking. */
const FOREIGN = [
  /^chrome-extension:/,
  /^moz-extension:/,
  /Service Worker registration blocked by Playwright/,
  /Download the React DevTools/,
];

/**
 * Watch the console from before the first byte.
 *
 * Attached to the page rather than read afterwards, because the warnings this
 * is about are emitted during the first paint and nothing keeps them.
 */
function watchConsole(page) {
  const seen = [];
  page.on('console', msg => {
    const type = msg.type();
    if (type !== 'warning' && type !== 'error') return;
    const text = msg.text();
    const url = msg.location()?.url ?? '';
    if (FOREIGN.some(re => re.test(text) || re.test(url))) return;
    seen.push({ type, text, url });
  });
  return seen;
}

/** The `[i18n] no message for` lines, which are the subject. */
const missingMessages = seen =>
  seen.filter(m => /\[i18n\] no message for/.test(m.text)).map(m => m.text);

test.describe('a cold start does not report messages it has', () => {
  test('loading, opening four deferred surfaces and switching language twice stays quiet', async ({
    page,
    app,
  }) => {
    test.slow();
    const seen = watchConsole(page);

    // A clean profile: no cached catalog, no warmed panel, nothing that has
    // already paid for the deferred chunk on this page's behalf.
    await app.boot();
    expect(
      missingMessages(seen),
      'the first paint reported nothing missing'
    ).toEqual([]);

    // Four surfaces whose strings are deferred, opened the way a reader opens
    // them. Each is a different bridge, so each is a different chance for the
    // registration to be late.
    await app.openPanel('toggleRadialVelocity', 'rvContainer');
    await app.openPanel('toggleGravityAssist', 'assistContainer').catch(() => {
      /* named differently in some builds; the next two still cover the path */
    });
    await page.evaluate(async () => {
      const bridge = await import('/js/experimentsBridge.js');
      await bridge.ensureBench();
      const panel = await import('/js/experiments/panel.js');
      panel.openPanel();
    });
    await page.evaluate(async () => {
      const loader = await import('/js/investigationsLoader.js');
      await loader.ensureInvestigations?.();
    });
    await page.waitForTimeout(600);

    // English -> Spanish -> English. A label kept from the previous language is
    // as wrong as a missing one, and switching is when that shows.
    const heading = () =>
      page.evaluate(() => {
        const el = document.querySelector(
          '#rvSurveyStatus, .rv-notice, #rvContainer h2, #rvContainer h3'
        );
        return el?.textContent?.trim() ?? '';
      });
    await page.evaluate(async () => {
      const i18n = await import('/js/i18n/index.js');
      await i18n.setLocale('es');
    });
    await page.waitForTimeout(400);
    const spanish = await heading();
    await page.evaluate(async () => {
      const i18n = await import('/js/i18n/index.js');
      await i18n.setLocale('en');
    });
    await page.waitForTimeout(400);
    const english = await heading();

    // Whatever those headings say, the two languages must not say the same
    // thing - a label retained across a switch is the failure mode here.
    if (spanish && english) expect(spanish).not.toBe(english);

    expect(
      missingMessages(seen),
      'nothing was reported missing across four panels and two language switches'
    ).toEqual([]);

    // Now prove the check can still fail. An id nobody has ever defined, in a
    // namespace the deferred catalog does not use, has to be reported.
    await page.evaluate(async () => {
      const i18n = await import('/js/i18n/index.js');
      i18n.t('definitelyNotANamespace.noSuchMessage');
    });
    await expect
      .poll(() => missingMessages(seen).length, { timeout: 5000 })
      .toBeGreaterThan(0);
    expect(missingMessages(seen).join('\n')).toMatch(
      /definitelyNotANamespace\.noSuchMessage/
    );

    // And an invented id inside a REAL deferred namespace, which is the harder
    // case: it was held at start-up, and once the catalog has arrived being
    // absent is a fact rather than a race.
    await page.evaluate(async () => {
      const i18n = await import('/js/i18n/index.js');
      i18n.t('hzW.noSuchMessageEither');
    });
    await expect
      .poll(
        () =>
          missingMessages(seen).some(t => /hzW\.noSuchMessageEither/.test(t)),
        { timeout: 5000 }
      )
      .toBe(true);
  });

  test('a deferred namespace is held at first paint, not reported', async ({
    page,
    app,
  }) => {
    const seen = watchConsole(page);
    await app.boot();

    // Asked for before any panel has loaded its catalog. This is the exact
    // shape of the forty-odd start-up warnings: a real id, asked too early.
    const early = await page.evaluate(async () => {
      const i18n = await import('/js/i18n/index.js');
      const { EN_DEFERRED } = await import('/js/i18n/en.deferred.js');
      // Read a real deferred id, but do NOT register the catalog: importing
      // the module for its key list does not put it in the catalogs.
      const id = Object.keys(EN_DEFERRED)[0];
      return { id, before: i18n.t(id) };
    });
    // It renders as its id, which is the visible consequence and is honest.
    expect(early.before).toBe(early.id);
    // But it is not reported, because it is not missing - it is early.
    expect(
      missingMessages(seen).filter(t => t.includes(early.id)),
      'a real deferred id asked before its catalog is not a fault'
    ).toEqual([]);
  });
});
