#!/usr/bin/env node
// =============================================================================
// What is in the bundle, module by module
// -----------------------------------------------------------------------------
//   npm run budget:composition            print the table
//   npm run budget:composition -- --write record it
//   npm run budget:composition -- --check fail if a module grew unexplained
//
// The budget tool answers "is the total under the line". It cannot answer "what
// put it there", and the two are different questions: a start-up download that
// creeps up a kilobyte per pass is a series of individually reasonable changes
// nobody can point at afterwards. This records the eager cost of every module
// so a growth has an author.
//
// Eager means reachable from js/main.js by static import. A dynamic import is
// deferred by construction - that is what splitting is for - and does not
// appear here.
// =============================================================================

import { readFile, writeFile } from 'node:fs/promises';
import { resolve, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const RECORD = resolve(ROOT, 'docs/bundle-composition.json');

/** How much every module costs in the eager graph, in bytes. */
export async function composition() {
  const built = await esbuild.build({
    entryPoints: [{ in: 'js/main.js', out: 'app' }],
    absWorkingDir: ROOT,
    bundle: true,
    format: 'esm',
    splitting: true,
    write: false,
    outdir: 'dist-composition',
    metafile: true,
    minify: true,
    logLevel: 'silent',
  });
  const outputs = built.metafile.outputs;

  // The entry chunk plus everything it statically imports, transitively. A
  // chunk reached only by a dynamic import is deferred and is not counted.
  const entry = Object.keys(outputs).find(k => k.endsWith('app.js'));
  const eager = new Set([entry]);
  for (let grew = true; grew;) {
    grew = false;
    for (const chunk of [...eager]) {
      for (const imp of outputs[chunk].imports || []) {
        if (imp.kind === 'import-statement' && !eager.has(imp.path)) {
          eager.add(imp.path);
          grew = true;
        }
      }
    }
  }

  const bytes = new Map();
  for (const chunk of eager) {
    for (const [src, info] of Object.entries(outputs[chunk].inputs || {})) {
      bytes.set(src, (bytes.get(src) || 0) + info.bytesInOutput);
    }
  }
  const modules = [...bytes]
    .map(([module, size]) => ({ module, bytes: size }))
    .sort((a, b) => b.bytes - a.bytes);
  return {
    total: modules.reduce((n, m) => n + m.bytes, 0),
    modules,
  };
}

/** How much a module may grow before it needs saying out loud, in bytes. */
const SLACK = 2048;

const args = process.argv.slice(2);
if (import.meta.url === `file://${process.argv[1]}`) {
  const now = await composition();

  if (args.includes('--write')) {
    await writeFile(RECORD, `${JSON.stringify(now, null, 1)}\n`);
    console.log(
      `Recorded ${now.modules.length} eager modules, ` +
        `${(now.total / 1024).toFixed(1)} KB.`
    );
  } else if (args.includes('--check')) {
    const before = JSON.parse(await readFile(RECORD, 'utf8'));
    const was = new Map(before.modules.map(m => [m.module, m.bytes]));
    const grown = now.modules
      .filter(m => m.bytes - (was.get(m.module) || 0) > SLACK)
      .map(m => ({
        module: m.module,
        from: was.get(m.module) || 0,
        to: m.bytes,
      }));
    const appeared = now.modules.filter(
      m => !was.has(m.module) && m.bytes > SLACK
    );
    if (grown.length || appeared.length) {
      console.error('\nThe start-up download grew, module by module:\n');
      for (const g of grown) {
        console.error(
          `  ${g.module}: ${(g.from / 1024).toFixed(1)} -> ` +
            `${(g.to / 1024).toFixed(1)} KB`
        );
      }
      for (const a of appeared) {
        console.error(
          `  ${a.module}: new in the eager graph, ${(a.bytes / 1024).toFixed(1)} KB`
        );
      }
      console.error(
        '\nIf the growth belongs at start-up, record it with\n' +
          '  npm run budget:composition -- --write\n' +
          'in the same commit. If it does not, load it on demand instead.\n'
      );
      process.exit(1);
    }
    console.log(
      `Start-up composition is unchanged within ${SLACK / 1024} KB per module ` +
        `(${now.modules.length} modules, ${(now.total / 1024).toFixed(1)} KB).`
    );
  } else {
    console.log(
      `\nEager modules, largest first ` +
        `(${(now.total / 1024).toFixed(1)} KB across ${now.modules.length}):\n`
    );
    for (const m of now.modules.slice(0, 25)) {
      console.log(
        `${(m.bytes / 1024).toFixed(1).padStart(8)} KB  ${relative(ROOT, m.module)}`
      );
    }
    console.log('');
  }
}
