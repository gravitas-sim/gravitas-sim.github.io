// =============================================================================
// Timeline. Record, scrub and replay the simulation
// -----------------------------------------------------------------------------
// The simulation is deterministic forward but not reversible (mergers and
// absorptions destroy information), so rewinding means replaying recorded
// state rather than integrating backwards.
//
// State is kept in a ring buffer of flat Float64Arrays: one row per object,
// nine columns, because allocating an object literal per body per snapshot at
// 10 Hz produces enough garbage to show up as frame stutter.
// =============================================================================

import {
  bh_list,
  planets,
  stars,
  gas_giants,
  asteroids,
  comets,
  neutron_stars,
  white_dwarfs,
  Planet,
  GasGiant,
  Asteroid,
  Comet,
  StarObject,
  BlackHole,
  NeutronStar,
  WhiteDwarf,
  setPhysicsObjectCounter,
} from './physics.js';
import { state } from './ui.js';
import { debugLog } from './utils.js';

// --- Layout of one object row -------------------------------------------------
const STRIDE = 9;
const F_ID = 0;
const F_KIND = 1;
const F_X = 2;
const F_Y = 3;
const F_VX = 4;
const F_VY = 5;
const F_MASS = 6;
const F_RADIUS = 7;
const F_ALIVE = 8;

// Kind codes. Order is persisted inside recorded frames, so only ever append.
const KINDS = [
  'BlackHole',
  'Planet',
  'StarObject',
  'GasGiant',
  'Asteroid',
  'Comet',
  'NeutronStar',
  'WhiteDwarf',
];

const ALL_LISTS = () => [
  ['BlackHole', bh_list],
  ['Planet', planets],
  ['StarObject', stars],
  ['GasGiant', gas_giants],
  ['Asteroid', asteroids],
  ['Comet', comets],
  ['NeutronStar', neutron_stars],
  ['WhiteDwarf', white_dwarfs],
];

// --- Capture budget -----------------------------------------------------------
// Roughly 24 MB of Float64 at the ceiling. Dense scenarios record fewer frames
// rather than eating unbounded memory.
const MAX_VALUES = 3_000_000;
const MAX_FRAMES = 900;
const MIN_FRAMES = 60;
const CAPTURE_INTERVAL_MS = 100;

const frames = []; // ring buffer of Float64Array
const frameTimes = []; // simulated seconds at capture
let writeIndex = 0;
let frameCount = 0;
let capacity = MAX_FRAMES;

let simClock = 0;
let lastCaptureAt = -Infinity;
let recording = true;
let scrubbing = false;
let scrubOffset = 0; // 0 = live, 1..frameCount-1 = frames back from live

let ui = null;

/**
 * Reset all recorded history. Called whenever the simulation is rebuilt.
 */
export function resetTimeline() {
  frames.length = 0;
  frameTimes.length = 0;
  writeIndex = 0;
  frameCount = 0;
  simClock = 0;
  lastCaptureAt = -Infinity;
  scrubbing = false;
  scrubOffset = 0;
  capacity = MAX_FRAMES;
  syncUI();
}

function objectCount() {
  let n = 0;
  for (const [, list] of ALL_LISTS()) n += list.length;
  return n;
}

/**
 * Recompute how many frames we can afford at the current object count.
 */
function updateCapacity(nObjects) {
  const perFrame = Math.max(1, nObjects * STRIDE);
  const affordable = Math.floor(MAX_VALUES / perFrame);
  capacity = Math.max(MIN_FRAMES, Math.min(MAX_FRAMES, affordable));
  while (frames.length > capacity) {
    frames.pop();
    frameTimes.pop();
  }
  if (writeIndex >= capacity) writeIndex = 0;
  if (frameCount > capacity) frameCount = capacity;
}

/**
 * Capture the current simulation state into the ring buffer.
 */
function capture() {
  const n = objectCount();
  updateCapacity(n);

  let row = frames[writeIndex];
  if (!row || row.length < n * STRIDE) {
    row = new Float64Array(n * STRIDE);
  }

  let i = 0;
  for (const [kind, list] of ALL_LISTS()) {
    const kindCode = KINDS.indexOf(kind);
    for (const o of list) {
      const b = i * STRIDE;
      row[b + F_ID] = o.id;
      row[b + F_KIND] = kindCode;
      row[b + F_X] = o.pos.x;
      row[b + F_Y] = o.pos.y;
      row[b + F_VX] = o.vel.x;
      row[b + F_VY] = o.vel.y;
      row[b + F_MASS] = o.mass;
      row[b + F_RADIUS] = o.radius;
      row[b + F_ALIVE] = o.alive === false ? 0 : 1;
      i++;
    }
  }

  // A shorter view keeps restore loops honest about how many rows are real.
  frames[writeIndex] =
    row.length === n * STRIDE ? row : row.subarray(0, n * STRIDE);
  frameTimes[writeIndex] = simClock;

  writeIndex = (writeIndex + 1) % capacity;
  frameCount = Math.min(frameCount + 1, capacity);
}

