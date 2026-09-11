// =============================================================================
// The runtime capabilities a widget may use, injected rather than imported
// -----------------------------------------------------------------------------
// A seam, and it exists because of a real break rather than for tidiness.
//
// The widget families are content: a title, some sliders, a draw function and a
// readout. The authoring CLI reads them as metadata - what controls a step may
// hide, which actions exist, whether a preset names a control that is there -
// and does that in an ordinary Node process with no DOM. But a widget that
// offers "Save to notebook" used to import js/notebookBridge.js for it, and
// that module statically imports js/physics.js, which reaches for
// `document.getElementById` while it is still evaluating. So `npm run
// author:check` died on `ReferenceError: document is not defined` before it
// had read a single lesson.
//
// The same break existed twice. The gravitational-wave lab's Listen button
// imported js/gwAudio.js, which imports js/audio.js, which imports
// js/physics.js - a second route to the same wall. Both are runtime services
// and both are injected here now.
//
// The static import in notebookBridge is not the mistake and is not removed.
// It is load-bearing: a capture claims to describe the instant of the click,
// so the provenance has to be read in the click's own task, with no await
// between the press and the snapshot. A dynamic import cannot promise that -
// even a warm module cache resolves on a later microtask, and by then a
// running simulation has moved. That argument is written out at the top of
// js/notebookBridge.js and it still holds.
//
// What was wrong is the direction. A widget definition should not reach into
// the browser runtime; the runtime should hand it what it needs. So this
// module is a leaf with no imports at all: the widgets call `captureToNotebook`
// here, and js/notebookBridge.js installs the real one as soon as it loads.
// js/main.js imports that bridge during start-up, so in a browser the sink is
// in place long before any widget exists.
//
// The synchronous guarantee survives intact. `captureToNotebook` below calls
// the installed function directly - one ordinary call, no await, no promise
// between the click and `liveProvenance()`.
// =============================================================================

// --- The notebook -----------------------------------------------------------

/** The real implementation, installed by js/notebookBridge.js. @type {?Function} */
let sink = null;

/** Whether the missing-sink warning has already been given. */
let warned = false;

/**
 * Install the notebook's capture function.
 *
 * Called by js/notebookBridge.js at import time. Nothing else should call it
 * except a test that wants to observe what a widget tried to capture.
 *
 * @param {?Function} fn - The implementation, or null to remove it
 */
export function setCaptureSink(fn) {
  sink = typeof fn === 'function' ? fn : null;
}

/** @returns {boolean} Whether a capture would reach anything */
export const captureAvailable = () => sink !== null;

/**
 * Send a reading to the notebook.
 *
 * Synchronous up to the point where the installed implementation says
 * otherwise: this adds one function call and no await, which is what keeps a
 * capture's provenance the provenance of the click.
 *
 * @param {Function} make - Given (capture, provenance), returns an entry
 * @returns {Promise<boolean>} Whether anything received it
 */
export function captureToNotebook(make) {
  if (!sink) {
    // Not swallowed: nothing in a browser can reach this, because start-up
    // imports the bridge, so arriving here means the seam is broken and the
    // reader would otherwise press a button and see nothing happen.
    if (!warned) {
      warned = true;
      console.warn(
        'A notebook capture was requested before js/notebookBridge.js had ' +
          'installed its sink. The reading was not saved.'
      );
    }
    return Promise.resolve(false);
  }
  return sink(make);
}

// --- Signal audio -----------------------------------------------------------

/**
 * What the gravitational-wave lab needs of the audio engine.
 *
 * Installed by js/gwAudio.js when it loads. Until then every call is a no-op
 * that reports having done nothing, which is the correct answer in a process
 * with no audio device: the authoring CLI reads the widget's actions and never
 * presses one.
 *
 * @type {?object}
 */
let audio = null;

/**
 * Install the signal-audio implementation.
 *
 * @param {?object} impl - play, stop, isPlaying and currentMapping
 */
