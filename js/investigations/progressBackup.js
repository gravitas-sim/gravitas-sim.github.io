// =============================================================================
// Backing up a student's progress
// -----------------------------------------------------------------------------
// Progress lives in localStorage, which is the right place for it - no account,
// no backend, nothing leaves the machine - and is also a place that can vanish.
// Private browsing refuses to write. A full disk refuses to write. A shared lab
// machine clears site data between sessions. A student who has spent forty
// minutes on The Missing Mass and loses it to any of those has lost real work.
//
// So progress can be written to a file and read back. The file is the recovery
// format; the PDF report remains the thing that gets handed in. They are
// different jobs: one has to be editable and machine-readable, the other has to
// be readable by a marker and impossible to tamper with casually.
//
// Stable step identity
// -----------------------------------------------------------------------------
// Version 2 of this format keys progress by a step's `sid` - the stable id
// written into the lesson, minted by tools/add-step-ids.mjs and protected from
// translation by STRUCTURAL. A sid survives reordering, rewording and a change
// of language, because it is derived from none of them.
//
// Version 1 keyed by *position* and carried a structural fingerprint per step
// so a reordered lesson could be recovered. Both of those are wrong, in
// different ways:
//
//   Position is not identity. Insert a step at the top and every answer below
//   it belongs to the question above the one it answers.
//
//   A structural fingerprint is not identity either. It is built from type,
//   kind, widget id, scenario and field ids, so two four-option predict steps
//   produce the same string. `detect-this-planet` has three such pairs; swapping
//   steps 1 and 5 moved one answer onto the other's question and reported that
//   nothing had moved, which is worse than refusing.
//
// So a v1 backup is now restored *by position*, which is the only mapping its
// contents actually support, and the fingerprints are used as a **check**
// rather than as a matcher: where the fingerprint at a position disagrees with
// the step now there, the restore says so instead of quietly hunting for a
// better-looking home for the answer. Reporting uncertainty is the whole
// improvement; guessing plausibly is what went wrong before.
// =============================================================================

/**
 * Bumped when the shape below changes in a way a reader must notice.
 *
 * 1: keyed by step index, with a structural fingerprint per step.
 * 2: keyed by step sid, with the fingerprint kept only as a cross-check and
 *    an option count so a reordered answer list can be caught.
 */
export const BACKUP_VERSION = 2;

/** The oldest format this build can still read. */
export const MIN_BACKUP_VERSION = 1;

/** What this file is, so a stray JSON file is not mistaken for one. */
export const BACKUP_KIND = 'gravitas.investigation.progress';

/** Refuse anything larger. A whole lesson's progress is a few kilobytes. */
export const MAX_BACKUP_BYTES = 512 * 1024;

/**
 * A locale-invariant fingerprint of one step.
 *
 * Deliberately not a hash: it is short enough to read, and a person looking at
 * a backup file should be able to see why a step did or did not match.
 *
 * @param {object} step - A step from the merged lesson
 * @returns {string} The fingerprint
 */
export function stepFingerprint(step) {
  if (!step || typeof step !== 'object') return 'unknown';
  const parts = [step.type || '?', step.kind || '-'];
  parts.push(step.tool?.id || '-');
  parts.push(step.setup?.scenario || '-');
  const fields = Array.isArray(step.fields)
    ? step.fields
        .map(f => f?.id)
        .filter(Boolean)
        .join('+')
    : '';
  parts.push(fields || '-');
  // The number of options discriminates two choice questions from each other
  // without depending on their wording.
  parts.push(Array.isArray(step.options) ? String(step.options.length) : '-');
  return parts.join('|');
}

/**
 * Build a backup of one lesson's progress.
 *
 * @param {object} params
 * @param {object} params.lesson - The merged lesson
 * @param {object} params.responses - stepId -> value
 * @param {object} params.attempts - stepId -> count
 * @param {Iterable<number>} params.visited - Step indices seen
 * @param {number} params.stepIndex - Where the reader is
 * @param {?string} params.startedAt - ISO timestamp
 * @param {?string} [params.studentName] - Whatever name was given
 * @returns {object} The backup, ready to be serialised
 */
