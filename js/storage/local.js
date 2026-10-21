import { KEY_RESUME } from '../names.js';

// Student data in localStorage (STORAGE.md): every writer's way in. Keys and
// formats are unchanged; adds a size limit per record.
const area = s => s ?? (globalThis.window ?? globalThis).localStorage;

// Most one record may hold, in KiB (index.js COLLECTIONS has the same).
export const ITEM = {
  progress: 1024,
  evidence: 2048,
  experiments: 512,
  drafts: 2048,
  assignments: 1024,
  courses: 1024,
  made: 512,
  settings: 256,
  preferences: 64,
};

export const get = (key, store) => area(store).getItem(key);

// Over a collection's limit is a QuotaExceededError, as a full disk is.
export const put = (key, text, collection, store) => {
  if (text.length > ITEM[collection] * 1024) {
    const error = new Error(`${collection}: record too large`);
    const name = 'QuotaExceededError';
    throw Object.assign(error, { name, reason: 'itemTooLarge', collection });
  }
  area(store).setItem(key, text);
};

export const drop = (key, store) => area(store).removeItem(key);

// The value, or `fallback` if there is none or it is damaged.
export const readJson = (key, fallback = null, store) => {
  try {
    return JSON.parse(get(key, store)) ?? fallback;
  } catch {
    return fallback;
  }
};

// Whether the browser kept it.
export const writeJson = (key, value, collection, store) => {
  try {
    put(key, JSON.stringify(value), collection, store);
    return true;
  } catch {
    return false;
  }
};

// --- The one resume record (Roadmap III Prompt 163) ---------------------------
// Where a reader was: the items they opened last, newest first, and for each the
// pathway they came by and the step they stopped at. One key, one record, read
// by Home, the Library and My work, and written by the lesson's save and the
// Library's links. It is a sidecar, never a field of a progress record: a 2.0.0
// reader does not know the key, so it ignores the whole record and misreads
// nothing (tests/compat/kinds/resume-record.mjs). A damaged or foreign record
// reads as "nothing to resume", and the next write replaces it.
export const RESUME_KEY = KEY_RESUME;
export const RESUME_VERSION = 1;
export const RESUME_MAX = 6;

const words = (v, max) =>
  typeof v === 'string' && v.length > 0 && v.length <= max;

/** One entry, cleaned to the shape the record allows, or null. */
function resumeItem(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const { id, route, step, path, title, at } = raw;
  if (!words(id, 120) || !/^[\w.:/-]+$/.test(id)) return null;
  if (!words(route, 240) || !route.startsWith('/') || route.startsWith('//'))
    return null;
  const item = { id, route, at: Number.isFinite(at) ? at : 0 };
  if (words(step, 60)) item.step = step;
  if (path && (path.k === 'seq' || path.k === 'course') && words(path.id, 120))
    item.path = { k: path.k, id: path.id };
  if (title && typeof title === 'object') {
    const t = {};
    for (const l of ['en', 'es']) if (words(title[l], 160)) t[l] = title[l];
    if (t.en) item.title = t;
  }
  return item;
}

/**
 * The items, newest first.
 * @param {Storage} [store] - Defaults to localStorage
 * @returns {Array<{id: string, route: string, at: number, step?: string, path?: {k: string, id: string}, title?: {en: string, es?: string}}>}
 */
export function readResume(store) {
  const record = readJson(RESUME_KEY, null, store);
  if (record?.v !== RESUME_VERSION || !Array.isArray(record.items)) return [];
  const seen = new Set();
  return record.items
    .map(resumeItem)
    .filter(i => i && !seen.has(i.id) && seen.add(i.id))
    .slice(0, RESUME_MAX);
}

/**
 * Note that an item was opened or moved on: it becomes the newest. A step or
 * pathway the caller leaves out is kept from the earlier note of the same item,
 * so the lesson's save (which knows the step) and the Library's link (which
 * knows the pathway) can each write the half they know.
 * @returns {boolean} Whether the browser kept it
 */
export function noteResume(item, store) {
  const next = resumeItem({ at: Date.now(), ...item });
  if (!next) return false;
  const items = readResume(store);
  const before = items.find(i => i.id === next.id);
  if (before) {
    for (const k of ['step', 'path', 'title'])
      if (!(k in next) && k in before) next[k] = before[k];
  }
  return writeJson(
    RESUME_KEY,
    {
      v: 1,
      items: [next, ...items.filter(i => i.id !== next.id)].slice(
        0,
        RESUME_MAX
      ),
    },
    'preferences',
    store
  );
}
