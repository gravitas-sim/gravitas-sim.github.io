// =============================================================================
// Checking what a notebook gave back, as a file a reader chose would be
// -----------------------------------------------------------------------------
// The frame is untrusted and so is what it returns, so the page checks every
// byte of an answer here before anything draws it. This is the security
// boundary for results (NOTEBOOK_BRIDGE_GATE.md: an answer with no table once
// crashed the host's check; it is refused by name now).
//
// A notebook returns one text: a JSON object whose values are themselves JSON
// texts, written by the frame's wrapper with sorted keys and no spaces, so a
// researcher's Python writes the same bytes (the capsule hashes that text).
//
//   envelope   a gravitas.artifact/1: the numbers, with units and uncertainties
//   table      a gravitas.observation/1: the rows, if the notebook returns any
//   figure     {type: 'image/png', base64}, if the notebook draws one
//
// Only those three keys, and exactly the ones the catalogue declares for the
// notebook. The envelope's quantities are exactly the declared ones, in the
// declared units. Nothing returned is ever parsed as markup, evaluated or
// used as a URL: the table is drawn as text, the figure as a data: image.
//
// Pure, no DOM.
// =============================================================================

import { validateArtifact } from '../platform/artifact.js';
import { validateObservation } from '../observatory/schema.js';
import { LIMITS } from './messages.js';

export const OUTPUT_KEYS = Object.freeze(['envelope', 'table', 'figure']);

/** A number column's values back from JSON, where a missing value is null. */
export const revive = o => ({
  ...o,
  columns: (o.columns ?? []).map(c => ({
    ...c,
    values: Array.isArray(c.values)
      ? c.role === 'label'
        ? c.values
        : c.values.map(v => (v === null ? NaN : v))
      : c.values,
  })),
});

const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const BASE64 = /^[A-Za-z0-9+/]+={0,2}$/;

/** Whether this base64 text begins with a PNG's signature. */
export function isPng(base64) {
  if (typeof base64 !== 'string' || !BASE64.test(base64)) return false;
  let head;
  try {
    head = atob(base64.slice(0, 16));
  } catch {
    return false;
  }
  return PNG.every((b, i) => head.charCodeAt(i) === b);
}

const isObj = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const fail = (code, message) => ({ ok: false, code, message });

/**
 * What a notebook's answer is, or why it is refused.
 *
 * @param {string} text - `output` of the frame's result message
 * @param {object} declared - The catalogue entry's `outputs`:
 *   {envelope: {quantities: [{id, unit}]}, table: boolean, figure: boolean}
 * @returns {{ok: true, texts: object, parts: {envelope: object, table?: object,
 *   figure?: {type: string, base64: string}}} | {ok: false, code: string,
 *   message: string}} code is one of output-too-large, output-shape,
 *   output-keys, output-envelope, output-quantities, output-table, output-figure
 */
export function checkOutput(text, declared) {
  if (typeof text !== 'string' || text.length > LIMITS.output)
    return fail(
      'output-too-large',
      'the answer is larger than an answer may be'
    );
  let outer;
  try {
    outer = JSON.parse(text);
  } catch {
    return fail('output-shape', 'the answer is not JSON');
  }
  if (!isObj(outer)) return fail('output-shape', 'the answer is not an object');
  const keys = Object.keys(outer).sort();
  const want = OUTPUT_KEYS.filter(k =>
    k === 'envelope' ? true : Boolean(declared[k])
  );
  for (const k of keys)
    if (!OUTPUT_KEYS.includes(k))
      return fail('output-keys', `"${k}" is not part of an answer`);
  for (const k of want)
    if (!keys.includes(k))
      return fail(
        'output-keys',
        `the answer has no "${k}", which the notebook declares`
      );
  for (const k of keys)
    if (!want.includes(k))
      return fail(
        'output-keys',
        `the answer has a "${k}", which the notebook does not declare`
      );
  for (const k of keys)
    if (typeof outer[k] !== 'string')
      return fail('output-shape', `"${k}" is not text`);

  const parts = {};
  let envelope;
  try {
    envelope = JSON.parse(outer.envelope);
  } catch {
    return fail('output-envelope', 'the envelope is not JSON');
  }
  const problems = validateArtifact(envelope);
  if (problems.length)
    return fail(
      'output-envelope',
      `the envelope is not a gravitas.artifact/1: ${problems[0].path} ${problems[0].message}`
    );
  const ids = envelope.quantities.map(q => q.id).sort();
  const expected = declared.envelope.quantities.map(q => q.id).sort();
  if (JSON.stringify(ids) !== JSON.stringify(expected))
    return fail(
      'output-quantities',
      `the envelope's quantities are not the declared ones (${expected.join(', ')})`
    );
  for (const d of declared.envelope.quantities) {
    const q = envelope.quantities.find(x => x.id === d.id);
    if (q.unit !== d.unit)
      return fail(
        'output-quantities',
        `"${d.id}" is in "${q.unit}", not the declared "${d.unit}"`
      );
  }
  parts.envelope = envelope;

  if (declared.table) {
    let table;
    try {
      table = JSON.parse(outer.table);
    } catch {
      return fail('output-table', 'the table is not JSON');
    }
    if (!isObj(table) || !Array.isArray(table.columns))
      return fail('output-table', 'the table is not an observation');
    const issues = validateObservation(revive(table));
    if (issues.length)
      return fail(
        'output-table',
        `the table is not a gravitas.observation/1: ${issues[0].path} ${issues[0].message}`
      );
    parts.table = table;
  }

  if (declared.figure) {
    if (outer.figure.length > LIMITS.figure)
      return fail('output-figure', 'the figure is larger than a figure may be');
    let fig;
    try {
      fig = JSON.parse(outer.figure);
    } catch {
      return fail('output-figure', 'the figure is not JSON');
    }
    if (
      !isObj(fig) ||
      Object.keys(fig).sort().join() !== 'base64,type' ||
      fig.type !== 'image/png'
    )
      return fail(
        'output-figure',
        'the figure is not {type, base64} of image/png'
      );
    if (!isPng(fig.base64))
      return fail('output-figure', 'the figure is not a PNG');
    parts.figure = fig;
  }
  return { ok: true, texts: outer, parts };
}
