// =============================================================================
// Where experiments live between sessions
// -----------------------------------------------------------------------------
// localStorage, because the site is static and there is no server to put them
// on, and because an experiment belongs to the student rather than to us.
//
// Three things this has to get right that a plain setItem() does not:
//
//   A version on the format. A student's saved experiments outlive any given
//   build, and the shape here will change. Every record carries the schema
//   version it was written under and is migrated forward on read, so an
//   experiment saved today opens next term instead of throwing.
//
//   A bound on the size. Recorded runs are the largest thing the application
//   ever asks a browser to keep, and localStorage is a shared five-megabyte
//   budget that the lessons, the theme and the saved simulation also draw on.
//   An unbounded store would work for a month and then start failing the
//   *lesson* progress saves, which is a bug nobody would trace back to here.
//
//   A real answer when it is full. Quota failures are not exceptional: private
//   browsing rejects every write, and a shared machine can be full on arrival.
//   Every write returns why it failed, and the caller can offer the one thing
//   that actually helps - export the experiment to a file - instead of an
//   alert that says "failed".
// =============================================================================

/** Bumped when the record shape changes. See migrate(). */
export const SCHEMA_VERSION = 2;

/** One key per experiment, so a large one cannot slow down reading a small one. */
export const KEY_PREFIX = 'gravitas_experiment_';
/** The index, so listing does not have to parse every experiment. */
export const INDEX_KEY = 'gravitas_experiments_index';

/**
 * Caps, in characters of serialized JSON.
 *
 * Roughly two megabytes total against a five-megabyte browser budget, leaving
 * room for everything else the application stores. Per-experiment is a quarter
 * of that: ten thousand samples of six metrics is about 400KB, so the cap bites
 * on a genuinely runaway recording rather than on ordinary use.
 */
export const LIMITS = {
  perExperiment: 512 * 1024,
  total: 2 * 1024 * 1024,
  maxExperiments: 40,
};

/** Why a write did not happen. */
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
 * Defaults to localStorage where there is one. A private-mode browser throws
 * from the *getter*, not just from setItem, which is why this is wrapped.
 */
let backend = null;

/** @param {Object|null} impl - A Storage-like object, or null to reset */
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

// --- Index ---------------------------------------------------------------------

/**
 * List every stored experiment, newest first.
 * @returns {Array<{id:string, name:string, updated:number, bytes:number}>} Index
 */
