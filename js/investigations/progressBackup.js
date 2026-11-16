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
// written into the lesson (tools/add-step-ids.mjs) and protected from
// translation by STRUCTURAL. A sid survives reordering, rewording and a change
// of language, because it is derived from none of them.
//
// Version 1 keyed by *position* and carried a structural fingerprint per step.
// Position is not identity (insert a step at the top and every answer below it
// belongs to the question above), and neither is a fingerprint: two four-option
// predict steps produce the same string, and swapping them moved one answer onto
// the other's question while reporting that nothing had moved.
//
// So a v1 backup is restored *by position*, the only mapping its contents
// support, and the fingerprints are a **check**, not a matcher: where the one at
// a position disagrees with the step now there, the restore says so instead of
// hunting for a better-looking home. Reporting uncertainty is the improvement;
// guessing plausibly is what went wrong before.
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
  // The answer's semantics, which the count alone does not carry: a stored
  // answer is an INDEX, so a same-length reorder of the options, or a moved
  // correct option, numeric answer or tolerance, would otherwise change what
  // "2" means and go on being called valid. Not the option prose: the Spanish
  // shadow translates it. What is hashed is the shape of the answer.
  parts.push(answerSignature(step));
  return parts.join('|');
}

/**
 * What would make a stored answer mean something different.
 *
 * @param {object} step - Step definition
 * @returns {string} A short signature, or '-'
 */
function answerSignature(step) {
  const bits = [];
  // A formula's expected value is the student's own, so the signature is the
  // formula, not the number it gives today.
  if (step.formula) bits.push(`f=${JSON.stringify(step.formula)}`);
  else if (step.answer !== undefined && step.answer !== null) {
    bits.push(`a=${JSON.stringify(step.answer)}`);
  }
  if (Number.isFinite(step.tolerance)) bits.push(`t=${step.tolerance}`);
  if (step.unit) bits.push(`u=${step.unit}`);
  // A choice question's correct option, by position: the one thing a reorder
  // moves and a translation does not.
  if (Array.isArray(step.options) && Number.isInteger(step.answer)) {
    bits.push(`c=${step.answer}`);
  }
  // Multi-select and rubric shapes, when a lesson uses them.
  if (Array.isArray(step.correct))
    bits.push(`m=${[...step.correct].join(',')}`);
  return bits.length ? bits.join(';') : '-';
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
 * @returns {object} The backup, ready to be serialized
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
      ...(lesson?.pack ? { pack: lesson.pack } : {}),
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
  const no = reason => ({ ok: false, reason });
  const nil = v => v === undefined || v === null;
  if (!isPlainObject(data)) return no('notAnObject');
  if (data.kind !== BACKUP_KIND) return no('notABackup');
  if (!Number.isInteger(data.version) || data.version < 1)
    return no('noVersion');
  if (data.version > BACKUP_VERSION) return no('tooNew');
  if (typeof data.lesson?.id !== 'string') return no('noLesson');
  const p = data.progress;
  if (!isPlainObject(p)) return no('noProgress');

  // Every field is checked before the caller is allowed to touch a student's
  // current answers: a file that was almost a backup could otherwise half-apply
  // and leave the panel holding a mixture.
  if (!isPlainObject(p.responses, true)) return no('badResponses');
  if (!isPlainObject(p.attempts, true)) return no('badAttempts');
  if (p.visited !== undefined && !Array.isArray(p.visited))
    return no('badVisited');
  if (!isScalarMap(p.responses)) return no('badResponses');
  if (!isNumberMap(p.attempts)) return no('badAttempts');
  if (
    !nil(p.startedAt) &&
    (typeof p.startedAt !== 'string' || Number.isNaN(Date.parse(p.startedAt)))
  )
    return no('badStartedAt');
  if (
    (!nil(p.stepSid) && typeof p.stepSid !== 'string') ||
    (p.stepIndex !== undefined && !Number.isInteger(p.stepIndex))
  )
    return no('badPosition');
  if (
    data.steps !== undefined &&
    (!Array.isArray(data.steps) ||
      data.steps.some(
        e =>
          !isPlainObject(e) ||
          (!nil(e.sid) && typeof e.sid !== 'string') ||
          (e.index !== undefined && !Number.isInteger(e.index))
      ))
  )
    return no('badSteps');
  return { ok: true };
}

/** A real object, not an array and not null. `optional` allows absence. */
function isPlainObject(value, optional = false) {
  if (value === undefined || value === null) return optional;
  return typeof value === 'object' && !Array.isArray(value);
}

/**
 * Every value is something a response can be.
 *
 * Answers are strings, numbers and booleans - a choice index, a typed
 * measurement, a "model answer shown" flag. Anything else is a structure this
 * build never wrote, and applying it would put an object where the panel
 * expects a value.
 */
function isScalarMap(map) {
  if (!map) return true;
  for (const value of Object.values(map)) {
    const kind = typeof value;
    if (kind !== 'string' && kind !== 'number' && kind !== 'boolean')
      return false;
    if (kind === 'number' && !Number.isFinite(value)) return false;
    if (kind === 'string' && value.length > 20000) return false;
  }
  return true;
}

/** Attempt counts are finite non-negative integers or the file is not ours. */
function isNumberMap(map) {
  if (!map) return true;
  for (const value of Object.values(map)) {
    if (!Number.isInteger(value) || value < 0 || value > 1e6) return false;
  }
  return true;
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
 * deleted is set aside in `earlier`. Nothing is inferred.
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
 *   quarantined: object, earlier: {responses: object, attempts: object},
 *   uncertain: number, discardedKeys: number, byPosition: boolean}} The
 *   progress, and everything that was not certain
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

  const isRetired = sid =>
    !indexBySid.has(sid) && Object.hasOwn(lesson?.retired ?? {}, sid);

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
        // A step the lesson retired is set aside (kept below), not lost.
        if (!isRetired(sid)) dropped.push(sid);
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

  // Answers to steps this lesson no longer has: an exported backup carries the
  // ones the student's browser had set aside, so a restore sets them aside too.
  const earlier = { responses: {}, attempts: {} };
  const rekey = (table, out, gone) => {
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
      // Only a retired step is kept: an unassigned one is not carried.
      if (to === undefined && !byPosition && isRetired(parsed.head)) {
        gone[`${lessonId}:${parsed.head}${parsed.suffix}`] = value;
        continue;
      }
      if (to === undefined || to >= lessonSteps.length) {
        discardedKeys++;
        continue;
      }
      out[`${lessonId}:${sids[to]}${parsed.suffix}`] = value;
    }
  };
  rekey(source.responses, responses, earlier.responses);
  rekey(source.attempts, attempts, earlier.attempts);

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
    earlier,
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
