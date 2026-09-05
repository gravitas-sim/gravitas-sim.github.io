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
// Responses are keyed by position - `tides:7`, `tides:7:d1` - because that is
// what the panel has always used. Position is not identity: insert a step at
// the top of a lesson and every answer below it now belongs to the wrong
// question, silently and plausibly.
//
// A backup therefore records a *fingerprint* of each step alongside its index,
// and restoring matches on the fingerprint first. The fingerprint is built only
// from fields js/data/investigations/i18n.js lists as STRUCTURAL - type, kind,
// widget id, field ids, scenario - so it is identical whether the lesson was
// last opened in English or in Spanish. A title would have been more
// discriminating and would have broken the moment a reader switched language.
// =============================================================================

/** Bumped when the shape below changes in a way a reader must notice. */
export const BACKUP_VERSION = 1;

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
  stepIndex,
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
      stepIndex: Number(stepIndex) || 0,
      startedAt: startedAt || null,
      visited: [...(visited || [])],
      responses: { ...(responses || {}) },
      attempts: { ...(attempts || {}) },
    },
    // The map that makes a reordered lesson recoverable.
    steps: steps.map((step, index) => ({
      index,
      fingerprint: stepFingerprint(step),
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

/** Split a response key into its step index and whatever follows it. */
function splitKey(key, lessonId) {
  const prefix = `${lessonId}:`;
  if (!key.startsWith(prefix)) return null;
  const rest = key.slice(prefix.length);
  const cut = rest.indexOf(':');
  const indexPart = cut === -1 ? rest : rest.slice(0, cut);
  const index = Number(indexPart);
  if (!Number.isInteger(index)) return null;
  return { index, suffix: cut === -1 ? '' : rest.slice(cut) };
}

/**
 * Work out where each backed-up step lives in the lesson as it stands now.
 *
 * Three outcomes per step, and the caller reports all three:
 *
 *   same place   the fingerprint at that index still matches
 *   moved        the fingerprint matches a step at a different index
 *   gone         no step in the lesson has that fingerprint
 *
 * Matching is greedy and left to right, so two identical steps that swapped
 * places keep one answer each rather than both collapsing onto the first.
 *
 * @param {Array<{index: number, fingerprint: string}>} backupSteps - From the file
 * @param {Array<object>} lessonSteps - The lesson now
 * @returns {{map: Map<number, number>, moved: number[], dropped: number[]}} The plan
 */
export function remapSteps(backupSteps, lessonSteps) {
  const map = new Map();
  const moved = [];
  const dropped = [];
  const now = (lessonSteps || []).map(stepFingerprint);
  const taken = new Set();

  for (const entry of backupSteps || []) {
    const from = Number(entry?.index);
    if (!Number.isInteger(from)) continue;
    const want = entry.fingerprint;

    if (now[from] === want && !taken.has(from)) {
      map.set(from, from);
      taken.add(from);
      continue;
    }
    const to = now.findIndex((f, i) => f === want && !taken.has(i));
    if (to === -1) {
      dropped.push(from);
      continue;
    }
    map.set(from, to);
    taken.add(to);
    if (to !== from) moved.push(from);
  }
  return { map, moved, dropped };
}

/**
 * Turn a validated backup into progress for the lesson as it stands now.
 *
 * A backup with no step map - hand-written, or from a future build that stopped
 * emitting one - falls back to positional restore, which is what the format did
 * before fingerprints existed and is still better than refusing the file.
 *
 * @param {object} backup - A validated backup
 * @param {object} lesson - The merged lesson to restore into
 * @returns {{responses: object, attempts: object, visited: Set<number>,
 *   stepIndex: number, startedAt: ?string, moved: number[], dropped: number[],
 *   discardedKeys: number}} The progress, and what had to be changed
 */
export function restoreProgress(backup, lesson) {
  const lessonId = lesson?.id;
  const lessonSteps = Array.isArray(lesson?.steps) ? lesson.steps : [];
  const source = backup.progress || {};
  const hasMap = Array.isArray(backup.steps) && backup.steps.length > 0;

  const { map, moved, dropped } = hasMap
    ? remapSteps(backup.steps, lessonSteps)
    : {
        map: new Map(lessonSteps.map((_, i) => [i, i])),
        moved: [],
        dropped: [],
      };

  const responses = {};
  const attempts = {};
  let discardedKeys = 0;

  const rekey = (from, table, out) => {
    for (const [key, value] of Object.entries(table || {})) {
      const parsed = splitKey(key, backup.lesson.id);
      if (!parsed) {
        discardedKeys++;
        continue;
      }
      const to = from.get(parsed.index);
      if (to === undefined || to >= lessonSteps.length) {
        discardedKeys++;
        continue;
      }
      out[`${lessonId}:${to}${parsed.suffix}`] = value;
    }
  };
  rekey(map, source.responses, responses);
  rekey(map, source.attempts, attempts);

  const visited = new Set();
  for (const index of source.visited || []) {
    const to = map.get(Number(index));
    if (to !== undefined && to < lessonSteps.length) visited.add(to);
  }

  // Where the reader was, moved with its step and clamped into the lesson.
  const wanted = map.get(Number(source.stepIndex));
  const stepIndex = Math.max(
    0,
    Math.min(
      lessonSteps.length - 1,
      wanted === undefined ? Number(source.stepIndex) || 0 : wanted
    )
  );

  return {
    responses,
    attempts,
    visited,
    stepIndex,
    startedAt: source.startedAt || null,
    moved,
    dropped,
    discardedKeys,
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
