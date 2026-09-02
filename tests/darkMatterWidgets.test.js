import { describe, test, expect } from '@jest/globals';
import { DARK_MATTER_WIDGETS } from '../js/darkMatterWidgets.js';
import {
  NGC3198,
  NGC3198_OBSERVED,
  COMA,
  G_CLUSTER,
} from '../js/darkMatterWidgets.js';
import { getWidget, widgetDefaults } from '../js/widgets.js';
import { getInvestigation } from '../js/data/investigations.js';
import {
  galaxyCurveAt,
  curveResidual,
  haloEnclosedMass,
  enclosedMassFromSpeed,
  virialMass,
  losToMeanSquare,
  G_GALACTIC,
} from '../js/darkMatter.js';

const widget = id => DARK_MATTER_WIDGETS.find(w => w.id === id);

/**
 * A widget's presets for a given step.
 *
 * The fitting instrument declares presets as a function of the step, so that the
 * steps hiding its halo sliders do not also offer the button that would set
 * them. Everything else declares a plain array.
 *
 * @param {Object} w - A widget
 * @param {Object} [spec] - A step's tool spec
 * @returns {Array} Presets
 */
const presetsOf = (w, spec = {}) =>
  (typeof w.presets === 'function' ? w.presets(spec) : w.presets) || [];

// Every spec shape a Missing Mass step passes to one of these widgets. Kept as a
// list so the sweeps below cover the combinations the lesson actually produces
// rather than only the defaults.
const SPECS = [{}, { presets: false }, { hide: ['size'] }, { hide: ['dims'] }];

/**
 * A canvas whose every context method exists and does nothing.
 *
 * The other widget suites do not exercise draw() at all, which leaves a typo in
 * a branch only one preset reaches undetected until a student opens that preset.
 * A stub that absorbs the whole 2D API is cheap and turns "the panel throws" into
 * a test failure instead of a blank instrument. It is deliberately local rather
 * than added to tests/setup.js: nothing else needs it, and widening the shared
 * mock would change what every other suite is running against.
 */
function stubCanvas() {
  const gradient = { addColorStop() {} };
  const ctx = new Proxy(
    {},
    {
      get(target, prop) {
        if (prop in target) return target[prop];
        if (typeof prop !== 'string') return undefined;
        if (/^create(Linear|Radial|Conic)Gradient$/.test(prop)) {
          return () => gradient;
        }
        if (prop === 'measureText') return () => ({ width: 30 });
        return () => undefined;
      },
      set(target, prop, value) {
        target[prop] = value;
        return true;
      },
    }
  );
  return {
    clientWidth: 460,
    width: 0,
    height: 0,
    style: {},
    getContext: () => ctx,
  };
}

