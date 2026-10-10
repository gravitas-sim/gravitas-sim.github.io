import { describe, test, expect } from '@jest/globals';
import MADE_OF from '../js/data/investigations/what-a-spectrum-is-made-of.js';
import MADE_OF_ES from '../js/data/investigations/es/what-a-spectrum-is-made-of.js';
import DEEPER from '../js/data/investigations/depth/what-a-spectrum-is-made-of.js';
import DEEPER_ES from '../js/data/investigations/depth/es/what-a-spectrum-is-made-of.js';
import { checkAnswer } from '../js/answerCheck.js';
import {
  KIRCHHOFF_CORE,
  LIGHT_DEPTH_VALUES,
  kirchhoff,
} from '../tools/authoring/lightModels.mjs';
import {
  lightReady,
  kirchhoffView,
  LIGHT_WIDGETS,
} from '../js/lightWidgets.js';
import {
  kirchhoffIntensity,
  planckRatio,
  KIRCHHOFF_LINES,
  syntheticGrid,
} from '../js/light/model.js';
import { planckLambda } from '../js/kernels/radiation/planck.js';
import {
  H_PLANCK,
  C_LIGHT,
  K_BOLTZMANN,
} from '../js/kernels/radiation/constants.js';

// =============================================================================
// The Kirchhoff demonstrator and "What a Spectrum Is Made Of" (Roadmap II,
// Prompt 83, part 3)
// -----------------------------------------------------------------------------
// The demonstrator is the equation of transfer for a slab, so what is held here
// is the physics it must obey (Kirchhoff's three cases, the thick-line floor,
// the cancellation at equal temperatures), the measurement node's reading of it,
// and the lesson's own checkers against the numbers on the screen.
// =============================================================================

const step = (lesson, sid) => lesson.steps.find(s => s.sid === sid);
const REST = KIRCHHOFF_LINES[0].rest;
const setup = (Ts, Tc, tau0 = 3, mode = 'both') => ({ Ts, Tc, tau0, mode });

describe('Kirchhoff’s three cases', () => {
  test('a source alone is its blackbody, and no cloud adds no lines', () => {
    for (const lam of [4000, REST, 6000])
      expect(kirchhoffIntensity(lam, setup(6000, 4000, 3, 'source'))).toBe(
        planckLambda(lam * 1e-10, 6000)
      );
    expect(kirchhoffIntensity(REST, setup(6000, 4000, 0))).toBeCloseTo(
      planckLambda(REST * 1e-10, 6000),
      -3
    );
  });

  test('a cooler cloud in front makes a dark line', () => {
    const f = kirchhoff(6000, 4000);
    expect(f.kind).toBe('absorption');
    expect(f.centre).toBeLessThan(1);
    expect(f.m.ew).toBeGreaterThan(0);
    expect(f.m.depth).toBeGreaterThan(0.5);
  });

  test('a hotter cloud in front makes a bright line, with a negative width', () => {
    const f = kirchhoff(6000, 8000);
    expect(f.kind).toBe('bright');
    expect(f.centre).toBeGreaterThan(1);
    expect(f.m.ew).toBeLessThan(0);
    expect(f.m.warnings.map(w => w.code)).toContain('emission');
  });

  test('the same temperature cancels at every wavelength', () => {
    for (const lam of syntheticGrid(REST).filter((_, i) => i % 20 === 0)) {
      const I = kirchhoffIntensity(lam, setup(6000, 6000, 5));
      expect(I / planckLambda(lam * 1e-10, 6000)).toBeCloseTo(1, 12);
    }
    const f = kirchhoff(6000, 6000);
    expect(f.kind).toBe('none');
    expect(Math.abs(f.m.ew)).toBeLessThan(0.01);
  });

  test('a cloud alone is dark between its lines and glows at them', () => {
    const s = setup(6000, 8000, 3, 'cloud');
    expect(kirchhoffIntensity(5500, s)).toBe(0);
    expect(kirchhoffIntensity(REST, s)).toBeGreaterThan(0);
    expect(kirchhoffView({ mode: 1, Ts: 6000, Tc: 8000, tau: 3 }).kind).toBe(
      'emission'
    );
  });

  test('a thick line goes to the cloud’s own blackbody, not to zero', () => {
    for (const [Ts, Tc] of [
      [6000, 4000],
      [8000, 4000],
      [6000, 8000],
    ]) {
      const f = kirchhoff(Ts, Tc, 20);
      expect(f.centre).toBeCloseTo(f.ratio, 6);
    }
    expect(kirchhoff(6000, 4000, 20).centre).toBeGreaterThan(0.1);
  });
});

