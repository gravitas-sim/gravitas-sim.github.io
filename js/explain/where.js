// =============================================================================
// Where to check it (Roadmap III, Prompt 286)
// -----------------------------------------------------------------------------
// For each area of physics the application computes: its kernel document (the
// equations, the limits, the assumptions and the validation table), the section
// of /model/ that states the choices where there is one, and the groups of the
// validation page that hold the checks run in the reader's browser. The
// explainers end with a line from this table, and the Teach page's "Where to
// check the physics" lists every kernel from it.
//
// A lazy module, fetched when an explainer opens or the Teach table is asked
// for. tests/where.test.js holds it to the repository: every directory of
// js/kernels is here, each document and each model section exists, each group
// is one the validation page prints, and each explainer family has a place.
// =============================================================================

/** @typedef {{id: string, kernel: boolean, en: string, es: string, doc: string, model: ?string, groups: string[]}} Area */

const area = (id, kernel, en, es, doc, model = null, groups = []) => ({
  id,
  kernel,
  en,
  es,
  doc,
  model,
  groups,
});

/** Every area: first the directories of js/kernels, then the other models. */
export const AREAS = [
  area(
    'activity',
    true,
    'Stellar activity',
    'Actividad estelar',
    'STELLAR_ACTIVITY.md',
    'stellar-activity'
  ),
  area(
    'agn',
    true,
    'Active galactic nuclei',
    'Núcleos galácticos activos',
    'AGN.md',
    null,
    ['Active galactic nuclei: the Eddington bound and the size bound']
  ),
  area(
    'atmospheres',
    true,
    'Planetary atmospheres',
    'Atmósferas planetarias',
    'ATMOSPHERES.md',
    null,
    ['Atmospheres']
  ),
  area(
    'clusters',
    true,
    'Star clusters',
    'Cúmulos estelares',
    'CLUSTER_FITTING.md',
    'cluster-fitting',
    ['Cluster fitting', 'Cluster dynamics']
  ),
  area('cosmology', true, 'Cosmology', 'Cosmología', 'COSMOLOGY_II.md', null, [
    'Cosmology II: late-time FLRW depth',
  ]),
  area(
    'crossmatch',
    true,
    'Catalog cross-matching',
    'Cruce de catálogos',
    'CROSSMATCH.md',
    'gaia-distances'
  ),
  area(
    'detector',
    true,
    'Detectors',
    'Detectores',
    'DETECTION.md',
    'detector-effects'
  ),
  area(
    'dynamics',
    true,
    'Gravity and motion',
    'Gravedad y movimiento',
    'DYNAMICS.md',
    'gravity',
    ['Numerical integrators', 'Conservation laws', 'Circular two-body orbit']
  ),
  area(
    'galactic',
    true,
    'Galactic dynamics',
    'Dinámica galáctica',
    'GALACTIC_DYNAMICS.md',
    null,
    ['Rotation-curve decomposition']
  ),
  area('galaxy', true, 'Galaxies', 'Galaxias', 'GALAXY_MORPHOLOGY.md', null, [
    'Galaxy morphology: size, shape and magnitude on an image',
    'Galaxy spectra: redshift and the 4000-angstrom break',
    'Galaxy clusters: membership, dispersion and virial mass',
  ]),
  area(
    'habitablezone',
    true,
    'The habitable zone',
    'La zona habitable',
    'HABITABLE_ZONE_II.md',
    null,
    ['Habitable zone']
  ),
  area(
    'imaging',
    true,
    'Imaging and frames',
    'Imágenes y cuadros',
    'IMAGING.md'
  ),
  area(
    'interiors',
    true,
    'Stellar interiors',
    'Interiores estelares',
    'INTERIORS.md',
    'interiors',
    ['Interiors']
  ),
  area(
    'ism',
    true,
    'The interstellar medium',
    'El medio interestelar',
    'ISM.md',
    null,
    ['Interstellar medium: lines, widths and reddening']
  ),
  area(
    'lensing',
    true,
    'Gravitational lensing',
    'Lentes gravitacionales',
    'LENSING_II.md',
    'lensing',
    ['Lensing II: enclosed mass, images and arcs']
  ),
  area(
    'multimessenger',
    true,
    'Multi-messenger events',
    'Eventos multimensajero',
    'MULTIMESSENGER.md',
    null,
    ['Multi-messenger']
  ),
  area(
    'numerics',
    true,
    'Numerical methods',
    'Métodos numéricos',
    'NUMERICS.md',
    'conservation',
    ['Numerical integrators']
  ),
  area(
    'occurrence',
    true,
    'Occurrence rates',
    'Tasas de ocurrencia',
    'OCCURRENCE_RATES.md',
    'occurrence'
  ),
  area(
    'radiation',
    true,
    'Radiation and photometry',
    'Radiación y fotometría',
    'RADIATION.md',
    'stars',
    ['Radiation and photometry']
  ),
  area(
    'radio',
    true,
    'Radio astronomy and pulsars',
    'Radioastronomía y púlsares',
    'RADIO.md',
    null,
    ['Pulsars: dispersion and folding', 'HI spectroscopy']
  ),
  area(
    'remnants',
    true,
    'Stellar remnants',
    'Remanentes estelares',
    'REMNANTS.md',
    'remnants',
    ['Compact objects']
  ),
  area(
    'sed',
    true,
    'Spectral energy distributions',
    'Distribuciones espectrales de energía',
    'SED.md',
    null,
    ['Spectral energy distributions']
  ),
  area('sky', true, 'The sky', 'El cielo', 'SKY_LAB.md', null, [
    'Observing windows',
  ]),
  area(
    'smallbodies',
    true,
    'Small bodies',
    'Cuerpos pequeños',
    'SMALL_BODIES.md',
    'small-bodies'
  ),
  area(
    'spectrograph',
    true,
    'Spectrographs',
    'Espectrógrafos',
    'SPECTROGRAPH.md',
    'spectrographs'
  ),
  area(
    'statistics',
    true,
    'Statistics and inference',
    'Estadística e inferencia',
    'STATISTICS.md'
  ),
  area(
    'stellar',
    true,
    'Stellar structure',
    'Estructura estelar',
    'STELLAR_STRUCTURE.md',
    'stars'
  ),
  area(
    'strategy',
    true,
    'Observing strategy',
    'Estrategia de observación',
    'OBSERVING_STRATEGY.md',
    'observing-strategy',
    ['Observing windows']
  ),
  area('sun', true, 'The Sun', 'El Sol', 'SUN_KERNEL.md'),
  area(
    'survey',
    true,
    'Survey design',
    'Diseño de sondeos',
    'SURVEY_DESIGN.md',
    'survey-design'
  ),
  area('tides', true, 'Tides', 'Mareas', 'TIDAL_KERNEL.md', 'tides', [
    'Tidal disruption',
  ]),
  area(
    'ttv',
    true,
    'Transit timing',
    'Tiempos de tránsito',
    'TTV.md',
    'transit-timing'
  ),
  area(
    'variables',
    true,
    'Variable stars',
    'Estrellas variables',
    'VARIABLES_II.md',
    'variables-ii'
  ),
  area(
    'vetting',
    true,
    'Vetting a candidate',
    'Verificación de un candidato',
    'VETTING.md',
    'vetting'
  ),
  area(
    'xray',
    true,
    'X-ray and high-energy sources',
    'Fuentes de rayos X y de altas energías',
    'HIGH_ENERGY.md',
    null,
    ['X-ray counts']
  ),
  // The models of the application that are not a directory of js/kernels.
  area(
    'blackholes',
    false,
    'Black holes',
    'Agujeros negros',
    'PHYSICS_VALIDATION.md',
    'blackholes',
    ['Compact objects']
  ),
  area(
    'gw',
    false,
    'Gravitational waves',
    'Ondas gravitacionales',
    'GRAVITATIONAL_WAVES.md',
    'gravitational-waves',
    ['Inspiral (approximation)']
  ),
  area(
    'darkMatter',
    false,
    'Dark matter and MOND',
    'Materia oscura y MOND',
    'DARK_MATTER.md',
    null,
    ['Dark matter', 'MOND']
  ),
  area(
    'resonance',
    false,
    'Resonance and chaos',
    'Resonancia y caos',
    'RESONANCE_INVESTIGATION.md',
    null,
    ['Orbital resonance', 'Three-body sensitivity']
  ),
  area(
    'exoplanets',
    false,
    'Exoplanet signals',
    'Señales de exoplanetas',
    'EXOPLANET_OBSERVING.md',
    'transit-fitting',
    ['Transit geometry', 'Radial velocity', 'Astrometry']
  ),
  area(
    'exposure',
    false,
    'Exposure planning',
    'Planificación de la exposición',
    'EXPOSURE_PLANNING.md',
    'exposure-planning'
  ),
  area(
    'telescopes',
    false,
    'Telescopes',
    'Telescopios',
    'TELESCOPES.md',
    'telescopes'
  ),
  area(
    'binaries',
    false,
    'Binary stars and their masses',
    'Estrellas binarias y sus masas',
    'BINARY_MASSES.md',
    'binary-masses',
    ['Binary stars']
  ),
  area(
    'directImaging',
    false,
    'Direct imaging',
    'Imagen directa',
    'IMAGING.md',
    'direct-imaging'
  ),
  area(
    'joint',
    false,
    'Joint fits',
    'Ajustes conjuntos',
    'JOINT_INFERENCE.md',
    'joint-fit'
  ),
  area(
    'photcal',
    false,
    'Photometric calibration',
    'Calibración fotométrica',
    'PHOTOMETRIC_CALIBRATION.md',
    'photometric-calibration'
  ),
  area(
    'craters',
    false,
    'Crater counting',
    'Recuento de cráteres',
    'CRATER_COUNTING.md',
    'craters'
  ),
];

