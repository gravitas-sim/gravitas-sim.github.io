#!/usr/bin/env node
// =============================================================================
// The compute page's generated files: the frame, its pin, the catalogue's hashes
// -----------------------------------------------------------------------------
//   node tools/compute.mjs           write what is stale
//   node tools/compute.mjs --check   fail when a generated file is not what this writes
//
// Roadmap II Prompt 101 (COMPUTE.md). Three things are made here, and nothing
// else writes them:
//
//   compute-frame/            the sandboxed frame's static files, built from
//                             js/compute/frame/ and published VERBATIM to the
//                             repository gravitas-compute/gravitas-compute.github.io
//                             (D-COMPUTE-ORIGIN-01): index.html with its script
//                             inline and hashed into its Content-Security-Policy,
//                             manifest.json with every hash, a README, LICENSE,
//                             robots.txt and .nojekyll
//   js/compute/framePin.js    the SHA-256 of that index.html and the build id the
//                             frame reports, which the page checks before it
//                             frames anything
//   js/compute/catalogueHashes.js
//                             the SHA-256 of each reviewed notebook's cells and
//                             file, and of each example input
//
// The frame builds the same bytes on any machine with the repository's pinned
// esbuild (tests/computeFrame.test.js rebuilds it and compares).
// `--publish-plan` prints what would be published and the ready-to-run steps.
// =============================================================================

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSync } from 'esbuild';

import { CATALOGUE_DATA } from '../js/compute/catalogueData.js';
import { FRAME_ORIGIN, PARENT_ORIGINS } from '../js/compute/origin.js';
import { RUNTIME } from '../js/compute/runtime.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rel = p => path.join(ROOT, p);
const sha256 = data => createHash('sha256').update(data).digest('hex');
const b64 = data => createHash('sha256').update(data).digest('base64');

export const FRAME_DIR = 'compute-frame';
export const PIN_FILE = 'js/compute/framePin.js';
export const HASHES_FILE = 'js/compute/catalogueHashes.js';

const ZEROS = '0'.repeat(64);

/** The frame's CSP: scripts by hash and the runtime's CDN, nothing else. */
export const frameCsp = scriptHash =>
  [
    `default-src 'none'`,
    `script-src 'sha256-${scriptHash}' https://cdn.jsdelivr.net 'wasm-unsafe-eval'`,
    `connect-src https://cdn.jsdelivr.net`,
    `worker-src blob:`,
    `base-uri 'none'`,
    `form-action 'none'`,
  ].join('; ');

function bundle(entry, define) {
  const out = buildSync({
    entryPoints: [rel(entry)],
    bundle: true,
    write: false,
    format: 'iife',
    target: 'es2022',
    minify: false,
    legalComments: 'none',
    define,
    logLevel: 'silent',
  });
  return out.outputFiles[0].text;
}

const README = `# Gravitas compute frame

This repository is published verbatim from the Gravitas application repository
(gravitas-sim/gravitas-sim.github.io, directory \`compute-frame/\`). Do not edit
it here: \`node tools/compute.mjs\` in that repository writes every file, and a
test there fails if they differ.

It serves one page, \`index.html\`, at ${FRAME_ORIGIN}/. The compute page of
Gravitas (https://gravitas-sim.online/compute/) frames it with
\`sandbox="allow-scripts"\`, so the page has an opaque origin: no storage, no
cookies, no access to Gravitas. It runs reviewed Python notebooks in Pyodide
${RUNTIME.version} inside a Worker, on the inputs Gravitas sends it over a
MessagePort, and returns what the notebook returns. It collects nothing and
sends nothing anywhere: it fetches the pinned Pyodide release from
cdn.jsdelivr.net and nothing else.

- \`index.html\`: the frame, with its script inline and hashed into its
  Content-Security-Policy.
- \`manifest.json\`: the SHA-256 of the page and its script, the policy, the
  runtime pin, and the pages it answers.
- \`LICENSE\`: MIT, as Gravitas.

What is and is not pinned is in COMPUTE.md in the application repository.
`;

/**
 * Every file of the frame, as it should be published.
 * @returns {{files: Map<string, string>, indexSha256: string, build: string,
 *   scriptSha256: string, csp: string}}
 */
