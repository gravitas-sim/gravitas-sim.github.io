#!/usr/bin/env node
// =============================================================================
// The inputs of the independent oracle of Prompt 251 (tools/lensing2-oracle/oracle.py)
// -----------------------------------------------------------------------------
// Writes tests/fixtures/lensing2/oracle-inputs.json: the numbers the oracle is asked about, read from the
// committed thresholds (the cosmology, the redshift pairs, the Einstein angles, the source offsets) and
// the 20 seeded synthetic arcs of leg B4 (drawn by the kernel's labelled generator and handed over as
// plain points, so the oracle shares no code with the kernel). It writes inputs only, never an expected
// value. Run:  node tools/lensing2-oracle/make-inputs.mjs
// =============================================================================

import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gaussian, stream } from '../../js/random/streams.js';
import { syntheticArc } from '../../js/kernels/lensing/enclosed/synthetic.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const DIR = path.join(ROOT, 'tests', 'fixtures', 'lensing2');
const T = JSON.parse(readFileSync(path.join(DIR, 'thresholds.json'), 'utf8'));
const G = JSON.parse(readFileSync(path.join(DIR, 'gate-thresholds.json'), 'utf8'));
const lim = id => T.checks.find(c => c.id.startsWith(`${id}.`)).limits;
const glim = id => G.checks.find(c => c.id.startsWith(`${id}.`)).limits;

const b4 = lim('B4');
const arcs = [];
for (let i = 0; i < b4.nArcs; i++) {
  const u = stream('noise', T.seeds.B4, String(i));
  const extentDeg = 120 + (240 * i) / (b4.nArcs - 1);
  const centre = { x: 256 + (u() - 0.5) * 100, y: 256 + (u() - 0.5) * 100 };
  const startDeg = u() * 360;
  const a = syntheticArc({
    centre,
    radius: 100,
    extentDeg,
    startDeg,
    n: 24,
    sigma: 1,
    normal: gaussian(stream('noise', T.seeds.B4, String(i), 'position')),
  });
  arcs.push({ id: i, sigma: 1, centre, extentDeg, points: a.points });
}

const out = {
  format: 'gravitas.lensing2-oracle-inputs/1',
  note: 'inputs only; SYNTHETIC arcs drawn by js/kernels/lensing/enclosed/synthetic.js, no expected value',
  cosmology: { H0: 70, Om: 0.3, OL: 0.7, note: T.worlds.cosmology },
  redshiftPairs: T.worlds.redshiftPairs,
  thetaEArcsec: lim('B2').thetaEArcsec,
  images: { nY: lim('B3').nY, yRange: lim('B3').yRange },
  arcs,
  interval: { thetaEArcsec: 3.2, sigmaArcsec: 0.096, zl: 0.3, zs: 1.0, levels: [0.68, 0.95], draws: lim('B5').draws, seed: 251 },
  delay: {
    sis: [
      { zl: 0.5, zs: 2.0, thetaEArcsec: 1.0, y: 0.3 },
      { zl: 0.3, zs: 1.0, thetaEArcsec: 2.0, y: 0.5 },
      { zl: 0.8, zs: 3.0, thetaEArcsec: 1.5, y: 0.1 },
    ],
    sheet: { lambda: glim('G3').lambda },
    trueH0: 70,
  },
  p0: glim('P0'),
  p1: glim('P1'),
};
writeFileSync(path.join(DIR, 'oracle-inputs.json'), `${JSON.stringify(out)}\n`);
console.log(`wrote oracle-inputs.json: ${arcs.length} arcs`);
