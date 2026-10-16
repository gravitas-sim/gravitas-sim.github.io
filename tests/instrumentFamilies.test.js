import { describe, test, expect } from '@jest/globals';
import { mkdtempSync, mkdirSync, writeFileSync, realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import {
  familiesInScript,
  familyOfModule,
} from '../tools/instrument-families.mjs';

// =============================================================================
// Telling which instrument families a fetched script holds
// -----------------------------------------------------------------------------
// tools/route-budget.mjs --lessons and e2e/lazyInstruments.spec.js both judge
// "this lesson fetched only the families it names" from the network. Under the
// sources a family is its own file; in a build it is inside a hashed chunk, and
// only the chunk's source map says so. A reader that saw nothing would make
// every "did not fetch" assertion pass, so what it must see is tested here.
// =============================================================================

describe('a family is a js/*Widgets.js module', () => {
  test('by its path, with or without a query string', () => {
    expect(familyOfModule('js/energyWidgets.js')).toBe('energyWidgets');
    expect(familyOfModule('/js/transitWidgets.js?retry=1')).toBe(
      'transitWidgets'
    );
    expect(familyOfModule('../../js/gwEventWidgets.js')).toBe('gwEventWidgets');
  });

  test('and nothing else is one', () => {
    expect(familyOfModule('js/widgets.js')).toBeNull();
    expect(familyOfModule('js/widgetRuntime.js')).toBeNull();
    expect(familyOfModule('js/stellar/tracks.js')).toBeNull();
  });
});

describe('the families in a script the page fetched', () => {
  test('under the sources, the file is the family', () => {
    const at = url => familiesInScript(url, { config: 'sources' });
    expect(at('http://127.0.0.1:4000/js/tidalWidgets.js')).toEqual([
      'tidalWidgets',
    ]);
    expect(at('http://127.0.0.1:4000/js/investigations.js')).toEqual([]);
  });

  test('in a build, the chunk source map lists them', () => {
    const root = realpathSync(mkdtempSync(path.join(tmpdir(), 'families-')));
    mkdirSync(path.join(root, 'js'));
    writeFileSync(
      path.join(root, 'js', 'chunk-AAAA1111.js.map'),
      JSON.stringify({
        sources: [
          '../../js/stellar/tracks.js',
          '../../js/stellarWidgets.js',
          '../../js/stellarEvolutionWidgets.js',
        ],
      })
    );
    const at = file =>
      familiesInScript(`http://127.0.0.1:4000/js/${file}`, {
        config: 'build',
        root,
      });
    expect(at('chunk-AAAA1111.js')).toEqual([
      'stellarEvolutionWidgets',
      'stellarWidgets',
    ]);
    // No map, no family: the tests that use this also assert the family they
    // expect to see, so a missing map fails them rather than passing silently.
    expect(at('chunk-BBBB2222.js')).toEqual([]);
  });
});
