// =============================================================================
// How Many Earths? and the upper depth of Who Gets Counted (Prompt 229)
// -----------------------------------------------------------------------------
// One module, the one closure file the prompt adds (D-R10-229-05), carrying the new lesson, its Spanish words,
// the upper-depth steps of the new lesson, their Spanish words and the instructor content. The per-lesson path
// every loader builds from an id is a one-line re-export of a named export here. The two steps added to Who Gets
// Counted live in its own depth files. No imports: every number a step states is recomputed in
// tests/occurrenceLessons.test.js from the instrument (js/occurrenceWidgets.js over js/occurrenceField.js and the
// occurrence kernel js/kernels/occurrence/). Every step carries a `sid`.
//
// The survey is synthetic and says so. What the lessons teach: a count of what a survey found is not a rate, the
// rate needs the completeness (the chance of a transit times the chance the search recovers it), what a bin with
// no listing and a bin the survey could hardly see say, and what a grid of rates cannot say.
// =============================================================================

const near = (x, target, tolerance) =>
  Number.isFinite(x) && Math.abs(x - target) <= tolerance;

const STAGE = {
  spacing: 150,
  fit: true,
  stars: [{ role: 'star', name: 'One of 2000 stars', teffK: 5800, lumSun: 1 }],
};

/** The efficiency panel: radius bin, period bin, view (0 by period, 1 the curve). */
const EFF = (values = {}) => ({
  id: 'occurrence-efficiency',
  values: { radius: 1, period: 3, view: 0, ...values },
});

/** The grid panel: seed, radius bin, period bin, level (0 is 68 percent), reliability (0 none, 1 stated, 2 doubled), truth. */
const GRID = (values = {}) => ({
  id: 'occurrence-grid',
  values: {
    seed: 1,
    radius: 1,
    period: 3,
    level: 0,
    reliability: 1,
    truth: 0,
    ...values,
  },
});

