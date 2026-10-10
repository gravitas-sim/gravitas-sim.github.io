// =============================================================================
// Why the Bright Ones Win, deeper (Prompt 93)
// -----------------------------------------------------------------------------
// The same instrument. Quantitative: Malmquist's closed form by hand. Advanced:
// what the parallax bias does to a luminosity, and the same drift in a real
// catalog. Every expected value is recomputed (tools/authoring/surveyModels.mjs
// and tests/surveyInvestigations.test.js).
// =============================================================================

const MM = (values = {}) => ({ id: 'malmquist', values });

export default {
  id: 'why-the-bright-ones-win',
  steps: [
    {
      sid: 'formula-by-hand',
      after: 'standard-candles',
      depth: 'quantitative',
      type: 'question',
      kind: 'numeric',
      title: 'The closed form by hand',
      body: `For stars of equal number density, cut at a fixed apparent
             magnitude, the mean absolute magnitude of a Gaussian luminosity
             function is shifted by −(3 ln 10 ÷ 5) σ² = −1.3816 σ². The
             standard candles have σ = 0.7&nbsp;magnitude.`,
      prompt: 'The size of the shift',
      unit: 'mag',
      answer: 0.677,
      tolerance: 0.01,
      hints: ['Square 0.7 first: 0.49. Then multiply by 1.3816.'],
      worked:
        '0.7² = 0.49 and 1.3816 × 0.49 = 0.677 magnitude, brighter than the population mean. The instrument lists it as the closed form, and the stars it counts agree to within their scatter.',
      feedback: {
        close: 'Close. Square σ before multiplying by 1.3816.',
        off: 'Shift = 1.3816 × σ², with σ = 0.7.',
      },
      tool: MM({ limit: 16, lf: 1, snr: 5 }),
    },
    {
      sid: 'formula-doubled',
      after: 'formula-by-hand',
      depth: 'quantitative',
      type: 'question',
      kind: 'numeric',
      title: 'A wider scatter',
      body: `Now the scatter is twice as large, σ = 1.4&nbsp;magnitude.`,
      prompt: 'The size of the shift',
      unit: 'mag',
      answer: 2.708,
      tolerance: 0.03,
      hints: ['1.4² = 1.96.'],
      worked:
        '1.3816 × 1.96 = 2.708 magnitudes: four times the shift, a factor of twelve in luminosity. The real luminosity function of stars is much wider than 1.4 magnitudes, which is why a magnitude-limited catalog of stars is so different from the stars there are.',
      feedback: {
        close: 'Close. σ² for σ = 1.4 is 1.96.',
        off: 'Shift = 1.3816 × 1.96.',
      },
      tool: MM({ limit: 16, lf: 1, snr: 5 }),
    },
    {
      sid: 'luminosity-error',
      after: 'a-second-bias',
      depth: 'advanced',
      type: 'question',
      kind: 'numeric',
      title: 'What the parallax bias does to a luminosity',
      body: `With a parallax cut of 3 at limit 18, absolute magnitudes come
             out 0.25 magnitude too faint. A luminosity is
             L ∝ 10<sup>−0.4 M</sup>.`,
      prompt: 'By what percentage is the luminosity underestimated?',
      unit: '%',
      answer: 20.6,
      tolerance: 1,
      hints: [
        'The ratio of the estimated to the true luminosity is 10 raised to −0.4 × 0.25.',
      ],
      worked:
        '10^(−0.1) = 0.794: the luminosity is 79 percent of the truth, an underestimate of 20.6 percent. For a distance measured from this luminosity the error would be about 10 percent (the square root of the flux ratio).',
      feedback: {
        close: 'Close. Subtract the ratio from 1 to get the underestimate.',
        off: 'Underestimate = 1 − 10^(−0.4 × 0.25).',
      },
      tool: MM({ limit: 18, lf: 0, snr: 3 }),
    },
    {
      sid: 'real-sample-malmquist',
      after: 'luminosity-error',
      depth: 'advanced',
      type: 'question',
      kind: 'choice',
      title: 'A real catalog does it too',
      body: `In the solar-neighbourhood table (real Gaia stars), the mean absolute
             magnitude falls from 8.80 within 100&nbsp;pc to 6.68 at
             100–250, 5.35 at 250–500 and 4.23 at 500–1,000&nbsp;pc. That
             sample was selected on a radial velocity, which Gaia measures
             only for stars brighter than about magnitude 14 or 15.`,
      prompt:
        'Is that drift evidence that stars are brighter far from the Sun?',
      options: [
        'No: a flux-limited sample shows the same drift with distance even if the stars are everywhere alike',
        'Yes: stars really are brighter farther out',
        'Yes: parallaxes are better far away',
        'No: the data are too noisy to say anything',
      ],
      answer: 0,
      misconceptions: [
        {
          id: 'real-gradient',
          option: 1,
          say: 'The synthetic stars have the same population everywhere and show the same drift. A drift of this kind is what the selection predicts; it cannot be read as a gradient in the stars without a model of the selection.',
        },
      ],
      hints: [
        'Compare with the shells of the synthetic survey, where the stars are the same everywhere.',
      ],
      because:
        'No. The synthetic stars are the same in every shell and the survey drifts exactly this way. To say anything about the real stars you need the survey’s selection function, which is what the third investigation builds.',
      tool: MM({ limit: 16, lf: 0, snr: 5 }),
    },
  ],
};
