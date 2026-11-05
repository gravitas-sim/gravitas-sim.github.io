// =============================================================================
// The galaxy-spectra kernel's public contract (Roadmap III, Prompt 248)
// -----------------------------------------------------------------------------
// The validation contract is tests/fixtures/galaxy/thresholds.json, run by tools/galaxy-validate.mjs and held in
// tests/galaxyResults.test.js. These tests hold the contracts a caller relies on: the correlation's recovery
// and its refusals, the status ladder, the break and its refusals, the line method and its refusals, the grid
// helpers, and the generator's label, truth manifest and determinism.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import * as G from '../js/kernels/galaxy/index.js';
import { LINES } from '../js/data/radiation/lines.js';
import { LAW } from '../js/data/radiation/extinction.js';

const ZR = { min: -0.005, max: 0.35 };
const tpl = kind => G.galaxyTemplate({ lines: LINES, kind });
const world = (kind, z, o = {}) =>
  G.generateGalaxy({ lines: LINES, law: LAW, kind, z, ...o });
const shifted = k => 10 ** (k * G.GALAXY_WORLD.log10Step) - 1;

describe('the committed constants', () => {
  test('the design choices are the ones the thresholds file states', () => {
    expect(G.Q_MIN).toBe(6);
    expect(G.Q_OK).toBe(10);
    expect(G.AMBIGUITY_RATIO).toBe(0.8);
    expect(G.EXCLUSION_SAMPLES).toBe(20);
    expect(G.HIGH_PASS_WINDOW).toBe(101);
    expect(G.CURVATURE_STEP).toBe(0.1);
    expect(G.MAX_RELATIVE_ERROR).toBe(0.25);
    expect(G.PRESENT_SIGMAS).toBe(3);
    expect(G.MIN_LINES).toBe(2);
  });
  test('the kernel holds no default template and no default break definition', () => {
    for (const name of Object.keys(G))
      expect(name).not.toMatch(/DEFAULT_(TEMPLATE|DEFINITION|BANDS)/i);
    expect(G.INVENTED_BREAK_BANDS.source).toMatch(/invented/);
    const [b0, b1] = G.INVENTED_BREAK_BANDS.blueNm;
    const [r0, r1] = G.INVENTED_BREAK_BANDS.redNm;
    expect(b1 - b0).toBe(16);
    expect(r1 - r0).toBe(16);
    expect(400 - b1).toBe(12);
    expect(r0 - 400).toBe(12);
  });
});

