// =============================================================================
// The four cosmology investigations, in two languages (Roadmap II, P91)
// -----------------------------------------------------------------------------
// Every number a lesson writes is recomputed from the pipeline the instrument
// draws, in the form the readout prints it, and fed to the step's own validator;
// the two languages carry the same step structure; the instruments' words exist
// in both. The depth steps' expected values are recomputed here too.
// =============================================================================

import { describe, test, expect, beforeAll } from '@jest/globals';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { INVESTIGATIONS } from '../js/data/investigations.js';
import { loadCosmologyData } from '../js/cosmologyData.js';
// The shared module first: Jest's VM loses a module several imports link at once.
import '../js/kernels/cosmology/index.js';
import { EN_COSMOLOGY } from '../js/i18n/en.cosmology.js';
import { ES_COSMOLOGY } from '../js/i18n/es.cosmology.js';
import EXPANDING_DEEP from '../js/data/investigations/depth/the-expanding-universe.js';
import CANDLES_DEEP from '../js/data/investigations/depth/standard-candles.js';
import RUNG_DEEP from '../js/data/investigations/depth/the-first-rung.js';
import SHAPE_DEEP from '../js/data/investigations/depth/the-shape-of-expansion.js';
import WHERE_DEEP from '../js/data/investigations/depth/where-galaxies-live.js';
import ES from './cosmologyInvestigationsEs.js';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fileFetch = async url => ({
  ok: true,
  json: async () =>
    JSON.parse(readFileSync(path.join(REPO, url.slice(1)), 'utf8')),
});
// The instruments fetch their sidecar files by site URL; Node serves them from disk.
globalThis.fetch = fileFetch;
const W = await import('../js/cosmologyWidgets.js');
await W.cosmologyReady;
const { hubbleLawView, diagramView, wedgeView, bestFit, COSMOLOGY_WIDGETS } = W;
let data;
beforeAll(async () => {
  data = await loadCosmologyData(fileFetch);
});

const near = (got, want, tol) =>
  expect(Math.abs(got - want)).toBeLessThanOrEqual(tol);
const IDS = [
  'the-expanding-universe',
  'standard-candles',
  'the-shape-of-expansion',
  'where-galaxies-live',
];
const lesson = id => INVESTIGATIONS.find(l => l.id === id);
const grade = (id, sid, v) =>
  lesson(id)
    .steps.find(s => s.sid === sid)
    .validate(v)?.level;
const deep = (d, sid) => d.steps.find(s => s.sid === sid);

describe('the lessons exist and are wired', () => {
  test.each(IDS)('%s has unique step ids and a tool on every step', id => {
    const l = lesson(id);
    expect(l).toBeTruthy();
    const sids = l.steps.map(s => s.sid);
    expect(new Set(sids).size).toBe(sids.length);
    for (const s of l.steps) expect(s.tool?.id).toBeTruthy();
  });
  test('every tool value names a control of its instrument', () => {
    const controls = Object.fromEntries(
      COSMOLOGY_WIDGETS.map(w => [w.id, w.controls.map(c => c.id)])
    );
    for (const id of IDS)
      for (const s of lesson(id).steps)
        for (const k of Object.keys(s.tool.values))
          expect(controls[s.tool.id]).toContain(k);
    for (const d of [EXPANDING_DEEP, CANDLES_DEEP, SHAPE_DEEP, WHERE_DEEP])
      for (const s of d.steps)
        for (const k of Object.keys(s.tool.values))
          expect(controls[s.tool.id]).toContain(k);
  });
});

describe('the instruments', () => {
  test('every readout lists numbers and no NaN, at the control values the lessons use', () => {
    for (const w of COSMOLOGY_WIDGETS) {
      for (const p of w.presets) {
        const rows = w.readout({ ...p.values });
        expect(rows.length).toBeGreaterThan(3);
        for (const r of rows) {
          expect(String(r.value)).not.toMatch(/NaN|undefined/);
        }
      }
    }
  });
  test('the words exist in both languages with the same keys', () => {
    expect(Object.keys(ES_COSMOLOGY).sort()).toEqual(
      Object.keys(EN_COSMOLOGY).sort()
    );
    for (const v of Object.values(ES_COSMOLOGY))
      expect(v.length).toBeGreaterThan(0);
  });
});

