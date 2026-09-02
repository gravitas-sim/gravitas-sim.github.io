// =============================================================================
// Video capture
// -----------------------------------------------------------------------------
// A WebM recording of a stretch of the run, taken off the canvas itself with
// MediaRecorder.
//
// A screenshot documents a moment; most of what this simulation is for is
// motion - a resonance locking, a tidal stream peeling off, a rotation curve
// flattening - and none of that survives a still. A short clip drops into a
// slide with no plug-in and no conversion step, which a screen recording of
// somebody's whole desktop does not.
//
// Three things shape the implementation:
//
//   It records a *composite*. The simulation canvas is transparent and the
//   starfield sits behind it in a second canvas, so a stream taken off the
//   simulation canvas alone would be objects on black with no stars, and any
//   frame with alpha in it would encode unpredictably. So each frame is
//   flattened onto an offscreen canvas - background, starfield, simulation -
//   and that canvas is what is streamed.
//
//   It is bounded. MediaRecorder hands back Blob chunks that have to be held
//   until the file is assembled, so an unattended recording is an unbounded
//   array in memory. Both a byte budget and a wall-clock limit are enforced,
//   whichever comes first, and hitting one stops the recording cleanly with a
//   usable file rather than dropping frames or failing. A one-second timeslice
//   means the total is checked once a second rather than once at the end.
//
//   It records what a screenshot would show. Capture mode is on for the whole
//   clip, so the scenario title, the scale bar and the simulated clock are
//   burned into every frame: a clip that has been pasted into a deck is as
//   far from its provenance as an image is.
// =============================================================================

/** Frames a second. 30 is smooth enough for orbital motion and half the bytes
 *  of 60; the physics step is decoupled from this either way. */
const FPS = 30;

/** Bits a second handed to the encoder. About 0.6 MB of video per second. */
const BITRATE = 5_000_000;

/** The byte budget. Reached, the recording stops itself and saves what it has.
 *  At the bitrate above this is a little over two minutes. */
const MAX_BYTES = 80 * 1024 * 1024;

/** The wall-clock budget, whichever comes first. */
const MAX_SECONDS = 180;

/** The longest side of the recorded frame. A 2x display gives a canvas three
 *  thousand pixels across, which is four times the bytes for a clip nobody
 *  will project larger than 1080p. */
const MAX_DIMENSION = 1600;

/** How often the encoder is asked to hand over what it has, in ms. */
const TIMESLICE = 1000;

const state = {
  recorder: null,
  chunks: [],
  bytes: 0,
  startedAt: 0,
  raf: 0,
  tick: 0,
  composite: null,
  cctx: null,
  sources: [],
  onTick: null,
  onStop: null,
  stopping: false,
  reason: 'user',
};

/** @returns {boolean} Whether this browser can record the canvas at all */
export function canRecord() {
  return (
    typeof window !== 'undefined' &&
    typeof window.MediaRecorder === 'function' &&
    typeof HTMLCanvasElement !== 'undefined' &&
    typeof HTMLCanvasElement.prototype.captureStream === 'function' &&
    Boolean(pickMimeType())
  );
}

/**
 * The best container the browser will actually give us, in the order the
 * clip's destinations - a slide and a lab report - will accept.
 *
 * H.264 in MP4 first, where the browser can encode it. This is not a
 * preference about quality; it is the only choice that plays where these clips
 * are going. PowerPoint and Keynote will not open a WebM at all, and a PDF
 * reader that plays embedded video plays H.264 and nothing else, so a WebM in
 * a lab report is an attachment its reader cannot see. Chromium-based browsers
 * have recorded H.264 for a while now; where one does, taking it saves the
 * user a conversion step they would otherwise have to find out about the hard
 * way, in front of a class.
 *
 * WebM after it, VP9 before VP8: for this kind of picture - large flat black
 * areas and a few bright moving objects - VP9 is markedly smaller at the same
 * quality. Firefox lands here, and a Firefox WebM plays in every browser, in
 * Google Slides and in VLC; it is desktop presentation software and PDF that
 * cannot take it.
 *
 * @returns {string} A MIME type, or '' when nothing is supported
 */
export function pickMimeType() {
  if (
    typeof window === 'undefined' ||
    typeof window.MediaRecorder !== 'function'
  )
    return '';
  const candidates = [
    'video/mp4;codecs=avc1.42E01E',
    'video/mp4;codecs=avc1',
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
    'video/mp4',
  ];
  for (const type of candidates) {
    if (window.MediaRecorder.isTypeSupported?.(type)) return type;
  }
  return '';
}

/** @returns {boolean} True while a recording is in flight */
export const isRecording = () => state.recorder !== null;

/**
 * What the recording is up to, for the badge and the button.
 * @returns {{recording: boolean, seconds: number, bytes: number,
 *   maxSeconds: number, maxBytes: number}} Live counters
 */
export function recordingStatus() {
  return {
    recording: isRecording(),
    seconds: state.startedAt ? (performance.now() - state.startedAt) / 1000 : 0,
    bytes: state.bytes,
    maxSeconds: MAX_SECONDS,
    maxBytes: MAX_BYTES,
  };
}

/**
 * The size of the recorded frame: the canvas, scaled down to fit MAX_DIMENSION
 * and rounded to even numbers, which every encoder here is happier with.
 *
 * @param {number} w - Canvas width in pixels
 * @param {number} h - Canvas height in pixels
 * @returns {{width: number, height: number, scale: number}} Frame geometry
 */
