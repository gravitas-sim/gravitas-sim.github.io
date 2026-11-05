#!/usr/bin/env node
// =============================================================================
// The SED kernel against its committed thresholds (Prompt 245)
// -----------------------------------------------------------------------------
//   npm run sed:validate                    print the table
//   npm run sed:validate -- --json          print it as JSON
//   npm run sed:validate -- --write-results rewrite tests/fixtures/sed/results.json
//   npm run sed:validate -- --write-failed  rewrite tests/fixtures/sed/failed-legs.json
//   --only=A1,B1                            run the legs whose id starts with these
//
// tests/fixtures/sed/thresholds.json fixed every bound before js/kernels/sed existed
// (SED.md and SED_GATE.md); this reads the bounds from that file, not from copies. The B rows
// read tests/fixtures/sed/oracle-results.json, which tools/sed-oracle/oracle.py wrote (numpy,
// scipy, astropy; no Gravitas code). A leg whose authentic file was never supplied is NOT RUN
// and says why. The gate's verdicts are computed from the rows by the function committed in the
// thresholds, not read by eye.
// =============================================================================

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as R from '../js/kernels/radiation/index.js';
import * as K from '../js/kernels/sed/index.js';
import {
  DIR,
  THRESHOLDS,
  bands,
  limits as lim,
  makeScene,
  starOf,
  SYN,
} from './sed-scenes.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = rel => JSON.parse(readFileSync(path.join(ROOT, rel), 'utf8'));
const ORACLE = read(`${DIR}/oracle-results.json`);
const AUTH_DIR = path.join(ROOT, DIR, 'authentic');

export { THRESHOLDS };

const sig = (v, d = 4) => (Number.isFinite(v) ? Number(v.toPrecision(d)) : v);
const rel = (a, b) => Math.abs(a - b) / Math.max(Math.abs(b), 1e-300);
const maxOf = a => a.reduce((m, v) => Math.max(m, v), 0);
const range = n => [...Array(n).keys()];

/** The realisations of a scene as raw points, noise off or on. */
const scene = (star, set, o) => makeScene(star, set, o);

/**
 * Run the legs.
 * @param {{only?: string[], authDir?: string}} [opts]
 * @returns {Promise<object[]>} rows {id, status, measured, note}
 */
