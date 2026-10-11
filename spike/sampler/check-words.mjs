// Prototype (spike): THRESHOLDS.md section 6 and section 5's byte cost.
//   node spike/sampler/check-words.mjs
import { writeFileSync, mkdirSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';
import { EN_SAMPLER, ES_SAMPLER } from './words.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const words = t => t.split(/\s+/).filter(Boolean).length;
const sentences = t => t.split(/(?<=[.!?])\s+/).filter(Boolean);
const keys = {
  en: [
    ['profile', 'least-squares', 'chi-square', 'no prior'],
    ['credible', 'prior', 'manifest'],
    ['differ', 'degenerate', 'bounded', 'Gaussian', 'never replaces'],
    ['checks fail', 'no interval'],
  ],
  es: [
    [
      'perfil',
      'mínimos cuadrados',
      'chi-cuadrado',
      'ninguna distribución previa',
    ],
    ['creíble', 'distribución previa', 'manifiesto'],
    ['difieren', 'degenerado', 'acotado', 'gaussiano', 'nunca reemplaza'],
    ['comprobaciones fallan', 'ningún intervalo'],
  ],
};
const text = {};
for (const [lang, w] of [
  ['en', EN_SAMPLER],
  ['es', ES_SAMPLER],
]) {
  const t = w.explain;
  const s = sentences(t);
  text[lang] = {
    words: words(t),
    sentences: s.length,
    meanSentenceWords: words(t) / s.length,
    lengthPass: words(t) <= 110 && words(t) / s.length <= 22,
    claims: keys[lang].map(set => set.every(k => t.includes(k))),
  };
  text[lang].pass = text[lang].lengthPass && text[lang].claims.every(Boolean);
}
// bytes, as the build produces them: minified es2022, gzip
const bundle = async entries => {
  const r = await esbuild.build({
    entryPoints: entries,
    bundle: true,
    minify: true,
    format: 'esm',
    target: ['es2022'],
    write: false,
    charset: 'utf8',
    external: ['../../js/inference/*'],
  });
  const code = Buffer.from(r.outputFiles[0].contents);
  return { min: code.length, gz: gzipSync(code, { level: 9 }).length };
};
const core = await bundle(
  [
    path.join(HERE, 'ensemble.js'),
    path.join(HERE, 'diagnostics.js'),
    path.join(HERE, 'coreAdapter.js'),
  ].length
    ? [path.join(HERE, 'shipped-core.js')]
    : []
);
const full = await bundle([path.join(HERE, 'shipped-all.js')]);
const out = {
  text,
  bytes: {
    core,
    withWordsAndPanel: full,
    coreCeilingGz: 5120,
    fullCeilingGz: 9216,
  },
};
out.bytes.corePass = core.gz <= 5120;
out.bytes.fullPass = full.gz <= 9216;
mkdirSync(path.join(HERE, 'results'), { recursive: true });
writeFileSync(
  path.join(HERE, 'results', 'words-bytes.json'),
  JSON.stringify(out, null, 1)
);
console.log(JSON.stringify(out, null, 1));