/** Map a "frames back from live" offset onto a ring-buffer index. */
function indexForOffset(offset) {
  const clamped = Math.max(0, Math.min(frameCount - 1, offset));
  return (writeIndex - 1 - clamped + capacity * 2) % capacity;
}

/**
 * Rebuild an object of the given kind from a recorded row.
 * Objects destroyed since capture have to be reconstructed, so their
 * constructors are invoked with a neutral position and then overwritten.
 */
function construct(kind, row, base) {
  const pos = { x: row[base + F_X], y: row[base + F_Y] };
  const vel = { x: row[base + F_VX], y: row[base + F_VY] };
  const mass = row[base + F_MASS];
  switch (kind) {
    case 'BlackHole':
      return new BlackHole(pos, mass, vel, false);
    case 'Planet':
      return new Planet(pos, vel);
    case 'StarObject':
      return new StarObject(pos, vel);
    case 'GasGiant':
      return new GasGiant(pos, vel);
    case 'Asteroid':
      return new Asteroid(pos, vel);
    case 'Comet':
      return new Comet(pos, vel);
    case 'NeutronStar':
      return new NeutronStar(pos, vel, null, null);
    case 'WhiteDwarf':
      return new WhiteDwarf(pos, vel);
    default:
      return null;
  }
}

/**
 * Restore the simulation to a recorded frame.
 * @param {number} offset - Frames back from live (0 = most recent)
 */
function restore(offset) {
  if (frameCount === 0) return;
  const idx = indexForOffset(offset);
  const row = frames[idx];
  if (!row) return;

  // Index everything currently alive so restoring reuses instances where it
  // can: preserving trails, disks and names rather than rebuilding them.
  const existing = new Map();
  for (const [, list] of ALL_LISTS()) {
    for (const o of list) existing.set(o.id, o);
  }

  const rebuilt = new Map(KINDS.map(k => [k, []]));
  let maxId = 0;

  for (let b = 0; b < row.length; b += STRIDE) {
    const kind = KINDS[row[b + F_KIND]];
    if (!kind) continue;
    const id = row[b + F_ID];
    maxId = Math.max(maxId, id);

    let obj = existing.get(id);
    if (!obj) {
      obj = construct(kind, row, b);
      if (!obj) continue;
      obj.id = id;
    }

    obj.pos.x = row[b + F_X];
    obj.pos.y = row[b + F_Y];
    obj.vel.x = row[b + F_VX];
    obj.vel.y = row[b + F_VY];
    obj.mass = row[b + F_MASS];
    obj.radius = row[b + F_RADIUS];
    obj.alive = row[b + F_ALIVE] !== 0;
    if (typeof obj.updateRadius === 'function' && kind === 'BlackHole') {
      obj.updateRadius();
    }
    // Trails would otherwise draw a straight line from where the object was
    // to where it has jumped back to.
    if (Array.isArray(obj.trail)) obj.trail.length = 0;

    rebuilt.get(kind).push(obj);
  }

  for (const [kind, list] of ALL_LISTS()) {
    const next = rebuilt.get(kind) || [];
    list.length = 0;
    for (const o of next) list.push(o);
    void kind;
  }

  setPhysicsObjectCounter(maxId + 1);
  simClock = frameTimes[idx] ?? simClock;
}

/**
 * Advance the timeline. Called once per frame from the render loop, before
 * physics when scrubbing (so the restored frame is what gets drawn).
 * @param {number} dtSim - Simulated seconds elapsed this frame
 * @returns {boolean} True if physics should run this frame
 */
export function tickTimeline(dtSim) {
  if (scrubbing) return false; // frozen on a recorded frame

  if (!state.paused) simClock += dtSim;

  if (recording && !state.paused) {
    const now = performance.now();
    if (now - lastCaptureAt >= CAPTURE_INTERVAL_MS) {
      lastCaptureAt = now;
      capture();
      syncUI();
    }
  }
  return true;
}

/** @returns {boolean} True while the view is parked on a recorded frame */
export function isScrubbing() {
  return scrubbing;
}

/** @returns {number} Simulated seconds at the currently displayed frame */
export function getSimClock() {
  return simClock;
}

/** @returns {number} How many frames are currently recorded */
export function getFrameCount() {
  return frameCount;
}

