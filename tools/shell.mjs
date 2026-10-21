#!/usr/bin/env node
// =============================================================================
// The shared shell, stamped into every page
// -----------------------------------------------------------------------------
//   node tools/shell.mjs --write   write each page's shell between its markers
//   node tools/shell.mjs --check   fail when a page's shell is not what this writes
//
// Roadmap II Prompt 50, the shell of PLATFORM_MODEL.md: the product name,
// linking Home; five navigation groups; the locale and theme switches; the
// footer. One source, this file, and one module, js/shell.js.
//
// The markup is static HTML rather than something a script renders, because
// the site is served unbundled and every route budget counts the JavaScript a
// page fetches (tools/route-budget.mjs); markup costs none of it. So:
//   - each group is a <details>: the WAI-ARIA disclosure pattern, native,
//     working before any script runs and with none;
//   - each label is written in both languages, and css/shell.css shows the one
//     the page's <html lang> names, so the shell speaks the page's language
//     without a catalog;
//   - js/shell.js adds only what needs a script: one group open at a time,
//     Escape, the two switches, the narrow-screen Menu.
//
// A page opts in by carrying the two marker comments; tests/shell.test.js
// holds every page but the exempt ones to having them, current.
// =============================================================================

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { pages } from './csp.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Pages without the shell. The embed page is a figure inside someone else's
 * page (EMBEDDING.md); the first Gravitas is kept as it was.
 */
export const EXEMPT = new Set(['history/original/index.html']);

/**
 * The application template (PLATFORM_MODEL.md, "Page templates"): the canvas
 * is full-bleed and the shell header is the only chrome above it, fixed, with
 * the application's own chrome moved down by --shell-height (css/shell.css).
 * It keeps its own skip link, to the controls, and its own footer, which
 * already carries the credit, the licence, validation and the source.
 */
export const APPLICATION = new Set(['index.html']);

/** Every label, in both languages. */
export const WORDS = {
  menu: ['Menu', 'Menú'],
  nav: ['Gravitas', 'Gravitas'],
  home: ['Gravitas home', 'Inicio de Gravitas'],
  lang: ['Language', 'Idioma'],
  theme: ['Theme', 'Tema'],
  skip: ['Skip to content', 'Saltar al contenido'],
  explore: ['Explore', 'Explorar'],
  learn: ['Learn', 'Aprender'],
  observe: ['Observe', 'Observar'],
  teach: ['Teach', 'Enseñar'],
  crumbs: ['Breadcrumb', 'Ruta de navegación'],
  alsoLearn: ['Also in Learn', 'También en Aprender'],
  alsoObserve: ['Also in Observe', 'También en Observar'],
  alsoTeach: ['Also in Teach', 'También en Enseñar'],
  documents: ['Documents', 'Documentos'],
  library: ['Library', 'Biblioteca'],
  skyLab: ['Sky Lab', 'Laboratorio del cielo'],
  myWork: ['My work', 'Mi trabajo'],
  investigations: ['Investigations', 'Investigaciones'],
  courses: ['Courses', 'Cursos'],
  observatory: ['Observatory', 'Observatorio'],
  experiments: ['Experiments', 'Experimentos'],
  compute: ['Compute page', 'Página de cómputo'],
  sandbox: ['Sandbox', 'Simulación libre'],
  lab3d: ['3-D lab', 'Laboratorio 3-D'],
  missionLab: ['Mission lab', 'Laboratorio de misiones'],
  studio: ['Scenario Studio', 'Estudio de escenarios'],
  composer: ['Investigation Composer', 'Compositor de investigaciones'],
  courseBuilder: ['Course-package builder', 'Creador de paquetes de curso'],
  packs: ['Investigations in a course', 'Investigaciones en un curso'],
  find: ['Find content to teach', 'Encontrar contenido para enseñar'],
  adopt: ['Adopter’s guide', 'Guía de adopción'],
  alignment: ['Textbook alignment', 'Alineación con libros de texto'],
  kit: ['Distribution kit', 'Kit de distribución'],
  adoption: ['Adoption page', 'Página de adopción'],
  figure: ['Figure builder', 'Constructor de figuras'],
  catalog: ['Catalog', 'Catálogo'],
  teaching: ['Teaching with Gravitas', 'Enseñar con Gravitas'],
  instructors: ['Instructor resources', 'Recursos para docentes'],
  submissions: ['Submission review', 'Revisión de entregas'],
  evaluation: ['Classroom evidence kit', 'Kit de evidencias de aula'],
  model: ['How the model works', 'Cómo funciona el modelo'],
  validation: ['Physics validation', 'Validación física'],
  glossary: ['Glossary', 'Glosario'],
  kernel: ['3-D kernel diagnostics', 'Diagnóstico del núcleo 3-D'],
  mission: ['Mission core diagnostics', 'Diagnóstico de misiones'],
  manual: ['User manual (PDF)', 'Manual de usuario (PDF)'],
  source: ['Source code', 'Código fuente'],
  cite: ['Cite Gravitas', 'Citar Gravitas'],
  license: ['MIT licensed', 'Licencia MIT'],
  offline: ['You are offline.', 'Estás sin conexión.'],
  saved: [
    'These pages are saved on this device:',
    'Estas páginas están guardadas en este dispositivo:',
  ],
  elsewhere: [
    'Any other page works only if you have opened it before, and whatever needs the network, such as catalog downloads, waits until you are back online.',
    'Cualquier otra página funciona solo si ya la abriste, y lo que necesita la red, como las descargas del catálogo, espera hasta que vuelvas a conectarte.',
  ],
  dismiss: ['Dismiss', 'Cerrar'],
};

