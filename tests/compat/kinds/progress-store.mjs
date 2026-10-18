import { lesson } from './_lesson.mjs';

// The progress record a lesson keeps in localStorage (schema 2).
// Reader: readProgress -> the responses, attempts, visited set, notes.
export default {
  id: 'progress-store',
  label: 'investigation progress (localStorage)',
  format: 'investigation progress/2 (schema)',
  newToOld: 'accepts',
  capabilities: 'none',
  // What the 2.0.0 reader does with a top-level field it does not know:
  // 'refused', 'ignored' (accepted, silently dropped), or 'n/a' (the record is
  // an encoded fragment, so there is no field to add from outside).
  unknownFields: 'ignored',
  async make(load) {
    const { writeProgress } = await load('js/investigations/progressSchema.js');
    return writeProgress({
      lesson: lesson(),
      responses: { 'tides:guess': 0 },
      attempts: { 'tides:guess': 1 },
      visited: new Set(['intro', 'guess']),
      stepSid: 'guess',
      startedAt: '2026-10-01T00:00:00.000Z',
      depth: 'core',
      deepest: 'core',
      spent: {},
    });
  },
  async read(load, doc) {
    const { readProgress } = await load('js/investigations/progressSchema.js');
    const r = readProgress(doc, lesson());
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
    const r = readProgress(doc, lesson());
    return writeProgress({
      lesson: lesson(),
      ...r,
      depth: doc.depth,
      deepest: doc.deepest,
      spent: doc.spent,
    });
  },
};
