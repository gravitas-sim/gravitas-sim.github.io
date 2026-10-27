import { jest } from '@jest/globals';
// "What Is in This Field?" (Roadmap III, Prompt 191, part 3): every number a
// step writes is recomputed from the functions the two field instruments draw,
// which call the Observatory's own detector and injection modules (js/measure);
// every validator accepts what the instrument reads and refuses a wrong value;
// the shared files, their per-lesson re-exports and the sequence agree; the two
// languages' instrument words carry the same keys. The frame is made once from a
// fixed table by the detector kernel with a seeded stream, so the numbers are
// the same for every student. The PSF fit and the injection runs are the slow
// parts (in this VM about ten times their cost in a browser), so each runs once
// per setting and is cached by the module.
import { INVESTIGATIONS } from '../js/data/investigations.js';
import { withAllDepths } from '../js/investigations/depthAll.js';
import { SEQUENCES } from '../js/data/investigations/sequences.js';
import * as EN from '../js/data/investigations/measurement-sequence.js';
import * as ES from '../js/data/investigations/es/measurement-sequence.js';
import * as DEEP from '../js/data/investigations/depth/measurement-sequence.js';
import * as DEEP_ES from '../js/data/investigations/depth/es/measurement-sequence.js';

jest.setTimeout(240000);

const ID = 'what-is-in-this-field';
const near = (got, want, tol) =>
  expect(Math.abs(got - want)).toBeLessThanOrEqual(tol);
const lesson = INVESTIGATIONS.find(l => l.id === ID);
const step = sid => withAllDepths(lesson).steps.find(s => s.sid === sid);

let W;
let F;
beforeAll(async () => {
  const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
  W = await import('../js/imagingWidgets.js');
  warn.mockRestore();
  F = await import('../js/imagingField.js');
});

describe('the lesson exists and is wired', () => {
  test('unique step ids, a field instrument on every step, three depths', () => {
    expect(lesson).toBeTruthy();
    const sids = lesson.steps.map(s => s.sid);
    expect(new Set(sids).size).toBe(sids.length);
    for (const s of withAllDepths(lesson).steps)
      expect(['field-sources', 'field-completeness']).toContain(s.tool.id);
    expect(lesson.depths).toEqual(['core', 'quantitative', 'advanced']);
    expect(lesson.steps).toHaveLength(10);
    expect(withAllDepths(lesson).steps).toHaveLength(15);
  });

  test('the lesson, its Spanish and its deeper steps come from the shared files', async () => {
    const dir = '../js/data/investigations';
    const name = 'WHAT_IS_IN_THIS_FIELD';
    expect((await import(`${dir}/${ID}.js`)).default).toBe(EN[name]);
    expect((await import(`${dir}/es/${ID}.js`)).default).toBe(ES[name]);
    expect((await import(`${dir}/depth/${ID}.js`)).default).toBe(
      DEEP[`${name}_DEEPER`]
    );
    expect((await import(`${dir}/depth/es/${ID}.js`)).default).toBe(
      DEEP_ES[`${name}_DEEPER`]
    );
  });

  test('the Spanish is step for step with the English, in the core and the deeper path', () => {
    expect(ES.WHAT_IS_IN_THIS_FIELD.steps).toHaveLength(
      EN.WHAT_IS_IN_THIS_FIELD.steps.length
    );
    expect(DEEP_ES.WHAT_IS_IN_THIS_FIELD_DEEPER.steps).toHaveLength(
      DEEP.WHAT_IS_IN_THIS_FIELD_DEEPER.steps.length
    );
    EN.WHAT_IS_IN_THIS_FIELD.steps.forEach((s, i) => {
      const es = ES.WHAT_IS_IN_THIS_FIELD.steps[i];
      expect(Boolean(es.options)).toBe(Boolean(s.options));
      expect(es.options?.length).toBe(s.options?.length);
      expect(es.fields?.length).toBe(s.fields?.length);
      expect(es.misconceptions?.length).toBe(s.misconceptions?.length);
    });
  });

  test('both languages carry the same instrument words, and the five instruments exist', () => {
    return Promise.all([
      import('../js/i18n/en.imaging.js'),
      import('../js/i18n/es.imaging.js'),
    ]).then(([en, es]) => {
      expect(Object.keys(es.ES_IMAGING).sort()).toEqual(
        Object.keys(en.EN_IMAGING).sort()
      );
      expect(W.IMAGING_WIDGETS.map(w => w.id)).toEqual([
        'moon-marks',
        'star-parallax',
        'binary-orbit',
        'field-sources',
        'field-completeness',
      ]);
    });
  });

  test('the lesson sits in Observing and measuring after the binary and needs the noise lesson', () => {
    const seq = SEQUENCES.find(s => s.id === 'observing-and-measuring');
    const ids = seq.lessons.map(e => e.id);
    expect(ids.indexOf(ID)).toBeGreaterThan(
      ids.indexOf('a-binary-stars-orbit')
    );
    expect(ids.indexOf('signal-noise-and-exposure')).toBeLessThan(
      ids.indexOf(ID)
    );
    expect(lesson.prerequisites).toEqual(['signal-noise-and-exposure']);
  });

  test('the instructor registries carry a guide, a flow, expectations and bands', async () => {
    const { INSTRUCTOR_CONTENT } =
      await import('../js/data/instructorContent.js');
    expect(INSTRUCTOR_CONTENT[ID].keyConcepts.length).toBeGreaterThan(2);
    expect(DEEP.INSTRUCTOR.flow[ID].length).toBeGreaterThan(3);
    expect(Object.keys(DEEP.INSTRUCTOR.expectations[ID])).toEqual([
      'how-many-sources',
      'lower-the-threshold',
      'the-width',
      'one-magnitude',
      'the-curve',
    ]);
    expect(DEEP.INSTRUCTOR.bands[ID].advanced).toBe('long');
  });
});

