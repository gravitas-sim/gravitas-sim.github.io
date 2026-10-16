// =============================================================================
// Lines and Motion, deeper (Prompt 83)
// -----------------------------------------------------------------------------
// The same spectrum viewer. Quantitative adds the relativistic form of the
// Doppler shift, a weighted mean of two lines and the equivalent width;
// advanced measures a real star's velocity from two of its own lines and
// compares it with the SDSS catalog value. Every expected value is recomputed
// from the kernel and the measurement node (tools/authoring/lightModels.mjs).
// The comparison instrument of Prompt 85 has not landed, so the catalog value
// is the one the data pack tabulates (z of the SDSS pipeline).
// =============================================================================

const SP = (values = {}) => ({ id: 'spectrum-viewer', values });

export default {
  id: 'lines-and-motion',
  steps: [
    {
      sid: 'fast-galaxy',
      after: 'doppler-arithmetic',
      depth: 'quantitative',
      type: 'question',
      kind: 'numeric',
      title: 'When the shift is not small',
      body: `v = c × Δλ ÷ λ<sub>rest</sub> holds only far below the speed of
             light. In general the shift z = Δλ ÷ λ<sub>rest</sub> and the
             speed β = v ÷ c are related by 1 + z = √((1 + β) ÷ (1 − β)). A
             galaxy’s lines are all shifted by z = 0.1, a tenth of their
             wavelength. (At this size most of the shift is the stretching of
             space, not a speed; the number asked for is the speed it would be
             if it were a Doppler shift.)`,
      prompt: 'The speed from the relativistic formula',
      unit: 'km/s',
      answer: 28487,
      tolerance: 100,
      hints: [
        'Square both sides: (1 + z)² = (1 + β) ÷ (1 − β). Solve for β.',
        'β = ((1 + z)² − 1) ÷ ((1 + z)² + 1).',
      ],
      worked:
        '(1.1)² = 1.21, so β = 0.21 ÷ 2.21 = 0.0950, which is 0.0950 × 299,792 = 28,487 km/s. The small-shift formula gives c × 0.1 = 29,979 km/s, 5 percent too large.',
      feedback: {
        close:
          'Close. Use the relativistic formula, not c × z, which gives 29,979 km/s.',
        'wrong-order-of-magnitude':
          'A power of ten out. A shift of a tenth of the wavelength is a speed of order a tenth of c.',
        off: 'β = ((1 + z)² − 1) ÷ ((1 + z)² + 1), then multiply by c.',
      },
      tool: SP({ src: 4, view: 1, line: 0 }),
    },
    {
      sid: 'two-lines-one-star',
      after: 'star-three',
      depth: 'quantitative',
      type: 'question',
      kind: 'numeric',
      title: 'Two lines, one star',
      body: `Synthetic star 1 has H-alpha and H-beta, two lines of one star,
             each a separate measurement of the same speed. Read both
             velocities and their uncertainties from the viewer, then combine
             them, weighting each by 1 ÷ σ², the inverse square of its
             uncertainty σ.`,
      prompt: 'The weighted mean velocity of synthetic star 1',
      unit: 'km/s',
      answer: 82.2,
      tolerance: 1.5,
      hints: [
        'Weights: w = 1 ÷ σ² for each line.',
        'Mean = (w₁v₁ + w₂v₂) ÷ (w₁ + w₂). The line with the smaller uncertainty counts for more.',
      ],
      worked:
        'H-alpha 85.7 ± 4.8 and H-beta 78.3 ± 5.0 km/s: weights 0.0434 and 0.0402, so the mean is (85.7 × 0.0434 + 78.3 × 0.0402) ÷ 0.0836 = 82.2 km/s, with an uncertainty of 1 ÷ √0.0836 = 3.5 km/s, smaller than either line’s.',
      feedback: {
        close:
          'Close. Weight each velocity by 1 ÷ σ², not by σ, and divide by the sum of the weights.',
        off: 'Mean = Σ(v ÷ σ²) ÷ Σ(1 ÷ σ²), over the two lines.',
      },
      tool: SP({ src: 4, view: 1, line: 1 }),
    },
    {
      sid: 'how-wide-is-wide',
      after: 'two-lines-one-star',
      depth: 'quantitative',
      type: 'question',
      kind: 'numeric',
      title: 'How much light a line takes out',
      body: `The <strong>equivalent width</strong> of a line is the width of a
             rectangle as tall as the continuum that holds the same area as the
             line: the total light the line removes, measured in Å. It does not
             depend on how the line is shaped. Zoom on <strong>H-beta</strong>
             in the A star and read it from the list.`,
      prompt: 'The equivalent width of H-beta in the A star',
      unit: 'Å',
      answer: 8.7,
      tolerance: 0.3,
      hints: ['It is the “Equivalent width” row for the A star and H-beta.'],
      worked:
        'The viewer’s node sums (1 − flux ÷ continuum) over the line, in Å: 8.70 ± 0.29 Å.',
      feedback: {
        close:
          'Close. Make sure the star is the A star and the line is H-beta.',
        off: 'Read the “Equivalent width” row with the A star and H-beta chosen.',
      },
      tool: SP({ src: 0, view: 1, line: 1 }),
    },
    {
      sid: 'a-real-star-two-lines',
      after: 'how-wide-is-wide',
      depth: 'advanced',
      type: 'question',
      kind: 'numeric',
      title: 'A real star’s velocity',
      body: `The A star is real, observed by the SDSS. Zoom on its
             <strong>H-alpha</strong> and <strong>H-beta</strong> lines and
             read each velocity and uncertainty. Combine the two as before,
             weighting by 1 ÷ σ².`,
      prompt: 'The weighted mean velocity of the A star',
      unit: 'km/s',
      answer: -224.8,
      tolerance: 4,
      hints: [
        'The two velocities are negative: the A star is approaching.',
        'Mean = Σ(v ÷ σ²) ÷ Σ(1 ÷ σ²).',
      ],
      worked:
        'H-alpha −212.3 ± 13.7 and H-beta −241.6 ± 16.0 km/s combine to −224.8 km/s, with an uncertainty of about 10 km/s.',
      feedback: {
        close: 'Close. Keep the signs: both velocities are negative.',
        off: 'Mean = Σ(v ÷ σ²) ÷ Σ(1 ÷ σ²), over H-alpha and H-beta.',
      },
      tool: SP({ src: 0, view: 1, line: 0 }),
    },
    {
      sid: 'against-the-catalog',
      after: 'a-real-star-two-lines',
      depth: 'advanced',
      type: 'question',
      kind: 'choice',
      title: 'Against the catalog',
      body: `The SDSS pipeline gives this star z = −0.00081, which is −243 ±
             1&nbsp;km/s; the viewer lists it under the lines. The pipeline
             fits a template to the whole spectrum, not to one line. (A
             comparison instrument that overlays your measurement on the
             catalog does not exist yet; the catalog value is the one the data
             set tabulates.)`,
      prompt: 'How does your −225 ± 10 km/s compare?',
      options: [
        'It agrees to about two of its own uncertainties, and the catalog value is the more precise because it uses the whole spectrum',
        'It disagrees by a factor of two, so one of the two is wrong',
        'It is identical, so the catalog value is just these two lines',
        'The catalog value must be wrong, because it has the smaller uncertainty',
      ],
      answer: 0,
      hints: [
        'Find the difference, then divide by your uncertainty: how many σ apart are they?',
      ],
      because:
        'The difference is about 18 km/s, under two of the 10 km/s uncertainty, so the two agree. The catalog value is much more precise because it uses thousands of pixels and not two lines; a measurement with a larger uncertainty is not wrong, only less sharp.',
      tool: SP({ src: 0, view: 1, line: 1 }),
    },
    {
      sid: 'whose-frame',
      after: 'against-the-catalog',
      depth: 'advanced',
      type: 'question',
      kind: 'choice',
      title: 'Whose speed is it?',
      body: `The telescope rides on the Earth, which goes around the Sun at
             about 30&nbsp;km/s. The wavelengths in the SDSS spectra have been
             corrected to the Sun’s frame, so they are <em>heliocentric</em>.`,
      prompt: 'Why is that correction needed?',
      options: [
        'Without it the Earth’s orbit would add up to about 30 km/s, rising and falling over a year, to every velocity',
        'Without it every star would look redshifted by the same amount',
        'The Sun’s own motion around the galaxy would add 30 km/s',
        'It makes the spectra sharper',
      ],
      answer: 0,
      hints: [
        'Think of the Earth moving toward a star in one season and away in the other.',
      ],
      because:
        'The Earth’s orbital speed is about 30 km/s, toward a star at one time of year and away at the opposite time, so an uncorrected velocity wobbles by up to 30 km/s over a year. The Sun’s own motion around the galaxy is far larger (hundreds of km/s) and is not removed by a heliocentric correction.',
      tool: SP({ src: 0, view: 1, line: 1 }),
    },
  ],
};
