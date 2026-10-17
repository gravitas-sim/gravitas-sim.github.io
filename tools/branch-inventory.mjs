// =============================================================================
// Every remote branch, its state, and the commands the owner may run
// -----------------------------------------------------------------------------
//   node tools/branch-inventory.mjs                 the table, from the local clone
//   node tools/branch-inventory.mjs --prs prs.json  with pull requests read in
//   node tools/branch-inventory.mjs --json          the same, as JSON
//
// It reads `refs/remotes/origin/*` and, if given, the output of
//   gh pr list --state all --limit 1000 --json number,state,headRefName,baseRefName
// and deletes nothing. For each branch that is safe to retire it prints the one
// `gh` command that would do it; running it is the owner's decision, never the
// session's (BRANCHING.md). Branches `main`, `v3` and any `train/*` are kept.
//
// States, in the order they are decided:
//   protected   main, v3, gh-pages and any train/* branch
//   asset       pr-assets/*: parentless commits whose SHA-pinned raw URLs carry
//               pull request screenshots; deleting one breaks the images
//   open-pr     the head of an open pull request
//   merged      its tip is an ancestor of the base (main or v3), so deleting it
//               loses no commit
//   closed-pr   its pull request was closed without merging; the tip is on no
//               base: look before deleting
//   stale       no pull request, not merged, last commit older than 90 days
//   active      none of the above
// =============================================================================

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

export const STALE_DAYS = 90;
const KEEP = new Set(['main', 'v3', 'gh-pages', 'HEAD']);

/**
 * Decide one branch's state. Pure: everything it needs is passed in.
 * @param {{name: string, merged: boolean, date: string}} branch
 * @param {{open: boolean, closedUnmerged: boolean}} prs - What is known of its PRs
 * @param {{keep: Set<string>, now: Date}} ctx
 */
export function classify(branch, prs, { keep = KEEP, now = new Date() } = {}) {
  if (keep.has(branch.name) || branch.name.startsWith('train/'))
    return 'protected';
  if (branch.name.startsWith('pr-assets/')) return 'asset';
  if (prs.open) return 'open-pr';
  if (branch.merged) return 'merged';
  if (prs.closedUnmerged) return 'closed-pr';
  const age = (now - new Date(branch.date)) / 86_400_000;
  return age > STALE_DAYS ? 'stale' : 'active';
}

/** The command for the owner, only where retiring loses nothing. */
export function command(name, state, repo) {
  if (state !== 'merged') return '';
  return `gh api -X DELETE repos/${repo}/git/refs/heads/${name}`;
}

/** Index pull requests by head branch name. */
export function indexPrs(prs) {
  const by = new Map();
  for (const pr of prs) {
    const e = by.get(pr.headRefName) || { open: false, closedUnmerged: false };
    if (pr.state === 'OPEN') e.open = true;
    if (pr.state === 'CLOSED') e.closedUnmerged = true;
    by.set(pr.headRefName, e);
  }
  return by;
}

export function inventory({ branches, prs = [], repo, keep, now }) {
  const by = indexPrs(prs);
  return branches
    .map(b => {
      const state = classify(
        b,
        by.get(b.name) || { open: false, closedUnmerged: false },
        { keep, now }
      );
      return { ...b, state, command: command(b.name, state, repo) };
    })
    .sort(
      (a, b) => a.state.localeCompare(b.state) || a.name.localeCompare(b.name)
    );
}

const git = (...args) =>
  execFileSync('git', args, { encoding: 'utf8', maxBuffer: 64 << 20 }).trim();

function localBranches(bases) {
  const lines = git(
    'for-each-ref',
    '--format=%(refname:strip=3)\t%(committerdate:iso-strict)\t%(authorname)',
    'refs/remotes/origin'
  ).split('\n');
  return lines
    .map(l => l.split('\t'))
    .filter(([name]) => name && name !== 'HEAD')
    .map(([name, date, author]) => {
      const ref = `refs/remotes/origin/${name}`;
      const merged = bases.some(base => {
        try {
          git(
            'merge-base',
            '--is-ancestor',
            ref,
            `refs/remotes/origin/${base}`
          );
          return true;
        } catch {
          return false;
        }
      });
      return { name, date, author, merged };
    });
}

function repoName() {
  const url = git('remote', 'get-url', 'origin');
  return url.replace(/^.*github\.com[:/]/, '').replace(/\.git$/, '');
}

if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  const i = process.argv.indexOf('--prs');
  const prs =
    i > 0 ? JSON.parse(readFileSync(process.argv[i + 1], 'utf8')) : [];
  const rows = inventory({
    branches: localBranches(['main', 'v3']),
    prs,
    repo: repoName(),
  });
  if (process.argv.includes('--json')) {
    console.log(JSON.stringify(rows, null, 2));
  } else {
    const counts = {};
    for (const r of rows) counts[r.state] = (counts[r.state] || 0) + 1;
    console.log(
      `${rows.length} remote branches: ` +
        Object.entries(counts)
          .map(([k, v]) => `${v} ${k}`)
          .join(', ') +
        (i > 0
          ? ''
          : ' (no pull request list given: open-pr and closed-pr unknown)')
    );
    for (const r of rows)
      console.log(
        `${r.state.padEnd(10)} ${r.date.slice(0, 10)} ${r.name}${r.command ? `\n           ${r.command}` : ''}`
      );
  }
}
