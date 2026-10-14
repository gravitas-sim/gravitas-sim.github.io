// =============================================================================
// js/names.js: the names Gravitas stores and announces itself under
// -----------------------------------------------------------------------------
// Prompt 107, step 2c. A name here is what a saved game, a share link, a
// student's storage and a listening module already hold, so three things are
// pinned: every value is the string it was before the module existed (the table
// below is that string, written out, never derived from the module); no name
// is spelled twice or left unused; and the 'gravitas*' literals still written
// inline are exactly the ones tools/key-registry-allowlist.json lists, which is
// a list that only shrinks.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';

import * as names from '../js/names.js';
import { setUnitMode } from '../js/units.js';
import {
  looseLiterals,
  scanTree,
  REGISTRY,
} from '../tools/key-registry-scan.mjs';

/** Every name and the exact string it has always been. */
const PINNED = {
  KEY_UNITS: 'gravitas_units',
  EV_SIMULATION_RESET: 'gravitasSimulationReset',
  EV_UNITS_CHANGED: 'gravitasUnitsChanged',
};

const NAME_EXPORT = /^(KEY|EV|ID)_[A-Z0-9_]+$/;
const exported = () =>
  Object.keys(names)
    .filter(k => NAME_EXPORT.test(k))
    .sort();

const allowlist = JSON.parse(
  readFileSync('tools/key-registry-allowlist.json', 'utf8')
).loose;

describe('the registry', () => {
  test('every name is pinned to the string it had before', () => {
    expect(Object.fromEntries(exported().map(k => [k, names[k]]))).toEqual(
      PINNED
    );
  });

  test('values are unique and carry the gravitas prefix', () => {
    const values = exported().map(k => names[k]);
    expect(new Set(values).size).toBe(values.length);
    for (const v of values) expect(v).toMatch(/^gravitas/);
  });

  test('the prefix of a name says what it is', () => {
    for (const k of exported()) {
      if (k.startsWith('EV_')) expect(names[k]).toMatch(/^gravitas[A-Z]/);
      if (k.startsWith('KEY_')) expect(names[k]).toMatch(/^gravitas_/);
      if (k.startsWith('ID_')) expect(names[k]).toMatch(/^gravitas[.-]/);
    }
  });

  test('every name is imported somewhere outside the registry', () => {
    const sources = [];
    const walk = dir => {
      for (const e of readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) walk(p);
        else if (p.endsWith('.js') && p !== REGISTRY)
          sources.push(readFileSync(p, 'utf8'));
      }
    };
    walk('js');
    for (const k of exported())
      expect({ k, used: sources.some(s => s.includes(k)) }).toEqual({
        k,
        used: true,
      });
  });

  test('the object name pools moved with their data intact', () => {
    expect(Object.keys(names.SPACE_OBJECT_NAMES).length).toBeGreaterThan(5);
    expect(names.default).toBe(names.SPACE_OBJECT_NAMES);
    // The pools as v2 had them in js/data/objectNames.js: a hash of the whole
    // table, so a name changed, dropped or reordered fails here.
    const digest = createHash('sha256')
      .update(JSON.stringify(names.SPACE_OBJECT_NAMES))
      .digest('hex')
      .slice(0, 16);
    expect(digest).toBe('61a542a615ec994a');
  });
});

describe('what the migrated modules still do', () => {
  test('setUnitMode stores under the old key and announces the old event', () => {
    const seen = [];
    const on = e => seen.push([e.type, e.detail.mode]);
    window.addEventListener('gravitasUnitsChanged', on);
    try {
      setUnitMode('simulation');
      expect(window.localStorage.getItem('gravitas_units')).toBe('simulation');
      setUnitMode('physical');
      expect(window.localStorage.getItem('gravitas_units')).toBe('physical');
    } finally {
      window.removeEventListener('gravitasUnitsChanged', on);
    }
    expect(seen).toEqual([
      ['gravitasUnitsChanged', 'simulation'],
      ['gravitasUnitsChanged', 'physical'],
    ]);
  });
});

describe('the loose-literal ratchet', () => {
  test('the inline literals are exactly the allowlist', () => {
    const found = scanTree();
    // A new loose literal, or a count that went up.
    const grew = [];
    // An entry that no longer matches: moved into the registry or removed.
    const stale = [];
    for (const [file, counts] of Object.entries(found))
      for (const [v, n] of Object.entries(counts))
        if (n > (allowlist[file]?.[v] ?? 0))
          grew.push(
            `${file}: ${v} x${n}, allowed ${allowlist[file]?.[v] ?? 0}`
          );
    for (const [file, counts] of Object.entries(allowlist))
      for (const [v, n] of Object.entries(counts))
        if ((found[file]?.[v] ?? 0) < n)
          stale.push(
            `${file}: ${v} listed x${n}, found ${found[file]?.[v] ?? 0}`
          );
    expect({ grew, stale }).toEqual({ grew: [], stale: [] });
  });

  test('the scan reads code, not comments, paths or property names', () => {
    const src = `
      // 'gravitasInComment'
      import x from './gravitasPath.js';
      const o = { 'gravitasKey': 1, [ 'gravitasComputed' ]: 2 };
      const a = 'gravitasValue';
      const b = \`gravitasTemplate\`;
      const c = \`gravitas\${a}\`;
      const d = 'gravitas: a sentence';
      const e = 'gravitas-report.csv';
      f('gravitas_two', "gravitas.three");
    `;
    expect(
      looseLiterals(src)
        .map(s => s.value)
        .sort()
    ).toEqual(
      [
        'gravitasComputed',
        'gravitasTemplate',
        'gravitasValue',
        'gravitas_two',
        'gravitas.three',
      ].sort()
    );
  });
});
