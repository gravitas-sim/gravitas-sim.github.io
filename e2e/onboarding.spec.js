// =============================================================================
// Onboarding, guidance and what next (Roadmap II, Prompt 73)
// -----------------------------------------------------------------------------
// The first-run introduction on Home (three screens, keyboard, skippable, once),
// the lesson's where line, Help and problem note, and the finish panel's way
// on: the next investigation of the sequence the student came from, and the
// deeper depth. Nothing is sent anywhere; every check reads the page.
// =============================================================================

import { test, expect } from './fixtures.js';

const CARD = '#scenarioInfoBox';
const orient = page => page.locator('#welOrient');
const shown = page =>
  page.evaluate(
    sel => document.querySelector(sel)?.classList.contains('showUI') ?? false,
    CARD
  );

test.describe('first run', () => {
  test('three screens inside Home, by keyboard, then the sandbox card, then never again', async ({
    page,
    app,
  }) => {
    await app.boot({ firstVisit: true });
    await expect(page.locator('#welcomeScreen')).toBeVisible();
    await expect(orient(page)).toBeVisible();
    // Nothing else on Home while the introduction runs, and no card under it.
    await expect(page.locator('.wel-hero')).toBeHidden();
    expect(await shown(page)).toBe(false);
    await expect(
      page.locator('[data-orient="0"] [data-orient-h]')
    ).toBeFocused();

    // Next by keyboard: Tab to the button, Enter.
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter');
    await expect(page.locator('[data-orient="1"]')).toBeVisible();
    await expect(page.locator('#srStatus')).toContainText('Three ways in');
    // Arrow keys move between screens from inside one.
    await page.keyboard.press('ArrowRight');
    await expect(page.locator('[data-orient="2"]')).toBeVisible();
    await expect(page.locator('[data-orient="2"]')).toContainText(
      'stay in this browser'
    );
    await page.keyboard.press('ArrowLeft');
    await expect(page.locator('[data-orient="1"]')).toBeVisible();
    await page.keyboard.press('ArrowRight');

    await page.getByRole('button', { name: 'Start exploring' }).click();
    await expect(orient(page)).toBeHidden();
    await expect(page.locator('.wel-hero')).toBeVisible();
    expect(await shown(page)).toBe(false);

    // Home closes; the scenario card follows it, as Prompt 52 ordered.
    await page.keyboard.press('Escape');
    await expect(page.locator('#welcomeScreen')).toBeHidden();
    await expect.poll(() => shown(page)).toBe(true);

    // Never twice: Home forgotten, introduction remembered.
    await page.evaluate(() =>
      localStorage.removeItem('gravitas_welcome_seen_v1')
    );
    await page.reload();
    await expect(page.locator('#welcomeScreen')).toBeVisible();
    await expect(page.locator('.wel-hero')).toBeVisible();
    await expect(orient(page)).toBeHidden();
  });

  test('skipping ends it for good', async ({ page, app }) => {
    await app.boot({ firstVisit: true });
    await page.getByRole('button', { name: 'Skip the introduction' }).click();
    await expect(orient(page)).toBeHidden();
    await expect(page.locator('.wel-hero [data-action="enter"]')).toBeFocused();
    expect(
      await page.evaluate(() =>
        localStorage.getItem('gravitas_orientation_seen_v1')
      )
    ).toBe('1');
  });

  test('in Spanish it reads in Spanish', async ({ page, app }) => {
    await page.addInitScript(() =>
      localStorage.setItem('gravitas_locale', 'es')
    );
    await app.boot({ firstVisit: true });
    await expect(page.locator('[data-orient="0"] h2')).toContainText(
      'Qué es Gravitas'
    );
  });
});

test.describe('first run on a phone', () => {
  test.use({ viewport: { width: 375, height: 740 }, hasTouch: true });

  test('the introduction fits, is reachable, and ends on a tap', async ({
    page,
    app,
  }) => {
    await app.boot({ firstVisit: true });
    await expect(orient(page)).toBeVisible();
    const fits = await orient(page).evaluate(
      el => el.scrollWidth <= el.clientWidth + 1
    );
    expect(fits).toBe(true);
    await page.getByRole('button', { name: 'Next' }).tap();
    await page.getByRole('button', { name: 'Next' }).tap();
    await page.getByRole('button', { name: 'Start exploring' }).tap();
    await expect(orient(page)).toBeHidden();
    expect(await shown(page)).toBe(false);
  });
});

