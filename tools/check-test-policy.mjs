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
// There is one other kind of skip that is not application behavior, and it is
// not a capability either: the build the suite has been pointed at. Against
// dist/ there is no /js/audio.js to import, so a test that compares the page
// with a module's own arrays cannot run there. That is decided by
// GRAVITAS_E2E_TARGET before a browser is opened, and it is recognised here by
// the condition itself rather than listed file by file - see BUILD_TARGET.
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

/**
 * The build-target category: a skip whose whole condition is which build the
 * suite is running against.
 *
 * Recognised by what the condition *is*, not by what it is called. It passes
 * when the first argument to test.skip() is either the comparison itself or a
 * name bound to it by a top-level `const`, declared nowhere else in the file:
 *
 *   const DIST = process.env.GRAVITAS_E2E_TARGET === 'dist';
 *   test.skip(DIST, 'needs the module registry to read the plotted arrays');
 *
 * Anything more than that fails as before. `DIST || measured.length === 0` is
 * application behavior with a build target in front of it, and a `DIST` that
 * is really `await button.isHidden()` is only named like one.
 *
 * Most specs never meet dist/ at all - playwright.config.js matches only the
 * production and both-targets specs there - so a build-target skip elsewhere
 * is dormant. It is still the right thing to write: it is what lets a spec
 * join BOTH_TARGETS without its module-level tests failing on the bundle.
 */
export const BUILD_TARGET = {
  variable: 'GRAVITAS_E2E_TARGET',
  why:
    'Against dist/ esbuild has bundled js/ into hashed chunks, so a test that ' +
    'imports a module from inside the page has nothing to import. The ' +
    'condition is fixed before the browser opens and names the build, not ' +
    'the application, so it cannot turn a missing feature into a pass.',
};

/** `process.env.GRAVITAS_E2E_TARGET === 'dist'` (or `!==`, or 'src'), whole. */
const TARGET_CONDITION = new RegExp(
  String.raw`^process\.env\.${BUILD_TARGET.variable}\s*[!=]==\s*(['"])(?:dist|src)\1$`
);

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
 * The source text of a call's first argument, from the offset of its `(`.
 *
 * Enough of a tokenizer to step over strings, comments and nested brackets,
 * which is all a skip condition has in it. Anything it misreads comes back as
 * text that is not a build-target condition, so a mistake here is a reported
 * problem, never a skip let through.
 *
 * @param {string} src - The whole file
 * @param {number} open - Offset of the opening parenthesis
 * @returns {string} The argument, trimmed; empty for `test.skip()`
 */
function firstArgument(src, open) {
  let depth = 0;
  for (let i = open + 1; i < src.length; i++) {
    const c = src[i];
    if (c === '"' || c === "'" || c === '`') {
      for (i++; i < src.length && src[i] !== c; i++) if (src[i] === '\\') i++;
    } else if (c === '/' && src[i + 1] === '/') {
      i = src.indexOf('\n', i);
      if (i === -1) break;
    } else if (c === '/' && src[i + 1] === '*') {
      i = src.indexOf('*/', i + 2) + 1;
      if (i === 0) break;
    } else if ('([{'.includes(c)) {
      depth++;
    } else if (c === ',' && depth === 0) {
      return src.slice(open + 1, i).trim();
    } else if (')]}'.includes(c)) {
      if (depth === 0) return src.slice(open + 1, i).trim();
      depth--;
    }
  }
  return src.slice(open + 1).trim();
}

/**
 * Names this file binds to the build target, once, at the top level.
 *
 * Top level means column 0, which is where prettier leaves a module's own
 * declarations. Declared a second time anywhere - an inner `const DIST`, or a
 * `const { DIST }`, that shadows it with something read off the page - and the
 * name is not trusted.
 *
 * @param {Array<string>} code - The file's lines, comments removed
 * @returns {Set<string>}
 */
function targetBindings(code) {
  const names = new Set();
  for (const line of code) {
    const m = line.match(/^const\s+([A-Za-z_$][\w$]*)\s*=\s*(.+?);?\s*$/);
    if (m && TARGET_CONDITION.test(m[2])) names.add(m[1]);
  }
  const text = code.join('\n');
  for (const name of names) {
    // From a declaration keyword to its `=` or `;`: every name it introduces.
    const declared = new RegExp(
      String.raw`\b(?:const|let|var)\b[^=;]*?(?<![\w$])` +
        `${name.replace(/\$/g, '\\$')}(?![\\w$])`,
      'g'
    );
    if (text.match(declared).length !== 1) names.delete(name);
  }
  return names;
}

