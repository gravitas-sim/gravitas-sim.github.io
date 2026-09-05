#!/usr/bin/env node
// =============================================================================
// npm run vendor  /  npm run vendor:check
// -----------------------------------------------------------------------------
// Turns two pinned npm packages into two files the browser can load directly.
//
// Why files rather than bare imports
// -----------------------------------------------------------------------------
// Gravitas is served two ways. GitHub Pages serves the repository root
// unbundled - that is the live site - and the production bundle in dist/ is
// built with esbuild. Source mode has no resolver: `import * as THREE from
// 'three'` means nothing to a browser, and node_modules is not published.
//
// That is what the import map in index.html used to paper over, by pointing
// `three` at jsdelivr. It worked, and it meant the 3-D view could not open
// without a third-party request, could not be pinned by the lockfile, and
// could not be cached by the service worker.
//
// So the two libraries are bundled here, once, into real files under vendor/
// with real relative paths. Both source mode and esbuild follow exactly the
// same specifier, which is the point: there is no way for the two builds to
// load different code.
//
// Why the output is committed
// -----------------------------------------------------------------------------
// Because Pages serves the repository. A generated file that is not committed
// is a 404 on the live site.
//
// --check rebuilds into memory and compares, so a lockfile bump that changes
// three or chart.js fails CI until the vendored files are regenerated. That is
// the only thing keeping "pinned in package.json" and "what the site loads"
// from drifting apart.
// =============================================================================

