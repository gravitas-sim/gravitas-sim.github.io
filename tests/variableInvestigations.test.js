// =============================================================================
// The four variable-star investigations, in two languages (Roadmap II, P96)
// -----------------------------------------------------------------------------
// Every number a lesson writes is recomputed from the pipeline the instrument
// draws, in the unit the step asks for, and fed to the step's own validator; the
// two languages carry the same step structure.
// =============================================================================

import { describe, test, expect, beforeAll } from '@jest/globals';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { INVESTIGATIONS } from '../js/data/investigations.js';
import { loadVariablesData, ANCHORS } from '../js/variablesData.js';
import {
  analysisOf,
  leavittView,
  classView,
  VARIABLES_WIDGETS,
} from '../js/variableWidgets.js';
import { wesenheitResidual } from '../js/kernels/variables/index.js';
import { LAW } from '../js/data/radiation/extinction.js';
import BEAT_DEEP from '../js/data/investigations/depth/the-beat-of-a-star.js';
import LAW_DEEP from '../js/data/investigations/depth/leavitts-law.js';
import RUNG_DEEP from '../js/data/investigations/depth/the-first-rung.js';
import KIND_DEEP from '../js/data/investigations/depth/which-kind-of-variable.js';
import ES from './variableInvestigationsEs.js';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fileFetch = async url => ({
  ok: true,
  json: async () =>
    JSON.parse(readFileSync(path.join(REPO, url.slice(1)), 'utf8')),
});
let data;
beforeAll(async () => {
  data = await loadVariablesData(fileFetch);
});

const near = (got, want, tol) =>
  expect(Math.abs(got - want)).toBeLessThanOrEqual(tol);
const IDS = [
  'the-beat-of-a-star',
  'leavitts-law',
  'the-first-rung',
  'which-kind-of-variable',
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
      VARIABLES_WIDGETS.map(w => [w.id, w.controls.map(c => c.id)])
    );
    for (const id of IDS)
      for (const s of lesson(id).steps)
        for (const k of Object.keys(s.tool.values))
          expect(controls[s.tool.id]).toContain(k);
  });
});

describe('The Beat of a Star', () => {
  test('the steps accept the pipeline’s own numbers', () => {
    const a = analysisOf(0, data);
    const id = 'the-beat-of-a-star';
    expect(
      grade(id, 'the-first-period', {
        peak: a.found.period,
        width: a.found.width,
      })
    ).toBe('ok');
    expect(
      grade(id, 'fold-it', {
        period: a.refined.period,
        error: a.boot.sigma,
        amp: a.stats.amplitude,
      })
    ).toBe('ok');
    expect(
      grade(id, 'fold-on-twice-the-period', { fold: 2 * a.refined.period })
    ).toBe('ok');
    expect(
      grade(id, 'a-slightly-wrong-period', { fold: 1.02 * a.refined.period })
    ).toBe('ok');
    const e = analysisOf(1, data);
    expect(
      grade(id, 'a-second-star', {
        period: e.refined.period,
        error: e.boot.sigma,
        cycles: e.cycles,
      })
    ).toBe('ok');
    const n = analysisOf(2, data);
    expect(
      grade(id, 'once-a-night', { peak: n.found.period, width: n.found.width })
    ).toBe('ok');
    expect(
      grade(id, 'the-false-periods', {
        a1: a.aliases[0].period,
        a2: a.aliases[1].period,
      })
    ).toBe('ok');
    expect(grade(id, 'the-first-period', { peak: 1.97, width: 0.2 })).toBe(
      'error'
    );
  });
  test('the sentences about the numbers are true', () => {
    const a = analysisOf(0, data);
    const e = analysisOf(1, data);
    const n = analysisOf(2, data);
    expect(a.t.length).toBe(1799);
    near(a.found.baseline, 26, 0.5);
    near(a.refined.period * 24, 15.85, 0.02);
    near(Math.abs(a.refined.period - 0.66042001) / 0.66042, 0, 3e-5);
    near(e.boot.sigma / e.refined.period, 0.004, 0.0006);
    near(a.boot.sigma / a.refined.period, 0.0002, 0.00005);
    near(Math.abs(e.refined.period - 7.176641) / 7.176641, 0.007, 0.001);
    expect(n.t.length).toBe(178);
    // The nightly search peaks at an alias, three times the true period,
    // and the true period is a peak almost as high.
    near(n.found.period / a.refined.period, 3, 0.05);
    const at = P => {
      let best = 0;
      n.found.grid.forEach((g, i) => {
        if (Math.abs(g / P - 1) < 0.08)
          best = Math.max(best, n.found.spectrum[i]);
      });
      return best;
    };
    const top = n.found.power;
    expect(at(0.6604) / top).toBeGreaterThan(0.97);
    expect(at(0.398) / top).toBeGreaterThan(0.97);
    near(n.stats.amplitude, 1.45, 0.01);
    near(a.stats.amplitude, 0.71, 0.01);
    near(10 ** (0.4 * a.stats.amplitude), 1.9, 0.05);
    // 2 percent off drifts most of a cycle.
    near(a.cycles * 0.02, 0.79, 0.01);
  });
  test('depth', () => {
    const a = analysisOf(0, data);
    const e = analysisOf(1, data);
    const P = a.refined.period;
    const T = a.cycles * P;
    near(deep(BEAT_DEEP, 'the-width-from-the-run').answer, (P * P) / T, 0.0008);
    near(
      deep(BEAT_DEEP, 'the-drift-by-hand').answer,
      a.cycles * (1 - 1 / 1.02),
      0.04
    );
    near(deep(BEAT_DEEP, 'the-alias-by-hand').answer, 1 / (1 / P - 1), 0.01);
    near(
      deep(BEAT_DEEP, 'the-honest-error').answer,
      (e.found.period - e.refined.period) / e.found.width,
      0.01
    );
    near(
      deep(BEAT_DEEP, 'the-sigma-count').answer,
      (e.refined.period - 7.176641) / e.boot.sigma,
      0.15
    );
    expect(BEAT_DEEP.steps.map(s => s.depth)).toEqual([
      'quantitative',
      'quantitative',
      'quantitative',
      'advanced',
      'advanced',
    ]);
  });
});

