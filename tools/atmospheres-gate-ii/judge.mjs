/* global console, process */
// The harness of the atmospheres gate II (Prompt 201 spike, never merged). It runs the kernel on the oracle's seeded inputs,
// compares with the oracle's truth, and judges each check against thresholds.json exactly as committed.
// usage: node judge.mjs oracle.json thresholds.json out.json [p1.json bytes.json]
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import * as K from '../../js/kernels/atmospheres/index.js';

const [, , oraclePath, thrPath, outPath, p1Path, bytesPath] = process.argv;
const O = JSON.parse(readFileSync(oraclePath, 'utf8'));
const T = JSON.parse(readFileSync(thrPath, 'utf8'));
const lim = id => T.checks.find(c => c.id === id).limits;
const checks = {};
const rec = (id, status, measured, note) => (checks[id] = { status, measured, ...(note ? { note } : {}) });
const rel = (a, b) => Math.abs(a / b - 1);

// seeded generator (mulberry32) and Box-Muller normal
function mulberry32(a) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rngFor = tag => {
  const u = mulberry32(T.seeds.harness + [...tag].reduce((s, c) => s + c.charCodeAt(0), 0));
  return {
    u,
    n: () => Math.sqrt(-2 * Math.log(1 - u())) * Math.cos(2 * Math.PI * u()),
  };
};
const MICRON = 1e-6;
const ok = (id, pass, measured, note, ruling) => rec(id, pass ? 'pass' : 'fail', measured, note);

// ----------------------------------------------------------------------------- U1
{
  const dir = 'js/kernels/atmospheres/';
  const files = ['quadrature.js', 'emission.js', 'phase.js', 'transmission.js', 'bands.js'];
  const src = files.map(f => readFileSync(dir + f, 'utf8')).join('\n');
  const copies = [/1\.380649/, /6\.62607015/, /299792458/, /1\.66053/, /5\.67037/, /1\.495978/, /6\.957e8/i, /7\.1492e7/i].filter(r => r.test(src)).map(String);
  const c = O.constants;
  const worst = Math.max(
    rel(K.K_BOLTZMANN, c.k),
    rel(K.H_PLANCK, c.h),
    rel(K.C_LIGHT, c.c),
    rel(K.ATOMIC_MASS, c.mu),
    rel(K.SIGMA_SB, c.sigma)
  );
  ok('U1.constants', copies.length === 0 && worst <= lim('U1.constants').relMax, { copies, worstRel: worst });
}

// ----------------------------------------------------------------------------- E1
{
  const l = lim('E1.planck');
  let worst = 0;
  for (const p of O.E1.points) worst = Math.max(worst, rel(K.bandRadiance(p.l1, p.l2, p.T), p.B));
  let full = 0;
  for (const p of O.E1.fullBand) full = Math.max(full, rel(K.bandRadiance(p.l1, p.l2, p.T), p.expected));
  let rj = 0;
  for (const Tk of [300, 1000, 3000]) {
    const lam = 1e7 / Tk * MICRON; // lambda T = 1e7 micron K
    const w = 0.01 * lam;
    const exact = K.bandRadiance(lam - w / 2, lam + w / 2, Tk);
    const rjv = (2 * K.C_LIGHT * K.K_BOLTZMANN * Tk) / lam ** 4;
    rj = Math.max(rj, rel(exact, rjv));
  }
  let mono = true;
  for (const [a, b] of [[0.5, 0.6], [1, 2], [4, 5], [10, 20], [25, 30]]) {
    let prev = 0;
    for (let Tk = 200; Tk <= 10000; Tk *= 1.2) {
      const v = K.bandRadiance(a * MICRON, b * MICRON, Tk);
      if (!(v > prev)) mono = false;
      prev = v;
    }
  }
  const pass = worst <= l.relErrMax && full <= l.fullBandRelMax && rj <= l.rayleighJeansRelMax && mono && O.E1.points.length >= l.points;
  ok('E1.planck', pass, { relErrMax: worst, points: O.E1.points.length, fullBandRelMax: full, rayleighJeansRel: rj, monotone: mono });
}

