#!/usr/bin/env node
// =============================================================================
// npm run storage:matrix
// -----------------------------------------------------------------------------
// STORAGE.md's ownership matrix and its list of direct writers, and the
// sentence My work says about them, generated from one place.
//
// Three sources, each the authority for what it knows:
//   js/storage/index.js           KEYS and COLLECTIONS: which collection a key
//                                 belongs to, hence what is exported
//   the code                      whether an owner module writes through
//                                 js/storage/local.js (it imports it)
//   tools/storage-ownership.json  what no code can say: a record's owner and
//                                 migration, its export status, its row in the
//                                 compatibility corpus (tests/compat), and for
//                                 each writer still direct, why and what it
//                                 lacks (measured with tools/route-budget.mjs)
//
// tests/storageMatrix.test.js fails when the file misses a key, a writer or a
// corpus row, so a new record or writer cannot be added without a line here.
//
//   npm run storage:matrix              rewrite the three places
//   npm run storage:matrix -- --check   fail when any of them is stale
// =============================================================================

import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = rel => readFileSync(path.join(ROOT, rel), 'utf8');
export const OWNERSHIP = JSON.parse(read('tools/storage-ownership.json'));

export const EXPORT_WORDS = {
  durable: 'durable: in a backup file',
  preference: 'preference: in a backup file only when ticked',
  evictable: 'evictable: regenerated or cached, not in a backup file',
  transient: 'transient: handed from one page to another',
  platform: 'platform: the site’s own state, not exported',
  session: 'session: gone when the tab closes',
};

/** The corpus kinds tests/compat/kinds has a file for. */
export function corpusKinds() {
  return readdirSync(path.join(ROOT, 'tests/compat/kinds'))
    .filter(f => f.endsWith('.mjs') && !f.startsWith('_'))
    .map(f => f.slice(0, -4));
}

/** Whether a module writes through js/storage/local.js (it imports it). */
export const onModule = file =>
  /from '(?:\.\.?\/)+storage\/local\.js'/.test(read(file));

async function storageModule() {
  return import(pathToFileURL(path.join(ROOT, 'js/storage/index.js')).href);
}

export async function matrix() {
  const { KEYS, collectionOf } = await storageModule();
  return OWNERSHIP.records.map(r => {
    const collection = KEYS.find(([p]) => p === r.prefix)?.[1];
    const probe = r.prefix.endsWith('_') ? `${r.prefix}x` : r.prefix;
    return {
      ...r,
      collection: collection ?? null,
      known: KEYS.some(([p]) => p === r.prefix),
      resolves: collectionOf(probe) === (collection ?? null),
      module: onModule(r.owner),
      export:
        r.export ??
        (collection && collection !== 'preferences' ? 'durable' : 'preference'),
    };
  });
}

const esc = s => String(s).replace(/\|/g, '\\|');

export async function tables() {
  const rows = await matrix();
  const records = [
    '| Record | Holds | Collection | Owner | Writes through | Migration | Export | Corpus row (134) |',
    '|---|---|---|---|---|---|---|---|',
    ...rows.map(
      r =>
        `| \`${r.prefix}${r.prefix.endsWith('_') ? '…' : ''}\` | ${esc(r.name)} | ${r.collection ?? '—'} | \`${r.owner}\` | ${r.module ? '`js/storage/local.js`' : 'direct'} | ${esc(r.migration)} | ${esc(EXPORT_WORDS[r.export] ?? r.export)} | ${r.corpus ? `\`${r.corpus}\`` : esc(r.corpusWhy)} |`
    ),
    ...OWNERSHIP.others.map(
      o =>
        `| ${esc(o.where)} | ${esc(o.name)} | — | \`${o.owner}\` | ${o.owner === 'js/storage/index.js' ? '`js/storage/index.js`' : 'its own'} | ${esc(o.migration)} | ${esc(EXPORT_WORDS[o.export])} | ${o.corpus ? `\`${o.corpus}\`` : esc(o.corpusWhy)} |`
    ),
  ].join('\n');

  const writers = [
    '| Writer | Why it is still direct | Lacks |',
    '|---|---|---|',
    ...OWNERSHIP.writers.map(w => {
      const l = w.lacks;
      const lack = l
        ? `${l.kb ? `${l.kb} KB` : ''}${l.kb && l.requests ? ' and ' : ''}${l.requests ? `${l.requests} request` : ''}${!l.kb && !l.requests ? 'nothing it needs' : ''} on ${l.route}`
        : 'not student work, or not a Storage the module can wrap';
      return `| \`${w.file}\` | ${esc(w.reason)} | ${esc(lack)} |`;
    }),
  ].join('\n');

  const nouns = OWNERSHIP.writers.map(w => w.student).filter(Boolean);
  const list = (key, and) =>
    nouns.length < 2
      ? nouns.map(n => n[key]).join('')
      : `${nouns
          .slice(0, -1)
          .map(n => n[key])
          .join(', ')} ${and} ${nouns.at(-1)[key]}`;
  const sentence =
    `<li><span class="gs-en">Some pages save straight to this browser without checking how much room is left, and say nothing if the save fails: ${list('en', 'and')}. If this device is nearly full, download a backup before you rely on them.</span>` +
    `<span class="gs-es" lang="es">Algunas páginas guardan directamente en este navegador sin comprobar cuánto espacio queda, y no avisan si el guardado falla: ${list('es', 'y')}. Si este dispositivo está casi lleno, descarga una copia antes de fiarte de ellos.</span></li>`;
  return { records, writers, sentence };
}

const MARK = id => [
  `<!-- storage:${id}:start -->`,
  `<!-- storage:${id}:end -->`,
];

export function splice(text, id, body) {
  const [a, b] = MARK(id);
  const i = text.indexOf(a);
  const j = text.indexOf(b);
  if (i < 0 || j < i) throw new Error(`missing markers for ${id}`);
  return `${text.slice(0, i + a.length)}\n${body}\n${text.slice(j)}`;
}

export const PLACES = [
  ['STORAGE.md', 'records', t => t.records],
  ['STORAGE.md', 'writers', t => t.writers],
  ['my-work/index.html', 'direct', t => t.sentence],
];

export async function render() {
  const t = await tables();
  const out = new Map();
  for (const [file, id, pick] of PLACES) {
    const text = out.get(file) ?? read(file);
    out.set(file, splice(text, id, pick(t)));
  }
  return out;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const out = await render();
  const stale = [...out].filter(([file, text]) => text !== read(file));
  if (process.argv.includes('--check')) {
    if (stale.length) {
      console.error(
        `${stale.map(([f]) => f).join(', ')}: stale; run npm run storage:matrix`
      );
      process.exit(1);
    }
    console.log('the storage ownership matrix is current');
  } else {
    for (const [file, text] of out) writeFileSync(path.join(ROOT, file), text);
    console.log(`wrote ${[...out.keys()].join(', ')}`);
  }
}
