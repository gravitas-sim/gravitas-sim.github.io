// =============================================================================
// What it takes for a test to accept a central experiment
// -----------------------------------------------------------------------------
// `docs/lesson-acceptance.json` names, for each investigation, the one
// experiment the lesson is built around and the browser test that drives it.
// This decides whether that claim is true.
//
// It is separated from tools/lesson-scene-audit.mjs for one reason: the audit
// answers the question by reading files and shelling out to `playwright
// --list`, and neither of those can happen inside Jest - Playwright detects a
// Jest process and refuses to collect anything, so a unit test asking the same
// question sees an empty list and reports every binding as missing. Everything
// here is a pure function over data the caller gathered, so the audit can hand
// it the real tree and tests/acceptanceBindings.test.js can hand it a tree
// built to fail.
//
// What a binding has to be
// -----------------------------------------------------------------------------
// The rules got stricter after an audit found that the tag proved much less
// than it looked like it proved. Thirteen of the twenty-two ids were carried by
// more than one test, `ce.keplers-laws` by three, and not one of those three
// measured a semi-major axis or a period. What had happened is that two files
// wrote the tag into a generated title - `@accepts:ce.${loop.id}` inside a loop
// over lesson ids - so every lesson that family covered acquired an acceptance
// binding for free, whatever the test in the loop actually did. The rest were
// parked on whichever test in the declared file happened to mention the lesson:
// a scenario load for weighing-stars, answer persistence for tides, report
// generation for missing-mass.
//
// So:
//
//   - `@accepts:` is reserved. It marks the one dedicated test for a declared
//     central experiment and nothing else. Generic coverage - prediction
//     gating, persistence, navigation, recovery - uses `@covers:`, which
//     nothing here reads.
//   - The tag has to be written out in full in the declared file. A tag
//     assembled from a variable is not a binding, however well it resolves:
//     what it resolves to is a property of the loop it sits in, not of the
//     test, and the loop can change under it silently.
//   - Exactly one collected test may carry it. Two is not twice the evidence;
//     it means nobody can say which test is the acceptance test.
//   - It must not be skipped, fixed, expected to fail, or exclusive, under any
//     of the spellings.
//   - Its id has to be one the acceptance map declares.
// =============================================================================

/** The reserved prefix. Generic coverage uses `@covers:`, which is not read. */
export const RESERVED = '@accepts:';

/**
 * A tag written out in full, and one assembled from a variable.
 *
 * Kept apart deliberately. The templated form is not a weaker binding to be
 * accepted with a warning; it is the thing that produced thirteen duplicate
 * ids, so it is reported as its own kind of problem.
 */
