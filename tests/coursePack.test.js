// =============================================================================
// Course packs /2: the format, the review, the links, the manifest
// -----------------------------------------------------------------------------
// js/course/pack.js, review.js, api.js, links.js and manifest.js, and the
// course the builder was proved on (js/data/courses/intro-astronomy.js):
//
//   - the format: each kind, each rule, and hostile files refused for one
//     reason before any rule reads them;
//   - migration from /1, and the reviewed upgrade that pins a migrated pack;
//   - how a pin stands against the lessons as they are, with facts made to
//     order: same, changed, compatible, major, moved, unpinned, missing, and
//     whether each needs review in an exact and a compatible pack;
//   - what the audit finds: sequences a course breaks, an assignment's
//     missing setup, licenses, translations, objectives, instructor guides;
//   - time, the dependency graph, the manifest;
//   - links: stable, and each one the thing the app already opens;
//   - the copied data (js/course/datasets.js) against its sources, the page
//     registrations, the precache, and every word in both languages.
// =============================================================================

import { describe, test, expect, beforeAll } from '@jest/globals';
import { readFileSync } from 'node:fs';

import {
  FORMAT,
  ITEM_KINDS,
  itemsOf,
  migrateCoursePack,
  safeUrl,
  validateCoursePack,
} from '../js/course/pack.js';
import {
  STATUS,
  auditCourse,
  bumpVersion,
  dependencyGraph,
  estimate,
  lessonDigest,
  minutesRange,
  needsReview,
  offlineOf,
  pinFor,
  reviewCoursePack,
  reviewItem,
  shortHash,
  textsOf,
  translationState,
  upgradeCoursePack,
} from '../js/course/review.js';
import {
  LESSONS,
  PLATFORM_API,
  courseApi,
  courseFacts,
  newAssignmentId,
} from '../js/course/api.js';
import {
  assignmentPayload,
  courseLink,
  itemLink,
  readCourseFragment,
  scenarioPayload,
} from '../js/course/links.js';
import { courseManifest, licenseOf } from '../js/course/manifest.js';
import { DATASETS, GUIDED } from '../js/course/datasets.js';
import { INTRO_ASTRONOMY } from '../js/data/courses/intro-astronomy.js';
import { BUILTIN_COURSES } from '../js/data/courses/index.js';
import { loadInvestigation } from '../js/data/investigations/registry.js';
import { validateAssignment } from '../js/assignments/assignment.js';
import { decodeTagged, decodePayload } from '../js/shareState.js';
import { formatSeed, parseSeed } from '../js/rng.js';
import { EN_COURSE } from '../js/i18n/en.course.js';
import { ES_COURSE } from '../js/i18n/es.course.js';
import { EN_COURSEHOME } from '../js/i18n/en.courseHome.js';
import { ES_COURSEHOME } from '../js/i18n/es.courseHome.js';
import { EN_STUDIO } from '../js/i18n/en.studio.js';
import { EN_OBSERVATORY } from '../js/i18n/en.observatory.js';
import { ES_OBSERVATORY } from '../js/i18n/es.observatory.js';

const clone = v => JSON.parse(JSON.stringify(v));
const ROOT = 'https://gravitas-sim.online/';
const api = courseApi();
const load = id => loadInvestigation(id, 'en');
const codes = errors => errors.map(e => e.code);
const TODAY = '2026-09-28';

let facts;
beforeAll(async () => {
  facts = await courseFacts(INTRO_ASTRONOMY, { load });
}, 60_000);

/** A small valid pack with one item of each kind. */
function smallPack() {
  return {
    format: FORMAT,
    formatVersion: 2,
    id: 'small',
    version: '1.0.0',
    gravitas: '1.0.0',
    locales: ['en'],
    pinning: 'compatible',
    title: { en: 'Small' },
    objectives: [{ id: 'orbits', text: { en: 'Orbits.' } }],
    units: [
      {
        id: 'one',
        title: { en: 'One' },
        items: [
          {
            id: 'kepler',
            kind: 'lesson',
            lesson: 'keplers-laws',
            objectives: ['orbits'],
          },
          {
            id: 'sky',
            kind: 'scenario',
            scenario: 'Solar System',
            seed: 'sky-1',
            minutes: 10,
          },
          {
            id: 'light',
            kind: 'dataset',
            dataset: 'tess-light-curve',
            minutes: 15,
          },
          {
            id: 'book',
            kind: 'reading',
            minutes: 20,
            title: { en: 'A chapter' },
            cite: {
              authors: 'A. Author',
              year: 2020,
              source: 'A press',
              doi: '10.1119/1.1234',
            },
            license: 'CC BY 4.0',
            access: 'open',
          },
          {
            id: 'cut',
            kind: 'assignment',
            lesson: 'transit-photometry',
            steps: ['a-firefly-beside-a-lighthouse', 'your-first-transit'],
            assignment: { id: '260928abcd1234', created: TODAY },
          },
        ],
      },
    ],
  };
}