// ----------------------------------------------------------------------------- E2
{
  const l = lim('E2.eclipse');
  let worst = 0;
  for (const p of O.E2) {
    const r = K.eclipseDepth({ radiusRatio: p.k, tPlanet: p.Tp, tStar: p.Ts, band: [p.l1, p.l2], geometricAlbedo: p.Ag, semiMajorOverRp: p.aR });
    worst = Math.max(worst, rel(r.depth, p.depth));
  }
  const same = K.eclipseDepth({ radiusRatio: 0.1, tPlanet: 5000, tStar: 5000, band: [3e-6, 4e-6] });
  const equalLimit = rel(same.depth, 0.01);
  const th = K.eclipseDepth({ radiusRatio: 0.1, tPlanet: 1500, tStar: 5800, band: [3e-6, 4e-6], geometricAlbedo: 0, semiMajorOverRp: 9 });
  const wr = K.eclipseDepth({ radiusRatio: 0.1, tPlanet: 1500, tStar: 5800, band: [3e-6, 4e-6], geometricAlbedo: 0.3, semiMajorOverRp: 9 });
  const additive = Math.abs(wr.depth - th.depth - 0.3 / 81) / (0.3 / 81);
  let mono = true;
  let prev = 0;
  for (let Tp = 500; Tp <= 3000; Tp += 50) {
    const d = K.eclipseDepth({ radiusRatio: 0.1, tPlanet: Tp, tStar: 5800, band: [3e-6, 4e-6] }).depth;
    if (!(d > prev)) mono = false;
    prev = d;
  }
  ok('E2.eclipse', worst <= l.relErrMax && equalLimit <= 1e-12 && additive <= 1e-9 && mono && O.E2.length >= l.points, { relErrMax: worst, points: O.E2.length, equalTemperatureLimitRel: equalLimit, additiveRel: additive, monotone: mono });
}

// ----------------------------------------------------------------------------- E3
{
  const l = lim('E3.slab');
  let worst = 0;
  for (const p of O.E3) worst = Math.max(worst, rel(K.slabFlux(p.Bd, p.Bs, p.tau), p.F));
  const Bd = K.bandRadiance(3e-6, 4e-6, 1500);
  const Bs = K.bandRadiance(3e-6, 4e-6, 1500 / 2 ** 0.25);
  const zero = K.slabFlux(Bd, Bs, 0) === Bd;
  const thick = rel(K.slabFlux(Bd, Bs, 60), Bs);
  let mono = true;
  let prev = Infinity;
  for (let t = 1e-3; t < 100; t *= 1.3) {
    const v = K.slabFlux(Bd, Bs, t);
    if (!(v <= prev)) mono = false;
    prev = v;
  }
  const viaEclipse = K.eclipseDepth({ radiusRatio: 0.1, tPlanet: 1500, tStar: 5800, band: [3e-6, 4e-6], bandTau: 1e4 }).thermal;
  const direct = (0.01 * Bs) / K.bandRadiance(3e-6, 4e-6, 5800);
  const skin = rel(viaEclipse, direct);
  ok('E3.slab', worst <= l.relErrMax && zero && thick <= 1e-9 && mono && skin <= 1e-12 && O.E3.length >= l.points, { relErrMax: worst, points: O.E3.length, tauZeroExact: zero, thickRel: thick, monotone: mono, skinRel: skin });
}

// ----------------------------------------------------------------------------- E4
{
  const l = lim('E4.lambert');
  let worst = 0;
  O.E4.alpha.forEach((a, i) => (worst = Math.max(worst, Math.abs(K.lambertPhase(a) - O.E4.phi[i]))));
  const ends = Math.max(Math.abs(K.lambertPhase(0) - 1), Math.abs(K.lambertPhase(Math.PI / 2) - 1 / Math.PI), Math.abs(K.lambertPhase(Math.PI)));
  const integral = 2 * K.composite(a => K.lambertPhase(a) * Math.sin(a), 0, Math.PI, 0.25);
  const pint = Math.abs(integral - 1.5);
  const round = Math.abs(K.geometricFromBond(K.bondFromGeometric(0.37)) - 0.37);
  let mono = true;
  for (let i = 1; i < 400; i++) if (!(K.lambertPhase((i * Math.PI) / 399) < K.lambertPhase(((i - 1) * Math.PI) / 399))) mono = false;
  ok('E4.lambert', worst <= l.absErrMax && ends <= 1e-12 && pint <= l.phaseIntegralAbsMax && round <= 1e-12 && mono && O.E4.alpha.length === l.angles, { absErrMax: worst, angles: O.E4.alpha.length, endpointsAbs: ends, phaseIntegralAbs: pint, roundTripAbs: round, monotone: mono });
}

