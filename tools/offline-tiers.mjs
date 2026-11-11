// =============================================================================
// Reading the manifest for the page tour (Prompt 284)
// -----------------------------------------------------------------------------
// The pure half of tools/offline-pages.mjs (which needs a browser): the tier of
// a path, the promise a row of the tour carries, and the pages the tour opens.
// tests/offlinePages.test.js imports this, not the tour.
// =============================================================================

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pages } from './csp.mjs';
import { NEVER_PRECACHED } from './build-service-worker.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** The tier of a same-origin path, from the committed manifest. */
export function tierReader(root = ROOT) {
  const scope = {};
  const text = fs.readFileSync(path.join(root, 'sw-manifest.js'), 'utf8');
  new Function('self', text)(scope);
  const strip = p =>
    p
      .replace(/^\.?\//, '')
      .replace(/[?#].*$/, '')
      .replace(/\/$/, '/index.html');
  const sets = {
    core: new Set(scope.__GRAVITAS_PRECACHE_CORE.map(strip)),
    optional: new Set(scope.__GRAVITAS_PRECACHE_OPTIONAL.map(strip)),
    idle: new Set(scope.__GRAVITAS_PRECACHE_IDLE.map(strip)),
  };
  return pathname => {
    const p = strip(pathname) || 'index.html';
    for (const tier of ['core', 'optional', 'idle'])
      if (sets[tier].has(p)) return tier;
    return NEVER_PRECACHED.some(re => re.test(p)) ? 'never' : 'runtime';
  };
}

/**
 * What a page can promise offline, from the tour's row for it.
 * - first visit: the page and everything it fetched are in the install;
 * - after it settles: the page or a file it fetches is in the idle tier;
 * - after one online visit: the page is held, but a file it fetched is in no
 *   tier, which the worker keeps once it has been fetched;
 * - needs a connection: the page itself is in no tier. The worker never
 *   stores a document it was not given (sw.js: a navigation is answered from
 *   the precache or the network, so that no build's shell mixes with another's),
 *   so offline it sends the reader to the application.
 * @returns {'first visit'|'after it settles'|'after one online visit'|'needs a connection'}
 */
export function promiseOf(row) {
  if (row.html === 'runtime' || row.html === 'never')
    return 'needs a connection';
  if (row.outside.some(o => o.tier !== 'idle')) return 'after one online visit';
  if (row.html === 'idle' || row.outside.length) return 'after it settles';
  return 'first visit';
}

/** The pages as the tour must see them: every HTML page, as its URL path. */
export const tourPages = async () =>
  (await pages()).map(p => {
    const f = typeof p === 'string' ? p : (p.file ?? p.path);
    return '/' + f.replace(/(^|\/)index\.html$/, '$1');
  });
