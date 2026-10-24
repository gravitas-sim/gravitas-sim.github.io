#!/usr/bin/env node
// =============================================================================
// The oracle's inputs for Prompt 182 (OVERLAYS.md, "The independent oracle")
// -----------------------------------------------------------------------------
//   node tools/overlay-oracle/make-inputs.mjs > tests/fixtures/overlay/oracle-inputs.json
//   (then Prettier)
//
// Writes what the offline oracle (oracle.py: astropy and scipy, no Gravitas
// code) is given: every row of the bright-star pack with the orion truth WCS and
// a time, the five planets' dates, the seeded second frame with the registration
// that carries it, and two WCS with the pixels to carry between them. The scenes
// and their seeds are the thresholds' (tests/fixtures/overlay/thresholds.json),
// built by tools/overlay-validate.mjs; this tool only lays them out.
// =============================================================================

import process from 'node:process';
import {
  THRESHOLDS,
  orionTruth,
  packRows,
  resampleScene,
} from '../overlay-validate.mjs';
import { RULES } from '../../js/measure/overlay.js';
import { truthWcs, grid } from '../astrometry-validate.mjs';

const SC = THRESHOLDS.scenes;
const sc = resampleScene();
const out = {
  format: 'gravitas.overlay-oracle-inputs/1',
  prompt: 182,
  what: 'inputs for tools/overlay-oracle/oracle.py; the scenes of tests/fixtures/overlay/thresholds.json',
  conventions:
    'pixels are FITS (1 at the centre of the first pixel); positions in degrees; proper motion in mas/yr (pmra times cos dec); the CD matrix in degrees per pixel',
  time: { utc: SC.orion.time.value },
  stars: {
    wcs: orionTruth(),
    jd0: 2451545.0,
    rows: packRows().map(r => ({
      hr: r[0],
      ra: r[1] / 1e4,
      dec: r[2] / 1e4,
      pmra: r[5],
      pmde: r[6],
    })),
  },
  planets: { bodies: [...RULES.planets], jdTt: SC.planets.jdTt },
  resample: {
    width: sc.width,
    height: sc.height,
    rotationDeg: sc.rotationDeg,
    about: sc.about,
    shift: sc.shift,
    data: Array.from(sc.data),
  },
  skyMap: {
    first: truthWcs(SC.skyMap.first),
    second: truthWcs(SC.skyMap.second),
    pixels: grid(SC.skyMap.grid.n, SC.skyMap.grid.from, SC.skyMap.grid.to),
  },
};
process.stdout.write(`${JSON.stringify(out)}\n`);
