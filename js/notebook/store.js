// =============================================================================
// Where the notebook lives between sessions
// -----------------------------------------------------------------------------
// localStorage, for the same reason as the experiment store: the site is
// static, there is no server, and a student's evidence belongs to them.
//
// The two things this has to get right that a plain setItem() does not are the
// same two, and the answers are deliberately the same so there is one pattern
// in the codebase rather than two:
//
//   A bound on the size, because localStorage is one shared five-megabyte
//   budget that the lessons, the saved simulation and the experiments also
//   draw on. An unbounded notebook would work for a term and then start
//   failing *lesson progress* saves, which is a bug nobody would trace here.
//
//   A real answer when it is full. Quota failures are ordinary - private
//   browsing refuses every write, a shared machine can arrive full - so every
//   write returns why it failed and the panel offers the thing that actually
//   helps, which is to download the notebook to a file.
//
// One key, not one per entry: the order is part of the data, so reading the
// notebook means reading all of it anyway.
// =============================================================================

/** Bumped when the stored envelope changes. */
export const SCHEMA_VERSION = 1;

/** Where it is kept. */
export const KEY = 'gravitas_evidence_notebook';

/**
 * Caps, in characters of serialized JSON.
 *
 * A megabyte total against a five-megabyte browser budget: the notebook is
 * prose and a few hundred plotted points per entry, so this bites on a
 * runaway figure rather than on a term's work. Per entry is a sixteenth of
 * that, which a capped figure plus three prose fields cannot reach by
 * accident.
 */
export const LIMITS = {
  perEntry: 64 * 1024,
  total: 1024 * 1024,
  maxEntries: 60,
};

/** Why a write did not happen. The panel says one of these out loud. */
export const FAILURE = {
  OK: 'ok',
  TOO_LARGE: 'too-large',
  TOTAL_EXCEEDED: 'total-exceeded',
  TOO_MANY: 'too-many',
  QUOTA: 'quota',
  UNAVAILABLE: 'unavailable',
};

/**
 * The storage backend, injectable so the tests do not need a browser.
 *
 * A private-mode browser throws from the *getter* and not only from setItem,
 * which is why every access goes through storage() below.
 */
let backend = null;

/** @param {?object} impl - A Storage-like object, or null to reset */
export function setBackend(impl) {
  backend = impl;
}

function storage() {
  if (backend) return backend;
  try {
    if (typeof localStorage === 'undefined') return null;
    return localStorage;
  } catch {
    return null;
  }
}

/**
 * Whether this browser will store anything at all.
 *
 * Probed with a real write, because a browser can hand over a Storage object
 * that refuses every setItem - which is what private mode does, and what a
 * feature-detection check on `typeof localStorage` misses.
 *
 * @returns {boolean} True when a write would be kept
 */
export function isAvailable() {
  const s = storage();
  if (!s) return false;
  try {
    const probe = `${KEY}__probe`;
    s.setItem(probe, '1');
    s.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}

/**
 * Read the notebook.
 *
 * A payload from a newer build is refused rather than guessed at: opening it
 * wrongly would show a student altered evidence, which is the one thing this
 * feature must never do.
 *
 * @returns {{ok: boolean, entries: Array<object>, reason: string}} The notebook
 */
export function load() {
  const s = storage();
  if (!s) return { ok: false, entries: [], reason: FAILURE.UNAVAILABLE };
  let raw;
  try {
    raw = s.getItem(KEY);
  } catch {
    return { ok: false, entries: [], reason: FAILURE.UNAVAILABLE };
  }
  if (!raw) return { ok: true, entries: [], reason: FAILURE.OK };
  try {
    const parsed = JSON.parse(raw);
    if (Number(parsed?.v) > SCHEMA_VERSION) {
      return { ok: false, entries: [], reason: 'from-a-newer-version' };
    }
    const entries = Array.isArray(parsed?.entries) ? parsed.entries : [];
    return { ok: true, entries, reason: FAILURE.OK };
  } catch {
    return { ok: false, entries: [], reason: 'unreadable' };
  }
}

/**
 * Write the notebook, refusing rather than half-writing.
 *
 * The size checks happen before the write, so a notebook that is too large
 * leaves the stored one exactly as it was and the caller can offer a download
 * instead. The quota catch is still needed: another tab can fill the budget
 * between the check and the write.
 *
 * @param {Array<object>} entries - The notebook, in order
 * @returns {{ok: boolean, reason: string, bytes: number, limit: number}} Outcome
 */
export function save(entries) {
  const s = storage();
  if (!s) {
    return { ok: false, reason: FAILURE.UNAVAILABLE, bytes: 0, limit: 0 };
  }
  if (entries.length > LIMITS.maxEntries) {
    return {
      ok: false,
      reason: FAILURE.TOO_MANY,
      bytes: 0,
      limit: LIMITS.maxEntries,
    };
  }
  for (const entry of entries) {
    const size = JSON.stringify(entry).length;
    if (size > LIMITS.perEntry) {
      return {
        ok: false,
        reason: FAILURE.TOO_LARGE,
        bytes: size,
        limit: LIMITS.perEntry,
        id: entry.id,
      };
    }
  }
  const text = JSON.stringify({ v: SCHEMA_VERSION, entries });
  const bytes = text.length;
  if (bytes > LIMITS.total) {
    return {
      ok: false,
      reason: FAILURE.TOTAL_EXCEEDED,
      bytes,
      limit: LIMITS.total,
    };
  }
  try {
    s.setItem(KEY, text);
  } catch (err) {
    // QuotaExceededError, or a private-mode refusal. Either way the student
    // needs to hear "your browser will not keep this", not a stack trace.
    return {
      ok: false,
      reason: FAILURE.QUOTA,
      bytes,
      limit: LIMITS.total,
      detail: err?.name || '',
    };
  }
  return { ok: true, reason: FAILURE.OK, bytes, limit: LIMITS.total };
}

/** Forget the stored notebook. @returns {boolean} Whether anything was removed */
export function clear() {
  const s = storage();
  if (!s) return false;
  try {
    s.removeItem(KEY);
    return true;
  } catch {
    return false;
  }
}

/**
 * How full the store is, for a readout a student can act on.
 *
 * @param {Array<object>} entries - The notebook in memory
 * @returns {{used: number, total: number, count: number, max: number,
 *   fraction: number}} Usage
 */
export function report(entries = []) {
  const used = JSON.stringify({ v: SCHEMA_VERSION, entries }).length;
  return {
    used,
    total: LIMITS.total,
    count: entries.length,
    max: LIMITS.maxEntries,
    fraction: LIMITS.total > 0 ? used / LIMITS.total : 0,
  };
}
