#!/usr/bin/env node
// =============================================================================
// Writes tests/fixtures/ism/oracle-inputs.json (Prompt 247, ISM.md)
// -----------------------------------------------------------------------------
//   node tools/ism-oracle/make-inputs.mjs > tests/fixtures/ism/oracle-inputs.json
//
// The data the independent oracle (oracle.py) reads: the synthetic spectra the generator draws
// (a forward model: arrays and the windows a person would choose by the rule below, never an
// analysis result), 12 wavelength / flux sets for the colour excess with the extinction law's
// coefficient values as data, 12 equivalent widths for the column density, and the decoded A star
// of the in-tree SDSS pack with the fixed windows of E3. Nothing in it is a kernel output.
// Window rule: the line window is the line's centre +- 5 sigma_obs, the continuum windows are
// [6, 12] sigma_obs either side, sigma_obs the line's observed Gaussian width in nm.
// =============================================================================

import process from 'node:process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as K from '../../js/kernels/ism/index.js';
import { FWHM_PER_SIGMA } from '../../js/kernels/spectrograph/lsf.js';
import { LINES } from '../../js/data/radiation/lines.js';
import { LAW } from '../../js/data/radiation/extinction.js';
import {
  SPECTRA,
  decodeSpectrum,
  wavelengths,
} from '../../js/data/spectra/sdssSpectra.js';
import { stream } from '../../js/random/streams.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '../..');
const THR = JSON.parse(
  readFileSync(path.join(ROOT, 'tests/fixtures/ism/thresholds.json'), 'utf8')
);
const SEED = THR.seeds.oracleInputs;
const C_KM_S = 299792.458;
const round = (a, d = 17) => Array.from(a, v => Number(v.toPrecision(d)));

export function windowsFor(centreNm, sigmaNm) {
  return {
    lineWindow: [centreNm - 5 * sigmaNm, centreNm + 5 * sigmaNm],
    continuumWindows: [
      [centreNm - 12 * sigmaNm, centreNm - 6 * sigmaNm],
      [centreNm + 6 * sigmaNm, centreNm + 12 * sigmaNm],
    ],
  };
}

const lsfKmS = R => C_KM_S / R / FWHM_PER_SIGMA;

function caseOf(spec, id, centreNm, sigmaObsNm, halfWidthPx, extra) {
  const lambda = spec.lambdaNm;
  // a slice of 241 samples about the stated centre keeps the file small; both sides read the slice
  const i0 = Math.round(
    (Math.log10(centreNm) - Math.log10(lambda[0])) /
      (Math.log10(lambda[1]) - Math.log10(lambda[0]))
  );
  const lo = Math.max(0, i0 - 120);
  const hi = Math.min(lambda.length - 1, i0 + 120);
  const cut = a => Array.from(a).slice(lo, hi + 1);
  return {
    id,
    lambdaNm: round(cut(lambda)),
    flux: round(cut(spec.flux), 10),
    sigma: round(cut(spec.sigma), 6),
    centreNm,
    sigmaObsNm,
    startIndex:
      (Math.log10(centreNm) - Math.log10(lambda[lo])) /
      (Math.log10(lambda[1]) - Math.log10(lambda[0])),
    halfWidthPx,
    resolvingPower: spec.resolvingPower,
    ...windowsFor(centreNm, sigmaObsNm),
    ...extra,
  };
}

export function build() {
  const draw = stream('forward', SEED, 'cases');
  const u = (a, b) => a + (b - a) * draw();
  const cases = [];
  for (let n = 0; n < 12; n++) {
    const w = K.generateNebula({
      lines: LINES,
      law: LAW,
      seed: `oracle-n-${n}`,
      velocityKmS: u(-300, 300),
      hbetaPeak: u(0.5, 2),
      ebv: u(0.2, 1),
    });
    const t = w.truth.lines.find(l => l.id === 'h-alpha');
    const half = Math.max(
      8,
      Math.ceil(4 / (w.resolvingPower * 1e-4 * Math.LN10))
    );
    cases.push(
      caseOf(w, `nebula-${n}`, t.observedNm, t.sigmaNm, half, {
        world: 'nebula',
        line: 'h-alpha',
      })
    );
  }
  for (let n = 0; n < 12; n++) {
    const off = (draw() < 0.5 ? -1 : 1) * u(60, 120);
    const sv = u(-100, 100);
    const w = K.generateStar({
      lines: LINES,
      seed: `oracle-s-${n}`,
      stellarVelocityKmS: sv,
      ismVelocityKmS: sv + off,
    });
    const broad = n % 2 === 1;
    const id = broad ? 'h-beta' : 'ca2-k';
    const t = w.truth.lines.find(l => l.id === id);
    const sigmaKmS = Math.hypot(t.sigmaIntrinsicKmS, lsfKmS(w.resolvingPower));
    const sigmaObsNm = (t.observedNm * sigmaKmS) / C_KM_S;
    const pxKmS = C_KM_S * Math.LN10 * 1e-4;
    const half = broad
      ? Math.ceil((5 * sigmaKmS) / pxKmS)
      : Math.max(8, Math.ceil(4 / (w.resolvingPower * 1e-4 * Math.LN10)));
    cases.push(
      caseOf(w, `star-${n}`, t.observedNm, sigmaObsNm, half, {
        world: 'star',
        line: id,
      })
    );
  }
  const ebvCases = [];
  const wl = [
    ['h-alpha', 'h-beta'],
    ['h-beta', 'h-gamma'],
    ['h-alpha', 'h-gamma'],
    ['h-alpha', 'h-delta'],
  ];
  for (let n = 0; n < 12; n++) {
    const [a, b] = wl[n % 4];
    ebvCases.push({
      numerator: {
        id: a,
        lambdaNm: LINES.find(l => l.id === a).vacuum,
        flux: u(3, 9),
        sigma: u(0.1, 0.3),
      },
      denominator: {
        id: b,
        lambdaNm: LINES.find(l => l.id === b).vacuum,
        flux: u(1, 3),
        sigma: u(0.05, 0.1),
      },
      intrinsicRatio: u(2.5, 3.5),
      RV: u(2.6, 3.6),
    });
  }
  const columns = Array.from({ length: 12 }, () => ({
    widthNm: u(0.001, 0.05),
    lambdaNm: u(300, 900),
    f: u(0.1, 1.2),
  }));
  const spectrumA = decodeSpectrum('a');
  const lam = Array.from(wavelengths(), x => x / 10);
  const authentic = {
    id: 'sdss-a',
    z: SPECTRA.a.z,
    lambdaNm: round(lam),
    flux: round(spectrumA.flux, 10),
    sigma: null,
    medium: 'vacuum',
    lines: ['h-beta', 'h-gamma', 'h-delta'].map(id => {
      const centreNm = LINES.find(l => l.id === id).vacuum * (1 + SPECTRA.a.z);
      return {
        id,
        centreNm,
        lineWindow: [centreNm - 3, centreNm + 3],
        continuumWindows: [
          [centreNm - 8, centreNm - 5],
          [centreNm + 5, centreNm + 8],
        ],
      };
    }),
  };
  return {
    format: 'gravitas.ism-oracle-inputs/1',
    note: 'forward-model spectra and parameters; no analysis output of the kernel',
    seed: SEED,
    cases,
    ebv: { law: LAW, cases: ebvCases },
    columns,
    authentic,
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url))
  process.stdout.write(`${JSON.stringify(build())}\n`);
