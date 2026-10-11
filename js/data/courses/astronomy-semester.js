// =============================================================================
// Introductory astronomy, one semester, with OpenStax Astronomy 2e
// -----------------------------------------------------------------------------
// A gravitas.course-pack/2 (js/course/pack.js, COURSE_PACKS.md), pinned to the
// investigations as they are now. Roadmap II, Prompt 97. Opened as
// /course/?course=astronomy-semester; tests/coursePack.test.js holds it to the format and
// to a clean audit. Teaching material under CC BY 4.0 like the lessons it
// orders (LICENSES.md); the Spanish has not been reviewed by a native speaker.
// =============================================================================

export const ASTRONOMY_SEMESTER = {
  format: 'gravitas.course-pack',
  formatVersion: 2,
  id: 'astronomy-semester',
  version: '1.0.0',
  gravitas: '1.0.0',
  locales: ['en', 'es'],
  pinning: 'compatible',
  courseLevel: 'survey',
  title: {
    en: 'Introductory astronomy, one semester, with OpenStax Astronomy 2e',
    es: 'Astronomía introductoria de un semestre, con OpenStax Astronomy 2e',
    esOf: 'ff971f2a',
  },
  summary: {
    en: 'Seven units that follow the order of OpenStax Astronomy 2e and give each a hands-on investigation: the sky, gravity and orbits, light, stars, other worlds, compact objects and galaxies. Each unit names the book chapter it goes with, has an optional reading for students who want the background first, and an advanced investigation for those who want more. It supplements a lecture course; it does not replace one.',
    es: 'Siete unidades que siguen el orden de OpenStax Astronomy 2e y dan a cada una una investigación práctica: el cielo, la gravedad y las órbitas, la luz, las estrellas, otros mundos, los objetos compactos y las galaxias. Cada unidad nombra el capítulo del libro con el que va, tiene una lectura opcional para quien quiera primero el contexto y una investigación avanzada para quien quiera más. Complementa un curso de clases; no lo sustituye.',
    esOf: '6d5cbae8',
  },
  audience: {
    en: 'A one-semester college astronomy course for non-majors, or an advanced high-school class. No calculus.',
    es: 'Un curso universitario de astronomía de un semestre para no especialistas, o una clase avanzada de secundaria. Sin cálculo.',
    esOf: '2adc9246',
  },
  teacherGuide: {
    en: "Set about one investigation a week beside the lectures: the core path is roughly eleven to fifteen hours in all, spread over a semester. The chapters are matched from the book's table of contents; check them against the edition you use. Every investigation has instructor notes and an answer key in the instructors' portal. Students need nothing installed, and once Gravitas has been opened it works without a network. The introductory readings are optional background; the advanced items are for extra credit or an honors section.",
    es: 'Asigna una investigación por semana junto a las clases: el camino principal ocupa de once a quince horas en total, repartidas en el semestre. Los capítulos se alinearon con el índice del libro; compruébalos con la edición que uses. Cada investigación tiene notas para el docente y una clave de respuestas en el portal para docentes. Los estudiantes no necesitan instalar nada y, una vez abierto Gravitas, funciona sin red. Las lecturas introductorias son contexto opcional; los elementos avanzados sirven para crédito extra o un grupo de honores.',
    esOf: 'c6e9b353',
  },
  objectives: [
    {
      id: 'sky',
      text: {
        en: "Explain the daily, yearly and monthly motions of the sky as the result of the Earth's and the Moon's motion.",
        es: 'Explicar los movimientos diario, anual y mensual del cielo como resultado del movimiento de la Tierra y de la Luna.',
        esOf: '70ef8aeb',
      },
    },
    {
      id: 'gravity',
      text: {
        en: "Use Kepler's laws and orbital energy to describe how bodies move under gravity.",
        es: 'Usar las leyes de Kepler y la energía orbital para describir cómo se mueven los cuerpos bajo la gravedad.',
        esOf: '10f6673b',
      },
    },
    {
      id: 'light',
      text: {
        en: 'Read temperature, composition and motion from the light of a star.',
        es: 'Leer la temperatura, la composición y el movimiento a partir de la luz de una estrella.',
        esOf: '23581ff5',
      },
    },
    {
      id: 'stars',
      text: {
        en: 'Place stars on the Hertzsprung-Russell diagram and follow how they live and die.',
        es: 'Ubicar las estrellas en el diagrama de Hertzsprung-Russell y seguir cómo viven y mueren.',
        esOf: '1500f2f0',
      },
    },
    {
      id: 'worlds',
      text: {
        en: 'Detect a planet around another star and say what the measurement does and does not show.',
        es: 'Detectar un planeta alrededor de otra estrella y decir qué muestra y qué no muestra la medición.',
        esOf: 'a6085d6f',
      },
    },
    {
      id: 'compact',
      text: {
        en: 'Explain black holes and gravitational waves in terms of gravity and energy.',
        es: 'Explicar los agujeros negros y las ondas gravitacionales con la gravedad y la energía.',
        esOf: 'f7058386',
      },
    },
    {
      id: 'galaxies',
      text: {
        en: 'Use motions and distances to infer the mass of the Galaxy and the expansion of the universe.',
        es: 'Usar movimientos y distancias para inferir la masa de la Galaxia y la expansión del universo.',
        esOf: 'b29cd0f6',
      },
    },
  ],
  prerequisites: [
    {
      text: {
        en: 'Algebra: rearranging a formula, powers and square roots.',
        es: 'Álgebra: despejar una fórmula, potencias y raíces cuadradas.',
        esOf: 'ad2eb79d',
      },
    },
    {
      text: {
        en: 'Reading a value and a slope from a graph.',
        es: 'Leer un valor y una pendiente en una gráfica.',
        esOf: 'cf51db57',
      },
    },
  ],
  units: [
    {
      id: 'sky',
      title: {
        en: 'The sky (chapters 2 and 4)',
        es: 'El cielo (capítulos 2 y 4)',
        esOf: '6405f847',
      },
      items: [
        {
          id: 'read-ch2',
          kind: 'reading',
          path: 'intro',
          minutes: 30,
          objectives: [],
          title: {
            en: 'Astronomy 2e, chapter 2: Observing the Sky',
            es: 'Astronomy 2e, capítulo 2: Observar el cielo (en inglés)',
            esOf: '7421a64c',
          },
          cite: {
            authors:
              'Andrew Fraknoi, David Morrison, Sidney C. Wolff and others',
            year: 2022,
            source: 'OpenStax, Rice University',
            url: 'https://openstax.org/details/books/astronomy-2e',
          },
          license: 'CC BY 4.0',
          access: 'open',
          studentNote: {
            en: 'Optional background for the first investigation.',
            es: 'Contexto opcional para la primera investigación.',
            esOf: '64972e9b',
          },
        },
        {
          id: 'the-turning-sky',
          kind: 'lesson',
          lesson: 'the-turning-sky',
          objectives: ['sky'],
          pin: {
            fp: 'f906a846',
            n: 10,
          },
        },
        {
          id: 'the-sun-through-the-year',
          kind: 'lesson',
          lesson: 'the-sun-through-the-year',
          objectives: ['sky'],
          needs: ['the-turning-sky'],
          pin: {
            fp: '64690989',
            n: 9,
          },
        },
        {
          id: 'phases-and-eclipses',
          kind: 'lesson',
          lesson: 'phases-and-eclipses',
          objectives: ['sky'],
          needs: ['the-sun-through-the-year'],
          pin: {
            fp: 'e9d7b2a9',
            n: 10,
          },
        },
        {
          id: 'wanderers-on-the-sky',
          kind: 'lesson',
          lesson: 'wanderers-on-the-sky',
          objectives: ['sky'],
          needs: ['the-turning-sky'],
          pin: {
            fp: 'b66b6025',
            n: 11,
          },
        },
        {
          id: 'plan-a-night',
          kind: 'lesson',
          path: 'advanced',
          lesson: 'plan-a-night',
          objectives: ['sky'],
          needs: ['the-sun-through-the-year'],
          pin: {
            fp: '8cb9cfd0',
            n: 10,
          },
        },
      ],
    },
    {
      id: 'gravity',
      title: {
        en: 'Gravity and orbits (chapters 3 and 4)',
        es: 'Gravedad y órbitas (capítulos 3 y 4)',
        esOf: '6c75f836',
      },
      items: [
        {
          id: 'read-ch3',
          kind: 'reading',
          path: 'intro',
          minutes: 30,
          objectives: [],
          title: {
            en: 'Astronomy 2e, chapter 3: Orbits and Gravity',
            es: 'Astronomy 2e, capítulo 3: Órbitas y gravedad (en inglés)',
            esOf: '58a3b8aa',
          },
          cite: {
            authors:
              'Andrew Fraknoi, David Morrison, Sidney C. Wolff and others',
            year: 2022,
            source: 'OpenStax, Rice University',
            url: 'https://openstax.org/details/books/astronomy-2e',
          },
          license: 'CC BY 4.0',
          access: 'open',
          studentNote: {
            en: "Read sections 3.1 to 3.3 if Kepler's laws are new.",
            es: 'Lee las secciones 3.1 a 3.3 si las leyes de Kepler son nuevas.',
            esOf: '4018f363',
          },
        },
        {
          id: 'keplers-laws',
          kind: 'lesson',
          lesson: 'keplers-laws',
          objectives: ['gravity'],
          pin: {
            fp: '475986c2',
            n: 23,
          },
        },
        {
          id: 'retrograde-motion',
          kind: 'lesson',
          lesson: 'retrograde-motion',
          objectives: ['sky'],
          needs: ['keplers-laws'],
          teacherNote: {
            en: "Students measure both orbits first, which uses the period and distance ideas from Kepler's Laws.",
            es: 'Los estudiantes miden primero las dos órbitas, lo que usa las ideas de período y distancia de Las leyes de Kepler.',
            esOf: '74113130',
          },
          pin: {
            fp: 'db2663fb',
            n: 33,
          },
        },
        {
          id: 'orbital-energy',
          kind: 'lesson',
          lesson: 'orbital-energy',
          objectives: ['gravity'],
          needs: ['keplers-laws'],
          pin: {
            fp: 'c220ddee',
            n: 24,
          },
        },
        {
          id: 'tides',
          kind: 'lesson',
          lesson: 'tides',
          objectives: ['gravity'],
          pin: {
            fp: 'b5be54c1',
            n: 30,
          },
        },
        {
          id: 'hohmann-transfer',
          kind: 'lesson',
          path: 'advanced',
          lesson: 'hohmann-transfer',
          objectives: ['gravity'],
          needs: ['orbital-energy'],
          pin: {
            fp: '05b69752',
            n: 22,
          },
        },
      ],
    },
    {
      id: 'light',
      title: {
        en: 'Light and spectra (chapter 5)',
        es: 'Luz y espectros (capítulo 5)',
        esOf: '38e66bbb',
      },
      items: [
        {
          id: 'color-and-temperature',
          kind: 'lesson',
          lesson: 'color-and-temperature',
          objectives: ['light'],
          pin: {
            fp: '7be525cf',
            n: 11,
          },
        },
        {
          id: 'lines-and-motion',
          kind: 'lesson',
          lesson: 'lines-and-motion',
          objectives: ['light'],
          needs: ['color-and-temperature'],
          pin: {
            fp: '26286db2',
            n: 11,
          },
        },
        {
          id: 'what-a-spectrum-is-made-of',
          kind: 'lesson',
          lesson: 'what-a-spectrum-is-made-of',
          objectives: ['light'],
          needs: ['lines-and-motion'],
          pin: {
            fp: '0bfb78da',
            n: 10,
          },
        },
        {
          id: 'data-sdss-g',
          kind: 'dataset',
          minutes: 15,
          objectives: ['light'],
          dataset: 'sdss-g',
          needs: ['what-a-spectrum-is-made-of'],
          studentNote: {
            en: 'A real spectrum of a star like the Sun. Find where it is brightest and estimate the temperature.',
            es: 'Un espectro real de una estrella parecida al Sol. Busca dónde es más brillante y estima la temperatura.',
            esOf: 'a412042e',
          },
        },
      ],
    },
    {
      id: 'stars',
      title: {
        en: 'Stars (chapters 17, 18, 22 and 23)',
        es: 'Estrellas (capítulos 17, 18, 22 y 23)',
        esOf: 'ec20b62e',
      },
      items: [
        {
          id: 'a-universe-of-stars',
          kind: 'lesson',
          lesson: 'a-universe-of-stars',
          objectives: ['stars'],
          pin: {
            fp: 'b0b1e010',
            n: 37,
          },
        },
        {
          id: 'weighing-stars',
          kind: 'lesson',
          path: 'advanced',
          lesson: 'weighing-stars',
          objectives: ['stars'],
          pin: {
            fp: '5d378d36',
            n: 36,
          },
        },
        {
          id: 'lives-of-stars',
          kind: 'lesson',
          lesson: 'lives-of-stars',
          objectives: ['stars'],
          pin: {
            fp: '584bfc2b',
            n: 35,
          },
        },
        {
          id: 'inside-a-star',
          kind: 'lesson',
          path: 'advanced',
          lesson: 'inside-a-star',
          objectives: ['stars'],
          needs: ['lives-of-stars'],
          pin: {
            fp: 'be2999dd',
            n: 9,
          },
        },
        {
          id: 'the-limit',
          kind: 'lesson',
          path: 'advanced',
          lesson: 'the-limit',
          objectives: ['stars'],
          needs: ['inside-a-star'],
          pin: {
            fp: 'bc570fde',
            n: 9,
          },
        },
      ],
    },
    {
      id: 'worlds',
      title: {
        en: 'Other worlds (chapters 21 and 30)',
        es: 'Otros mundos (capítulos 21 y 30)',
        esOf: '36e43066',
      },
      items: [
        {
          id: 'transit-photometry',
          kind: 'lesson',
          lesson: 'transit-photometry',
          objectives: ['worlds'],
          teacherNote: {
            en: 'A seventy-minute investigation: set it over two sittings or give the second half as homework.',
            es: 'Una investigación de setenta minutos: asígnenla en dos sesiones o dejen la segunda mitad como trabajo en casa.',
            esOf: '5f8fff4b',
          },
          pin: {
            fp: '8908fdd2',
            n: 29,
          },
        },
        {
          id: 'radial-velocity',
          kind: 'lesson',
          path: 'advanced',
          lesson: 'radial-velocity',
          objectives: ['worlds'],
          needs: ['transit-photometry'],
          pin: {
            fp: '480cbfeb',
            n: 38,
          },
        },
        {
          id: 'goldilocks-question',
          kind: 'lesson',
          lesson: 'goldilocks-question',
          objectives: ['worlds'],
          needs: ['transit-photometry'],
          pin: {
            fp: '93cf260b',
            n: 37,
          },
        },
        {
          id: 'data-tess-light-curve',
          kind: 'dataset',
          minutes: 20,
          objectives: ['worlds'],
          dataset: 'tess-light-curve',
          needs: ['transit-photometry'],
          studentNote: {
            en: 'The same planet, observed by TESS. Find a transit and measure its depth yourself.',
            es: 'El mismo planeta, observado por TESS. Busca un tránsito y mide tú su profundidad.',
            esOf: '4c586d60',
          },
        },
      ],
    },
    {
      id: 'compact',
      title: {
        en: 'Black holes and gravitational waves (chapter 24)',
        es: 'Agujeros negros y ondas gravitacionales (capítulo 24)',
        esOf: 'b1710e63',
      },
      items: [
        {
          id: 'black-holes',
          kind: 'lesson',
          lesson: 'black-holes',
          objectives: ['compact'],
          pin: {
            fp: '18e7a6c0',
            n: 30,
          },
        },
        {
          id: 'what-is-a-gravitational-wave',
          kind: 'lesson',
          lesson: 'what-is-a-gravitational-wave',
          objectives: ['compact'],
          pin: {
            fp: '08918dc6',
            n: 28,
          },
        },
        {
          id: 'listening-to-spacetime',
          kind: 'lesson',
          path: 'advanced',
          lesson: 'listening-to-spacetime',
          objectives: ['compact'],
          needs: ['what-is-a-gravitational-wave'],
          pin: {
            fp: 'a4dd072b',
            n: 32,
          },
        },
      ],
    },
    {
      id: 'galaxies',
      title: {
        en: 'Galaxies and the universe (chapters 25, 26, 28 and 29)',
        es: 'Galaxias y el universo (capítulos 25, 26, 28 y 29)',
        esOf: 'd4619b2e',
      },
      items: [
        {
          id: 'the-suns-motion',
          kind: 'lesson',
          lesson: 'the-suns-motion',
          objectives: ['galaxies'],
          pin: {
            fp: '07937a42',
            n: 10,
          },
        },
        {
          id: 'the-rotating-disk',
          kind: 'lesson',
          lesson: 'the-rotating-disk',
          objectives: ['galaxies'],
          needs: ['the-suns-motion'],
          pin: {
            fp: '7b5244c3',
            n: 12,
          },
        },
        {
          id: 'missing-mass',
          kind: 'lesson',
          lesson: 'missing-mass',
          objectives: ['galaxies'],
          pin: {
            fp: 'af2cdbff',
            n: 33,
          },
        },
        {
          id: 'the-expanding-universe',
          kind: 'lesson',
          lesson: 'the-expanding-universe',
          objectives: ['galaxies'],
          pin: {
            fp: '9c3f4cde',
            n: 9,
          },
        },
        {
          id: 'standard-candles',
          kind: 'lesson',
          path: 'advanced',
          lesson: 'standard-candles',
          objectives: ['galaxies'],
          needs: ['the-expanding-universe'],
          pin: {
            fp: 'a8ab6d5a',
            n: 7,
          },
        },
      ],
    },
  ],
};