describe('The Expanding Universe', () => {
  const id = 'the-expanding-universe';
  const h = (sample, zmax = 0.1) => hubbleLawView({ sample, zmax }, data);
  test('the steps accept the fit’s own numbers', () => {
    const a = h(0);
    expect(
      grade(id, 'hubbles-slope', {
        h0: a.origin.H0,
        sigma: a.origin.sigmaH0Scaled,
      })
    ).toBe('ok');
    const b = h(1, 0.1);
    expect(grade(id, 'a-modern-sample', { n: b.n, h0: b.origin.H0 })).toBe(
      'ok'
    );
    const c = h(1, 0.5);
    expect(grade(id, 'further-out', { n: c.n, h0: c.origin.H0 })).toBe('ok');
    expect(grade(id, 'hubbles-slope', { h0: 70, sigma: 42 })).toBe('error');
  });
  test('the sentences about the numbers are true', () => {
    const a = h(0);
    expect(a.n).toBe(24);
    near(a.origin.H0, 423.9, 0.2);
    near(a.line.H0, 454.2, 0.5);
    near(a.line.sigmaH0Scaled, 75, 1);
    near(a.origin.H0 / 70, 6.06, 0.01);
    expect(Math.max(...a.y)).toBe(1090);
    expect(Math.max(...a.x)).toBe(2);
    near(Math.abs(a.line.H0 - a.origin.H0), 30, 1);
    const b = h(1, 0.1);
    const c = h(1, 0.5);
    expect([b.n, c.n]).toEqual([197, 955]);
    near(b.origin.H0, 66.33, 0.01);
    near(c.origin.H0, 59.35, 0.01);
    near(b.origin.sigmaH0Scaled, 0.245, 0.002);
    near(c.origin.sigmaH0Scaled, 0.196, 0.002);
    expect(c.origin.H0).toBeLessThan(b.origin.H0);
  });
  test('depth', () => {
    const a = h(0);
    const b = h(1, 0.1);
    const c = h(1, 0.5);
    near(
      deep(EXPANDING_DEEP, 'the-hubble-time').answer,
      977.8 / a.origin.H0,
      0.01
    );
    near(
      deep(EXPANDING_DEEP, 'a-velocity-from-a-distance').answer,
      100 * b.origin.H0,
      5
    );
    near(
      deep(EXPANDING_DEEP, 'the-slopes-error').answer,
      (100 * b.origin.sigmaH0Scaled) / b.origin.H0,
      0.01
    );
    near(
      deep(EXPANDING_DEEP, 'how-many-errors-apart').answer,
      (b.origin.H0 - c.origin.H0) /
        Math.hypot(b.origin.sigmaH0Scaled, c.origin.sigmaH0Scaled),
      0.3
    );
  });
});

describe('Standard Candles', () => {
  const id = 'standard-candles';
  const d = (calib, om = 0.3) =>
    diagramView({ om, h0: 70, calib, view: 0 }, data);
  test('the steps accept the readout’s numbers', () => {
    const f = d(0);
    expect(grade(id, 'the-sample', { n: f.best.n, chi2: f.best.chi2 })).toBe(
      'ok'
    );
    const g = d(0.1);
    expect(
      grade(id, 'a-calibration-error', {
        implied: g.impliedH0,
        pct: g.perTenth,
      })
    ).toBe('ok');
  });
  test('the sentences about the numbers are true', () => {
    const f = d(0);
    expect(f.best.n).toBe(1829);
    expect(f.best.dof).toBe(1827);
    near(f.best.chi2, 1687.9, 0.1);
    near(d(0.1).impliedH0, 66.85, 0.01);
    near(f.perTenth, 4.5, 0.01);
    // The chi-square of the curve does not move with the calibration, nor with H0.
    expect(d(0.1).at.chi2).toBe(f.at.chi2);
    expect(bestFit(data).degeneracy.range).toBeLessThan(1e-9);
    near(0.4605 * 0.051 * 100, 2.35, 0.01);
    // 5 sigma-free arithmetic quoted in the lesson
    near(70 * 10 ** (-0.15 / 5), 65.33, 0.01);
  });
  test('depth', () => {
    near(
      deep(CANDLES_DEEP, 'the-distance-factor').answer,
      100 * (10 ** 0.02 - 1),
      0.005
    );
    near(
      deep(CANDLES_DEEP, 'and-the-hubble-constant').answer,
      d(0.1).perTenth,
      0.005
    );
    near(
      deep(CANDLES_DEEP, 'the-calibration-for-one-percent').answer,
      5 * Math.log10(1.01),
      0.0001
    );
    near(
      deep(CANDLES_DEEP, 'a-five-percent-gap').answer,
      5 * Math.log10(1.05),
      0.001
    );
  });
});

