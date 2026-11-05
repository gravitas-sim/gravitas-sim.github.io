#!/usr/bin/env node
// =============================================================================
// The HI spectroscopy kernel against its committed thresholds (Prompt 241)
// -----------------------------------------------------------------------------
//   npm run radio:validate                    print the table
//   npm run radio:validate -- --json          print it as JSON
//   npm run radio:validate -- --write-results rewrite tests/fixtures/radio/results.json
//   npm run radio:validate -- --write-failed  rewrite tests/fixtures/radio/failed-legs.json
//   --only=A1,B1                              run the legs whose id starts with these
//
// tests/fixtures/radio/thresholds.json fixed every bound before js/kernels/radio
// existed (RADIO.md, "Validation contract"). This reads the bounds from that file,
// not from copies. The B rows read tests/fixtures/radio/oracle-results.json, which
// tools/radio-oracle/oracle.py wrote (numpy, scipy, astropy; no Gravitas code).
// A leg whose authentic file was never supplied is NOT RUN and says why.
// =============================================================================

import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import * as K from '../js/kernels/radio/index.js';
import { lnGamma } from '../js/kernels/statistics/special.js';
import { gaussian, stream } from '../js/random/streams.js';
import { b4Spectra, b5Spectrum } from './radio-oracle/make-inputs.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR = 'tests/fixtures/radio';
const read = rel => JSON.parse(readFileSync(path.join(ROOT, rel), 'utf8'));
export const THRESHOLDS = read(`${DIR}/thresholds.json`);
const ORACLE = read(`${DIR}/oracle-results.json`);
const INPUTS = read(`${DIR}/oracle-inputs.json`);
const lim = id => THRESHOLDS.checks.find(c => c.id === id).limits;
const SYN = THRESHOLDS.synthetic;
const SEEDS = THRESHOLDS.seeds;
const UNC = THRESHOLDS.uncertainty;

const sig = (v, d = 4) => (Number.isFinite(v) ? Number(v.toPrecision(d)) : v);
const maxOf = a => a.reduce((m, v) => Math.max(m, v), 0);
const median = a => {
  const s = [...a].sort((x, y) => x - y);
  return s.length % 2
    ? s[(s.length - 1) / 2]
    : 0.5 * (s[s.length / 2 - 1] + s[s.length / 2]);
};
const R0 = SYN.r0Kpc;
const TH0 = SYN.theta0KmS;
const curveOf = name =>
  K.worldCurve({ theta0: TH0, r0: R0, rc: SYN.rcKpc, alpha: SYN.alphas[name] });
const WORLDS = SYN.worlds.map(w => {
  const [curveName, sv] = w.split(':');
  return { id: w, curveName, sigmaV: Number(sv) };
});

/** The analysis options every leg shares: the world's own R0, Theta0 and LSR. */
const baseOptions = (s, extra = {}) => ({
  l: s.truth.l,
  frequencyHz: s.frequencyHz,
  temperature: s.temperature,
  r0: R0,
  theta0: TH0,
  sigmaV: s.truth.sigmaV,
  shapeTerm: UNC.tauShape,
  lsr: SYN.lsrTruth,
  ...extra,
});

/** The golden-section maximum of f on [a, b]. */
function golden(f, a, b, tol = 1e-10) {
  const g = (Math.sqrt(5) - 1) / 2;
  let c = b - g * (b - a);
  let d = a + g * (b - a);
  let fc = f(c);
  let fd = f(d);
  while (b - a > tol) {
    if (fc > fd) {
      b = d;
      d = c;
      fd = fc;
      c = b - g * (b - a);
      fc = f(c);
    } else {
      a = c;
      c = d;
      fc = fd;
      d = a + g * (b - a);
      fd = f(d);
    }
  }
  const x = 0.5 * (a + b);
  return { x, value: f(x) };
}

const throwsCode = (fn, code) => {
  try {
    fn();
  } catch (e) {
    return e?.code === code;
  }
  return false;
};

/**
 * Run the legs.
 * @param {{only?: string[]}} [opts]
 * @returns {object[]} rows {id, status, measured, note}
 */
