import { jest } from '@jest/globals';
// The three image investigations (Roadmap III, Prompt 191): every number a
// step writes is recomputed from the functions the instruments draw, which in
// turn call the Observatory's own modules (js/measure); every validator accepts
// what the instrument reads and refuses a wrong value; the shared files and
// their per-lesson re-exports agree; the English and Spanish instrument words
// carry the same keys. Cheap on purpose: seconds, no browser, no download (the
// picture of the Moon and the Earth's position are handed in or absent, and
// the readouts that need neither are what is checked here).
import { INVESTIGATIONS } from '../js/data/investigations.js';
import { withAllDepths } from '../js/investigations/depthAll.js';
import { createEphemeris } from '../js/mission/ephemeris.js';
import { PACK, DATA } from '../js/data/ephemeris/solarSystem2025.js';
import { heliocentric } from '../js/kernels/sky/planets.js';
import { createEarth } from '../js/measure/astrometric-series.js';
import * as EN from '../js/data/investigations/measurement-sequence.js';
import * as ES from '../js/data/investigations/es/measurement-sequence.js';
import * as DEEP from '../js/data/investigations/depth/measurement-sequence.js';
import * as DEEP_ES from '../js/data/investigations/depth/es/measurement-sequence.js';

const IDS = [
  'measuring-the-moon',
  'how-far-is-that-star',
  'a-binary-stars-orbit',
];
const near = (got, want, tol) =>
  expect(Math.abs(got - want)).toBeLessThanOrEqual(tol);
const lesson = id => INVESTIGATIONS.find(l => l.id === id);
const deeper = (id, sid) =>
  withAllDepths(lesson(id)).steps.find(s => s.sid === sid);

let W;
let EN_IMG;
let ES_IMG;
let earth;
beforeAll(async () => {
  const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
  W = await import('../js/imagingWidgets.js');
  warn.mockRestore();
  ({ EN_IMAGING: EN_IMG } = await import('../js/i18n/en.imaging.js'));
  ({ ES_IMAGING: ES_IMG } = await import('../js/i18n/es.imaging.js'));
  earth = createEarth({
    ephemeris: createEphemeris(PACK, DATA),
    heliocentric,
  });
  W.provideEarth(earth);
});

describe('the lessons exist and are wired', () => {
  test.each(IDS)(
    '%s has unique step ids and an imaging instrument on every step',
    id => {
      const l = lesson(id);
      expect(l).toBeTruthy();
      const sids = l.steps.map(s => s.sid);
      expect(new Set(sids).size).toBe(sids.length);
      for (const s of l.steps)
        expect(['moon-marks', 'star-parallax', 'binary-orbit']).toContain(
          s.tool.id
        );
      expect(l.depths).toEqual(['core', 'quantitative', 'advanced']);
    }
  );

  test('a lesson, its Spanish and its deeper steps come from the shared files', async () => {
    for (const [id, name] of [
      ['measuring-the-moon', 'MEASURING_THE_MOON'],
      ['how-far-is-that-star', 'HOW_FAR_IS_THAT_STAR'],
      ['a-binary-stars-orbit', 'A_BINARY_STARS_ORBIT'],
    ]) {
      const dir = '../js/data/investigations';
      expect((await import(`${dir}/${id}.js`)).default).toBe(EN[name]);
      expect((await import(`${dir}/es/${id}.js`)).default).toBe(ES[name]);
      expect((await import(`${dir}/depth/${id}.js`)).default).toBe(
        DEEP[`${name}_DEEPER`]
      );
      expect((await import(`${dir}/depth/es/${id}.js`)).default).toBe(
        DEEP_ES[`${name}_DEEPER`]
      );
    }
  });

  test('both languages carry the same instrument words, and the instruments exist (the last two are the field lesson’s, tests/fieldLesson.test.js)', () => {
    expect(Object.keys(ES_IMG).sort()).toEqual(Object.keys(EN_IMG).sort());
    expect(W.IMAGING_WIDGETS.map(w => w.id)).toEqual([
      'moon-marks',
      'star-parallax',
      'binary-orbit',
      'field-sources',
      'field-completeness',
    ]);
  });

  test('the instructor registries carry a guide, a flow and expectations for each', async () => {
    const { INSTRUCTOR_CONTENT } =
      await import('../js/data/instructorContent.js');
    for (const id of IDS) {
      expect(INSTRUCTOR_CONTENT[id].keyConcepts.length).toBeGreaterThan(2);
      expect(DEEP.INSTRUCTOR.flow[id].length).toBeGreaterThan(3);
      expect(
        Object.keys(DEEP.INSTRUCTOR.expectations[id]).length
      ).toBeGreaterThan(1);
    }
  });
});

