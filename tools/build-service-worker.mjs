#!/usr/bin/env node
/**
 * Generate the service worker's precache manifest.
 *
 *   node tools/build-service-worker.mjs           write sw-manifest.js
 *   node tools/build-service-worker.mjs --check   fail if it is out of date
 *
 * Why this is generated rather than written by hand
 * -----------------------------------------------------------------------------
 * Two things have to be true at once and neither survives a hand-maintained
 * list. Every file the application needs offline has to be in it, or a
 * classroom loses a lesson when the wifi drops; and the cache name has to change
 * whenever any of those files changes, or a returning browser serves last
 * week's JavaScript out of its cache forever. Both are mechanical facts about
 * the tree, so the tree is what produces them.
 *
 * What gets precached, and what does not
 * -----------------------------------------------------------------------------
 * Gravitas is published as the repository root. There is no deploy step and
 * `dist/` is gitignored: GitHub Pages serves the unbundled sources, which is why
 * the live site answers for `/js/physics.js`. So this walks the source tree, not
 * the bundle, and the paths below are the paths the browser actually requests.
 *
 * In:
 *   index.html and the six stylesheets   the shell
 *   every js/ module except the Spanish  the application, including all twelve
 *     lesson shadows                     English lesson bodies - see below
 *   the 53 scenario thumbnails           the gallery is unusable without them
 *   the one lesson photograph            a lesson figure, licensed for
 *                                        redistribution and served from here
 *   the two favicons                     small, and their absence is visible
 *
 * Out:
 *   js/data/investigations/es/*.js       runtime-cached; see below
 *   the user manual PDF                  a download, not part of the shell
 *   model/, instructors/, validation/    separate document pages, runtime-cached
 *   notebooks/                           downloads
 *   social-card.png                      only ever fetched by a link unfurler
 *
 * On the twelve lessons
 * -----------------------------------------------------------------------------
 * Each lesson is one dynamically imported file, so the question of which to
 * precache is a real one and the honest answer is not "all of them".
 *
 * All twelve English bodies are precached: 553KB, about a tenth of the payload.
 * The failure this whole exercise is about is wifi dropping mid-lesson, and the
 * lesson already open is by definition already fetched - what precaching buys is
 * the teacher who switches lesson *after* the drop, which is exactly the moment
 * a runtime cache has nothing. A tenth of the payload to remove that cliff is
 * worth it, and choosing a favourite subset would be guessing at which lesson a
 * class is about to want.
 *
 * The twelve Spanish shadows are not precached: another 439KB that is only ever
 * fetched when the interface is in Spanish, which is a deliberate choice a
 * minority of readers make. They are runtime-cached on first use like anything
 * else, and js/main.js asks the worker to warm them when the language is
 * switched - so a Spanish classroom is covered from the moment it chooses
 * Spanish rather than from the moment it opens a lesson.
 */

import { readFile, writeFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';

const OUT = 'sw-manifest.js';

/** Directories walked whole, with the extensions taken from each. */
const TREES = [
  { dir: 'js', ext: ['.js'] },
  { dir: 'css', ext: ['.css'] },
  { dir: 'images/scenarios', ext: ['.webp'] },
  // The self-hosted fonts and the two vendored libraries. These used to come
  // from Google and jsdelivr, which meant the interface lost its typography
  // and the 3-D view and the charts stopped working the moment the network
  // did - the precise failure the offline support exists to prevent.
  { dir: 'vendor', ext: ['.woff2', '.js'] },
];

/** Individually named files. */
const FILES = [
  'index.html',
  'favicon.ico',
  'favicon.png',
  'images/transit-of-venus-2012.jpg',
];

/**
 * Paths kept out of the precache. Matched against the repo-relative path.
 *
 * The Spanish lesson shadows are the deliberate exclusion; see the header.
 */
const EXCLUDE = [/^js\/data\/investigations\/es\//];

/**
 * Every file under a directory, recursively, with the wanted extensions.
 *
 * @param {string} dir - Directory to walk
 * @param {string[]} ext - Extensions to keep
 * @returns {Promise<string[]>} Repo-relative paths
 */
async function walk(dir, ext) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.posix.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(full, ext)));
    else if (ext.some(e => entry.name.endsWith(e))) out.push(full);
  }
  return out;
}

