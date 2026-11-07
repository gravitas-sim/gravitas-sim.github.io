#!/usr/bin/env node
// =============================================================================
// Leg B6 of the late-time FLRW kernel: the published ages (Prompt 255, run after the published data arrived)
// -----------------------------------------------------------------------------
//   npm run cosmology2:b6                    print the table
//   npm run cosmology2:b6 -- --json          print it as JSON
//   npm run cosmology2:b6 -- --write-results rewrite b6-results.json and b6-failed-legs.json
//
// tests/fixtures/cosmology2/b6-thresholds.json (commit afd2a3e0) fixed the comparison rule before the kernel was
// run on these inputs: the tolerance terms in closed form from the printed numbers, the radiation density
// supplied, the allowance for the radiation and neutrino difference, the verdict function. This tool recomputes
// every term from the printed numbers in tests/fixtures/cosmology2/authentic/published-table.json, checks that
// they equal the committed ones, runs the kernel once per leg and judges. B6 is AGE-ONLY: no printed table of
// distances was found. The first-gate and follow-up files are read, never written.
// =============================================================================

import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as K from '../js/kernels/cosmology/late/index.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR = 'tests/fixtures/cosmology2';
const readText = rel => readFileSync(path.join(ROOT, rel), 'utf8');
const read = rel => JSON.parse(readText(rel));
export const B6 = read(`${DIR}/b6-thresholds.json`);
const OLD = read(`${DIR}/results.json`);
const FOLLOWUP = read(`${DIR}/followup-results.json`);

const G_PRINTED = 977.8; // km/s/Mpc per inverse Gyr, the pair Wright prints (b6-thresholds unitConversion)
const sig = (v, d = 4) => (Number.isFinite(v) ? Number(v.toPrecision(d)) : v);
const close = (a, b) =>
  Math.abs(a - b) <= 1e-12 * Math.max(Math.abs(b), 1e-300);

/** One unit of the last printed digit of a number as printed. */
function lastDigit(x) {
  const frac = String(x).split('.')[1] ?? '';
  return 10 ** -frac.length;
}

/** The printed values, read from the authentic file. */
export function printedValues() {
  const table = read(`${DIR}/authentic/published-table.json`);
  const planck = table.rows.find(r => r.identifier === 'arXiv:1807.06209');
  const wright = table.rows.find(
    r => r.identifier === 'arXiv:astro-ph/0609593'
  );
  const orH2 = Number(
    /Omega_r h\^2 = ([0-9.e-]+)/.exec(wright.radiation_as_printed)[1]
  );
  const marg = /^([0-9.]+) \+\/- ([0-9.]+)$/.exec(
    planck.derived_as_printed.plik_marginalised_age_Gyr
  );
  const [wA, wB] = wright.cases_as_printed;
  return {
    planck: {
      H0: planck.parameters_as_printed.H0,
      Om: planck.parameters_as_printed.Omega_m,
      age: planck.derived_as_printed.age_Gyr,
      margMean: Number(marg[1]),
      margErr: Number(marg[2]),
    },
    wright: {
      orH2,
      a: { H0: wA.H0, age: wA.age_Gyr },
      b: { H0: wB.H0, ageMyr: Number(/^([0-9]+) Myr$/.exec(wB.age)[1]) },
    },
    sha256: createHash('sha256')
      .update(
        readFileSync(path.join(ROOT, DIR, 'authentic/published-table.json'))
      )
      .digest('hex'),
  };
}

/** The tolerance terms of the committed rule, recomputed from the printed numbers (no kernel). */
export function toleranceTerms(P) {
  const f = B6.radiation.allowanceFraction;
  const { H0, Om, age } = P.planck;
  const h = H0 / 100;
  const Or = P.wright.orH2 / (h * h);
  const H0t = (age * H0) / G_PRINTED;
  const planck = {
    h,
    Or,
    H0t,
    T1: lastDigit(age) / age,
    T2: (0.5 * lastDigit(H0)) / H0,
    T3: (1 / (3 * Om ** 1.5 * H0t)) * 0.5 * lastDigit(Om),
    T4: (f * Or) / (Om ** 1.5 * H0t),
  };
  planck.tolerance = planck.T1 + planck.T2 + planck.T3 + planck.T4;
  planck.toleranceGyr = planck.tolerance * age;
  const wrightLeg = (H0, ageValue, ageUnit) => {
    const hh = H0 / 100;
    const Orw = P.wright.orH2 / (hh * hh);
    const s = Math.sqrt(Orw);
    const U1 = ageUnit / ageValue;
    const U2 = (0.5 * lastDigit(H0)) / H0;
    // the coefficient 4.165: one unit of its last printed digit is 0.001
    const U3 = (s / 2) * ((0.5 * 0.001) / 4.165 + 2 * U2);
    const U4 = 1e-6 / (24 * s);
    return { Or: Orw, sqrtOr: s, U1, U2, U3, U4, tolerance: U1 + U2 + U3 + U4 };
  };
  return {
    planck,
    wrightA: wrightLeg(
      P.wright.a.H0,
      P.wright.a.age,
      lastDigit(P.wright.a.age)
    ),
    wrightB: wrightLeg(P.wright.b.H0, P.wright.b.ageMyr, 1),
  };
}

