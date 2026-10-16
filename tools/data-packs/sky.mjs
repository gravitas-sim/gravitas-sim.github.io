// =============================================================================
// The Sky Lab's data pack (Roadmap II Prompt 88)
// -----------------------------------------------------------------------------
//   sky-bright-stars   the stars to V 4.5 from the Yale Bright Star Catalogue
//
// Raw product: CDS V/50, Hoffleit and Warren, The Bright Star Catalogue, 5th
// revised ed. (preliminary version, 1991): the fixed-width `catalog` and
// `notes` files, pinned gzipped as CDS serves them (tools/data-packs/sky/). The
// ReadMe, the Harvard page and HEASARC's page state no licence, so the pack
// ships on the data-pack "no licence stated, credited" basis, with citation
// (D-SKY-02, Carl's instruction of 2026-10-09; SKY_LAB_GATE.md, "Rights").
//
// The numbers of the pack are the catalogue's own: position (J2000, FK5),
// visual magnitude, B-V, proper motion, spectral type, designation and, for the
// 65 stars whose remark gives a name in capitals, that name. The one derived
// column is the colour temperature: the blackbody temperature whose B-V, taken
// through the radiation kernel's Bessell-Murphy B and V bands on the Vega
// scale, equals the star's. It is a colour temperature, not an effective
// temperature, and the pack says so.
//
// The rows are a sidecar, a JSON file the page fetches, because a route budget
// counts JavaScript and a star table is data (as library/library.json is).
// =============================================================================

import { Buffer } from 'node:buffer';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { sha256 } from './pinned.mjs';
import { runtimeMeta } from './schema.mjs';
import { BANDS } from '../../js/data/radiation/bandpasses.js';
import {
  blackbodyColor,
  decodeBand,
} from '../../js/kernels/radiation/photometry.js';
import { CATALOG_SHA256, NOTES_SHA256 } from './sky/specs.mjs';

const REPO = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..'
);
export const TRANSFORM_VERSION = '1.0.0';
const PINS = JSON.parse(
  readFileSync(path.join(REPO, 'tools/data-packs/sky/pins.json'), 'utf8')
);
const pin = f => {
  if (!PINS[f])
    throw new Error(`no pin for ${f}; run node tools/data-packs/sky/pin.mjs`);
  return PINS[f];
};
const text = b => Buffer.from(b).toString('latin1');

/** The faintest star kept, visual magnitude. */
export const V_MAX = 4.5;
/** The blackbody range the colour temperature is searched in, kelvin. */
export const T_RANGE = [2500, 60000];
/** The colour temperature is kept to this many kelvin. */
const T_STEP = 10;

/** Columns of a row, in order, as the sidecar states them. */
export const COLUMNS = [
  { name: 'hr', unit: '', description: 'Harvard Revised (Bright Star) number' },
  {
    name: 'ra',
    unit: '1e-4 deg',
    description: 'right ascension, J2000.0 (FK5), epoch 2000.0',
  },
  {
    name: 'dec',
    unit: '1e-4 deg',
    description: 'declination, J2000.0 (FK5), epoch 2000.0',
  },
  { name: 'v', unit: '1e-2 mag', description: 'visual magnitude (Johnson V)' },
  {
    name: 'bv',
    unit: '1e-2 mag',
    description: 'B-V colour (Johnson UBV), null where the catalogue has none',
  },
  {
    name: 'pmra',
    unit: 'mas/yr',
    description: 'proper motion in right ascension, times cos(dec)',
  },
  { name: 'pmde', unit: 'mas/yr', description: 'proper motion in declination' },
  {
    name: 'desig',
    unit: '',
    description:
      'Flamsteed number, Bayer letter (three-letter code, with its component digit) and constellation abbreviation, as the catalogue gives them, joined by spaces; empty where it gives none',
  },
  {
    name: 'name',
    unit: '',
    description:
      'the traditional name, where the catalogue remarks give one in capitals (as the remark spells it), else 0',
  },
  {
    name: 'sp',
    unit: '',
    description: 'MK spectral type as the catalogue gives it',
  },
  {
    name: 'tcol',
    unit: 'K',
    description:
      'blackbody colour temperature whose B-V (radiation kernel, Bessell-Murphy B and V, Vega scale) equals the star’s; 0 where there is no B-V; a colour temperature, not an effective temperature',
  },
];