export function runValidation({ only = [] } = {}) {
  const rows = [];
  const row = (id, pass, measured, note = '') =>
    rows.push({ id, status: pass ? 'pass' : 'fail', measured, note });
  const reported = (id, measured, note = '') =>
    rows.push({ id, status: 'reported', measured, note });
  const notRun = (id, note) =>
    rows.push({ id, status: 'not-run', measured: null, note });
  const wanted = id => !only.length || only.some(p => id.startsWith(p));
  const cpu0 = process.cpuUsage();

  // The noise-free spectra of every world and mask longitude, made once.
  const cleanCache = new Map();
  const clean = (world, l) => {
    const key = `${world.id}|${l}`;
    if (!cleanCache.has(key))
      cleanCache.set(
        key,
        K.generateSpectrum({
          l,
          curveName: world.curveName,
          sigmaV: world.sigmaV,
        })
      );
    return cleanCache.get(key);
  };

  // ---- A1: the Doppler scale ---------------------------------------------------------

  if (wanted('A1.')) {
    const L = lim('A1.doppler');
    const [lo, hi] = L.range;
    let rt = 0;
    let ident = 0;
    for (let i = 0; i < L.velocities; i++) {
      const v = lo + ((hi - lo) * i) / (L.velocities - 1);
      const f = K.frequencyFromVelocity(v);
      const back = K.velocityFromFrequency(f);
      rt = Math.max(rt, Math.abs(back - v) / Math.max(Math.abs(v), 1));
      const vo = K.velocityFromFrequency(f, { convention: 'optical' });
      ident = Math.max(
        ident,
        Math.abs(vo - v - (v * v) / (K.C_KMS - v))
      );
    }
    const f0 = K.HI_LINE.restFrequencyHz;
    const zero = K.velocityFromFrequency(f0);
    const recedes = K.velocityFromFrequency(f0 - 1e6) > 0;
    const at = (v, convention) =>
      K.velocityFromFrequency(K.frequencyFromVelocity(v), { convention });
    const ordered =
      at(300, 'relativistic') > at(300, 'radio') &&
      at(300, 'relativistic') < at(300, 'optical');
    const spread = maxOf(
      ['optical', 'relativistic'].map(c => Math.abs(at(L.smallV, c) - L.smallV))
    );
    row(
      'A1.doppler',
      rt <= L.maxRoundTripRel &&
        ident <= L.maxOpticalIdentityKmS &&
        zero === 0 &&
        recedes &&
        ordered &&
        spread <= L.smallVSpreadKmS,
      {
        maxRoundTripRel: rt,
        maxOpticalIdentityKmS: ident,
        zeroAtRest: zero === 0,
        lowerFrequencyIsPositive: recedes,
        relativisticBetween: ordered,
        smallVSpreadKmS: spread,
      }
    );
  }

  // ---- A2: the LSR transform ---------------------------------------------------------

  if (wanted('A2.')) {
    const L = lim('A2.lsr');
    const [U, V, W] = L.schonrich;
    const e = [
      Math.abs(K.lsrShift(0, 0) - U),
      Math.abs(K.lsrShift(90, 0) - V),
      Math.abs(K.lsrShift(0, 90) - W),
    ];
    const lZero = (Math.atan2(-U, V) * 180) / Math.PI;
    e.push(Math.abs(K.lsrShift(lZero, 0)));
    let round = 0;
    for (let i = 0; i < 40; i++) {
      const v = -250 + 12.5 * i;
      const l = 9 * i;
      const b = -60 + 3 * i;
      const there = K.heliocentricToLsr(v, l, b, 'schonrich');
      round = Math.max(round, Math.abs(K.lsrToHeliocentric(there.v, l, b, 'schonrich').v - v));
    }
    const s = K.LSR_OPTIONS.schonrich;
    const t = K.LSR_OPTIONS.stromberg;
    const optionsOk =
      s.U === U &&
      s.V === V &&
      s.W === W &&
      t.V === L.strombergV &&
      t.U === U &&
      t.W === W &&
      K.lsrShift(33, 5, 'none') === 0;
    const named =
      K.heliocentricToLsr(10, 30, 0, 'stromberg').lsr.name === 'stromberg' &&
      Number.isFinite(K.heliocentricToLsr(10, 30, 0, 'stromberg').shift);
    const refused = throwsCode(() => K.resolveLsr('galactic'), 'lsr-option');
    row(
      'A2.lsr',
      maxOf(e) <= L.maxShiftErrorKmS &&
        round <= 1e-12 &&
        optionsOk &&
        named &&
        refused,
      {
        maxShiftError: maxOf(e),
        longitudeOfZeroShift: lZero,
        roundTrip: round,
        optionsOk,
        named,
        unknownRefused: refused,
      }
    );
  }

  // ---- A3: geometry ------------------------------------------------------------------

  if (wanted('A3.')) {
    const L = lim('A3.geometry');
    let flatErr = 0;
    let flatGeo = 0;
    const flat = () => TH0;
    for (const l of K.MASK_LONGITUDES) {
      const vt = K.terminalVelocity({ l, curve: flat, r0: R0, theta0: TH0 });
      const s = Math.sign(Math.sin((l * Math.PI) / 180));
      flatErr = Math.max(
        flatErr,
        Math.abs(vt - s * TH0 * (1 - Math.abs(Math.sin((l * Math.PI) / 180))))
      );
      const g = K.tangentGeometry(l, R0);
      flatGeo = Math.max(
        flatGeo,
        Math.abs(g.radius - R0 * Math.abs(Math.sin((l * Math.PI) / 180))),
        Math.abs(g.distance - R0 * Math.cos((l * Math.PI) / 180))
      );
    }
    let vErr = 0;
    let dErr = 0;
    let thetaErr = 0;
    for (const name of ['flat', 'rising', 'falling']) {
      const curve = curveOf(name);
      for (const l of K.MASK_LONGITUDES) {
        const side = K.sideOf(l);
        const dt = R0 * Math.cos((l * Math.PI) / 180);
        const best = golden(
          d => side * K.losVelocity({ l, d, curve, r0: R0, theta0: TH0 }),
          0.01,
          2 * dt,
          1e-10
        );
        const vt = K.terminalVelocity({ l, curve, r0: R0, theta0: TH0 });
        vErr = Math.max(vErr, Math.abs(side * best.value - vt));
        dErr = Math.max(dErr, Math.abs(best.x - dt));
        const g = K.tangentGeometry(l, R0);
        thetaErr = Math.max(
          thetaErr,
          Math.abs(K.circularSpeedFromTerminal(vt, l, TH0) - curve(g.radius))
        );
      }
    }
    const suitable = ['flat', 'rising', 'falling'].every(n =>
      K.curveIsSuitable(curveOf(n), R0)
    );
    const solidBodyFails = !K.curveIsSuitable(R => L.solidBodySlope * R, R0);
    row(
      'A3.geometry',
      flatErr <= L.maxVelocityErrorKmS &&
        flatGeo <= 1e-12 &&
        vErr <= L.maxVelocityErrorKmS &&
        dErr <= L.maxDistanceErrorKpc &&
        thetaErr <= L.maxVelocityErrorKmS &&
        suitable &&
        solidBodyFails,
      {
        flatTerminalError: flatErr,
        flatGeometryError: flatGeo,
        scanVelocityError: vErr,
        scanDistanceError: dErr,
        thetaFromTerminalError: thetaErr,
        worldCurvesSuitable: suitable,
        solidBodyRefused: solidBodyFails,
      }
    );
  }

  // ---- A4: refusals of the geometry ----------------------------------------------------

  if (wanted('A4.')) {
    const L = lim('A4.refusals');
    const codes = (list, b = 0) => list.map(l => K.maskRefusal(l, b)?.code);
    const noTangent = codes(L.noTangent).every(c => c === 'no-tangent-point');
    const outside = codes(L.outside).every(c => c === 'outside-mask');
    const badB = K.maskRefusal(30, L.badLatitude)?.code === 'outside-mask';
    const accepted = K.MASK_LONGITUDES.every(l => K.maskRefusal(l, 0) === null);
    const sameMask =
      JSON.stringify(K.MASK.firstQuadrant) ===
        JSON.stringify(SYN.mask.firstQuadrantDeg) &&
      JSON.stringify(K.MASK.fourthQuadrant) ===
        JSON.stringify(SYN.mask.fourthQuadrantDeg) &&
      K.MASK.firstQuadrant.length === 10 &&
      K.MASK.fourthQuadrant.length === 10;
    row(
      'A4.refusals',
      noTangent && outside && badB && accepted && sameMask,
      { noTangent, outside, badLatitude: badB, maskAccepted: accepted, sameMask }
    );
  }

  // ---- A5: the column density ------------------------------------------------------------

  if (wanted('A5.')) {
    const L = lim('A5.columnThin');
    const s = clean({ id: 'flat:5', curveName: 'flat', sigmaV: 5 }, L.lDeg);
    const col = K.columnDensityThin({
      velocity: s.velocityHelio,
      temperature: s.temperature,
    });
    const rel = Math.abs(col.columnCm2 / s.truth.columnCm2 - 1);
    const twice = K.generateSpectrum({
      l: L.lDeg,
      curveName: 'flat',
      sigmaV: 5,
      densityCm3: 2 * SYN.gas.thinDensityCm3,
    });
    const colTwice = K.columnDensityThin({
      velocity: twice.velocityHelio,
      temperature: twice.temperature,
    });
    const dbl = Math.abs(colTwice.columnCm2 / col.columnCm2 - 2) / 2;
    const a = K.generateSpectrum({ l: L.lDeg, curveName: 'flat', sigmaV: 2 });
    const b = K.generateSpectrum({
      l: L.lDeg,
      curveName: 'flat',
      sigmaV: 2,
      channels: 1251,
      widthKmS: 0.4,
    });
    const ia = K.integratedLine(a.velocityHelio, a.temperature);
    const ib = K.integratedLine(b.velocityHelio, b.temperature);
    const width = Math.abs(ia / ib - 1);
    row(
      'A5.columnThin',
      rel <= L.maxRel && dbl <= L.doubling && width <= L.maxRel,
      {
        relativeToGenerator: rel,
        doubling: dbl,
        channelWidthPair: width,
        coefficient: K.COLUMN_COEFFICIENT,
      }
    );
  }

  // ---- A6: the universal edge ------------------------------------------------------------

  if (wanted('A6.')) {
    const L = lim('A6.edgeShape');
    const g0 = K.edgeProfile(0);
    const exact = (2 ** -0.75 * Math.exp(lnGamma(0.25))) / Math.sqrt(2 * Math.PI);
    const e = K.universalEdge(L.f);
    let positive = true;
    let sign = [];
    let prev = null;
    for (let x = -6; x <= 6.0001; x += 0.25) {
      const gx = K.edgeProfile(x);
      if (!(gx > 0)) positive = false;
      if (prev !== null) sign.push(Math.sign(gx - prev));
      prev = gx;
    }
    // one rise then one fall about x_pk
    const flips = sign.reduce((n, s, i) => (i && s !== sign[i - 1] ? n + 1 : n), 0);
    const increasing =
      K.universalEdge(0.8).cf < K.universalEdge(0.5).cf &&
      K.universalEdge(0.5).cf < K.universalEdge(0.2).cf;
    const half = Math.abs(K.edgeProfile(e.cf) / e.gPeak - L.f);
    row(
      'A6.edgeShape',
      Math.abs(g0 / exact - 1) <= L.maxRelG0 &&
        positive &&
        flips === 1 &&
        e.xPeak < 0 &&
        increasing &&
        e.cf > L.cfRange[0] &&
        e.cf < L.cfRange[1] &&
        half <= L.halfTol,
      {
        g0RelError: Math.abs(g0 / exact - 1),
        xPeak: e.xPeak,
        cf: e.cf,
        halfError: half,
        profilePositive: positive,
        sign_changes: flips,
        cfIncreasingInOneMinusF: increasing,
      }
    );
  }

  // ---- A7: recovery on narrow lines --------------------------------------------------------

  if (wanted('A7.')) {
    const L = lim('A7.recoveryNarrow');
    let worst = 0;
    let refused = 0;
    let n = 0;
    for (const curveName of L.curves)
      for (const l of L.longitudes) {
        const s = K.generateSpectrum({
          l,
          curveName,
          sigmaV: SYN.narrow.sigmaVKmS,
          channels: SYN.narrow.count,
          widthKmS: SYN.narrow.widthKmSAtRest,
        });
        const r = K.tangentPoint(baseOptions(s, { sigmaNoise: 0 }));
        n++;
        if (r.status !== 'ok') {
          refused++;
          continue;
        }
        worst = Math.max(worst, Math.abs(r.theta - s.truth.circularSpeedAtTangent));
      }
    row('A7.recoveryNarrow', worst <= L.maxErrorKmS && refused === 0, {
      spectra: n,
      maxErrorKmS: worst,
      refused,
    });
  }

  // ---- A8: the LSR choice moves the answer by an exact amount -------------------------------

  if (wanted('A8.')) {
    const L = lim('A8.lsrShift');
    const w = WORLDS.find(x => x.id === L.world);
    const sch = K.LSR_OPTIONS.schonrich;
    const str = K.LSR_OPTIONS.stromberg;
    let worst = 0;
    let altWorst = 0;
    const used = [];
    for (const l of K.MASK_LONGITUDES) {
      const s = K.withNoise(clean(w, l), THRESHOLDS.synthetic.noiseK, SEEDS.ensemble, 'a8', l);
      const r1 = K.tangentPoint(baseOptions(s, { lsr: 'schonrich' }));
      const r2 = K.tangentPoint(baseOptions(s, { lsr: 'stromberg' }));
      if (r1.status !== 'ok' || r2.status !== 'ok') continue;
      used.push(l);
      const lr = (l * Math.PI) / 180;
      const side = K.sideOf(l);
      const expected =
        side > 0
          ? (str.U - sch.U) * Math.cos(lr) + (str.V - sch.V) * Math.sin(lr)
          : -(str.U - sch.U) * Math.cos(lr) + (str.V - sch.V) * Math.abs(Math.sin(lr));
      worst = Math.max(worst, Math.abs(r2.theta - r1.theta - expected));
      const alt = r1.lsrAlternatives.find(a => a.option === 'stromberg');
      altWorst = Math.max(altWorst, Math.abs(alt.theta - r2.theta));
    }
    row('A8.lsrShift', worst <= L.maxErrorKmS && altWorst <= L.maxErrorKmS && used.length >= 16, {
      longitudesUsed: used.length,
      maxErrorKmS: worst,
      alternativesErrorKmS: altWorst,
    });
  }

  // ---- B1: Doppler against astropy ------------------------------------------------------------

  if (wanted('B1.')) {
    const L = lim('B1.dopplerOracle');
    const D = ORACLE.doppler;
    let ev = 0;
    let ef = 0;
    for (const conv of K.CONVENTIONS) {
      D.frequencyHz.forEach((f, i) => {
        ev = Math.max(
          ev,
          Math.abs(K.velocityFromFrequency(f, { convention: conv }) - D.vFromF[conv][i])
        );
        ef = Math.max(
          ef,
          Math.abs(K.frequencyFromVelocity(D.velocityKmS[i], { convention: conv }) / D.fFromV[conv][i] - 1)
        );
      });
    }
    row('B1.dopplerOracle', ev <= L.maxVelocityErrorKmS && ef <= L.maxFrequencyRel && D.frequencyHz.length === L.frequencies, {
      frequencies: D.frequencyHz.length,
      maxVelocityErrorKmS: ev,
      maxFrequencyRel: ef,
      astropy: ORACLE.tools.astropy,
    });
  }

  // ---- B2: the line of sight against numpy and scipy ---------------------------------------------

  if (wanted('B2.')) {
    const L = lim('B2.losOracle');
    let ev = 0;
    let et = 0;
    for (const c of ORACLE.los) {
      const curve = curveOf(c.curve);
      c.d.forEach((d, i) => {
        ev = Math.max(ev, Math.abs(K.losVelocity({ l: c.l, d, curve, r0: R0, theta0: TH0 }) - c.v[i]));
      });
      et = Math.max(et, Math.abs(K.terminalVelocity({ l: c.l, curve, r0: R0, theta0: TH0 }) - c.terminal));
    }
    row('B2.losOracle', ev <= L.maxVelocityErrorKmS && et <= L.maxTerminalErrorKmS, {
      cases: ORACLE.los.length,
      maxVelocityErrorKmS: ev,
      maxTerminalErrorKmS: et,
    });
  }

  // ---- B3: the forward model against numpy ---------------------------------------------------------

  if (wanted('B3.')) {
    const L = lim('B3.spectrumOracle');
    let thin = 0;
    let thick = 0;
    for (const o of ORACLE.spectra.thin) {
      const w = WORLDS.find(x => x.id === o.world);
      const s = clean(w, o.l);
      const peak = Math.max(...o.T);
      thin = Math.max(thin, maxOf(s.temperature.map((t, i) => Math.abs(t - o.T[i]))) / peak);
    }
    for (const o of ORACLE.spectra.thick) {
      const set = SYN.opacity[o.setting];
      const s = K.generateSpectrum({
        l: o.l,
        curveName: o.curve,
        sigmaV: 5,
        densityCm3: set.densityCm3,
        spinTemperatureK: set.spinTemperatureK,
      });
      const peak = Math.max(...o.T);
      thick = Math.max(thick, maxOf(s.temperature.map((t, i) => Math.abs(t - o.T[i]))) / peak);
    }
    row('B3.spectrumOracle', thin <= L.maxThinOfPeak && thick <= L.maxThickOfPeak, {
      thinSpectra: ORACLE.spectra.thin.length,
      thickSpectra: ORACLE.spectra.thick.length,
      maxThinOfPeak: thin,
      maxThickOfPeak: thick,
    });
  }

  // ---- B4: the analysis against numpy ----------------------------------------------------------------

  if (wanted('B4.')) {
    const L = lim('B4.analysisOracle');
    // The analysis runs on the very arrays the oracle read (pinned in oracle-inputs.json); that the generator
    // still makes them is checked separately, to 1e-9 of each peak, because Math.pow differs in the last place
    // between Node versions and an exact hash would fail on a correct build.
    const mine = INPUTS.b4;
    const regen = b4Spectra();
    const regenDiff = maxOf(
      regen.map(
        (s, i) =>
          maxOf(s.temperature.map((t, j) => Math.abs(t - mine[i].temperature[j]))) /
          Math.max(...mine[i].temperature)
      )
    );
    const same = regenDiff <= 1e-9;
    let ev = 0;
    let ew = 0;
    let codes = true;
    const ch = SYN.channels;
    mine.forEach((s, i) => {
      const o = ORACLE.analysis[i];
      const freq = K.channelFrequencies({ count: ch.count, widthKmS: ch.widthKmSAtRest });
      const r = K.tangentPoint({
        l: s.l,
        frequencyHz: freq,
        temperature: s.temperature,
        r0: R0,
        theta0: TH0,
        sigmaTheta0: UNC.sigmaTheta0KmS,
        sigmaV: s.sigmaV,
        sigmaSigmaV: UNC.sigmaSigmaVFraction * s.sigmaV,
        lsr: 'schonrich',
        shapeTerm: UNC.tauShape,
      });
      if (r.status !== o.status || (r.code ?? undefined) !== (o.code ?? undefined)) {
        codes = false;
        return;
      }
      if (r.status !== 'ok') return;
      ev = Math.max(
        ev,
        Math.abs(r.edge.xOut - o.xOut),
        Math.abs(r.edge.xEdge - o.xEdge),
        Math.abs(r.terminalVelocity.lsr * r.side - o.xTerminal),
        Math.abs(r.theta - o.theta)
      );
      ew = Math.max(
        ew,
        Math.abs((r.interval68.hi - r.interval68.lo) / 2 / o.half68 - 1),
        Math.abs((r.interval95.hi - r.interval95.lo) / 2 / o.half95 - 1)
      );
    });
    row(
      'B4.analysisOracle',
      same && codes && mine.length === L.spectra && ev <= L.maxVelocityErrorKmS && ew <= L.maxWidthRel,
      { spectra: mine.length, regeneratedWithin1e9OfPeak: same, regeneratedMaxOfPeak: regenDiff, codesAgree: codes, maxVelocityErrorKmS: ev, maxWidthRel: ew }
    );
  }

  // ---- B5: the column coefficient ------------------------------------------------------------------------

  if (wanted('B5.')) {
    const L = lim('B5.columnOracle');
    const O = ORACLE.column;
    const mine = INPUTS.b5;
    const regen = b5Spectrum();
    const regenDiff =
      maxOf(regen.temperature.map((t, j) => Math.abs(t - mine.temperature[j]))) /
      Math.max(...mine.temperature);
    const same = regenDiff <= 1e-9;
    const freq = K.channelFrequencies({ count: SYN.channels.count, widthKmS: SYN.channels.widthKmSAtRest });
    const v = freq.map(f => K.velocityFromFrequency(f));
    const col = K.columnDensityThin({ velocity: v, temperature: mine.temperature });
    const cRel = Math.abs(K.COLUMN_COEFFICIENT / O.coefficient - 1);
    const nRel = Math.abs(col.columnCm2 / O.columnCm2 - 1);
    row('B5.columnOracle', same && cRel <= L.maxCoefficientRel && nRel <= L.maxColumnRel, {
      regeneratedWithin1e9OfPeak: same,
      regeneratedMaxOfPeak: regenDiff,
      coefficientRel: cRel,
      columnRel: nRel,
    });
  }

  // ---- B6: the universal edge against scipy --------------------------------------------------------------

  if (wanted('B6.')) {
    const L = lim('B6.edgeShapeOracle');
    const e = K.universalEdge(ORACLE.edge.f);
    const dx = Math.abs(e.xPeak - ORACLE.edge.xPeak);
    const dc = Math.abs(e.cf - ORACLE.edge.cf);
    const dg = Math.abs(e.gPeak / ORACLE.edge.gPeak - 1);
    row('B6.edgeShapeOracle', dx <= L.maxXError && dc <= L.maxXError && dg <= L.maxValueRel, {
      peakPositionError: dx,
      cfError: dc,
      peakValueRel: dg,
      minimizeScalarPeakDifference: Math.abs(ORACLE.edge.minimizeScalarPeak - ORACLE.edge.xPeak),
    });
  }

  if (wanted('B7.'))
    notRun(
      'B7.publishedTangent',
      'no tangent-velocity table was read (RADIO_DATA_GATE.md row 05 is C); the oracle of record is the independent implementation of B2 to B6'
    );

  // ---- C: coverage ---------------------------------------------------------------------------------------

  const ensemble = ({ id, noiseSeed, analystSeed, wrongTheta0 }) => {
    const L = lim(id);
    const reps = lim('C1.coverage').realisations;
    let n = 0;
    let in68 = 0;
    let in95 = 0;
    let refusedAllowed = 0;
    let refusedOther = 0;
    const errs = [];
    const widths = [];
    const byQuad = { 1: { n: 0, k: 0 }, '-1': { n: 0, k: 0 } };
    const bySigma = {};
    const share = { noise: 0, channel: 0, dispersion: 0, shape: 0, theta0: 0 };
    for (const w of WORLDS)
      for (const l of K.MASK_LONGITUDES) {
        const base = clean(w, l);
        for (let rep = 0; rep < reps; rep++) {
          const s = K.withNoise(base, THRESHOLDS.synthetic.noiseK, noiseSeed, w.id, l, rep);
          const draw = gaussian(stream('forward', analystSeed, w.id, l, rep));
          const sv = w.sigmaV * (1 + UNC.sigmaSigmaVFraction * draw());
          const th0 = wrongTheta0 ? TH0 + UNC.sigmaTheta0KmS * draw() : TH0;
          const r = K.tangentPoint({
            ...baseOptions(s, { sigmaV: sv, theta0: th0 }),
            sigmaSigmaV: UNC.sigmaSigmaVFraction * sv,
            sigmaTheta0: wrongTheta0 ? UNC.sigmaTheta0KmS : 0,
          });
          if (r.status !== 'ok') {
            const rule = lim('C1.coverage').refusalRule;
            if (
              r.code === rule.allowedCode &&
              Math.abs(s.truth.terminalVelocityLsr) < rule.truthTerminalOverAssumedSigmaVMax * sv
            )
              refusedAllowed++;
            else refusedOther++;
            continue;
          }
          n++;
          const truth = s.truth.circularSpeedAtTangent;
          const e = r.theta - truth;
          errs.push(Math.abs(e));
          widths.push((r.interval68.hi - r.interval68.lo) / 2);
          const k68 = truth >= r.interval68.lo && truth <= r.interval68.hi;
          const k95 = truth >= r.interval95.lo && truth <= r.interval95.hi;
          if (k68) in68++;
          if (k95) in95++;
          byQuad[r.side].n++;
          if (k68) byQuad[r.side].k++;
          const b = (bySigma[w.sigmaV] ??= { n: 0, k: 0, err: [] });
          b.n++;
          if (k68) b.k++;
          b.err.push(Math.abs(e));
          const tot = r.sigma * r.sigma;
          for (const key of Object.keys(share)) share[key] += (r.terms[key] * r.terms[key]) / tot;
        }
      }
    return { L, n, in68, in95, refusedAllowed, refusedOther, errs, widths, byQuad, bySigma, share };
  };

  if (wanted('C1.') || wanted('C3.') || wanted('C2.')) {
    const e1 = ensemble({
      id: 'C1.coverage',
      noiseSeed: SEEDS.noiseC1,
      analystSeed: SEEDS.analystSigmaC1,
      wrongTheta0: false,
    });
    const f68 = e1.in68 / e1.n;
    const f95 = e1.in95 / e1.n;
    if (wanted('C1.'))
      row(
        'C1.coverage',
        f68 >= e1.L.band68[0] &&
          f68 <= e1.L.band68[1] &&
          f95 >= e1.L.band95[0] &&
          f95 <= e1.L.band95[1] &&
          e1.refusedOther === 0,
        {
          intervals: e1.n,
          coverage68: sig(f68),
          coverage95: sig(f95),
          refusedByE7: e1.refusedAllowed,
          refusedOther: e1.refusedOther,
        }
      );
    if (wanted('C3.'))
      reported('C3.coverageDetail', {
        coverage68ByQuadrant: {
          first: sig(e1.byQuad[1].k / e1.byQuad[1].n),
          fourth: sig(e1.byQuad['-1'].k / e1.byQuad['-1'].n),
        },
        coverage68ByGasDispersion: Object.fromEntries(
          Object.entries(e1.bySigma).map(([k, v]) => [k, sig(v.k / v.n)])
        ),
        medianAbsErrorKmS: sig(median(e1.errs)),
        medianAbsErrorByGasDispersionKmS: Object.fromEntries(
          Object.entries(e1.bySigma).map(([k, v]) => [k, sig(median(v.err))])
        ),
        medianHalfWidth68KmS: sig(median(e1.widths)),
        varianceShare: Object.fromEntries(
          Object.entries(e1.share).map(([k, v]) => [k, sig(v / e1.n, 3)])
        ),
      });
    if (wanted('C2.')) {
      const e2 = ensemble({
        id: 'C2.coverageTheta0',
        noiseSeed: SEEDS.noiseC2,
        analystSeed: SEEDS.analystSigmaC2,
        wrongTheta0: true,
      });
      const g68 = e2.in68 / e2.n;
      const g95 = e2.in95 / e2.n;
      row(
        'C2.coverageTheta0',
        g68 >= e2.L.band68[0] &&
          g68 <= e2.L.band68[1] &&
          g95 >= e2.L.band95[0] &&
          g95 <= e2.L.band95[1] &&
          e2.refusedOther === 0,
        {
          intervals: e2.n,
          coverage68: sig(g68),
          coverage95: sig(g95),
          refusedByE7: e2.refusedAllowed,
          refusedOther: e2.refusedOther,
        }
      );
    }
  }

  // ---- D1: refusals -----------------------------------------------------------------------------------------

  if (wanted('D1.')) {
    const L = lim('D1.refusals');
    const w = { id: 'flat:5', curveName: 'flat', sigmaV: 5 };
    const base = clean(w, 30);
    const noise = K.withNoise(
      { ...base, temperature: base.temperature.map(() => 0) },
      THRESHOLDS.synthetic.noiseK,
      SEEDS.ensemble,
      'd1',
      L.noiseOnlySeedOffset
    );
    const rNoise = K.tangentPoint(baseOptions(noise));
    const wide = K.generateSpectrum({
      l: L.wideLongitudeDeg,
      curveName: 'flat',
      sigmaV: L.wideSigmaVKmS,
    });
    const rWide = K.tangentPoint(baseOptions(wide, { sigmaNoise: 0 }));
    const shifted = base.frequencyHz.map(f => f + 5e9);
    const rAxis = K.tangentPoint(baseOptions(base, { frequencyHz: shifted }));
    const nan = base.temperature.slice();
    nan[40] = NaN;
    const rNan = K.tangentPoint(baseOptions(base, { temperature: nan }));
    const swapped = base.frequencyHz.slice();
    [swapped[100], swapped[101]] = [swapped[101], swapped[100]];
    const rOrder = K.tangentPoint(baseOptions(base, { frequencyHz: swapped }));
    const rMissing = ['sigmaV', 'r0', 'theta0'].map(k =>
      K.tangentPoint(baseOptions(base, { [k]: undefined }))
    );
    const all = [rNoise, rWide, rAxis, rNan, rOrder, ...rMissing];
    const expected = [
      'edge-not-significant',
      'edge-not-separable',
      'axis',
      'bad-spectrum',
      'bad-spectrum',
      'missing-assumption',
      'missing-assumption',
      'missing-assumption',
    ];
    const codes = all.map(r => r.code);
    const okCodes = codes.every((c, i) => c === expected[i]);
    const noNumber = all.every(r => r.status === 'refused' && r.theta === undefined && r.reason?.length > 10);
    row('D1.refusals', okCodes && noNumber, { codes, noNumber });
  }

  // ---- D2: the optical-depth diagnostic ------------------------------------------------------------------------

  if (wanted('D2.')) {
    const L = lim('D2.opticalDepth');
    const O = SYN.opacity;
    const mk = set =>
      K.generateSpectrum({
        l: 30,
        curveName: 'flat',
        sigmaV: 5,
        densityCm3: set.densityCm3,
        spinTemperatureK: set.spinTemperatureK,
      });
    const colOf = (s, Ts) =>
      K.columnDensityThin({
        velocity: s.velocityHelio,
        temperature: s.temperature,
        spinTemperatureK: Ts,
        tauLimit: O.thinTauLimit,
      });
    const thinS = mk(O.thinWithSpinTemperature);
    const thickS = mk(O.thick);
    const thin = colOf(thinS, O.thinWithSpinTemperature.spinTemperatureK);
    const thick = colOf(thickS, O.thick.spinTemperatureK);
    const thinRel = Math.abs(thin.columnCm2 / thinS.truth.columnCm2 - 1);
    const factor = thickS.truth.columnCm2 / thick.columnCm2;
    const sat = K.columnDensityThin({
      velocity: thinS.velocityHelio,
      temperature: thinS.temperature.map(t => t * 0 + 130),
      spinTemperatureK: 120,
    });
    const none = K.columnDensityThin({ velocity: thinS.velocityHelio, temperature: thinS.temperature });
    row(
      'D2.opticalDepth',
      thin.status === 'ok' &&
        thinRel <= L.thinMaxRel &&
        thick.status === 'thin-assumption-fails' &&
        thick.tauPeak > L.tauLimit &&
        factor >= L.thickMinFactor &&
        sat.status === 'saturated' &&
        sat.columnCm2 === null &&
        none.status === 'opacity-not-assessed' &&
        /opacity not assessed/.test(none.note),
      {
        thinStatus: thin.status,
        thinRelativeError: thinRel,
        thinTauPeak: sig(thin.tauPeak),
        thickStatus: thick.status,
        thickTauPeak: sig(thick.tauPeak),
        thickUnderestimateFactor: sig(factor),
        saturated: sat.status,
        notAssessed: none.status,
      }
    );
  }

  // ---- R1, R2: reported ------------------------------------------------------------------------------------------

  if (wanted('R1.')) {
    const O = SYN.opacity;
    const out = {};
    for (const l of [30, 50, 305]) {
      const mkr = (key, extra) => {
        const s = K.generateSpectrum({ l, curveName: 'flat', sigmaV: 5, ...extra });
        const r = K.tangentPoint(baseOptions(s, { sigmaNoise: 0 }));
        return r.status === 'ok'
          ? sig(r.theta - s.truth.circularSpeedAtTangent)
          : r.code;
      };
      out[l] = {
        thin: mkr('thin', {}),
        thinWithSpinTemperature: mkr('t', {
          densityCm3: O.thinWithSpinTemperature.densityCm3,
          spinTemperatureK: O.thinWithSpinTemperature.spinTemperatureK,
        }),
        thick: mkr('k', {
          densityCm3: O.thick.densityCm3,
          spinTemperatureK: O.thick.spinTemperatureK,
        }),
      };
    }
    reported('R1.opacityOnEdge', { errorKmSByLongitude: out });
  }

  if (wanted('R2.')) {
    const L = lim('R2.streaming');
    const out = {};
    for (const l of L.longitudes) {
      const geo = K.tangentGeometry(l, R0);
      const mkr = extra => {
        const s = K.generateSpectrum({ l, curveName: 'flat', sigmaV: 5, ...extra });
        const r = K.tangentPoint(baseOptions(s, { sigmaNoise: 0 }));
        return r.status === 'ok' ? sig(r.theta - s.truth.circularSpeedAtTangent) : r.code;
      };
      out[l] = {
        circular: mkr({}),
        streaming: mkr({ radialStreamingKmS: L.streamingKmS }),
        hole: mkr({ rIn: L.holeFraction * geo.radius }),
      };
    }
    reported('R2.streaming', { errorKmSByLongitude: out });
  }

  if (wanted('E1.'))
    notRun(
      'E1.packContract',
      'no HI spectrum is in the tree: RADIO_DATA_GATE.md rows 01 to 05 are C, so the synthetic generator is the pack and the authentic leg waits for Carl'
    );

  const cpu = process.cpuUsage(cpu0);
  rows.push({
    id: '_cpu',
    status: 'info',
    measured: { cpuSeconds: sig((cpu.user + cpu.system) / 1e6, 3) },
    note: 'recorded, not compared',
  });
  return rows;
}