export async function runValidation({ only = [], authDir = AUTH_DIR } = {}) {
  const rows = [];
  const row = (id, pass, measured, note = '') =>
    rows.push({ id, status: pass ? 'pass' : 'fail', measured, note });
  const reported = (id, measured, note = '') =>
    rows.push({ id, status: 'reported', measured, note });
  const notRun = (id, note) =>
    rows.push({ id, status: 'not-run', measured: null, note });
  const wanted = id => !only.length || only.some(p => id.startsWith(p));
  const cpu0 = process.cpuUsage();
  const baseOpts = { bands };
  const basisCache = new Map();
  /** One basis per point set, shared by every fit of that set. */
  const fitSet = (setKey, points, extra = {}) => {
    const r = K.fitBlackbody(points, {
      ...baseOpts,
      basis: basisCache.get(setKey),
      ...extra,
    });
    if (r.basis) basisCache.set(setKey, r.basis);
    return r;
  };

  // ---- A: analytic and synthetic recovery ------------------------------------------

  if (wanted('A1.')) {
    const L = lim('A1.conversionsClosed');
    const e = {};
    e.ab0 = rel(K.abMagToJy(0), 3631) / L.maxRelAbClosed;
    e.ab5 = rel(K.abMagToJy(5), 3631 / 100) / L.maxRelAbClosed;
    const rt = [];
    const nn = [];
    for (const lam of L.wavelengthsNm)
      for (const f of [1e-3, 1, 3631, 1e5]) {
        rt.push(rel(K.flambdaToJy(K.jyToFlambda(f, lam), lam), f));
        nn.push(
          rel(K.nuFnu(f, lam), K.lambdaFlambda(K.jyToFlambda(f, lam), lam))
        );
      }
    e.roundTrip = maxOf(rt) / L.maxRelRoundTrip;
    e.nuFnu = maxOf(nn) / L.maxRelNuFnu;
    const flat = [];
    const chain = [];
    const sed = R.blackbodySed(5772);
    for (const [, band] of bands) {
      flat.push(Math.abs(R.abMag(band, R.flatFnuSed())));
      if (band.abMinusVega !== null) {
        const mv = R.vegaMag(band, sed);
        chain.push(
          Math.abs(
            K.jyToMag(R.meanFluxJy(band, sed), 'vega-mag', band.abMinusVega) -
              mv
          )
        );
        chain.push(
          Math.abs(
            K.jyToMag(
              K.magToJy(mv, 'vega-mag', band.abMinusVega),
              'vega-mag',
              band.abMinusVega
            ) - mv
          )
        );
      }
    }
    e.flatAb = maxOf(flat) / L.maxAbsFlatAb;
    e.vegaChain = maxOf(chain) / L.maxAbsVegaChain;
    e.mJy = rel(R.convertFlux(1, 'mJy', 'Jy'), 1e-3) / L.maxRelRoundTrip;
    row('A1.conversionsClosed', maxOf(Object.values(e)) <= 1, {
      worstErrorInBounds: sig(maxOf(Object.values(e)), 3),
      perPart: Object.fromEntries(
        Object.entries(e).map(([k, v]) => [k, sig(v, 3)])
      ),
    });
  }

  if (wanted('A2.')) {
    const L = lim('A2.bandIntegratedBox');
    const [l1, l2] = L.boxNm;
    const nodes = range(l2 - l1 + 1).map(i => l1 + i);
    const box = R.decodeBand({
      id: 'box',
      lambdaNm: nodes,
      response: nodes.map(() => 1),
      scale: 1,
    });
    const l0 = 600;
    const closedPivot = Math.sqrt((l2 * l2 - l1 * l1) / 2 / Math.log(l2 / l1));
    const pivotErr = rel(R.pivotWavelength(box), closedPivot);
    const errs = [];
    const diffErrs = [];
    const nonzero = [];
    const zeros = [];
    for (const p of L.exponents) {
      const fnuOf = lam => (l0 / lam) ** p; // Jy
      const sed = lam => (fnuOf(lam) * 1e-26 * R.C_LIGHT * 1e9) / (lam * lam); // W m^-2 nm^-1
      const exact =
        p === 0 ? 1 : (l0 ** p * (l1 ** -p - l2 ** -p)) / p / Math.log(l2 / l1);
      const mean = R.meanFluxJy(box, sed);
      errs.push(rel(mean, exact) / L.maxRel);
      const closedDiff = fnuOf(closedPivot) - exact;
      const kernelDiff = fnuOf(R.pivotWavelength(box)) - mean;
      if (L.differenceMustBeNonzeroFor.includes(p)) {
        diffErrs.push(rel(kernelDiff, closedDiff) / L.maxRelDifference);
        nonzero.push(Math.abs(closedDiff) / exact > 1e-4);
      }
      if (L.differenceZeroFor.includes(p))
        zeros.push(Math.abs(kernelDiff) / mean / L.maxRelZeroDifference);
    }
    row(
      'A2.bandIntegratedBox',
      maxOf(errs) <= 1 &&
        maxOf(diffErrs) <= 1 &&
        nonzero.every(Boolean) &&
        maxOf(zeros) <= 1,
      {
        worstMeanErrorInBounds: sig(maxOf(errs), 3),
        worstDifferenceErrorInBounds: sig(maxOf(diffErrs), 3),
        differenceNonzero: nonzero,
        zeroDifferenceInBounds: sig(maxOf(zeros), 3),
        pivotRelativeError: sig(pivotErr, 3),
      }
    );
  }

  if (wanted('A3.')) {
    const L = lim('A3.blackbodyTotal');
    const [lo, hi] = L.boundsNm;
    const errs = Object.entries(SYN.stars).map(([, s]) => {
      const theta = (s.radiusSolar * R.R_SUN_M) / (s.distancePc * R.PC_M);
      const t = K.modelTails(s.T, theta, lo, hi);
      const mid = K.modelFluxBetween(s.T, theta, lo, hi);
      return rel(
        t.below + mid + t.above,
        R.SIGMA_SB * s.T ** 4 * theta * theta
      );
    });
    row('A3.blackbodyTotal', maxOf(errs) <= L.maxRel, {
      worstRelativeError: sig(maxOf(errs), 3),
    });
  }

  if (wanted('A4.') || wanted('A5.')) {
    const L4 = lim('A4.noiseFreeRecovery');
    const L5 = lim('A5.luminosityRecovery');
    const worst4 = { T: 0, theta: 0, L: 0 };
    const worst5 = { dataOnly: 0, withTails: 0 };
    const detail = [];
    for (const star of L4.stars)
      for (const set of L4.sets) {
        const s = scene(star, set, { seed: 245000, label: 'A4', noise: false });
        const st = starOf(star);
        const fit = fitSet(set, s.points, { distance: { pc: st.distancePc } });
        if (fit.status !== 'ok') {
          worst4.T = Infinity;
          detail.push({ star, set, status: fit.status, code: fit.code });
          continue;
        }
        worst4.T = Math.max(worst4.T, rel(fit.T.value, s.truth.T));
        worst4.theta = Math.max(
          worst4.theta,
          rel(fit.theta.value, s.truth.theta)
        );
        worst4.L = Math.max(
          worst4.L,
          rel(fit.luminosity.watts, s.truth.luminosityW)
        );
        // A5: the integrated SED against an exact quadrature of the truth
        const integ = K.integrateSed(s.points, {
          bands,
          fit,
          includeModelTails: true,
        });
        const { lambdaMinNm: lo, lambdaMaxNm: hi } = integ.bounds;
        const nodes = L5.simpsonNodes;
        const la = Math.log(lo);
        const h = (Math.log(hi) - la) / (nodes - 1);
        let acc = 0;
        for (let k = 0; k < nodes; k++) {
          const lam = Math.exp(la + k * h);
          const w = k === 0 || k === nodes - 1 ? 1 : k % 2 ? 4 : 2;
          acc +=
            w *
            Math.PI *
            R.planckLambda(lam * 1e-9, st.T) *
            1e-9 *
            s.truth.theta ** 2 *
            lam;
        }
        const exactData = (acc * h) / 3;
        const eData = rel(integ.dataFluxWm2, exactData);
        const eTot = rel(integ.totalFluxWm2, s.truth.totalFluxWm2);
        worst5.dataOnly = Math.max(worst5.dataOnly, eData);
        worst5.withTails = Math.max(worst5.withTails, eTot);
        detail.push({
          star,
          set,
          dataOnly: sig(eData, 3),
          withTails: sig(eTot, 3),
        });
      }
    if (wanted('A4.'))
      row(
        'A4.noiseFreeRecovery',
        worst4.T <= L4.maxRelT &&
          worst4.theta <= L4.maxRelTheta &&
          worst4.L <= L4.maxRelL,
        {
          worstRelativeT: sig(worst4.T, 3),
          worstRelativeTheta: sig(worst4.theta, 3),
          worstRelativeL: sig(worst4.L, 3),
        }
      );
    if (wanted('A5.'))
      row(
        'A5.luminosityRecovery',
        worst5.dataOnly <= L5.maxRelDataOnly &&
          worst5.withTails <= L5.maxRelWithTails,
        {
          worstDataOnly: sig(worst5.dataOnly, 3),
          worstWithTails: sig(worst5.withTails, 3),
          cases: detail.filter(d => d.dataOnly !== undefined),
        }
      );
  }

  // ---- B: the independent oracle --------------------------------------------------------

  if (wanted('B1.')) {
    const L = lim('B1.astropyConversions');
    const errs = [];
    for (const c of ORACLE.b1.flambdaSi)
      errs.push(rel(K.flambdaToJy(c.flux, c.lambdaNm), c.jy));
    for (const c of ORACLE.b1.flambdaCgs)
      errs.push(
        rel(R.convertFlux(c.flux, 'erg/s/cm2/Angstrom', 'Jy', c.lambdaNm), c.jy)
      );
    for (const c of ORACLE.b1.abToJy) errs.push(rel(K.abMagToJy(c.mag), c.jy));
    row('B1.astropyConversions', maxOf(errs) <= L.maxRel, {
      worstRelativeError: sig(maxOf(errs), 3),
      comparisons: errs.length,
      astropy: ORACLE.versions.astropy,
    });
  }

  if (wanted('B2.')) {
    const L = lim('B2.bandMeanOracle');
    const means = [];
    for (const T of L.temperaturesK)
      for (const [id, band] of bands)
        means.push(rel(K.bandIntegratedJy(band, T), ORACLE.b2[String(T)][id]));
    const pivots = [...bands].map(([id, band]) =>
      rel(R.pivotWavelength(band), ORACLE.pivots[id])
    );
    row(
      'B2.bandMeanOracle',
      maxOf(means) <= L.maxRel && maxOf(pivots) <= L.maxRelPivot,
      {
        worstRelativeMean: sig(maxOf(means), 3),
        worstRelativePivot: sig(maxOf(pivots), 3),
        comparisons: means.length + pivots.length,
      }
    );
  }

  if (wanted('B3.')) {
    const L = lim('B3.fitOracle');
    const errs = { T: 0, theta: 0, chi2: 0, interval: 0 };
    const detail = [];
    for (const [k, c] of L.cases.entries()) {
      const s = scene(c.star, c.set, { seed: c.seed, label: c.label });
      const fit = fitSet(c.set, s.points, { levels: L.levels });
      const o = ORACLE.b3[k];
      if (fit.status !== 'ok') {
        errs.T = Infinity;
        detail.push({ label: c.label, status: fit.status });
        continue;
      }
      errs.T = Math.max(errs.T, rel(fit.T.value, o.T));
      errs.theta = Math.max(errs.theta, rel(fit.theta.value, o.theta));
      errs.chi2 = Math.max(errs.chi2, rel(fit.chi2, o.chi2));
      for (const [j, iv] of fit.T.intervals.entries())
        errs.interval = Math.max(
          errs.interval,
          rel(iv.lo, o.intervals[j].lo),
          rel(iv.hi, o.intervals[j].hi)
        );
      detail.push({
        label: c.label,
        T: sig(fit.T.value, 6),
        oracleT: sig(o.T, 6),
      });
    }
    row(
      'B3.fitOracle',
      errs.T <= L.maxRelT &&
        errs.theta <= L.maxRelTheta &&
        errs.chi2 <= L.maxRelChi2 &&
        errs.interval <= L.maxRelIntervalEnd,
      {
        worst: Object.fromEntries(
          Object.entries(errs).map(([k, v]) => [k, sig(v, 3)])
        ),
        cases: detail,
        oracle: ORACLE.versions,
      }
    );
  }

  if (wanted('B4.')) {
    const L = lim('B4.integralOracle');
    const dataErrs = [];
    for (const [k, c] of lim('B3.fitOracle').cases.entries()) {
      const s = scene(c.star, c.set, { seed: c.seed, label: c.label });
      const integ = K.integrateSed(s.points, { bands });
      dataErrs.push(rel(integ.dataFluxWm2, ORACLE.b4.data[k].fluxWm2));
    }
    const tailErrs = [];
    const [lo, hi] = L.boundsNm;
    for (const t of ORACLE.b4.tails) {
      const theta =
        (SYN.stars[t.key].radiusSolar * R.R_SUN_M) /
        (SYN.stars[t.key].distancePc * R.PC_M);
      const k = K.modelTails(t.T, theta, lo, hi);
      tailErrs.push(
        rel(k.below, t.below),
        rel(k.above, t.above),
        rel(K.modelFluxBetween(t.T, theta, lo, hi), t.between)
      );
    }
    row(
      'B4.integralOracle',
      maxOf(dataErrs) <= L.maxRelData && maxOf(tailErrs) <= L.maxRelTails,
      {
        worstRelativeData: sig(maxOf(dataErrs), 3),
        worstRelativeTails: sig(maxOf(tailErrs), 3),
      }
    );
  }

  if (wanted('B5.')) {
    const f = path.join(authDir, 'tool-fit.json');
    if (!existsSync(f))
      notRun(
        'B5.citedTool',
        'tests/fixtures/sed/authentic/tool-fit.json was not supplied (SED_GATE.md, Files requested from Carl); nothing was fetched'
      );
    else {
      const t = JSON.parse(readFileSync(f, 'utf8'));
      const fit = K.fitBlackbody(t.points, baseOpts);
      const L = lim('B5.citedTool');
      const sigma = Math.hypot(
        fit.T?.sigmaLn * fit.T?.value,
        t.temperature.sigma
      );
      row(
        'B5.citedTool',
        fit.status === 'ok' &&
          Math.abs(fit.T.value - t.temperature.value) <=
            L.maxCombinedSigma * sigma,
        {
          kernelT: fit.T?.value,
          toolT: t.temperature.value,
          combinedSigma: sig(sigma, 3),
          tool: t.tool,
        }
      );
    }
  }

  // ---- C: coverage on fixed seeded ensembles --------------------------------------------

  const covered = (fit, truthT, level) => {
    const iv = fit.T?.intervals?.find(i => Math.abs(i.level - level) < 1e-9);
    return Boolean(iv && iv.lo <= truthT && truthT <= iv.hi);
  };

  if (wanted('C1.')) {
    const L = lim('C1.coverageTemperature');
    const hit = L.levels.map(() => 0);
    for (let r = 0; r < L.n; r++) {
      const s = scene(L.star, L.set, {
        seed: L.seed,
        label: L.label,
        realisation: r,
      });
      const fit = fitSet(L.set, s.points, { levels: L.levels });
      L.levels.forEach((lv, j) => {
        if (covered(fit, s.truth.T, lv)) hit[j]++;
      });
    }
    const cov = hit.map(h => h / L.n);
    row(
      'C1.coverageTemperature',
      cov.every((c, j) => c >= L.bands[j][0] && c <= L.bands[j][1]),
      {
        n: L.n,
        coverage: cov.map(c => sig(c, 4)),
        bands: L.bands,
      }
    );
  }

  if (wanted('C2.')) {
    const L = lim('C2.coverageLuminosity');
    const hit = L.levels.map(() => 0);
    let failed = 0;
    fitSet(
      L.set,
      scene(L.star, L.set, { seed: L.seed, label: L.label }).points
    ); // builds the shared basis once
    for (let r = 0; r < L.n; r++) {
      const s = scene(L.star, L.set, {
        seed: L.seed,
        label: L.label,
        realisation: r,
      });
      const lum = K.bolometricLuminosity(s.points, {
        bands,
        distance: { pc: starOf(L.star).distancePc },
        includeModelTails: true,
        draws: L.draws,
        seed: `${L.label}:${r}`,
        levels: L.levels,
        basis: basisCache.get(L.set),
      });
      if (lum.status !== 'ok') {
        failed++;
        continue;
      }
      L.levels.forEach((lv, j) => {
        const iv = lum.luminosity.intervals[j];
        if (iv.lo <= s.truth.luminosityW && s.truth.luminosityW <= iv.hi)
          hit[j]++;
      });
    }
    const cov = hit.map(h => h / L.n);
    row(
      'C2.coverageLuminosity',
      failed === 0 &&
        cov.every((c, j) => c >= L.bands[j][0] && c <= L.bands[j][1]),
      {
        n: L.n,
        draws: L.draws,
        failedRealisations: failed,
        coverage: cov.map(c => sig(c, 4)),
        bands: L.bands,
      }
    );
  }

  if (wanted('C3.') || wanted('C4.')) {
    const L = lim('C3.coverageNonsimultaneous');
    const hitW = L.levels.map(() => 0);
    const hitU = L.levels.map(() => 0);
    let inadW = 0;
    let inadU = 0;
    for (let r = 0; r < L.n; r++) {
      const s = scene(L.star, L.set, {
        seed: L.seed,
        label: L.label,
        realisation: r,
        nonsimultaneous: true,
      });
      const wide = fitSet(L.set, s.points, {
        levels: L.levels,
        allowance: SYN.epochs.allowance,
        referenceEpoch: SYN.epochs.reference,
        windowDays: SYN.epochs.windowDays,
      });
      const bare = fitSet(L.set, s.points, { levels: L.levels });
      L.levels.forEach((lv, j) => {
        if (covered(wide, s.truth.T, lv)) hitW[j]++;
        if (covered(bare, s.truth.T, lv)) hitU[j]++;
      });
      if (wide.adequate === false) inadW++;
      if (bare.adequate === false) inadU++;
    }
    const covW = hitW.map(h => h / L.n);
    const covU = hitU.map(h => h / L.n);
    if (wanted('C3.'))
      row(
        'C3.coverageNonsimultaneous',
        covW.every((c, j) => c >= L.bands[j][0] && c <= L.bands[j][1]),
        {
          n: L.n,
          coverage: covW.map(c => sig(c, 4)),
          bands: L.bands,
          flaggedInadequate: sig(inadW / L.n, 3),
        }
      );
    if (wanted('C4.'))
      reported(
        'C4.unwidenedCoverage',
        {
          n: L.n,
          coverageWithoutWidening: covU.map(c => sig(c, 4)),
          coverageWithWidening: covW.map(c => sig(c, 4)),
          flaggedInadequateWithout: sig(inadU / L.n, 3),
          flaggedInadequateWith: sig(inadW / L.n, 3),
        },
        'not judged: it shows what the widening rule changes'
      );
  }

  // ---- D: refusals and negative cases ---------------------------------------------------

  if (wanted('D1.')) {
    const L = lim('D1.twoPoints');
    const noiseFree = { seed: 245000, label: 'D1', noise: false };
    const all = [
      ...scene(L.star, 'optical-nir', noiseFree).points,
      ...scene(L.star, 'sdss-2mass', noiseFree).points,
    ];
    const byId = ids => ids.map(id => all.find(p => p.id === id));
    const two = L.twoSets.map(ids => K.fitBlackbody(byId(ids), baseOpts));
    const mono = scene(L.star, 'with-mir', noiseFree).points.filter(
      p => p.id === 'M1' || p.id === 'M2'
    );
    const twoMono = K.fitBlackbody(mono, baseOpts);
    const three = K.fitBlackbody(byId(L.threeIds), baseOpts);
    const twoOk = [...two, twoMono].every(
      r =>
        r.status === 'not-constrained' &&
        r.code === 'too-few-points' &&
        r.T === undefined
    );
    row(
      'D1.twoPoints',
      twoOk && three.status === 'ok' && three.dof === L.expectedDofForThree,
      {
        twoPoints: [...two, twoMono].map(r => `${r.status}:${r.code}`),
        three: { status: three.status, code: three.code, dof: three.dof },
      }
    );
  }

  if (wanted('D2.')) {
    const L = lim('D2.refusals');
    const noBands = new Map([
      ...bands,
      ['Vnull', { ...bands.get('V'), id: 'Vnull', abMinusVega: null }],
    ]);
    const code = p => K.normalizePoint(p, noBands).code;
    const good = (id, extra = {}) => ({
      id,
      kind: 'monochromatic',
      lambdaNm: 1000,
      convention: 'Jy',
      value: 1,
      sigma: 0.03,
      ...extra,
    });
    const got = [
      code({
        id: 'x',
        kind: 'band-integrated',
        band: 'V',
        value: 12,
        sigma: 0.02,
      }),
      code({
        id: 'x',
        kind: 'band-integrated',
        band: 'V',
        convention: 'STmag',
        value: 12,
        sigma: 0.02,
      }),
      code({
        id: 'x',
        kind: 'band-integrated',
        band: 'Nope',
        convention: 'ab-mag',
        value: 12,
        sigma: 0.02,
      }),
      code({
        id: 'x',
        kind: 'band-integrated',
        band: 'Vnull',
        convention: 'vega-mag',
        value: 12,
        sigma: 0.02,
      }),
      code({
        id: 'x',
        kind: 'band-integrated',
        band: 'V',
        convention: 'W/m2/nm',
        value: 1e-14,
        sigma: 1e-16,
      }),
      code({
        id: 'x',
        kind: 'monochromatic',
        convention: 'Jy',
        value: 1,
        sigma: 0.03,
      }),
      code(good('x', { value: -1 })),
      code({
        id: 'x',
        kind: 'band-integrated',
        band: 'V',
        convention: 'ab-mag',
        value: NaN,
        sigma: 0.02,
      }),
      code(good('x', { sigma: 0 })),
      code(good('x', { sigma: -1 })),
      code(good('x', { sigma: NaN })),
      code(good('x', { sigma: 0.6 })),
    ];
    const ok3 = [
      good('a', { lambdaNm: 500 }),
      good('b', { lambdaNm: 1000, value: 2 }),
      good('c', { lambdaNm: 2000, value: 1.5 }),
    ];
    const reference = K.fitBlackbody(ok3, { ...baseOpts, allowance: 0.1 });
    got.push(reference.code);
    const named = K.fitBlackbody(
      [...ok3, good('bad', { value: -3 })],
      baseOpts
    );
    const namesTheId = named.status === 'refused' && named.id === 'bad';
    row(
      'D2.refusals',
      JSON.stringify(got) === JSON.stringify(L.expected) && namesTheId,
      { codes: got, namesTheRefusedId: namesTheId }
    );
  }

  if (wanted('D3.')) {
    const L = lim('D3.rayleighJeansOnly');
    let refused = 0;
    let constrained = 0;
    for (let r = 0; r < L.n; r++) {
      const s = scene(L.star, L.set, {
        seed: L.seed,
        label: L.label,
        realisation: r,
      });
      const f = fitSet(L.set, s.points);
      if (f.status === 'not-constrained' && f.code === 'temperature-open')
        refused++;
      const c = scene(L.star, L.control, {
        seed: L.seed,
        label: `${L.label}c`,
        realisation: r,
      });
      if (fitSet(L.control, c.points).status === 'ok') constrained++;
    }
    row(
      'D3.rayleighJeansOnly',
      refused / L.n >= L.minRefused &&
        constrained / L.n >= L.minControlConstrained,
      {
        n: L.n,
        refusedShare: sig(refused / L.n, 3),
        controlConstrainedShare: sig(constrained / L.n, 3),
      }
    );
  }

  if (wanted('D4.')) {
    const L = lim('D4.excessFlagged');
    let flagged = 0;
    for (let r = 0; r < L.n; r++) {
      const s = scene(L.star, L.set, {
        seed: L.seed,
        label: L.label,
        realisation: r,
        excess: true,
      });
      if (fitSet(L.set, s.points).adequate === false) flagged++;
    }
    let falseAlarm = 0;
    for (let r = 0; r < L.controlN; r++) {
      const s = scene(L.star, L.set, {
        seed: L.seed,
        label: `${L.label}c`,
        realisation: r,
      });
      if (fitSet(L.set, s.points).adequate === false) falseAlarm++;
    }
    row(
      'D4.excessFlagged',
      flagged / L.n >= L.minFlagged &&
        falseAlarm / L.controlN <= L.maxControlFlagged,
      {
        flaggedShare: sig(flagged / L.n, 3),
        controlFlaggedShare: sig(falseAlarm / L.controlN, 3),
        n: L.n,
        controlN: L.controlN,
      }
    );
  }

  if (wanted('D5.')) {
    const L = lim('D5.extrapolationLabels');
    const s = scene(L.star, L.set, { seed: 245000, label: 'D5', noise: false });
    const fit = fitSet(L.set, s.points);
    const inside = K.evaluateModel(fit.model, 1000);
    const outside = L.outsideNm.map(l => K.evaluateModel(fit.model, l));
    const plain = K.integrateSed(s.points, { bands, fit });
    const withT = K.integrateSed(s.points, {
      bands,
      fit,
      includeModelTails: true,
    });
    const frac =
      (withT.tails.belowWm2 + withT.tails.aboveWm2) / withT.totalFluxWm2;
    const [lo, hi] = fit.model.rangeNm;
    const ok =
      inside.extrapolated === false &&
      outside.every(o => o.extrapolated === true) &&
      plain.tails === null &&
      plain.totalFluxWm2 === null &&
      withT.tails.extrapolated === true &&
      rel(frac, withT.extrapolatedFraction) <= L.maxRelFraction &&
      withT.bounds.lambdaMinNm === lo &&
      withT.bounds.lambdaMaxNm === hi;
    row('D5.extrapolationLabels', ok, {
      insideExtrapolated: inside.extrapolated,
      outsideExtrapolated: outside.map(o => o.extrapolated),
      plainTails: plain.tails,
      tailsLabelled: withT.tails.extrapolated,
      extrapolatedFraction: sig(withT.extrapolatedFraction, 4),
    });
  }

  if (wanted('D6.')) {
    const L = lim('D6.wideningRule');
    const raw = L.epochs.map((e, i) => ({
      id: `p${i}`,
      kind: 'monochromatic',
      lambdaNm: 1000 + i,
      convention: 'Jy',
      value: 1,
      sigma: 0.03,
      epoch: e,
    }));
    const norm = K.normalizePoints(raw, bands);
    const w = K.applyNonsimultaneity(norm.points, {
      allowance: L.allowance,
      referenceEpoch: L.reference,
      windowDays: L.windowDays,
    });
    const flags = w.points.map(p => p.nonsimultaneous);
    const errs = w.points.map(p => {
      const expected = p.nonsimultaneous
        ? Math.sqrt(p.sigmaLn ** 2 + L.allowance ** 2)
        : p.sigmaLn;
      return Math.abs(p.sigmaLnEff - expected);
    });
    const none = K.applyNonsimultaneity(norm.points, {});
    row(
      'D6.wideningRule',
      JSON.stringify(flags) === JSON.stringify(L.expectedFlagged) &&
        maxOf(errs) <= L.maxAbs &&
        none.widening.assumesSimultaneous === true,
      {
        flagged: flags,
        worstAbsoluteError: sig(maxOf(errs), 3),
        noAllowance: none.widening,
      }
    );
  }

  // ---- E: authentic data ----------------------------------------------------------------

  if (wanted('E0.')) {
    const f = path.join(authDir, 'SOURCES.json');
    if (!existsSync(f))
      notRun(
        'E0.rightsPerSource',
        'no catalogue terms page was saved and read in this session; every catalogue row is rights basis C and nothing of it ships (SED_GATE.md, D-R10-245-02)'
      );
    else
      notRun(
        'E0.rightsPerSource',
        "SOURCES.json arrived but the per-source decision is Carl's to record (a register row), not a computed leg"
      );
  }

  if (wanted('E1.')) {
    const f = path.join(authDir, 'star.json');
    if (!existsSync(f))
      notRun(
        'E1.authenticStar',
        'tests/fixtures/sed/authentic/star.json was not supplied (SED_GATE.md, Files requested from Carl); nothing was fetched'
      );
    else {
      const t = JSON.parse(readFileSync(f, 'utf8'));
      const L = lim('E1.authenticStar');
      const fit = K.fitBlackbody(t.points, {
        bands,
        allowance: SYN.epochs.allowance,
        referenceEpoch: t.referenceEpoch,
        windowDays: SYN.epochs.windowDays,
      });
      const sigma = Math.hypot(
        fit.T?.sigmaLn * fit.T?.value,
        t.published.temperature.sigma
      );
      row(
        'E1.authenticStar',
        fit.status === 'ok' &&
          Math.abs(fit.T.value - t.published.temperature.value) <=
            L.maxCombinedSigma * sigma,
        {
          kernelT: fit.T?.value,
          publishedT: t.published.temperature.value,
          combinedSigma: sig(sigma, 3),
          adequate: fit.adequate,
          range: fit.range,
        }
      );
    }
  }

  if (wanted('E2.')) {
    const L = lim('E2.sdssSpectrumPhotometry');
    const spec = await import('../js/data/spectra/sdssSpectra.js');
    const nSamples = spec.GRID.count;
    const lamNm = Float64Array.from(
      { length: nSamples },
      (_, i) => spec.wavelengthAt(i) / 10
    );
    const out = [];
    for (const id of L.spectra) {
      const d = spec.decodeSpectrum(id);
      const fl = Float64Array.from(d.flux, v =>
        R.convertFlux(v * 1e-17, 'erg/s/cm2/Angstrom', 'W/m2/nm')
      );
      const sed = R.sedFromSamples(lamNm, fl);
      const inside = L.bands.filter(b => {
        const band = bands.get(b);
        return (
          band.lambdaNm[0] >= lamNm[0] &&
          band.lambdaNm[band.lambdaNm.length - 1] <= lamNm[nSamples - 1]
        );
      });
      const pts = [];
      const diff = {};
      for (const b of inside) {
        const band = bands.get(b);
        const m = R.abMag(band, sed);
        pts.push({
          id: b,
          kind: 'band-integrated',
          band: b,
          convention: 'ab-mag',
          value: m,
          sigma: L.sigmaMag,
        });
        const piv = R.pivotWavelength(band);
        diff[b] = sig(
          R.abMag(band, sed) - K.jyToAbMag(K.flambdaToJy(sed(piv), piv)),
          3
        );
      }
      const fit = K.fitBlackbody(pts, baseOpts);
      out.push({
        spectrum: id,
        subClass: d.subClass,
        pipelineTeffK: d.elodieTEff,
        bandsUsed: inside,
        status: fit.status,
        code: fit.code,
        colourTemperatureK: fit.T
          ? sig(fit.T.value, 5)
          : sig(fit.bestFit?.T, 5),
        interval68: fit.T?.intervals?.[0]
          ? [sig(fit.T.intervals[0].lo, 5), sig(fit.T.intervals[0].hi, 5)]
          : null,
        pAdequate: sig(fit.p, 3),
        bandMinusPivotAbMag: diff,
      });
    }
    reported(
      'E2.sdssSpectrumPhotometry',
      out,
      'points derived from one spectrum are not independent measurements; the angular radius is not reported because the spectra are not flux calibrated in absolute terms'
    );
  }

  if (wanted('E3.')) {
    const f = path.join(authDir, 'star-sdss-row.json');
    if (!existsSync(f))
      notRun(
        'E3.catalogColoursVsSpectrum',
        'tests/fixtures/sed/authentic/star-sdss-row.json was not supplied (SED_GATE.md, Files requested from Carl); nothing was fetched'
      );
    else
      reported(
        'E3.catalogColoursVsSpectrum',
        {
          file: 'arrived',
          note: 'colour comparison is computed by the analysis the file names',
        },
        'no bound is committed'
      );
  }

  const cpu = process.cpuUsage(cpu0);
  rows.cpuSeconds = sig((cpu.user + cpu.system) / 1e6, 3);
  return rows;
}