export const HOW_MANY_EARTHS = {
  id: 'how-many-earths',
  thumbnail: 'images/investigations/how-many-earths.webp',
  title: 'How Many Earths?',
  subtitle:
    'From the planets a survey found to how many there are: what it could have seen, what a count becomes, and what a bin cannot say',
  duration: '8-12 min',
  level: 'Introductory to upper-level astronomy',
  audience: 'intro',
  textbook: { chapter: 21, section: null },
  courseLevel: 'majors',
  mathematics: 'algebra',
  prerequisites: ['transit-photometry'],
  tags: ['exoplanets', 'observing'],
  lock: { placement: true, inspector: true },
  depths: ['core', 'quantitative', 'advanced'],
  objectives: [
    'Say why a count of the planets a survey found is not a rate, and what the survey could have found instead',
    'Read how much of the planets of a size and period a survey could see, and that it is geometry times the search',
    'Work out a rate from the listings and the completeness of a bin, with its interval',
    'Say what a bin with no listing and a bin the survey could hardly see give, and what a grid of rates cannot say',
  ],
  steps: [
    {
      sid: 'a-count-is-not-a-rate',
      stage: STAGE,
      type: 'read',
      title: 'A count is not a rate',
      body: `A survey watched 2000 stars and listed some planets. How many planets does a star have? Not the number listed divided by
             2000: a planet only shows if its orbit happens to cross our line of sight, and only if the search can pick its dip out of
             the star&rsquo;s noise. The first panel shows the second part. Planets of every size and period were <em>injected</em>
             into every star&rsquo;s own series, and the search was run on them: the share it found is the efficiency. The stars are
             synthetic, with noise and spans of their own, and so are the planets.`,
      tool: EFF(),
    },
    {
      sid: 'what-is-easy-prediction',
      stage: STAGE,
      type: 'predict',
      reveal: 'who-the-survey-sees',
      title: 'Who the survey sees',
      body: `Planets of 0.5 to 1 Earth radii, with orbital periods of 8 to 16 days. Only those that transit are in question.`,
      prompt: 'What share of the planets that transit does the search recover?',
      options: [
        'Almost all of them: a transit is a transit',
        'About a third of them',
        'About one in a hundred',
        'None: planets this small cannot be recovered at all',
      ],
      answer: 1,
      hints: [
        'A planet of this size dims its star by well under a hundred parts per million, and the noise of one cadence is of order a hundred.',
      ],
      because:
        'About a third: 36 percent. A planet this small is recovered when its many transits add up, and at this period a star holds many of them, so some are found and many are not.',
      tool: EFF({ radius: 0, period: 3 }),
    },
    {
      sid: 'who-the-survey-sees',
      stage: STAGE,
      type: 'question',
      kind: 'choice',
      title: 'Try it',
      body: `Set the <strong>radius bin</strong> to 0.5 to 1 and the <strong>period bin</strong> to 8 to 16, and read the efficiency row.`,
      prompt:
        'What share of the planets that transit here does the search recover?',
      options: [
        '100 percent',
        'About a third: 36 percent',
        'About one percent',
        'Half: 50 percent',
      ],
      answer: 1,
      hints: [
        'The row says how many percent of the planets that transit here are recovered.',
      ],
      because:
        'The efficiency is 36 percent. Make the planet bigger and it climbs to 85 percent at 1 to 2 Earth radii and to nearly all of them above 2: the dip is deeper than the noise.',
      misconceptions: [
        {
          id: 'all',
          option: 0,
          say: 'A transit that is in the data is not always found: the dip of a planet this small is a fraction of the noise of one cadence, and the search needs the transits together.',
        },
      ],
      tool: EFF({ radius: 0, period: 3 }),
    },
    {
      sid: 'how-many-it-lists',
      stage: STAGE,
      type: 'question',
      kind: 'choice',
      title: 'From listings to a rate',
      body: `The second panel has the listings of one searched population. Look at planets of 1 to 2 Earth radii with periods of 8 to 16
             days. The completeness row says how many planets the survey lists for every planet per star in this bin: transit
             probability times recovery, added up over the stars. The listings are divided by it, and by the share of listings that are
             not planets (the reliability, stated).`,
      prompt:
        'The bin has 10 listings. About how many planets per star is that?',
      options: ['10', 'About 0.12', 'About 0.012', 'About 8'],
      answer: 1,
      hints: [
        'Divide the listings by the completeness, then take the reliability off.',
      ],
      because:
        'The survey lists 82 planets for every planet per star here. Ten listings are therefore about 0.12 planets per star (10 over 82 is 0.122, and a reliability of 0.95 takes it to 0.116). The listings said 10; the rate says what that means per star.',
      tool: GRID(),
    },
    {
      sid: 'the-next-population',
      stage: STAGE,
      type: 'question',
      kind: 'choice',
      title: 'Another population',
      body: `Change the <strong>seed</strong> to 2. It is another population drawn from the same truth, listed by the same survey.`,
      prompt: 'What does the rate of the same bin do?',
      options: [
        'Nothing: it is a fixed fact about the survey',
        'It moves a little, within what its interval says',
        'It changes a great deal: the method is broken',
        'It doubles',
      ],
      answer: 1,
      hints: [
        'Count the listings in the bin at each seed, and read the interval.',
      ],
      because:
        'The bin has 9 listings and a rate of 0.105 at seed 2, 7 listings and 0.081 at seed 3, against 10 and 0.116 at seed 1. The listings are a count, so they scatter by about their square root, and the interval says so.',
      misconceptions: [
        {
          id: 'fixed',
          option: 0,
          say: 'The survey is fixed; which planets happen to be listed is not. A different population gives different listings, and the interval is the width of that scatter.',
        },
      ],
      tool: GRID({ seed: 2 }),
    },
    {
      sid: 'a-bin-it-cannot-see',
      stage: STAGE,
      type: 'question',
      kind: 'choice',
      title: 'A bin it cannot see',
      body: `Set the seed back to 1, the <strong>radius bin</strong> to 0.5 to 1 and the <strong>period bin</strong> to 128 to 256.`,
      prompt: 'What does the panel give for this bin, which has no listings?',
      options: [
        'A rate of zero: nothing was found',
        'A rate with a wide interval',
        'Nothing: no rate and no limit, because the survey lists only 1.3 planets for every planet per star here',
        'An upper limit of 0.02 planets per star',
      ],
      answer: 2,
      hints: [
        'Read the completeness row: how many planets does the survey list for every planet per star here, and what is the floor?',
      ],
      because:
        'The survey lists 1.3 planets for every planet per star here, below the floor of 5, so a bin with none, or with one, says almost nothing. The panel gives no rate and no limit: nothing found is not nothing there, and a survey that could hardly see a bin says so.',
      misconceptions: [
        {
          id: 'zero',
          option: 0,
          say: 'No listing is a measurement only where the survey could have listed something. Here it could hardly have, so zero is not a rate.',
        },
      ],
      tool: GRID({ radius: 0, period: 7 }),
    },
    {
      sid: 'what-you-can-now-say',
      stage: STAGE,
      type: 'read',
      title: 'What you can now say',
      body: `A rate is the listings divided by the completeness, with the reliability taken off: the planets per star that would give what the
             survey listed. The completeness is the chance of a transit times the chance the search recovers it, added over the stars, and
             it falls with period and with size. Another population moves a bin by about the square root of its listings. A bin the survey
             could hardly see gives no rate, and a bin with no listing where it could have seen gives only a limit.`,
      tool: GRID(),
    },
  ],
};

