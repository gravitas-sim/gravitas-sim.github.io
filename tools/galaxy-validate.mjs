#!/usr/bin/env node
// =============================================================================
// The galaxy-spectra kernel against its committed thresholds (Prompt 248)
// -----------------------------------------------------------------------------
//   npm run galaxy:validate                     print the table
//   npm run galaxy:validate -- --json           print it as JSON
//   npm run galaxy:validate -- --write-results  rewrite tests/fixtures/galaxy/results.json
//   npm run galaxy:validate -- --write-failed   rewrite tests/fixtures/galaxy/failed-legs.json
//   --only=A1,B1                                run the legs whose id starts with these
//
// tests/fixtures/galaxy/thresholds.json fixed every bound before the kernel existed (GALAXY_SPECTRA.md,
// "Validation contract"); this reads the bounds from that file, not from copies. The B rows read
// tests/fixtures/galaxy/oracle-results.json, which tools/galaxy-oracle/oracle.py wrote (numpy, scipy; no
// Gravitas code). A leg whose authentic file, cited template or tool was never supplied is NOT RUN and says why.
// =============================================================================

import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import * as G from '../js/kernels/galaxy/index.js';
import { LINES } from '../js/data/radiation/lines.js';
import { LAW } from '../js/data/radiation/extinction.js';
import {
  gaussianArea,
  FWHM_PER_SIGMA,
} from '../js/kernels/spectrograph/lsf.js';
import {
  SPECTRA,
  decodeSpectrum,
  wavelengths,
} from '../js/data/spectra/sdssSpectra.js';
import { stream } from '../js/random/streams.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR = 'tests/fixtures/galaxy';
const read = rel => JSON.parse(readFileSync(path.join(ROOT, rel), 'utf8'));
export const THRESHOLDS = read(`${DIR}/thresholds.json`);
export const FOLLOWUP = read(`${DIR}/followup-thresholds.json`);
const ORACLE = read(`${DIR}/oracle-results.json`);
const INPUTS = read(`${DIR}/oracle-inputs.json`);
const lim = id =>
  [...THRESHOLDS.checks, ...FOLLOWUP.checks].find(c => c.id === id).limits;
const SEEDS = THRESHOLDS.seeds;
const ZR = THRESHOLDS.worlds.ensembles.zRange;
const BANDS = G.INVENTED_BREAK_BANDS;

const sig = (v, d = 4) => (Number.isFinite(v) ? Number(v.toPrecision(d)) : v);
const mean = a => a.reduce((s, v) => s + v, 0) / a.length;
const sd = a => {
  const m = mean(a);
  return Math.sqrt(mean(a.map(v => (v - m) ** 2)));
};
const rel = (a, b) => Math.abs(a - b) / Math.abs(b);
const inRange = (v, [lo, hi]) => v >= lo && v <= hi;
const STEP = G.GALAXY_WORLD.log10Step;
const LINES_GRID = { ...ZR, step: 2e-4 };
const KINDS = ['star-forming', 'passive'];

// the templates are built once
const TEMPLATES = Object.fromEntries(
  KINDS.map(kind => [kind, G.galaxyTemplate({ lines: LINES, kind })])
);

const world = (kind, z, extra = {}) =>
  G.generateGalaxy({ lines: LINES, law: LAW, kind, z, ...extra });
const xc = (w, kind, o = {}) =>
  G.crossCorrelate(w, TEMPLATES[kind], { zRange: ZR, ...o });
const brk = (w, z, o = {}) =>
  G.breakIndex(w, {
    definition: BANDS,
    z,
    fluxKind: 'f-lambda',
    ...o,
  });
const linesZ = w => G.redshiftFromLines(w, LINES, { zRange: LINES_GRID });
const zOfLag = k => 10 ** (k * STEP) - 1;
// the grid of A4 and A5 at z below the redshift where the blue band enters the spectrum (AM3): the same step,
// the same samples above 380 nm, 482 more below it
const EXTENDED = {
  log10Start: Math.log10(340),
  samples:
    G.GALAXY_WORLD.samples +
    Math.round((Math.log10(380) - Math.log10(340)) / STEP),
};

/** Coverage and normalised-error statistics of a list of {value, sigma, truth}. */
function coverage(list) {
  const z = list.map(r => (r.value - r.truth) / r.sigma);
  return {
    n: list.length,
    coverage:
      list.filter(r => Math.abs(r.value - r.truth) <= r.sigma).length /
      list.length,
    meanZ: mean(z),
    sdZ: sd(z),
  };
}

/** A spectrum from an oracle-inputs case. */
const specOf = c => {
  const n = INPUTS.grid.samples;
  const lambda = new Float64Array(n);
  for (let i = 0; i < n; i++)
    lambda[i] = 10 ** (INPUTS.grid.log10Start + i * INPUTS.grid.log10Step);
  return {
    lambdaNm: lambda,
    flux: Float64Array.from(c.flux),
    sigma: new Float64Array(n).fill(c.sigmaPixel),
    medium: 'vacuum',
    resolvingPower: c.resolvingPower,
    fluxKind: 'f-lambda',
  };
};
const templateOf = kind => {
  const n = INPUTS.templateGrid.samples;
  const lambda = new Float64Array(n);
  for (let i = 0; i < n; i++)
    lambda[i] =
      10 **
      (INPUTS.templateGrid.log10Start + i * INPUTS.templateGrid.log10Step);
  return {
    lambdaNm: lambda,
    flux: Float64Array.from(INPUTS.templates[kind].flux),
    medium: 'vacuum',
    resolvingPower: INPUTS.templates[kind].resolvingPower,
    label: 'oracle input',
    source: 'the oracle-inputs file (synthetic)',
  };
};

/** The ensemble draws: a seeded parameter stream. */
const drawsOf = (seed, label) => {
  const d = stream('forward', seed, label);
  return {
    u: (a, b) => a + (b - a) * d(),
    d,
  };
};

const confidentlyWrong = (r, z) =>
  r.status === 'ok' && Math.abs(r.z - z) > 5 * r.sigmaZ;

/**
 * Run the legs.
 * @param {{only?: string[]}} [opts]
 * @returns {object[]} rows {id, status, measured, note}
 */