describe('the proving course', () => {
  test('is a valid /2 pack of every kind, in four units and two languages', () => {
    expect(validateCoursePack(INTRO_ASTRONOMY, api)).toEqual([]);
    expect(INTRO_ASTRONOMY.units).toHaveLength(4);
    expect(INTRO_ASTRONOMY.locales).toEqual(['en', 'es']);
    const kinds = new Set(itemsOf(INTRO_ASTRONOMY).map(e => e.item.kind));
    expect([...kinds].sort()).toEqual([...ITEM_KINDS].sort());
    expect(
      new Set(itemsOf(INTRO_ASTRONOMY).map(e => e.item.path || 'core'))
    ).toEqual(new Set(['core', 'intro', 'advanced']));
  });

  test('audits with no problem, and every text translated', () => {
    const findings = auditCourse(INTRO_ASTRONOMY, facts);
    expect(findings.filter(f => f.level === 'error')).toEqual([]);
    expect(
      findings.filter(f =>
        [
          'untranslated',
          'stale',
          'assumes',
          'objectiveUnserved',
          'noTime',
        ].includes(f.code)
      )
    ).toEqual([]);
    for (const x of textsOf(INTRO_ASTRONOMY))
      expect(translationState(x.v, 'es')).toBe('done');
  });

  test('pins every lesson it names, with an assignment that needs no more steps', () => {
    for (const { item } of itemsOf(INTRO_ASTRONOMY)) {
      if (!item.lesson) continue;
      expect(item.pin).toBeDefined();
      if (item.kind === 'assignment') {
        const lesson = facts.lessons.get(item.lesson);
        expect(lesson.resolve(item.steps).sids).toEqual(item.steps);
        expect(item.pin.f).toHaveLength(item.steps.length);
      }
    }
  });

  test('is what ?course=intro-astronomy opens', async () => {
    expect(await BUILTIN_COURSES['intro-astronomy']()).toBe(INTRO_ASTRONOMY);
  });

  test('takes five or six fifty-minute meetings on its core path, as its guide says', () => {
    const e = estimate(INTRO_ASTRONOMY, facts);
    expect(e.paths.core.lo).toBeGreaterThanOrEqual(5 * 50 - 10);
    expect(e.paths.core.hi).toBeLessThanOrEqual(6 * 50 + 10);
    expect(INTRO_ASTRONOMY.teacherGuide.en).toMatch(/five or six fifty-minute/);
  });

  test('has a course link a learning platform keeps whole', async () => {
    const link = await courseLink(INTRO_ASTRONOMY, { root: ROOT });
    expect(link.comfortable).toBe(true);
    expect(
      await readCourseFragment(link.url.slice(link.url.indexOf('#')))
    ).toEqual(INTRO_ASTRONOMY);
  });
});

describe('the format', () => {
  test('a small pack of each kind is valid', () => {
    expect(validateCoursePack(smallPack(), api)).toEqual([]);
  });

  test.each([
    ['an unknown field', p => (p.units[0].items[0].validate = 'x'), 'field'],
    ['an unknown kind', p => (p.units[0].items[0].kind = 'quiz'), 'kind'],
    [
      'a lesson Gravitas lacks',
      p => (p.units[0].items[0].lesson = 'no-such'),
      'lesson',
    ],
    [
      'a scenario Gravitas lacks',
      p => (p.units[0].items[1].scenario = 'Nowhere'),
      'scenario',
    ],
    [
      'a dataset Gravitas lacks',
      p => (p.units[0].items[2].dataset = 'nothing'),
      'dataset',
    ],
    [
      'a scenario with no seed word',
      p => (p.units[0].items[1].seed = 'no spaces'),
      'seed',
    ],
    [
      'a scenario without minutes',
      p => delete p.units[0].items[1].minutes,
      'minutes',
    ],
    [
      'a duplicate item id',
      p => (p.units[0].items[1].id = 'kepler'),
      'duplicate',
    ],
    [
      'the same lesson twice',
      p =>
        p.units[0].items.push({
          id: 'again',
          kind: 'lesson',
          lesson: 'keplers-laws',
        }),
      'lessonTwice',
    ],
    [
      'an objective the course lacks',
      p => (p.units[0].items[0].objectives = ['none']),
      'objective',
    ],
    [
      'a need that comes later',
      p => (p.units[0].items[0].needs = ['sky']),
      'needsEarlier',
    ],
    [
      'markup in a note',
      p => (p.units[0].items[0].studentNote = { en: '<b>hi</b>' }),
      'plain',
    ],
    [
      'an entity in a title',
      p => (p.title = { en: 'Stars &amp; planets' }),
      'plain',
    ],
    [
      'a web address in prose',
      p => (p.summary = { en: 'See https://example.org' }),
      'textUnsafe',
    ],
    [
      'an http reading',
      p => (p.units[0].items[3].cite.url = 'http://example.org/'),
      'url',
    ],
    [
      'a script address',
      p => (p.units[0].items[3].cite.url = 'javascript:alert(1)'),
      'url',
    ],
    [
      'a non-canonical address',
      p => (p.units[0].items[3].cite.url = 'https://Example.org'),
      'url',
    ],
    [
      'a malformed DOI',
      p => (p.units[0].items[3].cite.doi = 'doi:10.1/x'),
      'doi',
    ],
    [
      'a reading with no access',
      p => delete p.units[0].items[3].access,
      'access',
    ],
    [
      'an assignment step twice',
      p => p.units[0].items[4].steps.push('your-first-transit'),
      'stepsTwice',
    ],
    [
      'an assignment with no date',
      p => (p.units[0].items[4].assignment.created = 'today'),
      'date',
    ],
    ['no units', p => (p.units = []), 'units'],
    ['a pinning that is neither', p => (p.pinning = 'loose'), 'pinning'],
    ['no platform version', p => delete p.gravitas, 'gravitas'],
  ])('refuses %s', (_, edit, code) => {
    const p = smallPack();
    edit(p);
    expect(codes(validateCoursePack(p, api))).toContain(code);
  });

  test('the core may not depend on an optional item; an optional one may depend on the core', () => {
    const p = smallPack();
    p.units[0].items[1].path = 'advanced';
    p.units[0].items[2].needs = ['sky'];
    expect(codes(validateCoursePack(p, api))).toContain('needsPath');
    p.units[0].items[2].path = 'advanced';
    expect(validateCoursePack(p, api)).toEqual([]);
    p.units[0].items[2].path = 'intro';
    expect(codes(validateCoursePack(p, api))).toContain('needsPath');
  });

  test('an exact pack pins every lesson; a pin must fit what it pins', () => {
    const p = smallPack();
    p.pinning = 'exact';
    expect(
      codes(validateCoursePack(p, api)).filter(c => c === 'pinRequired')
    ).toHaveLength(2);
    p.units[0].items[0].pin = { fp: 'abcdef01', n: 23 };
    p.units[0].items[4].pin = { fp: 'abcdef01', n: 29, f: ['00000000'] };
    expect(codes(validateCoursePack(p, api))).toEqual(['stepHashes']);
    p.units[0].items[4].pin.f.push('11111111');
    expect(validateCoursePack(p, api)).toEqual([]);
    p.units[0].items[0].pin.f = ['00000000'];
    expect(codes(validateCoursePack(p, api))).toContain('field');
  });

  test('references are checked only against lists given, so an archive always opens', () => {
    const p = smallPack();
    p.units[0].items[0].lesson = 'retired-lesson';
    expect(codes(validateCoursePack(p, api))).toContain('lesson');
    expect(validateCoursePack(p, { locales: ['en', 'es'] })).toEqual([]);
  });

  test('safeUrl takes only a canonical https address with no credentials', () => {
    expect(safeUrl('https://openstax.org/details/books/astronomy-2e')).toBe(
      true
    );
    expect(safeUrl('https://user:pw@example.org/')).toBe(false);
    expect(safeUrl('https://example.org')).toBe(false);
    expect(safeUrl('data:text/html,hi')).toBe(false);
    expect(safeUrl('//example.org/')).toBe(false);
  });
});

