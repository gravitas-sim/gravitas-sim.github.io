// A step's time and event window, fetched by a step that declares `time` or
// `pauseAt` (js/investigations.js, syncEventWatch; keys in INTERACTION.md
// section 7). Replay and Rewind to here are js/timeline.js's; this chooses the
// frames and says what it cannot do. Everything but eventWatch.js comes from
// the host, so no start-up module joins this chunk.

import * as watch from './eventWatch.js';

/** Recorded frames shown before the event: about 3 s of the 100 ms capture. */
export const LEAD_FRAMES = 30;

let host = null;
let step = null;
/** Bumped by every entry, so an entry still awaiting cannot arm for the next. */
let turn = 0;
/** A replay or jump this module started is on screen. */
let ours = false;
/** 'armed', 'foreign' or 'refused': what arming said. */
let armNote = '';
let armSpec = null;
let words = null;
/** Whether history was shown when the window was last drawn, and a watcher runs. */
let drawnShown = false;
let watching = false;

async function strings() {
  const m =
    host.locale?.() === 'es'
      ? await import('../i18n/es.eventWindow.js')
      : await import('../i18n/en.eventWindow.js');
  words = m.ES_EVENTWINDOW || m.EN_EVENTWINDOW;
}

const say = (id, vars = {}) =>
  String(words?.[id] ?? id).replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');

/** As css/tokens.css reads it: the Motion setting, then the device. */
const reducedMotion = () =>
  /^(reduce|step)$/.test(document.documentElement.dataset.motion) ||
  Boolean(globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches);

/**
 * Bring the window up to date with the step on screen.
 *
 * @param {?object} next - The step, or null when the lesson closes
 * @param {boolean} entering - True on a step change, false on a re-render
 * @param {object} h - body(), bodies(), setTime(time), timeline, t, announce,
 *   formatTime, locale
 * @returns {Promise<void>}
 */
export async function syncWindow(next, entering, h) {
  host = h;
  // A staged step's bodies can land after its first render: try again.
  if (entering) await enter(next);
  else if (step?.pauseAt && !armSpec) await open(turn);
  const spec = step?.pauseAt;
  if (!words && (spec?.auto || spec?.replay || spec?.rewind)) await strings();
  draw();
}

async function enter(next) {
  const mine = ++turn;
  leave();
  step = next;
  armNote = '';
  armSpec = null;
  if (next?.time) host.setTime(next.time);
  await open(mine);
}

async function open(mine) {
  const spec = step?.pauseAt;
  if (!spec) return;
  const bodies = host.bodies();
  const body = watch.resolveByName(bodies, spec.body);
  const primary = watch.resolveByName(bodies, spec.primary);
  // A transit watch reads the photometer and needs no bodies.
  if (spec.kind !== 'transit' && (!body || !primary)) return;
  armSpec = {
    kind: spec.kind,
    bodyId: body?.id ?? null,
    primaryId: primary?.id ?? null,
    separation: Number.isFinite(spec.separation) ? spec.separation : null,
    note: spec.note || '',
  };
  await watch.openToolFor(armSpec, {
    onFired: draw,
    quiet: Boolean(step?.pauseAt?.quiet),
  });
  if (spec.auto && mine === turn) await armStep(mine);
}

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

function leave() {
  if (ours && host?.timeline.isScrubbing()) host.timeline.returnToLive();
  ours = false;
  watch.release();
}

/**
 * Where the step's event sits in the recording.
 *
 * @returns {{state: string, at?: number, event?: object, extent?: object}}
 *   'none' before it fires, 'gone' when no recorded frame is at or before it,
 *   else 'ready' with its offset in frames back from the newest
 */
export function eventFrame() {
  const event = watch.lastLessonEvent();
  if (!event) return { state: 'none' };
  const extent = host.timeline.recordedExtent();
  const at = host.timeline.offsetAt(event.clock);
  return extent.frames > 1 && at >= 0
    ? { state: 'ready', at, event, extent }
    : { state: 'gone', event, extent };
}