describe('The Shape of Expansion', () => {
  const id = 'the-shape-of-expansion';
  const d = om => diagramView({ om, h0: 70, calib: 0, view: 0 }, data);
  test('the steps accept the readout’s numbers', () => {
    const m = d(1);
    expect(
      grade(id, 'a-matter-only-universe', { chi2: m.at.chi2, delta: m.dchi2 })
    ).toBe('ok');
    const b = bestFit(data).fit;
    expect(
      grade(id, 'the-best-fit', {
        om: b.Om,
        lo: b.omInterval[0],
        hi: b.omInterval[1],
      })
    ).toBe('ok');
    expect(grade(id, 'the-usual-value', { delta: d(0.3).dchi2 })).toBe('ok');
    const e = diagramView({ om: 0.36, h0: 70, calib: 0.15, view: 0 }, data);
    expect(
      grade(id, 'the-degeneracy-check', {
        chi2: e.at.chi2,
        implied: e.impliedH0,
      })
    ).toBe('ok');
    expect(grade(id, 'the-usual-value', { delta: 3 })).toBe('error');
  });
  test('the sentences about the numbers are true', () => {
    const b = bestFit(data).fit;
    near(b.Om, 0.361, 0.0005);
    near(b.omInterval[0], 0.349, 0.0006);
    near(b.omInterval[1], 0.372, 0.0006);
    near(d(0).at.chi2, 3683.7, 0.2);
    near(d(0.3).dchi2, 30.9, 0.05);
    near(Math.sqrt(d(0.3).dchi2), 5.56, 0.01);
    expect(Math.abs(b.Om - 0.352)).toBeLessThan(0.01);
    near(0.017 / ((b.omInterval[1] - b.omInterval[0]) / 2), 1.48, 0.01);
    near(d(0.36).at.chi2, 1687.93, 0.01);
  });
  test('depth', () => {
    const b = bestFit(data).fit;
    near(deep(SHAPE_DEEP, 'acceleration-today').answer, 1.5 * b.Om - 1, 0.002);
    near(
      deep(SHAPE_DEEP, 'the-dark-energy-share').answer,
      100 * (1 - b.Om),
      0.05
    );
    near(
      deep(SHAPE_DEEP, 'how-many-sigma-is-0-3').answer,
      Math.sqrt(d(0.3).dchi2),
      0.01
    );
    near(
      deep(SHAPE_DEEP, 'the-published-interval').answer,
      0.017 / ((b.omInterval[1] - b.omInterval[0]) / 2),
      0.03
    );
  });
});

describe('Where Galaxies Live', () => {
  const id = 'where-galaxies-live';
  const w = (zmax, om = 0.3) => wedgeView({ zmax, om, view: 0 }, data);
  const three = x => Number(x.toPrecision(3));
  test('the steps accept the readout’s numbers', () => {
    const a = w(0.04);
    expect(
      grade(id, 'the-near-sample', { n: a.shown.length, r: three(a.rmax) })
    ).toBe('ok');
    const b = w(0.12);
    expect(
      grade(id, 'the-whole-strip', { n: b.shown.length, r: three(b.rmax) })
    ).toBe('ok');
    expect(grade(id, 'the-clumping', { vmr: three(b.vmr) })).toBe('ok');
    expect(
      grade(id, 'the-thinning', {
        near: three(b.near.density),
        far: three(b.far.density),
      })
    ).toBe('ok');
    expect(grade(id, 'the-clumping', { vmr: 1 })).toBe('error');
  });
  test('the sentences about the numbers are true', () => {
    const b = w(0.12);
    near(b.vmr, 9.79, 0.01);
    near(Math.sqrt(b.vmr), 3.13, 0.01);
    near(b.near.density / b.far.density, 3.26, 0.01);
    expect(b.near.total).toBe(92);
    expect(b.far.total).toBe(217);
    near(w(0.12).shown.length / w(0.04).shown.length, 8.02, 0.01);
    near(w(0.12).rmax / w(0.04).rmax, 2.94, 0.01);
    // The farthest galaxy moves by under 4 percent across the matter densities offered.
    const r = [0.1, 0.5].map(om => w(0.12, om).rmax);
    expect(Math.abs(r[0] - r[1]) / r[0]).toBeLessThan(0.04);
  });
  test('depth', () => {
    const b = w(0.12);
    near(
      deep(WHERE_DEEP, 'the-density-ratio').answer,
      three(b.near.density) / three(b.far.density),
      0.01
    );
    const omega = ((120 * Math.PI) / 180) * ((0.5 * Math.PI) / 180);
    near(
      deep(WHERE_DEEP, 'the-volume-of-a-shell').answer,
      (omega / 3) * (125 ** 3 - 100 ** 3),
      1
    );
    near(
      (b.near.total / ((omega / 3) * (125 ** 3 - 100 ** 3))) * 1e6,
      b.near.density,
      1
    );
    expect(deep(WHERE_DEEP, 'how-much-brighter').answer).toBe((300 / 100) ** 2);
    near(
      deep(WHERE_DEEP, 'that-in-magnitudes').answer,
      2.5 * Math.log10(9),
      0.005
    );
  });
});

describe('The First Rung, the Hubble-constant step', () => {
  test('the answer is 70 times the distance error of 0.051 mag', () => {
    near(
      deep(RUNG_DEEP, 'from-the-rung-to-the-hubble-constant').answer,
      70 * 0.4605 * 0.051,
      0.01
    );
  });
});

describe('the two languages agree', () => {
  test.each(IDS)(
    '%s: the Spanish shadow follows the English step by step',
    id => {
      const en = lesson(id);
      const es = ES.lessons[id];
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
      const dd = ES.depth[id];
      expect(dd.steps.length).toBeGreaterThan(0);
      dd.steps.forEach(s => expect(s.worked?.length).toBeGreaterThan(0));
    }
  );
  test('depth steps do not give the answer away in their feedback', () => {
    for (const d of [EXPANDING_DEEP, CANDLES_DEEP, SHAPE_DEEP, WHERE_DEEP])
      for (const s of d.steps)
        for (const msg of Object.values(s.feedback))
          expect(msg).not.toMatch(
            new RegExp(
              `(^|[^0-9.])${String(s.answer).replace('.', '\\.')}([^0-9]|$)`
            )
          );
  });
});
