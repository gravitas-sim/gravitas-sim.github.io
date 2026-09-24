// =============================================================================
// Which instrument families a script the page fetched contains
// -----------------------------------------------------------------------------
// An instrument family is a `js/*Widgets.js` module; js/widgets.js fetches each
// one when a lesson step first names one of its instruments. Whether a lesson
// fetched a family it does not use is the question tools/route-budget.mjs and
// e2e/lazyInstruments.spec.js both ask, from the network:
//
//   sources  the family module is fetched under its own path
//   build    it is inside a hashed chunk, and the chunk's source map lists the
//            modules it was built from - read from dist/ beside the chunk
//
// Neither needs anything from the page: no production hook, and no string a
// minifier could change. A chunk whose map cannot be read reports no family,
// so a missing map makes "fetched a family" checks fail loudly rather than
// pass - the tests that use this assert the family they expect as well.
// =============================================================================

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const FAMILY_MODULE = /(?:^|\/)js\/([A-Za-z]+Widgets)\.js$/;

/** `js/energyWidgets.js` -> `energyWidgets`; anything else -> null. */
export function familyOfModule(modulePath) {
  const m = String(modulePath).split('?')[0].match(FAMILY_MODULE);
  return m ? m[1] : null;
}

const maps = new Map();

/**
 * The families one fetched script contains.
 * @param {string} url - The script's URL as the page fetched it
 * @param {Object} opts
 * @param {'sources'|'build'} opts.config - Which configuration served it
 * @param {string} [opts.root] - The served directory, for a build's maps
 * @returns {string[]} Family module names, e.g. ['energyWidgets']
 */
export function familiesInScript(url, { config, root }) {
  const { pathname } = new URL(url);
  if (config === 'sources') {
    const one = familyOfModule(pathname);
    return one ? [one] : [];
  }
  const file = path.join(root, `${decodeURIComponent(pathname)}.map`);
  if (!maps.has(file)) {
    let sources = [];
    if (existsSync(file)) {
      try {
        sources = JSON.parse(readFileSync(file, 'utf8')).sources || [];
      } catch {
        /* unreadable map: no family, see above */
      }
    }
    maps.set(
      file,
      [...new Set(sources.map(familyOfModule).filter(Boolean))].sort()
    );
  }
  return maps.get(file);
}
