// =============================================================================
// What a lesson keeps, and what it says about it
// -----------------------------------------------------------------------------
// The list below is the list (STORAGE.md, "What an investigation keeps"): each
// thing a student changes, when it is written, and whether it returns after a
// reload. The first test changes every kept thing in one lesson, reloads, and
// finds each back; the second changes the scene and finds it rebuilt, with the
// note that says so. The others walk the status line: saved, refused (full, and
// private browsing), a refusal's backup button, and the recovery.
// =============================================================================

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test, expect } from './fixtures.js';
import {
  lessonPlan,
  openInvestigation,
  progressOf,
  recordFields,
  setControl,
  walkToSid,
} from './centralExperiment.js';

const ID = 'missing-mass';
const OUT = join(process.cwd(), 'test-results', 'saved-and-said');

/**
 * What is kept, by what the student does (the write is the one in
 * js/investigations/stepView.js, save()), and what is not.
 */
export const KEPT = {
  'a choice': 'on the click',
  'a written answer': 'on every keystroke',
  'a number typed and not yet checked': 'on every keystroke (drafts)',
  'a number checked, and the tries': 'on Check or Enter',
  'a measure field and how it was taken':
    'on every keystroke, or when a reading is taken',
  'an instrument slider': 'on every move, and when the step opens',
  'a hint stage': 'on the click',
  'the step, the steps seen, the depth, the time': 'on every step change',
};
export const NOT_KEPT = [
  'the live scene: a pause, a body added, removed or merged, the camera',
];

const status = page => page.locator('#investigationSaveStatus');
const note = page =>
  page.locator('#investigationSaveStatus + .inv-save-status');

/** Make writes to the lesson's own keys refuse, until `window.__refuse` is set false. */
async function refuse(page, name) {
  await page.addInitScript(errName => {
    window.__refuse = true;
    const real = window.Storage.prototype.setItem;
    window.Storage.prototype.setItem = function (key, value) {
      if (
        window.__refuse &&
        String(key).startsWith('gravitas_investigation_')
      ) {
        const err = new Error('refused by test');
        err.name = errName;
        if (errName === 'QuotaExceededError') err.code = 22;
        throw err;
      }
      return real.call(this, key, value);
    };
  }, name);
}

async function answerAndAdvance(page) {
  const options = page.locator('#investigationBody .inv-option');
  if (await options.count()) await options.first().click();
  const fields = page.locator('#investigationBody input[data-field]');
  for (let i = 0; i < (await fields.count()); i++) {
    const input = fields.nth(i);
    if (!(await input.inputValue())) await input.fill('1');
  }
  const next = page.locator('#investigationNext');
  await expect(next).toBeEnabled({ timeout: 15_000 });
  await next.click();
}

