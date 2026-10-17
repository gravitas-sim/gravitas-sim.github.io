// =============================================================================
// DOCUMENTS.md, the map of every root document, from a committed table
// -----------------------------------------------------------------------------
//   node tools/docs-map.mjs           write DOCUMENTS.md
//   node tools/docs-map.mjs --check   fail if the table, the tree or the map disagree
//
// tools/docs-map.json holds one row per root Markdown document: its purpose,
// kind, the prompt that keeps it current, and whether student-facing text
// depends on it. What can be known from the tree is derived and held against
// the table, so the table cannot drift:
//   - every root *.md is a row and every row is a file;
//   - a document that carries generated regions says so, and names the
//     generator from tools/generate-graph.mjs;
//   - "student" is true when a site page or a string catalogue refers to it.
// The second half of the map lists every generated artifact, its generator
// and whether its node is deterministic or depends on a secret.
// =============================================================================

import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GRAPH } from './generate-graph.mjs';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TABLE = 'tools/docs-map.json';
const OUT = 'DOCUMENTS.md';
const KINDS = [
  'front-door',
  'policy',
  'legal',
  'process',
  'guide',
  'design',
  'reference',
  'feature',
  'gate',
  'record',
];
const REGION = /<!--fact:|<!--fact-block:|<!--generated:|<generated:/;

/** Nodes that are not deterministic functions of the tree, and why. */
const NOT_PLAIN = {
  instructors:
    'secret-dependent: the ciphertext needs the passphrase and a fresh salt each build',
  manual: 'deterministic, but needs a LaTeX engine a session may not have',
  'world-golden':
    'deterministic, regenerated only deliberately (it records behaviour)',
};

const rootDocs = root =>
  readdirSync(root)
    .filter(f => f.endsWith('.md'))
    .sort();

