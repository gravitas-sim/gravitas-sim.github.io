// =============================================================================
// Acceptance checks for features that are not built yet
// -----------------------------------------------------------------------------
//   node tools/pending-acceptance.mjs report [dir]   print the summary section
//
// A test can describe a feature before the feature exists (Prompt 161 uses
// this). Such a check is registered by id in tools/pending-acceptance.json and
// run through `runPending`:
//
//   - while its entry has `activated: false`, the check runs, its outcome
//     (met / pending, with the failure message) is recorded and reported in a
//     "pending acceptance" section, and it does not fail the run;
//   - once the feature's prompt sets `activated: true`, the same call runs the
//     body as an ordinary test: a failure is a failure.
//
// It is not a quarantine. It never touches an existing test's pass or fail, an
// id missing from the registry is an error (so nothing is pending by accident),
// and a pending result is never called a flake. Activation is by name, in the
// registry, by the prompt that builds the feature.
// =============================================================================

import { readFileSync, mkdirSync, writeFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const REGISTRY_FILE = path.join(HERE, 'pending-acceptance.json');
export const RESULTS_DIR = path.join(
  HERE,
  '..',
  'test-results',
  'pending-acceptance'
);

export function readRegistry(file = REGISTRY_FILE) {
  const { checks } = JSON.parse(readFileSync(file, 'utf8'));
  const seen = new Set();
  for (const c of checks) {
    if (!c.id || !c.prompt || typeof c.activated !== 'boolean')
      throw new Error(
        `A pending-acceptance entry needs id, prompt and activated: ${JSON.stringify(c)}`
      );
    if (seen.has(c.id))
      throw new Error(`Duplicate pending-acceptance id ${c.id}`);
    seen.add(c.id);
  }
  return checks;
}

/**
 * Run one acceptance check.
 * @param {string} id - Its registry id
 * @param {() => (void|Promise<void>)} body - Throws when the feature is missing
 * @param {{registry?: Array<object>, dir?: string}} [options]
 * @returns {Promise<{id: string, prompt: string, status: 'met'|'pending', message: string}>}
 */
export async function runPending(
  id,
  body,
  { registry, dir = RESULTS_DIR } = {}
) {
  const entry = (registry ?? readRegistry()).find(c => c.id === id);
  if (!entry) throw new Error(`${id} is not in tools/pending-acceptance.json`);
  if (entry.activated) {
    await body(); // an activated check is an ordinary test
    return { id, prompt: entry.prompt, status: 'met', message: '' };
  }
  let result = { id, prompt: entry.prompt, status: 'met', message: '' };
  try {
    await body();
  } catch (error) {
    result = {
      id,
      prompt: entry.prompt,
      status: 'pending',
      message: String(error?.message ?? error).split('\n')[0],
    };
  }
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    path.join(dir, `${id.replace(/[^\w.-]/g, '_')}.json`),
    JSON.stringify(result)
  );
  return result;
}

/** The summary section: pending first, then met-but-not-yet-activated. */
export function formatReport(results) {
  if (!results.length) return '';
  const lines = ['### Pending acceptance (not failures)', ''];
  for (const r of [...results].sort(
    (a, b) => a.status.localeCompare(b.status) || a.id.localeCompare(b.id)
  )) {
    lines.push(
      r.status === 'pending'
        ? `- ${r.id} (Prompt ${r.prompt}): pending - ${r.message}`
        : `- ${r.id} (Prompt ${r.prompt}): already met, ready to activate`
    );
  }
  return lines.join('\n') + '\n';
}

export function readResults(dir = RESULTS_DIR) {
  try {
    return readdirSync(dir)
      .filter(f => f.endsWith('.json'))
      .map(f => JSON.parse(readFileSync(path.join(dir, f), 'utf8')));
  } catch {
    return [];
  }
}

if (
  process.argv[1] &&
  import.meta.url === `file://${process.argv[1]}` &&
  process.argv[2] === 'report'
) {
  process.stdout.write(
    formatReport(readResults(process.argv[3] || RESULTS_DIR))
  );
}