describe('the cross-correlation', () => {
  test('a template shifted by whole samples is recovered, ok, with a finite error', () => {
    for (const kind of ['star-forming', 'passive']) {
      const z = shifted(300);
      const r = G.crossCorrelate(
        world(kind, z, { noise: false, snr: 20 }),
        tpl(kind),
        { zRange: ZR }
      );
      expect(r.status).toBe('ok');
      expect(Math.abs(r.z - z)).toBeLessThan(1e-6);
      expect(r.sigmaZ).toBeGreaterThan(0);
      expect(r.interval.lo).toBeLessThan(r.z);
      expect(r.interval.hi).toBeGreaterThan(r.z);
      expect(r.assumes).toMatch(/template is the object/);
      expect(r.template.source).toMatch(/synthetic/);
    }
  });
  test('the integer-lag profile is returned on request and peaks at the best lag', () => {
    const w = world('passive', 0.1, { seed: 'p', snr: 12 });
    const r = G.crossCorrelate(w, tpl('passive'), {
      zRange: ZR,
      keepProfile: true,
    });
    const q = r.profile.q;
    const best = q.indexOf(Math.max(...q));
    expect(Math.abs(r.profile.lag0 + best - r.lag)).toBeLessThanOrEqual(1);
  });
  test('the status ladder: noise only is never ok (not constrained, low significance, or an ambiguous peak)', () => {
    const w = world('flat', 0, { seed: 'noise-1', snr: 10 });
    const r = G.crossCorrelate(w, tpl('passive'), { zRange: ZR });
    expect(r.status).not.toBe('ok');
    expect(['not-constrained', 'low-significance', 'refused']).toContain(
      r.status
    );
    if (r.status === 'not-constrained') expect(r.interval).toBeNull();
  });
  test('a spectrum without a sigma says its errors come from scatter', () => {
    const w = world('star-forming', 0.1, { seed: 's', snr: 10 });
    const r = G.crossCorrelate({ ...w, sigma: null }, tpl('star-forming'), {
      zRange: ZR,
    });
    expect(r.status).toBe('ok');
    expect(r.errorsFromScatter).toBe(true);
  });
  test('a comb is ambiguous and both candidates are named', () => {
    const c = G.generateComb({ z: 0.1, snr: 15, seed: 'c' });
    const r = G.crossCorrelate(c.spectrum, c.template, { zRange: ZR });
    expect(r.status).toBe('refused');
    expect(r.code).toBe('ambiguous-peak');
    expect(r.candidates).toHaveLength(2);
    expect(r.candidates.some(k => Math.abs(k.z - 0.1) < 1e-4)).toBe(true);
  });
  const w = world('star-forming', 0.1, { seed: 'r', snr: 10 });
  const t = tpl('star-forming');
  test.each([
    [
      'medium-missing',
      () => G.crossCorrelate({ ...w, medium: undefined }, t, { zRange: ZR }),
    ],
    [
      'medium-mismatch',
      () => G.crossCorrelate(w, { ...t, medium: 'air' }, { zRange: ZR }),
    ],
    [
      'missing-source',
      () => G.crossCorrelate(w, { ...t, source: '  ' }, { zRange: ZR }),
    ],
    [
      'template-resolution',
      () => G.crossCorrelate(w, { ...t, resolvingPower: 5000 }, { zRange: ZR }),
    ],
    [
      'bad-z-range',
      () => G.crossCorrelate(w, t, { zRange: { min: 0.2, max: 0.1 } }),
    ],
    [
      'z-range-outside-overlap',
      () => G.crossCorrelate(w, t, { zRange: { min: 5, max: 6 } }),
    ],
    ['no-template', () => G.crossCorrelate(w, null, { zRange: ZR })],
  ])('refuses %s by code', (code, run) => {
    const r = run();
    expect(r.status).toBe('refused');
    expect(r.code).toBe(code);
  });
  test('a spectrum off a logarithmic grid is refused and toLogGrid resamples it, saying so', () => {
    const lin = {
      ...w,
      lambdaNm: Float64Array.from({ length: 1000 }, (_, i) => 400 + i * 0.3),
      flux: new Float64Array(1000).fill(1),
      sigma: null,
    };
    expect(G.crossCorrelate(lin, t, { zRange: ZR }).code).toBe(
      'not-log-uniform'
    );
    const g = G.toLogGrid(lin);
    expect(g.resampled.note).toMatch(/correlated/);
    expect(G.logStepOf(g.lambdaNm).worstRelative).toBeLessThan(1e-3);
  });
  test('degradeToResolution lowers the resolving power and refuses an increase', () => {
    const d = G.degradeToResolution(t, 900);
    expect(d.resolvingPower).toBe(900);
    expect(d.degradedFrom).toBe(t.resolvingPower);
    expect(G.degradeToResolution(t, 5000).code).toBe('not-a-degradation');
  });
  test('the high-pass is linear and removes a constant', () => {
    const y = Float64Array.from({ length: 300 }, () => 7);
    for (const v of G.highPass(y)) expect(Math.abs(v)).toBeLessThan(1e-12);
  });
});

describe('the 4000-angstrom break', () => {
  const bands = G.INVENTED_BREAK_BANDS;
  const step = world('flat', 0.1, {
    alpha: -2,
    breakDepth: 0.5,
    breakWidthNm: 0,
    noise: false,
    snr: 50,
  });
  test('a hard step in a flat F_nu spectrum is 1 / (1 - d)', () => {
    const b = G.breakIndex(step, {
      definition: bands,
      z: 0.1,
      fluxKind: 'f-lambda',
    });
    expect(b.status).toBe('ok');
    expect(Math.abs(b.D - 2)).toBeLessThan(1e-9);
    expect(b.breakPresent).toBe(true);
    expect(b.limits).toMatch(
      /no age without a population-synthesis calibration/
    );
    expect(b.definition.source).toMatch(/invented/);
  });
  test('a redshift error widens the uncertainty', () => {
    const w = world('passive', 0.1, { seed: 'z', snr: 12 });
    const a = G.breakIndex(w, {
      definition: bands,
      z: 0.1,
      fluxKind: 'f-lambda',
    });
    const b = G.breakIndex(w, {
      definition: bands,
      z: 0.1,
      zSigma: 5e-3,
      fluxKind: 'f-lambda',
    });
    expect(b.sigma).toBeGreaterThan(a.sigma);
    expect(b.dDdz).not.toBe(0);
  });
  test.each([
    ['no-definition', { definition: undefined }],
    ['missing-source', { definition: { ...bands, source: '' } }],
    ['bad-bands', { definition: { ...bands, blueNm: [400, 390] } }],
    [
      'bands-overlap-or-misordered',
      { definition: { ...bands, blueNm: [380, 420] } },
    ],
    ['flux-kind-missing', { fluxKind: undefined }],
    ['bad-redshift', { z: NaN }],
    ['band-outside-spectrum', { z: 0 }],
  ])('refuses %s by code', (code, patch) => {
    const r = G.breakIndex(world('passive', 0.1, { seed: 'q' }), {
      definition: bands,
      z: 0.1,
      fluxKind: 'f-lambda',
      ...patch,
    });
    expect(r.status).toBe('refused');
    expect(r.code).toBe(code);
  });
  test('a noise-dominated spectrum is not constrained', () => {
    const w = world('passive', 0.1, { seed: 'n' });
    const r = G.breakIndex(
      {
        ...w,
        flux: new Float64Array(w.flux.length).fill(1),
        sigma: new Float64Array(w.flux.length).fill(50),
      },
      { definition: bands, z: 0.1, fluxKind: 'f-lambda' }
    );
    expect(r.status).toBe('not-constrained');
    expect(r.code).toBe('noise-dominated');
  });
});