export function frameSize(w, h) {
  const longest = Math.max(w, h) || 1;
  const scale = longest > MAX_DIMENSION ? MAX_DIMENSION / longest : 1;
  const even = n => Math.max(2, Math.round((n * scale) / 2) * 2);
  return { width: even(w), height: even(h), scale };
}

/**
 * Start recording.
 *
 * @param {object} opts - Options
 * @param {Array<HTMLCanvasElement>} opts.sources - Canvases to flatten, back
 *   to front: the starfield first, the simulation over it
 * @param {Function} [opts.onTick] - Called about once a second with
 *   recordingStatus(), for the badge
 * @param {Function} [opts.onStop] - Called with (blob, {reason, seconds,
 *   bytes, type}) when the recording ends, for whatever saves it
 * @returns {boolean} False when the browser cannot record or one is running
 */
export function startRecording({ sources, onTick, onStop } = {}) {
  if (isRecording() || !canRecord()) return false;
  const live = (sources || []).filter(c => c && c.width > 0 && c.height > 0);
  if (!live.length) return false;

  const base = live[live.length - 1];
  const { width, height } = frameSize(base.width, base.height);

  const composite = document.createElement('canvas');
  composite.width = width;
  composite.height = height;
  const cctx = composite.getContext('2d');
  if (!cctx) return false;

  const mimeType = pickMimeType();
  let recorder;
  try {
    const stream = composite.captureStream(FPS);
    recorder = new window.MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: BITRATE,
    });
  } catch {
    return false;
  }

  state.recorder = recorder;
  state.chunks = [];
  state.bytes = 0;
  state.startedAt = performance.now();
  state.composite = composite;
  state.cctx = cctx;
  state.sources = live;
  state.onTick = onTick || null;
  state.onStop = onStop || null;
  state.stopping = false;
  state.reason = 'user';

  recorder.ondataavailable = event => {
    const chunk = event.data;
    if (!chunk || !chunk.size) return;
    state.chunks.push(chunk);
    state.bytes += chunk.size;
    // The budget is checked here rather than on a timer because here is where
    // the bytes actually arrive, and stopping one timeslice late is one
    // second of overshoot rather than an open-ended one.
    if (state.bytes >= MAX_BYTES) stopRecording('size');
  };
  recorder.onerror = () => stopRecording('error');
  recorder.onstop = finish;

  try {
    recorder.start(TIMESLICE);
  } catch {
    state.recorder = null;
    return false;
  }

  drawFrame();
  state.tick = setInterval(() => {
    const status = recordingStatus();
    if (status.seconds >= MAX_SECONDS) {
      stopRecording('duration');
      return;
    }
    state.onTick?.(status);
  }, 250);
  state.onTick?.(recordingStatus());
  return true;
}

/**
 * Flatten one frame onto the composite, then ask for the next.
 *
 * The loop is its own rAF rather than a hook in the render loop so that a
 * paused simulation - which stops repainting - still records, and so that
 * nothing here can cost a dropped frame in the simulation itself.
 *
 * The composite keeps the size it was created at for the whole take, because
 * an encoder cannot change frame size mid-stream. A window resized while
 * recording is therefore scaled into the original frame rather than changing
 * it, which is a stretched picture for the rest of that clip and a whole clip
 * that still plays.
 */
function drawFrame() {
  if (!state.recorder) return;
  const ctx = state.cctx;
  const { width, height } = state.composite;
  // Opaque black under everything: the simulation canvas is transparent, and
  // a stream with alpha in it is a stream where the encoder guesses.
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, width, height);
  for (const src of state.sources) {
    if (!src.width || !src.height) continue;
    try {
      ctx.drawImage(src, 0, 0, src.width, src.height, 0, 0, width, height);
    } catch {
      /* a canvas mid-resize is one frame, not a reason to end the take */
    }
  }
  state.raf = requestAnimationFrame(drawFrame);
}

/**
 * Stop recording. The file is assembled and handed to onStop asynchronously,
 * once the encoder has flushed.
 *
 * @param {string} [reason] - 'user', 'size', 'duration' or 'error'
 * @returns {boolean} False when nothing was running
 */
export function stopRecording(reason = 'user') {
  if (!state.recorder || state.stopping) return false;
  state.stopping = true;
  state.reason = reason;
  if (state.raf) cancelAnimationFrame(state.raf);
  state.raf = 0;
  if (state.tick) clearInterval(state.tick);
  state.tick = 0;
  try {
    state.recorder.stop();
  } catch {
    finish();
  }
  return true;
}

/** Assemble the file, hand it over, and drop every reference to the chunks. */
function finish() {
  const recorder = state.recorder;
  if (!recorder) return;
  const type = recorder.mimeType || pickMimeType() || 'video/webm';
  const chunks = state.chunks;
  const meta = {
    reason: state.reason,
    seconds: state.startedAt ? (performance.now() - state.startedAt) / 1000 : 0,
    bytes: state.bytes,
    type,
  };
  // Released before the callback runs: the Blob below is the only thing that
  // should still be holding this many megabytes by the time anyone saves it.
  state.chunks = [];
  state.recorder = null;
  state.composite = null;
  state.cctx = null;
  state.sources = [];
  state.startedAt = 0;
  state.stopping = false;
  const blob = chunks.length ? new Blob(chunks, { type }) : null;
  chunks.length = 0;
  state.bytes = 0;
  const done = state.onStop;
  state.onTick = null;
  state.onStop = null;
  done?.(blob, meta);
}

/**
 * The extension a file of this type should carry.
 * @param {string} type - A MediaRecorder MIME type
 * @returns {string} 'webm' or 'mp4'
 */
export const extensionFor = type => (/mp4/.test(type || '') ? 'mp4' : 'webm');
