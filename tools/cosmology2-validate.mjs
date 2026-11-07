#!/usr/bin/env node
// =============================================================================
// The late-time FLRW kernel against its committed thresholds (Prompt 255)
// -----------------------------------------------------------------------------
//   npm run cosmology2:validate                    print the table
//   npm run cosmology2:validate -- --json          print it as JSON
//   npm run cosmology2:validate -- --write-results rewrite tests/fixtures/cosmology2/results.json
//   npm run cosmology2:validate -- --write-failed  rewrite tests/fixtures/cosmology2/failed-legs.json
//   --only=A1,B1                                   run the legs whose id starts with these
//
// tests/fixtures/cosmology2/thresholds.json fixed every bound before js/kernels/cosmology/late existed
// (COSMOLOGY_II.md); this reads the bounds from that file, not from copies. The B, C, D5 and F rows read
// tests/fixtures/cosmology2/oracle-results.json, which tools/cosmology2-oracle/oracle.py wrote (numpy,
// scipy, astropy; no Gravitas code). A leg whose authentic file was never supplied is NOT RUN and says why.
// The kernel verdict is computed from the rows by the function committed in the thresholds.
// =============================================================================

import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  ClosedModelError,
  GYR_PER_INV_H0 as GYR,
  C_KMS,
  createCosmology,
} from '../js/kernels/cosmology/flrw.js';
import * as K from '../js/kernels/cosmology/late/index.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR = 'tests/fixtures/cosmology2';
const read = rel => JSON.parse(readFileSync(path.join(ROOT, rel), 'utf8'));
export const THRESHOLDS = read(`${DIR}/thresholds.json`);
const ORACLE = read(`${DIR}/oracle-results.json`);
const W = THRESHOLDS.worlds;

const lim = id => THRESHOLDS.checks.find(c => c.id.startsWith(`${id}.`)).limits;
const fullId = id => THRESHOLDS.checks.find(c => c.id.startsWith(`${id}.`)).id;
const sig = (v, d = 4) => (Number.isFinite(v) ? Number(v.toPrecision(d)) : v);
const rel = (a, b) => Math.abs(a - b) / Math.max(Math.abs(b), 1e-300);
const maxOf = a => a.reduce((m, v) => Math.max(m, v), 0);
const pow = Math.pow;
const toNum = v => (typeof v === 'string' ? Number(v) : v);

/** Run a thunk; return {code, message, error} if it threw a FriedmannDomainError, null if it returned. */
const thrown = [];
function refusal(fn) {
  try {
    fn();
    return null;
  } catch (e) {
    if (!(e instanceof K.FriedmannDomainError)) throw e;
    const r = { code: e.code, message: e.message };
    thrown.push(r);
    return r;
  }
}
const okFinite = v => Number.isFinite(v);

