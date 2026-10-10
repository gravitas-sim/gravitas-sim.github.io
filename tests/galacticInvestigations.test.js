import './galacticFetch.js';
import { describe, test, expect, beforeAll } from '@jest/globals';
import SUN from '../js/data/investigations/the-suns-motion.js';
import SUN_ES from '../js/data/investigations/es/the-suns-motion.js';
import SUN_D from '../js/data/investigations/depth/the-suns-motion.js';
import SUN_D_ES from '../js/data/investigations/depth/es/the-suns-motion.js';
import DISK from '../js/data/investigations/the-rotating-disk.js';
import DISK_ES from '../js/data/investigations/es/the-rotating-disk.js';
import DISK_D from '../js/data/investigations/depth/the-rotating-disk.js';
import DISK_D_ES from '../js/data/investigations/depth/es/the-rotating-disk.js';
import CL from '../js/data/investigations/cluster-membership.js';
import CL_ES from '../js/data/investigations/es/cluster-membership.js';
import CL_D from '../js/data/investigations/depth/cluster-membership.js';
import CL_D_ES from '../js/data/investigations/depth/es/cluster-membership.js';
import { checkAnswer } from '../js/answerCheck.js';
import {
  GALACTIC_MODELS,
  GALACTIC_VALUES as V,
} from '../tools/authoring/galacticModels.mjs';
import {
  galacticReady,
  GALACTIC_WIDGETS,
  solarView,
  diskView,
  clusterView,
  galacticData,
} from '../js/galacticWidgets.js';
import { SCHONRICH_2010 } from '../js/galactic/model.js';

// =============================================================================
// The galactic investigations (Roadmap II, Prompt 92, part 2): the instruments
// read the kernel, the lessons' validators and literal answers agree with the
// numbers on the screen, and the Spanish follows the English step for step.
// =============================================================================

const step = (lesson, sid) => lesson.steps.find(s => s.sid === sid);
const LESSONS = [
  [SUN, SUN_ES, SUN_D, SUN_D_ES],
  [DISK, DISK_ES, DISK_D, DISK_D_ES],
  [CL, CL_ES, CL_D, CL_D_ES],
];

beforeAll(async () => {
  expect(await galacticReady).toBe(true);
});

describe('the lessons', () => {
  test.each(LESSONS.map(l => [l[0].id, ...l]))(
    '%s: Spanish and depth files follow the English step for step',
    (_id, en, es, deep, deepEs) => {
      expect(es.steps).toHaveLength(en.steps.length);
      en.steps.forEach((s, i) => {
        const t = es.steps[i];
        expect(t.title).toBeTruthy();
        if (s.options) expect(t.options).toHaveLength(s.options.length);
        if (s.fields) expect(t.fields).toHaveLength(s.fields.length);
        if (s.hints) expect(t.hints).toHaveLength(s.hints.length);
      });
      expect(deepEs.steps).toHaveLength(deep.steps.length);
      deep.steps.forEach((s, i) => {
        if (s.options)
          expect(deepEs.steps[i].options).toHaveLength(s.options.length);
      });
      expect(new Set(en.steps.map(s => s.sid)).size).toBe(en.steps.length);
    }
  );

  test('every tool names an instrument the family declares, and every depth step is anchored', () => {
    const ids = GALACTIC_WIDGETS.map(w => w.id);
    for (const [en, , deep] of LESSONS) {
      for (const s of [...en.steps, ...deep.steps])
        if (s.tool) expect(ids).toContain(s.tool.id);
      for (const s of deep.steps)
        expect(
          en.steps.some(c => c.sid === s.after) ||
            deep.steps.some(c => c.sid === s.after)
        ).toBe(true);
    }
  });

  test('a predict step reveals a step that exists', () => {
    for (const [en] of LESSONS)
      for (const s of en.steps.filter(x => x.type === 'predict'))
        expect(step(en, s.reveal)).toBeTruthy();
  });

  test('every depth numeric answer is the model’s value within its tolerance', () => {
    for (const [, , deep] of LESSONS)
      for (const s of deep.steps.filter(x => x.kind === 'numeric')) {
        const key = `${deep.id}/${s.sid}`;
        const v = GALACTIC_MODELS[key].value();
        expect(Math.abs(v - s.answer)).toBeLessThan(s.tolerance);
        expect(checkAnswer(s, s.answer).correct ?? true).toBeTruthy();
      }
  });
});

describe('the Sun’s motion', () => {
  const m = () => galacticData().solar;
  test('the instrument reads the kernel and the lesson accepts its numbers', () => {
    const f = solarView(m(), { maxPc: 100, frame: 0 });
    const s = step(SUN, 'measure-the-sun');
    expect(s.validate({ U: f.U, V: f.V, W: f.W }).level).toBe('ok');
    expect(s.validate({ U: f.V, V: f.U, W: f.W }).level).toBe('error');
    expect(s.validate({ U: f.U })).toBeNull();
    expect(f.n).toBe(489);
  });
  test('three frames: the stars, Stromberg, and Schonrich adopted', () => {
    const a = solarView(m(), { maxPc: 100, frame: 0 });
    const b = solarView(m(), { maxPc: 100, frame: 1 });
    const c = solarView(m(), { maxPc: 100, frame: 2 });
    expect(b.V).toBeCloseTo(a.V - a.lag, 9);
    expect(c.V).toBe(SCHONRICH_2010.V);
    expect(c.U).toBe(a.U);
    const s = step(SUN, 'record-both-frames');
    expect(s.validate({ stromberg: b.V, schonrich: c.V }).level).toBe('ok');
    expect(s.validate({ stromberg: c.V, schonrich: b.V }).level).toBe('error');
    // The sample cannot choose: the two differ by far more than V's own error.
    expect(Math.abs(c.V - b.V)).toBeGreaterThan(4 * a.errV);
  });
  test('the 1,000 pc step and the apex claims', () => {
    const f = solarView(m(), { maxPc: 1000, frame: 0 });
    expect(f.n).toBe(1570);
    expect(
      step(SUN, 'measure-farther').validate({ U: f.U, err: f.errU }).level
    ).toBe('ok');
    const b = solarView(m(), { maxPc: 100, frame: 1 });
    const c = solarView(m(), { maxPc: 100, frame: 2 });
    for (const x of [b, c]) {
      expect(x.apexL).toBeGreaterThan(15);
      expect(x.apexL).toBeLessThan(60);
    }
    expect(Math.abs(b.apexL - c.apexL)).toBeGreaterThan(20);
  });
});

