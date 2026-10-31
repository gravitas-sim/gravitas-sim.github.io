// =============================================================================
// What Is It Made Of? and the upper depth of Finding Planets by Their Tug (Prompt 227)
// -----------------------------------------------------------------------------
// One module, the one closure file the prompt adds (D-R10-227-05), carrying the new lesson, its
// Spanish words, the upper-depth steps of the tug lesson, their Spanish words and the instructor
// content. The per-lesson path every loader builds from an id is a one-line re-export of a named
// export here. No imports: every number a step states is recomputed in tests/jointLessons.test.js
// from the instrument (js/jointWidgets.js over js/jointField.js and the joint kernel
// js/inference/jointPlanet.js). Every step carries a `sid`.
//
// The system is synthetic and says so. What the lessons teach: a planet's radius, mass and density
// are only as good as its star's radius and mass, how much of each uncertainty is the star's, what a
// star that does not fit the transit does to the planet, and what a bulk density can and cannot say.
// =============================================================================

const near = (x, target, tolerance) =>
  Number.isFinite(x) && Math.abs(x - target) <= tolerance;

const STAGE = {
  spacing: 150,
  fit: true,
  stars: [{ role: 'star', name: 'A star with a planet', teffK: 5900, lumSun: 1.4 }],
};

/** The joint-fit panel: stellar mass and radius uncertainty by step index (4 is 5 percent, 3 is 3.5, 5 is 8), correlation, stated mass and radius. */
const JOINT = (values = {}) => ({
  id: 'joint-fit',
  values: {
    massPct: 4,
    radiusPct: 3,
    correlation: 0.5,
    starMass: 1.1,
    starRadius: 1.15,
    ...values,
  },
});

/** The mass-radius diagram: the same uncertainty steps, the data-alone box (1 shown) and the constant-density lines (1 shown). */
const MR = (values = {}) => ({
  id: 'mass-radius',
  values: { massPct: 4, radiusPct: 3, alone: 0, lines: 1, ...values },
});

