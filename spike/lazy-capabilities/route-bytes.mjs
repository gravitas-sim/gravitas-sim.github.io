#!/usr/bin/env node
// =============================================================================
// Spike: what each route pulls in, read off esbuild's own graph
// -----------------------------------------------------------------------------
// Disposable measurement for LAZY_CAPABILITIES_GATE.md. Builds the application
// bundle exactly as build.js does (same entry, splitting, minification), in
// memory, and walks the metafile:
//
//   startup      the entry plus everything reachable by static import
//   engine       what `import('./investigations.js')` adds on top of startup -
//                the lesson engine, and with it js/widgets.js and every
//                instrument family it statically imports
//   families     each *Widgets.js module's minified bytes and the chunk it is in
//   lessons      what each lesson's own data module adds on top of the engine
//
// Static only: this says what esbuild would make a browser fetch for a route,
// not how long it takes. The browser half of the measurement is
// spike/lazy-capabilities/route-probe.mjs.
//
//   node spike/lazy-capabilities/route-bytes.mjs [--json]
// =============================================================================

import * as esbuild from 'esbuild';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..'
);
process.chdir(ROOT);

const { metafile } = await esbuild.build({
  entryPoints: [{ in: 'js/main.js', out: 'app' }],
  bundle: true,
  minify: true,
  keepNames: true,
  format: 'esm',
  target: ['es2022'],
  outdir: 'dist-spike/js',
  splitting: true,
  chunkNames: 'chunk-[hash]',
  metafile: true,
  write: false,
  legalComments: 'none',
});

const outputs = Object.fromEntries(
  Object.entries(metafile.outputs).filter(([f]) => f.endsWith('.js'))
);
const bytes = f => outputs[f].bytes;

/** Every output reachable from `start` through static imports, `start` included. */
function staticClosure(start) {
  const seen = new Set();
  const walk = f => {
    if (seen.has(f) || !outputs[f]) return;
    seen.add(f);
    for (const imp of outputs[f].imports) {
      if (imp.kind === 'import-statement') walk(imp.path);
    }
  };
  walk(start);
  return seen;
}
const sum = set => [...set].reduce((n, f) => n + bytes(f), 0);
const minus = (a, b) => new Set([...a].filter(x => !b.has(x)));

/** The output chunk that is the dynamic-import target for a source module. */
const chunkFor = input =>
  Object.keys(outputs).find(f => outputs[f].entryPoint === input) || null;
/** The output chunk that contains a source module, whichever that is. */
const holderOf = input =>
  Object.keys(outputs).find(f => outputs[f].inputs[input]) || null;

const entry = Object.keys(outputs).find(f => f.endsWith('/app.js'));
const startup = staticClosure(entry);

const engineChunk = chunkFor('js/investigations.js');
const engine = minus(staticClosure(engineChunk), startup);

// Every instrument family js/widgets.js imports, and where esbuild put it.
const families = Object.keys(metafile.inputs)
  .filter(i => /^js\/[A-Za-z]+Widgets\.js$/.test(i))
  .map(input => {
    const holder = holderOf(input);
    return {
      module: input,
      bytes: holder ? outputs[holder].inputs[input].bytesInOutput : 0,
      chunk: holder ? path.basename(holder) : null,
      inStartup: holder ? startup.has(holder) : false,
      inEngine: holder ? engine.has(holder) : false,
    };
  })
  .sort((a, b) => b.bytes - a.bytes);

// Each lesson's own data module, on top of startup and the engine.
const { MANIFEST } = await import(
  path.join(ROOT, 'js/data/investigations/manifest.js')
);
const loaded = new Set([...startup, ...engine]);
const lessons = MANIFEST.map(l => {
  const input = `js/data/investigations/${l.id}.js`;
  const chunk = chunkFor(input);
  const extra = chunk ? minus(staticClosure(chunk), loaded) : new Set();
  return { id: l.id, steps: l.stepCount, ownBytes: sum(extra) };
});

const kb = n => Math.round(n / 102.4) / 10;
const report = {
  startup: { files: startup.size, kb: kb(sum(startup)) },
  engine: { files: engine.size, kb: kb(sum(engine)) },
  familiesKb: kb(families.reduce((n, f) => n + f.bytes, 0)),
  families: families.map(f => ({ ...f, kb: kb(f.bytes) })),
  lessons: lessons.map(l => ({ ...l, kb: kb(l.ownBytes) })),
  totalJsKb: kb(Object.keys(outputs).reduce((n, f) => n + bytes(f), 0)),
};

if (process.argv.includes('--json')) {
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
} else {
  console.log(
    `startup            ${report.startup.kb} KB in ${report.startup.files} files`
  );
  console.log(
    `lesson engine adds ${report.engine.kb} KB in ${report.engine.files} files`
  );
  console.log(
    `  of which the ${families.length} instrument families: ${report.familiesKb} KB`
  );
  for (const f of report.families) {
    console.log(
      `    ${f.module.padEnd(34)} ${String(f.kb).padStart(7)} KB  ${f.inStartup ? 'STARTUP' : f.inEngine ? 'engine' : 'lazy'}  ${f.chunk}`
    );
  }
  console.log('each lesson adds, on top of the engine:');
  for (const l of report.lessons)
    console.log(`    ${l.id.padEnd(34)} ${String(l.kb).padStart(7)} KB`);
  console.log(`all JavaScript     ${report.totalJsKb} KB`);
}
