import { lesson } from './_lesson.mjs';

// A progress backup file (gravitas.investigation.progress/2).
// Reader: validateBackup -> {ok, reason}; restoreProgress puts it back.
export default {
  id: 'progress-backup',
  label: 'progress backup',
  format: 'gravitas.investigation.progress/2',
  newToOld: 'accepts',
  capabilities: 'none',
  // What the 2.0.0 reader does with a top-level field it does not know:
  // 'refused', 'ignored' (accepted, silently dropped), or 'n/a' (the record is
  // an encoded fragment, so there is no field to add from outside).
  unknownFields: 'ignored',
  async make(load) {
    const { buildBackup } = await load('js/investigations/progressBackup.js');
    const b = buildBackup({
      lesson: lesson(),
      responses: { 'tides:guess': 0, 'tides:ask': 2 },
      attempts: { 'tides:guess': 1 },
      visited: ['intro', 'guess'],
      stepSid: 'guess',
      startedAt: '2026-10-01T00:00:00.000Z',
      studentName: null,
    });
    return { ...b, savedAt: '2026-10-01T00:00:00.000Z' };
  },
  async read(load, doc) {
    const { validateBackup, restoreProgress } = await load(
      'js/investigations/progressBackup.js'
    );
    const v = validateBackup(doc);
    if (!v.ok) return { accepted: false, problems: [v.reason] };
    const restored = restoreProgress(doc, lesson());
    return { accepted: true, value: JSON.parse(JSON.stringify(restored)) };
  },
  async rewrite(load, doc) {
    // A new build restores the backup and saves it again: what it saves is
    // built from the progress it read.
    const { validateBackup, buildBackup } = await load(
      'js/investigations/progressBackup.js'
    );
    if (!validateBackup(doc).ok) throw new Error('not readable');
    const p = doc.progress;
    return {
      ...buildBackup({
        lesson: lesson(),
        responses: p.responses,
        attempts: p.attempts,
        visited: p.visited,
        stepSid: p.stepSid,
        startedAt: p.startedAt,
      }),
      savedAt: doc.savedAt,
    };
  },
};
