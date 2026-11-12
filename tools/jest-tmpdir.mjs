// =============================================================================
// One temporary directory per Jest run, removed when the run ends
// -----------------------------------------------------------------------------
// The suites make scratch directories with mkdtemp(tmpdir()) - archives,
// registries, packs, git repositories, child tools' outputs - and a third of
// them never remove theirs. Nobody noticed until the Mac's own temporary
// directory held 145,000 of them and 57 GB, with the disk at 99%.
//
// Rather than chase every site, the run gets a directory of its own and
// everything inside it goes with it: globalSetup points TMPDIR there before
// the workers start, so every worker, every suite and every child process a
// suite spawns inherits it, and globalTeardown removes it. A nested Jest run
// (tools/docs-facts.mjs starts one) makes its own inside its parent's.
//
// A run that is killed never reaches teardown, so setup also removes run
// directories older than a day that a killed run left beside its own.
// =============================================================================

import {
  mkdtempSync,
  readdirSync,
  realpathSync,
  rmSync,
  statSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const PREFIX = 'gravitas-jest-run-';
const STALE_MS = 24 * 60 * 60 * 1000;

/** Jest globalSetup: give this run its own TMPDIR. */
export function setup() {
  const parent = tmpdir();
  for (const name of readdirSync(parent)) {
    if (!name.startsWith(PREFIX)) continue;
    const dir = path.join(parent, name);
    try {
      if (Date.now() - statSync(dir).mtimeMs > STALE_MS)
        rmSync(dir, { recursive: true, force: true });
    } catch {
      // Another run removed it first.
    }
  }
  // Resolved, so a suite comparing tmpdir() with a realpath sees one path:
  // on macOS /var is a link to /private/var.
  const dir = realpathSync(mkdtempSync(path.join(parent, PREFIX)));
  process.env.GRAVITAS_JEST_TMPDIR = dir;
  process.env.TMPDIR = dir;
}

/** Jest globalTeardown: remove this run's TMPDIR and everything in it. */
export function teardown() {
  const dir = process.env.GRAVITAS_JEST_TMPDIR;
  if (dir && path.basename(dir).startsWith(PREFIX))
    rmSync(dir, { recursive: true, force: true });
}
