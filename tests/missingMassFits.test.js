// =============================================================================
// The Missing Mass: the fits a student makes, and what the lesson no longer
// says before it asks
// -----------------------------------------------------------------------------
// The lesson is content only, so what can be tested without a browser is its
// shape and its judgments: that the steps whose task did not change keep their
// fingerprint, that the one revised step is retired with a successor and the
// MOND steps moved to the advanced path under their own ids, that the fitting
// instrument opens neutral, that a stars-only fit passes only as a miss and a
// heavy disc fails at the inner end, that every fit that reaches FITTED with
// the disc held gives a ratio the question accepts, that the outer-star reading
// accepts any outer star, and that no body, tip or checklist states what a step
// asks the student to find. The browser walk is e2e/missingMass.spec.js and the
// central experiment is in e2e/centralExperiments.spec.js.
// =============================================================================

import { describe, expect, test } from '@jest/globals';
import LESSON from '../js/data/investigations/missing-mass.js';
import DEEPER from '../js/data/investigations/depth/missing-mass.js';
import LESSON_ES from '../lesson-text/es/missing-mass.js';
import DEEPER_ES from '../lesson-text/depth-es/missing-mass.js';
import { DARK_MATTER_WIDGETS } from '../js/darkMatterWidgets.js';
import { whenWidgetsReady } from '../js/widgets.js';
import { stepFingerprint } from '../js/investigations/progressBackup.js';
import { checkAnswer } from '../js/answerCheck.js';
import {
  layDepth,
  lessonAt,
  stepCounts,
} from '../js/investigations/depthPure.js';

await whenWidgetsReady();

const steps = LESSON.steps;
const at = sid => steps.findIndex(s => s.sid === sid);
const step = sid => steps[at(sid)];
const deeper = sid => DEEPER.steps.find(s => s.sid === sid);
const plain = s => String(s ?? '').replace(/<[^>]*>/g, ' ');
const prose = s => plain([s.body, s.tip, ...(s.checklist ?? [])].join(' '));
const fit = DARK_MATTER_WIDGETS.find(w => w.id === 'dm-fit');
const HELD = { discMass: 3.3, discScale: 2.6 };

/** The fit of one setting of the four sliders, as the instrument scores it. */
const compute = v => fit.compute({ discScale: 2.6, haloCore: 6, ...v });

