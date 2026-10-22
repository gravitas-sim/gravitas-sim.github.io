// =============================================================================
// Marks: the model, its operations and undo (Prompt 179)
// -----------------------------------------------------------------------------
// Ported from the gate's accepted prototype (IMAGE_MEASUREMENT_GATE.md, D-R10-48).
// Pure and isomorphic. A mark is {id, kind, frame, tag, pts, sigma, refined, ...}:
// a point and a count have one control point, a segment, a reference pair and a
// circle (centre, then a point on the limb) two, a polygon three or more. The
// coordinates are FITS's (1 is the centre of the first pixel, y up), in the full
// resolution of the frame whatever size it is drawn at. A state is immutable and
// every operation returns the next one, so undo is a list of states and a
// refusal (or any operation that changes nothing) is not a step.
// =============================================================================

import { refineMark } from './refine.js';

export const ARITY = {
  point: 1,
  count: 1,
  segment: 2,
  'reference-pair': 2,
  circle: 2,
  polygon: 3,
};
/** The standard uncertainty of a hand placement: a one-pixel step is uniform. */
export const PLACE_SIGMA = 1 / Math.sqrt(12);

// ---- marks and the store ---------------------------------------------------

export const emptyState = () => ({ marks: [], nextId: 1 });
const replaceMark = (s, id, fn) => ({
  ...s,
  marks: s.marks.map(m => (m.id === id ? fn(m) : m)),
});

/** A new mark. Polygons take any number of points of three or more. */
export function place(state, { kind, frame = 0, tag = '', pts, length }) {
  if (!ARITY[kind]) throw new Error(`unknown mark kind ${kind}`);
  if (kind === 'polygon' ? pts.length < 3 : pts.length !== ARITY[kind])
    throw new Error(`${kind} needs ${ARITY[kind]} points`);
  const mark = {
    id: `m${state.nextId}`,
    kind,
    frame,
    tag,
    pts: pts.map(p => [p[0], p[1]]),
    sigma: PLACE_SIGMA,
    refined: false,
    ...(length ? { length } : {}),
  };
  return { ...state, nextId: state.nextId + 1, marks: [...state.marks, mark] };
}

/** Move one control point by (dx, dy): a nudge. */
export const nudge = (state, id, handle, dx, dy) =>
  replaceMark(state, id, m => ({
    ...m,
    refined: false,
    sigma: PLACE_SIGMA,
    pts: m.pts.map((p, i) => (i === handle ? [p[0] + dx, p[1] + dy] : p)),
  }));

/** Set control point coordinates and/or the tag, as the table's cells do. */
export const edit = (state, id, { tag, handle = 0, x, y, length }) =>
  replaceMark(state, id, m => ({
    ...m,
    ...(tag !== undefined ? { tag } : {}),
    ...(length !== undefined ? { length } : {}),
    ...(x !== undefined || y !== undefined
      ? {
          refined: false,
          sigma: PLACE_SIGMA,
          pts: m.pts.map((p, i) => (i === handle ? [x ?? p[0], y ?? p[1]] : p)),
        }
      : {}),
  }));

export const remove = (state, id) => ({
  ...state,
  marks: state.marks.filter(m => m.id !== id),
});

/** Refine one mark on its frame; the refusal, if there is one, leaves the state as it was. */
export function refine(state, id, frames) {
  const mark = state.marks.find(m => m.id === id);
  const r = refineMark(mark, frames[mark.frame]);
  if (!r.ok) return { state, result: r };
  return {
    state: replaceMark(state, id, m => ({
      ...m,
      pts: r.pts,
      sigma: r.sigma,
      ...(r.sigmaR !== undefined ? { sigmaR: r.sigmaR } : {}),
      refined: true,
      placed: m.pts,
    })),
    result: r,
  };
}

/** Copy a mark to the next frame at the same place, under the same tag. */
export function copyForward(state, id, to) {
  const m = state.marks.find(k => k.id === id);
  return place(state, {
    kind: m.kind,
    frame: to,
    tag: m.tag,
    pts: m.pts,
    length: m.length,
  });
}

/** Marks of a frame; the tags with a mark in an earlier frame and none in this one. */
export const marksOf = (state, frame) =>
  state.marks.filter(m => m.frame === frame);
export function missingTags(state, frame) {
  const here = new Set(
    marksOf(state, frame)
      .map(m => m.tag)
      .filter(Boolean)
  );
  return [
    ...new Set(
      state.marks.filter(m => m.frame < frame && m.tag).map(m => m.tag)
    ),
  ].filter(t => !here.has(t));
}

/** Undo and redo as lists of states, and runs of nudges that count as one step. */
export function createStore(initial = emptyState()) {
  let present = initial;
  const past = [];
  let future = [];
  let key = null;
  const listeners = new Set();
  const emit = why => listeners.forEach(l => l(present, why));
  return {
    get state() {
      return present;
    },
    apply(next, runKey = null) {
      if (next === present) return;
      if (!(runKey && runKey === key)) past.push(present);
      key = runKey;
      present = next;
      future = [];
      emit('apply');
    },
    seal() {
      key = null;
    },
    undo() {
      if (!past.length) return false;
      future.push(present);
      present = past.pop();
      key = null;
      emit('undo');
      return true;
    },
    redo() {
      if (!future.length) return false;
      past.push(present);
      present = future.pop();
      key = null;
      emit('redo');
      return true;
    },
    get depth() {
      return { past: past.length, future: future.length };
    },
    subscribe(l) {
      listeners.add(l);
      return () => listeners.delete(l);
    },
  };
}
