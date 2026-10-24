// =============================================================================
// Image packs for the first slice (Roadmap III Prompt 189)
// -----------------------------------------------------------------------------
//   sdo-hmi-continuum-20240510   the Sun, HMI continuum browse image   display-only
//   galileo-moon-19921207        the Moon, Galileo, three filters       display-only
//   hirise-cerberus-fossae       Mars, HiRISE, Cerberus Fossae          display-only
//   tess-hd209458-s56-frame      one 2-minute cadence of HD 209458's    quantitative
//                                target pixel file: flux, its error
//
// Each pack is the record in data-packs/, a runtime module in js/data/
// observations/ with PACK and a SIDECAR record, and a sidecar file in frames/
// that holds the pixels (base64 planes in a JSON text, fetched by the
// Observatory when the frame is opened, as the Gaia tables' rows are: a budget
// that counts JavaScript does not count a picture). PACK carries the image
// sidecar document (gravitas.image, js/dataKinds/contract.js) that says what a
// pixel is and what may be done with it; the rights decision is the manifest's
// `license`, per source, and IMAGE_PACKS.md lists them.
//
// A picture from a public archive that is a browse product, a colour
// composite or a crop for display is DISPLAY-ONLY: it can be marked, and the
// contract refuses photometry and astrometry in words. The TESS frame is
// QUANTITATIVE because the archive's documentation gives every fact the
// contract needs (IMAGE_PACKS.md cites each); the frame's pixels are the
// archive's, nothing resampled, and its noise is the archive's own FLUX_ERR.
// Nothing is fabricated, simulated or re-rendered as authentic.
//
// Decoding a JPEG is the one step Node cannot do: tools/data-packs/image-
// decode.py (Pillow) does that and nothing else, and the pack records the
// decoder's version. Every other step is integer arithmetic here.
// =============================================================================

import { Buffer } from 'node:buffer';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { sha256 } from './pinned.mjs';
import { validateImage } from '../../js/dataKinds/contract.js';

const REPO = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..'
);
const DECODER = path.join(REPO, 'tools/data-packs/image-decode.py');

/** Bumped with any change to what this writes; the manifests record it. */
export const IMAGE_PACKS_VERSION = '1.0.0';
export const PLANES_FORMAT = 'gravitas.image-pack-planes';

const NASA_POLICY =
  'NASA Images and Media Usage Guidelines (https://www.nasa.gov/nasa-brand-center/images-and-media/, read 2026-10-24): NASA content "generally are not subject to copyright in the United States"; acknowledge NASA.';

// --- Decoding and the integer steps ------------------------------------------------

/** A JPEG as RGB, and which decoder said so. */
export function decodeJpeg(bytes) {
  const out = execFileSync('python3', ['-I', DECODER], {
    input: Buffer.from(bytes),
    maxBuffer: 256 * 1024 * 1024,
  });
  const nl = out.indexOf(10);
  const head = JSON.parse(out.subarray(0, nl).toString('ascii'));
  const rgb = out.subarray(nl + 1);
  if (rgb.length !== head.width * head.height * 3)
    throw new Error('the decoder returned the wrong number of bytes');
  return { ...head, rgb };
}

/**
 * The display plane of a decoded picture: the gray of its red, green and blue
 * (weights 0.299, 0.587, 0.114, rounded, as the Observatory's own picture
 * import does), a crop, a block mean of `block` by `block` pixels (rounded),
 * and the rows turned over so that row 1 is the bottom, as in FITS.
 * @returns {{width: number, height: number, bytes: Uint8Array}}
 */
export function displayPlane({ width, height, rgb }, { crop, block }) {
  const [x0, y0, x1, y1] = crop ?? [0, 0, width, height];
  const w = (x1 - x0) / block;
  const h = (y1 - y0) / block;
  if (!Number.isInteger(w) || !Number.isInteger(h))
    throw new Error('the crop is not a whole number of blocks');
  const gray = (x, y) => {
    const i = 3 * (y * width + x);
    return 0.299 * rgb[i] + 0.587 * rgb[i + 1] + 0.114 * rgb[i + 2];
  };
  const out = new Uint8Array(w * h);
  for (let j = 0; j < h; j++)
    for (let i = 0; i < w; i++) {
      let s = 0;
      for (let v = 0; v < block; v++)
        for (let u = 0; u < block; u++)
          s += Math.round(gray(x0 + i * block + u, y0 + j * block + v));
      // Row 0 of the output is the bottom row of the picture.
      out[(h - 1 - j) * w + i] = Math.round(s / (block * block));
    }
  return { width: w, height: h, bytes: out };
}

const b64 = bytes => Buffer.from(bytes).toString('base64');

