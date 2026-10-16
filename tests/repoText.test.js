// =============================================================================
// No local filesystem paths in tracked text
// -----------------------------------------------------------------------------
// A path under a user's home directory in repository text names one machine
// and leaks a username. Cite "the project's CLAUDE.md" or a repo-relative
// path instead. Files that must contain such a path on purpose go in ALLOWED,
// with the reason.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import { spawnSync } from 'node:child_process';

// Built from pieces so this file does not match its own search.
const NEEDLE = '/Us' + 'ers/';
const ALLOWED = {
  // 'path/to/file': 'why it must keep a local path',
};

describe('repository text', () => {
  test('no tracked text file names a local home-directory path', () => {
    const r = spawnSync('git', ['grep', '-I', '-n', '-F', NEEDLE], {
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
    });
    // Status 1 means no match; anything above is a real git failure.
    expect(r.status === 0 || r.status === 1).toBe(true);
    const hits = r.stdout
      .split('\n')
      .filter(Boolean)
      .filter(line => !Object.hasOwn(ALLOWED, line.split(':')[0]));
    expect(hits.map(h => h.slice(0, 120))).toEqual([]);
  });
});