describe('the instruments', () => {
  test('every one is registered and reachable by id', () => {
    for (const w of DARK_MATTER_WIDGETS) {
      expect(getWidget(w.id)).toBe(w);
      expect(typeof w.draw).toBe('function');
      expect(typeof w.readout).toBe('function');
      expect(Array.isArray(w.controls)).toBe(true);
      expect(w.controls.length).toBeGreaterThan(0);
      expect(typeof w.title).toBe('string');
    }
  });

  test('ids are unique across the whole registry', () => {
    const ids = DARK_MATTER_WIDGETS.map(w => w.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const w of DARK_MATTER_WIDGETS) expect(getWidget(w.id).id).toBe(w.id);
  });

  test('every control declares a range its default sits inside', () => {
    for (const w of DARK_MATTER_WIDGETS) {
      for (const c of w.controls) {
        expect(c.min).toBeLessThan(c.max);
        expect(c.step).toBeGreaterThan(0);
        expect(c.value).toBeGreaterThanOrEqual(c.min);
        expect(c.value).toBeLessThanOrEqual(c.max);
        expect(typeof c.label).toBe('string');
        expect(c.label.length).toBeGreaterThan(0);
      }
    }
  });

  test('a slider used as a selector labels every one of its positions', () => {
    // Several of these panels use a stepped slider to choose between named
    // options. A position with no label is a control a student cannot read.
    for (const w of DARK_MATTER_WIDGETS) {
      for (const c of w.controls) {
        if (!c.format) continue;
        for (let x = c.min; x <= c.max; x += c.step) {
          const text = String(c.format(x));
          expect(text.length).toBeGreaterThan(0);
          expect(text).not.toMatch(/NaN|undefined|Infinity|—/);
        }
      }
    }
  });

  test('readouts survive both ends of every slider, under every spec', () => {
    for (const w of DARK_MATTER_WIDGETS) {
      for (const end of ['min', 'max', 'value']) {
        for (const spec of SPECS) {
          const v = widgetDefaults(w);
          for (const c of w.controls) v[c.id] = c[end];
          const rows = w.readout(v, undefined, spec);
          expect(rows.length).toBeGreaterThan(0);
          for (const row of rows) {
            expect(typeof row.label).toBe('string');
            expect(row.label.length).toBeGreaterThan(0);
            expect(String(row.value)).not.toMatch(/NaN|undefined|Infinity/);
            expect(String(row.value).length).toBeGreaterThan(0);
          }
        }
      }
    }
  });

  test('drawing never throws, at either end of every slider', () => {
    for (const w of DARK_MATTER_WIDGETS) {
      for (const end of ['min', 'max', 'value']) {
        for (const spec of SPECS) {
          const v = widgetDefaults(w);
          for (const c of w.controls) v[c.id] = c[end];
          expect(() => w.draw(stubCanvas(), v, undefined, spec)).not.toThrow();
        }
      }
    }
  });

  test('drawing survives a canvas too narrow to plot into', () => {
    // The instrument column collapses on a phone, and a widget that divided by
    // a negative width used to paint garbage rather than nothing.
    for (const w of DARK_MATTER_WIDGETS) {
      const canvas = stubCanvas();
      canvas.clientWidth = 40;
      expect(() =>
        w.draw(canvas, widgetDefaults(w), undefined, {})
      ).not.toThrow();
    }
  });

  test('every preset only sets controls the widget has, within range', () => {
    for (const w of DARK_MATTER_WIDGETS) {
      expect(presetsOf(w).length).toBeGreaterThan(0);
      for (const p of presetsOf(w)) {
        expect(p.label).toBeTruthy();
        expect(p.note.length).toBeGreaterThan(20);
        for (const [k, value] of Object.entries(p.values)) {
          const c = w.controls.find(x => x.id === k);
          expect(c).toBeTruthy();
          expect(value).toBeGreaterThanOrEqual(c.min);
          expect(value).toBeLessThanOrEqual(c.max);
        }
      }
    }
  });

  test('an animated widget declares the machinery an animation needs', () => {
    for (const w of DARK_MATTER_WIDGETS) {
      if (!w.animated) continue;
      expect(typeof w.step).toBe('function');
      expect(typeof w.reset).toBe('function');
      expect(typeof w.act).toBe('function');
      expect((w.actions || []).length).toBeGreaterThan(0);
    }
  });
});

describe('dm-shapes: mass distribution decides curve shape', () => {
  const w = widget('dm-shapes');

  test('all four distributions hold the same mass inside 30 kpc', () => {
    // The comparison is about arrangement, not amount, so a difference in the
    // normalisation would make the whole panel misleading.
    for (let kind = 0; kind <= 3; kind++) {
      const f = w.compute({ kind, mass: 8, size: 4 });
      const implied = enclosedMassFromSpeed(30, f.speedAt(30));
      // The disc is the outlier and legitimately so: in the plane of a disc the
      // circular speed exceeds the spherical equivalent, so the implied mass
      // overshoots. Everything else should land on the stated 8e10.
      const tol = kind === 2 ? 0.35 : 0.02;
      expect(Math.abs(implied / 8e10 - 1)).toBeLessThan(tol);
    }
  });

  test('only the halo escapes the Keplerian slope', () => {
    const slope = kind => w.compute({ kind, mass: 8, size: 4 }).slope;
    expect(slope(0)).toBeCloseTo(-0.5, 2); // point mass: Keplerian
    expect(slope(1)).toBeCloseTo(-0.5, 2); // outside a ball: also Keplerian
    expect(slope(2)).toBeLessThan(-0.2); // a disc still falls
    // The halo does not fall. It is not exactly zero either, and should not be:
    // a pseudo-isothermal profile approaches its asymptote from below, so over a
    // finite outer range it still climbs by about pi/4x - here about +0.15. The
    // claim the lesson makes is comparative, so that is what is checked.
    expect(slope(3)).toBeGreaterThan(-0.05);
    expect(slope(3)).toBeLessThan(0.25);
    expect(Math.abs(slope(3))).toBeLessThan(Math.abs(slope(0)) / 2);
  });

  test('the shape word the readout prints matches the slope it reports', () => {
    const shapeOf = kind => {
      const rows = w.readout({ kind, mass: 8, size: 4 });
      return rows.find(r => r.label.includes('Shape')).value;
    };
    expect(shapeOf(0)).toMatch(/Kepler/i);
    expect(shapeOf(3)).toBe('FLAT');
  });

  test('a bigger uniform ball moves its peak outward', () => {
    const peak = size => {
      const f = w.compute({ kind: 1, mass: 8, size });
      let best = 0;
      let bestR = 0;
      for (let r = 0.5; r <= 30; r += 0.1) {
        const v = f.speedAt(r);
        if (v > best) {
          best = v;
          bestR = r;
        }
      }
      return bestR;
    };
    expect(peak(10)).toBeGreaterThan(peak(4));
  });
});

