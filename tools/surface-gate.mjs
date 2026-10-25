#!/usr/bin/env node
// =============================================================================
// The surface gate: one decision function, the same for every surface
// -----------------------------------------------------------------------------
//   node tools/surface-gate.mjs check     the verdicts follow from the evidence
//                                         and the generated tables are current
//   node tools/surface-gate.mjs write     write the generated tables
//   node tools/surface-gate.mjs report    print the verdicts
//
// Prompt 165. SURFACE_RETIREMENT_GATE.md says how a surface is judged; this
// file is the judgment as code, so that a verdict is a function of recorded
// evidence and not of a mood. `tools/surface-gate.json` holds the evidence, one
// record per surface; `decide()` below is the only thing that turns a record
// into a verdict; `tests/surfaceGate.test.js` holds the two together.
//
// The thresholds and the support periods in this file were committed before
// any surface was judged (the commit that adds this file has no evidence file),
// and a change to one is a decision-register row, never an edit made because a
// surface came out the wrong way.
//
// Nothing here changes the site. A verdict is read by Prompt 166, which carries
// out the ones Carl approves, one pull request each.
//
// An owner ruling is the one thing that stands beside a verdict without being
// one. A record may carry `ruling` (the verdict Carl gave, in his words, where
// and when, the register row, why, and what would reverse it); the stored
// `verdict` and `rule` stay what decide() gives, and the tables show both. A
// ruling changes no threshold and no rule, so the next surface is judged as
// before, and problems() refuses a ruling that agrees with the function (it
// would be nothing) or that is missing any of its parts.
// =============================================================================

import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

/** The five verdicts, and what each one allows (SURFACE_RETIREMENT_GATE.md). */
export const VERDICTS = Object.freeze([
  'KEEP',
  'FREEZE',
  'GROUP',
  'CONSOLIDATE',
  'RETIRE',
]);

/**
 * The thresholds. Cost is "material" when at least `atLeast` of the six signals
 * reach their value; a route merge is "justified" only by a measured gain.
 */
export const THRESHOLDS = Object.freeze({
  material: Object.freeze({
    atLeast: 2,
    /** Source lines only this surface loads (its page and the modules no other page reaches). */
    lines: 1500,
    /** Test files (Jest and Playwright) that name the surface. */
    testFiles: 3,
    /** Generated artifacts that exist only for it. */
    generated: 2,
    /** Catalog keys per language that only it uses. */
    strings: 150,
    /** Gzip KB of its own files in the service worker's precache tiers. */
    precacheKb: 20,
    /** Rows of the accessibility spec that open it. */
    axeRows: 4,
  }),
  consolidate: Object.freeze({
    /** At least this many routes leave the stamped set. */
    removesRoutes: 1,
    /** And at least one of these gains, measured: */
    savingKb: 5,
    choicesRemoved: 1,
    duplicatedModules: 1,
  }),
});

/**
 * The link-support policy (Prompt 165, register row D-R10-44). A period ends
 * when both its months and its minor releases have passed. It is counted from
 * the release that first carries the notice, never from a merge to a train that
 * is not deployed. Class R covers saved records, files a person can hold and
 * links that carry state; class L covers a route or a capability that holds
 * nothing. Class R's periods are FORMATS.md's support period.
 */
export const PERIODS = Object.freeze({
  L: Object.freeze({
    deprecated: Object.freeze({ months: 6, minorReleases: 2 }),
    readOnly: Object.freeze({ months: 6, minorReleases: 1 }),
  }),
  R: Object.freeze({
    deprecated: Object.freeze({ months: 12, minorReleases: 2 }),
    readOnly: Object.freeze({ months: 12, minorReleases: 1 }),
  }),
});

const count = x => (Array.isArray(x) ? x.length : Number(x) || 0);

/** The six cost signals that reached their threshold, and whether that is "material". */
export function costClass(cost = {}) {
  const t = THRESHOLDS.material;
  const reached = Object.keys(t)
    .filter(k => k !== 'atLeast')
    .filter(k => Number(cost[k]) >= t[k]);
  return { material: reached.length >= t.atLeast, reached };
}

