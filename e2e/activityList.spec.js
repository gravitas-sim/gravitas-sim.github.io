// =============================================================================
// The printable activity list, the editorial time bands and the outcome matrix
// (Prompt 174)
// -----------------------------------------------------------------------------
// The button on the course builder and the panel it opens, the page and the
// Markdown it saves, the print path (the list alone on the page when printing,
// back to normal after), the outcomes an instructor writes and the matrix they
// make, the same list from the distribution kit, and the adoption pages that
// carry the same bands. In both languages.
//
// What this does not do, and says plainly: it measures no class. Every time on
// every page is an editorial band, and this spec holds the label that says so
// (js/data/instructorTimeBands.js STATEMENT) to every page that shows one.
// =============================================================================

import { Buffer } from 'node:buffer';
import { readFileSync } from 'node:fs';
import { test, expect } from './fixtures.js';
import { STATEMENT } from '../js/data/instructorTimeBands.js';
import { WORDS } from '../js/instructorPlanText.js';
import { INTRO_ASTRONOMY } from '../js/data/courses/intro-astronomy.js';

const quiet = (page, locale, theme) =>
  page.addInitScript(
    ([l, t]) => {
      localStorage.setItem('gravitas_orientation_seen_v1', '1');
      localStorage.setItem('gravitas_welcome_seen_v1', '1');
      localStorage.setItem('gravitas_locale', l);
      if (t) localStorage.setItem('gravitas_theme', t);
      // A print dialog is not available to a script: count the calls.
      window.__prints = 0;
      window.print = () => {
        window.__prints += 1;
      };
    },
    [locale, theme]
  );

/** Press a control and read the text file it downloads: its name and its text. */
async function take(page, trigger) {
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.locator(trigger).click(),
  ]);
  return {
    name: download.suggestedFilename(),
    text: readFileSync(await download.path(), 'utf8'),
  };
}

/** The builder with the example course loaded and checked. */
async function builder(page, locale) {
  await quiet(page, locale);
  await page.goto('/studio/course/');
  await page.locator('#cb-example').click();
  await page.waitForSelector('body[data-checked]', { timeout: 60_000 });
}

const W = (locale, id, vars = {}) =>
  WORDS[locale][id].replace(/\{(\w+)\}/g, (m, k) => String(vars[k] ?? m));

const TITLE = { en: 'Introductory astronomy', es: 'Astronomía introductoria' };

for (const locale of ['en', 'es']) {
  test(`${locale}: the builder makes the list, labelled, and saves it as a page and as Markdown`, async ({
    page,
  }) => {
    test.setTimeout(180_000);
    await builder(page, locale);
    await page.locator('#cb-plan').click();
    const panel = page.locator('#cb-plan-panel');
    await expect(panel.locator('#plan-h')).toHaveText(W(locale, 'p.h'));
    await expect(panel.locator('#plan-statement')).toContainText(
      STATEMENT[locale]
    );
    // The preview is the list, in the page's language, with the label inside it.
    const preview = panel.locator('#plan-preview');
    await expect(preview.locator('article')).toBeVisible({ timeout: 60_000 });
    await expect(preview.locator('#plan-time-note')).toContainText(
      STATEMENT[locale]
    );
    await expect(preview).toContainText(TITLE[locale]);
    await expect(preview.locator('table').first()).toBeVisible();
    // The textbook chapter comes from the Library; the objectives are the investigation's own.
    await expect(preview).toContainText('OpenStax Astronomy 2e');

    const md = await take(page, '#plan-md');
    expect(md.name).toBe(`intro-astronomy.activity-list.${locale}.md`);
    expect(md.text).toContain(STATEMENT[locale]);
    expect(md.text).toContain(TITLE[locale]);
    expect(md.text).toContain('#investigation=');
    expect(md.text).toContain(W(locale, 'doc.handin'));
    expect(md.text).toContain(W(locale, 'doc.out.none'));
    // No time anywhere that is not a band.
    expect(md.text).not.toMatch(/median|mediana/i);

    const html = await take(page, '#plan-html');
    expect(html.name).toBe(`intro-astronomy.activity-list.${locale}.html`);
    expect(html.text).toMatch(/^<!doctype html>/);
    expect(html.text).toContain(`<html lang="${locale}">`);
    expect(html.text).toContain(STATEMENT[locale]);
    expect(html.text).toContain('@media print');
    expect(html.text).not.toMatch(/<script/i);

    await page.locator('#plan-copy').click();
    await expect(panel.locator('#plan-status')).toContainText(/Markdown/, {
      timeout: 15_000,
    });
  });
}

