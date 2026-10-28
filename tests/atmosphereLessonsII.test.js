// =============================================================================
// How Hot Is the Day Side? and Phases and Albedo (Roadmap III, Prompt 202)
// -----------------------------------------------------------------------------
// Every number a step states is recomputed here from the kernel and its synthetic
// data: each validator accepts the kernel's value and refuses a wrong one, the
// predictions point at their answer, the Spanish is step for step with the
// English, and both lessons say their data are synthetic and that no published
// table was compared. The claim rule runs over their strings in
// tests/atmospheresII.test.js (C1).
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import { INVESTIGATIONS } from '../js/data/investigations.js';
import { withAllDepths } from '../js/investigations/depthAll.js';
import * as K from '../js/kernels/atmospheres/index.js';
import ES_LESSONS from '../js/data/investigations/es/atmosphere-sequence.js';
import ES_DEEP from '../js/data/investigations/depth/es/atmosphere-sequence.js';

const MICRON = 1e-6;
const IDS = ['how-hot-is-the-day-side', 'phases-and-albedo'];
const lesson = id => withAllDepths(INVESTIGATIONS.find(l => l.id === id));
const step = (id, sid) => lesson(id).steps.find(s => s.sid === sid);

/** The validator accepts `good` and refuses `bad`, both with a message. */
function holds(id, sid, good, bad) {
  const s = step(id, sid);
  expect(s.validate(good).level).toBe('ok');
  const r = s.validate(bad);
  expect(r.level).toBe('error');
  expect(r.message.length).toBeGreaterThan(20);
  expect(s.validate({})).toBeNull();
}

const eclipse = K.syntheticEclipse();
const planetY = K.syntheticEclipse({ absorbingBand: 'C' });
const bt = (e, i, aR = 1e6) => {
  const b = e.bands[i];
  return K.brightnessTemperature({
    radiusRatio: e.truth.radiusRatio,
    tStar: e.truth.tStar,
    band: [b.lo * MICRON, b.hi * MICRON],
    semiMajorOverRp: aR,
    depth: e.depthsPpm[i] * 1e-6,
    sigma: e.sigma * 1e-6,
  });
};
const chi2 = (e, T) =>
  e.bands.reduce((sum, b, i) => {
    const m =
      1e6 *
      K.eclipseDepth({
        radiusRatio: e.truth.radiusRatio,
        tPlanet: T,
        tStar: e.truth.tStar,
        band: [b.lo * MICRON, b.hi * MICRON],
      }).depth;
    return sum + ((e.depthsPpm[i] - m) / e.sigma) ** 2;
  }, 0);
const phaseP = K.syntheticPhase();
const phaseQ = K.syntheticPhase({ shape: 'lommel-seeliger' });
const fit = d =>
  K.fitAlbedo({
    alphas: d.alphas,
    flux: d.fluxPpm.map(x => x * 1e-6),
    sigma: d.sigma * 1e-6,
    semiMajorOverRp: d.truth.semiMajorOverRp,
  });
const chiAlbedo = (d, A) =>
  d.alphas.reduce(
    (s, a, i) =>
      s +
      ((d.fluxPpm[i] -
        (1e6 * A * K.lambertPhase(a)) / d.truth.semiMajorOverRp ** 2) /
        d.sigma) **
        2,
    0
  );

describe('both lessons are registered whole', () => {
  test('three depths, deeper steps of both kinds, Spanish step for step, and each says its data are synthetic', () => {
    for (const id of IDS) {
      const l = INVESTIGATIONS.find(x => x.id === id);
      expect(l).toBeTruthy();
      expect(l.depths).toEqual(['core', 'quantitative', 'advanced']);
      const full = lesson(id);
      expect(full.steps.some(s => s.depth === 'quantitative')).toBe(true);
      expect(full.steps.some(s => s.depth === 'advanced')).toBe(true);
      expect(ES_LESSONS[id].steps).toHaveLength(l.steps.length);
      expect(ES_DEEP[id].steps).toHaveLength(
        full.steps.filter(s => s.depth).length
      );
      expect(l.steps[0].body).toMatch(/synthetic/);
      expect(l.steps[0].body).toMatch(/No published table was compared/);
      expect(l.steps.at(-1).body.replace(/\s+/g, ' ')).toMatch(
        /no published table was compared/
      );
      expect(ES_LESSONS[id].steps[0].body).toMatch(
        /No se comparó ninguna tabla publicada/
      );
      const sids = full.steps.map(s => s.sid);
      expect(new Set(sids).size).toBe(sids.length);
    }
  });
});

