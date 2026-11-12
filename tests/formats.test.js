// =============================================================================
// FORMATS.md says what the code does
// -----------------------------------------------------------------------------
// tools/formats.mjs is the table of every versioned format. This holds it to
// the code: each version to the constant that sets it, each schema to
// sdk/schemas, every format constant in the sources to a row, and FORMATS.md
// to the table.
// =============================================================================

import { test, expect } from '@jest/globals';
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { DOC, FORMATS, FREEZE, render } from '../tools/formats.mjs';
import * as registry from '../js/names.js';

const id = f => f.name.replace(/\s*\(.*\)$/, '');

test('each recorded version is the one the code sets', async () => {
  for (const f of FORMATS.filter(x => x.const)) {
    const [file, name] = f.const;
    const mod = await import(path.resolve(file));
    expect({ format: f.name, version: mod[name] }).toEqual({
      format: f.name,
      version: f.version,
    });
  }
});

test('each schema is there, for that format and version, and none is unlisted', () => {
  const listed = new Set();
  for (const f of FORMATS.filter(x => x.schema)) {
    const s = JSON.parse(readFileSync(`sdk/schemas/${f.schema}`, 'utf8'));
    expect(s.title).toBe(`${id(f)}/${f.version}`);
    listed.add(f.schema);
  }
  expect(readdirSync('sdk/schemas').sort()).toEqual([...listed].sort());
});

test('every format constant in the sources has a row', () => {
  const out = execFileSync(
    'git',
    [
      'grep',
      '-hoE',
      // A constant is the literal or a name from the registry (js/names.js).
      "const [A-Z_]*FORMAT\\s*=\\s*('gravitas[.-][a-z0-9.-]+'|ID_[A-Z0-9_]+)",
      '--',
      'js',
      'tools',
      'sdk',
    ],
    { encoding: 'utf8' }
  );
  const names = new Set(FORMATS.map(id));
  const found = [
    ...out.matchAll(/= ?('gravitas[.-][a-z0-9.-]+'|ID_[A-Z0-9_]+)/g),
  ].map(m => [null, m[1].startsWith("'") ? m[1].slice(1, -1) : registry[m[1]]]);
  // A search that matched nothing would pass everything.
  expect(found.length).toBeGreaterThan(20);
  for (const m of found)
    expect({ format: m[1], listed: names.has(m[1]) }).toEqual({
      format: m[1],
      listed: true,
    });
});

test('FORMATS.md is what the table writes', () => {
  expect(readFileSync(DOC, 'utf8')).toBe(render());
});

// Prompt 61's version rule, on the table: a format past its first version
// reads the one before it. A refusal in words with an export path is the
// other allowed answer, and none of these needs one today.
test('every format past version 1 reads its previous version', () => {
  for (const f of FORMATS.filter(x => x.version > 1))
    expect({ format: f.name, previous: f.older }).toEqual({
      format: f.name,
      previous: expect.stringMatching(/^(migrates|reads v1)/),
    });
});

// --- The freeze (Roadmap III Prompt 290) ------------------------------------
// The audit gave every format a schema and a version, and the table stops
// growing without a reason: a format id the sources write that the freeze does
// not hold needs a row, a schema, a version and a register row that says why
// it is a format of its own and not a field of one that is there.

const ids = FORMATS.map(id);

test('every row has a version and a schema that is a file', () => {
  for (const f of FORMATS) {
    expect({
      format: f.name,
      version: Number.isInteger(f.version) && f.version >= 1,
    }).toEqual({
      format: f.name,
      version: true,
    });
    expect({ format: f.name, schema: typeof f.schema === 'string' }).toEqual({
      format: f.name,
      schema: true,
    });
    expect({
      format: f.name,
      there: readdirSync('sdk/schemas').includes(f.schema),
    }).toEqual({
      format: f.name,
      there: true,
    });
  }
});

test('the freeze holds every format, and a format cannot leave it without a trace', () => {
  const frozen = new Set(FREEZE.formats);
  expect(FREEZE.formats.length).toBe(
    new Set(ids).size - Object.keys(FREEZE.additions).length
  );
  for (const name of FREEZE.formats)
    expect({ name, row: ids.includes(name) }).toEqual({ name, row: true });
  for (const name of new Set(ids))
    expect({
      name,
      accounted: frozen.has(name) || name in FREEZE.additions,
    }).toEqual({
      name,
      accounted: true,
    });
});

test('a format added after the freeze has a register row that says why it is new', () => {
  const register = readFileSync('DECISION_REGISTER.md', 'utf8');
  for (const [name, row] of Object.entries(FREEZE.additions)) {
    const line = register.split('\n').find(l => l.startsWith(`| ${row} |`));
    expect({ name, row, there: !!line }).toEqual({ name, row, there: true });
    expect({
      name,
      row,
      says: line.includes(name) && /rather than an extension of/.test(line),
    }).toEqual({
      name,
      row,
      says: true,
    });
  }
});

test('every format id a source writes under a format key is a row, or a recorded non-format', () => {
  const out = execFileSync(
    'git',
    [
      'grep',
      '-hoE',
      "\\bformat\\s*(:|===|!==)\\s*'gravitas[.-][a-z0-9.-]+'",
      '--',
      'js',
      'tools',
      'sdk',
    ],
    { encoding: 'utf8' }
  );
  const found = [
    ...new Set(
      [...out.matchAll(/'(gravitas[.-][a-z0-9.-]+)'/g)].map(m => m[1])
    ),
  ];
  // A search that matched nothing would pass everything.
  expect(found.length).toBeGreaterThan(20);
  const known = new Set(ids);
  for (const name of found)
    expect({
      name,
      accounted: known.has(name) || name in FREEZE.notFormats,
    }).toEqual({
      name,
      accounted: true,
    });
  for (const [name, why] of Object.entries(FREEZE.notFormats)) {
    expect({ name, row: known.has(name) }).toEqual({ name, row: false });
    expect(why.length).toBeGreaterThan(30);
  }
});
