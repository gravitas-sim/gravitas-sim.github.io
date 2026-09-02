import { allWidgets, widgetDefaults, getWidget } from '../js/widgets.js';
import {
  relativeInsolation,
  habitableZoneBounds,
  habitableZoneStatus,
} from '../js/habitability.js';
import {
  radialVelocitySemiAmplitude,
  planetBulkDensity,
} from '../js/exoplanetObservables.js';
import { HD209458 } from '../js/data/exoplanetSystems.js';
import { INVESTIGATIONS } from '../js/data/investigations.js';

const IDS = [
  'reflex-motion',
  'rv-observer',
  'rv-mass',
  'rv-inclination',
  'astrometry-signature',
  'method-comparison',
  'planet-characterization',
];

describe('the exoplanet instruments are registered and well formed', () => {
  test.each(IDS)('%s exists with controls and a readout', id => {
    const w = getWidget(id);
    expect(w).toBeTruthy();
    expect(w.controls.length).toBeGreaterThan(0);
    expect(typeof w.readout).toBe('function');
    expect(typeof w.draw).toBe('function');
  });

  test('every control has a default inside its own range', () => {
    for (const id of IDS) {
      const w = getWidget(id);
      for (const c of w.controls) {
        expect(c.value).toBeGreaterThanOrEqual(c.min);
        expect(c.value).toBeLessThanOrEqual(c.max);
      }
    }
  });

  test('every preset only sets controls the widget has', () => {
    for (const id of IDS) {
      const w = getWidget(id);
      const known = new Set(w.controls.map(c => c.id));
      for (const p of w.presets ?? []) {
        for (const key of Object.keys(p.values))
          expect(known.has(key)).toBe(true);
      }
    }
  });

  test('every readout returns rows with a label and a value', () => {
    for (const id of IDS) {
      const w = getWidget(id);
      const rows = w.readout(widgetDefaults(w), undefined, {});
      expect(rows.length).toBeGreaterThan(0);
      for (const r of rows) {
        expect(typeof r.label).toBe('string');
        expect(String(r.value).length).toBeGreaterThan(0);
      }
    }
  });

  test('the lesson only names instruments that exist', () => {
    const lesson = INVESTIGATIONS.find(i => i.id === 'radial-velocity');
    const used = lesson.steps.filter(s => s.tool).map(s => s.tool.id);
    expect(used.length).toBeGreaterThan(0);
    for (const id of used) expect(getWidget(id)).toBeTruthy();
  });

  test('every instrument the lesson names is one of these', () => {
    const lesson = INVESTIGATIONS.find(i => i.id === 'radial-velocity');
    const used = new Set(lesson.steps.filter(s => s.tool).map(s => s.tool.id));
    for (const id of used) expect(IDS).toContain(id);
  });
});

describe('the characterization panel does not reimplement habitability', () => {
  // The whole point of the final panel is that it agrees with The Goldilocks
  // Question. The only way to guarantee that is to call the same functions, and
  // this is the test that would fail the moment someone inlined a copy.
  const cases = [
    { lum: 1.77, teff: 6065, a: 0.04747, label: 'HD 209458 b' },
    { lum: 0.6, teff: 5400, a: 1.02, label: 'a temperate rocky candidate' },
    { lum: 1, teff: 5772, a: 1, label: 'an Earth analogue' },
    { lum: 0.05, teff: 3400, a: 0.15, label: 'an M-dwarf world' },
  ];

  test.each(cases)(
    '$label: flux, bounds and status all match',
    ({ lum, teff, a }) => {
      const w = getWidget('planet-characterization');
      const c = w.compute({ ...widgetDefaults(w), lum, teff, a });

      expect(c.flux).toBe(relativeInsolation(lum, a));

      const bounds = habitableZoneBounds({ luminositySolar: lum, teffK: teff });
      expect(c.bounds.innerAU).toBe(bounds.innerAU);
      expect(c.bounds.outerAU).toBe(bounds.outerAU);

      expect(c.status.label).toBe(habitableZoneStatus(a, bounds).label);
    }
  );
});