export function runValidation({ only = [] } = {}) {
  const rows = [];
  const row = (id, pass, measured, note = '') =>
    rows.push({
      id,
      status: pass ? 'pass' : 'fail',
      measured,
      note: pass ? '' : note,
    });
  const reported = (id, measured, note = '') =>
    rows.push({ id, status: 'reported', measured, note });
  const notRun = (id, note) =>
    rows.push({ id, status: 'not-run', measured: null, note });
  const wanted = id => !only.length || only.some(p => id.startsWith(p));
  const cpu0 = process.cpuUsage();

  // ---- A1: integer shifts --------------------------------------------------------------------------

  if (wanted('A1.')) {
    const L = lim('A1.integerShift');
    let worst = 0;
    let allOk = true;
    const per = [];
    for (const kind of KINDS)
      for (const k of L.lags) {
        const z = zOfLag(k);
        const r = xc(world(kind, z, { noise: false, snr: 20 }), kind);
        const err = r.status === 'ok' ? Math.abs(r.z - z) : Infinity;
        if (r.status !== 'ok') allOk = false;
        worst = Math.max(worst, err);
        per.push({ kind, k, error: sig(err) });
      }
    row('A1.integerShift', allOk && worst <= L.maxAbsoluteZ, {
      worstAbsoluteZ: worst,
      per,
    });
  }

  // ---- A2: sub-sample shifts ------------------------------------------------------------------------

  if (wanted('A2.')) {
    const L = lim('A2.subPixelShift');
    let worstXc = 0;
    let worstLines = 0;
    const per = [];
    for (const z of L.z)
      for (const kind of KINDS) {
        const w = world(kind, z, { noise: false, snr: 20 });
        const r = xc(w, kind);
        const e = r.status === 'ok' ? Math.abs(r.z - z) : Infinity;
        worstXc = Math.max(worstXc, e);
        const entry = { z, kind, xc: sig(e) };
        if (kind === 'star-forming') {
          const l = linesZ(w);
          const el = l.status === 'ok' ? Math.abs(l.z - z) : Infinity;
          worstLines = Math.max(worstLines, el);
          entry.lines = sig(el);
        }
        per.push(entry);
      }
    row(
      'A2.subPixelShift',
      worstXc <= L.maxAbsoluteZXc && worstLines <= L.maxAbsoluteZLines,
      { worstXc, worstLines, per }
    );
  }

  // ---- A3: the curvature against the analytic Cramer-Rao value ------------------------------------

  if (wanted('A3.')) {
    const L = lim('A3.curvatureAnalytic');
    const N = G.GALAXY_WORLD.samples;
    const M = G.GALAXY_WORLD.templateSamples;
    const s = L.lineSigmaSamples;
    const sigmaPixel = 0.05;
    const peak = L.amplitudeOverSigma * sigmaPixel;
    const area = (c, i) => gaussianArea(c, s, i - 0.5, i + 0.5);
    const profile = (n, c) => {
      const y = new Float64Array(n).fill(1);
      for (let i = 0; i < n; i++)
        y[i] += peak * s * Math.sqrt(2 * Math.PI) * area(c, i);
      return y;
    };
    const R = 1 / (s * FWHM_PER_SIGMA * Math.LN10 * STEP);
    const grid = (n, start) =>
      Float64Array.from({ length: n }, (_, i) => 10 ** (start + i * STEP));
    const a = 1500;
    const b = 1000;
    const spec = {
      lambdaNm: grid(N, G.GALAXY_WORLD.log10Start),
      flux: profile(N, a),
      sigma: new Float64Array(N).fill(sigmaPixel),
      medium: 'vacuum',
      resolvingPower: R,
    };
    const tpl = {
      lambdaNm: grid(M, G.GALAXY_WORLD.templateLog10Start),
      flux: profile(M, b),
      medium: 'vacuum',
      resolvingPower: R,
      source: 'synthetic single line',
    };
    const k = a - b;
    const z =
      10 **
        (G.GALAXY_WORLD.log10Start -
          G.GALAXY_WORLD.templateLog10Start +
          k * STEP) -
      1;
    const r = G.crossCorrelate(spec, tpl, {
      zRange: { min: z - 0.01, max: z + 0.01 },
    });
    // the Cramer-Rao value: sigma_k^2 = sigma^2 / sum (d mu / dk)^2, mu the pixel-integrated line at position c
    const eps = 1e-3;
    let sum = 0;
    for (let i = 0; i < N; i++) {
      const d =
        (peak *
          s *
          Math.sqrt(2 * Math.PI) *
          (area(a + eps, i) - area(a - eps, i))) /
        (2 * eps);
      sum += d * d;
    }
    const analytic = sigmaPixel / Math.sqrt(sum);
    const err =
      r.status === 'ok' || r.status === 'low-significance'
        ? rel(r.sigmaLag, analytic)
        : Infinity;
    row('A3.curvatureAnalytic', err <= L.maxRelative, {
      relativeDifference: err,
      kernelSigmaLag: r.sigmaLag,
      analyticSigmaLag: analytic,
      status: r.status,
    });
  }

  // ---- A4: a step in a flat F_nu spectrum ---------------------------------------------------------------

  if (wanted('A4.')) {
    const L = lim('A4.breakStep');
    let worst = 0;
    const per = [];
    for (const d of L.depths)
      for (const z of L.z) {
        const w = world('flat', z, {
          alpha: -2,
          breakDepth: d,
          breakWidthNm: 0,
          noise: false,
          snr: 50,
          ...(z < 0.03 ? EXTENDED : {}),
        });
        const b = brk(w, z);
        const e = b.status === 'ok' ? rel(b.D, 1 / (1 - d)) : Infinity;
        worst = Math.max(worst, e);
        per.push({ d, z, D: b.D, error: sig(e) });
      }
    row('A4.breakStep', worst <= L.maxRelative, { worstRelative: worst, per });
  }

  // ---- A5: the break against the quadrature of the model --------------------------------------------

  if (wanted('A5.')) {
    const L = lim('A5.breakQuadrature');
    let worst = 0;
    const per = [];
    for (const kind of KINDS)
      for (const z of L.z) {
        const w = world(kind, z, {
          noise: false,
          snr: 50,
          ...(z < 0.03 ? EXTENDED : {}),
        });
        const b = brk(w, z);
        const e = b.status === 'ok' ? rel(b.D, w.truth.breakTruth.D) : Infinity;
        worst = Math.max(worst, e);
        per.push({
          kind,
          z,
          D: sig(b.D, 6),
          truth: sig(w.truth.breakTruth.D, 6),
          error: sig(e),
        });
      }
    row('A5.breakQuadrature', worst <= L.maxRelative, {
      worstRelative: worst,
      per,
    });
  }

  // ---- A6: the flux kind -------------------------------------------------------------------------------

  if (wanted('A6.')) {
    const L = lim('A6.fluxKind');
    const w = world('passive', 0.12, { seed: 'a6', snr: 12 });
    const fnu = {
      ...w,
      flux: Float64Array.from(w.flux, (f, i) => w.lambdaNm[i] ** 2 * f),
      sigma: Float64Array.from(w.sigma, (s, i) => w.lambdaNm[i] ** 2 * s),
    };
    const a = brk(w, 0.12);
    const b = brk(fnu, 0.12, { fluxKind: 'f-nu' });
    const eD = rel(a.D, b.D);
    const eS = rel(a.sigma, b.sigma);
    row('A6.fluxKind', eD <= L.maxRelative && eS <= 1e-9, {
      relativeD: eD,
      relativeSigma: eS,
    });
  }

  // ---- B1 to B5: the independent implementation -------------------------------------------------------------

  const xcCases = INPUTS.cases.slice(0, 8);
  if (wanted('B1.')) {
    const L = lim('B1.correlationVsOracle');
    let worstZ = 0;
    let worstS = 0;
    let worstQ = 0;
    const per = [];
    xcCases.forEach((c, i) => {
      const r = G.crossCorrelate(specOf(c), templateOf(c.kind), {
        zRange: INPUTS.zRange,
      });
      const o = ORACLE.b1[i];
      if (r.z === undefined || r.sigmaZ === undefined) {
        worstZ = Infinity;
        per.push({ id: c.id, status: r.status });
        return;
      }
      worstZ = Math.max(worstZ, Math.abs(r.z - o.z));
      worstS = Math.max(worstS, rel(r.sigmaZ, o.sigmaZ));
      worstQ = Math.max(worstQ, rel(r.q, o.q));
      per.push({
        id: c.id,
        dz: sig(r.z - o.z),
        relSigma: sig(rel(r.sigmaZ, o.sigmaZ)),
        relQ: sig(rel(r.q, o.q)),
      });
    });
    row(
      'B1.correlationVsOracle',
      xcCases.length === L.cases &&
        worstZ <= L.maxAbsoluteZ &&
        worstS <= L.maxRelativeSigma &&
        worstQ <= L.maxRelativeQ,
      {
        worstAbsoluteZ: worstZ,
        worstRelativeSigma: worstS,
        worstRelativeQ: worstQ,
        per,
      }
    );
  }

  if (wanted('B2.')) {
    const L = lim('B2.directEqualsFft');
    let worst = 0;
    ORACLE.b2.forEach((o, i) => {
      const c = INPUTS.cases[i];
      const r = G.crossCorrelate(specOf(c), templateOf(c.kind), {
        zRange: INPUTS.zRange,
        keepProfile: true,
      });
      const p = r.profile;
      if (!p || p.lag0 !== o.lag0 || p.q.length !== o.q.length) {
        worst = Infinity;
        return;
      }
      let dmax = 0;
      let qmax = 0;
      for (let k = 0; k < o.q.length; k++) {
        dmax = Math.max(dmax, Math.abs(p.q[k] - o.q[k]));
        qmax = Math.max(qmax, Math.abs(o.q[k]));
      }
      worst = Math.max(worst, dmax / qmax);
    });
    row(
      'B2.directEqualsFft',
      ORACLE.b2.length === L.cases && worst <= L.maxRelative,
      {
        worstRelativeProfileDifference: worst,
      }
    );
  }

  if (wanted('B3.')) {
    const L = lim('B3.breakVsOracle');
    let worst = 0;
    xcCases.forEach((c, i) => {
      const o = ORACLE.b3[i];
      const b = G.breakIndex(specOf(c), {
        definition: BANDS,
        z: o.z,
        fluxKind: 'f-lambda',
      });
      if (b.D === undefined) {
        worst = Infinity;
        return;
      }
      worst = Math.max(worst, rel(b.D, o.D), rel(b.sigma, o.sigma));
    });
    row(
      'B3.breakVsOracle',
      xcCases.length === L.cases && worst <= L.maxRelative,
      {
        worstRelative: worst,
      }
    );
  }

  if (wanted('B4.')) {
    const L = lim('B4.lineRedshiftVsScipy');
    const per = [];
    let worst = 0;
    let worstCombined = 0;
    let comparable = 0;
    const misidentified = [];
    ORACLE.b4.forEach(o => {
      const c = INPUTS.cases.find(x => x.id === o.id);
      const r = G.redshiftFromLines(specOf(c), LINES, {
        zRange: { ...INPUTS.zRange, step: 2e-4 },
      });
      if (r.status !== 'ok') {
        per.push({ id: o.id, comparable: false, status: r.status });
        return;
      }
      // the oracle's per-line fits over the lines the kernel identified that the world names (AM4, AM5)
      const named = r.lines.filter(l => o.lines.some(x => x.id === l.id));
      const unnamed = r.lines.filter(l => !named.includes(l)).map(l => l.id);
      if (unnamed.length) misidentified.push({ id: o.id, lines: unnamed });
      const pairs = named.map(l => ({
        k: l,
        o: o.lines.find(x => x.id === l.id),
      }));
      if (pairs.length < 2) {
        per.push({
          id: o.id,
          comparable: false,
          status: 'fewer than two named lines',
        });
        return;
      }
      comparable++;
      const lineWorst = Math.max(
        ...pairs.map(p => Math.abs(p.k.z - p.o.z) / p.k.sigmaZ)
      );
      let sw = 0;
      let sz = 0;
      for (const p of pairs) {
        const wi = 1 / p.o.sigmaZ ** 2;
        sw += wi;
        sz += wi * p.o.z;
      }
      const combined = unnamed.length ? 0 : Math.abs(r.z - sz / sw) / r.sigmaZ;
      worst = Math.max(worst, lineWorst);
      worstCombined = Math.max(worstCombined, combined);
      per.push({
        id: o.id,
        comparable: true,
        lines: pairs.length,
        worstLineSigmaFraction: sig(lineWorst),
        combinedSigmaFraction: sig(combined),
      });
    });
    row(
      'B4.lineRedshiftVsScipy',
      ORACLE.b4.length === L.cases &&
        comparable === L.cases &&
        worst <= L.maxSigmaFraction &&
        worstCombined <= L.maxSigmaFraction,
      {
        comparable,
        worstLineSigmaFraction: worst,
        worstCombinedSigmaFraction: worstCombined,
        misidentified,
        per,
      }
    );
  }

  if (wanted('B5.'))
    notRun(
      'B5.toolkit',
      'No cited independent spectral tool is installed and installing one is a download, which this prompt does not do. The leg would run it on the exported spectra and compare its redshift and break to the kernel’s within 3 combined sigma; GALAXY_SPECTRA.md names the request.'
    );

  // ---- C1: the correlation's coverage ------------------------------------------------------------------

  const ensemble = (seed, label, n, mk) => {
    const { u } = drawsOf(seed, label);
    const out = [];
    for (let i = 0; i < n; i++) out.push(mk(i, u));
    return out;
  };

  if (wanted('C1.')) {
    const L = lim('C1.correlationCoverage');
    const list = [];
    let ok = 0;
    let wrong = 0;
    ensemble(SEEDS.ensembleXc, 'params', L.n, (i, u) => {
      const kind = KINDS[i % 2];
      const z = u(0.01, 0.3);
      const snr = u(5, 15);
      const r = xc(world(kind, z, { seed: `c1-${i}`, snr }), kind);
      if (r.status === 'ok') ok++;
      if (confidentlyWrong(r, z)) wrong++;
      if (r.sigmaZ !== undefined)
        list.push({ value: r.z, sigma: r.sigmaZ, truth: z });
    });
    const c = coverage(list);
    row(
      'C1.correlationCoverage',
      inRange(c.coverage, L.coverageBand) &&
        inRange(c.sdZ, L.sdBand) &&
        ok / L.n >= L.minOkFraction &&
        wrong / L.n <= L.maxWrongFraction,
      { ...c, okFraction: ok / L.n, wrongFraction: wrong / L.n }
    );
  }

  // ---- C2: the line method's coverage ----------------------------------------------------------------------

  if (wanted('C2.')) {
    const L = lim('C2.linesCoverage');
    const list = [];
    let answered = 0;
    let wrong = 0;
    ensemble(SEEDS.ensembleLines, 'params', L.n, (i, u) => {
      const z = u(0.01, 0.3);
      const snr = u(5, 15);
      const r = linesZ(world('star-forming', z, { seed: `c2-${i}`, snr }));
      if (r.status !== 'ok') return;
      answered++;
      list.push({ value: r.z, sigma: r.sigmaZ, truth: z });
      if (Math.abs(r.z - z) > Math.max(5 * r.sigmaZ, L.wrongFloorZ)) wrong++;
    });
    const c = coverage(list);
    row(
      'C2.linesCoverage',
      inRange(c.coverage, L.coverageBand) &&
        inRange(c.sdZ, L.sdBand) &&
        answered / L.n >= L.minAnsweredFraction &&
        wrong / Math.max(1, answered) <= L.maxWrongFraction,
      {
        ...c,
        answeredFraction: answered / L.n,
        wrongFraction: wrong / Math.max(1, answered),
      },
      'The line method answers every world and is never wrong, but its one-sigma interval is conservative: the coverage is above the committed band and the standard deviation of the normalised error is under 1 (the cause was not isolated: the per-line fit errors and the scatter inflation are the candidates). Left failing as committed; the intervals are safe to quote and not tight.'
    );
  }

  // ---- C3: the break's coverage ----------------------------------------------------------------------------

  if (wanted('C3.')) {
    const L = lim('C3.breakCoverage');
    const withTrue = [];
    const withXc = [];
    let outside = 0;
    let outsideRefused = 0;
    ensemble(SEEDS.ensembleBreak, 'params', L.n, (i, u) => {
      const kind = KINDS[i % 2];
      const z = u(0.01, 0.3);
      const snr = u(5, 15);
      const w = world(kind, z, { seed: `c3-${i}`, snr });
      const b = brk(w, z);
      if (b.code === 'band-outside-spectrum') {
        outside++;
        outsideRefused++;
        return;
      }
      if (b.D === undefined) return;
      const truth = w.truth.breakTruth.D;
      withTrue.push({ value: b.D, sigma: b.sigma, truth });
      const r = xc(w, kind);
      if (r.sigmaZ !== undefined) {
        const b2 = brk(w, r.z, { zSigma: r.sigmaZ });
        if (b2.D !== undefined)
          withXc.push({ value: b2.D, sigma: b2.sigma, truth });
      }
    });
    const c1 = coverage(withTrue);
    const c2 = coverage(withXc);
    row(
      'C3.breakCoverage',
      inRange(c1.coverage, L.coverageBand) &&
        inRange(c1.sdZ, L.sdBand) &&
        inRange(c2.coverage, L.coverageBand) &&
        inRange(c2.sdZ, L.sdBand) &&
        outside === outsideRefused,
      { trueRedshift: c1, correlationRedshift: c2, refusedBandOutside: outside }
    );
  }

  // ---- D1: noise only ---------------------------------------------------------------------------------------

  if (wanted('D1.')) {
    const L = lim('D1.noiseOnly');
    let ok = 0;
    let low = 0;
    let linesAnswered = 0;
    let runs = 0;
    for (let i = 0; i < L.n; i++) {
      const w = world('flat', 0, {
        seed: `d1-${SEEDS.noiseOnly}-${i}`,
        snr: L.snr,
      });
      for (const kind of KINDS) {
        const r = xc(w, kind);
        runs++;
        if (r.status === 'ok') ok++;
        if (r.status === 'low-significance') low++;
      }
      if (linesZ(w).status === 'ok') linesAnswered++;
    }
    row(
      'D1.noiseOnly',
      ok === 0 &&
        low / runs <= L.maxLowFraction &&
        linesAnswered / L.n <= L.maxLinesAnsweredFraction,
      { crossCorrelations: runs, ok, lowSignificance: low, linesAnswered }
    );
  }

  // ---- D2: a flat spectrum ----------------------------------------------------------------------------------

  if (wanted('D2.')) {
    const L = lim('D2.flatSpectrum');
    const w = world('flat', 0, { noise: false, snr: 10 });
    const r = xc(w, 'passive');
    const l = linesZ(w);
    const b = brk(w, 0.1);
    const fnu = world('flat', 0, { noise: false, snr: 10, alpha: -2 });
    const bf = brk(fnu, 0.1);
    const meanSq = band => {
      const f = 1.1;
      return (
        ((band[1] * f) ** 3 - (band[0] * f) ** 3) /
        (3 * (band[1] - band[0]) * f)
      );
    };
    const flatNote = {
      flatFnuBreak: bf.D,
      flatFlambdaAnalytic: meanSq(BANDS.redNm) / meanSq(BANDS.blueNm),
    };
    row(
      'D2.flatSpectrum',
      r.status === 'refused' &&
        r.code === 'no-structure' &&
        l.status === 'not-constrained' &&
        l.code === 'too-few-features' &&
        b.status === 'ok' &&
        Math.abs(b.D - 1) <= L.maxBreakError &&
        b.breakPresent === false,
      {
        xc: r.code,
        lines: l.code,
        breakD: b.D,
        breakPresent: b.breakPresent,
        ...flatNote,
      },
      'The committed expectation was an error made when the contract was written: a break of 1 for a flat spectrum holds for a spectrum flat in F_nu; the flat world is flat in F_lambda, whose F_nu rises as lambda squared, so the definition gives the ratio of the band means of lambda squared, not 1. The correlation and the line method behaved as committed, and a spectrum flat in F_nu returns 1 (flatFnu). The leg is left failing as committed; only Carl resets a bound.'
    );
  }

  // ---- D3: a template that is not the object -----------------------------------------------------------------

  if (wanted('D3.')) {
    const L = lim('D3.templateMismatch');
    const { u } = drawsOf(SEEDS.mismatch, 'params');
    let wrong = 0;
    let flagged = 0;
    let ok = 0;
    let answered = 0;
    const wrongList = [];
    const total = 2 * L.n;
    for (let i = 0; i < total; i++) {
      const kind = KINDS[i % 2];
      const other = KINDS[(i + 1) % 2];
      const z = u(0.01, 0.3);
      const w = world(kind, z, { seed: `d3-${i}`, snr: u(5, 15) });
      const r = xc(w, other);
      if (confidentlyWrong(r, z)) {
        wrong++;
        wrongList.push({
          world: kind,
          template: other,
          absError: Math.abs(r.z - z),
          sigmas: Math.abs(r.z - z) / r.sigmaZ,
          q: r.q,
        });
      }
      if (r.status === 'ok') ok++;
      else flagged++;
      if (r.sigmaZ !== undefined) answered++;
    }
    row(
      'D3.templateMismatch',
      wrong / total <= L.maxWrongFraction,
      {
        worlds: total,
        confidentlyWrong: wrong,
        confidentlyWrongFraction: wrong / total,
        statusOk: ok,
        refusedOrFlagged: flagged,
        answered,
        confidentlyWrongByWorld: {
          'star-forming': wrongList.filter(w => w.world === 'star-forming')
            .length,
          passive: wrongList.filter(w => w.world === 'passive').length,
        },
        medianAbsErrorZ: wrongList.length
          ? sig(
              wrongList.map(w => w.absError).sort((a, b) => a - b)[
                wrongList.length >> 1
              ]
            )
          : null,
        maxAbsErrorZ: wrongList.length
          ? sig(Math.max(...wrongList.map(w => w.absError)))
          : null,
        medianErrorSigmas: wrongList.length
          ? sig(
              wrongList.map(w => w.sigmas).sort((a, b) => a - b)[
                wrongList.length >> 1
              ]
            )
          : null,
      },
      'A template that is not the object can give a confident redshift that is wrong by more than its stated error: the curvature uncertainty assumes the template is the truth. Left failing as committed; see GALAXY_SPECTRA.md.'
    );
  }

  // ---- D4: aliasing --------------------------------------------------------------------------------------------

  if (wanted('D4.')) {
    const L = lim('D4.alias');
    const { u } = drawsOf(SEEDS.alias, 'params');
    let refusedCount = 0;
    let hasTruth = 0;
    const per = [];
    for (let i = 0; i < L.n; i++) {
      const z = u(0.02, 0.2);
      const c = G.generateComb({
        teeth: L.teeth,
        spacingSamples: L.spacingSamples,
        z,
        seed: `d4-${i}`,
        snr: 15,
      });
      const r = G.crossCorrelate(c.spectrum, c.template, { zRange: ZR });
      const amb = r.status === 'refused' && r.code === 'ambiguous-peak';
      if (amb) refusedCount++;
      const near = amb && r.candidates.some(k => Math.abs(k.z - z) <= 5e-5);
      if (near) hasTruth++;
      if (!amb || !near) per.push({ z, status: r.status, code: r.code });
    }
    row('D4.alias', refusedCount >= L.minRefused && hasTruth === refusedCount, {
      refusedAmbiguous: refusedCount,
      truthAmongCandidates: hasTruth,
      misses: per,
    });
  }

  // ---- D5: the correlation's refusals -------------------------------------------------------------------------

  if (wanted('D5.')) {
    const base = world('star-forming', 0.1, { seed: 'd5', snr: 10 });
    const tpl = TEMPLATES['star-forming'];
    const clone = (o, patch) => ({ ...o, ...patch });
    const lin = Float64Array.from(
      { length: 800 },
      (_, i) => 400 + (i * 500) / 800
    );
    const nanFlux = Float64Array.from(base.flux);
    nanFlux[10] = NaN;
    const decreasing = Float64Array.from(base.lambdaNm);
    decreasing[5] = decreasing[4] * 0.999;
    const cases = [
      [
        'medium-missing',
        () =>
          G.crossCorrelate(clone(base, { medium: undefined }), tpl, {
            zRange: ZR,
          }),
      ],
      [
        'medium-mismatch',
        () =>
          G.crossCorrelate(base, clone(tpl, { medium: 'air' }), { zRange: ZR }),
      ],
      [
        'missing-source',
        () =>
          G.crossCorrelate(base, clone(tpl, { source: '' }), { zRange: ZR }),
      ],
      [
        'template-resolution',
        () =>
          G.crossCorrelate(base, clone(tpl, { resolvingPower: 3000 }), {
            zRange: ZR,
          }),
      ],
      [
        'not-log-uniform',
        () =>
          G.crossCorrelate(
            clone(base, {
              lambdaNm: lin,
              flux: new Float64Array(800).fill(1),
              sigma: null,
            }),
            tpl,
            { zRange: ZR }
          ),
      ],
      [
        'z-range-outside-overlap',
        () => G.crossCorrelate(base, tpl, { zRange: { min: 5, max: 6 } }),
      ],
      [
        'not-finite',
        () =>
          G.crossCorrelate(clone(base, { flux: nanFlux }), tpl, { zRange: ZR }),
      ],
      [
        'not-increasing',
        () =>
          G.crossCorrelate(clone(base, { lambdaNm: decreasing }), tpl, {
            zRange: ZR,
          }),
      ],
      ['bad-z-range', () => G.crossCorrelate(base, tpl, {})],
    ];
    const got = cases.map(([code, fn]) => {
      const r = fn();
      return { expected: code, status: r.status, code: r.code };
    });
    row(
      'D5.crossCorrelationRefusals',
      got.every(g => g.status === 'refused' && g.code === g.expected),
      { cases: got }
    );
  }

  // ---- D6: the break's refusals --------------------------------------------------------------------------------

  if (wanted('D6.')) {
    const w = world('passive', 0.1, { seed: 'd6', snr: 10 });
    const ok = { definition: BANDS, z: 0.1, fluxKind: 'f-lambda' };
    const coarse = {
      lambdaNm: Float64Array.from({ length: 30 }, (_, i) => 380 + i * 18),
      flux: new Float64Array(30).fill(1),
      sigma: new Float64Array(30).fill(0.1),
    };
    const negative = {
      ...w,
      flux: Float64Array.from(w.flux, (f, i) => (w.lambdaNm[i] < 450 ? -1 : f)),
    };
    const noisy = {
      ...w,
      flux: new Float64Array(w.flux.length).fill(1),
      sigma: new Float64Array(w.flux.length).fill(50),
    };
    const cases = [
      [
        'no-definition',
        () => G.breakIndex(w, { ...ok, definition: undefined }),
      ],
      [
        'missing-source',
        () => G.breakIndex(w, { ...ok, definition: { ...BANDS, source: '' } }),
      ],
      [
        'bands-overlap-or-misordered',
        () =>
          G.breakIndex(w, {
            ...ok,
            definition: { ...BANDS, blueNm: [380, 420] },
          }),
      ],
      [
        'bands-overlap-or-misordered',
        () =>
          G.breakIndex(w, {
            ...ok,
            definition: { ...BANDS, blueNm: BANDS.redNm, redNm: BANDS.blueNm },
          }),
      ],
      [
        'flux-kind-missing',
        () => G.breakIndex(w, { ...ok, fluxKind: undefined }),
      ],
      ['band-outside-spectrum', () => G.breakIndex(w, { ...ok, z: 0 })],
      ['too-few-samples', () => G.breakIndex(coarse, { ...ok, z: 0.05 })],
      ['non-positive-flux', () => G.breakIndex(negative, ok)],
      ['noise-dominated', () => G.breakIndex(noisy, ok), 'not-constrained'],
    ];
    const got = cases.map(([code, fn, status]) => {
      const r = fn();
      return {
        expected: code,
        status: r.status,
        code: r.code,
        wantStatus: status ?? 'refused',
      };
    });
    row(
      'D6.breakRefusals',
      got.every(g => g.status === g.wantStatus && g.code === g.expected),
      { cases: got }
    );
  }

  // ---- D7: the label and the truth manifest -------------------------------------------------------------------

  if (wanted('D7.')) {
    const a = world('star-forming', 0.1, { seed: 'd7', snr: 10 });
    const b = world('star-forming', 0.1, { seed: 'd7', snr: 10 });
    const c = world('star-forming', 0.1, { seed: 'd7-other', snr: 10 });
    const t = TEMPLATES['star-forming'];
    const manifest = [
      'world',
      'kind',
      'z',
      'snr',
      'sigmaPixel',
      'seed',
      'resolvingPower',
      'lines',
      'breakTruth',
    ].every(k => a.truth[k] !== undefined);
    const same = a.flux.every((v, i) => v === b.flux[i]);
    const differs = a.flux.some((v, i) => v !== c.flux[i]);
    row(
      'D7.labelAndManifest',
      THRESHOLDS.worlds.label.startsWith(a.label) &&
        a.label === G.GALAXY_SYNTHETIC_LABEL &&
        t.label.startsWith('SYNTHETIC GALAXY TEMPLATE') &&
        /synthetic/.test(t.source) &&
        manifest &&
        Number.isFinite(a.truth.breakTruth.D) &&
        same &&
        differs,
      { manifest, deterministic: same, seedMatters: differs }
    );
  }

  // ---- E: authentic data -------------------------------------------------------------------------------------

  if (wanted('E1.'))
    notRun(
      'E1.authenticGalaxyRedshift',
      'No SDSS galaxy spectrum, no pipeline redshift for one and no cited template is in the tree, and nothing is fetched. GALAXY_SPECTRA.md ("Files requested from Carl") names the four spectra, the template source and the terms pages; the bound when run is fixed in thresholds.json.'
    );
  if (wanted('E2.'))
    notRun(
      'E2.authenticBreak',
      'No catalogue break index and no band definition with a source is in the tree, and nothing is fetched. GALAXY_SPECTRA.md names the catalogue product and the terms page to save; the bound when run is fixed in thresholds.json.'
    );

  if (wanted('E3.')) {
    const L = lim('E3.starsAsMutualTemplates');
    const Rsdss = 1 / (2.2 * 1e-4 * Math.LN10);
    const lam = Float64Array.from(wavelengths(), x => x / 10);
    const star = id => ({
      lambdaNm: lam,
      flux: decodeSpectrum(id).flux,
      sigma: null,
      medium: 'vacuum',
      resolvingPower: Rsdss,
    });
    const pairs = L.pairs.map(([s, t]) => {
      const spec = star(s);
      const tpl = {
        ...star(t),
        source: `the in-tree SDSS DR18 star ${t} (public domain by the pack's record), used as a template`,
        label: `star ${t}`,
      };
      const r = G.crossCorrelate(spec, tpl, { zRange: L.zRange });
      const pipe = (1 + SPECTRA[s].z) / (1 + SPECTRA[t].z) - 1;
      return {
        spectrum: s,
        template: t,
        status: r.status,
        code: r.code ?? null,
        z: r.z !== undefined ? sig(r.z, 5) : null,
        sigmaZ: r.sigmaZ !== undefined ? sig(r.sigmaZ, 3) : null,
        q: r.q !== undefined ? sig(r.q, 4) : null,
        pipelineRelativeZ: sig(pipe, 5),
        differenceKmS:
          r.z !== undefined ? sig(299792.458 * (r.z - pipe), 3) : null,
        pipelineErrorKmS: sig(
          299792.458 * Math.hypot(SPECTRA[s].zErr, SPECTRA[t].zErr),
          3
        ),
      };
    });
    reported(
      'E3.starsAsMutualTemplates',
      {
        resolvingPowerUsed: sig(Rsdss, 5),
        pairs,
      },
      'A stellar template is not a galaxy template and the pack is binned to under one sample per resolution element; the numbers are what the fixed contract returns, not a validation of the galaxy method.'
    );
  }

  // ---- R: reported, not judged ------------------------------------------------------------------------------

  if (wanted('R1.')) {
    const L = lim('R1.templateMisfit');
    const { u } = drawsOf(SEEDS.misfit, 'params');
    const list = [];
    const counts = {};
    let wrong = 0;
    for (let i = 0; i < L.n; i++) {
      const kind = KINDS[i % 2];
      const z = u(0.01, 0.3);
      const K = G.GALAXY_WORLD.kinds[kind];
      const lineScale = {};
      for (const id of [
        ...Object.keys(K.absorption ?? {}),
        ...Object.keys(K.emission ?? {}),
      ])
        lineScale[id] = u(...L.strengthRange);
      const extra =
        kind === 'star-forming'
          ? [
              {
                id: 'invented-emission',
                kind: 'emission',
                restNm: 545,
                fractionOfHBeta: 0.2,
              },
            ]
          : [
              {
                id: 'invented-absorption',
                kind: 'absorption',
                restNm: 460,
                depth: 0.15,
                sigmaKmS: 250,
              },
            ];
      const w = world(kind, z, {
        seed: `r1-${i}`,
        snr: u(5, 15),
        lineScale,
        sigmaScale: u(...L.widthRange),
        extraLines: extra,
      });
      const r = xc(w, kind);
      counts[r.status] = (counts[r.status] ?? 0) + 1;
      if (confidentlyWrong(r, z)) wrong++;
      if (r.sigmaZ !== undefined)
        list.push({ value: r.z, sigma: r.sigmaZ, truth: z });
    }
    reported(
      'R1.templateMisfit',
      { ...coverage(list), statuses: counts, confidentlyWrong: wrong },
      'Worlds whose lines are drawn away from the template: coverage below the one-sigma band means the curvature uncertainty is too small for a template that is not the object.'
    );
  }

  if (wanted('R2.')) {
    const L = lim('R2.breakSystematics');
    const { u } = drawsOf(SEEDS.systematics, 'params');
    const out = {};
    for (const kind of KINDS) {
      const acc = {
        z: Object.fromEntries(L.zErrors.map(e => [e, []])),
        ebv: Object.fromEntries(L.ebv.map(e => [e, []])),
        emission: [],
      };
      for (let i = 0; i < L.n; i++) {
        const z = u(0.05, 0.3);
        const base = world(kind, z, { noise: false, snr: 50 });
        const truth = base.truth.breakTruth.D;
        for (const e of L.zErrors) {
          const b = brk(base, z + e);
          if (b.D !== undefined) acc.z[e].push(b.D / truth - 1);
        }
        for (const e of L.ebv) {
          const w = world(kind, z, { noise: false, snr: 50, ebv: e, RV: L.RV });
          const b = brk(w, z);
          if (b.D !== undefined) acc.ebv[e].push(b.D / truth - 1);
        }
        const w = world(kind, z, {
          noise: false,
          snr: 50,
          extraLines: [
            {
              id: 'invented-emission',
              kind: 'emission',
              restNm: 380,
              fractionOfHBeta: L.emissionFractionOfHBeta,
            },
          ],
        });
        const b = brk(w, z);
        if (b.D !== undefined) acc.emission.push(b.D / truth - 1);
      }
      out[kind] = {
        redshiftError: Object.fromEntries(
          Object.entries(acc.z).map(([e, a]) => [e, sig(mean(a))])
        ),
        dustEbv: Object.fromEntries(
          Object.entries(acc.ebv).map(([e, a]) => [e, sig(mean(a))])
        ),
        emissionInBlueBand: sig(mean(acc.emission)),
        n: acc.emission.length,
      };
    }
    reported(
      'R2.breakSystematics',
      out,
      'Mean relative bias of the break against the unperturbed truth (a fraction): each stated limit of D has a number.'
    );
  }

  if (wanted('R3.')) {
    const L = lim('R3.lineMethodDomain');
    const { u } = drawsOf(SEEDS.report, 'params');
    const run = (kind, extra) => {
      const lineList = [];
      const xcList = [];
      let answered = 0;
      let wrong = 0;
      for (let i = 0; i < L.n; i++) {
        const z = u(0.01, 0.3);
        const w = world(kind, z, {
          seed: `r3-${kind}-${i}`,
          snr: u(5, 15),
          ...extra,
        });
        const l = linesZ(w);
        if (l.status === 'ok') {
          answered++;
          lineList.push({ value: l.z, sigma: l.sigmaZ, truth: z });
          if (Math.abs(l.z - z) > Math.max(5 * l.sigmaZ, 1e-3)) wrong++;
        }
        const r = xc(w, kind);
        if (r.sigmaZ !== undefined)
          xcList.push({ value: r.z, sigma: r.sigmaZ, truth: z });
      }
      return {
        lines: {
          answeredFraction: answered / L.n,
          wrongFraction: wrong / Math.max(1, answered),
          ...(lineList.length ? coverage(lineList) : {}),
        },
        correlation: coverage(xcList),
      };
    };
    reported(
      'R3.lineMethodDomain',
      {
        passive: run('passive', {}),
        starFormingBroadBalmer: run('star-forming', {
          broadBalmerKmS: L.broadSigmaKmS,
        }),
      },
      'The line method is built for resolved emission lines; passive and broad-line spectra are where it answers less often or wrongly, and the correlation is the comparison.'
    );
  }

  // ---- D2b: a spectrum flat in F_nu (the follow-up, followup-thresholds.json) ---------------------

  if (wanted('D2b.')) {
    const L = lim('D2b.flatFnuSpectrum');
    const per = [];
    let ok = true;
    for (const z of L.z) {
      const w = world('flat', 0, { noise: false, snr: 10, alpha: -2 });
      const r = xc(w, 'passive');
      const l = linesZ(w);
      const b = brk(w, z);
      const good =
        r.status === 'refused' &&
        r.code === 'no-structure' &&
        l.status === 'not-constrained' &&
        l.code === 'too-few-features' &&
        b.status === 'ok' &&
        Math.abs(b.D - 1) <= L.maxBreakError &&
        b.breakPresent === false;
      if (!good) ok = false;
      per.push({
        z,
        xc: r.code,
        lines: l.code,
        breakD: b.D,
        breakPresent: b.breakPresent,
      });
    }
    row(
      'D2b.flatFnuSpectrum',
      ok,
      { per },
      'The break is 1 to 1e-15 with no break flagged, and the line method is not constrained, as committed. The correlation is not refused no-structure: a spectrum flat in F_nu is a power law in F_lambda, which the 101-sample high-pass does not remove exactly, so a smooth residual correlates weakly with the template and the answer is returned with the low-significance flag (q under 10, never ok). The committed expectation presumed a constant spectrum. Left failing as committed; a later contract should expect "not ok" here.'
    );
  }

  // ---- D3b: the same mismatched worlds with the goodness-of-fit refusal --------------------------

  if (wanted('D3b.')) {
    const L = lim('D3b.templateMismatchWithFitTest');
    const { u } = drawsOf(FOLLOWUP.seeds.mismatch, 'params');
    let wrong = 0;
    let misfit = 0;
    let okCount = 0;
    const total = 2 * L.n;
    for (let i = 0; i < total; i++) {
      const kind = KINDS[i % 2];
      const other = KINDS[(i + 1) % 2];
      const z = u(0.01, 0.3);
      const w = world(kind, z, { seed: `d3-${i}`, snr: u(5, 15) });
      const r = xc(w, other, { refuseMisfit: true });
      if (confidentlyWrong(r, z)) wrong++;
      if (r.code === 'template-misfit') misfit++;
      if (r.status === 'ok') okCount++;
    }
    // the exact-template worlds of C1: the test must not refuse good fits
    const { u: u1 } = drawsOf(FOLLOWUP.seeds.ensembleXc, 'params');
    const list = [];
    let falseRefusals = 0;
    let exactWrong = 0;
    for (let i = 0; i < L.exactTemplateWorlds; i++) {
      const kind = KINDS[i % 2];
      const z = u1(0.01, 0.3);
      const snr = u1(5, 15);
      const r = xc(world(kind, z, { seed: `c1-${i}`, snr }), kind, {
        refuseMisfit: true,
      });
      if (r.code === 'template-misfit') falseRefusals++;
      if (confidentlyWrong(r, z)) exactWrong++;
      if (r.sigmaZ !== undefined)
        list.push({ value: r.z, sigma: r.sigmaZ, truth: z });
    }
    const c = coverage(list);
    row(
      'D3b.templateMismatchWithFitTest',
      wrong / total <= L.maxWrongFraction &&
        falseRefusals / L.exactTemplateWorlds <= L.maxFalseRefusalFraction &&
        inRange(c.coverage, L.coverageBand) &&
        inRange(c.sdZ, L.sdBand),
      {
        mismatchedWorlds: total,
        confidentlyWrong: wrong,
        confidentlyWrongFraction: wrong / total,
        refusedAsMisfit: misfit,
        statusOk: okCount,
        exactTemplate: {
          worlds: L.exactTemplateWorlds,
          falseRefusals,
          falseRefusalFraction: falseRefusals / L.exactTemplateWorlds,
          confidentlyWrong: exactWrong,
          ...c,
        },
      },
      'See GALAXY_SPECTRA.md, "Follow-up: the goodness-of-fit refusal".'
    );
  }

  // ---- R1b: the misfit worlds of R1 with the refusal --------------------------------------------

  if (wanted('R1b.')) {
    const L = lim('R1b.templateMisfitWithFitTest');
    const { u } = drawsOf(SEEDS.misfit, 'params');
    const list = [];
    let refusedMisfit = 0;
    let wrong = 0;
    for (let i = 0; i < L.n; i++) {
      const kind = KINDS[i % 2];
      const z = u(0.01, 0.3);
      const K = G.GALAXY_WORLD.kinds[kind];
      const lineScale = {};
      for (const id of [
        ...Object.keys(K.absorption ?? {}),
        ...Object.keys(K.emission ?? {}),
      ])
        lineScale[id] = u(0.7, 1.3);
      const extra =
        kind === 'star-forming'
          ? [
              {
                id: 'invented-emission',
                kind: 'emission',
                restNm: 545,
                fractionOfHBeta: 0.2,
              },
            ]
          : [
              {
                id: 'invented-absorption',
                kind: 'absorption',
                restNm: 460,
                depth: 0.15,
                sigmaKmS: 250,
              },
            ];
      const w = world(kind, z, {
        seed: `r1-${i}`,
        snr: u(5, 15),
        lineScale,
        sigmaScale: u(0.8, 1.25),
        extraLines: extra,
      });
      const r = xc(w, kind, { refuseMisfit: true });
      if (r.code === 'template-misfit') refusedMisfit++;
      else if (r.sigmaZ !== undefined)
        list.push({ value: r.z, sigma: r.sigmaZ, truth: z });
      if (confidentlyWrong(r, z)) wrong++;
    }
    reported(
      'R1b.templateMisfitWithFitTest',
      {
        n: L.n,
        refusedAsMisfit: refusedMisfit,
        confidentlyWrong: wrong,
        notRefused: list.length ? coverage(list) : null,
      },
      'The strict test refuses worlds whose lines are drawn away from the template (strengths up to 30 percent, widths 20 to 25 percent, one extra line) at these signal to noise; those it lets through are the closest matches.'
    );
  }

  const cpu = process.cpuUsage(cpu0);
  rows.push({
    id: '_cpu',
    status: 'info',
    measured: { cpuSeconds: sig((cpu.user + cpu.system) / 1e6, 3) },
    note: 'recorded, not compared',
  });
  return rows;
}

