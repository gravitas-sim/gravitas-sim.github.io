// =============================================================================
// The lesson registry arrives late, and the language still comes out right
// -----------------------------------------------------------------------------
// js/main.js used to import setLessonLocale statically, which put the whole
// English lesson manifest into the start-up download of a visitor who opens the
// sandbox and never touches a lesson. It is a dynamic import now.
//
// That saving is only worth having if the language is still correct, and the
// first version of the change proved it is not free: assigning the locale
// behind a module load opened a window in which the next lesson was fetched in
// the language the reader had just left. e2e/assignment.spec.js caught it. The
// fix records the choice synchronously in js/lessonLocale.js and lets the
// registry read it whenever it loads; these are the cases that hold that shut.
// =============================================================================

import { test, expect } from './fixtures.js';

/** Open a lesson through the loader the application itself uses. */
async function openLesson(page, id) {
  return page.evaluate(async lessonId => {
    const registry = await import('/js/data/investigations/registry.js');
    const lesson = await registry.loadInvestigation(lessonId);
    return {
      locale: registry.getLessonLocale(),
      title: lesson.title,
      firstStep: lesson.steps?.[0]?.title ?? null,
    };
  }, id);
}

/** The card-level title the browser would show for a lesson. */
async function cardTitle(page, id) {
  return page.evaluate(async lessonId => {
    const registry = await import('/js/data/investigations/registry.js');
    return registry.investigationMeta(lessonId)?.title ?? null;
  }, id);
}

test('the registry is not fetched during start-up', async ({ page, app }) => {
  // The saving, asserted in the browser rather than only in the import graph:
  // nothing asks the network for the registry or either manifest before a
  // reader goes looking for a lesson.
  const asked = [];
  page.on('request', r => {
    const url = r.url();
    if (/data\/investigations\/(registry|manifest)/.test(url)) asked.push(url);
  });

  await app.boot();
  await app.waitForFrames(30);

  expect(asked).toEqual([]);
});

test('booting straight into Spanish serves a Spanish lesson', async ({
  page,
  app,
}) => {
  await page.addInitScript(() => {
    try {
      window.localStorage.setItem('gravitas_locale', 'es');
    } catch {
      /* storage unavailable; the test below will say so */
    }
  });
  await app.boot();

  const lesson = await openLesson(page, 'keplers-laws');
  expect(lesson.locale).toBe('es');
  expect(lesson.title).toBe('Las leyes de Kepler');
  expect(await cardTitle(page, 'keplers-laws')).toBe('Las leyes de Kepler');
});

test('a language chosen before the registry loads is the one used', async ({
  page,
  app,
}) => {
  await app.boot();

  // Switch and open in the same turn, with no chance for the deferred module
  // to have arrived in between. This is the sequence that failed.
  const lesson = await page.evaluate(async () => {
    const i18n = await import('/js/i18n/index.js');
    await i18n.setLocale('es');
    const registry = await import('/js/data/investigations/registry.js');
    const opened = await registry.loadInvestigation('keplers-laws');
    return { locale: registry.getLessonLocale(), title: opened.title };
  });

  expect(lesson.locale).toBe('es');
  expect(lesson.title).toBe('Las leyes de Kepler');
});

test('two switches before the registry loads leave the second in force', async ({
  page,
  app,
}) => {
  await app.boot();

  const lesson = await page.evaluate(async () => {
    const i18n = await import('/js/i18n/index.js');
    await i18n.setLocale('es');
    await i18n.setLocale('en');
    const registry = await import('/js/data/investigations/registry.js');
    const opened = await registry.loadInvestigation('keplers-laws');
    return { locale: registry.getLessonLocale(), title: opened.title };
  });

  expect(lesson.locale).toBe('en');
  expect(lesson.title).toBe("Kepler's Laws");
});

test('the gallery and the lesson agree after a switch', async ({
  page,
  app,
}) => {
  await app.boot();
  await page.evaluate(async () => {
    const i18n = await import('/js/i18n/index.js');
    await i18n.setLocale('es');
  });

  // Through the browser a reader actually opens, not only the module.
  await page.evaluate(() =>
    document.getElementById('investigationsBtn')?.click()
  );
  await expect(page.locator('#investigationBrowser')).toBeVisible({
    timeout: 15_000,
  });

  const card = page
    .locator('#investigationBrowser [data-investigation="keplers-laws"]')
    .first();
  await expect(card).toContainText('Las leyes de Kepler');

  const lesson = await openLesson(page, 'keplers-laws');
  expect(lesson.title).toBe('Las leyes de Kepler');
  // The step text a student reads, not only the card.
  expect(lesson.firstStep).not.toBe(null);
});

test('start-up completes with no unhandled rejections', async ({
  page,
  app,
}) => {
  // The registry is not fetched at boot at all now, so there is no import to
  // fail here; the rejection-safety of the bridge itself is unit-tested in
  // tests/lessonLocale.test.js, where a throwing registry can be arranged
  // without aborting a request and making the browser log a resource error
  // this suite would rightly fail on.
  //
  // What this asserts is the property that matters in a browser: the interface
  // finishes initialising and nothing left a promise unhandled on the way.
  await page.addInitScript(() => {
    window.__rejections = [];
    window.addEventListener('unhandledrejection', e => {
      window.__rejections.push(String(e.reason));
    });
  });

  await app.boot();
  await app.waitForFrames(30);

  await expect(page.locator('#simulationCanvas')).toBeVisible();
  await expect(page.locator('.ui-container')).toBeVisible();
  expect(await page.evaluate(() => window.__rejections || [])).toEqual([]);
});

test('the built site behaves the same way', async ({ page, app }) => {
  // Source and production differ in exactly the place this change lives: the
  // bundler decides what is in the start-up chunk and what is a separate one.
  // Asserted through behaviour rather than through chunk names, which differ
  // by hash between the two.
  await app.boot();
  const before = await page.evaluate(async () => {
    const bridge = await import('/js/lessonLocale.js');
    bridge.setRequestedLessonLocale('es');
    return bridge.requestedLessonLocale();
  });
  expect(before).toBe('es');

  const lesson = await openLesson(page, 'keplers-laws');
  expect(lesson.locale).toBe('es');
  expect(lesson.title).toBe('Las leyes de Kepler');
});