describe('Measuring the Moon: the numbers', () => {
  const view = (extra = {}) =>
    W.moonView({ x1: 3, x2: 496, cx: 289, cy: 306, r: 45, ...extra });
  test('the pair, the scale and the plain', () => {
    const f = view();
    near(f.pairPx, 493, 3);
    near(f.scale.value, 7.05, 0.05);
    near(f.diameterKm, 634, 1);
    // The scale is the assumed length over the pair, and nothing else.
    near(f.scale.value, W.MOON.diameterKm / f.pairPx, 1e-9);
    expect(f.diameterKm).toBeCloseTo(2 * 45 * f.scale.value, 6);
  });
  test('a pixel is a scale step, and the diameter has an error bar', () => {
    near(2 * view().scale.value, 14.1, 0.05);
    near(view().diameterSigmaKm, 5.75, 0.05);
  });
  test('near the limb a round feature is foreshortened', () => {
    const f = W.moonView({ x1: 3, x2: 496, cx: 470, cy: 245, r: 20 });
    near(f.offset, 0.89, 0.02);
    near(100 * f.foreshorten, 45, 2);
  });
  test('the scale does not depend on where the circle is', () => {
    near(
      view().scale.value,
      view({ cx: 100, cy: 100, r: 10 }).scale.value,
      1e-12
    );
  });
});

describe('How Far Is That Star?: the numbers', () => {
  const star = v => W.parallaxView(v, earth);
  test('a shift is not a distance', () => {
    const r = star({ fit: 0, n: 14 }).res;
    near(r.separation * 1000, 549, 5);
    near(Math.hypot(r.rate.x.value, r.rate.y.value), 0.287, 0.004);
  });
  test('a straight line fails and the parallax repairs it', () => {
    const line = star({ fit: 1, n: 14 }).res;
    near(line.chi2, 1576, 12);
    expect(line.dof).toBe(24);
    const joint = star({ fit: 2, n: 14 }).res;
    near(joint.params.parallax.value * 1000, 60.3, 0.5);
    near(joint.params.parallax.sigma * 1000, 1.53, 0.1);
    near(joint.distance.value, 16.6, 0.15);
    expect(joint.dof).toBe(23);
    near(joint.chi2, 13.2, 0.3);
    // The distance is the inverse of the parallax, exactly.
    near(joint.distance.value, 1 / joint.params.parallax.value, 1e-9);
  });
  test('fewer epochs, a wider interval', () => {
    const s14 = star({ fit: 2, n: 14 }).res.params.parallax.sigma;
    const s8 = star({ fit: 2, n: 8 }).res.params.parallax.sigma;
    near(s8 * 1000, 2.25, 0.1);
    near(s8 / s14, 1.47, 0.07);
  });
  test('too few epochs are refused rather than guessed', () => {
    const r = star({ fit: 2, n: 6 }).res;
    expect(r.ok).toBe(false);
    expect(typeof r.code).toBe('string');
  });
  test('a stated zero point moves the absolute parallax by that amount', () => {
    const r = star({ fit: 2, n: 14, zero: 1 }).res;
    near(r.distance.parallax.absolute.value * 1000, 61.3, 0.3);
    near(r.distance.value, 16.32, 0.1);
  });
});

describe("A Binary Star's Orbit: the numbers", () => {
  const orbit = v => W.orbitView({ n: 12, model: 0, plx: 100, ...v });
  test('the elliptical fit', () => {
    const el = orbit().fit.elements;
    near(el.P.value, 14.13, 0.15);
    near(el.a.value, 0.908, 0.02);
    near(el.e.value, 0.443, 0.02);
  });
  test('the mass sum and its interval', () => {
    const m = orbit().mass;
    near(m.value, 3.76, 0.06);
    near(m.intervals[0].lo, 3.33, 0.08);
    near(m.intervals[0].hi, 4.25, 0.1);
  });
  test('the mass goes as the cube of the distance', () => {
    near(orbit({ plx: 80 }).mass.value, 7.3, 0.4);
    const f = orbit();
    const byHand =
      (f.fit.elements.a.value / 0.1) ** 3 / f.fit.elements.P.value ** 2;
    near(byHand, f.mass.value, 0.1);
    near(byHand, 3.75, 0.1);
  });
  test('a circle is refused, and so are too few epochs', () => {
    const c = orbit({ model: 1 });
    expect(c.fit.ok).toBe(false);
    expect(c.fit.code).toBe('inconsistent');
    expect(orbit({ n: 6 }).fit.ok).toBe(false);
  });
  test('eight epochs make the period less certain', () => {
    near(
      orbit({ n: 8 }).fit.elements.P.sigma / orbit().fit.elements.P.sigma,
      2.5,
      0.3
    );
  });
});

