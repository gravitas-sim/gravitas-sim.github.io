// =============================================================================
// Two Clusters, Two Ages (Prompt 219)
// -----------------------------------------------------------------------------
// One investigation at three depths, in one module that also carries its Spanish
// words, its deeper steps and its instructor content: this is the one closure file
// the prompt adds (D-R10-219-01), because the shared sequence files sit at their
// line ceilings. The per-lesson path every loader builds from an id is a one-line
// re-export of a named export here, and the instructor modules read INSTRUCTOR. No
// imports: every number a step states is recomputed in tests/clusterLessons.test.js
// from the instrument (js/clusterFitWidgets.js over js/clusterFitField.js, the kernel
// js/kernels/clusters/). Every step carries a `sid`, an opaque stable id that
// student progress is keyed by.
//
// Both clusters are synthetic and say so, with their truth one switch away. Only
// what the validation of CLUSTER_FITTING.md passed is presented as a result: the
// ensemble coverage (0.67 and 0.60 against a stated band), recovery on synthetic
// clusters and the metallicity assumption's effect. The legs that failed (NGC 2420
// at the stated metallicity; the edge of the grid) are shown only as limits.
// =============================================================================

const near = (x, target, tolerance) =>
  Number.isFinite(x) && Math.abs(x - target) <= tolerance;

const STAGE = {
  spacing: 150,
  fit: true,
  stars: [
    { role: 'star', name: 'A younger cluster', teffK: 6500, lumSun: 2 },
    { role: 'star', name: 'An older cluster', teffK: 5600, lumSun: 1 },
  ],
};
/** The panel on a cluster, at a metallicity, with or without binaries and the truth. */
const CL = (values = {}) => ({
  id: 'cluster-fit',
  values: { cluster: 0, feh: -0.25, binaries: 0, truth: 0, ...values },
});

