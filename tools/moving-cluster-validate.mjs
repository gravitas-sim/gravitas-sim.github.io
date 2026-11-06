#!/usr/bin/env node
// =============================================================================
// The moving-cluster gate stream (Roadmap III, Prompt 234 Part A; a prototype on
// spike/moving-cluster-gate, never merged)
// -----------------------------------------------------------------------------
//   node tools/moving-cluster-validate.mjs --write-oracle-inputs DIR
//   node tools/moving-cluster-validate.mjs --form=committed|amended --out FILE
//        [--oracle FILE] [--csv FILE] [--only=A,C]
//   node tools/moving-cluster-validate.mjs --merge FILE FILE --out-dir DIR
//
// tests/fixtures/moving-cluster/thresholds.json fixed every bound before any code
// existed (and its amendments before this stream ran). The bounds are read from
// that file. Every leg is measured for the COMMITTED form (binding) and the
// AMENDED form (a proposal for Carl). Synthetic data carries a truth manifest.
// =============================================================================

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import * as MC from '../js/kernels/galactic/movingCluster.js';
import { realization } from '../js/kernels/galactic/movingClusterSynthetic.js';
import { clusterParallax } from '../js/kernels/galactic/astrometry.js';
import { parallaxZeroPoint } from '../js/kernels/galactic/zeropoint.js';
import { stream } from '../js/random/streams.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR = path.join(ROOT, 'tests/fixtures/moving-cluster');
const THR_PATH = path.join(DIR, 'thresholds.json');
const THRESHOLDS = JSON.parse(readFileSync(THR_PATH, 'utf8'));
const THR_SHA = createHash('sha256')
  .update(readFileSync(THR_PATH))
  .digest('hex');
const TR = THRESHOLDS.syntheticTruth;
const CHECKS = Object.fromEntries(THRESHOLDS.checks.map(c => [c.id, c]));
const lim = id => CHECKS[id].limits;
const SEEDS = THRESHOLDS.seeds.synthetic;
const DATA_FILE =
  '/Users/carl/Desktop/Gravitas/scratch-data/gaia234/hyades.csv';

export const FORMS = {
  committed: { seed: 'density', qAlways: false, recallWindow: false },
  amended: { seed: 'cp', qAlways: true, recallWindow: true },
};

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
const sig = (v, d = 4) => (Number.isFinite(v) ? Number(v.toPrecision(d)) : v);
const med = a => MC.median(a);
const frac = (a, f) => (a.length ? a.filter(f).length / a.length : NaN);
const quant = (a, p) => MC.percentile(Float64Array.from(a).sort(), p);
const cpuSeconds = () => {
  const u = process.cpuUsage();
  return (u.user + u.system) / 1e6;
};

// ---- ensembles -----------------------------------------------------------------