describe('every validator accepts what the instrument reads and refuses a wrong value', () => {
  const ok = (id, sid, values) => {
    const s = deeper(id, sid);
    expect(s.validate(values).level).toBe('ok');
    const bad = Object.fromEntries(Object.keys(values).map(k => [k, 12345]));
    expect(s.validate(bad).level).toBe('error');
    const hints = Object.fromEntries(s.fields.map(f => [f.id, Number(f.hint)]));
    expect(s.validate(hints).level).toBe('ok');
  };
  test('Measuring the Moon', () => {
    const f = W.moonView({ x1: 3, x2: 496, cx: 289, cy: 306, r: 45 });
    ok('measuring-the-moon', 'scale-from-the-disc', {
      pair: W.moonView({ x1: 3, x2: 496, cx: 289, cy: 306, r: 20 }).pairPx,
      scale: f.scale.value,
    });
    ok('measuring-the-moon', 'measure-the-plain', { km: f.diameterKm });
    const l = W.moonView({ x1: 3, x2: 496, cx: 470, cy: 245, r: 20 });
    ok('measuring-the-moon', 'near-the-limb', {
      off: l.offset,
      share: 100 * l.foreshorten,
    });
  });
  test('How Far Is That Star?', () => {
    const r0 = W.parallaxView({ fit: 0, n: 14 }, earth).res;
    ok('how-far-is-that-star', 'the-shift', {
      sep: r0.separation * 1000,
      rate: Math.hypot(r0.rate.x.value, r0.rate.y.value),
    });
    const r1 = W.parallaxView({ fit: 1, n: 14 }, earth).res;
    ok('how-far-is-that-star', 'a-straight-line-fails', {
      chi2: r1.chi2,
      dof: r1.dof,
    });
    const r2 = W.parallaxView({ fit: 2, n: 14 }, earth).res;
    ok('how-far-is-that-star', 'the-parallax', {
      p: r2.params.parallax.value * 1000,
      sigma: r2.params.parallax.sigma * 1000,
      d: r2.distance.value,
    });
    const z = W.parallaxView({ fit: 2, n: 14, zero: 1 }, earth).res;
    ok('how-far-is-that-star', 'a-zero-point', {
      abs: z.distance.parallax.absolute.value * 1000,
      d: z.distance.value,
    });
  });
  test("A Binary Star's Orbit", () => {
    const o = W.orbitView({ n: 12, model: 0, plx: 100 });
    ok('a-binary-stars-orbit', 'the-elliptical-fit', {
      P: o.fit.elements.P.value,
      a: o.fit.elements.a.value,
      e: o.fit.elements.e.value,
    });
    ok('a-binary-stars-orbit', 'the-mass-sum', {
      m: o.mass.value,
      lo: o.mass.intervals[0].lo,
      hi: o.mass.intervals[0].hi,
    });
  });
  test('the numeric answers are the recomputed values', () => {
    const o = W.orbitView({ n: 12, model: 0, plx: 100 });
    near(
      deeper('a-binary-stars-orbit', 'from-arcseconds-to-au').answer,
      o.fit.elements.a.value / 0.1,
      0.1
    );
    near(
      deeper('a-binary-stars-orbit', 'the-mass-by-hand').answer,
      o.mass.value,
      0.1
    );
    near(
      deeper('a-binary-stars-orbit', 'a-nearer-star').answer,
      W.orbitView({ n: 12, model: 0, plx: 80 }).mass.value,
      0.4
    );
    const f = W.moonView({ x1: 3, x2: 496, cx: 289, cy: 306, r: 45 });
    near(
      deeper('measuring-the-moon', 'a-pixel-at-each-end').answer,
      2 * f.scale.value,
      0.4
    );
    near(
      deeper('measuring-the-moon', 'a-diameter-with-an-error-bar').answer,
      f.diameterKm,
      40
    );
    const j = W.parallaxView({ fit: 2, n: 14 }, earth).res;
    near(
      deeper('how-far-is-that-star', 'the-distance-by-hand').answer,
      j.distance.value,
      0.05
    );
    near(
      deeper('how-far-is-that-star', 'how-many-sigma').answer,
      j.params.parallax.value / j.params.parallax.sigma,
      1
    );
    for (const id of IDS)
      for (const s of withAllDepths(lesson(id)).steps.filter(
        x => x.kind === 'choice' || x.type === 'predict'
      ))
        expect(s.answer).toBeLessThan(s.options.length);
  });
});