/** Replay the frames around the event; under reduced motion, show its frame. */
export function replay() {
  const found = eventFrame();
  if (found.state !== 'ready') return draw();
  const tl = host.timeline;
  const { at, event } = found;
  ours = true;
  if (reducedMotion()) {
    tl.scrubTo(at);
    host.announce(say('window.jumped'));
  } else {
    tl.scrubTo(Math.min(tl.getFrameCount() - 1, at + LEAD_FRAMES));
    // As long after the event as before it, or to live if that is sooner.
    tl.startReplay({
      until: 2 * event.clock - Math.min(event.clock, tl.getSimClock()),
      mark: event.clock,
      onMark: () => host.announce(say('window.atEvent')),
    });
  }
  draw();
}

/** The frame shown becomes the scene; later history is dropped. */
export function rewind() {
  if (!step?.pauseAt?.rewind || !host.timeline.isScrubbing()) return;
  host.timeline.rewindToHere();
  ours = false;
  host.announce(host.t('transport.rewind.hint'));
  draw();
}

/** Arm the step's watch again: the student's press, as the panel's Arm is. */
export async function armAgain() {
  if (!armSpec) return;
  const mine = ++turn;
  watch.release();
  await watch.openToolFor(armSpec, {
    onFired: draw,
    quiet: Boolean(step?.pauseAt?.quiet),
  });
  if (mine === turn) await armStep(mine);
  draw();
}

/** Redraw when history starts or stops being shown, while it matters. */
function follow() {
  if (watching || !globalThis.requestAnimationFrame) return;
  watching = true;
  const tick = () => {
    if (!(ours || step?.pauseAt?.rewind)) return (watching = false);
    if (host.timeline.isScrubbing() !== drawnShown) {
      if (drawnShown) ours = false;
      draw();
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

/** The window, appended to the step's body. */
function draw() {
  const root = host?.body?.();
  if (!root) return;
  let box = root.querySelector('[data-event-window]');
  const spec = step?.pauseAt;
  const offers = spec?.replay || spec?.rewind;
  if (!offers && !armNote) return box?.remove();
  if (!box) {
    box = document.createElement('div');
    box.className = 'inv-window';
    box.dataset.eventWindow = '';
    box.style.cssText =
      'display:flex;flex-wrap:wrap;gap:.5rem;align-items:center';
    root.append(box);
  }
  box.replaceChildren();
  const add = (tag, text) => {
    const el = document.createElement(tag);
    el.textContent = text;
    if (tag === 'p') el.style.cssText = 'flex-basis:100%;margin:0';
    box.append(el);
    return el;
  };
  const button = (text, run) => {
    const b = add('button', text);
    b.type = 'button';
    b.className = 'btn';
    b.addEventListener('click', run);
    return b;
  };
  drawnShown = host.timeline.isScrubbing();
  if (ours || spec.rewind) follow();
  const found = eventFrame();
  // "Armed for you" holds until the event fires; a refusal stays said.
  if (armNote && (armNote !== 'armed' || found.state === 'none'))
    add('p', say(`window.${armNote}`));
  if (!offers) return;
  if (found.state === 'none') return add('p', say('window.wait'));
  // The event by name, never its time.
  add(
    'p',
    say('window.at', { kind: host.t(`pauseEvent.kind.${found.event.kind}`) })
  );
  const { capacity, simTime } = found.extent;
  if (found.state === 'gone') {
    add(
      'p',
      say('window.limit', {
        frames: capacity,
        seconds: Math.round(capacity / 10),
        span: host.formatTime(simTime || 0),
      })
    );
    return button(say('window.armAgain'), armAgain);
  }
  const shown = drawnShown;
  if (spec.replay) button(host.t('transport.replay'), replay);
  if (spec.rewind) {
    button(host.t('transport.rewind'), rewind).disabled = !shown;
    add('p', say(shown ? 'window.rewindDrops' : 'window.rewindWhy'));
  }
  if (spec.replay) add('p', say('window.replayHelp'));
}

/** Forget everything. Tests only. */
export function resetEventWindowForTests() {
  leave();
  host = step = armSpec = words = null;
  armNote = '';
  turn++;
}
