// =============================================================================
// The submission review page, read and exported through its own controls
// -----------------------------------------------------------------------------
// /instructors/submissions/ had no browser coverage at all. These tests hand
// it what an instructor would - several JSON backups, a pasted-out token, the
// same token twice and a file that is neither - through the file picker, then
// download the summary, the question-level CSV and the JSON and read what came
// out. The submissions are built by the application's own modules, so a
// report here is a report a student's browser would have produced.
//
// Built, and also taken from the lesson itself. These fixtures once stored
// answers by bare sid, which the lesson engine never does, and every test here
// passed while the page graded every real report as unanswered. So the answers
// are now stored under stepKey(), and one test answers a lesson in the
// application and hands the page the backup the application wrote.
// =============================================================================

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import AxeBuilder from '@axe-core/playwright';

import { test, expect } from './fixtures.js';
import { buildBackup } from '../js/investigations/progressBackup.js';
import { stepKey } from '../js/investigations/progressSchema.js';
import {
  buildSubmission,
  encodeSubmission,
} from '../js/submission/submissionToken.js';
import {
  QUESTION_COLUMNS,
  RESULTS_KIND,
  SUMMARY_COLUMNS,
} from '../js/submission/results.js';
import { fromCsv } from '../js/csv.js';

const kepler = await import('../js/data/investigations/keplers-laws.js').then(
  m => m.default || Object.values(m)[0]
);

/** A backup a student's browser would save, from answers given by sid. */
function backup({ name, responses }) {
  return buildBackup({
    lesson: kepler,
    responses: Object.fromEntries(
      Object.entries(responses).map(([sid, v]) => [stepKey(kepler.id, sid), v])
    ),
    attempts: {},
    visited: kepler.steps.slice(0, 6).map(s => s.sid),
    stepSid: kepler.steps[5].sid,
    startedAt: '2026-09-01T10:00:00.000Z',
    studentName: name,
  });
}

const ada = backup({
  name: 'Ada',
  responses: {
    'where-is-the-star': '1',
    'use-the-law': '8',
    'why-the-speed-changes': 'Closer to the star, so it moves faster.',
  },
});
const ben = backup({
  name: '=HYPERLINK("http://example.invalid","x")',
  responses: { 'where-is-the-star': '0', 'use-the-law': '5' },
});
const { token } = await encodeSubmission(
  buildSubmission({
    backup: backup({ name: 'Cleo', responses: { 'use-the-law': '8' } }),
    rosterId: 'S-3',
    assignmentId: 'week-3',
  })
);

const file = (name, text, mimeType) => ({
  name,
  mimeType,
  buffer: Buffer.from(text),
});
const PILE = [
  file('ada.json', JSON.stringify(ada), 'application/json'),
  file('ben.json', JSON.stringify(ben), 'application/json'),
  file('cleo.txt', token, 'text/plain'),
  file('cleo-again.txt', token, 'text/plain'),
  file('notes.txt', 'these are my notes', 'text/plain'),
];

async function open(page) {
  await page.addInitScript(() => {
    try {
      window.localStorage.setItem('gravitas_locale', 'en');
    } catch {
      /* not needed for the test to mean something */
    }
  });
  await page.goto('/instructors/submissions/', {
    waitUntil: 'domcontentloaded',
  });
  await expect(page.locator('#count')).toHaveText('nothing yet');
}

/** Click a download button and return the file's name and text. */
async function take(page, id) {
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.locator(`#${id}`).click(),
  ]);
  return {
    name: download.suggestedFilename(),
    text: readFileSync(await download.path(), 'utf8'),
  };
}

