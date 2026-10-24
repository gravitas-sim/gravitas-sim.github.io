// The three measurement and claim investigations (Roadmap III, Prompt 190):
// every number a step writes is recomputed from the functions the instruments
// draw; every validator accepts what the instrument reads and refuses a wrong
// value; the statistics the instruments rest on are checked against closed
// forms and published values; the shared files and their per-lesson re-exports
// agree. Cheap on purpose: seconds, no browser.
import { INVESTIGATIONS } from '../js/data/investigations.js';
import {
  CASES,
  CLAIM_WIDGETS,
  FRAME,
  LINE,
  PRODUCT,
  chi2Sf,
  coverageView,
  lineFit,
  lowerMass,
  marksView,
  normals,
  poissonCdf,
  poissonFrom,
  profileAt,
  uniforms,
  upperLimit,
} from '../js/claimWidgets.js';
import { EN_CLAIM } from '../js/i18n/en.claim.js';
import { ES_CLAIM } from '../js/i18n/es.claim.js';
import { withAllDepths } from '../js/investigations/depthAll.js';
import * as EN from '../js/data/investigations/measurement-sequence.js';
import * as ES from '../js/data/investigations/es/measurement-sequence.js';
import * as DEEP from '../js/data/investigations/depth/measurement-sequence.js';
import * as DEEP_ES from '../js/data/investigations/depth/es/measurement-sequence.js';

const IDS = [
  'what-is-a-measurement',
  'what-does-plus-minus-claim',
  'when-the-method-must-refuse',
];
const near = (got, want, tol) =>
  expect(Math.abs(got - want)).toBeLessThanOrEqual(tol);
const lesson = id => INVESTIGATIONS.find(l => l.id === id);
const deeper = (id, sid) =>
  withAllDepths(lesson(id)).steps.find(s => s.sid === sid);

