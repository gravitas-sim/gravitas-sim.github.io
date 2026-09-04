// =============================================================================
// Runtime capability detection for the browser suite
// -----------------------------------------------------------------------------
// Some of what Gravitas offers depends on what the engine can actually do, and
// the application already branches on that: js/capture.js exposes canRecord(),
// and the rail hides the Record Clip button when it is false. That is correct
// behaviour, not a bug, and a test suite that asserted the button was always
// there was asserting something the application deliberately does not promise.
//
// So the tests ask the application the same question the application asks
// itself. Nothing here reimplements the check - it imports js/capture.js and
// calls canRecord() - and the sub-capabilities are collected only so that a
// skip message can say *which* piece is missing rather than "unsupported".
//
// Why this matters for WebKit
// -----------------------------------------------------------------------------
// Playwright's WebKit build does not ship a usable combination of
// MediaRecorder, HTMLCanvasElement.captureStream and an accepted video MIME
// type. Chromium and Firefox do. Rather than naming WebKit anywhere - which
// would silently keep skipping the day WebKit gains support - the two tests
// that genuinely encode and download a clip skip on the capability, and will
// start running by themselves when the capability appears.
// =============================================================================

/* global HTMLCanvasElement */

/**
 * What this browser can actually do about video, according to the application.
 *
 * @param {import('@playwright/test').Page} page - A booted page
 * @returns {Promise<{canRecord: boolean, mediaRecorder: boolean,
 *   captureStream: boolean, mimeType: string, missing: string[]}>} The verdict
 */
export async function captureCapability(page) {
  return page.evaluate(async () => {
    const capture = await import('/js/capture.js');
    const mediaRecorder = typeof window.MediaRecorder === 'function';
    const captureStream =
      typeof HTMLCanvasElement !== 'undefined' &&
      typeof HTMLCanvasElement.prototype.captureStream === 'function';
    // pickMimeType() is the application's own list, in its own order, so a
    // diagnostic quotes the type the app would have chosen rather than a
    // guess.
    let mimeType = '';
    try {
      mimeType = capture.pickMimeType ? capture.pickMimeType() : '';
    } catch {
      mimeType = '';
    }

    const missing = [];
    if (!mediaRecorder) missing.push('MediaRecorder');
    if (!captureStream) missing.push('HTMLCanvasElement.captureStream');
    if (!mimeType) missing.push('a supported video MIME type');

    return {
      canRecord: capture.canRecord(),
      mediaRecorder,
      captureStream,
      mimeType,
      missing,
    };
  });
}

/**
 * A sentence naming what is missing, for a skip reason.
 *
 * @param {object} cap - As returned by captureCapability
 * @returns {string} Why video encoding cannot be tested here
 */
export function whyNoRecording(cap) {
  if (cap.canRecord) return '';
  const missing = cap.missing.length ? cap.missing.join(', ') : 'unknown';
  return (
    `This browser cannot encode video: ${missing} unavailable. ` +
    'Gravitas hides the Record Clip button when capture.canRecord() is false, ' +
    'which is the behaviour e2e/capture.spec.js asserts instead. This test ' +
    'will run automatically once the engine supports recording.'
  );
}
