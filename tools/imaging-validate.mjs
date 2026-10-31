#!/usr/bin/env node
// =============================================================================
// The imaging kernel against its committed thresholds (Prompt 230 Part A)
// -----------------------------------------------------------------------------
//   npm run imaging:validate                    print the table
//   npm run imaging:validate -- --json          print it as JSON
//   npm run imaging:validate -- --write-results rewrite results.json and failed-legs.json
//   npm run imaging:validate -- --only A,B      run the rows whose id starts with one of these
//
// tests/fixtures/imaging/thresholds.json fixed every bound before js/kernels/imaging/
// existed; this runs the checks against the kernel and judges them against the bounds
// read from that file. The B rows read the cases and results pinned in
// oracle-results.json (tools/imaging-oracle/oracle.py: numpy, scipy, astropy
// constants, no Gravitas code). A crossed bound is a failed row, left failing.
// =============================================================================

import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import * as K from '../js/kernels/imaging/index.js';
import { IMAGED_PLANETS } from '../js/data/imagedPlanets.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const FIX = 'tests/fixtures/imaging';
const read = rel => JSON.parse(readFileSync(path.join(ROOT, rel), 'utf8'));
export const THRESHOLDS = read(`${FIX}/thresholds.json`);
const ORA = read(`${FIX}/oracle-results.json`);
const lim = id => THRESHOLDS.checks.find(c => c.id === id).limits;

const AU = 149597870700;
const PC = (AU * 648000) / Math.PI;
const R_SUN = 6.957e8;
const rows = [];
const row = (id, pass, measured, note = '') =>
  rows.push({ id, status: pass ? 'pass' : 'fail', measured, note });
const report = (id, measured, note = '') =>
  rows.push({ id, status: 'report', measured, note });
const notRun = (id, why) =>
  rows.push({ id, status: 'not-run', measured: null, note: why });
const rel = (a, b) => Math.abs(a - b) / Math.abs(b);
const lcg = seed => {
  let s = 0;
  for (const ch of seed) s = (s * 31 + ch.charCodeAt(0)) >>> 0;
  return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
};
const SEED = THRESHOLDS.seeds.ensemble;
const uni = (r, lo, hi) => lo + (hi - lo) * r();
const logu = (r, lo, hi) => Math.exp(uni(r, Math.log(lo), Math.log(hi)));
const throwsCoded = f => {
  try {
    f();
  } catch (e) {
    return e instanceof K.ImagingError && typeof e.code === 'string';
  }
  return false;
};

const EARTH = {
  starTeffK: 5772,
  starRadiusM: R_SUN,
  planetRadiusM: K.R_EARTH_M,
  semiMajorM: AU,
  geometricAlbedo: 0.3,
};