// ----------------------------------------------------------------------------- E5 and N1
const G = O.phaseGrid;
{
  const l = lim('E5.albedo');
  const r = rngFor('E5');
  let covered = 0;
  let flagged = 0;
  for (let i = 0; i < l.draws; i++) {
    const ag = 0.05 + 0.55 * r.u();
    const aR = 5 + 15 * r.u();
    const k = 1 / aR ** 2;
    const sigma = l.noiseFraction * 0.3 * k;
    const flux = G.lambert.map(p => ag * k * p + sigma * r.n());
    const f = K.fitAlbedo({ alphas: G.alpha, flux, sigma, semiMajorOverRp: aR });
    if (f.flagged) flagged++;
    else if (f.lo <= ag && ag <= f.hi) covered++;
  }
  const cov = covered / l.draws;
  ok('E5.albedo', cov >= l.coverageRange[0] && cov <= l.coverageRange[1], { coverage: cov, flaggedFraction: flagged / l.draws, draws: l.draws, note: 'a flagged fit returns no interval and counts as not covered' });
}
{
  const l = lim('N1.misfit');
  const r = rngFor('N1');
  const rate = shape => {
    let f = 0;
    for (let i = 0; i < l.draws; i++) {
      const aR = 5 + 15 * r.u();
      const k = 1 / aR ** 2;
      const sigma = l.noiseFraction * 0.3 * k;
      const flux = G[shape].map(p => 0.3 * k * p + sigma * r.n());
      if (K.fitAlbedo({ alphas: G.alpha, flux, sigma, semiMajorOverRp: aR }).flagged) f++;
    }
    return f / l.draws;
  };
  const power = Object.fromEntries(l.truths.map(t => [t, rate(t)]));
  const falseFlag = rate('lambert');
  ok('N1.misfit', Object.values(power).every(p => p >= l.powerMin) && falseFlag <= l.falseFlagMax, { power, falseFlag, draws: l.draws });
}

// ----------------------------------------------------------------------------- E6
{
  const l = lim('E6.btemp');
  const r = rngFor('E6');
  let covered = 0;
  let refused = 0;
  let round = 0;
  for (const p of O.E6) {
    const base = { radiusRatio: p.k, tStar: p.Ts, band: [p.l1, p.l2], semiMajorOverRp: 1000 };
    const clean = K.brightnessTemperature({ ...base, depth: p.depth });
    round = Math.max(round, rel(clean.temperature, p.Tp));
    const noisy = p.depth * (1 + l.noiseFraction * r.n());
    const b = K.brightnessTemperature({ ...base, depth: noisy, sigma: l.noiseFraction * p.depth });
    if (b.refused) refused++;
    else if (b.lo <= p.Tp && p.Tp <= b.hi) covered++;
  }
  const cov = covered / O.E6.length;
  ok('E6.btemp', cov >= l.coverageRange[0] && cov <= l.coverageRange[1] && round <= l.roundTripRelMax, { coverage: cov, draws: O.E6.length, refused, roundTripRelMax: round, note: 'a/R_p set to 1000 so the reflected-light rule (N2) does not apply here' });
}

// ----------------------------------------------------------------------------- N2
{
  const l = lim('N2.reflected');
  const r = rngFor('N2');
  let right = 0;
  let total = 0;
  const base = { radiusRatio: 0.1, tStar: 5800, band: [3.6e-6, 4.5e-6] };
  for (let i = 0; i < l.casesEachSide; i++) {
    const aR = 5 + 15 * r.u();
    const refl = 0.3 / aR ** 2;
    const above = K.brightnessTemperature({ ...base, semiMajorOverRp: aR, depth: 10 * refl * (1.02 + 2 * r.u()) });
    const below = K.brightnessTemperature({ ...base, semiMajorOverRp: aR, depth: i < 5 ? -1e-4 * r.u() : 10 * refl * (0.98 - 0.9 * r.u()) });
    total += 2;
    if (!above.refused && above.temperature > 0) right++;
    if (below.refused && below.temperature === undefined) right++;
  }
  ok('N2.reflected', right === total, { decidedAsTheRuleSays: right, of: total });
}