/**
 * Jump to a recorded frame and hold there.
 * @param {number} offset - Frames back from live (0 = most recent)
 */
export function scrubTo(offset) {
  if (frameCount === 0) return;
  scrubbing = true;
  scrubOffset = Math.max(0, Math.min(frameCount - 1, offset));
  restore(scrubOffset);
  syncUI();
}

/** Step one recorded frame backwards. */
export function stepBack() {
  scrubTo(scrubOffset + 1);
}

/** Step one recorded frame forwards, resuming live at the end. */
export function stepForward() {
  if (scrubOffset <= 0) {
    resumeLive();
    return;
  }
  scrubTo(scrubOffset - 1);
}

/**
 * Leave scrub mode. Recording continues from the restored state, so the
 * frames that were ahead of the playhead are discarded: the same way an
 * edit after an undo drops the redo stack.
 */
export function resumeLive() {
  if (!scrubbing) return;
  if (scrubOffset > 0) {
    frameCount = Math.max(1, frameCount - scrubOffset);
    writeIndex = (indexForOffset(scrubOffset) + 1) % capacity;
  }
  scrubbing = false;
  scrubOffset = 0;
  lastCaptureAt = -Infinity;
  syncUI();
}

/** Toggle between paused-on-a-frame and running live. */
export function toggleScrub() {
  if (scrubbing) resumeLive();
  else scrubTo(0);
}

/** Register the transport bar so the module can keep it in sync. */
export function bindTimelineUI(handlers) {
  ui = handlers;
  syncUI();
}

function syncUI() {
  if (!ui || typeof ui.onChange !== 'function') return;
  ui.onChange({
    frameCount,
    offset: scrubOffset,
    scrubbing,
    simClock,
    // Seconds of history available, for the scrubber's left-hand label
    span:
      frameCount > 1
        ? Math.abs(
            (frameTimes[indexForOffset(0)] ?? 0) -
              (frameTimes[indexForOffset(frameCount - 1)] ?? 0)
          )
        : 0,
  });
}

/** @returns {{frames:number, bytes:number}} Recording memory footprint */
/**
 * Walk every recorded frame, oldest first.
 *
 * The ring buffer is the only record of where things have been, and the CSV
 * export is the one caller that needs all of it rather than one frame at a
 * time. It is handed one decoded frame per call rather than the whole history
 * as an array: a dense scenario holds nine hundred frames of a hundred bodies,
 * and materialising ninety thousand object literals to write a file that is
 * consumed line by line is a lot of garbage for no gain.
 *
 * @param {Function} visit - Called as visit(simSeconds, bodies) per frame
 */
export function forEachRecordedFrame(visit) {
  for (let back = frameCount - 1; back >= 0; back--) {
    const idx = indexForOffset(back);
    const row = frames[idx];
    if (!row) continue;
    const bodies = [];
    for (let b = 0; b < row.length; b += STRIDE) {
      bodies.push({
        id: row[b + F_ID],
        kind: KINDS[row[b + F_KIND]] ?? 'Unknown',
        x: row[b + F_X],
        y: row[b + F_Y],
        vx: row[b + F_VX],
        vy: row[b + F_VY],
        mass: row[b + F_MASS],
        radius: row[b + F_RADIUS],
        alive: row[b + F_ALIVE] !== 0,
      });
    }
    visit(frameTimes[idx], bodies);
  }
}

/**
 * The whole recorded history as an array. Convenience over
 * forEachRecordedFrame for tests and small scenarios.
 * @returns {Array<{t:number, bodies:Array}>} Frames, oldest first
 */
export function recordedFrames() {
  const out = [];
  forEachRecordedFrame((t, bodies) => out.push({ t, bodies }));
  return out;
}

/**
 * How much history there is to export, without decoding any of it.
 * @returns {{frames:number, bodies:number, simTime:number}} Frame count, rows
 *   in the most recent frame, and the span covered in simulation time units
 */
export function recordedExtent() {
  if (frameCount === 0) return { frames: 0, bodies: 0, simTime: 0 };
  const newest = frames[indexForOffset(0)];
  const oldestT = frameTimes[indexForOffset(frameCount - 1)] ?? 0;
  const newestT = frameTimes[indexForOffset(0)] ?? 0;
  return {
    frames: frameCount,
    bodies: newest ? newest.length / STRIDE : 0,
    simTime: Math.max(0, newestT - oldestT),
  };
}

export function getTimelineStats() {
  let bytes = 0;
  for (const f of frames) if (f) bytes += f.byteLength;
  debugLog('timeline frames', frames.length, 'bytes', bytes);
  return { frames: frameCount, bytes };
}
