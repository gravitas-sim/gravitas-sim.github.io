// Spike: gravitas.observation-data-pack/1, and a validator for it.
//
// One manifest per pack. A pack is data a lesson shows as coming from outside
// Gravitas: an observation, a published model grid, or values compiled from
// papers. It is the scientific record behind a capability package's
// `provides.dataPacks[]` entry - the package (gravitas.capability-package/1)
// still says how the data loads and which offline class each file has; this
// says where the numbers came from and what was done to them. The two meet on
// the pack id, which is the package's public data-pack id.
//
// The validator returns every problem as a path, so a retrofit of an existing
// dataset reports exactly what that dataset cannot yet say.

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
/** Types whose first column is a time, and so need a time scale and zero. */
export const TIME_SERIES = new Set(['light-curve', 'radial-velocity', 'strain']);
/**
 * What the numbers are. `synthetic` is listed so that a retrofit can say it,
 * and then fails: numbers made to look like a measurement are not a data pack.
 */
export const ORIGINS = ['observed', 'model', 'compilation', 'synthetic'];
export const LICENSE_STATUS = [
  'public-domain',
  'cc0',
  'cc-by-4.0',
  'attribution-requested', // public, cite-us terms, no licence text
  'no-license-stated',
  'restricted',
];
/** The capability package's asset classes, less `locale`, which is for text. */
export const OFFLINE = ['core', 'optional', 'none'];

const PUBLIC_ID = /^[a-z0-9]+(-[a-z0-9]+)*$/; // as in js/platform/manifest.js
const SEMVER = /^\d+\.\d+\.\d+$/;
const SHA256 = /^[0-9a-f]{64}$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const isObject = v => v !== null && typeof v === 'object' && !Array.isArray(v);

/**
 * Every problem with a manifest.
 * @returns {Array<{path: string, message: string}>} Empty when it is a pack
 */
export function validatePack(m) {
  const out = [];
  const need = (ok, path, message) => ok || out.push({ path, message });
  const text = (v, path) => need(typeof v === 'string' && v.trim() !== '', path, 'is required');
  const list = (v, path, min = 1) =>
    need(Array.isArray(v) && v.length >= min, path, min ? 'at least one' : "a list ([] for none)");
  if (!isObject(m)) return [{ path: '', message: 'is not an object' }];

  need(m.format === FORMAT, 'format', `must be ${FORMAT}`);
  need(m.formatVersion === FORMAT_VERSION, 'formatVersion', `must be ${FORMAT_VERSION}`);
  need(PUBLIC_ID.test(m.id || ''), 'id', 'a public id such as "tess-hd209458-s56"');
  need(SEMVER.test(m.version || ''), 'version', 'must be x.y.z');
  text(m.title, 'title');
  text(m.object?.name, 'object.name');
  text(m.facility?.observatory, 'facility.observatory');
  need(DATA_TYPES.includes(m.dataType), 'dataType', `one of ${DATA_TYPES.join(', ')}`);
  need(ORIGINS.includes(m.origin), 'origin', `one of ${ORIGINS.join(', ')}`);
  need(m.origin !== 'synthetic', 'origin', 'synthetic data is not a data pack; label it in the lesson');

  const src = m.source || {};
  list(src.urls, 'source.urls');
  list(src.citations, 'source.citations');
  (src.citations || []).forEach((c, i) =>
    need(c?.doi || c?.bibcode || c?.text, `source.citations[${i}]`, 'a doi, bibcode or text')
  );
  need(DATE.test(src.retrieved || ''), 'source.retrieved', 'must be YYYY-MM-DD');

  need(LICENSE_STATUS.includes(m.license?.status), 'license.status', `one of ${LICENSE_STATUS.join(', ')}`);
  need(m.license?.status !== 'restricted', 'license.status', 'restricted data cannot be redistributed');
  text(m.license?.statement, 'license.statement');
  if (m.license?.status === 'no-license-stated' || m.license?.status === 'attribution-requested') {
    // Not a licence, so the manifest has to say why redistribution is defensible.
    text(m.license?.basis, 'license.basis');
  }

  // A compilation is values transcribed from papers: its raw input is the
  // citation list, and there is no file to hash. Everything else has files.
  if (m.origin !== 'compilation') list(m.raw, 'raw');
  (m.raw || []).forEach((r, i) => {
    text(r?.file, `raw[${i}].file`);
    need(Number.isInteger(r?.bytes) && r.bytes > 0, `raw[${i}].bytes`, 'a byte count');
    need(SHA256.test(r?.sha256 || ''), `raw[${i}].sha256`, 'a SHA-256');
    need(r?.pinned === true, `raw[${i}].pinned`, 'the tool must refuse any other bytes');
    // A source that is not byte-stable (a VizieR response dates itself) is
    // pinned over a canonical form; sha256 is then the file as served, for the
    // record, and canonicalSha256 is what a re-fetch must match.
    if (r?.canonical !== undefined) {
      text(r.canonical, `raw[${i}].canonical`);
      need(SHA256.test(r.canonicalSha256 || ''), `raw[${i}].canonicalSha256`, 'a SHA-256');
    }
  });
  text(m.derived?.file, 'derived.file');
  need(Number.isInteger(m.derived?.bytes), 'derived.bytes', 'a byte count');
  need(SHA256.test(m.derived?.sha256 || ''), 'derived.sha256', 'a SHA-256');

  text(m.transformation?.script, 'transformation.script');
  text(m.transformation?.version, 'transformation.version');
  list(m.transformation?.steps, 'transformation.steps', m.origin === 'compilation' ? 0 : 1);

  list(m.columns, 'columns');
  const names = new Set((m.columns || []).map(c => c?.name));
  (m.columns || []).forEach((c, i) => {
    text(c?.name, `columns[${i}].name`);
    need(typeof c?.unit === 'string', `columns[${i}].unit`, "is required ('' if dimensionless)");
    if (c?.uncertaintyOf) need(names.has(c.uncertaintyOf), `columns[${i}].uncertaintyOf`, 'names no column');
  });
  if (TIME_SERIES.has(m.dataType)) {
    text(m.time?.scale, 'time.scale');
    text(m.time?.reference, 'time.reference');
  }
  list(m.masks, 'masks', 0);
  list(m.assumptions, 'assumptions');
  list(m.reductions, 'reductions', 0);
  if (m.validation !== undefined) {
    text(m.validation?.check, 'validation.check');
    list(m.validation?.against, 'validation.against');
  }
  need(
    Array.isArray(m.compatible?.widgets) || Array.isArray(m.compatible?.investigations),
    'compatible',
    'widgets or investigations'
  );
  need(OFFLINE.includes(m.offline), 'offline', `one of ${OFFLINE.join(', ')}`);
  return out;
}

/**
 * The two manifests have to agree where they overlap: the package's asset for
 * the derived file carries the offline class the pack declares.
 */
export function agreesWithPackage(pack, pkg) {
  const out = [];
  const entry = (pkg?.provides?.dataPacks || []).find(d => d.id === pack.id);
  if (!entry) out.push({ path: 'id', message: `no dataPacks entry "${pack.id}" in ${pkg?.id}` });
  const asset = (pkg?.assets || []).find(a => a.path === pack.derived?.file);
  if (!asset) out.push({ path: 'derived.file', message: `not an asset of ${pkg?.id}` });
  else if (asset.offline !== pack.offline) {
    out.push({ path: 'offline', message: `the package says ${asset.offline}` });
  }
  return out;
}
