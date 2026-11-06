#!/usr/bin/env node
// Writes the follow-up record from one validator part and the oracle output:
//   node tools/moving-cluster-followup-fixtures.mjs --part FILE --oracle FILE --out-dir DIR
// followup-results.json, followup-failed-legs.json, followup-ensembles.json and
// followup-oracle-results.json. No per-star value, source id or absolute
// moving-cluster parallax of the real sample is written (Prompt 234's rule).

import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import process from 'node:process';

const args = process.argv.slice(2);
const opt = n => {
  const i = args.indexOf(`--${n}`);
  return i >= 0 ? args[i + 1] : null;
};
const part = JSON.parse(readFileSync(opt('part'), 'utf8'));
const orc = JSON.parse(readFileSync(opt('oracle'), 'utf8'));
const dir = opt('out-dir');
const sha = s => createHash('sha256').update(s).digest('hex');
const sig = (v, d = 5) => (Number.isFinite(v) ? Number(v.toPrecision(d)) : v);
const write = (f, o) =>
  writeFileSync(path.join(dir, f), JSON.stringify(o, null, 2) + '\n');

const count = rows => {
  const o = { pass: 0, fail: 0, reported: 0, 'not-run': 0 };
  for (const r of rows) o[r.status]++;
  return { ...o, rows: rows.length };
};

write('followup-results.json', {
  format: 'gravitas.moving-cluster-followup-results/1',
  note: 'The follow-up legs of Prompt 234 Part A (corrected-eigenvector convergent point CE; published-value legs RK7 and RK8). The membership iteration is the amended form of Part A used without ratifying it; the committed form verdict C binds.',
  shas: part.shas,
  node: part.node,
  spike: part.spike,
  date: part.date,
  elapsedS: part.elapsedS,
  verdict: part.verdict,
  counts: count(part.rows),
  real: part.real,
  rows: part.rows,
});

write('followup-failed-legs.json', {
  format: 'gravitas.moving-cluster-followup-failed-legs/1',
  note: 'Every failing follow-up leg, labelled and left failing. Only Carl resets a bound.',
  shas: part.shas,
  legs: part.rows
    .filter(r => r.status === 'fail')
    .map(r => ({ id: r.id, label: 'FAILED (follow-up)', measured: r.measured, note: r.note })),
});

const ens = {};
for (const [name, evs] of Object.entries(part.ensembles))
  ens[name] = evs.map(e => ({
    s: e.status,
    r: e.reason,
    m: e.nMembers,
    cp: sig(e.cpErrDeg),
    cpPlain: sig(e.plainCpErrDeg),
    tau: sig(e.tauDeg),
    it: e.ceIterations,
    rel: sig(e.relBias),
    z: sig(e.z),
    sg: sig(e.sigmaMC),
    c68: e.covered68,
    c95: e.covered95,
    ag: e.agree,
    plain: e.plain
      ? { rel: sig(e.plain.relBias), z: sig(e.plain.z), c68: e.plain.c68, c95: e.plain.c95 }
      : undefined,
  }));
write('followup-ensembles.json', {
  format: 'gravitas.moving-cluster-followup-ensembles/1',
  note: 'Synthetic data with its truth manifest: the generator parameters are thresholds.json syntheticTruth; each row is one realization summary (no per-star values).',
  shas: part.shas,
  variants: {
    E1: { seed: 234101, realizations: 200, options: {} },
    E7: { seed: 234101, realizations: 200, options: { internalSigma: 1.0 } },
    E8: { seed: 234101, realizations: 200, options: { separationDeg: 60 } },
    E3: { seed: 234102, realizations: 50, options: { withRv: false } },
    E5: { seed: 234102, realizations: 100, options: { internalSigma: 5 } },
    E6: { seed: 234102, realizations: 100, options: { expansion: 0.05 } },
  },
  ensembles: ens,
});

const digest = a => sha(JSON.stringify([...(a ?? [])].sort((x, y) => x - y)));
const caseOut = c => {
  const o = c.ce;
  return {
    id: c.id,
    status: o.status,
    reason: o.reason ?? null,
    nMembers: (o.members ?? []).length,
    membersSha256: digest(o.members),
    cp: o.cp ?? null,
    tau2: o.tau2 ?? null,
    iterations: o.iterations ?? null,
    V: o.V ?? null,
    piMC: o.piMC ?? null,
    sigmaMC: o.sigmaMC ?? null,
    perStarSha256: o.perStar ? sha(JSON.stringify(o.perStar)) : null,
  };
};
const realCe = orc.real?.ce;
write('followup-oracle-results.json', {
  format: 'gravitas.moving-cluster-followup-oracle-results/1',
  note: 'The independent oracle (tools/moving-cluster-oracle/oracle_ce.py on spike/moving-cluster-followup, numpy, no Gravitas code) of the CE estimator. The real file moving-cluster parallax and its bootstrap error are withheld: the gate reports no distance below a ratified verdict A; the relative agreements are in followup-results.json.',
  versions: orc.versions,
  bootstrap: orc.bootstrap,
  script: { path: 'tools/moving-cluster-oracle/oracle_ce.py', sha256: orc.script.sha256 },
  synthetic: orc.synthetic,
  cases: orc.cases.map(caseOut),
  real: realCe
    ? {
        sha256: orc.real.sha256,
        maskSha256: orc.real.maskSha256,
        ce: {
          ...caseOut({ id: 'real', ce: realCe }),
          piMC: null,
          sigmaMC: null,
        },
      }
    : null,
});
process.stdout.write(`wrote 4 files to ${dir}\n`);
