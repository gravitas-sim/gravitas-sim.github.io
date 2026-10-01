// =============================================================================
// The observations the workspace opens with: authentic, small, one of each
// -----------------------------------------------------------------------------
// Every fixture is data Gravitas already ships, measured by someone else and
// credited as it is everywhere else in the site:
//
//   time series   HD 209458, TESS sector 56, the light-curve data pack
//   spectrum      four SDSS DR18 stars, one each of A, G, K and M
//   table         five GWOSC events, their catalog values and intervals
//   image         the same TESS light curve's aperture mask, a data pack
//
// Each loads only when it is opened, by the same reviewed import the rest of
// the site uses (js/platform/builtins.js for the packs and the SDSS bundle; a
// dynamic import of the GWOSC module), and becomes a gravitas.observation/1
// (./schema.js). Nothing is resampled on the way; what was reduced before the
// data reached Gravitas is carried in `reductions`, and what this adds - an
// image pixel's position on the sky - is said to be added.
//
// Every credit, licence, retrieval date and citation comes from the pack the
// data came in: PACK, its manifest's runtime fields (DATA_PACKS.md). The
// manifests themselves the browser never loads. One kind of number is still
// copied here from a manifest, because the runtime copy does not carry it:
// each SDSS star's position and redshift. tests/observatory.test.js holds
// every copied value to its manifest.
// =============================================================================

import { BUILTINS } from '../platform/builtins.js';
// The pack decoder arrives with the first observation opened, not with the
// page: nothing on screen needs it before then.
const decode = async mod =>
  (await import('../observation.js')).observationOf(mod);
import { FORMAT, FORMAT_VERSION } from './schema.js';
import { skyOf } from './wcs.js';

const base = {
  format: FORMAT,
  formatVersion: FORMAT_VERSION,
  masks: [],
  annotations: [],
};

/**
 * Positions and redshifts, copied from the records in
 * data-packs/sdss-dr18-stellar-spectra.json.
 */
export const SDSS_STARS = Object.freeze({
  a: { ra: 302.69822, dec: -11.853501, z: -0.0008099225 },
  g: { ra: 340.01167, dec: 13.415657, z: -0.0002128853 },
  k: { ra: 59.305354, dec: 11.870116, z: 0.00003935811 },
  m: { ra: 166.17079, dec: 37.659994, z: 0.0000618252 },
});

/**
 * A pack's citations as an observation carries them: the words, and a link a
 * reader can follow, made from the DOI or bibcode the manifest records.
 * @param {Array<{text: string, doi?: string, bibcode?: string, url?: string}>} cites
 * @returns {Array<{text: string, url?: string}>}
 */
export const linkedCitations = (cites = []) =>
  cites.map(c => {
    const url = c.url
      ? c.url
      : c.doi
        ? `https://doi.org/${c.doi}`
        : c.bibcode
          ? `https://ui.adsabs.harvard.edu/abs/${c.bibcode}`
          : null;
    return url ? { text: c.text, url } : { text: c.text };
  });

/** The catalog values the table shows, and what each is. */
const GWOSC_PARAMETERS = [
  ['mass_1_source', 'primary mass (source frame)'],
  ['mass_2_source', 'secondary mass (source frame)'],
  ['chirp_mass_source', 'chirp mass (source frame)'],
  ['total_mass_source', 'total mass (source frame)'],
  ['final_mass_source', 'final mass (source frame)'],
  ['luminosity_distance', 'luminosity distance'],
  ['redshift', 'redshift'],
  ['network_matched_filter_snr', 'network signal-to-noise ratio'],
];
const GWOSC_UNITS = { M_sun: 'Msun', Mpc: 'Mpc', '': '' };

// A pack's module by its builtin id: js/platform/resolver.js loadBuiltin()
// without the resolver, whose import installs every packaged lesson's
// loaders and brings the investigations manifest with them - 22 KB of this
// page's start-up that it never used. A failed import is retried by the
// module system on the next open, as loadBuiltin() would.
const loadPack = id => BUILTINS[id]();

