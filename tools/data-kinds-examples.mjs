// =============================================================================
// An example of each data kind, from material Gravitas already has (Prompt 157)
// -----------------------------------------------------------------------------
//   node tools/data-kinds-examples.mjs            say what is committed
//   node tools/data-kinds-examples.mjs --check    the committed files validate and agree with their sources
//   node tools/data-kinds-examples.mjs --write    rewrite tests/fixtures/dataKinds/
//
//   image           the TESS aperture mask of HD 209458 (data-packs/tess-hd209458-
//                   s56-aperture.json) as a gravitas.image whose contract is filled:
//                   bit flags with their documented meaning, the TAN world
//                   coordinates of the extension, the pixel scale. It is not light,
//                   so photometry is refused (not-flux); astrometry is allowed.
//   image-sequence  two frames from the forward ccd model (js/forward/models/
//                   ccd.js), one seed (one fixed pattern) and two labels (two
//                   noise draws), a minute apart, each a part of 24,576 bytes.
//                   The truth manifest and the gain and read noise are the model's.
//   grid            the MIST isochrone pack's table (data-packs/mist-sdss-
//                   isochrones.json) as a keyed grid over [Fe/H] and log age: 21
//                   cells that tile its 1,410 rows. The rows stay in the pack.
//
// The pack files and modules are not changed: the examples are new documents
// beside them. The frames are committed bytes; regenerating them on another Node
// version can move a count across a rounding boundary by one (Math.log and
// Math.cos differ in the last bit), so --check compares a regeneration to them
// within the tolerance in tools/data-kinds-cases.mjs (TOL.regeneratedAdu) and
// the tests judge the committed bytes, never a digest of a regeneration.
// =============================================================================

import { createHash } from 'node:crypto';
import { Buffer } from 'node:buffer';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { EXAMPLES, TOL } from './data-kinds-cases.mjs';
import {
  FORMAT_VERSION,
  GRID_FORMAT,
  IMAGE_FORMAT,
  SEQUENCE_FORMAT,
  validateGrid,
  validateImage,
  validateImageSequence,
} from '../js/dataKinds/contract.js';
import { pixelScale } from '../js/observatory/wcs.js';
import { runForward } from '../js/forward/index.js';
import { VERSION as CCD_VERSION } from '../js/forward/models/ccd.js';
import { tableOf } from '../js/tableObservation.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR = path.join(ROOT, EXAMPLES.dir);
const json = rel => JSON.parse(readFileSync(path.join(ROOT, rel), 'utf8'));
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

/** The aperture pack as a gravitas.image. */
export function buildImageExample() {
  const m = json('data-packs/tess-hd209458-s56-aperture.json');
  return {
    format: IMAGE_FORMAT,
    formatVersion: FORMAT_VERSION,
    id: m.id,
    title:
      'HD 209458, TESS sector 56: the aperture mask, as an image with its contract',
    use: 'quantitative',
    width: m.image.width,
    height: m.image.height,
    pixels: {
      unit: 'flags',
      bits: m.image.bits,
      bitsSource: m.image.bitsSource,
    },
    planes: { data: { encoding: 'uint16-le' } },
    scale: { arcsecPerPixel: pixelScale(m.image.wcs)[0] },
    wcs: m.image.wcs,
    history: [
      {
        step: 'decode',
        tool: m.transformation.script,
        version: m.transformation.version,
        lossy: false,
      },
    ],
    source: {
      kind: 'pack',
      id: m.id,
      version: m.version,
      module: m.derived.file,
      sha256: m.derived.sha256,
      note: 'the pixels stay in the pack (encoding image-uint16/1, little-endian 16-bit, the lowest row first); this document is the contract beside them',
    },
  };
}

/** What the sequence's frames are made of: one seed, two noise draws. */
const SEQUENCE = Object.freeze({
  seed: 'dk-157',
  width: EXAMPLES.sequence.width,
  height: EXAMPLES.sequence.height,
  pixelScale: 1.2,
  psfFwhm: 3,
  exposure: 30,
  sky: 5,
  sources: [
    { x: 40, y: 30, rate: 300 },
    { x: 90, y: 60, rate: 150 },
    { x: 64, y: 48, rate: 80 },
  ],
  times: ['2026-03-01T04:00:00Z', '2026-03-01T04:01:00Z'],
  labels: ['f1', 'f2'],
});