// ----------------------------------------------------------------------------- transmission helpers
const BANDS = K.SYNTHETIC_BANDS;
const inputsOf = a => ({ radius: a.Rp, starRadius: a.Rs, meanMolecularWeight: a.mu, gravity: a.g, pressure: a.P0, abundance: a.X });
const depthOf = (a, band, Tk = a.T) => K.bandDepth({ ...inputsOf(a), temperature: Tk, band });

// ----------------------------------------------------------------------------- X1
{
  const l = lim('X1.analytic');
  let worst = 0;
  O.X1.tau0.forEach((t, i) => (worst = Math.max(worst, rel(K.frozenLimb(t), O.X1.integral[i]))));
  const a = { Rp: 9.7e7, Rs: 8.04e8, T: 1400, mu: 2.3, g: 9.3, P0: 1e5, X: 1e-3 };
  let mono = true;
  let prev = 0;
  const slopes = [];
  const zOf = s => depthOf(a, { sigma: [s], weight: [1] }).zEff;
  for (let s = 1e-28; s < 1e-24; s *= 2) {
    const d = depthOf(a, { sigma: [s], weight: [1] }).depth;
    if (!(d > prev)) mono = false;
    prev = d;
  }
  const H = depthOf(a, { sigma: [1e-26], weight: [1] }).scaleHeight;
  for (const s of [1e-27, 1e-26, 1e-25]) slopes.push((zOf(s * Math.E) - zOf(s)) / H);
  ok('X1.analytic', worst <= l.relErrMax && mono, { relErrMax: worst, values: O.X1.tau0.length, monotone: mono, slopeInScaleHeightsPerE: slopes, note: 'the slope is reported, not bounded: the committed text gives it no tolerance' });
}

// ----------------------------------------------------------------------------- X2
{
  const l = lim('X2.numerics');
  let sRel = 0;
  let refusedS = 0;
  for (const a of O.X2single) {
    const r = depthOf(a, { sigma: [a.sigma], weight: [1] });
    if (r.refused) {
      refusedS++;
      continue;
    }
    const floor = (a.Rp / a.Rs) ** 2;
    sRel = Math.max(sRel, Math.abs((r.depth - floor) / (a.delta - floor) - 1));
  }
  const perBand = {};
  let bRel = 0;
  let refusedB = 0;
  for (const a of O.X2bands) {
    for (const n of Object.keys(BANDS)) {
      const r = depthOf(a, BANDS[n]);
      if (r.refused) {
        refusedB++;
        continue;
      }
      const floor = (a.Rp / a.Rs) ** 2;
      const e = Math.abs((r.depth - floor) / (a.delta[n] - floor) - 1);
      perBand[n] = Math.max(perBand[n] ?? 0, e);
      bRel = Math.max(bRel, e);
    }
  }
  ok('X2.numerics', sRel <= l.singleRelMax && bRel <= l.bandRelMax && O.X2single.length >= l.singleDraws, { singleRelMax: sRel, bandRelMax: bRel, perBand, singleRefused: refusedS, bandPairsRefused: refusedB, singleDraws: O.X2single.length });
}

// ----------------------------------------------------------------------------- X3
{
  const l = lim('X3.regime');
  let n = 0;
  let refused = 0;
  let worstRatio = 0;
  let failures = 0;
  const perBand = {};
  const reasons = {};
  const byZ = [];
  for (const a of O.X3) {
    for (const nm of Object.keys(BANDS)) {
      const r = depthOf(a, BANDS[nm]);
      if (r.refused) {
        refused++;
        reasons[r.reason.slice(0, 40)] = (reasons[r.reason.slice(0, 40)] ?? 0) + 1;
        continue;
      }
      n++;
      const floor = (a.Rp / a.Rs) ** 2;
      const err = Math.abs((r.depth - floor) / (a.delta[nm] - floor) - 1);
      const bound = Math.max(l.absoluteFloor, l.factor * (r.zEff / a.Rp));
      const ratio = err / bound;
      worstRatio = Math.max(worstRatio, ratio);
      perBand[nm] = Math.max(perBand[nm] ?? 0, ratio);
      if (ratio > 1) failures++;
      byZ.push([r.zEff / a.Rp, err]);
    }
  }
  byZ.sort((x, y) => x[0] - y[0]);
  const worstAbs = byZ.reduce((m, [, e]) => Math.max(m, e), 0);
  const worstRel = byZ.reduce((m, [z, e]) => Math.max(m, e / Math.max(z, 1e-12)), 0);
  ok('X3.regime', failures === 0 && n > 0, { draws: O.X3.length, pairsAccepted: n, pairsRefused: refused, refusedReasons: reasons, failures, worstErrorOverBound: worstRatio, worstPerBand: perBand, worstAbsoluteError: worstAbs, worstErrorOverZeffRp: worstRel });
}