function legA() {
  const r = lcg(`${SEED}:A`);
  {
    let worst = 0;
    for (let i = 0; i < lim('A1').cases; i++) {
      const p = {
        geometricAlbedo: r(),
        planetRadiusM: logu(r, 1e6, 1e8),
        semiMajorM: logu(r, 1e10, 1e13),
      };
      const c = K.reflectedContrast(p);
      worst = Math.max(
        worst,
        p.geometricAlbedo === 0
          ? 0
          : rel(c, p.geometricAlbedo * (p.planetRadiusM / p.semiMajorM) ** 2)
      );
    }
    row('A1', worst <= lim('A1').maxRelErr, { maxRelErr: worst });
  }
  {
    const f = a =>
      K.reflectedContrast({
        geometricAlbedo: 1,
        planetRadiusM: 1,
        semiMajorM: 1,
        phaseAngleRad: a,
      });
    let mono = true;
    let prev = Infinity;
    for (let i = 0; i <= 360; i++) {
      const v = f((Math.PI * i) / 360);
      if (v > prev + 1e-15) mono = false;
      prev = v;
    }
    const err = Math.max(
      Math.abs(f(0) - 1),
      Math.abs(f(Math.PI / 2) - 1 / Math.PI),
      Math.abs(f(Math.PI))
    );
    row('A2', err <= lim('A2').maxAbsErr && mono, {
      maxAbsErr: err,
      monotone: mono,
    });
  }
  {
    const p = { ...EARTH, planetTeffK: 255, wavelengthM: 0.1 };
    const c = K.thermalContrast(p);
    const closed = (p.planetRadiusM / p.starRadiusM) ** 2 * (255 / 5772);
    row('A3', rel(c, closed) <= lim('A3').maxRelErr, {
      relErr: rel(c, closed),
    });
  }
  {
    const p = {
      ...EARTH,
      planetTeffK: 255,
      lambdaMinM: 1e-9,
      lambdaMaxM: 1,
      intervals: 40000,
    };
    const c = K.bandThermalContrast(p);
    const closed = (p.planetRadiusM / p.starRadiusM) ** 2 * (255 / 5772) ** 4;
    row('A4', rel(c, closed) <= lim('A4').maxRelErr, {
      relErr: rel(c, closed),
    });
  }
  {
    const base = {
      starTeffK: 5772,
      starRadiusM: R_SUN,
      semiMajorM: AU,
      bondAlbedo: 0.3,
    };
    const t1 = K.irradiationTemperature(base);
    const t2 = K.irradiationTemperature({ ...base, semiMajorM: 2 * AU });
    const closed = 5772 * Math.sqrt(R_SUN / (2 * AU)) * 0.7 ** 0.25;
    const e = Math.max(rel(t1, closed), rel(t2, t1 / Math.SQRT2));
    row('A5', e <= lim('A5').maxRelErr, { maxRelErr: e, T_eq_K: t1 });
  }
  {
    const one = K.angularSeparation({ separationM: AU, distanceM: PC }).arcsec;
    const earth10 = K.angularSeparation({
      separationM: AU,
      distanceM: 10 * PC,
    }).arcsec;
    const small = K.angularSeparation({ separationM: 1e3, distanceM: 1e12 });
    const e = Math.max(rel(one, 1), rel(earth10, 0.1), rel(small.rad, 1e-9));
    row('A6', e <= lim('A6').maxRelErr, {
      oneAuAtOnePc: one,
      earthAtTenPc: earth10,
      maxRelErr: e,
    });
  }
  {
    const d = K.diffractionScale({ apertureM: 6, wavelengthM: 5.5e-7 });
    const e = rel(d.lambdaOverDRad, 5.5e-7 / 6);
    const ratio = d.rayleighRad / d.lambdaOverDRad;
    row(
      'A7',
      e <= lim('A7').maxRelErr &&
        Math.abs(ratio - lim('A7').rayleighRatio) <= lim('A7').rayleighTol &&
        d.isInnerWorkingAngle === false &&
        /not|separate/i.test(d.statement) &&
        /inner working angle/.test(d.statement),
      {
        relErr: e,
        rayleighRatio: ratio,
        isInnerWorkingAngle: d.isInnerWorkingAngle,
      }
    );
  }
  {
    const dist = 10 * PC;
    const sep = K.angularSeparation({ separationM: AU, distanceM: dist });
    const apertures = [0.25, 2.4, 6, 8, 30].map(D => ({
      apertureM: D,
      lambdaOverDArcsecAt550nm: K.diffractionScale({
        apertureM: D,
        wavelengthM: 5.5e-7,
      }).lambdaOverDArcsec,
    }));
    const vis = K.planetContrast({
      ...EARTH,
      wavelengthM: 5.5e-7,
      planetTeffK: undefined,
    });
    const ir = K.planetContrast({ ...EARTH, wavelengthM: 1e-5 });
    report('A8', {
      separationArcsec: sep.arcsec,
      apertures,
      visible550nm: {
        reflected: vis.reflected,
        thermal: vis.thermal,
        total: vis.total,
      },
      thermal10um: {
        reflected: ir.reflected,
        thermal: ir.thermal,
        total: ir.total,
      },
      irradiationTeqK: ir.irradiationTeqK,
    });
  }
}

