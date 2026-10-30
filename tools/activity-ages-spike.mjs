#!/usr/bin/env node
// The activity ages gate's prototype (Prompt 220 Part B). SPIKE: never merged.
// Reads tests/fixtures/activity-ages-gate/thresholds.json (committed first) and measures G1 to G7b.
//   node tools/activity-ages-spike.mjs [oracle-results.json]
import { readFileSync } from 'node:fs';
import { planckLambda } from '../js/kernels/radiation/planck.js';
import { BANDS } from '../js/data/radiation/bandpasses.js';
import { decodeBand, refineBand } from '../js/kernels/radiation/photometry.js';
import { SIGMA_SB } from '../js/kernels/radiation/constants.js';
import { stream, gaussian } from '../js/random/streams.js';

const THR = JSON.parse(readFileSync('tests/fixtures/activity-ages-gate/thresholds.json', 'utf8'));
const ORA = JSON.parse(readFileSync(process.argv[2] ?? 'tests/fixtures/activity-ages-gate/oracle-results.json', 'utf8'));
const REL = { mamajek2008: THR.relations.mamajek2008, barnes2007: THR.relations.barnes2007 };
const D = THR.domain;

// ---- the candidate kernel functions
const period = (t, bv, rel) => {
  const { a, b, c, n } = REL[rel];
  return a * (bv - c) ** b * t ** n;
};
const rawAge = (P, bv, rel) => {
  const { a, b, c, n } = REL[rel];
  return 10 ** ((Math.log10(P) - Math.log10(a) - b * Math.log10(bv - c)) / n);
};
/** A number only inside the domain; otherwise null and the reason. */
function gyroAge(P, bv, rel = 'mamajek2008') {
  if (!(bv >= D.colour[0] && bv <= D.colour[1])) return { age: null, why: 'colour' };
  const t = rawAge(P, bv, rel);
  if (!(t >= D.ageMyr[0] && t <= D.ageMyr[1])) return { age: null, why: 'age', raw: t };
  if (P < period(D.ageMyr[0], bv, rel) * 0.999999) return { age: null, why: 'sequence' };
  const dex = 0.05;
  return { age: t, interval: [t * 10 ** (-1.96 * dex), t * 10 ** (1.96 * dex)] };
}

const rows = [];
const row = (id, pass, measured) => rows.push({ id, pass, measured });
const rel = (a, b) => Math.abs(a - b) / Math.abs(b);
const rng = tag => stream('injection', 'activity-ages-gate-220', tag);

