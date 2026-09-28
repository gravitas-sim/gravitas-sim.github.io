// =============================================================================
// The Investigation Composer (/studio/lesson/), in a browser
// -----------------------------------------------------------------------------
// tests/investigationPack.test.js holds the format and tests/composer.test.js
// the compiler and the lesson checker's verdict. This is the page, against the
// sources and against dist/:
//   - the example opens valid, with its estimate, its answer key and its
//     translation complete;
//   - a bad value is explained on its field and blocks saving, and undo takes
//     it back;
//   - editing the English marks its Spanish out of date, and rewriting the
//     Spanish clears it;
//   - steps are added and removed, and renaming a step's id carries every
//     reference to it;
//   - the preview is the real lesson engine: a wrong answer to the bank
//     question shows the remediation step, a right one passes over it;
//   - a sample lab report is a PDF;
//   - the saved file is the one on screen and opens again unchanged, a bank
//     file merges its new questions and refuses a clash, and the lesson
//     files export;
//   - a file with the id of a different draft asks first;
//   - it reads in Spanish, passes axe in both languages, and fits a phone.
// =============================================================================

import { readFileSync } from 'node:fs';
import AxeBuilder from '@axe-core/playwright';
import { test, expect } from './fixtures.js';
import { EXAMPLE_INVESTIGATION } from '../js/composer/example.js';

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'];

async function openComposer(page, { locale } = {}) {
  await page.addInitScript(l => {
    try {
      window.localStorage.setItem('gravitas_welcome_seen_v1', '1');
      if (l) window.localStorage.setItem('gravitas_locale', l);
    } catch {
      /* storage unavailable */
    }
  }, locale ?? null);
  await page.goto('/studio/lesson/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('body')).toHaveAttribute('data-ready', 'true', {
    timeout: 30_000,
  });
  await valid(page);
}

/** The checks have run on the edit just made and found nothing. */
const valid = page =>
  expect(page.locator('#cp-checks-summary')).toHaveText(
    /^(The investigation is valid\.|La investigación es válida\.)$/,
    { timeout: 20_000 }
  );

async function enter(page, id, value) {
  const input = page.locator(`#${id}`);
  await input.fill(String(value));
  await input.press('Tab');
}

/** The step cards. */
const steps = page =>
  page.locator('section[aria-labelledby="cp-steps-h"] > details');

const current = async page =>
  JSON.parse(await page.locator('#st-raw-text').inputValue());

const openFile = (page, name, data) =>
  page.locator('#cp-file').setInputFiles({
    name,
    mimeType: 'application/json',
    buffer: Buffer.from(
      typeof data === 'string' ? data : JSON.stringify(data, null, 2)
    ),
  });

