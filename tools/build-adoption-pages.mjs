#!/usr/bin/env node
// =============================================================================
// The adoption pages: one for every investigation and activity
// -----------------------------------------------------------------------------
//   node tools/build-adoption-pages.mjs           write the pages
//   node tools/build-adoption-pages.mjs --check   fail when a page is not what this writes
//
// Roadmap II Prompt 76 (ADOPTION.md). An instructor deciding whether to use an
// investigation needs one page that says what it is, who it is for, how long it
// takes, what a student must already know, what is marked for them and what is
// not, and how to hand it out. Every fact on those pages is read from the same
// sources the Library reads (library/library.json, written by
// tools/build-library.mjs) and from the lesson, guide and activity files
// themselves; nothing is typed here except the words around the facts.
//
//   teaching/investigation/<id>/index.html   one per investigation (the Library's count)
//   teaching/activity/<id>/index.html        one per activity (3)
//   teaching/find/index.html                 the index, with its filters
//   teaching/alignment/index.html            the textbook alignment, by chapter
//   teaching/adopt/index.html                the adopter's guide (Prompt 114)
//
// The pages are static HTML: both languages, written as the shell writes them
// (css/shell.css shows the one the page's <html lang> names), so a page costs
// no JavaScript beyond the shell's own and no route is made heavier by a new
// one. The index loads one small module for its filters (js/teach/find.js).
//
// What is public here is what the instructor materials already say in public
// words: the topic, the placement, the knowledge a student arrives with and the
// wrong turns students take. The worked answers, the expected values and the
// keys stay in the encrypted instructor bundle, behind the passphrase
// (instructors/); this file never reads the passphrase and never writes that
// bundle.
// =============================================================================

import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { withShell } from './shell.mjs';
import { withPolicy } from './csp.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
/**
 * The minutes of a duration as numbers: "5" when the bounds are equal and
 * "5–10" otherwise. The one formatter every generated page that prints a
 * duration uses, so a single-length activity never prints "5–5". (The Library
 * card's own wording, js/library/card.js, already handles equal bounds.)
 */
export const minutesOf = d =>
  !d ? '' : d.min === d.max ? `${d.max}` : `${d.min}–${d.max}`;

const load = rel => import(pathToFileURL(path.join(ROOT, rel)).href);
const readJson = rel => JSON.parse(readFileSync(path.join(ROOT, rel), 'utf8'));

const { shortRoute } = await load('js/assignments/shortRoute.js');

export const BASE = 'teaching';
export const SITE = 'https://gravitas-sim.online';

const html = s =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/** Both languages, as the shell writes them. `same` marks text with no translation. */
const bi = ({ en, es }, { same = false } = {}) =>
  same
    ? `<span class="gs-en">${html(en)}</span><span class="gs-es" lang="en">${html(en)}</span>`
    : `<span class="gs-en">${html(en)}</span><span class="gs-es" lang="es">${html(es ?? en)}</span>`;
const plain = ({ en, es }) => (en === es ? html(en) : bi({ en, es }));

/** The words around the facts. */
const W = {
  crumbTeach: ['Teach', 'Enseñar'],
  crumbFind: ['Find content to teach', 'Encontrar contenido para enseñar'],
  eyebrowInv: [
    'Adoption page: investigation',
    'Página de adopción: investigación',
  ],
  eyebrowAct: [
    'Adoption page: classroom activity',
    'Página de adopción: actividad de clase',
  ],
  glance: ['At a glance', 'De un vistazo'],
  format: ['Where it runs', 'Dónde se ejecuta'],
  level: ['Written for', 'Escrita para'],
  courseLevel: ['Course it suits', 'Curso al que se ajusta'],
  textbook: ['Textbook', 'Libro de texto'],
  time: ['Time', 'Tiempo'],
  minutes: ['minutes', 'minutos'],
  math: ['Mathematics asked', 'Matemáticas que se piden'],
  calc: ['Arithmetic', 'Aritmética'],
  subjects: ['Subjects', 'Temas'],
  steps: ['Steps', 'Pasos'],
  about: ['about', 'unos'],
  stepsLower: ['steps', 'pasos'],
  offline: ['Offline', 'Sin conexión'],
  start: ['Open it', 'Abrirla'],
  preview: ['Preview as a student', 'Vista previa como estudiante'],
  previewNote: [
    'Opens it clean, from the first step, and reads and writes none of the progress saved in this browser.',
    'La abre limpia, desde el primer paso, y no lee ni escribe nada del progreso guardado en este navegador.',
  ],
  previewGuide: [
    'This opens it as a student would. It keeps only the record that the investigation was opened, in this browser.',
    'La abre como la vería un estudiante. Solo guarda en este navegador el registro de que la investigación se abrió.',
  ],
  objectives: [
    'What students will be able to do',
    'Lo que el estudiantado podrá hacer',
  ],
  prereq: ['Before this', 'Antes de esto'],
  prereqDeclared: [
    'Investigations to have done first',
    'Investigaciones previas',
  ],
  prereqNone: [
    'None declared: it can be opened cold.',
    'Ninguna declarada: puede abrirse sin más.',
  ],
  prereqStated: [
    'What students should already know',
    'Lo que el estudiantado debería saber ya',
  ],
  prereqStatedNone: [
    'The instructor materials state none.',
    'Los materiales docentes no indican ninguno.',
  ],
  outline: ['The steps', 'Los pasos'],
  outlineNote: [
    'In order, with what each asks of a student. Deeper steps are laid in only at the depth a student chooses.',
    'En orden, con lo que cada uno pide. Los pasos más profundos solo se añaden en la profundidad que elige el estudiante.',
  ],
  depthCore: ['core', 'principal'],
  depthQuant: ['quantitative', 'cuantitativo'],
  depthAdv: ['advanced', 'avanzado'],
  instruments: [
    'Instruments students use',
    'Instrumentos que usa el estudiantado',
  ],
  instrumentsNone: [
    'No instrument beyond the simulation itself.',
    'Ningún instrumento aparte de la propia simulación.',
  ],
  datasets: ['Data it uses', 'Datos que usa'],
  datasetsNone: [
    'No measured dataset: it runs on worlds the simulation builds.',
    'Ningún conjunto de datos medidos: funciona con mundos que construye la simulación.',
  ],
  license: ['License', 'Licencia'],
  credit: ['Credit', 'Crédito'],
  cite: ['Cite', 'Citar'],
  wrong: ['Common wrong turns', 'Errores frecuentes'],
  wrongNote: [
    'What students most often get wrong here, from the instructor materials. What to say to them, and the answers, are in the materials behind the passphrase.',
    'Lo que el estudiantado suele hacer mal aquí, según los materiales docentes. Qué decirles, y las respuestas, están en los materiales protegidos con contraseña.',
  ],
  wrongNone: [
    'The instructor materials do not list wrong turns for this one yet.',
    'Los materiales docentes aún no recogen errores frecuentes para esta.',
  ],
  englishOnly: ['In English only.', 'Solo en inglés.'],
  access: ['Accessibility', 'Accesibilidad'],
  accessMore: [
    'The accessibility statement, with what was tested and how:',
    'La declaración de accesibilidad, con lo que se probó y cómo:',
  ],
  scoring: ['What is marked, and what is not', 'Qué se califica y qué no'],
  scoreAuto: ['Checked automatically', 'Se comprueban automáticamente'],
  scoreJudge: ['Needs your judgment', 'Requiere su criterio'],
  scoreRecord: ['Recorded, not marked', 'Se registran, no se califican'],
  scoreNote: [
    'A choice or a number is checked against the answer; a written answer is shown to you with the points to look for, never graded by the page.',
    'Una opción o un número se compara con la respuesta; una respuesta escrita se le muestra con los puntos que conviene buscar, y la página nunca la califica.',
  ],
  scoreGuide: [
    'Answers typed in the workspace are checked against the data when the student submits them; choices that are predictions are recorded and answered by a later step.',
    'Las respuestas escritas en el espacio de trabajo se comprueban con los datos al enviarlas; las opciones que son predicciones se registran y las responde un paso posterior.',
  ],
  assign: ['Hand it out', 'Cómo repartirla'],
  addCourse: ['Add it to a course', 'Añadirla a un curso'],
  assignBuilder: [
    'Make an activity from it',
    'Crear una actividad a partir de ella',
  ],
  assignBuilderNote: [
    'Choose steps, add a note and a roster name, and share one link; results come back as a token you can review.',
    'Elija pasos, añada una nota y un nombre de grupo, y comparta un enlace; los resultados vuelven como una ficha que puede revisar.',
  ],
  shortRoute: ['Short route', 'Ruta corta'],
  shortRouteNote: [
    'A default short route the activity builder derives from the steps: a prediction, a measurement, a number, a choice and an explanation, with whatever they need. The time is an estimate from the step types, not a measured class time.',
    'Una ruta corta predeterminada que el constructor de actividades deriva de los pasos: una predicción, una medición, un número, una opción y una explicación, con lo que necesiten. El tiempo es una estimación según los tipos de paso, no un tiempo medido en clase.',
  ],
  assignNone: [
    'This one is handed out as its own link, from the lab it runs in.',
    'Esta se reparte con su propio enlace, desde el laboratorio donde se ejecuta.',
  ],
  templates: ['Ready-made cuts', 'Cortes ya preparados'],
  embed: ['Embed a figure', 'Insertar una figura'],
  embedNote: [
    'An interactive figure of a world this investigation uses, for your own course page. Paste the markup; the figure remembers nothing and sends nothing.',
    'Una figura interactiva de un mundo que usa esta investigación, para la página de su curso. Pegue el código; la figura no recuerda ni envía nada.',
  ],
  embedNone: [
    'It runs in a lab of its own, which has no embeddable figure. The figure builder makes one from any simulation state:',
    'Se ejecuta en un laboratorio propio, sin figura insertable. El creador de figuras la hace a partir de cualquier estado de la simulación:',
  ],
  embedBuilder: ['Open the figure builder', 'Abrir el creador de figuras'],
  materials: ['Instructor materials', 'Materiales docentes'],
  materialsNote: [
    'The instructor notes with the answer key is behind the instructor passphrase. The topic, placement, prior knowledge and wrong turns above are the public part.',
    'Las notas docentes con las respuestas está protegida con la contraseña docente. El tema, la ubicación, los conocimientos previos y los errores frecuentes de arriba son la parte pública.',
  ],
  materialsKey: [
    'Where the key is: on this investigation’s card on the instructor resources page, under “Answer Key” and “Instructor Guide”. An activity cut from it asks the same questions, so the same key applies. The page explains how to ask for the passphrase.',
    'Dónde está la clave: en la tarjeta de esta investigación de la página de recursos para docentes, en «Answer Key» e «Instructor Guide». Una actividad recortada de ella hace las mismas preguntas, así que sirve la misma clave. La página explica cómo pedir la frase de acceso.',
  ],
  actKey: [
    'Where the key is: each investigation’s card on the instructor resources page holds its answer key and teaching notes, and an activity cut from it uses the same key. The page explains how to ask for the passphrase.',
    'Dónde está la clave: la tarjeta de cada investigación en la página de recursos para docentes tiene su clave de respuestas y sus notas docentes, y una actividad recortada de ella usa la misma clave. La página explica cómo pedir la frase de acceso.',
  ],
  materialsLink: [
    'Open the instructor resources',
    'Abrir los recursos para docentes',
  ],
  placement: ['Where it fits', 'Dónde encaja'],
  topic: ['What it is about', 'De qué trata'],
  back: ['Back to Teach', 'Volver a Enseñar'],
  yes: ['Yes', 'Sí'],
  afterInstall: [
    'Yes, once its data package has been installed from the catalog (it stays in the browser).',
    'Sí, una vez instalado su paquete de datos desde el catálogo (se queda en el navegador).',
  ],
  offYes: [
    'Yes: after Gravitas has been opened once, it works without a network.',
    'Sí: después de abrir Gravitas una vez, funciona sin red.',
  ],
  offOptional: [
    'Yes, once the lab has been opened online once; the lab is saved on the device.',
    'Sí, una vez abierto el laboratorio con conexión; el laboratorio queda guardado en el dispositivo.',
  ],
  actFormats: ['The formats', 'Los formatos'],
  actQuestion: ['The question it asks', 'La pregunta que plantea'],
  actFrom: ['Cut from this investigation', 'Sacada de esta investigación'],
  actTeaching: ['Notes for the class', 'Notas para la clase'],
  readMore: [
    'Everything for this activity is on its investigation page.',
    'Todo lo de esta actividad está en la página de su investigación.',
  ],
  progress: ['(progress-free)', '(sin progreso)'],
  typeRead: ['Read', 'Leer'],
  typePredict: ['Predict', 'Predecir'],
  typeQuestion: ['Question', 'Pregunta'],
  typeMeasure: ['Measure', 'Medir'],
  typeExplore: ['Explore', 'Explorar'],
  typeInstrument: ['Instrument', 'Instrumento'],
  typeDo: ['Do, in the workspace', 'Hacer, en el espacio de trabajo'],
  typeAnswer: ['Answer, checked', 'Responder, se comprueba'],
  typeChoose: ['Choose', 'Elegir'],
  mathNone: ['none', 'ninguna'],
  mathArithmetic: ['arithmetic', 'aritmética'],
  mathAlgebra: ['algebra', 'álgebra'],
  mathLogarithms: ['logarithms', 'logaritmos'],
  clSurvey: [
    'A survey course for non-majors',
    'Un curso general para quienes no estudian ciencias',
  ],
  clMajors: [
    'An introductory course for science majors',
    'Un curso introductorio para estudiantes de ciencias',
  ],
  clUpper: ['An upper-division course', 'Un curso de nivel avanzado'],
  chapter: ['chapter', 'capítulo'],
  section: ['section', 'sección'],
  tbNote: [
    'OpenStax Astronomy 2e, free to read and to adopt.',
    'OpenStax Astronomy 2e, de lectura y adopción libres.',
  ],
  tbNone: ['Not tied to a chapter.', 'No está ligada a un capítulo.'],
  filterTitle: ['Find something to teach', 'Encontrar algo que enseñar'],
  fLevel: ['Level', 'Nivel'],
  fFormat: ['Where it runs', 'Dónde se ejecuta'],
  fTime: ['Time', 'Tiempo'],
  fMath: ['Mathematics', 'Matemáticas'],
  fSubject: ['Subject', 'Tema'],
  fChapter: ['Textbook chapter', 'Capítulo del libro'],
  fData: ['Kind of data', 'Tipo de datos'],
  fOffline: ['Offline', 'Sin conexión'],
  fCourse: ['Course level', 'Nivel del curso'],
  fAny: ['Any', 'Cualquiera'],
  fOfflineOnly: ['Works offline', 'Funciona sin conexión'],
  fNoData: ['No measured data', 'Sin datos medidos'],
  fClear: ['Clear the filters', 'Quitar los filtros'],
  fCount: ['shown', 'mostradas'],
  fOf: ['of', 'de'],
  fEmpty: [
    'Nothing matches. Clear a filter.',
    'Nada coincide. Quite algún filtro.',
  ],
  fName: ['Investigation or activity', 'Investigación o actividad'],
  fPage: ['Adoption page', 'Página de adopción'],
  findLede: [
    'One page for every investigation and classroom activity: who it is for, how long it takes, what students must know, what is marked, and how to hand it out. Filter by level, format, time, mathematics, subject, textbook chapter, kind of data and whether it works offline.',
    'Una página para cada investigación y actividad de clase: a quién va dirigida, cuánto dura, qué debe saber el estudiantado, qué se califica y cómo repartirla. Filtre por nivel, formato, tiempo, matemáticas, tema, capítulo del libro, tipo de datos y si funciona sin conexión.',
  ],
  kindInv: ['Investigation', 'Investigación'],
  kindAct: ['Activity', 'Actividad'],
};
const w = key => bi({ en: W[key][0], es: W[key][1] });
const wt = key => ({ en: W[key][0], es: W[key][1] });

