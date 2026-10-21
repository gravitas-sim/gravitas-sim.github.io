#!/usr/bin/env node
// =============================================================================
// The glossary, and the words it retires
// -----------------------------------------------------------------------------
// PLATFORM_MODEL.md fixes eight nouns. Prompt 56 carried them into every string
// and document, and left one place where the old words still appear: here.
// This file is the table. It writes the body of /glossary/ in both languages,
// and it hands tests/terminology.test.js the patterns for the words no page,
// catalog or document may use any more.
//
//   node tools/glossary.mjs            say whether glossary/index.html is current
//   node tools/glossary.mjs --write    write the page body between its markers
//
// The page's head, header and footer are the shell's (tools/shell.mjs) and its
// policy is tools/csp.mjs's; only what lies between the two markers is
// written here.
// =============================================================================

import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { EN_DEFERRED } from '../js/i18n/en.deferred.js';
import { ES_DEFERRED } from '../js/i18n/es.deferred.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const PAGE = 'glossary/index.html';
export const START = '<!-- glossary:start -->';
export const END = '<!-- glossary:end -->';

/** The eight nouns, in the order PLATFORM_MODEL.md gives them. */
export const NOUNS = [
  {
    id: 'scenario',
    en: [
      'Scenario',
      'A reproducible starting world: its bodies, its settings and its seed. A scenario is built in, or made in the Scenario Studio, and a link to one rebuilds the same world every time.',
    ],
    es: [
      'Escenario',
      'Un mundo de partida reproducible: sus cuerpos, sus ajustes y su semilla. Un escenario viene incluido o se crea en el Estudio de escenarios, y un enlace a uno reconstruye el mismo mundo cada vez.',
    ],
    formerly: {
      en: 'preset, world, system file',
      es: 'preajuste, mundo, archivo de sistema',
    },
  },
  {
    id: 'investigation',
    en: [
      'Investigation',
      'A guided sequence of steps with predictions, measurements and questions. Investigations are built in or composed in the Investigation Composer. The Observatory, the 3-D lab and the mission lab each have their own, and all of them run in the same engine.',
    ],
    es: [
      'Investigación',
      'Una secuencia guiada de pasos con predicciones, mediciones y preguntas. Las investigaciones vienen incluidas o se componen en el Compositor de investigaciones. El Observatorio, el laboratorio 3-D y el laboratorio de misiones tienen las suyas, y todas se ejecutan en el mismo motor.',
    ],
    formerly: {
      en: 'lesson, guide (of the Observatory, the 3-D lab or the mission lab)',
      es: 'lección, guía (del Observatorio, del laboratorio 3-D o del laboratorio de misiones)',
    },
  },
  {
    id: 'activity',
    en: [
      'Activity',
      'A shorter classroom format cut from an investigation: a demonstration, a short route, or a chosen selection of its steps, shared as one link. An activity can be handed out, and its results reviewed.',
    ],
    es: [
      'Actividad',
      'Un formato de clase más corto sacado de una investigación: una demostración, un recorrido corto o una selección de sus pasos, compartido como un solo enlace. Una actividad se puede repartir, y sus resultados se pueden revisar.',
    ],
    formerly: { en: 'assignment', es: 'tarea' },
  },
  {
    id: 'dataset',
    en: [
      'Dataset',
      'A pinned, cited table of observations or model values, with where it came from and how it was reduced. A dataset reaches you inside a dataset package.',
    ],
    es: [
      'Conjunto de datos',
      'Una tabla fijada y citada de observaciones o de valores de un modelo, con su procedencia y cómo se redujo. Un conjunto de datos llega dentro de un paquete de datos.',
    ],
    formerly: {
      en: 'data pack (the data itself)',
      es: 'paquete de datos (los datos mismos)',
    },
  },
  {
    id: 'experiment',
    en: [
      'Experiment',
      'A declared run of the model over parameters and seeds, with the quantities it observes. A sweep, an A/B comparison and a fit are experiments.',
    ],
    es: [
      'Experimento',
      'Una ejecución declarada del modelo sobre parámetros y semillas, con las magnitudes que observa. Un barrido, una comparación A/B y un ajuste son experimentos.',
    ],
    formerly: null,
  },
  {
    id: 'course',
    en: [
      'Course',
      'An ordered set of investigations, activities, scenarios, datasets and readings, with objectives, time and prerequisites.',
    ],
    es: [
      'Curso',
      'Un conjunto ordenado de investigaciones, actividades, escenarios, conjuntos de datos y lecturas, con objetivos, tiempo y requisitos previos.',
    ],
    formerly: {
      en: 'course pack (the course itself)',
      es: 'paquete de curso (el curso mismo)',
    },
  },
  {
    id: 'evidence',
    en: [
      'Evidence',
      'Anything a student produces: measurements, captures, fits, figures, lab reports and progress backups.',
    ],
    es: [
      'Evidencia',
      'Todo lo que produce un estudiante: mediciones, capturas, ajustes, figuras, informes de laboratorio y copias del progreso.',
    ],
    formerly: null,
  },
  {
    id: 'package',
    en: [
      'Package',
      'The unit in which authored or curated content is shared and installed: a dataset package, a course package. A package is checked before it is installed, and none of it runs code.',
    ],
    es: [
      'Paquete',
      'La unidad en la que se comparte e instala el contenido creado o curado: un paquete de datos, un paquete de curso. Un paquete se comprueba antes de instalarse y ninguno ejecuta código.',
    ],
    formerly: { en: 'pack, data pack, course pack', es: 'pack' },
  },
];

