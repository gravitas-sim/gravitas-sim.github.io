// =============================================================================
// The instrument library's rules: what a cited value is, and what a facility is
// -----------------------------------------------------------------------------
// One validator, used three ways: the generator checks the committed source
// table (tools/build-instruments.mjs), the tests hold it to the refusal list in
// tests/fixtures/instruments/thresholds.json, and the SDK checks a course's own
// telescope (a gravitas.instrument/1 pack, sdk/lib/instrument.mjs). The same
// rule for a built-in facility and for a course's, so a course cannot cite less.
//
// The rules (INSTRUMENTS.md):
//   - A value is { v, u, s } (a number or a [low, high] range, its unit, its
//     source) with optional at (where in the source), q (a qualifier: typical,
//     upper, approx, assumed, estimated, inferred, median, effective) and n (a
//     note). A text value is { t, s }. Nothing else, and no other field.
//   - u is a unit of js/units/registry.js, or registry units joined by '/', and
//     its dimension is the parameter's. s names a source with a title, a
//     reference, a retrieval date and a recorded rights basis.
//   - A missing value is absent: no null, no NaN, no zero for unknown.
//   - A typical entry cites only the project's own convention and says so; a
//     real facility cites none of it.
//
// Pure: no DOM, no I/O. Browser and Node alike.
// =============================================================================

import { UNITS, unitIdOf } from '../units/registry.js';

export const FORMAT = 'gravitas.instrument';
export const FORMAT_VERSION = 1;

export const CLASSES = Object.freeze([
  'campus',
  'metre',
  'space',
  'survey',
  'radio',
]);
export const QUALIFIERS = Object.freeze([
  'typical',
  'upper',
  'approx',
  'assumed',
  'estimated',
  'inferred',
  'median',
  'effective',
]);
export const SOURCE_KINDS = Object.freeze([
  'paper',
  'instrument-page',
  'document',
  'typical',
]);
/** The one source a typical entry may cite. */
export const TYPICAL_SOURCE_KIND = 'typical';
export const INSTRUMENT_KINDS = Object.freeze(['imager', 'receiver']);

// A parameter: its dimension signature, whether a range is allowed, and bounds.
const P = (dim, o = {}) => Object.freeze({ dim, ...o });
const POS = { min: 0, open: true };

/** Every parameter a block may carry; anything else is refused. */
export const PARAMS = Object.freeze({
  telescope: Object.freeze({
    aperture: P('length', POS),
    effectiveAperture: P('length', POS),
    obstructionDiameter: P('length', POS),
    secondaryDiameter: P('length', POS),
    focalRatio: P('ratio', POS),
    collectingArea: P('area', POS),
  }),
  ground: Object.freeze({
    latitude: P('angle', { min: -90, max: 90 }),
    longitude: P('angle', { min: -180, max: 180 }),
    elevation: P('length', { min: -500, max: 9000 }),
    seeing: P('angle', { ...POS, band: 'either' }),
    skyBrightness: P('magnitude/solid-angle', { band: 'only' }),
    extinction: P('magnitude/airmass', { ...POS, band: 'only' }),
  }),
  orbit: Object.freeze({
    perigee: P('length', POS),
    apogee: P('length', POS),
    period: P('time', POS),
  }),
  imager: Object.freeze({
    pixelSize: P('length', POS),
    pixelScale: P('angle/pixel', POS),
    sensorWidth: P('pixel', { ...POS, integer: true }),
    sensorHeight: P('pixel', { ...POS, integer: true }),
    sensorCount: P('count', { ...POS, integer: true }),
    fieldWidth: P('angle', POS),
    fieldHeight: P('angle', POS),
    fieldArea: P('solid-angle', POS),
    readNoise: P('electrons', { min: 0, range: true }),
    gain: P('electrons/count', { ...POS, range: true }),
    darkCurrent: P('electrons/time/pixel', { min: 0 }),
    fullWell: P('electrons', { ...POS, range: true }),
    readoutTime: P('time', POS),
    cycleTime: P('time', POS),
    exposureTime: P('time', POS),
    bandpass: P('length', { ...POS, range: true }),
  }),
  receiver: Object.freeze({
    frequencyRange: P('frequency', { ...POS, range: true }),
    systemTemperature: P('temperature', POS),
    receiverTemperature: P('temperature', POS),
    beamFwhm: P('angle', POS),
    beamReferenceFrequency: P('frequency', POS),
    apertureEfficiency: P('ratio', { ...POS, max: 1 }),
    mainBeamEfficiency: P('ratio', { ...POS, max: 1 }),
    bandwidth: P('frequency', POS),
    velocityResolution: P('velocity', POS),
  }),
  band: Object.freeze({
    zeroPoint: P('magnitude'),
    throughputConstant: P('magnitude'),
    depth5sigma: P('magnitude'),
    seeing: P('angle', POS),
  }),
});
const TEXT_PARAMS = Object.freeze({ imager: ['filters'] });

