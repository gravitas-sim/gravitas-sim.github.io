// =============================================================================
// gravitas.library/1: the Library's index (LIBRARY.md, FORMATS.md)
// -----------------------------------------------------------------------------
// Written by tools/build-library.mjs, read by /library/. The schema is
// sdk/schemas/library-1.schema.json; this checks only what the page relies on
// before it reads anything else.
// =============================================================================

export const FORMAT = 'gravitas.library';
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
