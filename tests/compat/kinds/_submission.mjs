// A student's submission, built the way tests/submissionResults.test.js builds
// one: a real lesson, a real backup, answers stored under the engine's keys.
export async function submissionFor(load, { evidence = false } = {}) {
  const { buildBackup } = await load('js/investigations/progressBackup.js');
  const { buildSubmission } = await load('js/submission/submissionToken.js');
  const { stepKey } = await load('js/investigations/progressSchema.js');
  const lesson = await load('js/data/investigations/keplers-laws.js').then(
    m => m.default || Object.values(m)[0]
  );
  const key = sid => stepKey(lesson.id, sid);
  const visited = lesson.steps.slice(0, 5).map(s => s.sid);
  const backup = buildBackup({
    lesson,
    responses: {
      [key('where-is-the-star')]: '1',
      [key('use-the-law')]: '8',
    },
    attempts: {},
    visited,
    stepSid: visited.at(-1),
    startedAt: '2026-09-01T10:00:00.000Z',
    studentName: 'Ada',
  });
  backup.savedAt = '2026-09-01T10:30:00.000Z';
  let record = null;
  let digest = null;
  if (evidence) {
    const { ledgerDigest } = await load('js/submission/ledgerDigest.js');
    record = {
      ids: ['depth', 'period'],
      rows: [
        [0.0146, 3.5],
        [0.0151, 3.6],
      ],
      total: 2,
    };
    digest = await ledgerDigest(record);
  }
  return {
    lesson,
    submission: buildSubmission({
      backup,
      assignmentId: 'abc123',
      rosterId: 'r-7',
      record,
      digest,
    }),
  };
}
