// Writes runner.html: runner.src.js inline, allowed by its hash, under a
// policy that lets it load nothing but the pinned Pyodide release.
// `node build-runner.mjs [variant]`: 'default', 'no-wasm-eval', 'unsafe-eval'.
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const here = new URL('.', import.meta.url);
const variant = process.argv[2] || 'default';
const worker = variant.includes('worker');
let src = readFileSync(
  new URL(worker ? 'runner-worker.src.js' : 'runner.src.js', here),
  'utf8'
);
if (worker)
  src = src.replace(
    '__WORKER_SOURCE__',
    JSON.stringify(readFileSync(new URL('runner.worker.js', here), 'utf8'))
  );
const hash = createHash('sha256').update(src).digest('base64');
const script = [`'sha256-${hash}'`, 'https://cdn.jsdelivr.net'];
if (!variant.includes('no-wasm-eval')) script.push("'wasm-unsafe-eval'");
if (variant.includes('unsafe-eval')) script.push("'unsafe-eval'");
const csp = [
  "default-src 'none'",
  `script-src ${script.join(' ')}`,
  'connect-src https://cdn.jsdelivr.net',
  ...(worker ? ['worker-src blob:'] : []),
  "base-uri 'none'",
  "form-action 'none'",
].join('; ');
const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="${csp}">
<title>Notebook runner</title></head><body>
<script type="module">${src}</script>
</body></html>
`;
const name = variant === 'default' ? 'runner.html' : `runner-${variant}.html`;
writeFileSync(new URL(name, here), html);
console.log(name, csp);