/** The sidecar text: planes as base64, with their encodings. */
function planesText(id, width, height, planes) {
  return `${JSON.stringify({
    format: PLANES_FORMAT,
    formatVersion: 1,
    id,
    width,
    height,
    planes: Object.fromEntries(
      Object.entries(planes).map(([k, p]) => [
        k,
        { encoding: p.encoding, base64: b64(p.bytes) },
      ])
    ),
  })}\n`;
}

/** The planes of a sidecar text, as typed arrays (little-endian encodings). */
export function readPlanes(text) {
  const doc = JSON.parse(text);
  if (doc.format !== PLANES_FORMAT || doc.formatVersion !== 1)
    throw new Error('not a gravitas.image-pack-planes/1 document');
  const out = { width: doc.width, height: doc.height, id: doc.id, planes: {} };
  const n = doc.width * doc.height;
  for (const [k, p] of Object.entries(doc.planes)) {
    const bytes = Buffer.from(p.base64, 'base64');
    if (p.encoding === 'uint8') out.planes[k] = new Uint8Array(bytes);
    else if (p.encoding === 'float32-le') {
      if (bytes.length !== 4 * n) throw new Error(`${k} is the wrong size`);
      const a = new Float32Array(n);
      for (let i = 0; i < n; i++) a[i] = bytes.readFloatLE(4 * i);
      out.planes[k] = a;
    } else throw new Error(`${k}: no reader for ${p.encoding}`);
    if (out.planes[k].length !== n) throw new Error(`${k} is the wrong size`);
  }
  return out;
}

/** The cards of a FITS header held in whole 2880-byte blocks. */
export function cardsOf(bytes) {
  const out = {};
  for (let at = 0; at + 80 <= bytes.length; at += 80) {
    const card = Buffer.from(bytes.subarray(at, at + 80)).toString('ascii');
    if (card.startsWith('END     ')) break;
    if (card[8] !== '=') continue;
    const key = card.slice(0, 8).trim();
    const q = card.slice(10).trimStart();
    if (q.startsWith("'")) {
      out[key] = q.slice(1, q.indexOf("'", 1)).trimEnd();
      continue;
    }
    const v = q.split('/')[0].trim();
    out[key] = v === 'T' ? true : v === 'F' ? false : Number(v);
  }
  return out;
}

// --- The record every pack shares -------------------------------------------------

const pin = (file, url, bytes, sha, range) => ({
  file,
  url,
  bytes,
  sha256: sha,
  ...(range ? { range } : {}),
});

/**
 * What a build() of these packs returns, for build-data-packs.mjs: the
 * metadata, the rest of the manifest, the sidecar text, and the module's
 * render. The pixels live in the sidecar; the module has PACK and SIDECAR.
 */
function asSidecar(pack, { meta, manifestRest, sidecar }) {
  return {
    meta,
    manifestRest,
    sidecar,
    render: async PACK => {
      const body = `// =============================================================================
// ${meta.title}
// -----------------------------------------------------------------------------
// GENERATED FILE. Do not edit. Written by tools/build-data-packs.mjs
// (tools/data-packs/image-packs.mjs) from ${pack.raw.map(r => r.file).join(', ')};
// \`npm run packs:check\` verifies it offline and \`npm run packs:provenance\`
// rebuilds it from the pinned raw product and compares byte for byte. The full
// record, with the rights decision, is ${pack.manifest}.
//
// The pixels are not here. They are the sidecar ${pack.sidecar}, base64 planes
// that the Observatory fetches when the frame is opened, so that a budget that
// counts JavaScript does not count a picture; SIDECAR records its size and
// checksum, and the Observatory refuses a file that is not that one.
// =============================================================================

/** What the data is and who to credit, as an interface shows it. */
export const PACK = ${JSON.stringify(PACK, null, 2)};

/** The sidecar: where the pixels are, and what they must be. */
export const SIDECAR = ${JSON.stringify({
        file: pack.sidecar,
        bytes: Buffer.byteLength(sidecar),
        sha256: sha256(sidecar),
      })};
`;
      const prettier = await import('prettier');
      const options =
        (await prettier.resolveConfig(path.join(REPO, pack.module))) || {};
      return prettier.format(body, {
        ...options,
        filepath: path.join(REPO, pack.module),
      });
    },
  };
}

/** The observation-like object the check and the validation read. */
const decodeSidecar = mod => ({
  image: {
    ...readPlanes(mod.SIDECAR_TEXT),
    sidecar: mod.PACK.image.sidecar,
    optimalAperture: mod.PACK.image.optimalAperture,
  },
  PACK: mod.PACK,
});

