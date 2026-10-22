// =============================================================================
// Which files the gate's record is about (Prompt 178)
// -----------------------------------------------------------------------------
// The record (tools/image-measure-gate.json) holds the digest of the prototype's
// files as they were measured; a test fails when one has changed since, so the
// record cannot describe code that is no longer there. A light module on purpose:
// the test imports it, and the measurement's own imports (a browser driver, a
// bundler) are not for Jest.
// =============================================================================

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { REPO } from './server.mjs';

/** The files whose content the record is about: edit one and the record is stale. */
export const PROTOTYPE_FILES = [
  'frames.mjs',
  'marks.js',
  'record.js',
  'panel.js',
  'harness.html',
  'harness.js',
  'decodeWorker.js',
  'entries/kind.js',
  'entries/fits.js',
];
export const prototypeDigest = () => {
  const h = createHash('sha256');
  for (const f of PROTOTYPE_FILES) {
    h.update(f);
    h.update(readFileSync(path.join(REPO, 'tools', 'image-measure-gate', f)));
  }
  return h.digest('hex').slice(0, 16);
};