export const WHAT_IS_IT_MADE_OF = {
  id: 'what-is-it-made-of',
  thumbnail: 'images/investigations/what-is-it-made-of.webp',
  title: 'What Is It Made Of?',
  subtitle:
    'A planet’s density is only as good as its star: see how much of the uncertainty is the star’s, and what a density can and cannot say',
  duration: '6-10 min',
  level: 'Introductory astronomy',
  audience: 'intro',
  textbook: { chapter: 21, section: null },
  courseLevel: 'majors',
  mathematics: 'algebra',
  prerequisites: ['radial-velocity'],
  tags: ['exoplanets', 'stars'],
  lock: { placement: true, inspector: true },
  depths: ['core', 'quantitative'],
  objectives: [
    'Say why a planet’s radius, mass and density each depend on the star’s radius and mass, and how',
    'Read how much of each uncertainty is the star’s and how much is the data’s',
    'Say what happens to a planet’s radius and density when the star it is measured around is mis-stated',
    'Say what a bulk density can say about composition and what it cannot',
  ],
  steps: [
    {
      sid: 'a-radius-and-a-mass',
      stage: STAGE,
      type: 'read',
      title: 'A radius and a mass',
      body: `A transit gives the planet&rsquo;s radius <em>as a fraction of the star&rsquo;s</em>. The star&rsquo;s wobble gives
             the planet&rsquo;s mass <em>for a star of the mass you say</em>. Put them together and you have a density, and a density
             says something about what the planet is made of. But the star&rsquo;s radius and mass were not measured here: they are
             stated, with an uncertainty, and the panel carries that uncertainty into every number. This planet is synthetic: a
             light curve of four transits and thirty velocities from two instruments, fitted together.`,
      tool: JOINT(),
    },
    {
      sid: 'bigger-star-prediction',
      stage: STAGE,
      type: 'predict',
      reveal: 'a-bigger-star',
      title: 'If the star is bigger',
      body: `The panel states the star at 1.15 solar radii. Suppose the star is really 13 percent larger, 1.30 solar radii,
             and nothing else changes: the transit and the velocities are the same.`,
      prompt: 'What happens to the planet’s radius and density?',
      options: [
        'Neither changes: the transit measured them',
        'The radius is 13 percent larger and the density falls by nearly a third',
        'The radius is 13 percent larger and the density is unchanged, because mass and volume grow together',
        'The radius is 13 percent smaller',
      ],
      answer: 1,
      hints: [
        'The transit measures the radius ratio. The radius is that ratio times the star’s radius.',
        'The mass comes from the velocities and the star’s mass, not the star’s radius. The density is the mass over the volume, and volume goes as the radius cubed.',
      ],
      because:
        'The radius is the radius ratio times the star’s radius, so a star 13 percent larger gives a planet 13 percent larger. The mass does not depend on the star’s radius, so it stays, in a volume 1.13 cubed or 1.44 times as large, and the density falls to 0.69 of what it was: nearly a third lower.',
      tool: JOINT(),
    },
    {
      sid: 'a-bigger-star',
      stage: STAGE,
      type: 'question',
      kind: 'choice',
      title: 'Try it',
      body: `Set the <strong>stated stellar radius</strong> to 1.30 solar radii and read the planet&rsquo;s radius and density.`,
      prompt: 'What does the panel say the density is now?',
      options: [
        'About 0.36 g/cm³, unchanged',
        'About 0.25 g/cm³: the radius grew to 1.50 Jupiter radii and the density fell by nearly a third',
        'About 0.48 g/cm³, higher, because the star is larger',
        'About 0.12 g/cm³, a third of what it was',
      ],
      answer: 1,
      hints: ['Read the density row, and the radius row above it.'],
      because:
        'The density falls from 0.36 to 0.25 g/cm³ and the radius rises from 1.33 to 1.50 Jupiter radii. The planet did not change; what was said of its star did.',
      misconceptions: [
        {
          id: 'unchanged',
          option: 0,
          say: 'The transit did not change, and neither did the velocities, but what the radius ratio is a ratio of did. The planet’s radius is that ratio times the star’s radius.',
        },
      ],
      tool: JOINT({ starRadius: 1.3 }),
    },
    {
      sid: 'whose-uncertainty',
      stage: STAGE,
      type: 'question',
      kind: 'choice',
      title: 'Whose uncertainty is it?',
      body: `Set the stated stellar radius back to 1.15. Read the mass row: the data alone give a small uncertainty, the star adds
             its own, and the panel says what share of the variance is the star&rsquo;s.`,
      prompt: 'Which part of the mass’s uncertainty is the larger?',
      options: [
        'The data’s: the velocities are the weak link',
        'The star’s: its mass, stated to 5 percent, holds about 87 percent of the variance',
        'They are about equal',
        'The star adds nothing to the mass: only the radius needs the star',
      ],
      answer: 1,
      hints: ['Compare the two numbers in the row: what the data alone give, and what the star adds.'],
      because:
        'The star’s. The data alone fix the mass to about 0.009 Jupiter masses, and a star mass stated to 5 percent adds 0.023, so the star holds about 87 percent of the variance. The mass needs the star’s mass: it is proportional to its two thirds power.',
      misconceptions: [
        {
          id: 'only-radius',
          option: 3,
          say: 'The mass needs the star’s mass: the velocities fix how fast the star moves, and the planet that moves it that fast depends on how heavy the star is.',
        },
      ],
      tool: JOINT(),
    },
    {
      sid: 'where-on-the-diagram',
      stage: STAGE,
      type: 'question',
      kind: 'choice',
      title: 'On the diagram',
      body: `The second panel puts the planet on a diagram of radius against mass, both as logarithms, with the planets of the
             Solar System and lines of constant density.`,
      prompt: 'Which line of constant density is the planet closest to?',
      options: ['0.3 g/cm³', '1 g/cm³', '5.5 g/cm³', '12 g/cm³'],
      answer: 0,
      hints: ['The density row gives the number. Find the nearest line.'],
      because:
        'The planet’s bulk density is 0.36 g/cm³, nearest the 0.3 line, well below Saturn’s. It is light for its size: a big planet of little mass.',
      tool: MR(),
    },
    {
      sid: 'what-the-density-says',
      stage: STAGE,
      type: 'question',
      kind: 'choice',
      title: 'What the density says',
      body: `Read the line <em>What the density says</em>.`,
      prompt: 'What can the bulk density tell you about what the planet is made of?',
      options: [
        'That it is a gas giant of hydrogen and helium: nothing else is this light',
        'That it is volatile-rich, below 1.8 g/cm³; it cannot tell hydrogen and helium from water ice, and other evidence would be needed',
        'That it is rocky',
        'Nothing at all',
      ],
      answer: 1,
      hints: ['The line says what class a density below 1.8 belongs to, and what it cannot tell apart.'],
      because:
        'A density below 1.8 g/cm³ is volatile-rich by convention, and the class cannot tell hydrogen and helium from water ice. A large planet is also less dense than its material would be in a small one, because of its own weight. It says something and not everything.',
      misconceptions: [
        {
          id: 'hydrogen',
          option: 0,
          say: 'Hydrogen and helium are one way to be this light and water ice at a lower pressure is another; a density alone cannot choose. The class is a convention on one number.',
        },
      ],
      tool: MR(),
    },
    {
      sid: 'what-you-can-now-say',
      stage: STAGE,
      type: 'read',
      title: 'What you can now say',
      body: `A planet&rsquo;s radius, mass and density are each measured <em>against its star</em>, and the star&rsquo;s mass and radius are
             stated, not fitted, with an uncertainty that goes into every one of them. The star holds most of the mass&rsquo;s
             uncertainty here and about half the radius&rsquo;s and the density&rsquo;s. A star stated wrongly moves the planet, and the
             transit&rsquo;s own measure of the star&rsquo;s density can say so. A bulk density below 1.8 g/cm&sup3; is volatile-rich,
             which is a hint of what a planet is made of and not the answer.`,
      tool: MR(),
    },
  ],
};