test('printing puts the list alone on the page, and puts the page back', async ({
  page,
}) => {
  test.setTimeout(180_000);
  await builder(page, 'en');
  await page.locator('#cb-plan').click();
  await expect(page.locator('#plan-preview article')).toBeVisible({
    timeout: 60_000,
  });
  await page.locator('#plan-print').click();
  await expect(page.locator('#plan-print-root')).toHaveCount(1);
  expect(await page.evaluate(() => window.__prints)).toBe(1);
  expect(await page.locator('#plan-print-root .plan').count()).toBe(1);

  // Under print media nothing else of the page is shown, and the list is.
  await page.emulateMedia({ media: 'print' });
  const shown = await page.evaluate(() => {
    const visible = [...document.body.children].filter(
      el =>
        el.id !== 'plan-print-root' &&
        !['SCRIPT', 'STYLE', 'TEMPLATE'].includes(el.tagName) &&
        getComputedStyle(el).display !== 'none'
    );
    const root = document.getElementById('plan-print-root');
    return {
      others: visible.map(el => el.tagName + (el.id ? `#${el.id}` : '')),
      root: getComputedStyle(root).display,
      link: getComputedStyle(root.querySelector('a')).color,
      text: root.innerText.includes('Editorial estimate'),
    };
  });
  expect(shown.others).toEqual([]);
  expect(shown.root).toBe('block');
  expect(shown.link).toBe('rgb(0, 0, 0)');
  expect(shown.text).toBe(true);

  // On screen the root is never seen.
  await page.emulateMedia({ media: 'screen' });
  expect(
    await page.evaluate(
      () => getComputedStyle(document.getElementById('plan-print-root')).display
    )
  ).toBe('none');

  // When printing ends, both come off.
  await page.evaluate(() => window.dispatchEvent(new Event('afterprint')));
  await expect(page.locator('#plan-print-root')).toHaveCount(0);
  await expect(page.locator('#plan-print-style')).toHaveCount(0);
});

for (const locale of ['en', 'es']) {
  test(`${locale}: the outcomes an instructor writes become the matrix, and say what it is not`, async ({
    page,
  }) => {
    test.setTimeout(180_000);
    await builder(page, locale);
    await page.locator('#cb-plan').click();
    const panel = page.locator('#cb-plan-panel');
    await expect(panel.locator('#plan-out-add')).toBeVisible();
    await panel.locator('#plan-out-add').click();
    // An outcome with no words is a problem the builder lists: no list yet.
    await expect(panel.locator('#plan-out-0-en')).toBeFocused({
      timeout: 15_000,
    });
    await expect(panel.locator('#plan-fix')).toBeVisible();
    await panel
      .locator('#plan-out-0-en')
      .fill('Reason quantitatively about the sky');
    await panel
      .locator('#plan-out-0-es')
      .fill('Razonar cuantitativamente sobre el cielo');
    await panel.locator('#plan-out-0-es').blur();
    await panel.locator('#plan-out-0-map label').first().click();
    await expect(panel.locator('#plan-preview article')).toBeVisible({
      timeout: 60_000,
    });
    const raw = await page.locator('#st-raw-text').inputValue();
    const pack = JSON.parse(raw);
    expect(pack.outcomes).toHaveLength(1);
    expect(pack.outcomes[0].text.en).toBe(
      'Reason quantitatively about the sky'
    );
    expect(pack.outcomes[0].text.esOf).toMatch(/^[0-9a-f]{8}$/);
    expect(pack.objectives[0].outcomes).toEqual([pack.outcomes[0].id]);

    const preview = panel.locator('#plan-preview');
    await expect(preview).toContainText(W(locale, 'doc.out.lede'));
    // The matrix: a column for the outcome and a cell that says it is served.
    const matrix = preview.locator('table').last();
    await expect(matrix.locator('thead th')).toHaveCount(2);
    await expect(
      matrix
        .locator('td .plan-sr', { hasText: W(locale, 'doc.out.yes') })
        .first()
    ).toBeAttached();
    const md = await take(page, '#plan-md');
    expect(md.text).toContain(W(locale, 'doc.out.lede'));
    expect(md.text).toMatch(/\| x \|/);
    expect(md.text).toContain(
      locale === 'en'
        ? 'Reason quantitatively about the sky'
        : 'Razonar cuantitativamente sobre el cielo'
    );

    // Removing it takes it out of the course and the mapping with it.
    await panel.locator('#plan-out-0-remove').click();
    await expect(panel.locator('#plan-outcomes > fieldset')).toHaveCount(0, {
      timeout: 15_000,
    });
    const after = JSON.parse(await page.locator('#st-raw-text').inputValue());
    expect(after.outcomes).toBeUndefined();
    expect(after.objectives[0].outcomes).toBeUndefined();
  });
}