export const HOW_MANY_EARTHS_DEEPER = {
  id: 'how-many-earths',
  steps: [
    {
      sid: 'read-a-rate',
      after: 'how-many-it-lists',
      depth: 'quantitative',
      type: 'measure',
      title: 'Read a rate',
      body: `With seed 1, 1 to 2 Earth radii and 8 to 16 days, read the rate and the upper end of its 68 percent interval.`,
      fields: [
        {
          id: 'a',
          label: 'Rate, in planets per star',
          unit: '',
          hint: '0.116',
        },
        {
          id: 'b',
          label: 'Upper end of the 68 percent interval, in planets per star',
          unit: '',
          hint: '0.166',
        },
      ],
      validate: v => {
        if (![v.a, v.b].every(Number.isFinite)) return null;
        if (near(v.a, 0.116, 0.006) && near(v.b, 0.166, 0.012)) {
          return {
            level: 'ok',
            message:
              'Ten listings over a completeness of 81.8, times the reliability of 0.95, give 0.116 planets per star, and the exact Poisson interval for ten counts runs from 0.080 to 0.166.',
          };
        }
        return {
          level: 'error',
          message:
            'Read the rate row for seed 1, 1 to 2 Earth radii and 8 to 16 days: 0.116 planets per star, up to 0.166 at 68 percent.',
        };
      },
      tool: GRID(),
    },
    {
      sid: 'a-bin-with-none',
      after: 'a-bin-it-cannot-see',
      depth: 'quantitative',
      type: 'measure',
      title: 'A bin with none',
      body: `Set the seed to 1, the <strong>radius bin</strong> to 8 to 16 and the <strong>period bin</strong> to 8 to 16. The survey saw no planet this large. Read the limit, and how many planets the survey lists for every planet per star here.`,
      fields: [
        {
          id: 'a',
          label: 'Upper limit at 95 percent, in planets per star',
          unit: '',
          hint: '0.031',
        },
        {
          id: 'b',
          label: 'Planets listed for every planet per star',
          unit: '',
          hint: '96',
        },
      ],
      validate: v => {
        if (![v.a, v.b].every(Number.isFinite)) return null;
        if (near(v.a, 0.031, 0.003) && near(v.b, 96, 3)) {
          return {
            level: 'ok',
            message:
              'With no listing the limit is 3.0 over the completeness: 3.0 over 96.4 is 0.031. Fewer than about one star in thirty has such a planet at these periods, at 95 percent. It is a limit, not a rate of zero.',
          };
        }
        return {
          level: 'error',
          message:
            'Read the rate row: the limit is 0.031 planets per star, and the completeness row says 96 planets listed for every planet per star.',
        };
      },
      tool: GRID({ radius: 4, period: 3 }),
    },
    {
      sid: 'what-a-stated-reliability-does',
      after: 'a-bin-with-none',
      depth: 'advanced',
      type: 'question',
      kind: 'choice',
      title: 'What a stated reliability does',
      body: `Set the <strong>radius bin</strong> to 2 to 4 and the <strong>period bin</strong> to 64 to 128, with no reliability stated. Read the rate (0.224 for the 4 listings), then state the reliability. A fifth of the listings at this period are taken not to be planets.`,
      prompt: 'By what factor does the rate change?',
      options: [
        'It does not change',
        'It falls to 0.80 of what it was: a fifth of the listings are not planets',
        'It falls to 0.2 of what it was',
        'It doubles',
      ],
      answer: 1,
      hints: [
        'The rate is the listings times the reliability over the completeness.',
      ],
      because:
        'The rate is n times the reliability over E, so it falls by the reliability itself, from 0.224 to 0.179 planets per star. The reliability is stated, not computed: the survey does not know which listings are false, and a wrong statement moves every rate in the bin by the same factor.',
      tool: GRID({ radius: 2, period: 6, reliability: 0 }),
    },
    {
      sid: 'the-total-the-grid-cannot-give',
      after: 'what-a-stated-reliability-does',
      depth: 'advanced',
      type: 'question',
      kind: 'choice',
      title: 'The total the grid cannot give',
      body: `Set the <strong>radius bin</strong> to 0.5 to 1 and the seed to 1. The last row adds the rates of the bins that have one: about one planet per star. Two of the eight period bins are not constrained.`,
      prompt: 'Can you say that a star has about one planet of this size?',
      options: [
        'Yes: the rates add to about 0.98',
        'Only for the periods with a rate: the bins from 64 days out are not constrained, and the grid does not say what is in them',
        'Yes, and the interval of the sum is the sum of the intervals',
        'No: there are none at the long periods',
      ],
      answer: 1,
      hints: [
        'What is in the bins the sum leaves out, and what would it take to say?',
      ],
      because:
        'The sum covers the bins the survey could see. The bins it could hardly see (here 128 days and beyond, with the long periods where most of the planets are in this population) hold more than the sum, and the grid has no way to say how much without a model of how the rate depends on period that the survey itself cannot test. Switch on the true rates to see: they add to 1.6.',
      tool: GRID({ radius: 0, period: 0 }),
    },
    {
      sid: 'what-the-grid-cannot-say',
      after: 'the-total-the-grid-cannot-give',
      depth: 'advanced',
      type: 'read',
      title: 'What the grid cannot say',
      body: `The rates are for this survey, this search and this population. The search is the matched filter at the known period and phase,
             so the completeness is better than a real search&rsquo;s would be. The interval carries the counting error of the listings
             only: the reliability is stated and taken as exact, and the completeness has a small error of its own. A rate may exceed one
             planet per star, and a sum over bins may too. No smoothing of the grid is offered; a smoothed grid would be a
             regularisation and would not be a posterior. And a survey says nothing of the bins it could hardly see.`,
      tool: GRID({ truth: 1 }),
    },
  ],
};

