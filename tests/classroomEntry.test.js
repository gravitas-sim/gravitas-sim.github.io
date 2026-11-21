// =============================================================================
// Where a link lands, and what remembers it
// -----------------------------------------------------------------------------
// tests/linkShapes.test.js holds the front door's patterns against the loader's.
// This holds the other half of entering work from a link: the address the work
// was opened from is kept (in its progress record and in the one resume record),
// so Home, the Library and My work open the activity again as that and not as
// the bare investigation; a link that cannot be opened has a reason in plain
// words in both languages; and the page that says it is the one dialog.
// =============================================================================

import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  jest,
  test,
} from '@jest/globals';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  RESUME_KEY,
  RESUME_ROUTE_MAX,
  noteResume,
  readResume,
} from '../js/storage/local.js';
import { resumeItems } from '../js/welcome.js';
import {
  ENTRY_LINK as STEP_LINK,
  keptLink,
  setEntryLink,
} from '../js/investigations/stepView.js';
import {
  ENTRY_LINK,
  isKeptLink,
  isSiteRoute,
  isTooLongLink,
} from '../js/names.js';
import { hasMessage } from '../js/i18n/index.js';
import {
  ENTRY_LINK as WORK_LINK,
  describe as work,
} from '../js/myWork/model.js';
import {
  readProgress,
  writeProgress,
} from '../js/investigations/progressSchema.js';
import { loadInvestigation } from '../js/data/investigations/registry.js';
import { buildAssignment } from '../js/assignments/assignment.js';
import {
  assignmentLink,
  readAssignmentLink,
} from '../js/assignments/assignmentLink.js';
import { stepFingerprint } from '../js/investigations/progressBackup.js';
import { EN_DEFERRED } from '../js/i18n/en.deferred.js';
import { ES_DEFERRED } from '../js/i18n/es.deferred.js';
import { EN_REMIX } from '../js/i18n/en.remix.js';
import { ES_REMIX } from '../js/i18n/es.remix.js';

const REPO = path.resolve(import.meta.dirname, '..');
const fragment = readFileSync(
  path.join(REPO, 'js/fragments/link-notice.html'),
  'utf8'
);

let assignment;
beforeAll(async () => {
  const lesson = await loadInvestigation('keplers-laws');
  const chosen = lesson.steps
    .filter(s => !s.setup && Array.isArray(s.options))
    .slice(0, 2)
    .map(s => s.sid);
  const made = buildAssignment({
    lesson,
    chosen,
    title: 'Week 3',
    fingerprint: stepFingerprint,
  });
  const url = (await assignmentLink(made)).url;
  assignment = url.slice(url.indexOf('#'));
});

beforeEach(() => localStorage.clear());

describe('the shape of a link worth keeping', () => {
  test('is one shape in the engine and in My work', () => {
    const table = {
      assignment: [
        '#a1zHY5BbsMwDAS_UuyZDCQ5cVx9pIciB8KhbMGOU4hscgj698K5D',
        true,
      ],
      pack: ['#i2rbVJLjtswDL0L1-ZgpihaIFcpumAsOiJiiapIx0g', true],
      activity: ['#activity=orbital-speed/guided', true],
      activityAlone: ['#activity=orbital-speed', true],
      world: ['#1zeJyrVkrLz1eyUkrOSC0uUUgtSc7PLShKLS7JzM9TqgUAY_MJ8Q', false],
      lesson: ['#investigation=keplers-laws', false],
      course: ['#c3zAAAA', false],
      script: ['#a1z"><script>', false],
      empty: ['', false],
    };
    for (const [name, [hash, kept]] of Object.entries(table)) {
      expect([name, STEP_LINK.test(hash)]).toEqual([name, kept]);
      expect([name, WORK_LINK.test(hash)]).toEqual([name, kept]);
    }
  });

  test('a real assignment link is one', () => {
    expect(STEP_LINK.test(assignment)).toBe(true);
    expect(assignment.length).toBeLessThan(RESUME_ROUTE_MAX);
  });
});

