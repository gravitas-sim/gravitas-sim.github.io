// =============================================================================
// Remix delivery beyond the link (Prompt 78 (b), (c)), in a browser
// -----------------------------------------------------------------------------
// tests/remixDelivery.test.js, remixCourse.test.js and remixGrade.test.js hold
// the rules. This is the path:
//   - an investigation pack is listed by the catalog, installed into the
//     browser's store, and opened from there as the instructor's lesson;
//   - a course that carries an investigation as a link: the check page opens
//     the link and makes the item with its pin, says when the pin has moved,
//     the course builder takes the item and the course home opens the link.
// =============================================================================

import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test, expect } from './fixtures.js';
import { remixBuiltin } from '../js/composer/remixApi.js';
import { packLink } from '../js/composer/packLink.js';
import { courseLink } from '../js/course/links.js';
import { archiveEntry } from '../tools/catalog.mjs';

const REPO = path.resolve('.');
const seen = async page =>
  page.addInitScript(() => {
    try {
      window.localStorage.setItem('gravitas_welcome_seen_v1', '1');
    } catch {
      /* storage unavailable */
    }
  });

/** A remix of Tides with a reworded step, as a pack. */
async function tidesRemix() {
  const made = await remixBuiltin('tides', { id: 'my-tides-e2e' });
  const base = JSON.parse(JSON.stringify(made.pack));
  made.pack.steps[1].title = { en: 'Reworded by me', es: 'Reformulado por mí' };
  return { pack: made.pack, base };
}

/** Its catalog entry and archive, built as `npm run catalog` builds one. */
async function archived(pack) {
  const dir = mkdtempSync(path.join(tmpdir(), 'gx-e2e-'));
  const put = (name, text) => {
    mkdirSync(path.dirname(path.join(dir, name)), { recursive: true });
    writeFileSync(path.join(dir, name), text);
  };
  put(
    'gravitas-extension.json',
    JSON.stringify({
      format: 'gravitas.capability-package',
      formatVersion: 1,
      id: `community.${pack.id}`,
      version: '1.0.0',
      kind: 'declarative',
      gravitas: '^1.0.0',
      title: { en: pack.title.en, es: pack.title.es },
      provides: {
        investigations: [{ id: pack.id, file: 'investigation.json' }],
      },
      assets: [
        { path: 'investigation.json', role: 'data', offline: 'optional' },
      ],
      citations: [],
      licenses: [{ scope: 'investigation.json', license: 'CC-BY-4.0' }],
      offline: { policy: 'precache' },
      validation: [{ check: 'registry:sdk-extensions' }],
      migrations: [],
    })
  );
  put('investigation.json', JSON.stringify(pack));
  return archiveEntry({
    path: path.relative(REPO, dir),
    review: { date: '2026-10-09', checks: ['e2e'], notes: 'a fixture' },
  });
}

test('a remix is listed by the catalog, installed, and opened from the browser’s store', async ({
  page,
}) => {
  test.setTimeout(180_000);
  await seen(page);
  const { pack } = await tidesRemix();
  const { entry, archive } = await archived(pack);
  const real = JSON.parse(readFileSync('catalog/catalog.json', 'utf8'));
  await page.route('**/catalog/catalog.json', route =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ ...real, entries: [...real.entries, entry] }),
    })
  );
  await page.route(`**/catalog/${entry.archiveFile}`, route =>
    route.fulfill({ contentType: 'application/octet-stream', body: archive })
  );
  await page.goto('/catalog/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('html')).toHaveAttribute('data-ready', 'true', {
    timeout: 30_000,
  });
  const card = page.locator(`article[data-entry="${entry.id}"]`);
  await expect(card).toContainText(/Investigation|Investigación/);
  await card.locator('[data-action="install"]').click();
  await expect(card).toHaveAttribute('data-status', 'installed', {
    timeout: 30_000,
  });
  await card.locator('a[data-action="open"]').click();
  await expect(page.locator('#investigationPanel')).toHaveClass(/is-open/, {
    timeout: 60_000,
  });
  await expect(page.locator('#investigationTitle')).toContainText(/Tide/i);
});

