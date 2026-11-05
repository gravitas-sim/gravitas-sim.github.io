// ===========================================================================
// 42. Galaxy spectra: the redshift by correlation and by lines, and the 4000-angstrom break (Prompt 248)
// ===========================================================================

import * as G from '../../kernels/galaxy/index.js';
import { LINES } from '../../data/radiation/lines.js';

/**
 * Run this group's checks (GALAXY_SPECTRA.md; the full table, with the independent oracle, the coverage ensembles,
 * the refusals and the legs that wait for authentic files, is `npm run galaxy:validate`).
 *
 * @param {object} ctx - `add` (physicsChecks.js)
 */
export default async function run({ add }) {
  const GROUP = 'Galaxy spectra: redshift and the 4000-angstrom break';
  const zr = { min: -0.005, max: 0.35 };
  const tpl = kind => G.galaxyTemplate({ lines: LINES, kind });

  // a noise-free spectrum that is the template shifted by 777 samples: log10(1 + z) = 777 step
  const zShift = 10 ** (777 * G.GALAXY_WORLD.log10Step) - 1;
  const w = G.generateGalaxy({
    lines: LINES,
    kind: 'passive',
    z: zShift,
    noise: false,
    snr: 20,
  });
  const r = G.crossCorrelate(w, tpl('passive'), { zRange: zr });
  add({
    group: GROUP,
    kind: 'analytic',
    name: 'A noise-free spectrum that is the template shifted by an integer number of samples of log wavelength returns its redshift to 1e-6',
    measured: r.status === 'ok' ? r.z : NaN,
    expected: zShift,
    unit: '',
    tolerance: 1e-6,
    toleranceKind: 'absolute',
    why: 'A redshift multiplies every wavelength by 1 + z, a shift of log10(lambda); the filtered template shifted equals the filtered spectrum, so the correlation profile peaks at the shift and only the high-pass’s edge effects remain (the contract leg A1).',
  });

  // one strong line: the curvature uncertainty is a small fraction of a sample
  const comb = G.generateComb({
    teeth: 1,
    sigmaSamples: 1.5,
    peak: 3,
    z: 0.1,
    snr: 20,
    noise: false,
  });
  const single = G.crossCorrelate(comb.spectrum, comb.template, {
    zRange: zr,
  });
  add({
    group: GROUP,
    kind: 'analytic',
    name: 'The correlation peak’s curvature uncertainty is finite, positive and below one sample for a strong single line',
    measured: single.sigmaLag > 0 && single.sigmaLag < 1 ? 1 : 0,
    expected: 1,
    unit: '',
    tolerance: 0,
    why: 'var(k) = 1 / (q |q″|) from the profile chi-square (the contract rule X5); a single strong line fixes its position to a small fraction of a sample (leg A3 holds the value to the Cramer-Rao bound within 3 percent).',
  });

  // the break of a hard step in a flat F_nu spectrum
  const step50 = G.generateGalaxy({
    lines: LINES,
    kind: 'flat',
    alpha: -2,
    breakDepth: 0.5,
    breakWidthNm: 0,
    z: 0.1,
    noise: false,
    snr: 50,
  });
  const b = G.breakIndex(step50, {
    definition: G.INVENTED_BREAK_BANDS,
    z: 0.1,
    fluxKind: 'f-lambda',
  });
  add({
    group: GROUP,
    kind: 'analytic',
    name: 'The break of a flat-F_nu spectrum with a hard step of depth 0.5 is 1 / (1 - 0.5) = 2',
    measured: b.status === 'ok' ? b.D : NaN,
    expected: 2,
    unit: '',
    tolerance: 1e-6,
    toleranceKind: 'absolute',
    why: 'D is the ratio of the band means of F_nu = lambda^2 F_lambda; for a flat F_nu the bands see the two sides of the step and nothing else (the contract leg A4).',
  });

  // no default definition
  const noDef = G.breakIndex(step50, { z: 0.1, fluxKind: 'f-lambda' });
  add({
    group: GROUP,
    kind: 'analytic',
    name: 'A break without a stated definition and source is refused: the kernel holds no published band edges',
    measured:
      noDef.status === 'refused' && noDef.code === 'no-definition' ? 1 : 0,
    expected: 1,
    unit: '',
    tolerance: 0,
    why: 'The published definitions’ band edges are published numbers; the caller states one with its source and there is no default (the contract rule B1, leg D6).',
  });

  // the medium rule
  const air = G.crossCorrelate(
    w,
    { ...tpl('passive'), medium: 'air' },
    { zRange: zr }
  );
  add({
    group: GROUP,
    kind: 'analytic',
    name: 'A template in air against a spectrum in vacuum is refused, never converted',
    measured:
      air.status === 'refused' && air.code === 'medium-mismatch' ? 1 : 0,
    expected: 1,
    unit: '',
    tolerance: 0,
    why: 'The air and vacuum conventions differ by tens of km/s, a redshift of 1e-4 or more, so a mismatch is a refusal with a code (the contract rule X1, leg D5).',
  });

  // aliasing
  const al = G.generateComb({ z: 0.1, snr: 15, seed: 'validation-group' });
  const amb = G.crossCorrelate(al.spectrum, al.template, { zRange: zr });
  add({
    group: GROUP,
    kind: 'analytic',
    name: 'A spectrum and template that are the same comb of equally spaced lines give two equal correlation peaks and the redshift is refused as ambiguous',
    measured: amb.status === 'refused' && amb.code === 'ambiguous-peak' ? 1 : 0,
    expected: 1,
    unit: '',
    tolerance: 0,
    why: 'A second peak within 20 percent of the best (rule X6) means the redshift is not unique; a periodic pattern cannot fix it (the contract leg D4).',
  });
}