const LITERAL = /@accepts:([A-Za-z0-9._-]+)/g;
const TEMPLATED = /@accepts:[A-Za-z0-9._-]*\$\{/;

/**
 * Every spelling of "this test does not run, or runs alone".
 *
 * `test.fail` is included because an expected failure accepts nothing: it
 * passes when the experiment is broken. `test.slow` is not - that is a budget,
 * not a state.
 */
const INACTIVE =
  /\b(?:test|it)\.(?:describe\.)?(?:serial\.|parallel\.)?(?:only|skip|fixme|fail|failing)\s*\(|\bdescribe\.(?:only|skip|fixme)\s*\(/;

/**
 * Tags in one file, with the line each is on.
 *
 * @param {string} text - The file's contents
 * @returns {{literal: Array<{id: string, line: number, text: string}>, templated: Array<{line: number, text: string}>}} What it carries
 */
export function tagsIn(text) {
  const literal = [];
  const templated = [];
  const lines = String(text ?? '').split('\n');
  lines.forEach((text_, i) => {
    if (TEMPLATED.test(text_)) templated.push({ line: i + 1, text: text_ });
    for (const m of text_.matchAll(LITERAL)) {
      literal.push({ id: m[1], line: i + 1, text: text_ });
    }
  });
  return { literal, templated };
}

/**
 * Parse `npx playwright test --list --reporter=list` into rows.
 *
 * The listing names the file relative to the test directory, so `e2e/` is put
 * back on to make it comparable with what the acceptance map declares.
 *
 * @param {?string} listing - The captured output, or null if it could not run
 * @param {string} [dir] - The test directory the paths are relative to
 * @returns {?Array<{file: string, line: number, title: string}>} One per test
 */
export function parseCollected(listing, dir = 'e2e') {
  if (listing === null || listing === undefined) return null;
  const rows = [];
  for (const line of String(listing).split('\n')) {
    const m = /^\s*\[[^\]]+\]\s+›\s+(\S+?):(\d+):\d+\s+›\s+(.*)$/.exec(line);
    if (!m) continue;
    const file = m[1].startsWith(`${dir}/`) ? m[1] : `${dir}/${m[1]}`;
    rows.push({ file, line: Number(m[2]), title: m[3].trim() });
  }
  return rows;
}

/**
 * The body of the test a tag sits on, so a skip inside it is not missed.
 *
 * Brace counting from the tagged line, which is where a `test(` call starts.
 * Approximate by construction - a brace in a string literal counts - but it
 * only ever makes the window bigger, and a bigger window cannot hide a skip.
 *
 * @param {Array<string>} lines - The file, split
 * @param {number} from - Zero-based line the tag is on
 * @returns {string} The body text
 */
function bodyFrom(lines, from) {
  let depth = 0;
  let started = false;
  const out = [];
  for (let i = from; i < lines.length; i++) {
    out.push(lines[i]);
    for (const ch of lines[i]) {
      if (ch === '{') {
        depth++;
        started = true;
      } else if (ch === '}') depth--;
    }
    if (started && depth <= 0) break;
  }
  return out.join('\n');
}

/**
 * Is every declared central experiment bound to exactly one live test?
 *
 * @param {object} input - Everything gathered
 * @param {object} input.acceptance - The parsed acceptance map
 * @param {Array<{id: string}>} input.lessons - The generated catalog
 * @param {Map<string, string>|object} input.sources - Spec path to contents,
 *   covering every spec file so a stray tag elsewhere is still found
 * @param {?Array<{file: string, title: string}>} input.collected - What
 *   Playwright would run, or null if the listing could not be taken
 * @returns {Array<string>} Problems, empty if the map tells the truth
 */
export function auditBindings({ acceptance, lessons, sources, collected }) {
  const problems = [];
  const src =
    sources instanceof Map ? sources : new Map(Object.entries(sources || {}));

  // --- what the map claims ---------------------------------------------------
  const declared = new Map();
  for (const lesson of lessons || []) {
    const entry = acceptance?.lessons?.[lesson.id];
    if (!entry) continue;
    const id = entry.centralExperimentId;
    if (!id) {
      problems.push(
        `${lesson.id}: acceptance entry has no centralExperimentId, so its ` +
          'central experiment is not bound to any test'
      );
      continue;
    }
    if (declared.has(id)) {
      problems.push(
        `${lesson.id}: centralExperimentId "${id}" is already used by ` +
          `${declared.get(id).lesson}; ids have to be unique or a tag is ambiguous`
      );
      continue;
    }
    declared.set(id, { lesson: lesson.id, file: entry.test });
  }

  // --- what the tree actually carries ---------------------------------------
  // Every spec, not just the declared ones: a tag parked in a file no entry
  // names would otherwise be invisible, and it is exactly how an id ends up
  // collected twice.
  const carried = new Map();
  for (const [file, text] of src) {
    const { literal, templated } = tagsIn(text);
    for (const t of templated) {
      problems.push(
        `${file}:${t.line}: an ${RESERVED} tag is assembled from a variable. ` +
          'A generated tag binds whatever the loop happens to hold, so it is ' +
          'not a statement about this test - write the id out, or use @covers: ' +
          'for coverage that is not a central experiment'
      );
    }
    for (const t of literal) {
      if (!carried.has(t.id)) carried.set(t.id, []);
      carried.get(t.id).push({ file, ...t });
    }
  }

  // A tag for something the map does not declare accepts nothing.
  for (const [id, places] of carried) {
    if (declared.has(id)) continue;
    for (const p of places) {
      problems.push(
        `${p.file}:${p.line}: ${RESERVED}${id} is not a declared central ` +
          'experiment. The prefix is reserved for the ids in ' +
          'docs/lesson-acceptance.json; use @covers: for anything else'
      );
    }
  }

  // --- one live, dedicated test each ----------------------------------------
  for (const [id, { lesson, file }] of declared) {
    const tag = `${RESERVED}${id}`;
    const places = carried.get(id) || [];

    if (!src.has(file)) {
      problems.push(`${lesson}: acceptance test "${file}" does not exist`);
      continue;
    }

    const here = places.filter(p => p.file === file);
    const elsewhere = places.filter(p => p.file !== file);

    if (!here.length) {
      problems.push(
        `${lesson}: no test in ${file} is tagged ${tag}. A file name is not a ` +
          'binding: tag the one test that runs this central experiment'
      );
    }
    if (here.length > 1) {
      problems.push(
        `${lesson}: ${tag} appears ${here.length} times in ${file} ` +
          `(lines ${here.map(p => p.line).join(', ')}). One central experiment, ` +
          'one dedicated test'
      );
    }
    for (const p of elsewhere) {
      problems.push(
        `${lesson}: ${tag} is also in ${p.file}:${p.line}, but the map names ` +
          `${file}. The tag belongs on the dedicated test and nowhere else`
      );
    }

    // Skipped, fixed, expected to fail, or exclusive - on the tag's own line
    // or anywhere in the body it opens.
    for (const p of here) {
      const lines = src.get(file).split('\n');
      const scope = `${p.text}\n${bodyFrom(lines, p.line - 1)}`;
      if (INACTIVE.test(scope)) {
        problems.push(
          `${lesson}: the test tagged ${tag} is skipped, fixed, expected to ` +
            'fail, or exclusive, so it accepts nothing'
        );
      }
    }

    // And it has to name the investigation, so a tag cannot sit on a test that
    // never opens the lesson.
    if (here.length && !src.get(file).includes(lesson)) {
      problems.push(
        `${lesson}: ${file} carries ${tag} but never names "${lesson}", so ` +
          'the test it tags does not identify the investigation it accepts'
      );
    }

    // Finally, what Playwright would really run.
    if (collected) {
      const runs = collected.filter(r => r.title.includes(tag));
      if (!runs.length) {
        problems.push(
          `${lesson}: ${tag} is in ${file} but Playwright collects no test ` +
            'carrying it, so nothing would run for this central experiment'
        );
      } else if (runs.length > 1) {
        problems.push(
          `${lesson}: ${runs.length} collected tests carry ${tag} ` +
            `(${runs.map(r => `${r.file}:${r.line}`).join(', ')}). Two tests ` +
            'claiming one experiment means neither is the acceptance test'
        );
      } else if (runs[0].file !== file) {
        problems.push(
          `${lesson}: the collected test carrying ${tag} is in ` +
            `${runs[0].file}, but the map names ${file}`
        );
      }
    }
  }

  if (!collected) {
    problems.push(
      'could not list the browser suite, so no acceptance binding was ' +
        'confirmed to resolve. Run `npx playwright test --list` to see why.'
    );
  }

  return problems;
}
