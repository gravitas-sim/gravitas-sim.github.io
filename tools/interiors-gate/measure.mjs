// The interiors gate's measurement (Prompt 203). Reads the committed thresholds and sources, the pinned oracle
// results, and the kernel; writes the measured part of the record.
//   node tools/interiors-gate/measure.mjs inputs.json oracle-results.json record-part.json
import { readFileSync, writeFileSync } from 'node:fs';
import process from 'node:process';
import { mulberry32 } from '../../js/rng.js';
import {
  twoLayerInvert,
  twoLayerMass,
  twoLayerMoment,
  HOMOGENEOUS_MOMENT,
} from '../../js/kernels/interiors/twoLayer.js';
import {
  darwinRadauFlattening,
  darwinRadauMomentFactor,
  rotationParameter,
} from '../../js/kernels/interiors/radau.js';
import {
  invertBody,
  oblatenessOf,
  INTERIOR_BODIES,
} from '../../js/kernels/interiors/layers.js';

const [inPath, orPath, outPath] = process.argv.slice(2);
const FIX = 'tests/fixtures/interiors-gate';
const TH = JSON.parse(readFileSync(`${FIX}/thresholds.json`, 'utf8'));
const SRC = JSON.parse(readFileSync(`${FIX}/sources.json`, 'utf8'));
const inp = JSON.parse(readFileSync(inPath, 'utf8'));
const ora = JSON.parse(readFileSync(orPath, 'utf8'));
const L = Object.fromEntries(TH.checks.map(c => [c.id, c.limits]));
const rel = (a, b) => (a === b ? 0 : Math.abs(a - b) / Math.abs(b));
const out = {};
const put = (id, pass, measured) =>
  (out[id] = { status: pass ? 'pass' : 'fail', measured });

// The typed pack must equal the committed sources.
const pack = [];
for (const [id, b] of Object.entries(INTERIOR_BODIES)) {
  const s = SRC.bodies[id];
  const same = (a, v) =>
    a[0] === v.value && (v.sigma === undefined || a[1] === v.sigma);
  pack.push(
    same(b.gm, s.gm),
    same(b.equatorialRadius, s.equatorialRadiusKm),
    same(b.polarRadius, s.polarRadiusKm),
    b.period === s.siderealPeriodS.value,
    same(b.moment, s.publishedMomentFactor)
  );
  if (b.layers)
    pack.push(
      same(b.layers.rhoMantle, s.layers.rhoMantle),
      same(b.layers.rhoCore, s.layers.rhoCore),
      same(b.layers.coreRadiusKm, s.layers.publishedCoreRadiusKm)
    );
}
out.packEqualsSources = { pass: pack.every(Boolean), count: pack.length };

// I1, I2
{
  let mass = 0,
    core = 0,
    coreTruth = 0,
    mom = 0;
  inp.twoLayer.forEach((p, i) => {
    const o = ora.twoLayer[i];
    const rc = p.x * p.radius;
    const fwd = twoLayerMass({
      radius: p.radius,
      coreRadius: rc,
      rhoMantle: p.rhoMantle,
      rhoCore: p.rhoCore,
    });
    mass = Math.max(mass, rel(fwd, o.mass));
    const inv = twoLayerInvert({
      mass: o.mass,
      radius: p.radius,
      rhoMantle: p.rhoMantle,
      rhoCore: p.rhoCore,
    });
    core = Math.max(core, rel(inv.coreRadius, o.coreRoot));
    coreTruth = Math.max(coreTruth, rel(inv.coreRadius, rc));
    mom = Math.max(
      mom,
      rel(
        twoLayerMoment({
          radius: p.radius,
          coreRadius: rc,
          rhoMantle: p.rhoMantle,
          rhoCore: p.rhoCore,
        }),
        o.moment
      )
    );
  });
  const hom = twoLayerMoment({
    radius: 1,
    coreRadius: 0.4,
    rhoMantle: 3500,
    rhoCore: 3500,
  });
  put(
    'I1.closed',
    mass <= L['I1.closed'].massRelMax &&
      core <= L['I1.closed'].coreRelMax &&
      coreTruth <= L['I1.closed'].coreRelMax,
    {
      massRelMax: mass,
      coreVsBrentqRelMax: core,
      coreVsTruthRelMax: coreTruth,
      points: inp.twoLayer.length,
    }
  );
  put('I2.moment', mom <= L['I2.moment'].relMax && hom === HOMOGENEOUS_MOMENT, {
    relMax: mom,
    homogeneous: hom,
    points: inp.twoLayer.length,
  });
}