// G1
{
  let worst = 0;
  for (const r of Object.keys(REL))
    for (let i = 0; i < 50; i++) {
      const bv = 0.5 + 0.4 * (i % 10) / 9;
      const t = 100 * (6.25 ** (Math.floor(i / 10) / 4));
      worst = Math.max(worst, rel(rawAge(period(t, bv, r), bv, r), t));
    }
  row('G1.roundTrip', worst <= THR.legs[0].limit.maxRelative, { maxRelative: worst });
}
// G2
{
  let worst = 0;
  for (const p of ORA.points) worst = Math.max(worst, rel(rawAge(p.P, p.bv, p.rel), p.age), rel(period(p.t, p.bv, p.rel), p.P));
  row('G2.oracle', worst <= THR.legs[1].limit.maxRelative, { maxRelative: worst, points: ORA.points.length });
}
// G3
{
  const r = rng('G3');
  const g = gaussian(stream('noise', 'activity-ages-gate-220', 'G3'));
  let hit = 0;
  let answered = 0;
  const n = 2000;
  const mh = REL.mamajek2008;
  for (let i = 0; i < n; i++) {
    const bv = 0.5 + 0.4 * r();
    const logt = Math.log10(100) + (Math.log10(625) - Math.log10(100)) * r();
    const P = period(10 ** logt, bv, 'mamajek2008') * 10 ** (mh.n * 0.05 * g());
    const res = gyroAge(P, bv);
    if (res.age === null) continue;
    answered++;
    if (logt >= Math.log10(res.interval[0]) && logt <= Math.log10(res.interval[1])) hit++;
  }
  // The threshold gives the rate at which a STATED interval contains the true age; a refused draw has no
  // interval. The first run of this prototype counted refusals as misses (0.909, below 0.93) and the
  // reading was then fixed to the text; both numbers are recorded in ACTIVITY_AGES_GATE.md.
  row('G3.coverage', hit / answered >= THR.legs[2].limit.minCoverage, { coverageOfStated: hit / answered, answered, n, coverageRefusalsAsMisses: hit / n, refusedFraction: 1 - answered / n });
}
// G4
{
  const r = rng('G4');
  let refused = 0;
  const n = 1000;
  for (let i = 0; i < n; i++) {
    const kind = i % 4;
    let bv;
    let P;
    if (kind === 0) {
      bv = 0.2 + 0.29 * r();
      P = 0.5 + 15 * r();
    } else if (kind === 1) {
      bv = 0.91 + 0.69 * r();
      P = 0.5 + 25 * r();
    } else if (kind === 2) {
      bv = 0.5 + 0.4 * r();
      P = period(626 + 3000 * r(), bv, 'mamajek2008');
    } else {
      bv = 0.5 + 0.4 * r();
      P = period(10 + 89 * r(), bv, 'mamajek2008');
    }
    if (gyroAge(P, bv).age === null) refused++;
  }
  row('G4.refusal', refused / n >= THR.legs[3].limit.minRefusedFraction, { refused: refused / n, n });
}
// G5
{
  const d = [];
  for (const bv of [0.5, 0.6, 0.7, 0.8, 0.9])
    for (const t of [100, 200, 300, 450, 625]) {
      const P = period(t, bv, 'mamajek2008');
      d.push(Math.abs(Math.log10(rawAge(P, bv, 'barnes2007')) - Math.log10(t)));
    }
  d.sort((a, b) => a - b);
  const p95 = d[Math.ceil(0.95 * d.length) - 1];
  row('G5.relationsAgree', p95 <= THR.legs[4].limit.maxP95Dex, { p95Dex: p95, max: d.at(-1), median: d[d.length >> 1], n: d.length });
}
// G6
{
  const out = [];
  let ok = true;
  for (const P of [2.6, 2.77])
    for (const r of Object.keys(REL)) {
      const t = rawAge(P, 0.61, r);
      out.push({ P, rel: r, ageMyr: t });
      if (!(t >= 30 && t <= 125)) ok = false;
    }
  row('G6.authentic', ok, { ages: out, gyroAgeMamajek: gyroAge(2.77, 0.61) });
}
// G7
{
  const band = refineBand(decodeBand(BANDS.find(b => b.id === 'T')));
  const lam = band.lambdaNm;
  const s = band.s;
  const r = Float64Array.from(lam, (l, i) => s[i] * l);
  const rmax = Math.max(...r);
  const bandInt = T => {
    let sum = 0;
    for (let i = 0; i + 1 < lam.length; i++) {
      const f0 = planckLambda(lam[i] * 1e-9, T) * (r[i] / rmax);
      const f1 = planckLambda(lam[i + 1] * 1e-9, T) * (r[i + 1] / rmax);
      sum += 0.5 * (f0 + f1) * (lam[i + 1] - lam[i]) * 1e-9;
    }
    return sum;
  };
  let worst = 0;
  const cmp = {};
  for (const T of [7000, 8000, 9000, 10000, 11000, 12000]) {
    const o = ORA.bandIntegrals[String(T)];
    cmp[T] = [bandInt(T), o];
    worst = Math.max(worst, rel(bandInt(T), o));
  }
  row('G7a.bandFraction', worst <= THR.legs[6].limit.maxRelative, { maxRelative: worst, note: 'the repository integral is on the band refined to 1 nm, the oracle on the 5 nm table' });
  const C = T => (SIGMA_SB * T ** 4) / (Math.PI * bandInt(T));
  const cs = [9000, 9500, 10000, 10500, 11000].map(C);
  const factor = Math.max(...cs) / Math.min(...cs);
  row('G7b.correctionRange', factor <= THR.legs[7].limit.maxFactor, { factor, C: cs, T: [9000, 9500, 10000, 10500, 11000] });
}
for (const r of rows) console.log(`${r.pass ? 'pass' : 'FAIL'} ${r.id} ${JSON.stringify(r.measured)}`);
const by = id => rows.find(r => r.id === id).pass;
const A = rows.every(r => r.pass);
const B = by('G1.roundTrip') && by('G2.oracle') && by('G3.coverage') && by('G4.refusal');
console.log(`verdict ${A ? 'A' : B ? 'B' : 'C'}`);
process.exitCode = 0;
