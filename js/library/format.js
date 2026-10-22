import { ID_LIBRARY } from '../names.js';
// =============================================================================
// gravitas.library/1: the Library's index (LIBRARY.md, FORMATS.md)
// -----------------------------------------------------------------------------
// Written by tools/build-library.mjs, read by /library/. The schema is
// sdk/schemas/library-1.schema.json; this checks only what the page relies on
// before it reads anything else.
// =============================================================================

export const FORMAT = ID_LIBRARY;
export const FORMAT_VERSION = 1;

/**
 * The index, or an error saying it is not one this page reads.
 * @param {unknown} doc - Parsed library.json
 * @returns {object} The same document
 */
export function checkLibrary(doc) {
  if (doc?.format !== FORMAT || doc.formatVersion !== FORMAT_VERSION)
    throw new Error(`not ${FORMAT}/${FORMAT_VERSION}`);
  if (!Array.isArray(doc.entries)) throw new Error('no entries');
  return doc;
}

/**
 * The address that opens an entry as a student would meet it, reading none of
 * the saved record and writing none (Prompt 175): the lesson's own progress-free
 * view for a lesson, and every other kind at its own route with `preview=student`
 * (js/storage/local.js holds the record still for any page that carries it).
 * @param {{id: string, format: string, route: string}} entry - A library entry
 * @returns {string} A same-origin address
 */
export function previewRoute(entry) {
  const cut = entry.route.indexOf('#');
  const path = cut < 0 ? entry.route : entry.route.slice(0, cut);
  const hash = cut < 0 ? undefined : entry.route.slice(cut + 1);
  const mark = 'preview=student';
  if (entry.format === 'lesson') {
    const id = entry.id.slice(entry.id.indexOf(':') + 1);
    return `/?author=${id}&view=student&${mark}`;
  }
  return `${path}${path.includes('?') ? '&' : '?'}${mark}${hash === undefined ? '' : `#${hash}`}`;
}
