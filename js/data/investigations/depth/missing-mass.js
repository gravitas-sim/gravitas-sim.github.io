// =============================================================================
// The Missing Mass, deeper (Prompt 72)
// -----------------------------------------------------------------------------
// The same fitted galaxy (`record-the-fit-that-works`) and the same ratio of
// halo to visible mass (`how-much-of-it-is`), with the fit's own scatter and the
// uncertainty of the light-to-mass conversion carried through to it, and the
// student's own fits judged for the spread they leave in that ratio.
// =============================================================================

import { fixed, TIMES } from '../../../format.js';

const FIT = 'record-the-fit-that-works';

export default {
  id: 'missing-mass',
  steps: [
    {
      sid: 'how-sure-is-the-dark-fraction',
      decides:
        'which uncertainties to count, and how they combine into the ratio’s error bar',
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
          want: '0.2',
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
      sid: 'error-bar-from-your-fits',
      after: 'how-sure-is-the-dark-fraction',
      depth: 'quantitative',
      type: 'measure',
      decides:
        'which fits to accept (they must read FITTED and keep the visible mass within what the light allows), and so how wide the ratio’s range is',
      title: 'Give the ratio an error bar from your own fits',
      tool: {
        id: 'dm-fit',
        values: { discMass: 0, haloVFlat: 0, haloCore: 12 },
        presets: false,
      },
      body: `Your fit gave one value of the ratio of halo to visible mass. Other
 fits reproduce the points as well, and each gives a different ratio. The
 spread among the fits you would accept is an error bar you made yourself.
 \n\nBuild at least two fits of your own, with all four sliders free, and read the
 dark-mass ratio of each. Accept a fit only if it reads FITTED and keeps the
 visible mass within the 20% the light allows around the visible mass you
 recorded for your fit. Then give the lowest and the highest ratio among the
 fits you accepted, and say which fits you accepted.`,
      fields: [
        {
          id: 'accept',
          label: 'Which fits you accepted, and the rule you used',
          unit: '',
          kind: 'text',
        },
        {
          id: 'r_lo',
          label: 'Lowest ratio among your accepted fits',
          unit: TIMES,
        },
        {
          id: 'r_hi',
          label: 'Highest ratio among your accepted fits',
          unit: TIMES,
        },
        {
          id: 'r_half',
          label: 'Half the spread: the error bar on the ratio',
          unit: TIMES,
          compute: v => (v.r_hi - v.r_lo) / 2,
          decimals: 2,
        },
      ],
      validate: v => {
        if (![v.r_lo, v.r_hi].every(Number.isFinite)) return null;
        if (v.r_hi < v.r_lo) {
          return {
            level: 'error',
            message:
              'The highest ratio has to be at least as large as the lowest. Check which went in which box.',
          };
        }
        if (v.r_hi - v.r_lo < 0.05) {
          return {
            level: 'warn',
            message:
              'One fit is not a spread. Build a second fit that also reads FITTED, with a different core radius or disc, and read its ratio too.',
          };
        }
        if (v.r_lo < 2 || v.r_hi > 5.5) {
          return {
            level: 'warn',
            message:
              'A ratio that low or that high needs a fit that is not FITTED, or a visible mass the light does not allow. Check each fit against both rules before you accept it.',
          };
        }
        return {
          level: 'ok',
          message: `Your range runs from ${v.r_lo} to ${v.r_hi}. Whatever the range, even its low end leaves the halo outweighing the visible mass: the conclusion survives the spread, and a wider range would be a reason to ask what else constrains the disc.`,
        };
      },
    },
    {
      sid: 'why-not-report-one-number',
      decides:
        'what a published result should say when two fitted parameters trade off',
      after: 'error-bar-from-your-fits',
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
      decides: 'which measurement could separate two models that fit one curve',
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
      decides:
        'which fit to read first, and what the change in reduced χ² says about a halo',
      after: 'the-milky-way-as-measured',
      depth: 'advanced',
      type: 'measure',
      title: 'The same test on real data',
      body: `Read the reduced χ² of the best fit <strong>without a halo</strong>
             (the disk bounded at 8 × 10<sup>10</sup> solar masses) and of the
             best fit <strong>with a halo</strong>. Compare the improvement with
             what you found for the synthetic curve.`,
      fields: [
        { id: 'stars', label: 'Reduced χ², stars only', unit: '', want: '50' },
        { id: 'halo', label: 'Reduced χ², with a halo', unit: '', want: '4.8' },
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
    // The other explanation, four steps, deliberately. The alternative to dark
    // matter deserves to be met honestly rather than named in a footnote, and it
    // deserves not to become a second lesson: what a student needs from it is
    // the comparison, not a course in modified gravity. It is the advanced
    // path's, laid in after the cluster comparison where it always stood.
    {
      sid: 'a-different-way-to-read',
      after: 'now-compare',
      depth: 'advanced',
      type: 'read',
      title: 'A different way to read the same curve',
      tool: {
        id: 'dm-mond',
        values: { model: 0, discMass: 3.3, haloVFlat: 150 },
      },
      body: `Everything so far has assumed Newton's law of gravity is right and
             asked what mass would have to be there. There is another way to
             read a flat rotation curve, and it has been on the table since 1983.
             \n\nMordehai Milgrom noticed that the curves stop falling at a
             particular <em>acceleration</em> rather than at a particular radius
             or a particular brightness. Below about a₀ = 1.2 × 10⁻¹⁰ m/s² —
             roughly a hundred billionth of Earth's surface gravity — galaxies
             behave as though gravity were stronger than Newton says. Above it
             nothing changes, which is why no laboratory and no planetary orbit
             has ever seen this.
             \n\nIf that is what is happening, then far from a galaxy the
             gravitational pull falls off as 1/r rather than 1/r², and a circular
             orbit out there has
             \n\n<strong>v⁴ = G M a₀</strong>
             \n\nwith M the mass you can see. Not fitted. Predicted, from one
             constant that is meant to be the same for every galaxy.`,
      tip: 'The instrument opens on a halo fit like the one you built. The switch at the top puts MOND on the same points.',
    },
    {
      sid: 'fit-it-both-ways',
      after: 'a-different-way-to-read',
      depth: 'advanced',
      decides:
        'how far to bring the disc down for MOND to match, and so how many numbers each explanation had to be told',
      type: 'explore',
      title: 'Fit it both ways',
      tool: { id: 'dm-mond' },
      body: `Both explanations, the same twelve points, scored the same way.
             Try each of them, and use the two presets when you want to see
             where each one ends up.
             \n\nPay attention to what each explanation had to be told. The halo
             needs three numbers chosen to match this galaxy: how heavy the disc
             is, how fast the halo's curve flattens, and how big its core is.
             MOND needs one — the disc — because a₀ is not adjustable and is the
             same number for every galaxy in the universe.`,
      checklist: [
        'Load the best halo fit and read its residual',
        'Switch to MOND, leaving the disc where it is',
        'Bring the disc down until MOND matches too',
        'Compare how many numbers each explanation needed',
      ],
      tip: 'MOND wants a lighter disc than the halo fit does — about two thirds. A rotation curve cannot measure the mass of the stars directly, so how heavy the disc is was never pinned down by the data in either picture.',
    },
    {
      hints: [
        'MOND gives v⁴ = G M a₀: the flat speed is the fourth root of G M a₀.',
        'Add the disc and the bulge first, and use the units the instrument uses, before taking the fourth root.',
      ],
      feedback: {
        close:
          'Close. Take the fourth root, not the square root, and include the bulge.',
        off: 'Total visible mass first (disc plus bulge), then v = (G M a₀)^(1/4).',
      },
      sid: 'the-prediction-mond-makes',
      after: 'fit-it-both-ways',
      depth: 'advanced',
      decides:
        'which masses to add before taking the fourth root, and in which units',
      type: 'question',
      title: 'The prediction MOND makes',
      kind: 'numeric',
      tool: {
        id: 'dm-mond',
        values: { model: 1, discMass: 2.1, haloVFlat: 0 },
      },
      body: `The relation v⁴ = G M a₀ turns a visible mass straight into a flat
             speed, with nothing adjusted. Use the disc the instrument is showing
             — 2.1 × 10¹⁰ solar masses, plus the small 0.05 × 10¹⁰ bulge — and
             the value of a₀ above.
             \n\nIn the units the instrument works in, G a₀ = 0.0159 (km/s)⁴ per
             solar mass.`,
      prompt: 'The flat speed MOND predicts for this galaxy',
      unit: 'km/s',
      answer: 136,
      tolerance: 12,
      because: `About 136 km/s. Multiply 2.15 × 10¹⁰ by 0.0159 to get 3.4 × 10⁸,
                and take the fourth root. The instrument reports the same number
                on its own row.
                \n\nThis is the baryonic Tully–Fisher relation, and it is worth
                being clear that it is an observed regularity rather than a MOND
                result: real galaxies do lie on M ∝ v⁴, with remarkably little
                scatter, whatever is causing it. MOND predicts it. A dark-matter
                halo has to arrange for it, because there is no obvious reason a
                halo's properties should track the visible mass so tightly, and
                explaining that tightness is a live problem in galaxy formation.`,
    },
    {
      sid: 'does-the-curve-decide',
      after: 'the-prediction-mond-makes',
      depth: 'advanced',
      decides:
        'whether fitting this curve can settle between the explanations, and what other evidence would',
      type: 'question',
      title: 'Does the curve decide?',
      kind: 'short',
      body: `You have now fitted the same rotation curve twice, with two
             incompatible ideas about what is going on, and both of them work.
             \n\nThat is not a failure of the exercise. It is the actual state of
             this particular piece of evidence, and knowing what a measurement
             cannot settle is as much a part of using it as knowing what it can.`,
      prompt:
        'In two or three sentences: does fitting this rotation curve establish which explanation is right? What kind of evidence would you need instead?',
      rubric: `It does not. Both reproduce the curve to within its error bars, so
               the curve cannot distinguish them; the fits differ in how many
               free parameters they spend and in what disc mass they imply, and
               neither of those is decided by the curve either. Credit any
               reasonable route to evidence from somewhere else: galaxy clusters,
               where MOND reduces the missing mass but leaves a residual factor
               of about two and so still needs unseen matter; the Bullet Cluster,
               where the lensing mass is displaced from the visible gas after a
               collision; the cosmic microwave background, whose acoustic peak
               heights are fitted by cold dark matter and not by MOND without
               adding a dark component anyway; or the fact that MOND has no
               settled relativistic form, which makes it hard to apply to
               cosmology or lensing at all. Strong answers note that the two
               ideas are not symmetric in what they still owe: dark matter owes
               an explanation of why halo properties track the visible mass so
               tightly, and MOND owes almost everything outside galaxy rotation
               curves.`,
    },
  ],
};
