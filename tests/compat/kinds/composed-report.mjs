import { readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { submissionFor } from './_submission.mjs';

// The report composed from marked entries (Roadmap III Prompt 275, part B):
// gravitas.composed-report/1, kept as one record among the things made (kind
// `report`, the key gravitas_made_composed-report), and stated by a submission
// token as `cr` (its digest and section count). Both are written only when a
// composed report exists.
//
// 2.0.0 has no reader for the report, so the corpus asks of 2.0.0 what
// matters: with the report's record among the things made, does it still list
// the other things made exactly as before (it leaves the report out, as it
// leaves out any kind it does not know, and does not overwrite it); and does
// it read a token that carries `cr` to the same submission (it does, and does
// not show the field). The report's own shape and digest are held by
// tests/composedReport.test.js, because only the current code reads it.
const FIXTURE = path.join(
  process.cwd(),
  'tests',
  'fixtures',
  'composed-report',
  'periods-and-slopes.composed-report.json'
);
const KEY = 'gravitas_made_composed-report';

const scenario = {
  format: 'gravitas.made',
  formatVersion: 1,
  id: 'm1corpus000',
  kind: 'scenario',
  from: 'sandbox',
  name: 'Two stars',
  savedAt: '2026-10-01T00:00:00.000Z',
  app: '2.0.0',
  attachedTo: [],
  scenario: { id: null, seed: 'k7', settings: {}, bodies: 2, link: '2abc' },
};

/** A Storage of the records, as listMade() reads one. */
const storageOf = records => {
  const keys = Object.keys(records);
  return {
    length: keys.length,
    key: i => keys[i],
    getItem: k => (k in records ? JSON.stringify(records[k]) : null),
  };
};

export default {
  id: 'composed-report',
  label: 'the composed report (a made record, and `cr` in a token)',
  format: 'gravitas.composed-report/1',
  newToOld: 'accepts',
  capabilities:
    'none: a build without it leaves the report out and reads the rest',
  // The fixture is {token, made}; a field added beside them is not read.
  unknownFields: 'ignored',
  async make(load) {
    const { encodeSubmission } = await load('js/submission/submissionToken.js');
    const report = JSON.parse(readFileSync(FIXTURE, 'utf8'));
    const { submission } = await submissionFor(load, { evidence: true });
    // What ledgerForReport() adds when a composed report was made. The
    // current writer carries it into the token; 2.0.0's does not know it.
    const { buildSubmission } = await load('js/submission/submissionToken.js');
    const stated = buildSubmission({
      backup: submission.b,
      assignmentId: submission.a,
      rosterId: submission.r,
      record: {
        ids: submission.ev.i,
        rows: submission.ev.r,
        total: submission.ev.n,
        cr: { d: report.digest, n: report.sections.length },
      },
      digest: submission.ev.d,
    });
    return {
      token: (await encodeSubmission(stated)).token,
      made: {
        [`gravitas_made_${scenario.id}`]: scenario,
        [KEY]: {
          format: 'gravitas.made',
          formatVersion: 1,
          id: 'composed-report',
          kind: 'report',
          from: 'my-work',
          name: report.title,
          savedAt: report.madeAt,
          app: report.app,
          attachedTo: [],
          report,
        },
      },
    };
  },
  async read(load, fx) {
    const { readSubmissionToken } = await load(
      'js/submission/submissionToken.js'
    );
    const { listMade } = await load('js/myWork/made.js');
    const r = await readSubmissionToken(fx.token);
    if (!r.ok) return { accepted: false, problems: [r.reason] };
    // What both builds say: the submission apart from `cr`, and the things
    // made apart from the report.
    const submission = { ...r.submission };
    delete submission.cr;
    const made = listMade(storageOf(fx.made)).filter(x => x.kind !== 'report');
    return {
      accepted: made.length === 1,
      problems: made.length === 1 ? [] : ['the other things made were lost'],
      value: JSON.parse(JSON.stringify({ submission, made })),
    };
  },
  async rewrite(load, fx) {
    const { readSubmissionToken, encodeSubmission } = await load(
      'js/submission/submissionToken.js'
    );
    const r = await readSubmissionToken(fx.token);
    return {
      token: (await encodeSubmission(r.submission)).token,
      made: fx.made,
    };
  },
};
