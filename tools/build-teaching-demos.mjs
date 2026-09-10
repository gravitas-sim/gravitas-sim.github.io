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
import * as prettierNamespace from 'prettier';

// Prettier's exports arrive in two shapes: under `default` through Jest's ESM
// interop and at the top level under Node's own loader. Both are real, so this
// picks whichever actually has format() rather than arguing with either.
const prettier = prettierNamespace.format
  ? prettierNamespace
  : prettierNamespace.default;
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = resolve(REPO, 'js/data/teachingGenerated.js');

const { DEMOS } = await import(`${REPO}/js/data/teaching.js`);
const { SCENARIO_INFO } = await import(`${REPO}/js/data/scenarioInfo.js`);
const { DEFAULT_SETTINGS } = await import(`${REPO}/js/appState.js`);
const { buildPayload, encodePayload, decodePayload } = await import(
  `${REPO}/js/shareState.js`
);
const { parseSeed } = await import(`${REPO}/js/rng.js`);

/**
 * The repository's Prettier settings.
 *
 * Read from .prettierrc.json rather than through prettier.resolveConfig(),
 * which is missing from the build Jest loads - so a formatting check that
 * relied on it worked from the command line and threw inside a test. There is
 * exactly one config file here and it is JSON, so reading it is both simpler
 * and the same answer in every runtime.
 *
 * @returns {Promise<Object>} Options for prettier.format
 */
let cachedPrettierOptions = null;
async function prettierOptions() {
  if (cachedPrettierOptions) return cachedPrettierOptions;
  try {
    const text = await readFile(resolve(REPO, '.prettierrc.json'), 'utf8');
    cachedPrettierOptions = JSON.parse(text);
  } catch {
    cachedPrettierOptions = {};
  }
  return cachedPrettierOptions;
}

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
  const options = await prettierOptions();
  return prettier.format(raw, { ...options, filepath: OUT, parser: 'babel' });
}

/**
 * Everything wrong with a checked-in generated file, as sentences.
 *
 * Why this is not a byte comparison
 * -----------------------------------------------------------------------------
 * It was one, and the header above already explained why that was the wrong
 * test - two Node versions can disagree about whether a sixty-byte payload is
 * worth deflating, and both answers are correct links - and then compared bytes
 * anyway. On Node 24.19.0 the zlib behind CompressionStream emits a different
 * (equally valid) deflate stream from the one on 24.4.0, so `npm run
 * teaching:check` failed on a file that was not stale by any meaning of the
 * word: all six links decoded to exactly the payloads the spec describes.
 *
 * Regenerating until one machine agrees would only move the failure to the next
 * machine. So this compares what a link is *for*: the set of demonstrations,
 * that every link decodes at all, and that what it decodes to is precisely the
 * payload the spec asks for - scenario, seed, forced settings, paused state and
 * schema version. An encoding that differs byte for byte and means the same
 * thing passes. An encoding that means anything else does not, whatever it
 * looks like.
 *
 * Structure and formatting are fileProblemsWith()'s business, deliberately:
 * they are properties of the file, and this is a question about the links.
 *
 * @param {Object} generated - The checked-in module's exports
 * @param {Array} demos - The spec
 * @returns {Promise<string[]>} Empty when the links say what the spec says
 */
