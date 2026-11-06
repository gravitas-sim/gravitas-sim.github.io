#!/usr/bin/env node
// Writes tests/fixtures/clusters/oracle-inputs.json: the invented worlds the independent oracle
// (oracle.py) analyses. The worlds come from the kernel's labelled generators (the oracle checks the
// analysis, not the data), and the kernel's bootstrap radius uncertainty is written in as a declared
// number (amendment AM1 of thresholds.json). Run: node tools/clusters-oracle/make-inputs.mjs
import { writeFileSync, readFileSync } from 'node:fs';
import process from 'node:process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { C_SI, G_SI, PARSEC_M, SOLAR_MASS_KG } from '../../js/constants.js';
import * as K from '../../js/kernels/galaxy/clusters/index.js';
import { levelOfSigma } from '../../js/kernels/statistics/index.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '../..');
const T = JSON.parse(
  readFileSync(
    path.join(ROOT, 'tests/fixtures/clusters/thresholds.json'),
    'utf8'
  )
);
const cosmology = { H0: 70, Om: 0.3, OL: 0.7 };
const tuning = T.checks.find(c => c.id.startsWith('B1.')).limits.tuning;
const LEVELS = [levelOfSigma(1), 0.95];

const worlds = [];
for (let i = 0; i < 30; i++) {
  const contaminated = i >= 15;
  const w = K.clusterWorld({
    seed: T.seeds.B,
    index: i,
    cosmology,
    interloperFraction: contaminated ? 0.3 : 0.02,
  });
  const galaxies = w.galaxies.map(g => ({
    ra: g.ra,
    dec: g.dec,
    z: g.z,
    zErr: g.zErr,
    morph:
      Math.abs((299792.458 * (g.z - w.truth.zc)) / (1 + w.truth.zc)) <
      w.truth.sigma / 2
        ? 'early'
        : 'late',
  }));
  const factor = {
    value: 6.0,
    sigma: 0.9,
    source: 'invented for the test',
    radiusKind: 'half-number',
  };
  const r = K.analyseCluster({
    ...w,
    galaxies,
    factor,
    levels: LEVELS,
    morphology: {
      neighbours: 5,
      classes: ['early'],
      edgesLog10: [-1, 0, 1, 2],
    },
  });
  worlds.push({
    index: i,
    contaminated,
    galaxies,
    centre: w.centre,
    zGuess: w.zGuess,
    apertureMpc: w.aperture.radiusMpc,
    velocityExtentKms: w.velocityExtentKms,
    kappa: 3,
    factor,
    levels: LEVELS,
    declaredSigmaRadiusMpc: r.status === 'ok' ? r.radius.sigmaMpc : null,
    truth: { sigma: w.truth.sigma, zc: w.truth.zc, rt: w.truth.rt },
  });
}

const lightWorlds = [];
for (let i = 0; i < 10; i++) {
  const w = K.clusterWorld({
    seed: `${T.seeds.B}-light`,
    index: i,
    cosmology,
    light: true,
  });
  const members = w.galaxies.filter(g => Number.isFinite(g.mag));
  lightWorlds.push({
    index: i,
    zc: w.truth.zc,
    members: members.map(g => ({
      mag: g.mag,
      magErr: g.magErr,
      k: g.k,
      A: g.A,
    })),
    limitMag: w.light.limitMag,
    solarAbsMag: w.light.solarAbsMag.value,
    massKg: w.truth.massKg,
    massRelSigma: 0.2,
    missing: i % 2 ? { fraction: 0.2, sigma: 0.05 } : null,
  });
}

const binom = [];
for (const n of [1, 2, 5, 10, 30, 100, 400])
  for (const k of new Set([0, 1, Math.floor(n / 2), n - 1, n]))
    if (k >= 0 && k <= n)
      for (const level of LEVELS) binom.push({ k, n, level });

const out = {
  format: 'gravitas.clusters-oracle-inputs/1',
  note: "SYNTHETIC worlds written by tools/clusters-oracle/make-inputs.mjs; constants are the tree's, handed to the oracle (thresholds.json AM1)",
  cosmology,
  constants: { G_SI, C_SI, PARSEC_M, SOLAR_MASS_KG, C_KMS: 299792.458 },
  tuning,
  worlds,
  lightWorlds,
  binom,
};
writeFileSync(
  path.join(ROOT, 'tests/fixtures/clusters/oracle-inputs.json'),
  JSON.stringify(out)
);
process.stdout.write(
  `wrote ${worlds.length} worlds, ${lightWorlds.length} light worlds, ${binom.length} binomial rows\n`
);