const VARIANTS = {
  E1: { seed: SEEDS[0], n: 200, o: {} },
  E2: { seed: SEEDS[1], n: 100, o: { cluster: false } },
  E3: { seed: SEEDS[1], n: 50, o: { withRv: false } },
  E4: { seed: SEEDS[1], n: 100, o: { members: 15 } },
  E5: { seed: SEEDS[2], n: 100, o: { internalSigma: 5 } },
  E6: { seed: SEEDS[2], n: 100, o: { expansion: 0.05 } },
};
const NOISE_FREE = {
  noiseFree: true,
  internalSigma: 0,
  field: false,
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
const makeA = (variant, k, extra = {}) =>
  realization(TR, {
    seed: SEEDS[0],
    variant,
    index: k,
    ...NOISE_FREE,
    ...extra,
  });

// The oracle realizations: pinned inputs (O1 to O6).
export const ORACLE_CASES = [
  { id: 'O1', gen: () => make('E1', 0), baseline: true },
  { id: 'O2', gen: () => make('E1', 1), baseline: true },
  { id: 'O3', gen: () => make('E1', 2), baseline: true },
  { id: 'O4', gen: () => make('E2', 0), baseline: false },
  { id: 'O5', gen: () => make('E3', 0), baseline: false },
  { id: 'O6', gen: () => make('E4', 0), baseline: false },
];

// ---- one realization through the pipeline --------------------------------------

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

function windowMembers(truth) {
  // members (true) whose true parallax is within 30 percent of the median true parallax
  const p = [];
  for (let i = 0; i < truth.isMember.length; i++)
    if (truth.isMember[i]) p.push(truth.plxTrue[i]);
  const m = med(p);
  const inWin = new Set();
  for (let i = 0; i < truth.isMember.length; i++)
    if (truth.isMember[i] && Math.abs(truth.plxTrue[i] / m - 1) <= 0.3)
      inWin.add(i);
  return inWin;
}

export function evaluate(r, form, B, rand) {
  const F = FORMS[form];
  const stars = MC.prepare(r.rows);
  const res = MC.analyse(stars, { seed: F.seed, qAlways: F.qAlways });
  const isMember = r.truth.isMember;
  const nMem = isMember.filter(Boolean).length;
  const out = {
    status: res.status,
    reason: res.reason ?? null,
    nMembers: res.nMembers ?? 0,
    trueMembers: nMem,
  };
  if (res.cpVector) {
    const sel = res.members.map(i => stars[i].index);
    const tm = sel.filter(i => isMember[i]).length;
    out.recall = nMem ? tm / nMem : NaN;
    out.purity = sel.length ? tm / sel.length : NaN;
    const win = windowMembers(r.truth);
    out.recallWindow = win.size
      ? sel.filter(i => win.has(i)).length / win.size
      : NaN;
    out.cpErrDeg = MC.angleBetween(res.cpVector, r.truth.cpVector);
    out.cp = res.cp;
  }
  if (res.status === 'ok') {
    const full = B ? MC.withInterval(stars, res, B, rand) : res;
    out.status = full.status;
    out.reason = full.reason ?? null;
    out.V = res.V;
    out.piMC = res.piMC;
    out.piTrue = weightedTruth(res.usedStars, r.truth);
    out.nUsed = res.nUsed;
    out.relBias = res.piMC / out.piTrue - 1;
    // per-star check against the truth (analytic legs)
    let worst = 0;
    for (let k = 0; k < res.usedStars.length; k++) {
      const s = res.usedStars[k];
      worst = Math.max(
        worst,
        Math.abs(res.perStar[k] / r.truth.plxTrue[s.index] - 1)
      );
    }
    out.maxRelPerStar = worst;
    out.relV = Math.abs(res.V / r.truth.speed - 1);
    if (B && full.bootstrap && Number.isFinite(full.sigmaMC)) {
      const bs = full.bootstrap;
      out.sigmaMC = full.sigmaMC;
      out.z = (res.piMC - out.piTrue) / full.sigmaMC;
      out.covered68 = out.piTrue >= bs.i68[0] && out.piTrue <= bs.i68[1];
      out.covered95 = out.piTrue >= bs.i95[0] && out.piTrue <= bs.i95[1];
      const cp = clusterParallax({
        stars: res.usedStars.map(s => ({
          parallax: s.parallax,
          error: s.parallaxError,
          zeroPoint: s.zeroPoint,
        })),
      });
      out.piPlx = cp.mean;
      const diff = Math.abs(res.piMC - cp.mean);
      const comb = Math.sqrt(full.sigmaMC ** 2 + cp.statError ** 2);
      out.agree =
        diff <= lim('C6.agree').nSigma * comb &&
        diff / cp.mean <= lim('C6.agree').cap;
    }
  }
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

// ---- the legs ------------------------------------------------------------------

export function runLegs(form, { oracle, csv, only }) {
  const rows = [];
  const row = (id, pass, measured, note = '') =>
    rows.push({
      form,
      id,
      status: pass ? 'pass' : 'fail',
      measured,
      note,
    });
  const reported = (id, measured, note = '') =>
    rows.push({ form, id, status: 'reported', measured, note });
  const notRun = (id, note) =>
    rows.push({ form, id, status: 'not-run', measured: null, note });
  const want = id => !only || only.some(p => id.startsWith(p));
  const F = FORMS[form];
  const ens = {};
  const log = msg => process.stderr.write(`[${form}] ${msg}\n`);

  // ---- A: analytic -------------------------------------------------------------
  const noiseFree = (variant, extra = {}) => {
    const out = [];
    for (let k = 0; k < 3; k++) {
      const r = makeA(variant, k, extra);
      out.push(evaluate(r, form, 0, null));
    }
    return out;
  };
  const recallKey = F.recallWindow ? 'recallWindow' : 'recall';
  if (want('A1') || want('A2')) {
    const ev = noiseFree('A1');
    if (want('A1')) {
      const cpErr = Math.max(...ev.map(e => e.cpErrDeg ?? Infinity));
      const rec = Math.min(...ev.map(e => e[recallKey] ?? 0));
      row(
        'A1.cp.exact',
        cpErr <= lim('A1.cp.exact').maxCpErrorDeg &&
          rec >= lim('A1.cp.exact').minRecall,
        {
          maxCpErrDeg: sig(cpErr),
          recall: ev.map(e => sig(e[recallKey])),
          recallAll: ev.map(e => sig(e.recall)),
          status: ev.map(e => e.status),
        },
        F.recallWindow
          ? 'recall over members inside the contract window (AM2)'
          : 'recall over every member the selection keeps (committed)'
      );
    }
    if (want('A2')) {
      const L = lim('A2.dist.exact');
      const okAll = ev.every(e => e.status === 'ok');
      const relV = Math.max(...ev.map(e => e.relV ?? Infinity));
      const relS = Math.max(...ev.map(e => e.maxRelPerStar ?? Infinity));
      const relC = Math.max(
        ...ev.map(e => Math.abs(e.piMC / e.piTrue - 1) || 0)
      );
      row(
        'A2.dist.exact',
        okAll &&
          relV <= L.maxRelSpeed &&
          relS <= L.maxRelPerStar &&
          relC <= L.maxRelCluster,
        {
          relV: sig(relV),
          relPerStar: sig(relS),
          relCluster: sig(relC),
          status: ev.map(e => e.status),
        }
      );
    }
  }
  if (want('A3')) {
    const L = lim('A3.hand');
    const v = MC.starParallax(
      L.muPar,
      Math.sin((L.thetaDeg * Math.PI) / 180),
      L.V
    );
    const rel = Math.abs(v / L.expected - 1);
    row('A3.hand', rel <= L.maxRel, { value: v, relDiff: sig(rel) });
  }
  if (want('A4')) {
    const L = lim('A4.approaching');
    const ev = noiseFree('A4', { separationDeg: L.separationDeg });
    const ok = ev.every(e => e.status === 'ok');
    const relV = Math.max(...ev.map(e => e.relV ?? Infinity));
    const relS = Math.max(...ev.map(e => e.maxRelPerStar ?? Infinity));
    const cpErr = Math.max(...ev.map(e => e.cpErrDeg ?? Infinity));
    row(
      'A4.approaching',
      ok &&
        ev.every(e => e.V > 0) &&
        relV <= L.maxRel &&
        relS <= L.maxRel &&
        cpErr <= L.maxCpErrorDeg,
      {
        relV: sig(relV),
        relPerStar: sig(relS),
        cpErrDeg: sig(cpErr),
        status: ev.map(e => e.status),
        reason: ev.map(e => e.reason),
      }
    );
  }
  if (want('A5')) {
    const L = lim('A5.perpendicular');
    const ev = noiseFree('A5', { separationDeg: L.separationDeg });
    const refused = frac(
      ev,
      e => e.status === 'cp-only' && e.reason === 'perpendicular'
    );
    const cpErr = Math.max(...ev.map(e => e.cpErrDeg ?? Infinity));
    row(
      'A5.perpendicular',
      refused >= L.minFractionRefused && cpErr <= L.maxCpErrorDeg,
      {
        fractionPerpendicular: refused,
        cpErrDeg: sig(cpErr),
        status: ev.map(e => e.status),
        reason: ev.map(e => e.reason),
      }
    );
  }
  if (want('A6')) {
    const L = lim('A6.greatCircle');
    const draw = stream('noise', SEEDS[0], 'A6');
    let maxOff = 0;
    let okTowards = 0;
    let okAway = 0;
    for (let k = 0; k < L.stars; k++) {
      const z = 2 * draw() - 1;
      const ph = 2 * Math.PI * draw();
      const rz = Math.sqrt(1 - z * z);
      const c = [rz * Math.cos(ph), rz * Math.sin(ph), z];
      const z2 = 2 * draw() - 1;
      const ph2 = 2 * Math.PI * draw();
      const r2 = Math.sqrt(1 - z2 * z2);
      const n = [r2 * Math.cos(ph2), r2 * Math.sin(ph2), z2];
      const ra = (Math.atan2(n[1], n[0]) * 180) / Math.PI;
      const dec = (Math.asin(n[2]) * 180) / Math.PI;
      const base = {
        ra,
        dec,
        parallax: 20,
        parallaxError: 0.1,
        pmra: 1,
        pmdec: 1,
      };
      const s0 = MC.prepare([base])[0];
      if (!s0) continue;
      // the unit tangent towards c at n
      const cn = MC.dot(c, n);
      const w = [c[0] - cn * n[0], c[1] - cn * n[1], c[2] - cn * n[2]];
      const sn = MC.norm(w);
      if (sn < 1e-6) continue;
      const u = [w[0] / sn, w[1] / sn, w[2] / sn];
      const a = (ra * Math.PI) / 180;
      const d = (dec * Math.PI) / 180;
      const e = [-Math.sin(a), Math.cos(a), 0];
      const g = [
        -Math.cos(a) * Math.sin(d),
        -Math.sin(a) * Math.sin(d),
        Math.cos(d),
      ];
      for (const sgn of [1, -1]) {
        const p = [u[0] * 50 * sgn, u[1] * 50 * sgn, u[2] * 50 * sgn];
        const s = MC.prepare([
          { ...base, pmra: MC.dot(p, e), pmdec: MC.dot(p, g) },
        ])[0];
        const t = MC.towards(s, c);
        const off = Math.abs(MC.dot(s.b, c));
        maxOff = Math.max(maxOff, off);
        if (sgn > 0 && t.tu > 0) okTowards++;
        if (sgn < 0 && t.tu < 0) okAway++;
      }
    }
    row(
      'A6.greatCircle',
      maxOff <= L.maxOffsetRad &&
        okTowards >= L.stars - 5 &&
        okAway >= L.stars - 5,
      { maxOffsetRad: sig(maxOff), towardsOk: okTowards, awayOk: okAway }
    );
  }

  // ---- B: the oracle (synthetic) -----------------------------------------------
  const oracleCases = oracle?.cases ?? null;
  const cmpOracle = (id, e, o) => {
    // e: production evaluation with _res; o: oracle record for this form
    const res = e._res;
    const m = {};
    m.statusAgree =
      res.status === o.status && (res.reason ?? null) === (o.reason ?? null);
    const a = new Set(
      res.members ? res.members.map(i => e._stars[i].index) : []
    );
    const b = new Set(o.members ?? []);
    const inter = [...a].filter(x => b.has(x)).length;
    m.jaccard = a.size + b.size === 0 ? 1 : inter / (a.size + b.size - inter);
    if (res.cpVector && o.cp) m.cpDeg = MC.angleBetween(res.cpVector, o.cp);
    if (res.status === 'ok' && o.status === 'ok') {
      m.relV = Math.abs(res.V / o.V - 1);
      m.relPi = Math.abs(res.piMC / o.piMC - 1);
      let w = 0;
      const prod = new Map(
        res.usedStars.map((s, k) => [s.index, res.perStar[k]])
      );
      for (const [idx, val] of o.perStar) {
        const v = prod.get(idx);
        w = v === undefined ? Infinity : Math.max(w, Math.abs(v / val - 1));
      }
      m.relPerStar = prod.size === o.perStar.length ? w : Infinity;
      m.sigmaProduction = e._sigma4000;
      m.sigmaOracle = o.sigmaMC;
      m.relSigma = Math.abs(e._sigma4000 / o.sigmaMC - 1);
    }
    return m;
  };
  if (oracleCases && (want('B1') || want('B2') || want('B3'))) {
    const per = [];
    for (const oc of ORACLE_CASES) {
      const rec = oracleCases.find(c => c.id === oc.id)?.forms?.[form];
      if (!rec) continue;
      const r = oc.gen();
      const e = evaluate(r, form, 0, null);
      if (oc.baseline && e.status === 'ok') {
        const bs = MC.bootstrap(
          e._stars,
          e._res,
          4000,
          stream('noise', SEEDS[3], 'oracle-bs', oc.id)
        );
        e._sigma4000 = bs.sigma;
      }
      per.push({
        id: oc.id,
        baseline: oc.baseline,
        ...cmpOracle(oc.id, e, rec),
      });
    }
    if (per.length === ORACLE_CASES.length) {
      if (want('B1'))
        row(
          'B1.oracle.members.synthetic',
          per.every(
            p =>
              p.jaccard >= lim('B1.oracle.members.synthetic').minJaccard &&
              p.statusAgree
          ),
          per.map(p => ({
            id: p.id,
            jaccard: p.jaccard,
            statusAgree: p.statusAgree,
          }))
        );
      if (want('B2')) {
        const L = lim('B2.oracle.cp.synthetic');
        const cps = per.filter(p => p.cpDeg !== undefined);
        row(
          'B2.oracle.cp.synthetic',
          cps.length > 0 && cps.every(p => p.cpDeg <= L.maxDeg),
          cps.map(p => ({ id: p.id, cpDeg: sig(p.cpDeg) }))
        );
      }
      if (want('B3')) {
        const L = lim('B3.oracle.dist.synthetic');
        const ds = per.filter(p => p.relPi !== undefined);
        if (!ds.length) {
          notRun(
            'B3.oracle.dist.synthetic',
            'no oracle case returned a distance in this form, so there is nothing to compare'
          );
        } else
          row(
            'B3.oracle.dist.synthetic',
            ds.length > 0 &&
              ds.every(
                p =>
                  p.relV <= L.maxRel &&
                  p.relPi <= L.maxRel &&
                  p.relPerStar <= L.maxRel &&
                  (p.relSigma === undefined ||
                    !p.baseline ||
                    p.relSigma <= L.maxRelSigma)
              ),
            ds.map(p => ({
              id: p.id,
              relV: sig(p.relV),
              relPi: sig(p.relPi),
              relPerStar: sig(p.relPerStar),
              relSigma: sig(p.relSigma),
            }))
          );
      }
    } else {
      for (const id of [
        'B1.oracle.members.synthetic',
        'B2.oracle.cp.synthetic',
        'B3.oracle.dist.synthetic',
      ])
        if (want(id.slice(0, 2)))
          notRun(id, 'the oracle output does not hold this form');
    }
  } else if (want('B1') || want('B2') || want('B3')) {
    for (const id of [
      'B1.oracle.members.synthetic',
      'B2.oracle.cp.synthetic',
      'B3.oracle.dist.synthetic',
    ])
      if (want(id.slice(0, 2))) notRun(id, 'no oracle output was supplied');
  }

  // ---- E1: the baseline ensemble -----------------------------------------------
  const wantC = ['C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7'].some(want);
  if (wantC) {
    const V = VARIANTS.E1;
    const evs = [];
    const t0 = cpuSeconds();
    for (let k = 0; k < V.n; k++) {
      const r = make('E1', k);
      const e = evaluate(r, form, 400, stream('noise', SEEDS[0], 'bs', k));
      evs.push(strip(e));
      if (k % 50 === 49)
        log(`E1 ${k + 1}/${V.n} (${(cpuSeconds() - t0).toFixed(0)} s)`);
    }
    ens.E1 = evs;
    const ok = evs.filter(e => e.status === 'ok');
    const withCp = evs.filter(e => e.cpErrDeg !== undefined);
    if (want('C1')) {
      const L = lim('C1.membership');
      const rec = med(withCp.map(e => e.recall));
      const pur = med(withCp.map(e => e.purity));
      row(
        'C1.membership',
        rec >= L.minMedianRecall && pur >= L.minMedianPurity,
        {
          medianRecall: sig(rec),
          medianPurity: sig(pur),
          withConvergentPoint: withCp.length,
          of: evs.length,
        }
      );
    }
    if (want('C2')) {
      const L = lim('C2.cp');
      const errs = withCp.map(e => e.cpErrDeg);
      const refusedFrac = frac(evs, e => e.status === 'refused');
      const m = errs.length ? med(errs) : Infinity;
      const p95 = errs.length ? quant(errs, 0.95) : Infinity;
      row(
        'C2.cp',
        m <= L.maxMedianDeg &&
          p95 <= L.maxP95Deg &&
          refusedFrac <= L.maxRefusedFraction,
        {
          medianDeg: sig(m),
          p95Deg: sig(p95),
          refusedFraction: sig(refusedFrac),
        }
      );
    }
    const cov = (key, id) => {
      const L = lim(id);
      const rate = evs.filter(e => e[key] === true).length / evs.length;
      row(id, rate >= L.min && rate <= L.max, {
        coverage: sig(rate),
        ok: ok.length,
        of: evs.length,
        statuses: tally(
          evs.map(e => e.status + (e.reason ? `:${e.reason}` : ''))
        ),
      });
    };
    if (want('C3')) cov('covered68', 'C3.coverage68');
    if (want('C4')) cov('covered95', 'C4.coverage95');
    if (want('C5')) {
      const L = lim('C5.recovery');
      const zs = ok.filter(e => Number.isFinite(e.z)).map(e => e.z);
      const rels = ok.map(e => e.relBias);
      const mz = zs.length ? med(zs) : Infinity;
      const mr = rels.length ? med(rels) : Infinity;
      row(
        'C5.recovery',
        Math.abs(mz) <= L.maxAbsMedianZ && Math.abs(mr) <= L.maxAbsMedianRel,
        { medianZ: sig(mz), medianRelBias: sig(mr), n: zs.length }
      );
    }
    if (want('C6')) {
      const L = lim('C6.agree');
      const f = evs.filter(e => e.agree === true).length / evs.length;
      row('C6.agree', f >= L.minFraction, { fractionAgree: sig(f) });
    }
    if (want('C7')) {
      const L = lim('C7.useful');
      const rel = ok
        .filter(e => Number.isFinite(e.sigmaMC))
        .map(e => e.sigmaMC / e.piMC);
      const m = rel.length ? med(rel) : Infinity;
      row('C7.useful', m <= L.maxMedianRel, {
        medianSigmaRel: sig(m),
        n: rel.length,
      });
    }
  }

  // ---- D: refusals -------------------------------------------------------------
  const runEns = (name, B) => {
    const V = VARIANTS[name];
    const evs = [];
    for (let k = 0; k < V.n; k++) {
      const r = make(name, k);
      evs.push(
        strip(evaluate(r, form, B, stream('noise', V.seed, 'bs', name, k)))
      );
    }
    ens[name] = evs;
    log(`${name} done`);
    return evs;
  };
  if (want('D1')) {
    const evs = runEns('E2', 0);
    const L = lim('D1.field');
    const f = frac(evs, e => e.status === 'refused');
    row('D1.field', f >= L.minFractionRefused, {
      fractionRefused: sig(f),
      reasons: tally(evs.map(e => e.status + ':' + e.reason)),
    });
  }
  if (want('D2')) {
    const evs = runEns('E3', 400);
    const L = lim('D2a.noRv.cp');
    const ret = evs.filter(e => e.cpErrDeg !== undefined);
    const fr = ret.length / evs.length;
    const m = ret.length ? med(ret.map(e => e.cpErrDeg)) : Infinity;
    const rc = ret.length ? med(ret.map(e => e.recall)) : 0;
    row(
      'D2a.noRv.cp',
      fr >= L.minFractionReturned &&
        m <= L.maxMedianDeg &&
        rc >= L.minMedianRecall,
      {
        fractionReturned: sig(fr),
        medianCpErrDeg: sig(m),
        medianRecall: sig(rc),
        reasons: tally(evs.map(e => e.status + ':' + e.reason)),
      }
    );
    const nul = ret.length ? ret.every(e => e.piMC === undefined) : false;
    row('D2b.noRv.refusal', nul, {
      returnedWithDistance: ret.filter(e => e.piMC !== undefined).length,
      returned: ret.length,
    });
  }
  if (want('D3')) {
    const evs = runEns('E5', 400);
    const L = lim('D3.dispersion');
    const safe = frac(evs, e => e.status !== 'ok' || e.covered95 === true);
    row('D3.dispersion', safe >= L.minFractionSafe, {
      fractionSafe: sig(safe),
      statuses: tally(evs.map(e => e.status + ':' + e.reason)),
    });
  }
  if (want('D4')) {
    const evs = runEns('E4', 0);
    const L = lim('D4.few');
    const f = frac(evs, e => e.status === 'refused');
    row('D4.few', f >= L.minFractionRefused, {
      fractionRefused: sig(f),
      reasons: tally(evs.map(e => e.status + ':' + e.reason)),
    });
  }
  if (want('D5')) {
    const evs = runEns('E6', 400);
    const ok = evs.filter(e => e.status === 'ok' && Number.isFinite(e.z));
    reported('D5.expansion', {
      ok: ok.length,
      of: evs.length,
      medianZ: sig(med(ok.map(e => e.z))),
      medianRelBias: sig(med(ok.map(e => e.relBias))),
      coverage68: sig(
        evs.filter(e => e.covered68 === true).length / evs.length
      ),
      coverage95: sig(
        evs.filter(e => e.covered95 === true).length / evs.length
      ),
    });
  }
  if (want('P1')) {
    const r = make('E1', 0);
    const t0 = cpuSeconds();
    const stars = MC.prepare(r.rows);
    const res = MC.analyse(stars, { seed: F.seed, qAlways: F.qAlways });
    const t1 = cpuSeconds();
    let t2 = t1;
    if (res.status === 'ok') {
      MC.bootstrap(stars, res, 4000, stream('noise', SEEDS[0], 'p1'));
      t2 = cpuSeconds();
    }
    reported(
      'P1.speed',
      { pipelineCpuS: sig(t1 - t0), bootstrap4000CpuS: sig(t2 - t1) },
      'recorded, not a physics bound'
    );
  }

  // ---- R: the real sample ------------------------------------------------------
  const wantR = ['R1', 'R2', 'R3', 'R4', 'R5', 'R6', 'B4', 'B5', 'B6'].some(
    want
  );
  let real = null;
  if (wantR) {
    real = runReal(form, F, csv);
    const { stars, res, info } = real;
    row(
      'R1.members',
      res.status !== 'refused' &&
        (res.rvMembers ?? 0) >= lim('R1.members').minMembersWithRv,
      {
        status: res.status,
        reason: res.reason ?? null,
        members: res.nMembers ?? 0,
        withRv: res.rvMembers ?? 0,
        steps: res.steps ?? null,
        ...info,
      }
    );
    if (res.status === 'ok' || res.status === 'cp-only') {
      const members = res.members.map(i => stars[i]);
      const halves = (() => {
        const draw = stream('noise', SEEDS[3], 'halves');
        const idx = members.map((_, i) => i);
        for (let i = idx.length - 1; i > 0; i--) {
          const j = Math.floor(draw() * (i + 1));
          [idx[i], idx[j]] = [idx[j], idx[i]];
        }
        const h = Math.floor(idx.length / 2);
        return [
          idx.slice(0, h).map(i => members[i]),
          idx.slice(h).map(i => members[i]),
        ];
      })();
      real.halves = halves;
    }
    if (res.status === 'ok') {
      const bs = MC.withInterval(
        stars,
        res,
        4000,
        stream('noise', SEEDS[3], 'real-bs')
      );
      real.bs = bs;
      const cp = clusterParallax({
        stars: res.usedStars.map(s => ({
          parallax: s.parallax,
          error: s.parallaxError,
          zeroPoint: s.zeroPoint,
        })),
      });
      real.plx = cp;
      const diff = Math.abs(res.piMC - cp.mean);
      if (Number.isFinite(bs.sigmaMC)) {
        const comb = Math.sqrt(bs.sigmaMC ** 2 + cp.statError ** 2);
        real.ratio = res.piMC / cp.mean;
        row(
          'R2.agree',
          diff <= lim('R2.agree').nSigma * comb &&
            diff / cp.mean <= lim('R2.agree').cap,
          {
            relDifference: sig(res.piMC / cp.mean - 1),
            sigmasCombined: sig(diff / comb),
            sigmaMCRel: sig(bs.sigmaMC / res.piMC),
            status: bs.status,
            reason: bs.reason ?? null,
          },
          'ratio of the two parallaxes; the distance is not reported below verdict A'
        );
        row('R3.useful', bs.sigmaMC / res.piMC <= lim('R3.useful').maxRel, {
          sigmaMCRel: sig(bs.sigmaMC / res.piMC),
        });
      } else {
        row('R2.agree', false, {
          status: bs.status,
          reason: bs.reason ?? null,
          note: 'no interval',
        });
        row('R3.useful', false, {
          status: bs.status,
          reason: bs.reason ?? null,
        });
      }
    } else {
      row('R2.agree', false, {
        status: res.status,
        reason: res.reason ?? null,
        note: 'no distance: the pipeline did not return one',
      });
      row('R3.useful', false, {
        status: res.status,
        reason: res.reason ?? null,
      });
    }
    if (real.halves) {
      const [hA, hB] = real.halves;
      const eA = MC.estimate(hA);
      const eB = MC.estimate(hB);
      const rB = (set, tag) =>
        MC.bootstrapSet(set, 4000, stream('noise', SEEDS[3], 'half-bs', tag));
      if (eA && eB) {
        const bA = rB(hA, 'A');
        const bB = rB(hB, 'B');
        const dpi = Math.abs(eA.piMC - eB.piMC);
        const comb = Math.sqrt(bA.sigma ** 2 + bB.sigma ** 2);
        row('R4.split', dpi <= lim('R4.split').nSigma * comb, {
          halfSizes: [hA.length, hB.length],
          relDifference: sig(eA.piMC / eB.piMC - 1),
          sigmasCombined: sig(dpi / comb),
        });
        const rA = MC.cpRadius(bA.cps, eA.c);
        const rBv = MC.cpRadius(bB.cps, eB.c);
        const sep = MC.angleBetween(eA.c, eB.c);
        row(
          'R5.cpSplit',
          sep <= lim('R5.cpSplit').nSigma * Math.sqrt(rA ** 2 + rBv ** 2),
          { separationDeg: sig(sep), radiusADeg: sig(rA), radiusBDeg: sig(rBv) }
        );
      } else {
        row('R4.split', false, { note: 'a half returned no speed' });
        row('R5.cpSplit', false, { note: 'a half returned no speed' });
      }
    } else {
      row('R4.split', false, { note: 'no members' });
      row('R5.cpSplit', false, { note: 'no members' });
    }
    if (res.cpVector) {
      const star1 = MC.prepare(real.rowsAll, 1.0);
      const res1 = MC.analyse(star1, { seed: F.seed, qAlways: F.qAlways });
      reported('R6.rvcut', {
        status: res1.status,
        members: res1.nMembers ?? 0,
        cpSeparationDeg: res1.cpVector
          ? sig(MC.angleBetween(res1.cpVector, res.cpVector))
          : null,
        relChangePi:
          res1.piMC && res.piMC ? sig(res1.piMC / res.piMC - 1) : null,
      });
    } else
      reported('R6.rvcut', {
        note: 'the full run returned no convergent point',
      });
    // real-file oracle
    const orc = oracle?.real?.forms?.[form];
    if (orc) {
      const ids = new Set(
        res.members ? res.members.map(i => stars[i].index) : []
      );
      const inter = (orc.members ?? []).filter(x => ids.has(x)).length;
      const jac =
        ids.size + (orc.members ?? []).length === 0
          ? 1
          : inter / (ids.size + orc.members.length - inter);
      row(
        'B4.oracle.members.real',
        jac >= lim('B4.oracle.members.real').minJaccard &&
          res.status === orc.status,
        {
          jaccard: jac,
          production: res.status,
          oracle: orc.status,
          reason: [res.reason ?? null, orc.reason ?? null],
        }
      );
      if (res.cpVector && orc.cp) {
        const d = MC.angleBetween(res.cpVector, orc.cp);
        row('B5.oracle.cp.real', d <= lim('B5.oracle.cp.real').maxDeg, {
          cpDeg: sig(d),
        });
      } else
        row('B5.oracle.cp.real', false, {
          note: 'no convergent point from one side',
        });
      if (res.status === 'ok' && orc.status === 'ok') {
        const L = lim('B6.oracle.dist.real');
        const prod = new Map(
          res.usedStars.map((s, k) => [s.index, res.perStar[k]])
        );
        let w = 0;
        for (const [idx, val] of orc.perStar)
          w = Math.max(
            w,
            prod.has(idx) ? Math.abs(prod.get(idx) / val - 1) : Infinity
          );
        const bsB = MC.bootstrap(
          stars,
          res,
          4000,
          stream('noise', SEEDS[3], 'real-bs-oracle')
        );
        const relSig = Math.abs(bsB.sigma / orc.sigmaMC - 1);
        row(
          'B6.oracle.dist.real',
          Math.abs(res.V / orc.V - 1) <= L.maxRel &&
            Math.abs(res.piMC / orc.piMC - 1) <= L.maxRel &&
            w <= L.maxRel &&
            relSig <= L.maxRelSigma,
          {
            relV: sig(Math.abs(res.V / orc.V - 1)),
            relPi: sig(Math.abs(res.piMC / orc.piMC - 1)),
            relPerStar: sig(w),
            relSigma: sig(relSig),
          }
        );
      } else
        row(
          'B6.oracle.dist.real',
          res.status === orc.status,
          { production: res.status, oracle: orc.status },
          'no distance to compare'
        );
    } else {
      for (const id of [
        'B4.oracle.members.real',
        'B5.oracle.cp.real',
        'B6.oracle.dist.real',
      ])
        if (want(id.slice(0, 2))) notRun(id, 'no oracle output was supplied');
    }
  }
  for (const id of ['R7.published.cp', 'R8.published.distance', 'R9.isochrone'])
    notRun(
      id,
      CHECKS[id].what.replace(/^NOT RUN by committed precondition: /, '')
    );
  return { rows, ensembles: ens, real: real && summariseReal(real) };
}

const tally = a => {
  const o = {};
  for (const x of a) o[x] = (o[x] ?? 0) + 1;
  return o;
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

/** The sample cuts of the contract and the per-star zero point; rows in file order. */
export function realRows(file) {
  const raw = readCsv(file);
  const sha = createHash('sha256').update(readFileSync(file)).digest('hex');
  if (sha !== THRESHOLDS.data.sha256)
    throw new Error(`hyades.csv sha256 ${sha} is not the committed one`);
  let dropped = 0;
  let flagged = 0;
  let noZp = 0;
  const rows = raw.map(r => {
    const ok = (r.params === 31 || r.params === 95) && r.ruwe < 1.4;
    if (!ok) {
      dropped++;
      return { ...r, parallaxError: NaN };
    }
    const z = parallaxZeroPoint({
      g: r.g,
      nuEff: r.nuEff,
      pseudocolour: r.pseudocolour,
      eclLat: r.eclLat,
      params: r.params,
    });
    if (z.status === 'refused' || !Number.isFinite(z.value)) {
      noZp++;
      return { ...r, parallaxError: NaN };
    }
    if (!z.inRange) flagged++;
    return { ...r, zeroPoint: z.value };
  });
  return {
    rows,
    sha,
    counts: {
      rows: raw.length,
      droppedByCuts: dropped,
      noZeroPoint: noZp,
      zeroPointOutOfRange: flagged,
      withRv: raw.filter(r => Number.isFinite(r.rv)).length,
    },
  };
}

function runReal(form, F, csv) {
  const { rows, sha, counts } = realRows(csv ?? DATA_FILE);
  const stars = MC.prepare(rows);
  const res = MC.analyse(stars, { seed: F.seed, qAlways: F.qAlways });
  return {
    e: null,
    stars,
    res,
    rowsAll: rows,
    info: { sha256: sha, ...counts, stars: stars.length },
    rows,
  };
}

function summariseReal(real) {
  const { res, stars } = real;
  const out = {
    info: real.info,
    status: res.status,
    reason: res.reason ?? null,
    members: res.nMembers ?? 0,
    withRv: res.rvMembers ?? 0,
    steps: res.steps ?? null,
    sigmaOffDeg: sig(res.sigmaOffDeg),
    rvScatter: sig(res.rvScatter),
  };
  if (res.cpVector) {
    out.cp = { ra: sig(res.cp.ra, 6), dec: sig(res.cp.dec, 6) };
    out.memberDigest = createHash('sha256')
      .update(
        res.members
          .map(i => real.rowsAll[stars[i].index].id)
          .sort()
          .join(',')
      )
      .digest('hex');
  }
  if (
    res.status === 'ok' ||
    (res.status === 'cp-only' && res.V !== undefined)
  ) {
    out.V = sig(res.V);
  }
  if (res.status === 'ok' && real.bs && real.plx) {
    out.ratioMCoverPlx = sig(real.ratio, 6);
    out.sigmaMCRel = sig(real.bs.sigma / res.piMC);
    out.piMCOverPlxStat = sig(real.plx.statError / real.plx.mean);
    out.meanZeroPoint = sig(real.plx.meanZeroPoint);
    out.used = res.nUsed;
    out.bootstrap = { B: real.bs.B, discarded: real.bs.discarded };
  }
  return out;
}

// ---- verdict ---------------------------------------------------------------------

export function verdictOf(rows) {
  const inSet = (c, set) => c.set === set;
  const status = id => rows.find(r => r.id === id)?.status ?? 'not-run';
  const legs = THRESHOLDS.checks.filter(c => c.set === 'S' || c.set === 'R');
  const bad = grp =>
    legs.filter(c => c.group === grp && status(c.id) !== 'pass').map(c => c.id);
  const geo = bad('geo');
  const dist = bad('dist');
  const verdict = geo.length ? 'C' : dist.length ? 'B' : 'A';
  void inSet;
  return { verdict, geoFailing: geo, distFailing: dist };
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
        rows: r.rows.map(x => ({
          ...x,
          rv: Number.isFinite(x.rv) ? x.rv : null,
          rvError: Number.isFinite(x.rvError) ? x.rvError : null,
        })),
      };
    });
    writeFileSync(
      path.join(dir, 'synthetic.json'),
      JSON.stringify({ thresholdsSha256: THR_SHA, cases })
    );
    const { rows } = realRows(opt('csv', DATA_FILE));
    writeFileSync(
      path.join(dir, 'real-zeropoints.json'),
      JSON.stringify({
        thresholdsSha256: THR_SHA,
        zeroPoints: rows.map(r =>
          Number.isFinite(r.parallaxError) ? r.zeroPoint : null
        ),
      })
    );
    process.stderr.write(
      `wrote ${cases.length} synthetic cases and ${rows.length} zero points to ${dir}\n`
    );
    return;
  }
  if (flag('--merge')) {
    const outDir = opt('out-dir', DIR);
    const files = args.filter(
      a => a.endsWith('.json') && !a.startsWith('--') && a !== outDir
    );
    const parts = files.map(f => JSON.parse(readFileSync(f, 'utf8')));
    const rows = parts.flatMap(p => p.rows);
    const verdicts = {};
    for (const p of parts) verdicts[p.form] = verdictOf(p.rows);
    const results = {
      format: 'gravitas.moving-cluster-results/1',
      thresholdsSha256: THR_SHA,
      node: parts[0].node,
      date: parts[0].date,
      forms: Object.fromEntries(
        parts.map(p => [
          p.form,
          {
            definition: FORMS[p.form],
            verdict: verdicts[p.form],
            counts: countRows(p.rows),
            real: p.real,
          },
        ])
      ),
      rows,
    };
    const failed = {
      format: 'gravitas.moving-cluster-failed-legs/1',
      note: 'Every failing leg of the gate stream, each labelled and left failing. Only Carl resets a bound; a corrected estimator may enter only as new legs with thresholds committed first.',
      thresholdsSha256: THR_SHA,
      legs: rows
        .filter(r => r.status === 'fail')
        .map(r => ({
          form: r.form,
          id: r.id,
          label: `FAILED (${r.form} form)`,
          measured: r.measured,
          note: r.note,
        })),
    };
    const ensembles = {
      format: 'gravitas.moving-cluster-ensembles/1',
      note: 'Synthetic data with its truth manifest: the generator parameters are thresholds.json syntheticTruth; each row is one realization summary (no per-star values).',
      thresholdsSha256: THR_SHA,
      seeds: THRESHOLDS.seeds,
      variants: Object.fromEntries(
        Object.entries(VARIANTS).map(([k, v]) => [
          k,
          { seed: v.seed, realizations: v.n, options: v.o },
        ])
      ),
      forms: Object.fromEntries(
        parts.map(p => [
          p.form,
          Object.fromEntries(
            Object.entries(p.ensembles).map(([k, evs]) => [
              k,
              evs.map(e => ({
                s: e.status,
                r: e.reason,
                m: e.nMembers,
                rec: sig(e.recall),
                pur: sig(e.purity),
                cp: sig(e.cpErrDeg),
                rel: sig(e.relBias),
                z: sig(e.z),
                sg: sig(e.sigmaMC),
                c68: e.covered68,
                c95: e.covered95,
                ag: e.agree,
              })),
            ])
          ),
        ])
      ),
    };
    mkdirSync(outDir, { recursive: true });
    writeFileSync(
      path.join(outDir, 'results.json'),
      JSON.stringify(results, null, 2) + '\n'
    );
    writeFileSync(
      path.join(outDir, 'failed-legs.json'),
      JSON.stringify(failed, null, 2) + '\n'
    );
    writeFileSync(
      path.join(outDir, 'ensembles.json'),
      JSON.stringify(ensembles, null, 2) + '\n'
    );
    for (const [f, v] of Object.entries(verdicts))
      process.stdout.write(
        `${f}: verdict ${v.verdict}; geo failing ${v.geoFailing.join(',') || '-'}; dist failing ${v.distFailing.join(',') || '-'}\n`
      );
    return;
  }
  const form = opt('form');
  if (!FORMS[form]) throw new Error('--form=committed|amended');
  const oracleFile = opt('oracle');
  const oracle = oracleFile
    ? JSON.parse(readFileSync(oracleFile, 'utf8'))
    : null;
  const only = opt('only') ? opt('only').split(',') : null;
  const t0 = Date.now();
  const out = runLegs(form, { oracle, csv: opt('csv'), only });
  const part = {
    form,
    thresholdsSha256: THR_SHA,
    node: process.version,
    date: new Date().toISOString(),
    elapsedS: (Date.now() - t0) / 1000,
    rows: out.rows,
    ensembles: out.ensembles,
    real: out.real,
  };
  const target = opt('out');
  if (target) writeFileSync(target, JSON.stringify(part));
  for (const r of out.rows)
    process.stdout.write(
      `${r.status.toUpperCase().padEnd(8)} ${r.id.padEnd(30)} ${JSON.stringify(r.measured)?.slice(0, 220)}\n`
    );
}

const countRows = rows => {
  const o = { pass: 0, fail: 0, reported: 0, 'not-run': 0 };
  for (const r of rows) o[r.status]++;
  return { ...o, rows: rows.length };
};

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