// ----------------------------------------------------------------------------- X4
{
  const l = lim('X4.coverage');
  const r = rngFor('X4');
  const sigma = l.noisePpm * 1e-6;
  let covered = 0;
  let returned = 0;
  let notReturned = 0;
  const bias = [];
  for (const a of O.X4.draws) {
    const diff = a.strong - a.weak + sigma * r.n() - sigma * r.n();
    const res = K.inferTemperature({ ...inputsOf(a), difference: diff, sigma, bands: { strong: BANDS.strong, weak: BANDS.weak } });
    if (res.temperature === undefined) {
      notReturned++;
      continue;
    }
    returned++;
    bias.push((res.temperature - a.T) / a.T);
    if (res.lo <= a.T && a.T <= res.hi) covered++;
  }
  bias.sort((x, y) => x - y);
  const cov = covered / O.X4.draws.length;
  ok('X4.coverage', cov >= l.coverageRange[0] && cov <= l.coverageRange[1], {
    coverage: cov,
    draws: O.X4.draws.length,
    candidatesOracleTried: O.X4.candidates,
    returned,
    notReturned,
    biasMedian: bias[Math.floor(bias.length / 2)],
    bias05: bias[Math.floor(bias.length * 0.05)],
    bias95: bias[Math.floor(bias.length * 0.95)],
    note: 'draws kept by the oracle only if the true strong-minus-weak difference is at least 10 noise standard deviations; not-returned counts as not covered',
  });
}

// ----------------------------------------------------------------------------- X5
{
  const l = lim('X5.refusals');
  const base = { radius: 9.7e7, starRadius: 8.04e8, temperature: 1400, meanMolecularWeight: 2.3, gravity: 9.3, pressure: 1e5, abundance: 1e-3, band: BANDS.strong };
  const outside = [
    { temperature: 3500, gravity: 2.5, meanMolecularWeight: 2.0 }, // H/Rp above 0.01
    { temperature: 3400, gravity: 3 },
    { temperature: 3000, gravity: 4, meanMolecularWeight: 2.2 },
    { temperature: 2900, gravity: 5, meanMolecularWeight: 2.0 },
    { temperature: 250 },
    { temperature: 4000 },
    { meanMolecularWeight: 1.5 },
    { meanMolecularWeight: 60 },
    { gravity: 1.5 },
    { gravity: 60 },
    { abundance: 1, pressure: 1e7 }, // z_eff above a tenth of the radius
    { radius: 2e7, temperature: 1500, gravity: 9.3 }, // H/Rp above 0.01 from a small planet
  ].map(o => K.bandDepth({ ...base, ...o }));
  const r = rngFor('X5in');
  const inside = Array.from({ length: l.insideCases }, () =>
    K.bandDepth({ ...base, temperature: 900 + 700 * r.u(), gravity: 8 + 10 * r.u(), abundance: 1e-5 * 10 ** (2 * r.u()), pressure: 1e4 * 10 ** (1.5 * r.u()), band: BANDS.weak })
  );
  const refusedOutside = outside.filter(x => x.refused && x.depth === undefined).length;
  const refusedInside = inside.filter(x => x.refused).length;
  const rn = rngFor('X5');
  const sigma = 30e-6;
  const bands = { strong: BANDS.strong, weak: BANDS.weak };
  const nominal = { radius: 9.7e7, starRadius: 8.04e8, meanMolecularWeight: 2.3, gravity: 9.3, pressure: 1e5, abundance: 1e-3 };
  let nullReturned = 0;
  let powerReturned = 0;
  for (let i = 0; i < l.draws; i++) {
    const noise = sigma * (rn.n() - rn.n());
    if (K.inferTemperature({ ...nominal, difference: noise, sigma, bands }).temperature !== undefined) nullReturned++;
    const noise2 = sigma * (rn.n() - rn.n());
    if (K.inferTemperature({ ...nominal, difference: 6 * Math.SQRT2 * sigma + noise2, sigma, bands }).temperature !== undefined) powerReturned++;
  }
  ok('X5.refusals', refusedOutside === l.outsideCases && refusedInside === 0 && nullReturned / l.draws <= l.nullReturnMax && powerReturned / l.draws >= l.powerMin, { refusedOutside, outside: l.outsideCases, refusedInside, nullReturnedFraction: nullReturned / l.draws, powerReturnedFraction: powerReturned / l.draws, draws: l.draws, outsideReasons: outside.map(x => x.reason ?? null) });
}