function legB() {
  const maxRel = (list, f) =>
    list.reduce((m, c) => Math.max(m, rel(f(c), c.contrast ?? c.teq)), 0);
  const th = c => ({
    starTeffK: c.starTeffK,
    starRadiusM: c.starRadiusM,
    planetTeffK: c.planetTeffK,
    planetRadiusM: c.planetRadiusM,
  });
  {
    const e = maxRel(ORA.mono, c =>
      K.thermalContrast({ ...th(c), wavelengthM: c.wavelengthM })
    );
    row('B1', e <= lim('B1').maxRelErr, {
      maxRelErr: e,
      cases: ORA.mono.length,
    });
  }
  {
    const e = maxRel(ORA.band, c =>
      K.bandThermalContrast({
        ...th(c),
        lambdaMinM: c.lambdaMinM,
        lambdaMaxM: c.lambdaMaxM,
      })
    );
    row('B2', e <= lim('B2').maxRelErr, {
      maxRelErr: e,
      cases: ORA.band.length,
    });
  }
  {
    const e = maxRel(ORA.reflected, c => K.reflectedContrast(c));
    row('B3', e <= lim('B3').maxRelErr, {
      maxRelErr: e,
      cases: ORA.reflected.length,
    });
  }
  {
    const e = maxRel(ORA.teq, c =>
      K.irradiationTemperature({
        starTeffK: c.starTeffK,
        starRadiusM: c.starRadiusM,
        semiMajorM: c.semiMajorM,
        bondAlbedo: c.bondAlbedo,
        redistribution: c.redistribution,
      })
    );
    row('B4', e <= lim('B4').maxRelErr, {
      maxRelErr: e,
      cases: ORA.teq.length,
    });
  }
  {
    let worst = 0;
    let n = 0;
    const per = {};
    for (const cv of ORA.curves) {
      let w = 0;
      cv.wavelengthsM.forEach((lam, i) => {
        const c = K.planetContrast({
          starTeffK: cv.starTeffK,
          starRadiusM: cv.starRadiusM,
          planetTeffK: cv.planetTeffK,
          planetRadiusM: cv.planetRadiusM,
          semiMajorM: cv.semiMajorM,
          geometricAlbedo: cv.geometricAlbedo,
          phaseAngleRad: cv.phaseAngleRad,
          wavelengthM: lam,
        });
        w = Math.max(w, rel(c.total, cv.total[i]));
        n++;
      });
      per[cv.name] = w;
      worst = Math.max(worst, w);
    }
    row(
      'B5',
      worst <= lim('B5').maxRelErr && n === 3 * lim('B5').pointsPerCurve,
      {
        maxRelErr: worst,
        points: n,
        perCurve: per,
      }
    );
  }
  {
    let agree = 0;
    for (const c of ORA.observability) {
      const v = K.observable({
        separationArcsec: c.separationArcsec,
        contrast: c.contrast,
        instrument: {
          innerWorkingArcsec: c.innerWorkingArcsec,
          contrastFloor: c.contrastFloor,
        },
      });
      if (v.code === c.expected) agree++;
    }
    const rate = agree / ORA.observability.length;
    row('B6', rate >= lim('B6').agreement, {
      agreement: rate,
      cases: ORA.observability.length,
    });
  }
}

function legC() {
  const r = lcg(`${SEED}:C1`);
  let ok = 0;
  const n = 500;
  for (let i = 0; i < n; i++) {
    const s = {
      starTeffK: uni(r, 3000, 7000),
      starRadiusM: logu(r, 0.3, 2) * R_SUN,
      planetRadiusM: logu(r, 0.01, 2) * 7.1492e7,
      semiMajorM: logu(r, 0.05, 50) * AU * 2,
      geometricAlbedo: r(),
      wavelengthM: logu(r, 4e-7, 2.5e-5),
    };
    const a1 = uni(r, 0, Math.PI);
    const a2 = uni(r, a1, Math.PI);
    const c1 = K.planetContrast({ ...s, phaseAngleRad: a1, planetTeffK: 300 });
    const c2 = K.planetContrast({ ...s, phaseAngleRad: a2, planetTeffK: 300 });
    const hot = K.planetContrast({ ...s, phaseAngleRad: a1, planetTeffK: 600 });
    const d1 = logu(r, 1, 100) * PC;
    const sep = x => K.angularSeparation({ separationM: x, distanceM: d1 }).rad;
    const checks = [
      Math.abs(c1.total - (c1.thermal + c1.reflected)) <=
        1e-15 * c1.total + 1e-300,
      c2.reflected <= c1.reflected + 1e-300,
      hot.thermal > c1.thermal,
      c1.total >= 0 && Number.isFinite(c1.total),
      sep(s.semiMajorM * 2) > sep(s.semiMajorM),
      K.angularSeparation({ separationM: s.semiMajorM, distanceM: d1 * 2 })
        .rad < sep(s.semiMajorM),
    ];
    if (checks.every(Boolean)) ok++;
  }
  row('C1', ok / n >= lim('C1').holds, { holds: ok / n, systems: n });
}

