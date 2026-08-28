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
// are deliberately excluded — publishing the repo root shipped all of them.
const STATIC_FILES = [
  'favicon.ico',
  'favicon.png',
  'CNAME',
  'Gravitas_User_Manual.pdf',
  'robots.txt',
  'sitemap.xml',
  'social-card.png',
];

async function buildCss() {
  // tokens → styles → components, matching the cascade-layer order.
  const parts = [];
  for (const f of ['css/tokens.css', 'css/styles.css', 'css/components.css']) {
    parts.push(`/* ${f} */`, await readFile(f, 'utf8'));
  }
  const combined = parts.join('\n');
  const result = await esbuild.transform(combined, {
    loader: 'css',
    minify: true,
    legalComments: 'none',
  });
  await writeFile(path.join(OUT, 'css', 'app.css'), result.code);
  return result.code.length;
}

async function buildJs() {
  const result = await esbuild.build({
    entryPoints: ['js/main.js'],
    bundle: true,
    minify: true,
    format: 'esm',
    target: ['es2022'],
    outfile: path.join(OUT, 'js', 'app.js'),
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
    format: 'esm',
    target: ['es2022'],
    outdir: path.join(OUT, 'js'),
    legalComments: 'none',
  });

  const bytes = Object.values(result.metafile.outputs).reduce(
    (a, o) => a + o.bytes,
    0
  );
  return bytes;
}

async function buildHtml() {
  let html = await readFile('index.html', 'utf8');

  // Collapse the three stylesheet links into the single built file
  html = html.replace(
    /\s*<link rel="stylesheet" href="css\/tokens\.css[^"]*" \/>\s*<link rel="stylesheet" href="css\/styles\.css[^"]*" \/>\s*<link rel="stylesheet" href="css\/components\.css[^"]*" \/>/,
    '\n    <link rel="stylesheet" href="css/app.css" />'
  );

  // Only main.js is needed once bundled; the other module tags were loading
  // the same graph a second time.
  html = html.replace(
    /\s*<script type="module" src="js\/utils\.js"><\/script>[\s\S]*?<script type="module" src="js\/main\.js"><\/script>/,
    '\n    <script type="module" src="js/app.js"></script>'
  );

  await writeFile(path.join(OUT, 'index.html'), html);
  return html.length;
}

async function copyStatic() {
  for (const f of STATIC_FILES) {
    if (existsSync(f)) await cp(f, path.join(OUT, f));
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
  await copyStatic();

  const kb = n => `${(n / 1024).toFixed(1)} KB`;
  console.log(`dist/css/app.css  ${kb(css)}`);
  console.log(`dist/js/app.js    ${kb(js)}`);
  console.log(`\nBuilt to ${OUT}/ — publish that directory.`);
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