export function buildBackup({
  lesson,
  responses,
  attempts,
  visited,
  stepSid,
  startedAt,
  studentName = null,
}) {
  const steps = Array.isArray(lesson?.steps) ? lesson.steps : [];
  return {
    kind: BACKUP_KIND,
    version: BACKUP_VERSION,
    savedAt: new Date().toISOString(),
    lesson: {
      id: lesson?.id ?? null,
      title: lesson?.title ?? null,
      stepCount: steps.length,
    },
    student: studentName || null,
    progress: {
      // A sid, not an index: where the reader was has to survive a reorder too.
      stepSid: stepSid ?? null,
      startedAt: startedAt || null,
      visited: [...(visited || [])],
      responses: { ...(responses || {}) },
      attempts: { ...(attempts || {}) },
    },
    // Identity first; the fingerprint is retained only so a restore can say
    // when a step has been rewritten under its own id, and the option count so
    // a reordered answer list can be caught rather than silently mis-scored.
    steps: steps.map((step, index) => ({
      index,
      sid: step?.sid ?? null,
      fingerprint: stepFingerprint(step),
      optionCount: Array.isArray(step?.options) ? step.options.length : null,
    })),
  };
}

/**
 * Check that a parsed object really is one of our backups.
 *
 * Returns a reason rather than throwing, because every one of these is
 * something to tell the reader rather than a programming error.
 *
 * @param {*} data - Whatever came out of the file
 * @returns {{ok: true}|{ok: false, reason: string}} The verdict
 */
export function validateBackup(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { ok: false, reason: 'notAnObject' };
  }
  if (data.kind !== BACKUP_KIND) return { ok: false, reason: 'notABackup' };
  if (!Number.isInteger(data.version) || data.version < 1) {
    return { ok: false, reason: 'noVersion' };
  }
  if (data.version > BACKUP_VERSION) {
    return { ok: false, reason: 'tooNew' };
  }
  if (!data.lesson || typeof data.lesson.id !== 'string') {
    return { ok: false, reason: 'noLesson' };
  }
  const p = data.progress;
  if (!p || typeof p !== 'object') return { ok: false, reason: 'noProgress' };
  if (p.responses && typeof p.responses !== 'object') {
    return { ok: false, reason: 'badResponses' };
  }
  if (p.visited && !Array.isArray(p.visited)) {
    return { ok: false, reason: 'badVisited' };
  }
  return { ok: true };
}

/**
 * Split a response key into the step it names and whatever hangs off it.
 *
 * @param {string} key - e.g. `tides:twelve-nights:d1`
 * @param {string} lessonId - The lesson the key should belong to
 * @returns {?{head: string, suffix: string}} The parts, or null if foreign
 */
function splitStepKey(key, lessonId) {
  const prefix = `${lessonId}:`;
  if (typeof key !== 'string' || !key.startsWith(prefix)) return null;
  const rest = key.slice(prefix.length);
  const cut = rest.indexOf(':');
  return {
    head: cut === -1 ? rest : rest.slice(0, cut),
    suffix: cut === -1 ? '' : rest.slice(cut),
  };
}

/**
 * Turn a validated backup into progress for the lesson as it stands now.
 *
 * Two paths, because the two formats support different things.
 *
 * **v2** keys by sid, so the mapping is exact: an answer goes to the step whose
 * id it names, wherever that step now sits, and an answer whose step has been
 * deleted is dropped. Nothing is inferred.
 *
 * **v1** keys by index. Position is the only mapping its contents support, so
 * position is what is used - and the fingerprints it carries are used to *check*
 * that, not to search with. Where the fingerprint recorded at a position
 * disagrees with the step now at that position, the lesson demonstrably changed
 * there and the answer is set aside rather than applied: it is returned in
 * `quarantined` so nothing is destroyed, and counted in `uncertain` so the
 * reader is told. The previous version searched for a matching fingerprint
 * instead, which found a confident wrong answer whenever two steps had the same
 * shape.
 *
 * An answer to a choice step whose option list has changed length is also
 * quarantined: the stored value is an index into a list that no longer exists.
 *
 * @param {object} backup - A validated backup
 * @param {object} lesson - The merged lesson to restore into
 * @returns {{responses: object, attempts: object, visited: Set<string>,
 *   stepIndex: number, startedAt: ?string, moved: string[], dropped: string[],
 *   quarantined: object, uncertain: number, discardedKeys: number,
 *   byPosition: boolean}} The progress, and everything that was not certain
 */
