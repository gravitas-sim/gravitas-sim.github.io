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

import { beforeAll, beforeEach, describe, expect, test } from '@jest/globals';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  RESUME_KEY,
  RESUME_ROUTE_MAX,
  noteResume,
  readResume,
} from '../js/storage/local.js';
import { resumeItems } from '../js/welcome.js';
import { ENTRY_LINK as STEP_LINK } from '../js/investigations/stepView.js';
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
      null,
      null,
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