export const HOW_MANY_EARTHS_ES = {
  title: '¿Cuántas Tierras?',
  subtitle:
    'De los planetas que encontró un sondeo a cuántos hay: qué podía haber visto, en qué se convierte una cuenta y qué no puede decir una casilla',
  objectives: [
    'Decir por qué una cuenta de los planetas que encontró un sondeo no es una tasa, y qué podía haber encontrado en cambio',
    'Leer qué parte de los planetas de un tamaño y un período podía ver un sondeo, y que es geometría por la búsqueda',
    'Calcular una tasa a partir de los listados y la completitud de una casilla, con su intervalo',
    'Decir qué dan una casilla sin listados y una que el sondeo apenas podía ver, y qué no puede decir una rejilla de tasas',
  ],
  steps: [
    {
      title: 'Una cuenta no es una tasa',
      body: `Un sondeo vigiló 2000 estrellas y listó algunos planetas. ¿Cuántos planetas tiene una estrella? No el número listado dividido entre 2000: un planeta solo se ve si su órbita cruza por casualidad nuestra línea de visión, y solo si la búsqueda saca su caída del ruido de la estrella. El primer panel muestra la segunda parte. Se <em>inyectaron</em> planetas de todos los tamaños y períodos en la serie propia de cada estrella y se ejecutó la búsqueda: la parte que encontró es la eficiencia. Las estrellas son sintéticas, con ruido y duración propios, y los planetas también.`,
    },
    {
      title: 'A quién ve el sondeo',
      body: `Planetas de 0,5 a 1 radio terrestre, con períodos orbitales de 8 a 16 días. Solo importan los que transitan.`,
      prompt: '¿Qué parte de los planetas que transitan recupera la búsqueda?',
      options: [
        'Casi todos: un tránsito es un tránsito',
        'Cerca de un tercio',
        'Uno de cada cien',
        'Ninguno: planetas tan pequeños no se pueden recuperar',
      ],
      hints: [
        'Un planeta de este tamaño atenúa su estrella en bastante menos de cien partes por millón, y el ruido de un cuadro es del orden de cien.',
      ],
      because:
        'Cerca de un tercio: el 36 por ciento. Un planeta tan pequeño se recupera cuando se suman sus muchos tránsitos, y a este período una estrella contiene muchos, así que algunos se encuentran y muchos no.',
    },
    {
      title: 'Pruébalo',
      body: `Pon la <strong>casilla de radio</strong> en 0,5 a 1 y la <strong>casilla de período</strong> en 8 a 16, y lee la fila de la eficiencia.`,
      prompt:
        '¿Qué parte de los planetas que transitan aquí recupera la búsqueda?',
      options: [
        'El 100 por ciento',
        'Cerca de un tercio: el 36 por ciento',
        'Cerca del uno por ciento',
        'La mitad: el 50 por ciento',
      ],
      hints: [
        'La fila dice qué por ciento de los planetas que transitan aquí se recuperan.',
      ],
      because:
        'La eficiencia es del 36 por ciento. Haz el planeta mayor y sube al 85 por ciento a 1 a 2 radios terrestres y a casi todos por encima de 2: la caída es más profunda que el ruido.',
      misconceptions: [
        {
          say: 'Un tránsito que está en los datos no siempre se encuentra: la caída de un planeta tan pequeño es una fracción del ruido de un cuadro, y la búsqueda necesita los tránsitos juntos.',
        },
      ],
    },
    {
      title: 'De los listados a una tasa',
      body: `El segundo panel tiene los listados de una población buscada. Mira planetas de 1 a 2 radios terrestres con períodos de 8 a 16 días. La fila de la completitud dice cuántos planetas lista el sondeo por cada planeta por estrella en esta casilla: probabilidad de tránsito por recuperación, sumada sobre las estrellas. Los listados se dividen entre ella, y entre la parte de listados que no son planetas (la fiabilidad, declarada).`,
      prompt:
        'La casilla tiene 10 listados. ¿Cuántos planetas por estrella son?',
      options: ['10', 'Cerca de 0,12', 'Cerca de 0,012', 'Cerca de 8'],
      hints: [
        'Divide los listados entre la completitud y quita después la fiabilidad.',
      ],
      because:
        'El sondeo lista 82 planetas por cada planeta por estrella aquí. Diez listados son por tanto unos 0,12 planetas por estrella (10 entre 82 es 0,122, y una fiabilidad de 0,95 lo deja en 0,116). Los listados decían 10; la tasa dice qué significa eso por estrella.',
    },
    {
      title: 'Otra población',
      body: `Cambia la <strong>semilla</strong> a 2. Es otra población sacada de la misma verdad, listada por el mismo sondeo.`,
      prompt: '¿Qué hace la tasa de la misma casilla?',
      options: [
        'Nada: es un hecho fijo del sondeo',
        'Se mueve un poco, dentro de lo que dice su intervalo',
        'Cambia muchísimo: el método está roto',
        'Se duplica',
      ],
      hints: [
        'Cuenta los listados de la casilla con cada semilla y lee el intervalo.',
      ],
      because:
        'La casilla tiene 9 listados y una tasa de 0,105 con la semilla 2, 7 listados y 0,081 con la 3, frente a 10 y 0,116 con la 1. Los listados son una cuenta, así que se dispersan en torno a su raíz cuadrada, y el intervalo lo dice.',
      misconceptions: [
        {
          say: 'El sondeo es fijo; qué planetas se listan por casualidad no lo es. Otra población da otros listados, y el intervalo es la anchura de esa dispersión.',
        },
      ],
    },
    {
      title: 'Una casilla que no puede ver',
      body: `Vuelve a poner la semilla en 1, la <strong>casilla de radio</strong> en 0,5 a 1 y la <strong>casilla de período</strong> en 128 a 256.`,
      prompt: '¿Qué da el panel para esta casilla, que no tiene listados?',
      options: [
        'Una tasa de cero: no se encontró nada',
        'Una tasa con un intervalo ancho',
        'Nada: ni tasa ni límite, porque el sondeo lista solo 1,3 planetas por cada planeta por estrella aquí',
        'Un límite superior de 0,02 planetas por estrella',
      ],
      hints: [
        'Lee la fila de la completitud: ¿cuántos planetas lista el sondeo por cada planeta por estrella aquí, y cuál es el mínimo?',
      ],
      because:
        'El sondeo lista 1,3 planetas por cada planeta por estrella aquí, por debajo del mínimo de 5, así que una casilla con ninguno, o con uno, dice casi nada. El panel no da ni tasa ni límite: no encontrar nada no es que no haya nada, y un sondeo que apenas podía ver una casilla lo dice.',
      misconceptions: [
        {
          say: 'No listar nada es una medida solo donde el sondeo podía haber listado algo. Aquí apenas podía, así que el cero no es una tasa.',
        },
      ],
    },
    {
      title: 'Lo que ya puedes decir',
      body: `Una tasa es los listados divididos entre la completitud, quitando la fiabilidad: los planetas por estrella que darían lo que listó el sondeo. La completitud es la probabilidad de un tránsito por la probabilidad de que la búsqueda lo recupere, sumada sobre las estrellas, y baja con el período y con el tamaño. Otra población mueve una casilla en torno a la raíz cuadrada de sus listados. Una casilla que el sondeo apenas podía ver no da tasa, y una casilla sin listados donde podía haber visto da solo un límite.`,
    },
  ],
};

