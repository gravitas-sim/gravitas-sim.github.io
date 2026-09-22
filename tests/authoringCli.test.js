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

import { afterEach, describe, test, expect } from '@jest/globals';
import { execFile } from 'node:child_process';
import {
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
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

  // This asserted that stdout matched /Warnings do not fail this command/,
  // which is a line the command only prints when it HAS warnings. It passed
  // for as long as the catalog had nineteen of them and failed the moment they
  // were fixed - so what it was really testing was that the lessons were not
  // clean. The exit code, which its own comment called the thing that matters,
  // was never read.
  test('a clean catalog exits zero, with and without --warnings', async () => {
    for (const args of [[], ['--warnings']]) {
      const { stdout } = await run(
        'node',
        ['tools/author-check.mjs', ...args],
        {
          cwd: REPO,
          maxBuffer: 32 * 1024 * 1024,
        }
      );
      // execFile rejects on a non-zero exit, so reaching here is the assertion.
      expect(stdout).toMatch(/nothing to report|warning/i);
    }
  }, 120_000);

  test('and it still says no when a lesson is actually wrong', async () => {
    // Broken on purpose, in the real tree, because the exit code is what the
    // release gate reads and nothing else here proves it can be non-zero.
    const file = path.join(REPO, 'js/data/investigations/tides.js');
    const original = await readFile(file, 'utf8');
    const broken = original.replace(
      /^(\s*)sid: '/m,
      "$1sid: '' , brokenOnPurpose: '"
    );
    expect(broken).not.toBe(original);
    try {
      await writeFile(file, broken);
      let exitCode = 0;
      let output = '';
      try {
        await run('node', ['tools/author-check.mjs', '--lesson=tides'], {
          cwd: REPO,
          maxBuffer: 32 * 1024 * 1024,
        });
      } catch (err) {
        exitCode = err.code;
        output = String(err.stdout || '') + String(err.stderr || '');
      }
      expect(exitCode).not.toBe(0);
      expect(output).toMatch(/error/i);
    } finally {
      await writeFile(file, original);
    }
    expect(await readFile(file, 'utf8')).toBe(original);
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

// =============================================================================
// The scaffolder inserts lines, so it has to insert whole ones
// -----------------------------------------------------------------------------
// `author:new` registers a lesson in js/data/investigations.js by splicing an
// import in ahead of an anchor. The anchor is written with a LEADING newline -
// "\nimport { gradedSteps, ... }" - so that it matches that import and not a
// substring of another, and the line handed to insertOnce() carried no
// terminator of its own. Splicing at the raw character index therefore landed
// the new import at the END of the line before it:
//
//   import LIVES_OF_STARS from './...lives-of-stars.js';import X from './...x.js';
//
// Valid JavaScript, and `npm run format:check` and `npm run lint` both fail on
// it the moment the author runs them - in a file the author never opened.
//
// These tests run the real command in a real child process against a
// DISPOSABLE COPY of the four files it touches. Nothing here writes to the
// working tree: a generator test that scaffolded into the repository would
// leave a lesson behind every time it failed half way.
//
// What is asserted, and what is deliberately not
// -----------------------------------------------------------------------------
// The generator's own closing advice is `npm run format  -  the scaffold is
// written plainly, prettier owns it`, and that is a real convention: the
// lesson template it writes is a file the author is about to rewrite, and it
// is not held to the formatter before that step.
//
// js/data/investigations.js is a different thing. It is a checked-in file that
// is prettier-clean today, that the author does not open, and that the bug
// above corrupts. Keeping it clean is an existing property being preserved,
// not a new contract on scaffolds - so the formatter is asserted on that one
// file and on nothing else.
// =============================================================================

describe('npm run author:new', () => {
  /** The files the generator reads and writes, all relative to its cwd. */
  const TOUCHES = [
    'js/data/investigations.js',
    'js/data/investigations/registry.js',
    'js/data/instructorContent.js',
  ];

  /**
   * A throwaway tree holding real copies of the files the generator edits.
   *
   * Real copies rather than fixtures: the anchors the generator looks for are
   * in this repository's own files, and a fixture would go stale the first
   * time one of them was reworded - which is the failure this test exists to
   * catch, wearing different clothes.
   */
  async function scratchTree() {
    const dir = await mkdtemp(path.join(tmpdir(), 'gravitas-author-new-'));
    await mkdir(path.join(dir, 'js/data/investigations/es'), {
      recursive: true,
    });
    for (const rel of TOUCHES) {
      await copyFile(path.join(REPO, rel), path.join(dir, rel));
    }
    // `type: module` so `node --check` reads the result as ESM, and the real
    // formatter settings so the prettier assertion is the repository's.
    await writeFile(
      path.join(dir, 'package.json'),
      JSON.stringify({ name: 'scratch', type: 'module', private: true })
    );
    await copyFile(
      path.join(REPO, '.prettierrc.json'),
      path.join(dir, '.prettierrc.json')
    );
    return dir;
  }

  const scaffold = (dir, id, title) =>
    run(
      'node',
      [
        path.join(REPO, 'tools/new-investigation.mjs'),
        `--id=${id}`,
        `--title=${title}`,
      ],
      {
        cwd: dir,
        maxBuffer: 8 * 1024 * 1024,
      }
    );

  let dir;
  afterEach(async () => {
    if (dir) await rm(dir, { recursive: true, force: true });
    dir = null;
  });

  test('the new import lands on a line of its own', async () => {
    dir = await scratchTree();
    await scaffold(dir, 'scratch-demo', 'Scratch Demo');

    const barrel = path.join(dir, 'js/data/investigations.js');
    const lines = (await readFile(barrel, 'utf8')).split('\n');
    const wanted =
      "import SCRATCH_DEMO from './investigations/scratch-demo.js';";

    // Exactly once, and as the whole of its line rather than the tail of
    // somebody else's.
    const hits = lines
      .map((line, i) => [line, i])
      .filter(([line]) => line.includes(wanted));
    expect(hits).toHaveLength(1);
    const [line, at] = hits[0];
    expect(line).toBe(wanted);

    // The line before it is still a complete import. This is the assertion
    // that actually fails on the bug: with the two fused, `lines[at]` IS the
    // previous import and this reads the one above that.
    //
    // Matched by shape rather than by name. It used to name the lesson that
    // happened to sort just before the scratch one - and the next lesson
    // anybody added sorted between them and broke a test about the authoring
    // tool for a reason that had nothing to do with it, which is the same
    // defect one level up from the one this file exists to catch.
    expect(lines[at - 1]).toMatch(
      /^import [A-Z0-9_]+ from '\.\/investigations\/[a-z0-9-]+\.js';$/
    );
    // And the anchor it was inserted ahead of still follows it.
    expect(lines[at + 1]).toBe(
      "import { gradedSteps, positionIn } from './investigations/catalog.js';"
    );
    // No line anywhere carries two import statements.
    for (const l of lines) {
      expect(l.split('import ').length).toBeLessThan(3);
    }
  }, 60_000);

  test('the file it wrote is still a parseable module', async () => {
    dir = await scratchTree();
    await scaffold(dir, 'scratch-demo', 'Scratch Demo');
    // execFile rejects on a non-zero exit, so reaching the end is the
    // assertion. --check parses without executing, which is what is wanted:
    // the module's own imports are not resolvable from a scratch tree.
    await run('node', ['--check', 'js/data/investigations.js'], { cwd: dir });
  }, 60_000);

  test('and is still what the formatter would have written', async () => {
    dir = await scratchTree();
    // Clean before, so a failure after is the generator's doing and not a
    // pre-existing state of the checked-in file.
    await run(
      path.join(REPO, 'node_modules/.bin/prettier'),
      ['--check', 'js/data/investigations.js'],
      { cwd: dir }
    );
    await scaffold(dir, 'scratch-demo', 'Scratch Demo');
    await run(
      path.join(REPO, 'node_modules/.bin/prettier'),
      ['--check', 'js/data/investigations.js'],
      { cwd: dir }
    );
  }, 60_000);

  test('running it twice registers the lesson once', async () => {
    dir = await scratchTree();
    await scaffold(dir, 'scratch-demo', 'Scratch Demo');
    const after = await readFile(
      path.join(dir, 'js/data/investigations.js'),
      'utf8'
    );

    const { stdout } = await scaffold(dir, 'scratch-demo', 'Scratch Demo');
    // The command's own promise: nothing is overwritten, and a second run
    // reports what is already in place.
    expect(stdout).toMatch(/already/i);

    const again = await readFile(
      path.join(dir, 'js/data/investigations.js'),
      'utf8'
    );
    expect(again).toBe(after);
    expect(again.split("from './investigations/scratch-demo.js'")).toHaveLength(
      2
    );
    expect(again.split(/^\s*SCRATCH_DEMO,$/m)).toHaveLength(2);
  }, 90_000);

  test('the registry and the guide are registered once each too', async () => {
    dir = await scratchTree();
    await scaffold(dir, 'scratch-demo', 'Scratch Demo');
    await scaffold(dir, 'scratch-demo', 'Scratch Demo');

    const registry = await readFile(
      path.join(dir, 'js/data/investigations/registry.js'),
      'utf8'
    );
    expect(registry.split("'scratch-demo': () =>")).toHaveLength(3); // loader + translation
    const guide = await readFile(
      path.join(dir, 'js/data/instructorContent.js'),
      'utf8'
    );
    expect(guide.split("'scratch-demo': {")).toHaveLength(2);
    for (const rel of TOUCHES) {
      await run('node', ['--check', rel], { cwd: dir });
    }
  }, 90_000);
});
