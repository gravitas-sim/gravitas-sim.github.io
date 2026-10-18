import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import process from 'node:process';

// =============================================================================
// The 2.0.0 readers, archived from the tag and run next to the current ones
// -----------------------------------------------------------------------------
// js/ at the commit v2.0.0 names, unpacked into a temporary tree, is "the old
// build": what a browser still holding 2.0.0's cached code, an older tab or a
// rolled-back deploy reads with. tests/compat/run.mjs runs one record kind's
// spec against a tree in a plain Node process, so the same file builds and
// reads records with the old code and with the new.
// =============================================================================

/** The commit the v2.0.0 tag names (RELEASING.md): main at the release. */
export const OLD_COMMIT = 'a71f73f50f30ec6a81d398d2cd54f474e87ddd85';
export const REPO = process.cwd();
export const KIND_DIR = path.join(REPO, 'tests', 'compat', 'kinds');

/** Unpack js/ and sdk/ of the old commit; returns {tree, cleanup}. */
export function archiveOld() {
  const tree = mkdtempSync(path.join(tmpdir(), 'gravitas-compat-'));
  const tar = path.join(tree, 'js.tar');
  execFileSync(
    'git',
    ['archive', '--format=tar', '-o', tar, OLD_COMMIT, 'js', 'sdk'],
    {
      cwd: REPO,
    }
  );
  execFileSync('tar', ['-xf', tar, '-C', tree]);
  writeFileSync(path.join(tree, 'package.json'), '{"type":"module"}');
  return {
    tree,
    cleanup: () => rmSync(tree, { recursive: true, force: true }),
  };
}

/** Run one spec operation against a tree: {ok, value} or {ok: false, error}. */
export function run(tree, kind, op, input) {
  const out = execFileSync(
    process.execPath,
    [
      path.join(REPO, 'tests', 'compat', 'run.mjs'),
      tree,
      path.join(KIND_DIR, `${kind}.mjs`),
      op,
    ],
    {
      encoding: 'utf8',
      input: input === undefined ? '' : JSON.stringify(input),
      maxBuffer: 1 << 26,
    }
  );
  return JSON.parse(out.trim().split('\n').at(-1));
}
