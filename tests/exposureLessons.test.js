// =============================================================================
// The exposure lessons, in two languages (Roadmap III, Prompt 210)
// -----------------------------------------------------------------------------
// Every number a step states is recomputed from the planner the lesson draws
// (js/exposureWidgets.js over planExposure), read in the form the validator takes,
// and fed to the step's own validator; the Spanish carries the same step
// structure; the new upper-depth steps of Signal, Noise and Exposure are
// recomputed from the existing instrument (snrView); and the supplied zero points
// of the panel are held to the radiation kernel's passbands.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
// The shared kernel modules first: Jest's VM loses a module several imports link at once.
import '../js/kernels/detector/pipeline.js';
import { exposureView, SETUPS, THROUGHPUT } from '../js/exposureWidgets.js';
import { snrView } from '../js/detectorWidgets.js';
import { areaOf } from '../js/instruments/exposure.js';
import { zeroPointOf } from '../js/instruments/exposureSky.js';
import { BANDS } from '../js/data/radiation/bandpasses.js';
import { decodeBand } from '../js/kernels/radiation/photometry.js';
import {
  PLAN_AN_EXPOSURE,
  PLAN_AN_EXPOSURE_ES,
} from '../js/data/investigations/exposure-sequence.js';
import SNR_DEEP from '../js/data/investigations/depth/signal-noise-and-exposure.js';
import SNR_DEEP_ES from '../js/data/investigations/depth/es/signal-noise-and-exposure.js';

const step = sid => PLAN_AN_EXPOSURE.steps.find(s => s.sid === sid);
const view = (v = {}) =>
  exposureView({ setup: 3, kind: 0, mag: 24, target: 20, exposures: 2, ...v });

describe('Plan an Exposure: the numbers the steps state', () => {
  test('the plan: 455.3 s and a 5 sigma limit of 25.51', () => {
    const p = view().plan;
    const ok = step('the-plan').validate({
      total: p.seconds,
      limit: p.limitingMagnitude,
    });
    expect(ok.level).toBe('ok');
    expect(p.seconds).toBeCloseTo(455.27, 1);
    expect(p.dominant).toBe('sky');
    expect(step('the-plan').validate({ total: 300, limit: 25.5 }).level).toBe(
      'error'
    );
  });
  test('twenty exposures: 512 s, the read noise 12.5 percent', () => {
    const p = view({ exposures: 20 }).plan;
    const read = 100 * p.budget.find(b => b.term === 'read').share;
    expect(
      step('twenty-exposures').validate({ total: p.seconds, read }).level
    ).toBe('ok');
    expect(p.seconds).toBeGreaterThan(view().plan.seconds);
  });
  test('the air and the moon', () => {
    const air = view({ airmass: 2 }).plan.seconds / view().plan.seconds;
    expect(Math.abs(air - step('airmass-cost').answer)).toBeLessThan(
      step('airmass-cost').tolerance
    );
    const at = moon =>
      view({ setup: 1, mag: 22, exposures: 1, moon }).plan.seconds;
    expect(Math.abs(at(2) / at(0) - step('the-moon').answer)).toBeLessThan(
      step('the-moon').tolerance
    );
  });
  test('the frame: predicted and measured', () => {
    const f = view().frame;
    expect(
      step('on-the-frame').validate({
        predicted: f.predicted.snr,
        measured: f.measured.snr,
      }).level
    ).toBe('ok');
    expect(
      step('on-the-frame').validate({ predicted: 20, measured: 8 }).level
    ).toBe('error');
  });
  test('a target the limit forbids is refused with the SNR four hours reach', () => {
    const p = view({ mag: 29 }).plan;
    expect(p.status).toBe('not-reachable');
    expect(p.reachedSnr).toBeCloseTo(1.1, 1);
    expect(p.seconds).toBeUndefined();
  });
  test('a bright target warns about the flat-field floor', () => {
    const p = view({ mag: 16, target: 150 }).plan;
    expect(p.warnings.map(w => w.code)).toContain('beyond-flat-field-accuracy');
  });
});

describe('Plan an Exposure: the two languages agree', () => {
  test('the Spanish follows the English step by step', () => {
    expect(PLAN_AN_EXPOSURE_ES.steps).toHaveLength(
      PLAN_AN_EXPOSURE.steps.length
    );
    PLAN_AN_EXPOSURE.steps.forEach((s, i) => {
      const es = PLAN_AN_EXPOSURE_ES.steps[i];
      expect(es.title).toBeTruthy();
      expect(Boolean(es.options)).toBe(Boolean(s.options));
      if (s.options) expect(es.options).toHaveLength(s.options.length);
      expect(es.fields?.length ?? 0).toBe(s.fields?.length ?? 0);
      expect((es.misconceptions ?? []).length).toBe(
        (s.misconceptions ?? []).length
      );
    });
  });
});

describe('Signal, Noise and Exposure: the new upper-depth steps', () => {
  const dstep = sid => SNR_DEEP.steps.find(s => s.sid === sid);
  const share = (v, term) => {
    const a = snrView(v);
    return (100 * a.terms[term]) / a.terms.variance;
  };
  test('the largest term of the budget under three conditions', () => {
    const a = snrView({ mag: 15, exposure: 60, radius: 5, sky: 0 });
    expect(a.dominant).toBe('source');
    expect(
      Math.abs(
        share({ mag: 15, exposure: 60, radius: 5, sky: 0 }, 'source') -
          dstep('budget-bright-dark').answer
      )
    ).toBeLessThan(dstep('budget-bright-dark').tolerance);
    const b = { mag: 19, exposure: 10, radius: 3, sky: 0 };
    expect(snrView(b).dominant).toBe('read');
    expect(
      Math.abs(share(b, 'read') - dstep('budget-faint-short').answer)
    ).toBeLessThan(dstep('budget-faint-short').tolerance);
    const c = { mag: 19, exposure: 300, radius: 3, sky: 2 };
    expect(snrView(c).dominant).toBe('sky');
    expect(
      Math.abs(share(c, 'sky') - dstep('budget-faint-moon').answer)
    ).toBeLessThan(dstep('budget-faint-moon').tolerance);
  });
  test('the read-noise crossover is where the sky and dark variance equal it', () => {
    const a = snrView({ mag: 19, exposure: 10, radius: 3, sky: 0 });
    const t = 8 ** 2 / (a.p.skyRate + a.p.darkRate);
    expect(Math.abs(t - dstep('read-noise-crossover').answer)).toBeLessThan(
      dstep('read-noise-crossover').tolerance
    );
  });
  test('the Spanish deeper steps stay index-aligned', () => {
    expect(SNR_DEEP_ES.steps).toHaveLength(SNR_DEEP.steps.length);
    SNR_DEEP_ES.steps.forEach(s => expect(s.worked?.length).toBeGreaterThan(0));
  });
});

describe('the panel’s supplied zero points', () => {
  test('each is the radiation kernel’s passband through the library’s area at the supplied throughput', () => {
    for (const sx of SETUPS) {
      const band = decodeBand(BANDS.find(b => b.id === sx.band));
      const z = zeroPointOf(band, areaOf(sx.id).areaM2, THROUGHPUT, sx.system);
      expect(Math.abs(z / sx.zeroPoint - 1)).toBeLessThan(1e-9);
    }
  });
});
