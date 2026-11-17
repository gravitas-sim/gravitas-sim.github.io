// =============================================================================
// A step's time and its event window
// -----------------------------------------------------------------------------
// What a lesson step adds to the sandbox's clock, fetched only by a step that
// declares one of these (js/investigations.js, syncEventWatch):
//
//   time: { paused, speed }   applied once on entering the step; the lesson's
//                             scope puts the reader's own back when the
//                             lesson closes (the share capture holds speed).
//   pauseAt.auto: true        arms the step's watch for the student on entry
//                             (eventWatch.js says when a lesson may).
//   pauseAt.replay: true      offers Replay on the recorded frames around the
//                             event, and puts the live scene back exactly.
//   pauseAt.rewind: true      also offers "Rewind to here", which makes the
//                             frame shown the scene and drops later history.
//
// Replay and Rewind to here are js/timeline.js's (the sandbox's two named
// actions); this module chooses the frames and says what it cannot do. It
// imports nothing but its sibling: the timeline, the clock, the world and the
// words come from the host, so no start-up module joins this chunk's family.
// =============================================================================

import * as watch from './eventWatch.js';

/** Recorded frames shown before the event: about 3 s of the 100 ms capture. */
export const LEAD_FRAMES = 30;

let host = null;
let step = null;
/** Bumped on every entry, so an entry still awaiting cannot arm for the next. */
let turn = 0;
/** A replay or jump this module started is on screen. */
let ours = false;
/** What the step's watch said on entry: 'armed', 'foreign' or 'refused'. */
let armNote = '';
/** The watch the step opened the tool with, for Arm again. */
let armSpec = null;
let words = null;

/** The step's own strings, for the locale in use, read straight from the file. */
async function strings() {
  const es = host.locale?.() === 'es';
  const m = es
    ? await import('../i18n/es.eventWindow.js')
    : await import('../i18n/en.eventWindow.js');
  words = m.ES_EVENT_WINDOW || m.EN_EVENT_WINDOW;
}

const say = (id, vars = {}) =>
  String(words?.[id] ?? id).replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');

/** Whether the reader asked for less motion (css/tokens.css reads the same). */
function reducedMotion() {
  const mode = document.documentElement.dataset.motion;
  return Boolean(
    mode === 'reduce' ||
    mode === 'step' ||
    globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  );
}

/**
 * Bring the window up to date with the step on screen.
 *
 * @param {?object} next - The step, or null when the lesson closes
 * @param {boolean} entering - True on a step change, false on a re-render
 * @param {object} h - The lesson's host: body(), bodies(), setTime(time),
 *   timeline, t, announce, formatTime, locale
 * @returns {Promise<void>}
 */
export async function syncWindow(next, entering, h) {
  host = h;
  if (entering) await enter(next);
  if (!words && step?.pauseAt) await strings();
  draw();
}

async function enter(next) {
  const mine = ++turn;
  leave();
  step = next;
  armNote = '';
  armSpec = null;
  if (!next) return;
  if (next.time) host.setTime(next.time);
  const spec = next.pauseAt;
  if (!spec) return;
  const bodies = host.bodies();
  const body = watch.resolveByName(bodies, spec.body);
  const primary = watch.resolveByName(bodies, spec.primary);
  // A transit watch reads the photometer's detector and needs no bodies.
  if (spec.kind !== 'transit' && (!body || !primary)) return;
  const arm = (armSpec = {
    kind: spec.kind,
    bodyId: body?.id ?? null,
    primaryId: primary?.id ?? null,
    separation: Number.isFinite(spec.separation) ? spec.separation : null,
    note: spec.note || '',
  });
  await watch.openToolFor(arm, { onFired: () => draw() });
  if (spec.auto && mine === turn) await armStep(mine);
}

/** Arm the step's watch; a reader's own watch is refused, as ever. */
async function armStep(mine) {
  const r = await watch.armForLesson(armSpec);
  if (mine !== turn) return;
  armNote = r.ok
    ? 'armed'
    : r.reason === 'foreignWatch'
      ? 'foreign'
      : 'refused';
  if (!words) await strings();
  host.announce(say(`window.${armNote}`));
}

/** Leave the step: its replay goes back to live, its watch is released. */
function leave() {
  if (ours && host?.timeline.isScrubbing()) host.timeline.returnToLive();
  ours = false;
  watch.release();
}

/**
 * Where the step's event sits in the recording.
 *
 * @returns {{state: string, at?: number, event?: object, extent?: object}}
 *   'none' before it fires, 'gone' when it is older than every recorded frame
 *   (or nothing was recorded), else 'ready' with its frame offset
 */