const MATH_KEY = {
  none: 'mathNone',
  arithmetic: 'mathArithmetic',
  algebra: 'mathAlgebra',
  logarithms: 'mathLogarithms',
};
const CL_KEY = { survey: 'clSurvey', majors: 'clMajors', upper: 'clUpper' };

/** Kinds of measured data a pack manifest may carry, for the filter. */
const DATA_KIND = {
  'light-curve': 'time-series',
  strain: 'time-series',
  spectrum: 'spectrum',
  catalog: 'table',
  'system-parameters': 'table',
  'rotation-curve': 'table',
  'model-grid': 'model',
  image: 'image',
};
export const DATA_KINDS = [
  'time-series',
  'spectrum',
  'table',
  'model',
  'image',
];
const DATA_KIND_WORDS = {
  'time-series': ['A time series', 'Una serie temporal'],
  spectrum: ['A spectrum', 'Un espectro'],
  table: ['A table of values', 'Una tabla de valores'],
  model: ['A model grid', 'Una malla de modelos'],
  image: ['An image', 'Una imagen'],
};

const STYLE = `<style>
      /* Local to the adoption pages (ADOPTION.md). */
      .ad-facts { display: grid; grid-template-columns: repeat(auto-fill, minmax(14rem, 1fr)); gap: var(--space-3) var(--space-5); margin: var(--space-5) 0; }
      .ad-facts dt { font-size: var(--text-2xs); letter-spacing: 0.08em; text-transform: uppercase; color: var(--text-secondary); }
      .ad-facts dd { margin: 0 0 var(--space-2); }
      .ad-actions { display: flex; flex-wrap: wrap; gap: var(--space-3); margin: var(--space-4) 0; }
      .ad-steps { padding-left: var(--space-6); }
      .ad-steps li { margin-bottom: var(--space-2); }
      .ad-type { color: var(--text-secondary); font-size: var(--text-sm); }
      .ad-deeper { font-size: var(--text-sm); color: var(--text-secondary); }
      .ad-embed pre { overflow-x: auto; padding: var(--space-3); background: var(--surface-2); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); font-size: var(--text-sm); }
      .ad-find { display: grid; grid-template-columns: repeat(auto-fill, minmax(10rem, 1fr)); gap: var(--space-3); margin: var(--space-4) 0; }
      .ad-find label { display: flex; flex-direction: column; gap: var(--space-1); font-size: var(--text-sm); }
      .ad-crumb { font-size: var(--text-sm); margin: 0 0 var(--space-3); }
    </style>`;

const pageHtml = ({
  file,
  title,
  description,
  eyebrow,
  lede,
  body,
  script,
  root = 'main',
  crumb = `<a href="/teaching/">${w('crumbTeach')}</a> / <a href="/teaching/find/">${w('crumbFind')}</a>`,
}) => {
  const url = `${SITE}/${path.dirname(file)}/`;
  // The tab title follows the page's language like the rest of it (P81 T-1):
  // the script below sets it from the language the browser chose and again
  // when the reader switches.
  const titles = JSON.stringify({
    en: `${title.en} | Gravitas`,
    es: `${title.es ?? title.en} | Gravitas`,
  }).replace(/</g, '\\u003c');
  const retitled = script.replace(
    /\n {6}(const refresh = mountFind\(\);\n {6})?mountShell\(\{ onLanguage: (.*?) \}\);/,
    (_, setup = '', handler) =>
      `\n      const titles = ${titles};\n      const retitle = () => {\n        document.title =\n          titles[document.documentElement.lang === 'es' ? 'es' : 'en'];\n      };\n      retitle();\n      ${setup}mountShell({\n        onLanguage: ${
        handler === '() => {}'
          ? 'retitle'
          : `() => {\n          retitle();\n          ${handler.replace(/^\(\) => /, '')};\n        }`
      },\n      });`
  );
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${html(title.en)} | Gravitas</title>
    <meta name="description" content="${html(description)}" />
    <link rel="canonical" href="${url}" />
    <meta property="og:type" content="article" />
    <meta property="og:title" content="${html(title.en)} | Gravitas" />
    <meta property="og:description" content="${html(description)}" />
    <meta property="og:url" content="${url}" />
    <meta property="og:image" content="${SITE}/social-card.png" />
    <meta name="theme-color" content="#07080f" />
    <link rel="icon" href="/favicon.ico" />
    <link rel="stylesheet" href="/css/tokens.css" />
    <link rel="stylesheet" href="/css/styles.css" />
    <link rel="stylesheet" href="/css/components.css" />
    <link rel="stylesheet" href="/css/page.css" />
    ${STYLE}
    <!-- shell:head -->
    <!-- /shell:head -->
  </head>
  <body class="doc-page">
    <!-- shell:header main=${root} -->
    <!-- /shell:header -->
    <main class="doc-main is-wide" id="main">
<!-- Generated by tools/build-adoption-pages.mjs. Do not edit by hand: node tools/build-adoption-pages.mjs -->
<p class="ad-crumb">${crumb}</p>
<div class="doc-hero">
<p class="doc-eyebrow">${eyebrow}</p>
<h1>${title.html}</h1>
<p class="doc-lede">${lede}</p>
</div>
${body}
    </main>
    <!-- shell:footer -->
    <!-- /shell:footer -->
${retitled}  </body>
</html>
`;
};

/** The page with the shell and the policy written in, as the repository holds it. */
const finish = (file, text) => withPolicy(file, withShell(file, text));

// ----------------------------------------------------------------------------
// Sources
// ----------------------------------------------------------------------------

/** A source's own words, in this project's: its "pack" is a dataset package here. */
const nouns = t =>
  String(t ?? '')
    .replace(/\bpacks\b/g, 'dataset packages')
    .replace(/\bpack\b/g, 'dataset package');

const rowOf = (term, desc) => `<div><dt>${term}</dt><dd>${desc}</dd></div>`;
const section = (id, heading, inner) =>
  `<section aria-labelledby="${id}-h">\n<h2 id="${id}-h">${heading}</h2>\n${inner}\n</section>`;
const list = items =>
  `<ul>\n${items.map(i => `<li>${i}</li>`).join('\n')}\n</ul>`;
const ext = (url, text) => `<a href="${html(url)}">${html(text)}</a>`;

/** Which sandbox scenarios a lesson's steps build, by the registry's key. */
const scenariosOf = lesson => [
  ...new Set((lesson.steps || []).map(s => s.setup?.scenario).filter(Boolean)),
];

/** The pack manifest behind a dataset record, as {name, kind, license, credit, citations}. */
function packRecord(id) {
  const m = readJson(`data-packs/${id}.json`);
  return {
    id,
    name: { en: m.title, es: m.title },
    kind: DATA_KIND[m.dataType] ?? 'table',
    license: nouns(m.license?.statement),
    credit: nouns(m.credit),
    retrieved: m.retrieved ?? null,
    citations: (m.citations ?? m.source?.citations ?? []).map(c => ({
      text: nouns(c.text),
      url:
        c.url ??
        (c.doi
          ? `https://doi.org/${c.doi}`
          : c.bibcode
            ? `https://ui.adsabs.harvard.edu/abs/${c.bibcode}`
            : null),
    })),
  };
}

