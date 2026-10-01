// =============================================================================
// A Content-Security-Policy on every page
// -----------------------------------------------------------------------------
//   node tools/csp.mjs --write   write each page's policy into its <head>
//   node tools/csp.mjs --check   fail when a page's policy is not what this writes
//
// Roadmap II Prompt 67, step 6. Every published page gets one policy, as a
// <meta http-equiv> first in its <head>, because GitHub Pages sets no headers:
//   - scripts from this origin only, and the page's own inline
//     scripts by the hash of their text, which --write recomputes, so an edited
//     script is either re-hashed or refused and never silently allowed;
//   - styles from this origin, inline too: pages carry <style> blocks and
//     style attributes, and a style cannot run code;
//   - images from this origin, data: and blob: (a canvas saved as a picture,
//     the stylesheets' SVG icons), media as blob: (a recorded clip);
//   - fetches to this origin and blob: only, except the Observatory, which
//     may also reach the two CDS origins its archive import names
//     (js/archive/cds.js ALLOW; tests/csp.test.js holds the page to that list);
//   - workers from this origin and blob:. A blob: URL can only be made by a
//     script the page already runs, so it admits no code 'self' does not;
//   - no plugins, no <base> elsewhere, forms back to this origin.
// frame-ancestors is left out: a browser ignores it in a <meta>, and says so,
// so embedding is governed by EMBEDDING.md, not by the page.
//
// history/original/ is the first Gravitas, kept byte for byte, so it is the
// one published page without a policy: adding one would change what it is.
// =============================================================================

import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { ALLOW } from '../js/archive/cds.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** The pages the site publishes: every tracked index.html but the spike's. */
export function pages() {
  return execFileSync('git', ['ls-files', '*.html'], {
    cwd: ROOT,
    encoding: 'utf8',
  })
    .split('\n')
    .filter(
      f =>
        f.endsWith('.html') &&
        !/^(spike|dist|e2e|tests|sdk|node_modules)\//.test(f) &&
        // A panel's markup, inserted into index.html (INDEX_DECOMPOSITION.md):
        // it runs under index.html's policy and is not a page of its own.
        !f.startsWith('js/fragments/') &&
        // Kept byte for byte as the first Gravitas (tests/historyOriginal
        // .test.js pins its blob), so it carries no policy of its own.
        f !== 'history/original/index.html'
    )
    .sort();
}

/** The text of each inline script a browser would run. */
export function inlineScripts(html) {
  const out = [];
  for (const m of html.matchAll(/<script(\s[^>]*)?>([\s\S]*?)<\/script>/g)) {
    const attrs = m[1] || '';
    if (/\ssrc=/.test(attrs)) continue;
    const type = /\stype="([^"]*)"/.exec(attrs)?.[1] ?? '';
    // A data block (JSON, JSON-LD) is not run, and no policy governs it.
    if (type && type !== 'module' && type !== 'text/javascript') continue;
    out.push(m[2]);
  }
  return out;
}

const hash = text =>
  `'sha256-${createHash('sha256').update(text, 'utf8').digest('base64')}'`;

/**
 * The policy for one page.
 * @param {string} page - Its path, as `git ls-files` writes it
 * @param {string} html - Its text
 * @returns {string}
 */
export function policyFor(page, html) {
  const scripts = [`'self'`, ...inlineScripts(html).map(hash)];
  const connect = [
    `'self'`,
    'blob:',
    ...(page === 'observatory/index.html' ? ALLOW : []),
  ];
  return [
    `default-src 'self'`,
    `script-src ${scripts.join(' ')}`,
    `style-src 'self' 'unsafe-inline'`,
    `font-src 'self'`,
    `img-src 'self' data: blob:`,
    `media-src 'self' blob:`,
    `connect-src ${connect.join(' ')}`,
    `worker-src 'self' blob:`,
    `frame-src 'self'`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
  ].join('; ');
}

const META =
  /\n?[ \t]*<meta\s+http-equiv="Content-Security-Policy"\s+content="[^"]*"\s*\/>/;

/** The page with its policy first in <head>, after the charset. */
export function withPolicy(page, html) {
  const bare = html.replace(META, '');
  const policy = policyFor(page, bare);
  const tag = `\n    <meta\n      http-equiv="Content-Security-Policy"\n      content="${policy}"\n    />`;
  const charset = /<meta charset="[^"]*"\s*\/?>/i.exec(bare);
  if (!charset)
    throw new Error(`${page}: no <meta charset> to put the policy after`);
  const at = charset.index + charset[0].length;
  return bare.slice(0, at) + tag + bare.slice(at);
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const write = process.argv.includes('--write');
  const stale = [];
  for (const page of pages()) {
    const file = path.join(ROOT, page);
    const html = readFileSync(file, 'utf8');
    const next = withPolicy(page, html);
    if (next === html) continue;
    if (write) writeFileSync(file, next);
    else stale.push(page);
  }
  if (stale.length) {
    console.error(
      `${stale.join('\n')}\nThese pages' policies are stale. Run node tools/csp.mjs --write`
    );
    process.exit(1);
  }
  console.log(
    write
      ? `Wrote the policy of ${pages().length} pages.`
      : `Every page's policy is current (${pages().length} pages).`
  );
}