/**
 * Page titles in Spanish, for pages whose own script does not set one. The
 * stamped title script swaps document.title with the locale, so a Spanish
 * reader's tab and history read in Spanish. A page that sets its title from
 * its own catalog is not listed.
 */
export const TITLES_ES = {
  'my-work/index.html': 'Mi trabajo | Gravitas',
  'glossary/index.html': 'Glosario | Gravitas',
  'sky/index.html': 'Laboratorio del cielo | Gravitas',
  'studio/index.html': 'Estudio de escenarios | Gravitas',
  'studio/lesson/index.html': 'Compositor de investigaciones | Gravitas',
  'studio/course/index.html': 'Creador de paquetes de curso | Gravitas',
  '3d/index.html': 'El laboratorio 3-D | Gravitas',
  'teaching/adopt/index.html': 'Guía de adopción | Gravitas',
  'teaching/alignment/index.html': 'Alineación con libros de texto | Gravitas',
  'teaching/find/index.html': 'Encontrar contenido para enseñar | Gravitas',
};

/**
 * The five destinations of the navigation model (NAVIGATION.md, Prompt 162):
 * the shell's whole navigation, in the model's order. Each is [word key, the
 * destination's own page, the inventory's destination id]. Nothing else is a
 * menu entry: every other surface is reached from its destination's page, from
 * the places block that page carries (PLACES) or from context.
 */
export const DESTINATIONS = [
  ['explore', '/', 'explore'],
  ['learn', '/library/', 'learn'],
  ['observe', '/observatory/', 'observe'],
  ['myWork', '/my-work/', 'my-work'],
  ['teach', '/teaching/', 'teach'],
];

/**
 * The places a destination's page offers below its content: what used to be a
 * menu entry and is not a destination. `<!-- shell:places -->` in a page asks
 * for its block; Home's Explore card carries its own (js/fragments/home.html),
 * which tests/shell.test.js holds to the first entry here.
 */
export const PLACES = {
  '/': [
    'explore',
    [
      [
        null,
        [
          ['lab3d', '/3d/'],
          ['missionLab', '/mission/lab/'],
          ['studio', '/studio/'],
        ],
      ],
    ],
  ],
  '/library/': [
    'learn',
    [
      [
        null,
        [
          ['courses', '/course/'],
          ['investigations', '/#investigations'],
        ],
      ],
    ],
  ],
  '/observatory/': [
    'observe',
    [
      [
        null,
        [
          ['experiments', '/experiments/'],
          ['skyLab', '/sky/'],
          ['compute', '/compute/'],
          ['catalog', '/catalog/'],
          ['figure', '/figure/'],
        ],
      ],
    ],
  ],
  '/teaching/': [
    'teach',
    [
      [
        null,
        [
          ['instructors', '/instructors/'],
          ['submissions', '/instructors/submissions/'],
          ['evaluation', '/evaluation/'],
          ['composer', '/studio/lesson/'],
          ['courseBuilder', '/studio/course/'],
        ],
      ],
      [
        'documents',
        [
          ['model', '/model/'],
          ['validation', '/validation/'],
          ['glossary', '/glossary/'],
          ['manual', '/Gravitas_User_Manual.pdf'],
        ],
      ],
    ],
  ],
};

