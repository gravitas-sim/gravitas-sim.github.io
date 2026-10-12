// =============================================================================
// Refitting a Transit
// -----------------------------------------------------------------------------
// Content only, no imports. The companion of the compute page's notebook
// "refit-transit" (Roadmap II Prompt 102, COMPUTE.md). There is no instrument on
// this page: the student runs the reviewed notebook at /compute/ on the TESS
// light curve of HD 209458 that the Observatory's fit panel fits, and types back
// the numbers the capsule holds. Every number here is a declared output of that
// notebook (js/compute/catalogueData.js), checked by
// tests/computeInvestigations.test.js against the notebook's own answer
// (tests/fixtures/compute/refit-transit.answer.json and investigation-runs.json)
// and, in tests/computeCurriculum.test.js, against the Observatory's own fit of
// the same points. The fit is deterministic: two students get the same digits.
//
// The numbers (limb darkening fitted unless stated):
//   P 3.52454 d +/- 0.00003, Rp/R* 0.11926 +/- 0.00164 (profile 0.11797 to
//   0.12043), a/R* 9.21 +/- 0.27, b 0.430 +/- 0.071 (profile 0.368 to 0.476),
//   reduced chi-square 7.98 for 1,874 degrees of freedom. The panel's red-noise
//   factor for the same light curve is 1.66.
//   Limb darkening held at q1 0.36, q2 0.30: Rp/R* 0.11767 +/- 0.00050 (3.2 of
//   its new sigmas from the fitted value), b 0.341 +/- 0.050.
// =============================================================================