describe('the frame and the truth', () => {
  test('forty stars from a table, of every brightness, well apart', () => {
    expect(F.STARS).toHaveLength(40);
    const snr = F.STARS.map(s => s.snr);
    expect(Math.min(...snr)).toBeCloseTo(3.1, 6);
    expect(Math.max(...snr)).toBeCloseTo(196.1, 6);
    let apart = Infinity;
    for (const a of F.STARS)
      for (const b of F.STARS)
        if (a !== b) apart = Math.min(apart, Math.hypot(a.x - b.x, a.y - b.y));
    expect(apart).toBeGreaterThan(20);
  });

  test('a star of signal to noise s has the flux the closed form gives, and the magnitude follows', () => {
    const s = F.STARS.find(x => x.snr === 4.9);
    const flux =
      4.9 * Math.sqrt(4 * Math.PI) * (3 / 2.3548200450309493) * F.NOISE;
    near(s.flux, flux, 1e-6);
    near(s.mag, -2.5 * Math.log10(flux / 30), 1e-9);
    near(F.NOISE, 12.4172, 0.001);
  });

  test('the frame is the detector kernel’s, whole and quantitative', () => {
    const { frame, adapted } = F.fieldFrame();
    expect(adapted.ok).toBe(true);
    expect(frame.width).toBe(192);
    expect(adapted.unit).toBe('electron');
    // The sky, to 1 percent: 90 electrons a pixel is 60 ADU at a gain of 1.5.
    const sorted = Float64Array.from(frame.data).sort();
    near(sorted[Math.floor(sorted.length / 2)], 60, 0.6);
  });
});

