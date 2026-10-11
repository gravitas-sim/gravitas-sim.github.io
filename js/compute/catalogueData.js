// =============================================================================
// What each reviewed notebook reads and returns, written by hand
// -----------------------------------------------------------------------------
// The hand-written half of the catalogue (./catalogue.js adds the hashes that
// tools/compute.mjs writes). See that file for what an entry is.
// Pure data, no DOM.
// =============================================================================

const PYODIDE = {
  text: 'Pyodide: Python compiled to WebAssembly (pyodide.org)',
  url: 'https://pyodide.org',
};
const NUMPY = {
  text: 'Harris et al. 2020, Nature 585, 357 (NumPy)',
  url: 'https://doi.org/10.1038/s41586-020-2649-2',
};
const MATPLOTLIB = {
  text: 'Hunter 2007, Computing in Science & Engineering 9, 90 (Matplotlib)',
  url: 'https://doi.org/10.1109/MCSE.2007.55',
};

export const CATALOGUE_DATA = [
  {
    id: 'transit-times',
    version: 1,
    title: {
      en: 'Transit times from a light curve',
      es: 'Tiempos de tránsito de una curva de luz',
    },
    summary: {
      en: 'Finds each transit of a planet in a time series, times it, and fits the period and the mean depth. Returns the numbers, a table of transits and a folded plot.',
      es: 'Encuentra cada tránsito de un planeta en una serie temporal, lo fecha y ajusta el período y la profundidad media. Devuelve los números, una tabla de tránsitos y un gráfico plegado.',
    },
    note: {
      en: 'Compare its period with the one the Observatory’s box search finds for the same light curve: the two methods are meant to disagree by a little, and by how much is the lesson.',
      es: 'Compara su período con el que encuentra la búsqueda de caja del Observatorio para la misma curva de luz: los dos métodos deben diferir un poco, y cuánto es lo que enseña.',
    },
    notebook: 'compute/notebooks/transit-times.ipynb',
    packages: ['numpy', 'matplotlib'],
    input: {
      name: 'observation',
      format: 'gravitas.observation',
      version: 1,
      kind: 'time-series',
      example: {
        path: 'compute/inputs/tess-hd209458-s56.observation.json',
        title: {
          en: 'HD 209458, TESS sector 56 light curve (the Observatory’s)',
          es: 'HD 209458, curva de luz de TESS del sector 56 (la del Observatorio)',
        },
      },
    },
    params: [
      {
        id: 'sigma',
        label: {
          en: 'Transit threshold (robust standard deviations below the median)',
          es: 'Umbral de tránsito (desviaciones estándar robustas bajo la mediana)',
        },
        min: 3,
        max: 8,
        step: 0.5,
        default: 5,
      },
    ],
    outputs: {
      envelope: {
        quantities: [
          { id: 'period', unit: 'd', label: { en: 'Period', es: 'Período' } },
          {
            id: 'epoch',
            unit: 'd',
            label: {
              en: 'Epoch of the first fitted transit',
              es: 'Época del primer tránsito ajustado',
            },
          },
          {
            id: 'depth.mean',
            unit: 'ppm',
            label: { en: 'Mean depth', es: 'Profundidad media' },
          },
          {
            id: 'transits',
            unit: 'count',
            label: { en: 'Transits found', es: 'Tránsitos encontrados' },
          },
        ],
      },
      table: true,
      figure: true,
    },
    expected: [
      { id: 'period', value: 3.52381, tolerance: 0.0005 },
      { id: 'depth.mean', value: 15831, tolerance: 5 },
      { id: 'transits', value: 8, tolerance: 0 },
    ],
    citations: [
      {
        text: 'Knutson et al. 2007, ApJ 655, 564 (the transit of HD 209458 b, the value the Observatory’s guide is checked against)',
        url: 'https://doi.org/10.1086/510111',
      },
      PYODIDE,
      NUMPY,
      MATPLOTLIB,
    ],
  },
  {
    id: 'line-centroid',
    version: 1,
    title: {
      en: 'A spectral line: centroid, width and velocity',
      es: 'Una línea espectral: centroide, ancho y velocidad',
    },
    summary: {
      en: 'Measures one line in a spectrum: its centroid, width at half depth, equivalent width and the Doppler velocity of its centroid, each with an uncertainty from seeded noisy copies. NumPy only, so about half the download of a notebook that plots.',
      es: 'Mide una línea de un espectro: su centroide, el ancho a media profundidad, el ancho equivalente y la velocidad Doppler de su centroide, cada uno con una incertidumbre de copias ruidosas con semilla. Solo NumPy, así que la descarga es casi la mitad que la de un cuaderno que dibuja.',
    },
    note: {
      en: 'Its uncertainties count noise only. Compare the velocity with the redshift the pack records for the star, and say what the difference is made of: the pixel step, the window and the continuum are not in the error bars.',
      es: 'Sus incertidumbres cuentan solo el ruido. Compara la velocidad con el corrimiento al rojo que registra el paquete para la estrella, y di de qué está hecha la diferencia: el paso del píxel, la ventana y el continuo no están en las barras de error.',
    },
    notebook: 'compute/notebooks/line-centroid.ipynb',
    packages: ['numpy'],
    input: {
      name: 'observation',
      format: 'gravitas.observation',
      version: 1,
      kind: 'spectrum',
      example: {
        path: 'compute/inputs/sdss-a-star.observation.json',
        title: {
          en: 'SDSS DR18 spectrum of an A star (the Observatory’s)',
          es: 'Espectro SDSS DR18 de una estrella A (el del Observatorio)',
        },
      },
    },
    params: [
      {
        id: 'rest',
        label: {
          en: 'Rest wavelength (angstroms, vacuum)',
          es: 'Longitud de onda en reposo (angstroms, vacío)',
        },
        min: 1000,
        max: 20000,
        step: 0.01,
        default: 6564.61,
      },
      {
        id: 'halfwidth',
        label: {
          en: 'Window half-width (angstroms)',
          es: 'Semiancho de la ventana (angstroms)',
        },
        min: 10,
        max: 300,
        step: 1,
        default: 60,
      },
    ],
    outputs: {
      envelope: {
        quantities: [
          {
            id: 'line.centroid',
            unit: 'Angstrom',
            label: { en: 'Centroid', es: 'Centroide' },
          },
          {
            id: 'line.fwhm',
            unit: 'Angstrom',
            label: {
              en: 'Width at half depth',
              es: 'Ancho a media profundidad',
            },
          },
          {
            id: 'line.equivalent-width',
            unit: 'Angstrom',
            label: { en: 'Equivalent width', es: 'Ancho equivalente' },
          },
          {
            id: 'line.depth',
            unit: '',
            label: {
              en: 'Depth below the continuum',
              es: 'Profundidad bajo el continuo',
            },
          },
          {
            id: 'line.velocity',
            unit: 'km/s',
            label: {
              en: 'Velocity of the centroid',
              es: 'Velocidad del centroide',
            },
          },
        ],
      },
      table: true,
      figure: false,
    },
    expected: [
      { id: 'line.centroid', value: 6560.78, tolerance: 0.1 },
      { id: 'line.equivalent-width', value: 8.3, tolerance: 0.1 },
      { id: 'line.velocity', value: -174.9, tolerance: 6 },
    ],
    citations: [
      {
        text: 'Almeida et al. 2023, ApJS 267, 44 (SDSS DR18, the spectrum’s source)',
        url: 'https://doi.org/10.3847/1538-4365/acda98',
      },
      PYODIDE,
      NUMPY,
    ],
  },
];
