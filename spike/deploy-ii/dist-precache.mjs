// Spike (Prompt 158): the precache a build would need. Copies a built dist/ to an
// output directory, adds the tree's sw.js and a generated sw-manifest.js over the
// built files, and prints the size. Disposable; never merged. The policy is an
// upper bound: hashed chunks cannot be told apart by their names (no idle tier, no
// Spanish exclusion), which is itself a finding.
// node spike/deploy-ii/dist-precache.mjs <dist> <out> [--stamp]
import { cpSync, readFileSync, writeFileSync, readdirSync, statSync, copyFileSync, rmSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const [src, out] = process.argv.slice(2);
if (!existsSync(src)) throw new Error('no dist');
if (!process.argv.includes('--manifest-only')) {
  rmSync(out, { recursive: true, force: true });
  cpSync(src, out, { recursive: true });
  copyFileSync(path.join(REPO, 'sw.js'), path.join(out, 'sw.js'));
}
const walk = (dir, rel = '') => {
  let r = [];
  for (const e of readdirSync(path.join(out, dir), { withFileTypes: true })) {
    const p = path.posix.join(rel, e.name);
    if (e.isDirectory()) r = r.concat(walk(path.join(dir, e.name), p));
    else r.push(p);
  }
  return r;
};
const all = walk('.');
const core = [];
const optional = [];
for (const p of all) {
  if (p.endsWith('.map') || p === 'sw.js' || p === 'sw-manifest.js') continue;
  if (p === 'index.html' || (p.startsWith('css/') && p.endsWith('.css')) || (p.startsWith('vendor/') && /\.(woff2|js)$/.test(p)) || (p.startsWith('js/') && /\.(js|html)$/.test(p) && !p.startsWith('js/compute'))) core.push('./' + p);
  else if (/^images\/(scenarios|investigations)\/.*\.webp$/.test(p) || /^(observatory|catalog|library|my-work|studio|studio\/lesson|studio\/course|course|3d|mission\/lab|sky)\/index\.html$/.test(p) || p === 'favicon.ico' || p === 'favicon.png') optional.push('./' + p);
}
core.sort(); optional.sort();
const files = [...core, ...optional];
const h = createHash('sha256');
let bytes = 0;
for (const f of files) { const b = readFileSync(path.join(out, f)); h.update(f); h.update(b); bytes += b.length; }
const version = 'gravitas-' + h.digest('hex').slice(0, 12);
writeFileSync(path.join(out, 'sw-manifest.js'),
  `self.__GRAVITAS_CACHE_VERSION = ${JSON.stringify(version)};\nself.__GRAVITAS_PRECACHE_BYTES = ${bytes};\nself.__GRAVITAS_PRECACHE_CORE = ${JSON.stringify(core)};\nself.__GRAVITAS_PRECACHE_OPTIONAL = ${JSON.stringify(optional)};\nself.__GRAVITAS_PRECACHE_IDLE = [];\nself.__GRAVITAS_LOCALE_WARM = {};\nself.__GRAVITAS_PRECACHE = ${JSON.stringify(files)};\n`);
console.log(JSON.stringify({ version, files: files.length, core: core.length, optional: optional.length, bytes }));
