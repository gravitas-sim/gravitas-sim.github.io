// =============================================================================
// How a lesson opens and how it ends (js/lesson/opening.js, js/investigations/ending.js)
// -----------------------------------------------------------------------------
// The first screen of each pilot states its question and what the student will
// do, with the medium named, and nothing has to be scrolled to read them, at
// 1366×800 and 375×812, in English and Spanish. The finish dialog returns to
// the question with the student's own answers and readings, above the name
// field: a seeded run shows them, how each reading was taken, and never a key;
// an empty run shows none. Counts stay below, and the dialog passes axe.
// =============================================================================

/* global innerHeight, NodeFilter */
import AxeBuilder from '@axe-core/playwright';
import { test, expect } from './fixtures.js';
import { openLessonStep } from '../tools/visual-criteria.mjs';

const PILOTS = [
  ['keplers-laws', 'eight-minutes-of-arc'],
  ['transit-photometry', 'a-firefly-beside-a-lighthouse'],
  ['measuring-the-moon', 'a-picture-of-the-moon'],
  ['ios-fire', 'a-moon-that-melts'],
  ['tides-that-move-the-moon', 'the-bulge-ahead'],
  ['weighing-stars', 'you-cannot-put-a-star'],
];
const SIZES = [
  [1366, 800],
  [375, 812],
];

/** Where the second sentence of the first step ends, against the bottom of what can be seen without scrolling. */
const opening = () => {
  const body = document.getElementById('investigationBody');
  const text = body.querySelector('.inv-step-body');
  const seen = Math.min(body.getBoundingClientRect().bottom, innerHeight);
  const walker = document.createTreeWalker(text, NodeFilter.SHOW_TEXT);
  let node;
  let count = 0;
  while ((node = walker.nextNode())) {
    const re = /[.?!](?=\s|$)/g;
    let m;
    while ((m = re.exec(node.data))) {
      if (++count < 2) continue;
      const r = document.createRange();
      r.setStart(node, m.index);
      r.setEnd(node, m.index + 1);
      return {
        end: Math.round(r.getBoundingClientRect().bottom),
        seen: Math.round(seen),
        scrollTop: body.scrollTop,
        first: text.textContent.trim().split(/(?<=[.?!])\s/)[0],
      };
    }
  }
  return null;
};

for (const [width, height] of SIZES)
  for (const language of ['en', 'es'])
    for (const [lesson, sid] of PILOTS)
      test(`opening: ${lesson}, ${width}×${height}, ${language}`, async ({
        page,
      }) => {
        await page.setViewportSize({ width, height });
        await openLessonStep(page, { lesson, sid, language });
        // The object list and the probes arrive after the step's text and
        // shrink the panel: measure only once its bottom has held still.
        await page.waitForFunction(
          () => {
            const b = document
              .getElementById('investigationBody')
              .getBoundingClientRect().bottom;
            const s = (window.__settle ??= { b: NaN, n: 0 });
            s.n = b === s.b ? s.n + 1 : 0;
            s.b = b;
            return s.n >= 4;
          },
          null,
          { polling: 300, timeout: 15_000 }
        );
        const m = await page.evaluate(opening);
        const question = await page.evaluate(
          async ([id, lang]) => {
            const data = await import('/js/data/investigations.js');
            const { mergeTranslation } =
              await import('/js/data/investigations/i18n.js');
            const en = data.getInvestigation(id);
            if (lang === 'en') return en.question;
            const es = await import(`/js/data/investigations/es/${id}.js`);
            return mergeTranslation(en, es.default).question;
          },
          [lesson, language]
        );
        expect(m, 'the step has two sentences').not.toBeNull();
        expect(m.first, 'the first sentence is the question').toBe(question);
        expect(m.scrollTop).toBe(0);
        expect(
          m.end,
          `the action sentence ends at ${m.end} px, the first screen at ${m.seen}`
        ).toBeLessThanOrEqual(m.seen);
      });

// --- The ending ---------------------------------------------------------------

const KEPLER = 'keplers-laws';
const SEEDED = {
  [`${KEPLER}:where-is-the-star`]: 0,
  [`${KEPLER}:find-the-foci:f_peri`]: '0.51',
  [`${KEPLER}:find-the-foci:f_peri:src`]: JSON.stringify({
    k: 'c',
    l: 'closest approach',
  }),
  [`${KEPLER}:find-the-foci:f_sep`]: '1.9',
  [`${KEPLER}:find-the-foci:f_sep:src`]: JSON.stringify({ k: 't' }),
  [`${KEPLER}:what-sits-at-the-other`]: 2,
  [`${KEPLER}:estimate-the-year`]: '2;3',
  [`${KEPLER}:why-the-speed-changes`]: 'It speeds up near the star.',
};

