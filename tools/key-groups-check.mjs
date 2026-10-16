#!/usr/bin/env node
// =============================================================================
// Key groups: does the rewritten catalog equal its source?
// -----------------------------------------------------------------------------
//   node tools/key-groups-check.mjs      exit 1 and list every mismatch
//
// Builds each js/i18n catalog as the site does (minified, with the key-groups
// plugin), runs the result, and compares every export with the source module's:
// the same keys in the same order, with equal values. Used by
// tests/keyGroups.test.js. See tools/key-groups.mjs.
// =============================================================================

import { readdirSync } from 'node:fs';
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import * as esbuild from 'esbuild';
import { keyGroupsPlugin } from './key-groups.mjs';
import { keyGroups } from '../js/i18n/keyGroups.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** @returns {Promise<{checked: number, rewritten: number, problems: string[]}>} */
export async function checkKeyGroups() {
  const dir = path.join(ROOT, 'js', 'i18n');
  const problems = [];
  let checked = 0;
  let rewritten = 0;
  for (const f of readdirSync(dir).filter(n => /^(en|es)\..*\.js$/.test(n))) {
    const seen = new Set();
    const built = await esbuild.build({
      entryPoints: [path.join('js', 'i18n', f)],
      absWorkingDir: ROOT,
      bundle: true,
      minify: true,
      charset: 'utf8',
      format: 'cjs',
      platform: 'node',
      write: false,
      logLevel: 'silent',
      plugins: [keyGroupsPlugin(ROOT, seen)],
    });
    if (seen.size) rewritten++;
    // js/i18n/en.js publishes the helper in the site; here it stands first.
    globalThis.__gravitasKeyGroups = keyGroups;
    const module = { exports: {} };
    new Function('module', 'exports', built.outputFiles[0].text)(
      module,
      module.exports
    );
    const plain = await import(pathToFileURL(path.join(dir, f)).href);
    checked++;
    if (
      !isDeepStrictEqual(
        Object.keys(module.exports).sort(),
        Object.keys(plain).sort()
      )
    ) {
      problems.push(`${f}: the exports differ`);
      continue;
    }
    for (const name of Object.keys(plain)) {
      const a = module.exports[name];
      const b = plain[name];
      const sameKeys = isDeepStrictEqual(
        Object.keys(a ?? {}),
        Object.keys(b ?? {})
      );
      if (
        !sameKeys ||
        !isDeepStrictEqual({ ...a }, { ...b }) ||
        JSON.stringify(a) !== JSON.stringify(b)
      ) {
        problems.push(`${f}: ${name} differs`);
      }
    }
  }
  return { checked, rewritten, problems };
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const r = await checkKeyGroups();
  console.log(
    `${r.checked} catalogs checked, ${r.rewritten} rewritten by the plugin`
  );
  for (const p of r.problems) console.log('  ! ' + p);
  process.exit(r.problems.length ? 1 : 0);
}