/**
 * The method words printed after an uncertainty (Prompt 151): "9.81 ± 0.02
 * (data)". The words and their sentences are the catalog's own, so the page and
 * the report cannot disagree.
 */
export const METHODS = [
  'data',
  'model',
  'scaled',
  'profile',
  'propagated',
  'stated',
  'limit',
  'exact',
];

/**
 * The words that are retired. `en` and `es` are the patterns the terminology
 * test refuses outside this page; `use` is what to write instead.
 */
export const RETIRED = [
  {
    id: 'lesson',
    words: { en: 'lesson', es: 'lección' },
    use: { en: 'investigation', es: 'investigación' },
    en: /\blessons?\b/i,
    es: /\blecci(?:ó|o)n(?:es)?\b/i,
  },
  {
    id: 'guide',
    words: {
      en: 'guide (of an Observatory, 3-D lab or mission lab investigation)',
      es: 'guía (de una investigación del Observatorio, del laboratorio 3-D o del de misiones)',
    },
    use: { en: 'investigation', es: 'investigación' },
    // An instructor guide is a document, and stays; so do the idioms.
    en: /(?<!instructor |teaching |adopter[’']s |rough |user |Instructor |Teaching |User )\bguides?\b(?! star)/i,
    es: /\bgu[ií]as?\b(?! (?:docentes?|del instructor|de adopción|didácticas?|aproximada|para (?:docentes|el profesor|el profesorado))| de usuario)(?<!estrella gu[ií]a)/i,
  },
  {
    id: 'pack',
    words: { en: 'pack, data pack, course pack', es: 'pack' },
    use: {
      en: 'package, dataset package, course package',
      es: 'paquete, paquete de datos, paquete de curso',
    },
    en: /\bpacks?\b/i,
    es: /\bpacks?\b/i,
  },
  {
    id: 'assignment',
    words: { en: 'assignment', es: 'tarea' },
    use: { en: 'activity', es: 'actividad' },
    en: /\bassignments?\b/i,
    es: /\btareas?\b/i,
  },
];

/** Words that look like the retired ones and are not. */
export const STAY = [
  {
    en: [
      'instructor guide',
      'A document for teachers, one per investigation. It is not an investigation, so it keeps its name.',
    ],
    es: [
      'guía para docentes',
      'Un documento para el profesorado, uno por investigación. No es una investigación, así que conserva su nombre.',
    ],
  },
  {
    en: [
      'assign, install, embed',
      'Verbs, and not nouns, so they are not on the list. You assign an activity, install a package and embed a figure.',
    ],
    es: [
      'asignar, instalar, incrustar',
      'Verbos y no sustantivos, así que no están en la lista. Se asigna una actividad, se instala un paquete y se incrusta una figura.',
    ],
  },
];

/**
 * Identifiers and labels (Prompt 156): the names a reader meets as a label, a
 * page title, a tab, a library kind or a badge, an instrument or a quantity,
 * in both languages. tools/i18n-labels.mjs holds the catalogs to this table;
 * it checks labels and identifiers, never prose.
 *
 * `en` and `es` are the glossary's words for the term. `ids` are catalog ids
 * that must carry exactly those words. Every other catalog entry whose English
 * is exactly `en` must carry `es` (or one of `allow`, a necessary synonym or a
 * spelling the Academy accepts in both forms). `known` records a divergence
 * that exists in js/i18n today and is not fixed because js/i18n is an input of
 * the instructor bundle's source digest (an edit there is the owner's rebuild):
 * the id and the text it carries now. A known entry that is fixed must be
 * removed, and a new divergence is a failure, so the list can only shrink.
 *
 * kind: navigation (a page, a panel, a tab), library (a kind or badge in the
 * Library), instrument (a tool the reader uses), quantity (a measured
 * quantity's name), unit (a unit's name or symbol).
 */
export const LABELS = [
  // --- navigation: the pages and the rail
  {
    id: 'library',
    kind: 'navigation',
    en: 'Library',
    es: 'Biblioteca',
    ids: ['lib.main.label', 'lib.title'],
  },
  {
    id: 'observatory',
    kind: 'navigation',
    en: 'Observatory',
    es: 'Observatorio',
    ids: ['obs.main.label', 'obs.title'],
  },
  {
    id: 'catalog',
    kind: 'navigation',
    en: 'Catalog',
    es: 'Catálogo',
    ids: ['cat.main.label', 'cat.title'],
  },
  {
    id: 'scenario-studio',
    kind: 'navigation',
    en: 'Scenario Studio',
    es: 'Estudio de escenarios',
    ids: ['studio.title'],
  },
  {
    id: 'composer',
    kind: 'navigation',
    en: 'Investigation Composer',
    es: 'Compositor de investigaciones',
    ids: ['composer.title'],
  },
  {
    id: 'system-builder',
    kind: 'navigation',
    en: 'Orbital System Builder',
    es: 'Constructor de sistemas orbitales',
    ids: ['rail.systemBuilder', 'builder.title'],
  },
  {
    id: 'figure-builder',
    kind: 'navigation',
    en: 'Figure builder',
    es: 'Constructor de figuras',
    ids: ['fig.main.label'],
  },
  {
    id: 'course-builder',
    kind: 'navigation',
    en: 'Course-package builder',
    es: 'Creador de paquetes de curso',
    ids: ['course.title'],
  },
  {
    id: 'notebook',
    kind: 'navigation',
    en: 'Evidence notebook',
    es: 'Cuaderno de pruebas',
    ids: ['nb.title', 'nb.report.title'],
  },
  {
    id: 'notebook-rail',
    kind: 'navigation',
    en: 'Evidence Notebook',
    es: 'Cuaderno de pruebas',
    ids: ['rail.toggleNotebook'],
  },
  {
    id: 'lab3d',
    kind: 'navigation',
    en: 'The 3-D lab',
    es: 'El laboratorio 3-D',
    ids: ['l3.title'],
  },
  {
    id: 'teaching',
    kind: 'navigation',
    en: 'Teaching with Gravitas',
    es: 'Enseñar con Gravitas',
    ids: ['teach.title', 'welcomeLink.teaching.label'],
  },
  {
    id: 'settings',
    kind: 'navigation',
    en: 'Settings',
    es: 'Ajustes',
    ids: ['rail.settings'],
  },
  {
    id: 'rail-state',
    kind: 'navigation',
    en: 'State',
    es: 'Estado',
    ids: ['rail.railState'],
  },
  {
    id: 'rail-tools',
    kind: 'navigation',
    en: 'Tools',
    es: 'Herramientas',
    ids: ['rail.railTools'],
  },
  // --- library: kinds (plural) and badges (singular)
  {
    id: 'investigations',
    kind: 'library',
    en: 'Investigations',
    es: 'Investigaciones',
    ids: [
      'lib.kind.investigation',
      'rail.investigations',
      'welcomeCard.investigations.title',
    ],
  },
  {
    id: 'kind-activity',
    kind: 'library',
    en: 'Classroom activities',
    es: 'Actividades de clase',
    ids: ['lib.kind.activity', 'teach.activities.heading'],
  },
  {
    id: 'kind-scenario',
    kind: 'library',
    en: 'Scenarios',
    es: 'Escenarios',
    ids: ['lib.kind.scenario'],
  },
  {
    id: 'kind-dataset',
    kind: 'library',
    en: 'Datasets',
    es: 'Conjuntos de datos',
    ids: ['lib.kind.dataset'],
  },
  {
    id: 'kind-course',
    kind: 'library',
    en: 'Courses',
    es: 'Cursos',
    ids: ['lib.kind.course'],
  },
  {
    id: 'kind-experiment',
    kind: 'library',
    en: 'Experiments',
    es: 'Experimentos',
    ids: ['lib.kind.experiment'],
  },
  {
    id: 'badge-investigation',
    kind: 'library',
    en: 'Investigation',
    es: 'Investigación',
    ids: [
      'lib.badge.investigation',
      'cat.type.investigation-pack',
      'course.kind.lesson',
    ],
  },
  {
    id: 'badge-activity',
    kind: 'library',
    en: 'Activity',
    es: 'Actividad',
    ids: ['lib.badge.activity', 'course.kind.assignment'],
  },
  {
    id: 'badge-scenario',
    kind: 'library',
    en: 'Scenario',
    es: 'Escenario',
    ids: ['lib.badge.scenario'],
  },
  {
    id: 'badge-dataset',
    kind: 'library',
    en: 'Dataset',
    es: 'Conjunto de datos',
    ids: ['lib.badge.dataset'],
  },
  {
    id: 'badge-course',
    kind: 'library',
    en: 'Course',
    es: 'Curso',
    ids: ['lib.badge.course'],
  },
  {
    id: 'badge-experiment',
    kind: 'library',
    en: 'Experiment',
    es: 'Experimento',
    ids: ['lib.badge.experiment'],
  },
  // --- instruments
  {
    id: 'stopwatch',
    kind: 'instrument',
    en: 'Stopwatch',
    es: 'Cronómetro',
    ids: ['rail.toggleStopwatch'],
  },
  {
    id: 'ruler',
    kind: 'instrument',
    en: 'Ruler',
    es: 'Regla',
    ids: ['rail.toggleRuler'],
  },
  {
    id: 'light-curve',
    kind: 'instrument',
    en: 'Light Curve',
    es: 'Curva de luz',
    ids: ['rail.toggleLightCurve'],
  },
  {
    id: 'periodogram',
    kind: 'instrument',
    en: 'Periodogram',
    es: 'Periodograma',
    ids: ['obs.ms.periodogram'],
  },
  {
    id: 'spectrum',
    kind: 'instrument',
    en: 'Spectrum',
    es: 'Espectro',
    ids: [],
  },
  {
    id: 'maneuver-planner',
    kind: 'instrument',
    en: 'Maneuver planner',
    es: 'Planificador de maniobras',
    ids: ['burn.title'],
  },
  // --- quantities, by the word a table column or a readout uses
  {
    id: 'mass',
    kind: 'quantity',
    en: 'Mass',
    es: 'Masa',
    ids: ['inspector.stat.mass'],
  },
  {
    id: 'radius',
    kind: 'quantity',
    en: 'Radius',
    es: 'Radio',
    ids: ['inspector.stat.radius'],
  },
  {
    id: 'speed',
    kind: 'quantity',
    en: 'Speed',
    es: 'Rapidez',
    ids: ['inspector.stat.speed'],
    // Speed is rapidez and velocity is velocidad. The 3-D lab's column header
    // says Velocidad for the scalar. Fix: es.lab3d.js (a bundle source).
    known: { 'l3.speed': 'Velocidad' },
  },
  {
    id: 'velocity',
    kind: 'quantity',
    en: 'Velocity',
    es: 'Velocidad',
    ids: ['inspector.stat.velocity'],
  },
  {
    id: 'distance',
    kind: 'quantity',
    en: 'Distance',
    es: 'Distancia',
    ids: ['tideW.distance'],
  },
  {
    id: 'period',
    kind: 'quantity',
    en: 'Period',
    es: 'Periodo',
    allow: ['Período'],
    ids: ['builder.col.period'],
  },
  {
    id: 'eccentricity',
    kind: 'quantity',
    en: 'Eccentricity',
    es: 'Excentricidad',
    ids: ['builder.field.e'],
  },
  {
    id: 'inclination',
    kind: 'quantity',
    en: 'Inclination',
    es: 'Inclinación',
    ids: ['exoW.inclination'],
    // A missing accent mark. Fix: the Spanish catalog fragment that holds nb.gw.inclination
    // (a bundle source); the audit's accent report lists the others.
    known: { 'nb.gw.inclination': 'Inclinacion' },
  },
  {
    id: 'semi-major-axis',
    kind: 'quantity',
    en: 'Semi-major axis',
    es: 'Semieje mayor',
    ids: ['hzW.semiMajorAxis'],
  },
  {
    id: 'luminosity',
    kind: 'quantity',
    en: 'Luminosity',
    es: 'Luminosidad',
    ids: ['inspector.stat.luminosity'],
  },
  {
    id: 'temperature',
    kind: 'quantity',
    en: 'Temperature',
    es: 'Temperatura',
    ids: ['lightW.control.T'],
  },
  {
    id: 'periapsis',
    kind: 'quantity',
    en: 'Periapsis',
    es: 'Periastro',
    ids: ['burn.periapsis'],
  },
  {
    id: 'apoapsis',
    kind: 'quantity',
    en: 'Apoapsis',
    es: 'Apoastro',
    ids: ['burn.apoapsis'],
  },
  // --- units' names (the symbol is language-neutral and is not translated)
  {
    id: 'unit-solar-masses',
    kind: 'unit',
    en: 'solar masses',
    es: 'masas solares',
    ids: ['builder.mass.suns', 'place.precise.mass.suns'],
  },
  {
    id: 'unit-earth-masses',
    kind: 'unit',
    en: 'Earth masses',
    es: 'masas terrestres',
    ids: ['builder.mass.earths', 'place.precise.mass.earths'],
  },
  {
    id: 'unit-jupiter-masses',
    kind: 'unit',
    en: 'Jupiter masses',
    es: 'masas de Júpiter',
    ids: ['builder.mass.jupiters', 'place.precise.mass.jupiters'],
  },
  { id: 'unit-au', kind: 'unit', en: 'AU', es: 'UA', ids: ['l3.unit.au'] },
];

/**
 * Words prose may vary in, reported and never failing: for each, the form the
 * glossary prefers and the forms found beside it. A reader of the Spanish (the
 * reader Appendix A names) decides which is right; this only says where each
 * occurs. Patterns are tested against Spanish prose; `prefer` is a pattern too.
 */
export const TERMINOLOGY = [
  {
    id: 'lab-3d',
    prefer: /laboratorio 3-D/gi,
    variants: [/laboratorio 3D\b/gi, /laboratorio tridimensional/gi],
  },
  {
    id: 'solar-system',
    prefer: /Sistema Solar/g,
    variants: [/sistema solar/g],
  },
  {
    id: 'periapsis',
    prefer: /periastro/gi,
    variants: [/pericentro/gi],
  },
  {
    id: 'redshift',
    prefer: /corrimiento al rojo/gi,
    variants: [/desplazamiento al rojo/gi],
  },
  {
    id: 'light-curve',
    prefer: /curva de luz/gi,
    variants: [/curva de luminosidad/gi, /curva luminosa/gi],
  },
  {
    id: 'black-hole',
    prefer: /agujeros? negros?/gi,
    variants: [/hoyos? negros?/gi],
  },
  {
    id: 'dataset',
    prefer: /conjuntos? de datos/gi,
    variants: [/\bdatasets?\b/gi, /sets? de datos/gi],
  },
  {
    id: 'semi-major-axis',
    prefer: /semieje mayor/gi,
    variants: [/semi-eje/gi, /semieje principal/gi],
  },
  {
    id: 'uncertainty',
    prefer: /incertidumbre/gi,
    variants: [/imprecisi[óo]n/gi],
  },
  {
    id: 'teaching-staff',
    prefer: /docentes?/gi,
    variants: [/profesorado/gi, /instructor(?:es|a|as)?\b/gi],
  },
  {
    id: 'period-spelling',
    prefer: /\bperiodos?\b/gi,
    variants: [/\bperíodos?\b/gi],
  },
];

const esc = s =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const both = (en, es, tag = 'span') =>
  `<${tag} class="gs-en">${esc(en)}</${tag}><${tag} class="gs-es" lang="es">${esc(es)}</${tag}>`;

/** The page body between the markers. */
export function render() {
  const out = [];
  out.push(START);
  out.push(
    `<!-- Generated by tools/glossary.mjs from its table. Do not edit by hand: node tools/glossary.mjs --write -->`
  );
  out.push('<div class="doc-hero">');
  out.push(`<p class="doc-eyebrow">${both('Glossary', 'Glosario')}</p>`);
  out.push(
    `<h1>${both('The words Gravitas uses', 'Las palabras que usa Gravitas')}</h1>`
  );
  out.push(
    `<p class="doc-lede">${both(
      'Eight nouns name everything there is to open, run or make. The same word means the same thing on every page, in the interface, in the documents and in the manual.',
      'Ocho sustantivos nombran todo lo que hay para abrir, ejecutar o crear. La misma palabra significa lo mismo en todas las páginas, en la interfaz, en los documentos y en el manual.'
    )}</p>`
  );
  out.push('</div>');
  out.push(`<section id="nouns" aria-labelledby="nouns-h">`);
  out.push(
    `<h2 id="nouns-h">${both('The eight nouns', 'Los ocho sustantivos')}</h2>`
  );
  out.push('<dl class="gl-terms">');
  for (const n of NOUNS) {
    out.push(`<div id="${n.id}">`);
    out.push(`<dt>${both(n.en[0], n.es[0])}</dt>`);
    out.push(`<dd>${both(n.en[1], n.es[1])}`);
    if (n.formerly) {
      out.push(
        `<br /><em>${both(`Formerly: ${n.formerly.en}.`, `Antes: ${n.formerly.es}.`)}</em>`
      );
    }
    out.push('</dd>');
    out.push('</div>');
  }
  out.push('</dl>');
  out.push('</section>');
  out.push(`<section id="uncertainty" aria-labelledby="uncertainty-h">`);
  out.push(
    `<h2 id="uncertainty-h">${both('Uncertainty, and how it was found', 'La incertidumbre y cómo se obtuvo')}</h2>`
  );
  out.push(
    `<p>${both(
      'A number a student reads is printed as value ± uncertainty, with one word in brackets that says where the uncertainty comes from. A limit is printed as < or >, and a result the data leave open is printed as not constrained.',
      'Un número que lee un estudiante se imprime como valor ± incertidumbre, con una palabra entre paréntesis que dice de dónde viene la incertidumbre. Un límite se imprime como < o >, y un resultado que los datos dejan abierto se imprime como no acotado.'
    )}</p>`
  );
  out.push('<dl class="gl-terms">');
  for (const m of METHODS) {
    out.push(
      `<div id="method-${m}"><dt>${both(EN_DEFERRED[`nb.unc.method.${m}`], ES_DEFERRED[`nb.unc.method.${m}`])}</dt><dd>${both(EN_DEFERRED[`nb.unc.method.${m}.tip`], ES_DEFERRED[`nb.unc.method.${m}.tip`])}</dd></div>`
    );
  }
  out.push('</dl>');
  out.push('</section>');
  out.push(`<section id="retired" aria-labelledby="retired-h">`);
  out.push(
    `<h2 id="retired-h">${both('Words we no longer use', 'Palabras que ya no usamos')}</h2>`
  );
  out.push(
    `<p>${both(
      'These words meant more than one thing, or the same thing as a noun above. Each has one replacement.',
      'Estas palabras significaban más de una cosa, o lo mismo que un sustantivo de arriba. Cada una tiene un solo reemplazo.'
    )}</p>`
  );
  out.push('<div class="doc-table-wrap" tabindex="0">');
  out.push('<table class="doc-table">');
  out.push(
    `<thead><tr><th scope="col">${both('Instead of', 'En vez de')}</th><th scope="col">${both('Say', 'Di')}</th></tr></thead>`
  );
  out.push('<tbody>');
  for (const r of RETIRED) {
    out.push(
      `<tr><th scope="row">${both(r.words.en, r.words.es)}</th><td>${both(r.use.en, r.use.es)}</td></tr>`
    );
  }
  out.push('</tbody></table></div>');
  out.push('</section>');
  out.push(`<section id="stay" aria-labelledby="stay-h">`);
  out.push(
    `<h2 id="stay-h">${both('Words that stay', 'Palabras que se quedan')}</h2>`
  );
  out.push('<dl class="gl-terms">');
  for (const s of STAY) {
    out.push(
      `<div><dt>${both(s.en[0], s.es[0])}</dt><dd>${both(s.en[1], s.es[1])}</dd></div>`
    );
  }
  out.push('</dl>');
  out.push('</section>');
  out.push(END);
  return out.join('\n');
}

/** The page with its body replaced; `null` when the markers are missing. */
export function withBody(html) {
  const a = html.indexOf(START);
  const b = html.indexOf(END);
  if (a < 0 || b < a) return null;
  return html.slice(0, a) + render() + html.slice(b + END.length);
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const file = path.join(ROOT, PAGE);
  const html = readFileSync(file, 'utf8');
  const next = withBody(html);
  if (next === null) {
    console.error(`${PAGE} has no ${START} ... ${END} markers`);
    process.exit(1);
  }
  if (process.argv.includes('--write')) {
    if (next !== html) writeFileSync(file, next);
    console.log(next === html ? `${PAGE} is current` : `wrote ${PAGE}`);
  } else if (next !== html) {
    console.error(`${PAGE} is stale. Run node tools/glossary.mjs --write`);
    process.exit(1);
  } else {
    console.log(`${PAGE} is current`);
  }
}
