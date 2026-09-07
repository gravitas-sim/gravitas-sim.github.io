import { registerMessages } from '../js/i18n/index.js';
import { EN_DEFERRED } from '../js/i18n/en.deferred.js';

// These widgets' prose lives in the deferred catalogue, because everything
// that reaches them is lazily loaded. The application registers it before the
// panel renders; a test that reads a preset's label has to do the same, or
// every label is the message id it was going to be translated from.
registerMessages('en', EN_DEFERRED);

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
  'survey-schedule',
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

describe('the observing-schedule planner', () => {
  const W = () => getWidget('survey-schedule');
  const values = over => ({ ...widgetDefaults(W()), ...over });

  /** The lesson's two schedules, which its questions have answers for. */
  const SCHEDULE_A = { cadence: 0.32, n: 12, sigma: 8, mp: 0.69, seed: 1 };
  const SCHEDULE_B = { cadence: 3.52, n: 12, sigma: 8, mp: 0.69, seed: 1 };

  test('it takes the number of measurements it is asked for', () => {
    for (const n of [4, 12, 30]) {
      expect(W().compute(values({ n })).points).toHaveLength(n);
    }
  });

  test('the measurements fall on the cadence and nowhere else', () => {
    const c = W().compute(values({ cadence: 2.5, n: 5 }));
    expect(c.points.map(p => p.day)).toEqual([0, 2.5, 5, 7.5, 10]);
  });

  test('with no uncertainty the points are the signal exactly', () => {
    const c = W().compute(values({ sigma: 0, n: 8 }));
    for (const p of c.points) expect(p.rv - p.truth).toBe(0);
    expect(c.stats.chi).toBeNull();
  });

  test('the same seed gives the same measurements', () => {
    const a = W()
      .compute(values(SCHEDULE_A))
      .points.map(p => p.rv);
    const b = W()
      .compute(values(SCHEDULE_A))
      .points.map(p => p.rv);
    expect(a).toEqual(b);
    const other = W()
      .compute(values({ ...SCHEDULE_A, seed: 2 }))
      .points.map(p => p.rv);
    expect(other).not.toEqual(a);
  });

  test('the amplitude is the real one for the planet on the sliders', () => {
    const c = W().compute(values({ mp: 0.69 }));
    expect(c.K).toBeCloseTo(
      radialVelocitySemiAmplitude({
        starMassSolar: HD209458.star.massSolar,
        planetMassJupiter: 0.69,
        periodDays: HD209458.planet.periodDays,
      }),
      6
    );
  });

  describe("the lesson's comparison holds", () => {
    // These numbers are quoted in the lesson body, in its measure-step hints
    // and in the instructor guide's expectations. If they move, the questions
    // stop having answers.
    test('Schedule A: full phase coverage and a landslide chi-square', () => {
      const c = W().compute(values(SCHEDULE_A));
      expect(c.points).toHaveLength(12);
      expect(c.coverage.covered).toBe(10);
      expect(c.stats.rms).toBeCloseTo(55.8, 0);
      expect(c.stats.chi.reduced).toBeGreaterThan(40);
    });

    test('Schedule B: the same twelve, eleven times the baseline, two bins', () => {
      const c = W().compute(values(SCHEDULE_B));
      expect(c.points).toHaveLength(12);
      expect(c.baseline).toBeCloseTo(38.72, 2);
      expect(c.coverage.covered).toBe(2);
      // Ambiguous rather than negative: the outcome the lesson is built on.
      expect(c.stats.chi.reduced).toBeGreaterThan(1);
      expect(c.stats.chi.reduced).toBeLessThan(3);
    });

    test('the aliasing is the cadence, not the noise', () => {
      // With the uncertainty at zero Schedule B still sees nothing, which is
      // what separates "noisy" from "uninformative".
      const c = W().compute(values({ ...SCHEDULE_B, sigma: 0 }));
      expect(c.coverage.covered).toBe(2);
      expect(c.stats.halfRange).toBeLessThan(5);
    });

    test('precision alone turns a Neptune from invisible to obvious', () => {
      const dim = W().compute(values({ ...SCHEDULE_A, mp: 0.06 }));
      const sharp = W().compute(values({ ...SCHEDULE_A, mp: 0.06, sigma: 1 }));
      // Same planet, same schedule, same phase coverage.
      expect(sharp.K).toBeCloseTo(dim.K, 9);
      expect(sharp.coverage.covered).toBe(dim.coverage.covered);
      expect(dim.stats.chi.reduced).toBeLessThan(3);
      expect(sharp.stats.chi.reduced).toBeGreaterThan(10);
    });
  });

  test('the readout describes the run without claiming a detection', () => {
    const rows = W().readout(values(SCHEDULE_A));
    const text = JSON.stringify(
      rows.map(r => [r.label, r.value])
    ).toLowerCase();
    // The words it must not reach for. An amplitude-to-noise ratio is not a
    // significance and the panel is not allowed to imply that it is.
    for (const word of ['detected', 'detection', 'significant', 'confirmed']) {
      expect(text).not.toContain(word);
    }
    // And the disclaimer is a row, not a footnote somewhere else.
    expect(text).toContain('does not identify a planet');
  });

  test('it reports coverage and scatter, which is what the lesson reads', () => {
    const labels = W()
      .readout(values(SCHEDULE_A))
      .map(r => r.label.toLowerCase());
    expect(labels.some(l => l.includes('phase coverage'))).toBe(true);
    expect(labels.some(l => l.includes('scatter'))).toBe(true);
  });
});

