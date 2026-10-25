/* global console, process */
// The kernel alone, minified and gzipped the way build.js counts a chunk (Prompt 199 spike). usage: node kernelbytes.mjs out.json
import { build } from 'esbuild';
import { writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
const external = { name: 'ext', setup: b => b.onResolve({ filter: /radiation\/constants\.js$/ }, a => ({ path: a.path, external: true })) };
const one = async entry => {
  const r = await build({ entryPoints: [entry], bundle: true, minify: true, format: 'esm', target: ['es2022'], charset: 'utf8', legalComments: 'none', write: false, plugins: [external], logLevel: 'silent' });
  const buf = r.outputFiles[0].contents;
  return { raw: buf.length, gzip: gzipSync(buf).length };
};
const out = {
  kernelWithoutEscape: await one('js/kernels/atmospheres/index.js'),
  escapeModule: await one('js/kernels/atmospheres/escape.js'),
};
writeFileSync(process.argv[2], JSON.stringify(out, null, 2));
console.log(JSON.stringify(out));