const REFITTING_A_TRANSIT = {
  id: 'refitting-a-transit',
  thumbnail: 'images/scenarios/transit-lab.webp',
  title: 'Refitting a Transit',
  subtitle:
    'The same model and the same light curve as the Observatory’s fit panel, fitted again by a different route in Python, to see what the route changes',
  duration: '35-45 min',
  level: 'Introductory astronomy',
  audience: 'intro',
  textbook: { chapter: 21, section: null },
  courseLevel: 'upper',
  mathematics: 'logarithms',
  prerequisites: ['transit-photometry'],
  tags: ['exoplanets'],
  lock: { placement: true, inspector: true },
  objectives: [
    'Fit a transit model to a light curve with SciPy’s bounded least squares and read the covariance’s sigma and the profile interval',
    'Say what two correct fits of the same model to the same points can and cannot disagree about',
    'Explain why a profile interval can be lopsided where a covariance’s sigma is symmetric',
    'Say what holding a nuisance parameter fixed does to an uncertainty and to the answer',
  ],
  steps: [
    {
      sid: 'same-model-another-route',
      type: 'read',
      setup: { scenario: 'Transit Lab', seed: 'transit-lab', paused: true },
      title: 'The same model, another route',
      body: `The Observatory's fit panel fits a transit to the TESS light curve of
             HD 209458: a circular orbit, a limb-darkened star, a baseline, and seven
             numbers searched within bounds. It starts from a box search, refines with a
             bounded Levenberg-Marquardt and reports each number's uncertainty three
             ways. This investigation fits the <strong>same model to the same 1,882
             points</strong> with a different optimizer, so that anything that differs
             can be traced to the route and not to the model.
             \n\nThe notebook starts from the transits it finds with
             <strong>scipy.ndimage</strong>, fits with
             <strong>scipy.optimize.least_squares</strong>, takes each uncertainty from
             the covariance at the minimum, and finds the profile interval of the
             planet's size and the impact parameter with a root finder. Its transit
             model was written again in NumPy and agrees with the application's to the
             last digit of a double.
             \n\nOpen the compute page at <strong>/compute/</strong> of this site. It is
             online only and downloads about 23 MB of Python the first time, when you
             press the button. Choose the notebook <strong>Refit a transit with
             SciPy</strong>, keep its example input (the TESS light curve), and leave its
             one setting at 1. Do not press Run yet.`,
    },
    {
      sid: 'how-close',
      type: 'predict',
      reveal: 'the-fit',
      title: 'How close will they be',
      body: `Before you run it. The panel's fit of this light curve gave a period of
             3.52454 days, with an uncertainty of 0.00003.`,
      prompt:
        'The notebook will report each fitted number. Compared with the panel’s, its period and its planet size will be&hellip;',
      options: [
        'identical to every digit, because it is the same model on the same points',
        'equal to a small fraction of an error bar, because it is the same minimum reached by a different route',
        'about one error bar away, because two optimizers always disagree by that much',
        'very different, because SciPy has no transit model',
      ],
      answer: 1,
      because:
        'Both optimizers are looking for the lowest chi-square of one function, so they find the same minimum, but each stops when its own tolerance says to, and each differences the function in its own way. The values agree to a few thousandths of an error bar; they are not identical, and they are not an error bar apart.',
    },
    {
      sid: 'the-fit',
      compute: 'refit-transit',
      type: 'measure',
      title: 'Run it: five numbers and the chi-square',
      body: `Press <strong>Start the runtime</strong>, wait, then <strong>Run the
             notebook</strong>. Read the quantities it returns and enter them here: the
             period, the planet-to-star radius ratio, the orbit size in stellar
             radii, the impact parameter, and the reduced chi-square.`,
      fields: [
        { id: 'period', label: 'Period', unit: 'd', hint: '3.52454' },
        { id: 'k', label: 'Rp/R*', unit: '', hint: '0.11926' },
        { id: 'aRs', label: 'a/R*', unit: '', hint: '9.21' },
        { id: 'b', label: 'Impact parameter', unit: '', hint: '0.430' },
        { id: 'chi2', label: 'Reduced chi-square', unit: '', hint: '7.98' },
      ],
      validate: v => {
        if (![v.period, v.k, v.aRs, v.b, v.chi2].every(Number.isFinite))
          return null;
        if (
          Math.abs(v.period - 3.52454) <= 0.00005 &&
          Math.abs(v.k - 0.11926) <= 0.0004 &&
          Math.abs(v.aRs - 9.21) <= 0.08 &&
          Math.abs(v.b - 0.43) <= 0.012 &&
          Math.abs(v.chi2 - 7.98) <= 0.06
        ) {
          return {
            level: 'ok',
            message:
              'The period is 3.52454 days and Rp/R* is 0.11926, the numbers the fit panel finds for the same light curve to a few thousandths of an error bar. The reduced chi-square is 7.98: the points scatter about 2.8 times their error bars about this model.',
          };
        }
        return {
          level: 'error',
          message:
            'Run the notebook with its setting at 1, and read the period, Rp/R*, a/R*, the impact parameter and the reduced chi-square from the table of numbers it returns.',
        };
      },
    },
    {
      sid: 'sigma-and-profile',
      compute: 'refit-transit',
      type: 'measure',
      title: 'Two kinds of uncertainty',
      body: `The table shows each fitted number with a sigma taken from the covariance
             at the minimum, scaled by the reduced chi-square. For Rp/R* and the impact
             parameter it also shows a <strong>profile interval</strong>: the range of
             values for which, with every other number refitted, chi-square (scaled)
             rises by no more than one. Enter Rp/R*'s sigma, and the two ends of each
             profile interval.`,
      fields: [
        { id: 'kSigma', label: 'Rp/R*, sigma', unit: '', hint: '0.00164' },
        {
          id: 'kLow',
          label: 'Rp/R*, profile interval, low end',
          unit: '',
          hint: '0.11797',
        },
        {
          id: 'kHigh',
          label: 'Rp/R*, profile interval, high end',
          unit: '',
          hint: '0.12043',
        },
        {
          id: 'bLow',
          label: 'Impact parameter, profile interval, low end',
          unit: '',
          hint: '0.368',
        },
        {
          id: 'bHigh',
          label: 'Impact parameter, profile interval, high end',
          unit: '',
          hint: '0.476',
        },
      ],
      validate: v => {
        if (
          ![v.kSigma, v.kLow, v.kHigh, v.bLow, v.bHigh].every(Number.isFinite)
        )
          return null;
        if (
          Math.abs(v.kSigma - 0.00164) <= 0.0002 &&
          Math.abs(v.kLow - 0.11797) <= 0.0003 &&
          Math.abs(v.kHigh - 0.12043) <= 0.0003 &&
          Math.abs(v.bLow - 0.368) <= 0.012 &&
          Math.abs(v.bHigh - 0.476) <= 0.012
        ) {
          return {
            level: 'ok',
            message:
              'Rp/R* is 0.1193 with a sigma of 0.0016 and a profile interval from 0.1180 to 0.1204, which is narrower than plus or minus one sigma. The impact parameter’s profile runs 0.062 below its best value, 0.430, and only 0.046 above it.',
          };
        }
        return {
          level: 'error',
          message:
            'Read Rp/R*’s sigma from the Uncertainty column, and the ends of the two profile intervals from the rows labeled with their profile interval.',
        };
      },
    },
    {
      sid: 'why-they-differ',
      type: 'question',
      kind: 'choice',
      title: 'Why the interval is lopsided',
      body: `The impact parameter's sigma is 0.071, symmetric by construction. Its
             profile interval is from 0.368 to 0.476, 0.062 below the best value and
             0.046 above it.`,
      prompt: 'What is the best account of the difference?',
      options: [
        'The covariance describes chi-square as a symmetric parabola at the minimum; the valley that the impact parameter shares with a/R* and the limb darkening is curved, and the profile follows the curve',
        'SciPy’s optimizer stopped early, so the sigma is wrong',
        'The profile interval is at a different confidence level from the sigma',
        'The impact parameter cannot be negative, so its interval is cut off',
      ],
      answer: 0,
      misconceptions: [
        {
          id: 'stopped',
          option: 1,
          say: 'The minimum itself agrees with the panel’s to a few thousandths of an error bar. The sigma and the profile come from the same minimum; they measure different things about the valley around it.',
        },
        {
          id: 'level',
          option: 2,
          say: 'Both are a change of one in chi-square (scaled), which is about 68 percent for a parabola. A parabola is the assumption that fails here.',
        },
        {
          id: 'bound',
          option: 3,
          say: 'The low end, 0.368, is far from zero: nothing cuts it off. The lopsidedness comes from the shape of the valley.',
        },
      ],
      hints: [
        'The sigma comes from the curvature of chi-square at the one minimum. The profile re-fits every other number at each value of the impact parameter and follows what happens.',
      ],
      because:
        'The covariance is the curvature of chi-square at the minimum, so it is symmetric and describes a parabola. The valley the impact parameter lies in, with a/R* and the limb darkening, is curved, and the profile refits the others at each value and follows it. The profile is the more honest number where the two differ.',
    },
    {
      sid: 'hold-the-limb-darkening',
      compute: 'refit-transit',
      type: 'measure',
      title: 'Hold the limb darkening',
      body: `Set the notebook's one setting to <strong>0</strong>, which holds the limb
             darkening at q1 = 0.36 and q2 = 0.30 instead of fitting it, and run again.
             Enter the new Rp/R*, its new sigma, and how many of its new sigmas it
             moved from the value you found with the limb darkening fitted, 0.11926.`,
      fields: [
        {
          id: 'k',
          label: 'Rp/R*, limb darkening held',
          unit: '',
          hint: '0.11767',
        },
        { id: 'kSigma', label: 'Its sigma', unit: '', hint: '0.00050' },
        {
          id: 'shift',
          label: 'Shift, in new sigmas',
          unit: '',
          hint: '3.2',
        },
      ],
      validate: v => {
        if (![v.k, v.kSigma, v.shift].every(Number.isFinite)) return null;
        if (
          Math.abs(v.k - 0.11767) <= 0.0004 &&
          Math.abs(v.kSigma - 0.0005) <= 0.00012 &&
          Math.abs(Math.abs(v.shift) - 3.2) <= 0.6
        ) {
          return {
            level: 'ok',
            message:
              'Holding the limb darkening cut Rp/R*’s sigma from 0.0016 to 0.0005, and moved Rp/R* from 0.1193 to 0.1177, which is 3.2 of its new sigmas. The smaller error bar does not include the cost of assuming the limb darkening, and the assumption moved the answer by more than the bar.',
          };
        }
        return {
          level: 'error',
          message:
            'Set the setting to 0, run, read Rp/R* and its sigma, and divide the difference from 0.11926 by the new sigma.',
        };
      },
    },
    {
      sid: 'what-is-not-counted',
      type: 'question',
      kind: 'choice',
      title: 'What the sigmas do not count',
      body: `The reduced chi-square is 8. The Observatory's fit panel reports, for this
             light curve, that its residuals are correlated in time, with a red-noise
             factor of 1.66. This notebook scales every sigma by the square root of the
             reduced chi-square, and does not count the correlation.`,
      prompt: 'What do these say about the sigmas in the table?',
      options: [
        'The scatter is about 2.8 times the error bars, which the scaling accounts for, and it is correlated in time, which the scaling does not: the sigmas are probably still too small, by about the red-noise factor',
        'The fit is wrong and should be discarded',
        'The error bars in the file are too small and nothing more can be said',
        'A chi-square of eight means the model matches the data eight times better than needed',
      ],
      answer: 0,
      misconceptions: [
        {
          id: 'discard',
          option: 1,
          say: 'The fit is the best this model can do and the minimum agrees with the panel’s. What is in doubt is how much to trust its error bars, not its values.',
        },
        {
          id: 'better',
          option: 3,
          say: 'A reduced chi-square above one means the model, with the error bars given, fits worse than the noise alone would allow, not better.',
        },
      ],
      hints: [
        'Noise that is the same from one point to the next does not average down the way independent noise does.',
      ],
      because:
        'Scaling by the reduced chi-square assumes the extra scatter is independent from point to point. Correlated noise averages down more slowly, so a sigma counted without it is too small: the panel’s red-noise factor of 1.66 would make Rp/R*’s sigma about 0.0027. A fit has the uncertainties of the noise model it assumes.',
    },
    {
      sid: 'what-you-worked-out',
      type: 'read',
      title: 'What you worked out',
      body: `Fitting the same model to the same points by another route gave the same
             minimum: a period of 3.52454 days and Rp/R* of 0.1193, to a few
             thousandths of an error bar of the panel's. What a different route does
             change is what you can say about the uncertainty. The covariance's sigma
             is a parabola, the profile interval follows the valley, and for the
             impact parameter they differ by a fifth of the width and in symmetry.
             \n\nThe other point is what a fit holds fixed. Holding the limb darkening
             cut Rp/R*'s error bar to a third and moved the value by three of the new
             bars: the fixed number's uncertainty did not disappear, it left the table.
             And the sigmas count white noise only, in a light curve whose noise is not.
             The run is yours to keep: its capsule records the notebook's hash and the
             light curve's, so a report can cite it.`,
    },
  ],
};

export default REFITTING_A_TRANSIT;
