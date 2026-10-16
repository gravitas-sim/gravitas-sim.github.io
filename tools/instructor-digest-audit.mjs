#!/usr/bin/env node
// =============================================================================
// Prove the freshness digest covers everything the build reads
// -----------------------------------------------------------------------------
// The invariant the instructor bundle's freshness rests on:
//
//     If a tracked source file can change the plaintext instructor materials,
//     its change must alter the freshness digest.
//
// tools/source-closure.mjs derives the covered set by reading import statements,
// which is a claim about the program rather than an observation of it. This is
// the observation. It registers a module-load hook, runs a real build in this
// process, and compares what Node actually loaded with what the walker said it
// would.
//
// The two must agree exactly, in both directions. A module loaded and not
// covered is a hole in the digest - a file that can change every answer key
// while `instructors:check` stays green, which is the failure this whole
// mechanism exists to prevent. A module covered and not loaded means the walker
// is following an edge that is not there, which would mark the bundle stale
// over a file that cannot affect it and train people to rebuild without
// reading why.
//
// Run against `--fixture`, which loads precisely the same module graph - every
// import in it is static - and calls precisely the same document generators,
// but writes placeholder pages to a gitignored path instead of touching
// instructors/materials.enc.json. The audit therefore has no side effect on any
// tracked file and needs no passphrase.
//
// The case this is really here for: the day somebody adds an awaited dynamic
// `import()` inside a document generator. The walker does not follow dynamic
// edges - deliberately, because following them turns forty-six files into two
// hundred and fifty and drags in the renderer and Three.js - and that is sound
// only while nothing awaits one. This notices the day that stops being true.
//
// A program rather than a test helper, because Jest refuses `module.register()`
// - its hooks would attach to the loader running Jest itself rather than to the
// sandboxed one the test code uses. tests/instructorDigest.test.js runs this
// command in a child process and reads `--json`, which is also the form CI and
// the release gate use, so the thing under test is the thing that ships.
// ==============================================================================

import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, relative, resolve } from 'node:path';
import { register } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Run a fixture build and report every repository module Node loaded.
 *
 * The hook has to be registered before anything imports the builder, because a
 * module already in Node's cache is never loaded again and the hook would see
 * nothing. That is why this returns the builder module rather than letting the
 * caller import it: the first import of it has to be this one. Asking for
 * `sourcePaths()` first is what made an earlier version of this audit report
 * one loaded module and forty-six phantom omissions.
 *
 * @returns {Promise<{loaded: string[], builder: object}>} Repo-relative paths,
 *   sorted, and the builder module that produced them
 */
export async function modulesLoadedByABuild() {
  const scratch = mkdtempSync(join(tmpdir(), 'gravitas-digest-audit-'));
  const log = join(scratch, 'modules.log');
  writeFileSync(log, '');
  const previousArgv = process.argv;
  try {
    process.env.GRAVITAS_MODULE_LOG = log;
    register(pathToFileURL(join(ROOT, 'tools', 'module-load-hook.mjs')).href);

    const builder = join(ROOT, 'tools', 'build-instructor-materials.js');
    // The builder only runs itself when it is the program, so the fixture build
    // is started explicitly. Its arguments are passed rather than faked into
    // process.argv.
    const mod = await import(pathToFileURL(builder).href);
    // The fixture build narrates fifty-four documents. This command's output is
    // a verdict, and under --json it has to be JSON and nothing else.
    const say = console.log;
    console.log = () => {};
    try {
      await mod.main(['--fixture', join(scratch, 'materials.enc.json')]);
    } finally {
      console.log = say;
    }

    const loaded = new Set();
    for (const line of readFileSync(log, 'utf8').split('\n')) {
      if (!line.startsWith('file://')) continue;
      const path = fileURLToPath(line.trim());
      const rel = relative(ROOT, path);
      if (!rel.startsWith('..') && !rel.includes('node_modules')) {
        loaded.add(rel.split(/[\\/]/).join('/'));
      }
    }
    return { loaded: [...loaded].sort(), builder: mod };
  } finally {
    process.argv = previousArgv;
    delete process.env.GRAVITAS_MODULE_LOG;
    rmSync(scratch, { recursive: true, force: true });
  }
}

/**
 * Compare what the build loaded with what the digest covers.
 *
 * @returns {Promise<{loaded: string[], covered: string[], uncovered: string[],
 *   unloaded: string[]}>} The two sets and their differences
 */
export async function auditDigestCoverage() {
  const { loaded, builder } = await modulesLoadedByABuild();
  const covered = builder.sourcePaths();
  const coveredSet = new Set(covered);
  const loadedSet = new Set(loaded);
  return {
    loaded,
    covered,
    uncovered: loaded.filter(f => !coveredSet.has(f)),
    unloaded: covered.filter(f => !loadedSet.has(f)),
  };
}

async function main() {
  const { loaded, covered, uncovered, unloaded } = await auditDigestCoverage();
  const sound = !uncovered.length && !unloaded.length;

  if (process.argv.includes('--json')) {
    process.stdout.write(
      JSON.stringify({ sound, loaded, covered, uncovered, unloaded }, null, 2) +
        '\n'
    );
    return sound ? 0 : 1;
  }

  console.log(
    `The build loaded ${loaded.length} repository modules; the freshness ` +
      `digest covers ${covered.length}.`
  );
  if (sound) {
    console.log(
      'Every file that can change the instructor materials is in the digest.'
    );
    return 0;
  }
  for (const f of uncovered) {
    console.error(
      `  NOT IN THE DIGEST  ${f}  - the build read it and a change to it would ` +
        'not mark the bundle stale'
    );
  }
  for (const f of unloaded) {
    console.error(
      `  IN THE DIGEST, UNREAD  ${f}  - a change to it would mark the bundle ` +
        'stale without being able to affect it'
    );
  }
  console.error(
    '\nThe covered set comes from tools/source-closure.mjs, walking static ' +
      'imports\nfrom tools/build-instructor-materials.js.'
  );
  return 1;
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  main().then(code => process.exit(code));
}
