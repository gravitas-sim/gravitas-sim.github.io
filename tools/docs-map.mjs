// =============================================================================
// DOCUMENTS.md, the map of every root document, from a committed table
// -----------------------------------------------------------------------------
//   node tools/docs-map.mjs           write DOCUMENTS.md and MAINTAINER_ONBOARDING.md's block
//   node tools/docs-map.mjs --check   fail if the table, the tree or the map disagree
//
// tools/docs-map.json holds one row per root Markdown document: its purpose,
// kind, the prompt that keeps it current, and whether student-facing text
// depends on it. What can be known from the tree is derived and held against
// the table, so the table cannot drift:
//   - every root *.md is a row and every row is a file;
//   - a document that carries generated regions says so, and names the
//     generator from tools/generate-graph.mjs;
//   - "student" is true when a site page or a string catalogue refers to it;
//   - a document added after Prompt 128 names an owner prompt and a purpose of
//     some substance, and every row says the date it was added;
//   - docs/archive/ holds what the code no longer matches, each file listed in
//     the table's "archive" array with the date and what superseded it, and
//     headed with the same date (Prompt 289).
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
const ONBOARDING = 'MAINTAINER_ONBOARDING.md';
const ARCHIVE_DIR = 'docs/archive';
/** Prompt 128 built the map: a document added after it must name its owner. */
export const MAP_BUILT = '2026-10-17';
const MIN_PURPOSE = 35;
const BEGIN =
  '<!-- docs-map:begin (written by node tools/docs-map.mjs; do not edit) -->';
const END = '<!-- docs-map:end -->';
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
  'dynamics-runs':
    'deterministic, but about ten minutes of the engine: regenerated only when the engine or its inputs changed (its check is the staleness of the inputs)',
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

/** What one row must say on its own, whatever the tree holds. */
export function rowProblems(r) {
  const out = [];
  if (!r.purpose || r.purpose.length < MIN_PURPOSE)
    out.push(`${r.file}: the purpose is under ${MIN_PURPOSE} characters`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(r.added || ''))
    out.push(`${r.file}: no "added" date (YYYY-MM-DD)`);
  else if (r.added > MAP_BUILT && !Number.isInteger(r.owner))
    out.push(
      `${r.file}: added ${r.added}, after the map, and names no owner prompt`
    );
  return out;
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
    out.push(...rowProblems(r));
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
  out.push(...archiveProblems(root, table));
  return out;
}

/** The archive list against docs/archive/: both ways, and each file's header. */
export function archiveProblems(root = REPO, table = readTable(root)) {
  const out = [];
  const list = table.archive || [];
  const dir = path.join(root, ARCHIVE_DIR);
  const there = existsSync(dir)
    ? readdirSync(dir).filter(f => f.endsWith('.md'))
    : [];
  const named = new Set(list.map(a => a.file));
  for (const f of there)
    if (!named.has(f))
      out.push(`${ARCHIVE_DIR}/${f} is not in the archive list`);
  const rootFiles = new Set(rootDocs(root));
  for (const a of list) {
    if (!there.includes(a.file)) {
      out.push(
        `the archive list names ${a.file}, which is not in ${ARCHIVE_DIR}/`
      );
      continue;
    }
    if (rootFiles.has(a.file))
      out.push(`${a.file} is both at the root and in the archive`);
    for (const k of ['archived', 'supersededBy', 'reason'])
      if (!a[k] || String(a[k]).length < 10)
        out.push(`${a.file}: archive entry has no ${k}`);
    if (!Number.isInteger(a.prompt))
      out.push(`${a.file}: archive entry names no prompt`);
    const head = readFileSync(path.join(dir, a.file), 'utf8')
      .split('\n')
      .slice(0, 8)
      .join('\n');
    const m = /Archived (\d{4}-\d{2}-\d{2})/.exec(head);
    if (!m) out.push(`${a.file}: no "Archived <date>" header`);
    else if (m[1] !== a.archived)
      out.push(`${a.file}: header says ${m[1]}, the list says ${a.archived}`);
  }
  return out;
}

const kindCounts = rows => {
  const n = {};
  for (const r of rows) n[r.kind] = (n[r.kind] || 0) + 1;
  return KINDS.filter(k => n[k])
    .map(k => `${n[k]} ${k}`)
    .join(', ');
};

/** The block MAINTAINER_ONBOARDING.md carries: counts and the archive. */
export function onboardingBlock(root = REPO) {
  const table = readTable(root);
  const rows = table.documents;
  const arch = table.archive || [];
  return [
    BEGIN,
    `${rows.length} root documents (${kindCounts(rows)}) and ${arch.length} archived.`,
    'A document the code no longer matches is moved to `docs/archive/`, never',
    'deleted, with a header naming the date and what superseded it:',
    '',
    ...arch.map(
      a =>
        `- [\`${a.file}\`](docs/archive/${a.file}), archived ${a.archived} (P${a.prompt}); superseded by ${a.supersededBy}.`
    ),
    END,
  ].join('\n');
}

const BLOCK = new RegExp(
  `${BEGIN.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\S]*?${END}`
);

/** MAINTAINER_ONBOARDING.md as it should be, or null if it has no block. */
export function onboardingText(root = REPO) {
  const text = readFileSync(path.join(root, ONBOARDING), 'utf8');
  if (!BLOCK.test(text)) return null;
  return text.replace(BLOCK, () => onboardingBlock(root));
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
    `${rows.length} root documents and ${(readTable(root).archive || []).length} archived. "Added" is the date the file first entered the history; a document added after Prompt 128 must name its owner prompt. "Regions" means a hand-written file with`,
    'generated regions inside it; "student" means a site page or a string',
    'catalogue refers to it, so a change to it can reach a student.',
    '',
    '| Document | Purpose | Kind | Owner prompt | Added | Written or generated | Student |',
    '| --- | --- | --- | --- | --- | --- | --- |',
    ...rows.map(
      r =>
        `| [${r.file}](${r.file}) | ${r.purpose.replace(/\|/g, '\\|')} | ${r.kind} | ${owner(r)} | ${r.added} | ${hand(r.file)} | ${r.student ? 'yes' : 'no'} |`
    ),
    '',
    '## Archived documents',
    '',
    'Moved, never deleted: each file in `docs/archive/` keeps its text under a header',
    'naming the date and what superseded it. A gate document stays at the root while',
    'a register row cites it.',
    '',
    '| Document | Archived | Prompt | Superseded by | Why |',
    '| --- | --- | --- | --- | --- |',
    ...(readTable(root).archive || []).map(
      a =>
        `| [${a.file}](docs/archive/${a.file}) | ${a.archived} | P${a.prompt} | ${a.supersededBy.replace(/\|/g, '\\|')} | ${a.reason.replace(/\|/g, '\\|')} |`
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
    const ob = onboardingText();
    if (ob === null) p.push(`${ONBOARDING} has no docs-map block`);
    else if (ob !== readFileSync(path.join(REPO, ONBOARDING), 'utf8'))
      p.push(`${ONBOARDING} is stale; run node tools/docs-map.mjs`);
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
    const ob = onboardingText();
    if (ob === null) {
      console.error(`${ONBOARDING} has no docs-map block.`);
      process.exit(1);
    }
    writeFileSync(path.join(REPO, ONBOARDING), ob);
    console.log(`Wrote ${OUT} and the block in ${ONBOARDING}.`);
  }
}