async function tessLightCurve() {
  return lightCurveObservation(await loadPack('data/tess-hd209458-s56'), {});
}

/**
 * A TESS light-curve pack module as a gravitas.observation/1: this one, and
 * one installed from the catalog (js/catalog/installed.js, prefix `installed`).
 * The citations are the pack's own unless the caller has others to give.
 */
export async function lightCurveObservation(
  mod,
  { citations, idPrefix = 'pack' }
) {
  const P = mod.PACK;
  citations = citations || linkedCitations(P.citations);
  const o = await decode(mod);
  if (!/^BTJD = BJD - 2457000$/.test(P.time.reference)) {
    throw new Error(`the pack counts time as ${P.time.reference}, not BTJD`);
  }
  return {
    ...base,
    kind: 'time-series',
    id: `${idPrefix}:${P.id}@${P.version}`,
    title: P.title,
    object: {
      name: P.object.name,
      ra: P.object.ra,
      dec: P.object.dec,
      frame: P.object.frame,
    },
    facility: [
      P.facility.observatory,
      P.facility.instrument,
      P.facility.pipeline,
    ].join(', '),
    origin: P.origin,
    source: { kind: 'pack', id: P.id, version: P.version },
    credit: P.credit,
    license: P.license,
    retrieved: P.retrieved,
    citations,
    reductions: [
      ...P.masks.map(m => `${m.column}: ${m.rule} (${m.dropped} dropped)`),
      ...(P.reductions || []),
      ...(P.crowding
        ? [
            `crowding: the pipeline gives ${(100 * P.crowding.crowdsap).toFixed(1)}% of the aperture's light to this star (CROWDSAP ${P.crowding.crowdsap}), and the aperture holds ${(100 * P.crowding.flfrcsap).toFixed(1)}% of the star's light (FLFRCSAP ${P.crowding.flfrcsap})`,
          ]
        : []),
    ],
    // The pack's own record, structured, for a guide to read (not exported:
    // gravitas.observation/1 keeps only the fields it knows).
    pack: { masks: P.masks, crowding: P.crowding ?? null },
    columns: [
      { id: 'time', name: 'time', unit: 'd', role: 'x', values: o.x.values },
      { id: 'flux', name: 'flux', unit: '', role: 'value', values: o.y.values },
      {
        id: 'flux-error',
        name: 'flux error',
        unit: '',
        role: 'uncertainty',
        of: 'flux',
        values: o.err,
      },
    ],
    axes: { x: 'time', y: 'flux' },
    time: { column: 'time', format: 'BTJD', scale: P.time.scale },
  };
}

async function sdssSpectrum(id) {
  const mod = await loadPack('data/sdss-spectra');
  const P = mod.PACK;
  const s = mod.decodeSpectrum(id);
  const star = SDSS_STARS[id];
  const name = `SDSS ${s.plate}-${s.mjd}-${s.fiberID}`;
  return {
    ...base,
    kind: 'spectrum',
    id: `builtin:sdss-dr18-${id}`,
    title: `${name}: a ${s.subClass} star (ELODIE ${s.elodieSpType})`,
    object: { name, ra: star.ra, dec: star.dec, frame: 'ICRS' },
    facility:
      'SDSS 2.5 m telescope, Apache Point Observatory; legacy spectrograph',
    origin: P.origin,
    source: { kind: 'builtin', id: 'sdss-dr18-spectra', version: null },
    credit: P.credit,
    license: P.license,
    retrieved: P.retrieved,
    citations: linkedCitations(P.citations),
    reductions: [
      ...P.reductions,
      `Wavelengths in vacuum, heliocentric, not shifted to rest; SDSS measures this star’s redshift as z = ${star.z}.`,
    ],
    columns: [
      {
        id: 'wavelength',
        name: 'wavelength',
        unit: 'Angstrom',
        role: 'x',
        values: Float64Array.from(mod.wavelengths()),
      },
      {
        id: 'flux',
        name: 'flux',
        unit: '1e-17 erg/s/cm2/Angstrom',
        role: 'value',
        values: Float64Array.from(s.flux),
      },
    ],
    axes: { x: 'wavelength', y: 'flux' },
    spectral: {
      column: 'wavelength',
      quantity: 'wavelength',
      medium: 'vacuum',
      frame: 'heliocentric',
      redshift: star.z,
    },
  };
}