/** What is wrong with a pack's sidecar, structurally. */
function checkSidecar(mod, manifest) {
  const problems = [];
  const side = mod.PACK?.image?.sidecar;
  const v = validateImage(side);
  for (const p of v.problems)
    problems.push(`image.sidecar${p.path ? `.${p.path}` : ''} ${p.message}`);
  let planes;
  try {
    planes = readPlanes(mod.SIDECAR_TEXT);
  } catch (err) {
    return [...problems, err.message];
  }
  if (planes.id !== manifest.id)
    problems.push('the sidecar is for another pack');
  if (planes.width !== side?.width || planes.height !== side?.height)
    problems.push('the sidecar planes are not the size the document says');
  for (const k of Object.keys(side?.planes ?? {}))
    if (!planes.planes[k]) problems.push(`the sidecar has no ${k} plane`);
  return problems;
}

const step = (s, tool, version, lossy, extra = {}) => ({
  step: s,
  tool,
  version,
  lossy,
  ...extra,
});

/** The disc of a picture of a body on dark sky: its equivalent radius and centre, as fractions of the width. */
function discOf({ width, height, planes }) {
  const d = planes.data;
  let n = 0;
  let sx = 0;
  let sy = 0;
  for (let i = 0; i < d.length; i++)
    if (d[i] >= 30) {
      n++;
      sx += i % width;
      sy += Math.floor(i / width);
    }
  return {
    radius: Math.sqrt(n / Math.PI) / width,
    cx: sx / n / width - 0.5,
    cy: sy / n / height - 0.5,
  };
}

const r3 = x => Number(x.toFixed(3));

// --- The three display packs ------------------------------------------------------

/** One display-only picture from a JPEG. */
function displayPack(c) {
  const [src] = c.raw;
  return {
    id: c.id,
    manifest: `data-packs/${c.id}.json`,
    capability: null,
    module: `js/data/observations/${c.name}.js`,
    exportName: c.name,
    transformVersion: IMAGE_PACKS_VERSION,
    sidecar: `frames/${c.id}.json`,
    raw: c.raw,
    decode: decodeSidecar,
    check: checkSidecar,
    build(raw) {
      const dec = decodeJpeg(raw[0]);
      if (dec.width !== c.source.width || dec.height !== c.source.height)
        throw new Error(
          `${src.file} is ${dec.width} by ${dec.height}, not the pinned ${c.source.width} by ${c.source.height}`
        );
      const plane = displayPlane(dec, c.options);
      const decoder = `Pillow ${dec.pillow} (libjpeg ${dec.libjpeg})`;
      const [x0, y0, x1, y1] = c.options.crop;
      const history = [
        step('decode', 'image-decode.py (Pillow)', dec.pillow, false),
        step('reencode', 'image-packs.mjs', IMAGE_PACKS_VERSION, true, {
          note: 'gray of the colour (0.299, 0.587, 0.114): display levels, not light',
        }),
        step('crop', 'image-packs.mjs', IMAGE_PACKS_VERSION, true, {
          wcsUpdated: false,
          note: `columns ${x0} to ${x1 - 1}, rows ${y0} to ${y1 - 1} from the top left${c.cropWhy ? `: ${c.cropWhy}` : ''}`,
        }),
        step('resample', 'image-packs.mjs', IMAGE_PACKS_VERSION, true, {
          wcsUpdated: false,
          fluxConserving: false,
          note: `mean of ${c.options.block} by ${c.options.block} pixels`,
        }),
        step('flip', 'image-packs.mjs', IMAGE_PACKS_VERSION, false, {
          wcsUpdated: false,
          note: 'row 1 is the bottom, as in FITS',
        }),
      ];
      const doc = {
        format: 'gravitas.image',
        formatVersion: 1,
        id: c.id,
        title: c.title,
        use: 'display-only',
        width: plane.width,
        height: plane.height,
        pixels: { unit: 'display' },
        planes: { data: { encoding: 'uint8' } },
        history,
        source: { kind: 'pack' },
      };
      const meta = {
        id: c.id,
        version: '1.0.0',
        title: c.title,
        object: c.object,
        facility: c.facility,
        dataType: 'image',
        origin: 'observed',
        credit: c.credit,
        license: c.license,
        retrieved: c.retrieved,
        columns: [
          {
            name: 'display level',
            unit: '',
            description:
              '0 to 255, the gray of the colour picture: for the eye, not a measure of light',
          },
        ],
        masks: [],
        reductions: c.reductions,
        image: {
          width: plane.width,
          height: plane.height,
          sidecar: doc,
        },
      };
      const manifestRest = {
        source: {
          archive: c.archive,
          urls: c.raw.map(r => r.url),
          citations: c.citations,
        },
        raw: c.raw,
        transformation: {
          script: 'tools/data-packs/image-packs.mjs',
          version: IMAGE_PACKS_VERSION,
          options: c.options,
          steps: [
            `Decode the JPEG (image-decode.py, ${decoder}); gray; crop; block mean; rows from the bottom; base64 in the sidecar. Each step is in image.sidecar.history.`,
          ],
          record: {
            source: { width: dec.width, height: dec.height },
            decoder: { pillow: dec.pillow, libjpeg: dec.libjpeg },
          },
        },
        assumptions: c.assumptions,
        reductions: [],
        compatible: { widgets: [], investigations: [] },
        offline: 'none',
      };
      return asSidecar(this, {
        meta,
        manifestRest,
        sidecar: planesText(c.id, plane.width, plane.height, {
          data: { encoding: 'uint8', bytes: plane.bytes },
        }),
      });
    },
    validate(o) {
      const { width, height, planes } = o.image;
      const d = planes.data;
      if (c.disc) {
        const disc = discOf(o.image);
        return {
          check:
            'the frame holds one disc of about the expected size, centred: the pixels at 30 or above fill a disc whose equivalent radius is within the stated fraction of the width, with its centre within 2 percent of the middle',
          against: [
            {
              quantity: 'equivalent disc radius over the width',
              min: c.disc[0],
              max: c.disc[1],
              ref: c.discRef,
            },
          ],
          result: {
            discRadiusOverWidth: r3(disc.radius),
            centreOffsetX: r3(disc.cx),
            centreOffsetY: r3(disc.cy),
          },
          ok:
            disc.radius >= c.disc[0] &&
            disc.radius <= c.disc[1] &&
            Math.abs(disc.cx) < 0.02 &&
            Math.abs(disc.cy) < 0.02,
        };
      }
      let inside = 0;
      let sum = 0;
      for (const v of d) {
        if (v >= 20 && v <= 235) inside++;
        sum += v;
      }
      const mean = sum / d.length;
      let ss = 0;
      for (const v of d) ss += (v - mean) * (v - mean);
      const sd = Math.sqrt(ss / d.length);
      return {
        check:
          'the frame is a picture with structure and not a clipped one: at least 90 percent of the pixels are between 20 and 235, and the levels differ (standard deviation above 20)',
        against: [{ quantity: 'pixels between 20 and 235', min: 0.9 }],
        result: {
          width,
          height,
          fractionInside: r3(inside / d.length),
          standardDeviation: Number(sd.toFixed(1)),
        },
        ok: inside / d.length >= 0.9 && sd > 20,
      };
    },
  };
}