export const TWO_CLUSTERS_TWO_AGES = {
  id: 'two-clusters-two-ages',
  thumbnail: 'images/investigations/two-clusters-two-ages.webp',
  title: 'Two Clusters, Two Ages',
  subtitle:
    'Fit an age and a distance to two star clusters, see how far each moves when you change the metallicity you assume, and learn why the difference of two ages is steadier than either',
  duration: '15-35 min',
  level: 'Introductory astronomy',
  audience: 'intro',
  textbook: { chapter: 21, section: null },
  courseLevel: 'majors',
  mathematics: 'algebra',
  prerequisites: ['lives-of-stars'],
  tags: ['stars', 'stellar-evolution'],
  lock: { placement: true, inspector: true },
  depths: ['core', 'quantitative', 'advanced'],
  objectives: [
    'Say which of two clusters is older from where its stars leave the main sequence',
    'Read the age and distance a fit of isochrones gives, with the interval it states',
    'Say that the interval is conditional on the metallicity and the reddening that were assumed, and that changing the metallicity moves the age by many interval widths',
    'Say why the difference between two clusters’ ages, fitted the same way, is steadier than either age',
  ],
  steps: [
    {
      sid: 'two-clusters',
      stage: STAGE,
      type: 'read',
      title: 'Two clusters',
      body: `A star cluster is a few hundred to a million stars born together, so they
             have one age and are all at one distance. The panel shows two clusters,
             <strong>A</strong> and <strong>B</strong>, as their stars&rsquo;
             <strong>color&ndash;magnitude diagrams</strong>: each dot is a star, redder
             to the right, brighter up. The stars lie on a curve, the
             <strong>main sequence</strong>, that ends where stars of one mass have
             used up the hydrogen in their cores: the
             <strong>turnoff</strong>. The older the cluster, the fainter and redder the
             turnoff, because only the lower-mass stars are still on the main sequence.
             \n\nThe clusters are <strong>synthetic</strong>: a model of stars of a known
             age made them, so the answer can be checked. The panel fits an
             <strong>isochrone</strong> (the curve of stars of one age) to the stars and
             reports the age and the distance. It never fits the metallicity: you
             state it, and the panel says so.`,
      tool: CL(),
    },
    {
      sid: 'which-is-older',
      stage: STAGE,
      type: 'predict',
      reveal: 'fit-b',
      title: 'Which cluster is older?',
      body: `Look at the turnoff of cluster A in the panel (where the stars bend off
             the straight main sequence toward the red giants), then choose cluster B
             in the panel and compare.`,
      prompt: 'The older cluster is the one whose turnoff is&hellip;',
      options: [
        'Fainter and redder, because only its lower-mass stars are still on the main sequence',
        'Brighter and bluer, because older stars are hotter',
        'The same: the turnoff does not depend on age',
        'Not measurable from a diagram, only from a spectrum',
      ],
      answer: 0,
      hints: [
        'Massive stars are bright and blue, and they use up their hydrogen fastest. Which stars are left on the main sequence in an old cluster?',
      ],
      because:
        'A star leaves the main sequence when its core hydrogen is gone, and a massive star does that sooner. In an old cluster the massive, bright, blue stars have all left; the turnoff sits at a lower mass, so it is fainter and redder. That is why a color–magnitude diagram reads an age.',
      tool: CL({ cluster: 1 }),
    },
    {
      sid: 'fit-a',
      stage: STAGE,
      type: 'measure',
      title: 'Fit cluster A',
      body: `With cluster A chosen and the assumed metallicity at &minus;0.25 (the
             settings the panel opens with), read the fitted <strong>age</strong> in
             gigayears and the <strong>distance modulus</strong> in magnitudes. The
             orange curve is the best isochrone; the interval is one sigma.`,
      fields: [
        { id: 'a', label: 'Age of cluster A', unit: 'Gyr', hint: '2.02' },
        { id: 'd', label: 'Distance modulus', unit: 'mag', hint: '12.10' },
      ],
      validate: v => {
        if (![v.a, v.d].every(Number.isFinite)) return null;
        if (near(v.a, 2.02, 0.06) && near(v.d, 12.1, 0.03)) {
          return {
            level: 'ok',
            message:
              'About 2.02 Gyr and a distance modulus of 12.10 (2.6 kiloparsecs), with intervals of a few percent of the age and a hundredth of a magnitude. Switch on “Show the truth” to see the age the cluster was drawn with.',
          };
        }
        return {
          level: 'error',
          message:
            'Choose cluster A, [Fe/H] −0.25, no binaries, and read the age and the distance modulus from the readout: about 2.02 Gyr and 12.10.',
        };
      },
      tool: CL(),
    },
    {
      sid: 'fit-b',
      stage: STAGE,
      type: 'measure',
      title: 'Fit cluster B',
      body: `Choose cluster B in the panel, at the same metallicity, and read its age
             and distance modulus.`,
      fields: [
        { id: 'a', label: 'Age of cluster B', unit: 'Gyr', hint: '3.16' },
        { id: 'd', label: 'Distance modulus', unit: 'mag', hint: '12.09' },
      ],
      validate: v => {
        if (![v.a, v.d].every(Number.isFinite)) return null;
        if (near(v.a, 3.16, 0.08) && near(v.d, 12.09, 0.03)) {
          return {
            level: 'ok',
            message:
              'About 3.16 Gyr and 12.09: cluster B is older, with a fainter, redder turnoff, and at the same distance as A to within a hundredth of a magnitude. That is what your prediction said.',
          };
        }
        return {
          level: 'error',
          message:
            'Choose cluster B, [Fe/H] −0.25, no binaries: about 3.16 Gyr and a distance modulus of 12.09.',
        };
      },
      tool: CL({ cluster: 1 }),
    },
    {
      sid: 'how-much-older',
      stage: STAGE,
      type: 'measure',
      title: 'How much older?',
      body: `The two ages came from the same fit with the same assumptions. Subtract
             them.`,
      fields: [
        {
          id: 'd',
          label: 'Age of B minus age of A',
          unit: 'Gyr',
          hint: '1.14',
        },
      ],
      validate: v => {
        if (!Number.isFinite(v.d)) return null;
        if (near(v.d, 1.14, 0.1)) {
          return {
            level: 'ok',
            message:
              'About 1.1 Gyr, 3.16 minus 2.02. Each age has an interval of a few hundredths of a gigayear, so on these assumptions B is older than A by a great many of them.',
          };
        }
        return {
          level: 'error',
          message:
            'Subtract the two ages you read: 3.16 − 2.02 is about 1.14 Gyr.',
        };
      },
      tool: CL(),
    },
    {
      sid: 'what-the-interval-says',
      stage: STAGE,
      type: 'question',
      kind: 'choice',
      title: 'What the interval says',
      body: `The panel gives each age with a one-sigma interval, about &plusmn;0.03 Gyr
             for A. Switch on <em>Show the truth</em> for A: the age it was drawn
             with is 2.00 Gyr, and the interval runs from 2.00 to 2.05.`,
      prompt: 'What does that interval claim?',
      options: [
        'How much the fitted age would scatter if the same kind of cluster were drawn again and fitted the same way, with every assumption true; about two such intervals in three hold the true age',
        'That the cluster’s age is certain to lie inside it',
        'That the metallicity is known to that precision',
        'That the isochrone models are exact',
      ],
      answer: 0,
      misconceptions: [
        {
          id: 'certain',
          option: 1,
          say: 'A one-sigma interval holds the truth about two times in three (0.67 and 0.60 for age and distance over a hundred drawn clusters), and here it just misses: 2.00 against 2.00 to 2.05. That is what one sigma means.',
        },
        {
          id: 'metal',
          option: 2,
          say: 'The metallicity is not in the interval at all: it was set, not fitted. The next steps change it.',
        },
      ],
      hints: [
        'The panel can draw the same cluster again and fit it: it did that a hundred times to check this interval.',
      ],
      because:
        'The interval comes from how the fit statistic rises as the age moves away from its best value, with everything else held fixed and true. On a hundred synthetic clusters with every assumption true it held the true age 67 percent of the time and the true distance 60 percent, inside the band set before the check (56 to 80 percent). It says nothing about assumptions that are wrong.',
      tool: CL({ truth: 1 }),
    },
    {
      sid: 'what-a-fit-gives',
      stage: STAGE,
      type: 'read',
      title: 'What a fit gives',
      body: `A cluster&rsquo;s age and distance, in this panel, are the best values of
             two numbers given everything else you assumed: the
             <strong>metallicity</strong>, the dust reddening, that the stars are single
             and that the model of their brightness errors is right. The interval says
             how well the stars fix the two numbers <em>on those assumptions</em>. An
             age is worth quoting with them.`,
      tool: CL(),
    },
  ],
};