/** Run the legs. @returns {Promise<object[]>} rows {id, status, measured, note} */
export async function runValidation({ only = [] } = {}) {
  const rows = [];
  const row = (id, pass, measured, note = '') =>
    rows.push({
      id: fullId(id),
      status: pass ? 'pass' : 'fail',
      measured,
      note,
    });
  const reported = (id, measured, note = '') =>
    rows.push({ id: fullId(id), status: 'reported', measured, note });
  const notRun = (id, note) =>
    rows.push({ id: fullId(id), status: 'not-run', measured: null, note });
  const wanted = id => !only.length || only.some(p => id.startsWith(p));
  const cpu0 = process.cpuUsage();
  const ZC = W.zGridClosedForms;

  // ---- A: closed forms ---------------------------------------------------------------------

  if (wanted('A1.')) {
    const L = lim('A1');
    const e = [];
    const eE = [];
    let okClosure = true;
    for (const H0 of W.H0Grid) {
      const c = K.createFriedmann({ H0, Om: 1, Ode: 0 });
      okClosure = okClosure && c.Ok === 0;
      const dh = C_KMS / H0;
      const g = GYR / H0;
      for (const z of ZC) {
        const dc = 2 * dh * (1 - 1 / Math.sqrt(1 + z));
        e.push(rel(c.comovingDistance(z), dc));
        e.push(rel(c.transverseComovingDistance(z), dc));
        e.push(rel(c.luminosityDistance(z), (1 + z) * dc));
        e.push(rel(c.angularDiameterDistance(z), dc / (1 + z)));
        e.push(rel(c.lookbackTime(z), g * (2 / 3) * (1 - pow(1 + z, -1.5))));
        e.push(rel(c.ageAtRedshift(z), g * (2 / 3) * pow(1 + z, -1.5)));
        e.push(rel(c.age(), g * (2 / 3)));
        eE.push(rel(c.E(z), pow(1 + z, 1.5)));
        eE.push(rel(c.decelerationParameter(z), 0.5));
      }
    }
    row('A1', maxOf(e) <= L.maxRel && maxOf(eE) <= L.maxRelE && okClosure, {
      worstRel: sig(maxOf(e), 3),
      worstRelEAndQ: sig(maxOf(eE), 3),
      closureExact: okClosure,
      cases: e.length,
    });
  }

  if (wanted('A2.')) {
    const L = lim('A2');
    const e = [];
    const eq = [];
    let tr = true;
    for (const H0 of W.H0Grid) {
      const c = K.createFriedmann({ H0, Om: 0, Or: 0, Ode: 0 });
      const dh = C_KMS / H0;
      const g = GYR / H0;
      tr = tr && c.transitionRedshift().reason === 'decelerating-today';
      for (const z of ZC) {
        const dc = dh * Math.log(1 + z);
        const dm = dh * Math.sinh(Math.log(1 + z));
        e.push(rel(c.E(z), 1 + z));
        e.push(rel(c.comovingDistance(z), dc));
        e.push(rel(c.transverseComovingDistance(z), dm));
        e.push(rel(c.luminosityDistance(z), (1 + z) * dm));
        e.push(rel(c.lookbackTime(z), (g * z) / (1 + z)));
        e.push(rel(c.ageAtRedshift(z), g / (1 + z)));
        e.push(rel(c.age(), g));
        eq.push(Math.abs(c.decelerationParameter(z)));
      }
    }
    row('A2', maxOf(e) <= L.maxRel && maxOf(eq) <= L.maxAbsQ && tr, {
      worstRel: sig(maxOf(e), 3),
      worstAbsQ: sig(maxOf(eq), 3),
      transitionReasonOk: tr,
      cases: e.length,
    });
  }

  if (wanted('A3.')) {
    const L = lim('A3');
    const e = [];
    const eq = [];
    let refused = true;
    for (const H0 of W.H0Grid) {
      const c = K.createFriedmann({ H0, Om: 0, Or: 0, Ode: 1, w: -1 });
      const dh = C_KMS / H0;
      refused =
        refused &&
        refusal(() => c.age())?.code === 'age-unbounded' &&
        refusal(() => c.ageAtRedshift(1))?.code === 'age-unbounded';
      for (const z of ZC) {
        e.push(rel(c.comovingDistance(z), dh * z));
        e.push(rel(c.luminosityDistance(z), (1 + z) * dh * z));
        e.push(rel(c.lookbackTime(z), (GYR / H0) * Math.log(1 + z)));
        eq.push(Math.abs(c.decelerationParameter(z) + 1));
      }
    }
    row('A3', maxOf(e) <= L.maxRel && maxOf(eq) <= L.maxAbsQ && refused, {
      worstRel: sig(maxOf(e), 3),
      worstAbsQ: sig(maxOf(eq), 3),
      ageRefused: refused,
    });
  }

  if (wanted('A4.')) {
    const L = lim('A4');
    const e = [];
    const eq = [];
    for (const H0 of W.H0Grid) {
      const c = K.createFriedmann({ H0, Om: 0, Or: 1, Ode: 0 });
      const dh = C_KMS / H0;
      const g = GYR / H0;
      for (const z of ZC) {
        e.push(rel(c.comovingDistance(z), (dh * z) / (1 + z)));
        e.push(rel(c.lookbackTime(z), (g * (1 - pow(1 + z, -2))) / 2));
        e.push(rel(c.ageAtRedshift(z), (g / 2) * pow(1 + z, -2)));
        e.push(rel(c.age(), g / 2));
        e.push(rel(c.E(z), (1 + z) ** 2));
        eq.push(rel(c.decelerationParameter(z), 1));
      }
    }
    row('A4', maxOf(e) <= L.maxRel && maxOf(eq) <= L.maxRelQ, {
      worstRel: sig(maxOf(e), 3),
      worstRelQ: sig(maxOf(eq), 3),
    });
  }

  if (wanted('A5.')) {
    const L = lim('A5');
    const H0 = 70;
    const Om = 0.3;
    const Kc = 0.7;
    const c = K.createFriedmann({ H0, Om, Ode: 0.5, w: -1 / 3 });
    const ref = K.createFriedmann({ H0, Om, Ode: 0 });
    const dh = C_KMS / H0;
    const eE = [];
    const eDc = [];
    const eDm = [];
    const eQ = [];
    const sK = Math.sqrt(Kc);
    const s1 = Math.sqrt(Om + Kc);
    for (const z of [0.2, 0.5, 1, 2, 5, 10]) {
      const x = 1 + z;
      eE.push(rel(c.E(z), ref.E(z)));
      const s = Math.sqrt(Om * x + Kc);
      const chi =
        (1 / sK) *
        (Math.log((s - sK) / (s + sK)) - Math.log((s1 - sK) / (s1 + sK)));
      eDc.push(rel(c.comovingDistance(z), dh * chi));
      const s2 = Math.sqrt(0.2);
      eDm.push(
        rel(c.transverseComovingDistance(z), (dh / s2) * Math.sinh(s2 * chi))
      );
      eQ.push(
        rel(c.decelerationParameter(z), (Om * x ** 3) / (2 * c.E(z) ** 2))
      );
    }
    row(
      'A5',
      maxOf(eE) <= L.maxRelE &&
        maxOf(eDc) <= L.maxRelDc &&
        maxOf(eDm) <= L.maxRelDm &&
        maxOf(eQ) <= L.maxRelQ,
      {
        worstRelE: sig(maxOf(eE), 3),
        worstRelDc: sig(maxOf(eDc), 3),
        worstRelDm: sig(maxOf(eDm), 3),
        worstRelQ: sig(maxOf(eQ), 3),
      }
    );
  }

  if (wanted('A6.')) {
    const L = lim('A6');
    const e = [];
    const eq = [];
    const et = [];
    const eqt = [];
    for (const [Om, OL] of [
      [0.3, 0.7],
      [0.25, 0.75],
      [0.5, 0.5],
      [0.1, 0.9],
    ])
      for (const H0 of [60, 70, 80]) {
        const c = K.createFriedmann({ H0, Om });
        const a = Math.asinh(Math.sqrt(OL / Om));
        const pre = (2 * GYR) / (3 * H0 * Math.sqrt(OL));
        e.push(rel(c.age(), pre * a));
        for (const z of [0.1, 1, 5, 20]) {
          const b = Math.asinh(Math.sqrt(OL / Om) * pow(1 + z, -1.5));
          e.push(rel(c.lookbackTime(z), pre * (a - b)));
          const x3 = (1 + z) ** 3;
          const qc = (Om * x3 - 2 * OL) / (2 * (Om * x3 + OL));
          const q = c.decelerationParameter(z);
          eq.push(
            Math.abs(q - qc) / Math.max(Math.abs(qc), L.maxAbsQ / L.maxRelQ)
          );
        }
        const zt = c.transitionRedshift().z;
        et.push(rel(zt, pow((2 * OL) / Om, 1 / 3) - 1));
        eqt.push(Math.abs(c.decelerationParameter(zt)));
      }
    row(
      'A6',
      maxOf(e) <= L.maxRel &&
        maxOf(eq) <= L.maxRelQ &&
        maxOf(et) <= L.maxRelTransition &&
        maxOf(eqt) <= L.maxAbsQAtTransition,
      {
        worstRel: sig(maxOf(e), 3),
        worstRelQ: sig(maxOf(eq), 3),
        worstRelTransition: sig(maxOf(et), 3),
        worstAbsQAtTransition: sig(maxOf(eqt), 3),
      }
    );
  }

  if (wanted('A7.')) {
    const L = lim('A7');
    const eD = [];
    const eAge = [];
    const ageByOm = {};
    const flipped = [];
    for (const Om of [0.1, 0.3, 0.7, 1.2, 1.5, 2, 3]) {
      const c = K.createFriedmann({ H0: 70, Om, Ode: 0 });
      const dh = C_KMS / 70;
      for (const z of [0.1, 0.5, 1, 2, 5, 20]) {
        const dl =
          ((2 * dh) / (Om * Om)) *
          (Om * z + (Om - 2) * (Math.sqrt(1 + Om * z) - 1));
        eD.push(rel(c.luminosityDistance(z), dl));
      }
      const h0t =
        Om < 1
          ? (Om / (2 * pow(1 - Om, 1.5))) * Math.acosh(2 / Om - 1) -
            1 / (1 - Om)
          : (Om / (2 * pow(Om - 1, 1.5))) * Math.acos(2 / Om - 1) -
            1 / (Om - 1);
      eAge.push(rel(c.age(), (GYR / 70) * h0t));
      ageByOm[Om] = sig(eAge[eAge.length - 1], 3);
      // diagnostic only, not a pass criterion: the committed open-universe form negated
      if (Om < 1) flipped.push(rel(c.age(), -(GYR / 70) * h0t));
    }
    const refusedByExisting = (() => {
      try {
        createCosmology({ H0: 70, Om: 1.5, OL: 0 });
        return false;
      } catch (e) {
        return e instanceof ClosedModelError;
      }
    })();
    row('A7', maxOf(eD) <= L.maxRel && maxOf(eAge) <= L.maxRel, {
      worstRelLuminosity: sig(maxOf(eD), 3),
      worstRelAge: sig(maxOf(eAge), 3),
      worstRelAgePerOm: ageByOm,
      diagnosticOpenFormNegated: sig(maxOf(flipped), 3),
      existingKernelRefusesClosed: refusedByExisting,
    });
  }

  if (wanted('A8.')) {
    const L = lim('A8');
    const zs = [0.05, 0.3, 1, 2.5, 7];
    const m = {
      e0: 0,
      closure: 0,
      dist1: 0,
      dist2: 0,
      mu: 0,
      frac: 0,
      split: 0,
    };
    let monotone = true;
    let bitEqual = true;
    let identical = true;
    let frozenOk = true;
    for (const s of ORACLE.sets) {
      const params = Object.freeze({ ...s.params });
      const c = K.createFriedmann(params);
      frozenOk =
        frozenOk && JSON.stringify(params) === JSON.stringify(s.params);
      m.e0 = Math.max(m.e0, Math.abs(c.E(0) - 1));
      m.closure = Math.max(m.closure, Math.abs(c.Om + c.Or + c.Ok + c.Ode - 1));
      const age = c.age();
      let prevD = 0;
      let prevT = 0;
      for (const z of zs) {
        const dl = c.luminosityDistance(z);
        m.dist1 = Math.max(
          m.dist1,
          rel(dl, (1 + z) ** 2 * c.angularDiameterDistance(z)),
          rel(dl, (1 + z) * c.transverseComovingDistance(z))
        );
        m.dist2 = m.dist1;
        m.mu = Math.max(
          m.mu,
          Math.abs(c.distanceModulus(z) - 5 * Math.log10(dl * 1e5))
        );
        const f = c.densityFractions(z);
        m.frac = Math.max(
          m.frac,
          Math.abs(f.matter + f.radiation + f.curvature + f.darkEnergy - 1)
        );
        m.split = Math.max(
          m.split,
          rel(c.lookbackTime(z) + c.ageAtRedshift(z), age)
        );
        const dc = c.comovingDistance(z);
        const lb = c.lookbackTime(z);
        monotone = monotone && dc >= prevD && lb >= prevT;
        prevD = dc;
        prevT = lb;
        bitEqual = bitEqual && dl === c.quantity('luminosity', z).value;
        identical =
          identical &&
          dl === K.createFriedmann(params).luminosityDistance(z) &&
          age === K.createFriedmann(params).age();
      }
    }
    row(
      'A8',
      m.e0 <= L.maxAbsE0 &&
        m.closure <= L.maxAbsClosure &&
        m.dist1 <= L.maxRelDist &&
        m.mu <= L.maxAbsMu &&
        m.frac <= L.maxAbsFractions &&
        m.split <= L.maxRelAgeSplit &&
        monotone &&
        bitEqual &&
        identical &&
        frozenOk,
      {
        worstAbsE0: sig(m.e0, 3),
        worstAbsClosure: sig(m.closure, 3),
        worstRelDistanceIdentity: sig(m.dist1, 3),
        worstAbsMu: sig(m.mu, 3),
        worstAbsFractions: sig(m.frac, 3),
        worstRelAgeSplit: sig(m.split, 3),
        monotone,
        quantityEqualsMethodToTheBit: bitEqual,
        repeatedCallsIdentical: identical,
        frozenInputUnchanged: frozenOk,
      }
    );
  }

  if (wanted('A9.')) {
    const L = lim('A9');
    const e = [];
    const em = [];
    for (const [H0, Om, OL] of [
      [70, 0.3, 0.7],
      [65, 0.25, 0.5],
      [70, 1, 0],
      [60, 0.1, 0],
      [72, 0.5, 0.2],
    ]) {
      const old = createCosmology({ H0, Om, OL });
      const c = K.createFriedmann({ H0, Om, Ode: OL });
      e.push(rel(c.age(), old.age()));
      for (const z of [0.05, 0.5, 1, 3, 10]) {
        e.push(rel(c.comovingDistance(z), old.comovingDistance(z)));
        e.push(
          rel(
            c.transverseComovingDistance(z),
            old.transverseComovingDistance(z)
          )
        );
        e.push(rel(c.luminosityDistance(z), old.luminosityDistance(z)));
        e.push(
          rel(c.angularDiameterDistance(z), old.angularDiameterDistance(z))
        );
        e.push(rel(c.lookbackTime(z), old.lookbackTime(z)));
        em.push(Math.abs(c.distanceModulus(z) - old.distanceModulus(z)));
      }
    }
    let oldRefuses = false;
    try {
      createCosmology({ H0: 70, Om: 1.5, OL: 0 });
    } catch (err) {
      oldRefuses = err instanceof ClosedModelError;
    }
    const newAccepts =
      refusal(() => K.createFriedmann({ H0: 70, Om: 1.5, Ode: 0 })) === null;
    row(
      'A9',
      maxOf(e) <= L.maxRel &&
        maxOf(em) <= L.maxAbsMu &&
        oldRefuses &&
        newAccepts,
      {
        worstRel: sig(maxOf(e), 3),
        worstAbsMu: sig(maxOf(em), 3),
        existingRefusesClosed: oldRefuses,
        lateAcceptsClosed: newAccepts,
      }
    );
  }

  // ---- B: the oracle -----------------------------------------------------------------------

  const KEYS = [
    ['E', (c, z) => c.E(z)],
    ['Dc', (c, z) => c.comovingDistance(z)],
    ['Dm', (c, z) => c.transverseComovingDistance(z)],
    ['Dl', (c, z) => c.luminosityDistance(z)],
    ['Da', (c, z) => c.angularDiameterDistance(z)],
    ['mu', (c, z) => c.distanceModulus(z)],
    ['lookback', (c, z) => c.lookbackTime(z)],
    ['ageAtZ', (c, z) => c.ageAtRedshift(z)],
  ];
  const compareOracle = which => {
    const per = {};
    let antipodeMismatch = 0;
    let rowsCompared = 0;
    for (const s of ORACLE.sets) {
      const c = K.createFriedmann(s.params);
      for (const r of s.rows) {
        rowsCompared++;
        if (r.antipode) {
          if (
            refusal(() => c.luminosityDistance(r.z))?.code !== 'beyond-antipode'
          )
            antipodeMismatch++;
        }
        for (const [k, fn] of KEYS) {
          const ref = r[which][k];
          if (ref === undefined) continue;
          const v = fn(c, r.z);
          const d = k === 'mu' ? Math.abs(v - ref) : rel(v, ref);
          per[k] = Math.max(per[k] ?? 0, d);
        }
      }
      const ref0 = s.age[which];
      per.age0 = Math.max(per.age0 ?? 0, rel(c.age(), ref0));
    }
    return { per, antipodeMismatch, rowsCompared };
  };

  if (wanted('B1.')) {
    const L = lim('B1');
    const { per, antipodeMismatch, rowsCompared } = compareOracle('astropy');
    const ok =
      Object.entries(per).every(
        ([k, v]) => v <= (k === 'mu' ? L.maxAbsMu : L.maxRel)
      ) && antipodeMismatch === 0;
    const failing = Object.entries(per)
      .filter(([k, v]) => v > (k === 'mu' ? L.maxAbsMu : L.maxRel))
      .map(([k]) => k);
    row('B1', ok, {
      worstPerQuantity: Object.fromEntries(
        Object.entries(per).map(([k, v]) => [k, sig(v, 3)])
      ),
      quantitiesOverBound: failing,
      rowsCompared,
      antipodeMismatch,
    });
  }

  if (wanted('B2.')) {
    const L = lim('B2');
    const { per, antipodeMismatch, rowsCompared } = compareOracle('own');
    const ok =
      Object.entries(per).every(
        ([k, v]) => v <= (k === 'mu' ? L.maxAbsMu : L.maxRel)
      ) && antipodeMismatch === 0;
    row('B2', ok, {
      worstPerQuantity: Object.fromEntries(
        Object.entries(per).map(([k, v]) => [k, sig(v, 3)])
      ),
      rowsCompared,
      antipodeMismatch,
    });
  }

  if (wanted('B3.')) {
    const L = lim('B3');
    let worst = 0;
    const where = [];
    for (const s of ORACLE.sets) {
      for (const r of s.rows)
        for (const k of Object.keys(r.own)) {
          const a = r.astropy[k];
          if (a === undefined) continue;
          const d = k === 'mu' ? Math.abs(r.own[k] - a) : rel(r.own[k], a);
          if (d > L.maxRel) where.push(`${s.id} z=${r.z} ${k}`);
          worst = Math.max(worst, d);
        }
      const d0 = rel(s.age.own, s.age.astropy);
      worst = Math.max(worst, d0);
      if (d0 > L.maxRel) where.push(`${s.id} age0`);
    }
    row('B3', worst <= L.maxRel, {
      worstRel: sig(worst, 3),
      rowsOverBound: where.length,
      quantitiesOverBound: [...new Set(where.map(w => w.split(' ').pop()))],
      firstRows: where.slice(0, 6),
    });
  }

  if (wanted('B4.')) {
    const L = lim('B4');
    const eq = [];
    const et = [];
    let nullMatch = true;
    for (const s of ORACLE.sets) {
      const c = K.createFriedmann(s.params);
      for (const r of s.rows)
        eq.push(Math.abs(c.decelerationParameter(r.z) - r.q));
      const t = c.transitionRedshift().z;
      if ((t === null) !== (s.transition === null)) nullMatch = false;
      else if (t !== null) et.push(Math.abs(t - s.transition));
    }
    row(
      'B4',
      maxOf(eq) <= L.maxAbsQ && maxOf(et) <= L.maxAbsTransition && nullMatch,
      {
        worstAbsQ: sig(maxOf(eq), 3),
        worstAbsTransition: sig(maxOf(et), 3),
        nullVerdictsMatch: nullMatch,
      }
    );
  }

  if (wanted('B5.')) {
    const L = lim('B5');
    let covered = 0;
    let n = 0;
    let finite = true;
    const miss = [];
    for (const s of ORACLE.sets) {
      const c = K.createFriedmann(s.params);
      const check = (name, z, ref, label) => {
        const q = c.quantity(name, z);
        finite = finite && okFinite(q.error) && q.error >= 0;
        n++;
        if (Math.abs(q.value - ref) <= q.error + L.floorRel * Math.abs(q.value))
          covered++;
        else miss.push(label);
      };
      for (const r of s.rows) {
        check('comoving', r.z, r.own.Dc, `${s.id} z=${r.z} comoving`);
        if (r.own.Dl !== undefined)
          check('luminosity', r.z, r.own.Dl, `${s.id} z=${r.z} luminosity`);
        check('lookback', r.z, r.own.lookback, `${s.id} z=${r.z} lookback`);
        check('ageAt', r.z, r.own.ageAtZ, `${s.id} z=${r.z} ageAt`);
      }
      check('age', 0, s.age.own, `${s.id} age`);
    }
    row('B5', covered / n >= L.minCoverage && finite, {
      values: n,
      covered,
      coverage: sig(covered / n, 5),
      allErrorsFiniteNonnegative: finite,
      firstMisses: miss.slice(0, 6),
    });
  }

  if (wanted('B6.'))
    // This table is the first gate's, pinned as it ran (results.json): the published data arrived afterwards and
    // leg B6 is judged by tools/cosmology2-b6.mjs under b6-thresholds.json (COSMOLOGY_II.md section 10).
    notRun(
      'B6',
      'not run in this first-gate table, which stays pinned as it ran (no file had been supplied); judged by tools/cosmology2-b6.mjs under tests/fixtures/cosmology2/b6-thresholds.json'
    );

  // ---- C1 and D5: the seeded ensemble ----------------------------------------------------------

  const needEns = wanted('C1.') || wanted('D5.') || wanted('D7.');
  const ens = { accepted: 0, refusedDraws: 0, disagreements: [], excluded: 0 };
  let c1 = null;
  if (needEns) {
    const L = lim('C1');
    let maxRel = 0;
    let covered = 0;
    let n = 0;
    let finite = true;
    let unexpected = 0;
    let antipodeDis = 0;
    let acceptedByOracle = 0;
    ORACLE.ensemble.draws.forEach((d, i) => {
      if (d.margin) {
        ens.excluded++;
        return;
      }
      let c = null;
      const rf = refusal(() => {
        c = K.createFriedmann({
          H0: d.H0,
          Om: d.Om,
          Or: d.Or,
          Ode: d.Ode,
          w: d.w,
        });
      });
      const code = rf ? rf.code : 'ok';
      if (code !== d.verdict)
        ens.disagreements.push({ index: i, kernel: code, oracle: d.verdict });
      if (d.verdict === 'ok') acceptedByOracle++;
      else ens.refusedDraws++;
      if (d.verdict !== 'ok' || !c) {
        if (d.verdict === 'ok') unexpected++;
        return;
      }
      ens.accepted++;
      for (const r of d.rows) {
        const lum = (() => {
          try {
            return c.quantity('luminosity', r.z);
          } catch (e) {
            if (
              e instanceof K.FriedmannDomainError &&
              e.code === 'beyond-antipode'
            )
              return 'antipode';
            throw e;
          }
        })();
        if ((lum === 'antipode') !== r.antipode) antipodeDis++;
        const pairs = [
          ['lookback', c.quantity('lookback', r.z), r.lookback],
          ['age', c.quantity('age', 0), r.age],
        ];
        if (lum !== 'antipode' && !r.antipode)
          pairs.push(['luminosity', lum, r.luminosity]);
        for (const [, q, ref] of pairs) {
          finite = finite && okFinite(q.value) && okFinite(q.error);
          const d2 = rel(q.value, ref);
          maxRel = Math.max(maxRel, d2);
          n++;
          if (Math.abs(q.value - ref) <= q.error + 1e-13 * Math.abs(q.value))
            covered++;
        }
      }
    });
    c1 = {
      maxRel,
      covered,
      n,
      finite,
      unexpected,
      antipodeDis,
      acceptedByOracle,
    };
    if (wanted('C1.'))
      row(
        'C1',
        maxRel <= L.maxRel &&
          n > 0 &&
          covered / n >= L.minCoverage &&
          acceptedByOracle >= L.minAccepted &&
          finite &&
          unexpected === 0,
        {
          draws: ORACLE.ensemble.n,
          acceptedByOracle,
          values: n,
          worstRel: sig(maxRel, 3),
          coverage: sig(covered / n, 5),
          allFinite: finite,
          unexpectedRefusals: unexpected,
        }
      );
  }

  // ---- D: refusals -------------------------------------------------------------------------

  const mk =
    (o = {}) =>
    () =>
      K.createFriedmann(o);
  if (wanted('D1.')) {
    let ok = true;
    const got = [];
    for (const s of W.refusedSets.bounce) {
      const r = refusal(mk(s));
      got.push(r?.code);
      ok = ok && r?.code === 'bounce' && /scale-free ratio/.test(r.message);
    }
    for (const s of W.refusedSets.acceptedNearEdge) {
      let c = null;
      const r = refusal(() => {
        c = K.createFriedmann(s);
      });
      const fine =
        r === null &&
        okFinite(c.luminosityDistance(1)) &&
        c.luminosityDistance(1) > 0 &&
        okFinite(c.age()) &&
        c.age() > 0;
      got.push(fine ? 'accepted' : r?.code);
      ok = ok && fine;
    }
    row('D1', ok, { results: got });
  }

  if (wanted('D2.')) {
    let ok = true;
    const got = [];
    for (const s of W.refusedSets.negativeDensity) {
      const { parameter, ...p } = s;
      const r = refusal(mk(p));
      got.push(r?.code);
      ok =
        ok && r?.code === 'negative-density' && r.message.includes(parameter);
    }
    for (const s of W.refusedSets.densityOutOfDomain) {
      const r = refusal(mk(s));
      got.push(r?.code);
      ok = ok && r?.code === 'density-out-of-domain';
    }
    row('D2', ok, { results: got });
  }

  if (wanted('D3.')) {
    let ok = true;
    const got = [];
    for (const w of W.refusedSets.wOutOfDomain) {
      const r = refusal(mk({ H0: 70, Om: 0.3, w }));
      got.push(r?.code);
      ok = ok && r?.code === 'w-out-of-domain';
    }
    for (const w of W.refusedSets.wAcceptedEdges) {
      const r = refusal(mk({ H0: 70, Om: 0.3, Ode: 0.7, w }));
      got.push(r === null ? 'accepted' : r.code);
      ok = ok && r === null;
    }
    for (const H0 of W.refusedSets.badH0) {
      const r = refusal(mk({ H0, Om: 0.3 }));
      got.push(r?.code);
      ok = ok && r?.code === 'bad-H0';
    }
    for (const name of ['H0', 'Om', 'Or', 'Ode', 'w'])
      for (const v of W.refusedSets.notFinite) {
        const p = { H0: 70, Om: 0.3, Or: 0, Ode: 0.7, w: -1, [name]: toNum(v) };
        const r = refusal(mk(p));
        ok = ok && r?.code === 'not-finite';
      }
    const rm = refusal(mk({ H0: 70 }));
    got.push(rm?.code);
    ok = ok && rm?.code === 'bad-argument';
    row('D3', ok, { results: got });
  }

  if (wanted('D4.')) {
    const S = W.refusedSets;
    const c = K.createFriedmann({ H0: 70, Om: 0.3 });
    let ok = true;
    const got = [];
    for (const z of [...S.badZ, NaN, Infinity]) {
      const r = refusal(() => c.luminosityDistance(z));
      got.push(r?.code);
      ok = ok && r?.code === 'z-out-of-domain';
    }
    const a = K.createFriedmann(S.antipodeSet);
    const inside = refusal(() => a.luminosityDistance(S.antipodeSet.zInside));
    const beyond = refusal(() => a.luminosityDistance(S.antipodeSet.zBeyond));
    ok =
      ok &&
      inside === null &&
      okFinite(a.luminosityDistance(S.antipodeSet.zInside)) &&
      beyond?.code === 'beyond-antipode';
    const flatOk = refusal(() => c.luminosityDistance(10000)) === null;
    ok = ok && flatOk;
    row('D4', ok, {
      zRefusals: got,
      antipodeInside: inside === null,
      antipodeBeyond: beyond?.code,
      flatAt1e4Accepted: flatOk,
    });
  }

  if (wanted('D5.')) {
    const L = lim('D5');
    const nRef = ens.refusedDraws;
    const nAcc = ens.accepted;
    row(
      'D5',
      ens.disagreements.length <= L.maxDisagreements &&
        c1.antipodeDis === 0 &&
        nRef >= L.minAcceptedAndRefusedEach &&
        nAcc >= L.minAcceptedAndRefusedEach,
      {
        draws: ORACLE.ensemble.n,
        excludedMargin: ens.excluded,
        acceptedByBoth: nAcc,
        refusedByBoth: nRef,
        disagreements: ens.disagreements.length,
        firstDisagreements: ens.disagreements.slice(0, 5),
        antipodeDisagreements: c1.antipodeDis,
      }
    );
  }

  if (wanted('D6.')) {
    const ds = K.createFriedmann(W.refusedSets.ageUnbounded);
    const a = refusal(() => ds.age());
    const b = refusal(() => ds.ageAtRedshift(1));
    const distOk =
      okFinite(ds.comovingDistance(1)) && okFinite(ds.lookbackTime(1));
    const withMatter = K.createFriedmann({ H0: 70, Om: 0.3, Ode: 0.7 });
    const ageOk = withMatter.age() > 0;
    row(
      'D6',
      a?.code === 'age-unbounded' &&
        b?.code === 'age-unbounded' &&
        distOk &&
        ageOk,
      {
        ageCode: a?.code,
        ageAtCode: b?.code,
        distancesStillAvailable: distOk,
        ageWithMatter: sig(withMatter.age(), 6),
      }
    );
  }

  if (wanted('D7.')) {
    const L = lim('D7');
    const codes = new Set(THRESHOLDS.domain.codes);
    const bad = thrown.filter(
      t =>
        !codes.has(t.code) ||
        typeof t.message !== 'string' ||
        t.message.length < L.minMessageLength
    );
    row('D7', thrown.length > 0 && bad.length === 0 && c1.finite, {
      refusalsChecked: thrown.length,
      badRefusals: bad.length,
      ensembleOutputsFinite: c1.finite,
      distinctCodes: [...new Set(thrown.map(t => t.code))].sort(),
    });
  }

  // ---- F: degeneracy ---------------------------------------------------------------------------

  const CT = W.contours;
  const findPoint = (contour, x) =>
    contour.points.find(p => Math.abs(p.x - x) < 1e-9);
  const contourOf = name =>
    K.distanceContour({
      base: CT[name].base,
      z: CT[name].z,
      quantity: CT[name].quantity,
      x: CT[name].x,
      y: CT[name].y,
    });
  if (wanted('F1.')) {
    const L = lim('F1');
    let worstTarget = 0;
    let worstY = 0;
    let inRange = true;
    let accounted = true;
    const skipInfo = {};
    for (const name of ['flatOmW', 'openOmOde', 'hubbleOm']) {
      const spec = CT[name];
      const cont = contourOf(name);
      for (const p of cont.points) {
        const v = K.quantityAt(
          spec.base,
          { [spec.x.name]: p.x, [spec.y.name]: p.y },
          spec.z,
          spec.quantity
        );
        worstTarget = Math.max(worstTarget, rel(v, cont.target));
        inRange =
          inRange &&
          p.y >= spec.y.min &&
          p.y <= spec.y.max &&
          p.x >= spec.x.min - 1e-12 &&
          p.x <= spec.x.max + 1e-12;
      }
      accounted =
        accounted &&
        cont.points.length + cont.skipped.length === spec.x.n &&
        cont.skipped.every(s => ['no-root', 'all-refused'].includes(s.code));
      skipInfo[name] = cont.skipped.map(s => `${s.index}:${s.code}`);
      const orc = ORACLE.contours[name];
      for (const idx of CT.oracleXIndices) {
        const o = orc.solutions[idx];
        if (!o || o.y === null) continue;
        const p = findPoint(cont, o.x);
        if (!p) {
          worstY = Infinity;
          continue;
        }
        worstY = Math.max(
          worstY,
          Math.abs(p.y - o.y) / (spec.y.max - spec.y.min)
        );
      }
    }
    row(
      'F1',
      worstTarget <= L.maxRelTarget &&
        worstY <= L.maxRelYRange &&
        inRange &&
        accounted,
      {
        worstRelTarget: sig(worstTarget, 3),
        worstOracleDiffOverRange: sig(worstY, 3),
        pointsInRange: inRange,
        everyGridValueAccounted: accounted,
        skipped: skipInfo,
      }
    );
  }

  if (wanted('F2.')) {
    const L = lim('F2');
    let eSlope = 0;
    let eGrad = 0;
    let perp = 0;
    W.directions.forEach((d, i) => {
      const r = K.degeneracyDirection(d);
      const o = ORACLE.directions[i];
      eSlope = Math.max(eSlope, rel(r.slope, o.slope));
      eGrad = Math.max(
        eGrad,
        rel(r.gradient.dx, o.dDdx),
        rel(r.gradient.dy, o.dDdy)
      );
      const n = Math.hypot(r.gradient.dx, r.gradient.dy);
      perp = Math.max(
        perp,
        Math.abs(r.tangent.x * r.gradient.dx + r.tangent.y * r.gradient.dy) / n
      );
    });
    row(
      'F2',
      eSlope <= L.maxRelSlope &&
        eGrad <= L.maxRelGradient &&
        perp <= L.maxAbsPerp,
      {
        worstRelSlope: sig(eSlope, 3),
        worstRelGradient: sig(eGrad, 3),
        worstAbsPerpendicular: sig(perp, 3),
      }
    );
  }

  if (wanted('F3.')) {
    const L = lim('F3');
    const sp = CT.hubbleOm;
    const dir = K.degeneracyDirection({
      base: sp.base,
      z: sp.z,
      quantity: sp.quantity,
      x: 'Om',
      y: 'H0',
    });
    const D = K.quantityAt(sp.base, {}, sp.z, sp.quantity);
    const logSlope = (dir.gradient.dy * sp.base.H0) / D;
    const cont = contourOf('hubbleOm');
    let worst = 0;
    ORACLE.contours.hubbleOm.h0ClosedForm.forEach((h, i) => {
      const p = findPoint(cont, ORACLE.contours.hubbleOm.solutions[i].x);
      worst = Math.max(worst, p ? rel(p.y, h) : Infinity);
    });
    row('F3', Math.abs(logSlope + 1) <= L.maxAbsLogSlope && worst <= L.maxRel, {
      dLnDdLnH0: sig(logSlope, 8),
      worstRelH0ClosedForm: sig(worst, 3),
    });
  }

  if (wanted('F4.')) {
    const a = contourOf('skipRefusals');
    let ok =
      a.points.length >= 1 &&
      a.skipped.every(s => ['no-root', 'all-refused'].includes(s.code));
    for (const p of a.points)
      ok =
        ok &&
        refusal(() =>
          K.quantityAt(
            CT.skipRefusals.base,
            { Om: p.x, Ode: p.y },
            CT.skipRefusals.z,
            'luminosity'
          )
        ) === null;
    const u = contourOf('unreachableTarget');
    const uOk =
      u.points.length === 0 &&
      u.skipped.length === CT.unreachableTarget.x.n &&
      u.skipped.every(s => s.code === 'no-root');
    const matchesOracle =
      JSON.stringify(a.skipped.map(s => s.index)) ===
      JSON.stringify(
        ORACLE.contours.skipRefusals.solutions
          .filter(s => s.y === null)
          .map(s => s.xIndex)
      );
    row('F4', ok && uOk, {
      skipRefusalsPoints: a.points.length,
      skipRefusalsSkipped: a.skipped.length,
      unreachablePoints: u.points.length,
      unreachableSkipped: u.skipped.length,
      skipMatchesOracle: matchesOracle,
    });
  }

  if (wanted('R1.')) {
    const t = process.cpuUsage();
    const one = K.createFriedmann({ H0: 70, Om: 0.3, Ode: 0.7 });
    const t1 = process.hrtime.bigint();
    for (let i = 0; i < 20; i++)
      K.createFriedmann({ H0: 70, Om: 0.3, Ode: 0.7 }).luminosityDistance(2);
    const t2 = process.hrtime.bigint();
    for (let i = 0; i < 20; i++) one.age();
    const t3 = process.hrtime.bigint();
    reported(
      'R1',
      {
        validationCpuSeconds: sig(
          (t.user + t.system - cpu0.user - cpu0.system) / 1e6,
          3
        ),
        msPerConstructionAndDistance: sig(Number(t2 - t1) / 20e6, 3),
        msPerAge: sig(Number(t3 - t2) / 20e6, 3),
      },
      'wall time on this machine; no bound committed'
    );
  }

  return rows;
}