export function restoreProgress(backup, lesson) {
  const lessonId = lesson?.id;
  const lessonSteps = Array.isArray(lesson?.steps) ? lesson.steps : [];
  const source = backup.progress || {};
  const backupSteps = Array.isArray(backup.steps) ? backup.steps : [];
  const fromId = backup.lesson?.id;

  const sids = lessonSteps.map(step => step?.sid);
  const indexBySid = new Map(sids.map((sid, i) => [sid, i]));
  const optionCountNow = lessonSteps.map(step =>
    Array.isArray(step?.options) ? step.options.length : null
  );

  const version = Number(backup.version) || 1;
  const byPosition = version < 2 || !backupSteps.some(entry => entry?.sid);

  const responses = {};
  const attempts = {};
  const quarantined = {};
  const moved = [];
  const dropped = [];
  let discardedKeys = 0;
  let uncertain = 0;

  // What each key's step-head resolves to now: an index, or null to drop it.
  // Built once so responses and attempts cannot disagree.
  const resolve = new Map();
  const quarantineHeads = new Set();

  if (byPosition) {
    const fingerprintAt = new Map(
      backupSteps
        .filter(e => Number.isInteger(Number(e?.index)))
        .map(e => [Number(e.index), e.fingerprint])
    );
    lessonSteps.forEach((step, i) => {
      const head = String(i);
      if (i >= (backup.lesson?.stepCount ?? lessonSteps.length)) return;
      const recorded = fingerprintAt.get(i);
      if (recorded !== undefined && recorded !== stepFingerprint(step)) {
        // The lesson changed at this position. The answer is recoverable and
        // is not applied.
        quarantineHeads.add(head);
        return;
      }
      resolve.set(head, i);
    });
  } else {
    for (const entry of backupSteps) {
      const sid = entry?.sid;
      if (!sid) continue;
      const to = indexBySid.get(sid);
      if (to === undefined) {
        dropped.push(sid);
        continue;
      }
      // An option list that changed length invalidates a stored choice index.
      const was = entry.optionCount ?? null;
      const now = optionCountNow[to];
      if (was !== null && now !== null && was !== now) {
        quarantineHeads.add(sid);
        continue;
      }
      resolve.set(sid, to);
      if (Number(entry.index) !== to) moved.push(sid);
    }
  }

  const rekey = (table, out) => {
    for (const [key, value] of Object.entries(table || {})) {
      const parsed = splitStepKey(key, fromId);
      if (!parsed) {
        discardedKeys++;
        continue;
      }
      if (quarantineHeads.has(parsed.head)) {
        quarantined[key] = value;
        uncertain++;
        continue;
      }
      const to = resolve.get(parsed.head);
      if (to === undefined || to >= lessonSteps.length) {
        discardedKeys++;
        continue;
      }
      out[`${lessonId}:${sids[to]}${parsed.suffix}`] = value;
    }
  };
  rekey(source.responses, responses);
  rekey(source.attempts, attempts);

  const visited = new Set();
  for (const entry of source.visited || []) {
    const to = resolve.get(String(entry));
    if (to !== undefined && to < lessonSteps.length) visited.add(sids[to]);
  }

  // Where the reader was, moved with its step and clamped into the lesson.
  const wantedHead = byPosition
    ? String(Number(source.stepIndex) || 0)
    : (source.stepSid ?? '');
  const wanted = resolve.get(wantedHead);
  const stepIndex = Math.max(
    0,
    Math.min(lessonSteps.length - 1, wanted === undefined ? 0 : wanted)
  );

  return {
    responses,
    attempts,
    visited,
    stepIndex,
    startedAt: source.startedAt || null,
    moved,
    dropped,
    quarantined,
    uncertain,
    discardedKeys,
    byPosition,
  };
}

/**
 * A filename that sorts and is obviously what it is.
 *
 * @param {object} lesson - The merged lesson
 * @param {Date} [now] - For testing
 * @returns {string} The filename
 */
export function backupFilename(lesson, now = new Date()) {
  const stamp = now.toISOString().slice(0, 10);
  const id = (lesson?.id || 'investigation').replace(/[^a-z0-9-]/gi, '-');
  return `gravitas-${id}-progress-${stamp}.json`;
}
