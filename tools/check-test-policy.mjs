#!/usr/bin/env node
// =============================================================================
// A skip has to be a capability, and it has to be on the record
// -----------------------------------------------------------------------------
//   npm run test:policy
//
// The browser suite had eight runtime skips. Three of them were required
// application behavior wearing a capability's clothes:
//
//   inspector.spec.js       "this build has no energy tab" - so a build that
//                           lost the energy tab passed this test.
//   lessonEventWatch.spec.js  "nothing armable in the default scenario" - and
//                           nothing ever was, so every assertion after that
//                           line had never run.
//   observing.spec.js       "this viewport fits all three panels" - so the
//                           test passed on any window big enough to avoid the
//                           situation it exists to check.
//
// None of them was dishonest on purpose. A skip is the natural thing to reach
// for when a precondition might not hold, and nothing distinguished "this
// machine has no WebGL" from "this feature is missing". So the rule is now
// explicit: every skip is either in the allowlist below, with a reason and a
// capability named, or it is a failure.
//
// What this does not do is guess. It reads the source and reports what it
// finds; the judgment about which category a skip belongs in is made once,
// here, by a person.
// =============================================================================

import { readdir, readFile } from 'node:fs/promises';
import { resolve, dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SUITE = join(ROOT, 'e2e');

/**
 * The skips that are allowed, and why.
 *
 * `capability` names the thing the machine may not have. A skip whose reason is
 * about the application rather than about the platform does not belong here -
 * it belongs in an assertion.
 */
export const ALLOWED_SKIPS = [
  {
    file: 'e2e/capture.spec.js',
    match: '!capability.canRecord',
    capability: 'MediaRecorder',
    why:
      'Video capture needs MediaRecorder with a codec the browser will encode. ' +
      'WebKit and some Linux builds have neither, and the feature degrades to ' +
      'a message rather than breaking the page.',
  },
  {
    file: 'e2e/spacetime.spec.js',
    match: 'no WebGL in this browser',
    capability: 'WebGL',
    why:
      'The spacetime view is a WebGL surface. CI runners without a GPU have no ' +
      'context to give it, and the application says so rather than failing.',
  },
];

/** Markers that are never allowed, whatever the reason. */
const FORBIDDEN = [
  { pattern: /\btest\.only\s*\(/, what: 'test.only' },
  { pattern: /\bdescribe\.only\s*\(/, what: 'describe.only' },
  { pattern: /\btest\.fixme\s*\(/, what: 'test.fixme' },
  { pattern: /\btest\.fail\s*\(/, what: 'test.fail' },
  { pattern: /\bdescribe\.skip\s*\(/, what: 'describe.skip' },
];

/** Every spec file in the suite. */
async function specs() {
  const out = [];
  for (const name of await readdir(SUITE)) {
    if (name.endsWith('.spec.js')) out.push(join(SUITE, name));
  }
  return out.sort();
}

/**
 * Check the suite against the policy.
 *
 * @returns {Promise<Array<string>>} Problems, empty when the suite complies
 */
export async function checkTestPolicy() {
  const problems = [];
  const used = new Set();

  for (const path of await specs()) {
    const rel = relative(ROOT, path);
    const src = await readFile(path, 'utf8');
    const lines = src.split('\n');

    lines.forEach((line, i) => {
      const where = `${rel}:${i + 1}`;
      // A comment describing a marker is not a marker.
      const code = line.replace(/\/\/.*$/, '');

      for (const { pattern, what } of FORBIDDEN) {
        if (pattern.test(code)) {
          problems.push(
            `${where}: ${what} is not allowed. An exclusive run hides every ` +
              'other test; a fixme or an expected failure is a red test ' +
              'recorded as green.'
          );
        }
      }

      if (!/\btest\.skip\s*\(/.test(code)) return;
      const allowed = ALLOWED_SKIPS.find(
        entry => rel === entry.file && line.includes(entry.match)
      );
      if (allowed) {
        used.add(`${entry(allowed)}`);
        return;
      }
      problems.push(
        `${where}: runtime skip is not in the allowlist. If it is a capability ` +
          'the machine may lack, add it to ALLOWED_SKIPS in ' +
          'tools/check-test-policy.mjs with the capability named and why. If ' +
          'it is application behavior, assert it instead - a skip there is a ' +
          'test that passes when the feature is missing.'
      );
    });
  }

  // An allowlist entry whose skip has gone is an entry nobody will remove.
  for (const allow of ALLOWED_SKIPS) {
    if (!used.has(entry(allow))) {
      problems.push(
        `${allow.file}: allowlisted skip "${allow.match}" is no longer in the ` +
          'file. Remove the entry so the list stays a list of real exemptions.'
      );
    }
  }

  return problems;
}

/** A stable key for an allowlist entry. */
const entry = a => `${a.file}::${a.match}`;

// Run as a tool, imported as a module. tests/releaseGate.test.js reads
// ALLOWED_SKIPS to assert the list stays small and stays about capabilities;
// importing it should not also run the check and print to the console.
if (import.meta.url === `file://${process.argv[1]}`) {
  const problems = await checkTestPolicy();
  if (problems.length) {
    console.error(
      '\nThe browser suite does not comply with the skip policy:\n'
    );
    for (const p of problems) console.error(`  ${p}`);
    console.error(
      `\n${problems.length} problem(s). ` +
        `${ALLOWED_SKIPS.length} capability skip(s) are allowed:\n`
    );
    for (const a of ALLOWED_SKIPS) {
      console.error(`  ${a.capability.padEnd(14)} ${a.file}`);
    }
    console.error('');
    process.exit(1);
  }

  console.log(
    `\nThe browser suite complies: no .only, no fixme, no expected failures, ` +
      `and ${ALLOWED_SKIPS.length} allowlisted capability skip(s).`
  );
  for (const a of ALLOWED_SKIPS) {
    console.log(`  ${a.capability.padEnd(14)} ${a.file}  - ${a.why}`);
  }
  console.log('');
}