// =============================================================================
// The transit noise budget
// -----------------------------------------------------------------------------
// The widget used to have two terms and treat everything correlated as
// permanent, which made a second transit worthless against starspots. It has
// three now, and these pin the three limits that distinguish them - because
// the whole teaching point is that they scale differently, and a model that
// got the middle one wrong taught the opposite of the intended lesson.
// =============================================================================

describe('the transit noise budget', () => {
  const noise = getWidget('transit-noise');
  /** A budget with one term switched on at a time. */
  const at = over =>
    noise.compute({
      depth: 1000,
      white: 0,
      correlated: 0,
      floor: 0,
      duration: 2,
      ntransits: 1,
      ...over,
    });

  test('zero noise is an infinite ratio, not a division by zero', () => {
    const c = at({});
    expect(c.total).toBe(0);
    expect(c.ratio).toBe(Infinity);
    expect(c.ceiling).toBe(Infinity);
    // And nothing anywhere is NaN, which is what a naive 0/0 would give.
    for (const v of Object.values(c)) {
      if (typeof v === 'number') expect(Number.isNaN(v)).toBe(false);
    }
  });

  test('white noise falls as the square root of the total in-transit time', () => {
    // Quadrupling the time halves it, whether the time comes from longer
    // transits or more of them - white noise cannot tell the difference.
    const one = at({ white: 100, duration: 1, ntransits: 1 });
    const longer = at({ white: 100, duration: 4, ntransits: 1 });
    const more = at({ white: 100, duration: 1, ntransits: 4 });
    expect(one.white).toBeCloseTo(100, 10);
    expect(longer.white).toBeCloseTo(50, 10);
    expect(more.white).toBeCloseTo(50, 10);
  });

  test('the white control is the scatter of a one-hour bin, and says so', () => {
    // One hour of in-transit time returns the control's own value, which is
    // what makes "sigma of a 1-hour bin" a definition rather than a label.
    const c = at({ white: 250, duration: 1, ntransits: 1 });
    expect(c.white).toBeCloseTo(250, 10);
    expect(c.referenceHours).toBe(1);
  });

  test('the within-transit term falls as the square root of the TRANSIT COUNT', () => {
    // The correction. Under the old model this term never moved; here a
    // hundred transits reduce it tenfold, which is why anybody bothers
    // observing the same planet again.
    const one = at({ correlated: 300, ntransits: 1 });
    const hundred = at({ correlated: 300, ntransits: 100 });
    expect(one.correlated).toBeCloseTo(300, 10);
    expect(hundred.correlated).toBeCloseTo(30, 10);
  });

  test('the within-transit term does not care how long the transit is', () => {
    // Perfectly correlated across one transit means one independent sample per
    // transit however long it lasts. That is the assumption, and it is the
    // thing that distinguishes this term from the white one.
    const short = at({ correlated: 300, duration: 1, ntransits: 9 });
    const long = at({ correlated: 300, duration: 12, ntransits: 9 });
    expect(short.correlated).toBeCloseTo(long.correlated, 12);
    expect(short.correlated).toBeCloseTo(100, 10);
  });

  test('a fully persistent floor never averages down at all', () => {
    const few = at({ floor: 80, duration: 3, ntransits: 2 });
    const many = at({ floor: 80, duration: 12, ntransits: 5000 });
    expect(few.floor).toBe(80);
    expect(many.floor).toBe(80);
    // And it is what unlimited observing would be left with.
    expect(many.total).toBeCloseTo(80, 10);
    expect(many.ceiling).toBeCloseTo(1000 / 80, 10);
  });

  test('with no persistent term, patience has no ceiling', () => {
    // The other limit, and the one the old model could never reach: with
    // nothing locked to the observation, enough transits reach any precision.
    const c = at({ white: 500, correlated: 500, floor: 0, ntransits: 10 });
    expect(c.ceiling).toBe(Infinity);
    expect(c.floorShare).toBe(0);
    const patient = at({
      white: 500,
      correlated: 500,
      floor: 0,
      ntransits: 1e6,
    });
    expect(patient.total).toBeLessThan(c.total / 100);
  });

  test('the three terms add in quadrature and nothing else', () => {
    const c = at({
      white: 30,
      correlated: 40,
      floor: 120,
      duration: 1,
      ntransits: 1,
    });
    expect(c.total).toBeCloseTo(Math.hypot(30, 40, 120), 10);
  });

  test('floorShare says how much of the budget observing cannot touch', () => {
    const early = at({ white: 900, correlated: 900, floor: 50, ntransits: 1 });
    const late = at({
      white: 900,
      correlated: 900,
      floor: 50,
      ntransits: 5000,
    });
    expect(early.floorShare).toBeLessThan(0.1);
    expect(late.floorShare).toBeGreaterThan(0.9);
  });

  test('more transits always help unless the budget is purely persistent', () => {
    // A monotonicity the old model violated: with a large correlated term it
    // reported the same total for one transit and for a thousand.
    let previous = Infinity;
    for (const ntransits of [1, 2, 5, 20, 100]) {
      const c = at({ white: 200, correlated: 600, floor: 10, ntransits });
      expect(c.total).toBeLessThan(previous);
      previous = c.total;
    }
    // And with only a persistent term, they do not.
    const a = at({ floor: 100, ntransits: 1 });
    const b = at({ floor: 100, ntransits: 1000 });
    expect(a.total).toBeCloseTo(b.total, 12);
  });

  test('every preset marks which of its numbers are measurements', () => {
    // Depths and durations are published; the three noise terms are
    // illustrative. Presenting all nine as though they were measurements is
    // what this field exists to prevent.
    for (const preset of noise.presets) {
      expect(Array.isArray(preset.measured)).toBe(true);
      expect(preset.measured).toContain('depth');
      for (const key of preset.measured) {
        expect(preset.values[key]).toBeGreaterThan(0);
      }
      for (const key of ['white', 'correlated', 'floor']) {
        expect(preset.measured).not.toContain(key);
      }
    }
  });

  test('the ground-based preset is no longer a permanent wall', () => {
    // The concrete consequence of the fix. The same planet from the ground,
    // three nights against thirty: the old model said the two were identical.
    const three = noise.compute({
      ...noise.presets[1].values,
      ntransits: 3,
    });
    const thirty = noise.compute({
      ...noise.presets[1].values,
      ntransits: 30,
    });
    expect(thirty.total).toBeLessThan(three.total / 2);
    expect(thirty.ratio).toBeGreaterThan(three.ratio * 2);
  });
});
