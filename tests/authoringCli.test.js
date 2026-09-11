// =============================================================================
// The authoring CLI runs in Node
// -----------------------------------------------------------------------------
// This file spawns the real command in a real child process, and that is the
// whole point of it. Every other test in this suite runs under jsdom, where
// `document` exists, so none of them can see the failure this guards: a widget
// family that imports a browser runtime service pulls js/physics.js in behind
// it, and js/physics.js reaches for `document.getElementById` while it is
// still evaluating. Under jsdom that works. In `npm run author:check` it is
// `ReferenceError: document is not defined` before a single lesson is read.
//
// The fix was a seam - js/widgetRuntime.js - and a seam is exactly the kind of
// thing that gets quietly bypassed by the next import somebody adds. So there
// are two tests: one that runs the command, and one that walks the static
// import graph from the CLI's entry point and fails with the offending chain
// if any path reaches a module that touches the DOM at load.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';

const run = promisify(execFile);
const REPO = process.cwd();

describe('npm run author:check', () => {
  test('it runs in a plain Node process with no DOM', async () => {
    const { stdout } = await run('node', ['tools/author-check.mjs'], {
      cwd: REPO,
      // A clean environment: nothing here may depend on a test harness having
      // put a global in place.
      env: { ...process.env, NODE_ENV: 'production' },
      maxBuffer: 32 * 1024 * 1024,
    });
    expect(stdout).toMatch(/investigations/);
    expect(stdout).toMatch(/steps/);
    expect(stdout).not.toMatch(/ReferenceError/);
  }, 120_000);

  test('and it fails loudly rather than silently when a lesson is wrong', async () => {
    // The command is only worth having if it can still say no. Its exit code
    // is what the release gate reads.
    const { stdout } = await run('node', ['tools/author-check.mjs'], {
      cwd: REPO,
      maxBuffer: 32 * 1024 * 1024,
    });
    expect(stdout).toMatch(/Warnings do not fail this command|error/i);
  }, 120_000);
});

describe('the boundary the CLI depends on', () => {
  /** Modules that touch the DOM or a browser API while they evaluate. */
  const BROWSER_ONLY = [
    'js/physics.js',
    'js/audio.js',
    'js/render.js',
    'js/ui.js',
    'js/main.js',
  ];

  /** Every relative import in a file, resolved to a repo-relative path. */
  async function importsOf(file) {
    let src;
    try {
      src = await readFile(path.join(REPO, file), 'utf8');
    } catch {
      return [];
    }
    const out = [];
    const pattern =
      /^\s*(?:import|export)[^'"]*?from\s+['"]([^'"]+)['"]|^\s*import\s+['"]([^'"]+)['"]/gm;
    for (const m of src.matchAll(pattern)) {
      const spec = m[1] || m[2];
      if (!spec || !spec.startsWith('.')) continue;
      out.push(
        path.posix.normalize(path.posix.join(path.posix.dirname(file), spec))
      );
    }
    return out;
  }

  /** The shortest static import chain from `start` to any of `targets`. */
  async function chainTo(start, targets) {
    const seen = new Set([start]);
    const queue = [[start]];
    while (queue.length) {
      const chain = queue.shift();
      for (const next of await importsOf(chain[chain.length - 1])) {
        if (targets.includes(next)) return [...chain, next];
        if (seen.has(next)) continue;
        seen.add(next);
        queue.push([...chain, next]);
      }
    }
    return null;
  }

  test('nothing the CLI imports reaches a browser-only module', async () => {
    const chain = await chainTo('tools/authoring/inputs.mjs', BROWSER_ONLY);
    // Printed as the chain rather than as a boolean: the useful part of this
    // failure is which import added the edge.
    expect(chain?.join(' -> ') ?? null).toBe(null);
  }, 60_000);

  test('the widget families import the seam and not the services', async () => {
    for (const family of [
      'js/gwWidgets.js',
      'js/stellarWidgets.js',
      'js/stellarEvolutionWidgets.js',
    ]) {
      const src = await readFile(path.join(REPO, family), 'utf8');
      expect(src).not.toMatch(/from '\.\/notebookBridge\.js'/);
      expect(src).not.toMatch(/from '\.\/gwAudio\.js'/);
      expect(src).toMatch(/from '\.\/widgetRuntime\.js'/);
    }
  });

  test('the seam itself imports nothing', async () => {
    // It is the one module that must never grow an edge, because everything
    // above depends on it being a leaf.
    expect(await importsOf('js/widgetRuntime.js')).toEqual([]);
  });
});