export const HOW_MANY_EARTHS_DEEPER_ES = {
  id: 'how-many-earths',
  steps: [
    {
      title: 'Lee una tasa',
      body: `Con la semilla 1, 1 a 2 radios terrestres y 8 a 16 días, lee la tasa y el extremo superior de su intervalo del 68 por ciento.`,
      fields: [
        { label: 'Tasa, en planetas por estrella' },
        {
          label:
            'Extremo superior del intervalo del 68 por ciento, en planetas por estrella',
        },
      ],
    },
    {
      title: 'Una casilla sin listados',
      body: `Pon la semilla en 1, la <strong>casilla de radio</strong> en 8 a 16 y la <strong>casilla de período</strong> en 8 a 16. El sondeo no vio ningún planeta tan grande. Lee el límite, y cuántos planetas lista el sondeo por cada planeta por estrella aquí.`,
      fields: [
        { label: 'Límite superior al 95 por ciento, en planetas por estrella' },
        { label: 'Planetas listados por cada planeta por estrella' },
      ],
    },
    {
      title: 'Qué hace una fiabilidad declarada',
      body: `Pon la <strong>casilla de radio</strong> en 2 a 4 y la <strong>casilla de período</strong> en 64 a 128, sin fiabilidad declarada. Lee la tasa (0,224 con los 4 listados) y declara después la fiabilidad. Se toma que una quinta parte de los listados a este período no son planetas.`,
      prompt: '¿Por qué factor cambia la tasa?',
      options: [
        'No cambia',
        'Baja a 0,80 de lo que era: una quinta parte de los listados no son planetas',
        'Baja a 0,2 de lo que era',
        'Se duplica',
      ],
      hints: [
        'La tasa es los listados por la fiabilidad entre la completitud.',
      ],
      because:
        'La tasa es n por la fiabilidad entre E, así que baja en la fiabilidad misma, de 0,224 a 0,179 planetas por estrella. La fiabilidad se declara, no se calcula: el sondeo no sabe qué listados son falsos, y una declaración errónea mueve todas las tasas de la casilla por el mismo factor.',
    },
    {
      title: 'El total que la rejilla no puede dar',
      body: `Pon la <strong>casilla de radio</strong> en 0,5 a 1 y la semilla en 1. La última fila suma las tasas de las casillas que tienen una: cerca de un planeta por estrella. Dos de las ocho casillas de período no están acotadas.`,
      prompt:
        '¿Puedes decir que una estrella tiene cerca de un planeta de este tamaño?',
      options: [
        'Sí: las tasas suman cerca de 0,98',
        'Solo para los períodos con tasa: las casillas de 64 días en adelante no están acotadas, y la rejilla no dice qué hay en ellas',
        'Sí, y el intervalo de la suma es la suma de los intervalos',
        'No: no hay ninguno a los períodos largos',
      ],
      hints: [
        '¿Qué hay en las casillas que la suma deja fuera, y qué haría falta para decirlo?',
      ],
      because:
        'La suma cubre las casillas que el sondeo podía ver. Las que apenas podía ver (aquí 128 días en adelante, con los períodos largos donde está la mayoría de los planetas de esta población) contienen más que la suma, y la rejilla no tiene modo de decir cuánto sin un modelo de cómo depende la tasa del período que el propio sondeo no puede comprobar. Activa las tasas verdaderas para verlo: suman 1,6.',
    },
    {
      title: 'Lo que la rejilla no puede decir',
      body: `Las tasas son de este sondeo, esta búsqueda y esta población. La búsqueda es el filtro adaptado al período y la fase conocidos, así que la completitud es mejor que la de una búsqueda real. El intervalo lleva solo el error de cuenta de los listados: la fiabilidad se declara y se toma como exacta, y la completitud tiene un pequeño error propio. Una tasa puede pasar de un planeta por estrella, y una suma sobre casillas también. No se ofrece ningún suavizado de la rejilla; una rejilla suavizada sería una regularización y no una posterior. Y un sondeo no dice nada de las casillas que apenas podía ver.`,
    },
  ],
};

