#!/usr/bin/env node
// =============================================================================
// npm run audit:irreversible  /  npm run audit:irreversible -- --check
// -----------------------------------------------------------------------------
// Finds every operation in the engine that destroys information and writes
// js/data/irreversible.js from what it found.
//
// Generated rather than hand-listed, and that is the whole point. A list of
// irreversible operations typed out by a person is a list of the ones that
// person remembered on the day: the engine grows a new one, nobody updates the
// prose, and the model page goes on describing a simulation that no longer
// exists. Here the list is derived from the source, the generated file is
// committed, and `--check` fails the build when the two disagree.
//
// Every pattern below must match at least once. A rename that stops a pattern
// matching is a failure rather than a silently shorter list, which is the one
// failure mode a scanner like this has.
// =============================================================================

import { readFile, writeFile } from 'node:fs/promises';
import * as prettierNamespace from 'prettier';

// Prettier's exports arrive in two shapes: under `default` through Jest's ESM
// interop and at the top level under Node's own loader. Same reason as
// tools/build-teaching-demos.mjs, same fix.
const prettier = prettierNamespace.format
  ? prettierNamespace
  : prettierNamespace.default;

/**
 * The repository's Prettier settings, read from the file rather than resolved.
 *
 * Without this the generator and `npm run format` disagree about their own
 * output: format rewrites the generated module, `--check` then regenerates it
 * unformatted and declares it stale, and the gate fails on a file nobody
 * touched. Formatting here means the committed file is a fixed point of both.
 *
 * @returns {Promise<Object>} Options for prettier.format
 */
async function prettierOptions() {
  try {
    return JSON.parse(await readFile('.prettierrc.json', 'utf8'));
  } catch {
    return {};
  }
}

const check = process.argv.includes('--check');
const SOURCE = 'js/physics.js';
const OUT = 'js/data/irreversible.js';

const text = await readFile(SOURCE, 'utf8');
const lines = text.split('\n');
const lineOf = index => text.slice(0, index).split('\n').length;

const found = [];
const problems = [];

/**
 * Run one pattern over the source and record what it caught.
 *
 * @param {object} spec - {id, kind, pattern, describe, atLeast}
 */
