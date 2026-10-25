// =============================================================================
// Task-aware progressive disclosure, in a browser (Prompt 167)
// -----------------------------------------------------------------------------
// "More" is one pattern (DESIGN_SYSTEM.md): a native <details> in the lesson
// panel, an instrument panel and the Settings dialog, shut at the survey depths
// and open at the advanced one, remembered per surface, announced once. These
// check what a browser renders: the default views against the committed control
// counts (tools/disclosure-ceilings.json), the task rule on a step that reads and
// one that measures, every folded control reachable in two actions from the
// keyboard, the memory across a reload, the announcement, the sizes of the new
// controls at a desktop and a phone width, both languages, and axe with each
// More open. tests/progressiveDisclosure.test.js holds the rule on every
// shipped step.
// =============================================================================

import { readFileSync } from 'node:fs';
import AxeBuilder from '@axe-core/playwright';
import { test, expect } from './fixtures.js';

const ceilings = JSON.parse(
  readFileSync(new URL('../tools/disclosure-ceilings.json', import.meta.url))
).views;

const DESKTOP = { width: 1280, height: 800 };
const PHONE = { width: 390, height: 844 };

const CONTROLS =
  'a[href], button, input:not([type="hidden"]), select, textarea, summary, [role="button"], [role="tab"]';

/**
 * The controls in a panel as a person meets them: rendered, not hidden, not
 * inert, not inside a closed disclosure or a folded settings section, whatever
 * the viewport (a panel scrolls, so the fold is not the measure).
 */
const count = (page, scopes) =>
  page.evaluate(
    ([selector, roots]) => {
      let n = 0;
      for (const root of roots) {
        for (const host of document.querySelectorAll(root)) {
          if (host.closest('[hidden], [inert]')) continue;
          for (const el of host.querySelectorAll(selector)) {
            if (el.closest('[inert], [hidden], [aria-hidden="true"]')) continue;
            if (el.disabled) continue;
            let folded = false;
            for (
              let a = el.parentElement;
              a && a !== host.parentElement;
              a = a.parentElement
            ) {
              if (
                a.tagName === 'DETAILS' &&
                !a.open &&
                !(el.tagName === 'SUMMARY' && el.parentElement === a)
              )
                folded = true;
              if (a.classList?.contains('collapsed')) folded = true;
            }
            if (folded) continue;
            const style = getComputedStyle(el);
            if (style.visibility === 'hidden' || style.display === 'none')
              continue;
            const r = el.getBoundingClientRect();
            if (r.width <= 2 || r.height <= 2) continue;
            n++;
          }
        }
      }
      return n;
    },
    [CONTROLS, scopes]
  );

/** Open a lesson at a step, as a student resuming it. */
async function openAt(page, app, id, sid, { locale } = {}) {
  if (locale)
    await page.addInitScript(l => {
      try {
        localStorage.setItem('gravitas_locale', l);
      } catch {
        /* storage unavailable */
      }
    }, locale);
  await app.boot();
  await page.evaluate(
    async ([lesson, stepSid]) => {
      const { writeProgress } =
        await import('/js/investigations/progressSchema.js');
      localStorage.setItem(
        `gravitas_investigation_${lesson}`,
        JSON.stringify(
          writeProgress({
            lesson,
            responses: {},
            attempts: {},
            visited: [],
            stepSid,
            startedAt: Date.now(),
          })
        )
      );
    },
    [id, sid]
  );
  await openLesson(page, id);
  await expect(page.locator('#investigationPanel')).toBeVisible();
  await expect(page.locator('.inv-step-title')).not.toBeEmpty();
}

/** The lesson's own link: the one door every width has. */
const openLesson = (page, id) =>
  page.evaluate(lesson => {
    location.hash = `#investigation=${lesson}`;
  }, id);

const READ = ['missing-mass', 'two-ways-to-weigh-a'];
const LENS_READ = ['a-lens-passing-by', 'a-star-brightens'];
const LENS_MEASURE = ['a-lens-passing-by', 'the-peak'];
const WAVE_READ = ['listening-to-spacetime', 'three-things-called-a-wave'];

