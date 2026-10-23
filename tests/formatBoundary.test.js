import { describe, expect, test } from '@jest/globals';

import { INTRO_ASTRONOMY } from '../js/data/courses/intro-astronomy.js';
import { courseApi } from '../js/course/api.js';
import { courseLink, readCourseFragment } from '../js/course/links.js';
import {
  BASE_VERSION,
  FORMAT_VERSION,
  migrateCoursePack,
  packVersion,
  serializePack,
  validateCoursePack,
  withVersion,
} from '../js/course/pack.js';
import * as A from '../js/platform/artifact.js';
import * as IP from '../js/platform/investigation.js';
import * as QB from '../js/platform/questionBank.js';
import { packLink, readPackFragment } from '../js/composer/packLink.js';
import { EXAMPLE_INVESTIGATION } from '../js/composer/example.js';
import { packApi } from '../js/composer/api.js';
import { remixBuiltin } from '../js/composer/remixApi.js';

// =============================================================================
// The writers' rule at the 3.0.0 boundary (Prompt 176)
// -----------------------------------------------------------------------------
// A writer writes the lowest version that carries the payload, so what needs
// nothing new is the bytes 2.0.0 wrote and a 2.0.0 build opens it. These hold
// each writer to that rule and each reader to every version it ever had. What
// a 2.0.0 reader says of the newer forms is tests/compat/boundary.test.js.
// =============================================================================

const clone = v => JSON.parse(JSON.stringify(v));
const api = courseApi();
const problems = p => validateCoursePack(p, api).map(e => e.code);

