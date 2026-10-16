// =============================================================================
// Which files a program actually reads
// -----------------------------------------------------------------------------
// Written for one question: when `tools/build-instructor-materials.js` renders
// the instructor materials, which files in this repository decided what those
// documents say? The answer has to be complete, because it becomes the
// freshness digest and a file left out of it is a file whose change the release
// gate will not notice.
//
// It used to be a hand-written list. The list named eight files and a
// directory; the build evaluates forty-six. Fifteen of them were outside the
// digest, `js/data/instructorContent.js` - which is the prose of every
// instructor guide - among them. Editing it changed every guide in the bundle
// and left the recorded digest identical, so `instructors:check` stayed green
// over a stale bundle. A list a person maintains beside an import graph a
// program maintains will drift, and this one did.
//
// So the list is derived. This module walks the static import graph from a
// declared entry point and returns every file under the repository that the
// graph reaches.
//
// Static only, and that is the whole argument
// -----------------------------------------------------------------------------
// An ES module's static imports are evaluated when it loads; a dynamic
// `import()` is evaluated only if something calls it. The document generators
// are synchronous - they return bytes, not promises - so nothing they do can
// await a module that was not already there. Following dynamic edges would turn
// forty-six files into two hundred and fifty, because `js/activities/
// activityBridge.js` lazily reaches `js/investigations.js` and from there the
// renderer, the 3-D view and three megabytes of Three.js: none of which is
// loaded, none of which can change a PDF, and all of which would mark the
// bundle stale on any change to how a star is drawn.
//
// That argument is checked rather than trusted. tests/instructorDigest.test.js
// runs the real build under a module-load hook and fails if Node loaded
// anything this walker did not return - which is what would happen the day a
// generator grows an awaited `import()`, and is the only way the static
// assumption can break.
//
// Why not tools/check-architecture.mjs's buildGraph()
// -----------------------------------------------------------------------------
// It answers a different question and answers it deliberately loosely: it walks
// `js/` only (it cannot see a tool), it merges static and dynamic edges on
// purpose (for cycle detection a lazy edge is still an edge), and its own
// comment records a known gap in how it matches a mid-line `import(`. Every one
// of those choices is right there and wrong here. This walker is stricter in
// the direction that matters: it refuses a specifier it cannot resolve rather
// than dropping it.
// =============================================================================

import { existsSync, readFileSync, statSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

/**
 * Static import and re-export forms, with a relative specifier.
 *
 * Anchored to a line start so that the word `import` inside a string or a
 * sentence in a comment is not read as one. Every static form in this codebase
 * begins its line: `import x from`, `import {a} from`, `import './side.js'`,
 * `export * from`, `export {a} from`.
 */
const STATIC_IMPORT =
  /(?:^|\n)\s*(?:import\s*(?:[^;'"]*?\sfrom\s*)?|export\s*(?:\*(?:\s+as\s+\w+)?|\{[^}]*\})\s*from\s*)['"]([^'"]+)['"]/g;

/** `import('...')` with a literal specifier, anywhere on a line. */
const DYNAMIC_IMPORT = /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

/** A bare specifier is a package, not a file in this repository. */
const isRelative = spec => spec.startsWith('.') || spec.startsWith('/');

/**
 * Every repository file the static import graph reaches from `entries`.
 *
 * Specifiers are resolved the way a browser resolves them - as URLs against the
 * importing file, with the extension written out - because this application is
 * served unbundled and every import in it already has to work that way. No
 * extension is guessed. A relative specifier that does not resolve to a file
 * throws, because the alternative is a dependency silently missing from a
 * digest that claims to be complete.
 *
 * @param {object} options - Where to start
 * @param {string} options.root - Repository root, absolute
 * @param {string[]} options.entries - Entry points, repository-relative
 * @returns {{files: string[], dynamic: string[]}} Sorted repo-relative paths, and
 *   the dynamic specifiers that were seen and deliberately not followed
 */
export function importClosure({ root, entries }) {
  const seen = new Set();
  const dynamic = new Set();
  const rel = abs => path.relative(root, abs).split(path.sep).join('/');

  /** @param {string} abs - Absolute path of a file already known to exist */
  const walk = abs => {
    const here = rel(abs);
    if (seen.has(here)) return;
    seen.add(here);
    const src = readFileSync(abs, 'utf8');
    const from = pathToFileURL(abs);

    for (const m of src.matchAll(DYNAMIC_IMPORT)) {
      if (isRelative(m[1])) dynamic.add(`${here} -> ${m[1]}`);
    }

    for (const m of src.matchAll(STATIC_IMPORT)) {
      const spec = m[1];
      if (!isRelative(spec)) continue;
      const target = fileURLToPath(new URL(spec, from));
      if (!existsSync(target) || !statSync(target).isFile()) {
        throw new Error(
          `${here} imports '${spec}', which does not resolve to a file. ` +
            'The instructor freshness digest is derived from this graph, so an ' +
            'unresolvable import is a hole in it rather than a warning.'
        );
      }
      if (!rel(target).startsWith('..')) walk(target);
    }
  };

  for (const entry of entries) {
    const abs = path.join(root, entry);
    if (!existsSync(abs)) {
      throw new Error(`Entry point does not exist: ${entry}`);
    }
    walk(abs);
  }

  return { files: [...seen].sort(), dynamic: [...dynamic].sort() };
}
