// SPIKE (Prompt 87). T7.1: what the prototype's JavaScript costs as tools/route-budget.mjs counts
// it: sources = the raw bytes and the request count of every module the page imports; build = one
// minified bundle. Also gzip, and the planet and star options (the DE441 pack module, the series).
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const seen = new Map();
function walk(f) {
  if (seen.has(f)) return;
  const src = fs.readFileSync(f, 'utf8');
  seen.set(f, src.length);
  for (const m of src.matchAll(/(?:from|import)\s*\(?\s*['"](\.[^'"]+)['"]/g)) walk(path.resolve(path.dirname(f), m[1]));
}
walk(path.join(HERE, 'render.js'));
const files = [...seen].map(([f, n]) => ({ file: path.relative(ROOT, f), bytes: n }));
const rawKb = files.reduce((s, f) => s + f.bytes, 0) / 1024;
const out = await esbuild.build({ entryPoints: [path.join(HERE, 'render.js')], bundle: true, minify: true, format: 'esm', write: false, target: 'es2020' });
const code = out.outputFiles[0].contents;
const res = {
  sources: { requests: files.length + 0, kb: +rawKb.toFixed(1), files },
  build: { requests: 1, kb: +(code.length / 1024).toFixed(1), gzipKb: +(zlib.gzipSync(code, { level: 9 }).length / 1024).toFixed(1) },
};
// pieces: what the sky kernel alone costs if observingWindow.js were reduced to what is used
const piece = async (entry, label) => { const o = await esbuild.build({ entryPoints: [entry], bundle: true, minify: true, format: 'esm', write: false, target: 'es2020' }); return [label, +(o.outputFiles[0].contents.length / 1024).toFixed(2), +(zlib.gzipSync(o.outputFiles[0].contents, { level: 9 }).length / 1024).toFixed(2)]; };
res.pieces = [];
for (const [f, l] of [['lib/planets.js', 'planets series'], ['lib/time.js', 'time kernel (delta-T table, nutation, GAST, precession)'], ['lib/coords.js', 'coordinates + refraction'], ['lib/fastframe.js', 'matrix frame'], ['lib/solar.js', 'Sun/Moon (includes js/observingWindow.js lunar series)'], ['../../js/observingWindow.js', 'js/observingWindow.js alone']]) res.pieces.push(await piece(path.join(HERE, f), l));
const pack = fs.readFileSync(path.join(ROOT, 'js/data/ephemeris/solarSystem2025.js'));
res.pack = { rawKb: +(pack.length / 1024).toFixed(1), gzipKb: +(zlib.gzipSync(pack, { level: 9 }).length / 1024).toFixed(1) };
console.log(JSON.stringify(res, null, 1));
