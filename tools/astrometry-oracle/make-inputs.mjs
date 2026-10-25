#!/usr/bin/env node
// =============================================================================
// The oracle's inputs for Prompt 181 (ASTROMETRY.md, "The independent oracle")
// -----------------------------------------------------------------------------
//   node tools/astrometry-oracle/make-inputs.mjs > tests/fixtures/astrometry/oracle-inputs.json
//   (then Prettier)
//
// Writes what the offline oracle (oracle.py: astropy and scipy, no Gravitas
// code) is given: the synthetic truth WCS and a pixel grid, the noisy orion
// stars and the sky points to evaluate, the noisy registration pairs, and the
// authentic TESS header with its pixels. The scenes and their seeds are the
// thresholds' (tests/fixtures/astrometry/thresholds.json), built by
// tools/astrometry-validate.mjs; this tool only lays them out.
// =============================================================================

import process from 'node:process';
import {
  TESS_HEADER,
  THRESHOLDS,
  grid,
  orionScene,
  registrationScene,
} from '../astrometry-validate.mjs';
import { skyOf } from '../../js/measure/astrometry.js';

const O = THRESHOLDS.scenes.orion;
const noisy = orionScene({ noise: true });
const reg = registrationScene();
const header = TESS_HEADER;
const pixels = [];
for (let y = 1 - 10; y <= header.height + 10; y++)
  for (let x = 1 - 10; x <= header.width + 10; x++) pixels.push([x, y]);

const out = {
  format: 'gravitas.astrometry-oracle-inputs/1',
  prompt: 181,
  what: 'inputs for tools/astrometry-oracle/oracle.py; the scenes of tests/fixtures/astrometry/thresholds.json',
  conventions:
    'pixels are FITS (1 at the centre of the first pixel); positions in degrees; the CD matrix in degrees per pixel',
  projection: {
    wcs: orionScene().truth,
    pixels: grid(O.grid.n, O.grid.from, O.grid.to),
  },
  fit: {
    tangent: noisy.truth.crval,
    stars: noisy.stars.map(s => ({
      id: s.id,
      hr: s.hr,
      x: s.x,
      y: s.y,
      ra: s.ra,
      dec: s.dec,
      sigma: s.sigma,
    })),
    sky: grid(5, 100, 900).map(([x, y]) => {
      const s = skyOf(noisy.truth, x, y);
      return [s.ra, s.dec];
    }),
  },
  registration: {
    pairs: reg.pairs.map(p => ({
      id: p.id,
      a: p.a,
      b: p.b,
      sigmaA: p.sigmaA,
      sigmaB: p.sigmaB,
    })),
  },
  header: {
    what: 'the authentic TESS sector 56 aperture image (js/data/observations/tessHd209458S56Aperture.js, image.wcs), every pixel and a margin of 10 pixels on every side',
    wcs: header.wcs,
    width: header.width,
    height: header.height,
    pixels,
  },
};
process.stdout.write(`${JSON.stringify(out, null, 2)}\n`);