const LESSON = 'keplers-laws';

async function resumeAtEnd(page, app, id = LESSON) {
  await app.boot();
  await page.evaluate(async id => {
    const reg = await import('/js/data/investigations/registry.js');
    const { writeProgress } =
      await import('/js/investigations/progressSchema.js');
    const lesson = await reg.loadInvestigation(id);
    localStorage.setItem(
      `gravitas_investigation_${id}`,
      JSON.stringify(
        writeProgress({
          lesson,
          responses: {},
          attempts: {},
          visited: lesson.steps.map(s => s.sid),
          stepSid: lesson.steps.at(-1).sid,
          startedAt: null,
          spent: 125,
        })
      )
    );
  }, id);
  await page.evaluate(id => {
    location.hash = `#investigation=${id}`;
  }, id);
  await expect(page.locator('#investigationPanel')).toBeVisible();
}

test.describe('in a lesson', () => {
  test('the where line, Help, and a problem note that sends nothing', async ({
    page,
    app,
  }) => {
    const sent = [];
    page.on('request', r => sent.push(r.method() + ' ' + r.url()));
    await resumeAtEnd(page, app);
    const where = page.locator('#investigationWhere');
    await expect(where).toContainText(/Step \d+ of \d+/);
    await expect(where).toContainText('2 min of 35-45 min');

    await page.locator('#investigationHelp').click();
    const panel = page.locator('#investigationHelpPanel');
    await expect(panel).toBeVisible();
    await expect(panel).toContainText('Shift');
    await expect(page.locator('#investigationHelp')).toHaveAttribute(
      'aria-expanded',
      'true'
    );
    const before = sent.length;
    await page.locator('#investigationHelpReport').click();
    const note = page.locator('#investigationHelpText');
    await expect(note).toHaveValue(/Investigation: keplers-laws/);
    await expect(note).toHaveValue(/Platform API: 1\.0\.0/);
    await expect(note).toHaveValue(/Browser: /);
    // Making it posts nothing.
    expect(sent.slice(before).filter(r => r.startsWith('POST'))).toEqual([]);
  });

  test('a finished investigation offers the next of its sequence, and nothing stale', async ({
    page,
    app,
  }) => {
    await resumeAtEnd(page, app);
    await page.evaluate(() =>
      localStorage.setItem(
        'gravitas_next_context',
        JSON.stringify({ k: 'seq', id: 'orbital-mechanics' })
      )
    );
    await page.locator('#investigationNext').click();
    const list = page.locator('#investigationNextList');
    await expect(list.locator('a')).toHaveCount(1);
    await expect(list.locator('a')).toContainText('Next in');
    await expect(list.locator('a')).toHaveAttribute(
      'href',
      /investigation=orbital-energy/
    );
    // The way on to the Library and My work is always there.
    await expect(page.locator('.inv-next a[href="/my-work/"]')).toBeVisible();
  });

  test('a course item offers the course’s next one, and the deeper depth', async ({
    page,
    app,
  }) => {
    await resumeAtEnd(page, app);
    await page.evaluate(() =>
      localStorage.setItem(
        'gravitas_next_context',
        JSON.stringify({
          k: 'course',
          home: '/course/?course=intro-astronomy',
          t: 'Intro',
          i: 0,
          items: [
            ['keplers-laws', '', 'Kepler'],
            ['retrograde-motion', '', 'Retrograde motion'],
          ],
        })
      )
    );
    await page.locator('#investigationNext').click();
    const list = page.locator('#investigationNextList');
    await expect(list.locator('a').first()).toContainText(
      'Next in Intro: Retrograde motion'
    );
    await expect(list.locator('a').nth(1)).toHaveAttribute(
      'href',
      /course=intro-astronomy/
    );
    // Kepler's Laws has deeper steps.
    await expect(list.locator('button')).toContainText(/deeper/i);
  });
});
