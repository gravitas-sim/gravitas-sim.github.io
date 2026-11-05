#!/usr/bin/env node
// =============================================================================
// The SED kernel's follow-up legs against their committed thresholds (Prompt 245, follow-up)
// -----------------------------------------------------------------------------
//   npm run sed:followup                    print the table
//   npm run sed:followup -- --json          print it as JSON
//   npm run sed:followup -- --write-results rewrite tests/fixtures/sed/followup/results.json
//   npm run sed:followup -- --write-failed  rewrite tests/fixtures/sed/followup/failed-legs.json
//
// tests/fixtures/sed/followup/thresholds.json was committed before any code of the follow-up ran.
// The first gate (tools/sed-validate.mjs, tests/fixtures/sed/thresholds.json) is untouched: its
// failed legs B1, B2, C2, D3 and E1 stay on record, and its verdict stays kernel C. The follow-up
// verdict is computed beside it from the recorded statuses of the first gate and the new rows.
// =============================================================================

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as R from '../js/kernels/radiation/index.js';
import * as K from '../js/kernels/sed/index.js';
import { bands, makeScene, starOf } from './sed-scenes.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR = 'tests/fixtures/sed/followup';
const read = rel => JSON.parse(readFileSync(path.join(ROOT, rel), 'utf8'));
export const THRESHOLDS = read(`${DIR}/thresholds.json`);
const ORACLE = read(`${DIR}/oracle-results.json`);
const FIRST = read('tests/fixtures/sed/results.json');
const AUTH_DIR = path.join(ROOT, 'tests/fixtures/sed/authentic');
const lim = id => THRESHOLDS.checks.find(c => c.id === id).limits;

const sig = (v, d = 4) => (Number.isFinite(v) ? Number(v.toPrecision(d)) : v);
const rel = (a, b) => Math.abs(a - b) / Math.max(Math.abs(b), 1e-300);
const maxOf = a => a.reduce((m, v) => Math.max(m, v), 0);
const C_NM = R.C_LIGHT * 1e9;

/** A band with every interval split at its midpoint, the response interpolated linearly. */
function doubled(band) {
  const lam = [band.lambdaNm[0]];
  const s = [band.s[0]];
  for (let i = 1; i < band.lambdaNm.length; i++) {
    lam.push(0.5 * (band.lambdaNm[i - 1] + band.lambdaNm[i]), band.lambdaNm[i]);
    s.push(0.5 * (band.s[i - 1] + band.s[i]), band.s[i]);
  }
  return { ...band, lambdaNm: Float64Array.from(lam), s: Float64Array.from(s) };
}

/** The kernel's own procedure for a mean f_nu (trapezoid on the given band), Jy. */
function trapMean(band, T) {
  const sed = R.blackbodySed(T);
  const { lambdaNm: l, s } = band;
  let num = 0;
  let den = 0;
  for (let i = 1; i < l.length; i++) {
    const h = l[i] - l[i - 1];
    num +=
      0.5 * (sed(l[i]) * s[i] * l[i] + sed(l[i - 1]) * s[i - 1] * l[i - 1]) * h;
    den += 0.5 * (s[i] / l[i] + s[i - 1] / l[i - 1]) * h;
  }
  return num / (C_NM * den) / R.JY;
}

