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
 *   index.html and the stylesheets       the shell
 *   every js/ module except the Spanish  the application, including every
 *     lesson shadows                     English lesson body - see below
 *   the scenario thumbnails              the gallery is unusable without them
 *   the one lesson photograph            a lesson figure, licensed for
 *                                        redistribution and served from here
 *   the two favicons                     small, and their absence is visible
 *
 * Out:
 *   js/data/investigations/es/*.js       runtime-cached; see below
 *   the user manual PDF                  a download, not part of the shell
 *   model/, instructors/,                separate document pages, runtime-cached
 *     validation/, teaching/
 *   notebooks/                           downloads
 *   social-card.png                      only ever fetched by a link unfurler
 *
 * On the lessons
 * -----------------------------------------------------------------------------
 * Each lesson is one dynamically imported file, so the question of which to
 * precache is a real one and the honest answer is not "all of them".
 *
 * Every English body is precached, about a tenth of the payload. The exact
 * figure moves with the lesson set and is not worth writing down here; the
 * generated manifest's own header carries the file count and total bytes it
 * measured, and `npm run sw:check` fails when they have drifted.
 *
 * The failure this whole exercise is about is wifi dropping mid-lesson, and the
 * lesson already open is by definition already fetched - what precaching buys is
 * the teacher who switches lesson *after* the drop, which is exactly the moment
 * a runtime cache has nothing. A tenth of the payload to remove that cliff is
 * worth it, and choosing a favorite subset would be guessing at which lesson a
 * class is about to want.
 *
 * The Spanish shadows are not precached: comparable weight again, only ever
 * fetched when the interface is in Spanish, which is a deliberate choice a
 * minority of readers make. They are runtime-cached on first use like anything
 * else, and js/main.js asks the worker to warm them when the language is
 * switched - so a Spanish classroom is covered from the moment it chooses
 * Spanish rather than from the moment it opens a lesson.
 */

import { readFile, writeFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';

import { LOCALES } from '../js/i18n/index.js';

/**
 * Where the translated lesson bodies live, one directory per locale.
 *
 * English is the base and has no shadow directory; every other locale has one
 * named for its id.
 */
const SHADOW_ROOT = 'js/data/investigations';
const SHADOW_LOCALES = LOCALES.map(l => l.id).filter(id => id !== 'en');

const OUT = 'sw-manifest.js';

/**
 * Directories walked whole, with the extensions taken from each.
 *
 * `core` decides what happens when one of them cannot be fetched at install
 * time. A core file is one the application is broken or unrecognisable
 * without: the shell, every module, the stylesheets, the self-hosted fonts and
 * the two vendored libraries. If any of those is missing the install fails and
 * the new worker never activates, because half a build is worse than the old
 * build - it is the mixed revision this whole arrangement exists to prevent.
 *
 * Everything else is a picture. A scenario thumbnail that 404s during install
 * is worth reporting and not worth refusing an entire version over: the reader
 * gets the new application with one missing preview, and the runtime cache
 * picks the picture up the next time it is asked for.
 */
const TREES = [
  { dir: 'js', ext: ['.js'], core: true },
  { dir: 'css', ext: ['.css'], core: true },
  // The self-hosted fonts and the two vendored libraries. These used to come
  // from Google and jsdelivr, which meant the interface lost its typography
  // and the 3-D view and the charts stopped working the moment the network
  // did - the precise failure the offline support exists to prevent.
  { dir: 'vendor', ext: ['.woff2', '.js'], core: true },
  { dir: 'images/scenarios', ext: ['.webp'], core: false },
];

/** Individually named files. */
const FILES = [
  { path: 'index.html', core: true },
  { path: 'favicon.ico', core: false },
  { path: 'favicon.png', core: false },
  { path: 'images/transit-of-venus-2012.jpg', core: false },
];

/**
 * Paths kept out of the precache. Matched against the repo-relative path.
 *
 * The translated lesson shadows are the deliberate exclusion; see the header.
 *
 * This matches ANY locale-shaped subdirectory rather than the locales that
 * happen to be registered, and that difference is the whole point. The
 * directories are walked by `{ dir: 'js', core: true }` above, so anything not
 * excluded here is precached as CORE - and one 404 among core assets makes
 * sw.js delete the cache and reject the install, for every reader on earth
 * rather than only for readers of that language. A pattern keyed to LOCALES
 * would put an unregistered directory straight into that failure; a pattern
 * keyed to the shape of the path cannot. `assertShadowsMatchLocales()` then
 * refuses the build if the two ever disagree, so neither an unregistered
 * directory nor a registered locale with no directory can pass quietly.
 */
const EXCLUDE = [new RegExp(`^${SHADOW_ROOT}/[a-z]{2}(-[A-Za-z]{2,4})?/`)];

/**
 * Whether a repo-relative path is a translated lesson body.
 *
 * Exported so the property can be asserted directly rather than inferred from
 * a manifest that happens to contain only the locales on disk today.
 *
 * @param {string} p - Repo-relative path
 * @returns {boolean} Whether it is a locale shadow
 */
export const isLocaleShadow = p => EXCLUDE.some(re => re.test(p));

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
  const collected = FILES.map(f => ({ path: f.path, core: f.core }));
  for (const { dir, ext, core } of TREES) {
    for (const path_ of await walk(dir, ext))
      collected.push({ path: path_, core });
  }

  const kept = collected
    .filter(f => !EXCLUDE.some(re => re.test(f.path)))
    .sort((a, b) => a.path.localeCompare(b.path));
  const paths = kept.map(f => f.path);
  const core = kept.filter(f => f.core).map(f => f.path);
  const optional = kept.filter(f => !f.core).map(f => f.path);

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

  return { paths, core, optional, version, bytes };
}