/** The area each explainer family is checked in; a family with none has no line. */
export const FAMILY_AREA = {
  energy: 'dynamics',
  binary: 'dynamics',
  powerLaw: 'dynamics',
  blackHole: 'blackholes',
  habitability: 'habitablezone',
  habitabilityLimits: 'habitablezone',
  exoplanet: 'exoplanets',
  transit: 'exoplanets',
  compare: 'exoplanets',
  tidal: 'tides',
  tides: 'tides',
  darkMatter: 'darkMatter',
  chaos: 'resonance',
  resonance: 'resonance',
  stellar: 'stellar',
  stellarEvolution: 'stellar',
  observing: 'sky',
  sky: 'sky',
  spectra: 'radiation',
  light: 'radiation',
  gw: 'gw',
  gwEvents: 'gw',
  galactic: 'galactic',
  gaia: 'crossmatch',
  interiors: 'interiors',
  variables: 'variables',
  variablesII: 'variables',
  lensing: 'lensing',
  cosmology: 'cosmology',
  detector: 'detector',
  effects: 'detector',
  exposure: 'exposure',
  spectrograph: 'spectrograph',
  strategy: 'strategy',
  activity: 'activity',
  directImaging: 'directImaging',
  vetting: 'vetting',
  joint: 'joint',
  occurrence: 'occurrence',
  remnants: 'remnants',
  ttv: 'ttv',
  masses: 'binaries',
  eclipse: 'binaries',
  clusterFit: 'clusters',
  surveyDesign: 'survey',
  survey: 'survey',
  imaging: 'imaging',
  telescope: 'telescopes',
  photcal: 'photcal',
  atmosphere: 'atmospheres',
  crater: 'craters',
  sun: 'sun',
  smallBodies: 'smallbodies',
};

