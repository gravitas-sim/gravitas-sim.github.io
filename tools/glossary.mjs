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
  out.push(
    '<div class="doc-table-wrap" tabindex="0" role="region" aria-labelledby="retired-h">'
  );
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