export const WHAT_IS_IT_MADE_OF_DEEPER = {
  id: 'what-is-it-made-of',
  steps: [
    {
      sid: 'the-stars-share-of-density',
      after: 'what-the-density-says',
      depth: 'quantitative',
      type: 'measure',
      title: 'The star’s share of the density',
      body: `Set <strong>both</strong> stellar uncertainties to 8 percent (and the stated star back to 1.10 and 1.15). Read the
             density row: its uncertainty, and the share of its variance that is the star&rsquo;s.`,
      fields: [
        {
          id: 'a',
          label: 'Uncertainty of the density (plus or minus)',
          unit: 'g/cm3',
          hint: '0.088',
        },
        {
          id: 'b',
          label: 'Share of the density’s variance that is the star’s',
          unit: 'percent',
          hint: '82',
        },
      ],
      validate: v => {
        if (![v.a, v.b].every(Number.isFinite)) return null;
        if (near(v.a, 0.088, 0.006) && near(v.b, 82, 3)) {
          return {
            level: 'ok',
            message:
              'With the star stated to 8 percent the density is good to plus or minus 0.088 g/cm³, and the star holds 82 percent of that; with the star taken as exact it would be 0.037, which is what the data alone give and what a fit that leaves the star out would report.',
          };
        }
        return {
          level: 'error',
          message:
            'Set both stellar uncertainties to 8 percent and read the density row: plus or minus 0.088 g/cm³, of which the star holds 82 percent.',
        };
      },
      tool: JOINT({ massPct: 5, radiusPct: 5 }),
    },
    {
      sid: 'a-star-that-does-not-fit',
      after: 'the-stars-share-of-density',
      depth: 'quantitative',
      type: 'measure',
      title: 'A star that does not fit',
      body: `The transit measures the star&rsquo;s density too, from the orbit&rsquo;s period and size. Set the stated stellar radius
             to 1.60 solar radii (back to a 5 percent mass and a 3.5 percent radius). Read how far the stated star&rsquo;s density is
             from the transit&rsquo;s, in sigma, and the planet&rsquo;s density around that star.`,
      fields: [
        { id: 'a', label: 'Disagreement of the stated star with the transit', unit: '', hint: '3.2' },
        { id: 'b', label: 'Density of the planet around that star', unit: 'g/cm3', hint: '0.135' },
      ],
      validate: v => {
        if (![v.a, v.b].every(Number.isFinite)) return null;
        if (near(Math.abs(v.a), 3.2, 0.3) && near(v.b, 0.135, 0.012)) {
          return {
            level: 'ok',
            message:
              'A star of 1.60 solar radii is 3.2 sigma from what the transit says, more than the 3 at which the panel flags it, and the planet around it would be 0.135 g/cm³, a third of what it was. A planet’s density is only as good as that star.',
          };
        }
        return {
          level: 'error',
          message:
            'Set the stated radius to 1.60: the stated star is 3.2 sigma from the transit and the planet’s density around it is 0.135 g/cm³.',
        };
      },
      tool: JOINT({ starRadius: 1.6 }),
    },
  ],
};

