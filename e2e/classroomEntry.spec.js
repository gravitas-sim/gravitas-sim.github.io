// =============================================================================
// Every kind of link lands on its task
// -----------------------------------------------------------------------------
// The matrix of docs/classroom-entry.md in a browser: each kind of link against
// a fresh profile, a returning one and one in first-week mode lands on the task
// with its first action named; a link that cannot be opened says why, who can
// fix it and the one way on, in a dialog that stays until it is closed; and a
// student who worked in an activity, an assignment or a pack comes back to it,
// not to the bare investigation, from the Library, Home and My work.
// tests/classroomEntry.test.js holds the records and the catalogues; the front
// door's patterns are tests/linkShapes.test.js and e2e/classroomDefects.spec.js.
// =============================================================================

import AxeBuilder from '@axe-core/playwright';
import { test, expect } from './fixtures.js';

const LESSON = 'keplers-laws';

const WEEK = {
  v: 1,
  id: 'week-one',
  t: { en: 'Week one', es: 'Semana uno' },
  items: [
    {
      t: { en: "Kepler's laws" },
      h: '/#investigation=keplers-laws',
      l: LESSON,
      n: 26,
    },
    { t: { en: 'Tides' }, h: '/#investigation=tides', l: 'tides', n: 20 },
  ],
};

/** Seed a profile before the first navigation: fresh, returning or first-week. */
async function profile(page, kind, locale = 'en') {
  await page.addInitScript(
    ([k, l, week]) => {
      try {
        if (globalThis.sessionStorage.getItem('seeded')) return;
        globalThis.sessionStorage.setItem('seeded', '1');
        localStorage.setItem('gravitas_locale', l);
        if (k !== 'fresh')
          localStorage.setItem('gravitas_orientation_seen_v1', '1');
        if (k === 'first-week')
          localStorage.setItem('gravitas_first_week', JSON.stringify(week));
      } catch {
        /* the test reads what it can */
      }
    },
    [kind, locale, WEEK]
  );
}

/** The links a classroom hands out, built by the product's own writers. */
async function links(page, app) {
  await app.boot();
  const made = await page.evaluate(async lessonId => {
    const reg = await import('/js/data/investigations/registry.js');
    const A = await import('/js/assignments/assignment.js');
    const L = await import('/js/assignments/assignmentLink.js');
    const { stepFingerprint } =
      await import('/js/investigations/progressBackup.js');
    const { remixBuiltin } = await import('/js/composer/remixApi.js');
    const { packLink } = await import('/js/composer/packLink.js');
    const lesson = await reg.loadInvestigation(lessonId);
    const chosen = lesson.steps
      .filter(s => !s.setup && Array.isArray(s.options))
      .slice(0, 2)
      .map(s => s.sid);
    const built = A.buildAssignment({
      lesson,
      chosen,
      title: 'Week 3',
      fingerprint: stepFingerprint,
    });
    const hashOf = url => new URL(url).hash;
    const assignment = hashOf((await L.assignmentLink(built)).url);
    const ghost = hashOf(
      (await L.assignmentLink({ ...built, l: 'no-such-lesson' })).url
    );
    const made = await remixBuiltin(lessonId, { id: 'my-kepler' });
    const pack = hashOf(
      (
        await packLink(made.pack, {
          root: `${location.origin}/`,
          base: made.pack,
        })
      ).url
    );
    return { assignment, ghost, pack };
  }, LESSON);
  await page.goto('about:blank');
  return made;
}

const panel = page => page.locator('#investigationPanel');
const notice = page => page.locator('#linkNotice');

/** On the task: the panel open, a step on it, the title holding focus. */
async function onTask(page, title) {
  await expect(panel(page)).toBeVisible({ timeout: 60_000 });
  await expect(page.locator('.inv-step-title')).not.toBeEmpty();
  await expect(page.locator('#investigationTitle')).toHaveText(title);
  await expect(page.locator('#investigationWhere')).toContainText(/Step 1 of/);
  await expect(page.locator('#welcomeScreen')).toBeHidden();
  await expect(notice(page)).not.toHaveAttribute('open', '');
  expect(await page.evaluate(() => document.activeElement?.id)).toBe(
    'investigationTitle'
  );
}

