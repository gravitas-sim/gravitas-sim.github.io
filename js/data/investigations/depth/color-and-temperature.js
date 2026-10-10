// =============================================================================
// Color and Temperature, deeper (Prompt 83)
// -----------------------------------------------------------------------------
// The same blackbody explorer and the same model. Quantitative adds the
// Stefan-Boltzmann law and the luminosity-radius-temperature relation;
// advanced adds synthetic photometry in two real bands. Every expected value
// is recomputed from the radiation kernel (tools/authoring/lightModels.mjs).
// =============================================================================

export default {
  id: 'color-and-temperature',
  steps: [
    {
      sid: 'power-and-size',
      after: 'real-stars-differ',
      depth: 'quantitative',
      type: 'question',
      kind: 'numeric',
      title: 'How much light, from how big a surface',
      body: `A blackbody gives off σT⁴ of power from each square meter
             (read it under the plot), so a sphere of radius R gives off
             L = 4πR²σT⁴. A star has 0.8 solar radii and a temperature of
             4,400&nbsp;K. The Sun’s temperature is 5,772&nbsp;K.`,
      prompt: 'The star’s luminosity, in solar luminosities',
      unit: 'L☉',
      answer: 0.216,
      tolerance: 0.01,
      hints: [
        'Compare with the Sun: the area goes as R², and the power per square meter goes as T⁴.',
        'Multiply the two ratios: (R ratio)² × (T ratio)⁴.',
      ],
      worked: 'L/L☉ = 0.8² × (4,400 / 5,772)⁴ = 0.64 × 0.338 = 0.216.',
      feedback: {
        close:
          'Close. Check that the temperature ratio is raised to the fourth power and the radius ratio to the second.',
        'wrong-order-of-magnitude':
          'A power of ten out. A star a little cooler and a little smaller than the Sun is fainter than the Sun, but not by a factor of a thousand.',
        off: 'Radius counts squared and temperature counts to the fourth power.',
      },
      tool: { id: 'blackbody', values: { T: 4400 } },
    },
    {
      sid: 'size-from-light',
      after: 'power-and-size',
      depth: 'quantitative',
      type: 'question',
      kind: 'numeric',
      title: 'Size from light and color',
      body: `A cool supergiant gives off 100,000 times the Sun’s luminosity at a
             temperature of 3,600&nbsp;K. Turn L = 4πR²σT⁴ around to find its
             radius.`,
      prompt: 'Its radius, in solar radii',
      unit: 'R☉',
      answer: 813,
      tolerance: 25,
      hints: [
        'In solar units, R = √L ÷ T², with T in units of the Sun’s temperature.',
      ],
      worked: 'R/R☉ = √(100,000) ÷ (3,600 / 5,772)² = 316.2 ÷ 0.389 = 813.',
      feedback: {
        close: 'Close. The radius goes as the square root of the luminosity.',
        'wrong-order-of-magnitude':
          'A power of ten out. Check the square root and the squared temperature ratio.',
        off: 'Radius = √(luminosity) ÷ (temperature ratio)², all in solar units.',
      },
      tool: { id: 'blackbody', values: { T: 3600 } },
    },
    {
      sid: 'color-in-two-bands',
      after: 'size-from-light',
      depth: 'advanced',
      type: 'question',
      kind: 'numeric',
      title: 'Synthetic photometry in two real bands',
      body: `The explorer finds a color by integrating the blackbody’s light
             through two real filter curves and comparing the results, the way
             an observer would. Set the bands to <strong>g &minus; r</strong>
             (the SDSS filters, AB system) and the temperature to 4,400&nbsp;K.`,
      prompt: 'The g − r color of a 4,400 K blackbody',
      unit: 'mag',
      answer: 0.91,
      tolerance: 0.03,
      hints: ['Read it from the color index row with the g − r bands chosen.'],
      worked: 'The integration gives g − r = 0.906 at 4,400 K.',
      feedback: {
        close: 'Close. Make sure the bands are g − r, not B − V.',
        off: 'Read the color index row with the bands set to g − r.',
      },
      tool: { id: 'blackbody', values: { T: 4400, pair: 1 } },
    },
    {
      sid: 'two-systems',
      after: 'color-in-two-bands',
      depth: 'advanced',
      type: 'question',
      kind: 'choice',
      title: 'Two colors for one blackbody',
      body: `At 4,400 K the same blackbody has B − V = 1.00 (Vega system) and
             g − r = 0.91 (AB system). A real orange dwarf has a measured
             g − r a little different again.`,
      prompt: 'Why do the two numbers differ for the same blackbody?',
      options: [
        'the blackbody changes temperature between the two measurements',
        'the bands and the zero points of the two systems differ',
        'one of the two is a measurement error',
        'g and r are infrared bands',
      ],
      answer: 1,
      hints: [
        'The two indices use different filters and different zero points.',
      ],
      because:
        'The two indices use different bands and different zero points (Vega against AB), so their numbers differ for the very same blackbody. A real star differs from the blackbody again because of its lines. A color is meaningful only with its bands and system named.',
      tool: { id: 'blackbody', values: { T: 4400, pair: 0 } },
    },
  ],
};
