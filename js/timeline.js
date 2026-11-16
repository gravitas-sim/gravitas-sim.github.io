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
//
// One clock: frames are stamped with the physics clock (getSimulationTime),
// a restore sets it, and getSimClock is that clock under its older name.
//
// Looking back: scrubTo, stepBack and stepForward park the world on a recorded
// frame and capture the full state once on the way out of live; Return to live
// puts it back and drops nothing; Replay plays the frames forward and ends
// there; Rewind to here makes the shown frame the world and drops what is after.
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
  galaxies,
  Planet,
  GasGiant,
  Asteroid,
  Comet,
  StarObject,
  BlackHole,
  NeutronStar,
  WhiteDwarf,
  Galaxy,
  PhysicsObject_id_counter,
  setPhysicsObjectCounter,
  syncReportedMass,
  getSimulationTime,
  setSimulationTime,
  bumpWorldGeneration,
} from './physics.js';
import { state, command } from './appState.js';

// The full-state capture a lesson's entry and exit use. Through the command
// bus, as js/share.js reaches it: the world module imports this one.
const captureShareState = command('captureShareState');

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
  'Galaxy',
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
  ['Galaxy', galaxies],
];

// A row holds numbers only; a galaxy's kind and name are kept by id for as long
// as the recording is (Blank Simulation does not reset it).
const galaxyIdentity = new Map();

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

let lastCaptureAt = -Infinity;
let recording = true;
let scrubbing = false;
let scrubOffset = 0; // 0 = newest recorded frame, up to frameCount-1 back
// The live moment, captured once on leaving it: { states, paused, clock }.
let held = null;
let replaying = false;
let replayClock = 0;

let ui = null;

/**
 * Reset all recorded history. Called whenever the simulation is rebuilt.
 */
export function resetTimeline() {
  frames.length = 0;
  frameTimes.length = 0;
  galaxyIdentity.clear();
  writeIndex = 0;
  frameCount = 0;
  lastCaptureAt = -Infinity;
  scrubbing = false;
  scrubOffset = 0;
  held = null;
  replaying = false;
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
      if (kind === 'Galaxy') {
        galaxyIdentity.set(o.id, { galaxyType: o.galaxyType, name: o.name });
      }
      i++;
    }
  }

  // A shorter view keeps restore loops honest about how many rows are real.
  frames[writeIndex] =
    row.length === n * STRIDE ? row : row.subarray(0, n * STRIDE);
  frameTimes[writeIndex] = getSimulationTime();

  writeIndex = (writeIndex + 1) % capacity;
  frameCount = Math.min(frameCount + 1, capacity);
}

/** Map a "frames back from live" offset onto a ring-buffer index. */
function indexForOffset(offset) {
  const clamped = Math.max(0, Math.min(frameCount - 1, offset));
  return (writeIndex - 1 - clamped + capacity * 2) % capacity;
}

/** Make a body of the given kind; the rest is written over it. */
function construct(kind, pos, vel, mass) {
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
    case 'Galaxy':
      return new Galaxy(pos, vel, mass);
    default:
      return null;
  }
}

/** Recorded bodies by id with their list (a transformed body keeps its list). */
function indexLive() {
  const byId = new Map();
  for (const [kind, list] of ALL_LISTS()) {
    for (const o of list) byId.set(o.id, { obj: o, kind });
  }
  return byId;
}

/** Swap in the rebuilt lists; true if any instance was added or dropped. */
function installLists(rebuilt, maxId) {
  let changed = false;
  for (const [kind, list] of ALL_LISTS()) {
    const next = rebuilt.get(kind) || [];
    if (next.length !== list.length || next.some((o, i) => o !== list[i])) {
      changed = true;
    }
    list.length = 0;
    for (const o of next) list.push(o);
  }
  // Debris is not in these lists: never below the live counter.
  setPhysicsObjectCounter(Math.max(PhysicsObject_id_counter, maxId + 1));
  return changed;
}

/** Restore the world to a recorded frame (offset 0 = newest). */
function restore(offset) {
  if (frameCount === 0) return;
  const idx = indexForOffset(offset);
  const row = frames[idx];
  if (!row) return;

  // Reuse live instances where possible (names, disks).
  const existing = indexLive();

  const rebuilt = new Map(KINDS.map(k => [k, []]));
  let maxId = 0;

  for (let b = 0; b < row.length; b += STRIDE) {
    const kind = KINDS[row[b + F_KIND]];
    if (!kind) continue;
    const id = row[b + F_ID];
    maxId = Math.max(maxId, id);

    let obj = existing.get(id)?.obj;
    if (!obj) {
      obj = construct(
        kind,
        { x: row[b + F_X], y: row[b + F_Y] },
        { x: row[b + F_VX], y: row[b + F_VY] },
        row[b + F_MASS]
      );
      if (!obj) continue;
      // set_state: a galaxy's drawing is turned by its id.
      if (kind === 'Galaxy') obj.set_state({ id, ...galaxyIdentity.get(id) });
      else obj.id = id;
    }

    obj.pos.x = row[b + F_X];
    obj.pos.y = row[b + F_Y];
    obj.vel.x = row[b + F_VX];
    obj.vel.y = row[b + F_VY];
    obj.mass = row[b + F_MASS];
    // The reported mass follows the recorded one (rewinding past a merger).
    syncReportedMass(obj);
    obj.radius = row[b + F_RADIUS];
    obj.alive = row[b + F_ALIVE] !== 0;
    if (typeof obj.updateRadius === 'function' && kind === 'BlackHole') {
      obj.updateRadius();
    }
    // No straight trail line across the jump.
    if (Array.isArray(obj.trail)) obj.trail.length = 0;

    rebuilt.get(kind).push(obj);
  }

  if (installLists(rebuilt, maxId)) bumpWorldGeneration();
  setSimulationTime(frameTimes[idx] ?? getSimulationTime());
}