const num = (s, f = 1) => {
  const t = s.trim();
  return t === '' ? null : Number(t) * f;
};

/** Title-case a name the notes print in capitals ("MIRPHAK" -> "Mirphak"). */
const titleCase = s =>
  s.toLowerCase().replace(/(^|[ -])([a-z])/g, (_, a, b) => a + b.toUpperCase());

/** hr -> the capitalised first name of the star's "N:" remark. */
export function parseNames(notes) {
  const names = new Map();
  for (const l of notes.split('\n').filter(Boolean)) {
    const hr = Number(l.slice(0, 6));
    const m = /^\s*\d+N:\s+(.*)$/.exec(l.slice(6));
    if (!m) continue;
    const first = m[1].split(';')[0].trim();
    if (/^[A-Z][A-Z' -]{2,}$/.test(first) && !names.has(hr))
      names.set(hr, titleCase(first));
  }
  return names;
}

/** The catalogue's 10-byte name field as "9 Alp CMa", "Alp Car", "80 UMa". */
export function designation(field) {
  const flam = field.slice(0, 3).trim();
  const bayer = `${field.slice(3, 6).trim()}${field.slice(6, 7).trim()}`;
  const con = field.slice(7, 10).trim();
  return [flam, bayer, con].filter(Boolean).join(' ');
}

/** Rows of the catalogue file at or brighter than V_MAX, brightest first. */
export function parseCatalog(catalog, names, vmax = V_MAX) {
  const rows = [];
  for (const l of catalog.split('\n').filter(Boolean)) {
    const v = num(l.slice(102, 107));
    if (v === null || v > vmax) continue;
    const rah = num(l.slice(75, 77));
    const ram = num(l.slice(77, 79));
    const ras = num(l.slice(79, 83));
    const ded = num(l.slice(84, 86));
    const dem = num(l.slice(86, 88));
    const des = num(l.slice(88, 90));
    if (rah === null || ded === null) continue;
    const sign = l[83] === '-' ? -1 : 1;
    const hr = Number(l.slice(0, 4));
    rows.push({
      hr,
      raDeg: (rah + ram / 60 + ras / 3600) * 15,
      decDeg: sign * (ded + dem / 60 + des / 3600),
      v,
      bv: num(l.slice(109, 114)),
      pmra: num(l.slice(148, 154), 1000),
      pmde: num(l.slice(154, 160), 1000),
      desig: designation(l.slice(4, 14)),
      name: names.get(hr) ?? 0,
      sp: l.slice(127, 147).trim(),
    });
  }
  // Brightest first; the Harvard number breaks a tie, so the order is fixed.
  rows.sort((a, b) => a.v - b.v || a.hr - b.hr);
  return rows;
}

// --- The colour temperature, through the radiation kernel ---------------------

const bandB = decodeBand(BANDS.find(b => b.id === 'B'));
const bandV = decodeBand(BANDS.find(b => b.id === 'V'));
/** B-V of a blackbody, mag, Vega scale, from the kernel. */
export const blackbodyBV = T => blackbodyColor(T, bandB, bandV, 'vega');

/**
 * The temperature whose blackbody B-V is `bv`, to T_STEP kelvin, by bisection
 * (B-V falls monotonically as T rises). A colour outside what a blackbody in
 * T_RANGE reaches returns the nearer end of the range and says it clamped.
 * @returns {{tK: number, clamped: boolean}}
 */
export function colourTemperature(bv) {
  const [lo0, hi0] = T_RANGE;
  if (bv >= blackbodyBV(lo0)) return { tK: lo0, clamped: true };
  if (bv <= blackbodyBV(hi0)) return { tK: hi0, clamped: true };
  let lo = lo0;
  let hi = hi0;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (blackbodyBV(mid) > bv) lo = mid;
    else hi = mid;
  }
  return { tK: Math.round((lo + hi) / 2 / T_STEP) * T_STEP, clamped: false };
}

const R4 = x => Math.round(x * 1e4);

/** The rows as the sidecar writes them, and how many colours were clamped. */
export function encode(rows) {
  let clamped = 0;
  const stars = rows.map(r => {
    let tcol = 0;
    if (r.bv !== null) {
      const c = colourTemperature(r.bv);
      tcol = c.tK;
      if (c.clamped) clamped++;
    }
    return [
      r.hr,
      R4(r.raDeg),
      R4(r.decDeg),
      Math.round(r.v * 100),
      r.bv === null ? null : Math.round(r.bv * 100),
      r.pmra === null ? 0 : Math.round(r.pmra),
      r.pmde === null ? 0 : Math.round(r.pmde),
      r.desig,
      r.name,
      r.sp,
      tcol,
    ];
  });
  return { stars, clamped };
}

// --- The pack -----------------------------------------------------------------

/** Published J2000 positions to hold five stars to (Hipparcos via SIMBAD). */
export const SIMBAD_CHECK = [
  { hr: 2491, name: 'Sirius', ra: [6, 45, 8.9173], dec: [-1, 16, 42, 58.017] },
  { hr: 7001, name: 'Vega', ra: [18, 36, 56.3364], dec: [1, 38, 47, 1.291] },
  {
    hr: 5340,
    name: 'Arcturus',
    ra: [14, 15, 39.6723],
    dec: [1, 19, 10, 56.673],
  },
  {
    hr: 2061,
    name: 'Betelgeuse',
    ra: [5, 55, 10.3053],
    dec: [1, 7, 24, 25.426],
  },
  { hr: 424, name: 'Polaris', ra: [2, 31, 49.09], dec: [1, 89, 15, 50.8] },
];
/** Arcseconds: the catalogue is FK5 at epoch 2000, the reference ICRS. */
export const SIMBAD_TOL_ARCSEC = 1;

const hmsDeg = ([h, m, s]) => (h + m / 60 + s / 3600) * 15;
const dmsDeg = ([sg, d, m, s]) => sg * (d + m / 60 + s / 3600);

/** The star rows of the sidecar text. */
export function starsOf(sidecarText) {
  return JSON.parse(sidecarText).stars;
}

const R = 'sky-bright-stars';

const starsPack = {
  id: R,
  label: 'The Sky Lab bright stars',
  manifest: 'data-packs/sky-bright-stars.json',
  capability: null,
  module: 'js/data/sky/brightStars.js',
  sidecar: 'sky/bright-stars.json',
  transformVersion: TRANSFORM_VERSION,
  raw: [
    pin('cds-v50-bsc5-readme.txt'),
    pin('cds-v50-bsc5-catalog.gz'),
    pin('cds-v50-bsc5-notes.gz'),
  ],
  namedBy: ['js/kernels/sky/packs.js'],
  async build(bytes) {
    const catalogBytes = gunzipSync(Buffer.from(bytes[1]));
    const notesBytes = gunzipSync(Buffer.from(bytes[2]));
    if (sha256(catalogBytes) !== CATALOG_SHA256)
      throw new Error('the unzipped catalog is not the pinned file');
    if (sha256(notesBytes) !== NOTES_SHA256)
      throw new Error('the unzipped notes are not the pinned file');
    const names = parseNames(text(notesBytes));
    const rows = parseCatalog(text(catalogBytes), names);
    const { stars, clamped } = encode(rows);
    const named = rows.filter(r => r.name).length;
    const meta = {
      id: R,
      version: '1.0.0',
      title:
        'Bright stars to V 4.5 for the Sky Lab: the Yale Bright Star Catalogue (5th revised edition)',
      object: {
        name: 'the brightest stars of the whole sky',
        identifiers: ['Harvard Revised (Bright Star) numbers'],
      },
      facility: {
        observatory:
          'Yale University Observatory; NASA/NSSDC Astronomical Data Center; CDS (VizieR V/50)',
        pipeline: 'tools/data-packs/sky.mjs 1.0.0',
      },
      dataType: 'catalog',
      origin: 'compilation',
      credit:
        'Hoffleit, D. and Warren, W. H. Jr., The Bright Star Catalogue, 5th Revised Ed. (preliminary version), NASA/NSSDC Astronomical Data Center (1991); CDS V/50 (1991bsc..book.....H)',
      license: {
        status: 'no-license-stated',
        statement:
          "The ReadMe of CDS catalogue V/50 (pinned here), the Yale/Harvard catalogue pages and HEASARC's page state no licence and no permission to redistribute. CDS's terms (cds.unistra.fr/vizier-org/licences_vizier.html, read 2026-10-09) say VizieR data are free for scientific use with the original authors cited and that commercial use depends on the origin, so use with citation is confirmed and redistribution of a derived subset is not.",
        basis:
          'A reduced derivative for teaching (904 of 9,110 entries, the facts of position, brightness, colour and name, no remarks text), credited in full, with the checksum of every raw file recorded so the original can be fetched again and compared; shipped on the data-pack "no licence stated, credited" basis with citation, by Carl\'s instruction of 2026-10-09 (DECISION_REGISTER.md D-SKY-02). Hipparcos and Tycho are CC BY-NC 3.0 IGO and are not used.',
      },
      retrieved: '2026-10-09',
      columns: [
        {
          name: 'ra',
          unit: 'deg',
          description: 'right ascension J2000.0, stored in 1e-4 degree',
        },
        {
          name: 'dec',
          unit: 'deg',
          description: 'declination J2000.0, stored in 1e-4 degree',
        },
        {
          name: 'v',
          unit: 'mag',
          description: 'visual magnitude, stored in 1e-2 mag',
        },
        {
          name: 'tcol',
          unit: 'K',
          description:
            'blackbody colour temperature from B-V through the radiation kernel; not an effective temperature',
        },
      ],
    };
    const doc = {
      format: 'gravitas.sky-stars/1',
      epoch: 'J2000.0 (FK5), epoch 2000.0',
      vmax: V_MAX,
      count: stars.length,
      columns: COLUMNS,
      stars,
    };
    const manifestRest = {
      source: {
        archive:
          'CDS VizieR catalogue V/50 (Bright Star Catalogue, 5th rev. ed.)',
        urls: this.raw.map(r => r.url),
        citations: [
          {
            text: 'Hoffleit & Warren 1991, The Bright Star Catalogue, 5th Revised Ed. (preliminary version), NASA/ADC; CDS V/50',
            url: 'https://cdsarc.cds.unistra.fr/viz-bin/cat/V/50',
          },
          {
            text: 'Hoffleit & Jaschek 1982, The Bright Star Catalogue, 4th Revised Ed., Yale University Observatory',
          },
          {
            text: 'Bessell & Murphy 2012, PASP 124, 140 (the B and V bands the colour temperature uses)',
            doi: '10.1086/664083',
          },
        ],
        acknowledgement:
          'Stars are from the Yale Bright Star Catalogue (Hoffleit and Warren), as served by CDS.',
      },
      raw: this.raw,
      transformation: {
        script: 'tools/data-packs/sky.mjs',
        version: TRANSFORM_VERSION,
        options: {
          vmax: V_MAX,
          colourTemperatureRangeK: T_RANGE,
          colourTemperatureStepK: T_STEP,
          unzippedSha256: { catalog: CATALOG_SHA256, notes: NOTES_SHA256 },
        },
        steps: [
          'Gunzip the pinned catalog and notes files and check the unzipped files against their recorded SHA-256.',
          'Keep every entry with a visual magnitude of 4.5 or brighter and a J2000 position: 904 stars, brightest first (the Harvard number breaks a tie).',
          "Position: the catalogue's J2000 hours, minutes and seconds of right ascension and degrees, arcminutes and arcseconds of declination, as degrees, rounded to 1e-4 degree (0.36 arcsecond). Proper motion in mas/yr from the catalogue's arcsec/yr (pmRA is the projected motion, cos(dec) d(RA)/dt). Magnitude and B-V to 0.01 mag.",
          "Designation: the catalogue's Name field (Flamsteed number, Bayer letter, constellation) split into its three parts and rejoined with spaces.",
          "Name: the first name of the star's \"N:\" remark where the remark prints it in capitals, as the remark spells it and title-cased; 65 stars. The spellings are the catalogue's and are not the IAU's (Mirphak for Mirfak, Etamin for Eltanin, Kocab for Kochab).",
          'Colour temperature: for each star with a B-V, the temperature of the blackbody whose B-V through the radiation kernel (Bessell and Murphy B and V, Vega scale, 5772 K gives 0.64) equals it, by bisection, to 10 K; a B-V beyond what 2,500-60,000 K reaches is clamped to the nearer end.',
          "Write the rows as a sidecar (sky/bright-stars.json), which the page fetches; the module in js/data/sky/ carries the pack record and the sidecar's checksum.",
        ],
        record: {
          stars: stars.length,
          withName: named,
          withBV: stars.filter(s => s[4] !== null).length,
          colourClamped: clamped,
        },
      },
      assumptions: [
        "Positions are the catalogue's FK5 J2000.0 values at epoch 2000.0; a position at another date applies the proper motion linearly, and neglects radial velocity and parallax (0.016 arcminute over 1900-2100, SKY_LAB.md).",
        "The traditional names are those of the catalogue's own remarks, 65 of 904; they are not confirmed against the IAU Working Group on Star Names.",
        'B-V of a blackbody is not the B-V of a star (line blanketing, the Balmer jump): the colour temperature is the temperature of the blackbody that would look that colour in these bands, nothing more.',
        'The catalogue is a preliminary version of the fifth edition: its V magnitudes are 0.01 mag, and variable stars carry the value the catalogue lists.',
      ],
      masks: [],
      reductions: [],
      compatible: { widgets: [], investigations: [] },
      offline: 'optional',
    };
    const pack = runtimeMeta({
      format: 'gravitas.observation-data-pack',
      formatVersion: 1,
      ...meta,
      ...manifestRest,
    });
    const sidecar = `${JSON.stringify({ ...doc, pack })}\n`;
    return {
      meta,
      manifestRest,
      sidecar,
      render: async PACK => {
        const body = `// =============================================================================
// ${meta.title}
// -----------------------------------------------------------------------------
// GENERATED FILE. Do not edit. Written by tools/build-data-packs.mjs
// (tools/data-packs/sky.mjs) from ${starsPack.raw.map(r => r.file).join(', ')};
// \`npm run packs:check\` verifies it offline and \`npm run packs:provenance\`
// rebuilds it from the pinned raw products and compares byte for byte. The full
// record - sources, pins, every step, the checks it passed - is
// ${starsPack.manifest}.
//
// The rows are not here. They are the sidecar ${starsPack.sidecar}, which the
// Sky Lab fetches, so that a page budget that counts JavaScript does not count
// a star table; SIDECAR records its size and checksum, and the file carries
// this PACK again so a reader of the file alone can credit it.
// =============================================================================

/** What the data is and who to credit, as an interface shows it. */
export const PACK = ${JSON.stringify(PACK, null, 2)};

/** The sidecar: where the rows are, and what they must be. */
export const SIDECAR = ${JSON.stringify({
          file: starsPack.sidecar,
          bytes: Buffer.byteLength(sidecar),
          sha256: sha256(sidecar),
          count: stars.length,
        })};
`;
        const prettier = await import('prettier');
        const options =
          (await prettier.resolveConfig(path.join(REPO, starsPack.module))) ||
          {};
        return prettier.format(body, {
          ...options,
          filepath: path.join(REPO, starsPack.module),
        });
      },
    };
  },
  decode: mod => mod,
  check: async mod => {
    const out = [];
    const doc = JSON.parse(mod.SIDECAR_TEXT);
    if (doc.format !== 'gravitas.sky-stars/1')
      out.push('the sidecar is not sky-stars/1');
    if (JSON.stringify(doc.pack) !== JSON.stringify(mod.PACK))
      out.push("the sidecar's pack is not the module's");
    if (
      doc.stars.length !== mod.SIDECAR.count ||
      doc.count !== doc.stars.length
    )
      out.push('the star count is not the one the module records');
    if (sha256(mod.SIDECAR_TEXT) !== mod.SIDECAR.sha256)
      out.push('the sidecar is not the file the module records');
    const seen = new Set();
    let last = -Infinity;
    for (const s of doc.stars) {
      if (s.length !== COLUMNS.length)
        out.push(`HR ${s[0]}: a row has ${s.length} columns`);
      if (seen.has(s[0])) out.push(`HR ${s[0]} is listed twice`);
      seen.add(s[0]);
      if (!(s[1] >= 0 && s[1] < 3600000))
        out.push(`HR ${s[0]}: right ascension ${s[1]}`);
      if (!(s[2] >= -900000 && s[2] <= 900000))
        out.push(`HR ${s[0]}: declination ${s[2]}`);
      if (s[3] > V_MAX * 100)
        out.push(`HR ${s[0]}: V ${s[3] / 100} is fainter than ${V_MAX}`);
      if (s[3] < last) out.push(`HR ${s[0]}: out of magnitude order`);
      last = s[3];
      if (s[4] === null && s[10] !== 0)
        out.push(`HR ${s[0]}: a colour temperature without a B-V`);
    }
    return out;
  },
  validate(mod) {
    const doc = JSON.parse(mod.SIDECAR_TEXT);
    const byHr = new Map(doc.stars.map(s => [s[0], s]));
    const sep = (ra1, de1, ra2, de2) => {
      const d = Math.PI / 180;
      const x = (ra1 - ra2) * d * Math.cos(((de1 + de2) / 2) * d);
      const y = (de1 - de2) * d;
      return Math.hypot(x, y) * (180 / Math.PI) * 3600;
    };
    const result = {};
    let worst = { name: null, arcsec: 0 };
    for (const c of SIMBAD_CHECK) {
      const s = byHr.get(c.hr);
      const arcsec = sep(s[1] / 1e4, s[2] / 1e4, hmsDeg(c.ra), dmsDeg(c.dec));
      result[c.name] = Number(arcsec.toFixed(2));
      if (arcsec > worst.arcsec) worst = { name: c.name, arcsec };
    }
    return {
      check: `five stars with published Hipparcos positions (Sirius, Vega, Arcturus, Betelgeuse, Polaris) lie within ${SIMBAD_TOL_ARCSEC} arcsecond of them`,
      against: SIMBAD_CHECK.map(c => ({
        quantity: `J2000 position of ${c.name} (HR ${c.hr})`,
        value: 0,
        unit: 'arcsec',
        ref: "Hipparcos (ESA 1997) positions, ICRS J2000 at epoch 2000, via SIMBAD (CDS): the catalogue is FK5, so the offset is the two systems and the catalogue's 0.1-arcsecond precision",
      })),
      result: {
        offsetArcsec: result,
        worst: { name: worst.name, arcsec: Number(worst.arcsec.toFixed(2)) },
      },
      ok: worst.arcsec <= SIMBAD_TOL_ARCSEC,
    };
  },
};

export const SKY_PACKS = [starsPack];
