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
// One clock. Every recorded frame is stamped with the physics clock
// (getSimulationTime), restoring a frame sets that clock, and getSimClock is
// that clock under its older name. The module used to sum its own copy of the
// elapsed time, which agreed with the physics clock to the last digit and was
// repainted on a different schedule (a capture, every 100 ms, and never while
// paused), so the label beside the scrubber read up to 100 ms behind the
// Elapsed readout. There is no second quantity to drift now.
//
// Three ways to look back, named for what they do to the world:
//   - parked: scrubTo, stepBack, stepForward hold the world on a recorded
//     frame. Leaving live captures the full state once (the same capture a
//     lesson's entry and exit use), so nothing is lost by looking.
//   - Replay plays the recorded frames forward at the current speed and
//     ends in the held live state; Escape or Pause ends it the same way.
//   - Rewind to here is the one destructive action: the shown frame becomes
//     the world and the later history is dropped.
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

// A row holds numbers only, and a galaxy's kind and name are not numbers. A
// galaxy rebuilt from a row - after Blank Simulation, which does not reset the
// recording - would otherwise come back a spiral with a new name, and Coma
// Cluster would lose the six ellipticals it puts at its center. Kept by id for
// as long as the recording is.
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
// null while live. `states` are packed bodies with ids, as a full capture
// carries them (twelve significant figures).
let held = null;
let replaying = false;
let replayClock = 0; // simulated time the replay has reached

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

/**
 * Rebuild an object of the given kind.
 * Objects destroyed since capture have to be reconstructed, so their
 * constructors are invoked with the position, velocity and mass the record
 * holds and the rest is written over them.
 */
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

/**
 * Every recorded body by id, with the list it is in. A transformed body keeps
 * the obj_type of what it became in the class of what it was, so the list is
 * what says where it goes back, not its type.
 */
function indexLive() {
  const byId = new Map();
  for (const [kind, list] of ALL_LISTS()) {
    for (const o of list) byId.set(o.id, { obj: o, kind });
  }
  return byId;
}

/**
 * Replace the recorded kinds' lists with the rebuilt ones.
 * @returns {boolean} True if any body was added or dropped (the instances
 *   in the lists are no longer the ones the physics caches may hold)
 */
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
  setPhysicsObjectCounter(maxId + 1);
  return changed;
}

/**
 * Restore the simulation to a recorded frame.
 * @param {number} offset - Frames back from newest (0 = most recent)
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
      obj = construct(
        kind,
        { x: row[b + F_X], y: row[b + F_Y] },
        { x: row[b + F_VX], y: row[b + F_VY] },
        row[b + F_MASS]
      );
      if (!obj) continue;
      // set_state, not a bare id: a galaxy's drawing is turned by its id, and
      // this also gives back the kind and name the row could not hold.
      if (kind === 'Galaxy') obj.set_state({ id, ...galaxyIdentity.get(id) });
      else obj.id = id;
    }

    obj.pos.x = row[b + F_X];
    obj.pos.y = row[b + F_Y];
    obj.vel.x = row[b + F_VX];
    obj.vel.y = row[b + F_VY];
    obj.mass = row[b + F_MASS];
    // A scrub writes the recorded mass straight onto the body, so the mass the
    // class reports has to be recomputed from it. Without this, rewinding past
    // a merger or a collision left the inspector describing the body's mass
    // before the event and gravity using the mass after it.
    syncReportedMass(obj);
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

  installLists(rebuilt, maxId);
  // The one clock: a restored frame is a moment, and the moment is the time.
  setSimulationTime(frameTimes[idx] ?? getSimulationTime());
}

/**
 * Put the held live moment back: every body from the full capture taken when
 * history was entered, the clock, and nothing else touched.
 *
 * In place, not a rebuild. applyShareState re-initializes the world, and the
 * reset it fires would empty this recording, the armed event watch and the
 * placement undo stack: the very things Return to live must not drop. Instances
 * are reused by id so a selection, a followed body or an open inspector keeps
 * pointing at the same object; a body the scrub dropped is made again and
 * given its state by set_state, as a share link's bodies are.
 */
function restoreHeld() {
  if (!held) return;
  const live = indexLive();
  const rebuilt = new Map(KINDS.map(k => [k, []]));
  let maxId = 0;
  // set_state keeps the objects it is given, so a restore takes its own copy
  // and the held capture stays what was captured.
  const states = JSON.parse(JSON.stringify(held.states));
  for (const s of states) {
    if (!s || !s.pos || !s.vel) continue;
    const hit = Number.isFinite(s.id) ? live.get(s.id) : null;
    let obj = hit?.obj ?? null;
    const kind = hit?.kind ?? s.type;
    if (!rebuilt.has(kind)) continue;
    if (!obj) {
      obj = construct(kind, s.pos, s.vel, s.mass);
      if (!obj) continue;
    }
    obj.set_state(s);
    obj.alive = true;
    maxId = Math.max(maxId, obj.id ?? 0);
    rebuilt.get(kind).push(obj);
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
    // For the ids, which keep a selection and a followed body pointing at the
    // same object after the restore.
    forExperiment: true,
  });
  held = {
    states: payload.b ?? [],
    paused: state.paused,
    clock: getSimulationTime(),
  };
  scrubbing = true;
}