describe('hostile files', () => {
  test('a prototype key is refused for that reason alone, and pollutes nothing', () => {
    const p = JSON.parse(
      '{"format":"gravitas.course-pack","formatVersion":2,"units":[{"items":[{"__proto__":{"polluted":true}}]}]}'
    );
    const errors = validateCoursePack(p, api);
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe('unsafeKey');
    expect({}.polluted).toBeUndefined();
  });

  test('an enormous, a deep, a non-data and a non-finite file are each refused once', () => {
    const big = smallPack();
    big.units[0].items[0].objectives = Array.from(
      { length: 50_000 },
      () => 'orbits'
    );
    expect(codes(validateCoursePack(big, api))).toEqual(['tooLarge']);
    const deep = smallPack();
    let at = deep;
    for (let i = 0; i < 20; i++) at = at.nest = {};
    expect(codes(validateCoursePack(deep, api))).toEqual(['tooDeep']);
    const fn = smallPack();
    fn.units[0].items[0].studentNote = { en: () => 'code' };
    expect(codes(validateCoursePack(fn, api))).toEqual(['notData']);
    const nan = smallPack();
    nan.units[0].items[1].minutes = Infinity;
    expect(codes(validateCoursePack(nan, api))).toEqual(['number']);
  });

  test('a string is never read as markup by the course home: the format refuses markup', () => {
    const p = smallPack();
    p.units[0].title = { en: '<img src=x onerror=alert(1)>' };
    expect(codes(validateCoursePack(p, api))).toContain('plain');
  });
});

describe('migration from /1', () => {
  const v1 = JSON.parse(
    readFileSync('extensions/pulsating-stars/course.json', 'utf8')
  );

  test('a catalog course becomes a /2 pack with the same units and lessons, unpinned', async () => {
    const p = migrateCoursePack(v1, { platform: PLATFORM_API });
    expect(p.formatVersion).toBe(2);
    expect(validateCoursePack(p, api)).toEqual([]);
    expect(p.units.map(u => u.items.map(i => i.lesson))).toEqual(
      v1.units.map(u => u.lessons.map(l => l.lesson))
    );
    const f = await courseFacts(p, { load });
    expect(new Set(reviewCoursePack(p, f).map(r => r.status))).toEqual(
      new Set([STATUS.UNPINNED])
    );
  });

  test('upgrading every item pins it, and the review is then clear', async () => {
    const p = migrateCoursePack(v1, { platform: PLATFORM_API });
    const f = await courseFacts(p, { load });
    const ids = itemsOf(p).map(e => e.item.id);
    const r = upgradeCoursePack(p, f, ids, { today: TODAY, newAssignmentId });
    expect(r.upgraded).toEqual(ids);
    expect(r.bump).toBe('minor');
    expect(r.pack.version).toBe(bumpVersion(v1.version, 'minor'));
    expect(
      reviewCoursePack(r.pack, f).every(x => x.status === STATUS.SAME)
    ).toBe(true);
    // A pinned pack can now be exact.
    expect(validateCoursePack({ ...r.pack, pinning: 'exact' }, api)).toEqual(
      []
    );
  });

  test('a /2 pack is left as it is', () => {
    expect(migrateCoursePack(INTRO_ASTRONOMY, { platform: PLATFORM_API })).toBe(
      INTRO_ASTRONOMY
    );
  });
});

