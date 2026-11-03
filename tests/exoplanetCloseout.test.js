// =============================================================================
// The exoplanet closeout investigations (Roadmap III, Prompt 231)
// -----------------------------------------------------------------------------
// Every number a step states is recomputed from what the lesson points at: the
// joint fit's field, the vetting runs, the occurrence survey's grid and efficiency,
// the observing-window planner's nights and weather mask, the dilution panel's
// formula and the eclipse panel's field (all in a child process, because Jest's VM
// runs the simulations several times slower), and the Solar System table behind the
// mass-radius diagram. Each answer is fed to the step's own grader, a wrong one is
// refused, and the Spanish carries the same structure, step for step.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ONE_PLANET_EVERY_METHOD as ONE,
  ONE_PLANET_EVERY_METHOD_ES as ONE_ES,
  ONE_PLANET_EVERY_METHOD_DEEPER as ONE_DEEP,
  ONE_PLANET_EVERY_METHOD_DEEPER_ES as ONE_DEEP_ES,
  WHAT_KINDS_OF_PLANETS_EXIST as KINDS,
  WHAT_KINDS_OF_PLANETS_EXIST_ES as KINDS_ES,
  WHAT_KINDS_OF_PLANETS_EXIST_DEEPER as KINDS_DEEP,
  WHAT_KINDS_OF_PLANETS_EXIST_DEEPER_ES as KINDS_DEEP_ES,
  THE_TRANSIT_THAT_WAS_A_STAR as STAR,
  THE_TRANSIT_THAT_WAS_A_STAR_ES as STAR_ES,
  THE_TRANSIT_THAT_WAS_A_STAR_DEEPER as STAR_DEEP,
  THE_TRANSIT_THAT_WAS_A_STAR_DEEPER_ES as STAR_DEEP_ES,
  PLANNING_A_TRANSIT_CAMPAIGN as PLAN,
  PLANNING_A_TRANSIT_CAMPAIGN_ES as PLAN_ES,
  PLANNING_A_TRANSIT_CAMPAIGN_DEEPER as PLAN_DEEP,
  PLANNING_A_TRANSIT_CAMPAIGN_DEEPER_ES as PLAN_DEEP_ES,
  INSTRUCTOR,
  SHADOWS,
  DEPTH,
  DEPTH_ES,
} from '../js/data/investigations/exoplanet-sequence.js';
import { SEQUENCES } from '../js/data/investigations/sequences.js';
import { DISCOVERY } from '../js/data/investigations/discovery.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const LESSONS = [
  [ONE, ONE_ES, ONE_DEEP, ONE_DEEP_ES],
  [KINDS, KINDS_ES, KINDS_DEEP, KINDS_DEEP_ES],
  [STAR, STAR_ES, STAR_DEEP, STAR_DEEP_ES],
  [PLAN, PLAN_ES, PLAN_DEEP, PLAN_DEEP_ES],
];
const all = LESSONS.flatMap(([l, , d]) => [...l.steps, ...d.steps]);
const step = sid => all.find(s => s.sid === sid);
const near = (x, y, tol) => Math.abs(x - y) <= tol;

