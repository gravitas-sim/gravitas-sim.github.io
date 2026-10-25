/* global console, process */
// The gate's judge (Prompt 199 spike): runs the kernel against the oracle's results and the committed anchors.
// usage: node judge.mjs inputs.json results.json out.json
import { readFileSync, writeFileSync } from 'node:fs';
import * as K from '../../js/kernels/atmospheres/index.js';
import * as E from '../../js/kernels/atmospheres/escape.js';
import * as LESSON from '../../js/data/investigations/transit-photometry.js';

const [, , inFile, resFile, outFile] = process.argv;
const inp = JSON.parse(readFileSync(inFile, 'utf8'));
const ora = JSON.parse(readFileSync(resFile, 'utf8'));
const rel = (a, b) => (a === b ? 0 : Math.abs(a - b) / Math.abs(b));
const maxRel = pairs => pairs.reduce((m, [a, b]) => Math.max(m, rel(a, b)), 0);
const MEARTH = 5.9722e24;
const rec = {};
const put = (id, status, measured, note) => (rec[id] = { status, measured, ...(note ? { note } : {}) });

// A1
{
  const pairs = inp.equilibrium.map((p, i) => [
    K.equilibriumTemperature({ flux: p.flux, bondAlbedo: p.albedo, redistribution: p.eps }).temperature,
    ora.equilibrium[i],
  ]);
  const m = maxRel(pairs);
  put('A1.equilibrium', m <= 1e-12 ? 'pass' : 'fail', { relErrMax: m, points: pairs.length });
}

// the application's own planet table (js/world/build.js solarSystemData): distance in AU, ground temperature, gravity
const BODY = {
  Venus: { a: 0.723, albedo: 0.76, ground: 737, mu: 43.45, g: 8.87, pub: 227 },
  Earth: { a: 1.0, albedo: 0.306, ground: 288, mu: 28.97, g: 9.81, pub: 255 },
  Mars: { a: 1.524, albedo: 0.25, ground: 210, mu: 43.34, g: 3.71, pub: 210 },
};
const GIANT = {
  Jupiter: { a: 5.204, albedo: 0.343, teff: 124.4, ratio: 1.668 },
  Uranus: { a: 19.191, albedo: 0.3, teff: 59.1, ratio: 1.06 },
  Neptune: { a: 30.07, albedo: 0.29, teff: 59.3, ratio: 2.61 },
};
const teqOf = (a, A, eps = 1) =>
  K.equilibriumTemperature({ flux: K.fluxAt(1, a), bondAlbedo: A, redistribution: eps }).temperature;

// A2
{
  const rows = [];
  let ok = true;
  for (const [n, b] of Object.entries(BODY)) {
    const T = teqOf(b.a, b.albedo);
    const d = rel(T, b.pub);
    rows.push({ body: n, model: T, published: b.pub, rel: d, tol: 0.02 });
    ok = ok && d <= 0.02;
  }
  for (const [n, g] of Object.entries(GIANT)) {
    const T = teqOf(g.a, g.albedo);
    const pub = g.teff / g.ratio ** 0.25;
    const d = rel(T, pub);
    rows.push({ body: n, model: T, published: pub, rel: d, tol: 0.01, teff: g.teff, ratioPublished: g.ratio, ratioModel: (g.teff / T) ** 4 });
    ok = ok && d <= 0.01;
  }
  // the hot Jupiter: A = 0, uniform redistribution, the lesson's own a/R* (215.032 R_sun per AU, the lesson's rounding)
  const find = () => {
    const seen = new Set();
    let hit = null;
    const walk = (o, d) => {
      if (!o || typeof o !== 'object' || seen.has(o) || d > 12) return;
      seen.add(o);
      if (o.id === 'teq' && typeof o.compute === 'function') hit = o;
      for (const k of Object.keys(o)) walk(o[k], d + 1);
    };
    walk(LESSON, 0);
    return hit;
  };
  const lesson = find();
  const v = { P_d: 3.5247, M: 1.148 };
  const aAu = Math.cbrt((v.P_d / 365.25) ** 2 * v.M);
  const aOverR = (aAu * 215.032) / 1.155;
  const hj = K.equilibriumFromStar({ starT: 6065, starRadiusOverA: 1 / aOverR, bondAlbedo: 0, redistribution: 1 }).temperature;
  const lessonT = lesson.compute(v);
  const dl = rel(hj, lessonT);
  const inBand = hj >= 1400 && hj <= 1500;
  // the same planet with the repository's own IAU constants, for the record
  const iau = K.equilibriumFromStar({ starT: 6065, starRadiusOverA: (1.155 * K.R_SUN_M) / (0.04747 * K.AU_M) }).temperature;
  rows.push({ body: 'HD 209458 b', model: hj, lesson: lessonT, relToLesson: dl, bandK: [1400, 1500], withIauConstants: iau, relConstants: rel(iau, hj) });
  ok = ok && inBand && dl <= 1e-12;
  put('A2.anchors', ok ? 'pass' : 'fail', { rows }, 'published values typed from the cited publications, not re-read this session (checked: false)');
}