// ---- instructor content -------------------------------------------------------------------------------

const CONTENT = {
  'how-many-earths': {
    topic:
      'An occurrence rate on a searched population: the planets a survey listed, the completeness of each bin (the chance of a transit times the chance the search recovers it, measured by injecting transits into every star’s own series), the rate and its interval, a bin with no listing and a bin the survey could hardly see, a stated reliability, and what a grid of rates cannot say.',
    difficulty:
      'Introductory (a count is not a rate; the survey sees a third of the smallest planets here and nearly all above two Earth radii; listings over completeness; a bin with none is a limit, and a bin the survey cannot see gives nothing); majors (read a rate and its interval, a limit); upper level (the stated reliability, and the total the grid cannot give).',
    placement:
      'After Transit Photometry, and after Who Gets Counted if the class has done it (the same selection idea for stars). Before a unit on population inference. It pairs with the upper depth of Who Gets Counted, which carries the same panels.',
    overview:
      'Students predict the share of small planets the search recovers, read the efficiency in the panel, turn ten listings into a rate for a bin, see the rate move with the population’s seed, and meet a bin the survey cannot see. The quantitative steps read a rate with its interval and an upper limit; the upper depth states a reliability and shows what a sum over bins cannot say.',
    priorKnowledge: [
      'A transit gives a dip whose depth is the square of the radius ratio (Transit Photometry)',
      'That a survey with a magnitude limit counts what it can see (Who Gets Counted)',
      'What a Poisson count and its scatter are',
    ],
    keyConcepts: [
      {
        heading: 'A rate needs the completeness',
        body: 'The completeness of a bin is the chance a planet transits (R*/a) times the chance the search recovers it, added over the stars: the survey lists that many planets for every planet per star. The rate is the listings over it, with the stated reliability taken off, and it may exceed one planet per star.',
      },
      {
        heading: 'Injection and recovery',
        body: 'Planets are injected into every star’s own series and the search is run: the share found is the efficiency. Here it follows the normal curve of the signal to noise against the threshold of 7.1, as a white-noise matched filter must; real searches differ and the injection measures it.',
      },
      {
        heading: 'Limits and refusals',
        body: 'A bin with no listing gives the one-sided limit 3.0 over the completeness at 95 percent, not a rate of zero. A bin whose completeness is below 5 gives nothing: no rate and no limit. A rate is refused without a stated reliability.',
      },
    ],
    features: [
      {
        name: 'Held prediction',
        text: 'The prediction is held: the panel shows nothing that answers it until the step that settles it.',
      },
      {
        name: 'The occurrence panels (occurrence-efficiency, occurrence-grid)',
        text: 'A synthetic survey of 2000 stars with noise and spans of their own, the efficiency by period for each radius bin or as a curve against the signal to noise, and the rate of every bin for the population of a chosen seed, with its interval, its limit or its refusal, a stated reliability and a switch that shows the true rates, through the plot component with its table.',
      },
      {
        name: 'Depth',
        text: 'Quantitative: read a rate and the upper end of its interval, and a limit. Advanced: what a stated reliability does, and the total the grid cannot give.',
      },
    ],
    misconceptions: [
      {
        claim:
          'The number of planets listed divided by the number of stars is the rate.',
        response:
          'It is the rate only for a survey that finds every planet. Here the survey lists 82 planets for every planet per star at 1 to 2 Earth radii and 8 to 16 days, and one for every five at 0.5 to 1 Earth radii and 128 to 256 days.',
      },
      {
        claim: 'No planets found means no planets there.',
        response:
          'Only where the survey could have found one. A bin it could hardly see gives no limit at all, and a bin with none where it could have seen gives an upper limit, which is not zero.',
      },
      {
        claim: 'A rate cannot be more than one.',
        response:
          'It is an expected number per star in a bin, and the rates over the bins add: the true rates of the smallest planets here add to 1.6.',
      },
      {
        claim: 'The interval says how well the rate is known.',
        response:
          'It carries the counting error of the listings only: the reliability is stated and the completeness has an error of its own, and the search here is better than a real one.',
      },
    ],
    teachingNotes: [
      'Ask for the prediction before the panel is touched; the held answer is revealed at the step that tests it.',
      'The survey is synthetic: 2000 stars with log-normal radius and noise and three spans, circular orbits, the matched filter at the known period and phase, and a population whose rates are stated (OCCURRENCE_RATES.md). Nothing here is a statement about a real survey.',
      'The completeness is measured once by injection (eight transits per star and bin) and stored; the panel draws only the population (the listings) for the seed a student picks.',
      'The thresholds were committed before the code (tests/fixtures/occurrence/thresholds.json); legs that failed stay labeled in failed-legs.json; the authentic leg E1 was not run.',
    ],
    discussion: [
      'A survey doubles its observing time. Which bins gain the most completeness, and which gain nothing?',
      'If a catalog of candidates is 30 percent false at long periods, what does that do to the rate there, and how would you find the 30 percent?',
      'The sum of the rates over the periods the survey can see is one planet per star. What would you need to claim the total?',
    ],
    extensions: [
      'Find the smallest planet for which the survey lists more than 100 planets for every planet per star at 8 to 16 days.',
      'Switch the reliability between none, stated and twice, and say which bins move most.',
    ],
    assessment:
      'Core: the prediction and the three choices (36 percent of the smallest planets recovered; ten listings over a completeness of 82 are about 0.12 planets per star; another population moves the bin within its interval; a bin with a completeness of 1.3 gives no rate and no limit). Quantitative: the rate 0.116 within 0.006 and the upper end 0.166 within 0.012; the limit 0.031 within 0.003 and the completeness 96 within 3. Advanced: the reliability’s factor of 0.80 and that the total over bins cannot be stated.',
    modelNotes:
      'js/kernels/occurrence/, js/occurrenceField.js, js/occurrenceWidgets.js, js/data/occurrenceSurvey.js, OCCURRENCE_RATES.md. The thresholds are tests/fixtures/occurrence/thresholds.json, committed before the code; the oracle is tools/occurrence-oracle/oracle.py (numpy, scipy, batman).',
  },
};

