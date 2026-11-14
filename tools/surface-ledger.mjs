#!/usr/bin/env node
// =============================================================================
// The surface ledger: one written record per published surface, and the check
// that nothing is missing from it
// -----------------------------------------------------------------------------
//   npm run surface-ledger          rewrite docs/surface-ledger.json and .md
//   npm run surface-ledger:check    fail when the ledger and the tree disagree
//                                   (node tools/generate.mjs --check --only
//                                   surface-ledger)
//   node tools/surface-ledger.mjs --json    the ledger on stdout
//
// What it is for. Pages are redesigned in many small pull requests, and a page,
// a route or a dialog that no list names is missed by all of them. Five
// inventories already hold parts of the answer (the navigation inventory, the
// walk, the page outlines, the offline tour, the surface gate) and none lists a
// route parameter or a dialog. This file gives every published surface one row
// (kind, what it is for, who it is for, its first real action, the job of the
// page, its owner and its disposition), so a tranche can be closed by reading
// rows.
//
// What is kept and what is read. The ledger stores only what no inventory
// holds. Whether a page is in the sitemap or the offline tour, its walk row,
// its outline record, its gate id and its destination are READ from those files
// when the view is written and when the check runs, and are never copied into
// the JSON. The definition columns of a row (locator, purpose, audience,
// primary action, job, template, owner, supporting prompts, the measurement
// states) come from tools/surface-ledger-seed.json; the status columns
// (disposition, redesign, reason, sitemap reason, decision) are written by the
// prompt that closes the row and are kept on regenerate.
//
// What the check fails on, and why each one. See checkLedger().
//
// Never loaded by the application. This is a tool: nothing under js/ imports it.
// =============================================================================

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as prettierNamespace from 'prettier';

const prettier = prettierNamespace.format
  ? prettierNamespace
  : prettierNamespace.default;

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const LEDGER_PATH = 'docs/surface-ledger.json';
export const VIEW_PATH = 'docs/surface-ledger.md';
export const SEED_PATH = 'tools/surface-ledger-seed.json';
const REGISTER_PATH = 'DECISION_REGISTER.md';

// --- The vocabularies ---------------------------------------------------------

/** What a row is. */
export const KINDS = Object.freeze([
  'page',
  'generated-family',
  'route-family',
  'dialog',
  'mode',
  'shared-region',
  'not-a-surface',
]);

/** The job of a surface (Roadmap IV 7.2 item 19): the family it belongs to. */
export const JOBS = Object.freeze([
  'workspace',
  'catalogue',
  'lesson',
  'reference',
  'instructor',
  'entry',
]);

/** Where a row stands. OPEN is the only state that is not an answer. */
export const DISPOSITIONS = Object.freeze([
  'OPEN',
  'REVISED',
  'REVIEWED CLEAR',
  'DEFERRED',
  'NOT A SURFACE',
]);

/** Whether a redesign landed. */
export const REDESIGNS = Object.freeze([
  'LANDED',
  'FOUNDATIONS ONLY',
  'NOT APPLICABLE',
]);

/** The prompts that may close a row, one of them for each. */
export const OWNERS = Object.freeze([
  370, 371, 454, 456, 483, 487, 488, 489, 490, 491, 492, 493, 494, 495, 497,
]);

// --- Reading the tree ---------------------------------------------------------

const git = (args, root) =>
  execFileSync('git', args, {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });

