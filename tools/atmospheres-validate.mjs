#!/usr/bin/env node
// =============================================================================
// The atmospheres kernel against its committed thresholds (Prompt 200)
// -----------------------------------------------------------------------------
//   npm run atmospheres:validate               print the table
//   npm run atmospheres:validate -- --json     print it as JSON
//
// tests/fixtures/atmospheres/thresholds.json fixed every bound before
// js/kernels/atmospheres/ had been run (ATMOSPHERES.md, "The validation
// contract"). This runs the checks against the production module and judges
// them against those bounds, read from the file and not copied. The oracle's
// rows read the results pinned in tests/fixtures/atmospheres/ (numpy and scipy;
// no Gravitas code). Tier (c) is not applicable and is stated, not run.
// =============================================================================

import { readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import * as K from '../js/kernels/atmospheres/index.js';
import { makeInputs } from './atmospheres-oracle/inputs.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FIX = path.join(HERE, '../tests/fixtures/atmospheres');
const read = name => JSON.parse(readFileSync(path.join(FIX, name), 'utf8'));
export const THRESHOLDS = read('thresholds.json');
const ORACLE = read('oracle-results.json').results;
const INPUTS = makeInputs();
const C = THRESHOLDS.checks;
const AN = THRESHOLDS.anchors;

const rows = [];
const row = (id, measured, bound, pass, note = '') =>
  rows.push({ id, measured, bound, pass, note });
const within = (id, measured, bound, note) =>
  row(id, measured, bound, Math.abs(measured) <= bound, note);
const rel = (a, b) => (a === b ? 0 : Math.abs(a - b) / Math.abs(b));
const maxRel = pairs => pairs.reduce((m, [a, b]) => Math.max(m, rel(a, b)), 0);

const teqOf = (id, eps = 1) =>
  K.compareWithMeasured(id, { redistribution: eps }).emissionK;

function closedForms() {
  const a1 = C['a1.equilibrium'].bounds.relative;
  within(
    'a1.equilibrium',
    maxRel(
      INPUTS.equilibrium.map((p, i) => [
        K.equilibriumTemperature({
          flux: p.flux,
          bondAlbedo: p.albedo,
          redistribution: p.eps,
        }).temperature,
        ORACLE.equilibrium[i],
      ])
    ),
    a1,
    `${INPUTS.equilibrium.length} seeded points against numpy and astropy`
  );

  const a3 = C['a3.onelayer'].bounds.relative;
  const pairs = [];
  INPUTS.onelayer.forEach((p, i) => {
    const r = K.oneLayer({ emissionTemperature: p.te, emissivity: p.eps });
    pairs.push([r.surface, ORACLE.onelayer[i][0]]);
    pairs.push([r.layer, ORACLE.onelayer[i][1]]);
  });
  within(
    'a3.onelayer',
    maxRel(pairs),
    a3,
    'surface and layer against a linear solve of the balance equations'
  );
  const at = e => K.oneLayer({ emissionTemperature: 255, emissivity: e });
  row('a3.limit.eps0', at(0).surface, 255, at(0).surface === 255);
  within(
    'a3.limit.eps1',
    rel(at(1).surface, 255 * 2 ** 0.25),
    1e-15,
    'eps = 1 gives 2^(1/4) T_e'
  );
  let mono = true;
  let prev = 0;
  for (let i = 0; i <= 100; i++) {
    const s = at(i / 100).surface;
    if (!(s > prev)) mono = false;
    prev = s;
  }
  row('a3.monotone', Number(mono), 1, mono, 'strictly increasing in eps');

  const a4 = C['a4.grey'].bounds;
  const closed = [];
  INPUTS.grey.forEach((p, i) => {
    closed.push([
      K.greyTemperature({ emissionTemperature: p.te, tau: p.tau }).temperature,
      ORACLE.grey[i][0],
    ]);
    closed.push([
      K.greyGround({ emissionTemperature: p.te, tauSurface: p.tau }).ground,
      ORACLE.grey[i][1],
    ]);
  });
  within('a4.grey.closed', maxRel(closed), a4.closedRelative);
  const ode = [];
  for (const o of ORACLE.greyOde) {
    o.tau.forEach((x, j) =>
      ode.push([
        K.greyTemperature({
          emissionTemperature: INPUTS.greyOde.te,
          tau: x,
        }).temperature,
        o.T[j],
      ])
    );
    ode.push([
      K.greyGround({
        emissionTemperature: INPUTS.greyOde.te,
        tauSurface: o.tauS,
      }).ground,
      o.ground,
    ]);
  }
  within(
    'a4.grey.ode',
    maxRel(ode),
    a4.odeRelative,
    `${ORACLE.greyOde.length} depths against the two-stream moment equations`
  );

  const s1 = C['s1.scale'].bounds;
  const H = p =>
    K.scaleHeight({
      temperature: p.t,
      meanMolecularWeight: p.mu,
      gravity: p.g,
    }).height;
  within(
    's1.scale',
    maxRel(INPUTS.scale.map((p, i) => [H(p), ORACLE.scale[i]])),
    s1.relative,
    'against astropy constants'
  );
  within(
    's1.efold',
    maxRel(
      INPUTS.scale
        .slice(0, ORACLE.efold.length)
        .map((p, i) => [H(p), ORACLE.efold[i]])
    ),
    s1.efoldRelative,
    'pressure ratio e at height H in a numerically integrated column'
  );
}

function oracleTiers() {
  const b1 = C['b1.eddington'].bounds;
  const q0 = ORACLE.milneSelf.q0;
  const qInf = ORACLE.milneSelf.qAtTau20;
  const selfOk =
    rel(q0, 0.5774) <= b1.oracleSelfTestRelative &&
    rel(qInf, 0.7104) <= b1.oracleSelfTestRelative;
  row(
    'b1.oracleSelfTest',
    Math.max(rel(q0, 0.5774), rel(qInf, 0.7104)),
    b1.oracleSelfTestRelative,
    selfOk,
    'the oracle returns the Hopf values q(0) and q(infinity)'
  );
  let worst = 0;
  let at = 0;
  ORACLE.milneTau.forEach((tau, i) => {
    const d = Math.abs(
      K.greyTemperature({ emissionTemperature: 1, tau }).temperature /
        ORACLE.milneT[i] -
        1
    );
    if (d > worst) {
      worst = d;
      at = tau;
    }
  });
  within(
    'b1.eddington',
    worst,
    b1.relativeT,
    `worst at tau = ${at} (the top, warm); the model's stated error`
  );
  const b2 = C['b2.pinnedProfiles'].bounds;
  ORACLE.pinned.forEach(o => {
    const te = INPUTS.greyOde.te;
    const pairs = o.tau.map((x, j) => [
      K.greyTemperature({ emissionTemperature: te, tau: x }).temperature,
      o.T[j],
    ]);
    pairs.push([
      K.greyGround({ emissionTemperature: te, tauSurface: o.tauS }).ground,
      o.ground,
    ]);
    within(`b2.tauS${o.tauS}`, maxRel(pairs), b2.relative);
  });
  row(
    'b2.depths',
    ORACLE.pinned.map(o => o.tauS).join(','),
    b2.tauSurface.join(','),
    JSON.stringify(ORACLE.pinned.map(o => o.tauS)) ===
      JSON.stringify(b2.tauSurface)
  );
}

function anchors() {
  const a2 = C['a2.anchors'].bounds;
  const T = AN.terrestrialEmissionK;
  for (const id of ['venus', 'earth', 'mars']) {
    const name = K.BODIES[id].name;
    within(
      `a2.${id}`,
      rel(teqOf(id), T[name]),
      a2.terrestrialRelative,
      `${teqOf(id).toFixed(1)} K against ${T[name]}`
    );
  }
  for (const id of ['jupiter', 'uranus', 'neptune']) {
    const g = AN.giants[K.BODIES[id].name];
    const pub = g.teffK / g.powerRatio ** 0.25;
    within(
      `a2.${id}`,
      rel(teqOf(id), pub),
      a2.giantRelative,
      `${teqOf(id).toFixed(2)} K against ${pub.toFixed(2)} implied by the published pair`
    );
  }
  // HD 209458 b: A = 0, uniform redistribution; the transit lesson's own formula.
  const aAu = Math.cbrt((3.5247 / 365.25) ** 2 * 1.148);
  const hj = K.equilibriumFromStar({
    starT: 6065,
    starRadiusOverA: 1 / ((aAu * 215.032) / 1.155),
  }).temperature;
  row(
    'a2.hotJupiter.band',
    hj,
    a2.hotJupiterBandK,
    hj >= a2.hotJupiterBandK[0] && hj <= a2.hotJupiterBandK[1]
  );
  return import('../js/data/investigations/transit-photometry.js').then(mod => {
    const seen = new Set();
    let hit = null;
    const walk = (o, d) => {
      if (!o || typeof o !== 'object' || seen.has(o) || d > 12) return;
      seen.add(o);
      if (o.id === 'teq' && typeof o.compute === 'function') hit = o;
      for (const k of Object.keys(o)) walk(o[k], d + 1);
    };
    walk(mod, 0);
    const lesson = hit ? hit.compute({ P_d: 3.5247, M: 1.148 }) : Number.NaN;
    within(
      'a2.hotJupiter.lesson',
      rel(hj, lesson),
      a2.lessonFormulaRelative,
      `kernel ${hj.toFixed(3)} K, lesson ${Number(lesson).toFixed(3)} K`
    );
  });
}

function report() {
  const out = {};
  const b = C['a6.report'].bounds;
  for (const id of ['venus', 'earth', 'mars']) {
    const body = K.BODIES[id];
    const te = teqOf(id);
    const ratio = body.measuredK / te;
    const layer = K.oneLayerEmissivityFor(ratio);
    const grey = K.greyDepthFor(ratio);
    out[id] = { te, ratio, layer, grey };
    row(
      `a6.${id}.models`,
      Number(!!layer.model && !!grey.model),
      1,
      !!layer.model && !!grey.model,
      'both results name their model'
    );
    within(
      `a6.${id}.grey`,
      rel(
        K.greyGround({ emissionTemperature: te, tauSurface: grey.tauSurface })
          .ground,
        body.measuredK
      ),
      b.reproduceRelative,
      `tau_s = ${grey.tauSurface.toFixed(3)}`
    );
    if (id === 'venus')
      row(
        'a6.venus.oneLayerRefuses',
        ratio,
        2 ** 0.25,
        layer.refused === true && !('emissivity' in layer),
        'ratio exceeds the one layer maximum; refused, no number'
      );
    else
      within(
        `a6.${id}.oneLayer`,
        rel(
          K.oneLayer({ emissionTemperature: te, emissivity: layer.emissivity })
            .surface,
          body.measuredK
        ),
        b.reproduceRelative,
        `emissivity ${layer.emissivity.toFixed(3)}`
      );
  }
  const s2 = C['s2.anchors'].bounds.relative;
  for (const id of ['venus', 'earth', 'mars']) {
    const body = K.BODIES[id];
    const h =
      K.scaleHeight({
        temperature: body.measuredK,
        meanMolecularWeight: body.mu,
        gravity: body.g,
      }).height / 1000;
    within(
      `s2.${id}`,
      rel(h, AN.scaleHeightKm[body.name]),
      s2,
      `${h.toFixed(2)} km against ${AN.scaleHeightKm[body.name]}`
    );
  }
  return out;
}

function stated() {
  rows.push({
    id: 'c.uncertainty',
    measured: null,
    pass: null,
    note: C['c.uncertainty'].what,
  });
}

function refusals() {
  const E = (o = {}) =>
    K.equilibriumTemperature({ flux: 1361, bondAlbedo: 0.3, ...o });
  const hostile = [
    () => E({ bondAlbedo: -0.1 }),
    () => E({ bondAlbedo: 1.2 }),
    () => E({ bondAlbedo: NaN }),
    () => E({ redistribution: -0.5 }),
    () => E({ redistribution: 2 }),
    () => E({ flux: -5 }),
    () => E({ flux: Infinity }),
    () => E({ flux: NaN }),
    () => E({ flux: 0 }),
    () => K.oneLayer({ emissionTemperature: 255, emissivity: 1.5 }),
    () => K.oneLayer({ emissionTemperature: 255, emissivity: -1 }),
    () => K.oneLayer({ emissionTemperature: -255, emissivity: 0.5 }),
    () => K.oneLayerEmissivityFor(2),
    () => K.greyTemperature({ emissionTemperature: 255, tau: -1 }),
    () => K.greyTemperature({ emissionTemperature: 0, tau: 1 }),
    () => K.greyTemperature({ emissionTemperature: 255, tau: NaN }),
    () => K.greyTemperature({ emissionTemperature: 255, tau: Infinity }),
    () => K.greyGround({ emissionTemperature: 255, tauSurface: -0.1 }),
    () => K.greyGround({ emissionTemperature: NaN, tauSurface: 1 }),
    () => K.greyDepthFor(0.5),
    () =>
      K.scaleHeight({ temperature: 0, meanMolecularWeight: 29, gravity: 9.8 }),
    () =>
      K.scaleHeight({
        temperature: 288,
        meanMolecularWeight: -1,
        gravity: 9.8,
      }),
    () =>
      K.scaleHeight({ temperature: 288, meanMolecularWeight: 29, gravity: 0 }),
    () => K.fluxAt(0, 1),
  ];
  const d1 = C['d1.refusals'].bounds;
  const outs = hostile.map(f => {
    try {
      return f();
    } catch (e) {
      return { threw: String(e) };
    }
  });
  const refused = outs.filter(
    o =>
      o &&
      o.refused === true &&
      typeof o.reason === 'string' &&
      o.reason.length > 8 &&
      !('temperature' in o) &&
      !('surface' in o) &&
      !('height' in o) &&
      !('ground' in o)
  ).length;
  row(
    'd1.hostile',
    refused,
    d1.hostileInputs,
    hostile.length === d1.hostileInputs && refused === hostile.length,
    `${refused} of ${hostile.length} refused with a reason and no number`
  );
  const results = [
    E(),
    K.oneLayer({ emissionTemperature: 255, emissivity: 0.5 }),
    K.greyTemperature({ emissionTemperature: 255, tau: 1 }),
    K.greyGround({ emissionTemperature: 255, tauSurface: 1 }),
    K.scaleHeight({ temperature: 288, meanMolecularWeight: 29, gravity: 9.8 }),
    K.compareWithMeasured('earth'),
  ];
  row(
    'd1.named',
    Math.min(...results.map(r => r.assumes?.length ?? 0)),
    d1.assumesMin,
    results.every(
      r => typeof r.model === 'string' && r.assumes?.length >= d1.assumesMin
    ),
    'every result names its model and what it leaves out'
  );
}

function pack() {
  const p = C['p1.pack'].bounds;
  const ids = K.BODY_IDS;
  const ok = ids.every(id => {
    const b = K.BODIES[id];
    return (
      b.albedo >= 0 &&
      b.albedo <= 1 &&
      b.measuredK > 0 &&
      b.g > 0 &&
      b.mu > 0 &&
      b.a > 0
    );
  });
  row('p1.bodies', ids.length, p.bodies, ids.length === p.bodies && ok);
  row(
    'p1.provenance',
    Number(K.PACK_PROVENANCE.checked),
    0,
    K.PACK_PROVENANCE.checked === false && K.PACK_PROVENANCE.retrieved === null,
    'typed, not re-read, no retrieval date'
  );
  const noEscape =
    !JSON.stringify(K.BODIES).match(/exobase|escape|jeans/i) &&
    !Object.keys(K).some(k => /jeans|exobase|escape|retain/i.test(k));
  row(
    'p1.noEscape',
    Number(noEscape),
    1,
    noEscape,
    'no exobase, Jeans or retention field or export'
  );
  const g = K.compareWithMeasured('jupiter');
  const v = K.compareWithMeasured('venus');
  row(
    'p1.labelled',
    Number(/no surface/.test(g.label) && /warming/.test(v.label)),
    1,
    /no surface/.test(g.label) && /warming/.test(v.label),
    'the difference is labelled, and a giant is said to have no surface'
  );
}

/** Every row, as the tests and the command line read them. */
export async function runValidation() {
  rows.length = 0;
  closedForms();
  oracleTiers();
  await anchors();
  report();
  stated();
  refusals();
  pack();
  return rows.slice();
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const t0 = Date.now();
  const out = await runValidation();
  if (process.argv.includes('--json'))
    process.stdout.write(`${JSON.stringify(out, null, 1)}\n`);
  else {
    for (const r of out) {
      const v =
        r.measured === null
          ? ''
          : typeof r.measured === 'number'
            ? Number(r.measured).toPrecision(4)
            : String(r.measured);
      const b = r.bound === undefined ? '' : JSON.stringify(r.bound);
      const tag = r.pass === null ? 'N/A' : r.pass ? 'pass' : 'FAIL';
      process.stdout.write(
        `${tag.padEnd(6)}${r.id.padEnd(28)}${v.padEnd(14)}${b.padEnd(14)} ${r.note ?? ''}\n`
      );
    }
    process.stdout.write(
      `${out.filter(r => r.pass === false).length} failing of ${out.length}, ${Date.now() - t0} ms\n`
    );
  }
  process.exit(out.some(r => r.pass === false) ? 1 : 0);
}
