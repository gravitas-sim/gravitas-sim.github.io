#!/usr/bin/env node
// =============================================================================
// The moving-cluster follow-up gate stream (Roadmap III, Prompt 234 Part A
// follow-up; a prototype on spike/moving-cluster-followup, never merged)
// -----------------------------------------------------------------------------
//   node tools/moving-cluster-followup.mjs --write-oracle-inputs DIR
//   node tools/moving-cluster-followup.mjs --out FILE [--oracle FILE] [--only=K1,K5]
//   node tools/moving-cluster-followup.mjs --write-fixtures FILE [--oracle FILE]
//
// Every bound is read from followup-thresholds.json (committed 1d71cd33, amended
// by AM4 and AM5 before any gate seed). Part A files are read, never written.
// The fixtures directory is --fixtures DIR (default: the docs worktree's).
// =============================================================================

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import * as MC from '../js/kernels/galactic/movingCluster.js';
import * as CE from '../js/kernels/galactic/movingClusterCorrected.js';
import { realization } from '../js/kernels/galactic/movingClusterSynthetic.js';
import { clusterParallax } from '../js/kernels/galactic/astrometry.js';
import { parallaxZeroPoint } from '../js/kernels/galactic/zeropoint.js';
import { stream } from '../js/random/streams.js';

const args = process.argv.slice(2);
const flag = f => args.includes(f);
const opt = (name, dflt = null) => {
  const a = args.find(x => x.startsWith(`--${name}=`));
  if (a) return a.slice(name.length + 3);
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--')
    ? args[i + 1]
    : dflt;
};

const FIX = opt(
  'fixtures',
  '/Users/carl/Desktop/Gravitas/worktrees/p234b/tests/fixtures/moving-cluster'
);
const readJson = f => JSON.parse(readFileSync(path.join(FIX, f), 'utf8'));
const sha = f => createHash('sha256').update(readFileSync(path.join(FIX, f))).digest('hex');
const PART_A = readJson('thresholds.json');
const FU = readJson('followup-thresholds.json');
const PUB_CP = readJson('published-cp.json');
const PUB_D = readJson('published-distance.json');
const SHAS = {
  thresholds: sha('thresholds.json'),
  followupThresholds: sha('followup-thresholds.json'),
  publishedCp: sha('published-cp.json'),
  publishedDistance: sha('published-distance.json'),
};
const TR = PART_A.syntheticTruth;
const CHECKS = Object.fromEntries(FU.checks.map(c => [c.id, c]));
const lim = id => CHECKS[id].limits;
const DESIGN = flag('--design'); // the design seed: synthetic data only, for debugging the oracle
const DESIGN_SEED = 'moving-cluster-234-followup-design';
const [G1, G2, G3] = FU.seeds.gate;
const [S1, S2, S3] = DESIGN ? [DESIGN_SEED, DESIGN_SEED, DESIGN_SEED] : [G1, G2, G3];
const DATA_FILE =
  '/Users/carl/Desktop/Gravitas/scratch-data/gaia234/hyades.csv';

const sig = (v, d = 4) => (Number.isFinite(v) ? Number(v.toPrecision(d)) : v);
const med = a => MC.median(a);
const quant = (a, p) => MC.percentile(Float64Array.from(a).sort(), p);
const frac = (a, f) => (a.length ? a.filter(f).length / a.length : NaN);
const cpuSeconds = () => {
  const u = process.cpuUsage();
  return (u.user + u.system) / 1e6;
};
const DEG = Math.PI / 180;

// ---- ensembles -----------------------------------------------------------------

const VARIANTS = {
  E1: { seed: S1, n: 200, o: {} },
  E7: { seed: S1, n: 200, o: { internalSigma: 1.0 } },
  E8: { seed: S1, n: 200, o: { separationDeg: 60 } },
  E3: { seed: S2, n: 50, o: { withRv: false } },
  E5: { seed: S2, n: 100, o: { internalSigma: 5 } },
  E6: { seed: S2, n: 100, o: { expansion: 0.05 } },
};
const make = (name, k, extra = {}) => {
  const v = VARIANTS[name];
  return realization(TR, {
    seed: v.seed,
    variant: name,
    index: k,
    ...v.o,
    ...extra,
  });
};
export const ORACLE_CASES = [
  { id: 'O1', gen: () => make('E1', 0), baseline: true },
  { id: 'O2', gen: () => make('E1', 1), baseline: true },
  { id: 'O3', gen: () => make('E1', 2), baseline: true },
  { id: 'O4', gen: () => make('E7', 0), baseline: true },
  { id: 'O5', gen: () => make('E8', 0), baseline: true },
  { id: 'O6', gen: () => make('E3', 0), baseline: false },
];
const withPmErrors = (rows, zero = false) =>
  rows.map(r => ({
    ...r,
    pmraError: zero ? 0 : r.parallaxError,
    pmdecError: zero ? 0 : r.parallaxError,
  }));

function weightedTruth(used, truth) {
  let sw = 0;
  let swp = 0;
  for (const s of used) {
    if (!truth.isMember[s.index]) continue;
    const w = 1 / (s.parallaxError * s.parallaxError);
    sw += w;
    swp += w * truth.plxTrue[s.index];
  }
  return sw ? swp / sw : NaN;
}

const plxOf = used =>
  clusterParallax({
    stars: used.map(s => ({
      parallax: s.parallax,
      error: s.parallaxError,
      zeroPoint: s.zeroPoint,
    })),
  });