import { build } from 'esbuild';
import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { statSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const check = process.argv.includes('--check');

/**
 * What to vendor.
 *
 * `entry` is generated rather than pointed at a file in the package, because
 * three's OrbitControls is a separate module and the two are wanted as one
 * import in js/view3d.js.
 */
const TARGETS = [
  {
    package: 'three',
    out: 'vendor/three/three.module.js',
    license: 'vendor/three/LICENSE',
    entry: [
      "export * from 'three';",
      "export { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';",
    ].join('\n'),
  },
  {
    package: 'chart.js',
    out: 'vendor/chartjs/chart.auto.js',
    license: 'vendor/chartjs/LICENSE.md',
    entry: [
      // chart.js/auto registers every controller, scale and element, which is
      // what the CDN build did and what both consumers assume.
      "export { default as Chart } from 'chart.js/auto';",
      "export * from 'chart.js';",
    ].join('\n'),
  },
];

/**
 * The version the lockfile actually installed.
 *
 * Read out of node_modules rather than through require.resolve: three's
 * exports map does not expose package.json, which is increasingly common and
 * throws ERR_PACKAGE_PATH_NOT_EXPORTED.
 */
const packageDirOf = name => `node_modules/${name}`;
const versionOf = name =>
  JSON.parse(
    require('node:fs').readFileSync(
      `${packageDirOf(name)}/package.json`,
      'utf8'
    )
  ).version;

async function bundle(target) {
  const version = versionOf(target.package);
  const result = await build({
    stdin: {
      contents: target.entry,
      resolveDir: process.cwd(),
      sourcefile: `${target.package}-vendor-entry.js`,
      loader: 'js',
    },
    bundle: true,
    format: 'esm',
    minify: true,
    target: ['es2022'],
    legalComments: 'none',
    write: false,
    banner: {
      js:
        `/* ${target.package} ${version} - bundled from node_modules by ` +
        `tools/vendor-deps.mjs. Do not edit.\n` +
        `   Licence: see ${target.license}. Regenerate with \`npm run vendor\`. */`,
    },
  });
  return { text: result.outputFiles[0].text, version };
}

let drift = 0;
const report = [];

for (const target of TARGETS) {
  const { text, version } = await bundle(target);
  let current = null;
  try {
    current = await readFile(target.out, 'utf8');
  } catch {
    /* not vendored yet */
  }

  if (check) {
    if (current !== text) {
      drift++;
      console.error(
        `${target.out} is not what ${target.package} ${version} would produce.\n` +
          `  Run \`npm run vendor\` and commit the result.`
      );
    }
    continue;
  }

  await mkdir(target.out.replace(/\/[^/]+$/, ''), { recursive: true });
  await writeFile(target.out, text);

  // The licence travels with the code. Both are permissive - three is MIT,
  // chart.js is MIT - and neither is redistributable without its notice.
  const packageDir = packageDirOf(target.package);
  for (const name of ['LICENSE', 'LICENSE.md', 'LICENCE']) {
    try {
      await copyFile(`${packageDir}/${name}`, target.license);
      break;
    } catch {
      /* try the next spelling */
    }
  }

  report.push(
    `${target.out}  ${target.package}@${version}  ${(text.length / 1024).toFixed(1)} KB`
  );
}

// --- Fonts --------------------------------------------------------------------
// The same problem and the same answer. index.html used to pull three families
// from fonts.googleapis.com: a third-party request on every visit, unavailable
// offline, and it tells Google who is using a classroom tool.
//
// These are the nine faces that request actually asked for, taken from the
// @fontsource packages - the upstream Google Fonts releases, redistributed
// under the SIL Open Font Licence, which travels with them into vendor/fonts/.
//
// Only the `latin` subset. It covers U+0000-00FF, which is every character
// English and Spanish need including the accents and the inverted marks;
// `latin-ext` covers alphabets Gravitas is not translated into and would double
// the bytes for nothing.
const FONT_FACES = [
  {
    package: '@fontsource/inter',
    family: 'Inter',
    file: 'inter',
    weights: [400, 500, 600, 700],
  },
  {
    package: '@fontsource/poppins',
    family: 'Poppins',
    file: 'poppins',
    weights: [300, 400, 600],
  },
  {
    package: '@fontsource/roboto-mono',
    family: 'Roboto Mono',
    file: 'roboto-mono',
    weights: [400, 700],
  },
];

const LATIN_RANGE =
  'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,' +
  'U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,' +
  'U+FEFF,U+FFFD';

const HEAD = [
  '/* =============================================================================',
  ' * Self-hosted fonts',
  ' * -----------------------------------------------------------------------------',
  ' * Generated by tools/vendor-deps.mjs. Do not edit.',
  ' *',
  ' * These replace a runtime request to fonts.googleapis.com. The files are the',
  ' * upstream Google Fonts releases redistributed by @fontsource under the SIL',
  " * Open Font Licence; each family's licence sits beside the files it covers in",
  ' * vendor/fonts/.',
  ' *',
  ' * Regenerate with `npm run vendor`; `npm run vendor:check` fails if this file',
  ' * is not what the installed packages would produce.',
  ' * ========================================================================== */',
  '',
  '',
].join('\n');

const faceRules = [];
const fontCopies = [];
let fontBytes = 0;

for (const font of FONT_FACES) {
  const dir = packageDirOf(font.package);
  const version = versionOf(font.package);
  for (const weight of font.weights) {
    const name = `${font.file}-latin-${weight}-normal.woff2`;
    fontCopies.push({
      from: `${dir}/files/${name}`,
      to: `vendor/fonts/${name}`,
    });
    fontBytes += statSync(`${dir}/files/${name}`).size;
    faceRules.push(
      [
        `/* ${font.family} ${weight} - ${font.package}@${version} */`,
        '@font-face {',
        `  font-family: '${font.family}';`,
        '  font-style: normal;',
        `  font-weight: ${weight};`,
        // swap rather than block: the system stack in --font-sans is a real
        // fallback, and text a reader can see beats text that is invisible.
        '  font-display: swap;',
        `  src: url('../vendor/fonts/${name}') format('woff2');`,
        `  unicode-range: ${LATIN_RANGE};`,
        '}',
      ].join('\n')
    );
  }
}

const fontCss = HEAD + faceRules.join('\n\n') + '\n';

if (check) {
  const current = await readFile('css/fonts.css', 'utf8').catch(() => null);
  if (current !== fontCss) {
    drift++;
    console.error(
      'css/fonts.css is not what the installed @fontsource packages would ' +
        'produce.\n  Run `npm run vendor` and commit the result.'
    );
  }
  for (const { from, to } of fontCopies) {
    const [a, b] = await Promise.all([
      readFile(from).catch(() => null),
      readFile(to).catch(() => null),
    ]);
    if (!a || !b || !a.equals(b)) {
      drift++;
      console.error(`${to} does not match ${from}. Run \`npm run vendor\`.`);
    }
  }
} else {
  await mkdir('vendor/fonts', { recursive: true });
  for (const { from, to } of fontCopies) await copyFile(from, to);
  for (const font of FONT_FACES) {
    const dir = packageDirOf(font.package);
    for (const licence of ['LICENSE', 'LICENSE.md', 'LICENCE']) {
      try {
        await copyFile(
          `${dir}/${licence}`,
          `vendor/fonts/${font.file}-LICENSE`
        );
        break;
      } catch {
        /* next spelling */
      }
    }
  }
  await writeFile('css/fonts.css', fontCss);
  report.push(
    `css/fonts.css + vendor/fonts/  ${fontCopies.length} faces  ` +
      `${(fontBytes / 1024).toFixed(1)} KB`
  );
}

if (check) {
  if (drift) process.exit(1);
  console.log('vendor/ and css/fonts.css match the installed packages.');
} else {
  console.log('Vendored:');
  for (const line of report) console.log(`  ${line}`);
  console.log('\nCommit vendor/ - GitHub Pages serves the repository root.');
}