export const WHAT_IS_IT_MADE_OF_ES = {
  title: '¿De qué está hecho?',
  subtitle:
    'La densidad de un planeta vale lo que valga su estrella: mira cuánto de la incertidumbre es de la estrella, y qué puede y qué no puede decir una densidad',
  objectives: [
    'Decir por qué el radio, la masa y la densidad de un planeta dependen del radio y la masa de la estrella, y cómo',
    'Leer cuánto de cada incertidumbre es de la estrella y cuánto de los datos',
    'Decir qué le pasa al radio y a la densidad de un planeta cuando se declara mal la estrella alrededor de la cual se mide',
    'Decir qué puede decir una densidad media sobre la composición y qué no',
  ],
  steps: [
    {
      title: 'Un radio y una masa',
      body: `Un tránsito da el radio del planeta <em>como fracción del de la estrella</em>. El bamboleo de la estrella da la masa del planeta
             <em>para una estrella de la masa que digas</em>. Junta ambos y tienes una densidad, y una densidad dice algo de qué está hecho el
             planeta. Pero el radio y la masa de la estrella no se midieron aquí: se declaran, con una incertidumbre, y el panel lleva esa
             incertidumbre a cada número. Este planeta es sintético: una curva de luz de cuatro tránsitos y treinta velocidades de dos
             instrumentos, ajustadas juntas.`,
    },
    {
      title: 'Si la estrella es mayor',
      body: `El panel declara la estrella con 1,15 radios solares. Supón que en realidad es un 13 por ciento mayor, 1,30 radios solares, y
             nada más cambia: el tránsito y las velocidades son los mismos.`,
      prompt: '¿Qué pasa con el radio y la densidad del planeta?',
      options: [
        'Ninguno cambia: lo midió el tránsito',
        'El radio es un 13 por ciento mayor y la densidad baja casi un tercio',
        'El radio es un 13 por ciento mayor y la densidad no cambia, porque masa y volumen crecen juntos',
        'El radio es un 13 por ciento menor',
      ],
      hints: [
        'El tránsito mide el cociente de radios. El radio es ese cociente por el radio de la estrella.',
        'La masa sale de las velocidades y de la masa de la estrella, no de su radio. La densidad es la masa entre el volumen, y el volumen va con el cubo del radio.',
      ],
      because:
        'El radio es el cociente de radios por el radio de la estrella, así que una estrella un 13 por ciento mayor da un planeta un 13 por ciento mayor. La masa no depende del radio de la estrella, así que se queda, en un volumen 1,13 al cubo o 1,44 veces mayor, y la densidad baja a 0,69 de la que era: casi un tercio menos.',
    },
    {
      title: 'Pruébalo',
      body: `Pon el <strong>radio estelar declarado</strong> en 1,30 radios solares y lee el radio y la densidad del planeta.`,
      prompt: '¿Cuánto dice ahora el panel que es la densidad?',
      options: [
        'Unos 0,36 g/cm³, sin cambio',
        'Unos 0,25 g/cm³: el radio creció a 1,50 radios de Júpiter y la densidad bajó casi un tercio',
        'Unos 0,48 g/cm³, más alta, porque la estrella es mayor',
        'Unos 0,12 g/cm³, un tercio de la que era',
      ],
      hints: ['Lee la fila de la densidad, y la del radio, encima.'],
      because:
        'La densidad baja de 0,36 a 0,25 g/cm³ y el radio sube de 1,33 a 1,50 radios de Júpiter. El planeta no cambió; cambió lo que se dijo de su estrella.',
      misconceptions: [
        {
          say: 'El tránsito no cambió, ni las velocidades, pero sí aquello de lo que el cociente de radios es cociente. El radio del planeta es ese cociente por el radio de la estrella.',
        },
      ],
    },
    {
      title: '¿De quién es la incertidumbre?',
      body: `Vuelve a poner el radio estelar declarado en 1,15. Lee la fila de la masa: los datos solos dan una incertidumbre pequeña, la estrella
             añade la suya, y el panel dice qué parte de la varianza es de la estrella.`,
      prompt: '¿Qué parte de la incertidumbre de la masa es mayor?',
      options: [
        'La de los datos: las velocidades son el eslabón débil',
        'La de la estrella: su masa, declarada al 5 por ciento, tiene cerca del 87 por ciento de la varianza',
        'Son casi iguales',
        'La estrella no añade nada a la masa: solo el radio necesita la estrella',
      ],
      hints: ['Compara los dos números de la fila: lo que dan los datos solos y lo que añade la estrella.'],
      because:
        'La de la estrella. Los datos solos fijan la masa en unas 0,009 masas de Júpiter, y una masa estelar declarada al 5 por ciento añade 0,023, así que la estrella tiene cerca del 87 por ciento de la varianza. La masa necesita la masa de la estrella: es proporcional a su potencia dos tercios.',
      misconceptions: [
        {
          say: 'La masa necesita la masa de la estrella: las velocidades fijan lo deprisa que se mueve la estrella, y el planeta que la mueve así de deprisa depende de lo pesada que sea la estrella.',
        },
      ],
    },
    {
      title: 'En el diagrama',
      body: `El segundo panel pone el planeta en un diagrama de radio contra masa, ambos en logaritmos, con los planetas del Sistema Solar y líneas de densidad constante.`,
      prompt: '¿A qué línea de densidad constante está más cerca el planeta?',
      options: ['0,3 g/cm³', '1 g/cm³', '5,5 g/cm³', '12 g/cm³'],
      hints: ['La fila de la densidad da el número. Busca la línea más cercana.'],
      because:
        'La densidad media del planeta es 0,36 g/cm³, la más cercana a la línea de 0,3, muy por debajo de la de Saturno. Es ligero para su tamaño: un planeta grande de poca masa.',
    },
    {
      title: 'Lo que dice la densidad',
      body: `Lee la línea <em>Lo que dice la densidad</em>.`,
      prompt: '¿Qué puede decir la densidad media sobre de qué está hecho el planeta?',
      options: [
        'Que es un gigante gaseoso de hidrógeno y helio: nada más es tan ligero',
        'Que es rico en volátiles, por debajo de 1,8 g/cm³; no distingue hidrógeno y helio del hielo de agua, y haría falta otra evidencia',
        'Que es rocoso',
        'Nada en absoluto',
      ],
      hints: ['La línea dice a qué clase pertenece una densidad por debajo de 1,8, y qué no distingue.'],
      because:
        'Una densidad por debajo de 1,8 g/cm³ es rica en volátiles por convención, y la clase no distingue hidrógeno y helio del hielo de agua. Un planeta grande es además menos denso que su material en uno pequeño, por su propio peso. Dice algo y no todo.',
      misconceptions: [
        {
          say: 'El hidrógeno y el helio son una manera de ser así de ligero y el hielo de agua a menor presión es otra; una densidad sola no puede elegir. La clase es una convención sobre un número.',
        },
      ],
    },
    {
      title: 'Lo que ya puedes decir',
      body: `El radio, la masa y la densidad de un planeta se miden cada uno <em>frente a su estrella</em>, y la masa y el radio de la estrella se
             declaran, no se ajustan, con una incertidumbre que entra en cada uno de ellos. Aquí la estrella tiene la mayor parte de la incertidumbre
             de la masa y cerca de la mitad de la del radio y la de la densidad. Una estrella mal declarada mueve al planeta, y la medida que el
             propio tránsito hace de la densidad de la estrella puede decirlo. Una densidad media por debajo de 1,8 g/cm&sup3; es rica en
             volátiles, que es una pista de qué está hecho un planeta y no la respuesta.`,
    },
  ],
};