/** Leave history for live, with nothing held. */
function endHistory() {
  scrubbing = false;
  replaying = false;
  scrubOffset = 0;
  held = null;
  lastCaptureAt = -Infinity;
  syncUI();
}

/**
 * Advance the timeline. Called once per frame from the render loop, before
 * physics when scrubbing (so the restored frame is what gets drawn).
 * @param {number} dtSim - Simulated time elapsed this frame
 * @returns {boolean} True if physics should run this frame
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

/**
 * Repaint the clock label now. The label follows the clock, not the next
 * capture; called before the physics step each frame and again after it, so
 * the label and the Elapsed readout painted later in the frame agree.
 */
export function syncClock() {
  if (ui && typeof ui.onClock === 'function') ui.onClock(getSimulationTime());
}

/** @returns {boolean} True while the view is parked on a recorded frame */
export function isScrubbing() {
  return scrubbing;
}

/** @returns {boolean} True while Replay is playing the frames forward */
export function isReplaying() {
  return replaying;
}

/**
 * Simulated time now: the physics clock, which the Elapsed readout, the
 * stopwatch and every recorded frame share. Kept under its older name for
 * the modules that read it.
 * @returns {number} Simulated time units
 */
export function getSimClock() {
  return getSimulationTime();
}

/** @returns {number} How many frames are currently recorded */
export function getFrameCount() {
  return frameCount;
}

/**
 * Record the present moment as a frame now, rather than at the next 100 ms
 * tick. A step taken while paused records through this.
 */
export function recordFrame() {
  if (scrubbing) return;
  capture();
  syncUI();
}

/** @returns {boolean} True when there is no recorded frame yet */
export function isUnrecorded() {
  return frameCount === 0;
}

/**
 * Jump to a recorded frame and hold there. Leaving live captures the full
 * state once; scrubbing again while parked does not.
 * @param {number} offset - Frames back from newest (0 = most recent)
 */
export function scrubTo(offset) {
  if (frameCount === 0) return;
  leaveLive();
  replaying = false;
  scrubOffset = Math.max(0, Math.min(frameCount - 1, offset));
  restore(scrubOffset);
  syncUI();
}

/**
 * Step one recorded frame backwards. From live the first stop is one frame
 * back, as it has always been; a frame recorded a step ago is the world as it
 * stands, and the one before it is the step before.
 */
export function stepBack() {
  scrubTo(scrubOffset + 1);
}

/**
 * Step one recorded frame forwards. Past the newest recorded frame it is
 * Return to live.
 */
export function stepForward() {
  if (!scrubbing) return;
  if (scrubOffset <= 0) {
    returnToLive();
    return;
  }
  scrubTo(scrubOffset - 1);
}

/**
 * Return to the live moment exactly: the held full capture, the clock and
 * the pause state it was left in. Nothing is dropped, the recording included.
 */
export function returnToLive() {
  if (!scrubbing) return;
  restoreHeld();
  if (held) state.paused = held.paused;
  endHistory();
}

/**
 * Rewind to here: the shown frame becomes the world. Recording continues from
 * it, so the frames that were ahead are discarded: the way an edit after an
 * undo drops the redo stack. The pause state it was left in comes back.
 */
export function rewindToHere() {
  if (!scrubbing) return;
  if (scrubOffset > 0) {
    frameCount = Math.max(1, frameCount - scrubOffset);
    writeIndex = (indexForOffset(scrubOffset) + 1) % capacity;
  }
  if (held) state.paused = held.paused;
  endHistory();
}

/**
 * Play the recorded frames forward at the current speed, from the frame
 * shown (or the oldest, from live), to the live moment, and end there.
 * @returns {boolean} False when there is not enough history to play
 */
export function startReplay() {
  if (frameCount < 2) return false;
  if (!scrubbing) scrubTo(frameCount - 1);
  replaying = true;
  replayClock = getSimulationTime();
  syncUI();
  return true;
}

/** Called each frame while replaying: show the newest frame the clock passed. */
function advanceReplay(dtSim) {
  replayClock += dtSim;
  if (!held || replayClock >= held.clock) {
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
    replaying,
    simClock: getSimulationTime(),
    // Simulated time between the shown frame and the live moment
    behind: held ? Math.max(0, held.clock - getSimulationTime()) : 0,
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
