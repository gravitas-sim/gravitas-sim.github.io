// =============================================================================
// The Metallicity Term (Prompt 223)
// -----------------------------------------------------------------------------
// One investigation at three depths in one module that also carries its Spanish
// words, its deeper steps and its instructor content: this is the one closure
// file the prompt adds, because the shared sequence files sit at their line
// ceilings. The per-lesson path every loader builds from an id is a one-line
// re-export of a named export here, and the instructor modules read INSTRUCTOR.
// No imports: every number a step states is recomputed in
// tests/variablesIILessons.test.js from the instrument (js/variablesIIWidgets.js
// over js/variablesIIField.js and js/kernels/variables/). Every step carries a
// `sid`, an opaque stable id that student progress is keyed by.
//
// The data are authentic (the Cepheids of Riess et al. 2022); the coefficient
// and the galaxies' [O/H] are cited values, and the lesson says so. The
// classifier of Part B of Prompt 223 is gated separately and is not here.
// =============================================================================

const near = (x, target, tolerance) =>
  Number.isFinite(x) && Math.abs(x - target) <= tolerance;

const STAGE = {
  spacing: 150,
  fit: true,
  stars: [
    {
      role: 'rich',
      name: 'A Cepheid in a metal-rich galaxy',
      teffK: 5600,
      lumSun: 3000,
    },
    {
      role: 'poor',
      name: 'A Cepheid in a metal-poor galaxy',
      teffK: 5600,
      lumSun: 2400,
    },
  ],
};
/** The panel: host 0 NGC 4258, 1 M101; term 0 left out, 1 included; metal 0 cited, 1 as the LMC, 2 the slider; view 0 the relation, 1 the effect. */
const PLZ = (values = {}) => ({
  id: 'plz-metallicity',
  values: { host: 0, term: 1, metal: 0, dz: 0, view: 0, ...values },
});