describe('the numbers the lessons write down', () => {
  test('the Planck ratio is the hand formula the lesson gives', () => {
    const x = (H_PLANCK * C_LIGHT) / K_BOLTZMANN / (REST * 1e-10);
    expect(Math.round(x)).toBe(21917);
    const hand = (Ts, Tc) => (Math.exp(x / Ts) - 1) / (Math.exp(x / Tc) - 1);
    expect(planckRatio(REST, 4000, 8000)).toBeCloseTo(hand(8000, 4000), 12);
  });

  test('the width is (1 - ratio) times a part that belongs to the gas', () => {
    const a = LIGHT_DEPTH_VALUES.patch(4000);
    const b = LIGHT_DEPTH_VALUES.patch(8000);
    expect(Math.abs(a / b - 1)).toBeLessThan(1e-3);
    expect(Math.abs(LIGHT_DEPTH_VALUES.patch(3000) / a - 1)).toBeLessThan(1e-3);
  });

  test('the width of a thin line grows with the gas, and the sign follows the temperatures', () => {
    const w = tau => kirchhoff(6000, 4000, tau).m.ew;
    expect(w(0.5)).toBeLessThan(w(1));
    expect(w(1)).toBeLessThan(w(3));
    const swing = [5000, 5500, 6500, 7000].map(Tc =>
      Math.sign(kirchhoff(6000, Tc).m.ew)
    );
    expect(swing).toEqual([1, 1, -1, -1]);
  });
});

describe('the core measurement step', () => {
  const s = step(MADE_OF, 'measure-two-clouds');
  test('accepts what the instrument shows and refuses what it does not', () => {
    const cool = KIRCHHOFF_CORE.cool();
    const hot = KIRCHHOFF_CORE.hot();
    expect(Math.abs(cool - 19.9)).toBeLessThanOrEqual(0.05);
    expect(Math.abs(hot - 251.6)).toBeLessThanOrEqual(0.1);
    expect(s.validate({ cool, hot }).level).toBe('ok');
    expect(s.validate({ cool: hot, hot: cool }).level).toBe('error');
    expect(s.validate({ cool: 100 - cool, hot }).level).toBe('error');
    expect(s.validate({ cool })).toBeNull();
  });
});

describe('the depth steps', () => {
  const v = LIGHT_DEPTH_VALUES;
  test('every expected value is the kernel’s and the node’s', () => {
    expect(checkAnswer(step(DEEPER, 'planck-floor'), v.planckFloor())).toBe(
      true
    );
    expect(
      checkAnswer(step(DEEPER, 'equivalent-width'), v.equivalentWidth())
    ).toBe(true);
    expect(checkAnswer(step(DEEPER, 'boltzmann-ratio'), v.boltzmann())).toBe(
      true
    );
    expect(checkAnswer(step(DEEPER, 'same-patch'), v.patch(4000))).toBe(true);
    expect(checkAnswer(step(DEEPER, 'same-patch'), v.patch(8000))).toBe(true);
    expect(
      checkAnswer(step(DEEPER, 'real-balmer-ratio'), v.balmerRatio())
    ).toBe(true);
  });
  test('a value past the tolerance is refused', () => {
    const planck = step(DEEPER, 'planck-floor');
    expect(checkAnswer(planck, v.planckFloor() + 2 * planck.tolerance)).toBe(
      false
    );
    const ew = step(DEEPER, 'equivalent-width');
    expect(checkAnswer(ew, v.equivalentWidth() + 2 * ew.tolerance)).toBe(false);
  });
  test('the Boltzmann ratio is a stated, steep model: it keeps rising', () => {
    expect(v.boltzmann()).toBeGreaterThan(2000);
    // The prose quotes about 2,800 between 9,500 K and 5,800 K.
    const r = T => Math.exp(-(10.2 * 1.602176634e-19) / (K_BOLTZMANN * T));
    expect(Math.round(r(9500) / r(5800) / 100)).toBe(28);
  });
});

describe('the instrument', () => {
  test('its readout lists what the lesson asks to be read', async () => {
    expect(await lightReady).toBe(true);
    const kf = LIGHT_WIDGETS.find(w => w.id === 'kirchhoff');
    const v = { mode: 0, Ts: 6000, Tc: 4000, tau: 3, view: 1 };
    const rows = kf.readout(v);
    const labels = rows.map(r => r.label).join('|');
    expect(labels).toMatch(/H-alpha center/);
    expect(labels).toMatch(/Equivalent width/);
    expect(labels).toMatch(/n = 2/);
    expect(rows.every(r => typeof r.value === 'string')).toBe(true);
    expect(rows.find(r => /center/.test(r.label)).value).toMatch(/^19\.9 %/);
    // Without a source there is nothing to measure a width against.
    const alone = kf
      .readout({ ...v, mode: 1 })
      .map(r => r.label)
      .join('|');
    expect(alone).not.toMatch(/Equivalent width/);
    expect(kf.controls.map(c => c.id)).toEqual([
      'mode',
      'Ts',
      'Tc',
      'tau',
      'view',
    ]);
  });
});

describe('the Spanish', () => {
  test('lines up with the English step for step', () => {
    expect(MADE_OF_ES.steps).toHaveLength(MADE_OF.steps.length);
    expect(DEEPER_ES.steps).toHaveLength(DEEPER.steps.length);
    MADE_OF.steps.forEach((s, i) => {
      if (s.options)
        expect(MADE_OF_ES.steps[i].options).toHaveLength(s.options.length);
      if (s.fields)
        expect(MADE_OF_ES.steps[i].fields).toHaveLength(s.fields.length);
    });
    DEEPER.steps.forEach((s, i) => {
      if (s.options)
        expect(DEEPER_ES.steps[i].options).toHaveLength(s.options.length);
    });
  });
});
