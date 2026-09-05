#!/usr/bin/env node
/**
 * The module graph, and the rules it has to obey.
 *
 *   node tools/check-architecture.mjs           check, and fail on a violation
 *   node tools/check-architecture.mjs --report  print the graph and stop
 *   node tools/check-architecture.mjs --cycles  print every cycle and stop
 *
 * What this is for
 * -----------------------------------------------------------------------------
 * js/ui.js was nearly ten thousand lines and had become the place code went when
 * it did not obviously belong anywhere else. Splitting it is only half the job:
 * a module extracted out of a coordinator and then importing that coordinator
 * back is not a smaller coordinator, it is the same tangle with an extra file
 * in it. This is the check that says so out loud.
 *
 * Two rules, and both are about direction rather than size.
 *
 *   No cycles. A cycle means neither module can be understood, tested or loaded
 *   without the other, and in ES modules it also means one of them observes the
 *   other mid-initialisation - a class of bug that shows up as an undefined
 *   binding on a cold load and nowhere else.
 *
 *   No upward imports. Every module is assigned a layer, and a module may
 *   import its own layer or a lower one. The coordinators sit at the top and
 *   may import anything; nothing may import them. That is what makes ui.js a
 *   coordinator rather than a container.
 *
 * Both rules are enforced against a recorded baseline rather than against zero,
 * because the graph did not start clean and a check that fails on day one is a
 * check that gets commented out. The baseline may only shrink: ARCHITECTURE
 * below lists what is still wrong, every entry has a reason, and adding to it
 * requires editing this file deliberately.
 */

import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = 'js';

/**
 * The layers, lowest first.
 *
 * A module may import from its own layer or any layer below it. The list order
 * is the hierarchy; `match` is tested in order, so a more specific pattern must
 * come before a more general one.
 */
const LAYERS = [
  {
    name: 'foundation',
    blurb: 'Pure helpers and constants. No application state, no DOM.',
    match: [
      /^js\/constants\.js$/,
      /^js\/utils\.js$/,
      /^js\/format\.js$/,
      /^js\/units\.js$/,
      /^js\/rng\.js$/,
      /^js\/theme\.js$/,
      /^js\/i18n\//,
      /^js\/spatialHash\.js$/,
    ],
  },
  {
    name: 'domain',
    blurb:
      'The science: orbital mechanics, dark matter, MOND, chaos, resonance. ' +
      'Pure functions over numbers. These are the modules the validation suite ' +
      'and the unit tests import directly.',
    match: [
      /^js\/orbital\.js$/,
      /^js\/darkMatter\.js$/,
      /^js\/mond\.js$/,
      /^js\/blackHolePhysics\.js$/,
      /^js\/habitability\.js$/,
      /^js\/exoplanetObservables\.js$/,
      /^js\/observerGeometry\.js$/,
      /^js\/chaos\//,
      /^js\/experiments\/align\.js$/,
      /^js\/resonance\//,
      /^js\/data\//,
    ],
  },
  {
    name: 'services',
    blurb:
      'Cross-cutting machinery with no opinion about the interface: the ' +
      'quality tier, offline support, share encoding, the reference frame.',
    match: [
      /^js\/quality\.js$/,
      /^js\/offline\.js$/,
      /^js\/referenceFrame\.js$/,
      /^js\/experiments\/canonicalState\.js$/,
    ],
  },
  {
    name: 'engine',
    blurb: 'The simulation itself, and the world it is built into.',
    match: [/^js\/physics\.js$/, /^js\/world\//, /^js\/scenarios\.js$/],
  },
  {
    name: 'state',
    blurb:
      'The objects the interface shares: view state, live settings, current ' +
      'scenario. Below everything that reads them, above the engine, which ' +
      'is handed what it needs rather than reaching for it.',
    match: [/^js\/appState\.js$/],
  },
  {
    name: 'feature',
    blurb:
      'Everything that draws or is driven: rendering, instruments, lessons, ' +
      'widgets, presentation modes.',
    match: [/^js\/(?!main\.js$|ui\.js$)/],
  },
  {
    name: 'coordinator',
    blurb:
      'Wires the rest together. It used to own the shared state as well, ' +
      'which is what made everything import it; that lives in js/appState.js ' +
      'now. May import anything; nothing may import it.',
    match: [/^js\/ui\.js$/, /^js\/main\.js$/],
  },
];

const RANK = Object.fromEntries(LAYERS.map((l, i) => [l.name, i]));

/**
 * Known violations, with a reason each.
 *
 * This list may shrink and may not grow without a deliberate edit here. An
 * entry is `from -> to`, and a cycle is recorded by its lowest-sorting member
 * pair so that the same cycle reported from two directions is one entry.
 */
const ALLOWED_UPWARD = new Map([
  [
    'js/experimentsBridge.js -> js/ui.js',
    'A deliberate lazy edge: the bridge dynamic-imports ui.js inside the path ' +
      'that loads the A/B bench, so the bench and everything it pulls in stay ' +
      'out of the initial download. Making it static to satisfy the layering ' +
      'would undo the lazy load, which is the point of the module.',
  ],
  [
    'js/investigations.js -> js/ui.js',
    'A lesson steps the world: it loads scenarios, suppresses the inspector, ' +
      'draws area-sweep wedges and restores share state. That is coordinator ' +
      'behaviour rather than shared data, so a state module does not help - ' +
      'it needs a command interface, which is a larger change than this pass.',
  ],
  [
    'js/share.js -> js/ui.js',
    'Restoring a shared link means rebuilding a world and repainting a card, ' +
      'both of which live in ui.js. The same shape of problem as ' +
      'investigations.js, and the same answer.',
  ],
]);

/** Files that are workers or otherwise not part of the page graph. */
const NOT_IN_GRAPH = [/^js\/[a-zA-Z]*[wW]orker\.js$/];

/**
 * Every JavaScript file under js/.
 *
 * @param {string} dir - Where to start
 * @returns {Promise<string[]>} Repo-relative posix paths
 */
async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.posix.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(full)));
    else if (entry.name.endsWith('.js')) out.push(full);
  }
  return out;
}