/** The file a navigation path names: a directory is its index.html. */
export function fileOfPath(p) {
  const clean = p.replace(/[?#].*$/, '').replace(/^\//, '');
  return clean === '' || clean.endsWith('/') ? `${clean}index.html` : clean;
}

/** A glob (`*` within a directory, `**` across them) as a test. */
export function globTest(glob) {
  const re = glob
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*/g, '@@ANY@@')
    .replace(/\*/g, '[^/]+')
    .replace(/@@ANY@@/g, '.+');
  return new RegExp(`^${re}$`);
}

/** The route parameters the code reads from an address, as (file, param) pairs. */
export function scanReads(files, read) {
  const hits = [];
  for (const file of files) {
    const text = read(file);
    if (text == null || !/URLSearchParams|searchParams/.test(text)) continue;
    const params = new Set();
    for (const m of text.matchAll(
      /\.(?:get|has|getAll)\(\s*['"]([A-Za-z_][\w-]*)['"]\s*\)/g
    ))
      params.add(m[1]);
    hits.push({ file, params: [...params].sort() });
  }
  return hits;
}

/** Dialogs: role dialog or alertdialog elements, and native `<dialog>`s. */
export function scanDialogs(page, html) {
  const out = [];
  for (const m of html.matchAll(/<(\w+)((?:\s[^>]*?)?)>/g)) {
    const tag = m[1].toLowerCase();
    const attrs = m[2];
    const native = tag === 'dialog';
    if (!native && !/\srole="(?:alert)?dialog"/.test(attrs)) continue;
    const id = /\sid="([^"]+)"/.exec(attrs)?.[1] ?? null;
    out.push({ page, element: id, native });
  }
  return out;
}

/** What the tree holds that the ledger is held to. */
export async function readInventory(root = ROOT) {
  const { pages } = await import(
    pathToFileURL(path.join(root, 'tools/csp.mjs'))
  );
  const { assembledIndexHtml } = await import(
    pathToFileURL(path.join(root, 'tools/index-fragments.mjs'))
  );
  const json = f => JSON.parse(readFileSync(path.join(root, f), 'utf8'));
  const read = f => {
    const abs = path.join(root, f);
    return existsSync(abs) ? readFileSync(abs, 'utf8') : null;
  };
  const tracked = git(['ls-files'], root).split('\n').filter(Boolean);
  const pageFiles = pages();
  const dialogs = [];
  for (const file of [...pageFiles, 'history/original/index.html']) {
    const html = file === 'index.html' ? assembledIndexHtml() : read(file);
    if (html == null) continue;
    dialogs.push(...scanDialogs(file, html));
  }
  const sitemap = new Set(
    [...(read('sitemap.xml') ?? '').matchAll(/<loc>([^<]+)<\/loc>/g)].map(
      m => new URL(m[1]).pathname
    )
  );
  const code = tracked.filter(
    f => /^js\/.+\.js$/.test(f) && !/^js\/(vendor|i18n|data)\//.test(f)
  );
  return {
    pages: pageFiles,
    tracked,
    nav: json('tools/navigation-inventory.json'),
    contract: json('tools/interaction-contract.json'),
    outlines: json('tools/page-outlines.json'),
    offline: json('tools/offline-pages.json'),
    gate: json('tools/surface-gate.json'),
    sitemap,
    dialogs,
    reads: scanReads(code, read),
    read,
    assembledIndex: assembledIndexHtml(),
  };
}

// --- Building the ledger -------------------------------------------------------

const ALL_KEYS = [
  'id',
  'kind',
  'locator',
  'purpose',
  'audience',
  'primary_action',
  'job',
  'template',
  'disposition',
  'redesign',
  'owner',
  'supporting',
  'reason',
  'sitemap_reason',
  'decision',
  'note',
  'measure',
];

/**
 * The ledger: definitions from the seed, status columns from the committed file.
 *
 * @param {object} seed - The seed document
 * @param {object|null} existing - The committed ledger, if any
 * @returns {object} The ledger document
 */
export function buildLedger(seed, existing) {
  const kept = new Map((existing?.rows ?? []).map(r => [r.id, r]));
  const rows = seed.rows.map(s => {
    const k = kept.get(s.id) ?? {};
    const row = {
      id: s.id,
      kind: s.kind,
      locator: s.locator,
      purpose: s.purpose,
      audience: s.audience,
      primary_action: s.primary_action,
      job: s.job ?? null,
      template: s.template ?? null,
      disposition: k.disposition ?? s.disposition ?? 'OPEN',
      redesign: k.redesign ?? s.redesign ?? null,
      owner: s.owner,
      supporting: s.supporting ?? [],
      reason: k.reason ?? s.reason ?? '',
      sitemap_reason: k.sitemap_reason ?? s.sitemap_reason ?? '',
      decision: k.decision ?? s.decision ?? '',
      note: s.note ?? '',
      measure: s.measure ?? [],
    };
    return Object.fromEntries(ALL_KEYS.map(key => [key, row[key]]));
  });
  return {
    format: 'gravitas.surface-ledger/1',
    about:
      'One row per published surface of the product (Roadmap IV, Appendix E): every page, generated family, route parameter, dialog, mode and shared region. Whether a page is in the sitemap or the offline tour, its walk row, outline record, gate id and destination are read from their own files and are in the Markdown view, not here. The definition columns come from tools/surface-ledger-seed.json; disposition, redesign, reason, sitemap_reason and decision are written by the prompt that closes the row. A row is OPEN until its owner closes it; DEFERRED with redesign FOUNDATIONS ONLY needs a decision row of the register.',
    vocabularies: {
      kinds: [...KINDS],
      jobs: [...JOBS],
      dispositions: [...DISPOSITIONS],
      redesigns: [...REDESIGNS],
      owners: [...OWNERS],
    },
    scan: {
      about:
        'Files that read the address through URLSearchParams or searchParams and are not a reader of any route row, each with the reason.',
      ignored: seed.scan?.ignored ?? existing?.scan?.ignored ?? [],
    },
    rows,
  };
}

// --- The check -----------------------------------------------------------------

/** The page file a row stands for, or null. */
function rowFile(row, nav) {
  if (row.kind !== 'page' && !row.locator?.nav) return null;
  const surface = nav.surfaces.find(s => s.id === row.locator?.nav);
  return surface ? fileOfPath(surface.path) : null;
}

/**
 * What disagrees. Pure: the inventory comes in as a value.
 *
 * Fails on, each with its own code:
 *  - bad-row            a column outside its vocabulary, a repeated id
 *  - page-no-row        a published page no row and no navigation surface covers
 *  - nav-no-row         a navigation surface with no row
 *  - nav-unknown        a row names a navigation id the inventory does not hold
 *  - row-file-gone      a file, folder, reader or page a row points at is gone
 *  - family-count       a generated family whose files are not the stated count
 *  - param-no-row       a route parameter the code reads that no row declares
 *  - reader-stale       a row declares a parameter its reader no longer holds
 *  - dialog-no-row      a dialog or native dialog with no row
 *  - opener-gone        a dialog's opener selector is not in its page
 *  - sitemap-reason     a page missing from the sitemap whose row says nothing
 *  - closed-no-reason   a closed row with no reason
 *  - combination        a disposition and a redesign that do not go together
 *  - deferral-unrecorded  DEFERRED without a register row naming the deferral
 *  - owner              an owner outside the list of closing prompts
 *
 * @param {object} i - { ledger, inventory, registerIds }
 * @returns {Array<{code: string, id: string, message: string}>} Problems
 */
export function checkLedger({ ledger, inventory, registerIds }) {
  const problems = [];
  const add = (code, id, message) => problems.push({ code, id, message });
  const rows = ledger.rows ?? [];
  const seen = new Set();
  const tracked = new Set(inventory.tracked);
  const exists = f =>
    tracked.has(f) ||
    inventory.tracked.some(t => t.startsWith(`${f.replace(/\/$/, '')}/`));
  const globFiles = g => inventory.tracked.filter(f => globTest(g).test(f));

  for (const row of rows) {
    if (seen.has(row.id)) add('bad-row', row.id, `${row.id} appears twice`);
    seen.add(row.id);
    if (!KINDS.includes(row.kind))
      add(
        'bad-row',
        row.id,
        `${row.id}: kind "${row.kind}" is not one of ${KINDS}`
      );
    if (row.job != null && !JOBS.includes(row.job))
      add(
        'bad-row',
        row.id,
        `${row.id}: job "${row.job}" is not one of ${JOBS}`
      );
    if (row.kind !== 'not-a-surface' && !JOBS.includes(row.job))
      add('bad-row', row.id, `${row.id}: a surface has a job (${JOBS})`);
    if (!DISPOSITIONS.includes(row.disposition))
      add(
        'bad-row',
        row.id,
        `${row.id}: disposition "${row.disposition}" is not one of ${DISPOSITIONS}`
      );
    if (row.redesign != null && !REDESIGNS.includes(row.redesign))
      add(
        'bad-row',
        row.id,
        `${row.id}: redesign "${row.redesign}" is not one of ${REDESIGNS}`
      );
    if (!OWNERS.includes(row.owner))
      add(
        'owner',
        row.id,
        `${row.id}: owner ${row.owner} is not one of the closing prompts ${OWNERS}`
      );

    // The status columns of a closed row.
    const closed = row.disposition !== 'OPEN';
    if (closed && !String(row.reason ?? '').trim())
      add(
        'closed-no-reason',
        row.id,
        `${row.id} is ${row.disposition} with no reason`
      );
    const d = row.disposition;
    const r = row.redesign;
    const bad = msg => add('combination', row.id, `${row.id}: ${msg}`);
    if (d === 'REVISED' && r !== 'LANDED') bad('REVISED needs redesign LANDED');
    if (d === 'REVIEWED CLEAR' && r !== 'NOT APPLICABLE')
      bad('REVIEWED CLEAR needs redesign NOT APPLICABLE');
    if (
      d === 'NOT A SURFACE' &&
      (row.kind !== 'not-a-surface' || r !== 'NOT APPLICABLE')
    )
      bad(
        'NOT A SURFACE belongs to a not-a-surface row with redesign NOT APPLICABLE'
      );
    if (d === 'DEFERRED' && r !== 'FOUNDATIONS ONLY')
      bad('DEFERRED means a deferred redesign: redesign FOUNDATIONS ONLY');
    if (r === 'LANDED' && d !== 'REVISED')
      bad('redesign LANDED belongs to REVISED');
    if (r === 'FOUNDATIONS ONLY' && d !== 'OPEN' && d !== 'DEFERRED')
      bad('FOUNDATIONS ONLY is OPEN, or DEFERRED on a recorded decision');
    if (d === 'DEFERRED') {
      const ok =
        row.decision &&
        (registerIds === undefined || registerIds.has(row.decision));
      if (!ok)
        add(
          'deferral-unrecorded',
          row.id,
          `${row.id} is DEFERRED with FOUNDATIONS ONLY and names no decision register row that records the maintainer's deferral (decision: "${row.decision ?? ''}")`
        );
    }
  }

  // Navigation surfaces and published pages.
  const navIds = new Set(inventory.nav.surfaces.map(s => s.id));
  const rowNav = new Set(rows.map(r => r.locator?.nav).filter(Boolean));
  for (const row of rows)
    if (row.locator?.nav && !navIds.has(row.locator.nav))
      add(
        'nav-unknown',
        row.id,
        `${row.id}: the navigation inventory has no surface "${row.locator.nav}"`
      );
  for (const s of inventory.nav.surfaces)
    if (!rowNav.has(s.id))
      add(
        'nav-no-row',
        s.id,
        `The navigation surface ${s.id} (${s.path}) has no ledger row`
      );

  const covered = new Set();
  const globRows = rows.filter(
    r => r.kind === 'generated-family' || r.locator?.glob
  );
  for (const row of rows) {
    const f = row.kind === 'page' ? rowFile(row, inventory.nav) : null;
    if (f) covered.add(f);
  }
  for (const row of globRows)
    for (const f of globFiles(row.locator.glob)) covered.add(f);
  const navFiles = new Set(
    inventory.nav.surfaces
      .filter(s => !s.path.includes('*'))
      .map(s => fileOfPath(s.path))
  );
  for (const f of inventory.pages)
    if (!covered.has(f) && !navFiles.has(f))
      add(
        'page-no-row',
        f,
        `${f} is a published page with no ledger row and no navigation surface`
      );

  // Files, folders, readers, counts.
  for (const row of rows) {
    const l = row.locator ?? {};
    const need = [];
    if (row.kind === 'page') {
      const f = rowFile(row, inventory.nav);
      if (f) need.push(f);
    }
    if (l.file) need.push(l.file);
    for (const f of l.files ?? []) need.push(f);
    for (const f of l.readers ?? []) need.push(f);
    if (l.page) need.push(l.page);
    if (l.generator) need.push(l.generator);
    for (const f of need)
      if (!exists(f)) add('row-file-gone', row.id, `${row.id}: ${f} is gone`);
    if (l.glob) {
      const n = globFiles(l.glob).length;
      if (n === 0)
        add('row-file-gone', row.id, `${row.id}: no file matches ${l.glob}`);
      if (l.count != null && n !== l.count)
        add(
          'family-count',
          row.id,
          `${row.id}: ${l.glob} matches ${n} files, the row says ${l.count}`
        );
    }
    // A declared parameter is still mentioned by one of the row's readers.
    const params = l.params ?? (l.param ? [l.param] : []);
    const texts = (l.readers ?? [])
      .filter(f => f.endsWith('.js'))
      .map(f => inventory.read(f))
      .filter(t => t != null);
    for (const p of params)
      if (texts.length && !texts.some(t => new RegExp(`\\b${p}\\b`).test(t)))
        add(
          'reader-stale',
          row.id,
          `${row.id}: none of its readers mentions the parameter "${p}"`
        );
  }

  // Route parameters: every file that reads the address and every literal read.
  const ignored = ledger.scan?.ignored ?? [];
  for (const hit of inventory.reads) {
    const ign = ignored.filter(i => i.file === hit.file);
    if (
      ign.some(i => !i.param) &&
      ign.every(i => String(i.reason ?? '').trim())
    )
      continue;
    const readerRows = rows.filter(r =>
      (r.locator?.readers ?? []).includes(hit.file)
    );
    if (!readerRows.length) {
      add(
        'param-no-row',
        hit.file,
        `${hit.file} reads the address (URLSearchParams) and no row names it as a reader`
      );
      continue;
    }
    const declared = new Set(
      readerRows.flatMap(
        r => r.locator.params ?? (r.locator.param ? [r.locator.param] : [])
      )
    );
    for (const p of hit.params)
      if (
        !declared.has(p) &&
        !ign.some(i => i.param === p && String(i.reason ?? '').trim())
      )
        add(
          'param-no-row',
          `${hit.file}:${p}`,
          `${hit.file} reads the parameter "${p}" and no row declares it`
        );
  }
  for (const i of ignored)
    if (!String(i.reason ?? '').trim())
      add(
        'param-no-row',
        i.file,
        `The ignored read of ${i.file} has no reason`
      );

  // Dialogs.
  for (const dlg of inventory.dialogs) {
    const hit = rows.some(
      r =>
        r.kind === 'dialog' &&
        r.locator?.page === dlg.page &&
        r.locator?.element === dlg.element
    );
    if (!hit)
      add(
        'dialog-no-row',
        `${dlg.page}#${dlg.element}`,
        `${dlg.native ? 'The native dialog' : 'The dialog'} #${dlg.element} of ${dlg.page} has no ledger row`
      );
  }
  for (const row of rows) {
    const op = row.locator?.opener;
    if (
      row.kind === 'dialog' &&
      typeof op === 'string' &&
      /^#[\w-]+$/.test(op)
    ) {
      const html =
        row.locator.page === 'index.html'
          ? inventory.assembledIndex
          : (inventory.read(row.locator.page) ?? '');
      if (!new RegExp(`\\sid="${op.slice(1)}"`).test(html))
        add(
          'opener-gone',
          row.id,
          `${row.id}: the opener ${op} is not in ${row.locator.page}`
        );
    }
  }

  // The sitemap.
  const pageRowFiles = new Map();
  for (const row of rows) {
    if (row.kind === 'page') {
      const f = rowFile(row, inventory.nav);
      if (f) pageRowFiles.set(f, row);
    }
    if (row.locator?.glob && row.kind === 'generated-family')
      for (const f of globFiles(row.locator.glob)) pageRowFiles.set(f, row);
  }
  for (const [file, row] of pageRowFiles) {
    if (!inventory.pages.includes(file)) continue;
    const p = `/${file.replace(/index\.html$/, '')}`;
    if (!inventory.sitemap.has(p) && !String(row.sitemap_reason ?? '').trim())
      add(
        'sitemap-reason',
        row.id,
        `${row.id}: ${p} is not in sitemap.xml and the row gives no sitemap_reason`
      );
  }
  return problems;
}

// --- The view ------------------------------------------------------------------

const cell = v =>
  String(v ?? '')
    .replace(/\|/g, '\\|')
    .replace(/\s+/g, ' ')
    .trim() || '—';

/** What the other inventories say about a row, read now. */
export function inventoryColumns(row, inventory) {
  const nav = inventory.nav.surfaces.find(s => s.id === row.locator?.nav);
  const file = row.kind === 'page' ? rowFile(row, inventory.nav) : null;
  const sm =
    file && inventory.pages.includes(file)
      ? inventory.sitemap.has(`/${file.replace(/index\.html$/, '')}`)
        ? 'yes'
        : 'no'
      : row.kind === 'generated-family'
        ? `${globCount(row, inventory.tracked, inventory.sitemap)}`
        : '—';
  const surface = row.locator?.nav;
  const tour =
    file &&
    inventory.offline.pages.some(
      p => p.page === `/${file.replace(/index\.html$/, '')}`
    )
      ? 'yes'
      : file
        ? 'no'
        : '—';
  const walkRows = surface
    ? inventory.contract.inventory.rows
        .filter(r => r.surface === surface)
        .map(r => r.surface)
    : [];
  const walkStates = surface
    ? inventory.contract.inventory.states
        .filter(s => s.surface === surface)
        .map(s => s.id)
    : [];
  const dialogWalk =
    row.kind === 'dialog' || row.kind === 'mode' || row.kind === 'route-family'
      ? inventory.contract.inventory.states
          .filter(s => s.ledger === row.id)
          .map(s => (s.notRun ? `${s.id} (NOT RUN)` : s.id))
      : [];
  const outline = surface
    ? [
        ...(inventory.outlines.pages[surface] ? [surface] : []),
        ...(inventory.outlines.exempt?.[surface] ? ['exempt'] : []),
      ]
    : [];
  const outlineStates =
    row.kind === 'dialog' || row.kind === 'mode' || row.kind === 'route-family'
      ? inventory.contract.inventory.states
          .filter(s => s.ledger === row.id && inventory.outlines.pages[s.id])
          .map(s => s.id)
      : [];
  const gate = surface
    ? inventory.gate.surfaces
        .filter(s => s.inventoryId === surface)
        .map(s => s.id)
    : [];
  return {
    in_sitemap: sm,
    in_tour: tour,
    walk: [...walkRows, ...walkStates, ...dialogWalk].join(', ') || '—',
    outline: [...outline, ...outlineStates].join(', ') || '—',
    gate: gate.join(', ') || '—',
    destination: nav?.destination || '—',
  };
}

function globCount(row, tracked, sitemap) {
  const files = tracked.filter(f => globTest(row.locator.glob).test(f));
  const listed = files.filter(f =>
    sitemap.has(`/${f.replace(/index\.html$/, '')}`)
  ).length;
  return `${listed} of ${files.length}`;
}

const locatorText = row => {
  const l = row.locator ?? {};
  if (l.nav && l.glob) return `${l.glob} (${l.count} files; ${l.generator})`;
  if (l.nav) return `nav ${l.nav}`;
  if (l.param)
    return `${(l.params?.length ? l.params : [l.param]).map(p => `\`${p}\``).join(', ')} via ${l.via ?? 'the address'}: ${(l.readers ?? []).join(', ')}`;
  if (l.element)
    return `#${l.element} in ${l.page}${l.opener ? `; opened by ${l.opener}` : ''}`;
  if (l.glob) return `${l.glob}${l.count != null ? ` (${l.count} files)` : ''}`;
  if (l.files) return l.files.join(', ');
  if (l.file) return l.file;
  if (l.page) return l.page;
  return '—';
};

