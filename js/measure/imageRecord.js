// =============================================================================
// The record: marks, scale, frame time and image identity, and its replay
// -----------------------------------------------------------------------------
// Ported from the gate's accepted prototype (IMAGE_MEASUREMENT_GATE.md, D-R10-48).
// One description of a set of marks, `marksRecord`, serves two places:
//
//   the ledger      one gravitas.artifact/1 envelope (js/platform/artifact.js,
//                   Prompt 150): every coordinate a quantity with an uncertainty
//                   of Prompt 150's kinds, the scale and each frame's time beside
//                   them, the image's identity a SHA-256 of its pixels, and in the
//                   provenance the marks as placed so that the refinement can be
//                   run again on the same pixels (replay);
//   the workspace   `workspace.marks` of an Observatory save, a
//                   gravitas.image-marks/1 block (FORMATS.md), written only when
//                   marks exist, so a workspace without marks is the bytes it was.
//
// A record reopens the image with its marks (`replay`): it refuses when a frame's
// pixels are not the ones it was made on, rebuilds the marks as placed, refines
// them again and says whether each refined coordinate is bit-identical to the one
// the record holds (in the same engine: another browser's Math.exp may differ in
// the last bit, so `agrees` also says whether every one is within a micro-pixel).
// Pure; async only for the digest.
// =============================================================================

import { artifact, validateArtifact } from '../platform/artifact.js';
import { sha256Hex } from '../hash.js';
import { ARITY, PLACE_SIGMA, emptyState, refine } from './marks.js';
import { REFINE_VERSION } from './refine.js';
import { areaOf, lengthOf, scaleOf, timeOf } from './scale.js';

export const MARKS_FORMAT = 'gravitas.image-marks';
export const MARKS_VERSION = 1;
export const STEP = 'image-marks';
/** The most marks and frames a record holds (the workspace's own limits are larger). */
export const LIMITS = Object.freeze({ marks: 2000, frames: 256, points: 1000 });

export const digestFrame = f =>
  sha256Hex(
    new Uint8Array(f.data.buffer, f.data.byteOffset, f.data.byteLength)
  );

const sigmaQ = (sigma, refined) => ({
  kind: 'sigma',
  sigma,
  basis: refined ? 'data' : 'assumed',
});

/** The marks as the record's quantities, each with an uncertainty of Prompt 150's kinds. */
function quantitiesOf(state, frames, scale) {
  const q = [];
  const pix = (id, label, value, sigma, refined, unit = 'pix') =>
    q.push({
      id,
      label,
      value,
      unit,
      origin: 'measured',
      uncertainty: Number.isFinite(sigma)
        ? sigmaQ(sigma, refined)
        : { kind: 'assumed' },
    });
  for (const m of state.marks) {
    const tag = m.tag ? ` (${m.tag})` : '';
    const single = m.pts.length === 1 || m.kind === 'circle';
    m.pts.forEach((p, i) => {
      if (m.kind === 'circle' && i === 1) return;
      const n = single ? (m.kind === 'circle' ? 'centre ' : '') : `${i + 1} `;
      const key = single ? '' : i + 1;
      pix(
        `${m.id}.x${key}`,
        `${m.kind} ${m.id}${tag}: ${n}x, frame ${m.frame + 1}`,
        p[0],
        m.sigma,
        m.refined
      );
      pix(
        `${m.id}.y${key}`,
        `${m.kind} ${m.id}${tag}: ${n}y, frame ${m.frame + 1}`,
        p[1],
        m.sigma,
        m.refined
      );
    });
    if (m.kind === 'circle')
      pix(
        `${m.id}.r`,
        `circle ${m.id}${tag}: radius, frame ${m.frame + 1}`,
        lengthOf(m),
        m.sigmaR ?? m.sigma,
        m.refined
      );
    else if (m.kind === 'polygon')
      pix(
        `${m.id}.area`,
        `polygon ${m.id}${tag}: area, frame ${m.frame + 1}`,
        areaOf(m),
        NaN,
        false,
        'pix^2'
      );
  }
  if (scale && !scale.refused && scale.source !== 'sidecar') {
    const pair = state.marks.find(m => m.id === scale.source);
    q.push({
      id: 'scale.length',
      label: 'known length of the reference pair',
      value: pair.length.value,
      unit: pair.length.unit,
      origin: 'assumed',
      uncertainty: { kind: 'assumed' },
    });
    pix(
      'scale.pixels',
      'length of the reference pair',
      scale.pixels,
      scale.pixelSigma,
      false
    );
    q.push({
      id: 'scale',
      label: `scale, ${scale.unit}`,
      value: scale.value,
      unit: null,
      origin: 'derived',
      uncertainty: { kind: 'sigma', sigma: scale.sigma, basis: 'derived' },
    });
  }
  frames.forEach((f, k) => {
    const t = timeOf(f.time);
    if (t)
      q.push({
        id: `frame${k + 1}.time`,
        label: `time of frame ${k + 1} (MJD, ${t.scale})`,
        value: t.mjd,
        unit: 'd',
        origin: 'assumed',
        uncertainty: { kind: 'assumed' },
      });
  });
  return q;
}

