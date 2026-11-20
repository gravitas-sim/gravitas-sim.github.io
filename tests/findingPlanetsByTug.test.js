import { describe, test, expect, beforeAll } from '@jest/globals';

import { registerMessages } from '../js/i18n/index.js';
import { EN_DEFERRED } from '../js/i18n/en.deferred.js';
import { checkAnswer, gradeAnswer, toleranceFor } from '../js/answerCheck.js';
import { matchMisconception } from '../js/answerFeedback.js';
import { numberText } from '../js/investigations/figures.js';
import { allWidgets, openingValues, whenWidgetsReady } from '../js/widgets.js';
import { radialVelocitySemiAmplitude } from '../js/exoplanetObservables.js';
import { HD209458 } from '../js/data/exoplanetSystems.js';
import RV from '../js/data/investigations/radial-velocity.js';
import { RADIAL_VELOCITY_DEEPER } from '../js/data/investigations/joint-sequence.js';
import { loadAuthoringInputs } from '../tools/authoring/inputs.mjs';
import { judgeOpening, loadMap } from '../tools/authoring/neutralStart.mjs';

// =============================================================================
// Finding Planets by Their Tug: the student's own K and mass
// -----------------------------------------------------------------------------
// The planet's mass is found by searching for the one that reproduces the K the
// student took, from an instrument that does not open on the answer. These
// check that no instrument or body before the weighing hands over 0.69 or 84,
// that the readings are taken as printed, and the physics the lesson prints
// against a calculation written out here from the constants, not from the
// instruments.
// =============================================================================

registerMessages('en', EN_DEFERRED);
await whenWidgetsReady();

const step = sid => RV.steps.find(s => s.sid === sid);
const SIDS = RV.steps.map(s => s.sid);
const before = sid => RV.steps.slice(0, SIDS.indexOf(sid));
const widget = id => allWidgets().find(w => w.id === id);

describe('what the student sees before the weighing', () => {
  const earlier = before('weigh-hd-209458-b');
  const words = s =>
    [
      s.title,
      s.body,
      s.tip,
      s.prompt,
      s.tool?.note,
      ...(s.options ?? []),
      ...(s.checklist ?? []),
    ]
      .filter(Boolean)
      .join(' ');

  test('no step before the weighing says 84, 0.69, two thirds or a seventeen-hundredth', () => {
    for (const s of earlier) {
      expect([
        s.sid,
        words(s).match(/\b84\b|0[.,]69|two thirds|seventeen/),
      ]).toEqual([s.sid, null]);
    }
  });

  test('no instrument before the weighing opens at the real planet, or offers it as a preset', () => {
    for (const s of earlier.filter(x => x.tool)) {
      const w = widget(s.tool.id);
      const v = openingValues(w, s.tool);
      if (v.mp !== undefined)
        expect([s.sid, Math.abs(v.mp - 0.69) > 0.1]).toEqual([s.sid, true]);
      const presets =
        typeof w.presets === 'function' ? w.presets(s.tool) : (w.presets ?? []);
      if (['reflex-motion', 'rv-mass'].includes(w.id))
        expect(presets.map(p => p.label)).not.toContain('HD 209458 b');
    }
  });

  test('the weighing instrument opens at a mass whose K is far from the one to match', () => {
    const w = widget('rv-inclination');
    const v = openingValues(w, step('weigh-hd-209458-b').tool);
    expect(v.inc).toBe(90);
    const K = w.compute(v).K;
    expect(Math.abs(K - 84) / 84).toBeGreaterThan(0.3);
  });

  test('the characterization panel opens on neither the radius nor the mass it is used for', () => {
    const w = widget('planet-characterization');
    const v = openingValues(w, step('characterize-the-planet').tool);
    expect(v.rp).not.toBeCloseTo(1.38, 1);
    expect(v.mp).not.toBeCloseTo(0.69, 1);
    expect(Math.abs(w.compute(v).density.gramsPerCm3 - 0.33)).toBeGreaterThan(
      0.3
    );
  });
});

