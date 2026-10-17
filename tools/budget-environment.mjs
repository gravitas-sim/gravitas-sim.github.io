// =============================================================================
// The reference environment of the size budgets
// -----------------------------------------------------------------------------
// The deferred-JavaScript ceiling is a gzipped byte count, and gzipped bytes
// depend on the zlib that wrote them: the Mac's Node 24 reads a few KB larger
// than CI's Node 22 for the same files. The gate is CI's figure. This names the
// environment that figure is measured in (the Node major in .nvmrc and the zlib
// recorded in tools/budget-environment.json) and says whether this one matches.
//
// There is no tolerance and no exemption. A run in the reference environment
// fails when over budget; a run in another one prints its figure as advisory,
// because it is not the figure the gate judges; `--strict` makes any run fail,
// and CI is always strict.
// =============================================================================

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** The reference: Node's major from .nvmrc, and the recorded zlib (or null). */
export function readReference(root = ROOT) {
  const node = readFileSync(path.join(root, '.nvmrc'), 'utf8').trim();
  const record = JSON.parse(
    readFileSync(path.join(root, 'tools', 'budget-environment.json'), 'utf8')
  );
  return { nodeMajor: node.replace(/^v/, '').split('.')[0], zlib: record.zlib };
}

/**
 * Whether this environment is the reference, and whether a run is strict.
 * @param {{nodeMajor: string, zlib: string|null}} reference
 * @param {{node: string, zlib: string}} here - process.versions
 * @param {{strictFlag?: boolean, ci?: boolean}} [mode]
 */
export function judge(
  reference,
  here,
  { strictFlag = false, ci = false } = {}
) {
  const differences = [];
  const major = here.node.split('.')[0];
  if (major !== reference.nodeMajor)
    differences.push(`Node ${major} here, ${reference.nodeMajor} in CI`);
  if (reference.zlib && here.zlib !== reference.zlib)
    differences.push(`zlib ${here.zlib} here, ${reference.zlib} in CI`);
  const matches = differences.length === 0;
  return {
    matches,
    differences,
    strict: strictFlag || ci || matches,
    zlibRecorded: Boolean(reference.zlib),
  };
}