export const THE_METALLICITY_TERM = {
  id: 'the-metallicity-term',
  thumbnail: 'images/investigations/the-metallicity-term.webp',
  title: 'The Metallicity Term',
  subtitle:
    'Add the metal content of a galaxy to the Cepheid period-luminosity relation, see what it does to a distance and to its error, and see where the cited term stops being tested',
  duration: '8-12 min',
  level: 'Upper-level astronomy',
  audience: 'intro',
  textbook: { chapter: 19, section: null },
  courseLevel: 'upper',
  mathematics: 'logarithms',
  prerequisites: ['leavitts-law', 'the-first-rung'],
  tags: ['observing', 'stars'],
  lock: { placement: true, inspector: true },
  depths: ['core', 'quantitative', 'advanced'],
  objectives: [
    'Write the period-luminosity relation with a metallicity term and say which way the cited term goes',
    'Say what the term does to a galaxy’s distance modulus and its distance, and what it adds to the error',
    'Say that the coefficient and the galaxies’ metal content are cited values with errors, and where the cited calibration stops',
    'Say why one galaxy cannot decide whether the term is needed',
  ],
  steps: [
    {
      sid: 'a-term-for-the-gas',
      stage: STAGE,
      type: 'read',
      title: 'A term for the gas',
      body: `Leavitt’s law says that a Cepheid’s period tells you how bright it really is. To measure a galaxy’s
             distance you calibrate the law where the distance is known, here the Large Magellanic Cloud, and carry
             the offset to the Cepheids of the other galaxy. That assumes the law is the same in both. It might not
             be: stars form from gas, and the gas of different galaxies holds different amounts of heavy elements,
             which astronomers call metals and measure as the abundance of oxygen, written [O/H] and given in
             <strong>dex</strong> (a factor of ten) relative to the Sun.
             \n\nThe law then gets one more term, the metallicity term, a coefficient times [O/H]. The panel uses
             the coefficient of Riess et al. 2022, &minus;0.217 &plusmn; 0.046 magnitudes per dex, and the average
             [O/H] they give for each galaxy&rsquo;s Cepheids. Neither was measured here; both are cited, and each has
             an error that the panel carries. The Cepheids are authentic. The relation and the galaxy&rsquo;s
             Cepheids are drawn; the readout holds the distances.`,
      tool: PLZ(),
    },
    {
      sid: 'which-way-does-metal-go',
      stage: STAGE,
      type: 'predict',
      reveal: 'the-distance-twice',
      title: 'Which way does metal go',
      body: `Take two Cepheids with the same period, one in a galaxy rich in metals and one in a metal-poor
             one. Do not change the panel yet. The coefficient is negative: a magnitude gets smaller as a star gets
             brighter.`,
      prompt: 'The metal-rich Cepheid is…',
      options: [
        'a little brighter than the metal-poor one',
        'a little fainter than the metal-poor one',
        'exactly as bright: period alone sets the luminosity',
        'brighter only for periods over thirty days',
      ],
      answer: 0,
      hints: [
        'A negative coefficient times a larger [O/H] makes the magnitude smaller. Is a smaller magnitude brighter or fainter?',
      ],
      because:
        'A little brighter: &minus;0.217 mag per dex times a galaxy 0.2 dex richer is &minus;0.04 mag. A galaxy that is richer than the one the law was calibrated in has Cepheids that are brighter than that law says, so if you leave the term out you take them for nearer than they are. The next step measures it.',
      misconceptions: [
        {
          id: 'dimmer',
          option: 1,
          say: 'It is not dust: the Wesenheit magnitude already removes that. The term is about how the star itself shines, and the cited sign is that more metals make a Cepheid a little brighter at the same period.',
        },
      ],
      tool: PLZ({ term: 0 }),
    },
    {
      sid: 'the-distance-twice',
      stage: STAGE,
      type: 'measure',
      title: 'The distance twice',
      body: `The panel is on <strong>NGC 4258</strong>, with its Cepheids set against the LMC&rsquo;s. Read the
             <strong>distance modulus</strong> with the term <strong>left out</strong>, then switch the term to
             <strong>included</strong> and read it again.`,
      fields: [
        {
          id: 'a',
          label: 'Modulus, term left out',
          unit: 'mag',
          hint: '29.40',
        },
        {
          id: 'b',
          label: 'Modulus, term included',
          unit: 'mag',
          hint: '29.44',
        },
      ],
      validate: v => {
        if (![v.a, v.b].every(Number.isFinite)) return null;
        if (near(v.a, 29.403, 0.01) && near(v.b, 29.444, 0.01)) {
          return {
            level: 'ok',
            message:
              'The term left out gives 29.403 and the term included 29.444: a shift of 0.041 mag, because NGC 4258’s Cepheids are metal-richer than the LMC’s by 0.19 dex and so are intrinsically brighter than the LMC law says.',
          };
        }
        return {
          level: 'error',
          message:
            'Keep the galaxy on NGC 4258 and the metallicity on the cited value: 29.403 with the term left out and 29.444 with it included.',
        };
      },
      tool: PLZ({ term: 0 }),
    },
    {
      sid: 'what-a-term-this-size-does',
      stage: STAGE,
      type: 'question',
      kind: 'choice',
      title: 'What a term this size does',
      body: `A shift in the modulus of 0.041 mag sounds small. A modulus is five times the logarithm of the
             distance, so a shift of <em>s</em> magnitudes changes the distance by a factor of ten to the power
             <em>s</em> over five. The <strong>distance</strong> rows give the two distances; the ratio is the last
             row of the readout.`,
      prompt:
        'By roughly what percentage does including the term change the distance?',
      options: [
        'About 2 percent: small beside the distance, and always in the same direction for a galaxy richer than the LMC',
        'About 20 percent: a correction to a magnitude is a large correction to a distance',
        'About 0.2 percent: a hundredth of a magnitude at most',
        'Not at all: the distance is set by the periods',
      ],
      answer: 0,
      hints: ['Ten to the power 0.041 over five is the factor.'],
      because:
        '10^(0.0412/5) = 1.019: the term makes the galaxy 1.9 percent farther, 7.59 Mpc against 7.74. That is small beside the 2.3 percent error of the distance, and it is a bias: it has the same sign for every galaxy richer than the LMC, so more Cepheids would not remove it.',
      misconceptions: [
        {
          id: 'large',
          option: 1,
          say: 'A modulus is a logarithm: five magnitudes is a factor of a hundred in distance, so four hundredths of a magnitude is only a few percent.',
        },
        {
          id: 'periods',
          option: 3,
          say: 'The periods set the luminosity within one calibration; the metallicity moves the calibration itself.',
        },
      ],
      tool: PLZ({ term: 1 }),
    },
    {
      sid: 'what-the-term-adds-to-the-error',
      stage: STAGE,
      type: 'question',
      kind: 'choice',
      title: 'What the term adds to the error',
      body: `With the term included the modulus is 29.444 &plusmn; 0.053, and left out 29.403 &plusmn; 0.051. Three
             rows join the error budget: the error of the coefficient carried over the difference in [O/H], and the
             error of each galaxy&rsquo;s average [O/H] carried by the coefficient. Read them against the error from
             the galaxy&rsquo;s own Cepheids.`,
      prompt: 'How does the term change the total error?',
      options: [
        'It adds a little, about 4 percent: the new terms are 0.009, 0.011 and 0.004 mag, small beside the 0.043 from the galaxy’s own Cepheids, and they add in quadrature',
        'It doubles it: every cited number brings its own error and they all add',
        'It removes it: a correction makes the distance exact',
        'It leaves it unchanged: a cited number has no error',
      ],
      answer: 0,
      hints: [
        'Errors that are independent add in quadrature, the square root of the sum of squares. Which term is largest?',
      ],
      because:
        'A little. The correction moves the modulus by 0.041 and adds 0.009, 0.011 and 0.004 mag in quadrature to a total that the galaxy’s Cepheids (0.043) and the LMC’s distance (0.026) already set, so the error goes from 0.051 to 0.053. The correction is bigger than the error it brings: that is why it is worth making.',
      misconceptions: [
        {
          id: 'exact',
          option: 2,
          say: 'A correction with a cited coefficient and cited abundances is only as good as they are, and the panel carries their errors.',
        },
        {
          id: 'none',
          option: 3,
          say: 'The coefficient is −0.217 ± 0.046 and each average [O/H] is uncertain by 0.02 to 0.05 dex; the panel lists what each contributes.',
        },
      ],
      tool: PLZ({ term: 1 }),
    },
    {
      sid: 'beyond-the-calibration',
      stage: STAGE,
      type: 'question',
      kind: 'choice',
      title: 'Beyond the calibration',
      body: `Set the galaxy&rsquo;s metallicity to <strong>mine</strong> and the slider to the lowest value,
             &minus;0.6 dex below the LMC. The Range row warns.`,
      prompt: 'What does the warning mean?',
      options: [
        'The coefficient was fitted over a span of [O/H] and this galaxy lies outside it, so the correction is an extrapolation of the cited term and not a tested one',
        'The galaxy cannot be that metal-poor',
        'The panel cannot calculate a distance there',
        'The galaxy’s Cepheids no longer follow a period-luminosity relation',
      ],
      answer: 0,
      hints: [
        'The range is read from the cited calibration, from the poorest sample to the richest.',
      ],
      because:
        'The cited calibration spans galaxies from the SMC at &minus;0.72 to a few at +0.17 in [O/H]. A galaxy at −0.89 is below all of them, so the term, a straight line in [O/H], is being used where nothing tested it. The panel still draws a number and says so, rather than hiding that it is an extrapolation.',
      misconceptions: [
        {
          id: 'cannot',
          option: 1,
          say: 'Nothing says such a galaxy cannot exist; the warning is about the data the coefficient came from, not about the galaxy.',
        },
      ],
      tool: PLZ({ term: 1, metal: 2, dz: -0.6 }),
    },
    {
      sid: 'what-the-term-says',
      stage: STAGE,
      type: 'read',
      title: 'What the term says',
      body: `The Cepheid relation is not quite the same everywhere: a galaxy richer in metals than the one the
             relation was calibrated in has brighter Cepheids at the same period, and leaving the term out puts it
             too near. For NGC 4258 the effect is 0.04 magnitudes, about two percent in distance; for M101, which is
             richer still, about four. The term comes with a cited coefficient and cited abundances, each with an
             error, and those errors are carried into the distance&rsquo;s. It was fitted over a span of
             abundances, and outside it the correction is an extrapolation. The <strong>effect</strong> picture
             draws the shift and its coefficient error against the difference in [O/H].`,
      tool: PLZ({ view: 1 }),
    },
  ],
};

