// =============================================================================
// Regenerate what is stale, in the order it has to happen
// -----------------------------------------------------------------------------
//   node tools/generate.mjs                  run every stale node, in order
//   node tools/generate.mjs --all            run every node, stale or not
//   node tools/generate.mjs --check          run every node's check; write nothing
//   node tools/generate.mjs --only <id>      that node alone (with --check: its check)
//   node tools/generate.mjs --list           the graph, in order
//
// The graph is tools/generate-graph.mjs. A node is stale when the digest of
// its inputs differs from the one recorded when it last ran
// (.generate-state.json, not committed). A node with no generator, such as the
// manual (LaTeX) or the instructor bundle (the passphrase), is named and
// skipped, never faked. The order is the one BRANCHING.md used to state by
// hand: capabilities before the catalog, everything that rewrites a precached
// file before the service-worker manifest, the build before the documentation
// facts.
// =============================================================================

import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  existsSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GRAPH, order } from './generate-graph.mjs';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const STATE_FILE = path.join(REPO, '.generate-state.json');
const SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  'test-results',
  'playwright-report',
]);

/** Every file under a path, sorted, repository-relative. */
function files(rel, root) {
  const abs = path.join(root, rel);
  if (!existsSync(abs)) return [];
  if (statSync(abs).isFile()) return [rel];
  const out = [];
  for (const name of readdirSync(abs).sort()) {
    if (SKIP_DIRS.has(name)) continue;
    out.push(...files(path.join(rel, name), root));
  }
  return out;
}

/**
 * The digest of a node's inputs: every file's path and bytes.
 *
 * @param {object} node - A graph node
 * @param {string} [root] - The repository
 * @returns {string} Hex SHA-256
 */
export function digest(node, root = REPO) {
  const h = createHash('sha256');
  for (const rel of [
    ...new Set(node.inputs.flatMap(i => files(i, root))),
  ].sort()) {
    h.update(rel);
    h.update('\0');
    h.update(readFileSync(path.join(root, rel)));
    h.update('\0');
  }
  return h.digest('hex');
}

/**
 * Which nodes need running: a changed input, no record, or a node before it
 * that is about to run.
 *
 * @param {ReadonlyArray<object>} graph - The nodes
 * @param {Record<string, string>} state - Digests recorded by the last run
 * @param {(node: object) => string} digestOf - How to digest a node
 * @returns {Set<string>} Node ids to run
 */
export function stale(graph, state, digestOf) {
  const out = new Set();
  for (const node of order(graph)) {
    if (state[node.id] !== digestOf(node) || node.after.some(a => out.has(a)))
      out.add(node.id);
  }
  return out;
}

const run = cmd => execSync(cmd, { cwd: REPO, stdio: 'inherit' });

function main(argv) {
  const only = argv.includes('--only')
    ? argv[argv.indexOf('--only') + 1]
    : null;
  const nodes = order(GRAPH).filter(n => !only || n.id === only);
  if (only && !nodes.length) {
    console.error(
      `No node "${only}". Nodes: ${GRAPH.map(n => n.id).join(', ')}`
    );
    return 2;
  }

  if (argv.includes('--list')) {
    for (const n of nodes)
      console.log(`${n.id.padEnd(16)} after ${n.after.join(', ') || '-'}`);
    return 0;
  }

  if (argv.includes('--check')) {
    let failed = 0;
    for (const n of nodes) {
      if (!n.check) {
        console.log(
          `- ${n.id}: checked by ${n.testedBy || 'nothing runnable here'}`
        );
        continue;
      }
      try {
        run(n.check);
      } catch {
        failed++;
        console.error(`x ${n.id} is stale: ${n.generate || n.needs}`);
      }
    }
    return failed ? 1 : 0;
  }

  const state = existsSync(STATE_FILE)
    ? JSON.parse(readFileSync(STATE_FILE, 'utf8'))
    : {};
  const digests = new Map(GRAPH.map(n => [n.id, digest(n)]));
  const todo = argv.includes('--all')
    ? new Set(nodes.map(n => n.id))
    : stale(GRAPH, state, n => digests.get(n.id));
  for (const n of nodes) {
    if (!todo.has(n.id)) continue;
    if (!n.generate) {
      console.log(`- ${n.id}: not generated here; it needs ${n.needs}`);
      continue;
    }
    console.log(`> ${n.id}: ${n.generate}`);
    run(n.generate);
    // After it ran, its own outputs may be another node's inputs.
    state[n.id] = digest(n);
  }
  writeFileSync(STATE_FILE, `${JSON.stringify(state, null, 2)}\n`);
  return 0;
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  process.exit(main(process.argv.slice(2)));
}
