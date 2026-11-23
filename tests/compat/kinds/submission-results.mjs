import { submissionFor } from './_submission.mjs';

// The instructor results export (gravitas.submission-results/2), a JSON file.
// Reader: readResults -> {ok, doc, reason}.
export default {
  id: 'submission-results',
  label: 'submission results file',
  format: 'gravitas.submission-results/2',
  newToOld: 'accepts',
  capabilities: 'none',
  // What the 2.0.0 reader does with a top-level field it does not know:
  // 'refused', 'ignored' (accepted, silently dropped), or 'n/a' (the record is
  // an encoded fragment, so there is no field to add from outside).
  unknownFields: 'ignored',
  async make(load) {
    const { gradeSubmission, resultsJson } = await load(
      'js/submission/results.js'
    );
    const { lesson, submission } = await submissionFor(load);
    const record = gradeSubmission(submission, lesson, {
      kind: 'pdf',
      label: 'report.pdf',
      evidence: null,
    });
    // With a composed report read on the page: the additive top-level field `composedReports`, which a reader from
    // before it must read past (this kind measures that, against 2.0.0 and the 3.0 tag).
    return JSON.parse(
      resultsJson([record], {
        now: new Date('2026-10-01T00:00:00Z'),
        composed: [
          {
            file: 'ada.composed-report.json',
            digest: 'c'.repeat(64),
            sections: 2,
            comparisons: 0,
            digestMatches: true,
            statedBy: 1,
          },
        ],
      })
    );
  },
  async read(load, doc) {
    const { readResults } = await load('js/submission/results.js');
    const r = readResults(JSON.stringify(doc));
    if (!r.ok) return { accepted: false, problems: [r.reason] };
    return {
      accepted: true,
      value: {
        version: r.doc.version,
        submissions: r.doc.submissions.length,
        first: r.doc.submissions[0]?.counts,
      },
    };
  },
  async rewrite(load, doc) {
    return doc;
  },
};