export const THE_METALLICITY_TERM_DEEPER = {
  id: 'the-metallicity-term',
  steps: [
    {
      sid: 'the-shift-for-m101',
      after: 'what-a-term-this-size-does',
      depth: 'quantitative',
      type: 'question',
      kind: 'numeric',
      title: 'M101 by hand',
      body: `Switch the galaxy to <strong>M101</strong>. Its cited [O/H] is +0.10 and the LMC&rsquo;s is &minus;0.29.
             The term adds <em>&minus;&#947; &times; &#916;[O/H]</em> to the modulus with &#947; = &minus;0.217.
             Work out the shift and compare it with the panel&rsquo;s.`,
      prompt: 'The shift of the distance modulus, in magnitudes',
      unit: 'mag',
      answer: 0.085,
      tolerance: 0.003,
      hints: ['Δ[O/H] = 0.10 − (−0.29) = 0.39 dex.'],
      worked:
        '0.217 × 0.39 = 0.0846 mag, the panel’s shift for M101. M101’s Cepheids are 0.39 dex richer than the LMC’s, twice NGC 4258’s 0.19, so the shift is twice as large.',
      feedback: {
        close: 'Close. Multiply 0.217 by the difference in [O/H], 0.39.',
        'wrong-order-of-magnitude':
          'A power of ten out: the shift is under a tenth of a magnitude.',
        off: '0.217 × (0.10 − (−0.29)).',
      },
      tool: PLZ({ host: 1, term: 1 }),
    },
    {
      sid: 'the-distance-for-m101',
      after: 'the-shift-for-m101',
      depth: 'quantitative',
      type: 'question',
      kind: 'numeric',
      title: 'M101’s distance',
      body: `The distance changes by ten to the power <em>s</em> over five for a shift of <em>s</em> magnitudes.
             Use the shift you found for M101.`,
      prompt: 'By what percentage does the term change M101’s distance?',
      unit: '%',
      answer: 4,
      tolerance: 0.2,
      hints: ['10^(0.0846 / 5) − 1.'],
      worked:
        '10^(0.0846/5) = 1.040: 4.0 percent, 6.95 Mpc without the term and 7.23 with it. The effect grows with how far the galaxy’s abundance is from the anchor’s, and it is a bias, not scatter: more Cepheids would not remove it.',
      feedback: {
        close:
          'Close. Ten to the power 0.0846 divided by five, minus one, times a hundred.',
        'wrong-order-of-magnitude':
          'A power of ten out: a shift of under a tenth of a magnitude is a few percent in distance.',
        off: '(10^(0.0846 / 5) − 1) × 100.',
      },
      tool: PLZ({ host: 1, term: 1 }),
    },
    {
      sid: 'two-published-coefficients',
      after: 'beyond-the-calibration',
      depth: 'advanced',
      type: 'question',
      kind: 'numeric',
      title: 'Two published coefficients',
      body: `The panel uses &minus;0.217 &plusmn; 0.046 (Riess et al. 2022). Another fit to the Cepheids of the Milky
             Way and the Magellanic Clouds (Breuval et al. 2022, Table 4, the same Wesenheit magnitude) gives
             &minus;0.280 &plusmn; 0.078. The two agree within 0.7 of their combined error. For NGC 4258, with
             &#916;[O/H] = 0.19 dex, work out how much the modulus differs between the two coefficients.`,
      prompt: 'The difference of the two shifts, in magnitudes',
      unit: 'mag',
      answer: 0.012,
      tolerance: 0.001,
      hints: ['(0.280 − 0.217) × 0.19.'],
      worked:
        '0.063 × 0.19 = 0.012 mag, a quarter of the 0.047 error of the corrected modulus: the choice of coefficient is within the budget the panel already carries (the coefficient’s own error contributes 0.009 mag), so two published values that agree within their errors do not change the distance by more than its error.',
      feedback: {
        close:
          'Close. Take the difference of the two coefficients and multiply by 0.19.',
        'wrong-order-of-magnitude':
          'A power of ten out: the two shifts differ by about a hundredth of a magnitude.',
        off: '(0.280 − 0.217) × 0.19.',
      },
      tool: PLZ({ term: 1 }),
    },
    {
      sid: 'does-one-galaxy-prove-the-term',
      after: 'two-published-coefficients',
      depth: 'advanced',
      type: 'question',
      kind: 'choice',
      title: 'Does one galaxy prove the term?',
      body: `NGC 4258 has a distance from water masers that does not use Cepheids: 29.397 &plusmn; 0.032. The panel
             shows it. With the term left out the LMC calibration gives 29.403 (0.1 combined error from the
             masers); with it, 29.444 (0.8 from them).`,
      prompt: 'What does this one galaxy say about the term?',
      options: [
        'Nothing decisive: both values agree with the masers within their errors, and the term moves the estimate a little away from them; the case for the term comes from fitting many galaxies and anchors together, not from one',
        'That the term is wrong, because the estimate moved away from the masers',
        'That the term is right, because a correction is always an improvement',
        'That the masers are wrong',
      ],
      answer: 0,
      hints: [
        'Compare each estimate with the masers in units of the combined error, as the panel’s rows allow.',
      ],
      because:
        'Neither estimate is in tension with the masers: 0.1 and 0.8 combined errors. One galaxy with a metallicity difference of 0.19 dex cannot tell a term of that size from none, because the term’s effect, 0.04 mag, is smaller than the errors of the comparison. The cited coefficient comes from fitting the Cepheids of many hosts and the three anchors at once (Riess et al. 2022), which is a far stronger lever, and this panel does not repeat that fit.',
      misconceptions: [
        {
          id: 'wrong',
          option: 1,
          say: 'A move of 0.8 combined errors is well inside what chance alone gives; it is not evidence against anything.',
        },
        {
          id: 'always',
          option: 2,
          say: 'A correction is an improvement only if it is the right one, and one galaxy does not show that.',
        },
      ],
      tool: PLZ({ term: 1 }),
    },
  ],
};