export const WHAT_IS_IT_MADE_OF_DEEPER_ES = {
  id: 'what-is-it-made-of',
  steps: [
    {
      title: 'La parte de la estrella en la densidad',
      body: `Pon <strong>ambas</strong> incertidumbres estelares en 8 por ciento (y la estrella declarada otra vez en 1,10 y 1,15). Lee la fila de la
             densidad: su incertidumbre, y la parte de su varianza que es de la estrella.`,
      fields: [
        { label: 'Incertidumbre de la densidad (más o menos)' },
        { label: 'Parte de la varianza de la densidad que es de la estrella' },
      ],
    },
    {
      title: 'Una estrella que no encaja',
      body: `El tránsito mide también la densidad de la estrella, a partir del período y el tamaño de la órbita. Pon el radio estelar declarado en
             1,60 radios solares (con masa al 5 por ciento y radio al 3,5 por ciento). Lee a cuántas sigmas está la densidad de la estrella
             declarada de la del tránsito, y la densidad del planeta alrededor de esa estrella.`,
      fields: [
        { label: 'Desacuerdo de la estrella declarada con el tránsito' },
        { label: 'Densidad del planeta alrededor de esa estrella' },
      ],
    },
  ],
};

// ---- the upper depth of Finding Planets by Their Tug --------------------------------------------

