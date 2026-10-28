/* global console, process */
// The new kernel files alone, minified and gzipped the way build.js counts a chunk. usage: node kernelbytes.mjs out.json
import { build } from 'esbuild';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { tmpdir } from 'node:os';
import path from 'node:path';
const ext = { name: 'ext', setup: b => b.onResolve({ filter: /(radiation\/constants|\/constants)\.js$/ }, a => ({ path: a.path, external: true })) };
const dir = path.resolve('js/kernels/atmospheres');
const one = async files => {
  const tmp = mkdtempSync(path.join(tmpdir(), 'kb-'));
  const entry = path.join(tmp, 'entry.js');
  writeFileSync(entry, files.map(f => `export * from '${path.join(dir, f)}';`).join('\n'));
  const r = await build({ entryPoints: [entry], bundle: true, minify: true, format: 'esm', target: ['es2022'], charset: 'utf8', legalComments: 'none', write: false, plugins: [ext], logLevel: 'silent' });
  const buf = r.outputFiles[0].contents;
  return { raw: buf.length, gzip: gzipSync(buf).length };
};
const out = {
  kernelEp: await one(['quadrature.js', 'emission.js', 'phase.js']),
  kernelWhole: await one(['quadrature.js', 'emission.js', 'phase.js', 'transmission.js', 'bands.js']),
};
writeFileSync(process.argv[2], JSON.stringify(out, null, 2));
console.log(JSON.stringify(out));
