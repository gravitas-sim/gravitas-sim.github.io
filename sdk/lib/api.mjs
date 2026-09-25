// =============================================================================
// The Gravitas Extension SDK's public API
// -----------------------------------------------------------------------------
// The one module an extension author, an example or the SDK's contract suite
// imports. Everything else under sdk/lib/ and the whole of js/ and tools/ is
// private: it may change in any release, and the contract suite
// (tests/sdkContract.test.js) fails if an example or the suite itself reaches
// past this file.
//
// It is an adapter. What it exposes is stable and versioned (SDK_VERSION,
// COMPATIBILITY in sdk/README.md); how it finds the answers - reading the
// lesson manifest, the instrument registry, the scenario catalog, the
// capability packages - is its own business and is allowed to change with the
// application underneath it.
// =============================================================================

import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { PLATFORM_API } from '../../js/platform/manifest.js';
import { parseRange, satisfies } from '../../js/platform/semver.js';

export { PLATFORM_API };
export { observationOf, checkObservation } from '../../js/observation.js';

/** This SDK. A major version changes only with a breaking change to this file. */
export const SDK_VERSION = '1.0.0';

/** The formats this SDK reads and writes, and the version of each. */
export const FORMATS = Object.freeze({
  'gravitas.capability-package': 1,
  'gravitas.observation-data-pack': 1,
  'gravitas.course-pack': 1,
  'gravitas.extension-archive': 1,
});

/** The three kinds of extension, and whether each may carry code. */
export const EXTENSION_TYPES = Object.freeze({
  'data-pack': { kind: 'declarative', code: false },
  'course-pack': { kind: 'declarative', code: false },
  capability: { kind: 'built-in', code: true },
});

/** The interface languages Gravitas ships. */
export const LOCALES = Object.freeze(['en', 'es']);

const REPO = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..'
);
let ids = null;

/**
 * Every public identifier an extension may name, or must not reuse.
 * @returns {Promise<{lessons: Set<string>, widgets: Set<string>,
 *   scenarios: Set<string>, dataPacks: Set<string>, courses: Set<string>,
 *   packages: Map<string, string>, lessonTitles: Map<string, object>}>}
 */
export async function publicIds() {
  if (ids) return ids;
  const { loadAuthoringInputs } =
    await import('../../tools/authoring/inputs.mjs');
  const inputs = await loadAuthoringInputs();
  const packages = new Map();
  const dataPacks = new Set();
  const courses = new Set();
  const dir = path.join(REPO, 'capabilities');
  for (const f of readdirSync(dir)
    .filter(n => n.endsWith('.json'))
    .sort()) {
    const m = JSON.parse(readFileSync(path.join(dir, f), 'utf8'));
    packages.set(m.id, m.version);
    for (const d of m.provides?.dataPacks || []) dataPacks.add(d.id);
    for (const c of m.provides?.courses || []) courses.add(c.id);
  }
  const lessonTitles = new Map();
  for (const locale of LOCALES) {
    for (const card of inputs.manifests[locale] || []) {
      const t = lessonTitles.get(card.id) || {};
      t[locale] = card.title;
      lessonTitles.set(card.id, t);
    }
  }
  ids = {
    lessons: new Set(inputs.investigations.map(i => i.id)),
    widgets: new Set(inputs.widgets.map(w => w.id)),
    scenarios: new Set(Object.keys(inputs.scenarios)),
    dataPacks,
    courses,
    packages,
    lessonTitles,
  };
  return ids;
}

/** Whether a package's `gravitas` range accepts this platform. */
export function acceptsPlatform(range) {
  return Boolean(parseRange(range)) && satisfies(PLATFORM_API, range);
}

/**
 * A data pack Gravitas has installed: its record (the pack manifest), the
 * runtime module and the decoded observation. An extension derived from an
 * installed pack reads its source through this, and pins what it read by the
 * record's `derived` checksum.
 * @param {string} id - A public data-pack id, as publicIds().dataPacks lists
 * @returns {Promise<{record: object, file: string, module: object, observation: object}>}
 */
export async function installedDataPack(id) {
  const dir = path.join(REPO, 'capabilities');
  for (const f of readdirSync(dir).filter(n => n.endsWith('.json'))) {
    const m = JSON.parse(readFileSync(path.join(dir, f), 'utf8'));
    const entry = (m.provides?.dataPacks || []).find(d => d.id === id);
    if (!entry) continue;
    if (!String(entry.provenance).endsWith('.json')) {
      throw new Error(
        `${id} predates gravitas.observation-data-pack/1 (its record is ${entry.provenance}); see DATA_PACKS.md, "Migrating"`
      );
    }
    const record = JSON.parse(
      readFileSync(path.join(REPO, entry.provenance), 'utf8')
    );
    const { observationOf } = await import('../../js/observation.js');
    const module = await import(
      pathToFileURL(path.join(REPO, record.derived.file)).href
    );
    return {
      record,
      file: record.derived.file,
      module,
      observation: observationOf(module),
    };
  }
  throw new Error(`Gravitas has no data pack "${id}"`);
}