// ----------------------------------------------------------------------------- X6
{
  const l = lim('X6.cloud');
  const r = rngFor('X6');
  const sigma = 30e-6;
  let nc = 0;
  let number = 0;
  let refusedOther = 0;
  const trueDiff = [];
  for (const a of O.X6) {
    const d = a.strong - a.weak;
    trueDiff.push(d / sigma);
    const res = K.inferTemperature({ ...inputsOf(a), difference: d + sigma * (r.n() - r.n()), sigma, bands: { strong: BANDS.strong, weak: BANDS.weak } });
    if (res.notConstrained) nc++;
    else if (res.temperature !== undefined) number++;
    else refusedOther++;
  }
  trueDiff.sort((x, y) => x - y);
  ok('X6.cloud', nc / O.X6.length >= l.notConstrainedMin, { notConstrainedFraction: nc / O.X6.length, returnedANumber: number, refusedOther, draws: O.X6.length, trueDifferenceInSigma: { median: trueDiff[250], p95: trueDiff[475], max: trueDiff[499] }, note: 'the deck is above both bands effective heights (4 H above the strong band); the committed text said above the weak band, which does not make the bands equal' });
}

// ----------------------------------------------------------------------------- Z1 (reported)
{
  const sigma = 1e-9;
  const bands = { strong: BANDS.strong, weak: BANDS.weak };
  const q = arr => {
    const s = [...arr].sort((x, y) => x - y);
    return s.length ? { n: s.length, p05: s[Math.floor(s.length * 0.05)], median: s[Math.floor(s.length / 2)], p95: s[Math.floor(s.length * 0.95)] } : { n: 0 };
  };
  const run = (a, diff, mod = {}) => {
    const res = K.inferTemperature({ ...inputsOf(a), ...mod, difference: diff, sigma, bands });
    return res.temperature === undefined ? { none: res.notConstrained ? 'notConstrained' : 'refused' } : { bias: (res.temperature - a.T) / a.T };
  };
  const cases = { xp0x3: [], 'gradient+10': [], 'gradient-10': [], deckStrongOnly: [] };
  const none = { xp0x3: 0, 'gradient+10': 0, 'gradient-10': 0, deckStrongOnly: 0 };
  for (const a of O.Z1) {
    const base = a.strong - a.weak;
    const push = (k, res) => (res.bias === undefined ? none[k]++ : cases[k].push(res.bias));
    push('xp0x3', run(a, base, { abundance: a.X * 3 }));
    push('gradient+10', run(a, a['gradient+10'].strong - a['gradient+10'].weak));
    push('gradient-10', run(a, a['gradient-10'].strong - a['gradient-10'].weak));
    if (a.deckBetween !== undefined) push('deckStrongOnly', run(a, a.deck_strong - a.deck_weak));
  }
  rec('Z1.reported', 'pass', { relativeTemperatureBias: Object.fromEntries(Object.entries(cases).map(([k, v]) => [k, { ...q(v), noEstimate: none[k] }])), draws: O.Z1.length }, 'reported, not asserted; a bias is relative: (T estimated - T true) / T true');
}

