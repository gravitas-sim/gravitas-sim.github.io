#!/usr/bin/env node
// =============================================================================
// The late-time FLRW kernel's follow-up legs against their committed thresholds (Prompt 255b)
// -----------------------------------------------------------------------------
//   npm run cosmology2:followup                    print the table
//   npm run cosmology2:followup -- --json          print it as JSON
//   npm run cosmology2:followup -- --write-results rewrite followup-results.json and followup-failed-legs.json
//
// tests/fixtures/cosmology2/followup-thresholds.json fixed every bound and the rule that sets them before any
// code of this follow-up existed. The four old legs it replaces (A7, B1, B3, F3) are not edited: the old
// validator is run here and its rows must reproduce results.json to the digit (meta.oldLegsReproduce).
// =============================================================================

import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { GYR_PER_INV_H0 as GYR, C_KMS } from '../js/kernels/cosmology/flrw.js';
import * as K from '../js/kernels/cosmology/late/index.js';
import { runValidation, gateFrom } from './cosmology2-validate.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR = 'tests/fixtures/cosmology2';
const read = rel => JSON.parse(readFileSync(path.join(ROOT, rel), 'utf8'));
export const FOLLOWUP = read(`${DIR}/followup-thresholds.json`);
const THRESHOLDS = read(`${DIR}/thresholds.json`);
const ORACLE = read(`${DIR}/oracle-results.json`);
const FO = read(`${DIR}/followup-oracle.json`);
const OLD = read(`${DIR}/results.json`);

const lim = id => FOLLOWUP.checks.find(c => c.id.startsWith(`${id}.`)).limits;
const fullId = id => FOLLOWUP.checks.find(c => c.id.startsWith(`${id}.`)).id;
const sig = (v, d = 4) => (Number.isFinite(v) ? Number(v.toPrecision(d)) : v);
const rel = (a, b) => Math.abs(a - b) / Math.max(Math.abs(b), 1e-300);
const maxOf = a => a.reduce((m, v) => Math.max(m, v), 0);

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

/** The oracle rows with astropy's age(z) rows kept only where astropy satisfies its own identity at the bound. */
function consistency(identityBound) {
  let ageRows = 0;
  const excluded = [];
  let ownWorst = 0;
  for (const s of ORACLE.sets)
    for (const r of s.rows) {
      ageRows++;
      const a = r.astropy;
      const id = Math.abs(s.age.astropy - a.lookback - a.ageAtZ) / a.ageAtZ;
      if (!(id <= identityBound)) excluded.push(`${s.id} z=${r.z}`);
      const o = r.own;
      ownWorst = Math.max(
        ownWorst,
        Math.abs(s.age.own - o.lookback - o.ageAtZ) / o.ageAtZ
      );
    }
  return { ageRows, excluded, ownWorst };
}