/** The slug of a validation group, the anchor of its section on /validation/. */
export const groupAnchor = name =>
  `g-${name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')}`;

const REPO =
  'https://github.com/gravitas-sim/gravitas-sim.github.io/blob/main/';

const WORDS = {
  en: {
    lead: 'Where this is checked: ',
    model: 'the model page',
    validation: 'the validation table',
    document: 'the kernel document',
  },
  es: {
    lead: 'Dónde se comprueba: ',
    model: 'la página del modelo',
    validation: 'la tabla de validación',
    document: 'el documento del núcleo de cálculo',
  },
};

/**
 * The links that lead to an area's checks, in the language asked for.
 * @param {Area} found - An area
 * @param {'en'|'es'} lang - The language
 * @returns {Array<{text: string, href: string}>} Model section, validation table, document
 */
export function linksFor(found, lang) {
  const w = WORDS[lang];
  const out = [];
  if (found.model) out.push({ text: w.model, href: `/model/#${found.model}` });
  if (found.groups.length)
    out.push({
      text: w.validation,
      href: `/validation/#${groupAnchor(found.groups[0])}`,
    });
  out.push({ text: w.document, href: REPO + found.doc });
  return out;
}

/**
 * The line an explainer ends with: "Where this is checked: the model page, the
 * validation table, the kernel document", each a link.
 *
 * @param {string} family - An explainer key
 * @param {'en'|'es'} lang - The language
 * @returns {?HTMLElement} A paragraph, or null for a family with no area
 */
