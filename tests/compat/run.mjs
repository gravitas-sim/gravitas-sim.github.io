// =============================================================================
// Run one record kind's spec against one tree, in a plain Node process
// -----------------------------------------------------------------------------
//   node tests/compat/run.mjs <tree> <spec> make
//   node tests/compat/run.mjs <tree> <spec> read      (fixture JSON on stdin)
//   node tests/compat/run.mjs <tree> <spec> rewrite   (fixture JSON on stdin)
//
// <tree> is a directory holding js/ (the repository, or the js/ of the 2.0.0
// tag unpacked by tests/compat/harness.js). The spec is the same file for both
// trees, so a difference in what comes out is a difference in the code, not in
// the test. Output is one line of JSON: {ok: true, value} or {ok: false, error}.
// =============================================================================

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const [tree, specFile, op] = process.argv.slice(2);
/** A JSON file of the tree (the SDK's examples, for instance). */
const readJson = rel => JSON.parse(readFileSync(path.join(tree, rel), 'utf8'));
const load = rel => import(pathToFileURL(path.join(tree, rel)).href);
const spec = (await import(pathToFileURL(path.resolve(specFile)).href)).default;

const stdin = () => JSON.parse(readFileSync(0, 'utf8'));
try {
  let value;
  if (op === 'make') value = await spec.make(load, readJson);
  else if (op === 'read') value = await spec.read(load, stdin(), { tree });
  else if (op === 'rewrite') value = await spec.rewrite(load, stdin());
  else throw new Error(`unknown op ${op}`);
  console.log(JSON.stringify({ ok: true, value: value ?? null }));
} catch (error) {
  console.log(
    JSON.stringify({ ok: false, error: String(error?.message ?? error) })
  );
}
