import { backupFor, lessons, DEPTH } from './_ws.mjs';
export default {
  async make(load) {
    const { buildSubmission, encodeSubmission } = await load(
      'js/submission/submissionToken.js'
    );
    const { backup } = await backupFor(load);
    const s = buildSubmission({
      backup,
      assignmentId: 'abc123',
      rosterId: 'r-7',
      depth: DEPTH,
    });
    return { token: (await encodeSubmission(s)).token };
  },
  async read(load, fx) {
    const { readSubmissionToken } = await load(
      'js/submission/submissionToken.js'
    );
    const { gradeSubmission } = await load('js/submission/results.js');
    const r = await readSubmissionToken(fx.token);
    if (!r.ok) return { accepted: false, problems: [r.reason] };
    const { laid } = await lessons(load);
    const g = gradeSubmission(r.submission, laid, {
      kind: 'token',
      label: 'pasted token',
    });
    const rows = g.questions || g.rows || [];
    return {
      accepted: true,
      depth: r.submission.dp ?? null,
      keys: Object.keys(g),
      stale: rows.filter(q => q.verdict === 'stale').map(q => q.sid),
      changed: rows
        .filter(q => q.changed || q.verdict === 'changed')
        .map(q => q.sid),
      answered: rows
        .filter(q => q.verdict && q.verdict !== 'incomplete')
        .map(q => q.sid),
      incomplete: rows.filter(q => q.verdict === 'incomplete').map(q => q.sid),
    };
  },
};
