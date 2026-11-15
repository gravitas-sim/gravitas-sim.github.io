// One spec for the task-change contract's corpus: the records a student or an
// instructor holds, built by one tree and read by another under a lesson that
// was then reworded, revised, inserted into or removed from (_lesson.mjs).
// `make` builds each record from the lesson as shipped; `read` takes
// {record, doc, lesson} and reports what that tree's reader makes of it.
import { lesson } from '../kinds/_lesson.mjs';

const hashOf = async (load, step) => {
  const { stepFingerprint } = await load('js/investigations/progressBackup.js');
  const { shortHash } = await load('js/assignments/assignment.js');
  return shortHash(stepFingerprint(step));
};

export default {
  async make(load) {
    const L = lesson();
    const { writeProgress } = await load('js/investigations/progressSchema.js');
    const progress = writeProgress({
      lesson: L,
      responses: {
        'tides:guess': 0,
        'tides:measure:d': '4.2',
        'tides:ask': 2,
      },
      attempts: { 'tides:guess': 1 },
      visited: new Set(['intro', 'guess']),
      stepSid: 'guess',
      startedAt: '2026-10-01T00:00:00.000Z',
    });
    const { buildAssignment } = await load('js/assignments/assignment.js');
    const { assignmentLink } = await load('js/assignments/assignmentLink.js');
    const { stepFingerprint } = await load(
      'js/investigations/progressBackup.js'
    );
    const a = buildAssignment({
      lesson: L,
      chosen: ['guess', 'measure', 'ask'],
      title: 'Week 3',
      fingerprint: stepFingerprint,
      provider: null,
    });
    const link = await assignmentLink(a, 'https://example.test/');
    const { buildBackup } = await load('js/investigations/progressBackup.js');
    const { buildSubmission, encodeSubmission } = await load(
      'js/submission/submissionToken.js'
    );
    const backup = buildBackup({
      lesson: L,
      responses: { 'tides:guess': 0, 'tides:measure:d': '4.2' },
      attempts: {},
      visited: ['intro', 'guess'],
      stepSid: 'guess',
      startedAt: '2026-10-01T00:00:00.000Z',
    });
    backup.savedAt = '2026-10-01T00:30:00.000Z';
    const token = (await encodeSubmission(buildSubmission({ backup }))).token;
    const pin = {
      f: await Promise.all(
        ['guess', 'measure', 'ask'].map(s =>
          hashOf(
            load,
            L.steps.find(x => x.sid === s)
          )
        )
      ),
    };
    return { progress, fragment: link.fragment, token, pin };
  },

  async read(load, { record, doc, lesson: L }) {
    if (record === 'progress') {
      const { readProgress } = await load(
        'js/investigations/progressSchema.js'
      );
      const r = readProgress(doc, L);
      return {
        responses: r.responses,
        notes: r.notes.map(n => n.code),
        earlier: r.earlier ? Object.keys(r.earlier.responses).sort() : null,
      };
    }
    if (record === 'assignment') {
      const { readAssignmentLink } = await load(
        'js/assignments/assignmentLink.js'
      );
      const { stepBindings } = await load('js/assignments/assignment.js');
      const { stepFingerprint } = await load(
        'js/investigations/progressBackup.js'
      );
      const r = await readAssignmentLink(doc);
      if (!r.ok) return { refused: r.reason };
      const b = stepBindings(r.assignment, L, stepFingerprint);
      return {
        status: b.bindings.map(x => `${x.sid}:${x.status}`),
        retired: b.bindings.filter(x => x.retired).map(x => x.retired.to),
      };
    }
    if (record === 'token') {
      const { readSubmissionToken } = await load(
        'js/submission/submissionToken.js'
      );
      const r = await readSubmissionToken(doc);
      if (!r.ok) return { refused: r.reason };
      const { gradeSubmission } = await load('js/submission/results.js');
      const g = gradeSubmission(r.submission, L, {
        kind: 'token',
        label: 't',
      });
      return {
        stale: g.questions.filter(q => q.verdict === 'stale').map(q => q.sid),
        earlier: g.questions.filter(q => q.earlier).map(q => q.sid),
        answered: g.questions.filter(q => q.response !== null).map(q => q.sid),
      };
    }
    if (record === 'pin') {
      const { reviewItem } = await load('js/course/review.js');
      const { shortHash } = await load('js/assignments/assignment.js');
      const { stepFingerprint } = await load(
        'js/investigations/progressBackup.js'
      );
      const hashes = new Map(
        L.steps.map(s => [s.sid, shortHash(stepFingerprint(s))])
      );
      const facts = {
        lessons: new Map([
          [
            'tides',
            {
              fp: 'x',
              n: L.steps.length,
              hashes,
              sids: [...hashes.keys()],
              retired: L.retired ?? null,
            },
          ],
        ]),
        scenarios: new Map(),
      };
      const v = reviewItem(
        {
          kind: 'assignment',
          lesson: 'tides',
          steps: ['guess', 'measure', 'ask'],
          pin: { fp: 'x', n: 6, f: doc.f },
        },
        facts,
        'compatible'
      );
      return {
        missing: v.detail.missingSteps,
        changed: v.detail.changedSteps,
        revised: (v.detail.revisedSteps || []).map(r => `${r.sid}>${r.to}`),
      };
    }
    throw new Error(`unknown record ${record}`);
  },
};