describe('the readings the student takes', () => {
  const ctxWith = range => ({
    rvNow: () => ({
      name: 'HD 209458',
      held: false,
      velocity: -12.3,
      phaseDeg: 90,
      observerAngleDeg: 90,
      towards: 'towards us',
      range: range && {
        ...range,
        shown: range.halfRange.toFixed(1),
      },
    }),
  });
  const k = (range, sid = 'read-k-off-the-panel') =>
    step(sid)
      .probe(ctxWith(range))
      .find(r => r.id === 'k');

  test('K is the half-range the panel prints, three figures, and says when the curve has not turned yet', () => {
    const done = k({ halfRange: 84.0432, bracketedBothExtremes: true });
    expect(numberText(done)).toBe('84.0');
    expect(done.label).toMatch(/^Half-range ½/);
    const early = k({ halfRange: 31.2, bracketedBothExtremes: false });
    expect(numberText(early)).toBe('31.2');
    expect(early.label).toMatch(/so far/);
    expect(numberText(k(null))).toBeNull();
  });

  test('the K field takes that row, starts empty and carries no hint', () => {
    const f = step('read-k-off-the-panel').fields[0];
    expect(f.source).toEqual({ probe: 'k' });
    expect(f.hint).toBeUndefined();
    expect(f.value).toBeUndefined();
  });

  test('the star’s own orbit is a row with an id and a number a field can take as printed', () => {
    const w = widget('reflex-motion');
    const row = w
      .readout(openingValues(w, step('read-the-two-wobbles').tool))
      .find(r => r.id === 'aStar');
    expect(numberText(row)).toMatch(/^\d\.\d\de-\d$/);
    const fields = step('read-the-two-wobbles').fields;
    expect(fields.map(f => f.source.tool)).toEqual(['aStar', 'aStar']);
  });

  test('the two readings must differ, and say nothing about which way', () => {
    const { validate } = step('read-the-two-wobbles');
    expect(validate({ light: 9e-6 })).toBeNull();
    expect(validate({ light: 9e-6, heavy: 9e-6 }).level).toBe('warn');
    expect(validate({ light: 0, heavy: 9e-6 }).level).toBe('error');
    const ok = validate({ light: 9e-6, heavy: 3e-5 });
    expect(ok.level).toBe('ok');
    expect(ok.message).not.toMatch(/bigger|larger|heavier|more/i);
  });

  test('the prediction about the heavier planet is revealed where the two readings are set beside it', () => {
    const predict = step('make-the-planet-heavier');
    const reveal = step(predict.reveal);
    expect(reveal.evidence).toEqual([
      { step: 'read-the-two-wobbles', field: 'light' },
      { step: 'read-the-two-wobbles', field: 'heavy' },
    ]);
    expect(SIDS.indexOf('read-the-two-wobbles')).toBeGreaterThan(
      SIDS.indexOf(predict.sid)
    );
    expect(SIDS.indexOf('read-the-two-wobbles')).toBeLessThan(
      SIDS.indexOf(reveal.sid)
    );
  });
});

describe('the weighing and the density grade the student’s own numbers', () => {
  const mass = step('weigh-hd-209458-b');
  const density = step('density-from-your-mass');

  test('a peak-to-peak mass fails with the authored message', () => {
    const doubled = gradeAnswer(mass, '1.38');
    expect(doubled.correct).toBe(false);
    const missed = matchMisconception(mass, doubled.value, toleranceFor(mass));
    expect(missed.id).toBe('peakToPeakForSemiAmplitude');
    expect(missed.message || '').not.toMatch(/\b84\b|0\.69/);
  });

  test('every mass the student could have taken from a good K gives a density the step accepts', () => {
    for (const m of [0.62, 0.66, 0.69, 0.72, 0.76]) {
      expect(checkAnswer(mass, String(m))).toBe(true);
      // The step's own hint: Jupiter's 1.24 g/cm³ scaled by mass over radius cubed.
      const rho = (1.24 * m) / 1.38 ** 3;
      expect([m, checkAnswer(density, rho.toFixed(3))]).toEqual([m, true]);
    }
  });

  test('Earth’s density from the panel is still named, and the old step is retired with this one as successor', () => {
    const out = gradeAnswer(density, '5.51');
    expect(
      matchMisconception(density, out.value, toleranceFor(density)).id
    ).toBe('earthNotPlanet');
    expect(SIDS).not.toContain('how-dense-is-it');
    const gone = RV.retired['how-dense-is-it'];
    expect(gone.to).toBe('density-from-your-mass');
    expect(SIDS).toContain(gone.to);
    expect(gone.was.en.length).toBeGreaterThan(10);
    expect(gone.was.es.length).toBeGreaterThan(10);
    expect(RADIAL_VELOCITY_DEEPER.steps[0].after).toBe(gone.to);
  });
});