/** Files a student can meet: site pages and string catalogues. */
function studentSurface(root) {
  const out = [];
  const walk = (dir, test) => {
    for (const e of readdirSync(path.join(root, dir), {
      withFileTypes: true,
    })) {
      const rel = path.posix.join(dir, e.name);
      if (e.isDirectory()) {
        if (
          !/^(node_modules|dist|worktrees|\.git|tests|e2e|tools)$/.test(e.name)
        )
          walk(rel, test);
      } else if (test(rel)) out.push(rel);
    }
  };
  walk('.', rel => /\.html$/.test(rel) && !/^\.\/(dist)\//.test(rel));
  walk('js/i18n', rel => /\.js$/.test(rel));
  walk('js/data', rel => /\.js$/.test(rel));
  return out.map(f => readFileSync(path.join(root, f), 'utf8'));
}

/** What the tree says about each document. */
export function derive(root = REPO) {
  const surface = studentSurface(root);
  const nodesFor = (file, key) =>
    GRAPH.filter(n => (n[key] || []).includes(file)).map(n => n.id);
  const info = {};
  for (const f of rootDocs(root)) {
    const text = readFileSync(path.join(root, f), 'utf8');
    const whole = nodesFor(f, 'outputs');
    const part = nodesFor(f, 'regions');
    const marked = REGION.test(text);
    const how = whole.length
      ? 'generated'
      : part.length || marked
        ? 'regions'
        : 'written';
    info[f] = {
      how,
      generator:
        how === 'written'
          ? null
          : (whole.length ? whole : part.length ? part : ['docs']).join(', '),
      student: surface.some(s => s.includes(f)),
    };
  }
  return info;
}

export function readTable(root = REPO) {
  return JSON.parse(readFileSync(path.join(root, TABLE), 'utf8'));
}

/** Problems between the table and the tree; empty when they agree. */
export function problems(root = REPO) {
  const table = readTable(root);
  const files = rootDocs(root);
  const rows = table.documents;
  const out = [];
  const listed = new Set(rows.map(r => r.file));
  for (const f of files)
    if (!listed.has(f)) out.push(`${f} is not in ${TABLE}`);
  for (const r of rows) {
    if (!existsSync(path.join(root, r.file)))
      out.push(`${TABLE} lists ${r.file}, which is not in the root`);
    if (!KINDS.includes(r.kind)) out.push(`${r.file}: unknown kind ${r.kind}`);
    if (!r.purpose || r.purpose.length < 10) out.push(`${r.file}: no purpose`);
  }
  const seen = new Set();
  for (const r of rows) {
    if (seen.has(r.file)) out.push(`${r.file} is listed twice`);
    seen.add(r.file);
  }
  const d = derive(root);
  for (const r of rows) {
    const i = d[r.file];
    if (!i) continue;
    if (typeof r.student === 'boolean' && r.student !== i.student)
      out.push(
        `${r.file}: student is ${r.student} in the table and ${i.student} in the tree`
      );
    if (typeof r.student !== 'boolean') out.push(`${r.file}: student not set`);
  }
  return out;
}

export function render(root = REPO) {
  const rows = readTable(root).documents;
  const d = derive(root);
  const owner = r => (r.owner ? `P${r.owner}` : 'unassigned');
  const hand = f =>
    d[f].how === 'written' ? 'written' : `${d[f].how} (${d[f].generator})`;
  const lines = [
    '# Documents',
    '',
    'Generated by `node tools/docs-map.mjs` from `tools/docs-map.json` and the',
    'tree. Do not edit; edit the table. `npm run docs-map:check` holds the table',
    'against the root, and `docs/archive/` holds what the code no longer matches.',
    '',
    `${rows.length} root documents. "Regions" means a hand-written file with`,
    'generated regions inside it; "student" means a site page or a string',
    'catalogue refers to it, so a change to it can reach a student.',
    '',
    '| Document | Purpose | Kind | Owner prompt | Written or generated | Student |',
    '| --- | --- | --- | --- | --- | --- |',
    ...rows.map(
      r =>
        `| [${r.file}](${r.file}) | ${r.purpose.replace(/\|/g, '\\|')} | ${r.kind} | ${owner(r)} | ${hand(r.file)} | ${r.student ? 'yes' : 'no'} |`
    ),
    '',
    '## Authoritative sources',
    '',
    'Every generated artifact, the command that writes it, and whether that node',
    'is a plain function of the tree or depends on something a session does not',
    'have. The list is `tools/generate-graph.mjs`; this table cannot leave a node',
    'out.',
    '',
    '| Node | Generator | Writes | Determinism |',
    '| --- | --- | --- | --- |',
    ...GRAPH.map(n => {
      const writes = [...(n.outputs || []), ...(n.regions || [])];
      const shown = writes.length
        ? writes
            .slice(0, 3)
            .map(w => `\`${w}\``)
            .join(', ') +
          (writes.length > 3 ? `, and ${writes.length - 3} more` : '')
        : 'regions inside other files';
      return `| ${n.id} | ${n.generate ? `\`${n.generate}\`` : 'none (a person runs it)'} | ${shown} | ${NOT_PLAIN[n.id] || 'deterministic'} |`;
    }),
    '',
  ];
  return lines.join('\n');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  if (process.argv.includes('--check')) {
    const p = problems();
    let now = '';
    try {
      now = readFileSync(path.join(REPO, OUT), 'utf8');
    } catch {
      /* missing is stale */
    }
    if (now !== render())
      p.push(`${OUT} is stale; run node tools/docs-map.mjs`);
    if (p.length) {
      console.error(p.join('\n'));
      process.exit(1);
    }
    console.log(`${OUT} is current.`);
  } else if (process.argv.includes('--seed')) {
    // Fill "student" from the tree, once, when a row is added.
    const t = readTable();
    const d = derive();
    for (const r of t.documents) if (d[r.file]) r.student = d[r.file].student;
    writeFileSync(path.join(REPO, TABLE), JSON.stringify(t, null, 2) + '\n');
    console.log('Filled student.');
  } else {
    const p = problems();
    if (p.length) {
      console.error(p.join('\n'));
      process.exit(1);
    }
    writeFileSync(path.join(REPO, OUT), render());
    console.log(`Wrote ${OUT}.`);
  }
}