export function listExperiments() {
  const s = storage();
  if (!s) return [];
  try {
    const raw = s.getItem(INDEX_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    const entries = Array.isArray(parsed?.items) ? parsed.items : [];
    return entries
      .filter(e => e && typeof e.id === 'string')
      .sort((a, b) => (b.updated || 0) - (a.updated || 0));
  } catch {
    return [];
  }
}

function writeIndex(items) {
  const s = storage();
  if (!s) return false;
  try {
    s.setItem(INDEX_KEY, JSON.stringify({ v: SCHEMA_VERSION, items }));
    return true;
  } catch {
    return false;
  }
}

/** Total characters currently used by experiments. @returns {number} Bytes */
export function usedBytes() {
  return listExperiments().reduce((sum, e) => sum + (e.bytes || 0), 0);
}

// --- Migration -----------------------------------------------------------------

/**
 * Bring a record forward to the current schema.
 *
 * Version 1 stored the two runs as `runA`/`runB` with bare sample arrays and
 * no units block. Version 2 names them `runs` keyed by label and records the
 * unit each metric was sampled in, because a file that does not say its units
 * is a file that will be misread.
 *
 * A record from the future is refused rather than guessed at: better to tell a
 * student their experiment needs a newer Gravitas than to open it wrongly.
 *
 * @param {Object} record - A parsed record of any known version
 * @returns {{ok:boolean, record:Object|null, reason:string}} Migrated record
 */
export function migrate(record) {
  if (!record || typeof record !== 'object') {
    return { ok: false, record: null, reason: 'not-an-experiment' };
  }
  const v = Number(record.v) || 1;
  if (v > SCHEMA_VERSION) {
    return { ok: false, record: null, reason: 'from-a-newer-version' };
  }
  let out = record;
  if (v < 2) {
    const { runA, runB, ...rest } = out;
    out = {
      ...rest,
      runs: {
        ...(runA ? { A: normaliseRun(runA) } : {}),
        ...(runB ? { B: normaliseRun(runB) } : {}),
      },
      units: out.units || {},
    };
  }
  return { ok: true, record: { ...out, v: SCHEMA_VERSION }, reason: '' };
}

function normaliseRun(run) {
  if (Array.isArray(run)) return { samples: run, recordedAt: 0 };
  return {
    samples: Array.isArray(run.samples) ? run.samples : [],
    recordedAt: Number(run.recordedAt) || 0,
    ...run,
  };
}

// --- Read and write --------------------------------------------------------------

/**
 * Load one experiment.
 * @param {string} id - Experiment id
 * @returns {{ok:boolean, record:Object|null, reason:string}} The record
 */
export function loadExperiment(id) {
  const s = storage();
  if (!s) return { ok: false, record: null, reason: FAILURE.UNAVAILABLE };
  try {
    const raw = s.getItem(KEY_PREFIX + id);
    if (!raw) return { ok: false, record: null, reason: 'not-found' };
    return migrate(JSON.parse(raw));
  } catch (err) {
    return { ok: false, record: null, reason: err.message || 'unreadable' };
  }
}

/**
 * Save one experiment, refusing rather than half-writing.
 *
 * The size checks happen before the write, so a too-large experiment leaves
 * the store exactly as it was and the caller can offer an export instead. The
 * quota catch is still needed: another tab can fill the budget between the
 * check and the write, and a browser in private mode rejects everything.
 *
 * @param {Object} record - The experiment
 * @returns {{ok:boolean, reason:string, bytes:number, limit:number}} Outcome
 */
export function saveExperiment(record) {
  const s = storage();
  if (!s) {
    return { ok: false, reason: FAILURE.UNAVAILABLE, bytes: 0, limit: 0 };
  }
  const stamped = { ...record, v: SCHEMA_VERSION, updated: Date.now() };
  const text = JSON.stringify(stamped);
  const bytes = text.length;

  if (bytes > LIMITS.perExperiment) {
    return {
      ok: false,
      reason: FAILURE.TOO_LARGE,
      bytes,
      limit: LIMITS.perExperiment,
    };
  }

  const index = listExperiments();
  const existing = index.find(e => e.id === record.id);
  if (!existing && index.length >= LIMITS.maxExperiments) {
    return {
      ok: false,
      reason: FAILURE.TOO_MANY,
      bytes,
      limit: LIMITS.maxExperiments,
    };
  }
  const after = usedBytes() - (existing?.bytes || 0) + bytes;
  if (after > LIMITS.total) {
    return {
      ok: false,
      reason: FAILURE.TOTAL_EXCEEDED,
      bytes: after,
      limit: LIMITS.total,
    };
  }

  try {
    s.setItem(KEY_PREFIX + record.id, text);
  } catch (err) {
    // QuotaExceededError, or a private-mode refusal. Either way the caller
    // needs to hear "your browser will not store this", not a stack trace.
    return {
      ok: false,
      reason: FAILURE.QUOTA,
      bytes,
      limit: LIMITS.total,
      detail: err?.name || '',
    };
  }

  const items = index.filter(e => e.id !== record.id);
  items.push({
    id: record.id,
    name: record.name || 'Experiment',
    updated: stamped.updated,
    bytes,
  });
  if (!writeIndex(items)) {
    // The experiment is stored but unlisted, which is worse than not stored:
    // it occupies the budget and cannot be found. Take it back out.
    try {
      s.removeItem(KEY_PREFIX + record.id);
    } catch {
      /* nothing further to try */
    }
    return { ok: false, reason: FAILURE.QUOTA, bytes, limit: LIMITS.total };
  }

  return { ok: true, reason: FAILURE.OK, bytes, limit: LIMITS.perExperiment };
}

/**
 * Delete one experiment and forget it.
 * @param {string} id - Experiment id
 * @returns {boolean} Whether anything was removed
 */
export function deleteExperiment(id) {
  const s = storage();
  if (!s) return false;
  try {
    s.removeItem(KEY_PREFIX + id);
  } catch {
    /* it may already be gone; the index is what listing reads */
  }
  const items = listExperiments().filter(e => e.id !== id);
  return writeIndex(items);
}

/** Counts ids handed out, so two in one millisecond cannot be the same. */
let idSequence = 0;

/**
 * A fresh id.
 *
 * Time-ordered so a listing sorts naturally, then a sequence number, then a
 * random tail. The sequence is what makes it actually unique: twenty bits of
 * randomness collides about once in fifty times across two hundred ids drawn
 * in the same millisecond, which duplicating an experiment in a loop does, and
 * a collision here silently overwrites somebody's saved work.
 *
 * @returns {string} Experiment id
 */
export function newId() {
  const now = Date.now().toString(36);
  const seq = (idSequence++).toString(36);
  const rand = Math.floor(Math.random() * 0x100000)
    .toString(36)
    .padStart(4, '0');
  return `x${now}-${seq}${rand}`;
}

/**
 * Copy an experiment under a new id and name.
 * @param {Object} record - The experiment to copy
 * @param {string} name - Name for the copy
 * @returns {Object} The copy, unsaved
 */
export function duplicateRecord(record, name) {
  return {
    ...JSON.parse(JSON.stringify(record)),
    id: newId(),
    name,
    created: Date.now(),
    updated: Date.now(),
  };
}

/**
 * How full the store is, for a quota readout the student can act on.
 * @returns {{used:number, total:number, count:number, max:number,
 *   fraction:number}} Usage
 */
export function storageReport() {
  const used = usedBytes();
  return {
    used,
    total: LIMITS.total,
    count: listExperiments().length,
    max: LIMITS.maxExperiments,
    fraction: LIMITS.total > 0 ? used / LIMITS.total : 0,
  };
}