/**
 * Render the manifest as the file the worker imports.
 *
 * @param {object} manifest - As buildManifest
 * @param {string[]} localeWarm - Spanish shadows, warmed on demand not at install
 * @returns {string} File contents
 */
export function renderManifest(
  { paths, core, optional, version, bytes },
  localeWarm
) {
  // A Map keyed by locale id. Accepts the older array-of-Spanish-paths shape
  // too, so a caller that has not been updated still produces a correct file
  // rather than a silently empty warm list.
  const warm =
    localeWarm instanceof Map
      ? localeWarm
      : new Map([['es', localeWarm || []]]);
  const warmBlock = [...warm.entries()]
    .map(
      ([id, files]) =>
        `  ${id}: [\n${files.map(p => `    './${p}',`).join('\n')}\n  ],`
    )
    .join('\n');
  const kb = Math.round(bytes / 1024);
  return `// Generated by tools/build-service-worker.mjs. Do not edit.
//
// ${paths.length} files, ${kb}KB. The version is a hash of their contents, so
// it changes when they do and only when they do - which is what makes the old
// cache safe to delete on activate and safe to keep otherwise.
//
// Split two ways, and the split is what install enforces. The ${core.length} core
// entries are the shell, the modules, the stylesheets and the self-hosted
// fonts and libraries: if any one of them cannot be fetched the install fails
// and this version never activates, because a half-cached build is the mixed
// revision the whole arrangement exists to prevent. The ${optional.length} optional
// entries are pictures; a missing one is reported and does not cost the reader
// the version.
self.__GRAVITAS_CACHE_VERSION = 'gravitas-${version}';
self.__GRAVITAS_PRECACHE_BYTES = ${bytes};
self.__GRAVITAS_PRECACHE_CORE = [
${core.map(p => `  './${p}',`).join('\n')}
];
self.__GRAVITAS_PRECACHE_OPTIONAL = [
${optional.map(p => `  './${p}',`).join('\n')}
];
// The union, in one sorted list, for the fetch handler's "is this precached?"
// question and for the diagnostics readout.
self.__GRAVITAS_PRECACHE = [
${paths.map(p => `  './${p}',`).join('\n')}
];

// Not precached: fetched on demand, and warmed deliberately when the interface
// switches to that language. See the header of the generator for why these are
// treated differently from the English bodies - and note that being absent from
// both precache lists is what makes a missing translated lesson unable to fail
// an install.
self.__GRAVITAS_LOCALE_WARM = {
${warmBlock}
};
`;
}

/**
 * The shadow directories actually on disk, locale id -> sorted paths.
 *
 * @returns {Promise<Map<string, string[]>>} What is there
 */
async function shadowsOnDisk() {
  const found = new Map();
  for (const entry of await readdir(SHADOW_ROOT, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    if (!/^[a-z]{2}(-[A-Za-z]{2,4})?$/.test(entry.name)) continue;
    const files = (
      await walk(path.posix.join(SHADOW_ROOT, entry.name), ['.js'])
    ).sort((a, b) => a.localeCompare(b));
    found.set(entry.name, files);
  }
  return found;
}

/**
 * Refuse to build when the shadow directories and the locale registry disagree.
 *
 * An unregistered directory is the dangerous half: it would be warmed by
 * nothing and, but for the shape-based exclusion above, precached as core. A
 * registered locale with no directory is the harmless half, and still a bug
 * worth failing on, because the picker would offer a language whose lessons do
 * not exist.
 *
 * @param {Map<string, string[]>} onDisk - From shadowsOnDisk()
 */
function assertShadowsMatchLocales(onDisk) {
  const registered = new Set(SHADOW_LOCALES);
  const orphaned = [...onDisk.keys()].filter(id => !registered.has(id));
  const missing = SHADOW_LOCALES.filter(id => !onDisk.has(id));
  if (!orphaned.length && !missing.length) return;

  const lines = [];
  if (orphaned.length) {
    lines.push(
      `  ${SHADOW_ROOT}/ has ${orphaned.join(', ')} with no entry in LOCALES ` +
        '(js/i18n/index.js). Register the locale, or remove the directory.'
    );
  }
  if (missing.length) {
    lines.push(
      `  LOCALES registers ${missing.join(', ')} with no ${SHADOW_ROOT}/<id>/ ` +
        'directory. Add the shadows, or remove the locale.'
    );
  }
  throw new Error(
    'The lesson shadow directories and the locale registry disagree:\n' +
      lines.join('\n')
  );
}

/** @returns {Promise<string>} What the file should contain right now */
export async function expectedFile() {
  const manifest = await buildManifest();
  const onDisk = await shadowsOnDisk();
  assertShadowsMatchLocales(onDisk);
  // Registry order, not directory order, so the generated file does not change
  // because a filesystem enumerated differently.
  const localeWarm = new Map(
    SHADOW_LOCALES.map(id => [id, onDisk.get(id) || []])
  );
  return renderManifest(manifest, localeWarm);
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
