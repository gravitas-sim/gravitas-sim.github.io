#!/usr/bin/env node
// =============================================================================
// `sdk review` on the archives a pull request adds to catalog/packages
// -----------------------------------------------------------------------------
//   node tools/catalog-review.mjs                 review every archive there
//   node tools/catalog-review.mjs --base <ref>    review only those the branch
//                                                 adds to <ref> (a pull request)
//
// CI runs it with the pull request's base. It prints each review, human items
// included, to the log and to the job summary, and fails on any mechanical
// failure. `catalog check` already holds every accepted package to the same
// checks; this is what a maintainer reads, and it names the archive that is
// new (CONTRIBUTING_CONTENT.md, "What CI does").
// =============================================================================

import { execFileSync } from 'node:child_process';
import { appendFileSync, readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { readCuration } from './catalog.mjs';
import { loadExtension } from '../sdk/lib/extension.mjs';
import { formatReview, reviewExtension } from '../sdk/lib/review.mjs';

const DIR = 'catalog/packages';

/** The archives in `names` that sit directly in catalog/packages. */
export const archivesIn = names =>
  names.filter(n => path.dirname(n) === DIR && n.endsWith('.gxp')).sort();

/** The archives the checkout adds relative to a base ref, or all of them. */
export function archivesToReview(base) {
  if (!base)
    return readdirSync(DIR)
      .map(f => `${DIR}/${f}`)
      .filter(f => f.endsWith('.gxp'))
      .sort();
  const git = (...a) => execFileSync('git', a, { encoding: 'utf8' });
  // A pull request checks out a shallow merge commit: fetch the base's tip.
  try {
    git('fetch', '--no-tags', '--depth=1', 'origin', base);
  } catch {
    /* already present locally */
  }
  const ref = (() => {
    try {
      git('rev-parse', '--verify', '--quiet', 'FETCH_HEAD');
      return 'FETCH_HEAD';
    } catch {
      return base;
    }
  })();
  return archivesIn(
    git('diff', '--name-only', '--diff-filter=A', ref, 'HEAD', '--', DIR)
      .split('\n')
      .filter(Boolean)
  );
}

async function main(argv) {
  const i = argv.indexOf('--base');
  const base = i >= 0 ? argv[i + 1] : '';
  const files = archivesToReview(base);
  if (!files.length) {
    console.log('No archive added to catalog/packages: nothing to review.');
    return 0;
  }
  let failed = 0;
  const summary = [];
  for (const file of files) {
    // A contributed package carries the README rule; a maintainers' own does
    // not, as in the generator. Which is which is the curation's `origin`.
    const ext = loadExtension(file);
    const id = JSON.parse(ext.files.get('gravitas-extension.json')).id;
    const item = readCuration().extensions.find(
      x =>
        JSON.parse(
          readFileSync(path.join(x.path, 'gravitas-extension.json'), 'utf8')
        ).id === id
    );
    const review = await reviewExtension(ext, {
      readme: item ? item.origin === 'contributed' : true,
    });
    const text = formatReview(review, file);
    console.log(`${file}\n${text}\n`);
    summary.push(`### ${file}\n\n\`\`\`text\n${text}\n\`\`\`\n`);
    if (!review.passed) failed++;
  }
  if (process.env.GITHUB_STEP_SUMMARY)
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary.join('\n'));
  console.log(
    `${files.length} archive(s) reviewed, ${failed} failed the mechanical checks.`
  );
  return failed ? 1 : 0;
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  process.exitCode = await main(process.argv.slice(2));