describe('pins against the lessons as they are', () => {
  /** Facts for one lesson, made to order. */
  const factsWith = (lesson = {}) => ({
    platform: '1.0.0',
    locales: ['en', 'es'],
    lessons: new Map([
      [
        'l',
        {
          id: 'l',
          n: 3,
          fp: 'aaaaaaaa',
          hashes: new Map([
            ['s1', '11111111'],
            ['s2', '22222222'],
            ['s3', '33333333'],
          ]),
          pkg: null,
          duration: { lo: 30, hi: 40 },
          locales: ['en', 'es'],
          guide: true,
          ...lesson,
        },
      ],
    ]),
    scenarios: new Map(),
    datasets: new Map(),
    sequences: [],
  });
  const lessonItem = pin => ({
    id: 'x',
    kind: 'lesson',
    lesson: 'l',
    ...(pin ? { pin } : {}),
  });
  const assignmentItem = (steps, f) => ({
    id: 'a',
    kind: 'assignment',
    lesson: 'l',
    steps,
    assignment: { id: 'old', created: '2025-01-01' },
    pin: { fp: 'aaaaaaaa', n: 3, f },
  });

  test.each([
    ['same', lessonItem({ fp: 'aaaaaaaa', n: 3 }), {}, STATUS.SAME],
    ['changed', lessonItem({ fp: 'bbbbbbbb', n: 3 }), {}, STATUS.CHANGED],
    ['unpinned', lessonItem(null), {}, STATUS.UNPINNED],
    [
      'compatible',
      lessonItem({ fp: 'aaaaaaaa', n: 3, pkg: ['gravitas.lesson.l', '1.0.0'] }),
      { pkg: { id: 'gravitas.lesson.l', version: '1.2.0' } },
      STATUS.COMPATIBLE,
    ],
    [
      'changed within a major',
      lessonItem({ fp: 'bbbbbbbb', n: 3, pkg: ['gravitas.lesson.l', '1.0.0'] }),
      { pkg: { id: 'gravitas.lesson.l', version: '1.2.0' } },
      STATUS.CHANGED,
    ],
    [
      'major',
      lessonItem({ fp: 'aaaaaaaa', n: 3, pkg: ['gravitas.lesson.l', '1.0.0'] }),
      { pkg: { id: 'gravitas.lesson.l', version: '2.0.0' } },
      STATUS.MAJOR,
    ],
    [
      'moved to another package',
      lessonItem({ fp: 'aaaaaaaa', n: 3, pkg: ['gravitas.lesson.l', '1.0.0'] }),
      { pkg: { id: 'gravitas.other', version: '1.0.0' } },
      STATUS.MOVED,
    ],
    [
      'moved into the core',
      lessonItem({ fp: 'aaaaaaaa', n: 3, pkg: ['gravitas.lesson.l', '1.0.0'] }),
      {},
      STATUS.MOVED,
    ],
  ])('%s', (_, item, lesson, status) => {
    expect(reviewItem(item, factsWith(lesson), 'compatible').status).toBe(
      status
    );
  });

  test('a lesson Gravitas no longer has is missing', () => {
    const f = factsWith();
    f.lessons.clear();
    expect(
      reviewItem(lessonItem({ fp: 'aaaaaaaa', n: 3 }), f, 'compatible').status
    ).toBe(STATUS.MISSING);
  });

  test('an exact pack reviews every change; a compatible one only what can break', () => {
    const table = Object.values(STATUS).map(s => [
      s,
      needsReview(s, 'exact'),
      needsReview(s, 'compatible'),
    ]);
    expect(table).toEqual([
      ['same', false, false],
      ['changed', true, false],
      ['compatible', true, false],
      ['major', true, true],
      ['moved', true, true],
      ['unpinned', true, false],
      ['missing', true, true],
    ]);
  });

  test('an assigned step that is gone or rewritten needs review even in a compatible pack', () => {
    const f = factsWith();
    const gone = reviewItem(
      assignmentItem(['s1', 's9'], ['11111111', '99999999']),
      f,
      'compatible'
    );
    expect(gone.detail.missingSteps).toEqual(['s9']);
    expect(gone.needsReview).toBe(true);
    const rewritten = reviewItem(
      assignmentItem(['s1', 's2'], ['11111111', 'ffffffff']),
      f,
      'compatible'
    );
    expect(rewritten.detail.changedSteps).toEqual(['s2']);
    expect(rewritten.needsReview).toBe(true);
    const fine = reviewItem(
      assignmentItem(['s1', 's2'], ['11111111', '22222222']),
      f,
      'compatible'
    );
    expect(fine.needsReview).toBe(false);
  });

  test('the upgrade re-pins what was reviewed, and re-issues a rewritten assignment', () => {
    const pack = {
      ...smallPack(),
      units: [
        {
          id: 'u',
          title: { en: 'U' },
          items: [
            lessonItem({ fp: 'bbbbbbbb', n: 2 }),
            assignmentItem(
              ['s1', 's2', 's9'],
              ['11111111', 'ffffffff', '99999999']
            ),
            { ...lessonItem({ fp: 'bbbbbbbb', n: 2 }), id: 'untouched' },
          ],
        },
      ],
    };
    const f = factsWith();
    const r = upgradeCoursePack(pack, f, ['x', 'a'], {
      today: TODAY,
      newAssignmentId: () => 'new-id',
    });
    expect(r.upgraded).toEqual(['x', 'a']);
    expect(r.bump).toBe('major');
    expect(r.pack.version).toBe('2.0.0');
    const [lesson, assignment, untouched] = r.pack.units[0].items;
    expect(lesson.pin).toEqual({ fp: 'aaaaaaaa', n: 3 });
    expect(assignment.steps).toEqual(['s1', 's2']);
    expect(assignment.assignment).toEqual({ id: 'new-id', created: TODAY });
    expect(assignment.pin.f).toEqual(['11111111', '22222222']);
    expect(untouched.pin).toEqual({ fp: 'bbbbbbbb', n: 2 });
    // The pack upgraded is a copy: the original still says what it was.
    expect(pack.units[0].items[0].pin.fp).toBe('bbbbbbbb');
  });

  test('a lesson that only changed is a minor upgrade, and keeps no assignment id it has', () => {
    const pack = {
      ...smallPack(),
      units: [
        {
          id: 'u',
          title: { en: 'U' },
          items: [lessonItem({ fp: 'bbbbbbbb', n: 2 })],
        },
      ],
    };
    const r = upgradeCoursePack(pack, factsWith(), ['x'], {
      today: TODAY,
      newAssignmentId: () => 'n',
    });
    expect(r.bump).toBe('minor');
    expect(r.pack.version).toBe('1.1.0');
  });

  test('a missing lesson cannot be upgraded, only removed', () => {
    const f = factsWith();
    f.lessons.clear();
    const pack = {
      ...smallPack(),
      units: [
        {
          id: 'u',
          title: { en: 'U' },
          items: [lessonItem({ fp: 'aaaaaaaa', n: 3 })],
        },
      ],
    };
    const r = upgradeCoursePack(pack, f, ['x'], {
      today: TODAY,
      newAssignmentId: () => 'n',
    });
    expect(r.refused).toEqual(['x']);
    expect(r.bump).toBeNull();
    expect(r.pack.version).toBe('1.0.0');
  });

  test('a real lesson pins to its steps, and a translation does not move the pin', async () => {
    const en = await loadInvestigation('tides', 'en');
    const es = await loadInvestigation('tides', 'es');
    const f = await courseFacts(
      { units: [{ items: [{ lesson: 'tides' }] }] },
      { load: () => en }
    );
    const g = await courseFacts(
      { units: [{ items: [{ lesson: 'tides' }] }] },
      { load: () => es }
    );
    expect(f.lessons.get('tides').fp).toBe(g.lessons.get('tides').fp);
    expect(f.lessons.get('tides').fp).toBe(
      lessonDigest([...f.lessons.get('tides').hashes])
    );
    const item = { id: 't', kind: 'lesson', lesson: 'tides' };
    expect(pinFor(item, f.lessons.get('tides'))).toEqual({
      fp: f.lessons.get('tides').fp,
      n: en.steps.length,
    });
  });
});