// ----------------------------------------------------------------------------- R1
{
  const base = { radius: 9.7e7, starRadius: 8.04e8, temperature: 1400, meanMolecularWeight: 2.3, gravity: 9.3, pressure: 1e5, abundance: 1e-3, band: BANDS.strong };
  const ec = { radiusRatio: 0.12, tPlanet: 1500, tStar: 5800, band: [3.6e-6, 4.5e-6], geometricAlbedo: 0.2, semiMajorOverRp: 9 };
  const hostile = [
    ...['radius', 'starRadius', 'temperature', 'meanMolecularWeight', 'gravity', 'pressure', 'abundance'].flatMap(k => [() => K.bandDepth({ ...base, [k]: 0 }), () => K.bandDepth({ ...base, [k]: NaN }), () => K.bandDepth({ ...base, [k]: -1 })]).slice(0, 14),
    () => K.bandDepth({ ...base, band: { sigma: [-1e-26], weight: [1] } }),
    () => K.bandDepth({ ...base, band: { sigma: [1e-26, 2e-26], weight: [0.5] } }),
    () => K.bandDepth({ ...base, band: { sigma: [1e-26, 2e-26], weight: [0.7, 0.7] } }),
    () => K.bandDepth({ ...base, band: undefined }),
    () => K.bandDepth({ ...base, temperature: 5000 }),
    () => K.bandDepth({ ...base, abundance: Infinity }),
    () => K.eclipseDepth({ ...ec, radiusRatio: 0 }),
    () => K.eclipseDepth({ ...ec, tPlanet: -5 }),
    () => K.eclipseDepth({ ...ec, tStar: Infinity }),
    () => K.eclipseDepth({ ...ec, band: [4e-6, 3e-6] }),
    () => K.eclipseDepth({ ...ec, band: [-1, 3e-6] }),
    () => K.eclipseDepth({ ...ec, geometricAlbedo: 1.2 }),
    () => K.eclipseDepth({ ...ec, semiMajorOverRp: 0.5 }),
    () => K.eclipseDepth({ ...ec, bandTau: -1 }),
    () => K.brightnessTemperature({ ...ec, depth: 0 }),
    () => K.brightnessTemperature({ ...ec, depth: -1e-3 }),
    () => K.phaseCurve({ albedo: 1.5, semiMajorOverRp: 9, alphas: [0.1] }),
    () => K.phaseCurve({ albedo: -0.1, semiMajorOverRp: 9, alphas: [0.1] }),
    () => K.phaseCurve({ albedo: 0.3, semiMajorOverRp: 9, alphas: [4] }),
    () => K.phaseCurve({ albedo: 0.3, semiMajorOverRp: 9, alphas: [-0.1] }),
    () => K.phaseCurve({ albedo: 0.3, semiMajorOverRp: 0.9, alphas: [0.1] }),
    () => K.fitAlbedo({ alphas: [0.1, 0.2, 0.3], flux: [1, 1, 1], sigma: 0, semiMajorOverRp: 9 }),
    () => K.fitAlbedo({ alphas: [0.1, 0.2], flux: [1, 1], sigma: 1, semiMajorOverRp: 9 }),
    () => K.fitAlbedo({ alphas: [0.1, 0.2, 0.3], flux: [1, 1], sigma: 1, semiMajorOverRp: 9 }),
    () => K.fitAlbedo({ alphas: [0.1, 0.2, 0.3], flux: [1, 1, 1], sigma: 1, semiMajorOverRp: 0.5 }),
    () => K.inferTemperature({ difference: 1e-3, sigma: -1, bands: { strong: BANDS.strong, weak: BANDS.weak }, ...inputsOfNominal() }),
  ];
  function inputsOfNominal() {
    const { band, ...rest } = base;
    void band;
    delete rest.temperature;
    return rest;
  }
  const fieldsWithNumbers = ['depth', 'excess', 'temperature', 'albedo', 'flux', 'thermal', 'zEff'];
  let refusing = 0;
  const bad = [];
  hostile.forEach((f, i) => {
    let r;
    try {
      r = f();
    } catch (e) {
      bad.push(`${i}: threw ${e.message}`);
      return;
    }
    const clean = r.refused === true && typeof r.reason === 'string' && r.reason.length > 5 && fieldsWithNumbers.every(k => r[k] === undefined);
    if (clean) refusing++;
    else bad.push(`${i}: ${JSON.stringify(r).slice(0, 80)}`);
  });
  const good = {
    tx: K.bandDepth({ ...base, band: BANDS.weak }),
    ec: K.eclipseDepth(ec),
    ph: K.fitAlbedo({ alphas: G.alpha, flux: G.lambert.map(p => (0.3 * p) / 81), sigma: 1e-5, semiMajorOverRp: 9 }),
  };
  const need = { tx: ['isothermal', 'one absorber', 'no scattering', 'no clouds', 'band-integrated'], ec: ['uniform blackbody', 'one skin'], ph: ['Lambert'] };
  const words = {};
  let wordsOk = true;
  for (const k of Object.keys(good)) {
    const txt = (good[k].assumes ?? []).join(' | ');
    words[k] = need[k].map(w => [w, txt.includes(w)]);
    if (!need[k].every(w => txt.includes(w)) || !good[k].model) wordsOk = false;
  }
  ok('R1.refusals', hostile.length >= lim('R1.refusals').hostileInputs && refusing === hostile.length && wordsOk, { hostileInputs: hostile.length, refusing, bad, assumesWords: words });
}