export const TWO_CLUSTERS_TWO_AGES_DEEPER = {
  id: 'two-clusters-two-ages',
  steps: [
    {
      sid: 'change-the-metallicity',
      after: 'what-the-interval-says',
      depth: 'quantitative',
      type: 'measure',
      title: 'Change the metallicity',
      body: `Metals change how a star burns and how its color looks, so the isochrones
             of different metallicities differ. Choose cluster A and set the assumed
             metallicity to <strong>&minus;0.50</strong>, read the age, then to
             <strong>0</strong> (the Sun&rsquo;s) and read it again.`,
      fields: [
        { id: 'p', label: 'Age at [Fe/H] −0.50', unit: 'Gyr', hint: '3.35' },
        { id: 's', label: 'Age at [Fe/H] 0', unit: 'Gyr', hint: '1.47' },
      ],
      validate: v => {
        if (![v.p, v.s].every(Number.isFinite)) return null;
        if (near(v.p, 3.35, 0.1) && near(v.s, 1.47, 0.06)) {
          return {
            level: 'ok',
            message:
              'The same stars give 3.35 Gyr at −0.50, 2.02 at −0.25 and 1.47 at 0: a spread of nearly two gigayears for a range of half a dex of metallicity. The distance moves too, from 11.86 to 12.43.',
          };
        }
        return {
          level: 'error',
          message:
            'Choose cluster A and set the assumed metallicity to −0.50, then 0: about 3.35 and 1.47 Gyr.',
        };
      },
      tool: CL({ feh: -0.5 }),
    },
    {
      sid: 'shift-or-interval',
      after: 'change-the-metallicity',
      depth: 'quantitative',
      type: 'question',
      kind: 'choice',
      title: 'Shift or interval',
      body: `Moving the assumed metallicity by 0.25 dex moved the age of A by 1.3 Gyr
             (older, at &minus;0.50) or 0.55 Gyr (younger, at 0); its interval is about 0.05 Gyr wide.`,
      prompt: 'What should the age of a cluster be quoted with?',
      options: [
        'The interval alone: it is the fit’s uncertainty',
        'The metallicity that was assumed, and the shift a plausible change of it makes, which here is many times the interval',
        'Nothing: the age is the age',
        'A larger interval, made by multiplying the fitted one by ten',
      ],
      answer: 1,
      misconceptions: [
        {
          id: 'interval-alone',
          option: 0,
          say: 'The interval holds the metallicity fixed. A change of 0.25 dex moves the age by ten to twenty-four interval widths, so the interval alone understates how well the age is known.',
        },
        {
          id: 'inflate',
          option: 3,
          say: 'A factor is not a measurement. The honest statement is the assumption and what it does, which the panel lets you see.',
        },
      ],
      hints: ['Compare 1.3 Gyr with 0.05 Gyr.'],
      because:
        'The fit’s interval is conditional on the metallicity, so it cannot include it. The age that comes out is the age at that metallicity, and quoting it with its assumption (and the shift a plausible range of metallicity makes) is what lets a reader weigh it. The panel’s record says what was assumed for this reason.',
      tool: CL({ feh: -0.5 }),
    },
    {
      sid: 'the-difference-holds',
      after: 'shift-or-interval',
      depth: 'quantitative',
      type: 'measure',
      title: 'The difference holds',
      body: `Now cluster B. At [Fe/H] 0 read its age and subtract cluster A&rsquo;s age
             at 0 (1.47 Gyr). At &minus;0.25 the difference was 1.14 Gyr. At
             &minus;0.50 the panel reports B&rsquo;s age as older than the models reach:
             the interval is open.`,
      fields: [
        { id: 'b', label: 'Age of B at [Fe/H] 0', unit: 'Gyr', hint: '2.24' },
        {
          id: 'd',
          label: 'Age of B minus age of A at 0',
          unit: 'Gyr',
          hint: '0.78',
        },
      ],
      validate: v => {
        if (![v.b, v.d].every(Number.isFinite)) return null;
        if (near(v.b, 2.24, 0.07) && near(v.d, 0.78, 0.1)) {
          return {
            level: 'ok',
            message:
              'B is 2.24 Gyr and the difference is 0.78 Gyr at [Fe/H] 0. The order never changed, B older, but the size of the difference did: 1.14 at −0.25 and 0.78 at 0. The difference is steadier than the ages, not exact.',
          };
        }
        return {
          level: 'error',
          message:
            'Choose cluster B and set [Fe/H] to 0: about 2.24 Gyr, and 2.24 − 1.47 is about 0.78.',
        };
      },
      tool: CL({ cluster: 1, feh: 0 }),
    },
    {
      sid: 'which-is-steadier',
      after: 'the-difference-holds',
      depth: 'quantitative',
      type: 'question',
      kind: 'choice',
      title: 'Which is steadier?',
      body: `Across the three metallicities cluster A ran from 1.47 to 3.35 Gyr and B
             from 2.24 to beyond the models. B was older than A every time.`,
      prompt: 'What does that say?',
      options: [
        'That which cluster is older is steadier against the assumed metallicity than how old either is, when both are fitted the same way',
        'That the clusters have no ages',
        'That the metallicity can be read from the difference',
        'That the fit fails whenever the metallicity is changed',
      ],
      answer: 0,
      misconceptions: [
        {
          id: 'noages',
          option: 1,
          say: 'Each cluster has an age. What changes is what a fit can say about it when a number it was not given is wrong.',
        },
        {
          id: 'fits-metal',
          option: 2,
          say: 'The metallicity is never fitted here; fitting it as well was tested (CLUSTER_FOUR_PARAMETER_GATE.md) and its intervals did not cover the truth, so it is not offered.',
        },
      ],
      hints: ['Look at which cluster is older at each of the three settings.'],
      because:
        'An error shared by two fits, such as a wrong metallicity for both, shifts both ages the same way, so their order survives it and part of their difference does too. A statement about which is older, or by how much roughly, is steadier than either age. It is steadier, not safe: a metallicity that differs between the clusters would not cancel.',
      tool: CL({ cluster: 1, feh: 0 }),
    },
    {
      sid: 'add-binaries',
      after: 'which-is-steadier',
      depth: 'advanced',
      type: 'measure',
      title: 'Add binary stars',
      body: `Real clusters hold binary stars, whose two stars add their light and sit
             above the main sequence. The fit&rsquo;s model has <em>no</em> binaries.
             Choose cluster A at [Fe/H] &minus;0.25, set <em>Binary stars</em> to 30
             percent, switch on <em>Show the truth</em>, and read the distance
             modulus the fit gives and how far it is from the true 12.10.`,
      fields: [
        {
          id: 'd',
          label: 'Distance modulus with binaries',
          unit: 'mag',
          hint: '12.04',
        },
        { id: 'e', label: 'True minus fitted', unit: 'mag', hint: '0.06' },
      ],
      validate: v => {
        if (![v.d, v.e].every(Number.isFinite)) return null;
        if (near(v.d, 12.04, 0.02) && near(v.e, 0.06, 0.02)) {
          return {
            level: 'ok',
            message:
              'The fit gives 12.04, 0.06 mag too near, and its interval, 12.04 to 12.05, does not include the true 12.10. The binaries pulled the best isochrone up, and the fit did not warn: with no binaries in the model its interval stays narrow.',
          };
        }
        return {
          level: 'error',
          message:
            'Choose cluster A, [Fe/H] −0.25, binaries 30 percent: the distance modulus reads about 12.04, against 12.10 drawn.',
        };
      },
      tool: CL({ binaries: 1, truth: 1 }),
    },
    {
      sid: 'no-warning',
      after: 'add-binaries',
      depth: 'advanced',
      type: 'question',
      kind: 'choice',
      title: 'No warning',
      body: `With 30 percent binaries the fitted distance was too small by 0.06 mag, about
             seven times the half-width of its interval, and the panel said nothing.`,
      prompt: 'Why did the interval not widen?',
      options: [
        'The interval measures how the statistic rises about its best value under the model, and a model without binaries cannot see that its assumption is wrong',
        'Binaries do not affect a cluster’s fit',
        'The interval widens only above 40 percent binaries',
        'The distance is exact whatever the stars do',
      ],
      answer: 0,
      misconceptions: [
        {
          id: 'no-effect',
          option: 1,
          say: 'They did: 0.06 mag in distance here. Over a hundred clusters with 30 percent binaries the intervals held the true age 29 percent of the time and the true distance 8 percent.',
        },
      ],
      hints: ['What does the interval know about binaries?'],
      because:
        'An interval is a statement within a model. When the stars come from something the model leaves out, the fit gives a number and a narrow interval and nothing warns. The check of this method reports that behavior (coverage of 0.29 for age and 0.08 for distance on clusters with 30 percent binaries) rather than hiding it, and the panel lists “single stars” among its assumptions.',
      tool: CL({ binaries: 1, truth: 1 }),
    },
    {
      sid: 'a-real-cluster',
      after: 'no-warning',
      depth: 'advanced',
      type: 'read',
      title: 'A real cluster, and a limit',
      body: `The Observatory&rsquo;s cluster panel fits the same model to the stars of a
             real cluster, NGC 2420, from SDSS and SEGUE. At the metallicity assumed
             there (&minus;0.25), it gives 2.34 Gyr and a distance modulus of 11.82.
             Published values are 1.7 to 2.2 Gyr and 12.06 to 12.54. The fit
             <strong>does not</strong> agree with them, and this is a stated
             limit of the method, not a measurement of the cluster: a different
             assumed metallicity moves the age and the distance by far more than the
             interval, as you saw. A test of fitting the metallicity too, set before it
             was run, did not give intervals that held the truth, so the panel does not
             offer it.`,
      tool: CL(),
    },
    {
      sid: 'what-an-age-is',
      after: 'a-real-cluster',
      depth: 'advanced',
      type: 'read',
      title: 'What an age is',
      body: `A cluster&rsquo;s age from a fit is a model&rsquo;s reading of a diagram,
             given a metallicity, a reddening and single stars. State the three with it,
             quote the shift a plausible change of them makes, and say that the
             difference of two ages fitted alike is steadier than either age.`,
      tool: CL(),
    },
  ],
};

