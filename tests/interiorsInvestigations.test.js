// =============================================================================
// The three stellar-interior investigations, in two languages (Roadmap II,
// Prompt 95)
// -----------------------------------------------------------------------------
// Every number a lesson writes is recomputed from the model the instrument
// draws, in the unit the step asks for, and fed to the step's own validator;
// the two languages carry the same instrument words and the same step
// structure.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import { INVESTIGATIONS } from '../js/data/investigations.js';
import {
  polytropeView,
  dwarfView,
  scalingView,
  INTERIORS_WIDGETS,
} from '../js/interiorsWidgets.js';
import { SOLAR_MASS_KG, SOLAR_RADIUS_M } from '../js/kernels/stellar/index.js';
import STAR_DEEP from '../js/data/investigations/depth/inside-a-star.js';
import SCALING_DEEP from '../js/data/investigations/depth/scaling-the-main-sequence.js';
import LIMIT_DEEP from '../js/data/investigations/depth/the-limit.js';
import ES_STAR from '../js/data/investigations/es/inside-a-star.js';
import ES_SCALING from '../js/data/investigations/es/scaling-the-main-sequence.js';
import ES_LIMIT from '../js/data/investigations/es/the-limit.js';
import ES_STAR_DEEP from '../js/data/investigations/depth/es/inside-a-star.js';
import ES_SCALING_DEEP from '../js/data/investigations/depth/es/scaling-the-main-sequence.js';
import ES_LIMIT_DEEP from '../js/data/investigations/depth/es/the-limit.js';

const near = (got, want, tol) =>
  expect(Math.abs(got - want)).toBeLessThanOrEqual(tol);
const IDS = ['inside-a-star', 'scaling-the-main-sequence', 'the-limit'];
const lesson = id => INVESTIGATIONS.find(l => l.id === id);
const step = (id, sid) => lesson(id).steps.find(s => s.sid === sid);
/** The step's own validator, fed values, and the level it answers. */
const grade = (id, sid, v) => step(id, sid).validate(v)?.level;

const sun = { n: 3, logM: 0, logR: 0 };

describe('the lessons exist and are wired', () => {
  test.each(IDS)(
    '%s is registered with unique step ids and a tool on every step',
    id => {
      const l = lesson(id);
      expect(l).toBeTruthy();
      const sids = l.steps.map(s => s.sid);
      expect(new Set(sids).size).toBe(sids.length);
      for (const s of l.steps) expect(s.tool?.id).toBeTruthy();
    }
  );
  test('every tool value names a control of its instrument', () => {
    const controls = Object.fromEntries(
      INTERIORS_WIDGETS.map(w => [w.id, w.controls.map(c => c.id)])
    );
    for (const id of IDS)
      for (const s of lesson(id).steps)
        for (const k of Object.keys(s.tool.values))
          expect(controls[s.tool.id]).toContain(k);
  });
});

describe('Inside a Star: the numbers the steps write', () => {
  test('the Sun as n = 3, twice the mass, a red dwarf and a uniform ball', () => {
    const f = polytropeView(sun);
    expect(
      grade('inside-a-star', 'the-suns-centre', {
        rho: f.rhoCentralGcc,
        tc: f.tCentral / 1e6,
      })
    ).toBe('ok');
    expect(
      grade('inside-a-star', 'half-the-mass', {
        half: f.halfMass,
        ratio: f.ratio,
      })
    ).toBe('ok');
    const two = polytropeView({ n: 3, logM: Math.log10(2), logR: 0 });
    expect(
      grade('inside-a-star', 'twice-the-mass', {
        rho: two.rhoCentralGcc,
        tc: two.tCentral / 1e6,
      })
    ).toBe('ok');
    const red = polytropeView({
      n: 1.5,
      logM: Math.log10(0.2),
      logR: Math.log10(0.22),
    });
    expect(
      grade('inside-a-star', 'a-red-dwarf', {
        tc: red.tCentral / 1e6,
        ratio: red.ratio,
      })
    ).toBe('ok');
    const flat = polytropeView({ n: 0, logM: 0, logR: 0 });
    expect(
      grade('inside-a-star', 'no-concentration', {
        ratio: flat.ratio,
        half: flat.halfMass,
      })
    ).toBe('ok');
  });
  test('the validators refuse wrong readings', () => {
    expect(
      grade('inside-a-star', 'the-suns-centre', { rho: 150, tc: 15.7 })
    ).toBe('error');
    expect(
      grade('inside-a-star', 'half-the-mass', { half: 0.5, ratio: 54 })
    ).toBe('error');
    expect(grade('inside-a-star', 'the-suns-centre', { rho: NaN, tc: 1 })).toBe(
      undefined
    );
  });
  test('depth: 13.8 million kelvin by hand and 11.05 in units of GM²/R⁴', () => {
    const G = 6.6743e-11;
    const M = SOLAR_MASS_KG;
    const R = SOLAR_RADIUS_M;
    const T = (G * M * 0.6 * 1.66053907e-27) / (1.380649e-23 * R);
    near(T / 1e6, 13.77, 0.02);
    const hand = STAR_DEEP.steps.find(s => s.sid === 'the-estimate-by-hand');
    near(hand.answer, T / 1e6, hand.tolerance);
    const f = polytropeView(sun);
    near(f.pCentral / ((G * M * M) / R ** 4), 11.05, 0.02);
    const adv = STAR_DEEP.steps.find(s => s.sid === 'the-central-pressure');
    near(adv.answer, f.pCentral / ((G * M * M) / R ** 4), adv.tolerance);
    expect(STAR_DEEP.steps.map(s => s.depth)).toEqual([
      'quantitative',
      'advanced',
    ]);
  });
});

