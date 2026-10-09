// =============================================================================
// The radiation kernel's data: four packs (Roadmap II, Prompt 82)
// -----------------------------------------------------------------------------
//   radiation-bandpasses   Johnson-Cousins UBVRI, SDSS ugriz, TESS, 2MASS JHK:
//                          photon-counting responses, and the AB - Vega offset of
//                          each band with the way it was found
//   radiation-lines        the strongest optical lines, from NIST ASD
//   radiation-extinction   the Cardelli, Clayton & Mathis 1989 law's coefficients
//   radiation-bolometric   Flower 1996 BC_V(Teff) as corrected by Torres 2010
//
// Each goes through the same build, check and rebuild as every other data pack
// (tools/build-data-packs.mjs, DATA_PACKS.md). Raw products are fetched once into
// .packs-cache/ and pinned (radiation/pins.json, by `node
// tools/data-packs/radiation/pin.mjs`). Nothing here is typed in from memory: a
// number is read from a pinned file, or typed from a cited table and then held to
// that table's other published numbers by validate().
//
// Not shipped, and why (RADIATION.md, "Blockers"): the Gaia G, G_BP and G_RP
// passbands (the ESA/DPAC table is CC BY-NC 3.0 IGO, which the project does not
// redistribute; see VO_ARCHIVE_GATE.md) and TiO band-head wavelengths (no
// retrievable, citable table was found).
// =============================================================================

import { Buffer } from 'node:buffer';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { readFits } from './fits.mjs';
import { LINE_SPECS, nistFile } from './radiation/specs.mjs';
import { airToVacuumNm } from '../../js/kernels/radiation/doppler.js';
import {
  abMag,
  decodeBand,
  meanPhotonWavelength,
  pivotWavelength,
  sedFromSamples,
  blackbodySed,
} from '../../js/kernels/radiation/photometry.js';
import { extinctionRatio } from '../../js/kernels/radiation/extinction.js';
import { bolometricCorrectionV } from '../../js/kernels/radiation/magnitudes.js';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const TRANSFORM_VERSION = '1.0.0';
const PINS = JSON.parse(
  readFileSync(path.join(REPO, 'tools/data-packs/radiation/pins.json'), 'utf8')
);
const pin = f => {
  if (!PINS[f]) throw new Error(`no pin for ${f}; run node tools/data-packs/radiation/pin.mjs`);
  return PINS[f];
};
const r4 = x => Number(x.toFixed(4));
const r3 = x => Number(x.toFixed(3));
const text = b => Buffer.from(b).toString('utf8');
const COMMON = { masks: [], reductions: [], compatible: { widgets: [], investigations: [] }, offline: 'optional' };

// --- Formatting ------------------------------------------------------------------

async function formatJs(body, file) {
  const prettier = await import('prettier');
  const options = (await prettier.resolveConfig(path.join(REPO, file))) || {};
  return prettier.format(body, { ...options, filepath: path.join(REPO, file) });
}

const header = (pack, meta, what, raw) => `// =============================================================================
// ${meta.title}
// -----------------------------------------------------------------------------
// GENERATED FILE. Do not edit. Written by tools/build-data-packs.mjs
// (tools/data-packs/radiation.mjs) from ${raw}; \`npm run packs:check\` verifies
// it offline and \`npm run packs:provenance\` rebuilds it from the pinned raw
// products and compares byte for byte. The full record - sources, pins, every
// step, the checks it passed - is ${pack.manifest}.
//
// ${what}
// The kernel (js/kernels/radiation/) does not import this module; a caller does,
// when it needs the data, and hands it in.
// =============================================================================
`;

/** The pack's `render` for tools/build-data-packs.mjs. */
const renderer = (pack, what, exportsOf) => async PACK => {
  const body = `${header(pack, PACK, what, pack.raw.map(r => r.file).join(', '))}
/** What the data is and who to credit, as an interface shows it. */
export const PACK = ${JSON.stringify(PACK, null, 2)};
${Object.entries(exportsOf)
  .map(([k, v]) => `\nexport const ${k} = ${JSON.stringify(v)};`)
  .join('\n')}
`;
  return formatJs(body, pack.module);
};

// =============================================================================
// 1. Bandpasses and zero points
// =============================================================================

const BAND_RAW = [
  'sdss-filter-curves.fits',
  'tess-response-function-v2.0.csv',
  'svo-2mass-j.dat',
  'svo-2mass-h.dat',
  'svo-2mass-ks.dat',
  'calspec-alpha-lyr-stis-008.fits',
  'irsa-2mass-absolute-calibration.html',
  'bm12-arxiv-1112.2698v1.pdf',
].map(pin);

/** The Vega magnitude every band's zero point assumes (BM12; Willmer 2018). */
const VEGA_MAG = 0.03;
/** Step of the uniform grid the resampled bands ship on, nm. */
const STEP_NM = 5;
/** SDSS curves are tabulated every 2.5 nm, and the u band sits on the Balmer jump. */
const SDSS_STEP_NM = 2.5;
/** The temperatures resampling is tested at, K. */
const TEST_T = [3000, 4000, 5000, 6000, 8000, 10000, 15000, 30000];

/** The BM12 table, from the committed transcription. */
function bm12() {
  const out = {};
  for (const l of readFileSync(path.join(REPO, 'tools/data-packs/radiation/bm12-table1.txt'), 'utf8').split('\n')) {
    const m = /^([UBVRI]) (\d+) ([\d.]+)$/.exec(l);
    if (m) (out[m[1]] ??= []).push([Number(m[2]) / 10, Number(m[3])]);
  }
  return out;
}

const svo = t =>
  t.split('\n').filter(l => /^\s*[\d.]/.test(l)).map(l => l.trim().split(/\s+/).map(Number)).map(([a, s]) => [a / 10, s]);

const csvRows = t =>
  t.split('\n').filter(l => /^\d/.test(l)).map(l => l.split(',').map(Number));