/** The two frames, as the forward ccd model makes them. */
export function simulateSequence() {
  const S = SEQUENCE;
  const setup = {
    format: 'gravitas.observing-setup',
    formatVersion: 1,
    seed: S.seed,
    instrument: {
      kind: 'imager',
      width: S.width,
      height: S.height,
      pixelScale: S.pixelScale,
      psfFwhm: S.psfFwhm,
    },
  };
  return S.labels.map(label =>
    runForward(
      'ccd',
      {
        exposure: S.exposure,
        label,
        detector: { cosmicRate: 0 },
        scene: { sky: S.sky, sources: S.sources },
      },
      setup
    )
  );
}

const uint16 = values => {
  const b = Buffer.alloc(2 * values.length);
  values.forEach((v, i) => b.writeUInt16LE(v, 2 * i));
  return b;
};

/** The sequence document and its frames' bytes. */
export function buildSequenceExample(
  observations = simulateSequence(),
  bytes = null
) {
  const S = SEQUENCE;
  const first = observations[0];
  const p = id => first.synthetic.truth.parameters.find(q => q.id === id).value;
  const gain = p('gain');
  const bias = p('biasLevel');
  const fullWell = p('fullWell');
  const frames =
    bytes ??
    observations.map(o =>
      uint16(o.columns.find(c => c.id === 'counts').values)
    );
  const saturation = Math.round(fullWell / gain + bias);
  return {
    frames,
    doc: {
      format: SEQUENCE_FORMAT,
      formatVersion: FORMAT_VERSION,
      id: 'forward-ccd-two-frames',
      title: 'Two synthetic CCD frames of one field (the forward ccd model)',
      frame: {
        id: 'forward-ccd-frame-shape',
        use: 'quantitative',
        width: S.width,
        height: S.height,
        pixels: {
          unit: 'adu',
          linearity: {
            status: 'linear',
            limit: saturation,
            source:
              'the model has no nonlinearity below the full well (its truth notes)',
          },
          saturation: {
            level: saturation,
            source: `model: full well ${fullWell} electrons over gain ${gain} electrons per count, plus the bias level ${bias}`,
          },
          gain: { value: gain, unit: 'electron/adu', source: 'model' },
          readNoise: {
            value: p('readNoise'),
            unit: 'electron',
            source: 'model',
          },
        },
        planes: { data: { encoding: 'uint16-le' } },
        scale: { arcsecPerPixel: S.pixelScale },
        wcs: first.image.wcs,
        calibration: { state: 'raw' },
        history: [
          {
            step: 'decode',
            tool: 'tools/data-kinds-examples.mjs',
            version: '1',
            lossy: false,
          },
        ],
        source: {
          kind: 'synthetic',
          model: {
            name: `forward model ccd ${CCD_VERSION} (js/forward/models/ccd.js)`,
            parameters: {
              seed: S.seed,
              labels: S.labels,
              exposureSeconds: S.exposure,
              skyElectronsPerSecondPerPixel: S.sky,
              sources: S.sources,
              pixelScaleArcsec: S.pixelScale,
              psfFwhmArcsec: S.psfFwhm,
              gain,
              readNoise: p('readNoise'),
              biasLevel: bias,
              cosmicRayRate: 0,
            },
          },
        },
      },
      frames: frames.map((b, i) => {
        const sha = sha256(b);
        return {
          index: i,
          time: {
            value: S.times[i],
            scale: 'UTC',
            format: 'iso',
            reference: 'mid',
          },
          exposure: { seconds: S.exposure, kind: 'nominal' },
          part: {
            id: `forward-ccd-frame-${i}`,
            url: `/${EXAMPLES.dir}/frame-${i}.${sha.slice(0, 16)}.bin`,
            sha256: sha,
            bytes: b.length,
          },
        };
      }),
    },
  };
}