/**
 * Check one spec's source against the policy.
 *
 * @param {string} rel - Its path from the repository root, e.g. 'e2e/x.spec.js'
 * @param {string} src - Its source
 * @returns {{problems: Array<string>, allowed: Array<string>, buildTarget: Array<string>}}
 *   Problems; the allowlist entries it used; and where its build-target skips are
 */
export function checkSpecSource(rel, src) {
  const problems = [];
  const allowed = [];
  const buildTarget = [];
  const lines = src.split('\n');
  // A comment describing a marker is not a marker.
  const code = lines.map(line => line.replace(/\/\/.*$/, ''));
  const bindings = targetBindings(code);

  let offset = 0;
  lines.forEach((line, i) => {
    const start = offset;
    offset += line.length + 1;
    const where = `${rel}:${i + 1}`;

    for (const { pattern, what } of FORBIDDEN) {
      if (pattern.test(code[i])) {
        problems.push(
          `${where}: ${what} is not allowed. An exclusive run hides every ` +
            'other test; a fixme or an expected failure is a red test ' +
            'recorded as green.'
        );
      }
    }

    for (const skip of code[i].matchAll(/\btest\.skip\s*\(/g)) {
      const allow = ALLOWED_SKIPS.find(
        entry => rel === entry.file && line.includes(entry.match)
      );
      if (allow) {
        allowed.push(entry(allow));
        continue;
      }
      const condition = firstArgument(
        src,
        start + skip.index + skip[0].length - 1
      );
      if (bindings.has(condition) || TARGET_CONDITION.test(condition)) {
        buildTarget.push(where);
        continue;
      }
      problems.push(
        `${where}: runtime skip is not in the allowlist. If it is a capability ` +
          'the machine may lack, add it to ALLOWED_SKIPS in ' +
          'tools/check-test-policy.mjs with the capability named and why. If ' +
          `it depends only on ${BUILD_TARGET.variable}, make that the whole ` +
          'condition. If it is application behavior, assert it instead - a ' +
          'skip there is a test that passes when the feature is missing.'
      );
    }
  });

  return { problems, allowed, buildTarget };
}

/**
 * Check the suite against the policy.
 *
 * @returns {Promise<{problems: Array<string>, buildTarget: Array<string>}>}
 *   Problems, empty when the suite complies; and every build-target skip found
 */
export async function checkTestPolicy() {
  const problems = [];
  const buildTarget = [];
  const used = new Set();

  for (const path of await specs()) {
    const rel = relative(ROOT, path);
    const found = checkSpecSource(rel, await readFile(path, 'utf8'));
    problems.push(...found.problems);
    buildTarget.push(...found.buildTarget);
    for (const key of found.allowed) used.add(key);
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

  return { problems, buildTarget };
}

/** A stable key for an allowlist entry. */
const entry = a => `${a.file}::${a.match}`;

// Run as a tool, imported as a module. tests/releaseGate.test.js reads
// ALLOWED_SKIPS to assert the list stays small and stays about capabilities,
// and feeds checkSpecSource() specs that put a build target beside application
// behavior; importing it should not also run the check and print to the console.
if (import.meta.url === `file://${process.argv[1]}`) {
  const { problems, buildTarget } = await checkTestPolicy();
  if (problems.length) {
    console.error(
      '\nThe browser suite does not comply with the skip policy:\n'
    );
    for (const p of problems) console.error(`  ${p}`);
    console.error(
      `\n${problems.length} problem(s). ` +
        `${ALLOWED_SKIPS.length} capability skip(s) are allowed, and any skip ` +
        `whose whole condition is ${BUILD_TARGET.variable}:\n`
    );
    for (const a of ALLOWED_SKIPS) {
      console.error(`  ${a.capability.padEnd(14)} ${a.file}`);
    }
    console.error('');
    process.exit(1);
  }

  console.log(
    `\nThe browser suite complies: no .only, no fixme, no expected failures, ` +
      `${ALLOWED_SKIPS.length} allowlisted capability skip(s) and ` +
      `${buildTarget.length} build-target skip(s).`
  );
  for (const a of ALLOWED_SKIPS) {
    console.log(`  ${a.capability.padEnd(14)} ${a.file}  - ${a.why}`);
  }
  for (const where of buildTarget) {
    console.log(`  ${'build target'.padEnd(14)} ${where}`);
  }
  if (buildTarget.length)
    console.log(`  ${''.padEnd(14)} - ${BUILD_TARGET.why}`);
  console.log('');
}
