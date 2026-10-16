// The reports the gradebook tests grade: real lesson, real backups, built the
// way a student's browser stores them (the same recipe as
// tests/submissionResults.test.js), with fixed times so the output is the same
// on every machine.
import { annotate, gradeSubmission } from '../js/submission/results.js';
import { buildSubmission } from '../js/submission/submissionToken.js';
import { buildBackup } from '../js/investigations/progressBackup.js';
import { stepKey } from '../js/investigations/progressSchema.js';

export const kepler =
  await import('../js/data/investigations/keplers-laws.js').then(
    m => m.default || Object.values(m)[0]
  );

export const RIGHT = {
  'where-is-the-star': '1',
  'what-sits-at-the-other': '2',
  'use-the-law': '8',
  'weighing-another-star': '0.91',
  'where-kepler-s-version-breaks': '2',
};

export const WRITTEN_SID = 'why-the-speed-changes';

/** One submission payload. */
export function submission({
  responses = RIGHT,
  name = 'Ada',
  roster = null,
  assignment = null,
  savedAt = '2026-09-02T10:00:00.000Z',
  visited = kepler.steps.slice(0, 6).map(s => s.sid),
} = {}) {
  const stored = {};
  for (const [sid, value] of Object.entries(responses))
    stored[stepKey(kepler.id, sid)] = value;
  const backup = buildBackup({
    lesson: kepler,
    responses: stored,
    attempts: {},
    visited,
    stepSid: visited.at(-1),
    startedAt: '2026-09-01T10:00:00.000Z',
    studentName: name,
  });
  backup.savedAt = savedAt;
  return buildSubmission({
    backup,
    assignmentId: assignment,
    rosterId: roster,
  });
}

/** Graded and annotated, in the order given. */
export const recordsOf = list =>
  annotate(
    list.map((sub, i) =>
      gradeSubmission(sub, kepler, { kind: 'token', label: `report-${i + 1}` })
    )
  );

/** The pile every gradebook test uses. */
export function pile() {
  return recordsOf([
    submission({
      name: 'Ada Lovelace',
      roster: 'S-1',
      assignment: 'wk3',
      responses: { ...RIGHT, [WRITTEN_SID]: 'It speeds up near the star.' },
    }),
    submission({
      name: '=HYPERLINK("http://example.invalid","x")',
      roster: 'S-2',
      assignment: 'wk3',
      responses: { 'where-is-the-star': '0', 'use-the-law': '8' },
    }),
    submission({
      name: 'Cleo',
      roster: 'S-3',
      assignment: 'wk3',
      savedAt: '2026-09-02T09:00:00.000Z',
      responses: { 'use-the-law': '5' },
    }),
    submission({
      name: 'Cleo',
      roster: 'S-3',
      assignment: 'wk3',
      savedAt: '2026-09-03T09:00:00.000Z',
      responses: { ...RIGHT, [WRITTEN_SID]: 'Because gravity pulls harder.' },
    }),
    submission({
      name: 'Dev',
      roster: null,
      assignment: 'wk3',
      responses: RIGHT,
    }),
    submission({
      name: 'Ada Lovelace',
      roster: 'S-1',
      assignment: 'wk4',
      responses: { 'use-the-law': '8' },
    }),
  ]);
}
