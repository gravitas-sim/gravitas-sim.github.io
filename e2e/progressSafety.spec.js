// =============================================================================
// Not losing the work
// -----------------------------------------------------------------------------
// A lesson is forty minutes of a student's attention. It is held in
// localStorage, which is allowed to say no: a private window refuses, a shared
// lab machine fills up, a browser set to block site data throws on the first
// write. The engine used to swallow all three and carry on looking healthy.
//
// So these tests break storage on purpose and check two things - that the
// reader is told, quietly and permanently rather than in a toast that expires,
// and that they can still get the work out through a file.
// =============================================================================

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test, expect } from './fixtures.js';

const OUT = join(process.cwd(), 'test-results', 'progress-safety');
const LESSON = 'missing-mass';
const PREFIX = 'gravitas_investigation_';

/**
 * Make writes to the lesson's own key fail, the way a real browser would.
 *
 * Scoped to that key prefix on purpose: breaking every write in the page would
 * take the theme, the unit choice and the welcome flag down with it, and then
 * the test would be measuring something else.
 *
 * @param {import('@playwright/test').Page} page - The page, before it navigates
 * @param {string} name - The DOMException name to throw
 */
async function breakStorage(page, name) {
  await page.addInitScript(errName => {
    const real = window.Storage.prototype.setItem;
    window.Storage.prototype.setItem = function (key, value) {
      if (String(key).startsWith('gravitas_investigation_')) {
        const err = new Error('refused by test');
        err.name = errName;
        if (errName === 'QuotaExceededError') err.code = 22;
        throw err;
      }
      return real.call(this, key, value);
    };
  }, name);
}

/** Open the lesson browser and start a lesson through the interface. */
async function openLesson(page, app, { url = '/' } = {}) {
  await app.boot({ url });
  await page.locator('#investigationsBtn').click();
  await page.locator(`[data-investigation="${LESSON}"]`).click();
  await expect(page.locator('#investigationPanel')).toBeVisible();
  await expect(page.locator('.inv-step-title')).not.toBeEmpty();
}

/** Answer whatever the current step asks for, then advance one step. */
async function answerAndAdvance(page) {
  const options = page.locator('#investigationBody .inv-option');
  if (await options.count()) await options.first().click();

  const fields = page.locator('#investigationBody input[data-field]');
  for (let i = 0; i < (await fields.count()); i++) {
    const input = fields.nth(i);
    if (!(await input.inputValue())) await input.fill('1');
  }

  const boxes = page.locator('#investigationBody input[type="checkbox"]');
  for (let i = 0; i < (await boxes.count()); i++) {
    const box = boxes.nth(i);
    if (!(await box.isChecked())) await box.check();
  }

  const areas = page.locator('#investigationBody textarea');
  for (let i = 0; i < (await areas.count()); i++) {
    const area = areas.nth(i);
    if (!(await area.inputValue())) await area.fill('An answer.');
  }

  const next = page.locator('#investigationNext');
  await expect(next).toBeEnabled({ timeout: 15_000 });
  await next.click();
}

/** The step number the panel is showing, one-based. */
async function stepNumber(page) {
  const text = await page.locator('#investigationProgressText').innerText();
  return Number(text.match(/(\d+)\s+of/)?.[1] ?? 0);
}

const status = page => page.locator('#investigationSaveStatus');

test.describe('the save status', () => {
  test('confirms a write that worked, without announcing it', async ({
    page,
    app,
  }) => {
    await openLesson(page, app);
    await answerAndAdvance(page);

    await expect(status(page)).toBeVisible();
    await expect(status(page)).toHaveAttribute('data-state', 'saved');
    // Visible, not spoken. A screen reader being told "saved" once per
    // keystroke is worse than being told nothing.
    await expect(status(page)).toHaveAttribute('aria-live', 'off');
  });

  test('a full disk is reported, and stays reported', async ({ page, app }) => {
    await breakStorage(page, 'QuotaExceededError');
    await openLesson(page, app);
    await answerAndAdvance(page);

    await expect(status(page)).toBeVisible();
    await expect(status(page)).toHaveAttribute('data-state', 'full');
    await expect(status(page)).toHaveAttribute('aria-live', 'polite');
    await expect(status(page)).toContainText(/storage|full|space/i);

    // Standing, not transient: several more steps and it is still on screen.
    await answerAndAdvance(page);
    await answerAndAdvance(page);
    await expect(status(page)).toHaveAttribute('data-state', 'full');
  });

  test('a browser that refuses storage is told apart from a full one', async ({
    page,
    app,
  }) => {
    // A private window throws SecurityError. Telling that reader to free up
    // space would send them looking for room they already have.
    await breakStorage(page, 'SecurityError');
    await openLesson(page, app);
    await answerAndAdvance(page);

    await expect(status(page)).toHaveAttribute('data-state', 'unavailable');
    await expect(status(page)).not.toContainText(/full/i);
  });

  test('a failing write never becomes a toast', async ({ page, app }) => {
    await breakStorage(page, 'QuotaExceededError');
    await openLesson(page, app);

    // Every keystroke saves. If the failure toasted, this would produce a
    // stream of them across the screen.
    await answerAndAdvance(page);
    const fields = page.locator('#investigationBody input[data-field]');
    if (await fields.count()) {
      await fields.first().fill('123');
      await fields.first().fill('4567');
    }
    await answerAndAdvance(page);

    const toast = page.locator('#gravitasToast.is-visible');
    await expect(toast).toHaveCount(0);
  });

  test('the answers keep working while storage is broken', async ({
    page,
    app,
  }) => {
    await breakStorage(page, 'QuotaExceededError');
    await openLesson(page, app);
    await answerAndAdvance(page);
    await answerAndAdvance(page);
    await answerAndAdvance(page);

    // The lesson advanced and graded normally; only the disk is missing.
    expect(await stepNumber(page)).toBeGreaterThanOrEqual(4);
    await expect(page.locator('.inv-step-title')).not.toBeEmpty();
  });
});