describe('the line method', () => {
  test('a noise-free star-forming spectrum gives its redshift from several lines', () => {
    const r = G.redshiftFromLines(
      world('star-forming', 0.0777, { noise: false, snr: 20 }),
      LINES,
      {
        zRange: { ...ZR, step: 2e-4 },
      }
    );
    expect(r.status).toBe('ok');
    expect(Math.abs(r.z - 0.0777)).toBeLessThan(5e-5);
    expect(r.matched).toBeGreaterThanOrEqual(G.MIN_LINES);
    expect(r.interval.status).toBe('ok');
  });
  test('a flat spectrum has too few features and is not constrained', () => {
    const r = G.redshiftFromLines(
      world('flat', 0, { noise: false, snr: 10 }),
      LINES,
      {
        zRange: { ...ZR, step: 2e-4 },
      }
    );
    expect(r.status).toBe('not-constrained');
    expect(r.code).toBe('too-few-features');
  });
  test('a missing grid is refused and so is a spectrum without a medium', () => {
    const w = world('star-forming', 0.1, { seed: 'l' });
    expect(G.redshiftFromLines(w, LINES, {}).code).toBe('bad-z-range');
    expect(
      G.redshiftFromLines({ ...w, medium: undefined }, LINES, {
        zRange: { ...ZR, step: 2e-4 },
      }).code
    ).toBe('medium-missing');
  });
});

describe('the generator', () => {
  test('every spectrum and template carries its label and a truth manifest', () => {
    const w = world('passive', 0.2, { seed: 'm', snr: 9 });
    expect(w.label).toBe(G.GALAXY_SYNTHETIC_LABEL);
    expect(w.label.startsWith('SYNTHETIC GALAXY SPECTRUM')).toBe(true);
    expect(w.truth).toMatchObject({
      world: 'galaxy',
      kind: 'passive',
      z: 0.2,
      snr: 9,
      seed: 'm',
      resolvingPower: 1800,
    });
    expect(w.truth.lines.length).toBeGreaterThan(5);
    expect(Number.isFinite(w.truth.breakTruth.D)).toBe(true);
    const t = tpl('passive');
    expect(t.label).toBe(G.GALAXY_TEMPLATE_LABEL);
    expect(t.source).toMatch(/synthetic/);
    expect(G.generateComb({ z: 0.1 }).spectrum.label).toBe(
      G.GALAXY_SYNTHETIC_LABEL
    );
  });
  test('deterministic for a seed, different for another', () => {
    const a = world('star-forming', 0.1, { seed: 'x' });
    const b = world('star-forming', 0.1, { seed: 'x' });
    const c = world('star-forming', 0.1, { seed: 'y' });
    expect(Array.from(a.flux)).toEqual(Array.from(b.flux));
    expect(Array.from(a.flux)).not.toEqual(Array.from(c.flux));
  });
  test('dust reddens the continuum: the red-to-blue flux ratio rises with E(B-V)', () => {
    const at = (w, lo, hi) => {
      let sum = 0;
      let n = 0;
      for (let i = 0; i < w.lambdaNm.length; i++)
        if (w.lambdaNm[i] >= lo && w.lambdaNm[i] <= hi) {
          sum += w.flux[i];
          n++;
        }
      return sum / n;
    };
    const clean = world('flat', 0, { noise: false, law: LAW });
    const dusty = world('flat', 0, { noise: false, ebv: 0.3, law: LAW });
    const ratio = w => at(w, 640, 660) / at(w, 440, 460);
    expect(ratio(dusty)).toBeGreaterThan(ratio(clean));
    expect(dusty.truth.ebv).toBe(0.3);
  });
});