/** The Markdown view. */
export function renderView(ledger, inventory) {
  const rows = ledger.rows;
  const by = (list, f) => {
    const m = new Map();
    for (const x of list) m.set(f(x), (m.get(f(x)) ?? 0) + 1);
    return m;
  };
  const kinds = by(rows, r => r.kind);
  const owners = by(rows, r => r.owner);
  const dispositions = by(rows, r => r.disposition);
  const out = [
    '# Surface ledger',
    '',
    '<!-- Generated by tools/surface-ledger.mjs from docs/surface-ledger.json and the inventories it reads. Do not edit. -->',
    '',
    `Every published surface has one row in [\`surface-ledger.json\`](surface-ledger.json): ${rows.length} rows. A page is located by its navigation id, a generated family by its generator and file count, a route family by its parameter and the files that read it, a dialog by its element and opener. This is a record of what exists and who closes it, not a judgment of design.`,
    '',
    '- A row is OPEN until its owner closes it (REVISED, REVIEWED CLEAR, DEFERRED or NOT A SURFACE). A row is DEFERRED with redesign FOUNDATIONS ONLY only on a recorded deferral of that redesign by the maintainer; without one it stays OPEN.',
    '- The sitemap, offline-tour, walk, outline, gate and destination columns are read from their own files each time this view is written; they are not stored in the JSON.',
    '- `npm run surface-ledger:check` fails when a page, a route parameter or a dialog has no row. `npm run surface-ledger:measure` measures page length in a browser and writes [`surface-measurements.json`](surface-measurements.json).',
    '',
    '## Counts',
    '',
    '| Kind | Rows |',
    '| --- | ---: |',
    ...KINDS.map(k => `| ${k} | ${kinds.get(k) ?? 0} |`),
    '',
    '| Closing prompt | Rows |',
    '| --- | ---: |',
    ...OWNERS.map(o => `| ${o} | ${owners.get(o) ?? 0} |`),
    '',
    '| Disposition | Rows |',
    '| --- | ---: |',
    ...DISPOSITIONS.map(d => `| ${d} | ${dispositions.get(d) ?? 0} |`),
    '',
  ];
  for (const kind of KINDS) {
    const list = rows.filter(r => r.kind === kind);
    out.push(`## ${kind} (${list.length})`, '');
    out.push(
      '| Id | Locator | Job | Template | Owner | Supporting | Disposition | Redesign | Sitemap | Tour | Walk | Outline | Gate | Destination |',
      '| --- | --- | --- | --- | ---: | --- | --- | --- | --- | --- | --- | --- | --- | --- |'
    );
    for (const r of list) {
      const c = inventoryColumns(r, inventory);
      out.push(
        `| \`${r.id}\` | ${cell(locatorText(r))} | ${cell(r.job)} | ${cell(r.template)} | ${r.owner} | ${cell((r.supporting ?? []).join(', '))} | ${r.disposition} | ${cell(r.redesign)} | ${c.in_sitemap} | ${c.in_tour} | ${cell(c.walk)} | ${cell(c.outline)} | ${cell(c.gate)} | ${c.destination} |`
      );
    }
    out.push('');
    out.push(
      '| Id | Purpose | Audience | First action |',
      '| --- | --- | --- | --- |'
    );
    for (const r of list)
      out.push(
        `| \`${r.id}\` | ${cell(r.purpose)} | ${cell(r.audience)} | ${cell(r.primary_action)} |`
      );
    out.push('');
  }
  const omitted = rows.filter(r => String(r.sitemap_reason ?? '').trim());
  out.push('## Pages missing from the sitemap', '');
  out.push('| Id | Page | Reason |', '| --- | --- | --- |');
  for (const r of omitted)
    out.push(
      `| \`${r.id}\` | ${cell(r.locator?.nav ?? r.locator?.glob)} | ${cell(r.sitemap_reason)} |`
    );
  out.push('');
  const ignored = ledger.scan?.ignored ?? [];
  out.push('## Files that read the address and are not a route', '');
  out.push('| File | Reason |', '| --- | --- |');
  for (const i of ignored) out.push(`| \`${i.file}\` | ${cell(i.reason)} |`);
  out.push('');
  return out.join('\n');
}

