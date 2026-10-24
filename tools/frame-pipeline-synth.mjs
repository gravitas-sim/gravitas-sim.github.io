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
import { demoSequence } from '../js/measure/frameSource.js';
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
 * The scene's sequence for a seed (js/measure/frameSource.js demoSequence).
 * @param {string} seed
 * @param {object} [o] - count, amplitude, jitter, rotationDeg, replace, variables
 */
export const sceneSequence = (seed, o = {}) => demoSequence(seed, o);

/** The default parameters of a scene run: the target is the variable. */
export const sceneParams = (over = {}) => ({
  target: { x: STARS[0].x, y: STARS[0].y },
  ...over,
});
