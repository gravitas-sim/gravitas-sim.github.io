// Aggregates the gate's per-spectrum results into the leg table and the verdict by the committed rule.
//   SEISMO_WORK=<dir> node tools/seismology-report.mjs [out.json]
import fs from 'node:fs';
import path from 'node:path';
import * as S from '../js/stellar/seismology.js';

const WORK = process.env.SEISMO_WORK;
const TH = JSON.parse(
  fs.readFileSync('tests/fixtures/seismology-gate/thresholds.json', 'utf8')
);
const NYQ = 1e6 / (2 * S.CADENCE_S);
const rd = n => {
  const f = path.join(WORK, 'res', n + '.json');
  return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : null;
};
const pct = (a, p) => {
  const s = Float64Array.from(a).sort();
  return s[Math.min(s.length - 1, Math.floor(p * (s.length - 1) + 1e-9))];
};
const L = {};
const leg = (id, measured, pass, extra = {}) =>
  (L[id] = { id, pass, measured, ...extra });
const lim = id => TH.legs.find(l => l.id === id).limit;

const b = rd('basic');
if (b) {
  leg(
    'A1.sine',
    { fft: b.A1.fft, gapped: b.A1.gapped },
    b.A1.fft <= lim('A1.sine').maxRelativeFFT &&
      b.A1.gapped <= lim('A1.sine').maxRelativeGapped
  );
  leg('A2.parseval', b.A2.worst, b.A2.worst <= lim('A2.parseval').maxRelative);
  leg('A3.whiteLevel', b.A3.rel, b.A3.rel <= lim('A3.whiteLevel').maxRelative);
  leg('A4.gapsAgree', b.A4.rel, b.A4.rel <= lim('A4.gapsAgree').maxRelative);
  leg(
    'B1.oracleFFT',
    b.B1.worst,
    b.B1.worst <= lim('B1.oracleFFT').maxRelative
  );
  leg(
    'B2.oraclePeriodogram',
    b.B2.worst,
    b.B2.worst <= lim('B2.oraclePeriodogram').maxRelative
  );
}
const b3 = rd('B3');
if (b3)
  leg('B3.oracleReal', b3.worst, b3.worst <= lim('B3.oracleReal').maxRelative);

const items = [];
for (let i = 0; i < 200; i++) {
  const r = rd(`ens-${String(i).padStart(3, '0')}`);
  if (r) items.push(r);
}
if (items.length === 200) {
  const bgTruth = (nm, W) => ({
    a1: 3382 * nm ** -0.609,
    a2: 3382 * nm ** -0.609,
    b1: 0.317 * nm ** 0.97,
    b2: 0.948 * nm ** 0.992,
    W,
  });
  const ratios = items.map(({ truth: t, r }) =>
    Math.abs(
      S.backgroundAt(r.background, t.numax, NYQ) /
        S.backgroundAt(bgTruth(t.numax, t.W), t.numax, NYQ) -
        1
    )
  );
  leg(
    'C1.background',
    { median: pct(ratios, 0.5), p90: pct(ratios, 0.9) },
    pct(ratios, 0.5) <= lim('C1.background').maxMedian &&
      pct(ratios, 0.9) <= lim('C1.background').maxP90
  );
  const ob = items.filter(({ r }) => r.onBound.length).length / 200;
  leg('C2.bounds', ob, ob <= lim('C2.bounds').maxFraction);
  const eN = items.map(({ truth: t, r }) =>
    r.detected ? Math.abs(r.numax / t.numax - 1) : Infinity
  );
  const eNr = items.map(({ truth: t, r }) =>
    r.detected ? Math.abs(r.numaxRatio / t.numax - 1) : Infinity
  );
  const eD = items.map(({ truth: t, r }) =>
    r.detected ? Math.abs(r.dnu / t.dnu - 1) : Infinity
  );
  leg(
    'F1.numax',
    { median: pct(eN, 0.5), p90: pct(eN, 0.9) },
    pct(eN, 0.5) <= lim('F1.numax').maxMedian &&
      pct(eN, 0.9) <= lim('F1.numax').maxP90
  );
  leg(
    'F1ratio.numax (committed estimator, reported)',
    { median: pct(eNr, 0.5), p90: pct(eNr, 0.9) },
    pct(eNr, 0.5) <= lim('F1.numax').maxMedian &&
      pct(eNr, 0.9) <= lim('F1.numax').maxP90,
    { scored: false }
  );
  leg(
    'D1.deltaNu',
    { median: pct(eD, 0.5), p90: pct(eD, 0.9) },
    pct(eD, 0.5) <= lim('D1.deltaNu').maxMedian &&
      pct(eD, 0.9) <= lim('D1.deltaNu').maxP90
  );
  const det = items.filter(({ r }) => r.detected).length / 200;
  leg('D2.comb', det, det >= lim('D2.comb').minFraction);
  const cN =
    items.filter(
      ({ truth: t, r }) =>
        r.detected && Math.abs(r.numax - t.numax) <= r.numaxSigma
    ).length / 200;
  const cD =
    items.filter(
      ({ truth: t, r }) => r.detected && Math.abs(r.dnu - t.dnu) <= r.dnuSigma
    ).length / 200;
  leg(
    'F2.coverageNumax',
    cN,
    cN >= lim('F2.coverageNumax').min && cN <= lim('F2.coverageNumax').max
  );
  leg(
    'D3.coverageDeltaNu',
    cD,
    cD >= lim('D3.coverageDeltaNu').min && cD <= lim('D3.coverageDeltaNu').max
  );
  const pub = TH.published;
  const sc = S.scaling({
    numax: pub.numaxMicroHz.value,
    dnu: pub.deltaNuMicroHz.value,
    teff: pub.teffK.value,
  });
  leg(
    'G1.relations',
    { mass: sc.mass, radius: sc.radius },
    Math.abs(sc.mass - pub.massSolar_noDeltaNuCorrection.value) <= 0.01 &&
      Math.abs(sc.radius - pub.radiusSolar_noDeltaNuCorrection.value) <= 0.01
  );
  let cm = 0;
  let cr = 0;
  for (const { truth: t, r } of items) {
    const tr = S.scaling({ numax: t.numax, dnu: t.dnu, teff: t.teffTrue });
    const mt = tr.mass * (1 + 0.1 * t.zMass);
    const rt = tr.radius * (1 + 0.05 * t.zRadius);
    const m = r.massRadius;
    if (m && mt >= m.mass.low && mt <= m.mass.high) cm++;
    if (m && rt >= m.radius.low && rt <= m.radius.high) cr++;
  }
  leg(
    'G2.coverageMass',
    cm / 200,
    cm / 200 >= lim('G2.coverageMass').min &&
      cm / 200 <= lim('G2.coverageMass').max
  );
  leg(
    'G3.coverageRadius',
    cr / 200,
    cr / 200 >= lim('G3.coverageRadius').min &&
      cr / 200 <= lim('G3.coverageRadius').max
  );
}
const dw = [];
for (let i = 0; i < 200; i++) {
  const r = rd(`dwarf-${String(i).padStart(3, '0')}`);
  if (r) dw.push(r);
}
if (dw.length === 200) {
  const f = dw.filter(({ r }) => r.detected).length / 200;
  leg('N1.falseAlarm', f, f <= lim('N1.falseAlarm').maxDetectedFraction);
}
const n2 = rd('N2');
if (n2)
  leg(
    'N2.dwarfReal',
    { detected: n2.detected, dll2: n2.deltaLogLike2 },
    n2.detected === false
  );
