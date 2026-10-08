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
