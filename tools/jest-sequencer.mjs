// =============================================================================
// Start the slowest suites first
// -----------------------------------------------------------------------------
// Jest orders suites by their recorded duration, and falls back to file size
// when it has none. A fresh checkout, which is every CI run, has no record, so
// the order was file size: tests/physicsValidation.test.js is a small file that
// runs the whole physics suite in a child process (about two minutes, on a
// quiet machine), and it started late, which left one worker finishing it
// while the rest sat idle. A run's wall time is the work divided by the
// workers plus whatever is still running when the others have stopped, so the
// long suites go first and the short ones fill the gaps behind them.
//
// This changes only the order. Every suite still runs, with the same settings,
// in its own context; no suite shares state with another, so the order is not
// observable in a result. Anything not listed keeps Jest's own order, and
// a suite that has failed or has a recorded duration is still placed by Jest
// among the unlisted ones. The list is a measurement (npm test --json, per
// suite duration), not a contract: a name that no longer exists is ignored, and
// a suite that becomes slow can be added at any time.
// =============================================================================

import Sequencer from '@jest/test-sequencer';
import path from 'node:path';

/** Longest first, from the 2026-10 measurement. */
export const SLOWEST_FIRST = [
  'physicsValidation.test.js',
  'powerLawGravity.test.js',
  'instructorFixture.test.js',
  'effectsRealm.test.js',
  'shardInventory.test.js',
  'calibrationKernel.test.js',
  'irreversibility.test.js',
  'deployRehearsal.test.js',
  'lab3dGuides.test.js',
  'docsFactsScope.test.js',
  'missionEvidence.test.js',
  'rvMonteCarlo.test.js',
];

export default class SlowestFirstSequencer extends Sequencer {
  sort(tests) {
    const rest = super.sort(tests);
    const named = SLOWEST_FIRST.map(name =>
      rest.find(t => path.basename(t.path) === name)
    ).filter(Boolean);
    return [...named, ...rest.filter(t => !named.includes(t))];
  }
}
