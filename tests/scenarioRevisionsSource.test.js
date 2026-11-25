import { describe, expect, test } from '@jest/globals';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { SCENARIO_REVISIONS } from '../js/shareState.js';
import { SCENARIO_IDS } from '../js/scenarios.js';

// =============================================================================
// The producer table is closed (SCENARIO_REVISIONS.md)
// -----------------------------------------------------------------------------
// Every call, under js/ and tools/, of a function that encodes a world link or
// captures a loaded world is a row of tests/fixtures/scenarioLinkProducers.json,
// with the number of calls the file holds. A new call fails here until someone
// has said what it encodes and which version it writes, which is what stops a
// producer writing an unrevisioned link for a corrected id.
// =============================================================================

const ROOT = path.resolve(import.meta.dirname, '..');
const TABLE = JSON.parse(
  readFileSync(
    path.join(ROOT, 'tests/fixtures/scenarioLinkProducers.json'),
    'utf8'
  )
);

/** Calls only: not a definition (`function name(`), not inside a comment. */
const call = name => new RegExp(`(?<!function )(?<![\\w$])${name}\\(`, 'g');
const PATTERNS = {
  encodePayload: call('encodePayload'),
  encodeTaggedWorld: /encodeTagged\(\s*['"]{2}/g,
  buildPayload: call('buildPayload'),
  captureShareState: call('captureShareState'),
  payloadFromSetup: call('payloadFromSetup'),
  compileScenarioPack: call('compileScenarioPack'),
  rawWorldLink: call('rawWorldLink'),
  // The one place a build tool writes a world link without the codec.
  rawWorldWriter: /Buffer\.from\(JSON\.stringify\(/g,
};

const strip = text =>
  text
    .replace(/\/\*[\s\S]*?\*\//g, m => m.replace(/[^\n]/g, ''))
    .split('\n')
    .map(l => (/^\s*(\/\/|\*)/.test(l) ? '' : l))
    .join('\n');

const files = execFileSync('git', ['ls-files', 'js', 'tools'], {
  cwd: ROOT,
  encoding: 'utf8',
})
  .split('\n')
  .filter(f => /\.m?js$/.test(f));

const found = {};
for (const file of files) {
  const text = strip(readFileSync(path.join(ROOT, file), 'utf8'));
  for (const [name, re] of Object.entries(PATTERNS)) {
    const n = [...text.matchAll(re)].length;
    if (n) (found[file] ??= {})[name] = n;
  }
}

describe('the producer table', () => {
  test('names the patterns this test counts', () => {
    expect([...TABLE.patterns].sort()).toEqual(Object.keys(PATTERNS).sort());
  });

  test('every call in the sources is a row, with the calls it holds', () => {
    const rows = Object.fromEntries(TABLE.rows.map(r => [r.file, r.calls]));
    const seen = {};
    for (const [file, calls] of Object.entries(found)) seen[file] = calls;
    // A row with no calls is documentation of a producer whose writer is a
    // call into another row's file.
    const expected = Object.fromEntries(
      Object.entries(rows).filter(([, c]) => Object.keys(c).length)
    );
    expect(seen).toEqual(expected);
  });

  test('every row says what it encodes and its version rule, and names a real file', () => {
    const names = new Set(files);
    for (const r of TABLE.rows) {
      expect({ file: r.file, there: names.has(r.file) }).toEqual({
        file: r.file,
        there: true,
      });
      expect(typeof r.origin).toBe('string');
      expect(typeof r.rule).toBe('string');
      expect(r.site.length).toBeGreaterThan(3);
    }
    expect(new Set(TABLE.rows.map(r => r.file)).size).toBe(TABLE.rows.length);
  });

  test('the contract names every producing file', () => {
    const doc = readFileSync(path.join(ROOT, 'SCENARIO_REVISIONS.md'), 'utf8');
    for (const r of TABLE.rows)
      expect({ file: r.file, named: doc.includes(r.file) }).toEqual({
        file: r.file,
        named: true,
      });
  });
});

describe('what ships', () => {
  test('the registry ships empty, so no shipped scenario has a second revision', () => {
    expect(Object.keys(SCENARIO_REVISIONS)).toEqual([]);
    expect(SCENARIO_IDS.length).toBe(61);
  });

  test('a built-in lesson never states a revision in its setup (that is how an imported file says it)', () => {
    let out = '';
    try {
      // git grep exits 1 when it finds nothing, which is the pass.
      out = execFileSync(
        'git',
        ['grep', '-lE', 'setup: \\{[^}]*\\brevision\\b', '--', 'js/data'],
        { cwd: ROOT, encoding: 'utf8' }
      ).trim();
    } catch (e) {
      if (e.status !== 1) throw e;
    }
    expect(out).toBe('');
  });
});