function catalogRecord(catalog, id) {
  const e = catalog.entries.find(x => x.id === id);
  if (!e) throw new Error(`catalog has no ${id}`);
  return {
    id,
    name: e.title,
    kind: 'time-series',
    license: nouns((e.licenses || []).map(l => l.license).join('; ')),
    credit: '',
    retrieved: null,
    citations: (e.citations || []).map(c => ({
      text: nouns(c.text),
      url: c.url ?? null,
    })),
  };
}

/** Everything the pages read, loaded once. */
async function sources() {
  const library = readJson('library/library.json');
  const curation = readJson('tools/library-curation.json');
  const { INVESTIGATIONS } = await load('js/data/investigations.js');
  const { INSTRUCTOR_CONTENT } = await load('js/data/instructorContent.js');
  const { MANIFEST } = await load('js/data/investigations/manifest.js');
  const { layDepth } = await load('js/investigations/depthPure.js');
  const { ACTIVITIES } = await load('js/data/activities.js');
  const { EN_ACTIVITIES } = await load('js/i18n/en.activities.js');
  const { ES_ACTIVITIES } = await load('js/i18n/es.activities.js');
  const { EN_LIBRARY } = await load('js/i18n/en.library.js');
  const { ES_LIBRARY } = await load('js/i18n/es.library.js');
  const { EN_TEACHING } = await load('js/i18n/en.teaching.js');
  const { ES_TEACHING } = await load('js/i18n/es.teaching.js');
  const { EN } = await load('js/i18n/en.js');
  const { ES } = await load('js/i18n/es.js');
  const { SCENARIO_INFO, scenarioId } = await load('js/data/scenarioInfo.js');
  const { rawWorldLink, SCENARIO_SEED } = await load('tools/build-library.mjs');
  const { parseSeed, formatSeed } = await load('js/rng.js');
  const { WIDGET_FAMILIES } = await load('js/composer/widgetIds.js');
  const catalog = readJson('catalog/catalog.json');
  const guideSets = [
    [
      'js/observatory/guides/exoplanet.js',
      'js/i18n/en.exoplanet.js',
      'js/i18n/es.exoplanet.js',
    ],
    [
      'js/observatory/guides/populations.js',
      'js/i18n/en.populations.js',
      'js/i18n/es.populations.js',
    ],
    [
      'js/lab3d/guides/curriculum.js',
      'js/i18n/en.lab3dGuides.js',
      'js/i18n/es.lab3dGuides.js',
    ],
    [
      'js/mission/lab/curriculum.js',
      'js/i18n/en.missionLabGuides.js',
      'js/i18n/es.missionLabGuides.js',
    ],
  ];
  const guides = new Map();
  for (const [file, en, es] of guideSets) {
    const mod = await load(file);
    const enCat = Object.values(await load(en))[0];
    const esCat = Object.values(await load(es))[0];
    for (const g of mod.GUIDES)
      guides.set(g.id, {
        guide: g,
        en: enCat,
        es: esCat,
        targets: mod.TARGETS ?? {},
      });
  }
  // The lessons' Spanish, laid over the English by index.
  const spanish = new Map();
  const depthOf = new Map();
  for (const l of INVESTIGATIONS) {
    const f = `js/data/investigations/es/${l.id}.js`;
    spanish.set(
      l.id,
      existsSync(path.join(ROOT, f)) ? (await load(f)).default : null
    );
    const d = `js/data/investigations/depth/${l.id}.js`;
    if (existsSync(path.join(ROOT, d))) {
      const steps = (await load(d)).default.steps;
      const df = `js/data/investigations/depth/es/${l.id}.js`;
      const words = existsSync(path.join(ROOT, df))
        ? (await load(df)).default.steps
        : [];
      depthOf.set(l.id, { steps, words });
    }
  }
  return {
    library,
    curation,
    INVESTIGATIONS,
    INSTRUCTOR_CONTENT,
    MANIFEST,
    layDepth,
    ACTIVITIES,
    EN_ACTIVITIES,
    ES_ACTIVITIES,
    EN_LIBRARY,
    ES_LIBRARY,
    EN_TEACHING,
    ES_TEACHING,
    EN,
    ES,
    SCENARIO_INFO,
    scenarioId,
    rawWorldLink,
    seed: formatSeed(parseSeed(SCENARIO_SEED)),
    WIDGET_FAMILIES,
    catalog,
    guides,
    spanish,
    depthOf,
  };
}

const lib = (S, key) => ({ en: S.EN_LIBRARY[key], es: S.ES_LIBRARY[key] });

// ----------------------------------------------------------------------------
// One investigation
// ----------------------------------------------------------------------------

/** The step list of a lesson at every depth: [{title, type, depth}]. */
function lessonOutline(S, lesson) {
  const es = S.spanish.get(lesson.id);
  const base = lesson.steps.map((s, i) => ({
    sid: s.sid,
    title: { en: s.title, es: es?.steps?.[i]?.title ?? s.title },
    type: s.type,
    kind: s.kind,
    depth: s.depth ?? 'core',
    tool: s.tool?.id ?? null,
  }));
  const deep = S.depthOf.get(lesson.id);
  if (!deep) return base;
  const laid = S.layDepth({ ...lesson, steps: lesson.steps }, deep.steps);
  const words = new Map(
    deep.steps.map((s, i) => [s.sid, deep.words[i]?.title])
  );
  return laid.steps.map(s => {
    const orig = base.find(b => b.sid === s.sid);
    return (
      orig ?? {
        sid: s.sid,
        title: { en: s.title, es: words.get(s.sid) ?? s.title },
        type: s.type,
        kind: s.kind,
        depth: s.depth,
        tool: s.tool?.id ?? null,
      }
    );
  });
}

const STEP_TYPE = {
  read: 'typeRead',
  predict: 'typePredict',
  question: 'typeQuestion',
  measure: 'typeMeasure',
  explore: 'typeExplore',
  ellipse: 'typeInstrument',
  wedges: 'typeInstrument',
  do: 'typeDo',
  answer: 'typeAnswer',
  choose: 'typeChoose',
};
const DEPTH_KEY = {
  core: 'depthCore',
  quantitative: 'depthQuant',
  advanced: 'depthAdv',
};

function guideOutline(S, g) {
  const t = (id, key) => ({
    en: g.en[`gd.${g.guide.id}.${id}.${key}`],
    es: g.es[`gd.${g.guide.id}.${id}.${key}`],
  });
  return g.guide.steps.map(s => {
    const title = t(s.id, 'title');
    return {
      sid: s.id,
      title: title.en ? title : { en: s.id, es: s.id },
      type: s.kind,
      kind:
        s.kind === 'answer'
          ? 'numeric'
          : s.kind === 'choose' && s.correct !== null
            ? 'choice'
            : null,
      depth: s.path === 'both' || !s.path ? 'core' : s.path,
      tool: null,
      go: s.go?.open ?? null,
    };
  });
}

/** Datasets an investigation uses: pack records, from what each source declares. */
function datasetsOf(S, rec, lesson, guide) {
  const out = new Map();
  const add = r => out.set(r.id, r);
  if (lesson) {
    for (const f of readdirSync(path.join(ROOT, 'data-packs'))) {
      const m = readJson(`data-packs/${f}`);
      if (m.compatible?.investigations?.includes(lesson.id))
        add(packRecord(m.id));
    }
    for (const s of scenariosOf(lesson))
      for (const id of S.curation.scenarioPacks?.[s] ?? []) add(packRecord(id));
    const notes = new Set(
      scenariosOf(lesson)
        .map(s => S.curation.scenarioNotes?.[s])
        .filter(Boolean)
    );
    return { packs: [...out.values()], notes: [...notes] };
  }
  const opens = [
    ...new Set(guide.guide.steps.map(s => s.go?.open).filter(Boolean)),
  ];
  for (const o of opens) {
    const target = guide.targets[o];
    if (!target) continue;
    if (target.install) add(catalogRecord(S.catalog, target.install));
    else if (target.fixture) {
      const pack = S.curation.datasets[target.fixture]?.pack;
      if (!pack)
        throw new Error(`curation: dataset ${target.fixture} names no pack`);
      add(packRecord(pack));
    }
  }
  return {
    packs: [...out.values()],
    notes: [],
    installs: opens.some(o => guide.targets[o]?.install),
  };
}

function datasetRow(p) {
  const cites = p.citations.length
    ? `<ul>${p.citations
        .map(c => `<li>${c.url ? ext(c.url, c.text) : html(c.text)}</li>`)
        .join('')}</ul>`
    : '';
  return `<tr><td>${html(p.name.en)}</td><td>${bi(wt2(DATA_KIND_WORDS[p.kind]))}</td><td>${html(p.license)}${p.credit ? `<br>${w('credit')}: ${html(p.credit)}` : ''}</td><td>${cites}</td></tr>`;
}
const wt2 = ([en, es]) => ({ en, es });

const OFFLINE = {
  lesson: 'offYes',
  observatory: 'offOptional',
  lab3d: 'offOptional',
  mission: 'offOptional',
};

