// =============================================================================
// A merge must not drop what one side wrote into a file with generated regions
// -----------------------------------------------------------------------------
//   node tools/generated-tripwire.mjs            check HEAD, if it is a merge
//   node tools/generated-tripwire.mjs <commit>   check that merge
//
// During the v1.1 integration a merge that conflicted only on a generated count
// in README.md was resolved by taking one side of the file, and sixteen
// hand-written lines the other side had added went with it. Nothing failed.
// This is the check that would have: for each watched file, the lines each
// side added since the merge base, outside generated regions, must still be in
// the merge. A deletion on one side is fine - that is a side's own edit - and
// so is rewording a few lines while resolving; losing more than a tenth of what
// a side added (and at least three lines) is not.
//
// On a pull request CI checks out the merge of the branch into its base, so
// this runs on every pull request, not only on merges that land.
// =============================================================================

import { execFileSync } from 'node:child_process';
import { GRAPH } from './generate-graph.mjs';

/** Hand-written files that carry generated regions, and the i18n catalogs. */
export const WATCHED = Object.freeze([
  ...GRAPH.flatMap(n => (Array.isArray(n.regions) ? n.regions : [])),
  'index.html',
  'js/i18n/en.js',
  'js/i18n/es.js',
  'tools/physics-checks.mjs',
  'js/validation/physicsChecks.js',
]);

/** How much of a side's additions may be missing: a tenth, and never three lines. */
export const TOLERANCE = Object.freeze({ fraction: 0.1, lines: 3 });

/** The lines outside generated regions, as a multiset. */
export function handWritten(text) {
  const out = new Map();
  let inBlock = false;
  for (const raw of String(text).split('\n')) {
    if (/<!--fact-block:/.test(raw)) inBlock = true;
    if (inBlock) {
      if (/<!--\/fact-block-->/.test(raw)) inBlock = false;
      continue;
    }
    const line = raw.replace(/<!--fact:[^>]*-->.*?<!--\/fact-->/g, '').trim();
    if (!line) continue;
    out.set(line, (out.get(line) || 0) + 1);
  }
  return out;
}

/** Lines in a that are not in b, counting repeats. */
function minus(a, b) {
  const out = new Map();
  for (const [line, n] of a) {
    const k = n - (b.get(line) || 0);
    if (k > 0) out.set(line, k);
  }
  return out;
}
const size = m => [...m.values()].reduce((a, b) => a + b, 0);

/**
 * What a merge dropped of each side's additions to one file.
 *
 * @param {{base: string, sides: string[], merged: string}} texts - The file at
 *   the merge base, at each parent, and in the merge
 * @returns {Array<{side: number, added: number, missing: string[]}>} Per side
 *   whose loss is over the tolerance
 */
export function dropped({ base, sides, merged }) {
  const b = handWritten(base);
  const m = handWritten(merged);
  const out = [];
  sides.forEach((text, side) => {
    const added = minus(handWritten(text), b);
    const missing = minus(added, m);
    const lost = size(missing);
    if (lost >= TOLERANCE.lines && lost > TOLERANCE.fraction * size(added))
      out.push({ side, added: size(added), missing: [...missing.keys()] });
  });
  return out;
}

const git = (...args) =>
  execFileSync('git', args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  });
const show = (rev, file) => {
  try {
    return git('show', `${rev}:${file}`);
  } catch {
    return '';
  }
};

function main(commit = 'HEAD') {
  const parents = git('rev-list', '--parents', '-n', '1', commit)
    .trim()
    .split(' ')
    .slice(1);
  if (parents.length < 2) {
    console.log(`${commit} is not a merge; nothing to check.`);
    return 0;
  }
  const base = git('merge-base', ...parents).trim();
  let failed = 0;
  for (const file of WATCHED) {
    for (const d of dropped({
      base: show(base, file),
      sides: parents.map(p => show(p, file)),
      merged: show(commit, file),
    })) {
      failed++;
      console.error(
        `${file}: the merge dropped ${d.missing.length} of the ${d.added} lines parent ${d.side + 1} added:`
      );
      for (const line of d.missing.slice(0, 8))
        console.error(`    ${line.slice(0, 100)}`);
    }
  }
  if (failed) {
    console.error(
      '\nResolve a conflict in these files with a three-way merge and regenerate (BRANCHING.md), never by taking a side.'
    );
    return 1;
  }
  console.log(`${commit}: no watched file lost what a side added.`);
  return 0;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  process.exit(main(process.argv[2]));
}
