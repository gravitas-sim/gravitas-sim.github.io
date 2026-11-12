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
 * Longest first, from a full local run on Node 22 at 614 suites (Prompt 292,
 * per-suite seconds in brackets). The list is a measurement, and it had gone
 * stale: tidesScenarios.test.js (124 s) was not on it and started wherever Jest
 * put it, and the label-golden parts had grown from about 45 s to about 100-160 s.
 * Order only; with four workers the makespan of this order is the work divided
 * by the workers (785 s of 3,139 s), so no suite needs splitting.
 */
export const SLOWEST_FIRST = [
  'detection.test.js', // 332
  'framePipeline.test.js', // 168
  'labelGoldenWidgetsDetector.test.js', // 158
  'physicsValidation.test.js', // 142
  'tidesScenarios.test.js', // 124
  'labelGoldenWidgetsSurvey.test.js', // 114
  'labelGoldenWidgetsRest.test.js', // 102
  'lab3dGuides.test.js', // 85
  'labelGoldenWidgetsEngineMath.test.js', // 61
  'labelGoldenWidgetsPowerLaw.test.js', // 58
  'orbitFit.test.js', // 56
  'deployRehearsal.test.js', // 53
  'labelGoldenWidgetsStellar.test.js', // 51
  'shardInventory.test.js', // 41
  'injection.test.js', // 41
  'labelGoldenWidgetsGw.test.js', // 40
  'statisticsKernel.test.js', // 38
  'xrayResults.test.js', // 37
  'instructorFixture.test.js', // 37
  'i18nFreshness.test.js', // 36
  'calibrationKernel.test.js', // 31
  'docsFactsScope.test.js', // 28
  'matrix.test.js', // 28
  'clustersFollowup.test.js', // 28
  'clustersResults.test.js', // 25
  'imageMeasure.test.js', // 24
  'smallBodies.test.js', // 23
  'effectsRealm.test.js', // 20
  'irreversibility.test.js', // 20
  'spectrograph.test.js', // 19
  'labelGoldenInvestigations.test.js', // 18
  'lab3dCurriculumII.test.js', // 18
  'sedFollowupResults.test.js', // 18
  'instructorMaterials.test.js', // 18
  'pulsarResults.test.js', // 17
  'transitDelta.test.js', // 17
  'rvMonteCarlo.test.js', // 17
  'powerLawGravity.test.js', // 16
  'gwAudio.test.js', // 16
  'galileanMoons.test.js', // 15
  'imageMeasureGate.test.js', // 14
  'sedKernel.test.js', // 14
  'exoplanetGuides.test.js', // 14
  'inference.test.js', // 13
  'seedingEquivalence.test.js', // 13
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