/** The gate's verdicts, computed from the rows by the function committed in the thresholds. */
export function gateFrom(rows) {
  const G = THRESHOLDS.gate.verdictFunction.kernelLegGroups;
  const st = p => rows.find(r => r.id.startsWith(`${p}.`))?.status;
  const ok = list => list.every(p => st(p) === 'pass');
  const conv = ok(G.conversionLegs);
  const fit = ok(G.fitLegs);
  const lum = ok(G.luminosityLegs);
  const e1 = st('E1');
  return {
    kernelVerdict: conv ? (fit && lum ? 'A' : 'B') : 'C',
    conversions: conv ? 'claimable' : 'not claimable',
    temperature: fit ? 'claimable' : 'not claimable',
    luminosity: fit && lum ? 'claimable' : 'not claimable',
    productVerdict:
      e1 === 'pass'
        ? 'ESTABLISHED'
        : 'NOT ESTABLISHED (E0, E1 and B5 NOT RUN: no catalogue file was supplied, every catalogue row is basis C)',
  };
}

const isMain =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  const args = process.argv.slice(2);
  const only = (args.find(a => a.startsWith('--only=')) ?? '')
    .slice(7)
    .split(',')
    .filter(Boolean);
  const rows = await runValidation({ only });
  const cpuSeconds = rows.cpuSeconds;
  const gate = gateFrom(rows);
  const result = {
    format: 'gravitas.sed-results/1',
    rows: [...rows],
    gate,
    meta: { cpuSeconds, node: process.version, oracle: ORACLE.versions },
  };
  if (args.includes('--json'))
    process.stdout.write(`${JSON.stringify(result)}\n`);
  else {
    for (const r of rows)
      console.log(
        `${r.status.toUpperCase().padEnd(8)} ${r.id.padEnd(30)} ${JSON.stringify(r.measured)}${r.note ? `  (${r.note})` : ''}`
      );
    console.log(JSON.stringify(gate, null, 2));
    console.log(`cpu ${cpuSeconds} s`);
  }
  if (args.includes('--write-results') && !only.length)
    writeFileSync(
      path.join(ROOT, DIR, 'results.json'),
      `${JSON.stringify({ ...result, meta: { ...result.meta } }, null, 1)}\n`
    );
  if (args.includes('--write-failed') && !only.length) {
    const failed = rows.filter(r => r.status === 'fail');
    writeFileSync(
      path.join(ROOT, DIR, 'failed-legs.json'),
      `${JSON.stringify({ format: 'gravitas.sed-failed-legs/1', note: 'the legs that crossed a committed bound; they stay failing, only Carl resets a bound', legs: failed.map(r => ({ id: r.id, measured: r.measured, note: r.note })) }, null, 1)}\n`
    );
  }
}
