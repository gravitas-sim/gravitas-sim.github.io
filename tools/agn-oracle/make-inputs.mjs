#!/usr/bin/env node
// =============================================================================
// Writes tests/fixtures/agn/oracle-inputs.json (Prompt 252, AGN.md)
// -----------------------------------------------------------------------------
//   node tools/agn-oracle/make-inputs.mjs > tests/fixtures/agn/oracle-inputs.json
//
// The data the independent oracle (oracle.py) reads: eight noisy synthetic quasar spectra, the noise-free template,
// ten noisy sinusoidal light curves, six noisy narrow-line spectra, 3000 random flux sets and 3000 random (x, y)
// points for the BPT legs, and the lists of masses, luminosities, cosmologies and redshifts (a forward model: the
// flux and error arrays and the stated grids, never an analysis result). Nothing in the file is a kernel output.
// =============================================================================

import process from 'node:process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as A from '../../js/kernels/agn/index.js';
import { LINES } from '../../js/data/radiation/lines.js';
import { stream } from '../../js/random/streams.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '../..');
const THR = JSON.parse(
  readFileSync(path.join(ROOT, 'tests/fixtures/agn/thresholds.json'), 'utf8')
);
const SEED = THR.seeds.oracleInputs;
const round = (a, d = 9) => Array.from(a, v => Number(v.toPrecision(d)));
const lim = id => THR.checks.find(c => c.id === id).limits;

export function build() {
  const draw = stream('forward', SEED, 'cases');
  const u = (a, b) => a + (b - a) * draw();
  const quasars = [];
  for (let i = 0; i < 8; i++) {
    const z = Number(u(0.1, 2.4).toFixed(4));
    const snr = Number(u(8, 20).toFixed(2));
    const w = A.generateQuasar({ lines: LINES, z, snr, seed: `oracle-q${i}` });
    quasars.push({
      id: `quasar${i}`,
      forwardZ: z,
      snr,
      flux: round(w.flux),
      sigmaPixel: w.truth.sigmaPixel,
    });
  }
  const tpl = A.quasarTemplate({ lines: LINES });
  const curves = [];
  for (let i = 0; i < 10; i++) {
    const c = A.generateSinusoidCurve({
      amplitude: Number(u(0.2, 0.9).toFixed(3)),
      periodDays: Number(u(20, 200).toFixed(2)),
      epochs: 60,
      relativeError: Number(u(0.005, 0.02).toFixed(4)),
      seed: `oracle-c${i}`,
      phase: Number(u(0, 6.2831853).toFixed(4)),
    });
    curves.push({
      id: `curve${i}`,
      t: round(c.t),
      flux: round(c.flux),
      sigma: round(c.sigma),
    });
  }
  const narrow = [];
  for (let i = 0; i < 6; i++) {
    const z = Number(u(0.03, 0.25).toFixed(4));
    const x = Number(u(-1.2, 0.2).toFixed(3));
    const y = Number(u(-0.4, 0.8).toFixed(3));
    const w = A.generateNarrowLines({
      lines: LINES,
      z,
      x,
      y,
      hAlphaFlux: Number(u(1.5, 3).toFixed(3)),
      snr: Number(u(8, 14).toFixed(2)),
      seed: `oracle-n${i}`,
    });
    narrow.push({
      id: `narrow${i}`,
      z,
      flux: round(w.flux),
      sigmaPixel: w.truth.sigmaPixel,
      restNm: w.truth.restNm,
    });
  }
  const bl = lim('B4.bptOracle');
  const bd = stream('forward', SEED, 'bpt');
  const ub = (a, b) => a + (b - a) * bd();
  const fluxSets = [];
  for (let i = 0; i < bl.nFluxSets; i++) {
    const s = {};
    for (const k of ['ha', 'hb', 'n', 'o']) {
      const flux = 10 ** ub(-1, 1);
      s[k] = {
        flux: Number(flux.toPrecision(8)),
        sigma: Number((flux / ub(5, 40)).toPrecision(8)),
      };
    }
    fluxSets.push(s);
  }
  const points = [];
  for (let i = 0; i < bl.nPoints; i++)
    points.push([
      Number(ub(bl.xRange[0], bl.xRange[1]).toPrecision(10)),
      Number(ub(bl.yRange[0], bl.yRange[1]).toPrecision(10)),
    ]);
  return {
    format: 'gravitas.agn-oracle-inputs/1',
    note: 'forward-model spectra, light curves, templates, grids and random draws only: no analysis output (no redshift, class, time scale, luminosity or mass) is in this file',
    seed: SEED,
    grid: {
      log10Start: A.QUASAR_WORLD.log10Start,
      log10Step: A.QUASAR_WORLD.log10Step,
      samples: A.QUASAR_WORLD.samples,
      resolvingPower: A.QUASAR_WORLD.resolvingPower,
    },
    templateGrid: {
      log10Start: A.QUASAR_WORLD.templateLog10Start,
      log10Step: A.QUASAR_WORLD.log10Step,
      samples: A.QUASAR_WORLD.templateSamples,
    },
    narrowGrid: {
      log10Start: A.NARROW_WORLD.log10Start,
      log10Step: A.NARROW_WORLD.log10Step,
      samples: A.NARROW_WORLD.samples,
      resolvingPower: A.NARROW_WORLD.resolvingPower,
    },
    zRange: THR.worlds.quasar.zRange,
    highPassWindow: A.QSO_HIGH_PASS_WINDOW,
    template: { flux: round(tpl.flux), resolvingPower: tpl.resolvingPower },
    quasars,
    curves,
    narrow,
    bpt: { curves: A.INVENTED_BPT_CURVES.curves, fluxSets, points },
    timescale: { nSigma: A.N_SIGMA, kGuard: A.K_GUARD, tiny: A.TINY },
    eddington: {
      massesSolar: lim('A1.eddingtonClosedForm').masses,
      luminositiesW: [1e30, 3.3e36, 1e38, 5e39, 2.7e41],
    },
    cosmologies: THR.worlds.cosmologies,
    distanceZs: lim('B2.distanceOracle').zs,
    fluxWM2: 1e-14,
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url))
  process.stdout.write(`${JSON.stringify(build())}\n`);
