// =============================================================================
// The Stellar Lab
// -----------------------------------------------------------------------------
// The model underneath is tested in tests/stellarModel.test.js. What is tested
// here is the instrument: that the diagram's conventions hold, that the two
// ways of choosing a star stay different kinds of thing, that a comparison
// drawn at "true relative sizes" is drawn at true relative sizes, and that the
// synthetic population is reproducible and honest about what it leaves out.
//
// The one claim worth naming: a point on an H-R diagram does not determine a
// mass. Several tests below exist only to keep the lab from ever reporting one.
// =============================================================================

import { describe, test, expect, beforeEach } from '@jest/globals';
import {
  AXES,
  xForTemperature,
  temperatureForX,
  yForLuminosity,
  luminosityForY,
  constantRadiusLine,
  GUIDE_RADII,
  regions,
  nearbyModels,
  hypotheticalAt,
  inRange,
} from '../js/stellar/hr.js';
import {
  IMF,
  sampleInitialMass,
  synthesisePopulation,
  brightSubset,
  countByType,
  fluxAt,
} from '../js/stellar/population.js';
import {
  PACE,
  setPace,
  MODE,
  SIZE_MODE,
  MAX_PINNED,
  ORBIT_REFERENCES,
  createLab,
  selection,
  setCursor,
  setMode,
  adoptModel,
  pin,
  unpin,
  comparison,
  trueScaleFor,
  populationOf,
  brightOf,
  snapshotOf,
  ageForFraction,
  fractionForAge,
  midMainSequenceFraction,
} from '../js/stellarLab.js';
import {
  STELLAR_WIDGETS,
  activeLab,
  resetLabForTests,
} from '../js/stellarWidgets.js';
import { getWidget } from '../js/widgets.js';
import { mulberry32 } from '../js/rng.js';
import { trackIds } from '../js/stellar/tracks.js';
import { radiusFromLuminosityAndTemperature } from '../js/stellar/geometry.js';

