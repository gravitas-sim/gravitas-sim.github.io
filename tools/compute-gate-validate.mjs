#!/usr/bin/env node
// =============================================================================
// Spike (Prompt 268, spike/compute-gate, never merged): the compute gate's validator.
//   node tools/compute-gate-validate.mjs --inputs <dir> --fixtures <dir with thresholds.json, oracle-results.json,
//        references.json> [--page <page-legs.json>] --out <results.json>
// Runs each prototype notebook through tools/compute-gate-run.py (python3 -E, as compute-answers.mjs runs cells) on its
// example input and on the derived negative inputs, twice for determinism, and computes every leg from the bounds in
// thresholds.json alone. Legs that need downloaded code (G2.b, G3.b, G4.c) are NOT RUN. Run under Node 22.
// =============================================================================
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = n => {
  const i = process.argv.indexOf(`--${n}`);
  return i < 0 ? null : process.argv[i + 1];
};
const INP = arg('inputs');
const FIX = arg('fixtures');
const OUT = arg('out');
const PAGE = arg('page');
const BASE = '0b5d3d0f';
const J = p => JSON.parse(readFileSync(p, 'utf8'));
const TH = J(path.join(FIX, 'thresholds.json'));
const OR = J(path.join(FIX, 'oracle-results.json'));
const REF = J(path.join(FIX, 'references.json'));
const sha = s => createHash('sha256').update(s).digest('hex');
const imp = p => import(pathToFileURL(path.join(REPO, p)));
const { systemFromFile } = await imp('js/systemSpec.js');
const { validateGrid } = await imp('js/dataKinds/contract.js');
const { validateObservation } = await imp('js/observatory/schema.js');
const { fTest } = await imp('js/kernels/statistics/index.js');
const { CATALOGUE_DATA } = await imp('js/compute/catalogueData.js');

const NB = id => path.join(REPO, 'compute/notebooks/gate', `${id}.ipynb`);
const read = rel => readFileSync(path.join(REPO, rel), 'utf8');
const inp = name => readFileSync(path.join(INP, name), 'utf8');

/** One run of a notebook under CPython; refusals are exit 1 with REFUSED on stderr. */
function run(id, text, params = '{}') {
  let cpu = null;
  try {
    const out = execFileSync(
      '/usr/bin/time',
      [
        '-p',
        'python3',
        '-E',
        path.join(REPO, 'tools/compute-gate-run.py'),
        NB(id),
        '-',
        params,
      ],
      {
        input: text,
        maxBuffer: 1 << 29,
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe'],
      }
    );
    return { ok: true, out, cpu };
  } catch (e) {
    const err = String(e.stderr || '');
    const m = /user ([\d.]+)\nsys ([\d.]+)/.exec(err);
    return {
      ok: false,
      refused: /^REFUSED:/m.test(err),
      err: err
        .split('\n')
        .filter(l => !/^(real|user|sys) /.test(l))
        .join('\n')
        .slice(-300),
      cpu: m ? +m[1] + +m[2] : null,
    };
  }
}
function timed(id, text, params) {
  const t0 = process.hrtime.bigint();
  const r = run(id, text, params);
  r.wall = Number(process.hrtime.bigint() - t0) / 1e9;
  return r;
}
/** The user+sys time of a successful run, from /usr/bin/time (it prints after the child). */
function cpuOf(id, text, params = '{}') {
  const r = execFileSync(
    '/bin/bash',
    [
      '-c',
      `/usr/bin/time -p python3 -E "${path.join(REPO, 'tools/compute-gate-run.py')}" "${NB(id)}" - '${params}' >/dev/null 2>"$TMPF"; cat "$TMPF"`,
    ],
    {
      input: text,
      encoding: 'utf8',
      env: { ...process.env, TMPF: path.join(INP, '.time') },
      maxBuffer: 1 << 26,
    }
  );
  const m = /user ([\d.]+)\nsys ([\d.]+)/.exec(r);
  return m ? +m[1] + +m[2] : null;
}
const clone = x => JSON.parse(JSON.stringify(x));
const ans = r => JSON.parse(r.out);
const rel = (a, b) =>
  Math.abs(a - b) / Math.max(Math.abs(a), Math.abs(b), 1e-300);
const maxRel = (a, b) => a.reduce((m, v, i) => Math.max(m, rel(v, b[i])), 0);
const maxAbs = (a, b) =>
  a.reduce((m, v, i) => Math.max(m, Math.abs(v - b[i])), 0);
const flat = a => a.flat(Infinity);

const L = []; // legs
const leg = (id, status, measured, bound) =>
  L.push({ id, status, measured, bound: bound ?? null });
const bnd = id =>
  (
    TH.candidates
      .flatMap(c => c.legs)
      .concat(TH.pageLegs)
      .find(l => l.id === id) ?? {}
  ).bound;
const pass = (id, ok, measured) =>
  leg(id, ok ? 'pass' : 'fail', measured, bnd(id));
const notRun = (id, why) => leg(id, 'NOT RUN', why, bnd(id));
const rep = (id, measured) => leg(id, 'reported', measured, 'reported');

