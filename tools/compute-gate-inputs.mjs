#!/usr/bin/env node
// =============================================================================
// Spike (Prompt 268, spike/compute-gate, never merged): the example inputs of the
// compute gate's candidates, as COMPUTE_GATE_II.md's thresholds define them.
//   node tools/compute-gate-inputs.mjs <outdir>
// Writes, and prints the sha256 of, every input that the repository does not
// already vendor (N03, N07, N08, N10; N09's snapshot is made by
// tools/compute-gate-snapshot.py). Run under Node 22.
// =============================================================================
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = process.argv[2];
if (!out) throw new Error('usage: compute-gate-inputs.mjs <outdir>');
mkdirSync(out, { recursive: true });
const sha = s => createHash('sha256').update(s).digest('hex');
const emit = (name, doc) => {
  const text = JSON.stringify(doc) + '\n';
  writeFileSync(path.join(out, name), text);
  console.log(`${sha(text)}  ${name}  ${text.length} bytes`);
};
const b64 = values =>
  Buffer.from(new Float64Array(values).buffer).toString('base64');
const grid = (id, title, axes, outputs, flat, generator) => ({
  format: 'gravitas.grid',
  formatVersion: 1,
  id,
  title,
  axes,
  outputs,
  generator,
  layout: 'dense',
  storage: { encoding: 'float64-le', data: b64(flat) },
});

// ---- N03: the engine's pair of runs, and the analytic and negative grids
const { runEngine, SETTINGS, SCALE, STEP, D_EVERY, D_SNAPS } = await import(
  pathToFileURL(path.join(REPO, 'tools/dynamics-runs.mjs'))
);
const P = await import(pathToFileURL(path.join(REPO, 'js/physics.js')));
const { makeLab } = await import(
  pathToFileURL(path.join(REPO, 'js/validation/harness.js'))
);
const lab = makeLab(P);
const ics = JSON.parse(
  readFileSync(
    path.join(REPO, 'tests/fixtures/dynamics/initial-conditions.json'),
    'utf8'
  )
);
const run = ic => {
  const snaps = [];
  runEngine(P, lab, ic, D_EVERY, D_SNAPS, s => snaps.push(s));
  return snaps;
};
const phase = s => [...s.x, ...s.y, ...s.vx, ...s.vy];
const dist = (a, b) => {
  const pa = phase(a);
  const pb = phase(b);
  if (pa.length !== pb.length) throw new Error('different body counts');
  let t = 0;
  for (let i = 0; i < pa.length; i++) t += (pa[i] - pb[i]) ** 2;
  return Math.sqrt(t);
};
const EPS = 1e-6;
const ic101 = ics.D['101'];
const ic101p = { ...ic101, x: ic101.x.map((v, i) => (i === 0 ? v + EPS : v)) };
const A = run(ic101);
const B = run(ic101p);
const C = run(ics.D['102']);
const snapAxis = Array.from({ length: D_SNAPS + 1 }, (_, k) => k);
const pairGrid = (id, title, sep) =>
  grid(
    id,
    title,
    [
      {
        name: 'snapshot',
        unit: 'snapshot (0.1 crossing time)',
        values: snapAxis,
      },
    ],
    [{ name: 'separation', unit: 'Heggie length and velocity' }],
    sep,
    {
      name: 'tools/compute-gate-inputs.mjs',
      version: '1',
      inputs: {
        settings: SETTINGS,
        step: STEP,
        scale: SCALE,
        dEvery: D_EVERY,
        initialConditions: 'tests/fixtures/dynamics/initial-conditions.json',
        measure:
          'Euclidean distance in the 4N-dimensional phase space, Heggie units',
      },
    }
  );
emit(
  'n03-engine-pair.grid.json',
  pairGrid(
    'compute-gate-ii:n03-engine-pair',
    'The engine run of family D seed 101 and the same run with the x of body 0 increased by 1e-6: the phase-space separation',
    A.map((s, k) => dist(s, B[k]))
  )
);
emit(
  'n03-different-clusters.grid.json',
  pairGrid(
    'compute-gate-ii:n03-different-clusters',
    'Two different clusters (family D seeds 101 and 102), not neighbouring runs: the phase-space separation',
    A.map((s, k) => dist(s, C[k]))
  )
);
const logistic = lam =>
  snapAxis.map(k => {
    const g = 1e-6 * Math.exp(lam * 0.1 * k);
    return g / (1 + g);
  });
for (const lam of [0.7, 1.5])
  emit(
    `n03-logistic-${lam}.grid.json`,
    pairGrid(
      `compute-gate-ii:n03-logistic-${lam}`,
      `SYNTHETIC: s(t) = S g/(S+g), g = s0 exp(lambda t), S = 1, s0 = 1e-6, lambda = ${lam} per crossing time`,
      logistic(lam)
    )
  );
emit(
  'n03-linear.grid.json',
  pairGrid(
    'compute-gate-ii:n03-linear',
    'SYNTHETIC: linear growth s(t) = s0 (1 + 100 t), s0 = 1e-6 (regular, not chaotic)',
    snapAxis.map(k => 1e-6 * (1 + 100 * 0.1 * k))
  )
);