describe('the audit', () => {
  test('names a lesson whose sequence the course breaks', async () => {
    const p = smallPack();
    p.units[0].items[0] = {
      id: 'energy',
      kind: 'lesson',
      lesson: 'orbital-energy',
    };
    const f = await courseFacts(p, { load });
    const found = auditCourse(p, f).filter(x => x.code === 'assumes');
    expect(found.map(x => [x.vars.lesson, x.vars.needs])).toEqual([
      ['orbital-energy', 'keplers-laws'],
    ]);
  });

  test('refuses an assignment without the steps its steps need', async () => {
    const p = smallPack();
    p.units[0].items[4].steps = ['your-first-transit'];
    const f = await courseFacts(p, { load });
    const found = auditCourse(p, f).filter(x => x.code === 'assignmentNeeds');
    expect(found).toHaveLength(1);
    expect(found[0].level).toBe('error');
    expect(found[0].vars.sids).toContain('a-firefly-beside-a-lighthouse');
  });

  test('names a prerequisite that is also in the course, and an unserved objective', async () => {
    const p = smallPack();
    p.prerequisites = [{ lesson: 'keplers-laws' }];
    p.objectives.push({ id: 'unused', text: { en: 'Nothing serves this.' } });
    const f = await courseFacts(p, { load });
    const found = auditCourse(p, f).map(x => x.code);
    expect(found).toContain('prerequisiteIncluded');
    expect(found).toContain('objectiveUnserved');
  });

  test('licenses: a dataset with none is an error, one stating none a warning, a reading without one a warning', async () => {
    const p = smallPack();
    p.units[0].items[2].dataset = 'mist-isochrones';
    delete p.units[0].items[3].license;
    delete p.units[0].items[3].cite.doi;
    const f = await courseFacts(p, { load });
    const found = auditCourse(p, f).map(x => [x.code, x.level]);
    expect(found).toContainEqual(['licenseNotStated', 'warning']);
    expect(found).toContainEqual(['readingLicense', 'warning']);
    expect(found).toContainEqual(['readingAddress', 'warning']);
    f.datasets.get('mist-isochrones').license = null;
    expect(auditCourse(p, f).map(x => [x.code, x.level])).toContainEqual([
      'noLicense',
      'error',
    ]);
  });

  test('a catalog dataset is installed first, and one for another Gravitas cannot be used', async () => {
    const catalog = {
      entries: [
        {
          id: 'community.ok-pack',
          type: 'data-pack',
          title: { en: 'OK' },
          gravitas: '^1.0.0',
          licenses: [{ license: 'CC0' }],
        },
        {
          id: 'community.future',
          type: 'data-pack',
          title: { en: 'Future' },
          gravitas: '^2.0.0',
          licenses: [{ license: 'CC0' }],
        },
      ],
    };
    const p = smallPack();
    p.units[0].items.push(
      { id: 'ok', kind: 'dataset', dataset: 'community.ok-pack', minutes: 10 },
      {
        id: 'future',
        kind: 'dataset',
        dataset: 'community.future',
        minutes: 10,
      }
    );
    expect(validateCoursePack(p, courseApi(catalog))).toEqual([]);
    const f = await courseFacts(p, { load, catalog });
    const found = auditCourse(p, f).map(x => [x.code, x.level, x.vars.dataset]);
    expect(found).toContainEqual(['install', 'note', 'community.ok-pack']);
    expect(found).toContainEqual([
      'datasetIncompatible',
      'error',
      'community.future',
    ]);
    expect(offlineOf(p.units[0].items[5], f)).toBe('install');
  });

  test('translations: a missing and an out-of-date Spanish text are counted', async () => {
    const p = smallPack();
    p.locales = ['en', 'es'];
    p.title = { en: 'Small', es: 'Pequeño', esOf: shortHash('Small') };
    p.units[0].title = {
      en: 'One, rewritten',
      es: 'Uno',
      esOf: shortHash('One'),
    };
    const f = await courseFacts(p, { load });
    const found = auditCourse(p, f);
    expect(found.find(x => x.code === 'stale').vars.n).toBe(1);
    expect(found.find(x => x.code === 'untranslated').vars.n).toBeGreaterThan(
      0
    );
  });

  test('names each lesson with no instructor guide yet', async () => {
    // Every lesson Gravitas ships has one; a packaged lesson may not.
    const p = smallPack();
    const f = await courseFacts(p, { load });
    expect(auditCourse(p, f).filter(x => x.code === 'noGuide')).toEqual([]);
    f.lessons.set('keplers-laws', {
      ...f.lessons.get('keplers-laws'),
      guide: false,
    });
    expect(
      auditCourse(p, f)
        .filter(x => x.code === 'noGuide')
        .map(x => x.vars.lesson)
    ).toEqual(['keplers-laws']);
  });
});

