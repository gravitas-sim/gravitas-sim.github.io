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

import { readFileSync, writeFileSync } from 'node:fs';
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
  learn: ['Learn', 'Aprender'],
  labs: ['Labs', 'Laboratorios'],
  make: ['Make', 'Crear'],
  teach: ['Teach', 'Enseñar'],
  about: ['About', 'Acerca de'],
  investigations: ['Investigations', 'Investigaciones'],
  courses: ['Courses', 'Cursos'],
  observatory: ['Observatory', 'Observatorio'],
  experiments: ['Experiments', 'Experimentos'],
  sandbox: ['Sandbox', 'Simulación libre'],
  lab3d: ['3-D lab', 'Laboratorio 3-D'],
  missionLab: ['Mission lab', 'Laboratorio de misiones'],
  studio: ['Scenario Studio', 'Estudio de escenarios'],
  composer: ['Investigation Composer', 'Compositor de investigaciones'],
  courseBuilder: ['Course builder', 'Creador de cursos'],
  figure: ['Figure builder', 'Creador de figuras'],
  catalog: ['Catalog', 'Catálogo'],
  teaching: ['Teaching with Gravitas', 'Enseñar con Gravitas'],
  instructors: ['Instructor resources', 'Recursos para docentes'],
  submissions: ['Submission review', 'Revisión de entregas'],
  evaluation: ['Classroom evidence kit', 'Kit de evidencias de aula'],
  model: ['How the model works', 'Cómo funciona el modelo'],
  validation: ['Physics validation', 'Validación física'],
  kernel: ['3-D kernel diagnostics', 'Diagnóstico del núcleo 3-D'],
  mission: ['Mission core diagnostics', 'Diagnóstico de misiones'],
  source: ['Source code', 'Código fuente'],
  cite: ['Cite Gravitas', 'Citar Gravitas'],
  license: ['MIT licensed', 'Licencia MIT'],
};

/** The five groups and their links: every entry page, and nothing twice. */
export const NAV = [
  [
    'learn',
    [
      ['investigations', '/#investigations'],
      ['courses', '/course/'],
      ['observatory', '/observatory/'],
      ['experiments', '/experiments/'],
    ],
  ],
  [
    'labs',
    [
      ['sandbox', '/'],
      ['lab3d', '/3d/'],
      ['missionLab', '/mission/lab/'],
    ],
  ],
  [
    'make',
    [
      ['studio', '/studio/'],
      ['composer', '/studio/lesson/'],
      ['courseBuilder', '/studio/course/'],
      ['figure', '/figure/'],
      ['catalog', '/catalog/'],
    ],
  ],
  [
    'teach',
    [
      ['teaching', '/teaching/'],
      ['instructors', '/instructors/'],
      ['submissions', '/instructors/submissions/'],
      ['evaluation', '/evaluation/'],
    ],
  ],
  [
    'about',
    [
      ['model', '/model/'],
      ['validation', '/validation/'],
      ['kernel', '/lab3d/'],
      ['mission', '/mission/'],
    ],
  ],
];

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

/** The URL path a page is served at. */
export const pathOf = page =>
  '/' + page.replace(/(^|\/)index\.html$/, '$1').replace(/^\/$/, '');

/**
 * The shell for one page.
 * @param {string} page - Its path, as `git ls-files` writes it
 * @param {{main: string}} opts - The id of the page's main content
 * @returns {{header: string, footer: string}}
 */
export function shellFor(page, { main }) {
  const here = pathOf(page);
  const groups = NAV.map(([group, links]) => {
    const items = links
      .map(([key, href]) => {
        const current = href === here ? ' aria-current="page"' : '';
        return `<li><a href="${href}"${current}>${say(key)}</a></li>`;
      })
      .join('');
    const holds = links.some(([, href]) => href === here);
    return `<li><details class="gs-group"${holds ? ' data-here' : ''}><summary>${say(group)}</summary><ul>${items}</ul></details></li>`;
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
    `<nav id="gs-nav" class="gs-nav" aria-label="${WORDS.nav[0]}"><ul>${groups}</ul></nav>`,
    `<div class="gs-controls" hidden>`,
    `<label><span class="gs-vh">${say('lang')}</span><select data-gs-lang><option value="en" lang="en">English</option><option value="es" lang="es">Español</option></select></label>`,
    `<label><span class="gs-vh">${say('theme')}</span><select data-gs-theme>${themes}</select></label>`,
    `</div>`,
    `</header>`,
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
  `</script>`,
].join('\n');

const TOP = /<!-- shell:head -->[\s\S]*?<!-- \/shell:head -->/;
const OPEN =
  /<!-- shell:header(?: main=([\w-]+))? -->[\s\S]*?<!-- \/shell:header -->/;
const FOOT = /<!-- shell:footer -->[\s\S]*?<!-- \/shell:footer -->/;

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