describe('dm-enclosed: the inference the lesson turns on', () => {
  const w = widget('dm-enclosed');

  test('a flat curve doubles the enclosed mass when the radius doubles', () => {
    const f = w.compute({ shape: 1, radius: 10 });
    expect(f.growth).toBeCloseTo(2, 2);
  });

  test('a Keplerian curve leaves the enclosed mass alone', () => {
    const f = w.compute({ shape: 0, radius: 10 });
    expect(f.growth).toBeCloseTo(1, 3);
  });

  test('the three curves agree at 10 kpc, so switching changes shape not scale', () => {
    const at10 = shape => w.compute({ shape, radius: 10 }).speed;
    expect(at10(0)).toBeCloseTo(150, 6);
    expect(at10(1)).toBeCloseTo(150, 6);
    // The galaxy is a real curve rather than a construction, so it only has to
    // be in the same place, not identical.
    expect(Math.abs(at10(2) - 150)).toBeLessThan(25);
  });

  test('the real-galaxy curve reports how little of the mass is visible', () => {
    const rows = w.readout({ shape: 2, radius: 30 });
    const row = rows.find(r => r.label.includes('visible disc'));
    expect(row).toBeTruthy();
    // At 30 kpc the disc should account for well under half the enclosed mass.
    const pct = Number(row.value.match(/\((\d+)%\)/)[1]);
    expect(pct).toBeGreaterThan(5);
    expect(pct).toBeLessThan(40);
  });

  test('the enclosed mass is read from the physics module, not recomputed', () => {
    const f = w.compute({ shape: 1, radius: 17 });
    expect(f.enclosed).toBeCloseTo(enclosedMassFromSpeed(17, 150), 6);
  });
});