// ---- N08: the stellar kernel's polytrope table as a grid
const poly = await import(
  pathToFileURL(path.join(REPO, 'js/kernels/stellar/polytrope.js'))
);
const table = poly.polytropeTable();
const rows = Array.isArray(table) ? table : table.rows;
const ns = rows.map(r => r.n);
const polyGrid = (id, title, nvals, rowsOf) =>
  grid(
    id,
    title,
    [{ name: 'n', unit: '', values: nvals }],
    [
      { name: 'xi1', unit: '' },
      { name: 'mass', unit: '' },
      { name: 'rhoRatio', unit: '' },
    ],
    [
      ...rowsOf.map(r => r.xi1),
      ...rowsOf.map(r => r.mass),
      ...rowsOf.map(r => r.rhoRatio),
    ],
    {
      name: 'js/kernels/stellar/polytrope.js polytropeTable()',
      version: '1',
      inputs: { indices: nvals },
    }
  );
emit(
  'n08-polytrope.grid.json',
  polyGrid(
    'compute-gate-ii:n08-polytrope',
    "The stellar kernel's Lane-Emden table",
    ns,
    rows
  )
);
const bad = n => ({ n, xi1: 1, mass: 1, rhoRatio: 1 });
for (const n of [5, 5.5, -0.5])
  emit(
    `n08-bad-${n}.grid.json`,
    polyGrid(
      `compute-gate-ii:n08-bad-${n}`,
      `A table with n = ${n} (refused by the notebook)`,
      [n],
      [bad(n)]
    )
  );

// ---- N07: the MIST pack as an observation table
const { tableOf } = await import(
  pathToFileURL(path.join(REPO, 'js/tableObservation.js'))
);
const pack = await import(
  pathToFileURL(path.join(REPO, 'js/data/observations/mistSdssIsochrones.js'))
);
const t = tableOf(pack);
const obsBase = (id, title, object, columns, extra = {}) => ({
  format: 'gravitas.observation',
  formatVersion: 1,
  kind: 'table',
  id,
  title,
  object,
  facility: 'a gate prototype input',
  origin: 'model',
  source: { kind: 'builtin', id, version: '1' },
  credit: 'see license',
  license: {
    status: 'generated',
    statement: 'made by the compute gate from the values named in its title',
    basis: 'see the title',
  },
  retrieved: '2026-11-07',
  citations: [],
  reductions: [],
  masks: [],
  annotations: [],
  ...extra,
  columns,
});
const col = (id, name, unit, role, values, extra = {}) => ({
  id,
  name,
  unit,
  role,
  values: Array.from(values),
  ...extra,
});
const mist = obsBase(
  'compute-gate-ii:n07-mist',
  'The MIST v1.2 isochrones in the SDSS bands (the pack mist-sdss-isochrones 1.0.0), six columns, values unchanged',
  { name: 'MIST isochrones', frame: 'absolute magnitudes' },
  t.columns.map(c =>
    col(
      c.id,
      c.name,
      c.id === 'g' || c.id === 'r' ? 'mag' : c.unit,
      c.id === 'logAge' ? 'x' : 'value',
      c.values
    )
  ),
  {
    axes: { x: 'logAge', y: 'r' },
    credit: pack.PACK.credit,
    license: pack.PACK.license,
    retrieved: pack.PACK.retrieved,
    source: { kind: 'pack', id: pack.PACK.id, version: pack.PACK.version },
  }
);
emit('n07-mist.observation.json', mist);
emit('n07-outside.observation.json', {
  ...mist,
  id: 'compute-gate-ii:n07-outside',
  title: mist.title + ' (the request names an age outside the table)',
  request: { feh: 0, logAge: 99 },
});

// ---- N10: Prompt 264's pinned objects as observation tables
const orc = JSON.parse(
  readFileSync(
    path.join(REPO, 'tests/fixtures/population/oracle-results.json'),
    'utf8'
  )
);
const design = (id, d, over = {}) => {
  const o = obsBase(
    `compute-gate-ii:n10-${id}`,
    `SYNTHETIC listings: Prompt 264's reference sample ${id} (numpy default_rng(${d.seed})), with its truth manifest`,
    {
      name: `population sample ${id}`,
      frame: 'a measured value, unit bin width',
    },
    [
      col('x', 'measured value', '', 'x', d.objects.x),
      col('sigma', 'uncertainty', '', 'uncertainty', d.objects.sigma, {
        of: 'x',
      }),
    ],
    { axes: { x: 'x', y: 'x' } }
  );
  o.design = {
    edges: d.edges,
    exposure: d.exposure,
    reliability: d.reliability,
    ...over,
  };
  o.truth = {
    muTrue: d.muTrue,
    seed: d.seed,
    generator:
      'tools/population-oracle/oracle.py (Prompt 264, spike branch), numpy default_rng',
  };
  return o;
};
const S1 = orc.designs.S1;
emit('n10-s1.observation.json', design('S1', S1));
emit('n10-s2.observation.json', design('S2', orc.designs.S2));
emit(
  'n10-bad-exposure.observation.json',
  design('S1', S1, { exposure: [0, 100, 100, 100, 100, 100] })
);
emit(
  'n10-bad-reliability.observation.json',
  design('S1', S1, { reliability: [0, 1, 1, 1, 1, 1] })
);
const neg = design('S1', S1);
neg.columns[1].values = neg.columns[1].values.map((v, i) =>
  i === 0 ? -0.1 : v
);
emit('n10-bad-sigma.observation.json', neg);
const none = design('S1', S1);
none.columns.forEach(c => (c.values = []));
emit('n10-no-objects.observation.json', none);