test.describe('the submission review page', () => {
  test('says there is nothing to download until something is read', async ({
    page,
  }) => {
    await open(page);
    for (const id of ['exportSummary', 'exportQuestions', 'exportJson']) {
      await expect(page.locator(`#${id}`)).toBeDisabled();
    }
    await expect(page.locator('#exportEmpty')).toBeVisible();
  });

  test('reads a pile, keeps the duplicate, and refuses what it cannot read', async ({
    page,
  }) => {
    await open(page);
    await page.locator('#picker').setInputFiles(PILE);
    await expect(page.locator('#count')).toHaveText('4 submissions');
    await expect(page.locator('#who li')).toHaveCount(4);
    await expect(page.locator('#who li').nth(3)).toContainText(
      'exact duplicate of #3'
    );
    await expect(page.locator('#refused li')).toHaveText(
      'notes.txt: not JSON and not a token'
    );
    await expect(page.locator('#exportEmpty')).toBeHidden();
    await expect(page.locator('#exportSummary')).toBeEnabled();
  });

  test('downloads a summary, a question file and the JSON, all from the same reading', async ({
    page,
  }) => {
    await open(page);
    await page.locator('#picker').setInputFiles(PILE);
    await expect(page.locator('#count')).toHaveText('4 submissions');

    const summary = await take(page, 'exportSummary');
    expect(summary.name).toMatch(
      /^gravitas-results-summary-\d{4}-\d{2}-\d{2}\.csv$/
    );
    const rows = fromCsv(summary.text);
    expect(rows[0]).toEqual([...SUMMARY_COLUMNS]);
    expect(rows).toHaveLength(1 + 4);
    const col = name => SUMMARY_COLUMNS.indexOf(name);
    expect(rows.map(r => r[col('source_label')]).slice(1)).toEqual([
      'ada.json',
      'ben.json',
      'cleo.txt',
      'cleo-again.txt',
    ]);
    expect(rows[4][col('duplicate_of')]).toBe('3');
    expect(rows[3][col('roster_id')]).toBe('S-3');
    // The typed name that looks like a formula reaches a spreadsheet as text -
    // behind an apostrophe in the file - and reads back as it was typed.
    expect(summary.text).toContain(
      '"\'=HYPERLINK(""http://example.invalid"",""x"")"'
    );
    expect(rows[2][col('name_as_typed')]).toBe(
      '=HYPERLINK("http://example.invalid","x")'
    );
    await expect(page.locator('#exportStatus')).toHaveText(
      `Downloaded ${summary.name}.`
    );

    const questions = await take(page, 'exportQuestions');
    expect(questions.name).toMatch(
      /^gravitas-results-questions-\d{4}-\d{2}-\d{2}\.csv$/
    );
    const qrows = fromCsv(questions.text);
    expect(qrows[0]).toEqual([...QUESTION_COLUMNS]);
    // Every graded step of every report, duplicate included.
    expect(qrows.length - 1).toBe(4 * 13);

    const json = await take(page, 'exportJson');
    expect(json.name).toMatch(/^gravitas-results-\d{4}-\d{2}-\d{2}\.json$/);
    const doc = JSON.parse(json.text);
    expect(doc.kind).toBe(RESULTS_KIND);
    expect(doc.submissions).toHaveLength(4);
    expect(doc.refused).toEqual([{ label: 'notes.txt', reason: 'notJson' }]);
  });

  test('withholds written answers unless the instructor asks for them', async ({
    page,
  }) => {
    await open(page);
    await page.locator('#picker').setInputFiles(PILE.slice(0, 1));
    await expect(page.locator('#count')).toHaveText('1 submission');
    const written = 'Closer to the star, so it moves faster.';

    const plain = await take(page, 'exportQuestions');
    expect(plain.text).not.toContain(written);
    expect(plain.text).toContain('withheld');

    await page.locator('#includeWritten').check();
    const opted = await take(page, 'exportQuestions');
    expect(opted.text).toContain(written);
    const json = JSON.parse((await take(page, 'exportJson')).text);
    expect(json.options.includeWritten).toBe(true);
  });

  test('shows each written answer beside its rubric, on this screen only', async ({
    page,
  }) => {
    // Read and counted as unmarkable, and never shown: an instructor had to
    // open every PDF to read them.
    await open(page);
    await page.locator('#picker').setInputFiles(PILE.slice(0, 2));
    await expect(page.locator('#count')).toHaveText('2 submissions');
    const boxes = page.locator('#who .sr-written');
    // Ada wrote one; Ben wrote nothing, so he gets no disclosure.
    await expect(boxes).toHaveCount(1);
    await expect(boxes.locator('summary')).toHaveText('Written answers: 1');
    await boxes.locator('summary').click();
    await expect(boxes.locator('dd').first()).toHaveText(
      'Closer to the star, so it moves faster.'
    );
    const step = kepler.steps.find(s => s.sid === 'why-the-speed-changes');
    if (step.rubric) {
      await expect(boxes.locator('.sr-rubric')).toContainText('Marking note:');
    }
    // Nothing on the page is an entity or a tag left as text.
    expect(await boxes.innerText()).not.toMatch(/&[a-z]+;|<\/?[a-z]/);
  });

  test('works from the keyboard alone', async ({ page }) => {
    await open(page);
    await page.locator('#picker').setInputFiles(PILE.slice(0, 2));
    await expect(page.locator('#count')).toHaveText('2 submissions');
    await page.locator('#includeWritten').focus();
    await page.keyboard.press('Space');
    await expect(page.locator('#includeWritten')).toBeChecked();
    await page.keyboard.press('Tab');
    await expect(page.locator('#exportSummary')).toBeFocused();
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.keyboard.press('Enter'),
    ]);
    expect(download.suggestedFilename()).toMatch(/summary/);
  });

  test('speaks Spanish, and remembers it for the rest of Gravitas', async ({
    page,
  }) => {
    await open(page);
    await page.locator('#picker').setInputFiles(PILE);
    await page.locator('#langSwitch [data-lang="es"]').click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'es');
    await expect(page.locator('h1')).toHaveText('Revisión de entregas');
    await expect(page.locator('#count')).toHaveText('4 entregas');
    await expect(page.locator('#exportSummary')).toHaveText('Resumen (CSV)');
    await expect(page.locator('#refused li')).toHaveText(
      'notes.txt: no es JSON ni un código'
    );
    await expect(page).toHaveTitle('Revisión de entregas | Gravitas');
    expect(
      await page.evaluate(() => window.localStorage.getItem('gravitas_locale'))
    ).toBe('es');
  });

  test('grades the answers a lesson in the application saved', async ({
    page,
    app,
  }) => {
    // Kepler's first seven steps: two readings, a prediction, a reading, the
    // ellipse, a choice and a measurement. Between them the engine stores an
    // option index twice, where the ellipse slider was left, and a key per
    // measure field, the derived one included.
    await app.boot();
    await page.locator('#investigationsBtn').click();
    await page.locator(`[data-investigation="${kepler.id}"]`).click();
    await expect(page.locator('#investigationPanel')).toBeVisible();
    const body = page.locator('#investigationBody');
    const progress = page.locator('#investigationProgressText');
    const typed = {
      circ_e: '0',
      ecc_e: '0.6',
      ecc_peri: '0.4',
      ecc_apo: '1.6',
    };
    const walk = kepler.steps.slice(0, 7);
    for (const [i, step] of walk.entries()) {
      await expect(progress).toHaveText(new RegExp(`(^|\\D)${i + 1}\\s+of`));
      if (step.type === 'predict' || step.kind === 'choice') {
        await body.locator(`[data-option="${step.answer}"]`).click();
      }
      if (step.type === 'measure') {
        for (const [id, value] of Object.entries(typed)) {
          await body
            .locator(`[data-field="${stepKey(kepler.id, step.sid)}:${id}"]`)
            .fill(value);
        }
        // Worked out as the others are typed, and stored like them.
        await expect(
          body.locator(`[data-field="${stepKey(kepler.id, step.sid)}:ecc_a"]`)
        ).toHaveValue(/^1(\.0+)?$/);
      }
      if (i < walk.length - 1) await page.locator('#investigationNext').click();
    }

    const download = page.waitForEvent('download');
    await page.locator('#investigationBackupDownload').click();
    const saved = join(test.info().outputDir, 'engine-backup.json');
    await (await download).saveAs(saved);
    const keys = Object.keys(
      JSON.parse(readFileSync(saved, 'utf8')).progress.responses
    );
    // What this test is for: keys the engine wrote, sub-keys and all.
    expect(keys.every(k => k.startsWith(`${kepler.id}:`))).toBe(true);
    expect(keys).toContain(`${kepler.id}:change-the-shape:e`);
    expect(keys).toContain(`${kepler.id}:measure-the-two-orbits:ecc_a`);

    await open(page);
    await page.locator('#includeWritten').check();
    await page.locator('#picker').setInputFiles(saved);
    await expect(page.locator('#count')).toHaveText('1 submission');
    const doc = JSON.parse((await take(page, 'exportJson')).text);
    const [sub] = doc.submissions;
    expect(sub.counts).toEqual({
      scorable: 13,
      correct: 2,
      incorrect: 0,
      unmarked: 1,
      incomplete: 10,
      stale: 0,
      // A point a question: two earned, and the written answer's one waiting.
      points: 2,
      pointsPossible: 13,
      pointsUnmarked: 1,
    });
    expect(sub.warnings).toEqual(['noRosterId']);
    const q = sid => sub.questions.find(x => x.stepId === sid);
    expect(q('where-is-the-star')).toMatchObject({
      verdict: 'correct',
      attempts: 1,
      response: '1',
    });
    expect(q('what-sits-at-the-other').verdict).toBe('correct');
    expect(q('measure-the-two-orbits')).toMatchObject({ verdict: 'unmarked' });
    expect(q('measure-the-two-orbits').response).toMatch(
      /^circ_e=0; ecc_e=0\.6; ecc_peri=0\.4; ecc_apo=1\.6; ecc_a=1(\.0+)?$/
    );
  });

  test('passes axe with results on it', async ({ page }) => {
    await open(page);
    await page.locator('#picker').setInputFiles(PILE);
    await expect(page.locator('#count')).toHaveText('4 submissions');
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(results.violations.map(v => v.id)).toEqual([]);
  });
});
