#!/usr/bin/env node
// =============================================================================
// Which Spanish catalog entries are probably stale already, from git history?
// -----------------------------------------------------------------------------
//   node tools/i18n-history.mjs            counts, by id prefix
//   node tools/i18n-history.mjs --list     every candidate id
//
// The freshness ledger (tools/i18n-freshness.mjs) starts from today: it takes
// every translation present when it was first written as written against its
// English, because nothing in the catalogs records what the English was. Git
// does. This walks every commit that touched js/i18n, oldest first, notes for
// each id the commit in which its English last changed and the commit in which
// its Spanish last changed, and lists the ids whose English changed later.
//
// Indicative only, and informational: it never fails. A later English change may
// be a typo or a punctuation fix that left the Spanish right (that is what
// `--confirm` is for), and an id that moved between fragments is followed by id,
// not by file. It reads the history with `git show` and evaluates each old
// fragment's own literal entries; it writes nothing and imports nothing from
// js/i18n.
// =============================================================================

import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { completeCatalogs } from './i18n-catalog.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const git = (...args) =>
  execFileSync('git', ['-C', ROOT, ...args], {
    encoding: 'utf8',
    maxBuffer: 1 << 28,
  });

/**
 * A fragment's own literal entries, from its source text.
 *
 * Imports and spreads of other fragments are dropped: an entry a fragment passes
 * on was written in the fragment that holds it.
 *
 * @param {string} source - The file's text at some commit
 * @returns {?Object<string,*>} The table, or null when it cannot be read
 */
export function ownEntries(source) {
  const code = source
    .replace(/^import[^;]*;\s*$/gm, '')
    .replace(/^export\s+const\s+\w+\s*=/m, 'const __T =')
    .replace(/^\s*\.\.\.\w+,?\s*$/gm, '')
    .replace(/^export\s+[^\n]*$/gm, '');
  try {
    return new Function(`${code}\n;return __T;`)();
  } catch {
    return null;
  }
}

/**
 * Walk the history and say, per id, where its English and its Spanish last changed.
 *
 * @returns {{commits: number, last: {en: Map<string,{value: string, at: number}>, es: Map<string,{value: string, at: number}>}}}
 */
export function walk() {
  const commits = git('log', '--reverse', '--format=%H', '--', 'js/i18n')
    .trim()
    .split('\n');
  const last = { en: new Map(), es: new Map() };
  commits.forEach((sha, at) => {
    const files = git(
      'diff-tree',
      '--no-commit-id',
      '--name-only',
      '-r',
      '--root',
      sha,
      '--',
      'js/i18n'
    )
      .trim()
      .split('\n')
      .filter(f => /js\/i18n\/(en|es)(\.\w+)?\.js$/.test(f));
    for (const file of files) {
      const locale = file.match(/i18n\/(en|es)/)[1];
      let source;
      try {
        source = git('show', `${sha}:${file}`);
      } catch {
        continue; // deleted in this commit
      }
      const table = ownEntries(source);
      if (!table) continue;
      for (const [id, value] of Object.entries(table)) {
        const text = JSON.stringify(value);
        const known = last[locale].get(id);
        if (!known || known.value !== text)
          last[locale].set(id, { value: text, at });
      }
    }
  });
  return { commits: commits.length, last };
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const { commits, last } = walk();
  const { catalogs } = await completeCatalogs({ locales: ['en', 'es'] });
  const en = catalogs.get('en').merged;
  const es = catalogs.get('es').merged;
  const candidates = [];
  let judged = 0;
  for (const id of Object.keys(en)) {
    if (/^lessonFn\./.test(id) || !(id in es)) continue;
    const a = last.en.get(id);
    const b = last.es.get(id);
    // Only where the history reproduces today's text on both sides.
    if (
      !a ||
      !b ||
      a.value !== JSON.stringify(en[id]) ||
      b.value !== JSON.stringify(es[id])
    )
      continue;
    judged++;
    if (a.at > b.at) candidates.push(id);
  }
  console.log(
    `${commits} commits touched js/i18n; ${judged} entries judged; ${candidates.length} have English that changed after their Spanish (indicative)`
  );
  const byPrefix = {};
  for (const id of candidates)
    byPrefix[id.split('.')[0]] = (byPrefix[id.split('.')[0]] ?? 0) + 1;
  for (const [p, n] of Object.entries(byPrefix).sort(
    (x, y) => y[1] - x[1] || (x[0] < y[0] ? -1 : 1)
  ))
    console.log(`  ${p}: ${n}`);
  if (process.argv.includes('--list'))
    for (const id of candidates.sort()) console.log(id);
}