describe('the instruments agree with the shared observables module', () => {
  test('rv-mass reproduces the semi-amplitude relation', () => {
    const w = getWidget('rv-mass');
    for (const mp of [0.01, 0.1, 0.69, 3]) {
      expect(w.compute({ mp }).K).toBe(
        radialVelocitySemiAmplitude({
          starMassSolar: HD209458.star.massSolar,
          planetMassJupiter: mp,
          periodDays: HD209458.planet.periodDays,
        })
      );
    }
  });

  test('rv-mass is linear in planet mass to well within a lesson’s precision', () => {
    // The lesson says "double the mass and you double K". That is not exactly
    // true: the total system mass sits in the denominator of the semi-amplitude
    // relation, so doubling a planet's mass also nudges the total. For
    // planetary companions the error is about a tenth of a per cent, which is
    // far below anything a student reads off a slider, and the simplification
    // is sound. This test pins how good the approximation actually is, so that
    // if a future edit ever makes it worse the claim gets revisited.
    const w = getWidget('rv-mass');
    const one = w.compute({ mp: 1 }).K;
    const two = w.compute({ mp: 2 }).K;
    expect(two / one).toBeGreaterThan(1.995);
    expect(two / one).toBeLessThanOrEqual(2);

    // For an Earth-mass planet the departure from linearity is unmeasurable.
    const small = w.compute({ mp: 0.001 }).K;
    const twice = w.compute({ mp: 0.002 }).K;
    expect(twice / small).toBeCloseTo(2, 5);
  });

  test('rv-inclination reports a mass that falls as sin i', () => {
    const w = getWidget('rv-inclination');
    const truth = 0.69;
    for (const inc of [90, 60, 30]) {
      const c = w.compute({ inc, mp: truth });
      expect(c.inferred / truth).toBeCloseTo(
        Math.sin((inc * Math.PI) / 180),
        3
      );
    }
  });

  test('the characterization density matches the shared calculation', () => {
    const w = getWidget('planet-characterization');
    const v = { ...widgetDefaults(w), rp: 1.38, mp: 0.69 };
    expect(w.compute(v).density.gramsPerCm3).toBe(
      planetBulkDensity({ massJupiter: 0.69, radiusJupiter: 1.38 }).gramsPerCm3
    );
  });
});

describe('the astrometric signal does not vanish face-on', () => {
  // The single most important scientific point in the second half of the
  // lesson, and the one most often got wrong. The projected shape changes with
  // inclination; the semi-major axis does not.
  test('method-comparison keeps astrometry at full strength at every tilt', () => {
    const w = getWidget('method-comparison');
    for (const inc of [90, 60, 30, 0]) {
      expect(w.compute({ inc }).astrometryFraction).toBe(1);
    }
  });

  test('while radial velocity falls to nothing', () => {
    const w = getWidget('method-comparison');
    expect(w.compute({ inc: 90 }).rvFraction).toBeCloseTo(1, 6);
    expect(w.compute({ inc: 0 }).rvFraction).toBeCloseTo(0, 6);
  });

  test('and the transit survives only very close to edge-on', () => {
    const w = getWidget('method-comparison');
    expect(w.compute({ inc: 90 }).transits).toBe(true);
    expect(w.compute({ inc: 70 }).transits).toBe(false);
  });

  test('the projected minor axis is what shrinks, as cos i', () => {
    const w = getWidget('method-comparison');
    for (const inc of [0, 45, 60]) {
      expect(w.compute({ inc }).minorAxisFraction).toBeCloseTo(
        Math.abs(Math.cos((inc * Math.PI) / 180)),
        6
      );
    }
  });
});

describe('the three candidate planets make the intended point', () => {
  // Designed so that no single column identifies the best candidate. If a
  // future edit makes one of them answerable from density alone, or from the
  // zone alone, the exercise stops working and this test should say so.
  const load = label => {
    const w = getWidget('planet-characterization');
    const preset = w.presets.find(p => p.label.startsWith(label));
    return w.compute(preset.values);
  };

  test('A is rocky and in the zone', () => {
    const a = load('Planet A');
    expect(a.density.gramsPerCm3).toBeGreaterThan(4);
    expect(a.status.status).toBe('inside');
  });

  test('B is in the zone but far too light to be rock', () => {
    const b = load('Planet B');
    expect(b.status.status).toBe('inside');
    expect(b.density.gramsPerCm3).toBeLessThan(3);
  });

  test('C is rocky but far too close to its star', () => {
    const c = load('Planet C');
    expect(c.density.gramsPerCm3).toBeGreaterThan(4);
    expect(c.status.status).toBe('inner');
    expect(c.flux).toBeGreaterThan(10);
  });

  test('no single measurement separates A from both others', () => {
    const a = load('Planet A');
    const b = load('Planet B');
    const c = load('Planet C');
    // Density alone cannot: C matches A.
    expect(c.density.gramsPerCm3).toBeGreaterThan(4);
    // Zone alone cannot: B matches A.
    expect(b.status.status).toBe(a.status.status);
    // Radius alone cannot: C is about the same size as A.
    expect(Math.abs(c.radiusEarth - a.radiusEarth)).toBeLessThan(0.3);
  });
});

describe('every registered widget still works', () => {
  test('no widget throws when computed and read at its defaults', () => {
    for (const w of allWidgets()) {
      if (typeof w.readout !== 'function') continue;
      const v = widgetDefaults(w);
      expect(() => w.readout(v, undefined, {})).not.toThrow();
    }
  });
});