/**
 * The marks and what they were marked on, as the reduction both records carry.
 * @param {{frames: object[], state: {marks: object[]}}} a - frames are {id,
 *   width, height, data, time?}
 */
export async function marksRecord({ frames, state }) {
  const digests = await Promise.all(frames.map(digestFrame));
  const used = new Set(state.marks.map(m => m.frame));
  return {
    step: STEP,
    version: MARKS_VERSION,
    refine: REFINE_VERSION,
    frames: frames.map((f, k) => ({
      id: f.id,
      width: f.width,
      height: f.height,
      digest: digests[k],
      ...(timeOf(f.time) ? { time: f.time } : {}),
      used: used.has(k),
    })),
    marks: state.marks.map(m => ({
      id: m.id,
      kind: m.kind,
      frame: m.frame,
      tag: m.tag,
      pts: m.refined ? m.placed : m.pts,
      ...(m.length ? { length: m.length } : {}),
      result: m.refined
        ? { pts: m.pts, sigma: m.sigma, sigmaR: m.sigmaR ?? null }
        : null,
    })),
  };
}

/**
 * The `workspace.marks` block, or null when there are no marks (a workspace
 * without marks is written as it always was).
 */
export async function marksBlock({ frames, state }) {
  if (!state.marks.length) return null;
  return {
    format: MARKS_FORMAT,
    formatVersion: MARKS_VERSION,
    ...(await marksRecord({ frames, state })),
  };
}

/**
 * One gravitas.artifact/1 envelope with replay.
 * @param {{id: string, setId: string, frames: object[], sidecar?: object,
 *   state: object}} a
 */
export async function writeRecord({ id, setId, frames, sidecar, state }) {
  const red = await marksRecord({ frames, state });
  return artifact({
    id,
    source: {
      kind: 'observation',
      id: setId,
      digest: (await sha256Hex(red.frames.map(f => f.digest).join(''))).slice(
        0,
        64
      ),
    },
    quantities: quantitiesOf(state, frames, scaleOf(state, { sidecar })),
    provenance: { reductions: [red] },
    made: { app: 'gravitas', tool: STEP },
  });
}

export class ReplayError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

const finite = v => typeof v === 'number' && Number.isFinite(v);
const HEX = /^[0-9a-f]{64}$/;

/**
 * Whether a `workspace.marks` block is well formed (a list of problems, each
 * `{path, message}`; empty when it is). Data only: nothing here reads pixels.
 */
