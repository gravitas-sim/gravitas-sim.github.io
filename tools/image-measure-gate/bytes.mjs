/* global console, process */
// =============================================================================
// The gate's byte and request measurements (Prompt 178 prototype; spike code)
// -----------------------------------------------------------------------------
// T1.deferred, T1.requests and T1.tier: the instrument's lazy chunks, minified
// and gzipped the way build.js counts them, with every module the Observatory
// route already loads eagerly marked external, so that only what opening an
// image observation adds is counted. T1.route is measured separately, on scratch
// copies of the tree (route.mjs), because the route tool measures a whole tree.
//
// The image kind is js/dataKinds/ contract, limits, planes, grid and draft
// (the checkpoint's 10.5 KiB); the instrument is panel.js with marks.js and
// record.js (the ledger bridge), and the FITS reader is measured beside it and
// not counted (IMAGE_MEASUREMENT_GATE.md, what is under test).
// =============================================================================

import { build } from 'esbuild';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { gzipSync } from 'node:zlib';

import { REPO } from './server.mjs';

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

/** The modules the Observatory route loads before anything is opened: its entry and what it imports statically. */
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

async function lazyBuild(entries, eager) {
  const external = {
    name: 'eager',
    setup(b) {
      b.onResolve({ filter: /^\./ }, args => {
        const abs = path.resolve(args.resolveDir, args.path);
        return eager.has(rel(abs)) ? { path: abs, external: true } : null;
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
  const kindEntry = 'tools/image-measure-gate/entries/kind.js';
  const instrumentEntry = 'tools/image-measure-gate/panel.js';
  const both = await lazyBuild(
    { kind: kindEntry, instrument: instrumentEntry },
    eager
  );
  const kind = await lazyBuild({ kind: kindEntry }, eager);
  const instrument = await lazyBuild({ instrument: instrumentEntry }, eager);
  const fits = await lazyBuild(
    { fits: 'tools/image-measure-gate/entries/fits.js' },
    eager
  );
  // The tiers: the source of every closure module that is not already installed on a first visit.
  const prev = process.cwd();
  process.chdir(REPO);
  const { buildManifest, idleGroupOf } =
    await import('../build-service-worker.mjs');
  const manifest = await buildManifest();
  process.chdir(prev);
  const firstVisit = new Set([...manifest.core, ...manifest.optional]);
  const idleNow = new Set(manifest.idle);
  const sources = both.inputs.filter(p => !eager.has(p));
  const fresh = sources.filter(p => !firstVisit.has(p) && !idleNow.has(p));
  const sourceGz = list =>
    list.reduce((a, p) => a + gz(readFileSync(path.join(REPO, p))), 0);
  const toGroup = fresh.filter(p => p.startsWith('js/') && !idleGroupOf(p));
  return {
    eagerModules: eager.size,
    chunks: both.files,
    deferredGzipBytes: both.total,
    deferredGzipKiB: Number((both.total / 1024).toFixed(2)),
    lazyRequestsBuild: both.requests,
    parts: {
      kindAloneGzip: kind.total,
      instrumentAloneGzip: instrument.total,
      kindAloneRequests: kind.requests,
      instrumentAloneRequests: instrument.requests,
    },
    fitsReaderBesideGzip: fits.total,
    treeModules: {
      lazyModuleRequestsInTheTree: sources.length,
      modules: sources,
    },
    tier: {
      closureSourcesNotOnFirstVisit: fresh.length,
      idleSourceGzipBytes: sourceGz(fresh),
      alreadyInstalledOnFirstVisit: sources.filter(p => firstVisit.has(p)),
      alreadyIdle: sources.filter(p => idleNow.has(p)),
      needAnIdleGroup: toGroup,
      firstVisitBytesAdded: 0,
      why: 'no file under js/ imports any of them and tools/ is in no precache tree; a production prompt adds one IDLE_TIER group "image measurement" for the files listed in needAnIdleGroup',
    },
  };
}

if (import.meta.url === `file://${process.argv[1]}`)
  console.log(JSON.stringify(await measureBytes(), null, 1));