test.describe('the Investigation Composer', () => {
  test('opens the example valid, with its estimate, answer key and translation', async ({
    page,
  }) => {
    await openComposer(page);
    await expect(page.locator('#cp-status')).toContainText(
      'The example investigation'
    );
    await expect(steps(page)).toHaveCount(EXAMPLE_INVESTIGATION.steps.length);
    // Cards open on demand: a closed one builds only its summary.
    await expect(page.locator('#cp-steps-0 input')).toHaveCount(0);
    await page.locator('#cp-steps-open').click();
    await expect(page.locator('#cp-steps-0-sid')).toHaveValue('look');
    await page.locator('#cp-steps-close').click();
    await expect(page.locator('#cp-steps-0-sid')).toHaveCount(0);
    await expect(page.locator('#cp-estimate li').first()).toContainText(
      /^About \d+ minutes of work, with \d+ words to read\.$/
    );
    await expect(page.locator('#cp-estimate')).toContainText(
      '3 graded, worth 5 points in all.'
    );
    await expect(page.locator('#cp-key tbody tr')).toHaveCount(4);
    await expect(page.locator('#cp-key')).toContainText('2 ± 0.1 yr');
    await expect(page.locator('#cp-translation-summary')).toHaveText(
      'Every text is in both languages and up to date.'
    );
    await expect(page.locator('#cp-save')).toBeEnabled();
  });

  test('a bad value is explained on its field and blocks saving, and undo takes it back', async ({
    page,
  }) => {
    await openComposer(page);
    await enter(page, 'cp-duration', 'soon');
    const duration = page.locator('#cp-duration');
    await expect(duration).toHaveAttribute('aria-invalid', 'true');
    await expect(page.locator('#cp-duration-error')).toHaveText(
      'A range such as 20-25 min.'
    );
    await expect(duration).toHaveAttribute(
      'aria-describedby',
      /cp-duration-error/
    );
    await expect(page.locator('#cp-checks')).toContainText(
      'Duration: A range such as 20-25 min.'
    );
    await expect(page.locator('#cp-save')).toBeDisabled();
    await page.locator('#cp-undo').click();
    await valid(page);
    await expect(duration).toHaveValue('15-20 min');
    await expect(duration).not.toHaveAttribute('aria-invalid', 'true');
  });

  test('editing the English marks its Spanish out of date, and rewriting the Spanish clears it', async ({
    page,
  }) => {
    await openComposer(page);
    await enter(page, 'cp-title-en', 'Reading an orbit, again');
    await expect(page.locator('#cp-title .st-state')).toHaveText(
      'Spanish out of date'
    );
    await expect(page.locator('#cp-translation-summary')).toContainText(
      '1 out of date'
    );
    await expect(page.locator('#cp-translation li')).toHaveCount(1);
    await enter(page, 'cp-title-es', 'Leer una órbita, otra vez');
    await expect(page.locator('#cp-title .st-state')).toHaveText('Translated');
    await expect(page.locator('#cp-translation-summary')).toHaveText(
      'Every text is in both languages and up to date.'
    );
  });

  test('steps are added and removed, and a renamed step id carries its references', async ({
    page,
  }) => {
    await openComposer(page);
    const n = EXAMPLE_INVESTIGATION.steps.length;
    await page.locator('#cp-add-type').selectOption('explore');
    await page.locator('#cp-add-step').click();
    await expect(steps(page)).toHaveCount(n + 1);
    // Added before the closing step, which stays last.
    const added = (await current(page)).steps.at(-2);
    expect(added.type).toBe('explore');
    await expect(page.locator('#cp-checks')).toContainText('Title (English)');
    await page
      .locator(`#cp-steps-${n - 1} button`)
      .filter({ hasText: `Remove step ${n}` })
      .click();
    await expect(steps(page)).toHaveCount(n);
    await valid(page);

    // The bank question is named by the remediation step and by the held
    // prediction that is marked there.
    const at = EXAMPLE_INVESTIGATION.steps.findIndex(s => s.sid === 'period');
    await page.locator(`#cp-steps-${at} > summary`).click();
    await enter(page, `cp-steps-${at}-sid`, 'the-period');
    const doc = await current(page);
    expect(doc.steps.find(s => s.sid === 'guess').reveal).toBe('the-period');
    expect(doc.steps.find(s => s.sid === 'again').when.sid).toBe('the-period');
    await valid(page);
  });

  test('the preview is the lesson engine: a wrong answer shows the remediation, a right one passes it', async ({
    page,
  }) => {
    await openComposer(page);
    await page.locator('#cp-preview-go').click();
    await expect(page.locator('#cp-preview')).toHaveAttribute(
      'src',
      /\/\?author=draft-reading-an-orbit&view=student$/
    );
    // Straight to the bank question, and answer it.
    const at = EXAMPLE_INVESTIGATION.steps.findIndex(s => s.sid === 'period');
    await page.evaluate(n => {
      const f = document.getElementById('cp-preview');
      f.src = `${f.src}&step=${n}`;
    }, at + 1);
    const heading = () =>
      page.evaluate(
        () =>
          document
            .getElementById('cp-preview')
            .contentWindow?.document?.getElementById('investigationBody')
            ?.querySelector('h3')?.textContent ?? null
      );
    await expect.poll(heading, { timeout: 30_000 }).toBe('Another star');
    const answer = value =>
      page.evaluate(v => {
        const w = document.getElementById('cp-preview').contentWindow;
        const body = w.document.getElementById('investigationBody');
        const input = body.querySelector('.inv-answer-num');
        input.value = v;
        input.dispatchEvent(new w.Event('input', { bubbles: true }));
        [...body.querySelectorAll('button')]
          .find(b => b.textContent.trim() === 'Check')
          .click();
      }, value);
    const press = id =>
      page.evaluate(
        i =>
          document
            .getElementById('cp-preview')
            .contentWindow.document.getElementById(i)
            .click(),
        id
      );
    await answer('5');
    await press('investigationNext');
    await expect.poll(heading).toBe('Cube, then root');
    await press('investigationPrev');
    await expect.poll(heading).toBe('Another star');
    await answer('2');
    await press('investigationNext');
    await expect.poll(heading).toBe('Which is slower?');
    // Nothing of the preview reached the student's saved progress.
    const saved = await page.evaluate(() =>
      Object.keys(localStorage).filter(
        k =>
          k.includes('draft-reading-an-orbit') &&
          !k.startsWith('gravitas_composer')
      )
    );
    expect(saved).toEqual([]);
  });

  test('a sample lab report is a PDF made from the answer key', async ({
    page,
  }) => {
    await openComposer(page);
    await page.locator('#cp-report-go').click();
    await expect(page.locator('#cp-status')).toHaveText(
      'The sample report is ready.'
    );
    const link = page.locator('#cp-report-open');
    await expect(link).toBeVisible();
    const head = await link.evaluate(async a =>
      new window.TextDecoder().decode(
        (await (await window.fetch(a.href)).arrayBuffer()).slice(0, 5)
      )
    );
    expect(head).toBe('%PDF-');
  });

  test('saves the file on screen, opens it again unchanged, merges a bank, and exports the lesson', async ({
    page,
  }) => {
    await openComposer(page);
    const [saved] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('#cp-save').click(),
    ]);
    expect(saved.suggestedFilename()).toBe(
      'reading-an-orbit.investigation.json'
    );
    const text = readFileSync(await saved.path(), 'utf8');
    expect(text).toBe(await page.locator('#st-raw-text').inputValue());
    await openFile(page, 'reading-an-orbit.investigation.json', text);
    await expect(page.locator('#cp-conflict')).toBeHidden();
    await expect(page.locator('#cp-status')).toHaveText(
      'Opened reading-an-orbit.'
    );

    const [bankFile] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('#cp-save-bank').click(),
    ]);
    const bank = JSON.parse(readFileSync(await bankFile.path(), 'utf8'));
    expect(bank.format).toBe('gravitas.question-bank');
    expect(bank.items.map(i => i.id)).toEqual(['kepler-period']);

    // A new investigation takes the bank's questions; the same bank again
    // adds nothing; a changed question with the same id is refused.
    await page.locator('#cp-new').click();
    await openFile(page, 'bank.json', bank);
    await expect(page.locator('#cp-status')).toHaveText(
      'Added 1 question(s) to the bank.'
    );
    await openFile(page, 'bank.json', bank);
    await expect(page.locator('#cp-status')).toHaveText(
      'Added 0 question(s) to the bank.'
    );
    bank.items[0].version = 2;
    await openFile(page, 'bank.json', bank);
    await expect(page.locator('#cp-status')).toContainText(
      'The bank already has kepler-period with different contents'
    );

    await openFile(page, 'reading-an-orbit.investigation.json', text);
    await valid(page);
    // One file a click: two downloads from one click is a permission prompt.
    const [en] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('#cp-export').click(),
    ]);
    expect(en.suggestedFilename()).toBe('reading-an-orbit.js');
    const module = readFileSync(await en.path(), 'utf8');
    expect(module).toMatch(/^export default \{/m);
    expect(module).toContain('"when": {');
    const [es] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('#cp-export-es').click(),
    ]);
    expect(es.suggestedFilename()).toBe('reading-an-orbit.es.js');
    expect(readFileSync(await es.path(), 'utf8')).toContain('Leer una órbita');
  });

  test('a file with the id of a different draft asks first', async ({
    page,
  }) => {
    await openComposer(page);
    await enter(page, 'cp-seed', 7);
    const mine = await current(page);
    await openFile(page, 'x.investigation.json', { ...mine, seed: 8 });
    await expect(page.locator('#cp-conflict')).toBeVisible();
    await expect(page.locator('#cp-conflict-cancel')).toBeFocused();
    await expect(page.locator('#cp-conflict-diff li')).toHaveText([
      'seed changed',
    ]);
    await page.locator('#cp-conflict-both').click();
    await expect(page.locator('#cp-id')).toHaveValue('reading-an-orbit-2');
  });

  test('the raw view refuses what does not parse and changes nothing', async ({
    page,
  }) => {
    await openComposer(page);
    const before = await current(page);
    await page.locator('#cp-raw summary').click();
    await page.locator('#st-raw-text').fill('{"format":');
    await page.locator('#cp-raw-apply').click();
    await expect(page.locator('#cp-raw-error')).toContainText(
      'That is not valid JSON'
    );
    await page
      .locator('#st-raw-text')
      .fill('{"format": "gravitas.scenario-pack", "formatVersion": 1}');
    await page.locator('#cp-raw-apply').click();
    await expect(page.locator('#cp-raw-error')).toHaveText(
      'That file is neither a Gravitas investigation nor a question bank.'
    );
    await page.locator('#cp-raw-revert').click();
    expect(await current(page)).toEqual(before);
  });

  test('reads in Spanish', async ({ page }) => {
    await openComposer(page);
    await page.locator('#langSwitch button[lang="es"]').click();
    await expect(page.locator('h1')).toHaveText(
      'Compositor de investigaciones'
    );
    await expect(page.locator('html')).toHaveAttribute('lang', 'es');
    await valid(page);
    await enter(page, 'cp-duration', 'pronto');
    await expect(page.locator('#cp-duration-error')).toHaveText(
      'Un intervalo como 20-25 min.'
    );
    await expect(page.locator('#cp-steps-0 > summary')).toContainText(
      '1. Leer: Ocho planetas, una regla'
    );
  });

  for (const locale of ['en', 'es']) {
    test(`has no accessibility violations in ${locale}, with a problem showing`, async ({
      page,
    }) => {
      await openComposer(page, { locale });
      const scan = async () => {
        const r = await new AxeBuilder({ page }).withTags(TAGS).analyze();
        expect(r.violations.map(v => `${v.id}: ${v.help}`)).toEqual([]);
      };
      await scan();
      await enter(page, 'cp-duration', 'x');
      await expect(page.locator('#cp-duration')).toHaveAttribute(
        'aria-invalid',
        'true'
      );
      await scan();
    });
  }

  test('fits a phone: nothing scrolls sideways', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await openComposer(page);
    const overflow = await page.evaluate(() => ({
      page: document.scrollingElement.scrollWidth - window.innerWidth,
      off: [...document.querySelectorAll('button, input, select, textarea')]
        .filter(el => el.offsetParent !== null && el.type !== 'file')
        .filter(el => {
          const r = el.getBoundingClientRect();
          return r.left < 0 || r.right > window.innerWidth + 0.5;
        })
        .map(el => el.id || el.textContent.trim()),
    }));
    expect(overflow).toEqual({ page: 0, off: [] });
  });
});