export function validateMarks(b) {
  const out = [];
  const bad = (path, message) => out.push({ path, message });
  if (!b || typeof b !== 'object')
    return [{ path: 'marks', message: 'is an object' }];
  if (b.format !== MARKS_FORMAT || b.formatVersion !== MARKS_VERSION)
    bad('marks.format', `is ${MARKS_FORMAT}/${MARKS_VERSION}`);
  if (
    !Array.isArray(b.frames) ||
    !b.frames.length ||
    b.frames.length > LIMITS.frames
  )
    return [
      ...out,
      {
        path: 'marks.frames',
        message: 'lists the frames the marks were made on',
      },
    ];
  b.frames.forEach((f, k) => {
    const at = `marks.frames[${k}]`;
    if (!HEX.test(f?.digest ?? ''))
      bad(`${at}.digest`, 'is the SHA-256 of the frame');
    if (!(
      Number.isInteger(f?.width) &&
      f.width > 0 &&
      Number.isInteger(f?.height) &&
      f.height > 0
    ))
      bad(at, 'has a width and a height in pixels');
    if (f?.time !== undefined && !timeOf(f.time))
      bad(`${at}.time`, 'names its time scale');
  });
  if (!Array.isArray(b.marks) || b.marks.length > LIMITS.marks)
    return [
      ...out,
      {
        path: 'marks.marks',
        message: `is a list of at most ${LIMITS.marks} marks`,
      },
    ];
  const ids = new Set();
  b.marks.forEach((m, i) => {
    const at = `marks.marks[${i}]`;
    const need = ARITY[m?.kind];
    if (!need)
      return bad(`${at}.kind`, `is one of ${Object.keys(ARITY).join(', ')}`);
    if (typeof m.id !== 'string' || !m.id || ids.has(m.id))
      bad(`${at}.id`, 'is unique');
    ids.add(m.id);
    if (!(
      Number.isInteger(m.frame) &&
      m.frame >= 0 &&
      m.frame < b.frames.length
    ))
      bad(`${at}.frame`, 'is a frame of the record');
    if (typeof m.tag !== 'string' || m.tag.length > 40)
      bad(`${at}.tag`, 'is text of at most 40 characters');
    const pts = (p, name) =>
      Array.isArray(p) &&
      p.length <= LIMITS.points &&
      p.every(q => Array.isArray(q) && q.length === 2 && q.every(finite))
        ? p
        : bad(`${at}.${name}`, 'is a list of [x, y] numbers');
    const pl = pts(m.pts, 'pts');
    if (pl && (m.kind === 'polygon' ? pl.length < 3 : pl.length !== need))
      bad(
        `${at}.pts`,
        `has ${m.kind === 'polygon' ? 'three or more' : need} points`
      );
    if (
      m.length !== undefined &&
      !(
        finite(m.length?.value) &&
        m.length.value > 0 &&
        typeof m.length.unit === 'string'
      )
    )
      bad(`${at}.length`, 'is {value, unit, sigma?}');
    if (m.result) {
      const rp = pts(m.result.pts, 'result.pts');
      if (rp && pl && rp.length !== pl.length)
        bad(`${at}.result.pts`, 'has the points of the mark');
      if (!finite(m.result.sigma)) bad(`${at}.result.sigma`, 'is a number');
    }
  });
  return out;
}

const same = (a, b) => Object.is(a, b);
const near = (a, b) => Math.abs(a - b) <= 1e-6;

/**
 * Reopen a record against the frames it was made on: refuse if a frame's pixels
 * changed, rebuild the marks as placed, refine again, and say whether every
 * refined coordinate is bit-identical to the one the record holds.
 * @param {object} record - A gravitas.artifact/1 written by writeRecord, or a
 *   gravitas.image-marks/1 block
 * @param {object[]} frames - The frames now open
 * @returns {Promise<{state: object, identical: boolean, agrees: boolean, differ: string[]}>}
 * @throws {ReplayError} `invalid` or `image-changed`
 */
export async function replay(record, frames) {
  let red;
  if (record?.format === MARKS_FORMAT) {
    const problems = validateMarks(record);
    if (problems.length)
      throw new ReplayError(
        'invalid',
        `the marks are not a record: ${problems[0].path} ${problems[0].message}`
      );
    red = record;
  } else {
    const problems = validateArtifact(record);
    if (problems.length)
      throw new ReplayError(
        'invalid',
        `the record is not an envelope: ${problems[0].path} ${problems[0].message}`
      );
    red = record.provenance.reductions.find(r => r.step === STEP);
    if (!red)
      throw new ReplayError('invalid', 'the record holds no image marks');
  }
  for (const [k, spec] of red.frames.entries()) {
    const f = frames[k];
    if (
      !f ||
      f.width !== spec.width ||
      f.height !== spec.height ||
      (await digestFrame(f)) !== spec.digest
    )
      throw new ReplayError(
        'image-changed',
        `frame ${k + 1} (${spec.id}) is not the image this record was made on`
      );
  }
  let state = emptyState();
  const differ = [];
  let agrees = true;
  for (const rec of red.marks) {
    state = {
      ...state,
      nextId: state.nextId + 1,
      marks: [
        ...state.marks,
        {
          id: rec.id,
          kind: rec.kind,
          frame: rec.frame,
          tag: rec.tag,
          pts: rec.pts,
          sigma: PLACE_SIGMA,
          refined: false,
          ...(rec.length ? { length: rec.length } : {}),
        },
      ],
    };
    if (rec.result) {
      const r = refine(state, rec.id, frames).state.marks.find(
        m => m.id === rec.id
      );
      const pairs = r.refined
        ? r.pts.flatMap((p, i) => [
            [p[0], rec.result.pts[i][0]],
            [p[1], rec.result.pts[i][1]],
          ])
        : null;
      if (
        !pairs ||
        !pairs.every(([a, b]) => same(a, b)) ||
        !same(r.sigma, rec.result.sigma)
      )
        differ.push(rec.id);
      if (!pairs || !pairs.every(([a, b]) => near(a, b))) agrees = false;
      state = {
        ...state,
        marks: state.marks.map(m => (m.id === rec.id ? r : m)),
      };
    }
  }
  return { state, identical: differ.length === 0, agrees, differ };
}
