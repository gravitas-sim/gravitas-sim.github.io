import { ID_COURSE_PACK } from '../../names.js';
// =============================================================================
// Upper-level astrophysics modules: eight short units
// -----------------------------------------------------------------------------
// A gravitas.course-pack/2 (js/course/pack.js, COURSE_PACKS.md), pinned to the
// investigations as they are now. Roadmap II, Prompt 97. Opened as
// /course/?course=upper-level-modules; tests/coursePack.test.js holds it to the format and
// to a clean audit. Teaching material under CC BY 4.0 like the lessons it
// orders (LICENSES.md); the Spanish has not been reviewed by a native speaker.
// =============================================================================

export const UPPER_LEVEL_MODULES = {
  format: ID_COURSE_PACK,
  formatVersion: 2,
  id: 'upper-level-modules',
  version: '1.1.0',
  gravitas: '1.0.0',
  locales: ['en', 'es'],
  pinning: 'compatible',
  courseLevel: 'upper',
  title: {
    en: 'Upper-level astrophysics modules: eight short units',
    es: 'Módulos de astrofísica de nivel superior: ocho unidades breves',
    esOf: '84609b2b',
  },
  summary: {
    en: 'Eight stand-alone units for upper-level courses: celestial mechanics, stellar astrophysics, galactic dynamics, exoplanet science, time-domain astronomy, cosmology, the statistics of surveys and computation. Each unit has its own objectives, runs at the advanced depth where an investigation offers one, and can be set alone or in any order after its prerequisite. The celestial mechanics unit takes four of the 3-D lab’s investigations and the mission lab’s three as optional items.',
    es: 'Ocho unidades independientes para cursos de nivel superior: mecánica celeste, astrofísica estelar, dinámica galáctica, ciencia de exoplanetas, astronomía del dominio temporal, cosmología, estadística de sondeos y cálculo. Cada unidad tiene sus propios objetivos, se hace en la profundidad avanzada donde la investigación la ofrece y puede asignarse sola o en cualquier orden tras su requisito. La unidad de mecánica celeste toma cuatro investigaciones del laboratorio 3D y las tres del laboratorio de misiones como elementos opcionales.',
    esOf: '1cdd587a',
  },
  audience: {
    en: 'Upper-level astronomy or physics majors with calculus and a first course in mechanics, who have read an introductory astronomy text such as OpenStax Astronomy 2e: the units assume its chapters on orbits, light, stars, galaxies and the Solar System as background.',
    es: 'Estudiantes de astronomía o física de nivel superior con cálculo y un primer curso de mecánica, que han leído un texto introductorio de astronomía como OpenStax Astronomy 2e: las unidades suponen como base sus capítulos sobre órbitas, luz, estrellas, galaxias y el sistema solar.',
    esOf: '54404cc6',
  },
  teacherGuide: {
    en: 'Each unit takes about two to four hours and can be set on its own. Where an investigation has an advanced depth, items open at it. Students carry results between investigations, so keep each unit in order. The celestial mechanics unit offers the 3-D lab investigations on orbit planes and eclipses on the introductory path and those on mutual events and the Kozai effect on the advanced path; the mission lab’s investigations on the rendezvous and the launch window are on the introductory path and the one on the patched conic against the direct flight is on the advanced path. The computation unit uses the compute page, which is online only and downloads about 19 MB of Python once per student; run its investigations in a room with a connection, or have students open a capsule you made. Instructor notes and keys are in the portal.',
    es: 'Cada unidad ocupa de dos a cuatro horas y puede asignarse sola. Donde una investigación tiene profundidad avanzada, los elementos se abren en ella. Los estudiantes llevan resultados de una investigación a otra, así que mantengan cada unidad en orden. La unidad de mecánica celeste ofrece las investigaciones del laboratorio 3D sobre planos orbitales y eclipses en la ruta introductoria y las de eventos mutuos y el efecto Kozai en la ruta avanzada; las del laboratorio de misiones sobre el encuentro y la ventana de lanzamiento están en la ruta introductoria y la de la cónica empalmada frente al vuelo directo, en la avanzada. La unidad de cálculo usa la página de cálculo, que solo funciona con conexión y descarga unos 19 MB de Python una vez por estudiante; hagan sus investigaciones en un aula con conexión, o pidan a los estudiantes que abran una cápsula que ustedes hayan hecho. Las notas y las claves están en el portal.',
    esOf: '60cf9be3',
  },
  objectives: [
    {
      id: 'mechanics',
      text: {
        en: 'Analyze orbits with energy, resonance and the restricted three-body problem.',
        es: 'Analizar órbitas con la energía, la resonancia y el problema restringido de tres cuerpos.',
        esOf: 'c89ce151',
      },
    },
    {
      id: 'stellar',
      text: {
        en: 'Derive how stellar structure scales and where it ends.',
        es: 'Deducir cómo escala la estructura estelar y dónde termina.',
        esOf: 'ab923f0a',
      },
    },
    {
      id: 'galactic',
      text: {
        en: 'Infer mass distributions from rotation curves and lensing.',
        es: 'Inferir distribuciones de masa a partir de curvas de rotación y lentes.',
        esOf: 'a5eb7b85',
      },
    },
    {
      id: 'exo',
      text: {
        en: "Combine transit and radial-velocity data into a planet's properties.",
        es: 'Combinar datos de tránsito y velocidad radial en las propiedades de un planeta.',
        esOf: '11bebd11',
      },
    },
    {
      id: 'time',
      text: {
        en: 'Use variable stars as distance indicators.',
        es: 'Usar las estrellas variables como indicadores de distancia.',
        esOf: 'ed9f953e',
      },
    },
    {
      id: 'cosmo',
      text: {
        en: 'Fit an expansion history and read what it implies.',
        es: 'Ajustar una historia de la expansión y leer lo que implica.',
        esOf: 'a3ca60e3',
      },
    },
    {
      id: 'surveys',
      text: {
        en: 'Correct a sample for the selection that made it.',
        es: 'Corregir una muestra por la selección que la produjo.',
        esOf: 'c5fa1871',
      },
    },
    {
      id: 'compute',
      text: {
        en: 'Run a reviewed notebook on a Gravitas document and say what its numbers do and do not cover.',
        es: 'Ejecutar un cuaderno revisado sobre un documento de Gravitas y decir qué cubren y qué no cubren sus números.',
        esOf: 'be19428c',
      },
    },
  ],
  prerequisites: [
    {
      text: {
        en: 'Calculus and a first course in mechanics.',
        es: 'Cálculo y un primer curso de mecánica.',
        esOf: 'b40863bc',
      },
    },
    {
      text: {
        en: 'Introductory astronomy, such as the one-semester course.',
        es: 'Astronomía introductoria, como el curso de un semestre.',
        esOf: 'cc3d908b',
      },
    },
  ],
  units: [
    {
      id: 'celestial-mechanics',
      title: {
        en: 'Celestial mechanics',
        es: 'Mecánica celeste',
        esOf: '2c8f4ec6',
      },
      items: [
        {
          id: 'keplers-laws',
          kind: 'lesson',
          lesson: 'keplers-laws',
          depth: 'advanced',
          objectives: ['mechanics'],
          pin: {
            fp: '475986c2',
            n: 23,
          },
        },
        {
          id: 'orbital-energy',
          kind: 'lesson',
          lesson: 'orbital-energy',
          objectives: ['mechanics'],
          needs: ['keplers-laws'],
          pin: {
            fp: 'c220ddee',
            n: 24,
          },
        },
        {
          id: 'hohmann-transfer',
          kind: 'lesson',
          lesson: 'hohmann-transfer',
          objectives: ['mechanics'],
          needs: ['orbital-energy'],
          pin: {
            fp: '05b69752',
            n: 22,
          },
        },
        {
          id: 'when-orbits-lock',
          kind: 'lesson',
          lesson: 'when-orbits-lock',
          objectives: ['mechanics'],
          pin: {
            fp: '0bb82c4c',
            n: 34,
          },
        },
        {
          id: 'lagrange-points',
          kind: 'lesson',
          lesson: 'lagrange-points',
          objectives: ['mechanics'],
          needs: ['hohmann-transfer', 'when-orbits-lock'],
          pin: {
            fp: 'ebd60a87',
            n: 20,
          },
        },
        {
          id: 'butterfly-effect',
          kind: 'lesson',
          path: 'advanced',
          lesson: 'butterfly-effect',
          objectives: ['mechanics'],
          needs: ['lagrange-points'],
          pin: {
            fp: '5caa3df6',
            n: 28,
          },
        },
        {
          id: 'l3-planes',
          kind: 'guide',
          path: 'intro',
          guide: 'l3-planes',
          depth: 'core',
          minutes: 20,
          title: {
            en: 'An orbit’s plane',
            es: 'El plano de una órbita',
            esOf: 'e95c7f9c',
          },
          objectives: ['mechanics'],
          needs: ['keplers-laws'],
        },
        {
          id: 'l3-eclipse',
          kind: 'guide',
          path: 'intro',
          guide: 'l3-eclipse',
          depth: 'core',
          minutes: 25,
          title: {
            en: 'Seen from outside',
            es: 'Visto desde fuera',
            esOf: '0d178d21',
          },
          objectives: ['mechanics'],
          needs: ['l3-planes'],
        },
        {
          id: 'l3-mutual',
          kind: 'guide',
          path: 'advanced',
          guide: 'l3-mutual',
          depth: 'advanced',
          minutes: 30,
          title: {
            en: 'Two orbits’ planes',
            es: 'Los planos de dos órbitas',
            esOf: '69b039a8',
          },
          objectives: ['mechanics'],
          needs: ['keplers-laws'],
        },
        {
          id: 'l3-kozai',
          kind: 'guide',
          path: 'advanced',
          guide: 'l3-kozai',
          depth: 'advanced',
          minutes: 35,
          title: {
            en: 'A distant third body',
            es: 'Un tercer cuerpo lejano',
            esOf: '8e26a394',
          },
          objectives: ['mechanics'],
          needs: ['l3-mutual'],
        },
        {
          id: 'ml-orbit',
          kind: 'guide',
          path: 'intro',
          guide: 'ml-orbit',
          depth: 'core',
          minutes: 15,
          title: {
            en: 'Meeting the depot',
            es: 'El encuentro con el depósito',
            esOf: 'ebfab45f',
          },
          objectives: ['mechanics'],
          needs: ['hohmann-transfer'],
        },
        {
          id: 'ml-window',
          kind: 'guide',
          path: 'intro',
          guide: 'ml-window',
          depth: 'core',
          minutes: 20,
          title: {
            en: 'The launch window',
            es: 'La ventana de lanzamiento',
            esOf: '152366d5',
          },
          objectives: ['mechanics'],
          needs: ['ml-orbit'],
        },
        {
          id: 'ml-cruise',
          kind: 'guide',
          path: 'advanced',
          guide: 'ml-cruise',
          depth: 'advanced',
          minutes: 40,
          title: {
            en: 'The patched conic against the direct flight',
            es: 'La cónica empalmada frente al vuelo directo',
            esOf: 'd5296b9a',
          },
          objectives: ['mechanics'],
          needs: ['hohmann-transfer'],
        },
      ],
    },
    {
      id: 'stellar-astrophysics',
      title: {
        en: 'Stellar astrophysics',
        es: 'Astrofísica estelar',
        esOf: 'ae11e172',
      },
      items: [
        {
          id: 'lives-of-stars',
          kind: 'lesson',
          lesson: 'lives-of-stars',
          objectives: ['stellar'],
          pin: {
            fp: '584bfc2b',
            n: 35,
          },
        },
        {
          id: 'inside-a-star',
          kind: 'lesson',
          lesson: 'inside-a-star',
          depth: 'advanced',
          objectives: ['stellar'],
          needs: ['lives-of-stars'],
          pin: {
            fp: 'be2999dd',
            n: 9,
          },
        },
        {
          id: 'scaling-the-main-sequence',
          kind: 'lesson',
          lesson: 'scaling-the-main-sequence',
          depth: 'advanced',
          objectives: ['stellar'],
          needs: ['inside-a-star'],
          pin: {
            fp: 'e277b2b4',
            n: 10,
          },
        },
        {
          id: 'the-limit',
          kind: 'lesson',
          lesson: 'the-limit',
          depth: 'advanced',
          objectives: ['stellar'],
          needs: ['inside-a-star'],
          pin: {
            fp: 'bc570fde',
            n: 9,
          },
        },
        {
          id: 'a-stars-life-in-numbers',
          kind: 'lesson',
          lesson: 'a-stars-life-in-numbers',
          depth: 'advanced',
          objectives: ['stellar'],
          needs: ['lives-of-stars'],
          pin: {
            fp: '7b5ba5a2',
            n: 6,
          },
        },
        {
          id: 'spectra-tell-temperature-and-gravity',
          kind: 'lesson',
          lesson: 'spectra-tell-temperature-and-gravity',
          depth: 'advanced',
          objectives: ['stellar'],
          pin: {
            fp: 'e9290483',
            n: 6,
          },
        },
        {
          id: 'when-a-star-explodes',
          kind: 'lesson',
          lesson: 'when-a-star-explodes',
          depth: 'advanced',
          objectives: ['stellar'],
          needs: ['the-limit'],
          pin: {
            fp: 'fdb2ac9c',
            n: 6,
          },
        },
        {
          id: 'data-mist-isochrones',
          kind: 'dataset',
          path: 'advanced',
          minutes: 30,
          objectives: [],
          dataset: 'mist-isochrones',
        },
      ],
    },
    {
      id: 'galactic-dynamics',
      title: {
        en: 'Galactic dynamics',
        es: 'Dinámica galáctica',
        esOf: '54134519',
      },
      items: [
        {
          id: 'the-suns-motion',
          kind: 'lesson',
          lesson: 'the-suns-motion',
          depth: 'advanced',
          objectives: ['galactic'],
          pin: {
            fp: '07937a42',
            n: 10,
          },
        },
        {
          id: 'the-rotating-disk',
          kind: 'lesson',
          lesson: 'the-rotating-disk',
          depth: 'advanced',
          objectives: ['galactic'],
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
          depth: 'advanced',
          objectives: ['galactic'],
          pin: {
            fp: 'af2cdbff',
            n: 33,
          },
        },
        {
          id: 'bending-light',
          kind: 'lesson',
          lesson: 'bending-light',
          objectives: ['galactic'],
          pin: {
            fp: 'ea95adb8',
            n: 8,
          },
        },
        {
          id: 'einstein-rings-and-arcs',
          kind: 'lesson',
          lesson: 'einstein-rings-and-arcs',
          depth: 'advanced',
          objectives: ['galactic'],
          needs: ['bending-light'],
          pin: {
            fp: 'fbcb7c5a',
            n: 9,
          },
        },
        {
          id: 'data-milky-way-rotation-curve',
          kind: 'dataset',
          path: 'advanced',
          minutes: 30,
          objectives: [],
          dataset: 'milky-way-rotation-curve',
          teacherNote: {
            en: 'This dataset has no stated license; credit the makers in anything you share.',
            es: 'Este conjunto de datos no declara licencia; reconoce a sus autores en todo lo que compartas.',
            esOf: '2f405901',
          },
        },
      ],
    },
    {
      id: 'exoplanet-science',
      title: {
        en: 'Exoplanet science',
        es: 'Ciencia de exoplanetas',
        esOf: '450552b1',
      },
      items: [
        {
          id: 'transit-photometry',
          kind: 'lesson',
          lesson: 'transit-photometry',
          depth: 'advanced',
          objectives: ['exo'],
          pin: {
            fp: '8908fdd2',
            n: 29,
          },
        },
        {
          id: 'radial-velocity',
          kind: 'lesson',
          lesson: 'radial-velocity',
          objectives: ['exo'],
          needs: ['transit-photometry'],
          pin: {
            fp: '480cbfeb',
            n: 38,
          },
        },
        {
          id: 'detect-this-planet',
          kind: 'lesson',
          lesson: 'detect-this-planet',
          objectives: ['exo'],
          needs: ['transit-photometry', 'radial-velocity'],
          pin: {
            fp: '488c98f2',
            n: 26,
          },
        },
        {
          id: 'design-the-schedule',
          kind: 'lesson',
          lesson: 'design-the-schedule',
          objectives: ['exo'],
          needs: ['radial-velocity', 'detect-this-planet'],
          pin: {
            fp: 'dbbc247b',
            n: 15,
          },
        },
        {
          id: 'binary-star-planets',
          kind: 'lesson',
          path: 'advanced',
          lesson: 'binary-star-planets',
          objectives: ['exo'],
          pin: {
            fp: 'c495e253',
            n: 37,
          },
        },
      ],
    },
    {
      id: 'time-domain',
      title: {
        en: 'Time-domain astronomy',
        es: 'Astronomía del dominio temporal',
        esOf: 'aca24359',
      },
      items: [
        {
          id: 'the-beat-of-a-star',
          kind: 'lesson',
          lesson: 'the-beat-of-a-star',
          depth: 'advanced',
          objectives: ['time'],
          pin: {
            fp: 'c665c968',
            n: 13,
          },
        },
        {
          id: 'which-kind-of-variable',
          kind: 'lesson',
          lesson: 'which-kind-of-variable',
          depth: 'advanced',
          objectives: ['time'],
          needs: ['the-beat-of-a-star'],
          pin: {
            fp: 'dbb6d7e8',
            n: 9,
          },
        },
        {
          id: 'leavitts-law',
          kind: 'lesson',
          lesson: 'leavitts-law',
          depth: 'advanced',
          objectives: ['time'],
          needs: ['the-beat-of-a-star'],
          pin: {
            fp: '4cb80430',
            n: 8,
          },
        },
        {
          id: 'the-first-rung',
          kind: 'lesson',
          lesson: 'the-first-rung',
          depth: 'advanced',
          objectives: ['time'],
          needs: ['leavitts-law'],
          pin: {
            fp: '363c7fb8',
            n: 8,
          },
        },
      ],
    },
    {
      id: 'cosmology',
      title: {
        en: 'Cosmology',
        es: 'Cosmología',
        esOf: '8c97537d',
      },
      items: [
        {
          id: 'the-expanding-universe',
          kind: 'lesson',
          lesson: 'the-expanding-universe',
          depth: 'advanced',
          objectives: ['cosmo'],
          pin: {
            fp: '9c3f4cde',
            n: 9,
          },
        },
        {
          id: 'standard-candles',
          kind: 'lesson',
          lesson: 'standard-candles',
          depth: 'advanced',
          objectives: ['cosmo'],
          needs: ['the-expanding-universe'],
          pin: {
            fp: 'a8ab6d5a',
            n: 7,
          },
        },
        {
          id: 'the-shape-of-expansion',
          kind: 'lesson',
          lesson: 'the-shape-of-expansion',
          depth: 'advanced',
          objectives: ['cosmo'],
          needs: ['standard-candles'],
          pin: {
            fp: '58414b63',
            n: 9,
          },
        },
        {
          id: 'where-galaxies-live',
          kind: 'lesson',
          path: 'advanced',
          lesson: 'where-galaxies-live',
          objectives: ['cosmo'],
          needs: ['the-expanding-universe'],
          pin: {
            fp: 'ee81ac4a',
            n: 9,
          },
        },
      ],
    },
    {
      id: 'survey-statistics',
      title: {
        en: 'Statistics of surveys',
        es: 'Estadística de sondeos',
        esOf: 'b0d689c4',
      },
      items: [
        {
          id: 'who-gets-counted',
          kind: 'lesson',
          lesson: 'who-gets-counted',
          depth: 'advanced',
          objectives: ['surveys'],
          pin: {
            fp: '4c7a4e9e',
            n: 10,
          },
        },
        {
          id: 'why-the-bright-ones-win',
          kind: 'lesson',
          lesson: 'why-the-bright-ones-win',
          depth: 'advanced',
          objectives: ['surveys'],
          needs: ['who-gets-counted'],
          pin: {
            fp: 'c0751033',
            n: 10,
          },
        },
        {
          id: 'the-completeness-curve',
          kind: 'lesson',
          lesson: 'the-completeness-curve',
          depth: 'advanced',
          objectives: ['surveys'],
          needs: ['why-the-bright-ones-win'],
          pin: {
            fp: '306b2238',
            n: 10,
          },
        },
        {
          id: 'data-gaia-solar-neighbourhood',
          kind: 'dataset',
          path: 'advanced',
          minutes: 30,
          objectives: [],
          dataset: 'gaia-solar-neighbourhood',
        },
      ],
    },
    {
      id: 'computation',
      title: {
        en: 'Computation',
        es: 'Cálculo',
        esOf: 'e59119f0',
      },
      items: [
        {
          id: 'integrators-in-practice',
          kind: 'lesson',
          lesson: 'integrators-in-practice',
          depth: 'core',
          objectives: ['compute'],
          needs: ['orbital-energy'],
          pin: {
            fp: '61d4a5f8',
            n: 8,
          },
        },
        {
          id: 'extending-an-experiment',
          kind: 'lesson',
          lesson: 'extending-an-experiment',
          depth: 'core',
          objectives: ['compute'],
          pin: {
            fp: 'db9e3b7b',
            n: 8,
          },
        },
        {
          id: 'refitting-a-transit',
          kind: 'lesson',
          lesson: 'refitting-a-transit',
          depth: 'core',
          objectives: ['compute'],
          needs: ['transit-photometry'],
          pin: {
            fp: '61ae825b',
            n: 8,
          },
        },
        {
          id: 'two-periodograms',
          kind: 'lesson',
          lesson: 'two-periodograms',
          depth: 'core',
          objectives: ['compute'],
          needs: ['transit-photometry'],
          pin: {
            fp: '6f20ef65',
            n: 8,
          },
        },
        {
          id: 'sampling-a-posterior',
          kind: 'lesson',
          lesson: 'sampling-a-posterior',
          depth: 'core',
          objectives: ['compute'],
          needs: ['refitting-a-transit'],
          pin: {
            fp: '8e4c5e51',
            n: 8,
          },
        },
      ],
    },
  ],
};