export async function stalenessOf(generated, demos = DEMOS) {
  const problems = [];
  const links = generated?.DEMO_LINKS;

  if (!links || typeof links !== 'object') {
    problems.push('the file exports no DEMO_LINKS object');
    return problems;
  }

  // --- The set of demonstrations ------------------------------------------
  const wanted = demos.map(d => d.id);
  const found = Object.keys(links);
  for (const id of wanted) {
    if (!found.includes(id)) problems.push(`"${id}" has no link`);
  }
  for (const id of found) {
    if (!wanted.includes(id)) {
      problems.push(`"${id}" has a link but is not a demonstration any more`);
    }
  }

  // --- What each link means ------------------------------------------------
  for (const demo of demos) {
    const fragment = links[demo.id];
    if (typeof fragment !== 'string' || !fragment) continue;

    let decoded;
    try {
      decoded = await decodePayload(fragment);
    } catch (err) {
      problems.push(`"${demo.id}" does not decode: ${err.message}`);
      continue;
    }

    const expected = payloadFor(demo);
    // Compared key by key rather than as two JSON strings: key order is not
    // meaning, and a failure should name the field that differs rather than
    // print two base64 blobs and leave the reader to diff them.
    const keys = new Set([...Object.keys(expected), ...Object.keys(decoded)]);
    for (const key of keys) {
      const a = JSON.stringify(expected[key]);
      const b = JSON.stringify(decoded[key]);
      if (a !== b) {
        problems.push(
          `"${demo.id}" decodes to ${key}=${b ?? 'nothing'}, but the spec says ${a ?? 'nothing'}`
        );
      }
    }
  }

  // --- The scenario count ---------------------------------------------------
  const count = Object.keys(SCENARIO_INFO).length;
  if (generated.SCENARIO_COUNT !== count) {
    problems.push(
      `SCENARIO_COUNT is ${generated.SCENARIO_COUNT}, but there are ${count} scenarios`
    );
  }

  return problems;
}

/**
 * Everything wrong with the generated file *as a file*.
 *
 * Separate from what the links mean, because these are different questions
 * with different answers: a file can hold six perfectly good links and still
 * have lost its banner, and it can be beautifully formatted and name the wrong
 * scenario. This half is about the artifact - it is a checked-in source file
 * that `npm run format:check` reads like any other, and it should go on
 * looking like something a generator wrote.
 *
 * `formatChecked` is false when the runtime's Prettier cannot parse: Jest
 * loads the standalone bundle, which ships without parsers. Saying so beats a
 * silent skip, and the command line - the only caller that gates anything -
 * runs under Node, where it is always true.
 *
 * @param {string} text - The checked-in file, verbatim
 * @returns {Promise<{problems: string[], formatChecked: boolean}>} What is wrong
 */
export async function fileProblemsWith(text) {
  const problems = [];
  if (typeof text !== 'string' || !text.length) {
    return { problems: ['the file is empty'], formatChecked: false };
  }

  if (!text.includes('GENERATED, do not edit')) {
    problems.push('the file has lost its generated-file banner');
  }
  if (!text.includes('Object.freeze(')) {
    problems.push('DEMO_LINKS is no longer frozen');
  }
  if (!/export const SCENARIO_COUNT = \d+;/.test(text)) {
    problems.push('SCENARIO_COUNT is missing or is not a plain number');
  }

  let formatChecked = false;
  try {
    const options = await prettierOptions();
    const formatted = await prettier.format(text, {
      ...options,
      filepath: OUT,
    });
    formatChecked = true;
    if (formatted !== text) {
      problems.push(
        'the file is not formatted the way Prettier would write it'
      );
    }
  } catch {
    // No parser in this runtime. Reported through formatChecked, not hidden.
  }

  return { problems, formatChecked };
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
    if (existing === null) {
      console.error(
        'js/data/teachingGenerated.js does not exist. Run `npm run teaching:data`.'
      );
      process.exit(1);
    }
    let generated;
    try {
      generated = await import(`${OUT}?check=${Date.now()}`);
    } catch (err) {
      console.error(
        `js/data/teachingGenerated.js will not load: ${err.message}`
      );
      process.exit(1);
    }
    const stale = await stalenessOf(generated);
    const file = await fileProblemsWith(existing);
    const all = [...stale, ...file.problems];
    if (all.length) {
      console.error('js/data/teachingGenerated.js does not match the spec:\n');
      for (const p of all) console.error(`  - ${p}`);
      console.error('\nRun `npm run teaching:data`.');
      process.exit(1);
    }
    if (!file.formatChecked) {
      console.warn(
        'note: this runtime has no Prettier parser, so formatting was not checked.'
      );
    }
    console.log(
      `js/data/teachingGenerated.js is current (${DEMOS.length} links, ` +
        `each decoding to the payload the spec describes).`
    );
  } else if (existing === text) {
    console.log(
      `js/data/teachingGenerated.js unchanged (${DEMOS.length} links).`
    );
  } else {
    await writeFile(OUT, text);
    console.log(`Wrote js/data/teachingGenerated.js (${DEMOS.length} links).`);
  }
}
