// SPIKE (Prompt 18): what the import workflow would add, minified the way
// build.js minifies, in the KiB tools/bundle-budget.mjs counts.
// Run: node spike/vo/measure/bundle.mjs
import { build } from 'esbuild';
import { gzipSync } from 'node:zlib';

const entries = {
  'resolve + discover + VOTable + convert (archive.js)': "export * from './spike/vo/archive.js';",
  'stale-cache policy (cache.js)': "export * from './spike/vo/cache.js';",
  'bounded FITS reader (fitsBounded.js + fits.mjs)': "export * from './spike/vo/fitsBounded.js';",
  'all of it': "export * from './spike/vo/archive.js'; export * from './spike/vo/cache.js'; export * from './spike/vo/fitsBounded.js';",
};
const rows = [];
for (const [name, contents] of Object.entries(entries)) {
  const r = await build({
    stdin: { contents, resolveDir: process.cwd(), loader: 'js' },
    bundle: true,
    minify: true,
    format: 'esm',
    target: 'es2022',
    write: false,
  });
  const bytes = r.outputFiles[0].contents;
  rows.push({ name, KiB: +(bytes.length / 1024).toFixed(2), gzipKiB: +(gzipSync(bytes).length / 1024).toFixed(2) });
}
console.table(rows);
console.log(JSON.stringify(rows));