describe('what changed and what did not', () => {
  test('the steps whose task did not change keep their fingerprint', () => {
    // Pinned from the lesson as it shipped: a reword is silent to every reader
    // of saved work, so none of these may move.
    const kept = {
      'which-arrangement-gives-a-flat':
        'question|choice|dm-shapes|-|-|4|a=3;c=3',
      'what-a-flat-curve-requires': 'question|choice|dm-enclosed|-|-|4|a=1;c=1',
      'now-a-galaxy': 'predict|-|-|Spiral Galaxy|-|4|a=0;c=0',
      'measure-the-real-curve': 'measure|-|-|-|obs_slope+obs_shape+obs_gap|-|-',
      'try-it-with-stars-alone': 'explore|-|dm-fit|-|-|-|-',
      'record-your-best-stars-only':
        'measure|-|dm-fit|-|so_rms+so_disc+so_worst+so_sign|-|-',
      'why-a-heavier-disc-cannot': 'question|choice|dm-fit|-|-|4|a=1;c=1',
      'now-add-the-halo': 'explore|-|dm-fit|-|-|-|-',
      'record-the-fit-that-works':
        'measure|-|dm-fit|-|fit_vflat+fit_core+fit_rms+fit_visible+fit_halo|-|-',
      'how-much-of-it-is': 'question|numeric|dm-fit|-|-|-|a=3.4;t=0.9;u=×',
      'measure-the-simulated-cluster':
        'measure|-|-|-|cl_n+cl_sigma+cl_R+cl_visible|-|-',
    };
    for (const [sid, print] of Object.entries(kept))
      expect(stepFingerprint(step(sid))).toBe(print);
  });

  test('the revised step is retired with its successor, which the lesson has', () => {
    expect(Object.keys(LESSON.retired)).toEqual([
      'dark-fraction-with-an-error-bar',
    ]);
    const r = LESSON.retired['dark-fraction-with-an-error-bar'];
    expect(r.to).toBe('error-bar-from-your-fits');
    expect(deeper(r.to)?.depth).toBe('quantitative');
    expect(r.was.en && r.was.es).toBeTruthy();
    const live = new Set([...steps, ...DEEPER.steps].map(s => s.sid));
    expect(live.has('dark-fraction-with-an-error-bar')).toBe(false);
  });

  test('the MOND steps are advanced, with the ids they had, and the core ends on its conclusion', () => {
    const mond = [
      'a-different-way-to-read',
      'fit-it-both-ways',
      'the-prediction-mond-makes',
      'does-the-curve-decide',
    ];
    for (const sid of mond) {
      expect(at(sid)).toBe(-1);
      expect(deeper(sid)?.depth).toBe('advanced');
    }
    const laid = layDepth(LESSON, DEEPER.steps);
    const order = laid.steps.map(s => s.sid);
    expect(order.indexOf('a-different-way-to-read')).toBe(
      order.indexOf('now-compare') + 1
    );
    expect(stepCounts(laid)).toEqual({
      core: 31,
      quantitative: 33,
      advanced: 41,
    });
    expect(lessonAt(laid, 'core').steps.at(-1).sid).toBe('where-it-stands');
  });

  test('the two fits sit in one table, and the prediction comes before its run', () => {
    const cmp = step('compare-your-two-fits');
    expect(cmp.requires).toEqual([
      'record-your-best-stars-only',
      'record-the-fit-that-works',
    ]);
    expect(at('compare-your-two-fits')).toBe(
      at('record-the-fit-that-works') + 1
    );
    // Every row but the student's own decision is copied from a saved fit.
    const rows = cmp.fields.filter(f => f.compute);
    expect(rows).toHaveLength(5);
    const read = { v: 0 };
    const saved = {
      'record-your-best-stars-only:so_rms': 14.5,
      'record-your-best-stars-only:so_disc': 8.5,
      'record-the-fit-that-works:fit_rms': 2.1,
      'record-the-fit-that-works:fit_visible': 3.35,
      'record-the-fit-that-works:fit_halo': 11.4,
    };
    const got = rows.map(f =>
      f.compute(read, (sid, field) => saved[`${sid}:${field}`])
    );
    expect(got).toEqual([14.5, 8.5, 2.1, 3.35, 11.4]);

    const p = step('predict-the-disc-without-its-halo');
    expect(p.type).toBe('predict');
    expect(p.reveal).toBe('take-the-halo-away-from');
    expect(at(p.reveal)).toBe(at(p.sid) + 1);
    expect(p.options).toHaveLength(4);
    // The pattern it asks about is not stated in any step before it.
    for (const s of steps.slice(0, at(p.sid)))
      expect(prose(s)).not.toMatch(
        /outside in|unwinds|outer stars (?:first|leave)|come apart/i
      );
  });

  test('every English step has its Spanish, and the Spanish has no step the English lacks', () => {
    expect(Object.keys(LESSON_ES.steps).sort()).toEqual(
      steps.map(s => s.sid).sort()
    );
    expect(Object.keys(DEEPER_ES.steps).sort()).toEqual(
      DEEPER.steps.map(s => s.sid).sort()
    );
  });

  test('every deeper step names what the student decides, in both languages', () => {
    for (const s of DEEPER.steps) {
      if (s.type === 'read') continue;
      expect(typeof s.decides).toBe('string');
      expect(DEEPER_ES.steps[s.sid].decides?.length).toBeGreaterThan(10);
    }
  });
});

