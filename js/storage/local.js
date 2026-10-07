// One localStorage key as JSON (STORAGE.md, Prompt 65): the try/catch every
// writer repeated, for no storage, a damaged value and a full quota. Neither
// function throws; `store` defaults to the page's own.
const area = s => s ?? (globalThis.window ?? globalThis).localStorage;

/** The value under `key`, or `fallback` if there is none or it is damaged. */
export const readJson = (key, fallback = null, store) => {
  try {
    return JSON.parse(area(store).getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
};

/** Keep `value` under `key`; whether the browser kept it. */
export const writeJson = (key, value, store) => {
  try {
    area(store).setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
};