export const TWO_CLUSTERS_TWO_AGES_ES = {
  title: 'Dos cúmulos, dos edades',
  subtitle:
    'Ajusta una edad y una distancia a dos cúmulos de estrellas, mira cuánto se mueve cada una al cambiar la metalicidad que supones y aprende por qué la diferencia de dos edades es más estable que cada una',
  objectives: [
    'Decir cuál de dos cúmulos es más viejo por dónde sus estrellas dejan la secuencia principal',
    'Leer la edad y la distancia que da un ajuste de isocronas, con el intervalo que declara',
    'Decir que el intervalo depende de la metalicidad y el enrojecimiento supuestos, y que cambiar la metalicidad mueve la edad muchas veces su ancho',
    'Decir por qué la diferencia entre las edades de dos cúmulos, ajustados igual, es más estable que cada edad',
  ],
  steps: [
    {
      title: 'Dos cúmulos',
      body: 'Un cúmulo estelar es de unos cientos a un millón de estrellas nacidas juntas, así que tienen una sola edad y están a una sola distancia. El panel muestra dos cúmulos, <strong>A</strong> y <strong>B</strong>, como los <strong>diagramas color–magnitud</strong> de sus estrellas: cada punto es una estrella, más roja a la derecha, más brillante arriba. Las estrellas están sobre una curva, la <strong>secuencia principal</strong>, que termina donde las estrellas de una masa han gastado el hidrógeno de su núcleo: el <strong>punto de giro</strong>. Cuanto más viejo el cúmulo, más débil y más rojo el punto de giro, porque solo quedan en la secuencia principal las estrellas de menor masa.\n\nLos cúmulos son <strong>sintéticos</strong>: los hizo un modelo de estrellas de una edad conocida, así que la respuesta se puede comprobar. El panel ajusta una <strong>isocrona</strong> (la curva de las estrellas de una edad) a las estrellas y da la edad y la distancia. Nunca ajusta la metalicidad: la indicas tú, y el panel lo dice.',
    },
    {
      title: '¿Cuál cúmulo es más viejo?',
      body: 'Mira el punto de giro del cúmulo A en el panel (donde las estrellas se separan de la secuencia principal recta hacia las gigantes rojas), y luego elige el cúmulo B en el panel y compara.',
      prompt: 'El cúmulo más viejo es aquel cuyo punto de giro es&hellip;',
      options: [
        'Más débil y más rojo, porque solo sus estrellas de menor masa siguen en la secuencia principal',
        'Más brillante y más azul, porque las estrellas viejas son más calientes',
        'El mismo: el punto de giro no depende de la edad',
        'No medible en un diagrama, solo en un espectro',
      ],
      hints: [
        'Las estrellas masivas son brillantes y azules, y gastan antes su hidrógeno. ¿Qué estrellas quedan en la secuencia principal de un cúmulo viejo?',
      ],
      because:
        'Una estrella deja la secuencia principal cuando se acaba el hidrógeno de su núcleo, y una estrella masiva lo hace antes. En un cúmulo viejo las estrellas masivas, brillantes y azules ya se han ido; el punto de giro está en una masa menor, así que es más débil y más rojo. Por eso un diagrama color–magnitud lee una edad.',
    },
    {
      title: 'Ajusta el cúmulo A',
      body: 'Con el cúmulo A elegido y la metalicidad supuesta en −0,25 (los valores con que se abre el panel), lee la <strong>edad</strong> ajustada en gigaaños y el <strong>módulo de distancia</strong> en magnitudes. La curva naranja es la mejor isocrona; el intervalo es de un sigma.',
      fields: [
        { label: 'Edad del cúmulo A' },
        { label: 'Módulo de distancia' },
      ],
    },
    {
      title: 'Ajusta el cúmulo B',
      body: 'Elige el cúmulo B en el panel, con la misma metalicidad, y lee su edad y su módulo de distancia.',
      fields: [
        { label: 'Edad del cúmulo B' },
        { label: 'Módulo de distancia' },
      ],
    },
    {
      title: '¿Cuánto más viejo?',
      body: 'Las dos edades salieron del mismo ajuste con los mismos supuestos. Réstalas.',
      fields: [{ label: 'Edad de B menos edad de A' }],
    },
    {
      title: 'Lo que dice el intervalo',
      body: 'El panel da cada edad con un intervalo de un sigma, de unos ±0,03 Gyr para A. Activa <em>Mostrar la verdad</em> para A: la edad con que se generó es 2,00 Gyr, y el intervalo va de 2,00 a 2,05.',
      prompt: '¿Qué afirma ese intervalo?',
      options: [
        'Cuánto se dispersaría la edad ajustada si se generara otra vez un cúmulo del mismo tipo y se ajustara igual, con todos los supuestos ciertos; unos dos de cada tres intervalos así contienen la edad verdadera',
        'Que la edad del cúmulo está seguro dentro de él',
        'Que la metalicidad se conoce con esa precisión',
        'Que los modelos de isocronas son exactos',
      ],
      misconceptions: [
        {
          say: 'Un intervalo de un sigma contiene la verdad unas dos de cada tres veces (0,67 y 0,60 para la edad y la distancia en cien cúmulos generados), y aquí por poco la pierde: 2,00 frente a 2,00 a 2,05. Eso es lo que significa un sigma.',
        },
        {
          say: 'La metalicidad no está en el intervalo: se fijó, no se ajustó. Los pasos siguientes la cambian.',
        },
      ],
      hints: [
        'El panel puede generar otra vez el mismo cúmulo y ajustarlo: lo hizo cien veces para comprobar este intervalo.',
      ],
      because:
        'El intervalo sale de cómo sube el estadístico del ajuste cuando la edad se aleja de su mejor valor, con todo lo demás fijo y verdadero. En cien cúmulos sintéticos con todos los supuestos ciertos contuvo la edad verdadera el 67 por ciento de las veces y la distancia verdadera el 60 por ciento, dentro de la banda fijada antes de la comprobación (56 a 80 por ciento). No dice nada de supuestos que sean falsos.',
    },
    {
      title: 'Lo que da un ajuste',
      body: 'La edad y la distancia de un cúmulo, en este panel, son los mejores valores de dos números dado todo lo demás que supusiste: la <strong>metalicidad</strong>, el enrojecimiento por polvo, que las estrellas son simples y que el modelo de los errores de su brillo es correcto. El intervalo dice cuán bien fijan las estrellas los dos números <em>con esos supuestos</em>. Una edad merece citarse con ellos.',
    },
  ],
};