test('a course with problems makes no list, and says to fix them', async ({
  page,
}) => {
  await quiet(page, 'en');
  await page.goto('/studio/course/');
  await page.locator('#cb-new').click();
  await page.waitForSelector('body[data-checked]', { timeout: 60_000 });
  await page.locator('#cb-plan').click();
  await expect(page.locator('#plan-fix')).toBeVisible({ timeout: 60_000 });
  await expect(page.locator('#plan-print')).toBeDisabled();
});

const OUTCOME_COURSE = (() => {
  const course = JSON.parse(JSON.stringify(INTRO_ASTRONOMY));
  course.outcomes = [
    {
      id: 'orbits',
      text: { en: 'Explain how orbits work' },
    },
    { id: 'never', text: { en: 'Outcome nothing serves' } },
  ];
  course.objectives[0].outcomes = ['orbits'];
  return course;
})();

for (const locale of ['en', 'es']) {
  test(`${locale}: the kit makes the list from the course file, matrix included`, async ({
    page,
  }) => {
    test.setTimeout(180_000);
    await quiet(page, locale);
    await page.goto('/teaching/kit/');
    await page.locator('#kitFile').setInputFiles({
      name: 'intro-astronomy.course.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(OUTCOME_COURSE)),
    });
    await expect(page.locator('#kitPlanSection')).toBeVisible({
      timeout: 60_000,
    });
    await page.locator('#kitPlanOpen').click();
    const panel = page.locator('#kitPlan');
    await expect(panel.locator('#plan-h')).toHaveText(W(locale, 'p.h'));
    // The kit holds a package it cannot edit.
    await expect(panel.locator('#plan-outcomes')).toHaveCount(0);
    await expect(panel.locator('#plan-preview article')).toBeVisible({
      timeout: 60_000,
    });
    await expect(panel.locator('#plan-preview')).toContainText(
      'Explain how orbits work'
    );
    const md = await take(page, '#plan-md');
    expect(md.name).toBe(`intro-astronomy.activity-list.${locale}.md`);
    expect(md.text).toContain(STATEMENT[locale]);
    // The second outcome has no item: the list says so.
    expect(md.text).toContain('Outcome nothing serves');
    expect(md.text).toContain(
      W(locale, 'doc.out.unserved', { names: 'Outcome nothing serves' })
    );
  });
}

test('the kit offers it for a course and not for an activity', async ({
  page,
}) => {
  await quiet(page, 'en');
  await page.goto('/teaching/kit/');
  await expect(page.locator('#kitPlanSection')).toBeHidden();
});

test('every adoption page that shows a time says it is an editorial estimate, in both languages', async ({
  page,
}) => {
  const urls = [
    '/teaching/investigation/keplers-laws/',
    '/teaching/investigation/the-turning-sky/',
    '/teaching/activity/orbital-speed/',
    '/teaching/find/',
    '/teaching/alignment/',
  ];
  for (const locale of ['en', 'es'])
    for (const url of urls) {
      await quiet(page, locale);
      await page.goto(url);
      const note = page.locator('.gs-' + locale, {
        hasText: STATEMENT[locale],
      });
      await expect(note.first()).toBeVisible();
    }
  // The objectives are listed so the mapping can be made before a course is built.
  await quiet(page, 'en');
  await page.goto('/teaching/investigation/keplers-laws/');
  await expect(page.locator('#objectives-h')).toBeVisible();
  await expect(
    page.locator('section[aria-labelledby="objectives-h"] li').first()
  ).toBeVisible();
  await expect(
    page.locator('section[aria-labelledby="objectives-h"] .doc-note .gs-en')
  ).toContainText('course objectives');
});

