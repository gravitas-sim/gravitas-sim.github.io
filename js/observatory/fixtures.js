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
// Each loads only when it is opened, through the same route the rest of the
// site uses (js/platform/resolver.js for the packs and the SDSS bundle; a
// dynamic import of the GWOSC module), and becomes a gravitas.observation/1
// (./schema.js). Nothing is resampled on the way; what was reduced before the
// data reached Gravitas is carried in `reductions`, and what this adds - an
// image pixel's position on the sky - is said to be added.
//
// A few numbers here are copied from the SDSS and GWOSC provenance records,
// which the browser never loads (a test keeps them out of js/, because they
// are several kilobytes nothing on screen needs): each star's position and
// redshift, and the catalog citations. tests/observatoryFixtures.test.js
// holds every copied value to its record.
// =============================================================================

import { loadBuiltin } from '../platform/resolver.js';
import { observationOf } from '../observation.js';
import { FORMAT, FORMAT_VERSION } from './schema.js';
import { skyOf } from './wcs.js';

const base = {
  format: FORMAT,
  formatVersion: FORMAT_VERSION,
  masks: [],
  annotations: [],
};

/** Positions and redshifts, copied from the SDSS provenance record. */
export const SDSS_STARS = Object.freeze({
  a: { ra: 302.69822, dec: -11.853501, z: -0.0008099225 },
  g: { ra: 340.01167, dec: 13.415657, z: -0.0002128853 },
  k: { ra: 59.305354, dec: 11.870116, z: 0.00003935811 },
  m: { ra: 166.17079, dec: 37.659994, z: 0.0000618252 },
});

/** The GWOSC catalogs, as their provenance record cites them. */
export const GWOSC_CATALOGS = Object.freeze({
  'GWTC-1-confident': {
    text: 'LIGO Scientific and Virgo Collaborations, Phys. Rev. X 9, 031040 (2019)',
    url: 'https://doi.org/10.7935/82H3-HH23',
  },
  'GWTC-2.1-confident': {
    text: 'LIGO Scientific and Virgo Collaborations, Phys. Rev. D 109, 022001 (2024)',
    url: 'https://doi.org/10.7935/qf3a-3z67',
  },
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

async function tessLightCurve() {
  const mod = await loadBuiltin('data/tess-hd209458-s56');
  const P = mod.PACK;
  const o = observationOf(mod);
  if (!/^BTJD = BJD - 2457000$/.test(P.time.reference)) {
    throw new Error(`the pack counts time as ${P.time.reference}, not BTJD`);
  }
  return {
    ...base,
    kind: 'time-series',
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
    citations: [
      {
        text: 'TESS light curves from MAST (Ricker et al. 2015, JATIS 1, 014003)',
        url: 'https://doi.org/10.17909/t9-nmc8-f686',
      },
    ],
    reductions: [
      ...P.masks.map(m => `${m.column}: ${m.rule} (${m.dropped} dropped)`),
      ...(P.reductions || []),
    ],
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
  const mod = await loadBuiltin('data/sdss-spectra');
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
    origin: 'observed',
    source: { kind: 'builtin', id: 'sdss-dr18-spectra', version: null },
    credit: mod.CITATION,
    license: {
      status: 'public-domain',
      statement:
        'SDSS data are public; SDSS asks that work using them cite the release and acknowledge the survey (see NOTICE).',
    },
    retrieved: '2026-09-21',
    citations: [{ text: mod.CITATION, url: 'https://www.sdss.org/dr18/' }],
    reductions: [
      'Averaged three adjacent archive samples into one: 3,813 samples at a log step of 0.0001 became 1,271 at 0.0003. SDSS resolves about 2.2 samples, so the average costs resolution the spectrograph did not deliver.',
      'The archive’s per-sample uncertainty is not in this bundle, so the flux has no uncertainty here.',
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
  const used = [...new Set(events.map(e => e.catalogVersion.split(' ')[0]))];
  return {
    ...base,
    kind: 'table',
    id: 'builtin:gwosc-gwtc-events',
    title: 'Five gravitational-wave events: GWOSC catalog values',
    object: null,
    facility: 'LIGO and Virgo (GWOSC)',
    origin: 'compilation',
    source: { kind: 'builtin', id: 'gwosc-events', version: null },
    credit: mod.CITATION,
    license: {
      status: 'cc-by-4.0',
      statement:
        'GWOSC open data, CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/).',
    },
    retrieved: '2026-09-23',
    citations: used.map(c => GWOSC_CATALOGS[c]).filter(Boolean),
    reductions: [
      'Copied as GWOSC serves them: the median, and the lower and upper offsets to the edges of the 90% interval. Gravitas measured none of them.',
    ],
    columns,
    axes: { x: 'chirp_mass_source', y: 'luminosity_distance' },
  };
}

async function tessAperture() {
  const mod = await loadBuiltin('data/tess-hd209458-s56-aperture');
  const P = mod.PACK;
  const o = observationOf(mod);
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
    citations: [
      {
        text: 'TESS light curves from MAST (Ricker et al. 2015, JATIS 1, 014003)',
        url: 'https://doi.org/10.17909/t9-nmc8-f686',
      },
      {
        text: P.image.bitsSource,
        url: 'https://ntrs.nasa.gov/citations/20180007935',
      },
    ],
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
]);

/** Open a fixture by id. */
export async function openFixture(id) {
  const f = FIXTURES.find(x => x.id === id);
  if (!f) throw new Error(`there is no fixture "${id}"`);
  return f.load();
}