export function setSignalAudio(impl) {
  audio = impl && typeof impl.play === 'function' ? impl : null;
}

/** @returns {boolean} Whether signal audio is wired up at all */
export const signalAudioAvailable = () => audio !== null;

/**
 * Start the signal.
 *
 * Returns the engine's own result, or a refusal in the same shape when there
 * is no engine - `null` would be a different contract from the one every
 * caller already handles, and the caller would have to learn that the seam
 * exists in order to check for it.
 *
 * @param {object} timeline - The waveform to play
 * @param {object} [opts] - Passed through to the engine
 * @returns {{ok: boolean, reason?: string}} What happened
 */
export const playSignal = (timeline, opts) =>
  audio ? audio.play(timeline, opts) : { ok: false, reason: 'unsupported' };

/** Stop it. */
export const stopSignal = () => {
  if (audio && typeof audio.stop === 'function') audio.stop();
};

/** @returns {boolean} Whether something is sounding */
export const signalIsPlaying = () =>
  audio && typeof audio.isPlaying === 'function' ? audio.isPlaying() : false;

/** @returns {?object} How the last playback mapped the signal to a sound */
export const signalMapping = () =>
  audio && typeof audio.currentMapping === 'function'
    ? audio.currentMapping()
    : null;

// Each forwarder checks for the method rather than assuming a complete
// implementation: a test may install a stub with only the parts it cares
// about, and a seam that threw on the others would be forcing every caller to
// know what the seam is for.

/** @returns {?string} What the current playback belongs to */
export const signalOwner = () =>
  audio && typeof audio.currentOwner === 'function'
    ? audio.currentOwner()
    : null;

/**
 * Stop the signal, but only if it belongs to this owner.
 *
 * @param {string} owner - The token the playback was started with
 * @returns {boolean} Whether anything stopped
 */
export const stopSignalIfOwner = owner =>
  audio && typeof audio.stopIfOwner === 'function'
    ? audio.stopIfOwner(owner)
    : false;

/**
 * Stop anything whose owner begins with this prefix.
 *
 * @param {string} prefix - An owner prefix
 * @returns {boolean} Whether anything stopped
 */
export const stopSignalScope = prefix =>
  audio && typeof audio.stopIfOwnerStartsWith === 'function'
    ? audio.stopIfOwnerStartsWith(prefix)
    : false;

// -----------------------------------------------------------------------------
// Selecting a body
// -----------------------------------------------------------------------------
//
// Selecting and inspecting are one act in js/ui.js: showObjectInspector sets
// state.selectedObject and opens the card together. js/lessonScene.js needs to
// perform it - a lesson's object list, a plot marker and a click on the canvas
// all have to take the same path or they will disagree about what is selected
// - and it cannot import js/ui.js, which sits above it.
//
// The port could have gone the other way, with js/ui.js importing the lesson
// scene and handing its function over. It measured 6 KB: js/ui.js is in the
// initial download, so that import would have pulled the lesson bindings, the
// roster and the scope into every first page load, for readers who never open
// a lesson. This file is already there and imports nothing, so the port costs
// two functions instead.

let selectBodyImpl = null;

/**
 * Install the application's own "select this body" action. js/ui.js only.
 *
 * @param {?Function} fn - (body, type) => void
 * @returns {void}
 */
export function setBodySelector(fn) {
  selectBodyImpl = typeof fn === 'function' ? fn : null;
}

/** Whether anything can select a body yet. @returns {boolean} */
export const bodySelectorReady = () => selectBodyImpl !== null;

/**
 * Select a body the way a click on the canvas would.
 *
 * @param {object} body - The body
 * @param {string} type - Its kind, in the vocabulary the interface uses
 * @returns {boolean} True if a selector was installed to do it
 */
export function selectBodyInScene(body, type) {
  if (!selectBodyImpl || !body) return false;
  selectBodyImpl(body, type);
  return true;
}
