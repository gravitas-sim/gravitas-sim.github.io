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

const isObj = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const finite = v => typeof v === 'number' && Number.isFinite(v);
const bad = (code, message) => ({ ok: false, code, message });

/**
 * What each public format needs beyond its name and version: the parts the
 * notebooks that read it use. The observation has a validator of its own; the
 * two documents Gravitas writes for the computational notebooks (Prompt 102)
 * are checked for the shape the notebook reads, with the same refusals.
 */
const READERS = {
  'gravitas.observation': (doc, want) => {
    if (doc.kind !== want.kind)
      return bad('input-kind', `is not a ${want.kind}`);
    const issues = validateObservation(revive(doc));
    return issues.length
      ? bad('input-invalid', `${issues[0].path} ${issues[0].message}`.trim())
      : null;
  },
  // js/systemSpec.js writes it: its `version`, and an `initial` state in
  // simulation units that the notebook integrates.
  'gravitas.orbital-system': doc => {
    const init = doc.initial;
    const n = doc.bodies?.length;
    if (!isObj(init) || !finite(init.G) || init.G <= 0)
      return bad('input-invalid', 'has no initial state: save it again');
    if (
      !Array.isArray(init.bodies) ||
      init.bodies.length !== n ||
      n < 2 ||
      n > 12 ||
      !init.bodies.every(
        b =>
          isObj(b) &&
          [b.x, b.y, b.vx, b.vy].every(finite) &&
          finite(b.mass) &&
          b.mass > 0
      )
    )
      return bad(
        'input-invalid',
        'initial state is not two to twelve bodies of position, velocity and mass'
      );
    return null;
  },
  // js/experimentsPage.js writes it: the manifest, and a result per trial.
  'gravitas.experiment-result': doc => {
    if (!isObj(doc.manifest) || !Array.isArray(doc.manifest.vary))
      return bad('input-invalid', 'has no experiment manifest');
    if (
      !Array.isArray(doc.trials) ||
      doc.trials.length < 1 ||
      doc.trials.length > 2000 ||
      !doc.trials.every(
        t =>
          isObj(t) &&
          typeof t.status === 'string' &&
          isObj(t.params) &&
          isObj(t.results)
      )
    )
      return bad('input-invalid', 'trials are not a list of results');
    return null;
  },
};

/**
 * The input, checked as the notebook's public schema.
 * @param {object} entry
 * @param {string} text - The file's exact text
 * @returns {{ok: true, doc: object} | {ok: false, code: string, message: string}}
 */
export function checkInput(entry, text) {
  if (typeof text !== 'string' || text.length > LIMITS.input)
    return bad('input-too-large', 'is larger than the frame accepts');
  let doc;
  try {
    doc = JSON.parse(text);
  } catch {
    return bad('input-not-json', 'is not JSON');
  }
  const want = entry.input;
  // The orbital system names its version `version`; the others `formatVersion`.
  const version = doc?.formatVersion ?? doc?.version;
  if (!isObj(doc) || doc.format !== want.format || version !== want.version)
    return bad('input-format', `is not ${want.format}/${want.version}`);
  const problem = READERS[want.format]?.(doc, want);
  return problem ?? { ok: true, doc };
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
