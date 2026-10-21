// Spike (Prompt 158): the hybrid's merge-conflict cost, from history. For each pull
// request merged into v3 since it was cut, did it touch the bundle's inputs, and which
// of those were open at the same time. Disposable; never merged.
// node spike/deploy-ii/conflict-cost.mjs <ref> <since-commit> <path-prefix>...
import { execFileSync } from 'node:child_process';
const [ref, since, ...prefixes] = process.argv.slice(2);
const git = (...a) => execFileSync('git', a, { encoding: 'utf8', maxBuffer: 1 << 26 }).trim();
const merges = git('log', '--first-parent', '--merges', '--format=%H %ct', `${since}..${ref}`).split('\n').filter(Boolean).map(l => l.split(' '));
const rows = [];
for (const [sha, ct] of merges) {
  const [p1, p2] = git('rev-list', '--parents', '-n1', sha).split(' ').slice(1);
  if (!p2) continue;
  const files = git('diff', '--name-only', p1, sha).split('\n').filter(Boolean);
  const touch = files.filter(f => prefixes.some(p => f.startsWith(p)));
  const times = git('log', '--format=%ct', `${p1}..${p2}`).split('\n').filter(Boolean).map(Number);
  rows.push({ sha: sha.slice(0, 8), merged: Number(ct), opened: Math.min(...times, Number(ct)), touches: touch.length, files: touch });
}
const hit = rows.filter(r => r.touches);
let overlaps = 0;
const pairs = [];
for (let i = 0; i < hit.length; i++) for (let j = i + 1; j < hit.length; j++) {
  const a = hit[i], b = hit[j];
  if (a.opened < b.merged && b.opened < a.merged) { overlaps++; pairs.push([a.sha, b.sha]); }
}
// the same figure for every generated file the tree already commits that any pull request touches
console.log(JSON.stringify({ since, prefixes, mergedPRs: rows.length, touching: hit.length, share: +(hit.length / rows.length).toFixed(3), overlappingPairs: overlaps, pairs, touchingShas: hit.map(r => r.sha) }, null, 1));