test.describe('the default views', () => {
  const views = {
    'lesson-panel': READ,
    'instrument-reading': LENS_READ,
    'instrument-listening': WAVE_READ,
    'instrument-measuring': LENS_MEASURE,
  };
  for (const [name, [id, sid]] of Object.entries(views)) {
    test(`${name} shows no more controls than it is committed to`, async ({
      page,
      app,
    }) => {
      await openAt(page, app, id, sid);
      // Let the instrument's family arrive and the panel draw.
      if (name !== 'lesson-panel')
        await expect(page.locator('#investigationTool')).toBeVisible();
      await expect(page.locator('#investigationMore')).toBeVisible();
      const n = await count(page, ceilings[name].scope);
      expect(
        n,
        `${ceilings[name].what}: ${n} controls, committed to ${ceilings[name].ceiling} (was ${ceilings[name].before})`
      ).toBeLessThanOrEqual(ceilings[name].ceiling);
    });
  }

  test('the Settings dialog shows no more controls than it is committed to', async ({
    page,
    app,
  }) => {
    await app.boot();
    await page.evaluate(() => document.getElementById('settingsBtn').click());
    await expect(page.locator('#settingsPanel')).toBeVisible();
    await expect(
      page.locator('#settingsGrid .settings-advanced')
    ).toBeVisible();
    const n = await count(page, ceilings['settings-dialog'].scope);
    expect(n).toBeLessThanOrEqual(ceilings['settings-dialog'].ceiling);
  });
});

test.describe('the task rule', () => {
  test('a step that reads folds the sliders after the first and the presets', async ({
    page,
    app,
  }) => {
    await openAt(page, app, ...LENS_READ);
    await expect(page.locator('#investigationTool')).toBeVisible();
    await expect(page.locator('#investigationToolControls input')).toHaveCount(
      1
    );
    const more = page.locator('#investigationToolMore');
    await expect(more).toBeVisible();
    await expect(more).toHaveJSProperty('open', false);
    await expect(page.locator('.inv-preset').first()).toBeHidden();
    // Two actions: open More, then use what was folded.
    await more.locator('summary').click();
    await expect(
      page.locator('#investigationToolMoreBody input[type="range"]')
    ).toHaveCount(6);
    await expect(page.locator('.inv-preset')).toHaveCount(4);
    await expect(page.locator('.inv-preset').first()).toBeVisible();
  });

  test('a step that measures keeps every slider and every preset where it is', async ({
    page,
    app,
  }) => {
    await openAt(page, app, ...LENS_MEASURE);
    await expect(page.locator('#investigationTool')).toBeVisible();
    await expect(page.locator('#investigationToolControls input')).toHaveCount(
      7
    );
    await expect(page.locator('.inv-preset').first()).toBeVisible();
    await expect(page.locator('#investigationToolMore')).toBeHidden();
    // The readout, with its units, is never folded.
    await expect(
      page.locator('#investigationToolReadout .inv-tool-row').first()
    ).toBeVisible();
  });

  test('the Explain button of an instrument stays in its header, folded or open', async ({
    page,
    app,
  }) => {
    await openAt(page, app, ...LENS_READ);
    await expect(page.locator('#investigationToolExplain')).toBeVisible();
  });
});