const FLOW = {
  'how-many-earths': [
    {
      from: 'a-count-is-not-a-rate',
      to: 'what-is-easy-prediction',
      text: 'A count of listings is not a rate, and the prediction of what share of the smallest transiting planets the search recovers.',
    },
    {
      from: 'who-the-survey-sees',
      to: 'how-many-it-lists',
      text: 'The search recovers 36 percent of the smallest, and from a completeness of 82 ten listings become about 0.12 planets per star.',
    },
    {
      from: 'the-next-population',
      to: 'a-bin-it-cannot-see',
      text: 'Another population moves the bin within its interval, and a bin the survey cannot see gives no rate and no limit.',
    },
    {
      from: 'what-you-can-now-say',
      to: 'what-you-can-now-say',
      text: 'The summary: a rate is the listings over the completeness with the reliability taken off, and what a bin that could not be seen gives.',
    },
  ],
};

const EXPECTATIONS = {
  'how-many-earths': {
    'who-the-survey-sees':
      'At 0.5 to 1 Earth radii and 8 to 16 days the efficiency reads 36 percent; at 1 to 2 Earth radii it reads 85 percent.',
    'how-many-it-lists':
      'The completeness row reads 81.8 planets listed for every planet per star, the listings 10, and the rate about 0.116 planets per star.',
    'a-bin-it-cannot-see':
      'The completeness row reads 1.3, below the floor of 5, and the rate row says the bin is not constrained.',
  },
};

const BANDS = {
  'how-many-earths': {
    core: 'short',
    quantitative: 'short',
    advanced: 'medium',
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
export const SHADOWS = { 'how-many-earths': HOW_MANY_EARTHS_ES };

/** The deeper steps by lesson id (what js/investigations/depth*.js read). */
export const DEPTH = { 'how-many-earths': HOW_MANY_EARTHS_DEEPER };
export const DEPTH_ES = { 'how-many-earths': HOW_MANY_EARTHS_DEEPER_ES };

/** The lessons, in catalog order (what js/data/investigations.js spreads). */
export default [HOW_MANY_EARTHS];