describe('the first instrument: what the detector lists', () => {
  const view = v => W.sourcesView(v);
  test('at 4 sigma: thirty sources, no flag, ten stars missed and no noise listed', () => {
    const f = view({ sigma: 4 });
    expect(f.sources).toHaveLength(30);
    expect(f.flagged).toBe(0);
    expect(f.truth.found).toBe(30);
    expect(f.truth.missed).toHaveLength(10);
    expect(f.truth.false).toHaveLength(0);
    // Every star of signal to noise 7 or more is found; the faintest ten are not.
    for (const s of F.STARS.filter(x => x.snr >= 7))
      expect(f.truth.missed.includes(s)).toBe(false);
    expect(Math.min(...f.truth.missed.map(s => s.snr))).toBeCloseTo(3.1, 6);
    expect(Math.max(...f.truth.missed.map(s => s.snr))).toBeLessThan(6);
  });

  test('at 2.5 sigma: 44 sources, 37 stars and seven that are only noise', () => {
    const f = view({ sigma: 2.5, truth: 1 });
    expect(f.sources).toHaveLength(44);
    expect(f.truth.found).toBe(37);
    expect(f.truth.false).toHaveLength(7);
    expect(f.truth.missed).toHaveLength(3);
  });

  test('at 3 and at 2 sigma', () => {
    const a = view({ sigma: 3 });
    expect([a.sources.length, a.truth.found, a.truth.false.length]).toEqual([
      37, 37, 0,
    ]);
    const b = view({ sigma: 2 });
    expect([b.sources.length, b.truth.false.length]).toEqual([73, 36]);
  });

  test('the threshold is snapped to its step and kept in range', () => {
    expect(view({ sigma: 4.2 }).sigma).toBe(4);
    expect(view({ sigma: 9 }).sigma).toBe(6);
    expect(view({ sigma: 0 }).sigma).toBe(2);
  });

  test('the width: six clean stars, 3.00 plus or minus 0.02, and the models agree', () => {
    const p = view({ sigma: 4 }).psf;
    expect(p.ok).toBe(true);
    expect(p.stars).toHaveLength(6);
    near(p.fwhm.mean, 2.995, 0.005);
    near(p.fwhm.sigma, 0.0153, 0.001);
    expect(p.modelLimited).toBe(false);
    expect(p.disagree).toBe(0);
    near(p.chi2red, 0.94, 0.02);
    // The truth: the frame was made with a width of 3.0 pixels, which the
    // measurement recovers to within two of its sigmas.
    near(p.fwhm.mean, F.FIELD.fwhm, 2 * p.fwhm.sigma);
  });

  test('the readout says what the instrument reads, and the truth only when asked', () => {
    const rows = v =>
      Object.fromEntries(
        W.IMAGING_WIDGETS[3].readout(v).map(r => [r.label, r.value])
      );
    const hidden = rows({ sigma: 4, truth: 0 });
    expect(hidden['Sources listed']).toBe('30');
    expect(hidden['Stars that were placed']).toBeUndefined();
    const shown = rows({ sigma: 2.5, truth: 1 });
    expect(shown['Sources listed']).toBe('44');
    expect(shown['Sources that are not a star that was placed']).toBe('7');
    expect(shown['Stars that were placed']).toBe('40');
  });
});

describe('the second instrument: the completeness curve', () => {
  const view = v => W.completenessView(v);
  const bins = c => c.curve.bins.map(b => [b.k, b.n]);
  test('at 4 sigma and a width of 3: the bins, the half point and the nine in ten point', () => {
    const c = view({ sigma: 4, width: 3 });
    expect(c.ok).toBe(true);
    expect(c.curve.injected).toBe(240);
    expect(c.curve.trials).toBe(12);
    expect(bins(c)).toEqual([
      [34, 34],
      [33, 35],
      [41, 52],
      [12, 39],
      [2, 40],
      [2, 40],
    ]);
    near(c.curve.m50.m, -2.47, 0.005);
    near(c.curve.m50.lo, -2.517, 0.005);
    near(c.curve.m50.hi, -2.418, 0.005);
    near(c.curve.m90.m, -2.867, 0.005);
    expect(c.curve.extraPerTrial).toBe(0);
    const b = c.curve.bins[3];
    near(100 * b.p, 30.8, 0.1);
    near(100 * b.interval.lo, 23, 0.6);
    near(100 * b.interval.hi, 40, 0.6);
    expect(c.applies).toEqual({ ok: true });
  });

  test('at 3 sigma: a third of a magnitude fainter, and the tool refuses to call it the 4 sigma curve', () => {
    const c = view({ sigma: 3, width: 3 });
    near(c.curve.m50.m, -2.144, 0.005);
    near(c.curve.m90.m, -2.533, 0.005);
    expect(
      c.curve.m50.m - view({ sigma: 4, width: 3 }).curve.m50.m
    ).toBeGreaterThan(0.3);
    expect(c.applies.ok).toBe(false);
    expect(c.applies.differs).toEqual(['detection']);
  });

  test('stars of 4.5 pixels: half at -2.79, never nine in ten, and a different width', () => {
    const c = view({ sigma: 4, width: 4.5 });
    near(c.curve.m50.m, -2.793, 0.005);
    expect(c.curve.m90.m).toBeNull();
    near(100 * c.curve.bins[0].p, 90, 1);
    expect(c.applies.differs).toContain('psf');
  });

  test('the curve against the field’s own stars: 27.2 expected, 30 listed, within the scatter', () => {
    const c = view({ sigma: 4, width: 3 });
    near(c.expected, 27.2, 0.05);
    expect(c.found).toBe(30);
    // each star is found with a chance, so a count of forty scatters
    const live = c.curve.bins.filter(b => b.n);
    const at = m => {
      if (m <= live[0].center) return live[0].p;
      if (m >= live[live.length - 1].center) return live[live.length - 1].p;
      let i = 0;
      while (live[i + 1].center < m) i += 1;
      const t = (m - live[i].center) / (live[i + 1].center - live[i].center);
      return live[i].p + t * (live[i + 1].p - live[i].p);
    };
    const sd = Math.sqrt(
      F.STARS.reduce((s, x) => s + at(x.mag) * (1 - at(x.mag)), 0)
    );
    near(sd, 1.6, 0.1);
    const z = Math.abs(c.found - c.expected) / sd;
    expect(z).toBeGreaterThan(1.5);
    expect(z).toBeLessThan(2);
  });

  test('the same seed gives the same curve, and the frame is not changed by an injection', () => {
    const before = Float64Array.from(F.fieldFrame().frame.data);
    const again = F.completenessOf({ sigma: 4, width: 3 });
    expect(again.curve).toBe(view({ sigma: 4, width: 3 }).curve);
    const after = F.fieldFrame().frame.data;
    expect(after.every((v, i) => v === before[i])).toBe(true);
  });

  test('the readout names the curve, its crossings and what it applies to', () => {
    const rows = v =>
      Object.fromEntries(
        W.IMAGING_WIDGETS[4].readout(v).map(r => [r.label, r.value])
      );
    const r = rows({ sigma: 3, width: 3, truth: 0 });
    expect(r['Magnitude at 50 percent found']).toMatch(/^−2\.14 /);
    expect(
      r['Describes the first instrument’s search (threshold 4, width 3)?']
    ).toMatch(/^No: it differs in detection/);
    expect(
      rows({ sigma: 4, width: 3, truth: 1 })[
        'Stars of the field the search listed'
      ]
    ).toBe('30');
    expect(r['Stars of the field the search listed']).toBeUndefined();
    expect(
      rows({ sigma: 4, width: 4.5 })['Magnitude at 90 percent found']
    ).toBe('the curve never crosses it');
  });
});