// The panels' fields, in a child process.
const SCRIPT = `
const R = ${JSON.stringify(ROOT)};
const imp = f => import(R + '/' + f);
const J = await imp('js/jointField.js');
const V = await imp('js/vettingField.js');
const O = await imp('js/occurrenceField.js');
const S = await imp('js/strategyField.js');
const A = await imp('js/atmosphereWidgets.js');
const out = {};
const pc = x => (100 * x.sigma) / x.value;
const joint = (m, r, c) => J.planetFrom({ massPct: J.SIGMA_STEPS[m], radiusPct: J.SIGMA_STEPS[r], correlation: c });
const p0 = joint(4, 3, 0.5);
const pExact = joint(0, 0, 0.5);
const pWorse = joint(5, 5, 0.5);
out.joint = {
  mean: J.STORED.mean,
  rho: p0.rhoP.value, rhoPct: pc(p0.rhoP), rhoShare: p0.rhoP.share,
  rhoPctExact: pc(pExact.rhoP), rhoPctWorse: pc(pWorse.rhoP), rhoShareWorse: pWorse.rhoP.share,
  mp: p0.Mp.value, mpSigma: p0.Mp.sigma, rp: p0.Rp.value, rpSigma: p0.Rp.sigma,
  rhoSigma: p0.rhoP.sigma, mEarth: p0.MpEarth.value,
  box: J.planetBox({ massPct: 5, radiusPct: 3.5, correlation: 0.5 }),
  rhoSigmaFit: p0.rhoP.sigmaFit,
};
const sys = J.solarSystemPoints();
out.sys = Object.fromEntries(sys.map(p => [p.name, { mass: p.mass, radius: p.radius }]));
const tests = i => V.runOf(i).summary.tests;
out.vet = {};
for (const i of [0, 1, 3, 4, 6]) {
  const t = tests(i);
  out.vet[i] = {
    verdicts: V.verdictsOf(i),
    odd: t.oddEven.odd?.depth, even: t.oddEven.even?.depth, z: t.oddEven.z,
    centroid: t.centroid ? { verdict: t.centroid.verdict, offset: t.centroid.offset && Math.hypot(t.centroid.offset.dx, t.centroid.offset.dy), r: t.centroid.r, x: t.centroid.exclusionRadius } : null,
    truth: V.truthOf(i),
  };
}
const rec = (j, k) => { const r = O.binRecord({ seed: 1, j, k }); return { status: r.status, listed: r.listed, rate: r.rate, upper: r.upperLimit, E: r.E, eff: r.efficiency }; };
out.occ = { smallLong: rec(5, 0), emptyThorough: rec(1, 3), emptyBlind: rec(7, 0), eff: [0, 1, 2, 3, 4].map(k => O.efficiencyRow(k)) };
out.occ.bins = { period: [5, 1, 7, 0].map(j => O.periodRange(j)), radius: [0, 3, 4].map(k => O.radiusRange(k)) };
const w = S.planView({ site: 0, target: 0, nights: 10, pClear: 0.6, seed: 3 });
const m0 = w.nights[0].midnightJd;
const fits = (ws, n, T0 = 1.0, P = 2.0, D = 2.8, base = 1.0) => {
  const rows = [];
  for (let k = 0; k < 40; k++) {
    const tc = m0 + T0 / 24 + k * P;
    for (let i = 0; i < ws.nights.length; i++) {
      const ok = ws.nights[i].usable.intervals.some(x => tc - (D / 2 + base) / 24 >= x.startJd && tc + (D / 2 + base) / 24 <= x.endJd);
      if (ok) rows.push({ night: i + 1, clear: !!ws.clear[i], status: ws.rows[i].status });
    }
  }
  return rows;
};
const north = S.planView({ site: 0, target: 1, nights: 10, pClear: 0.6, seed: 3 });
out.plan = { rows: fits(w), north: fits(north), window0: w.rows[0].windowHours, opens: w.rows[0].opensH, closes: w.rows[0].closesH, nopens: north.rows[0].opensH, ncloses: north.rows[0].closesH, nwin: north.rows[0].windowHours, pClear: w.cfg.pClear };
const E = A.eclipseView({ dataset: 0, tPlanet: 1500, reflected: 1 });
out.eclipse = E.bands.map(b => ({ lo: b.lo, hi: b.hi, bt: b.bt.temperature }));
console.log(JSON.stringify(out));
`;
const F = JSON.parse(
  execFileSync(process.execPath, ['--input-type=module', '-e', SCRIPT], {
    encoding: 'utf8',
    timeout: 240000,
    maxBuffer: 1 << 26,
  })
);
const rho = (m, r) => (5.51 * m) / r ** 3;
const ok = (sid, v) => expect(step(sid).validate(v).level).toBe('ok');
const bad = (sid, v) => expect(step(sid).validate(v).level).toBe('error');
const answers = (sid, value) => {
  const s = step(sid);
  expect(near(value, s.answer, s.tolerance)).toBe(true);
};

