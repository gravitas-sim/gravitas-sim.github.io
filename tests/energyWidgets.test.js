import { describe, test, expect } from '@jest/globals';
import { escapeSpeed, circularSpeed, launchPath } from '../js/energyWidgets.js';
import { getWidget, widgetDefaults } from '../js/widgets.js';

const EARTH = { mass: 5.972e24, radius: 6.371e6 };
const TOWER = EARTH.radius * 1.05; // where the lesson's cannon sits
const fire = (kms, opts = {}) =>
  launchPath({
    mass: EARTH.mass,
    radius: EARTH.radius,
    r0: TOWER,
    v0: kms * 1000,
    ...opts,
  });

describe('escape and circular speed', () => {
  test('match the published values at the Earth’s surface', () => {
    expect(escapeSpeed(EARTH.mass, EARTH.radius) / 1000).toBeCloseTo(11.19, 1);
    expect(circularSpeed(EARTH.mass, EARTH.radius) / 1000).toBeCloseTo(7.91, 1);
  });

  test('escape is √2 times circular, everywhere', () => {
    for (const r of [EARTH.radius, 3 * EARTH.radius, 60 * EARTH.radius]) {
      expect(
        escapeSpeed(EARTH.mass, r) / circularSpeed(EARTH.mass, r)
      ).toBeCloseTo(Math.SQRT2, 9);
    }
  });

  test('falls off as one over the square root of distance', () => {
    const near = escapeSpeed(EARTH.mass, EARTH.radius);
    const far = escapeSpeed(EARTH.mass, 4 * EARTH.radius);
    // Four times further out is half the speed, which is the lesson's point
    // about starting further away.
    expect(far).toBeCloseTo(near / 2, 0);
  });

  test('does not depend on the escaping object at all', () => {
    // There is nowhere in the signature to put it, which is the whole reason
    // the lesson can say a grain of dust and a battleship need the same speed.
    expect(escapeSpeed.length).toBe(2);
  });
});

describe('the launch experiment', () => {
  test('a slow shot comes back down', () => {
    const p = fire(6);
    expect(p.impact).toBe(true);
    expect(p.bound).toBe(true);
    expect(p.energy).toBeLessThan(0);
  });

  test('a slow shot still travels far enough to be worth watching', () => {
    // Fired from the ground rather than the tower it buries itself in three
    // degrees of arc, and there is no picture to look at.
    const p = fire(6);
    const last = p.points[p.points.length - 1];
    const arc = Math.abs(Math.atan2(last.y, last.x)) * (180 / Math.PI);
    expect(arc).toBeGreaterThan(15);
  });

  test('an intermediate shot goes into orbit without landing', () => {
    const p = fire(7.9);
    expect(p.impact).toBe(false);
    expect(p.bound).toBe(true);
  });

  test('a fast shot leaves and never turns round', () => {
    const p = fire(14);
    expect(p.bound).toBe(false);
    expect(p.impact).toBe(false);
    expect(p.energy).toBeGreaterThan(0);
    expect(p.apoapsis).toBe(Infinity);
  });

  test('the outcome flips exactly where the total energy crosses zero', () => {
    // The lesson claims these are the same fact told two ways, so they had
    // better not disagree anywhere along the slider.
    const v = escapeSpeed(EARTH.mass, TOWER) / 1000;
    expect(fire(v - 0.02).bound).toBe(true);
    expect(fire(v + 0.02).bound).toBe(false);
    expect(fire(v - 0.02).energy).toBeLessThan(0);
    expect(fire(v + 0.02).energy).toBeGreaterThan(0);
  });

  test('just below escape it goes enormously far and still returns', () => {
    const p = fire(10.9);
    expect(p.bound).toBe(true);
    expect(p.apoapsis / EARTH.radius).toBeGreaterThan(100);
  });

  test('holds on to its energy all the way round', () => {
    // A panel whose message is "the total does not change" cannot be run on an
    // integrator that changes it.
    for (let kms = 3.2; kms <= 16; kms += 0.4) {
      expect(fire(kms).drift).toBeLessThan(1e-4);
    }
  });

  test('reports the true furthest point, not where it stopped integrating', () => {
    const p = fire(9.5);
    expect(p.far / p.apoapsis).toBeCloseTo(1, 2);
  });
});

describe('the energy instruments', () => {
  const IDS = ['launch', 'live-energy', 'escape-compare', 'shapes'];

  test.each(IDS)('%s is registered and complete', id => {
    const w = getWidget(id);
    expect(w).toBeTruthy();
    expect(typeof w.draw).toBe('function');
    expect(typeof w.readout).toBe('function');
    for (const c of w.controls) {
      expect(c.value).toBeGreaterThanOrEqual(c.min);
      expect(c.value).toBeLessThanOrEqual(c.max);
    }
    for (const pr of w.presets || []) {
      for (const key of Object.keys(pr.values)) {
        expect(w.controls.some(c => c.id === key)).toBe(true);
      }
    }
  });

  test('the launch readout answers the question the step asks', () => {
    const w = getWidget('launch');
    const at = kms => {
      const v = widgetDefaults(w, { v: kms });
      w.reset(v, { autorun: false });
      const rows = w.readout(v);
      return rows.find(r => r.label === 'Does it come back?').value;
    };
    expect(at(6)).toMatch(/falls back/);
    expect(at(8)).toMatch(/comes back round/);
    expect(at(14)).toMatch(/leaves for good/);
  });

  test('the launch panel never runs before a prediction step wants it to', () => {
    const w = getWidget('launch');
    const v = widgetDefaults(w, { v: 6 });
    w.reset(v, { autorun: false });
    // Nothing should move on its own; the student presses Run.
    const before = w.readout(v);
    w.step(v, 1);
    expect(w.readout(v)).toEqual(before);
    w.act('run', v);
    w.step(v, 0.1);
    expect(w.readout(v).length).toBeGreaterThan(0);
  });

  test('the comparison ranks the bodies by mass and falls with distance', () => {
    const w = getWidget('escape-compare');
    const at = dist => {
      const c = w.compute({ dist });
      return Object.fromEntries(c.rows.map(r => [r.key, r.v / 1000]));
    };
    const surface = at(1);
    expect(surface.moon).toBeCloseTo(2.38, 1);
    expect(surface.earth).toBeCloseTo(11.19, 1);
    expect(surface.jupiter).toBeCloseTo(59.5, 0);
    expect(surface.sun).toBeCloseTo(617.8, 0);
    expect(surface.moon).toBeLessThan(surface.earth);
    expect(surface.earth).toBeLessThan(surface.jupiter);
    expect(surface.jupiter).toBeLessThan(surface.sun);

    const far = at(4);
    for (const key of Object.keys(surface)) {
      expect(far[key]).toBeCloseTo(surface[key] / 2, 1);
    }
  });

  test('the shapes panel names the shape the energy implies', () => {
    const w = getWidget('shapes');
    expect(w.compute({ k: 0.82 }).shape).toBe('ellipse');
    expect(w.compute({ k: 1 }).shape).toBe('parabola');
    expect(w.compute({ k: 1.25 }).shape).toBe('hyperbola');
    expect(w.compute({ k: 0.82 }).energy).toBeLessThan(0);
    expect(w.compute({ k: 1.25 }).energy).toBeGreaterThan(0);
    expect(w.compute({ k: 1 }).energy).toBeCloseTo(0, 6);
  });

  test('the live panel says what to do when nothing is selected', () => {
    const w = getWidget('live-energy');
    const rows = w.readout({}, { selected: null });
    expect(rows[0].label).toMatch(/Click/);
  });
});