export const SDO_HMI = displayPack({
  id: 'sdo-hmi-continuum-20240510',
  name: 'sdoHmiContinuum20240510',
  title: 'The Sun in HMI continuum light, 10 May 2024 (browse image)',
  object: { name: 'Sun' },
  facility: {
    observatory: 'Solar Dynamics Observatory (NASA)',
    instrument:
      'Helioseismic and Magnetic Imager (HMI), continuum intensitygram',
    pipeline: 'SDO browse product HMIIC, 1,024 pixels, orange colour table',
  },
  credit: 'Courtesy of NASA/SDO and the AIA, EVE, and HMI science teams',
  license: {
    status: 'public-domain',
    statement:
      'SDO data rules (https://sdo.gsfc.nasa.gov/data/rules.php, read 2026-10-24): images and movies are "not copyrighted unless explicitly noted"; credit as above. Browse products are "not intended for science analysis or publication" without the PI\'s consent, so the pack is display-only.',
  },
  retrieved: '2026-10-24',
  archive: 'SDO, NASA Goddard Space Flight Center (sdo.gsfc.nasa.gov)',
  raw: [
    pin(
      '20240510_120000_1024_HMIIC.jpg',
      'https://sdo.gsfc.nasa.gov/assets/img/browse/2024/05/10/20240510_120000_1024_HMIIC.jpg',
      216427,
      '8623c25e7dae624efdabf635823ef602182641548315422dc50b9f24f4f3feb9'
    ),
  ],
  source: { width: 1024, height: 1024 },
  options: { crop: [0, 0, 1024, 992], block: 2 },
  cropWhy:
    'the bottom 32 rows hold a text label ("SDO/HMI Quick-Look Continuum: 20240510_120000") burned into the picture',
  disc: [0.4, 0.5],
  discRef:
    'the disc of the Sun fills about 92 percent of the width of the archive’s browse picture',
  citations: [
    {
      text: 'Pesnell, Thompson and Chamberlin 2012, Solar Physics 275, 3 (SDO)',
      doi: '10.1007/s11207-011-9841-3',
    },
    {
      text: 'Scherrer et al. 2012, Solar Physics 275, 207 (HMI)',
      doi: '10.1007/s11207-011-9834-2',
    },
    {
      text: 'SDO data rules, NASA/GSFC',
      url: 'https://sdo.gsfc.nasa.gov/data/rules.php',
    },
  ],
  reductions: [
    'A browse picture (orange colour table, JPEG) made for the public web from HMI continuum intensity; its label names 2024-05-10 12:00:00, cropped away, and the pack states no time.',
    'Gray, cropped to 1,024 by 992, averaged 2 by 2 to 512 by 496. Not a measurement of intensity.',
  ],
  assumptions: [
    'The colour table is taken as monotonic in intensity; nothing here says how.',
    'The date is the label’s; no time within its minute is used.',
  ],
});