describe('One Planet, Every Method: the numbers the steps state', () => {
  const j = F.joint;
  test('the stored fit: a period of 3.52 days, a ratio of 0.118, a depth of 1.40 percent, a/R* of 9.04 and K of 85.6 m/s', () => {
    const [P, k, aRs, , K] = j.mean;
    expect(near(P, 3.52, 0.005)).toBe(true);
    expect(near(k, 0.118, 0.0005)).toBe(true);
    expect(near(aRs, 9.04, 0.005)).toBe(true);
    expect(near(K, 85.6, 0.05)).toBe(true);
    answers('the-depth', 100 * k * k);
    expect(near(100 * 0.1184 ** 2, 1.4, 0.01)).toBe(true);
  });
  test('the density is 0.365 g/cm3 and 13.8 percent at the opening values; the grader refuses 3.65', () => {
    expect(near(j.rho, 0.365, 0.0005)).toBe(true);
    expect(near(j.rhoPct, 13.75, 0.05)).toBe(true);
    ok('read-the-record', { rho: j.rho, sigma: j.rhoSigma });
    bad('read-the-record', { rho: 3.65, sigma: j.rhoPct });
    bad('read-the-record', { rho: j.rho, sigma: 0.5 });
  });
  test('the star is 46 percent of the variance; with the star exact the density is 10.1 percent, and at 8 percent it is 24.1 with the star 82 percent', () => {
    expect(near(j.rhoShare, 0.457, 0.005)).toBe(true);
    answers('what-the-star-costs', j.rhoPctExact);
    answers('a-worse-star', j.rhoPctWorse);
    expect(near(j.rhoShareWorse, 0.823, 0.005)).toBe(true);
    // the two parts add in quadrature: the star's part is 9.3 percent
    expect(
      near(
        Math.hypot(j.rhoPct, -j.rhoPctExact),
        Math.sqrt(j.rhoPct ** 2 + j.rhoPctExact ** 2),
        1e-9
      )
    ).toBe(true);
    expect(near(Math.sqrt(j.rhoPct ** 2 - j.rhoPctExact ** 2), 9.3, 0.05)).toBe(
      true
    );
  });
  test('the record: 0.684 +- 0.025 Jupiter masses (217 Earth masses), 1.325 +- 0.065 radii, 0.365 +- 0.050', () => {
    expect(near(j.mp, 0.684, 0.0005)).toBe(true);
    expect(j.mpSigma.toFixed(3)).toBe('0.024');
    expect(near(j.rp, 1.325, 0.0005)).toBe(true);
    expect(j.rpSigma.toFixed(3)).toBe('0.064');
    expect(j.rhoSigma.toFixed(3)).toBe('0.050');
    expect(near(j.mEarth, 217, 0.5)).toBe(true);
    expect(near(j.box.radius.value, 14.9, 0.05)).toBe(true);
  });
  test('the eclipse: 2094 K in the 3.2 to 4.0 micron band, a bound; the grader range refuses 20,940', () => {
    const b = F.eclipse.find(x => x.lo === 3.2);
    answers('the-eclipse', b.bt);
    const s = step('the-eclipse');
    expect(near(20940, s.answer, s.tolerance)).toBe(false);
  });
  test('the checklist candidate A survives all three tests and the step does not call it a planet', () => {
    expect(F.vet[0].verdicts.overall).toBe('survives');
    expect(
      step('a-dip-is-a-candidate').options[step('a-dip-is-a-candidate').answer]
    ).toMatch(/not validated|survived/);
  });
});