// --- Files ---------------------------------------------------------------------

async function format(text, parser, root = ROOT) {
  const options = JSON.parse(
    await readFile(path.join(root, '.prettierrc.json'), 'utf8')
  );
  return prettier.format(text, { ...options, parser });
}

/** The two output texts for a ledger. */
export async function renderFiles(ledger, inventory, root = ROOT) {
  return {
    json: await format(JSON.stringify(ledger), 'json', root),
    view: await format(renderView(ledger, inventory), 'markdown', root),
  };
}

/** The ids of the decision register's rows. */
export function registerRowIds(root = ROOT) {
  const file = path.join(root, REGISTER_PATH);
  if (!existsSync(file)) return undefined;
  return new Set(
    [...readFileSync(file, 'utf8').matchAll(/^\| (D-[^ |]+) \|/gm)].map(
      m => m[1]
    )
  );
}

/**
 * Regenerate in memory and say what disagrees on disk.
 *
 * @param {string} [root] - Repository root
 * @returns {Promise<object>} problems, stale files, the ledger, its files
 */
export async function runCheck(root = ROOT) {
  const inventory = await readInventory(root);
  const seed = JSON.parse(readFileSync(path.join(root, SEED_PATH), 'utf8'));
  const ledgerFile = path.join(root, LEDGER_PATH);
  const committed = existsSync(ledgerFile)
    ? JSON.parse(readFileSync(ledgerFile, 'utf8'))
    : null;
  const next = buildLedger(seed, committed);
  const problems = checkLedger({
    ledger: committed ?? next,
    inventory,
    registerIds: registerRowIds(root),
  });
  if (!committed)
    problems.unshift({
      code: 'bad-row',
      id: LEDGER_PATH,
      message: `${LEDGER_PATH} does not exist`,
    });
  const files = await renderFiles(next, inventory, root);
  const stale = [];
  for (const [file, text] of [
    [LEDGER_PATH, files.json],
    [VIEW_PATH, files.view],
  ]) {
    const onDisk = existsSync(path.join(root, file))
      ? readFileSync(path.join(root, file), 'utf8')
      : null;
    if (onDisk !== text) stale.push(file);
  }
  return { problems, stale, ledger: next, files, inventory };
}