describe('dm-fit: the fitting exercise', () => {
  const w = widget('dm-fit');

  test('the synthetic curve is generated from the stated model', () => {
    expect(NGC3198_OBSERVED.length).toBeGreaterThanOrEqual(10);
    for (const p of NGC3198_OBSERVED) {
      expect(p.r).toBeGreaterThan(0);
      expect(p.err).toBeGreaterThan(0);
      // Every point is its model value plus a scatter of a few km/s, so the
      // exercise has an exact answer and the data still looks measured.
      const truth = galaxyCurveAt(p.r, NGC3198).total;
      expect(Math.abs(p.v - truth)).toBeLessThanOrEqual(p.err);
    }
  });

  test('the published decomposition is the best available fit', () => {
    const preset = presetsOf(w).find(p => /published/i.test(p.label));
    const f = w.compute({ ...widgetDefaults(w), ...preset.values });
    expect(f.good).toBe(true);
    expect(f.fit.rms).toBeLessThan(f.meanErr);
  });

  test('every preset that switches the halo off fits badly', () => {
    // The whole point of the exercise. If any visible-only preset fitted, the
    // lesson would be teaching the opposite of its conclusion.
    const noHalo = presetsOf(w).filter(p => p.values.haloVFlat === 0);
    expect(noHalo.length).toBeGreaterThanOrEqual(3);
    for (const p of noHalo) {
      const f = w.compute({ ...widgetDefaults(w), ...p.values });
      expect(f.good).toBe(false);
      expect(f.fit.rms).toBeGreaterThan(2 * f.meanErr);
    }
  });

  test('no disc mass alone can fit the curve, at any scale length', () => {
    // Swept rather than asserted: this is the claim a student is invited to
    // falsify with the sliders, so the sweep should cover what they can reach.
    let best = Infinity;
    for (let m = 0; m <= 16; m += 0.5) {
      for (let s = 1; s <= 8; s += 0.25) {
        const f = w.compute({
          discMass: m,
          discScale: s,
          haloVFlat: 0,
          haloCore: 6,
        });
        best = Math.min(best, f.fit.rms);
      }
    }
    // The best visible-only fit is still far worse than the data's own errors.
    expect(best).toBeGreaterThan(2 * 4.5);
  });

  test('adding a halo makes the fit reachable', () => {
    let best = Infinity;
    for (let vf = 100; vf <= 200; vf += 10) {
      for (let core = 2; core <= 12; core += 1) {
        const f = w.compute({
          discMass: 3.3,
          discScale: 2.6,
          haloVFlat: vf,
          haloCore: core,
        });
        best = Math.min(best, f.fit.rms);
      }
    }
    expect(best).toBeLessThan(4.5);
  });

  test('the halo carries several times the visible mass when fitted', () => {
    const preset = presetsOf(w).find(p => /published/i.test(p.label));
    const f = w.compute({ ...widgetDefaults(w), ...preset.values });
    expect(f.ratio).toBeGreaterThan(2);
    expect(f.ratio).toBeLessThan(8);
  });

  test('fit quality and halo mass come from the physics module', () => {
    const v = { discMass: 4, discScale: 3, haloVFlat: 140, haloCore: 5 };
    const f = w.compute(v);
    expect(f.fit.rms).toBeCloseTo(
      curveResidual(NGC3198_OBSERVED, f.model).rms,
      9
    );
    expect(f.haloMass).toBeCloseTo(
      haloEnclosedMass(30, { vFlat: 140, coreRadius: 5 }, G_GALACTIC),
      3
    );
  });

  test('the steps that hide the halo do not offer the preset that sets it', () => {
    // Otherwise a student on step 14, asked to fit with stars alone, can press
    // one button and get a FITTED marker with no visible reason for it - which
    // skips the entire point of the exercise.
    const hidden = { hide: ['haloVFlat', 'haloCore'] };
    const offered = presetsOf(w, hidden);
    expect(offered.length).toBe(3);
    expect(offered.every(p => p.values.haloVFlat === 0)).toBe(true);
    // And with nothing hidden, all four are there.
    expect(presetsOf(w, {})).toHaveLength(4);
  });

  test('every lesson step gets presets that only touch its visible sliders', () => {
    // Swept over the real steps rather than over invented specs.
    const lesson = getInvestigation('missing-mass');
    for (const step of lesson.steps) {
      if (step.tool?.id !== 'dm-fit') continue;
      const hide = step.tool.hide || [];
      for (const p of presetsOf(w, step.tool)) {
        for (const k of Object.keys(p.values)) {
          if (!hide.includes(k)) continue;
          // A preset may set a hidden control only if it leaves it at the value
          // the step itself pinned, so nothing changes behind the student's back.
          expect(p.values[k]).toBe(step.tool.values?.[k] ?? p.values[k]);
        }
      }
    }
  });

  test('with the halo off the readout says so rather than printing a zero', () => {
    const rows = w.readout({
      discMass: 3.3,
      discScale: 2.6,
      haloVFlat: 0,
      haloCore: 6,
    });
    const row = rows.find(r => r.label.includes('Halo mass'));
    expect(row.value).toMatch(/switched off/i);
  });

  test('the verdict wording tracks the fit rather than being decorative', () => {
    const verdict = v => w.readout(v).find(r => r.label === 'Fit').value;
    expect(
      verdict({ discMass: 3.3, discScale: 2.6, haloVFlat: 150, haloCore: 6 })
    ).toMatch(/as good as/i);
    expect(
      verdict({ discMass: 16, discScale: 1, haloVFlat: 0, haloCore: 6 })
    ).toMatch(/nowhere/i);
  });
});