/** The kernel verdict and the product state, computed from the rows by the function committed in the thresholds. */
export function gateFrom(rows) {
  const G = THRESHOLDS.gate.verdictFunction.kernelLegGroups;
  const st = id =>
    rows.find(r => r.id.startsWith(`${id}.`))?.status ?? 'absent';
  const all = ids => ids.every(i => st(i) === 'pass');
  const core = all(G.closedLegs) && all(G.oracleLegs) && all(G.refusalCore);
  const everything =
    core &&
    all(G.coverageLegs) &&
    all(G.refusalCoverage) &&
    all(G.degeneracyLegs);
  const kernelVerdict = everything ? 'A' : core ? 'B' : 'C';
  const authentic = G.authenticLegs.map(i => st(i));
  return {
    kernelVerdict,
    distancesTimesAges: core ? 'claimable' : 'not claimable',
    ensembleAndContours: everything ? 'claimable' : 'not claimable',
    productVerdict: authentic.every(s => s === 'pass')
      ? kernelVerdict
      : `NOT ESTABLISHED (${G.authenticLegs.filter((_, i) => authentic[i] !== 'pass').join(', ')} NOT RUN: no authentic file was supplied)`,
    consumers:
      'unmet (the consumers rule holds: no panel, lesson or model-page section is built; the product verdict is not A)',
    legs: Object.fromEntries(
      Object.values(G)
        .flat()
        .map(i => [i, st(i)])
    ),
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
  const gate = gateFrom(rows);
  const result = {
    format: 'gravitas.cosmology2-results/1',
    rows,
    gate,
    meta: {
      node: process.version,
      oracle: ORACLE.tools,
    },
  };
  if (args.includes('--json')) console.log(JSON.stringify(result, null, 1));
  else {
    for (const r of rows)
      console.log(
        `${r.status.toUpperCase().padEnd(8)} ${r.id.padEnd(40)} ${JSON.stringify(r.measured)}`
      );
    console.log(
      `\nkernel verdict ${gate.kernelVerdict}; product ${gate.productVerdict}`
    );
  }
  if (args.includes('--write-results') && !only.length)
    writeFileSync(
      path.join(ROOT, DIR, 'results.json'),
      `${JSON.stringify(result, null, 1)}\n`
    );
  if (args.includes('--write-failed') && !only.length) {
    const legs = rows
      .filter(r => r.status === 'fail')
      .map(r => ({ id: r.id, measured: r.measured, note: r.note }));
    writeFileSync(
      path.join(ROOT, DIR, 'failed-legs.json'),
      `${JSON.stringify(
        {
          format: 'gravitas.cosmology2-failed-legs/1',
          note: 'the legs that crossed a committed bound; they stay failing, only Carl resets a bound',
          legs,
        },
        null,
        1
      )}\n`
    );
  }
  process.exitCode = 0; // a failed leg is a recorded result, not a crash
}
