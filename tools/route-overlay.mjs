// =============================================================================
// Publish named routes from the build, over the committed tree
// -----------------------------------------------------------------------------
//   node tools/route-overlay.mjs --into <staged tree> [--dist dist]
//   node tools/route-overlay.mjs --plan                 print what it would do
//
// The deploy-model gate's third run (DEPLOY_MODEL_GATE.md, D-R4-315-02) named
// the routes a build may serve: those that met the start-up bar, whose
// workflows all pass on the build and that open offline. The front door shares
// its document and its worker scope with the sandbox and every lesson, which
// the suite does not judge on the build, so it cannot be published apart from
// them (DEPLOY_MODEL_GATE.md, part B of the third run); the Observatory is its
// own page and stands alone. So the overlay is the Observatory, and the list
// below is the one place a route is added.
//
// What it does. `node build.js` writes `dist/build-inputs.json`: every bundle's
// entries with the outputs each loads, and each output's own source modules
// and static imports (esbuild's metafile, so the import graph the bundler
// followed). For each route this
//   - copies the built page over the tree's, with the entry and every chunk it
//     loads moved under the route's own folder (`observatory/js/`), so nothing
//     collides with the tree's modules of the same name (the built entry is
//     `js/observatoryPage.js`, which is also a source file);
//   - names the start-up closure (the entry and its static imports): the files
//     the page needs to open at all, which the precache installs in the tier
//     the tree gives the page;
//   - names the sources the route replaces: modules only this route's outputs
//     were built from, which no other bundle uses. The precache drops them, so
//     the overlay installs no more bytes than the tree did (316, step 2);
//   - writes `deploy-overlay.json` at the root of the staged tree, which
//     tools/build-service-worker.mjs reads there and nowhere else.
// The lazy chunks (one per observation and panel) are published, not
// installed: precaching them would install built copies of modules the tree
// installs already, about 1.3 MB beyond the tree's tiers. The worker caches
// each on first use.
//
// Nothing here runs on the committed tree or touches it: the overlay exists
// only in the staged copy tools/prepare-pages.mjs assembles.
// =============================================================================

import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** The routes published from the build. */
export const OVERLAY_ROUTES = Object.freeze([
  Object.freeze({
    id: 'observatory',
    page: 'observatory/index.html',
    entry: 'js/observatoryPage.js',
    dir: 'observatory/js',
  }),
]);

export const OVERLAY_FILE = 'deploy-overlay.json';

/**
 * What publishing the routes from this build would do.
 *
 * @param {{entries: Object<string, string[]>, outputs: Object<string, {inputs: string[], static: string[]}>}} built - `dist/build-inputs.json`
 * @param {readonly object[]} [routes] - As OVERLAY_ROUTES
 * @returns {{routes: object[]}} Per route: files (from, to), startup, replaced
 */
export function planOverlay(built, routes = OVERLAY_ROUTES) {
  const { entries, outputs } = built;
  const plans = [];
  for (const route of routes) {
    const closure = entries[route.entry];
    if (!closure) throw new Error(`${route.entry}: not an entry of the build`);
    const entryOut = `js/${path.basename(route.entry)}`;
    if (!closure.includes(entryOut))
      throw new Error(`${route.entry}: its output ${entryOut} is not built`);
    for (const f of closure)
      if (path.dirname(f) !== 'js')
        throw new Error(`${f}: an output outside js/ cannot be moved whole`);
    const to = f => `${route.dir}/${path.basename(f)}`;

    const startup = new Set();
    const queue = [entryOut];
    while (queue.length) {
      const f = queue.pop();
      if (startup.has(f)) continue;
      startup.add(f);
      queue.push(...(outputs[f]?.static || []));
    }

    const mine = new Set(closure.flatMap(f => outputs[f]?.inputs || []));
    const others = new Set();
    for (const [entry, outs] of Object.entries(entries)) {
      if (entry === route.entry) continue;
      for (const f of outs)
        for (const i of outputs[f]?.inputs || []) others.add(i);
    }
    plans.push({
      id: route.id,
      page: route.page,
      files: closure.map(f => ({ from: f, to: to(f) })),
      startup: [...startup].sort().map(to),
      replaced: [...mine].filter(i => !others.has(i)).sort(),
    });
  }
  return { routes: plans };
}