/**
 * Put the held live moment back, in place. applyShareState would rebuild the
 * world, and its reset empties this recording and the armed event watch.
 * Instances are reused by id; a body the scrub dropped is made again.
 */
function restoreHeld() {
  const live = indexLive();
  const rebuilt = new Map(KINDS.map(k => [k, []]));
  let maxId = 0;
  // set_state keeps the objects it is given; held is used once, then dropped.
  for (const s of held.states) {
    const hit = live.get(s.id);
    const kind = hit?.kind ?? s.type;
    const obj = hit?.obj ?? construct(kind, s.pos, s.vel, s.mass);
    if (!obj) continue;
    obj.set_state(s);
    obj.alive = true;
    maxId = Math.max(maxId, obj.id ?? 0);
    rebuilt.get(kind)?.push(obj);
  }
  if (installLists(rebuilt, maxId)) bumpWorldGeneration();
  setSimulationTime(held.clock);
}

/** Capture the live moment once, on the way into history. */
function leaveLive() {
  if (scrubbing) return;
  const payload = captureShareState({
    kind: 'full',
    includeCamera: false,
    // Ids keep a selection or followed body on the same object.
    forExperiment: true,
  });
  held = {
    states: payload.b ?? [],
    paused: state.paused,
    clock: getSimulationTime(),
  };
  scrubbing = true;
}

/** The pause Return to live resumes with, when a lesson step sets it while parked. */
export const setParkedPause = paused => held && (held.paused = paused);

/** Leave history for live, with nothing held. */
function endHistory() {
  state.paused = held.paused;
  scrubbing = false;
  replaying = false;
  scrubOffset = 0;
  held = null;
  lastCaptureAt = -Infinity;
  syncUI();
}

/**
 * Once per frame, before physics.
 * @param {number} dtSim - Simulated time this frame advances by
 * @returns {boolean} True if physics should run
 */
export function tickTimeline(dtSim) {
  if (replaying) {
    advanceReplay(dtSim);
    return false;
  }
  if (scrubbing) return false; // frozen on a recorded frame

  if (!state.paused && recording) {
    const now = performance.now();
    if (now - lastCaptureAt >= CAPTURE_INTERVAL_MS) {
      lastCaptureAt = now;
      capture();
      syncUI();
    }
  }
  syncClock();
  return true;
}

/** Repaint the clock label: before and after the step, so it matches the readout. */
export function syncClock() {
  ui?.onClock?.(getSimulationTime());
}

/** @returns {boolean} True while the view is parked on a recorded frame */
export function isScrubbing() {
  return scrubbing;
}

/** @returns {boolean} True while Replay is playing the frames forward */
export function isReplaying() {
  return replaying;
}

/** The physics clock, under its older name. */
export function getSimClock() {
  return getSimulationTime();
}

/** @returns {number} How many frames are currently recorded */
export function getFrameCount() {
  return frameCount;
}

/** Record a frame now (a paused step does). */
export function recordFrame() {
  if (scrubbing) return;
  capture();
  syncUI();
}

/** Ready the recording for a paused step; false when running or looking back. */
export function beginStep() {
  if (!state.paused || scrubbing) return false;
  if (frameCount === 0) capture();
  return true;
}

/** Hold on a recorded frame; leaving live captures the full state once. */
export function scrubTo(offset) {
  if (frameCount === 0) return;
  leaveLive();
  replaying = false;
  scrubOffset = Math.max(0, Math.min(frameCount - 1, offset));
  restore(scrubOffset);
  syncUI();
}

/** One recorded frame back (from live, one frame back, as it always was). */
export function stepBack() {
  scrubTo(scrubOffset + 1);
}

/** One recorded frame forward; past the newest it is Return to live. */
export function stepForward() {
  if (!scrubbing) return;
  if (scrubOffset > 0) scrubTo(scrubOffset - 1);
  else returnToLive();
}

/** Back to the held live moment, clock and pause state; nothing is dropped. */
export function returnToLive() {
  if (!scrubbing) return;
  restoreHeld();
  endHistory();
}

/** The shown frame becomes the world; later frames are dropped. */
export function rewindToHere() {
  if (!scrubbing) return;
  if (scrubOffset > 0) {
    frameCount = Math.max(1, frameCount - scrubOffset);
    writeIndex = (indexForOffset(scrubOffset) + 1) % capacity;
  }
  endHistory();
}

/** Play the frames forward at the current speed to the live moment. */
export function startReplay() {
  if (frameCount < 2) return false;
  if (!scrubbing) scrubTo(frameCount - 1);
  replaying = true;
  replayClock = getSimulationTime();
  syncUI();
  return true;
}

function advanceReplay(dtSim) {
  replayClock += dtSim;
  if (replayClock >= held.clock) {
    returnToLive();
    return;
  }
  let off = scrubOffset;
  while (
    off > 0 &&
    (frameTimes[indexForOffset(off - 1)] ?? Infinity) <= replayClock
  ) {
    off--;
  }
  if (off !== scrubOffset) {
    scrubOffset = off;
    restore(off);
    syncUI();
  }
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
    simClock: getSimulationTime(),
    behind: scrubbing ? Math.max(0, held.clock - getSimulationTime()) : 0,
    span:
      frameCount > 1
        ? Math.abs(
            (frameTimes[indexForOffset(0)] ?? 0) -
              (frameTimes[indexForOffset(frameCount - 1)] ?? 0)
          )
        : 0,
  });
}

/**
 * Walk every recorded frame, oldest first, one decoded frame per call (the CSV
 * export reads all of it; materialising the whole history is needless garbage).
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