export const THE_METALLICITY_TERM_ES = {
  title: 'El término de metalicidad',
  subtitle:
    'Añade el contenido de metales de una galaxia a la relación período-luminosidad de las cefeidas, mira qué hace a una distancia y a su error, y mira dónde deja de estar comprobado el término citado',
  objectives: [
    'Escribir la relación período-luminosidad con un término de metalicidad y decir hacia dónde va el término citado',
    'Decir qué hace el término al módulo de distancia de una galaxia y a su distancia, y qué añade al error',
    'Decir que el coeficiente y el contenido de metales de las galaxias son valores citados con errores, y dónde se detiene la calibración citada',
    'Decir por qué una sola galaxia no puede decidir si hace falta el término',
  ],
  steps: [
    {
      title: 'Un término para el gas',
      body: `La ley de Leavitt dice que el período de una cefeida indica su brillo real. Para medir la distancia de una galaxia se calibra la ley donde la distancia se conoce, aquí la Gran Nube de Magallanes, y se lleva el desfase a las cefeidas de la otra galaxia. Eso supone que la ley es la misma en las dos. Podría no serlo: las estrellas se forman del gas, y el gas de galaxias distintas tiene cantidades distintas de elementos pesados, que los astrónomos llaman metales y miden como la abundancia de oxígeno, escrita [O/H] y dada en <strong>dex</strong> (un factor diez) respecto del Sol.
             \n\nLa ley recibe entonces un término más, el término de metalicidad, un coeficiente por [O/H]. El panel usa el coeficiente de Riess et al. 2022, &minus;0,217 &plusmn; 0,046 magnitudes por dex, y el [O/H] medio que dan para las cefeidas de cada galaxia. Ninguno se midió aquí; ambos son citados, y cada uno tiene un error que el panel lleva. Las cefeidas son auténticas. Se dibujan la relación y las cefeidas de la galaxia; las distancias están en la lectura.`,
    },
    {
      title: 'Hacia dónde van los metales',
      body: `Toma dos cefeidas con el mismo período, una en una galaxia rica en metales y otra en una pobre. No cambies todavía el panel. El coeficiente es negativo: una magnitud es menor cuanto más brillante es la estrella.`,
      prompt: 'La cefeida rica en metales es…',
      options: [
        'un poco más brillante que la pobre en metales',
        'un poco más débil que la pobre en metales',
        'exactamente igual de brillante: solo el período fija la luminosidad',
        'más brillante solo con períodos de más de treinta días',
      ],
      hints: [
        'Un coeficiente negativo por un [O/H] mayor hace menor la magnitud. ¿Una magnitud menor es más brillante o más débil?',
      ],
      because:
        'Un poco más brillante: &minus;0,217 mag por dex por una galaxia 0,2 dex más rica son &minus;0,04 mag. Una galaxia más rica que aquella en que se calibró la ley tiene cefeidas más brillantes de lo que dice esa ley, así que si omites el término las tomas por más cercanas de lo que están. El paso siguiente lo mide.',
      misconceptions: [
        {
          say: 'No es polvo: la magnitud Wesenheit ya lo quita. El término trata de cómo brilla la propia estrella, y el signo citado es que más metales hacen a una cefeida algo más brillante con el mismo período.',
        },
      ],
    },
    {
      title: 'La distancia dos veces',
      body: `El panel está en <strong>NGC 4258</strong>, con sus cefeidas puestas frente a las de la GNM. Lee el <strong>módulo de distancia</strong> con el término <strong>omitido</strong>, luego pon el término en <strong>incluido</strong> y léelo otra vez.`,
      fields: [
        { label: 'Módulo, sin el término' },
        { label: 'Módulo, con el término' },
      ],
    },
    {
      title: 'Lo que hace un término de este tamaño',
      body: `Un cambio de 0,041 mag en el módulo parece pequeño. Un módulo es cinco veces el logaritmo de la distancia, así que un cambio de <em>s</em> magnitudes cambia la distancia en un factor diez elevado a <em>s</em> sobre cinco. Las filas de <strong>distancia</strong> dan las dos distancias; el cociente es la última fila de la lectura.`,
      prompt:
        '¿En qué porcentaje, aproximadamente, cambia la distancia al incluir el término?',
      options: [
        'Un 2 por ciento: poco junto a la distancia, y siempre en el mismo sentido para una galaxia más rica que la GNM',
        'Un 20 por ciento: una corrección a una magnitud es una corrección grande a una distancia',
        'Un 0,2 por ciento: una centésima de magnitud como mucho',
        'En nada: la distancia la fijan los períodos',
      ],
      hints: ['Diez elevado a 0,041 sobre cinco es el factor.'],
      because:
        '10^(0,0412/5) = 1,019: el término hace la galaxia un 1,9 por ciento más lejana, 7,59 Mpc frente a 7,74. Es poco junto al error de 2,3 por ciento de la distancia, y es un sesgo: tiene el mismo signo para toda galaxia más rica que la GNM, así que más cefeidas no lo quitarían.',
      misconceptions: [
        {
          say: 'Un módulo es un logaritmo: cinco magnitudes son un factor cien en distancia, así que cuatro centésimas de magnitud son solo unos pocos por ciento.',
        },
        {
          say: 'Los períodos fijan la luminosidad dentro de una calibración; la metalicidad mueve la propia calibración.',
        },
      ],
    },
    {
      title: 'Lo que el término añade al error',
      body: `Con el término incluido el módulo es 29,444 &plusmn; 0,053, y omitido 29,403 &plusmn; 0,051. Tres filas se suman al balance de errores: el error del coeficiente llevado sobre la diferencia de [O/H], y el error del [O/H] medio de cada galaxia llevado por el coeficiente. Léelas frente al error de las propias cefeidas de la galaxia.`,
      prompt: '¿Cómo cambia el término el error total?',
      options: [
        'Añade un poco, un 4 por ciento: los términos nuevos son 0,009, 0,011 y 0,004 mag, pequeños junto a los 0,043 de las cefeidas de la propia galaxia, y se suman en cuadratura',
        'Lo duplica: cada número citado trae su error y todos se suman',
        'Lo quita: una corrección hace exacta la distancia',
        'Lo deja igual: un número citado no tiene error',
      ],
      hints: [
        'Los errores independientes se suman en cuadratura, la raíz de la suma de cuadrados. ¿Qué término es el mayor?',
      ],
      because:
        'Un poco. La corrección mueve el módulo 0,041 y suma 0,009, 0,011 y 0,004 mag en cuadratura a un total que ya fijan las cefeidas de la galaxia (0,043) y la distancia de la GNM (0,026), así que el error pasa de 0,051 a 0,053. La corrección es mayor que el error que trae: por eso merece la pena.',
      misconceptions: [
        {
          say: 'Una corrección con un coeficiente citado y abundancias citadas vale lo que valen ellos, y el panel lleva sus errores.',
        },
        {
          say: 'El coeficiente es −0,217 ± 0,046 y cada [O/H] medio tiene una incertidumbre de 0,02 a 0,05 dex; el panel enumera lo que aporta cada uno.',
        },
      ],
    },
    {
      title: 'Más allá de la calibración',
      body: `Pon la metalicidad de la galaxia en <strong>mía</strong> y el deslizador en el valor más bajo, &minus;0,6 dex por debajo de la GNM. La fila Intervalo avisa.`,
      prompt: '¿Qué significa el aviso?',
      options: [
        'El coeficiente se ajustó en un intervalo de [O/H] y esta galaxia queda fuera, así que la corrección es una extrapolación del término citado y no una comprobada',
        'La galaxia no puede ser tan pobre en metales',
        'El panel no puede calcular una distancia ahí',
        'Las cefeidas de la galaxia ya no siguen una relación período-luminosidad',
      ],
      hints: [
        'El intervalo se lee de la calibración citada, de la muestra más pobre a la más rica.',
      ],
      because:
        'La calibración citada abarca galaxias desde la PNM, en &minus;0,72, hasta unas pocas en +0,17 de [O/H]. Una galaxia en −0,89 está por debajo de todas, así que el término, una recta en [O/H], se usa donde nada lo comprobó. El panel da igualmente un número y lo dice, en vez de ocultar que es una extrapolación.',
      misconceptions: [
        {
          say: 'Nada dice que una galaxia así no pueda existir; el aviso trata de los datos de los que salió el coeficiente, no de la galaxia.',
        },
      ],
    },
    {
      title: 'Lo que dice el término',
      body: `La relación de las cefeidas no es del todo la misma en todas partes: una galaxia más rica en metales que aquella en que se calibró la relación tiene cefeidas más brillantes con el mismo período, y omitir el término la sitúa demasiado cerca. Para NGC 4258 el efecto es de 0,04 magnitudes, un dos por ciento en distancia; para M101, aún más rica, un cuatro. El término viene con un coeficiente citado y abundancias citadas, cada uno con un error, y esos errores pasan al de la distancia. Se ajustó en un intervalo de abundancias, y fuera de él la corrección es una extrapolación. La imagen del <strong>efecto</strong> dibuja el cambio y su error por el coeficiente frente a la diferencia de [O/H].`,
    },
  ],
};