export async function runFollowup() {
  const rows = [];
  const row = (id, pass, measured, note = '') =>
    rows.push({
      id: fullId(id),
      status: pass ? 'pass' : 'fail',
      measured,
      note,
    });

  // ---- A7b ----
  {
    const L = lim('A7b');
    const dh = C_KMS / L.H0;
    const g = GYR / L.H0;
    const eD = [];
    const eAge = [];
    const eFormulaVsOracle = [];
    const eKernelVsOracle = [];
    L.omegaM.forEach(Om => {
      const c = K.createFriedmann({ H0: L.H0, Om, Ode: 0 });
      for (const z of L.z) {
        const dl =
          ((2 * dh) / (Om * Om)) *
          (Om * z + (Om - 2) * (Math.sqrt(1 + Om * z) - 1));
        eD.push(rel(c.luminosityDistance(z), dl));
      }
      const h0t =
        Om < 1
          ? 1 / (1 - Om) -
            (Om / (2 * Math.pow(1 - Om, 1.5))) * Math.acosh(2 / Om - 1)
          : (Om / (2 * Math.pow(Om - 1, 1.5))) * Math.acos(2 / Om - 1) -
            1 / (Om - 1);
      const o = FO.ages.find(a => a.Om === Om).ageGyr;
      eAge.push(rel(c.age(), g * h0t));
      eFormulaVsOracle.push(rel(g * h0t, o));
      eKernelVsOracle.push(rel(c.age(), o));
    });
    row(
      'A7b',
      maxOf(eD) <= L.maxRel &&
        maxOf(eAge) <= L.maxRel &&
        maxOf(eFormulaVsOracle) <= L.maxRel &&
        maxOf(eKernelVsOracle) <= L.maxRel,
      {
        worstRelLuminosity: sig(maxOf(eD), 3),
        worstRelAgeVsFormula: sig(maxOf(eAge), 3),
        worstRelFormulaVsOracleQuadrature: sig(maxOf(eFormulaVsOracle), 3),
        worstRelKernelVsOracleQuadrature: sig(maxOf(eKernelVsOracle), 3),
        omegaM: L.omegaM.length,
      }
    );
  }

  // ---- B1b and B3b ----
  const compare = (which, bound, muBound, identityBound, id) => {
    const L = lim(id);
    const { ageRows, excluded, ownWorst } = consistency(identityBound);
    const per = {};
    for (const s of ORACLE.sets) {
      const c = K.createFriedmann(s.params);
      for (const r of s.rows) {
        for (const [k, fn] of KEYS) {
          if (k === 'ageAtZ' && excluded.includes(`${s.id} z=${r.z}`)) continue;
          const ref = which === 'astropy' ? r.astropy[k] : r.own[k];
          if (ref === undefined) continue;
          const v = which === 'astropy' ? fn(c, r.z) : r.own[k];
          const other = which === 'astropy' ? ref : r.astropy[k];
          if (which === 'own-vs-astropy' && other === undefined) continue;
          const d =
            k === 'mu'
              ? Math.abs(v - (which === 'astropy' ? ref : other))
              : rel(v, which === 'astropy' ? ref : other);
          per[k] = Math.max(per[k] ?? 0, d);
        }
      }
      const age0 =
        which === 'astropy'
          ? rel(c.age(), s.age.astropy)
          : rel(s.age.own, s.age.astropy);
      per.age0 = Math.max(per.age0 ?? 0, age0);
    }
    const over = Object.entries(per).filter(
      ([k, v]) => v > (k === 'mu' ? muBound : bound)
    );
    const fraction = excluded.length / ageRows;
    return {
      pass:
        over.length === 0 &&
        ownWorst <= L.ownIdentity &&
        fraction < L.maxExcludedFraction,
      measured: {
        worstPerQuantity: Object.fromEntries(
          Object.entries(per).map(([k, v]) => [k, sig(v, 3)])
        ),
        quantitiesOverBound: over.map(([k]) => k),
        ageRowsExcludedByTheRule: excluded.length,
        ageRows,
        excluded,
        oracleOwnIdentityWorst: sig(ownWorst, 3),
      },
    };
  };
  {
    const L = lim('B1b');
    const r = compare('astropy', L.maxRel, L.maxAbsMu, L.identityBound, 'B1b');
    row('B1b', r.pass, r.measured);
  }
  {
    const L = lim('B3b');
    const r = compare(
      'own-vs-astropy',
      L.maxRel,
      L.maxRel,
      L.identityBound,
      'B3b'
    );
    row('B3b', r.pass, r.measured);
  }

  // ---- F3b ----
  {
    const L = lim('F3b');
    const CT = THRESHOLDS.worlds.contours.hubbleOm;
    const D = K.quantityAt(CT.base, {}, CT.z, CT.quantity);
    const dir = K.degeneracyDirection({
      base: CT.base,
      z: CT.z,
      quantity: CT.quantity,
      x: 'Om',
      y: 'H0',
      rule: 'richardson',
    });
    const logSlope = (dir.gradient.dy * CT.base.H0) / D;
    let eSlope = 0;
    let eGrad = 0;
    let perp = 0;
    THRESHOLDS.worlds.directions.forEach((d, i) => {
      const r = K.degeneracyDirection({ ...d, rule: 'richardson' });
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
      'F3b',
      Math.abs(logSlope + 1) <= L.maxAbsLogSlope &&
        eSlope <= L.maxRelSlope &&
        eGrad <= L.maxRelGradient &&
        perp <= L.maxAbsPerp,
      {
        dLnDdLnH0: sig(logSlope, 10),
        worstRelSlope: sig(eSlope, 3),
        worstRelGradient: sig(eGrad, 3),
        worstAbsPerpendicular: sig(perp, 3),
      }
    );
  }
  return rows;
}

/** The follow-up kernel verdict: the original rows with the four replaced, by the original function. */
export function followupGate(newRows) {
  const map = FOLLOWUP.gate.verdictFunction.replaces;
  const status = {};
  for (const r of OLD.rows) status[r.id.split('.')[0]] = r.status;
  for (const [oldId, newId] of Object.entries(map))
    status[oldId] = newRows.find(r => r.id.startsWith(`${newId}.`)).status;
  const synthetic = Object.entries(status).map(([k, v]) => ({
    id: `${k}.x`,
    status: v,
  }));
  const gate = gateFrom(synthetic);
  return {
    followupKernelVerdict: gate.kernelVerdict,
    originalKernelVerdict: OLD.gate.kernelVerdict,
    productVerdict: gate.productVerdict,
    consumers: gate.consumers,
    legs: gate.legs,
  };
}

const isMain =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  const args = process.argv.slice(2);
  const rows = await runFollowup();
  // the old legs must reproduce to the digit (CPU time is recorded, not compared)
  const live = await runValidation();
  const strip = rs =>
    rs
      .filter(r => !r.id.startsWith('R1.'))
      .map(r => JSON.stringify([r.id, r.status, r.measured]));
  const reproduce =
    JSON.stringify(strip(live)) === JSON.stringify(strip(OLD.rows));
  const result = {
    format: 'gravitas.cosmology2-followup-results/1',
    rows,
    gate: followupGate(rows),
    meta: { node: process.version, oldLegsReproduce: reproduce },
  };
  if (args.includes('--json')) console.log(JSON.stringify(result, null, 1));
  else {
    for (const r of rows)
      console.log(
        `${r.status.toUpperCase().padEnd(6)} ${r.id.padEnd(46)} ${JSON.stringify(r.measured).slice(0, 400)}`
      );
    console.log(
      `\nfollow-up kernel verdict ${result.gate.followupKernelVerdict} (original ${result.gate.originalKernelVerdict}); old legs reproduce: ${reproduce}`
    );
  }
  if (args.includes('--write-results')) {
    writeFileSync(
      path.join(ROOT, DIR, 'followup-results.json'),
      `${JSON.stringify(result, null, 1)}\n`
    );
    writeFileSync(
      path.join(ROOT, DIR, 'followup-failed-legs.json'),
      `${JSON.stringify(
        {
          format: 'gravitas.cosmology2-followup-failed-legs/1',
          note: 'the follow-up legs that crossed a committed bound; they stay failing, only Carl resets a bound',
          legs: rows
            .filter(r => r.status === 'fail')
            .map(r => ({ id: r.id, measured: r.measured })),
        },
        null,
        1
      )}\n`
    );
  }
}
