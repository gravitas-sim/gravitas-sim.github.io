#!/usr/bin/env node
// =============================================================================
// The catalog ledger: one written record per activity, and the check that
// nothing is missing from it
// -----------------------------------------------------------------------------
//   npm run ledger            rewrite docs/catalog-ledger.json and .md
//   npm run ledger:check      fail when the ledger and the shipped inventory
//                             disagree (node tools/generate.mjs --check
//                             --only ledger)
//   node tools/catalog-ledger.mjs --record <row id>...
//                             record the current content hash of closed rows
//   node tools/catalog-ledger.mjs --json    the ledger on stdout
//
// What it is for. The improvement of the catalog is done in many small pull
// requests, and a lesson nobody reviewed, or one reviewed and then edited
// again, is invisible in all of them. This file gives every investigation,
// activity, bench lab, built-in course, sequence and scenario one row, with
// what was reviewed, what was changed and which prompt owns it, so that a
// tranche can be closed by reading the rows rather than by remembering.
//
// What is derived and what is kept. The generator derives a row's identity
// and its files (canonical sources, Spanish shadows, instrument modules), its
// depth and step counts and its place in sequences and courses from the
// generated inventory (library/library.json and the lesson sources). Everything
// a person or a content prompt writes (the answers to the five questions, leak
// status, the editorial and redesign status, step revisions, the phone and
// keyboard walk, the merged pull request and the content hash) is kept on
// regenerate. A row created for the first time takes its owner, audit
// disposition, scene class, limits and open items from
// tools/catalog-ledger-seed.json, values read once from the planning audit and
// kept as data; the planning files themselves live outside every checkout and
// are never read here.
//
// What the check fails on, and why each one. See checkLedger().
//
// Never loaded by the application. This is a tool: nothing under js/ imports it.
// =============================================================================

import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as prettierNamespace from 'prettier';
import { importClosure } from './source-closure.mjs';

// Prettier's exports arrive in two shapes (Jest's ESM interop and Node's own
// loader); same reason as tools/build-instruments.mjs.
const prettier = prettierNamespace.format
  ? prettierNamespace
  : prettierNamespace.default;

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const LEDGER_PATH = 'docs/catalog-ledger.json';
export const VIEW_PATH = 'docs/catalog-ledger.md';
export const SEED_PATH = 'tools/catalog-ledger-seed.json';
const LIBRARY_PATH = 'library/library.json';
const REGISTER_PATH = 'DECISION_REGISTER.md';

// --- The vocabularies ---------------------------------------------------------

/** The audit's three dispositions for an investigation (planning data). */
export const AUDIT = Object.freeze(['STRONG', 'FOCUSED', 'REDESIGN']);

/** The editorial pass over a row's words. */
export const EDITORIAL = Object.freeze(['REVISED', 'REVIEWED CLEAR', 'OPEN']);

/** The redesign pass over a row's task and scene. */
export const REDESIGN = Object.freeze([
  'REVISED',
  'REVIEWED CLEAR',
  'CONSOLIDATED',
  'DEFERRED',
  'OPEN',
]);

/** A row's phone and keyboard walk. */
export const WALK = Object.freeze(['VERIFIED', 'NOT VERIFIED', 'NOT RUN']);

/** What a scenario's own review can say. */
export const SCENARIO_DISPOSITION = Object.freeze([
  'OPEN',
  'REVISED',
  'REVIEWED CLEAR',
  'DEFERRED',
]);

/** What the main scene is for a lesson (computed from its stage builder). */
export const SCENE_CLASS = Object.freeze([
  'setup scenario',
  'engine-integrated stage',
  'model-owned stage',
  'portrait or backdrop',
  'no scene',
]);

/** The leak levels of the lesson standard, L1 to L5. */
export const LEAK_LEVELS = Object.freeze(['L1', 'L2', 'L3', 'L4', 'L5']);

/** The five questions of the lesson standard. */
export const QUESTIONS = Object.freeze(['Q1', 'Q2', 'Q3', 'Q4', 'Q5']);

/** Scenario owners: the sandbox families, and the 3-D lab's eight systems. */
export const SANDBOX_SCENARIO_OWNERS = Object.freeze([
  462, 463, 464, 465, 466, 482,
]);
export const SYSTEM3D_SCENARIO_OWNER = 494;

/** Library entry kinds that become rows, with the row kind each one takes. */
const ROW_KIND = Object.freeze({
  investigation: 'investigation',
  activity: 'activity',
  experiment: 'experiment',
  course: 'course',
});

/**
 * Where each guide set keeps its English words; the Spanish file is the
 * shadow. Mirrors the guide sets of tools/build-library.mjs.
 */
