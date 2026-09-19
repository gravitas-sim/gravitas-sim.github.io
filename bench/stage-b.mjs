// MEASUREMENT HARNESS ONLY. Not the deploy path, not a proposal for one.
// Stages the built tree as a functionally equivalent site so it can be served
// beside the real staged tree and compared. Deliberately does NOT touch
// tools/prepare-pages.mjs.
import { cpSync, existsSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import path from 'node:path';

const repo = process.argv[2];
const out = path.join(repo, '_siteB');
rmSync(out, { recursive: true, force: true });
cpSync(path.join(repo, 'dist'), out, { recursive: true });

// The four pages the real deploy stamps, stamped the same way, so provenance
// is not a difference between the candidates.
const commit = process.argv[3];
const PAGES = ['index.html', 'model/index.html', 'instructors/index.html', 'teaching/index.html'];
let stamped = 0;
for (const rel of PAGES) {
  const f = path.join(out, rel);
  if (!existsSync(f)) { console.log('  missing in dist:', rel); continue; }
  let html = readFileSync(f, 'utf8');
  if (/name="gravitas-revision"/.test(html)) {
    html = html.replace(/(name="gravitas-revision" content=")[^"]*(")/, `$1${commit}$2`);
  } else {
    html = html.replace('</head>', `  <meta name="gravitas-revision" content="${commit}" />\n</head>`);
  }
  writeFileSync(f, html);
  stamped++;
}
writeFileSync(path.join(out, 'deployed-revision.json'),
  JSON.stringify({ commit, harness: 'measurement only' }, null, 2));
console.log(`candidate B staged at ${out}; stamped ${stamped}/${PAGES.length} pages`);