function legD() {
  const r = lcg(`${SEED}:D`);
  const obsCase = kind => {
    const iwa = logu(r, 0.05, 0.5);
    const floor = logu(r, 1e-10, 1e-4);
    const inst = { innerWorkingArcsec: iwa, contrastFloor: floor };
    if (kind === 'inside')
      return K.observable({
        separationArcsec: iwa * uni(r, 0.01, 0.99),
        contrast: floor * logu(r, 1, 1e4),
        instrument: inst,
      });
    return K.observable({
      separationArcsec: iwa * uni(r, 1.01, 40),
      contrast: floor * uni(r, 0.001, 0.99),
      instrument: inst,
    });
  };
  {
    let ok = 0;
    for (let i = 0; i < lim('D1').cases; i++) {
      const v = obsCase('inside');
      if (
        v.observable === false &&
        v.code === 'inside-inner-working-angle' &&
        v.message === 'not observable with this instrument'
      )
        ok++;
    }
    row('D1', ok / lim('D1').cases >= lim('D1').rate, {
      rate: ok / lim('D1').cases,
    });
  }
  {
    let ok = 0;
    for (let i = 0; i < lim('D2').cases; i++) {
      const v = obsCase('faint');
      if (v.observable === false && v.code === 'below-contrast-floor') ok++;
    }
    row('D2', ok / lim('D2').cases >= lim('D2').rate, {
      rate: ok / lim('D2').cases,
    });
  }
  {
    let ok = 0;
    for (let i = 0; i < lim('D3').cases; i++) {
      const v = K.observable({
        separationArcsec: logu(r, 0.01, 2),
        contrast: logu(r, 1e-11, 1e-3),
        instrument: {
          apertureM: logu(r, 0.2, 10),
          wavelengthM: logu(r, 4e-7, 2e-6),
          contrastFloor: 1e-8,
        },
      });
      if (v.ok === false && v.code === 'no-inner-working-angle') ok++;
    }
    row('D3', ok / lim('D3').cases >= lim('D3').rate, {
      rate: ok / lim('D3').cases,
    });
  }
  {
    const base = { ...EARTH, wavelengthM: 5.5e-7, planetTeffK: 255 };
    const bad = [
      () => K.planetContrast({ ...base, planetRadiusM: -1 }),
      () => K.planetContrast({ ...base, planetRadiusM: NaN }),
      () => K.planetContrast({ ...base, starRadiusM: 0 }),
      () => K.planetContrast({ ...base, starTeffK: -5 }),
      () => K.planetContrast({ ...base, planetTeffK: Infinity }),
      () => K.planetContrast({ ...base, wavelengthM: -1e-6 }),
      () => K.planetContrast({ ...base, geometricAlbedo: 1.2 }),
      () => K.planetContrast({ ...base, geometricAlbedo: -0.1 }),
      () => K.planetContrast({ ...base, semiMajorM: R_SUN / 2 }),
      () => K.planetContrast({ ...base, phaseAngleRad: 4 }),
    ];
    const reps = lim('D4').cases / bad.length;
    let ok = 0;
    for (let k = 0; k < reps; k++)
      for (const f of bad) if (throwsCoded(f)) ok++;
    row('D4', ok / lim('D4').cases >= lim('D4').rate, {
      rate: ok / lim('D4').cases,
    });
  }
  {
    let ok = 0;
    const n = lim('D5').cases;
    for (let i = 0; i < n; i++) {
      const base = {
        starTeffK: uni(r, 3000, 7000),
        starRadiusM: logu(r, 0.3, 2) * R_SUN,
        semiMajorM: logu(r, 0.5, 50) * AU * 2,
      };
      const teq = K.irradiationTemperature(base);
      const hi = K.selfLuminousCheck({
        planetTeffK: teq * uni(r, 2.01, 20),
        irradiationTeqK: teq,
      });
      const lo = K.selfLuminousCheck({
        planetTeffK: teq * uni(r, 0.5, 1.1),
        irradiationTeqK: teq,
      });
      if (
        hi.selfLuminous &&
        !hi.irradiated &&
        !lo.selfLuminous &&
        lo.irradiated
      )
        ok++;
    }
    row('D5', ok / n >= lim('D5').rate, { rate: ok / n });
  }
}