// ---- command line -----------------------------------------------------------------------------------------------------

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const onlyArg = args.find(a => a.startsWith('--only='));
  const only = onlyArg ? onlyArg.slice(7).split(',').filter(Boolean) : [];
  const all = runValidation({ only });
  const rows = all.filter(r => r.id !== '_cpu');
  const sorted = [...rows].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  if (args.includes('--json')) {
    process.stdout.write(`${JSON.stringify(all)}\n`);
  } else {
    for (const r of sorted)
      console.log(`${r.status.toUpperCase().padEnd(8)} ${r.id.padEnd(22)} ${JSON.stringify(r.measured)}`);
    const count = s => rows.filter(r => r.status === s).length;
    console.log(
      `\n${rows.length} rows: ${count('pass')} pass, ${count('fail')} fail, ${count('reported')} reported, ${count('not-run')} not run`
    );
  }
  if (args.includes('--write-results') && !only.length)
    writeFileSync(
      path.join(ROOT, DIR, 'results.json'),
      `${JSON.stringify({ format: 'gravitas.radio-results/1', rows: sorted }, null, 2)}\n`
    );
  if (args.includes('--write-failed') && !only.length)
    writeFileSync(
      path.join(ROOT, DIR, 'failed-legs.json'),
      `${JSON.stringify(
        {
          format: 'gravitas.radio-failed-legs/1',
          label: 'These legs crossed a committed bound and stay failing; only Carl resets one.',
          legs: sorted.filter(r => r.status === 'fail').map(r => ({ id: r.id, measured: r.measured, note: r.note })),
        },
        null,
        2
      )}\n`
    );
  process.exitCode = rows.some(r => r.status === 'fail') ? 1 : 0;
}
