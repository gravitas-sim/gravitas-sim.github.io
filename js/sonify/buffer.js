// =============================================================================
// What every sound of the application shares: one buffer, one source (Prompt 280)
// -----------------------------------------------------------------------------
// The gravitational-wave audio (js/gwAudio.js) and the plot component's series
// sound (js/plot/access.js) both play a mono buffer through a node of a context
// somebody else owns, and both have to end it the same careful way: a
// BufferSource cannot be restarted, so keeping one is keeping a leak. The two
// functions are that, nothing more. They hold no state, make no context and
// choose no sound; what is played, and whether the reader asked for it, is the
// caller's.
// =============================================================================

/**
 * A source of `samples`, connected to `destination` and not yet started.
 * @param {BaseAudioContext} ctx
 * @param {AudioNode} destination
 * @param {Float32Array} samples
 * @returns {{source: AudioBufferSourceNode, buffer: AudioBuffer}}
 */
export function makeSource(ctx, destination, samples) {
  const buffer = ctx.createBuffer(1, samples.length, ctx.sampleRate);
  buffer.copyToChannel
    ? buffer.copyToChannel(samples, 0)
    : buffer.getChannelData(0).set(samples);
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.connect(destination);
  return { source, buffer };
}

/**
 * Stop a source and disconnect it; safe on one already stopped.
 * @param {?AudioBufferSourceNode} source
 */
export function endSource(source) {
  if (!source) return;
  try {
    source.onended = null;
    source.stop();
  } catch {
    // Already stopped, or never started.
  }
  try {
    source.disconnect();
  } catch {
    // Already disconnected.
  }
}