describe('Leavitt’s Law and The First Rung', () => {
  test('the calibration steps accept the fit', () => {
    const f = leavittView({ host: 0 }, data);
    const c = f.calibration;
    expect(
      grade('leavitts-law', 'the-calibration', { slope: c.b, zero: c.a })
    ).toBe('ok');
    expect(
      grade('leavitts-law', 'the-calibration', { slope: -c.b, zero: c.a })
    ).toBe('error');
    expect(
      grade('leavitts-law', 'how-tight', {
        scatter: c.rms,
        dust: wesenheitResidual(LAW, 3.3).residual,
      })
    ).toBe('ok');
    near(c.n, 339, 0);
    // The infrared band alone feels about five times as much dust.
    near(
      wesenheitResidual(LAW, 3.3).A.F160W /
        wesenheitResidual(LAW, 3.3).residual,
      5.2,
      0.3
    );
    near(10 ** (0.4 * -c.b), 20.7, 0.7);
    near(100 * 0.4605 * c.rms, 4.1, 0.2);
  });
  test('the depth answers match the fit', () => {
    const c = leavittView({ host: 0 }, data).calibration;
    near(
      deep(LAW_DEEP, 'a-cepheid-at-thirty-days').answer,
      c.a + c.b * (Math.log10(30) - 1),
      0.03
    );
    near(
      deep(LAW_DEEP, 'one-star-in-distance').answer,
      100 * 0.4605 * c.rms,
      0.2
    );
    near(
      deep(LAW_DEEP, 'the-brightness-ratio').answer,
      10 ** (-0.4 * c.b),
      0.7
    );
    near(deep(LAW_DEEP, 'many-stars').answer, c.rms / Math.sqrt(c.n), 0.0004);
    near(c.sigmaA, c.rms / Math.sqrt(c.n), 0.0003);
  });
  test('the host steps accept the distances and the budget', () => {
    const n = leavittView({ host: 1 }, data);
    const r = n.result;
    const t = id => r.budget.find(b => b.id === id).sigma;
    expect(
      grade('the-first-rung', 'a-maser-galaxy', { mu: r.mu, d: r.distanceMpc })
    ).toBe('ok');
    expect(
      grade('the-first-rung', 'the-maser-check', {
        maser: ANCHORS.n4258.mu,
        sigma: ANCHORS.n4258.sigma,
      })
    ).toBe('ok');
    expect(
      grade('the-first-rung', 'the-budget', {
        host: t('host'),
        lmc: t('anchorDistance'),
      })
    ).toBe('ok');
    const m = leavittView({ host: 2 }, data).result;
    expect(
      grade('the-first-rung', 'another-galaxy', { mu: m.mu, d: m.distanceMpc })
    ).toBe('ok');
    // The sentences.
    near(
      Math.abs(r.mu - ANCHORS.n4258.mu) /
        Math.hypot(r.sigma, ANCHORS.n4258.sigma),
      0.1,
      0.05
    );
    near(r.mu - ANCHORS.lmc.mu, 10.93, 0.02);
    near(r.distanceMpc / 0.04966, 153, 2);
    expect(r.hostN).toBe(111);
    expect(m.hostN).toBe(65);
    near(1 - m.distanceMpc / r.distanceMpc, 0.084, 0.005);
    near(t('slope'), 0.00015, 0.0001);
    expect(deepBudget(m)).toBeGreaterThan(0.002);
  });
  const deepBudget = m => m.budget.find(b => b.id === 'slope').sigma;
  test('depth', () => {
    const r = leavittView({ host: 1 }, data).result;
    const t = id => r.budget.find(b => b.id === id).sigma;
    near(
      deep(RUNG_DEEP, 'from-modulus-to-distance').answer,
      r.distanceMpc,
      0.05
    );
    near(deep(RUNG_DEEP, 'the-budget-in-quadrature').answer, r.sigma, 0.0015);
    near(
      deep(RUNG_DEEP, 'the-error-in-percent').answer,
      100 * 0.4605 * r.sigma,
      0.1
    );
    const ten = Math.hypot(
      t('host') / Math.sqrt(10),
      t('anchor'),
      t('anchorDistance')
    );
    near(deep(RUNG_DEEP, 'ten-hosts').answer, ten, 0.002);
    near(t('anchorDistance') ** 2 / r.sigma ** 2, 0.26, 0.01);
    near(
      t('host') + t('anchor') + t('slope') + t('anchorDistance'),
      0.074,
      0.001
    );
  });
});