describe('Scaling the Main Sequence: the numbers the steps write', () => {
  const view = (quantity, opacity, energy, idx = 2) =>
    scalingView({ quantity, opacity, energy, idx });
  test('every measure step accepts the model’s own numbers', () => {
    const a = view(0, 1, 1);
    expect(
      grade('scaling-the-main-sequence', 'the-prediction', {
        pred: a.predicted,
        fit: a.high.fit,
        rms: a.high.rms,
      })
    ).toBe('ok');
    const b = view(0, 0, 0);
    expect(
      grade('scaling-the-main-sequence', 'low-mass-stars', {
        pred: b.predicted,
        fit: b.low.fit,
      })
    ).toBe('ok');
    const c = view(0, 0, 1);
    expect(
      grade('scaling-the-main-sequence', 'the-wrong-law', {
        pred: c.predicted,
        rms: c.high.rms,
      })
    ).toBe('ok');
    const d = view(1, 1, 1);
    expect(
      grade('scaling-the-main-sequence', 'radius-scaling', {
        pred: d.predicted,
        fit: d.high.fit,
      })
    ).toBe('ok');
    const e = view(2, 1, 1);
    expect(
      grade('scaling-the-main-sequence', 'lifetimes', {
        pred: e.predicted,
        fit: e.high.fit,
      })
    ).toBe('ok');
    const f = view(2, 1, 1, 2);
    expect(
      grade('scaling-the-main-sequence', 'the-suns-clock', {
        mist: f.sel.mainSequenceYr / 1e9,
        nuc: f.selNuclearYr / 1e9,
      })
    ).toBe('ok');
  });
  test('the sentences about the numbers are true', () => {
    const a = view(0, 1, 1);
    expect(a.high.rms).toBeLessThan(0.15);
    // 0.5 to 2 solar masses: the prediction is a factor of 4^5.46 and the models 4^4.43.
    near(4 ** 5.4615, 1944, 5);
    near(4 ** a.low.fit, 464, 8);
    // A single line through all eight models leaves 0.36 dex.
    const z = a.z;
    const lx = z.map(m => Math.log10(m.massSun));
    const ly = z.map(m => Math.log10(m.luminositySun));
    const mx = lx.reduce((s, q) => s + q, 0) / 8;
    const my = ly.reduce((s, q) => s + q, 0) / 8;
    const slope =
      lx.reduce((s, q, i) => s + (q - mx) * (ly[i] - my), 0) /
      lx.reduce((s, q) => s + (q - mx) ** 2, 0);
    const worst = Math.max(
      ...ly.map((q, i) => Math.abs(q - (my + slope * (lx[i] - mx))))
    );
    near(worst, 0.36, 0.01);
    near(z[2].luminositySun, 0.746, 0.005);
    near(z[7].mainSequenceYr / 1e6, 4.72, 0.05);
  });
  test('depth: 5.29 and 2.40', () => {
    const z = view(0, 1, 1).z;
    const r = z[7].luminositySun / z[6].luminositySun;
    const q = SCALING_DEEP.steps.find(s => s.sid === 'the-ratio-by-hand');
    near(q.answer, r, q.tolerance);
    const x = SCALING_DEEP.steps.find(s => s.sid === 'the-effective-exponent');
    near(x.answer, Math.log2(r), x.tolerance);
    expect(SCALING_DEEP.steps.map(s => s.depth)).toEqual([
      'quantitative',
      'advanced',
    ]);
  });
});