/** A route merge is justified by a named target, a route removed and a measured gain. */
export function mergeJustified(merge) {
  if (!merge || !merge.target) return false;
  const t = THRESHOLDS.consolidate;
  if (!(merge.removesRoutes >= t.removesRoutes)) return false;
  if (merge.keepsRequestCeiling !== true) return false;
  return (
    merge.savingKb >= t.savingKb ||
    merge.choicesRemoved >= t.choicesRemoved ||
    merge.duplicatedModules >= t.duplicatedModules
  );
}

/** Class R when anything a person can hold or share carries state to the surface; else class L. */
export function supportClass(e) {
  return count(e.exposure?.records) > 0 || count(e.exposure?.stateLinks) > 0
    ? 'R'
    : 'L';
}

/**
 * The decision function. Rules are tried in order and the first match wins; the
 * rule id is part of the answer so a verdict can be traced.
 *
 * @param {object} e one evidence record: {unique, replacement, role, menu,
 *   firstAction, use:{shippedLinks, libraryEntries}, cost, exposure:{links,
 *   records, stateLinks}, merge}
 * @returns {{verdict: string, rule: string, material: boolean, support: ?string, why: string}}
 */
export function decide(e) {
  const material = costClass(e.cost).material;
  const used = count(e.use?.shippedLinks) + count(e.use?.libraryEntries) > 0;
  const out = (verdict, rule, why) => ({
    verdict,
    rule,
    material,
    support:
      verdict === 'RETIRE' || verdict === 'CONSOLIDATE'
        ? supportClass(e)
        : null,
    why,
  });

  if (e.unique !== 'yes' && e.unique !== 'partly' && e.unique !== 'no') {
    return out('KEEP', 'R0', 'the unique-task test could not be answered');
  }
  if (e.firstAction) {
    return out('KEEP', 'R1', "a destination's own first-action page");
  }
  if (e.menu === true) {
    return out('GROUP', 'R2', 'a menu entry that is not a destination');
  }
  if (e.unique === 'yes') {
    const exposed =
      count(e.exposure?.links) +
        count(e.exposure?.records) +
        count(e.exposure?.stateLinks) >
      0;
    return !used && !exposed && material
      ? out(
          'FREEZE',
          'R3a',
          'unique, but nothing uses it, nothing holds it, and it costs'
        )
      : out('KEEP', 'R3b', 'a task nothing else supports');
  }
  if (!e.replacement) {
    return out(
      'KEEP',
      'R4',
      'no replacement is named, so nothing can be pointed at'
    );
  }
  if (!used) {
    if (e.unique === 'no') {
      return out(
        'RETIRE',
        'R5',
        'a named replacement does all of it and nothing shipped uses it'
      );
    }
    return material
      ? out('FREEZE', 'R6a', 'only partly replaced, unused, and it costs')
      : out('KEEP', 'R6b', 'only partly replaced');
  }
  if (mergeJustified(e.merge)) {
    return out(
      'CONSOLIDATE',
      'R7',
      'used, and a merge into the named target has a measured gain'
    );
  }
  return material
    ? out(
        'FREEZE',
        'R8a',
        'used, replaceable, no measured merge gain, and it costs'
      )
    : out('KEEP', 'R8b', 'used, and the merge gains nothing measured');
}