export const TWO_CLUSTERS_TWO_AGES_DEEPER_ES = {
  steps: [
    {
      title: 'Cambia la metalicidad',
      body: 'Los metales cambian cómo arde una estrella y cómo se ve su color, así que las isocronas de distintas metalicidades difieren. Elige el cúmulo A y pon la metalicidad supuesta en <strong>−0,50</strong>, lee la edad, y luego en <strong>0</strong> (la del Sol) y léela otra vez.',
      fields: [
        { label: 'Edad con [Fe/H] −0,50' },
        { label: 'Edad con [Fe/H] 0' },
      ],
    },
    {
      title: 'Cambio o intervalo',
      body: 'Mover la metalicidad supuesta 0,25 dex movió la edad de A 1,3 Gyr (más vieja, con −0,50) o 0,55 Gyr (más joven, con 0); su intervalo mide unos 0,05 Gyr de ancho.',
      prompt: '¿Con qué debe citarse la edad de un cúmulo?',
      options: [
        'Solo con el intervalo: es la incertidumbre del ajuste',
        'Con la metalicidad que se supuso y el cambio que produce una variación plausible de ella, que aquí es muchas veces el intervalo',
        'Con nada: la edad es la edad',
        'Con un intervalo mayor, hecho multiplicando por diez el ajustado',
      ],
      misconceptions: [
        {
          say: 'El intervalo mantiene fija la metalicidad. Un cambio de 0,25 dex mueve la edad de diez a veinticuatro anchos de intervalo, así que el intervalo solo subestima cuán bien se conoce la edad.',
        },
        {
          say: 'Un factor no es una medición. La afirmación honesta es el supuesto y lo que hace, que el panel te deja ver.',
        },
      ],
      hints: ['Compara 1,3 Gyr con 0,05 Gyr.'],
      because:
        'El intervalo del ajuste depende de la metalicidad, así que no puede incluirla. La edad que sale es la edad con esa metalicidad, y citarla con su supuesto (y el cambio que produce un intervalo plausible de metalicidad) es lo que permite al lector sopesarla. El registro del panel dice lo supuesto por esto.',
    },
    {
      title: 'La diferencia se mantiene',
      body: 'Ahora el cúmulo B. Con [Fe/H] 0 lee su edad y réstale la del cúmulo A con 0 (1,47 Gyr). Con −0,25 la diferencia fue 1,14 Gyr. Con −0,50 el panel da la edad de B como más vieja de lo que alcanzan los modelos: el intervalo está abierto.',
      fields: [
        { label: 'Edad de B con [Fe/H] 0' },
        { label: 'Edad de B menos edad de A con 0' },
      ],
    },
    {
      title: '¿Cuál es más estable?',
      body: 'En las tres metalicidades el cúmulo A fue de 1,47 a 3,35 Gyr y B de 2,24 a más allá de los modelos. B fue más viejo que A cada vez.',
      prompt: '¿Qué dice eso?',
      options: [
        'Que cuál cúmulo es más viejo es más estable frente a la metalicidad supuesta que cuán viejo es cada uno, cuando ambos se ajustan igual',
        'Que los cúmulos no tienen edad',
        'Que la metalicidad puede leerse de la diferencia',
        'Que el ajuste falla siempre que se cambia la metalicidad',
      ],
      misconceptions: [
        {
          say: 'Cada cúmulo tiene una edad. Lo que cambia es lo que un ajuste puede decir de ella cuando un número que no se le dio es falso.',
        },
        {
          say: 'Aquí la metalicidad nunca se ajusta; se probó ajustarla también (CLUSTER_FOUR_PARAMETER_GATE.md) y sus intervalos no cubrieron la verdad, así que no se ofrece.',
        },
      ],
      hints: ['Mira cuál cúmulo es más viejo en cada uno de los tres valores.'],
      because:
        'Un error compartido por dos ajustes, como una metalicidad falsa para ambos, desplaza ambas edades igual, así que su orden sobrevive y parte de su diferencia también. Una afirmación de cuál es más viejo, o de cuánto aproximadamente, es más estable que cada edad. Es más estable, no segura: una metalicidad distinta entre los cúmulos no se cancelaría.',
    },
    {
      title: 'Añade estrellas binarias',
      body: 'Los cúmulos reales tienen estrellas binarias, cuyas dos estrellas suman su luz y quedan sobre la secuencia principal. El modelo del ajuste <em>no</em> tiene binarias. Elige el cúmulo A con [Fe/H] −0,25, pon <em>Estrellas binarias</em> en 30 por ciento, activa <em>Mostrar la verdad</em> y lee el módulo de distancia que da el ajuste y cuánto dista del 12,10 verdadero.',
      fields: [
        { label: 'Módulo de distancia con binarias' },
        { label: 'Verdadero menos ajustado' },
      ],
    },
    {
      title: 'Sin aviso',
      body: 'Con 30 por ciento de binarias la distancia ajustada fue 0,06 mag demasiado pequeña, unas siete veces la semianchura de su intervalo, y el panel no dijo nada.',
      prompt: '¿Por qué no se ensanchó el intervalo?',
      options: [
        'El intervalo mide cómo sube el estadístico en torno a su mejor valor dentro del modelo, y un modelo sin binarias no puede ver que su supuesto es falso',
        'Las binarias no afectan al ajuste de un cúmulo',
        'El intervalo solo se ensancha por encima de 40 por ciento de binarias',
        'La distancia es exacta hagan lo que hagan las estrellas',
      ],
      misconceptions: [
        {
          say: 'Sí afectan: 0,06 mag en la distancia aquí. En cien cúmulos con 30 por ciento de binarias los intervalos contuvieron la edad verdadera el 29 por ciento de las veces y la distancia verdadera el 8 por ciento.',
        },
      ],
      hints: ['¿Qué sabe el intervalo de las binarias?'],
      because:
        'Un intervalo es una afirmación dentro de un modelo. Cuando las estrellas vienen de algo que el modelo omite, el ajuste da un número y un intervalo estrecho y nada avisa. La comprobación de este método informa de ese comportamiento (cobertura de 0,29 para la edad y 0,08 para la distancia en cúmulos con 30 por ciento de binarias) en lugar de ocultarlo, y el panel lista «estrellas simples» entre sus supuestos.',
    },
    {
      title: 'Un cúmulo real, y un límite',
      body: 'El panel de cúmulos del Observatorio ajusta el mismo modelo a las estrellas de un cúmulo real, NGC 2420, de SDSS y SEGUE. Con la metalicidad supuesta allí (−0,25) da 2,34 Gyr y un módulo de distancia de 11,82. Los valores publicados son 1,7 a 2,2 Gyr y 12,06 a 12,54. El ajuste <strong>no</strong> concuerda con ellos, y esto es un límite declarado del método, no una medición del cúmulo: una metalicidad supuesta distinta mueve la edad y la distancia mucho más que el intervalo, como viste. Una prueba de ajustar también la metalicidad, fijada antes de hacerla, no dio intervalos que contuvieran la verdad, así que el panel no la ofrece.',
    },
    {
      title: 'Qué es una edad',
      body: 'La edad de un cúmulo por un ajuste es la lectura de un modelo de un diagrama, dados una metalicidad, un enrojecimiento y estrellas simples. Declara los tres con ella, cita el cambio que produce una variación plausible de ellos, y di que la diferencia de dos edades ajustadas igual es más estable que cada edad.',
    },
  ],
};

