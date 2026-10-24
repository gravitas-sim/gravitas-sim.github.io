// =============================================================================
// Image packs as observations: the frame, fetched when it is opened
// -----------------------------------------------------------------------------
// An image pack (IMAGE_PACKS.md) is two files: a module with the record (PACK:
// credit, rights, the sidecar contract) and a frames file holding the pixel
// planes as base64 text. The frames file is not JavaScript, so no JavaScript
// budget counts a picture; it is fetched here, only when the frame is opened,
// and checked against the checksum the module records before one pixel is
// read. A file that is not the one the pack names is refused, not drawn.
//
// What comes out is a gravitas.observation/1 image shaped as js/observatory/
// imageImport.js shapes one: columns x, y and v (and `variance`, when the
// archive gave an uncertainty for every pixel), and `image.sidecar`, the
// gravitas.image contract the measurement panels read to say what they will
// and will not do with it. A display-only pack carries a contract that
// permits marking and nothing else.
//
// Pure of the page except for `fetch`; Browser and Node alike (a test passes
// its own).
// =============================================================================

import { sha256Hex } from '../hash.js';
import { FORMAT, FORMAT_VERSION } from './schema.js';

/** The frames files' format name, as tools/data-packs/image-packs.mjs writes it. */
export const PLANES_FORMAT = 'gravitas.image-pack-planes';
export const PLANES_VERSION = 1;

const text = bytes => new TextDecoder().decode(bytes);

function planeOf(plane, n, name) {
  const bin = atob(plane.base64);
  const size = plane.encoding === 'float32-le' ? 4 : 1;
  if (bin.length !== n * size)
    throw new Error(
      `frames file: plane ${name} is ${bin.length} bytes, not ${n * size}`
    );
  const bytes = Uint8Array.from(bin, c => c.charCodeAt(0));
  if (size === 1) return Float64Array.from(bytes);
  const view = new DataView(bytes.buffer);
  const out = new Float64Array(n);
  for (let i = 0; i < n; i++) out[i] = view.getFloat32(i * 4, true);
  return out;
}

/**
 * The planes of a frames file, after it has been checked against the pack.
 * @param {ArrayBuffer} bytes
 * @param {{file: string, bytes: number, sha256: string}} side - the module's SIDECAR
 * @param {{id: string, image: {width: number, height: number}}} pack
 * @returns {Promise<{data: Float64Array, variance: ?Float64Array}>}
 */
export async function readFrames(bytes, side, pack) {
  if (bytes.byteLength !== side.bytes)
    throw new Error(
      `${side.file}: ${bytes.byteLength} bytes, not the ${side.bytes} the pack records`
    );
  const digest = await sha256Hex(new Uint8Array(bytes));
  if (digest !== side.sha256)
    throw new Error(
      `${side.file}: its SHA-256 is not the one the pack records`
    );
  const doc = JSON.parse(text(bytes));
  const { width, height } = pack.image;
  if (
    doc.format !== PLANES_FORMAT ||
    doc.formatVersion !== PLANES_VERSION ||
    doc.id !== pack.id ||
    doc.width !== width ||
    doc.height !== height
  )
    throw new Error(`${side.file}: not the frames of ${pack.id}`);
  const n = width * height;
  return {
    data: planeOf(doc.planes.data, n, 'data'),
    variance: doc.planes.variance
      ? planeOf(doc.planes.variance, n, 'variance')
      : null,
  };
}

/**
 * The image observation of an image pack.
 * @param {object} mod - the pack module (PACK, SIDECAR)
 * @param {{fetch?: Function, bytes?: ArrayBuffer, citations?: object[]}} [io] - `citations`: the pack's, linked by fixtures.js
 */
export async function imagePackObservation(mod, io = {}) {
  const P = mod.PACK;
  let bytes = io.bytes;
  if (!bytes) {
    const res = await (io.fetch ?? fetch)(`/${mod.SIDECAR.file}`);
    if (!res.ok) throw new Error(`${mod.SIDECAR.file}: HTTP ${res.status}`);
    bytes = await res.arrayBuffer();
  }
  const { data, variance } = await readFrames(bytes, mod.SIDECAR, P);
  const { width, height, sidecar } = P.image;
  const n = width * height;
  const x = new Float64Array(n);
  const y = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    x[i] = (i % width) + 1;
    y[i] = Math.floor(i / width) + 1;
  }
  const light = sidecar.use === 'quantitative';
  const columns = [
    { id: 'x', name: 'column', unit: 'pix', role: 'x', values: x },
    { id: 'y', name: 'row', unit: 'pix', role: 'x', values: y },
    {
      id: 'v',
      name: light ? P.columns[0].name : 'display level',
      unit: light ? P.columns[0].unit : '',
      role: 'value',
      values: data,
    },
  ];
  if (variance)
    columns.push({
      id: 'variance',
      // Not a unit the workspace converts: the unit is in the name, not stated as one.
      name: `variance, (${P.columns[0].unit})^2`,
      unit: null,
      role: 'value',
      values: variance,
    });
  const o = P.object;
  return {
    format: FORMAT,
    formatVersion: FORMAT_VERSION,
    kind: 'image',
    id: `pack:${P.id}@${P.version}`,
    title: P.title,
    object:
      o?.ra === undefined
        ? null
        : { name: o.name, ra: o.ra, dec: o.dec, frame: o.frame },
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
    citations: io.citations ?? [],
    reductions: [
      ...(P.reductions ?? []),
      ...sidecar.history.map(h => h.note).filter(Boolean),
    ],
    columns,
    axes: { x: 'x', y: 'y' },
    image: {
      width,
      height,
      ...(sidecar.wcs ? { wcs: sidecar.wcs } : {}),
      x: 'x',
      y: 'y',
      value: 'v',
      ...(variance ? { variance: 'variance' } : {}),
      sidecar,
      ...(sidecar.time ? { time: sidecar.time } : {}),
    },
    masks: [],
    annotations: [],
  };
}