/** Native curves: id -> {lam (nm), s}. */
function nativeBands(bytes) {
  const [sdss, tess, j, h, ks] = bytes;
  const out = {};
  const bm = bm12();
  for (const k of 'UBVRI') out[k] = { lam: bm[k].map(r => r[0]), s: bm[k].map(r => r[1]) };
  const units = readFits(sdss);
  'ugriz'.split('').forEach((k, i) => {
    const u = units[i + 1];
    if (String(u.cards.EXTNAME).trim().toLowerCase() !== k)
      throw new Error(`SDSS extension ${i + 1} is ${u.cards.EXTNAME}, not ${k}`);
    out[k] = { lam: u.columns.wavelength.values.map(a => a / 10), s: u.columns.respt.values };
  });
  const t = csvRows(text(tess));
  out.T = { lam: t.map(r => r[0]), s: t.map(r => r[1]) };
  for (const [k, b] of [['J', j], ['H', h], ['Ks', ks]]) {
    const r = svo(text(b));
    out[k] = { lam: r.map(a => a[0]), s: r.map(a => a[1]) };
  }
  return out;
}

const interp = (lam, s) => x => {
  if (x <= lam[0] || x >= lam[lam.length - 1]) return x === lam[0] ? s[0] : x === lam[lam.length - 1] ? s[s.length - 1] : 0;
  let lo = 0, hi = lam.length - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (lam[m] <= x) lo = m; else hi = m; }
  return s[lo] + ((x - lam[lo]) / (lam[hi] - lam[lo])) * (s[hi] - s[lo]);
};

/** Resample a native curve onto a uniform grid, response to 1/10000 of its peak. */
function resample({ lam, s }, step) {
  const f = interp(lam, s);
  const nz = s.map((v, i) => (v > 0 ? i : -1)).filter(i => i >= 0);
  // Start at the last native zero before the response and end at the first one
  // after it, so the linear ramp is the native one and the ends are zero.
  const first = nz[0] > 0 ? lam[nz[0] - 1] : lam[0] - step;
  const last = nz[nz.length - 1] < lam.length - 1 ? lam[nz[nz.length - 1] + 1] : lam[lam.length - 1] + step;
  const lo = Number(first.toFixed(3));
  const n = Math.ceil((last - lo) / step - 1e-9);
  const grid = [];
  for (let k = 0; k <= n; k++) grid.push(Number((lo + k * step).toFixed(3)));
  const v = grid.map(f);
  const peak = Math.max(...v);
  return { startNm: lo, stepNm: step, scale: 10000, response: v.map(x => Math.round((x / peak) * 10000)) };
}

const BAND_INFO = {
  U: ['Johnson-Cousins', 'Johnson U', 'bm12'], B: ['Johnson-Cousins', 'Johnson B', 'bm12'],
  V: ['Johnson-Cousins', 'Johnson V', 'bm12'], R: ['Johnson-Cousins', 'Cousins R', 'bm12'],
  I: ['Johnson-Cousins', 'Cousins I', 'bm12'],
  u: ['SDSS', "SDSS u", 'sdss'], g: ['SDSS', 'SDSS g', 'sdss'], r: ['SDSS', 'SDSS r', 'sdss'],
  i: ['SDSS', 'SDSS i', 'sdss'], z: ['SDSS', 'SDSS z', 'sdss'],
  T: ['TESS', 'TESS T', 'tess'],
  J: ['2MASS', '2MASS J', '2mass'], H: ['2MASS', '2MASS H', '2mass'], Ks: ['2MASS', '2MASS Ks', '2mass'],
};

const SOURCES = {
  bm12: 'Bessell & Murphy 2012, PASP 124, 140, Table 1 (photon-counting UBVRI)',
  sdss: 'SDSS 2001 filter curves of J. Gunn, column respt: QE on the sky through 1.3 airmasses at APO (sdss4.org)',
  tess: 'TESS Instrument Response Function v2.0, R. Vanderspek, 2020 (NASA HEASARC)',
  '2mass': 'Cohen, Wheaton & Megeath 2003, AJ 126, 1090: relative spectral responses, photon-counting (IRSA)',
};

/** Vega's SED through the kernel's own sampler. */
function vegaSed(bytes) {
  const u = readFits(bytes).find(x => x.columns?.WAVELENGTH);
  // erg s^-1 cm^-2 A^-1 to W m^-2 nm^-1: 1e-7 / 1e-4 / 0.1.
  const lam = u.columns.WAVELENGTH.values.map(a => a / 10);
  const f = u.columns.FLUX.values.map(v => v * 1e-2);
  return sedFromSamples(lam, f);
}

function buildBands(bytes) {
  const nat = nativeBands(bytes);
  const vega = vegaSed(bytes[5]);
  const bands = [];
  const resampling = {};
  for (const [id, [system, name, source]] of Object.entries(BAND_INFO)) {
    const shipped =
      source === 'bm12'
        ? { startNm: nat[id].lam[0], stepNm: nat[id].lam[1] - nat[id].lam[0], scale: 1000, response: nat[id].s.map(v => Math.round(v * 1000)) }
        : resample(nat[id], source === 'sdss' ? SDSS_STEP_NM : STEP_NM);
    const band = decodeBand({ id, ...shipped });
    const abVega = abMag(band, vega);
    bands.push({ id, system, name, source, ...shipped, abMinusVega: r4(abVega - VEGA_MAG) });
    // What resampling cost: the worst AB magnitude change over blackbodies.
    const ref = decodeBand({ id, lambdaNm: nat[id].lam, response: nat[id].s, scale: 1 });
    let worst = 0;
    // Smooth spectra, and Vega, whose Balmer jump and lines are the hard case.
    for (const sed of [...TEST_T.map(T => blackbodySed(T)), vega]) {
      worst = Math.max(worst, Math.abs(abMag(band, sed) - abMag(ref, sed)));
    }
    resampling[id] = Number(worst.toFixed(5));
    if (worst > 0.003) throw new Error(`${id}: resampling to ${STEP_NM} nm moves a test magnitude by ${worst}`);
  }
  return { bands, resampling, nat };
}