// A3
{
  const pairs = [];
  let monotone = true;
  inp.onelayer.forEach((p, i) => {
    const r = K.oneLayer({ emissionTemperature: p.te, emissivity: p.eps });
    pairs.push([r.surface, ora.onelayer[i][0]], [r.layer, ora.onelayer[i][1]]);
  });
  const lim0 = K.oneLayer({ emissionTemperature: 255, emissivity: 0 }).surface;
  const lim1 = K.oneLayer({ emissionTemperature: 255, emissivity: 1 }).surface;
  let prev = 0;
  for (let e = 0; e <= 1.0000001; e += 0.01) {
    const s = K.oneLayer({ emissionTemperature: 255, emissivity: Math.min(1, e) }).surface;
    if (s <= prev) monotone = false;
    prev = s;
  }
  const m = maxRel(pairs);
  const ok = m <= 1e-12 && lim0 === 255 && rel(lim1, 255 * 2 ** 0.25) <= 1e-15 && monotone;
  put('A3.onelayer', ok ? 'pass' : 'fail', { relErrMax: m, eps0: lim0, eps1RelToTwoQuarter: rel(lim1, 255 * 2 ** 0.25), monotone });
}

// A4
{
  const closed = [];
  inp.grey.forEach((p, i) => {
    closed.push([K.greyTemperature({ emissionTemperature: p.te, tau: p.tau }).temperature, ora.grey[i][0]]);
    closed.push([K.greyGround({ emissionTemperature: p.te, tauSurface: p.tau }).ground, ora.grey[i][1]]);
  });
  const ode = [];
  for (const o of ora.greyOde) {
    o.tau.forEach((x, j) => ode.push([K.greyTemperature({ emissionTemperature: inp.greyOde.te, tau: x }).temperature, o.T[j]]));
    ode.push([K.greyGround({ emissionTemperature: inp.greyOde.te, tauSurface: o.tauS }).ground, o.ground]);
  }
  const mc = maxRel(closed);
  const mo = maxRel(ode);
  put('A4.grey', mc <= 1e-12 && mo <= 1e-6 ? 'pass' : 'fail', { closedRelErrMax: mc, odeRelErrMax: mo, odeSolutions: ora.greyOde.length });
}

// A5
{
  const q0 = ora.milneSelf.q0;
  const qInf = ora.milneSelf.qAtTau20;
  const selfOk = rel(q0, 0.5774) <= 0.01 && rel(qInf, 0.7104) <= 0.01;
  let worst = 0;
  let at = 0;
  ora.milneTau.forEach((tau, i) => {
    const edd = K.greyTemperature({ emissionTemperature: 1, tau }).temperature;
    const d = Math.abs(edd / ora.milneT[i] - 1);
    if (d > worst) {
      worst = d;
      at = tau;
    }
  });
  put('A5.eddington', selfOk && worst <= 0.04 ? 'pass' : 'fail', { worstRelT: worst, atTau: at, oracleQ0: q0, oracleQinfAtTau20: qInf, oracleSelfTestPass: selfOk, gridPoints: ora.milneTau.length });
}