const GUIDE_CATALOGS = Object.freeze({
  'js/observatory/guides/exoplanet.js': [
    'js/i18n/en.exoplanet.js',
    'js/i18n/es.exoplanet.js',
  ],
  'js/observatory/guides/populations.js': [
    'js/i18n/en.populations.js',
    'js/i18n/es.populations.js',
  ],
  'js/lab3d/guides/curriculum.js': [
    'js/i18n/en.lab3dGuides.js',
    'js/i18n/es.lab3dGuides.js',
  ],
  'js/mission/lab/curriculum.js': [
    'js/i18n/en.missionLabGuides.js',
    'js/i18n/es.missionLabGuides.js',
  ],
});

const ACTIVITY_CATALOGS = [
  'js/i18n/en.activities.js',
  'js/i18n/es.activities.js',
];
const EXPERIMENT_CATALOGS = [
  'js/i18n/en.experiments.js',
  'js/i18n/es.experiments.js',
];
const LESSON_DIR = 'js/data/investigations';

/** Library entries that are not rows, and why. */
const OUT_OF_SCOPE_KINDS = Object.freeze({
  dataset:
    'Datasets are accounted for through the guides and lessons that use them; they are not edited as data.',
});
const OUT_OF_SCOPE_FORMATS = Object.freeze({
  'course-pack':
    'A community course pack. It is not edited by the catalog work and is kept opening by the compatibility corpus, so the seven courses of the Library are six rows and this one entry.',
});

// --- Small helpers -------------------------------------------------------------

const unique = list => [...new Set(list)].sort();

/** A stable JSON text of a value: keys sorted, so a digest ignores order. */
function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object')
    return `{${Object.keys(value)
      .sort()
      .map(k => `${JSON.stringify(k)}:${canonical(value[k])}`)
      .join(',')}}`;
  return JSON.stringify(value) ?? 'null';
}

/**
 * The files an import closure reaches under one directory.
 *
 * @param {string} root - Repository root
 * @param {string} entry - Repository-relative entry file
 * @param {string} under - Keep only files under this repository-relative path
 * @returns {string[]} Sorted files, the entry first when it is kept
 */
function closureUnder(root, entry, under) {
  if (!existsSync(path.join(root, entry))) return [];
  const { files } = importClosure({ root, entries: [entry] });
  const kept = files.filter(f => f.startsWith(`${under}/`));
  return kept.includes(entry)
    ? [entry, ...kept.filter(f => f !== entry)]
    : kept;
}

/**
 * Instrument id to the module that provides it, from the lazy families of
 * js/widgets.js (the one catalog the engine itself loads instruments by).
 *
 * @param {string} root - Repository root
 * @returns {Promise<Map<string, string>>} Instrument id -> repository-relative
 *   module
 */
