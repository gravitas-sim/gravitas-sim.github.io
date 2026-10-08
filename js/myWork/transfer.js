// =============================================================================
// Moving work between devices: what goes in a file, and how a file comes back
// -----------------------------------------------------------------------------
// The file is the storage module's own (gravitas.student-data/1, js/storage/
// index.js exportAll), so a whole export, one item and an older backup all read
// the same way. This module chooses and shapes; the Store does the writing, with
// its limits and its quota check.
//
// Three keys hold many things in one record, and a plain replace would drop
// whatever the other device already had: the notebook (entries), the guides
// (one record per guide) and the experiments' index (one row per experiment).
// An import merges those by the id inside them instead of replacing them whole.
// For two things with the same id the file wins in "replace" and this device's
// wins in "skip", as it does for every other key.
// =============================================================================

export const INDEX_KEY = 'gravitas_experiments_index';
const NOTEBOOK_KEY = 'gravitas_evidence_notebook';
const GUIDES_KEY = 'gravitas_guides';
export const LAST_EXPORT_KEY = 'gravitas_last_export';
/** The collection that holds the language, theme and the like; not "work". */
export const PREFERENCES = 'preferences';

const isObj = v => v && typeof v === 'object' && !Array.isArray(v);
const records = file =>
  Object.entries(file?.collections ?? {}).flatMap(([collection, list]) =>
    (list ?? []).map(r => ({ ...r, collection }))
  );

/** Every record of an export, flat, for the page to describe. */
export const flatten = records;

/**
 * An export cut down to some keys, and nothing else.
 *
 * An experiment alone would import unlisted (the index is how the bench finds
 * it), so its row comes with it, built from the index this device holds.
 */
export function only(file, ids) {
  const want = new Set(ids);
  const all = records(file);
  if (
    [...want].some(
      k => k.startsWith('gravitas_experiment_') && !k.includes('checkpoint')
    )
  ) {
    const index = all.find(r => r.id === INDEX_KEY);
    const rows = (index?.value?.items ?? []).filter(i =>
      want.has(`gravitas_experiment_${i.id}`)
    );
    if (index) want.add(INDEX_KEY);
    if (index) index.value = { ...index.value, items: rows };
  }
  const collections = {};
  for (const r of all) {
    if (!want.has(r.id)) continue;
    const { collection, ...rest } = r;
    (collections[collection] ??= []).push(rest);
  }
  return { ...file, collections };
}

/** The file without the language, theme and similar, unless asked for. */
export function work(file, withPreferences = false) {
  if (withPreferences) return file;
  const { [PREFERENCES]: _drop, ...collections } = file.collections ?? {};
  void _drop;
  return { ...file, collections };
}

/**
 * Merge the three aggregate records with what this device holds.
 * @param {object} file - A parsed export; not changed
 * @param {Array} here - This device's records, flat ({id, value})
 * @param {'replace'|'skip'} mode
 * @returns {object} The file, with those records merged
 */
export function merged(file, here, mode) {
  const local = new Map(here.map(r => [r.id, r.value]));
  const union = (a, b, idOf) => {
    const seen = new Map();
    for (const x of mode === 'replace' ? [...a, ...b] : [...b, ...a])
      seen.set(idOf(x), x);
    return [...seen.values()];
  };
  const collections = {};
  for (const [name, list] of Object.entries(file.collections ?? {})) {
    collections[name] = (list ?? []).map(r => {
      const mine = local.get(r?.id);
      if (!isObj(r) || mine === undefined) return r;
      if (
        r.id === NOTEBOOK_KEY &&
        Array.isArray(mine?.entries) &&
        Array.isArray(r.value?.entries)
      ) {
        return {
          ...r,
          value: {
            ...r.value,
            entries: union(mine.entries, r.value.entries, e => e?.id).slice(
              0,
              60
            ),
          },
        };
      }
      if (
        r.id === INDEX_KEY &&
        Array.isArray(mine?.items) &&
        Array.isArray(r.value?.items)
      ) {
        return {
          ...r,
          value: {
            ...r.value,
            items: union(mine.items, r.value.items, i => i?.id),
          },
        };
      }
      if (r.id === GUIDES_KEY && isObj(mine) && isObj(r.value)) {
        return {
          ...r,
          value:
            mode === 'replace'
              ? { ...mine, ...r.value }
              : { ...r.value, ...mine },
        };
      }
      return r;
    });
  }
  return { ...file, collections };
}

/** A file name for a download: what it holds and the day. */
export const fileName = (what, now = new Date()) =>
  `gravitas-${
    what
      .replace(/[^a-z0-9._-]+/gi, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase() || 'work'
  }-${now.toISOString().slice(0, 10)}.json`;

/** The plain-language verdict on a plan, counted. */
export function tally(plan) {
  const n = { add: 0, replace: 0, same: 0, skip: 0, rename: 0 };
  for (const p of plan) n[p.action] = (n[p.action] ?? 0) + 1;
  return n;
}