export const GALILEO_MOON = displayPack({
  id: 'galileo-moon-19921207',
  name: 'galileoMoon19921207',
  title:
    'The Moon from Galileo, 7 December 1992 (three filters, enhanced color)',
  object: { name: 'Moon' },
  facility: {
    observatory: 'Galileo spacecraft (NASA)',
    instrument: 'Solid State Imaging camera, violet, 756 nm and 968 nm filters',
    pipeline: 'NASA/JPL Photojournal PIA00405, enhanced color composite',
  },
  credit: 'NASA/JPL/USGS',
  license: {
    status: 'public-domain',
    statement: `${NASA_POLICY} The PIA00405 page (science.nasa.gov/photojournal/earths-moon) credits NASA/JPL/USGS, no other restriction.`,
  },
  retrieved: '2026-10-24',
  archive: 'NASA/JPL Photojournal (science.nasa.gov/photojournal)',
  raw: [
    pin(
      'PIA00405.jpg',
      'https://assets.science.nasa.gov/content/dam/science/psd/photojournal/pia/pia00/pia00405/PIA00405.jpg',
      403335,
      'e13ec17cfd0b6e952ebe1cb15a941d6195da0d691122ffe4bb9579d162bcadf4'
    ),
  ],
  source: { width: 1986, height: 1986 },
  options: { crop: [1, 1, 1985, 1985], block: 4 },
  cropWhy:
    'one column and one row off each edge, so that the picture is a whole number of 4-pixel blocks',
  disc: [0.4, 0.5],
  discRef:
    'the lunar disc nearly fills the picture; its limb is close to the edges',
  citations: [
    {
      text: 'Galileo image of the Moon, 7 December 1992, PIA00405, NASA/JPL/USGS',
      url: 'https://science.nasa.gov/photojournal/earths-moon/',
    },
  ],
  reductions: [
    'Enhanced colour from three filters (violet, 756 nm, 968 nm), the caption says: its levels are not one filter’s light.',
    'Gray, one pixel cropped from each side, averaged 4 by 4 to 496 by 496. Not a calibrated image.',
  ],
  assumptions: [
    'The caption’s date is the only time given; none is stated.',
    'No pixel scale is stated or assumed: a lesson uses the Moon’s known diameter.',
  ],
});

export const HIRISE_MARS = displayPack({
  id: 'hirise-cerberus-fossae',
  name: 'hiriseCerberusFossae',
  title: 'Mars from HiRISE: Cerberus Fossae and a lava flow (ESP_069637_1915)',
  object: { name: 'Mars: Cerberus Fossae' },
  facility: {
    observatory: 'Mars Reconnaissance Orbiter (NASA)',
    instrument: 'HiRISE, black-and-white browse image',
    pipeline:
      'HiRISE image of the day, observation ESP_069637_1915, 4 June 2021',
  },
  credit: 'NASA/JPL-Caltech/University of Arizona',
  license: {
    status: 'public-domain',
    statement:
      'HiRISE image usage policy (https://uahirise.org/media/usage.php, read 2026-10-24): "there is no copyright restriction"; the images are "within the public domain"; credit asked "where possible".',
  },
  retrieved: '2026-10-24',
  archive:
    'HiRISE, Lunar and Planetary Laboratory, University of Arizona (uahirise.org)',
  raw: [
    pin(
      'ESP_069637_1915.jpg',
      'https://static.uahirise.org/hipod/ESP_069637_1915.jpg',
      1904465,
      '0c7f3f4794fa8a7eae4ebf338c90c41cc0d3c8be9c05c4e65235789fe16595ea'
    ),
  ],
  source: { width: 2560, height: 1920 },
  options: { crop: [0, 0, 2560, 1920], block: 4 },
  disc: null,
  citations: [
    {
      text: 'McEwen et al. 2007, J. Geophys. Res. 112, E05S02 (HiRISE)',
      doi: '10.1029/2005JE002605',
    },
    {
      text: 'HiRISE image of the day, ESP_069637_1915',
      url: 'https://uahirise.org/hipod/ESP_069637_1915',
    },
  ],
  reductions: [
    'The HiPOD browse picture, a crop the HiRISE team chose; its scale and projection are not stated, so none is recorded.',
    'Averaged 4 by 4 to 640 by 480 display levels. Not a calibrated image.',
  ],
  assumptions: [
    'No pixel scale is stated or assumed: craters are compared in pixels.',
  ],
});