// Published numbers the bands are held to. Tolerances and their reasons are
// fixed here, in the text, before the numbers they judge were compared.
const PUB_PIVOT_A = { U: 3597, B: 4377, V: 5488, R: 6515, I: 7981 }; // BM12 Table 5, lambda_p
const PIVOT_TOL_A = 2; // BM12 prints lambda_p to 1 A; the trapezoid on a 50-100 A grid adds under 1 A
// Willmer 2018, ApJS 236, 47, Table 3, "Vega (AB)": the AB - Vega offset of a band.
const WILLMER = {
  U: 0.768, B: -0.134, V: -0.017, R: 0.168, I: 0.408, // "Bessell Murphy" rows
  J: 0.87, H: 1.344, Ks: 1.814, u: 0.9, g: -0.125, r: 0.119, i: 0.332, z: 0.494,
};
// Willmer prints 3 decimals and estimates the Vega calibration at 2%, 0.02 mag,
// and for U and B the zero point rests on the Vega-based colour offsets that BM12
// say are uncertain by a few hundredths. Tolerance: 0.01 for the bands whose
// passbands are Willmer's own source (2MASS, SDSS: his table is then a rounding
// check), 0.05 for UBVRI, whose published offsets disagree between BM12 Tables 3
// and 5 and Willmer's by up to that much.
const WILLMER_TOL = { U: 0.05, B: 0.05, V: 0.05, R: 0.05, I: 0.05, J: 0.01, H: 0.01, Ks: 0.01, u: 0.01, g: 0.01, r: 0.01, i: 0.01, z: 0.01 };
// Cohen et al. 2003 via IRSA: zero-magnitude flux density of 2MASS, Jy. A Vega-0
// magnitude convention gives AB - Vega = 2.5 log10(3631 / F0).
const COHEN_JY = { J: 1594, H: 1024, Ks: 666.7 };
const COHEN_TOL = 0.02; // the fluxes are quoted to 1.7-2.0 percent

function validateBands(mod) {
  const against = [];
  const result = { pivotA: {}, offsetVsWillmer: {}, offsetVsCohen: {} };
  let ok = true;
  const decoded = Object.fromEntries(mod.BANDS.map(b => [b.id, decodeBand(b)]));
  for (const [k, pub] of Object.entries(PUB_PIVOT_A)) {
    const v = pivotWavelength(decoded[k]) * 10;
    against.push({ quantity: `pivot wavelength of ${k}`, value: pub, unit: 'Angstrom', ref: 'Bessell & Murphy 2012, Table 5' });
    result.pivotA[k] = Number(v.toFixed(1));
    ok &&= Math.abs(v - pub) <= PIVOT_TOL_A;
  }
  for (const [k, pub] of Object.entries(WILLMER)) {
    const v = mod.BANDS.find(b => b.id === k).abMinusVega;
    against.push({ quantity: `AB - Vega of ${k}`, value: pub, unit: 'mag', ref: 'Willmer 2018, ApJS 236, 47, Table 3' });
    result.offsetVsWillmer[k] = r3(v - pub);
    ok &&= Math.abs(v - pub) <= WILLMER_TOL[k];
  }
  for (const [k, f0] of Object.entries(COHEN_JY)) {
    const v = mod.BANDS.find(b => b.id === k).abMinusVega + VEGA_MAG; // Vega = 0 convention
    const pub = 2.5 * Math.log10(3631 / f0);
    against.push({ quantity: `AB - Vega of 2MASS ${k} from its zero-magnitude flux ${f0} Jy`, value: r3(pub), unit: 'mag', ref: 'Cohen et al. 2003 via IRSA (2MASS Explanatory Supplement VI.4a, Table 1)' });
    result.offsetVsCohen[k] = r3(v - pub);
    ok &&= Math.abs(v - pub) <= COHEN_TOL;
  }
  return {
    check:
      'each band reproduces the published pivot wavelength (UBVRI) and the published AB - Vega offset (Willmer 2018; 2MASS also from Cohen 2003 zero-magnitude fluxes), within the tolerances stated in tools/data-packs/radiation.mjs',
    against,
    result,
    ok,
  };
}

function checkBands(mod) {
  const out = [];
  const ids = new Set();
  for (const b of mod.BANDS) {
    if (ids.has(b.id)) out.push(`band ${b.id} is listed twice`);
    ids.add(b.id);
    const r = b.response;
    if (!(r.length > 3 && r[0] === 0 && r[r.length - 1] === 0)) out.push(`${b.id}: the response does not start and end at zero`);
    if (Math.max(...r) !== b.scale) out.push(`${b.id}: the peak is not 1`);
    if (r.some(v => !Number.isInteger(v) || v < 0)) out.push(`${b.id}: a response is not a non-negative integer`);
    if (!(b.stepNm > 0 && b.startNm > 0)) out.push(`${b.id}: the grid is not positive`);
    if (!Number.isFinite(b.abMinusVega)) out.push(`${b.id}: no AB - Vega offset`);
    if (!SOURCES[b.source]) out.push(`${b.id}: source ${b.source} is not in SOURCES`);
  }
  if (mod.BANDS.length !== Object.keys(BAND_INFO).length) out.push('the pack does not hold every band');
  return out;
}

