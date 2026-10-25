// =============================================================================
// The ledger bridge: marks, scale, frame time and image identity as one record
// (Prompt 178 prototype; spike code, imported by no page)
// -----------------------------------------------------------------------------
// One gravitas.artifact/1 envelope (js/platform/artifact.js, Prompt 150): every
// coordinate a quantity with an uncertainty of Prompt 150's kinds, the scale and
// each frame's time beside them, the image's identity a SHA-256 of its pixels,
// and in the provenance the marks as placed so that the refinement can be run
// again on the same pixels (replay).
// =============================================================================

import { artifact, validateArtifact } from '../../js/platform/artifact.js';
import { sha256Hex } from '../../js/hash.js';
import {
  PLACE_SIGMA,
  REFINE_VERSION,
  emptyState,
  refine,
  scaleOf,
} from './marks.js';

const pixelLength = m =>
  Math.hypot(m.pts[1][0] - m.pts[0][0], m.pts[1][1] - m.pts[0][1]);

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
function quantitiesOf(state, frames, sidecar) {
  const q = [];
  const pix = (id, label, value, sigma, refined) =>
    q.push({
      id,
      label,
      value,
      unit: 'pix',
      origin: 'measured',
      uncertainty: sigmaQ(sigma, refined),
    });
  for (const m of state.marks) {
    const tag = m.tag ? ` (${m.tag})` : '';
    const names =
      m.kind === 'circle'
        ? ['centre x', 'centre y']
        : m.pts.length === 1
          ? ['x', 'y']
          : null;
    m.pts.forEach((p, i) => {
      const nm = names ? names[0] : `x${i + 1}`;
      const ny = names ? names[1] : `y${i + 1}`;
      if (m.kind === 'circle' && i === 1) return;
      pix(
        `${m.id}.${names ? 'x' : `x${i + 1}`}`,
        `${m.kind} ${m.id}${tag}: ${nm}, frame ${m.frame + 1}`,
        p[0],
        m.sigma,
        m.refined
      );
      pix(
        `${m.id}.${names ? 'y' : `y${i + 1}`}`,
        `${m.kind} ${m.id}${tag}: ${ny}, frame ${m.frame + 1}`,
        p[1],
        m.sigma,
        m.refined
      );
    });
    if (m.kind === 'circle')
      pix(
        `${m.id}.r`,
        `circle ${m.id}${tag}: radius, frame ${m.frame + 1}`,
        pixelLength(m),
        m.sigmaR ?? m.sigma,
        m.refined
      );
  }
  const sc = scaleOf(state, sidecar);
  if (sc && sc.source !== 'sidecar') {
    q.push({
      id: 'scale.length',
      label: 'known length of the reference pair',
      value: sidecar.knownLength.value,
      unit: sidecar.knownLength.unit,
      origin: 'assumed',
      uncertainty: { kind: 'assumed' },
    });
    pix(
      'scale.pixels',
      'length of the reference pair',
      sc.pixels,
      sc.pixelSigma,
      false
    );
    q.push({
      id: 'scale',
      label: `scale, ${sc.unit}`,
      value: sc.value,
      unit: null,
      origin: 'derived',
      uncertainty: { kind: 'sigma', sigma: sc.sigma, basis: 'derived' },
    });
  }
  frames.forEach((f, k) => {
    if (f.time)
      q.push({
        id: `frame${k + 1}.time`,
        label: `time of frame ${k + 1} (${f.time.scale})`,
        value: f.time.value,
        unit: 'd',
        origin: 'assumed',
        uncertainty: { kind: 'assumed' },
      });
  });
  return q;
}

/**
 * One gravitas.artifact/1 envelope with replay: the marks as quantities, the
 * scale, each frame's time and the image's identity (a SHA-256 of its pixels),
 * and in the provenance the marks as placed so that the refinement can be run
 * again on the same pixels.
 */
export async function writeRecord({ id, setId, frames, sidecar = {}, state }) {
  const digests = await Promise.all(frames.map(digestFrame));
  const used = [...new Set(state.marks.map(m => m.frame))];
  return artifact({
    id,
    source: {
      kind: 'observation',
      id: setId,
      digest: (await sha256Hex(digests.join(''))).slice(0, 64),
    },
    quantities: quantitiesOf(state, frames, sidecar),
    provenance: {
      reductions: [
        {
          step: 'image-marks',
          version: 1,
          refine: REFINE_VERSION,
          frames: frames.map((f, k) => ({
            id: f.id,
            width: f.width,
            height: f.height,
            digest: digests[k],
            ...(f.time ? { time: f.time } : {}),
            used: used.includes(k),
          })),
          knownLength: sidecar.knownLength ?? null,
          marks: state.marks.map(m => ({
            ...m,
            pts: m.refined ? m.placed : m.pts,
            result: m.refined
              ? { pts: m.pts, sigma: m.sigma, sigmaR: m.sigmaR ?? null }
              : null,
          })),
        },
      ],
    },
    made: { app: 'gravitas', prototype: 'image-measure-gate' },
  });
}

export class ReplayError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

/**
 * Reopen a record against the frames it was made on: refuse if a frame's pixels
 * changed, rebuild the marks as placed, refine again, and say whether every
 * refined coordinate is bit-identical to the one the record holds.
 */
export async function replay(record, frames) {
  const problems = validateArtifact(record);
  if (problems.length)
    throw new ReplayError(
      'invalid',
      `the record is not an envelope: ${problems[0].path} ${problems[0].message}`
    );
  const red = record.provenance.reductions.find(r => r.step === 'image-marks');
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
      const same =
        r.refined &&
        r.pts.every(
          (p, i) =>
            Object.is(p[0], rec.result.pts[i][0]) &&
            Object.is(p[1], rec.result.pts[i][1])
        ) &&
        Object.is(r.sigma, rec.result.sigma);
      if (!same) differ.push(rec.id);
      state = {
        ...state,
        marks: state.marks.map(m => (m.id === rec.id ? r : m)),
      };
    }
  }
  return { state, identical: differ.length === 0, differ };
}