export const THE_METALLICITY_TERM_DEEPER_ES = {
  steps: [
    {
      title: 'M101 a mano',
      body: `Cambia la galaxia a <strong>M101</strong>. Su [O/H] citado es +0,10 y el de la GNM &minus;0,29. El término suma <em>&minus;&#947; &times; &#916;[O/H]</em> al módulo con &#947; = &minus;0,217. Calcula el cambio y compáralo con el del panel.`,
      prompt: 'El cambio del módulo de distancia, en magnitudes',
      hints: ['Δ[O/H] = 0,10 − (−0,29) = 0,39 dex.'],
      worked:
        '0,217 × 0,39 = 0,0846 mag, el cambio del panel para M101. Las cefeidas de M101 son 0,39 dex más ricas que las de la GNM, el doble de los 0,19 de NGC 4258, así que el cambio es el doble.',
      feedback: {
        close: 'Casi. Multiplica 0,217 por la diferencia de [O/H], 0,39.',
        'wrong-order-of-magnitude':
          'Se pasa una potencia de diez: el cambio es menos de una décima de magnitud.',
        off: '0,217 × (0,10 − (−0,29)).',
      },
    },
    {
      title: 'La distancia de M101',
      body: `La distancia cambia en diez elevado a <em>s</em> sobre cinco para un cambio de <em>s</em> magnitudes. Usa el cambio que hallaste para M101.`,
      prompt: '¿En qué porcentaje cambia el término la distancia de M101?',
      hints: ['10^(0,0846 / 5) − 1.'],
      worked:
        '10^(0,0846/5) = 1,040: un 4,0 por ciento, 6,95 Mpc sin el término y 7,23 con él. El efecto crece con lo lejos que está la abundancia de la galaxia de la del ancla, y es un sesgo, no dispersión: más cefeidas no lo quitarían.',
      feedback: {
        close:
          'Casi. Diez elevado a 0,0846 dividido entre cinco, menos uno, por cien.',
        'wrong-order-of-magnitude':
          'Se pasa una potencia de diez: un cambio de menos de una décima de magnitud son unos pocos por ciento en distancia.',
        off: '(10^(0,0846 / 5) − 1) × 100.',
      },
    },
    {
      title: 'Dos coeficientes publicados',
      body: `El panel usa &minus;0,217 &plusmn; 0,046 (Riess et al. 2022). Otro ajuste a las cefeidas de la Vía Láctea y las Nubes de Magallanes (Breuval et al. 2022, tabla 4, la misma magnitud Wesenheit) da &minus;0,280 &plusmn; 0,078. Los dos coinciden dentro de 0,7 de su error combinado. Para NGC 4258, con &#916;[O/H] = 0,19 dex, calcula cuánto difiere el módulo entre los dos coeficientes.`,
      prompt: 'La diferencia de los dos cambios, en magnitudes',
      hints: ['(0,280 − 0,217) × 0,19.'],
      worked:
        '0,063 × 0,19 = 0,012 mag, la cuarta parte del error de 0,047 del módulo corregido: la elección del coeficiente está dentro del balance que el panel ya lleva (el error del propio coeficiente aporta 0,009 mag), así que dos valores publicados que coinciden dentro de sus errores no cambian la distancia más que su error.',
      feedback: {
        close:
          'Casi. Toma la diferencia de los dos coeficientes y multiplica por 0,19.',
        'wrong-order-of-magnitude':
          'Se pasa una potencia de diez: los dos cambios difieren en una centésima de magnitud.',
        off: '(0,280 − 0,217) × 0,19.',
      },
    },
    {
      title: '¿Prueba una galaxia el término?',
      body: `NGC 4258 tiene una distancia por máseres de agua que no usa cefeidas: 29,397 &plusmn; 0,032. El panel la muestra. Con el término omitido la calibración de la GNM da 29,403 (0,1 de error combinado de los máseres); con él, 29,444 (0,8 de ellos).`,
      prompt: '¿Qué dice esta galaxia sobre el término?',
      options: [
        'Nada decisivo: ambos valores coinciden con los máseres dentro de sus errores, y el término aleja un poco la estimación de ellos; el argumento a favor del término viene de ajustar muchas galaxias y anclas juntas, no de una',
        'Que el término está mal, porque la estimación se alejó de los máseres',
        'Que el término es correcto, porque una corrección siempre es una mejora',
        'Que los máseres están mal',
      ],
      hints: [
        'Compara cada estimación con los máseres en unidades del error combinado, como permiten las filas del panel.',
      ],
      because:
        'Ninguna estimación está en tensión con los máseres: 0,1 y 0,8 errores combinados. Una galaxia con una diferencia de metalicidad de 0,19 dex no puede distinguir un término de ese tamaño de ninguno, porque su efecto, 0,04 mag, es menor que los errores de la comparación. El coeficiente citado sale de ajustar a la vez las cefeidas de muchos anfitriones y las tres anclas (Riess et al. 2022), una palanca mucho más fuerte, y este panel no repite ese ajuste.',
      misconceptions: [
        {
          say: 'Un movimiento de 0,8 errores combinados está bien dentro de lo que da el azar; no es evidencia contra nada.',
        },
        {
          say: 'Una corrección es una mejora solo si es la correcta, y una galaxia no lo demuestra.',
        },
      ],
    },
  ],
};