// I3, I4, I6
const earth = invertBody('earth');
const mars = invertBody('mars');
put('I3.earth', rel(earth.coreRadius / 1e3, 3480) <= L['I3.earth'].relMax, {
  coreKm: earth.coreRadius / 1e3,
  sigmaKm: earth.sigma.coreRadius / 1e3,
  published: 3480,
  rel: rel(earth.coreRadius / 1e3, 3480),
});
put('I4.mars', rel(mars.coreRadius / 1e3, 1830) <= L['I4.mars'].relMax, {
  coreKm: mars.coreRadius / 1e3,
  sigmaKm: mars.sigma.coreRadius / 1e3,
  published: 1830,
  rel: rel(mars.coreRadius / 1e3, 1830),
});
{
  const rows = [earth, mars].map(r => {
    const [pub, sig] = r.publishedMoment;
    return {
      body: r.body,
      predicted: r.momentFactor,
      sigma: r.sigma.momentFactor,
      published: pub,
      rel: rel(r.momentFactor, pub),
      ruledOutSigmas: (HOMOGENEOUS_MOMENT - pub) / sig,
    };
  });
  put(
    'I6.moment-published',
    rows.every(
      r =>
        r.rel <= L['I6.moment-published'].relMax &&
        r.ruledOutSigmas > L['I6.moment-published'].ruledOutSigmas
    ),
    { rows }
  );
}

