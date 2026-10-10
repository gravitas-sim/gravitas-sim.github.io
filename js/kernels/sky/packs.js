// =============================================================================
// Sky kernel: loading the data
// -----------------------------------------------------------------------------
// The only module that names the star file and the constellation figures, so
// that a page which uses the kernel's arithmetic does not download a catalogue
// it never asks for, and so that tests/dataPacks.test.js can hold the rule
// "nothing names a lazy pack but its loader".
//
// The stars are a sidecar of the data pack sky-bright-stars (DATA_PACKS.md): a
// JSON file fetched at run time, not a JavaScript module, so a route budget
// that counts JavaScript does not count a star table, as for library.json.
// =============================================================================

/** Where the star rows are, from the site root (tools/build-data-packs.mjs). */
export const STARS_URL = '/sky/bright-stars.json';

/**
 * The star file's text, parsed. A caller passes its own fetch so a test or a
 * Worker can supply the file; the default is the page's.
 * @param {typeof fetch} [fetchImpl]
 * @returns {Promise<object>} The sidecar: {pack, columns, stars, ...}
 */
export async function loadStarFile(fetchImpl = globalThis.fetch) {
  const res = await fetchImpl(STARS_URL);
  if (!res.ok) throw new Error(`${STARS_URL}: HTTP ${res.status}`);
  return res.json();
}

/** The constellation figures (a lazy module of its own). */
export const loadConstellations = () =>
  import('../../data/sky/constellations.js');