function scan({ id, kind, pattern, describe, atLeast = 1 }) {
  const re = new RegExp(
    pattern.source,
    pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`
  );
  let m;
  let hits = 0;
  while ((m = re.exec(text)) !== null) {
    hits++;
    found.push({
      id: typeof id === 'function' ? id(m) : id,
      kind,
      line: lineOf(m.index),
      detail: describe(m),
    });
  }
  if (hits < atLeast) {
    problems.push(
      `pattern for "${kind}" matched ${hits} time(s), expected at least ${atLeast} - ` +
        `the code it looks for has been renamed or removed, and the audit is now wrong`
    );
  }
}

/**
 * What to call an array when a student reads the row.
 *
 * Underscores-to-spaces gets most of these right and produces "bh list" for
 * the one that matters most, which is how the black hole row reached the model
 * page reading like a variable someone forgot to rename. Anything not named
 * here falls through to the mechanical version, so a list added later gets a
 * readable-but-imperfect name rather than no row at all.
 *
 * @param {string} identifier - The array's name in js/physics.js
 * @returns {string} A plural noun phrase
 */
function plainName(identifier) {
  const named = {
    bh_list: 'black holes',
    accretion_disk_particles: 'accretion-disk particles',
    gas_giants: 'gas giants',
    neutron_stars: 'neutron stars',
    white_dwarfs: 'white dwarfs',
  };
  return named[identifier] || identifier.replace(/_/g, ' ');
}

// --- The distance cull -------------------------------------------------------
//
// The family the model page has to name one row at a time, because the buffer
// differs per kind and that difference is the whole behaviour: an asteroid is
// discarded five view-widths out and a black hole is kept for fifty.
scan({
  kind: 'cull',
  // [\s\S]*? rather than [^)]*?: half of these guard with `kept(p) ||`, and a
  // character class that excludes ')' cannot reach past the call inside the
  // predicate. The first version matched five of eleven and the scanner
  // refused to write a short list, which is what it is for.
  pattern:
    /(\w+) = filterAndClearEnergy\(\s*\w+,\s*[\s\S]*?is_offscreen\(\w+\.pos, ([\d.]+)\)/gs,
  id: m => `cull:${m[1]}`,
  describe: m => ({
    list: m[1],
    buffer: Number(m[2]),
    what: `${plainName(m[1])} more than ${Number(m[2])} view-widths out are deleted`,
  }),
  atLeast: 10,
});

// --- Velocity damping --------------------------------------------------------
scan({
  kind: 'damping',
  pattern: /decay_factor = 1\.0 - physicsSettings\.orbit_decay_rate \* dt/g,
  id: 'damping:orbit_decay',
  describe: () => ({
    what: 'each velocity component is multiplied by (1 - orbit_decay_rate * dt), so energy leaves the orbit and nothing records how much',
  }),
});

// --- Stellar collapse --------------------------------------------------------
scan({
  kind: 'collapse',
  pattern: /const new_black_hole = new BlackHole\(/g,
  id: 'collapse:star-to-hole',
  describe: () => ({
    what: 'a star past the collapse mass is replaced by a black hole; the star it was is gone, along with its type, temperature and radius',
  }),
});

// --- Merging -----------------------------------------------------------------
scan({
  kind: 'merge',
  pattern: /absorbedSpinAngularMomentum \+=/g,
  id: 'merge:absorption',
  describe: () => ({
    what: 'a body absorbed by a black hole is deleted and its mass, momentum and spin folded into one object; two histories become one state',
  }),
});

// --- Fragmentation with fresh randomness -------------------------------------
//
// The one that cannot be undone even in principle. A merge at least leaves a
// body whose mass says what went in; a debris shower is seeded from
// Math.random, so the state after it could have come from any of an unbounded
// family of states before it.
const rocky = text.indexOf('const handle_rocky_collisions');
const rockyEnd = text.indexOf('\n};', rocky);
const rockyBody = rocky >= 0 ? text.slice(rocky, rockyEnd) : '';
const rockyDraws = (rockyBody.match(/Math\.random\(\)/g) || []).length;
if (rocky < 0) {
  problems.push('handle_rocky_collisions not found');
} else if (rockyDraws === 0) {
  problems.push(
    'handle_rocky_collisions draws no randomness; the audit expected it to'
  );
} else {
  found.push({
    id: 'fragment:rocky-collision',
    kind: 'fragment',
    line: lineOf(rocky),
    detail: {
      draws: rockyDraws,
      what: `a rocky collision destroys both bodies and scatters debris whose directions, speeds and offsets come from ${rockyDraws} fresh Math.random draws - unseeded, so the shower cannot be reproduced, let alone reversed`,
    },
  });
}

if (problems.length) {
  for (const p of problems) console.error(`  ${p}`);
  console.error(
    `\n${problems.length} problem(s). The audit is generated from ${SOURCE}; a pattern ` +
      'that stops matching means the list is now incomplete, which is worse than ' +
      'having no list.'
  );
  process.exit(1);
}

found.sort((a, b) => a.line - b.line);

const raw = `// GENERATED by tools/build-irreversibility-audit.mjs. Do not edit.
//
// Every operation in the engine that destroys information, found by scanning
// ${SOURCE} rather than by remembering. Regenerate with
// \`npm run audit:irreversible\`; \`--check\` fails when this file and the source
// disagree, which is what stops the model page describing a simulation that no
// longer exists.
//
// "Irreversible" here means precisely one thing: running the integrator
// backwards from the state after cannot produce the state before, because the
// information needed is no longer present. It is not a complaint about any of
// them. A sandbox that never merged anything would be a worse sandbox.

/** @typedef {{id: string, kind: string, line: number, detail: object}} Irreversible */

/** @type {ReadonlyArray<Irreversible>} */
export const IRREVERSIBLE = Object.freeze([
${found
  .map(
    f =>
      `  Object.freeze({\n    id: ${JSON.stringify(f.id)},\n    kind: ${JSON.stringify(f.kind)},\n    line: ${f.line},\n    detail: Object.freeze(${JSON.stringify(f.detail)}),\n  }),`
  )
  .join('\n')}
]);

/** Where the scan looked, so a reader can go and check. */
export const IRREVERSIBLE_SOURCE = ${JSON.stringify(SOURCE)};

/** How many of each kind, for the documentation counts. */
export const IRREVERSIBLE_KINDS = Object.freeze(
  ${JSON.stringify(
    Object.fromEntries(
      [...new Set(found.map(f => f.kind))].map(k => [
        k,
        found.filter(f => f.kind === k).length,
      ])
    )
  )}
);
`;

const body = await prettier.format(raw, {
  ...(await prettierOptions()),
  filepath: OUT,
  parser: 'babel',
});

let existing = null;
try {
  existing = await readFile(OUT, 'utf8');
} catch {
  existing = null;
}

if (check) {
  if (existing !== body) {
    console.error(
      `${OUT} is out of date. Run \`npm run audit:irreversible\` and commit the result.`
    );
    process.exit(1);
  }
  console.log(`${OUT} is current: ${found.length} operations from ${SOURCE}.`);
} else {
  await writeFile(OUT, body);
  console.log(`Wrote ${OUT}: ${found.length} operations found in ${SOURCE}.`);
  for (const f of found) {
    console.log(`  ${String(f.line).padStart(5)}  ${f.kind.padEnd(9)} ${f.id}`);
  }
}

void lines;
