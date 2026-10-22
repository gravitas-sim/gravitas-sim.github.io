import { lesson } from './_lesson.mjs';

// The one resume record (Roadmap III Prompt 163): the key `gravitas_resume`,
// written beside the progress records and never inside one. 2.0.0 has no reader
// for it, so the question the corpus can ask of 2.0.0 is the one that matters:
// with the sidecar present, does the progress reader still read the progress
// record exactly as before? The record's own shape is held by
// tests/resumeRecord.test.js, because only the current code can read it.
export default {
  id: 'resume-record',
  label: 'the resume record (localStorage sidecar)',
  format: 'resume record/1 (a key of its own; progress records are untouched)',
  newToOld: 'accepts',
  capabilities: 'none',
  // The fixture is {progress, resume}; the reader looks at `progress` only, as
  // a 2.0.0 page does: a field it does not know is ignored.
  unknownFields: 'ignored',
  async make(load) {
    const { writeProgress } = await load('js/investigations/progressSchema.js');
    return {
      progress: writeProgress({
        lesson: lesson(),
        responses: { 'tides:guess': 0 },
        attempts: { 'tides:guess': 1 },
        visited: new Set(['intro', 'guess']),
        stepSid: 'guess',
        startedAt: '2026-10-01T00:00:00.000Z',
        depth: 'core',
        deepest: 'core',
        spent: {},
      }),
      resume: {
        v: 1,
        items: [
          {
            id: 'investigation:tides',
            route: '/#investigation=tides',
            step: 'guess',
            path: { k: 'seq', id: 'gravity-and-orbits' },
            at: 1790000000000,
          },
        ],
      },
    };
  },
  async read(load, doc) {
    const { readProgress } = await load('js/investigations/progressSchema.js');
    const r = readProgress(doc.progress, lesson());
    return {
      accepted: r.notes.length === 0,
      problems: r.notes.map(n => n.code ?? JSON.stringify(n)),
      value: JSON.parse(
        JSON.stringify({ ...r, visited: [...r.visited].sort() })
      ),
    };
  },
  async rewrite(load, doc) {
    const { readProgress, writeProgress } = await load(
      'js/investigations/progressSchema.js'
    );
    const r = readProgress(doc.progress, lesson());
    return {
      progress: writeProgress({
        lesson: lesson(),
        ...r,
        depth: doc.progress.depth,
        deepest: doc.progress.deepest,
        spent: doc.progress.spent,
      }),
      resume: doc.resume,
    };
  },
};