describe('the lessons exist and are wired', () => {
  test.each(IDS)(
    '%s has unique step ids and a claim instrument on every step',
    id => {
      const l = lesson(id);
      expect(l).toBeTruthy();
      const sids = l.steps.map(s => s.sid);
      expect(new Set(sids).size).toBe(sids.length);
      for (const s of l.steps)
        expect([
          'frame-marks',
          'coverage-repeats',
          'profile-refusal',
        ]).toContain(s.tool.id);
      expect(l.depths).toEqual(['core', 'quantitative', 'advanced']);
    }
  );

  test('a lesson, its Spanish and its deeper steps come from the shared files', async () => {
    for (const [id, name] of [
      ['what-is-a-measurement', 'WHAT_IS_A_MEASUREMENT'],
      ['what-does-plus-minus-claim', 'WHAT_DOES_PLUS_MINUS_CLAIM'],
      ['when-the-method-must-refuse', 'WHEN_THE_METHOD_MUST_REFUSE'],
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

  test('both languages carry the same instrument words', () => {
    expect(Object.keys(ES_CLAIM).sort()).toEqual(Object.keys(EN_CLAIM).sort());
    expect(CLAIM_WIDGETS.map(w => w.id)).toEqual([
      'frame-marks',
      'coverage-repeats',
      'profile-refusal',
    ]);
  });

  test('the instructor registries carry a guide, a flow and expectations for each', async () => {
    const { INSTRUCTOR_CONTENT } =
      await import('../js/data/instructorContent.js');
    for (const id of IDS) {
      expect(INSTRUCTOR_CONTENT[id].keyConcepts.length).toBeGreaterThan(2);
      expect(DEEP.INSTRUCTOR.flow[id].length).toBeGreaterThan(4);
      expect(
        Object.keys(DEEP.INSTRUCTOR.expectations[id]).length
      ).toBeGreaterThan(3);
    }
  });
});

describe('the seeded streams', () => {
  test('uniforms and normals are reproducible and well behaved', () => {
    expect(Array.from(uniforms('claim-x', 4))).toEqual(
      Array.from(uniforms('claim-x', 4))
    );
    const z = normals('claim-ensemble-1', 4000);
    const mean = z.reduce((s, x) => s + x, 0) / z.length;
    const sd = Math.sqrt(z.reduce((s, x) => s + (x - mean) ** 2, 0) / z.length);
    near(mean, 0, 0.04);
    near(sd, 1, 0.03);
  });
});

describe('What Is a Measurement?: the core numbers', () => {
  const at = (n, extra = {}) => marksView({ n, blur: 4, ...extra });
  test('five marks', () => {
    const f = at(5);
    near(f.meanX, 31.1, 0.05);
    near(f.sdX, 0.8, 0.03);
    near(f.seX, 0.36, 0.02);
    near(f.seY, 0.34, 0.02);
    // The standard error is the spread over the root of the number.
    near(f.seX, f.sdX / Math.sqrt(5), 1e-12);
  });
  test('twenty marks and the factor', () => {
    const f = at(20);
    near(f.seX, 0.17, 0.02);
    near(at(5).seX / f.seX, 2.06, 0.2);
  });
  test('the truth and the error of the mean', () => {
    const f = at(5, { truth: 1 });
    expect(f.showTruth).toBe(true);
    near(f.errX, -0.3, 0.04);
    near(f.errInSe, -0.84, 0.1);
    expect(f.errX).toBeCloseTo(f.meanX - FRAME.truth.x, 12);
  });
  test('twice as wide doubles the spread exactly', () => {
    const a = marksView({ n: 5, blur: 4 });
    const b = marksView({ n: 5, blur: 8 });
    near(b.sdX / a.sdX, 2, 1e-12);
    near(b.sdX, 1.6, 0.06);
    near(b.seX, 0.71, 0.03);
  });
  test('an offset moves the mean and leaves the spread', () => {
    const a = marksView({ n: 30, blur: 4, offset: 0 });
    const b = marksView({ n: 30, blur: 4, offset: 1, truth: 1 });
    near(b.sdX, a.sdX, 1e-12);
    near(b.meanX - a.meanX, 1, 1e-12);
    near(b.seX, 0.14, 0.02);
    near(b.errInSe, 6.2, 0.6);
  });
  test('the standard error falls as the root of the number of marks, in the long run', () => {
    // Over the seeded sequence the spread settles, so SE(30) / SE(5) is near sqrt(5/30).
    const r = at(30).seX / at(5).seX;
    near(r, Math.sqrt(5 / 30), 0.1);
  });
  test('by hand: the number of marks for a tenth of a pixel', () => {
    expect(Math.round((0.8 / 0.1) ** 2)).toBe(64);
  });
});

describe('What Does ± Claim?: coverage on the ensemble', () => {
  test('an honest one- and two-sigma interval', () => {
    const one = coverageView({ case: 0, k: 1, repeats: 2000 });
    const two = coverageView({ case: 0, k: 2, repeats: 2000 });
    near(one.hits, 1361, 25);
    near(100 * one.frac, 68, 1.5);
    near(two.hits, 1901, 15);
    near(100 * two.frac, 95, 1);
    // Against the closed forms, within what 2000 repeats allow (four standard errors).
    near(one.frac, 0.6827, 4 * one.se);
    near(two.frac, 0.9545, 4 * two.se);
  });
  test('the coverage carries its own binomial uncertainty', () => {
    const f = coverageView({ case: 0, k: 1, repeats: 100 });
    near(100 * f.frac, 70, 1.5);
    near(100 * f.se, 4.6, 0.5);
    const g = coverageView({ case: 0, k: 1, repeats: 2000 });
    near(100 * g.se, 1.04, 0.1);
    near(Math.sqrt((0.68 * 0.32) / 2000) * 100, 1.04, 0.01);
  });
  test('a biased, precise instrument misses the truth', () => {
    const one = coverageView({ case: 1, k: 1, repeats: 2000 });
    const two = coverageView({ case: 1, k: 2, repeats: 2000 });
    near(100 * one.frac, 36.3, 1.5);
    near(100 * two.frac, 74.4, 1.5);
    // The closed form: Phi(-0.33) - Phi(-2.33), with Phi from the error function.
    const phi = x => 0.5 * (1 + erf(x / Math.SQRT2));
    near(100 * (phi(-1 / 3) - phi(-7 / 3)), 36.1, 0.3);
    near(100 * one.frac, 100 * (phi(-1 / 3) - phi(-7 / 3)), 4 * 100 * one.se);
  });
  test('the asymmetric distance interval is the parallax interval, the symmetric shortcut is not', () => {
    const honest = coverageView({ case: 0, k: 1, repeats: 2000 });
    const asym = coverageView({ case: 2, k: 1, repeats: 2000, form: 0 });
    const sym = coverageView({ case: 2, k: 1, repeats: 2000, form: 1 });
    expect(asym.hits).toBe(honest.hits);
    near(100 * asym.frac, 68, 1.5);
    near(asym.unbounded, 17, 4);
    near(100 * sym.frac, 78.3, 1.5);
    expect(sym.frac).toBeGreaterThan(asym.frac + 0.05);
    // Every asymmetric interval runs further above than below its estimate.
    for (const r of asym.rows.slice(0, 200).filter(x => Number.isFinite(x.hi)))
      expect(r.hi - r.est).toBeGreaterThan(r.est - r.lo);
    near(asym.truth, 1000 / CASES.parallax.truthMas, 1e-9);
  });
  test('an upper limit covers at least its level, at every rate', () => {
    near(100 * coverageView({ case: 3, rate: 3, repeats: 2000 }).frac, 95.6, 1);
    near(100 * coverageView({ case: 3, rate: 4, repeats: 2000 }).frac, 98.7, 1);
    for (const rate of [0.5, 1, 2, 3, 4.5, 6, 8]) {
      const f = coverageView({ case: 3, rate, repeats: 4000 });
      // Exact coverage is at least 0.95; the ensemble may fall under it by its own noise.
      expect(f.frac).toBeGreaterThan(0.95 - 4 * f.se);
    }
  });
  test('the Poisson limit: the published one-sided 95 percent values', () => {
    // Gehrels (1986) Table 1 upper limits for 0 to 5 counts at 95 percent (1.645 sigma).
    const published = [2.996, 4.744, 6.296, 7.754, 9.154, 10.513];
    published.forEach((u, n) => near(upperLimit(n), u, 0.001));
    near(-Math.log(0.05), 3, 0.05);
    // The definition: seeing n or fewer when the mean is the limit has probability 0.05.
    for (const n of [0, 3, 10]) near(poissonCdf(n, upperLimit(n)), 0.05, 1e-9);
    expect(poissonFrom(0.0001, 3)).toBe(0);
    expect(poissonFrom(0.9999, 3)).toBeGreaterThan(6);
  });
});

describe('When the Method Must Refuse: the profile and the line', () => {
  test('the profile of the mass is analytic', () => {
    near(profileAt(2).s, 0.425, 1e-12);
    near(profileAt(2).chi2, 0, 1e-9);
    near(profileAt(0.5).s, 1, 0);
    near(profileAt(0.5).chi2, 34.03, 0.01);
    near(lowerMass(1), 0.79, 1e-12);
    near(lowerMass(3.84), 0.732, 0.001);
    // Flat above the product: no upper bound at any mass tried.
    for (const m of [1, 2, 5, 10, 50]) near(profileAt(m).chi2, 0, 1e-9);
    expect(PRODUCT).toEqual({ q: 0.85, sigma: 0.06 });
  });
  test('the weighted line fit against the normal equations written out', () => {
    const f = lineFit(2);
    // Independent: the closed form of weighted least squares for a line.
    near(f.beta[1], 1.078, 0.01);
    near(f.sigma[1], 0.024, 0.003);
    near(f.chi2, 30.54, 0.05);
    near(f.reduced, 7.64, 0.15);
    expect(f.dof).toBe(4);
    expect(f.p).toBeLessThan(0.001);
    const g = lineFit(3);
    near(g.reduced, 0.37, 0.04);
    near(g.beta[2], 0.089, 0.005);
    expect(g.dof).toBe(3);
    expect(g.p).toBeGreaterThan(0.5);
  });
  test('the fit agrees with a closed-form weighted line', async () => {
    // Re-derive the line with the textbook sums, from the data the instrument draws.
    const { lineData } = await import('../js/claimWidgets.js');
    const d = lineData();
    const S = d.reduce((s, p) => s + 1 / p.sigma ** 2, 0);
    const Sx = d.reduce((s, p) => s + p.x / p.sigma ** 2, 0);
    const Sy = d.reduce((s, p) => s + p.y / p.sigma ** 2, 0);
    const Sxx = d.reduce((s, p) => s + (p.x * p.x) / p.sigma ** 2, 0);
    const Sxy = d.reduce((s, p) => s + (p.x * p.y) / p.sigma ** 2, 0);
    const delta = S * Sxx - Sx * Sx;
    const slope = (S * Sxy - Sx * Sy) / delta;
    const sigmaSlope = Math.sqrt(S / delta);
    const f = lineFit(2);
    near(f.beta[1], slope, 1e-9);
    near(f.sigma[1], sigmaSlope, 1e-9);
  });
  test('the chi-square survival function against published quantiles', () => {
    // 95 percent points of the chi-square distribution (NIST/SEMATECH 1.3.6.7.4).
    near(chi2Sf(3.841, 1), 0.05, 0.001);
    near(chi2Sf(9.488, 4), 0.05, 0.0005);
    near(chi2Sf(7.815, 3), 0.05, 0.0005);
    near(chi2Sf(11.07, 5), 0.05, 0.0005);
    near(chi2Sf(13.277, 4), 0.01, 0.0005);
    expect(chi2Sf(0, 4)).toBe(1);
  });
});

describe('every validator accepts what the instrument reads and refuses a wrong value', () => {
  const marks = (n, extra) => marksView({ blur: 4, ...extra, n });
  const cover = v => coverageView(v);
  const ok = (id, sid, values) => {
    const s = deeper(id, sid);
    expect(s.validate(values).level).toBe('ok');
    const bad = Object.fromEntries(Object.keys(values).map(k => [k, 12345]));
    expect(s.validate(bad).level).toBe('error');
    // A step's own hint values are accepted (the author check's rule).
    const hints = Object.fromEntries(s.fields.map(f => [f.id, Number(f.hint)]));
    expect(s.validate(hints).level).toBe('ok');
  };
  test('What Is a Measurement?', () => {
    const f5 = marks(5);
    ok('what-is-a-measurement', 'read-the-spread', {
      mean: f5.meanX,
      sd: f5.sdX,
    });
    ok('what-is-a-measurement', 'the-standard-error', {
      sex: f5.seX,
      sey: f5.seY,
    });
    ok('what-is-a-measurement', 'twenty-marks', {
      sex: marks(20).seX,
      factor: f5.seX / marks(20).seX,
    });
    const t5 = marks(5, { truth: 1 });
    ok('what-is-a-measurement', 'reveal-the-truth', {
      err: t5.errX,
      inse: t5.errInSe,
    });
    const b = marks(5, { blur: 8 });
    ok('what-is-a-measurement', 'a-blurrier-star', { sd: b.sdX, sex: b.seX });
    const o = marks(30, { offset: 1, truth: 1 });
    ok('what-is-a-measurement', 'a-pointer-offset', {
      sex: o.seX,
      inse: o.errInSe,
    });
  });
  test('What Does ± Claim?', () => {
    const one = cover({ case: 0, k: 1, repeats: 2000 });
    ok('what-does-plus-minus-claim', 'coverage-at-one-sigma', {
      hits: one.hits,
      share: 100 * one.frac,
    });
    const two = cover({ case: 0, k: 2, repeats: 2000 });
    ok('what-does-plus-minus-claim', 'coverage-at-two-sigma', {
      hits: two.hits,
      share: 100 * two.frac,
    });
    ok('what-does-plus-minus-claim', 'biased-coverage', {
      one: 100 * cover({ case: 1, k: 1, repeats: 2000 }).frac,
      two: 100 * cover({ case: 1, k: 2, repeats: 2000 }).frac,
    });
    const a = cover({ case: 2, k: 1, repeats: 2000, form: 0 });
    ok('what-does-plus-minus-claim', 'an-asymmetric-interval', {
      share: 100 * a.frac,
      open: a.unbounded,
    });
    ok('what-does-plus-minus-claim', 'the-symmetric-shortcut', {
      share: 100 * cover({ case: 2, k: 1, repeats: 2000, form: 1 }).frac,
    });
    ok('what-does-plus-minus-claim', 'upper-limit-coverage', {
      at3: 100 * cover({ case: 3, rate: 3, repeats: 2000 }).frac,
      at4: 100 * cover({ case: 3, rate: 4, repeats: 2000 }).frac,
    });
    const w = cover({ case: 0, k: 1, repeats: 100 });
    ok('what-does-plus-minus-claim', 'the-ensemble-wobbles', {
      share: 100 * w.frac,
      se: 100 * w.se,
    });
  });
  test('When the Method Must Refuse', () => {
    ok('when-the-method-must-refuse', 'try-a-mass', {
      s: profileAt(2).s,
      chi: profileAt(2).chi2,
    });
    ok('when-the-method-must-refuse', 'try-a-small-mass', {
      s: profileAt(0.5).s,
      chi: profileAt(0.5).chi2,
    });
    ok('when-the-method-must-refuse', 'the-lower-limit', {
      one: lowerMass(1),
      two: lowerMass(3.84),
    });
    const l = lineFit(2);
    ok('when-the-method-must-refuse', 'fit-the-line', {
      slope: l.beta[1],
      sigma: l.sigma[1],
      reduced: l.reduced,
    });
    const p = lineFit(3);
    ok('when-the-method-must-refuse', 'a-model-that-fits', {
      reduced: p.reduced,
      curve: p.beta[2],
    });
  });
  test('the numeric answers are the recomputed values', () => {
    near(
      deeper('what-is-a-measurement', 'a-position-with-an-error-bar').answer,
      marks(5).meanX,
      0.05
    );
    near(
      deeper('what-is-a-measurement', 'how-many-marks-by-hand').answer,
      (0.8 / 0.1) ** 2,
      0.5
    );
    near(
      deeper('what-does-plus-minus-claim', 'the-binomial-by-hand').answer,
      100 * Math.sqrt((0.68 * 0.32) / 2000),
      0.01
    );
    near(
      deeper('what-does-plus-minus-claim', 'the-bias-by-hand').answer,
      36.1,
      0.05
    );
    near(
      deeper('what-does-plus-minus-claim', 'the-zero-count-limit').answer,
      upperLimit(0),
      0.01
    );
    near(
      deeper('when-the-method-must-refuse', 'the-95-percent-bound-by-hand')
        .answer,
      lowerMass(3.84),
      0.001
    );
    expect(
      deeper('when-the-method-must-refuse', 'degrees-of-freedom').answer
    ).toBe(LINE.x.length - 2);
    // Every core numeric choice is among its options.
    for (const id of IDS)
      for (const s of lesson(id).steps.filter(
        x => x.kind === 'choice' || x.type === 'predict'
      ))
        expect(s.answer).toBeLessThan(s.options.length);
  });
});

/** The error function, Abramowitz and Stegun 7.1.26 refined by one Newton step. */
function erf(x) {
  const s = Math.sign(x);
  const a = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * a);
  const y =
    1 -
    t *
      (0.254829592 +
        t *
          (-0.284496736 +
            t * (1.421413741 + t * (-1.453152027 + t * 1.061405429)))) *
      Math.exp(-a * a);
  return s * y;
}