describe('the course pack', () => {
  const outcomes = [{ id: 'orbits', text: { en: 'Explain orbits' } }];

  test('a course that needs nothing new is /2, and stamping it changes nothing', () => {
    expect(INTRO_ASTRONOMY.formatVersion).toBe(BASE_VERSION);
    expect(packVersion(INTRO_ASTRONOMY)).toBe(2);
    expect(withVersion(INTRO_ASTRONOMY)).toBe(INTRO_ASTRONOMY);
    expect(serializePack(INTRO_ASTRONOMY)).toBe(
      `${JSON.stringify(INTRO_ASTRONOMY, null, 2)}\n`
    );
  });

  test.each([
    ['a term', p => (p.term = 'Spring 2027')],
    ['a profile', p => (p.profile = 'collection')],
    ['outcomes', p => (p.outcomes = clone(outcomes))],
    [
      'an objective mapped to outcomes',
      p => {
        p.outcomes = clone(outcomes);
        p.objectives[0].outcomes = ['orbits'];
      },
    ],
  ])('%s makes it /3, and leaving it out makes it /2 again', (_, add) => {
    const p = clone(INTRO_ASTRONOMY);
    add(p);
    expect(packVersion(p)).toBe(FORMAT_VERSION);
    const written = withVersion(p);
    expect(written.formatVersion).toBe(3);
    expect(JSON.parse(serializePack(p)).formatVersion).toBe(3);
    // Same document, same key order, only the number differs.
    expect(Object.keys(written)).toEqual(Object.keys(p));
    delete written.term;
    delete written.profile;
    delete written.outcomes;
    written.objectives.forEach(o => delete o.outcomes);
    expect(withVersion(written).formatVersion).toBe(2);
  });

  test('the reader reads /2 and /3, and refuses what is neither', () => {
    const p = clone(INTRO_ASTRONOMY);
    expect(problems(p)).toEqual([]);
    p.formatVersion = 3;
    expect(problems(p)).toEqual([]);
    for (const v of [1, 4, '3'])
      expect(problems({ ...p, formatVersion: v })).toContain('formatVersion');
  });

  test('a /1 pack migrates to /2, and a file that is not a pack is not stamped', () => {
    const v1 = {
      format: 'gravitas.course-pack',
      formatVersion: 1,
      id: 'x',
      version: '1.0.0',
      title: { en: 'X' },
      units: [],
    };
    expect(migrateCoursePack(v1, { platform: '1.0.0' }).formatVersion).toBe(2);
    expect(withVersion(v1)).toBe(v1);
    const manifest = { format: 'gravitas.course-manifest', formatVersion: 1 };
    expect(withVersion(manifest)).toBe(manifest);
    expect(withVersion(null)).toBe(null);
  });

  test('the course home link has the pack’s prefix: c2, or c3 when /3 is needed', async () => {
    const root = 'https://example.test/';
    const plain = await courseLink(INTRO_ASTRONOMY, { root });
    expect(plain.url).toMatch(/\/course\/#c2/);
    const termed = { ...clone(INTRO_ASTRONOMY), term: 'Spring 2027' };
    const link = await courseLink(termed, { root });
    expect(link.url).toMatch(/\/course\/#c3/);
    const read = await readCourseFragment(link.url.split('#')[1]);
    expect(read.formatVersion).toBe(3);
    expect(read.term).toBe('Spring 2027');
    expect(
      (await readCourseFragment(plain.url.split('#')[1])).formatVersion
    ).toBe(2);
  });
});

describe('the artifact envelope', () => {
  const envelope = (...qs) =>
    A.artifact({
      id: 'e',
      source: { kind: 'pipeline', id: 'p' },
      quantities: qs.map((u, i) => ({
        id: `q${i}`,
        value: 1,
        unit: '',
        uncertainty: u,
        origin: 'measured',
      })),
    });
  const sigma = { kind: 'sigma', sigma: 0.1, basis: 'data' };

  test('what 2.0.0 could say is /1', () => {
    for (const u of [sigma, { kind: 'none' }])
      expect(envelope(u).formatVersion).toBe(1);
    const interval = envelope({
      kind: 'interval',
      lo: 1,
      hi: 2,
      level: 0.68,
      basis: 'data',
    });
    expect(interval.formatVersion).toBe(1);
  });

  test.each([
    [
      'a state beyond sigma, interval and none',
      () => envelope({ kind: 'not-constrained' }),
    ],
    [
      'a limit',
      () => envelope({ kind: 'limit', bound: 'upper', basis: 'data' }),
    ],
    [
      'a failed quantity with no value',
      () => {
        const e = envelope(sigma);
        e.quantities[0].value = null;
        e.quantities[0].uncertainty = { kind: 'failed', reason: 'no data' };
        return A.artifact(e);
      },
    ],
    [
      'a correlation',
      () => {
        const e = envelope(sigma, sigma);
        e.quantities[0].correlatedWith = [{ id: 'q1', rho: 0.3 }];
        return A.artifact(e);
      },
    ],
    [
      'a fit-result record',
      () =>
        A.artifact({
          ...envelope(sigma),
          fit: {
            model: { id: 'm', version: '1' },
            parameters: ['q0'],
            convergence: { converged: true },
          },
        }),
    ],
  ])('%s is /2', (_, make) => {
    const e = make();
    expect(e.formatVersion).toBe(2);
    expect(A.validateArtifact(e)).toEqual([]);
  });

  test('the reader reads /1 and /2, and refuses a version past them', () => {
    const e = envelope(sigma);
    expect(A.validateArtifact(e)).toEqual([]);
    expect(A.validateArtifact({ ...e, formatVersion: 2 })).toEqual([]);
    for (const v of [0, 3])
      expect(
        A.validateArtifact({ ...e, formatVersion: v }).map(p => p.path)
      ).toContain('formatVersion');
  });

  test('legacyView hands a 2.0.0 reader /1', () => {
    const e = envelope({ kind: 'not-constrained' });
    expect(e.formatVersion).toBe(2);
    const view = A.legacyView(e);
    expect(view.formatVersion).toBe(1);
    expect(A.validateArtifact(view)).toEqual([]);
  });
});

describe('the investigation pack and the question bank', () => {
  const criteria = extra => [
    {
      name: { en: 'Gets the number' },
      ...extra,
      levels: [
        { label: { en: 'Full' }, text: { en: 'Within tolerance.' } },
        { label: { en: 'Not yet' }, text: { en: 'Outside it.' } },
      ],
    },
  ];
  const withCriteria = extra => {
    const p = clone(EXAMPLE_INVESTIGATION);
    p.steps.find(s => s.type === 'question').rubricCriteria = criteria(extra);
    return p;
  };

  test('a pack with no criterion semantics is /1 and stamping changes nothing', () => {
    expect(EXAMPLE_INVESTIGATION.formatVersion).toBe(IP.BASE_VERSION);
    expect(IP.packVersion(EXAMPLE_INVESTIGATION)).toBe(1);
    expect(IP.withVersion(EXAMPLE_INVESTIGATION)).toBe(EXAMPLE_INVESTIGATION);
    expect(IP.packVersion(withCriteria({}))).toBe(1);
  });

  test.each([
    ['a kind', { kind: 'correctness' }],
    ['a depth', { depth: 'quantitative' }],
    ['a weight', { weight: 2 }],
  ])('%s makes a pack /2', (_, extra) => {
    const p = withCriteria(extra);
    expect(IP.packVersion(p)).toBe(2);
    expect(IP.withVersion(p).formatVersion).toBe(2);
    expect(JSON.parse(IP.serializePack(p)).formatVersion).toBe(2);
  });

  test('so does a criterion in the pack’s bank, and a bank of its own', () => {
    const p = clone(EXAMPLE_INVESTIGATION);
    const item = {
      id: 'why',
      kind: 'short',
      rubricCriteria: criteria({ kind: 'reasoning' }),
    };
    p.bank.items.push(item);
    expect(IP.packVersion(p)).toBe(2);
    expect(QB.bankVersion([item])).toBe(2);
    expect(QB.bankVersion(EXAMPLE_INVESTIGATION.bank.items)).toBe(1);
    expect(QB.bankVersion(undefined)).toBe(1);
  });

  test('the readers read /1 and /2 and refuse /3', () => {
    const p = withCriteria({ kind: 'correctness' });
    for (const v of [1, 2]) {
      expect(IP.migrateInvestigationPack({ ...p, formatVersion: v }).ok).toBe(
        true
      );
      const errs = IP.validateInvestigationPack(
        { ...p, formatVersion: v },
        packApi()
      );
      expect(errs.filter(e => e.path === 'formatVersion')).toEqual([]);
    }
    expect(IP.migrateInvestigationPack({ ...p, formatVersion: 3 })).toEqual({
      ok: false,
      code: 'newer',
      vars: { version: 3 },
    });
  });

  test('the investigation link has the pack’s prefix: i1, or i2 when /2 is needed', async () => {
    const root = 'https://example.test/';
    const plain = await packLink(clone(EXAMPLE_INVESTIGATION), { root });
    expect(plain.fragment).toMatch(/^i1/);
    const link = await packLink(withCriteria({ kind: 'correctness' }), {
      root,
    });
    expect(link.fragment).toMatch(/^i2/);
    const read = await readPackFragment(link.fragment);
    expect(read.ok).toBe(true);
    expect(read.pack.formatVersion).toBe(2);
    expect((await readPackFragment(plain.fragment)).pack.formatVersion).toBe(1);
  });

  test('a remix of a lesson with criterion kinds is written as /2', async () => {
    const { pack } = await remixBuiltin('orbital-energy', { id: 'my-oe' });
    expect(IP.packVersion(pack)).toBe(2);
    expect(pack.formatVersion).toBe(2);
  });
});