/** One realization through the follow-up pipeline (CE) and, beside it, the plain estimator on the same members. */
export function evaluate(r, B, randCE, randPlain) {
  const stars = CE.prepareCE(withPmErrors(r.rows));
  const res = CE.analyseCE(stars);
  const isMember = r.truth.isMember;
  const out = {
    status: res.status,
    reason: res.reason ?? null,
    nMembers: res.nMembers ?? 0,
  };
  if (res.cpVector) {
    out.cpErrDeg = MC.angleBetween(res.cpVector, r.truth.cpVector);
    out.tauDeg = (Math.sqrt(res.tau2) / DEG);
    out.ceIterations = res.ceIterations;
    out.plainCpErrDeg = MC.angleBetween(res.plain.cpVector, r.truth.cpVector);
  }
  if (res.status === 'ok') {
    const full = B ? CE.withIntervalCE(stars, res, B, randCE) : res;
    out.status = full.status;
    out.reason = full.reason ?? null;
    out.piMC = res.piMC;
    out.piTrue = weightedTruth(res.usedStars, r.truth);
    out.relBias = res.piMC / out.piTrue - 1;
    if (B && full.bootstrap && Number.isFinite(full.sigmaMC)) {
      const bs = full.bootstrap;
      out.sigmaMC = full.sigmaMC;
      out.z = (res.piMC - out.piTrue) / full.sigmaMC;
      out.covered68 = out.piTrue >= bs.i68[0] && out.piTrue <= bs.i68[1];
      out.covered95 = out.piTrue >= bs.i95[0] && out.piTrue <= bs.i95[1];
      const cp = plxOf(res.usedStars);
      const diff = Math.abs(res.piMC - cp.mean);
      const comb = Math.sqrt(full.sigmaMC ** 2 + cp.statError ** 2);
      out.agree =
        diff <= lim('K8.agree').nSigma * comb &&
        diff / cp.mean <= lim('K8.agree').cap;
    }
    // the plain estimator on the same members, for the REPORTED comparison
    if (B && randPlain && res.plain.status === 'ok') {
      const pfull = MC.withInterval(stars, res.plain, B, randPlain);
      const pt = weightedTruth(res.plain.usedStars, r.truth);
      out.plain = {
        status: pfull.status,
        relBias: res.plain.piMC / pt - 1,
      };
      if (Number.isFinite(pfull.sigmaMC)) {
        out.plain.z = (res.plain.piMC - pt) / pfull.sigmaMC;
        out.plain.c68 =
          pt >= pfull.bootstrap.i68[0] && pt <= pfull.bootstrap.i68[1];
        out.plain.c95 =
          pt >= pfull.bootstrap.i95[0] && pt <= pfull.bootstrap.i95[1];
      }
    }
  }
  if (res.status === 'cp-only') out.hasSpeed = res.V !== undefined || res.piMC !== undefined;
  out._res = res;
  out._stars = stars;
  return out;
}
const strip = o => {
  const { _res, _stars, ...rest } = o;
  void _res;
  void _stars;
  return rest;
};

// ---- the real file ---------------------------------------------------------------

export function readCsv(file) {
  const text = readFileSync(file, 'utf8').trim().split('\n');
  const head = text[0].split(',');
  const num = v => (v === '' || v === undefined ? NaN : Number(v));
  return text.slice(1).map(line => {
    const f = line.split(',');
    const o = {};
    head.forEach((h, i) => (o[h] = f[i]));
    return {
      id: o.source_id,
      ra: num(o.ra),
      dec: num(o.dec),
      parallax: num(o.parallax),
      parallaxError: num(o.parallax_error),
      pmra: num(o.pmra),
      pmdec: num(o.pmdec),
      pmraError: num(o.pmra_error),
      pmdecError: num(o.pmdec_error),
      rv: num(o.radial_velocity),
      rvError: num(o.radial_velocity_error),
      g: num(o.phot_g_mean_mag),
      ruwe: num(o.ruwe),
      params: num(o.astrometric_params_solved),
      nuEff: num(o.nu_eff_used_in_astrometry),
      pseudocolour: num(o.pseudocolour),
      eclLat: num(o.ecl_lat),
    };
  });
}

export function realRows(file) {
  const raw = readCsv(file);
  const hash = createHash('sha256').update(readFileSync(file)).digest('hex');
  if (hash !== PART_A.data.sha256)
    throw new Error(`hyades.csv sha256 ${hash} is not the committed one`);
  const rows = raw.map(r => {
    const ok = (r.params === 31 || r.params === 95) && r.ruwe < 1.4;
    if (!ok) return { ...r, parallaxError: NaN };
    const z = parallaxZeroPoint({
      g: r.g,
      nuEff: r.nuEff,
      pseudocolour: r.pseudocolour,
      eclLat: r.eclLat,
      params: r.params,
    });
    if (z.status === 'refused' || !Number.isFinite(z.value))
      return { ...r, parallaxError: NaN };
    return { ...r, zeroPoint: z.value };
  });
  return { rows, sha: hash };
}

// ---- helpers for the comparisons ---------------------------------------------------

const jaccard = (a, b) => {
  const A = new Set(a);
  const inter = b.filter(x => A.has(x)).length;
  const union = A.size + b.length - inter;
  return union ? inter / union : 1;
};
const pubCp = which =>
  PUB_CP.values.find(v => v.stars === which).convergentPoint_deg;
const unitRaDec = (ra, dec) => [
  Math.cos(dec * DEG) * Math.cos(ra * DEG),
  Math.cos(dec * DEG) * Math.sin(ra * DEG),
  Math.sin(dec * DEG),
];
const pubDist = which => {
  const v = PUB_D.sources[0].values.find(x => x.stars === which).distance_pc;
  return {
    pi: 1000 / v.value,
    sigma: (1000 * v.uncertainty) / (v.value * v.value),
  };
};
const quoted = key => {
  const v = PUB_D.sources[1].quoted[key];
  return {
    pi: 1000 / v.value,
    sigma: (1000 * v.uncertainty) / (v.value * v.value),
  };
};

// ---- the legs ------------------------------------------------------------------

