#!/usr/bin/env node
// Writes tests/fixtures/xray/oracle-inputs.json: the series of legs B3 and B4 as plain
// arrays, so the Python oracle (which reads no Gravitas code) judges the very series the
// kernel's synthetic generator made. Run: node tools/xray-oracle/make-inputs.mjs
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { URL, fileURLToPath } from 'node:url';
import { validateSeries } from '../../js/kernels/xray/contract.js';
import { DIR, limits, orbit, orbitSearch } from '../xray-scenes.mjs';

const ROOT = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..'
);

/** The live bins of a series as the search sees them: midpoints, exposure, total counts. */
export function searchArrays(series) {
  const v = validateSeries(series);
  const t = [];
  const expo = [];
  const counts = [];
  for (let i = 0; i < v.n; i++) {
    if (!v.live[i]) continue;
    t.push(0.5 * (v.start[i] + v.stop[i]));
    expo.push(v.exposure[i]);
    counts.push(v.bandIds.reduce((a, id) => a + v.counts[id][i], 0));
  }
  return { t, expo, counts };
}

export function oracleInputs() {
  const g = limits('B3.glsOracle');
  const { series } = orbit(g.seed, g.label, { amplitude: 0.3 });
  const a = searchArrays(series);
  const lam =
    a.counts.reduce((s, c) => s + c, 0) / a.expo.reduce((s, e) => s + e, 0);
  const s4 = limits('B4.significanceOracle');
  return {
    format: 'gravitas.xray-oracle-inputs/1',
    note: 'written by tools/xray-oracle/make-inputs.mjs from the kernel generator; the oracle reads this and the thresholds, never Gravitas code',
    search: orbitSearch(),
    gls: {
      seed: g.seed,
      frequencies: g.frequencies,
      t: a.t,
      y: a.counts.map((c, i) => c / a.expo[i]),
      dy: a.expo.map(e => Math.sqrt(lam / e)),
      counts: a.counts,
      expo: a.expo,
    },
    significance: s4.seeds.map((seed, k) => {
      const b = searchArrays(
        orbit(seed, s4.label, { amplitude: s4.amplitudes[k] }).series
      );
      return {
        seed,
        amplitude: s4.amplitudes[k],
        t: b.t,
        expo: b.expo,
        counts: b.counts,
      };
    }),
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