describe('time, the graph and the manifest', () => {
  test("a lesson takes its card's range; an assignment its share; declared minutes win", async () => {
    const p = smallPack();
    const f = await courseFacts(p, { load });
    const e = estimate(p, f);
    const kepler = minutesRange(
      LESSONS.find(m => m.id === 'keplers-laws').duration
    );
    expect(e.items.get('kepler')).toEqual(kepler);
    const transit = f.lessons.get('transit-photometry');
    expect(e.items.get('cut')).toEqual({
      lo: Math.max(5, Math.round((transit.duration.lo * 2) / transit.n)),
      hi: Math.max(5, Math.round((transit.duration.hi * 2) / transit.n)),
    });
    p.units[0].items[4].minutes = 30;
    expect(estimate(p, f).items.get('cut')).toEqual({ lo: 30, hi: 30 });
    expect(e.paths.core.lo).toBe(
      [...e.items.values()].reduce((s, r) => s + r.lo, 0)
    );
  });

  test('the graph joins items to what they open and lessons to what they use', () => {
    const g = dependencyGraph(INTRO_ASTRONOMY, facts);
    const has = (from, to, kind) =>
      g.edges.some(e => e.from === from && e.to === to && e.kind === kind);
    expect(has('item:orbital-energy', 'item:keplers-laws', 'needs')).toBe(true);
    expect(
      has('item:a-first-transit', 'lesson:transit-photometry', 'opens')
    ).toBe(true);
    expect(
      has('lesson:transit-photometry', 'scenario:Transit Lab', 'uses')
    ).toBe(true);
    expect(has('lesson:orbital-energy', 'lesson:keplers-laws', 'assumes')).toBe(
      true
    );
    expect(
      has('item:a-real-light-curve', 'data:tess-light-curve', 'opens')
    ).toBe(true);
  });

  test('the manifest says what every item opens, how it stands, where it works and under what license', async () => {
    const links = new Map();
    for (const { item } of itemsOf(INTRO_ASTRONOMY)) {
      const en = await itemLink(item, { root: ROOT, locale: 'en' });
      if (en) links.set(item.id, { en: en.href });
    }
    const m = courseManifest(INTRO_ASTRONOMY, facts, {
      links,
      course: `${ROOT}course/#c2z…`,
    });
    expect(m.format).toBe('gravitas.course-manifest');
    expect(m.items).toHaveLength(itemsOf(INTRO_ASTRONOMY).length);
    const by = new Map(m.items.map(x => [x.id, x]));
    expect(by.get('keplers-laws').license).toMatch(/CC BY 4.0/);
    expect(by.get('watch-the-solar-system').license).toMatch(/MIT/);
    expect(by.get('a-real-light-curve').license).toBe('public domain');
    expect(by.get('reading-orbits-and-gravity').license).toBe('CC BY 4.0');
    expect(by.get('reading-orbits-and-gravity').offline).toBe('online');
    expect(by.get('a-first-transit').offline).toBe('precache');
    expect(by.get('a-first-transit').opens.steps).toHaveLength(6);
    expect(m.dependencies.edges.length).toBeGreaterThan(20);
    expect(m.remaining.every(x => x.level !== 'error')).toBe(true);
    expect(licenseOf({ kind: 'reading' }, facts)).toBeNull();
  });
});