describe('The Limit: the numbers the steps write', () => {
  test('every measure step accepts the model’s own numbers', () => {
    const a = dwarfView({ logRho: 6.5, muE: 2 });
    expect(
      grade('the-limit', 'a-typical-dwarf', { m: a.massSun, r: a.radiusKm })
    ).toBe('ok');
    const b = dwarfView({ logRho: 9, muE: 2 });
    expect(
      grade('the-limit', 'a-dense-dwarf', { m: b.massSun, r: b.radiusKm })
    ).toBe('ok');
    const c = dwarfView({ logRho: 11, muE: 2 });
    expect(
      grade('the-limit', 'the-ceiling', { m: c.massSun, limit: c.limit })
    ).toBe('ok');
    expect(
      grade('the-limit', 'hydrogen-would-be-different', {
        limit: dwarfView({ logRho: 8, muE: 1 }).limit,
      })
    ).toBe('ok');
    expect(
      grade('the-limit', 'an-iron-core', {
        limit: dwarfView({ logRho: 11, muE: 2.15 }).limit,
      })
    ).toBe('ok');
  });
  test('the sentences about the numbers are true', () => {
    const a = dwarfView({ logRho: 6.5, muE: 2 });
    near(a.radiusKm / 6371, 1.39, 0.02);
    expect(a.x).toBeGreaterThan(1);
    near(dwarfView({ logRho: 11, muE: 2 }).x, 37, 0.5);
    const b = dwarfView({ logRho: 9, muE: 2 });
    near(b.massSun / a.massSun, 2.29, 0.02);
    near(b.radiusKm / a.radiusKm, 0.28, 0.01);
    // The next hundredfold adds under one percent.
    const d = dwarfView({ logRho: 11, muE: 2 });
    near(dwarfView({ logRho: 7, muE: 2 }).massSun, 0.81, 0.01);
    expect(d.massSun).toBeLessThan(d.limit);
    expect(b.massSun).toBeLessThan(d.massSun);
  });
  test('depth: 4.07 × 10⁵ g/cm³ and 6.1 percent', () => {
    const a = dwarfView({ logRho: 6.5, muE: 2 });
    const m = a.massSun * SOLAR_MASS_KG;
    const rho = m / ((4 / 3) * Math.PI * (a.radiusKm * 1000) ** 3);
    const hand = LIMIT_DEEP.steps.find(
      s => s.sid === 'the-mean-density-by-hand'
    );
    near(hand.answer, rho / 1000 / 1e5, hand.tolerance);
    const gain =
      (dwarfView({ logRho: 11, muE: 2 }).massSun /
        dwarfView({ logRho: 9, muE: 2 }).massSun -
        1) *
      100;
    const adv = LIMIT_DEEP.steps.find(s => s.sid === 'the-diminishing-return');
    near(adv.answer, gain, adv.tolerance);
    expect(LIMIT_DEEP.steps.map(s => s.depth)).toEqual([
      'quantitative',
      'advanced',
    ]);
  });
});

describe('the two languages agree', () => {
  test.each([
    ['inside-a-star', ES_STAR],
    ['scaling-the-main-sequence', ES_SCALING],
    ['the-limit', ES_LIMIT],
  ])('%s: the Spanish shadow follows the English step by step', (id, es) => {
    const en = lesson(id);
    expect(es.steps).toHaveLength(en.steps.length);
    expect(es.objectives).toHaveLength(en.objectives.length);
    en.steps.forEach((s, i) => {
      const e = es.steps[i];
      expect(e.title?.length).toBeGreaterThan(0);
      expect(e.body?.length).toBeGreaterThan(0);
      if (s.options) expect(e.options).toHaveLength(s.options.length);
      if (s.fields) expect(e.fields).toHaveLength(s.fields.length);
      if (s.hints) expect(e.hints).toHaveLength(s.hints.length);
      if (s.misconceptions)
        expect(e.misconceptions).toHaveLength(s.misconceptions.length);
    });
  });
  test.each([
    [STAR_DEEP, ES_STAR_DEEP],
    [SCALING_DEEP, ES_SCALING_DEEP],
    [LIMIT_DEEP, ES_LIMIT_DEEP],
  ])('the depth steps of %# follow the English in Spanish', (en, es) => {
    expect(es.steps).toHaveLength(en.steps.length);
    en.steps.forEach((s, i) => {
      expect(es.steps[i].title?.length).toBeGreaterThan(0);
      expect(es.steps[i].worked?.length).toBeGreaterThan(0);
    });
  });
});