// =============================================================================
// Measuring the evidence that can be measured
// -----------------------------------------------------------------------------
// Everything below reads the tree and the recorded evidence; none of it feeds
// decide() except through the evidence file, so a verdict never depends on a
// measurement made at check time. The measurements are a snapshot at a commit:
// `tests/surfaceGate.test.js` does not recompute them (an unrelated edit to a
// lab's source would fail it for no reason); `report` shows how far the tree
// has moved from the snapshot.
//
// Method, stated so the evidence column can be read honestly:
//  - lines: the surface's own HTML pages, plus the JavaScript modules reachable
//    (static and dynamic string imports, new URL(), new Worker()) from its
//    pages' module scripts and from no other page's. A module loaded through a
//    computed specifier is not seen. A catalog or data file is not counted.
//  - testFiles: Jest and Playwright files that name one of its routes as a
//    quoted string, or one of its exclusive modules by its last two path
//    segments, leaving out files that name eight or more of the judged routes
//    (the sitemap, shell, navigation and CSP checks exist for every surface).
//  - strings: keys per language in the catalogs listed for it.
//  - axeRows: `page.goto('<route>` rows in e2e/accessibility.spec.js.
//  - precacheKb: gzip (level 9, Node 24) of its pages, exclusive modules and
//    catalogs that the service worker precaches in any tier. Deflate bytes
//    differ between Node versions by a fraction of a percent.
//  - shippedLinks: shipped investigations, courses and activity sources that
//    link the route (js/data/investigations, js/data/courses, js/data/
//    activities.js, English files only).
//  - libraryEntries: entries of library/library.json whose route is the route.
//  - cited: published documents that name the route (README.md, paper.md,
//    paper.bib, CITATION.cff, the manual's sources): an incoming durable link
//    the project itself made.
// =============================================================================

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const EVIDENCE_FILE = path.join(ROOT, 'tools/surface-gate.json');
export const DOC = path.join(ROOT, 'SURFACE_RETIREMENT_GATE.md');
const read = f => readFileSync(path.join(ROOT, f), 'utf8');
const isFile = f =>
  existsSync(path.join(ROOT, f)) && statSync(path.join(ROOT, f)).isFile();

export const readEvidence = () =>
  JSON.parse(readFileSync(EVIDENCE_FILE, 'utf8'));
const inventory = () => JSON.parse(read('tools/navigation-inventory.json'));

/** The evidence record with the navigation inventory's facts merged in (place, menu, first action). */
export function withPlace(rec, inv = inventory()) {
  const row =
    rec.inventoryId && inv.surfaces.find(s => s.id === rec.inventoryId);
  if (!row) return { ...rec, menu: false, firstAction: false };
  return {
    ...rec,
    role: row.role,
    destination: row.destination,
    menu: row.menu != null && row.role !== 'destination',
    firstAction: row.role === 'destination',
  };
}