export const RADIAL_VELOCITY_DEEPER = {
  id: 'radial-velocity',
  steps: [
    {
      sid: 'the-star-in-the-density',
      after: 'how-dense-is-it',
      depth: 'advanced',
      type: 'read',
      title: 'The star in the density',
      body: `The 0.33 g/cm³ you just read took the star as given. It was not: the radius is the transit&rsquo;s radius ratio times the
             star&rsquo;s radius, the mass needs the star&rsquo;s mass, and the density needs both. The panel below fits a transit and
             thirty velocities together for a synthetic hot Jupiter of about this size, with one period and one epoch for both, and
             carries the star&rsquo;s stated uncertainty into the planet. Two more things the fit does that your reading did not: it
             lets the orbit be eccentric (the velocities then fix <em>e</em> and the transit&rsquo;s duration moves with it), and it
             lets the velocities scatter more than their error bars say, the <em>jitter</em>.`,
      tool: JOINT(),
    },
    {
      sid: 'whose-share-is-the-mass',
      after: 'the-star-in-the-density',
      depth: 'advanced',
      type: 'question',
      kind: 'choice',
      title: 'The star’s share',
      body: `Read the mass row of the panel: what the data alone give, what the star adds, and the share.`,
      prompt: 'How much of the planet’s mass variance is the star’s?',
      options: [
        'About 10 percent: the star is well known',
        'About half',
        'About 87 percent: the star’s mass, stated to 5 percent, dominates',
        'None: the velocities fix the mass',
      ],
      answer: 2,
      hints: ['The panel prints the share as a percentage in the mass row.'],
      because:
        'About 87 percent. The velocities fix the amplitude to under 2 percent; the mass goes as the star’s mass to the two thirds, and a star mass stated to 5 percent adds more than the data do.',
      tool: JOINT(),
    },
    {
      sid: 'jitter-and-the-model',
      after: 'whose-share-is-the-mass',
      depth: 'advanced',
      type: 'question',
      kind: 'choice',
      title: 'More scatter than the errors say',
      body: `The fit found a jitter of 2.3 m/s against velocity errors of 3.0 m/s, which is small. Suppose it had found 15 m/s.`,
      prompt: 'What would that say?',
      options: [
        'That the instrument is broken',
        'That the velocities scatter far more than their errors say, so one planet on one orbit may not describe them (a second planet, or the star’s own activity) and the mass from the amplitude is less sure than its interval',
        'That the planet is more massive',
        'Nothing: jitter is always present',
      ],
      answer: 1,
      hints: ['The jitter is whatever scatter is left once the one-planet orbit is taken out.'],
      because:
        'The model of one planet explains the velocities only down to that scatter; a large one says something is not in the model, and the panel flags a jitter larger than the errors. The mass is conditional on the one-planet model.',
      tool: JOINT(),
    },
    {
      sid: 'a-star-that-does-not-fit-tug',
      after: 'jitter-and-the-model',
      depth: 'advanced',
      type: 'measure',
      title: 'A star that does not fit',
      body: `The transit measures the star&rsquo;s density from the orbit. Set the stated stellar radius to 1.60 solar radii. Read how far
             the stated star&rsquo;s density is from the transit&rsquo;s, in sigma, and the planet&rsquo;s density around that star.`,
      fields: [
        { id: 'a', label: 'Disagreement of the stated star with the transit', unit: '', hint: '3.2' },
        { id: 'b', label: 'Density of the planet around that star', unit: 'g/cm3', hint: '0.135' },
      ],
      validate: v => {
        if (![v.a, v.b].every(Number.isFinite)) return null;
        if (near(Math.abs(v.a), 3.2, 0.3) && near(v.b, 0.135, 0.012)) {
          return {
            level: 'ok',
            message:
              'A star of 1.60 solar radii is 3.2 sigma from the transit’s, past the 3 at which the panel flags it, and the planet around it would be 0.135 g/cm³. A planet’s density is only as good as that star.',
          };
        }
        return {
          level: 'error',
          message:
            'Set the stated radius to 1.60: the stated star is 3.2 sigma from the transit and the planet’s density around it is 0.135 g/cm³.',
        };
      },
      tool: JOINT({ starRadius: 1.6 }),
    },
  ],
};

export const RADIAL_VELOCITY_DEEPER_ES = {
  id: 'radial-velocity',
  steps: [
    {
      title: 'La estrella en la densidad',
      body: `Los 0,33 g/cm³ que acabas de leer tomaron la estrella como dada. No lo era: el radio es el cociente de radios del tránsito por el radio de la
             estrella, la masa necesita la masa de la estrella, y la densidad necesita ambas. El panel de abajo ajusta juntos un tránsito y treinta
             velocidades de un Júpiter caliente sintético de este tamaño, con un período y una época para ambos, y lleva la incertidumbre declarada
             de la estrella al planeta. Dos cosas más que hace el ajuste y tu lectura no: deja la órbita ser excéntrica (las velocidades fijan entonces
             <em>e</em> y la duración del tránsito se mueve con ella), y deja que las velocidades se dispersen más de lo que dicen sus barras de
             error, la <em>fluctuación</em>.`,
    },
    {
      title: 'La parte de la estrella',
      body: `Lee la fila de la masa del panel: lo que dan los datos solos, lo que añade la estrella y la parte.`,
      prompt: '¿Cuánto de la varianza de la masa del planeta es de la estrella?',
      options: [
        'Cerca del 10 por ciento: la estrella es bien conocida',
        'Cerca de la mitad',
        'Cerca del 87 por ciento: la masa de la estrella, declarada al 5 por ciento, domina',
        'Nada: las velocidades fijan la masa',
      ],
      hints: ['El panel imprime la parte como porcentaje en la fila de la masa.'],
      because:
        'Cerca del 87 por ciento. Las velocidades fijan la amplitud a menos del 2 por ciento; la masa va con la masa de la estrella a la dos tercios, y una masa estelar declarada al 5 por ciento añade más que los datos.',
    },
    {
      title: 'Más dispersión de la que dicen los errores',
      body: `El ajuste encontró una fluctuación de 2,3 m/s frente a errores de 3,0 m/s en las velocidades, que es poco. Supón que hubiera encontrado 15 m/s.`,
      prompt: '¿Qué diría eso?',
      options: [
        'Que el instrumento está roto',
        'Que las velocidades se dispersan mucho más de lo que dicen sus errores, así que un planeta en una órbita puede no describirlas (un segundo planeta, o la actividad de la estrella) y la masa a partir de la amplitud es menos segura que su intervalo',
        'Que el planeta es más masivo',
        'Nada: la fluctuación siempre está presente',
      ],
      hints: ['La fluctuación es la dispersión que queda al quitar la órbita de un planeta.'],
      because:
        'El modelo de un planeta explica las velocidades solo hasta esa dispersión; una grande dice que algo no está en el modelo, y el panel avisa de una fluctuación mayor que los errores. La masa depende del modelo de un planeta.',
    },
    {
      title: 'Una estrella que no encaja',
      body: `El tránsito mide la densidad de la estrella a partir de la órbita. Pon el radio estelar declarado en 1,60 radios solares. Lee a cuántas sigmas
             está la densidad de la estrella declarada de la del tránsito, y la densidad del planeta alrededor de esa estrella.`,
      fields: [
        { label: 'Desacuerdo de la estrella declarada con el tránsito' },
        { label: 'Densidad del planeta alrededor de esa estrella' },
      ],
    },
  ],
};