async function main(argv) {
  const result = await runCheck();
  if (argv.includes('--json')) {
    process.stdout.write(result.files.json);
    return 0;
  }
  if (argv.includes('--write')) {
    await writeFile(path.join(ROOT, LEDGER_PATH), result.files.json);
    await writeFile(path.join(ROOT, VIEW_PATH), result.files.view);
    console.log(
      `Wrote ${LEDGER_PATH} (${result.ledger.rows.length} rows) and ${VIEW_PATH}.`
    );
    return 0;
  }
  // --check (the default)
  if (result.problems.length) {
    console.error(
      `The surface ledger disagrees with the tree (${result.problems.length}):`
    );
    for (const p of result.problems.slice(0, 40))
      console.error(`  ${p.message}`);
    if (result.problems.length > 40)
      console.error(`  ... and ${result.problems.length - 40} more`);
    const codes = new Set(result.problems.map(p => p.code));
    if (
      codes.has('page-no-row') ||
      codes.has('param-no-row') ||
      codes.has('dialog-no-row')
    )
      console.error(
        'A new page, route parameter or dialog needs a row: add it to tools/surface-ledger-seed.json with its owner (one of the closing prompts) and run npm run surface-ledger.'
      );
    return 1;
  }
  if (result.stale.length) {
    console.error(
      `${result.stale.join(' and ')} is stale: run npm run surface-ledger and commit the result.`
    );
    return 1;
  }
  console.log(
    `The surface ledger matches the tree: ${result.ledger.rows.length} rows.`
  );
  return 0;
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  process.exit(await main(process.argv.slice(2)));
}
