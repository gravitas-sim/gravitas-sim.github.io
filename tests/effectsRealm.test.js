// =============================================================================
// The random stream does not depend on what a realm imported
// -----------------------------------------------------------------------------
// The merger explosions draw from Math.random as they build, and the collision
// and fragment code that follows draws from the same stream. An engine realm
// without js/bodyEffects.js (a Worker, a script) that skipped those draws would
// fork the world under seeded stepping: found in review of the first version of
// D-DECOMP-16, where stellar-graveyard diverged on all ten seeds, galactic-
// collision on all ten and compact-object-zoo on four. The builders now stay in
// the engine and the empty pool hands back a scratch particle.
//
// tools/seeded-step.mjs builds a preset under a seed, steps it 300 frames with
// Math.random seeded, and prints every body at full precision, the debris
// counts and the next draw. Two processes, with and without the module, must
// print the same thing.
// =============================================================================

import { describe, test, expect, beforeAll } from '@jest/globals';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

// The two processes of a pair do not depend on each other, so they run side by
// side. A process that exits non-zero rejects, with its stderr in the message,
// and Promise.all passes the first rejection to the test, so a failing child
// fails the test loudly rather than reading as an empty result.
const run = async (key, seed, withEffects) =>
  (
    await execFileAsync(
      process.execPath,
      [
        new URL('../tools/seeded-step.mjs', import.meta.url).pathname,
        key,
        String(seed),
        '300',
        ...(withEffects ? ['--effects'] : []),
      ],
      { maxBuffer: 1 << 28, encoding: 'utf8' }
    )
  ).stdout;

// All three worlds start together: each test only awaits its own pair, so the
// suite takes the longest pair's time rather than the sum of the three.
const WORLDS = [
  ['stellar-graveyard', 5],
  ['stellar-graveyard', 9],
  ['galactic-collision', 1],
];
const started = new Map();
const outputs = (key, seed) => {
  const id = `${key}:${seed}`;
  if (!started.has(id)) {
    started.set(id, Promise.all([run(key, seed, false), run(key, seed, true)]));
  }
  return started.get(id);
};

describe('a realm without the effects module steps the same world', () => {
  beforeAll(() => {
    // A failing child rejects its pair's promise; the test that awaits it
    // reports that, so a rejection nobody has awaited yet is not unhandled.
    for (const [key, seed] of WORLDS) outputs(key, seed).catch(() => {});
  });

  for (const [key, seed] of WORLDS) {
    test(`${key}, seed ${seed}: every body, the debris and the next draw`, async () => {
      const [outWithout, outWith] = await outputs(key, seed);
      const without = JSON.parse(outWithout);
      const withIt = JSON.parse(outWith);
      expect(without.counts).toEqual(withIt.counts);
      expect(without.next).toBe(withIt.next);
      expect(without.rows.length).toBe(withIt.rows.length);
      expect(without.rows).toEqual(withIt.rows);
    }, 120000);
  }
});
