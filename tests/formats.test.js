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

import { DOC, FORMATS, render } from '../tools/formats.mjs';

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
      "const [A-Z_]*FORMAT\\s*=\\s*'gravitas[.-][a-z0-9.-]+'",
      '--',
      'js',
      'tools',
      'sdk',
    ],
    { encoding: 'utf8' }
  );
  const names = new Set(FORMATS.map(id));
  const found = [...out.matchAll(/'(gravitas[.-][a-z0-9.-]+)'/g)];
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