describe('How Hot Is the Day Side?: every stated number from the kernel', () => {
  const ID = IDS[0];
  test('the brightness temperatures of Planet X, the scatter, and the least chi-square', () => {
    const t = [0, 1, 2, 3].map(i => bt(eclipse, i));
    expect(t[2].temperature).toBeCloseTo(2094, -1);
    expect(Math.round(t[2].lo)).toBe(2063);
    expect(Math.round(t[2].hi)).toBe(2125);
    expect(Math.max(...t.map(x => x.temperature))).toBeGreaterThan(2170);
    expect(Math.min(...t.map(x => x.temperature))).toBeLessThan(2068);
    let best = [Infinity, 0];
    for (let T = 800; T <= 3000; T += 10) {
      const c = chi2(eclipse, T);
      if (c < best[0]) best = [c, T];
    }
    expect(best[1]).toBe(2090);
    expect(best[0]).toBeCloseTo(6.5, 1);
    holds(ID, 'one-band', { t: 2094 }, { t: 2300 });
    holds(ID, 'four-bands', { hi: 2171, lo: 2067 }, { hi: 2100, lo: 2000 });
    holds(ID, 'match-by-hand', { t: 2090, chi: 6.5 }, { t: 1500, chi: 3000 });
  });

  test('reflected light of albedo 0.3 at 8 planet radii exceeds the largest depth, so every band refuses', () => {
    expect((0.3 / 64) * 1e6).toBeCloseTo(4687.5, 1);
    expect(Math.max(...eclipse.depthsPpm)).toBeCloseTo(2816.9, 1);
    for (let i = 0; i < 4; i++) expect(bt(eclipse, i, 8).refused).toBe(true);
    holds(ID, 'reflected-light', { n: 0 }, { n: 4 });
  });

  test('Planet Y: band C reads 314 K cooler, the other three bands are unchanged, and no single blackbody fits it', () => {
    const x = bt(eclipse, 2).temperature;
    const y = bt(planetY, 2).temperature;
    expect(Math.round(x) - Math.round(y)).toBe(314);
    for (const i of [0, 1, 3])
      expect(bt(planetY, i).temperature).toBe(bt(eclipse, i).temperature);
    holds(ID, 'planet-y', { drop: 314 }, { drop: 50 });
    let best = Infinity;
    for (let T = 800; T <= 3000; T += 10)
      best = Math.min(best, chi2(planetY, T));
    expect(best).toBeCloseTo(230.6, 0);
    holds(ID, 'planet-y-misfit', { chi: 231 }, { chi: 6 });
  });

  test('three of the four 95 percent intervals contain the manifest’s 2,100 K', () => {
    expect(eclipse.truth.tPlanet).toBe(2100);
    const inside = [0, 1, 2, 3].filter(i => {
      const r = bt(eclipse, i);
      return r.lo <= 2100 && 2100 <= r.hi;
    });
    expect(inside).toHaveLength(3);
    expect(bt(eclipse, 0).lo).toBeCloseTo(2104, -1);
    holds(ID, 'the-manifest', { n: 3 }, { n: 4 });
  });

  test('the prediction points at its answer: Planet Y’s band C reads lower', () => {
    const p = step(ID, 'planet-y-predict');
    expect(p.reveal).toBe('planet-y');
    expect(p.options[p.answer]).toMatch(/^lower/);
    expect(bt(planetY, 2).temperature).toBeLessThan(bt(eclipse, 2).temperature);
  });

  test('the two questions point at their answers and each wrong option has a reply', () => {
    for (const sid of ['why-the-scatter', 'what-a-dip-says']) {
      const s = step(ID, sid);
      expect(s.options[s.answer]).toBeTruthy();
      expect(s.misconceptions.every(m => m.option !== s.answer)).toBe(true);
      expect(s.misconceptions.length).toBeGreaterThan(0);
    }
  });
});

describe('Phases and Albedo: every stated number from the kernel', () => {
  const ID = IDS[1];
  test('the albedo that fits Planet P, its interval, its Bond albedo, and the least chi-square by hand', () => {
    const f = fit(phaseP);
    expect(f.albedo).toBeCloseTo(0.35, 2);
    expect(f.bond).toBeCloseTo(0.52, 2);
    expect(f.bond / f.albedo).toBeCloseTo(1.5, 12);
    expect(f.lo).toBeCloseTo(0.34, 2);
    expect(f.hi).toBeCloseTo(0.36, 2);
    expect(f.chi2).toBeCloseTo(31.2, 1);
    expect(f.dof).toBe(23);
    expect(chiAlbedo(phaseP, 0.3)).toBeCloseTo(186, 0);
    expect(chiAlbedo(phaseP, 0.4)).toBeCloseTo(191, 0);
    holds(
      ID,
      'full-phase-albedo',
      { ag: 0.35, ab: 0.52 },
      { ag: 0.2, ab: 0.52 }
    );
    holds(ID, 'match-by-hand', { ag: 0.35, chi: 31.2 }, { ag: 0.1, chi: 900 });
    holds(ID, 'the-interval', { lo: 0.34, hi: 0.36 }, { lo: 0.2, hi: 0.4 });
  });

  test('Planet Q is flagged: 82 for 23 degrees of freedom against a limit near 41.7, and no albedo is returned', () => {
    const f = fit(phaseQ);
    expect(f.flagged).toBe(true);
    expect(f.albedo).toBeUndefined();
    expect(f.chi2).toBeCloseTo(82, 0);
    expect(f.dof).toBe(23);
    expect(K.chi2Critical(23)).toBeCloseTo(41.7, 1);
    holds(ID, 'planet-q', { chi: 82, dof: 23 }, { chi: 30, dof: 23 });
  });

  test('the Lommel-Seeliger phase integral is 1.64, 9 percent above the Lambert 3/2', () => {
    const q =
      2 *
      K.composite(
        a => K.lommelSeeligerPhase(a) * Math.sin(a),
        0,
        Math.PI,
        0.25
      );
    expect(q).toBeCloseTo(1.64, 2);
    expect(q / 1.5).toBeCloseTo(1.09, 2);
  });

  test('the question and the prediction point at their answers', () => {
    const q = step(ID, 'why-three-halves');
    expect(q.options[q.answer]).toBeTruthy();
    expect(q.misconceptions.length).toBe(q.options.length - 1);
    const p = step(ID, 'planet-q-predict');
    expect(p.reveal).toBe('planet-q');
    expect(p.options[p.answer]).toBeTruthy();
  });
});
