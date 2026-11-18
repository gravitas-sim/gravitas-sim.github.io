// =============================================================================
// Does an instrument open at the answer? (the neutral-start detector)
// -----------------------------------------------------------------------------
// A step's `validate` takes the answer fields and never the controls, so it
// cannot be run on the opening controls. This runs the instrument's own
// readout at the opening state (`tool.start`, else `tool.values`; no saved
// values), writes each readout into the field it would fill, and grades that
// object with the step's own `validate`. A step that passes "opens at the
// answer"; one the check rejects is neutral; one whose fields cannot all be
// filled from a readout is unmapped, and is never counted as fine.
//
// Which readout fills which field is read from the field's own
// `source: { tool: rowId }` where the lesson declares one, and otherwise from
// the reviewed table tools/neutral-start-map.json (step key -> field -> where).
// A readout row is named by `id` where the instrument gives it one, else by the
// label the student reads in English. A slider's own number, which the student
// reads off the control and types (a field and a control that share a name), is
// `{ "control": id }`. `null` says the field is not read from the instrument.
//
// Node-only, like tools/authoring/standardRules.mjs.
// =============================================================================

import { readFileSync } from 'node:fs';
import { URL } from 'node:url';

import { emptyProbeContext } from '../../js/authoring/rules.js';
import { numberText } from '../../js/investigations/figures.js';
import { openingValues } from '../../js/widgets.js';

export const MAP_FILE = new URL('../neutral-start-map.json', import.meta.url);

/** The reviewed field-to-readout table, `{ "<lesson>/<sid>": { field: row | {row, scale} | null } }`. */
export function loadMap(file = MAP_FILE) {
  return JSON.parse(readFileSync(file, 'utf8')).steps ?? {};
}

/** A step the rule judges: it asks a student to find or set a value on an instrument that a check then grades. */
export const isFindOrSet = step =>
  step?.type === 'measure' &&
  !!step.tool &&
  typeof step.validate === 'function' &&
  Array.isArray(step.fields) &&
  step.fields.length > 0;

/** The label a student reads, for matching: lower case, single spaces. */
const plainLabel = s =>
  String(s ?? '')
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

/** The one readout row a reference names, or null (none, or more than one). */
function rowFor(rows, ref) {
  const named = typeof ref === 'string' ? ref : ref?.row;
  if (typeof named !== 'string') return null;
  const byId = rows.filter(r => r.id === named);
  if (byId.length === 1) return byId[0];
  const want = plainLabel(named);
  const hits = rows.filter(r => plainLabel(r.label) === want);
  return hits.length === 1 ? hits[0] : null;
}

/**
 * The readouts the instrument shows at the state it opens in.
 *
 * @param {object} step - A step with a tool
 * @param {object} widget - The instrument's definition
 * @returns {Array<object>} Rows, as the readout under the canvas prints them
 */
export function openingReadouts(step, widget) {
  const values = openingValues(widget, step.tool);
  const live = widget.live ? emptyProbeContext() : undefined;
  return widget.readout(values, live, step.tool) || [];
}

/**
 * Judge one step.
 *
 * @param {object} step - A step
 * @param {object} widget - Its instrument's definition, or undefined
 * @param {object} [mapping] - This step's entry of the reviewed table
 * @returns {{verdict: string, fields?: object, reason?: string}} verdict is one
 *   of `opens-at-answer`, `neutral`, `prepared`, `unmapped`
 */
export function judgeOpening(step, widget, mapping = {}) {
  if (step.prepared === true) return { verdict: 'prepared' };
  if (!widget) return { verdict: 'unmapped', reason: 'no such instrument' };
  let rows;
  try {
    rows = openingReadouts(step, widget);
  } catch (e) {
    return { verdict: 'unmapped', reason: `the readout throws: ${e.message}` };
  }
  const controls = openingValues(widget, step.tool);
  const fields = {};
  const missing = [];
  for (const f of step.fields) {
    if (typeof f.compute === 'function') continue;
    const ref = f.source?.tool ?? mapping[f.id];
    let n = NaN;
    if (ref?.control !== undefined) n = Number(controls[ref.control]);
    else if (ref) {
      const text = numberText(rowFor(rows, ref));
      n =
        text === null ? NaN : Number(text.replace('−', '-').replace(',', '.'));
    }
    if (!Number.isFinite(n)) {
      missing.push(f.id);
      continue;
    }
    fields[f.id] = n * (Number(mapping[f.id]?.scale) || 1);
  }
  if (missing.length)
    return {
      verdict: 'unmapped',
      reason: `no readout is mapped to ${missing.join(', ')}`,
    };
  for (const f of step.fields) {
    if (typeof f.compute !== 'function') continue;
    try {
      fields[f.id] = Number(f.compute(fields));
    } catch {
      return { verdict: 'unmapped', reason: `${f.id} cannot be computed` };
    }
  }
  let result;
  try {
    result = step.validate(fields, emptyProbeContext());
  } catch (e) {
    return { verdict: 'unmapped', reason: `validate throws: ${e.message}` };
  }
  if (!result)
    return { verdict: 'unmapped', reason: 'validate returns nothing', fields };
  return {
    verdict: result.level === 'ok' ? 'opens-at-answer' : 'neutral',
    fields,
  };
}