const CONTENT = {
  'two-clusters-two-ages': {
    topic:
      'What a fit of isochrones to a cluster’s color–magnitude diagram gives and what it assumes: the turnoff reads an age (the older cluster’s is fainter and redder); an age and a distance modulus come with one-sigma intervals that hold the truth about two times in three when every assumption is true; the intervals are conditional on the metallicity (never fitted here), the reddening and single stars; a change of 0.25 dex of metallicity moves the age by ten to twenty-four interval widths, while which of two clusters is older, and roughly by how much, is steadier; binaries that the model lacks bias the distance without widening the interval; and the real cluster NGC 2420 falls outside the published range at the stated metallicity, a labeled limit.',
    difficulty:
      'Majors (read an age and a distance from a fit and say what it assumes); the deeper steps add the metallicity shift, the steadier difference and the binary limit',
    placement:
      'After the investigation on the lives of stars, in a course that has met the main sequence and its turnoff. It supports OpenStax Astronomy 2e chapter 21. It needs a ratio and a subtraction at the survey depth.',
    overview:
      'Students predict that the older of two clusters has the fainter, redder turnoff, fit two synthetic clusters of 2.0 and 3.2 Gyr at one distance (2.02 and 3.16 Gyr, distance modulus 12.10 and 12.09), subtract the ages (1.14 Gyr) and read what a one-sigma interval claims; at depth they change the assumed metallicity (2.02 Gyr becomes 3.35 at −0.50 and 1.47 at 0, with the distance modulus moving by 0.56 mag), find the difference steadier than either age (B older every time; 1.14 Gyr at −0.25, 0.78 at 0), see 30 percent binaries bias the distance by 0.06 mag with no warning, and meet NGC 2420 as a stated limit.',
    priorKnowledge: [
      'That the stars of a cluster formed together, so they share an age and a distance',
      'The main sequence and that massive stars leave it first',
      'A magnitude as a logarithmic brightness, and a distance modulus as the magnitude difference that a distance makes',
    ],
    keyConcepts: [
      {
        heading: 'The turnoff reads an age',
        body: 'Massive stars leave the main sequence first, so the older a cluster the fainter and redder its turnoff. An isochrone is the curve of stars of one age, and the fit slides one over the stars.',
      },
      {
        heading: 'An interval is conditional',
        body: 'The one-sigma interval holds the truth about two times in three when every assumption is true (0.67 for age and 0.60 for distance over a hundred synthetic clusters). It says nothing about the metallicity, the reddening or the single-star model, which were assumed.',
      },
      {
        heading: 'Quote an age with its assumptions',
        body: 'A change of 0.25 dex of the assumed metallicity moves the age by ten to twenty-four interval widths. Which of two clusters is older is steadier than either age, because an error both fits share moves both.',
      },
    ],
    features: [
      {
        name: 'The cluster-fit panel (cluster-fit)',
        text: 'A synthetic cluster’s color–magnitude diagram through the plot component with the best isochrone, the fitted age and distance modulus with one-sigma intervals, the age–distance correlation and the list of what was assumed; the metallicity, the presence of binaries and the truth are controls.',
      },
      {
        name: 'Depth',
        text: 'Quantitative: change the metallicity, compare a shift with an interval, find the difference steadier. Advanced: binaries that the model lacks, NGC 2420 as a labeled limit, what an age is.',
      },
      {
        name: 'Synthetic data, stated',
        text: 'Both clusters are drawn from MIST isochrones with a seeded draw; the truth is shown when asked. The method is validated against an independent numpy and emcee implementation and on ensembles (CLUSTER_FITTING.md), and its failed legs are stated there.',
      },
    ],
    misconceptions: [
      {
        claim: 'The interval says how well the age is known.',
        response:
          'It says how well these stars fix the age given the metallicity and reddening that were assumed. A change of the metallicity moves it by far more.',
      },
      {
        claim: 'Older stars are hotter and bluer.',
        response:
          'The older cluster’s turnoff is redder and fainter: the hotter, more massive stars have left the main sequence.',
      },
      {
        claim: 'A fit that gives a narrow interval has no problem.',
        response:
          'With 30 percent binaries the fit is 0.06 mag off and its interval does not widen; nothing in the fit can see an assumption it does not contain.',
      },
      {
        claim: 'The panel agrees with the published age of NGC 2420.',
        response:
          'At the stated metallicity it does not (2.34 Gyr against 1.7 to 2.2). The investigation says so; it is the metallicity assumption showing, not a measurement.',
      },
    ],
    teachingNotes: [
      'The clusters are drawn from MIST v1.2 isochrones: A at log age 9.30 (2.00 Gyr), B at 9.50 (3.16 Gyr), both at distance modulus 12.10, [Fe/H] −0.25, E(g − r) 0.042, 260 stars each with 15 percent from the field; the fit returns 2.02 and 3.16 Gyr.',
      'The method was validated before the investigation: coverage 0.67 and 0.60, recovery within three half-widths over the square root of the ensemble size, and agreement with an independent numpy implementation and emcee (CLUSTER_FITTING.md). Two legs failed and stay failing: NGC 2420 at the stated metallicity and the edge of the grid. The investigation shows only the first, as a limit.',
      'Fitting the metallicity as well was tested in a separate gate (CLUSTER_FOUR_PARAMETER_GATE.md) and the intervals did not cover the truth; the investigation says so and does not offer it.',
      'The one-sigma interval of A just misses the drawn age (2.00 against a lower end of 2.00): that is the third of one-sigma intervals that miss, and a useful moment to discuss what one sigma means.',
    ],
    discussion: [
      'Two clusters are fitted with the same assumed metallicity but one is really more metal-rich. Does the difference of their ages stay steady?',
      'Why would a cluster with many binaries look younger or closer than it is?',
      'The panel’s interval for a real cluster excludes the published age. What would you check first?',
    ],
    extensions: [
      'Fit cluster B at all three metallicities and say at which the panel calls its age open, and why.',
      'Turn binaries on for cluster B and say whether the order of the two ages survives.',
    ],
    modelNotes:
      'js/kernels/clusters/ (the isochrone morph, the forward model, the binned deviance, the profile intervals), js/clusterFitField.js, js/clusterFitWidgets.js, CLUSTER_FITTING.md.',
  },
};

