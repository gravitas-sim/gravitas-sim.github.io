// =============================================================================
// Write down every module Node loads
// -----------------------------------------------------------------------------
// A module-customization hook, registered by tools/instructor-digest-audit.mjs
// before it starts a build. It answers the one question a static import walker
// cannot answer about itself: did the program load anything the walker did not
// find?
//
// Its own file because `register()` runs a hook on a separate thread and takes
// a URL to load there, so it cannot be a closure in the caller. It appends
// rather than collecting, because the loader thread and the main thread do not
// share memory.
// =============================================================================

import { appendFileSync } from 'node:fs';

const LOG = process.env.GRAVITAS_MODULE_LOG;

/**
 * Record a module, then load it exactly as Node would have.
 *
 * @param {string} url - The resolved module URL
 * @param {object} context - Node's load context
 * @param {Function} next - The rest of the chain
 * @returns {Promise<object>} Whatever the chain returns
 */
export async function load(url, context, next) {
  if (LOG && url.startsWith('file:')) appendFileSync(LOG, url + '\n');
  return next(url, context);
}