/** Which layer a path belongs to. */
export function layerOf(file) {
  for (const layer of LAYERS) {
    if (layer.match.some(re => re.test(file))) return layer.name;
  }
  return 'feature';
}

/**
 * Build the import graph.
 *
 * Static imports, re-exports and dynamic `import('./x.js')` with a literal
 * specifier all count: a dynamic import is still a dependency, it is just a
 * later one, and a cycle through one is every bit as real.
 *
 * @returns {Promise<Map<string, Set<string>>>} file -> imported files
 */
export async function buildGraph() {
  const files = (await walk(ROOT)).filter(
    f => !NOT_IN_GRAPH.some(re => re.test(f))
  );
  const graph = new Map();
  const specifier =
    /(?:^|\n)\s*(?:import\b[^;'"]*?from\s*|export\s+\*\s+from\s*|export\s*\{[^}]*\}\s*from\s*|import\s*\(\s*)['"](\.[^'"]+)['"]/g;

  for (const file of files) {
    const src = await readFile(file, 'utf8');
    const deps = new Set();
    for (const m of src.matchAll(specifier)) {
      const resolved = path.posix.normalize(
        path.posix.join(path.posix.dirname(file), m[1])
      );
      if (files.includes(resolved)) deps.add(resolved);
    }
    graph.set(file, deps);
  }
  return graph;
}

/**
 * Every elementary cycle in the graph, as arrays of files.
 *
 * Johnson's algorithm would be the textbook answer; this is a depth-first
 * search that records a cycle when it meets a node already on the stack, which
 * finds the same set for a graph this size and is a great deal easier to read.
 * Each cycle is normalised to start at its lowest-sorting member so the same
 * loop discovered from two entry points is reported once.
 *
 * @param {Map<string, Set<string>>} graph - The import graph
 * @returns {string[][]} Cycles
 */
export function findCycles(graph) {
  const found = new Map();
  const stack = [];
  const onStack = new Set();
  const visited = new Set();

  const rotate = cycle => {
    let best = 0;
    for (let i = 1; i < cycle.length; i++) {
      if (cycle[i] < cycle[best]) best = i;
    }
    return [...cycle.slice(best), ...cycle.slice(0, best)];
  };

  const visit = node => {
    stack.push(node);
    onStack.add(node);
    for (const next of graph.get(node) || []) {
      if (onStack.has(next)) {
        const cycle = rotate(stack.slice(stack.indexOf(next)));
        found.set(cycle.join(' -> '), cycle);
      } else if (!visited.has(next)) {
        visit(next);
      }
    }
    onStack.delete(node);
    stack.pop();
    visited.add(node);
  };

  for (const node of [...graph.keys()].sort()) {
    if (!visited.has(node)) visit(node);
  }
  return [...found.values()];
}

/**
 * Imports that point up the layer hierarchy.
 *
 * @param {Map<string, Set<string>>} graph - The import graph
 * @returns {Array<{from: string, to: string, fromLayer: string, toLayer: string}>} Edges
 */
export function findUpwardImports(graph) {
  const out = [];
  for (const [from, deps] of graph) {
    const fromLayer = layerOf(from);
    for (const to of deps) {
      const toLayer = layerOf(to);
      if (RANK[toLayer] > RANK[fromLayer]) {
        out.push({ from, to, fromLayer, toLayer });
      }
    }
  }
  return out.sort((a, b) =>
    `${a.from}${a.to}`.localeCompare(`${b.from}${b.to}`)
  );
}

function report(graph) {
  const byLayer = new Map(LAYERS.map(l => [l.name, []]));
  for (const file of [...graph.keys()].sort())
    byLayer.get(layerOf(file)).push(file);

  console.log(
    'Layers, lowest first. A module may import its own layer or below.\n'
  );
  for (const layer of LAYERS) {
    const files = byLayer.get(layer.name);
    console.log(
      `${layer.name}  (${files.length} module${files.length === 1 ? '' : 's'})`
    );
    console.log(`  ${layer.blurb}`);
    console.log();
  }

  const fanout = [...graph.entries()]
    .map(([f, d]) => [f, d.size])
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  console.log('Widest fan-out:');
  for (const [file, n] of fanout)
    console.log(`  ${String(n).padStart(3)}  ${file}`);
}

/**
 * Exports that nothing anywhere references.
 *
 * Reported rather than enforced. An unreferenced export is not automatically a
 * mistake - it can be a deliberate seam - but it is worth knowing about here,
 * because GitHub Pages serves this repository unbundled: an unused function in
 * js/utils.js is not shaken out by a bundler, it is downloaded by every reader.
 *
 * Counts occurrences across the whole repository including HTML, which is how
 * the entry points call in - an earlier version of this scan looked only at
 * JavaScript and confidently reported initInstructorPortal as dead when
 * instructors/index.html imports and calls it.
 *
 * @returns {Promise<Array<{file: string, name: string}>>} Unreferenced exports
 */
export async function findDeadExports() {
  const jsFiles = (await walk('js')).filter(
    f => !NOT_IN_GRAPH.some(re => re.test(f))
  );
  // Every other file that could reference an export, found by walking rather
  // than by listing directories. Two earlier versions of this got it wrong by
  // guessing: the first looked only at JavaScript and reported
  // initInstructorPortal as dead when instructors/index.html imports and calls
  // it; the second listed instructors/ and embed/ by hand and would have made
  // the same mistake about model/index.html and validation/index.html.
  const SKIP = new Set([
    'node_modules',
    'dist',
    '.git',
    'test-results',
    'playwright-report',
    'js',
    '.instructor-build',
  ]);
  const extra = [];
  const collect = async dir => {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = dir === '.' ? entry.name : path.posix.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!SKIP.has(entry.name) && !entry.name.startsWith('.')) {
          await collect(full);
        }
      } else if (/\.(js|mjs|cjs|html)$/.test(entry.name)) {
        extra.push(full);
      }
    }
  };
  await collect('.');

  const sources = new Map();
  for (const f of [...jsFiles, ...extra]) {
    try {
      sources.set(f, await readFile(f, 'utf8'));
    } catch {
      /* unreadable is not our problem here */
    }
  }

  const named = [];
  for (const f of jsFiles) {
    const src = sources.get(f) || '';
    const decl =
      /^export\s+(?:async\s+)?(?:function|const|let|class)\s+([A-Za-z_$][\w$]*)/gm;
    for (const m of src.matchAll(decl)) named.push({ file: f, name: m[1] });
    for (const m of src.matchAll(/^export\s*\{([^}]*)\}/gm)) {
      for (const part of m[1].split(',')) {
        const name = part
          .trim()
          .split(/\s+as\s+/)
          .pop()
          .trim();
        if (/^[A-Za-z_$][\w$]*$/.test(name)) named.push({ file: f, name });
      }
    }
  }

  const dead = [];
  const seen = new Set();
  for (const { file, name } of named) {
    const key = `${file}#${name}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const re = new RegExp(`\\b${name}\\b`, 'g');
    let total = 0;
    for (const src of sources.values()) total += (src.match(re) || []).length;
    if (total <= 1) dead.push({ file, name });
  }
  return dead;
}

async function main() {
  const graph = await buildGraph();

  if (process.argv.includes('--report')) {
    report(graph);
    return;
  }

  if (process.argv.includes('--exports')) {
    const dead = await findDeadExports();
    const byFile = new Map();
    for (const { file, name } of dead) {
      if (!byFile.has(file)) byFile.set(file, []);
      byFile.get(file).push(name);
    }
    console.log(
      `${dead.length} export(s) defined and referenced nowhere, in ` +
        `${byFile.size} module(s):\n`
    );
    for (const file of [...byFile.keys()].sort()) {
      console.log(`  ${file}: ${byFile.get(file).sort().join(', ')}`);
    }
    return;
  }

  const cycles = findCycles(graph);
  const upward = findUpwardImports(graph);

  if (process.argv.includes('--cycles')) {
    console.log(`${cycles.length} cycle(s):`);
    for (const c of cycles) console.log(`  ${[...c, c[0]].join(' -> ')}`);
    console.log(`\n${upward.length} upward import(s):`);
    for (const u of upward) {
      console.log(`  ${u.from} (${u.fromLayer}) -> ${u.to} (${u.toLayer})`);
    }
    return;
  }

  const problems = [];

  // Cycles: none are allowed, full stop. Every one that existed has been
  // removed, and the check is what stops the next one being added.
  for (const cycle of cycles) {
    problems.push(`Import cycle: ${[...cycle, cycle[0]].join(' -> ')}`);
  }

  // Upward imports: only the recorded ones.
  const seen = new Set();
  for (const { from, to, fromLayer, toLayer } of upward) {
    const key = `${from} -> ${to}`;
    seen.add(key);
    if (!ALLOWED_UPWARD.has(key)) {
      problems.push(
        `Upward import: ${from} (${fromLayer}) imports ${to} (${toLayer}). ` +
          `A ${fromLayer} module may not depend on a ${toLayer} one. Either ` +
          `move what it needs down, pass it in, or - if it is genuinely ` +
          `unavoidable - add it to ALLOWED_UPWARD in tools/check-architecture.mjs ` +
          `with a reason.`
      );
    }
  }

  // The baseline may only shrink. An entry that no longer applies is an entry
  // somebody fixed, and leaving it here would let the next one back in quietly.
  for (const key of ALLOWED_UPWARD.keys()) {
    if (!seen.has(key)) {
      problems.push(
        `Stale exemption: "${key}" is in ALLOWED_UPWARD but that import no ` +
          `longer exists. Delete the entry - the graph got better and the ` +
          `baseline should record it.`
      );
    }
  }

  if (problems.length) {
    console.error(
      `Architecture check failed with ${problems.length} problem(s):\n`
    );
    for (const p of problems) console.error(`  - ${p}\n`);
    process.exitCode = 1;
    return;
  }

  console.log(
    `Architecture OK: ${graph.size} modules, no cycles, ` +
      `${ALLOWED_UPWARD.size} recorded upward imports and no new ones.`
  );
}

if (import.meta.url === `file://${process.argv[1]}`) await main();
