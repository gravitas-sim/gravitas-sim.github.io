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

/** @returns {'first visit'|'after it settles'|'one online visit'} */
export function promiseOf(row) {
  // A page, or anything it fetches, that no tier holds is kept by the worker
  // only once it has been fetched: one online visit.
  if (row.html === 'runtime' || row.html === 'never') return 'one online visit';
  if (row.outside.some(o => o.tier !== 'idle')) return 'one online visit';
  if (row.html === 'idle' || row.outside.length) return 'after it settles';
  return 'first visit';
}

/** The pages as the tour must see them: every HTML page, as its URL path. */
export const tourPages = async () =>
  (await pages()).map(p => {
    const f = typeof p === 'string' ? p : (p.file ?? p.path);
    return '/' + f.replace(/(^|\/)index\.html$/, '$1');
  });