describe('Which Kind of Variable', () => {
  const view = i => classView({ features: i }, data);
  test('the steps accept the classifier’s numbers', () => {
    const id = 'which-kind-of-variable';
    const recall = (f, k) => 100 * f.table.perClass[k].recall;
    const a = view(0);
    const ids = a.table.classes;
    const ecl = ids.indexOf('eclipsing');
    expect(
      grade(id, 'period-alone', {
        acc: 100 * a.table.accuracy,
        ecl: recall(a, ecl),
      })
    ).toBe('ok');
    expect(
      grade(id, 'read-the-table', {
        rrab: a.table.matrix[ecl][ids.indexOf('rrab')],
        right: a.table.matrix[ecl][ecl],
      })
    ).toBe('ok');
    const b = view(1);
    expect(
      grade(id, 'add-the-amplitude', {
        acc: 100 * b.table.accuracy,
        ecl: recall(b, ecl),
      })
    ).toBe('ok');
    const c = view(2);
    expect(
      grade(id, 'the-shape', {
        acc: 100 * c.table.accuracy,
        ecl: recall(c, ecl),
      })
    ).toBe('ok');
    // Eclipsing binaries gain most from the amplitude.
    const gains = ids.map((_, k) => recall(b, k) - recall(a, k));
    expect(gains.indexOf(Math.max(...gains))).toBe(ecl);
    // R21 separates them.
    const r21 = c.rows.filter(r => r.cls === 'eclipsing').map(r => r.r21);
    expect(Math.min(...r21)).toBeGreaterThan(0.7);
    expect(
      Math.max(...c.rows.filter(r => r.cls !== 'eclipsing').map(r => r.r21))
    ).toBeLessThan(0.6);
  });
  test('depth', () => {
    const a = view(0);
    const m = a.table.matrix;
    const diag = m.reduce((s, row, i) => s + row[i], 0);
    near(
      deep(KIND_DEEP, 'accuracy-from-the-table').answer,
      (100 * diag) / 120,
      0.3
    );
    const ecl = a.table.classes.indexOf('eclipsing');
    const four = m.reduce((s, row, i) => (i === ecl ? s : s + row[i]), 0);
    near(deep(KIND_DEEP, 'the-four-easy-kinds').answer, (100 * four) / 96, 0.3);
    const w = a.table.classes.map((_, i) => (i === ecl ? 10 : 1));
    const skew =
      (100 * a.table.perClass.reduce((s, p, i) => s + w[i] * p.recall, 0)) / 14;
    near(deep(KIND_DEEP, 'a-skewed-sky').answer, skew, 1);
    expect(diag).toBe(100);
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
});
