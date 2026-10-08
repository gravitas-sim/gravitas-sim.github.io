// =============================================================================
// A reader and its JSON Schema, held to each other
// -----------------------------------------------------------------------------
// holds() runs a corpus of changes to a good document past a format's reader
// and its schema (sdk/schemas), and says, case by case, which refuses it;
// isItsRow() holds a schema to its row in FORMATS.md (tools/formats.mjs). The
// checker is ./jsonSchemaSubset.js. Not a test file (Jest runs *.test.js).
// =============================================================================

import { expect } from '@jest/globals';
import { readFileSync } from 'node:fs';

import { valid } from './jsonSchemaSubset.js';
import { FORMATS } from '../tools/formats.mjs';

const REPLACE = Symbol('replace');
const clone = v => JSON.parse(JSON.stringify(v));

/** A change, for holds(), that replaces the whole document. */
export const as = doc => ({ [REPLACE]: doc });

/**
 * Hold a reader and a schema to each other on a corpus of changes to a good
 * document, each editing a copy in place or, through as(), replacing it.
 * `both`: the reader refuses it and so does the schema.
 * `validator`: the reader refuses it for a reason no schema can state.
 * `lenient`: the reader accepts what the schema, which states the format as
 * it is written, refuses. `fine`: a variant both accept.
 *
 * @param {object} s - The schema
 * @param {*} good - A document both accept
 * @param {(doc: *) => boolean} accepts - The reader's verdict
 * @param {Array<[string, string, Function]>} cases - [which, label, change]
 */
export function holds(s, good, accepts, cases) {
  expect(accepts(clone(good))).toBe(true);
  expect(valid(s, clone(good))).toBe(true);
  const want = {
    both: { reader: false, schema: false },
    validator: { reader: false, schema: true },
    lenient: { reader: true, schema: false },
    fine: { reader: true, schema: true },
  };
  for (const [which, label, change] of cases) {
    const d = clone(good);
    const out = change(d);
    const doc =
      out !== null && typeof out === 'object' && REPLACE in out
        ? out[REPLACE]
        : d;
    expect({
      label,
      reader: accepts(clone(doc)),
      schema: valid(s, clone(doc)),
    }).toEqual({ label, ...want[which] });
  }
}

/**
 * A schema is its format's row in FORMATS.md: the file the row names, the
 * version the code writes, and the title and $id the SDK publishes.
 *
 * @param {string} file - Under sdk/schemas, without .schema.json
 * @param {string} name - The row's format
 * @param {number} version - The code's own constant
 * @param {string} [rowName] - The row's name when it says more than the
 *   format does ("gravitas.course-pack (builder form)")
 */
export function isItsRow(file, name, version, rowName = name) {
  const s = JSON.parse(readFileSync(`sdk/schemas/${file}.schema.json`, 'utf8'));
  const row = FORMATS.find(f => f.name === rowName);
  expect({
    schema: row?.schema,
    version: row?.version,
    title: s.title,
    $id: s.$id,
    $schema: s.$schema,
    file: file.endsWith(`-${version}`),
    listed: /FORMATS\.md lists it\.$/.test(s.description),
  }).toEqual({
    schema: `${file}.schema.json`,
    version,
    title: `${name}/${version}`,
    $id: `https://gravitas-sim.online/sdk/schemas/${file}.schema.json`,
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    file: true,
    listed: true,
  });
}