function instrumentsOf(S, outline) {
  const ids = [
    ...new Set(
      outline
        .map(
          o =>
            o.tool ?? (['ellipse', 'wedges'].includes(o.type) ? o.type : null)
        )
        .filter(Boolean)
    ),
  ];
  const families = Object.entries(S.WIDGET_FAMILIES).filter(([, members]) =>
    ids.some(i => members.includes(i))
  );
  return { ids, families: families.map(([f]) => f) };
}

function investigationPage(S, entry) {
  const id = entry.id.replace('investigation:', '');
  const lesson = S.INVESTIGATIONS.find(l => l.id === id);
  const guide = S.guides.get(id);
  const ic = S.INSTRUCTOR_CONTENT[id];
  const es = S.spanish.get(id);
  const outline = lesson ? lessonOutline(S, lesson) : guideOutline(S, guide);
  const file = `${BASE}/investigation/${id}/index.html`;
  const title = entry.title;

  // Scoring
  const auto = outline.filter(
    o => o.kind === 'choice' || o.kind === 'numeric'
  ).length;
  const judge = outline.filter(o => o.kind === 'short').length;
  const record = lesson
    ? outline.filter(o => o.type === 'predict').length
    : outline.filter(o => o.type === 'choose' && o.kind === null).length;

  // Facts
  const tb = entry.textbook;
  const chapterTitle = S.curation.textbookChapters[String(tb?.chapter)];
  const tbText = tb
    ? `${bi(wt('tbNote'))} ${bi(wt('chapter'))} ${tb.chapter}${tb.section ? `, ${bi(wt('section'))} ${tb.section}` : ''}: <span lang="en">${html(chapterTitle)}</span>`
    : bi(wt('tbNone'));
  const subjects = (entry.subjects || [])
    .map(sid => S.library.subjects.find(x => x.id === sid))
    .filter(Boolean)
    .map(x => plain(x.label))
    .join(', ');
  const fmtWords = lib(S, `lib.format.${entry.format}`);
  const calc = lib(S, `lib.calculation.${entry.calculation}`);
  const durationText = minutesOf(entry.duration);
  const datasets = datasetsOf(S, entry, lesson, guide);
  const offlineKey = datasets.installs ? 'afterInstall' : OFFLINE[entry.format];
  const instr = instrumentsOf(S, outline);

  const facts = [
    rowOf(w('format'), plain(fmtWords)),
    rowOf(w('level'), plain(lib(S, `lib.level.${entry.level}`))),
    rowOf(w('courseLevel'), bi(wt(CL_KEY[entry.courseLevel]))),
    rowOf(w('textbook'), tbText),
    rowOf(
      w('time'),
      `${durationText} ${bi(wt('minutes'))}<br><span class="ad-type">${plain(lib(S, `lib.length.${entry.length}`))}</span>`
    ),
    rowOf(w('math'), bi(wt(MATH_KEY[entry.mathematics]))),
    rowOf(w('calc'), plain(calc)),
    rowOf(w('subjects'), subjects),
    rowOf(
      w('steps'),
      `${entry.steps}${lesson?.depths ? ` (${lesson.depths} depths)` : ''}`
    ),
    rowOf(w('offline'), bi(wt(offlineKey))),
  ].join('\n');

  const previewHref = lesson ? `/?author=${id}&view=student` : entry.route;
  const actions = `<div class="ad-actions">
<a class="ui-button is-primary" href="${html(entry.route)}">${w('start')}</a>
<a class="ui-button" href="${html(previewHref)}" data-preview>${w('preview')}</a>
</div>
<p class="doc-note">${lesson ? w('previewNote') : w('previewGuide')}</p>`;

  // Objectives
  let objectives = '';
  if (lesson) {
    objectives = section(
      'objectives',
      w('objectives'),
      list(
        lesson.objectives.map((o, i) =>
          bi({ en: o, es: es?.objectives?.[i] ?? o })
        )
      )
    );
  }

  // Prerequisites
  const declared = (entry.prerequisites || []).map(p => {
    const rec = S.library.entries.find(e => e.id === p);
    return `<a href="/${BASE}/investigation/${p.replace('investigation:', '')}/">${plain(rec.title)}</a>`;
  });
  const stated = ic?.priorKnowledge ?? [];
  const prereq = section(
    'prereq',
    w('prereq'),
    `<h3>${w('prereqDeclared')}</h3>\n${declared.length ? list(declared) : `<p>${w('prereqNone')}</p>`}
<h3>${w('prereqStated')}</h3>\n${stated.length ? list(stated.map(s => bi({ en: s, es: s }, { same: true }))) + `<p class="ad-type">${w('englishOnly')}</p>` : `<p>${w('prereqStatedNone')}</p>`}`
  );

  // Outline
  const outlineHtml = section(
    'outline',
    w('outline'),
    `<p>${w('outlineNote')}</p>\n<ol class="ad-steps">\n${outline
      .map(
        o =>
          `<li>${plain(o.title)} <span class="ad-type">(${bi(wt(STEP_TYPE[o.type] ?? 'typeExplore'))}${o.depth !== 'core' ? `; <span class="ad-deeper">${bi(wt(DEPTH_KEY[o.depth] ?? 'depthCore'))}</span>` : ''})</span></li>`
      )
      .join('\n')}\n</ol>`
  );

  // Instruments
  const instrumentsHtml = section(
    'instruments',
    w('instruments'),
    instr.ids.length
      ? `<p>${instr.ids.map(i => `<code>${html(i)}</code>`).join(', ')}</p>`
      : lesson
        ? `<p>${w('instrumentsNone')}</p>`
        : `<p>${bi({ en: 'The instruments are the tools of the lab it runs in:', es: 'Los instrumentos son las herramientas del laboratorio donde se ejecuta:' })} ${plain(fmtWords)}.</p>`
  );

  // Datasets
  const dataHtml = section(
    'data',
    w('datasets'),
    datasets.packs.length || datasets.notes.length
      ? `${datasets.packs.length ? `<div class="doc-table-wrap" tabindex="0"><table class="doc-table"><thead><tr><th scope="col">${bi({ en: 'Dataset', es: 'Conjunto de datos' })}</th><th scope="col">${bi({ en: 'Kind', es: 'Tipo' })}</th><th scope="col">${bi({ en: 'License and credit', es: 'Licencia y crédito' })}</th><th scope="col">${w('cite')}</th></tr></thead><tbody>\n${datasets.packs.map(datasetRow).join('\n')}\n</tbody></table></div>` : ''}${datasets.notes.map(n => `<p>${bi({ en: n.en, es: n.es })}</p>`).join('')}`
      : `<p>${w('datasetsNone')}</p>`
  );

  // Wrong turns (claims only: the responses sit with the answer key)
  const turns = (ic?.misconceptions ?? []).map(m => m.claim);
  const wrongHtml = section(
    'wrong',
    w('wrong'),
    turns.length
      ? `<p>${w('wrongNote')}</p>\n${list(turns.map(t => bi({ en: t, es: t }, { same: true })))}<p class="ad-type">${w('englishOnly')}</p>`
      : `<p>${w('wrongNone')}</p>`
  );

  // Topic and placement (public parts of the guide)
  const guideHtml = ic
    ? section(
        'guide',
        w('placement'),
        `<p><strong>${w('topic')}.</strong> ${bi({ en: ic.topic, es: ic.topic }, { same: true })}</p>\n<p>${bi({ en: ic.placement, es: ic.placement }, { same: true })}</p>\n<p class="ad-type">${w('englishOnly')}</p>`
      )
    : '';

  // Accessibility
  const accessHtml = section(
    'access',
    w('access'),
    `<p>${bi({ en: S.EN_TEACHING['teach.access.keyboard.text'], es: S.ES_TEACHING['teach.access.keyboard.text'] })}</p>
<p>${bi({ en: S.EN_TEACHING['teach.access.motion.text'], es: S.ES_TEACHING['teach.access.motion.text'] })}</p>
<p>${bi({ en: S.EN_TEACHING['teach.access.language.text'], es: S.ES_TEACHING['teach.access.language.text'] })}</p>
<p>${w('accessMore')} <a href="https://github.com/gravitas-sim/gravitas-sim.github.io/blob/main/ACCESSIBILITY.md">ACCESSIBILITY.md</a></p>`
  );

  // Scoring
  const scoreHtml = section(
    'scoring',
    w('scoring'),
    `<ul>
<li>${w('scoreAuto')}: <strong>${auto}</strong></li>
<li>${w('scoreJudge')}: <strong>${judge}</strong></li>
<li>${w('scoreRecord')}: <strong>${record}</strong></li>
</ul>\n<p>${lesson ? w('scoreNote') : w('scoreGuide')}</p>`
  );

  // Assignment
  const acts = S.ACTIVITIES.filter(a => a.lesson === id);
  const templates = acts.flatMap(a =>
    a.formats.map(f => {
      const rec = S.library.entries.find(
        e => e.id === `activity:${a.id}/${f.id}`
      );
      return `<a href="/${BASE}/activity/${a.id}/">${plain(rec.title)}</a> (${f.minutes} ${bi(wt('minutes'))}; <a href="${html(rec.route)}">${w('start')}</a>)`;
    })
  );
  const assignHtml = section(
    'assign',
    w('assign'),
    `${lesson ? `<p><a class="ui-button" href="/?assign=${id}">${w('assignBuilder')}</a> <a class="ui-button" href="/studio/course/?add=${id}">${w('addCourse')}</a></p>\n<p>${w('assignBuilderNote')}</p>\n<p><a class="ui-button" href="/?assign=${id}&amp;route=short">${w('shortRoute')}</a> ${shortRoute(lesson).sids.length} ${bi(wt('stepsLower'))}, ${bi(wt('about'))} ${shortRoute(lesson).minutes} ${bi(wt('minutes'))}</p>\n<p>${w('shortRouteNote')}</p>` : `<p>${w('assignNone')}</p>`}
${templates.length ? `<h3>${w('templates')}</h3>\n${list(templates)}` : ''}`
  );

  // Embed
  let embedHtml;
  const keys = lesson
    ? [
        ...new Set(
          scenariosOf(lesson)
            .map(S.scenarioId)
            .filter(k => k && S.SCENARIO_INFO[k])
        ),
      ]
    : [];
  if (keys.length) {
    const figs = keys.map(k => {
      const src = `${SITE}/?embed=1&ev=1&reset=scenario#${S.rawWorldLink({ v: 1, s: k, seed: S.seed })}`;
      const name = S.EN[`scenario.${k}.title`] ?? k;
      return `<details><summary>${bi({ en: name, es: S.ES[`scenario.${k}.title`] ?? name })}</summary><pre>${html(`<iframe src="${src}" title="${name}" loading="lazy" style="width:100%;aspect-ratio:16/10;border:0" allowfullscreen></iframe>`)}</pre></details>`;
    });
    embedHtml = section(
      'embed',
      w('embed'),
      `<p>${w('embedNote')}</p>\n<div class="ad-embed">\n${figs.join('\n')}\n</div>`
    );
  } else {
    embedHtml = section(
      'embed',
      w('embed'),
      `<p>${w('embedNone')} <a href="/figure/">${w('embedBuilder')}</a></p>`
    );
  }

  // Materials
  const materialsHtml = section(
    'materials',
    w('materials'),
    `<p>${w('materialsNote')}</p>\n<p>${w('materialsKey')}</p>\n<p><a class="ui-button" href="/instructors/">${w('materialsLink')}</a></p>`
  );

  const body = [
    `<dl class="ad-facts">\n${facts}\n</dl>`,
    actions,
    objectives,
    guideHtml,
    prereq,
    outlineHtml,
    instrumentsHtml,
    dataHtml,
    wrongHtml,
    scoreHtml,
    accessHtml,
    assignHtml,
    embedHtml,
    materialsHtml,
    `<p><a href="/teaching/find/">${w('back')}</a></p>`,
  ]
    .filter(Boolean)
    .join('\n');

  const text = pageHtml({
    file,
    title: { en: title.en, es: title.es, html: plain(title) },
    description: `${title.en}: ${entry.summary.en}`,
    eyebrow: w('eyebrowInv'),
    lede: plain(entry.summary),
    body,
    script: `    <script type="module">\n      import { mountShell } from '/js/shell.js';\n      // The page is written in both languages: show the one this browser chose.\n      try {\n        if ((localStorage.getItem('gravitas_locale') || '').startsWith('es'))\n          document.documentElement.lang = 'es';\n      } catch {\n        /* storage blocked: English */\n      }\n      mountShell({ onLanguage: () => {} });\n    </script>\n`,
  });
  return {
    file,
    html: finish(file, text),
    row: {
      id: entry.id,
      slug: id,
      kind: 'investigation',
      format: entry.format,
      title: entry.title,
      summary: entry.summary,
      level: entry.level,
      courseLevel: entry.courseLevel,
      length: entry.length,
      duration: entry.duration,
      mathematics: entry.mathematics,
      subjects: entry.subjects || [],
      chapter: entry.textbook?.chapter ?? null,
      data: datasets.packs.length
        ? [...new Set(datasets.packs.map(p => p.kind))].sort()
        : [],
      offline: true,
      url: `/${BASE}/investigation/${id}/`,
      counts: { steps: entry.steps, auto, judge, record },
      datasets: datasets.packs.map(p => p.id),
      instruments: instr.ids,
    },
  };
}