describe('the resume record carries an address as long as a link', () => {
  test('keeps an assignment route past the old 240 characters, and Home reads it the same', () => {
    const route = `/${assignment}`;
    expect(route.length).toBeGreaterThan(200);
    const pad = `${route}${'a'.repeat(400)}`;
    expect(
      noteResume({
        id: 'assignment:6338d178',
        route: pad,
        step: 'where-is-the-star',
        title: { en: 'Week 3' },
      })
    ).toBe(true);
    expect(readResume()[0]).toMatchObject({
      id: 'assignment:6338d178',
      route: pad,
      step: 'where-is-the-star',
      title: { en: 'Week 3' },
    });
    expect(resumeItems().map(i => i.route)).toEqual([pad]);
  });

  test('refuses a route over the limit, and both readers agree on where it is', () => {
    const over = `/#a1z${'a'.repeat(RESUME_ROUTE_MAX)}`;
    expect(noteResume({ id: 'assignment:x', route: over })).toBe(false);
    // A record written by hand with one over the limit loses that item only.
    localStorage.setItem(
      RESUME_KEY,
      JSON.stringify({
        v: 1,
        items: [
          { id: 'assignment:x', route: over, at: 1 },
          { id: 'investigation:tides', route: '/#investigation=tides', at: 1 },
        ],
      })
    );
    expect(readResume().map(i => i.id)).toEqual(['investigation:tides']);
    expect(resumeItems().map(i => i.id)).toEqual(['investigation:tides']);
  });
});

describe('the progress record keeps where it was opened from', () => {
  const lesson = {
    id: 'tides',
    steps: [{ sid: 'guess', type: 'predict' }],
  };

  test('writes the link only when there is one', () => {
    const base = {
      lesson,
      responses: {},
      attempts: {},
      visited: new Set(),
      stepSid: 'guess',
      startedAt: '2026-11-19T00:00:00.000Z',
    };
    expect(writeProgress(base)).not.toHaveProperty('link');
    expect(writeProgress({ ...base, link: assignment })).toMatchObject({
      link: assignment,
    });
  });

  test('the reader opens a record that has one exactly as it did before', () => {
    const record = writeProgress({
      lesson,
      responses: { 'tides:guess': 0 },
      attempts: { 'tides:guess': 1 },
      visited: new Set(['guess']),
      stepSid: 'guess',
      startedAt: '2026-11-19T00:00:00.000Z',
      link: assignment,
    });
    const read = readProgress(record, lesson);
    expect(read.notes).toEqual([]);
    expect(read.responses).toEqual({ 'tides:guess': 0 });
    expect(read.stepSid).toBe('guess');
  });

  test('My work opens an activity row with its link, and a record from before has none', () => {
    const records = [
      {
        id: 'gravitas_assignment_aaaaaaaa',
        value: {
          lesson: 'tides',
          visited: ['a'],
          responses: {},
          link: assignment,
        },
      },
      {
        id: 'gravitas_assignment_bbbbbbbb',
        value: { lesson: 'tides', visited: [], responses: {} },
      },
      {
        id: 'gravitas_assignment_cccccccc',
        value: {
          lesson: 'tides',
          visited: [],
          responses: {},
          link: 'https://evil.test/',
        },
      },
    ];
    expect(work(records).assignments.map(a => a.href)).toEqual([
      `/${assignment}`,
      undefined,
      undefined,
    ]);
  });
});