describe('What Kinds of Planets Exist?: the numbers the steps state', () => {
  test('Jupiter is 1.33 g/cm3 from its place, Earth units; the Earth is 5.51', () => {
    const J = F.sys.Jupiter;
    answers('jupiters-density', rho(J.mass, J.radius));
    expect(near(J.mass, 317.8, 0.1)).toBe(true);
    expect(near(J.radius, 10.96, 0.01)).toBe(true);
    expect(near(rho(F.sys.Earth.mass, F.sys.Earth.radius), 5.51, 0.03)).toBe(
      true
    );
    // the hot Jupiter's box is far below rock
    expect(F.joint.rho).toBeLessThan(0.4);
    expect(F.joint.rho).toBeGreaterThan(0.3);
  });
  test('the survey recovers 0.807 of 4 to 8 Earth radii and 0.200 of 0.5 to 1 at 32 to 64 days, a ratio of 4.0', () => {
    const e = F.occ.eff;
    expect(near(e[3][5], 0.807, 0.0005)).toBe(true);
    expect(near(e[0][5], 0.2, 0.001)).toBe(true);
    answers('efficiency-ratio', e[3][5] / e[0][5]);
    expect(F.occ.bins.period[0][0]).toBe(32);
    expect(F.occ.bins.period[0][1]).toBe(64);
    expect(F.occ.bins.radius[0]).toEqual([0.5, 1]);
    expect(F.occ.bins.radius[1]).toEqual([4, 8]);
  });
  test('three planets listed and a rate of 0.35 per star in the small, long-period bin; the grader refuses 30 listed', () => {
    const r = F.occ.smallLong;
    expect(r.status).toBe('ok');
    expect(r.listed).toBe(3);
    ok('a-rate-from-few', { listed: r.listed, rate: r.rate });
    bad('a-rate-from-few', { listed: 30, rate: r.rate });
    expect(near(r.rate, 0.347, 0.001)).toBe(true);
  });
  test('two empty bins: an upper limit of 0.012 at a yield of 242, and not constrained at 1.3', () => {
    const a = F.occ.emptyThorough;
    const b = F.occ.emptyBlind;
    expect(a.status).toBe('upper-limit');
    expect(near(a.E, 242, 0.5)).toBe(true);
    expect(near(a.upper, 0.012, 0.0005)).toBe(true);
    expect(b.status).toBe('not-constrained');
    expect(near(b.E, 1.3, 0.05)).toBe(true);
    expect(F.occ.bins.radius[1]).toEqual([4, 8]);
    expect(F.occ.bins.period[1]).toEqual([2, 4]);
    expect(F.occ.bins.period[2]).toEqual([128, 256]);
  });
  test('the smallest planets fall from 0.636 to 0.084 across the periods; the largest stay above 0.99 out to 32 days', () => {
    const e = F.occ.eff;
    expect(near(e[0][0], 0.636, 0.0005)).toBe(true);
    expect(near(e[0][7], 0.084, 0.0005)).toBe(true);
    for (let j = 0; j <= 4; j++) expect(e[4][j]).toBeGreaterThan(0.99);
  });
});

