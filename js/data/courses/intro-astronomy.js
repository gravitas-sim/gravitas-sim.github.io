// =============================================================================
// Introductory astronomy: the course pack the builder was proved on
// -----------------------------------------------------------------------------
// A gravitas.course-pack/2 (js/course/pack.js, COURSE_PACKS.md) made from
// lessons, a scenario, two built-in observations, an assignment cut from a
// lesson and an open textbook chapter, in English and Spanish, pinned to the
// lessons as they were when it was made. The course home opens it as
// /course/?course=intro-astronomy, and the builder opens it as its example.
// tests/coursePack.test.js holds it to the format and to a clean audit.
//
// Data, written by the course-pack builder and formatted; teaching material
// under CC BY 4.0 like the lessons it orders (LICENSES.md).
// =============================================================================

export const INTRO_ASTRONOMY = {
  format: 'gravitas.course-pack',
  formatVersion: 2,
  id: 'intro-astronomy',
  version: '1.0.0',
  gravitas: '1.0.0',
  locales: ['en', 'es'],
  pinning: 'compatible',
  title: {
    en: 'Introductory astronomy: gravity, starlight and other worlds',
    es: 'Astronomía introductoria: gravedad, luz de las estrellas y otros mundos',
    esOf: '95334307',
  },
  summary: {
    en: "Four units for a first course in astronomy, built from Gravitas lessons that are already published. Students watch the sky move and explain it, find what decides whether an orbit comes back, read a star's temperature and size from its light, and measure a real planet around another star. Each unit has an optional reading or model for students who want the background first, and an advanced lesson for students who want more.",
    es: 'Cuatro unidades para un primer curso de astronomía, hechas con lecciones de Gravitas ya publicadas. Los estudiantes ven moverse el cielo y lo explican, descubren qué decide si una órbita vuelve, leen en la luz de una estrella su temperatura y su tamaño, y miden un planeta real alrededor de otra estrella. Cada unidad tiene una lectura o un modelo opcional para quien quiera primero el contexto, y una lección avanzada para quien quiera más.',
    esOf: '13675e13',
  },
  audience: {
    en: 'A first college course in astronomy, or an advanced high-school class. No calculus.',
    es: 'Un primer curso universitario de astronomía, o una clase avanzada de secundaria. Sin cálculo.',
    esOf: '59954bdf',
  },
  teacherGuide: {
    en: "Run the units in order: each one uses a result from the one before. The core path fits five or six fifty-minute class meetings, with some of the work at home. Every lesson has an instructor guide and an answer key in the instructors' portal; the assignment's steps are covered by the guide to Finding Planets by Their Shadows. Students need nothing installed: every link opens in a browser, and once a student has opened Gravitas it works without a network.",
    es: 'Hagan las unidades en orden: cada una usa un resultado de la anterior. El camino principal ocupa cinco o seis clases de cincuenta minutos, con parte del trabajo en casa. Cada lección tiene una guía para el profesor y una clave de respuestas en el portal para docentes; los pasos de la tarea están cubiertos por la guía de Encontrar planetas por sus sombras. Los estudiantes no necesitan instalar nada: cada enlace se abre en un navegador y, una vez abierto Gravitas, funciona sin red.',
    esOf: '6044bc09',
  },
  objectives: [
    {
      id: 'orbits',
      text: {
        en: "Describe the orbits of the planets with Kepler's three laws, and explain them with gravity.",
        es: 'Describir las órbitas de los planetas con las tres leyes de Kepler y explicarlas con la gravedad.',
        esOf: '1b609aad',
      },
    },
    {
      id: 'frames',
      text: {
        en: 'Explain an apparent motion in the sky, such as retrograde motion, as the result of where it is seen from.',
        es: 'Explicar un movimiento aparente en el cielo, como el movimiento retrógrado, como resultado del lugar desde donde se ve.',
        esOf: '97f82dff',
      },
    },
    {
      id: 'energy',
      text: {
        en: 'Decide from its energy whether an orbiting body is bound or will escape.',
        es: 'Decidir por su energía si un cuerpo en órbita está ligado o escapará.',
        esOf: '74f93563',
      },
    },
    {
      id: 'starlight',
      text: {
        en: "Read a star's temperature, luminosity and size from its light.",
        es: 'Leer en la luz de una estrella su temperatura, su luminosidad y su tamaño.',
        esOf: '13463c7f',
      },
    },
    {
      id: 'exoplanets',
      text: {
        en: "Measure a planet's size from the dip in its star's light as it transits.",
        es: 'Medir el tamaño de un planeta por la caída de la luz de su estrella cuando transita.',
        esOf: '653bf067',
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
      id: 'motions-in-the-sky',
      title: {
        en: 'Motions in the sky',
        es: 'Movimientos en el cielo',
        esOf: '82023efd',
      },
      summary: {
        en: 'What the planets do, seen from outside and seen from Earth.',
        es: 'Lo que hacen los planetas, vistos desde fuera y vistos desde la Tierra.',
        esOf: '14d7cf94',
      },
      items: [
        {
          id: 'reading-orbits-and-gravity',
          kind: 'reading',
          path: 'intro',
          minutes: 30,
          objectives: ['orbits'],
          title: {
            en: 'Astronomy 2e, chapter 3: Orbits and Gravity',
            es: 'Astronomy 2e, capítulo 3: órbitas y gravedad (en inglés)',
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
            en: "Read sections 3.1 to 3.3 before the first lesson if Kepler's laws are new to you.",
            es: 'Lee las secciones 3.1 a 3.3 antes de la primera lección si las leyes de Kepler son nuevas para ti.',
            esOf: 'da1e9b35',
          },
        },
        {
          id: 'watch-the-solar-system',
          kind: 'scenario',
          minutes: 10,
          objectives: ['orbits'],
          scenario: 'solar-system',
          seed: 'sky-1',
          title: {
            en: 'The Solar System, to explore',
            es: 'El sistema solar, para explorar',
            esOf: '1b16920c',
          },
          studentNote: {
            en: "Speed time up until the outer planets move. Which planets go round fastest? Keep your answer for Kepler's Laws.",
            es: 'Acelera el tiempo hasta que se muevan los planetas exteriores. ¿Qué planetas giran más rápido? Guarda tu respuesta para Las leyes de Kepler.',
            esOf: 'baf4a11c',
          },
          teacherNote: {
            en: 'Ten minutes at the start of the first meeting. The question has no wrong answer yet; the lesson that follows makes it quantitative.',
            es: 'Diez minutos al principio de la primera clase. La pregunta todavía no tiene respuesta incorrecta; la lección siguiente la vuelve cuantitativa.',
            esOf: 'cd17a997',
          },
        },
        {
          id: 'keplers-laws',
          kind: 'lesson',
          lesson: 'keplers-laws',
          objectives: ['orbits'],
          needs: ['watch-the-solar-system'],
          pin: {
            fp: '475986c2',
            n: 23,
          },
        },
        {
          id: 'retrograde-motion',
          kind: 'lesson',
          lesson: 'retrograde-motion',
          objectives: ['frames'],
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
      ],
    },
    {
      id: 'gravity-and-energy',
      title: {
        en: 'Gravity and energy',
        es: 'Gravedad y energía',
        esOf: 'cb8f1d0c',
      },
      items: [
        {
          id: 'orbital-energy',
          kind: 'lesson',
          lesson: 'orbital-energy',
          objectives: ['energy'],
          needs: ['keplers-laws'],
          pin: {
            fp: 'c220ddee',
            n: 24,
          },
        },
        {
          id: 'hohmann-transfer',
          kind: 'lesson',
          path: 'advanced',
          lesson: 'hohmann-transfer',
          objectives: ['energy'],
          needs: ['orbital-energy'],
          studentNote: {
            en: 'For students who want to use orbital energy to plan a trip to Mars.',
            es: 'Para quien quiera usar la energía orbital para planear un viaje a Marte.',
            esOf: 'd42c2e51',
          },
          pin: {
            fp: '05b69752',
            n: 22,
          },
        },
      ],
    },
    {
      id: 'starlight',
      title: {
        en: 'What starlight tells us',
        es: 'Lo que nos dice la luz de las estrellas',
        esOf: '0f2d31e1',
      },
      items: [
        {
          id: 'a-universe-of-stars',
          kind: 'lesson',
          lesson: 'a-universe-of-stars',
          objectives: ['starlight'],
          pin: {
            fp: 'b0b1e010',
            n: 37,
          },
        },
        {
          id: 'a-real-spectrum',
          kind: 'dataset',
          minutes: 15,
          objectives: ['starlight'],
          dataset: 'sdss-g',
          needs: ['a-universe-of-stars'],
          studentNote: {
            en: "A real spectrum of a star like the Sun, from the Sloan Digital Sky Survey. Find the wavelength where it is brightest and estimate the star's temperature from it.",
            es: 'Un espectro real de una estrella parecida al Sol, del Sloan Digital Sky Survey. Busca la longitud de onda donde es más brillante y estima con ella la temperatura de la estrella.',
            esOf: 'd4cfb16c',
          },
        },
        {
          id: 'lives-of-stars',
          kind: 'lesson',
          path: 'advanced',
          lesson: 'lives-of-stars',
          objectives: ['starlight'],
          needs: ['a-universe-of-stars'],
          pin: {
            fp: '584bfc2b',
            n: 35,
          },
        },
      ],
    },
    {
      id: 'other-worlds',
      title: {
        en: 'Other worlds',
        es: 'Otros mundos',
        esOf: '510690ba',
      },
      items: [
        {
          id: 'a-first-transit',
          kind: 'assignment',
          lesson: 'transit-photometry',
          objectives: ['exoplanets'],
          steps: [
            'a-firefly-beside-a-lighthouse',
            'what-will-the-brightness-do',
            'your-first-transit',
            'where-the-depth-comes-from',
            'from-a-depth-to-a',
            'measure-the-dip',
          ],
          title: {
            en: 'A first transit',
            es: 'Un primer tránsito',
            esOf: 'd1f6f34d',
          },
          intro: {
            en: "Six steps from Finding Planets by Their Shadows: predict what a planet does to its star's light, watch it happen, and turn the dip into the size of HD 209458 b.",
            es: 'Seis pasos de Encontrar planetas por sus sombras: predice qué le hace un planeta a la luz de su estrella, míralo ocurrir y convierte la caída en el tamaño de HD 209458 b.',
            esOf: '4e151d2b',
          },
          teacherNote: {
            en: 'A thirty-minute cut of a seventy-minute lesson. The whole lesson goes on to limb darkening, the period and a blended binary; set it instead for a longer class.',
            es: 'Un recorte de treinta minutos de una lección de setenta. La lección completa sigue con el oscurecimiento del limbo, el período y una binaria mezclada; asígnenla completa en una clase más larga.',
            esOf: 'd73f6d41',
          },
          minutes: 30,
          assignment: {
            id: '26092880a331a0',
            created: '2026-09-28',
          },
          pin: {
            fp: '8908fdd2',
            n: 29,
            f: [
              'fde58902',
              '6fe103a3',
              '5fd14104',
              '2402c515',
              'e111c463',
              'e1abf441',
            ],
          },
        },
        {
          id: 'a-real-light-curve',
          kind: 'dataset',
          minutes: 20,
          objectives: ['exoplanets'],
          dataset: 'tess-light-curve',
          needs: ['a-first-transit'],
          studentNote: {
            en: 'The same planet, observed by TESS in 2022. Find a transit in the data and measure its depth yourself.',
            es: 'El mismo planeta, observado por TESS en 2022. Busca un tránsito en los datos y mide tú su profundidad.',
            esOf: '721b3baf',
          },
        },
        {
          id: 'goldilocks-question',
          kind: 'lesson',
          path: 'advanced',
          lesson: 'goldilocks-question',
          objectives: ['exoplanets'],
          needs: ['a-first-transit'],
          pin: {
            fp: '93cf260b',
            n: 37,
          },
        },
      ],
    },
  ],
};