const CONTENT = {
  'the-metallicity-term': {
    topic:
      'How the Cepheid period-luminosity relation depends on the metal content of the gas: a metal-rich Cepheid is slightly brighter at the same period, so a galaxy richer than the anchor is nearer than it looks if the term is left out. The cited coefficient and the galaxies’ [O/H] come with errors that the distance carries.',
    difficulty:
      'Upper level (a linear term in a logarithmic relation, errors in quadrature, a cited calibration and where it stops); the survey layer reads the effect and the warning, the majors depth does the shift and the percentage by hand, the advanced depth compares two published coefficients and asks what one galaxy can prove.',
    placement:
      'After Leavitt’s Law and The First Rung in a distance-scale unit, and before the Hubble-constant steps of The First Rung and Standard Candles; in an upper-level course on observational cosmology or stellar variability.',
    overview:
      'Students predict which way metals move a Cepheid’s brightness, measure the NGC 4258 modulus with the term left out (29.403) and included (29.444), work out that this is a 1.9 percent change in distance, read what the term adds to the error (0.051 to 0.053 mag), and see the warning when a galaxy lies outside the span of abundances the coefficient was fitted over.',
    priorKnowledge: [
      'Leavitt’s law and the Wesenheit magnitude (Leavitt’s Law)',
      'The distance modulus and the error budget of a distance (The First Rung)',
      'Errors that add in quadrature, and a logarithmic scale such as dex',
    ],
    keyConcepts: [
      {
        heading: 'A galaxy’s gas sets a Cepheid’s brightness a little',
        body: 'At the same period a metal-rich Cepheid is brighter by about 0.2 mag per dex (cited −0.217 ± 0.046), so the relation calibrated in one galaxy is shifted in another by the coefficient times the difference in [O/H].',
      },
      {
        heading: 'The effect is a bias with an error',
        body: 'NGC 4258 is 0.19 dex richer than the LMC and the shift is 0.041 mag, 1.9 percent in distance; M101 is 0.39 dex richer, 0.085 mag, 4.0 percent. More Cepheids would not remove it, and the error of the coefficient and of each average [O/H] joins the budget.',
      },
      {
        heading: 'A cited term has a domain',
        body: 'The coefficient was fitted over galaxies from [O/H] −0.72 to +0.17; outside it the panel says the correction is an extrapolation. One galaxy cannot show the term is needed: the case is the fit of many hosts and three anchors together.',
      },
    ],
    features: [
      {
        name: 'The metallicity panel (plz-metallicity)',
        text: 'A galaxy (NGC 4258 or M101), the term left out or included, the metallicity as cited, as rich as the LMC or the student’s own value, and two pictures: the relation with the two samples, and the shift with its coefficient error against the difference in [O/H]. The readout gives both moduli, the shift, the distance and each term of the error.',
      },
      {
        name: 'Depth',
        text: 'Quantitative: the shift and the distance change for M101 by hand. Advanced: two published coefficients compared, and what one galaxy can and cannot prove.',
      },
      {
        name: 'Cited, not measured',
        text: 'The coefficient is Riess et al. 2022’s, with Breuval et al. 2022’s as a second published value; the galaxies’ [O/H] are the averages Riess et al. give; nothing in the panel measures a metallicity.',
      },
    ],
    misconceptions: [
      {
        claim: 'Metals make a Cepheid fainter because they absorb light.',
        response:
          'The Wesenheit magnitude already removes dust, and the cited sign says the opposite: the metal-rich Cepheid is slightly brighter at the same period.',
      },
      {
        claim: 'A correction removes the error.',
        response:
          'It removes a bias and adds the errors of the coefficient and the abundances; here the total goes from 0.051 to 0.053 mag.',
      },
      {
        claim: 'The agreement with the masers shows whether the term is right.',
        response:
          'With the term left out the LMC calibration is 0.1 combined errors from the masers and with it 0.8: both agree. One galaxy cannot decide; the cited coefficient comes from the combined fit of many hosts.',
      },
      {
        claim: 'The metallicity of a galaxy is one number for all its Cepheids.',
        response:
          'The panel uses an average over the Cepheid fields; a gradient across a disk spreads the true values around it, and that spread is one reason the abundances carry an error of their own.',
      },
    ],
    teachingNotes: [
      'The coefficient is Riess et al. 2022’s, −0.217 ± 0.046 mag/dex, defined against [O/H] relative to the Sun (their equation 1); the galaxies’ values are their Table 3 means (LMC −0.29 from spectra, NGC 4258 −0.10 and M101 +0.10 from H II regions), and the 0.05 dex given to the two hosts is the systematic of the strong-line scale they propagate. None is measured here, and the panel says so.',
      'The error budget gains three terms: |ΔZ| σγ, |γ| σ(host) and |γ| σ(anchor). The linear total was held to a Monte Carlo propagation (4,000 draws) within 0.3 percent and the 400-host ensemble covers the true modulus within 1 sigma 66.8 percent and within 2 sigma 95.3 percent of the time (thresholds committed first, tests/fixtures/variables-ii/).',
      'For NGC 4258 the maser distance (29.397 ± 0.032) agrees with the estimate left out (0.1 combined errors) and included (0.8): one host cannot show that the term is needed. The case in Riess et al. 2022 is the joint fit of many hosts and three anchors, which this panel does not repeat.',
      'Breuval et al. 2022’s W_H coefficient, −0.280 ± 0.078 (Table 4, a fit without the SMC photometry or the individual abundances), agrees with the first within 0.7 combined errors; the advanced layer uses the difference of their shifts.',
    ],
    discussion: [
      'A galaxy is richer in metals than the LMC by 0.4 dex. Without any numbers, what happens to its Cepheids’ apparent brightness at the same period, and which way does the uncorrected distance err?',
      'The coefficient’s error adds 0.009 mag to NGC 4258’s modulus and the correction is 0.041. When is a correction worth making even though it adds an error?',
      'One galaxy agrees with the masers with and without the term. What would you need to measure to decide whether the term is real?',
    ],
    extensions: [
      'Give M101 your own metallicity and find the value at which the term’s shift equals the combined error of the modulus.',
      'Use the effect picture to read the shift and its coefficient error at −0.3 dex and +0.3 dex, and say which side is better constrained by the cited calibration.',
    ],
    modelNotes:
      'js/kernels/variables/plz.js (ladderWithMetallicity) and plzCited.js (the cited numbers, held equal to tests/fixtures/variables-ii/citations.json), js/variablesIIField.js, js/variablesIIWidgets.js, VARIABLES_II.md. The validation (20 legs, thresholds committed first, an astropy oracle for the features) is tools/variables-ii-validate.mjs. One linear term in [O/H], the same at every period; crowding and blending are not modeled; the galaxies’ [O/H] are averages over their Cepheid fields.',
  },
};

