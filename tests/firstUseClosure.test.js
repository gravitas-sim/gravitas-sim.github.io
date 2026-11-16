// =============================================================================
// What the first screen loads, read from the import graph
// -----------------------------------------------------------------------------
// index.html loads eight module scripts, and everything they import statically
// is downloaded before the sandbox or a lesson can start. Some code is needed
// only when a reader does something: selects a body, opens Settings. Each such
// group is held out of that closure and stays out, with the one module that
// fetches it (its door) in the closure instead:
//
//   the inspector card   js/inspectorWindow.js, js/inspectorView.js,
//                        js/inspectorPanel.js, js/inspectorInfo.js; fetched on
//                        the first selection by js/inspectorGate.js;
//   the Settings panel   js/settingsPanel.js; fetched with the dialog
//                        machinery by the first press of Settings (js/ui.js).
//
// Static edges only: a dynamic import() is exactly how they arrive later.
// e2e/lazyInstruments.spec.js holds the same from the page.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { importClosure } from '../tools/source-closure.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const entries = [
  ...readFileSync(path.join(ROOT, 'index.html'), 'utf8').matchAll(
    /<script type="module" src="(js\/[^"]+)"/g
  ),
].map(m => m[1]);
const { files, dynamic } = importClosure({ root: ROOT, entries });

const GROUPS = {
  'the inspector card': [
    'js/inspectorWindow.js',
    'js/inspectorView.js',
    'js/inspectorPanel.js',
    'js/inspectorInfo.js',
  ],
  'the Settings panel': ['js/settingsPanel.js'],
};

describe('the first screen statically imports', () => {
  test('the eight start-up scripts, read from index.html', () => {
    expect(entries.length).toBe(8);
    expect(entries).toContain('js/main.js');
  });

  for (const [name, modules] of Object.entries(GROUPS))
    test(`nothing of ${name}`, () => {
      expect(files.filter(f => modules.includes(f))).toEqual([]);
    });

  test('the doors that fetch them', () => {
    expect(files).toContain('js/inspectorGate.js');
    expect(dynamic).toContain('js/inspectorGate.js -> ./inspectorWindow.js');
    expect(dynamic).toContain('js/ui.js -> ./settingsPanel.js');
  });

  test('and the object glyphs the picker draws, apart from the card', () => {
    expect(files).toContain('js/objectGlyphs.js');
  });
});
