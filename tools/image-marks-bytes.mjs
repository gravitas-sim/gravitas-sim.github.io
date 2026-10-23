#!/usr/bin/env node
// =============================================================================
// The marks instrument's bytes and requests against the gate (Prompt 179)
// -----------------------------------------------------------------------------
//   node tools/image-marks-bytes.mjs          print the measurement as JSON
//
// IMAGE_MEASUREMENT_GATE.md committed T1.deferred (the lazy chunks at most 25,600
// B minified and gzipped, the way build.js counts them), T1.requests (at most 3
// lazy requests on opening an image observation) and T1.tier (no first-visit
// bytes; the idle tier's room). tools/image-measure-gate/bytes.mjs measured the
// prototype; this measures the production modules the same way: esbuild with the
// build's options, every module the Observatory route already loads eagerly
// marked external, each output chunk gzipped on its own. Two lazy builds:
//
//   gate      the image kind as the checkpoint counts it (contract, limits,
//             planes, grid, draft: the files the idle group carries for the
//             consumers after this one) together with the instrument, which is
//             what the gate's number is (24,080 B for the prototype)
//   open      what opening an image observation fetches today: the instrument's
//             own closure (it imports contract and limits only)
//
// The ledger's modules (the notebook's entry builder and store) are the Fit
// panel's lazy chunks already; the instrument reaches them only by `import()`
// when the reader presses "Keep in the ledger", so they are not an opening
// cost, and are measured apart (`keep`). tests/imageMeasureBudget.test.js holds
// the rows to the gate's numbers.
// =============================================================================

import { build } from 'esbuild';
import { writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

export const REPO = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..'
);
const OPTIONS = {
  bundle: true,
  minify: true,
  keepNames: false,
  format: 'esm',
  target: ['es2022'],
  charset: 'utf8',
  legalComments: 'none',
  splitting: true,
  write: false,
  metafile: true,
  absWorkingDir: REPO,
  outdir: 'out',
  chunkNames: 'chunk-[hash]',
  entryNames: '[name]',
  logLevel: 'silent',
};
const gz = buf => gzipSync(buf).length;
const rel = p =>
  path.relative(REPO, path.resolve(REPO, p)).split(path.sep).join('/');

/** The modules the Observatory route loads before anything is opened. */
async function eagerModules() {
  const r = await build({
    ...OPTIONS,
    entryPoints: { page: 'js/observatoryPage.js' },
  });
  const { outputs } = r.metafile;
  const eager = new Set();
  const seen = new Set();
  const walk = file => {
    if (seen.has(file)) return;
    seen.add(file);
    for (const k of Object.keys(outputs[file].inputs)) eager.add(rel(k));
    for (const i of outputs[file].imports)
      if (i.kind === 'import-statement' && outputs[i.path]) walk(i.path);
  };
  walk('out/page.js');
  return eager;
}

async function lazyBuild(entries, eager, outside = () => false) {
  const external = {
    name: 'eager',
    setup(b) {
      b.onResolve({ filter: /^\./ }, args => {
        const abs = path.resolve(args.resolveDir, args.path);
        const r = rel(abs);
        // What a press fetches later (an `import()` of the instrument) is not
        // what opening an image observation costs.
        return eager.has(r) || outside(r, args.kind)
          ? { path: abs, external: true }
          : null;
      });
    },
  };
  const r = await build({
    ...OPTIONS,
    entryPoints: entries,
    plugins: [external],
  });
  const files = r.outputFiles.map(f => ({
    file: path.relative(path.join(REPO, 'out'), f.path),
    gz: gz(f.contents),
    raw: f.contents.length,
  }));
  const inputs = new Set();
  for (const o of Object.values(r.metafile.outputs))
    for (const k of Object.keys(o.inputs)) inputs.add(rel(k));
  return {
    files,
    total: files.reduce((a, f) => a + f.gz, 0),
    requests: files.length,
    inputs: [...inputs],
  };
}

export async function measureBytes() {
  const eager = await eagerModules();
  // The kind as the checkpoint counts it, as an entry of its own (a scratch file).
  const dir = mkdtempSync(path.join(tmpdir(), 'image-marks-bytes-'));
  const kindEntry = path.join(dir, 'kind.js');
  writeFileSync(
    kindEntry,
    ['contract', 'limits', 'planes', 'grid', 'draft']
      .map(n => `export * as ${n} from '${REPO}/js/dataKinds/${n}.js';`)
      .join('\n')
  );
  try {
    const instrument = 'js/observatory/imageMarks.js';
    const press = (r, kind) => kind === 'dynamic-import';
    const gate = await lazyBuild({ kind: kindEntry, instrument }, eager, press);
    const open = await lazyBuild({ instrument }, eager, press);
    // The ledger's modules are lazy already; what the instrument adds is what is
    // not already a chunk of the Fit panel: measured as everything the entry
    // reaches that the instrument does not.
    const keepEntry = path.join(dir, 'keep.js');
    writeFileSync(
      keepEntry,
      [
        'platform/artifact',
        'notebook/artifactEntry',
        'notebook/entry',
        'notebook/store',
      ]
        .map(n => `export * as ${path.basename(n)} from '${REPO}/js/${n}.js';`)
        .join('\n')
    );
    const keep = await lazyBuild({ keep: keepEntry }, eager);
    // The words are fetched one language at a time (the instrument imports the
    // page's language's file when it opens): a reader downloads the larger of
    // the two at worst, so that is what opening costs on top of the chunks.
    const en = await lazyBuild({ words: 'js/i18n/en.imageMarks.js' }, eager);
    const es = await lazyBuild({ words: 'js/i18n/es.imageMarks.js' }, eager);
    const words = {
      en: en.total,
      es: es.total,
      worst: Math.max(en.total, es.total),
    };
    return {
      eagerModules: eager.size,
      words,
      gate: {
        chunks: gate.files,
        bytes: gate.total + words.worst,
        requests: gate.requests + 1,
      },
      open: {
        chunks: open.files,
        bytes: open.total + words.worst,
        requests: open.requests + 1,
        modules: open.inputs.filter(p => !eager.has(p)),
      },
      keep: { bytes: keep.total, requests: keep.requests },
    };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(JSON.stringify(await measureBytes(), null, 1));
}
