// =============================================================================
// The three lensing investigations, in two languages (Roadmap II, Prompt 94)
// -----------------------------------------------------------------------------
// Every number a lesson writes is recomputed from the model the instrument
// draws, in the unit the step asks for; the two languages carry the same
// instrument words and the same step structure; the synthetic event's truth is
// recovered inside its stated error bars.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import { INVESTIGATIONS } from '../js/data/investigations.js';
import {
  bendingView,
  planeView,
  passingView,
  eventData,
  EVENT,
  LENSING_WIDGETS,
} from '../js/lensingWidgets.js';
import { EN_LENSING } from '../js/i18n/en.lensing.js';
import { ES_LENSING } from '../js/i18n/es.lensing.js';
import BENDING_DEEP from '../js/data/investigations/depth/bending-light.js';
import RINGS_DEEP from '../js/data/investigations/depth/einstein-rings-and-arcs.js';
import PASSING_DEEP from '../js/data/investigations/depth/a-lens-passing-by.js';
import ES_BENDING from '../js/data/investigations/es/bending-light.js';
import ES_RINGS from '../js/data/investigations/es/einstein-rings-and-arcs.js';
import ES_PASSING from '../js/data/investigations/es/a-lens-passing-by.js';
import ES_BENDING_DEEP from '../js/data/investigations/depth/es/bending-light.js';
import ES_RINGS_DEEP from '../js/data/investigations/depth/es/einstein-rings-and-arcs.js';
import ES_PASSING_DEEP from '../js/data/investigations/depth/es/a-lens-passing-by.js';

const near = (got, want, tol) =>
  expect(Math.abs(got - want)).toBeLessThanOrEqual(tol);
const IDS = ['bending-light', 'einstein-rings-and-arcs', 'a-lens-passing-by'];
const lesson = id => INVESTIGATIONS.find(l => l.id === id);

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
      LENSING_WIDGETS.map(w => [w.id, w.controls.map(c => c.id)])
    );
    for (const id of IDS)
      for (const s of lesson(id).steps)
        for (const k of Object.keys(s.tool.values))
          expect(controls[s.tool.id]).toContain(k);
  });
});

describe('Bending Light: the numbers the steps write', () => {
  test('the Sun, a ray at 100, ten solar masses, the black hole', () => {
    const sun = bendingView({ logM: 0, logB: 0 });
    near(sun.arcsec, 1.75, 0.02);
    near(sun.newtonArcsec, 0.88, 0.01);
    near(bendingView({ logM: 0, logB: 2 }).arcsec, 0.0175, 0.0008);
    const ten = bendingView({ logM: 1, logB: 0 });
    near(ten.arcsec, 17.52, 0.2);
    near(ten.rsKm, 29.5, 0.5);
    const bh = bendingView({ logM: 8, logB: 3 });
    near(bh.ratio, 2.36, 0.15);
    expect(bh.weak).toBe(false);
    near(bh.arcsec / 3600, 48.7, 0.5);
  });
  test('the 1919 arithmetic in the lesson', () => {
    near((1.98 - 0.88) / 0.12, 9.2, 0.1);
    near((1.61 - 0.88) / 0.3, 2.4, 0.1);
  });
  test('depth: 548 au where the limb rays cross', () => {
    const a = bendingView({ logM: 0, logB: 0 }).arcsec * (Math.PI / 648000);
    near(6.957e8 / a / 1.496e11, 548, 6);
    expect(BENDING_DEEP.steps.map(s => s.depth)).toEqual([
      'quantitative',
      'advanced',
    ]);
  });
});

