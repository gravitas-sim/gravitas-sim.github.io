#!/usr/bin/env node
// =============================================================================
// The showcase page's demonstration links
// -----------------------------------------------------------------------------
//   npm run teaching:data             write js/data/teachingGenerated.js
//   npm run teaching:data -- --check  fail if the checked-in file is stale
//
// The six demonstrations on /teaching/ are share links. A share link is a
// deflated, base64url'd payload, which is not something to type by hand and not
// something a static page should be encoding at run time either: doing it here
// keeps js/shareState.js - the one encoder this project has - off the showcase
// page's bundle, and keeps a marketing page from carrying a copy of the codec.
//
// So the spec lives in js/data/teaching.js as plain objects, this writes the
// encoded form beside it, and tests/teaching.test.js decodes the result and
// checks it against the spec. That last part matters more than the byte
// comparison a generated file usually gets: two Node versions can disagree
// about whether a sixty-byte payload is worth deflating, and both answers are
// correct links. What must not vary is what the link MEANS.
//
// Validation happens here rather than at run time, because a link naming a
// scenario that does not exist should fail a build and not a lecture.
//
// The scenario count rides along for the same reason. /teaching/ derives every
// other number it prints from something it can read at run time - the lesson
// manifest, validation/data.json - but the scenario catalogue's one export
// pulls in the whole English message catalogue to attach titles, which is
// 123KB a showcase page has no use for. Counting the scenarios here and
// checking the count in CI keeps the page honest without that weight, and is
// the same bargain js/data/investigations/manifest.js already makes.
// =============================================================================

import { readFile, writeFile } from 'node:fs/promises';
import * as prettier from 'prettier';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = resolve(REPO, 'js/data/teachingGenerated.js');

const { DEMOS } = await import(`${REPO}/js/data/teaching.js`);
const { SCENARIO_INFO } = await import(`${REPO}/js/data/scenarioInfo.js`);
const { DEFAULT_SETTINGS } = await import(`${REPO}/js/appState.js`);
const { buildPayload, encodePayload } = await import(
  `${REPO}/js/shareState.js`
);
const { parseSeed } = await import(`${REPO}/js/rng.js`);

/**
 * The payload a demonstration describes.
 *
 * Paused, always: see the header of js/data/teaching.js for why that is a
 * pedagogical decision rather than a technical one.
 *
 * The settings go into `d` verbatim rather than being diffed against the
 * scenario's pristine values. `d` is applied inside build_simulation() AFTER
 * apply_preset() has run, so it means "force these, whatever the scenario
 * chose" - which is what a demonstration wants to say, and it survives
 * somebody retuning the scenario later.
 *
 * @param {Object} demo - An entry of DEMOS
 * @returns {Object} A payload for js/shareState.js
 */
export function payloadFor(demo) {
  const { scenario, seed, settings } = demo.state;
  const payload = buildPayload({
    scenario,
    // buildPayload formats the seed, so it wants the integer. Handing it the
    // text form yields ('teach' >>> 0) === 0 and six links that all replay
    // seed zero - silently, because zero is a perfectly good seed.
    seed: parseSeed(seed),
    // Empty, so that buildPayload computes no delta of its own: the settings a
    // demonstration wants are written straight into `d` below.
    settings: {},
    DEFAULT_SETTINGS,
    paused: true,
  });
  if (Object.keys(settings || {}).length) payload.d = { ...settings };
  return payload;
}

/**
 * Everything wrong with the spec, as sentences.
 * @returns {string[]} Empty when the spec is sound
 */
export function problemsWith(demos = DEMOS) {
  const problems = [];
  const seen = new Set();
  for (const demo of demos) {
    if (seen.has(demo.id))
      problems.push(`two demonstrations share "${demo.id}"`);
    seen.add(demo.id);
    const { scenario, seed, settings } = demo.state || {};
    if (!Object.hasOwn(SCENARIO_INFO, scenario)) {
      problems.push(
        `"${demo.id}" names scenario "${scenario}", which does not exist`
      );
    }
    if (!/^[0-9a-z]{1,7}$/.test(String(seed))) {
      problems.push(
        `"${demo.id}" has seed "${seed}", which is not a base-36 seed`
      );
    }
    for (const key of Object.keys(settings || {})) {
      if (!Object.hasOwn(DEFAULT_SETTINGS, key)) {
        problems.push(`"${demo.id}" sets "${key}", which is not a setting`);
      }
    }
  }
  return problems;
}

/**
 * The fragment for each demonstration, by id.
 * @returns {Promise<Object>} id -> fragment text, without the '#'
 */
export async function fragments(demos = DEMOS) {
  const out = {};
  for (const demo of demos)
    out[demo.id] = await encodePayload(payloadFor(demo));
  return out;
}

/**
 * The file, as text, formatted the way the repository formats everything else.
 *
 * Run through Prettier rather than emitted pre-formatted: the result is a
 * checked-in source file, `npm run format:check` reads it like any other, and a
 * generator that guessed at line breaks would fail that gate the first time a
 * fragment came out short enough not to wrap. Same reasoning, and the same
 * mechanism, as tools/build-investigation-manifest.js.
 */
export async function render(demos = DEMOS) {
  const map = await fragments(demos);
  const lines = Object.entries(map).map(
    ([id, fragment]) => `  ${JSON.stringify(id)}: ${JSON.stringify(fragment)},`
  );
  const raw = `// =============================================================================
// Showcase-page data - GENERATED, do not edit
// -----------------------------------------------------------------------------
// Written by tools/build-teaching-demos.mjs from the \`state\` blocks in
// ./teaching.js and from the scenario catalogue. Run \`npm run teaching:data\`
// after changing either.
//
// DEMO_LINKS: each value is the text after the '#' of an ordinary Gravitas
// share link - the same encoding the share dialog produces and the same one
// js/share.js reads. /teaching/ hands them to embed mode in an iframe and to
// the application in a new tab; nothing on that page decodes or interprets
// them.
//
// SCENARIO_COUNT: how many built-in scenarios there are. Counted rather than
// typed, and \`npm run teaching:data -- --check\` fails if it has drifted.
// =============================================================================

export const DEMO_LINKS = Object.freeze({
${lines.join('\n')}
});

/** How many scenarios js/data/scenarioInfo.js describes. */
export const SCENARIO_COUNT = ${Object.keys(SCENARIO_INFO).length};
`;
  const options = (await prettier.resolveConfig(OUT)) || {};
  return prettier.format(raw, { ...options, filepath: OUT });
}

// Only when run directly: importing this from a test must not write a file or
// call process.exit(). The same guard tools/build-investigation-manifest.js
// uses, for the same reason.
const runDirectly =
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (runDirectly) await main();

/** The command-line behaviour. */
async function main() {
  const check = process.argv.includes('--check');

  const problems = problemsWith();
  if (problems.length) {
    console.error('The demonstration spec is not usable:\n');
    for (const p of problems) console.error(`  - ${p}`);
    process.exit(1);
  }

  const text = await render();
  const existing = await readFile(OUT, 'utf8').catch(() => null);

  if (check) {
    if (existing === text) {
      console.log(
        `js/data/teachingGenerated.js is up to date (${DEMOS.length} links).`
      );
    } else {
      console.error(
        'js/data/teachingGenerated.js is stale. Run `npm run teaching:data`.'
      );
      process.exit(1);
    }
  } else if (existing === text) {
    console.log(
      `js/data/teachingGenerated.js unchanged (${DEMOS.length} links).`
    );
  } else {
    await writeFile(OUT, text);
    console.log(`Wrote js/data/teachingGenerated.js (${DEMOS.length} links).`);
  }
}