/**
 * The built page with every reference to the route's outputs moved under its
 * folder. Only exact `/js/<file>` references to files of the closure change.
 *
 * @param {string} html - The built page
 * @param {{files: {from: string, to: string}[]}} plan - One route's plan
 * @returns {string} The page as published
 */
export function relocatePage(html, plan, treeHtml = null) {
  let out = html;
  for (const { from, to } of plan.files)
    out = out.split(`"/${from}"`).join(`"/${to}"`);
  return treeHtml ? withTreeStyles(out, treeHtml) : out;
}

const STYLESHEET = /[ \t]*<link rel="stylesheet" href="([^"]+)"\s*\/>\n?/g;

/**
 * The built page with the tree page's stylesheets. The build joins the
 * shell's sheets into one `css/app.css` the tree does not have; the tree
 * installs its own sheets for every page already, so the overlay page links
 * those and installs no stylesheet of its own. Sheets both pages link stay
 * where the built page has them.
 *
 * @param {string} built - The built page
 * @param {string} tree - The tree's page for the same route
 * @returns {string} The built page, linking only the tree's sheets
 */
export function withTreeStyles(built, tree) {
  const treeSheets = [...tree.matchAll(STYLESHEET)].map(m => m[1]);
  const builtSheets = [...built.matchAll(STYLESHEET)].map(m => m[1]);
  const missing = treeSheets.filter(h => !builtSheets.includes(h));
  let inserted = false;
  return built.replace(STYLESHEET, (tag, href) => {
    if (treeSheets.includes(href)) return tag;
    if (inserted) return '';
    inserted = true;
    const indent = /^[ \t]*/.exec(tag)[0];
    return missing
      .map(h => `${indent}<link rel="stylesheet" href="${h}" />\n`)
      .join('');
  });
}

/**
 * Lay the routes over a staged tree.
 *
 * @param {string} into - The staged tree
 * @param {{dist?: string, inputs?: string}} [opts] - The build and its record
 * @returns {object} What was written (also as deploy-overlay.json)
 */
export function applyOverlay(into, opts = {}) {
  const dist = path.resolve(opts.dist || path.join(REPO, 'dist'));
  const inputs = path.resolve(
    opts.inputs || path.join(dist, 'build-inputs.json')
  );
  if (!existsSync(inputs))
    throw new Error(
      `${inputs}: run node build.js first (it writes the record)`
    );
  const plan = planOverlay(JSON.parse(readFileSync(inputs, 'utf8')));
  for (const route of plan.routes) {
    const page = path.join(dist, route.page);
    const html = readFileSync(page, 'utf8');
    const treePage = path.join(into, route.page);
    const moved = relocatePage(
      html,
      route,
      existsSync(treePage) ? readFileSync(treePage, 'utf8') : null
    );
    if (moved === html)
      throw new Error(`${route.page}: names none of its built files`);
    mkdirSync(path.join(into, path.dirname(route.page)), { recursive: true });
    writeFileSync(path.join(into, route.page), moved);
    for (const { from, to } of route.files) {
      mkdirSync(path.join(into, path.dirname(to)), { recursive: true });
      copyFileSync(path.join(dist, from), path.join(into, to));
    }
  }
  const record = {
    routes: plan.routes.map(r => ({
      id: r.id,
      page: r.page,
      files: r.files.map(f => f.to),
      startup: r.startup,
      replaced: r.replaced,
    })),
  };
  writeFileSync(
    path.join(into, OVERLAY_FILE),
    `${JSON.stringify(record, null, 2)}\n`
  );
  return record;
}

function main() {
  const argv = process.argv.slice(2);
  const valueOf = (flag, fallback) => {
    const i = argv.indexOf(flag);
    return i >= 0 ? argv[i + 1] : fallback;
  };
  if (argv.includes('--plan')) {
    const built = JSON.parse(
      readFileSync(path.join(REPO, 'dist/build-inputs.json'), 'utf8')
    );
    for (const r of planOverlay(built).routes)
      console.log(
        `${r.id}: ${r.files.length} files, ${r.startup.length} at start-up, replaces ${r.replaced.length} sources:\n  ${r.replaced.join('\n  ')}`
      );
    return;
  }
  const into = valueOf('--into');
  if (!into) throw new Error('--into <staged tree> is required');
  const record = applyOverlay(path.resolve(into), {
    dist: valueOf('--dist'),
  });
  for (const r of record.routes)
    console.log(`${r.id}: ${r.files.length} files over ${r.page}`);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