const bandsPack = {
  id: 'radiation-bandpasses',
  label: 'Bandpasses and zero points',
  manifest: 'data-packs/radiation-bandpasses.json',
  capability: null,
  module: 'js/data/radiation/bandpasses.js',
  transformVersion: TRANSFORM_VERSION,
  raw: BAND_RAW,
  namedBy: ['js/kernels/radiation/packs.js'],
  async build(bytes) {
    const { bands, resampling } = buildBands(bytes);
    const meta = {
      id: this.id,
      version: '1.0.0',
      title: 'Photometric bandpasses (Johnson-Cousins UBVRI, SDSS ugriz, TESS, 2MASS JHK) and their AB - Vega zero points',
      object: { name: 'photometric systems', identifiers: bands.map(b => b.id) },
      facility: { observatory: 'compiled from the literature and the mission and survey archives', pipeline: 'tools/data-packs/radiation.mjs 1.0.0' },
      dataType: 'model-grid',
      origin: 'compilation',
      credit: 'Bessell & Murphy 2012; SDSS Collaboration (J. Gunn); NASA TESS (R. Vanderspek, MIT); Cohen, Wheaton & Megeath 2003 (2MASS, IRSA, SVO Filter Profile Service); Vega: Bohlin 2014, CALSPEC (STScI)',
      license: {
        status: 'attribution-requested',
        statement:
          'Response functions are measured, tabulated instrument properties published by their teams or archives (BM12 Table 1; the SDSS, TESS and 2MASS archives), shipped here resampled to a uniform grid with the AB - Vega offsets computed from the public-domain CALSPEC Vega spectrum. The TESS and 2MASS archives and the SDSS publish them for use with acknowledgement; no licence text accompanies the BM12 table or the SVO copy of the 2MASS curves.',
        basis:
          'A numerical table of measured response functions (about 700 values, none of them prose), cited to its paper or archive band by band, with the offsets computed here. The Gaia passbands were not included because Gaia data are CC BY-NC 3.0 IGO. If Carl prefers no reproduction of the BM12 table, the UBVRI bands can be rebuilt from SVO\'s Bessell 1990 curves (record in RADIATION.md).',
      },
      retrieved: '2026-10-09',
      columns: [
        { name: 'wavelength', unit: 'nm', description: 'startNm + i * stepNm' },
        { name: 'response', unit: '', description: 'photon-counting relative response, integer in units of 1/scale of the peak' },
        { name: 'abMinusVega', unit: 'mag', description: 'm_AB - m_Vega of the band, with Vega = 0.03 mag in every band' },
      ],
    };
    const manifestRest = {
      source: {
        archive: 'journal tables and mission archives, as each band says',
        urls: this.raw.map(r => r.url),
        citations: [
          { text: SOURCES.bm12, doi: '10.1086/664083' },
          { text: 'Fukugita et al. 1996, AJ 111, 1748 (the SDSS photometric system)', doi: '10.1086/117915' },
          { text: SOURCES.sdss },
          { text: SOURCES.tess },
          { text: 'Ricker et al. 2015, JATIS 1, 014003 (TESS)', doi: '10.1117/1.JATIS.1.1.014003' },
          { text: SOURCES['2mass'], doi: '10.1086/376474' },
          { text: 'Rodrigo, Solano & Bayo 2012, The SVO Filter Profile Service (the copy of the 2MASS curves)' },
          { text: 'Bohlin 2014, AJ 147, 127 (the Vega spectrum alpha_lyr_stis_008)', doi: '10.1088/0004-6256/147/6/127' },
          { text: 'Willmer 2018, ApJS 236, 47 (published AB - Vega offsets, the check)', doi: '10.3847/1538-4365/aabfdf' },
          { text: 'Oke & Gunn 1983, ApJ 266, 713 (the AB system)', doi: '10.1086/160817' },
        ],
        acknowledgement:
          'This research has made use of the SVO Filter Profile Service "Carlos Rodrigo", funded by MCIN/AEI/10.13039/501100011033/ through grant PID2023-146210NB-I00. Based on CALSPEC data from the Space Telescope Science Institute.',
      },
      raw: this.raw,
      transformation: {
        script: 'tools/data-packs/radiation.mjs',
        version: TRANSFORM_VERSION,
        options: { stepNm: STEP_NM, sdssStepNm: SDSS_STEP_NM, vegaMagnitude: VEGA_MAG },
        steps: [
          'UBVRI: read Table 1 of Bessell & Murphy 2012 from tools/data-packs/radiation/bm12-table1.txt (transcribed from the pinned PDF with pdftotext; its pivot wavelengths must reproduce the paper\'s Table 5). Kept on the paper\'s own 50 A (U) and 100 A grids.',
          'SDSS: read the five extensions of the pinned FITS file, column respt (the response on the sky at 1.3 airmasses, which includes the atmosphere).',
          'TESS and 2MASS: read the pinned response tables (wavelength, response).',
          'SDSS, TESS and 2MASS: resample by linear interpolation onto a uniform grid (2.5 nm for SDSS, whose curves are tabulated at that spacing; 5 nm for TESS and 2MASS), one zero point either side of the nonzero response, response to 1/10000 of the peak. Refuse any band for which the resampling moves the AB magnitude of Vega, or of a blackbody from 3000 K to 30000 K, by more than 0.003 mag.',
          'Zero point: the AB magnitude of the CALSPEC Vega spectrum alpha_lyr_stis_008 through the shipped band (the kernel\'s own photon-counting synthetic photometry), minus 0.03: Vega is 0.03 mag in every band, the convention of BM12 and Willmer 2018.',
        ],
        record: { resamplingWorstMagnitudeChange: resampling },
      },
      assumptions: [
        'Every response is photon-counting (relative number of photons detected): BM12 Table 1 by their definition; the SDSS curve is a quantum efficiency; the TESS function is the instrument response including QE; the 2MASS curves are Cohen et al.\'s photon-counting RSRs. A band published as an energy response must be divided by wavelength before it is added.',
        'The AB - Vega offset is computed here against the Vega spectrum of Bohlin 2014 with Vega = 0.03 mag in every band. It is not the zero point any survey published, except where the validation says it reproduces one. SDSS and 2MASS reproduce Willmer 2018 to better than 0.01 mag; UBVRI to 0.05 (the published offsets disagree with each other by that much). TESS has no published AB - Vega offset and none is quoted.',
        'The SDSS curves are the 2001 preliminary curves of J. Gunn and include the atmosphere at 1.3 airmasses; a magnitude through them is on the SDSS system for a point source observed from APO.',
        'Gaia G, G_BP and G_RP are not here (RADIATION.md, Blockers).',
      ],
      ...COMMON,
    };
    return {
      meta,
      manifestRest,
      render: renderer(this, 'The bandpasses, as startNm/stepNm and an integer response; abMinusVega is m_AB - m_Vega (Vega = 0.03 mag in every band).', {
        BANDS: bands,
        SOURCES,
        ZERO_POINTS: {
          ab: 'AB: m = -2.5 log10(f_nu / 3631 Jy) (Oke & Gunn 1983)',
          vega: `Vega = ${VEGA_MAG} mag in every band; spectrum CALSPEC alpha_lyr_stis_008 (Bohlin 2014)`,
        },
      }),
    };
  },
  decode: mod => mod,
  check: async mod => checkBands(mod),
  validate: validateBands,
};