describe('the numbers the lesson prints, worked from the constants', () => {
  // Written out here from CODATA values rather than read from the instruments.
  const G = 6.6743e-11;
  const M_SUN = 1.98847e30;
  const M_JUP = 1.89813e27;
  const R_JUP_EQ = 7.1492e7;
  const AU = 1.495978707e11;
  const K = (mp, mStar, days, sini = 1) =>
    ((2 * Math.PI * G) / (days * 86400)) ** (1 / 3) *
    ((mp * M_JUP * sini) / (mStar * M_SUN + mp * M_JUP) ** (2 / 3));

  test('K for the published planet is about 84 m/s, and the instruments agree with the calculation', () => {
    const { star, planet } = HD209458;
    const mine = K(planet.massJupiter, star.massSolar, planet.periodDays);
    expect(mine).toBeGreaterThan(83);
    expect(mine).toBeLessThan(85.5);
    const theirs = radialVelocitySemiAmplitude({
      starMassSolar: star.massSolar,
      planetMassJupiter: planet.massJupiter,
      periodDays: planet.periodDays,
    });
    expect(theirs / mine).toBeCloseTo(1, 3);
  });

  test('K is proportional to the planet mass at fixed period, so the search the student does has one answer', () => {
    const { star, planet } = HD209458;
    const at = m => K(m, star.massSolar, planet.periodDays);
    expect(at(0.69) / at(0.345)).toBeCloseTo(2, 2);
    expect(at(0.25)).toBeLessThan(84 * 0.4);
  });

  test('the star’s own orbit is some thirty millionths of an AU, a few thousand kilometres', () => {
    const a = 0.04747;
    const mp = 0.69 * M_JUP;
    // One solar mass, as the instrument has it; and the real 1.148.
    const orbit = M => (a * mp) / (M * M_SUN + mp);
    expect(orbit(1)).toBeGreaterThan(2.5e-5);
    expect(orbit(1)).toBeLessThan(3.5e-5);
    expect((orbit(1.148) * AU) / 1000).toBeGreaterThan(3000);
    expect((orbit(1.148) * AU) / 1000).toBeLessThan(5000);
    const w = widget('reflex-motion');
    expect(w.compute({ mp: 0.69, a, mag: 400 }).aStar / orbit(1)).toBeCloseTo(
      1,
      2
    );
  });

  test('the density is 0.33 g/cm³, and Jupiter at its equatorial radius is 1.24', () => {
    const rho = (m, r) =>
      (m * M_JUP) / ((4 / 3) * Math.PI * (r * R_JUP_EQ) ** 3) / 1000;
    expect(rho(1, 1)).toBeCloseTo(1.24, 2);
    expect(rho(0.69, 1.38)).toBeCloseTo(0.326, 3);
  });
});

describe('the lesson standard on the steps this changed', () => {
  let inputs;
  let map;
  beforeAll(async () => {
    inputs = await loadAuthoringInputs();
    map = loadMap();
  });

  test('the two-readings step opens neutral, whatever the instrument shows at open', () => {
    const lesson = inputs.investigations.find(i => i.id === 'radial-velocity');
    const s = lesson.steps.find(x => x.sid === 'read-the-two-wobbles');
    const w = inputs.widgets.find(x => x.id === s.tool.id);
    expect(
      judgeOpening(s, w, map['radial-velocity/read-the-two-wobbles']).verdict
    ).toBe('neutral');
  });
});
