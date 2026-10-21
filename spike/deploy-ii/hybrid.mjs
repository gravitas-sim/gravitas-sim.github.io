// Spike (Prompt 158): the hybrid. Bundles js/engine/*.js (everything the engine
// imports from outside the folder stays external, so shared modules are not
// duplicated) into js/engine/bundle.js and points js/physics.js at it. Applied to
// the working tree for the measurement and reverted with git; never committed.
// node spike/deploy-ii/hybrid.mjs apply [--minify] | revert
import { readdirSync, readFileSync, writeFileSync, rmSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const [mode, flag] = process.argv.slice(2);
const bundle = path.join(REPO, 'js/engine/bundle.js');
const generate = async min => {
  const mods = readdirSync(path.join(REPO, 'js/engine')).filter(f => f.endsWith('.js') && f !== 'bundle.js');
  const r = await build({
    stdin: { contents: mods.map(m => `export * from './${m}';`).join('\n'), resolveDir: path.join(REPO, 'js/engine'), sourcefile: 'entry.js' },
    bundle: true, format: 'esm', target: ['es2022'], plugins: [{ name: 'outside', setup(b) { b.onResolve({ filter: /^\.\.\// }, a => (a.importer.includes('/js/engine/') || a.importer === '' ? { path: a.path, external: true } : null)); } }], minify: min,
    legalComments: 'none', write: false, logLevel: 'warning',
  });
  return { text: r.outputFiles[0].text, n: mods.length };
};
if (mode === 'check') {
  const { text } = await generate(true);
  const same = readFileSync(bundle, 'utf8') === text;
  console.log(same ? 'engine bundle is current' : 'engine bundle is STALE');
  process.exit(same ? 0 : 1);
} else if (mode === 'revert') {
  rmSync(bundle, { force: true });
  execFileSync('git', ['-C', REPO, 'checkout', '--', 'js/physics.js']);
  console.log('reverted');
} else {
  const mods = readdirSync(path.join(REPO, 'js/engine')).filter(f => f.endsWith('.js') && f !== 'bundle.js');
  const r = await build({
    stdin: { contents: mods.map(m => `export * from './${m}';`).join('\n'), resolveDir: path.join(REPO, 'js/engine'), sourcefile: 'entry.js' },
    bundle: true, format: 'esm', target: ['es2022'], plugins: [{ name: 'outside', setup(b) { b.onResolve({ filter: /^\.\.\// }, a => (a.importer.includes('/js/engine/') || a.importer === '' ? { path: a.path, external: true } : null)); } }], minify: flag === '--minify',
    legalComments: 'none', write: false, logLevel: 'warning',
  });
  writeFileSync(bundle, r.outputFiles[0].text);
  const p = path.join(REPO, 'js/physics.js');
  const src = readFileSync(p, 'utf8');
  writeFileSync(p, src.replace(/from '\.\/engine\/(?!bundle)[A-Za-z]+\.js'/g, "from './engine/bundle.js'"));
  console.log('applied', mods.length, 'modules,', statSync(bundle).size, 'bytes');
}