describe('links', () => {
  test('the same pack makes the same links, every time', async () => {
    const a = await courseLink(INTRO_ASTRONOMY, { root: ROOT });
    const b = await courseLink(clone(INTRO_ASTRONOMY), { root: ROOT });
    expect(a.url).toBe(b.url);
    for (const { item } of itemsOf(INTRO_ASTRONOMY))
      expect((await itemLink(item, { root: ROOT }))?.href).toBe(
        (await itemLink(clone(item), { root: ROOT }))?.href
      );
  });

  test("a lesson link is the lesson browser's own", async () => {
    expect(
      (
        await itemLink(
          { kind: 'lesson', lesson: 'keplers-laws' },
          { root: ROOT }
        )
      ).href
    ).toBe(`${ROOT}#investigation=keplers-laws`);
  });

  test('an assignment link is an assignment the app accepts, in each language', async () => {
    const item = itemsOf(INTRO_ASTRONOMY).find(
      e => e.item.kind === 'assignment'
    ).item;
    for (const locale of ['en', 'es']) {
      const { href } = await itemLink(item, { root: ROOT, locale });
      const { payload } = await decodeTagged(
        'a',
        href.slice(href.indexOf('#')),
        2
      );
      expect(validateAssignment(payload)).toEqual({
        ok: true,
        reason: null,
        detail: null,
      });
      expect(payload).toEqual(assignmentPayload(item, locale));
      expect(payload.i).toBe(item.assignment.id);
      expect(payload.t).toBe(item.title[locale]);
      expect(payload.f).toEqual(item.pin.f);
    }
  });

  test('a scenario link is a world link the app decodes, at the seed its word names', async () => {
    const item = {
      kind: 'scenario',
      scenario: 'Solar System',
      seed: 'sky-1',
      paused: true,
    };
    const { href } = await itemLink(item, { root: ROOT });
    const payload = await decodePayload(href.slice(href.indexOf('#')));
    expect(payload).toEqual(scenarioPayload(item));
    expect(payload.s).toBe('Solar System');
    expect(payload.seed).toBe(formatSeed(parseSeed('sky-1')));
    expect(payload.p).toBe(1);
  });

  test('datasets open in the Observatory; a catalog one after it is installed', async () => {
    expect(
      (await itemLink({ kind: 'dataset', dataset: 'sdss-g' }, { root: ROOT }))
        .href
    ).toBe(`${ROOT}observatory/?open=sdss-g`);
    expect(
      await itemLink(
        { kind: 'dataset', dataset: 'community.su-dra-tess-s15' },
        { root: ROOT }
      )
    ).toEqual({
      href: `${ROOT}observatory/?installed=community.su-dra-tess-s15`,
      kind: 'catalog',
    });
  });

  test('a reading links to its address, or to its DOI', async () => {
    expect(
      (
        await itemLink(
          { kind: 'reading', cite: { doi: '10.1119/1.1234' } },
          { root: ROOT }
        )
      ).href
    ).toBe('https://doi.org/10.1119/1.1234');
    expect(
      await itemLink({ kind: 'reading', cite: {} }, { root: ROOT })
    ).toBeNull();
  });

  test('a course fragment of another kind, a newer version or a damaged one is refused', async () => {
    await expect(readCourseFragment('#a2zabc')).rejects.toThrow('wrongKind');
    await expect(readCourseFragment('#c9zabc')).rejects.toThrow('newerVersion');
    await expect(readCourseFragment('#c2z!!!!')).rejects.toThrow();
  });
});

describe('what the builder and course home copy, and where they are registered', () => {
  test("the datasets are the Observatory's fixtures, with its titles", async () => {
    const { FIXTURES } = await import('../js/observatory/fixtures.js');
    expect(DATASETS.map(d => [d.id, d.kind])).toEqual(
      FIXTURES.map(f => [f.id, f.kind])
    );
    for (const d of DATASETS) {
      expect(d.title.en).toBe(EN_OBSERVATORY[`obs.fixture.${d.id}`]);
      expect(d.title.es).toBe(ES_OBSERVATORY[`obs.fixture.${d.id}`]);
    }
  });

  test("each dataset's license is what its data says", async () => {
    const { openFixture } = await import('../js/observatory/fixtures.js');
    for (const d of DATASETS) {
      const o = await openFixture(d.id);
      expect([d.id, d.license]).toEqual([d.id, o.license.status]);
    }
  }, 120_000);

  test('the guided lessons are the ones with instructor content', async () => {
    const { INSTRUCTOR_CONTENT } =
      await import('../js/data/instructorContent.js');
    expect([...GUIDED]).toEqual(Object.keys(INSTRUCTOR_CONTENT).sort());
  });

  test('both pages are built and published, and the course home is precached', () => {
    const build = readFileSync('build.js', 'utf8');
    expect(build).toMatch(/'studio\/course',\n\s*'course',/);
    expect(build).toContain("['js/coursePage.js', 'course-builder-[hash]']");
    expect(build).toContain("['js/courseHome.js', 'course-home-[hash]']");
    const sw = readFileSync('sw-manifest.js', 'utf8');
    for (const f of [
      './course/index.html',
      './js/courseHome.js',
      './js/course/pack.js',
      './js/data/courses/intro-astronomy.js',
    ])
      expect(sw).toContain(`'${f}'`);
    expect(sw).not.toContain("'./studio/course/index.html'");
    expect(readFileSync('sitemap.xml', 'utf8')).toContain(
      'https://gravitas-sim.online/course/'
    );
  });

  test('the Observatory opens a built-in observation by name', () => {
    const page = readFileSync('js/observatoryPage.js', 'utf8');
    expect(page).toMatch(/get\('open'\)/);
  });
});

