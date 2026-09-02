#!/usr/bin/env node
// =============================================================================
// Internal link and asset checker
// -----------------------------------------------------------------------------
// Walks every HTML file in a tree, collects every internal reference it makes -
// hrefs, scripts, stylesheets, images, preloads, manifests - and checks that the
// thing on the other end exists. Also checks the fragment targets: a link to
// /model/#validation that points at an id nobody wrote is a broken link even
// though the page loads.
//
//   npm run validate:links               the repository as it is served in dev
//   node tools/check-links.mjs --root dist   the built site
//
// Why this and not a crawler
// -----------------------------------------------------------------------------
// A crawler needs a browser and a running server and tells you about the pages
// it managed to reach. This reads the files, so it also catches a reference from
// a page nothing links to yet, and it runs in about a tenth of a second. It is
// the fast job in CI; the Playwright suite covers what only a browser can see.
//
// External links are listed and not fetched. A CI job that fails because
// somebody else's server was down teaches people to ignore CI.
// =============================================================================

import { readFile, readdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, resolve, dirname, relative, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// Directories never worth walking. `dist` is excluded from the default run
// because it is checked separately, against itself, after a build.
const SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  'coverage',
  'dist',
  '.instructor-build',
  'test-results',
  'playwright-report',
  'blob-report',
]);

// Attributes that carry a reference to something that has to exist.
const REF_ATTRS = ['href', 'src', 'poster', 'data-src'];

/**
 * Every HTML file under a root.
 * @param {string} root - Directory to walk
 * @returns {Promise<string[]>} Absolute paths
 */
async function htmlFiles(root) {
  const out = [];
  const walk = async dir => {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      if (entry.name.startsWith('.') && entry.name !== '.well-known') continue;
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (SKIP_DIRS.has(entry.name)) continue;
        await walk(full);
      } else if (extname(entry.name) === '.html') {
        // The stray test_*.html harnesses in the repository root are historical
        // scratch pages, not part of the site, and several reference fixtures
        // that were never committed. They are not served and not built.
        if (/^test[_-]/.test(entry.name)) continue;
        out.push(full);
      }
    }
  };
  await walk(root);
  return out;
}

/**
 * Pull the references and the anchor ids out of one HTML file.
 *
 * A regex rather than a parser, deliberately: the alternative is a dependency,
 * and the shapes involved here are attribute values in files this project
 * writes by hand. It over-collects rather than under-collects - a commented-out
 * tag still gets checked - which is the safe direction for a link checker.
 *
 * @param {string} html - File contents
 * @returns {{refs: Array<{attr: string, value: string}>, ids: Set<string>}} Found
 */
function parse(html) {
  const refs = [];
  for (const attr of REF_ATTRS) {
    const re = new RegExp(`\\b${attr}\\s*=\\s*["']([^"']*)["']`, 'gi');
    for (const m of html.matchAll(re)) refs.push({ attr, value: m[1].trim() });
  }
  const ids = new Set();
  for (const m of html.matchAll(/\bid\s*=\s*["']([^"']+)["']/gi)) {
    ids.add(m[1]);
  }
  // <a name="..."> is still a legal fragment target.
  for (const m of html.matchAll(/<a\b[^>]*\bname\s*=\s*["']([^"']+)["']/gi)) {
    ids.add(m[1]);
  }
  return { refs, ids };
}

/** True for a reference that points somewhere this checker cannot follow. */
const isExternal = value =>
  /^(https?:|mailto:|tel:|data:|blob:|javascript:|#|\/\/)/i.test(value) ||
  value === '';

/**
 * Resolve a reference to a path on disk.
 * @param {string} root - The served root
 * @param {string} fromFile - The file the reference appears in
 * @param {string} value - The attribute value
 * @returns {{file: string, fragment: string}} Absolute path and any fragment
 */
function resolveRef(root, fromFile, value) {
  const [pathPart, fragment = ''] = value.split('#');
  const clean = pathPart.split('?')[0];
  let file;
  if (clean === '') {
    file = fromFile;
  } else if (clean.startsWith('/')) {
    file = join(root, clean);
  } else {
    file = join(dirname(fromFile), clean);
  }
  return { file: resolve(file), fragment };
}

async function main() {
  const argv = process.argv.slice(2);
  const rootArg = (() => {
    const i = argv.indexOf('--root');
    return i >= 0 && argv[i + 1] ? argv[i + 1] : '.';
  })();
  const root = resolve(REPO, rootArg);
  const verbose = argv.includes('--verbose');

  const files = await htmlFiles(root);
  if (!files.length) {
    console.error(`No HTML files under ${root}. Did the build run?`);
    process.exitCode = 2;
    return;
  }

  // Fragment targets are needed per page, so every page is parsed up front.
  const pages = new Map();
  for (const file of files) {
    pages.set(file, parse(await readFile(file, 'utf8')));
  }

  const broken = [];
  let checked = 0;
  let external = 0;

  for (const [file, { refs }] of pages) {
    for (const { attr, value } of refs) {
      if (isExternal(value)) {
        if (value.startsWith('#')) {
          // A same-page fragment: check it against this page's own ids.
          const id = value.slice(1);
          checked++;
          if (id && !pages.get(file).ids.has(id)) {
            broken.push({ file, value, why: `no element with id "${id}"` });
          }
        } else {
          external++;
        }
        continue;
      }

      const { file: target, fragment } = resolveRef(root, file, value);
      checked++;

      // A directory reference resolves to its index.html.
      let onDisk = target;
      if (existsSync(target)) {
        try {
          if ((await stat(target)).isDirectory())
            onDisk = join(target, 'index.html');
        } catch {
          /* handled below */
        }
      } else if (existsSync(join(target, 'index.html'))) {
        onDisk = join(target, 'index.html');
      }

      if (!existsSync(onDisk)) {
        broken.push({
          file,
          value,
          why: `${attr} target missing: ${relative(root, onDisk)}`,
        });
        continue;
      }

      if (fragment && extname(onDisk) === '.html') {
        const page = pages.get(onDisk) ?? parse(await readFile(onDisk, 'utf8'));
        pages.set(onDisk, page);
        if (!page.ids.has(fragment)) {
          broken.push({
            file,
            value,
            why: `"${relative(root, onDisk)}" has no id "${fragment}"`,
          });
        }
      }
    }
  }

  const label = relative(REPO, root) || '.';
  console.log(
    `\nChecked ${checked} internal references across ${files.length} HTML ` +
      `file(s) under ${label}/  (${external} external, not fetched)`
  );
  if (verbose) {
    for (const f of files) console.log(`  ${relative(root, f)}`);
  }

  if (broken.length) {
    console.error(`\n${broken.length} broken reference(s):`);
    for (const b of broken) {
      console.error(`  ${relative(root, b.file)}`);
      console.error(`    ${b.value}`);
      console.error(`      ${b.why}`);
    }
    console.error('');
    process.exitCode = 1;
  } else {
    console.log('Every internal reference resolves.\n');
  }
}

main();