const LEG = id => B6.legs.find(l => l.id === id);

/** Run the three legs and the reported rows. @returns {{rows: object[], meta: object}} */
export function runB6() {
  const P = printedValues();
  const T = toleranceTerms(P);
  const rows = [];
  const meta = { node: process.version, dataSha256: P.sha256 };
  meta.dataShaMatchesRule = P.sha256 === B6.data.sha256;
  // the committed derived numbers must be the recomputed ones
  const pinned = {
    planck: LEG('B6.planckBestFitAge').derived,
    wrightA: LEG('B6.wrightOpenH0_97_78').derived,
    wrightB: LEG('B6.wrightOpenH0_977_8').derived,
  };
  meta.ruleReproduces = Object.keys(pinned).every(k =>
    Object.entries(pinned[k]).every(([n, v]) => close(T[k][n], v))
  );

  const age = (H0, Om, Or, Ode) => {
    const c = K.createFriedmann(
      Ode === undefined ? { H0, Om, Or, w: -1 } : { H0, Om, Or, Ode, w: -1 }
    );
    return c.quantity('age', 0);
  };
  const legRow = (
    id,
    tag,
    H0,
    Om,
    orSupplied,
    Ode,
    printedGyr,
    unitGyr,
    tol,
    scale
  ) => {
    const k = age(H0, Om, orSupplied, Ode);
    const ctrl = age(H0, Om, 0, Ode === undefined ? undefined : Ode);
    const kernel = k.value * scale;
    const control = ctrl.value * scale;
    const rel = (kernel - printedGyr * scale) / (printedGyr * scale);
    const unit = unitGyr * scale;
    const printed = printedGyr * scale;
    const diffUnits = (kernel - printed) / unit;
    return {
      id,
      status: Math.abs(rel) <= tol ? 'pass' : 'fail',
      measured: {
        H0,
        Om,
        OrSupplied: orSupplied,
        flat: Ode === undefined,
        kernelAge: sig(kernel, 10),
        kernelAgeError: sig(k.error * scale, 3),
        printedAge: printed,
        unit: sig(unit, 6),
        ageUnitName: scale === 1 ? 'Gyr' : 'Myr',
        signedRelativeDifference: sig(rel, 5),
        toleranceFromRule: sig(tol, 6),
        differenceInUnitsOfLastPrintedDigit: sig(diffUnits, 5),
        literalCommittedReadingOneUnit:
          Math.abs(diffUnits) <= 1 ? 'pass' : 'fail',
        controlRadiationZeroAge: sig(control, 10),
        controlRadiationZeroSignedRelativeDifference: sig(
          (control - printed) / printed,
          5
        ),
        controlRadiationZeroWithinTolerance:
          Math.abs((control - printed) / printed) <= tol,
      },
      note: tag,
    };
  };

  rows.push(
    legRow(
      'B6.planckBestFitAge',
      'flat closure (Ode = 1 - Om - Or); Or is the printed Wright coefficient / h^2',
      P.planck.H0,
      P.planck.Om,
      T.planck.Or,
      undefined,
      P.planck.age,
      lastDigit(P.planck.age),
      T.planck.tolerance,
      1
    )
  );
  rows.push(
    legRow(
      'B6.wrightOpenH0_97_78',
      'empty open universe: Om = 0, Ode = 0',
      P.wright.a.H0,
      0,
      T.wrightA.Or,
      0,
      P.wright.a.age,
      lastDigit(P.wright.a.age),
      T.wrightA.tolerance,
      1
    )
  );
  rows.push(
    legRow(
      'B6.wrightOpenH0_977_8',
      'empty open universe: Om = 0, Ode = 0',
      P.wright.b.H0,
      0,
      T.wrightB.Or,
      0,
      P.wright.b.ageMyr / 1000,
      0.001,
      T.wrightB.tolerance,
      1000
    )
  );

  // reported, not judged
  const pk = rows[0].measured.kernelAge;
  rows.push({
    id: 'B6.reported.planckMarginalised',
    status: 'reported',
    measured: {
      printedMarginalisedMean: P.planck.margMean,
      printedError: P.planck.margErr,
      differenceInUnitsOfThatError: sig(
        (pk - P.planck.margMean) / P.planck.margErr,
        4
      ),
    },
    note: 'reported only: a best-fit age is what the best-fit parameters give',
  });
  const cf = (H0, Orw) => {
    // (1 / H0) in Gyr from the kernel's own constant, via the ratio of the radiation-free age
    const inv = age(H0, 0, 0, 0);
    return inv.value / (1 + Math.sqrt(Orw));
  };
  rows.push({
    id: 'B6.reported.closedFormWright',
    status: 'reported',
    measured: {
      H0_97_78: {
        kernel: rows[1].measured.kernelAge,
        closedForm: sig(cf(P.wright.a.H0, T.wrightA.Or), 10),
      },
      H0_977_8: {
        kernel: rows[2].measured.kernelAge / 1000,
        closedForm: sig(cf(P.wright.b.H0, T.wrightB.Or), 10),
      },
    },
    note: 'the empty-universe-with-radiation age (1/H0)/(1 + sqrt(Or)) beside the kernel: a consistency note, not a leg',
  });
  meta.terms = T;
  return { rows, meta };
}

