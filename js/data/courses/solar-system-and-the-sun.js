import { ID_COURSE_PACK } from '../../names.js';
// =============================================================================
// The Solar System and the Sun: a survey-course package (Prompt 206)
// -----------------------------------------------------------------------------
// A gravitas.course-pack/2 (js/course/pack.js, COURSE_PACKS.md), pinned to the
// investigations as they are now: the planetary unit of a first astronomy
// course, OpenStax Astronomy 2e chapters 7 to 16, with the topics Gravitas has
// no investigation for yet listed as readings with the reason (D-R10-206-01).
// Opened as /course/?course=solar-system-and-the-sun. Teaching material under
// CC BY 4.0 like the lessons it orders (LICENSES.md); the Spanish has not been
// read by a fluent speaker.
// =============================================================================

export const SOLAR_SYSTEM_AND_THE_SUN = {
  format: ID_COURSE_PACK,
  formatVersion: 2,
  id: 'solar-system-and-the-sun',
  version: '1.0.0',
  gravitas: '1.0.0',
  locales: ['en', 'es'],
  pinning: 'compatible',
  courseLevel: 'survey',
  title: {
    en: 'The Solar System and the Sun',
    es: 'El sistema solar y el Sol',
    esOf: '6dfa7bee',
  },
  summary: {
    en: 'Five units for the part of a first astronomy course on the planets, moons, small bodies and the Sun, with the OpenStax Astronomy 2e chapters they follow (7 to 16). Each unit has a reading and short investigations; the longer majors and upper depths are marked advanced. The last unit lists, with the reason, what Gravitas has no investigation for yet.',
    es: 'Cinco unidades para la parte de un primer curso de astronomía dedicada a los planetas, las lunas, los cuerpos pequeños y el Sol, con los capítulos de OpenStax Astronomy 2e que siguen (7 a 16). Cada unidad tiene una lectura e investigaciones cortas; las más largas, de especialidad y de nivel superior, se marcan como avanzadas. La última unidad enumera, con el motivo, aquello para lo que Gravitas aún no tiene investigación.',
    esOf: '00a4d919',
  },
  audience: {
    en: 'A first college course in astronomy for non-majors, or an advanced high-school class. No calculus.',
    es: 'Un primer curso universitario de astronomía para no especialistas, o una clase avanzada de secundaria. Sin cálculo.',
    esOf: 'e0678904',
  },
  teacherGuide: {
    en: 'Run the units in order, beside the chapters. The core path is a few hours in all, over three or four weeks; every investigation has an instructor guide and key. The chapters were matched from the table of contents of the edition cited: check them against the edition you teach from. The investigations about comets and the scale of the Solar System use the sandbox, whose comets are model comets with orbits of their own; the moons investigation uses synthetic frames made from the real positions of the moons.',
    es: 'Haz las unidades en orden, junto a los capítulos. El camino principal son unas horas en total, a lo largo de tres o cuatro semanas; cada investigación tiene guía y clave para el profesorado. Los capítulos se asociaron a partir del índice de la edición citada: compruébalos con la edición que uses. Las investigaciones sobre los cometas y la escala del sistema solar usan el sandbox, cuyos cometas son cometas modelo con órbitas propias; la de las lunas usa imágenes sintéticas hechas con las posiciones reales de las lunas.',
    esOf: 'b7e68fb9',
  },
  objectives: [
    {
      id: 'scale',
      text: {
        en: 'Say how far the planets are in astronomical units and in light time, and why a diagram on one page is not to scale.',
        es: 'Decir a qué distancia están los planetas en unidades astronómicas y en tiempo de la luz, y por qué un diagrama de una página no está a escala.',
        esOf: '89ffe4f5',
      },
    },
    {
      id: 'worlds',
      text: {
        en: 'Explain what sunlight alone gives a planet, what a greenhouse adds, and how craters rank surfaces by age.',
        es: 'Explicar qué da la luz del Sol a un planeta solo, qué añade un efecto invernadero y cómo los cráteres ordenan las superficies por edad.',
        esOf: '49010c8b',
      },
    },
    {
      id: 'moons',
      text: {
        en: 'Say what makes a ring, a tide and a resonance among moons, and what a near-miss of a ratio can and cannot prove.',
        es: 'Decir qué hace un anillo, una marea y una resonancia entre lunas, y qué puede y qué no puede probar un casi cociente.',
        esOf: '305767a1',
      },
    },
    {
      id: 'small',
      text: {
        en: 'Read the orbit and the heat of a comet, the gaps in the asteroid belt and the rotation of an asteroid, with the limits of each.',
        es: 'Leer la órbita y el calor de un cometa, los huecos del cinturón de asteroides y la rotación de un asteroide, con los límites de cada uno.',
        esOf: 'b52a39ec',
      },
    },
    {
      id: 'sun',
      text: {
        en: 'Measure the Sun’s rotation and its power, with the limits of each.',
        es: 'Medir la rotación del Sol y su potencia, con los límites de cada una.',
        esOf: '99f45a85',
      },
    },
  ],
  prerequisites: [
    {
      text: {
        en: 'Arithmetic with ratios and powers of ten; reading a value from a readout.',
        es: 'Aritmética con cocientes y potencias de diez; leer un valor de una lectura.',
        esOf: 'fa2decfc',
      },
    },
  ],
  units: [
    {
      id: 'scale',
      title: {
        en: 'How big is the Solar System? (chapter 7)',
        es: '¿Qué tamaño tiene el sistema solar? (capítulo 7)',
        esOf: '40d3b22a',
      },
      summary: {
        en: 'True distances, the time light takes, and a scale model.',
        es: 'Distancias verdaderas, el tiempo que tarda la luz y una maqueta.',
        esOf: '5f379fd0',
      },
      items: [
        {
          id: 'read-ch7',
          kind: 'reading',
          path: 'intro',
          minutes: 30,
          objectives: ['scale'],
          title: {
            en: 'Astronomy 2e, chapter 7: Other Worlds: An Introduction to the Solar System',
            es: 'Astronomy 2e, capítulo 7: Otros mundos, una introducción al sistema solar (en inglés)',
            esOf: '2cf8bf06',
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
            en: 'Read this before the first investigation if the planets’ names are all you know.',
            es: 'Léelo antes de la primera investigación si solo conoces los nombres de los planetas.',
            esOf: '8c7a77ea',
          },
        },
        {
          id: 'the-scale-of-the-solar-system',
          kind: 'lesson',
          lesson: 'the-scale-of-the-solar-system',
          objectives: ['scale'],
          pin: {
            fp: '50a03e13',
            n: 8,
          },
        },
      ],
    },
    {
      id: 'worlds',
      title: {
        en: 'Worlds, air and surfaces (chapters 8 to 10)',
        es: 'Mundos, aire y superficies (capítulos 8 a 10)',
        esOf: 'e5f799a6',
      },
      summary: {
        en: 'What sunlight alone gives a planet, and how craters rank surfaces by age.',
        es: 'Lo que da la luz del Sol a un planeta solo, y cómo los cráteres ordenan las superficies por edad.',
        esOf: '431af432',
      },
      items: [
        {
          id: 'read-ch8-10',
          kind: 'reading',
          path: 'intro',
          minutes: 60,
          objectives: ['worlds'],
          title: {
            en: 'Astronomy 2e, chapters 8 to 10: Earth as a Planet, Cratered Worlds, and Earthlike Planets: Venus and Mars',
            es: 'Astronomy 2e, capítulos 8 a 10: La Tierra como planeta, mundos con cráteres y planetas parecidos a la Tierra: Venus y Marte (en inglés)',
            esOf: '07f0e4a0',
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
            en: 'Chapter 10 covers Venus and Mars, the two worlds whose air the first investigation compares.',
            es: 'El capítulo 10 trata de Venus y Marte, los dos mundos cuyo aire compara la primera investigación.',
            esOf: 'e49810c9',
          },
        },
        {
          id: 'why-venus-is-hot',
          kind: 'lesson',
          lesson: 'why-venus-is-hot',
          objectives: ['worlds'],
          pin: {
            fp: '291bb6ed',
            n: 9,
          },
        },
        {
          id: 'which-surface-is-older',
          kind: 'lesson',
          lesson: 'which-surface-is-older',
          objectives: ['worlds'],
          pin: {
            fp: '91307e8d',
            n: 10,
          },
        },
        {
          id: 'two-greenhouse-models',
          kind: 'lesson',
          path: 'advanced',
          lesson: 'two-greenhouse-models',
          objectives: ['worlds'],
          needs: ['why-venus-is-hot'],
          pin: {
            fp: '2aead709',
            n: 7,
          },
        },
        {
          id: 'craters-by-size',
          kind: 'lesson',
          path: 'advanced',
          lesson: 'craters-by-size',
          objectives: ['worlds'],
          needs: ['which-surface-is-older'],
          pin: {
            fp: '29424a58',
            n: 9,
          },
        },
      ],
    },
    {
      id: 'giants',
      title: {
        en: 'Giant planets, moons and rings (chapters 11 and 12)',
        es: 'Planetas gigantes, lunas y anillos (capítulos 11 y 12)',
        esOf: 'd248212e',
      },
      summary: {
        en: 'Moons that keep step, rings, tides and the heat they make.',
        es: 'Lunas que llevan el paso, anillos, mareas y el calor que producen.',
        esOf: '1f234669',
      },
      items: [
        {
          id: 'read-ch11-12',
          kind: 'reading',
          path: 'intro',
          minutes: 60,
          objectives: ['moons'],
          title: {
            en: 'Astronomy 2e, chapters 11 and 12: The Giant Planets, and Rings, Moons, and Pluto',
            es: 'Astronomy 2e, capítulos 11 y 12: Los planetas gigantes, y anillos, lunas y Plutón (en inglés)',
            esOf: 'a5466e4c',
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
            en: 'Chapter 12 covers the Galilean moons and rings.',
            es: 'El capítulo 12 trata de las lunas galileanas y los anillos.',
            esOf: '675b673f',
          },
        },
        {
          id: 'moons-of-the-giants',
          kind: 'lesson',
          lesson: 'moons-of-the-giants',
          objectives: ['moons'],
          pin: {
            fp: '7fd8bb28',
            n: 10,
          },
        },
        {
          id: 'why-rings',
          kind: 'lesson',
          lesson: 'why-rings',
          objectives: ['moons'],
          pin: {
            fp: 'bd3b1ea8',
            n: 8,
          },
        },
        {
          id: 'tides-that-move-the-moon',
          kind: 'lesson',
          path: 'advanced',
          lesson: 'tides-that-move-the-moon',
          objectives: ['moons'],
          pin: {
            fp: '382d883b',
            n: 6,
          },
        },
        {
          id: 'ios-fire',
          kind: 'lesson',
          path: 'advanced',
          lesson: 'ios-fire',
          objectives: ['moons'],
          needs: ['tides-that-move-the-moon'],
          pin: {
            fp: 'e85823d0',
            n: 6,
          },
        },
      ],
    },
    {
      id: 'small',
      title: {
        en: 'Comets and asteroids (chapter 13)',
        es: 'Cometas y asteroides (capítulo 13)',
        esOf: '01e1ff63',
      },
      summary: {
        en: 'A comet’s orbit and heat, the gaps in the belt, and how fast an asteroid spins.',
        es: 'La órbita y el calor de un cometa, los huecos del cinturón y la rapidez de giro de un asteroide.',
        esOf: 'f675eb00',
      },
      items: [
        {
          id: 'read-ch13',
          kind: 'reading',
          path: 'intro',
          minutes: 30,
          objectives: ['small'],
          title: {
            en: 'Astronomy 2e, chapter 13: Comets and Asteroids: Debris of the Solar System',
            es: 'Astronomy 2e, capítulo 13: Cometas y asteroides, restos del sistema solar (en inglés)',
            esOf: '5bccf0b4',
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
            en: 'Read it before the comet investigation if tails are new to you.',
            es: 'Léelo antes de la investigación de los cometas si las colas son nuevas para ti.',
            esOf: 'f6feb630',
          },
        },
        {
          id: 'comets-and-the-sun',
          kind: 'lesson',
          lesson: 'comets-and-the-sun',
          objectives: ['small'],
          pin: {
            fp: '2cf7e8b3',
            n: 9,
          },
        },
        {
          id: 'the-gaps-in-the-belt',
          kind: 'lesson',
          lesson: 'the-gaps-in-the-belt',
          objectives: ['small'],
          pin: {
            fp: '0469c83e',
            n: 8,
          },
        },
        {
          id: 'how-fast-does-it-spin',
          kind: 'lesson',
          lesson: 'how-fast-does-it-spin',
          objectives: ['small'],
          pin: {
            fp: '24293e22',
            n: 6,
          },
        },
      ],
    },
    {
      id: 'sun',
      title: {
        en: 'The Sun (chapters 15 and 16)',
        es: 'El Sol (capítulos 15 y 16)',
        esOf: '03e92665',
      },
      summary: {
        en: 'The Sun’s rotation and power.',
        es: 'La rotación y la potencia del Sol.',
        esOf: 'c4e2a94e',
      },
      items: [
        {
          id: 'read-ch15-16',
          kind: 'reading',
          path: 'intro',
          minutes: 60,
          objectives: ['sun'],
          title: {
            en: 'Astronomy 2e, chapters 15 and 16: The Sun: A Garden-Variety Star, and The Sun: A Nuclear Powerhouse',
            es: 'Astronomy 2e, capítulos 15 y 16: El Sol, una estrella corriente, y el Sol, una central nuclear (en inglés)',
            esOf: '658a626c',
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
            en: 'Chapter 15 covers the Sun’s rotation and its cycle.',
            es: 'El capítulo 15 trata de la rotación del Sol y de su ciclo.',
            esOf: 'd9ee984e',
          },
        },
        {
          id: 'the-turning-sun',
          kind: 'lesson',
          lesson: 'the-turning-sun',
          objectives: ['sun'],
          pin: {
            fp: '02c79b5e',
            n: 9,
          },
        },
        {
          id: 'the-suns-power',
          kind: 'lesson',
          lesson: 'the-suns-power',
          objectives: ['sun'],
          pin: {
            fp: 'b338982d',
            n: 6,
          },
        },
      ],
    },
    {
      id: 'not-yet',
      title: {
        en: 'Not here yet: readings with the reason (optional)',
        es: 'Aún no está aquí: lecturas con el motivo (opcional)',
        esOf: '731348df',
      },
      summary: {
        en: 'Topics of these chapters that Gravitas does not have an investigation for yet, each with the reason.',
        es: 'Temas de estos capítulos para los que Gravitas aún no tiene una investigación, cada uno con el motivo.',
        esOf: 'b56dd00d',
      },
      items: [
        {
          id: 'not-yet-worlds-compared',
          kind: 'reading',
          path: 'advanced',
          minutes: 30,
          title: {
            en: 'Astronomy 2e, chapter 7: how the worlds compare inside',
            es: 'Astronomy 2e, capítulo 7: cómo se comparan los mundos por dentro (en inglés)',
            esOf: 'c47ca397',
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
            en: 'There is no investigation comparing the worlds’ densities and interiors yet: the interior-structure inversion did not pass its validation gate and the comparison workbench is not built.',
            es: 'Aún no hay una investigación que compare las densidades y los interiores de los mundos: la inversión de la estructura interior no superó su puerta de validación y el banco de comparación no está construido.',
            esOf: 'd3b4fb2f',
          },
        },
        {
          id: 'not-yet-reading-a-surface',
          kind: 'reading',
          path: 'advanced',
          minutes: 30,
          title: {
            en: 'Astronomy 2e, chapter 10: reading the surface of Mars',
            es: 'Astronomy 2e, capítulo 10: leer la superficie de Marte (en inglés)',
            esOf: 'd8d49ff8',
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
            en: 'Marking craters, channels and dunes on a Mars picture needs a marking instrument Gravitas does not have yet.',
            es: 'Marcar cráteres, canales y dunas en una imagen de Marte necesita un instrumento de marcado que Gravitas aún no tiene.',
            esOf: '54635f90',
          },
        },
        {
          id: 'not-yet-crater-ages',
          kind: 'reading',
          path: 'advanced',
          minutes: 30,
          title: {
            en: 'Astronomy 2e, chapter 7: absolute ages from craters',
            es: 'Astronomy 2e, capítulo 7: edades absolutas a partir de cráteres (en inglés)',
            esOf: 'bc5a5289',
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
            en: 'Gravitas ranks surfaces by relative age only: an absolute age needs a calibrated chronology that did not pass its gate. The orbit of an asteroid from a few observations did not pass its gate either.',
            es: 'Gravitas solo ordena las superficies por edad relativa: una edad absoluta necesita una cronología calibrada que no superó su puerta. La órbita de un asteroide a partir de pocas observaciones tampoco superó la suya.',
            esOf: '912948bd',
          },
        },
        {
          id: 'not-yet-space-weather',
          kind: 'reading',
          path: 'advanced',
          minutes: 30,
          title: {
            en: 'Astronomy 2e, chapter 15: the solar cycle and space weather',
            es: 'Astronomy 2e, capítulo 15: el ciclo solar y el clima espacial (en inglés)',
            esOf: '3d50543c',
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
            en: 'The eleven-year sunspot cycle needs a table of sunspot numbers that Gravitas has not been given the right to ship yet, so there is no investigation of space weather.',
            es: 'El ciclo de once años de las manchas solares necesita una tabla de números de manchas que Gravitas aún no tiene derecho a distribuir, así que no hay una investigación sobre clima espacial.',
            esOf: '5cb10d44',
          },
        },
      ],
    },
  ],
};