describe('every validator accepts what the instrument reads and refuses a wrong value', () => {
  const ok = (sid, values) => {
    const s = step(sid);
    expect(s.validate(values).level).toBe('ok');
    const bad = Object.fromEntries(Object.keys(values).map(k => [k, 12345]));
    expect(s.validate(bad).level).toBe('error');
    const hints = Object.fromEntries(s.fields.map(f => [f.id, Number(f.hint)]));
    expect(s.validate(hints).level).toBe('ok');
  };
  test('the core steps', () => {
    const a = W.sourcesView({ sigma: 4 });
    ok('how-many-sources', { n: a.sources.length, flagged: a.flagged });
    const b = W.sourcesView({ sigma: 2.5, truth: 1 });
    ok('lower-the-threshold', {
      n: b.sources.length,
      noise: b.truth.false.length,
    });
    ok('the-width', {
      n: a.psf.stars.length,
      w: a.psf.fwhm.mean,
      s: a.psf.fwhm.sigma,
    });
    const c = W.completenessView({ sigma: 4, width: 3 });
    ok('one-magnitude', {
      bright: 100 * c.curve.bins[0].p,
      faint: 100 * c.curve.bins[3].p,
    });
    ok('the-curve', { m50: c.curve.m50.m, m90: c.curve.m90.m });
  });
  test('the deeper steps', () => {
    const c3 = W.completenessView({ sigma: 3, width: 3 });
    ok('a-lower-threshold', { m50: c3.curve.m50.m, m90: c3.curve.m90.m });
    const c = W.completenessView({ sigma: 4, width: 3 });
    ok('the-curve-and-the-field', { expected: c.expected, found: c.found });
    const w = W.completenessView({ sigma: 4, width: 4.5 });
    ok('a-wrong-width', {
      m50: w.curve.m50.m,
      bright: 100 * w.curve.bins[0].p,
    });
  });
  test('the choice answers are in range and the lesson’s predict step is held', () => {
    for (const s of withAllDepths(lesson).steps.filter(
      x => x.kind === 'choice' || x.type === 'predict'
    ))
      expect(s.answer).toBeLessThan(s.options.length);
    expect(step('predict-the-list').reveal).toBe('how-many-sources');
  });
  test('the stated values in the prose are the recomputed ones', () => {
    const text = JSON.stringify(withAllDepths(lesson).steps);
    for (const n of ['30', '44', '2.5', '−2.47', '−2.87', '3.00', '0.02'])
      expect(text).toContain(n);
  });
});