/**
 * The precache list and the version its contents imply.
 *
 * @returns {Promise<{paths: string[], version: string, bytes: number}>} Manifest
 */
export async function buildManifest() {
  const collected = [...FILES];
  for (const { dir, ext } of TREES) collected.push(...(await walk(dir, ext)));

  const paths = collected
    .filter(p => !EXCLUDE.some(re => re.test(p)))
    .sort((a, b) => a.localeCompare(b));

  // The version is a hash of what is in the files, not of their names or of
  // the clock. Two builds of an unchanged tree produce the same version, so a
  // rebuild does not evict a cache that is still correct; changing one byte of
  // one module produces a new one, so nothing stale can survive.
  const digest = createHash('sha256');
  let bytes = 0;
  for (const p of paths) {
    const body = await readFile(p);
    bytes += body.length;
    digest.update(p);
    digest.update(createHash('sha256').update(body).digest());
  }
  const version = digest.digest('hex').slice(0, 12);

  return { paths, version, bytes };
}

/**
 * Render the manifest as the file the worker imports.
 *
 * @param {object} manifest - As buildManifest
 * @param {string[]} localeWarm - Spanish shadows, warmed on demand not at install
 * @returns {string} File contents
 */
export function renderManifest({ paths, version, bytes }, localeWarm) {
  const kb = Math.round(bytes / 1024);
  return `// Generated by tools/build-service-worker.mjs. Do not edit.
//
// ${paths.length} files, ${kb}KB. The version is a hash of their contents, so
// it changes when they do and only when they do - which is what makes the old
// cache safe to delete on activate and safe to keep otherwise.
self.__GRAVITAS_CACHE_VERSION = 'gravitas-${version}';
self.__GRAVITAS_PRECACHE_BYTES = ${bytes};
self.__GRAVITAS_PRECACHE = [
${paths.map(p => `  './${p}',`).join('\n')}
];

// Not precached: fetched on demand, and warmed deliberately when the interface
// switches to Spanish. See the header of the generator for why these twelve are
// treated differently from the twelve English bodies.
self.__GRAVITAS_LOCALE_WARM = {
  es: [
${localeWarm.map(p => `    './${p}',`).join('\n')}
  ],
};
`;
}

/** @returns {Promise<string>} What the file should contain right now */
export async function expectedFile() {
  const manifest = await buildManifest();
  const es = (await walk('js/data/investigations/es', ['.js'])).sort((a, b) =>
    a.localeCompare(b)
  );
  return renderManifest(manifest, es);
}

async function main() {
  const check = process.argv.includes('--check');
  const wanted = await expectedFile();
  let current = null;
  try {
    current = await readFile(OUT, 'utf8');
  } catch {
    current = null;
  }

  if (check) {
    if (current === wanted) {
      const { paths, version, bytes } = await buildManifest();
      console.log(
        `${OUT} is current: ${paths.length} files, ${Math.round(bytes / 1024)}KB, version ${version}.`
      );
      return;
    }
    console.error(
      `${OUT} is out of date. Run \`npm run sw:manifest\` and commit the result.`
    );
    process.exitCode = 1;
    return;
  }

  if (current === wanted) {
    console.log(`${OUT} already current.`);
    return;
  }
  await writeFile(OUT, wanted);
  const { paths, version, bytes } = await buildManifest();
  console.log(
    `Wrote ${OUT}: ${paths.length} files, ${Math.round(bytes / 1024)}KB, version ${version}.`
  );
}

if (import.meta.url === `file://${process.argv[1]}`) await main();
