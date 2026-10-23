// =============================================================================
// The record: marks, scale, frame time and image identity, and its replay
// -----------------------------------------------------------------------------
// Ported from the gate's prototype (IMAGE_MEASUREMENT_GATE.md, D-R10-48). One
// description of a set of marks, `marksRecord`, serves two places:
//   the ledger      a gravitas.artifact/1 (Prompt 150): every coordinate a
//                   quantity with its uncertainty, the scale and frame times,
//                   the image's SHA-256, and in the provenance the marks as
//                   placed, so the refinement can be run again (replay)
//   the workspace   `workspace.marks`, a gravitas.image-marks/1 block (FORMATS.md),
//                   written only when marks exist
// `replay` refuses when a frame's pixels changed, refines again and says whether
// each coordinate is bit-identical (`agrees`: within a micro-pixel, for another
// browser's Math.exp). Pure; async only for the digest.
// =============================================================================

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
      ['x', 'y'].forEach((a, j) =>
        pix(
          `${m.id}.${a}${single ? '' : i + 1}`,
          `${m.kind} ${m.id}${tag}: ${n}${a}, frame ${m.frame + 1}`,
          p[j],
          m.sigma,
          m.refined
        )
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
 * @param {{id: string, setId: string, frames: object[], state: object}} a
 */
export async function writeRecord({ id, setId, frames, state }) {
  // The envelope's module is the Fit panel's too: fetched when a record is made.
  const { artifact } = await import('../platform/artifact.js');
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
    quantities: quantitiesOf(state, frames, scaleOf(state)),
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

const finite = Number.isFinite;
const pos = v => Number.isInteger(v) && v > 0;
const HEX = /^[0-9a-f]{64}$/;
const pointList = p =>
  Array.isArray(p) &&
  p.length <= LIMITS.points &&
  p.every(q => Array.isArray(q) && q.length === 2 && q.every(finite));

/**
 * Whether a `workspace.marks` block is well formed: the paths that are not
 * (empty when it is). Data only: nothing here reads pixels.
 * @returns {string[]}
 */
export function validateMarks(b) {
  const out = [];
  const bad = path => out.push(path);
  if (b?.format !== MARKS_FORMAT || b.formatVersion !== MARKS_VERSION)
    return ['format'];
  if (
    !Array.isArray(b.frames) ||
    !b.frames.length ||
    b.frames.length > LIMITS.frames
  )
    return ['frames'];
  b.frames.forEach((f, k) => {
    const ok =
      HEX.test(f?.digest ?? '') &&
      pos(f.width) &&
      pos(f.height) &&
      (f.time === undefined || timeOf(f.time));
    if (!ok) bad(`frames[${k}]`);
  });
  if (!Array.isArray(b.marks) || b.marks.length > LIMITS.marks)
    return [...out, 'marks'];
  const ids = new Set();
  b.marks.forEach((m, i) => {
    const need = ARITY[m?.kind];
    const ok =
      need &&
      typeof m.id === 'string' &&
      m.id &&
      !ids.has(m.id) &&
      Number.isInteger(m.frame) &&
      b.frames[m.frame] &&
      typeof m.tag === 'string' &&
      m.tag.length <= 40 &&
      pointList(m.pts) &&
      (m.kind === 'polygon' ? m.pts.length >= 3 : m.pts.length === need) &&
      (m.length === undefined ||
        (m.length?.value > 0 &&
          finite(m.length.value) &&
          typeof m.length.unit === 'string')) &&
      (!m.result ||
        (pointList(m.result.pts) &&
          m.result.pts.length === m.pts.length &&
          finite(m.result.sigma)));
    if (!ok) bad(`marks[${i}]`);
    ids.add(m?.id);
  });
  return out;
}

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
      throw new ReplayError('invalid', `bad marks: ${problems[0]}`);
    red = record;
  } else {
    const { validateArtifact } = await import('../platform/artifact.js');
    const problems = validateArtifact(record);
    if (problems.length)
      throw new ReplayError('invalid', `bad envelope: ${problems[0].path}`);
    red = record.provenance.reductions.find(r => r.step === STEP);
    if (!red) throw new ReplayError('invalid', 'no image marks');
  }
  for (const [k, spec] of red.frames.entries()) {
    const f = frames[k];
    if (
      !f ||
      f.width !== spec.width ||
      f.height !== spec.height ||
      (await digestFrame(f)) !== spec.digest
    )
      throw new ReplayError('image-changed', `frame ${k + 1} changed`);
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
      const got = r.refined ? r.pts.flat() : null;
      const want = rec.result.pts.flat();
      if (
        !got ||
        !got.every((a, i) => Object.is(a, want[i])) ||
        !Object.is(r.sigma, rec.result.sigma)
      )
        differ.push(rec.id);
      if (!got || !got.every((a, i) => Math.abs(a - want[i]) <= 1e-6))
        agrees = false;
      state = {
        ...state,
        marks: state.marks.map(m => (m.id === rec.id ? r : m)),
      };
    }
  }
  return { state, identical: differ.length === 0, agrees, differ };
}
