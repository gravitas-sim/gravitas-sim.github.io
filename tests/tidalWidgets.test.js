import { describe, test, expect } from '@jest/globals';
import { TIDAL_WIDGETS } from '../js/tidalWidgets.js';
import { getWidget, widgetDefaults } from '../js/widgets.js';
import { getInvestigation } from '../js/data/investigations.js';
import {
  MOON_MASS_KG,
  MOON_DISTANCE_M,
  EARTH_RADIUS_M,
  EARTH_MASS_KG,
  SATURN_RADIUS_M,
  SATURN_MASS_KG,
  MOON_RADIUS_M,
  tidalAcceleration,
  rocheLimitRigid,
  massFromDensity,
} from '../js/tidalPhysics.js';

const widget = id => TIDAL_WIDGETS.find(w => w.id === id);

/**
 * A widget's presets, resolved the way the engine resolves them.
 *
 * One panel here declares presets as a function of the step, so that a step
 * holding the density fixed does not also offer buttons that change it.
 *
 * @param {Object} w - A widget
 * @param {Object} [spec] - A step's tool spec
 * @returns {Array} Presets
 */
const presetsOf = (w, spec = {}) =>
  (typeof w.presets === 'function' ? w.presets(spec) : w.presets) || [];

/** Every spec shape any tides step passes to a widget. */
const SPECS = [
  {},
  { residual: true },
  { axis: 'distance' },
  { axis: 'mass' },
  { hide: ['mass'] },
  { hide: ['dist'] },
  { hide: ['density'] },
];

