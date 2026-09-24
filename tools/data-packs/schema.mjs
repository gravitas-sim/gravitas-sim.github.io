// =============================================================================
// gravitas.observation-data-pack/1: what a data pack says about itself
// -----------------------------------------------------------------------------
// A data pack is data a lesson shows as coming from outside Gravitas - an
// observation, a published model grid, or values compiled from papers - with
// the record of where it came from and what was done to it. The record is one
// JSON manifest per pack in data-packs/, beside the capability package that
// ships it (capabilities/*.json, gravitas.capability-package/1). The package
// says how the data loads and which offline class each file has; the manifest
// says where the numbers came from. They meet on the pack id, which is the
// package's public data-pack id, and agreesWithPackage() fails the build when
// they disagree about it or about the derived file's offline class.
//
// Build-time code. Nothing in the browser validates a built-in pack: the build
// does, and the runtime module carries only the metadata an interface shows
// (RUNTIME_FIELDS), generated from the manifest and checked against it.
//
// Decided by OBSERVATION_DATA_PACK_GATE.md; described in DATA_PACKS.md.
// =============================================================================

export const FORMAT = 'gravitas.observation-data-pack';
export const FORMAT_VERSION = 1;

export const DATA_TYPES = [
  'light-curve',
  'radial-velocity',
  'spectrum',
  'strain',
  'model-grid',
  'system-parameters',
  'rotation-curve',
];
/** Types whose independent variable is a time, and so need a time system. */
export const TIME_SERIES = new Set([
  'light-curve',
  'radial-velocity',
  'strain',
]);
/**
 * What the numbers are. `synthetic` is listed so a manifest can say it and
 * then be refused: numbers made to look like a measurement are not a data
 * pack, however well documented. A lesson that needs them labels them itself.
 */
export const ORIGINS = ['observed', 'model', 'compilation', 'synthetic'];
export const LICENSE_STATUS = [
  'public-domain',
  'cc0',
  'cc-by-4.0',
  'attribution-requested', // public, with cite-us terms and no licence text
  'no-license-stated',
  'restricted',
];
/** Not licences: a manifest with one of these must argue for redistribution. */
const NEEDS_BASIS = new Set(['attribution-requested', 'no-license-stated']);
/** The capability package's offline classes, less `locale`, which is for text. */
export const OFFLINE = ['core', 'optional', 'none'];
/** How a raw product not stable byte for byte is pinned; see pinned.mjs. */
export const CANONICAL_FORMS = ['data-lines'];

/**
 * What the browser copy of a pack carries: enough to label and credit it on
 * screen. Hashes, URLs and transformation steps stay in the manifest.
 */
export const RUNTIME_FIELDS = [
  'id',
  'version',
  'title',
  'object',
  'facility',
  'dataType',
  'origin',
  'credit',
  'license',
  'retrieved',
  'time',
  'columns',
  'masks',
];

const PUBLIC_ID = /^[a-z0-9]+(-[a-z0-9]+)*$/; // as js/platform/manifest.js
const SEMVER = /^\d+\.\d+\.\d+$/;
const SHA256 = /^[0-9a-f]{64}$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const isObject = v => v !== null && typeof v === 'object' && !Array.isArray(v);

/**
 * Every problem with one manifest, each naming the field it is about.
 * @param {unknown} m - A parsed manifest
 * @returns {Array<{path: string, message: string}>} Empty when it is a pack
 */