// A6 (reported, not asserted) and A7
{
  const report = Object.entries(BODY).map(([n, b]) => {
    const te = teqOf(b.a, b.albedo);
    const ratio = b.ground / te;
    const layer = K.oneLayerEmissivityFor(ratio);
    const grey = K.greyDepthFor(ratio);
    const check = layer.refused ? null : K.oneLayer({ emissionTemperature: te, emissivity: layer.emissivity }).surface;
    return {
      body: n,
      teq: te,
      ground: b.ground,
      ratio,
      oneLayerEmissivity: layer.refused ? null : layer.emissivity,
      oneLayerRefusal: layer.refused ? layer.reason : null,
      oneLayerModel: layer.model,
      greyTauSurface: grey.tauSurface,
      greyModel: grey.model,
      reproducesGround: { oneLayer: check, grey: K.greyGround({ emissionTemperature: te, tauSurface: grey.tauSurface }).ground },
    };
  });
  const venus = report.find(r => r.body === 'Venus');
  const okVenus = venus.oneLayerRefusal && venus.oneLayerEmissivity === null;
  const ok =
    okVenus &&
    report.every(r => r.greyModel && r.oneLayerModel) &&
    report.filter(r => r.body !== 'Venus').every(r => r.oneLayerRefusal === null) &&
    report.every(r => Math.abs(r.reproducesGround.grey - r.ground) < 1e-9);
  // the two models differ: same tau, one layer with eps = 1 - exp(-tau)
  const differ = [0.5, 1, 2, 4].map(tau => ({
    tau,
    oneLayer: K.oneLayer({ emissionTemperature: 255, emissivity: 1 - Math.exp(-tau) }).surface,
    grey: K.greyGround({ emissionTemperature: 255, tauSurface: tau }).ground,
  }));
  put('A6.report', ok ? 'pass' : 'fail', { report, differ });

  const hostile = [
    () => K.equilibriumTemperature({ flux: 1361, bondAlbedo: -0.1 }),
    () => K.equilibriumTemperature({ flux: 1361, bondAlbedo: 1.2 }),
    () => K.equilibriumTemperature({ flux: 1361, bondAlbedo: 0.3, redistribution: -0.5 }),
    () => K.equilibriumTemperature({ flux: 1361, bondAlbedo: 0.3, redistribution: 2 }),
    () => K.equilibriumTemperature({ flux: -5, bondAlbedo: 0.3 }),
    () => K.equilibriumTemperature({ flux: Infinity, bondAlbedo: 0.3 }),
    () => K.equilibriumTemperature({ flux: NaN, bondAlbedo: 0.3 }),
    () => K.equilibriumTemperature({ flux: 0, bondAlbedo: 0.3 }),
    () => K.oneLayer({ emissionTemperature: 255, emissivity: 1.5 }),
    () => K.oneLayer({ emissionTemperature: 255, emissivity: -1 }),
    () => K.oneLayer({ emissionTemperature: -255, emissivity: 0.5 }),
    () => K.oneLayerEmissivityFor(2),
    () => K.greyTemperature({ emissionTemperature: 255, tau: -1 }),
    () => K.greyTemperature({ emissionTemperature: 0, tau: 1 }),
    () => K.greyTemperature({ emissionTemperature: 255, tau: NaN }),
    () => K.greyGround({ emissionTemperature: 255, tauSurface: -0.1 }),
    () => K.greyGround({ emissionTemperature: NaN, tauSurface: 1 }),
    () => K.greyDepthFor(0.5),
    () => K.scaleHeight({ temperature: 0, meanMolecularWeight: 29, gravity: 9.8 }),
    () => K.scaleHeight({ temperature: 288, meanMolecularWeight: -1, gravity: 9.8 }),
    () => K.scaleHeight({ temperature: 288, meanMolecularWeight: 29, gravity: 0 }),
    () => K.fluxAt(0, 1),
    () => E.jeansParameter({ mass: MEARTH, exobaseRadius: 6.9e6, particleMass: 1.67e-27 }),
    () => E.retentionBound({ mass: MEARTH, exobaseRadius: 6.9e6, particleMassAmu: 1, timeS: 1e17, columnRatioM: 1e5 }),
  ];
  const outs = hostile.map(f => {
    try {
      return f();
    } catch (e) {
      return { threw: String(e) };
    }
  });
  const refused = outs.filter(o => o && o.refused === true && typeof o.reason === 'string' && !('temperature' in o) && !('surface' in o)).length;
  const results = [
    K.equilibriumTemperature({ flux: 1361, bondAlbedo: 0.3 }),
    K.oneLayer({ emissionTemperature: 255, emissivity: 0.5 }),
    K.greyTemperature({ emissionTemperature: 255, tau: 1 }),
    K.greyGround({ emissionTemperature: 255, tauSurface: 1 }),
    K.scaleHeight({ temperature: 288, meanMolecularWeight: 29, gravity: 9.8 }),
    E.retentionBound({ mass: MEARTH, exobaseRadius: 6.9e6, exobaseTemperature: 1000, particleMassAmu: 1, timeS: 1e17, columnRatioM: 1e5 }),
  ];
  const named = results.every(r => typeof r.model === 'string' && Array.isArray(r.assumes) && r.assumes.length >= 3);
  put('A7.refusals', refused === hostile.length && hostile.length >= 24 && named ? 'pass' : 'fail', { hostileInputs: hostile.length, refusedWithReason: refused, everyResultNamesModelAndAssumes: named });
}