export function whereChecked(family, lang) {
  const found = AREAS.find(a => a.id === FAMILY_AREA[family]);
  if (!found) return null;
  const p = document.createElement('p');
  p.className = 'where-checked';
  p.append(`${WORDS[lang].lead}${found[lang]}: `);
  linksFor(found, lang).forEach((l, i) => {
    if (i) p.append(', ');
    const a = document.createElement('a');
    a.href = l.href;
    a.textContent = l.text;
    p.append(a);
  });
  return p;
}

const TABLE = {
  en: {
    caption:
      'Every area of physics the application computes, where its assumptions are stated and where its checks are',
    area: 'Area',
    model: 'Model page section',
    validation: 'Validation table',
    document: 'Kernel document',
    none: 'No section yet: the kernel document states the assumptions',
    other: 'Other models of the application',
  },
  es: {
    caption:
      'Cada área de la física que calcula la aplicación, dónde se enuncian sus supuestos y dónde están sus comprobaciones',
    area: 'Área',
    model: 'Sección de la página del modelo',
    validation: 'Tabla de validación',
    document: 'Documento del núcleo de cálculo',
    none: 'Aún sin sección: el documento del núcleo enuncia los supuestos',
    other: 'Otros modelos de la aplicación',
  },
};

/**
 * The table the Teach page's "Where to check the physics" opens: one row for
 * every directory of js/kernels and every other model, each reaching its kernel
 * document (the validation table of the equations), its section of the model
 * page when it has one, and its groups on the validation page.
 *
 * @param {'en'|'es'} lang - The language
 * @returns {HTMLElement} A scrollable table
 */
export function kernelTable(lang) {
  const w = TABLE[lang];
  const link = (text, href) => {
    const a = document.createElement('a');
    a.href = href;
    a.textContent = text;
    return a;
  };
  const wrap = document.createElement('div');
  wrap.className = 'doc-table-wrap';
  wrap.tabIndex = 0;
  const table = document.createElement('table');
  table.className = 'doc-table';
  const cap = table.createCaption();
  cap.className = 'gs-vh';
  cap.textContent = w.caption;
  const head = table.createTHead().insertRow();
  for (const k of ['area', 'model', 'validation', 'document']) {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = w[k];
    head.append(th);
  }
  const body = table.createTBody();
  for (const a of AREAS) {
    const row = body.insertRow();
    const th = document.createElement('th');
    th.scope = 'row';
    th.textContent = a[lang];
    if (!a.kernel) th.title = w.other;
    row.append(th);
    const model = row.insertCell();
    if (a.model) model.append(link(a.model, `/model/#${a.model}`));
    else model.textContent = w.none;
    const val = row.insertCell();
    a.groups.forEach((g, i) => {
      if (i) val.append(', ');
      val.append(link(g, `/validation/#${groupAnchor(g)}`));
    });
    if (!a.groups.length) val.textContent = '–';
    row.insertCell().append(link(a.doc, REPO + a.doc));
  }
  wrap.append(table);
  return wrap;
}
