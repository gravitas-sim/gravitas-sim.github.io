#!/usr/bin/env node
// =============================================================================
// node tools/formula-size.mjs
// -----------------------------------------------------------------------------
// What the formula language costs a page that loads it: each entry bundled and
// minified by esbuild, then gzipped, with the modules other code already pays
// for (the shared number reader, the units registry, the envelope, the hash)
// left out. Prints one JSON object of bytes. tests/formula.test.js holds the
// ceilings; it runs this in a child process because esbuild will not load in
// the Jest DOM environment.
// =============================================================================

import { build } from 'esbuild';
import { gzipSync } from 'node:zlib';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENTRIES = {
  engine: 'js/formula/engine.js',
  grade: 'js/formula/grade.js',
  evidence: 'js/formula/evidence.js',
};

const out = {};
for (const [name, entry] of Object.entries(ENTRIES)) {
  const r = await build({
    entryPoints: [path.join(ROOT, entry)],
    bundle: true,
    minify: true,
    format: 'esm',
    write: false,
    external: [
      '*/answerParse.js',
      '*/units/registry.js',
      '*/platform/artifact.js',
      '*/hash.js',
    ],
  });
  const bytes = r.outputFiles[0].contents;
  out[name] = { min: bytes.length, gzip: gzipSync(bytes, { level: 9 }).length };
}
console.log(JSON.stringify(out));
