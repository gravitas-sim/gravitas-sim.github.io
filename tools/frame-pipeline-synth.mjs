// =============================================================================
// The committed scene of the frame-pipeline checks (Prompt 185, FRAME_PIPELINE.md)
// -----------------------------------------------------------------------------
// tests/fixtures/framepipeline/thresholds.json names the detector, the eight
// stars, the variable, the cloud and the pointing; this turns that scene and a
// seed into a synthetic sequence (js/measure/frameSource.js). Imported by
// tools/frame-pipeline-validate.mjs, tools/frame-pipeline-oracle/make-inputs.mjs
// and tests/framePipeline.test.js.
// =============================================================================

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { syntheticSequence } from '../js/measure/frameSource.js';
import { permits } from '../js/dataKinds/contract.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const THRESHOLDS = JSON.parse(
  readFileSync(
    path.join(HERE, '../tests/fixtures/framepipeline/thresholds.json'),
    'utf8'
  )
);
export const SCENE = THRESHOLDS.scene;
export const check = permits;

/** The committed stars as the generator wants them. */
export const STARS = SCENE.stars.map(({ id, x, y, rate }) => ({
  id,
  x,
  y,
  rate,
}));

/**
 * The scene's sequence for a seed.
 * @param {string} seed
 * @param {object} [o]
 * @param {number} [o.amplitude] - the target's semi-amplitude, magnitudes
 * @param {Array<object>} [o.variables] - more variables (a varying comparison star)
 * @param {object} [o.replace] - frames that go wrong, by index
 * @param {number} [o.count]
 * @param {number} [o.jitter]
 * @param {number} [o.rotationDeg]
 */
export function sceneSequence(seed, o = {}) {
  return syntheticSequence({
    seed,
    detector: { width: 64, height: 64, cosmicRate: 0 },
    exposure: SCENE.exposure,
    sky: SCENE.sky,
    stars: STARS,
    count: o.count ?? SCENE.frames,
    cadence: SCENE.cadenceDays,
    cloud: 0.1,
    jitter: o.jitter ?? 1.5,
    rotationDeg: o.rotationDeg ?? 0.2,
    replace: o.replace,
    variables: [
      {
        id: 'V',
        period: SCENE.variable.period,
        amplitude: o.amplitude ?? SCENE.variable.amplitude,
        phase: 'seed',
      },
      ...(o.variables ?? []),
    ],
  });
}

/** The default parameters of a scene run: the target is the variable. */
export const sceneParams = (over = {}) => ({
  target: { x: STARS[0].x, y: STARS[0].y },
  ...over,
});