// ----------------------------------------------------------------------------
// One activity
// ----------------------------------------------------------------------------

function activityPage(S, a) {
  const entries = a.formats.map(f =>
    S.library.entries.find(e => e.id === `activity:${a.id}/${f.id}`)
  );
  const inv = S.library.entries.find(e => e.id === `investigation:${a.lesson}`);
  const file = `${BASE}/activity/${a.id}/index.html`;
  const title = {
    en: S.EN_ACTIVITIES[a.titleId],
    es: S.ES_ACTIVITIES[a.titleId],
  };
  const question = {
    en: S.EN_ACTIVITIES[a.questionId],
    es: S.ES_ACTIVITIES[a.questionId],
  };
  const rows = entries
    .map(e => {
      const f = a.formats.find(x => e.id.endsWith(`/${x.id}`));
      return `<tr><td>${plain(lib(S, `lib.format.${f.id}`))}</td><td>${f.minutes} ${bi(wt('minutes'))}</td><td>${f.steps.length}</td><td><a class="ui-button" href="${html(e.route)}">${w('start')}</a></td></tr>`;
    })
    .join('\n');
  const body = `<dl class="ad-facts">
${rowOf(w('level'), plain(lib(S, `lib.level.${inv.level}`)))}
${rowOf(w('courseLevel'), bi(wt(CL_KEY[inv.courseLevel])))}
${rowOf(w('textbook'), inv.textbook ? `${bi(wt('chapter'))} ${inv.textbook.chapter}: <span lang="en">${html(S.curation.textbookChapters[String(inv.textbook.chapter)])}</span>` : bi(wt('tbNone')))}
${rowOf(w('math'), bi(wt(MATH_KEY[inv.mathematics])))}
${rowOf(w('subjects'), (inv.subjects || []).map(sid => plain(S.library.subjects.find(x => x.id === sid).label)).join(', '))}
${rowOf(w('actFrom'), `<a href="/${BASE}/investigation/${a.lesson}/">${plain(inv.title)}</a>`)}
</dl>
${section('question', w('actQuestion'), `<p>${plain(question)}</p>`)}
${section('formats', w('actFormats'), `<div class="doc-table-wrap" tabindex="0"><table class="doc-table"><thead><tr><th scope="col">${w('format')}</th><th scope="col">${w('time')}</th><th scope="col">${w('steps')}</th><th scope="col"><span class="gs-vh">${w('start')}</span></th></tr></thead><tbody>\n${rows}\n</tbody></table></div>`)}
<p>${w('readMore')}</p>
<p>${w('actKey')}</p>
<p><a href="/teaching/find/">${w('back')}</a></p>`;
  const text = pageHtml({
    file,
    title: { en: title.en, es: title.es, html: plain(title) },
    description: `${title.en}: ${question.en}`,
    eyebrow: w('eyebrowAct'),
    lede: plain(question),
    body,
    script: `    <script type="module">\n      import { mountShell } from '/js/shell.js';\n      // The page is written in both languages: show the one this browser chose.\n      try {\n        if ((localStorage.getItem('gravitas_locale') || '').startsWith('es'))\n          document.documentElement.lang = 'es';\n      } catch {\n        /* storage blocked: English */\n      }\n      mountShell({ onLanguage: () => {} });\n    </script>\n`,
  });
  return {
    file,
    html: finish(file, text),
    row: {
      id: `activity:${a.id}`,
      slug: a.id,
      kind: 'activity',
      format: 'activity',
      title,
      summary: question,
      level: inv.level,
      courseLevel: inv.courseLevel,
      length: entries.some(e => e.length === 'demo')
        ? 'demo'
        : entries[0].length,
      duration: {
        min: Math.min(...a.formats.map(f => f.minutes)),
        max: Math.max(...a.formats.map(f => f.minutes)),
      },
      mathematics: inv.mathematics,
      subjects: inv.subjects || [],
      chapter: inv.textbook?.chapter ?? null,
      data: [],
      offline: true,
      url: `/${BASE}/activity/${a.id}/`,
    },
  };
}

// ----------------------------------------------------------------------------
// The index
// ----------------------------------------------------------------------------

/**
 * A menu choice. An <option> holds text and nothing else, so it carries both
 * languages as attributes and js/teach/find.js writes the one the page is in.
 */
const opt = (value, { en, es }) =>
  `<option value="${html(value)}" data-en="${html(en)}" data-es="${html(es ?? en)}">${html(en)}</option>`;

function findPage(S, rows) {
  const file = `${BASE}/find/index.html`;
  const subjects = S.library.subjects.filter(s =>
    rows.some(r => r.subjects.includes(s.id))
  );
  const chapters = [...new Set(rows.map(r => r.chapter).filter(Boolean))].sort(
    (a, b) => a - b
  );
  // A choice no row has would be a filter that finds nothing: left out.
  const FIELD = {
    level: r => [r.level],
    course: r => [r.courseLevel],
    format: r => [r.format],
    length: r => [r.length],
    math: r => [r.mathematics],
    subject: r => r.subjects,
    chapter: r => [String(r.chapter)],
    data: r => (r.data.length ? r.data : ['none']),
    offline: r => (r.offline ? ['yes'] : []),
  };
  const sel = (id, label, options) => {
    const key = id.replace('f-', '');
    const has = new Set(rows.flatMap(FIELD[key]));
    const kept = options.filter(o => has.has(/value="([^"]*)"/.exec(o)[1]));
    return `<label>${label}<select class="ui-select" id="${id}" data-filter="${key}">${opt('', wt('fAny'))}${kept.join('')}</select></label>`;
  };
  const filters = `<form class="ad-find" id="adFilters" role="search" aria-label="${html(W.filterTitle[0])}">
${sel(
  'f-level',
  w('fLevel'),
  ['beginner', 'intro'].map(l => opt(l, lib(S, `lib.level.${l}`)))
)}
${sel(
  'f-course',
  w('fCourse'),
  ['survey', 'majors', 'upper'].map(l => opt(l, wt(CL_KEY[l])))
)}
${sel(
  'f-format',
  w('fFormat'),
  ['lesson', 'observatory', 'lab3d', 'mission', 'activity'].map(f =>
    opt(f, f === 'activity' ? wt('kindAct') : lib(S, `lib.format.${f}`))
  )
)}
${sel(
  'f-length',
  w('fTime'),
  ['demo', 'period', 'long'].map(l => opt(l, lib(S, `lib.length.${l}`)))
)}
${sel(
  'f-math',
  w('fMath'),
  Object.keys(MATH_KEY).map(m => opt(m, wt(MATH_KEY[m])))
)}
${sel(
  'f-subject',
  w('fSubject'),
  subjects.map(s => opt(s.id, s.label))
)}
${sel(
  'f-chapter',
  w('fChapter'),
  chapters.map(c =>
    opt(String(c), {
      en: `${W.chapter[0]} ${c}: ${S.curation.textbookChapters[String(c)]}`,
      es: `${W.chapter[1]} ${c}: ${S.curation.textbookChapters[String(c)]}`,
    })
  )
)}
${sel('f-data', w('fData'), [opt('none', wt('fNoData')), ...DATA_KINDS.map(k => opt(k, wt2(DATA_KIND_WORDS[k])))])}
${sel('f-offline', w('fOffline'), [opt('yes', wt('fOfflineOnly'))])}
<button type="button" class="ui-button is-quiet" id="adClear" hidden>${w('fClear')}</button>
</form>
<p id="adCount" class="doc-note" role="status" aria-live="polite"></p>`;
  const tr = r => {
    const dur = r.duration
      ? `${r.duration.min}${r.duration.max !== r.duration.min ? `-${r.duration.max}` : ''}`
      : '';
    const attrs = [
      ['level', r.level],
      ['course', r.courseLevel],
      ['format', r.format],
      ['length', r.length],
      ['math', r.mathematics],
      ['subject', r.subjects.join(' ')],
      ['chapter', r.chapter ?? ''],
      ['data', r.data.length ? r.data.join(' ') : 'none'],
      ['offline', r.offline ? 'yes' : 'no'],
    ]
      .map(([k, v]) => `data-${k}="${html(v)}"`)
      .join(' ');
    return `<tr ${attrs}><td><a href="${r.url}">${plain(r.title)}</a></td><td>${r.kind === 'activity' ? bi(wt('kindAct')) : bi(wt('kindInv'))}</td><td>${plain(lib(S, `lib.level.${r.level}`))}</td><td>${dur}</td><td>${bi(wt(MATH_KEY[r.mathematics]))}</td></tr>`;
  };
  const table = `<div class="doc-table-wrap" tabindex="0"><table class="doc-table" id="adTable"><thead><tr><th scope="col">${w('fName')}</th><th scope="col">${bi({ en: 'Kind', es: 'Tipo' })}</th><th scope="col">${w('fLevel')}</th><th scope="col">${w('fTime')} (${bi(wt('minutes'))})</th><th scope="col">${w('fMath')}</th></tr></thead><tbody>\n${rows.map(tr).join('\n')}\n</tbody></table></div>
<p id="adEmpty" class="doc-note" hidden>${w('fEmpty')}</p>`;
  const body = `${section('filters', w('filterTitle'), filters)}\n${table}\n${topicsLine(S)}`;
  const text = pageHtml({
    file,
    title: {
      en: W.crumbFind[0],
      es: W.crumbFind[1],
      html: plain(wt('crumbFind')),
    },
    description: W.findLede[0],
    eyebrow: w('crumbTeach'),
    lede: plain(wt('findLede')),
    body,
    script: `    <script type="module">\n      import { mountShell } from '/js/shell.js';\n      import { mountFind } from '/js/teach/find.js';\n      // The page is written in both languages: show the one this browser chose.\n      try {\n        if ((localStorage.getItem('gravitas_locale') || '').startsWith('es'))\n          document.documentElement.lang = 'es';\n      } catch {\n        /* storage blocked: English */\n      }\n      const refresh = mountFind();\n      mountShell({ onLanguage: () => refresh?.() });\n    </script>\n`,
  }).replace(/<p class="ad-crumb">.*<\/p>\n/, '');
  return { file, html: finish(file, text) };
}