// ---------------------------------------------------------------- supplies (e), shared
const ALLOWED = new Set([
  'json',
  'math',
  'base64',
  'numpy',
  'scipy',
  'matplotlib',
  'astropy',
]);
function supplies(id) {
  const code = JSON.parse(readFileSync(NB(id), 'utf8'))
    .cells.filter(c => c.cell_type === 'code')
    .map(c => c.source.join(''))
    .join('\n');
  const mods = new Set();
  for (const m of code.matchAll(
    /^\s*(?:from\s+([\w.]+)\s+import|import\s+([\w.]+))/gm
  ))
    mods.add((m[1] || m[2]).split('.')[0]);
  const bad = [...mods].filter(m => !ALLOWED.has(m));
  const forbidden =
    /\b(open|eval|exec|compile|__import__)\s*\(|\b(subprocess|socket|urllib|requests|micropip|pathlib|shutil|ctypes)\b|\bos\.|\bsys\./.exec(
      code
    );
  const pk = [
    'numpy',
    ...['scipy', 'matplotlib', 'astropy'].filter(m => mods.has(m)),
  ];
  const sets = CATALOGUE_DATA.map(e => e.packages);
  const within = sets.some(s => pk.every(p => s.includes(p)));
  return {
    mods: [...mods],
    bad,
    forbidden: forbidden ? forbidden[0] : null,
    packages: pk,
    withinStatedSet: within,
  };
}
const SUP = Object.fromEntries(
  [
    'integration-order',
    'adaptive-steps',
    'orbital-chaos',
    'kepler-root',
    'least-squares',
    'periodogram-scratch',
    'isochrone-interpolation',
    'polytrope',
    'barnes-hut-toy',
    'synthetic-populations',
  ].map(i => [i, supplies(i)])
);
const supOk = (id, extra) =>
  SUP[id].bad.length === 0 && !SUP[id].forbidden && extra;
const baseSha = rel => {
  try {
    return sha(
      execFileSync('git', ['show', `${BASE}:${rel}`], {
        cwd: REPO,
        maxBuffer: 1 << 28,
      })
    );
  } catch {
    return null;
  }
};

const KEPLER = 'compute/inputs/kepler-16.gravitas-system.json';
const TESS = 'compute/inputs/tess-hd209458-s56.observation.json';
const kepler = JSON.parse(read(KEPLER));
const tess = JSON.parse(read(TESS));
const keplerSha = sha(read(KEPLER)) === baseSha(KEPLER);
const tessSha = sha(read(TESS)) === baseSha(TESS);
const detail = {};

// ================================================================ N01
{
  const id = 'integration-order';
  const t = read(KEPLER);
  const r1 = timed(id, t),
    r2 = run(id, t);
  detail.N01 = { wall: r1.wall, ok: r1.ok };
  if (!r1.ok) {
    for (const s of ['a', 'b', 'c', 'd', 'e']) pass(`N01.${s}`, false, r1.err);
  } else {
    const a = ans(r1),
      o = OR.N01;
    let worst = 0;
    for (const m of Object.keys(o.errors))
      o.errors[m].forEach(
        (v, i) => (worst = Math.max(worst, rel(a.errors[m][i], v)))
      );
    const ordD = Math.max(
      ...Object.keys(o.order).map(m => Math.abs(a.order[m] - o.order[m]))
    );
    pass('N01.a', worst <= 1e-6 && ordD <= 1e-4, {
      worstErrorRel: worst,
      worstOrderAbs: ordD,
    });
    const th = { euler: 1, symplectic: 1, verlet: 2, rk4: 4 };
    const dev = Object.fromEntries(
      Object.entries(th).map(([m, p]) => [
        m,
        {
          order: a.order[m],
          allowed: 0.1 * p + 0.1,
          dev: Math.abs(a.order[m] - p),
        },
      ])
    );
    pass(
      'N01.b',
      Object.values(dev).every(d => d.dev <= d.allowed),
      dev
    );
    pass('N01.c', r2.ok && r2.out === r1.out, { identical: r2.out === r1.out });
    const bad = clone(kepler);
    bad.initial.bodies[1].x = bad.initial.bodies[0].x;
    bad.initial.bodies[1].y = bad.initial.bodies[0].y;
    const rb = run(id, JSON.stringify(bad));
    pass('N01.d', !rb.ok && rb.refused, {
      refused: rb.refused,
      message: rb.err,
    });
    pass('N01.e', supOk(id, systemFromFile(kepler).ok && keplerSha), {
      ...SUP[id],
      inputValid: systemFromFile(kepler).ok,
      inputUnchanged: keplerSha,
    });
  }
}
// ================================================================ N02
{
  const id = 'adaptive-steps';
  const t = read(KEPLER);
  const r1 = timed(id, t),
    r2 = run(id, t);
  detail.N02 = { wall: r1.wall, ok: r1.ok };
  if (!r1.ok) {
    for (const s of ['a', 'b', 'c', 'd', 'e']) pass(`N02.${s}`, false, r1.err);
    rep('N02.r', 'no answer');
  } else {
    const a = ans(r1).tolerances,
      o = OR.N02;
    const ctl = Object.fromEntries(
      Object.keys(a).map(k => [k, { err_rel: a[k].err_rel, limit: 100 * +k }])
    );
    pass(
      'N02.a',
      Object.values(ctl).every(c => c.err_rel <= c.limit),
      ctl
    );
    const vs = Object.fromEntries(
      Object.keys(a).map(k => [
        k,
        {
          errRatio: a[k].err_rel / o[k].err_rel,
          stepRatio: a[k].accepted / o[k].accepted,
        },
      ])
    );
    pass(
      'N02.b',
      Object.values(vs).every(
        v =>
          v.errRatio >= 0.2 &&
          v.errRatio <= 5 &&
          v.stepRatio >= 0.5 &&
          v.stepRatio <= 2
      ),
      vs
    );
    pass('N02.c', r2.ok && r2.out === r1.out, { identical: r2.out === r1.out });
    const bad = clone(kepler);
    const b = bad.initial.bodies;
    b[1].x = b[0].x + 1e-6 * (kepler.initial.bodies[1].x - b[0].x);
    b[1].y = b[0].y + 1e-6 * (kepler.initial.bodies[1].y - b[0].y);
    const rb = timed(id, JSON.stringify(bad));
    let cpu = null;
    try {
      cpu = cpuOf(id, JSON.stringify(bad));
    } catch {
      cpu = null;
    }
    pass(
      'N02.d',
      !rb.ok && rb.refused && (cpu === null ? rb.wall : cpu) <= 20,
      {
        refused: rb.refused,
        message: rb.err,
        cpuSeconds: cpu,
        wallSeconds: rb.wall,
      }
    );
    pass('N02.e', supOk(id, systemFromFile(kepler).ok && keplerSha), {
      ...SUP[id],
      inputValid: systemFromFile(kepler).ok,
      inputUnchanged: keplerSha,
    });
    rep(
      'N02.r',
      Object.fromEntries(
        Object.keys(a).map(k => [
          k,
          {
            adaptiveNfev: a[k].nfev,
            rk4Nfev: a[k].rk4_nfev,
            ratio: a[k].rk4_nfev ? a[k].rk4_nfev / a[k].nfev : null,
          },
        ])
      )
    );
  }
}
// ================================================================ N03
{
  const id = 'orbital-chaos';
  const name = 'n03-engine-pair';
  const g = n => inp(`${n}.grid.json`);
  const rr = Object.fromEntries(
    [
      'n03-engine-pair',
      'n03-different-clusters',
      'n03-logistic-0.7',
      'n03-logistic-1.5',
      'n03-linear',
    ].map(n => [n, timed(id, g(n))])
  );
  detail.N03 = {
    wall: Object.fromEntries(Object.entries(rr).map(([k, v]) => [k, v.wall])),
  };
  const ana = [0.7, 1.5].map(l => {
    const r = rr[`n03-logistic-${l}`];
    return {
      lambda: l,
      got: r.ok ? ans(r).lambda : null,
      relErr: r.ok ? Math.abs(ans(r).lambda - l) / l : null,
      message: r.ok ? null : r.err,
    };
  });
  pass(
    'N03.a',
    ana.every(x => x.relErr !== null && x.relErr <= 0.05),
    ana
  );
  const o = OR.N03['n03-engine-pair'];
  const eng = rr[name];
  let bOk = false,
    bM;
  if (o.status === 'refused') {
    const m = /R2=([\d.eE+-]+) i0=(\d+) i1=(\d+)/.exec(eng.err || '');
    bOk =
      !eng.ok &&
      eng.refused &&
      !!m &&
      Math.abs(+m[1] - o.r2) <= 1e-9 &&
      +m[2] === o.i0 &&
      +m[3] === o.i1;
    bM = { oracle: o, notebookRefused: eng.refused, message: eng.err };
  } else {
    const x = eng.ok ? ans(eng) : null;
    bOk =
      !!x &&
      Math.abs(x.lambda - o.lambda) <= 1e-9 &&
      Math.abs(x.r2 - o.r2) <= 1e-9 &&
      x.i0 === o.i0 &&
      x.i1 === o.i1;
    bM = { oracle: o, notebook: x };
  }
  pass('N03.b', bOk, bM);
  const again = run(id, g('n03-logistic-1.5'));
  pass(
    'N03.c',
    rr['n03-logistic-1.5'].ok &&
      again.ok &&
      again.out === rr['n03-logistic-1.5'].out,
    { identical: again.out === rr['n03-logistic-1.5'].out }
  );
  pass(
    'N03.d',
    [rr['n03-linear'], rr['n03-different-clusters']].every(
      r => !r.ok && r.refused
    ),
    {
      linear: rr['n03-linear'].err,
      differentClusters: rr['n03-different-clusters'].err,
    }
  );
  const gv = validateGrid(JSON.parse(g('n03-engine-pair')));
  pass('N03.e', supOk(id, gv.ok), {
    ...SUP[id],
    gridValid: gv.ok,
    problems: gv.problems?.slice(0, 2),
  });
  rep(
    'N03.r',
    eng.ok
      ? ans(eng)
      : {
          engineExport: 'refused',
          message: eng.err,
          oracle: o,
          oracleSaturationMedian: o.S ?? null,
        }
  );
}
// ================================================================ N04
{
  const id = 'kepler-root';
  const t = read(KEPLER);
  const r1 = timed(id, t),
    r2 = run(id, t);
  detail.N04 = { wall: r1.wall, ok: r1.ok };
  if (!r1.ok) {
    for (const s of ['a', 'b', 'c', 'd', 'e', 'o'])
      pass(`N04.${s}`, false, r1.err);
    rep('N04.r', 'no answer');
  } else {
    const a = ans(r1);
    let da = 0,
      db = 0;
    for (const k of Object.keys(OR.N04.roots)) {
      da = Math.max(da, maxAbs(a.bisectionRoots[k], OR.N04.roots[k]));
      db = Math.max(db, maxAbs(a.bisectionRoots[k], REF.N04.E[k]));
    }
    pass('N04.a', da <= 1e-11, { maxAbsRad: da });
    pass('N04.b', db <= 1e-11, { maxAbsRad: db });
    pass('N04.c', r2.ok && r2.out === r1.out, { identical: r2.out === r1.out });
    const mk = e => {
      const d = clone(kepler);
      d.bodies[1].e = e;
      return JSON.stringify(d);
    };
    const rb = [run(id, mk(1.2)), run(id, mk(-0.1))];
    pass(
      'N04.d',
      rb.every(r => !r.ok && r.refused),
      rb.map(r => r.err)
    );
    pass('N04.e', supOk(id, systemFromFile(kepler).ok && keplerSha), {
      ...SUP[id],
      inputValid: systemFromFile(kepler).ok,
      inputUnchanged: keplerSha,
    });
    pass('N04.o', a.newtonOrder >= 1.8, {
      newtonOrder: a.newtonOrder,
      samples: a.orderSamples,
    });
    rep(
      'N04.r',
      Object.fromEntries(
        ['0.99', '0.999'].map(e => [
          e,
          {
            newtonFailures: a.stats[e].newton.failures,
            halleyFailures: a.stats[e].halley.failures,
            bisectionFailures: a.stats[e].bisection.failures,
          },
        ])
      )
    );
  }
}
// ================================================================ N05
{
  const id = 'least-squares';
  const t = read(TESS);
  const r1 = timed(id, t),
    r2 = run(id, t);
  detail.N05 = { wall: r1.wall, ok: r1.ok };
  if (!r1.ok) {
    for (const s of ['a', 'b', 'c', 'd', 'e']) pass(`N05.${s}`, false, r1.err);
  } else {
    const a = ans(r1),
      o = OR.N05;
    let c = 0,
      v = 0,
      x = 0;
    for (const d of Object.keys(o.degrees)) {
      c = Math.max(c, maxRel(a.degrees[d].coef, o.degrees[d].coef));
      v = Math.max(v, maxRel(a.degrees[d].covdiag, o.degrees[d].covdiag));
      x = Math.max(x, rel(a.degrees[d].chi2, o.degrees[d].chi2));
    }
    pass('N05.a', c <= 1e-8 && v <= 1e-6 && x <= 1e-9, {
      coefRel: c,
      covdiagRel: v,
      chi2Rel: x,
    });
    const ft = a.F.map(f => {
      const k = fTest({
        rssReduced: f.rssReduced,
        pReduced: f.from + 1,
        rssFull: f.rssFull,
        pFull: f.to + 1,
        n: f.n,
      });
      return {
        status: k.status,
        Frel: rel(k.F, f.F),
        pRel: f.p > 1e-300 ? rel(k.p, f.p) : null,
      };
    });
    pass(
      'N05.b',
      ft.every(
        f =>
          f.status === 'ok' &&
          f.Frel <= 1e-9 &&
          (f.pRel === null || f.pRel <= 1e-8)
      ),
      ft
    );
    pass('N05.c', r2.ok && r2.out === r1.out, { identical: r2.out === r1.out });
    const cut = clone(tess);
    cut.columns.forEach(cl => (cl.values = cl.values.slice(0, 4)));
    const same = clone(tess);
    same.columns.find(cl => cl.id === 'time').values = same.columns
      .find(cl => cl.id === 'time')
      .values.map(() => tess.columns.find(cl => cl.id === 'time').values[0]);
    const rb = [run(id, JSON.stringify(cut)), run(id, JSON.stringify(same))];
    pass(
      'N05.d',
      rb.every(r => !r.ok && r.refused),
      rb.map(r => r.err)
    );
    const vo = validateObservation(tess);
    pass('N05.e', supOk(id, vo.length === 0 && tessSha), {
      ...SUP[id],
      inputValid: vo.length === 0,
      inputUnchanged: tessSha,
    });
  }
}
// ================================================================ N06
{
  const id = 'periodogram-scratch';
  const t = read(TESS);
  const r1 = timed(id, t),
    r2 = run(id, t);
  detail.N06 = { wall: r1.wall, ok: r1.ok };
  if (!r1.ok) {
    for (const s of ['a', 'b', 'c', 'd', 'e']) pass(`N06.${s}`, false, r1.err);
  } else {
    const a = ans(r1);
    const da = maxAbs(a.power, OR.N06.power),
      db = maxAbs(a.power, REF.N06.power);
    pass('N06.a', da <= 1e-9 && a.peakIndex === OR.N06.peakIndex, {
      maxAbsPower: da,
      peakIndex: a.peakIndex,
      oraclePeak: OR.N06.peakIndex,
    });
    pass('N06.b', db <= 1e-9 && a.peakIndex === REF.N06.peakIndex, {
      maxAbsPower: db,
      peakIndex: a.peakIndex,
      kernelPeak: REF.N06.peakIndex,
    });
    pass('N06.c', r2.ok && r2.out === r1.out, { identical: r2.out === r1.out });
    const cl = f => {
      const d = clone(tess);
      f(d, k => d.columns.find(c => c.id === k));
      return JSON.stringify(d);
    };
    const negs = [
      run(
        id,
        cl(d => d.columns.forEach(x => (x.values = x.values.slice(0, 9))))
      ),
      run(
        id,
        cl((d, c) => (c('time').values = c('time').values.slice().reverse()))
      ),
      run(
        id,
        cl((d, c) => (c('flux').values = c('flux').values.map(() => 1)))
      ),
      run(id, t, JSON.stringify({ periods: [1, -2] })),
    ];
    pass(
      'N06.d',
      negs.every(r => !r.ok && r.refused),
      negs.map(r => r.err)
    );
    const vo = validateObservation(tess);
    pass('N06.e', supOk(id, vo.length === 0 && tessSha), {
      ...SUP[id],
      inputValid: vo.length === 0,
      inputUnchanged: tessSha,
    });
  }
}
// ================================================================ N07
{
  const id = 'isochrone-interpolation';
  const t = inp('n07-mist.observation.json');
  const r1 = timed(id, t),
    r2 = run(id, t);
  detail.N07 = { wall: r1.wall, ok: r1.ok };
  if (!r1.ok) {
    for (const s of ['a', 'b', 'c', 'd', 'e']) pass(`N07.${s}`, false, r1.err);
  } else {
    const a = ans(r1),
      o = OR.N07;
    let d = Infinity;
    if (a.count === o.count && a.feh === o.feh) {
      d = 0;
      a.predictions.forEach((p, i) => {
        d = Math.max(
          d,
          Math.abs(p[3] - o.predictions[i][3]),
          Math.abs(p[4] - o.predictions[i][4]),
          Math.abs(p[1] - o.predictions[i][1])
        );
      });
    }
    pass('N07.a', d <= 1e-9, {
      count: a.count,
      oracleCount: o.count,
      maxAbsMag: d,
    });
    pass('N07.b', a.rms.cubic <= a.rms.linear && a.rms.cubic <= 0.05, {
      rms: a.rms,
      max: a.max,
    });
    pass('N07.c', r2.ok && r2.out === r1.out, { identical: r2.out === r1.out });
    const rb = [
      run(id, t, JSON.stringify({ request: { feh: o.feh, logAge: 99 } })),
      run(id, t, JSON.stringify({ request: { feh: 3, logAge: 7 } })),
    ];
    pass(
      'N07.d',
      rb.every(r => !r.ok && r.refused),
      rb.map(r => r.err)
    );
    const doc = JSON.parse(t),
      vo = validateObservation(doc);
    pass(
      'N07.e',
      supOk(
        id,
        vo.length === 0 &&
          doc.license.status === 'no-license-stated' &&
          a.license === 'no-license-stated' &&
          a.credit === doc.credit &&
          !!a.credit
      ),
      {
        ...SUP[id],
        inputValid: vo.length === 0,
        problems: vo.slice(0, 2),
        licence: a.license,
        credit: a.credit,
      }
    );
  }
}
// ================================================================ N08
{
  const id = 'polytrope';
  const t = inp('n08-polytrope.grid.json');
  const r1 = timed(id, t),
    r2 = run(id, t);
  detail.N08 = { wall: r1.wall, ok: r1.ok };
  if (!r1.ok) {
    for (const s of ['a', 'b', 'c', 'd', 'f', 'e'])
      pass(`N08.${s}`, false, r1.err);
  } else {
    const a = ans(r1),
      o = OR.N08;
    const at = n => a.n.indexOf(n);
    const cl = [
      ['0', 0],
      ['1', 1],
    ].map(([k, n]) => ({
      n,
      xi1: rel(a.solution.xi1[at(n)], o.closed[k].xi1),
      mass: rel(a.solution.mass[at(n)], o.closed[k].mass),
    }));
    pass(
      'N08.a',
      cl.every(c => c.xi1 <= 1e-9 && c.mass <= 1e-9),
      cl
    );
    const others = a.n
      .filter(n => n !== 0 && n !== 1)
      .map(n => {
        const q = o.radau[String(n)];
        return {
          n,
          xi1: rel(a.solution.xi1[at(n)], q.xi1),
          mass: rel(a.solution.mass[at(n)], q.mass),
        };
      });
    pass(
      'N08.b',
      others.every(c => c.xi1 <= 1e-8 && c.mass <= 1e-8),
      {
        worstXi1: Math.max(...others.map(c => c.xi1)),
        worstMass: Math.max(...others.map(c => c.mass)),
      }
    );
    const kd = Math.max(...flat(Object.values(a.relativeDifferenceFromTable)));
    pass('N08.c', kd <= 1e-6, {
      worstRelativeDifferenceFromKernelTable: kd,
      perOutput: Object.fromEntries(
        Object.entries(a.relativeDifferenceFromTable).map(([k, v]) => [
          k,
          Math.max(...v),
        ])
      ),
    });
    pass('N08.d', r2.ok && r2.out === r1.out, { identical: r2.out === r1.out });
    const rb = ['5', '5.5', '-0.5'].map(n =>
      run(id, inp(`n08-bad-${n}.grid.json`))
    );
    pass(
      'N08.f',
      rb.every(r => !r.ok && r.refused),
      rb.map(r => r.err)
    );
    const gv = validateGrid(JSON.parse(t));
    pass('N08.e', supOk(id, gv.ok), { ...SUP[id], gridValid: gv.ok });
  }
}
// ================================================================ N09
{
  const id = 'barnes-hut-toy';
  const t = inp('n09-snapshot.grid.json');
  const r1 = timed(id, t),
    r2 = run(id, t);
  detail.N09 = { wall: r1.wall, ok: r1.ok };
  if (!r1.ok) {
    for (const s of ['a', 'b', 'g', 'c', 'd', 'e'])
      pass(`N09.${s}`, false, r1.err);
  } else {
    const a = ans(r1),
      o = OR.N09;
    const big = Math.max(...o.ax.map(Math.abs), ...o.ay.map(Math.abs));
    const da =
      Math.max(maxAbs(a.directAx, o.ax), maxAbs(a.directAy, o.ay)) / big;
    pass('N09.a', da <= 1e-12, { maxAbsOverLargest: da });
    const t0 = a.theta['0.0'];
    const db =
      Math.max(maxAbs(t0.ax, a.directAx), maxAbs(t0.ay, a.directAy)) / big;
    pass('N09.b', db <= 1e-10, { maxAbsOverLargest: db });
    const ths = Object.keys(a.theta)
      .map(Number)
      .sort((x, y) => x - y)
      .map(k => ({ theta: k, ...a.theta[k === 0 ? '0.0' : String(k)] }));
    const mono = ths.every((x, i) => i === 0 || x.rms >= ths[i - 1].rms);
    const t5 = a.theta['0.5'];
    pass(
      'N09.g',
      mono && t5.rms <= 0.05 && t5.interactions <= 0.25 * a.N * (a.N - 1),
      {
        monotone: mono,
        rms: ths.map(x => [x.theta, x.rms]),
        rmsAt05: t5.rms,
        interactionsAt05: t5.interactions,
        limit: 0.25 * a.N * (a.N - 1),
      }
    );
    pass('N09.c', r2.ok && r2.out === r1.out, { identical: r2.out === r1.out });
    const rb = [
      run(id, t, JSON.stringify({ eps: 0 })),
      run(id, inp('n09-too-many.grid.json')),
    ];
    pass(
      'N09.d',
      rb.every(r => !r.ok && r.refused),
      rb.map(r => r.err)
    );
    const doc = JSON.parse(t),
      gv = validateGrid(doc);
    pass('N09.e', supOk(id, gv.ok && /SYNTHETIC/.test(doc.title)), {
      ...SUP[id],
      gridValid: gv.ok,
      labelledSynthetic: /SYNTHETIC/.test(doc.title),
    });
  }
}
// ================================================================ N10
{
  const id = 'synthetic-populations';
  const t1 = inp('n10-s1.observation.json'),
    t2 = inp('n10-s2.observation.json');
  const r1 = timed(id, t1),
    r2 = timed(id, t2),
    r3 = run(id, t1);
  detail.N10 = { wall: [r1.wall, r2.wall], ok: [r1.ok, r2.ok] };
  if (!r1.ok || !r2.ok) {
    for (const s of ['a', 'b', 'c', 'd', 'e'])
      pass(`N10.${s}`, false, (r1.err || '') + (r2.err || ''));
  } else {
    const a1 = ans(r1),
      a2 = ans(r2);
    const d1 = maxRel(a1.mu, OR.N10.S1mu);
    const d2 = a2.mu.map((v, i) =>
      OR.N10.S2mu[i] > 1 ? rel(v, OR.N10.S2mu[i]) : Math.abs(v - OR.N10.S2mu[i])
    );
    const st =
      JSON.stringify(a2.status) ===
      JSON.stringify(
        OR.N10.S2exposure.map(e => (e < 5 ? 'not constrained' : 'ok'))
      );
    pass('N10.a', d1 <= 1e-6 && Math.max(...d2) <= 1e-6 && st, {
      S1maxRel: d1,
      S2max: Math.max(...d2),
      S2status: a2.status,
    });
    const R = a1.recovery;
    pass(
      'N10.b',
      R.meanZ.every(m => Math.abs(m) <= 0.35) &&
        R.pooledRmsZ >= 0.8 &&
        R.pooledRmsZ <= 1.6,
      { meanZ: R.meanZ, rmsZ: R.rmsZ, pooledRmsZ: R.pooledRmsZ }
    );
    pass('N10.c', r3.ok && r3.out === r1.out, { identical: r3.out === r1.out });
    const rb = [
      'bad-exposure',
      'bad-reliability',
      'bad-sigma',
      'no-objects',
    ].map(n => run(id, inp(`n10-${n}.observation.json`)));
    pass(
      'N10.d',
      rb.every(r => !r.ok && r.refused),
      rb.map(r => r.err)
    );
    const docs = [JSON.parse(t1), JSON.parse(t2)],
      vs = docs.map(validateObservation);
    pass(
      'N10.e',
      supOk(
        id,
        vs.every(v => v.length === 0) &&
          docs.every(d => d.truth && /SYNTHETIC/.test(d.title))
      ),
      {
        ...SUP[id],
        valid: vs.map(v => v.length === 0),
        problems: vs.flat().slice(0, 2),
      }
    );
  }
}
// ================================================================ page legs
const ids = ['G1.a', 'G1.b', 'G1.c'];
const pg = PAGE ? J(PAGE) : {};
for (const i of ids)
  pg[i]
    ? leg(i, pg[i].ok ? 'pass' : 'fail', pg[i].detail, bnd(i))
    : notRun(i, 'the page-legs file has no result');
// G2.a
{
  const sets = CATALOGUE_DATA.map(e => e.packages.join('+'));
  const per = Object.fromEntries(
    Object.entries(SUP).map(([k, v]) => [
      k,
      { packages: v.packages, withinStatedSet: v.withinStatedSet },
    ])
  );
  pass(
    'G2.a',
    Object.values(per).every(v => v.withinStatedSet),
    { statedSets: [...new Set(sets)], per }
  );
}
notRun(
  'G2.b',
  'R1: needs the pinned runtime (downloaded code) in Chromium and WebKit; not run'
);
notRun('G3.b', 'R2: needs the pinned runtime in two browsers; not run');
leg('G3.c', 'NOT RUN', 'R2; reported only', 'reported');
// G4.a
{
  const man = J(path.join(REPO, 'compute-frame/manifest.json'));
  const ok =
    !!man.runtime?.version &&
    /^[0-9a-f]{64}$/.test(man.runtime?.lockSha256 ?? '') &&
    Object.values(man.runtime.packages ?? {}).every(p => p.version) &&
    Object.keys(man.runtime.packages ?? {}).length >= 4;
  pass('G4.a', ok, {
    version: man.runtime?.version,
    lockSha256: man.runtime?.lockSha256,
    packages: man.runtime?.packages,
  });
}
// G4.b
{
  const tool = read('TOOLCHAIN.md');
  const inTool = /pyodide|compute frame|compute page/i.test(tool);
  const files = execFileSync('git', ['ls-files', 'tools'], {
    cwd: REPO,
    encoding: 'utf8',
  })
    .split('\n')
    .filter(
      f => /\.(mjs|js|py|sh|json)$/.test(f) && !/^tools\/compute/.test(f)
    );
  const hits = files.filter(f =>
    /pyodide/i.test(readFileSync(path.join(REPO, f), 'utf8'))
  );
  pass('G4.b', inTool || hits.length > 0, {
    toolchainNamesTheRuntime: inTool,
    otherToolsMentioningPyodide: hits,
  });
}
notRun(
  'G4.c',
  'R3: needs the pinned runtime and a lock file download; not run'
);
// G5.a
{
  const files = execFileSync('git', ['ls-files', 'js', 'index.html', 'tools'], {
    cwd: REPO,
    encoding: 'utf8',
  })
    .split('\n')
    .filter(f => f.startsWith('js/') && f.endsWith('.js'));
  const allowed = f => f.startsWith('js/compute/') || f === 'js/computePage.js';
  const bad = [];
  for (const f of files) {
    if (allowed(f)) continue;
    const s = readFileSync(path.join(REPO, f), 'utf8');
    if (
      /from\s+['"][^'"]*\/(compute\/[^'"]+|computePage(\.js)?)['"]|import\(\s*['"][^'"]*\/(compute\/|computePage)/.test(
        s
      )
    )
      bad.push(f);
  }
  pass('G5.a', bad.length === 0, { importersOutsideThePage: bad });
}
// G5.b
{
  const names = execFileSync('git', ['ls-files', 'js/data/investigations'], {
    cwd: REPO,
    encoding: 'utf8',
  })
    .split('\n')
    .filter(f => /^js\/data\/investigations\/[^/]+\.js$/.test(f));
  const withCompute = names
    .filter(f =>
      /^\s*compute:\s*'/m.test(readFileSync(path.join(REPO, f), 'utf8'))
    )
    .map(f => path.basename(f, '.js'));
  const courseFiles = execFileSync('git', ['ls-files', 'js/data/courses'], {
    cwd: REPO,
    encoding: 'utf8',
  })
    .split('\n')
    .filter(f => f.endsWith('.js'));
  const listed = {};
  for (const f of courseFiles) {
    const s = readFileSync(path.join(REPO, f), 'utf8');
    for (const id of withCompute)
      if (new RegExp(`lesson: '${id}'`).test(s))
        (listed[id] ||= []).push(path.basename(f));
  }
  pass('G5.b', Object.keys(listed).length === 0, {
    investigationsWithAComputeStep: withCompute,
    listedInABuiltInCourse: listed,
  });
}
// G6.a
{
  const sw = read('tools/build-service-worker.mjs');
  const m = /export const NEVER_PRECACHED = \[([\s\S]*?)\n\];/.exec(sw)[1];
  const need = [
    '/^js\\/compute\\//',
    '/^js\\/computePage\\.js$/',
    '/^compute\\//',
    '/^compute-frame\\//',
  ];
  const have = need.map(n => m.includes(n));
  const html = read('compute/index.html');
  const p = /id="cpOnline"[\s\S]{0,1500}/.exec(html)?.[0] ?? '';
  const en = /Online and opt-in/i.test(p),
    es = /l[ií]nea/i.test(p);
  let inManifest = null;
  try {
    const mf = read('sw-manifest.js');
    inManifest =
      /"?(js\/compute\/|compute\/|compute-frame\/|js\/computePage)/.test(mf);
  } catch {
    inManifest = null;
  }
  pass('G6.a', have.every(Boolean) && en && es && inManifest === false, {
    neverPrecached: Object.fromEntries(need.map((n, i) => [n, have[i]])),
    pageStatesOnlineEn: en,
    pageStatesOnlineEs: es,
    precacheListMentionsThePage: inManifest,
  });
}
// G7.a
{
  const budgets = J(path.join(REPO, 'tools/route-budgets.json'));
  const ceil = {
    sources: budgets.ceilings?.sources?.compute ?? budgets.sources?.compute,
    build: budgets.ceilings?.build?.compute ?? budgets.build?.compute,
  };
  const cat = read('js/compute/catalogueData.js');
  const entries = cat.split(/\n {2}\{\n {4}id:/).slice(1);
  const mean =
    entries.reduce((s, e) => s + Buffer.byteLength(e), 0) / entries.length;
  const measured = pg.routeCompute ?? null;
  if (!measured)
    notRun(
      'G7.a',
      'the measured route bytes were not supplied (node tools/route-budget.mjs)'
    );
  else {
    const proj = {
      sourcesKb: measured.sourcesKb + (10 * mean) / 1024,
      buildKb: measured.buildKb + (10 * mean) / 1024,
    };
    pass(
      'G7.a',
      proj.sourcesKb <= ceil.sources.kb && proj.buildKb <= ceil.build.kb,
      {
        measured,
        ceiling: ceil,
        meanEntryBytes: Math.round(mean),
        entries: entries.length,
        projected: proj,
      }
    );
  }
}

// ---------------------------------------------------------------- verdict
const status = id => L.find(l => l.id === id)?.status;
const candidates = TH.candidates.map(c => {
  const own = c.legs.filter(l => l.kind === 'verdict').map(l => l.id);
  const needed = [
    ...own,
    'G2.b',
    'G3.b',
    'G1.a',
    'G1.b',
    'G1.c',
    'G2.a',
    'G4.a',
    'G4.b',
    'G4.c',
    'G5.a',
    'G5.b',
    'G6.a',
    'G7.a',
  ];
  const failed = own.filter(i => status(i) === 'fail');
  const notrun = needed.filter(i => status(i) === 'NOT RUN');
  const pageFailed = needed.filter(
    i => !own.includes(i) && status(i) === 'fail'
  );
  return {
    id: c.id,
    notebook: c.notebook,
    passes: needed.every(i => status(i) === 'pass'),
    ownFailed: failed,
    pageFailed,
    notRun: notrun,
    noFailureSoFar: failed.length === 0 && pageFailed.length === 0,
  };
});
const passing = candidates.filter(c => c.passes).map(c => c.id);
const verdict =
  passing.length === candidates.length ? 'A' : passing.length ? 'B' : 'C';
const counts = L.reduce(
  (o, l) => ((o[l.status] = (o[l.status] || 0) + 1), o),
  {}
);
const result = {
  format: 'gravitas.compute-gate-ii-results/1',
  thresholdsSha256: sha(readFileSync(path.join(FIX, 'thresholds.json'))),
  node: process.version,
  python: execFileSync('python3', ['-E', '--version'], {
    encoding: 'utf8',
  }).trim(),
  verdict,
  passing,
  noFailureSoFar: candidates.filter(c => c.noFailureSoFar).map(c => c.id),
  counts,
  candidates,
  legs: L,
  detail,
};
writeFileSync(OUT, JSON.stringify(result, null, 1) + '\n');
console.log(
  `verdict ${verdict}; passing ${passing.join(',') || 'none'}; counts ${JSON.stringify(counts)}`
);
for (const l of L.filter(l => l.status === 'fail'))
  console.log('FAIL', l.id, JSON.stringify(l.measured).slice(0, 160));
