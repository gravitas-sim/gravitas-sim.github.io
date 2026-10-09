import { describe, test, expect } from '@jest/globals';

import { HUMAN_ITEMS, REVIEW_CHECKS } from '../sdk/lib/review.mjs';
import {
  archiveEntry,
  buildCatalog,
  unnamedArchives,
  withdrawnEntry,
} from '../tools/catalog.mjs';
import { InstallError, install, statusOf } from '../js/catalog/install.js';
import { archivesIn } from '../tools/catalog-review.mjs';
import { valid } from './jsonSchemaSubset.js';
import { readFileSync } from 'node:fs';

// =============================================================================
// The catalog's governance: a contributed entry, a withdrawn one, the record
// -----------------------------------------------------------------------------
// CONTRIBUTING_CONTENT.md says what a maintainer's acceptance record holds.
// The generator refuses a contributed package whose record is short, so the
// rules cannot be skipped by a pull request that edits only curation.json.
// =============================================================================

const FIXTURE = 'sdk/fixtures/review/accept';
const accepted = (over = {}) => ({
  path: FIXTURE,
  origin: 'contributed',
  attribution: {
    en: 'Dr. Ana Reyes, Example State University',
    es: 'Dra. Ana Reyes, Universidad Estatal de Ejemplo',
  },
  review: {
    date: '2026-10-09',
    reviewer: 'A maintainer',
    interest: 'none',
    checks: ['sdk review', 'catalog check'],
    confirmed: HUMAN_ITEMS.map(h => h.id),
    notes: 'A fixture.',
  },
  history: [
    {
      version: '1.0.0',
      date: '2026-10-09',
      change: { en: 'Accepted.', es: 'Aceptado.' },
    },
  ],
  ...over,
});
const refusal = async item => {
  try {
    await archiveEntry(item);
  } catch (err) {
    return err.message;
  }
  return null;
};

describe('a contributed package in the catalog', () => {
  test('is listed with its attribution, review and history, and the checks it passed', async () => {
    const { entry, archive } = await archiveEntry(accepted());
    expect(entry.origin).toBe('contributed');
    expect(entry.attribution.en).toMatch(/Ana Reyes/);
    expect(entry.review.mechanical).toEqual([...REVIEW_CHECKS]);
    expect(entry.review.reviewer).toBe('A maintainer');
    expect(entry.history).toHaveLength(1);
    expect(archive.length).toBeGreaterThan(0);
  });

  test('is carried into catalog.json and fits the schema', async () => {
    const real = JSON.parse(readFileSync('catalog/catalog.json', 'utf8'));
    const { catalog } = await buildCatalog({
      catalogVersion: '1.1.0',
      extensions: [accepted()],
    });
    const found = catalog.entries.find(e => e.id === 'fixture.review-accept');
    expect(found.origin).toBe('contributed');
    // The schema's `source` is a directory under extensions/; this fixture lives elsewhere.
    const entry = { ...found, source: 'extensions/fixture-review-accept' };
    const schema = JSON.parse(
      readFileSync('sdk/schemas/catalog-1.schema.json', 'utf8')
    );
    expect(valid(schema, { ...real, entries: [...real.entries, entry] })).toBe(
      true
    );
  });

  test('a maintainers’ own package carries no origin, and keeps what it had', async () => {
    const { entry } = await archiveEntry({
      path: FIXTURE,
      review: { date: '2026-10-09', checks: ['sdk review'] },
    });
    expect(entry.origin).toBeUndefined();
    expect(entry.attribution).toBeUndefined();
    expect(entry.review.mechanical).toEqual([...REVIEW_CHECKS]);
  });
});

describe('the acceptance record is refused when it is short', () => {
  test.each([
    ['no attribution', { attribution: undefined }, /attribution is the author/],
    [
      'an attribution with no English',
      { attribution: { es: 'Solo en español' } },
      /attribution is the author/,
    ],
    [
      'no reviewer',
      { review: { ...accepted().review, reviewer: '' } },
      /review\.reviewer/,
    ],
    [
      'no conflict-of-interest statement',
      { review: { ...accepted().review, interest: undefined } },
      /review\.interest/,
    ],
    [
      'a human item not answered',
      {
        review: {
          ...accepted().review,
          confirmed: HUMAN_ITEMS.map(h => h.id).filter(i => i !== 'rights'),
        },
      },
      /does not include "rights"/,
    ],
    [
      'no history for the version listed',
      {
        history: [
          { version: '0.9.0', date: '2026-10-01', change: { en: 'Draft.' } },
        ],
      },
      /no entry for the version listed, 1\.0\.0/,
    ],
    [
      'a history entry with no change',
      {
        history: [{ version: '1.0.0', date: '2026-10-09' }],
      },
      /history\[0\]/,
    ],
    [
      'a review without a date',
      { review: { ...accepted().review, date: 'yesterday' } },
      /review\.date/,
    ],
    ['an unknown origin', { origin: 'partner' }, /origin is "contributed"/],
  ])('%s', async (_what, over, message) => {
    expect(await refusal(accepted(over))).toMatch(message);
  });

  test('a contributed package without its README’s author and sources line is refused by the review itself', async () => {
    const message = await refusal(
      accepted({ path: 'sdk/examples/finding-exoplanets' })
    );
    expect(message).toMatch(
      /provenance: README.md does not say who the author is/
    );
  });
});