const FLOW = {
  'two-clusters-two-ages': [
    {
      from: 'two-clusters',
      to: 'which-is-older',
      text: 'Two synthetic clusters and the prediction of which is older from its turnoff, before the fit shows it.',
    },
    {
      from: 'fit-a',
      to: 'fit-b',
      text: 'The two fits at one metallicity: 2.02 and 3.16 Gyr at one distance.',
    },
    {
      from: 'how-much-older',
      to: 'how-much-older',
      text: 'The subtraction of the two ages, 1.14 Gyr, and what it will be tested against in the deeper steps.',
    },
    {
      from: 'what-the-interval-says',
      to: 'what-a-fit-gives',
      text: 'What a one-sigma interval claims, and that it is conditional on what was assumed.',
    },
  ],
};

const EXPECTATIONS = {
  'two-clusters-two-ages': {
    'fit-a':
      'The age of cluster A at [Fe/H] −0.25 about 2.02 Gyr (within 0.06) and its distance modulus about 12.10 (within 0.03).',
    'fit-b':
      'The age of cluster B about 3.16 Gyr (within 0.08) and its distance modulus about 12.09 (within 0.03).',
    'how-much-older':
      'The age of cluster B minus the age of cluster A, about 1.14 Gyr (within 0.1).',
  },
};

const BANDS = {
  'two-clusters-two-ages': {
    core: 'medium',
    quantitative: 'long',
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
  'two-clusters-two-ages': TWO_CLUSTERS_TWO_AGES_ES,
};

/** The deeper steps by lesson id (what js/investigations/depth*.js read). */
export const DEPTH = {
  'two-clusters-two-ages': TWO_CLUSTERS_TWO_AGES_DEEPER,
};
export const DEPTH_ES = {
  'two-clusters-two-ages': TWO_CLUSTERS_TWO_AGES_DEEPER_ES,
};

/** The lessons, in catalog order (what js/data/investigations.js spreads). */
export default [TWO_CLUSTERS_TWO_AGES];