test.describe('the backup file', () => {
  test('carries the work out and puts it back', async ({ page, app }) => {
    await openLesson(page, app);
    await answerAndAdvance(page);
    await answerAndAdvance(page);
    const reached = await stepNumber(page);

    const download = page.waitForEvent('download');
    await page.locator('#investigationBackupDownload').click();
    const file = await download;
    expect(file.suggestedFilename()).toMatch(
      /^gravitas-missing-mass-progress-\d{4}-\d{2}-\d{2}\.json$/
    );

    const path = join(OUT, 'progress.json');
    await file.saveAs(path);
    const backup = JSON.parse(await readFile(path, 'utf8'));

    // The format the reader is trusting: enough to identify the lesson, to
    // recognise its steps after an edit, and to reconstruct the answers.
    expect(backup.kind).toBe('gravitas.investigation.progress');
    expect(backup.version).toBe(1);
    expect(backup.lesson.id).toBe(LESSON);
    expect(backup.steps.length).toBeGreaterThan(0);
    expect(Object.keys(backup.progress.responses).length).toBeGreaterThan(0);
    expect(backup.progress.stepIndex).toBe(reached - 1);
    expect(backup.progress.startedAt).toBeTruthy();

    // Now lose everything, the way a cleared browser would.
    await page.evaluate(prefix => {
      for (const key of Object.keys(localStorage)) {
        if (key.startsWith(prefix)) localStorage.removeItem(key);
      }
    }, PREFIX);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.splashScreenEnded === true);

    await page.locator('#investigationsBtn').click();
    await page.locator(`[data-investigation="${LESSON}"]`).click();
    await expect(page.locator('#investigationPanel')).toBeVisible();
    expect(await stepNumber(page)).toBe(1);

    // ...and restore it.
    await page.locator('#investigationBackupFile').setInputFiles(path);
    await expect
      .poll(() => stepNumber(page), { timeout: 15_000 })
      .toBe(reached);

    // The answers came back editable, not as a read-only report.
    const restored = await page.evaluate(prefix => {
      const key = Object.keys(localStorage).find(k => k.startsWith(prefix));
      return key ? JSON.parse(localStorage.getItem(key)) : null;
    }, PREFIX);
    expect(Object.keys(restored.responses)).toEqual(
      Object.keys(backup.progress.responses)
    );
  });

  test('replacing existing answers needs an explicit yes', async ({
    page,
    app,
  }) => {
    await openLesson(page, app);
    await answerAndAdvance(page);

    const download = page.waitForEvent('download');
    await page.locator('#investigationBackupDownload').click();
    const path = join(OUT, 'confirm.json');
    await (await download).saveAs(path);

    // Get further along than the backup, then decline the replacement.
    await answerAndAdvance(page);
    await answerAndAdvance(page);
    const reached = await stepNumber(page);

    let asked = null;
    page.once('dialog', d => {
      asked = d.message();
      d.dismiss();
    });
    await page.locator('#investigationBackupFile').setInputFiles(path);

    await expect.poll(() => asked, { timeout: 10_000 }).toBeTruthy();
    // Declining changes nothing at all.
    await page.waitForTimeout(500);
    expect(await stepNumber(page)).toBe(reached);
  });

  test('a file that is not a backup is refused by name', async ({
    page,
    app,
  }) => {
    await openLesson(page, app);
    await answerAndAdvance(page);
    const reached = await stepNumber(page);

    page.on('dialog', d => d.accept());

    for (const [name, body] of [
      ['not-json.json', 'this is not json at all'],
      ['other.json', JSON.stringify({ hello: 'world' })],
      [
        'future.json',
        JSON.stringify({
          kind: 'gravitas.investigation.progress',
          version: 99,
          lesson: { id: LESSON },
          progress: {},
        }),
      ],
    ]) {
      await page.locator('#investigationBackupFile').setInputFiles({
        name,
        mimeType: 'application/json',
        buffer: Buffer.from(body),
      });
      const toast = page.locator('#gravitasToast');
      await expect(toast).toBeVisible({ timeout: 10_000 });
      await expect(toast).not.toBeEmpty();
      // Refused, and nothing moved.
      expect(await stepNumber(page)).toBe(reached);
    }
  });

  test('a backup from a different lesson is refused', async ({ page, app }) => {
    await openLesson(page, app);
    page.on('dialog', d => d.accept());

    await page.locator('#investigationBackupFile').setInputFiles({
      name: 'tides.json',
      mimeType: 'application/json',
      buffer: Buffer.from(
        JSON.stringify({
          kind: 'gravitas.investigation.progress',
          version: 1,
          lesson: { id: 'tides', title: 'Tides' },
          progress: { responses: { 'tides:0': 'x' }, visited: [0] },
          steps: [],
        })
      ),
    });

    const toast = page.locator('#gravitasToast');
    await expect(toast).toBeVisible({ timeout: 10_000 });
    await expect(toast).toContainText(/Tides/);
    expect(await stepNumber(page)).toBe(1);
  });

  test('rescues the work when storage is refusing it', async ({
    page,
    app,
  }) => {
    // The whole point. Storage is broken, the reader is warned, and the file
    // is the way out.
    await breakStorage(page, 'QuotaExceededError');
    await openLesson(page, app);
    await answerAndAdvance(page);
    await answerAndAdvance(page);
    const reached = await stepNumber(page);
    await expect(status(page)).toHaveAttribute('data-state', 'full');

    const download = page.waitForEvent('download');
    await page.locator('#investigationBackupDownload').click();
    const path = join(OUT, 'rescued.json');
    await (await download).saveAs(path);

    // A different machine, or the same one after clearing space: storage works.
    const fresh = await page.context().newPage();
    await fresh.goto('/');
    await fresh.waitForFunction(() => window.splashScreenEnded === true);
    await fresh.locator('#investigationsBtn').click();
    await fresh.locator(`[data-investigation="${LESSON}"]`).click();
    await expect(fresh.locator('#investigationPanel')).toBeVisible();

    await fresh.locator('#investigationBackupFile').setInputFiles(path);
    await expect
      .poll(
        async () => {
          const text = await fresh
            .locator('#investigationProgressText')
            .innerText();
          return Number(text.match(/(\d+)\s+of/)?.[1] ?? 0);
        },
        { timeout: 15_000 }
      )
      .toBe(reached);

    // And this time it is on the disk: a reload keeps it.
    await fresh.reload({ waitUntil: 'domcontentloaded' });
    await fresh.waitForFunction(() => window.splashScreenEnded === true);
    await fresh.locator('#investigationsBtn').click();
    await fresh.locator(`[data-investigation="${LESSON}"]`).click();
    await expect
      .poll(
        async () => {
          const text = await fresh
            .locator('#investigationProgressText')
            .innerText();
          return Number(text.match(/(\d+)\s+of/)?.[1] ?? 0);
        },
        { timeout: 15_000 }
      )
      .toBe(reached);
    await fresh.close();
  });
});

test.describe('an authoring preview is not a student', () => {
  test('offers no backup controls and writes nothing', async ({
    page,
    app,
  }) => {
    // First, real progress from a real reader.
    await openLesson(page, app);
    await answerAndAdvance(page);
    await answerAndAdvance(page);
    const before = await page.evaluate(
      prefix =>
        localStorage.getItem(
          Object.keys(localStorage).find(k => k.startsWith(prefix))
        ),
      PREFIX
    );
    expect(before).toBeTruthy();

    // Then an author opens the same lesson at a later step.
    await app.boot({ url: `/?author=${LESSON}&step=6` });
    await expect(page.locator('#investigationPanel')).toBeVisible();
    await expect(page.locator('.inv-step-title')).not.toBeEmpty();

    await expect(page.locator('.inv-backup-actions')).toBeHidden();
    await expect(status(page)).toHaveAttribute('data-state', 'authoring');

    // The student's progress is untouched.
    const after = await page.evaluate(
      prefix =>
        localStorage.getItem(
          Object.keys(localStorage).find(k => k.startsWith(prefix))
        ),
      PREFIX
    );
    expect(after).toBe(before);
  });
});