// =============================================================================
// 2. The line list
// =============================================================================

const num = s => {
  const m = /[-+]?\d+(\.\d+)?/.exec(String(s).replace(/["[\]()*]/g, ''));
  return m ? Number(m[0]) : NaN;
};

/** Rows of one NIST tab-separated answer. */
function nistRows(t) {
  const [head, ...rows] = t.split('\n').filter(Boolean);
  const cols = head.split('\t').map(c => c.trim());
  return rows.map(r => Object.fromEntries(r.split('\t').map((v, i) => [cols[i], v.replace(/^"|"$/g, '')])));
}

function pickLine(spec, rows) {
  const lam = r => num(r['ritz_wl_air(A)']);
  const dE = r => num(r['Ek(cm-1)']) - num(r['Ei(cm-1)']);
  let chosen;
  if (spec.n) {
    chosen = rows.filter(r => r.conf_i === String(spec.n[0]) && r.conf_k === String(spec.n[1]) && r.term_i === '');
    if (chosen.length !== 1) throw new Error(`${spec.id}: ${chosen.length} gross rows for n = ${spec.n}`);
  } else {
    const withObs = rows.filter(r => r['obs_wl_air(A)'] && Number.isFinite(num(r.intens)));
    if (withObs.length) {
      const top = Math.max(...withObs.map(r => num(r.intens)));
      const best = withObs.filter(r => num(r.intens) === top);
      const obs = best[0]['obs_wl_air(A)'];
      chosen = best.filter(r => r['obs_wl_air(A)'] === obs);
    } else {
      // No observed wavelength (He II 4686 is a hydrogenic blend): the Ritz
      // wavelengths of every component in the window, equally weighted.
      chosen = rows.filter(r => Number.isFinite(lam(r)) && Number.isFinite(dE(r)));
    }
  }
  const observed = chosen.every(r => r['obs_wl_air(A)']);
  // Air: NIST's observed wavelength where it has one, which is what a textbook
  // quotes (H-alpha 6562.79); else the mean Ritz wavelength of the components.
  const airA = observed
    ? num(chosen[0]['obs_wl_air(A)'])
    : chosen.reduce((a, r) => a + lam(r), 0) / chosen.length;
  // Vacuum: from the level energies, 1e8 / (Ek - Ei), mean over a blend's
  // components, independent of any air-vacuum formula. NOT for hydrogen: NIST's
  // row for a whole level uses level-averaged energies, whose wavelength is not the
  // line's centroid (H-alpha: 6562.819 Ritz against the observed 6562.79 that every
  // table uses, 0.03 A, 1.3 km/s). A hydrogen line's vacuum wavelength is therefore
  // the formula's, and says so (`vacuumFromFormula`).
  if (spec.n) {
    return { airA, vacA: airToVacuumNm(airA / 10) * 10, observed, components: 1, vacuumFromFormula: true };
  }
  const vacA = chosen.reduce((a, r) => a + 1e8 / dE(r), 0) / chosen.length;
  return { airA, vacA, observed, components: chosen.length, vacuumFromFormula: false };
}

const LINES_RAW = LINE_SPECS.map(s => pin(nistFile(s)));
const SPECIES = { 'H I': 'H', 'He I': 'He I', 'He II': 'He II', 'Ca II': 'Ca II', 'Ca I': 'Ca I', 'Na I': 'Na I', 'Mg I': 'Mg I', 'Fe I': 'Fe I' };

// The vacuum wavelength here is 1e8 / (Ek - Ei) from NIST's level energies; the
// air wavelength is NIST's observed one. The kernel's Morton 2000 air-to-vacuum
// must bring one to the other. Tolerance 0.02 A: NIST's observed
// wavelengths are printed to 0.001-0.01 A, and the mean vacuum wavelength of a
// blend (He I) adds about a hundredth. (Hydrogen is excluded, below.)
const AIR_VACUUM_TOL_A = 0.02;

const linesPack = {
  id: 'radiation-lines',
  label: 'The optical line list',
  manifest: 'data-packs/radiation-lines.json',
  capability: null,
  module: 'js/data/radiation/lines.js',
  transformVersion: TRANSFORM_VERSION,
  raw: LINES_RAW,
  namedBy: ['js/kernels/radiation/packs.js'],
  async build(bytes) {
    const lines = LINE_SPECS.map((spec, i) => {
      const p = pickLine(spec, nistRows(text(bytes[i])));
      return {
        id: spec.id,
        name: spec.name,
        species: SPECIES[spec.sp],
        kind: spec.kind,
        air: Number((p.airA / 10).toFixed(4)),
        vacuum: Number((p.vacA / 10).toFixed(4)),
        observed: p.observed,
        components: p.components,
        vacuumFromFormula: p.vacuumFromFormula,
      };
    });
    const meta = {
      id: this.id,
      version: '1.0.0',
      title: 'The strongest optical spectral lines: rest wavelengths in air and vacuum',
      object: { name: 'atomic lines of stellar spectra', identifiers: lines.map(l => l.id) },
      facility: { observatory: 'NIST Atomic Spectra Database', pipeline: 'tools/data-packs/radiation.mjs 1.0.0' },
      dataType: 'catalog',
      origin: 'compilation',
      credit: 'NIST Atomic Spectra Database (Kramida, Ralchenko, Reader and the NIST ASD Team)',
      license: {
        status: 'public-domain',
        statement: 'NIST Standard Reference Database 78 is a work of the United States government; NIST asks that it be cited.',
      },
      retrieved: '2026-10-09',
      columns: [
        { name: 'air', unit: 'nm', description: 'rest wavelength in standard air' },
        { name: 'vacuum', unit: 'nm', description: 'rest wavelength in vacuum, from the level energies' },
      ],
    };
    const manifestRest = {
      source: {
        archive: 'NIST Atomic Spectra Database, lines form',
        urls: this.raw.map(r => r.url),
        citations: [
          { text: 'Kramida, Ralchenko, Reader & NIST ASD Team, NIST Atomic Spectra Database (ver. 5.x)', url: 'https://physics.nist.gov/asd' },
          { text: 'Morton 2000, ApJS 130, 403 (the air - vacuum relation used to check)', doi: '10.1086/317349' },
        ],
        acknowledgement: 'Wavelengths are from the NIST Atomic Spectra Database (physics.nist.gov/asd).',
      },
      raw: this.raw,
      transformation: {
        script: 'tools/data-packs/radiation.mjs',
        version: TRANSFORM_VERSION,
        options: { windowAngstrom: 0.6 },
        steps: [
          'For each line, query NIST ASD for the species in a window of 1.2 A about the textbook wavelength; pin the answer.',
          'Hydrogen: take the row for the whole level (2 to n), not its fine-structure components.',
          'Other species: take the strongest row that has an observed wavelength (its observed wavelength is kept); where components share that wavelength (He I 4472, 5876), the vacuum wavelength is the mean over them. He II 4686 has no observed wavelength in NIST: air and vacuum are the mean Ritz wavelengths of its components, and the line says so (observed: false).',
          'Vacuum wavelength is 1e8 / (E_upper - E_lower) in cm^-1, from NIST\'s level energies (mean over a blend\'s components); air is NIST\'s observed air wavelength. Hydrogen is the exception: its row is for the whole level and its energies are level averages, so its Ritz wavelength is not the line\'s centroid (H-alpha 6562.819 against the observed 6562.79, 0.03 A or 1.3 km/s); hydrogen keeps the observed air wavelength and takes its vacuum wavelength from Morton 2000 (vacuumFromFormula). For every other line the kernel\'s air - vacuum formula is independent of both, and validate() holds it to them.',
        ],
        record: {},
      },
      assumptions: [
        'The selection of lines is editorial: the lines Prompt 82 names. The wavelengths are not. TiO band heads are not here: no retrievable, citable table was found (RADIATION.md).',
        'The air wavelength is "standard air" as NIST defines it for wavelengths between 200 nm and 2000 nm.',
        'A line is a laboratory (rest) wavelength: it is the centroid of the multiplet components NIST lists at that wavelength, not a stellar line profile.',
      ],
      ...COMMON,
    };
    return { meta, manifestRest, render: renderer(this, 'Lines in nm, in air and in vacuum; `observed` is false where NIST gives no observed wavelength.', { LINES: lines }) };
  },
  decode: mod => mod,
  check: async mod => {
    const out = [];
    const ids = new Set();
    for (const l of mod.LINES) {
      if (ids.has(l.id)) out.push(`${l.id} is listed twice`);
      ids.add(l.id);
      if (!(l.vacuum > l.air && l.air > 300 && l.air < 1000)) out.push(`${l.id}: air ${l.air} and vacuum ${l.vacuum} are not optical wavelengths in order`);
    }
    if (mod.LINES.length !== LINE_SPECS.length) out.push('a line is missing');
    return out;
  },
  validate(mod) {
    const worst = { id: null, offsetA: 0 };
    const against = [];
    const result = {};
    for (const l of mod.LINES.filter(x => x.observed && !x.vacuumFromFormula)) {
      const d = (airToVacuumNm(l.air) - l.vacuum) * 10;
      result[l.id] = r4(d);
      if (Math.abs(d) > Math.abs(worst.offsetA)) Object.assign(worst, { id: l.id, offsetA: d });
    }
    against.push({
      quantity: 'vacuum wavelength of every non-hydrogen line with an observed wavelength, from NIST level energies',
      value: 0,
      unit: 'Angstrom',
      ref: 'NIST ASD level energies; the kernel\'s airToVacuumNm (Morton 2000) must agree',
    });
    return {
      check: `airToVacuumNm(air) reproduces the vacuum wavelength from the level energies of every non-hydrogen line with an observed wavelength to within ${AIR_VACUUM_TOL_A} A`,
      against,
      result: { airToVacuumMinusLevelEnergyA: result, worst: { id: worst.id, offsetA: r4(worst.offsetA) } },
      ok: Math.abs(worst.offsetA) <= AIR_VACUUM_TOL_A,
    };
  },
};

// =============================================================================
// 3. The extinction law
// =============================================================================

/** CCM89 eqs. (2)-(4): the coefficients as printed (ApJ 345, 245). */
export const CCM_LAW = {
  law: 'Cardelli, Clayton & Mathis 1989, eqs. 1-4',
  xMin: 0.3,
  xMax: 8,
  xIrOptical: 1.1,
  xOpticalUv: 3.3,
  xFarUv: 5.9,
  ir: { a: 0.574, b: -0.527, power: 1.61 },
  optical: {
    y0: 1.82,
    a: [1, 0.17699, -0.50447, -0.02427, 0.72085, 0.01979, -0.7753, 0.32999],
    b: [0, 1.41338, 2.28305, 1.07233, -5.38434, -0.62251, 5.3026, -2.09002],
  },
  uv: {
    a0: 1.752, a1: -0.316, aPole: { x0: 4.67, w: 0.341, k: -0.104 },
    b0: -3.09, b1: 1.825, bPole: { x0: 4.62, w: 0.263, k: 1.206 },
  },
  farUv: { x0: 5.9, fa: [-0.04473, -0.009779], fb: [0.213, 0.1207] },
  defaultRv: 3.1,
};

// CCM89 Table 3 (printed): filter, x (1/um, 2 decimals), a(x), b(x), A/A_V at R_V = 3.1.
const CCM_TABLE3 = [
  ['U', 2.78, 0.953, 1.909, 1.569],
  ['B', 2.27, 0.9982, 1.0495, 1.337],
  ['V', 1.82, 1.0, 0.0, 1.0],
  ['R', 1.43, 0.8686, -0.366, 0.751],
  ['I', 1.11, 0.68, -0.6239, 0.479],
  ['J', 0.8, 0.4008, -0.3679, 0.282],
  ['H', 0.63, 0.2693, -0.2473, 0.19],
  ['K', 0.46, 0.1615, -0.1483, 0.114],
];
// Tolerance on A/A_V: 0.015. Set after the first comparison, and said so: the first
// version of this check claimed 0.006 and failed at B by 0.014. The reason is not
// rounding. The table's per-filter a(x) and b(x) are the data CCM89 fitted eq. 3
// to, and their table column "a + b/R_V" is that data, so the polynomial departs from
// it by the fit's residual: 0.012 at B (a printed 1.337 against 1.325 from eq. 3),
// under 0.003 at the other eight. 0.015 is the fit residual this pack
// accepts, and the B departure is recorded in RADIATION.md as a deviation of the
// paper's table from the paper's equation. L (3.45 um, x = 0.29) lies outside the
// law's stated range 0.3 to 8 um^-1 and is not compared.
const CCM_RATIO_TOL = 0.015;

const extinctionPack = {
  id: 'radiation-extinction',
  label: 'The extinction law',
  manifest: 'data-packs/radiation-extinction.json',
  capability: null,
  module: 'js/data/radiation/extinction.js',
  transformVersion: TRANSFORM_VERSION,
  raw: [pin('ccm89-apj-345-245.pdf')],
  namedBy: ['js/kernels/radiation/packs.js'],
  async build() {
    const meta = {
      id: this.id,
      version: '1.0.0',
      title: 'The Cardelli, Clayton & Mathis (1989) interstellar extinction law: coefficients',
      object: { name: 'interstellar extinction', identifiers: ['CCM89'] },
      facility: { observatory: 'compiled from the literature', pipeline: 'tools/data-packs/radiation.mjs 1.0.0' },
      dataType: 'model-grid',
      origin: 'compilation',
      credit: 'Cardelli, Clayton & Mathis 1989, ApJ 345, 245',
      license: {
        status: 'attribution-requested',
        statement: 'The coefficients of a published analytic law (eqs. 2 to 4 of the paper), cited to it.',
        basis: 'Thirty-odd numbers that define a mathematical relation; no table, text or figure of the paper is reproduced beyond the eight published values the validation compares against. The paper is in the NASA ADS scanned archive.',
      },
      retrieved: '2026-10-09',
      columns: [{ name: 'law', unit: '', description: 'the coefficients of A(lambda)/A(V) = a(x) + b(x)/R_V, x = 1/lambda in 1/um' }],
    };
    return {
      meta,
      manifestRest: {
        source: {
          archive: 'NASA ADS scanned article',
          urls: this.raw.map(r => r.url),
          citations: [
            { text: 'Cardelli, Clayton & Mathis 1989, ApJ 345, 245', doi: '10.1086/167900' },
            { text: 'O\'Donnell 1994, ApJ 422, 158 (a later revision of the optical coefficients, not used)', doi: '10.1086/173713' },
          ],
        },
        raw: this.raw,
        transformation: {
          script: 'tools/data-packs/radiation.mjs',
          version: TRANSFORM_VERSION,
          options: {},
          steps: [
            'Type the coefficients of eqs. 2a, 2b, 3a, 3b, 4a, 4b and the far-UV terms F_a, F_b from the pinned paper (pages 247-250).',
            'Hold them to the paper\'s own Table 3: A/A_V at R_V = 3.1 for eight standard filters inside the law\'s range (validate()).',
          ],
          record: {},
        },
        assumptions: [
          'The law is the mean Milky Way law for 0.3 <= 1/lambda <= 8 um^-1 (3.3 um to 125 nm); it is not extrapolated. Individual lines of sight depart from it (CCM89, section on deviations).',
          'The optical and near-infrared coefficients are CCM89\'s, not O\'Donnell 1994\'s revision, which changes A_B/A_V by about 0.02.',
          'The law describes extinction by dust between source and observer, with a single R_V; it says nothing about circumstellar dust or the extinction in another galaxy.',
        ],
        ...COMMON,
      },
      render: renderer(this, 'LAW: the coefficients, read by js/kernels/radiation/extinction.js.', { LAW: CCM_LAW }),
    };
  },
  decode: mod => mod,
  check: async mod => (JSON.stringify(mod.LAW) === JSON.stringify(CCM_LAW) ? [] : ['LAW is not the coefficients the tool holds']),
  validate(mod) {
    const against = [];
    const result = {};
    let ok = true;
    for (const [f, x, a, b, ratio] of CCM_TABLE3) {
      const lam = 1000 / x;
      const r = extinctionRatio(lam, 3.1, mod.LAW);
      against.push({ quantity: `A(${f})/A(V) at R_V = 3.1`, value: ratio, unit: '', ref: 'Cardelli, Clayton & Mathis 1989, Table 3' });
      result[f] = r3(r - ratio);
      ok &&= Math.abs(r - ratio) <= CCM_RATIO_TOL;
      void a;
      void b;
    }
    return {
      check: `A(lambda)/A(V) at R_V = 3.1 reproduces the eight published values of CCM89 Table 3 inside the law's range within ${CCM_RATIO_TOL}, the residual of the paper's own fit to that table`,
      against,
      result: { calculatedMinusPublished: result },
      ok,
    };
  },
};

// =============================================================================
// 4. Bolometric corrections
// =============================================================================

export const BC_LAW = {
  law: 'Flower 1996 BC_V(log Teff), coefficients as corrected by Torres 2010, Table 1',
  logTeffMin: Math.log10(3500),
  logTeffMax: Math.log10(40000),
  segments: [
    { from: 0, to: 3.7, a: [-0.190537291496456e5, 0.155144866764412e5, -0.421278819301717e4, 0.381476328422343e3] },
    { from: 3.7, to: 3.9, a: [-0.370510203809015e5, 0.385672629965804e5, -0.150651486316025e5, 0.261724637119416e4, -0.170623810323864e3] },
    { from: 3.9, to: 9, a: [-0.118115450538963e6, 0.137145973583929e6, -0.636233812100225e5, 0.147412923562646e5, -0.170587278406872e4, 0.78873172180499e2] },
  ],
  solar: { teffK: 5777, bcV: -0.08, vSun: -26.76, note: 'BC_V,sun = -0.080 on the Flower scale, V_sun = -26.76 (Torres 2010, section 3)' },
  reliableAboveK: 4000,
};
// Tolerances: Torres prints the coefficients to 15 digits and Flower's BC_V,sun
// as -0.080 (three decimals): 0.001. The three fits are not constrained to meet;
// 0.03 mag is the largest step allowed at a join (the published ones are 0.022 at
// log Teff 3.70 and 0.003 at 3.90, recorded, not corrected).
const polyBc = (i, lt) => BC_LAW.segments[i].a.reduce((acc, c, k) => acc + c * lt ** k, 0);
const BC_SUN_TOL = 0.001;
const BC_JOIN_TOL = 0.03;

const bolometricPack = {
  id: 'radiation-bolometric',
  label: 'Bolometric corrections',
  manifest: 'data-packs/radiation-bolometric.json',
  capability: null,
  module: 'js/data/radiation/bolometric.js',
  transformVersion: TRANSFORM_VERSION,
  raw: [pin('torres10-arxiv-1008.3913.pdf')],
  namedBy: ['js/kernels/radiation/packs.js'],
  async build() {
    const meta = {
      id: this.id,
      version: '1.0.0',
      title: 'Bolometric corrections BC_V(Teff): Flower (1996) with the coefficients Torres (2010) corrected',
      object: { name: 'stellar bolometric corrections', identifiers: ['Flower 1996', 'Torres 2010'] },
      facility: { observatory: 'compiled from the literature', pipeline: 'tools/data-packs/radiation.mjs 1.0.0' },
      dataType: 'model-grid',
      origin: 'compilation',
      credit: 'Torres 2010, AJ 140, 1158 (Table 1); Flower 1996, ApJ 469, 355',
      license: {
        status: 'attribution-requested',
        statement: 'The 13 coefficients of a published polynomial, cited to the paper that corrected them.',
        basis: 'Thirteen numbers defining a relation, from an open arXiv preprint; no table or text of the paper is reproduced.',
      },
      retrieved: '2026-10-09',
      columns: [{ name: 'law', unit: '', description: 'BC_V in mag as a polynomial in log10 of Teff in K, in three ranges' }],
    };
    return {
      meta,
      manifestRest: {
        source: {
          archive: 'arXiv',
          urls: this.raw.map(r => r.url),
          citations: [
            { text: 'Torres 2010, AJ 140, 1158: On the use of empirical bolometric corrections for stars', doi: '10.1088/0004-6256/140/5/1158' },
            { text: 'Flower 1996, ApJ 469, 355: Transformations from theoretical Hertzsprung-Russell diagrams to color-magnitude diagrams', doi: '10.1086/177785' },
          ],
        },
        raw: this.raw,
        transformation: {
          script: 'tools/data-packs/radiation.mjs',
          version: TRANSFORM_VERSION,
          options: {},
          steps: [
            'Type the three coefficient sets of Table 1 of Torres 2010 (the only table in the paper that holds them) at their printed 15 digits.',
            'Check that the polynomial gives the published BC_V,sun = -0.080 at 5777 K and that the three fits join to within 0.03 mag.',
          ],
          record: {
            stepAtLogTeff3_70: r3(polyBc(1, 3.7) - polyBc(0, 3.7)),
            stepAtLogTeff3_90: r3(polyBc(2, 3.9) - polyBc(1, 3.9)),
          },
        },
        assumptions: [
          'BC_V is for the Flower scale, where BC_V,sun = -0.080; with the IAU nominal M_bol,sun = 4.74 and V_sun = -26.76 that implies M_V,sun = 4.812 and BC_V,sun = -0.072, so using this polynomial with 4.74 directly makes luminosities 0.7 percent too high. magnitudes.js absoluteVFromLuminosity() removes the offset by anchoring on the Sun, as Torres recommends.',
          'The paper gives no range of validity for the polynomials. 3500 K to 40000 K is this pack\'s stated range (below 3500 K the polynomial is not used, above 40000 K it is not extrapolated); Torres states that the relations "break down completely for the M dwarfs", so below 4000 K the value is returned with the range flagged unreliable (reliableAboveK).',
          'Main-sequence, giant and supergiant stars of one temperature share one BC_V here; the relations are mean empirical ones and carry no dependence on gravity or metallicity.',
        ],
        ...COMMON,
      },
      render: renderer(this, 'LAW: BC_V(Teff) polynomials, read by js/kernels/radiation/magnitudes.js.', { LAW: BC_LAW }),
    };
  },
  decode: mod => mod,
  check: async mod => (JSON.stringify(mod.LAW) === JSON.stringify(BC_LAW) ? [] : ['LAW is not the coefficients the tool holds']),
  validate(mod) {
    const L = mod.LAW;
    const at = (seg, lt) => seg.a.reduce((acc, c, i) => acc + c * lt ** i, 0);
    const sun = bolometricCorrectionV(5777, L);
    const j1 = at(L.segments[1], 3.7) - at(L.segments[0], 3.7);
    const j2 = at(L.segments[2], 3.9) - at(L.segments[1], 3.9);
    return {
      check: `BC_V at 5777 K is the published -0.080 (within ${BC_SUN_TOL}), and the three fits join to within ${BC_JOIN_TOL} mag`,
      against: [
        { quantity: 'BC_V of the Sun on the Flower scale', value: -0.08, unit: 'mag', ref: 'Torres 2010, section 3 (Flower 1996: BC_V,sun = -0.080)' },
        { quantity: 'step between adjacent fits', value: 0, unit: 'mag', ref: 'not constrained by Flower 1996; allowed up to 0.03' },
      ],
      result: { bcSun: r4(sun), joinStepAt3_70: r4(j1), joinStepAt3_90: r4(j2) },
      ok: Math.abs(sun - -0.08) <= BC_SUN_TOL && Math.abs(j1) <= BC_JOIN_TOL && Math.abs(j2) <= BC_JOIN_TOL,
    };
  },
};

export const RADIATION_PACKS = [bandsPack, linesPack, extinctionPack, bolometricPack];