// ---- instructor content -------------------------------------------------------------------------------

const CONTENT = {
  'what-is-it-made-of': {
    topic:
      'A planet’s radius, mass and density from a transit and velocities fitted together, with the star’s stated mass and radius inside every uncertainty: how much of each uncertainty is the star’s, what a mis-stated star does to the planet, a star whose density disagrees with the transit’s, and what a bulk density can and cannot say about composition.',
    difficulty:
      'Introductory (the radius is a ratio times the star’s radius, the mass needs the star’s mass, the density needs both; the star’s share of the uncertainty; a density below 1.8 g/cm³ is volatile-rich and cannot tell hydrogen and helium from water ice); majors (read the star’s share of the density at 8 percent stated uncertainty, and a star 3.2 sigma from the transit).',
    placement:
      'After Finding Planets by Their Tug, whose last steps combine a transit radius and a velocity mass into a density; before a unit on planetary interiors or on occurrence. It pairs with the upper depth of that lesson, which carries the same panel.',
    overview:
      'Students predict what a bigger star does to the planet’s radius and density, try it in the panel, read whose uncertainty the mass is, place the planet on a diagram of radius against mass with lines of constant density, and learn what a low bulk density can and cannot tell. The quantitative steps read the star’s share of the density and a stated star that does not fit the transit.',
    priorKnowledge: [
      'A transit gives a radius ratio and a radial velocity amplitude gives a mass for a stated star (Finding Planets by Their Tug)',
      'That density is mass over volume and volume goes as the cube of the radius',
      'What an uncertainty is, and that independent ones add as squares',
    ],
    keyConcepts: [
      {
        heading: 'A planet is measured against its star',
        body: 'The radius is the radius ratio times the star’s radius; the mass is fixed by the velocity amplitude and the star’s mass, to the two thirds power; the density needs both. A star stated wrongly moves the planet.',
      },
      {
        heading: 'The star’s share of an uncertainty',
        body: 'With the star’s mass stated to 5 percent and its radius to 3.5 percent the star holds about 87 percent of the mass variance, 52 percent of the radius variance and 46 percent of the density variance of the synthetic planet; a fit that leaves the star out reports an interval that is too narrow, and the ensemble in the panel says by how much.',
      },
      {
        heading: 'A density is a hint, not a composition',
        body: 'Below 1.8 g/cm³ is volatile-rich by convention; hydrogen and helium cannot be told from water ice by density, and a large planet is less dense than its material would be in a small one. No composition curve is drawn: none was supplied.',
      },
    ],
    features: [
      {
        name: 'Held prediction',
        text: 'The first prediction is held: the panel shows nothing that answers it until the step that settles it, so the student commits to a direction first.',
      },
      {
        name: 'The joint-fit and mass-radius panels (joint-fit, mass-radius)',
        text: 'A stored joint fit of a synthetic hot Jupiter (a light curve of four transits, thirty velocities from two instruments, one period and one epoch) with the star’s mass and radius as stated inputs, their uncertainty and correlation, the planet’s mass, radius and density with the fit’s and the star’s parts and the share, the star’s density from the transit against the stated star, and the radius–mass diagram through the plot component.',
      },
      {
        name: 'Depth',
        text: 'Quantitative: read the density’s uncertainty and the star’s share at 8 percent, and a stated star 3.2 sigma from the transit.',
      },
    ],
    misconceptions: [
      {
        claim: 'A fit that includes the star’s uncertainty has made the planet’s mass better known.',
        response:
          'Including it makes the interval honest, not smaller: the star’s share of the mass variance is about 87 percent, and no more data of the planet’s own can reduce it.',
      },
      {
        claim: 'The transit measures the planet’s radius, so the star does not matter.',
        response:
          'The transit measures a ratio. The radius is that ratio times the star’s radius, so a star 13 percent larger makes the planet 13 percent larger and a third less dense.',
      },
      {
        claim: 'The velocities give the planet’s mass directly.',
        response:
          'They give how fast the star moves. The planet that moves it so depends on how heavy the star is, as the two thirds power of its mass.',
      },
      {
        claim: 'A low density means hydrogen and helium.',
        response:
          'Water ice at low pressure is also light, and a density alone cannot choose; the class is a convention.',
      },
    ],
    teachingNotes: [
      'Ask for the prediction in the student’s own words before the panel is touched; the held answer is revealed at the step that tests it, and a wrong prediction is the lesson.',
      'The system is synthetic: the oracle’s data (tools/joint-inference-oracle/oracle.py) for a planet of 0.7 Jupiter masses and a radius ratio of 0.12 around a 1.10 solar-mass, 1.15 solar-radius star, fitted with the joint model; the panel does not refit, it re-derives the planet from the stored covariance and the star that is stated.',
      'The star’s mass and radius are inputs with a stated uncertainty, correlation and source, never fitted; a planet quantity is not reported when the star’s uncertainty it needs was not stated (JOINT_INFERENCE.md).',
      'The ensemble the panel quotes (a hundred systems whose stars were drawn from their stated uncertainty) is the validation leg C of tests/fixtures/joint-inference; the stated bound was crossed or held as that file says, and failed legs stay labelled.',
    ],
    discussion: [
      'A catalog star changes its radius in a later release. Which of this planet’s published numbers must change, and which need not?',
      'If a catalog gave the star’s radius to 1 percent and its mass to 10 percent, which of the planet’s quantities would be sharpest?',
      'The transit measures the star’s density. What would it mean if the stated star’s density were far from it?',
    ],
    extensions: [
      'Raise the correlation between the star’s mass and radius from 0 to 0.5 and say which of the planet’s three uncertainties moves, and why the other two cannot.',
      'Set the stellar uncertainties to 0 and say what the panel’s numbers are then, and why the fit does not report them.',
    ],
    assessment:
      'Core: the prediction and the three choices (a bigger star lowers the density by nearly a third; the star holds about 87 percent of the mass variance; the nearest line is 0.3 g/cm³; a low density cannot tell hydrogen and helium from water ice). Quantitative: the density’s uncertainty at 8 percent (0.088 within 0.006) and the star’s share (82 percent within 3), and the 1.60-radius star (3.2 sigma within 0.3, 0.135 g/cm³ within 0.012).',
    modelNotes:
      'js/inference/jointPlanet.js, js/inference/jointModel.js, js/jointField.js, js/jointWidgets.js, JOINT_INFERENCE.md. The thresholds are tests/fixtures/joint-inference/thresholds.json, committed before the model; the oracle is tools/joint-inference-oracle/oracle.py (numpy, scipy, batman).',
  },
};