/** B6, the two product verdicts and the consumers clause, by the function committed in b6-thresholds.json. */
export function gateFromB6(rows) {
  const judged = rows.filter(r => r.status === 'pass' || r.status === 'fail');
  const failed = judged.filter(r => r.status === 'fail').map(r => r.id);
  const b6 = failed.length ? 'fail' : 'pass';
  const form = (name, kernelVerdict) => {
    const product =
      b6 === 'pass'
        ? `${kernelVerdict} (age-only B6)`
        : `NOT ESTABLISHED (B6 FAILED: ${failed.join(', ')})`;
    const letterA = b6 === 'pass' && kernelVerdict === 'A';
    return {
      kernelVerdict,
      productVerdict: product,
      consumersClause: letterA
        ? "met on the letter (product verdict A, age-only B6): the consumers rule is NOT lifted by this; lifting it, and whether an age-only B6 satisfies the contract B6, are Carl's calls"
        : `unmet (${b6 === 'pass' ? `product verdict ${kernelVerdict}` : 'B6 failed'}; the consumers clause is met only by a product verdict of A)`,
    };
  };
  return {
    b6,
    failedLegs: failed,
    original: form('original', OLD.gate.kernelVerdict),
    followup: form('followup', FOLLOWUP.gate.followupKernelVerdict),
  };
}

const isMain =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  const args = process.argv.slice(2);
  const { rows, meta } = runB6();
  const result = {
    format: 'gravitas.cosmology2-b6-results/1',
    rows,
    gate: gateFromB6(rows),
    meta: {
      node: meta.node,
      dataSha256: meta.dataSha256,
      dataShaMatchesRule: meta.dataShaMatchesRule,
      ruleReproduces: meta.ruleReproduces,
      terms: meta.terms,
    },
  };
  if (args.includes('--json')) console.log(JSON.stringify(result, null, 1));
  else {
    for (const r of rows)
      console.log(
        `${r.status.toUpperCase().padEnd(9)} ${r.id.padEnd(34)} ${JSON.stringify(r.measured).slice(0, 360)}`
      );
    console.log(
      `\nB6 ${result.gate.b6}; original: ${result.gate.original.productVerdict}; follow-up: ${result.gate.followup.productVerdict}; rule reproduces ${meta.ruleReproduces}; data sha matches ${meta.dataShaMatchesRule}`
    );
  }
  if (args.includes('--write-results')) {
    writeFileSync(
      path.join(ROOT, DIR, 'b6-results.json'),
      `${JSON.stringify(result, null, 1)}\n`
    );
    writeFileSync(
      path.join(ROOT, DIR, 'b6-failed-legs.json'),
      `${JSON.stringify(
        {
          format: 'gravitas.cosmology2-b6-failed-legs/1',
          note: 'the B6 legs that crossed a committed tolerance; they stay failing, only Carl resets a bound',
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
