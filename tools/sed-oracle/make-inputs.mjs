#!/usr/bin/env node
// Writes tests/fixtures/sed/oracle-inputs.json: the bands of the bandpass pack and the points of
// legs B3 and B4 as plain arrays, so the Python oracle (which reads no Gravitas code) judges the
// very numbers the kernel judged. Run: node tools/sed-oracle/make-inputs.mjs
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { URL, fileURLToPath } from 'node:url';
import { BANDS } from '../../js/data/radiation/bandpasses.js';
import {
  DIR,
  THRESHOLDS,
  bands as bandMap,
  limits,
  makeScene,
} from '../sed-scenes.mjs';
import { decodeBand } from '../../js/kernels/radiation/index.js';
import { normalizePoints } from '../../js/kernels/sed/points.js';

const ROOT = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..'
);

export function oracleInputs() {
  const bands = BANDS.map(b => {
    const d = decodeBand(b);
    return {
      id: b.id,
      lambdaNm: Array.from(d.lambdaNm),
      response: Array.from(d.s),
      abMinusVega: d.abMinusVega,
    };
  });
  const b3 = limits('B3.fitOracle');
  const b1 = limits('B1.astropyConversions');
  const b2 = limits('B2.bandMeanOracle');
  const b4 = limits('A3.blackbodyTotal');
  return {
    format: 'gravitas.sed-oracle-inputs/1',
    note: 'written by tools/sed-oracle/make-inputs.mjs from the kernel generator and the bandpass pack; the oracle reads this, never Gravitas code',
    bands,
    conversions: b1,
    bandMeans: b2,
    fits: b3.cases.map(c => {
      const s = makeScene(c.star, c.set, { seed: c.seed, label: c.label });
      // AM1: the chord leg is handed the kernel's own pivot wavelengths
      const pivotsNm = Object.fromEntries(
        normalizePoints(s.points, bandMap).points.map(p => [p.id, p.lambdaNm])
      );
      return {
        ...c,
        levels: b3.levels,
        points: s.points,
        truth: s.truth,
        pivotsNm,
      };
    }),
    tails: {
      boundsNm: b4.boundsNm,
      stars: Object.entries(THRESHOLDS.synthetic.stars).map(([k, v]) => ({
        key: k,
        ...v,
      })),
    },
  };
}

if (
  process.argv[1] &&
  import.meta.url === new URL(`file://${process.argv[1]}`).href
)
  writeFileSync(
    path.join(ROOT, DIR, 'oracle-inputs.json'),
    JSON.stringify(oracleInputs()) + '\n'
  );