describe('a link that cannot be read', () => {
  test('a damaged assignment link names the lesson only when it decoded', async () => {
    const cut = await readAssignmentLink(assignment.slice(0, 40));
    expect(cut.ok).toBe(false);
    expect(cut).not.toHaveProperty('lesson');
  });

  test('every reason an assignment link can fail with has a sentence in both languages', () => {
    const reasons = [
      'corrupt',
      'tooLarge',
      'wrongKind',
      'newerVersion',
      'notAnObject',
      'badVersion',
      'badLesson',
      'badId',
      'noSteps',
      'badStepId',
      'duplicateSteps',
      'fingerprintMismatch',
      'badText',
      'unexpectedField',
      'titleTooLong',
      'introTooLong',
      'tooManySteps',
      'unknownSteps',
      'noLesson',
      'noStepsLeft',
      'badPackage',
    ];
    for (const r of reasons) {
      expect([r, typeof EN_DEFERRED[`assign.error.${r}`]]).toEqual([
        r,
        'string',
      ]);
      expect([r, typeof ES_DEFERRED[`assign.error.${r}`]]).toEqual([
        r,
        'string',
      ]);
    }
  });

  test('the dialog that says it has both languages, both who-fixes lines and each way on', () => {
    for (const id of [
      'linkNotice',
      'linkNoticeWhy',
      'linkNoticeAlone',
      'linkNoticeReload',
      'linkNoticeLibrary',
    ])
      expect(fragment).toContain(`id="${id}"`);
    expect(fragment).toContain('data-who="you"');
    expect(fragment).toContain('data-who="sender"');
    const title = fragment.slice(fragment.indexOf('id="linkNoticeTitle"'));
    expect(title).toMatch(/gs-en/);
    expect(title).toMatch(/gs-es/);
  });
});

describe('one set of limits for every reader and writer of a link', () => {
  const route = n => `/${'a'.repeat(n - 1)}`;
  const record = items =>
    localStorage.setItem(
      RESUME_KEY,
      JSON.stringify({
        v: 1,
        items: items.map(([id, r]) => ({ id, route: r, at: 1 })),
      })
    );

  test('the four places that used to copy the shape and the limit share it', () => {
    expect(STEP_LINK).toBe(ENTRY_LINK);
    expect(WORK_LINK).toBe(ENTRY_LINK);
    expect(RESUME_ROUTE_MAX).toBe(4000);
  });

  test('a route of 240, 241 and 4000 characters is kept and 4001 is not, by both readers', () => {
    record([
      ['r:240', route(240)],
      ['r:241', route(241)],
      ['r:4000', route(4000)],
      ['r:4001', route(4001)],
    ]);
    const kept = ['r:240', 'r:241', 'r:4000'];
    expect(readResume().map(i => i.id)).toEqual(kept);
    expect(resumeItems().map(i => i.id)).toEqual(kept);
  });

  test('a link of 3999 characters is kept (its route is 4000) and 4000 is too long, by every writer', () => {
    const link = n => `#a1z${'a'.repeat(n - 4)}`;
    expect(link(3999)).toHaveLength(3999);
    expect(isKeptLink(link(3999))).toBe(true);
    expect(isKeptLink(link(4000))).toBe(false);
    expect(isTooLongLink(link(4000))).toBe(true);
    expect(isTooLongLink(link(3999))).toBe(false);
    // A record that holds one is opened by My work only while it fits.
    const rows = work([
      {
        id: 'gravitas_assignment_aaaaaaaa',
        value: {
          lesson: 'tides',
          visited: [],
          responses: {},
          link: link(3999),
        },
      },
      {
        id: 'gravitas_assignment_bbbbbbbb',
        value: {
          lesson: 'tides',
          visited: [],
          responses: {},
          link: link(4000),
        },
      },
    ]);
    expect(rows.assignments.map(a => a.href)).toEqual([
      `/${link(3999)}`,
      undefined,
    ]);
    // And what the resume record is given for the first is what it reads back.
    expect(
      noteResume({ id: 'assignment:aaaaaaaa', route: `/${link(3999)}` })
    ).toBe(true);
    expect(
      noteResume({ id: 'assignment:bbbbbbbb', route: `/${link(4000)}` })
    ).toBe(false);
  });

  test('the panel says so when a link is too long to keep, and keeps none', () => {
    expect(setEntryLink(`#i2z${'a'.repeat(4000)}`)).toBe(true);
    expect(setEntryLink(`#i2z${'a'.repeat(100)}`)).toBe(false);
    expect(setEntryLink('#investigation=tides')).toBe(false);
    expect(setEntryLink(null)).toBe(false);
  });

  test('a route is on this site only with one slash and no backslash after it', () => {
    for (const ok of ['/library/', '/#investigation=tides', `/${assignment}`])
      expect([ok, isSiteRoute(ok)]).toEqual([ok, true]);
    for (const bad of [
      '//evil.example',
      '/\\evil.example',
      '/\\/evil.example',
      'https://evil.example/',
      'library/',
      '',
      null,
    ])
      expect([bad, isSiteRoute(bad)]).toEqual([bad, false]);
    record([
      ['r:good', '/library/'],
      ['r:slash', '//evil.example'],
      ['r:back', '/\\evil.example'],
    ]);
    expect(readResume().map(i => i.id)).toEqual(['r:good']);
    expect(resumeItems().map(i => i.id)).toEqual(['r:good']);
  });

  test('a title is kept under the language it was written in, and either reads back', () => {
    noteResume({
      id: 'assignment:aaaaaaaa',
      route: '/#a1zabc',
      title: { es: 'Semana 3' },
    });
    noteResume({
      id: 'assignment:bbbbbbbb',
      route: '/#a1zdef',
      title: { en: 'Week 3' },
    });
    expect(readResume().map(i => i.title)).toEqual([
      { en: 'Week 3' },
      { es: 'Semana 3' },
    ]);
    expect(resumeItems().map(i => i.title)).toEqual([
      { en: 'Week 3' },
      { es: 'Semana 3' },
    ]);
  });
});

