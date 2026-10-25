import { submissionFor } from './_submission.mjs';

// The submission token (#s2...): what a student hands in.
// Reader: readSubmissionToken -> {ok, submission, reason}.
export default {
  id: 'submission-token',
  label: 'submission token',
  format: 'submission token (prefix s, version 2)',
  newToOld: 'accepts',
  capabilities: 'none',
  // What the 2.0.0 reader does with a top-level field it does not know:
  // 'refused', 'ignored' (accepted, silently dropped), or 'n/a' (the record is
  // an encoded fragment, so there is no field to add from outside).
  unknownFields: 'n/a',
  async make(load) {
    const { encodeSubmission } = await load('js/submission/submissionToken.js');
    const { submission } = await submissionFor(load, { evidence: true });
    return { token: (await encodeSubmission(submission)).token };
  },
  async read(load, fx) {
    const { readSubmissionToken } = await load(
      'js/submission/submissionToken.js'
    );
    const r = await readSubmissionToken(fx.token);
    if (!r.ok) return { accepted: false, problems: [r.reason] };
    return { accepted: true, value: r.submission };
  },
  async rewrite(load, fx) {
    const { readSubmissionToken, encodeSubmission } = await load(
      'js/submission/submissionToken.js'
    );
    const r = await readSubmissionToken(fx.token);
    return { token: (await encodeSubmission(r.submission)).token };
  },
};