describe('the rotating disk', () => {
  const pts = () => galacticData().rotation;
  test('the Oort fit and the weights', () => {
    const o = V.oort();
    expect(
      step(DISK, 'measure-a-and-b').validate({ A: o.A, B: o.B }).level
    ).toBe('ok');
    expect(
      step(DISK, 'speed-at-the-sun').validate({ v0: 8.3 * o.omega }).level
    ).toBe('ok');
    // The unweighted fit is the failure the lesson shows: wrong sign and 5x the error.
    const f = V.oortFlat();
    expect(f.A).toBeLessThan(5);
    expect(f.errA).toBeGreaterThan(4 * o.errA);
  });
  test('the binned data is a double wave: longitudes 180 degrees apart match in sign', () => {
    const p = V.oort().points;
    const dip = Math.min(...p.map(q => q.y));
    expect(dip).toBeLessThan(-20);
    expect(p[0].y).toBeGreaterThan(dip + 10);
  });
  test('the fits the lesson quotes, and the claims about the halo', () => {
    const stars = diskView(pts(), { fit: 2 });
    const halo = diskView(pts(), { fit: 1 });
    expect(
      step(DISK, 'fit-stars-only').validate({
        reduced: stars.reduced,
        disc: stars.model.discMass / 1e10,
      }).level
    ).toBe('ok');
    expect(
      step(DISK, 'fit-with-a-halo').validate({
        reduced: halo.reduced,
        halo: halo.model.haloVFlat,
      }).level
    ).toBe('ok');
    expect(stars.reduced / halo.reduced).toBeGreaterThan(8);
    const at = V.atSun(halo.model);
    expect(at.visible).toBeGreaterThan(at.halo);
    const far = V.atSun(halo.model);
    expect(far.total).toBeGreaterThan(0);
    // Far out the halo is the larger part (the statement of the lesson).
    const k = Object.fromEntries(
      [20].map(r => [r, require_curve(halo.model, r)])
    );
    expect(k[20].halo).toBeGreaterThan(k[20].visible);
  });
  test('a sliders-only model is the instrument’s own chi-square', () => {
    const f = diskView(pts(), {
      fit: 0,
      mdisk: 10.7,
      rd: 2.6,
      vh: 150,
      rc: 8,
    });
    expect(f.fitted).toBe(false);
    expect(f.reduced).toBeGreaterThan(50);
  });
});

import { curveAt } from '../js/kernels/galactic/index.js';
function require_curve(model, r) {
  return curveAt(r, model);
}

describe('cluster membership', () => {
  const rows = () => galacticData().cluster;
  test('the count, the motion and the threshold', () => {
    const v = clusterView(rows(), { dims: 1, threshold: 0.5 });
    expect(
      step(CL, 'measure-the-cluster').validate({
        pmra: v.pmRa,
        pmdec: v.pmDec,
        members: v.members,
      }).level
    ).toBe('ok');
    const strict = clusterView(rows(), { dims: 1, threshold: 0.99 });
    const loose = clusterView(rows(), { dims: 1, threshold: 0.1 });
    expect(
      step(CL, 'move-the-threshold').validate({
        strict: strict.members,
        loose: loose.members,
      }).level
    ).toBe('ok');
    // Membership is a probability: most are near 0 or 1, a handful between.
    expect(v.uncertain).toBe(4);
    expect(loose.members - strict.members).toBeLessThan(20);
    expect(clusterView(rows(), { dims: 0, threshold: 0.5 }).uncertain).toBe(8);
  });
  test('the distance step', () => {
    const v = clusterView(rows(), { dims: 1, threshold: 0.5 });
    expect(
      step(CL, 'read-the-distance').validate({
        parallax: v.means.mean[2],
        distance: 1 / v.means.mean[2],
      }).level
    ).toBe('ok');
    expect(
      step(CL, 'read-the-distance').validate({ parallax: 2.6, distance: 0.385 })
        .level
    ).toBe('error');
  });
});

describe('the widgets', () => {
  test('each declares controls with labels, presets with labels, and a readout and a draw', () => {
    for (const w of GALACTIC_WIDGETS) {
      expect(w.title).toBeTruthy();
      expect(w.controls.length).toBeGreaterThan(1);
      for (const c of w.controls) expect(c.label).toBeTruthy();
      for (const p of w.presets) expect(p.label).toBeTruthy();
      const values = Object.fromEntries(w.controls.map(c => [c.id, c.value]));
      const rows = w.readout(values);
      expect(rows.length).toBeGreaterThan(4);
      for (const r of rows)
        expect(String(r.value)).not.toMatch(/undefined|NaN/);
      expect(typeof w.draw).toBe('function');
    }
  });
});