/** The inventory rows (NAVIGATION.md): which destination a page belongs to, and its name. */
const INVENTORY = JSON.parse(
  readFileSync(path.join(ROOT, 'tools/navigation-inventory.json'), 'utf8')
);
const covering = here =>
  INVENTORY.surfaces.find(r =>
    r.path.endsWith('*')
      ? here.startsWith(r.path.slice(0, -1))
      : r.path === here
  );

/** The four themes, as js/theme.js names them, and their labels. */
export const THEMES = [
  ['midnight', 'Midnight', 'Medianoche'],
  ['deep', 'Deep space', 'Espacio profundo'],
  ['observatory', 'Observatory red', 'Rojo de observatorio'],
  ['daylight', 'Daylight', 'Luz de día'],
];

/**
 * The first Gravitas is reached from one quiet word, the last of /model/'s
 * footer and nowhere else (tests/historyOriginal.test.js).
 */
const ORIGIN = `<a href="/history/original/">origin</a>`;

const REPO_URL = 'https://github.com/gravitas-sim/gravitas-sim.github.io';

/** A label in both languages; css/shell.css shows one. */
const say = key => {
  const [en, es] = WORDS[key];
  return en === es
    ? en
    : `<span class="gs-en">${en}</span><span class="gs-es" lang="es">${es}</span>`;
};

/**
 * The pages the service worker precaches, read from the manifest it generates
 * (tools/build-service-worker.mjs), so the offline note lists what is saved
 * and nothing it merely hopes is. Only the set of paths is used, and stamping
 * a page does not change it, so the two generated files do not chase each other.
 */
export function precachedPages() {
  const file = path.join(ROOT, 'sw-manifest.js');
  const text = existsSync(file) ? readFileSync(file, 'utf8') : '';
  return new Set(
    [...text.matchAll(/'\.\/(.*?)index\.html'/g)].map(m => '/' + m[1])
  );
}

/**
 * The page's title in the reader's language, as a small inline script rather
 * than js/shell.js, so no route pays for it in JavaScript. The English title is
 * the one the page carries; the script follows <html lang>, as the shell's own
 * labels do. tools/csp.mjs hashes it.
 */
const titleScript = es =>
  `<script>(function(){var r=document.documentElement,en=document.title,es=${JSON.stringify(es)};function s(){document.title=r.lang.indexOf('es')==0?es:en}s();new MutationObserver(s).observe(r,{attributeFilter:['lang']});})();</script>`;

/** The offline note: inert until the head script shows it, once, when offline. */
function offlineNote() {
  const saved = precachedPages();
  const links = [
    ...DESTINATIONS.map(([key, href]) => [key, href]),
    ...Object.values(PLACES).flatMap(([, blocks]) =>
      blocks.flatMap(([, items]) => items)
    ),
  ]
    .filter(([, href]) => saved.has(href))
    .map(([key, href]) => `<a href="${href}">${say(key)}</a>`)
    .join(', ');
  return [
    `<div class="gs-offline" role="status"><template><div class="gs-offline-box">`,
    `<p><strong>${say('offline')}</strong> ${say('saved')} ${links}. ${say('elsewhere')}</p>`,
    `<button type="button" class="ui-button">${say('dismiss')}</button>`,
    `</div></template></div>`,
  ].join('\n');
}

/** The URL path a page is served at. */
export const pathOf = page =>
  '/' + page.replace(/(^|\/)index\.html$/, '$1').replace(/^\/$/, '');

/**
 * Where a page sits, as a breadcrumb: Gravitas, its destination, its own name.
 * The destination is plain text on its own page and a link elsewhere; a name
 * that repeats the destination's word is left out. A page the model leaves
 * outside every destination (a document) shows Gravitas and its name.
 */