// --- The one quantitative frame ---------------------------------------------------

const TPF_URL =
  'https://stpubdata.s3.amazonaws.com/tess/public/tid/s0056/0000/0004/2081/4525/tess2022244194134-s0056-0000000420814525-0243-s_tp.fits';
const TPF = 'tess2022244194134-s0056-0000000420814525-0243-s_tp.fits';
const ROW = 8016;
const ROW_BYTES = 2888;
const DATA_START = 25920;
const ROW_AT = DATA_START + ROW_BYTES * ROW;
const WIDTH = 11;
const HEIGHT = 13;
const N = WIDTH * HEIGHT;
/** The saturation reading: 200,000 electrons in a 1.98 s frame, as a rate. */
const SATURATION_RATE = 101010;

/** The SPOC SAP flux of this cadence in the light-curve pack's raw file (the check's published value). */
const SAP_FLUX = {
  value: 214537.7,
  unit: 'electron/s',
  ref: 'SAP_FLUX, CADENCENO 1158430, tess2022244194134-s0056-0000000420814525-0243-s_lc.fits (SHA-256 1b76b4a4b73e24954fa6e29a7e28a174685113ecdbad1bf10ef0e7b766ce99e9)',
};

export const TESS_FRAME = {
  id: 'tess-hd209458-s56-frame',
  manifest: 'data-packs/tess-hd209458-s56-frame.json',
  capability: null,
  module: 'js/data/observations/tessHd209458S56Frame.js',
  exportName: 'tessHd209458S56Frame',
  transformVersion: IMAGE_PACKS_VERSION,
  sidecar: 'frames/tess-hd209458-s56-frame.json',
  raw: [
    pin(
      `${TPF}.head-0-25919`,
      TPF_URL,
      25920,
      '1faeffc2d65d4b82b4367a8093b8083f33b73e9e9cdfa79c5980add3d3a6b11f',
      '0-25919'
    ),
    pin(
      `${TPF}.row-${ROW}`,
      TPF_URL,
      ROW_BYTES,
      '82c026a7a7cd4440773251c29f719895ebdca87723e1a37ce53c0dadf9abcb15',
      `${ROW_AT}-${ROW_AT + ROW_BYTES - 1}`
    ),
    pin(
      `${TPF}.aperture-ext`,
      TPF_URL,
      11520,
      'ac1f2429174ad7ea9c3ffafc3e73feffb8a7937ff4c78e6b10c1bb8dd4f70aac',
      '58014720-58026239'
    ),
  ],
  decode: decodeSidecar,
  check: checkSidecar,

  build(raw) {
    const [head, rowBytes, apBytes] = raw;
    // The primary header is two blocks; the pixel extension's header follows.
    const P = cardsOf(head.subarray(0, 5760));
    const H = cardsOf(head.subarray(5760));
    if (P.OBJECT !== 'TIC 420814525' || P.SECTOR !== 56)
      throw new Error(`the product is ${P.OBJECT} sector ${P.SECTOR}`);
    if (H.NAXIS1 !== ROW_BYTES || H.NAXIS2 !== 20079 || H.TFIELDS !== 11)
      throw new Error('the pixel table is not the one this reads');
    if (H.TDIM5 !== '(11,13)' || H.TUNIT5 !== 'e-/s' || H.TUNIT6 !== 'e-/s')
      throw new Error('the flux columns are not 11 by 13 electrons a second');
    if (H.TIMESYS !== 'TDB' || H.BJDREFI !== 2457000)
      throw new Error('the time is not BTJD');
    const row = Buffer.from(rowBytes);
    const time = row.readDoubleBE(0);
    const cadenceNo = row.readInt32BE(12);
    // Columns after TIME (8), TIMECORR (4), CADENCENO (4): five planes of 143
    // 4-byte values, RAW_CNTS, FLUX, FLUX_ERR, FLUX_BKG, FLUX_BKG_ERR.
    const col = k => {
      const out = new Float32Array(N);
      for (let i = 0; i < N; i++)
        out[i] = row.readFloatBE(16 + 572 * k + 4 * i);
      return out;
    };
    const flux = col(1);
    const err = col(2);
    const quality = row.readInt32BE(16 + 572 * 5);
    if (cadenceNo !== 1158430 || quality !== 0)
      throw new Error(`row ${ROW} is cadence ${cadenceNo}, quality ${quality}`);
    if (![...flux, ...err].every(Number.isFinite))
      throw new Error('the frame has a blank pixel');
    const variance = Float32Array.from(err, e => e * e);
    // The aperture extension: the SPOC optimal aperture (bit 2) and the CCD
    // output, from the bits of the pixels.
    // The extension is a two-block header and one block of data; the block
    // after is the next extension's header, which this does not read.
    const A = cardsOf(apBytes.subarray(0, 5760));
    if (A.NAXIS1 !== WIDTH || A.NAXIS2 !== HEIGHT || A.BITPIX !== 32)
      throw new Error('the aperture image is not 11 by 13 integers');
    const apData = Buffer.from(apBytes.subarray(5760, 8640));
    const optimal = [];
    for (let i = 0; i < N; i++)
      if (apData.readInt32BE(4 * i) & 2) optimal.push(i);
    if (optimal.length !== A.NPIXSAP)
      throw new Error(
        `the optimal aperture holds ${optimal.length} pixels, NPIXSAP is ${A.NPIXSAP}`
      );
    const wcs = {
      ctype: [H['1CTYP5'], H['2CTYP5']],
      crpix: [H['1CRPX5'], H['2CRPX5']],
      crval: [H['1CRVL5'], H['2CRVL5']],
      cdelt: [H['1CDLT5'], H['2CDLT5']],
      pc: [
        [H['11PC5'], H['12PC5']],
        [H['21PC5'], H['22PC5']],
      ],
    };
    const bits = apData.readInt32BE(0);
    const output = [
      [32, 'A'],
      [64, 'B'],
      [128, 'C'],
      [256, 'D'],
    ].find(([bit]) => bits & bit)?.[1];
    if (!output) throw new Error('the aperture names no CCD output');
    const gain = H[`GAIN${output}`];
    const readNoise = H[`READNOI${output}`];
    const effective = Number((H.TIMEDEL * 86400 * H.DEADC).toFixed(6));
    const peak = Math.max(...flux);
    const sidecarDoc = {
      format: 'gravitas.image',
      formatVersion: 1,
      id: this.id,
      title:
        'HD 209458, TESS sector 56, one 2-minute cadence: calibrated flux and its error',
      use: 'quantitative',
      width: WIDTH,
      height: HEIGHT,
      pixels: {
        unit: 'electron/s',
        linearity: {
          status: 'corrected',
          limit: SATURATION_RATE,
          source:
            'SPOC pixel calibration applies a linearity model (TESS Data Release Notes, Sector 10, DR14, section 3.2); the notes give the two models as differing by 1 to 2 percent near saturation, so the limit is the saturation level and a pixel near it is uncertain to that much',
        },
        saturation: {
          level: SATURATION_RATE,
          source:
            'full well about 200,000 electrons a pixel in a 1.98 s frame, varying with the CCD output (Fausnaugh et al. 2021, The TESS Mission Target Selection Procedure, citing Vanderspek et al. 2018, fig. 4.2); the rate form is 200,000 / 1.98 s',
        },
        gain: { value: gain, unit: 'electron/adu', source: 'header' },
        readNoise: { value: readNoise, unit: 'electron', source: 'header' },
      },
      planes: {
        data: { encoding: 'float32-le' },
        variance: {
          encoding: 'float32-le',
          unit: '(electron/s)^2',
          source:
            'FLUX_ERR squared: the SPOC propagated 1-sigma uncertainty of each pixel',
        },
      },
      time: {
        value: 2457000 + time,
        scale: 'TDB',
        format: 'jd',
        reference: 'mid',
      },
      exposure: { seconds: effective, kind: 'effective' },
      scale: {
        arcsecPerPixel: Number((Math.abs(H['1CDLT5']) * 3600).toPrecision(8)),
      },
      wcs,
      calibration: { state: 'calibrated' },
      history: [
        step('calibrate', 'TESS SPOC', P.PROCVER, false, {
          note: 'calibrated and background-subtracted by the archive',
        }),
        step('crop', 'TESS SPOC', P.PROCVER, false, {
          wcsUpdated: true,
          note: 'the 11 by 13 pixels the spacecraft kept',
        }),
        step('decode', 'image-packs.mjs', IMAGE_PACKS_VERSION, false, {
          note: `row ${ROW} (cadence ${cadenceNo}); values unchanged; variance is FLUX_ERR squared`,
        }),
      ],
      source: { kind: 'pack' },
    };
    const meta = {
      id: this.id,
      version: '1.0.0',
      title: sidecarDoc.title,
      object: {
        name: 'HD 209458',
        identifiers: [P.OBJECT],
        ra: P.RA_OBJ,
        dec: P.DEC_OBJ,
        frame: 'ICRS, epoch J2000',
        tessMagnitude: P.TESSMAG,
      },
      facility: {
        observatory: 'TESS (NASA)',
        instrument: `camera ${P.CAMERA}, CCD ${P.CCD}, output ${output}, 2-minute cadence`,
        pipeline: `SPOC ${P.PROCVER}, target pixel file`,
      },
      dataType: 'image',
      origin: 'observed',
      credit: 'TESS, sector 56 (NASA; SPOC target pixel file from MAST)',
      license: {
        status: 'public-domain',
        statement:
          'MAST (https://archive.stsci.edu/publishing/data-use, read 2026-10-24): "most data hosted at MAST are in the public domain"; acknowledge the mission and STScI. Read by byte range from STScI’s public dataset on AWS, which mirrors MAST’s TESS products.',
      },
      retrieved: '2026-10-24',
      columns: [
        {
          name: 'flux',
          unit: 'electron/s',
          description:
            'calibrated, background-subtracted flux of each pixel (FLUX), electrons per second',
        },
      ],
      masks: [],
      reductions: [
        'One cadence of 20,079 (row 8016, BTJD 2836.3903), out of transit with QUALITY 0, chosen from the light curve before the frame was read; nothing averaged or resampled.',
        'The archive subtracted the background before this flux: a sky annulus on it measures a residual.',
      ],
      image: {
        width: WIDTH,
        height: HEIGHT,
        optimalAperture: optimal,
        sidecar: sidecarDoc,
      },
    };
    const manifestRest = {
      source: {
        archive:
          'MAST (Barbara A. Mikulski Archive for Space Telescopes), read from the STScI public dataset on AWS',
        urls: [TPF_URL],
        citations: [
          {
            text: 'TESS Target Pixel Files, STScI/MAST',
            doi: '10.17909/t9-nmc8-f686',
          },
          {
            text: 'TESS Data Release Notes: Sector 10, DR14, section 3.2 (linearity)',
            url: 'https://archive.stsci.edu/missions/tess/doc/tess_drn/tess_sector_10_drn14_v02.pdf',
          },
          {
            text: 'Fausnaugh et al. 2021, The TESS Mission Target Selection Procedure (saturation)',
            url: 'https://arxiv.org/abs/2109.02665',
          },
        ],
      },
      raw: this.raw,
      transformation: {
        script: 'tools/data-packs/image-packs.mjs',
        version: IMAGE_PACKS_VERSION,
        options: { row: ROW },
        steps: [
          'Read by byte range: the headers (bytes 0 to 25,919), row 8016 of the PIXELS table, and the aperture extension.',
          'Check the object, sector, units, time system, cadence and QUALITY; keep FLUX and FLUX_ERR squared, big-endian to little-endian float32, with the TAN world coordinates, the optimal aperture (bit 2) and the gain and read noise of the CCD output.',
        ],
        record: {
          file: { bytes: 58026240, etag: '6d1885f6c555346374e20e6f762d8e5e' },
          row: ROW,
          cadenceNo,
          timeBtjd: time,
          quality,
          output,
          effectiveExposureSeconds: effective,
          npixsap: A.NPIXSAP,
          crowdsap: H.CROWDSAP,
          flfrcsap: H.FLFRCSAP,
          peakFlux: Number(peak.toFixed(1)),
        },
      },
      assumptions: [
        'No documented number gives the highest linear pixel: the limit is the saturation level, with the 1 to 2 percent of the release notes as the uncertainty near it. The frame’s peak is 42 percent of it.',
        'FLUX_ERR is the SPOC’s 1-sigma noise, not recomputed from gain and read noise.',
      ],
      reductions: [],
      compatible: { widgets: [], investigations: [] },
      offline: 'none',
    };
    return asSidecar(this, {
      meta,
      manifestRest,
      sidecar: planesText(this.id, WIDTH, HEIGHT, {
        data: { encoding: 'float32-le', bytes: Buffer.from(flux.buffer) },
        variance: {
          encoding: 'float32-le',
          bytes: Buffer.from(variance.buffer),
        },
      }),
    });
  },

  /** The scientific check: this frame is the archive's pixels. */
  validate(o) {
    const { planes, sidecar, optimalAperture } = o.image;
    const flux = planes.data;
    const peak = Math.max(...flux);
    const sat = sidecar.pixels.saturation.level;
    let sum = 0;
    for (const i of optimalAperture) sum += flux[i];
    const relative = Math.abs(sum / SAP_FLUX.value - 1);
    return {
      check:
        'the sum of the frame’s flux over the pixels of the SPOC optimal aperture equals the light curve’s SAP_FLUX for the same cadence (relative 1e-5), and the peak pixel is below the saturation level',
      against: [{ quantity: 'SAP_FLUX (electron/s)', ...SAP_FLUX }],
      result: {
        apertureSum: Number(sum.toFixed(1)),
        relativeDifference: Number(relative.toPrecision(2)),
        peak: Number(peak.toFixed(1)),
        saturationLevel: sat,
      },
      ok: optimalAperture.length > 0 && relative < 1e-5 && peak < sat,
    };
  },
};

export const IMAGE_PACKS = [SDO_HMI, GALILEO_MOON, HIRISE_MARS, TESS_FRAME];