// ---- command line ---------------------------------------------------------------------------------------------------

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const onlyArg = args.find(a => a.startsWith('--only='));
  const only = onlyArg ? onlyArg.slice(7).split(',').filter(Boolean) : [];
  const all = runValidation({ only });
  const rows = all.filter(r => r.id !== '_cpu');
  const sorted = [...rows].sort((a, b) =>
    a.id < b.id ? -1 : a.id > b.id ? 1 : 0
  );
  if (args.includes('--json')) {
    process.stdout.write(`${JSON.stringify(all)}\n`);
  } else {
    for (const r of sorted)
      console.log(
        `${r.status.toUpperCase().padEnd(8)} ${r.id.padEnd(40)} ${JSON.stringify(r.measured).slice(0, 400)}`
      );
    const count = s => rows.filter(r => r.status === s).length;
    console.log(
      `\n${rows.length} rows: ${count('pass')} pass, ${count('fail')} fail, ${count('reported')} reported, ${count('not-run')} not run`
    );
  }
  if (args.includes('--write-results') && !only.length)
    writeFileSync(
      path.join(ROOT, DIR, 'results.json'),
      `${JSON.stringify({ format: 'gravitas.galaxy-results/1', rows: sorted }, null, 2)}\n`
    );
  if (args.includes('--write-failed') && !only.length)
    writeFileSync(
      path.join(ROOT, DIR, 'failed-legs.json'),
      `${JSON.stringify(
        {
          format: 'gravitas.galaxy-failed-legs/1',
          label:
            'These legs crossed a committed bound and stay failing; only Carl resets one.',
          legs: sorted
            .filter(r => r.status === 'fail')
            .map(r => ({ id: r.id, measured: r.measured, note: r.note })),
        },
        null,
        2
      )}\n`
    );
  process.exitCode = rows.some(r => r.status === 'fail') ? 1 : 0;
}