const dm = [];
for (let i = 0; i < 100; i++) {
  const r = rd(`domain-${String(i).padStart(3, '0')}`);
  if (r) dm.push(r);
}
if (dm.length === 100) {
  const refused = dm.filter(({ r }) => !r.massRadius).length / 100;
  leg('N3.domain', refused, refused >= 1);
}
const real = {};
for (const [id, name] of [
  ['E1.real.subset', 'real-subset'],
  ['E2.real.full', 'real-full'],
]) {
  const r = rd(name);
  if (!r) continue;
  const l = lim(id);
  const e = r.errors ?? {};
  const pass = {
    detected: r.detected === true,
    numax: r.detected && e.numax <= l.numaxRelative,
    deltaNu: r.detected && e.dnu <= l.deltaNuRelative,
    mass: r.detected && e.mass != null && e.mass <= l.massRelative,
    radius: r.detected && e.radius != null && e.radius <= l.radiusRelative,
  };
  real[id] = { ...r, pass };
  leg(
    id,
    {
      numax: r.numax,
      dnu: r.dnu,
      mass: r.mass?.value,
      radius: r.radius?.value,
      errors: e,
      detected: r.detected,
    },
    Object.values(pass).every(Boolean),
    { fields: pass }
  );
}
const get = (id, field) => {
  if (!field) return L[id]?.pass;
  const e = real[id];
  if (!e) return undefined;
  return field === 'deltaNu'
    ? e.pass.deltaNu && e.pass.detected
    : e.pass[field];
};
const cls = {};
for (const [name, ids] of Object.entries(TH.classes)) {
  if (name === 'note') continue;
  cls[name] = ids.map(x => {
    const [id, field] = x.split(':');
    return {
      leg: x,
      pass: get(
        id,
        field === 'numax' ? 'numax' : field === 'deltaNu' ? 'deltaNu' : field
      ),
    };
  });
}
const allPass = name => cls[name].every(c => c.pass === true);
const anyKnownFail = name => cls[name].some(c => c.pass === false);
const complete = Object.values(cls).every(a =>
  a.every(c => c.pass !== undefined)
);
let verdict = 'INCOMPLETE';
if (complete) {
  const base = ['spectrum', 'background', 'negatives', 'deltaNu'];
  if (base.some(anyKnownFail)) verdict = 'C';
  else if (allPass('numax') && allPass('massRadius')) verdict = 'A';
  else verdict = 'B';
}
const res = { verdict, complete, legs: L, classes: cls };
fs.writeFileSync(
  process.argv[2] ?? path.join(WORK, 'report.json'),
  JSON.stringify(res, null, 2)
);
for (const l of Object.values(L))
  console.log(
    l.pass ? 'pass' : 'FAIL',
    l.id,
    JSON.stringify(l.measured),
    l.scored === false ? '(reported)' : ''
  );
console.log(JSON.stringify(cls));
console.log('VERDICT', verdict);
