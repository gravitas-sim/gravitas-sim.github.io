// =============================================================================
// Accessibility: axe-core over every surface
// -----------------------------------------------------------------------------
// WCAG 2.2 AA, checked automatically where a machine can check it.
//
// What this can and cannot do
// -----------------------------------------------------------------------------
// axe finds a real and useful class of defect - a control with no accessible
// name, a contrast pair below 4.5:1, a broken heading order, a landmark that
// is missing or duplicated - and it finds it on every surface, in both
// languages, in both themes, on every run. That is worth having.
//
// It cannot tell whether the focus order makes sense, whether Escape does what
// a reader expects, whether a live region is announcing something useful or
// announcing it forty times a second, or whether the textual summary of the
// simulation actually describes the simulation. Those are checked by hand and
// by the assertions in e2e/accessibilityManual.spec.js, and the honest limits
// of both are written down in ACCESSIBILITY.md.
//
// The rule that governs the whole pass: nothing here is made to pass by hiding
// a control from assistive technology. aria-hidden on something a sighted
// reader can use is a worse defect than the one it silences.
//
// Both languages and both themes
// -----------------------------------------------------------------------------
// Language, because a translated string can be longer than its English
// original and break a layout, and because `lang` has to follow the interface
// or a screen reader pronounces Spanish with an English voice. Theme, because
// contrast is a property of the palette: Daylight and Midnight are different
// colour systems and passing in one says nothing about the other.
// =============================================================================

import { test, expect } from './fixtures.js';
import AxeBuilder from '@axe-core/playwright';

/**
 * The rule set.
 *
 * wcag22aa is the target. `best-practice` is included because its findings -
 * a dialog without a label, a list containing something that is not a list
 * item - are real, and excluding them would be choosing not to know.
 */
const TAGS = [
  'wcag2a',
  'wcag2aa',
  'wcag21a',
  'wcag21aa',
  'wcag22aa',
  'best-practice',
];

/**
 * Rules disabled: none.
 *
 * There were two candidates while this pass was in progress and neither
 * survived it - each turned out to be a real defect with a real fix, which is
 * the usual outcome when you look. An empty list is kept here, rather than the
 * concept being removed, because the next person to need an exemption should
 * have to write the reason next to it.
 */
const OFF = {};

/** Surfaces, and how to get to each one. */
const SURFACES = [
  {
    name: 'front door',
    open: async ({ app }) => app.boot({ firstVisit: true }),
    expect: '#welcomeScreen',
  },
  {
    name: 'sandbox',
    open: async ({ app }) => app.boot(),
    expect: '#simulationCanvas',
  },
  {
    name: 'settings rail',
    open: async ({ page, app }) => {
      await app.boot();
      await page.evaluate(() =>
        document.getElementById('settingsBtn')?.click()
      );
    },
    expect: '#settingsPanel',
  },
  {
    name: 'scenario gallery',
    open: async ({ page, app }) => {
      await app.boot();
      await app.railControl('loadScenarioBtn');
      await page.locator('#loadScenarioBtn').click();
    },
    expect: '#scenarioListModal',
  },
  {
    name: 'object inspector',
    open: async ({ app }) => {
      await app.boot();
      await app.loadScenario('Solar System');
      await app.selectFirstObject();
    },
    expect: '#objectInspector',
  },
  {
    name: 'investigations browser',
    open: async ({ page, app }) => {
      await app.boot();
      await page.evaluate(() =>
        document.getElementById('investigationsBtn')?.click()
      );
    },
    expect: '#investigationBrowser',
  },
  {
    name: 'active investigation',
    open: async ({ app }) => app.boot({ url: '/#investigation=keplers-laws' }),
    expect: '#investigationPanel',
  },
  {
    name: 'share dialog',
    open: async ({ page, app }) => {
      await app.boot();
      await app.railControl('shareBtn');
      await page.locator('#shareBtn').click();
    },
    expect: '#shareModal',
  },
  {
    name: 'A/B bench',
    open: async ({ app }) => {
      await app.boot();
      await app.railControl('toggleExperiments');
    },
    expect: '#experimentsBtnRow, #toggleExperiments',
  },
  {
    name: 'observing panels',
    open: async ({ app }) => {
      await app.boot();
      await app.openPanel('toggleLightCurve', 'lightCurveContainer');
    },
    expect: '#lightCurveContainer',
  },
  {
    name: 'lecture mode',
    open: async ({ page, app }) => {
      await app.boot();
      await page.keyboard.press('v');
      await expect
        .poll(() =>
          page.evaluate(() => document.body.getAttribute('data-presentation'))
        )
        .toBe('lecture');
    },
    expect: '#lectureBar',
  },
  {
    name: 'model page',
    open: async ({ page }) => {
      await page.goto('/model/', { waitUntil: 'domcontentloaded' });
    },
    expect: 'main, body',
    standalone: true,
  },
  {
    name: 'instructor portal',
    open: async ({ page }) => {
      await page.goto('/instructors/', { waitUntil: 'domcontentloaded' });
    },
    expect: 'main, body',
    standalone: true,
  },
];

