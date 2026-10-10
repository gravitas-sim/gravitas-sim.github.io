// =============================================================================
// The Missing Mass, deeper (Prompt 72)
// -----------------------------------------------------------------------------
// The same fitted galaxy (`record-the-fit-that-works`) and the same ratio of
// halo to visible mass (`how-much-of-it-is`), with the fit's own scatter and the
// uncertainty of the light-to-mass conversion carried through to it.
// =============================================================================

import { fixed, TIMES } from '../../../format.js';

const FIT = 'record-the-fit-that-works';

export default {
  id: 'missing-mass',
  steps: [
    {
      sid: 'how-sure-is-the-dark-fraction',
      after: 'how-much-of-it-is',
      depth: 'quantitative',
      type: 'measure',
      requires: [FIT],
      title: 'How sure is that number?',
      body: `The ratio of halo to visible mass has two uncertainties in it.
 The halo mass goes as the square of the flat speed, so the fit's
 average miss, as a fraction of that speed, counts twice. And the
 visible mass is not weighed: it is worked out from light, with an
 assumption about how much mass each unit of light carries, which
 is good to perhaps 20%.
 \n\nThe fit numbers are the ones you recorded; only the 20% is
 new. The fractional uncertainties add in quadrature.`,
      fields: [
        {
          id: 'vis_frac',
          label: 'Uncertainty of the visible mass, as a fraction',
          unit: '',
          hint: '0.2',
        },
        {
          id: 'ratio',
          label: 'Halo mass ÷ visible mass',
          unit: '',
          compute: (v, e) => e(FIT, 'fit_halo') / e(FIT, 'fit_visible'),
          decimals: 2,
        },
        {
          id: 'halo_frac',
          label: 'Uncertainty of the halo mass, as a fraction',
          unit: '',
          compute: (v, e) => (2 * e(FIT, 'fit_rms')) / e(FIT, 'fit_vflat'),
          decimals: 4,
        },
        {
          id: 's_ratio',
          label: 'Uncertainty of the ratio',
          unit: '',
          compute: (v, e) =>
            (e(FIT, 'fit_halo') / e(FIT, 'fit_visible')) *
            Math.hypot(
              (2 * e(FIT, 'fit_rms')) / e(FIT, 'fit_vflat'),
              v.vis_frac
            ),
          decimals: 2,
        },
      ],
      validate: v => {
        if (!(v.vis_frac > 0) || !Number.isFinite(v.s_ratio)) return null;
        return {
          level: 'ok',
          message: `The halo holds ${fixed(v.ratio, 2)} ± ${fixed(v.s_ratio, 2)} times the visible mass. Almost all of that uncertainty is the visible mass: the speed is measured far better than the light can be turned into stars.`,
        };
      },
    },
    {
      sid: 'dark-fraction-with-an-error-bar',
      after: 'how-sure-is-the-dark-fraction',
      depth: 'quantitative',
      restates: 'how-much-of-it-is',
      type: 'question',
      kind: 'numeric',
      uncertainty: true,
      title: 'Give the ratio an error bar',
      body: `Write the ratio the way it is reported: the value, ±, and the
 uncertainty from the previous step. It counts when the range you
 give overlaps the range the measurement supports and is no wider
 than twice that range's half-width.`,
      prompt:
        'Halo mass inside 30 kpc, divided by visible mass, with its uncertainty',
      unit: TIMES,
      placeholder: 'e.g. 3.4 ± 0.7',
      answer: 3.4,
      tolerance: 0.9,
      hints: {
        concept: `The ratio you found, now with how well it is known.`,
        method: `Copy the ratio and its uncertainty from the previous step.`,
      },
      because:
        'About 3.4 with an uncertainty of about 0.7. Even at the edge of that range the halo outweighs the visible mass by more than two to one, which is why the conclusion survives an uncertainty this large.',
    },
    {
      sid: 'why-not-report-one-number',
      after: 'dark-fraction-with-an-error-bar',
      depth: 'advanced',
      type: 'question',
      kind: 'choice',
      title: 'Why not report one number?',
      body: `The fit's tip said the two halo sliders trade off: a faster halo
 with a bigger core fits almost as well as a slower one with a
 smaller one. Say two fits, 150 km/s with a 6 kpc core and 160 km/s
 with a 9 kpc core, both miss by 2 km/s.`,
      prompt: 'What should a published result say?',
      options: [
        'the one with the smaller core, because it is simpler',
        'both parameters together, with how they vary together; either alone overstates what the data know',
        'the average of the two, because it is in between',
        'nothing: if two fits work, the fit has failed',
      ],
      answer: 1,
      because:
        'When two parameters trade off, the data constrain a combination of them better than either. Quoting one alone with its own error bar understates the uncertainty on it; the honest report gives both and the covariance, which is what real rotation-curve papers do.',
    },
    {
      sid: 'what-would-tell-them-apart',
      after: 'why-not-report-one-number',
      depth: 'advanced',
      type: 'question',
      kind: 'short',
      title: 'What would tell two models apart?',
      body: `A halo and a modified law of gravity can fit the same rotation
 curve. Your fit's uncertainty says how much room each model has.`,
      prompt:
        'In a few sentences: what would you need to measure to tell them apart, and why is a better fit of this one curve not enough?',
      rubric:
        'Look for a measurement the models predict differently (the cluster, or a galaxy of another mass, or the lensing), and the point that two models fitting one curve within its uncertainty have not been separated by it.',
    },
    {
      sid: 'the-milky-way-as-measured',
      after: 'what-would-tell-them-apart',
      depth: 'advanced',
      type: 'read',
      title: 'The authentic option: the Milky Way as measured',
      body: `Every galaxy curve in this investigation so far is a <strong>model</strong>:
             the NGC 3198 curve was built from published parameters with a
             fixed scatter added, and is labelled synthetic. Here is a measured
             one. The instrument shows the Milky Way’s own circular speed from
             2 to 25 kpc, from Bhattacharjee, Chaudhury and Kundu (2014), who
             combined many tracers. It assumes the Sun is 8.3 kpc from the center,
             moving at 244 km/s; the citations are in the data package.
             Set the model to a best fit without a halo, then with one.`,
      tool: { id: 'rotating-disk', values: { view: 1, fit: 2 } },
    },
    {
      sid: 'the-real-halo-fit',
      after: 'the-milky-way-as-measured',
      depth: 'advanced',
      type: 'measure',
      title: 'The same test on real data',
      body: `Read the reduced χ² of the best fit <strong>without a halo</strong>
             (the disk bounded at 8 × 10<sup>10</sup> solar masses) and of the
             best fit <strong>with a halo</strong>. Compare the improvement with
             what you found for the synthetic curve.`,
      fields: [
        { id: 'stars', label: 'Reduced χ², stars only', unit: '', hint: '50' },
        { id: 'halo', label: 'Reduced χ², with a halo', unit: '', hint: '4.8' },
      ],
      validate: v => {
        if (![v.stars, v.halo].every(Number.isFinite)) return null;
        if (Math.abs(v.stars - 50) <= 5 && Math.abs(v.halo - 4.79) <= 0.5) {
          return {
            level: 'ok',
            message:
              'The measured Milky Way shows what the synthetic galaxy did: stars and gas alone miss badly, and a halo fits about ten times better. The real curve has real scatter and the fit is still not 1, so this is evidence for a halo in a simple model, not a measurement of one.',
          };
        }
        return {
          level: 'error',
          message:
            'In the instrument choose “best fit, stars only (no halo)” and read the reduced χ², then “best fit, with a halo” and read it again.',
        };
      },
      tool: { id: 'rotating-disk', values: { view: 1, fit: 1 } },
    },
  ],
};
