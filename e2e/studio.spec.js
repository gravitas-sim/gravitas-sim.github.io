// =============================================================================
// The Scenario Studio (/studio/), in a browser
// -----------------------------------------------------------------------------
// tests/scenarioPack.test.js holds a scenario pack to the built-in it was made
// from and to the SDK, and tests/studio.test.js holds the history, the drafts
// and the words. This is the page, against the sources and against dist/:
//   - a new scenario says what it still needs, on the field each need is
//     about, and a built-in becomes a valid scenario by keyboard;
//   - a bad value is explained on its field and blocks saving, and undo and
//     redo walk the history, from the buttons and from the keys;
//   - typed bodies that overlap or escape are named as cautions, which never
//     block saving;
//   - a draft survives a reload;
//   - the raw view refuses what does not parse and changes nothing, and
//     applies what does as one undo step;
//   - a file with the id of a different draft asks before it replaces
//     anything, and each answer does what it says; an Orbital System Builder
//     file opens as a scenario;
//   - the saved file is the one on screen, passes the pack validator, and
//     opens again without a conflict;
//   - the link opens in Gravitas as the built-in world, with the panels and
//     tools it names already out, and the preview is that same link;
//   - a scenario with its own bodies opens with them, and Refresh Scenario
//     builds them again;
//   - the Orbital System Builder points to it;
//   - it reads in Spanish, passes axe in both languages, and fits a phone.
//
// DOM-only, for dist/: nothing here imports an application module into the
// page. The spec itself imports the validator and the builder's arithmetic,
// in Node, to check a saved file and to write a builder file.
// =============================================================================

import { readFileSync } from 'node:fs';
import AxeBuilder from '@axe-core/playwright';
import { test, expect } from './fixtures.js';
import { checkPack } from '../js/scenarioPack.js';
import { validateSystem, buildSystem, systemToFile } from '../js/systemSpec.js';
import { EN } from '../js/i18n/en.js';
import { ES } from '../js/i18n/es.js';

const DIST = process.env.GRAVITAS_E2E_TARGET === 'dist';
const CLUSTER = EN['scenario.star-cluster.title'];
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'];

async function openStudio(page, { locale } = {}) {
  if (locale) {
    await page.addInitScript(l => {
      try {
        window.localStorage.setItem('gravitas_locale', l);
      } catch {
        /* storage unavailable */
      }
    }, locale);
  }
  await page.goto('/studio/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('body')).toHaveAttribute('data-ready', 'true', {
    timeout: 30_000,
  });
}

/** Type into a field and leave it, which is when the Studio commits an edit. */
async function enter(page, id, value) {
  const input = page.locator(`#${id}`);
  await input.fill(String(value));
  await input.press('Tab');
}

/** The document as the raw view holds it. */
const current = async page =>
  JSON.parse(await page.locator('#st-raw-text').inputValue());

/** Start from Star Cluster and write its Spanish, which leaves it valid. */
async function validStarCluster(page, { seed } = {}) {
  await page.locator('#st-from').selectOption('star-cluster');
  await page.locator('#st-from-go').click();
  await expect(page.locator('#st-status')).toHaveText(
    `Started from ${CLUSTER}.`
  );
  await enter(page, 'st-title-es', 'Cúmulo estelar (una copia)');
  await enter(page, 'st-summary-es', 'Un cúmulo de estrellas.');
  if (seed !== undefined) await enter(page, 'st-seed', seed);
  await expect(page.locator('#st-checks-summary')).toHaveText(
    'The scenario is valid.'
  );
}

/** Hand the page a file, as the Open button's picker would. */
const openFile = (page, name, data) =>
  page.locator('#st-file').setInputFiles({
    name,
    mimeType: 'application/json',
    buffer: Buffer.from(
      typeof data === 'string' ? data : JSON.stringify(data, null, 2)
    ),
  });

/**
 * What the application's readout says the world holds, by kind: the census
 * e2e/systemBuilder.spec.js reads, on a frame begun a quarter of a second
 * after the call.
 */