/** The MIST pack's table as a keyed grid. */
async function mistGrid() {
  const m = json('data-packs/mist-sdss-isochrones.json');
  const mod = await import('../js/data/observations/mistSdssIsochrones.js');
  const t = tableOf(mod);
  const col = id => t.columns.find(c => c.id === id);
  const keys = EXAMPLES.grid.axes;
  const axes = keys.map(k => {
    const c = col(k);
    return {
      name: k,
      unit: c.unit,
      values: [...new Set(c.values)].sort((a, b) => a - b),
    };
  });
  const cells = [];
  let prev = null;
  for (let r = 0; r < t.n; r++) {
    const at = keys.map(k => col(k).values[r]);
    if (prev && at.every((x, i) => x === prev.at[i])) prev.count++;
    else cells.push((prev = { at, count: 1 }));
  }
  return {
    format: GRID_FORMAT,
    formatVersion: FORMAT_VERSION,
    id: 'mist-sdss-isochrones-grid',
    title:
      'MIST v1.2 isochrones in the SDSS bands, as a grid over [Fe/H] and log age',
    axes,
    outputs: t.columns
      .filter(c => !keys.includes(c.id))
      .map(c => ({ name: c.id, unit: c.unit })),
    layout: 'keyed',
    keys,
    rows: t.n,
    cells,
    storage: { kind: 'pack-table', pack: m.id, sha256: m.derived.sha256 },
    generator: {
      name: 'MIST v1.2 isochrones, SDSS ugriz (AB)',
      version: m.version,
      tool: `${m.transformation.script} ${m.transformation.version}`,
      inputs: {
        raw: m.raw.map(r => ({ file: r.file, sha256: r.sha256 })),
        ...m.transformation.options,
      },
    },
  };
}
export { mistGrid as buildMistGrid };

const write = (name, data) => writeFileSync(path.join(DIR, name), data);
const pretty = doc => `${JSON.stringify(doc, null, 2)}\n`;

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--write')) {
    mkdirSync(DIR, { recursive: true });
    for (const f of readdirSync(DIR))
      if (/^frame-\d\.[0-9a-f]{16}\.bin$/.test(f))
        unlinkSync(path.join(DIR, f));
    write(EXAMPLES.image.file, pretty(buildImageExample()));
    const seq = buildSequenceExample();
    seq.frames.forEach((b, i) =>
      write(`frame-${i}.${seq.doc.frames[i].part.sha256.slice(0, 16)}.bin`, b)
    );
    write(EXAMPLES.sequence.file, pretty(seq.doc));
    write(EXAMPLES.grid.file, pretty(await mistGrid()));
    console.log(`wrote ${EXAMPLES.dir}`);
    return;
  }
  const problems = [];
  const read = name =>
    existsSync(path.join(DIR, name))
      ? JSON.parse(readFileSync(path.join(DIR, name), 'utf8'))
      : null;
  const image = read(EXAMPLES.image.file);
  const seq = read(EXAMPLES.sequence.file);
  const grid = read(EXAMPLES.grid.file);
  for (const [name, doc, check] of [
    [EXAMPLES.image.file, image, validateImage],
    [EXAMPLES.sequence.file, seq, validateImageSequence],
    [EXAMPLES.grid.file, grid, validateGrid],
  ]) {
    if (!doc) problems.push(`${name} is missing`);
    else
      for (const p of check(doc).problems)
        problems.push(`${name}: ${p.path} ${p.message}`);
  }
  if (image && pretty(image) !== pretty(buildImageExample()))
    problems.push('the image example is not what its pack gives');
  if (grid && pretty(grid) !== pretty(await mistGrid()))
    problems.push('the grid example is not what its pack gives');
  if (seq) {
    const frames = seq.frames.map(f => {
      const file = path.join(ROOT, f.part.url);
      return existsSync(file) ? readFileSync(file) : null;
    });
    frames.forEach((b, i) => {
      if (!b) return problems.push(`frame ${i} is missing`);
      if (
        sha256(b) !== seq.frames[i].part.sha256 ||
        b.length !== seq.frames[i].part.bytes
      )
        problems.push(`frame ${i} is not the bytes its part declares`);
    });
    if (!problems.length) {
      const fresh = buildSequenceExample();
      fresh.frames.forEach((b, i) => {
        let worst = 0;
        for (let k = 0; k < b.length; k += 2)
          worst = Math.max(
            worst,
            Math.abs(b.readUInt16LE(k) - frames[i].readUInt16LE(k))
          );
        if (worst > TOL.regeneratedAdu.value)
          problems.push(
            `frame ${i}: a regeneration differs by ${worst} counts, more than ${TOL.regeneratedAdu.value}`
          );
      });
    }
  }
  if (problems.length) {
    console.error(problems.join('\n'));
    process.exit(1);
  }
  console.log('the three examples validate and agree with their sources');
}

if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`)
  await main();