/** Open the last step as a student with this record, and press Next to finish. */
async function finish(page, { language = 'en', responses = {} }) {
  const last = await page.evaluate(async id => {
    const data = await import('/js/data/investigations.js');
    return data.getInvestigation(id).steps.map(s => s.sid);
  }, KEPLER);
  await page.evaluate(
    ([id, lang, r, sids]) => {
      localStorage.setItem('gravitas_welcome_seen_v1', '1');
      localStorage.setItem('gravitas_locale', lang);
      localStorage.setItem(
        `gravitas_investigation_${id}`,
        JSON.stringify({
          schema: 2,
          lesson: id,
          stepSid: sids.at(-1),
          responses: r,
          attempts: {},
          visited: sids,
          startedAt: 1700000000000,
        })
      );
    },
    [KEPLER, language, responses, last]
  );
  await page.goto(`/#investigation=${KEPLER}`, { waitUntil: 'load' });
  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction(() => window.splashScreenEnded === true);
  await expect(page.locator('#investigationPanel')).toBeVisible();
  await page.locator('#investigationNext').click();
  await expect(page.locator('#investigationFinishContent')).toBeVisible();
}

for (const [width, height] of SIZES)
  for (const language of ['en', 'es'])
    test.describe(`ending: ${width}×${height}, ${language}`, () => {
      test.beforeEach(async ({ page, app }) => {
        await page.setViewportSize({ width, height });
        await app.boot();
      });

      test('a seeded run shows the question and the student’s own work, never a key', async ({
        page,
      }) => {
        await finish(page, { language, responses: SEEDED });
        const box = page.locator('#investigationEnding');
        await expect(box).toBeVisible();
        await expect(page.locator('#investigationEndingQuestion')).toHaveText(
          language === 'es' ? /^¿Qué trayectoria/ : /^What path does a planet/
        );
        const rows = await page
          .locator('#investigationEndingList li')
          .allTextContents();
        const text = rows.join('\n');
        expect(rows.length, text).toBe(5);
        expect(text).toContain(
          language === 'es' ? 'Predijiste:' : 'You predicted:'
        );
        expect(text).toContain('2–3');
        expect(text).toContain('0.51 AU');
        expect(text).toContain('1.9 AU');
        expect(text).toContain('It speeds up near the star.');
        expect(text).toMatch(
          language === 'es'
            ? /Tomad[ao] de closest approach/
            : /Taken from closest approach/
        );
        // The prediction's key, the fields' expected values and a
        // multiple-choice check are not the student's evidence.
        const keys = await page.evaluate(
          async ([id, lang]) => {
            const data = await import('/js/data/investigations.js');
            const { mergeTranslation } =
              await import('/js/data/investigations/i18n.js');
            let l = data.getInvestigation(id);
            if (lang === 'es')
              l = mergeTranslation(
                l,
                (await import(`/js/data/investigations/es/${id}.js`)).default
              );
            const at = sid => l.steps.find(s => s.sid === sid);
            const key = s => s.options[s.answer].replace(/<[^>]*>/g, '');
            return [
              key(at('where-is-the-star')),
              key(at('what-sits-at-the-other')),
            ];
          },
          [KEPLER, language]
        );
        for (const k of keys) expect(text).not.toContain(k);
        expect(text).not.toMatch(/\b1\.86\b|\b2\.36\b/);
        // Above the name field, with the counts below it.
        const order = await page.evaluate(() =>
          [
            'investigationEnding',
            'investigationFinishSummary',
            'investigationName',
          ].map(id => document.getElementById(id).getBoundingClientRect().top)
        );
        expect(order[0]).toBeLessThan(order[1]);
        expect(order[1]).toBeLessThan(order[2]);
        await expect(page.locator('#investigationName')).toBeFocused();
        const list = await page
          .locator('#investigationEndingList')
          .evaluate(el => el.getBoundingClientRect().height);
        expect(list).toBeLessThanOrEqual(height * 0.4 + 1);
        const axe = await new AxeBuilder({ page })
          .include('#investigationFinishContent')
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
          .analyze();
        expect(axe.violations.map(v => `${v.id}: ${v.help}`)).toEqual([]);
      });

      test('an empty run shows the question and no answers', async ({
        page,
      }) => {
        await finish(page, { language });
        await expect(page.locator('#investigationEnding')).toBeVisible();
        await expect(page.locator('#investigationEndingList')).toBeHidden();
        await expect(page.locator('#investigationEndingNone')).toBeVisible();
        await expect(page.locator('#investigationFinishSummary')).toContainText(
          /0/
        );
      });
    });
