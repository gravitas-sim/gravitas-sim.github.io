// =============================================================================
// Contributed and withdrawn packages, on the catalog page
// -----------------------------------------------------------------------------
// tests/catalogGovernance.test.js holds the generator and its record; this is
// what a reader sees (CONTRIBUTING_CONTENT.md, CATALOG.md):
//   - the Contributed section is there from the start and says nothing has been
//     contributed yet, until something is;
//   - a contributed package is listed in that section, credited as its author
//     asked in the reader's language, with its review date and its history,
//     and installs like any other;
//   - a withdrawn package is shown to a reader who holds a copy, with the
//     reason, offers no install or update, and the copy keeps working (the
//     course still opens) until they remove it; a reader who has no copy never
//     sees it;
//   - no accessibility violations with either, in English and in Spanish.
// The catalog is the real one with one entry changed, served by a route, so the
// archive is the real archive and the install is the real install.
// =============================================================================

import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';
import { test, expect } from './fixtures.js';

const TAGS = [
  'wcag2a',
  'wcag2aa',
  'wcag21a',
  'wcag21aa',
  'wcag22aa',
  'best-practice',
];
const REAL = JSON.parse(readFileSync('catalog/catalog.json', 'utf8'));
const COURSE = 'community.pulsating-stars';
const course = REAL.entries.find(e => e.id === COURSE);

const contributed = {
  ...course,
  origin: 'contributed',
  attribution: {
    en: 'Dr. Ana Reyes, Example State University',
    es: 'Dra. Ana Reyes, Universidad Estatal de Ejemplo',
  },
  history: [
    {
      version: '1.0.0',
      date: '2026-10-09',
      change: {
        en: 'Accepted into the catalog.',
        es: 'Aceptado en el catálogo.',
      },
    },
  ],
};
const tombstone = {
  id: COURSE,
  version: course.version,
  kind: 'declarative',
  type: 'course-pack',
  delivery: 'withdrawn',
  title: course.title,
  origin: 'contributed',
  attribution: contributed.attribution,
  withdrawn: {
    date: '2026-10-10',
    reason: { en: 'The author withdrew it.', es: 'La autora la retiró.' },
  },
  history: contributed.history,
};

/** Serve the real catalog with the course's entry replaced. */
const serve = (page, replacement) =>
  page.route('**/catalog/catalog.json', route =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        ...REAL,
        entries: REAL.entries.map(e => (e.id === COURSE ? replacement : e)),
      }),
    })
  );

async function open(page) {
  await page.goto('/catalog/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('html')).toHaveAttribute('data-ready', 'true', {
    timeout: 30_000,
  });
}
const entry = page => page.locator(`article[data-entry="${COURSE}"]`);
const axe = async page => {
  const { violations } = await new AxeBuilder({ page })
    .withTags(TAGS)
    .analyze();
  expect(violations.map(v => `${v.id}: ${v.help}`)).toEqual([]);
};

test.describe('the Contributed section', () => {
  test('is there, and says so while nothing has been contributed', async ({
    page,
  }) => {
    await open(page);
    await expect(
      page.getByRole('heading', { name: 'Contributed', level: 2 })
    ).toBeVisible();
    await expect(page.locator('#catContributedNone')).toBeVisible();
    await expect(page.locator('#catContributedNone')).toContainText(
      'CONTRIBUTING_CONTENT.md'
    );
    await expect(page.locator('#catContributed article')).toHaveCount(0);
    await axe(page);
  });

  test('lists a contributed package with its author, review and history, and it installs', async ({
    page,
  }) => {
    await serve(page, contributed);
    await open(page);
    const section = page.locator('#catContributedSection');
    const card = section.locator(`article[data-entry="${COURSE}"]`);
    await expect(card).toBeVisible();
    await expect(card).toContainText('Contributed by');
    await expect(card).toContainText('Dr. Ana Reyes, Example State University');
    await expect(card).toContainText('Reviewed');
    await expect(card).toContainText('History');
    await expect(card).toContainText(
      'Version 1.0.0, 2026-10-09: Accepted into the catalog.'
    );
    await expect(page.locator('#catContributedNone')).toBeHidden();
    // It is not also in the first list.
    await expect(
      page.locator(`#catList article[data-entry="${COURSE}"]`)
    ).toHaveCount(0);
    await axe(page);

    await card.getByRole('button', { name: 'Install for offline use' }).click();
    await expect(card).toHaveAttribute('data-status', 'installed', {
      timeout: 30_000,
    });

    // In Spanish: the attribution the author gave in Spanish, and the page's words.
    await page.getByRole('button', { name: 'Español' }).click();
    await expect(card).toContainText('Aportado por');
    await expect(card).toContainText('Dra. Ana Reyes');
    await expect(card).toContainText('Aceptado en el catálogo.');
    await axe(page);
  });
});

test.describe('a withdrawn package', () => {
  test('is shown to a reader who holds a copy, whose copy keeps working', async ({
    page,
  }) => {
    test.setTimeout(120_000);
    // Install it while it is listed.
    await serve(page, contributed);
    await open(page);
    await entry(page)
      .getByRole('button', { name: 'Install for offline use' })
      .click();
    await expect(entry(page)).toHaveAttribute('data-status', 'installed', {
      timeout: 30_000,
    });

    // Then the maintainers withdraw it.
    await page.unroute('**/catalog/catalog.json');
    await serve(page, tombstone);
    await open(page);
    const card = entry(page);
    await expect(card).toHaveAttribute('data-status', 'withdrawn');
    await expect(card).toContainText('Withdrawn');
    await expect(card).toContainText(
      'Withdrawn from the catalog on 2026-10-10. Reason: The author withdrew it.'
    );
    await expect(card).toContainText(
      'Your installed copy, version 1.0.0, keeps working on this device. It will not be updated.'
    );
    await expect(card).toContainText('Dr. Ana Reyes');
    await expect(
      card.getByRole('button', { name: /Install|Update/ })
    ).toHaveCount(0);
    await axe(page);

    // The copy works: the course opens, with a link into each lesson.
    await card.getByRole('button', { name: 'Show the course' }).click();
    await expect(page.locator('#catCourse')).toBeVisible();
    await expect(page.locator('#catCourse a').first()).toHaveAttribute(
      'href',
      /investigation=/
    );

    // In Spanish.
    await page.getByRole('button', { name: 'Español' }).click();
    await expect(card).toContainText('Retirado del catálogo el 2026-10-10');
    await axe(page);

    // Removing it ends it: a withdrawn package nobody holds is not listed.
    await card
      .getByRole('button', { name: 'Quitar' })
      .or(card.getByRole('button', { name: 'Remove' }))
      .click();
    await expect(card).toHaveCount(0, { timeout: 30_000 });
  });

  test('is not listed for a reader who never installed it', async ({
    page,
  }) => {
    await serve(page, tombstone);
    await open(page);
    await expect(entry(page)).toHaveCount(0);
    await expect(page.locator('#catCount')).toContainText(
      `${REAL.entries.length - 1} of ${REAL.entries.length - 1} shown`
    );
  });
});