const FLOW = {
  'the-metallicity-term': [
    {
      from: 'a-term-for-the-gas',
      to: 'which-way-does-metal-go',
      text: 'The relation with a term for metal content, and the prediction of which way metals move a Cepheid’s brightness.',
    },
    {
      from: 'the-distance-twice',
      to: 'what-a-term-this-size-does',
      text: 'The NGC 4258 modulus with the term left out and included, and what the shift is as a percentage of the distance.',
    },
    {
      from: 'what-the-term-adds-to-the-error',
      to: 'what-the-term-adds-to-the-error',
      text: 'What the term adds to the error, term by term.',
    },
    {
      from: 'beyond-the-calibration',
      to: 'beyond-the-calibration',
      text: 'The span of abundances the cited coefficient covers, and what the warning outside it means.',
    },
    {
      from: 'what-the-term-says',
      to: 'what-the-term-says',
      text: 'The summary: the term, its effect as a bias, its error, and its domain.',
    },
  ],
};

const EXPECTATIONS = {
  'the-metallicity-term': {
    'the-distance-twice':
      'For NGC 4258, a distance modulus of 29.403 with the term left out (within 0.01) and 29.444 with it included (within 0.01).',
  },
};

const BANDS = {
  'the-metallicity-term': {
    core: 'medium',
    quantitative: 'medium',
    advanced: 'long',
  },
};

/** The guides, flows, expectations and time bands of the lesson above. */
export const INSTRUCTOR = {
  content: CONTENT,
  flow: FLOW,
  expectations: EXPECTATIONS,
  bands: BANDS,
};

/** The Spanish shadows by lesson id (what instructorLocale.js spreads). */
export const SHADOWS = {
  'the-metallicity-term': THE_METALLICITY_TERM_ES,
};

/** The deeper steps by lesson id (what js/investigations/depth*.js read). */
export const DEPTH = {
  'the-metallicity-term': THE_METALLICITY_TERM_DEEPER,
};
export const DEPTH_ES = {
  'the-metallicity-term': THE_METALLICITY_TERM_DEEPER_ES,
};

/** The lessons, in catalog order (what js/data/investigations.js spreads). */
export default [THE_METALLICITY_TERM];