test('the alignment page says OpenStax is the only textbook, and why', async ({
  page,
}) => {
  await quiet(page, 'en');
  await page.goto('/teaching/alignment/');
  await expect(
    page.locator('.gs-en', { hasText: 'the only textbook aligned here' })
  ).toBeVisible();
});

const SIZES = [
  { name: 1280, width: 1280, height: 900 },
  { name: 390, width: 390, height: 844 },
];

/** Every control in the panel and every link in it is at least 24 px and inside the viewport. */
async function smallOrOutside(page, root) {
  return page.evaluate(selector => {
    const bad = [];
    const vw = document.documentElement.clientWidth;
    for (const host of document.querySelectorAll(selector))
      for (const el of host.querySelectorAll(
        'a[href], button, input, select, textarea, summary'
      )) {
        if (el.closest('#plan-preview')) continue; // the printed list, not controls
        const box = el.type === 'checkbox' ? (el.closest('label') ?? el) : el;
        const r = box.getBoundingClientRect();
        if (!r.width && !r.height) continue;
        const label = (el.id || el.textContent || el.tagName)
          .trim()
          .slice(0, 40);
        if (r.width < 24 || r.height < 24)
          bad.push(`${label}: ${Math.round(r.width)}x${Math.round(r.height)}`);
        if (r.left < -0.5 || r.right > vw + 0.5)
          bad.push(
            `${label}: outside the viewport (${Math.round(r.left)}..${Math.round(r.right)} of ${vw})`
          );
      }
    if (document.documentElement.scrollWidth > vw + 1)
      bad.push(
        `sideways scroll: ${document.documentElement.scrollWidth} > ${vw}`
      );
    return bad;
  }, root);
}

for (const size of SIZES)
  for (const locale of ['en', 'es'])
    for (const theme of ['midnight', 'daylight'])
      test(`the new controls fit at ${size.name} px, ${locale}, ${theme}`, async ({
        page,
      }) => {
        test.setTimeout(180_000);
        await page.setViewportSize({ width: size.width, height: size.height });
        await quiet(page, locale, theme);
        await page.goto('/studio/course/');
        // Under 768 px the builder is read-only (PLATFORM_MODEL.md): its
        // editing toolbar, this button included, steps out and the page says
        // so, so the builder's panel is judged at 1280 and the kit at both.
        if (size.width >= 768) {
          await page.locator('#cb-example').click();
          await page.waitForSelector('body[data-checked]', {
            timeout: 60_000,
          });
          expect(await smallOrOutside(page, '#cb-plan')).toEqual([]);
          await page.locator('#cb-plan').click();
          await expect(page.locator('#plan-print')).toBeEnabled({
            timeout: 60_000,
          });
          await page.locator('#plan-out-add').click();
          await expect(page.locator('#plan-out-0-en')).toBeVisible();
          expect(await smallOrOutside(page, '#cb-plan-panel')).toEqual([]);
        } else await expect(page.locator('#cb-plan')).toBeHidden();

        await page.goto('/teaching/kit/');
        await page.locator('#kitFile').setInputFiles({
          name: 'intro-astronomy.course.json',
          mimeType: 'application/json',
          buffer: Buffer.from(JSON.stringify(INTRO_ASTRONOMY)),
        });
        await expect(page.locator('#kitPlanOpen')).toBeVisible({
          timeout: 60_000,
        });
        await page.locator('#kitPlanOpen').click();
        await expect(page.locator('#kitPlan #plan-print')).toBeEnabled({
          timeout: 60_000,
        });
        expect(await smallOrOutside(page, '#kitPlanSection')).toEqual([]);
      });