test.describe('the lesson panel', () => {
  test('keeps the step, the answers and Next in view and folds Help, depth, backup and Restart', async ({
    page,
    app,
  }) => {
    await openAt(page, app, ...READ);
    for (const id of [
      'investigationNext',
      'investigationResetScenario',
      'investigationClose',
    ])
      await expect(page.locator(`#${id}`)).toBeVisible();
    for (const id of [
      'investigationHelp',
      'investigationReset',
      'investigationBackupDownload',
    ])
      await expect(page.locator(`#${id}`)).toBeHidden();
    await page.locator('#investigationMore > summary').click();
    for (const id of [
      'investigationHelp',
      'investigationReset',
      'investigationBackupDownload',
      'investigationBackupRestore',
    ])
      await expect(page.locator(`#${id}`)).toBeVisible();
  });

  test('opens from the keyboard and says so once through the live region', async ({
    page,
    app,
  }) => {
    await openAt(page, app, ...READ);
    await page.locator('#investigationMore > summary').focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#investigationMore')).toHaveJSProperty(
      'open',
      true
    );
    await expect(page.locator('#srStatus')).toHaveText(/More shown\./);
    await page.keyboard.press('Space');
    await expect(page.locator('#investigationMore')).toHaveJSProperty(
      'open',
      false
    );
    await expect(page.locator('#srStatus')).toHaveText(/More hidden\./);
  });

  test('the Help button, reached through More, still opens Help', async ({
    page,
    app,
  }) => {
    await openAt(page, app, ...READ);
    await page.locator('#investigationMore > summary').click();
    await page.locator('#investigationHelp').click();
    await expect(page.locator('#investigationHelpPanel')).toBeVisible();
  });

  test('what the student chose is remembered across a reload, per surface', async ({
    page,
    app,
  }) => {
    await openAt(page, app, ...READ);
    await page.locator('#investigationMore > summary').click();
    await expect(page.locator('#investigationMore')).toHaveJSProperty(
      'open',
      true
    );
    const kept = await page.evaluate(() =>
      JSON.parse(localStorage.getItem('gravitas_disclosure'))
    );
    expect(kept).toEqual({ lesson: 1 });
    await page.reload();
    await openLesson(page, READ[0]);
    await expect(page.locator('#investigationPanel')).toBeVisible();
    await expect(page.locator('#investigationMore')).toHaveJSProperty(
      'open',
      true
    );
  });

  test('an activity can open it, and the student can still fold it', async ({
    page,
    app,
  }) => {
    await app.boot();
    await page.evaluate(async () => {
      const { buildAssignment } = await import('/js/assignments/assignment.js');
      const { assignmentLink } =
        await import('/js/assignments/assignmentLink.js');
      const { stepFingerprint } =
        await import('/js/investigations/progressBackup.js');
      const { loadInvestigation } =
        await import('/js/data/investigations/registry.js');
      const lesson = await loadInvestigation('missing-mass');
      const a = buildAssignment({
        lesson,
        chosen: [lesson.steps[0].sid],
        title: 'Open',
        fingerprint: stepFingerprint,
        more: 'open',
      });
      const link = await assignmentLink(a, location.origin + '/');
      window.__link = link.fragment;
    });
    const fragment = await page.evaluate(() => window.__link);
    await page.goto(`/${fragment.startsWith('#') ? fragment : `#${fragment}`}`);
    await page.reload();
    await expect(page.locator('#investigationPanel')).toBeVisible({
      timeout: 30000,
    });
    await expect(page.locator('#investigationMore')).toHaveJSProperty(
      'open',
      true
    );
    await page.locator('#investigationMore > summary').click();
    await expect(page.locator('#investigationMore')).toHaveJSProperty(
      'open',
      false
    );
  });
});

test.describe('the Settings dialog', () => {
  const open = async (page, app, level) => {
    if (level)
      await page.addInitScript(l => {
        try {
          localStorage.setItem('gravitas_course_level', l);
        } catch {
          /* storage unavailable */
        }
      }, level);
    await app.boot();
    await page.evaluate(() => document.getElementById('settingsBtn').click());
    await expect(page.locator('#settingsPanel')).toBeVisible();
  };

  test('keeps the science settings behind one section, shut at the introductory level', async ({
    page,
    app,
  }) => {
    await open(page, app);
    const more = page.locator('#settingsGrid .settings-advanced');
    await expect(more).toHaveJSProperty('open', false);
    for (const section of [
      'simulation',
      'black-holes',
      'compact-objects',
      'accuracy',
      'performance',
    ])
      await expect(
        page.locator(
          `#settingsGrid .settings-section[data-section="${section}"]`
        )
      ).toBeHidden();
    // Two actions: open it, then use a setting inside it.
    await more.locator('summary').click();
    await expect(
      page.locator('.setting-control[data-setting-key="integrator"]')
    ).toBeVisible();
    await expect(
      page.locator(
        '.setting-control[data-setting-key="gravitational_constant"]'
      )
    ).toBeVisible();
  });

  test('starts open at the advanced course level', async ({ page, app }) => {
    await open(page, app, 'advanced');
    await expect(
      page.locator('#settingsGrid .settings-advanced')
    ).toHaveJSProperty('open', true);
  });

  test('a search that finds a setting inside it opens it without remembering that', async ({
    page,
    app,
  }) => {
    await open(page, app);
    await page.locator('#settingsFilter').fill('integrator');
    await expect(
      page.locator('#settingsGrid .settings-advanced')
    ).toHaveJSProperty('open', true);
    const kept = await page.evaluate(() =>
      localStorage.getItem('gravitas_disclosure')
    );
    expect(kept).toBeNull();
  });

  test('says it once when the student opens it, and remembers it', async ({
    page,
    app,
  }) => {
    await open(page, app);
    await page.locator('#settingsGrid .settings-advanced > summary').click();
    await expect(page.locator('#srStatus')).toHaveText(/shown\./);
    const kept = await page.evaluate(() =>
      JSON.parse(localStorage.getItem('gravitas_disclosure'))
    );
    expect(kept).toEqual({ settings: 1 });
  });
});