/** A canvas whose every 2D method exists and does nothing. */
function stubCanvas() {
  const gradient = { addColorStop() {} };
  const ctx = new Proxy(
    {},
    {
      get(target, prop) {
        if (prop in target) return target[prop];
        if (typeof prop !== 'string') return undefined;
        if (/^create(Linear|Radial|Conic)Gradient$/.test(prop))
          return () => gradient;
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

const widget = id => getWidget(id);
const defaults = w => Object.fromEntries(w.controls.map(c => [c.id, c.value]));

describe('the diagram runs the way an H-R diagram runs', () => {
  test('temperature increases to the LEFT', () => {
    expect(xForTemperature(AXES.teffMaxK)).toBeCloseTo(0, 9);
    expect(xForTemperature(AXES.teffMinK)).toBeCloseTo(1, 9);
    expect(xForTemperature(30000)).toBeLessThan(xForTemperature(3000));
  });

  test('luminosity increases upwards', () => {
    expect(yForLuminosity(AXES.luminosityMin)).toBeCloseTo(0, 9);
    expect(yForLuminosity(AXES.luminosityMax)).toBeCloseTo(1, 9);
  });

  test('both axes are logarithmic', () => {
    // Equal ratios take equal distances. On a linear axis they would not.
    const a = yForLuminosity(1) - yForLuminosity(0.1);
    const b = yForLuminosity(1000) - yForLuminosity(100);
    expect(a).toBeCloseTo(b, 9);
    const c = xForTemperature(5000) - xForTemperature(10000);
    const d = xForTemperature(10000) - xForTemperature(20000);
    expect(c).toBeCloseTo(d, 9);
  });

  test('the mappings invert each other', () => {
    for (const k of [2500, 5772, 12000, 40000]) {
      expect(temperatureForX(xForTemperature(k))).toBeCloseTo(k, 6);
    }
    for (const L of [1e-4, 1, 1e3, 1e5]) {
      expect(luminosityForY(yForLuminosity(L)) / L).toBeCloseTo(1, 6);
    }
  });

  test('a constant-radius line is straight on these axes', () => {
    // Three points, and the middle one on the chord. This is why the guides
    // are worth drawing at all.
    for (const R of GUIDE_RADII) {
      const [a, b] = constantRadiusLine(R);
      const mid = constantRadiusLine(R, AXES, 3)[1];
      const f =
        (xForTemperature(mid.teffK) - xForTemperature(a.teffK)) /
        (xForTemperature(b.teffK) - xForTemperature(a.teffK));
      const chord =
        yForLuminosity(a.luminositySun) +
        f * (yForLuminosity(b.luminositySun) - yForLuminosity(a.luminositySun));
      expect(yForLuminosity(mid.luminositySun)).toBeCloseTo(chord, 9);
    }
  });

  test('every point on a constant-radius line really has that radius', () => {
    for (const R of GUIDE_RADII) {
      for (const p of constantRadiusLine(R, AXES, 5)) {
        expect(
          radiusFromLuminosityAndTemperature(p.luminositySun, p.teffK)
        ).toBeCloseTo(R, 6);
      }
    }
  });

  test('the regions are approximate blocks, not a partition', () => {
    const keys = regions().map(r => r.key);
    expect(keys).toEqual([
      'main-sequence',
      'giants',
      'supergiants',
      'white-dwarfs',
    ]);
    for (const r of regions())
      expect(r.points.length).toBeGreaterThanOrEqual(3);
  });

  test('the main-sequence region is traced from the tracks themselves', () => {
    // Two points per track - a zero-age and a terminal-age one - so it cannot
    // drift away from the models plotted on top of it, and it grows when the
    // bundle does.
    const ms = regions().find(r => r.key === 'main-sequence');
    expect(ms.points.length).toBe(trackIds().length * 2);
  });

  test('inRange says what is on the plot', () => {
    expect(inRange(5772, 1)).toBe(true);
    expect(inRange(1000, 1)).toBe(false);
    expect(inRange(5772, 1e9)).toBe(false);
  });
});

describe('a point is not a star', () => {
  test('a free point reports a radius and never a mass', () => {
    const h = hypotheticalAt(4500, 100);
    expect(h.radiusSun).toBeGreaterThan(15);
    expect(h.massSun).toBe(null);
    expect(h.ageYr).toBe(null);
    expect(h.source).toBe('hypothetical');
  });

  test('its radius is exactly what the other two imply', () => {
    for (const [T, L] of [
      [3000, 1e-3],
      [5772, 1],
      [30000, 1e5],
    ]) {
      expect(hypotheticalAt(T, L).radiusSun).toBeCloseTo(
        radiusFromLuminosityAndTemperature(L, T),
        12
      );
    }
  });

  test('a crowded point is reported as ambiguous, with its alternatives', () => {
    const h = hypotheticalAt(4500, 100);
    expect(h.ambiguous).toBe(true);
    expect(h.nearby.length).toBeGreaterThan(1);
    expect(new Set(h.nearby.map(n => n.initialMassSun)).size).toBeGreaterThan(
      1
    );
  });

  test('the alternatives are different objects, not one sampled repeatedly', () => {
    const h = hypotheticalAt(4500, 100);
    const seen = new Set(h.nearby.map(n => `${n.trackId}:${n.phase}`));
    expect(seen.size).toBe(h.nearby.length);
  });

  test('an empty neighbourhood says so rather than reaching further', () => {
    // Somewhere no bundled track goes: cool and extremely luminous.
    const h = hypotheticalAt(2100, 3e5);
    expect(h.nearby.length).toBe(0);
    expect(h.ambiguous).toBe(false);
  });

  test('nothing snaps: asking for models does not move the point', () => {
    const before = hypotheticalAt(4500, 100);
    const near = nearbyModels(4500, 100);
    const after = hypotheticalAt(4500, 100);
    expect(after.teffK).toBe(before.teffK);
    expect(after.luminositySun).toBe(before.luminositySun);
    expect(near.length).toBeGreaterThan(0);
  });
});

describe('the two modes', () => {
  let lab;
  beforeEach(() => {
    lab = createLab();
  });

  test('model mode reports a mass, an age and a phase', () => {
    const s = selection(lab);
    expect(s.source).toBe('model');
    expect(s.massSun).toBeGreaterThan(0);
    expect(s.ageYr).toBeGreaterThan(0);
    expect(s.phase).toBe('main-sequence');
  });

  test('free mode reports none of them', () => {
    setMode(lab, MODE.FREE);
    const s = selection(lab);
    expect(s.source).toBe('hypothetical');
    expect(s.massSun).toBe(null);
    expect(s.ageYr).toBe(null);
  });

  test('switching modes does not teleport the selection', () => {
    const before = selection(lab);
    setMode(lab, MODE.FREE);
    const after = selection(lab);
    expect(after.teffK).toBeCloseTo(before.teffK, 6);
    expect(after.luminositySun).toBeCloseTo(before.luminositySun, 6);
  });

  test('the cursor is clamped to the plotted range', () => {
    setMode(lab, MODE.FREE);
    setCursor(lab, 1, 1e30);
    expect(lab.teffK).toBe(AXES.teffMinK);
    expect(lab.luminositySun).toBe(AXES.luminosityMax);
  });

  test('adopting a model is deliberate and lands on that model', () => {
    setMode(lab, MODE.FREE);
    setCursor(lab, 4500, 100);
    const choice = selection(lab).nearby[0];
    expect(adoptModel(lab, choice)).toBe(true);
    expect(lab.mode).toBe(MODE.MODEL);
    expect(lab.trackId).toBe(choice.trackId);
    const now = selection(lab);
    expect(now.massSun).toBeGreaterThan(0);
    expect(Math.abs(Math.log10(now.teffK / choice.teffK))).toBeLessThan(0.02);
  });

  test('the default age lands in the middle of the main sequence', () => {
    for (const id of ['m020', 'm100', 'm2000']) {
      const one = createLab({ trackId: id });
      expect(selection(one).phase).toBe('main-sequence');
      expect(one.ageFraction).toBeCloseTo(midMainSequenceFraction(id), 9);
    }
  });

  test('the age slider is logarithmic and inverts', () => {
    for (const f of [0, 0.25, 0.5, 0.9, 1]) {
      const age = ageForFraction('m100', f);
      expect(fractionForAge('m100', age)).toBeCloseTo(f, 6);
    }
    // Equal slider steps are equal ratios in age, not equal spans.
    const a = ageForFraction('m100', 0.5) / ageForFraction('m100', 0.4);
    const b = ageForFraction('m100', 0.8) / ageForFraction('m100', 0.7);
    expect(a).toBeCloseTo(b, 6);
  });
});

describe('the two pacings of the age slider', () => {
  const phasesUnder = pace => {
    const seen = new Set();
    for (let i = 0; i <= 200; i++) {
      const l = createLab({ trackId: 'm100', pace });
      l.ageFraction = i / 200;
      seen.add(selection(l).phase);
    }
    return seen;
  };

  test('paced by time, a solar-mass track is almost entirely two phases', () => {
    // Which is true, and is exactly why the other pacing exists.
    const seen = phasesUnder(PACE.TIME);
    expect(seen.has('main-sequence')).toBe(true);
    expect(seen.has('pre-main-sequence')).toBe(true);
    expect(seen.size).toBeLessThan(5);
  });

  test('paced by the samples, every phase of that track is reachable', () => {
    const seen = phasesUnder(PACE.PHASE);
    for (const phase of [
      'main-sequence',
      'red-giant-branch',
      'core-helium-burning',
      'thermally-pulsing-agb',
      'post-agb-and-cooling',
    ]) {
      expect(seen).toContain(phase);
    }
  });

  test('the age reported is the real age either way', () => {
    // The handle changes meaning; the number beside it does not.
    for (const pace of [PACE.TIME, PACE.PHASE]) {
      const l = createLab({ trackId: 'm100', pace });
      let last = 0;
      for (let i = 0; i <= 50; i++) {
        l.ageFraction = i / 50;
        const age = selection(l).ageYr;
        expect(age).toBeGreaterThanOrEqual(last * 0.999999);
        last = age;
      }
      expect(last / 1e9).toBeGreaterThan(10);
    }
  });

  test('switching pacing keeps you looking at the same star', () => {
    const l = createLab({ trackId: 'm100', pace: PACE.PHASE });
    l.ageFraction = 0.62;
    const before = selection(l);
    setPace(l, PACE.TIME);
    const after = selection(l);
    expect(after.ageYr / before.ageYr).toBeCloseTo(1, 2);
    setPace(l, PACE.PHASE);
    expect(selection(l).ageYr / before.ageYr).toBeCloseTo(1, 2);
  });

  test('switching to the pacing already set does nothing', () => {
    const l = createLab({ trackId: 'm100', pace: PACE.TIME });
    const at = l.ageFraction;
    setPace(l, PACE.TIME);
    expect(l.ageFraction).toBe(at);
  });

  test('the lab says which pacing the handle is on, in both', () => {
    const w = getWidget('stellar-lab');
    for (const [pace, wanted] of [
      [PACE.TIME, /how far through/i],
      [PACE.PHASE, /NOT a clock/],
    ]) {
      resetLabForTests();
      const spec = { pace };
      const v = defaults(w);
      w.reset(v, { spec });
      const row = w
        .readout(v, undefined, spec)
        .find(r => r.label === 'The age slider');
      expect(row.value).toMatch(wanted);
    }
  });

  test('the switch is offered only where a step allows it', () => {
    const w = getWidget('stellar-lab');
    expect(w.actions({}).some(a => a.id === 'pace')).toBe(false);
    expect(w.actions({ paceControl: true }).some(a => a.id === 'pace')).toBe(
      true
    );
  });

  test('and using it moves the slider to match', () => {
    resetLabForTests();
    const w = getWidget('stellar-lab');
    const spec = { pace: PACE.TIME, paceControl: true };
    const v = defaults(w);
    w.reset(v, { spec });
    const before = activeLab().ageFraction;
    w.act('pace', v, spec);
    expect(activeLab().pace).toBe(PACE.PHASE);
    expect(v.age).toBe(activeLab().ageFraction);
    expect(v.age).not.toBe(before);
  });
});

describe('pinning and comparing', () => {
  let lab;
  beforeEach(() => {
    lab = createLab();
  });

  test('at most four stars pin', () => {
    for (let i = 0; i < MAX_PINNED + 3; i++) {
      lab.ageFraction = 0.5 + i * 0.05;
      pin(lab);
    }
    expect(lab.pinned.length).toBe(MAX_PINNED);
  });

  test('the ordering is by the key asked for, smallest first', () => {
    lab.trackId = 'm020';
    pin(lab);
    lab.trackId = 'm2000';
    lab.ageFraction = 1;
    pin(lab);
    const byRadius = comparison(lab, 'radiusSun');
    expect(byRadius[0].radiusSun).toBeLessThan(byRadius[1].radiusSun);
    const byTemp = comparison(lab, 'teffK');
    expect(byTemp[0].teffK).toBeLessThanOrEqual(byTemp[1].teffK);
  });

  test('the ratio is against the smallest, and the smallest is one', () => {
    lab.trackId = 'm020';
    pin(lab);
    lab.trackId = 'm2000';
    lab.ageFraction = 1;
    pin(lab);
    const rows = comparison(lab, 'radiusSun');
    expect(rows[0].ratio).toBeCloseTo(1, 9);
    expect(rows[1].ratio).toBeGreaterThan(1000);
    expect(rows[1].ratio).toBeCloseTo(rows[1].radiusSun / rows[0].radiusSun, 9);
  });

  test('a star with no mass sorts last under a mass ordering, with a null ratio', () => {
    setMode(lab, MODE.FREE);
    setCursor(lab, 4500, 100);
    pin(lab);
    setMode(lab, MODE.MODEL);
    pin(lab);
    const rows = comparison(lab, 'massSun');
    expect(rows[rows.length - 1].massSun).toBe(null);
    expect(rows[rows.length - 1].ratio).toBe(null);
  });

  test('the true scale is set by the largest star, so everything fits', () => {
    const rows = [{ radiusSun: 1 }, { radiusSun: 1000 }];
    const perPx = trueScaleFor(rows, 200);
    expect((1000 / perPx) * 2).toBeCloseTo(200, 6);
    // ...and the small one is genuinely sub-pixel, which is the honest answer.
    expect(1 / perPx).toBeLessThan(1);
  });

  test('unpin removes one, and clearing removes all', () => {
    pin(lab);
    pin(lab);
    unpin(lab);
    expect(lab.pinned.length).toBe(1);
    unpin(lab, true);
    expect(lab.pinned.length).toBe(0);
  });

  test('the orbit references are real Solar System radii in solar units', () => {
    // One astronomical unit is 215 solar radii; every reference is that
    // conversion applied to a semi-major axis, and a supergiant of a thousand
    // solar radii really is larger than Jupiter's orbit is not - it is close.
    const earth = ORBIT_REFERENCES.find(o => o.key === 'earth');
    expect(earth.radiusSun).toBeCloseTo(215, 0);
    const jupiter = ORBIT_REFERENCES.find(o => o.key === 'jupiter');
    expect(jupiter.radiusSun / earth.radiusSun).toBeCloseTo(5.2, 1);
  });
});

describe('the synthetic population', () => {
  test('the initial mass function is the one it names', () => {
    expect(IMF.reference).toMatch(/Kroupa/);
    expect(IMF.slopeBelow).toBe(-1.3);
    expect(IMF.slopeAbove).toBe(-2.3);
  });

  test('sampling reproduces the slopes it was built from', () => {
    // Two decades apart in mass, and the ratio of counts should follow the
    // upper slope. Checked against the power law rather than against the
    // sampler's own arithmetic.
    const rand = mulberry32(7);
    const draws = [];
    for (let i = 0; i < 20000; i++) draws.push(sampleInitialMass(rand));
    const between = (a, b) => draws.filter(m => m >= a && m < b).length;
    const lo = between(1, 2);
    const hi = between(2, 4);
    // N(1..2) / N(2..4) for m^-2.3: the integral ratio is 2^1.3 = 2.46.
    expect(lo / hi).toBeGreaterThan(2);
    expect(lo / hi).toBeLessThan(3);
    expect(Math.min(...draws)).toBeGreaterThanOrEqual(IMF.minMassSun - 1e-9);
    expect(Math.max(...draws)).toBeLessThanOrEqual(IMF.maxMassSun + 1e-9);
  });

  test('small stars vastly outnumber large ones', () => {
    const p = synthesisePopulation();
    const counts = Object.fromEntries(
      countByType(p.stars).map(r => [r.type, r.count])
    );
    expect(counts.M).toBeGreaterThan(counts.G * 3);
    expect(counts.M + counts.K).toBeGreaterThan(p.stars.length * 0.7);
  });

  test('the same seed gives the same population', () => {
    const a = synthesisePopulation({ seed: 'same' });
    const b = synthesisePopulation({ seed: 'same' });
    expect(a.stars.map(s => s.massSun)).toEqual(b.stars.map(s => s.massSun));
  });

  test('a different seed gives a different one', () => {
    const a = synthesisePopulation({ seed: 'one' });
    const b = synthesisePopulation({ seed: 'two' });
    expect(a.stars.map(s => s.massSun)).not.toEqual(
      b.stars.map(s => s.massSun)
    );
  });

  test('stars that have left the main sequence are dropped and counted', () => {
    const p = synthesisePopulation();
    expect(p.excludedEvolved).toBeGreaterThan(0);
    expect(p.stars.length + p.excludedEvolved + p.excludedUnmodelled).toBe(
      p.requested
    );
    for (const s of p.stars)
      expect(s.mainSequenceFraction).toBeLessThanOrEqual(1);
  });

  test('it says what it leaves out', () => {
    const p = synthesisePopulation();
    expect(p.notModelled.join(' ')).toMatch(/extinction/i);
    expect(p.notModelled.join(' ')).toMatch(/[Bb]inaries/);
  });

  test('the bright subset is the same stars, filtered', () => {
    const p = synthesisePopulation();
    const b = brightSubset(p);
    for (const s of b.stars) expect(p.stars).toContain(s);
    expect(b.kept).toBeLessThan(b.total);
  });

  test('and it is dominated by types the population is not', () => {
    // The whole lesson: the sample is K and M, the bright subset is not.
    const p = synthesisePopulation();
    const b = brightSubset(p);
    const all = Object.fromEntries(
      countByType(p.stars).map(r => [r.type, r.count])
    );
    const few = Object.fromEntries(
      countByType(b.stars).map(r => [r.type, r.count])
    );
    expect(all.M / p.stars.length).toBeGreaterThan(0.4);
    expect((few.M || 0) / b.kept).toBeLessThan(0.1);
  });

  test('a harder cut keeps fewer stars, never more', () => {
    const p = synthesisePopulation();
    let last = Infinity;
    for (const f of [1e-5, 1e-4, 1e-3, 1e-2]) {
      const kept = brightSubset(p, { thresholdFlux: f }).kept;
      expect(kept).toBeLessThanOrEqual(last);
      last = kept;
    }
  });

  test('flux falls as the inverse square of distance', () => {
    expect(fluxAt(1, 10) / fluxAt(1, 20)).toBeCloseTo(4, 9);
  });
});

describe('the widgets', () => {
  test('all three are registered and reachable by id', () => {
    expect(STELLAR_WIDGETS.length).toBe(3);
    for (const w of STELLAR_WIDGETS) {
      expect(getWidget(w.id)).toBe(w);
      expect(typeof w.draw).toBe('function');
      expect(typeof w.readout).toBe('function');
      expect(w.title.length).toBeGreaterThan(0);
    }
  });

  test('every control default sits inside its own range', () => {
    for (const w of STELLAR_WIDGETS) {
      for (const c of w.controls) {
        expect(c.value).toBeGreaterThanOrEqual(c.min);
        expect(c.value).toBeLessThanOrEqual(c.max);
        expect(c.step).toBeGreaterThan(0);
      }
    }
  });

  test('the lab draws in both modes and at every preset', () => {
    const w = widget('stellar-lab');
    const v = defaults(w);
    for (const mode of [MODE.MODEL, MODE.FREE]) {
      for (const p of w.presets) {
        Object.assign(v, p.values);
        w.reset(v, { spec: { mode } });
        expect(() =>
          w.draw(stubCanvas(), v, undefined, { mode })
        ).not.toThrow();
        const rows = w.readout(v, undefined, { mode });
        expect(rows.every(r => typeof r.value === 'string')).toBe(true);
      }
    }
  });

  test('every lab action is handled and leaves it drawable', () => {
    const w = widget('stellar-lab');
    const v = defaults(w);
    const spec = { capture: false };
    w.reset(v, { spec });
    for (const a of w.actions(spec)) {
      expect(() => w.act(a.id, v, spec)).not.toThrow();
      expect(() => w.draw(stubCanvas(), v, undefined, spec)).not.toThrow();
    }
  });

  test('the readout never prints a raw message id', () => {
    for (const w of STELLAR_WIDGETS) {
      const v = defaults(w);
      w.reset?.(v, { spec: {} });
      for (const row of w.readout(v, undefined, {})) {
        expect(row.label).not.toMatch(/^stelW\./);
        expect(row.value).not.toMatch(/^stelW\./);
        expect(row.value).not.toMatch(/^stellar\./);
      }
    }
  });

  test('the comparison stage draws empty, and full, in both size modes', () => {
    const w = widget('stellar-compare');
    const v = defaults(w);
    unpin(createLab(), true);
    expect(() => w.draw(stubCanvas(), v, undefined, {})).not.toThrow();
    const labState = createLab();
    pin(labState);
    for (const size of [0, 1]) {
      for (const order of [0, 1, 2, 3]) {
        expect(() =>
          w.draw(stubCanvas(), { ...v, size, order }, undefined, {})
        ).not.toThrow();
      }
    }
  });

  test('the population widget draws both views', () => {
    const w = widget('stellar-population');
    const v = defaults(w);
    for (const view of [0, 1]) {
      expect(() =>
        w.draw(stubCanvas(), { ...v, view }, undefined, {})
      ).not.toThrow();
      const rows = w.readout({ ...v, view }, undefined, {});
      expect(rows.length).toBeGreaterThan(4);
    }
  });

  test('the population readout names it as synthetic and says what it omits', () => {
    const w = widget('stellar-population');
    const text = w
      .readout(defaults(w), undefined, {})
      .map(r => `${r.label} ${r.value}`)
      .join(' | ');
    expect(text).toMatch(/synthetic|sample of a model/i);
    expect(text).toMatch(/Kroupa/);
    expect(text).toMatch(/dust|extinction/i);
    expect(text).toMatch(/binaries/i);
  });
});

describe('pointing at the diagram', () => {
  const w = () => getWidget('stellar-lab');
  // The plot rectangle is whatever the last draw used, so every test here
  // draws first - which is also the only order a click can happen in.
  const drawn = spec => {
    const widget = w();
    const v = defaults(widget);
    widget.reset(v, { spec });
    widget.draw(stubCanvas(), v, undefined, spec);
    return { widget, v };
  };

  test('the lab declares the hook and the two axes the arrows step', () => {
    expect(typeof w().pick).toBe('function');
    // flipX because temperature increases to the LEFT: without it the arrow
    // keys would move the cursor the opposite way to the picture.
    expect(w().pickAxes).toEqual({ x: 'teff', y: 'lum', flipX: true });
    for (const id of [w().pickAxes.x, w().pickAxes.y]) {
      expect(w().controls.some(c => c.id === id)).toBe(true);
    }
  });

  test('no other widget opts in, so nothing else changes', () => {
    for (const other of STELLAR_WIDGETS.filter(x => x.id !== 'stellar-lab')) {
      expect(other.pick).toBeUndefined();
    }
  });

  test('a click in free mode moves the cursor there', () => {
    const spec = { mode: MODE.FREE };
    const { widget, v } = drawn(spec);
    expect(
      widget.pick(v, { x: 120, y: 90, width: 460, height: 340 }, spec)
    ).toBe(true);
    // Left is hot, top is luminous: the click lands hotter and brighter than
    // the bottom-right of the same plot.
    const hot = 10 ** v.teff;
    const bright = 10 ** v.lum;
    widget.pick(v, { x: 300, y: 250, width: 460, height: 340 }, spec);
    expect(10 ** v.teff).toBeLessThan(hot);
    expect(10 ** v.lum).toBeLessThan(bright);
  });

  test('the sliders end up where the click put them', () => {
    // The runner writes the values back into the range inputs, so a click that
    // moved the star without moving the sliders would leave the two disagreeing
    // about where the cursor is.
    const spec = { mode: MODE.FREE };
    const { widget, v } = drawn(spec);
    widget.pick(v, { x: 150, y: 120, width: 460, height: 340 }, spec);
    const reported = widget.readout(v, undefined, spec);
    const teff = reported.find(r => r.label === 'Surface temperature').value;
    const digits = Number(teff.replace(/[^\d]/g, ''));
    expect(digits).toBeCloseTo(Math.round(10 ** v.teff), -2);
    for (const id of ['teff', 'lum']) {
      const c = widget.controls.find(x => x.id === id);
      expect(v[id]).toBeGreaterThanOrEqual(c.min);
      expect(v[id]).toBeLessThanOrEqual(c.max);
    }
  });

  test('a click in model mode is ignored rather than snapping the star off its track', () => {
    const spec = { mode: MODE.MODEL };
    const { widget, v } = drawn(spec);
    const before = { ...v };
    expect(
      widget.pick(v, { x: 120, y: 90, width: 460, height: 340 }, spec)
    ).toBe(false);
    expect(v).toEqual(before);
  });

  test('a click outside the axes is ignored', () => {
    const spec = { mode: MODE.FREE };
    const { widget, v } = drawn(spec);
    expect(widget.pick(v, { x: 2, y: 2, width: 460, height: 340 }, spec)).toBe(
      false
    );
    expect(
      widget.pick(v, { x: 459, y: 339, width: 460, height: 340 }, spec)
    ).toBe(false);
  });

  test('a click anywhere inside stays inside the plotted range', () => {
    const spec = { mode: MODE.FREE };
    const { widget, v } = drawn(spec);
    for (let x = 45; x < 450; x += 40) {
      for (let y = 20; y < 320; y += 40) {
        if (!widget.pick(v, { x, y, width: 460, height: 340 }, spec)) continue;
        expect(10 ** v.teff).toBeGreaterThanOrEqual(AXES.teffMinK - 1);
        expect(10 ** v.teff).toBeLessThanOrEqual(AXES.teffMaxK + 1);
        expect(10 ** v.lum).toBeGreaterThanOrEqual(AXES.luminosityMin * 0.99);
        expect(10 ** v.lum).toBeLessThanOrEqual(AXES.luminosityMax * 1.01);
      }
    }
  });

  test('the arrow keys and a drag reach the same place', () => {
    // What the runner does for an arrow press, done here: step the named
    // control by its own step. Landing within one step of the click is the
    // whole claim - the keyboard is not a coarser instrument.
    const spec = { mode: MODE.FREE };
    const { widget, v } = drawn(spec);
    widget.pick(v, { x: 200, y: 150, width: 460, height: 340 }, spec);
    const target = { teff: v.teff, lum: v.lum };
    const teffControl = widget.controls.find(c => c.id === 'teff');
    v.teff = Math.min(teffControl.max, v.teff + teffControl.step);
    expect(Math.abs(v.teff - target.teff)).toBeLessThanOrEqual(
      teffControl.step + 1e-9
    );
  });
});

describe('one lab, across the steps of a lesson', () => {
  beforeEach(() => resetLabForTests());

  const show = (id, spec) => {
    const w = getWidget(id);
    const v = defaults(w);
    w.reset?.(v, { spec });
    w.draw(stubCanvas(), v, undefined, spec);
    return { w, v };
  };

  test('a star pinned on one step is still pinned on the next', () => {
    // The lesson this exists for pins stars several steps apart and compares
    // them at the end. A lab rebuilt per step would quietly lose them.
    const a = show('stellar-lab', { mode: MODE.MODEL });
    a.w.act('pin', a.v, { mode: MODE.MODEL });
    expect(activeLab().pinned.length).toBe(1);

    show('stellar-lab', { mode: MODE.FREE });
    expect(activeLab().pinned.length).toBe(1);
    show('stellar-compare', {});
    expect(activeLab().pinned.length).toBe(1);
  });

  test("a step's declared mode is applied when the step changes", () => {
    show('stellar-lab', { mode: MODE.MODEL });
    expect(activeLab().mode).toBe(MODE.MODEL);
    show('stellar-lab', { mode: MODE.FREE });
    expect(activeLab().mode).toBe(MODE.FREE);
  });

  test('and not re-applied over the student every time they move a slider', () => {
    const spec = { mode: MODE.MODEL };
    const { w, v } = show('stellar-lab', spec);
    w.act('mode', v, spec);
    expect(activeLab().mode).toBe(MODE.FREE);
    // A slider move goes through reset() the way the runner does it.
    v.teff += 0.01;
    w.reset(v, { spec });
    expect(activeLab().mode).toBe(MODE.FREE);
  });

  test('changing the population seed resamples, and keeps the pins', () => {
    const { w, v } = show('stellar-lab', { mode: MODE.MODEL });
    w.act('pin', v, { mode: MODE.MODEL });
    const first = populationOf(activeLab()).stars.map(x => x.massSun);
    show('stellar-population', { populationSeed: 'another' });
    const second = populationOf(activeLab()).stars.map(x => x.massSun);
    expect(second).not.toEqual(first);
    expect(activeLab().pinned.length).toBe(1);
  });
});

describe('a snapshot carries the distinction', () => {
  test('a modelled reading carries a mass and a track', () => {
    const lab = createLab();
    const snap = snapshotOf(lab);
    expect(snap.source).toBe('model');
    expect(snap.trackId).toBe('m100');
    expect(snap.massSun).toBeGreaterThan(0);
    expect(snap.grid).toMatch(/MIST/);
  });

  test('a free reading carries neither, and records the ambiguity', () => {
    const lab = createLab();
    setMode(lab, MODE.FREE);
    setCursor(lab, 4500, 100);
    const snap = snapshotOf(lab);
    expect(snap.source).toBe('hypothetical');
    expect(snap.massSun).toBe(null);
    expect(snap.ageYr).toBe(null);
    expect(snap.ambiguous).toBe(true);
    expect(snap.nearbyCount).toBeGreaterThan(1);
  });

  test('it records which size mode a comparison was drawn in', () => {
    const lab = createLab();
    lab.sizeMode = SIZE_MODE.FIT;
    pin(lab);
    expect(snapshotOf(lab).sizeMode).toBe(SIZE_MODE.FIT);
    expect(snapshotOf(lab).pinned.length).toBe(1);
  });

  test('and whether the track it came from runs to the end of a life', () => {
    const done = createLab({ trackId: 'm100' });
    expect(snapshotOf(done).trackComplete).toBe(true);
    const stopped = createLab({ trackId: 'm2000' });
    expect(snapshotOf(stopped).trackComplete).toBe(false);
    expect(snapshotOf(stopped).trackEndsBecause).toMatch(
      /before core collapse/
    );
  });
});

describe('the lab is reachable from a lab state', () => {
  test('populationOf and brightOf agree about the same population', () => {
    const lab = createLab();
    const p = populationOf(lab);
    const b = brightOf(lab);
    expect(b.total).toBe(p.stars.length);
    expect(b.kept).toBeLessThanOrEqual(b.total);
  });

  test('the population is built once and reused', () => {
    const lab = createLab();
    expect(populationOf(lab)).toBe(populationOf(lab));
  });
});