/** The two extremes of the palette. Midnight is the default. */
const THEMES = [
  { id: 'midnight', label: 'dark' },
  { id: 'daylight', label: 'light' },
];

const LOCALES = [
  { id: 'en', label: 'English' },
  { id: 'es', label: 'Spanish' },
];

/**
 * Run axe and return the violations, each flattened to something readable.
 *
 * The failure message names the rule, the impact, the help URL and the actual
 * elements, because an accessibility failure that says only "3 violations" is
 * a failure nobody fixes.
 */
/**
 * Wait until nothing is still animating.
 *
 * Panels fade in, and a contrast check taken during the fade measures the text
 * colour blended toward the background rather than the colour it settles at.
 * That produced a suite that failed on two or three different combinations
 * every full run - #828ca8 was reported as #707992, which is the same colour
 * at about 85% opacity - and passed whenever the spec was run on its own,
 * because an idle machine finishes the transition inside the fixed wait.
 *
 * getAnimations() covers CSS transitions and animations both, so this is the
 * settled state rather than a longer guess.
 *
 * @param {import('@playwright/test').Page} page - The page under test
 */
async function waitForStableStyles(page) {
  await page
    .evaluate(async () => {
      const running = document
        .getAnimations()
        .filter(a => a.playState === 'running');
      // The simulation's own decorative loops never finish, so they are not
      // waited on - only transitions, which do.
      const finite = running.filter(
        a => (a.effect?.getTiming?.().iterations ?? 1) !== Infinity
      );
      await Promise.race([
        Promise.all(finite.map(a => a.finished.catch(() => {}))),
        new Promise(r => setTimeout(r, 3000)),
      ]);
    })
    .catch(() => {});
}

async function analyse(page, context) {
  await waitForStableStyles(page);
  let builder = new AxeBuilder({ page }).withTags(TAGS);
  for (const [rule, on] of Object.entries(OFF)) {
    if (!on) builder = builder.disableRules(rule);
  }
  const results = await builder.analyze();
  return results.violations.map(v => ({
    id: v.id,
    impact: v.impact,
    help: v.help,
    url: v.helpUrl,
    where: context,
    nodes: v.nodes.slice(0, 4).map(n => ({
      target: n.target.join(' '),
      summary: (n.failureSummary || '').split('\n').slice(0, 3).join(' '),
    })),
  }));
}

/**
 * Put the interface into a language and a theme, before it boots.
 *
 * Written into localStorage by an init script rather than by calling setTheme()
 * after the page loads. Both modules restore a saved preference during
 * start-up, so a post-boot call raced that restore: the theme was sometimes
 * applied and then immediately overwritten by the saved one, and the suite
 * failed on a different two or three combinations every run. Seeding the
 * storage the application itself reads makes it deterministic.
 *
 * @param {import('@playwright/test').Page} page - The page under test
 * @param {object} locale - {id, label}
 * @param {object} theme - {id, label}
 */
async function seedPreferences(page, locale, theme) {
  await page.addInitScript(
    ([localeId, themeId]) => {
      try {
        window.localStorage.setItem('gravitas_theme', themeId);
        window.localStorage.setItem('gravitas_locale', localeId);
      } catch {
        /* storage unavailable; the test will still measure something real */
      }
    },
    [locale.id, theme.id]
  );
}

/** Confirm the interface really is in the language and theme asked for. */
async function assertConfigured(page, locale, theme) {
  await expect
    .poll(
      () =>
        page.evaluate(() => ({
          // Midnight is the default and css/tokens.css defines it on bare
          // :root, so the attribute is absent rather than set to 'midnight'.
          // Normalised here so the assertion describes the theme in force
          // rather than the mechanism that selected it.
          theme:
            document.documentElement.getAttribute('data-theme') ?? 'midnight',
          lang: document.documentElement.getAttribute('lang'),
        })),
      { timeout: 15_000 }
    )
    .toEqual({ theme: theme.id, lang: locale.id });
}

for (const surface of SURFACES) {
  test.describe(`axe: ${surface.name}`, () => {
    for (const locale of LOCALES) {
      for (const theme of THEMES) {
        test(`${locale.label}, ${theme.label} theme`, async ({
          page,
          app,
        }, testInfo) => {
          testInfo.setTimeout(120_000);

          await seedPreferences(page, locale, theme);

          if (surface.standalone) {
            await surface.open({ page, app });
          } else {
            await app.boot();
            // Asserted, not assumed. A measurement taken while the interface
            // was still in the previous language would pass for the wrong
            // reason and hide a defect in the one being tested.
            await assertConfigured(page, locale, theme);
            await surface.open({ page, app });
          }

          if (surface.expect) {
            await expect(page.locator(surface.expect).first()).toBeVisible({
              timeout: 30_000,
            });
          }

          const violations = await analyse(
            page,
            `${surface.name} / ${locale.label} / ${theme.label}`
          );

          expect(
            violations,
            violations
              .map(
                v =>
                  `\n[${v.impact}] ${v.id}: ${v.help}\n  ${v.url}\n` +
                  v.nodes
                    .map(n => `    ${n.target}\n      ${n.summary}`)
                    .join('\n')
              )
              .join('\n')
          ).toEqual([]);
        });
      }
    }
  });
}