/** Run the follow-up legs. */
export async function runFollowup({ authDir = AUTH_DIR } = {}) {
  const rows = [];
  const row = (id, pass, measured, note = '') =>
    rows.push({ id, status: pass ? 'pass' : 'fail', measured, note });
  const reported = (id, measured, note = '') =>
    rows.push({ id, status: 'reported', measured, note });
  const cpu0 = process.cpuUsage();

  // ---- B1b ------------------------------------------------------------------------------------
  {
    const L = lim('B1b.abConventions');
    const routes = [];
    for (const c of ORACLE.b1b.flambdaSi)
      routes.push(rel(K.flambdaToJy(c.flux, c.lambdaNm), c.jy));
    for (const c of ORACLE.b1b.flambdaCgs)
      routes.push(
        rel(R.convertFlux(c.flux, 'erg/s/cm2/Angstrom', 'Jy', c.lambdaNm), c.jy)
      );
    const z = R.AB_ZERO_JY / ORACLE.b1b.astropyZeroJy;
    const scaling = ORACLE.b1b.abToJy.map(c =>
      rel(K.abMagToJy(c.mag), c.jy * z)
    );
    const diffMag = 2.5 * Math.log10(z);
    const kernelDiffMag = K.jyToAbMag(ORACLE.b1b.astropyZeroJy); // the kernel's magnitude of astropy's zero-magnitude flux
    const consistent = rel(kernelDiffMag, diffMag) <= L.maxRelReported;
    row(
      'B1b.abConventions',
      maxOf(routes) <= L.maxRel && maxOf(scaling) <= L.maxRel && consistent,
      {
        worstRelativeRoute: sig(maxOf(routes), 3),
        worstRelativeMagnitudeScaling: sig(maxOf(scaling), 3),
        comparisons: routes.length + scaling.length,
        reportedZeroPointRatio: sig(z, 10),
        reportedZeroPointDifferenceRelative: sig(z - 1, 4),
        reportedZeroPointDifferenceMag: sig(diffMag, 4),
        kernelAgreesWithReported: consistent,
        reportedKernelAgreementRelative: sig(rel(kernelDiffMag, diffMag), 3),
        subLegs: {
          fluxRoutes: maxOf(routes) <= L.maxRel ? 'pass' : 'fail',
          magnitudeScaling: maxOf(scaling) <= L.maxRel ? 'pass' : 'fail',
          zeroPointAgreement: consistent ? 'pass' : 'fail',
        },
        astropy: ORACLE.versions.astropy,
        note: 'the 3631 Jy of the tree and the 48.60 mag of astropy differ by the constant ratio above; it is reported, not judged',
      }
    );
  }

  // ---- B2b ------------------------------------------------------------------------------------
  {
    const L = lim('B2b.quadratureErrorRule');
    const worst = { mean: 0, pivot: 0 };
    let count = 0;
    let consistency = 0;
    const tolerances = [];
    for (const T of L.temperaturesK)
      for (const [id, band] of bands) {
        const fine = R.refineBand(band, L.meanRefineNm);
        const h = trapMean(fine, T);
        consistency = Math.max(
          consistency,
          rel(h, R.meanFluxJy(band, R.blackbodySed(T)))
        );
        const h2 = trapMean(doubled(fine), T);
        const tol = Math.max(
          (L.safety * Math.abs(h - h2)) / Math.abs(h),
          L.floor
        );
        const err = rel(
          K.bandIntegratedJy(band, T),
          ORACLE.b2b.mean[String(T)][id]
        );
        worst.mean = Math.max(worst.mean, err / tol);
        tolerances.push(tol);
        count++;
      }
    for (const [id, band] of bands) {
      const p = R.pivotWavelength(band);
      const p2 = R.pivotWavelength(doubled(band));
      const tol = Math.max(
        (L.safety * Math.abs(p - p2)) / Math.abs(p),
        L.floor
      );
      worst.pivot = Math.max(worst.pivot, rel(p, ORACLE.b2b.pivot[id]) / tol);
      tolerances.push(tol);
      count++;
    }
    row(
      'B2b.quadratureErrorRule',
      worst.mean <= 1 && worst.pivot <= 1 && consistency < 1e-12,
      {
        worstMeanErrorOverItsTolerance: sig(worst.mean, 3),
        worstPivotErrorOverItsTolerance: sig(worst.pivot, 3),
        comparisons: count,
        smallestTolerance: sig(Math.min(...tolerances), 3),
        largestTolerance: sig(maxOf(tolerances), 3),
        validatorTrapezoidMatchesKernelTo: sig(consistency, 3),
      }
    );
  }

  // ---- C2b ------------------------------------------------------------------------------------
  {
    const L = lim('C2b.luminosityResidual');
    const distance = { pc: starOf(L.star).distancePc };
    const cover = method => {
      const hit = L.levels.map(() => 0);
      let failed = 0;
      let ratio = 0;
      let basis = K.fitBlackbody(
        makeScene(L.star, L.set, { seed: L.seed, label: L.label }).points,
        { bands }
      ).basis;
      for (let r = 0; r < L.n; r++) {
        const s = makeScene(L.star, L.set, {
          seed: L.seed,
          label: L.label,
          realisation: r,
        });
        const lum = K.bolometricLuminosity(s.points, {
          bands,
          distance,
          includeModelTails: true,
          integration: method,
          draws: L.draws,
          seed: `${L.label}:${r}`,
          levels: L.levels,
          basis,
        });
        if (lum.status !== 'ok') {
          failed++;
          continue;
        }
        ratio += lum.luminosity.watts / s.truth.luminosityW;
        L.levels.forEach((lv, j) => {
          const iv = lum.luminosity.intervals[j];
          if (iv.lo <= s.truth.luminosityW && s.truth.luminosityW <= iv.hi)
            hit[j]++;
        });
      }
      return {
        coverage: hit.map(h => h / L.n),
        failed,
        meanRatio: ratio / (L.n - failed),
      };
    };
    const res = cover('model-residual');
    const chords = cover('chords');
    const worst = [];
    for (const star of L.noiseFree.stars)
      for (const set of L.noiseFree.sets) {
        const s = makeScene(star, set, {
          seed: 245000,
          label: 'C2b',
          noise: false,
        });
        const lum = K.bolometricLuminosity(s.points, {
          bands,
          distance: { pc: starOf(star).distancePc },
          includeModelTails: true,
          integration: 'model-residual',
          draws: 5,
          seed: 'nf',
        });
        worst.push(
          lum.status === 'ok'
            ? rel(lum.luminosity.watts, s.truth.luminosityW)
            : Infinity
        );
      }
    const inBands = res.coverage.every(
      (c, j) => c >= L.bands[j][0] && c <= L.bands[j][1]
    );
    row(
      'C2b.luminosityResidual',
      res.failed === 0 && inBands && maxOf(worst) <= L.noiseFree.maxRel,
      {
        n: L.n,
        draws: L.draws,
        failedRealisations: res.failed,
        coverageResidual: res.coverage.map(c => sig(c, 4)),
        bands: L.bands,
        worstNoiseFreeRelativeError: sig(maxOf(worst), 3),
        reported: {
          coverageChords: chords.coverage.map(c => sig(c, 4)),
          meanRatioResidual: sig(res.meanRatio, 5),
          meanRatioChords: sig(chords.meanRatio, 5),
        },
      }
    );
  }

  // ---- E1b ------------------------------------------------------------------------------------
  {
    const L = lim('E1b.colourVersusPublished');
    const spec = await import('../js/data/spectra/sdssSpectra.js');
    const lamNm = Float64Array.from(
      { length: spec.GRID.count },
      (_, i) => spec.wavelengthAt(i) / 10
    );
    const out = [];
    for (const id of L.spectra) {
      const d = spec.decodeSpectrum(id);
      const sed = R.sedFromSamples(
        lamNm,
        Float64Array.from(d.flux, v =>
          R.convertFlux(v * 1e-17, 'erg/s/cm2/Angstrom', 'W/m2/nm')
        )
      );
      const pts = L.bands.map(b => ({
        id: b,
        kind: 'band-integrated',
        band: b,
        convention: 'ab-mag',
        value: R.abMag(bands.get(b), sed),
        sigma: L.sigmaMag,
      }));
      const fit = K.fitBlackbody(pts, { bands });
      const T = fit.T ? fit.T.value : fit.bestFit?.T;
      const sigmaK = fit.T ? fit.T.sigmaLn * fit.T.value : null;
      out.push({
        spectrum: id,
        subClass: d.subClass,
        status: fit.status,
        colourTemperatureK: sig(T, 5),
        interval68: fit.T
          ? [sig(fit.T.intervals[0].lo, 5), sig(fit.T.intervals[0].hi, 5)]
          : null,
        adequate: fit.adequate,
        pAdequate: sig(fit.p, 3),
        publishedK: d.elodieTEff,
        differenceK: sig(T - d.elodieTEff, 4),
        differenceInSigma: sigmaK ? sig((T - d.elodieTEff) / sigmaK, 3) : null,
        rangeNm: [sig(fit.range.lambdaMinNm, 4), sig(fit.range.lambdaMaxNm, 4)],
        labelStatesColourTemperature:
          /colour temperature/.test(fit.label) && /reddening/.test(fit.label),
      });
    }
    const f = path.join(authDir, 'star.json');
    let authentic =
      'NOT RUN: tests/fixtures/sed/authentic/star.json was not supplied; nothing was fetched';
    if (existsSync(f)) {
      const t = JSON.parse(readFileSync(f, 'utf8'));
      const fit = K.fitBlackbody(t.points, {
        bands,
        allowance: 0.1,
        referenceEpoch: t.referenceEpoch,
        windowDays: 30,
      });
      authentic = {
        status: fit.status,
        colourTemperatureK: sig(fit.T?.value, 5),
        adequate: fit.adequate,
        pAdequate: sig(fit.p, 3),
        publishedK: t.published?.temperature?.value,
        range: fit.range,
      };
    }
    reported(
      'E1b.colourVersusPublished',
      { inTreeStandIn: out, authentic },
      'a blackbody colour temperature is not an effective temperature; the adequacy flag and the label say so; nothing is judged'
    );
  }

  rows.cpuSeconds = sig(
    (process.cpuUsage(cpu0).user + process.cpuUsage(cpu0).system) / 1e6,
    3
  );
  return rows;
}