export function runLegs({ oracle, csv, only }) {
  const rows = [];
  const row = (id, pass, measured, note = '') =>
    rows.push({ id, status: pass ? 'pass' : 'fail', measured, note });
  const reported = (id, measured, note = '') =>
    rows.push({ id, status: 'reported', measured, note });
  const notRun = (id, note) =>
    rows.push({ id, status: 'not-run', measured: null, note });
  const want = id => !only || only.includes(id);
  const ens = {};
  const log = msg => process.stderr.write(`[followup] ${msg}\n`);
  const real = {};

  // ---- K1: analytic -------------------------------------------------------------
  if (want('K1')) {
    const L = lim('K1.exact');
    const worst = { cp: 0, plain: 0, tau2: 0, rel: 0, status: [] };
    for (let k = 0; k < L.realizations; k++) {
      const r = realization(TR, {
        seed: S1,
        variant: 'A1',
        index: k,
        noiseFree: true,
        internalSigma: 0,
        field: false,
      });
      const stars = CE.prepareCE(withPmErrors(r.rows, true));
      const res = CE.analyseCE(stars);
      worst.status.push(res.status);
      if (res.status !== 'ok') {
        worst.cp = Infinity;
        continue;
      }
      worst.cp = Math.max(worst.cp, MC.angleBetween(res.cpVector, r.truth.cpVector));
      worst.plain = Math.max(worst.plain, MC.angleBetween(res.cpVector, res.plain.cpVector));
      worst.tau2 = Math.max(worst.tau2, res.tau2);
      let wr = Math.abs(res.V / r.truth.speed - 1);
      for (let j = 0; j < res.usedStars.length; j++)
        wr = Math.max(
          wr,
          Math.abs(res.perStar[j] / r.truth.plxTrue[res.usedStars[j].index] - 1)
        );
      wr = Math.max(wr, Math.abs(res.piMC / weightedTruth(res.usedStars, r.truth) - 1));
      worst.rel = Math.max(worst.rel, wr);
    }
    row(
      'K1.exact',
      worst.cp <= L.maxCpErrorDeg &&
        worst.plain <= L.maxCpErrorDeg &&
        worst.tau2 <= L.maxTau2 &&
        worst.rel <= L.maxRel,
      {
        maxCpErrDeg: sig(worst.cp),
        maxCeVsPlainDeg: sig(worst.plain),
        maxTau2: sig(worst.tau2),
        maxRel: sig(worst.rel),
        status: worst.status,
      }
    );
    log('K1 done');
  }

  // ---- K2: closed forms by hand -------------------------------------------------
  if (want('K2')) {
    const L = lim('K2.hand');
    const relErr = (x, y) => Math.abs(x / y - 1);
    // (a)
    const a = CE.noiseVariance(0.01 * 0.01, 0.5, 0.1 * 0.1, 100);
    const aRel = relErr(a, 4.01e-4);
    // (b) twelve stars with offsets b.c = +-0.01 rad, sin theta = 1, no measurement term
    const c0 = [0, 0, 1];
    // a star at polar angle phi from c0 (so sin theta = sin phi) and azimuth alpha, whose
    // normal b is perpendicular to n with b . c0 = off exactly: b = cos(beta) w + sin(beta) u,
    // u the unit direction to c0 on the sky, w = n x u, sin(beta) = off / sin(phi); t = b x n
    const star = (off, alpha, phi) => {
      const n = [Math.sin(phi) * Math.cos(alpha), Math.sin(phi) * Math.sin(alpha), Math.cos(phi)];
      const u = [(0 - Math.cos(phi) * n[0]) / Math.sin(phi), (0 - Math.cos(phi) * n[1]) / Math.sin(phi), (1 - Math.cos(phi) * n[2]) / Math.sin(phi)];
      const w = MC.cross(n, u);
      const sb = off / Math.sin(phi);
      const cb = Math.sqrt(1 - sb * sb);
      const b = [cb * w[0] + sb * u[0], cb * w[1] + sb * u[1], cb * w[2] + sb * u[2]];
      const t = MC.cross(b, n);
      const mu = 100;
      const dec = Math.PI / 2 - phi;
      return {
        n,
        b,
        t,
        mu,
        p: [mu * t[0], mu * t[1], mu * t[2]],
        e: [-Math.sin(alpha), Math.cos(alpha), 0],
        g: [-Math.cos(alpha) * Math.sin(dec), -Math.sin(alpha) * Math.sin(dec), Math.cos(dec)],
        pmraError: 0,
        pmdecError: 0,
      };
    };
    const twelve = [];
    for (let i = 0; i < 12; i++)
      twelve.push(star(i % 2 ? 0.01 : -0.01, (i * 2 * Math.PI) / 12, (40 + 4 * i) * DEG));
    const cmB = CE.correctedMatrix(twelve, c0);
    const bRel = relErr(cmB.tau2, 1.2e-4);
    // (c) 40 stars exactly on great circles through c: tau^2 = 0, CE equals the plain point
    const cTrue = unitRaDec(100, 0);
    const forty = [];
    for (let i = 0; i < 40; i++) {
      const ra = 66.75 + 15 * Math.cos(i * 2.4);
      const dec = 15.87 + 12 * Math.sin(i * 1.7);
      const n = unitRaDec(ra, dec);
      const cn = MC.dot(cTrue, n);
      const w = [cTrue[0] - cn * n[0], cTrue[1] - cn * n[1], cTrue[2] - cn * n[2]];
      const sn = MC.norm(w);
      const t = w.map(x => x / sn);
      const mu = 80 + i;
      const a2 = ra * DEG;
      const d2 = dec * DEG;
      const e = [-Math.sin(a2), Math.cos(a2), 0];
      const g = [-Math.cos(a2) * Math.sin(d2), -Math.sin(a2) * Math.sin(d2), Math.cos(d2)];
      forty.push({ n, t, b: MC.cross(n, t), mu, p: t.map(x => x * mu), e, g, pmraError: 0, pmdecError: 0 });
    }
    const ceC = CE.fitConvergentPointCE(forty);
    const plainC = MC.fitConvergentPoint(forty);
    const cRad = MC.angleBetween(ceC.c, plainC) * DEG;
    // (d) three stated stars: S* entry by entry, written out here
    const stated = [
      { az: 0.3, ph: 0.7, off: 0.004, mu: 90, ra: 0.2, de: 0.1 },
      { az: 1.9, ph: 1.1, off: -0.006, mu: 110, ra: 0.3, de: 0.15 },
      { az: 4.2, ph: 0.9, off: 0.002, mu: 70, ra: 0.1, de: 0.4 },
    ].map(o => {
      const s = star(o.off, o.az, o.ph);
      s.mu = o.mu;
      s.p = s.t.map(x => x * o.mu);
      s.pmraError = o.ra;
      s.pmdecError = o.de;
      return s;
    });
    const cm = CE.correctedMatrix(stated, c0);
    const manual = [
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
    ];
    {
      let lam = 0;
      let sumM = 0;
      const parts = stated.map(s => {
        const off = s.b[2];
        const sn = Math.sqrt(1 - s.n[2] ** 2);
        const be = s.b[0] * s.e[0] + s.b[1] * s.e[1] + s.b[2] * s.e[2];
        const bg = s.b[0] * s.g[0] + s.b[1] * s.g[1] + s.b[2] * s.g[2];
        const s2 = be * be * s.pmraError ** 2 + bg * bg * s.pmdecError ** 2;
        lam += off * off;
        sumM += (sn * sn * s2) / (s.mu * s.mu);
        return { sn, s2 };
      });
      const tau2 = Math.max(0, ((lam * 3) / (3 - 2) - sumM) / 3);
      stated.forEach((s, i) => {
        const d2 = tau2 / (parts[i].sn * parts[i].sn) + parts[i].s2 / (s.mu * s.mu);
        for (let x = 0; x < 3; x++)
          for (let y = 0; y < 3; y++)
            manual[x][y] += s.b[x] * s.b[y] - d2 * s.t[x] * s.t[y];
      });
    }
    let dMax = 0;
    let scale = 0;
    for (let x = 0; x < 3; x++)
      for (let y = 0; y < 3; y++) {
        dMax = Math.max(dMax, Math.abs(cm.S[x][y] - manual[x][y]));
        scale = Math.max(scale, Math.abs(manual[x][y]));
      }
    const dRel = dMax / scale;
    row(
      'K2.hand',
      aRel <= L.maxRel && bRel <= L.maxRel && cRad <= L.maxRad && dRel <= L.maxRel,
      {
        a_relative: sig(aRel),
        b_tau2Relative: sig(bRel),
        c_ceVsPlainRad: sig(cRad),
        c_tau2: sig(ceC.tau2),
        d_matrixRelative: sig(dRel),
      }
    );
    log('K2 done');
  }

  // ---- ensembles -----------------------------------------------------------------
  const runEns = (name, B, plainToo) => {
    const V = VARIANTS[name];
    const evs = [];
    for (let k = 0; k < V.n; k++) {
      const r = make(name, k);
      evs.push(
        strip(
          evaluate(
            r,
            B,
            stream('noise', V.seed, 'bs', name, k),
            plainToo ? stream('noise', V.seed, 'bsplain', name, k) : null
          )
        )
      );
    }
    ens[name] = evs;
    log(`${name} done`);
    return evs;
  };
  const covStats = evs => {
    const ok = evs.filter(e => e.status === 'ok' && Number.isFinite(e.z));
    return {
      cov68: evs.filter(e => e.covered68 === true).length / evs.length,
      cov95: evs.filter(e => e.covered95 === true).length / evs.length,
      medZ: ok.length ? med(ok.map(e => e.z)) : Infinity,
      medRel: ok.length ? med(ok.map(e => e.relBias)) : Infinity,
      n: ok.length,
    };
  };
  const tally = a => {
    const o = {};
    for (const x of a) o[x] = (o[x] ?? 0) + 1;
    return o;
  };
  if (['K4', 'K5', 'K6', 'K7', 'K8', 'K9', 'K13'].some(want)) {
    const evs = runEns('E1', 400, true);
    const withCp = evs.filter(e => e.cpErrDeg !== undefined);
    const ok = evs.filter(e => e.status === 'ok');
    const st = covStats(evs);
    if (want('K4')) {
      const L = lim('K4.cp');
      const errs = withCp.map(e => e.cpErrDeg);
      const refusedFrac = frac(evs, e => e.status === 'refused');
      const m = errs.length ? med(errs) : Infinity;
      const p95 = errs.length ? quant(errs, 0.95) : Infinity;
      row(
        'K4.cp',
        m <= L.maxMedianDeg && p95 <= L.maxP95Deg && refusedFrac <= L.maxRefusedFraction,
        {
          medianDeg: sig(m),
          p95Deg: sig(p95),
          refusedFraction: sig(refusedFrac),
          plainMedianDeg: sig(med(withCp.map(e => e.plainCpErrDeg))),
          medianTauDeg: sig(med(withCp.map(e => e.tauDeg))),
          maxCeIterations: Math.max(...withCp.map(e => e.ceIterations)),
        }
      );
    }
    const statuses = tally(evs.map(e => e.status + (e.reason ? `:${e.reason}` : '')));
    if (want('K5')) {
      const L = lim('K5.coverage68');
      row('K5.coverage68', st.cov68 >= L.min && st.cov68 <= L.max, {
        coverage: sig(st.cov68),
        ok: ok.length,
        of: evs.length,
        statuses,
      });
    }
    if (want('K6')) {
      const L = lim('K6.coverage95');
      row('K6.coverage95', st.cov95 >= L.min && st.cov95 <= L.max, {
        coverage: sig(st.cov95),
        ok: ok.length,
        of: evs.length,
        statuses,
      });
    }
    if (want('K7')) {
      const L = lim('K7.recovery');
      row(
        'K7.recovery',
        Math.abs(st.medZ) <= L.maxAbsMedianZ && Math.abs(st.medRel) <= L.maxAbsMedianRel,
        { medianZ: sig(st.medZ), medianRelBias: sig(st.medRel), n: st.n }
      );
    }
    if (want('K8')) {
      const L = lim('K8.agree');
      const f = evs.filter(e => e.agree === true).length / evs.length;
      row('K8.agree', f >= L.minFraction, { fractionAgree: sig(f) });
    }
    if (want('K9')) {
      const L = lim('K9.useful');
      const rel = ok.filter(e => Number.isFinite(e.sigmaMC)).map(e => e.sigmaMC / e.piMC);
      const m = rel.length ? med(rel) : Infinity;
      row('K9.useful', m <= L.maxMedianRel, { medianSigmaRel: sig(m), n: rel.length });
    }
    if (want('K13')) {
      const pl = evs.filter(e => e.plain);
      const z = pl.filter(e => Number.isFinite(e.plain.z));
      reported('K13.report.plain', {
        n: pl.length,
        medianZ: sig(med(z.map(e => e.plain.z))),
        medianRelBias: sig(med(pl.map(e => e.plain.relBias))),
        coverage68: sig(pl.filter(e => e.plain.c68 === true).length / evs.length),
        coverage95: sig(pl.filter(e => e.plain.c95 === true).length / evs.length),
        note: 'the plain eigenvector estimator on the same members and realizations as K4 to K9',
      });
    }
  }
  const fourLeg = (id, name) => {
    if (!want(id.split('.')[0])) return;
    const evs = runEns(name, 400, false);
    const L = lim(id);
    const st = covStats(evs);
    row(
      id,
      st.cov68 >= L.coverage68.min &&
        st.cov68 <= L.coverage68.max &&
        st.cov95 >= L.coverage95.min &&
        st.cov95 <= L.coverage95.max &&
        Math.abs(st.medZ) <= L.maxAbsMedianZ &&
        Math.abs(st.medRel) <= L.maxAbsMedianRel,
      {
        coverage68: sig(st.cov68),
        coverage95: sig(st.cov95),
        medianZ: sig(st.medZ),
        medianRelBias: sig(st.medRel),
        ok: st.n,
        of: evs.length,
        statuses: tally(evs.map(e => e.status + (e.reason ? `:${e.reason}` : ''))),
      }
    );
  };
  fourLeg('K11.dispersion1', 'E7');
  fourLeg('K12.separation60', 'E8');
  if (want('K10')) {
    const evs = runEns('E3', 0, false);
    const L = lim('K10.noRv.cp');
    const returned = evs.filter(e => e.cpErrDeg !== undefined);
    const fr = returned.length / evs.length;
    const m = returned.length ? med(returned.map(e => e.cpErrDeg)) : Infinity;
    const nullFrac = returned.length
      ? returned.filter(
          e => e.status === 'cp-only' && e.reason === 'no-rv' && !e.hasSpeed
        ).length / returned.length
      : 0;
    row('K10.noRv.cp', fr >= L.minFractionReturned && m <= L.maxMedianDeg && nullFrac >= L.minFractionNull, {
      fractionReturned: sig(fr),
      medianDeg: sig(m),
      plainMedianDeg: sig(med(returned.map(e => e.plainCpErrDeg))),
      fractionNull: sig(nullFrac),
    });
  }
  if (want('K14')) {
    const evs = runEns('E5', 400, false);
    const ret = evs.filter(e => e.status === 'ok' && Number.isFinite(e.z));
    reported('K14.report.dispersion5', {
      realizations: evs.length,
      refusedFraction: sig(frac(evs, e => e.status === 'refused')),
      returnedDistance: ret.length,
      coverage68OfReturned: ret.length ? sig(ret.filter(e => e.covered68).length / ret.length) : null,
      coverage95OfReturned: ret.length ? sig(ret.filter(e => e.covered95).length / ret.length) : null,
      statuses: tally(evs.map(e => e.status + (e.reason ? `:${e.reason}` : ''))),
    });
  }
  if (want('K15')) {
    const evs = runEns('E6', 400, false);
    const st = covStats(evs);
    reported('K15.report.expansion', {
      realizations: evs.length,
      medianZ: sig(st.medZ),
      medianRelBias: sig(st.medRel),
      coverage68: sig(st.cov68),
      n: st.n,
    });
  }
  if (want('KP1')) {
    const r = make('E1', 0);
    const stars = CE.prepareCE(withPmErrors(r.rows));
    const res = CE.analyseCE(stars);
    const Ms = res.members.map(i => stars[i]);
    const t0 = cpuSeconds();
    for (let i = 0; i < 20; i++) CE.fitConvergentPointCE(Ms);
    const fit = (cpuSeconds() - t0) / 20;
    const t1 = cpuSeconds();
    CE.bootstrapSetCE(Ms, 4000, stream('noise', S3, 'speed'));
    const bs = cpuSeconds() - t1;
    reported('KP1.speed', { cpuSecondsOneCeFit: sig(fit), cpuSeconds4000ReplicateBootstrap: sig(bs) });
  }

  // ---- the oracle on the synthetic cases ----------------------------------------
  if (want('K3')) {
    if (!oracle?.cases) {
      notRun('K3a.oracle.cp.synthetic', 'no oracle output supplied');
      notRun('K3b.oracle.dist.synthetic', 'no oracle output supplied');
    } else {
      const La = lim('K3a.oracle.cp.synthetic');
      const Lb = lim('K3b.oracle.dist.synthetic');
      const A = { jac: [], deg: 0, tau: 0, it: 0, status: true, cases: [] };
      const Bm = { rel: 0, sigma: 0, cases: [] };
      for (const oc of ORACLE_CASES) {
        const r = oc.gen();
        const stars = CE.prepareCE(withPmErrors(r.rows));
        const res = CE.analyseCE(stars);
        const o = oracle.cases.find(c => c.id === oc.id).ce;
        const ids = (res.members ?? []).map(i => stars[i].index);
        A.jac.push(jaccard(ids, o.members ?? []));
        A.status = A.status && res.status === o.status && (res.reason ?? null) === (o.reason ?? null);
        if (res.cpVector && o.cp) {
          A.deg = Math.max(A.deg, MC.angleBetween(res.cpVector, o.cp));
          A.tau = Math.max(A.tau, Math.abs(res.tau2 / o.tau2 - 1));
          A.it = Math.max(A.it, Math.abs(res.ceIterations - o.iterations));
        } else if (res.cpVector || o.cp) A.deg = Infinity;
        A.cases.push({ id: oc.id, status: [res.status, o.status] });
        if (res.status === 'ok' && o.status === 'ok') {
          const prod = new Map(res.usedStars.map((s, k) => [s.index, res.perStar[k]]));
          let w = 0;
          for (const [idx, val] of o.perStar)
            w = Math.max(w, prod.has(idx) ? Math.abs(prod.get(idx) / val - 1) : Infinity);
          w = Math.max(w, Math.abs(res.V / o.V - 1), Math.abs(res.piMC / o.piMC - 1));
          Bm.rel = Math.max(Bm.rel, w);
          if (oc.baseline) {
            const bs = CE.bootstrapSetCE(
              res.members.map(i => stars[i]),
              Lb.bootstrap,
              stream('noise', S2, 'orc-bs', oc.id)
            );
            Bm.sigma = Math.max(Bm.sigma, Math.abs(bs.sigma / o.sigmaMC - 1));
          }
        }
      }
      row(
        'K3a.oracle.cp.synthetic',
        Math.min(...A.jac) >= La.minJaccard &&
          A.status &&
          A.deg <= La.maxDeg &&
          A.tau <= La.maxRelTau2 &&
          A.it <= La.maxIterationDifference,
        {
          minJaccard: Math.min(...A.jac),
          statusAndReasonAgree: A.status,
          maxCpDeg: sig(A.deg),
          maxRelTau2: sig(A.tau),
          maxIterationDifference: A.it,
          cases: A.cases,
        }
      );
      row('K3b.oracle.dist.synthetic', Bm.rel <= Lb.maxRel && Bm.sigma <= Lb.maxRelSigma, {
        maxRel: sig(Bm.rel),
        maxRelSigma: sig(Bm.sigma),
      });
      log('K3 done');
    }
  }

  // ---- the real sample ------------------------------------------------------------
  if (['RK', 'K16'].some(want)) {
    const { rows: rrows, sha: dsha } = realRows(csv ?? DATA_FILE);
    const stars = CE.prepareCE(rrows);
    const res = CE.analyseCE(stars);
    const info = { sha256: dsha, stars: stars.length };
    row(
      'RK1.members',
      res.status !== 'refused' && res.ceIterations > 0 && (res.rvMembers ?? 0) >= lim('RK1.members').minMembersWithRv,
      {
        ...info,
        status: res.status,
        reason: res.reason ?? null,
        members: res.nMembers ?? 0,
        membersWithRv: res.rvMembers ?? 0,
        membershipSteps: res.steps ?? null,
        ceIterations: res.ceIterations ?? null,
      }
    );
    real.info = info;
    real.status = res.status;
    real.members = res.nMembers ?? 0;
    const failRest = note => {
      for (const id of ['RK2.agree', 'RK3.useful', 'RK4.split', 'RK5.cpSplit', 'RK7.published.cp', 'RK8.published.distance'])
        row(id, false, { status: res.status, reason: res.reason ?? null }, note);
    };
    if (res.status !== 'ok') failRest('the follow-up pipeline did not return a distance');
    else {
      real.cp = { ra: sig(res.cp.ra, 6), dec: sig(res.cp.dec, 6) };
      real.V = sig(res.V);
      real.memberDigest = createHash('sha256')
        .update(res.members.map(i => rrows[stars[i].index].id).sort().join(','))
        .digest('hex');
      const bs = CE.withIntervalCE(stars, res, 4000, stream('noise', S3, 'real-bs'));
      const plx = plxOf(res.usedStars);
      if (!Number.isFinite(bs.sigmaMC)) failRest(`no interval: ${bs.status} ${bs.reason ?? ''}`);
      else {
        const L2 = lim('RK2.agree');
        const diff = Math.abs(res.piMC - plx.mean);
        const comb = Math.sqrt(bs.sigmaMC ** 2 + plx.statError ** 2);
        row('RK2.agree', diff <= L2.nSigma * comb && diff / plx.mean <= L2.cap, {
          ratioMCoverPlx: sig(res.piMC / plx.mean, 6),
          sigmasCombined: sig(diff / comb),
          sigmaMCRel: sig(bs.sigmaMC / res.piMC),
        }, 'ratio of the two parallaxes; the moving-cluster distance is not reported below a ratified verdict A');
        row('RK3.useful', bs.sigmaMC / res.piMC <= lim('RK3.useful').maxRel, {
          sigmaMCRel: sig(bs.sigmaMC / res.piMC),
        });
        real.ratio = res.piMC / plx.mean;
        real.sigmaMCRel = bs.sigmaMC / res.piMC;
        // halves
        const members = res.members.map(i => stars[i]);
        const draw = stream('noise', S3, 'halves');
        const idx = members.map((_, i) => i);
        for (let i = idx.length - 1; i > 0; i--) {
          const j = Math.floor(draw() * (i + 1));
          [idx[i], idx[j]] = [idx[j], idx[i]];
        }
        const h = Math.floor(idx.length / 2);
        const hA = idx.slice(0, h).map(i => members[i]);
        const hB = idx.slice(h).map(i => members[i]);
        const est = set => {
          const ce = CE.fitConvergentPointCE(set);
          if (!ce.converged) return null;
          const d = CE.refineCE
            ? (() => {
                const sp = MC.fitSpeed(set, ce.c);
                if (!(sp.V > 0)) return null;
                const used = [];
                const pis = [];
                for (const s of set) {
                  const g = MC.towards(s, ce.c);
                  const pi = MC.starParallax(g.muPar, g.sin, sp.V);
                  if (Number.isFinite(pi)) {
                    used.push(s);
                    pis.push(pi);
                  }
                }
                return used.length >= 5 ? MC.weightedMean(used, pis) : null;
              })()
            : null;
          return d === null ? null : { c: ce.c, piMC: d };
        };
        const eA = est(hA);
        const eB = est(hB);
        if (eA && eB) {
          const bA = CE.bootstrapSetCE(hA, 4000, stream('noise', S3, 'half-bs', 'A'));
          const bB = CE.bootstrapSetCE(hB, 4000, stream('noise', S3, 'half-bs', 'B'));
          const dpi = Math.abs(eA.piMC - eB.piMC);
          const combH = Math.sqrt(bA.sigma ** 2 + bB.sigma ** 2);
          row('RK4.split', dpi <= lim('RK4.split').nSigma * combH, {
            halfSizes: [hA.length, hB.length],
            relDifference: sig(eA.piMC / eB.piMC - 1),
            sigmasCombined: sig(dpi / combH),
          });
          const rA = MC.cpRadius(bA.cps, eA.c);
          const rB = MC.cpRadius(bB.cps, eB.c);
          const sep = MC.angleBetween(eA.c, eB.c);
          row('RK5.cpSplit', sep <= lim('RK5.cpSplit').nSigma * Math.sqrt(rA ** 2 + rB ** 2), {
            separationDeg: sig(sep),
            radiusADeg: sig(rA),
            radiusBDeg: sig(rB),
          });
        } else {
          row('RK4.split', false, { note: 'a half returned no estimate' });
          row('RK5.cpSplit', false, { note: 'a half returned no estimate' });
        }
        // published convergent point (RK7)
        {
          const L7 = lim('RK7.published.cp');
          const p10 = pubCp(134);
          const p20 = pubCp(180);
          const cpub10 = unitRaDec(p10.alpha, p10.delta);
          const cpub20 = unitRaDec(p20.alpha, p20.delta);
          const r = MC.cpRadius(bs.bootstrap.cps, res.cpVector);
          const f = (L7.floorVelocityKmS / res.V) / DEG;
          const T = Math.sqrt((L7.nSigma * r) ** 2 + f * f);
          const sep = MC.angleBetween(res.cpVector, cpub10);
          row('RK7.published.cp', sep <= T, {
            separationDeg: sig(sep),
            toleranceDeg: sig(T),
            bootstrapRadiusDeg: sig(r),
            floorDeg: sig(f),
            separationOverRadius: sig(sep / r),
          }, 'the published convergent point has no printed uncertainty');
          real.published = { sep10: sep, r, f, T };
          // plain estimate and the 20 pc point (reported)
          const plain = res.plain;
          reported('RK7r.report.published', {
            ce_vs_pub20_deg: sig(MC.angleBetween(res.cpVector, cpub20)),
            plain_vs_pub10_deg: sig(MC.angleBetween(plain.cpVector, cpub10)),
            plain_vs_pub20_deg: sig(MC.angleBetween(plain.cpVector, cpub20)),
            ce_vs_pub10_over_r: sig(sep / r),
            pub10_vs_pub20_deg: sig(MC.angleBetween(cpub10, cpub20)),
            speed_difference_km_s: sig(res.V - PUB_CP.values[0].speed_km_s.value),
            speed_difference_over_printed_sigma: sig((res.V - PUB_CP.values[0].speed_km_s.value) / PUB_CP.values[0].speed_km_s.uncertainty),
          });
        }
        // published distance (RK8): relative difference and sigma units only
        {
          const L8 = lim('RK8.published.distance');
          const pd = pubDist(134);
          const d_pub = 1000 / pd.pi;
          const g = (L8.spreadPc / d_pub) ** 2;
          const diffP = Math.abs(res.piMC - pd.pi);
          const comb8 = Math.sqrt(bs.sigmaMC ** 2 + pd.sigma ** 2);
          const tol = Math.sqrt(9 * comb8 ** 2 + (g * pd.pi) ** 2);
          row('RK8.published.distance', diffP <= tol && diffP / pd.pi <= L8.cap, {
            relDifference: sig(res.piMC / pd.pi - 1),
            sigmasCombined: sig(diffP / comb8),
            toleranceOverPi: sig(tol / pd.pi),
            floorRel: sig(g),
            relSigmaMC: sig(bs.sigmaMC / res.piMC),
            relSigmaPub: sig(pd.sigma / pd.pi),
          }, 'recorded as a relative difference and sigma units; no parallax or distance of the moving-cluster estimate is written');
          const plainBs = MC.withInterval(stars, res.plain, 4000, stream('noise', S3, 'real-bs-plain'));
          const plainPlx = plxOf(res.plain.usedStars);
          const rel = (pi, sg, pub) => ({
            relDifference: sig(pi / pub.pi - 1),
            sigmas: sig((pi - pub.pi) / Math.sqrt(sg ** 2 + pub.sigma ** 2)),
          });
          reported('RK8r.report.published', {
            ce_vs_perryman134: rel(res.piMC, bs.sigmaMC, pubDist(134)),
            ce_vs_perryman180: rel(res.piMC, bs.sigmaMC, pubDist(180)),
            plain_vs_perryman134: Number.isFinite(plainBs.sigmaMC) ? rel(res.plain.piMC, plainBs.sigmaMC, pubDist(134)) : null,
            plx233_vs_perryman134: rel(plx.mean, plx.statError, pubDist(134)),
            ce_vs_gaiaDR2_secondHand: rel(res.piMC, bs.sigmaMC, quoted('gaia_dr2_pc')),
            ce_vs_gaiaDR1_secondHand: rel(res.piMC, bs.sigmaMC, quoted('gaia_dr1_pc')),
            plx233_vs_gaiaDR2_secondHand: rel(plx.mean, plx.statError, quoted('gaia_dr2_pc')),
            note: 'the Gaia values are second-hand quotations of Roser et al. 2019, not primary sources',
          });
          reported('RK6.report.shift', {
            cpShiftPlainToCeDeg: sig(MC.angleBetween(res.plain.cpVector, res.cpVector)),
            tauDeg: sig(Math.sqrt(res.tau2) / DEG),
            impliedInternalScatterKmS: sig(Math.sqrt(res.tau2) * res.V),
            ceIterations: res.ceIterations,
            ratioPlain: sig(res.plain.piMC / plainPlx.mean, 6),
            ratioCe: sig(res.piMC / plx.mean, 6),
            sigmaMCRelPlain: Number.isFinite(plainBs.sigmaMC) ? sig(plainBs.sigmaMC / res.plain.piMC) : null,
            sigmaMCRelCe: sig(bs.sigmaMC / res.piMC),
          });
        }
        real.bs = { B: 4000, discarded: bs.bootstrap.discarded };
      }
    }
    // oracle on the real file
    const orc = oracle?.real?.ce;
    if (!orc) {
      notRun('K16a.oracle.cp.real', 'no oracle output supplied');
      notRun('K16b.oracle.dist.real', 'no oracle output supplied');
    } else {
      const La = lim('K16a.oracle.cp.real');
      const Lb = lim('K16b.oracle.dist.real');
      const ids = (res.members ?? []).map(i => stars[i].index);
      const jac = jaccard(ids, orc.members ?? []);
      const cpOk = res.cpVector && orc.cp;
      const d = cpOk ? MC.angleBetween(res.cpVector, orc.cp) : Infinity;
      const dt = cpOk ? Math.abs(res.tau2 / orc.tau2 - 1) : Infinity;
      row('K16a.oracle.cp.real', jac >= La.minJaccard && res.status === orc.status && d <= La.maxDeg && dt <= La.maxRelTau2, {
        jaccard: jac,
        production: res.status,
        oracle: orc.status,
        cpDeg: sig(d),
        relTau2: sig(dt),
      });
      if (res.status === 'ok' && orc.status === 'ok') {
        const prod = new Map(res.usedStars.map((s, k) => [s.index, res.perStar[k]]));
        let w = 0;
        for (const [idx, val] of orc.perStar)
          w = Math.max(w, prod.has(idx) ? Math.abs(prod.get(idx) / val - 1) : Infinity);
        const bsB = CE.bootstrapSetCE(
          res.members.map(i => stars[i]),
          Lb.bootstrap,
          stream('noise', S3, 'real-bs-oracle')
        );
        const relSig = Math.abs(bsB.sigma / orc.sigmaMC - 1);
        const relV = Math.abs(res.V / orc.V - 1);
        const relPi = Math.abs(res.piMC / orc.piMC - 1);
        row('K16b.oracle.dist.real', relV <= Lb.maxRel && relPi <= Lb.maxRel && w <= Lb.maxRel && relSig <= Lb.maxRelSigma, {
          relV: sig(relV),
          relPi: sig(relPi),
          relPerStar: sig(w),
          relSigma: sig(relSig),
        });
        real.oracle = { perStarSha256: createHash('sha256').update(JSON.stringify(orc.perStar)).digest('hex') };
      } else
        row('K16b.oracle.dist.real', res.status === orc.status, { production: res.status, oracle: orc.status }, 'no distance to compare');
    }
    notRun('RK9.isochrone', 'no Gaia-band isochrone set or band transformation in the repository; an age is not typed here (fetch request 3 of MOVING_CLUSTER_GATE.md)');
  }
  return { rows, ensembles: ens, real };
}