describe('a withdrawn package', () => {
  const tombstone = {
    id: 'community.gone',
    version: '1.2.0',
    type: 'course-pack',
    title: { en: 'A course', es: 'Un curso' },
    origin: 'contributed',
    attribution: { en: 'Dr. Ana Reyes' },
    withdrawn: {
      date: '2026-10-09',
      reason: { en: 'The author withdrew the figure it reproduced.' },
    },
    history: [{ version: '1.2.0', date: '2026-09-01', change: { en: 'x' } }],
  };

  test('becomes a tombstone: no archive, but who wrote it, when and why it left', () => {
    const e = withdrawnEntry(tombstone);
    expect(e.delivery).toBe('withdrawn');
    expect(e.archiveFile).toBeUndefined();
    expect(e.sha256).toBeUndefined();
    expect(e.attribution.en).toBe('Dr. Ana Reyes');
    expect(e.withdrawn.reason.en).toMatch(/withdrew/);
    expect(e.history).toHaveLength(1);
  });

  test('is in the catalog beside the live entries, and fits the schema', async () => {
    const real = JSON.parse(readFileSync('catalog/catalog.json', 'utf8'));
    const { catalog } = await buildCatalog({
      catalogVersion: '1.1.0',
      extensions: [],
      withdrawn: [tombstone],
    });
    const e = catalog.entries.find(x => x.id === 'community.gone');
    expect(e.delivery).toBe('withdrawn');
    const schema = JSON.parse(
      readFileSync('sdk/schemas/catalog-1.schema.json', 'utf8')
    );
    expect(valid(schema, { ...real, entries: [...real.entries, e] })).toBe(
      true
    );
    expect(
      valid(schema, {
        ...real,
        entries: [...real.entries, { ...e, withdrawn: { date: 'soon' } }],
      })
    ).toBe(false);
  });

  test('may not share an id with a live entry', async () => {
    await expect(
      buildCatalog({
        catalogVersion: '1.1.0',
        extensions: [accepted()],
        withdrawn: [{ ...tombstone, id: 'fixture.review-accept' }],
      })
    ).rejects.toThrow(/in the catalog twice/);
  });

  test('is refused without a reason, a date or a version', () => {
    expect(() => withdrawnEntry({ ...tombstone, withdrawn: {} })).toThrow(
      /a date and a reason/
    );
    expect(() => withdrawnEntry({ ...tombstone, version: 'one' })).toThrow(
      /version that was listed/
    );
    expect(() =>
      withdrawnEntry({ ...tombstone, attribution: undefined })
    ).toThrow(/keeps its attribution/);
  });

  test('leaves no archive behind: one that no entry names is found', () => {
    const catalog = {
      entries: [{ delivery: 'archive', archiveFile: 'packages/a-1.0.0.gxp' }],
    };
    expect(unnamedArchives(catalog, ['a-1.0.0.gxp', 'gone-1.2.0.gxp'])).toEqual(
      ['gone-1.2.0.gxp']
    );
  });

  test('cannot be installed, and its status does not depend on a copy', async () => {
    const e = withdrawnEntry(tombstone);
    expect(statusOf(e, null)).toBe('withdrawn');
    expect(statusOf(e, { version: '1.2.0', sha256: 'x' })).toBe('withdrawn');
    const store = { put: () => Promise.reject(new Error('stored')) };
    await expect(
      install(e, {
        catalog: {},
        store,
        fetchBytes: () => null,
        base: 'file:///',
      })
    ).rejects.toMatchObject({ code: 'notInstallable' });
    await expect(
      install(e, {
        catalog: {},
        store,
        fetchBytes: () => null,
        base: 'file:///',
      })
    ).rejects.toBeInstanceOf(InstallError);
  });
});

describe('the CI review', () => {
  test('looks only at archives added directly to catalog/packages', () => {
    expect(
      archivesIn([
        'catalog/packages/b-1.0.0.gxp',
        'catalog/packages/a-1.0.0.gxp',
        'catalog/packages/sub/c.gxp',
        'catalog/catalog.json',
        'extensions/x/course.json',
      ])
    ).toEqual(['catalog/packages/a-1.0.0.gxp', 'catalog/packages/b-1.0.0.gxp']);
  });
});