describe('words', () => {
  const builder = readFileSync('js/coursePage.js', 'utf8');
  const home = readFileSync('js/courseHome.js', 'utf8');
  const builderHtml = readFileSync('studio/course/index.html', 'utf8');
  const homeHtml = readFileSync('course/index.html', 'utf8');

  test('both languages have the same words, with the same placeholders', () => {
    for (const [en, es] of [
      [EN_COURSE, ES_COURSE],
      [EN_COURSEHOME, ES_COURSEHOME],
    ]) {
      expect(Object.keys(es).sort()).toEqual(Object.keys(en).sort());
      for (const k of Object.keys(en)) {
        const vars = s => (s.match(/\{\w+\}/g) || []).sort();
        expect([k, vars(es[k])]).toEqual([k, vars(en[k])]);
      }
    }
  });

  test('every id the pages name is in their catalog', () => {
    const ids = (text, re) => [...text.matchAll(re)].map(m => m[1]);
    for (const id of ids(builder, /t\(\s*'(course\.[\w.]+)'/g))
      expect([id, EN_COURSE[id]]).toEqual([id, expect.any(String)]);
    for (const id of ids(
      builderHtml,
      /data-i18n(?:-aria-label)?="(course\.[\w.]+)"/g
    ))
      expect([id, EN_COURSE[id]]).toEqual([id, expect.any(String)]);
    for (const id of ids(
      builderHtml,
      /data-i18n(?:-aria-label)?="(studio\.[\w.]+)"/g
    ))
      expect([id, EN_STUDIO[id]]).toEqual([id, expect.any(String)]);
    for (const id of ids(home, /t\(\s*'(courseHome\.[\w.]+)'/g))
      expect([id, EN_COURSEHOME[id]]).toEqual([id, expect.any(String)]);
    for (const id of ids(
      homeHtml,
      /data-i18n(?:-aria-label)?="(courseHome\.[\w.]+)"/g
    ))
      expect([id, EN_COURSEHOME[id]]).toEqual([id, expect.any(String)]);
  });

  test('every family of words has every member', () => {
    const family = (prefix, members) =>
      members.forEach(m =>
        expect([`${prefix}${m}`, EN_COURSE[`${prefix}${m}`]]).toEqual([
          `${prefix}${m}`,
          expect.any(String),
        ])
      );
    family('course.kind.', ITEM_KINDS);
    family('course.path.', ['core', 'intro', 'advanced']);
    family('course.pinning.', ['exact', 'compatible']);
    family('course.standing.', Object.values(STATUS));
    family('course.access.', ['open', 'library', 'print']);
    family('course.edge.', ['needs', 'opens', 'uses', 'assumes']);
    family('course.bump.', ['major', 'minor']);
    family('course.state.', ['done', 'missing', 'stale']);
    for (const k of ITEM_KINDS) {
      expect(EN_COURSEHOME[`courseHome.kind.${k}`]).toEqual(expect.any(String));
      expect(EN_COURSEHOME[`courseHome.open.${k}`]).toEqual(expect.any(String));
    }
  });

  test('every complaint the format and the audit make has words', () => {
    const review = readFileSync('js/course/review.js', 'utf8');
    const audit = [
      ...review.matchAll(/add\(\s*'(?:error|warning|note)',\s*'(\w+)'/g),
    ].map(m => m[1]);
    expect(audit.length).toBeGreaterThan(15);
    for (const code of audit)
      expect([code, EN_COURSE[`course.audit.${code}`]]).toEqual([
        code,
        expect.any(String),
      ]);
    const pack = readFileSync('js/course/pack.js', 'utf8');
    const format = new Set(
      [...pack.matchAll(/need\([^;]*?,\s*[^,;]*?,\s*'(\w+)',/gs)].map(m => m[1])
    );
    for (const code of [
      'textUnsafe',
      'textMissing',
      'textLocale',
      'text',
      'esOf',
      'unsafeKey',
      'tooLarge',
      'tooDeep',
      'notData',
      'number',
      'notObject',
    ])
      format.add(code);
    for (const code of format)
      expect([
        code,
        EN_COURSE[`course.error.${code}`] ?? EN_STUDIO[`studio.error.${code}`],
      ]).toEqual([code, expect.any(String)]);
  });
});
