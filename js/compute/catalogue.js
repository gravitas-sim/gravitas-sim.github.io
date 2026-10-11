// =============================================================================
// The reviewed notebooks the compute page may run
// -----------------------------------------------------------------------------
// A notebook is in this list or the page will not run it: each entry carries
// the SHA-256 of the notebook's cells (what runs) and of its file, written by
// tools/compute.mjs from the vendored files in compute/notebooks/, and
// tests/computeCatalogue.test.js holds the hashes to those files. The page
// hashes the cells it fetched and refuses a notebook whose hash differs; there
// is no upload of a notebook. Adding one is a reviewed commit that adds the
// file, runs `node tools/compute.mjs`, and states what it reads and returns.
//
//   input      the one public-schema document the notebook reads, and the
//              example Gravitas vendors for it (compute/inputs/, with its hash)
//   params     the few named numbers the reader may set, with bounds
//   outputs    what it returns, exactly: an envelope with these quantities in
//              these units, a table, a figure. js/compute/check.js refuses an
//              answer that adds or drops any
//   expected   the values the pinned runtime is checked against: the online
//              end-to-end check (e2e/computeOnline.spec.js) holds a run to them
//   citations  the method and the packages; the input's own are added at run
//
// What each entry holds is written in ./catalogueData.js; the hashes are in
// ./catalogueHashes.js. Pure data and small helpers, no DOM. The Spanish is the page's words about
// the notebook; the notebook's own comments and prose are English.
// =============================================================================

import { CATALOGUE_DATA } from './catalogueData.js';
import { HASHES } from './catalogueHashes.js';

/** The reviewed notebooks, each with its hashes. */
export const NOTEBOOKS = Object.freeze(
  CATALOGUE_DATA.map(e => Object.freeze({ ...e, ...HASHES[e.id] }))
);

/** The entry for an id, or undefined. */
export const entryOf = id => NOTEBOOKS.find(e => e.id === id);

/** The default value of every parameter, by id. */
export const defaultParams = entry =>
  Object.fromEntries(entry.params.map(p => [p.id, p.default]));

/**
 * What is wrong with these parameter values: one problem per bad one.
 * @param {object} entry
 * @param {object} values - id to number
 * @returns {string[]} Parameter ids that are missing or out of bounds
 */
export const badParams = (entry, values) =>
  entry.params
    .filter(p => {
      const v = values?.[p.id];
      return !(
        typeof v === 'number' &&
        Number.isFinite(v) &&
        v >= p.min &&
        v <= p.max
      );
    })
    .map(p => p.id);

/** The parameters as the text the frame is sent, in the entry's order. */
export const paramsText = (entry, values) =>
  JSON.stringify(
    Object.fromEntries(entry.params.map(p => [p.id, values[p.id]]))
  );