async function gwoscCatalog() {
  const mod = await import('../data/gw/gwoscEvents.js');
  const ids = mod.EVENT_IDS;
  const events = ids.map(id => mod.EVENTS[id]);
  const columns = [
    { id: 'event', name: 'event', unit: null, role: 'label', values: [...ids] },
    {
      id: 'catalog',
      name: 'catalog version',
      unit: null,
      role: 'label',
      values: events.map(e => e.catalogVersion),
    },
  ];
  const num = v => (typeof v === 'number' ? v : NaN);
  for (const [key, name] of GWOSC_PARAMETERS) {
    const unit =
      GWOSC_UNITS[events.find(e => e.catalog[key])?.catalog[key].unit ?? ''];
    columns.push(
      {
        id: key,
        name,
        unit,
        role: 'value',
        values: Float64Array.from(events, e => num(e.catalog[key]?.value)),
      },
      {
        id: `${key}-lower`,
        name: `${name}, lower`,
        unit,
        role: 'lower',
        of: key,
        level: 0.9,
        values: Float64Array.from(events, e => num(e.catalog[key]?.lower)),
      },
      {
        id: `${key}-upper`,
        name: `${name}, upper`,
        unit,
        role: 'upper',
        of: key,
        level: 0.9,
        values: Float64Array.from(events, e => num(e.catalog[key]?.upper)),
      }
    );
  }
  return {
    ...base,
    kind: 'table',
    id: 'builtin:gwosc-gwtc-events',
    title: 'Five gravitational-wave events: GWOSC catalog values',
    object: null,
    facility: 'LIGO and Virgo (GWOSC)',
    origin: 'compilation',
    source: { kind: 'builtin', id: 'gwosc-events', version: null },
    credit: mod.PACK.credit,
    license: mod.PACK.license,
    retrieved: mod.PACK.retrieved,
    citations: linkedCitations(mod.PACK.citations),
    reductions: [
      'Copied as GWOSC serves them: the median, and the lower and upper offsets to the edges of the 90% interval. Gravitas measured none of them.',
    ],
    columns,
    axes: { x: 'chirp_mass_source', y: 'luminosity_distance' },
  };
}

/**
 * A table pack (js/tableObservation.js) as a gravitas.observation/1 table: its
 * columns, their uncertainties marked as such, and what was done to it. The
 * decoder and the pack both arrive only when it is opened.
 */
async function tablePack(load, { axes }) {
  const [mod, { tableOf }] = await Promise.all([
    load(),
    import('../tableObservation.js'),
  ]);
  const P = mod.PACK;
  const table = tableOf(mod);
  return {
    ...base,
    kind: 'table',
    id: `pack:${P.id}@${P.version}`,
    title: P.title,
    object:
      P.object?.ra === undefined
        ? null
        : {
            name: P.object.name,
            ra: P.object.ra,
            dec: P.object.dec,
            frame: P.object.frame,
          },
    facility: [
      P.facility.observatory,
      P.facility.instrument,
      P.facility.pipeline,
    ]
      .filter(Boolean)
      .join(', '),
    origin: P.origin,
    source: { kind: 'pack', id: P.id, version: P.version },
    credit: P.credit,
    license: P.license,
    retrieved: P.retrieved,
    citations: linkedCitations(P.citations),
    reductions: [
      ...P.masks.map(m => `${m.column}: ${m.rule} (${m.dropped} dropped)`),
      ...(P.reductions || []),
    ],
    pack: { masks: P.masks },
    columns: table.columns.map(c => ({
      id: c.id,
      name: c.name,
      unit: c.unit || '',
      role: c.uncertaintyOf ? 'uncertainty' : 'value',
      ...(c.uncertaintyOf ? { of: c.uncertaintyOf } : {}),
      values: c.values,
    })),
    axes,
  };
}