describe('no step states what it asks the student to find', () => {
  test('the answers that sat in bodies and tips are gone', () => {
    expect(plain(step('which-arrangement-gives-a-flat').body)).not.toMatch(
      /only one of them/i
    );
    expect(plain(step('what-a-flat-curve-requires').body)).not.toMatch(
      /proportional to r/i
    );
    const galaxy = prose(step('now-a-galaxy'));
    expect(galaxy).not.toMatch(
      /exactly that assumption|launched at the speed|built like the Solar System/i
    );
    expect(prose(step('try-it-with-stars-alone'))).not.toMatch(
      /comes? back down/i
    );
  });

  test('no fit step hands over a target value outside its explanation', () => {
    const num = /\b(?:15 km\/s|3\.3|2\.6|150 km\/s|6 kpc|2 km\/s)\b/;
    for (const sid of [
      'now-do-what-the-astronomers',
      'try-it-with-stars-alone',
      'record-your-best-stars-only',
      'now-add-the-halo',
      'record-the-fit-that-works',
      'how-much-of-it-is',
    ])
      expect(prose(step(sid))).not.toMatch(num);
    // The worked values are in the BECAUSE of the question that uses them.
    expect(plain(step('how-much-of-it-is').because)).toMatch(/150 km\/s/);
    expect(plain(step('how-much-of-it-is').because)).toMatch(/3\.4/);
  });

  test('the fitting instrument opens neutral on every step that fits', () => {
    for (const s of steps.filter(x => x.tool?.id === 'dm-fit')) {
      const v = s.tool.values;
      expect(v.haloVFlat).toBe(0);
      // Never the published core, whether or not the slider is shown.
      if (v.haloCore !== undefined) expect(v.haloCore).not.toBe(6);
      const stars = s.tool.hide?.includes('haloVFlat');
      const held = s.tool.hide?.includes('discMass');
      if (stars) expect(v.discMass).toBe(0);
      // The disc is held only where its sliders are hidden: a premise, not a start.
      if (held) expect(s.tool.hide).toContain('discScale');
      else expect(v.discMass).toBe(0);
      // No button sets the fit for the student.
      expect(s.tool.presets).toBe(false);
    }
  });
});

describe('the central experiment: stars alone miss, and the halo fits', () => {
  const grid = (lo, hi, by) => {
    const out = [];
    for (let x = lo; x <= hi + 1e-9; x += by) out.push(x);
    return out;
  };

  test('a stars-only fit passes only as a miss, worst at the outer edge with the model too slow', () => {
    let best = { rms: Infinity };
    for (const discMass of grid(0, 16, 0.5))
      for (const discScale of grid(1, 8, 0.5)) {
        const f = compute({ discMass, discScale, haloVFlat: 0 });
        expect(f.good).toBe(false);
        if (f.fit.rms < best.rms) best = { ...f.fit, discMass };
      }
    // About 15 km/s against data good to about 5: three times the error bars.
    expect(best.rms).toBeGreaterThan(3 * 4.5);
    expect(best.rms).toBeLessThan(16);
    expect(best.worstR).toBe(30);
    expect(best.worst).toBeLessThan(0);
  });

  test('a heavy disc fails at the inner end, where the model runs too fast', () => {
    const f = compute({ discMass: 11, haloVFlat: 0 });
    expect(f.fit.rms).toBeGreaterThan(50);
    expect(f.fit.worst).toBeGreaterThan(0);
    expect(f.fit.worstR).toBeLessThanOrEqual(8);
  });

  test('every fit that reaches FITTED with the disc held gives a ratio the question accepts', () => {
    const q = step('how-much-of-it-is');
    let n = 0;
    for (const haloVFlat of grid(2, 220, 2))
      for (const haloCore of grid(1, 20, 0.5)) {
        const f = compute({ ...HELD, haloVFlat, haloCore });
        if (!f.good) continue;
        n++;
        expect(checkAnswer(q, f.ratio.toFixed(1))).toBe(true);
      }
    expect(n).toBeGreaterThan(30);
    // The ratio the student reads off their own fit is not a copy of one number.
    expect(checkAnswer(q, '3.4')).toBe(true);
    expect(checkAnswer(q, '1')).toBe(false);
    expect(checkAnswer(q, '9')).toBe(false);
  });

  test('the spread among fits the light allows stays inside what the error-bar step accepts', () => {
    const s = deeper('error-bar-from-your-fits');
    const accepted = [];
    for (const discMass of grid(2.64, 3.96, 0.33))
      for (const discScale of grid(1, 8, 1))
        for (const haloVFlat of grid(100, 220, 4))
          for (const haloCore of grid(1, 20, 0.5)) {
            const f = compute({ discMass, discScale, haloVFlat, haloCore });
            if (f.good) accepted.push(f.ratio);
          }
    expect(accepted.length).toBeGreaterThan(20);
    const lo = Math.min(...accepted);
    const hi = Math.max(...accepted);
    const v = { r_lo: +lo.toFixed(2), r_hi: +hi.toFixed(2) };
    expect(s.validate(v).level).toBe('ok');
    // One fit is not a spread; a reversed pair and a ratio the rules rule out are told so.
    expect(s.validate({ r_lo: 3.4, r_hi: 3.4 }).level).toBe('warn');
    expect(s.validate({ r_lo: 4, r_hi: 3 }).level).toBe('error');
    expect(s.validate({ r_lo: 3, r_hi: 9 }).level).toBe('warn');
    expect(s.validate({ r_lo: NaN, r_hi: 3 })).toBeNull();
    expect(s.fields.find(f => f.id === 'r_half').compute(v)).toBeCloseTo(
      (v.r_hi - v.r_lo) / 2,
      9
    );
  });
});