const FLOW = {
  'what-is-it-made-of': [
    {
      from: 'a-radius-and-a-mass',
      to: 'bigger-star-prediction',
      text: 'A radius and a mass both depend on the star, and the prediction of what a star stated 13 percent too large does to the planet.',
    },
    {
      from: 'a-bigger-star',
      to: 'a-bigger-star',
      text: 'The test in the panel: the planet is 13 percent larger and nearly a third less dense, and nothing about the data changed.',
    },
    {
      from: 'whose-uncertainty',
      to: 'where-on-the-diagram',
      text: 'The star holds most of the mass’s uncertainty, and the planet’s point on the radius–mass diagram sits near the 0.3 g/cm³ line.',
    },
    {
      from: 'what-the-density-says',
      to: 'what-you-can-now-say',
      text: 'A density below 1.8 g/cm³ cannot tell hydrogen and helium from water ice, and the summary of what the joint fit can and cannot say.',
    },
  ],
};

const EXPECTATIONS = {
  'what-is-it-made-of': {
    'a-bigger-star':
      'With the stated radius at 1.30 solar radii the planet’s radius reads about 1.50 Jupiter radii and its density about 0.25 g/cm³, down from 0.36.',
    'whose-uncertainty':
      'The star holds about 87 percent of the mass variance (the data alone give plus or minus 0.009 Jupiter masses, the star adds 0.023).',
  },
};

const BANDS = {
  'what-is-it-made-of': { core: 'short', quantitative: 'short' },
};

/** The guides, flows, expectations and time bands of the lesson above. */
export const INSTRUCTOR = {
  content: CONTENT,
  flow: FLOW,
  expectations: EXPECTATIONS,
  bands: BANDS,
};

/** The Spanish shadows by lesson id (what instructorLocale.js spreads). */
export const SHADOWS = { 'what-is-it-made-of': WHAT_IS_IT_MADE_OF_ES };

/** The deeper steps by lesson id (what js/investigations/depth*.js read). */
export const DEPTH = {
  'what-is-it-made-of': WHAT_IS_IT_MADE_OF_DEEPER,
  'radial-velocity': RADIAL_VELOCITY_DEEPER,
};
export const DEPTH_ES = {
  'what-is-it-made-of': WHAT_IS_IT_MADE_OF_DEEPER_ES,
  'radial-velocity': RADIAL_VELOCITY_DEEPER_ES,
};

/** The lessons, in catalog order (what js/data/investigations.js spreads). */
export default [WHAT_IS_IT_MADE_OF];
