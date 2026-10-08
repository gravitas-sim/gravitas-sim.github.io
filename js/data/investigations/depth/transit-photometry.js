// =============================================================================
// Finding Planets by Their Shadows, deeper (Prompt 72)
// -----------------------------------------------------------------------------
// The same dip, the same depth and the same radius the student already found
// (`measure-the-dip`, `correct-it-and-get-a`), with an uncertainty carried
// through them and the result set against a forward model. Nothing is measured
// again, and the factor that undoes limb darkening is the lesson's own 1.2146.
// =============================================================================

/** The lesson's limb-darkening factor and the Jupiter-to-Sun radius ratio. */
import { fixed } from '../../../format.js';

const LIMB = 1.2146;
const RJ_PER_RSUN = 9.7311;

/** The depth and star radius the student entered to get a planet radius. */
const entered = e => ({
  d: e('correct-it-and-get-a', 'd2'),
  r: e('correct-it-and-get-a', 'rstar'),
});

const radius = ({ d, r }) => Math.sqrt(d / LIMB) * r * RJ_PER_RSUN;

const depthError = v => v.sig * Math.sqrt(1 / v.n_in + 1 / v.n_out);

export default {
  id: 'transit-photometry',
  steps: [
    {
      sid: 'how-sure-is-the-depth',
      after: 'correct-it-and-get-a',
      depth: 'quantitative',
      type: 'measure',
      requires: ['correct-it-and-get-a'],
      title: 'How sure is the radius?',
      body: `Your radius came from one depth, and a depth is a difference of
 two brightnesses, each averaged over many exposures. Suppose each
 exposure scatters by 3 × 10⁻⁴ of the star's brightness, a transit
 has 90 exposures inside it and the baseline has 450. The
 uncertainty of the depth is then
 σ<sub>δ</sub> = σ·√(1/n<sub>in</sub> + 1/n<sub>out</sub>).
 \n\nThe radius goes as √δ, so its fractional uncertainty is half
 the depth's: σ<sub>R</sub>/R = σ<sub>δ</sub> / (2δ). The depth and
 star radius are the ones you entered in the previous measurement;
 only the three numbers above are new. The star's own radius is
 taken as exact here, which is the next thing a real analysis would
 not do.`,
      fields: [
        {
          id: 'sig',
          label: 'Scatter of one exposure',
          unit: '',
          hint: '0.0003',
        },
        {
          id: 'n_in',
          label: 'Exposures inside the transit',
          unit: '',
          hint: '90',
        },
        {
          id: 'n_out',
          label: 'Exposures in the baseline',
          unit: '',
          hint: '450',
        },
        {
          id: 'depth_in',
          label: 'Depth you measured',
          unit: '',
          compute: (v, e) => entered(e).d,
          decimals: 5,
        },
        {
          id: 's_depth',
          label: 'Uncertainty of the depth',
          unit: '',
          compute: depthError,
          decimals: 6,
        },
        {
          id: 'rp',
          label: 'Planet radius (R_Jupiter)',
          unit: '',
          compute: (v, e) => radius(entered(e)),
          decimals: 3,
        },
        {
          id: 's_rp',
          label: 'Its uncertainty (R_Jupiter)',
          unit: '',
          compute: (v, e) =>
            (radius(entered(e)) * depthError(v)) / (2 * entered(e).d),
          decimals: 4,
        },
      ],
      validate: v => {
        if (![v.sig, v.n_in, v.n_out].every(x => x > 0)) return null;
        if (!Number.isFinite(v.s_rp)) return null;
        return {
          level: 'ok',
          message: `The radius is ${fixed(v.rp, 3)} ± ${fixed(v.s_rp, 4)} R_Jupiter. The photometric scatter is a small part of the true uncertainty: the star's radius and limb darkening matter more, which is what the next steps are about.`,
        };
      },
    },
    {
      sid: 'radius-with-an-error-bar',
      after: 'how-sure-is-the-depth',
      depth: 'quantitative',
      type: 'question',
      kind: 'numeric',
      uncertainty: true,
      title: 'Report it with an error bar',
      body: `Give the planet's radius as a result: the value, ±, and the
 uncertainty from the step before. It counts when the range you
 give overlaps the range the measurement supports and is no wider
 than twice that range's half-width.`,
      prompt: 'Planet radius in R_Jupiter, with its uncertainty',
      unit: '',
      placeholder: 'e.g. 1.37 ± 0.01',
      answer: 1.37,
      tolerance: 0.1,
      agrees: [
        {
          sid: 'correct-it-and-get-a',
          id: 'rp_rj',
          at: { d2: 0.018, rstar: 1.155 },
        },
      ],
      hints: {
        concept: `A result is a value and how well it is known.`,
        method: `Copy the radius and its uncertainty from the previous step
 and write them as value ± uncertainty.`,
      },
      because:
        'About 1.37 Jupiter radii. The photometric scatter alone makes the uncertainty tiny; the published value, 1.38, differs from it by more than that, because the star’s radius and the limb-darkening model carry uncertainty too.',
    },
    {
      sid: 'forward-model-the-dip',
      after: 'radius-with-an-error-bar',
      depth: 'advanced',
      type: 'question',
      kind: 'numeric',
      uncertainty: true,
      title: 'Run it forwards',
      body: `Go the other way: from a planet to the dip it would make. A
 forward model takes the radii and predicts the depth, so it can be
 held against what was measured.
 \n\nSuppose the planet's radius is known to be 1.38 R<sub>Jupiter</sub>
 to 1.5%, and the star's 1.155 R<sub>☉</sub> to 1.2%. For a transit
 across the middle of the star, the depth is δ = k²·1.2146 with
 k = R<sub>p</sub>/R<sub>★</sub>. Because δ goes as k², its
 fractional uncertainty is twice that of k, and the two radii's add
 in quadrature.`,
      prompt: 'Predicted depth, with its uncertainty',
      unit: '',
      placeholder: 'e.g. 0.0183 ± 0.0007',
      answer: 0.0183,
      tolerance: 0.0008,
      hints: {
        concept: `The model is the depth relation you used backwards.`,
        method: `k = 1.38 / (1.155 × 9.7311). Square it, multiply by 1.2146,
 then take twice the combined fractional uncertainty of k.`,
      },
      because:
        'The model predicts a depth of 0.0183, uncertain by about 0.0007. That is the number a measured depth is compared with: not whether the two are equal, which they never exactly are, but whether they differ by more than their combined uncertainty.',
    },
    {
      sid: 'does-the-model-agree',
      after: 'forward-model-the-dip',
      depth: 'advanced',
      type: 'question',
      kind: 'choice',
      title: 'Does the model agree?',
      body: `A measurement gave a depth of 0.0179 ± 0.0004. The forward model
 predicted 0.0183 ± 0.0007. The two differ by 0.0004, and their
 uncertainties combine in quadrature.`,
      prompt: 'Taking the combined uncertainty into account, the two…',
      options: [
        'disagree: the numbers are not equal',
        'agree: they differ by less than one combined uncertainty',
        'disagree by about three combined uncertainties',
        'cannot be compared, because one is a model',
      ],
      answer: 1,
      because:
        'The combined uncertainty is √(0.0004² + 0.0007²) = 0.0008, and the difference is 0.0004, half of that. A model and a measurement agree when they differ by no more than their uncertainties allow, and these do. The test fails to find a problem; it does not prove the model right.',
    },
  ],
};