test.describe('a link lands on its task, whatever the profile', () => {
  for (const kind of ['fresh', 'returning', 'first-week']) {
    test(`a ${kind} profile on each kind of link`, async ({ page, app }) => {
      await profile(page, kind);
      const l = await links(page, app);
      const cases = [
        [`/#investigation=${LESSON}`, "Kepler's Laws"],
        [`/#investigation=${LESSON}/quantitative`, "Kepler's Laws"],
        [`/${l.assignment}`, 'Week 3'],
        ['/#activity=orbital-speed/guided', /Orbital motion/],
        [`/${l.pack}`, "Kepler's Laws"],
      ];
      for (const [url, title] of cases) {
        await app.boot({ firstVisit: kind === 'fresh', url });
        await onTask(page, title);
        if (url.endsWith('/quantitative'))
          await expect(page.locator('#investigationWhere')).toContainText(
            'Quantitative'
          );
        await page.goto('about:blank');
      }
    });
  }
});

test.describe('a link that cannot be opened says why and what to do', () => {
  /** What the dialog holds once it has opened. */
  async function said(page, { who, way }) {
    await expect(notice(page)).toBeVisible({ timeout: 60_000 });
    await expect(notice(page).locator('#linkNoticeTitle')).toBeVisible();
    await expect(notice(page).locator('#linkNoticeWhy')).not.toBeEmpty();
    await expect(notice(page).locator(`[data-who="${who}"]`)).toBeVisible();
    await expect(
      notice(page).locator(`[data-who="${who === 'you' ? 'sender' : 'you'}"]`)
    ).toBeHidden();
    for (const k of ['Alone', 'Reload', 'Library']) {
      const button = notice(page).locator(`#linkNotice${k}`);
      if (k === way) await expect(button).toBeVisible();
      else await expect(button).toBeHidden();
    }
    // The one way on takes the focus, so a keyboard reader is on it.
    expect(
      await page.evaluate(() => document.activeElement?.closest('dialog')?.id)
    ).toBe('linkNotice');
    return (await notice(page).locator('#linkNoticeWhy').textContent()).trim();
  }

  test('a link cut short: a sentence, the student can try again, the Library is the way on', async ({
    page,
    app,
  }) => {
    await profile(page, 'returning');
    const l = await links(page, app);
    await app.boot({ url: `/${l.assignment.slice(0, 40)}` });
    const why = await said(page, { who: 'you', way: 'Library' });
    // A sentence, not a message id (the decoder's own text used to leak).
    expect(why).toBe(
      'That link looks incomplete. Mail clients sometimes break long links across lines.'
    );
    await expect(panel(page)).toBeHidden();
    // Escape closes it and the page is the sandbox the student was on.
    await page.keyboard.press('Escape');
    await expect(notice(page)).toBeHidden();
  });

  test('an activity from a newer version: reload is the way on', async ({
    page,
    app,
  }) => {
    await profile(page, 'fresh');
    const l = await links(page, app);
    const newer = l.assignment.replace(/^#a1z/, '#a99z');
    await app.boot({ firstVisit: true, url: `/${newer}` });
    await said(page, { who: 'you', way: 'Reload' });
  });

  test('a link that names an investigation that is gone: only the sender can mend it', async ({
    page,
    app,
  }) => {
    await profile(page, 'returning');
    const l = await links(page, app);
    await app.boot({ url: `/${l.ghost}` });
    const why = await said(page, { who: 'sender', way: 'Library' });
    expect(why).toBe('That investigation could not be read.');
  });

  test('an activity with no such format: the investigation on its own is the way on', async ({
    page,
    app,
  }) => {
    await profile(page, 'fresh');
    await app.boot({
      firstVisit: true,
      url: '/#activity=orbital-speed/nope',
    });
    await said(page, { who: 'sender', way: 'Alone' });
    await notice(page).locator('#linkNoticeAlone').click();
    await onTask(page, "Kepler's Laws");
  });

  test('an unknown activity, an unknown investigation and a corrupt pack each say so', async ({
    page,
    app,
  }) => {
    await profile(page, 'returning');
    for (const [url, way] of [
      ['/#activity=no-such-activity/guided', 'Library'],
      ['/#investigation=no-such-lesson', 'Library'],
      ['/#i1zAAAA', 'Library'],
    ]) {
      await app.boot({ url });
      await said(page, { who: 'sender', way });
      await page.goto('about:blank');
    }
  });

  test('and says it in Spanish, accessibly', async ({ page, app }) => {
    await profile(page, 'returning', 'es');
    await app.boot({ url: '/#activity=no-such-activity/guided' });
    await said(page, { who: 'sender', way: 'Library' });
    await expect(notice(page).locator('#linkNoticeWhy')).toContainText(
      'No hay ninguna actividad'
    );
    await expect(notice(page).locator('#linkNoticeTitle .gs-es')).toBeVisible();
    const axe = await new AxeBuilder({ page }).include('#linkNotice').analyze();
    expect(axe.violations).toEqual([]);
  });

  test('a course the site does not have, and a guide it does not have', async ({
    page,
  }) => {
    await page.goto('/course/?course=no-such-course');
    await expect(page.locator('#ch-refused')).toBeVisible();
    await expect(page.locator('#ch-refused-why')).toHaveText(
      'No course called “no-such-course” comes with Gravitas.'
    );
    await page.goto('/observatory/?guide=no-such-guide');
    await expect(page.locator('#gdUnknown')).toHaveText(
      'There is no investigation called “no-such-guide” on this page. Choose one from the list below.'
    );
  });
});

test.describe('a student comes back to the activity, not the bare investigation', () => {
  /** Open a link, go on one step, leave, and return through each door. */
  async function returns(page, app, link, title) {
    await app.boot({ url: `/${link}` });
    await onTask(page, title);
    await page.locator('#investigationNext').click();
    await expect(page.locator('#investigationWhere')).toContainText(
      'Step 2 of'
    );
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            JSON.parse(localStorage.getItem('gravitas_resume') ?? 'null')
              ?.items?.[0]?.route
        )
      )
      .toBe(`/${link}`);
  }

  /** Back in through a door's link: the same title, the same step. */
  async function resumed(page, title) {
    await expect(panel(page)).toBeVisible({ timeout: 60_000 });
    await expect(page.locator('#investigationTitle')).toHaveText(title);
    await expect(page.locator('#investigationWhere')).toContainText(
      'Step 2 of'
    );
  }

  test('an assignment: the Library, Home and My work all say so and open it', async ({
    page,
    app,
  }) => {
    await profile(page, 'returning');
    const l = await links(page, app);
    await returns(page, app, l.assignment, 'Week 3');

    await page.goto('/library/');
    const lib = page.locator('#libContinueList a.lib-resume');
    await expect(lib).toHaveText('Continue the activity: Week 3');
    await lib.click();
    await resumed(page, 'Week 3');

    await page.goto('/#home');
    const home = page.locator('#welContinue li a, #welContinue li button');
    await expect(home.first()).toHaveText('Continue the activity: Week 3');
    await home.first().click();
    await resumed(page, 'Week 3');

    await page.goto('/my-work/');
    const row = page.locator('#mwAssignments .mw-item a', {
      hasText: 'Resume',
    });
    await expect(row).toHaveCount(1);
    await row.click();
    await resumed(page, 'Week 3');
  });

  test('an activity link, in Spanish', async ({ page, app }) => {
    await profile(page, 'returning', 'es');
    await links(page, app);
    await returns(
      page,
      app,
      '#activity=orbital-speed/guided',
      /Movimiento orbital|Orbital/
    );
    await page.goto('/library/');
    await expect(page.locator('#libContinueList a.lib-resume')).toContainText(
      'Continuar la actividad: '
    );
  });

  test('a pack link', async ({ page, app }) => {
    await profile(page, 'returning');
    const l = await links(page, app);
    await returns(page, app, l.pack, "Kepler's Laws");
    await page.goto('/library/');
    await page.locator('#libContinueList a.lib-resume').click();
    await resumed(page, "Kepler's Laws");
  });
});
