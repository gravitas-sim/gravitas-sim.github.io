import { lesson } from './_lesson.mjs';

// The first-week record (Roadmap III Prompt 277): the key `gravitas_first_week`,
// the list Home shows alone while a first week is on, written beside the
// progress records and never inside one. 2.0.0 has no reader for it, so the
// question the corpus can ask of 2.0.0 is the one that matters: with the
// sidecar present, does the progress reader still read the progress record
// exactly as before? The record's own shape is held by tests/firstWeek.test.js,
// because only the current code can read it. (A first week as a file or a link
// is another matter: 2.0.0 refuses the collection by its version, the
// `collection-first-week` row of boundary.mjs.)
export default {
  id: 'first-week-record',
  label: 'the first-week record (localStorage sidecar)',
  format:
    'first-week record/1 (a key of its own; progress records are untouched)',
  newToOld: 'accepts',
  capabilities: 'none',
  // The fixture is {progress, firstWeek}; the reader looks at `progress` only, as
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
      firstWeek: {
        v: 1,
        id: 'week-one',
        t: { en: 'Week one' },
        mo: 'shut',
        items: [
          {
            t: { en: 'Tides' },
            h: '/#investigation=tides',
            l: 'tides',
            n: 9,
          },
          { t: { en: 'Solar System' }, h: '/#2zabc', o: 1 },
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
      firstWeek: doc.firstWeek,
    };
  },
};