export function eventFrame() {
  const event = watch.lastLessonEvent();
  if (!event) return { state: 'none' };
  const tl = host.timeline;
  const extent = tl.recordedExtent();
  const at = Number.isFinite(event.clock) ? tl.offsetAt(event.clock) : -1;
  // The newest frame at or before the event must also follow the event's own
  // bracket: a frame older than the oldest kept is a frame that is gone.
  const kept = extent.frames >= 2 && at >= 0 && event.clock >= extent.oldest;
  return kept
    ? { state: 'ready', at, event, extent }
    : { state: 'gone', event, extent };
}

/** Replay the frames around the event, or jump to it under reduced motion. */
export function replay() {
  const found = eventFrame();
  if (found.state !== 'ready') return draw();
  const tl = host.timeline;
  const { at, event } = found;
  ours = true;
  if (reducedMotion()) {
    tl.scrubTo(at);
    host.announce(say('window.jumped'));
    return followHistory();
  }
  tl.scrubTo(Math.min(tl.getFrameCount() - 1, at + LEAD_FRAMES));
  const start = tl.getSimClock();
  tl.startReplay({
    // As long after the event as before it, or to live if that comes first.
    until: event.clock + Math.max(0, event.clock - start),
    mark: event.clock,
    onMark: () => host.announce(say('window.atEvent')),
  });
  followHistory();
}

/** The frame shown becomes the scene; the history after it is dropped. */
export function rewind() {
  const tl = host.timeline;
  if (!step?.pauseAt?.rewind || !tl.isScrubbing()) return;
  tl.rewindToHere();
  ours = false;
  host.announce(host.t('transport.rewind.hint'));
  draw();
}

/** Arm the step's watch again: the student's press, as the panel's Arm is. */
export async function armAgain() {
  if (!armSpec) return;
  const mine = ++turn;
  watch.release();
  await watch.openToolFor(armSpec, { onFired: () => draw() });
  if (mine === turn) await armStep(mine);
  draw();
}

/** Redraw while the recording is on screen, and once more when it is not. */
function followHistory() {
  draw();
  const tick = () => {
    if (!ours) return;
    if (host.timeline.isScrubbing()) globalThis.requestAnimationFrame?.(tick);
    else {
      ours = false;
      draw();
    }
  };
  globalThis.requestAnimationFrame?.(tick);
}

/** The window's markup, in the step's body after whatever the step drew. */
function draw() {
  const root = host?.body?.();
  if (!root) return;
  let box = root.querySelector('[data-event-window]');
  const spec = step?.pauseAt;
  if (!spec || !(spec.replay || spec.rewind || armNote)) {
    box?.remove();
    return;
  }
  if (!box) {
    box = document.createElement('div');
    box.className = 'inv-window';
    box.dataset.eventWindow = '';
    root.append(box);
  }
  box.replaceChildren();
  const line = (text, cls) => {
    const p = document.createElement('p');
    p.className = cls || 'inv-window-note';
    p.textContent = text;
    box.append(p);
    return p;
  };
  const found = eventFrame();
  // "Armed for you" is true until the event fires; a refusal stays said.
  if (armNote && (armNote !== 'armed' || found.state === 'none'))
    line(say(`window.${armNote}`));
  if (!(spec.replay || spec.rewind)) return;
  if (found.state === 'none') {
    line(say('window.wait'));
    return;
  }
  // The event by name, never its value: the time is the panel's to show.
  line(
    say('window.at', { kind: host.t(`pauseEvent.kind.${found.event.kind}`) })
  );
  if (found.state === 'gone') {
    const seconds = Math.round(found.extent.capacity / 10);
    line(
      say('window.limit', {
        frames: found.extent.capacity,
        seconds,
        span: host.formatTime(found.extent.simTime || 0),
      })
    );
    button(say('window.armAgain'), armAgain);
    return;
  }
  const scrubbing = host.timeline.isScrubbing();
  if (spec.replay) button(host.t('transport.replay'), replay);
  if (spec.rewind) {
    const b = button(host.t('transport.rewind'), rewind);
    b.disabled = !scrubbing;
    line(say(scrubbing ? 'window.rewindDrops' : 'window.rewindWhy'));
  }
  if (spec.replay) line(say('window.replayHelp'));

  function button(text, run) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn inv-window-action';
    b.textContent = text;
    b.addEventListener('click', run);
    box.append(b);
    return b;
  }
}

/** Forget everything. Tests only. */
export function resetEventWindowForTests() {
  leave();
  host = null;
  step = null;
  armNote = '';
  armSpec = null;
  words = null;
  turn++;
}