// ----------------------------------------------------------------------------- C1 (the claim rule)
{
  const l = lim('C1.claims');
  const cr = T.claimRule;
  const rx = [...cr.forbidden.en, ...cr.forbidden.es].map(s => new RegExp(s, cr.flags ?? 'i'));
  const flagged = s => rx.some(r => r.test(s));
  const badCaught = cr.badControls.filter(flagged).length;
  const permittedPass = cr.permittedControls.filter(s => !flagged(s)).length;
  const files = [
    'js/i18n/en.atmospheres.js',
    'js/i18n/es.atmospheres.js',
    ...['', 'es/', 'depth/', 'depth/es/'].map(d => `js/data/investigations/${d}atmosphere-sequence.js`),
    ...['', 'es/', 'depth/', 'depth/es/'].flatMap(d => ['why-venus-is-hot', 'two-greenhouse-models'].map(n => `js/data/investigations/${d}${n}.js`)),
    'js/atmosphereWidgets.js',
  ];
  const violations = [];
  const scanned = [];
  for (const f of files) {
    let text;
    try {
      text = readFileSync(f, 'utf8');
    } catch {
      continue;
    }
    scanned.push(f);
    const flat = text.replace(/'\s*\+?\s*\n\s*'/g, '').replace(/\s+/g, ' ');
    for (const r of rx) {
      const m = flat.match(r);
      if (m) violations.push({ file: f, match: m[0] });
    }
  }
  void readdirSync;
  ok('C1.claims', badCaught === l.badControls && permittedPass === l.permittedControls && violations.length <= l.violationsMax, { badCaught, of: cr.badControls.length, permittedPass, permitted: cr.permittedControls.length, filesScanned: scanned.length, violations });
}

// ----------------------------------------------------------------------------- not measured, and merged measurements
rec('XR.reference', 'not-measured', null, 'data request Q2: no cited radiative-transfer code and no pinned fixture exist; nothing was downloaded');
rec('XT.table', 'not-measured', null, 'data request Q1: no pinned cross-section table exists; nothing was downloaded; the synthetic absorber stands in only for the numerics and names no molecule');
rec('D1.transmission', 'not-measured', null, 'data request Q3');
rec('D2.eclipse', 'not-measured', null, 'data request Q4');
rec('D3.phase', 'not-measured', null, 'data request Q5');

if (p1Path) {
  const p = JSON.parse(readFileSync(p1Path, 'utf8'));
  const l = lim('P1.plot');
  const worst = Math.max(...p.plots.map(x => Math.max(x.vertexWorstXPx, x.vertexWorstYPx)));
  ok('P1.plot', p.ok && worst <= l.vertexPxMax && p.plots.length === l.plots && p.noOwnDrawing, { worstVertexPx: worst, plots: p.plots.map(x => x.widget), noOwnDrawing: p.noOwnDrawing, legendToggled: p.plots.map(x => x.toggled), jsdomOnly: true });
}
if (bytesPath) {
  const b = JSON.parse(readFileSync(bytesPath, 'utf8'));
  for (const id of Object.keys(b)) checks[id] = b[id];
}

writeFileSync(outPath, JSON.stringify({ checks }, null, 2));
const summary = Object.fromEntries(Object.entries(checks).map(([k, v]) => [k, v.status]));
console.log(JSON.stringify(summary, null, 1));
