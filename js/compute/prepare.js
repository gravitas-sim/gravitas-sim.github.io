// =============================================================================
// Before anything is sent: the notebook and the input, checked
// -----------------------------------------------------------------------------
// The page refuses a notebook whose cells do not hash to the catalogue's
// (there is no way to run any other), and an input that is not the public
// document the notebook reads. Both happen here, in the page, before the
// frame is asked for anything, so a refusal costs no download.
// Pure but for the fetch it is handed; no DOM.
// =============================================================================

import { validateObservation } from '../observatory/schema.js';
import { revive } from './check.js';
import { cellsHash, cellsOf } from './capsule.js';
import { badParams } from './catalogue.js';
import { LIMITS } from './messages.js';

/** A refusal that carries the state the page shows for it. */
export class ComputeError extends Error {
  /**
   * @param {string} code - One of the page's failure states (COMPUTE.md)
   * @param {string} message - In English, for logs and tests; the page has its own words
   * @param {object} [detail]
   */
  constructor(code, message, detail = {}) {
    super(message);
    this.name = 'ComputeError';
    this.code = code;
    this.detail = detail;
  }
}

/**
 * The reviewed notebook's cells, or a refusal.
 * @param {object} entry - A catalogue entry
 * @param {(path: string) => Promise<string>} fetchText - Reads a file of this site
 * @returns {Promise<{cells: string[], hash: string}>}
 */
export async function loadNotebook(entry, fetchText) {
  let nb;
  try {
    nb = JSON.parse(await fetchText(`/${entry.notebook}`));
  } catch {
    throw new ComputeError(
      'notebook-refused',
      'the notebook could not be read'
    );
  }
  const cells = cellsOf(nb);
  const hash = await cellsHash(cells);
  if (hash !== entry.cellsSha256)
    throw new ComputeError(
      'notebook-refused',
      'the notebook is not the reviewed one: its hash is not in the catalogue',
      { hash }
    );
  if (cells.length > LIMITS.cells || cells.some(c => c.length > LIMITS.cell))
    throw new ComputeError(
      'notebook-refused',
      'the notebook is longer than a notebook may be'
    );
  return { cells, hash };
}

/**
 * The input, checked as the notebook's public schema.
 * @param {object} entry
 * @param {string} text - The file's exact text
 * @returns {{ok: true, doc: object} | {ok: false, code: string, message: string}}
 */
export function checkInput(entry, text) {
  if (typeof text !== 'string' || text.length > LIMITS.input)
    return {
      ok: false,
      code: 'input-too-large',
      message: 'is larger than the frame accepts',
    };
  let doc;
  try {
    doc = JSON.parse(text);
  } catch {
    return { ok: false, code: 'input-not-json', message: 'is not JSON' };
  }
  const want = entry.input;
  if (doc?.format !== want.format || doc?.formatVersion !== want.version)
    return {
      ok: false,
      code: 'input-format',
      message: `is not ${want.format}/${want.version}`,
    };
  if (doc.kind !== want.kind)
    return { ok: false, code: 'input-kind', message: `is not a ${want.kind}` };
  const issues = validateObservation(revive(doc));
  if (issues.length)
    return {
      ok: false,
      code: 'input-invalid',
      message: `${issues[0].path} ${issues[0].message}`.trim(),
    };
  return { ok: true, doc };
}

/** Parameter ids that are out of bounds, as a refusal or null. */
export function checkParams(entry, values) {
  const bad = badParams(entry, values);
  return bad.length
    ? new ComputeError('params-refused', `out of bounds: ${bad.join(', ')}`, {
        bad,
      })
    : null;
}