function crumbsFor(here) {
  const row = covering(here);
  if (!row) return '';
  const own = DESTINATIONS.find(d => d[2] === row.destination);
  const items = [`<li><a href="/#home">GRAVITAS</a></li>`];
  if (own)
    items.push(
      own[1] === here
        ? `<li>${say(own[0])}</li>`
        : `<li><a href="${own[1]}">${say(own[0])}</a></li>`
    );
  if (row.crumb && !(own && row.crumb === own[0]))
    items.push(`<li aria-current="page">${say(row.crumb)}</li>`);
  else
    items[items.length - 1] = items
      .at(-1)
      .replace('<li>', '<li aria-current="page">');
  return [
    `<nav class="gs-crumbs" aria-labelledby="gs-crumbs-name">`,
    `<span id="gs-crumbs-name" class="gs-vh">${say('crumbs')}</span>`,
    `<ol>${items.join('')}</ol>`,
    `</nav>`,
  ].join('');
}

/** The places block of a destination's page (`<!-- shell:places -->`). */
export function placesFor(page) {
  const entry = PLACES[pathOf(page)];
  if (!entry) return '';
  const [dest, blocks] = entry;
  const title = {
    learn: 'alsoLearn',
    observe: 'alsoObserve',
    teach: 'alsoTeach',
  }[dest];
  const lists = blocks
    .map(
      ([name, links]) =>
        `${name ? `<h3 class="gs-places-sub">${say(name)}</h3>` : ''}<ul>${links
          .map(([key, href]) => `<li><a href="${href}">${say(key)}</a></li>`)
          .join('')}</ul>`
    )
    .join('');
  return [
    `<nav class="gs-places" aria-labelledby="gs-places-name">`,
    `<h2 id="gs-places-name" class="gs-places-title">${say(title)}</h2>`,
    lists,
    `</nav>`,
  ].join('');
}

/**
 * The shell for one page.
 * @param {string} page - Its path, as `git ls-files` writes it
 * @param {{main: string}} opts - The id of the page's main content
 * @returns {{header: string, footer: string}}
 */
export function shellFor(page, { main }) {
  const here = pathOf(page);
  const dest = covering(here)?.destination ?? null;
  const items = DESTINATIONS.map(([key, href, id]) => {
    const current =
      href === here
        ? ' aria-current="page"'
        : id === dest
          ? ' aria-current="true"'
          : '';
    return `<li><a href="${href}" data-dest="${id}"${current}>${say(key)}</a></li>`;
  }).join('');
  const themes = THEMES.map(
    ([id, en, es]) => `<option value="${id}" data-es="${es}">${en}</option>`
  ).join('');
  const app = APPLICATION.has(page);
  const header = [
    ...(app ? [] : [`<a class="gs-skip" href="#${main}">${say('skip')}</a>`]),
    `<header class="gs-shell${app ? ' gs-app' : ''}">`,
    `<a class="gs-brand" href="/#home"><span class="gs-vh">${say('home')}</span><span aria-hidden="true">GRAVITAS</span></a>`,
    `<button type="button" class="gs-toggle" aria-expanded="false" aria-controls="gs-nav" hidden>${say('menu')}</button>`,
    `<nav id="gs-nav" class="gs-nav" aria-label="${WORDS.nav[0]}"><ul>${items}</ul></nav>`,
    `<div class="gs-controls" hidden>`,
    `<label><span class="gs-vh">${say('lang')}</span><select data-gs-lang><option value="en" lang="en">English</option><option value="es" lang="es">Español</option></select></label>`,
    `<label><span class="gs-vh">${say('theme')}</span><select data-gs-theme>${themes}</select></label>`,
    `</div>`,
    `</header>`,
    ...(app ? [] : [crumbsFor(here), offlineNote()]),
    ...(TITLES_ES[page] ? [titleScript(TITLES_ES[page])] : []),
  ].join('\n');
  const footer = [
    `<footer class="gs-foot">`,
    `<a href="/validation/">${say('validation')}</a>`,
    `<a href="${REPO_URL}">${say('source')}</a>`,
    `<a href="${REPO_URL}/blob/main/CITATION.cff">${say('cite')}</a>`,
    `<span>${say('license')}</span>`,
    ...(page === 'model/index.html' ? [ORIGIN] : []),
    `</footer>`,
  ].join('\n');
  return { header, footer };
}