// ---- verdict ---------------------------------------------------------------------

export function verdictOf(rows) {
  const status = id => rows.find(r => r.id === id)?.status ?? 'not-run';
  const legs = FU.checks.filter(c => c.set === 'S' || c.set === 'R');
  const bad = grp => legs.filter(c => c.group === grp && status(c.id) !== 'pass').map(c => c.id);
  const geo = bad('geo');
  const dist = bad('dist');
  return { verdict: geo.length ? 'C' : dist.length ? 'B' : 'A', geoFailing: geo, distFailing: dist };
}

// ---- main ------------------------------------------------------------------------

async function main() {
  if (flag('--write-oracle-inputs')) {
    const dir = opt('write-oracle-inputs');
    mkdirSync(dir, { recursive: true });
    const cases = ORACLE_CASES.map(oc => {
      const r = oc.gen();
      return {
        id: oc.id,
        baseline: oc.baseline,
        rows: withPmErrors(r.rows).map(x => ({
          ...x,
          rv: Number.isFinite(x.rv) ? x.rv : null,
          rvError: Number.isFinite(x.rvError) ? x.rvError : null,
        })),
      };
    });
    writeFileSync(
      path.join(dir, 'synthetic.json'),
      JSON.stringify({ thresholdsSha256: SHAS.thresholds, followupSha256: SHAS.followupThresholds, cases })
    );
    if (!DESIGN) {
      const { rows } = realRows(opt('csv', DATA_FILE));
      writeFileSync(
        path.join(dir, 'real-zeropoints.json'),
        JSON.stringify({
          thresholdsSha256: SHAS.thresholds,
          zeroPoints: rows.map(r => (Number.isFinite(r.parallaxError) ? r.zeroPoint : null)),
        })
      );
    }
    process.stderr.write(`wrote ${cases.length} synthetic cases to ${dir}${DESIGN ? ' (design seed)' : ''}\n`);
    return;
  }
  const oracleFile = opt('oracle');
  const oracle = oracleFile ? JSON.parse(readFileSync(oracleFile, 'utf8')) : null;
  const only = opt('only') ? opt('only').split(',') : null;
  const t0 = Date.now();
  const out = runLegs({ oracle, csv: opt('csv'), only });
  const part = {
    format: 'gravitas.moving-cluster-followup-results/1',
    shas: SHAS,
    node: process.version,
    spike: (() => {
      try {
        const git = (...a) =>
          execFileSync('git', a, { cwd: path.dirname(fileURLToPath(import.meta.url)) })
            .toString()
            .trim();
        return { commit: git('rev-parse', 'HEAD'), clean: git('status', '--porcelain') === '' };
      } catch {
        return null;
      }
    })(),
    date: new Date().toISOString(),
    elapsedS: (Date.now() - t0) / 1000,
    verdict: verdictOf(out.rows),
    rows: out.rows,
    ensembles: out.ensembles,
    real: out.real,
  };
  const target = opt('out');
  if (target) writeFileSync(target, JSON.stringify(part));
  for (const r of out.rows)
    process.stdout.write(`${r.status.toUpperCase().padEnd(8)} ${r.id.padEnd(30)} ${JSON.stringify(r.measured)?.slice(0, 240)}\n`);
  process.stdout.write(`follow-up verdict ${part.verdict.verdict}; geo failing ${part.verdict.geoFailing.join(',') || '-'}; dist failing ${part.verdict.distFailing.join(',') || '-'}\n`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