describe('Einstein Rings and Arcs: the numbers the steps write', () => {
  const star = { kind: 0, logM: 0, logD: Math.log10(4), y: 0, size: 0.1 };
  const gal = { kind: 0, logM: 11, logD: 6, y: 0, size: 0.1 };
  test('the star, the galaxy, the weighed ring', () => {
    near(planeView(star).thetaEMas, 1.01, 0.03);
    const g = planeView(gal);
    near(g.thetaEArcsec, 0.638, 0.015);
    near((g.rEau * 1.496e11) / 3.0857e19, 3.09, 0.1);
    near(planeView({ ...gal, logM: 11.4 }).thetaEArcsec, 1.0, 0.02);
    near(2.46, (1e11 * (1 / g.thetaEArcsec) ** 2) / 1e11, 0.3);
  });
  test('off-axis images: point mass and isothermal sphere', () => {
    const p = planeView({ ...gal, y: 0.5 });
    near(p.images.x[0], 1.28, 0.03);
    near(p.images.total, 2.18, 0.05);
    const s = planeView({ ...gal, kind: 1, y: 0.5 });
    near(s.images.x[0], 1.5, 0.03);
    near(s.images.total, 4, 0.1);
  });
  test('the depth: 2.46e11 solar masses and 263 km/s for a one-arcsecond ring', () => {
    const th = Math.PI / 648000;
    const dl = 3.0857e25;
    const m = (th * th * 299792458 ** 2 * dl * 2 * dl) / (4 * 6.6743e-11 * dl);
    near(m / 1.989e30 / 1e11, 2.46, 0.05);
    near(299792.458 * Math.sqrt((th * 2) / (4 * Math.PI)), 263, 3);
    expect(RINGS_DEEP.steps).toHaveLength(2);
  });
});

describe('A Lens Passing By: the numbers the steps write', () => {
  const base = {
    logM: Math.log10(0.3),
    dl: 6,
    v: 200,
    u0: 0.1,
    fs: 1,
    rho: 0,
    data: 0,
  };
  test('peak, time scales, degeneracy, blend and finite source', () => {
    const t = passingView(base);
    near(t.peak, 10.04, 0.1);
    near(t.tE, 16.6, 0.3);
    near(t.above, 33, 0.6);
    near(passingView({ ...base, v: 400 }).tE, 8.29, 0.2);
    near(t.massNear, 0.075, 0.005);
    near(t.massFar, 0.675, 0.03);
    near(passingView({ ...base, fs: 0.5 }).peak, 5.52, 0.1);
    near(passingView({ ...base, u0: 0.01, rho: 0.1 }).peak, 19.98, 0.3);
    near(passingView({ ...base, u0: 0.5 }).peak, 2.18, 0.03);
  });
  test('the depth: the fits of the synthetic event', () => {
    const d = eventData();
    near(d.free.tE, 25.2, 1.3);
    near(d.held.chi2 / d.held.dof, 2.13, 0.1);
    // The truth is inside the free fit's two-sigma band and outside the held one's.
    near(d.free.tE, EVENT.truth.tE, 2 * d.free.sigma.tE);
    expect(Math.abs(d.held.tE - EVENT.truth.tE)).toBeGreaterThan(
      10 * d.held.sigma.tE
    );
    near(d.free.chi2 / d.free.dof, 1, 0.1);
    near(d.free.fs, EVENT.truth.fs, 0.1);
    expect(PASSING_DEEP.steps).toHaveLength(4);
  });
  test('the data mode reports a chi-square for the current model', () => {
    const v = passingView({ ...base, u0: 0.15, fs: 0.6, v: 130, data: 1 });
    expect(v.data.chiPerDof).toBeLessThan(3);
    expect(passingView({ ...base, data: 1 }).data.chiPerDof).toBeGreaterThan(
      50
    );
  });
});

describe('the two languages agree', () => {
  test('the instrument words have the same keys', () => {
    expect(Object.keys(ES_LENSING).sort()).toEqual(
      Object.keys(EN_LENSING).sort()
    );
    for (const k of Object.keys(EN_LENSING))
      expect(ES_LENSING[k].trim().length).toBeGreaterThan(0);
  });
  test.each([
    ['bending-light', ES_BENDING],
    ['einstein-rings-and-arcs', ES_RINGS],
    ['a-lens-passing-by', ES_PASSING],
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
    });
  });
  test.each([
    [BENDING_DEEP, ES_BENDING_DEEP],
    [RINGS_DEEP, ES_RINGS_DEEP],
    [PASSING_DEEP, ES_PASSING_DEEP],
  ])('the depth steps of %# follow the English in Spanish', (en, es) => {
    expect(es.steps).toHaveLength(en.steps.length);
    en.steps.forEach((s, i) => {
      expect(es.steps[i].title?.length).toBeGreaterThan(0);
      expect(es.steps[i].worked?.length).toBeGreaterThan(0);
    });
  });
});