test.describe('what an investigation keeps', () => {
  test('every kept thing returns after a reload; the scene does not', async ({
    page,
    app,
  }) => {
    test.slow();
    await openInvestigation(page, app, ID);
    const plan = await lessonPlan(page, ID);

    // An instrument slider.
    await walkToSid(page, plan, 'put-the-mass-somewhere');
    const control = page
      .locator('#investigationToolControls input[data-tool]')
      .first();
    await expect(control).toBeVisible();
    const toolId = await control.getAttribute('data-tool');
    const [min, max] = await control.evaluate(el => [+el.min, +el.max]);
    const moved = String(Math.round(min + (max - min) * 0.7));
    await setControl(page, toolId, moved);

    // A choice.
    await walkToSid(page, plan, 'which-arrangement-gives-a-flat');
    await page.locator('#investigationBody .inv-option').nth(1).click();

    // A measure field.
    await walkToSid(page, plan, 'measure-the-enclosed-mass-yourself');
    await recordFields(page, ID, 'measure-the-enclosed-mass-yourself', {
      flat5: '123',
    });

    // A number typed and not checked, and a hint stage.
    await walkToSid(page, plan, 'how-much-of-it-is');
    await page.locator('#investigationBody [data-numeric]').fill('42');
    await page.locator('#investigationBody [data-hint]').first().click();

    // A written answer, last, so the reload lands on it.
    await walkToSid(page, plan, 'does-the-curve-decide');
    await page
      .locator('#investigationBody [data-answer]')
      .fill('A halo of dark matter.');

    const before = await progressOf(page, ID);
    expect(
      before.responses[`${ID}:put-the-mass-somewhere:tool:${toolId}`]
    ).toBe(moved);
    expect(before.drafts).toBeTruthy();

    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.splashScreenEnded === true);
    await page.locator('#investigationsBtn').click();
    await page.locator(`[data-investigation="${ID}"]`).click();
    await expect(page.locator('#investigationPanel')).toBeVisible();
    await expect(page.locator('.inv-step-title')).not.toBeEmpty();

    // The record is the one that was written, and the screens show it.
    await expect(page.locator('#investigationBody [data-answer]')).toHaveValue(
      'A halo of dark matter.'
    );
    const after = await progressOf(page, ID);
    expect(after.responses).toEqual(before.responses);
    expect(after.visited).toEqual(before.visited);
    expect(after.drafts).toEqual(before.drafts);

    await walkToSid(page, plan, 'how-much-of-it-is');
    await expect(page.locator('#investigationBody [data-numeric]')).toHaveValue(
      '42'
    );
    await expect(
      page.locator('#investigationBody [data-stage]').first()
    ).toBeVisible();
    await walkToSid(page, plan, 'measure-the-enclosed-mass-yourself');
    await expect(
      page.locator(
        `#investigationBody [data-field="${ID}:measure-the-enclosed-mass-yourself:flat5"]`
      )
    ).toHaveValue('123');
    await walkToSid(page, plan, 'which-arrangement-gives-a-flat');
    await expect(
      page.locator('#investigationBody .inv-option').nth(1)
    ).toHaveAttribute('aria-checked', 'true');
    await walkToSid(page, plan, 'put-the-mass-somewhere');
    await expect(
      page.locator(`#investigationToolControls [data-tool="${toolId}"]`)
    ).toHaveValue(moved);
  });

  test('a paused scene is not kept, and the student is told before and after', async ({
    page,
    app,
  }) => {
    test.slow();
    await openInvestigation(page, app, ID);
    const plan = await lessonPlan(page, ID);
    await walkToSid(page, plan, 'put-the-mass-somewhere');
    // Not on every step: nothing has been changed yet.
    await expect(note(page)).toBeHidden();

    const play = page.locator('#timelinePlay');
    await expect(play).toHaveAttribute('aria-label', /Pause simulation/);
    await play.click();
    await expect(note(page)).toBeVisible({ timeout: 5_000 });
    await expect(note(page)).toContainText(/scene you set up is not saved/i);
    await expect(note(page)).toHaveAttribute('role', 'status');

    // Another step is another scene to compare against: the note goes.
    await page.locator('#investigationNext').click();
    await expect(note(page)).toBeHidden();

    // Coming back: the scene is rebuilt from the step's start, and it says so.
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.splashScreenEnded === true);
    await page.locator('#investigationsBtn').click();
    await page.locator(`[data-investigation="${ID}"]`).click();
    await expect(page.locator('#investigationPanel')).toBeVisible();
    await expect(note(page)).toBeVisible();
    await expect(note(page)).toContainText(
      /rebuilt from the start of this step/i
    );
    await expect(note(page)).toContainText(
      /scene you set up last time is not kept/i
    );
    await expect(page.locator('#timelinePlay')).toHaveAttribute(
      'aria-label',
      /Pause simulation/
    );
  });
});

test.describe('the save status, in words', () => {
  test('says what is kept, once, without announcing the first save', async ({
    page,
    app,
  }) => {
    await openInvestigation(page, app, ID);
    await answerAndAdvance(page);
    await expect(status(page)).toHaveAttribute('data-state', 'saved');
    await expect(status(page)).toContainText(
      'Your answers, slider settings and hints are saved on this device.'
    );
    await expect(status(page)).toHaveAttribute('aria-live', 'off');
  });

  test('a refusal offers the backup in one action, and says so again once it recovers', async ({
    page,
    app,
  }) => {
    await refuse(page, 'QuotaExceededError');
    await openInvestigation(page, app, ID);
    await answerAndAdvance(page);
    await answerAndAdvance(page);
    await expect(status(page)).toHaveAttribute('data-state', 'full');
    await expect(page.locator('#srStatus')).toContainText(/Not saved/);
    const button = status(page).getByRole('button', {
      name: 'Download a backup of your answers',
    });
    await expect(button).toBeVisible();

    const download = page.waitForEvent('download');
    await button.click();
    const path = join(OUT, 'refused.json');
    await (await download).saveAs(path);
    const file = JSON.parse(await readFile(path, 'utf8'));
    expect(file.lesson.id).toBe(ID);
    expect(Object.keys(file.progress.responses).length).toBeGreaterThan(0);

    // Saving works again: the change is said, once.
    await page.evaluate(() => {
      window.__refuse = false;
    });
    await answerAndAdvance(page);
    await expect(status(page)).toHaveAttribute('data-state', 'saved');
    await expect(page.locator('#srStatus')).toContainText(
      /saved on this device/
    );
    await expect(status(page).getByRole('button')).toHaveCount(0);
  });

  test('private browsing is told apart from a full disk', async ({
    page,
    app,
  }) => {
    await refuse(page, 'SecurityError');
    await openInvestigation(page, app, ID);
    await answerAndAdvance(page);
    await expect(status(page)).toHaveAttribute('data-state', 'unavailable');
    await expect(status(page)).toContainText(/private browsing/i);
    await expect(
      status(page).getByRole('button', {
        name: 'Download a backup of your answers',
      })
    ).toBeVisible();
  });
});