// I5: coverage
{
  const normal = rnd => () => {
    const u = Math.max(rnd(), 1e-300),
      v = rnd();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
  const clusters = [
    { name: 'earth-like', R: 6371e3, m: [4455, 100], c: [10950, 300] },
    { name: 'mars-like', R: 3389.5e3, m: [3550, 50], c: [6000, 300] },
  ];
  const rnd = mulberry32(20301);
  const N = normal(rnd);
  const res = clusters.map(cl => {
    let in1 = 0,
      in2 = 0;
    for (let i = 0; i < L['I5.coverage'].perCluster; i++) {
      const rm = cl.m[0] + cl.m[1] * N();
      const rc = cl.c[0] + cl.c[1] * N();
      const x = 0.45 + 0.15 * rnd();
      const Rt = cl.R;
      const Mt = twoLayerMass({
        radius: Rt,
        coreRadius: x * Rt,
        rhoMantle: rm,
        rhoCore: rc,
      });
      const noise = L['I5.coverage'].noise;
      const M = Mt * (1 + noise * N());
      const R = Rt * (1 + noise * N());
      const inv = twoLayerInvert({
        mass: M,
        radius: R,
        rhoMantle: cl.m[0],
        rhoCore: cl.c[0],
        sigma: {
          mass: noise * M,
          radius: noise * R,
          rhoMantle: cl.m[1],
          rhoCore: cl.c[1],
        },
      });
      if (inv.refused) continue;
      const z = Math.abs(inv.coreRadius - x * Rt) / inv.sigma.coreRadius;
      if (z <= 1) in1++;
      if (z <= 2) in2++;
    }
    const n = L['I5.coverage'].perCluster;
    return { cluster: cl.name, oneSigma: in1 / n, twoSigma: in2 / n, n };
  });
  put(
    'I5.coverage',
    res.every(
      r =>
        r.oneSigma >= L['I5.coverage'].oneSigma[0] &&
        r.oneSigma <= L['I5.coverage'].oneSigma[1] &&
        r.twoSigma >= L['I5.coverage'].twoSigmaMin
    ),
    { clusters: res }
  );
}

// I7: refusals
{
  const base = { mass: 6e24, radius: 6.371e6, rhoMantle: 4455, rhoCore: 10950 };
  const cases = [
    twoLayerInvert({ ...base, mass: 0 }),
    twoLayerInvert({ ...base, mass: -1 }),
    twoLayerInvert({ ...base, radius: NaN }),
    twoLayerInvert({ ...base, radius: Infinity }),
    twoLayerInvert({ ...base, rhoMantle: 0 }),
    twoLayerInvert({ ...base, rhoCore: -5 }),
    twoLayerInvert({ ...base, rhoCore: 4000 }),
    twoLayerInvert({ ...base, rhoCore: 4455 }),
    twoLayerInvert({ ...base, rhoMantle: 6000 }),
    twoLayerInvert({ ...base, rhoCore: 5000 }),
    twoLayerInvert({ ...base, mass: 1e24 }),
    twoLayerInvert({ ...base, sigma: { mass: -1 } }),
    twoLayerInvert({ ...base, sigma: { radius: NaN } }),
    twoLayerInvert({ ...base, mass: '6e24' }),
    invertBody('venus'),
    invertBody('mercury'),
    invertBody('moon'),
    invertBody('jupiter'),
    invertBody('saturn'),
    invertBody('neptune'),
    invertBody('nowhere'),
    invertBody(undefined),
    invertBody('uranus'),
  ];
  const ok = cases.filter(
    c =>
      c.refused === true && typeof c.code === 'string' && c.number === undefined
  );
  put(
    'I7.refusals',
    ok.length >= L['I7.refusals'].count && ok.length === cases.length,
    {
      refused: ok.length,
      of: cases.length,
      codes: [...new Set(cases.map(c => c.code))],
    }
  );
}

// O1
{
  let fwd = 0,
    inv = 0,
    trip = 0;
  inp.radau.forEach((p, i) => {
    const o = ora.radau[i];
    const f = darwinRadauFlattening({
      q: p.q,
      momentFactor: p.moment,
    }).flattening;
    fwd = Math.max(fwd, rel(f, o.f));
    const c = darwinRadauMomentFactor({
      q: p.q,
      flattening: o.fFor,
    }).momentFactor;
    inv = Math.max(inv, rel(c, o.momentFromF));
    const f2 = darwinRadauFlattening({
      q: p.q,
      momentFactor: p.moment,
    }).flattening;
    const c2 = darwinRadauMomentFactor({ q: p.q, flattening: f2 }).momentFactor;
    trip = Math.max(trip, rel(c2, p.moment));
  });
  const hom = darwinRadauMomentFactor({
    q: 0.01,
    flattening: 1.25 * 0.01,
  }).momentFactor;
  const lim = L['O1.closed'].relMax;
  put(
    'O1.closed',
    fwd <= lim && inv <= lim && trip <= 1e-9 && Math.abs(hom - 0.4) <= 1e-12,
    {
      forwardRelMax: fwd,
      inverseRelMax: inv,
      roundTripRelMax: trip,
      homogeneousMoment: hom,
      points: inp.radau.length,
    }
  );
}

// O2
{
  const st = ora.selfTests;
  const selfOk =
    Math.abs(st.homogeneousEta) < 1e-10 &&
    Math.abs(st.homogeneousMoment - 0.4) < 1e-10 &&
    Math.abs(st.homogeneousF_over_q - 1.25) < 1e-10 &&
    rel(st.polytropeMoment, st.polytropeTarget) <=
      L['O2.radau-clairaut'].selfTestRel;
  const q = L['O2.radau-clairaut'].q;
  let worst = 0,
    worstAt = null;
  ora.clairaut.forEach((o, i) => {
    const f = darwinRadauFlattening({ q, momentFactor: o.moment }).flattening;
    const r = rel(f, q * o.fOverQ);
    if (r > worst) {
      worst = r;
      worstAt = inp.clairaut[i];
    }
  });
  const poly = ora.polytrope;
  const polyRel = rel(
    darwinRadauFlattening({ q, momentFactor: poly.moment }).flattening,
    q * poly.fOverQ
  );
  put(
    'O2.radau-clairaut',
    selfOk &&
      worst <= L['O2.radau-clairaut'].relMax &&
      polyRel <= L['O2.radau-clairaut'].relMax,
    {
      oracleSelfTest: { pass: selfOk, ...st },
      worstProfileRel: worst,
      worstProfile: worstAt,
      polytropeRel: polyRel,
      profiles: ora.clairaut.length,
    }
  );
}

// O3, O4, O5
const eObl = oblatenessOf('earth');
const jObl = oblatenessOf('jupiter');
put(
  'O3.earth',
  rel(eObl.flattening, SRC.bodies.earth.publishedFlattening.value) <=
    L['O3.earth'].relMax,
  {
    q: eObl.q,
    predicted: eObl.flattening,
    published: SRC.bodies.earth.publishedFlattening.value,
    rel: rel(eObl.flattening, SRC.bodies.earth.publishedFlattening.value),
  }
);
put(
  'O4.jupiter',
  rel(jObl.flattening, L['O4.jupiter'].publishedF) <= L['O4.jupiter'].relMax,
  {
    q: jObl.q,
    predicted: jObl.flattening,
    published: L['O4.jupiter'].publishedF,
    radiiFlattening: jObl.observedFlattening,
    rel: rel(jObl.flattening, L['O4.jupiter'].publishedF),
  }
);
{
  const f = darwinRadauFlattening({
    q: eObl.q,
    momentFactor: earth.momentFactor,
  }).flattening;
  put(
    'O5.chain',
    rel(f, SRC.bodies.earth.publishedFlattening.value) <= L['O5.chain'].relMax,
    {
      twoLayerMoment: earth.momentFactor,
      predicted: f,
      published: SRC.bodies.earth.publishedFlattening.value,
      rel: rel(f, SRC.bodies.earth.publishedFlattening.value),
    }
  );
}

// O6
{
  const l = L['O6.coverage'];
  const rnd = mulberry32(20302);
  const N = () =>
    Math.sqrt(-2 * Math.log(Math.max(rnd(), 1e-300))) *
    Math.cos(2 * Math.PI * rnd());
  let in1 = 0,
    in2 = 0;
  ora.ensembleO6.forEach(o => {
    const momentObs = o.moment + l.momentSigma * N();
    const qObs = l.q * (1 + l.qRel * N());
    const r = darwinRadauFlattening({
      q: qObs,
      momentFactor: momentObs,
      sigma: { q: l.qRel * qObs, momentFactor: l.momentSigma },
    });
    const truth = l.q * o.fOverQ;
    const z = Math.abs(r.flattening - truth) / r.sigmaTotal;
    if (z <= 1) in1++;
    if (z <= 2) in2++;
  });
  const n = ora.ensembleO6.length;
  put('O6.coverage', in1 / n >= l.oneSigma[0] && in1 / n <= l.oneSigma[1], {
    oneSigma: in1 / n,
    twoSigma: in2 / n,
    n,
  });
}

// O7
{
  const sat = oblatenessOf('saturn');
  const cases = [
    sat,
    oblatenessOf('venus'),
    oblatenessOf('moon'),
    oblatenessOf('mars'),
    oblatenessOf('mercury'),
    oblatenessOf('uranus-not-in-pack'),
    darwinRadauFlattening({ q: 0, momentFactor: 0.3 }),
    darwinRadauFlattening({ q: -1, momentFactor: 0.3 }),
    darwinRadauFlattening({ q: NaN, momentFactor: 0.3 }),
    darwinRadauFlattening({ q: 0.01, momentFactor: 0.4 }),
    darwinRadauFlattening({ q: 0.01, momentFactor: 0.5 }),
    darwinRadauFlattening({ q: 0.01, momentFactor: 0 }),
    darwinRadauFlattening({ q: 0.2, momentFactor: 0.3 }),
    darwinRadauFlattening({ q: 0.01, momentFactor: NaN }),
    darwinRadauMomentFactor({ q: 0.01, flattening: 0.05 }),
    darwinRadauMomentFactor({ q: 0.01, flattening: -1 }),
    rotationParameter({ gm: 0, equatorialRadius: 1, period: 1 }),
    oblatenessOf(undefined),
  ];
  const ok = cases.filter(
    c => c.refused === true && typeof c.code === 'string'
  );
  put(
    'O7.refusals',
    ok.length >= L['O7.refusals'].count &&
      ok.length === cases.length &&
      sat.code === 'q-range',
    {
      refused: ok.length,
      of: cases.length,
      saturnCode: sat.code,
      codes: [...new Set(cases.map(c => c.code))],
    }
  );
}

writeFileSync(outPath, JSON.stringify(out, null, 2));
process.stdout.write(
  JSON.stringify(
    Object.fromEntries(
      Object.entries(out).map(([k, v]) => [k, v.status ?? v.pass])
    ),
    null,
    1
  ) + '\n'
);