/** The follow-up verdict beside the first gate's (which stays what it was). */
export function followUpGate(rows) {
  const G = THRESHOLDS.gate.followUpVerdictFunction.kernelLegGroups;
  const status = p => {
    const mine = rows.find(r => r.id.startsWith(`${p}.`));
    return (mine ?? FIRST.rows.find(r => r.id.startsWith(`${p}.`)))?.status;
  };
  const ok = list => list.every(p => status(p) === 'pass');
  const conv = ok(G.conversionLegs);
  const fit = ok(G.fitLegs);
  const lum = ok(G.luminosityLegs);
  return {
    firstGateKernelVerdict: FIRST.gate.kernelVerdict,
    followUpKernelVerdict: conv ? (fit && lum ? 'A' : 'B') : 'C',
    conversions: conv ? 'claimable' : 'not claimable',
    temperature: fit ? 'claimable' : 'not claimable',
    luminosity: fit && lum ? 'claimable' : 'not claimable',
    productVerdict: FIRST.gate.productVerdict,
  };
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const args = process.argv.slice(2);
  const rows = await runFollowup();
  const gate = followUpGate(rows);
  const result = {
    format: 'gravitas.sed-followup-results/1',
    rows: [...rows],
    gate,
    meta: {
      cpuSeconds: rows.cpuSeconds,
      node: process.version,
      oracle: ORACLE.versions,
    },
  };
  if (args.includes('--json'))
    process.stdout.write(`${JSON.stringify(result)}\n`);
  else {
    for (const r of rows)
      console.log(
        `${r.status.toUpperCase().padEnd(8)} ${r.id.padEnd(28)} ${JSON.stringify(r.measured)}${r.note ? `  (${r.note})` : ''}`
      );
    console.log(JSON.stringify(gate, null, 2));
  }
  if (args.includes('--write-results'))
    writeFileSync(
      path.join(ROOT, DIR, 'results.json'),
      `${JSON.stringify(result, null, 1)}\n`
    );
  if (args.includes('--write-failed'))
    writeFileSync(
      path.join(ROOT, DIR, 'failed-legs.json'),
      `${JSON.stringify({ format: 'gravitas.sed-followup-failed-legs/1', note: 'the follow-up legs that crossed a committed bound; they stay failing, only Carl resets a bound', legs: rows.filter(r => r.status === 'fail').map(r => ({ id: r.id, measured: r.measured, note: r.note })) }, null, 1)}\n`
    );
}