export function buildFrame() {
  const worker = bundle('js/compute/frame/worker.js', {
    __PIN__: JSON.stringify({
      base: RUNTIME.base,
      version: RUNTIME.version,
      lockSha256: RUNTIME.lockSha256,
    }),
  });
  const draft = bundle('js/compute/frame/runner.js', {
    __BUILD__: JSON.stringify(ZEROS),
    __WORKER_SOURCE__: JSON.stringify(worker),
  });
  const build = sha256(draft);
  const script = draft.replaceAll(`"${ZEROS}"`, `"${build}"`);
  if (script.includes('</script')) throw new Error('the frame script contains </script');
  const scriptSha256 = b64(script);
  const csp = frameCsp(scriptSha256);
  const index = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta http-equiv="Content-Security-Policy" content="${csp}" />
    <title>Gravitas compute frame</title>
  </head>
  <body>
    <p>
      This page runs reviewed notebooks for the Gravitas compute page. It has no
      controls and keeps nothing.
    </p>
    <script>${script}</script>
  </body>
</html>
`;
  const indexSha256 = sha256(index);
  const manifest = {
    note: 'Written by tools/compute.mjs in the Gravitas application repository. Do not edit.',
    origin: FRAME_ORIGIN,
    build,
    indexSha256,
    scriptSha256Base64: scriptSha256,
    csp,
    answers: PARENT_ORIGINS,
    runtime: {
      name: RUNTIME.name,
      version: RUNTIME.version,
      python: RUNTIME.python,
      base: RUNTIME.base,
      lockSha256: RUNTIME.lockSha256,
      packages: RUNTIME.packages,
    },
  };
  const files = new Map([
    ['index.html', index],
    ['manifest.json', `${JSON.stringify(manifest, null, 2)}\n`],
    ['README.md', README],
    ['LICENSE', readFileSync(rel('LICENSE'), 'utf8')],
    ['robots.txt', 'User-agent: *\nDisallow: /\n'],
    ['.nojekyll', ''],
  ]);
  return { files, indexSha256, build, scriptSha256, csp };
}

/** js/compute/framePin.js: what the page checks the frame against. */
export const pinSource = ({ indexSha256, build }) => `// =============================================================================
// The frame the compute page will frame
// -----------------------------------------------------------------------------
// Generated by tools/compute.mjs. Do not edit. The page fetches the frame's
// document from the compute origin and frames it only if its SHA-256 is this;
// the frame reports its own build id in its first message and the page
// refuses one that differs. tests/computeFrame.test.js holds both to
// compute-frame/, which is what is published to that origin.
// =============================================================================

export const FRAME_PIN = Object.freeze({
  indexSha256: '${indexSha256}',
  build: '${build}',
});
`;

/** The hashes of every notebook and example input in the catalogue. */
export function catalogueHashes() {
  const out = {};
  for (const e of CATALOGUE_DATA) {
    const file = readFileSync(rel(e.notebook));
    const nb = JSON.parse(file.toString('utf8'));
    const cells = nb.cells
      .filter(c => c.cell_type === 'code')
      .map(c => [].concat(c.source ?? []).join(''));
    const example = readFileSync(rel(e.input.example.path));
    out[e.id] = {
      cellsSha256: sha256(JSON.stringify(cells)),
      fileSha256: sha256(file),
      cells: cells.length,
      example: { sha256: sha256(example), bytes: example.length },
    };
  }
  return out;
}

export const hashesSource = hashes => `// =============================================================================
// The hashes of the reviewed notebooks and their example inputs
// -----------------------------------------------------------------------------
// Generated by tools/compute.mjs from compute/notebooks/ and compute/inputs/.
// Do not edit. A notebook whose cells do not hash to cellsSha256 is refused by
// the compute page; tests/computeCatalogue.test.js holds these to the files.
// =============================================================================

export const HASHES = Object.freeze(${JSON.stringify(hashes, null, 2)});
`;

/** Every generated file: path (repository-relative) to its text. */
export function generated() {
  const frame = buildFrame();
  const out = new Map();
  for (const [name, text] of frame.files) out.set(`${FRAME_DIR}/${name}`, text);
  out.set(PIN_FILE, pinSource(frame));
  out.set(HASHES_FILE, hashesSource(catalogueHashes()));
  return out;
}

/** Prettier's form, which the repository's format check holds .js files to. */
async function formatted(file, text) {
  if (!file.endsWith('.js')) return text;
  const prettier = await import('prettier');
  const options = (await prettier.resolveConfig(rel(file))) ?? {};
  return prettier.format(text, { ...options, filepath: rel(file) });
}

/**
 * The files that are not what this writes.
 * @returns {Promise<string[]>}
 */
export async function stale(write = false) {
  const bad = [];
  for (const [file, text] of generated()) {
    const want = await formatted(file, text);
    const have = existsSync(rel(file)) ? readFileSync(rel(file), 'utf8') : null;
    if (have === want) continue;
    bad.push(file);
    if (write) {
      mkdirSync(path.dirname(rel(file)), { recursive: true });
      writeFileSync(rel(file), want);
    }
  }
  return bad;
}

/** What gets published, and the steps. Prints; touches nothing. */
export function publishPlan() {
  const { files, indexSha256 } = buildFrame();
  const lines = [
    `The frame is built in ${FRAME_DIR}/ and is published verbatim to`,
    `  https://github.com/gravitas-compute/gravitas-compute.github.io  ->  ${FRAME_ORIGIN}/`,
    '',
    'Files that will be published:',
    ...[...files].map(([n, t]) => `  ${n.padEnd(14)} ${String(Buffer.byteLength(t)).padStart(7)} bytes  sha256 ${sha256(t).slice(0, 16)}...`),
    '',
    `index.html sha256: ${indexSha256}`,
    '',
    'Nothing here pushes, enables Pages, or changes that repository. Steps for Carl:',
    '  1. git clone https://github.com/gravitas-compute/gravitas-compute.github.io /tmp/gravitas-compute-site',
    `  2. rsync -a --delete --exclude .git ${FRAME_DIR}/ /tmp/gravitas-compute-site/   # from this repository's root, on this branch`,
    '  3. cd /tmp/gravitas-compute-site && git add -A && git commit -m "Publish the compute frame" && git push origin HEAD:main',
    '  4. In that repository: Settings, Pages, Source "Deploy from a branch", branch main, folder / (root). Pages for a user or organization site is served at the URL above.',
    `  5. curl -s ${FRAME_ORIGIN}/index.html | shasum -a 256   # must print the index.html sha256 above`,
    '  6. Run the online check: COMPUTE_ONLINE=1 npx playwright test e2e/computeOnline.spec.js --project=chromium',
  ];
  return lines.join('\n');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.includes('--publish-plan')) {
    console.log(publishPlan());
  } else {
    const check = process.argv.includes('--check');
    const bad = await stale(!check);
    if (check && bad.length) {
      console.error(`${bad.join('\n')}\nThese compute files are stale. Run node tools/compute.mjs`);
      process.exit(1);
    }
    console.log(check ? 'The compute files are current.' : bad.length ? `Wrote ${bad.length} compute files.` : 'The compute files were current.');
  }
}