function legE() {
  const have = IMAGED_PLANETS.filter(p => p[2] > 0 && p[3] > 0);
  const insts = THRESHOLDS.instruments.list;
  const perInstrument = {};
  let finite = 0;
  for (const inst of insts) perInstrument[inst.id] = 0;
  let selfLum = 0;
  let withTeq = 0;
  for (const p of have) {
    const s = K.angularSeparation({
      separationM: p[3] * AU,
      distanceM: p[2] * PC,
    });
    if (Number.isFinite(s.arcsec) && s.arcsec > 0) finite++;
    for (const inst of insts) {
      const v = K.observable({
        separationArcsec: s.arcsec,
        contrast: 1,
        instrument: inst,
      });
      if (v.code !== 'inside-inner-working-angle') perInstrument[inst.id]++;
    }
    if (p[6] > 0 && p[7] > 0 && p[8] > 0) {
      withTeq++;
      const teq = K.irradiationTemperature({
        starTeffK: p[7],
        starRadiusM: p[8] * R_SUN,
        semiMajorM: Math.max(p[3] * AU, p[8] * R_SUN * 1.01),
      });
      if (
        K.selfLuminousCheck({ planetTeffK: p[6], irradiationTeqK: teq })
          .selfLuminous
      )
        selfLum++;
    }
  }
  report(
    'E1',
    {
      tableRows: IMAGED_PLANETS.length,
      rowsWithDistanceAndAxis: have.length,
      separationsFinitePositive: finite,
      outsideInnerWorkingAngle: perInstrument,
      rowsWithTemperatureAndStar: withTeq,
      temperatureOverTwiceIrradiationEquilibrium: selfLum,
    },
    'separations from the archive columns; contrast ignored here (1)'
  );
  notRun(
    'E2',
    'no published contrast table for the imaged planets and no cited coronagraph working-angle value was supplied; nothing was typed from memory'
  );
}

const args = process.argv.slice(2);
const only = args.includes('--only')
  ? args[args.indexOf('--only') + 1].split(',')
  : null;
const wants = leg => !only || only.some(o => o.startsWith(leg));
const t0 = Date.now();
if (wants('A')) legA();
if (wants('B')) legB();
if (wants('C')) legC();
if (wants('D')) legD();
if (wants('E')) legE();

const failed = rows.filter(r => r.status === 'fail');
if (args.includes('--json')) console.log(JSON.stringify(rows, null, 1));
else {
  for (const r of rows)
    console.log(
      `${r.status.toUpperCase().padEnd(7)} ${r.id.padEnd(5)} ${JSON.stringify(r.measured).slice(0, 260)}`
    );
  console.log(
    `${rows.filter(r => r.status === 'pass').length} pass, ${failed.length} fail, ${rows.filter(r => r.status === 'report').length} report, ${rows.filter(r => r.status === 'not-run').length} not run (${Math.round((Date.now() - t0) / 1000)} s)`
  );
}
if (args.includes('--write-results')) {
  const w = (f, o) =>
    writeFileSync(path.join(ROOT, FIX, f), JSON.stringify(o, null, 2) + '\n');
  w('results.json', { rows });
  w('failed-legs.json', {
    note: 'Legs of tests/fixtures/imaging/thresholds.json that crossed their bound, kept failing and labelled (only Carl resets a bound).',
    failed: failed.map(r => ({
      id: r.id,
      status: 'fail',
      measured: r.measured,
      note: r.note,
      reason: '',
    })),
    notRun: rows
      .filter(r => r.status === 'not-run')
      .map(r => ({ id: r.id, why: r.note })),
  });
}
process.exit(failed.length ? 1 : 0);