// Observatory-only packs: imported here, never through js/platform/builtins.js,
// which the application reaches (DATA_PACKS.md).
const ngc2420Photometry = () =>
  tablePack(() => import('../data/observations/sdssNgc2420Photometry.js'), {
    axes: { x: 'ra', y: 'dec' },
  });
const ngc2420Segue = () =>
  tablePack(() => import('../data/observations/sdssNgc2420Segue.js'), {
    axes: { x: 'rv', y: 'feh' },
  });
const mistIsochrones = () =>
  tablePack(() => import('../data/observations/mistSdssIsochrones.js'), {
    axes: { x: 'logTeff', y: 'logL' },
  });

async function tessAperture() {
  const mod = await loadPack('data/tess-hd209458-s56-aperture');
  const P = mod.PACK;
  const o = await decode(mod);
  const { width, height, values, wcs, bits } = o.image;
  const n = width * height;
  const x = new Float64Array(n);
  const y = new Float64Array(n);
  const ra = new Float64Array(n);
  const dec = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    x[i] = (i % width) + 1;
    y[i] = Math.floor(i / width) + 1;
    const sky = skyOf(wcs, x[i], y[i]);
    ra[i] = sky ? sky.ra : NaN;
    dec[i] = sky ? sky.dec : NaN;
  }
  return {
    ...base,
    kind: 'image',
    id: `pack:${P.id}@${P.version}`,
    title: P.title,
    object: {
      name: P.object.name,
      ra: P.object.ra,
      dec: P.object.dec,
      frame: P.object.frame,
    },
    facility: [
      P.facility.observatory,
      P.facility.instrument,
      P.facility.pipeline,
    ].join(', '),
    origin: P.origin,
    source: { kind: 'pack', id: P.id, version: P.version },
    credit: P.credit,
    license: P.license,
    retrieved: P.retrieved,
    citations: linkedCitations(P.citations),
    reductions: [
      'The pixels are as the archive has them.',
      'Each pixel’s right ascension and declination are computed here from the file’s TAN world coordinates, at the pixel’s center; they are not in the file.',
    ],
    columns: [
      { id: 'x', name: 'column', unit: 'pix', role: 'x', values: x },
      { id: 'y', name: 'row', unit: 'pix', role: 'x', values: y },
      {
        id: 'flags',
        name: 'aperture flags',
        unit: '',
        role: 'flag',
        bits,
        values: Float64Array.from(values),
      },
      {
        id: 'ra',
        name: 'right ascension',
        unit: 'deg',
        role: 'value',
        values: ra,
      },
      {
        id: 'dec',
        name: 'declination',
        unit: 'deg',
        role: 'value',
        values: dec,
      },
    ],
    axes: { x: 'x', y: 'y' },
    image: {
      width,
      height,
      wcs,
      x: 'x',
      y: 'y',
      value: 'flags',
      bitsSource: P.image.bitsSource,
    },
  };
}

/** Every fixture, in the order the page offers them. */
export const FIXTURES = Object.freeze([
  { id: 'tess-light-curve', kind: 'time-series', load: tessLightCurve },
  { id: 'sdss-a', kind: 'spectrum', load: () => sdssSpectrum('a') },
  { id: 'sdss-g', kind: 'spectrum', load: () => sdssSpectrum('g') },
  { id: 'sdss-k', kind: 'spectrum', load: () => sdssSpectrum('k') },
  { id: 'sdss-m', kind: 'spectrum', load: () => sdssSpectrum('m') },
  { id: 'gwosc-events', kind: 'table', load: gwoscCatalog },
  { id: 'tess-aperture', kind: 'image', load: tessAperture },
  { id: 'ngc2420-photometry', kind: 'table', load: ngc2420Photometry },
  { id: 'ngc2420-segue', kind: 'table', load: ngc2420Segue },
  { id: 'mist-isochrones', kind: 'table', load: mistIsochrones },
]);

/** Open a fixture by id. */
export async function openFixture(id) {
  const f = FIXTURES.find(x => x.id === id);
  if (!f) throw new Error(`there is no fixture "${id}"`);
  return f.load();
}