describe('the instruments', () => {
  test('every one is registered and reachable by id', () => {
    for (const w of TIDAL_WIDGETS) {
      expect(getWidget(w.id)).toBe(w);
      expect(typeof w.draw).toBe('function');
      expect(typeof w.readout).toBe('function');
      expect(Array.isArray(w.controls)).toBe(true);
    }
  });

  test('ids are unique across the whole registry', () => {
    for (const w of TIDAL_WIDGETS) {
      expect(getWidget(w.id).id).toBe(w.id);
    }
    const ids = TIDAL_WIDGETS.map(w => w.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('every control declares a range its default sits inside', () => {
    for (const w of TIDAL_WIDGETS) {
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

  test('readouts survive both ends of every slider, under every spec', () => {
    for (const w of TIDAL_WIDGETS) {
      for (const end of ['min', 'max']) {
        for (const spec of SPECS) {
          const v = widgetDefaults(w);
          for (const c of w.controls) v[c.id] = c[end];
          const rows = w.readout(v, undefined, spec);
          expect(rows.length).toBeGreaterThan(0);
          for (const row of rows) {
            expect(typeof row.label).toBe('string');
            expect(String(row.value)).not.toMatch(/NaN|undefined|Infinity/);
            expect(String(row.value).length).toBeGreaterThan(0);
          }
        }
      }
    }
  });

  test('every preset only sets controls the widget has, within range', () => {
    for (const w of TIDAL_WIDGETS) {
      for (const p of presetsOf(w)) {
        expect(p.label).toBeTruthy();
        expect(p.note.length).toBeGreaterThan(20);
        for (const [key, value] of Object.entries(p.values)) {
          const c = w.controls.find(x => x.id === key);
          expect(c).toBeTruthy();
          expect(value).toBeGreaterThanOrEqual(c.min);
          expect(value).toBeLessThanOrEqual(c.max);
        }
      }
    }
  });

  test('a control that formats its own value never emits nonsense', () => {
    for (const w of TIDAL_WIDGETS) {
      for (const c of w.controls) {
        if (!c.format) continue;
        for (const x of [c.min, c.value, c.max]) {
          const text = String(c.format(x));
          expect(text.length).toBeGreaterThan(0);
          expect(text).not.toMatch(/NaN|undefined|Infinity/);
        }
      }
    }
  });
});

describe('the arrow panel, which is the lesson’s centrepiece', () => {
  const w = widget('tide-vectors');

  test('it agrees with the physics module rather than recomputing it', () => {
    const f = w.compute({ dist: 1, mass: 1 });
    expect(f.distanceM).toBeCloseTo(MOON_DISTANCE_M, 0);
    expect(f.massKg).toBeCloseTo(MOON_MASS_KG, 0);
    expect(f.approx).toBeCloseTo(
      tidalAcceleration(MOON_MASS_KG, MOON_DISTANCE_M, EARTH_RADIUS_M),
      12
    );
  });

  test('the raw readout reports the seven percent step 4 grades', () => {
    const rows = w.readout({ dist: 1, mass: 1 }, undefined, {});
    const last = rows.at(-1);
    expect(last.label).toMatch(/near side bigger/i);
    expect(last.value).toBe('6.9%');
  });

  test('the residual readout names the two directions explicitly', () => {
    // Step 7 is graded on the far side being pulled less rather than pushed,
    // so the words "toward" and "away" have to be the ones on the panel.
    const rows = w.readout({ dist: 1, mass: 1 }, undefined, { residual: true });
    const near = rows.find(r => /near side, minus/i.test(r.label));
    const far = rows.find(r => /far side, minus/i.test(r.label));
    expect(near.value).toMatch(/toward$/);
    expect(far.value).toMatch(/away$/);
  });

  test('the far-side residual is reported as a positive size, not a minus sign', () => {
    const rows = w.readout({ dist: 0.4, mass: 3 }, undefined, {
      residual: true,
    });
    const far = rows.find(r => /far side, minus/i.test(r.label));
    expect(far.value).not.toMatch(/[-−]/);
  });

  test('the three pulls stay ordered at every slider position', () => {
    for (let d = 0.2; d <= 2.0001; d += 0.05) {
      for (const mass of [0.25, 1, 4]) {
        const f = w.compute({ dist: d, mass });
        expect(f.near).toBeGreaterThan(f.centre);
        expect(f.centre).toBeGreaterThan(f.far);
        expect(f.far).toBeGreaterThan(0);
      }
    }
  });

  test('at the closest setting the arrows really do separate visibly', () => {
    // Step 3’s tip tells students to slide down to 0.2 and watch that happen.
    const close = w.compute({ dist: 0.2, mass: 1 });
    expect(close.near / close.far).toBeGreaterThan(1.35);
  });
});

describe('the strength panel', () => {
  const w = widget('tide-strength');

  test('the real Moon reads exactly one, which is the panel’s unit', () => {
    expect(w.compute({ dist: 1, mass: 1 }).relative).toBeCloseTo(1, 12);
  });

  test('it produces the readings the measure steps are validated against', () => {
    const rel = (dist, mass = 1) => w.compute({ dist, mass }).relative;
    expect(rel(2)).toBeCloseTo(0.125, 10);
    expect(rel(0.5)).toBeCloseTo(8, 10);
    expect(rel(0.25)).toBeCloseTo(64, 10);
    expect(rel(1, 2)).toBeCloseTo(2, 10);
    expect(rel(1, 4)).toBeCloseTo(4, 10);
  });

  test('the axis spec decides which slider the readout names', () => {
    const v = { dist: 1, mass: 1 };
    const dist = w.readout(v, undefined, { axis: 'distance' });
    const mass = w.readout(v, undefined, { axis: 'mass' });
    expect(dist.some(r => /^Distance$/.test(r.label))).toBe(true);
    expect(dist.some(r => /^Mass$/.test(r.label))).toBe(false);
    expect(mass.some(r => /^Mass$/.test(r.label))).toBe(true);
    expect(mass.some(r => /^Distance$/.test(r.label))).toBe(false);
  });

  test('the four suggested distances are all reachable on the slider', () => {
    const c = w.controls.find(x => x.id === 'dist');
    for (const d of [2, 1, 0.5, 0.25]) {
      expect(d).toBeGreaterThanOrEqual(c.min);
      expect(d).toBeLessThanOrEqual(c.max);
      // And each lands on a step, so a student can actually stop there.
      const steps = (d - c.min) / c.step;
      expect(Math.abs(steps - Math.round(steps))).toBeLessThan(1e-6);
    }
  });

  test('the three suggested masses are all reachable on the slider', () => {
    const c = w.controls.find(x => x.id === 'mass');
    for (const m of [1, 2, 4]) {
      expect(m).toBeGreaterThanOrEqual(c.min);
      expect(m).toBeLessThanOrEqual(c.max);
      const steps = (m - c.min) / c.step;
      expect(Math.abs(steps - Math.round(steps))).toBeLessThan(1e-6);
    }
  });
});

describe('the comparison chart', () => {
  const w = widget('tide-compare');

  test('the highlight slider covers every row and no more', () => {
    const c = w.controls.find(x => x.id === 'which');
    expect(c.min).toBe(0);
    expect(c.step).toBe(1);
    for (let i = c.min; i <= c.max; i++) {
      const rows = w.readout({ which: i });
      expect(rows[0].value.length).toBeGreaterThan(0);
      for (const r of rows) {
        expect(String(r.value)).not.toMatch(/NaN|undefined/);
      }
    }
    // One row past the end must not produce a blank panel.
    expect(w.readout({ which: c.max + 1 })[0].value.length).toBeGreaterThan(0);
  });

  test('the first row is the lunar tide and reads as one times itself', () => {
    const rows = w.readout({ which: 0 });
    expect(rows.at(-1).value).toBe('1.00×');
  });

  test('the slider formatter labels each row rather than showing an index', () => {
    const c = w.controls.find(x => x.id === 'which');
    for (let i = c.min; i <= c.max; i++) {
      expect(c.format(i)).toMatch(/→/);
    }
  });
});

describe('the balance panel', () => {
  const w = widget('tide-balance');

  test('grip depends only on the material, and stretch only on the distance', () => {
    // The tip on step 21 promises exactly this, because it is what makes the
    // competition easy to reason about.
    const a = w.compute({ dist: 2, density: 3300 });
    const b = w.compute({ dist: 5, density: 3300 });
    expect(a.grip).toBeCloseTo(b.grip, 12);
    expect(a.stretch).toBeGreaterThan(b.stretch);

    const c = w.compute({ dist: 5, density: 6000 });
    expect(c.stretch).toBeCloseTo(b.stretch, 12);
    expect(c.grip).toBeGreaterThan(b.grip);
  });

  test('the crossing point is the rigid Roche limit, not a separate number', () => {
    for (const density of [600, 3300, 6000]) {
      const f = w.compute({ dist: 3, density });
      // The panel's own limit is the one the physics module computes for the
      // body it is drawing, rather than a second number kept alongside it.
      expect(f.rigid).toBeCloseTo(
        rocheLimitRigid(EARTH_MASS_KG, f.mass, MOON_RADIUS_M),
        3
      );
      // And the two bars are exactly equal there, which is the definition.
      const atLimit = w.compute({ dist: f.rigid / EARTH_RADIUS_M, density });
      expect(atLimit.stretch / atLimit.grip).toBeCloseTo(1, 9);
    }
  });

  test('step 22’s graded answer is what the panel reports', () => {
    // The question accepts 1.5 +/- 0.2 Earth radii at the Moon’s density.
    const f = w.compute({ dist: 3, density: 3300 });
    const radii = f.rigid / EARTH_RADIUS_M;
    expect(radii).toBeGreaterThan(1.3);
    expect(radii).toBeLessThan(1.7);
  });

  test('the three presets each move the crossing point somewhere reachable', () => {
    const c = w.controls.find(x => x.id === 'dist');
    for (const p of presetsOf(w)) {
      const f = w.compute({ dist: 3, density: p.values.density });
      const radii = f.rigid / EARTH_RADIUS_M;
      expect(radii).toBeGreaterThanOrEqual(c.min);
      expect(radii).toBeLessThanOrEqual(c.max);
    }
  });

  test('the verdict runs through all three regimes across the slider', () => {
    const seen = new Set();
    for (let d = 1.2; d <= 6.0001; d += 0.05) {
      seen.add(w.compute({ dist: d, density: 3300 }).regime);
    }
    expect([...seen].sort()).toEqual(['deforming', 'disrupting', 'safe']);
  });

  test('the readout never rounds a small ratio away to zero', () => {
    const rows = w.readout({ dist: 6, density: 6000 });
    const ratio = rows.find(r => /stretch ÷ grip/i.test(r.label));
    expect(ratio.value).not.toBe('0.00');
    expect(Number(ratio.value.replace(/[^\d.]/g, ''))).toBeGreaterThan(0);
  });
});

describe('the Roche panel', () => {
  const w = widget('roche-model');

  test('the fluid limit is always outside the rigid one', () => {
    for (let d = 400; d <= 6000; d += 100) {
      const f = w.compute({ dist: 3, density: d });
      expect(f.fluidRadii).toBeGreaterThan(f.rigidRadii);
    }
  });

  test('both limits move inward as the moon gets denser', () => {
    // This is the whole content of step 24 and the graded claim at step 25.
    let lastFluid = Infinity;
    let lastRigid = Infinity;
    for (let d = 400; d <= 6000; d += 200) {
      const f = w.compute({ dist: 3, density: d });
      expect(f.fluidRadii).toBeLessThan(lastFluid);
      expect(f.rigidRadii).toBeLessThan(lastRigid);
      lastFluid = f.fluidRadii;
      lastRigid = f.rigidRadii;
    }
  });

  test('porous ice puts the rings inside the limit and Mimas outside it', () => {
    const f = w.compute({ dist: 3, density: 600 });
    const ringEdge = 1.3678e8 / SATURN_RADIUS_M;
    const mimas = 1.8552e8 / SATURN_RADIUS_M;
    expect(ringEdge).toBeLessThan(f.fluidRadii);
    expect(mimas).toBeGreaterThan(f.fluidRadii);
  });

  test('the readout quotes the ring edge and Mimas for that comparison', () => {
    const rows = w.readout({ dist: 3, density: 600 });
    expect(rows.some(r => /A ring/i.test(r.label))).toBe(true);
    expect(rows.some(r => /Mimas/i.test(r.label))).toBe(true);
  });

  test('a dense moon’s rigid limit falls inside Saturn, and that is reported', () => {
    // Step 24 asks students to find this. It must be reachable on the slider.
    const f = w.compute({ dist: 3, density: 6000 });
    expect(f.rigidRadii).toBeLessThan(1);
  });

  test('the verdict runs through all three regimes across the slider', () => {
    const seen = new Set();
    for (let d = 1.1; d <= 4.0001; d += 0.05) {
      seen.add(w.compute({ dist: d, density: 600 }).regime);
    }
    expect([...seen].sort()).toEqual(['deforming', 'disrupting', 'safe']);
  });

  test('the moon’s size does not change where it breaks', () => {
    // The tip on step 24 claims the satellite's radius cancels out, so the
    // representative radius the panel picks for its drawing cannot be
    // influencing the limits it reports.
    const limitFor = radius =>
      rocheLimitRigid(SATURN_MASS_KG, massFromDensity(900, radius), radius);
    const panel = w.compute({ dist: 3, density: 900 }).rigid;
    for (const radius of [5e3, 1e5, 2e5, 1e6]) {
      expect(limitFor(radius) / panel).toBeCloseTo(1, 9);
    }
  });
});

describe('the disruption panel', () => {
  const w = widget('tide-disrupt');

  test('the slider spans the crossover, so both verdicts are reachable', () => {
    const c = w.controls.find(x => x.id === 'logm');
    expect(w.compute({ logm: c.min }).disruptsOutside).toBe(true);
    expect(w.compute({ logm: c.max }).disruptsOutside).toBe(false);
  });

  test('the crossover really is inside the slider’s range', () => {
    const c = w.controls.find(x => x.id === 'logm');
    const crossover = Math.log10(w.compute({ logm: 1 }).crossover);
    expect(crossover).toBeGreaterThan(c.min);
    expect(crossover).toBeLessThan(c.max);
  });

  test('the ratio falls monotonically as the hole gets heavier', () => {
    let last = Infinity;
    for (let x = 0.5; x <= 9.0001; x += 0.1) {
      const r = w.compute({ logm: x }).ratio;
      expect(r).toBeLessThan(last);
      last = r;
    }
  });

  test('the three presets land where their notes claim', () => {
    const [stellar, sgrA, giant] = presetsOf(w);
    expect(w.compute(stellar.values).ratio).toBeCloseTo(6.4e4, -3);
    expect(w.compute(sgrA.values).ratio).toBeGreaterThan(9);
    expect(w.compute(sgrA.values).ratio).toBeLessThan(14);
    expect(w.compute(giant.values).disruptsOutside).toBe(false);
  });

  test('the verdict wording tells a student what an observer would see', () => {
    const shredded = w.readout({ logm: 1 }).at(-1).value;
    const swallowed = w.readout({ logm: 9 }).at(-1).value;
    expect(shredded).toMatch(/flare/i);
    expect(swallowed).toMatch(/whole/i);
  });
});

describe('the lesson and its instruments agree', () => {
  const inv = getInvestigation('tides');
  const stepFor = title => inv.steps.find(s => s.title === title);

  test('every tool a tides step names exists and is one of these', () => {
    const used = inv.steps.map(s => s.tool?.id).filter(Boolean);
    expect(used.length).toBeGreaterThan(0);
    for (const id of used) {
      expect(TIDAL_WIDGETS.some(w => w.id === id)).toBe(true);
    }
  });

  test('every value a step presets is a control that exists, in range', () => {
    for (const step of inv.steps) {
      if (!step.tool) continue;
      const w = getWidget(step.tool.id);
      for (const [key, value] of Object.entries(step.tool.values || {})) {
        const c = w.controls.find(x => x.id === key);
        expect(c).toBeTruthy();
        expect(value).toBeGreaterThanOrEqual(c.min);
        expect(value).toBeLessThanOrEqual(c.max);
      }
      for (const id of step.tool.hide || []) {
        expect(w.controls.some(c => c.id === id)).toBe(true);
      }
    }
  });

  test('every step’s own opening settings produce a clean readout', () => {
    for (const step of inv.steps) {
      if (!step.tool) continue;
      const w = getWidget(step.tool.id);
      const v = widgetDefaults(w, step.tool.values);
      for (const row of w.readout(v, undefined, step.tool)) {
        expect(String(row.value)).not.toMatch(/NaN|undefined|Infinity/);
      }
    }
  });

  test('the subtraction is shown only after the raw pulls have been', () => {
    // Step 6 is the reveal. A residual panel appearing before the raw one
    // would hand the student the answer to the step 5 prediction.
    const first = inv.steps.findIndex(
      s => s.tool?.id === 'tide-vectors' && !s.tool.residual
    );
    const reveal = inv.steps.findIndex(s => s.tool?.residual);
    expect(first).toBeGreaterThanOrEqual(0);
    expect(reveal).toBeGreaterThan(first);
    // And the prediction sits between them.
    const predict = inv.steps.findIndex(s => s.title === 'So why two bulges?');
    expect(predict).toBeGreaterThan(first);
    expect(predict).toBeLessThan(reveal);
  });

  test('the distance measurement comes before the expression is shown', () => {
    // Step 12 hands over 2GMR/d³ only after step 10 has measured the d³.
    const measure = inv.steps.findIndex(s => s.title === 'Four distances');
    const formula = inv.steps.findIndex(
      s => s.title === 'The relationship, written down'
    );
    expect(measure).toBeLessThan(formula);
  });

  test('the Roche limit is named only after it has been measured', () => {
    const balance = inv.steps.findIndex(
      s => s.title === 'Where the balance tips'
    );
    const named = inv.steps.findIndex(s => /The Roche limit/.test(s.title));
    expect(balance).toBeLessThan(named);
    // And the phrase does not appear in any step before the measurement.
    for (const step of inv.steps.slice(0, balance)) {
      expect(`${step.body} ${step.prompt || ''}`).not.toMatch(/Roche/);
    }
  });

  test('the numeric answers match what the instruments actually report', () => {
    const halving = stepFor('How steeply does it fall?');
    const w = widget('tide-strength');
    const measured =
      w.compute({ dist: 0.5, mass: 1 }).relative /
      w.compute({ dist: 1, mass: 1 }).relative;
    expect(Math.abs(measured - halving.answer)).toBeLessThan(halving.tolerance);

    const tips = stepFor('Where the balance tips');
    const balance = widget('tide-balance');
    const radii =
      balance.compute({ dist: 3, density: 3300 }).rigid / EARTH_RADIUS_M;
    expect(Math.abs(radii - tips.answer)).toBeLessThan(tips.tolerance);
  });

  test('the two scenarios the lesson loads are the ones it describes', () => {
    const scenarios = inv.steps.map(s => s.setup?.scenario).filter(Boolean);
    expect(scenarios[0]).toBe('Earth-Moon System');
    expect(scenarios.at(-1)).toBe('Tidal Disruption Event');
  });

  test('the lesson never claims Gravitas models fluids', () => {
    // The scientific-honesty requirement, enforced rather than trusted.
    const prose = inv.steps
      .map(s => [s.body, s.tip, s.because, s.rubric].filter(Boolean).join(' '))
      .join(' ');
    expect(prose).toMatch(/not.{0,40}(hydrodynamic|fluid)/i);
    expect(prose).not.toMatch(
      /we simulate the fluid|fluid dynamics are modell?ed/i
    );
  });

  test('it is the length of a full laboratory session', () => {
    expect(inv.steps.length).toBeGreaterThanOrEqual(24);
    expect(inv.steps.length).toBeLessThanOrEqual(32);
  });
});