describe('the outer-star reading accepts any outer star', () => {
  const s = step('measure-the-real-curve');
  // A galaxy like the scene's: a bulge and ninety stars on a flat curve.
  const center = { x: 0, y: 0, mass: 26500 };
  const stars = Array.from({ length: 90 }, (_, i) => {
    const r = 8 + ((i + 1) / 90) * 887;
    const a = i * 2.399963;
    return {
      name: `Disc star ${i + 1}`,
      pos: { x: r * Math.cos(a), y: r * Math.sin(a) },
      vel: { x: -11 * Math.sin(a), y: 11 * Math.cos(a) },
      mass: 25,
    };
  });
  const ctxFor = selected => ({
    selected,
    G: 1,
    distance: x => `${Math.round(x)} u`,
    speed: x => `${x.toFixed(2)} u/t`,
    rotationCurve: () => ({ center, bodies: stars }),
  });
  const ratioOf = star =>
    Number.parseFloat(s.probe(ctxFor(star)).find(r => r.id === 'ratio').value);

  test('the probe names its rows, with and without a selection', () => {
    for (const sel of [null, stars[60]])
      expect(s.probe(ctxFor(sel)).map(r => r.id)).toEqual(
        expect.arrayContaining(['dist', 'speed', 'pred', 'ratio'])
      );
    expect(s.fields.find(f => f.id === 'obs_gap').source).toEqual({
      probe: 'ratio',
    });
  });

  test('every star in the outer three fifths passes; a ratio of no outer star is told so', () => {
    for (const star of stars.slice(36)) {
      const r = ratioOf(star);
      expect(r).toBeGreaterThan(1);
      expect(s.validate({ obs_gap: r }, ctxFor(star)).level).toBe('ok');
    }
    // A star close to the centre moves slower than the visible mass predicts.
    expect(ratioOf(stars[0])).toBeLessThan(1);
    for (const bad of [0.4, 6])
      expect(s.validate({ obs_gap: bad }, ctxFor(stars[60])).level).toBe(
        'warn'
      );
    expect(s.validate({ obs_gap: NaN }, ctxFor(stars[60]))).toBeNull();
  });
});