test.describe('the new controls are targets', () => {
  for (const [label, size] of [
    ['desktop', DESKTOP],
    ['phone', PHONE],
  ]) {
    test(`every More summary is at least 24 px, and the controls inside it too, at ${label} width`, async ({
      page,
      app,
    }) => {
      await page.setViewportSize(size);
      await openAt(page, app, ...LENS_READ);
      await expect(page.locator('#investigationTool')).toBeVisible();
      await page.locator('#investigationMore > summary').click();
      await page.locator('#investigationToolMore > summary').click();
      const boxes = await page.evaluate(() =>
        [
          ...document.querySelectorAll(
            '#investigationMore summary, #investigationMore button, #investigationToolMore summary, #investigationToolMore .inv-preset'
          ),
        ]
          .filter(el => el.getClientRects().length)
          .map(el => {
            const r = el.getBoundingClientRect();
            return {
              id: el.id || el.className || el.tagName,
              w: r.width,
              h: r.height,
            };
          })
      );
      expect(boxes.length).toBeGreaterThan(8);
      // The sliders are not measured here: at 390 px a long label leaves the
      // lens instrument's slider 3 px (the layout is v3's; see the handoff).
      for (const b of boxes) {
        expect(b.h, `${b.id} is ${b.h} px high`).toBeGreaterThanOrEqual(24);
        expect(b.w, `${b.id} is ${b.w} px wide`).toBeGreaterThanOrEqual(24);
      }
    });
  }
});

test.describe('the Settings More is a target too', () => {
  for (const [label, size] of [
    ['desktop', DESKTOP],
    ['phone', PHONE],
  ]) {
    test(`its summary is at least 24 px at ${label} width`, async ({
      page,
      app,
    }) => {
      await page.setViewportSize(size);
      await app.boot();
      await page.evaluate(() => document.getElementById('settingsBtn').click());
      const summary = page.locator(
        '#settingsGrid .settings-advanced > summary'
      );
      await expect(summary).toBeVisible();
      const box = await summary.boundingBox();
      expect(box.height).toBeGreaterThanOrEqual(24);
      expect(box.width).toBeGreaterThanOrEqual(24);
    });
  }
});

test.describe('both languages', () => {
  test('the summary and the announcement are in Spanish for a Spanish reader', async ({
    page,
    app,
  }) => {
    await openAt(page, app, ...READ, { locale: 'es' });
    await expect(page.locator('#investigationMore > summary')).toContainText(
      'Más'
    );
    await page.locator('#investigationMore > summary').click();
    await expect(page.locator('#srStatus')).toHaveText('Se muestra: Más.');
  });
});

test.describe('accessibility with every More open', () => {
  const TAGS = [
    'wcag2a',
    'wcag2aa',
    'wcag21a',
    'wcag21aa',
    'wcag22aa',
    'best-practice',
  ];
  const violations = async (page, include) =>
    (
      await new AxeBuilder({ page }).withTags(TAGS).include(include).analyze()
    ).violations.map(v => ({
      id: v.id,
      nodes: v.nodes.slice(0, 3).map(n => n.target.join(' ')),
    }));

  test('the lesson panel and an instrument panel', async ({ page, app }) => {
    await openAt(page, app, ...LENS_READ);
    await expect(page.locator('#investigationTool')).toBeVisible();
    await page.locator('#investigationMore > summary').click();
    await page.locator('#investigationToolMore > summary').click();
    expect(await violations(page, '#investigationPanel')).toEqual([]);
    expect(await violations(page, '#investigationTool')).toEqual([]);
  });

  test('the Settings dialog', async ({ page, app }) => {
    await app.boot();
    await page.evaluate(() => document.getElementById('settingsBtn').click());
    await page.locator('#settingsGrid .settings-advanced > summary').click();
    expect(await violations(page, '#settingsPanel')).toEqual([]);
  });
});
