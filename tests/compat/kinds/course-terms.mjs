import { lesson } from './_lesson.mjs';

// The course terms record (Roadmap III Prompt 168): the key `gravitas_terms`,
// written beside the progress records and never inside one. 2.0.0 has no reader
// for it, so the question the corpus can ask of 2.0.0 is the one that matters:
// with the sidecar present, does the progress reader still read the progress
// record exactly as before? The record's own shape is held by
// tests/courseTermsRecord.test.js, because only the current code can read it.
export default {
  id: 'course-terms',
  label: 'the course terms record (localStorage sidecar)',
  format:
    'course terms record/1 (a key of its own; progress records are untouched)',
  newToOld: 'accepts',
  capabilities: 'none',
  // The fixture is {progress, terms}; the reader looks at `progress` only, as
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
      terms: {
        v: 1,
        courses: [
          {
            id: 'intro-astronomy-fall-2026',
            term: 'Fall 2026',
            title: { en: 'Introductory astronomy' },
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
      terms: doc.terms,
    };
  },
};