// S1, S2
{
  const pairs = inp.scale.map((p, i) => [K.scaleHeight({ temperature: p.t, meanMolecularWeight: p.mu, gravity: p.g }).height, ora.scale[i]]);
  const ef = inp.scale.slice(0, ora.efold.length).map((p, i) => [K.scaleHeight({ temperature: p.t, meanMolecularWeight: p.mu, gravity: p.g }).height, ora.efold[i]]);
  const m = maxRel(pairs);
  const me = maxRel(ef);
  put('S1.scale', m <= 1e-12 && me <= 1e-6 ? 'pass' : 'fail', { relErrMax: m, efoldRelErrMax: me, points: pairs.length, efoldChecked: ef.length });
  const pub = { Venus: 15.9, Earth: 8.5, Mars: 11.1 };
  const rows = Object.entries(BODY).map(([n, b]) => {
    const H = K.scaleHeight({ temperature: b.ground, meanMolecularWeight: b.mu, gravity: b.g }).height / 1000;
    return { body: n, modelKm: H, publishedKm: pub[n], rel: rel(H, pub[n]) };
  });
  put('S2.anchors', rows.every(r => r.rel <= 0.05) ? 'pass' : 'fail', { rows }, 'fact-sheet values typed, not re-read this session (checked: false)');
}

// J1, J2, J3, J4
{
  const pairs = [];
  inp.jeans.forEach((p, i) => {
    const m = p.amu * K.ATOMIC_MASS;
    const lam = E.jeansParameter({ mass: p.massEarth * MEARTH, exobaseRadius: p.rKm * 1e3, exobaseTemperature: p.t, particleMass: m });
    const flux = E.jeansFluxPerDensity({ lambda: lam, exobaseTemperature: p.t, particleMass: m });
    const v0 = Math.sqrt((2 * K.K_BOLTZMANN * p.t) / m);
    const lmin = E.lambdaMin(p.eta);
    const o = ora.jeans[i];
    pairs.push([lam, o.lambda], [v0, o.v0], [flux, o.flux], [lmin, o.lambdaMin]);
  });
  const m = maxRel(pairs);
  put('J1.arith', m <= 1e-9 ? 'pass' : 'fail', { relErrMax: m, points: inp.jeans.length });
  const b = E.retentionBound({ mass: MEARTH, exobaseRadius: 6.9e6, exobaseTemperature: 1000, particleMassAmu: 1.00784, timeS: 1e17, columnRatioM: 1e5 });
  const refusal = E.jeansParameter({ mass: MEARTH, exobaseRadius: 6.9e6, particleMass: 1.67e-27 });
  const names = Object.keys(E);
  const forbidden = /(^|[a-z])(retained|lost|lifetime|retentionTime|survive)/i;
  const fields = Object.keys(b);
  const ok =
    b.canRetainOnlyIf && Number.isFinite(b.canRetainOnlyIf.lambdaAtLeast) && b.canRetainOnlyIf.timeS === 1e17 && b.canRetainOnlyIf.columnRatioM === 1e5 &&
    JSON.stringify(b.requires) === JSON.stringify(['exobase temperature', 'exobase radius']) &&
    refusal.refused === true && JSON.stringify(refusal.requires) === JSON.stringify(['exobase temperature', 'exobase radius']) &&
    !names.some(n => forbidden.test(n)) && !fields.some(n => forbidden.test(n));
  put('J2.vocabulary', ok ? 'pass' : 'fail', { exports: names, resultFields: fields });
  put('J3.published', 'not-measured', null, 'no published table of Jeans parameters at sourced exobase conditions exists in the repository, none was fetched, and no rights decision exists for one');
  put('J4.sources', 'not-measured', null, 'no source for the exobase temperature and radius of Venus, Earth, Mars and Titan exists in the repository or was read; no per-source rights decision exists');
}

writeFileSync(outFile, JSON.stringify(rec, null, 2));
for (const [id, r] of Object.entries(rec)) console.log(id.padEnd(18), r.status);