/**
 * The alignment page: every investigation and activity under the OpenStax
 * Astronomy 2e chapter it declares (Prompt 97). Generated from the same rows
 * the index filters, so a chapter can never be listed that no page declares.
 */
/** The Library's topic pages (Prompt 163), one link per subject. */
const topicsLine = S =>
  `<p>${bi({ en: 'Browse the Library by topic:', es: 'Explore la Biblioteca por tema:' })} ${S.library.subjects
    .map(s => `<a href="/library/?topic=${html(s.id)}">${plain(s.label)}</a>`)
    .join(', ')}.</p>`;

function alignmentPage(S, rows) {
  const file = `${BASE}/alignment/index.html`;
  const chapters = [...new Set(rows.map(r => r.chapter).filter(Boolean))].sort(
    (a, b) => a - b
  );
  const one = r =>
    `<li><a href="${html(r.url)}">${plain(r.title)}</a> (${bi(wt(CL_KEY[r.courseLevel]))}, ${r.duration ? `${minutesOf(r.duration)} ${bi(wt('minutes'))}` : ''})</li>`;
  const body = `<p>${bi({ en: 'The chapter is the claim; check it against the edition you teach from (the chapters were matched from the table of contents). Each link opens the investigation’s adoption page.', es: 'El capítulo es la afirmación; compruébelo con la edición que usa (los capítulos se asociaron a partir del índice). Cada enlace abre la página de adopción de la investigación.' })}</p>
${chapters
  .map(ch => {
    const here = rows.filter(r => r.chapter === ch);
    return section(
      `ch${ch}`,
      `${bi(wt('chapter'))} ${ch}: <span lang="en">${html(S.curation.textbookChapters[String(ch)])}</span>`,
      list(here.map(one))
    );
  })
  .join('\n')}
${topicsLine(S)}
<p><a href="/teaching/find/">${w('back')}</a></p>`;
  const title = {
    en: 'Textbook alignment',
    es: 'Alineación con el libro de texto',
  };
  const text = pageHtml({
    file,
    title: { ...title, html: plain(title) },
    description:
      'Every Gravitas investigation and activity by OpenStax Astronomy 2e chapter.',
    eyebrow: w('crumbTeach'),
    lede: bi({
      en: 'Which investigations go with which chapter of OpenStax Astronomy 2e.',
      es: 'Qué investigaciones van con cada capítulo de OpenStax Astronomy 2e.',
    }),
    body,
    script: `    <script type="module">\n      import { mountShell } from '/js/shell.js';\n      try {\n        if ((localStorage.getItem('gravitas_locale') || '').startsWith('es'))\n          document.documentElement.lang = 'es';\n      } catch {\n        /* storage blocked: English */\n      }\n      mountShell({ onLanguage: () => {} });\n    </script>\n`,
  });
  return { file, html: finish(file, text) };
}

/**
 * The adopter's guide (Prompt 114): the first week, the first semester, what
 * the software does and does not do, access, privacy, help and citing, for an
 * instructor who has never used it. The counts are read from the Library
 * (library/library.json); the words around them are written here. Every link
 * names a surface that exists, and e2e/adopterGuide.spec.js follows each one.
 */
