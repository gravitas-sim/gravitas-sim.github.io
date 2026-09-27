import { describe, test, expect } from '@jest/globals';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

import * as THREE from '../vendor/three/three.module.js';

// =============================================================================
// The vendored three.js exports what the 3-D view is built from
// -----------------------------------------------------------------------------
// vendor/three/three.module.js exports only the classes and constants
// js/view3d.js uses (tools/vendor-deps.mjs lists them and says why). A name
// the view reaches for that is not in that list is `undefined` in a reader's
// browser - `new THREE.Foo()` throws the moment the 3-D view opens, and
// `THREE.SomeColorSpace` is silently the wrong value - and the build does not
// complain about either, because a namespace import is resolved at run time.
//
// So this reads every module that imports the vendored file for the names it
// uses, through the namespace and by name, and holds each to the exports.
// =============================================================================

const VENDORED = /['"][./]*vendor\/three\/three\.module\.js['"]/;

/** The application's modules that import the vendored three.js. */
function threeModules() {
  const out = [];
  (function walk(dir) {
    for (const name of readdirSync(dir)) {
      const at = path.join(dir, name);
      if (statSync(at).isDirectory()) walk(at);
      else if (name.endsWith('.js')) {
        const text = readFileSync(at, 'utf8');
        if (VENDORED.test(text)) out.push({ at, text });
      }
    }
  })('js');
  return out;
}

/** Every name a module takes from three, whichever way it imports it. */
function namesUsed(text) {
  const names = new Set();
  const namespace = text.match(
    /import\s+\*\s+as\s+(\w+)\s+from\s+['"][./]*vendor\/three\/three\.module\.js['"]/
  );
  if (namespace) {
    const ns = namespace[1];
    for (const m of text.matchAll(
      new RegExp(`\\b${ns}\\.([A-Za-z_]\\w*)`, 'g')
    ))
      names.add(m[1]);
  }
  const named =
    /import\s*\{([^}]*)\}\s*from\s*['"][./]*vendor\/three\/three\.module\.js['"]/g;
  for (const m of text.matchAll(named)) {
    for (const part of m[1].split(',')) {
      const name = part.trim().split(/\s+as\s+/)[0];
      if (name) names.add(name);
    }
  }
  return names;
}

describe('the vendored three.js', () => {
  const modules = threeModules();

  test('is imported by the 3-D view', () => {
    expect(modules.map(m => m.at)).toContain(path.join('js', 'view3d.js'));
  });

  test.each(modules.map(m => [m.at, m.text]))(
    '%s uses only names the vendored file exports',
    (at, text) => {
      const used = [...namesUsed(text)];
      // A reader of the regular expression above deserves proof it matched.
      expect(used.length).toBeGreaterThan(5);
      const missing = used.filter(name => THREE[name] === undefined);
      expect(missing).toEqual([]);
    }
  );

  test('the orbit controls come with it', () => {
    expect(typeof THREE.OrbitControls).toBe('function');
  });
});