describe('dm-flyby: what the halo is holding', () => {
  const w = widget('dm-flyby');

  test('the star is launched at the full curve speed, halo or not', () => {
    // Switching the halo off has to remove the mass without removing the
    // motion. Relaunching it slower would quietly rescue the visible disc and
    // destroy the demonstration.
    const on = w.compute({ radius: 20, halo: 1 });
    const off = w.compute({ radius: 20, halo: 0 });
    expect(on.launchSpeed).toBeCloseTo(off.launchSpeed, 9);
    expect(on.launchSpeed).toBeCloseTo(galaxyCurveAt(20, NGC3198).total, 9);
  });

  test('the visible disc alone cannot supply that speed at 20 kpc', () => {
    const f = w.compute({ radius: 20, halo: 1 });
    expect(f.visibleSpeed).toBeLessThan(0.75 * f.launchSpeed);
  });

  test('with the halo on the orbit stays put', () => {
    const v = { radius: 20, halo: 1 };
    w.reset(v);
    let rMin = Infinity;
    let rMax = 0;
    for (let i = 0; i < 900; i++) {
      w.step(v, 1 / 60);
      const rows = w.readout(v);
      const r = Number(
        rows.find(x => x.label === 'Distance now').value.split(' ')[0]
      );
      rMin = Math.min(rMin, r);
      rMax = Math.max(rMax, r);
    }
    // A circle, to within the integrator's own error at this step.
    expect((rMax - rMin) / 20).toBeLessThan(0.06);
  });

  test('with the halo off the star leaves', () => {
    const v = { radius: 20, halo: 0 };
    w.reset(v);
    for (let i = 0; i < 1200; i++) w.step(v, 1 / 60);
    const rows = w.readout(v);
    const verdict = rows.find(x => x.label === 'Verdict');
    expect(verdict).toBeTruthy();
    expect(verdict.value).toMatch(/gone/i);
  });

  test('pausing stops it and relaunching puts it back', () => {
    const v = { radius: 20, halo: 1 };
    w.reset(v);
    for (let i = 0; i < 120; i++) w.step(v, 1 / 60);
    w.act('run', v); // pause
    const before = w.readout(v).find(x => x.label === 'Distance now').value;
    for (let i = 0; i < 120; i++) w.step(v, 1 / 60);
    expect(w.readout(v).find(x => x.label === 'Distance now').value).toBe(
      before
    );
    w.act('reset', v);
    const r = Number(
      w
        .readout(v)
        .find(x => x.label === 'Distance now')
        .value.split(' ')[0]
    );
    expect(r).toBeCloseTo(20, 1);
  });

  test('changing a slider relaunches rather than teleporting the star', () => {
    const v = { radius: 20, halo: 1 };
    w.reset(v);
    for (let i = 0; i < 300; i++) w.step(v, 1 / 60);
    const moved = { radius: 10, halo: 1 };
    w.step(moved, 1 / 60);
    const r = Number(
      w
        .readout(moved)
        .find(x => x.label === 'Distance now')
        .value.split(' ')[0]
    );
    expect(r).toBeCloseTo(10, 0);
  });
});

