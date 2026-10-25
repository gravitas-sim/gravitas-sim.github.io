import { lesson } from './_lesson.mjs';

// The collections record (Roadmap III Prompt 164): the key `gravitas_collections`,
// written beside the progress records and never inside one. 2.0.0 has no reader
// for it, so the question the corpus can ask of 2.0.0 is the one that matters:
// with the sidecar present, does the progress reader still read the progress
// record exactly as before? The record's own shape is held by
// tests/collections.test.js, because only the current code can read it. (A
// collection as a file or a link is another matter: 2.0.0 refuses its
// `profile` in words, the `collection-profile` row of boundary.mjs.)
export default {
  id: 'collections-record',
  label: 'the collections record (localStorage sidecar)',
  format:
    'collections record/1 (a key of its own; progress records are untouched)',
  newToOld: 'accepts',
  capabilities: 'none',
  // The fixture is {progress, collections}; the reader looks at `progress` only, as
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
      collections: {
        v: 1,
        saved: {
          format: 'gravitas.course-pack',
          formatVersion: 2,
          id: 'saved-items',
          version: '1.0.0',
          gravitas: '1.0.0',
          locales: ['en'],
          pinning: 'compatible',
          profile: 'collection',
          title: { en: 'Saved items' },
          units: [
            {
              id: 'saved',
              title: { en: 'Saved' },
              items: [{ id: 'lesson-tides', kind: 'lesson', lesson: 'tides' }],
            },
          ],
        },
        received: [],
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
      collections: doc.collections,
    };
  },
};