function guidePage(S) {
  const file = `${BASE}/adopt/index.html`;
  const entries = S.library.entries;
  const n = kind => entries.filter(e => e.kind === kind);
  const lessons = n('investigation').filter(e => e.format === 'lesson').length;
  const total = n('investigation').length;
  const guided = total - lessons;
  const scenarios = n('scenario').length;
  const scenarios3d = n('scenario').filter(e =>
    e.id.startsWith('scenario:3d-')
  ).length;
  const sandbox = scenarios - scenarios3d;
  const deep = n('investigation').filter(e => e.depths).length;
  const courses = n('course').filter(
    e => !e.id.startsWith('course:community.')
  ).length;
  const cuts = n('activity').length;
  const REPO = 'https://github.com/gravitas-sim/gravitas-sim.github.io';
  const T = (en, es) => bi({ en, es });
  const a = (href, en, es) => `<a href="${html(href)}">${T(en, es)}</a>`;
  const P = (en, es) => `<p>${T(en, es)}</p>`;
  const dl = rows =>
    `<dl class="ad-facts">\n${rows.map(([t, d]) => rowOf(T(...t), d)).join('\n')}\n</dl>`;
  const ol = items =>
    `<ol class="ad-steps">\n${items.map(i => `<li>${i}</li>`).join('\n')}\n</ol>`;
  const lead = (en, es) => `<strong>${T(en, es)}</strong>`;

  const toc = [
    ['what', 'What you are adopting', 'Qué va a adoptar'],
    ['week', 'The first week', 'La primera semana'],
    ['semester', 'The first semester', 'El primer semestre'],
    ['does', 'What it does and does not do', 'Qué hace y qué no hace'],
    ['access', 'Accessibility', 'Accesibilidad'],
    ['privacy', 'Privacy', 'Privacidad'],
    [
      'help',
      'Getting help and reporting a problem',
      'Obtener ayuda e informar de un problema',
    ],
    ['cite', 'How to cite', 'Cómo citar'],
  ];

  const body = [
    `<p id="toc-h"><strong>${T('On this page', 'En esta página')}</strong></p>\n<nav class="ad-toc" aria-labelledby="toc-h">${list(
      toc.map(([id, en, es]) => `<a href="#${id}-h">${T(en, es)}</a>`)
    )}</nav>`,
    section(
      'what',
      T('What you are adopting', 'Qué va a adoptar'),
      P(
        `Gravitas is a browser-based gravity simulator with ${total} guided investigations (${lessons} that run in the simulation and ${guided} in the Observatory, the 3-D lab and the mission lab), ${scenarios} ready-made scenarios (${sandbox} in the sandbox and ${scenarios3d} reference systems in the 3-D lab), ${courses} ready-made courses and ${cuts} cuts of classroom activities. The software is MIT licensed and the teaching material is CC BY 4.0, both free. These counts are read from the Library when this page is built.`,
        `Gravitas es un simulador de gravedad que funciona en el navegador, con ${total} investigaciones guiadas (${lessons} que se ejecutan en la simulación y ${guided} en el Observatorio, el laboratorio 3-D y el laboratorio de misiones), ${scenarios} escenarios ya preparados (${sandbox} en la simulación libre y ${scenarios3d} sistemas de referencia del laboratorio 3-D), ${courses} cursos ya preparados y ${cuts} cortes de actividades de clase. El software tiene licencia MIT y el material docente CC BY 4.0, ambos gratuitos. Estos números se leen de la Biblioteca cuando se construye esta página.`
      ) +
        P(
          'No classroom evaluation of Gravitas has been published. This page describes what the software does and how to use it; it makes no claim about what students gain from it. If you run it with a class, the classroom evidence kit (below) is how to find out.',
          'No se ha publicado ninguna evaluación en el aula de Gravitas. Esta página describe lo que hace el software y cómo usarlo; no afirma nada sobre lo que el estudiantado obtiene de él. Si lo usa con un grupo, el kit de evidencia de aula (más abajo) es la forma de averiguarlo.'
        )
    ),
    section(
      'week',
      T('The first week', 'La primera semana'),
      P(
        'Six steps, from nothing to reviewing a class’s work. Nothing needs an account, an install or a server.',
        'Seis pasos, desde cero hasta revisar el trabajo de un grupo. Nada requiere una cuenta, una instalación ni un servidor.'
      ) +
        ol([
          `${lead('Choose a sequence.', 'Elija una secuencia.')} ${T(
            'Open the index of adoption pages and filter by level, time, mathematics, subject, textbook chapter or kind of data; each page says who the investigation is for, how long it takes and what students should know first. The textbook alignment lists them by OpenStax Astronomy 2e chapter, and the Library offers ready-made courses.',
            'Abra el índice de páginas de adopción y filtre por nivel, tiempo, matemáticas, tema, capítulo del libro o tipo de datos; cada página dice a quién va dirigida la investigación, cuánto dura y qué debería saber antes el estudiantado. La alineación con el libro las enumera por capítulo de OpenStax Astronomy 2e, y la Biblioteca ofrece cursos ya preparados.'
          )} ${a('/teaching/find/', 'Adoption pages', 'Páginas de adopción')}, ${a('/teaching/alignment/', 'Textbook alignment', 'Alineación con el libro')}, ${a('/library/', 'Library', 'Biblioteca')}.`,
          `${lead('Preview it as a student.', 'Véala como estudiante.')} ${T(
            'On an adoption page, “Preview as a student” opens the investigation clean, from the first step, and neither reads nor writes the progress saved in your browser. The Observatory, 3-D and mission investigations have no such mode: their link keeps only the record that it was opened. Do the investigation once yourself before anyone else does.',
            'En una página de adopción, «Vista previa como estudiante» abre la investigación limpia, desde el primer paso, y no lee ni escribe el progreso guardado en su navegador. Las investigaciones del Observatorio, 3-D y misiones no tienen ese modo: su enlace solo guarda el registro de que se abrió. Haga usted la investigación una vez antes que nadie.'
          )}`,
          `${lead('Build an activity.', 'Cree una actividad.')} ${T(
            'On the same page, “Make an activity from it” lets you choose the steps, add a note and a class code, and gives you one link. The class code is the same on every student’s link, so it names the class and not the student. The short route is a ready-made cut estimated at 25 minutes or less.',
            'En la misma página, «Crear una actividad a partir de ella» le permite elegir los pasos, añadir una nota y un código de grupo, y le da un enlace. El código de grupo es el mismo en el enlace de cada estudiante, así que nombra al grupo y no al estudiante. La ruta corta es un corte ya preparado, estimado en 25 minutos o menos.'
          )}`,
          `${lead('Post the link.', 'Publique el enlace.')} ${T(
            'The distribution kit turns the link into a code to scan, a one-page handout in English, Spanish or both, markup for a web page, and notes for Canvas, Moodle and Blackboard. The link carries the activity; students need nothing else.',
            'El kit de distribución convierte el enlace en un código para escanear, un folleto de una página en inglés, español o ambos, código para una página web y notas para Canvas, Moodle y Blackboard. El enlace lleva la actividad; el estudiantado no necesita nada más.'
          )} ${a('/teaching/kit/', 'Distribution kit', 'Kit de distribución')}.`,
          `${lead('Collect the reports.', 'Reúna los informes.')} ${T(
            'Students work in their own browsers and save their lab report as a PDF, which carries a token. They hand it in however you already collect work: your learning platform, email or paper. Ask them to type their login or student number where the report asks for a name; that is how review tells students apart.',
            'El estudiantado trabaja en su propio navegador y guarda su informe de laboratorio como PDF, que lleva una ficha. Lo entrega como usted ya recoge los trabajos: su plataforma de aprendizaje, el correo o el papel. Pídales que escriban su usuario o número de estudiante donde el informe pide un nombre; así distingue la revisión a unos estudiantes de otros.'
          )}`,
          `${lead('Review the work.', 'Revise el trabajo.')} ${T(
            'Drop the PDFs into submission review. It shows which questions the class found hardest, lets you mark written answers (your marks are labeled as yours) and writes gradebook files for Canvas, Moodle and D2L Brightspace. When one class code covers every report, it matches students by the name typed in the report and says so. It keeps nothing and sends nothing.',
            'Suelte los PDF en la revisión de entregas. Muestra qué preguntas le costaron más al grupo, le permite calificar las respuestas escritas (sus calificaciones se rotulan como suyas) y escribe archivos de calificaciones para Canvas, Moodle y D2L Brightspace. Cuando un solo código de grupo cubre todos los informes, empareja a los estudiantes por el nombre escrito en el informe y lo indica. No guarda nada y no envía nada.'
          )} ${a('/instructors/submissions/', 'Submission review', 'Revisión de entregas')}.`,
        ]) +
        P(
          'The times on adoption pages and in the kit are estimates reasoned from the steps. None of them has been timed with a class.',
          'Los tiempos de las páginas de adopción y del kit son estimaciones razonadas a partir de los pasos. Ninguno se ha medido con un grupo.'
        )
    ),
    section(
      'semester',
      T('The first semester', 'El primer semestre'),
      list([
        `${lead('A course.', 'Un curso.')} ${T(
          'The course builder orders investigations and activities into one course with one link, and the Library has ready-made courses to start from, including one aligned to OpenStax Astronomy 2e. A course can be saved as a file and reopened next term.',
          'El creador de cursos ordena investigaciones y actividades en un solo curso con un solo enlace, y la Biblioteca tiene cursos ya preparados para empezar, incluido uno alineado con OpenStax Astronomy 2e. Un curso puede guardarse como archivo y reabrirse el semestre siguiente.'
        )} ${a('/studio/course/', 'Course builder', 'Creador de cursos')}, ${a('/course/', 'Courses', 'Cursos')}.`,
        `${lead('Depth.', 'Profundidad.')} ${T(
          `${deep} of the ${total} investigations come at three depths: core, quantitative and advanced. You can set the depth in an activity or a course, and a student can choose it too. A deeper step never changes the scenario or the model, only what is asked.`,
          `${deep} de las ${total} investigaciones tienen tres profundidades: principal, cuantitativa y avanzada. Puede fijar la profundidad en una actividad o en un curso, y el estudiante también puede elegirla. Un paso más profundo nunca cambia el escenario ni el modelo, solo lo que se pregunta.`
        )}`,
        `${lead('Materials.', 'Materiales.')} ${T(
          'The instructor resources hold an instructor guide and an answer key for each investigation that runs in the simulation, keys cut to each format of a classroom activity, and student worksheets for the activities, in a bundle encrypted in the browser because the site is static. The passphrase is shared with instructors on request: write to the address in the citation file. The public parts (the topic, where it fits in a course, what students should already know and the wrong turns they take) are on each adoption page.',
          'Los recursos para docentes contienen una guía docente y una clave de respuestas para cada investigación que se ejecuta en la simulación, claves adaptadas a cada formato de una actividad de clase y hojas de trabajo para las actividades, en un paquete cifrado en el navegador porque el sitio es estático. La contraseña se comparte con docentes a petición: escriba a la dirección del archivo de citas. Las partes públicas (el tema, el lugar en el curso, lo que el estudiantado debería saber ya y los errores que comete) están en cada página de adopción.'
        )} ${a('/instructors/', 'Instructor resources', 'Recursos para docentes')}.`,
        `${lead('Evaluation.', 'Evaluación.')} ${T(
          'The classroom evidence kit has a fidelity checklist, a twelve-item pilot pre/post assessment, a usability questionnaire and de-identified data templates. They are project-developed and unvalidated, and the kit says so. Research on students usually needs institutional review before any data is collected.',
          'El kit de evidencia de aula tiene una lista de verificación de fidelidad, una evaluación piloto previa y posterior de doce preguntas, un cuestionario de usabilidad y plantillas de datos sin identificar. Son de elaboración propia y no están validados, y el kit lo dice. La investigación con estudiantes suele requerir aprobación institucional antes de recoger datos.'
        )} ${a('/evaluation/', 'Classroom evidence kit', 'Kit de evidencia de aula')}.`,
        `${lead('Make your own.', 'Cree las suyas.')} ${T(
          'The Investigation Composer, the Scenario Studio and the figure builder make new material that travels as a link, with nothing to install and no pull request.',
          'El Compositor de investigaciones, el Estudio de escenarios y el creador de figuras producen material nuevo que viaja como un enlace, sin instalar nada y sin una solicitud de cambios.'
        )} ${a('/studio/lesson/', 'Investigation Composer', 'Compositor de investigaciones')}, ${a('/studio/', 'Scenario Studio', 'Estudio de escenarios')}, ${a('/figure/', 'Figure builder', 'Creador de figuras')}.`,
      ])
    ),
    section(
      'does',
      T('What it does and does not do', 'Qué hace y qué no hace'),
      dl([
        [
          ['Accounts', 'Cuentas'],
          T(
            'There are none. Nobody signs in, and there is no roster to manage.',
            'No hay. Nadie inicia sesión y no hay lista de estudiantes que administrar.'
          ),
        ],
        [
          ['Identity', 'Identidad'],
          T(
            'A report’s token shows which browser made the answers, not who typed them. You decide whether the link’s class code or a name typed in the report identifies a student; a report with no identifier is listed as left out, never guessed at.',
            'La ficha de un informe muestra qué navegador produjo las respuestas, no quién las escribió. Usted decide si el código de grupo del enlace o un nombre escrito en el informe identifica a un estudiante; un informe sin identificador se lista como excluido y nunca se adivina.'
          ),
        ],
        [
          ['Learning platforms', 'Plataformas de aprendizaje'],
          T(
            'Gravitas is not an LTI tool and does not send grades back. The platform holds a link and receives a PDF; the review page writes files you import into the gradebook yourself.',
            'Gravitas no es una herramienta LTI y no devuelve calificaciones. La plataforma guarda un enlace y recibe un PDF; la página de revisión escribe archivos que usted importa al libro de calificaciones.'
          ),
        ],
        [
          ['Grading', 'Calificación'],
          T(
            'A choice or a number is checked against the answer. A written answer is shown to you with the points to look for; the page never grades it. Predictions are recorded and not marked.',
            'Una opción o un número se compara con la respuesta. Una respuesta escrita se le muestra con los puntos que conviene buscar; la página nunca la califica. Las predicciones se registran y no se califican.'
          ),
        ],
        [
          ['Offline', 'Sin conexión'],
          T(
            'Once a student has loaded the page it works with the network off. The Library, My work, Courses, Observatory, Sandbox, 3-D lab, Mission lab, Sky Lab and Catalog are saved on the device; any other page works offline only if it was opened before.',
            'Una vez que el estudiante ha cargado la página, funciona sin red. La Biblioteca, Mi trabajo, Cursos, el Observatorio, el Sandbox, el laboratorio 3-D, el laboratorio de misiones, Sky Lab y el Catálogo se guardan en el dispositivo; cualquier otra página funciona sin conexión solo si se abrió antes.'
          ),
        ],
        [
          ['Physics', 'Física'],
          T(
            'The integrator is Newtonian, and some investigations place a body from a published model rather than integrating it; the screen says so. The validation page lists what was checked against what, with the error measured.',
            'El integrador es newtoniano, y algunas investigaciones colocan un cuerpo según un modelo publicado en lugar de integrarlo; la pantalla lo indica. La página de validación enumera qué se comprobó con qué, con el error medido.'
          ) +
            ` ${a('/validation/', 'Physics validation', 'Validación de la física')}`,
        ],
        [
          ['Languages', 'Idiomas'],
          T(
            'Student-facing pages are in English and Spanish. The instructor materials are in English only.',
            'Las páginas para el estudiantado están en inglés y español. Los materiales docentes están solo en inglés.'
          ),
        ],
        [
          ['Browsers', 'Navegadores'],
          T(
            'The two most recent major versions of Chrome and Edge, Firefox and Safari, on desktops, phones and tablets.',
            'Las dos versiones principales más recientes de Chrome y Edge, Firefox y Safari, en computadoras, teléfonos y tabletas.'
          ),
        ],
      ])
    ),
    section(
      'access',
      T(
        'Accessibility for students who need it',
        'Accesibilidad para estudiantes que la necesitan'
      ),
      P(
        'What follows describes what was built and tested, not a claim about how well it serves a particular student. If something does not work for your class, that is a defect worth reporting.',
        'Lo que sigue describe lo que se construyó y se probó, no una afirmación sobre lo bien que atiende a un estudiante en concreto. Si algo no funciona para su grupo, es un defecto que conviene informar.'
      ) +
        list([
          T(
            'The interface can be operated from the keyboard, including the investigations, the measuring tools and the dialogs, which trap focus and return it.',
            'La interfaz puede manejarse con el teclado, incluidas las investigaciones, las herramientas de medida y los diálogos, que retienen el foco y lo devuelven.'
          ),
          T(
            'Measurements and changes are announced through a live region for screen readers, and the simulation canvas carries a written description that follows what is on screen.',
            'Las mediciones y los cambios se anuncian mediante una región activa para lectores de pantalla, y el lienzo de la simulación lleva una descripción escrita que sigue lo que hay en pantalla.'
          ),
          T(
            'Every instrument prints its numbers as text beside the picture, and every plot is also a table.',
            'Cada instrumento escribe sus números como texto junto a la imagen, y cada gráfica es también una tabla.'
          ),
          T(
            'Animation follows the operating system’s reduced-motion setting. Four themes are provided, including a light one for projectors and a high-contrast dark one.',
            'La animación respeta el ajuste de movimiento reducido del sistema operativo. Hay cuatro temas, incluido uno claro para proyectores y uno oscuro de alto contraste.'
          ),
          T(
            'Not solved: a canvas cannot be explored by touch the way a tactile diagram can. A student who needs that will need the numbers read aloud or described.',
            'Sin resolver: un lienzo no puede explorarse al tacto como un diagrama táctil. Un estudiante que lo necesite necesitará que le lean o le describan los números.'
          ),
        ]) +
        `<p>${T('The accessibility statement, with what was tested and how:', 'La declaración de accesibilidad, con lo que se probó y cómo:')} <a href="${REPO}/blob/main/ACCESSIBILITY.md">ACCESSIBILITY.md</a></p>`
    ),
    section(
      'privacy',
      T('Privacy, in plain words', 'Privacidad, en palabras sencillas'),
      list([
        T(
          'Gravitas is a static site. There is no account, no login, no analytics, no telemetry and no server that receives anything.',
          'Gravitas es un sitio estático. No hay cuenta, ni inicio de sesión, ni analítica, ni telemetría, ni servidor que reciba nada.'
        ),
        T(
          'A student’s answers, notebook and progress stay in the browser they were made in. They leave it only when the student exports them: a PDF report, a progress file or a token.',
          'Las respuestas, el cuaderno y el progreso del estudiante permanecen en el navegador donde se hicieron. Salen de él solo cuando el estudiante los exporta: un informe en PDF, un archivo de progreso o una ficha.'
        ),
        T(
          'The report carries whatever name the student typed into it. Ask students to type what you want to see, and nothing more than that.',
          'El informe lleva el nombre que el estudiante haya escrito en él. Pida que escriban lo que usted quiere ver, y nada más.'
        ),
        T(
          'Submission review reads files in your browser, keeps nothing and sends nothing.',
          'La revisión de entregas lee archivos en su navegador, no guarda nada y no envía nada.'
        ),
        T(
          'Reading a live archive, where an investigation offers it, is opt-in and never on the path of an investigation.',
          'La lectura de un archivo en vivo, donde una investigación la ofrece, es opcional y nunca forma parte del recorrido de una investigación.'
        ),
        T(
          'Because nothing is collected, nobody here learns that something went wrong unless you say so.',
          'Como no se recoge nada, nadie aquí se entera de que algo falló a menos que usted lo diga.'
        ),
      ])
    ),
    section(
      'help',
      T(
        'Getting help and reporting a problem',
        'Obtener ayuda e informar de un problema'
      ),
      P(
        'Gravitas is maintained by one person alongside a teaching load. Expect an answer within a week or two, usually.',
        'Gravitas lo mantiene una sola persona junto con su carga docente. Cuente con una respuesta en una o dos semanas, normalmente.'
      ) +
        list([
          `${T('Something is wrong:', 'Algo falla:')} <a href="${REPO}/issues/new">${T('open an issue', 'abra una incidencia')}</a>. ${T(
            'Include a share link (press Share and paste the link, which reproduces the state), the browser and its version, and what you expected instead.',
            'Incluya un enlace para compartir (pulse Compartir y pegue el enlace, que reproduce el estado), el navegador y su versión, y lo que esperaba en su lugar.'
          )}`,
          `${T('A number looks wrong:', 'Un número parece incorrecto:')} ${a('/validation/', 'the validation page', 'la página de validación')} ${T('may answer it; if it disagrees with what you see, that is a good report.', 'puede responderlo; si no coincide con lo que ve, es un buen informe.')}`,
          `${T('A question that is not a bug, or how a class went:', 'Una pregunta que no es un error, o cómo fue un grupo:')} <a href="${REPO}/blob/main/SUPPORT.md">SUPPORT.md</a>.`,
          `${T('A security problem:', 'Un problema de seguridad:')} <a href="${REPO}/blob/main/SECURITY.md">SECURITY.md</a> ${T('says how to report it. Do not open a public issue.', 'dice cómo informarlo. No abra una incidencia pública.')}`,
        ])
    ),
    section(
      'cite',
      T('How to cite', 'Cómo citar'),
      P(
        'Use the citation file in the repository, which GitHub turns into BibTeX and APA. Every dataset an adoption page lists carries its own license and the citation its publisher asks for. The teaching material is CC BY 4.0: say where it came from.',
        'Use el archivo de citas del repositorio, que GitHub convierte en BibTeX y APA. Cada conjunto de datos que enumera una página de adopción lleva su propia licencia y la cita que pide su editor. El material docente es CC BY 4.0: indique de dónde procede.'
      ) +
        `<p><a class="ui-button" href="${REPO}/blob/main/CITATION.cff">${T('The citation file', 'El archivo de citas')}</a></p>`
    ),
    `<p><a href="/teaching/">${T('Back to Teach', 'Volver a Enseñar')}</a></p>`,
  ].join('\n');

  const title = {
    en: 'Adopter’s guide',
    es: 'Guía de adopción',
  };
  const text = pageHtml({
    file,
    title: { ...title, html: plain(title) },
    description:
      'The first week and the first semester with Gravitas, what it does and does not do, accessibility, privacy, help and how to cite it.',
    eyebrow: w('crumbTeach'),
    lede: T(
      'Everything an instructor needs to start: the first week, the first semester, what the software does and does not do, access, privacy, help and how to cite it.',
      'Todo lo que necesita quien enseña para empezar: la primera semana, el primer semestre, qué hace y qué no hace el software, acceso, privacidad, ayuda y cómo citarlo.'
    ),
    body,
    crumb: `<a href="/teaching/">${w('crumbTeach')}</a>`,
    script: `    <script type="module">\n      import { mountShell } from '/js/shell.js';\n      try {\n        if ((localStorage.getItem('gravitas_locale') || '').startsWith('es'))\n          document.documentElement.lang = 'es';\n      } catch {\n        /* storage blocked: English */\n      }\n      mountShell({ onLanguage: () => {} });\n    </script>\n`,
  });
  return { file, html: finish(file, text) };
}

