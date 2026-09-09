// =============================================================================
// The deferred lesson registry, and the two ways an async bridge goes wrong
// -----------------------------------------------------------------------------
// js/main.js used to import setLessonLocale statically, which put the whole
// lesson manifest in the start-up download of a visitor who opens the sandbox.
// It is a dynamic import now, and this covers both the property that made the
// change worth making and the two failure modes the change introduced.
//
// The first test is the one that stops the leak coming back: it walks the
// static import graph from js/main.js and asserts the registry is not in it.
// A future static import - added for one convenient function, the way the last
// one was - fails here rather than showing up as twelve kilobytes on somebody's
// bundle report months later.
// =============================================================================

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  setRequestedLessonLocale,
  registerLessonLocaleSink,
  resetLessonLocaleBridge,
  requestedLessonLocale,
} from '../js/lessonLocale.js';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Every module reachable from an entry point through STATIC imports only.
 *
 * Dynamic `import()` is deliberately not followed: the whole point of the
 * distinction is that a dynamic import is a separate chunk that arrives when
 * it is asked for. This is the same question js/build.js answers from esbuild's
 * metafile, asked cheaply enough to run in the unit suite.
 *
 * @param {string} entry - Repo-relative path
 * @returns {Set<string>} Repo-relative module paths
 */
function staticGraph(entry) {
  const seen = new Set();
  const queue = [entry];
  while (queue.length) {
    const rel = queue.shift();
    if (seen.has(rel)) continue;
    seen.add(rel);
    const file = path.join(REPO, rel);
    if (!existsSync(file)) continue;
    const src = readFileSync(file, 'utf8');
    // `import ... from '...'` and bare `import '...'`, but never `import(...)`.
    const statics = [
      ...src.matchAll(
        /(?:^|\n)\s*import\s+(?:[^'"]*?\s+from\s+)?['"]([^'"]+)['"]/g
      ),
      ...src.matchAll(
        /(?:^|\n)\s*export\s+(?:[^'"]*?\s+from\s+)['"]([^'"]+)['"]/g
      ),
    ].map(m => m[1]);
    for (const spec of statics) {
      if (!spec.startsWith('.')) continue;
      const resolved = path.relative(
        REPO,
        path.resolve(path.dirname(file), spec)
      );
      queue.push(resolved);
    }
  }
  return seen;
}

describe('the lesson registry is not in the start-up download', () => {
  const graph = staticGraph('js/main.js');

  test('the walker found a real graph, so the assertions below mean something', () => {
    expect(graph.size).toBeGreaterThan(40);
    expect(graph.has('js/render.js')).toBe(true);
    expect(graph.has('js/physics.js')).toBe(true);
  });

  test('neither the registry nor either manifest is statically reachable', () => {
    for (const leaf of [
      'js/data/investigations/registry.js',
      'js/data/investigations/manifest.js',
      'js/data/investigations/manifest.es.js',
    ]) {
      expect([...graph].filter(m => m === leaf)).toEqual([]);
    }
  });

  test('nor is the lesson runner itself', () => {
    // Half the application by weight, and already deferred. Asserted here so
    // the two deferrals are guarded by one test rather than by a comment.
    expect(graph.has('js/investigations.js')).toBe(false);
  });

  test('the bridge that replaced the static import is in the graph', () => {
    // It has to be: something has to ask for the registry. It is two hundred
    // bytes and imports nothing.
    expect(graph.has('js/lessonLocale.js')).toBe(true);
  });
});

describe('the bridge', () => {
  beforeEach(() => {
    resetLessonLocaleBridge();
  });

  test('recording a locale needs no registry and no promise', () => {
    // The whole point: this runs at start-up, in js/main.js, and must cost one
    // assignment. Not a module load, not a network request, not a microtask.
    setRequestedLessonLocale('es');
    expect(requestedLessonLocale()).toBe('es');
  });

  test('a registry that loads later reads the language already chosen', () => {
    setRequestedLessonLocale('es');
    // What registry.js does at module scope.
    expect(requestedLessonLocale()).toBe('es');
  });

  test('a registry already loaded is told directly', () => {
    const setLessonLocale = jest.fn();
    registerLessonLocaleSink(setLessonLocale);
    setRequestedLessonLocale('es');
    expect(setLessonLocale).toHaveBeenCalledWith('es');
  });

  test('two changes in a row leave the second one in force', () => {
    const seen = [];
    registerLessonLocaleSink(l => seen.push(l));
    setRequestedLessonLocale('es');
    setRequestedLessonLocale('en');
    expect(requestedLessonLocale()).toBe('en');
    expect(seen[seen.length - 1]).toBe('en');
  });

  test('changes made before the registry loads are not lost', () => {
    setRequestedLessonLocale('es');
    setRequestedLessonLocale('en');
    setRequestedLessonLocale('es');
    // The registry arrives now and reads the latest, not the first.
    expect(requestedLessonLocale()).toBe('es');
  });

  test('a registry whose setter throws does not take start-up with it', () => {
    registerLessonLocaleSink(() => {
      throw new Error('registry blew up');
    });
    // A locale change is called from an event handler in js/main.js; an
    // exception escaping here would stop whatever else that handler does.
    expect(() => setRequestedLessonLocale('es')).not.toThrow();
    expect(requestedLessonLocale()).toBe('es');
  });

  test('an empty locale falls back rather than recording nothing', () => {
    setRequestedLessonLocale('');
    expect(requestedLessonLocale()).toBe('en');
    setRequestedLessonLocale(null);
    expect(requestedLessonLocale()).toBe('en');
  });

  test('a non-function sink is ignored rather than called', () => {
    registerLessonLocaleSink('not a function');
    expect(() => setRequestedLessonLocale('es')).not.toThrow();
  });
});
