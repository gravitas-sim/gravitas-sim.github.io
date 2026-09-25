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
  'image',
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

/**
 * Fields a runtime copy may also carry, added in SDK 1.1.0: what was reduced
 * before the data arrived, so an interface can say so, and for an image its
 * shape, world coordinates and what its values mean. Optional, so a pack
 * written before them still validates: a runtime copy that leaves out its
 * reductions is warned about, not refused (sdk/README.md, the deprecation
 * policy). Gravitas's own packs carry them. An image pack must carry `image`,
 * because there was no image pack before it.
 */
export const RUNTIME_OPTIONAL = ['reductions', 'image'];

const PUBLIC_ID = /^[a-z0-9]+(-[a-z0-9]+)*$/; // as js/platform/manifest.js
const SEMVER = /^\d+\.\d+\.\d+$/;
const SHA256 = /^[0-9a-f]{64}$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const isObject = v => v !== null && typeof v === 'object' && !Array.isArray(v);

/**
 * Every problem with one manifest, each naming the field it is about.
 * @param {unknown} m - A parsed manifest
 * @param {{derivedUnder?: string}} [opts] - Where the derived file must be:
 *   js/data/ for a pack built into Gravitas; '' for an extension, whose
 *   derived file is a path inside its own directory (sdk/README.md)
 * @returns {Array<{path: string, message: string}>} Empty when it is a pack
 */
export function validateDataPack(m, { derivedUnder = 'js/data/' } = {}) {
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
  const file = m.derived?.file || '';
  need(
    derivedUnder
      ? file.startsWith(derivedUnder)
      : !/^[a-z]+:|^\/|(^|\/)\.\.(\/|$)/i.test(file),
    'derived.file',
    derivedUnder
      ? `must be under ${derivedUnder}`
      : 'a path inside the extension, never a URL or ..'
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
  if (m.dataType === 'image') {
    const im = m.image;
    need(
      Number.isInteger(im?.width) &&
        im.width > 0 &&
        Number.isInteger(im?.height) &&
        im.height > 0,
      'image',
      'gives a width and height in pixels'
    );
    if (im?.bits !== undefined) {
      need(
        Array.isArray(im.bits) &&
          im.bits.every(
            b =>
              Number.isInteger(b.value) &&
              b.value > 0 &&
              typeof b.meaning === 'string'
          ),
        'image.bits',
        'says what each bit means'
      );
      text(im.bitsSource, 'image.bitsSource');
    }
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

/**
 * The runtime metadata a manifest implies: RUNTIME_FIELDS, then those of
 * RUNTIME_OPTIONAL it has, and nothing else.
 */
export function runtimeMeta(m) {
  return Object.fromEntries(
    [...RUNTIME_FIELDS, ...RUNTIME_OPTIONAL]
      .filter(k => m[k] !== undefined)
      .map(k => [k, m[k]])
  );
}

/**
 * Where a runtime copy and its manifest disagree.
 *
 * Every field of RUNTIME_FIELDS must match, and nothing may be there that is
 * not a runtime field. A field of RUNTIME_OPTIONAL that is there must match;
 * one the manifest has and the copy leaves out is a warning, except `image`
 * on an image, which is required.
 *
 * @param {object} PACK - The runtime copy
 * @param {object} m - Its manifest
 * @returns {{errors: string[], warnings: string[]}} Field-level messages
 */
export function runtimeDisagreement(PACK, m) {
  const errors = [];
  const warnings = [];
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  if (!PACK || typeof PACK !== 'object') {
    return { errors: ['is not an object'], warnings };
  }
  for (const k of RUNTIME_FIELDS) {
    if (!same(PACK[k], m[k])) errors.push(`${k} is not the manifest's`);
  }
  for (const k of RUNTIME_OPTIONAL) {
    if (PACK[k] === undefined) {
      if (m[k] === undefined) continue;
      if (k === 'image' && m.dataType === 'image') {
        errors.push('image is required in the runtime copy of an image');
      } else {
        warnings.push(
          `${k} is in the manifest and not the runtime copy, so an interface cannot show it`
        );
      }
    } else if (!same(PACK[k], m[k])) {
      errors.push(`${k} is not the manifest's`);
    }
  }
  const known = new Set([...RUNTIME_FIELDS, ...RUNTIME_OPTIONAL]);
  for (const k of Object.keys(PACK)) {
    if (!known.has(k)) errors.push(`${k} is not a runtime field`);
  }
  return { errors, warnings };
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