async function census(page) {
  const counts = await page.evaluate(
    () =>
      new Promise(resolve => {
        const from = performance.now();
        const read = () => {
          const host = document.getElementById('overlayStats');
          const rows = [...(host?.querySelectorAll('.readout-count') ?? [])];
          if (!rows.length && !host?.querySelector('.readout-empty')) {
            return null;
          }
          return Object.fromEntries(
            rows.map(li => [
              li.querySelector('span').textContent.trim(),
              Number(li.querySelector('b').textContent),
            ])
          );
        };
        const wait = now =>
          now - from >= 250
            ? window.requestAnimationFrame(() => resolve(read()))
            : window.requestAnimationFrame(wait);
        window.requestAnimationFrame(wait);
      })
  );
  if (!counts) throw new Error('the readout is not showing the body counts');
  return counts;
}

test.describe('the Scenario Studio', () => {
  test('a new scenario says what it needs on each field, and a built-in becomes a valid one by keyboard', async ({
    page,
  }) => {
    await openStudio(page);
    await expect(page.locator('#st-status')).toHaveText(
      'A new scenario. It is saved in this browser as you go.'
    );
    await expect(page.locator('#st-checks-summary')).toContainText(
      'problem(s) to fix'
    );
    await expect(page.locator('#st-save')).toBeDisabled();
    await expect(page.locator('#st-title-en')).toHaveAttribute(
      'aria-invalid',
      'true'
    );
    await expect(page.locator('#st-title-en-error')).toHaveText(
      'Write this in every language the scenario declares.'
    );
    // A check names its field, and takes the reader there.
    const check = page
      .locator('#st-checks button')
      .filter({ hasText: 'Title (English)' });
    await check.click();
    await expect(page.locator('#st-title-en')).toBeFocused();

    // Choosing and starting from a built-in, by keyboard alone.
    await page.locator('#st-from').focus();
    await page.locator('#st-from').selectOption('star-cluster');
    await page.locator('#st-from-go').focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#st-status')).toHaveText(
      `Started from ${CLUSTER}.`
    );
    await expect(page.locator('#st-title-en')).toHaveValue(
      `${CLUSTER} (a copy)`
    );
    await expect(page.locator('#st-setting-num_planets')).toHaveValue('80');
    // English was copied; the Spanish is the author's to write.
    await expect(page.locator('#st-title-es')).toHaveValue('');
    await expect(page.locator('#st-title-es-error')).toBeVisible();
    await enter(page, 'st-title-es', 'Cúmulo estelar (una copia)');
    await enter(page, 'st-summary-es', 'Un cúmulo de estrellas.');
    await expect(page.locator('#st-checks-summary')).toHaveText(
      'The scenario is valid.'
    );
    await expect(page.locator('#st-save')).toBeEnabled();
    await expect(page.locator('#st-diff-summary')).toHaveText(
      '2 change(s) since it was opened or saved.'
    );
    await expect(page.locator('#st-diff li').first()).toHaveText(
      'title.es changed: "" → "Cúmulo estelar (una copia)"'
    );
  });

  test('a bad value is explained on its field, and undo and redo walk the history', async ({
    page,
  }) => {
    await openStudio(page);
    await validStarCluster(page);
    const planets = page.locator('#st-setting-num_planets');
    await enter(page, 'st-setting-num_planets', 5000);
    await expect(planets).toHaveAttribute('aria-invalid', 'true');
    await expect(page.locator('#st-setting-num_planets-error')).toHaveText(
      'Outside the range 0 to 500.'
    );
    await expect(planets).toHaveAttribute(
      'aria-describedby',
      /st-setting-num_planets-error/
    );
    await expect(page.locator('#st-save')).toBeDisabled();
    await expect(page.locator('#st-checks')).toContainText(
      'Outside the range 0 to 500.'
    );

    await page.locator('#st-undo').click();
    await expect(page.locator('#st-status')).toHaveText('Undone.');
    await expect(planets).toHaveValue('80');
    await expect(planets).not.toHaveAttribute('aria-invalid', 'true');
    await expect(page.locator('#st-save')).toBeEnabled();
    await page.locator('#st-redo').click();
    await expect(planets).toHaveValue('5000');
    await page.locator('#st-undo').click();

    // From the keys, outside a text field: a checkbox holds no typing of its
    // own, so there the keys undo the document.
    const tag = page.locator('#st-tag-chaos');
    const was = await tag.isChecked();
    await tag.focus();
    await page.keyboard.press('Space');
    await expect(tag).toBeChecked({ checked: !was });
    await page.locator('#st-tag-chaos').focus();
    await page.keyboard.press('ControlOrMeta+z');
    await expect(page.locator('#st-tag-chaos')).toBeChecked({ checked: was });
    await page.locator('#st-tag-chaos').focus();
    await page.keyboard.press('ControlOrMeta+Shift+z');
    await expect(page.locator('#st-tag-chaos')).toBeChecked({
      checked: !was,
    });
  });

  test('typed bodies that overlap or escape are named as cautions, which never block saving', async ({
    page,
  }) => {
    await openStudio(page);
    for (const [id, text] of [
      ['st-title-en', 'Two bodies'],
      ['st-title-es', 'Dos cuerpos'],
      ['st-summary-en', 'A star and a planet.'],
      ['st-summary-es', 'Una estrella y un planeta.'],
    ]) {
      await enter(page, id, text);
    }
    await page.locator('#st-body-add').click();
    await page.locator('#st-body-add').click();
    const checks = page.locator('#st-checks');
    // Both start at the origin.
    await expect(checks).toContainText(
      'Caution: Body 1 and Body 2 overlap at the start'
    );
    await page.locator('#st-body-1-type').selectOption('Planet');
    await enter(page, 'st-body-1-x', 100);
    await enter(page, 'st-body-1-vy', 7);
    await expect(checks).toContainText(
      'Caution: Body 2 moves at 7 against the rest'
    );
    await expect(checks).not.toContainText('overlap');
    await expect(page.locator('#st-checks-summary')).toHaveText(
      'The scenario is valid.'
    );
    await expect(page.locator('#st-save')).toBeEnabled();
    // The circular speed, sqrt(2 x 1000 / 100): bound, and nothing to say.
    await enter(page, 'st-body-1-vy', 4.47);
    await expect(checks.locator('li')).toHaveText(['Nothing to fix.']);
  });

  test('a draft is kept in this browser and is back after a reload', async ({
    page,
  }) => {
    await openStudio(page);
    await enter(page, 'st-id', 'orbit-lab');
    await enter(page, 'st-title-en', 'An orbit lab');
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toHaveAttribute('data-ready', 'true');
    await expect(page.locator('#st-status')).toHaveText(
      'Your draft orbit-lab is back where you left it.'
    );
    await expect(page.locator('#st-id')).toHaveValue('orbit-lab');
    await expect(page.locator('#st-title-en')).toHaveValue('An orbit lab');
    await expect(page.locator('#st-drafts')).toHaveValue('orbit-lab');
  });

  test('the raw view refuses what does not parse, and applies what does as one undo step', async ({
    page,
  }) => {
    await openStudio(page);
    await validStarCluster(page, { seed: 17 });
    const before = await current(page);
    await page.locator('#st-raw summary').click();
    const raw = page.locator('#st-raw-text');
    const note = page.locator('#st-raw-error');

    await raw.fill('{"format": ');
    await page.locator('#st-raw-apply').click();
    await expect(note).toBeVisible();
    await expect(note).toContainText('That is not valid JSON');
    await expect(note).toContainText('Nothing was changed.');
    await expect(raw).toBeFocused();
    await expect(page.locator('#st-seed')).toHaveValue('17');

    await raw.fill('{"format": "gravitas.experiment", "formatVersion": 1}');
    await page.locator('#st-raw-apply').click();
    await expect(note).toHaveText(
      'That file is neither a Gravitas scenario nor an Orbital System Builder file.'
    );
    await page.locator('#st-raw-revert').click();
    await expect(note).toBeHidden();
    expect(await current(page)).toEqual(before);

    // Parseable but wrong: applied, and explained where it is wrong, so the
    // field is how it is put right.
    await raw.fill(
      JSON.stringify(
        {
          ...before,
          seed: 99,
          settings: { ...before.settings, num_comets: -3 },
        },
        null,
        2
      )
    );
    await page.locator('#st-raw-apply').click();
    await expect(page.locator('#st-status')).toHaveText(
      'Applied. Undo takes it back.'
    );
    await expect(page.locator('#st-seed')).toHaveValue('99');
    await expect(page.locator('#st-setting-num_comets-error')).toHaveText(
      'Outside the range 0 to 200.'
    );
    await enter(page, 'st-setting-num_comets', 4);
    await expect(page.locator('#st-checks-summary')).toHaveText(
      'The scenario is valid.'
    );
    await page.locator('#st-undo').click();
    await page.locator('#st-undo').click();
    expect(await current(page)).toEqual(before);
  });

  test('a file with the id of a different draft asks first, and each answer does what it says', async ({
    page,
  }) => {
    await openStudio(page);
    await validStarCluster(page, { seed: 5 });
    const mine = await current(page);
    const theirs = { ...mine, seed: 6 };
    const dialog = page.locator('#st-conflict');

    await openFile(page, 'star-cluster.scenario.json', theirs);
    await expect(dialog).toBeVisible();
    // The choice that loses nothing is the one a stray Enter makes.
    await expect(page.locator('#st-conflict-cancel')).toBeFocused();
    await expect(page.locator('#st-conflict-text')).toHaveText(
      'Your draft star-cluster is different from the file. These fields differ:'
    );
    await expect(page.locator('#st-conflict-diff li')).toHaveText([
      'seed changed',
    ]);
    await page.locator('#st-conflict-cancel').click();
    await expect(dialog).toBeHidden();
    await expect(page.locator('#st-status')).toHaveText('Nothing was opened.');
    expect(await current(page)).toEqual(mine);

    await openFile(page, 'star-cluster.scenario.json', theirs);
    await page.locator('#st-conflict-both').click();
    await expect(page.locator('#st-status')).toHaveText(
      'The file is open as star-cluster-2; your draft is kept.'
    );
    await expect(page.locator('#st-id')).toHaveValue('star-cluster-2');
    await expect(page.locator('#st-seed')).toHaveValue('6');
    await expect(page.locator('#st-drafts option')).toHaveCount(2);

    await openFile(page, 'star-cluster.scenario.json', theirs);
    await page.locator('#st-conflict-replace').click();
    await expect(page.locator('#st-id')).toHaveValue('star-cluster');
    await expect(page.locator('#st-seed')).toHaveValue('6');

    // The same file again is not a conflict.
    await openFile(page, 'star-cluster.scenario.json', theirs);
    await expect(dialog).toBeHidden();
    await expect(page.locator('#st-status')).toHaveText('Opened star-cluster.');

    // A file from a newer Gravitas is refused, and says so.
    await openFile(page, 'future.scenario.json', {
      ...theirs,
      formatVersion: 2,
    });
    await expect(page.locator('#st-status')).toHaveText(
      'That file was made by a newer version of Gravitas (format version 2). Reload the page and try again.'
    );
    await openFile(page, 'broken.json', '{ not json');
    await expect(page.locator('#st-status')).toHaveText(
      'That file could not be read as JSON.'
    );
  });

  test('an Orbital System Builder file opens as a scenario with its system', async ({
    page,
  }) => {
    const verdict = validateSystem({
      bodies: [
        { name: 'Sun', type: 'Star', mass: 1 },
        {
          name: 'Planet',
          type: 'Planet',
          mass: 1,
          primary: 0,
          a: 120,
          e: 0.05,
          omega: 0,
          phase: 0,
          retrograde: false,
        },
      ],
    });
    expect(verdict.ok).toBe(true);
    const file = systemToFile(
      verdict.bodies,
      buildSystem(verdict.bodies, { G: 2 })
    );
    await openStudio(page);
    await openFile(page, 'system.json', file);
    await expect(page.locator('#st-status')).toHaveText('Opened my-scenario.');
    const pack = await current(page);
    expect(pack.system.bodies.map(b => b.name)).toEqual(['Sun', 'Planet']);
    await expect(page.locator('#st-sys-1-a')).toHaveValue('120');
  });

  test('saves the file on screen, which the validator passes and which opens again unchanged', async ({
    page,
  }) => {
    await openStudio(page);
    await validStarCluster(page, { seed: 31 });
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('#st-save').click(),
    ]);
    expect(download.suggestedFilename()).toBe('star-cluster.scenario.json');
    const text = readFileSync(await download.path(), 'utf8');
    expect(text).toBe(await page.locator('#st-raw-text').inputValue());
    expect(checkPack(JSON.parse(text))).toEqual([]);
    await expect(page.locator('#st-status')).toHaveText(
      'Saved star-cluster.scenario.json.'
    );
    await expect(page.locator('#st-diff-summary')).toHaveText(
      'No changes since it was opened or saved.'
    );
    await openFile(page, 'star-cluster.scenario.json', text);
    await expect(page.locator('#st-conflict')).toBeHidden();
    await expect(page.locator('#st-status')).toHaveText('Opened star-cluster.');
    expect(JSON.stringify(await current(page), null, 2) + '\n').toBe(text);
  });

  test('its link opens in Gravitas as the built-in world, with its panels and tools out, and the preview is that link', async ({
    page,
    app,
  }) => {
    await app.captureClipboard();
    await openStudio(page);
    await validStarCluster(page, { seed: 424242 });
    await page.locator('#st-paused').check();
    await page.locator('#st-open-lightCurve').check();
    await page.locator('#st-tools-ruler').check();
    await page.locator('#st-copy').click();
    await expect(page.locator('#st-status')).toHaveText(
      'The link is on the clipboard.'
    );
    const link = await app.clipboardText();
    const origin = new URL(page.url()).origin;
    expect(link.startsWith(`${origin}/#`)).toBe(true);
    await expect(page.locator('#st-open-app')).toHaveAttribute('href', link);

    await page.locator('#st-preview-go').click();
    const fragment = link.slice(link.indexOf('#'));
    await expect(page.locator('#st-preview')).toHaveAttribute(
      'src',
      `${origin}/?embed=1${fragment}`
    );
    // The preview is the link, opened: its panel is out in the frame. Read
    // from the page through contentWindow, which a same-origin frame allows,
    // rather than through Playwright's frame tracking: in Firefox a query into
    // this frame can hang past its own timeout.
    await expect
      .poll(
        () =>
          page.evaluate(() => {
            const w = document.getElementById('st-preview').contentWindow;
            if (!w?.location.href.includes('embed=1')) return 'not loaded';
            return (
              w.document
                .getElementById('toggleLightCurve')
                ?.getAttribute('aria-pressed') ?? 'no rail'
            );
          }),
        { timeout: 30_000 }
      )
      .toBe('true');

    await app.boot({ url: link });
    await expect(page.locator('#toggleLightCurve')).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    await expect(page.locator('#toggleRuler')).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    const fromLink = await census(page);
    expect(fromLink).toEqual(STAR_CLUSTER);
    if (!DIST) {
      // The built-in itself, by name, under the same seed.
      await app.loadScenario('star-cluster', 424242, { run: false });
      expect(await census(page)).toEqual(fromLink);
    }
  });

  test('a scenario with its own bodies opens with them, and Refresh builds them again', async ({
    page,
    app,
  }) => {
    await app.captureClipboard();
    await openStudio(page);
    await openFile(
      page,
      'scenario.json',
      readFileSync('sdk/examples/figure-eight/scenario.json', 'utf8')
    );
    await expect(page.locator('#st-status')).toHaveText('Opened figure-eight.');
    await expect(page.locator('#st-checks-summary')).toHaveText(
      'The scenario is valid.'
    );
    await page.locator('#st-copy').click();
    await expect(page.locator('#st-status')).toHaveText(
      'The link is on the clipboard.'
    );
    await app.boot({ url: await app.clipboardText() });
    expect(await census(page)).toEqual({ Stars: 3 });
    // A built-in's Refresh builds it again; so does a scenario's that brings
    // its bodies, rather than the empty world its settings alone describe.
    await page.locator('#refreshScenarioBtn').click();
    expect(await census(page)).toEqual({ Stars: 3 });
  });

  test('the Orbital System Builder points to it, and the link opens it', async ({
    page,
    app,
  }) => {
    await app.boot();
    await app.railControl('systemBuilderBtn');
    await page.locator('#systemBuilderBtn').click();
    const link = page.locator('#systemBuilderStudio');
    await expect(link).toHaveText('Open the Scenario Studio');
    await expect(page.locator('#systemBuilderStudioNote')).toContainText(
      'save it as a file and open the file in the Scenario Studio'
    );
    const href = await link.evaluate(a => a.href);
    expect(href).toBe(`${new URL(page.url()).origin}/studio/`);
    await openStudio(page);
  });

  test('reads in Spanish, and the choice survives a reload', async ({
    page,
  }) => {
    await openStudio(page);
    await page.locator('#langSwitch button[lang="es"]').click();
    await expect(page.locator('h1')).toHaveText('Estudio de escenarios');
    await expect(page.locator('html')).toHaveAttribute('lang', 'es');
    await expect(
      page.locator('#st-from option[value="star-cluster"]')
    ).toHaveText(ES['scenario.star-cluster.title']);
    await expect(page.locator('#st-title-en-error')).toHaveText(
      'Escribe esto en cada idioma que declara el escenario.'
    );
    await page.locator('#st-from').selectOption('star-cluster');
    await page.locator('#st-from-go').click();
    await expect(page.locator('#st-title-es')).toHaveValue(
      `${ES['scenario.star-cluster.title']} (una copia)`
    );
    await enter(page, 'st-setting-num_planets', 5000);
    await expect(page.locator('#st-setting-num_planets-error')).toHaveText(
      'Fuera del intervalo de 0 a 500.'
    );
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toHaveAttribute('data-ready', 'true');
    await expect(page.locator('h1')).toHaveText('Estudio de escenarios');
  });

  for (const locale of ['en', 'es']) {
    test(`has no accessibility violations in ${locale}, with problems showing and with the conflict dialog open`, async ({
      page,
    }) => {
      await openStudio(page, { locale });
      const scan = async () => {
        const r = await new AxeBuilder({ page }).withTags(TAGS).analyze();
        expect(r.violations.map(v => `${v.id}: ${v.help}`)).toEqual([]);
      };
      await scan();
      await page.locator('#st-raw summary').click();
      await page.locator('#st-from').selectOption('star-cluster');
      await page.locator('#st-from-go').click();
      const mine = await current(page);
      await openFile(page, 'x.scenario.json', { ...mine, seed: 1 });
      await expect(page.locator('#st-conflict')).toBeVisible();
      await scan();
    });
  }

  test('on a phone it reads and says so: nothing scrolls sideways, and every control shown is on screen', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await openStudio(page);
    // PLATFORM_MODEL.md: read-only under 768 px, with a note. The editor and
    // the controls that change the document are not there.
    await expect(page.locator('.st-narrow')).toBeVisible();
    await expect(page.locator('#st-from')).toBeHidden();
    await expect(page.locator('#st-system-add')).toBeHidden();
    const overflow = await page.evaluate(() => ({
      page: document.scrollingElement.scrollWidth - window.innerWidth,
      off: [...document.querySelectorAll('button, input, select, textarea')]
        .filter(el => el.offsetParent !== null && el.type !== 'file')
        .map(el => [el.id || el.textContent.trim(), el.getBoundingClientRect()])
        .filter(([, r]) => r.left < 0 || r.right > window.innerWidth)
        .map(([id]) => id),
    }));
    expect(overflow).toEqual({ page: 0, off: [] });
  });
});

/**
 * What the readout counts in Star Cluster's world, paused at its start: the
 * preset's own numbers (js/scenarios.js), with none of the stars a hand-built
 * scenario would place.
 */
const STAR_CLUSTER = {
  Asteroids: 150,
  'Gas Giants': 15,
  'Neutron Stars': 2,
  Planets: 80,
  'White Dwarfs': 8,
};