describe('The Transit That Was a Star: the numbers the steps state', () => {
  test('candidate B: odd 0.93 and even 0.44 percent, 98 sigma, a ratio of 0.47; it is rejected', () => {
    const b = F.vet[1];
    expect(b.verdicts.overall).toBe('rejected');
    expect(near(100 * b.odd, 0.927, 0.0005)).toBe(true);
    expect(near(100 * b.even, 0.436, 0.0005)).toBe(true);
    expect(near(b.z, 98, 1)).toBe(true);
    answers('the-two-depths', b.even / b.odd);
  });
  test('candidate D: equal dips, no frames, survives; candidate E: rejected by a centroid offset of 1.8 arcsec against 0.41; candidate G passes inside 0.30', () => {
    const d = F.vet[3];
    expect(d.verdicts.overall).toBe('survives');
    expect(d.verdicts.centroid).toBe('not-run');
    expect(near(100 * d.odd, 0.715, 0.0005)).toBe(true);
    expect(near(100 * d.even, 0.713, 0.0005)).toBe(true);
    expect(d.truth.blend).toBe(true);
    const e = F.vet[4];
    expect(e.verdicts.overall).toBe('rejected');
    expect(e.centroid.verdict).toBe('fail');
    ok('the-frames', { offset: e.centroid.offset });
    bad('the-frames', { offset: 0.1 });
    expect(near(e.centroid.offset, 1.81, 0.01)).toBe(true);
    expect(near(e.centroid.r, 15.3, 0.1)).toBe(true);
    expect(near(e.centroid.x, 0.41, 0.005)).toBe(true);
    const g = F.vet[6];
    expect(g.verdicts.overall).toBe('survives');
    expect(g.centroid.verdict).toBe('pass');
    expect(near(g.centroid.offset, 0.17, 0.005)).toBe(true);
    expect(near(g.centroid.x, 0.3, 0.005)).toBe(true);
    expect(g.truth.blend).toBe(true);
    expect(near(g.truth.separation, 0.15, 1e-9)).toBe(true);
  });
  test('the dilution panel: 2.0 becomes 2.37 R-earth at one magnitude, 38.7 percent of the light at half a magnitude, 1 percent at 4.2', () => {
    const f = dm => 10 ** (-0.4 * dm);
    answers('the-diluted-radius', 2.0 * Math.sqrt(1 + f(1)));
    expect(near(2.0 * Math.sqrt(1 + f(1)), 2.4, 0.04)).toBe(true);
    answers('the-share-of-the-light', 100 * (f(0.5) / (1 + f(0.5))));
    expect(near(Math.sqrt(1 + f(0.5)), 1.28, 0.005)).toBe(true);
    const dm = -2.5 * Math.log10(1.01 ** 2 - 1);
    answers('how-faint-is-harmless', dm);
    expect(near(Math.sqrt(1 + f(3)), 1.03, 0.002)).toBe(true);
  });
});

describe('Planning a Transit Campaign: the numbers the steps state', () => {
  const p = F.plan;
  test('a 2-day transit fits the window on nights 1, 3, 5, 7 and 9; the weather leaves 1 and 9', () => {
    expect(p.rows.map(r => r.night)).toEqual([1, 3, 5, 7, 9]);
    ok('which-nights', { nights: p.rows.length });
    bad('which-nights', { nights: 10 });
    const clear = p.rows.filter(r => r.clear).length;
    expect(p.rows.filter(r => r.clear).map(r => r.night)).toEqual([1, 9]);
    ok('what-the-weather-left', { observed: clear });
    bad('what-the-weather-left', { observed: 3 });
  });
  test('the first window is 8.81 hours from -4.16 to +4.65 h; a transit with baseline takes 54 percent of it; the expected count is 3.0', () => {
    expect(near(p.window0, 8.81, 0.005)).toBe(true);
    expect(near(p.opens, -4.16, 0.005)).toBe(true);
    expect(near(p.closes, 4.65, 0.005)).toBe(true);
    answers('the-share-of-the-night', (100 * 4.8) / p.window0);
    expect(near(2.8 + 2 * 1.0, 4.8, 1e-9)).toBe(true);
    answers('the-expected-count', p.rows.length * p.pClear);
  });
  test('the northern target is up 1.2 hours on the first night, shorter than the 4.8 a transit with baseline needs, and no night qualifies', () => {
    expect(near(p.nwin, 1.19, 0.01)).toBe(true);
    expect(near(p.nopens, -4.34, 0.01)).toBe(true);
    expect(near(p.ncloses, -3.15, 0.01)).toBe(true);
    expect(p.nwin).toBeLessThan(4.8);
    expect(F.plan.north).toEqual([]);
  });
  test('thirty cycles of a period known to 0.001 days is 0.72 hours', () => {
    answers('the-ephemeris-grows-old', 30 * 0.001 * 24);
    expect(near(60 * 0.001 * 24, 1.44, 1e-9)).toBe(true);
  });
});