/** The fields each class is expected to carry, for the completeness report. */
export const EXPECTED = Object.freeze({
  imager: Object.freeze({
    telescope: ['aperture', 'obstructionDiameter', 'focalRatio'],
    site: [
      'latitude',
      'longitude',
      'elevation',
      'seeing',
      'skyBrightness',
      'extinction',
    ],
    orbit: ['perigee', 'apogee', 'period'],
    instrument: [
      'pixelSize',
      'pixelScale',
      'sensorWidth',
      'sensorHeight',
      'field',
      'readNoise',
      'gain',
      'darkCurrent',
      'fullWell',
      'zeroPoint',
    ],
  }),
  radio: Object.freeze({
    telescope: ['aperture', 'collectingArea'],
    site: ['latitude', 'longitude', 'elevation'],
    instrument: [
      'frequencyRange',
      'systemTemperature',
      'beamFwhm',
      'apertureEfficiency',
      'bandwidth',
      'velocityResolution',
    ],
  }),
});

const KEBAB = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const BAND = /^[A-Za-z0-9_'+-]{1,8}$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const finite = v => typeof v === 'number' && Number.isFinite(v);
const isObject = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const text = v => typeof v === 'string' && v.trim() !== '';

/**
 * The dimension signature of a unit written as the table writes it, or null:
 * a registry unit (dimension) or registry units joined by '/' (numerator over
 * each denominator).
 */
export function unitSignature(u) {
  if (typeof u !== 'string') return null;
  const whole = unitIdOf(u);
  if (whole !== undefined) return UNITS[whole].dim;
  if (!u.includes('/')) return null;
  const parts = u.split('/').map(p => unitIdOf(p));
  if (parts.some(p => p === undefined)) return null;
  return parts.map(p => UNITS[p].dim).join('/');
}

/** Every problem with one source record. */
function checkSource(id, s, out) {
  const at = `sources.${id}`;
  const need = (ok, k, msg) => {
    if (!ok) out.push({ path: `${at}.${k}`, message: msg });
  };
  if (!isObject(s)) return out.push({ path: at, message: 'is not an object' });
  need(SOURCE_KINDS.includes(s.kind), 'kind', `is one of ${SOURCE_KINDS}`);
  need(text(s.title), 'title', 'is required');
  need(text(s.authors), 'authors', 'is required');
  need(Number.isInteger(s.year), 'year', 'is a whole year');
  need(text(s.ref), 'ref', 'names where the value is published');
  if (s.kind !== TYPICAL_SOURCE_KIND)
    need(
      typeof s.url === 'string' && /^https:\/\/\S+$/.test(s.url),
      'url',
      'is an https address of the public document'
    );
  need(
    typeof s.retrieved === 'string' && ISO_DATE.test(s.retrieved),
    'retrieved',
    'is the retrieval date, YYYY-MM-DD'
  );
  need(text(s.method), 'method', 'says how it was read');
  need(text(s.rights), 'rights', 'records the rights basis');
  return out;
}

/**
 * Everything wrong with a table of sources.
 * @returns {Array<{path: string, message: string}>}
 */
export function validateSources(sources) {
  const out = [];
  if (!isObject(sources))
    return [{ path: 'sources', message: 'is not an object' }];
  for (const [id, s] of Object.entries(sources)) {
    if (!KEBAB.test(id))
      out.push({ path: `sources.${id}`, message: 'is a kebab-case id' });
    checkSource(id, s, out);
  }
  return out;
}

/**
 * Check one value object against its parameter.
 * @param {*} val - The value object
 * @param {string} path - Where it is, for the message
 * @param {object|null} spec - The parameter, or null for a text value
 * @param {{sources: object, typical: boolean, cited?: Set<string>}} ctx
 * @param {Array} out - Problems are pushed here
 */
function checkValue(val, path, spec, ctx, out) {
  const bad = message => out.push({ path, message });
  if (!isObject(val)) return bad('is not a value object');
  const allowed = spec
    ? ['v', 'u', 's', 'at', 'q', 'n']
    : ['t', 's', 'at', 'n'];
  for (const k of Object.keys(val))
    if (!allowed.includes(k)) bad(`has a field "${k}" no value has`);
  // The source: every value has one, and it is in the table.
  if (!text(val.s)) return bad('has no source (s)');
  const src = ctx.sources[val.s];
  if (!src) return bad(`cites "${val.s}", which is not in the sources`);
  ctx.cited?.add(val.s);
  const isTypicalSource = src.kind === TYPICAL_SOURCE_KIND;
  if (ctx.typical && !isTypicalSource)
    bad(
      'is in a typical entry but cites a real source; a typical entry cites the project convention only'
    );
  if (!ctx.typical && isTypicalSource)
    bad('cites the project convention in a real facility');
  for (const k of ['at', 'n'])
    if (val[k] !== undefined && !text(val[k])) bad(`${k} is a non-empty text`);
  if (!spec) {
    if (!text(val.t)) bad('has no text (t)');
    return;
  }
  if (val.q !== undefined && !QUALIFIERS.includes(val.q))
    bad(`has a qualifier that is not one of ${QUALIFIERS.join(', ')}`);
  // The number, or the range.
  let nums;
  if (Array.isArray(val.v)) {
    if (!spec.range) bad('is a range, which this parameter does not take');
    if (val.v.length !== 2 || !val.v.every(finite) || val.v[0] > val.v[1])
      bad('is a range of two finite numbers, low then high');
    nums = val.v.filter(finite);
  } else if (finite(val.v)) nums = [val.v];
  else return bad('has no finite number (v): a missing value is absent');
  // The unit.
  const sig = unitSignature(val.u);
  if (sig === null)
    bad(`has a unit (${JSON.stringify(val.u)}) that is not in the registry`);
  else if (sig !== spec.dim)
    bad(`has a unit of dimension ${sig}; this parameter is ${spec.dim}`);
  for (const n of nums) {
    if (spec.integer && !Number.isInteger(n)) bad('is a whole number');
    if (spec.min !== undefined && (spec.open ? n <= spec.min : n < spec.min))
      bad(`is outside its bound (${n})`);
    if (spec.max !== undefined && n > spec.max) bad(`is above ${spec.max}`);
  }
}

/** A block of named parameters (telescope, site, instrument). */
function checkBlock(block, path, kinds, ctx, out, textKeys = []) {
  if (!isObject(block)) return out.push({ path, message: 'is not an object' });
  const table = Object.assign({}, ...kinds.map(k => PARAMS[k]));
  for (const [k, val] of Object.entries(block)) {
    const p = `${path}.${k}`;
    if (['name', 'id', 'kind', 'bands'].includes(k)) continue;
    if (textKeys.includes(k)) checkValue(val, p, null, ctx, out);
    else if (!Object.hasOwn(table, k))
      out.push({ path: p, message: 'is not a parameter of this block' });
    else if (table[k].band) {
      // A per-band map, or (seeing) one value.
      if (isObject(val) && 'v' in val) {
        if (table[k].band === 'only')
          out.push({ path: p, message: 'is given per band' });
        else checkValue(val, p, table[k], ctx, out);
      } else if (isObject(val))
        for (const [b, bv] of Object.entries(val)) {
          if (!BAND.test(b))
            out.push({ path: `${p}.${b}`, message: 'is not a band id' });
          checkValue(bv, `${p}.${b}`, table[k], ctx, out);
        }
      else out.push({ path: p, message: 'is not a value or a band map' });
    } else checkValue(val, p, table[k], ctx, out);
  }
}

/**
 * Everything wrong with a site.
 * @returns {Array<{path: string, message: string}>}
 */
export function validateSite(id, site, ctx) {
  const out = [];
  const path = `sites.${id}`;
  if (!isObject(site)) return [{ path, message: 'is not an object' }];
  if (!KEBAB.test(id)) out.push({ path, message: 'is a kebab-case id' });
  if (!text(site.name))
    out.push({ path: `${path}.name`, message: 'is required' });
  if (site.kind !== 'ground' && site.kind !== 'orbit')
    out.push({ path: `${path}.kind`, message: 'is ground or orbit' });
  const rest = { ...site };
  delete rest.kind;
  delete rest.name;
  checkBlock(
    rest,
    path,
    [site.kind === 'orbit' ? 'orbit' : 'ground'],
    ctx,
    out
  );
  return out;
}

/**
 * Everything wrong with one facility, given the sources and sites it may name.
 * @param {object} f - The facility
 * @param {{sources: object, sites: object, typical?: boolean, cited?: Set<string>}} lib
 * @returns {Array<{path: string, message: string}>}
 */
export function validateFacility(f, lib) {
  const out = [];
  const path = `facilities.${f?.id}`;
  const need = (ok, k, message) => {
    if (!ok) out.push({ path: `${path}.${k}`, message });
  };
  if (!isObject(f)) return [{ path, message: 'is not an object' }];
  const known = [
    'id',
    'class',
    'typical',
    'name',
    'note',
    'site',
    'telescope',
    'instruments',
  ];
  for (const k of Object.keys(f))
    need(known.includes(k), k, 'is not a field of a facility');
  need(KEBAB.test(f.id ?? ''), 'id', 'is a kebab-case id');
  need(CLASSES.includes(f.class), 'class', `is one of ${CLASSES.join(', ')}`);
  need(typeof f.typical === 'boolean', 'typical', 'is true or false');
  need(text(f.name), 'name', 'is required');
  const ctx = { ...lib, typical: f.typical === true };
  if (f.site !== undefined) {
    need(
      text(f.site) && Object.hasOwn(lib.sites, f.site),
      'site',
      'names a site in the table'
    );
    if (f.typical === true) need(false, 'site', 'a typical entry has no site');
  } else if (f.typical !== true && f.class !== undefined)
    need(false, 'site', 'a real facility names its site');
  if (!isObject(f.telescope) || !text(f.telescope.name))
    need(false, 'telescope', 'has a name');
  checkBlock(f.telescope, `${path}.telescope`, ['telescope'], ctx, out);
  need(
    Array.isArray(f.instruments) && f.instruments.length > 0,
    'instruments',
    'lists at least one instrument'
  );
  const seen = new Set();
  for (const [i, ins] of (Array.isArray(f.instruments)
    ? f.instruments
    : []
  ).entries()) {
    const ip = `${path}.instruments[${i}]`;
    if (!isObject(ins)) {
      out.push({ path: ip, message: 'is not an object' });
      continue;
    }
    if (!KEBAB.test(ins.id ?? '') || seen.has(ins.id))
      out.push({ path: `${ip}.id`, message: 'is a unique kebab-case id' });
    seen.add(ins.id);
    if (!INSTRUMENT_KINDS.includes(ins.kind))
      out.push({
        path: `${ip}.kind`,
        message: `is one of ${INSTRUMENT_KINDS.join(', ')}`,
      });
    if (!text(ins.name))
      out.push({ path: `${ip}.name`, message: 'is required' });
    checkBlock(
      ins,
      ip,
      [ins.kind === 'receiver' ? 'receiver' : 'imager'],
      ctx,
      out,
      TEXT_PARAMS.imager
    );
    if (ins.bands !== undefined) {
      if (!isObject(ins.bands))
        out.push({ path: `${ip}.bands`, message: 'is a map of bands' });
      else
        for (const [b, params] of Object.entries(ins.bands)) {
          if (!BAND.test(b))
            out.push({ path: `${ip}.bands.${b}`, message: 'is not a band id' });
          checkBlock(params, `${ip}.bands.${b}`, ['band'], ctx, out);
        }
    }
  }
  return out;
}

/**
 * Everything wrong with a whole library: its sources, sites and facilities,
 * and every source and site left unused.
 * @returns {Array<{path: string, message: string}>}
 */
export function validateLibrary({ sources, sites, facilities }) {
  const out = validateSources(sources);
  const cited = new Set();
  const usedSites = new Set();
  const ids = new Set();
  for (const [id, s] of Object.entries(sites ?? {}))
    out.push(...validateSite(id, s, { sources, typical: false, cited }));
  for (const f of facilities ?? []) {
    if (ids.has(f?.id))
      out.push({ path: `facilities.${f.id}`, message: 'is a duplicate id' });
    ids.add(f?.id);
    if (f?.site) usedSites.add(f.site);
    out.push(...validateFacility(f, { sources, sites: sites ?? {}, cited }));
  }
  for (const id of Object.keys(sources ?? {}))
    if (!cited.has(id))
      out.push({ path: `sources.${id}`, message: 'is cited by no value' });
  for (const id of Object.keys(sites ?? {}))
    if (!usedSites.has(id))
      out.push({ path: `sites.${id}`, message: 'is used by no facility' });
  return out;
}

const has = (o, k) => o !== undefined && o !== null && Object.hasOwn(o, k);

/**
 * How complete a facility is against what its class is expected to carry.
 * @param {object} f - The facility
 * @param {object|undefined} site - Its site, if it has one
 * @returns {{present: number, expected: number, missing: string[],
 *   byBlock: Object<string, {present: number, expected: number}>}}
 */
export function completeness(f, site) {
  const family = f.class === 'radio' ? 'radio' : 'imager';
  const want = EXPECTED[family];
  const ins = f.instruments?.[0] ?? {};
  const blocks = {};
  const missing = [];
  const run = (block, names, probe) => {
    let present = 0;
    for (const n of names) {
      const ok = probe(n);
      if (ok) present++;
      else missing.push(`${block}.${n}`);
    }
    blocks[block] = { present, expected: names.length };
  };
  run('telescope', want.telescope, n => has(f.telescope, n));
  if (site?.kind === 'orbit') run('orbit', want.orbit, n => has(site, n));
  else run('site', want.site, n => has(site, n));
  run('instrument', want.instrument, n => {
    if (n === 'field') return has(ins, 'fieldWidth') || has(ins, 'fieldArea');
    if (n === 'zeroPoint')
      return Object.values(ins.bands ?? {}).some(b => has(b, 'zeroPoint'));
    return has(ins, n);
  });
  const present = Object.values(blocks).reduce((s, b) => s + b.present, 0);
  const expected = Object.values(blocks).reduce((s, b) => s + b.expected, 0);
  return { present, expected, missing, byBlock: blocks };
}

/**
 * Everything wrong with a gravitas.instrument/1 pack: the envelope, then the
 * same checks as a built-in facility, with the pack's own sources and sites
 * added to the built-in ones, and refusing an id a built-in already uses.
 * @param {object} pack
 * @param {{sources: object, sites: object, facilityIds: string[]}} builtin
 * @returns {Array<{path: string, message: string}>}
 */
export function validatePack(pack, builtin) {
  const out = [];
  const bad = (path, message) => out.push({ path, message });
  if (!isObject(pack)) return [{ path: '', message: 'is not an object' }];
  for (const k of Object.keys(pack))
    if (
      ![
        'format',
        'formatVersion',
        'id',
        'title',
        'sources',
        'sites',
        'facility',
      ].includes(k)
    )
      bad(k, 'is not a field of an instrument pack');
  if (pack.format !== FORMAT) bad('format', `is not ${FORMAT}`);
  if (pack.formatVersion !== FORMAT_VERSION) bad('formatVersion', 'is not 1');
  if (!KEBAB.test(pack.id ?? '')) bad('id', 'is a kebab-case id');
  if (!isObject(pack.facility)) {
    bad('facility', 'is required: one facility');
    return out;
  }
  const f = pack.facility;
  if (builtin.facilityIds.includes(f.id))
    bad('facility.id', `"${f.id}" is a facility Gravitas already has`);
  if (builtin.facilityIds.includes(pack.id))
    bad('id', `"${pack.id}" is a facility Gravitas already has`);
  for (const id of Object.keys(pack.sources ?? {}))
    if (Object.hasOwn(builtin.sources, id))
      bad(`sources.${id}`, 'is a source id Gravitas already has');
  for (const id of Object.keys(pack.sites ?? {}))
    if (Object.hasOwn(builtin.sites, id))
      bad(`sites.${id}`, 'is a site id Gravitas already has');
  const sources = { ...builtin.sources, ...(pack.sources ?? {}) };
  const sites = { ...builtin.sites, ...(pack.sites ?? {}) };
  out.push(
    ...validateSources(pack.sources ?? {}).map(p => ({ ...p, path: p.path }))
  );
  const ctxSite = { sources, typical: false };
  for (const [id, s] of Object.entries(pack.sites ?? {}))
    out.push(...validateSite(id, s, ctxSite));
  // A pack's facility is a real one unless it says it is typical; a typical
  // one must say so and cite the convention source it carries itself.
  out.push(...validateFacility(f, { sources, sites }));
  return out;
}

/** A readable list of problems, for a thrown error or a test message. */
export const describeProblems = problems =>
  problems.map(p => `${p.path}: ${p.message}`).join('\n');