describe('the link a record already holds is read once per open and is bounded', () => {
  afterEach(() => jest.restoreAllMocks());

  test('reads the record once however many times it is saved over', () => {
    const key = 'gravitas_assignment_aaaaaaaa';
    localStorage.setItem(
      key,
      JSON.stringify({ lesson: 'tides', link: assignment })
    );
    setEntryLink(null);
    const read = jest.spyOn(Storage.prototype, 'getItem');
    for (let i = 0; i < 5; i++) expect(keptLink(key)).toBe(assignment);
    expect(read.mock.calls.filter(([k]) => k === key)).toHaveLength(1);
    // A new open starts again.
    setEntryLink(null);
    keptLink(key);
    expect(read.mock.calls.filter(([k]) => k === key)).toHaveLength(2);
  });

  test('refuses a link that is too long, the wrong shape or not text', () => {
    const key = 'gravitas_assignment_bbbbbbbb';
    for (const link of [`#a1z${'a'.repeat(4000)}`, 'https://evil.test/', 7]) {
      localStorage.setItem(key, JSON.stringify({ lesson: 'tides', link }));
      setEntryLink(null);
      expect(keptLink(key)).toBeUndefined();
    }
    localStorage.setItem(key, '{not json');
    setEntryLink(null);
    expect(keptLink(key)).toBeUndefined();
  });
});

describe('a reason the catalog has no sentence for does not log a missing id', () => {
  test('asks the catalog with hasMessage, which is silent, and every decoder reason has a sentence', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    expect(hasMessage('assign.error.notAReason')).toBe(false);
    expect(hasMessage('assign.error.noLesson')).toBe(true);
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
    expect(
      readFileSync(
        path.join(REPO, 'js/assignments/assignmentBridge.js'),
        'utf8'
      )
    ).toContain('hasMessage(');
    expect(EN_REMIX['remix.notice.tooLong']).toMatch(/too long/);
    expect(typeof ES_REMIX['remix.notice.tooLong']).toBe('string');
  });
});