describe('the structure, the Spanish and the instructor content', () => {
  test('every numeric answer is graded by its own tolerance and refuses a value ten times off', () => {
    for (const s of all.filter(x => x.kind === 'numeric')) {
      expect(Number.isFinite(s.answer)).toBe(true);
      expect(s.tolerance).toBeGreaterThan(0);
      expect(Math.abs(s.answer * 10 - s.answer)).toBeGreaterThan(s.tolerance);
      expect(s.hints.length).toBeGreaterThan(0);
      expect(Object.keys(s.feedback).sort()).toEqual(
        ['close', 'off', 'wrong-order-of-magnitude'].sort()
      );
    }
  });
  test('every lesson has the Spanish structure of its English, core and deeper', () => {
    for (const [l, es, d, desEs] of LESSONS) {
      expect(es.steps).toHaveLength(l.steps.length);
      expect(desEs.steps).toHaveLength(d.steps.length);
      expect(es.objectives).toHaveLength(l.objectives.length);
      for (const [en, sp] of [
        [l.steps, es.steps],
        [d.steps, desEs.steps],
      ])
        en.forEach((s, i) => {
          if (s.options) expect(sp[i].options).toHaveLength(s.options.length);
          if (s.fields) expect(sp[i].fields).toHaveLength(s.fields.length);
          if (s.hints) expect(sp[i].hints).toHaveLength(s.hints.length);
          if (s.misconceptions)
            expect(sp[i].misconceptions).toHaveLength(s.misconceptions.length);
        });
    }
  });
  test('every step has a unique sid, and a deeper step follows a step of its own lesson', () => {
    for (const [l, , d] of LESSONS) {
      const sids = [...l.steps, ...d.steps].map(s => s.sid);
      expect(new Set(sids).size).toBe(sids.length);
      const core = new Set(l.steps.map(s => s.sid));
      const deeper = new Set(d.steps.map(s => s.sid));
      for (const s of d.steps)
        expect(core.has(s.after) || deeper.has(s.after)).toBe(true);
      expect(l.steps[l.steps.length - 1].type).toBe('read');
    }
  });
  test('the instructor content names real steps and every lesson has its guide, shadow and deeper steps', () => {
    for (const [l] of LESSONS) {
      expect(INSTRUCTOR.content[l.id]).toBeTruthy();
      expect(SHADOWS[l.id]).toBeTruthy();
      expect(DEPTH[l.id]).toBeTruthy();
      expect(DEPTH_ES[l.id]).toBeTruthy();
      const sids = new Set(l.steps.map(s => s.sid));
      for (const f of INSTRUCTOR.flow[l.id]) {
        expect(sids.has(f.from)).toBe(true);
        expect(sids.has(f.to)).toBe(true);
      }
      for (const sid of Object.keys(INSTRUCTOR.expectations[l.id]))
        expect(sids.has(sid)).toBe(true);
      expect(Object.keys(INSTRUCTOR.bands[l.id])).toEqual(l.depths);
    }
  });
  test('every lesson is placed in the exoplanet sequence after its prerequisites, in the tier it was written for', () => {
    const seq = SEQUENCES.find(s => s.id === 'planets-and-exoplanets');
    const ids = seq.lessons.map(i => i.id);
    for (const [l] of LESSONS) {
      expect(ids).toContain(l.id);
      for (const pre of DISCOVERY[l.id].prerequisites)
        expect(ids.indexOf(pre)).toBeLessThan(ids.indexOf(l.id));
    }
    expect(DISCOVERY['what-kinds-of-planets-exist'].courseLevel).toBe('survey');
    expect(DISCOVERY['one-planet-every-method'].courseLevel).toBe('upper');
  });
  test('the gated-out items are reading steps, not invented lessons', () => {
    const atm = KINDS.steps.find(s => s.sid === 'what-an-atmosphere-needs');
    expect(atm.type).toBe('read');
    expect(atm.body).toMatch(/gated out/);
    expect(LESSONS.map(([l]) => l.id)).not.toContain(
      'could-it-hold-an-atmosphere'
    );
  });
});
