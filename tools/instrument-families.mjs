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

/**
 * How many files start-up downloads with the families fetched on demand, and
 * how many it would with every family imported by the registry as before.
 *
 * esbuild puts a module in the chunk shared by exactly the entry points that
 * reach it, and every family fetched on demand is an entry point. A family
 * that reaches some of a start-up chunk's modules and not the others splits
 * that chunk, and start-up downloads one more file on every page - which is
 * what js/instrumentStartup.js exists to prevent. The two builds here are the
 * application as build.js bundles it, in memory, with the registry's family
 * imports left as they are and with each one made a static import; loading
 * families lazily must cost start-up no file the eager registry did not.
 *
 * @returns {Promise<{lazy: number, eager: number}>} Start-up file counts
 */
export async function startupFileCounts() {
  const { build } = await import('esbuild');
  const { readFile } = await import('node:fs/promises');
  const root = path.resolve(
    path.dirname(new URL(import.meta.url).pathname),
    '..'
  );
  const count = async plugins => {
    const result = await build({
      absWorkingDir: root,
      entryPoints: [{ in: 'js/main.js', out: 'app' }],
      bundle: true,
      format: 'esm',
      target: ['es2022'],
      keepNames: true,
      splitting: true,
      chunkNames: 'chunk-[hash]',
      outdir: path.join(root, 'dist', 'js'),
      metafile: true,
      write: false,
      logLevel: 'silent',
      plugins,
    });
    const outputs = result.metafile.outputs;
    const entry = Object.keys(outputs).find(f => f.endsWith('/app.js'));
    const eager = new Set();
    const walk = f => {
      if (eager.has(f) || !outputs[f]) return;
      eager.add(f);
      for (const i of outputs[f].imports || []) {
        if (i.kind === 'import-statement') walk(i.path);
      }
    };
    walk(entry);
    return [...eager].filter(f => f.endsWith('.js')).length;
  };
  const allEager = {
    name: 'families-eager',
    setup(b) {
      b.onLoad({ filter: /[\\/]js[\\/]widgets\.js$/ }, async args => {
        // Each import('./xWidgets.js') becomes the namespace of a static
        // import. Adding the static import alone is not enough: a module that
        // is also import()ed is still an entry point of its own, and the two
        // builds would split start-up the same way.
        const specs = [];
        const source = (await readFile(args.path, 'utf8')).replace(
          /import\(\s*'(\.\/[A-Za-z]+Widgets\.js)'\s*\)/g,
          (_, spec) => {
            specs.push(spec);
            return `Promise.resolve(family${specs.length - 1})`;
          }
        );
        const statics = specs.map(
          (spec, i) => `import * as family${i} from '${spec}';`
        );
        return { contents: `${statics.join('\n')}\n${source}`, loader: 'js' };
      });
    },
  };
  return { lazy: await count([]), eager: await count([allEager]) };
}