export async function instrumentModules(root) {
  const { LAZY_FAMILIES } = await import(
    pathToFileURL(path.join(root, 'js/widgets.js')).href
  );
  const out = new Map();
  for (const family of Object.values(LAZY_FAMILIES)) {
    const file = path.posix.join('js', family.path.replace(/^\.\//, ''));
    for (const id of family.ids) out.set(id, file);
  }
  return out;
}

/** Every instrument id a lesson's steps name. */
function toolIds(lesson) {
  return unique(
    (lesson?.steps || []).flatMap(s => (s?.tool?.id ? [s.tool.id] : []))
  );
}

/** Steps in a Spanish shadow: keyed by sid (an object) or, in a pack, listed. */
const spanishSteps = steps =>
  Array.isArray(steps) ? steps.length : Object.keys(steps ?? {}).length;

const countBy = (steps, key) => {
  const out = {};
  for (const s of steps)
    out[s[key] || 'core'] = (out[s[key] || 'core'] || 0) + 1;
  return out;
};

// --- The inventory --------------------------------------------------------------

/**
 * What ships, read from the generated inventory and the lesson sources.
 *
 * @param {string} [root] - Repository root
 * @returns {Promise<object>} Inventory: `rows` (inventory records for every
 *   row kind), `scenarios`, `outOfScope`, `words` (the digest input of each
 *   entry) and `counts`
 */
export async function readInventory(root = ROOT) {
  const library = JSON.parse(
    await readFile(path.join(root, LIBRARY_PATH), 'utf8')
  );
  const modules = await instrumentModules(root);
  const load = file => import(pathToFileURL(path.join(root, file)).href);
  const hasEs = e => Boolean(e.title?.es);

  /** Sequences and courses an investigation sits in, as the Library lists. */
  const placement = e => ({
    sequences: (e.rel?.in || [])
      .filter(r => r[0] === 'seq')
      .map(r => ({ id: r[1], position: r[2] })),
    courses: (e.rel?.in || [])
      .filter(r => r[0] === 'course')
      .map(r => ({ id: r[1], position: r[2] })),
  });

  const rows = [];
  const words = {};
  const outOfScope = [];
  const sequenceFile = `${LESSON_DIR}/sequences.js`;

  for (const e of library.entries) {
    const [, name] = e.id.split(/:(.*)/s);
    if (OUT_OF_SCOPE_KINDS[e.kind]) continue;
    if (OUT_OF_SCOPE_FORMATS[e.format]) {
      outOfScope.push({
        id: e.id,
        reason: OUT_OF_SCOPE_FORMATS[e.format],
      });
      continue;
    }
    if (e.kind === 'scenario') continue;
    const kind = ROW_KIND[e.kind];
    if (!kind) continue;
    const row = {
      id: e.id,
      kind,
      format: e.format,
      title: e.title.en,
      source: [],
      shadows: [],
      instrument_files: [],
      depths: null,
      languages: hasEs(e) ? ['en', 'es'] : ['en'],
      sequences: [],
      courses: [],
    };
    words[e.id] = canonical({
      title: e.title,
      summary: e.summary,
      steps: e.steps,
      depths: e.depths,
      units: e.units,
    });

    if (e.kind === 'investigation' && e.format === 'lesson') {
      const own = `${LESSON_DIR}/${name}.js`;
      const depth = `${LESSON_DIR}/depth/${name}.js`;
      const es = `${LESSON_DIR}/es/${name}.js`;
      const depthEs = `${LESSON_DIR}/depth/es/${name}.js`;
      row.source = unique([
        ...closureUnder(root, own, LESSON_DIR),
        ...closureUnder(root, depth, LESSON_DIR),
      ]);
      row.shadows = unique([
        ...closureUnder(root, es, LESSON_DIR),
        ...closureUnder(root, depthEs, LESSON_DIR),
      ]);
      const lesson = (await load(own)).default;
      const deeper = existsSync(path.join(root, depth))
        ? (await load(depth)).default
        : null;
      const tools = unique([...toolIds(lesson), ...toolIds(deeper)]);
      const unresolved = tools.filter(t => !modules.has(t));
      if (unresolved.length)
        throw new Error(
          `${e.id}: instrument ids with no module in js/widgets.js: ${unresolved.join(', ')}`
        );
      row.instrument_files = unique(tools.map(t => modules.get(t)));
      const deepCounts = countBy(deeper?.steps || [], 'depth');
      row.depths = {
        core: lesson.steps.length,
        quantitative: deepCounts.quantitative || 0,
        advanced: deepCounts.advanced || 0,
      };
      row.spanish_steps = {
        core: spanishSteps((await load(es)).default.steps),
        deeper: existsSync(path.join(root, depthEs))
          ? spanishSteps((await load(depthEs)).default.steps)
          : 0,
      };
    } else if (e.kind === 'investigation') {
      const catalogs = GUIDE_CATALOGS[e.source];
      if (!catalogs)
        throw new Error(`${e.id}: no catalogs known for guide set ${e.source}`);
      row.source = unique([e.source, catalogs[0]]);
      row.shadows = [catalogs[1]];
      row.depths = { core: e.steps };
    } else if (e.kind === 'activity') {
      row.source = unique([e.source, ACTIVITY_CATALOGS[0]]);
      row.shadows = [ACTIVITY_CATALOGS[1]];
      row.depths = { core: e.steps ?? null };
    } else if (e.kind === 'experiment') {
      row.source = unique([e.source, EXPERIMENT_CATALOGS[0]]);
      row.shadows = [EXPERIMENT_CATALOGS[1]];
    } else if (e.kind === 'course') {
      row.source = [`js/data/courses/${name}.js`];
    }
    Object.assign(row, e.kind === 'investigation' ? placement(e) : {});
    rows.push(row);
  }

  for (const s of library.sequences) {
    const id = `sequence:${s.id}`;
    rows.push({
      id,
      kind: 'sequence',
      format: 'sequence',
      title: s.title.en,
      source: [sequenceFile],
      shadows: [],
      instrument_files: [],
      depths: null,
      languages: s.title?.es ? ['en', 'es'] : ['en'],
      sequences: [],
      courses: [],
      entries: s.entries,
    });
    words[id] = canonical({
      title: s.title,
      blurb: s.blurb,
      entries: s.entries,
      depths: s.depths,
    });
  }

  const scenarios = library.entries
    .filter(e => e.kind === 'scenario')
    .map(e => ({
      id: e.id,
      format: e.format,
      card_title: e.title.en,
    }));
  const datasets = library.entries.filter(e => e.kind === 'dataset').length;

  return {
    rows: rows.sort((a, b) => (a.id < b.id ? -1 : 1)),
    scenarios,
    outOfScope,
    outOfScopeKinds: Object.keys(OUT_OF_SCOPE_KINDS),
    datasets,
    words,
  };
}

// --- Building the ledger --------------------------------------------------------

/** The fields a person or a content prompt writes, with their empty values. */
function blankHuman() {
  return {
    owner: null,
    audit: null,
    scene_class: null,
    limits: null,
    open_items: [],
    questions: Object.fromEntries(QUESTIONS.map(q => [q, ''])),
    leak: Object.fromEntries(LEAK_LEVELS.map(l => [l, ''])),
    task_rule_items: [],
    editorial: 'OPEN',
    redesign: 'OPEN',
    reason: '',
    step_revisions: [],
    walk: 'NOT RUN',
    pr: null,
    hash: null,
  };
}

const DERIVED_ROW_FIELDS = [
  'id',
  'kind',
  'format',
  'title',
  'source',
  'shadows',
  'instrument_files',
  'depths',
  'spanish_steps',
  'languages',
  'sequences',
  'courses',
];

/** What a first-time row takes from the seed. */
function seedFor(seed, row) {
  const name = row.id.split(/:(.*)/s)[1];
  const bucket =
    {
      investigation: seed.investigations,
      activity: seed.activities,
      experiment: seed.experiments,
      course: seed.courses,
      sequence: seed.sequences,
    }[row.kind] || {};
  return bucket[name] || {};
}

/**
 * The ledger the inventory and the kept human fields make.
 *
 * @param {object} inventory - From readInventory()
 * @param {object} seed - tools/catalog-ledger-seed.json
 * @param {object|null} existing - The committed ledger, or null
 * @returns {object} The ledger document
 */
export function buildLedger(inventory, seed, existing) {
  const kept = new Map((existing?.rows || []).map(r => [r.id, r]));
  const rows = inventory.rows.map(inv => {
    const before = kept.get(inv.id);
    const human = { ...blankHuman(), ...seedFor(seed, inv) };
    const row = {};
    for (const f of DERIVED_ROW_FIELDS)
      if (inv[f] !== undefined) row[f] = inv[f];
    for (const f of Object.keys(blankHuman())) {
      row[f] = before && f in before ? before[f] : human[f];
    }
    return row;
  });

  const keptScenarios = new Map(
    (existing?.scenarios || []).map(s => [s.id, s])
  );
  const seedScenarios = new Map(
    (seed.scenarios || []).map(s => [`scenario:${s.id}`, s])
  );
  const scenarios = inventory.scenarios.map(inv => {
    const before = keptScenarios.get(inv.id);
    const seeded = seedScenarios.get(inv.id) || {};
    const human = {
      family: seeded.family ?? null,
      planning: seeded.planning ?? null,
      owner: seeded.owner ?? null,
      disposition: 'OPEN',
      reason: '',
      pr: null,
    };
    const row = { id: inv.id, format: inv.format, card_title: inv.card_title };
    for (const f of Object.keys(human))
      row[f] = before && f in before ? before[f] : human[f];
    return row;
  });

  return {
    generated: 'tools/catalog-ledger.mjs',
    format: 'gravitas.catalog-ledger',
    formatVersion: 1,
    vocabulary: {
      audit: AUDIT,
      editorial: EDITORIAL,
      redesign: REDESIGN,
      walk: WALK,
      scene_class: SCENE_CLASS,
      scenario_disposition: SCENARIO_DISPOSITION,
      scenario_owners: {
        sandbox: SANDBOX_SCENARIO_OWNERS,
        system3d: [SYSTEM3D_SCENARIO_OWNER],
      },
    },
    notes: [
      'One row per shipped investigation (a lesson, a guide of the Observatory, the 3-D lab or the mission lab), activity entry, bench lab, built-in course and sequence, and a `scenarios` sheet with one row per Library scenario. Rows are derived from library/library.json and the lesson sources; the fields a person writes are kept on regenerate.',
      'The seven courses of the Library are six rows here and one entry listed as out of scope (a community course pack), so six courses are accounted for. The six activity entries are the Library’s six formats of three activities (orbital-speed in four formats, binary-planets and star-sizes in one each). Datasets are not rows: they are accounted for through the guides and lessons that use them.',
      'Depth and language are columns of a row, not extra rows: `depths` counts the core, quantitative and advanced steps of the English lesson, `spanish_steps` the steps of its Spanish shadows, `languages` the languages the Library lists.',
      'A lesson’s `source` is the import closure of its own file within js/data/investigations (including the depth layer); a sequence file shared by several lessons, and the guide set a guide belongs to, is in each of their rows, so an edit to it makes every closed row that reads it stale. `instrument_files` are the modules of the instruments its steps name.',
      '`hash` is recorded when a row closes (npm run ledger:check names the command) and covers the bytes of source, shadows and instrument files plus the Library’s words for the entry. A closed row whose hash no longer matches fails the check until the pull request that changed the files has re-recorded it.',
      '`limits` and `open_items` are filled from the tree and DECISION_REGISTER.md at the baseline: a failed-legs fixture, a synthetic-data label or a leg not run that a register row names for the lesson, and the open items recorded for it. They are leads a content prompt confirms before it edits; a lesson with `limits: null` was not found to rest on any.',
      'The scene classes, audit dispositions, owners and scenario families are seeded from the planning audit (tools/catalog-ledger-seed.json) and are data: this file does not judge quality.',
    ],
    baseline: {
      measuredAt: 'f9277ff8',
      investigations: {
        total: 146,
        lesson: 124,
        observatory: 10,
        lab3d: 9,
        mission: 3,
      },
      activities: 6,
      experiments: 4,
      courses: { library: 7, rows: 6, outOfScope: 1 },
      sequences: 11,
      scenarios: { total: 69, sandbox: 61, system3d: 8 },
      datasets: 16,
      sceneClasses: {
        'setup scenario': 26,
        'engine-integrated stage': 2,
        'model-owned stage': 2,
        'portrait or backdrop': 94,
        'no scene': 0,
      },
    },
    outOfScope: [
      ...Object.entries(OUT_OF_SCOPE_KINDS).map(([kind, reason]) => ({
        kind,
        reason,
      })),
      ...inventory.outOfScope,
    ],
    rows,
    scenarios,
  };
}

// --- The check ------------------------------------------------------------------

/**
 * The content hash of a row: the bytes of its files and the Library's words.
 *
 * @param {object} row - A ledger row
 * @param {object} options - Where to read from
 * @param {(file: string) => string|Buffer} options.read - Reads a
 *   repository-relative file
 * @param {string} [options.words] - The Library words digest of the entry
 * @returns {string} Hex SHA-256
 */
export function contentHash(row, { read, words = '' }) {
  const h = createHash('sha256');
  for (const f of unique([
    ...row.source,
    ...row.shadows,
    ...row.instrument_files,
  ])) {
    h.update(f);
    h.update('\0');
    h.update(read(f));
    h.update('\0');
  }
  h.update(words);
  return h.digest('hex');
}

const isClosed = row =>
  (row.editorial && row.editorial !== 'OPEN') ||
  (row.redesign && row.redesign !== 'OPEN');

/**
 * Every way the ledger can disagree with what ships. Pure: it reads nothing
 * but its arguments, so the failures can be tested on small inventories.
 *
 * Failures, each with a code:
 *   no-row                an activity (any row kind) with no row
 *   no-activity           a row for something that does not ship
 *   duplicate-row         one id in two rows
 *   no-owner              a row with no owning prompt
 *   bad-value             a status outside its vocabulary, or DEFERRED and
 *                         CONSOLIDATED without a written reason
 *   hash-missing          a closed row with no recorded hash
 *   hash-stale            a closed row whose files changed after its hash was
 *                         recorded and whose pull request did not re-record it
 *   scenario-no-row       a scenario with no row
 *   scenario-no-scenario  a scenario row for no scenario
 *   scenario-bad-owner    an owner outside Prompts 462 to 466 and 482 (the
 *                         3-D lab's eight systems: 494)
 *   scenario-owned-twice  a scenario in two rows, or a row with two owners
 *   pointer               a limits fixture or leg, or a register row, that no
 *                         longer exists
 *
 * @param {object} args - The inputs
 * @param {object} args.ledger - The committed ledger
 * @param {object} args.inventory - From readInventory()
 * @param {(file: string) => string|Buffer} args.read - File reader
 * @param {Set<string>} [args.registerIds] - Decision register row ids; when
 *   absent, register pointers are not checked
 * @returns {Array<{code: string, id: string, message: string}>} Problems
 */
export function checkLedger({ ledger, inventory, read, registerIds }) {
  const problems = [];
  const add = (code, id, message) => problems.push({ code, id, message });

  // Rows against the inventory, both ways.
  const seen = new Set();
  for (const r of ledger.rows || []) {
    if (seen.has(r.id)) add('duplicate-row', r.id, `${r.id} has two rows`);
    seen.add(r.id);
  }
  const shipped = new Map(inventory.rows.map(r => [r.id, r]));
  for (const id of shipped.keys())
    if (!seen.has(id)) add('no-row', id, `${id} ships and has no ledger row`);
  for (const r of ledger.rows || [])
    if (!shipped.has(r.id))
      add('no-activity', r.id, `${r.id} has a row and no longer ships`);

  for (const r of ledger.rows || []) {
    if (!Number.isInteger(r.owner))
      add('no-owner', r.id, `${r.id} has no owning prompt`);
    const bad = (field, allowed) => {
      if (!allowed.includes(r[field]))
        add(
          'bad-value',
          r.id,
          `${r.id}: ${field} "${r[field]}" is not one of ${allowed.join(', ')}`
        );
    };
    bad('editorial', EDITORIAL);
    bad('redesign', REDESIGN);
    bad('walk', WALK);
    if (r.audit !== null && !AUDIT.includes(r.audit))
      add(
        'bad-value',
        r.id,
        `${r.id}: audit "${r.audit}" is not one of ${AUDIT.join(', ')}`
      );
    if (r.scene_class !== null && !SCENE_CLASS.includes(r.scene_class))
      add(
        'bad-value',
        r.id,
        `${r.id}: scene_class "${r.scene_class}" is not one of ${SCENE_CLASS.join(', ')}`
      );
    if (
      ['DEFERRED', 'CONSOLIDATED'].includes(r.redesign) &&
      !String(r.reason || '').trim()
    )
      add('bad-value', r.id, `${r.id}: ${r.redesign} needs a written reason`);

    if (isClosed(r)) {
      const inv = shipped.get(r.id);
      if (!r.hash)
        add(
          'hash-missing',
          r.id,
          `${r.id} is closed and records no content hash (node tools/catalog-ledger.mjs --record ${r.id})`
        );
      else if (inv) {
        let now;
        try {
          now = contentHash(r, { read, words: inventory.words[r.id] || '' });
        } catch (error) {
          add(
            'hash-stale',
            r.id,
            `${r.id}: a file of the row cannot be read (${error.message})`
          );
        }
        if (now && now !== r.hash)
          add(
            'hash-stale',
            r.id,
            `${r.id} is closed and its files changed after the hash was recorded; review the change and re-record it (node tools/catalog-ledger.mjs --record ${r.id})`
          );
      }
    }

    for (const fx of r.limits?.failed_legs || []) {
      let text = null;
      try {
        text = String(read(fx.fixture));
      } catch {
        add(
          'pointer',
          r.id,
          `${r.id}: limits name ${fx.fixture}, which does not exist`
        );
      }
      if (text !== null)
        for (const leg of fx.legs) {
          const legId = leg.split(':').slice(1).join(':');
          if (!text.includes(`"${legId}"`))
            add(
              'pointer',
              r.id,
              `${r.id}: limits name leg ${legId}, which ${fx.fixture} no longer holds`
            );
        }
    }
    if (registerIds) {
      const refs = [
        ...(r.limits?.register || []),
        ...(r.open_items || []).map(i => i.ref),
      ];
      for (const ref of refs)
        if (!registerIds.has(ref))
          add(
            'pointer',
            r.id,
            `${r.id}: names register row ${ref}, which ${REGISTER_PATH} does not hold`
          );
    }
  }

  // The scenarios sheet.
  const scenarioShipped = new Map(inventory.scenarios.map(s => [s.id, s]));
  const scenarioRows = new Map();
  for (const s of ledger.scenarios || []) {
    if (scenarioRows.has(s.id))
      add(
        'scenario-owned-twice',
        s.id,
        `${s.id} is in two rows of the scenarios sheet`
      );
    scenarioRows.set(s.id, s);
  }
  for (const id of scenarioShipped.keys())
    if (!scenarioRows.has(id))
      add(
        'scenario-no-row',
        id,
        `${id} ships and has no row in the scenarios sheet`
      );
  for (const s of ledger.scenarios || []) {
    const live = scenarioShipped.get(s.id);
    if (!live) {
      add(
        'scenario-no-scenario',
        s.id,
        `${s.id} has a row and no longer ships`
      );
      continue;
    }
    if (Array.isArray(s.owner) && s.owner.length !== 1)
      add(
        'scenario-owned-twice',
        s.id,
        `${s.id} has ${s.owner.length} owners; a scenario has exactly one`
      );
    const owner = Array.isArray(s.owner) ? s.owner[0] : s.owner;
    const allowed =
      live.format === 'system3d'
        ? [SYSTEM3D_SCENARIO_OWNER]
        : SANDBOX_SCENARIO_OWNERS;
    if (!allowed.includes(owner))
      add(
        'scenario-bad-owner',
        s.id,
        `${s.id} is owned by ${owner}; ${live.format === 'system3d' ? 'the 3-D lab systems belong to Prompt 494' : 'a sandbox scenario belongs to one of Prompts 462 to 466 or 482'}`
      );
    if (!SCENARIO_DISPOSITION.includes(s.disposition))
      add(
        'bad-value',
        s.id,
        `${s.id}: disposition "${s.disposition}" is not one of ${SCENARIO_DISPOSITION.join(', ')}`
      );
  }

  return problems;
}

// --- The Markdown view ------------------------------------------------------------

/**
 * The readable view of a ledger.
 *
 * @param {object} ledger - The ledger document
 * @returns {string} Markdown (before formatting)
 */
export function renderView(ledger) {
  const count = (list, f) => {
    const out = {};
    for (const r of list) out[f(r)] = (out[f(r)] || 0) + 1;
    return out;
  };
  const line = obj =>
    Object.entries(obj)
      .map(([k, v]) => `${k} ${v}`)
      .join(', ');
  const cell = v =>
    v === null || v === '' ? '-' : String(v).replace(/\|/g, '/');
  const kinds = count(ledger.rows, r => r.kind);
  const b = ledger.baseline;
  const out = [
    '# Catalog ledger',
    '',
    '<!-- Generated by tools/catalog-ledger.mjs from docs/catalog-ledger.json. Do not edit. -->',
    '',
    'Every shipped activity has one row in [`catalog-ledger.json`](catalog-ledger.json): what was reviewed, what was changed, which prompt owns it and whether its files still match the review. This is the readable view. Rows are derived from the Library and the lesson sources; the status fields are written by the pull request that moves a row. `npm run ledger:check` fails when the two disagree.',
    '',
    ...ledger.notes.map(n => `- ${n}`),
    '',
    '## Counts',
    '',
    `Rows by kind: ${line(kinds)}. Scenarios: ${ledger.scenarios.length}.`,
    '',
    `Baseline (measured at ${b.measuredAt}): ${b.investigations.total} investigations (${b.investigations.lesson} lessons, ${b.investigations.observatory} Observatory, ${b.investigations.lab3d} 3-D, ${b.investigations.mission} mission), ${b.activities} activity entries, ${b.experiments} bench labs, ${b.courses.library} courses (${b.courses.rows} rows and ${b.courses.outOfScope} out of scope), ${b.sequences} sequences, ${b.scenarios.total} scenarios (${b.scenarios.sandbox} sandbox, ${b.scenarios.system3d} 3-D lab), ${b.datasets} datasets.`,
    '',
    `Editorial: ${line(count(ledger.rows, r => r.editorial))}. Redesign: ${line(count(ledger.rows, r => r.redesign))}. Scenario dispositions: ${line(count(ledger.scenarios, s => s.disposition))}.`,
    '',
    `Scene class of the lessons: ${line(
      count(
        ledger.rows.filter(r => r.scene_class),
        r => r.scene_class
      )
    )}.`,
    '',
    '## Out of scope',
    '',
    ...ledger.outOfScope.map(
      o => `- ${o.id ?? `every ${o.kind}`}: ${o.reason}`
    ),
    '',
    '## Investigations',
    '',
    '| Row | Format | Owner | Audit | Scene | Editorial | Redesign | Walk | Limits | Open items |',
    '| --- | --- | ---: | --- | --- | --- | --- | --- | --- | ---: |',
    ...ledger.rows
      .filter(r => r.kind === 'investigation')
      .map(
        r =>
          `| \`${r.id}\` | ${r.format} | ${cell(r.owner)} | ${cell(r.audit)} | ${cell(r.scene_class)} | ${r.editorial} | ${r.redesign} | ${r.walk} | ${r.limits ? r.limits.labels[0] + (r.limits.labels.length > 1 ? ` (+${r.limits.labels.length - 1})` : '') : '-'} | ${r.open_items.length} |`
      ),
    '',
    '## Activities, bench labs, courses and sequences',
    '',
    '| Row | Format | Owner | Editorial | Redesign | Walk |',
    '| --- | --- | ---: | --- | --- | --- |',
    ...ledger.rows
      .filter(r => r.kind !== 'investigation')
      .map(
        r =>
          `| \`${r.id}\` | ${r.format} | ${cell(r.owner)} | ${r.editorial} | ${r.redesign} | ${r.walk} |`
      ),
    '',
    '## Scenarios',
    '',
    '| Scenario | Card title | Family | Planning | Owner | Disposition |',
    '| --- | --- | --- | --- | ---: | --- |',
    ...ledger.scenarios.map(
      s =>
        `| \`${s.id}\` | ${cell(s.card_title)} | ${cell(s.family)} | ${cell(s.planning)} | ${cell(s.owner)} | ${s.disposition} |`
    ),
    '',
  ];
  return out.join('\n');
}

// --- Files ------------------------------------------------------------------------

async function format(text, parser) {
  const options = JSON.parse(
    await readFile(path.join(ROOT, '.prettierrc.json'), 'utf8')
  );
  return prettier.format(text, { ...options, parser });
}

/**
 * The two output texts for a ledger document.
 *
 * @param {object} ledger - The ledger
 * @returns {Promise<{json: string, view: string}>} Formatted file contents
 */
export async function renderFiles(ledger) {
  return {
    json: await format(JSON.stringify(ledger), 'json'),
    view: await format(renderView(ledger), 'markdown'),
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

const readIn =
  (root = ROOT) =>
  file =>
    readFileSync(path.join(root, file));

/**
 * Regenerate in memory and say what disagrees on disk.
 *
 * @param {string} [root] - Repository root
 * @returns {Promise<{problems: Array, ledger: object, files: object}>} Result
 */
export async function runCheck(root = ROOT) {
  const inventory = await readInventory(root);
  const seed = JSON.parse(readFileSync(path.join(root, SEED_PATH), 'utf8'));
  const ledgerFile = path.join(root, LEDGER_PATH);
  const committed = existsSync(ledgerFile)
    ? JSON.parse(readFileSync(ledgerFile, 'utf8'))
    : null;
  const problems = committed
    ? checkLedger({
        ledger: committed,
        inventory,
        read: readIn(root),
        registerIds: registerRowIds(root),
      })
    : [
        {
          code: 'no-row',
          id: LEDGER_PATH,
          message: `${LEDGER_PATH} does not exist`,
        },
      ];
  const next = buildLedger(inventory, seed, committed);
  const files = await renderFiles(next);
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
  if (argv.includes('--record')) {
    const ids = argv.slice(argv.indexOf('--record') + 1);
    const { ledger, inventory } = await runCheck();
    const existing = JSON.parse(
      readFileSync(path.join(ROOT, LEDGER_PATH), 'utf8')
    );
    const byId = new Map(existing.rows.map(r => [r.id, r]));
    for (const id of ids) {
      const row = byId.get(id) || byId.get(`investigation:${id}`);
      const derived = ledger.rows.find(r => r.id === row?.id);
      if (!derived) {
        console.error(`No ledger row "${id}".`);
        return 2;
      }
      row.hash = contentHash(derived, {
        read: readIn(),
        words: inventory.words[derived.id] || '',
      });
      console.log(`${derived.id}: ${row.hash.slice(0, 12)}`);
    }
    const seed = JSON.parse(readFileSync(path.join(ROOT, SEED_PATH), 'utf8'));
    const files = await renderFiles(buildLedger(inventory, seed, existing));
    await writeFile(path.join(ROOT, LEDGER_PATH), files.json);
    await writeFile(path.join(ROOT, VIEW_PATH), files.view);
    return 0;
  }

  const result = await runCheck();
  if (argv.includes('--json')) {
    process.stdout.write(result.files.json);
    return 0;
  }
  if (argv.includes('--write')) {
    await writeFile(path.join(ROOT, LEDGER_PATH), result.files.json);
    await writeFile(path.join(ROOT, VIEW_PATH), result.files.view);
    console.log(
      `Wrote ${LEDGER_PATH} (${result.ledger.rows.length} rows, ${result.ledger.scenarios.length} scenarios) and ${VIEW_PATH}.`
    );
    return 0;
  }
  // --check (the default)
  if (result.problems.length) {
    console.error(
      `The catalog ledger disagrees with what ships (${result.problems.length}):`
    );
    for (const p of result.problems.slice(0, 40))
      console.error(`  ${p.message}`);
    if (result.problems.length > 40)
      console.error(`  ... and ${result.problems.length - 40} more`);
    const codes = new Set(result.problems.map(p => p.code));
    if (codes.has('no-row') || codes.has('scenario-no-row'))
      console.error(
        'A new activity needs a row: npm run ledger adds one with no owner, and the owner is then written into the file.'
      );
    if (codes.has('hash-stale') || codes.has('hash-missing'))
      console.error(
        'A closed row’s hash is re-recorded with node tools/catalog-ledger.mjs --record <row id>, after the change is reviewed.'
      );
    return 1;
  }
  if (result.stale.length) {
    console.error(
      `${result.stale.join(' and ')} is stale: run npm run ledger and commit the result.`
    );
    return 1;
  }
  console.log(
    `The catalog ledger matches what ships: ${result.ledger.rows.length} rows, ${result.ledger.scenarios.length} scenarios.`
  );
  return 0;
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  process.exit(await main(process.argv.slice(2)));
}
