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

/**
 * Longest first, from the CI run of 2026-10-24 (b4656619, per-suite seconds in
 * brackets, three workers). detection.test.js was missing from this list and
 * started at about 270 s of a 650 s run, so the longest suite of all finished
 * last; it is first now.
 */
export const SLOWEST_FIRST = [
  'detection.test.js', // 383
  'physicsValidation.test.js', // 155
  // The instrument-widget label golden, in parts of about 30 s each locally.
  'labelGoldenWidgetsPowerLaw.test.js', // 70
  'labelGoldenWidgetsEngineMath.test.js', // 66
  'labelGoldenWidgetsStellar.test.js', // 56
  'injection.test.js', // 52
  'statisticsKernel.test.js', // 50
  'labelGoldenWidgetsGw.test.js', // 47
  'labelGoldenWidgetsSurvey.test.js', // 45
  'labelGoldenWidgetsDetector.test.js', // 44
  'shardInventory.test.js', // 43
  'calibrationKernel.test.js', // 38
  'labelGoldenWidgetsRest.test.js', // 33
  'imageMeasure.test.js', // 31
  'i18nFreshness.test.js', // 30
  'docsFactsScope.test.js', // 30
  'lab3dGuides.test.js', // 26
  'effectsRealm.test.js', // 26
  'powerLawGravity.test.js', // 23
  'irreversibility.test.js', // 20
  'matrix.test.js', // 19
  'imageMeasureGate.test.js', // 19
  'missionEvidence.test.js', // 19
  'gwAudio.test.js', // 19
  'instructorFixture.test.js', // 18
  'deployRehearsal.test.js',
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