describe('dm-virial: Zwicky, with the mistakes reachable', () => {
  const w = widget('dm-virial');

  test('the correct setting is 3 sigma squared and matches the physics module', () => {
    const f = w.compute({ sigma: 1000, radius: 1.4, dims: 1 });
    expect(f.correct).toBe(true);
    expect(f.meanSquare).toBeCloseTo(losToMeanSquare(1000, 3), 9);
    expect(f.dynamical).toBeCloseTo(
      virialMass(losToMeanSquare(1000, 3), 1.4, G_CLUSTER),
      3
    );
  });

  test('Coma comes out near the published virial mass', () => {
    const f = w.compute({ sigma: 1000, radius: 1.4, dims: 1 });
    // Published virial masses for Coma inside about 1.4 Mpc are of order
    // 1e15 solar masses; this is the order-of-magnitude claim the lesson makes.
    expect(f.dynamical).toBeGreaterThan(5e14);
    expect(f.dynamical).toBeLessThan(4e15);
  });

  test('the discrepancy against everything visible is about tenfold', () => {
    const f = w.compute({ sigma: 1000, radius: 1.4, dims: 1 });
    expect(f.vsBaryons).toBeGreaterThan(5);
    expect(f.vsBaryons).toBeLessThan(20);
    // Against the galaxies alone it is far larger, which is why Zwicky's own
    // figure was in the hundreds.
    expect(f.vsStars).toBeGreaterThan(3 * f.vsBaryons);
  });

  test('forgetting the factor of three makes the mass three times too small', () => {
    const right = w.compute({ sigma: 1000, radius: 1.4, dims: 1 });
    const wrong = w.compute({ sigma: 1000, radius: 1.4, dims: 2 });
    expect(right.dynamical / wrong.dynamical).toBeCloseTo(3, 6);
    expect(wrong.correct).toBe(false);
  });

  test('forgetting to square sigma makes the discrepancy vanish', () => {
    // The point of leaving this reachable: the answer stops showing a
    // discrepancy at all, which is the signal that the arithmetic went wrong.
    const wrong = w.compute({ sigma: 1000, radius: 1.4, dims: 0 });
    expect(wrong.vsBaryons).toBeLessThan(1);
    expect(wrong.correct).toBe(false);
  });

  test('a wrong setting is called out in the readout', () => {
    for (const dims of [0, 2]) {
      const rows = w.readout({ sigma: 1000, radius: 1.4, dims });
      expect(rows.some(r => r.label === 'Warning')).toBe(true);
    }
    const ok = w.readout({ sigma: 1000, radius: 1.4, dims: 1 });
    expect(ok.some(r => r.label === 'Warning')).toBe(false);
  });

  test('the stored cluster numbers are the ones the readout uses', () => {
    const f = w.compute({ sigma: 1000, radius: 1.4, dims: 1 });
    expect(f.visible).toBe(COMA.starMass);
    expect(f.baryons).toBeCloseTo(COMA.starMass + COMA.gasMass, 6);
    // Hot gas carries several times more mass than the galaxies, which is the
    // correction Zwicky had no way to make.
    expect(COMA.gasMass).toBeGreaterThan(2 * COMA.starMass);
  });
});

describe('dm-budget: the closer', () => {
  const w = widget('dm-budget');

  test('the Planck fractions add to one', () => {
    const f = w.compute({ layer: 0 });
    expect(f.darkEnergy + f.darkMatter + f.baryons).toBeCloseTo(1, 2);
  });

  test('dark matter outweighs ordinary matter about five to one', () => {
    const f = w.compute({ layer: 0 });
    expect(f.darkMatter / f.baryons).toBeGreaterThan(4.5);
    expect(f.darkMatter / f.baryons).toBeLessThan(6);
  });

  test('stars are well under one percent of everything', () => {
    const f = w.compute({ layer: 3 });
    expect(f.stars).toBeLessThan(0.01);
    expect(f.stars).toBeGreaterThan(0.001);
  });

  test('every layer has a preset and a note that explains it', () => {
    expect(presetsOf(w)).toHaveLength(4);
    presetsOf(w).forEach((p, i) => {
      expect(p.values.layer).toBe(i);
      expect(p.note.length).toBeGreaterThan(40);
    });
  });
});

describe('the lesson wires the instruments up', () => {
  const lesson = getInvestigation('missing-mass');

  test('the investigation is still there and still findable', () => {
    expect(lesson).toBeTruthy();
    expect(lesson.id).toBe('missing-mass');
  });

  test('every tool a step names exists', () => {
    for (const step of lesson.steps) {
      if (!step.tool) continue;
      expect(getWidget(step.tool.id)).toBeTruthy();
    }
  });

  test('every tool value a step presets is a control in range', () => {
    for (const step of lesson.steps) {
      if (!step.tool?.values) continue;
      const w = getWidget(step.tool.id);
      for (const [k, value] of Object.entries(step.tool.values)) {
        const c = w.controls.find(x => x.id === k);
        expect(c).toBeTruthy();
        expect(value).toBeGreaterThanOrEqual(c.min);
        expect(value).toBeLessThanOrEqual(c.max);
      }
    }
  });

  test('every control a step hides is a control the widget has', () => {
    for (const step of lesson.steps) {
      if (!step.tool?.hide) continue;
      const w = getWidget(step.tool.id);
      for (const id of step.tool.hide) {
        expect(w.controls.some(c => c.id === id)).toBe(true);
      }
    }
  });

  test('all six instruments are actually used', () => {
    const used = new Set(lesson.steps.filter(s => s.tool).map(s => s.tool.id));
    for (const w of DARK_MATTER_WIDGETS) {
      expect(used).toContain(w.id);
    }
  });
});
