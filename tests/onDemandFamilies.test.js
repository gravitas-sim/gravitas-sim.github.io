import { describe, test, expect } from '@jest/globals';
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// =============================================================================
// No instrument family is part of start-up or of the lesson engine
// -----------------------------------------------------------------------------
// Every family is fetched when a lesson step first names one of its
// instruments (js/widgets.js, LAZY_CAPABILITIES.md). Two things undo that
// without any lesson looking different, and both are held here, from the
// source rather than a browser:
//
//   a static import      one `import ... from './xWidgets.js'` anywhere on the
//                        way from js/main.js or js/investigations.js, and every
//                        lesson downloads that family again before its first
//                        step - the browser tests see it too, but only for the
//                        lessons they open
//   a split start-up     a family that reaches some of a start-up chunk's
//   chunk                modules and not the others makes the bundler split
//                        that chunk, and every page downloads one more file
//                        (js/instrumentStartup.js says why, and what to do)
// =============================================================================

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const js = rel => path.posix.join('js', rel);

/** Every module under js/, as repository-relative paths. */
function modules() {
  const out = [];
  (function walk(dir) {
    for (const name of readdirSync(path.join(REPO, dir))) {
      const rel = path.posix.join(dir, name);
      if (statSync(path.join(REPO, rel)).isDirectory()) walk(rel);
      else if (name.endsWith('.js')) out.push(rel);
    }
  })('js');
  return out;
}

/**
 * Static imports only - `import ... from`, `export ... from` and a bare
 * `import '...'`, each anchored at the start of a statement. A dynamic
 * `import('...')` is how a family is meant to be reached, so it is not an
 * edge here.
 */
function staticGraph() {
  const graph = new Map();
  const edge =
    /(?:^|[;\n])\s*(?:import\s+[^'"();]*?\s+from|export\s+[^'"();]*?\s+from|import)\s*'(\.{1,2}\/[^']+)'/g;
  for (const file of modules()) {
    const text = readFileSync(path.join(REPO, file), 'utf8').replace(
      /\/\*[\s\S]*?\*\/|^\s*\/\/.*$/gm,
      ''
    );
    const deps = new Set();
    for (const m of text.matchAll(edge)) {
      deps.add(
        path.posix.normalize(path.posix.join(path.posix.dirname(file), m[1]))
      );
    }
    graph.set(file, deps);
  }
  return graph;
}

const graph = staticGraph();
const closure = start => {
  const seen = new Set();
  const queue = [start];
  while (queue.length) {
    const cur = queue.pop();
    if (seen.has(cur)) continue;
    seen.add(cur);
    queue.push(...(graph.get(cur) || []));
  }
  return seen;
};
const FAMILIES = modules().filter(f => /^js\/[A-Za-z]+Widgets\.js$/.test(f));

describe('what reaches an instrument family', () => {
  test('there are families to look for', () => {
    expect(FAMILIES.length).toBeGreaterThanOrEqual(17);
  });

  test('neither start-up nor the lesson engine imports one', () => {
    for (const from of ['js/main.js', 'js/investigations.js']) {
      const reached = [...closure(from)].filter(f => FAMILIES.includes(f));
      expect({ from, reached }).toEqual({ from, reached: [] });
    }
  });

  test('the registry names every family only in an import() it can defer', () => {
    expect(
      [...graph.get(js('widgets.js'))].filter(f => FAMILIES.includes(f))
    ).toEqual([]);
  });
});

describe('the start-up modules the families share', () => {
  const SHARED = [...graph.get(js('instrumentStartup.js'))];

  test('are all start-up modules', () => {
    const startup = closure('js/main.js');
    expect(SHARED.length).toBeGreaterThan(0);
    expect(SHARED.filter(f => !startup.has(f))).toEqual([]);
  });

  test('are imported as one by every family that reaches any of them', () => {
    const missing = FAMILIES.filter(f => {
      const reached = closure(f);
      return (
        SHARED.some(s => reached.has(s)) &&
        !graph.get(f).has(js('instrumentStartup.js'))
      );
    });
    expect(missing).toEqual([]);
  });

  test('so a lazy family costs start-up no file the eager registry did not', () => {
    // In a child process: esbuild checks that its encoder's output is a
    // Uint8Array, and under jest's module realm it is one from another realm.
    const counts = JSON.parse(
      execFileSync(
        process.execPath,
        [
          '--input-type=module',
          '-e',
          "const m = await import('./tools/instrument-families.mjs');" +
            'console.log(JSON.stringify(await m.startupFileCounts()));',
        ],
        { cwd: REPO, encoding: 'utf8' }
      )
    );
    expect(counts.eager).toBeGreaterThan(0);
    expect(counts.lazy).toBeLessThanOrEqual(counts.eager);
  }, 120_000);
});