test('a course carries an investigation: made, pinned, checked, and opened', async ({
  page,
}) => {
  test.setTimeout(180_000);
  await seen(page);
  const { pack, base } = await tidesRemix();
  const link = (await packLink(pack, { root: 'https://x.test/', base }))
    .fragment;

  await page.goto('/studio/course/packs/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('body')).toHaveAttribute('data-ready', 'true', {
    timeout: 30_000,
  });
  await page.fill('#pkLink', `https://gravitas-sim.online/#${link}`);
  await page.click('#pkMake');
  await expect(page.locator('#pkItem')).toHaveValue(/"pin"/, {
    timeout: 90_000,
  });
  const item = JSON.parse(await page.locator('#pkItem').inputValue());
  expect(item).toMatchObject({ kind: 'pack', pack: 'my-tides-e2e' });

  // A link that is not an investigation is said, not thrown.
  await page.fill('#pkLink', '#i1rAAAA');
  await page.click('#pkMake');
  await expect(page.locator('#pkMade')).toBeHidden();
  await expect(page.locator('#pkStatus')).not.toBeEmpty();

  const course = {
    format: 'gravitas.course-pack',
    formatVersion: 2,
    id: 'tides-course',
    version: '1.0.0',
    gravitas: '1.0.0',
    locales: ['en'],
    pinning: 'exact',
    title: { en: 'Tides course' },
    units: [
      {
        id: 'one',
        title: { en: 'One' },
        items: [{ ...item, id: 'tides-mine', title: { en: 'My tides' } }],
      },
    ],
  };
  await page.fill('#pkCourse', JSON.stringify(course));
  await page.click('#pkCheck');
  await expect(page.locator('#pkTable')).toContainText(/As pinned/, {
    timeout: 90_000,
  });
  course.units[0].items[0].pin.fp = '00000000';
  await page.fill('#pkCourse', JSON.stringify(course));
  await page.click('#pkCheck');
  await expect(page.locator('#pkTable')).toContainText(/not the ones pinned/, {
    timeout: 90_000,
  });
  await expect(page.locator('#pkTable textarea')).toHaveValue(/"fp"/);

  // The course builder takes the item, and the course home opens the link.
  course.units[0].items[0].pin.fp = item.pin.fp;
  const home = (await courseLink(course, { root: 'https://x.test/' })).url;
  await page.goto(`/course/#${home.split('#')[1]}`, {
    waitUntil: 'domcontentloaded',
  });
  const open = page.locator('#ch-item-tides-mine a.ui-button');
  await expect(open).toHaveAttribute(
    'href',
    new RegExp(`#${link.slice(0, 20)}`),
    {
      timeout: 30_000,
    }
  );
  await open.evaluate(a => a.removeAttribute('target'));
  await open.click();
  await expect(page.locator('#investigationPanel')).toHaveClass(/is-open/, {
    timeout: 60_000,
  });
});

test('the course builder takes the item, keeps its pin, and says the pack is not checked here', async ({
  page,
}) => {
  test.setTimeout(120_000);
  await seen(page);
  const { pack, base } = await tidesRemix();
  const link = (await packLink(pack, { root: 'https://x.test/', base }))
    .fragment;
  await page.goto('/studio/course/packs/', { waitUntil: 'domcontentloaded' });
  await page.fill('#pkLink', link);
  await page.click('#pkMake');
  await expect(page.locator('#pkItem')).toHaveValue(/"pin"/, {
    timeout: 90_000,
  });
  const item = await page.locator('#pkItem').inputValue();

  await page.goto('/studio/course/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('body')).toHaveAttribute('data-ready', 'true', {
    timeout: 60_000,
  });
  await page.locator('#cb-units-0 > summary').click();
  await page.waitForSelector('#cb-add-0');
  // The editor redraws when the review lands: choose and press in one turn.
  await page.evaluate(() => {
    document.querySelector('#cb-add-0').value = 'pack';
    document
      .querySelector('#cb-add-0')
      .closest('.ui-toolbar')
      .querySelector('button')
      .click();
  });
  const box = page.getByLabel(/Investigation item|Elemento de investigación/);
  await box.fill(item);
  await box.blur();
  await expect(page.locator('#cb-status')).toContainText(/my-tides-e2e/);
  await expect(page.locator('body')).toContainText(
    /as pinned|not checked here/i,
    {
      timeout: 30_000,
    }
  );
});

test('My work opens the draft it names, not the one saved last', async ({
  page,
}) => {
  test.setTimeout(120_000);
  await seen(page);
  const one = (await remixBuiltin('tides', { id: 'draft-one' })).pack;
  const two = (await remixBuiltin('tides', { id: 'draft-two' })).pack;
  await page.addInitScript(
    ([a, b]) => {
      try {
        const at = n => new Date(Date.now() - n * 60000).toISOString();
        window.localStorage.setItem(
          'gravitas_composer_draft:draft-one',
          JSON.stringify({ doc: a, savedAt: at(60) })
        );
        window.localStorage.setItem(
          'gravitas_composer_draft:draft-two',
          JSON.stringify({ doc: b, savedAt: at(1) })
        );
      } catch {
        /* storage unavailable */
      }
    },
    [one, two]
  );
  await page.goto('/my-work/', { waitUntil: 'domcontentloaded' });
  const link = page.locator('a[href*="studio/lesson/?open=draft-one"]');
  await expect(link).toHaveCount(1, { timeout: 30_000 });
  await link.click();
  await expect(page.locator('#cp-status')).toContainText(/draft-one/, {
    timeout: 60_000,
  });
});