/** Every page, in the order they are written. */
export async function buildAdoption() {
  const S = await sources();
  const pages = [];
  const rows = [];
  for (const e of S.library.entries.filter(x => x.kind === 'investigation')) {
    const p = investigationPage(S, e);
    pages.push(p);
    rows.push(p.row);
  }
  for (const a of S.ACTIVITIES) {
    const p = activityPage(S, a);
    pages.push(p);
    rows.push(p.row);
  }
  pages.push(findPage(S, rows));
  pages.push(alignmentPage(S, rows));
  pages.push(guidePage(S));
  return { pages, rows };
}

/** Where the generated pages live, for the checks that list them. */
export const adoptionFiles = () => {
  const out = [
    `${BASE}/find/index.html`,
    `${BASE}/alignment/index.html`,
    `${BASE}/adopt/index.html`,
  ];
  for (const kind of ['investigation', 'activity']) {
    const dir = path.join(ROOT, BASE, kind);
    if (!existsSync(dir)) continue;
    for (const d of readdirSync(dir))
      out.push(`${BASE}/${kind}/${d}/index.html`);
  }
  return out.sort();
};

const SITEMAP = 'sitemap.xml';
const MAP_START = '  <!-- adoption:start -->';
const MAP_END = '  <!-- adoption:end -->';

/** sitemap.xml with the adoption pages written between its markers. */
export function withSitemap(doc, pages) {
  const a = doc.indexOf(MAP_START);
  const b = doc.indexOf(MAP_END);
  if (a < 0 || b < a) throw new Error(`${SITEMAP} has no adoption markers`);
  const urls = pages.map(
    ({ file }) =>
      `  <url>\n    <loc>${SITE}/${path.dirname(file)}/</loc>\n    <changefreq>monthly</changefreq>\n    <priority>${file.endsWith('find/index.html') ? '0.7' : '0.5'}</priority>\n  </url>`
  );
  return `${doc.slice(0, a + MAP_START.length)}\n${urls.join('\n')}\n${doc.slice(b)}`;
}

async function main() {
  const check = process.argv.includes('--check');
  const { pages } = await buildAdoption();
  let stale = 0;
  for (const { file, html: text } of pages) {
    const full = path.join(ROOT, file);
    const current = existsSync(full) ? readFileSync(full, 'utf8') : null;
    if (current === text) continue;
    if (check) {
      console.error(`  STALE  ${file}`);
      stale++;
    } else {
      mkdirSync(path.dirname(full), { recursive: true });
      writeFileSync(full, text);
    }
  }
  const map = path.join(ROOT, SITEMAP);
  const doc = readFileSync(map, 'utf8');
  const next = withSitemap(doc, pages);
  if (next !== doc) {
    if (check) {
      console.error(`  STALE  ${SITEMAP}`);
      stale++;
    } else writeFileSync(map, next);
  }
  // A page the generator no longer writes is stale too.
  const wanted = new Set(pages.map(p => p.file));
  for (const f of adoptionFiles())
    if (!wanted.has(f)) {
      console.error(`  UNEXPECTED  ${f}: the generator does not write it`);
      stale++;
    }
  if (check && stale) {
    console.error(
      `${stale} adoption page(s) stale: run node tools/build-adoption-pages.mjs`
    );
    process.exitCode = 1;
  } else
    console.log(
      `${check ? 'Every' : 'Wrote'} adoption page${check ? ' is current' : 's'} (${pages.length}).`
    );
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1])
  await main();