const IMPORT_RES = [
  /\bfrom\s*['"]([^'"]+)['"]/g,
  /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  /^\s*import\s*['"]([^'"]+)['"]/gm,
  /new URL\(\s*['"]([^'"]+)['"]\s*,\s*import\.meta\.url/g,
  /new Worker\(\s*['"]([^'"]+)['"]/g,
];

function makeGraph() {
  const cache = new Map();
  const deps = f => {
    if (cache.has(f)) return cache.get(f);
    const out = new Set();
    cache.set(f, out);
    if (!/\.m?js$/.test(f) || !isFile(f)) return out;
    const src = read(f);
    for (const re of IMPORT_RES) {
      re.lastIndex = 0;
      for (let m; (m = re.exec(src));) {
        const s = m[1];
        if (!s.startsWith('.') && !s.startsWith('/')) continue;
        const r = s.startsWith('/')
          ? s.slice(1)
          : path.posix.normalize(path.posix.join(path.posix.dirname(f), s));
        if (isFile(r)) out.add(r);
      }
    }
    return out;
  };
  const closure = entries => {
    const seen = new Set();
    const stack = [...entries];
    while (stack.length) {
      const f = stack.pop();
      if (seen.has(f)) continue;
      seen.add(f);
      for (const d of deps(f)) stack.push(d);
    }
    return seen;
  };
  return { closure, deps };
}

const pageEntries = html =>
  [...read(html).matchAll(/<script[^>]*\ssrc="([^"]+)"/g)]
    .map(m => m[1])
    .filter(s => !/^https?:/.test(s))
    .map(s =>
      s.startsWith('/')
        ? s.slice(1)
        : path.posix.join(path.posix.dirname(html), s)
    )
    .filter(isFile);

const walk = (dir, out = []) => {
  for (const name of readdirSync(path.join(ROOT, dir))) {
    const rel = path.posix.join(dir, name);
    if (statSync(path.join(ROOT, rel)).isDirectory()) walk(rel, out);
    else out.push(rel);
  }
  return out;
};

/** Every shipped page (not the spike, which is not deployed, and not the generated adoption pages). */
function allPages() {
  const skip =
    /^(node_modules|dist|worktrees|spike|teaching\/(activity|investigation))\//;
  const out = ['index.html'];
  const visit = dir => {
    for (const name of readdirSync(path.join(ROOT, dir))) {
      const rel = dir ? path.posix.join(dir, name) : name;
      if (skip.test(rel + '/')) continue;
      if (statSync(path.join(ROOT, rel)).isDirectory()) visit(rel);
      else if (name === 'index.html' && dir) out.push(rel);
    }
  };
  visit('');
  return out;
}

const catalogKeys = name => {
  const src = read(`js/i18n/en.${name}.js`);
  // Count `'key':` / key: entries at the first level of the exported object by its own text.
  return (src.match(/^\s{2}(?:'[^']+'|[A-Za-z0-9_$.]+)\s*:/gm) || []).length;
};

const routeRe = r =>
  new RegExp(`['"\`]${r.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')}(?=[?#'"\`)])`);

const esc = r => r.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
/** A route written as a link in prose or data: after a space, quote, bracket or tag, and before one. */
const linkRe = r =>
  new RegExp(`(^|[\\s"'(\`>])${esc(r)}(?=[\\s"'?#)<\`]|$)`, 'm');
/** A route named in a document: a path, or after the host name (github.io or the site's own domain). */
const citeRe = r => new RegExp(`(^|[^\\w.-]|\\.(?:io|online))${esc(r)}`, 'm');

function precacheSets() {
  const src = read('sw-manifest.js');
  const grab = name => {
    const m = src.match(new RegExp(`${name}\\s*=\\s*\\[([\\s\\S]*?)\\];`));
    return new Set(
      m ? [...m[1].matchAll(/'\.\/([^']+)'/g)].map(x => x[1]) : []
    );
  };
  return new Set([
    ...grab('__GRAVITAS_PRECACHE_CORE'),
    ...grab('__GRAVITAS_PRECACHE_OPTIONAL'),
    ...grab('__GRAVITAS_PRECACHE_IDLE'),
  ]);
}

/**
 * Measure every record's `measure` spec against the tree.
 * @param {object[]} records the evidence records
 * @returns {Map<string, object>} id -> {cost, use, cited}
 */
export function measureAll(records) {
  const graph = makeGraph();
  const pages = allPages();
  const closures = new Map(pages.map(p => [p, graph.closure(pageEntries(p))]));
  const allRoutes = records.flatMap(r => r.measure?.routes || []);
  const tests = [
    ...walk('tests').filter(f => /\.test\.js$/.test(f)),
    ...walk('e2e').filter(f => /\.spec\.js$/.test(f)),
  ].map(f => ({ f, text: read(f) }));
  const generic = new Set(
    tests
      .filter(
        t => new Set(allRoutes.filter(r => routeRe(r).test(t.text))).size >= 8
      )
      .map(t => t.f)
  );
  const content = [
    ...walk('js/data/investigations'),
    ...walk('js/data/courses'),
    'js/data/activities.js',
  ].filter(f => /\.js$/.test(f) && !/(^|\/)es(\/|\.)/.test(f));
  const contentText = content.map(f => ({ f, text: read(f) }));
  const lib = JSON.parse(read('library/library.json')).entries;
  const docs = ['README.md', 'paper.md', 'paper.bib', 'CITATION.cff']
    .concat(walk('manual').filter(f => /\.tex$/.test(f)))
    .filter(isFile)
    .map(f => ({ f, text: read(f) }));
  const axe = read('e2e/accessibility.spec.js');
  const jsFiles = walk('js').filter(
    f => /\.m?js$/.test(f) && !f.startsWith('js/i18n/')
  );
  const precached = precacheSets();
  const gz = f =>
    gzipSync(readFileSync(path.join(ROOT, f)), { level: 9 }).length;

  const out = new Map();
  for (const rec of records) {
    const m = rec.measure;
    if (!m) continue;
    const own = new Set(m.pages || []);
    const others = new Set();
    for (const [p, c] of closures)
      if (!own.has(p)) for (const f of c) others.add(f);
    const mine = new Set();
    for (const p of own)
      for (const f of closures.get(p) || graph.closure(pageEntries(p)))
        mine.add(f);
    const exclusive = [...mine].filter(
      f => /\.m?js$/.test(f) && !others.has(f)
    );
    const files = [...own, ...(m.files || [])];
    const lines =
      files.reduce(
        (n, f) => n + (isFile(f) ? read(f).split('\n').length : 0),
        0
      ) + exclusive.reduce((n, f) => n + read(f).split('\n').length, 0);
    const tails = exclusive.map(f => f.split('/').slice(-2).join('/'));
    const named = tests.filter(t => {
      if (generic.has(t.f)) return false;
      if ((m.routes || []).some(r => routeRe(r).test(t.text))) return true;
      if ((m.testNames || []).some(n => t.text.includes(n))) return true;
      return tails.some(x => t.text.includes(x));
    });
    const strings = (m.catalogs || []).reduce((n, c) => n + catalogKeys(c), 0);
    const axeRows = (m.routes || []).reduce(
      (n, r) =>
        n +
        (
          axe.match(
            new RegExp(`goto\\('${r.replace(/[/]/g, '\\/')}(?=[?'])`, 'g')
          ) || []
        ).length,
      0
    );
    const own2 = [
      ...own,
      ...exclusive,
      ...(m.catalogs || []).flatMap(c => [
        `js/i18n/en.${c}.js`,
        `js/i18n/es.${c}.js`,
      ]),
      ...(m.files || []),
    ].filter(f => isFile(f) && precached.has(f));
    const precacheKb =
      Math.round((own2.reduce((n, f) => n + gz(f), 0) / 1024) * 10) / 10;
    const routes = m.routes || [];
    const shippedLinks = contentText.filter(c =>
      routes.some(r => linkRe(r).test(c.text))
    ).length;
    const libraryEntries = lib.filter(e =>
      m.libraryFormats
        ? e.kind === 'activity' && m.libraryFormats.includes(e.format)
        : routes.includes((e.route || '').split(/[?#]/)[0])
    ).length;
    // A stored format's "links": the shipped modules, other than its owner's, that import its owner.
    const owners = new Set(m.ownerFiles || []);
    const importers = owners.size
      ? jsFiles.filter(
          f => !owners.has(f) && [...graph.deps(f)].some(d => owners.has(d))
        ).length
      : 0;
    const cited = docs
      .filter(d => routes.some(r => citeRe(r).test(d.text)))
      .map(d => d.f);
    out.set(rec.id, {
      cost: {
        lines,
        testFiles: named.length,
        generated: (m.generated || []).filter(isFile).length,
        strings,
        precacheKb,
        axeRows,
      },
      use: { shippedLinks: shippedLinks + importers, libraryEntries },
      cited,
      exclusiveFiles: exclusive.length,
    });
  }
  return out;
}

// =============================================================================
// Judging the recorded evidence, and the generated tables
// =============================================================================

/** The record as decide() reads it: the inventory's facts merged in and the project's own citations counted as incoming links. */
export function evidenceOf(rec, inv = inventory()) {
  const merged = withPlace(rec, inv);
  merged.exposure = {
    links: [
      ...(rec.exposure?.links || []),
      ...(rec.cited || []).map(f => `cited in ${f}`),
    ],
    records: rec.exposure?.records || [],
    stateLinks: rec.exposure?.stateLinks || [],
  };
  return merged;
}

/** Every record with its verdict worked out from its evidence. */
export function judge(evidence = readEvidence(), inv = inventory()) {
  return evidence.surfaces.map(rec => ({
    rec,
    e: evidenceOf(rec, inv),
    d: decide(evidenceOf(rec, inv)),
  }));
}

const esc2 = s => String(s).replace(/\|/g, '\\|');
const citeName = f => (f.startsWith('manual/') ? 'the manual' : f);
const list = a => (a && a.length ? a.join('; ') : 'none');
const SIGNAL_NAMES = {
  lines: 'lines',
  testFiles: 'tests',
  generated: 'generated',
  strings: 'strings',
  precacheKb: 'precache',
  axeRows: 'axe',
};
const exposureList = (x, e) =>
  list([
    ...(x.records || []),
    ...(x.stateLinks || []),
    ...(x.links || []),
    ...(e.cited || []).map(f => `cited in ${citeName(f)}`),
  ]);
const costCell = e => {
  const c = costClass(e.cost);
  const n = c.reached.length;
  return `${n} of 6${n ? ` (${c.reached.map(k => SIGNAL_NAMES[k]).join(', ')})` : ''}${c.material ? ', material' : ''}`;
};
const useCell = e =>
  `${e.use.shippedLinks} / ${e.use.libraryEntries} / ${(e.cited || []).length}`;
const costNumbers = e => {
  const c = e.cost || {};
  return `${c.lines ?? 0} · ${c.testFiles ?? 0} · ${c.generated ?? 0} · ${c.strings ?? 0} · ${c.precacheKb ?? 0} · ${c.axeRows ?? 0}`;
};
/** Presentation (a section, a facet) carries no support period: the policy's scope. */
const PRESENTATION = new Set(['section', 'facet']);
const verdictCell = (d, kind, rec) =>
  rec?.ruling
    ? `**${rec.ruling.verdict}** (owner ruling ${rec.ruling.register}; the function gives ${d.verdict}, ${d.rule})`
    : `**${d.verdict}** (${d.rule}${d.support ? (PRESENTATION.has(kind) ? ', presentation' : `, class ${d.support}`) : ''})`;

/** The verdict a surface stands under: the owner's ruling where there is one, else the function's. */
export const standing = ({ rec, d }) => rec.ruling?.verdict ?? d.verdict;

/** The parts an owner ruling must carry, each a non-empty string. */
export const RULING_PARTS = Object.freeze([
  'verdict',
  'by',
  'where',
  'date',
  'quote',
  'register',
  'reason',
  'reverses',
]);

/** The generated tables, keyed by the marker that holds each one in SURFACE_RETIREMENT_GATE.md. */
export function renderTables(rows = judge()) {
  const by = k => rows.filter(r => r.rec.kind === k);
  const counts = {};
  for (const r of rows) counts[standing(r)] = (counts[standing(r)] || 0) + 1;
  const ruled = rows.filter(r => r.rec.ruling).length;
  const summary = [
    '| Verdict | Surfaces |',
    '| --- | ---: |',
    ...VERDICTS.map(v => `| ${v} | ${counts[v] || 0} |`),
    `| Total judged | ${rows.length} |`,
    `| Of these, owner rulings over the function | ${ruled} |`,
  ];
  const place = e =>
    e.role
      ? `${e.role}${e.destination ? `, ${e.destination}` : ', no destination'}`
      : '';
  const pages = [
    '| Surface | Path | Place | Unique | Links / Library / cited | Cost signals | Exposure | Verdict | Consequence for 166 |',
    '| --- | --- | --- | --- | --- | --- | --- | --- | --- |',
    ...by('page').map(({ rec, e, d }) => {
      const x = rec.exposure || {};
      const inv = inventory().surfaces.find(s => s.id === rec.inventoryId);
      return `| ${esc2(rec.name)} | \`${inv ? inv.path : ''}\` | ${place(e)} | ${rec.unique}${rec.replacement ? ` (${esc2(rec.replacement)})` : ''} | ${useCell(e)} | ${costCell(e)} | ${esc2(exposureList(x, e))} | ${verdictCell(d, rec.kind, rec)} | ${esc2(rec.consequence || 'none')} |`;
    }),
  ];
  const others = [
    '| Item | Kind | Unique | Links / Library / cited | Cost signals | Exposure | Verdict | Consequence for 166 |',
    '| --- | --- | --- | --- | --- | --- | --- | --- |',
    ...[...by('section'), ...by('facet'), ...by('activity-format')].map(
      ({ rec, e, d }) => {
        const x = rec.exposure || {};
        return `| ${esc2(rec.name)} | ${rec.kind} | ${rec.unique}${rec.replacement ? ` (${esc2(rec.replacement)})` : ''} | ${useCell(e)} | ${costCell(e)} | ${esc2(exposureList(x, e))} | ${verdictCell(d, rec.kind, rec)} | ${esc2(rec.consequence || 'none')} |`;
      }
    ),
  ];
  const formats = [
    '| Format | Persisted | Unique | Importers | Exposure | Verdict | Consequence |',
    '| --- | --- | --- | ---: | --- | --- | --- |',
    ...by('stored-format').map(({ rec, e, d }) => {
      const x = rec.exposure || {};
      return `| \`${esc2(rec.name)}\` | ${esc2(rec.persisted)} | ${rec.unique} | ${e.use.shippedLinks} | ${esc2(list([...((x.records || []).length ? ['record'] : []), ...((x.stateLinks || []).length ? ['link'] : [])]))} | ${verdictCell(d, rec.kind, rec)} | ${esc2(rec.consequence || 'none')} |`;
    }),
  ];
  const evidence = [
    '| Item | Source lines · tests · generated · strings · precache KB · axe rows | Measured by |',
    '| --- | --- | --- |',
    ...rows
      .filter(
        r =>
          r.rec.measure &&
          Object.keys(r.rec.measure).length &&
          r.rec.kind !== 'stored-format'
      )
      .map(
        ({ rec, e }) =>
          `| ${esc2(rec.name)} | ${costNumbers(e)} | ${rec.measure.pages ? `pages ${rec.measure.pages.map(p => `\`${p}\``).join(', ')}` : rec.measure.files ? 'named files' : 'library and tests'} |`
      ),
  ];
  return { summary, pages, others, formats, evidence };
}

const MARK = k => [`<!-- surface-gate:${k} -->`, `<!-- /surface-gate:${k} -->`];

/** The document with every generated region replaced by its table. */
export function renderDoc(text, tables = renderTables()) {
  let out = text;
  for (const [k, lines] of Object.entries(tables)) {
    const [a, b] = MARK(k);
    const i = out.indexOf(a);
    const j = out.indexOf(b);
    if (i < 0 || j < i)
      throw new Error(`SURFACE_RETIREMENT_GATE.md has no region ${a}`);
    out =
      out.slice(0, i + a.length) +
      '\n' +
      lines.join('\n') +
      '\n' +
      out.slice(j);
  }
  return out;
}

/**
 * Problems with the evidence file, as sentences. Empty when it is sound:
 * every record's stored verdict is what decide() gives, every inventory
 * surface and every schema-less format is judged, the named judgments exist,
 * GROUP matches nothing, and the referrer is recorded as unknown.
 */
export function problems(evidence = readEvidence(), inv = inventory()) {
  const out = [];
  const ids = new Set();
  for (const rec of evidence.surfaces) {
    if (ids.has(rec.id)) out.push(`${rec.id} is judged twice`);
    ids.add(rec.id);
    const d = decide(evidenceOf(rec, inv));
    for (const k of ['verdict', 'rule']) {
      if (rec[k] !== d[k])
        out.push(
          `${rec.id}: stored ${k} ${rec[k]} but the function gives ${d[k]}`
        );
    }
    if ((rec.support ?? null) !== d.support)
      out.push(
        `${rec.id}: stored support class ${rec.support} but the function gives ${d.support}`
      );
    if (rec.referrer !== 'UNKNOWN')
      out.push(`${rec.id}: the referrer must be recorded as UNKNOWN`);
    if (!rec.why) out.push(`${rec.id}: no written reason`);
    if (!VERDICTS.includes(rec.verdict))
      out.push(`${rec.id}: ${rec.verdict} is not a verdict`);
    if (rec.ruling !== undefined) {
      const r = rec.ruling;
      for (const k of RULING_PARTS)
        if (typeof r?.[k] !== 'string' || !r[k].trim())
          out.push(`${rec.id}: the owner ruling has no ${k}`);
      if (r?.verdict && !VERDICTS.includes(r.verdict))
        out.push(`${rec.id}: the ruling ${r.verdict} is not a verdict`);
      if (r?.verdict === d.verdict)
        out.push(
          `${rec.id}: the ruling agrees with the function (${d.verdict}), so it is not a ruling over it`
        );
      if (r?.date && !/^\d{4}-\d{2}-\d{2}$/.test(r.date))
        out.push(`${rec.id}: the ruling's date ${r.date} is not YYYY-MM-DD`);
      if (r?.register && !/^D-[A-Z0-9]+-\d+$/.test(r.register))
        out.push(`${rec.id}: ${r.register} is not a register id`);
    }
  }
  for (const s of inv.surfaces) {
    if (!evidence.surfaces.some(r => r.inventoryId === s.id))
      out.push(`inventory surface ${s.id} has no verdict`);
  }
  return out;
}

export async function schemaLessFormats() {
  const { FORMATS } = await import('./formats.mjs');
  return FORMATS.filter(f => !f.schema).map(f => f.name);
}

// --- Command line -------------------------------------------------------------

/** Merge fresh measurements into the evidence file and recompute every verdict. */
export function refresh({ measure = true } = {}) {
  const evidence = readEvidence();
  const inv = inventory();
  const measured = measure ? measureAll(evidence.surfaces) : new Map();
  for (const rec of evidence.surfaces) {
    const m = measured.get(rec.id);
    if (m) {
      rec.cost = m.cost;
      rec.use = m.use;
      rec.cited = m.cited;
    } else {
      rec.cost = rec.cost || {};
      rec.use = rec.use || { shippedLinks: 0, libraryEntries: 0 };
      rec.cited = rec.cited || [];
    }
    rec.referrer = 'UNKNOWN';
    const d = decide(evidenceOf(rec, inv));
    rec.verdict = d.verdict;
    rec.rule = d.rule;
    rec.support = d.support;
  }
  return evidence;
}

async function formatted(file, text) {
  const prettier = await import('prettier');
  const options = (await prettier.resolveConfig(file)) || {};
  return prettier.format(text, { ...options, filepath: file });
}

async function main() {
  const cmd = process.argv[2] || 'check';
  if (cmd === 'measure') {
    // Re-measure the tree and recompute the verdicts. Prettier owns the file's final form.
    const ev = refresh({ measure: true });
    writeFileSync(
      EVIDENCE_FILE,
      await formatted(EVIDENCE_FILE, JSON.stringify(ev))
    );
    console.log(
      `measured ${ev.surfaces.length} records; now run: node tools/surface-gate.mjs write`
    );
  } else if (cmd === 'write') {
    writeFileSync(DOC, renderDoc(readFileSync(DOC, 'utf8')));
    console.log('SURFACE_RETIREMENT_GATE.md tables written');
  } else if (cmd === 'report') {
    for (const { rec, d } of judge())
      console.log(
        `${rec.id.padEnd(40)} ${d.verdict.padEnd(11)} ${d.rule}${rec.ruling ? `  ruled ${rec.ruling.verdict} (${rec.ruling.register})` : ''}`
      );
  } else if (cmd === 'check') {
    const p = problems();
    const doc = readFileSync(DOC, 'utf8');
    if (renderDoc(doc) !== doc)
      p.push(
        'SURFACE_RETIREMENT_GATE.md tables are stale: node tools/surface-gate.mjs write'
      );
    if (p.length) {
      console.error(p.join('\n'));
      process.exit(1);
    }
    console.log('surface gate: evidence and tables are consistent');
  } else {
    console.error(
      'usage: node tools/surface-gate.mjs check | write | report | measure'
    );
    process.exit(2);
  }
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  main();
}