/**
 * What the shell puts in <head>: its stylesheet, and the stored theme applied
 * before the first paint, so no page flashes Midnight first. The ids and the
 * attribute are js/theme.js's; tools/csp.mjs hashes the script.
 */
export const HEAD = [
  `<link rel="stylesheet" href="/css/shell.css" />`,
  `<script>`,
  `try {`,
  `  const t = localStorage.getItem('gravitas_theme');`,
  `  if (['deep', 'observatory', 'daylight'].includes(t)) {`,
  `    document.documentElement.setAttribute('data-theme', t);`,
  `    document.documentElement.style.colorScheme =`,
  `      t === 'daylight' ? 'light' : 'dark';`,
  `  }`,
  `} catch {`,
  `  /* storage unavailable: the default theme is correct */`,
  `}`,
  `/* The offline note (shellFor): shown once when the connection drops, gone when it returns, dismissed by its button or Escape. */`,
  `(() => {`,
  `  const sync = () => {`,
  `    const el = document.querySelector('.gs-offline');`,
  `    const box = el && el.querySelector('.gs-offline-box');`,
  `    if (!el) return;`,
  `    if (navigator.onLine) return box && box.remove();`,
  `    if (box) return;`,
  `    el.append(el.querySelector('template').content.cloneNode(true));`,
  `    el.querySelector('button').onclick = () =>`,
  `      el.querySelector('.gs-offline-box').remove();`,
  `  };`,
  `  addEventListener('offline', sync);`,
  `  addEventListener('online', sync);`,
  `  addEventListener('DOMContentLoaded', sync);`,
  `  addEventListener('keydown', e => {`,
  `    const box = document.querySelector('.gs-offline-box');`,
  `    if (e.key === 'Escape' && box) box.remove();`,
  `  });`,
  `})();`,
  `</script>`,
].join('\n');

const TOP = /<!-- shell:head -->[\s\S]*?<!-- \/shell:head -->/;
const OPEN =
  /<!-- shell:header(?: main=([\w-]+))? -->[\s\S]*?<!-- \/shell:header -->/;
const FOOT = /<!-- shell:footer -->[\s\S]*?<!-- \/shell:footer -->/;
const PLACES_BLOCK = /<!-- shell:places -->[\s\S]*?<!-- \/shell:places -->/;

/** Whether a page carries the shell's markers. */
export const hasShell = (html, page) =>
  TOP.test(html) &&
  OPEN.test(html) &&
  (APPLICATION.has(page) || FOOT.test(html));

/**
 * The page with its shell written between its markers. A page without them
 * is returned as it is.
 */
export function withShell(page, html) {
  const at = OPEN.exec(html);
  if (!at || !hasShell(html, page)) return html;
  const main = at[1] || 'main';
  const { header, footer } = shellFor(page, { main });
  return html
    .replace(TOP, () => `<!-- shell:head -->\n${HEAD}\n<!-- /shell:head -->`)
    .replace(
      OPEN,
      () =>
        `<!-- shell:header main=${main} -->\n${header}\n<!-- /shell:header -->`
    )
    .replace(
      FOOT,
      () => `<!-- shell:footer -->\n${footer}\n<!-- /shell:footer -->`
    )
    .replace(
      PLACES_BLOCK,
      () => `<!-- shell:places -->\n${placesFor(page)}\n<!-- /shell:places -->`
    );
}

/** The pages that should carry the shell. */
export const shellPages = () => pages().filter(p => !EXEMPT.has(p));

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const write = process.argv.includes('--write');
  const stale = [];
  let stamped = 0;
  for (const page of shellPages()) {
    const file = path.join(ROOT, page);
    const html = readFileSync(file, 'utf8');
    if (!hasShell(html, page)) continue;
    stamped++;
    const next = withShell(page, html);
    if (next === html) continue;
    if (write) writeFileSync(file, next);
    else stale.push(page);
  }
  if (stale.length) {
    console.error(
      `${stale.join('\n')}\nThese pages' shells are stale. Run node tools/shell.mjs --write`
    );
    process.exit(1);
  }
  console.log(
    write
      ? `Wrote the shell of ${stamped} pages.`
      : `Every page's shell is current (${stamped} pages).`
  );
}
