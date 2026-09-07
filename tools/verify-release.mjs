// =============================================================================
// Is this tree safe to publish?
// -----------------------------------------------------------------------------
// The checks that stand between a validated commit and the live site. They live
// in a script rather than in workflow YAML for two reasons: a script can be run
// locally before pushing, and a script can be tested - tests/verifyRelease.test.js
// exercises every refusal below, which is not something a `run:` block allows.
//
// The rules, and why each exists
// -----------------------------------------------------------------------------
//   instructor materials  `npm run build:ci` encrypts the guides with a random
//                         throwaway secret so a pull request from a fork can
//                         still prove the pipeline runs. That output is
//                         undecryptable by anyone and must never reach the
//                         site. It marks itself now, and this refuses it.
//
//   offline manifest      The site is served unbundled from the repository root
//                         and its service worker precaches a list of files by
//                         name. A name in that list with no file behind it is
//                         an install-time failure of the offline cache, and it
//                         fails for every visitor at once rather than for the
//                         one who touched it.
//
//   the entry point       A missing index.html is a blank site, and it is worth
//                         one line to be sure.
//
//   the revision marker   Written at deploy time so the live site can be asked
//                         which commit it is. Checked here so a deploy cannot
//                         succeed without one.
//
// Everything is expressed against a directory, so the same function checks a
// working tree locally and an assembled artifact in CI.
// =============================================================================

import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

/** Where the encrypted instructor bundle lives, relative to the root. */
export const MATERIALS = 'instructors/materials.enc.json';
/** The generated service-worker precache list. */
export const MANIFEST = 'sw-manifest.js';
/** Written by the deploy job; see .github/workflows/ci.yml. */
export const REVISION = 'deployed-revision.json';

/**
 * Every path the service worker will try to precache.
 *
 * Parsed out of the generated file rather than imported, because that file is a
 * service-worker script which assigns to `self`, and there is no `self` here.
 *
 * @param {string} source - Contents of sw-manifest.js
 * @returns {Array<string>} Paths, relative, without the leading './'
 */
export function precachedPaths(source) {
  const match = /__GRAVITAS_PRECACHE\s*=\s*\[([\s\S]*?)\]/.exec(source || '');
  if (!match) return [];
  return [...match[1].matchAll(/'([^']+)'/g)].map(m =>
    m[1].replace(/^\.\//, '')
  );
}

/**
 * Whether an instructor bundle is one CI made with a throwaway key.
 *
 * Defensive about shape: anything unreadable counts as unpublishable, because
 * the failure this guards against is shipping something nobody can open, and an
 * unparseable bundle is already that.
 *
 * @param {string} text - Contents of materials.enc.json
 * @returns {{ok: boolean, reason: ?string}} Whether it may be published
 */
export function checkMaterials(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, reason: 'unreadable' };
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { ok: false, reason: 'unreadable' };
  }
  if (data.unpublishable) return { ok: false, reason: 'throwaway' };
  for (const field of ['cipher', 'kdf', 'salt', 'iv', 'data']) {
    if (!data[field]) return { ok: false, reason: `missing:${field}` };
  }
  return { ok: true, reason: null };
}

/**
 * Check an assembled tree.
 *
 * @param {string} root - Directory that is about to be published
 * @param {object} [opts] - `requireRevision` to insist on the deploy marker
 * @returns {{ok: boolean, problems: Array<string>, checked: object}} The verdict
 */
export function verifyRelease(root, { requireRevision = true } = {}) {
  const problems = [];
  const at = rel => path.join(root, rel);
  const checked = { precached: 0, missing: [], revision: null };

  if (!existsSync(at('index.html'))) {
    problems.push('index.html is missing: the site would be blank.');
  }

  if (!existsSync(at(MATERIALS))) {
    problems.push(
      `${MATERIALS} is missing. The instructor area would have nothing to ` +
        'unlock, which is a regression rather than a default.'
    );
  } else {
    const verdict = checkMaterials(readFileSync(at(MATERIALS), 'utf8'));
    if (!verdict.ok) {
      problems.push(
        verdict.reason === 'throwaway'
          ? `${MATERIALS} was built by \`npm run build:ci\` with a throwaway ` +
              'key, so nobody can decrypt it. Restore the committed bundle with ' +
              `\`git checkout -- ${MATERIALS}\`, or rebuild with the real ` +
              'passphrase via `npm run build`.'
          : `${MATERIALS} is not a usable encrypted bundle (${verdict.reason}).`
      );
    }
  }

  if (!existsSync(at(MANIFEST))) {
    problems.push(
      `${MANIFEST} is missing: the site would have no offline cache.`
    );
  } else {
    const paths = precachedPaths(readFileSync(at(MANIFEST), 'utf8'));
    checked.precached = paths.length;
    if (!paths.length) {
      problems.push(`${MANIFEST} lists no files, which cannot be right.`);
    }
    for (const rel of paths) {
      if (!existsSync(at(rel))) checked.missing.push(rel);
    }
    if (checked.missing.length) {
      problems.push(
        `${checked.missing.length} precached file(s) are not in the tree, so ` +
          'the service worker would fail to install and every visitor would ' +
          `lose offline support: ${checked.missing.slice(0, 5).join(', ')}` +
          (checked.missing.length > 5 ? ', and more' : '')
      );
    }
  }

  if (existsSync(at(REVISION))) {
    try {
      const rev = JSON.parse(readFileSync(at(REVISION), 'utf8'));
      checked.revision = rev;
      if (!/^[0-9a-f]{40}$/.test(String(rev.commit || ''))) {
        problems.push(`${REVISION} does not name a commit.`);
      }
    } catch {
      problems.push(`${REVISION} is not readable JSON.`);
    }
  } else if (requireRevision) {
    problems.push(
      `${REVISION} is missing. The live site could not say which commit it is, ` +
        'which is the first thing anybody asks when it misbehaves.'
    );
  }

  return { ok: problems.length === 0, problems, checked };
}

/** Run against a directory given on the command line, or the current one. */
function main() {
  const args = process.argv.slice(2);
  const root = args.find(a => !a.startsWith('--')) || '.';
  const strict = !args.includes('--no-revision');
  if (!existsSync(root) || !statSync(root).isDirectory()) {
    console.error(`Not a directory: ${root}`);
    process.exit(2);
  }
  const out = verifyRelease(root, { requireRevision: strict });
  console.log(`Checked ${out.checked.precached} precached files in ${root}`);
  if (out.checked.revision) {
    console.log(`Revision: ${out.checked.revision.commit}`);
  }
  if (out.ok) {
    console.log('Safe to publish.');
    return;
  }
  console.error('\nRefusing to publish:\n');
  for (const problem of out.problems) console.error(`  - ${problem}`);
  process.exit(1);
}

// Only when run directly, so the tests can import the functions above.
if (process.argv[1] && process.argv[1].endsWith('verify-release.mjs')) {
  main();
}
