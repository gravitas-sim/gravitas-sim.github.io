#!/usr/bin/env node
/**
 * Production build.
 *
 * The site is a static GitHub Pages deployment with no server-side step, so
 * the build writes a self-contained `dist/` that can be published as-is.
 *
 *   node build.js          bundle + minify into dist/
 *   node build.js --watch  rebuild on change
 *
 * The unbundled sources still run directly from the repo root (`npm run dev`),
 * so debugging never requires a build.
 */

import * as esbuild from 'esbuild';
import { readFile, writeFile, mkdir, cp, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const OUT = 'dist';
const watch = process.argv.includes('--watch');

// Files copied verbatim. Test harnesses, coverage reports and package metadata
// are deliberately excluded: publishing the repo root shipped all of them.
const STATIC_FILES = [
  'favicon.ico',
  'favicon.png',
  'CNAME',
  'Gravitas_User_Manual.pdf',
  'robots.txt',
  'sitemap.xml',
  'social-card.png',
];

// Directories copied whole. Lesson figures are photographs used under licences
// that require them to be redistributed with the page, not hot-linked.
const STATIC_DIRS = ['images', 'notebooks'];

// Static document pages outside the single-page app.
const DOC_PAGES = ['model', 'instructors', 'validation'];

async function buildCss() {
  // tokens → styles → components → page, matching the cascade-layer order.
  const parts = [];
  for (const f of [
    'css/tokens.css',
    'css/styles.css',
    'css/components.css',
    // Presentation shells last of the component-layer files: embed and lecture
    // layer over the normal chrome and have to win on source order within the
    // layer rather than on !important.
    'css/presentation.css',
    // The chrome rework - readout, control rail, bottom dock - is last of the
    // component-layer files so it can restate what the older sheets set for
    // the same elements without reaching for !important.
    'css/chrome.css',
    'css/page.css',
  ]) {
    parts.push(`/* ${f} */`, await readFile(f, 'utf8'));
  }
  const combined = parts.join('\n');
  const result = await esbuild.transform(combined, {
    loader: 'css',
    minify: true,
    // physics.js branches on constructor.name in fifteen places. Without
    // this, minification renames the classes and every one of those branches
    // is false in production and true in development.
    keepNames: true,
    legalComments: 'none',
  });
  await writeFile(path.join(OUT, 'css', 'app.css'), result.code);
  return result.code.length;
}

async function buildJs() {
  const result = await esbuild.build({
    entryPoints: [{ in: 'js/main.js', out: 'app' }],
    bundle: true,
    minify: true,
    // physics.js branches on constructor.name in fifteen places. Without
    // this, minification renames the classes and every one of those branches
    // is false in production and true in development.
    keepNames: true,
    format: 'esm',
    target: ['es2022'],
    // Split, so the dynamic imports in the source become their own chunks
    // rather than being inlined back into the entry. The guided-lesson system
    // is half the application by weight and almost nobody opens one on a first
    // visit; loading it when it is asked for is the single largest saving
    // available on the start-up path.
    outdir: path.join(OUT, 'js'),
    splitting: true,
    chunkNames: 'chunk-[hash]',
    sourcemap: true,
    metafile: true,
    // three is loaded from a CDN via the import map; keep it external so the
    // bundle does not inline a copy.
    external: ['three', 'three/addons/*'],
    legalComments: 'none',
  });

  // The physics worker is instantiated with `new Worker(new URL(...))`, so it
  // needs its own bundle rather than being inlined into the main graph.
  await esbuild.build({
    entryPoints: ['js/physicsWorker.js', 'js/chartWorker.js'],
    bundle: true,
    minify: true,
    // physics.js branches on constructor.name in fifteen places. Without
    // this, minification renames the classes and every one of those branches
    // is false in production and true in development.
    keepNames: true,
    format: 'esm',
    target: ['es2022'],
    outdir: path.join(OUT, 'js'),
    legalComments: 'none',
  });

  return summarizeBundle(result.metafile);
}

/**
 * What the browser actually downloads before the app can run.
 *
 * Splitting moves shared code into chunks, so the entry file's own size says
 * almost nothing on its own: what matters is the entry plus everything
 * reachable from it through static imports. Anything reachable only through a
 * dynamic import is deferred, which is the point of splitting and the number
 * worth watching.
 *
 * This also settles a long-standing lie in the build output: it used to sum
 * every output, source map included, and reported 2.8MB for a 703KB bundle.
 *
 * @param {Object} metafile - esbuild metafile
 * @returns {Object} initial and deferred byte totals
 */
function summarizeBundle(metafile) {
  const outputs = Object.fromEntries(
    Object.entries(metafile.outputs).filter(([f]) => f.endsWith('.js'))
  );
  const entryFile = Object.keys(outputs).find(f => f.endsWith('/app.js'));

  const eager = new Set();
  const walk = file => {
    if (!file || eager.has(file) || !outputs[file]) return;
    eager.add(file);
    for (const imp of outputs[file].imports || []) {
      if (imp.kind === 'import-statement') walk(imp.path);
    }
  };
  walk(entryFile);

  const size = f => outputs[f].bytes;
  const deferred = Object.keys(outputs).filter(f => !eager.has(f));
  return {
    initial: [...eager].reduce((a, f) => a + size(f), 0),
    initialFiles: eager.size,
    deferred: deferred.reduce((a, f) => a + size(f), 0),
    deferredFiles: deferred.length,
    total: Object.keys(outputs).reduce((a, f) => a + size(f), 0),
  };
}

async function buildHtml() {
  let html = await readFile('index.html', 'utf8');

  // Collapse the development stylesheet links into the single built file.
  //
  // Matched one at a time rather than as one long sequence: the previous form
  // required the exact set in the exact order, so adding a fourth stylesheet
  // left its link in the built page pointing at a file the build does not
  // emit - a 404 on every production page load. This form cannot go stale.
  const DEV_STYLESHEETS = [
    'tokens.css',
    'styles.css',
    'components.css',
    'presentation.css',
    'chrome.css',
  ];
  let replacedFirst = false;
  for (const name of DEV_STYLESHEETS) {
    const link = new RegExp(
      `\\s*<link rel="stylesheet" href="css/${name.replace('.', '\\.')}[^"]*" />`
    );
    if (!link.test(html)) continue;
    html = html.replace(
      link,
      replacedFirst ? '' : '\n    <link rel="stylesheet" href="css/app.css" />'
    );
    replacedFirst = true;
  }

  // Only main.js is needed once bundled; the other module tags were loading
  // the same graph a second time.
  html = html.replace(
    /\s*<script type="module" src="js\/utils\.js"><\/script>[\s\S]*?<script type="module" src="js\/main\.js"><\/script>/,
    '\n    <script type="module" src="js/app.js"></script>'
  );

  await writeFile(path.join(OUT, 'index.html'), html);
  return html.length;
}

/**
 * The document pages: /model/ and /instructors/.
 *
 * These are ordinary static pages rather than part of the app bundle, so they
 * are copied with their stylesheet links collapsed onto the built CSS. The
 * instructor portal is a module of its own; it is bundled separately because it
 * shares the lesson data with the app but none of the simulation.
 */
async function buildDocPages() {
  for (const dir of DOC_PAGES) {
    if (!existsSync(dir)) continue;
    await mkdir(path.join(OUT, dir), { recursive: true });
    let html = await readFile(path.join(dir, 'index.html'), 'utf8');
    // The four dev stylesheets collapse into the one built file, exactly as
    // they do for the app's own page.
    html = html.replace(
      /\s*<link rel="stylesheet" href="\/css\/tokens\.css" \/>\s*<link rel="stylesheet" href="\/css\/styles\.css" \/>\s*<link rel="stylesheet" href="\/css\/components\.css" \/>\s*<link rel="stylesheet" href="\/css\/page\.css" \/>/,
      '\n    <link rel="stylesheet" href="/css/app.css" />'
    );
    await writeFile(path.join(OUT, dir, 'index.html'), html);
  }

  // The portal's own bundle. Kept out of the app bundle because nothing in the
  // simulation imports it and nothing it imports needs the simulation.
  if (existsSync('js/instructorPortal.js')) {
    await esbuild.build({
      entryPoints: ['js/instructorPortal.js'],
      bundle: true,
      minify: true,
      // physics.js branches on constructor.name in fifteen places. Without
      // this, minification renames the classes and every one of those branches
      // is false in production and true in development.
      keepNames: true,
      format: 'esm',
      target: ['es2022'],
      outfile: path.join(OUT, 'js', 'instructorPortal.js'),
      legalComments: 'none',
    });
  }

  // The validation page's committed results. Regenerated by
  // `npm run validation:data`, and committed rather than produced here because
  // running the suite takes ten seconds and GitHub Pages runs no build at all.
  if (existsSync('validation/data.json')) {
    await cp('validation/data.json', path.join(OUT, 'validation', 'data.json'));
  } else {
    console.warn(
      '\n  ! validation/data.json is missing. Run "npm run validation:data",\n' +
        '    or the validation page will have no results to show until a\n' +
        '    visitor presses Run.\n'
    );
  }

  // The worker that lets the validation page re-run the suite in the browser.
  // Bundled rather than copied: it imports the checks from tools/, which is a
  // development directory and is not part of the deployed site.
  if (existsSync('js/validationWorker.js')) {
    await esbuild.build({
      entryPoints: ['js/validationWorker.js'],
      bundle: true,
      minify: true,
      // physics.js branches on constructor.name in fifteen places. Without
      // this, minification renames the classes and every one of those branches
      // is false in production and true in development.
      keepNames: true,
      format: 'esm',
      target: ['es2022'],
      outfile: path.join(OUT, 'js', 'validationWorker.js'),
      legalComments: 'none',
    });
  }

  if (existsSync('js/validationPage.js')) {
    await esbuild.build({
      entryPoints: ['js/validationPage.js'],
      bundle: true,
      minify: true,
      // physics.js branches on constructor.name in fifteen places. Without
      // this, minification renames the classes and every one of those branches
      // is false in production and true in development.
      keepNames: true,
      format: 'esm',
      target: ['es2022'],
      outfile: path.join(OUT, 'js', 'validationPage.js'),
      legalComments: 'none',
    });
  }

  // The encrypted materials. Absent when the build has not been run, which is
  // a warning rather than a failure: the rest of the site is unaffected.
  const payload = 'instructors/materials.enc.json';
  if (existsSync(payload)) {
    await cp(payload, path.join(OUT, payload));
  } else {
    console.warn(
      `\n  ! ${payload} is missing. Run "npm run build:instructors" first,\n` +
        '    or the instructor area will have nothing to unlock.\n'
    );
  }
}

async function copyStatic() {
  for (const f of STATIC_FILES) {
    if (existsSync(f)) await cp(f, path.join(OUT, f));
  }
  for (const d of STATIC_DIRS) {
    if (existsSync(d)) await cp(d, path.join(OUT, d), { recursive: true });
  }
  // GitHub Pages otherwise runs the output through Jekyll
  await writeFile(path.join(OUT, '.nojekyll'), '');
}

async function run() {
  await rm(OUT, { recursive: true, force: true });
  await mkdir(path.join(OUT, 'js'), { recursive: true });
  await mkdir(path.join(OUT, 'css'), { recursive: true });

  const [css, js] = await Promise.all([buildCss(), buildJs()]);
  await buildHtml();
  await buildDocPages();
  await copyStatic();

  const kb = n => `${(n / 1024).toFixed(1)} KB`;
  console.log(`\nCSS                ${kb(css).padStart(9)}`);
  console.log(
    `JS at start-up     ${kb(js.initial).padStart(9)}   ${js.initialFiles} file(s)`
  );
  console.log(
    `JS on demand       ${kb(js.deferred).padStart(9)}   ${js.deferredFiles} chunk(s)`
  );
  console.log(`\nInitial download   ${kb(css + js.initial).padStart(9)}`);
  console.log(`Built to ${OUT}/: publish that directory.`);
}

if (watch) {
  const ctx = await esbuild.context({
    entryPoints: ['js/main.js'],
    bundle: true,
    format: 'esm',
    target: ['es2022'],
    outfile: path.join(OUT, 'js', 'app.js'),
    external: ['three', 'three/addons/*'],
  });
  await ctx.watch();
  console.log('watching…');
} else {
  await run();
}