export function validateDataPack(m) {
  const out = [];
  const need = (ok, path, message) => ok || out.push({ path, message });
  const text = (v, path) =>
    need(typeof v === 'string' && v.trim() !== '', path, 'is required');
  const list = (v, path, min = 1) =>
    need(
      Array.isArray(v) && v.length >= min,
      path,
      min ? 'needs at least one entry' : 'must be a list ([] for none)'
    );
  if (!isObject(m)) return [{ path: '', message: 'is not an object' }];

  need(m.format === FORMAT, 'format', `must be "${FORMAT}"`);
  need(
    m.formatVersion === FORMAT_VERSION,
    'formatVersion',
    `must be ${FORMAT_VERSION}`
  );
  need(
    PUBLIC_ID.test(m.id || ''),
    'id',
    'a public id such as "tess-hd209458-s56-lc"'
  );
  need(SEMVER.test(m.version || ''), 'version', 'a version such as "1.0.0"');
  text(m.title, 'title');
  text(m.object?.name, 'object.name');
  if (m.object?.ra !== undefined || m.object?.dec !== undefined) {
    need(
      Number.isFinite(m.object.ra) && Number.isFinite(m.object.dec),
      'object.ra',
      'coordinates in degrees'
    );
    text(m.object.frame, 'object.frame');
  }
  text(m.facility?.observatory, 'facility.observatory');
  need(
    DATA_TYPES.includes(m.dataType),
    'dataType',
    `one of ${DATA_TYPES.join(', ')}`
  );
  need(ORIGINS.includes(m.origin), 'origin', `one of ${ORIGINS.join(', ')}`);
  need(
    m.origin !== 'synthetic',
    'origin',
    'synthetic data is not a data pack; label it in the lesson'
  );
  text(m.credit, 'credit');
  need(DATE.test(m.retrieved || ''), 'retrieved', 'a date, YYYY-MM-DD');

  list(m.source?.urls, 'source.urls');
  list(m.source?.citations, 'source.citations');
  (m.source?.citations || []).forEach((c, i) =>
    need(
      c?.doi || c?.bibcode || c?.text,
      `source.citations[${i}]`,
      'a doi, bibcode or text'
    )
  );

  need(
    LICENSE_STATUS.includes(m.license?.status),
    'license.status',
    `one of ${LICENSE_STATUS.join(', ')}`
  );
  need(
    m.license?.status !== 'restricted',
    'license.status',
    'restricted data cannot be redistributed'
  );
  text(m.license?.statement, 'license.statement');
  if (NEEDS_BASIS.has(m.license?.status))
    text(m.license?.basis, 'license.basis');

  // A compilation's source is its citations; there is no file to hash.
  if (m.origin !== 'compilation') list(m.raw, 'raw');
  (m.raw || []).forEach((r, i) => {
    text(r?.file, `raw[${i}].file`);
    text(r?.url, `raw[${i}].url`);
    need(SHA256.test(r?.sha256 || ''), `raw[${i}].sha256`, 'a SHA-256');
    if (r?.canonical === undefined) {
      need(
        Number.isInteger(r?.bytes) && r.bytes > 0,
        `raw[${i}].bytes`,
        'a byte count'
      );
    } else {
      need(
        CANONICAL_FORMS.includes(r.canonical),
        `raw[${i}].canonical`,
        `one of ${CANONICAL_FORMS.join(', ')}`
      );
    }
  });
  text(m.derived?.file, 'derived.file');
  need(
    /^js\/data\//.test(m.derived?.file || ''),
    'derived.file',
    'must be under js/data/'
  );
  need(
    Number.isInteger(m.derived?.bytes) && m.derived.bytes > 0,
    'derived.bytes',
    'a byte count'
  );
  need(SHA256.test(m.derived?.sha256 || ''), 'derived.sha256', 'a SHA-256');

  text(m.transformation?.script, 'transformation.script');
  need(
    SEMVER.test(m.transformation?.version || ''),
    'transformation.version',
    'the tool version that wrote it'
  );
  list(
    m.transformation?.steps,
    'transformation.steps',
    m.origin === 'compilation' ? 0 : 1
  );

  list(m.columns, 'columns');
  const names = new Set((m.columns || []).map(c => c?.name));
  (m.columns || []).forEach((c, i) => {
    text(c?.name, `columns[${i}].name`);
    need(
      typeof c?.unit === 'string',
      `columns[${i}].unit`,
      "is required ('' if dimensionless)"
    );
    if (c?.uncertaintyOf !== undefined) {
      need(
        names.has(c.uncertaintyOf),
        `columns[${i}].uncertaintyOf`,
        'names no column'
      );
    }
  });
  if (TIME_SERIES.has(m.dataType)) {
    text(m.time?.scale, 'time.scale');
    text(m.time?.reference, 'time.reference');
    text(m.time?.unit, 'time.unit');
  }
  list(m.masks, 'masks', 0);
  (m.masks || []).forEach((k, i) => {
    text(k?.column, `masks[${i}].column`);
    text(k?.rule, `masks[${i}].rule`);
  });
  list(m.assumptions, 'assumptions');
  list(m.reductions, 'reductions', 0);
  text(m.validation?.check, 'validation.check');
  list(m.validation?.against, 'validation.against');
  need(
    Array.isArray(m.compatible?.widgets) ||
      Array.isArray(m.compatible?.investigations),
    'compatible',
    'lists widgets or investigations ([] for none yet)'
  );
  need(OFFLINE.includes(m.offline), 'offline', `one of ${OFFLINE.join(', ')}`);
  return out;
}

/** The runtime metadata a manifest implies: RUNTIME_FIELDS, nothing else. */
export function runtimeMeta(m) {
  return Object.fromEntries(
    RUNTIME_FIELDS.filter(k => m[k] !== undefined).map(k => [k, m[k]])
  );
}

/**
 * Where a pack and the capability package that ships it disagree.
 * @param {object} pack - A data-pack manifest
 * @param {object} pkg - A capability-package manifest
 * @param {string} manifestPath - The pack manifest's repository path
 */
export function agreesWithPackage(pack, pkg, manifestPath) {
  const out = [];
  const entry = (pkg?.provides?.dataPacks || []).find(d => d.id === pack.id);
  if (!entry) {
    out.push({
      path: 'id',
      message: `${pkg?.id} provides no data pack "${pack.id}"`,
    });
  } else if (entry.provenance !== manifestPath) {
    out.push({
      path: 'id',
      message: `${pkg.id} names ${entry.provenance} as the record, not ${manifestPath}`,
    });
  }
  const asset = (pkg?.assets || []).find(a => a.path === pack.derived?.file);
  if (!asset) {
    out.push({
      path: 'derived.file',
      message: `is not an asset of ${pkg?.id}`,
    });
  } else if (asset.offline !== pack.offline) {
    out.push({
      path: 'offline',
      message: `is ${pack.offline}; ${pkg.id} says ${asset.offline}`,
    });
  }
  return out;
}
